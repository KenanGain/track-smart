/**
 * Forecast tab — risk score projection + per-asset maintenance prediction.
 *
 * Spec: docs/SAFETY.md (extension).
 *
 * Layout:
 *   • Horizon filter chips (1 / 2 / 3 / 6 / 12 / 16 / 18 mo · 3 / 5 yr)
 *   • Forecast trend chart (history tail + projection band, recharts)
 *   • Forecast summary stats (slope, R², confidence)
 *   • Forecast alerts list
 *   • Per-asset maintenance forecast — sortable, filterable list view
 *   • CSV export buttons (forecast points + maintenance items)
 */

import { useEffect, useMemo, useState } from 'react';
import {
    Area, Line, XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, ReferenceLine, ComposedChart,
    PieChart, Pie, Cell,
} from 'recharts';
import {
    Download,
    Info,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    AlertCircle,
    Search,
    Wrench,
} from 'lucide-react';

import { useRiskConfig } from './risk-store';
import {
    forecastCarrierRisk,
    horizonLabel,
    type ForecastSummary,
    type ForecastPoint,
    type ForecastTrend,
} from './risk-forecast';
import {
    forecastCarrierMaintenance,
    maintenancePerMonth,
    type MaintenanceForecastItem,
} from './risk-maintenance-forecast';
import {
    forecastDriverIncidents,
    forecastJurisdictionHotspots,
    type DriverIncidentForecast,
    type JurisdictionHotspotForecast,
} from './risk-incident-forecast';
import { ForecastFilterBar } from './ForecastFilterBar';
import { ForecastGuide } from './ForecastGuide';
import { HowComputed } from './HowComputed';
import {
    applyEventFilters,
    loadFilters,
    saveFilters,
    passesDistanceFilter,
    type ForecastFilters,
} from './risk-filters';
import { aggregateByJurisdiction } from './risk-geo';
import { loadRiskEventsForCarrier } from './risk-load';
import { useRiskScore, useRiskConfig as useRiskConfigStore } from './risk-store';
import {
    exportForecastPointsCsv,
    exportDriverIncidentsCsv,
    exportHotspotCsv,
    exportMaintenanceCsv,
    exportCombinedCsv,
    exportCarrierForecastPdf,
    exportFullBundleZip,
} from './risk-export';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────
// Page section
// ────────────────────────────────────────────────────────────────────────────

