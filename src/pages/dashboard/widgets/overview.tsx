import { BellRing, Building2, History, ListChecks, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/data/users.data';
import { PRIORITY_META, PRIORITY_ORDER, dueShort, type MonitoringAlert, type PriorityLevel } from '@/pages/compliance/monitoring-alerts';
import type { AlertSource } from '@/pages/compliance/monitoring-sources';
import { inspectionStage } from '@/pages/roadside/roadside.data';
import { setMessagesFocus } from '@/pages/messages/messages-store';
import { currentChatViewer, isOutgoing, visibleConversations } from '@/pages/messages/chat-viewer';
import { auditCarrierName } from '@/data/audit-log.data';
import type { AccountRecord } from '@/pages/accounts/accounts.data';
import { ALL_SIZES, TONE, type BuildCtx, type Tone, type WidgetDef } from '../dashboard-types';
import {
    Avatar, AvatarStack, Big, Block, Columns, Donut, Empty, Glance, HBars, Mini, Note, Pill, Ring, Rows, Segments, Spark, Split, Stack, Strip, Timeline, Wide,
    ago, fmtN, humanize, type Part, type RowItem,
} from '../dashboard-charts';

const H = { md: 92, lg: 180, xl: 200 } as const;
export const PRIORITY_TONE: Record<PriorityLevel, Tone> = { overdue: 'red', critical: 'orange', high: 'amber', medium: 'blue', low: 'slate' };
const SOURCE_LABEL: Record<AlertSource, string> = { compliance: 'Compliance', inventory: 'Inventory', maintenance: 'Maintenance', ticket: 'Tickets', training: 'Training', request: 'Requests', form: 'Forms' };
const SOURCE_TONE: Record<AlertSource, Tone> = { compliance: 'blue', inventory: 'slate', maintenance: 'amber', ticket: 'orange', training: 'violet', request: 'sky', form: 'indigo' };

// ── Needs attention ───────────────────────────────────────────────────────────

export interface AttentionItem { id: string; label: string; module: string; count: number; tone: Tone; urgent: boolean; path: string }

/** Everything overdue or due soon, module by module — the header's figures come from here too. */
export function attentionItems({ data: d, can }: Pick<BuildCtx, 'data' | 'can'>): AttentionItem[] {
    const c = d.carrier ?? d.service;
    const items: AttentionItem[] = [];
    const add = (ok: boolean, count: number, label: string, module: string, path: string, tone: Tone, urgent: boolean) => {
        if (ok && count > 0) items.push({ id: label, label, module, count, tone, urgent, path });
    };
    if (c) {
        add(can('default-compliance-monitoring'), c.monitoring.byPriority.overdue, 'Overdue alerts', 'Monitoring', '/default-compliance-monitoring', 'red', true);
        add(can('default-compliance-monitoring'), c.monitoring.byPriority.critical, 'Critical alerts', 'Monitoring', '/default-compliance-monitoring', 'orange', false);
        add(can('default-compliance-documents'), c.documents.expired, 'Expired documents', 'Compliance', '/default-compliance-documents', 'red', true);
        add(can('default-compliance-documents'), c.documents.requiredMissing, 'Required records missing', 'Compliance', '/default-compliance-documents', 'amber', false);
        add(can('default-compliance-documents'), c.documents.expiringSoon, 'Expiring in 30 days', 'Compliance', '/default-compliance-documents', 'amber', false);
        add(can('account'), c.drivers.cdlExpired, 'Licences expired', 'Drivers', '/account/profile', 'red', true);
        add(can('account'), c.drivers.cdlExpiring, 'Licences expiring', 'Drivers', '/account/profile', 'amber', false);
        add(can('account'), c.assets.regExpired, 'Registrations expired', 'Assets', '/account/profile', 'red', true);
        add(can('account'), c.assets.regExpiring, 'Registrations expiring', 'Assets', '/account/profile', 'amber', false);
        add(can('tickets'), c.safety.ticketsOpen, 'Tickets due or in court', 'Tickets', '/tickets', 'orange', false);
        add(can('fleet-maintenance'), c.operations.tasksOverdue, 'Maintenance overdue', 'Maintenance', '/maintenance', 'red', true);
        add(can('fleet-maintenance'), c.maintenance.tasksDue, 'Maintenance due', 'Maintenance', '/maintenance', 'amber', false);
        add(can('inventory'), c.inventoryState.expired, 'Inventory expired', 'Inventory', '/inventory', 'red', true);
        add(can('inventory'), c.inventoryState.expiring, 'Inventory expiring', 'Inventory', '/inventory', 'amber', false);
    }
    add(can('roadside-inspections'), d.inspections.filter((i) => { const s = inspectionStage(i); return s === 'awaiting-report' || s === 'awaiting-repair'; }).length, 'Inspections awaiting follow-up', 'Roadside', '/roadside-inspections', 'amber', false);
    add(can('default-accidents'), d.accidents.filter((a) => a.status !== 'verified').length, 'Accidents to verify', 'Accidents', '/default-accidents', 'orange', false);
    add(can('safety-event'), d.hosViolations.filter((v) => v.status === 'open').length, 'HOS violations open', 'Hours of Service', '/safety-event/hours-of-service-violations', 'orange', false);
    add(can('hiring-process'), d.applicants.filter((a) => a.status === 'under-review' || a.status === 'submitted').length, 'Applications to review', 'Hiring', '/hiring-process/hiring', 'blue', false);
    add(can('messages'), visibleConversations(d.conversations, currentChatViewer()).filter((x) => x.unread > 0).length, 'Unread chats', 'Messages', '/messages', 'blue', false);
    return items.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.count - a.count);
}

