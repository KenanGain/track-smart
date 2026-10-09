// ─────────────────────────────────────────────────────────────────────────────
// MaintenanceAssetsTable — the fleet, read from maintenance's side.
//
// Every other tab on this page is organised around the RULE: here are the intervals,
// here is the work they have raised, here is who does it. None of them answers the
// question a yard asks first — "what does this truck need?" — because one truck's
// standing is spread across as many rules as it is enrolled on, and you had to open
// each rule to collect it.
//
// One row per asset, with its worst standing, what falls due next across all of its
// rules, and the rules themselves one click down.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    Truck, Car, Search, Clock, Share2, Briefcase,
    CalendarClock, AlertTriangle, ListChecks,
} from 'lucide-react';
import { TH, TD, COL_RULE, RowIcon, EmptyRow } from '@/components/ui/CatalogTable';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { ShareToChat } from '@/components/share/ShareToChat';
import { KpiTile } from '@/pages/inventory/InventoryKpi';
import { TablePager } from '@/pages/inventory/TablePager';
import { FilterChip, ResetFilters, TableGroupBand } from '@/components/ui/ListChrome';
import type { AssetEnrollment, AssetState, ClockDue, PmTierId } from './service-intervals';
import { cn } from '@/lib/utils';

/** One rule an asset is on, and where that asset stands on it. */
export interface AssetIntervalLine {
    intervalId: string;
    name: string;
    /** How heavy the rule is — a PM_TIERS id, where it has been classified. */
    tier?: PmTierId;
    /** "every 25,000 mi · 500 h · 180 days" — what the rule runs on. */
    everyText: string;
    /** The services it covers. */
    services: string[];
    /** Their ids, for raising the work when no task exists yet. */
    serviceTypeIds?: string[];
    state: AssetState;
    /** Where it falls due, from the rule's clocks or failing that from its task. */
    due?: { at: string; left?: string; over: boolean; label: string };
    /** Every clock the rule runs, projected from this asset’s own last service. */
    clocks: ClockDue[];
    /**
     * Which clocks the rule runs at all — so a column can tell "this rule does not go by
     * hours" from "nobody has said what its hours read", which are different problems.
     */
    runs: { mileage?: string; hours?: string; days?: string };
    /** Whether this rule is counting this asset at all. */
    tracking: boolean;
    /** What was last entered for this asset on this rule, for the form that edits it. */
    enrolled?: AssetEnrollment;
    /**
     * Set when the figures come from the asset’s own annual safety certificate rather than
     * from anything typed into the interval — the date on the certificate is the date an
     * inspector asks about, so it is the date this counts to.
     */
    fromAnnualRecord?: boolean;
    /** What it was last done at, where that came from the asset’s own record. */
    lastService?: { date?: string; odometer?: number; odometerUnit?: string };
    taskId?: string;
}

/** One asset, with everything maintenance knows about it. */
export interface MaintenanceAssetRow {
    id: string;
    label: string;
    kind?: 'truck' | 'trailer';
    description?: string;
    driver?: string;
    meter: { odometer: number; engineHours: number };
    lines: AssetIntervalLine[];
    counts: Record<AssetState, number>;
    /** The worst of its standings — what the row is sorted and filtered on. */
    state: AssetState | 'none';
    /** What falls due first across every rule it is on. */
    next?: AssetIntervalLine;
    openOrders: number;
    outstandingTaskIds: string[];
}

const FILTERS: { id: AssetState | 'all' | 'none'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'due', label: 'Due' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'untracked', label: 'Not tracking' },
    { id: 'none', label: 'On no interval' },
];

type GroupBy = 'none' | 'status' | 'driver' | 'kind';

const GROUPS: { id: GroupBy; label: string }[] = [
    { id: 'none', label: 'Group by' },
    { id: 'status', label: 'Group by status' },
    { id: 'driver', label: 'Group by driver' },
    { id: 'kind', label: 'Group by truck / trailer' },
];

const STATE_BAND: Record<AssetState | 'none', { rank: number; label: string }> = {
    overdue: { rank: 0, label: 'Overdue' },
    due: { rank: 1, label: 'Due' },
    upcoming: { rank: 2, label: 'Upcoming' },
    untracked: { rank: 3, label: 'Not tracking' },
    none: { rank: 4, label: 'On no interval' },
};

const STATE_PILL: Record<AssetState | 'none', string> = {
    overdue: 'border-red-200 bg-red-50 text-red-700',
    due: 'border-amber-200 bg-amber-50 text-amber-700',
    upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
    untracked: 'border-slate-200 bg-slate-100 text-slate-500',
    none: 'border-slate-200 bg-slate-50 text-slate-400',
};

function StatePill({ state }: { state: AssetState | 'none' }) {
    return (
        <span className={cn(
            'inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            STATE_PILL[state],
        )}>
            {STATE_BAND[state].label}
        </span>
    );
}

