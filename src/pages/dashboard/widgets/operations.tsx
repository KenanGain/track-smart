import { Briefcase, Fuel, GraduationCap, Package, UserCog } from 'lucide-react';
import { ROLE_LABELS } from '@/data/users.data';
import { STATUS_META, STATUS_ORDER } from '@/pages/hiring-process/applicants.data';
import { ALL_SIZES, type Tone, type WidgetDef } from '../dashboard-types';
import {
    Avatar, AvatarStack, Big, Block, Columns, Donut, Dots, Empty, Funnel, Glance, HBars, Mini, Pill, Progress, Ring, Rows, Spark, Split, Stack, Strip, Trend, Wide,
    fmtMoney, fmtN, humanize, lastMonths, monthLabel, pct, shortDate, toneForScore, type Part, type RowItem,
} from '../dashboard-charts';

const H = { md: 92, lg: 180, xl: 200 } as const;
const STATUS_TONE: Record<string, Tone> = { waiting: 'slate', 'in-progress': 'blue', submitted: 'orange', 'under-review': 'amber', approved: 'emerald', rejected: 'red' };
const DAY = 86_400_000;

// ── Application tracking ──────────────────────────────────────────────────────

const hiring: WidgetDef = {
    id: 'hiring', title: 'Application tracking', blurb: 'The hiring pipeline as a funnel, with each applicant\'s progress through the steps — a row opens that file.',
    Icon: Briefcase, tone: 'blue', category: 'Hiring', menuKey: 'hiring-process', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/hiring-process/hiring',
    option: { key: 'stage', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'active', label: 'Active' }, { id: 'review', label: 'To review' }, { id: 'approved', label: 'Approved' }, { id: 'rejected', label: 'Rejected' }] },
    render: ({ data: d, go, opt }, size) => {
        const all = d.applicants;
        const pick = opt('stage');
        const list = pick === 'active' ? all.filter((a) => a.status === 'waiting' || a.status === 'in-progress') : pick === 'review' ? all.filter((a) => a.status === 'submitted' || a.status === 'under-review') : pick === 'approved' || pick === 'rejected' ? all.filter((a) => a.status === pick) : all;
        const count = (s: string) => all.filter((a) => a.status === s).length;
        const stages: Part[] = STATUS_ORDER.map((s) => ({ label: STATUS_META[s].label, value: count(s), tone: STATUS_TONE[s] ?? 'blue' }));
        const review = count('submitted') + count('under-review');
        const recent = [...list].sort((a, b) => b.updatedAt - a.updatedAt);
        const rows = (n: number, dense?: boolean): RowItem[] => recent.slice(0, n).map((a) => ({
            id: a.id, label: `${a.firstName} ${a.lastName}`, sub: `${d.service ? `${a.carrier} · ` : ''}${STATUS_META[a.status].label} · ${a.stepsDone}/${a.stepsTotal} steps`, tone: STATUS_TONE[a.status] ?? 'blue',
            lead: <Avatar name={`${a.firstName} ${a.lastName}`} tone={STATUS_TONE[a.status] ?? 'blue'} size={dense ? 20 : 24} />, onOpen: () => go(`/hiring-process/hiring/${a.id}`),
            right: <span className="flex shrink-0 items-center gap-1.5"><span className="hidden w-14 @md:block"><Progress value={a.stepsDone} max={a.stepsTotal} tone={STATUS_TONE[a.status] ?? 'blue'} /></span><Pill tone={STATUS_TONE[a.status] ?? 'blue'}>{STATUS_META[a.status].label}</Pill></span>,
            title: dense ? `${a.firstName} ${a.lastName} · ${a.carrier}` : undefined,
        }));
        const byCarrier = d.service ? d.service.carriers.map((c) => ({ label: c.carrier.dbaName || c.carrier.legalName, value: c.hiring.applicants, tone: 'blue' as Tone })).sort((a, b) => b.value - a.value) : null;
        const empty = <Empty>{pick === 'all' ? 'No applicants yet.' : 'Nobody at this stage.'}</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(list.length)} label={pick === 'all' ? 'Applicants' : `${humanize(pick)} applicants`} tone="blue" sub={`${fmtN(review)} to review · ${fmtN(count('approved'))} approved`} />}
                aside={all.length ? <Dots parts={stages.filter((s) => s.value > 0)} /> : undefined} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(list.length)} label={pick === 'all' ? 'Applicants' : humanize(pick)} tone="blue" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="To review" value={fmtN(review)} tone={review ? 'orange' : 'emerald'} /><Mini label="Approved" value={fmtN(count('approved'))} tone="emerald" /></div></>}
                right={all.length ? <Block title="Pipeline"><Funnel stages={stages} /></Block> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Applicants', value: fmtN(all.length), tone: 'blue' }, { label: 'In progress', value: fmtN(count('in-progress') + count('waiting')), tone: 'slate' },
            { label: 'To review', value: fmtN(review), tone: review ? 'orange' : 'emerald' }, { label: 'Approved', value: fmtN(count('approved')), tone: 'emerald' }, { label: 'Rejected', value: fmtN(count('rejected')), tone: 'red' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Pipeline">{all.length ? <Funnel stages={stages} /> : empty}</Block>} side={<Block title="Moved last">{recent.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="f" title="Pipeline">{all.length ? <Funnel stages={stages} /> : empty}</Block>,
                byCarrier ? <Block key="c" title="By carrier"><HBars rows={byCarrier} dense /></Block> : <Block key="s" title="By stage"><Donut parts={stages.filter((s) => s.value > 0)} size={120} label={fmtN(all.length)} sub="applicants" /></Block>,
                <Block key="r" title="Moved last">{recent.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Onboarding & training ─────────────────────────────────────────────────────

const onboarding: WidgetDef = {
    id: 'onboarding', title: 'Onboarding & training', blurb: 'Approved drivers being onboarded, and the trainings assigned to them — done, in progress, overdue.',
    Icon: GraduationCap, tone: 'violet', category: 'Hiring', menuKey: 'hiring-process', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/hiring-process/onboarding',
    option: { key: 'show', label: 'Show', default: 'due', choices: [{ id: 'due', label: 'Due next' }, { id: 'overdue', label: 'Overdue' }, { id: 'people', label: 'People' }] },
    render: ({ data: d, go, opt }, size) => {
        const pool = d.applicants.filter((a) => a.status === 'approved');
        const trainings = pool.flatMap((a) => (a.onboarding?.trainings ?? []).map((t) => ({ ...t, who: `${a.firstName} ${a.lastName}`, applicantId: a.id, due: t.assignedAt + t.dueDays * DAY })));
        const completed = trainings.filter((t) => t.status === 'completed');
        const overdue = trainings.filter((t) => t.status !== 'completed' && t.due < Date.now());
        const openT = trainings.filter((t) => t.status !== 'completed');
        const started = pool.filter((a) => !!a.onboarding?.startedAt).length;
        const pick = opt('show');
        const parts: Part[] = [
            { label: 'Completed', value: completed.length, tone: 'emerald' }, { label: 'In progress', value: trainings.filter((t) => t.status === 'in_progress').length, tone: 'blue' },
            { label: 'Assigned', value: trainings.filter((t) => t.status === 'assigned').length, tone: 'slate' }, { label: 'Overdue', value: overdue.length, tone: 'red' },
        ];
        const dueRows = (n: number, dense?: boolean): RowItem[] => [...(pick === 'overdue' ? overdue : openT)].sort((a, b) => a.due - b.due).slice(0, n).map((t) => ({
            id: `${t.applicantId}-${t.name}`, label: t.name, sub: `${t.who} · due ${shortDate(new Date(t.due).toISOString())}`, tone: t.due < Date.now() ? 'red' : 'amber', onOpen: () => go(`/hiring-process/onboarding/${t.applicantId}`),
            right: <Pill tone={t.due < Date.now() ? 'red' : t.status === 'in_progress' ? 'blue' : 'slate'}>{t.due < Date.now() ? 'Overdue' : humanize(t.status)}</Pill>, title: dense ? t.who : undefined,
        }));
        const people = (n: number): RowItem[] => pool.slice(0, n).map((a) => {
            const mine = trainings.filter((t) => t.applicantId === a.id);
            const done = mine.filter((t) => t.status === 'completed').length;
            return { id: a.id, label: `${a.firstName} ${a.lastName}`, sub: a.onboarding?.startedAt ? `Started ${shortDate(new Date(a.onboarding.startedAt).toISOString())} · ${done}/${mine.length} trainings` : 'Not started', tone: a.onboarding?.startedAt ? 'violet' : 'slate', lead: <Avatar name={`${a.firstName} ${a.lastName}`} tone="violet" size={20} />, onOpen: () => go(`/hiring-process/onboarding/${a.id}`), right: <span className="hidden w-14 @md:block"><Progress value={done} max={Math.max(1, mine.length)} tone="violet" /></span> };
        });
        const rows = (n: number, dense?: boolean) => (pick === 'people' ? people(n) : dueRows(n, dense));
        const listTitle = pick === 'people' ? 'People' : pick === 'overdue' ? 'Overdue' : 'Due next';
        const empty = <Empty>{pool.length ? 'Nothing here.' : 'Nobody is being onboarded right now.'}</Empty>;
        const done = pct(completed.length, trainings.length);
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(pool.length)} label="Onboarding" tone="violet" sub={`${fmtN(openT.length)} trainings open · ${fmtN(overdue.length)} overdue`} />}
                aside={<Ring value={completed.length} max={Math.max(1, trainings.length)} tone={toneForScore(done)} label={`${done}%`} sub="trained" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(pool.length)} label="Onboarding" tone="violet" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Trainings open" value={fmtN(openT.length)} tone="amber" /><Mini label="Overdue" value={fmtN(overdue.length)} tone={overdue.length ? 'red' : 'emerald'} /></div></>}
                right={rows(3, true).length ? <Rows items={rows(3, true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Onboarding', value: fmtN(pool.length), tone: 'violet' }, { label: 'Started', value: fmtN(started), tone: 'blue' },
            { label: 'Trainings open', value: fmtN(openT.length), tone: 'amber' }, { label: 'Overdue', value: fmtN(overdue.length), tone: overdue.length ? 'red' : 'emerald' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Trainings">{trainings.length ? <Donut parts={parts} size={120} label={`${done}%`} sub="done" /> : empty}</Block>} side={<Block title={listTitle}>{rows(6).length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="t" title="Trainings">{trainings.length ? <Donut parts={parts} size={120} label={`${done}%`} sub="done" /> : empty}</Block>,
                <Block key="d" title={listTitle}>{rows(7, true).length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
                <Block key="p" title="People">{people(7).length ? <Rows items={people(7)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Inventory ─────────────────────────────────────────────────────────────────

const inventory: WidgetDef = {
    id: 'inventory', title: 'Inventory', blurb: 'Items on hand and handed out to drivers and units, by status and category, and the ones expiring — a row opens that item.',
    Icon: Package, tone: 'slate', category: 'Fleet', menuKey: 'inventory', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/inventory',
    option: { key: 'status', label: 'Show', default: 'risk', choices: [{ id: 'risk', label: 'Expiring + expired' }, { id: 'expired', label: 'Expired' }, { id: 'handed', label: 'Handed out' }, { id: 'all', label: 'All' }] },
    render: ({ data: d, openRecord, opt }, size) => {
        const items = d.inventory;
        const handed = items.filter((it) => !!(it.assignedTo || it.assignedDriverId));
        const expiring = items.filter((it) => it.status === 'Expiring Soon');
        const expired = items.filter((it) => it.status === 'Expired');
        const pick = opt('status');
        const list = pick === 'expired' ? expired : pick === 'handed' ? handed : pick === 'all' ? items : [...expired, ...expiring];
        const status: Part[] = [{ label: 'Active', value: items.length - expiring.length - expired.length, tone: 'emerald' }, { label: 'Expiring soon', value: expiring.length, tone: 'amber' }, { label: 'Expired', value: expired.length, tone: 'red' }];
        const where: Part[] = [{ label: 'Handed out', value: handed.length, tone: 'blue' }, { label: 'In stock', value: items.length - handed.length, tone: 'slate' }];
        const cats = new Map<string, number>();
        for (const it of items) cats.set(humanize(it.categoryId ?? 'other'), (cats.get(humanize(it.categoryId ?? 'other')) ?? 0) + 1);
        const byCat = [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, tone: 'slate' as Tone }));
        const rows = (n: number, dense?: boolean): RowItem[] => list.slice(0, n).map((it) => ({
            id: it.id, label: it.name || humanize(it.categoryId ?? 'item'), sub: `${it.status} · ${shortDate(it.expiryDate)}`, tone: it.status === 'Expired' ? 'red' : it.status === 'Expiring Soon' ? 'amber' : 'emerald', onOpen: () => openRecord('/inventory', it.id),
            right: <Pill tone={it.assignedTo || it.assignedDriverId ? 'blue' : 'slate'}>{it.assignedTo || it.assignedDriverId ? 'Handed out' : 'In stock'}</Pill>, title: dense ? it.status : undefined,
        }));
        const empty = <Empty>Nothing here.</Empty>;
        const atRisk = expiring.length + expired.length;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(items.length)} label="Inventory items" tone="slate" sub={`${fmtN(handed.length)} handed out · ${fmtN(atRisk)} expiring or expired`} />}
                aside={<Ring value={atRisk} max={Math.max(1, items.length)} tone={expired.length ? 'red' : 'amber'} label={fmtN(atRisk)} sub="at risk" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(items.length)} label="Items" tone="slate" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Expiring" value={fmtN(expiring.length)} tone="amber" /><Mini label="Expired" value={fmtN(expired.length)} tone={expired.length ? 'red' : 'emerald'} /></div></>}
                right={items.length ? <Donut parts={status} size={96} label={fmtN(items.length)} sub="items" /> : <Empty>No inventory.</Empty>} />
        );
        const strip = <Strip figures={[
            { label: 'Items', value: fmtN(items.length), tone: 'slate' }, { label: 'Handed out', value: fmtN(handed.length), tone: 'blue' }, { label: 'In stock', value: fmtN(items.length - handed.length), tone: 'slate' },
            { label: 'Expiring', value: fmtN(expiring.length), tone: 'amber' }, { label: 'Expired', value: fmtN(expired.length), tone: expired.length ? 'red' : 'emerald' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Where it is"><Donut parts={where} size={120} label={`${pct(handed.length, items.length)}%`} sub="handed out" /></Block>} side={<Block title={humanize(pick === 'risk' ? 'Expiring' : pick)}>{list.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="w" title="Where it is"><Donut parts={where} size={120} label={`${pct(handed.length, items.length)}%`} sub="handed out" /></Block>,
                <Block key="c" title="By category">{byCat.length ? <HBars rows={byCat} dense /> : <Empty>No inventory.</Empty>}</Block>,
                <Block key="e" title={humanize(pick === 'risk' ? 'Expiring' : pick)}>{list.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Fuel ──────────────────────────────────────────────────────────────────────

const fuel: WidgetDef = {
    id: 'fuel', title: 'Fuel', blurb: 'Spend or gallons by month, idling and economy, and the units that burn the most.',
    Icon: Fuel, tone: 'emerald', category: 'Fleet', menuKey: 'fuel', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/fuel',
    option: { key: 'metric', label: 'Metric', default: 'spend', choices: [{ id: 'spend', label: 'Spend' }, { id: 'gallons', label: 'Gallons' }] },
    render: ({ data: d, go, opt, months }, size) => {
        const c = d.carrier ?? d.service;
        const metric = opt('metric');
        const spend = d.purchases.reduce((s, p) => s + p.totalCost, 0);
        const gallons = d.purchases.reduce((s, p) => s + p.gallons, 0);
        const idleMin = d.idling.reduce((s, e) => s + e.durationMinutes, 0);
        const wasted = d.idling.reduce((s, e) => s + e.fuelWastedGal, 0);
        const read = (p: (typeof d.purchases)[number]) => (metric === 'gallons' ? p.gallons : p.totalCost);
        const fmt = (v: number) => (metric === 'gallons' ? `${fmtN(Math.round(v))} gal` : fmtMoney(v));
        const byMonth = lastMonths(months).map((m) => ({ label: monthLabel(m), value: Math.round(d.purchases.filter((p) => p.date.startsWith(m)).reduce((s, p) => s + read(p), 0)) }));
        const mpg = c && c.fuel.mpgCount ? (c.fuel.mpgSum / c.fuel.mpgCount).toFixed(1) : '—';
        const byUnit = new Map<string, number>();
        for (const p of d.purchases) byUnit.set(p.unitNumber, (byUnit.get(p.unitNumber) ?? 0) + read(p));
        const units = [...byUnit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value: Math.round(value), tone: 'emerald' as Tone }));
        const recent = [...d.purchases].sort((a, b) => b.date.localeCompare(a.date));
        const rows = (n: number, dense?: boolean): RowItem[] => recent.slice(0, n).map((p) => ({
            id: p.id, label: `${p.unitNumber} · ${p.gallons.toFixed(1)} gal`, sub: `${p.driverName} · ${shortDate(p.date)}`, tone: 'emerald', onOpen: () => go('/fuel'),
            right: <span className="text-[12px] font-bold tabular-nums text-slate-800">{fmtMoney(p.totalCost)}</span>, title: dense ? p.driverName : undefined,
        }));
        const headline = metric === 'gallons' ? fmtN(Math.round(gallons)) : fmtMoney(spend);
        const headLabel = metric === 'gallons' ? 'Fuel gallons' : 'Fuel spend';
        const empty = <Empty>No fuel purchases.</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={headline} label={headLabel} tone="emerald" sub={`${metric === 'gallons' ? fmtMoney(spend) : `${fmtN(Math.round(gallons))} gal`} · ${mpg} MPG · ${fmtN(Math.round(idleMin / 60))}h idle`} />}
                aside={<Spark data={byMonth.map((m) => m.value)} tone="emerald" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={headline} label={headLabel} tone="emerald" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Idle hours" value={fmtN(Math.round(idleMin / 60))} tone="amber" /><Mini label="Avg MPG" value={mpg} tone="slate" /></div></>}
                right={<Block title={`${metric === 'gallons' ? 'Gallons' : 'Spend'} by month`}><Trend data={byMonth} tone="emerald" height={H.md} format={fmt} name={metric === 'gallons' ? 'Gallons' : 'Spend'} /></Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Spend', value: fmtMoney(spend), tone: 'emerald' }, { label: 'Gallons', value: fmtN(Math.round(gallons)), tone: 'blue' },
            { label: 'Idle hours', value: fmtN(Math.round(idleMin / 60)), tone: 'amber', sub: `${wasted.toFixed(0)} gal wasted` }, { label: 'Avg MPG', value: mpg, tone: 'slate' },
            ...(size === 'xl' ? [{ label: 'Purchases', value: fmtN(d.purchases.length), tone: 'slate' as Tone }] : []),
        ]} />;
        const chart = (h: number) => <Block title={`${metric === 'gallons' ? 'Gallons' : 'Spend'} by month · ${months} months`}><Columns data={byMonth} series={[{ key: 'value', name: metric === 'gallons' ? 'Gallons' : 'Spend', tone: 'emerald' }]} height={h} format={fmt} yFormat={metric === 'gallons' ? undefined : (v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} /></Block>;
        if (size === 'lg') return <Stack strip={strip} main={chart(H.lg)} side={<Block title={`${metric === 'gallons' ? 'Gallons' : 'Spend'} by unit`}>{units.length ? <HBars rows={units} dense format={(v) => fmt(v)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[chart(H.xl),
                <Block key="u" title={`${metric === 'gallons' ? 'Gallons' : 'Spend'} by unit`}>{units.length ? <HBars rows={units} dense format={(v) => fmt(v)} /> : empty}</Block>,
                <Block key="r" title="Latest purchases">{recent.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Users & roles ─────────────────────────────────────────────────────────────

const ROLE_TONE: Record<string, Tone> = { 'super-admin': 'violet', admin: 'blue', 'fleet-admin': 'sky', 'safety-manager': 'amber', user: 'slate', driver: 'emerald' };

const users: WidgetDef = {
    id: 'users', title: 'Users & roles', blurb: 'Who has a login here — by role, by state, and the people themselves.',
    Icon: UserCog, tone: 'violet', category: 'Team', menuKey: (s) => (s === 'profile' ? 'service-profile' : 'settings'), scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: (s) => (s === 'profile' ? '/service-profile/users-roles' : '/settings/users-roles'),
    option: { key: 'state', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'Active', label: 'Active' }, { id: 'Invited', label: 'Invited' }, { id: 'Inactive', label: 'Inactive' }] },
    render: ({ data: d, go, opt }, size) => {
        const all = d.users;
        const pick = opt('state');
        const list = pick === 'all' ? all : all.filter((u) => u.status === pick);
        const path = d.service ? '/service-profile/users-roles' : '/settings/users-roles';
        const roles = new Map<string, number>();
        for (const u of list) roles.set(u.role, (roles.get(u.role) ?? 0) + 1);
        const byRole: Part[] = [...roles.entries()].sort((a, b) => b[1] - a[1]).map(([r, v]) => ({ label: ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r, value: v, tone: ROLE_TONE[r] ?? 'slate' }));
        const states: Part[] = [{ label: 'Active', value: all.filter((u) => u.status === 'Active').length, tone: 'emerald' }, { label: 'Invited', value: all.filter((u) => u.status === 'Invited').length, tone: 'amber' }, { label: 'Inactive', value: all.filter((u) => u.status === 'Inactive').length, tone: 'slate' }];
        const rows = (n: number, dense?: boolean): RowItem[] => list.slice(0, n).map((u) => ({
            id: u.id, label: u.name, sub: `${ROLE_LABELS[u.role]} · ${u.email}`, tone: ROLE_TONE[u.role] ?? 'slate', lead: <Avatar name={u.name} tone={ROLE_TONE[u.role] ?? 'slate'} size={dense ? 20 : 24} />, onOpen: () => go(path),
            right: <Pill tone={u.status === 'Active' ? 'emerald' : u.status === 'Invited' ? 'amber' : 'slate'}>{u.status}</Pill>, title: dense ? `${u.name} · ${ROLE_LABELS[u.role]}` : undefined,
        }));
        const driverLogins = d.carrier?.users.driverLogins ?? 0;
        const empty = <Empty>{pick === 'all' ? 'No office users yet.' : `Nobody ${pick.toLowerCase()}.`}</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(list.length)} label={pick === 'all' ? 'Office users' : `${pick} users`} tone="violet" sub={`${states[1].value} invited · ${driverLogins} driver logins`} />} aside={list.length ? <AvatarStack names={list.map((u) => u.name)} tone="violet" /> : undefined} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(list.length)} label={pick === 'all' ? 'Office users' : pick} tone="violet" /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Active" value={states[0].value} tone="emerald" /><Mini label="Invited" value={states[1].value} tone={states[1].value ? 'amber' : 'slate'} /></div></>}
                right={<Block title="By role">{byRole.length ? <HBars rows={byRole} dense /> : empty}</Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Office users', value: fmtN(all.length), tone: 'violet' }, { label: 'Active', value: states[0].value, tone: 'emerald' },
            { label: 'Invited', value: states[1].value, tone: states[1].value ? 'amber' : 'slate' }, { label: d.service ? 'Carriers' : 'Driver logins', value: d.service ? d.carriers.length : driverLogins, tone: 'blue' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="By role">{byRole.length ? <Donut parts={byRole} size={120} label={fmtN(list.length)} sub="users" /> : empty}</Block>} side={<Block title="People">{list.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="r" title="By role">{byRole.length ? <Donut parts={byRole} size={120} label={fmtN(list.length)} sub="users" /> : empty}</Block>,
                <Block key="s" title="By state"><Columns data={states.map((s) => ({ label: s.label, value: s.value }))} series={[{ key: 'value', name: 'Users', tone: 'violet' }]} height={H.xl} /></Block>,
                <Block key="p" title="People">{list.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

export const OPERATIONS_WIDGETS: WidgetDef[] = [hiring, onboarding, inventory, fuel, users];
