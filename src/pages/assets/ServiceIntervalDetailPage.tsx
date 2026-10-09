// ─────────────────────────────────────────────────────────────────────────────
// ServiceIntervalDetailPage — one rule, and everything it has produced.
//
// The list answers "what rules do we run"; this answers "what is this one doing".
// It is the only place the per-asset rows live now: as a tab-level list they said
// nothing a rule could not say better, and a fleet of eleven trucks turned one rule
// into eleven rows you had to read to find the one that was overdue.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
    ArrowLeft, CalendarClock, Gauge, CalendarDays, Truck, Car, Layers,
    Share2, Trash2, Briefcase, ListChecks, LayoutGrid, Activity as ActivityIcon, Pencil,
    FilePlus2, CheckCircle2, Ban, Wrench, TriangleAlert, Clock, Plus, Search, UserRound,
    SlidersHorizontal, MinusCircle, Bell,
} from 'lucide-react';
import { ShareToChat } from '@/components/share/ShareToChat';
import { ProfileTabs } from '@/components/ui/ProfileTabs';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
import { TH, TD, COL_RULE, RowIcon, EmptyRow, RowButton } from '@/components/ui/CatalogTable';
import { tierOf } from './service-intervals';
import { KpiTile } from '@/pages/inventory/InventoryKpi';
import { KebabMenu } from '@/components/ui/KebabMenu';
// The chips, the banding and the pager every long list in the app wears.
import { FilterChip, ResetFilters, TableGroupBand } from '@/components/ui/ListChrome';
import { TablePager } from '@/pages/inventory/TablePager';
// The work-order row, still the shape the owner hands orders over in.
import type { WorkOrderRow } from '@/components/maintenance/WorkOrdersTable';
import type { ServiceEvent } from './service-history';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    ENTITY_LABEL, intervalText, isIntervalActive, remainingFor, remainingText,
    projectClocks, soonestClock, statusFromClocks,
    type ServiceIntervalRow,
} from './service-intervals';
import type { ServiceIntervals } from '@/types/service-types';
// The form that asks when this was last serviced — shared with the asset's own page.
import {
    StartTrackingDialog, type IntervalAssetInfo, type LastService,
} from './LastServiceDialog';
export type { IntervalAssetInfo, LastService };
import type { MaintenanceTask, MaintenanceTaskStatus } from './maintenance.data';
import { cn } from '@/lib/utils';

const ENTITY_ICON = { truck: Truck, trailer: Car, both: Layers, none: Layers } as const;

/** What an asset’s row amounts to, for the chips above the list. */
type AssetState = 'overdue' | 'due' | 'upcoming' | 'untracked';

const ASSET_FILTERS: { id: AssetState | 'all'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'due', label: 'Due' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'untracked', label: 'Not tracking' },
];

/**
 * How to band the list.
 *
 * "By clock" is the one this screen could not answer before: on a rule that runs on
 * miles AND hours AND days, which assets are being decided by which is the question you
 * open it with, and reading it off every row one at a time is not an answer.
 */
type AssetGroupBy = 'none' | 'status' | 'clock' | 'driver' | 'kind';

const ASSET_GROUPS: { id: AssetGroupBy; label: string }[] = [
    { id: 'none', label: 'Group by' },
    { id: 'status', label: 'Status' },
    { id: 'clock', label: 'Clock' },
    { id: 'driver', label: 'Driver' },
    { id: 'kind', label: 'Truck / trailer' },
];

const STATE_BAND: Record<AssetState, { rank: number; label: string }> = {
    overdue: { rank: 0, label: 'Overdue' },
    due: { rank: 1, label: 'Due' },
    upcoming: { rank: 2, label: 'Upcoming' },
    untracked: { rank: 3, label: 'Not tracking' },
};

const STATUS_TONE: Record<MaintenanceTaskStatus, string> = {
    overdue: 'border-red-200 bg-red-50 text-red-700',
    due: 'border-amber-200 bg-amber-50 text-amber-700',
    upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
    in_progress: 'border-violet-200 bg-violet-50 text-violet-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
};

function StatusPill({ status }: { status: MaintenanceTaskStatus }) {
    return (
        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', STATUS_TONE[status])}>
            {status.replace('_', ' ')}
        </span>
    );
}

/** One figure, named. Five of them say how a rule’s work is going at a glance. */
function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
            <div className={cn('text-xl font-black tabular-nums leading-none', value === 0 ? 'text-slate-300' : tone)}>{value}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        </div>
    );
}

function Stat({ label, children, Icon }: { label: string; children: React.ReactNode; Icon: React.ElementType }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon size={15} />
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{children}</div>
        </div>
    );
}

/** What the task is counting down to, in the unit its own rule runs on. */
function dueText(task: MaintenanceTask, currentOdometer?: number) {
    const r = task.dueRule;
    if (!r) return { main: 'By hand', sub: 'No clock on this one' };
    if (r.unit === 'miles') {
        const remaining = Math.max(0, (r.dueAtOdometer ?? 0) - (currentOdometer ?? 0));
        return {
            main: `${r.dueAtOdometer?.toLocaleString()} mi`,
            sub: task.status === 'completed' || task.status === 'cancelled'
                ? undefined
                : `${remaining.toLocaleString()} mi remaining`,
        };
    }
    if (r.unit === 'engine_hours') {
        return { main: `${r.dueAtEngineHours?.toLocaleString()} h`, sub: `every ${r.frequencyEvery.toLocaleString()} h` };
    }
    return {
        main: r.dueAtDate ? new Date(r.dueAtDate).toLocaleDateString() : '—',
        sub: `every ${r.frequencyEvery} days`,
    };
}

