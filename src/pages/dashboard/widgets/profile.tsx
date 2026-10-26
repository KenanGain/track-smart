import { CreditCard, Grid3X3, LayoutList, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { carrierSlots } from '@/pages/users-roles/scope';
import type { CarrierInsights } from '@/pages/admin/profile-insights';
import { ALL_SIZES, TONE, type Tone, type WidgetDef } from '../dashboard-types';
import {
    Avatar, Big, Block, Columns, Donut, Dots, Empty, Glance, Mini, Note, Pill, Ring, Rows, Rows2, Split, Stack, Strip, Wide,
    fmtMoney, fmtN, pct, shortDate, type Part, type RowItem,
} from '../dashboard-charts';

const H = { md: 92, lg: 180, xl: 200 } as const;
const CARRIER_TONES: Tone[] = ['indigo', 'sky', 'teal', 'violet', 'blue', 'amber'];
const nameOf = (c: CarrierInsights) => c.carrier.dbaName || c.carrier.legalName;
/** Red where something is overdue or expired, amber where something is open, green otherwise. */
const healthTone = (c: CarrierInsights): Tone => (c.monitoring.byPriority.overdue || c.documents.expired || c.safety.inspectionsOos ? 'red' : c.monitoring.openAlerts || c.documents.requiredMissing ? 'amber' : 'emerald');

// ── Carrier health ────────────────────────────────────────────────────────────

type Metric = { key: string; label: string; short: string; read: (c: CarrierInsights) => number; warn: number; bad: number; tone: Tone };
const METRICS: Metric[] = [
    { key: 'alerts', label: 'Open alerts', short: 'Alerts', read: (c) => c.monitoring.openAlerts, warn: 1, bad: 25, tone: 'orange' },
    { key: 'overdue', label: 'Overdue alerts', short: 'Overdue', read: (c) => c.monitoring.byPriority.overdue, warn: 1, bad: 10, tone: 'red' },
    { key: 'missing', label: 'Records missing', short: 'Missing', read: (c) => c.documents.requiredMissing, warn: 1, bad: 50, tone: 'amber' },
    { key: 'expired', label: 'Documents expired', short: 'Expired', read: (c) => c.documents.expired, warn: 1, bad: 10, tone: 'red' },
    { key: 'tickets', label: 'Tickets open', short: 'Tickets', read: (c) => c.safety.ticketsOpen, warn: 1, bad: 10, tone: 'orange' },
    { key: 'accidents', label: 'Accidents', short: 'Accidents', read: (c) => c.safety.accidents, warn: 1, bad: 3, tone: 'red' },
    { key: 'oos', label: 'OOS inspections', short: 'OOS', read: (c) => c.safety.inspectionsOos, warn: 1, bad: 3, tone: 'red' },
    { key: 'maint', label: 'Maintenance overdue', short: 'Maint.', read: (c) => c.operations.tasksOverdue, warn: 1, bad: 5, tone: 'amber' },
];
const cellTone = (m: Metric, v: number): Tone => (v >= m.bad ? 'red' : v >= m.warn ? 'amber' : 'emerald');

/** A matrix: a row per carrier, a column per thing that can go wrong, coloured by how far it has gone. */
function HealthTable({ carriers, metrics, onOpen, dense }: { carriers: CarrierInsights[]; metrics: Metric[]; onOpen: (id: string) => void; dense?: boolean }) {
    return (
        <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-separate border-spacing-y-0.5 text-[11px]">
                <thead>
                    <tr className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="sticky left-0 bg-white pr-2 text-left font-bold">Carrier</th>
                        {metrics.map((m) => <th key={m.key} className="px-1 text-center font-bold" title={m.label}>{m.short}</th>)}
                        <th className="px-1 text-right font-bold">Drv / Ast</th>
                    </tr>
                </thead>
                <tbody>
                    {carriers.map((c, i) => (
                        <tr key={c.carrier.id} className="group/row cursor-pointer" onClick={() => onOpen(c.carrier.id)}>
                            <td className="sticky left-0 bg-white pr-2">
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <Avatar name={c.carrier.legalName} tone={CARRIER_TONES[i % CARRIER_TONES.length]} size={dense ? 18 : 22} className="rounded-md" />
                                    <span className="min-w-0">
                                        <span className="block max-w-[9rem] truncate font-semibold text-slate-800 group-hover/row:text-blue-700">{nameOf(c)}</span>
                                        {!dense && <span className="block truncate text-[10px] text-slate-400">{c.carrier.dotNumber ? `DOT ${c.carrier.dotNumber}` : c.carrier.status}</span>}
                                    </span>
                                </span>
                            </td>
                            {metrics.map((m) => {
                                const v = m.read(c);
                                return <td key={m.key} className="px-0.5 text-center"><span className={cn('inline-flex min-w-[2rem] justify-center rounded-md px-1.5 py-0.5 font-bold tabular-nums', v === 0 ? 'bg-slate-50 text-slate-400' : TONE[cellTone(m, v)].soft)}>{fmtN(v)}</span></td>;
                            })}
                            <td className="px-1 text-right tabular-nums text-slate-600">{c.fleet.drivers} <span className="text-slate-300">/</span> {c.fleet.assets}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const health: WidgetDef = {
    id: 'sp-health', title: 'Carrier health', blurb: 'The bird\'s-eye view: every carrier against every thing that can go wrong — alerts, missing and expired records, tickets, accidents, OOS, maintenance — coloured by how far it has gone. A row opens the carrier.',
    Icon: Grid3X3, tone: 'indigo', category: 'Overview', menuKey: 'service-profile', scopes: ['profile'], sizes: ALL_SIZES, defaultSize: 'xl',
    path: () => '/accounts',
    option: { key: 'sort', label: 'Sort by', default: 'alerts', choices: METRICS.map((m) => ({ id: m.key, label: m.label })) },
    render: ({ data: d, openCarrier, opt }, size) => {
        const s = d.service;
        if (!s) return <Empty>No service profile.</Empty>;
        const sortKey = opt('sort');
        const metric = METRICS.find((m) => m.key === sortKey) ?? METRICS[0];
        const sorted = [...s.carriers].sort((a, b) => metric.read(b) - metric.read(a));
        const parts: Part[] = [
            { label: 'Healthy', value: s.carriers.filter((c) => healthTone(c) === 'emerald').length, tone: 'emerald' },
            { label: 'Watch', value: s.carriers.filter((c) => healthTone(c) === 'amber').length, tone: 'amber' },
            { label: 'Act now', value: s.carriers.filter((c) => healthTone(c) === 'red').length, tone: 'red' },
        ];
        const worst = sorted[0];
        const stacked = sorted.slice(0, 6).map((c) => ({ label: nameOf(c), Overdue: c.monitoring.byPriority.overdue, Missing: c.documents.requiredMissing, Expired: c.documents.expired }));
        const open = (id: string) => openCarrier(id, '/account/profile');
        const empty = <Empty>No carriers yet.</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(d.carriers.length)} label="Carriers" tone={parts[2].value ? 'red' : parts[1].value ? 'amber' : 'emerald'} sub={worst ? `Most ${metric.label.toLowerCase()}: ${nameOf(worst)} (${fmtN(metric.read(worst))})` : 'No carriers'} />}
                aside={<Dots parts={parts} />} />
        );
        if (size === 'md') return (
            <Split leftWidth="8rem" left={<><Big value={fmtN(d.carriers.length)} label="Carriers" tone={parts[2].value ? 'red' : parts[1].value ? 'amber' : 'emerald'} /><div className="mt-auto pt-1"><Dots parts={parts} /></div></>}
                right={sorted.length ? <HealthTable carriers={sorted.slice(0, 4)} metrics={METRICS.slice(0, 4)} onOpen={open} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Carriers', value: fmtN(d.carriers.length), tone: 'indigo' }, { label: 'Act now', value: fmtN(parts[2].value), tone: parts[2].value ? 'red' : 'emerald' },
            { label: 'Watch', value: fmtN(parts[1].value), tone: parts[1].value ? 'amber' : 'emerald' }, { label: 'Healthy', value: fmtN(parts[0].value), tone: 'emerald' },
            ...(size === 'xl' ? [{ label: 'Open alerts', value: fmtN(s.monitoring.openAlerts), tone: 'orange' as Tone }, { label: 'Records missing', value: fmtN(s.documents.requiredMissing), tone: 'amber' as Tone }] : []),
        ]} />;
        const foot = <Note>Green = nothing open · amber = something open or missing · red = overdue, expired or out of service · sorted by {metric.label.toLowerCase()}</Note>;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Every carrier, every risk">{sorted.length ? <HealthTable carriers={sorted} metrics={METRICS.slice(0, 6)} onOpen={open} /> : empty}</Block>} foot={foot} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="t" title="Every carrier, every risk" className="@2xl:col-span-2">{sorted.length ? <HealthTable carriers={sorted} metrics={METRICS} onOpen={open} /> : empty}</Block>,
                <Block key="b" title="Overdue · missing · expired">{stacked.length ? <Rows2 data={stacked} height={H.xl} series={[{ key: 'Overdue', name: 'Overdue', tone: 'red', stack: 'a' }, { key: 'Missing', name: 'Missing', tone: 'amber', stack: 'a' }, { key: 'Expired', name: 'Expired', tone: 'orange', stack: 'a' }]} /> : empty}</Block>,
                <Block key="h" title="Health"><Donut parts={parts} size={120} label={fmtN(d.carriers.length)} sub="carriers" /></Block>,
            ]} foot={foot} />
        );
    },
};

