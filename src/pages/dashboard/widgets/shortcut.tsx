import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, Briefcase, Building2, FileText, Link2, MessageSquare, Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SIDEBAR_NODES } from '@/data/sidebar.data';
import { isGroup, type SidebarItem, type SidebarNode } from '@/types/sidebar';
import { STATUS_META } from '@/pages/hiring-process/applicants.data';
import { HOS_TYPE_BY_ID } from '@/pages/hos/hos-violations.data';
import { PRIORITY_META, PRIORITY_ORDER, dueShort } from '@/pages/compliance/monitoring-alerts';
import { STAGE_LABEL, inspectionStage } from '@/pages/roadside/roadside.data';
import { getOrCreateDriverConversation, setMessagesFocus } from '@/pages/messages/messages-store';
import { currentChatViewer, visibleConversations } from '@/pages/messages/chat-viewer';
import { ALL_SIZES, TONE, type BuildCtx, type Shortcut, type ShortcutKind, type Tone, type WidgetDef } from '../dashboard-types';
import type { WidgetSize } from '../dashboard-layout';
import { dayState } from '../dashboard-data';
import { Avatar, Block, Empty, Mini, Pill, Progress, Rows, fmtMoney, fmtN, humanize, shortDate, type RowItem } from '../dashboard-charts';
import { PRIORITY_TONE } from './overview';

// ─────────────────────────────────────────────────────────────────────────────
// Shortcuts — a card that stands for a page or one record.
//
// Small, it is an app icon: the page's icon or the record's initials, its name, one line and
// one figure. Medium, it adds the facts. Large and wide, it adds the lists behind the facts —
// a driver's records to fix, open violations and tickets; a unit's maintenance due and
// inspections; an applicant's trainings; a carrier's most urgent alerts — and a page
// shortcut carries the page's own widget. Everything on it opens the thing it stands for.
// ─────────────────────────────────────────────────────────────────────────────

export interface PageShortcut { key: string; label: string; path: string; menuKey: string; Icon?: LucideIcon; group: string }

/** Every page the sidebar offers, flattened, with the top-level menu that decides access. */
export function pageShortcuts(): PageShortcut[] {
    const out: PageShortcut[] = [];
    const walk = (n: SidebarNode, menuKey: string, group: string) => {
        if (n.disabled) return;
        if (isGroup(n)) { n.children.forEach((c) => walk(c, menuKey, n.label)); return; }
        const leaf = n as SidebarItem;
        if (leaf.path) out.push({ key: leaf.key, label: leaf.label, path: leaf.path, menuKey, Icon: leaf.icon, group });
    };
    for (const n of SIDEBAR_NODES) walk(n, n.key, isGroup(n) ? n.label : 'Pages');
    return out;
}
const PAGE_BY_KEY = (): Record<string, PageShortcut> => Object.fromEntries(pageShortcuts().map((p) => [p.key, p]));

export const KIND_META: Record<ShortcutKind, { label: string; plural: string; Icon: LucideIcon; tone: Tone }> = {
    page: { label: 'Page', plural: 'Pages', Icon: Link2, tone: 'blue' },
    driver: { label: 'Driver', plural: 'Drivers', Icon: User, tone: 'emerald' },
    asset: { label: 'Asset', plural: 'Assets', Icon: Truck, tone: 'violet' },
    applicant: { label: 'Applicant', plural: 'Applicants', Icon: Briefcase, tone: 'sky' },
    carrier: { label: 'Carrier', plural: 'Carriers', Icon: Building2, tone: 'indigo' },
};

/** Whether this role may have the shortcut — the page's menu, or the record's module. */
export function shortcutAllowed(sc: Shortcut, can: (menuKey?: string) => boolean): boolean {
    if (sc.kind === 'page') return can(sc.menuKey);
    if (sc.kind === 'driver' || sc.kind === 'asset') return can('account');
    if (sc.kind === 'applicant') return can('hiring-process');
    return can('service-profile') || can('account');
}
export const shortcutIcon = (sc: Shortcut): LucideIcon => (sc.kind === 'page' ? PAGE_BY_KEY()[sc.ref]?.Icon ?? Link2 : KIND_META[sc.kind].Icon);

/** The widget a page stands for, so a large page shortcut can carry it. Set by the registry (the registry imports this file). */
let widgetForPath: (path: string) => WidgetDef | undefined = () => undefined;
export function registerWidgetForPath(fn: (path: string) => WidgetDef | undefined): void { widgetForPath = fn; }

