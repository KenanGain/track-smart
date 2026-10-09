// ─────────────────────────────────────────────────────────────────────────────
// ServiceIntervalsTable — the rules, one row each, with the columns the form fills in.
//
// The Service interval tab used to show only the tasks a rule generates: one row per
// asset per service, so a rule covering eight trucks appeared eight times and the name
// you typed appeared nowhere. This lists the rules themselves, in the same shape as
// every other catalog list in the app.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    CalendarClock, Search, Share2, Trash2, Gauge, Clock, CalendarDays, AlertTriangle,
    ListChecks, Pencil, SlidersHorizontal,
} from 'lucide-react';
import { TH, TD, COL_RULE, RowIcon, EmptyRow } from '@/components/ui/CatalogTable';
import { KebabMenu } from '@/components/ui/KebabMenu';
// The chips, the banding and the reset every long list in the app wears.
import { FilterChip, ResetFilters, TableGroupBand } from '@/components/ui/ListChrome';
import { tierOf, tierLabel, tierRank } from './service-intervals';
import { ShareToChat } from '@/components/share/ShareToChat';
import { KpiTile } from '@/pages/inventory/InventoryKpi';
import { TablePager } from '@/pages/inventory/TablePager';
import { ENTITY_LABEL, intervalText, isIntervalActive, type ServiceIntervalRow } from './service-intervals';
import { cn } from '@/lib/utils';

/**
 * One clock, in its own column.
 *
 * They shared a cell before, which read as a single "every" even though the three run
 * independently — and it made the one question you actually ask of this list, "which of
 * these go by days", something you had to read every row to answer. A column each sorts
 * the eye out: a figure where the rule has one, a dash where it does not.
 */
function Clock3({ value, Icon }: { value?: string; Icon: React.ElementType }) {
    if (!value) return <span className="text-sm text-slate-300">—</span>;
    return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
            <Icon size={11} className="text-slate-400" /> {value}
        </span>
    );
}

/** The three figures a rule can carry, each one formatted or absent. */
function clocksOf(row: ServiceIntervalRow) {
    const i = row.intervals;
    return {
        mileage: i?.mileage ? `${i.mileage.every.toLocaleString()} ${i.mileage.unit === 'km' ? 'km' : 'mi'}` : undefined,
        hours: i?.engineHours ? `${i.engineHours.every.toLocaleString()} h` : undefined,
        days: i?.days ? `${i.days.every.toLocaleString()} d` : undefined,
    };
}

/**
 * How to band the list.
 *
 * "By clock" is the one this screen could not answer: on a fleet running rules on miles,
 * hours and days, which rules go by which is a question you ask of the whole list, and
 * reading it off a column one row at a time is not an answer.
 */
type IntervalGroupBy = 'none' | 'status' | 'clock' | 'entity' | 'tier';

const INTERVAL_GROUPS: { id: IntervalGroupBy; label: string }[] = [
    { id: 'none', label: 'Group by' },
    { id: 'status', label: 'Status' },
    // How heavy the work is. "How many comprehensives are we behind on" is a question
    // about the whole programme, and reading it one row at a time is not an answer.
    { id: 'tier', label: 'Level' },
    { id: 'clock', label: 'Clock' },
    { id: 'entity', label: 'Truck / trailer' },
];