// ── Carriers ──────────────────────────────────────────────────────────────────

const carriers: WidgetDef = {
    id: 'sp-carriers', title: 'Carriers', blurb: 'Every carrier under the profile with its open alerts, missing and expired records — click one to work on it.',
    Icon: LayoutList, tone: 'indigo', category: 'Overview', menuKey: 'service-profile', scopes: ['profile'], sizes: ALL_SIZES, defaultSize: 'lg',
    path: () => '/accounts',
    option: { key: 'sort', label: 'Sort by', default: 'alerts', choices: [{ id: 'alerts', label: 'Open alerts' }, { id: 'missing', label: 'Records missing' }, { id: 'expired', label: 'Expired' }, { id: 'drivers', label: 'Drivers' }, { id: 'name', label: 'Name' }] },
    render: ({ data: d, openCarrier, opt }, size) => {
        const s = d.service; const p = d.profile;
        if (!s) return <Empty>No service profile.</Empty>;
        const slots = p ? carrierSlots(p) : null;
        const limit = p && p.accountLimit >= 0 ? p.accountLimit : null;
        const active = d.carriers.filter((c) => c.status === 'Active').length;
        const sortKey = opt('sort');
        const sorted = [...s.carriers].sort((a, b) => sortKey === 'name' ? nameOf(a).localeCompare(nameOf(b)) : sortKey === 'missing' ? b.documents.requiredMissing - a.documents.requiredMissing : sortKey === 'expired' ? b.documents.expired - a.documents.expired : sortKey === 'drivers' ? b.fleet.drivers - a.fleet.drivers : b.monitoring.openAlerts - a.monitoring.openAlerts);
        const rows = (n: number, dense?: boolean): RowItem[] => sorted.slice(0, n).map((c, i) => ({
            id: c.carrier.id, label: nameOf(c), tone: healthTone(c), lead: <Avatar name={c.carrier.legalName} tone={CARRIER_TONES[i % CARRIER_TONES.length]} size={dense ? 20 : 24} className="rounded-md" />,
            sub: `${c.carrier.dotNumber ? `DOT ${c.carrier.dotNumber} · ` : ''}${c.fleet.drivers} drivers · ${c.fleet.assets} assets · ${c.documents.requiredMissing} missing · ${c.documents.expired} expired`,
            onOpen: () => openCarrier(c.carrier.id, '/account/profile'),
            right: <span className="flex shrink-0 items-center gap-1.5"><Pill tone={c.carrier.status === 'Active' ? 'emerald' : 'amber'}>{c.carrier.status}</Pill><span className={cn('w-8 text-right text-[12px] font-bold tabular-nums', TONE[healthTone(c)].text)}>{fmtN(c.monitoring.openAlerts)}</span></span>,
            title: dense ? `${c.carrier.legalName} · ${c.monitoring.openAlerts} open alerts` : undefined,
        }));
        const stacked = sorted.slice(0, 6).map((c) => ({ label: nameOf(c), 'Open alerts': c.monitoring.openAlerts, Missing: c.documents.requiredMissing, Expired: c.documents.expired }));
        const fleet = sorted.map((c) => ({ label: nameOf(c), Drivers: c.fleet.drivers, Assets: c.fleet.assets }));
        const parts: Part[] = [
            { label: 'Healthy', value: s.carriers.filter((c) => healthTone(c) === 'emerald').length, tone: 'emerald' },
            { label: 'Watch', value: s.carriers.filter((c) => healthTone(c) === 'amber').length, tone: 'amber' },
            { label: 'Act now', value: s.carriers.filter((c) => healthTone(c) === 'red').length, tone: 'red' },
        ];
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(d.carriers.length)} label="Carriers" tone="indigo" sub={`${fmtN(active)} active · ${fmtN(s.monitoring.openAlerts)} open alerts`} />}
                aside={slots && limit ? <Ring value={slots.used} max={limit} tone="indigo" label={`${slots.used}/${limit}`} sub="seats" /> : <Dots parts={parts} />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(d.carriers.length)} label="Carriers" tone="indigo" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Active" value={active} tone="emerald" /><Mini label="Open alerts" value={fmtN(s.monitoring.openAlerts)} tone="orange" /></div></>}
                right={sorted.length ? <Rows items={rows(3, true)} dense /> : <Empty>No carriers yet.</Empty>} />
        );
        const strip = <Strip figures={[
            { label: 'Carriers', value: fmtN(d.carriers.length), tone: 'indigo' }, { label: 'Active', value: fmtN(active), tone: 'emerald' },
            { label: 'Pending / suspended', value: fmtN(d.carriers.length - active), tone: d.carriers.length - active ? 'amber' : 'slate' },
            { label: 'Seats', value: slots ? `${slots.used}${limit ? ` / ${limit}` : ''}` : '—', tone: 'slate', sub: limit ? `${slots?.remaining ?? 0} remaining` : 'Unlimited' },
            { label: 'Open alerts', value: fmtN(s.monitoring.openAlerts), tone: s.monitoring.openAlerts ? 'orange' : 'emerald' },
        ]} />;
        const bars = (h: number) => <Block title="Alerts · missing · expired by carrier">{stacked.length ? <Rows2 data={stacked} height={h} series={[{ key: 'Open alerts', name: 'Open alerts', tone: 'orange', stack: 'a' }, { key: 'Missing', name: 'Missing', tone: 'slate', stack: 'a' }, { key: 'Expired', name: 'Expired', tone: 'red', stack: 'a' }]} /> : <Empty>No carriers yet.</Empty>}</Block>;
        if (size === 'lg') return <Stack strip={strip} main={bars(H.lg)} side={<Block title="Carriers · open alerts">{sorted.length ? <Rows items={rows(6)} /> : <Empty>No carriers yet.</Empty>}</Block>} foot={p && <Note>{p.legalName}</Note>} />;
        return (
            <Wide strip={strip} blocks={[bars(H.xl),
                <Block key="f" title="Drivers and assets"><Columns data={fleet} height={H.xl} series={[{ key: 'Drivers', name: 'Drivers', tone: 'blue' }, { key: 'Assets', name: 'Assets', tone: 'violet' }]} /></Block>,
                <Block key="c" title="Carriers · open alerts">{sorted.length ? <Rows items={rows(7, true)} dense /> : <Empty>No carriers yet.</Empty>}</Block>,
            ]} foot={p && <Note>{p.legalName}</Note>} />
        );
    },
};

