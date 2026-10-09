// ─────────────────────────────────────────────────────────────────────────────
// MaintenanceAssetPage — one truck, and everything maintenance asks of it.
//
// The rule's own page answers "which assets is this interval counting"; this answers the
// other half, which is the half a yard asks: what is this unit on, what does each of its
// rules want next, and which of them should be counting it at all.
//
// The switch is the point of the Service Interval tab. An interval covers an asset, but it
// only counts it once somebody has said when it was last done — so every rule is here
// with a switch, and turning one on asks that question.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
    ArrowLeft, Truck, Car, Gauge, Clock, Share2, Briefcase,
    LayoutGrid, Wrench, CalendarClock, UserRound,
    History as HistoryIcon,
    Activity as ActivityIcon,
} from 'lucide-react';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
// The one form that files a compliance record — shared with the Compliances tab, so the
// annual records are captured the same way wherever you happen to be standing.
import { VersionEditModal } from '@/pages/compliance/DefaultComplianceDataPage';
import type { DocVersion } from '@/pages/compliance/compliance-data-store';
import type { SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';
import type { AssetRecordKey } from './asset-records-bridge';
// The asset form’s own block, over the record on file — what the pencil opens.
import { AnnualRecordDialog } from './AnnualRecordDialog';
import { isAnnualSafetyInterval } from './asset-annual-records';
import { ShareToChat } from '@/components/share/ShareToChat';
import { ProfileTabs } from '@/components/ui/ProfileTabs';
import { RowIcon } from '@/components/ui/CatalogTable';
import {
    StartTrackingDialog, type IntervalAssetInfo, type LastService,
} from './LastServiceDialog';
import type { AssetIntervalLine, MaintenanceAssetRow } from './MaintenanceAssetsTable';
import type { AssetState } from './service-intervals';
import { type AnnualCapture } from './asset-annual-records';
import type { ServiceIntervals } from '@/types/service-types';
import { WorkOrdersTable, type WorkOrderRow } from '@/components/maintenance/WorkOrdersTable';
import { AssetIntervalsCard, StatePill, STATE_PILL_LABEL } from '@/components/maintenance/AssetIntervalsCard';
// What has actually been done to this unit, read off the one ledger.
import { ServiceHistoryTable } from '@/components/maintenance/ServiceHistoryTable';
import type { ServiceEvent } from './service-history';
import { cn } from '@/lib/utils';

/**
 * One work order this asset is on.
 *
 * The same row the module’s list and a rule’s page use — three screens asking "what has
 * been sent to a shop" is one question with a different filter in front of it.
 */
export type AssetWorkOrder = WorkOrderRow;

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

/** One tally on the standing card: the figure, and what it counts. */
function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className={cn('text-2xl font-bold tabular-nums', tone)}>{value}</div>
            <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
        </div>
    );
}

