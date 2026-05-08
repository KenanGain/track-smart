/**
 * Safety-analysis chart bundle.
 *
 * Spec: docs/SAFETY.md §10–§11.
 *
 * Components:
 *   • DriverAssetHeatmap   — full driver × asset matrix
 *   • RiskTrendChart       — 12 / 24-month event count + severity
 *   • DomainRadarChart     — per-domain safety scores
 *   • JurisdictionStackedBar — per-jurisdiction event breakdown by source
 *   • OosRateSparkline     — rolling OOS rate
 *
 * All charts subscribe to the engine via the existing `useRiskScore` /
 * `useRiskDistribution` hooks (or directly to the loader for one-off
 * aggregations) — settings changes propagate automatically.
 */

import { useMemo, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    LineChart, Line, AreaChart, Area,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    ResponsiveContainer, Legend,
} from 'recharts';
import { Info, X } from 'lucide-react';

import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { cn } from '@/lib/utils';

import { getRiskScore } from './risk-store';
import { loadRiskEventsForCarrier } from './risk-load';
import {
    aggregateByJurisdiction,
    domainBreakdown,
    monthlyTrend,
} from './risk-geo';
import type { RiskEvent } from './risk-engine.types';

// ────────────────────────────────────────────────────────────────────────────
// Driver × Asset heatmap
// ────────────────────────────────────────────────────────────────────────────

