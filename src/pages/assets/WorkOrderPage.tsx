// ─────────────────────────────────────────────────────────────────────────────
// WorkOrderPage — one work order, as a place you go rather than a row you squint at.
//
// A work order is the only record in maintenance that ties four things together: the
// units, the rules behind the work, the shop doing it, and what it cost. In a table that
// is four columns, each truncated; the moment anyone asks "what is actually on this one,
// and what did the shop send us", the table has nothing left to say. So it gets a page,
// with the same tab strip an asset's record and a driver's profile wear.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import {
    ArrowLeft, Briefcase, Truck, Car, Store, FileText, Share2, Pencil, ClipboardCheck,
    RotateCcw, XCircle, CalendarClock, ListChecks, UserRound,
    Mail, Phone, MapPin, Download, Eye, Activity as ActivityIcon, LayoutGrid, Search,
    TriangleAlert,
} from 'lucide-react';
import { ProfileTabs } from '@/components/ui/ProfileTabs';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
import { TH, TD, COL_RULE, RowIcon, EmptyRow, RowButton } from '@/components/ui/CatalogTable';
import { tagColor } from '@/pages/compliance/safety-tags.data';
import { cn } from '@/lib/utils';

/** One job on the order: a unit, a piece of work, and where it stands. */
export interface WorkOrderJob {
    taskId: string;
    assetId: string;
    assetLabel: string;
    assetKind: 'truck' | 'trailer';
    assetDescription?: string;
    driver?: string;
    /** The rule behind it, where there is one — a one-off repair has none. */
    intervalId?: string;
    intervalName?: string;
    /** "25,000 mi · 500 h · 180 d" */
    intervalEvery?: string;
    services: string[];
    /** Where the task itself stands: overdue, due, in progress, done. */
    status: string;
    /**
     * Where this line stands ON THIS ORDER, which is a different question.
     *
     * A called-off job is outstanding again everywhere else — it still needs doing, just
     * not here — so the task cannot answer this and the order has to.
     */
    state: 'open' | 'completed' | 'cancelled';
    /** What it is counting down to, and how much is left. */
    dueText?: string;
    remainingText?: string;
    /** What the shop wrote down when it closed this one out. */
    finalOdometer?: number;
    finalEngineHours?: number;
    cost?: number;
    /**
     * The service record this line filed.
     *
     * The same entry the rule's own history shows — not a copy of it. A line that reads
     * "signed off" with nothing to open was the whole complaint: the order said the work
     * was done and the interval's record said it had never happened, and the two could
     * not be reconciled from either screen.
     */
    record?: {
        id: string;
        date: string;
        odometer?: number;
        cost?: number;
        currency?: string;
        vendorName?: string;
        files: number;
    };
}

/** The meters a unit on this order was last seen at. */
export interface WorkOrderAsset {
    id: string;
    label: string;
    kind: 'truck' | 'trailer';
    description?: string;
    driver?: string;
    odometer: number;
    engineHours: number;
    vin?: string;
    plateNumber?: string;
}

export interface WorkOrderVendor {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
}

export interface WorkOrderDoc {
    name: string;
    size?: number;
    url?: string;
    /** Where it came from: "Sent with the order", "Quote", or a line's own record. */
    group: string;
    /** What it is, in the carrier's own words — the same catalog the documents use. */
    tags?: string[];
    addedAt?: string;
    /**
     * The service record it was filed with, where it was filed with one.
     *
     * An order's files come from two places and the difference matters: the quote and
     * the sheet that went out belong to the ORDER, and the invoice and the certificate
     * belong to a SERVICE — one line of it, on one interval. A flat list of nine PDFs
     * cannot answer "which of these is the brake certificate", which is the only thing
     * anybody asks of it.
     */
    recordId?: string;
    recordLabel?: string;
}

/** Everything one order's page shows, gathered by the page that owns the orders. */
export interface WorkOrderDetail {
    id: string;
    name: string;
    state: 'open' | 'completed' | 'cancelled';
    createdAt: string;
    dueDate?: string;
    completedAt?: string;
    /** What the order was raised to do, where somebody said so in words. */
    about?: string;
    notes?: string;
    jobs: WorkOrderJob[];
    assets: WorkOrderAsset[];
    vendor: WorkOrderVendor;
    docs: WorkOrderDoc[];
    activity: ActivityEntry[];
    currency: string;
    /** What it has come to: closed-out costs, else the bill filed with it. */
    total?: number;
    /** The bill, where one was filed. */
    bill?: {
        performedBy: 'driver' | 'mechanic';
        who?: string;
        labour?: string;
        parts?: string;
        odometer?: string;
        odometerUnit?: string;
        invoiceNumber?: string;
    };
}