/** A live figure for the pages the dashboard already knows about. */
function pageFigure(path: string, ctx: BuildCtx): { value: string; label: string; tone: Tone } | null {
    const d = ctx.data; const c = d.carrier ?? d.service;
    if (!c) return null;
    if (path.startsWith('/default-compliance-monitoring')) return { value: fmtN(c.monitoring.openAlerts), label: 'open alerts', tone: c.monitoring.byPriority.overdue ? 'red' : 'orange' };
    if (path.startsWith('/default-compliance-documents')) return { value: fmtN(c.documents.requiredMissing), label: 'records missing', tone: 'amber' };
    if (path.startsWith('/tickets')) return { value: fmtN(c.safety.ticketsOpen), label: 'tickets open', tone: 'orange' };
    if (path.startsWith('/default-accidents')) return { value: fmtN(d.service ? c.safety.accidents : d.accidents.length), label: 'accidents', tone: 'red' };
    if (path.startsWith('/maintenance')) return { value: fmtN(c.operations.tasksOverdue), label: 'overdue', tone: 'amber' };
    if (path.startsWith('/hiring-process')) return { value: fmtN(d.applicants.length), label: 'applicants', tone: 'blue' };
    if (path.startsWith('/messages')) return { value: fmtN(visibleConversations(d.conversations, currentChatViewer()).filter((x) => x.unread > 0).length), label: 'unread', tone: 'blue' };
    if (path.startsWith('/roadside-inspections')) return { value: fmtN(d.inspections.length), label: 'inspections', tone: 'indigo' };
    if (path.startsWith('/inventory')) return { value: fmtN(d.inventory.length), label: 'items', tone: 'slate' };
    if (path.startsWith('/fuel')) return { value: fmtMoney(d.purchases.reduce((s, p) => s + p.totalCost, 0)), label: 'fuel spend', tone: 'emerald' };
    if (path.startsWith('/account')) return { value: fmtN(c.fleet.drivers), label: 'drivers', tone: 'blue' };
    if (path.startsWith('/accounts')) return { value: fmtN(d.carriers.length), label: 'carriers', tone: 'indigo' };
    if (path.startsWith('/safety-event/hours')) return { value: fmtN(d.hosViolations.filter((v) => v.status === 'open').length), label: 'HOS open', tone: 'orange' };
    if (path.startsWith('/safety-events')) return { value: fmtN(d.telematics.length), label: 'events', tone: 'violet' };
    return null;
}

type Fact = { label: string; value: string; tone?: Tone };
type Action = { label: string; Icon: LucideIcon; onClick: () => void; tone?: Tone };
type ListBlock = { title: string; items: RowItem[]; empty: string };
const GAP_TONE: Record<'missing' | 'expired' | 'expiring', Tone> = { missing: 'slate', expired: 'red', expiring: 'amber' };
const severityTone = (s: string): Tone => { const k = s.toLowerCase(); return k === 'critical' ? 'red' : k === 'high' ? 'orange' : k === 'medium' ? 'amber' : 'slate'; };

