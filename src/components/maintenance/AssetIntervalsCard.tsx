// ─────────────────────────────────────────────────────────────────────────────
// AssetIntervalsCard — what one unit owes, and the order that answers it.
//
// The maintenance module's asset page and the unit's own record in the carrier profile
// both show this. It is the same list in both because it is the same question, and a yard
// that reads "PM-B · 900 mi to go" on one screen and something else on the other stops
// trusting either. The rows come from `assetIntervalLine`, which both screens derive with.
//
// The ticks and the Create work order button are the point of it. A shop visit is rarely
// one job — the truck goes in for the PM service AND the brake inspection — and raising
// two orders for one visit is two invoices to reconcile.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    Briefcase, CalendarClock, Check, Eye, FilePlus2, FileText, ListChecks, Lock,
    MinusCircle, Pencil, Search, Share2, ShieldCheck,
} from 'lucide-react';
import { FilterChip, ResetFilters, TableGroupBand } from '@/components/ui/ListChrome';
import { TablePager } from '@/pages/inventory/TablePager';
import { TH, TD, COL_RULE, EmptyRow, RowButton } from '@/components/ui/CatalogTable';
import { KebabMenu } from '@/components/ui/KebabMenu';
import { Switch } from '@/components/ui/switch';
import type { AssetRecordKey } from '@/pages/assets/asset-records-bridge';
import { type AnnualCapture as Capture } from '@/pages/assets/asset-annual-records';
import type { LastService } from '@/pages/assets/LastServiceDialog';
import type { AssetIntervalLine } from '@/pages/assets/MaintenanceAssetsTable';
import type { AssetState, ClockDue, ClockUnit } from '@/pages/assets/service-intervals';
import { tierOf } from '@/pages/assets/service-intervals';
import { cn } from '@/lib/utils';

