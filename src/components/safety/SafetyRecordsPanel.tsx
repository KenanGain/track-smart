import { useMemo, useState, useEffect, Fragment } from 'react';
import { ClipboardCheck, Truck, Scale, ShieldAlert, ChevronRight, ChevronDown, Search, Filter, FileCheck, AlertOctagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    type SafetyEvent,
    type SafetyEventKind,
    type SafetySourceKey,
    distinctSourceKeys,
    getSourceLabel,
    getSourceTone,
    parseSourceKey,
} from '@/data/safety-records';
import { SourceSubTabs } from './SourceSubTabs';
import { PaginationBar } from '@/components/ui/DataListToolbar';

type SafetyRecordsPanelProps = {
    /** Pre-filtered events for the current entity (driver / asset / carrier). */
    events: SafetyEvent[];
    /** Restrict to a subset of kinds — e.g. ['inspection'] for the
     *  Inspections tab, ['collision','accident'] for Accidents, etc. */
    kinds?: SafetyEventKind[];
    title?: string;
    subtitle?: string;
    /** Pre-select a particular sourceKey on first render. */
    defaultSourceKey?: SafetySourceKey;
    className?: string;
};

/**
 * Drop-in panel rendering CVOR / NSC-by-jurisdiction / FMCSA sub-panels.
 * Used identically in Driver, Asset, and Carrier profile pages so the
 * safety-records UI stays consistent everywhere.
 */
export function SafetyRecordsPanel({
    events,
    kinds,
    title = 'Safety Records',
    subtitle,
    defaultSourceKey,
    className,
}: SafetyRecordsPanelProps) {
    const filtered = useMemo(
        () => (kinds ? events.filter((e) => kinds.includes(e.kind)) : events),
        [events, kinds]
    );

    const sourceKeys = useMemo(() => distinctSourceKeys(filtered), [filtered]);

    const counts = useMemo(() => {
        const out: Record<SafetySourceKey, number> = {};
        for (const e of filtered) out[e.sourceKey] = (out[e.sourceKey] ?? 0) + 1;
        return out;
    }, [filtered]);

    const initialKey: SafetySourceKey = defaultSourceKey ?? sourceKeys[0] ?? 'cvor';
    const [activeKey, setActiveKey] = useState<SafetySourceKey>(initialKey);

    // Reset active key if the previously-active source disappears (e.g.
    // user navigated to a different driver / asset).
    const effectiveKey = sourceKeys.includes(activeKey) ? activeKey : sourceKeys[0];

    const visibleEvents = useMemo(
        () => filtered.filter((e) => e.sourceKey === effectiveKey),
        [filtered, effectiveKey]
    );

    // Whole-panel empty state.
    if (sourceKeys.length === 0) {
        return (
            <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)}>
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
                    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                <div className="px-5 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2">
                        <ShieldAlert size={20} />
                    </div>
                    <div className="text-sm font-semibold text-slate-700">No safety records</div>
                    <div className="text-xs text-slate-500 mt-1">
                        Nothing reported under CVOR, NSC, or FMCSA for this entity.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)}>
            {/* Header — title block, then sub-tab switcher (chips on the
                left, only sources with data shown). */}
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 space-y-3">
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                <SourceSubTabs
                    sourceKeys={sourceKeys}
                    activeKey={effectiveKey ?? sourceKeys[0]}
                    counts={counts}
                    onChange={setActiveKey}
                />
            </div>

            {/* Body */}
            <SourceTable events={visibleEvents} sourceKey={effectiveKey ?? sourceKeys[0]} />
        </div>
    );
}

// ── Table — common columns + expandable source-specific detail row ────────

const KIND_BADGE: Record<SafetyEventKind, { label: string; cls: string; Icon: React.ElementType }> = {
    inspection: { label: 'Inspection', cls: 'bg-blue-50 text-blue-700 border-blue-200',     Icon: ClipboardCheck },
    collision:  { label: 'Collision',  cls: 'bg-rose-50 text-rose-700 border-rose-200',     Icon: Truck },
    conviction: { label: 'Conviction', cls: 'bg-amber-50 text-amber-700 border-amber-200',  Icon: Scale },
    violation:  { label: 'Violation',  cls: 'bg-amber-50 text-amber-700 border-amber-200',  Icon: ShieldAlert },
    accident:   { label: 'Accident',   cls: 'bg-rose-50 text-rose-700 border-rose-200',     Icon: Truck },
};