/** What the card knows and can do, by what it stands for. */
function resolve(sc: Shortcut, ctx: BuildCtx): {
    title: string; sub: string; Icon?: LucideIcon; avatar?: string; tone: Tone; facts: Fact[]; actions: Action[]; lists: ListBlock[]; open: () => void;
    badge?: { text: string; tone: Tone }; embed?: WidgetDef; progress?: { value: number; max: number };
} {
    const { data: d, go, openRecord, openCarrier, openAlert } = ctx;
    if (sc.kind === 'page') {
        const page = PAGE_BY_KEY()[sc.ref];
        const path = sc.path ?? page?.path ?? '/dashboard';
        const fig = pageFigure(path, ctx);
        return {
            title: page?.label ?? sc.label, sub: page?.group ?? 'Page', Icon: page?.Icon ?? Link2, tone: sc.tone ?? 'blue',
            facts: fig ? [{ label: fig.label, value: fig.value, tone: fig.tone }] : [], actions: [], lists: [], open: () => go(path), embed: widgetForPath(path),
        };
    }
    if (sc.kind === 'driver') {
        const drv = d.drivers.find((x) => x.id === sc.ref);
        const gaps = d.gaps.drivers.find((g) => g.id === sc.ref);
        const hos = d.hosViolations.filter((v) => v.driverId === sc.ref && v.status !== 'resolved');
        const tickets = d.tickets.filter((t) => t.driverId === sc.ref);
        const openTickets = tickets.filter((t) => t.status === 'Due' || t.status === 'In Court');
        const lic = dayState(drv?.licenseExpiry);
        const statusTone: Tone = drv?.status === 'Active' ? 'emerald' : drv?.status === 'On Leave' ? 'amber' : 'slate';
        const name = drv?.name ?? sc.label;
        return {
            title: name, sub: drv ? `${drv.driverType ?? 'Driver'} · ${drv.status}` : 'Driver', avatar: name, tone: 'emerald',
            badge: drv ? { text: drv.status, tone: statusTone } : undefined,
            facts: [
                { label: 'Licence', value: drv?.licenseExpiry ? shortDate(drv.licenseExpiry) : '—', tone: lic === 'past' ? 'red' : lic === 'soon' ? 'amber' : 'emerald' },
                { label: 'Records missing', value: gaps ? fmtN(gaps.missing) : '—', tone: gaps?.missing ? 'red' : 'emerald' },
                { label: 'Expired / expiring', value: gaps ? `${gaps.expired} / ${gaps.expiring}` : '—', tone: gaps?.expired ? 'red' : gaps?.expiring ? 'amber' : 'emerald' },
                { label: 'HOS open', value: fmtN(hos.filter((v) => v.status === 'open').length), tone: hos.some((v) => v.status === 'open') ? 'orange' : 'emerald' },
                { label: 'Tickets open', value: fmtN(openTickets.length), tone: openTickets.length ? 'orange' : 'emerald' },
                { label: 'Hired', value: drv?.hiredDate ? shortDate(drv.hiredDate) : '—' },
            ],
            actions: [
                { label: 'Records', Icon: FileText, onClick: () => openRecord('/default-compliance-documents', `Driver|${sc.ref}`), tone: 'blue' },
                { label: 'Chat', Icon: MessageSquare, onClick: () => { setMessagesFocus(getOrCreateDriverConversation(name)); go('/messages'); }, tone: 'slate' },
            ],
            lists: [
                { title: 'Records to fix', empty: 'Every required record is in order.', items: (gaps?.gapList ?? []).map((r) => ({ id: r.recordId, label: r.name, sub: r.expiry ? `${humanize(r.state)} · ${shortDate(r.expiry)}` : humanize(r.state), tone: GAP_TONE[r.state], right: <Pill tone={GAP_TONE[r.state]}>{r.state}</Pill>, onOpen: () => openRecord('/default-compliance-documents', `Driver|${sc.ref}|${r.recordId}`) })) },
                { title: 'HOS violations', empty: 'No open HOS violations.', items: hos.map((v) => ({ id: v.id, label: HOS_TYPE_BY_ID[v.typeId]?.label ?? humanize(v.typeId), sub: `${shortDate(v.dateTime)} · ${humanize(v.status)}`, tone: severityTone(v.severity), right: <Pill tone={severityTone(v.severity)}>{v.severity}</Pill>, onOpen: () => openRecord('/safety-event/hours-of-service-violations', v.id) })) },
                { title: 'Tickets', empty: 'No tickets.', items: tickets.map((t) => ({ id: t.id, label: `${t.offenseNumber} · ${t.violationType}`, sub: `${shortDate(t.date)}${t.dueDate ? ` · due ${shortDate(t.dueDate)}` : ''}`, tone: t.status === 'Due' ? 'red' : t.status === 'In Court' ? 'orange' : 'emerald', right: <span className="flex items-center gap-1"><Pill tone={t.status === 'Due' ? 'red' : t.status === 'In Court' ? 'orange' : 'emerald'}>{t.status}</Pill><span className="text-[11px] font-bold tabular-nums text-slate-700">{fmtMoney(t.fineAmount, t.currency)}</span></span>, onOpen: () => openRecord('/tickets', t.id) })) },
            ],
            open: () => openRecord('/account/profile', sc.ref, 'driver'),
        };
    }
    if (sc.kind === 'asset') {
        const a = d.assets.find((x) => x.id === sc.ref);
        const gaps = d.gaps.assets.find((g) => g.id === sc.ref);
        const due = d.maintenance.filter((m) => m.subjectId === sc.ref);
        const insp = d.inspections.filter((i) => i.truck?.id === sc.ref || i.trailer?.id === sc.ref);
        const reg = dayState(a?.registrationExpiryDate);
        const statusTone: Tone = a?.operationalStatus === 'Active' ? 'emerald' : a?.operationalStatus === 'Maintenance' ? 'amber' : a?.operationalStatus === 'OutOfService' ? 'red' : 'slate';
        const toneOf = (s?: string): Tone => (s === 'overdue' ? 'red' : s === 'critical' ? 'amber' : 'emerald');
        return {
            title: a?.unitNumber ?? sc.label, sub: a ? `${a.make} ${a.model} · ${a.assetType}` : 'Asset', Icon: Truck, tone: 'violet',
            badge: a ? { text: a.operationalStatus, tone: statusTone } : undefined,
            facts: [
                { label: 'Registration', value: a?.registrationExpiryDate ? shortDate(a.registrationExpiryDate) : '—', tone: reg === 'past' ? 'red' : reg === 'soon' ? 'amber' : 'emerald' },
                { label: 'Records missing', value: gaps ? fmtN(gaps.missing) : '—', tone: gaps?.missing ? 'red' : 'emerald' },
                { label: 'Expired / expiring', value: gaps ? `${gaps.expired} / ${gaps.expiring}` : '—', tone: gaps?.expired ? 'red' : gaps?.expiring ? 'amber' : 'emerald' },
                { label: 'Maintenance due', value: fmtN(due.length), tone: due.some((m) => m.statusPriority === 'overdue') ? 'red' : due.length ? 'amber' : 'emerald' },
                { label: 'Inspections', value: fmtN(insp.length), tone: insp.some((i) => i.oos) ? 'red' : 'indigo' },
                { label: 'Odometer', value: a?.odometer ? `${fmtN(a.odometer)} ${a.odometerUnit ?? 'mi'}` : '—' },
            ],
            actions: [{ label: 'Records', Icon: FileText, onClick: () => openRecord('/default-compliance-documents', `Asset|${sc.ref}`), tone: 'blue' }],
            lists: [
                { title: 'Records to fix', empty: 'Every required record is in order.', items: (gaps?.gapList ?? []).map((r) => ({ id: r.recordId, label: r.name, sub: r.expiry ? `${humanize(r.state)} · ${shortDate(r.expiry)}` : humanize(r.state), tone: GAP_TONE[r.state], right: <Pill tone={GAP_TONE[r.state]}>{r.state}</Pill>, onOpen: () => openRecord('/default-compliance-documents', `Asset|${sc.ref}|${r.recordId}`) })) },
                { title: 'Maintenance due', empty: 'Nothing due on this unit.', items: due.map((m) => ({ id: m.id, label: m.title, sub: m.description, tone: toneOf(m.statusPriority), right: <Pill tone={toneOf(m.statusPriority)}>{m.isStatus ? m.status : dueShort(m.daysUntil)}</Pill>, onOpen: () => (m.link.pendingId ? openRecord(m.link.path, m.link.pendingId, m.link.pendingType) : go(m.link.path)) })) },
                { title: 'Inspections', empty: 'No inspections on this unit.', items: insp.map((i) => ({ id: i.id, label: `Level ${i.level} · ${shortDate(i.date)}`, sub: STAGE_LABEL[inspectionStage(i)], tone: i.oos || i.result === 'Fail' ? 'red' : 'emerald', right: <Pill tone={i.oos ? 'red' : i.result === 'Fail' ? 'orange' : 'emerald'}>{i.result}{i.oos ? ' · OOS' : ''}</Pill>, onOpen: () => go(`/roadside-inspections/${i.id}`) })) },
            ],
            open: () => openRecord('/account/profile', sc.ref, 'asset'),
        };
    }
    if (sc.kind === 'applicant') {
        const ap = d.applicants.find((x) => x.id === sc.ref);
        const name = ap ? `${ap.firstName} ${ap.lastName}` : sc.label;
        const tone: Tone = ap?.status === 'approved' ? 'emerald' : ap?.status === 'rejected' ? 'red' : ap?.status === 'under-review' || ap?.status === 'submitted' ? 'orange' : 'sky';
        const trainings = ap?.onboarding?.trainings ?? [];
        const path = ap?.status === 'approved' ? `/hiring-process/onboarding/${sc.ref}` : `/hiring-process/hiring/${sc.ref}`;
        return {
            title: name, sub: ap ? `${STATUS_META[ap.status].label} · ${ap.carrier}` : 'Applicant', avatar: name, tone: 'sky',
            badge: ap ? { text: STATUS_META[ap.status].label, tone } : undefined,
            facts: ap ? [
                { label: 'Steps', value: `${ap.stepsDone} / ${ap.stepsTotal}`, tone: ap.stepsDone === ap.stepsTotal ? 'emerald' : 'blue' },
                { label: 'Invited', value: shortDate(ap.invitedAt) },
                { label: 'Last moved', value: shortDate(new Date(ap.updatedAt).toISOString()) },
                { label: 'Position', value: ap.position ?? '—' },
                { label: 'Trainings', value: trainings.length ? `${trainings.filter((t) => t.status === 'completed').length} / ${trainings.length}` : '—', tone: 'violet' },
                { label: 'Form', value: ap.template || ap.formId },
            ] : [],
            actions: [],
            progress: ap ? { value: ap.stepsDone, max: ap.stepsTotal } : undefined,
            lists: [
                { title: 'Trainings', empty: 'No trainings assigned yet.', items: trainings.map((t) => ({ id: t.name, label: t.name, sub: `${humanize(t.status)} · ${t.dueDays} days`, tone: t.status === 'completed' ? 'emerald' : t.status === 'in_progress' ? 'blue' : 'slate', right: <Pill tone={t.status === 'completed' ? 'emerald' : 'slate'}>{humanize(t.status)}</Pill>, onOpen: () => go(path) })) },
            ],
            open: () => go(path),
        };
    }
    const c = d.service?.carriers.find((x) => x.carrier.id === sc.ref);
    const acct = d.carriers.find((x) => x.id === sc.ref);
    const urgent = c ? [...c.monitoring.alerts].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999)).slice(0, 8) : [];
    return {
        title: acct?.dbaName || acct?.legalName || sc.label, sub: acct ? `${acct.dotNumber ? `DOT ${acct.dotNumber} · ` : ''}${acct.status}` : 'Carrier', avatar: acct?.legalName ?? sc.label, tone: 'indigo',
        badge: acct ? { text: acct.status, tone: acct.status === 'Active' ? 'emerald' : 'amber' } : undefined,
        facts: c ? [
            { label: 'Open alerts', value: fmtN(c.monitoring.openAlerts), tone: c.monitoring.byPriority.overdue ? 'red' : c.monitoring.openAlerts ? 'amber' : 'emerald' },
            { label: 'Records missing', value: fmtN(c.documents.requiredMissing), tone: c.documents.requiredMissing ? 'amber' : 'emerald' },
            { label: 'Expired', value: fmtN(c.documents.expired), tone: c.documents.expired ? 'red' : 'emerald' },
            { label: 'Drivers / assets', value: `${c.fleet.drivers} / ${c.fleet.assets}` },
            { label: 'Tickets open', value: fmtN(c.safety.ticketsOpen), tone: c.safety.ticketsOpen ? 'orange' : 'emerald' },
            { label: 'Accidents', value: fmtN(c.safety.accidents), tone: c.safety.accidents ? 'red' : 'emerald' },
        ] : [],
        actions: [],
        lists: [
            { title: 'Most urgent alerts', empty: 'No open alerts.', items: urgent.map((a) => ({ id: a.id, label: a.title, sub: `${a.subjectLabel} · ${a.isStatus ? a.status : dueShort(a.daysUntil)}`, tone: PRIORITY_TONE[a.priority], right: <Pill tone={PRIORITY_TONE[a.priority]}>{PRIORITY_META[a.priority].label}</Pill>, onOpen: () => openAlert(a, sc.ref) })) },
        ],
        open: () => openCarrier(sc.ref, '/account/profile'),
    };
}

