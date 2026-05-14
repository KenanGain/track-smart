import { useEffect, useMemo, useRef, useState } from "react";
import {
    FlaskConical, Layers3,
    ShieldAlert, Shield, Search, MapPin,
    LayoutGrid, User, Truck, TrendingUp,
    Printer, Share2, Mail, FileText, FileDown, Download,
    Calendar, SlidersHorizontal,
    AlertTriangle, FileWarning, ChevronDown, ChevronLeft, ChevronRight, Flag,
    Activity, UserX, Info, Users, Wrench,
} from "lucide-react";
import { SubTabs } from "@/components/ui/SubTabs";
import { Input } from "@/components/ui/input";
import {
    ACCIDENT_TYPES,
    CLASS_MAPPING_LENSES,
    LENS_TONE,
    ACCIDENT_GROUP_TONE,
    RISK_TYPE_TONE,
    type AccidentClassMapping,
    type AccidentTypeDef,
} from "@/data/accident-types.data";
import {
    computeFleetSafetyScore,
    computeFleetScoreTrend,
    computeDomainRadar,
    computeViolationScoreBreakdown,
    computeDriverScorecards,
    computeAssetScorecards,
    computeCarrierForecast,
    computeDriverCrashForecasts,
    computeAssetMaintenanceForecasts,
    computeMonthlyTsPoints,
    computeMaintenanceForecast,
    type FleetSafetyScore,
    type NscBreakdown,
    type TrendPoint,
    type DomainRadarPoint,
    type ViolationScoreBreakdown,
    type DriverScorecard,
    type AssetScorecard,
    type CarrierForecast,
    type MonthlyTsPoint,
} from "./fleet-safety-score.data";
import { getAccidentsForCarrier } from "@/pages/incidents/carrier-accidents.data";
import { getViolationsForCarrier } from "@/pages/violations/carrier-violations.data";
import { getHosForCarrier } from "@/pages/hos/carrier-hos.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { NorthAmericaMap } from "./NorthAmericaMap";
import type { JurisdictionStats } from "./risk-geo";
import { cn } from "@/lib/utils";

// ── Storage (read-only here — owned by AccidentsSettingsPage) ──────────────

const OVERRIDES_KEY = "tracksmart_accident_type_overrides_v2";
const CUSTOM_KEY    = "tracksmart_accident_type_custom_v2";

interface BuiltinOverride {
    riskType?: AccidentTypeDef["defaultRiskType"];
    riskPoints?: number;
    classMapping?: AccidentClassMapping;
}