export function MaintenanceAssetsTable({ rows, onOpenAsset, onCreateOrder, className }: {
    rows: MaintenanceAssetRow[];
    /** Open the asset’s own page, where its intervals are switched on and off. */
    onOpenAsset: (assetId: string) => void;
    onCreateOrder: (taskIds: string[]) => void;
    className?: string;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<AssetState | 'all' | 'none'>('all');
    const [groupBy, setGroupBy] = useState<GroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [sharing, setSharing] = useState<MaintenanceAssetRow | null>(null);

    const counts = useMemo(() => {
        const out: Record<string, number> = { all: rows.length };
        for (const r of rows) out[r.state] = (out[r.state] ?? 0) + 1;
        return out;
    }, [rows]);

    const kpis = useMemo(() => ({
        assets: rows.length,
        onRules: rows.filter((r) => r.lines.length > 0).length,
        overdue: rows.filter((r) => r.state === 'overdue').length,
        due: rows.filter((r) => r.state === 'due').length,
    }), [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (filter !== 'all' && r.state !== filter) return false;
            if (!q) return true;
            return r.label.toLowerCase().includes(q)
                || (r.description ?? '').toLowerCase().includes(q)
                || (r.driver ?? '').toLowerCase().includes(q)
                || r.lines.some((l) => l.name.toLowerCase().includes(q));
        });
    }, [rows, search, filter]);

    const bandOf = (r: MaintenanceAssetRow): { rank: number; label: string } => {
        if (groupBy === 'status') return STATE_BAND[r.state];
        if (groupBy === 'driver') {
            return r.driver ? { rank: 0, label: r.driver } : { rank: 1, label: 'No driver assigned' };
        }
        return r.kind === 'truck' ? { rank: 0, label: 'Trucks' } : { rank: 1, label: 'Trailers' };
    };

    const banded = useMemo(() => {
        if (groupBy === 'none') return filtered;
        return [...filtered].sort((a, b) => {
            const ba = bandOf(a), bb = bandOf(b);
            return ba.rank - bb.rank || ba.label.localeCompare(bb.label);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, groupBy]);

    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === 'none') return m;
        for (const r of banded) {
            const label = bandOf(r).label;
            m.set(label, (m.get(label) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [banded, groupBy]);

    useEffect(() => { setPage(0); }, [search, filter, groupBy]);

    const paged = banded.slice(page * perPage, page * perPage + perPage);

    return (
        <div className={cn('space-y-4', className)}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiTile label="Assets" value={kpis.assets} Icon={Truck} accent="blue"
                    onClick={() => setFilter('all')} active={filter === 'all'} />
                <KpiTile label="On an interval" value={kpis.onRules} Icon={CalendarClock} accent="violet" />
                <KpiTile label="Overdue" value={kpis.overdue} Icon={AlertTriangle} accent="red"
                    onClick={() => setFilter(filter === 'overdue' ? 'all' : 'overdue')} active={filter === 'overdue'} />
                <KpiTile label="Due" value={kpis.due} Icon={Clock} accent="amber"
                    onClick={() => setFilter(filter === 'due' ? 'all' : 'due')} active={filter === 'due'} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900">Fleet maintenance</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            What each asset needs, across every interval it is on.
                        </p>
                    </div>
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search unit, driver or interval"
                            className="h-9 w-52 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-72"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/40 px-5 py-2">
                    {FILTERS.map((f) => (
                        <FilterChip
                            key={f.id}
                            label={f.label}
                            count={counts[f.id] ?? 0}
                            on={filter === f.id}
                            always={f.id === 'all'}
                            onClick={() => setFilter(f.id)}
                        />
                    ))}
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                        title="Band the list"
                        className={cn(
                            'ml-auto h-8 shrink-0 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500',
                            groupBy === 'none'
                                ? 'border-slate-200 bg-white text-slate-600'
                                : 'border-blue-300 bg-blue-50/60 text-blue-700',
                        )}
                    >
                        {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                    <ResetFilters
                        on={filter !== 'all' || groupBy !== 'none' || search.trim() !== ''}
                        onReset={() => { setFilter('all'); setGroupBy('none'); setSearch(''); }}
                    />
                </div>

                <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1080px]">
                            <thead>
                                <tr>
                                    <TH>Asset</TH>
                                    <TH className={COL_RULE}>Driver</TH>
                                    <TH className={COL_RULE}>Odometer</TH>
                                    <TH className={COL_RULE}>Engine Hours</TH>
                                    <TH className={COL_RULE}>Intervals</TH>
                                    <TH className={COL_RULE}>Next Due</TH>
                                    <TH className={COL_RULE}>Due In</TH>
                                    <TH className={COL_RULE}>Status</TH>
                                    <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <EmptyRow
                                        colSpan={9}
                                        Icon={Truck}
                                        title={rows.length === 0 ? 'No assets on this carrier yet' : 'No asset matches this view'}
                                        onClear={rows.length === 0 ? undefined : () => {
                                            setFilter('all'); setGroupBy('none'); setSearch('');
                                        }}
                                    />
                                )}
                                {paged.map((r, i) => {
                                    const band = groupBy === 'none' ? null : bandOf(r);
                                    const prevBand = i === 0 || groupBy === 'none' ? null : bandOf(paged[i - 1]);
                                    return (
                                        <Fragment key={r.id}>
                                        {band && (!prevBand || prevBand.label !== band.label) && (
                                            <TableGroupBand label={band.label} count={bandCounts.get(band.label) ?? 0} colSpan={9} />
                                        )}
                                        <tr
                                            className="cursor-pointer transition-colors hover:bg-slate-50/60"
                                            onClick={() => onOpenAsset(r.id)}
                                            tabIndex={0}
                                            role="link"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    onOpenAsset(r.id);
                                                }
                                            }}
                                        >
                                            <TD>
                                                {/* The whole row opens the asset’s own page, so it needs no
                                                    arrow to say so. */}
                                                <div className="flex items-center gap-3">
                                                    <RowIcon Icon={r.kind === 'truck' ? Truck : Car} tone={r.state === 'overdue' ? 'amber' : 'blue'} />
                                                    <div className="min-w-0">
                                                        <div className="truncate font-semibold leading-tight text-slate-900">{r.label}</div>
                                                        <p className="truncate text-xs leading-tight text-slate-500">
                                                            {r.kind === 'truck' ? 'Truck' : 'Trailer'}
                                                            {r.description ? ` · ${r.description}` : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {r.driver
                                                    ? <span className="whitespace-nowrap text-sm text-slate-700">{r.driver}</span>
                                                    : <span className="text-sm text-slate-300">—</span>}
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap tabular-nums text-slate-700')}>
                                                {r.meter.odometer ? `${r.meter.odometer.toLocaleString()} mi` : <span className="text-slate-300">—</span>}
                                            </TD>
                                            <TD className={cn(COL_RULE, 'whitespace-nowrap tabular-nums text-slate-700')}>
                                                {r.meter.engineHours ? `${r.meter.engineHours.toLocaleString()} h` : <span className="text-slate-300">—</span>}
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {r.lines.length === 0
                                                    ? <span className="text-sm text-slate-300">None</span>
                                                    : (
                                                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-700">{r.lines.length}</span>
                                                            {r.counts.overdue > 0 && (
                                                                <span className="text-[11px] font-bold text-red-600">{r.counts.overdue} overdue</span>
                                                            )}
                                                        </div>
                                                    )}
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {r.next?.due ? (<>
                                                    <div className="whitespace-nowrap font-medium leading-tight tabular-nums text-slate-900">{r.next.due.at}</div>
                                                    <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400" title={r.next.name}>
                                                        {r.next.name}
                                                    </p>
                                                </>) : <span className="text-sm text-slate-300">—</span>}
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {r.next?.due?.left ? (
                                                    <span className={cn(
                                                        'inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
                                                        r.next.due.over ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700',
                                                    )}>{r.next.due.left}</span>
                                                ) : <span className="text-sm text-slate-300">—</span>}
                                            </TD>
                                            <TD className={COL_RULE}><StatePill state={r.state} /></TD>
                                            <TD className={cn(COL_RULE, 'text-right')} onClick={(e) => e.stopPropagation()}>
                                                <KebabMenu
                                                    className="justify-end"
                                                    title={`Actions for ${r.label}`}
                                                    items={[
                                                        ...(r.outstandingTaskIds.length ? [{
                                                            label: 'Create work order',
                                                            icon: Briefcase,
                                                            onClick: () => onCreateOrder(r.outstandingTaskIds),
                                                        }] : []),
                                                        {
                                                            label: 'Open asset',
                                                            icon: ListChecks,
                                                            onClick: () => onOpenAsset(r.id),
                                                        },
                                                        { label: 'Share to chat', icon: Share2, onClick: () => setSharing(r) },
                                                    ]}
                                                />
                                            </TD>
                                        </tr>

                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <TablePager
                    page={page}
                    perPage={perPage}
                    total={banded.length}
                    label="assets"
                    onPage={setPage}
                    onPerPage={(n) => { setPerPage(n); setPage(0); }}
                />
            </div>

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share ${sharing.label}`}
                    subtitle="What this asset needs, across its intervals"
                    source={{ type: 'manual', id: sharing.id, label: sharing.label }}
                    items={[
                        { name: sharing.description ? `${sharing.label} · ${sharing.description}` : sharing.label, group: 'Asset' },
                        ...(sharing.driver ? [{ name: sharing.driver, group: 'Driver' }] : []),
                        { name: `${sharing.meter.odometer.toLocaleString()} mi`, group: 'Odometer' },
                        ...sharing.lines.map((l) => ({
                            name: `${l.name} — ${l.due?.at ?? 'no clock'}${l.due?.left ? ` (${l.due.left})` : ''}`,
                            group: 'Intervals',
                        })),
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${sharing.label} — maintenance standing`}
                />
            )}
        </div>
    );
}

/** Exported for the page that builds the rows. */
export type { ClockDue };
