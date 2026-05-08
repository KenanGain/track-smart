/**
 * North America choropleth + bubble map.
 *
 * Spec: docs/SAFETY.md §10.5 (jurisdiction visualization), §11 (live charts).
 *
 * Renders real US state + CA province outlines from the public-domain
 * us-atlas (US Census, 10m resolution) and Statistics Canada province
 * shapes, both fetched from /geo/ at first paint and cached for the
 * session. d3-geo handles projection.
 *
 * Data binding:
 *   • state / province fill color = severity-bucket of `eventCount`
 *   • optional bubbles overlaid at centroids, radius ∝ event count
 *   • hover = tooltip with code, count, OOS count, top source
 */

import { useEffect, useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import {
    geoConicEqualArea,
    geoPath,
    type GeoPermissibleObjects,
} from 'd3-geo';
import type {
    Feature,
    FeatureCollection,
    Geometry,
} from 'geojson';
import type { Topology } from 'topojson-specification';

import type { JurisdictionStats } from './risk-geo';
import { CA_PROVINCE_ABBREVS, US_STATE_ABBREVS } from '@/data/geo-data';

// Reverse maps — full name → 2-letter code.
const US_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
    Object.entries(US_STATE_ABBREVS).map(([code, name]) => [name, code]),
);
const CA_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
    Object.entries(CA_PROVINCE_ABBREVS).map(([code, name]) => [name, code]),
);

// ── Color ramp by event count ───────────────────────────────────────────────

function fillForCount(count: number, max: number): string {
    if (count === 0) return '#f1f5f9'; // slate-100 — neutral
    const t = Math.min(1, count / Math.max(1, max));
    // Lerp from amber-200 → rose-600 across the data range.
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
    const r = lerp(0xfd, 0xe1);
    const g = lerp(0xe6, 0x1d);
    const b = lerp(0x8a, 0x48);
    return `rgb(${r},${g},${b})`;
}

// ── Cached fetches ──────────────────────────────────────────────────────────

let cachedUs: FeatureCollection | null = null;
let cachedCa: FeatureCollection | null = null;

async function loadUsStates(): Promise<FeatureCollection> {
    if (cachedUs) return cachedUs;
    const res = await fetch('/geo/us-states-10m.json');
    const topo = (await res.json()) as Topology;
    cachedUs = feature(topo, topo.objects.states) as unknown as FeatureCollection;
    return cachedUs;
}

async function loadCaProvinces(): Promise<FeatureCollection> {
    if (cachedCa) return cachedCa;
    const res = await fetch('/geo/ca-provinces.geojson');
    cachedCa = (await res.json()) as FeatureCollection;
    return cachedCa;
}

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
    /** Aggregated event counts per state/province code. */
    stats: JurisdictionStats[];
    /** Show event-count bubbles on top of the choropleth. */
    bubbles?: boolean;
    /** Limit to one country (default = both). */
    country?: 'US' | 'CA' | 'NA';
    /** Title shown above the chart. */
    title?: string;
    /** Subtitle / hint line. */
    subtitle?: string;
}