export function ServiceIntervalDetailPage({
    row, tasks, assetLabel, assetInfo, fleet, onAddAssets, onSetTracking, onRemoveAsset,
    serviceName, orderLabel, openOrderOf, onBack, onEdit, onDelete, onCreateOrder, onOpenAsset,
}: {
    row: ServiceIntervalRow;
    /** The rule's own tasks, in whatever order the page holds them. */
    tasks: MaintenanceTask[];
    assetLabel: (id: string) => string;
    /** Everything about one asset the list shows — read from the fleet, not guessed. */
    assetInfo: (id: string) => IntervalAssetInfo;
    /** Every asset this carrier runs, for putting more on the rule. */
    fleet: IntervalAssetInfo[];
    onAddAssets: (assetIds: string[]) => void;
    /** Switch the rule on or off for one asset; switching on says when it was last done. */
    onSetTracking: (assetId: string, enabled: boolean, last?: LastService) => void;
    /** Take one asset off the rule altogether. */
    onRemoveAsset: (assetId: string) => void;
    serviceName: (id: string) => string;
    /** The work order a task is already on, if any. */
    orderLabel: (taskId: string) => string | undefined;
    /**
     * The order a job is on while that order is still running.
     *
     * Different from `orderLabel`, which names whatever order a task has ever been on.
     * This one is the lock: work already with a shop is not offered for another order,
     * and comes back only once that one is completed — at which point the completion has
     * raised the next service, and that is what the next order covers.
     */
    openOrderOf?: (taskId: string) => string | undefined;
    /*
     * The orders and the record this rule has produced.
     *
     * Still accepted, because the owner has them and the shapes have not changed, and
     * still not rendered here: both are a unit's business and both are on the unit's own
     * page, one click away through the Assets list. Dropping them from the signature
     * would only mean putting them back the first time this page wants a count.
     */
    workOrders?: WorkOrderRow[];
    onOpenOrder?: (orderId: string) => void;
    history?: ServiceEvent[];
    onOpenHistory?: (eventId: string) => void;
    onEditHistory?: (eventId: string) => void;
    onShareHistory?: (eventId: string) => void;
    orderActions?: (order: WorkOrderRow) => React.ReactNode;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCreateOrder: (taskIds: string[]) => void;
    /**
     * Open one unit ON this rule.
     *
     * The pair page — this interval as it stands on that truck: its countdowns, every
     * service ever filed against it, and the work raised for it. That is where the two
     * tabs this page used to carry actually belong, because both of them are questions
     * about a unit and neither can be answered for seventeen at once.
     */
    onOpenAsset?: (assetId: string) => void;
}) {
    /*
     * Three tabs.
     *
     * Work orders and history were both answers to "what has happened", asked of a rule
     * that spans seventeen trucks — so both read as a blur of other units' business, and
     * neither could be acted on from here: an order covers ONE unit, and a service record
     * belongs to one unit's history. Both live on the unit, one click away through the
     * Assets list. What is left here is what only the rule can answer: what it asks for,
     * who is on it, and where each of them stands.
     */
    type Tab = 'overview' | 'assets' | 'activity';
    const [tab, setTab] = useState<Tab>('overview');
    const [sharing, setSharing] = useState(false);
    const EntityIcon = ENTITY_ICON[row.entity];
    const clocks = intervalText(row.intervals);

    // Worst first: what is overdue is what you opened this page to find.
    const ordered = useMemo(() => {
        const rank: Record<MaintenanceTaskStatus, number> = {
            overdue: 0, due: 1, in_progress: 2, upcoming: 3, completed: 4, cancelled: 5,
        };
        return [...tasks].sort((a, b) => rank[a.status] - rank[b.status]
            || assetLabel(a.assetId).localeCompare(assetLabel(b.assetId)));
    }, [tasks, assetLabel]);

    const outstanding = ordered.filter((t) => t.status !== 'completed' && t.status !== 'cancelled');

    // ── The Assets tab ──────────────────────────────────────────────────────
    const [assetSearch, setAssetSearch] = useState('');
    const [assetFilter, setAssetFilter] = useState<AssetState | 'all'>('all');
    const [groupBy, setGroupBy] = useState<AssetGroupBy>('none');
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [adding, setAdding] = useState(false);
    /** The asset whose countdown we are about to start, and the reading it starts from. */
    const [starting, setStarting] = useState<IntervalAssetInfo | null>(null);
    /** The asset whose last-service reading is being corrected, rather than first given. */
    const [editingAsset, setEditingAsset] = useState<IntervalAssetInfo | null>(null);
    /** The asset being shared out of the list. */
    const [sharingAsset, setSharingAsset] = useState<IntervalAssetInfo | null>(null);
    /** The asset about to be taken off the rule — asked first, because its task goes too. */
    const [removing, setRemoving] = useState<IntervalAssetInfo | null>(null);

    /**
     * One row per ASSET, not per task.
     *
     * A truck can be on the rule without a task against it — it is enrolled but not yet
     * switched on, because nobody has said when it was last serviced. Keying the list on
     * tasks hid exactly those, which are the rows somebody has to act on.
     */
    const assetRows = useMemo(() => {
        const rank: Record<MaintenanceTaskStatus, number> = {
            overdue: 0, due: 1, in_progress: 2, upcoming: 3, completed: 4, cancelled: 5,
        };
        return row.assetIds.map((id) => {
            const info = assetInfo(id);
            const mine = tasks.filter((t) => t.assetId === id);
            const open = mine.find((t) => t.status !== 'completed' && t.status !== 'cancelled');
            const task = open ?? [...mine].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
            const enrolled = row.enrollment[id];
            // No enrolment record means the rule came with its tasks already running.
            const tracking = enrolled ? enrolled.enabled : !!open;
            // Every clock the rule runs, counted from this asset’s own last service. A rule
            // on miles AND hours AND days falls due on whichever comes first, which is a
            // thing no single due figure on the task could say.
            const clocks = tracking ? projectClocks(row.intervals, enrolled, info.meter) : [];
            const soonest = soonestClock(clocks);
            const liveStatus = statusFromClocks(clocks);
            // What this row amounts to, said once, so the chips, the bands and the pill
            // can never disagree about it.
            const state: AssetState = !tracking ? 'untracked'
                : liveStatus ?? (open?.status === 'overdue' || open?.status === 'due'
                    ? open.status : 'upcoming');
            // The order this job is already with, if it is with one. A row like that is
            // not orderable: the work is in hand, and a second order for it is a second
            // invoice for one job.
            const onOrder = open ? openOrderOf?.(open.id) : undefined;
            return { info, task, open, enrolled, tracking, clocks, soonest, liveStatus, state, onOrder };
        }).sort((a, b) =>
            Number(b.tracking) - Number(a.tracking)
            || rank[a.open?.status ?? 'completed'] - rank[b.open?.status ?? 'completed']
            || a.info.label.localeCompare(b.info.label));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row.assetIds, row.enrollment, tasks, assetInfo, openOrderOf]);

    const visibleAssets = useMemo(() => {
        const q = assetSearch.trim().toLowerCase();
        return assetRows.filter((r) => {
            if (assetFilter !== 'all' && r.state !== assetFilter) return false;
            if (!q) return true;
            return r.info.label.toLowerCase().includes(q)
                || (r.info.description ?? '').toLowerCase().includes(q)
                || (r.info.driver ?? '').toLowerCase().includes(q);
        });
    }, [assetRows, assetSearch, assetFilter]);

    /** How many rows each chip would show — a chip that hides nothing says so. */
    const stateCounts = useMemo(() => {
        const out: Record<string, number> = { all: assetRows.length };
        for (const r of assetRows) out[r.state] = (out[r.state] ?? 0) + 1;
        return out;
    }, [assetRows]);

    /** Which band a row falls in, and where that band sits. */
    const bandOf = (r: typeof assetRows[number]): { rank: number; label: string } => {
        if (groupBy === 'status') return STATE_BAND[r.state];
        if (groupBy === 'clock') {
            return r.soonest
                ? { rank: r.soonest.unit === 'miles' ? 0 : r.soonest.unit === 'engine_hours' ? 1 : 2, label: `By ${r.soonest.label.toLowerCase()}` }
                : { rank: 3, label: 'No clock yet' };
        }
        if (groupBy === 'driver') {
            return r.info.driver ? { rank: 0, label: r.info.driver } : { rank: 1, label: 'No driver assigned' };
        }
        return r.info.kind === 'truck' ? { rank: 0, label: 'Trucks' } : { rank: 1, label: 'Trailers' };
    };

    const bandedAssets = useMemo(() => {
        if (groupBy === 'none') return visibleAssets;
        return [...visibleAssets].sort((a, b) => {
            const ba = bandOf(a), bb = bandOf(b);
            return ba.rank - bb.rank || ba.label.localeCompare(bb.label);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleAssets, groupBy]);

    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === 'none') return m;
        for (const r of bandedAssets) {
            const label = bandOf(r).label;
            m.set(label, (m.get(label) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bandedAssets, groupBy]);

    // Narrowing the list moves what is on page three to page one.
    useEffect(() => { setPage(0); }, [assetSearch, assetFilter, groupBy, row.id]);

    const pagedAssets = bandedAssets.slice(page * perPage, page * perPage + perPage);

    const trackingCount = assetRows.filter((r) => r.tracking).length;

    /** The three clocks as figures, for the cards over the list. */
    const figures = {
        mileage: row.intervals?.mileage
            ? `${row.intervals.mileage.every.toLocaleString()} ${row.intervals.mileage.unit === 'km' ? 'km' : 'mi'}`
            : undefined,
        hours: row.intervals?.engineHours ? `${row.intervals.engineHours.every.toLocaleString()} h` : undefined,
        days: row.intervals?.days ? `${row.intervals.days.every.toLocaleString()} d` : undefined,
    };

    /**
     * What has happened to this rule, newest first.
     *
     * Derived from the tasks rather than kept as its own log: a trail that can disagree
     * with the records it describes is worse than no trail. Each task contributes when it
     * was raised, and what became of it.
     */
    const activity: ActivityEntry[] = useMemo(() => {
        const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }) : '—');
        const out: ActivityEntry[] = [];

        for (const t of tasks) {
            const unit = assetLabel(t.assetId);
            out.push({
                id: `${t.id}-made`,
                icon: FilePlus2,
                iconTone: 'bg-blue-500',
                title: `Task raised for ${unit}`,
                detail: t.dueRule
                    ? `Due at ${dueText(t, assetInfo(t.assetId).meter.odometer).main}`
                    : 'No clock — scheduled by hand',
                at: when(t.createdAt),
                sort: t.createdAt,
            } as ActivityEntry & { sort?: string });

            if (t.status === 'completed') {
                out.push({
                    id: `${t.id}-done`, icon: CheckCircle2, iconTone: 'bg-emerald-500',
                    title: `Completed on ${unit}`,
                    detail: t.serviceTypeIds.map(serviceName).join(', '),
                    at: when(t.meterSnapshot?.capturedAt), sort: t.meterSnapshot?.capturedAt,
                } as ActivityEntry & { sort?: string });
            }
            if (t.status === 'cancelled') {
                out.push({
                    id: `${t.id}-cancelled`, icon: Ban, iconTone: 'bg-slate-500',
                    title: `Cancelled on ${unit}`,
                    detail: t.cancelDetails?.reason,
                    by: t.cancelDetails?.cancelledBy,
                    at: when(t.cancelDetails?.cancelledAt ?? t.createdAt),
                    sort: t.cancelDetails?.cancelledAt ?? t.createdAt,
                } as ActivityEntry & { sort?: string });
            }
            if (t.status === 'overdue') {
                out.push({
                    id: `${t.id}-overdue`, icon: TriangleAlert, iconTone: 'bg-red-500',
                    title: `Overdue on ${unit}`,
                    detail: dueText(t, assetInfo(t.assetId).meter.odometer).sub,
                    at: when(t.meterSnapshot?.capturedAt), sort: t.meterSnapshot?.capturedAt,
                } as ActivityEntry & { sort?: string });
            }
            const order = orderLabel(t.id);
            if (order) {
                out.push({
                    id: `${t.id}-order`, icon: Wrench, iconTone: 'bg-violet-500',
                    title: `On work order ${order}`,
                    detail: `${unit} · ${t.serviceTypeIds.map(serviceName).join(', ')}`,
                    at: when(t.meterSnapshot?.capturedAt), sort: t.meterSnapshot?.capturedAt,
                } as ActivityEntry & { sort?: string });
            }
        }

        return out.sort((a, b) => String((b as any).sort ?? '').localeCompare(String((a as any).sort ?? '')));
    }, [tasks, assetLabel, assetInfo, serviceName, orderLabel]);

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                    <ArrowLeft size={15} /> Service intervals
                </button>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <RowIcon Icon={CalendarClock} tone={row.counts.overdue > 0 ? 'amber' : 'blue'} />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{row.name}</h1>
                                {tierOf(row.tier) && (
                                    <span className={cn(
                                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                        tierOf(row.tier)!.pill,
                                    )}>
                                        {tierOf(row.tier)!.label}
                                    </span>
                                )}
                                {row.system && (
                                    <span
                                        className="inline-flex items-center rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
                                        title="Comes with the system. Enrol or switch off units on it; it cannot be deleted."
                                    >
                                        System
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 text-[13px] text-slate-500">
                                {isIntervalActive(row) ? 'Running' : 'Nothing outstanding'}
                                {row.derivedName && ' · named after its services'}
                                {' · '}{row.counts.total} task{row.counts.total === 1 ? '' : 's'} so far
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            <Pencil size={15} /> Edit
                        </button>
                        <button
                            type="button"
                            onClick={() => setSharing(true)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            <Share2 size={15} /> Share
                        </button>
                        {/* No "Create work order" up here.
                            A work order covers one unit, and this button covered every
                            outstanding one on the rule — seventeen trucks into a single
                            order, which is the thing the order form was rebuilt to stop.
                            Raising one is a row action on the unit it is for. */}
                        {/* Not offered on a tier that came with the system. PM-A through PM-D
                            are what every other maintenance document is written against; a
                            carrier takes units off one, it does not take the tier away. */}
                        {!row.system && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                                <Trash2 size={15} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* The same strip a driver’s profile and an asset’s record wear. */}
            <ProfileTabs
                ariaLabel="Service interval sections"
                activeId={tab}
                onChange={setTab}
                className="shrink-0"
                tabs={[
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    { id: 'assets', label: 'Assets', icon: Truck, count: row.assetIds.length },
                    { id: 'activity', label: 'Activity', icon: ActivityIcon, count: activity.length },
                ]}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6">
                    {/* ── Overview ── what the rule says, and how its work is going. */}
                    {tab === 'overview' && (<>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="Every" Icon={clocks.length ? Gauge : CalendarDays}>
                            {clocks.length === 0 ? <span className="text-slate-400">By hand</span> : (
                                <div className="flex flex-wrap gap-1">
                                    {clocks.map((c) => (
                                        <span key={c} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">{c}</span>
                                    ))}
                                </div>
                            )}
                        </Stat>
                        <Stat label="Applies To" Icon={EntityIcon}>{ENTITY_LABEL[row.entity]}</Stat>
                        <Stat label="Assets" Icon={Truck}>
                            {row.applyToAll ? 'All eligible' : `${row.assetIds.length}`}
                        </Stat>
                        <Stat label="Services" Icon={ListChecks}>
                            <div className="flex flex-wrap gap-1">
                                {row.serviceTypeIds.map((id) => (
                                    <span key={id} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                        {serviceName(id)}
                                    </span>
                                ))}
                            </div>
                        </Stat>
                    </div>

                    {/* Where its work stands. The same five numbers the list row shows as
                        pills, with the one that matters spelled out: a rule is a problem
                        when something it asked for has been ignored. */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900">Where its work stands</h2>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                            <Count label="Overdue" value={row.counts.overdue} tone="text-red-600" />
                            <Count label="Due" value={row.counts.due} tone="text-amber-600" />
                            <Count label="Upcoming" value={row.counts.upcoming} tone="text-blue-600" />
                            <Count label="Completed" value={row.counts.completed} tone="text-emerald-600" />
                            <Count label="Cancelled" value={row.counts.cancelled} tone="text-slate-500" />
                        </div>
                        <p className="mt-4 border-t border-slate-100 pt-3 text-[13px] text-slate-600">
                            {row.counts.overdue > 0 ? (
                                <>
                                    <span className="font-semibold text-slate-900">{row.counts.overdue}</span>
                                    {' '}of its {row.counts.total} task{row.counts.total === 1 ? '' : 's'} {row.counts.overdue === 1 ? 'has' : 'have'} gone past
                                    what this rule asked for. The Assets tab says which.
                                </>
                            ) : outstanding.length > 0 ? (
                                <>Nothing is overdue. {outstanding.length} task{outstanding.length === 1 ? '' : 's'} still outstanding.</>
                            ) : (
                                <>Nothing outstanding — every task this rule has raised is closed.</>
                            )}
                        </p>
                    </div>
                    </>)}

                    {/* ── Assets ── one row per asset. This is the working list: which units
                        the rule counts, from what reading, and how far each has to go. */}
                    {tab === 'assets' && (
                    <div className="space-y-5">
                        {/* The rule’s three clocks, as the figures they are. A rule that goes by
                            days and a rule that goes by miles ask a different question of every
                            asset below, and these cards say which are being asked. */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <KpiTile
                                label="Interval by mileage"
                                value={figures.mileage ?? '—'}
                                Icon={Gauge}
                                accent={figures.mileage ? 'blue' : 'slate'}
                            />
                            <KpiTile
                                label="Interval by engine hours"
                                value={figures.hours ?? '—'}
                                Icon={Clock}
                                accent={figures.hours ? 'violet' : 'slate'}
                            />
                            <KpiTile
                                label="Interval by days"
                                value={figures.days ?? '—'}
                                Icon={CalendarDays}
                                accent={figures.days ? 'emerald' : 'slate'}
                            />
                        </div>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">Assets on this interval</h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {trackingCount} of {assetRows.length} tracking
                                        {trackingCount < assetRows.length && ' · switch one on to say when it was last serviced'}
                                    </p>
                                </div>
                                {/* No tick boxes and no bulk order. They existed to put
                                    several units on one work order, and an order covers one
                                    unit now — so the only thing a tick could do was gather a
                                    selection nothing would accept. The row is a link to the
                                    unit instead, which is what people were clicking anyway. */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative">
                                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={assetSearch}
                                            onChange={(e) => setAssetSearch(e.target.value)}
                                            placeholder="Search assets"
                                            className="h-9 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-56"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setAdding(true)}
                                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                                    >
                                        <Plus size={15} /> Add asset
                                    </button>
                                </div>
                            </div>

                            {/* How the list is narrowed and banded, on a row of its own — the same
                                chips-left, group-right line the Inventory list wears. */}
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/40 px-5 py-2">
                                {ASSET_FILTERS.map((f) => (
                                    <FilterChip
                                        key={f.id}
                                        label={f.label}
                                        count={stateCounts[f.id] ?? 0}
                                        on={assetFilter === f.id}
                                        always={f.id === 'all'}
                                        onClick={() => setAssetFilter(f.id)}
                                    />
                                ))}
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as AssetGroupBy)}
                                    title="Band the list"
                                    className={cn(
                                        'ml-auto h-8 shrink-0 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500',
                                        groupBy === 'none'
                                            ? 'border-slate-200 bg-white text-slate-600'
                                            : 'border-blue-300 bg-blue-50/60 text-blue-700',
                                    )}
                                >
                                    {ASSET_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                                </select>
                                <ResetFilters
                                    on={assetFilter !== 'all' || groupBy !== 'none' || assetSearch.trim() !== ''}
                                    onReset={() => { setAssetFilter('all'); setGroupBy('none'); setAssetSearch(''); }}
                                />
                            </div>

                            <div className="border-t border-slate-100">
                                <div className="overflow-x-auto">
                                    {/* Wide enough that every cell fits on its own line. Squeezed into a
                                        laptop’s width, "BY ENGINE HOURS" wrapped to three lines and a
                                        row stood five lines tall for one asset. */}
                                    <table className="w-full min-w-[1180px]">
                                        <thead>
                                            <tr>
                                                <TH>Asset</TH>
                                                <TH className={COL_RULE}>Driver</TH>
                                                <TH className={COL_RULE}>Last performed date</TH>
                                                <TH className={COL_RULE}>Odometer</TH>
                                                <TH className={COL_RULE}>Due At</TH>
                                                <TH className={COL_RULE}>Due In</TH>
                                                <TH className={COL_RULE}>Work Order</TH>
                                                <TH className={COL_RULE}>Status</TH>
                                                <TH className={COL_RULE}>Tracking</TH>
                                                <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pagedAssets.length === 0 && (
                                                <EmptyRow
                                                    colSpan={10}
                                                    Icon={Truck}
                                                    title={assetRows.length === 0 ? 'No assets on this interval yet' : 'No asset matches this view'}
                                                    hint={assetRows.length === 0
                                                        ? 'Add one, then switch it on to start its countdown.'
                                                        : undefined}
                                                    onClear={assetRows.length === 0 ? undefined : () => {
                                                        setAssetFilter('all'); setGroupBy('none'); setAssetSearch('');
                                                    }}
                                                />
                                            )}
                                            {pagedAssets.map((assetRow, i) => {
                                                const { info, task, open, enrolled, tracking, clocks, soonest, liveStatus, onOrder } = assetRow;
                                                // The band only announces itself where it changes.
                                                const band = groupBy === 'none' ? null : bandOf(assetRow);
                                                const prevBand = i === 0 || groupBy === 'none' ? null : bandOf(pagedAssets[i - 1]);
                                                // What the rule's own clocks say, where they have been given a
                                                // starting point; otherwise whatever the task itself carries.
                                                const due = soonest
                                                    ? { main: soonest.dueText, by: soonest.label }
                                                    : open ? { main: dueText(open, info.meter.odometer).main, by: undefined }
                                                        : undefined;
                                                const left = soonest
                                                    ? { text: soonest.remainingText, over: soonest.over }
                                                    : open && tracking
                                                        ? remainingText(remainingFor(open.dueRule, info.meter))
                                                        : undefined;
                                                const others = soonest ? clocks.filter((c) => c !== soonest) : [];
                                                const order = open ? orderLabel(open.id) : undefined;
                                                return (
                                                    <Fragment key={info.id}>
                                                    {band && (!prevBand || prevBand.label !== band.label) && (
                                                        <TableGroupBand label={band.label} count={bandCounts.get(band.label) ?? 0} colSpan={10} />
                                                    )}
                                                    {/* One click opens this unit ON this rule: its
                                                        countdowns, its record and the work raised
                                                        against it. The cells that do something of
                                                        their own stop the click; everything else is
                                                        the way in. */}
                                                    <tr
                                                        onClick={onOpenAsset ? () => onOpenAsset(info.id) : undefined}
                                                        onKeyDown={onOpenAsset
                                                            ? (ev) => { if (ev.key === 'Enter') onOpenAsset(info.id); } : undefined}
                                                        tabIndex={onOpenAsset ? 0 : undefined}
                                                        role={onOpenAsset ? 'link' : undefined}
                                                        className={cn(
                                                            'transition-colors hover:bg-slate-50/60',
                                                            !tracking && 'bg-slate-50/40',
                                                            onOpenAsset && 'cursor-pointer focus:bg-slate-50 focus:outline-none',
                                                        )}
                                                    >
                                                        <TD>
                                                            <div className="flex items-center gap-3">
                                                                <RowIcon Icon={info.kind === 'truck' ? Truck : Car} tone={tracking ? 'blue' : 'slate'} />
                                                                <div className="min-w-0">
                                                                    <div className={cn('truncate font-semibold leading-tight', tracking ? 'text-slate-900' : 'text-slate-500')}>{info.label}</div>
                                                                    <p className="truncate text-xs leading-tight text-slate-500">
                                                                        {info.kind === 'truck' ? 'Truck' : 'Trailer'}
                                                                        {info.description ? ` · ${info.description}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            {info.driver ? (
                                                                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-slate-700">
                                                                    <UserRound size={13} className="text-slate-400" /> {info.driver}
                                                                </span>
                                                            ) : <span className="text-sm text-slate-300">—</span>}
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            <LastPerformedCell enrolled={enrolled} task={task} />
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            <LastReadingCell enrolled={enrolled} task={task} intervals={row.intervals} />
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            {due ? (<>
                                                                <div className="whitespace-nowrap font-medium leading-tight tabular-nums text-slate-900">{due.main}</div>
                                                                {/* Which of the three got there first, and where the others
                                                                    stand — the whole point of a rule on more than one clock,
                                                                    kept to one quiet line so a row stays a row. */}
                                                                {(due.by || others.length > 0) && (
                                                                    <p className="mt-0.5 whitespace-nowrap text-[11px] leading-tight text-slate-400">
                                                                        {due.by && <span className="font-semibold uppercase tracking-wide">by {due.by}</span>}
                                                                        {due.by && others.length > 0 && ' · '}
                                                                        {others.length > 0 && `then ${others.map((c) => c.dueText).join(' · ')}`}
                                                                    </p>
                                                                )}
                                                            </>) : <span className="text-sm text-slate-300">—</span>}
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            {left ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className={cn(
                                                                        'inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
                                                                        left.over ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700',
                                                                    )}>{left.text}</span>
                                                                    {/* Against the figure it warns about — beside the switch it read
                                                                        as a second one of it. */}
                                                                    {enrolled?.reminders?.enabled && (
                                                                        <Bell size={12} className="shrink-0 text-blue-500" aria-label="You will be reminded before this" />
                                                                    )}
                                                                </div>
                                                            ) : <span className="text-sm text-slate-300">—</span>}
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            {order
                                                                ? <span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">{order}</span>
                                                                : <span className="text-sm text-slate-400">—</span>}
                                                        </TD>
                                                        <TD className={COL_RULE}>
                                                            {!tracking
                                                                ? <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Not tracking</span>
                                                                : (liveStatus ?? open?.status) ? <StatusPill status={(liveStatus ?? open!.status) as MaintenanceTaskStatus} />
                                                                    : <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Up to date</span>}
                                                        </TD>
                                                        <TD className={COL_RULE} onClick={(ev) => ev.stopPropagation()}>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn('text-xs font-semibold', tracking ? 'text-slate-600' : 'text-slate-400')}>
                                                                    {tracking ? 'On' : 'Off'}
                                                                </span>
                                                                <Switch
                                                                    checked={tracking}
                                                                    onCheckedChange={(next) => {
                                                                        // Switching ON is the question "when was this last done",
                                                                        // so it opens the form that asks it.
                                                                        if (next) setStarting(info);
                                                                        else onSetTracking(info.id, false);
                                                                    }}
                                                                />
                                                            </div>
                                                        </TD>
                                                        <TD className={cn(COL_RULE, 'text-right')} onClick={(ev) => ev.stopPropagation()}>
                                                          <div className="flex items-center justify-end gap-1">
                                                            <RowButton
                                                                Icon={Briefcase}
                                                                label="Create work order"
                                                                tone="blue"
                                                                disabled={!!onOrder || !open}
                                                                title={onOrder
                                                                    ? `Already on ${onOrder} — complete that order first`
                                                                    : !open ? 'Nothing outstanding on this unit' : undefined}
                                                                onClick={() => open && onCreateOrder([open.id])}
                                                            />
                                                            <KebabMenu
                                                                className="justify-end"
                                                                title={`Actions for ${info.label}`}
                                                                items={[
                                                                    {
                                                                        label: 'Edit last service',
                                                                        icon: SlidersHorizontal,
                                                                        onClick: () => setEditingAsset(info),
                                                                    },
                                                                    {
                                                                        label: 'Share to chat',
                                                                        icon: Share2,
                                                                        onClick: () => setSharingAsset(info),
                                                                    },
                                                                    {
                                                                        label: 'Remove from interval',
                                                                        icon: MinusCircle,
                                                                        danger: true,
                                                                        onClick: () => setRemoving(info),
                                                                    },
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
                                total={bandedAssets.length}
                                label="assets"
                                onPage={setPage}
                                onPerPage={(n) => { setPerPage(n); setPage(0); }}
                            />
                        </div>
                    </div>
                    )}

                    {/* No Work Orders or History panel: both are a unit's business, and
                        the Assets list above is the way to the unit. A rule spanning
                        seventeen trucks showed forty-two services belonging to units you
                        were not looking at, with no way to act on any of them. */}

                    {tab === 'activity' && (
                        <ActivityTimeline
                            heading="Activity"
                            entries={activity}
                            emptyText="Nothing has happened on this interval yet."
                        />
                    )}
                </div>
            </div>

            {adding && (
                <AddAssetsDialog
                    fleet={fleet}
                    already={new Set(row.assetIds)}
                    entity={row.entity}
                    onClose={() => setAdding(false)}
                    onAdd={(ids) => { onAddAssets(ids); setAdding(false); }}
                />
            )}

            {starting && (
                <StartTrackingDialog
                    asset={starting}
                    intervals={row.intervals}
                    onClose={() => setStarting(null)}
                    onConfirm={(last) => { onSetTracking(starting.id, true, last); setStarting(null); }}
                />
            )}

            {/* The same form, over a reading that already exists: correcting what the last
                service read is the one edit this list needs, and it re-counts from there. */}
            {editingAsset && (
                <StartTrackingDialog
                    asset={editingAsset}
                    intervals={row.intervals}
                    enrolled={row.enrollment[editingAsset.id]}
                    editing
                    onClose={() => setEditingAsset(null)}
                    onConfirm={(last) => { onSetTracking(editingAsset.id, true, last); setEditingAsset(null); }}
                />
            )}

            {removing && (
                <Dialog open onOpenChange={(o) => { if (!o) setRemoving(null); }}>
                    <DialogContent className="sm:max-w-[420px]">
                        <DialogHeader>
                            <DialogTitle>Remove {removing.label} from this interval?</DialogTitle>
                            <DialogDescription>
                                It stops being counted and its outstanding task is dropped. Work it has
                                already had stays on the record.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <button
                                type="button"
                                onClick={() => setRemoving(null)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => { onRemoveAsset(removing.id); setRemoving(null); }}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
                            >
                                Remove asset
                            </button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {sharingAsset && (
                <ShareToChat
                    open
                    onClose={() => setSharingAsset(null)}
                    title={`Share ${sharingAsset.label}`}
                    subtitle={`${row.name} · one asset on this interval`}
                    source={{ type: 'manual', id: `${row.id}:${sharingAsset.id}`, label: `${row.name} · ${sharingAsset.label}` }}
                    items={[
                        { name: sharingAsset.description ? `${sharingAsset.label} · ${sharingAsset.description}` : sharingAsset.label, group: 'Asset' },
                        ...(sharingAsset.driver ? [{ name: sharingAsset.driver, group: 'Driver' }] : []),
                        { name: row.serviceTypeIds.map(serviceName).join(', '), group: 'Services' },
                        { name: clocks.join(' · ') || 'Scheduled by hand', group: 'Every' },
                        ...(() => {
                            const mine = assetRows.find((r) => r.info.id === sharingAsset.id);
                            const due = mine?.open ? dueText(mine.open, sharingAsset.meter.odometer) : undefined;
                            const left = mine?.open ? remainingText(remainingFor(mine.open.dueRule, sharingAsset.meter)) : undefined;
                            return [
                                ...(due ? [{ name: due.main, group: 'Due at' }] : []),
                                ...(left ? [{ name: left.text, group: 'Due in' }] : []),
                            ];
                        })(),
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${sharingAsset.label} · ${row.name}`}
                />
            )}

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(false)}
                    title={`Share ${row.name}`}
                    subtitle="A service interval, in a chat or by email"
                    source={{ type: 'manual', id: row.id, label: row.name }}
                    items={[
                        { name: row.serviceTypeIds.map(serviceName).join(', '), group: 'Services' },
                        { name: clocks.join(' · ') || 'Scheduled by hand', group: 'Every' },
                        { name: ENTITY_LABEL[row.entity], group: 'Applies to' },
                        { name: row.applyToAll ? 'All eligible assets' : `${row.assetIds.length} assets`, group: 'Assets' },
                        ...(row.counts.overdue > 0 ? [{ name: `${row.counts.overdue} overdue`, group: 'Needs attention' }] : []),
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${row.name} — service interval`}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// What an asset’s last service reads
//
// In whichever clocks the rule runs on, and nothing else: a rule that goes by days has
// no business showing an odometer. The reading somebody typed when they switched the
// asset on wins; failing that, the meter taken when its current task was raised.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A date, read the way it was meant.
 *
 * "2026-04-02" on its own is parsed as UTC midnight, which is the day before anywhere
 * west of Greenwich — the list showed 1 Apr for a service done on the 2nd.
 */
const shortDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

/** When it was last done on this unit. */
function LastPerformedCell({ enrolled, task }: {
    enrolled?: { lastServiceDate?: string };
    task?: MaintenanceTask;
}) {
    const iso = enrolled?.lastServiceDate ?? task?.meterSnapshot?.capturedAt;
    return iso
        ? <div className="whitespace-nowrap text-[13px] tabular-nums text-slate-700">{shortDate(iso)}</div>
        : <span className="text-sm text-slate-300">Not recorded</span>;
}

/** What the meters read when it was done — what the other two clocks count from. */
function LastReadingCell({ enrolled, task, intervals }: {
    enrolled?: { lastOdometer?: number; lastEngineHours?: number; lastServiceDate?: string };
    task?: MaintenanceTask;
    intervals?: ServiceIntervals;
}) {
    const lines: { label: string; value: string }[] = [];

    if (intervals?.mileage) {
        const unit = intervals.mileage.unit === 'km' ? 'km' : 'mi';
        const typed = enrolled?.lastOdometer;
        const fromTask = task?.meterSnapshot?.odometer;
        const value = typed != null ? typed
            : fromTask != null ? (unit === 'km' ? Math.round(fromTask / 0.621371) : fromTask)
                : undefined;
        if (value != null) lines.push({ label: 'Odometer', value: `${value.toLocaleString()} ${unit}` });
    }
    if (intervals?.engineHours) {
        const value = enrolled?.lastEngineHours ?? task?.meterSnapshot?.engineHours;
        if (value != null) lines.push({ label: 'Engine hours', value: `${value.toLocaleString()} h` });
    }
    // A rule on days alone has no reading to show, and says so rather than borrowing
    // the date from the column beside it.

    if (!lines.length) return <span className="text-sm text-slate-300">—</span>;
    // One line, not one per clock: the cards above the list already say which clocks this
    // interval runs, and three labelled rows in every cell made a row five lines tall.
    return (
        <div
            className="whitespace-nowrap text-[13px] tabular-nums text-slate-700"
            title={lines.map((l) => `${l.label}: ${l.value}`).join(' · ')}
        >
            {lines.map((l, i) => (
                <span key={l.label}>
                    {i > 0 && <span className="mx-1.5 text-slate-300">·</span>}
                    {l.value}
                </span>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Putting assets on a rule
// ─────────────────────────────────────────────────────────────────────────────

function AddAssetsDialog({ fleet, already, entity, onClose, onAdd }: {
    fleet: IntervalAssetInfo[];
    already: Set<string>;
    entity: ServiceIntervalRow['entity'];
    onClose: () => void;
    onAdd: (ids: string[]) => void;
}) {
    const [query, setQuery] = useState('');
    const [picked, setPicked] = useState<string[]>([]);

    const options = useMemo(() => {
        const q = query.trim().toLowerCase();
        return fleet
            .filter((a) => !already.has(a.id))
            // A rule for trucks has no business offering trailers. One for both offers both.
            .filter((a) => entity === 'both' || entity === 'none' || !a.kind || a.kind === entity)
            .filter((a) => !q
                || a.label.toLowerCase().includes(q)
                || (a.description ?? '').toLowerCase().includes(q)
                || (a.driver ?? '').toLowerCase().includes(q));
    }, [fleet, already, entity, query]);

    const toggle = (id: string) =>
        setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>Add assets to this interval</DialogTitle>
                    <DialogDescription>
                        They go on un-counted. Switch one on in the list to say when it was last
                        serviced, and the countdown starts from there.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by unit, make or driver"
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>

                <div className="max-h-[320px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                    {options.length === 0 && (
                        <p className="p-8 text-center text-sm text-slate-500">
                            {query ? 'No asset matches that.' : 'Every eligible asset is already on this interval.'}
                        </p>
                    )}
                    {options.map((a) => {
                        const on = picked.includes(a.id);
                        return (
                            <button
                                key={a.id}
                                type="button"
                                onClick={() => toggle(a.id)}
                                className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50', on && 'bg-blue-50/60')}
                            >
                                <Checkbox checked={on} />
                                <RowIcon Icon={a.kind === 'truck' ? Truck : Car} tone="slate" />
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-slate-900">{a.label}</div>
                                    <p className="truncate text-xs text-slate-500">
                                        {a.kind === 'truck' ? 'Truck' : 'Trailer'}
                                        {a.description ? ` · ${a.description}` : ''}
                                        {a.driver ? ` · ${a.driver}` : ''}
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs tabular-nums text-slate-400">
                                    {a.meter.odometer ? `${a.meter.odometer.toLocaleString()} mi` : ''}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <DialogFooter>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={picked.length === 0}
                        onClick={() => onAdd(picked)}
                        className={cn(
                            'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors',
                            picked.length ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-300',
                        )}
                    >
                        {picked.length ? `Add ${picked.length} asset${picked.length === 1 ? '' : 's'}` : 'Add assets'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