const attention: WidgetDef = {
    id: 'attention', title: 'Needs attention', blurb: 'Everything overdue or due soon, across every module, with where to go.',
    Icon: ListChecks, tone: 'rose', category: 'Overview', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    option: { key: 'show', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'overdue', label: 'Overdue only' }] },
    render: (ctx, size) => {
        const all = attentionItems(ctx);
        const items = ctx.opt('show') === 'overdue' ? all.filter((i) => i.urgent) : all;
        const total = all.reduce((s, i) => s + i.count, 0);
        const urgent = all.filter((i) => i.urgent).reduce((s, i) => s + i.count, 0);
        const soon = total - urgent;
        const tone: Tone = urgent ? 'red' : total ? 'amber' : 'emerald';
        const byModule = new Map<string, number>();
        for (const i of items) byModule.set(i.module, (byModule.get(i.module) ?? 0) + i.count);
        const modules = [...byModule.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, tone: 'red' as Tone }));
        const rows = (list: AttentionItem[], dense?: boolean): RowItem[] => list.map((i) => ({
            id: i.id, label: i.label, sub: i.module, tone: i.tone, onOpen: () => ctx.go(i.path),
            right: <span className={cn('shrink-0 text-[12px] font-bold tabular-nums', TONE[i.tone].text)}>{fmtN(i.count)}</span>,
            title: dense ? `${i.label} · ${i.module}` : undefined,
        }));
        const parts: Part[] = [{ label: 'Overdue', value: urgent, tone: 'red' }, { label: 'Due soon', value: soon, tone: 'amber' }];
        const empty = <Empty>Nothing is overdue or due soon. Enjoy it.</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(total)} label="Needs attention" tone={tone} sub={total ? `${fmtN(urgent)} overdue · ${fmtN(soon)} due soon` : 'All clear'} />}
                aside={<Ring value={urgent} max={Math.max(1, total)} tone="red" label={fmtN(urgent)} sub="overdue" />}
                foot={items[0] && <Note>Top: {items[0].label} · {items[0].module}</Note>} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(total)} label="Needs attention" tone={tone} /><div className="mt-auto pt-1"><Segments parts={parts} legend height={6} /></div></>}
                right={items.length ? <Rows items={rows(items.slice(0, 4), true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Items', value: fmtN(total), tone }, { label: 'Overdue', value: fmtN(urgent), tone: 'red' },
            { label: 'Due soon', value: fmtN(soon), tone: 'amber' }, { label: 'Modules', value: byModule.size, tone: 'slate' },
        ]} />;
        if (size === 'lg') return (
            <Stack strip={strip}
                main={<Block title="By module">{modules.length ? <HBars rows={modules} dense /> : empty}</Block>}
                side={<Block title="Go to">{items.length ? <Rows items={rows(items.slice(0, 6))} /> : empty}</Block>}
                foot={ctx.data.service && <Note>Across {ctx.data.carriers.length} carriers</Note>} />
        );
        return (
            <Wide strip={strip} blocks={[
                <Block key="d" title="Overdue vs due soon"><Donut parts={parts} size={120} label={fmtN(total)} sub="items" /></Block>,
                <Block key="m" title="By module">{modules.length ? <HBars rows={modules} dense /> : empty}</Block>,
                <Block key="r" title="Go to">{items.length ? <Rows items={rows(items.slice(0, 7), true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Monitoring alerts ─────────────────────────────────────────────────────────

const alerts: WidgetDef = {
    id: 'alerts', title: 'Monitoring alerts', blurb: 'Open alerts by priority and source, the most urgent first — a row opens the alert on the Monitoring page.',
    Icon: BellRing, tone: 'orange', category: 'Compliance', menuKey: 'default-compliance-monitoring', scopes: ['carrier', 'profile'],
    sizes: ALL_SIZES, defaultSize: 'lg', path: () => '/default-compliance-monitoring',
    option: { key: 'priority', label: 'Priority', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'overdue', label: 'Overdue' }, { id: 'critical', label: 'Critical' }, { id: 'high', label: 'High' }, { id: 'medium', label: 'Medium' }] },
    render: ({ data: d, openAlert, opt }, size) => {
        const m = (d.carrier ?? d.service)?.monitoring;
        if (!m) return <Empty>No monitoring for this view.</Empty>;
        const pick = opt('priority');
        const list = ([...m.alerts] as (MonitoringAlert & { carrier?: AccountRecord })[])
            .filter((a) => pick === 'all' || a.priority === pick)
            .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) || (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999));
        const parts: Part[] = PRIORITY_ORDER.map((p) => ({ label: PRIORITY_META[p].label, value: m.byPriority[p], tone: PRIORITY_TONE[p] }));
        const sources: Part[] = (Object.keys(SOURCE_LABEL) as AlertSource[]).map((s) => ({ label: SOURCE_LABEL[s], value: list.filter((a) => a.source === s).length, tone: SOURCE_TONE[s] })).filter((p) => p.value > 0);
        const buckets = [
            { label: 'Overdue', value: list.filter((a) => a.priority === 'overdue').length },
            { label: '≤ 7d', value: list.filter((a) => a.priority !== 'overdue' && a.daysUntil !== null && a.daysUntil <= 7).length },
            { label: '≤ 30d', value: list.filter((a) => a.daysUntil !== null && a.daysUntil > 7 && a.daysUntil <= 30).length },
            { label: '≤ 90d', value: list.filter((a) => a.daysUntil !== null && a.daysUntil > 30 && a.daysUntil <= 90).length },
            { label: 'Later', value: list.filter((a) => a.daysUntil === null || a.daysUntil > 90).length },
        ];
        const rows = (n: number, dense?: boolean): RowItem[] => list.slice(0, n).map((a) => ({
            id: a.id, label: a.title, tone: PRIORITY_TONE[a.priority], onOpen: () => openAlert(a, a.carrier?.id),
            sub: [a.carrier?.dbaName || a.carrier?.legalName, a.subjectLabel, a.isStatus ? a.status : dueShort(a.daysUntil)].filter(Boolean).join(' · '),
            right: <Pill tone={PRIORITY_TONE[a.priority]}>{a.isStatus ? a.status : dueShort(a.daysUntil) || PRIORITY_META[a.priority].label}</Pill>,
            title: dense ? `${a.title} · ${a.subjectLabel}` : undefined,
        }));
        const tone: Tone = m.byPriority.overdue ? 'red' : m.openAlerts ? 'orange' : 'emerald';
        const byCarrier = d.service ? d.service.carriers.map((c) => ({ label: c.carrier.dbaName || c.carrier.legalName, value: c.monitoring.openAlerts, tone: 'orange' as Tone })).sort((a, b) => b.value - a.value) : null;
        const empty = <Empty>{pick === 'all' ? 'No open alerts.' : `No ${PRIORITY_META[pick as PriorityLevel]?.label.toLowerCase() ?? pick} alerts.`}</Empty>;
        const shown = pick === 'all' ? m.openAlerts : list.length;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(shown)} label={pick === 'all' ? 'Open alerts' : `${PRIORITY_META[pick as PriorityLevel]?.label ?? pick} alerts`} tone={tone} sub={`${fmtN(m.byPriority.overdue)} overdue · ${fmtN(m.byPriority.critical)} critical`} />}
                aside={<Ring value={m.byPriority.overdue} max={Math.max(1, m.openAlerts)} tone="red" label={fmtN(m.byPriority.overdue)} sub="overdue" />}
                foot={<Segments parts={parts} legend={false} height={6} />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(shown)} label={pick === 'all' ? 'Open alerts' : 'Alerts shown'} tone={tone} /><div className="mt-auto pt-1"><Segments parts={parts.filter((p) => p.value > 0)} height={6} /></div></>}
                right={list.length ? <Rows items={rows(3, true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Open', value: fmtN(m.openAlerts), tone }, { label: 'Overdue', value: fmtN(m.byPriority.overdue), tone: 'red' },
            { label: 'Critical', value: fmtN(m.byPriority.critical), tone: 'orange' }, { label: 'Handled', value: fmtN(m.handled), tone: 'emerald' },
            ...(size === 'xl' ? [{ label: 'Watches running', value: fmtN(m.running), tone: 'blue' as Tone }, { label: 'Rules on', value: fmtN(m.rulesEnabled), tone: 'slate' as Tone }] : []),
        ]} />;
        const bySource = byCarrier
            ? <Block title="Open by carrier"><HBars rows={byCarrier} /></Block>
            : <Block title="By source">{sources.length ? <Donut parts={sources} size={size === 'xl' ? 120 : 104} label={fmtN(list.length)} sub="open" /> : empty}</Block>;
        if (size === 'lg') return <Stack strip={strip} main={bySource} side={<Block title="Most urgent">{list.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                bySource,
                <Block key="t" title="When they fall due"><Columns data={buckets} series={[{ key: 'value', name: 'Alerts', tone: 'orange' }]} height={H.xl} /></Block>,
                <Block key="r" title="Most urgent">{list.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Account ───────────────────────────────────────────────────────────────────

const account: WidgetDef = {
    id: 'account', title: 'Account', blurb: 'The carrier at a glance — registrations, rating, fleet make-up and the team.',
    Icon: Building2, tone: 'blue', category: 'Overview', menuKey: 'account', scopes: ['carrier'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/account/profile',
    render: ({ data: d, role }, size) => {
        const c = d.carrier; const a = d.account;
        if (!c || !a) return <Empty>No carrier selected.</Empty>;
        const ratingTone: Tone = a.safetyRating === 'Satisfactory' ? 'emerald' : a.safetyRating === 'Conditional' ? 'amber' : a.safetyRating === 'Unsatisfactory' ? 'red' : 'slate';
        const statusTone: Tone = a.status === 'Active' ? 'emerald' : a.status === 'Pending' ? 'amber' : 'red';
        const nonCmv = Math.max(0, c.fleet.assets - c.fleet.powerUnits - c.fleet.trailers);
        const fleet: Part[] = [{ label: 'Power units', value: c.fleet.powerUnits, tone: 'blue' }, { label: 'Trailers', value: c.fleet.trailers, tone: 'violet' }, { label: 'Other', value: nonCmv, tone: 'slate' }];
        const regs = [['USDOT', a.dotNumber], ['CVOR', a.cvorNumber], ['NSC', a.nscNumber], ['RIN', a.rinNumber]].filter(([, v]) => !!v) as [string, string][];
        const roles = Object.entries(c.users.byRole).map(([r, n]) => ({ label: ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r, value: n ?? 0, tone: 'violet' as Tone })).sort((x, y) => y.value - x.value);
        const card = (
            <div className="flex min-w-0 items-center gap-3">
                <Avatar name={a.legalName} tone="blue" size={40} className="rounded-xl" />
                <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold leading-tight text-slate-900">{a.dbaName || a.legalName}</p>
                    <p className="truncate text-[11px] text-slate-500">{a.city ? `${a.city}, ${a.state}` : a.legalName}</p>
                    <div className="mt-1 flex flex-wrap gap-1"><Pill tone={statusTone}>{a.status}</Pill><Pill tone={ratingTone}>{a.safetyRating || 'Not rated'}</Pill></div>
                </div>
            </div>
        );
        const regGrid = (cols: number) => (
            <div className="grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {regs.map(([k, v]) => <Mini key={k} label={k} value={v} tone="slate" />)}
            </div>
        );
        if (size === 'sm') return <Glance big={card} foot={<Note>{regs.map(([k, v]) => `${k} ${v}`).join(' · ')}</Note>} />;
        if (size === 'md') return (
            <Split leftWidth="11rem" left={<>{card}<div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Drivers" value={c.fleet.drivers} tone="blue" /><Mini label="Assets" value={c.fleet.assets} tone="violet" /></div></>}
                right={<Block title="Registrations">{regGrid(2)}<div className="mt-2"><Segments parts={fleet} height={6} /></div></Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Drivers', value: c.fleet.drivers, tone: 'blue' }, { label: 'Assets', value: c.fleet.assets, tone: 'violet' },
            { label: 'Power units', value: c.fleet.powerUnits, tone: 'slate' }, { label: 'Trailers', value: c.fleet.trailers, tone: 'slate' },
            ...(size === 'xl' ? [{ label: 'Office users', value: c.users.office, tone: 'violet' as Tone }, { label: 'Driver logins', value: c.users.driverLogins, tone: 'sky' as Tone }] : []),
        ]} />;
        const identity = <Block title="Carrier">{card}<div className="mt-3">{regGrid(2)}</div></Block>;
        const foot = <Note>You are {ROLE_LABELS[role]} here · {d.profile ? `under ${d.profile.dbaName || d.profile.legalName}` : 'no service profile'}</Note>;
        if (size === 'lg') return <Stack strip={strip} main={identity} side={<Block title="Fleet make-up"><Donut parts={fleet} size={110} label={fmtN(c.fleet.assets)} sub="units" /></Block>} foot={foot} />;
        return (
            <Wide strip={strip} blocks={[identity,
                <Block key="f" title="Fleet make-up"><Donut parts={fleet} size={120} label={fmtN(c.fleet.assets)} sub="units" /></Block>,
                <Block key="t" title="Team by role">{roles.length ? <HBars rows={roles} dense /> : <Empty>No office users yet.</Empty>}</Block>,
            ]} foot={foot} />
        );
    },
};

// ── Messages ──────────────────────────────────────────────────────────────────

const AVATAR_TONES: Tone[] = ['blue', 'emerald', 'violet', 'amber', 'sky', 'pink', 'indigo', 'teal'];
const toneForName = (name: string): Tone => AVATAR_TONES[[...name].reduce((s, ch) => s + ch.charCodeAt(0), 0) % AVATAR_TONES.length];

const messages: WidgetDef = {
    id: 'messages', title: 'Messages', blurb: 'Threads waiting on you, with who they are with and the last line.',
    Icon: MessageSquare, tone: 'blue', category: 'Overview', menuKey: 'messages', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/messages',
    option: { key: 'kind', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'internal', label: 'Team' }, { id: 'external', label: 'Outside' }] },
    render: ({ data: d, go, opt }, size) => {
        const viewer = currentChatViewer();
        const visible = visibleConversations(d.conversations, viewer);
        const unread = visible.filter((c) => c.unread > 0);
        const unreadMsgs = unread.reduce((s, c) => s + c.unread, 0);
        const kind = opt('kind');
        const sorted = [...visible].filter((c) => kind === 'all' ? true : kind === 'unread' ? c.unread > 0 : c.kind === kind)
            .sort((a, b) => ((b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0)) || (b.messages[b.messages.length - 1]?.iso ?? '').localeCompare(a.messages[a.messages.length - 1]?.iso ?? ''));
        const kinds: Part[] = [
            { label: 'Team', value: visible.filter((c) => c.kind === 'internal' && !c.ai).length, tone: 'blue' },
            { label: 'Outside', value: visible.filter((c) => c.kind === 'external').length, tone: 'amber' },
            { label: 'AI agents', value: visible.filter((c) => c.ai).length, tone: 'violet' },
        ];
        const rows = (n: number, dense?: boolean): RowItem[] => sorted.slice(0, n).map((c) => {
            const last = c.messages[c.messages.length - 1];
            const mine = last ? isOutgoing(last, viewer) : false;
            const line = last?.text?.trim() || (last?.attachments?.length ? `${last.attachments.length} attachment(s)` : last ? 'A card' : 'No messages yet');
            return {
                id: c.id, label: c.name, sub: `${mine ? 'You: ' : ''}${line}`, lead: <Avatar name={c.name} tone={toneForName(c.name)} size={dense ? 20 : 24} />,
                right: c.unread ? <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">{c.unread}</span> : <span className="text-[10px] tabular-nums text-slate-400">{c.lastAt}</span>,
                onOpen: () => { setMessagesFocus(c.id); go('/messages'); }, title: `${c.name} · ${c.role}`,
            };
        });
        const busiest = [...visible].map((c) => ({ label: c.name, value: c.messages.filter((m) => !m.system).length, tone: toneForName(c.name) })).sort((a, b) => b.value - a.value).slice(0, 6);
        const empty = <Empty>No chats here.</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(unread.length)} label="Unread threads" tone={unread.length ? 'blue' : 'emerald'} sub={unread.length ? `${fmtN(unreadMsgs)} messages waiting` : "You're all caught up"} />}
                aside={unread.length ? <AvatarStack names={unread.map((c) => c.name)} /> : undefined} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(unread.length)} label="Unread threads" tone={unread.length ? 'blue' : 'emerald'} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Team" value={kinds[0].value} tone="blue" /><Mini label="Outside" value={kinds[1].value} tone="amber" /></div></>}
                right={sorted.length ? <Rows items={rows(3, true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Unread threads', value: fmtN(unread.length), tone: unread.length ? 'blue' : 'emerald' }, { label: 'Unread messages', value: fmtN(unreadMsgs), tone: 'blue' },
            { label: 'Team chats', value: kinds[0].value, tone: 'slate' }, { label: 'Outside chats', value: kinds[1].value, tone: 'slate' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Threads">{sorted.length ? <Rows items={rows(6)} /> : empty}</Block>} side={<Block title="By kind"><Donut parts={kinds} size={104} label={fmtN(visible.length)} sub="threads" /></Block>} foot={<Note>Messages are workspace-wide</Note>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="t" title="Threads">{sorted.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
                <Block key="k" title="By kind"><Donut parts={kinds} size={120} label={fmtN(visible.length)} sub="threads" /></Block>,
                <Block key="b" title="Busiest threads">{busiest.length ? <HBars rows={busiest} dense /> : empty}</Block>,
            ]} foot={<Note>Messages are workspace-wide</Note>} />
        );
    },
};

// ── Recent activity ───────────────────────────────────────────────────────────

const CATEGORY_TONE: Record<string, Tone> = { users: 'violet', compliance: 'blue', monitoring: 'orange', fleet: 'indigo', settings: 'slate', auth: 'teal' };

const audit: WidgetDef = {
    id: 'audit', title: 'Recent activity', blurb: 'What people did here lately — the audit log by day and by category, newest first.',
    Icon: History, tone: 'slate', category: 'Team', menuKey: (s) => (s === 'profile' ? 'service-profile' : 'admin'), scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: (s) => (s === 'profile' ? '/service-profile/audit-log' : '/admin/audit-log'),
    option: { key: 'category', label: 'Category', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'users', label: 'Users' }, { id: 'compliance', label: 'Compliance' }, { id: 'monitoring', label: 'Monitoring' }, { id: 'fleet', label: 'Fleet' }, { id: 'settings', label: 'Settings' }, { id: 'auth', label: 'Sign-ins' }] },
    render: ({ data: d, go, opt }, size) => {
        const cat = opt('category');
        const list = cat === 'all' ? d.audit : d.audit.filter((e) => e.category === cat);
        const path = d.service ? '/service-profile/audit-log' : '/admin/audit-log';
        const DAY = 86_400_000;
        const now = Date.now();
        const today = list.filter((e) => now - Date.parse(e.at) < DAY).length;
        const month = list.filter((e) => now - Date.parse(e.at) < 30 * DAY);
        const days = Array.from({ length: 14 }, (_, i) => {
            const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (13 - i));
            const end = start.getTime() + DAY;
            return { label: start.toLocaleDateString(undefined, { day: 'numeric' }), value: list.filter((e) => { const t = Date.parse(e.at); return t >= start.getTime() && t < end; }).length };
        });
        const cats = new Map<string, number>();
        for (const e of d.audit.filter((x) => now - Date.parse(x.at) < 30 * DAY)) cats.set(e.category, (cats.get(e.category) ?? 0) + 1);
        const catParts: Part[] = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: humanize(c), value: v, tone: CATEGORY_TONE[c] ?? 'slate' }));
        const people = new Set(month.map((e) => e.actorName)).size;
        const timeline = (n: number) => list.slice(0, n).map((e) => ({ id: e.id, label: e.title, sub: `${e.actorName}${d.service ? ` · ${auditCarrierName(e)}` : ''}`, when: ago(e.at), tone: CATEGORY_TONE[e.category] ?? 'slate', onOpen: () => go(path) }));
        const empty = <Empty>Nothing logged yet.</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(today)} label="Actions today" tone="slate" sub={`${fmtN(month.length)} in the last 30 days`} />} aside={<Spark data={days.map((x) => x.value)} tone="slate" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(today)} label="Actions today" tone="slate" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="30 days" value={fmtN(month.length)} /><Mini label="People" value={people} tone="violet" /></div></>}
                right={list.length ? <Timeline items={timeline(3)} /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Last 30 days', value: fmtN(month.length), tone: 'slate' }, { label: 'Today', value: fmtN(today), tone: 'blue' },
            { label: 'People', value: people, tone: 'violet' }, { label: 'Categories', value: cats.size, tone: 'slate' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Per day · 14 days"><Columns data={days} series={[{ key: 'value', name: 'Actions', tone: 'slate' }]} height={H.lg} /></Block>} side={<Block title="Latest">{list.length ? <Timeline items={timeline(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="d" title="Per day · 14 days"><Columns data={days} series={[{ key: 'value', name: 'Actions', tone: 'slate' }]} height={H.xl} /></Block>,
                <Block key="c" title="By category · 30 days">{catParts.length ? <Donut parts={catParts} size={120} label={fmtN(d.audit.filter((x) => now - Date.parse(x.at) < 30 * DAY).length)} sub="actions" /> : empty}</Block>,
                <Block key="l" title="Latest">{list.length ? <Timeline items={timeline(7)} /> : empty}</Block>,
            ]} />
        );
    },
};

export const OVERVIEW_WIDGETS: WidgetDef[] = [attention, alerts, account, messages, audit];