function ShortcutCard({ ctx, size }: { ctx: BuildCtx; size: WidgetSize }) {
    const sc = ctx.item.shortcut;
    if (!sc) return <Empty>Nothing to point at.</Empty>;
    const r = resolve(sc, ctx);
    const Icon = r.Icon;
    const tile = (
        <button type="button" onClick={r.open} className="group/tile flex min-w-0 items-center gap-3 text-left">
            {r.avatar
                ? <Avatar name={r.avatar} tone={r.tone} size={size === 'sm' ? 44 : 40} className="rounded-xl text-[15px]" />
                : <span className={cn('flex shrink-0 items-center justify-center rounded-xl', TONE[r.tone].soft, size === 'sm' ? 'h-11 w-11' : 'h-10 w-10')}>{Icon && <Icon size={size === 'sm' ? 22 : 20} />}</span>}
            <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[14px] font-bold leading-tight text-slate-900 group-hover/tile:text-blue-700">{r.title}</span>
                    <ArrowUpRight size={13} className="shrink-0 text-slate-300 group-hover/tile:text-blue-600" />
                </span>
                <span className="block truncate text-[11px] text-slate-500">{r.sub}</span>
                {r.badge && <Pill tone={r.badge.tone} className="mt-1">{r.badge.text}</Pill>}
            </span>
        </button>
    );
    const actions = r.actions.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1">
            {r.actions.map((a) => (
                <button key={a.label} type="button" onClick={a.onClick} title={a.label}
                    className={cn('inline-flex h-6 items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 text-[10.5px] font-semibold hover:border-slate-300', TONE[a.tone ?? 'blue'].text)}>
                    <a.Icon size={11} /> {a.label}
                </button>
            ))}
        </div>
    );
    if (size === 'sm') {
        const f = r.facts[0];
        return (
            <div className="flex h-full min-h-0 flex-col justify-between px-3 py-2.5">
                {tile}
                <div className="flex items-end justify-between gap-2">
                    {f ? <Mini label={f.label} value={f.value} tone={f.tone} /> : <span />}
                    {actions || <span className="text-[10px] text-slate-400">{sc.kind === 'page' ? 'Open' : KIND_META[sc.kind].label}</span>}
                </div>
            </div>
        );
    }
    const facts = (cols: number, n: number) => (
        <div className="grid shrink-0 gap-x-3 gap-y-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {r.facts.slice(0, n).map((f) => <div key={f.label} className="rounded-lg bg-slate-50 px-2.5 py-1.5"><Mini label={f.label} value={f.value} tone={f.tone} /></div>)}
        </div>
    );
    const head = <div className="flex shrink-0 items-start justify-between gap-2">{tile}{actions}</div>;
    // A page shortcut, large: the page's own widget under the tile.
    if (sc.kind === 'page' && size !== 'md' && r.embed) {
        return (
            <div className="flex h-full min-h-0 flex-col">
                <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-2.5">{tile}{r.facts[0] && <Mini label={r.facts[0].label} value={r.facts[0].value} tone={r.facts[0].tone} />}</div>
                {/* The page's widget, with its own filter default — the shortcut carries no setting for it. */}
                <div className="min-h-0 flex-1">{r.embed.render({ ...ctx, opt: (key) => ctx.item.opts?.[key] ?? (r.embed?.option?.key === key ? r.embed.option.default : '') }, size === 'xl' ? 'lg' : 'md')}</div>
            </div>
        );
    }
    if (size === 'md') {
        return (
            <div className="flex h-full min-h-0 flex-col gap-3 px-3 py-2.5">
                {head}
                {r.facts.length ? facts(2, 4) : <Empty>Opens {r.title}.</Empty>}
                {r.progress && <Progress value={r.progress.value} max={r.progress.max} tone="sky" />}
            </div>
        );
    }
    const lists = r.lists.slice(0, size === 'xl' ? 3 : 2);
    return (
        <div className="flex h-full min-h-0 flex-col gap-3 px-3 py-2.5">
            {head}
            {r.facts.length ? facts(size === 'xl' ? 6 : 3, 6) : null}
            {r.progress && <Progress value={r.progress.value} max={r.progress.max} tone="sky" />}
            {lists.length > 0 && (
                <div className={cn('grid min-h-0 flex-1 gap-3', lists.length >= 3 ? 'grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3' : lists.length === 2 ? 'grid-cols-1 @md:grid-cols-2' : 'grid-cols-1')}>
                    {lists.map((l, i) => (
                        <div key={l.title} className={cn('flex min-h-0 flex-col', i === 2 && 'hidden @2xl:flex')}>
                            <Block title={`${l.title} · ${l.items.length}`}>{l.items.length ? <Rows items={l.items.slice(0, size === 'xl' ? 7 : 5)} dense /> : <Empty>{l.empty}</Empty>}</Block>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const SHORTCUT: WidgetDef = {
    id: 'shortcut', title: 'Shortcut', blurb: 'A page or a record, one tap away — bigger, it shows what it knows about it.',
    Icon: Link2, tone: 'blue', category: 'Shortcuts', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    render: (ctx, size) => <ShortcutCard ctx={ctx} size={size} />,
};
