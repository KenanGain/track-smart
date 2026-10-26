import { Activity, AlertTriangle, Clock3, ShieldAlert, ShieldCheck } from 'lucide-react';
import { HOS_TYPE_BY_ID } from '@/pages/hos/hos-violations.data';
import { bandForScore } from '@/pages/safety-analysis/fleet-safety-score.data';
import { ALL_SIZES, type Tone, type WidgetDef } from '../dashboard-types';
import {
    Big, Block, Columns, Donut, Dots, Empty, Gauge, Glance, HBars, Mini, Note, Pill, Ring, Rows, Rows2, Segments, Spark, Split, Stack, Strip, Trend, Wide, RadarChartBlock,
    fmtMoney, fmtN, humanize, lastMonths, monthLabel, pct, riskTone, shortDate, toneForScore, type Part, type RowItem,
} from '../dashboard-charts';

const H = { md: 92, lg: 180, xl: 200 } as const;
const severityTone = (s: string): Tone => { const k = s.toLowerCase(); return k === 'critical' ? 'red' : k === 'high' ? 'orange' : k === 'medium' ? 'amber' : 'slate'; };

// ── Safety analysis ───────────────────────────────────────────────────────────

const safety: WidgetDef = {
    id: 'safety', title: 'Safety analysis', blurb: 'The fleet safety score on its band dial, the eight domains by risk, the trend and the SMS BASICs — the Beta page\'s colours.',
    Icon: ShieldCheck, tone: 'emerald', category: 'Safety', menuKey: 'safety-analysis-beta', scopes: ['carrier'], sizes: ALL_SIZES, defaultSize: 'lg',
    path: () => '/safety-analysis/beta',
    render: ({ data: d }, size) => {
        const s = d.safety;
        if (!s) return <Empty>No score for this view.</Empty>;
        const band = bandForScore(s.overall);
        const col = band.stroke;
        const domains: { key: keyof typeof s.cards; label: string }[] = [
            { key: 'accident', label: 'Accidents' }, { key: 'inspection', label: 'Inspections' }, { key: 'roadsideViolation', label: 'Roadside' },
            { key: 'driver', label: 'Drivers' }, { key: 'eld', label: 'ELD / HOS' }, { key: 'vedr', label: 'Telematics' },
            { key: 'maintenance', label: 'Maintenance' }, { key: 'asset', label: 'Assets' },
        ];
        const bars = domains.map((x) => ({ label: x.label, value: s.cards[x.key].score, tone: riskTone(s.cards[x.key].riskLabel), sub: s.cards[x.key].riskLabel }));
        const risk: Part[] = [
            { label: 'High risk', value: bars.filter((b) => b.tone === 'red').length, tone: 'red' },
            { label: 'Moderate risk', value: bars.filter((b) => b.tone === 'amber').length, tone: 'amber' },
            { label: 'Low risk', value: bars.filter((b) => b.tone === 'emerald').length, tone: 'emerald' },
        ];
        const radar = domains.map((x) => ({ axis: x.label, value: s.cards[x.key].score }));
        const trend = d.trend.map((p) => ({ label: new Date(p.date).toLocaleDateString(undefined, { month: 'short' }), value: Math.round(p.fleetScore) }));
        const basics = s.basics.map((b) => ({ label: b.label, value: Math.round(b.percentile), tone: (b.percentile >= b.threshold ? 'red' : b.percentile >= b.threshold * 0.75 ? 'amber' : 'emerald') as Tone, sub: `alert at ${b.threshold}` }));
        const dial = (w: number) => <Gauge value={Math.round(s.overall)} color={col} width={w} caption={`${s.band} · ${band.rating}`} />;
        if (size === 'sm') return (
            <div className="flex h-full min-h-0 items-center gap-3 px-3 py-2">
                {dial(104)}
                <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">Fleet score</p>
                    <div className="mt-1"><Dots parts={risk} /></div>
                    <p className="mt-1 text-[11px] text-slate-600">{Math.round(s.signals.cleanInspectionRate)}% clean inspections</p>
                </div>
            </div>
        );
        if (size === 'md') return (
            <Split leftWidth="8rem" left={<div className="flex h-full items-center justify-center">{dial(120)}</div>} right={<Block title="Domains · by risk"><HBars rows={bars} max={100} dense /></Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Fleet score', value: <span style={{ color: col }}>{Math.round(s.overall)}</span> }, { label: 'Band', value: <span style={{ color: col }}>{s.band}</span>, sub: band.rating },
            { label: 'Clean inspections', value: `${Math.round(s.signals.cleanInspectionRate)}%`, tone: 'blue' }, { label: 'OOS per 100', value: s.signals.oosPer100Insp.toFixed(1), tone: 'orange' },
            ...(size === 'xl' ? [{ label: 'Accidents', value: s.signals.accidentCount, tone: 'red' as Tone }, { label: 'Violations', value: s.signals.violationCount, tone: 'amber' as Tone }] : []),
        ]} />;
        const foot = <Note>{s.signals.inspectionCount} inspections · {s.signals.hosViolationCount} HOS violations · {s.signals.driverCount} drivers · {s.signals.assetCount} assets in the window</Note>;
        if (size === 'lg') return (
            <Stack strip={strip}
                main={<Block title="Domains · score out of 100"><div className="flex min-h-0 items-center gap-2"><div className="shrink-0">{dial(110)}</div><div className="min-w-0 flex-1"><RadarChartBlock data={radar} color={col} height={H.lg} /></div></div></Block>}
                side={<Block title="Domains by risk"><Donut parts={risk} size={104} label={fmtN(domains.length)} sub="domains" /><div className="mt-2 min-h-0 flex-1"><HBars rows={bars.slice(0, 5)} max={100} dense /></div></Block>} foot={foot} />
        );
        return (
            <Wide strip={strip} blocks={[
                <Block key="r" title="Domains · score out of 100"><div className="flex min-h-0 items-center gap-2"><div className="shrink-0">{dial(120)}</div><div className="min-w-0 flex-1"><RadarChartBlock data={radar} color={col} height={H.xl} /></div></div></Block>,
                <Block key="t" title="12-month trend">{trend.length ? <Trend data={trend} color={col} height={H.xl} name="Fleet score" reference={82} /> : <Empty>No history.</Empty>}</Block>,
                <Block key="b" title="SMS BASICs · percentile">{basics.length ? <HBars rows={basics} max={100} format={(v) => `${v}`} dense /> : <Empty>No BASICs.</Empty>}</Block>,
            ]} foot={foot} />
        );
    },
};