const STATE_PILL: Record<AssetState | 'none', { cls: string; label: string }> = {
    overdue: { cls: 'border-red-200 bg-red-50 text-red-700', label: 'Overdue' },
    due: { cls: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Due' },
    upcoming: { cls: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Upcoming' },
    untracked: { cls: 'border-slate-200 bg-slate-100 text-slate-500', label: 'Not tracking' },
    none: { cls: 'border-slate-200 bg-slate-50 text-slate-400', label: 'On no interval' },
};

export const STATE_PILL_LABEL = (s: AssetState | 'none') => STATE_PILL[s].label;

export function StatePill({ state }: { state: AssetState | 'none' }) {
    const t = STATE_PILL[state];
    return (
        <span className={cn('inline-flex whitespace-nowrap items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', t.cls)}>
            {t.label}
        </span>
    );
}


/**
 * One clock on one rule: where it falls due, and what is left on it.
 *
 * Side by side rather than stacked. Stacked, every row in the list was two rows tall —
 * and the column still could not be read down, because every other line in it was a
 * different fact.
 */
function ClockCell({ every, clock, tracking }: { every?: string; clock?: ClockDue; tracking: boolean }) {
    if (!every) return <span className="text-sm text-slate-300">—</span>;
    if (!clock) {
        return (
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
                <span className="text-[13px] font-semibold text-slate-400">{tracking ? 'Not set' : 'Off'}</span>
                <span className="text-[11px] text-slate-400">{every}</span>
            </div>
        );
    }
    return (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={cn('text-[13px] font-medium tabular-nums', clock.over ? 'text-red-600' : 'text-slate-900')}>
                {clock.dueText}
            </span>
            <span className={cn('text-[11px]', clock.over ? 'font-semibold text-red-600' : 'text-slate-500')}>
                {clock.remainingText}
            </span>
        </div>
    );
}

const clockOf = (line: AssetIntervalLine, unit: ClockUnit) => line.clocks.find((c) => c.unit === unit);


/**
 * One line of this asset’s maintenance — a rule it is on, or an annual record filed
 * against it.
 *
 * Two different things on paper; one question from the yard, which is what does this truck
 * owe and when. So they share a row shape and a list rather than sitting in two tables
 * that answer half each.
 */
interface MaintRow {
    id: string;
    kind: 'interval' | 'record';
    name: string;
    sub: string;
    line?: AssetIntervalLine;
    recordKey?: AssetRecordKey;
    capture?: Capture;
    clocks: { mileage?: ClockDue; hours?: ClockDue; days?: ClockDue };
    runs: { mileage?: string; hours?: string; days?: string };
    state: AssetState;
    /** A rule counts when it is switched on; a record counts when it is monitored. */
    tracking: boolean;
    /** The live work order this job is already on — it cannot be ordered again until then. */
    onOrder?: string;
}

const ROW_FILTERS: { id: AssetState | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'due', label: 'Due' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'untracked', label: 'Not tracking' },
];

type RowGroupBy = 'none' | 'status' | 'kind' | 'clock';

const ROW_GROUPS: { id: RowGroupBy; label: string }[] = [
    { id: 'none', label: 'Group by' },
    { id: 'status', label: 'Status' },
    { id: 'kind', label: 'Type' },
    { id: 'clock', label: 'Clock' },
];

const ROW_BAND: Record<AssetState, { rank: number; label: string }> = {
    overdue: { rank: 0, label: 'Overdue' },
    due: { rank: 1, label: 'Due' },
    upcoming: { rank: 2, label: 'Upcoming' },
    untracked: { rank: 3, label: 'Not tracking' },
};


/** What an annual record was last done at — the date and the reading, as the form captured them. */
function RecordLastPerformed({ capture }: { capture?: Capture }) {
    return <Figure parts={capture?.lastDate ? [shortDate(capture.lastDate)] : []} />;
}

function RecordLastReading({ capture }: { capture?: Capture }) {
    return <Figure parts={capture?.odometer != null
        ? [`${capture.odometer.toLocaleString()} ${capture.odometerUnit === 'km' ? 'km' : 'mi'}`]
        : []} />;
}

const shortDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/**
 * What this rule was last done at, in the terms it was captured in.
 *
 * For the annual inspection that is the certificate: the day it was done and the odometer
 * it was done at, which is exactly what the asset form asked for. For the rest it is
 * whatever was entered when the rule was switched on.
 */
function Figure({ parts }: { parts: string[] }) {
    if (!parts.length) return <span className="text-sm text-slate-300">Not recorded</span>;
    return (
        <div className="whitespace-nowrap text-[13px] tabular-nums text-slate-700">
            {parts.map((t, i) => (
                <span key={t}>
                    {i > 0 && <span className="mx-1.5 text-slate-300">·</span>}
                    {t}
                </span>
            ))}
        </div>
    );
}

/** When it was last done. What the days clock counts from. */
function LastPerformedCell({ line }: { line: AssetIntervalLine }) {
    const when = line.lastService?.date ?? line.enrolled?.lastServiceDate;
    return <Figure parts={when ? [shortDate(when)] : []} />;
}

/** What the meters read when it was done — what the other two clocks count from. */
function LastReadingCell({ line }: { line: AssetIntervalLine }) {
    const parts: string[] = [];
    const e = line.enrolled;
    const odo = line.lastService?.odometer ?? e?.lastOdometer;
    if (odo != null) parts.push(`${odo.toLocaleString()} ${line.lastService?.odometerUnit === 'km' ? 'km' : 'mi'}`);
    if (e?.lastEngineHours != null) parts.push(`${e.lastEngineHours.toLocaleString()} h`);
    return <Figure parts={parts} />;
}


export function AssetIntervalsCard({
    assetId, assetLabel, lines, openOrderOf, onCreateOrder, onOpenInterval, onOpenPair,
    onSetTracking, onRemoveFromInterval, onStartTracking, onShareLine, onEditAnnual,
    onRecordMonitoring,
}: {
    assetId: string;
    assetLabel: string;
    /** The rules this unit is on, already filtered to the ones this screen shows. */
    lines: AssetIntervalLine[];
    /**
     * The live order a job is already on, if any.
     *
     * A row on an order that has not been closed out cannot be put on another one: the
     * work is already with a shop, and ordering it twice is two invoices for one job.
     */
    openOrderOf?: (taskId: string) => string | undefined;
    /**
     * Raise an order. `rows` carries the jobs that have no task yet — an interval this
     * asset is on but has not been scheduled for is still work somebody can order.
     */
    onCreateOrder: (taskIds: string[], rows?: {
        assetId: string; intervalId?: string; name: string;
        serviceTypeIds: string[]; taskId?: string; status?: string;
    }[]) => void;
    /** The rule across the whole fleet. */
    onOpenInterval: (intervalId: string) => void;
    /** This rule ON THIS UNIT — where a row click goes, when the host offers it. */
    onOpenPair?: (intervalId: string) => void;
    onSetTracking: (intervalId: string, enabled: boolean, last?: LastService) => void;
    onRemoveFromInterval?: (intervalId: string) => void;
    /**
     * Switching a rule ON means saying when it was last done, which is a form — so the host
     * owns it. Without one the switch can only turn rules off, which is the right thing for
     * a screen that has no way to ask the question.
     */
    onStartTracking?: (line: AssetIntervalLine, editing: boolean) => void;
    onShareLine?: (line: AssetIntervalLine) => void;
    onEditAnnual?: (key: AssetRecordKey, mode: 'add' | 'edit') => void;
    onRecordMonitoring?: (key: AssetRecordKey, enabled: boolean) => void;
}) {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<AssetState | 'all'>('all');
    const [groupBy, setGroupBy] = useState<RowGroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    /**
     * The rows going onto one work order.
     *
     * A shop visit is rarely one job: the truck goes in for the PM service AND the brake
     * inspection, and raising two orders for one visit is two invoices to reconcile. So
     * the rows are ticked and the order is raised from what is ticked.
     */
    const [picked, setPicked] = useState<string[]>([]);

    const allRows = useMemo<MaintRow[]>(() => lines.map((line): MaintRow => ({
        id: line.intervalId,
        kind: 'interval',
        name: line.name,
        sub: line.services.join(', ') || line.everyText,
        line,
        clocks: {
            mileage: clockOf(line, 'miles'),
            hours: clockOf(line, 'engine_hours'),
            days: clockOf(line, 'days'),
        },
        runs: line.runs,
        state: line.state,
        tracking: line.tracking,
        onOrder: line.taskId ? openOrderOf?.(line.taskId) : undefined,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    })), [lines, openOrderOf]);

    const counting = allRows.filter((r) => r.tracking).length;

    const rowCounts = useMemo(() => {
        const out: Record<string, number> = { all: allRows.length };
        for (const r of allRows) out[r.state] = (out[r.state] ?? 0) + 1;
        return out;
    }, [allRows]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter((r) => {
            if (filter !== 'all' && r.state !== filter) return false;
            if (!q) return true;
            return r.name.toLowerCase().includes(q) || r.sub.toLowerCase().includes(q);
        });
    }, [allRows, search, filter]);

    const bandOf = (r: MaintRow): { rank: number; label: string } => {
        if (groupBy === 'status') return ROW_BAND[r.state];
        if (groupBy === 'kind') {
            return r.kind === 'interval'
                ? { rank: 0, label: 'Service intervals' }
                : { rank: 1, label: 'Annual records' };
        }
        // By clock: whichever of the three decides this row.
        const first = [r.clocks.mileage, r.clocks.hours, r.clocks.days]
            .filter(Boolean)
            .sort((a, b) => a!.share - b!.share)[0];
        if (!first) return { rank: 3, label: 'No clock yet' };
        return first.unit === 'miles' ? { rank: 0, label: 'By mileage' }
            : first.unit === 'engine_hours' ? { rank: 1, label: 'By engine hours' }
                : { rank: 2, label: 'By days' };
    };

    const banded = useMemo(() => {
        if (groupBy === 'none') return visibleRows;
        return [...visibleRows].sort((a, b) => {
            const ba = bandOf(a), bb = bandOf(b);
            return ba.rank - bb.rank || ba.label.localeCompare(bb.label);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleRows, groupBy]);

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

    useEffect(() => { setPage(0); }, [search, filter, groupBy, assetId]);

    const paged = banded.slice(page * perPage, page * perPage + perPage);

    /** A job already with a shop is not on offer; nor is it swept up by "select all". */
    const orderable = (r: MaintRow) => !r.onOrder;
    const pickedRows = allRows.filter((r) => picked.includes(r.id) && orderable(r));
    /** The tasks behind what is ticked — an annual record has none, and cannot be ordered. */
    const pickedTaskIds = pickedRows.map((r) => r.line?.taskId).filter(Boolean) as string[];
    const toggleRow = (id: string) =>
        setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
    const pageIds = paged.filter(orderable).map((r) => r.id);
    const allPagePicked = pageIds.length > 0 && pageIds.every((id) => picked.includes(id));

    return (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900">Service intervals &amp; annual records</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                            {counting} of {allRows.length} counting
                            {counting < allRows.length && ' · switch one on to say when it was last serviced'}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    {picked.length > 0 && (
                        <>
                            <span className="text-[12px] font-semibold text-slate-500">
                                {picked.length} selected
                            </span>
                            <button
                                type="button"
                                disabled={pickedRows.filter((r) => r.line).length === 0}
                                onClick={() => {
                                    onCreateOrder(pickedTaskIds, pickedRows
                                        .filter((r) => r.line)
                                        .map((r) => ({
                                            assetId: assetId,
                                            intervalId: r.line!.intervalId,
                                            name: r.name,
                                            serviceTypeIds: r.line!.services.length
                                                ? r.line!.serviceTypeIds ?? []
                                                : [],
                                            taskId: r.line!.taskId,
                                            status: r.state,
                                        })));
                                    setPicked([]);
                                }}
                                title={pickedRows.filter((r) => r.line).length === 0
                                    ? "Annual records are not work — tick an interval"
                                    : undefined}
                                className={cn(
                                    "inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors",
                                    pickedRows.filter((r) => r.line).length ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300",
                                )}
                            >
                                <Briefcase size={15} /> Create work order
                            </button>
                        </>
                    )}
                    <div className="relative">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search interval or record"
                            className="h-9 w-52 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-64"
                        />
                    </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/40 px-5 py-2">
                    {ROW_FILTERS.map((f) => (
                        <FilterChip
                            key={f.id}
                            label={f.label}
                            count={rowCounts[f.id] ?? 0}
                            on={filter === f.id}
                            always={f.id === 'all'}
                            onClick={() => setFilter(f.id)}
                        />
                    ))}
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as RowGroupBy)}
                        title="Band the list"
                        className={cn(
                            'ml-auto h-8 shrink-0 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500',
                            groupBy === 'none'
                                ? 'border-slate-200 bg-white text-slate-600'
                                : 'border-blue-300 bg-blue-50/60 text-blue-700',
                        )}
                    >
                        {ROW_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                    <ResetFilters
                        on={filter !== 'all' || groupBy !== 'none' || search.trim() !== ''}
                        onReset={() => { setFilter('all'); setGroupBy('none'); setSearch(''); }}
                    />
                </div>

                <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1260px]">
                            <thead>
                                <tr>
                                    <TH className="w-10">
                                        <button
                                            type="button"
                                            onClick={() => setPicked(allPagePicked
                                                ? picked.filter((id) => !pageIds.includes(id))
                                                : [...new Set([...picked, ...pageIds])])}
                                            aria-label={allPagePicked ? "Clear selection" : "Select all"}
                                            className={cn(
                                                "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                                allPagePicked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white",
                                            )}
                                        >
                                            {allPagePicked && <Check size={11} />}
                                        </button>
                                    </TH>
                                    <TH>Maintenance Interval</TH>
                                    <TH className={COL_RULE}>Mileage Interval</TH>
                                    <TH className={COL_RULE}>Time Interval</TH>
                                    <TH className={COL_RULE}>Operating Hour</TH>
                                    <TH className={COL_RULE}>Last performed date</TH>
                                    <TH className={COL_RULE}>Odometer</TH>
                                    <TH className={COL_RULE}>Status</TH>
                                    <TH className={COL_RULE}>Tracking</TH>
                                    <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <EmptyRow
                                        colSpan={10}
                                        Icon={CalendarClock}
                                        title={allRows.length === 0
                                            ? `${assetLabel} is on no service interval`
                                            : 'Nothing matches this view'}
                                        hint={allRows.length === 0 ? 'Add it from an interval’s own Assets tab.'  : undefined}
                                        onClear={allRows.length === 0 ? undefined : () => {
                                            setFilter('all'); setGroupBy('none'); setSearch('');
                                        }}
                                    />
                                )}
                                {paged.map((r, i) => {
                                    const band = groupBy === 'none' ? null : bandOf(r);
                                    const prevBand = i === 0 || groupBy === 'none' ? null : bandOf(paged[i - 1]);
                                    const line = r.line;
                                    return (
                                        <Fragment key={r.id}>
                                        {band && (!prevBand || prevBand.label !== band.label) && (
                                            <TableGroupBand label={band.label} count={bandCounts.get(band.label) ?? 0} colSpan={10} />
                                        )}
                                        <tr className={cn(
                                            'transition-colors hover:bg-slate-50/60',
                                            !r.tracking && 'bg-slate-50/40',
                                            picked.includes(r.id) && 'bg-blue-50/40',
                                        )}>
                                            <TD>
                                                <button
                                                    type="button"
                                                    disabled={!!r.onOrder}
                                                    onClick={() => toggleRow(r.id)}
                                                    aria-label={r.onOrder ? `${r.name} is already on ${r.onOrder}` : `Select ${r.name}`}
                                                    title={r.onOrder ? `Already on ${r.onOrder} — complete that order first` : undefined}
                                                    className={cn(
                                                        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                                        r.onOrder ? "cursor-not-allowed border-slate-200 bg-slate-100"
                                                            : picked.includes(r.id) ? "border-blue-600 bg-blue-600 text-white"
                                                                : "border-slate-300 bg-white",
                                                    )}
                                                >
                                                    {r.onOrder ? <Lock size={9} className="text-slate-400" />
                                                        : picked.includes(r.id) && <Check size={11} />}
                                                </button>
                                            </TD>
                                            <TD>
                                                <button
                                                    type="button"
                                                    onClick={() => (line
                                                        ? (onOpenPair ?? onOpenInterval)(line.intervalId)
                                                        : onEditAnnual?.(r.recordKey!, 'edit'))}
                                                    className="text-left"
                                                >
                                                    {/* The name and everything that classifies it, on one
                                                        line. A badge under a name is a second row of table
                                                        for a word — and three of them, which some of these
                                                        rows carry, is four.

                                                        The services it covers are not shown here at all:
                                                        six of them truncated to "Brake Inspection, Tire
                                                        Rotation, Grease Fifth Whe…" tells a reader nothing
                                                        they can act on. The interval's own page lists them
                                                        in full, grouped. Search still matches them. */}
                                                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                                                        <span className={cn('font-semibold hover:underline', r.tracking ? 'text-slate-900' : 'text-slate-500')}>
                                                            {r.name}
                                                        </span>
                                                        {tierOf(line?.tier) && (
                                                            <span className={cn(
                                                                'inline-flex shrink-0 items-center rounded-full border px-1.5 text-[9px] font-bold uppercase tracking-wider',
                                                                tierOf(line!.tier)!.pill,
                                                            )}>
                                                                {tierOf(line!.tier)!.label}
                                                            </span>
                                                        )}
                                                        {/* Where its figures come from, when they are not the rule’s own. */}
                                                        {line?.fromAnnualRecord && (
                                                            <span
                                                                title="Counted from the asset's annual safety certificate"
                                                                className="inline-flex shrink-0 items-center gap-1 rounded bg-blue-50 px-1 text-[9px] font-bold uppercase tracking-wide text-blue-700"
                                                            >
                                                                <ShieldCheck size={10} /> Annual safety
                                                            </span>
                                                        )}
                                                        {r.kind === 'record' && (
                                                            <span className="inline-flex shrink-0 items-center gap-1 rounded bg-violet-50 px-1 text-[9px] font-bold uppercase tracking-wide text-violet-700">
                                                                <FileText size={10} /> Annual record
                                                            </span>
                                                        )}
                                                    </div>
                                                </button>
                                            </TD>
                                            <TD className={COL_RULE}>
                                                <ClockCell every={r.runs.mileage} clock={r.clocks.mileage} tracking={r.tracking} />
                                            </TD>
                                            <TD className={COL_RULE}>
                                                <ClockCell every={r.runs.days} clock={r.clocks.days} tracking={r.tracking} />
                                            </TD>
                                            <TD className={COL_RULE}>
                                                <ClockCell every={r.runs.hours} clock={r.clocks.hours} tracking={r.tracking} />
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {line
                                                    ? <LastPerformedCell line={line} />
                                                    : <RecordLastPerformed capture={r.capture} />}
                                            </TD>
                                            <TD className={COL_RULE}>
                                                {line
                                                    ? <LastReadingCell line={line} />
                                                    : <RecordLastReading capture={r.capture} />}
                                            </TD>
                                            {/* Where it stands, and that is the column.
                                                The order it is already on was printed beside it and
                                                ran to "on Brake Inspection, Annual Inspection —
                                                ACM-T0101" — a whole sentence in a status column,
                                                saying what the greyed-out Create work order button
                                                beside it already says, with the order's name on
                                                hover. */}
                                            <TD className={COL_RULE}>
                                                <StatePill state={r.state} />
                                            </TD>
                                            <TD className={COL_RULE}>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn('text-xs font-semibold', r.tracking ? 'text-slate-600' : 'text-slate-400')}>
                                                        {r.tracking ? 'On' : 'Off'}
                                                    </span>
                                                    <Switch
                                                        checked={r.tracking}
                                                        onCheckedChange={(next) => {
                                                            // A rule is switched on by saying when it was last
                                                            // done; a record’s switch is its monitoring.
                                                            if (line) {
                                                                if (next) onStartTracking?.(line, false);
                                                                else onSetTracking(line.intervalId, false);
                                                            } else {
                                                                onRecordMonitoring?.(r.recordKey!, next);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </TD>
                                            <TD className={cn(COL_RULE, 'text-right')}>
                                              <div className="flex items-center justify-end gap-1">
                                                {/* The one thing a row mostly needs doing, said in a symbol and a
                                                    word. Already with a shop, it says so rather than disappearing. */}
                                                {line && (
                                                    <RowButton
                                                        Icon={Briefcase}
                                                        label="Create work order"
                                                        tone="blue"
                                                        disabled={!!r.onOrder}
                                                        title={r.onOrder
                                                            ? `Already on ${r.onOrder} — complete that order first`
                                                            : undefined}
                                                        onClick={() => onCreateOrder(line.taskId ? [line.taskId] : [], [{
                                                            assetId: assetId,
                                                            intervalId: line.intervalId,
                                                            name: r.name,
                                                            serviceTypeIds: line.serviceTypeIds ?? [],
                                                            taskId: line.taskId,
                                                            status: r.state,
                                                        }])}
                                                    />
                                                )}
                                                <KebabMenu
                                                    className="justify-end"
                                                    title={`Actions for ${r.name}`}
                                                    items={line ? [
                                                        // Everything else this row can do: send it to somebody,
                                                        // correct it, open the rule, take it off.
                                                        { label: 'Share to chat', icon: Share2, onClick: () => onShareLine?.(line) },
                                                        { label: 'Edit last service', icon: Pencil, onClick: () => onStartTracking?.(line, true) },
                                                        { label: 'Open interval', icon: ListChecks, onClick: () => onOpenInterval(line.intervalId) },
                                                        { label: 'Remove from interval', icon: MinusCircle, danger: true, onClick: () => onRemoveFromInterval?.(line.intervalId) },
                                                    ] : [
                                                        { label: 'Edit record', icon: Pencil, onClick: () => onEditAnnual?.(r.recordKey!, 'edit') },
                                                        { label: 'Add record', icon: FilePlus2, onClick: () => onEditAnnual?.(r.recordKey!, 'add') },
                                                        ...(r.capture?.files[0]?.url ? [{
                                                            label: 'View document',
                                                            icon: Eye,
                                                            onClick: () => window.open(r.capture!.files[0].url, '_blank', 'noreferrer'),
                                                        }] : []),
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
                </div>

                <TablePager
                    page={page}
                    perPage={perPage}
                    total={banded.length}
                    label="rows"
                    onPage={setPage}
                    onPerPage={(n) => { setPerPage(n); setPage(0); }}
                />
            </div>
    );
}