export function SafetyForecast({ carrierId }: { carrierId: string }) {
    const { config } = useRiskConfig(carrierId);
    const [filters, setFilters] = useState<ForecastFilters>(() => loadFilters());
    const horizon = filters.horizonMonths;

    useEffect(() => { saveFilters(filters); }, [filters]);

    // Reload on carrier change to discard any stale jurisdiction codes
    // that don't apply to the new carrier.
    useEffect(() => {
        setFilters((prev) => ({
            ...prev,
            jurisdictions: prev.jurisdictions.filter((j) =>
                aggregateByJurisdiction(loadRiskEventsForCarrier(carrierId)).some((s) => s.code === j),
            ),
        }));
    }, [carrierId]);

    // Compute filtered ledger ONCE; every section reuses it.
    const allEvents = useMemo(() => loadRiskEventsForCarrier(carrierId), [carrierId]);
    const filteredEvents = useMemo(() => applyEventFilters(allEvents, filters), [allEvents, filters]);
    const jurStats = useMemo(() => aggregateByJurisdiction(allEvents), [allEvents]);

    // Maintenance comes first — its monthly buckets feed the risk forecast.
    const maintenance = useMemo(() => {
        const all = forecastCarrierMaintenance(carrierId, horizon);
        // Distance filter narrows to assets in the chosen mileage buckets.
        return filters.distanceBuckets.length === 0
            ? all
            : all.filter((it) => passesDistanceFilter(carrierId, it.assetId, filters));
    }, [carrierId, horizon, filters]);

    const maintByMonth = useMemo(
        () => maintenancePerMonth(maintenance, horizon),
        [maintenance, horizon],
    );

    const forecast = useMemo(
        () => forecastCarrierRisk(carrierId, horizon, config, maintByMonth, filters),
        [carrierId, horizon, config, maintByMonth, filters],
    );

    const driverIncidents = useMemo(
        () => forecastDriverIncidents(carrierId, horizon, filters),
        [carrierId, horizon, filters],
    );

    const hotspots = useMemo(
        () => forecastJurisdictionHotspots(carrierId, horizon, filters),
        [carrierId, horizon, filters],
    );

    return (
        <div className="space-y-5">
            <ExportToolbar
                forecast={forecast}
                drivers={driverIncidents}
                hotspots={hotspots}
                maintenance={maintenance}
                filters={filters}
                carrierId={carrierId}
            />
            <HowComputed
                title="How the forecast is generated"
                steps={[
                    <>The filtered event ledger ({filteredEvents.length.toLocaleString()} of {allEvents.length.toLocaleString()} events) is bucketed into <b>monthly counts for the trailing 24 months</b>.</>,
                    <>A <b>linear regression</b> on monthly safety scores yields slope (pts/month), intercept, and residual σ. Holt-style EWMA (α = 0.4) smooths the event/OOS series.</>,
                    <>The regression slope is <b>damped by exp(−Δt / 36 mo)</b> as we project forward, and pulled toward the long-run mean past 36 months — this prevents 5-year forecasts from running away.</>,
                    <>The 80% confidence band widens as <b>±1.28·σ·√Δt</b> so distant points carry visibly wider uncertainty.</>,
                    <>Per-driver and per-jurisdiction projections re-apply the same EWMA pipeline to each entity's individual history. Maintenance items use a four-tier prediction cascade (scheduled date → odometer projection → engine-hours projection → recurring frequency).</>,
                    <>Critical-band crossings inside the horizon are auto-flagged as alerts and surfaced above the chart.</>,
                ]}
                formula={[
                    'recencyWeight(d) = step(d) × 0.5^(d / halfLife)',
                    'safety_t+k       = blend(regression(t+k), lastObserved + dampedSlope·k)',
                    'CI_80(safety_t+k) = ±1.28 × σ_residual × √k',
                    'predictedEvents   = EWMA_α=0.4(eventCounts[-24..0]) × horizonMonths',
                ].join('\n')}
                collapsedByDefault
            />
            <ForecastGuide filters={filters} onApply={setFilters} />
            <ForecastFilterBar
                filters={filters}
                onChange={setFilters}
                jurisdictions={jurStats}
                totalEvents={allEvents.length}
                filteredEvents={filteredEvents.length}
            />
            <ForecastSummaryCards summary={forecast} />
            <ForecastChart summary={forecast} cfg={config} />
            <ForecastAlerts summary={forecast} />
            <PredictedHotspots hotspots={hotspots} horizon={horizon} />
            <PredictedDriverIncidents drivers={driverIncidents} horizon={horizon} />
            <MaintenanceCostByCategory items={maintenance} horizon={horizon} />
            <MaintenanceList items={maintenance} carrierId={carrierId} horizon={horizon} />
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Export toolbar — placed at the TOP of the page
// ────────────────────────────────────────────────────────────────────────────

function ExportToolbar({
    forecast, drivers, hotspots, maintenance, filters, carrierId,
}: {
    forecast: ForecastSummary;
    drivers: DriverIncidentForecast[];
    hotspots: JurisdictionHotspotForecast[];
    maintenance: MaintenanceForecastItem[];
    filters: ForecastFilters;
    carrierId: string;
}) {
    const [busy, setBusy] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<'csv' | 'pdf' | null>(null);
    const carrierScore = useRiskScore({ kind: 'carrier', carrierId }, carrierId);
    const { config: riskConfig } = useRiskConfigStore(carrierId);
    const carrierName = useMemo(() => {
        // Best-effort label; the dropdown header above the page already
        // shows the canonical carrier name. Fallback to id when unknown.
        return carrierId.slice(-6);
    }, [carrierId]);

    const ctx = useMemo(() => ({
        forecast, drivers, hotspots, maintenance, filters,
        carrierName, carrierId,
    }), [forecast, drivers, hotspots, maintenance, filters, carrierName, carrierId]);

    const run = async (label: string, fn: () => Promise<void> | void) => {
        try {
            setBusy(label);
            await fn();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`[export] ${label} failed:`, err);
        } finally {
            setBusy(null);
            setOpenMenu(null);
        }
    };

    const totalRows =
        forecast.points.length + forecast.history.length
        + drivers.length + hotspots.length + maintenance.length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-700">Export forecast</span>
                    <span className="text-xs text-slate-500">
                        {totalRows.toLocaleString()} rows · {forecast.alerts.length} alerts · config{' '}
                        <span className="font-mono">{forecast.base.configHash}</span>
                    </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* CSV menu */}
                    <DropdownMenu
                        label="CSV"
                        icon={<Download className="w-3.5 h-3.5" />}
                        open={openMenu === 'csv'}
                        onToggle={() => setOpenMenu((m) => m === 'csv' ? null : 'csv')}
                        onClose={() => setOpenMenu(null)}
                        items={[
                            { label: 'Forecast points',    hint: `${forecast.points.length + forecast.history.length} pts`, onClick: () => run('csv-points', () => exportForecastPointsCsv(ctx)) },
                            { label: 'Driver incidents',   hint: `${drivers.length} drivers`,    onClick: () => run('csv-drivers', () => exportDriverIncidentsCsv(ctx)) },
                            { label: 'Hotspot locations',  hint: `${hotspots.length} jurs`,      onClick: () => run('csv-hotspots', () => exportHotspotCsv(ctx)) },
                            { label: 'Maintenance items',  hint: `${maintenance.length} items`,  onClick: () => run('csv-maint', () => exportMaintenanceCsv(ctx)) },
                            { label: 'Combined workbook',  hint: 'all sections', onClick: () => run('csv-combined', () => exportCombinedCsv(ctx)) },
                        ]}
                    />
                    {/* PDF menu */}
                    <DropdownMenu
                        label="PDF"
                        icon={<Download className="w-3.5 h-3.5" />}
                        open={openMenu === 'pdf'}
                        onToggle={() => setOpenMenu((m) => m === 'pdf' ? null : 'pdf')}
                        onClose={() => setOpenMenu(null)}
                        items={[
                            { label: 'Carrier forecast report', hint: 'multi-page A4', onClick: () => run('pdf-carrier', () => exportCarrierForecastPdf(ctx, carrierScore, riskConfig)) },
                        ]}
                    />
                    {/* Full bundle */}
                    <button
                        type="button"
                        onClick={() => run('zip', () => exportFullBundleZip(ctx, carrierScore, riskConfig))}
                        disabled={busy !== null}
                        className={cn(
                            'px-3 py-1.5 text-xs rounded-md font-semibold inline-flex items-center gap-1.5',
                            busy === 'zip'
                                ? 'bg-slate-300 text-slate-500'
                                : 'bg-blue-600 text-white hover:bg-blue-700',
                        )}
                    >
                        <Download className="w-3.5 h-3.5" /> Full bundle (.zip)
                    </button>
                </div>
            </div>
            {busy && (
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                    Generating <span className="font-mono">{busy}</span>…
                </div>
            )}
        </div>
    );
}