// ── Tickets & violations ──────────────────────────────────────────────────────

const violations: WidgetDef = {
    id: 'violations', title: 'Tickets & violations', blurb: 'Open tickets, fines by month, out-of-service violations and what is due next — a row opens that ticket.',
    Icon: AlertTriangle, tone: 'orange', category: 'Safety', menuKey: 'tickets', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'md',
    path: () => '/tickets',
    option: { key: 'status', label: 'Show', default: 'open', choices: [{ id: 'open', label: 'Open' }, { id: 'Due', label: 'Due' }, { id: 'In Court', label: 'In court' }, { id: 'Paid', label: 'Paid' }, { id: 'all', label: 'All' }] },
    render: ({ data: d, openRecord, openCarrier, opt, months }, size) => {
        const c = d.carrier ?? d.service;
        if (!c) return <Empty>No tickets for this view.</Empty>;
        const pick = opt('status');
        const list = pick === 'open' ? d.tickets.filter((t) => t.status === 'Due' || t.status === 'In Court') : pick === 'all' ? d.tickets : d.tickets.filter((t) => t.status === pick);
        const soonest = [...list].sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'));
        const byMonth = lastMonths(months).map((m) => ({ label: monthLabel(m), value: Math.round(d.tickets.filter((t) => t.date.startsWith(m)).reduce((s, t) => s + t.fineAmount, 0)) }));
        const byStatus: Part[] = (['Due', 'In Court', 'Paid', 'Closed'] as const).map((s) => ({ label: s, value: d.tickets.filter((t) => t.status === s).length, tone: s === 'Due' ? 'red' : s === 'In Court' ? 'orange' : s === 'Paid' ? 'emerald' : 'slate' }));
        const fines = fmtMoney(c.risk.finesUsd) + (c.risk.finesCad ? ` + ${fmtMoney(c.risk.finesCad, 'CAD')}` : '');
        const tone: Tone = c.safety.ticketsOpen ? 'orange' : 'emerald';
        const rows = (n: number, dense?: boolean): RowItem[] => d.service
            ? d.service.carriers.slice(0, n).map((x) => ({ id: x.carrier.id, label: x.carrier.dbaName || x.carrier.legalName, sub: `${x.safety.tickets} tickets · ${x.safety.violations} violations · ${x.risk.violationsOos} OOS`, tone: x.safety.ticketsOpen ? 'orange' : 'emerald', onOpen: () => openCarrier(x.carrier.id, '/tickets'), right: <span className="text-[12px] font-bold tabular-nums text-red-600">{fmtMoney(x.risk.finesUsd)}</span> }))
            : soonest.slice(0, n).map((t) => ({
                id: t.id, label: `${t.offenseNumber} · ${t.violationType}`, sub: `${t.driverName}${t.dueDate ? ` · due ${shortDate(t.dueDate)}` : ''}`, tone: t.status === 'Due' ? 'red' : t.status === 'In Court' ? 'orange' : 'emerald', onOpen: () => openRecord('/tickets', t.id),
                right: <span className="flex shrink-0 items-center gap-1.5"><Pill tone={t.status === 'Due' ? 'red' : t.status === 'In Court' ? 'orange' : 'emerald'}>{t.status}</Pill><span className="text-[12px] font-bold tabular-nums text-slate-800">{fmtMoney(t.fineAmount, t.currency)}</span></span>,
                title: dense ? `${t.offenseNumber} · ${t.driverName}` : undefined,
            }));
        const byCarrier = d.service ? d.service.carriers.map((x) => ({ label: x.carrier.dbaName || x.carrier.legalName, value: Math.round(x.risk.finesUsd), tone: 'red' as Tone })).sort((a, b) => b.value - a.value) : null;
        const has = d.service ? d.service.carriers.length > 0 : soonest.length > 0;
        const empty = <Empty>{pick === 'open' ? 'No open tickets.' : 'Nothing here.'}</Empty>;
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(pick === 'open' ? c.safety.ticketsOpen : list.length)} label={pick === 'open' ? 'Open tickets' : `${pick} tickets`} tone={tone} sub={`${fines} in fines · ${fmtN(c.risk.violationsOos)} OOS`} />}
                aside={<Spark data={byMonth.map((m) => m.value)} tone="red" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(pick === 'open' ? c.safety.ticketsOpen : list.length)} label={pick === 'open' ? 'Open tickets' : 'Tickets'} tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Fines" value={fmtMoney(c.risk.finesUsd)} tone="red" /><Mini label="OOS" value={fmtN(c.risk.violationsOos)} tone="red" /></div></>}
                right={has ? <Rows items={rows(3, true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Open tickets', value: fmtN(c.safety.ticketsOpen), tone }, { label: 'Fines', value: fines, tone: 'red' },
            { label: 'OOS violations', value: fmtN(c.risk.violationsOos), tone: 'red' }, { label: 'Violations open', value: fmtN(c.risk.violationsOpen), tone: 'amber' },
            { label: 'Demerit points', value: fmtN(c.risk.demeritPoints), tone: 'slate' },
        ]} />;
        const chart = (h: number) => byCarrier
            ? <Block title="Fines by carrier"><HBars rows={byCarrier} format={(v) => fmtMoney(v)} /></Block>
            : <Block title={`Fines by month · ${months} months`}><Columns data={byMonth} series={[{ key: 'value', name: 'Fines', tone: 'red' }]} height={h} format={(v) => fmtMoney(v)} yFormat={(v) => `$${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} /></Block>;
        if (size === 'lg') return <Stack strip={strip} main={chart(H.lg)} side={<Block title={d.service ? 'By carrier' : 'Due next'}>{has ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[chart(H.xl),
                <Block key="s" title="Tickets by status"><Donut parts={byStatus} size={120} label={fmtN(d.service ? c.safety.tickets : d.tickets.length)} sub="tickets" /></Block>,
                <Block key="r" title={d.service ? 'By carrier' : 'Due next'}>{has ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Accidents ─────────────────────────────────────────────────────────────────

const accidents: WidgetDef = {
    id: 'accidents', title: 'Accidents', blurb: 'Reports by month with injuries marked, what is still to verify, preventability and the latest ones — a row opens that accident.',
    Icon: ShieldAlert, tone: 'rose', category: 'Safety', menuKey: 'default-accidents', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/default-accidents',
    option: { key: 'status', label: 'Show', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'verify', label: 'To verify' }, { id: 'verified', label: 'Verified' }, { id: 'injuries', label: 'With injuries' }] },
    render: ({ data: d, openRecord, openCarrier, opt, months }, size) => {
        const c = d.carrier ?? d.service;
        if (!c) return <Empty>No accidents for this view.</Empty>;
        const all = d.accidents;
        const pick = opt('status');
        const list = pick === 'verify' ? all.filter((a) => a.status !== 'verified') : pick === 'verified' ? all.filter((a) => a.status === 'verified') : pick === 'injuries' ? all.filter((a) => a.injuries) : all;
        const total = d.service ? c.safety.accidents : all.length;
        const toVerify = all.filter((a) => a.status !== 'verified').length;
        const status: Part[] = [
            { label: 'Reported', value: all.filter((a) => a.status === 'reported').length, tone: 'orange' },
            { label: 'Under review', value: all.filter((a) => a.status === 'review').length, tone: 'amber' },
            { label: 'Verified', value: all.filter((a) => a.status === 'verified').length, tone: 'emerald' },
        ];
        const byMonth = lastMonths(months).map((m) => ({ label: monthLabel(m), 'No injuries': all.filter((a) => a.dateTime.startsWith(m) && !a.injuries).length, Injuries: all.filter((a) => a.dateTime.startsWith(m) && a.injuries).length }));
        const recent = [...list].sort((a, b) => b.dateTime.localeCompare(a.dateTime));
        const rows = (n: number, dense?: boolean): RowItem[] => d.service
            ? d.service.carriers.slice(0, n).map((x) => ({ id: x.carrier.id, label: x.carrier.dbaName || x.carrier.legalName, sub: `${x.risk.accidentsInjury} with injuries · ${x.risk.accidentsPreventable} preventable`, tone: x.safety.accidents ? 'red' : 'emerald', onOpen: () => openCarrier(x.carrier.id, '/default-accidents'), right: <span className="text-[12px] font-bold tabular-nums text-red-600">{x.safety.accidents}</span> }))
            : recent.slice(0, n).map((a) => ({
                id: a.id, label: `${a.accidentNumber ?? 'Accident'} · ${a.driverName}`, sub: `${shortDate(a.dateTime)} · ${a.unitId}${a.injuries ? ' · injuries' : ''}${a.location ? ` · ${a.location}` : ''}`,
                tone: a.status === 'verified' ? 'emerald' : a.status === 'review' ? 'amber' : 'orange', onOpen: () => openRecord('/default-accidents', a.id),
                right: <Pill tone={a.severity ? severityTone(a.severity) : a.status === 'verified' ? 'emerald' : 'orange'}>{a.severity || humanize(a.status)}</Pill>, title: dense ? `${a.driverName} · ${a.location}` : undefined,
            }));
        const has = d.service ? d.service.carriers.length > 0 : recent.length > 0;
        const empty = <Empty>{pick === 'all' ? 'No accidents reported.' : 'Nothing here.'}</Empty>;
        const tone: Tone = total ? 'red' : 'emerald';
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(total)} label="Accidents" tone={tone} sub={`${fmtN(toVerify)} to verify · ${fmtN(c.risk.accidentsInjury)} with injuries`} />}
                aside={all.length ? <Dots parts={status} /> : undefined} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(total)} label="Accidents" tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="To verify" value={fmtN(toVerify)} tone={toVerify ? 'orange' : 'emerald'} /><Mini label="Injuries" value={fmtN(c.risk.accidentsInjury)} tone="red" /></div></>}
                right={<Block title={`Per month · ${months} months`}><Columns data={byMonth} height={H.md} series={[{ key: 'No injuries', name: 'No injuries', tone: 'slate', stack: 'a' }, { key: 'Injuries', name: 'Injuries', tone: 'red', stack: 'a' }]} /></Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Accidents', value: fmtN(total), tone }, { label: 'To verify', value: fmtN(toVerify), tone: toVerify ? 'orange' : 'emerald' },
            { label: 'With injuries', value: fmtN(c.risk.accidentsInjury), tone: 'red' }, { label: 'Preventable', value: fmtN(c.risk.accidentsPreventable), tone: 'amber' },
        ]} />;
        const chart = (h: number) => <Block title={`Per month · ${months} months`}><Columns data={byMonth} height={h} series={[{ key: 'No injuries', name: 'No injuries', tone: 'slate', stack: 'a' }, { key: 'Injuries', name: 'Injuries', tone: 'red', stack: 'a' }]} /></Block>;
        if (size === 'lg') return <Stack strip={strip} main={chart(H.lg)} side={<Block title={d.service ? 'By carrier' : 'Latest'}>{has ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[chart(H.xl),
                <Block key="s" title="By status">{all.length ? <Donut parts={status} size={120} label={fmtN(all.length)} sub="on file" /> : empty}</Block>,
                <Block key="r" title={d.service ? 'By carrier' : 'Latest'}>{has ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

// ── Safety events (telematics) ────────────────────────────────────────────────

const safetyEvents: WidgetDef = {
    id: 'safety-events', title: 'Safety events', blurb: 'Telematics and camera events by severity and type, newest first — a row opens that event.',
    Icon: Activity, tone: 'violet', category: 'Safety', menuKey: 'safety-events', scopes: ['carrier'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/safety-events',
    option: { key: 'severity', label: 'Severity', default: 'all', choices: [{ id: 'all', label: 'All' }, { id: 'critical', label: 'Critical' }, { id: 'high', label: 'High' }, { id: 'medium', label: 'Medium' }] },
    render: ({ data: d, openRecord, opt }, size) => {
        const all = d.telematics;
        const pick = opt('severity');
        const list = pick === 'all' ? all : all.filter((e) => e.severity === pick);
        const sev: Part[] = (['critical', 'high', 'medium', 'low'] as const).map((s) => ({ label: humanize(s), value: all.filter((e) => e.severity === s).length, tone: severityTone(s) }));
        const types = new Map<string, number>();
        for (const e of list) types.set(e.type, (types.get(e.type) ?? 0) + 1);
        const byType = [...types.entries()].sort((a, b) => b[1] - a[1]).map(([t, v]) => ({ label: humanize(t), value: v, tone: 'violet' as Tone }));
        const recent = [...list].sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
        const rows = (n: number, dense?: boolean): RowItem[] => recent.slice(0, n).map((e) => ({
            id: e.id, label: humanize(e.type), sub: `${e.driverName} · ${e.vehicle} · ${shortDate(e.startedAt)}`, tone: severityTone(e.severity), onOpen: () => openRecord('/safety-events', e.id),
            right: <Pill tone={severityTone(e.severity)}>{e.severity}</Pill>, title: dense ? `${e.driverName} · ${e.vehicle}` : undefined,
        }));
        const empty = <Empty>{pick === 'all' ? 'No events from the providers.' : `No ${pick} events.`}</Empty>;
        const tone: Tone = sev[0].value ? 'red' : sev[1].value ? 'orange' : 'violet';
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(list.length)} label={pick === 'all' ? 'Safety events' : `${humanize(pick)} events`} tone={tone} sub={`${fmtN(sev[0].value)} critical · ${fmtN(sev[1].value)} high`} />} foot={<Segments parts={sev} legend={false} height={6} />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(list.length)} label="Events" tone={tone} /><div className="mt-auto pt-1"><Segments parts={sev} height={6} /></div></>} right={<Block title="By type">{byType.length ? <HBars rows={byType.slice(0, 4)} dense /> : empty}</Block>} />
        );
        const strip = <Strip figures={[
            { label: 'Events', value: fmtN(all.length), tone: 'violet' }, { label: 'Critical', value: fmtN(sev[0].value), tone: 'red' },
            { label: 'High', value: fmtN(sev[1].value), tone: 'orange' }, { label: 'Drivers involved', value: new Set(all.map((e) => e.driverName)).size, tone: 'blue' },
        ]} />;
        const chart = (h: number) => <Block title="By type">{byType.length ? <Rows2 data={byType.slice(0, 6).map((t) => ({ label: t.label, value: t.value }))} series={[{ key: 'value', name: 'Events', tone: 'violet' }]} height={h} /> : empty}</Block>;
        const foot = <Note>Telematics feed is fleet-wide</Note>;
        if (size === 'lg') return <Stack strip={strip} main={chart(H.lg)} side={<Block title="Latest">{recent.length ? <Rows items={rows(6)} /> : empty}</Block>} foot={foot} />;
        return (
            <Wide strip={strip} blocks={[chart(H.xl),
                <Block key="s" title="Severity"><Donut parts={sev} size={120} label={fmtN(all.length)} sub="events" /></Block>,
                <Block key="r" title="Latest">{recent.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} foot={foot} />
        );
    },
};

// ── Hours of Service ──────────────────────────────────────────────────────────

const hos: WidgetDef = {
    id: 'hos', title: 'Hours of Service', blurb: 'HOS violations open and by severity, the drivers with the most, and logs not yet certified — a row opens that violation.',
    Icon: Clock3, tone: 'sky', category: 'Safety', menuKey: 'safety-event', scopes: ['carrier', 'profile'], sizes: ALL_SIZES, defaultSize: 'sm',
    path: () => '/safety-event/hours-of-service-violations',
    option: { key: 'status', label: 'Show', default: 'open', choices: [{ id: 'open', label: 'Open' }, { id: 'review', label: 'In review' }, { id: 'Critical', label: 'Critical' }, { id: 'all', label: 'All' }] },
    render: ({ data: d, openRecord, opt }, size) => {
        const v = d.hosViolations;
        const pick = opt('status');
        const list = pick === 'open' ? v.filter((x) => x.status === 'open') : pick === 'review' ? v.filter((x) => x.status === 'review') : pick === 'Critical' ? v.filter((x) => x.severity === 'Critical' && x.status !== 'resolved') : v;
        const open = v.filter((x) => x.status === 'open');
        const logs = d.hosLogs;
        const certified = logs.filter((l) => l.certified).length;
        const uncertified = logs.length - certified;
        const sev: Part[] = (['Critical', 'High', 'Medium', 'Low'] as const).map((s) => ({ label: s, value: v.filter((x) => x.severity === s && x.status !== 'resolved').length, tone: severityTone(s) }));
        const byDriver = new Map<string, number>();
        for (const x of list) byDriver.set(x.driverName, (byDriver.get(x.driverName) ?? 0) + 1);
        const drivers = [...byDriver.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value, tone: 'sky' as Tone }));
        const rows = (n: number, dense?: boolean): RowItem[] => [...list].sort((a, b) => b.dateTime.localeCompare(a.dateTime)).slice(0, n).map((x) => ({
            id: x.id, label: HOS_TYPE_BY_ID[x.typeId]?.label ?? humanize(x.typeId), sub: `${x.driverName} · ${shortDate(x.dateTime)} · ${humanize(x.status)}`, tone: severityTone(x.severity), onOpen: () => openRecord('/safety-event/hours-of-service-violations', x.id),
            right: <Pill tone={severityTone(x.severity)}>{x.severity}</Pill>, title: dense ? x.driverName : undefined,
        }));
        const empty = <Empty>{pick === 'open' ? 'No open HOS violations.' : 'Nothing here.'}</Empty>;
        const tone: Tone = sev[0].value ? 'red' : open.length ? 'orange' : 'emerald';
        const cert = pct(certified, logs.length);
        if (size === 'sm') return (
            <Glance big={<Big value={fmtN(open.length)} label="HOS violations open" tone={tone} sub={`${fmtN(sev[0].value)} critical · ${fmtN(uncertified)} logs uncertified`} />}
                aside={<Ring value={certified} max={Math.max(1, logs.length)} tone={toneForScore(cert)} label={`${cert}%`} sub="certified" />} />
        );
        if (size === 'md') return (
            <Split left={<><Big value={fmtN(list.length)} label={pick === 'open' ? 'Open' : humanize(pick)} tone={tone} /><div className="mt-auto grid grid-cols-2 gap-x-3 pt-1"><Mini label="Uncertified" value={fmtN(uncertified)} tone={uncertified ? 'amber' : 'emerald'} /><Mini label="Drivers" value={byDriver.size} tone="blue" /></div></>}
                right={list.length ? <Rows items={rows(3, true)} dense /> : empty} />
        );
        const strip = <Strip figures={[
            { label: 'Open', value: fmtN(open.length), tone }, { label: 'Critical', value: fmtN(sev[0].value), tone: 'red' },
            { label: 'Logs certified', value: `${cert}%`, tone: toneForScore(cert), sub: `${fmtN(uncertified)} not yet` }, { label: 'Drivers', value: byDriver.size, tone: 'blue' },
        ]} />;
        if (size === 'lg') return <Stack strip={strip} main={<Block title="Drivers with the most">{drivers.length ? <HBars rows={drivers} dense /> : empty}</Block>} side={<Block title={pick === 'open' ? 'Open' : humanize(pick)}>{list.length ? <Rows items={rows(6)} /> : empty}</Block>} />;
        return (
            <Wide strip={strip} blocks={[
                <Block key="d" title="Drivers with the most">{drivers.length ? <HBars rows={drivers} dense /> : empty}</Block>,
                <Block key="s" title="Severity"><Donut parts={sev} size={120} label={fmtN(open.length)} sub="open" /></Block>,
                <Block key="r" title={pick === 'open' ? 'Open' : humanize(pick)}>{list.length ? <Rows items={rows(7, true)} dense /> : empty}</Block>,
            ]} />
        );
    },
};

export const SAFETY_WIDGETS: WidgetDef[] = [safety, violations, accidents, safetyEvents, hos];