export function NorthAmericaMap({
    stats,
    bubbles = true,
    country = 'NA',
    title = 'Geographic distribution',
    subtitle,
}: Props) {
    const [usFc, setUsFc] = useState<FeatureCollection | null>(cachedUs);
    const [caFc, setCaFc] = useState<FeatureCollection | null>(cachedCa);
    const [hover, setHover] = useState<{ code: string; x: number; y: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!cachedUs) loadUsStates().then((fc) => { if (!cancelled) setUsFc(fc); });
        if (!cachedCa) loadCaProvinces().then((fc) => { if (!cancelled) setCaFc(fc); });
        return () => { cancelled = true; };
    }, []);

    const statsByCode = useMemo(() => {
        const m = new Map<string, JurisdictionStats>();
        for (const s of stats) m.set(s.code, s);
        return m;
    }, [stats]);

    const maxCount = useMemo(
        () => stats.reduce((a, b) => Math.max(a, b.eventCount), 0),
        [stats],
    );

    // Single unified Albers Conic projection covering all of North America.
    // Standard parallels 29.5° / 49.5° balance distortion across US + Canada.
    // Rotated to center on -100° longitude (continent middle).
    // Projection is fit to the populated continental mass — Alaska, Hawaii,
    // Puerto Rico are dropped because their position pulls the bounding box
    // wide and pushes the contiguous mass off-center.
    const width = 960;
    const height = 540;

    // Outliers excluded from BOTH fitting and rendering for a balanced view.
    // Drop Alaska / Hawaii / outlying US territories. All Canadian provinces
    // including territories are kept — they share parallels with US states.
    const RENDER_FILTER = (name: string): boolean => {
        const drop = new Set(['Alaska', 'Hawaii', 'Puerto Rico', 'United States Virgin Islands', 'Guam', 'American Samoa', 'Commonwealth of the Northern Mariana Islands']);
        return !drop.has(name);
    };

    const projection = useMemo(() => {
        const proj = geoConicEqualArea()
            .parallels([29.5, 49.5])
            .rotate([100, 0])
            .center([0, country === 'CA' ? 62 : country === 'US' ? 39 : 50]);

        const usForFit = country === 'CA' ? [] :
            (usFc?.features ?? []).filter((f) => RENDER_FILTER((f.properties as { name?: string })?.name ?? ''));
        const caForFit = country === 'US' ? [] : (caFc?.features ?? []);

        const fitFeatures: FeatureCollection = {
            type: 'FeatureCollection',
            features: [...usForFit, ...caForFit],
        };
        if (fitFeatures.features.length > 0) {
            proj.fitExtent([[24, 24], [width - 24, height - 24]], fitFeatures);
        }
        return proj;
    }, [usFc, caFc, country]);

    const usPath = useMemo(() => geoPath(projection), [projection]);
    const caPath = usPath; // Same projection — borders align exactly.

    if (!usFc || !caFc) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <div className="mt-6 mb-4 h-[460px] flex items-center justify-center text-sm text-slate-400">
                    Loading map…
                </div>
            </div>
        );
    }

    const usFeatures = country === 'CA' ? [] :
        usFc.features.filter((f) => RENDER_FILTER((f.properties as { name?: string })?.name ?? ''));
    const caFeatures = country === 'US' ? [] : caFc.features;

    const totalEvents = stats.reduce((a, b) => a + b.eventCount, 0);
    const enrichedSubtitle = subtitle ?? `${totalEvents} event${totalEvents === 1 ? '' : 's'} across ${stats.length} jurisdiction${stats.length === 1 ? '' : 's'}`;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 relative">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">{title}</h3>
                <Legend max={maxCount} />
            </div>
            <p className="text-xs text-slate-500 mb-4">{enrichedSubtitle}</p>

            <div className="relative">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
                    {/* CA layer */}
                    <g>
                        {caFeatures.map((f, i) => {
                            const name = (f.properties as { name?: string })?.name ?? '';
                            const code = CA_NAME_TO_CODE[name];
                            const stat = code ? statsByCode.get(code) : undefined;
                            const fill = fillForCount(stat?.eventCount ?? 0, maxCount);
                            const d = caPath(f as Feature<Geometry>);
                            if (!d) return null;
                            return (
                                <path
                                    key={`ca-${i}`}
                                    d={d}
                                    fill={fill}
                                    stroke="#cbd5e1"
                                    strokeWidth={0.5}
                                    onMouseEnter={(e) => code && setHover({ code, x: e.clientX, y: e.clientY })}
                                    onMouseLeave={() => setHover(null)}
                                    style={{ cursor: stat ? 'pointer' : 'default', transition: 'fill 200ms ease' }}
                                />
                            );
                        })}
                    </g>
                    {/* US layer */}
                    <g>
                        {usFeatures.map((f, i) => {
                            const name = (f.properties as { name?: string })?.name ?? '';
                            const code = US_NAME_TO_CODE[name];
                            const stat = code ? statsByCode.get(code) : undefined;
                            const fill = fillForCount(stat?.eventCount ?? 0, maxCount);
                            const d = usPath(f as Feature<Geometry>);
                            if (!d) return null;
                            return (
                                <path
                                    key={`us-${i}`}
                                    d={d}
                                    fill={fill}
                                    stroke="#cbd5e1"
                                    strokeWidth={0.5}
                                    onMouseEnter={(e) => code && setHover({ code, x: e.clientX, y: e.clientY })}
                                    onMouseLeave={() => setHover(null)}
                                    style={{ cursor: stat ? 'pointer' : 'default', transition: 'fill 200ms ease' }}
                                />
                            );
                        })}
                    </g>

                    {/* Bubble overlay */}
                    {bubbles && (
                        <g pointerEvents="none">
                            {[...usFeatures, ...caFeatures].map((f, i) => {
                                const isCa = caFeatures.includes(f);
                                const name = (f.properties as { name?: string })?.name ?? '';
                                const code = isCa ? CA_NAME_TO_CODE[name] : US_NAME_TO_CODE[name];
                                if (!code) return null;
                                const stat = statsByCode.get(code);
                                if (!stat || stat.eventCount === 0) return null;

                                const path = isCa ? caPath : usPath;
                                const c = path.centroid(f as Feature<Geometry>);
                                if (!Number.isFinite(c[0]) || !Number.isFinite(c[1])) return null;

                                const r = 4 + Math.min(18, Math.sqrt(stat.eventCount) * 2.2);
                                return (
                                    <g key={`bub-${i}`}>
                                        <circle
                                            cx={c[0]} cy={c[1]} r={r}
                                            fill={stat.oosCount > 0 ? '#dc2626' : '#0ea5e9'}
                                            fillOpacity={0.4}
                                            stroke={stat.oosCount > 0 ? '#dc2626' : '#0369a1'}
                                            strokeWidth={1}
                                        />
                                        {stat.eventCount >= Math.max(2, maxCount * 0.25) && (
                                            <text
                                                x={c[0]} y={c[1]} dy={4}
                                                fontSize={10} fontWeight={700}
                                                textAnchor="middle"
                                                fill="#0c4a6e"
                                            >
                                                {stat.eventCount}
                                            </text>
                                        )}
                                    </g>
                                );
                            })}
                        </g>
                    )}
                </svg>

                {/* Hover tooltip */}
                {hover && statsByCode.get(hover.code) && (
                    <HoverCard stat={statsByCode.get(hover.code)!} />
                )}
            </div>

            {/* Top jurisdictions table */}
            <TopList stats={stats.slice(0, 6)} />
        </div>
    );
}