function loadOverrides(): Record<string, BuiltinOverride> {
    if (typeof window === "undefined") return {};
    try { const raw = window.localStorage.getItem(OVERRIDES_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function loadCustom(): AccidentTypeDef[] {
    if (typeof window === "undefined") return [];
    try { const raw = window.localStorage.getItem(CUSTOM_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

// ── Composed type with effective mapping ───────────────────────────────────

interface EffectiveType extends AccidentTypeDef {
    isCustom: boolean;
}

function composeTypes(
    overrides: Record<string, BuiltinOverride>,
    custom: AccidentTypeDef[],
): EffectiveType[] {
    const rows: EffectiveType[] = [];
    for (const t of ACCIDENT_TYPES) {
        const ov = overrides[t.id];
        rows.push({
            ...t,
            defaultRiskType:    ov?.riskType    ?? t.defaultRiskType,
            defaultRiskPoints:  ov?.riskPoints  ?? t.defaultRiskPoints,
            defaultClassMapping: ov?.classMapping ?? t.defaultClassMapping,
            isCustom: false,
        });
    }
    for (const c of custom) rows.push({ ...c, isCustom: true });
    return rows;
}

// ── Page ───────────────────────────────────────────────────────────────────

type SubTabId = "safety-dashboard" | "accidents" | "violations" | "driver" | "assets" | "forecast";

interface BetaSafetyAnalysisPageProps {
    /** Active carrier — drives the Safety Dashboard scoring. */
    accountId?: string;
    /** Navigation handler — used to deep-link into driver / asset profile pages. */
    onNavigate?: (path: string) => void;
}

export function BetaSafetyAnalysisPage({ accountId, onNavigate }: BetaSafetyAnalysisPageProps = {}) {
    const [activeTab, setActiveTab] = useState<SubTabId>("safety-dashboard");
    const [overrides, setOverrides] = useState<Record<string, BuiltinOverride>>(() => loadOverrides());
    const [custom, setCustom] = useState<AccidentTypeDef[]>(() => loadCustom());

    // Refresh from localStorage whenever the tab gains focus, so saves made
    // in Settings appear here without requiring a full page reload.
    useEffect(() => {
        const refresh = () => {
            setOverrides(loadOverrides());
            setCustom(loadCustom());
        };
        window.addEventListener("focus", refresh);
        window.addEventListener("storage", refresh);
        return () => {
            window.removeEventListener("focus", refresh);
            window.removeEventListener("storage", refresh);
        };
    }, []);

    const types = useMemo(() => composeTypes(overrides, custom), [overrides, custom]);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-5">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white flex items-center justify-center shadow-sm">
                        <FlaskConical size={20} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold text-slate-900">Safety Analysis</h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Carrier safety reports built from the configurable Accident / Collision mappings — set up in Settings &rsaquo; Accidents.
                        </p>
                    </div>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="bg-white border-b border-slate-200 px-8">
                <SubTabs
                    tabs={[
                        { id: "safety-dashboard", label: "Safety Dashboard", icon: LayoutGrid },
                        { id: "accidents",        label: "Accidents",        icon: AlertTriangle },
                        { id: "violations",       label: "Violations",       icon: FileWarning },
                        { id: "driver",           label: "Driver",           icon: User },
                        { id: "assets",           label: "Assets",           icon: Truck },
                        { id: "forecast",         label: "Forecast",         icon: TrendingUp },
                    ]}
                    activeId={activeTab}
                    onChange={(id) => setActiveTab(id as SubTabId)}
                />
            </div>

            {activeTab === "safety-dashboard" && <SafetyDashboardView accountId={accountId} />}

            {activeTab === "accidents" && <AccidentsAnalysisView accountId={accountId} />}

            {activeTab === "violations" && <ViolationsAnalysisView accountId={accountId} />}

            {activeTab === "driver" && <DriversAnalysisView accountId={accountId} onNavigate={onNavigate} />}

            {activeTab === "assets" && <AssetsAnalysisView accountId={accountId} onNavigate={onNavigate} />}

            {activeTab === "forecast" && <ForecastAnalysisView accountId={accountId} />}

            {/* The original Accident/Collision lens view is kept for now —
                not exposed on the tab strip but referenced here so it stays
                in the bundle while we wire it back in. */}
            {false && <AccidentCollisionView types={types} />}
        </div>
    );
}


// ── Safety Dashboard sub-view ─────────────────────────────────────────────
// Built around three concentric filter bands the user controls:
//   1. Action row     — Print / Share / Mail / Export (CSV / PDF / Full)
//   2. Time period    — global date range driving every KPI on this tab
//                       (7d / 30d / 90d / 6mo / 12mo presets + custom range)
//   3. Filter row     — View (saved), Jurisdiction, Mode (Time/Distance),
//                       and a "More Filters" drawer
// The state is held locally so changing a preset / mode / jurisdiction
// re-scopes downstream charts (charts land in a follow-up pass).

const TIME_PRESETS = [
    { id: '7d',   label: '7d',   days: 7   },
    { id: '30d',  label: '30d',  days: 30  },
    { id: '90d',  label: '90d',  days: 90  },
    { id: '6mo',  label: '6mo',  days: 180 },
    { id: '12mo', label: '12mo', days: 365 },
] as const;
type TimePresetId = (typeof TIME_PRESETS)[number]['id'] | 'custom';
type Jurisdiction = 'all' | 'us' | 'canada';
type Mode = 'time' | 'distance';

// ── Time-window presets (used by the Violations Analysis history scope) ─
const TIME_WINDOW_PRESETS = [
    { id: '7d',   label: '7d',   days: 7    },
    { id: '30d',  label: '30d',  days: 30   },
    { id: '90d',  label: '90d',  days: 90   },
    { id: '6mo',  label: '6mo',  days: 180  },
    { id: '12mo', label: '12mo', days: 365  },
    { id: '24mo', label: '24mo', days: 730  },
] as const;
type TimeWindowId = (typeof TIME_WINDOW_PRESETS)[number]['id'] | 'all' | 'custom';

// ── Donut chart (SVG arcs + legend) ──────────────────────────────────────
interface DonutSlice {
    id: string;
    label: string;
    value: number;
    color: string;
}

function DonutChart({
    title, subtitle, slices, size = 160, thickness = 28, onSliceClick, activeId, bare = false,
}: {
    title: string;
    subtitle?: string;
    slices: DonutSlice[];
    size?: number;
    thickness?: number;
    onSliceClick?: (id: string) => void;
    activeId?: string;
    /** Render just the SVG donut (no card frame, no internal legend) — used
     *  when the caller is supplying its own legend. */
    bare?: boolean;
}) {
    const total = slices.reduce((s, x) => s + x.value, 0);
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - thickness) / 2;
    const innerRadius = radius - thickness;

    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    // Build arc paths (and starting angles).
    const arcs = useMemo(() => {
        if (total === 0) return [];
        let cursor = -Math.PI / 2; // start at 12 o'clock
        return slices.map(s => {
            const angle = (s.value / total) * 2 * Math.PI;
            const start = cursor;
            const end = cursor + angle;
            cursor = end;
            // Outer arc points
            const x1 = cx + radius * Math.cos(start);
            const y1 = cy + radius * Math.sin(start);
            const x2 = cx + radius * Math.cos(end);
            const y2 = cy + radius * Math.sin(end);
            // Inner arc points
            const x3 = cx + innerRadius * Math.cos(end);
            const y3 = cy + innerRadius * Math.sin(end);
            const x4 = cx + innerRadius * Math.cos(start);
            const y4 = cy + innerRadius * Math.sin(start);
            const largeArc = angle > Math.PI ? 1 : 0;
            const d = [
                `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
                `A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
                `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
                `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
                'Z',
            ].join(' ');
            return { slice: s, d, percent: (s.value / total) * 100 };
        });
    }, [slices, total, cx, cy, radius, innerRadius]);

    const hovered = hoverIdx !== null ? arcs[hoverIdx] : null;

    if (bare) {
        return (
            <div className="relative" style={{ width: size, height: size }}>
                {total === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No data</div>
                ) : (
                    <>
                        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
                            {arcs.map((a, i) => {
                                const isHovered = hoverIdx === i;
                                const isActive  = activeId === a.slice.id;
                                const dim = (hoverIdx !== null && !isHovered) || (activeId && !isActive);
                                return (
                                    <path
                                        key={a.slice.id}
                                        d={a.d}
                                        fill={a.slice.color}
                                        opacity={dim ? 0.35 : 1}
                                        style={{
                                            cursor: onSliceClick ? 'pointer' : 'default',
                                            transition: 'opacity 150ms',
                                        }}
                                        onMouseEnter={() => setHoverIdx(i)}
                                        onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                                        onClick={() => onSliceClick?.(a.slice.id)}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 text-center">
                            {hovered ? (
                                <>
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-tight line-clamp-2">{hovered.slice.label}</span>
                                    <span className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{hovered.slice.value.toLocaleString()}</span>
                                    <span className="text-[10px] text-slate-500 tabular-nums">{hovered.percent.toFixed(1)}%</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-2xl font-black text-slate-900 tabular-nums">{total.toLocaleString()}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
            <div className="mb-3">
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{title}</h4>
                {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* SVG donut */}
                <div className="relative shrink-0" style={{ width: size, height: size }}>
                    {total === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">No data</div>
                    ) : (
                        <>
                            <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
                                {arcs.map((a, i) => {
                                    const isHovered = hoverIdx === i;
                                    const isActive  = activeId === a.slice.id;
                                    const dim = (hoverIdx !== null && !isHovered) || (activeId && !isActive);
                                    return (
                                        <path
                                            key={a.slice.id}
                                            d={a.d}
                                            fill={a.slice.color}
                                            opacity={dim ? 0.35 : 1}
                                            style={{
                                                cursor: onSliceClick ? 'pointer' : 'default',
                                                transition: 'opacity 150ms',
                                            }}
                                            onMouseEnter={() => setHoverIdx(i)}
                                            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                                            onClick={() => onSliceClick?.(a.slice.id)}
                                        />
                                    );
                                })}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 text-center">
                                {hovered ? (
                                    <>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-tight line-clamp-2">{hovered.slice.label}</span>
                                        <span className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{hovered.slice.value.toLocaleString()}</span>
                                        <span className="text-[10px] text-slate-500 tabular-nums">{hovered.percent.toFixed(1)}%</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl font-black text-slate-900 tabular-nums">{total.toLocaleString()}</span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
                {/* Legend — full label, no truncation; values right-aligned. */}
                <ul className="flex-1 min-w-0 max-h-[180px] overflow-y-auto pr-1 -mr-1 space-y-1">
                    {slices.map((s, i) => {
                        const pct = total > 0 ? (s.value / total) * 100 : 0;
                        const isActive = activeId === s.id;
                        const isHovered = hoverIdx === i;
                        return (
                            <li key={s.id}>
                                <button
                                    type="button"
                                    onMouseEnter={() => setHoverIdx(i)}
                                    onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                                    onClick={() => onSliceClick?.(s.id)}
                                    disabled={!onSliceClick}
                                    className={cn(
                                        'w-full grid items-center gap-2 text-left px-1.5 py-1 rounded transition-colors',
                                        onSliceClick && 'hover:bg-slate-50 cursor-pointer',
                                        isActive && 'bg-slate-100 ring-1 ring-inset ring-slate-200',
                                    )}
                                    style={{ gridTemplateColumns: '12px 1fr auto auto' }}
                                >
                                    <span className="h-2.5 w-2.5 rounded" style={{ background: s.color }} />
                                    <span className={cn(
                                        'text-[11px] leading-tight break-words text-left',
                                        (isActive || isHovered) ? 'font-bold text-slate-900' : 'text-slate-700',
                                    )}>
                                        {s.label}
                                    </span>
                                    <span className="text-[10px] font-bold tabular-nums text-slate-700">
                                        {s.value.toLocaleString()}
                                    </span>
                                    <span className="text-[10px] tabular-nums text-slate-400 w-10 text-right">
                                        {pct.toFixed(1)}%
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

// Stable colour palette for category donut (cycles for long lists).
const CATEGORY_PALETTE = [
    '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
    '#06b6d4', '#ec4899', '#a16207', '#6366f1', '#84cc16',
    '#0ea5e9', '#d946ef',
];

// ── Top-level Drivers Analysis view ─────────────────────────────────────
// Per-driver scorecards in Grid (donut tiles) or List (score-bar table) mode.
function DriversAnalysisView({ accountId, onNavigate }: { accountId?: string; onNavigate?: (path: string) => void }) {
    const id = accountId ?? "acct-001";
    const drivers = useMemo(() => computeDriverScorecards(id), [id]);
    const account = ACCOUNTS_DB.find(a => a.id === id);

    type ViewMode = 'grid' | 'list';
    const [mode, setMode] = useState<ViewMode>('list');
    const [search, setSearch] = useState('');

    type BandFilter = 'all' | DriverScorecard['band'];
    const [band, setBand] = useState<BandFilter>('all');

    // Selected driver — opens a side detail panel with the full scorecard.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedDriver = useMemo(
        () => selectedId ? drivers.find(d => d.driverId === selectedId) ?? null : null,
        [selectedId, drivers],
    );

    // Counts per band — drive the filter chip badges.
    const bandCounts = useMemo(() => {
        const c = { Excellent: 0, Good: 0, Fair: 0, Poor: 0, Critical: 0 } as Record<DriverScorecard['band'], number>;
        for (const d of drivers) c[d.band] += 1;
        return c;
    }, [drivers]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return drivers.filter(d => {
            if (band !== 'all' && d.band !== band) return false;
            if (!q) return true;
            return d.name.toLowerCase().includes(q) || d.licenseNumber.toLowerCase().includes(q) || d.driverId.toLowerCase().includes(q);
        });
    }, [drivers, search, band]);

    // Pagination
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    useEffect(() => { setPage(1); }, [search, band, mode]);
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="px-8 py-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Page header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Drivers Analysis</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {account?.legalName ?? 'Carrier'} · {drivers.length} drivers · ranked by 12-month score
                            </p>
                        </div>
                    </div>
                    {/* Grid / List toggle */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setMode('grid')}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors',
                                mode === 'grid' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <LayoutGrid size={12} /> Grid
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('list')}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors',
                                mode === 'list' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <Layers3 size={12} /> List
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {/* Driver points trend — 12 months, derived from the carrier violation ledger */}
                    <TsPointsTrendSection accountId={accountId} series={['driver']} noBorderTop />
                    <div className="h-4" />

                    {/* Driver distribution histogram (full carrier — unfiltered) */}
                    <DriverDistributionPanel drivers={drivers} />

                    {/* Filter bar */}
                    <div className="mb-5 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                        <div className="relative w-full sm:w-80 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search drivers by name or licence…"
                                className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 bg-white"
                            />
                        </div>
                        <div className="inline-flex items-center gap-2 flex-wrap">
                            <BandChip active={band === 'all'}       label="All"       count={drivers.length}        onClick={() => setBand('all')}       tone="slate" />
                            <BandChip active={band === 'Excellent'} label="Excellent" count={bandCounts.Excellent}  onClick={() => setBand('Excellent')} tone="emerald" />
                            <BandChip active={band === 'Good'}      label="Good"      count={bandCounts.Good}        onClick={() => setBand('Good')}     tone="blue" />
                            <BandChip active={band === 'Fair'}      label="Fair"      count={bandCounts.Fair}        onClick={() => setBand('Fair')}     tone="amber" />
                            <BandChip active={band === 'Poor'}      label="Poor"      count={bandCounts.Poor}        onClick={() => setBand('Poor')}     tone="orange" />
                            <BandChip active={band === 'Critical'}  label="Critical"  count={bandCounts.Critical}    onClick={() => setBand('Critical')} tone="red" />
                        </div>
                        <div className="ml-auto text-[10px] text-slate-500 whitespace-nowrap">
                            <span className="font-bold tabular-nums text-slate-700">{filtered.length}</span> driver{filtered.length === 1 ? '' : 's'}
                            {(band !== 'all' || search.trim()) && (
                                <button
                                    type="button"
                                    onClick={() => { setBand('all'); setSearch(''); }}
                                    className="ml-2 font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* View body */}
                    {mode === 'grid'
                        ? <DriverGridView drivers={visible} selectedId={selectedId} onSelect={setSelectedId} />
                        : <DriverListView drivers={visible} selectedId={selectedId} onSelect={setSelectedId} />}

                    {/* Driver detail panel — same pattern as RowDetailPanel elsewhere. */}
                    {selectedDriver && (
                        <DriverDetailPanel
                            driver={selectedDriver}
                            onClose={() => setSelectedId(null)}
                            onOpenProfile={onNavigate ? () => {
                                // Stash the deep-link so the carrier-profile page
                                // can open the right driver, plus the return path
                                // so its Back button comes home to Beta.
                                sessionStorage.setItem('beta-deep-link-driver-id', selectedDriver.driverId);
                                sessionStorage.setItem('beta-return-path', '/safety-analysis/beta');
                                onNavigate('/account/profile');
                            } : undefined}
                        />
                    )}

                    {/* Pagination bar */}
                    <div className="mt-4 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
                        <Pagination state={{
                            page, pageSize, totalRows: filtered.length,
                            onPageChange: setPage,
                            onPageSizeChange: setPageSize,
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function BandChip({ active, label, count, onClick, tone }: { active: boolean; label: string; count: number; onClick: () => void; tone: 'slate'|'emerald'|'blue'|'amber'|'orange'|'red' }) {
    const toneCls =
        active
            ? tone === 'slate'   ? 'bg-slate-900 text-white border-slate-900'
            : tone === 'emerald' ? 'bg-emerald-600 text-white border-emerald-600'
            : tone === 'blue'    ? 'bg-blue-600 text-white border-blue-600'
            : tone === 'amber'   ? 'bg-amber-600 text-white border-amber-600'
            : tone === 'orange'  ? 'bg-orange-600 text-white border-orange-600'
            :                      'bg-red-600 text-white border-red-600'
        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
    return (
        <button type="button" onClick={onClick}
            className={cn('inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-semibold whitespace-nowrap transition-all', toneCls)}
        >
            <span>{label}</span>
            <span className={cn('inline-flex items-center justify-center min-w-[20px] h-4 px-1 rounded text-[10px] tabular-nums font-bold',
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>
                {count}
            </span>
        </button>
    );
}

// ── Driver distribution histogram ──────────────────────────────────────
// Shows how the carrier's drivers split across the 5 risk bands, plus
// percentile markers (p10 / median / p90) for the overall score.
function DriverDistributionPanel({ drivers }: { drivers: DriverScorecard[] }) {
    const counts = useMemo(() => {
        const out: Record<DriverScorecard['band'], number> = {
            Excellent: 0, Good: 0, Fair: 0, Poor: 0, Critical: 0,
        };
        for (const d of drivers) out[d.band] += 1;
        return out;
    }, [drivers]);

    const stats = useMemo(() => {
        if (drivers.length === 0) return { p10: 0, median: 0, p90: 0 };
        const sorted = [...drivers].map(d => d.overall).sort((a, b) => a - b);
        const at = (q: number) => {
            const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
            return Number(sorted[idx].toFixed(1));
        };
        return { p10: at(0.10), median: at(0.50), p90: at(0.90) };
    }, [drivers]);

    const total = drivers.length;
    const maxCount = Math.max(1, ...Object.values(counts));

    const bands: { id: DriverScorecard['band']; label: string; color: string }[] = [
        { id: 'Excellent', label: 'Excellent', color: 'bg-emerald-500' },
        { id: 'Good',      label: 'Good',      color: 'bg-lime-500' },
        { id: 'Fair',      label: 'Fair',      color: 'bg-amber-500' },
        { id: 'Poor',      label: 'Poor',      color: 'bg-orange-500' },
        { id: 'Critical',  label: 'Critical',  color: 'bg-red-500' },
    ];

    return (
        <div className="mb-5 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Driver distribution</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {total.toLocaleString()} driver{total === 1 ? '' : 's'} · median <span className="font-bold text-slate-700">{stats.median.toFixed(1)}</span>
                    </p>
                </div>
                <div className="text-slate-400" title="Distribution of drivers across the 5 risk bands.">
                    <Info size={16} />
                </div>
            </div>

            {/* Histogram bars */}
            <div className="grid grid-cols-5 gap-3 mb-3" style={{ height: 140 }}>
                {bands.map(b => {
                    const c = counts[b.id];
                    const pct = total > 0 ? (c / total) * 100 : 0;
                    const barH = (c / maxCount) * 100;
                    return (
                        <div key={b.id} className="flex flex-col h-full">
                            {/* Bar track — bar grows from the bottom */}
                            <div className="flex-1 bg-slate-50 rounded-md flex items-end overflow-hidden">
                                <div
                                    className={cn('w-full rounded-md transition-all', b.color)}
                                    style={{ height: `${Math.max(barH, c > 0 ? 6 : 0)}%` }}
                                />
                            </div>
                            <div className="text-center mt-2">
                                <div className="text-[11px] font-bold text-slate-700">{b.label}</div>
                                <div className="text-[10px] text-slate-500 tabular-nums">
                                    {c.toLocaleString()} · {pct.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer percentile markers */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">p10 <span className="font-bold text-slate-700 tabular-nums">{stats.p10.toFixed(1)}</span></span>
                <span className="text-slate-500">median <span className="font-bold text-slate-700 tabular-nums">{stats.median.toFixed(1)}</span></span>
                <span className="text-slate-500">p90 <span className="font-bold text-slate-700 tabular-nums">{stats.p90.toFixed(1)}</span></span>
            </div>
        </div>
    );
}

function bandTone(b: DriverScorecard['band']) {
    return b === 'Excellent' ? { pill: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-700', ring: 'text-emerald-500', bar: 'bg-emerald-500' }
         : b === 'Good'      ? { pill: 'bg-blue-100 text-blue-700',       text: 'text-blue-700',    ring: 'text-blue-600',    bar: 'bg-blue-500' }
         : b === 'Fair'      ? { pill: 'bg-amber-100 text-amber-700',     text: 'text-amber-700',   ring: 'text-amber-500',   bar: 'bg-amber-500' }
         : b === 'Poor'      ? { pill: 'bg-orange-100 text-orange-700',   text: 'text-orange-700',  ring: 'text-orange-500',  bar: 'bg-orange-500' }
         :                     { pill: 'bg-red-100 text-red-700',         text: 'text-red-700',     ring: 'text-red-500',     bar: 'bg-red-500' };
}

// ── Grid view ──────────────────────────────────────────────────────────
function DriverGridView({
    drivers, selectedId, onSelect,
}: {
    drivers: DriverScorecard[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    if (drivers.length === 0) {
        return <div className="px-4 py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">No drivers match the current filters.</div>;
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {drivers.map(d => {
                const tone = bandTone(d.band);
                const initials = d.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
                const isActive = selectedId === d.driverId;
                return (
                    <button
                        key={d.driverId}
                        type="button"
                        onClick={() => onSelect(d.driverId)}
                        className={cn(
                            'group bg-white border rounded-xl p-3 flex flex-col items-center text-center transition-all',
                            'hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer',
                            isActive ? 'border-blue-400 ring-2 ring-blue-200 shadow-sm' : 'border-slate-200',
                        )}
                        title={`Open ${d.name}`}
                    >
                        <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mb-2">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-violet-100 text-violet-700 font-bold text-[10px]">{initials}</span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', tone.pill)}>{d.band}</span>
                        </div>
                        <SafetyRingChart label="" score={d.overall} palette={d.band === 'Excellent' ? 'green' : d.band === 'Good' ? 'blue' : 'auto'} />
                        <div className="text-[12px] font-bold text-slate-900 mt-1 truncate w-full" title={d.name}>{d.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate w-full">{d.licenseNumber}</div>
                        <div className={cn('mt-1 text-[11px] font-bold tabular-nums', d.delta30d >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {d.delta30d >= 0 ? '+' : ''}{d.delta30d.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                            {d.counts.accidents}A · {d.counts.violations}V · {d.counts.oos} OOS
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ── List view (table with score bars per category) ─────────────────────
function DriverListView({
    drivers, selectedId, onSelect,
}: {
    drivers: DriverScorecard[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    if (drivers.length === 0) {
        return <div className="px-4 py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">No drivers match the current filters.</div>;
    }
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500">Driver</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Overall</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Accidents</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">ELD</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Inspections</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">VEDR</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Violations</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500">Status</th>
                            <th className="w-8" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {drivers.map(d => {
                            const tone = bandTone(d.band);
                            const initials = d.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
                            const isActive = selectedId === d.driverId;
                            return (
                                <tr
                                    key={d.driverId}
                                    onClick={() => onSelect(d.driverId)}
                                    className={cn(
                                        'cursor-pointer transition-colors',
                                        isActive ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50',
                                    )}
                                    title={`Open ${d.name}`}
                                >
                                    {/* Driver */}
                                    <td className={cn('px-3 py-3', isActive && 'border-l-2 border-blue-500 pl-2.5')}>
                                        <div className="flex items-center gap-2.5">
                                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-violet-100 text-violet-700 font-bold text-[10px] shrink-0">{initials}</span>
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-semibold text-slate-900 truncate">{d.name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono truncate">{d.driverId}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {/* Overall */}
                                    <td className="px-3 py-3 text-center">
                                        <div className={cn('inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-md', tone.pill)}>
                                            <span className="text-[14px] font-black tabular-nums leading-none">{d.overall.toFixed(1)}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider">{d.band}</span>
                                        </div>
                                    </td>
                                    <ScoreBarCell score={d.accidents} />
                                    <ScoreBarCell score={d.eld} />
                                    <ScoreBarCell score={d.inspections} />
                                    <ScoreBarCell score={d.vedr} />
                                    <ScoreBarCell score={d.violations} />
                                    {/* Status */}
                                    <td className="px-3 py-3">
                                        <span className={cn(
                                            'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                            d.status === 'active'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500',
                                        )}>
                                            {d.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-slate-400">
                                        <ChevronRight size={14} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Driver detail panel — opens when a card / row is clicked ────────────
function DriverDetailPanel({
    driver, onClose, onOpenProfile,
}: {
    driver: DriverScorecard;
    onClose: () => void;
    onOpenProfile?: () => void;
}) {
    const tone = bandTone(driver.band);
    const initials = driver.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
    return (
        <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50/40 to-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-blue-100 bg-blue-50/60">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-violet-100 text-violet-700 font-bold text-[14px] shrink-0">{initials}</span>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Driver profile</div>
                        <div className="flex items-baseline gap-2 mt-0.5">
                            <span className="text-base font-bold text-slate-900 truncate">{driver.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{driver.licenseNumber}</span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', tone.pill)}>{driver.band}</span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', driver.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                                {driver.status}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onOpenProfile && (
                        <button
                            type="button"
                            onClick={onOpenProfile}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 border border-blue-600 bg-blue-600 px-2.5 py-1 rounded-md"
                        >
                            View profile <ChevronRight size={11} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded-md bg-white"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 px-5 py-5">
                {/* Big overall ring */}
                <div className="flex flex-col items-center justify-center">
                    <SafetyRingChart
                        size="large"
                        label="Driver Safety Score"
                        score={driver.overall}
                        palette={driver.band === 'Excellent' ? 'green' : driver.band === 'Good' ? 'blue' : 'auto'}
                        subtitle={`${driver.overall.toFixed(1)} / 100`}
                    />
                    <div className={cn('mt-3 text-[12px] font-bold tabular-nums', driver.delta30d >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {driver.delta30d >= 0 ? '+' : ''}{driver.delta30d.toFixed(2)}
                        <span className="ml-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">vs prior 30d</span>
                    </div>
                </div>

                {/* Category sub-scores */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-start">
                    {[
                        { label: 'Accidents',   value: driver.accidents,   sub: `${driver.counts.accidents} on record` },
                        { label: 'ELD / HOS',   value: driver.eld,         sub: `${driver.counts.hosBreaks} rule break${driver.counts.hosBreaks === 1 ? '' : 's'}` },
                        { label: 'Inspections', value: driver.inspections, sub: 'roadside outcome' },
                        { label: 'VEDR',        value: driver.vedr,        sub: `${driver.counts.vedrEvents} event${driver.counts.vedrEvents === 1 ? '' : 's'}` },
                        { label: 'Violations',  value: driver.violations,  sub: `${driver.counts.violations} total · ${driver.counts.oos} OOS` },
                        { label: 'Status',      value: driver.status === 'active' ? 100 : 0, sub: driver.status === 'active' ? 'Active driver' : 'Inactive' },
                    ].map(c => (
                        <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col items-center text-center">
                            <SafetyRingChart label={c.label} score={c.value} palette="green" />
                            <div className={cn('mt-1 text-sm font-bold tabular-nums', getScoreColor(c.value))}>{c.value.toFixed(0)}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Counts strip */}
            <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <KpiTile value={driver.counts.accidents}  label="Accidents"   tone={driver.counts.accidents  > 0 ? 'red' : 'slate'} />
                <KpiTile value={driver.counts.violations} label="Violations"  tone={driver.counts.violations > 0 ? 'amber' : 'slate'} />
                <KpiTile value={driver.counts.oos}        label="OOS"         tone={driver.counts.oos        > 0 ? 'red' : 'slate'} />
                <KpiTile value={driver.counts.hosBreaks}  label="HOS Breaks"  tone={driver.counts.hosBreaks  > 0 ? 'amber' : 'slate'} />
                <KpiTile value={driver.counts.vedrEvents} label="VEDR Events" tone={driver.counts.vedrEvents > 0 ? 'amber' : 'slate'} />
            </div>

            {/* Component breakdown — weighted contribution of each domain */}
            <div className="px-5 pb-5">
                <DriverComponentBreakdown driver={driver} />
            </div>
        </div>
    );
}

// ── Driver component breakdown — bar with weighted contributions ────────
function DriverComponentBreakdown({ driver }: { driver: DriverScorecard }) {
    // Weights match the composite formula in computeDriverScorecards.
    // (Accidents 22% · Violations 22% · Inspections 18% · ELD 16% · VEDR 12% · baseline 10%)
    // — relabeled here for the driver-facing breakdown so the rows read like
    // "Driver events / HOS / VEDR / Roadside / Incidents / Training".
    const components = [
        { id: 'driver',     label: 'Driver events',       score: driver.violations,  weight: 0.22, events: driver.counts.violations },
        { id: 'hos',        label: 'HOS / ELD',           score: driver.eld,         weight: 0.16, events: driver.counts.hosBreaks },
        { id: 'vedr',       label: 'Telematics / VEDR',   score: driver.vedr,        weight: 0.12, events: driver.counts.vedrEvents },
        { id: 'inspection', label: 'Roadside inspections',score: driver.inspections, weight: 0.18, events: 0 },
        { id: 'incidents',  label: 'Incidents',           score: driver.accidents,   weight: 0.22, events: driver.counts.accidents },
        { id: 'training',   label: 'Training / docs',     score: 75,                 weight: 0.10, events: 0 },
    ];
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    // Score-band colour helper.
    const colorFor = (score: number) => {
        if (score >= 90) return { bar: 'bg-emerald-500', track: 'bg-emerald-100', txt: 'text-emerald-700' };
        if (score >= 70) return { bar: 'bg-lime-500',    track: 'bg-lime-100',    txt: 'text-lime-700' };
        if (score >= 55) return { bar: 'bg-orange-500',  track: 'bg-orange-100',  txt: 'text-orange-700' };
        return                  { bar: 'bg-red-500',     track: 'bg-red-100',     txt: 'text-red-700' };
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Component breakdown</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Hover a row to see weight and event count.</p>
                </div>
                <div className="text-slate-400" title="Each component contributes a weighted slice of the overall score.">
                    <Info size={14} />
                </div>
            </div>

            {/* Top segmented bar — each component's weight × its score */}
            <div className="flex h-3 rounded-full overflow-hidden border border-slate-200 mb-4">
                {components.map((c, i) => {
                    const w = c.weight * 100; // share-of-width by weight
                    const tone = colorFor(c.score);
                    const isHovered = hoverIdx === i;
                    return (
                        <div
                            key={c.id}
                            className={cn('h-full transition-opacity', tone.bar, hoverIdx !== null && !isHovered && 'opacity-40')}
                            style={{ width: `${w}%` }}
                            title={`${c.label} · ×${c.weight.toFixed(2)} · score ${c.score.toFixed(0)}`}
                            onMouseEnter={() => setHoverIdx(i)}
                            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                        />
                    );
                })}
            </div>

            {/* Per-component rows */}
            <div className="space-y-2.5">
                {components.map((c, i) => {
                    const tone = colorFor(c.score);
                    const isHovered = hoverIdx === i;
                    return (
                        <div
                            key={c.id}
                            onMouseEnter={() => setHoverIdx(i)}
                            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                            className={cn(
                                'grid items-center gap-3 px-1 py-1 rounded transition-colors',
                                isHovered && 'bg-slate-50',
                            )}
                            style={{ gridTemplateColumns: '180px 1fr 60px 56px 56px' }}
                        >
                            <span className={cn(
                                'text-[12px] font-semibold truncate',
                                isHovered ? 'text-blue-700' : 'text-slate-700',
                            )} title={c.label}>{c.label}</span>
                            <div className={cn('h-2 rounded-full overflow-hidden', tone.track)}>
                                <div
                                    className={cn('h-full rounded-full', tone.bar)}
                                    style={{ width: `${Math.min(100, c.score)}%` }}
                                />
                            </div>
                            <span className={cn('text-[12px] font-black tabular-nums text-right', tone.txt)}>
                                {c.score.toFixed(1)}
                            </span>
                            <span className="text-[11px] tabular-nums text-slate-400 text-right">
                                ×{c.weight.toFixed(2)}
                            </span>
                            <span className={cn(
                                'text-[11px] tabular-nums text-right',
                                c.events > 0 ? 'text-slate-700 font-semibold' : 'text-slate-400',
                            )}>
                                {c.events} ev
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ScoreBarCell({ score }: { score: number }) {
    const color =
        score >= 90 ? 'bg-emerald-500 text-emerald-700'
      : score >= 80 ? 'bg-blue-500 text-blue-700'
      : score >= 70 ? 'bg-amber-500 text-amber-700'
      : score >= 55 ? 'bg-orange-500 text-orange-700'
      :               'bg-red-500 text-red-700';
    const [bar, txt] = color.split(' ');
    return (
        <td className="px-3 py-3 text-center">
            <div className="inline-flex flex-col items-center w-20">
                <span className={cn('text-[12px] font-bold tabular-nums', txt)}>{score.toFixed(0)}</span>
                <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-0.5">
                    <div className={cn('h-full rounded-full', bar)} style={{ width: `${Math.max(2, score)}%` }} />
                </div>
            </div>
        </td>
    );
}

// ── Top-level Assets Analysis view ──────────────────────────────────────
// Mirrors the Drivers Analysis layout — Grid / List toggle, distribution,
// search + band chips, paginated cards/rows, and an inline asset profile
// panel with component breakdown.
function AssetsAnalysisView({ accountId, onNavigate }: { accountId?: string; onNavigate?: (path: string) => void }) {
    const id = accountId ?? "acct-001";
    const assets = useMemo(() => computeAssetScorecards(id), [id]);
    const account = ACCOUNTS_DB.find(a => a.id === id);

    type ViewMode = 'grid' | 'list';
    const [mode, setMode] = useState<ViewMode>('list');
    const [search, setSearch] = useState('');
    type BandFilter = 'all' | AssetScorecard['band'];
    const [band, setBand] = useState<BandFilter>('all');

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const selectedAsset = useMemo(
        () => selectedId ? assets.find(a => a.assetId === selectedId) ?? null : null,
        [selectedId, assets],
    );

    const bandCounts = useMemo(() => {
        const c = { Excellent: 0, Good: 0, Fair: 0, Poor: 0, Critical: 0 } as Record<AssetScorecard['band'], number>;
        for (const a of assets) c[a.band] += 1;
        return c;
    }, [assets]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return assets.filter(a => {
            if (band !== 'all' && a.band !== band) return false;
            if (!q) return true;
            return a.unitNumber.toLowerCase().includes(q)
                || a.plate.toLowerCase().includes(q)
                || a.assetId.toLowerCase().includes(q)
                || a.make.toLowerCase().includes(q)
                || a.model.toLowerCase().includes(q);
        });
    }, [assets, search, band]);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    useEffect(() => { setPage(1); }, [search, band, mode]);
    const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

    return (
        <div className="px-8 py-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Page header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                            <Truck size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Assets Analysis</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {account?.legalName ?? 'Carrier'} · {assets.length} assets · ranked by 12-month score
                            </p>
                        </div>
                    </div>
                    {/* Grid / List toggle */}
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setMode('grid')}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors',
                                mode === 'grid' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <LayoutGrid size={12} /> Grid
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('list')}
                            className={cn(
                                'inline-flex items-center gap-1.5 h-7 px-3 rounded-md text-[11px] font-bold transition-colors',
                                mode === 'list' ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500 hover:text-slate-700',
                            )}
                        >
                            <Layers3 size={12} /> List
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    {/* Asset points trend — 12 months, derived from the carrier violation ledger */}
                    <TsPointsTrendSection accountId={accountId} series={['asset']} noBorderTop />
                    <div className="h-4" />

                    {/* Asset distribution histogram (full carrier — unfiltered) */}
                    <AssetDistributionPanel assets={assets} />

                    {/* Filter bar */}
                    <div className="mb-5 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                        <div className="relative w-full sm:w-80 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search assets by unit, plate, make or model…"
                                className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 bg-white"
                            />
                        </div>
                        <div className="inline-flex items-center gap-2 flex-wrap">
                            <BandChip active={band === 'all'}       label="All"       count={assets.length}         onClick={() => setBand('all')}       tone="slate" />
                            <BandChip active={band === 'Excellent'} label="Excellent" count={bandCounts.Excellent}   onClick={() => setBand('Excellent')} tone="emerald" />
                            <BandChip active={band === 'Good'}      label="Good"      count={bandCounts.Good}        onClick={() => setBand('Good')}      tone="blue" />
                            <BandChip active={band === 'Fair'}      label="Fair"      count={bandCounts.Fair}        onClick={() => setBand('Fair')}      tone="amber" />
                            <BandChip active={band === 'Poor'}      label="Poor"      count={bandCounts.Poor}        onClick={() => setBand('Poor')}      tone="orange" />
                            <BandChip active={band === 'Critical'}  label="Critical"  count={bandCounts.Critical}    onClick={() => setBand('Critical')}  tone="red" />
                        </div>
                        <div className="ml-auto text-[10px] text-slate-500 whitespace-nowrap">
                            <span className="font-bold tabular-nums text-slate-700">{filtered.length}</span> asset{filtered.length === 1 ? '' : 's'}
                            {(band !== 'all' || search.trim()) && (
                                <button
                                    type="button"
                                    onClick={() => { setBand('all'); setSearch(''); }}
                                    className="ml-2 font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* View body */}
                    {mode === 'grid'
                        ? <AssetGridView assets={visible} selectedId={selectedId} onSelect={setSelectedId} />
                        : <AssetListView assets={visible} selectedId={selectedId} onSelect={setSelectedId} />}

                    {selectedAsset && (
                        <AssetDetailPanel
                            asset={selectedAsset}
                            onClose={() => setSelectedId(null)}
                            onOpenProfile={onNavigate ? () => {
                                sessionStorage.setItem('beta-deep-link-asset-id', selectedAsset.assetId);
                                sessionStorage.setItem('beta-return-path', '/safety-analysis/beta');
                                onNavigate('/assets/directory');
                            } : undefined}
                        />
                    )}

                    <div className="mt-4 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
                        <Pagination state={{
                            page, pageSize, totalRows: filtered.length,
                            onPageChange: setPage,
                            onPageSizeChange: setPageSize,
                        }} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Asset distribution histogram ────────────────────────────────────────
function AssetDistributionPanel({ assets }: { assets: AssetScorecard[] }) {
    const counts = useMemo(() => {
        const out: Record<AssetScorecard['band'], number> = { Excellent: 0, Good: 0, Fair: 0, Poor: 0, Critical: 0 };
        for (const a of assets) out[a.band] += 1;
        return out;
    }, [assets]);

    const stats = useMemo(() => {
        if (assets.length === 0) return { p10: 0, median: 0, p90: 0 };
        const sorted = [...assets].map(a => a.overall).sort((a, b) => a - b);
        const at = (q: number) => {
            const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
            return Number(sorted[idx].toFixed(1));
        };
        return { p10: at(0.10), median: at(0.50), p90: at(0.90) };
    }, [assets]);

    const total = assets.length;
    const maxCount = Math.max(1, ...Object.values(counts));
    const bands: { id: AssetScorecard['band']; label: string; color: string }[] = [
        { id: 'Excellent', label: 'Excellent', color: 'bg-emerald-500' },
        { id: 'Good',      label: 'Good',      color: 'bg-lime-500' },
        { id: 'Fair',      label: 'Fair',      color: 'bg-amber-500' },
        { id: 'Poor',      label: 'Poor',      color: 'bg-orange-500' },
        { id: 'Critical',  label: 'Critical',  color: 'bg-red-500' },
    ];
    return (
        <div className="mb-5 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between mb-3 gap-3 flex-wrap">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Asset distribution</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {total.toLocaleString()} asset{total === 1 ? '' : 's'} · median <span className="font-bold text-slate-700">{stats.median.toFixed(1)}</span>
                    </p>
                </div>
                <div className="text-slate-400" title="Distribution of assets across the 5 risk bands.">
                    <Info size={16} />
                </div>
            </div>
            <div className="grid grid-cols-5 gap-3 mb-3" style={{ height: 140 }}>
                {bands.map(b => {
                    const c = counts[b.id];
                    const pct = total > 0 ? (c / total) * 100 : 0;
                    const barH = (c / maxCount) * 100;
                    return (
                        <div key={b.id} className="flex flex-col h-full">
                            <div className="flex-1 bg-slate-50 rounded-md flex items-end overflow-hidden">
                                <div className={cn('w-full rounded-md transition-all', b.color)} style={{ height: `${Math.max(barH, c > 0 ? 6 : 0)}%` }} />
                            </div>
                            <div className="text-center mt-2">
                                <div className="text-[11px] font-bold text-slate-700">{b.label}</div>
                                <div className="text-[10px] text-slate-500 tabular-nums">{c.toLocaleString()} · {pct.toFixed(1)}%</div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">p10 <span className="font-bold text-slate-700 tabular-nums">{stats.p10.toFixed(1)}</span></span>
                <span className="text-slate-500">median <span className="font-bold text-slate-700 tabular-nums">{stats.median.toFixed(1)}</span></span>
                <span className="text-slate-500">p90 <span className="font-bold text-slate-700 tabular-nums">{stats.p90.toFixed(1)}</span></span>
            </div>
        </div>
    );
}

function assetBandTone(b: AssetScorecard['band']) { return bandTone(b as DriverScorecard['band']); }

// ── Asset Grid view ────────────────────────────────────────────────────
function AssetGridView({
    assets, selectedId, onSelect,
}: {
    assets: AssetScorecard[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    if (assets.length === 0) {
        return <div className="px-4 py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">No assets match the current filters.</div>;
    }
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
            {assets.map(a => {
                const tone = assetBandTone(a.band);
                const isActive = selectedId === a.assetId;
                return (
                    <button
                        key={a.assetId}
                        type="button"
                        onClick={() => onSelect(a.assetId)}
                        className={cn(
                            'group bg-white border rounded-xl p-3 flex flex-col items-center text-center transition-all',
                            'hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer',
                            isActive ? 'border-blue-400 ring-2 ring-blue-200 shadow-sm' : 'border-slate-200',
                        )}
                        title={`Open ${a.unitNumber}`}
                    >
                        <div className="w-full flex items-center justify-between text-[10px] text-slate-400 mb-2">
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-sky-100 text-sky-700">
                                <Truck size={12} />
                            </span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', tone.pill)}>{a.band}</span>
                        </div>
                        <SafetyRingChart label="" score={a.overall} palette={a.band === 'Excellent' ? 'green' : a.band === 'Good' ? 'blue' : 'auto'} />
                        <div className="text-[12px] font-bold text-slate-900 mt-1 truncate w-full" title={a.unitNumber}>{a.unitNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate w-full">{a.plate}</div>
                        <div className={cn('mt-1 text-[11px] font-bold tabular-nums', a.delta30d >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                            {a.delta30d >= 0 ? '+' : ''}{a.delta30d.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                            {a.counts.accidents}A · {a.counts.violations}V · {a.counts.overdueWorkOrders}/{a.counts.totalWorkOrders} WO
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

// ── Asset List view ────────────────────────────────────────────────────
function AssetListView({
    assets, selectedId, onSelect,
}: {
    assets: AssetScorecard[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    if (assets.length === 0) {
        return <div className="px-4 py-10 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">No assets match the current filters.</div>;
    }
    return (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500">Asset</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Overall</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Maintenance</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Inspections</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Violations</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">Accidents</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 text-center">VEDR</th>
                            <th className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500">Status</th>
                            <th className="w-8" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {assets.map(a => {
                            const tone = assetBandTone(a.band);
                            const isActive = selectedId === a.assetId;
                            const isActiveStatus = String(a.operationalStatus ?? '').toLowerCase() === 'active';
                            return (
                                <tr
                                    key={a.assetId}
                                    onClick={() => onSelect(a.assetId)}
                                    className={cn(
                                        'cursor-pointer transition-colors',
                                        isActive ? 'bg-blue-50 ring-1 ring-inset ring-blue-200' : 'hover:bg-slate-50',
                                    )}
                                    title={`Open ${a.unitNumber}`}
                                >
                                    <td className={cn('px-3 py-3', isActive && 'border-l-2 border-blue-500 pl-2.5')}>
                                        <div className="flex items-center gap-2.5">
                                            <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-sky-100 text-sky-700 shrink-0">
                                                <Truck size={13} />
                                            </span>
                                            <div className="min-w-0">
                                                <div className="text-[12px] font-semibold text-slate-900 truncate">{a.unitNumber}</div>
                                                <div className="text-[10px] text-slate-400 font-mono truncate">{a.make} {a.model} {a.year} · {a.plate}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 text-center">
                                        <div className={cn('inline-flex flex-col items-center gap-0.5 px-2 py-1 rounded-md', tone.pill)}>
                                            <span className="text-[14px] font-black tabular-nums leading-none">{a.overall.toFixed(1)}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider">{a.band}</span>
                                        </div>
                                    </td>
                                    <ScoreBarCell score={a.maintenance} />
                                    <ScoreBarCell score={a.inspections} />
                                    <ScoreBarCell score={a.violations} />
                                    <ScoreBarCell score={a.accidents} />
                                    <ScoreBarCell score={a.vedr} />
                                    <td className="px-3 py-3">
                                        <span className={cn(
                                            'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                            isActiveStatus
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700',
                                        )}>
                                            {a.operationalStatus}
                                        </span>
                                    </td>
                                    <td className="px-2 py-3 text-slate-400"><ChevronRight size={14} /></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Asset detail panel ────────────────────────────────────────────────
function AssetDetailPanel({
    asset, onClose, onOpenProfile,
}: {
    asset: AssetScorecard;
    onClose: () => void;
    onOpenProfile?: () => void;
}) {
    const tone = assetBandTone(asset.band);
    const isActiveStatus = String(asset.operationalStatus ?? '').toLowerCase() === 'active';
    return (
        <div className="mt-4 border border-blue-200 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50/40 to-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-blue-100 bg-blue-50/60">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-sky-100 text-sky-700 shrink-0">
                        <Truck size={18} />
                    </span>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Asset profile</div>
                        <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                            <span className="text-base font-bold text-slate-900 truncate">{asset.unitNumber}</span>
                            <span className="text-[10px] font-mono text-slate-500">{asset.plate}</span>
                            <span className="text-[10px] text-slate-500">{asset.make} {asset.model} {asset.year}</span>
                            <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', tone.pill)}>{asset.band}</span>
                            <span className={cn(
                                'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                isActiveStatus ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                            )}>{asset.operationalStatus}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">{asset.assetCategory}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onOpenProfile && (
                        <button
                            type="button"
                            onClick={onOpenProfile}
                            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-blue-700 border border-blue-600 bg-blue-600 px-2.5 py-1 rounded-md"
                        >
                            View profile <ChevronRight size={11} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded-md bg-white"
                    >
                        Close
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5 px-5 py-5">
                <div className="flex flex-col items-center justify-center">
                    <SafetyRingChart
                        size="large"
                        label="Asset Safety Score"
                        score={asset.overall}
                        palette={asset.band === 'Excellent' ? 'green' : asset.band === 'Good' ? 'blue' : 'auto'}
                        subtitle={`${asset.overall.toFixed(1)} / 100`}
                    />
                    <div className={cn('mt-3 text-[12px] font-bold tabular-nums', asset.delta30d >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {asset.delta30d >= 0 ? '+' : ''}{asset.delta30d.toFixed(2)}
                        <span className="ml-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">vs prior 30d</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-start">
                    {[
                        { label: 'Maintenance', value: asset.maintenance, sub: `${asset.counts.overdueWorkOrders}/${asset.counts.totalWorkOrders} overdue` },
                        { label: 'Inspections', value: asset.inspections, sub: 'roadside outcome' },
                        { label: 'Violations',  value: asset.violations,  sub: `${asset.counts.violations} · ${asset.counts.oos} OOS` },
                        { label: 'Accidents',   value: asset.accidents,   sub: `${asset.counts.accidents} on record` },
                        { label: 'VEDR',        value: asset.vedr,        sub: 'telematics' },
                        { label: 'Status',      value: isActiveStatus ? 100 : 60, sub: asset.operationalStatus },
                    ].map(c => (
                        <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col items-center text-center">
                            <SafetyRingChart label={c.label} score={c.value} palette="green" />
                            <div className={cn('mt-1 text-sm font-bold tabular-nums', getScoreColor(c.value))}>{c.value.toFixed(0)}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
                <KpiTile value={asset.counts.accidents}              label="Accidents"     tone={asset.counts.accidents > 0 ? 'red' : 'slate'} />
                <KpiTile value={asset.counts.violations}             label="Violations"    tone={asset.counts.violations > 0 ? 'amber' : 'slate'} />
                <KpiTile value={asset.counts.oos}                    label="OOS"           tone={asset.counts.oos > 0 ? 'red' : 'slate'} />
                <KpiTile value={asset.counts.vehicleMaintViolations} label="Veh Maint Viol" tone={asset.counts.vehicleMaintViolations > 0 ? 'amber' : 'slate'} />
                <KpiTile value={`${asset.counts.overdueWorkOrders}/${asset.counts.totalWorkOrders}`} label="Overdue WO" tone={asset.counts.overdueWorkOrders > 0 ? 'amber' : 'slate'} />
            </div>

            <div className="px-5 pb-5">
                <AssetComponentBreakdown asset={asset} />
            </div>
        </div>
    );
}

// ── Asset component breakdown ─────────────────────────────────────────
function AssetComponentBreakdown({ asset }: { asset: AssetScorecard }) {
    const components = [
        { id: 'maintenance', label: 'Maintenance',        score: asset.maintenance, weight: 0.25, events: asset.counts.overdueWorkOrders },
        { id: 'inspections', label: 'Roadside inspections', score: asset.inspections, weight: 0.20, events: 0 },
        { id: 'violations',  label: 'Violations',         score: asset.violations,  weight: 0.20, events: asset.counts.violations },
        { id: 'accidents',   label: 'Incidents',          score: asset.accidents,   weight: 0.20, events: asset.counts.accidents },
        { id: 'vedr',        label: 'Telematics / VEDR',  score: asset.vedr,        weight: 0.10, events: 0 },
        { id: 'status',      label: 'Status / readiness', score: String(asset.operationalStatus).toLowerCase() === 'active' ? 95 : 60, weight: 0.05, events: 0 },
    ];
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const colorFor = (score: number) => {
        if (score >= 90) return { bar: 'bg-emerald-500', track: 'bg-emerald-100', txt: 'text-emerald-700' };
        if (score >= 70) return { bar: 'bg-lime-500',    track: 'bg-lime-100',    txt: 'text-lime-700' };
        if (score >= 55) return { bar: 'bg-orange-500',  track: 'bg-orange-100',  txt: 'text-orange-700' };
        return                  { bar: 'bg-red-500',     track: 'bg-red-100',     txt: 'text-red-700' };
    };
    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h4 className="text-sm font-bold text-slate-900">Component breakdown</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Hover a row to see weight and event count.</p>
                </div>
                <div className="text-slate-400" title="Each component contributes a weighted slice of the overall score.">
                    <Info size={14} />
                </div>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden border border-slate-200 mb-4">
                {components.map((c, i) => {
                    const tone = colorFor(c.score);
                    const isHovered = hoverIdx === i;
                    return (
                        <div
                            key={c.id}
                            className={cn('h-full transition-opacity', tone.bar, hoverIdx !== null && !isHovered && 'opacity-40')}
                            style={{ width: `${c.weight * 100}%` }}
                            title={`${c.label} · ×${c.weight.toFixed(2)} · score ${c.score.toFixed(0)}`}
                            onMouseEnter={() => setHoverIdx(i)}
                            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                        />
                    );
                })}
            </div>
            <div className="space-y-2.5">
                {components.map((c, i) => {
                    const tone = colorFor(c.score);
                    const isHovered = hoverIdx === i;
                    return (
                        <div
                            key={c.id}
                            onMouseEnter={() => setHoverIdx(i)}
                            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                            className={cn('grid items-center gap-3 px-1 py-1 rounded transition-colors', isHovered && 'bg-slate-50')}
                            style={{ gridTemplateColumns: '180px 1fr 60px 56px 56px' }}
                        >
                            <span className={cn('text-[12px] font-semibold truncate', isHovered ? 'text-blue-700' : 'text-slate-700')} title={c.label}>{c.label}</span>
                            <div className={cn('h-2 rounded-full overflow-hidden', tone.track)}>
                                <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, c.score)}%` }} />
                            </div>
                            <span className={cn('text-[12px] font-black tabular-nums text-right', tone.txt)}>{c.score.toFixed(1)}</span>
                            <span className="text-[11px] tabular-nums text-slate-400 text-right">×{c.weight.toFixed(2)}</span>
                            <span className={cn('text-[11px] tabular-nums text-right', c.events > 0 ? 'text-slate-700 font-semibold' : 'text-slate-400')}>
                                {c.events} ev
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── Top-level Forecast Analysis view ─────────────────────────────────────
// Forward-looking risk projection driven by the existing carrier ledger.
// Three sections: carrier risk-score forecast (chart + KPI tiles), top
// drivers by crash probability, and top assets by maintenance probability.

const FORECAST_HORIZONS = [
    { id: '1m',  label: '1 month',   months: 1  },
    { id: '2m',  label: '2 months',  months: 2  },
    { id: '3m',  label: '3 months',  months: 3  },
    { id: '6m',  label: '6 months',  months: 6  },
    { id: '12m', label: '1 year',    months: 12 },
    { id: '16m', label: '16 months', months: 16 },
    { id: '18m', label: '18 months', months: 18 },
    { id: '36m', label: '3 years',   months: 36 },
    { id: '60m', label: '5 years',   months: 60 },
] as const;

interface ForecastPreset {
    id: string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    summary: string;
    horizonId: ForecastHorizonId;
    historyId: ForecastHistoryId;
}

const FORECAST_PRESETS: ForecastPreset[] = [
    { id: 'most-accurate',  label: 'Most accurate',     icon: Shield,         summary: 'Tightest confidence band, highest R²',     horizonId: '12m', historyId: '24m' },
    { id: 'next-quarter',   label: 'Next quarter',      icon: Calendar,       summary: '3-month projection · operational planning', horizonId: '3m',  historyId: '12m' },
    { id: 'annual-plan',    label: 'Annual plan',       icon: Shield,         summary: '12-month projection · budget cycle',        horizonId: '12m', historyId: '12m' },
    { id: 'strategic',      label: 'Strategic outlook', icon: TrendingUp,     summary: '3-year projection · long-run mean',         horizonId: '36m', historyId: '36m' },
    { id: 'recent-trend',   label: 'Recent trend',      icon: Activity,       summary: 'Detect changes in the last 90 days',        horizonId: '3m',  historyId: '6m'  },
    { id: 'maintenance',    label: 'Maintenance focus', icon: Truck,          summary: 'High-mileage assets · 6-month maintenance', horizonId: '6m',  historyId: '12m' },
    { id: 'geo',            label: 'Geographic drill-down', icon: MapPin,     summary: 'Per-region analysis (pick jurisdictions in filter bar)', horizonId: '12m', historyId: '12m' },
    { id: 'reset',          label: 'Reset to defaults', icon: SlidersHorizontal, summary: '12mo forecast · 12mo history · all locations', horizonId: '12m', historyId: '12m' },
];
type ForecastHorizonId = (typeof FORECAST_HORIZONS)[number]['id'];

const FORECAST_HISTORY = [
    { id: '6m',  label: '6mo',  months: 6  },
    { id: '12m', label: '12mo', months: 12 },
    { id: '24m', label: '24mo', months: 24 },
    { id: '36m', label: '36mo', months: 36 },
] as const;
type ForecastHistoryId = (typeof FORECAST_HISTORY)[number]['id'];

function ForecastAnalysisView({ accountId }: { accountId?: string }) {
    const id = accountId ?? "acct-001";
    const account = ACCOUNTS_DB.find(a => a.id === id);

    const [horizonId, setHorizonId] = useState<ForecastHorizonId>('12m');
    const [historyId, setHistoryId] = useState<ForecastHistoryId>('12m');
    const horizonMonths = FORECAST_HORIZONS.find(h => h.id === horizonId)?.months ?? 12;
    const historyMonths = FORECAST_HISTORY.find(h => h.id === historyId)?.months ?? 12;

    const forecast = useMemo(
        () => computeCarrierForecast(id, horizonMonths, historyMonths),
        [id, horizonMonths, historyMonths],
    );
    const driverForecasts = useMemo(
        () => computeDriverCrashForecasts(id, horizonMonths),
        [id, horizonMonths],
    );
    const assetForecasts = useMemo(
        () => computeAssetMaintenanceForecasts(id, horizonMonths),
        [id, horizonMonths],
    );
    const maintenanceForecast = useMemo(
        () => computeMaintenanceForecast(id, horizonMonths),
        [id, horizonMonths],
    );

    // Additional UI-only filters that mirror the screenshot. They reset
    // selectively but don't change the underlying scoring (the demo data
    // doesn't differentiate by these axes yet — the controls are wired up so
    // the operator can pick the combination and the back-end can take over).
    const [distance,    setDistance]   = useState<string>('all');
    const [country,     setCountry]    = useState<'all' | 'US' | 'CA'>('all');
    const [jurisdiction, setJurisdiction] = useState<string>('all');
    const [maintTab, setMaintTab] = useState<'all' | 'overdue' | 'due' | 'upcoming'>('all');
    const [maintSearch, setMaintSearch] = useState('');

    const horizonLabel = FORECAST_HORIZONS.find(h => h.id === horizonId)?.label ?? '1 year';

    const trendTone =
        forecast.trend === 'Improving' ? 'text-emerald-600'
      : forecast.trend === 'Degrading' ? 'text-red-600'
      :                                   'text-slate-700';
    const confTone =
        forecast.confidence === 'High'   ? 'text-emerald-600'
      : forecast.confidence === 'Medium' ? 'text-amber-600'
      :                                    'text-red-600';

    return (
        <div className="px-8 py-6 space-y-5">
            {/* Page header */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Risk Forecast</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {account?.legalName ?? 'Carrier'} · forecast {horizonLabel} · history last {historyMonths} months
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* ── Preset cards ───────────────────────────────── */}
                    <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-blue-600 text-white">
                                    <TrendingUp size={12} />
                                </span>
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Forecast guide — pick the right combination</div>
                                    <p className="text-[11px] text-slate-500">One-click presets tune horizon · history · distance · location for a specific question.</p>
                                </div>
                            </div>
                            <button type="button" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline">
                                Show filter glossary ▾
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {FORECAST_PRESETS.map(p => {
                                const Icon = p.icon;
                                const active = horizonId === p.horizonId && historyId === p.historyId && distance === 'all' && country === 'all';
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => {
                                            setHorizonId(p.horizonId);
                                            setHistoryId(p.historyId);
                                            if (p.id === 'reset') {
                                                setDistance('all'); setCountry('all'); setJurisdiction('all');
                                            }
                                        }}
                                        className={cn(
                                            'flex items-start gap-2 px-3 py-2.5 rounded-lg border text-left transition-all',
                                            active
                                                ? 'bg-white border-blue-300 ring-2 ring-blue-200 shadow-sm'
                                                : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm',
                                        )}
                                    >
                                        <span className={cn('h-7 w-7 rounded-md flex items-center justify-center shrink-0', active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>
                                            <Icon size={13} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-[12px] font-bold text-slate-900 truncate">{p.label}</div>
                                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{p.summary}</div>
                                        </div>
                                        <ChevronRight size={12} className="text-slate-400 shrink-0 mt-1" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Forecast filters ───────────────────────────── */}
                    <div className="px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg space-y-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32">
                                <TrendingUp size={11} /> Forecast horizon
                            </span>
                            {FORECAST_HORIZONS.map(h => {
                                const active = horizonId === h.id;
                                return (
                                    <button
                                        key={h.id}
                                        type="button"
                                        onClick={() => setHorizonId(h.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[60px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {h.label}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32">
                                <Calendar size={11} /> History window
                            </span>
                            {FORECAST_HISTORY.map(h => {
                                const active = historyId === h.id;
                                return (
                                    <button
                                        key={h.id}
                                        type="button"
                                        onClick={() => setHistoryId(h.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[50px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {h.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Distance bucket */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32">
                                <Truck size={11} /> Distance bucket
                            </span>
                            {[
                                { id: 'light',     label: 'Light' },
                                { id: 'standard',  label: 'Standard' },
                                { id: 'heavy',     label: 'Heavy' },
                                { id: 'long-haul', label: 'Long-haul' },
                                { id: 'veteran',   label: 'Veteran' },
                            ].map(d => {
                                const active = distance === d.id;
                                return (
                                    <button
                                        key={d.id}
                                        type="button"
                                        onClick={() => setDistance(active ? 'all' : d.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Country */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32">
                                <MapPin size={11} /> Country
                            </span>
                            {(['US', 'CA'] as const).map(c => {
                                const active = country === c;
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCountry(active ? 'all' : c)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[44px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {c}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Jurisdictions */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-32">
                                <Flag size={11} /> Jurisdictions
                            </span>
                            <select
                                value={jurisdiction}
                                onChange={e => setJurisdiction(e.target.value)}
                                className="h-7 px-2.5 pr-7 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                <option value="all">All jurisdictions</option>
                                <option value="ON">Ontario (ON)</option>
                                <option value="AB">Alberta (AB)</option>
                                <option value="BC">British Columbia (BC)</option>
                                <option value="NS">Nova Scotia (NS)</option>
                                <option value="PE">Prince Edward Island (PE)</option>
                                <option value="QC">Quebec (QC)</option>
                            </select>
                        </div>

                        {/* In-scope summary */}
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200 text-[10px] text-slate-500">
                            <span className="font-mono">
                                forecast <span className="font-bold text-slate-700">{horizonLabel}</span> · history last <span className="font-bold text-slate-700">{historyMonths} months</span>
                            </span>
                            <span>
                                <span className="font-bold tabular-nums text-slate-700">{forecast.historyMonths}</span> months of usable history
                            </span>
                        </div>
                    </div>

                    {/* ── KPI tiles ──────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        <ForecastKpi
                            label="NOW"
                            value={forecast.nowScore.toFixed(1)}
                            sub={`${forecast.nowScore > 60 ? 'Critical' : forecast.nowScore > 40 ? 'Conditional' : 'Satisfactory'} · ${forecast.confidence.toLowerCase()} confidence`}
                            valueClass="text-slate-900"
                        />
                        <ForecastKpi
                            label={`IN ${horizonLabel.toUpperCase()}`}
                            value={forecast.horizonScore.toFixed(1)}
                            sub={`${forecast.horizonLower.toFixed(1)} – ${forecast.horizonUpper.toFixed(1)} (80%)`}
                            valueClass={forecast.horizonScore > forecast.nowScore + 2 ? 'text-red-600' : forecast.horizonScore < forecast.nowScore - 2 ? 'text-emerald-600' : 'text-slate-900'}
                        />
                        <ForecastKpi
                            label="TREND"
                            value={
                                <span className={cn('inline-flex items-center gap-1', trendTone)}>
                                    {forecast.trend}
                                    <TrendingUp size={16} className={cn(forecast.trend === 'Improving' && 'rotate-180', forecast.trend === 'Stable' && 'rotate-90')} />
                                </span>
                            }
                            sub={`Slope ${forecast.slope >= 0 ? '+' : ''}${forecast.slope.toFixed(2)} pts/mo`}
                            valueClass={trendTone}
                        />
                        <ForecastKpi
                            label="FIT QUALITY"
                            value={<span>R² <span className="font-black">{forecast.rSquared.toFixed(2)}</span></span>}
                            sub={`σ residual ${forecast.residualStdDev.toFixed(2)}`}
                            valueClass="text-slate-900"
                        />
                        <ForecastKpi
                            label="CONFIDENCE"
                            value={forecast.confidence}
                            sub={`${forecast.historyMonths} months of history`}
                            valueClass={confTone}
                        />
                    </div>

                    {/* ── Risk-score forecast chart ──────────────────── */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Risk-score forecast</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    History {forecast.historyMonths} mo · forecast {horizonMonths} mo · damped toward long-run mean past 36 mo.
                                </p>
                            </div>
                            <div className="text-slate-400" title="Lower risk score = safer carrier.">
                                <Info size={16} />
                            </div>
                        </div>
                        <RiskForecastChart forecast={forecast} />
                    </div>

                    {/* ── Driver crash + Asset maintenance side by side ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {/* Driver crash probability */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Driver crash probability</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Probability of ≥1 serious event in the next {horizonLabel}, ranked by risk.
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                                    {driverForecasts.length} drivers
                                </span>
                            </div>
                            <ProbabilityList
                                rows={driverForecasts.slice(0, 10).map(d => ({
                                    primary: d.name,
                                    secondary: d.licenseNumber,
                                    probability: d.probability,
                                    band: d.band,
                                    footer: `${d.accidentsLast12mo} A · ${d.oosLast12mo} OOS · ${d.eventsLast12mo} events (12mo)`,
                                    factors: d.factors,
                                }))}
                                emptyMessage="No driver crash forecast available."
                            />
                        </div>

                        {/* Asset maintenance probability */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Asset maintenance probability</h3>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Probability of a maintenance-driven OOS / breakdown in the next {horizonLabel}.
                                    </p>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                                    {assetForecasts.length} assets
                                </span>
                            </div>
                            <ProbabilityList
                                rows={assetForecasts.slice(0, 10).map(a => ({
                                    primary: a.unitNumber,
                                    secondary: `${a.make} ${a.model} ${a.year}`,
                                    probability: a.probability,
                                    band: a.band,
                                    footer: `${a.overdueWorkOrders} overdue WO · ${a.vehicleMaintViolations} veh-maint viol · last svc ${a.daysSinceLastService}d ago`,
                                    factors: a.factors,
                                }))}
                                emptyMessage="No asset maintenance forecast available."
                            />
                        </div>
                    </div>

                    {/* ── Maintenance cost by category (donut) ─────────── */}
                    <MaintenanceCostDonut forecast={maintenanceForecast} horizonLabel={horizonLabel} />

                    {/* ── Vehicle maintenance forecast (table) ─────────── */}
                    <VehicleMaintenanceForecastTable
                        forecast={maintenanceForecast}
                        carrierId={id}
                        horizonLabel={horizonLabel}
                        tab={maintTab}
                        onTabChange={setMaintTab}
                        search={maintSearch}
                        onSearchChange={setMaintSearch}
                    />
                </div>
            </div>
        </div>
    );
}

function ForecastKpi({
    label, value, sub, valueClass,
}: {
    label: string;
    value: React.ReactNode;
    sub: string;
    valueClass?: string;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</div>
            <div className={cn('text-xl font-black leading-tight tabular-nums', valueClass ?? 'text-slate-900')}>{value}</div>
            <div className="text-[10px] text-slate-500 mt-1">{sub}</div>
        </div>
    );
}

function RiskForecastChart({ forecast }: { forecast: CarrierForecast }) {
    const W = 720, H = 260, padL = 40, padR = 16, padT = 12, padB = 28;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const pts = forecast.points;
    if (pts.length === 0) {
        return <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">No history to forecast from.</div>;
    }
    // Y axis 0 - 100 fixed (risk score).
    const y = (v: number) => padT + innerH * (1 - v / 100);
    const x = (i: number) => padL + (pts.length <= 1 ? innerW / 2 : (innerW * i) / (pts.length - 1));

    // Build history line + forecast line (separate paths so we can style them differently).
    const histPts = pts.filter(p => !p.isForecast);
    const fcastPts = pts.filter(p => p.isForecast);
    const histPath = histPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(pts.indexOf(p)).toFixed(1)} ${y(p.riskScore).toFixed(1)}`).join(' ');
    // Connect last history point to first forecast point.
    const lastHistIdx = histPts.length - 1;
    const fcastPath = fcastPts.length > 0
        ? `M ${x(lastHistIdx).toFixed(1)} ${y(histPts[lastHistIdx].riskScore).toFixed(1)} ` +
            fcastPts.map(p => `L ${x(pts.indexOf(p)).toFixed(1)} ${y(p.riskScore).toFixed(1)}`).join(' ')
        : '';
    // Confidence band: upper edge → lower edge reverse.
    const bandPath = fcastPts.length > 0
        ? `M ${x(lastHistIdx).toFixed(1)} ${y(histPts[lastHistIdx].riskScore).toFixed(1)} ` +
            fcastPts.map(p => `L ${x(pts.indexOf(p)).toFixed(1)} ${y(p.upper ?? p.riskScore).toFixed(1)}`).join(' ') +
            ' ' + [...fcastPts].reverse().map(p => `L ${x(pts.indexOf(p)).toFixed(1)} ${y(p.lower ?? p.riskScore).toFixed(1)}`).join(' ') +
            ` L ${x(lastHistIdx).toFixed(1)} ${y(histPts[lastHistIdx].riskScore).toFixed(1)} Z`
        : '';

    // Tick stride for x labels.
    const xStride = Math.max(1, Math.ceil(pts.length / 7));
    // Threshold lines — show 25 / 50 / 75 / 85 as reference (band cutoffs).
    const thresholds = [
        { v: 85, color: '#0d9488', label: '' }, // tealish
        { v: 70, color: '#84cc16', label: '' },
        { v: 55, color: '#f97316', label: '' },
        { v: 35, color: '#94a3b8', label: '' },
    ];

    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cursorX = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0, bestD = Infinity;
        for (let i = 0; i < pts.length; i++) {
            const d = Math.abs(x(i) - cursorX);
            if (d < bestD) { bestD = d; best = i; }
        }
        setHoverIdx(best);
    };

    const hovered = hoverIdx != null ? pts[hoverIdx] : null;

    return (
        <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }} onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {/* Y gridlines */}
                {[0, 25, 50, 75, 100].map(v => (
                    <g key={v}>
                        <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={v === 0 ? '0' : '2 3'} />
                        <text x={padL - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill="#94a3b8" fontWeight="600">{v}</text>
                    </g>
                ))}
                {/* Threshold reference lines */}
                {thresholds.map(t => (
                    <line key={t.v} x1={padL} x2={W - padR} y1={y(t.v)} y2={y(t.v)} stroke={t.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
                ))}
                {/* Forecast confidence band */}
                {bandPath && <path d={bandPath} fill="#3b82f6" fillOpacity={0.10} />}
                {/* History line */}
                {histPath && <path d={histPath} fill="none" stroke="#0f172a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
                {/* Forecast line — dashed blue */}
                {fcastPath && <path d={fcastPath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />}
                {/* Forecast points */}
                {fcastPts.map(p => {
                    const i = pts.indexOf(p);
                    const isHovered = hoverIdx === i;
                    return (
                        <circle key={p.date} cx={x(i)} cy={y(p.riskScore)} r={isHovered ? 5 : 3} fill="white" stroke="#3b82f6" strokeWidth={2} />
                    );
                })}
                {/* Hover vertical line */}
                {hovered && (
                    <line x1={x(hoverIdx!)} x2={x(hoverIdx!)} y1={padT} y2={padT + innerH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                )}
                {/* X labels */}
                {pts.map((p, i) => {
                    if (i % xStride !== 0 && i !== pts.length - 1) return null;
                    return (
                        <text key={`xl-${p.date}`} x={x(i)} y={H - padB / 2 + 6} fontSize="9" textAnchor="middle" fill={i === 0 || i === pts.length - 1 ? '#3b82f6' : '#94a3b8'} fontWeight="600">
                            {p.date.slice(0, 7)}
                        </text>
                    );
                })}
            </svg>

            {hovered && (() => {
                const left = (x(hoverIdx!) / W) * 100;
                const flip = left > 65;
                return (
                    <div
                        className="pointer-events-none absolute z-10"
                        style={{
                            left:  flip ? 'auto' : `calc(${left}% + 10px)`,
                            right: flip ? `calc(${100 - left}% + 10px)` : 'auto',
                            top:   8,
                        }}
                    >
                        <div className="bg-slate-900 text-white rounded-lg shadow-lg px-3 py-2 min-w-[160px]">
                            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1">
                                {hovered.date.slice(0, 7)} {hovered.isForecast && <span className="ml-1 text-blue-300">· Forecast</span>}
                            </div>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-[10px] text-slate-300">Risk score</span>
                                <span className="text-lg font-black tabular-nums text-blue-300">{hovered.riskScore.toFixed(1)}</span>
                            </div>
                            {hovered.isForecast && hovered.lower != null && hovered.upper != null && (
                                <div className="mt-1 text-[10px] text-slate-400">
                                    80% interval {hovered.lower.toFixed(1)} – {hovered.upper.toFixed(1)}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

interface ProbabilityRow {
    primary: string;
    secondary: string;
    probability: number;
    band: 'Low' | 'Moderate' | 'High' | 'Critical';
    footer: string;
    factors?: import("./fleet-safety-score.data").ForecastFactor[];
}

function ProbabilityList({ rows, emptyMessage }: { rows: ProbabilityRow[]; emptyMessage: string }) {
    if (rows.length === 0) {
        return <div className="px-4 py-8 text-center text-xs text-slate-400">{emptyMessage}</div>;
    }
    return (
        <ol className="divide-y divide-slate-100">
            {rows.map((r, i) => {
                const tone =
                    r.band === 'Critical' ? { pill: 'bg-red-100 text-red-700',     bar: 'bg-red-500',     txt: 'text-red-700' }
                  : r.band === 'High'     ? { pill: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500', txt: 'text-orange-700' }
                  : r.band === 'Moderate' ? { pill: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500',   txt: 'text-amber-700' }
                  :                         { pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', txt: 'text-emerald-700' };
                const pct = r.probability * 100;
                return (
                    <li
                        key={`${r.primary}-${i}`}
                        className="group relative px-4 py-3 flex items-center gap-3 hover:bg-slate-50"
                    >
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums w-5 shrink-0">#{i + 1}</span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[12px] font-bold text-slate-900 truncate">{r.primary}</span>
                                <span className="text-[10px] font-mono text-slate-400 truncate">{r.secondary}</span>
                            </div>
                            <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 truncate">{r.footer}</div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <span className={cn('text-[14px] font-black tabular-nums', tone.txt)}>
                                {pct.toFixed(1)}%
                            </span>
                            <span className={cn('mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider', tone.pill)}>
                                {r.band}
                            </span>
                        </div>
                        {r.factors && r.factors.length > 0 && (
                            <ForecastFactorPopover
                                title={r.primary}
                                subtitle={r.secondary}
                                probabilityPct={pct}
                                band={r.band}
                                factors={r.factors}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

function ForecastFactorPopover({
    title, subtitle, probabilityPct, band, factors,
}: {
    title: string;
    subtitle: string;
    probabilityPct: number;
    band: 'Low' | 'Moderate' | 'High' | 'Critical';
    factors: import("./fleet-safety-score.data").ForecastFactor[];
}) {
    const bandTone =
        band === 'Critical' ? 'text-red-300'
      : band === 'High'     ? 'text-orange-300'
      : band === 'Moderate' ? 'text-amber-300'
      :                       'text-emerald-300';
    return (
        <div
            className="pointer-events-none absolute z-30 right-3 top-full mt-1 w-80 max-w-[22rem]
                       opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0
                       transition duration-150
                       bg-slate-900 text-white rounded-lg shadow-2xl ring-1 ring-slate-700
                       p-3"
            role="tooltip"
        >
            <div className="flex items-start justify-between gap-3 pb-2 mb-2 border-b border-slate-700">
                <div className="min-w-0">
                    <div className="text-[11px] font-bold truncate">{title}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{subtitle}</div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-[14px] font-black tabular-nums">{probabilityPct.toFixed(1)}%</div>
                    <div className={cn('text-[9px] font-bold uppercase tracking-wider', bandTone)}>{band}</div>
                </div>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Why this number
            </div>
            <ul className="space-y-1.5">
                {factors.map((f, idx) => (
                    <li key={idx} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-100 truncate">{f.label}</div>
                            {f.detail && (
                                <div className="text-[10px] text-slate-400 leading-tight">{f.detail}</div>
                            )}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-slate-200 shrink-0">
                            {f.impact}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Maintenance cost by category (donut) ────────────────────────────────
function MaintenanceCostDonut({
    forecast, horizonLabel,
}: {
    forecast: import("./fleet-safety-score.data").MaintenanceForecast;
    horizonLabel: string;
}) {
    const slices = forecast.byCategory.map(c => ({
        id: c.label, label: c.label, value: c.cost, color: c.color,
    }));
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Maintenance cost by category</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        Forecast spend over {horizonLabel} · <span className="font-bold text-slate-700">${forecast.totalCost.toLocaleString()}</span> across {forecast.totalItems.toLocaleString()} items.
                    </p>
                </div>
                <div className="text-slate-400">
                    <Info size={16} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-6 items-center">
                <div className="mx-auto md:mx-0">
                    <DonutChart title="" slices={slices} size={200} thickness={36} bare />
                </div>
                <div className="min-w-0">
                    <div
                        className="hidden sm:grid items-center gap-3 px-1 pb-1.5 mb-1 border-b border-slate-100
                                   text-[9px] font-bold uppercase tracking-wider text-slate-400"
                        style={{ gridTemplateColumns: '14px minmax(0,1fr) 44px 80px 52px' }}
                    >
                        <span />
                        <span>Category</span>
                        <span className="text-right">Items</span>
                        <span className="text-right">Cost</span>
                        <span className="text-right">Share</span>
                    </div>
                    <ul className="space-y-1.5">
                        {forecast.byCategory.map(c => {
                            const pct = forecast.totalCost > 0 ? (c.cost / forecast.totalCost) * 100 : 0;
                            return (
                                <li
                                    key={c.label}
                                    className="grid items-center gap-3 px-1 py-1 rounded hover:bg-slate-50"
                                    style={{ gridTemplateColumns: '14px minmax(0,1fr) 44px 80px 52px' }}
                                >
                                    <span className="h-3 w-3 rounded shrink-0" style={{ background: c.color }} />
                                    <span className="text-[12px] font-semibold text-slate-700 truncate" title={c.label}>
                                        {c.label}
                                    </span>
                                    <span className="text-[11px] text-slate-500 text-right tabular-nums">{c.itemCount}</span>
                                    <span className="text-[12px] font-bold text-slate-900 tabular-nums text-right">${c.cost.toLocaleString()}</span>
                                    <span className="text-[11px] text-slate-400 text-right tabular-nums">{pct.toFixed(1)}%</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}

// ── Vehicle maintenance forecast (table) ────────────────────────────────
function VehicleMaintenanceForecastTable({
    forecast, carrierId, horizonLabel, tab, onTabChange, search, onSearchChange,
}: {
    forecast: import("./fleet-safety-score.data").MaintenanceForecast;
    carrierId: string;
    horizonLabel: string;
    tab: 'all' | 'overdue' | 'due' | 'upcoming';
    onTabChange: (t: 'all' | 'overdue' | 'due' | 'upcoming') => void;
    search: string;
    onSearchChange: (q: string) => void;
}) {
    const counts = useMemo(() => ({
        all: forecast.rows.length,
        overdue:  forecast.rows.filter(r => r.status === 'overdue').length,
        due:      forecast.rows.filter(r => r.status === 'due').length,
        upcoming: forecast.rows.filter(r => r.status === 'upcoming' || r.status === 'in_progress').length,
    }), [forecast]);

    const filtered = useMemo(() => {
        let rows = forecast.rows;
        if (tab === 'overdue')  rows = rows.filter(r => r.status === 'overdue');
        if (tab === 'due')      rows = rows.filter(r => r.status === 'due');
        if (tab === 'upcoming') rows = rows.filter(r => r.status === 'upcoming' || r.status === 'in_progress');
        const q = search.trim().toLowerCase();
        if (q) rows = rows.filter(r =>
            r.assetId.toLowerCase().includes(q)
            || r.serviceLabel.toLowerCase().includes(q)
            || r.taskId.toLowerCase().includes(q));
        return rows;
    }, [forecast, tab, search]);

    const statusTone = (s: import("./fleet-safety-score.data").MaintenanceForecastRow["status"]) =>
        s === 'overdue'     ? 'bg-rose-100 text-rose-700 border-rose-200'
      : s === 'due'         ? 'bg-amber-100 text-amber-700 border-amber-200'
      : s === 'in_progress' ? 'bg-violet-100 text-violet-700 border-violet-200'
      : s === 'upcoming'    ? 'bg-blue-100 text-blue-700 border-blue-200'
      :                       'bg-slate-100 text-slate-600 border-slate-200';

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-slate-500" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Vehicle maintenance forecast</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {filtered.length} of {forecast.totalItems} items in the next {horizonLabel} · carrier {carrierId}
                        </p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2">
                    {([
                        { id: 'all',      label: 'All',      count: counts.all },
                        { id: 'overdue',  label: 'Overdue',  count: counts.overdue },
                        { id: 'due',      label: 'Due',      count: counts.due },
                        { id: 'upcoming', label: 'Upcoming', count: counts.upcoming },
                    ] as const).map(t => {
                        const active = tab === t.id;
                        return (
                            <button key={t.id} type="button" onClick={() => onTabChange(t.id)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                    active
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                )}>
                                {t.label}
                                <span className={cn('inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] tabular-nums font-bold',
                                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600')}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="px-4 py-3 border-b border-slate-200">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Search by asset, service type, or task id…"
                        className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 bg-white"
                    />
                </div>
            </div>
            <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                            {['Asset','Service','Status','Predicted Due','Days','Σ','Est. Cost','Method','Confidence'].map(h => (
                                <th key={h} className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 && (
                            <tr><td colSpan={9} className="px-4 py-8 text-center text-xs text-slate-400">No maintenance items match the current filters.</td></tr>
                        )}
                        {filtered.map(r => {
                            const confTone =
                                r.confidence === 'High'   ? 'text-emerald-600'
                              : r.confidence === 'Medium' ? 'text-amber-600'
                              :                              'text-red-600';
                            const daysTone = r.days < 0 ? 'text-red-600 font-bold' : r.days < 7 ? 'text-amber-600 font-bold' : 'text-slate-700';
                            return (
                                <tr key={r.taskId} className="hover:bg-slate-50">
                                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">{r.assetId}</td>
                                    <td className="px-3 py-2.5">{r.serviceLabel}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap', statusTone(r.status))}>
                                            {r.status === 'in_progress' ? 'In Progress' : r.status[0].toUpperCase() + r.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 font-mono text-[11px]">{r.predictedDue}</td>
                                    <td className={cn('px-3 py-2.5 tabular-nums', daysTone)}>{r.days}</td>
                                    <td className="px-3 py-2.5">
                                        <span className={cn(
                                            'inline-flex items-center justify-center min-w-[28px] h-6 px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                                            r.severity >= 9 ? 'bg-rose-100 text-rose-700'
                                          : r.severity >= 6 ? 'bg-amber-100 text-amber-700'
                                          :                    'bg-slate-100 text-slate-600',
                                        )}>
                                            {r.severity}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 font-bold tabular-nums">${r.estCost.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{r.method}</td>
                                    <td className={cn('px-3 py-2.5 font-bold', confTone)}>{r.confidence}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Top-level Accidents Analysis view ───────────────────────────────────
// Mirrors the Violations Analysis layout — history-window scope at the top,
// then KPI tiles, then donuts, then list-only filters above the table.
function AccidentsAnalysisView({ accountId }: { accountId?: string }) {
    const id = accountId ?? "acct-001";
    const allAccidents = useMemo(() => getAccidentsForCarrier(id), [id]);
    // Geographic distribution — unfiltered carrier-wide accident footprint.
    const geoStats = useMemo(() => aggregateGeoStats(
        allAccidents,
        (a: any) => a?.location?.stateOrProvince,
        (a: any) => a?.location?.country,
        () => false, // accidents don't carry an isOos flag at the row level
        (a: any) => ((a?.severity?.fatalities ?? 0) * 10)
                  + ((a?.severity?.injuriesNonFatal ?? 0) * 4)
                  + (a?.severity?.towAway ? 2 : 0)
                  + 1,
    ), [allAccidents]);

    // ── History window ─────────────────────────────────────────────────
    const [windowId, setWindowId] = useState<TimeWindowId>('12mo');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const applyWindowPreset = (w: TimeWindowId) => {
        setWindowId(w);
        if (w === 'all' || w === 'custom') return;
        const days = TIME_WINDOW_PRESETS.find(p => p.id === w)?.days ?? 365;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        setDateFrom(iso(start));
        setDateTo(iso(end));
    };

    const windowedAccidents = useMemo(() => {
        if (windowId === 'all') return allAccidents;
        if (windowId === 'custom' && !dateFrom && !dateTo) return allAccidents;
        return allAccidents.filter(a => {
            const d = (a?.occurredAt ?? '').slice(0, 10);
            if (!d) return false;
            if (dateFrom && d < dateFrom) return false;
            if (dateTo   && d > dateTo)   return false;
            return true;
        });
    }, [allAccidents, windowId, dateFrom, dateTo]);

    // ── Severity filter (acts on the list only) ────────────────────────
    type SevFilter = 'all' | 'hazmat' | 'tow' | 'injuries' | 'fatalities';
    const [sev, setSev] = useState<SevFilter>('all');

    const sevCounts = useMemo(() => ({
        all:        windowedAccidents.length,
        hazmat:     windowedAccidents.filter(a => !!a?.severity?.hazmatReleased).length,
        tow:        windowedAccidents.filter(a => !!a?.severity?.towAway).length,
        injuries:   windowedAccidents.filter(a => (a?.severity?.injuriesNonFatal ?? 0) > 0).length,
        fatalities: windowedAccidents.filter(a => (a?.severity?.fatalities      ?? 0) > 0).length,
    }), [windowedAccidents]);

    // Preventability filter
    type PrevFilter = 'all' | 'preventable' | 'non_preventable' | 'tbd';
    const [prevention, setPrevention] = useState<PrevFilter>('all');

    // Free-text search
    const [search, setSearch] = useState('');

    // ── Final list (severity + preventability + search) ────────────────
    const sevRows = useMemo(() => {
        if (sev === 'all')        return windowedAccidents;
        if (sev === 'hazmat')     return windowedAccidents.filter(a => !!a?.severity?.hazmatReleased);
        if (sev === 'tow')        return windowedAccidents.filter(a => !!a?.severity?.towAway);
        if (sev === 'injuries')   return windowedAccidents.filter(a => (a?.severity?.injuriesNonFatal ?? 0) > 0);
        if (sev === 'fatalities') return windowedAccidents.filter(a => (a?.severity?.fatalities      ?? 0) > 0);
        return windowedAccidents;
    }, [windowedAccidents, sev]);

    const finalRows = useMemo(() => {
        let rows = sevRows;
        if (prevention !== 'all') {
            rows = rows.filter(a => (a?.preventability?.value ?? 'tbd') === prevention);
        }
        const q = search.trim().toLowerCase();
        if (q) {
            rows = rows.filter(a => {
                const hay = [
                    a.incidentId, a.driver?.name, a.driver?.driverId,
                    a.location?.city, a.location?.stateOrProvince, a.location?.country, a.location?.full,
                    a.cause?.primaryCause, a.cause?.incidentType,
                    a.status?.label,
                    a.vehicles?.[0]?.licenseNumber, a.vehicles?.[0]?.assetId,
                ].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(q);
            });
        }
        return rows;
    }, [sevRows, prevention, search]);

    const sortedRows = useMemo(
        () => [...finalRows].sort((a, b) => String(b?.occurredAt ?? '').localeCompare(String(a?.occurredAt ?? ''))),
        [finalRows],
    );

    // ── KPI tiles ──────────────────────────────────────────────────────
    const total = windowedAccidents.length;
    const preventableCount = windowedAccidents.filter(a => a?.preventability?.isPreventable === true).length;
    const preventablePct = total > 0 ? Math.round((preventableCount / total) * 100) : 0;
    const injuriesFatal = windowedAccidents.reduce((s, a) => s + ((a?.severity?.fatalities ?? 0) + (a?.severity?.injuriesNonFatal ?? 0)), 0);
    const totalCost = windowedAccidents.reduce((s, a) => s + (a?.costs?.totalAccidentCosts ?? 0), 0);

    // ── Donuts: By Severity + By Jurisdiction ──────────────────────────
    const severitySlices: DonutSlice[] = useMemo(() => [
        { id: 'fatalities', label: 'Fatalities', value: sevCounts.fatalities, color: '#dc2626' },
        { id: 'injuries',   label: 'Injuries',   value: sevCounts.injuries,   color: '#f97316' },
        { id: 'tow',        label: 'Tow Away',   value: sevCounts.tow,        color: '#f59e0b' },
        { id: 'hazmat',     label: 'Hazmat',     value: sevCounts.hazmat,     color: '#8b5cf6' },
    ].filter(s => s.value > 0), [sevCounts]);

    const jurisdictionSlices: DonutSlice[] = useMemo(() => {
        const counts = new Map<string, number>();
        for (const a of windowedAccidents) {
            const country = String(a?.location?.country ?? '').toUpperCase();
            const state = String(a?.location?.stateOrProvince ?? '').toUpperCase();
            const isCA = country === 'CA' || country === 'CANADA';
            const key = !isCA ? 'US' : (state === 'ON' ? 'ON' : state || 'CA');
            counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        const palette = ['#3b82f6','#10b981','#ef4444','#f59e0b','#8b5cf6','#ec4899','#06b6d4'];
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([label, value], i) => ({
            id: label, label: label === 'US' ? 'United States' : label === 'ON' ? 'Ontario · CVOR' : `NSC · ${label}`,
            value, color: palette[i % palette.length],
        }));
    }, [windowedAccidents]);

    // Pagination + selection
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    useEffect(() => { setPage(1); }, [sev, prevention, search, windowId, dateFrom, dateTo]);
    const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    useEffect(() => { setSelectedIdx(null); }, [sev, prevention, search, page]);
    const selected = selectedIdx != null ? visibleRows[selectedIdx] : null;

    const account = ACCOUNTS_DB.find(a => a.id === id);

    return (
        <div className="px-8 py-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Page header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Accidents Analysis</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {account?.legalName ?? 'Carrier'} · {allAccidents.length.toLocaleString()} records on file
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {/* ── Top filter: History window only ──────────────── */}
                    <div className="mb-5 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Calendar size={13} />
                            <span className="font-bold uppercase tracking-wider">History window</span>
                        </div>
                        <div className="inline-flex items-center gap-1 flex-wrap">
                            {TIME_WINDOW_PRESETS.map(p => {
                                const active = windowId === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => applyWindowPreset(p.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[40px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => applyWindowPreset('all')}
                                className={cn(
                                    'inline-flex items-center justify-center min-w-[40px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                    windowId === 'all'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                )}
                            >
                                all
                            </button>
                        </div>
                        <div className="inline-flex items-center gap-2 ml-auto">
                            <input
                                type="date"
                                value={dateFrom}
                                max={dateTo || undefined}
                                onChange={e => { setDateFrom(e.target.value); setWindowId('custom'); }}
                                className="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                            <span className="text-slate-400">→</span>
                            <input
                                type="date"
                                value={dateTo}
                                min={dateFrom || undefined}
                                onChange={e => { setDateTo(e.target.value); setWindowId('custom'); }}
                                className="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            />
                        </div>
                        <div className="w-full text-[10px] text-slate-500">
                            <span className="font-bold tabular-nums text-slate-700">{windowedAccidents.length.toLocaleString()}</span> of {allAccidents.length.toLocaleString()} accidents in scope
                            {windowId !== 'all' && dateFrom && dateTo && (
                                <span className="text-slate-400"> · {dateFrom} → {dateTo}</span>
                            )}
                        </div>
                    </div>

                    {/* ── KPI tiles ────────────────────────────────────── */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <KpiTile value={total.toLocaleString()}                                          label="Total Incidents" />
                        <KpiTile value={<span>{preventableCount} <span className="text-amber-500 text-base">({preventablePct}%)</span></span>} label="Preventable" tone="amber" />
                        <KpiTile value={injuriesFatal.toLocaleString()}                                  label="Injuries / Fatal" tone="red" />
                        <KpiTile value={fmtMoney(totalCost)}                                             label="Total Cost" />
                    </div>

                    {/* ── Donut charts: severity + jurisdiction ───────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                        <DonutChart
                            title="By Severity"
                            subtitle="Fatal / Injury / Tow / Hazmat"
                            slices={severitySlices}
                            activeId={sev === 'all' ? undefined : sev}
                            onSliceClick={(idVal) => setSev(sev === idVal ? 'all' : idVal as SevFilter)}
                        />
                        <DonutChart
                            title="By Jurisdiction"
                            subtitle="Where the incident occurred"
                            slices={jurisdictionSlices}
                        />
                    </div>

                    {/* ── Geographic distribution (collapsed by default) ──── */}
                    <GeographicDistributionPanel
                        stats={geoStats}
                        subtitle="Accident hotspots by state / province — choropleth + bubble overlay."
                    />

                    {/* ── List filters ────────────────────────────────── */}
                    <div className="mb-3 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                            <SlidersHorizontal size={13} />
                            <span>List filters</span>
                        </div>
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search driver, ID, location, cause…"
                                className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 bg-white"
                            />
                        </div>

                        <div className="inline-flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Severity</span>
                            <RiskChip active={sev === 'all'}        onClick={() => setSev('all')}        dot="bg-slate-400"   label="All"        count={sevCounts.all} />
                            <RiskChip active={sev === 'fatalities'} onClick={() => setSev('fatalities')} dot="bg-red-500"     label="Fatalities" count={sevCounts.fatalities} />
                            <RiskChip active={sev === 'injuries'}   onClick={() => setSev('injuries')}   dot="bg-orange-500"  label="Injuries"   count={sevCounts.injuries} />
                            <RiskChip active={sev === 'tow'}        onClick={() => setSev('tow')}        dot="bg-amber-500"   label="Tow Away"   count={sevCounts.tow} />
                            <RiskChip active={sev === 'hazmat'}     onClick={() => setSev('hazmat')}     dot="bg-violet-500"  label="Hazmat"     count={sevCounts.hazmat} />
                        </div>

                        <div className="inline-flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Preventable</span>
                            <select
                                value={prevention}
                                onChange={e => setPrevention(e.target.value as PrevFilter)}
                                className="h-8 px-2.5 pr-7 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                                <option value="all">All</option>
                                <option value="preventable">Preventable</option>
                                <option value="non_preventable">Non-preventable</option>
                                <option value="tbd">TBD</option>
                            </select>
                        </div>

                        <div className="ml-auto text-[10px] text-slate-500 whitespace-nowrap">
                            <span className="font-bold tabular-nums text-slate-700">{finalRows.length.toLocaleString()}</span> result{finalRows.length === 1 ? '' : 's'}
                            {(sev !== 'all' || prevention !== 'all' || search.trim()) && (
                                <button
                                    type="button"
                                    onClick={() => { setSev('all'); setPrevention('all'); setSearch(''); }}
                                    className="ml-2 font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── Table ───────────────────────────────────────── */}
                    <DataTable
                        head={['ID','Date','Driver','Location','Inj/Fatal','Tow','Hazmat','Preventable','Cost','Status']}
                        rows={visibleRows.map((a: any) => {
                            const inj = (a?.severity?.fatalities ?? 0) + (a?.severity?.injuriesNonFatal ?? 0);
                            const statusLabel = a?.status?.label ?? '—';
                            const statusTone =
                                /active/i.test(statusLabel)   ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : /open/i.test(statusLabel)     ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : /review/i.test(statusLabel)   ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              : /closed/i.test(statusLabel)   ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              :                                  'bg-slate-100 text-slate-600 border border-slate-200';
                            const cityState = [a?.location?.city, a?.location?.stateOrProvince].filter(Boolean).join(', ') || '—';
                            return [
                                <span className="font-mono text-[10px] text-slate-500" title={a?.incidentId}>{a?.incidentId ?? '—'}</span>,
                                <div className="leading-tight whitespace-nowrap">
                                    <div className="text-[11px] font-semibold text-slate-700">{fmtDateLong((a?.occurredAt ?? '').slice(0, 10))}</div>
                                </div>,
                                <div className="min-w-0 max-w-[180px]">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={12} className="text-slate-400 shrink-0" />
                                        <span className="text-[11px] font-semibold text-slate-700 truncate" title={a?.driver?.name}>{a?.driver?.name ?? '—'}</span>
                                    </div>
                                    {a?.driver?.driverId && (
                                        <div className="text-[10px] text-slate-400 font-mono ml-[18px] truncate">{a.driver.driverId}</div>
                                    )}
                                </div>,
                                <div className="min-w-0 max-w-[160px]">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={12} className="text-slate-400 shrink-0" />
                                        <span className="text-[11px] text-slate-700 truncate" title={cityState}>{cityState}</span>
                                    </div>
                                </div>,
                                <span className={inj > 0 ? 'text-red-600 font-bold tabular-nums text-[11px]' : 'text-slate-400 text-[11px]'}>{inj > 0 ? inj : '—'}</span>,
                                <YesNoBadge value={!!a?.severity?.towAway} />,
                                <YesNoBadge value={!!a?.severity?.hazmatReleased} />,
                                <PreventableBadge value={a?.preventability?.value ?? null} />,
                                <span className="font-bold tabular-nums text-[11px]">{fmtMoney(a?.costs?.totalAccidentCosts ?? 0)}</span>,
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap', statusTone)}>{statusLabel}</span>,
                            ];
                        })}
                        emptyMessage="No accidents match the current filters."
                        selectedIndex={selectedIdx}
                        onSelectRow={(i) => setSelectedIdx(selectedIdx === i ? null : i)}
                        pagination={{ page, pageSize, totalRows: sortedRows.length, onPageChange: setPage, onPageSizeChange: setPageSize }}
                    />

                    {selected && (
                        <RowDetailPanel
                            title={selected.incidentId ?? 'Incident'}
                            registration={(selected.occurredAt ?? '').slice(0, 10)}
                            statusBadge={
                                (selected.severity?.fatalities ?? 0) > 0
                                    ? { label: 'Fatal',         tone: 'alert' }
                                  : (selected.severity?.injuriesNonFatal ?? 0) > 0
                                    ? { label: 'Injury',        tone: 'warn'  }
                                  : selected.severity?.towAway
                                    ? { label: 'Tow Away',      tone: 'warn'  }
                                  : { label: 'Property Damage', tone: 'info' }
                            }
                            fields={[
                                { label: 'Driver',          value: selected.driver?.name },
                                { label: 'Driver Type',     value: selected.driver?.driverType },
                                { label: 'License',         value: selected.driver?.license },
                                { label: 'Asset',           value: selected.vehicles?.[0]?.licenseNumber ?? selected.vehicles?.[0]?.assetId },
                                { label: 'Make / Model',    value: `${selected.vehicles?.[0]?.make ?? ''} ${selected.vehicles?.[0]?.model ?? ''} ${selected.vehicles?.[0]?.year ?? ''}`.trim() || '—' },
                                { label: 'Location',        value: selected.location?.full ?? `${selected.location?.city ?? ''}, ${selected.location?.stateOrProvince ?? ''}` },
                                { label: 'Country',         value: selected.location?.country },
                                { label: 'Cause',           value: selected.cause?.primaryCause },
                                { label: 'Accident Type',   value: selected.cause?.incidentType },
                                { label: 'Fatalities',      value: selected.severity?.fatalities ?? 0 },
                                { label: 'Injuries',        value: selected.severity?.injuriesNonFatal ?? 0 },
                                { label: 'Tow Away',        value: selected.severity?.towAway ? 'Yes' : 'No' },
                                { label: 'Hazmat Released', value: selected.severity?.hazmatReleased ? 'Yes' : 'No' },
                                { label: 'Preventability',  value: selected.preventability?.value },
                                { label: 'Status',          value: selected.status?.label },
                                { label: 'Police Report',   value: selected.references?.policeReportNumber },
                                { label: 'Insurance',       value: selected.insurance?.carrierName },
                                { label: 'Total Cost',      value: fmtMoney(selected.costs?.totalAccidentCosts ?? 0) },
                            ]}
                            onClose={() => setSelectedIdx(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Top-level Violations Analysis view ──────────────────────────────────
// Carrier-scoped violation log with three stacked filters (source / category
// / risk) — matches the Violations List page filter UX.
function ViolationsAnalysisView({ accountId }: { accountId?: string }) {
    const id = accountId ?? "acct-001";
    const allViolations = useMemo(() => getViolationsForCarrier(id), [id]);
    const violationBreakdown = useMemo(() => computeViolationScoreBreakdown(id), [id]);
    // Geographic distribution — reflects the *unfiltered* carrier ledger so
    // the map always shows the full operating footprint, regardless of the
    // active filters below.
    const geoStats = useMemo(() => aggregateGeoStats(
        allViolations,
        (v: any) => v?.locationState,
        (v: any) => v?.locationCountry,
        (v: any) => !!v?.isOos,
        (v: any) => v?.driverRiskCategory === 1 ? 5 : v?.driverRiskCategory === 2 ? 3 : 1,
    ), [allViolations]);

    // ── Time window filter (history scope) ────────────────────────────
    const [windowId, setWindowId] = useState<TimeWindowId>('12mo');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo,   setDateTo]   = useState('');

    const applyWindowPreset = (w: TimeWindowId) => {
        setWindowId(w);
        if (w === 'all' || w === 'custom') return;
        const days = TIME_WINDOW_PRESETS.find(p => p.id === w)?.days ?? 365;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        setDateFrom(iso(start));
        setDateTo(iso(end));
    };

    const violations = useMemo(() => {
        // "all" or custom-blank → no filtering
        if (windowId === 'all') return allViolations;
        if (windowId === 'custom' && !dateFrom && !dateTo) return allViolations;
        return allViolations.filter(v => {
            const d = v?.date;
            if (!d) return false;
            if (dateFrom && d < dateFrom) return false;
            if (dateTo   && d > dateTo)   return false;
            return true;
        });
    }, [allViolations, windowId, dateFrom, dateTo]);

    // ── Registered jurisdictions ────────────────────────────────────────
    const registered = useMemo(() => {
        const acct = ACCOUNTS_DB.find(a => a.id === id);
        const provs = new Set<string>();
        if (acct?.nscNumber) {
            const p = acct.nscNumber.split("-")[0]?.toUpperCase();
            if (p) provs.add(p);
        }
        for (const n of acct?.nscNumbers ?? []) {
            const p = n.split("-")[0]?.toUpperCase();
            if (p) provs.add(p);
        }
        return {
            hasFmcsa: !!acct?.dotNumber,
            hasCvor:  !!acct?.cvorNumber,
            nscProvinces: new Set(Array.from(provs).filter(p => p !== "ON")),
            legalName: acct?.legalName ?? "Carrier",
            dotNumber: acct?.dotNumber ?? "",
            cvorNumber: acct?.cvorNumber ?? "",
        };
    }, [id]);

    const buckets = useMemo(() => bucketViolations(violations), [violations]);

    // ── Source pills ────────────────────────────────────────────────────
    const sourcePills = useMemo(() => {
        const out: { id: string; label: string; count: number; rows: any[] }[] = [
            { id: 'all', label: 'All Sources', count: violations.length, rows: violations },
        ];
        if (registered.hasFmcsa && buckets.sms.length > 0) {
            out.push({ id: 'sms', label: 'SMS · FMCSA', count: buckets.sms.length, rows: buckets.sms });
        }
        if (registered.hasCvor && buckets.cvor.length > 0) {
            out.push({ id: 'cvor', label: 'CVOR · Ontario', count: buckets.cvor.length, rows: buckets.cvor });
        }
        for (const prov of Object.keys(buckets.nsc).sort()) {
            if (!registered.nscProvinces.has(prov)) continue;
            out.push({
                id: `nsc-${prov}`,
                label: `NSC · ${provinceFullName(prov)}`,
                count: buckets.nsc[prov].length,
                rows: buckets.nsc[prov],
            });
        }
        return out;
    }, [violations, buckets, registered]);

    const [source, setSource] = useState<string>('all');
    useEffect(() => {
        if (!sourcePills.find(s => s.id === source)) setSource('all');
    }, [sourcePills, source]);
    const sourceRows: any[] = (sourcePills.find(s => s.id === source)?.rows) ?? violations;

    // ── Category tabs (violation groups, sorted by count desc) ─────────
    const [category, setCategory] = useState<string>('all');
    useEffect(() => { setCategory('all'); }, [source]);
    const categoryTabs = useMemo(() => {
        const counts = new Map<string, number>();
        for (const v of sourceRows) {
            const g = String(v?.violationGroup ?? "Other").trim() || "Other";
            counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        const sorted = Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([label, count]) => ({ id: label, label, count }));
        return [{ id: 'all', label: 'All Violations', count: sourceRows.length }, ...sorted];
    }, [sourceRows]);

    const categoryRows = useMemo(() => {
        if (category === 'all') return sourceRows;
        return sourceRows.filter(v => String(v?.violationGroup ?? "Other") === category);
    }, [sourceRows, category]);

    // ── Risk filter ─────────────────────────────────────────────────────
    type RiskFilter = 'all' | 'high' | 'moderate' | 'lower';
    const [risk, setRisk] = useState<RiskFilter>('all');
    useEffect(() => { setRisk('all'); }, [source, category]);
    const riskCounts = useMemo(() => {
        let high = 0, moderate = 0, lower = 0;
        for (const v of categoryRows) {
            if (v?.driverRiskCategory === 1) high += 1;
            else if (v?.driverRiskCategory === 2) moderate += 1;
            else lower += 1;
        }
        return { high, moderate, lower };
    }, [categoryRows]);

    const riskFilteredRows = useMemo(() => {
        if (risk === 'all') return categoryRows;
        return categoryRows.filter(v => {
            const r = v?.driverRiskCategory ?? 3;
            return (risk === 'high' && r === 1)
                || (risk === 'moderate' && r === 2)
                || (risk === 'lower' && r === 3);
        });
    }, [categoryRows, risk]);

    // ── Free-text search (driver / code / description / city / state) ─
    const [search, setSearch] = useState('');
    useEffect(() => { setSearch(''); }, [source, category, risk]);
    const finalRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return riskFilteredRows;
        return riskFilteredRows.filter(v => {
            const hay = [
                v.id, v.driverName, v.driverId, v.assetName, v.assetId,
                v.violationCode, v.violationType, v.violationGroup,
                v.locationCity, v.locationState, v.locationCountry,
                v.result, v.actSection, v.citationNumber, v.ticketNumber,
            ].filter(Boolean).join(' ').toLowerCase();
            return hay.includes(q);
        });
    }, [riskFilteredRows, search]);

    const sortedRows = useMemo(
        () => [...finalRows].sort((a, b) => String(b?.date ?? '').localeCompare(String(a?.date ?? ''))),
        [finalRows],
    );

    // KPIs
    const total = finalRows.length;
    const oosCount = finalRows.filter(v => v.isOos).length;
    const highRiskCount = finalRows.filter(v => v.driverRiskCategory === 1).length;
    const citationCount = finalRows.filter(v => v.result === "Citation Issued" || v.result === "OOS Order").length;

    // ── Donut chart slices ──────────────────────────────────────────────
    // Category breakdown lives in the Violation Score Rings panel above, so
    // the donut row only carries the Risk + Compliance views.

    // Risk donut: same source-filtered scope.
    const riskSlices: DonutSlice[] = useMemo(() => [
        { id: 'high',     label: 'High Risk',     value: sourceRows.filter(v => v.driverRiskCategory === 1).length, color: '#ef4444' },
        { id: 'moderate', label: 'Moderate Risk', value: sourceRows.filter(v => v.driverRiskCategory === 2).length, color: '#f59e0b' },
        { id: 'lower',    label: 'Lower Risk',    value: sourceRows.filter(v => v.driverRiskCategory === 3).length, color: '#10b981' },
    ].filter(s => s.value > 0), [sourceRows]);

    // Compliance donut: only the regimes the carrier is actually registered
    // in (same filter the source pills use). Off-roster jurisdictions roll
    // into an "Other" slice so the totals still match the full violation
    // count without polluting the legend with tiny one-off entries.
    const complianceSlices: DonutSlice[] = useMemo(() => {
        const out: DonutSlice[] = [];
        let otherCount = 0;

        if (registered.hasFmcsa && buckets.sms.length > 0) {
            out.push({ id: 'sms',  label: 'SMS · FMCSA',   value: buckets.sms.length,  color: '#3b82f6' });
        } else {
            otherCount += buckets.sms.length;
        }
        if (registered.hasCvor && buckets.cvor.length > 0) {
            out.push({ id: 'cvor', label: 'CVOR · Ontario', value: buckets.cvor.length, color: '#10b981' });
        } else {
            otherCount += buckets.cvor.length;
        }
        const nscPalette = ['#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        let p = 0;
        for (const prov of Object.keys(buckets.nsc).sort()) {
            if (registered.nscProvinces.has(prov)) {
                out.push({
                    id: `nsc-${prov}`,
                    label: `NSC · ${prov}`,
                    value: buckets.nsc[prov].length,
                    color: nscPalette[p++ % nscPalette.length],
                });
            } else {
                otherCount += buckets.nsc[prov].length;
            }
        }
        if (otherCount > 0) {
            out.push({ id: 'other', label: 'Other jurisdictions', value: otherCount, color: '#94a3b8' });
        }
        return out;
    }, [buckets, registered]);

    // Pagination + selection
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    useEffect(() => { setPage(1); }, [source, category, risk, search, windowId, dateFrom, dateTo]);
    const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    useEffect(() => { setSelectedIdx(null); }, [source, category, risk, search, page]);
    const selected = selectedIdx != null ? visibleRows[selectedIdx] : null;

    return (
        <div className="px-8 py-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Page header */}
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileWarning size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Violations Analysis</h2>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                {registered.legalName} · {violations.length.toLocaleString()} records · {[
                                    registered.hasFmcsa && 'SMS',
                                    registered.hasCvor && 'CVOR',
                                    registered.nscProvinces.size > 0 && 'NSC',
                                ].filter(Boolean).join(' · ') || '—'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-5">
                    {/* ── History window scope ───────────────────────────── */}
                    <div className="mb-5 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
                            <Calendar size={13} />
                            <span className="font-bold uppercase tracking-wider">History window</span>
                        </div>
                        {/* Preset pills */}
                        <div className="inline-flex items-center gap-1 flex-wrap">
                            {TIME_WINDOW_PRESETS.map(p => {
                                const active = windowId === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => applyWindowPreset(p.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[40px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                            active
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => applyWindowPreset('all')}
                                className={cn(
                                    'inline-flex items-center justify-center min-w-[40px] h-7 px-3 rounded-full border text-[11px] font-bold whitespace-nowrap transition-colors',
                                    windowId === 'all'
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                                )}
                            >
                                all
                            </button>
                        </div>
                        {/* Custom date range — selecting either input switches to "custom". */}
                        <div className="inline-flex items-center gap-2 ml-auto">
                            <input
                                type="date"
                                value={dateFrom}
                                max={dateTo || undefined}
                                onChange={e => { setDateFrom(e.target.value); setWindowId('custom'); }}
                                className="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-label="History window from"
                            />
                            <span className="text-slate-400">→</span>
                            <input
                                type="date"
                                value={dateTo}
                                min={dateFrom || undefined}
                                onChange={e => { setDateTo(e.target.value); setWindowId('custom'); }}
                                className="h-7 px-2 rounded-md border border-slate-200 bg-white text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                aria-label="History window to"
                            />
                        </div>
                        <div className="w-full text-[10px] text-slate-500">
                            <span className="font-bold tabular-nums text-slate-700">{violations.length.toLocaleString()}</span> of {allViolations.length.toLocaleString()} violations in scope
                            {windowId !== 'all' && dateFrom && dateTo && (
                                <span className="text-slate-400"> · {dateFrom} → {dateTo}</span>
                            )}
                        </div>
                    </div>

                    {/* KPI tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        <KpiTile value={total.toLocaleString()}        label="Total Violations" />
                        <KpiTile value={oosCount.toLocaleString()}     label="OOS-qualifying" tone="red" />
                        <KpiTile value={highRiskCount.toLocaleString()} label="High-Risk"      tone="red" />
                        <KpiTile value={citationCount.toLocaleString()} label="Citations / OOS" tone="amber" />
                    </div>

                    {/* ── Violation score rings + contribution mapping ────── */}
                    <ViolationScoreRingsPanel breakdown={violationBreakdown} />

                    {/* ── Geographic distribution (collapsed by default) ──── */}
                    <GeographicDistributionPanel
                        stats={geoStats}
                        subtitle="Violation hotspots by state / province — choropleth + bubble overlay."
                    />

                    {/* ── Donut charts (Risk + Compliance) ──────────────── */}
                    {/* The "By Category" donut was dropped — the Violation
                        Score Rings panel above already shows the category
                        breakdown + contribution mapping. */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
                        <DonutChart
                            title="By Risk"
                            subtitle="Driver risk category"
                            slices={riskSlices}
                            activeId={risk === 'all' ? undefined : risk}
                            onSliceClick={(id) => setRisk(risk === id ? 'all' : id as typeof risk)}
                        />
                        <DonutChart
                            title="By Compliance"
                            subtitle="Regulatory source"
                            slices={complianceSlices}
                            activeId={source === 'all' ? undefined : source}
                            onSliceClick={(id) => setSource(source === id ? 'all' : id)}
                        />
                    </div>


                    {/* ── List-only filters — narrow the table without changing the charts above ── */}
                    <div className="mb-3 px-4 py-3 bg-slate-50/60 border border-slate-200 rounded-lg flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                            <SlidersHorizontal size={13} />
                            <span>List filters</span>
                        </div>
                        <div className="relative w-full sm:w-64 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search driver, code, location…"
                                className="w-full h-8 pl-8 pr-3 border border-slate-200 rounded-md text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 bg-white"
                            />
                        </div>

                        <div className="inline-flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</span>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="h-8 px-2.5 pr-7 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 max-w-[200px]"
                            >
                                {categoryTabs.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.label} ({c.count.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="inline-flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk</span>
                            <RiskChip active={risk === 'all'}      onClick={() => setRisk('all')}      dot="bg-slate-400"   label="All"      count={categoryRows.length} />
                            <RiskChip active={risk === 'high'}     onClick={() => setRisk('high')}     dot="bg-red-500"     label="High"     count={riskCounts.high} />
                            <RiskChip active={risk === 'moderate'} onClick={() => setRisk('moderate')} dot="bg-amber-500"   label="Moderate" count={riskCounts.moderate} />
                            <RiskChip active={risk === 'lower'}    onClick={() => setRisk('lower')}    dot="bg-emerald-500" label="Lower"    count={riskCounts.lower} />
                        </div>

                        <div className="ml-auto text-[10px] text-slate-500 whitespace-nowrap">
                            <span className="font-bold tabular-nums text-slate-700">{finalRows.length.toLocaleString()}</span> result{finalRows.length === 1 ? '' : 's'}
                            {(category !== 'all' || risk !== 'all' || search.trim()) && (
                                <button
                                    type="button"
                                    onClick={() => { setCategory('all'); setRisk('all'); setSearch(''); }}
                                    className="ml-2 font-bold text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table — canonical Violations List layout, sized to fit without horizontal scroll. */}
                    <DataTable
                        head={['Date','Driver / Asset','Location','Source','Code','Category','Risk','Result']}
                        rows={visibleRows.map((v: any) => {
                            const r = v.driverRiskCategory;
                            const riskLabel = r === 1 ? 'High' : r === 2 ? 'Mod' : 'Low';
                            const riskTone  =
                                r === 1 ? 'bg-red-100 text-red-700 border border-red-200'
                              : r === 2 ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              :           'bg-emerald-100 text-emerald-700 border border-emerald-200';

                            const assetLabel = v.assetName || v.assetId || '';

                            const cityRaw = String(v.locationCity ?? '').trim();
                            const cityClean = cityRaw && !/unknown/i.test(cityRaw) ? cityRaw : '';
                            const cityState = [cityClean, v.locationState].filter(Boolean).join(', ') || '—';

                            // Result merges with OOS: OOS Order takes priority.
                            // Short labels so the column doesn't get clipped.
                            const resultLabel =
                                v.isOos                        ? 'OOS'
                              : v.result === 'Citation Issued' ? 'Citation'
                              : v.result === 'Under Review'    ? 'Review'
                              :                                  v.result;
                            const resultTone =
                                v.isOos                        ? 'bg-red-100 text-red-700 border border-red-200'
                              : v.result === 'Citation Issued' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                              : v.result === 'Warning'         ? 'bg-blue-100 text-blue-700 border border-blue-200'
                              : v.result === 'Under Review'    ? 'bg-violet-100 text-violet-700 border border-violet-200'
                              :                                  'bg-emerald-100 text-emerald-700 border border-emerald-200';

                            return [
                                // Date / Time
                                <div className="leading-tight whitespace-nowrap">
                                    <div className="text-[11px] font-semibold text-slate-700">{fmtDateLong(v.date)}</div>
                                    <div className="text-[10px] text-slate-400">{v.time}</div>
                                </div>,

                                // Driver / Asset
                                <div className="min-w-0 max-w-[180px]">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={12} className="text-slate-400 shrink-0" />
                                        <span className="text-[11px] font-semibold text-slate-700 truncate" title={v.driverName}>
                                            {v.driverName || '—'}
                                        </span>
                                    </div>
                                    {v.driverId && (
                                        <div className="text-[10px] text-slate-400 font-mono ml-[18px] truncate">{v.driverId}</div>
                                    )}
                                    {assetLabel && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Truck size={12} className="text-slate-400 shrink-0" />
                                            <span className="text-[10px] text-slate-500 font-mono truncate">{assetLabel}</span>
                                        </div>
                                    )}
                                </div>,

                                // Location
                                <div className="min-w-0 max-w-[140px]">
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={12} className="text-slate-400 shrink-0" />
                                        <span className="text-[11px] text-slate-700 truncate" title={cityState}>{cityState}</span>
                                    </div>
                                    {v.locationCountry && (
                                        <div className="text-[10px] text-slate-400 ml-[18px]">{v.locationCountry}</div>
                                    )}
                                </div>,

                                <SourceBadge state={v.locationState} />,

                                // Code
                                <code className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold font-mono whitespace-nowrap">
                                    {v.violationCode}
                                </code>,

                                // Category — group on top, type below
                                <div className="min-w-0 max-w-[180px]">
                                    <div className="text-[11px] text-slate-700 truncate" title={v.violationGroup}>{v.violationGroup}</div>
                                    <div className="text-[10px] text-slate-400 truncate" title={v.violationType}>{v.violationType}</div>
                                </div>,

                                // Risk
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap', riskTone)}>
                                    {riskLabel}
                                </span>,

                                // Result (subsumes OOS)
                                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap', resultTone)}>
                                    {resultLabel}
                                </span>,
                            ];
                        })}
                        emptyMessage="No violations match the current filters."
                        selectedIndex={selectedIdx}
                        onSelectRow={(i) => setSelectedIdx(selectedIdx === i ? null : i)}
                        pagination={{ page, pageSize, totalRows: sortedRows.length, onPageChange: setPage, onPageSizeChange: setPageSize }}
                    />

                    {selected && (
                        <RowDetailPanel
                            title={`${selected.violationCode} · ${selected.violationType}`}
                            registration={selected.id}
                            statusBadge={
                                selected.isOos
                                    ? { label: 'OOS', tone: 'alert' }
                                  : selected.driverRiskCategory === 1
                                    ? { label: 'High Risk', tone: 'alert' }
                                  : selected.driverRiskCategory === 2
                                    ? { label: 'Moderate', tone: 'warn' }
                                  : { label: 'Lower', tone: 'ok' }
                            }
                            fields={[
                                { label: 'Date / Time',     value: `${selected.date} ${selected.time ?? ''}` },
                                { label: 'Driver',          value: selected.driverName },
                                { label: 'Asset',           value: selected.assetName },
                                { label: 'Location',        value: `${selected.locationCity ?? ''}${selected.locationState ? ', ' + selected.locationState : ''}` },
                                { label: 'Country',         value: selected.locationCountry },
                                { label: 'Group',           value: selected.violationGroup },
                                { label: 'Code',            value: selected.violationCode },
                                { label: 'Act / Section',   value: selected.actSection },
                                { label: 'Issuing Agency',  value: selected.issuingAgency },
                                { label: 'Result',          value: selected.result },
                                { label: 'Status',          value: selected.status },
                                { label: 'Crash Likelihood',value: `${selected.crashLikelihood}%` },
                                { label: 'Citation #',      value: selected.citationNumber },
                                { label: 'Ticket #',        value: selected.ticketNumber },
                                { label: 'Conviction #',    value: selected.convictionNumber },
                                { label: 'Conviction Date', value: selected.convictionDate },
                                { label: 'NAT Code',        value: selected.natCode },
                            ]}
                            onClose={() => setSelectedIdx(null)}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Geographic distribution helpers ──────────────────────────────────────
const CA_PROV_CODES = new Set(['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']);

/** Build jurisdiction stats from a list of violation or accident rows. */
function aggregateGeoStats(
    rows: any[],
    pickState: (r: any) => string,
    pickCountry: (r: any) => string,
    pickIsOos: (r: any) => boolean,
    pickSeverity: (r: any) => number,
): JurisdictionStats[] {
    const buckets = new Map<string, JurisdictionStats>();
    for (const row of rows) {
        const stateRaw = String(pickState(row) ?? '').toUpperCase().trim();
        if (!stateRaw) continue;
        const ctry = String(pickCountry(row) ?? '').toUpperCase();
        const isCA = CA_PROV_CODES.has(stateRaw) || ctry === 'CA' || ctry === 'CANADA';
        const country: 'US' | 'CA' = isCA ? 'CA' : 'US';
        let entry = buckets.get(stateRaw);
        if (!entry) {
            entry = { code: stateRaw, country, eventCount: 0, oosCount: 0, severitySum: 0, severityAvg: 0 };
            buckets.set(stateRaw, entry);
        }
        entry.eventCount += 1;
        if (pickIsOos(row)) entry.oosCount += 1;
        entry.severitySum += pickSeverity(row);
    }
    const out = Array.from(buckets.values()).map(b => ({
        ...b,
        severityAvg: b.eventCount > 0 ? Number((b.severitySum / b.eventCount).toFixed(2)) : 0,
    }));
    return out.sort((a, b) => b.eventCount - a.eventCount);
}

/** Collapsible Geographic distribution card — map left, top jurisdictions right. */
function GeographicDistributionPanel({
    stats, subtitle,
}: {
    stats: JurisdictionStats[];
    subtitle?: string;
}) {
    const [open, setOpen] = useState(false);
    const totalEvents = stats.reduce((s, x) => s + x.eventCount, 0);
    const totalOos    = stats.reduce((s, x) => s + x.oosCount, 0);
    return (
        <div className="mb-5 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
            >
                <div className="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <MapPin size={16} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">Geographic distribution</div>
                    <div className="text-[11px] text-slate-500">
                        {subtitle ?? 'State / province event hotspots — choropleth + bubble overlay.'}
                    </div>
                </div>
                <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-500">
                    <span><span className="font-bold tabular-nums text-slate-700">{stats.length}</span> jurisdictions</span>
                    <span><span className="font-bold tabular-nums text-slate-700">{totalEvents.toLocaleString()}</span> events</span>
                    {totalOos > 0 && <span className="text-rose-600 font-semibold"><span className="tabular-nums">{totalOos}</span> OOS</span>}
                </div>
                {open
                    ? <ChevronDown size={16} className="text-slate-400 shrink-0" />
                    : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
            </button>
            {open && (
                <div className="border-t border-slate-200 p-4">
                    {stats.length === 0 ? (
                        <div className="px-4 py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                            No geographic data to map.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(220px,1fr)] gap-4 items-start">
                            {/* Map on the left — capped at ~440px tall so it doesn't dwarf the panel */}
                            <div className="min-w-0">
                                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">North America heatmap</span>
                                        <span className="text-[10px] text-slate-400">Hover a state / province for details</span>
                                    </div>
                                    <div
                                        className="relative w-full mx-auto"
                                        style={{ maxWidth: 720, aspectRatio: '16 / 9' }}
                                    >
                                        <div className="absolute inset-0 [&>div]:!p-0 [&>div]:!border-0 [&>div]:!bg-transparent [&>div]:!rounded-none">
                                            <NorthAmericaMap
                                                stats={stats}
                                                title=""
                                                subtitle=""
                                                showTopList={false}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top jurisdictions on the right — bounded to match map height */}
                            <div className="min-w-0 border border-slate-200 rounded-lg bg-white flex flex-col" style={{ maxHeight: 440 }}>
                                <div className="px-3 py-2 border-b border-slate-100 shrink-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Top jurisdictions</span>
                                </div>
                                <div className="overflow-y-auto p-2.5 space-y-2 flex-1">
                                    {stats.slice(0, 12).map((s, i) => (
                                        <div key={s.code} className="bg-slate-50 ring-1 ring-slate-200 rounded-md px-3 py-2 flex items-center gap-3">
                                            <div className="text-[10px] font-bold text-slate-400 tabular-nums w-5 shrink-0">#{i + 1}</div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[12px] font-bold text-slate-800">{s.code}</span>
                                                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{s.country}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500 truncate">
                                                    {s.oosCount > 0 && <span className="text-rose-600 font-semibold">{s.oosCount} OOS · </span>}
                                                    σ {s.severityAvg.toFixed(1)}
                                                </div>
                                            </div>
                                            <div className="text-lg font-black text-slate-900 tabular-nums shrink-0">
                                                {s.eventCount.toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Violation Score panel — big overall ring + 6 category sub-rings ──────
function ViolationScoreRingsPanel({ breakdown }: { breakdown: ViolationScoreBreakdown }) {
    const { overall, totalEvents, totalOos, categories } = breakdown;

    // Tone for the headline label (Excellent / Good / Conditional / Unsatisfactory).
    const overallLabel = getRiskMeta(overall).label;
    const overallTone =
        overall >= 90 ? { ring: 'text-emerald-500', pill: 'bg-emerald-100 text-emerald-700' }
      : overall >= 80 ? { ring: 'text-blue-600',    pill: 'bg-blue-100 text-blue-700' }
      : overall >= 70 ? { ring: 'text-amber-500',   pill: 'bg-amber-100 text-amber-700' }
      :                  { ring: 'text-red-500',    pill: 'bg-red-100 text-red-700' };

    return (
        <div className="mb-5 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">Violation Safety Score</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                        {totalEvents.toLocaleString()} violations · {totalOos.toLocaleString()} OOS · {categories.length} active categories
                    </p>
                </div>
                <div className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', overallTone.pill)}>
                    {overallLabel}
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 items-stretch">
                {/* Big overall ring */}
                <div className="relative group bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-5 flex flex-col items-center justify-center">
                    <SafetyRingChart
                        size="large"
                        label="Overall Violation Score"
                        score={overall}
                        palette="blue"
                        subtitle={`${overall.toFixed(1)} / 100`}
                    />
                    <div className="mt-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Hover a ring below for the category breakdown
                    </div>
                </div>

                {/* Category sub-rings */}
                {categories.length === 0 ? (
                    <div className="flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-8 text-xs text-slate-400">
                        No violations on record — nothing to break down.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
                        {categories.slice(0, 6).map(c => (
                            <div
                                key={c.id}
                                className="relative group bg-gradient-to-b from-emerald-50/60 to-slate-50 border border-emerald-100 rounded-2xl p-4 min-h-[200px] flex flex-col justify-start"
                                title={`${c.label} — ${c.events} events · ${c.oosEvents} OOS · ${c.contributionPct.toFixed(1)}% contribution`}
                            >
                                <SafetyRingChart label={c.label} score={c.score} palette="green" />
                                <div className={cn('mt-2 text-center text-sm font-bold', getScoreColor(c.score))}>
                                    {c.score.toFixed(2)}%
                                </div>
                                <div className="mt-1 text-center text-[10px] text-slate-500">
                                    {c.events.toLocaleString()} events · {c.oosEvents} OOS
                                </div>
                                {/* Inline contribution bar */}
                                <div className="mt-2">
                                    <div className="flex items-center justify-between text-[9px] mb-0.5">
                                        <span className="font-bold uppercase tracking-wider text-slate-400">Contribution</span>
                                        <span className="font-bold tabular-nums text-slate-600">{c.contributionPct.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-emerald-500"
                                            style={{ width: `${Math.min(100, c.contributionPct)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Contribution mapping bar — every category as a coloured segment */}
            {categories.length > 0 && (
                <div className="mt-5">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        Overall Contribution Mapping
                    </h4>
                    <div className="flex h-9 rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                        {categories.map((c, i) => {
                            const color = CATEGORY_PALETTE[i % CATEGORY_PALETTE.length];
                            return (
                                <div
                                    key={c.id}
                                    className="h-full relative group flex items-center justify-center transition-all hover:opacity-90"
                                    style={{ width: `${Math.max(2, c.contributionPct)}%`, background: color }}
                                    title={`${c.label} — ${c.contributionPct.toFixed(1)}%`}
                                >
                                    <span className="text-[9px] font-black text-white truncate px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {c.label} ({c.contributionPct.toFixed(0)}%)
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {categories.map((c, i) => (
                            <div key={c.id} className="inline-flex items-center gap-1.5 text-[10px]">
                                <span className="h-2.5 w-2.5 rounded" style={{ background: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length] }} />
                                <span className="text-slate-600 font-semibold">{c.label}</span>
                                <span className="text-slate-400 tabular-nums">{c.contributionPct.toFixed(1)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function SafetyDashboardView({ accountId }: { accountId?: string }) {
    const [preset, setPreset] = useState<TimePresetId>('7d');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [view, setView] = useState<string>('custom');
    const [jurisdiction, setJurisdiction] = useState<Jurisdiction>('all');
    const [mode, setMode] = useState<Mode>('time');
    const [moreOpen, setMoreOpen] = useState(false);

    // ── Real score derived from the active carrier ──────────────────────
    const score = useMemo<FleetSafetyScore>(() => computeFleetSafetyScore(accountId), [accountId]);

    // Apply a preset → compute concrete from/to and stamp them onto the
    // visible date inputs so the user can see what the scope resolves to.
    const applyPreset = (id: typeof TIME_PRESETS[number]['id']) => {
        const p = TIME_PRESETS.find(x => x.id === id);
        if (!p) return;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - p.days);
        const iso = (d: Date) => d.toISOString().slice(0, 10);
        setPreset(id);
        setDateFrom(iso(start));
        setDateTo(iso(end));
    };

    return (
        <div className="px-8 py-6 space-y-4">
            {/* ── Action row: Print / Share / Mail / Export ──────────────── */}
            <div className="flex items-center justify-end gap-2 flex-wrap">
                <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                    <Printer size={14} /> Print
                </button>
                <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                    <Share2 size={14} /> Share
                </button>
                <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 shadow-sm">
                    <Mail size={14} /> Mail To
                </button>
                <div className="inline-flex items-stretch h-9 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <span className="inline-flex items-center px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-r border-slate-200">Export</span>
                    <button className="inline-flex items-center gap-1.5 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 border-r border-slate-200">
                        <FileText size={14} /> CSV
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50 border-r border-slate-200">
                        <FileDown size={14} /> PDF
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3 text-sm font-medium text-blue-700 hover:bg-blue-50">
                        <Download size={14} /> Full Export
                    </button>
                </div>
            </div>

            {/* ── Time Period band ───────────────────────────────────────── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex">
                {/* Left accent strip — same colour language as the KPI cards. */}
                <div className="w-1.5 shrink-0 bg-blue-500" />
                <div className="flex-1 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900 leading-tight">Time Period</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Global date range for all dashboard data</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Preset pills */}
                        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                            {TIME_PRESETS.map(p => {
                                const active = preset === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => applyPreset(p.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[44px] h-7 px-2.5 rounded-md text-xs font-bold tabular-nums transition-colors',
                                            active
                                                ? 'bg-white text-blue-700 ring-1 ring-blue-200 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                        {/* Custom range */}
                        <div className="inline-flex items-center gap-2">
                            <div className="relative">
                                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    max={dateTo || undefined}
                                    onChange={e => { setDateFrom(e.target.value); setPreset('custom'); }}
                                    className="h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    aria-label="From date"
                                />
                            </div>
                            <span className="text-slate-400">–</span>
                            <div className="relative">
                                <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateTo}
                                    min={dateFrom || undefined}
                                    onChange={e => { setDateTo(e.target.value); setPreset('custom'); }}
                                    className="h-9 pl-8 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    aria-label="To date"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Secondary filter row: View / Jurisdiction / Mode / More ─ */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3 flex items-center gap-6 flex-wrap">
                <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">View</span>
                    <select
                        value={view}
                        onChange={e => setView(e.target.value)}
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                        <option value="custom">Custom View</option>
                        <option value="default">Default View</option>
                        <option value="executive">Executive Summary</option>
                        <option value="compliance">Compliance Officer</option>
                        <option value="dispatch">Dispatch / Ops</option>
                    </select>
                </div>

                <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Jurisdiction</span>
                    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                        {([
                            { id: 'all',    label: 'All'    },
                            { id: 'us',     label: 'US'     },
                            { id: 'canada', label: 'Canada' },
                        ] as const).map(j => {
                            const active = jurisdiction === j.id;
                            return (
                                <button
                                    key={j.id}
                                    type="button"
                                    onClick={() => setJurisdiction(j.id)}
                                    className={cn(
                                        'inline-flex items-center justify-center min-w-[48px] h-7 px-3 rounded-md text-xs font-semibold transition-colors',
                                        active
                                            ? 'bg-white text-blue-700 ring-1 ring-blue-200 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                    )}
                                >
                                    {j.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mode</span>
                    <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-50 border border-slate-200">
                        {([
                            { id: 'time',     label: 'Time'     },
                            { id: 'distance', label: 'Distance' },
                        ] as const).map(m => {
                            const active = mode === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setMode(m.id)}
                                    className={cn(
                                        'inline-flex items-center justify-center min-w-[68px] h-7 px-3 rounded-md text-xs font-semibold transition-colors',
                                        active
                                            ? 'bg-white text-blue-700 ring-1 ring-blue-200 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                    )}
                                >
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setMoreOpen(o => !o)}
                    className={cn(
                        'ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium shadow-sm transition-colors',
                        moreOpen
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
                    )}
                >
                    <SlidersHorizontal size={14} /> More Filters
                </button>
            </div>

            {/* Expanded More Filters drawer (placeholder rows — wire up to
                real fields as the dashboard data lands). */}
            {moreOpen && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">BASIC</label>
                        <select className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm">
                            <option>All BASICs</option>
                            <option>Unsafe Driving</option>
                            <option>HOS Compliance</option>
                            <option>Driver Fitness</option>
                            <option>Vehicle Maintenance</option>
                            <option>Controlled Substances</option>
                            <option>Hazmat</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Source</label>
                        <select className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm">
                            <option>All Sources</option>
                            <option>SMS (FMCSA)</option>
                            <option>CVOR (Ontario)</option>
                            <option>NSC (Canada)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Risk Level</label>
                        <select className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm">
                            <option>All</option>
                            <option>High</option>
                            <option>Moderate</option>
                            <option>Lower</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">OOS</label>
                        <select className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 shadow-sm">
                            <option>All</option>
                            <option>OOS-qualifying only</option>
                            <option>Not OOS</option>
                        </select>
                    </div>
                </div>
            )}

            {/* ── Fleet Safety Score dashboard ───────────────────────────── */}
            <FleetSafetyScorePanel score={score} accountId={accountId} />
        </div>
    );
}

// ── Fleet Safety Score panel ──────────────────────────────────────────────
// Mirrors the old SafetyAnalysisPage dashboard look:
//   • A 5-segment color scale (Very Poor / Poor / Fair / Good / Excellent)
//     with a marker for the current fleet score.
//   • A large blue Fleet Safety Score ring with a Conditional-style rating pill.
//   • A 3×2 grid of green sub-score rings (Accident / ELD / Inspection /
//     Driver / VEDR / Roadside Violation).
//
// All values are sourced from the carrier-scoped `computeFleetSafetyScore`,
// not from any global table — so it switches when the navbar carrier changes.

const SCORE_SCALE_SEGMENTS: { label: string; range: string; flex: number; color: string }[] = [
    { label: 'Very Poor', range: '0-39',   flex: 40, color: 'bg-red-500' },
    { label: 'Poor',      range: '40-49',  flex: 10, color: 'bg-orange-400' },
    { label: 'Fair',      range: '50-54',  flex: 5,  color: 'bg-slate-300' },
    { label: 'Good',      range: '55-69',  flex: 15, color: 'bg-sky-400' },
    { label: 'Excellent', range: '70-100', flex: 30, color: 'bg-blue-600' },
];

function getRiskMeta(score: number) {
    const clamped = Math.max(0, Math.min(score, 100));
    if (clamped >= 90) return { label: 'Excellent',      shortLabel: 'Low Risk' as const };
    if (clamped >= 80) return { label: 'Acceptable',     shortLabel: 'Low Risk' as const };
    if (clamped >= 70) return { label: 'Conditional',    shortLabel: 'Moderate Risk' as const };
    return                    { label: 'Unsatisfactory', shortLabel: 'High Risk' as const };
}

function getScoreColor(score: number): string {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
}

function FleetSafetyScorePanel({ score, accountId }: { score: FleetSafetyScore; accountId: string | undefined }) {
    const overall = score.overall;
    const cards = score.cards;
    const subRings = [
        { id: 'accident',   label: 'Accident Score',           value: cards.accident.score,          purpose: 'Measures preventable and reportable accidents against fleet exposure.',                    focus: 'Improve by challenging non-preventable rulings and reducing high-severity events.' },
        { id: 'eld',        label: 'ELD Score',                value: cards.eld.score,               purpose: 'Tracks Hours of Service compliance, ELD integrity, and logbook discipline.',                focus: 'Keep unassigned miles, form-and-manner errors, and HOS violations near zero.' },
        { id: 'inspection', label: 'Inspection Score',         value: cards.inspection.score,        purpose: 'Reflects clean roadside inspection outcomes over the scoring period.',                       focus: 'Increase clean inspections by improving pre-trip checks and defect resolution.' },
        { id: 'driver',     label: 'Driver Score',             value: cards.driver.score,            purpose: 'Aggregates individual driver behavior, incidents, and compliance consistency.',             focus: 'Target coaching and training on the lowest half of drivers first.' },
        { id: 'vedr',       label: 'VEDR Score',               value: cards.vedr.score,              purpose: 'Scores camera and telematics events such as distraction, following distance, and speeding.', focus: 'Review events quickly and close corrective actions for repeat trigger patterns.' },
        { id: 'roadside',   label: 'Roadside Violation Score', value: cards.roadsideViolation.score, purpose: 'Measures violation-free inspection rate with heavier impact for OOS findings.',             focus: 'Prioritize OOS root-cause fixes to prevent severe point impact.' },
    ];

    const s = score.signals;
    const r = score.regimes;
    const id = score.identity;
    const cvor = score.cvor;

    type KpiCard = { label: string; value: string | number; sub: string; accent: string; valColor: string };

    // ── Single consolidated KPI strip ───────────────────────────────────
    // Only the headline values: composite + per-regulator overall + a few
    // operational counts. Sub-score rings live in the main chart above and
    // category-level breakdowns live inside the Regulatory Details fact
    // sheets, so we don't repeat them here.
    const cvorTone =
        cvor.label === 'Excellent'    ? 'text-emerald-700'
      : cvor.label === 'Satisfactory' ? 'text-green-700'
      : cvor.label === 'Conditional'  ? 'text-amber-700'
      :                                 'text-red-700';

    const kpis: KpiCard[] = [
        // Composite fleet score
        { label: 'Fleet Safety Score', value: overall.toFixed(1), sub: score.cvor.label, accent: 'bg-blue-600', valColor: getScoreColor(overall) },
    ];

    if (r.fmcsa) {
        kpis.push({
            label: 'FMCSA SMS Score',
            value: s.smsScore.toFixed(1),
            sub: `USDOT ${id.dotNumber || '—'}`,
            accent: 'bg-indigo-600',
            valColor: getScoreColor(s.smsScore),
        });
    }
    if (r.cvor) {
        kpis.push({
            label: 'CVOR Overall',
            value: `${cvor.rating.toFixed(1)}%`,
            sub: `${cvor.label} · ${id.cvorNumber || '—'}`,
            accent: 'bg-emerald-600',
            valColor: cvorTone,
        });
    }
    for (const n of score.nscs) {
        const nscTone =
            n.label === 'Excellent'    ? 'text-emerald-700'
          : n.label === 'Satisfactory' ? 'text-green-700'
          : n.label === 'Conditional'  ? 'text-amber-700'
          :                              'text-red-700';
        kpis.push({
            label: `NSC ${n.province}`,
            value: n.rating.toFixed(1),
            sub: `${n.label} · ${n.nscNumber}`,
            accent: 'bg-rose-600',
            valColor: nscTone,
        });
    }

    // Operational headline counts only.
    kpis.push(
        { label: 'Active Drivers',    value: s.driverCount,                sub: 'Currently monitored',                accent: 'bg-blue-400',   valColor: 'text-slate-800' },
        { label: 'OOS Violations',    value: s.oosCount,                   sub: `${s.oosPer100Insp} per 100 insp`,    accent: 'bg-rose-500',   valColor: 'text-slate-800' },
        { label: 'Open Cases',        value: s.openCaseCount,              sub: 'Requires review',                    accent: 'bg-orange-500', valColor: 'text-slate-800' },
        { label: 'Clean Inspections', value: `${s.cleanInspectionRate}%`,  sub: `${s.cleanInspectionCount} passed`,   accent: 'bg-teal-500',   valColor: 'text-slate-800' },
        { label: 'Accidents',         value: s.accidentCount,              sub: 'On record',                          accent: 'bg-red-400',    valColor: 'text-slate-800' },
        { label: 'Violations',        value: s.violationCount,             sub: 'All sources',                        accent: 'bg-purple-400', valColor: 'text-slate-800' },
    );

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            {/* ── KPI cards — single consolidated strip ────────────────── */}
            <div className="mb-5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    {id.legalName} · {id.country === 'CA' ? `Canada (${id.stateOrProvince})` : `USA (${id.stateOrProvince})`}
                </div>
                <div
                    className="flex overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory flex-nowrap hide-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="flex gap-3 min-w-max">
                        {kpis.map(kpi => (
                            <div key={kpi.label} className="bg-white border border-slate-200 rounded-lg overflow-hidden w-[150px] shrink-0 snap-start">
                                <div className={cn('h-0.5 w-full', kpi.accent)} />
                                <div className="px-3 py-2.5">
                                    <div className={cn('text-xl font-black leading-none mb-0.5', kpi.valColor)}>{kpi.value}</div>
                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
                                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">{kpi.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Score scale strip (Very Poor → Excellent) ─────────────── */}
            <div className="mb-6 px-1">
                <div className="flex gap-0.5 mb-1.5">
                    {SCORE_SCALE_SEGMENTS.map(seg => (
                        <div key={seg.label} className="flex flex-col items-center gap-1" style={{ flex: seg.flex }}>
                            <div className="text-[9px] font-semibold text-slate-600 whitespace-nowrap">{seg.label}</div>
                            <div className="text-[8px] text-slate-400 whitespace-nowrap">{seg.range}</div>
                            <div className={cn('h-4 w-full rounded-sm', seg.color)} />
                        </div>
                    ))}
                </div>
                <div className="relative h-4">
                    <div
                        className="absolute flex flex-col items-center transition-all duration-300"
                        style={{ left: `${Math.max(0, Math.min(100, overall))}%`, transform: 'translateX(-50%)' }}
                    >
                        <div className="w-0.5 h-2.5 bg-slate-700" />
                        <span className="text-[9px] font-black text-slate-700 bg-white border border-slate-200 px-1 rounded leading-none py-0.5">
                            {Math.round(overall)}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Fleet ring + 6 sub-score rings ────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 items-stretch">
                {/* Main blue ring */}
                <div className="relative group bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-5 flex flex-col items-center justify-center">
                    <SafetyRingChart
                        size="large"
                        label="Fleet Safety Score"
                        score={overall}
                        palette="blue"
                        subtitle={`${overall.toFixed(1)} / 100`}
                    />
                    <div className="mt-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Hover for breakdown
                    </div>
                    {/* Hover-revealed breakdown card */}
                    <div className="hidden md:block pointer-events-none absolute left-4 right-4 bottom-4 z-10 rounded-xl border border-blue-200 bg-white/95 backdrop-blur-sm p-3 shadow-sm opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                        <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-2">Score Breakdown</div>
                        <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between"><span className="text-slate-500">Accidents</span>      <span className={cn('font-bold', getScoreColor(cards.accident.score))}>{cards.accident.score}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">ELD / HOS</span>     <span className={cn('font-bold', getScoreColor(cards.eld.score))}>{cards.eld.score}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Inspections</span>  <span className={cn('font-bold', getScoreColor(cards.inspection.score))}>{cards.inspection.score}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Drivers</span>      <span className={cn('font-bold', getScoreColor(cards.driver.score))}>{cards.driver.score}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">VEDR</span>         <span className={cn('font-bold', getScoreColor(cards.vedr.score))}>{cards.vedr.score}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Roadside</span>     <span className={cn('font-bold', getScoreColor(cards.roadsideViolation.score))}>{cards.roadsideViolation.score}</span></div>
                            <div className="border-t border-slate-200 pt-1 flex justify-between">
                                <span className="font-bold text-slate-700">Fleet Score</span>
                                <span className={cn('font-black', getScoreColor(overall))}>{overall.toFixed(1)}</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            Based on {score.signals.violationCount} violations · {score.signals.accidentCount} accidents · {score.signals.inspectionCount} inspections
                        </p>
                    </div>
                </div>

                {/* Six sub-rings */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
                    {subRings.map(metric => (
                        <div
                            key={metric.id}
                            className="relative group bg-gradient-to-b from-emerald-50/60 to-slate-50 border border-emerald-100 rounded-2xl p-4 min-h-[190px] flex flex-col justify-start"
                        >
                            <SafetyRingChart label={metric.label} score={metric.value} palette="green" />
                            <div className={cn('mt-2 text-center text-sm font-bold', getScoreColor(metric.value))}>
                                {metric.value.toFixed(2)}%
                            </div>
                            <div className="mt-1 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Hover for more details
                            </div>
                            <div className="hidden md:block pointer-events-none absolute left-3 right-3 top-3 z-10 rounded-xl border border-emerald-200 bg-white/95 backdrop-blur-sm p-3 shadow-sm opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                                <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{metric.label}</div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-1">{metric.purpose}</p>
                                <p className="text-xs text-slate-500 leading-relaxed">{metric.focus}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Score Breakdown (Contribution bar + Risk Ranking + Period Changes) ── */}
            <ScoreBreakdownSection components={score.components} />

            {/* ── Fleet Score Trend chart (historical performance) ──────────────── */}
            <FleetScoreTrendChartSection accountId={accountId} />

            {/* ── TrackSmart points trend (Driver / Asset / Carrier) ─────────────── */}
            <TsPointsTrendSection accountId={accountId} />

            {/* ── Eight-domain risk radar ──────────────────────────────────────── */}
            <DomainRadarSection accountId={accountId} />

            {/* ── Tabbed list view (Incidents / Inspections / HOS-ELD / VEDR) ───── */}
            <SafetyListsSection accountId={accountId} />

            {/* ── Regulatory Details: SMS BASIC + CVOR ────────────────────────────── */}
            <RegulatoryDetailsSection score={score} />
        </div>
    );
}

// ── Score Breakdown section ──────────────────────────────────────────────
function ScoreBreakdownSection({ components }: { components: FleetSafetyScore["components"] }) {
    const sortedRank = [...components].sort((a, b) => a.score - b.score);
    return (
        <div className="border-t border-slate-100 pt-5 mt-5">
            <div className="mb-4">
                <h3 className="text-sm font-bold text-slate-700">Score Breakdown</h3>
                <p className="text-xs text-slate-400 mt-0.5">Component contributions and recent period changes</p>
            </div>
            {/* Contribution bar */}
            <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Overall Contribution Mapping</h4>
                <div className="flex h-10 rounded-xl justify-start overflow-hidden border border-slate-200 shadow-inner">
                    {components.map(c => (
                        <div
                            key={c.label}
                            className={cn(c.color, 'h-full flex items-center justify-center transition-all hover:opacity-90 group relative cursor-pointer')}
                            style={{ width: `${Math.max(5, c.score)}%` }}
                        >
                            <span className="text-[10px] font-black text-white opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                                {c.label} ({c.score.toFixed(0)}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Risk Ranking */}
                <div className="lg:col-span-5 border-r border-slate-100 pr-0 lg:pr-6">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Risk Ranking</h4>
                    <div className="space-y-4">
                        {sortedRank.map(c => (
                            <div key={c.label} className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-700 w-24 truncate">{c.label}</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={cn('h-full rounded-full', c.color)} style={{ width: `${c.score}%` }} />
                                </div>
                                <span className={cn('text-[11px] font-black w-8 text-right', getScoreColor(c.score))}>{c.score.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Period Changes (30d) */}
                <div className="lg:col-span-7">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Period Changes (30d)</h4>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                <th className="py-2 pr-3">Component</th>
                                <th className="py-2 px-3 text-right">Current Score</th>
                                <th className="py-2 px-3 text-right">Previous (30d)</th>
                                <th className="py-2 pl-3 text-right">Trend Delta</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs">
                            {components.map(c => {
                                const delta = c.score - c.prev;
                                return (
                                    <tr key={c.label} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-2.5 pr-3 font-semibold text-slate-700">{c.label}</td>
                                        <td className={cn('py-2.5 px-3 text-right font-black', getScoreColor(c.score))}>{c.score.toFixed(1)}</td>
                                        <td className="py-2.5 px-3 text-right text-slate-500">{c.prev.toFixed(1)}</td>
                                        <td className={cn('py-2.5 pl-3 text-right font-bold', delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-red-500' : 'text-slate-300')}>
                                            {delta > 0 ? `+${Math.abs(delta).toFixed(1)}` : delta < 0 ? `-${Math.abs(delta).toFixed(1)}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ── Fleet Score Trend chart ──────────────────────────────────────────────
// Past N-month line chart with industry-average reference line. The operator
// can switch the lookback window via the inline period selector.

const TREND_PERIODS = [
    { id: '3m',  label: '3M',  months: 3 },
    { id: '6m',  label: '6M',  months: 6 },
    { id: '12m', label: '12M', months: 12 },
    { id: '24m', label: '24M', months: 24 },
] as const;
type TrendPeriodId = (typeof TREND_PERIODS)[number]['id'];

// ── TrackSmart points trend (Driver / Asset / Carrier) — line chart ─────
type TsSeriesKey = 'driver' | 'asset' | 'carrier';

const TS_PERIODS = [
    { id: '3m',  label: '3M',  months: 3  },
    { id: '6m',  label: '6M',  months: 6  },
    { id: '12m', label: '12M', months: 12 },
    { id: '24m', label: '24M', months: 24 },
    { id: '36m', label: '36M', months: 36 },
] as const;
type TsPeriodId = (typeof TS_PERIODS)[number]['id'];

function TsPointsTrendSection({
    accountId, series, title, subtitle, noBorderTop,
}: {
    accountId: string | undefined;
    /** Which series to render — defaults to all three on the Safety Dashboard. */
    series?: TsSeriesKey[];
    title?: string;
    subtitle?: string;
    /** Hide the top divider when used as the lead element of a tab. */
    noBorderTop?: boolean;
}) {
    const visible: TsSeriesKey[] = series ?? ['driver', 'asset', 'carrier'];
    const [periodId, setPeriodId] = useState<TsPeriodId>('12m');
    const months = TS_PERIODS.find(p => p.id === periodId)?.months ?? 12;
    const points = useMemo(() => computeMonthlyTsPoints(accountId, months), [accountId, months]);
    const totals = useMemo(() => points.reduce(
        (s, p) => ({ d: s.d + p.driverPts, a: s.a + p.assetPts, c: s.c + p.carrierPts, ev: s.ev + p.eventCount }),
        { d: 0, a: 0, c: 0, ev: 0 },
    ), [points]);

    const monthsLabel = months === 12 ? '12 months' : months === 24 ? '24 months' : `${months} mo`;
    const resolvedTitle = title ?? (
        visible.length === 1
            ? `${visible[0] === 'driver' ? 'Driver' : visible[0] === 'asset' ? 'Asset' : 'Carrier'} points (${monthsLabel})`
            : `TrackSmart points (${monthsLabel})`
    );
    const resolvedSubtitle = subtitle ?? (
        visible.length === 1
            ? `Monthly ${visible[0]} points caused by violations on the carrier's ledger.`
            : `Monthly Driver / Asset / Carrier points caused by violations on the carrier's ledger.`
    );

    return (
        <div className={cn(!noBorderTop && 'border-t border-slate-100 pt-5 mt-2')}>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">{resolvedTitle}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{resolvedSubtitle}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Legend (always shows totals for the active window) */}
                        <div className="flex items-center gap-3 text-[10px] font-semibold">
                            {visible.includes('driver') && (
                                <span className="inline-flex items-center gap-1.5 text-blue-700">
                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                    Driver <span className="text-slate-400">· {totals.d.toLocaleString()}</span>
                                </span>
                            )}
                            {visible.includes('asset') && (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                    Asset <span className="text-slate-400">· {totals.a.toLocaleString()}</span>
                                </span>
                            )}
                            {visible.includes('carrier') && (
                                <span className="inline-flex items-center gap-1.5 text-violet-700">
                                    <span className="h-2 w-2 rounded-full bg-violet-500" />
                                    Carrier <span className="text-slate-400">· {totals.c.toLocaleString()}</span>
                                </span>
                            )}
                        </div>
                        {/* Month-range selector */}
                        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                            {TS_PERIODS.map(p => {
                                const active = periodId === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPeriodId(p.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md text-[10px] font-bold transition-colors',
                                            active
                                                ? 'bg-white text-blue-700 ring-1 ring-blue-200 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700',
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <TsPointsLineChart points={points} series={visible} />
            </div>
        </div>
    );
}

function TsPointsLineChart({
    points, series: visible,
}: {
    points: MonthlyTsPoint[];
    series?: TsSeriesKey[];
}) {
    const W = 720, H = 220, padL = 36, padR = 16, padT = 14, padB = 26;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    if (points.length === 0) {
        return <div className="h-[180px] flex items-center justify-center text-xs text-slate-400">No data</div>;
    }
    const visibleSet = new Set<TsSeriesKey>(visible ?? ['driver', 'asset', 'carrier']);

    // Only consider visible series for the y-axis max.
    const peakValues = points.flatMap(p => [
        visibleSet.has('driver')  ? p.driverPts  : 0,
        visibleSet.has('asset')   ? p.assetPts   : 0,
        visibleSet.has('carrier') ? p.carrierPts : 0,
    ]);
    const maxV = Math.max(1, ...peakValues);
    const yMax = Math.ceil(maxV / 5) * 5 || 5;
    const x = (i: number) => padL + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = (v: number) => padT + innerH * (1 - v / yMax);

    const allSeries = [
        { id: 'driver'  as TsSeriesKey, label: 'Driver',  color: '#3b82f6', valuesKey: 'driverPts'  as const, fillId: 'ts-driver-fill'  },
        { id: 'asset'   as TsSeriesKey, label: 'Asset',   color: '#10b981', valuesKey: 'assetPts'   as const, fillId: 'ts-asset-fill'   },
        { id: 'carrier' as TsSeriesKey, label: 'Carrier', color: '#8b5cf6', valuesKey: 'carrierPts' as const, fillId: 'ts-carrier-fill' },
    ];
    const series = allSeries.filter(s => visibleSet.has(s.id));

    const buildPath = (key: keyof MonthlyTsPoint, area: boolean) => {
        const line = points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(Number(p[key])).toFixed(1)}`)
            .join(' ');
        if (!area) return line;
        return `${line} L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`;
    };

    // Tick labels — every 2nd month, plus first + last.
    const xStride = Math.max(1, Math.ceil(points.length / 7));
    const yTicks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map(v => Math.round(v));

    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const cursorX = ((e.clientX - rect.left) / rect.width) * W;
        let best = 0, bestD = Infinity;
        for (let i = 0; i < points.length; i++) {
            const d = Math.abs(x(i) - cursorX);
            if (d < bestD) { bestD = d; best = i; }
        }
        setHoverIdx(best);
    };
    const hovered = hoverIdx != null ? points[hoverIdx] : null;

    return (
        <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }} onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                    {series.map(s => (
                        <linearGradient key={s.fillId} id={s.fillId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={s.color} stopOpacity="0.18" />
                            <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                        </linearGradient>
                    ))}
                </defs>
                {/* Y gridlines */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray={v === 0 ? '0' : '2 3'} />
                        <text x={padL - 6} y={y(v) + 3} fontSize="9" textAnchor="end" fill="#94a3b8" fontWeight="600">{v}</text>
                    </g>
                ))}
                {/* Hover vertical line */}
                {hovered && (
                    <line x1={x(hoverIdx!)} x2={x(hoverIdx!)} y1={padT} y2={padT + innerH} stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" />
                )}
                {/* Area + line per series */}
                {series.map(s => (
                    <g key={s.id}>
                        <path d={buildPath(s.valuesKey, true)} fill={`url(#${s.fillId})`} />
                        <path d={buildPath(s.valuesKey, false)} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((p, i) => {
                            const isH = hoverIdx === i;
                            const v = Number(p[s.valuesKey]);
                            if (!isH && v === 0) return null;
                            return (
                                <circle key={`${s.id}-${i}`} cx={x(i)} cy={y(v)} r={isH ? 4 : 2.5} fill="white" stroke={s.color} strokeWidth={isH ? 2 : 1.5} />
                            );
                        })}
                    </g>
                ))}
                {/* X labels */}
                {points.map((p, i) => {
                    if (i % xStride !== 0 && i !== points.length - 1) return null;
                    return (
                        <text key={`xl-${p.date}`} x={x(i)} y={H - padB / 2 + 6} fontSize="9" textAnchor="middle" fill={i === 0 || i === points.length - 1 ? '#3b82f6' : '#94a3b8'} fontWeight="600">
                            {p.date.slice(0, 7)}
                        </text>
                    );
                })}
            </svg>
            {hovered && (() => {
                const left = (x(hoverIdx!) / W) * 100;
                const flip = left > 65;
                return (
                    <div className="pointer-events-none absolute z-10"
                        style={{
                            left:  flip ? 'auto' : `calc(${left}% + 10px)`,
                            right: flip ? `calc(${100 - left}% + 10px)` : 'auto',
                            top:   8,
                        }}>
                        <div className="bg-slate-900 text-white rounded-lg shadow-lg px-3 py-2 min-w-[180px]">
                            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1.5">{hovered.date.slice(0, 7)} · {hovered.eventCount} viol.</div>
                            <div className="space-y-1">
                                <div className="flex items-center justify-between gap-3 text-[10px]">
                                    <span className="inline-flex items-center gap-1.5 text-blue-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Driver
                                    </span>
                                    <span className="font-black tabular-nums">{hovered.driverPts}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[10px]">
                                    <span className="inline-flex items-center gap-1.5 text-emerald-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Asset
                                    </span>
                                    <span className="font-black tabular-nums">{hovered.assetPts}</span>
                                </div>
                                <div className="flex items-center justify-between gap-3 text-[10px]">
                                    <span className="inline-flex items-center gap-1.5 text-violet-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Carrier
                                    </span>
                                    <span className="font-black tabular-nums">{hovered.carrierPts}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

function FleetScoreTrendChartSection({ accountId }: { accountId: string | undefined }) {
    const [period, setPeriod] = useState<TrendPeriodId>('12m');
    const months = TREND_PERIODS.find(p => p.id === period)?.months ?? 12;
    const points = useMemo(() => computeFleetScoreTrend(accountId, months), [accountId, months]);

    const periodLabel =
        period === '3m'  ? 'Past 3 months' :
        period === '6m'  ? 'Past 6 months' :
        period === '12m' ? 'Past 12 months' :
                           'Past 24 months';

    return (
        <div className="border-t border-slate-100 pt-5 mt-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Fleet Score Trend</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{periodLabel} historical performance vs benchmark</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Legend */}
                        <div className="flex items-center gap-3 text-[10px] font-semibold">
                            <span className="inline-flex items-center gap-1.5 text-slate-700">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                Fleet Score
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-500">
                                <span className="inline-block w-4 border-t-2 border-dashed border-slate-400" />
                                Industry Avg
                            </span>
                        </div>
                        {/* Period selector */}
                        <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 border border-slate-200">
                            {TREND_PERIODS.map(p => {
                                const active = period === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPeriod(p.id)}
                                        className={cn(
                                            'inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md text-[10px] font-bold transition-colors',
                                            active
                                                ? 'bg-white text-blue-700 ring-1 ring-blue-200 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-700',
                                        )}
                                    >
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <TrendChart points={points} />
            </div>
        </div>
    );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
    // Responsive viewBox-based chart. Width=720, Height=240, padding for axes.
    const W = 720, H = 240, padL = 40, padR = 20, padT = 20, padB = 30;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const allValues = points.flatMap(p => [p.fleetScore, p.industryAvg]);
    const rawMin = points.length > 0 ? Math.min(...allValues) : 0;
    const rawMax = points.length > 0 ? Math.max(...allValues) : 100;
    const yMin = Math.max(0,   Math.floor((rawMin - 8) / 5) * 5);
    const yMax = Math.min(100, Math.ceil((rawMax + 8) / 5) * 5);

    const x = (i: number) => padL + (points.length <= 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
    const y = (v: number) => padT + innerH * (1 - (v - yMin) / Math.max(1, (yMax - yMin)));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(p.fleetScore).toFixed(1)}`).join(' ');
    const areaPath = points.length > 0
        ? `${linePath} L ${x(points.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
        : '';
    const industryAvg = points[0]?.industryAvg ?? 82;
    const yIndustry = y(industryAvg);

    const stepCandidates = [2, 5, 10, 20];
    const range = yMax - yMin;
    const step = stepCandidates.find(s => range / s <= 5) ?? 10;
    const yTicks: number[] = [];
    for (let v = yMin; v <= yMax; v += step) yTicks.push(v);

    const xLabelStride = Math.max(1, Math.ceil(points.length / 7));

    // ── Hover state (tracks the index of the focused data point) ────────
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || points.length === 0) return;
        // Translate the pointer position back into the SVG viewBox space.
        const cursorX = ((e.clientX - rect.left) / rect.width) * W;
        // Pick the index whose anchor x is closest to the cursor.
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < points.length; i++) {
            const d = Math.abs(x(i) - cursorX);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        setHoverIdx(bestIdx);
    };
    const handleLeave = () => setHoverIdx(null);

    if (points.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-xs text-slate-400">
                Not enough data to render the trend chart.
            </div>
        );
    }

    const hovered = hoverIdx != null ? points[hoverIdx] : null;
    const hoveredX = hoverIdx != null ? x(hoverIdx) : 0;
    const hoveredY = hovered ? y(hovered.fleetScore) : 0;
    const delta = hovered ? hovered.fleetScore - hovered.industryAvg : 0;
    // Compute tooltip pixel position relative to the rendered container.
    const tooltipLeftPct = points.length > 1 ? (hoveredX / W) * 100 : 50;
    const tooltipTopPct  = hovered ? (hoveredY / H) * 100 : 50;
    // Flip the tooltip to the left side when hovering near the right edge so
    // it stays inside the chart frame.
    const tooltipOnLeft = tooltipLeftPct > 65;

    return (
        <div
            ref={containerRef}
            className="relative w-full select-none"
            style={{ aspectRatio: `${W} / ${H}`, maxHeight: 320 }}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
        >
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="fleetScoreFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.18" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Y gridlines + labels */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line
                            x1={padL} x2={W - padR}
                            y1={y(v)} y2={y(v)}
                            stroke="#e2e8f0" strokeWidth={1}
                            strokeDasharray={v === yMin ? '0' : '2 4'}
                        />
                        <text x={padL - 8} y={y(v) + 3} fontSize="10" textAnchor="end" fill="#94a3b8" fontWeight="600">
                            {v}
                        </text>
                    </g>
                ))}

                {/* Industry-avg dashed line */}
                <line
                    x1={padL} x2={W - padR}
                    y1={yIndustry} y2={yIndustry}
                    stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="6 4"
                />
                <text x={W - padR - 2} y={yIndustry - 4} fontSize="10" textAnchor="end" fill="#64748b" fontWeight="700">
                    Avg
                </text>

                {/* Vertical hover reference line */}
                {hovered && (
                    <line
                        x1={hoveredX} x2={hoveredX}
                        y1={padT} y2={padT + innerH}
                        stroke="#3b82f6" strokeWidth={1} strokeDasharray="3 3" opacity={0.5}
                    />
                )}

                {/* Fleet-score area + line */}
                {areaPath && <path d={areaPath} fill="url(#fleetScoreFill)" />}
                <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

                {/* Data points */}
                {points.map((p, i) => {
                    const isHovered = hoverIdx === i;
                    return (
                        <circle
                            key={p.date}
                            cx={x(i)} cy={y(p.fleetScore)}
                            r={isHovered ? 6.5 : 4.5}
                            fill="white"
                            stroke="#3b82f6"
                            strokeWidth={isHovered ? 3 : 2}
                        />
                    );
                })}

                {/* X-axis labels */}
                {points.map((p, i) => {
                    if (i % xLabelStride !== 0 && i !== points.length - 1) return null;
                    return (
                        <text
                            key={`xl-${p.date}`}
                            x={x(i)} y={H - padB / 2 + 4}
                            fontSize="9.5"
                            textAnchor="middle"
                            fill={i === 0 || i === points.length - 1 ? '#3b82f6' : '#94a3b8'}
                            fontWeight="600"
                        >
                            {fmtMonthShort(p.date)}
                        </text>
                    );
                })}
            </svg>

            {/* Floating tooltip card */}
            {hovered && (
                <div
                    className="pointer-events-none absolute z-10"
                    style={{
                        left:  tooltipOnLeft ? 'auto' : `calc(${tooltipLeftPct}% + 12px)`,
                        right: tooltipOnLeft ? `calc(${100 - tooltipLeftPct}% + 12px)` : 'auto',
                        top:   `calc(${tooltipTopPct}% - 50px)`,
                    }}
                >
                    <div className="bg-slate-900 text-white rounded-lg shadow-lg px-3 py-2 min-w-[160px]">
                        <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1.5">
                            {fmtMonthYear(hovered.date)}
                        </div>
                        <div className="flex items-center justify-between gap-3 mb-1">
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-300">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Fleet Score
                            </span>
                            <span className="text-sm font-black tabular-nums">{hovered.fleetScore.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
                                <span className="inline-block w-2.5 border-t-2 border-dashed border-slate-400" /> Industry Avg
                            </span>
                            <span className="text-xs font-bold text-slate-200 tabular-nums">{hovered.industryAvg.toFixed(1)}</span>
                        </div>
                        <div className={cn(
                            'mt-1 pt-1.5 border-t border-slate-700 flex items-center justify-between gap-3 text-[10px] font-bold',
                            delta >= 0 ? 'text-emerald-400' : 'text-rose-400',
                        )}>
                            <span>vs Avg</span>
                            <span className="tabular-nums">{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function fmtMonthShort(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short' }) + ' ' + String(d.getFullYear()).slice(-2);
}

// ── Eight-domain risk radar ──────────────────────────────────────────────
function DomainRadarSection({ accountId }: { accountId: string | undefined }) {
    const points = useMemo(() => computeDomainRadar(accountId), [accountId]);

    return (
        <div className="border-t border-slate-100 pt-5 mt-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Domain radar</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">Eight risk domains across this carrier's events.</p>
                    </div>
                    <div className="text-slate-400">
                        <Info size={16} />
                    </div>
                </div>
                <RadarChart points={points} />
            </div>
        </div>
    );
}

function RadarChart({ points }: { points: DomainRadarPoint[] }) {
    // viewBox: keep a comfortable margin for axis labels around the polygon.
    const W = 380, H = 300;
    const cx = W / 2, cy = H / 2 + 4;
    const radius = 95;
    const rings = [25, 50, 75, 100];
    const n = points.length;

    // Angles start at 12 o'clock and proceed clockwise.
    const angle = (i: number) => (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    const axisPoint = (i: number, r: number) => ({
        x: cx + r * Math.cos(angle(i)),
        y: cy + r * Math.sin(angle(i)),
    });
    const labelPoint = (i: number, r: number) => {
        // Push labels a touch beyond the outer ring.
        return {
            x: cx + (r + 22) * Math.cos(angle(i)),
            y: cy + (r + 22) * Math.sin(angle(i)),
        };
    };

    // Data polygon vertices.
    const polygon = points
        .map((p, i) => axisPoint(i, (p.score / 100) * radius))
        .map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
        .join(' ');

    const [hoverIdx, setHoverIdx] = useState<number | null>(null);

    if (points.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
                Not enough data to render the domain radar.
            </div>
        );
    }

    return (
        <div className="relative mx-auto" style={{ width: '100%', maxWidth: 460, aspectRatio: `${W} / ${H}` }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Concentric grid */}
                {rings.map(r => (
                    <polygon
                        key={r}
                        points={points.map((_, i) => {
                            const p = axisPoint(i, (r / 100) * radius);
                            return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                        }).join(' ')}
                        fill="none"
                        stroke={r === 100 ? '#cbd5e1' : '#e2e8f0'}
                        strokeWidth={1}
                    />
                ))}

                {/* Axes */}
                {points.map((_, i) => {
                    const outer = axisPoint(i, radius);
                    return (
                        <line
                            key={`axis-${i}`}
                            x1={cx} y1={cy}
                            x2={outer.x} y2={outer.y}
                            stroke="#e2e8f0" strokeWidth={1}
                        />
                    );
                })}

                {/* Tick labels (0 / 25 / 50 / 75 / 100) — placed along the top axis */}
                {[0, ...rings].map(r => {
                    const y = cy - (r / 100) * radius;
                    return (
                        <text
                            key={`tick-${r}`}
                            x={cx - 4} y={y + 3}
                            fontSize="9"
                            textAnchor="end"
                            fill="#94a3b8"
                        >
                            {r}
                        </text>
                    );
                })}

                {/* Data area */}
                <polygon
                    points={polygon}
                    fill="#3b82f6" fillOpacity="0.18"
                    stroke="#3b82f6" strokeWidth={1.5} strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map((p, i) => {
                    const pt = axisPoint(i, (p.score / 100) * radius);
                    const isHovered = hoverIdx === i;
                    return (
                        <circle
                            key={`pt-${p.domain}`}
                            cx={pt.x} cy={pt.y}
                            r={isHovered ? 5 : 3}
                            fill="#3b82f6"
                            stroke="white"
                            strokeWidth={isHovered ? 2 : 1.5}
                            onMouseEnter={() => setHoverIdx(i)}
                            onMouseLeave={() => setHoverIdx(prev => (prev === i ? null : prev))}
                            style={{ cursor: 'pointer' }}
                        />
                    );
                })}

                {/* Axis labels */}
                {points.map((p, i) => {
                    const lp = labelPoint(i, radius);
                    const ang = angle(i);
                    // Anchor labels so they align nicely around the polygon.
                    const cos = Math.cos(ang), sin = Math.sin(ang);
                    const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
                    const dy = sin > 0.5 ? 10 : sin < -0.5 ? -2 : 4;
                    return (
                        <text
                            key={`lbl-${p.domain}`}
                            x={lp.x} y={lp.y + dy}
                            fontSize="11"
                            textAnchor={anchor}
                            fill={hoverIdx === i ? '#0f172a' : '#475569'}
                            fontWeight={hoverIdx === i ? 700 : 600}
                        >
                            {p.domain}
                        </text>
                    );
                })}
            </svg>

            {/* Hover tooltip */}
            {hoverIdx !== null && (() => {
                const p = points[hoverIdx];
                const pt = axisPoint(hoverIdx, (p.score / 100) * radius);
                const left = (pt.x / W) * 100;
                const top  = (pt.y / H) * 100;
                const flipLeft = left > 60;
                return (
                    <div
                        className="pointer-events-none absolute z-10"
                        style={{
                            left:  flipLeft ? 'auto' : `calc(${left}% + 10px)`,
                            right: flipLeft ? `calc(${100 - left}% + 10px)` : 'auto',
                            top:   `calc(${top}% - 36px)`,
                        }}
                    >
                        <div className="bg-slate-900 text-white rounded-lg shadow-lg px-3 py-2 min-w-[150px]">
                            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1">{p.domain}</div>
                            <div className="flex items-baseline justify-between gap-3">
                                <span className="text-lg font-black tabular-nums text-blue-300">{Math.round(p.score)}</span>
                                <span className="text-[10px] text-slate-400">/100</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                {p.events} event{p.events === 1 ? '' : 's'}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// ── Tabbed Safety Lists (Incidents / Inspections / HOS-ELD / VEDR) ───────
// One card with a tab strip up top, four KPI tiles, and a scrollable table
// per tab. All data sourced from the active carrier's live data helpers.

type SafetyListTab = "incidents" | "violations" | "hos" | "vedr";

function SafetyListsSection({ accountId }: { accountId: string | undefined }) {
    const [tab, setTab] = useState<SafetyListTab>("incidents");
    const id = accountId ?? "acct-001";

    return (
        <div className="border-t border-slate-100 pt-5 mt-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Tab strip */}
                <div className="border-b border-slate-200 px-2 flex items-stretch gap-1 overflow-x-auto">
                    {([
                        { id: 'incidents',   label: 'Incidents'  },
                        { id: 'violations',  label: 'Violations' },
                        { id: 'hos',         label: 'HOS / ELD'  },
                        { id: 'vedr',        label: 'VEDR'       },
                    ] as { id: SafetyListTab; label: string }[]).map(t => {
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTab(t.id)}
                                className={cn(
                                    'relative h-11 px-4 text-[11px] font-bold uppercase tracking-wider transition-colors whitespace-nowrap',
                                    active ? 'text-blue-700' : 'text-slate-500 hover:text-slate-700',
                                )}
                            >
                                {t.label}
                                {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-blue-600 rounded-t" />}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4">
                    {tab === "incidents"   && <IncidentsTab accountId={id} />}
                    {tab === "violations"  && <ViolationsTab accountId={id} />}
                    {tab === "hos"         && <HosTab accountId={id} />}
                    {tab === "vedr"        && <VedrTab accountId={id} />}
                </div>
            </div>
        </div>
    );
}

// ── Shared filter-tab strip (used by Incidents + Violations) ─────────────
interface FilterTabDef<Id extends string> {
    id: Id;
    label: string;
    /** Optional icon shown to the left of the label. */
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    /** Count shown in the trailing pill (always rendered, even if zero). */
    count: number;
}

// ── Pill / bubble filter strip (used by Incidents + Violations) ──────────
// Wraps onto multiple lines when the row gets crowded so we never end up with
// an awkward horizontal scrollbar under the pills.
function FilterPillStrip<Id extends string>({
    tabs, active, onSelect, dense,
}: {
    tabs: FilterTabDef<Id>[];
    active: Id;
    onSelect: (id: Id) => void;
    /** When true, removes the bottom margin so the strip can sit inline with other controls. */
    dense?: boolean;
}) {
    return (
        <div className={cn('flex items-center gap-2 flex-wrap', !dense && 'mb-4')}>
            {tabs.map(t => {
                const isActive = active === t.id;
                return (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelect(t.id)}
                        className={cn(
                            'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all',
                            isActive
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
                        )}
                    >
                        <span>{t.label}</span>
                        <span className={cn(
                            'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] tabular-nums font-bold',
                            isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500',
                        )}>
                            {t.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Risk filter chip (small dot + label + count) ─────────────────────────
function RiskChip({
    active, onClick, dot, label, count,
}: {
    active: boolean;
    onClick: () => void;
    dot: string;
    label: string;
    count: number;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border text-[11px] font-semibold whitespace-nowrap transition-all',
                active
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
            )}
        >
            <span className={cn('h-2 w-2 rounded-full', dot)} />
            <span>{label}</span>
            <span className={cn(
                'inline-flex items-center justify-center min-w-[20px] h-4 px-1 rounded text-[10px] tabular-nums font-bold',
                active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
            )}>
                {count.toLocaleString()}
            </span>
        </button>
    );
}

// ── KPI tile + reusable bits ─────────────────────────────────────────────
function KpiTile({ value, label, tone = "slate" }: { value: React.ReactNode; label: string; tone?: "slate" | "amber" | "red" | "emerald" }) {
    const valTone =
        tone === "amber"   ? "text-amber-600"
      : tone === "red"     ? "text-red-600"
      : tone === "emerald" ? "text-emerald-600"
      :                      "text-slate-900";
    return (
        <div className="border border-slate-200 rounded-lg px-4 py-3 bg-white">
            <div className={cn("text-2xl font-black leading-none tabular-nums", valTone)}>{value}</div>
            <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mt-1">{label}</div>
        </div>
    );
}

function YesNoBadge({ value }: { value: boolean | null | undefined }) {
    if (value === null || value === undefined) {
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400">—</span>;
    }
    return value
        ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Yes</span>
        : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">No</span>;
}

function PreventableBadge({ value }: { value: "tbd" | "preventable" | "non_preventable" | null }) {
    if (value === "preventable")     return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">Yes</span>;
    if (value === "non_preventable") return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">No</span>;
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">TBD</span>;
}

// ── Incidents tab ────────────────────────────────────────────────────────
type AccidentFilter = "all" | "hazmat" | "tow" | "injuries" | "fatalities";

function IncidentsTab({ accountId }: { accountId: string }) {
    const incidents = useMemo(() => getAccidentsForCarrier(accountId), [accountId]);

    // Filter chips (counts always reflect the *full* roster, not the filtered subset).
    const filters: { id: AccidentFilter; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; rows: any[] }[] = useMemo(() => {
        const hazmat     = incidents.filter(a => !!a?.severity?.hazmatReleased);
        const tow        = incidents.filter(a => !!a?.severity?.towAway);
        const injuries   = incidents.filter(a => (a?.severity?.injuriesNonFatal ?? 0) > 0);
        const fatalities = incidents.filter(a => (a?.severity?.fatalities      ?? 0) > 0);
        return [
            { id: 'all',        label: 'All Accidents', icon: AlertTriangle, rows: incidents },
            { id: 'hazmat',     label: 'Hazmat',        icon: Activity,      rows: hazmat },
            { id: 'tow',        label: 'Tow Away',      icon: Truck,         rows: tow },
            { id: 'injuries',   label: 'Injuries',      icon: User,          rows: injuries },
            { id: 'fatalities', label: 'Fatalities',    icon: UserX,         rows: fatalities },
        ];
    }, [incidents]);

    const [active, setActive] = useState<AccidentFilter>('all');
    const activeRows = filters.find(f => f.id === active)?.rows ?? incidents;
    // Sort the whole bucket most-recent-first, then paginate 10 per page.
    const sortedRows = useMemo(
        () => [...activeRows].sort((a, b) => String(b?.occurredAt ?? '').localeCompare(String(a?.occurredAt ?? ''))),
        [activeRows],
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    useEffect(() => { setPage(1); }, [active]); // reset to first page on filter change
    const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    useEffect(() => { setSelectedIdx(null); }, [active, page]);
    const selected = selectedIdx != null ? visibleRows[selectedIdx] : null;

    // KPI tiles reflect the filtered subset.
    const total = activeRows.length;
    const preventableCount = activeRows.filter(a => a?.preventability?.isPreventable === true).length;
    const preventablePct = total > 0 ? Math.round((preventableCount / total) * 100) : 0;
    const injuriesFatal = activeRows.reduce((s, a) => s + ((a?.severity?.fatalities ?? 0) + (a?.severity?.injuriesNonFatal ?? 0)), 0);
    const totalCost = activeRows.reduce((s, a) => s + (a?.costs?.totalAccidentCosts ?? 0), 0);

    return (
        <>
            <FilterPillStrip
                tabs={filters.map(f => ({ id: f.id, label: f.label, count: f.rows.length }))}
                active={active}
                onSelect={setActive}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiTile value={total}                                                  label="Total Incidents" />
                <KpiTile value={<span>{preventableCount} <span className="text-amber-500 text-base">({preventablePct}%)</span></span>} label="Preventable" tone="amber" />
                <KpiTile value={injuriesFatal}                                          label="Injuries / Fatal" tone="red" />
                <KpiTile value={fmtMoney(totalCost)}                                    label="Total Cost" />
            </div>

            <DataTable
                head={['ID','Date','Driver','Location','Inj/Fatal','Tow','Hazmat','Preventable','Penalty','Cost']}
                rows={visibleRows.map(a => {
                    const inj = (a?.severity?.fatalities ?? 0) + (a?.severity?.injuriesNonFatal ?? 0);
                    return [
                        <span className="font-mono text-[10px] text-slate-500">{a?.incidentId ?? '—'}</span>,
                        <span className="font-mono text-[11px]">{(a?.occurredAt ?? '').slice(0, 10) || '—'}</span>,
                        a?.driver?.name ?? '—',
                        a?.location?.full || `${a?.location?.city ?? ''}${a?.location?.stateOrProvince ? `, ${a.location.stateOrProvince}` : ''}` || '—',
                        <span className={inj > 0 ? 'text-red-600 font-bold tabular-nums' : 'text-slate-400'}>{inj > 0 ? inj : '—'}</span>,
                        <YesNoBadge value={!!a?.severity?.towAway} />,
                        <YesNoBadge value={!!a?.severity?.hazmatReleased} />,
                        <PreventableBadge value={a?.preventability?.value ?? null} />,
                        <span className={cn('font-bold tabular-nums', (a?.severity?.fatalities ?? 0) > 0 ? 'text-red-600' : 'text-amber-600')}>{Math.round(((a?.severity?.fatalities ?? 0) * 30) + ((a?.severity?.injuriesNonFatal ?? 0) * 20) + ((a?.severity?.towAway ? 25 : 0)) + 30) || '—'}</span>,
                        <span className="font-bold tabular-nums">{fmtMoney(a?.costs?.totalAccidentCosts ?? 0)}</span>,
                    ];
                })}
                emptyMessage="No incidents in this severity bucket."
                selectedIndex={selectedIdx}
                onSelectRow={(i) => setSelectedIdx(selectedIdx === i ? null : i)}
                pagination={{ page, pageSize, totalRows: sortedRows.length, onPageChange: setPage, onPageSizeChange: setPageSize }}
            />

            {selected && (
                <RowDetailPanel
                    title={selected.incidentId ?? 'Incident'}
                    registration={(selected.occurredAt ?? '').slice(0, 10)}
                    statusBadge={
                        (selected.severity?.fatalities ?? 0) > 0
                            ? { label: 'Fatal',         tone: 'alert' }
                          : (selected.severity?.injuriesNonFatal ?? 0) > 0
                            ? { label: 'Injury',        tone: 'warn'  }
                          : selected.severity?.towAway
                            ? { label: 'Tow Away',      tone: 'warn'  }
                          : { label: 'Property Damage', tone: 'info' }
                    }
                    fields={[
                        { label: 'Driver',          value: selected.driver?.name },
                        { label: 'Driver Type',     value: selected.driver?.driverType },
                        { label: 'License',         value: selected.driver?.license },
                        { label: 'Asset',           value: selected.vehicles?.[0]?.licenseNumber ?? selected.vehicles?.[0]?.assetId },
                        { label: 'Make / Model',    value: `${selected.vehicles?.[0]?.make ?? ''} ${selected.vehicles?.[0]?.model ?? ''} ${selected.vehicles?.[0]?.year ?? ''}`.trim() || '—' },
                        { label: 'Location',        value: selected.location?.full ?? `${selected.location?.city ?? ''}, ${selected.location?.stateOrProvince ?? ''}` },
                        { label: 'Cause',           value: selected.cause?.primaryCause },
                        { label: 'Accident Type',   value: selected.cause?.incidentType },
                        { label: 'Fatalities',      value: selected.severity?.fatalities ?? 0 },
                        { label: 'Injuries',        value: selected.severity?.injuriesNonFatal ?? 0 },
                        { label: 'Tow Away',        value: selected.severity?.towAway ? 'Yes' : 'No' },
                        { label: 'Hazmat Released', value: selected.severity?.hazmatReleased ? 'Yes' : 'No' },
                        { label: 'Preventability',  value: selected.preventability?.value },
                        { label: 'Status',          value: selected.status?.label },
                        { label: 'Police Report',   value: selected.references?.policeReportNumber },
                        { label: 'Insurance',       value: selected.insurance?.carrierName },
                        { label: 'Adjuster',        value: selected.insurance?.adjusterName },
                        { label: 'Total Cost',      value: fmtMoney(selected.costs?.totalAccidentCosts ?? 0) },
                    ]}
                    onClose={() => setSelectedIdx(null)}
                />
            )}
        </>
    );
}

const CA_PROVINCES = new Set(["ON","AB","BC","MB","NB","NL","NS","PE","QC","SK","YT","NT","NU"]);

interface InspectionBuckets {
    sms:  any[];                       // US states
    cvor: any[];                       // Ontario
    nsc:  Record<string, any[]>;       // other CA provinces, keyed by code
}


function SourceBadge({ state }: { state: string }) {
    const st = String(state ?? "").toUpperCase();
    if (st === "ON")               return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">CVOR</span>;
    if (CA_PROVINCES.has(st))      return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">NSC · {st}</span>;
    return                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">SMS</span>;
}

// ── Violations tab ───────────────────────────────────────────────────────
// Sub-tabbed by issuing regulator (SMS / CVOR / each provincial NSC), keyed
// off the locationState column on each violation row.
function ViolationsTab({ accountId }: { accountId: string }) {
    const violations = useMemo(() => getViolationsForCarrier(accountId), [accountId]);

    // Pull the carrier's registration set — we only want pills for
    // jurisdictions the carrier is actually registered in.
    const registered = useMemo(() => {
        const acct = ACCOUNTS_DB.find(a => a.id === accountId);
        const provs = new Set<string>();
        if (acct?.nscNumber) {
            const p = acct.nscNumber.split("-")[0]?.toUpperCase();
            if (p) provs.add(p);
        }
        for (const n of acct?.nscNumbers ?? []) {
            const p = n.split("-")[0]?.toUpperCase();
            if (p) provs.add(p);
        }
        return {
            hasFmcsa: !!acct?.dotNumber,
            hasCvor:  !!acct?.cvorNumber,
            nscProvinces: new Set(Array.from(provs).filter(p => p !== "ON")),
        };
    }, [accountId]);

    const buckets = useMemo(() => bucketViolations(violations), [violations]);

    const subTabs = useMemo(() => {
        const out: { id: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; count: number; rows: any[] }[] = [
            { id: 'all', label: 'All', icon: FileWarning, count: violations.length, rows: violations },
        ];
        if (registered.hasFmcsa && buckets.sms.length  > 0) {
            out.push({ id: 'sms',  label: 'SMS · FMCSA',    icon: Shield, count: buckets.sms.length,  rows: buckets.sms });
        }
        if (registered.hasCvor && buckets.cvor.length > 0) {
            out.push({ id: 'cvor', label: 'CVOR · Ontario', icon: MapPin, count: buckets.cvor.length, rows: buckets.cvor });
        }
        for (const prov of Object.keys(buckets.nsc).sort()) {
            if (!registered.nscProvinces.has(prov)) continue;
            out.push({
                id: `nsc-${prov}`,
                label: `NSC · ${provinceFullName(prov)}`,
                icon: Flag,
                count: buckets.nsc[prov].length,
                rows: buckets.nsc[prov],
            });
        }
        return out;
    }, [violations, buckets, registered]);

    const [active, setActive] = useState<string>('all');
    useEffect(() => {
        if (!subTabs.find(t => t.id === active)) setActive('all');
    }, [subTabs, active]);

    const activeRows: any[] = (subTabs.find(t => t.id === active)?.rows) ?? violations;
    const sortedRows = useMemo(
        () => [...activeRows].sort((a, b) => String(b?.date ?? '').localeCompare(String(a?.date ?? ''))),
        [activeRows],
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    useEffect(() => { setPage(1); }, [active]);
    const visibleRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    useEffect(() => { setSelectedIdx(null); }, [active, page]);
    const selected = selectedIdx != null ? visibleRows[selectedIdx] : null;

    const total = activeRows.length;
    const oosCount = activeRows.filter(v => v.isOos).length;
    const highRiskCount = activeRows.filter(v => v.driverRiskCategory === 1).length;
    const citationCount = activeRows.filter(v => v.result === "Citation Issued" || v.result === "OOS Order").length;

    return (
        <>
            <FilterPillStrip
                tabs={subTabs.map(t => ({ id: t.id, label: t.label, count: t.count }))}
                active={active}
                onSelect={setActive}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiTile value={total}          label="Total Violations" />
                <KpiTile value={oosCount}       label="OOS-qualifying"   tone="red" />
                <KpiTile value={highRiskCount}  label="High-Risk"        tone="red" />
                <KpiTile value={citationCount}  label="Citations / OOS"  tone="amber" />
            </div>

            <DataTable
                head={['ID','Date','Driver','Asset','State','Source','Code','Group','Risk','OOS','Result']}
                rows={visibleRows.map((v: any) => {
                    const risk = v.driverRiskCategory;
                    const riskLabel = risk === 1 ? 'High' : risk === 2 ? 'Moderate' : 'Lower';
                    const riskTone  = risk === 1 ? 'bg-red-100 text-red-700' : risk === 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                    return [
                        <span className="font-mono text-[10px] text-slate-500">{v.id}</span>,
                        <span className="font-mono text-[11px]">{v.date}</span>,
                        v.driverName,
                        <span className="font-mono text-[10px] text-slate-500">{v.assetName ?? '—'}</span>,
                        v.locationState,
                        <SourceBadge state={v.locationState} />,
                        <span className="font-mono text-[10px] text-slate-700" title={v.violationType}>{v.violationCode}</span>,
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{v.violationGroup}</span>,
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', riskTone)}>{riskLabel}</span>,
                        <YesNoBadge value={v.isOos} />,
                        <span className="text-[11px] text-slate-700">{v.result}</span>,
                    ];
                })}
                emptyMessage="No violations in this source bucket for this carrier."
                selectedIndex={selectedIdx}
                onSelectRow={(i) => setSelectedIdx(selectedIdx === i ? null : i)}
                pagination={{ page, pageSize, totalRows: sortedRows.length, onPageChange: setPage, onPageSizeChange: setPageSize }}
            />

            {selected && (
                <RowDetailPanel
                    title={`${selected.violationCode} · ${selected.violationType}`}
                    registration={selected.id}
                    statusBadge={
                        selected.isOos
                            ? { label: 'OOS', tone: 'alert' }
                          : selected.driverRiskCategory === 1
                            ? { label: 'High Risk', tone: 'alert' }
                          : selected.driverRiskCategory === 2
                            ? { label: 'Moderate', tone: 'warn' }
                          : { label: 'Lower', tone: 'ok' }
                    }
                    fields={[
                        { label: 'Date / Time',     value: `${selected.date} ${selected.time ?? ''}` },
                        { label: 'Driver',          value: selected.driverName },
                        { label: 'Asset',           value: selected.assetName },
                        { label: 'Location',        value: `${selected.locationCity ?? ''}${selected.locationState ? ', ' + selected.locationState : ''}` },
                        { label: 'Country',         value: selected.locationCountry },
                        { label: 'Group',           value: selected.violationGroup },
                        { label: 'Code',            value: selected.violationCode },
                        { label: 'Act / Section',   value: selected.actSection },
                        { label: 'Issuing Agency',  value: selected.issuingAgency },
                        { label: 'Result',          value: selected.result },
                        { label: 'Status',          value: selected.status },
                        { label: 'Crash Likelihood',value: `${selected.crashLikelihood}%` },
                        { label: 'Citation #',      value: selected.citationNumber },
                        { label: 'Ticket #',        value: selected.ticketNumber },
                        { label: 'Conviction #',    value: selected.convictionNumber },
                        { label: 'Conviction Date', value: selected.convictionDate },
                        { label: 'NAT Code',        value: selected.natCode },
                        { label: 'Fine',            value: selected.fineAmount ? `${selected.currency} ${selected.fineAmount}` : undefined },
                    ]}
                    onClose={() => setSelectedIdx(null)}
                />
            )}
        </>
    );
}

function bucketViolations(rows: any[]): InspectionBuckets {
    // Matches the canonical `sourceForRecord` rule used by ViolationsListPage —
    // country drives the SMS vs CA split before state ever matters.
    const out: InspectionBuckets = { sms: [], cvor: [], nsc: {} };
    for (const r of rows) {
        const country = String(r?.locationCountry ?? "").toUpperCase();
        const isCA = country === "CA" || country === "CANADA";
        const st = String(r?.locationState ?? "").toUpperCase();
        if (!isCA) {
            out.sms.push(r);
            continue;
        }
        if (st === "ON") {
            out.cvor.push(r);
            continue;
        }
        if (CA_PROVINCES.has(st)) {
            (out.nsc[st] ??= []).push(r);
            continue;
        }
        // Canada but unknown/missing state — fall back to SMS so the totals
        // never drop a record.
        out.sms.push(r);
    }
    return out;
}

// ── HOS / ELD tab ────────────────────────────────────────────────────────
function HosTab({ accountId }: { accountId: string }) {
    const hos = useMemo(() => getHosForCarrier(accountId), [accountId]);
    const logs = hos.dailyLogs;
    const sortedLogs = useMemo(
        () => [...logs].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? ''))),
        [logs],
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const visibleLogs = sortedLogs.slice((page - 1) * pageSize, page * pageSize);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    useEffect(() => { setSelectedIdx(null); }, [page]);
    const selected = selectedIdx != null ? visibleLogs[selectedIdx] : null;

    const total = logs.length;
    let driveBreaks = 0;
    let dutyBreaks  = 0;
    let totalDriveSec = 0;
    for (const l of logs) {
        const drv = (l.statusDurations?.driving ?? 0);
        const duty = (l.statusDurations?.onDuty ?? 0) + drv;
        totalDriveSec += drv;
        if (drv  / 3600 > 11) driveBreaks += 1;
        if (duty / 3600 > 14) dutyBreaks  += 1;
    }
    const avgDriveHrs = total > 0 ? totalDriveSec / total / 3600 : 0;

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiTile value={total}                                  label="Daily Logs" />
                <KpiTile value={driveBreaks}                            label="11-hr Drive Overages" tone="red" />
                <KpiTile value={dutyBreaks}                             label="14-hr Duty Overages"  tone="red" />
                <KpiTile value={avgDriveHrs.toFixed(1) + 'h'}           label="Avg Drive / Day"      tone="emerald" />
            </div>

            <DataTable
                head={['Date','Driver','Provider','Drive (h)','On-Duty (h)','Sleeper (h)','Distance (mi)','Violations']}
                rows={visibleLogs.map(l => {
                    const drv  = (l.statusDurations?.driving ?? 0) / 3600;
                    const onD  = ((l.statusDurations?.onDuty ?? 0) + (l.statusDurations?.driving ?? 0)) / 3600;
                    const slp  = (l.statusDurations?.sleeperBed ?? 0) / 3600;
                    const overDrv = drv  > 11;
                    const overDut = onD  > 14;
                    const v = (overDrv ? 1 : 0) + (overDut ? 1 : 0);
                    return [
                        <span className="font-mono text-[11px]">{l.date}</span>,
                        `${l.driver?.firstName ?? ''} ${l.driver?.lastName ?? ''}`.trim(),
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">{l.provider}</span>,
                        <span className={cn('font-bold tabular-nums', overDrv ? 'text-red-600' : 'text-slate-700')}>{drv.toFixed(2)}</span>,
                        <span className={cn('font-bold tabular-nums', overDut ? 'text-red-600' : 'text-slate-700')}>{onD.toFixed(2)}</span>,
                        <span className="tabular-nums text-slate-500">{slp.toFixed(2)}</span>,
                        <span className="tabular-nums text-slate-500">{(l.distances?.driving ?? 0).toFixed(0)}</span>,
                        v > 0
                            ? <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">{v} rule break{v > 1 ? 's' : ''}</span>
                            : <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">OK</span>,
                    ];
                })}
                emptyMessage="No HOS daily logs for this carrier."
                selectedIndex={selectedIdx}
                onSelectRow={(i) => setSelectedIdx(selectedIdx === i ? null : i)}
                pagination={{ page, pageSize, totalRows: sortedLogs.length, onPageChange: setPage, onPageSizeChange: setPageSize }}
            />

            {selected && (() => {
                const drv  = (selected.statusDurations?.driving ?? 0) / 3600;
                const onD  = ((selected.statusDurations?.onDuty ?? 0) + (selected.statusDurations?.driving ?? 0)) / 3600;
                const off  = (selected.statusDurations?.offDuty ?? 0) / 3600;
                const slp  = (selected.statusDurations?.sleeperBed ?? 0) / 3600;
                const pc   = (selected.statusDurations?.personalConveyance ?? 0) / 3600;
                const ym   = (selected.statusDurations?.yardMove ?? 0) / 3600;
                const overDrv = drv > 11;
                const overDut = onD > 14;
                const v = (overDrv ? 1 : 0) + (overDut ? 1 : 0);
                return (
                    <RowDetailPanel
                        title={`Daily Log · ${selected.date}`}
                        registration={selected.id}
                        statusBadge={
                            v > 0
                                ? { label: `${v} Rule Break${v > 1 ? 's' : ''}`, tone: 'alert' }
                                : { label: 'OK', tone: 'ok' }
                        }
                        fields={[
                            { label: 'Driver',         value: `${selected.driver?.firstName ?? ''} ${selected.driver?.lastName ?? ''}`.trim() },
                            { label: 'Email',          value: selected.driver?.email },
                            { label: 'Status',         value: selected.driver?.status },
                            { label: 'Provider',       value: selected.provider },
                            { label: 'Date',           value: selected.date },
                            { label: 'Drive Hours',    value: `${drv.toFixed(2)} h${overDrv ? ' · over 11-hr limit' : ''}` },
                            { label: 'On-Duty Hours',  value: `${onD.toFixed(2)} h${overDut ? ' · over 14-hr limit' : ''}` },
                            { label: 'Off-Duty Hours', value: `${off.toFixed(2)} h` },
                            { label: 'Sleeper Berth',  value: `${slp.toFixed(2)} h` },
                            { label: 'Personal Conv.', value: `${pc.toFixed(2)} h` },
                            { label: 'Yard Move',      value: `${ym.toFixed(2)} h` },
                            { label: 'Distance',       value: `${(selected.distances?.total ?? 0).toFixed(0)} mi total` },
                            { label: 'Driving Dist.',  value: `${(selected.distances?.driving ?? 0).toFixed(0)} mi` },
                            { label: 'Source ID',      value: selected.sourceId },
                            { label: 'Added At',       value: selected.metadata?.addedAt?.slice(0, 10) },
                        ]}
                        onClose={() => setSelectedIdx(null)}
                    />
                );
            })()}
        </>
    );
}

// ── VEDR tab ─────────────────────────────────────────────────────────────
// VEDR = Video / Event Data Recorder events. Sourced from violations whose
// group hints at a camera / ELD / telematics origin.
function VedrTab({ accountId }: { accountId: string }) {
    const violations = useMemo(() => getViolationsForCarrier(accountId), [accountId]);
    const vedrEvents = useMemo(() => {
        return violations.filter(v => {
            const g = String(v?.violationGroup ?? "").toLowerCase();
            return g.includes("eld") || g.includes("telematics") || g.includes("video") || g.includes("hours") || g.includes("camera");
        });
    }, [violations]);
    const sortedEvents = useMemo(
        () => [...vedrEvents].sort((a, b) => String(b?.date ?? '').localeCompare(String(a?.date ?? ''))),
        [vedrEvents],
    );
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE);
    const visibleEvents = sortedEvents.slice((page - 1) * pageSize, page * pageSize);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    useEffect(() => { setSelectedIdx(null); }, [page]);
    const selected = selectedIdx != null ? visibleEvents[selectedIdx] : null;

    const total = vedrEvents.length;
    const highRisk = vedrEvents.filter(v => v.driverRiskCategory === 1).length;
    const oos = vedrEvents.filter(v => v.isOos).length;
    const drivers = new Set(vedrEvents.map(v => v.driverId)).size;

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <KpiTile value={total}     label="Total Events" />
                <KpiTile value={highRisk}  label="High-Risk Events" tone="red" />
                <KpiTile value={oos}       label="OOS Triggered"    tone="red" />
                <KpiTile value={drivers}   label="Drivers Involved" />
            </div>

            <DataTable
                head={['Date','Driver','Asset','Event Type','Group','Risk','OOS','Result','State']}
                rows={visibleEvents.map(v => {
                    const risk = v.driverRiskCategory;
                    const riskLabel = risk === 1 ? 'High' : risk === 2 ? 'Moderate' : 'Lower';
                    const riskTone  = risk === 1 ? 'bg-red-100 text-red-700' : risk === 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
                    return [
                        <span className="font-mono text-[11px]">{v.date}</span>,
                        v.driverName,
                        <span className="font-mono text-[10px] text-slate-500">{v.assetName ?? '—'}</span>,
                        <span className="truncate inline-block max-w-[220px]" title={v.violationType}>{v.violationType}</span>,
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{v.violationGroup}</span>,
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', riskTone)}>{riskLabel}</span>,
                        <YesNoBadge value={v.isOos} />,
                        <span className="text-[11px] text-slate-700">{v.result}</span>,
                        v.locationState,
                    ];
                })}
                emptyMessage="No telematics / VEDR events on record for this carrier."
                selectedIndex={selectedIdx}
                onSelectRow={(i) => setSelectedIdx(selectedIdx === i ? null : i)}
                pagination={{ page, pageSize, totalRows: sortedEvents.length, onPageChange: setPage, onPageSizeChange: setPageSize }}
            />

            {selected && (
                <RowDetailPanel
                    title={selected.violationType}
                    registration={selected.id}
                    statusBadge={
                        selected.isOos
                            ? { label: 'OOS', tone: 'alert' }
                          : selected.driverRiskCategory === 1
                            ? { label: 'High Risk', tone: 'alert' }
                          : selected.driverRiskCategory === 2
                            ? { label: 'Moderate', tone: 'warn' }
                          : { label: 'Lower', tone: 'ok' }
                    }
                    fields={[
                        { label: 'Date / Time',     value: `${selected.date} ${selected.time ?? ''}` },
                        { label: 'Driver',          value: selected.driverName },
                        { label: 'Asset',           value: selected.assetName },
                        { label: 'Location',        value: `${selected.locationCity ?? ''}${selected.locationState ? ', ' + selected.locationState : ''}` },
                        { label: 'Country',         value: selected.locationCountry },
                        { label: 'Group',           value: selected.violationGroup },
                        { label: 'Code',            value: selected.violationCode },
                        { label: 'Act / Section',   value: selected.actSection },
                        { label: 'Result',          value: selected.result },
                        { label: 'Crash Likelihood',value: `${selected.crashLikelihood}%` },
                        { label: 'OOS',             value: selected.isOos ? 'Yes' : 'No' },
                        { label: 'Issuing Agency',  value: selected.issuingAgency },
                    ]}
                    onClose={() => setSelectedIdx(null)}
                />
            )}
        </>
    );
}

// ── Shared data table (with optional row selection + pagination) ────────
// Renders inside a fixed-height frame so the card never grows or shrinks
// based on row count — sub-filter switches don't cause layout jumps.
const TABLE_FRAME_HEIGHT = 480;     // px — table body + footer area
const TABLE_BODY_HEIGHT  = 440;     // px — scroll area inside the frame
const PAGE_SIZE          = 10;

interface PaginationState {
    page: number;       // 1-based
    pageSize: number;
    totalRows: number;
    onPageChange: (page: number) => void;
    /** Optional rows-per-page picker. When omitted, the picker is hidden. */
    onPageSizeChange?: (size: number) => void;
    pageSizeOptions?: number[];
}

function DataTable({
    head, rows, emptyMessage, footnote, selectedIndex, onSelectRow, pagination,
}: {
    head: string[];
    rows: React.ReactNode[][];
    emptyMessage: string;
    footnote?: string;
    /** If provided, clicking a row calls this — also drives the visual highlight. */
    onSelectRow?: (index: number) => void;
    selectedIndex?: number | null;
    /** Optional pagination — when supplied, the footer renders page controls. */
    pagination?: PaginationState;
}) {
    const selectable = !!onSelectRow;
    return (
        <div
            className="border border-slate-200 rounded-lg overflow-hidden flex flex-col"
            style={{ height: TABLE_FRAME_HEIGHT }}
        >
            <div
                className="overflow-x-auto overflow-y-auto flex-1"
                style={{ maxHeight: TABLE_BODY_HEIGHT }}
            >
                {rows.length === 0 ? (
                    <div className="h-full flex items-center justify-center px-8 py-6 text-center text-xs text-slate-400 bg-slate-50/40">
                        {emptyMessage}
                    </div>
                ) : (
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                                {head.map((h, i) => (
                                    <th key={i} className="px-3 py-2 font-bold uppercase tracking-wider text-[9px] text-slate-500 whitespace-nowrap">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row, ri) => {
                                const isSelected = selectedIndex === ri;
                                return (
                                    <tr
                                        key={ri}
                                        onClick={selectable ? () => onSelectRow?.(ri) : undefined}
                                        className={cn(
                                            'transition-colors',
                                            selectable && 'cursor-pointer',
                                            isSelected
                                                ? 'bg-blue-50 hover:bg-blue-50 ring-1 ring-inset ring-blue-200'
                                                : 'hover:bg-slate-50',
                                        )}
                                    >
                                        {row.map((cell, ci) => (
                                            <td key={ci} className={cn(
                                                'px-3 py-2.5 whitespace-nowrap text-slate-700',
                                                ci === 0 && isSelected && 'border-l-2 border-blue-500 pl-2.5',
                                            )}>
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            {/* Pagination footer — matches the canonical ViolationsListPage pattern. */}
            <div className="shrink-0 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap bg-slate-50/50">
                {pagination
                    ? <Pagination state={pagination} footnote={footnote} />
                    : (
                        <div className="text-xs text-slate-500 min-h-[28px] flex items-center">
                            {footnote ?? <span>&nbsp;</span>}
                        </div>
                    )}
            </div>
        </div>
    );
}

function Pagination({ state, footnote }: { state: PaginationState; footnote?: string }) {
    const { page, pageSize, totalRows, onPageChange, onPageSizeChange, pageSizeOptions = [10, 20, 50] } = state;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    return (
        <>
            <div className="flex items-center gap-2 text-xs text-slate-500">
                {onPageSizeChange ? (
                    <>
                        <span>Rows per page:</span>
                        <select
                            className="h-7 px-2 border border-slate-200 rounded bg-white text-xs focus:outline-none"
                            value={pageSize}
                            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
                        >
                            {pageSizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </>
                ) : (
                    footnote && <span>{footnote}</span>
                )}
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                    Page {safePage} of {totalPages}
                    {' '}· {totalRows.toLocaleString()} total
                </span>
                <button
                    disabled={safePage <= 1}
                    onClick={() => onPageChange(Math.max(1, safePage - 1))}
                    className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Previous page"
                >
                    <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                    disabled={safePage >= totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
                    className="h-7 w-7 flex items-center justify-center rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Next page"
                >
                    <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </div>
        </>
    );
}

// ── Row detail panel (appears under the selected row's table) ────────────
function RowDetailPanel({
    title, registration, statusBadge, fields, onClose,
}: {
    title: string;
    registration?: string;
    statusBadge?: { label: string; tone: "ok" | "warn" | "alert" | "info" };
    fields: { label: string; value: React.ReactNode }[];
    onClose: () => void;
}) {
    const badgeTone =
        statusBadge?.tone === "ok"    ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
        statusBadge?.tone === "warn"  ? "bg-amber-100 text-amber-700 border-amber-200"       :
        statusBadge?.tone === "alert" ? "bg-red-100 text-red-700 border-red-200"             :
                                        "bg-blue-100 text-blue-700 border-blue-200";
    return (
        <div className="mt-3 border border-blue-200 rounded-lg overflow-hidden bg-gradient-to-b from-blue-50/40 to-white shadow-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-blue-100 bg-blue-50/60">
                <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Selected record</div>
                    <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-[13px] font-bold text-slate-900 truncate">{title}</span>
                        {registration && <span className="text-[10px] font-mono text-slate-500">{registration}</span>}
                        {statusBadge && (
                            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider', badgeTone)}>
                                {statusBadge.label}
                            </span>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700 border border-slate-200 px-2 py-1 rounded-md bg-white"
                >
                    Close
                </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 px-4 py-3">
                {fields.map(f => (
                    <div key={f.label} className="min-w-0">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{f.label}</div>
                        <div className="text-[12px] text-slate-700 truncate" title={typeof f.value === 'string' ? f.value : undefined}>
                            {f.value ?? <span className="text-slate-300">—</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function fmtMoney(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n).toLocaleString()}`;
}

// ── Regulatory Details: two collapsible jurisdiction rows ────────────────
// ── Main Regulatory Details section ──────────────────────────────────────
// Two jurisdiction rows (US / Canada) — clicking either expands a stack of
// collapsible fact-sheet cards inside. Every fact sheet inside Canada (CVOR
// + each provincial NSC) is its own collapsible, defaulting to closed.
function RegulatoryDetailsSection({ score }: { score: FleetSafetyScore }) {
    const r = score.regimes;
    const [openUs, setOpenUs] = useState(false);
    const [openCa, setOpenCa] = useState(false);

    // Per-fact-sheet open state — keyed by a stable id.
    const [openSheets, setOpenSheets] = useState<Record<string, boolean>>({});
    const toggleSheet = (id: string) => setOpenSheets(s => ({ ...s, [id]: !s[id] }));

    // Ontario carriers register under CVOR rather than NSC; the federal NSC
    // abstract for Ontario duplicates that view, so we hide it here.
    const sortedNscs = [...score.nscs]
        .filter(n => n.province !== "ON")
        .sort((a, b) => provinceFullName(a.province).localeCompare(provinceFullName(b.province)));
    const canadaCount = (r.cvor ? 1 : 0) + sortedNscs.length;
    const usCount = r.fmcsa ? 1 : 0;

    return (
        <div className="border-t border-slate-100 pt-5 mt-2">
            <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-900">Regulatory Details</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Click a jurisdiction, then expand any fact sheet to drill in.</p>
            </div>

            <div className="space-y-3">
                {/* ── United States ────────────────────────────────────── */}
                <JurisdictionRow
                    tone="blue"
                    code="US"
                    title="United States"
                    subtitle="FMCSA · Federal Motor Carrier Safety Administration"
                    badgeCount={usCount}
                    open={openUs}
                    onToggle={() => setOpenUs(v => !v)}
                >
                    {r.fmcsa ? (
                        <CollapsibleFactSheet
                            icon={Shield}
                            iconTone="bg-blue-50 text-blue-600"
                            title="FMCSA SMS BASIC Scores"
                            registration={`USDOT ${score.identity.dotNumber || '—'}`}
                            open={openSheets["fmcsa"] ?? false}
                            onToggle={() => toggleSheet("fmcsa")}
                        >
                            <FmcsaBasicTable score={score} />
                        </CollapsibleFactSheet>
                    ) : (
                        <EmptyJurisdiction message="No USDOT registration on file for this carrier." />
                    )}
                </JurisdictionRow>

                {/* ── Canada (CVOR + every provincial NSC) ─────────────── */}
                <JurisdictionRow
                    tone="rose"
                    code="CA"
                    title="Canada"
                    subtitle="Ontario CVOR · Provincial NSC abstracts"
                    badgeCount={canadaCount}
                    open={openCa}
                    onToggle={() => setOpenCa(v => !v)}
                    actions={canadaCount > 0 ? (
                        <>
                            <SecondaryAction onClick={() => {
                                const all: Record<string, boolean> = { ...openSheets, fmcsa: openSheets["fmcsa"] };
                                if (r.cvor) all["cvor"] = true;
                                for (const n of sortedNscs) all[`nsc-${n.province}`] = true;
                                setOpenSheets(all);
                            }}>Expand all</SecondaryAction>
                            <SecondaryAction onClick={() => {
                                const all: Record<string, boolean> = { ...openSheets };
                                if (r.cvor) all["cvor"] = false;
                                for (const n of sortedNscs) all[`nsc-${n.province}`] = false;
                                setOpenSheets(all);
                            }}>Collapse all</SecondaryAction>
                        </>
                    ) : undefined}
                >
                    {canadaCount === 0 ? (
                        <EmptyJurisdiction message="No Canadian regulatory records on file for this carrier." />
                    ) : (
                        <div className="space-y-2">
                            {r.cvor && (
                                <CollapsibleFactSheet
                                    icon={MapPin}
                                    iconTone="bg-emerald-50 text-emerald-600"
                                    title="Ontario CVOR Performance"
                                    registration={`CVOR ${score.cvor.cvorNumber}`}
                                    open={openSheets["cvor"] ?? false}
                                    onToggle={() => toggleSheet("cvor")}
                                >
                                    <CvorPerformanceCard score={score} />
                                </CollapsibleFactSheet>
                            )}
                            {sortedNscs.map(n => (
                                <CollapsibleFactSheet
                                    key={n.nscNumber}
                                    icon={Flag}
                                    iconTone="bg-rose-50 text-rose-600"
                                    title={`Canadian NSC · ${provinceFullName(n.province)}`}
                                    registration={`NSC ${n.nscNumber}`}
                                    open={openSheets[`nsc-${n.province}`] ?? false}
                                    onToggle={() => toggleSheet(`nsc-${n.province}`)}
                                >
                                    <NscPerformanceDispatcher nsc={n} />
                                </CollapsibleFactSheet>
                            ))}
                        </div>
                    )}
                </JurisdictionRow>
            </div>
        </div>
    );
}

function SecondaryAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="inline-flex items-center px-2 h-6 rounded text-[9px] font-bold uppercase tracking-wider border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
        >
            {children}
        </button>
    );
}

// ── Collapsible fact-sheet card (level-2 sub-collapsible) ────────────────
function CollapsibleFactSheet({
    icon: Icon, iconTone, title, registration, open, onToggle, children,
}: {
    icon: React.ComponentType<{ size?: number; className?: string }>;
    iconTone: string;
    title: string;
    registration: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className={cn(
            'bg-white border rounded-lg overflow-hidden transition-shadow',
            open ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300',
        )}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors"
            >
                <div className={cn('h-8 w-8 rounded-md flex items-center justify-center shrink-0', iconTone)}>
                    <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate-900 leading-tight truncate">{title}</div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5 truncate">{registration}</div>
                </div>
                <span className={cn(
                    'shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full transition-transform',
                    open ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500',
                )}>
                    {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </span>
            </button>
            {open && (
                <div className="border-t border-slate-200">
                    {children}
                </div>
            )}
        </div>
    );
}

// ── Jurisdiction row (single collapsible per country) ────────────────────
type JurisdictionTone = "blue" | "rose";

const JURISDICTION_TONES: Record<JurisdictionTone, { codeBg: string; codeText: string; accent: string; bg: string }> = {
    blue: { codeBg: 'bg-blue-100', codeText: 'text-blue-700', accent: 'border-l-blue-500', bg: 'bg-gradient-to-r from-blue-50/40 to-transparent' },
    rose: { codeBg: 'bg-rose-100', codeText: 'text-rose-700', accent: 'border-l-rose-500', bg: 'bg-gradient-to-r from-rose-50/40 to-transparent' },
};

function JurisdictionRow({
    tone, code, title, subtitle, badgeCount, open, onToggle, actions, children,
}: {
    tone: JurisdictionTone;
    code: string;
    title: string;
    subtitle: string;
    badgeCount: number;
    open: boolean;
    onToggle: () => void;
    /** Optional inline action buttons (e.g. Expand-all / Collapse-all). */
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    const t = JURISDICTION_TONES[tone];
    return (
        <section className={cn('rounded-xl border border-slate-200 overflow-hidden border-l-4', t.accent)}>
            <button
                type="button"
                onClick={onToggle}
                className={cn('w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors', t.bg)}
            >
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center font-black text-[12px] tracking-wider shrink-0', t.codeBg, t.codeText)}>
                    {code}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 leading-tight">{title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>
                </div>
                {open && actions && (
                    <div className="flex items-center gap-1.5">{actions}</div>
                )}
                <span className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-bold tabular-nums uppercase tracking-wider',
                    badgeCount > 0 ? cn(t.codeBg, t.codeText) : 'bg-slate-100 text-slate-400',
                )}>
                    {badgeCount} {badgeCount === 1 ? 'record' : 'records'}
                </span>
                {open
                    ? <ChevronDown size={16} className="text-slate-400 shrink-0" />
                    : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
            </button>
            {open && (
                <div className="px-3 pt-3 pb-3 bg-slate-50/40 border-t border-slate-100 space-y-3">
                    {children}
                </div>
            )}
        </section>
    );
}

function EmptyJurisdiction({ message }: { message: string }) {
    return (
        <div className="px-4 py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-white">
            {message}
        </div>
    );
}

// ── Individual regulator row (light, informative even when collapsed) ────
// ── FMCSA SMS BASIC Table ────────────────────────────────────────────────
function FmcsaBasicTable({ score }: { score: FleetSafetyScore }) {
    return (
        <>
            <div className="grid grid-cols-[1fr_60px_120px_56px_72px] gap-2 px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <div>BASIC</div>
                <div className="text-right">Measure</div>
                <div className="pl-1">Percentile</div>
                <div className="text-right">Alert</div>
                <div className="text-right">Status</div>
            </div>
            {score.basics.map((r, idx) => {
                const barPct = r.hasSufficientData ? Math.min(r.percentile, 100) : 0;
                const isWarn = r.hasSufficientData && r.percentile >= r.threshold * 0.75 && !r.isAlert;
                return (
                    <div
                        key={r.key}
                        className={cn(
                            'grid grid-cols-[1fr_60px_120px_56px_72px] gap-2 px-4 py-2 items-center border-b border-slate-100 last:border-0',
                            idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40',
                        )}
                    >
                        <div className="text-[11px] font-semibold text-slate-700 leading-tight">{r.label}</div>
                        <div className="text-[11px] text-slate-500 text-right font-mono">{r.measure.toFixed(2)}</div>
                        <div className="flex items-center gap-1.5 pl-1">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={cn('h-full rounded-full', r.isAlert ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-emerald-400')} style={{ width: `${barPct}%` }} />
                            </div>
                            <span className={cn('text-[10px] font-bold w-7 text-right', r.isAlert ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-slate-500')}>
                                {r.hasSufficientData ? `${Math.round(r.percentile)}%` : 'N/A'}
                            </span>
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">{r.threshold}%</div>
                        <div className="flex justify-end">
                            {r.isAlert
                                ? <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-bold rounded-full">ALERT</span>
                                : !r.hasSufficientData
                                    ? <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-medium rounded-full">Low Data</span>
                                    : <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-medium rounded-full">OK</span>}
                        </div>
                    </div>
                );
            })}
            <div className="px-4 py-1.5 bg-blue-50 border-t border-blue-100 text-[9px] text-blue-600">
                General carrier · UD/CI/HOS ≥ 65% alert · VM/CS/HM/DF ≥ 80% alert
            </div>
        </>
    );
}

// ── Ontario CVOR ─────────────────────────────────────────────────────────
// Mirrors the Ontario MTO CVOR fact sheet: overall % rating against the
// OK / WARN / AUDIT / SHOW CAUSE / SEIZURE bands, three contribution buckets,
// and the three Out-of-Service Rate cards (overall, vehicle, driver).
function CvorPerformanceCard({ score }: { score: FleetSafetyScore }) {
    const cv = score.cvor;
    const rating = cv.rating;
    const bandTone =
        cv.band === "OK"        ? { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      : cv.band === "WARN"      ? { bg: 'bg-yellow-50 border-yellow-100',  text: 'text-yellow-700',  pill: 'bg-yellow-100 text-yellow-700' }
      : cv.band === "AUDIT"     ? { bg: 'bg-orange-50 border-orange-100',  text: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      : cv.band === "SHOW_CAUSE"? { bg: 'bg-red-50 border-red-100',        text: 'text-red-700',     pill: 'bg-red-100 text-red-700' }
      :                           { bg: 'bg-red-100 border-red-200',       text: 'text-red-800',     pill: 'bg-red-200 text-red-800' };
    return (
        <>
            {/* "Latest Pull" banner */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/90 flex items-center gap-2">
                    <Shield size={11} /> Latest Pull · CVOR Performance · Intervention & Event Details · Travel Kilometric Information
                </div>
                <div className="text-[9px] uppercase tracking-wider text-white/70 mt-0.5">All sections below reflect the most recent pull</div>
            </div>

            {/* Header chip — period + carrier */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><Shield size={16} /></div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">CVOR Performance</div>
                        <div className="text-[10px] text-slate-500">
                            {fmtMonthYear(cv.period.from)} to {fmtMonthYear(cv.period.to)} · All Pulls
                        </div>
                    </div>
                </div>
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 text-[10px] font-bold">
                    {['Monthly','Quarterly','Semi-Annual','Annual','All'].map((p, i) => (
                        <span key={p} className={cn('px-2 py-1 rounded-md', i === 4 ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-500')}>{p}</span>
                    ))}
                </div>
            </div>

            {/* Overall rating + band gradient */}
            <div className="px-4 pt-4 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Overall CVOR Rating</div>
                <div className="flex items-baseline gap-3 mb-3">
                    <span className={cn('text-5xl font-black', bandTone.text)}>{rating.toFixed(2)}%</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', bandTone.pill)}>
                        {cv.band === 'SHOW_CAUSE' ? 'Show Cause' : cv.band === 'SEIZURE' ? 'Seizure' : cv.band}
                    </span>
                </div>
                <CvorGradientStrip rating={rating} thresholds={cv.thresholds} />
                <div className={cn('mt-3 px-3 py-2 rounded-lg border text-[11px] flex items-center justify-between', bandTone.bg)}>
                    <span className={cn('font-semibold', bandTone.text)}>
                        ● Currently in {cv.band === 'OK' ? 'OK' : cv.band === 'WARN' ? 'Warn' : cv.band === 'AUDIT' ? 'Audit' : cv.band === 'SHOW_CAUSE' ? 'Show Cause' : 'Seizure'} zone ({cv.band === 'OK' ? '0%-35%' : `${cv.thresholds.warn}%-${cv.thresholds.seizure}%`})
                    </span>
                    <span className="text-[10px] text-slate-500">
                        {cv.band === 'OK' ? 'No MTO action required.' : 'MTO intervention may be triggered.'}
                    </span>
                </div>
            </div>

            {/* Three weighted buckets */}
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
                <CvorBucket label="Collisions"  bucket={cv.collisions}  weight="40%" sub={`${cv.collisions.count} collisions · ${cv.collisions.points} pts`} />
                <CvorBucket label="Convictions" bucket={cv.convictions} weight="40%" sub={`${cv.convictions.count} convictions · ${cv.convictions.points} pts`} />
                <CvorBucket label="Inspections" bucket={cv.inspections} weight="20%" sub={`OOS rate - ${cv.inspections.oosRate.toFixed(1)}%`} />
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500"><span className="font-bold">CVOR Thresholds</span> · 35% Warning · 50% Audit · 85% Show Cause · 100% Seizure</span>
                <span className="text-blue-600 font-bold cursor-pointer">Threshold Info ▾</span>
            </div>

            {/* Out-of-service rates */}
            <div className="border-t border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Out-of-Service Rates</div>
                <div className="grid grid-cols-3 gap-3">
                    <OosCard label="Overall" rate={cv.oos.overall.rate} threshold={cv.oos.overall.threshold} band={cv.oos.overall.band} />
                    <OosCard label="Vehicle" rate={cv.oos.vehicle.rate} threshold={cv.oos.vehicle.threshold} band={cv.oos.vehicle.band} />
                    <OosCard label="Driver"  rate={cv.oos.driver.rate}  threshold={cv.oos.driver.threshold}  band={cv.oos.driver.band} />
                </div>
            </div>
        </>
    );
}

function CvorGradientStrip({ rating, thresholds }: { rating: number; thresholds: { warn: number; audit: number; showCause: number; seizure: number } }) {
    const pos = Math.max(0, Math.min(100, rating));
    return (
        <div className="relative">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-700" />
            <div className="absolute -top-7 -translate-x-1/2" style={{ left: `${pos}%` }}>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{rating.toFixed(2)}%</div>
                <div className="w-px h-3 bg-slate-900 mx-auto" />
            </div>
            <div className="grid grid-cols-4 mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <div style={{ marginLeft: `${thresholds.warn - 5}%` }}>WARN</div>
                <div style={{ marginLeft: `${thresholds.audit - thresholds.warn - 10}%` }}>AUDIT</div>
                <div style={{ marginLeft: `${thresholds.showCause - thresholds.audit - 15}%` }}>SHOW CAUSE</div>
                <div className="text-right">SEIZURE</div>
            </div>
        </div>
    );
}

function CvorBucket({ label, bucket, weight, sub }: { label: string; bucket: { raw: number; band: "OK"|"WARN"|"AUDIT"|"SHOW_CAUSE" }; weight: string; sub: string }) {
    const tone =
        bucket.band === "OK"         ? { bg: 'bg-emerald-50', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      : bucket.band === "WARN"       ? { bg: 'bg-yellow-50',  text: 'text-yellow-700',  pill: 'bg-yellow-100 text-yellow-700' }
      : bucket.band === "AUDIT"      ? { bg: 'bg-orange-50',  text: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      :                                { bg: 'bg-red-50',     text: 'text-red-700',     pill: 'bg-red-100 text-red-700' };
    return (
        <div className={cn('p-4', tone.bg)}>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', tone.pill)}>{bucket.band === 'SHOW_CAUSE' ? 'Show Cause' : bucket.band}</span>
            </div>
            <div className={cn('text-3xl font-black mb-1', tone.text)}>{bucket.raw.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500">{sub}</div>
            <div className="text-[10px] text-slate-500 mb-2">{bucket.band === 'OK' ? 'OK' : bucket.band === 'WARN' ? 'WARN' : bucket.band === 'AUDIT' ? 'AUDIT' : 'Show Cause'} - {weight} weight</div>
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-700 rounded-full relative">
                <div className="absolute top-0 -translate-x-1/2 -translate-y-0.5 w-0.5 h-2.5 bg-slate-900" style={{ left: `${Math.min(bucket.raw, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                <span>WARN 35%</span><span>AUDIT 50%</span><span>SC 85%</span>
            </div>
        </div>
    );
}

function OosCard({ label, rate, threshold, band }: { label: string; rate: number; threshold: number; band: "OK"|"OVER" }) {
    const tone = band === "OK"
        ? { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' }
        : { bg: 'bg-red-50 border-red-100',         text: 'text-red-700',     pill: 'bg-red-100 text-red-700',         bar: 'bg-red-500' };
    return (
        <div className={cn('rounded-lg border p-3', tone.bg)}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', tone.pill)}>{band}</span>
            </div>
            <div className={cn('text-3xl font-black', tone.text)}>{rate.toFixed(1)}%</div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden mt-2 mb-1">
                <div className={cn('h-full rounded-full', tone.bar)} style={{ width: `${Math.min(rate * 2, 100)}%` }} />
            </div>
            <div className="text-[9px] text-slate-500">Threshold: {threshold}%</div>
        </div>
    );
}

function fmtMonthYear(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
function fmtDateLong(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateSlash(iso: string): string {
    return iso.replace(/-/g, '/');
}

// ── Canadian NSC dispatcher — picks the province-specific layout ─────────
function NscPerformanceDispatcher({ nsc }: { nsc: NscBreakdown }) {
    if (nsc.province === "AB" && nsc.ab) return <AlbertaNscCard nsc={nsc} ab={nsc.ab} />;
    if (nsc.province === "BC" && nsc.bc) return <BcNscCard nsc={nsc} bc={nsc.bc} />;
    if (nsc.province === "PE" && nsc.pe) return <PeiNscCard nsc={nsc} pe={nsc.pe} />;
    if (nsc.province === "NS" && nsc.ns) return <NsNscCard nsc={nsc} ns={nsc.ns} />;
    return <GenericNscCard nsc={nsc} />;
}

// ── Alberta — R-Factor ────────────────────────────────────────────────────
function AlbertaNscCard({ nsc, ab }: { nsc: NscBreakdown; ab: NonNullable<NscBreakdown["ab"]> }) {
    const stagePill =
        ab.stage === "NOT_MONITORED" ? 'bg-emerald-100 text-emerald-700'
      : ab.stage === "STAGE_1"       ? 'bg-yellow-100 text-yellow-700'
      : ab.stage === "STAGE_2"       ? 'bg-orange-100 text-orange-700'
      : ab.stage === "STAGE_3"       ? 'bg-red-100 text-red-700'
      :                                'bg-red-200 text-red-800';
    return (
        <div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">NSC Performance</div>
                        <div className="text-[10px] text-slate-500">
                            {nsc.profile.legalName} · Alberta NSC Monitoring · 12-Month Profile as of {fmtDateLong(nsc.profile.lastPullDate)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Latest Pull {fmtDateLong(nsc.profile.lastPullDate)}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-600">NSC Summary</span>
                </div>
            </div>

            <div className="px-4 pt-4 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">R-Factor Score</div>
                <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-5xl font-black text-emerald-700">{ab.rFactor.toFixed(3)}</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', stagePill)}>
                        {ab.stage === "NOT_MONITORED" ? "Not Monitored" : ab.stage.replace("_", " ")}
                    </span>
                </div>
                <div className="text-[11px] text-slate-500 mb-3">
                    Carrier must strive for the <span className="font-bold">lowest score</span>
                </div>
                <div className="text-[10px] text-slate-500 mb-3">
                    <span className="font-mono">Fleet {nsc.profile.fleetClass}</span> · <span className="text-slate-400">●</span> Truck
                </div>
                <AbGradientStrip rFactor={ab.rFactor} thresholds={ab.thresholds} />
                <div className="mt-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>● {ab.stage === "NOT_MONITORED"
                        ? `Not on NSC monitoring - performance is within acceptable range for fleet ${nsc.profile.fleetClass}`
                        : `Carrier is in ${ab.stage.replace("_"," ")} of NSC monitoring`}</span>
                    <span className="text-[10px] text-slate-400">{fmtDateLong(nsc.profile.lastPullDate)}</span>
                </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Contribution to R-Factor <span className="font-normal italic text-slate-400">(dynamically calculated based on profile request date)</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <AbBucketCard b={ab.contributions.convictions} />
                    <AbBucketCard b={ab.contributions.adminPenalties} />
                    <AbBucketCard b={ab.contributions.cvsaInspections} />
                    <AbBucketCard b={ab.contributions.reportableCollisions} />
                </div>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500"><span className="font-bold">Contribution Levels</span> · Low &lt;30% · Moderate 30–70% · High / Primary &gt;70%</span>
                <span className="text-blue-600 font-bold cursor-pointer">NSC Threshold Info ▾</span>
            </div>
        </div>
    );
}
function AbGradientStrip({ rFactor, thresholds }: { rFactor: number; thresholds: { stage1: number; stage2: number; stage3: number; stage4: number } }) {
    // Position the marker on a 0..stage4 scale, so STAGE_4 lands at ~100%.
    const fullScale = thresholds.stage4 * 1.05;
    const pos = Math.max(0, Math.min(100, (rFactor / fullScale) * 100));
    return (
        <div className="relative">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-700" />
            <div className="absolute -top-7 -translate-x-1/2" style={{ left: `${pos}%` }}>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{rFactor.toFixed(3)}</div>
                <div className="w-px h-3 bg-slate-900 mx-auto" />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <span>SAFE</span><span>STAGE 1</span><span>STAGE 2</span><span>STAGE 3</span><span>STAGE 4</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
                <span className="font-bold text-slate-500">NSC Thresholds</span> · Stage 1 ≥ {thresholds.stage1.toFixed(3)} · Stage 2 ≥ {thresholds.stage2.toFixed(3)} · Stage 3 ≥ {thresholds.stage3.toFixed(3)} · Stage 4 ≥ {thresholds.stage4.toFixed(3)}
            </div>
        </div>
    );
}
function AbBucketCard({ b }: { b: NonNullable<NscBreakdown["ab"]>["contributions"]["convictions"] }) {
    const tone =
        b.level === "HIGH"     ? { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' }
      : b.level === "MODERATE" ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      : b.level === "LOW"      ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      :                          { txt: 'text-slate-400',   pill: 'bg-slate-100 text-slate-500' };
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.label}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', tone.pill)}>{b.level}</span>
            </div>
            <div className={cn('text-2xl font-black mb-1', tone.txt)}>{b.pctOfRFactor.toFixed(1)}%</div>
            <div className="text-[10px] text-slate-500 mb-1">{b.events} events · {b.impact}% impact</div>
            <div className="text-[10px] text-slate-400 mb-2">{b.level} contribution to R-Factor</div>
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-700 rounded-full relative">
                <div className="absolute top-0 -translate-x-1/2 -translate-y-0.5 w-0.5 h-2.5 bg-slate-900" style={{ left: `${Math.min(b.pctOfRFactor, 100)}%` }} />
            </div>
            <div className="flex justify-between text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                <span>LOW 30%</span><span>MOD 70%</span><span>HIGH</span>
            </div>
        </div>
    );
}

// ── British Columbia — Profile Score ─────────────────────────────────────
function BcNscCard({ nsc, bc }: { nsc: NscBreakdown; bc: NonNullable<NscBreakdown["bc"]> }) {
    const statusTone =
        bc.profileStatus === "Satisfactory"   ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      : bc.profileStatus === "Conditional"    ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      :                                         { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' };
    return (
        <div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">NSC Performance</div>
                        <div className="text-[10px] text-slate-500">
                            {nsc.profile.legalName} · British Columbia · 12-Month Profile as of {fmtDateSlash(nsc.profile.lastPullDate)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Latest Pull {fmtDateLong(nsc.profile.lastPullDate)}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-600">NSC Summary</span>
                </div>
            </div>

            <div className="px-4 pt-3 pb-3 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-100">
                <StatusCell label="Certificate Status" value={bc.certificateStatus} tone="text-slate-700" />
                <StatusCell label="Safety Rating"      value={bc.safetyRating}     tone="text-emerald-700" />
                <StatusCell label="Profile Status"     value={bc.profileStatus}    tone={statusTone.txt} />
                <StatusCell label="Audit Status"       value={bc.auditStatus}      tone="text-orange-700" />
            </div>

            <div className="px-4 pt-4 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NSC Profile Score</div>
                <div className="flex items-baseline gap-3 mb-1">
                    <span className={cn('text-5xl font-black', statusTone.txt)}>{bc.profileScore.toFixed(3)}</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', statusTone.pill)}>
                        {bc.profileStatus === "Satisfactory" ? "Not Monitored" : bc.profileStatus}
                    </span>
                </div>
                <div className="text-[11px] text-slate-500 mb-3">Carrier must strive for the <span className="font-bold">lowest score</span></div>
                <div className="text-[10px] text-slate-500 mb-3">
                    <span className="font-mono">Fleet {nsc.profile.fleetClass}</span> · <span className="text-slate-400">●</span> Truck
                </div>
                <BcGradientStrip profileScore={bc.profileScore} thresholds={bc.thresholds} />
                <div className="mt-3 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-600 flex items-center justify-between">
                    <span>● {bc.profileStatus === "Satisfactory"
                        ? `Not on NSC monitoring — performance is within acceptable range for fleet ${nsc.profile.fleetClass}`
                        : `Carrier in ${bc.profileStatus} band — provincial review may be triggered`}</span>
                    <span className="text-[10px] text-slate-400">{fmtDateLong(nsc.profile.lastPullDate)}</span>
                </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Current Profile Scores <span className="font-normal text-slate-400">as of {fmtDateSlash(nsc.profile.lastPullDate)}</span></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <BcBucketCard b={bc.contributions.contraventions} />
                    <BcBucketCard b={bc.contributions.cvsaOutOfService} />
                    <BcBucketCard b={bc.contributions.accidents} />
                </div>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500"><span className="font-bold">Profile Status</span> · Satisfactory 0.00–{bc.thresholds.conditional.toFixed(2)} · Conditional {bc.thresholds.conditional.toFixed(2)}–{(bc.thresholds.unsatisfactory - 0.01).toFixed(2)} · Unsatisfactory ≥{bc.thresholds.unsatisfactory.toFixed(2)}</span>
                <span className="text-blue-600 font-bold cursor-pointer">NSC Threshold Info ▾</span>
            </div>
        </div>
    );
}
function StatusCell({ label, value, tone }: { label: string; value: string; tone: string }) {
    return (
        <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
            <div className={cn('text-sm font-bold', tone)}>{value}</div>
        </div>
    );
}
function BcGradientStrip({ profileScore, thresholds }: { profileScore: number; thresholds: { satisfactory: number; conditional: number; unsatisfactory: number } }) {
    const fullScale = thresholds.unsatisfactory * 1.6;
    const pos = Math.max(0, Math.min(100, (profileScore / fullScale) * 100));
    return (
        <div className="relative">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-700" />
            <div className="absolute -top-7 -translate-x-1/2" style={{ left: `${pos}%` }}>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{profileScore.toFixed(3)}</div>
                <div className="w-px h-3 bg-slate-900 mx-auto" />
            </div>
            <div className="grid grid-cols-3 mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <div>0.00</div>
                <div className="text-center">SATISFACTORY</div>
                <div className="text-right">UNSATISFACTORY</div>
            </div>
        </div>
    );
}
function BcBucketCard({ b }: { b: NonNullable<NscBreakdown["bc"]>["contributions"]["contraventions"] }) {
    const tone =
        b.profileBand === "SATISFACTORY" ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      : b.profileBand === "CONDITIONAL"  ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      :                                    { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' };
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.label}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', tone.pill)}>{b.profileBand}</span>
            </div>
            <div className={cn('text-2xl font-black mb-1', tone.txt)}>{b.score.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500 mb-1">{b.events} events · {b.impactPct.toFixed(1)}% impact</div>
            <div className="text-[10px] text-slate-400 mb-2">{b.profileBand} contribution to Profile</div>
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-700 rounded-full" />
            <div className="flex justify-between text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                <span>SAT 44%</span><span>COND 75%</span><span>HIGH</span>
            </div>
        </div>
    );
}

// ── Prince Edward Island — Schedule 3 Points ─────────────────────────────
function PeiNscCard({ nsc, pe }: { nsc: NscBreakdown; pe: NonNullable<NscBreakdown["pe"]> }) {
    const tone =
        pe.band === "SAFE"      ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      : pe.band === "ADVISORY"  ? { txt: 'text-yellow-700',  pill: 'bg-yellow-100 text-yellow-700' }
      : pe.band === "WARNING"   ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      : pe.band === "INTERVIEW" ? { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' }
      :                           { txt: 'text-red-800',     pill: 'bg-red-200 text-red-800' };
    return (
        <div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">NSC Performance</div>
                        <div className="text-[10px] text-slate-500">
                            {nsc.profile.legalName} · Prince Edward Island · Carrier Profile as of {fmtDateSlash(nsc.profile.lastPullDate)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Latest Pull {fmtDateLong(nsc.profile.lastPullDate)}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200 text-slate-600">NSC Summary</span>
                </div>
            </div>

            <div className="px-4 pt-4 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NSC Profile Score</div>
                <div className="flex items-baseline gap-3 mb-1">
                    <span className={cn('text-5xl font-black', tone.txt)}>{pe.points}</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', tone.pill)}>{pe.band}</span>
                </div>
                <div className={cn('text-sm font-bold mb-2', tone.txt)}>{pe.pctOfMax.toFixed(1)}% of max</div>
                <div className="text-[11px] text-slate-500 mb-2">Carrier must strive for the <span className="font-bold">lowest score</span></div>
                <div className="text-[10px] text-slate-500 mb-3">
                    <span className="font-mono">Fleet {nsc.profile.fleetSize}</span> · Max {pe.maxPoints} pts · Prince Edward Island
                </div>
                <PeiGradientStrip points={pe.points} pctOfMax={pe.pctOfMax} thresholds={pe.thresholds} />
                <div className={cn('mt-3 px-3 py-2 rounded-lg border text-[11px] flex items-center justify-between', pe.band === 'SAFE' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-yellow-50 border-yellow-100 text-yellow-700')}>
                    <span>● {pe.band === "SAFE"
                        ? "Carrier in SAFE zone — no provincial action required"
                        : `Carrier has entered ${pe.band} level (${pe.points} pts >= ${pe.band === 'ADVISORY' ? pe.thresholds.advisory : pe.band === 'WARNING' ? pe.thresholds.warning : pe.band === 'INTERVIEW' ? pe.thresholds.interview : pe.thresholds.sanction}) - implement corrective measures`}</span>
                    <span className="text-[10px] text-slate-400">{fmtDateSlash(nsc.profile.lastPullDate)}</span>
                </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assessment Points <span className="font-normal text-slate-400">(as of {fmtDateSlash(nsc.profile.lastPullDate)} · {pe.points} of {pe.maxPoints} max · {pe.pctOfMax.toFixed(1)}%)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <PeiBucketCard b={pe.buckets.collisionPoints} />
                    <PeiBucketCard b={pe.buckets.convictionPoints} />
                    <PeiBucketCard b={pe.buckets.inspectionPoints} />
                </div>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500"><span className="font-bold">Contribution Levels</span> · Low &lt;25% · Moderate 25–60% · High / Primary &gt;60%</span>
                <span className="text-blue-600 font-bold cursor-pointer">PEI Schedule 3 Info ▾</span>
            </div>
        </div>
    );
}
function PeiGradientStrip({ points, pctOfMax, thresholds }: { points: number; pctOfMax: number; thresholds: { advisory: number; warning: number; interview: number; sanction: number } }) {
    const pos = Math.max(0, Math.min(100, pctOfMax));
    return (
        <div className="relative">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-700" />
            <div className="absolute -top-7 -translate-x-1/2" style={{ left: `${pos}%` }}>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{points} pts ({pctOfMax.toFixed(1)}%)</div>
                <div className="w-px h-3 bg-slate-900 mx-auto" />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <span>SAFE</span><span>ADVISORY</span><span>WARNING</span><span>INTERVIEW</span><span>SANCTION</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-1">
                <span className="font-bold text-slate-500">PEI Thresholds</span> · ADVISORY ≥ {thresholds.advisory} · WARNING ≥ {thresholds.warning} · INTERVIEW ≥ {thresholds.interview} · SANCTION ≥ {thresholds.sanction}
            </div>
        </div>
    );
}
function PeiBucketCard({ b }: { b: NonNullable<NscBreakdown["pe"]>["buckets"]["collisionPoints"] }) {
    const tone =
        b.level === "HIGH"     ? { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' }
      : b.level === "MODERATE" ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      : b.level === "LOW"      ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      :                          { txt: 'text-slate-400',   pill: 'bg-slate-100 text-slate-500' };
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.label}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', tone.pill)}>{b.level}</span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
                <span className={cn('text-2xl font-black', tone.txt)}>{b.points}</span>
                <span className="text-[10px] text-slate-400">pts</span>
            </div>
            <div className="text-[10px] text-slate-500 mb-0.5">{b.pctOfMax.toFixed(1)}% of max</div>
            <div className="text-[10px] text-slate-400 mb-2">{b.pctOfTotal.toFixed(1)}% of total {b.points} pts</div>
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-700 rounded-full" />
            <div className="flex justify-between text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                <span>LOW 25%</span><span>MOD 60%</span><span>HIGH</span>
            </div>
        </div>
    );
}

// ── Nova Scotia — Indexed Demerit ────────────────────────────────────────
function NsNscCard({ nsc, ns }: { nsc: NscBreakdown; ns: NonNullable<NscBreakdown["ns"]> }) {
    const tone =
        ns.band === "LOW"      ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      : ns.band === "MODERATE" ? { txt: 'text-yellow-700',  pill: 'bg-yellow-100 text-yellow-700' }
      : ns.band === "HIGH"     ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      :                          { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' };
    return (
        <div>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center"><TrendingUp size={16} /></div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">NSC Performance</div>
                        <div className="text-[10px] text-slate-500">
                            {nsc.profile.legalName} · Nova Scotia · Carrier Profile as of {fmtDateSlash(nsc.profile.lastPullDate)}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Latest Pull {fmtDateSlash(nsc.profile.lastPullDate)}</span>
                    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', tone.pill)}>{ns.band}</span>
                </div>
            </div>

            <div className="px-4 pt-4 pb-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">NS NSC Indexed Demerit Score</div>
                <div className="flex items-baseline gap-3 mb-1">
                    <span className={cn('text-5xl font-black', tone.txt)}>{ns.indexedScore.toFixed(2)}</span>
                    <span className="text-base text-slate-400">/ {ns.levelCap.toFixed(2)}</span>
                    <span className={cn('px-2 py-0.5 rounded text-xs font-bold uppercase', tone.pill)}>{ns.band}</span>
                </div>
                <div className={cn('text-sm font-bold mb-2', tone.txt)}>{ns.pctOfCap.toFixed(1)}% of Level 3 cap</div>
                <div className="text-[11px] text-slate-500 mb-3">Carrier must strive for the <span className="font-bold">lowest score</span></div>
                <div className="text-[10px] text-slate-500 mb-3">
                    <span className="font-mono">Fleet {nsc.profile.fleetSize}</span> · Avg {(ns.indexedScore / Math.max(nsc.profile.fleetSize, 1)).toFixed(2)} · Nova Scotia
                </div>
                <NsGradientStrip indexedScore={ns.indexedScore} pctOfCap={ns.pctOfCap} thresholds={ns.thresholds} levelCap={ns.levelCap} />
                <div className={cn('mt-3 px-3 py-2 rounded-lg border text-[11px] flex items-center justify-between',
                    ns.band === 'LOW' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                    ns.band === 'MODERATE' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
                    ns.band === 'HIGH' ? 'bg-orange-50 border-orange-100 text-orange-700' :
                    'bg-red-50 border-red-100 text-red-700')}>
                    <span>● {ns.band} band - score {ns.indexedScore.toFixed(4)} is {ns.pctOfCap.toFixed(1)}% of Level 3 cap ({ns.levelCap.toFixed(4)}), {ns.band === 'LOW' ? `below Moderate threshold (${ns.thresholds.moderate.toFixed(4)})` : 'above intervention threshold'}</span>
                    <span className="text-[10px] text-slate-400">{fmtDateSlash(nsc.profile.lastPullDate)}</span>
                </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Indexed Score Breakdown <span className="font-normal text-slate-400">({ns.indexedScore.toFixed(4)} total · {ns.pctOfCap.toFixed(1)}% of Level 3 cap · Band: {ns.band})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <NsBucketCard b={ns.breakdown.convictions} />
                    <NsBucketCard b={ns.breakdown.inspections} />
                    <NsBucketCard b={ns.breakdown.collisions} />
                </div>
            </div>
            <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                <span className="text-slate-500"><span className="font-bold">Contribution Levels</span> · Low &lt;25% · Moderate 25–55% · Primary &gt;55% <span className="text-slate-400 italic">(% of Level 3 threshold)</span></span>
                <span className="text-blue-600 font-bold cursor-pointer">NS Rating Score Info ▾</span>
            </div>
        </div>
    );
}
function NsGradientStrip({ indexedScore, pctOfCap, thresholds, levelCap }: { indexedScore: number; pctOfCap: number; thresholds: { moderate: number; high: number; critical: number }; levelCap: number }) {
    const pos = Math.max(0, Math.min(100, pctOfCap));
    return (
        <div className="relative">
            <div className="h-3 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-700" />
            <div className="absolute -top-7 -translate-x-1/2" style={{ left: `${pos}%` }}>
                <div className="bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">{indexedScore.toFixed(2)} ({pctOfCap.toFixed(1)}%)</div>
                <div className="w-px h-3 bg-slate-900 mx-auto" />
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                <span>LOW</span><span>MODERATE</span><span>HIGH</span><span>CRITICAL</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                <span>
                    <span className="font-bold text-slate-500">NS Thresholds</span> · Moderate ≥ {thresholds.moderate.toFixed(4)} · High ≥ {thresholds.high.toFixed(4)} · Critical ≥ {thresholds.critical.toFixed(4)}
                </span>
                <span className="text-slate-400">Score: {indexedScore.toFixed(2)} / {levelCap.toFixed(2)} · {pctOfCap.toFixed(1)}%</span>
            </div>
        </div>
    );
}
function NsBucketCard({ b }: { b: NonNullable<NscBreakdown["ns"]>["breakdown"]["convictions"] }) {
    const tone =
        b.level === "HIGH"     ? { txt: 'text-red-700',     pill: 'bg-red-100 text-red-700' }
      : b.level === "MODERATE" ? { txt: 'text-orange-700',  pill: 'bg-orange-100 text-orange-700' }
      : b.level === "LOW"      ? { txt: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700' }
      :                          { txt: 'text-slate-400',   pill: 'bg-slate-100 text-slate-500' };
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{b.label}</span>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase', tone.pill)}>{b.level}</span>
            </div>
            <div className={cn('text-2xl font-black mb-1', tone.txt)}>{b.score.toFixed(4)}</div>
            <div className="text-[10px] text-slate-500 mb-0.5">{b.pctOfCap.toFixed(1)}% of L3 cap</div>
            <div className="text-[10px] text-slate-400 mb-2">{b.pctOfTotal.toFixed(1)}% of total score</div>
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-red-700 rounded-full" />
            <div className="flex justify-between text-[9px] mt-1 text-slate-400 font-bold uppercase tracking-wider">
                <span>LOW 25%</span><span>MOD 55%</span><span>HIGH</span>
            </div>
        </div>
    );
}

// ── Generic fallback for non-AB/BC/PE/NS NSC abstracts ────────────────────
function GenericNscCard({ nsc }: { nsc: NscBreakdown }) {
    const n = nsc;
    const rTxt =
        n.label === 'Excellent'    ? 'text-emerald-700'
      : n.label === 'Satisfactory' ? 'text-green-700'
      : n.label === 'Conditional'  ? 'text-amber-700'
      :                              'text-red-700';
    const rBar =
        n.label === 'Excellent'    ? 'bg-emerald-400'
      : n.label === 'Satisfactory' ? 'bg-green-500'
      : n.label === 'Conditional'  ? 'bg-amber-400'
      :                              'bg-red-500';
    const rBg =
        n.label === 'Excellent'    ? 'bg-emerald-50 border-emerald-100'
      : n.label === 'Satisfactory' ? 'bg-green-50 border-green-100'
      : n.label === 'Conditional'  ? 'bg-amber-50 border-amber-100'
      :                              'bg-red-50 border-red-100';
    const buckets = [
        { label: 'Collisions',  weight: '40%', count: n.collisions.count,  rate: n.collisions.rate,  sub: `${n.collisions.rate}/100 drivers` },
        { label: 'Convictions', weight: '40%', count: n.convictions.count, rate: n.convictions.rate, sub: `${n.convictions.rate}/100 drivers` },
        { label: 'Inspections', weight: '20%', count: n.inspections.count, rate: n.inspections.oosRate, sub: `OOS ${n.inspections.oosRate.toFixed(1)}%` },
    ];
    return (
        <>
            <div className={cn('flex items-center gap-4 px-4 py-3 border-b', rBg)}>
                <div>
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">NSC Carrier Rating · Province {n.province}</div>
                    <div className="flex items-baseline gap-1.5">
                        <span className={cn('text-2xl font-black', rTxt)}>{n.rating.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400">/100</span>
                        <span className={cn('text-xs font-bold italic ml-1', rTxt)}>{n.label}</span>
                    </div>
                </div>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', rBar)} style={{ width: `${Math.min(n.rating, 100)}%` }} />
                </div>
                <div className="text-right">
                    <div className="text-[9px] text-slate-400 uppercase">NSC No.</div>
                    <div className="text-[11px] font-bold text-slate-600">{n.nscNumber}</div>
                </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100">
                {buckets.map(b => {
                    const heat = b.rate >= 30 ? 'bg-red-400' : b.rate >= 15 ? 'bg-amber-400' : 'bg-emerald-400';
                    const txt  = b.rate >= 30 ? 'text-red-600' : b.rate >= 15 ? 'text-amber-600' : 'text-emerald-600';
                    return (
                        <div key={b.label} className="p-3.5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-slate-700">{b.label}</span>
                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 font-bold rounded">Wt {b.weight}</span>
                            </div>
                            <div className={cn('text-xl font-black mb-0.5', txt)}>{b.count}</div>
                            <div className="text-[9px] text-slate-400 mb-1.5">events recorded</div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                                <div className={cn('h-full rounded-full', heat)} style={{ width: `${Math.min(b.rate * 3, 100)}%` }} />
                            </div>
                            <div className="text-[10px] text-slate-500">{b.sub}</div>
                        </div>
                    );
                })}
            </div>
            <div className="px-4 py-1.5 bg-rose-50 border-t border-rose-100 text-[9px] text-rose-600">
                NSC carrier abstract · provincial regulator: {provinceLabel(n.province)} · ratings derived from per-100-driver event rates.
            </div>
        </>
    );
}

function provinceFullName(code: string): string {
    const map: Record<string, string> = {
        AB: 'Alberta', BC: 'British Columbia', MB: 'Manitoba', NB: 'New Brunswick',
        NL: 'Newfoundland & Labrador', NS: 'Nova Scotia', ON: 'Ontario',
        PE: 'Prince Edward Island', QC: 'Quebec', SK: 'Saskatchewan',
        YT: 'Yukon', NT: 'Northwest Territories', NU: 'Nunavut',
    };
    return map[code] ?? code;
}

function provinceLabel(code: string): string {
    const map: Record<string, string> = {
        AB: 'Alberta Transportation', BC: 'BC Commercial Vehicle Safety & Enforcement',
        MB: 'Manitoba Infrastructure', NB: 'NB Department of Public Safety',
        NL: 'NL Service NL', NS: 'NS Registry of Motor Vehicles',
        PE: 'PEI Highway Safety', QC: 'SAAQ — Société de l\'assurance automobile du Québec',
        SK: 'SGI — Saskatchewan Government Insurance',
    };
    return map[code] ?? code;
}

// ── SafetyRingChart (ported from SafetyAnalysisPage) ─────────────────────
// Same visual as the old page so users see one consistent ring style.

function SafetyRingChart({
    label, score, size = 'small', subtitle, palette = 'auto',
}: {
    label: string;
    score: number;
    size?: 'large' | 'small';
    subtitle?: string;
    palette?: 'auto' | 'blue' | 'green';
}) {
    const clamped = Math.max(0, Math.min(score, 100));
    const risk = getRiskMeta(clamped);
    const ringSize = size === 'large' ? 'w-40 h-40 lg:w-44 lg:h-44' : 'w-24 h-24';
    const numberSize = size === 'large' ? 'text-4xl lg:text-5xl' : 'text-3xl';
    const paletteClasses = palette === 'blue'
        ? { ringClass: 'text-blue-600',    pillClass: 'bg-blue-100 text-blue-700',       textClass: 'text-blue-700' }
        : palette === 'green'
            ? { ringClass: 'text-emerald-500', pillClass: 'bg-emerald-100 text-emerald-700', textClass: 'text-emerald-700' }
            : clamped >= 90
                ? { ringClass: 'text-emerald-500', pillClass: 'bg-emerald-100 text-emerald-700', textClass: 'text-emerald-700' }
                : clamped >= 80
                    ? { ringClass: 'text-blue-600',    pillClass: 'bg-blue-100 text-blue-700',       textClass: 'text-blue-700' }
                    : clamped >= 70
                        ? { ringClass: 'text-amber-500',   pillClass: 'bg-amber-100 text-amber-700',     textClass: 'text-amber-700' }
                        : { ringClass: 'text-red-500',     pillClass: 'bg-red-100 text-red-700',         textClass: 'text-red-700' };

    return (
        <div className="w-full flex flex-col items-center text-center">
            <div className={cn('text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 leading-tight', size === 'large' ? '' : 'min-h-[2.5rem] flex items-center justify-center px-1')}>
                {label}
            </div>
            <div className={cn('relative flex items-center justify-center', ringSize)}>
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                        className="text-slate-200"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={size === 'large' ? 3 : 4}
                    />
                    <path
                        className={paletteClasses.ringClass}
                        strokeDasharray={`${clamped.toFixed(2)}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={size === 'large' ? 3 : 4}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className={cn(numberSize, 'font-black text-slate-900 leading-none')}>{Math.round(clamped)}</span>
                    {size === 'large' && <span className="text-xs font-bold text-slate-400">/ 100</span>}
                </div>
            </div>
            {size === 'large' ? (
                <>
                    <div className={cn('mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold', paletteClasses.pillClass)}>
                        <Shield size={13} />
                        {risk.label}
                    </div>
                    {subtitle && <div className="mt-2 text-xs font-semibold text-slate-500 text-center">{subtitle}</div>}
                </>
            ) : (
                <div className={cn('mt-2 text-xs font-bold uppercase tracking-wide', paletteClasses.textClass)}>{risk.shortLabel}</div>
            )}
        </div>
    );
}

// ── Accident / Collision sub-view ──────────────────────────────────────────

function AccidentCollisionView({ types }: { types: EffectiveType[] }) {
    const [activeLens, setActiveLens] = useState<keyof AccidentClassMapping>("fmcsaInspection");
    const [search, setSearch] = useState("");

    // Buckets: lens-class-key → list of types mapped to it.
    // For nested lenses (PEI, NS) keys are formatted as "Sub » Value".
    const buckets = useMemo(() => {
        const map = new Map<string, EffectiveType[]>();
        for (const t of types) {
            const m = t.defaultClassMapping?.[activeLens];
            if (!m) continue;
            if (Array.isArray(m)) {
                for (const v of m) {
                    const arr = map.get(v) ?? [];
                    arr.push(t);
                    map.set(v, arr);
                }
            } else {
                for (const [sub, vals] of Object.entries(m as Record<string, string[]>)) {
                    for (const v of vals ?? []) {
                        const k = `${sub} » ${v}`;
                        const arr = map.get(k) ?? [];
                        arr.push(t);
                        map.set(k, arr);
                    }
                }
            }
        }
        return map;
    }, [types, activeLens]);

    // Unmapped pile: types with no value on the active lens.
    const unmapped = useMemo(() => {
        return types.filter((t) => {
            const m = t.defaultClassMapping?.[activeLens];
            if (!m) return true;
            if (Array.isArray(m)) return m.length === 0;
            return Object.values(m as Record<string, string[]>).every((arr) => !arr || arr.length === 0);
        });
    }, [types, activeLens]);

    const lens = CLASS_MAPPING_LENSES.find((l) => l.key === activeLens)!;
    const lensTone = LENS_TONE[activeLens];

    // Search filter (filters within each bucket).
    const filterTypes = (list: EffectiveType[]): EffectiveType[] => {
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((t) =>
            t.displayName.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.group.toLowerCase().includes(q),
        );
    };

    const totalMapped = useMemo(() => {
        const set = new Set<string>();
        for (const arr of buckets.values()) for (const t of arr) set.add(t.id);
        return set.size;
    }, [buckets]);

    return (
        <div className="px-8 py-6">
            {/* Lens picker + search */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-5">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Layers3 size={14} className="text-slate-500" />
                        <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500">Group by</span>
                    </div>
                    <div className="relative max-w-xs flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search accident types in this view…"
                            className="pl-8 h-8 bg-white border-slate-200 text-xs"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-2 flex-wrap">
                    {CLASS_MAPPING_LENSES.map((l) => {
                        const active = l.key === activeLens;
                        return (
                            <button
                                type="button"
                                key={l.key as string}
                                onClick={() => setActiveLens(l.key)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-wider transition-colors",
                                    active ? cn(LENS_TONE[l.key], "ring-2 ring-current/20") : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50",
                                )}
                            >
                                <span>{l.short}</span>
                                <span className="text-[10px] font-semibold opacity-70 normal-case">{l.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Active lens header */}
            <div className="flex items-baseline justify-between gap-3 mb-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">{lens.label}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{lens.description}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <span className="font-semibold text-slate-700 tabular-nums">{buckets.size}</span> classes
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                        <span className="font-semibold text-slate-700 tabular-nums">{totalMapped}</span> mapped types
                    </span>
                    {unmapped.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
                            <span className="font-semibold tabular-nums">{unmapped.length}</span> unmapped
                        </span>
                    )}
                </div>
            </div>

            {/* Buckets */}
            {buckets.size === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
                    No accident types are mapped to <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider mx-1", lensTone)}>{lens.short}</span>.
                    Open <span className="font-semibold text-slate-700">Settings &rsaquo; Accidents</span> and edit a row to add mappings here.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from(buckets.entries())
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([className, items]) => {
                            const filtered = filterTypes(items);
                            const totalPts = filtered.reduce((s, t) => s + t.defaultRiskPoints, 0);
                            const critical = filtered.filter((t) => t.defaultRiskType === "Critical").length;
                            return (
                                <div key={className} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider", lensTone)}>
                                                {lens.short}
                                            </span>
                                            <h3 className="text-[13px] font-semibold text-slate-900 truncate" title={className}>{className}</h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 shrink-0">
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold tabular-nums">
                                                {filtered.length}
                                            </span>
                                            {critical > 0 && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-bold uppercase tracking-wider">
                                                    <ShieldAlert size={9} /> {critical}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-bold tabular-nums" title="Sum of risk points">
                                                {totalPts}pts
                                            </span>
                                        </div>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {filtered.length === 0 ? (
                                            <div className="px-4 py-3 text-[11px] text-slate-400 italic">No matches for current search.</div>
                                        ) : (
                                            filtered.map((t) => (
                                                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[12px] font-semibold text-slate-900 truncate" title={t.displayName}>{t.displayName}</span>
                                                            {t.isCustom && (
                                                                <span className="text-[9px] px-1 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-bold uppercase tracking-wider">Custom</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap", ACCIDENT_GROUP_TONE[t.group])}>
                                                                {t.group}
                                                            </span>
                                                            <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider", RISK_TYPE_TONE[t.defaultRiskType])}>
                                                                {t.defaultRiskType}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-[12px] font-semibold tabular-nums text-slate-700 shrink-0">
                                                        {t.defaultRiskPoints} pts
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Unmapped types */}
            {unmapped.length > 0 && (
                <div className="mt-6">
                    <div className="text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-2">
                        Unmapped on this lens
                    </div>
                    <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {filterTypes(unmapped).map((t) => (
                                <div key={t.id} className="px-4 py-2 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[12px] font-semibold text-slate-700 truncate" title={t.displayName}>{t.displayName}</span>
                                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded border text-[9px] font-semibold whitespace-nowrap", ACCIDENT_GROUP_TONE[t.group])}>
                                            {t.group}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">No {lens.short} class set</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BetaSafetyAnalysisPage;