const STATE_PILL: Record<WorkOrderDetail['state'], { cls: string; label: string }> = {
    open: { cls: 'border-blue-200 bg-blue-50 text-blue-700', label: 'Open' },
    completed: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Completed' },
    cancelled: { cls: 'border-slate-200 bg-slate-100 text-slate-500', label: 'Cancelled' },
};

/** What a job on the order amounts to, in the same pill every other list uses. */
const JOB_PILL: Record<string, string> = {
    open: 'border-blue-200 bg-blue-50 text-blue-700',
    overdue: 'border-red-200 bg-red-50 text-red-700',
    due: 'border-amber-200 bg-amber-50 text-amber-700',
    upcoming: 'border-blue-200 bg-blue-50 text-blue-700',
    in_progress: 'border-violet-200 bg-violet-50 text-violet-700',
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
};

function JobPill({ status }: { status: string }) {
    return (
        <span className={cn(
            'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            JOB_PILL[status] ?? JOB_PILL.cancelled,
        )}>
            {status.replace(/_/g, ' ')}
        </span>
    );
}

const shortDate = (iso?: string) => (iso
    ? new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—');

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

function Field({ label, value, Icon }: { label: string; value?: React.ReactNode; Icon?: React.ElementType }) {
    return (
        <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-800">
                {Icon && <Icon size={13} className="shrink-0 text-slate-400" />}
                <span className="truncate">{value ?? <span className="text-slate-300">—</span>}</span>
            </div>
        </div>
    );
}

export function WorkOrderPage({
    order, onBack, onEdit, onShare, onReopen, onCancel, onOpenAsset, onOpenInterval,
    onFileRecord, onOpenRecord, onCancelJob, onReopenJob, onRestoreJob,
    initialTab, onTabChange,
}: {
    order: WorkOrderDetail;
    onBack: () => void;
    onEdit: () => void;
    onShare: () => void;
    onReopen: () => void;
    onCancel: () => void;
    onOpenAsset?: (assetId: string) => void;
    onOpenInterval?: (intervalId: string) => void;
    /**
     * File what was done on one line.
     *
     * This is how a line is finished, and it is the only way: it opens the service record
     * form for that unit on that rule, and filing it writes the service, resets the
     * countdown and signs the line off — one action, because they are one event. Marking
     * a line "done" without a record left a rule counting from nothing and a visit with
     * no paper, which is the gap every maintenance audit walks into.
     */
    onFileRecord?: (job: WorkOrderJob) => void;
    /** Open the record a line filed, where it is the fleet's record and not a copy. */
    onOpenRecord?: (recordId: string) => void;
    onCancelJob?: (taskId: string) => void;
    onReopenJob?: (taskId: string) => void;
    onRestoreJob?: (taskId: string) => void;
    /**
     * Which tab this opens on, and a way to say which one it is showing.
     *
     * Filing a line's record swaps this whole page out for the form and swaps it back
     * afterwards, so without this you answer one of four jobs on the Service Interval tab
     * and land on Overview — the three still waiting are now two clicks away, which is
     * exactly how the other three get forgotten.
     */
    initialTab?: string;
    onTabChange?: (id: string) => void;
}) {
    type Tab = 'overview' | 'intervals' | 'vendor' | 'docs' | 'activity';
    const [tab, setTab] = useState<Tab>((initialTab as Tab) ?? 'overview');
    const pill = STATE_PILL[order.state];

    /**
     * The rules behind the work, one row per unit.
     *
     * Grouping two trucks onto one rule row meant showing one of their countdowns for
     * both, which is a figure that is wrong for at least one of them. The rule repeats;
     * the due dates do not.
     */
    const intervals = useMemo(() => order.jobs.map((j) => ({
        key: j.taskId,
        id: j.intervalId,
        name: j.intervalName ?? (j.services.join(', ') || 'One-off repair'),
        every: j.intervalEvery,
        job: j,
    })), [order.jobs]);

    const done = order.jobs.filter((j) => j.state === 'completed').length;
    const calledOff = order.jobs.filter((j) => j.state === 'cancelled').length;
    /*
     * How far through the order is, as the one figure it is actually judged by.
     *
     * An order is finished by finishing its service intervals, so "3 of 5 signed off" is
     * the whole status — the pill at the top only says whether that fraction has reached
     * the bottom. Reading it off the lines rather than storing it is what keeps it true.
     */
    const pct = order.jobs.length ? Math.round((done / order.jobs.length) * 100) : 0;

    /*
     * The files on this order, under where each of them came from.
     *
     * An order collects paper from three directions — what was sent out with it, what
     * each line's record filed, and what the shop billed — and a flat list of nine PDFs
     * named invoice-2026-03-11.pdf cannot tell you which is which. The grouping is the
     * document's own, so nothing here decides it a second time.
     */
    const [docQuery, setDocQuery] = useState('');
    const recordDocCount = order.docs.filter((d) => d.recordId).length;
    const shownDocs = useMemo(() => {
        const q = docQuery.trim().toLowerCase();
        if (!q) return order.docs;
        return order.docs.filter((d) => [d.name, d.group, d.recordLabel, ...(d.tags ?? [])]
            .filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
    }, [order.docs, docQuery]);

    /*
     * Taking a line back off an order asks first, and asks HERE.
     *
     * The order-level controls step back out to the list to find their dialog, which is
     * right for a decision about the whole visit and wrong for one about a single line:
     * being thrown off the page after answering one of four jobs is how the other three
     * get forgotten.
     */
    const [confirm, setConfirm] = useState<{ job: WorkOrderJob; kind: 'cancel' | 'reopen' } | null>(null);

    /** What one line can be answered with, given where it already stands. */
    const jobActions = (j: WorkOrderJob) => (
        <div className="flex items-center justify-end gap-1">
            {j.state === 'open' && onFileRecord && (
                <RowButton Icon={ClipboardCheck} label="Add record" tone="emerald"
                    onClick={() => onFileRecord(j)} />
            )}
            {j.state === 'open' && onCancelJob && (
                <RowButton Icon={XCircle} label="Cancel" tone="red"
                    onClick={() => setConfirm({ job: j, kind: 'cancel' })} />
            )}
            {j.state === 'completed' && onReopenJob && (
                <RowButton Icon={RotateCcw} label="Not done"
                    onClick={() => setConfirm({ job: j, kind: 'reopen' })} />
            )}
            {j.state === 'cancelled' && onRestoreJob && (
                <RowButton Icon={RotateCcw} label="Put back" onClick={() => onRestoreJob(j.taskId)} />
            )}
        </div>
    );

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                    <ArrowLeft size={15} /> Work orders
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Briefcase size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">{order.name}</h1>
                                <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', pill.cls)}>
                                    {pill.label}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                                {order.vendor.name} · raised {shortDate(order.createdAt)}
                                {order.dueDate ? ` · due ${shortDate(order.dueDate)}` : ''}
                                {' · '}{done}/{order.jobs.length} signed off
                                {calledOff > 0 ? ` · ${calledOff} called off` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={onEdit}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            <Pencil size={15} /> Edit
                        </button>
                        <button
                            type="button"
                            onClick={onShare}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                            <Share2 size={15} /> Share
                        </button>
                        {/* No "Mark done" up here any more.
                            An order is finished by finishing its LINES: each service
                            interval gets its record filed, which writes the service and
                            resets that countdown, and when the last one is filed the order
                            closes itself. Signing the whole visit off in one click left
                            rules counting from nothing and visits with no paper. */}
                        {order.state === 'completed' && (
                            <button
                                type="button"
                                onClick={onReopen}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <RotateCcw size={15} /> Mark as not done
                            </button>
                        )}
                        {order.state !== 'cancelled' && (
                            <button
                                type="button"
                                onClick={onCancel}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                                <XCircle size={15} /> Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ProfileTabs
                ariaLabel="Work order sections"
                activeId={tab}
                onChange={(id) => { setTab(id as Tab); onTabChange?.(id); }}
                className="shrink-0"
                tabs={[
                    { id: 'overview', label: 'Overview', icon: LayoutGrid },
                    /* No Asset tab: an order covers one unit, which is named in the
                       header and on every line. A tab holding one row of one thing is a
                       click to be told what the page already says. */
                    { id: 'intervals', label: 'Service Interval', icon: ListChecks, count: intervals.length },
                    { id: 'vendor', label: 'Vendor', icon: Store },
                    { id: 'docs', label: 'Document', icon: FileText, count: order.docs.length },
                    { id: 'activity', label: 'Activity', icon: ActivityIcon, count: order.activity.length },
                ]}
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6">
                    {/* ── Overview ── what was asked for, and what it has come to. */}
                    {tab === 'overview' && (<>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                            <Stat label="Service intervals" Icon={ListChecks}>
                                <span className="tabular-nums">{done} of {order.jobs.length}</span>
                                <span className="font-medium text-slate-500"> signed off</span>
                                <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <span
                                        className={cn('block h-full rounded-full transition-all',
                                            pct === 100 ? 'bg-emerald-500' : 'bg-blue-500')}
                                        style={{ width: `${pct}%` }}
                                    />
                                </span>
                                {calledOff > 0 && (
                                    <span className="mt-1 block text-[11px] font-medium text-slate-500">
                                        {calledOff} called off
                                    </span>
                                )}
                            </Stat>
                            <Stat label="Raised" Icon={CalendarClock}>{shortDate(order.createdAt)}</Stat>
                            <Stat label="Due" Icon={CalendarClock}>
                                {order.dueDate ? shortDate(order.dueDate) : <span className="text-slate-400">No date</span>}
                            </Stat>
                            <Stat label="Vendor" Icon={Store}>{order.vendor.name}</Stat>
                            <Stat label="Cost" Icon={FileText}>
                                {order.total
                                    ? `${order.currency} ${order.total.toFixed(2)}`
                                    : <span className="text-slate-400">Not billed yet</span>}
                            </Stat>
                        </div>

                        {(order.about || order.notes) && (
                            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-sm font-bold text-slate-900">What this order is about</h2>
                                {order.about && <p className="mt-2 text-sm leading-relaxed text-slate-700">{order.about}</p>}
                                {order.notes && (
                                    <p className="mt-2 border-t border-slate-100 pt-2 text-[13px] leading-relaxed text-slate-500">
                                        {order.notes}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="px-5 py-3">
                                <h2 className="text-sm font-bold text-slate-900">Work on this order</h2>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {order.jobs.length} job{order.jobs.length === 1 ? '' : 's'} · {done} signed off{calledOff > 0 ? ` · ${calledOff} called off` : ''}
                                </p>
                            </div>
                            <div className="overflow-x-auto border-t border-slate-100">
                                <table className="w-full min-w-[760px]">
                                    <thead>
                                        <tr>
                                            <TH>Asset</TH>
                                            <TH className={COL_RULE}>Work</TH>
                                            <TH className={COL_RULE}>Interval</TH>
                                            <TH className={COL_RULE}>Closed at</TH>
                                            <TH className={COL_RULE}>Cost</TH>
                                            <TH className={COL_RULE}>Status</TH>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {order.jobs.length === 0 && (
                                            <EmptyRow colSpan={6} Icon={Briefcase} title="Nothing on this order" />
                                        )}
                                        {order.jobs.map((j) => (
                                            <tr key={j.taskId} className="transition-colors hover:bg-slate-50/60">
                                                <TD>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenAsset?.(j.assetId)}
                                                        className="flex items-center gap-3 text-left"
                                                    >
                                                        <RowIcon Icon={j.assetKind === 'truck' ? Truck : Car} tone="blue" />
                                                        <div className="min-w-0">
                                                            <div className="truncate font-semibold leading-tight text-slate-900 hover:underline">{j.assetLabel}</div>
                                                            <p className="truncate text-xs leading-tight text-slate-500">
                                                                {j.assetKind === 'truck' ? 'Truck' : 'Trailer'}
                                                                {j.assetDescription ? ` · ${j.assetDescription}` : ''}
                                                                {j.driver ? ` · ${j.driver}` : ''}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </TD>
                                                <TD className={cn(COL_RULE, 'text-sm text-slate-700')}>
                                                    {j.services.join(', ') || '—'}
                                                </TD>
                                                <TD className={COL_RULE}>
                                                    {j.intervalName
                                                        ? <span className="text-sm text-slate-700">{j.intervalName}</span>
                                                        : <span className="text-sm text-slate-400">One-off repair</span>}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-sm tabular-nums text-slate-700')}>
                                                    {j.finalOdometer != null
                                                        ? `${j.finalOdometer.toLocaleString()} mi`
                                                        : <span className="text-slate-300">—</span>}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap tabular-nums text-slate-700')}>
                                                    {j.cost ? `${order.currency} ${j.cost.toFixed(2)}` : <span className="text-slate-300">—</span>}
                                                </TD>
                                                <TD className={COL_RULE}>
                                                    {/* The line's verdict on THIS order, the same word the
                                                        Service Interval tab uses. Showing the task's own
                                                        standing here instead put two vocabularies on one
                                                        order — a line reading COMPLETED while the order it
                                                        is on has not touched it yet. */}
                                                    <JobPill status={j.state} />
                                                </TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>)}

                    {/* The unit is in the header and on every line, so there is no panel
                        for it: a tab holding one row of one thing is a click to be told
                        what the page already says. */}

                    {tab === 'intervals' && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">Service intervals on this order</h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        What the work counts against, and what it resets when its record is filed.
                                    </p>
                                </div>
                                {/* The same fraction the Overview leads with, where the work
                                    is — so you can see what is left without going back. */}
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="text-xs font-bold tabular-nums text-slate-700">
                                        {done}/{intervals.length}
                                    </span>
                                    <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                                        <span
                                            className={cn('block h-full rounded-full transition-all',
                                                pct === 100 ? 'bg-emerald-500' : 'bg-blue-500')}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </span>
                                </div>
                            </div>
                            {/* One line per interval, and it FITS: the unit came off, because
                                an order covers one and it is in the header, and the two due
                                columns became one cell that reads "215,955 mi / 3,000 to go".
                                Seven columns on a 980px table inside a 1,000px card put the
                                only button that does anything behind a sideways scroll. */}
                            <div className="overflow-x-auto border-t border-slate-100">
                                <table className="w-full min-w-[720px]">
                                    <thead>
                                        <tr>
                                            <TH>Interval</TH>
                                            <TH className={COL_RULE}>Every</TH>
                                            <TH className={COL_RULE}>Next due</TH>
                                            <TH className={COL_RULE}>Record</TH>
                                            <TH className={COL_RULE}>Status</TH>
                                            <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {intervals.map((iv) => (
                                            <tr key={iv.key} className="transition-colors hover:bg-slate-50/60">
                                                <TD>
                                                    <button
                                                        type="button"
                                                        disabled={!iv.id}
                                                        onClick={() => iv.id && onOpenInterval?.(iv.id)}
                                                        className="flex max-w-[260px] items-center gap-2.5 text-left"
                                                    >
                                                        <RowIcon Icon={ListChecks} tone={iv.job.state === 'completed' ? 'emerald' : 'blue'} />
                                                        <span className="min-w-0">
                                                            <span className={cn('block truncate text-sm font-semibold leading-tight text-slate-900', iv.id && 'hover:underline')}>
                                                                {iv.name}
                                                            </span>
                                                            <span className="block truncate text-xs leading-tight text-slate-500">
                                                                {iv.job.services.join(', ') || (iv.id ? 'Scheduled' : 'Not on an interval')}
                                                            </span>
                                                        </span>
                                                    </button>
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-sm tabular-nums text-slate-700')}>
                                                    {iv.every ?? <span className="text-slate-300">—</span>}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap')}>
                                                    <span className="block text-sm tabular-nums text-slate-800">
                                                        {iv.job.dueText ?? <span className="text-slate-300">—</span>}
                                                    </span>
                                                    {iv.job.remainingText && (
                                                        <span className="block text-xs text-slate-500">{iv.job.remainingText}</span>
                                                    )}
                                                </TD>
                                                {/* What the line produced. The fleet's own entry, opened
                                                    from here — the order and the interval's history are
                                                    the same event read twice, not two records. */}
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap')}>
                                                    {iv.job.record ? (
                                                        <button
                                                            type="button"
                                                            disabled={!onOpenRecord}
                                                            onClick={() => onOpenRecord?.(iv.job.record!.id)}
                                                            className="text-left"
                                                        >
                                                            <span className={cn('block text-sm font-semibold tabular-nums text-slate-800', onOpenRecord && 'hover:text-blue-600 hover:underline')}>
                                                                {shortDate(iv.job.record.date)}
                                                            </span>
                                                            <span className="block text-xs text-slate-500">
                                                                {iv.job.record.cost
                                                                    ? `${iv.job.record.currency ?? order.currency} ${iv.job.record.cost.toFixed(2)}`
                                                                    : 'No charge'}
                                                                {iv.job.record.files > 0 ? ` · ${iv.job.record.files} file${iv.job.record.files === 1 ? '' : 's'}` : ''}
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">Not filed yet</span>
                                                    )}
                                                </TD>
                                                <TD className={COL_RULE}>
                                                    <JobPill status={iv.job.state} />
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-right')}>
                                                    {jobActions(iv.job)}
                                                </TD>
                                            </tr>
                                        ))}
                                        {intervals.length === 0 && (
                                            <EmptyRow colSpan={6} Icon={ListChecks} title="No interval behind this order" />
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Vendor ── who is doing it, and how to reach them. */}
                    {tab === 'vendor' && (
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <RowIcon Icon={Store} tone="blue" />
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-slate-900">{order.vendor.name}</div>
                                    <p className="truncate text-xs text-slate-500">{order.vendor.category ?? 'Repair & maintenance'}</p>
                                </div>
                            </div>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <Field label="Contact" value={order.vendor.contactName} Icon={UserRound} />
                                <Field label="Email" value={order.vendor.email} Icon={Mail} />
                                <Field label="Phone" value={order.vendor.phone} Icon={Phone} />
                                <Field label="Address" value={order.vendor.address} Icon={MapPin} />
                            </div>

                            {order.bill && (
                                <div className="mt-5 border-t border-slate-100 pt-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Repair bill</h3>
                                    <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <Field label="Performed by" value={`${order.bill.performedBy === 'driver' ? 'Driver' : 'Mechanic'}${order.bill.who ? ` · ${order.bill.who}` : ''}`} />
                                        <Field label="Labour" value={order.bill.labour ? `${order.currency} ${order.bill.labour}` : undefined} />
                                        <Field label="Parts" value={order.bill.parts ? `${order.currency} ${order.bill.parts}` : undefined} />
                                        <Field label="Odometer" value={order.bill.odometer ? `${order.bill.odometer} ${order.bill.odometerUnit ?? 'mi'}` : undefined} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Document ── what the shop sent back, and what was filed with it.

                        A list, not a pile. Every file says what it is and which record it
                        came off, because those are the two questions asked of it: "where
                        is the safety certificate" and "what did this line produce". The
                        headings it used to be grouped under are now a column, which is
                        the same information in a form you can search and sort by eye. */}
                    {tab === 'docs' && (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-end justify-between gap-3 px-5 py-3">
                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900">Documents</h2>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {order.docs.length} file{order.docs.length === 1 ? '' : 's'} on this order
                                        {recordDocCount > 0 ? ` · ${recordDocCount} filed with a service record` : ''}
                                    </p>
                                </div>
                                {order.docs.length > 4 && (
                                    <div className="relative w-full sm:w-64">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            value={docQuery}
                                            onChange={(e) => setDocQuery(e.target.value)}
                                            placeholder="Search name, tag or record…"
                                            className="h-9 w-full rounded-lg border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto border-t border-slate-100">
                                <table className="w-full min-w-[760px]">
                                    <thead>
                                        <tr>
                                            <TH>Document</TH>
                                            <TH className={COL_RULE}>Tags</TH>
                                            <TH className={COL_RULE}>Filed with</TH>
                                            <TH className={COL_RULE}>Added</TH>
                                            <TH className={cn(COL_RULE, 'text-right')}>Actions</TH>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {shownDocs.length === 0 && (
                                            <EmptyRow
                                                colSpan={5}
                                                Icon={FileText}
                                                title={order.docs.length === 0 ? 'Nothing filed yet' : 'No document matches that'}
                                                hint={order.docs.length === 0
                                                    ? "What goes out with the order, and what each line's record files when it is signed off, lands here."
                                                    : undefined}
                                            />
                                        )}
                                        {shownDocs.map((d, i) => (
                                            <tr key={`${d.name}-${i}`} className="transition-colors hover:bg-slate-50/60">
                                                <TD>
                                                    <div className="flex items-center gap-2.5">
                                                        <RowIcon Icon={FileText} tone="blue" />
                                                        <div className="min-w-0">
                                                            <div className="truncate text-[13px] font-semibold leading-tight text-slate-800" title={d.name}>
                                                                {d.name}
                                                            </div>
                                                            <p className="truncate text-[11px] leading-tight text-slate-500">
                                                                {d.size ? `${Math.max(1, Math.round(d.size / 1024))} KB` : 'PDF'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TD>
                                                <TD className={COL_RULE}>
                                                    {(d.tags?.length ?? 0) > 0 ? (
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            {d.tags!.slice(0, 3).map((t) => (
                                                                <span key={t} className={cn(
                                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                                    tagColor(t))}>
                                                                    {t}
                                                                </span>
                                                            ))}
                                                            {d.tags!.length > 3 && (
                                                                <span className="text-[10px] font-bold text-slate-400">
                                                                    +{d.tags!.length - 3}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[12px] text-slate-300">Untagged</span>
                                                    )}
                                                </TD>
                                                {/* Which record — clickable where there is one, because
                                                    "what else came with this service" is the next question. */}
                                                <TD className={COL_RULE}>
                                                    {d.recordId ? (
                                                        <button
                                                            type="button"
                                                            disabled={!onOpenRecord}
                                                            onClick={() => onOpenRecord?.(d.recordId!)}
                                                            className="min-w-0 text-left"
                                                        >
                                                            <span className={cn('block truncate text-[13px] font-semibold text-slate-800',
                                                                onOpenRecord && 'hover:text-blue-600 hover:underline')}>
                                                                {d.recordLabel ?? 'Service record'}
                                                            </span>
                                                            <span className="block text-[11px] text-slate-500">Service record</span>
                                                        </button>
                                                    ) : (
                                                        <div className="min-w-0">
                                                            <span className="block truncate text-[13px] text-slate-700">{d.group}</span>
                                                            <span className="block text-[11px] text-slate-500">The order itself</span>
                                                        </div>
                                                    )}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-[13px] tabular-nums text-slate-600')}>
                                                    {d.addedAt ? shortDate(d.addedAt) : <span className="text-slate-300">—</span>}
                                                </TD>
                                                <TD className={cn(COL_RULE, 'whitespace-nowrap text-right')}>
                                                    {d.url ? (
                                                        <div className="flex items-center justify-end gap-1">
                                                            <a
                                                                href={d.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                                                            >
                                                                <Eye size={13} /> View
                                                            </a>
                                                            <a
                                                                href={d.url}
                                                                download
                                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                                aria-label={`Download ${d.name}`}
                                                            >
                                                                <Download size={13} />
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400">No copy attached</span>
                                                    )}
                                                </TD>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Activity ── read off the order and its tasks, so it cannot
                        contradict either of them. */}
                    {tab === 'activity' && (
                        <ActivityTimeline
                            heading="Activity"
                            entries={order.activity}
                            emptyText="Nothing has happened on this order yet."
                        />
                    )}
                </div>
            </div>

            {/* Taking a line back off says what it will do to the record — "not done" on
                work that was signed off takes a service off the fleet's history. */}
            {confirm && (() => {
                const { job, kind } = confirm;
                const what = job.intervalName ?? (job.services.join(', ') || 'this job');
                const copy = kind === 'cancel'
                    ? {
                        title: `Call off ${what} on ${job.assetLabel}?`,
                        body: 'It comes off this order and goes back to being outstanding — due where it was due — so it can go on another one. The rest of this order is unaffected.',
                        cta: 'Call it off',
                        tone: 'bg-red-600 hover:bg-red-700',
                        run: () => onCancelJob?.(job.taskId),
                    }
                    : {
                        title: `Mark ${what} on ${job.assetLabel} as not done?`,
                        body: 'The service comes out of the record: the interval\'s last service goes back to the one before it, the next service this raised is removed, and a certificate it filed is withdrawn. The other lines on this order stay as they are.',
                        cta: 'Mark as not done',
                        tone: 'bg-slate-900 hover:bg-slate-800',
                    run: () => onReopenJob?.(job.taskId),
                    };
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
                        <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                    <TriangleAlert size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900">{copy.title}</h3>
                                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{copy.body}</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => setConfirm(null)}
                                    className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Keep it
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { copy.run(); setConfirm(null); }}
                                    className={cn('inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors', copy.tone)}
                                >
                                    {copy.cta}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
