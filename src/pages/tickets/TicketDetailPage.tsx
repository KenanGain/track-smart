/**
 * Ticket Detail — a dedicated full page (not a modal), modelled on the Accident
 * detail page: a fixed summary header + a tab bar (Overview · Documents · Review ·
 * Activity) over a scrollable body. Read-only; "Edit" opens the ticket form.
 *
 * The REVIEW tab is the same lifecycle a safety event or an HOS violation carries: verify
 * what happened, then close it by choosing what to do about the driver. Choosing "Issue
 * warning letter" files the letter as that driver's compliance record, carrying this
 * ticket's own details — see `record-review` and `warning-letters`.
 */

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import {
    ChevronLeft, ChevronRight, Pencil, FileText, User, MapPin, Ticket as TicketIcon, Hash,
    DollarSign, Clock, FileCheck, Paperclip, List, MoreVertical, Trash2,
    CheckCircle2, CalendarClock, Truck, Container, Bell, BellOff, Pencil as PencilSm, type LucideIcon,
} from 'lucide-react';
import { MonitoringToggle } from '@/pages/compliance/MonitoringToggle';
import type { MonitoringConfig } from '@/pages/compliance/compliance-data-store';
import { ResolutionSendDialog, isDeliveredDisposition } from '@/components/share/ResolutionSendDialog';
import { getDriverById } from '@/pages/accounts/carrier-drivers.data';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import type { HosDisposition } from '@/pages/hos/hos-violations.data';
import { defaultTicketMonitoring } from './tickets.data';
import { updateTicket } from './tickets.store';
import { TicketStatusSelect, TICKET_STATUS_TONE } from './ticket-status';
import { resolveTicketVehicle, vehicleLine } from './ticket-vehicles';
import { cn } from '@/lib/utils';
import { useAppData } from '@/context/AppDataContext';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
import { activityMeta, ACTIVITY_BADGE_TONE } from '@/components/ui/activity-kinds';
import { ShareToChat, type ShareItem } from '@/components/share/ShareToChat';
import { ShareButton } from '@/components/share/ShareButton';
import { setMessagesFocus } from '@/pages/messages/messages-store';
import { ReviewResolutionTab, toActivityEntries } from '@/components/ui/ReviewResolution';
import { useRecordReview } from '@/components/ui/record-review';
import type { TicketRecord } from './tickets.data';

const STATUS_TONE = TICKET_STATUS_TONE;

/** "in 12 days", "today", "3 days ago" — how far a date is from now. */
function daysFrom(ymd?: string): { n: number; text: string; tone: string } | null {
    if (!ymd) return null;
    const d = new Date(`${ymd.slice(0, 10)}T00:00:00`);
    if (isNaN(d.getTime())) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const n = Math.round((d.getTime() - today.getTime()) / 86400000);
    const text = n === 0 ? 'today' : n > 0 ? `in ${n} day${n === 1 ? '' : 's'}` : `${-n} day${n === -1 ? '' : 's'} ago`;
    const tone = n < 0 ? 'text-rose-600' : n <= 7 ? 'text-amber-600' : 'text-slate-500';
    return { n, text, tone };
}

/** One of the four figures under the header — the same tile the driver and asset pages carry. */
function StatTile({ icon: Icon, label, value, sub, tone = 'bg-blue-50 text-blue-600' }: { icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tone)}><Icon size={16} /></span>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                <div className="truncate text-[15px] font-bold text-slate-900">{value}</div>
                {sub && <p className="truncate text-[11px] text-slate-500">{sub}</p>}
            </div>
        </div>
    );
}

/**
 * A monitored date on the page: the date, how far off, and whether reminders are on.
 * Clicking it opens the same date + monitoring block the form has, in place, so the date
 * or its reminders can be changed without opening the whole ticket for editing.
 */