export function MaintenanceAssetPage({
    asset, row, activity = [], workOrders = [], history = [], onOpenHistory, onEditHistory, onShareHistory, onOpenOrder, orderActions, openOrderOf, annualRecordFor, annualVersionFor, onSaveAnnualVersion,
    intervalsOf, onBack, onOpenInterval, onOpenPair, initialTab, onCreateOrder, onSetTracking, onRemoveFromInterval,
}: {
    /** The fleet record, for the details card. */
    asset?: { vin?: string; plateNumber?: string; operationalStatus?: string; assetCategory?: string; assetType?: string };
    row: MaintenanceAssetRow;
    /** The two annual records the asset form captured, read back. */
    annual?: { safety?: AnnualCapture; pm?: AnnualCapture };
    /** What has happened to this asset, newest first — read off its records, not kept twice. */
    activity?: ActivityEntry[];
    /** The work orders this asset is on, newest first. */
    workOrders?: AssetWorkOrder[];
    /**
     * Open one.
     *
     * A row in a list of orders is a thing you go INTO — what was sent, to whom, what
     * came back and what it cost are a page, not a cell. It was reachable only from the
     * row menu, which is where you look for the things a row can DO, not for the row
     * itself.
     */
    onOpenOrder?: (orderId: string) => void;
    /**
     * Every service this unit has had, newest first.
     *
     * The same events the countdowns are measured from — a history that can disagree
     * with the figure above it is worse than no history.
     */
    history?: ServiceEvent[];
    /** Open one entry in the record — a row cannot hold what was done, by whom, for how much. */
    onOpenHistory?: (eventId: string) => void;
    /** Correct one entry, and share one. */
    onEditHistory?: (eventId: string) => void;
    onShareHistory?: (eventId: string) => void;
    /**
     * Done, not done, called off — decided by the page that owns the orders.
     *
     * The same control on every list that shows them, so an order is finished the same way
     * whether you reached it from the module, from the unit or from the rule.
     */
    orderActions?: (order: AssetWorkOrder) => React.ReactNode;
    /**
     * The live order a job is already on, if any.
     *
     * A row on an order that has not been closed out cannot be put on another one: the
     * work is already with a shop, and ordering it twice is two invoices for one job. It
     * comes back once that order is completed — by which time the completion has raised
     * the next service, and that is what the next order covers.
     */
    openOrderOf?: (taskId: string) => string | undefined;
    /** The catalog record behind each block, for the shared form. */
    annualRecordFor?: (key: AssetRecordKey) => SafetyRecord | undefined;
    /** The version the form opens on: the current one to edit, or a fresh one to add. */
    annualVersionFor?: (key: AssetRecordKey, mode: 'add' | 'edit') => DocVersion | null;
    /** File what the form captured. */
    onSaveAnnualVersion?: (key: AssetRecordKey, version: DocVersion, mode: 'add' | 'edit') => void;
    /** The clocks a rule runs, for the form that switches one on. */
    intervalsOf: (intervalId: string) => ServiceIntervals | undefined;
    onBack: () => void;
    onOpenInterval: (intervalId: string) => void;
    /**
     * This interval ON THIS UNIT — where it stands and everything it has already had.
     *
     * Different from onOpenInterval, which is the rule across the whole fleet. The row is
     * about one truck, so clicking it should not land somewhere listing eleven others; the
     * rule is still one click away from the page it opens.
     */
    onOpenPair?: (intervalId: string) => void;
    /**
     * Which tab to come back to.
     *
     * The page unmounts while an interval of its own is open, so without this, Back out
     * of that interval lands on Overview — a different screen from the one it was opened
     * from, which reads as the Back button having gone somewhere wrong.
     */
    initialTab?: 'overview' | 'maintenance' | 'orders' | 'history' | 'activity';
    /**
     * Raise an order. `rows` carries the jobs that have no task yet — an interval this
     * asset is on but has not been scheduled for is still work somebody can order.
     */
    onCreateOrder: (taskIds: string[], rows?: {
        assetId: string; intervalId?: string; name: string;
        serviceTypeIds: string[]; taskId?: string; status?: string;
    }[]) => void;
    onSetTracking: (intervalId: string, enabled: boolean, last?: LastService) => void;
    onRemoveFromInterval: (intervalId: string) => void;
}) {
    type Tab = 'overview' | 'maintenance' | 'orders' | 'history' | 'activity';
    const [tab, setTab] = useState<Tab>(initialTab ?? 'overview');
    const [sharing, setSharing] = useState(false);
    /** The rule we are about to start counting this asset on, or correcting. */
    const [starting, setStarting] = useState<{ line: AssetIntervalLine; editing: boolean } | null>(null);
    /** The one rule being shared out of the list, as opposed to the whole asset. */
    const [sharingLine, setSharingLine] = useState<AssetIntervalLine | null>(null);
    /** The "Add record" menu in the header. */
    /** Which annual record the shared form is open on, and whether it is adding or editing. */
    const [editingAnnual, setEditingAnnual] = useState<{ key: AssetRecordKey; mode: 'add' | 'edit' } | null>(null);
    const annualRecord = editingAnnual ? annualRecordFor?.(editingAnnual.key) : undefined;
    const annualVersion = editingAnnual ? annualVersionFor?.(editingAnnual.key, editingAnnual.mode) : null;

    const info: IntervalAssetInfo = {
        id: row.id,
        label: row.label,
        kind: row.kind,
        description: row.description,
        driver: row.driver,
        meter: row.meter,
    };

    /**
     * The rules this page shows.
     *
     * The annual inspection is filtered out here rather than in the table, so the tab
     * badge, the standing card and the list cannot disagree about how many rules this
     * truck is on — a badge saying 6 over a list of 5 is the kind of thing nobody
     * reports and everybody notices.
     */
    const lines = useMemo(
        () => row.lines.filter((l) => !isAnnualSafetyInterval(l.serviceTypeIds ?? []) && !l.fromAnnualRecord),
        [row.lines],
    );

    /** Recounted from those, for the same reason. */
    const counts = useMemo(() => {
        const out: Record<AssetState, number> = { overdue: 0, due: 0, upcoming: 0, untracked: 0 };
        for (const l of lines) out[l.state] = (out[l.state] ?? 0) + 1;
        return out;
    }, [lines]);
    /**
     * What can still be ordered.
     *
     * Outstanding is not the same as orderable: a job already with a shop is outstanding
     * until it is signed off, but putting it on a second order raises a second invoice for
     * one piece of work.
     */
    const outstanding = row.outstandingTaskIds.filter((id) => !openOrderOf?.(id));

    const nextLine = useMemo(() => lines.find((l) => l.due) ?? lines[0], [lines]);

    /*
     * The Service Interval tab is {@link AssetIntervalsCard} now.
     *
     * It is the same list the unit's own record in the carrier profile shows, and it was
     * only ever here because this was the first page to need it. Its search, its filters,
     * its banding, its ticks and the order they raise all live with it; what stays here is
     * what the card cannot own — the forms it opens and the page's own standing card.
     */

    /** A record’s switch is its monitoring — the same flag the Compliances tab shows. */
    const setRecordMonitoring = (key: AssetRecordKey, enabled: boolean) => {
        const version = annualVersionFor?.(key, 'edit');
        if (!version) return;
        onSaveAnnualVersion?.(key, { ...version, monitoring: { ...version.monitoring, enabled } }, 'edit');
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                    <ArrowLeft size={15} /> Assets
                </button>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <RowIcon Icon={row.kind === 'truck' ? Truck : Car} tone={row.state === 'overdue' ? 'amber' : 'blue'} />
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{row.label}</h1>
                            <p className="mt-0.5 text-[13px] text-slate-500">
                                {row.kind === 'truck' ? 'Truck' : 'Trailer'}
                                {row.description ? ` · ${row.description}` : ''}
                                {row.driver ? ` · ${row.driver}` : ''}
                            </p>
                        </div>
                        <StatePill state={row.state} />
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {/* "Add record" filed one of the two annual records and nothing
                            else, which is why a page about service intervals offered a
                            choice of two compliance documents. A service is filed against
                            the interval it belongs to, from that interval's own page. */}
                        <button
                            type="button"
                            onClick={() => setSharing(true)}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            <Share2 size={15} /> Share
                        </button>
                        {outstanding.length > 0 && (
                            <button
                                type="button"
                                onClick={() => onCreateOrder(outstanding)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                <Briefcase size={15} /> Create work order
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ProfileTabs
                ariaLabel="Asset sections"
                activeId={tab}
                onChange={setTab}
                className="shrink-0"
                tabs={[
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    // "Maintenance" named the module, not this tab: inside the Maintenance module
                    // every tab is maintenance. What this one lists is the rules.
                    { id: 'maintenance', label: 'Service Interval', icon: Wrench, count: lines.length },
                    { id: 'orders', label: 'Work Orders', icon: Briefcase, count: workOrders.length },
                    // What has been done, as opposed to what is owed or ordered.
                    { id: 'history', label: 'History', icon: HistoryIcon, count: history.length },
                    { id: 'activity', label: 'Activity', icon: ActivityIcon, count: activity.length },
                ]}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6">
                    {/* ── Overview ── where its meters are, and what its rules make of them. */}
                    {tab === 'overview' && (<>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Stat label="Odometer" Icon={Gauge}>
                                {row.meter.odometer ? `${row.meter.odometer.toLocaleString()} mi` : <span className="text-slate-400">Not recorded</span>}
                            </Stat>
                            <Stat label="Engine hours" Icon={Clock}>
                                {row.meter.engineHours ? `${row.meter.engineHours.toLocaleString()} h` : <span className="text-slate-400">Not recorded</span>}
                            </Stat>
                            <Stat label="Intervals" Icon={CalendarClock}>
                                {lines.length === 0 ? <span className="text-slate-400">None</span> : `${lines.length} rule${lines.length === 1 ? '' : 's'}`}
                            </Stat>
                            <Stat label="Driver" Icon={UserRound}>
                                {row.driver ?? <span className="text-slate-400">Unassigned</span>}
                            </Stat>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h2 className="text-sm font-bold text-slate-900">Where its maintenance stands</h2>
                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <Count label="Overdue" value={counts.overdue} tone="text-red-600" />
                                <Count label="Due" value={counts.due} tone="text-amber-600" />
                                <Count label="Upcoming" value={counts.upcoming} tone="text-blue-600" />
                                <Count label="Not tracking" value={counts.untracked} tone="text-slate-500" />
                            </div>
                            <p className="mt-4 border-t border-slate-100 pt-3 text-[13px] text-slate-600">
                                {lines.length === 0 ? (
                                    <>This asset is on no service interval. Add it from an interval’s own Assets tab,
                                    and it will start counting once you say when it was last serviced.</>
                                ) : counts.overdue > 0 ? (
                                    <>
                                        <span className="font-semibold text-slate-900">{counts.overdue}</span>
                                        {' '}of its {lines.length} rule{lines.length === 1 ? '' : 's'} {counts.overdue === 1 ? 'has' : 'have'} gone past
                                        what {row.label} was due for. The Service Interval tab says which.
                                    </>
                                ) : nextLine?.due ? (
                                    <>Nothing is overdue. Next up is{' '}
                                        <span className="font-semibold text-slate-900">{nextLine.name}</span>
                                        {' '}at {nextLine.due.at}{nextLine.due.left ? ` — ${nextLine.due.left}` : ''}.
                                    </>
                                ) : (
                                    <>Nothing is counting yet. Switch a rule on in the Service Interval tab to start it.</>
                                )}
                            </p>
                        </div>

                        {/* The two annual blocks that sat here are gone with the rows they
                            matched: the PM tiers cover the same work, and the asset's own
                            Compliances tab is where the certificate itself lives. */}

                        {asset && (
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-bold text-slate-900">The unit</h2>
                                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                                    {[
                                        { k: 'Type', v: asset.assetType },
                                        { k: 'Class', v: asset.assetCategory },
                                        { k: 'VIN', v: asset.vin },
                                        { k: 'Plate', v: asset.plateNumber },
                                        { k: 'Status', v: asset.operationalStatus },
                                    ].filter((x) => x.v).map((x) => (
                                        <div key={x.k}>
                                            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{x.k}</dt>
                                            <dd className="mt-0.5 truncate text-sm font-medium text-slate-900">{x.v}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>
                        )}
                    </>)}

                    {/* ── Maintenance ── everything that comes round on this asset: the rules it
                        is on, and the two annual records filed against it. One list, because
                        from the yard they are the same question — what does this truck owe? */}
                    {tab === 'maintenance' && (
                        <AssetIntervalsCard
                            assetId={row.id}
                            assetLabel={row.label}
                            lines={lines}
                            openOrderOf={openOrderOf}
                            onCreateOrder={onCreateOrder}
                            onOpenInterval={onOpenInterval}
                            onOpenPair={onOpenPair}
                            onSetTracking={onSetTracking}
                            onRemoveFromInterval={onRemoveFromInterval}
                            onStartTracking={(line, editing) => setStarting({ line, editing })}
                            onShareLine={setSharingLine}
                            onEditAnnual={(key, mode) => setEditingAnnual({ key, mode })}
                            onRecordMonitoring={setRecordMonitoring}
                        />
                    )}

                    {/* ── Work orders ── what has been sent to a shop for this unit. The
                        Service Interval tab says what it owes; this says what is being done
                        about it. */}
                    {tab === 'orders' && (
                        <WorkOrdersTable
                            orders={workOrders}
                            onOpen={onOpenOrder ? (o) => onOpenOrder(o.id) : undefined}
                            rowActions={orderActions}
                            showAssets={false}
                            title="Work orders"
                            emptyTitle={`${row.label} is on no work order`}
                            emptyHint="Tick what needs doing in the Service Interval tab and raise one."
                            action={outstanding.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => onCreateOrder(outstanding)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                                >
                                    <Briefcase size={15} /> Create work order
                                </button>
                            ) : undefined}
                        />
                    )}

                    {tab === 'history' && (
                        <ServiceHistoryTable
                            events={history}
                            title={`Service history · ${row.label}`}
                            subtitle={`Every service on record for this unit, newest first.`}
                            onOpenInterval={onOpenInterval}
                            onOpen={onOpenHistory}
                            onEdit={onEditHistory}
                            onShare={onShareHistory}
                        />
                    )}

                    {/* ── Activity ── read off the tasks, the orders and the records, so it
                        cannot contradict any of them. */}
                    {tab === 'activity' && (
                        <ActivityTimeline
                            heading={`Everything on ${row.label}`}
                            entries={activity}
                            emptyText="Nothing has happened on this asset yet."
                        />
                    )}
                </div>
            </div>

            {starting && (
                <StartTrackingDialog
                    asset={info}
                    intervals={intervalsOf(starting.line.intervalId)}
                    enrolled={starting.line.enrolled}
                    editing={starting.editing}
                    onClose={() => setStarting(null)}
                    onConfirm={(last) => { onSetTracking(starting.line.intervalId, true, last); setStarting(null); }}
                />
            )}

            {/* One rule on one asset — what it is, where it stands, and what it was last
                serviced at. Not the whole unit, which the header's Share sends. */}
            {/* Correcting the record on file is the asset form’s own block of questions, over
                what is already there; FILING a new one is the Compliances tab’s full record
                form, because that is what adding a record is everywhere else in the app. */}
            {editingAnnual?.mode === 'edit' && annualRecord && annualVersion && (
                <AnnualRecordDialog
                    record={annualRecord}
                    subjectLabel={row.label}
                    version={annualVersion}
                    onClose={() => setEditingAnnual(null)}
                    onSave={(v) => {
                        onSaveAnnualVersion?.(editingAnnual.key, v, 'edit');
                        setEditingAnnual(null);
                    }}
                    onAddNew={() => setEditingAnnual({ key: editingAnnual.key, mode: 'add' })}
                />
            )}

            {editingAnnual?.mode === 'add' && annualRecord && annualVersion && (
                <VersionEditModal
                    record={annualRecord}
                    subjectLabel={row.label}
                    version={annualVersion}
                    mode="add"
                    onClose={() => setEditingAnnual(null)}
                    onSave={(v) => {
                        onSaveAnnualVersion?.(editingAnnual.key, v, 'add');
                        setEditingAnnual(null);
                    }}
                />
            )}

            {sharingLine && (
                <ShareToChat
                    open
                    onClose={() => setSharingLine(null)}
                    title={`Share ${sharingLine.name}`}
                    subtitle={`${row.label} · one service interval`}
                    source={{ type: 'manual', id: `${row.id}:${sharingLine.intervalId}`, label: `${row.label} · ${sharingLine.name}` }}
                    items={[
                        { name: row.description ? `${row.label} · ${row.description}` : row.label, group: 'Asset' },
                        ...(row.driver ? [{ name: row.driver, group: 'Driver' }] : []),
                        { name: sharingLine.services.join(', ') || sharingLine.name, group: 'Services' },
                        { name: sharingLine.everyText, group: 'Every' },
                        ...sharingLine.clocks.map((c) => ({
                            name: `${c.label}: due ${c.dueText} · ${c.remainingText}`,
                            group: 'Where it stands',
                        })),
                        { name: STATE_PILL_LABEL(sharingLine.state), group: 'Status' },
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${row.label} · ${sharingLine.name}`}
                />
            )}

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(false)}
                    title={`Share ${row.label}`}
                    subtitle="What this asset needs, across its intervals"
                    source={{ type: 'manual', id: row.id, label: row.label }}
                    items={[
                        { name: row.description ? `${row.label} · ${row.description}` : row.label, group: 'Asset' },
                        ...(row.driver ? [{ name: row.driver, group: 'Driver' }] : []),
                        { name: `${row.meter.odometer.toLocaleString()} mi`, group: 'Odometer' },
                        ...lines.map((l) => ({
                            name: `${l.name} — ${l.due?.at ?? 'not counting'}${l.due?.left ? ` (${l.due.left})` : ''}`,
                            group: 'Intervals',
                        })),
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${row.label} — maintenance`}
                />
            )}
        </div>
    );
}
