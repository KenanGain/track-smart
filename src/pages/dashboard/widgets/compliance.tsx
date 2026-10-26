import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCheck, FileCheck2, FileText, MessageSquare, Truck, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PRIORITY_META, dueShort, type MonitoringAlert } from '@/pages/compliance/monitoring-alerts';
import { STAGE_LABEL, inspectionStage, type InspectionStage } from '@/pages/roadside/roadside.data';
import { getOrCreateDriverConversation, setMessagesFocus } from '@/pages/messages/messages-store';
import type { AccountRecord } from '@/pages/accounts/accounts.data';
import { ALL_SIZES, TONE, type BuildCtx, type Tone, type WidgetDef } from '../dashboard-types';
import type { SubjectGaps } from '../dashboard-data';
import type { WidgetSize } from '../dashboard-layout';
import {
    Big, Block, CAL_RANK, Columns, Donut, Empty, Glance, HBars, Mini, MonthGrid, Note, Pill, Ring, Rows, Rows2, Segments, Split, Stack, Strip, Wide,
    fmtMoney, fmtN, lastMonths, monthLabel, pct, shortDate, toneForDays, toneForScore, type CalTone, type Part, type RowItem,
} from '../dashboard-charts';
import { PRIORITY_TONE } from './overview';

const H = { md: 92, lg: 180, xl: 200 } as const;

// ── Driver / asset compliance ─────────────────────────────────────────────────