function MonitoredDate({ label, date, cfg, recordId, issueDate, status, onSave }: {
    label: string; date?: string; cfg?: MonitoringConfig;
    recordId: string; issueDate: string; status: string;
    onSave: (date: string, cfg: MonitoringConfig) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draftDate, setDraftDate] = useState(date ?? '');
    const [draftCfg, setDraftCfg] = useState<MonitoringConfig>(cfg ?? defaultTicketMonitoring());
    const d = daysFrom(date);
    const on = !!date && (cfg?.enabled ?? false);
    const rem = cfg?.reminders?.filter(x => x > 0).sort((a, b) => b - a) ?? [];
    const open = () => { setDraftDate(date ?? ''); setDraftCfg(cfg ?? defaultTicketMonitoring()); setEditing(true); };
    if (editing) {
        return (
            <div className="rounded-lg border border-blue-200 bg-white px-3.5 py-3 ring-2 ring-blue-500/10">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                    <span className="text-[10px] font-semibold text-blue-600">Editing</span>
                </div>
                <input type="date" value={draftDate} onChange={e => setDraftDate(e.target.value)} aria-label={label}
                    className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none sm:w-56" />
                <div className="mt-3">
                    <MonitoringToggle
                        record={{ id: recordId, monitorType: label }}
                        monitoring={draftCfg} issueDate={issueDate} expiryDate={draftDate} status={status}
                        onChange={setDraftCfg} />
                </div>
                <div className="mt-3 flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => { onSave(draftDate, draftCfg); setEditing(false); }} className="rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-blue-700">Save</button>
                </div>
            </div>
        );
    }
    return (
        <div role="button" tabIndex={0} onClick={open} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}
            title="Click to change the date or its monitoring"
            className="group cursor-pointer rounded-lg border border-slate-200 bg-slate-50/60 px-3.5 py-3 transition-colors hover:border-blue-300 hover:bg-blue-50/40">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <span className="flex items-center gap-1.5">
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', on ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-400')}>
                        {on ? <Bell size={10} /> : <BellOff size={10} />} {on ? 'Monitoring on' : 'Monitoring off'}
                    </span>
                    <PencilSm size={12} className="text-slate-300 transition-colors group-hover:text-blue-500" />
                </span>
            </div>
            <p className="mt-1 text-[15px] font-bold tabular-nums text-slate-900">{date || <span className="text-slate-300">—</span>}{d && <span className={cn('ml-2 text-[12px] font-semibold', d.tone)}>{d.text}</span>}</p>
            {on && (
                <p className="mt-1 text-[11px] text-slate-500">
                    {rem.length ? `Reminders ${rem.join(', ')} days before` : 'No reminder days'}{cfg?.reminders?.includes(0) ? ' + on the date' : ''} · via {[cfg?.channels.email && 'email', cfg?.channels.inApp && 'in-app'].filter(Boolean).join(', ') || 'no channel'}
                </p>
            )}
        </div>
    );
}

/** Vehicle 1 or 2, as the ticket names it. */
function VehicleCard({ title, icon: Icon, v }: { title: string; icon: LucideIcon; v?: ReturnType<typeof resolveTicketVehicle> }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500"><Icon size={13} className="text-blue-500" /> {title}</p>
            {v?.assetId || v?.unitNumber ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Field label="Unit #" value={v.unitNumber} />
                    <Field label="Vehicle" value={[v.label, v.kind].filter(Boolean).join(' · ')} />
                    <Field label="Plate" value={v.plateNumber} mono />
                    <Field label="Jurisdiction" value={v.plateJurisdiction} />
                    <div className="col-span-2"><Field label="VIN" value={v.vin} mono /></div>
                </dl>
            ) : (
                <p className="text-[13px] text-slate-400">Not on this ticket</p>
            )}
        </div>
    );
}

function Field({ label, value, mono, wide }: { label: string; value?: ReactNode; mono?: boolean; wide?: boolean }) {
    const empty = value === undefined || value === null || value === '' || value === false;
    return (
        <div className={wide ? 'col-span-2 sm:col-span-3' : ''}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
            <dd className={cn('mt-0.5 text-[13px] text-slate-800', mono && 'font-mono')}>{empty ? <span className="text-slate-300">—</span> : value}</dd>
        </div>
    );
}
function Grid({ children }: { children: ReactNode }) {
    return <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{children}</dl>;
}
function InfoCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
    const id = 'tk-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return (
        <div id={id} data-tk-section={title} className="scroll-mt-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
                <Icon size={15} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">{title}</h3>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

/** Section navigator for the Overview — sticky right-hand "Jump to section" card on
 *  desktop, floating pill on mobile, with scroll-spy. Built from the rendered InfoCards. */