interface DropdownMenuItem {
    label: string;
    hint?: string;
    onClick: () => void;
}

function DropdownMenu({
    label, icon, items, open, onToggle, onClose,
}: {
    label: string;
    icon: React.ReactNode;
    items: DropdownMenuItem[];
    open: boolean;
    onToggle: () => void;
    onClose: () => void;
}) {
    return (
        <div className="relative">
            <button
                type="button"
                onClick={onToggle}
                className={cn(
                    'px-3 py-1.5 text-xs rounded-md font-medium inline-flex items-center gap-1.5 ring-1 transition-colors',
                    open
                        ? 'bg-blue-600 text-white ring-blue-600'
                        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
                )}
            >
                {icon} {label}
                <span className={cn('transition-transform', open && 'rotate-180')}>▾</span>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden="true" />
                    <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg ring-1 ring-slate-200 shadow-lg p-1 z-20">
                        {items.map((it, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={it.onClick}
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-50 text-slate-700 text-xs flex items-center justify-between gap-2"
                            >
                                <span className="font-medium">{it.label}</span>
                                {it.hint && <span className="text-[10px] text-slate-400">{it.hint}</span>}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Summary cards
// ────────────────────────────────────────────────────────────────────────────

function ForecastSummaryCards({ summary }: { summary: ForecastSummary }) {
    const last = summary.points[summary.points.length - 1];
    const delta = last.predictedSafety - summary.base.safetyScore;
    const TrendIcon = summary.trend === 'improving' ? TrendingUp
        : summary.trend === 'degrading' ? TrendingDown
        : Minus;
    const trendColor = summary.trend === 'improving' ? 'text-emerald-600'
        : summary.trend === 'degrading' ? 'text-rose-600'
        : 'text-slate-500';

    return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat
                label="Now"
                value={summary.base.safetyScore.toFixed(1)}
                hint={`${summary.base.rating} · ${summary.base.confidence} confidence`}
            />
            <Stat
                label={`In ${horizonLabel(summary.horizonMonths)}`}
                value={last.predictedSafety.toFixed(1)}
                hint={`${last.lowerBound.toFixed(1)} – ${last.upperBound.toFixed(1)} (80%)`}
                accent={delta >= 0 ? 'emerald' : 'rose'}
            />
            <Stat
                label="Trend"
                value={summary.trend.charAt(0).toUpperCase() + summary.trend.slice(1)}
                hint={`Slope ${summary.slope >= 0 ? '+' : ''}${summary.slope.toFixed(2)} pts/mo`}
                icon={<TrendIcon className={cn('w-5 h-5', trendColor)} />}
            />
            <Stat
                label="Fit quality"
                value={`R² ${summary.r2.toFixed(2)}`}
                hint={`σ residual ${summary.residualStd.toFixed(2)}`}
            />
            <Stat
                label="Confidence"
                value={summary.confidence}
                hint={summary.history.length + ' months of history'}
                accent={summary.confidence === 'high' ? 'emerald' : summary.confidence === 'medium' ? 'amber' : 'rose'}
            />
        </div>
    );
}

function Stat({
    label, value, hint, accent, icon,
}: {
    label: string;
    value: string | number;
    hint?: string;
    accent?: 'emerald' | 'rose' | 'amber';
    icon?: React.ReactNode;
}) {
    const accentText = accent === 'emerald' ? 'text-emerald-700'
        : accent === 'rose' ? 'text-rose-700'
        : accent === 'amber' ? 'text-amber-700'
        : 'text-slate-900';
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
                {icon}
            </div>
            <div className={cn('text-2xl font-bold tabular-nums mt-1 capitalize', accentText)}>{value}</div>
            {hint && <div className="text-[11px] text-slate-500 mt-1 truncate">{hint}</div>}
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Forecast chart
// ────────────────────────────────────────────────────────────────────────────

function ForecastChart({
    summary, cfg,
}: { summary: ForecastSummary; cfg: { bands: { excellentFloor: number; goodFloor: number; fairFloor: number; poorFloor: number } } }) {
    // Combine history + forecast into one series with `type` markers so we
    // can dim the historical tail and emphasise the forecast span.
    const data = useMemo(() => {
        const rows = [
            ...summary.history.map((h) => ({
                month: h.month,
                actual: h.predictedSafety,
                forecast: null,
                lower: null,
                upper: null,
                events: 0,
                oos: 0,
                maint: 0,
            })),
            ...summary.points.map((p, i) => ({
                month: p.month,
                actual: i === 0 ? p.predictedSafety : null,
                forecast: p.predictedSafety,
                lower: p.lowerBound,
                upper: p.upperBound,
                events: p.predictedEvents,
                oos: p.predictedOos,
                maint: p.predictedMaintenance,
            })),
        ];
        return rows;
    }, [summary]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Risk-score forecast</h3>
                <Tip text="Solid line = observed history. Dashed = projection. Shaded band = 80% prediction interval (widens with horizon)." />
            </div>
            <p className="text-xs text-slate-500 mb-4">
                History {summary.history.length} mo · forecast {summary.horizonMonths} mo · damped toward long-run mean past 36 mo.
            </p>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                        {/* Confidence band */}
                        <Area dataKey="upper" stroke="none" fill="#0ea5e9" fillOpacity={0.12} />
                        <Area dataKey="lower" stroke="none" fill="#ffffff" />
                        {/* Reference band thresholds */}
                        <ReferenceLine y={cfg.bands.excellentFloor} stroke="#10b981" strokeDasharray="2 4" />
                        <ReferenceLine y={cfg.bands.goodFloor}      stroke="#84cc16" strokeDasharray="2 4" />
                        <ReferenceLine y={cfg.bands.fairFloor}      stroke="#f59e0b" strokeDasharray="2 4" />
                        <ReferenceLine y={cfg.bands.poorFloor}      stroke="#f97316" strokeDasharray="2 4" />
                        {/* History (solid) */}
                        <Line dataKey="actual" stroke="#0f172a" strokeWidth={2} dot={false} isAnimationActive={false} />
                        {/* Forecast (dashed) */}
                        <Line dataKey="forecast" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: '#0ea5e9' }} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Alerts
// ────────────────────────────────────────────────────────────────────────────

// Each alert is identified by a stable hash so an "acknowledge" decision
// survives reloads. Stored in localStorage under `safety:ack-alerts`.
const ACK_STORAGE_KEY = 'safety:ack-alerts';

function alertKey(a: ForecastSummary['alerts'][number]): string {
    return `${a.severity}|${a.date}|${a.title}`;
}

function loadAcks(): Set<string> {
    if (typeof localStorage === 'undefined') return new Set();
    try {
        const raw = localStorage.getItem(ACK_STORAGE_KEY);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
    } catch { return new Set(); }
}

function saveAcks(set: Set<string>): void {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify([...set]));
    } catch { /* ignore quota */ }
}

function ForecastAlerts({ summary }: { summary: ForecastSummary }) {
    const [acks, setAcks] = useState<Set<string>>(() => loadAcks());
    const [showAcked, setShowAcked] = useState(false);

    const toggleAck = (a: ForecastSummary['alerts'][number]) => {
        const k = alertKey(a);
        const next = new Set(acks);
        if (next.has(k)) next.delete(k);
        else next.add(k);
        setAcks(next);
        saveAcks(next);
    };

    if (summary.alerts.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-sm text-slate-500">
                No band-crossing alerts predicted within the chosen horizon.
            </div>
        );
    }

    const visible = summary.alerts.filter((a) => showAcked || !acks.has(alertKey(a)));
    const ackedCount = summary.alerts.filter((a) => acks.has(alertKey(a))).length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 className="text-base font-semibold text-slate-900">Forecast alerts</h3>
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">
                        {summary.alerts.length - ackedCount} new · {ackedCount} acknowledged
                    </span>
                    {ackedCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setShowAcked((s) => !s)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {showAcked ? 'Hide' : 'Show'} acknowledged
                        </button>
                    )}
                </div>
            </div>
            <ul className="space-y-2.5">
                {visible.map((a) => {
                    const k = alertKey(a);
                    const acked = acks.has(k);
                    return (
                        <li key={k} className={cn(
                            'p-3 rounded-lg ring-1 flex items-start gap-3 transition-opacity',
                            acked && 'opacity-50',
                            a.severity === 'urgent' ? 'bg-rose-50 ring-rose-200'
                                : a.severity === 'warn' ? 'bg-amber-50 ring-amber-200'
                                : 'bg-slate-50 ring-slate-200',
                        )}>
                            {a.severity === 'urgent' ? <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                                : a.severity === 'warn' ? <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                : <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />}
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                                <div className="text-xs text-slate-600 mt-0.5">{a.detail}</div>
                                <div className="text-[10px] text-slate-400 mt-1">{a.date}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleAck(a)}
                                className={cn(
                                    'shrink-0 px-2 py-1 text-[11px] rounded-md font-semibold ring-1 transition-colors',
                                    acked
                                        ? 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                                        : 'bg-white text-blue-700 ring-blue-200 hover:bg-blue-50',
                                )}
                                title={acked ? 'Mark as unacknowledged' : 'Acknowledge — hides on next load'}
                            >
                                {acked ? 'Acknowledged ✓' : 'Acknowledge'}
                            </button>
                        </li>
                    );
                })}
                {visible.length === 0 && ackedCount > 0 && (
                    <li className="text-xs text-slate-500 text-center py-3">
                        All {ackedCount} alerts acknowledged.
                    </li>
                )}
            </ul>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Maintenance list (table view with filters + sort)
// ────────────────────────────────────────────────────────────────────────────

type SortKey = 'predictedDue' | 'severity' | 'assetLabel' | 'daysUntilDue';

// ────────────────────────────────────────────────────────────────────────────
// Cost-by-Category donut — exec-friendly summary above the maintenance list
// ────────────────────────────────────────────────────────────────────────────

const COST_CATEGORY_KEYWORDS: Array<[string, RegExp]> = [
    ['Brake / Tire',     /brake|tire|wheel/i],
    ['Engine / Trans',   /engine|transmission|drivetrain/i],
    ['Steering / Susp',  /steering|suspension|alignment/i],
    ['Body / Lights',    /body|light|mirror|window|glass|paint/i],
    ['Electrical',       /electrical|battery|wiring|alternator/i],
    ['CVIP / Annual',    /cvip|annual|safety|inspection/i],
    ['Emissions / HVAC', /emission|hvac|cooling|exhaust/i],
    ['Fluids / Oil',     /oil|fluid|filter|coolant/i],
];

const COST_CATEGORY_COLORS: Record<string, string> = {
    'Brake / Tire':     '#dc2626',  // rose-600 — safety-critical
    'Engine / Trans':   '#7c3aed',  // violet-600
    'Steering / Susp':  '#0ea5e9',  // sky-500
    'Body / Lights':    '#84cc16',  // lime-500
    'Electrical':       '#f59e0b',  // amber-500
    'CVIP / Annual':    '#0d9488',  // teal-600
    'Emissions / HVAC': '#6366f1',  // indigo-500
    'Fluids / Oil':     '#a3a3a3',  // neutral-400
    'Other':            '#cbd5e1',  // slate-300
};

function categorize(serviceLabels: string[]): string {
    const joined = serviceLabels.join(' ');
    for (const [name, re] of COST_CATEGORY_KEYWORDS) {
        if (re.test(joined)) return name;
    }
    return 'Other';
}

function MaintenanceCostByCategory({
    items, horizon,
}: { items: MaintenanceForecastItem[]; horizon: number }) {
    const data = useMemo(() => {
        const byCat = new Map<string, { value: number; count: number }>();
        for (const it of items) {
            const cat = categorize(it.serviceLabels);
            const cur = byCat.get(cat) ?? { value: 0, count: 0 };
            cur.value += it.estimatedCost ?? 0;
            cur.count += 1;
            byCat.set(cat, cur);
        }
        return Array.from(byCat.entries())
            .map(([name, v]) => ({ name, value: v.value, count: v.count }))
            .filter((d) => d.value > 0)
            .sort((a, b) => b.value - a.value);
    }, [items]);

    const total = useMemo(() => data.reduce((a, b) => a + b.value, 0), [data]);

    if (data.length === 0 || total === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Maintenance cost by category</h3>
                <Tip text="Estimated cost grouped by service category over the chosen horizon. Brake / tire / steering categories are flagged as safety-critical." />
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Forecast spend over {horizonLabel(horizon)} · <b>${total.toLocaleString()}</b> across {items.length} item{items.length === 1 ? '' : 's'}.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={48}
                                outerRadius={88}
                                paddingAngle={2}
                                isAnimationActive={false}
                            >
                                {data.map((d) => (
                                    <Cell key={d.name} fill={COST_CATEGORY_COLORS[d.name] ?? COST_CATEGORY_COLORS.Other} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                                formatter={(v: number | undefined, n: string | undefined) => [`$${(v ?? 0).toLocaleString()}`, n ?? ''] as [string, string]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="space-y-1">
                    {data.map((d) => {
                        const pct = (d.value / total) * 100;
                        return (
                            <div key={d.name} className="flex items-center gap-2 text-xs py-1">
                                <span
                                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                                    style={{ background: COST_CATEGORY_COLORS[d.name] ?? COST_CATEGORY_COLORS.Other }}
                                />
                                <span className="flex-1 text-slate-700 font-medium">{d.name}</span>
                                <span className="text-slate-500 tabular-nums w-9 text-right">{d.count}</span>
                                <span className="text-slate-900 tabular-nums w-20 text-right font-semibold">
                                    ${d.value.toLocaleString()}
                                </span>
                                <span className="text-slate-400 tabular-nums w-12 text-right text-[10px]">
                                    {pct.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function MaintenanceList({
    items, carrierId, horizon,
}: {
    items: MaintenanceForecastItem[];
    carrierId: string;
    horizon: number;
}) {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'due' | 'upcoming'>('all');
    const [sortBy, setSortBy] = useState<SortKey>('predictedDue');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = items.filter((it) => {
            if (statusFilter !== 'all' && it.status !== statusFilter) return false;
            if (!q) return true;
            return it.assetLabel.toLowerCase().includes(q)
                || it.serviceLabels.some((s) => s.toLowerCase().includes(q))
                || it.taskId.toLowerCase().includes(q);
        });
        return list.sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            switch (sortBy) {
                case 'predictedDue': return dir * a.predictedDue.localeCompare(b.predictedDue);
                case 'severity':     return dir * (a.severity - b.severity);
                case 'assetLabel':   return dir * a.assetLabel.localeCompare(b.assetLabel);
                case 'daysUntilDue': return dir * (a.daysUntilDue - b.daysUntilDue);
            }
        });
    }, [items, query, statusFilter, sortBy, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortBy(key); setSortDir('asc'); }
    };

    const counts = useMemo(() => ({
        all: items.length,
        overdue: items.filter((i) => i.status === 'overdue').length,
        due: items.filter((i) => i.status === 'due').length,
        upcoming: items.filter((i) => i.status === 'upcoming' || i.status === 'in_progress').length,
    }), [items]);

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-slate-500" />
                            <h3 className="text-base font-semibold text-slate-900">Vehicle maintenance forecast</h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {filtered.length} of {items.length} items in the next {horizonLabel(horizon)} · carrier {carrierId.slice(-6)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['all', 'overdue', 'due', 'upcoming'] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    'px-2.5 py-1 text-xs rounded-md font-medium ring-1 transition-colors',
                                    statusFilter === s
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                                )}
                            >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                                <span className="ml-1 text-slate-400 tabular-nums">{counts[s]}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by asset, service type, or task id…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                </div>
            </div>

            <div className="overflow-auto">
                <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                        <tr>
                            <Th onClick={() => toggleSort('assetLabel')} active={sortBy === 'assetLabel'} dir={sortDir}>Asset</Th>
                            <th className="text-left px-3 py-2 font-semibold">Service</th>
                            <th className="text-left px-3 py-2 font-semibold">Status</th>
                            <Th onClick={() => toggleSort('predictedDue')} active={sortBy === 'predictedDue'} dir={sortDir}>Predicted Due</Th>
                            <Th onClick={() => toggleSort('daysUntilDue')} active={sortBy === 'daysUntilDue'} dir={sortDir} align="right">Days</Th>
                            <Th onClick={() => toggleSort('severity')} active={sortBy === 'severity'} dir={sortDir} align="right">σ</Th>
                            <th className="text-right px-3 py-2 font-semibold">Est. cost</th>
                            <th className="text-left px-3 py-2 font-semibold">Method</th>
                            <th className="text-left px-3 py-2 font-semibold">Confidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 && (
                            <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-500 text-sm">No maintenance items match.</td></tr>
                        )}
                        {filtered.map((it) => (
                            <tr key={it.taskId} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-800">{it.assetLabel}</td>
                                <td className="px-3 py-2 text-slate-700">
                                    <div className="line-clamp-2" title={it.serviceLabels.join(', ')}>
                                        {it.serviceLabels.join(', ')}
                                    </div>
                                </td>
                                <td className="px-3 py-2"><StatusBadge status={it.status} /></td>
                                <td className="px-3 py-2 font-mono text-xs text-slate-600">{it.predictedDue}</td>
                                <td className={cn(
                                    'px-3 py-2 text-right tabular-nums font-medium',
                                    it.daysUntilDue < 0 ? 'text-rose-600' :
                                    it.daysUntilDue <= 14 ? 'text-amber-700' : 'text-slate-700',
                                )}>{it.daysUntilDue}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    <SeverityChip severity={it.severity} />
                                </td>
                                <td
                                    className="px-3 py-2 text-right tabular-nums font-medium text-slate-800"
                                    title={it.costSampleSize > 0
                                        ? `Average of ${it.costSampleSize} historical work order${it.costSampleSize === 1 ? '' : 's'}`
                                        : 'Category default — no historical sample on file'}
                                >
                                    ${it.estimatedCost.toLocaleString()}
                                    {it.costSampleSize === 0 && (
                                        <span className="ml-1 text-[9px] text-amber-600 font-semibold align-top">est</span>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-xs text-slate-500" title={it.note}>{it.method}</td>
                                <td className="px-3 py-2 text-xs">
                                    <ConfBadge conf={it.confidence} />
                                </td>
                            </tr>
                        ))}
                        {filtered.length > 0 && (
                            <tr className="bg-slate-50 font-semibold text-slate-800">
                                <td colSpan={6} className="px-3 py-2 text-right text-xs uppercase tracking-wider text-slate-500">
                                    Total estimated cost
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    ${filtered.reduce((a, it) => a + it.estimatedCost, 0).toLocaleString()}
                                </td>
                                <td colSpan={2} className="px-3 py-2 text-xs text-slate-500">
                                    {filtered.filter((i) => i.costSampleSize === 0).length} item{filtered.filter((i) => i.costSampleSize === 0).length === 1 ? '' : 's'} use category default
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Th({
    children, onClick, active, dir, align = 'left',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    dir?: 'asc' | 'desc';
    align?: 'left' | 'right';
}) {
    return (
        <th
            onClick={onClick}
            className={cn(
                'px-3 py-2 font-semibold cursor-pointer select-none whitespace-nowrap',
                align === 'right' ? 'text-right' : 'text-left',
                active ? 'text-slate-900' : 'text-slate-500',
                'hover:bg-slate-100',
            )}
        >
            {children}{active && (dir === 'asc' ? ' ▲' : ' ▼')}
        </th>
    );
}

function StatusBadge({ status }: { status: MaintenanceForecastItem['status'] }) {
    const cls =
        status === 'overdue' ? 'bg-rose-50 text-rose-700 ring-rose-200' :
        status === 'due' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
        status === 'upcoming' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
        status === 'in_progress' ? 'bg-violet-50 text-violet-700 ring-violet-200' :
        'bg-slate-50 text-slate-600 ring-slate-200';
    return (
        <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 capitalize', cls)}>
            {status.replace('_', ' ')}
        </span>
    );
}

function SeverityChip({ severity }: { severity: number }) {
    const cls = severity >= 8 ? 'bg-rose-100 text-rose-700 ring-rose-200'
        : severity >= 5 ? 'bg-amber-100 text-amber-700 ring-amber-200'
        : 'bg-slate-100 text-slate-600 ring-slate-200';
    return <span className={cn('inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 tabular-nums', cls)}>{severity.toFixed(0)}</span>;
}

function ConfBadge({ conf }: { conf: 'high' | 'medium' | 'low' }) {
    const cls = conf === 'high' ? 'text-emerald-700' : conf === 'medium' ? 'text-amber-700' : 'text-rose-700';
    return <span className={cn('font-medium capitalize', cls)}>{conf}</span>;
}

// ────────────────────────────────────────────────────────────────────────────
// Predicted hotspots — locations where accidents/violations are expected to recur
// ────────────────────────────────────────────────────────────────────────────

function PredictedHotspots({
    hotspots, horizon,
}: { hotspots: JurisdictionHotspotForecast[]; horizon: number }) {
    if (hotspots.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-slate-900">Predicted hotspots</h3>
                    <Tip text="Locations where this carrier has had accidents / violations are projected to see them recur. Empty = no historical incidents on file." />
                </div>
                <p className="text-xs text-slate-500">No prior accidents or violations on file — no hotspots predicted.</p>
            </div>
        );
    }
    const visible = hotspots.slice(0, 8);
    const maxRisk = Math.max(...visible.map((h) => h.riskScore), 1);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">Predicted hotspots</h3>
                    <Tip text="Locations ranked by composite risk = predicted incidents × avg severity. Where incidents have happened before, we expect them to recur." />
                </div>
                <div className="text-[11px] text-slate-500">{hotspots.length} jurisdiction{hotspots.length === 1 ? '' : 's'}</div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Top {visible.length} jurisdictions by projected incidents over the next {horizonLabel(horizon)}.
            </p>
            <div className="overflow-auto">
                <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                        <tr>
                            <th className="text-left px-3 py-2 font-semibold">Code</th>
                            <th className="text-left px-3 py-2 font-semibold">Country</th>
                            <th className="text-right px-3 py-2 font-semibold">Past viol.</th>
                            <th className="text-right px-3 py-2 font-semibold">Past acc.</th>
                            <th className="text-right px-3 py-2 font-semibold">Predicted viol.</th>
                            <th className="text-right px-3 py-2 font-semibold">Predicted acc.</th>
                            <th className="text-right px-3 py-2 font-semibold">σ avg</th>
                            <th className="text-left px-3 py-2 font-semibold">Risk</th>
                            <th className="text-left px-3 py-2 font-semibold">Confidence</th>
                            <th className="text-left px-3 py-2 font-semibold">Last seen</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {visible.map((h) => (
                            <tr key={h.code} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-mono font-bold text-slate-800">{h.code}</td>
                                <td className="px-3 py-2 text-xs text-slate-500">{h.country}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{h.pastViolations}</td>
                                <td className={cn('px-3 py-2 text-right tabular-nums font-medium', h.pastAccidents > 0 ? 'text-rose-700' : 'text-slate-700')}>
                                    {h.pastAccidents}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-medium">{h.predictedViolations.toFixed(1)}</td>
                                <td className={cn('px-3 py-2 text-right tabular-nums font-bold', h.predictedAccidents >= 1 ? 'text-rose-700' : 'text-slate-900')}>
                                    {h.predictedAccidents.toFixed(1)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-600">{h.avgSeverity.toFixed(1)}</td>
                                <td className="px-3 py-2">
                                    <RiskBar score={h.riskScore} max={maxRisk} />
                                </td>
                                <td className="px-3 py-2 text-xs"><ConfBadge conf={h.confidence} /></td>
                                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{h.lastEventDate ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function RiskBar({ score, max }: { score: number; max: number }) {
    const pct = Math.max(2, Math.min(100, (score / max) * 100));
    const tone = score >= max * 0.66 ? 'bg-rose-500' : score >= max * 0.33 ? 'bg-amber-500' : 'bg-slate-400';
    return (
        <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] tabular-nums text-slate-600 font-medium w-8 text-right">{score.toFixed(0)}</span>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Predicted driver incidents — who is most likely to cause violations / accidents
// ────────────────────────────────────────────────────────────────────────────

type DriverSortKey = 'riskScore' | 'predictedViolations' | 'predictedAccidents' | 'driverName' | 'pastAccidents' | 'daysSinceLastEvent';

function PredictedDriverIncidents({
    drivers, horizon,
}: { drivers: DriverIncidentForecast[]; horizon: number }) {
    const [sortBy, setSortBy] = useState<DriverSortKey>('riskScore');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [query, setQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = drivers.filter((d) => {
            if (q) {
                const hit = d.driverName.toLowerCase().includes(q)
                    || (d.licenseNumber ?? '').toLowerCase().includes(q)
                    || d.driverId.toLowerCase().includes(q);
                if (!hit) return false;
            }
            if (riskFilter === 'high' && d.riskScore < 50) return false;
            if (riskFilter === 'medium' && (d.riskScore < 20 || d.riskScore >= 50)) return false;
            if (riskFilter === 'low' && d.riskScore >= 20) return false;
            return true;
        });
        return list.sort((a, b) => {
            const dir = sortDir === 'asc' ? 1 : -1;
            switch (sortBy) {
                case 'riskScore':           return dir * (a.riskScore - b.riskScore);
                case 'predictedViolations': return dir * (a.predictedViolations - b.predictedViolations);
                case 'predictedAccidents':  return dir * (a.predictedAccidents - b.predictedAccidents);
                case 'pastAccidents':       return dir * (a.pastAccidents - b.pastAccidents);
                case 'daysSinceLastEvent':  return dir * (a.daysSinceLastEvent - b.daysSinceLastEvent);
                case 'driverName':          return dir * a.driverName.localeCompare(b.driverName);
            }
        });
    }, [drivers, query, riskFilter, sortBy, sortDir]);

    const toggleSort = (key: DriverSortKey) => {
        if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortBy(key); setSortDir('desc'); }
    };

    const counts = useMemo(() => ({
        all: drivers.length,
        high: drivers.filter((d) => d.riskScore >= 50).length,
        medium: drivers.filter((d) => d.riskScore >= 20 && d.riskScore < 50).length,
        low: drivers.filter((d) => d.riskScore < 20).length,
    }), [drivers]);

    const totalPredictedViol = filtered.reduce((a, b) => a + b.predictedViolations, 0);
    const totalPredictedAcc = filtered.reduce((a, b) => a + b.predictedAccidents, 0);

    return (
        <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-5 border-b border-slate-200">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-slate-900">Predicted driver incidents</h3>
                            <Tip text="For each driver, project violations and accidents over the chosen horizon based on their trailing-24-month rate (EWMA-smoothed, accident-weighted)." />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {filtered.length} of {drivers.length} drivers · forecast {horizonLabel(horizon)} · projected{' '}
                            <b className="text-slate-700">{totalPredictedViol.toFixed(1)}</b> violations,{' '}
                            <b className={cn(totalPredictedAcc >= 1 ? 'text-rose-700' : 'text-slate-700')}>{totalPredictedAcc.toFixed(1)}</b> accidents
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {(['all', 'high', 'medium', 'low'] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setRiskFilter(s)}
                                className={cn(
                                    'px-2.5 py-1 text-xs rounded-md font-medium ring-1 transition-colors capitalize',
                                    riskFilter === s
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                                )}
                            >
                                {s} <span className="ml-1 text-slate-400 tabular-nums">{counts[s]}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search drivers by name, licence, or id…"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-none"
                    />
                </div>
            </div>
            <div className="overflow-auto">
                <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                        <tr>
                            <Th onClick={() => toggleSort('driverName')} active={sortBy === 'driverName'} dir={sortDir}>Driver</Th>
                            <th className="text-left px-3 py-2 font-semibold">Licence</th>
                            <th className="text-right px-3 py-2 font-semibold">Past viol.</th>
                            <Th onClick={() => toggleSort('pastAccidents')} active={sortBy === 'pastAccidents'} dir={sortDir} align="right">Past acc.</Th>
                            <Th onClick={() => toggleSort('predictedViolations')} active={sortBy === 'predictedViolations'} dir={sortDir} align="right">Pred. viol.</Th>
                            <Th onClick={() => toggleSort('predictedAccidents')} active={sortBy === 'predictedAccidents'} dir={sortDir} align="right">Pred. acc.</Th>
                            <th className="text-right px-3 py-2 font-semibold">Trend</th>
                            <Th onClick={() => toggleSort('riskScore')} active={sortBy === 'riskScore'} dir={sortDir} align="right">Risk</Th>
                            <Th onClick={() => toggleSort('daysSinceLastEvent')} active={sortBy === 'daysSinceLastEvent'} dir={sortDir} align="right">Last event</Th>
                            <th className="text-left px-3 py-2 font-semibold">Confidence</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filtered.length === 0 && (
                            <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500 text-sm">No drivers match.</td></tr>
                        )}
                        {filtered.map((d) => (
                            <tr key={d.driverId} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-800">{d.driverName}</td>
                                <td className="px-3 py-2 text-xs text-slate-500 font-mono">{d.licenseNumber ?? '—'}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{d.pastViolations}</td>
                                <td className={cn('px-3 py-2 text-right tabular-nums font-medium', d.pastAccidents > 0 ? 'text-rose-700' : 'text-slate-700')}>
                                    {d.pastAccidents}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-900 font-medium">{d.predictedViolations.toFixed(1)}</td>
                                <td className={cn('px-3 py-2 text-right tabular-nums font-bold', d.predictedAccidents >= 0.5 ? 'text-rose-700' : 'text-slate-900')}>
                                    {d.predictedAccidents.toFixed(1)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                    <TrendBadge slope={d.trendSlope} />
                                </td>
                                <td className="px-3 py-2"><RiskBar score={d.riskScore} max={100} /></td>
                                <td className="px-3 py-2 text-right tabular-nums text-xs text-slate-600">
                                    {Number.isFinite(d.daysSinceLastEvent)
                                        ? `${d.daysSinceLastEvent}d ago`
                                        : '—'}
                                </td>
                                <td className="px-3 py-2 text-xs"><ConfBadge conf={d.confidence} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TrendBadge({ slope }: { slope: number }) {
    const arrow = slope > 0.05 ? '↑' : slope < -0.05 ? '↓' : '→';
    const tone = slope > 0.05 ? 'text-rose-600'
        : slope < -0.05 ? 'text-emerald-600'
        : 'text-slate-500';
    return (
        <span className={cn('font-semibold tabular-nums', tone)} title={`Slope ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} ev/mo`}>
            {arrow} {slope >= 0 ? '+' : ''}{slope.toFixed(2)}
        </span>
    );
}


// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
    return (
        <span className="group relative inline-flex">
            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
            <span className="absolute right-0 top-5 z-10 hidden group-hover:block w-60 p-2 text-xs leading-relaxed bg-slate-900 text-white rounded-md shadow-lg">{text}</span>
        </span>
    );
}

// Avoid unused-import warnings for ForecastTrend / ForecastPoint that may be
// re-exported by consumers.
export type { ForecastTrend, ForecastPoint };