export function ServiceIntervalsTable({ rows, assetLabel, serviceName, onOpen, onEdit, onDelete, className }: {
    rows: ServiceIntervalRow[];
    /** Unit number for an asset id — what people call the truck. */
    assetLabel: (id: string) => string;
    serviceName: (id: string) => string;
    /** Open the rule’s own page. The row does this; the menu says so too. */
    onOpen?: (row: ServiceIntervalRow) => void;
    /** Open the rule in the form that built it. */
    onEdit?: (row: ServiceIntervalRow) => void;
    onDelete?: (row: ServiceIntervalRow) => void;
    className?: string;
}) {
    const [search, setSearch] = useState('');
    const [only, setOnly] = useState<'all' | 'active' | 'attention' | 'manual'>('all');
    const [groupBy, setGroupBy] = useState<IntervalGroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [sharing, setSharing] = useState<ServiceIntervalRow | null>(null);

    const counts = useMemo(() => ({
        total: rows.length,
        active: rows.filter(isIntervalActive).length,
        attention: rows.filter((r) => r.counts.overdue > 0).length,
        manual: rows.filter((r) => !r.intervals).length,
    }), [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (only === 'active' && !isIntervalActive(r)) return false;
            if (only === 'attention' && r.counts.overdue === 0) return false;
            if (only === 'manual' && r.intervals) return false;
            if (!q) return true;
            return r.name.toLowerCase().includes(q)
                || (tierLabel(r.tier) ?? '').toLowerCase().includes(q)
                || r.serviceTypeIds.some((id) => serviceName(id).toLowerCase().includes(q))
                || r.assetIds.some((id) => assetLabel(id).toLowerCase().includes(q));
        });
    }, [rows, search, only, serviceName, assetLabel]);

    const bandOf = (r: ServiceIntervalRow): { rank: number; label: string } => {
        if (groupBy === 'status') {
            if (r.counts.overdue > 0) return { rank: 0, label: 'Has overdue' };
            if (!isIntervalActive(r)) return { rank: 2, label: 'Not running' };
            return { rank: 1, label: 'Running' };
        }
        if (groupBy === 'entity') return { rank: 0, label: ENTITY_LABEL[r.entity] ?? 'Both' };
        // Lightest first, so the bands read in the order work escalates.
        if (groupBy === 'tier') return { rank: tierRank(r.tier), label: tierLabel(r.tier) ?? 'No level set' };
        if (groupBy === 'clock') {
            const i = r.intervals;
            if (i?.mileage) return { rank: 0, label: 'By mileage' };
            if (i?.engineHours) return { rank: 1, label: 'By engine hours' };
            if (i?.days) return { rank: 2, label: 'By days' };
            return { rank: 3, label: 'By hand' };
        }
        return { rank: 0, label: '' };
    };

    const banded = useMemo(() => {
        if (groupBy === 'none') return filtered;
        return [...filtered].sort((a, b) => {
            const ba = bandOf(a), bb = bandOf(b);
            return ba.rank - bb.rank || ba.label.localeCompare(bb.label) || a.name.localeCompare(b.name);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, groupBy]);

    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === 'none') return m;
        for (const r of banded) {
            const l = bandOf(r).label;
            m.set(l, (m.get(l) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [banded, groupBy]);

    useEffect(() => { setPage(0); }, [search, only, groupBy, rows]);

    const pageCount = Math.max(1, Math.ceil(banded.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const paged = banded.slice(safePage * perPage, safePage * perPage + perPage);

    const filtering = search.trim() !== '' || only !== 'all' || groupBy !== 'none';
    const clear = () => { setSearch(''); setOnly('all'); setGroupBy('none'); };

    return (
        <div className={cn('space-y-5', className)}>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiTile label="Service Intervals" value={counts.total} Icon={CalendarClock} accent="blue"
                    onClick={() => setOnly('all')} active={only === 'all'} />
                <KpiTile label="Running" value={counts.active} Icon={ListChecks} accent="emerald"
                    onClick={() => setOnly('active')} active={only === 'active'} />
                <KpiTile label="Has Overdue" value={counts.attention} Icon={AlertTriangle} accent="red"
                    onClick={() => setOnly('attention')} active={only === 'attention'} />
                <KpiTile label="By Hand" value={counts.manual} Icon={CalendarDays} accent="slate"
                    onClick={() => setOnly('manual')} active={only === 'manual'} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <div className="relative min-w-[190px] max-w-xs flex-1">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search interval, service or unit…"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    {/* The same chips the asset and work-order lists carry. The tiles above
                        drive the same filter — one state, two ways in, so they cannot disagree. */}
                    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1">
                        <FilterChip label="All" count={counts.total} on={only === 'all'} always onClick={() => setOnly('all')} />
                        <FilterChip label="Running" count={counts.active} on={only === 'active'} onClick={() => setOnly('active')} />
                        <FilterChip label="Has overdue" count={counts.attention} on={only === 'attention'} onClick={() => setOnly('attention')} />
                        <FilterChip label="By hand" count={counts.manual} on={only === 'manual'} onClick={() => setOnly('manual')} />
                    </div>
                    <div className="relative">
                        <SlidersHorizontal size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as IntervalGroupBy)}
                            className="h-9 rounded-lg border border-slate-200 bg-white pl-7 pr-7 text-[12px] font-semibold text-slate-600 outline-none focus:border-blue-500"
                        >
                            {INTERVAL_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                    </div>
                    <div className="ml-auto">
                        <ResetFilters on={filtering} onReset={clear} />
                    </div>
                </div>

                <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <TH>Maintenance Interval</TH>
                                    <TH className={COL_RULE}>Services</TH>
                                    <TH className={COL_RULE}>Mileage Interval</TH>
                                    <TH className={COL_RULE}>Time Interval</TH>
                                    <TH className={COL_RULE}>Operating Hour</TH>
                                    <TH className={COL_RULE}>Assets</TH>
                                    <TH className={COL_RULE}>Status</TH>
                                    <TH className={cn('w-px text-right', COL_RULE)}>Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <EmptyRow
                                        colSpan={8}
                                        Icon={CalendarClock}
                                        title="No service intervals match your filters"
                                        hint={search.trim()
                                            ? <>Nothing matches <span className="font-semibold text-slate-600">{search.trim()}</span> in this view.</>
                                            : 'New Service Interval builds one.'}
                                        onClear={filtering ? clear : undefined}
                                    />
                                )}
                                {paged.map((r, i) => {
                                    const clocks = clocksOf(r);
                                    const band = groupBy === 'none' ? null : bandOf(r);
                                    const prevBand = i === 0 || groupBy === 'none' ? null : bandOf(paged[i - 1]);
                                    return (
                                        <Fragment key={r.id}>
                                        {band && (!prevBand || prevBand.label !== band.label) && (
                                            <TableGroupBand label={band.label} count={bandCounts.get(band.label) ?? 0} colSpan={8} />
                                        )}
                                        <tr
                                            // The row opens the rule. Reading one should not mean hunting for
                                            // the menu first — and `role=link` plus a tab stop is what makes
                                            // that reachable without a mouse.
                                            onClick={onOpen ? () => onOpen(r) : undefined}
                                            onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(r); } : undefined}
                                            tabIndex={onOpen ? 0 : undefined}
                                            role={onOpen ? "link" : undefined}
                                            className={cn(
                                                "transition-colors hover:bg-slate-50/60",
                                                onOpen && "cursor-pointer focus:bg-slate-50 focus:outline-none",
                                            )}
                                        >
                                            <TD>
                                                <div className="flex items-center gap-3">
                                                    <RowIcon Icon={CalendarClock} tone={r.counts.overdue > 0 ? 'amber' : 'blue'} />
                                                    {/* One line: the name, what kind of rule it is, and who
                                                        it applies to. It was a stack three deep — name, tier
                                                        pill under it, a sentence under that — which made every
                                                        row in the list three rows tall to say what fits on
                                                        one. */}
                                                    <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                                                        <span className="truncate font-semibold text-slate-900">{r.name}</span>
                                                        {tierOf(r.tier) && (
                                                            <span className={cn(
                                                                'inline-flex shrink-0 items-center rounded-full border px-1.5 text-[9px] font-bold uppercase tracking-wider',
                                                                tierOf(r.tier)!.pill,
                                                            )}>
                                                                {tierOf(r.tier)!.label}
                                                            </span>
                                                        )}
                                                        {/* A tier the carrier did not write says so, because what
                                                            can be changed about it is different. */}
                                                        {r.system && (
                                                            <span
                                                                className="inline-flex shrink-0 items-center rounded border border-slate-200 bg-slate-50 px-1 text-[9px] font-bold uppercase tracking-wider text-slate-500"
                                                                title="Comes with the system. Enrol or switch off units on it; it cannot be deleted."
                                                            >
                                                                System
                                                            </span>
                                                        )}
                                                        <span className="shrink-0 text-[11px] text-slate-400">
                                                            {ENTITY_LABEL[r.entity]}
                                                            {' · '}{isIntervalActive(r) ? 'Running' : 'Nothing outstanding'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {/* The names, on a line, with the rest behind a count and a
                                                    tooltip. Two chips that wrap are two rows of table for a
                                                    list that is read down, not across. */}
                                                <div className="flex max-w-[16rem] items-center gap-1.5 whitespace-nowrap">
                                                    <span
                                                        className="truncate text-[13px] text-slate-700"
                                                        title={r.serviceTypeIds.map((id) => serviceName(id)).join(', ')}
                                                    >
                                                        {r.serviceTypeIds.slice(0, 2).map((id) => serviceName(id)).join(', ')}
                                                    </span>
                                                    {r.serviceTypeIds.length > 2 && (
                                                        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-slate-400">
                                                            +{r.serviceTypeIds.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </TD>
                                            <TD className={COL_RULE}><Clock3 value={clocks.mileage} Icon={Gauge} /></TD>
                                            <TD className={COL_RULE}><Clock3 value={clocks.days} Icon={CalendarDays} /></TD>
                                            <TD className={COL_RULE}><Clock3 value={clocks.hours} Icon={Clock} /></TD>
                                            <TD className={COL_RULE}>
                                                {/* How many, and that is all. Listing the first two unit
                                                    numbers printed raw ids ("a1, a2") for every seeded rule,
                                                    and even where it resolved it was two names out of eleven
                                                    — a list you cannot read instead of a number you can. */}
                                                {r.applyToAll ? (
                                                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                                        All eligible
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                                                        {r.assetIds.length}
                                                    </span>
                                                )}
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {/* The rule's output, by state — which is the only place the two
                                                    views of this tab meet. */}
                                                <div className="flex items-center gap-1 whitespace-nowrap">
                                                    {r.counts.overdue > 0 && <Pill tone="red">{r.counts.overdue} overdue</Pill>}
                                                    {r.counts.due > 0 && <Pill tone="amber">{r.counts.due} due</Pill>}
                                                    {r.counts.upcoming > 0 && <Pill tone="blue">{r.counts.upcoming} upcoming</Pill>}
                                                    {r.counts.overdue + r.counts.due + r.counts.upcoming === 0 && (
                                                        <Pill tone="slate">{r.counts.completed > 0 ? `${r.counts.completed} done` : 'none'}</Pill>
                                                    )}
                                                </div>
                                            </TD>
                                            {/* The menu must not also open the row underneath it. */}
                                            <TD className={COL_RULE} onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end">
                                                    <KebabMenu
                                                        title={`Actions for ${r.name}`}
                                                        items={[
                                                            ...(onOpen ? [{ label: 'Open', icon: ListChecks, onClick: () => onOpen(r) }] : []),
                                                            ...(onEdit ? [{ label: 'Edit', icon: Pencil, onClick: () => onEdit(r) }] : []),
                                                            { label: 'Share to chat', icon: Share2, onClick: () => setSharing(r) },
                                                            // Not offered on a tier that came with the system: a
                                                            // default somebody can delete is not a default. Units
                                                            // come off it one at a time, on the tier's own page.
                                                            ...(onDelete && !r.system
                                                                ? [{ label: 'Delete', icon: Trash2, danger: true, onClick: () => onDelete(r) }]
                                                                : []),
                                                        ]}
                                                    />
                                                </div>
                                            </TD>
                                        </tr>
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <TablePager
                        page={safePage}
                        perPage={perPage}
                        total={banded.length}
                        label="service intervals"
                        onPage={setPage}
                        onPerPage={(n) => { setPerPage(n); setPage(0); }}
                    />
                </div>
            </div>

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share ${sharing.name}`}
                    subtitle="A service interval, in a chat or by email"
                    source={{ type: 'manual', id: sharing.id, label: sharing.name }}
                    items={[
                        { name: sharing.serviceTypeIds.map(serviceName).join(', '), group: 'Services' },
                        { name: intervalText(sharing.intervals).join(' · ') || 'Scheduled by hand', group: 'Every' },
                        { name: ENTITY_LABEL[sharing.entity], group: 'Applies to' },
                        {
                            name: sharing.applyToAll ? 'All eligible assets' : sharing.assetIds.map(assetLabel).join(', '),
                            group: 'Assets',
                        },
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${sharing.name} — service interval`}
                />
            )}
        </div>
    );
}

function Pill({ tone, children }: { tone: 'red' | 'amber' | 'blue' | 'slate'; children: React.ReactNode }) {
    const cls = {
        red: 'bg-red-50 text-red-700 border-red-200',
        amber: 'bg-amber-50 text-amber-700 border-amber-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        slate: 'bg-slate-100 text-slate-500 border-slate-200',
    }[tone];
    return (
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider tabular-nums', cls)}>
            {children}
        </span>
    );
}