// ── Fleet across carriers ─────────────────────────────────────────────────────

const fleet: WidgetDef = {
    id: 'sp-fleet', title: 'Fleet across carriers', blurb: 'Drivers and units under the profile, carrier by carrier, and the units\' operating status.',
    Icon: Users, tone: 'blue', category: 'Fleet', menuKey: 'service-profile', scopes: ['profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/accounts',
    render: ({ data: d, openCarrier }, size) => {
        const s = d.service;
        if (!s) return <Empty>No service profile.</Empty>;
        const per = s.carriers.map((c) => ({ label: nameOf(c), Drivers: c.fleet.drivers, Assets: c.fleet.assets }));
        const status: Part[] = [
            { label: 'Active', value: s.assets.active, tone: 'emerald' }, { label: 'Maintenance', value: s.assets.maintenance, tone: 'amber' },
            { label: 'Out of service', value: s.assets.outOfService, tone: 'red' }, { label: 'Deactivated', value: s.assets.deactivated, tone: 'slate' },
        ];
        const kinds: Part[] = [{ label: 'Power units', value: s.fleet.powerUnits, tone: 'blue' }, { label: 'Trailers', value: s.fleet.trailers, tone: 'violet' }];
        const rows = (n: number, dense?: boolean): RowItem[] => s.carriers.slice(0, n).map((c) => ({
            id: c.carrier.id, label: nameOf(c), sub: `${c.drivers.active} active drivers · ${c.assets.active} active units · ${c.drivers.cdlExpiring + c.drivers.cdlExpired} licences to renew`, tone: 'blue', onOpen: () => openCarrier(c.carrier.id, '/account/profile'),
            right: <span className="text-[12px] font-bold tabular-nums text-slate-800">{c.fleet.drivers} <span className="font-normal text-slate-400">/</span> {c.fleet.assets}</span>, title: dense ? `${c.fleet.drivers} drivers · ${c.fleet.assets} assets` : undefined,
        }));
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(s.fleet.drivers)} label="Drivers" tone="blue" sub={`${fmtN(s.fleet.assets)} assets across ${d.carriers.length} carriers`} />} aside={<Dots parts={kinds} />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(s.fleet.drivers)} label="Drivers" tone="blue" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Assets" value={fmtN(s.fleet.assets)} tone="violet" /><Mini label="Power units" value={fmtN(s.fleet.powerUnits)} tone="slate" /></div></>}
                right={<Block title="Per carrier"><Columns data={per} height={H.md} series={[{ key: 'Drivers', name: 'Drivers', tone: 'blue' }, { key: 'Assets', name: 'Assets', tone: 'violet' }]} /></Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Drivers', value: fmtN(s.fleet.drivers), tone: 'blue' }, { label: 'Assets', value: fmtN(s.fleet.assets), tone: 'violet' },
            { label: 'Power units', value: fmtN(s.fleet.powerUnits), tone: 'slate' }, { label: 'Trailers', value: fmtN(s.fleet.trailers), tone: 'slate' },
            { label: 'Licences to renew', value: fmtN(s.drivers.cdlExpiring + s.drivers.cdlExpired), tone: s.drivers.cdlExpired ? 'red' : 'amber' },
        ]} />;
        const chart = (h: number) => <Block title="Per carrier"><Columns data={per} height={h} series={[{ key: 'Drivers', name: 'Drivers', tone: 'blue' }, { key: 'Assets', name: 'Assets', tone: 'violet' }]} /></Block>;
        if (size === 'lg') return <Stack strip={strip} main={chart(H.lg)} side={<Block title="Units by status"><Donut parts={status} size={120} label={fmtN(s.fleet.assets)} sub="units" /></Block>} />;
        return (
            <Wide strip={strip} blocks={[chart(H.xl),
                <Block key="s" title="Units by status"><Donut parts={status} size={120} label={fmtN(s.fleet.assets)} sub="units" /></Block>,
                <Block key="c" title="Carriers · drivers / assets">{s.carriers.length ? <Rows items={rows(7, true)} dense /> : <Empty>No carriers yet.</Empty>}</Block>,
            ]} />
        );
    },
};