function HoverCard({ stat }: { stat: JurisdictionStats }) {
    return (
        <div className="absolute top-2 right-2 bg-slate-900 text-white text-xs rounded-md px-2.5 py-2 shadow-lg pointer-events-none">
            <div className="font-bold">{stat.code} · {stat.country}</div>
            <div className="opacity-80 mt-0.5">{stat.eventCount} events · {stat.oosCount} OOS</div>
            <div className="opacity-80">σ avg {stat.severityAvg.toFixed(1)}</div>
            {stat.topSource && (
                <div className="opacity-60 text-[10px] mt-0.5">{stat.topSource}</div>
            )}
        </div>
    );
}

function Legend({ max }: { max: number }) {
    const stops = [0, Math.ceil(max / 4), Math.ceil(max / 2), Math.ceil((3 * max) / 4), max];
    return (
        <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>0</span>
            <div className="h-2 w-32 rounded-full"
                style={{
                    background: `linear-gradient(to right, #f1f5f9, ${fillForCount(stops[1], max)}, ${fillForCount(stops[2], max)}, ${fillForCount(stops[3], max)}, ${fillForCount(stops[4], max)})`,
                }} />
            <span>{max}</span>
        </div>
    );
}

function TopList({ stats }: { stats: JurisdictionStats[] }) {
    if (stats.length === 0) return null;
    return (
        <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Top jurisdictions</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {stats.map((s) => (
                    <div key={s.code} className="bg-slate-50 ring-1 ring-slate-100 rounded-md p-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">{s.code}</span>
                            <span className="text-[10px] text-slate-500">{s.country}</span>
                        </div>
                        <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{s.eventCount}</div>
                        <div className="text-[10px] text-slate-500">
                            {s.oosCount > 0 && <span className="text-rose-600 font-semibold">{s.oosCount} OOS</span>}
                            {s.oosCount > 0 && ' · '}
                            σ {s.severityAvg.toFixed(1)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Re-export to satisfy strict bundler tree-shaking, never used:
export type { GeoPermissibleObjects };