function TicketSectionNav({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
    const [open, setOpen] = useState(false);
    const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
    const [active, setActive] = useState('');
    useEffect(() => {
        const els = Array.from(containerRef.current?.querySelectorAll<HTMLElement>('[data-tk-section]') ?? []);
        setSections(els.map(e => ({ id: e.id, title: e.getAttribute('data-tk-section') || '' })));
        if (!els.length) return;
        setActive(a => a || els[0].id);
        const visible = new Set<string>();
        const io = new IntersectionObserver(entries => {
            for (const e of entries) { if (e.isIntersecting) visible.add(e.target.id); else visible.delete(e.target.id); }
            const first = els.find(el => visible.has(el.id));
            if (first) setActive(first.id);
        }, { rootMargin: '-130px 0px -55% 0px', threshold: 0 });
        els.forEach(e => io.observe(e));
        return () => io.disconnect();
    }, [containerRef]);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('[data-tk-nav]')) setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);
    const go = (id: string, close?: boolean) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); if (close) setOpen(false); };
    if (!sections.length) return null;
    return (
        <>
            {/* Desktop — sticky right-hand section navigator */}
            <aside className="hidden w-56 shrink-0 lg:block">
                <div className="sticky top-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <p className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"><List size={12} /> Jump to section</p>
                    <nav className="max-h-[calc(100vh-180px)] space-y-0.5 overflow-y-auto">
                        {sections.map(s => {
                            const on = s.id === active;
                            return (
                                <button key={s.id} type="button" onClick={() => go(s.id)}
                                    className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors',
                                        on ? 'bg-blue-50 font-semibold text-blue-700' : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800')}>
                                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', on ? 'bg-blue-500' : 'bg-slate-300')} />
                                    <span className="truncate">{s.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Mobile — floating "Sections" pill */}
            <div data-tk-nav className="lg:hidden">
                <div className="fixed bottom-4 right-4 z-40">
                    {open && (
                        <div className="absolute bottom-full right-0 mb-2 max-h-[min(60vh,360px)] w-60 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                            <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Jump to section</p>
                            {sections.map(s => (
                                <button key={s.id} type="button" onClick={() => go(s.id, true)}
                                    className={cn('flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium hover:bg-slate-50', s.id === active ? 'text-blue-700' : 'text-slate-700')}>
                                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', s.id === active ? 'bg-blue-500' : 'bg-slate-300')} />{s.title}
                                </button>
                            ))}
                        </div>
                    )}
                    <button type="button" onClick={() => setOpen(v => !v)} title="Jump to section" aria-expanded={open}
                        className={cn('inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[13px] font-semibold shadow-lg transition-colors',
                            open ? 'border-blue-300 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
                        <List size={16} /> Sections
                    </button>
                </div>
            </div>
        </>
    );
}

/** Kebab (⋯) header menu — a small dropdown with Edit / Delete, matching the accident detail page. */
function HeaderMenu({ items }: { items: { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean }[] }) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
        if (!open) return;
        const onDown = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('[data-hdr-menu]')) setOpen(false); };
        document.addEventListener('pointerdown', onDown);
        return () => document.removeEventListener('pointerdown', onDown);
    }, [open]);
    return (
        <div data-hdr-menu className="relative">
            <button type="button" onClick={() => setOpen(v => !v)} aria-label="More actions"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700">
                <MoreVertical size={16} />
            </button>
            {open && (
                <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                    {items.map((it, i) => (
                        <button key={i} type="button" onClick={() => { setOpen(false); it.onClick(); }}
                            className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium transition-colors hover:bg-slate-50', it.danger ? 'text-rose-600' : 'text-slate-700')}>
                            <it.icon size={14} className={it.danger ? 'text-rose-500' : 'text-slate-400'} /> {it.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function TicketDetailPage({ ticket, onBack, onEdit, onDelete, onNavigate, accountId, currentUserName = 'Safety Manager' }: {
    ticket: TicketRecord; onBack: () => void; onEdit: () => void; onDelete?: () => void; onNavigate?: (path: string) => void;
    accountId?: string; currentUserName?: string;
}) {
    const [tab, setTab] = useState<'overview' | 'documents' | 'review' | 'activity'>('overview');
    /** The resolution being sent to the driver, while its dialog is open. */
    const [sendDisp, setSendDisp] = useState<HosDisposition | null>(null);
    const [shareOpen, setShareOpen] = useState(false);
    const overviewRef = useRef<HTMLDivElement>(null);
    const { documents: allDocTypes } = useAppData();
    const docTypeName = (id?: string) => allDocTypes.find(d => d.id === id)?.name ?? id ?? 'Document';

    const ids = ticket.identifiers ?? {};
    const details = ticket.ticketDetails ?? {};
    const isElectronic = ticket.ticketKind === 'Electronic';
    const docs = ticket.attachedDocuments ?? [];
    const sym = ticket.currency === 'CAD' ? 'CA$' : '$';
    const money = `${sym}${ticket.fineAmount.toFixed(2)} ${ticket.currency}`;
    const legal = ticket.legalExpense ?? 0;
    const totalMoney = `${sym}${(ticket.fineAmount + legal).toFixed(2)} ${ticket.currency}`;
    const st = STATUS_TONE[ticket.status] ?? STATUS_TONE['Closed'];
    const v1 = resolveTicketVehicle(ticket, accountId);
    const v2 = resolveTicketVehicle(ticket, accountId, 2);
    const due = daysFrom(ticket.dueDate);
    const fin = daysFrom(ticket.finalDate);
    // The status is changed where it is read — the header, the tile, the card all save it.
    const setStatus = (status: TicketRecord['status']) => updateTicket(ticket.id, { status });

    // File presence indicators (from the record flags + attached docs).
    const fileIndicators = [
        { label: 'Ticket file', on: ticket.hasTicketFile },
        { label: 'Receipt', on: ticket.hasReceiptFile },
        { label: 'Notice', on: ticket.hasNoticeFile },
    ];

    // Everything shareable in a chat — the ticket's files + attached documents.
    const shareItems: ShareItem[] = [
        ...fileIndicators.filter(f => f.on).map(f => ({ name: `${f.label.replace(/\s+/g, '-').toLowerCase()}-${ticket.offenseNumber}.pdf`, group: 'Ticket files' })),
        ...docs.flatMap(d => {
            const label = d.docTypeName || d.fileName || 'Document';
            if (d.files && d.files.length) return d.files.map(f => ({ name: f.fileName, group: label }));
            return [{ name: d.fileName || `${label}.pdf`, group: 'Documents' }];
        }),
    ];

    // Synthesized activity timeline — tickets don't carry a live audit log, so we
    // derive a full, believable sequence from the record: issued → recorded →
    // opened → documents uploaded → shared → (linked / assigned) → note → status.
    const clerk = 'Dana Whitfield';
    const driverName = ticket.driverName || 'Driver';
    const officeBadge = { label: 'Office', tone: ACTIVITY_BADGE_TONE.Office };
    const sysBadge = { label: 'System', tone: ACTIVITY_BADGE_TONE.System };
    const A = (id: string, kind: string, title: string, detail: string, by: string, badge: { label: string; tone: string }): ActivityEntry => {
        const m = activityMeta(kind);
        return { id, icon: m.icon, iconTone: m.dot, title, detail, by, badge, at: ticket.date };
    };
    const activity: ActivityEntry[] = [
        { id: 'issued', icon: TicketIcon, iconTone: 'bg-blue-500', title: 'Ticket issued', badge: { label: 'Citation', tone: 'bg-blue-100 text-blue-700' }, by: 'Traffic Enforcement', detail: `${ticket.violationType}${ticket.location ? ` · ${ticket.location}` : ''}`, at: `${ticket.date}${ticket.time ? ` · ${ticket.time}` : ''}` },
        A('recorded', 'recorded', 'Recorded in system', `Logged as ticket ${ticket.offenseNumber}`, 'System', sysBadge),
        A('viewed', 'viewed', 'Opened by office', 'Reviewed the citation and driver details', clerk, officeBadge),
        ...fileIndicators.filter(f => f.on).map((f, i) => A(`doc-${i}`, 'uploaded', `${f.label} uploaded`, 'Attached to the ticket record', clerk, officeBadge)),
        A('shared', 'shared', 'Shared with driver', `${driverName} notified of the citation`, clerk, officeBadge),
        ...(ticket.accidentNumber ? [A('linked', 'message', 'Linked to accident', `Cross-referenced accident ${ticket.accidentNumber}`, clerk, officeBadge)] : []),
        ...(ticket.assignedToThirdParty ? [A('assigned', 'assigned', 'Assigned to third party', (ticket as any).assigneeName || 'Third-party handler', clerk, officeBadge)] : []),
        A('note', 'note', 'Note added', 'Driver coaching scheduled; monitor for repeat offenses.', clerk, officeBadge),
        { id: 'status', icon: CheckCircle2, iconTone: st.dot, title: `Status — ${ticket.status}`, by: clerk, detail: `Fine ${money}`, at: ticket.date, badge: officeBadge },
    ];

    // A warning letter issued from a ticket must SAY it came from a ticket, and carry the
    // citation with it — the charge, the offense number, the date. A file of letters that
    // all read "Warning Letter" is unusable.
    const warningSource = useMemo(() => ({
        kind: 'ticket' as const,
        driverId: ticket.driverId || '',
        driverName: ticket.driverName,
        eventType: ticket.violationType || 'Traffic violation',
        reference: ticket.offenseNumber || ticket.id,
        // The offense number is what a person reads; the row id is what opens the ticket.
        sourceId: ticket.id,
        eventDate: ticket.date,
    }), [ticket.driverId, ticket.driverName, ticket.violationType, ticket.offenseNumber, ticket.id, ticket.date]);
    const rv = useRecordReview({ kind: 'ticket', id: ticket.id, accountId, currentUser: currentUserName, source: warningSource });
    // The driver's email from the roster, for the external-chat and email deliveries.
    // Falls back to the demo drivers, which the demo tickets are written against.
    const driverEmail = useMemo(() => (accountId && ticket.driverId ? getDriverById(accountId, ticket.driverId)?.email : undefined)
        ?? MOCK_DRIVERS.find(d => d.id === ticket.driverId)?.email ?? '', [accountId, ticket.driverId]);
    const about = `Ticket ${ticket.offenseNumber} · ${ticket.violationSubtype || ticket.violationType}`;
    const convSource = { type: 'ticket' as const, id: ticket.offenseNumber, label: `Ticket ${ticket.offenseNumber}` };
    const recordRef = { type: 'ticket', id: ticket.id, label: `Ticket ${ticket.offenseNumber}`, sublabel: `${ticket.violationSubtype || ticket.violationType} · ${ticket.driverName}`, path: '/tickets' };

    const TABS: { id: typeof tab; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'documents', label: 'Documents', count: docs.length || undefined },
        { id: 'review', label: 'Review' },
        { id: 'activity', label: 'Activity', count: activity.length + rv.activityCount },
    ];

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50">
            {/* Header band — the same shape as the driver and asset pages: breadcrumb strip,
                icon + title + chips + meta, the actions, four figures, then the tabs. */}
            <div className="shrink-0 border-b border-slate-200 bg-white shadow-sm">
                <header className="flex h-11 items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-4 sm:px-8">
                    <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-blue-600">
                        <ChevronLeft size={13} /> Back to Tickets
                    </button>
                    <span aria-hidden className="h-4 w-px bg-slate-200" />
                    <nav className="flex min-w-0 items-center text-xs font-medium text-slate-500">
                        <span className="cursor-pointer text-slate-400 transition-colors hover:text-blue-600" onClick={onBack}>Tickets</span>
                        <ChevronRight size={12} className="mx-1.5 shrink-0 text-slate-300" />
                        <span className="truncate font-semibold text-slate-700">{ticket.offenseNumber}</span>
                    </nav>
                </header>

                <div className="px-4 py-5 sm:px-8">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                            <div className="relative shrink-0">
                                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-[3px] border-white bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 shadow-md ring-1 ring-slate-200/60">
                                    <TicketIcon size={30} />
                                </div>
                                <span className={cn('absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white shadow-sm', st.dot)} title={ticket.status} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Ticket {ticket.offenseNumber}</h1>
                                    <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', isElectronic ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-blue-200 bg-blue-50 text-blue-700')}>{isElectronic ? 'eTicket' : 'Paper ticket'}</span>
                                    {ticket.isOos && <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700">OOS-qualifying</span>}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-2.5 text-xs text-slate-500">
                                    <span className="flex items-center gap-1 font-medium text-slate-700"><User size={12} className="text-slate-400" /> {ticket.driverName || '—'}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1"><Truck size={12} className="text-slate-400" /> {vehicleLine(v1) || '—'}{v2?.unitNumber ? ` + ${v2.unitNumber}` : ''}</span>
                                    <span className="text-slate-300">|</span>
                                    <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400" /> {ticket.date}{ticket.time && ticket.time !== '00:00' ? ` · ${ticket.time}` : ''}</span>
                                    {ticket.location && <><span className="text-slate-300">|</span><span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {ticket.location}</span></>}
                                    <span className="text-slate-300">|</span>
                                    <TicketStatusSelect value={ticket.status} onChange={setStatus} />
                                </div>
                                <p className="mt-1.5 text-[13px] text-slate-600">{ticket.violationSubtype || ticket.violationType}{ticket.violations && ticket.violations.length > 1 ? ` · +${ticket.violations.length - 1} more` : ''}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">
                            <ShareButton onClick={() => setShareOpen(true)} />
                            <button type="button" onClick={onEdit} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:bg-blue-700">
                                <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Edit Ticket</span><span className="sm:hidden">Edit</span>
                            </button>
                            <HeaderMenu items={[
                                { label: 'Edit ticket', icon: Pencil, onClick: onEdit },
                                { label: 'Delete ticket', icon: Trash2, onClick: () => onDelete?.(), danger: true },
                            ]} />
                        </div>
                    </div>

                    {/* The four figures */}
                    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatTile icon={CheckCircle2} label="Status" tone={cn(st.chip.replace(/border-\S+/, ''), '')}
                            value={<TicketStatusSelect value={ticket.status} onChange={setStatus} size="md" />}
                            sub={ticket.status === 'Paid' ? 'Settled' : ticket.status === 'In Court' ? 'Awaiting hearing' : ticket.status === 'Closed' ? 'Nothing left to do' : 'Fine outstanding'} />
                        <StatTile icon={DollarSign} label="Fine" tone="bg-rose-50 text-rose-600" value={money}
                            sub={legal ? `+ ${sym}${legal.toFixed(2)} legal expense · total ${totalMoney}` : 'No legal expense recorded'} />
                        <StatTile icon={CalendarClock} label="Ticket due date" tone={due && due.n < 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}
                            value={ticket.dueDate || '—'} sub={due ? <span className={due.tone}>{due.n < 0 ? `Overdue · ${due.text}` : `Due ${due.text}`}{ticket.dueMonitoring?.enabled ? ' · monitored' : ''}</span> : 'Not set'} />
                        <StatTile icon={CalendarClock} label="Final date" tone="bg-slate-100 text-slate-600"
                            value={ticket.finalDate || '—'} sub={fin ? <span className={fin.tone}>{fin.n < 0 ? `Passed · ${fin.text}` : fin.text}{ticket.finalMonitoring?.enabled ? ' · monitored' : ''}</span> : 'Not set'} />
                    </div>

                    {/* Tabs */}
                    <div className="-mb-5 mt-4 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1">
                        {TABS.map(t => {
                            const on = tab === t.id;
                            return (
                                <button key={t.id} type="button" onClick={() => setTab(t.id)}
                                    className={cn('inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                                        on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                                    {t.label}
                                    {t.count !== undefined && <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', on ? 'bg-blue-100 text-blue-700' : 'bg-slate-200/70 text-slate-600')}>{t.count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Scrollable tab body */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-5 pb-8 sm:px-8">
                <div className="mx-auto w-full max-w-[1200px] space-y-5">

                    {tab === 'overview' && (
                        <div className="lg:flex lg:gap-6">
                        <div ref={overviewRef} className="min-w-0 flex-1 space-y-5">
                            <InfoCard title="Driver & Vehicles" icon={User}>
                                <Grid>
                                    <Field label="Driver" value={ticket.driverName} />
                                    <Field label="Driver ID" value={ticket.driverId} mono />
                                    <Field label="Driver licence" value={ids.driverLicenceNumber} mono />
                                </Grid>
                                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <VehicleCard title="Vehicle 1 — power unit" icon={Truck} v={v1} />
                                    <VehicleCard title="Vehicle 2 — trailer" icon={Container} v={v2} />
                                </div>
                            </InfoCard>

                            <InfoCard title="Where & when" icon={MapPin}>
                                <Grid>
                                    <Field label="Date" value={ticket.date} />
                                    <Field label="Time" value={ticket.time} />
                                    <Field label="Location" value={ticket.location} />
                                    <Field label="Description" value={ticket.description} wide />
                                </Grid>
                            </InfoCard>

                            <InfoCard title="Violation" icon={FileText}>
                                <Grid>
                                    <Field label="Type" value={ticket.violationType} />
                                    <Field label="Code" value={ids.violationCode} mono />
                                    <Field label="Statute section" value={ids.statuteSection} mono />
                                    <Field label="Description" value={ticket.violationSubtype} wide />
                                    <Field label="Category" value={ticket.violationCategory} />
                                    <Field label="Sub-category" value={ticket.violationGroup} />
                                    {ticket.violations && ticket.violations.length > 0 && (
                                        <Field
                                            label={`All violations · ${ticket.violations.length}`}
                                            wide
                                            value={
                                                <div className="flex flex-col gap-1.5">
                                                    {ticket.violations.map((v, i) => (
                                                        <div key={`${v.label}-${i}`} className="flex flex-wrap items-center gap-1.5">
                                                            {i === 0 && (
                                                                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-600 text-white">Primary</span>
                                                            )}
                                                            <span className="text-[13px] font-semibold text-slate-800">{v.label}</span>
                                                            {v.code && <span className="text-[10px] font-mono text-slate-400">code {v.code}</span>}
                                                            {v.category && (
                                                                <span className="inline-flex items-center rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{v.category}</span>
                                                            )}
                                                            {v.isOos && (
                                                                <span className="inline-flex items-center rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-700">OOS</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            }
                                        />
                                    )}
                                </Grid>
                            </InfoCard>

                            <InfoCard title="Identifiers" icon={Hash}>
                                <Grid>
                                    <Field label="Ticket citation number" value={ticket.offenseNumber} mono />
                                    <Field label="Microfilm number" value={ids.microfilmNumber} mono />
                                    <Field label="Linked accident #" value={ticket.accidentNumber} mono />
                                    <Field label="Docket #" value={ids.docketNumber} mono />
                                    <Field label="Court case #" value={ids.courtCaseNumber} mono />
                                    <Field label="Receipt #" value={ids.receiptNumber} mono />
                                    <Field label="USDOT" value={ids.usdotNumber} mono />
                                    <Field label="CVOR / NSC" value={ids.cvorNumber || ids.nscNumber} mono />
                                </Grid>
                            </InfoCard>

                            <InfoCard title={isElectronic ? 'Electronic ticket detail' : 'Paper ticket detail'} icon={isElectronic ? TicketIcon : Clock}>
                                <Grid>
                                    {isElectronic ? (
                                        <>
                                            <Field label="Portal URL" value={details.portalUrl} mono wide />
                                            <Field label="QR reference" value={details.qrReference} mono />
                                            <Field label="Issuing device" value={details.eIssuingDevice} />
                                        </>
                                    ) : (
                                        <>
                                            <Field label="Officer" value={details.officerName} />
                                            <Field label="Officer badge" value={details.officerBadge} mono />
                                            <Field label="Court location" value={details.courtLocation} />
                                            <Field label="Court date" value={details.courtDate} />
                                        </>
                                    )}
                                </Grid>
                            </InfoCard>

                            <InfoCard title="Money, dates & status" icon={DollarSign}>
                                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                                    <MonitoredDate label="Ticket due date" date={ticket.dueDate} cfg={ticket.dueMonitoring} recordId="ticket-due" issueDate={ticket.date} status={ticket.status}
                                        onSave={(dueDate, dueMonitoring) => updateTicket(ticket.id, { dueDate: dueDate || undefined, dueMonitoring })} />
                                    <MonitoredDate label="Final date" date={ticket.finalDate} cfg={ticket.finalMonitoring} recordId="ticket-final" issueDate={ticket.date} status={ticket.status}
                                        onSave={(finalDate, finalMonitoring) => updateTicket(ticket.id, { finalDate: finalDate || undefined, finalMonitoring })} />
                                </div>
                                <Grid>
                                    <Field label="Fine" value={money} />
                                    <Field label="Legal expense" value={legal ? `${sym}${legal.toFixed(2)} ${ticket.currency}` : undefined} />
                                    <Field label="Total" value={<span className="font-bold">{totalMoney}</span>} />
                                    <Field label="Status" value={<TicketStatusSelect value={ticket.status} onChange={setStatus} />} />
                                    <Field label="Currency" value={ticket.currency} />
                                    {ticket.demeritPoints !== undefined && <Field label="Demerit points" value={String(ticket.demeritPoints)} />}
                                    {ticket.outOfService !== undefined && (
                                        <Field
                                            label="Out of service"
                                            value={
                                                <span className={cn(
                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold',
                                                    ticket.outOfService ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                                                )}>
                                                    {ticket.outOfService ? 'Yes' : 'No'}
                                                </span>
                                            }
                                        />
                                    )}
                                    {ticket.commercialVehicle !== undefined && (
                                        <Field
                                            label="Commercial vehicle"
                                            value={
                                                <span className={cn(
                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold',
                                                    ticket.commercialVehicle ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600'
                                                )}>
                                                    {ticket.commercialVehicle ? 'Yes' : 'No'}
                                                </span>
                                            }
                                        />
                                    )}
                                    {ticket.penalties && ticket.penalties.length > 0 && (
                                        <Field
                                            label="Penalty / fine"
                                            wide
                                            value={
                                                <div className="flex flex-wrap gap-1.5">
                                                    {ticket.penalties.map(p => (
                                                        <span key={p} className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            }
                                        />
                                    )}
                                </Grid>
                            </InfoCard>
                        </div>
                        <TicketSectionNav containerRef={overviewRef} />
                        </div>
                    )}

                    {tab === 'documents' && (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
                                <div className="flex items-center gap-2">
                                    <Paperclip size={15} className="text-blue-600" />
                                    <h3 className="text-sm font-bold text-slate-800">Ticket documents</h3>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {fileIndicators.map(f => (
                                        <span key={f.label} className={cn('inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold', f.on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-400')}>
                                            <FileText size={12} className={f.on ? 'text-emerald-600' : 'text-slate-300'} /> {f.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-5">
                                {docs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Paperclip size={22} /></div>
                                        <p className="text-sm font-semibold text-slate-700">No documents attached</p>
                                        <p className="mt-1 text-[13px] text-slate-400">Attach the ticket, summons, officer report or receipt from the edit form.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {docs.map((d, i) => {
                                            const files = d.files ?? (d.fileName ? [{ id: `f-${i}`, fileName: d.fileName }] : []);
                                            return (
                                                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileCheck size={15} /></span>
                                                            <div>
                                                                <p className="text-[13px] font-bold text-slate-800">{d.docTypeName || docTypeName(d.docTypeId)}</p>
                                                                <p className="text-[11px] text-slate-400">
                                                                    {d.docNumber ? <>#{d.docNumber}</> : 'No ticket number'}{d.issueDate ? ` · ${d.issueDate}` : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{files.length} file{files.length === 1 ? '' : 's'}</span>
                                                    </div>
                                                    {files.length > 0 && (
                                                        <div className="mt-3 space-y-1.5">
                                                            {files.map(f => (
                                                                <div key={f.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                                    <FileText size={14} className="shrink-0 text-emerald-600" />
                                                                    <span className="truncate text-[12px] font-medium text-slate-700" title={f.fileName}>{f.fileName}</span>
                                                                    {'fileSize' in f && f.fileSize != null && <span className="ml-auto shrink-0 text-[10px] text-slate-400">{Math.round(f.fileSize / 1024)} KB</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {tab === 'review' && (
                        <div className="lg:flex lg:gap-6">
                            <div className="min-w-0 flex-1 space-y-5">
                                {/* What the resolution is about — repeated here so a reviewer
                                    deciding on the driver is not reading the Overview tab from
                                    memory, and so the warning letter's contents are visible
                                    before it is issued. */}
                                <InfoCard title="Citation under review" icon={TicketIcon}>
                                    <Grid>
                                        <Field label="Driver" value={ticket.driverName} />
                                        <Field label="Ticket citation #" value={ticket.offenseNumber} mono />
                                        <Field label="Violation" value={ticket.violationType} />
                                        <Field label="Date" value={ticket.date} />
                                        <Field label="Location" value={ticket.location} />
                                        <Field label="Fine" value={money} />
                                    </Grid>
                                </InfoCard>
                                {rv.filedLetter && (
                                    <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                                        <FileCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                        <p className="text-[13px] leading-snug text-amber-800">
                                            <span className="font-semibold">{rv.filedLetter}</span> filed to {ticket.driverName || 'the driver'}&rsquo;s
                                            compliance records, carrying this citation&rsquo;s violation, offense number and date.
                                        </p>
                                    </div>
                                )}
                                <ReviewResolutionTab
                                    status={rv.review.status}
                                    subjectName={ticket.driverName || 'this driver'}
                                    disposition={rv.review.disposition}
                                    trainingName={rv.review.trainingName}
                                    reviewedBy={rv.review.reviewedBy}
                                    reviewNotes={rv.review.notes}
                                    verified={rv.review.verified}
                                    verifiedBy={rv.review.verifiedBy}
                                    onDispose={(d) => (isDeliveredDisposition(d) ? setSendDisp(d) : rv.dispose(d))}
                                    onAssignTraining={() => setSendDisp('training')}
                                    onReopen={rv.reopen}
                                    onAddNote={rv.addNote}
                                    onVerify={rv.verify}
                                />
                            </div>
                        </div>
                    )}

                    {tab === 'activity' && (
                        <ActivityTimeline heading="Activity" entries={[...activity, ...toActivityEntries(rv.review.activity, (at) => ({ date: at.slice(0, 10), time: at.slice(11) }))]} />
                    )}

                </div>
            </div>

            {sendDisp && (
                <ResolutionSendDialog
                    disposition={sendDisp}
                    driverName={ticket.driverName || 'the driver'}
                    driverEmail={driverEmail}
                    about={about}
                    when={ticket.date}
                    source={convSource}
                    record={recordRef}
                    onOpenInMessages={onNavigate ? (id) => { setMessagesFocus(id); onNavigate('/messages'); } : undefined}
                    onClose={() => setSendDisp(null)}
                    onSent={(r) => (sendDisp === 'training' ? rv.assignTraining(r.trainingName ?? '', r.via) : rv.dispose(sendDisp, undefined, r.via))}
                />
            )}

            {shareOpen && (
                <ShareToChat
                    open={shareOpen}
                    onClose={() => setShareOpen(false)}
                    title="Share ticket"
                    subtitle={`Share Ticket ${ticket.offenseNumber} in a chat — in-app or with an outsider by email.`}
                    source={{ type: 'ticket', id: ticket.offenseNumber, label: `Ticket ${ticket.offenseNumber}` }}
                    items={shareItems}
                    defaultChannel="in-app"
                    defaultSubject={`Ticket ${ticket.offenseNumber} — ${ticket.violationType}`}
                    defaultMessage={`Sharing ticket ${ticket.offenseNumber} — ${ticket.violationType} for ${ticket.driverName || 'the driver'} on ${ticket.date}.`}
                    onOpenInMessages={onNavigate ? (id) => { setMessagesFocus(id); onNavigate('/messages'); } : undefined}
                />
            )}
        </div>
    );
}