const complianceFor = (entity: 'drivers' | 'assets'): WidgetDef => {
    const one = entity === 'drivers' ? 'driver' : 'unit';
    const plural = entity === 'drivers' ? 'drivers' : 'units';
    const Entity = entity === 'drivers' ? 'Driver' : 'Asset';
    return {
        id: entity === 'drivers' ? 'driver-compliance' : 'asset-compliance',
        title: entity === 'drivers' ? 'Driver compliance & documents' : 'Asset compliance & documents',
        blurb: `Required ${one} records — complete, expiring, expired, missing — which ${plural} are short, and an upload straight to the gap.`,
        Icon: entity === 'drivers' ? FileCheck2 : ClipboardCheck, tone: entity === 'drivers' ? 'emerald' : 'sky', category: 'Compliance',
        menuKey: 'default-compliance-documents', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
        path: () => '/default-compliance-documents',
        option: { key: 'only', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All gaps' }, { id: 'missing', label: 'Missing' }, { id: 'expired', label: 'Expired' }, { id: 'expiring', label: 'Expiring' }] },
        render: ({ data: d, go, openRecord, openCarrier, opt }, size) => {
            const only = opt('only');
            let gaps: SubjectGaps[];
            let subjects: number;
            if (d.service) {
                gaps = d.service.carriers.map((c) => ({
                    id: c.carrier.id, label: c.carrier.dbaName || c.carrier.legalName, sub: `${entity === 'drivers' ? c.fleet.drivers : c.fleet.assets} ${plural}`,
                    required: (entity === 'drivers' ? c.coverage.driverComplete + c.coverage.driverMissing : c.coverage.assetComplete + c.coverage.assetMissing),
                    complete: entity === 'drivers' ? c.coverage.driverComplete : c.coverage.assetComplete,
                    missing: entity === 'drivers' ? c.coverage.driverMissing : c.coverage.assetMissing,
                    expiring: 0, expired: 0, gapList: [],
                }));
                subjects = entity === 'drivers' ? d.service.fleet.drivers : d.service.fleet.assets;
            } else {
                gaps = entity === 'drivers' ? d.gaps.drivers : d.gaps.assets;
                subjects = gaps.length;
            }
            const sum = (k: 'required' | 'complete' | 'missing' | 'expiring' | 'expired') => gaps.reduce((s, g) => s + g[k], 0);
            const required = sum('required'); const complete = sum('complete'); const missing = sum('missing'); const expiring = sum('expiring'); const expired = sum('expired');
            const done = pct(complete, required);
            const tone = toneForScore(done);
            const allParts: Part[] = [
                { label: 'Complete', value: complete - expiring, tone: 'emerald' }, { label: 'Expiring', value: expiring, tone: 'amber' },
                { label: 'Expired', value: expired, tone: 'red' }, { label: 'Missing', value: missing, tone: 'slate' },
            ];
            const parts = allParts.filter((p) => p.value > 0 || !d.service);
            const short = [...gaps]
                .filter((g) => only === 'missing' ? g.missing > 0 : only === 'expired' ? g.expired > 0 : only === 'expiring' ? g.expiring > 0 : g.missing + g.expired + g.expiring > 0)
                .sort((a, b) => (b.missing + b.expired) - (a.missing + a.expired) || b.expiring - a.expiring);
            // The row's go-to lands on the first gap's record — where the upload is.
            const openGap = (g: SubjectGaps) => {
                if (d.service) openCarrier(g.id, '/default-compliance-documents');
                else if (g.firstGap) openRecord('/default-compliance-documents', `${Entity}|${g.id}|${g.firstGap.recordId}`);
                else go('/default-compliance-documents');
            };
            const rows = (n: number, dense?: boolean): RowItem[] => short.slice(0, n).map((g) => ({
                id: g.id, label: g.label, tone: g.missing + g.expired ? 'red' : 'amber', onOpen: () => openGap(g),
                sub: [g.missing ? `${g.missing} missing` : '', g.expired ? `${g.expired} expired` : '', g.expiring ? `${g.expiring} expiring` : ''].filter(Boolean).join(' · ') || g.sub,
                right: <span className={cn('w-8 shrink-0 text-right text-[11px] font-bold tabular-nums', TONE[toneForScore(pct(g.complete, g.required))].text)}>{pct(g.complete, g.required)}%</span>,
                actions: d.service ? undefined : [
                    { label: `Records of ${g.label}`, Icon: FileText, onClick: () => openRecord('/default-compliance-documents', `${Entity}|${g.id}`), tone: 'blue' as Tone },
                    ...(entity === 'drivers' ? [{ label: `Ask ${g.label} in chat`, Icon: MessageSquare, onClick: () => { setMessagesFocus(getOrCreateDriverConversation(g.label)); go('/messages'); }, tone: 'slate' as Tone }] : []),
                ],
                title: dense ? `${g.label}: ${g.complete} of ${g.required} complete${g.firstGap ? ` · first: ${g.firstGap.name}` : ''}` : undefined,
            }));
            const stacked = short.slice(0, 6).map((g) => ({ label: g.label, Missing: g.missing, Expired: g.expired, Expiring: g.expiring }));
            const empty = <Empty>{only === 'all' ? `Every ${one} has every required record.` : `Nothing ${only}.`}</Empty>;
            const noun = entity === 'drivers' ? 'Drivers' : 'Assets';
            if (size === 'sm') return (
                <Glance big={<Big value={`${done}%`} label={`${noun} · records complete`} tone={tone} sub={`${fmtN(missing)} missing · ${fmtN(expired)} expired · ${fmtN(expiring)} expiring`} />}
                    aside={<Ring value={complete} max={Math.max(1, required)} tone={tone} label={fmtN(subjects)} sub={plural} />} />
            );
            if (size === 'md') return (
                <Split left={<><Big value={`${done}%`} label={`${noun} · complete`} tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Missing" value={fmtN(missing)} tone={missing ? 'red' : 'emerald'} /><Mini label="Expired" value={fmtN(expired)} tone={expired ? 'red' : 'emerald'} /></div></>}
                    right={<Donut parts={parts} size={96} label={`${done}%`} sub="complete" />} />
            );
            const strip = <Strip figures={[
                { label: noun, value: fmtN(subjects), tone: 'blue' }, { label: 'Complete', value: `${done}%`, tone, sub: `${fmtN(complete)} of ${fmtN(required)} records` },
                { label: 'Missing', value: fmtN(missing), tone: missing ? 'red' : 'emerald' }, { label: 'Expiring', value: fmtN(expiring), tone: 'amber' }, { label: 'Expired', value: fmtN(expired), tone: expired ? 'red' : 'emerald' },
            ]} />;
            const foot = <Note>Required records only · expiry within 30 days counts as expiring · ↗ opens the first gap, the list icon the {one}'s records</Note>;
            if (size === 'lg') return (
                <Stack strip={strip} main={<Block title="Required records"><Donut parts={parts} size={120} label={`${done}%`} sub="complete" /></Block>}
                    side={<Block title={d.service ? 'Carriers short of records' : `${noun} short of records`}>{short.length ? <Rows items={rows(6)} /> : empty}</Block>} foot={foot} />
            );
            return (
                <Wide strip={strip} blocks={[
                    <Block key="d" title="Required records"><Donut parts={parts} size={120} label={`${done}%`} sub="complete" /></Block>,
                    <Block key="g" title="Most gaps">{stacked.length ? <Rows2 data={stacked} height={H.xl} series={[{ key: 'Missing', name: 'Missing', tone: 'slate', stack: 'a' }, { key: 'Expired', name: 'Expired', tone: 'red', stack: 'a' }, { key: 'Expiring', name: 'Expiring', tone: 'amber', stack: 'a' }]} /> : empty}</Block>,
                    <Block key="r" title={d.service ? 'Carriers' : `${noun} short of records`}>{short.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
                ]} foot={foot} />
            );
        },
    };
};

// ── Monitoring calendar ───────────────────────────────────────────────────────

/** A month of due dates; the widget keeps which month and day it is on. */
function CalendarWidget({ ctx, size }: { ctx: BuildCtx; size: WidgetSize }) {
    const { data: d, openAlert } = ctx;
    const today = new Date();
    const [offset, setOffset] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const m = (d.carrier ?? d.service)?.monitoring;
    if (!m) return <Empty>No monitoring for this view.</Empty>;
    const dated = (m.alerts as (MonitoringAlert & { carrier?: AccountRecord })[]).filter((a) => !a.isStatus && /^\d{4}-\d{2}-\d{2}/.test(a.date));
    const view = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const key = (y: number, mo: number) => `${y}-${String(mo + 1).padStart(2, '0')}`;
    const inMonth = (y: number, mo: number) => dated.filter((a) => a.date.startsWith(key(y, mo)));
    const daysOf = (y: number, mo: number) => {
        const map = new Map<string, { tone: CalTone; count: number }>();
        for (const a of inMonth(y, mo)) {
            const k = a.date.slice(0, 10);
            const t = toneForDays(a.daysUntil);
            const cur = map.get(k);
            map.set(k, { tone: cur && CAL_RANK[cur.tone] > CAL_RANK[t] ? cur.tone : t, count: (cur?.count ?? 0) + 1 });
        }
        return map;
    };
    const thisMonth = inMonth(today.getFullYear(), today.getMonth());
    const overdue = dated.filter((a) => a.daysUntil !== null && a.daysUntil < 0).length;
    const next30 = dated.filter((a) => a.daysUntil !== null && a.daysUntil >= 0 && a.daysUntil <= 30).length;
    const next90 = dated.filter((a) => a.daysUntil !== null && a.daysUntil > 30 && a.daysUntil <= 90).length;
    const parts: Part[] = [{ label: 'Overdue', value: overdue, tone: 'red' }, { label: '≤ 30 days', value: next30, tone: 'amber' }, { label: '≤ 90 days', value: next90, tone: 'blue' }, { label: 'Later', value: Math.max(0, dated.length - overdue - next30 - next90), tone: 'slate' }];
    const viewList = selected ? dated.filter((a) => a.date.startsWith(selected)) : inMonth(view.getFullYear(), view.getMonth());
    const listSorted = [...viewList].sort((a, b) => a.date.localeCompare(b.date));
    const nextDue = [...dated].filter((a) => (a.daysUntil ?? -1) >= 0).sort((a, b) => a.date.localeCompare(b.date))[0];
    const rows = (n: number, dense?: boolean): RowItem[] => listSorted.slice(0, n).map((a) => ({
        id: a.id, label: a.title, tone: PRIORITY_TONE[a.priority], onOpen: () => openAlert(a, a.carrier?.id),
        sub: [a.carrier?.dbaName, a.subjectLabel, shortDate(a.date)].filter(Boolean).join(' · '),
        right: <Pill tone={PRIORITY_TONE[a.priority]}>{dueShort(a.daysUntil) || PRIORITY_META[a.priority].label}</Pill>, title: dense ? `${a.title} · ${a.subjectLabel}` : undefined,
    }));
    const nav = (
        <div className="flex shrink-0 items-center justify-between gap-1">
            <button type="button" onClick={() => { setOffset((o) => o - 1); setSelected(null); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" aria-label="Previous month"><ChevronLeft size={14} /></button>
            <span className="text-[11px] font-bold text-slate-800">{view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
            <span className="flex items-center gap-1">
                {offset !== 0 && <button type="button" onClick={() => { setOffset(0); setSelected(null); }} className="rounded border border-slate-200 px-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">Today</button>}
                <button type="button" onClick={() => { setOffset((o) => o + 1); setSelected(null); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100" aria-label="Next month"><ChevronRight size={14} /></button>
            </span>
        </div>
    );
    const grid = (y: number, mo: number, compact?: boolean) => <MonthGrid year={y} month={mo} days={daysOf(y, mo)} selected={selected} onSelect={(k) => setSelected((s) => (s === k ? null : k))} compact={compact} />;
    const tone: Tone = overdue ? 'red' : next30 ? 'amber' : 'emerald';
    const empty = <Empty>{selected ? `Nothing due on ${shortDate(selected)}.` : 'Nothing due this month.'}</Empty>;
    if (size === 'sm') return (
        <Glance big={<Big value={fmtN(thisMonth.length)} label="Due this month" tone={tone} sub={nextDue ? `Next: ${nextDue.title} · ${shortDate(nextDue.date)}` : 'Nothing coming up'} />}
            aside={<Ring value={overdue} max={Math.max(1, dated.length)} tone="red" label={fmtN(overdue)} sub="overdue" />}
            foot={<Segments parts={parts} legend={false} height={6} />} />
    );
    if (size === 'md') return (
        <Split leftWidth="8.5rem" left={<><Big value={fmtN(thisMonth.length)} label="Due this month" tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Overdue" value={fmtN(overdue)} tone={overdue ? 'red' : 'emerald'} /><Mini label="≤ 30 days" value={fmtN(next30)} tone="amber" /></div></>}
            right={<div className="flex min-h-0 flex-col gap-1">{nav}{grid(view.getFullYear(), view.getMonth(), true)}</div>} />
    );
    const strip = <Strip figures={[
        { label: 'This month', value: fmtN(thisMonth.length), tone }, { label: 'Overdue', value: fmtN(overdue), tone: overdue ? 'red' : 'emerald' },
        { label: 'Next 30 days', value: fmtN(next30), tone: 'amber' }, { label: 'Next 90 days', value: fmtN(next90), tone: 'blue' },
    ]} />;
    const legend = <Segments parts={parts} height={6} />;
    if (size === 'lg') return (
        <Stack strip={strip}
            main={<Block title="Calendar"><div className="flex min-h-0 flex-col gap-1.5">{nav}{grid(view.getFullYear(), view.getMonth())}<div className="mt-auto pt-1">{legend}</div></div></Block>}
            side={<Block title={selected ? `Due ${shortDate(selected)}` : `Due in ${view.toLocaleDateString(undefined, { month: 'long' })}`}>{listSorted.length ? <Rows items={rows(6)} /> : empty}</Block>} />
    );
    const nextView = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    return (
        <Wide strip={strip} blocks={[
            <Block key="a" title="Calendar"><div className="flex min-h-0 flex-col gap-1.5">{nav}{grid(view.getFullYear(), view.getMonth())}<div className="mt-auto pt-1">{legend}</div></div></Block>,
            <Block key="b" title={nextView.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}>{grid(nextView.getFullYear(), nextView.getMonth())}</Block>,
            <Block key="c" title={selected ? `Due ${shortDate(selected)}` : `Due in ${view.toLocaleDateString(undefined, { month: 'long' })}`}>{listSorted.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
        ]} />
    );
}

const calendar: WidgetDef = {
    id: 'calendar', title: 'Monitoring calendar', blurb: 'The month ahead — every monitored due date on its day, coloured by how close it is; pick a day to see what is due.',
    Icon: CalendarDays, tone: 'teal', category: 'Compliance', menuKey: 'default-compliance-monitoring', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/default-compliance-monitoring',
    render: (ctx, size) => <CalendarWidget ctx={ctx} size={size} />,
};

// ── Maintenance ───────────────────────────────────────────────────────────────

const maintenance: WidgetDef = {
    id: 'maintenance', title: 'Maintenance', blurb: 'Service overdue, due and coming up, open work orders and what it has cost — by unit and by when.',
    Icon: Wrench, tone: 'amber', category: 'Fleet', menuKey: 'fleet-maintenance', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/maintenance',
    option: { key: 'due', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'overdue', label: 'Overdue' }, { id: 'due', label: 'Due' }, { id: 'upcoming', label: 'Upcoming' }] },
    render: ({ data: d, go, openRecord, opt }, size) => {
        const c = d.carrier ?? d.service;
        if (!c) return <Empty>No maintenance for this view.</Empty>;
        const list = d.maintenance;
        const overdue = list.filter((a) => a.statusPriority === 'overdue');
        const due = list.filter((a) => a.statusPriority === 'critical');
        const upcoming = list.filter((a) => a.statusPriority !== 'overdue' && a.statusPriority !== 'critical');
        const pick = opt('due');
        const picked = pick === 'overdue' ? overdue : pick === 'due' ? due : pick === 'upcoming' ? upcoming : list;
        const rank = (s?: string) => (s === 'overdue' ? 0 : s === 'critical' ? 1 : 2);
        const sorted = [...picked].sort((a, b) => rank(a.statusPriority) - rank(b.statusPriority) || (a.daysUntil ?? 9999) - (b.daysUntil ?? 9999));
        const parts: Part[] = [{ label: 'Overdue', value: overdue.length, tone: 'red' }, { label: 'Due', value: due.length, tone: 'amber' }, { label: 'Upcoming', value: upcoming.length, tone: 'emerald' }];
        const buckets = [
            { label: 'Overdue', value: overdue.length },
            { label: '≤ 7d', value: list.filter((a) => a.statusPriority !== 'overdue' && a.daysUntil !== null && a.daysUntil <= 7).length },
            { label: '≤ 30d', value: list.filter((a) => a.daysUntil !== null && a.daysUntil > 7 && a.daysUntil <= 30).length },
            { label: '≤ 90d', value: list.filter((a) => a.daysUntil !== null && a.daysUntil > 30 && a.daysUntil <= 90).length },
            { label: 'Later', value: list.filter((a) => a.daysUntil === null || a.daysUntil > 90).length },
        ];
        const byUnit = new Map<string, number>();
        for (const a of picked) byUnit.set(a.subjectLabel, (byUnit.get(a.subjectLabel) ?? 0) + 1);
        const units = [...byUnit.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, tone: 'amber' as Tone }));
        const toneOf = (s?: string): Tone => (s === 'overdue' ? 'red' : s === 'critical' ? 'amber' : 'emerald');
        const open = (a: (typeof list)[number]) => (a.link.pendingId ? openRecord(a.link.path, a.link.pendingId, a.link.pendingType) : go(a.link.path));
        const rows = (n: number, dense?: boolean): RowItem[] => sorted.slice(0, n).map((a) => ({
            id: a.id, label: a.title, sub: `${a.subjectLabel}${a.description ? ` · ${a.description}` : ''}`, tone: toneOf(a.statusPriority), onOpen: () => open(a),
            right: <Pill tone={toneOf(a.statusPriority)}>{a.isStatus ? a.status : dueShort(a.daysUntil)}</Pill>, title: dense ? `${a.title} · ${a.subjectLabel}` : undefined,
        }));
        const tone: Tone = overdue.length ? 'red' : due.length ? 'amber' : 'emerald';
        const empty = <Empty>{pick === 'all' ? 'Nothing overdue or due.' : `Nothing ${pick}.`}</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(overdue.length)} label="Maintenance overdue" tone={tone} sub={`${fmtN(due.length)} due · ${fmtN(upcoming.length)} upcoming`} />}
                aside={<Ring value={overdue.length + due.length} max={Math.max(1, list.length)} tone={tone} label={fmtN(due.length)} sub="due" />}
                foot={<Segments parts={parts} legend={false} height={6} />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(pick === 'all' ? overdue.length : picked.length)} label={pick === 'all' ? 'Overdue' : pick} tone={tone} /><div className="mt-auto pt-1"><Segments parts={parts} height={6} /></div></>}
                right={sorted.length ? <Rows items={rows(3, true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Overdue', value: fmtN(overdue.length), tone: overdue.length ? 'red' : 'emerald' }, { label: 'Due', value: fmtN(due.length), tone: 'amber' },
            { label: 'Upcoming', value: fmtN(upcoming.length), tone: 'emerald' }, { label: 'Open orders', value: fmtN(c.operations.workOrdersOpen), tone: 'blue' },
            { label: 'Spend', value: fmtMoney(c.maintenance.spend), tone: 'slate', sub: `${c.maintenance.ordersCompleted} orders completed` },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="When it falls due"><Columns data={buckets} series={[{ key: 'value', name: 'Services', tone: 'amber' }]} height={H.lg} /></Block>} side={<Block title="Coming up">{sorted.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="w" title="When it falls due"><Columns data={buckets} series={[{ key: 'value', name: 'Services', tone: 'amber' }]} height={H.xl} /></Block>,
                <Block key="u" title="Units with the most">{units.length ? <HBars rows={units} dense /> : empty}</Block>,
                <Block key="r" title="Coming up">{sorted.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Roadside inspections ──────────────────────────────────────────────────────

const STAGE_TONE: Record<InspectionStage, Tone> = { clean: 'emerald', 'awaiting-report': 'amber', 'awaiting-repair': 'orange', closed: 'slate' };

const roadside: WidgetDef = {
    id: 'roadside', title: 'Roadside inspections', blurb: 'Pass rate, out-of-service orders, inspections by month and level, and the ones still waiting on a report or repair.',
    Icon: Truck, tone: 'indigo', category: 'Compliance', menuKey: 'roadside-inspections', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/roadside-inspections',
    option: { key: 'result', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'fail', label: 'Failed' }, { id: 'oos', label: 'Out of service' }, { id: 'waiting', label: 'Awaiting' }] },
    render: ({ data: d, go, opt, months }, size) => {
        const all = d.inspections;
        const pick = opt('result');
        const list = pick === 'fail' ? all.filter((i) => i.result === 'Fail') : pick === 'oos' ? all.filter((i) => i.oos) : pick === 'waiting' ? all.filter((i) => { const s = inspectionStage(i); return s === 'awaiting-report' || s === 'awaiting-repair'; }) : all;
        const passed = all.filter((i) => i.result === 'Pass').length;
        const oos = all.filter((i) => i.oos).length;
        const rate = pct(passed, all.length);
        const tone = toneForScore(rate);
        const stages: Part[] = (['awaiting-report', 'awaiting-repair', 'clean', 'closed'] as InspectionStage[]).map((s) => ({ label: STAGE_LABEL[s], value: all.filter((i) => inspectionStage(i) === s).length, tone: STAGE_TONE[s] }));
        const waiting = stages[0].value + stages[1].value;
        const byMonth = lastMonths(months).map((m) => ({ label: monthLabel(m), Pass: all.filter((i) => i.date.startsWith(m) && i.result === 'Pass').length, Fail: all.filter((i) => i.date.startsWith(m) && i.result === 'Fail').length }));
        const levels = new Map<string, number>();
        for (const i of all) levels.set(`Level ${i.level}`, (levels.get(`Level ${i.level}`) ?? 0) + 1);
        const byLevel = [...levels.entries()].sort().map(([label, value]) => ({ label, value, tone: 'indigo' as Tone }));
        const recent = [...list].sort((a, b) => b.date.localeCompare(a.date));
        const rows = (n: number, dense?: boolean): RowItem[] => recent.slice(0, n).map((i) => ({
            id: i.id, label: `Level ${i.level} · ${shortDate(i.date)}`, tone: i.result === 'Fail' || i.oos ? 'red' : 'emerald', onOpen: () => go(`/roadside-inspections/${i.id}`),
            sub: [d.service ? d.carriers.find((c) => c.id === i.accountId)?.dbaName : '', i.driver?.label, i.truck?.label, STAGE_LABEL[inspectionStage(i)]].filter(Boolean).join(' · '),
            right: <Pill tone={i.oos ? 'red' : i.result === 'Fail' ? 'orange' : 'emerald'}>{i.result}{i.oos ? ' · OOS' : ''}</Pill>, title: dense ? STAGE_LABEL[inspectionStage(i)] : undefined,
        }));
        const empty = <Empty>{pick === 'all' ? 'No inspections on file.' : 'Nothing here.'}</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={`${rate}%`} label="Inspections passed" tone={tone} sub={`${fmtN(passed)} of ${fmtN(all.length)} · ${fmtN(oos)} OOS`} />}
                aside={<Ring value={passed} max={Math.max(1, all.length)} tone={tone} label={fmtN(all.length)} sub="total" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={`${rate}%`} label="Passed" tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Out of service" value={fmtN(oos)} tone={oos ? 'red' : 'emerald'} /><Mini label="Awaiting" value={fmtN(waiting)} tone={waiting ? 'amber' : 'emerald'} /></div></>}
                right={all.length ? <Donut parts={stages} size={96} label={fmtN(all.length)} sub="inspections" /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Inspections', value: fmtN(all.length), tone: 'indigo' }, { label: 'Pass rate', value: `${rate}%`, tone },
            { label: 'Out of service', value: fmtN(oos), tone: oos ? 'red' : 'emerald' }, { label: 'Awaiting follow-up', value: fmtN(waiting), tone: waiting ? 'amber' : 'emerald' },
        ]} />;
        const chart = (h: number) => <Block title={`Per month · ${months} months`}><Columns data={byMonth} height={h} series={[{ key: 'Pass', name: 'Pass', tone: 'emerald', stack: 'a' }, { key: 'Fail', name: 'Fail', tone: 'red', stack: 'a' }]} /></Block>;
        if (size === 'lg') return <Stack strip={strip} main={chart(H.lg)} side={<Block title="Recent">{recent.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[chart(H.xl),
                <Block key="l" title="By level">{byLevel.length ? <HBars rows={byLevel} dense /> : empty}</Block>,
                <Block key="r" title="Recent">{recent.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

export const COMPLIANCE_WIDGETS: WidgetDef[] = [complianceFor('drivers'), complianceFor('assets'), calendar, maintenance, roadside];