type DateWindow = 'all' | '3m' | '6m' | '12m' | '24m' | '60m';
type ResultFilter = 'all' | 'clean' | 'oos' | 'violations';

const DATE_OPTIONS: { id: DateWindow; label: string; months: number | null }[] = [
    { id: 'all', label: 'All time',    months: null },
    { id: '3m',  label: 'Last 3 mo',   months: 3   },
    { id: '6m',  label: 'Last 6 mo',   months: 6   },
    { id: '12m', label: 'Last 12 mo',  months: 12  },
    { id: '24m', label: 'Last 24 mo',  months: 24  },
    { id: '60m', label: 'Last 5 yrs',  months: 60  },
];

function withinWindow(dateISO: string | undefined, months: number | null): boolean {
    if (!months) return true;
    if (!dateISO) return false;
    const t = new Date(dateISO).getTime();
    if (Number.isNaN(t)) return false;
    return Date.now() - t <= months * 30 * 24 * 60 * 60 * 1000;
}

/** Pull useful stats out of an event so KPI tiles + result filter can use
 *  them without re-walking the source-specific raw payloads each time. */
function eventStats(e: SafetyEvent): { isClean: boolean; hasOos: boolean; violationCount: number; defectCount: number; points: number } {
    const r = e.raw as Record<string, unknown>;
    const { source } = parseSourceKey(e.sourceKey);
    if (source === 'cvor') {
        if (e.kind === 'inspection') {
            const oos = (r.oosCount as number) ?? 0;
            const def = (r.totalDefects as number) ?? 0;
            const vp = (r.vehiclePoints as number) ?? 0;
            const dp = (r.driverPoints as number) ?? 0;
            return { isClean: oos === 0 && def === 0, hasOos: oos > 0, violationCount: 0, defectCount: def, points: vp + dp };
        }
        const pts = (r.pointsTotal as number) ?? 0;
        return { isClean: false, hasOos: false, violationCount: 1, defectCount: 0, points: pts };
    }
    if (source === 'nsc') {
        const oosRows = (r.oosRows as unknown[] | undefined) ?? [];
        const reqRows = (r.reqRows as unknown[] | undefined) ?? [];
        return {
            isClean: oosRows.length === 0 && reqRows.length === 0,
            hasOos: oosRows.length > 0,
            violationCount: reqRows.length,
            defectCount: oosRows.length + reqRows.length,
            points: 0,
        };
    }
    // FMCSA
    const isClean = !!r.isClean;
    const hasOos = !!r.hasOOS;
    const violCount = Array.isArray(r.violations) ? (r.violations as unknown[]).length : 0;
    const sms = r.smsPoints as { vehicle?: number; driver?: number; carrier?: number } | undefined;
    const smsTotal = (sms?.vehicle ?? 0) + (sms?.driver ?? 0) + (sms?.carrier ?? 0);
    return { isClean, hasOos, violationCount: violCount, defectCount: violCount, points: smsTotal };
}