export function DriverAssetHeatmap({
    carrierId,
    maxDrivers = 14,
    maxAssets = 14,
}: {
    carrierId: string;
    maxDrivers?: number;
    maxAssets?: number;
}) {
    const allDrivers = CARRIER_DRIVERS[carrierId] ?? [];
    const allAssets = CARRIER_ASSETS[carrierId] ?? [];

    // Drill-down + filter state.
    const [drill, setDrill] = useState<{ driverId: string; assetId: string } | null>(null);
    const [worstOnly, setWorstOnly] = useState(false);

    // Sort drivers + assets by their individual safety score (worst first)
    // — clusters the red cells in the top-left corner so risky pairs are
    // immediately visible.
    const sortedDrivers = useMemo(() => [...allDrivers].sort((a, b) =>
        getRiskScore({ kind: 'driver', carrierId, driverId: a.id }, carrierId).safetyScore -
        getRiskScore({ kind: 'driver', carrierId, driverId: b.id }, carrierId).safetyScore,
    ), [allDrivers, carrierId]);
    const sortedAssets = useMemo(() => [...allAssets].sort((a, b) =>
        getRiskScore({ kind: 'asset', carrierId, assetId: a.id }, carrierId).safetyScore -
        getRiskScore({ kind: 'asset', carrierId, assetId: b.id }, carrierId).safetyScore,
    ), [allAssets, carrierId]);

    const drivers = sortedDrivers.slice(0, maxDrivers);
    const assets = sortedAssets.slice(0, maxAssets);

    const matrix = useMemo(() => {
        return drivers.map((d) =>
            assets.map((a) => {
                const s = getRiskScore({
                    kind: 'driverAsset', carrierId, driverId: d.id, assetId: a.id,
                }, carrierId);
                return s.safetyScore;
            }),
        );
    }, [drivers, assets, carrierId]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <h3 className="text-base font-semibold text-slate-900">Driver × Asset heatmap</h3>
                <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={worstOnly}
                            onChange={(e) => setWorstOnly(e.target.checked)}
                            className="accent-blue-600"
                        />
                        Show only Poor / Critical
                    </label>
                    <Tip text="Each cell is a pair safety score. Drivers + assets are sorted worst-first so risky pairs cluster in the upper-left. Click a cell for drill-down." />
                </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Top {drivers.length} of {allDrivers.length} drivers × top {assets.length} of {allAssets.length} assets · click any cell for shared-history drill-down.
            </p>

            {drivers.length === 0 || assets.length === 0 ? (
                <div className="text-sm text-slate-500 py-6 text-center">No drivers/assets to pair.</div>
            ) : (
                <div className="overflow-auto">
                    <table className="text-[11px] border-separate" style={{ borderSpacing: 2 }}>
                        <thead>
                            <tr>
                                <th className="text-left p-1.5 font-medium text-slate-500 sticky left-0 bg-white"></th>
                                {assets.map((a) => (
                                    <th key={a.id} className="px-2 py-1 font-medium text-slate-500 whitespace-nowrap">
                                        {a.unitNumber ?? a.id.slice(-4)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {drivers.map((d, i) => (
                                <tr key={d.id}>
                                    <td className="text-left px-2 py-1 sticky left-0 bg-white text-slate-700 font-medium whitespace-nowrap">
                                        {`${d.firstName ?? ''} ${d.lastName ?? ''}`.trim().slice(0, 18) || d.id.slice(-4)}
                                    </td>
                                    {assets.map((a, j) => {
                                        const s = matrix[i][j];
                                        const dim = worstOnly && s >= 55;
                                        return (
                                            <td
                                                key={a.id}
                                                title={`${(d.firstName ?? '')} ${d.lastName ?? ''} × Unit ${a.unitNumber ?? a.id.slice(-4)} → ${s.toFixed(1)} · click to drill down`}
                                                onClick={() => setDrill({ driverId: d.id, assetId: a.id })}
                                                className="text-center font-mono tabular-nums px-2 py-1.5 rounded-sm transition-all cursor-pointer hover:scale-110"
                                                style={{
                                                    background: dim ? '#f1f5f9' : heatmapColor(s),
                                                    color: dim ? '#cbd5e1' : (s < 50 ? '#fff' : '#0f172a'),
                                                    minWidth: 38,
                                                }}
                                            >
                                                {s.toFixed(0)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Slide-out drill-down drawer */}
            {drill && (
                <PairDrillDrawer
                    carrierId={carrierId}
                    driverId={drill.driverId}
                    assetId={drill.assetId}
                    onClose={() => setDrill(null)}
                />
            )}

            {/* Color legend */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-[10px] text-slate-500">
                <span>Critical</span>
                <div className="h-3 w-40 rounded-sm" style={{
                    background: 'linear-gradient(to right, #be123c, #f97316, #f59e0b, #84cc16, #10b981)',
                }} />
                <span>Excellent</span>
            </div>
        </div>
    );
}

function heatmapColor(safety: number): string {
    if (safety >= 85) return '#10b981';   // emerald
    if (safety >= 70) return '#84cc16';   // lime
    if (safety >= 55) return '#f59e0b';   // amber
    if (safety >= 35) return '#f97316';   // orange
    if (safety >= 20) return '#dc2626';   // rose-600
    return '#9f1239';                      // rose-900
}

// ────────────────────────────────────────────────────────────────────────────
// Risk trend (events per month)
// ────────────────────────────────────────────────────────────────────────────

export function RiskTrendChart({
    carrierId, months = 12,
}: { carrierId: string; months?: number }) {
    const trend = useMemo(() => {
        const events = loadRiskEventsForCarrier(carrierId);
        return monthlyTrend(events, months);
    }, [carrierId, months]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Event trend ({months} months)</h3>
                <Tip text="Total events vs OOS events per calendar month. Hover any point for detail." />
            </div>
            <p className="text-xs text-slate-500 mb-4">Events binned by month from canonical risk-event ledger.</p>
            <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                        <defs>
                            <linearGradient id="trendEvents" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                            </linearGradient>
                            <linearGradient id="trendOos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.55} />
                                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.05} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                        <Area type="monotone" dataKey="events" stroke="#0ea5e9" fill="url(#trendEvents)" name="Events" strokeWidth={2} />
                        <Area type="monotone" dataKey="oos" stroke="#dc2626" fill="url(#trendOos)" name="OOS" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Domain radar (per-domain safety score)
// ────────────────────────────────────────────────────────────────────────────

export function DomainRadarChart({ events }: { events: RiskEvent[] }) {
    const data = useMemo(() => {
        return domainBreakdown(events).map((d) => ({
            domain: prettyDomain(d.domain),
            score: d.safetyScore,
            full: 100,
            count: d.eventCount,
        }));
    }, [events]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Domain radar</h3>
                <Tip text="Per-domain safety score (100 = no events; lower = more risk pressure)." />
            </div>
            <p className="text-xs text-slate-500 mb-4">Eight risk domains across this carrier's events.</p>
            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="#cbd5e1" />
                        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: '#475569' }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#cbd5e1" />
                        <Radar name="Safety" dataKey="score" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.35} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function prettyDomain(d: string): string {
    switch (d) {
        case 'unsafeDriving':       return 'Unsafe Driving';
        case 'vehicleMaintenance':  return 'Veh. Maintenance';
        case 'driverFitness':       return 'Driver Fitness';
        case 'documentCompliance':  return 'Documents';
        case 'hos':                 return 'HOS';
        default: return d.charAt(0).toUpperCase() + d.slice(1);
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Jurisdiction stacked bar (events by source)
// ────────────────────────────────────────────────────────────────────────────

export function JurisdictionStackedBar({ carrierId }: { carrierId: string }) {
    const data = useMemo(() => {
        const events = loadRiskEventsForCarrier(carrierId);
        const byJur = aggregateByJurisdiction(events);

        // Build a row per jurisdiction with one column per source.
        type Row = { code: string; total: number } & Record<string, number | string>;
        return byJur.slice(0, 12).map((j): Row => {
            const row: Row = { code: j.code, total: j.eventCount };
            for (const e of events) {
                const eCode = (() => {
                    if (e.source === 'cvor') return 'ON';
                    if (e.source.startsWith('nsc:')) return e.source.slice(4);
                    if (e.source === 'fmcsa') return ((e.raw as { state?: string })?.state ?? '').toUpperCase();
                    return '';
                })();
                if (eCode !== j.code) continue;
                const k = sourceColumn(e.source);
                row[k] = ((row[k] as number | undefined) ?? 0) + 1;
            }
            return row;
        });
    }, [carrierId]);

    if (data.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900">Events by jurisdiction</h3>
                <p className="text-xs text-slate-500 mt-1">No jurisdictional events on file.</p>
            </div>
        );
    }

    const sources = ['FMCSA', 'CVOR', 'NSC', 'Internal'];
    const colors: Record<string, string> = {
        FMCSA: '#f59e0b', CVOR: '#e11d48', NSC: '#0ea5e9', Internal: '#64748b',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Events by jurisdiction</h3>
                <Tip text="Stacked by originating source — FMCSA / CVOR / NSC / internal." />
            </div>
            <p className="text-xs text-slate-500 mb-4">Top {data.length} jurisdictions by total event count.</p>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="code" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {sources.map((s) => (
                            <Bar key={s} dataKey={s} stackId="a" fill={colors[s]} radius={s === 'Internal' ? [3, 3, 0, 0] : 0} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

function sourceColumn(s: RiskEvent['source']): 'FMCSA' | 'CVOR' | 'NSC' | 'Internal' {
    if (s === 'fmcsa') return 'FMCSA';
    if (s === 'cvor') return 'CVOR';
    if (s.startsWith('nsc:')) return 'NSC';
    return 'Internal';
}

// ────────────────────────────────────────────────────────────────────────────
// OOS rate sparkline (last N months)
// ────────────────────────────────────────────────────────────────────────────

export function OosRateSparkline({
    carrierId, months = 12,
}: { carrierId: string; months?: number }) {
    const data = useMemo(() => {
        const events = loadRiskEventsForCarrier(carrierId);
        const t = monthlyTrend(events, months);
        return t.map((p) => ({
            month: p.month,
            rate: p.events > 0 ? +(p.oos / p.events * 100).toFixed(1) : 0,
        }));
    }, [carrierId, months]);

    const last = data[data.length - 1]?.rate ?? 0;
    const tone = last > 15 ? 'text-rose-600' : last > 5 ? 'text-amber-600' : 'text-emerald-600';

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">OOS rate</h3>
                <Tip text="Out-of-service events as % of all events per month." />
            </div>
            <div className="flex items-baseline gap-2 mt-1 mb-3">
                <span className={cn('text-3xl font-bold tabular-nums', tone)}>{last.toFixed(1)}%</span>
                <span className="text-xs text-slate-500">latest month</span>
            </div>
            <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                        <Line type="monotone" dataKey="rate" stroke="#dc2626" strokeWidth={2} dot={false} />
                        <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Helper
// ────────────────────────────────────────────────────────────────────────────

function Tip({ text }: { text: string }) {
    return (
        <span className="group relative inline-flex">
            <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
            <span className="absolute right-0 top-5 z-10 hidden group-hover:block w-60 p-2 text-xs leading-relaxed bg-slate-900 text-white rounded-md shadow-lg">
                {text}
            </span>
        </span>
    );
}

// ────────────────────────────────────────────────────────────────────────────
// Pair drill-down drawer — slides in from the right when a heatmap cell
// is clicked. Shows the breakdown of a single driver × asset pair.
// ────────────────────────────────────────────────────────────────────────────

function PairDrillDrawer({
    carrierId, driverId, assetId, onClose,
}: { carrierId: string; driverId: string; assetId: string; onClose: () => void }) {
    const driver = (CARRIER_DRIVERS[carrierId] ?? []).find((d) => d.id === driverId);
    const asset = (CARRIER_ASSETS[carrierId] ?? []).find((a) => a.id === assetId);
    const driverScore = getRiskScore({ kind: 'driver', carrierId, driverId }, carrierId);
    const assetScore = getRiskScore({ kind: 'asset', carrierId, assetId }, carrierId);
    const pairScore = getRiskScore({ kind: 'driverAsset', carrierId, driverId, assetId }, carrierId);

    const driverName = driver
        ? `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim() || driverId
        : driverId;
    const assetLabel = asset ? `Unit ${asset.unitNumber ?? asset.id.slice(-4)}` : assetId;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/30 z-40 transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />
            {/* Drawer */}
            <div
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 overflow-y-auto"
                role="dialog"
                aria-label="Driver-asset pair drill-down"
            >
                <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">
                            Driver × Asset Pair
                        </div>
                        <div className="text-base font-bold text-slate-900 mt-0.5">
                            {driverName} <span className="text-slate-400">×</span> {assetLabel}
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5">
                    {/* Pair score */}
                    <div className="bg-slate-50 ring-1 ring-slate-200 rounded-lg p-4">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                            Pair safety score
                        </div>
                        <div className="flex items-baseline gap-3 mt-1">
                            <span className="text-4xl font-bold tabular-nums" style={{ color: heatmapColor(pairScore.safetyScore) }}>
                                {pairScore.safetyScore.toFixed(0)}
                            </span>
                            <span className="text-sm text-slate-600">/ 100 · {pairScore.rating}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                            {pairScore.eventCount} shared event{pairScore.eventCount === 1 ? '' : 's'} between this driver and asset · {pairScore.confidence} confidence
                        </div>
                    </div>

                    {/* Component breakdown */}
                    <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                            Components
                        </div>
                        <div className="space-y-1.5">
                            {pairScore.componentScores.map((c) => (
                                <div key={c.key} className="flex items-center gap-3 py-1.5">
                                    <div className="w-32 text-xs text-slate-600 truncate" title={c.label}>{c.label}</div>
                                    <div className="flex-1 relative h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${Math.max(0, Math.min(100, c.safetyScore))}%`,
                                                background: heatmapColor(c.safetyScore),
                                            }}
                                        />
                                    </div>
                                    <div className="w-12 text-right text-xs tabular-nums font-medium text-slate-800">
                                        {c.safetyScore.toFixed(1)}
                                    </div>
                                    <div className="w-10 text-right text-[10px] text-slate-400 tabular-nums">×{c.weight.toFixed(2)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Individual scores */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white ring-1 ring-slate-200 rounded-lg p-3">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Driver only</div>
                            <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: heatmapColor(driverScore.safetyScore) }}>
                                {driverScore.safetyScore.toFixed(0)}
                            </div>
                            <div className="text-[10px] text-slate-500">{driverScore.rating} · {driverScore.eventCount} events</div>
                        </div>
                        <div className="bg-white ring-1 ring-slate-200 rounded-lg p-3">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Asset only</div>
                            <div className="text-2xl font-bold tabular-nums mt-1" style={{ color: heatmapColor(assetScore.safetyScore) }}>
                                {assetScore.safetyScore.toFixed(0)}
                            </div>
                            <div className="text-[10px] text-slate-500">{assetScore.rating} · {assetScore.eventCount} events</div>
                        </div>
                    </div>

                    {/* Top contributors */}
                    {pairScore.topContributors.length > 0 && (
                        <div>
                            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold mb-2">
                                Top shared contributors
                            </div>
                            <ul className="space-y-1">
                                {pairScore.topContributors.slice(0, 5).map((c) => (
                                    <li key={c.eventId} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                                        <span className="text-[10px] text-slate-400 w-12 font-mono">{c.date}</span>
                                        <span className="text-xs text-slate-700 flex-1 truncate" title={c.title}>{c.title}</span>
                                        <span className="text-[10px] text-rose-600 tabular-nums">−{c.weighted.toFixed(1)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