// ── Plan & billing ────────────────────────────────────────────────────────────

const billing: WidgetDef = {
    id: 'sp-billing', title: 'Plan & billing', blurb: 'The subscription, its seats, and what has been paid.',
    Icon: CreditCard, tone: 'emerald', category: 'Overview', menuKey: 'service-profile', scopes: ['profile'], sizes: ['sm', 'md'], defaultSize: 'sm',
    path: () => '/service-profile',
    render: ({ data: d }, size) => {
        const b = d.service?.billing;
        if (!b) return <Empty>No billing for this view.</Empty>;
        const sub = b.subscription;
        const tone: Tone = sub?.status === 'Active' ? 'emerald' : sub ? 'amber' : 'slate';
        const used = d.carriers.length;
        if (size === 'sm') return (
            <Glance big={<Big value={sub?.tier ?? '—'} label="Plan" tone={tone} sub={sub ? `${fmtMoney(sub.monthlyAmount)} / month · next ${shortDate(sub.nextBillingDate)}` : 'No subscription'} />}
                aside={sub ? <Ring value={used} max={Math.max(1, sub.seats)} tone={tone} label={`${used}/${sub.seats}`} sub="seats" /> : undefined} />
        );
        return (
            <Split left={<><Big value={sub?.tier ?? '—'} label="Plan" tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Monthly" value={sub ? fmtMoney(sub.monthlyAmount) : '—'} tone="blue" /><Mini label="Next bill" value={sub ? shortDate(sub.nextBillingDate) : '—'} /></div></>}
                right={<Rows dense items={[
                    { id: 'paid', label: 'Paid to date', tone: 'emerald', right: <span className="text-[12px] font-bold tabular-nums text-emerald-600">{fmtMoney(b.paid)}</span> },
                    { id: 'tx', label: 'Transactions', tone: 'slate', right: <span className="text-[12px] font-bold tabular-nums text-slate-700">{b.transactions}</span> },
                    { id: 'failed', label: 'Failed', tone: b.failed ? 'red' : 'slate', right: <span className={cn('text-[12px] font-bold tabular-nums', b.failed ? 'text-red-600' : 'text-slate-700')}>{b.failed}</span> },
                    { id: 'pending', label: 'Pending', tone: b.pending ? 'amber' : 'slate', right: <span className="text-[12px] font-bold tabular-nums text-slate-700">{b.pending}</span> },
                    { id: 'seats', label: 'Seats used', tone: 'slate', right: <span className="text-[12px] font-bold tabular-nums text-slate-700">{sub ? `${pct(used, sub.seats)}%` : '—'}</span> },
                ]} />} />
        );
    },
};

export const PROFILE_WIDGETS: WidgetDef[] = [health, carriers, fleet, billing];