function SourceTable({ events, sourceKey }: { events: SafetyEvent[]; sourceKey: SafetySourceKey }) {
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [dateWin, setDateWin] = useState<DateWindow>('all');
    const [result, setResult] = useState<ResultFilter>('all');
    const [page, setPage] = useState(1);
    const [rpp, setRpp] = useState(10);

    // Reset filters / paging when source switches.
    useEffect(() => {
        setQuery('');
        setDateWin('all');
        setResult('all');
        setPage(1);
        setExpandedId(null);
    }, [sourceKey]);
    // Reset paging when filters narrow the list.
    useEffect(() => { setPage(1); }, [query, dateWin, result]);

    const sorted = useMemo(
        () => events.slice().sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
        [events]
    );

    // KPI roll-ups over the *unfiltered* per-source set so the user always
    // sees the underlying counts regardless of the active filter.
    const kpi = useMemo(() => {
        const init = { total: sorted.length, clean: 0, oos: 0, violations: 0, points: 0 };
        for (const e of sorted) {
            const s = eventStats(e);
            if (s.isClean) init.clean += 1;
            if (s.hasOos) init.oos += 1;
            if (s.violationCount > 0 || s.defectCount > 0) init.violations += 1;
            init.points += s.points;
        }
        return init;
    }, [sorted]);

    const months = DATE_OPTIONS.find(o => o.id === dateWin)?.months ?? null;
    const q = query.trim().toLowerCase();

    const filtered = useMemo(() => {
        return sorted.filter(e => {
            if (!withinWindow(e.date, months)) return false;

            if (result !== 'all') {
                const s = eventStats(e);
                if (result === 'clean' && !s.isClean) return false;
                if (result === 'oos' && !s.hasOos) return false;
                if (result === 'violations' && !(s.violationCount > 0 || s.defectCount > 0)) return false;
            }

            if (q) {
                const r = e.raw as Record<string, unknown>;
                const ref =
                    (r.cvir as string) || (r.ticket as string)
                    || (r.inspectionNumber as string) || (r.id as string) || '';
                const hay = [
                    e.driverName, e.licenseNumber, e.plateNumber, e.unitNumber, e.vin,
                    e.location, e.jurisdiction, ref,
                ].filter(Boolean).join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [sorted, months, result, q]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / rpp));
    const safePage = Math.min(page, totalPages);
    const paged = filtered.slice((safePage - 1) * rpp, safePage * rpp);

    // Whole-source empty state — keep the previous look.
    if (sorted.length === 0) {
        return (
            <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <ShieldAlert size={20} />
                </div>
                <div className="text-sm font-semibold text-slate-700">
                    No {getSourceLabel(sourceKey)} records
                </div>
                <div className="text-xs text-slate-500 mt-1">
                    Nothing reported under {getSourceLabel(sourceKey)} for this entity.
                </div>
            </div>
        );
    }

    return (
        <>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-5 pt-4">
                <KpiTile
                    icon={<FileCheck size={14} />}
                    label="Records"
                    value={kpi.total}
                    tone="blue"
                />
                <KpiTile
                    icon={<ShieldAlert size={14} />}
                    label="Clean"
                    value={kpi.clean}
                    tone="emerald"
                />
                <KpiTile
                    icon={<AlertOctagon size={14} />}
                    label="OOS"
                    value={kpi.oos}
                    tone="rose"
                />
                <KpiTile
                    icon={<Scale size={14} />}
                    label={kpi.points > 0 ? 'Points' : 'Violations'}
                    value={kpi.points > 0 ? kpi.points : kpi.violations}
                    tone="amber"
                />
            </div>

            {/* Filter row */}
            <div className="flex items-center gap-2 flex-wrap px-5 py-3 mt-3 border-y border-slate-100 bg-slate-50/50">
                <div className="relative flex-1 min-w-[180px] max-w-md">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search driver, plate, location, reference…"
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white
                                   placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <Filter size={14} className="text-slate-400" />
                    <select
                        value={dateWin}
                        onChange={(e) => setDateWin(e.target.value as DateWindow)}
                        className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium
                                   shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {DATE_OPTIONS.map(o => (
                            <option key={o.id} value={o.id}>{o.label}</option>
                        ))}
                    </select>
                </div>
                <select
                    value={result}
                    onChange={(e) => setResult(e.target.value as ResultFilter)}
                    className="text-xs rounded-lg border border-slate-200 bg-white px-2 py-1.5 font-medium
                               shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All results</option>
                    <option value="clean">Clean only</option>
                    <option value="oos">OOS only</option>
                    <option value="violations">With violations</option>
                </select>
                <span className="ml-auto text-[11px] font-medium text-slate-500">
                    {filtered.length === sorted.length
                        ? `${filtered.length} records`
                        : `${filtered.length} of ${sorted.length} records`}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2.5 font-semibold w-8" />
                            <th className="px-4 py-2.5 font-semibold">Type</th>
                            <th className="px-4 py-2.5 font-semibold">Date</th>
                            <th className="px-4 py-2.5 font-semibold">Driver</th>
                            <th className="px-4 py-2.5 font-semibold">Vehicle</th>
                            <th className="px-4 py-2.5 font-semibold">Location</th>
                            <th className="px-4 py-2.5 font-semibold">Reference</th>
                            <th className="px-4 py-2.5 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paged.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-10 text-center">
                                    <div className="text-xs text-slate-500">
                                        No records match your filters.
                                    </div>
                                </td>
                            </tr>
                        ) : paged.map((e) => (
                            <Fragment key={e.id}>
                                <SummaryRow
                                    event={e}
                                    expanded={expandedId === e.id}
                                    onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                                />
                                {expandedId === e.id && (
                                    <tr className="bg-slate-50/40">
                                        <td colSpan={8} className="px-4 py-3">
                                            <DetailPanel event={e} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <PaginationBar
                totalItems={filtered.length}
                currentPage={safePage}
                rowsPerPage={rpp}
                onPageChange={setPage}
                onRowsPerPageChange={(r) => { setRpp(r); setPage(1); }}
            />
        </>
    );
}

function KpiTile({
    icon, label, value, tone,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    tone: 'blue' | 'emerald' | 'rose' | 'amber';
}) {
    const tones: Record<typeof tone, { ring: string; chip: string; text: string }> = {
        blue:    { ring: 'border-l-blue-500',    chip: 'bg-blue-50 text-blue-600',       text: 'text-slate-900' },
        emerald: { ring: 'border-l-emerald-500', chip: 'bg-emerald-50 text-emerald-600', text: 'text-slate-900' },
        rose:    { ring: 'border-l-rose-500',    chip: 'bg-rose-50 text-rose-600',       text: 'text-slate-900' },
        amber:   { ring: 'border-l-amber-500',   chip: 'bg-amber-50 text-amber-600',     text: 'text-slate-900' },
    };
    const t = tones[tone];
    return (
        <div className={cn('flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-l-4 border-slate-200', t.ring)}>
            <div className="flex items-center gap-2 min-w-0">
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', t.chip)}>
                    {icon}
                </span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">
                    {label}
                </span>
            </div>
            <span className={cn('text-lg font-bold tabular-nums', t.text)}>{value.toLocaleString()}</span>
        </div>
    );
}

function SummaryRow({ event, expanded, onToggle }: { event: SafetyEvent; expanded: boolean; onToggle: () => void }) {
    const kind = KIND_BADGE[event.kind];
    const KindIcon = kind.Icon;
    const tone = getSourceTone(event.sourceKey);
    const r = event.raw as Record<string, unknown>;
    const { source } = parseSourceKey(event.sourceKey);

    let reference = '—';
    let statusContent: React.ReactNode = '—';

    if (source === 'cvor') {
        reference = (r.cvir as string) || (r.ticket as string) || '—';
        if (event.kind === 'inspection') {
            const oos = (r.oosCount as number) ?? 0;
            const def = (r.totalDefects as number) ?? 0;
            const vp = (r.vehiclePoints as number) ?? 0;
            const dp = (r.driverPoints as number) ?? 0;
            statusContent = (
                <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
                    {oos > 0 && <span className="font-bold text-rose-600">{oos} OOS</span>}
                    {def > 0 && <span className="text-amber-700">{def} defects</span>}
                    {(vp + dp) > 0 && <span className="text-slate-500">{vp + dp} pts</span>}
                    {oos === 0 && def === 0 && (vp + dp) === 0 && <span className="text-emerald-600 font-semibold">Clean</span>}
                </span>
            );
        } else {
            const pts = (r.pointsTotal as number) ?? 0;
            const charged = (r as { charged?: 'Y'|'N' }).charged ?? (r.collision as { driverCharged?: 'Y'|'N' } | undefined)?.driverCharged;
            statusContent = (
                <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
                    {pts > 0 && <span className={cn('font-bold', event.kind === 'collision' ? 'text-rose-600' : 'text-amber-700')}>{pts} pts</span>}
                    {charged === 'Y' && <span className="text-rose-600 font-semibold">Charged</span>}
                </span>
            );
        }
    } else if (source === 'nsc') {
        reference = (r.inspectionNumber as string) || '—';
        const oosRows = (r.oosRows as unknown[] | undefined) ?? [];
        const reqRows = (r.reqRows as unknown[] | undefined) ?? [];
        const isClean = oosRows.length === 0 && reqRows.length === 0;
        statusContent = (
            <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
                {isClean
                    ? <span className="text-emerald-600 font-semibold">Clean</span>
                    : <>
                        {oosRows.length > 0 && <span className="font-bold text-rose-600">{oosRows.length} OOS</span>}
                        {reqRows.length > 0 && <span className="text-amber-700">{reqRows.length} Req</span>}
                    </>}
                {r.level !== undefined && <span className="text-slate-500">Lvl {r.level as number}</span>}
            </span>
        );
    } else if (source === 'fmcsa') {
        reference = (r.id as string) || '—';
        const isClean = !!r.isClean;
        const hasOos = !!r.hasOOS;
        const violCount = Array.isArray(r.violations) ? (r.violations as unknown[]).length : 0;
        const sms = r.smsPoints as { vehicle?: number; driver?: number; carrier?: number } | undefined;
        const smsTotal = (sms?.vehicle ?? 0) + (sms?.driver ?? 0) + (sms?.carrier ?? 0);
        statusContent = (
            <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
                {isClean
                    ? <span className="text-emerald-600 font-semibold">Clean</span>
                    : hasOos
                        ? <span className="font-bold text-rose-600">OOS</span>
                        : <span className="text-amber-700 font-semibold">{violCount} viol.</span>}
                {smsTotal > 0 && <span className="text-slate-500">{smsTotal} SMS pts</span>}
            </span>
        );
    }

    const driverDisplay = event.driverName || event.licenseNumber || '—';
    const vehicleDisplay = [event.unitNumber, event.plateNumber].filter(Boolean).join(' · ') || event.vin || '—';

    return (
        <tr className="hover:bg-slate-50/70 transition-colors cursor-pointer" onClick={onToggle}>
            <td className="px-3 py-3">
                <button
                    type="button"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    className="text-slate-400 hover:text-slate-700"
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                >
                    {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
            </td>
            <td className="px-4 py-3">
                <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider', kind.cls)}>
                    <KindIcon size={11} />
                    {kind.label}
                </span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap font-mono">{event.date || '—'}</td>
            <td className="px-4 py-3 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 truncate max-w-[180px]" title={driverDisplay}>{driverDisplay}</div>
                {event.licenseNumber && (
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[180px]">
                        {event.licenseNumber}{event.licenseJurisdiction ? ` · ${event.licenseJurisdiction}` : ''}
                    </div>
                )}
            </td>
            <td className="px-4 py-3 text-xs text-slate-700">
                <div className="font-semibold text-slate-900 truncate max-w-[180px]">{vehicleDisplay}</div>
                {event.vin && <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate max-w-[180px]">VIN •••{event.vin.slice(-4)}</div>}
            </td>
            <td className="px-4 py-3 text-xs text-slate-600 truncate max-w-[180px]" title={event.location ?? ''}>
                {event.location || '—'}
            </td>
            <td className="px-4 py-3">
                <span className={cn('inline-flex items-center font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border', tone.pill)}>
                    {reference}
                </span>
            </td>
            <td className="px-4 py-3">{statusContent}</td>
        </tr>
    );
}

// ── Source-specific detail panel (rich fields) ────────────────────────────

function DetailPanel({ event }: { event: SafetyEvent }) {
    const { source } = parseSourceKey(event.sourceKey);
    if (source === 'cvor') return <CvorDetail event={event} />;
    if (source === 'nsc') return <NscDetail event={event} />;
    return <FmcsaDetail event={event} />;
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</div>
            {children}
        </div>
    );
}

function KV({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div className="flex justify-between gap-2 text-xs">
            <span className="text-slate-500">{label}</span>
            <span className={valueClass ?? 'font-semibold text-slate-800'}>{value}</span>
        </div>
    );
}

function CvorDetail({ event }: { event: SafetyEvent }) {
    const r = event.raw as Record<string, unknown>;
    const defects = (r.defects as Array<{ category: string; defect: string; oos?: boolean }> | undefined) ?? [];
    const vehicle1 = r.vehicle1 as { make?: string; unit?: string; plate?: string; jurisdiction?: string } | undefined;
    const vehicle2 = r.vehicle2 as { make?: string; unit?: string; plate?: string; jurisdiction?: string } | undefined;
    const collision = r.collision as Record<string, unknown> | undefined;
    const conviction = r.conviction as Record<string, unknown> | undefined;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <DetailCard title={`${event.kind === 'inspection' ? 'Inspection' : event.kind === 'collision' ? 'Collision' : 'Conviction'} Summary`}>
                <div className="space-y-1.5">
                    {event.kind === 'inspection' && (
                        <>
                            <KV label="CVIR #" value={(r.cvir as string) ?? '—'} valueClass="font-mono font-semibold text-slate-800" />
                            <KV label="Date / Time" value={`${event.date} ${(r.startTime as string) ?? ''}${r.endTime ? ` – ${r.endTime as string}` : ''}`} valueClass="font-mono text-slate-700" />
                            <KV label="Level" value={(r.level as number) ?? '—'} />
                            <KV label="# of Vehicles" value={(r.numVehicles as number) ?? '—'} />
                            <KV label="Co-Driver" value={(r.coDriver as string) ?? '—'} />
                            <KV label="Impoundment" value={(r.impoundment as string) ?? '—'} />
                            <KV label="Charged" value={(r.charged as string) ?? '—'} valueClass={r.charged === 'Y' ? 'font-bold text-rose-600' : 'font-semibold text-emerald-600'} />
                            <KV label="Categories OOS" value={(r.oosCount as number) ?? 0} valueClass={(r.oosCount as number) > 0 ? 'font-bold text-rose-600' : 'font-semibold text-slate-800'} />
                            <KV label="Total Defects" value={(r.totalDefects as number) ?? 0} valueClass={(r.totalDefects as number) > 0 ? 'font-bold text-amber-600' : 'font-semibold text-slate-800'} />
                            <KV label="Vehicle Points" value={(r.vehiclePoints as number) ?? 0} />
                            <KV label="Driver Points" value={(r.driverPoints as number) ?? 0} />
                        </>
                    )}
                    {event.kind === 'collision' && collision && (
                        <>
                            <KV label="Ticket #" value={(r.ticket as string) ?? '—'} valueClass="font-mono font-semibold text-slate-800" />
                            <KV label="Date / Time" value={`${event.date} ${(r.time as string) ?? ''}`} valueClass="font-mono text-slate-700" />
                            <KV label="Class" value={(collision.collisionClass as string) ?? '—'} />
                            <KV label="Jurisdiction" value={(collision.jurisdiction as string) ?? event.jurisdiction ?? '—'} />
                            <KV label="Microfilm" value={(collision.microfilm as string) ?? '—'} valueClass="font-mono text-slate-700" />
                            <KV label="Driver Charged" value={(collision.driverCharged as string) ?? '—'} valueClass={collision.driverCharged === 'Y' ? 'font-bold text-rose-600' : 'font-semibold text-emerald-600'} />
                            <KV label="Points" value={(r.pointsTotal as number) ?? (collision.points as number) ?? 0} valueClass="font-bold text-rose-600" />
                        </>
                    )}
                    {event.kind === 'conviction' && conviction && (
                        <>
                            <KV label="Ticket #" value={(r.ticket as string) ?? '—'} valueClass="font-mono font-semibold text-slate-800" />
                            <KV label="Conviction Date" value={(conviction.convictionDate as string) ?? '—'} valueClass="font-mono text-slate-700" />
                            <KV label="Jurisdiction" value={(conviction.jurisdiction as string) ?? '—'} />
                            <KV label="Microfilm" value={(conviction.microfilm as string) ?? '—'} valueClass="font-mono text-slate-700" />
                            <KV label="Charged Carrier" value={(conviction.chargedCarrier as string) ?? '—'} />
                            <KV label="CCMTA" value={(conviction.ccmtaEquivalency as string) ?? '—'} />
                            <KV label="Points" value={(r.pointsTotal as number) ?? (conviction.points as number) ?? 0} valueClass="font-bold text-amber-700" />
                        </>
                    )}
                </div>
            </DetailCard>

            <DetailCard title="Driver & Vehicles">
                <div className="text-xs space-y-2">
                    <div>
                        <div className="text-slate-500">Driver</div>
                        <div className="font-bold text-slate-800">{event.driverName ?? '—'}</div>
                        <div className="font-mono text-slate-600 text-[11px]">
                            {event.licenseNumber ?? '—'} <span className="text-slate-400">({event.licenseJurisdiction ?? '—'})</span>
                        </div>
                    </div>
                    {vehicle1 && (
                        <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500">Vehicle 1</div>
                            <div className="font-bold text-slate-800">{[vehicle1.make, vehicle1.unit].filter(Boolean).join(' ') || '—'}</div>
                            <div className="font-mono text-slate-600 text-[11px]">{vehicle1.plate ?? '—'} <span className="text-slate-400">({vehicle1.jurisdiction ?? '—'})</span></div>
                        </div>
                    )}
                    {vehicle2 && (vehicle2.make || vehicle2.unit || vehicle2.plate) && (
                        <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500">Vehicle 2</div>
                            <div className="font-bold text-slate-800">{[vehicle2.make, vehicle2.unit].filter(Boolean).join(' ') || '—'}</div>
                            <div className="font-mono text-slate-600 text-[11px]">{vehicle2.plate ?? '—'} <span className="text-slate-400">({vehicle2.jurisdiction ?? '—'})</span></div>
                        </div>
                    )}
                </div>
            </DetailCard>

            {event.kind === 'inspection' ? (
                <DetailCard title={`Defects (${defects.length})`}>
                    {defects.length > 0 ? (
                        <ul className="space-y-1.5 text-xs">
                            {defects.map((d, i) => (
                                <li key={i} className="flex items-start gap-2">
                                    {d.oos
                                        ? <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">OOS</span>
                                        : <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />}
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{d.category}</div>
                                        <div className={cn('text-[12px] font-medium', d.oos ? 'text-rose-700' : 'text-slate-700')}>{d.defect}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-xs text-slate-500 italic">No defects recorded.</div>
                    )}
                </DetailCard>
            ) : event.kind === 'collision' && collision ? (
                <DetailCard title="Vehicle & Driver Action">
                    <div className="text-xs space-y-2">
                        <div>
                            <div className="text-slate-500">Vehicle Action</div>
                            <div className="text-slate-700">{(collision.vehicleAction as string) ?? '—'}</div>
                            <div className="text-slate-500 text-[11px]">{(collision.vehicleCondition as string) ?? '—'}</div>
                        </div>
                        <div className="pt-2 border-t border-slate-100">
                            <div className="text-slate-500">Driver Action</div>
                            <div className="text-slate-700">{(collision.driverAction as string) ?? '—'}</div>
                            <div className="text-slate-500 text-[11px]">{(collision.driverCondition as string) ?? '—'}</div>
                        </div>
                    </div>
                </DetailCard>
            ) : conviction ? (
                <DetailCard title="Offence">
                    <div className="text-xs space-y-2">
                        <div>
                            <div className="text-slate-500">Offence</div>
                            <div className="font-bold text-slate-800">{(conviction.offence as string) ?? '—'}</div>
                            {typeof conviction.ccmtaEquivalency === 'string' && conviction.ccmtaEquivalency.length > 0 && (
                                <div className="text-slate-500 text-[11px] mt-0.5">
                                    <span className="font-semibold">CCMTA:</span> {conviction.ccmtaEquivalency}
                                </div>
                            )}
                        </div>
                        {typeof conviction.offenceLocation === 'string' && conviction.offenceLocation.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-slate-500">Offence Location</div>
                                <div className="text-slate-700">{conviction.offenceLocation}</div>
                            </div>
                        )}
                    </div>
                </DetailCard>
            ) : null}
        </div>
    );
}

function NscDetail({ event }: { event: SafetyEvent }) {
    const r = event.raw as Record<string, unknown>;
    const oosRows = (r.oosRows as Array<{ category: string }> | undefined) ?? [];
    const reqRows = (r.reqRows as Array<{ category: string }> | undefined) ?? [];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DetailCard title="Inspection Summary">
                <div className="space-y-1.5">
                    <KV label="Inspection #" value={(r.inspectionNumber as string) ?? '—'} valueClass="font-mono font-semibold text-slate-800" />
                    <KV label="Date" value={event.date} valueClass="font-mono text-slate-700" />
                    <KV label="Jurisdiction" value={event.jurisdiction ?? '—'} />
                    <KV label="Level" value={(r.level as number) ?? '—'} />
                    <KV label="OOS Categories" value={oosRows.length} valueClass={oosRows.length > 0 ? 'font-bold text-rose-600' : 'font-semibold text-slate-800'} />
                    <KV label="Required Repairs" value={reqRows.length} valueClass={reqRows.length > 0 ? 'font-bold text-amber-700' : 'font-semibold text-slate-800'} />
                </div>
            </DetailCard>

            <DetailCard title="OOS / Required Categories">
                {(oosRows.length + reqRows.length) > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                        {oosRows.map((row, i) => (
                            <li key={`oos-${i}`} className="flex items-start gap-2">
                                <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">OOS</span>
                                <span className="text-slate-700">{row.category}</span>
                            </li>
                        ))}
                        {reqRows.map((row, i) => (
                            <li key={`req-${i}`} className="flex items-start gap-2">
                                <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-200">REQ</span>
                                <span className="text-slate-700">{row.category}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-xs text-slate-500 italic">Clean inspection — no OOS or required-repair categories.</div>
                )}
            </DetailCard>
        </div>
    );
}

function FmcsaDetail({ event }: { event: SafetyEvent }) {
    const r = event.raw as Record<string, unknown>;
    const violations = (r.violations as Array<{ code?: string; category?: string; description?: string; severity?: number; oos?: boolean; points?: number }> | undefined) ?? [];
    const sms = r.smsPoints as { vehicle?: number; driver?: number; carrier?: number } | undefined;
    const oosSummary = r.oosSummary as { driver?: string; vehicle?: string; total?: number } | undefined;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DetailCard title="Inspection Summary">
                <div className="space-y-1.5">
                    <KV label="Inspection ID" value={(r.id as string) ?? '—'} valueClass="font-mono font-semibold text-slate-800" />
                    <KV label="Date" value={event.date} valueClass="font-mono text-slate-700" />
                    <KV label="State" value={(r.state as string) ?? '—'} />
                    <KV label="Level" value={(r.level as string) ?? '—'} />
                    <KV label="Clean" value={r.isClean ? 'Yes' : 'No'} valueClass={r.isClean ? 'font-bold text-emerald-600' : 'font-semibold text-slate-800'} />
                    <KV label="Has OOS" value={r.hasOOS ? 'Yes' : 'No'} valueClass={r.hasOOS ? 'font-bold text-rose-600' : 'font-semibold text-slate-800'} />
                    {sms && (
                        <>
                            <KV label="Vehicle SMS Pts" value={sms.vehicle ?? 0} />
                            <KV label="Driver SMS Pts" value={sms.driver ?? 0} />
                            <KV label="Carrier SMS Pts" value={sms.carrier ?? 0} />
                        </>
                    )}
                    {oosSummary && (
                        <KV label="OOS Summary" value={`Drv ${oosSummary.driver ?? '—'} / Veh ${oosSummary.vehicle ?? '—'}`} />
                    )}
                </div>
            </DetailCard>

            <DetailCard title={`Violations (${violations.length})`}>
                {violations.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                        {violations.map((v, i) => (
                            <li key={i} className="flex items-start gap-2">
                                {v.oos
                                    ? <span className="mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">OOS</span>
                                    : <span className="mt-1 w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />}
                                <div className="min-w-0">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">{v.code ?? '—'} · {v.category ?? '—'}</div>
                                    <div className={cn('text-[12px]', v.oos ? 'text-rose-700 font-medium' : 'text-slate-700')}>{v.description ?? '—'}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        {v.severity !== undefined && <span>Severity {v.severity}</span>}
                                        {v.points !== undefined && <span>{(v.severity !== undefined ? ' · ' : '')}{v.points} pts</span>}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-xs text-slate-500 italic">No violations recorded.</div>
                )}
            </DetailCard>
        </div>
    );
}
