// ─────────────────────────────────────────────────────────────────────────────
// ServiceRecordPage — one entry in the maintenance record, as a place you go.
//
// A history row can only say "PM Service A, 129,169 mi, $412". The questions that follow
// are the ones a row has no room for: what exactly was done, which clock it reset and to
// what, who did it, what the invoice said, and what happened to this unit the time
// before. So an entry opens, the way an order and an asset do, and the row stays a row.
//
// Nothing here is stored a second time. The page is the event plus what its five keys —
// asset, interval, service type, work order, vendor — point at.
// ─────────────────────────────────────────────────────────────────────────────

import {
    ArrowLeft, History, Truck, Car, Store, FileText, Share2, Gauge, Clock,
    CalendarClock, ListChecks, Briefcase, UserRound, Mail, Phone, Download, Eye,
    Wrench, ArrowRight, Pencil, Activity as ActivityIcon, PenLine, ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { TH, TD, COL_RULE, RowIcon, EmptyRow } from '@/components/ui/CatalogTable';
import { ProfileTabs } from '@/components/ui/ProfileTabs';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
import type { ServiceEvent } from './service-history';
import { tagColor } from '@/pages/compliance/safety-tags.data';
import { cn } from '@/lib/utils';

/** One service entry, with everything its keys point at gathered up. */
export interface ServiceRecordDetail {
    event: ServiceEvent;
    asset: {
        id: string;
        label: string;
        kind: 'truck' | 'trailer';
        description?: string;
        driver?: string;
        odometer: number;
        engineHours: number;
    };
    /** The rule it satisfied, as it stands now. */
    interval?: {
        id: string;
        name: string;
        /** "25,000 mi · 500 h · 180 d" */
        every: string[];
        /** What this service set the next one to. */
        nextDueText?: string;
    };
    /** What was done, named from the catalog rather than by id. */
    services: { id: string; name: string; group?: string }[];
    vendor?: {
        id?: string;
        name: string;
        contactName?: string;
        email?: string;
        phone?: string;
    };
    /** The order it came in on, where it came in on one. */
    order?: { id: string; name: string; invoiceNumber?: string };
    /** The same unit's previous and next entry against this rule, for stepping through. */
    previous?: ServiceEvent;
    next?: ServiceEvent;
}

const READING_PILL: Record<ServiceEvent['readingSource'], { cls: string; label: string; hint: string }> = {
    shop: {
        cls: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'From shop',
        hint: 'Read off the unit by whoever did the work.',
    },
    meter: {
        cls: 'border-slate-200 bg-slate-100 text-slate-500',
        label: 'From meter',
        hint: 'The shop gave no reading, so the unit’s own meter was used.',
    },
    typed: {
        cls: 'border-blue-200 bg-blue-50 text-blue-700',
        label: 'Typed in',
        hint: 'Entered by hand in the office.',
    },
};

const SOURCE_LABEL: Record<ServiceEvent['source'], string> = {
    work_order: 'Closed out on a work order',
    manual: 'Entered by hand',
    seed: 'Opening record',
};

const longDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const shortDate = (iso: string) =>
    new Date(iso.length === 10 ? `${iso}T08:00:00` : iso)
        .toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

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

function Card({ title, subtitle, children }: {
    title: string; subtitle?: string; children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="px-5 py-3">
                <h2 className="text-sm font-bold text-slate-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
            <div className="border-t border-slate-100">{children}</div>
        </div>
    );
}

export function ServiceRecordPage({
    record, backLabel, onBack, onEdit, onShare, onOpenAsset, onOpenInterval, onOpenOrder, onOpenEvent,
}: {
    record: ServiceRecordDetail;
    /**
     * Where Back goes, named.
     *
     * An entry is opened from four different lists and returns to the one it was opened
     * from, so the button cannot be labelled once in the file and be right.
     */
    backLabel?: string;
    onBack: () => void;
    /** Correct it. A wrong reading here is a wrong due figure downstream. */
    onEdit?: () => void;
    onShare?: () => void;
    onOpenAsset?: (assetId: string) => void;
    onOpenInterval?: (intervalId: string) => void;
    onOpenOrder?: (orderId: string) => void;
    /** Step to the entry before or after this one on the same unit and rule. */
    onOpenEvent?: (eventId: string) => void;
}) {
    const { event: e, asset, interval, services, vendor, order, previous, next } = record;
    const reading = READING_PILL[e.readingSource];
    const AssetIcon = asset.kind === 'truck' ? Truck : Car;

    /*
     * Three questions, three tabs.
     *
     * The page had grown to seven stacked cards, and the two things most often wanted of
     * an entry - "show me the invoice" and "who changed this, and when" - were the last
     * two on it. The record itself is the overview; the paper and the trail are each a
     * thing you go to.
     */
    const [tab, setTab] = useState<'overview' | 'documents' | 'activity'>('overview');
    const files = e.files ?? [];

    /*
     * What has happened TO this entry, as opposed to what it says happened to the truck.
     *
     * Read off the event, not stored: the way it arrived, every correction it carries,
     * and the certificate it filed. A record that can be edited silently is not a record.
     */
    const activity = useMemo<ActivityEntry[]>(() => {
        const out: ActivityEntry[] = [];
        for (const [i, c] of [...(e.corrections ?? [])].entries()) {
            out.push({
                id: `c${i}`,
                icon: PenLine,
                iconTone: 'bg-amber-500',
                title: 'Corrected',
                at: longDate(c.at),
                badge: { label: 'Office', tone: 'bg-amber-50 text-amber-700' },
                detail: [
                    `Was ${shortDate(c.was.performedAt)}`,
                    c.was.odometer != null ? `${c.was.odometer.toLocaleString()} mi` : undefined,
                    c.was.engineHours != null ? `${c.was.engineHours.toLocaleString()} h` : undefined,
                    c.was.cost != null ? `${e.currency ?? 'USD'} ${c.was.cost.toFixed(2)}` : undefined,
                    c.was.invoiceNumber ? `#${c.was.invoiceNumber}` : undefined,
                ].filter(Boolean).join(' · '),
            });
        }
        if (e.certificateVersionId) {
            out.push({
                id: 'cert',
                icon: ShieldCheck,
                iconTone: 'bg-violet-500',
                title: 'Annual certificate filed',
                at: longDate(e.performedAt),
                detail: 'The unit\u2019s compliance record was given a new inspection certificate by this visit.',
            });
        }
        out.push({
            id: 'filed',
            icon: History,
            iconTone: 'bg-blue-500',
            title: e.source === 'work_order' ? 'Filed by a work order'
                : e.source === 'manual' ? 'Entered by hand' : 'Opening record',
            at: longDate(e.performedAt),
            by: e.performedByName,
            badge: { label: reading.label, tone: 'bg-slate-100 text-slate-600' },
            detail: [
                order ? `On ${order.name}` : undefined,
                vendor?.name ? `At ${vendor.name}` : undefined,
                e.invoiceNumber ? `Invoice #${e.invoiceNumber}` : undefined,
            ].filter(Boolean).join(' · ') || undefined,
        });
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [e, order, vendor]);

    const TABS = [
        { id: 'overview' as const, label: 'Overview', icon: History },
        { id: 'documents' as const, label: 'Documents', icon: FileText, count: files.length },
        { id: 'activity' as const, label: 'Activity', icon: ActivityIcon, count: activity.length },
    ];

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-800"
                >
                    <ArrowLeft size={15} /> {backLabel ?? 'Service history'}
                </button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <History size={18} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900">
                                    {e.intervalName ?? 'One-off repair'} — {asset.label}
                                </h1>
                                <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', reading.cls)}>
                                    {reading.label}
                                </span>
                            </div>
                            <p className="mt-0.5 truncate text-sm text-slate-500">
                                Performed {longDate(e.performedAt)} · {SOURCE_LABEL[e.source]}
                                {vendor?.name ? ` · ${vendor.name}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <Pencil size={15} /> Edit
                            </button>
                        )}
                        {onShare && (
                            <button
                                type="button"
                                onClick={onShare}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <Share2 size={15} /> Share
                            </button>
                        )}
                        {order && onOpenOrder && (
                            <button
                                type="button"
                                onClick={() => onOpenOrder(order.id)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                <Briefcase size={15} /> Work order
                            </button>
                        )}
                        {interval && onOpenInterval && (
                            <button
                                type="button"
                                onClick={() => onOpenInterval(interval.id)}
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                <ListChecks size={15} /> Open interval
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <ProfileTabs
                tabs={TABS}
                activeId={tab}
                onChange={setTab}
                ariaLabel="Service record sections"
                className="shrink-0"
            />

            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-5 px-4 py-5 sm:px-8 sm:py-6">
                    {tab === 'overview' && (<>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="Performed" Icon={CalendarClock}>{shortDate(e.performedAt)}</Stat>
                        <Stat label="Odometer" Icon={Gauge}>
                            {e.odometer != null
                                ? `${e.odometer.toLocaleString()} mi`
                                : <span className="text-slate-400">Not recorded</span>}
                        </Stat>
                        <Stat label="Engine hours" Icon={Clock}>
                            {e.engineHours != null
                                ? `${e.engineHours.toLocaleString()} h`
                                : <span className="text-slate-400">Not recorded</span>}
                        </Stat>
                        <Stat label="Cost" Icon={FileText}>
                            {e.cost
                                ? `${e.currency ?? 'USD'} ${e.cost.toFixed(2)}`
                                : <span className="text-slate-400">Not billed</span>}
                        </Stat>
                    </div>

                    {/* ── What was done ── the sub-list this entry is made of. A service is
                        rarely one job, and "PM Service A" on its own does not say which
                        ones were actually carried out. */}
                    <Card
                        title="What was done"
                        subtitle={`${services.length} service${services.length === 1 ? '' : 's'} carried out on this visit.`}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[520px]">
                                <thead>
                                    <tr>
                                        <TH>Service</TH>
                                        <TH className={COL_RULE}>Group</TH>
                                        <TH className={COL_RULE}>Counts towards</TH>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {services.length === 0 && (
                                        <EmptyRow colSpan={3} Icon={Wrench} title="Nothing itemised on this entry" />
                                    )}
                                    {services.map((sv) => (
                                        <tr key={sv.id} className="transition-colors hover:bg-slate-50/60">
                                            <TD>
                                                <div className="flex items-center gap-3">
                                                    <RowIcon Icon={Wrench} tone="blue" />
                                                    <span className="font-semibold text-slate-900">{sv.name}</span>
                                                </div>
                                            </TD>
                                            <TD className={cn(COL_RULE, 'text-sm text-slate-600')}>
                                                {sv.group ?? <span className="text-slate-300">—</span>}
                                            </TD>
                                            <TD className={cn(COL_RULE, 'text-sm text-slate-700')}>
                                                {interval
                                                    ? interval.name
                                                    : <span className="text-slate-400">No interval — one-off repair</span>}
                                            </TD>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <div className="grid gap-5 lg:grid-cols-2">
                        {/* ── The unit ── */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <RowIcon Icon={AssetIcon} tone="blue" />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-bold text-slate-900">{asset.label}</div>
                                        <p className="truncate text-xs text-slate-500">
                                            {asset.kind === 'truck' ? 'Truck' : 'Trailer'}
                                            {asset.description ? ` · ${asset.description}` : ''}
                                        </p>
                                    </div>
                                </div>
                                {onOpenAsset && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenAsset(asset.id)}
                                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Open
                                    </button>
                                )}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <Field label="Driver" value={asset.driver} Icon={UserRound} />
                                <Field label="Odometer now" value={`${asset.odometer.toLocaleString()} mi`} Icon={Gauge} />
                                <Field label="Hours now" value={`${asset.engineHours.toLocaleString()} h`} Icon={Clock} />
                                <Field
                                    label="Travelled since"
                                    value={e.odometer != null
                                        ? `${Math.max(0, asset.odometer - e.odometer).toLocaleString()} mi`
                                        : undefined}
                                />
                            </div>
                        </div>

                        {/* ── The clock it reset ── */}
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-slate-900">
                                        {interval?.name ?? 'Not on an interval'}
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">
                                        {interval
                                            ? 'This service is what the next one is counted from.'
                                            : 'A one-off repair resets no clock.'}
                                    </p>
                                </div>
                                {interval && onOpenInterval && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenInterval(interval.id)}
                                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Open
                                    </button>
                                )}
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <Field
                                    label="Runs every"
                                    value={interval?.every.length ? interval.every.join(' · ') : undefined}
                                />
                                <Field label="Next due after this" value={interval?.nextDueText} />
                                <div className="col-span-2">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Where the readings came from
                                    </div>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', reading.cls)}>
                                            {reading.label}
                                        </span>
                                        <span className="text-[12px] text-slate-500">{reading.hint}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Who did it ── full width now that what they sent has a tab of
                        its own: a half-width card with nothing beside it is a layout left
                        over from a block that moved. */}
                    <div className="grid gap-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-3">
                                <RowIcon Icon={Store} tone="slate" />
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-bold text-slate-900">
                                        {vendor?.name ?? 'No vendor on this entry'}
                                    </div>
                                    <p className="truncate text-xs text-slate-500">
                                        {order ? order.name : SOURCE_LABEL[e.source]}
                                    </p>
                                </div>
                            </div>
                            {/* Three dashes under three labels is a card that looks broken.
                                A shop with no contact details on file is a real thing — it
                                says which, and keeps the invoice number, which is the one
                                fact that is there. */}
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {vendor && !vendor.contactName && !vendor.email && !vendor.phone ? (
                                    <p className="col-span-2 text-[12px] text-slate-500">
                                        No contact details on file for this vendor.
                                    </p>
                                ) : (<>
                                    <Field label="Contact" value={vendor?.contactName} Icon={UserRound} />
                                    <Field label="Email" value={vendor?.email} Icon={Mail} />
                                    <Field label="Phone" value={vendor?.phone} Icon={Phone} />
                                </>)}
                                <Field label="Invoice" value={e.invoiceNumber ?? order?.invoiceNumber} />
                            </div>
                            {e.notes && (
                                <p className="mt-4 border-t border-slate-100 pt-3 text-[13px] leading-relaxed text-slate-600">
                                    {e.notes}
                                </p>
                            )}
                            {/* What the shop said to watch — about the NEXT visit, not this
                                one, so it is marked rather than run on from the note. It is
                                read when the rule next comes round, which is the point of
                                having written it down. */}
                            {e.remarks && (
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                        Remarks for next time
                                    </span>
                                    <p className="mt-0.5 text-[13px] leading-relaxed text-amber-900">{e.remarks}</p>
                                </div>
                            )}
                        </div>


                    </div>

                    {/* ── Either side of it ── a maintenance record is read as a sequence:
                        what was done before this, and what came after. */}
                    {(previous || next) && (
                        <Card title="Either side of this one" subtitle={`On ${asset.label}, against the same interval.`}>
                            <div className="divide-y divide-slate-100">
                                {previous && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenEvent?.(previous.id)}
                                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50/60"
                                    >
                                        <ArrowLeft size={15} className="shrink-0 text-slate-400" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13px] font-semibold text-slate-800">
                                                Previous · {shortDate(previous.performedAt)}
                                            </div>
                                            <p className="truncate text-[11px] text-slate-500">
                                                {previous.odometer != null ? `${previous.odometer.toLocaleString()} mi` : 'No reading'}
                                                {e.odometer != null && previous.odometer != null
                                                    ? ` · ${(e.odometer - previous.odometer).toLocaleString()} mi between services`
                                                    : ''}
                                            </p>
                                        </div>
                                    </button>
                                )}
                                {next && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenEvent?.(next.id)}
                                        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50/60"
                                    >
                                        <ArrowRight size={15} className="shrink-0 text-slate-400" />
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[13px] font-semibold text-slate-800">
                                                Next · {shortDate(next.performedAt)}
                                            </div>
                                            <p className="truncate text-[11px] text-slate-500">
                                                {next.odometer != null ? `${next.odometer.toLocaleString()} mi` : 'No reading'}
                                            </p>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </Card>
                    )}
                    </>)}

                    {/* @@ Documents @@ the paper the record stands on. Its own tab because
                        "show me the invoice" is one of the two things anybody opens an
                        entry for, and it was the sixth card down the page. */}
                    {tab === 'documents' && (
                        <Card
                            title="Documents"
                            subtitle={`${e.files?.length ?? 0} file${(e.files?.length ?? 0) === 1 ? '' : 's'} filed with this service.`}
                        >
                            <div className="divide-y divide-slate-100">
                                {(e.files?.length ?? 0) === 0 && (
                                    <div className="p-8 text-center">
                                        <FileText size={26} className="mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-semibold text-slate-700">Nothing filed</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            The invoice and anything else the shop sent lands here.
                                        </p>
                                    </div>
                                )}
                                {(e.files ?? []).map((f, i) => (
                                    <div key={`${f.name}-${i}`} className="flex items-center gap-3 px-5 py-3">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                            <FileText size={16} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-[13px] font-semibold text-slate-800">{f.name}</div>
                                            {/* What it is, beside what it is called. Six PDFs off one
                                                visit are six machine names otherwise, and the only way
                                                to find the certificate is to open all six. */}
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                                {(f.tags ?? []).map((t) => (
                                                    <span key={t} className={cn(
                                                        'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold',
                                                        tagColor(t))}>
                                                        {t}
                                                    </span>
                                                ))}
                                                <span className="text-[11px] text-slate-400">
                                                    {f.size ? `${Math.max(1, Math.round(f.size / 1024))} KB` : 'PDF'}
                                                </span>
                                            </div>
                                        </div>
                                        {f.url && (
                                            <div className="flex shrink-0 items-center gap-1">
                                                <a
                                                    href={f.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50"
                                                >
                                                    <Eye size={13} /> View
                                                </a>
                                                <a
                                                    href={f.url}
                                                    download
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                    aria-label={`Download ${f.name}`}
                                                >
                                                    <Download size={13} />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* ── Activity ── what has happened TO this entry, as opposed to what it
                        says happened to the truck: how it arrived, every correction it
                        carries and what it said before, and the certificate it filed. */}
                    {tab === 'activity' && (
                        <ActivityTimeline
                            entries={activity}
                            heading="Activity"
                            emptyText="Nothing has happened to this entry since it was filed."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
