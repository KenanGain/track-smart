/**
 * Forecast Guide — actionable advice for picking the right filter combination.
 *
 * Two parts:
 *   1. A guidance table that explains *what each filter does to accuracy*.
 *   2. A row of preset "scenario" chips that one-click apply a filter combo
 *      tuned for a common analytical question.
 *
 * Designed to sit between the export toolbar and the methodology card.
 */

import {
    Target, Clock, Shield, Compass, Telescope, Wrench, MapPin, Sparkles,
    ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    DEFAULT_FORECAST_FILTERS,
    type ForecastFilters,
    type ForecastHorizon,
    type DistanceBucketKey,
} from './risk-filters';

// ── Preset catalogue ────────────────────────────────────────────────────────

interface Preset {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    /** Why this combo gives the best result for the stated goal. */
    rationale: string;
    /** Filter override layered on top of the user's current filters. */
    apply: (cur: ForecastFilters) => ForecastFilters;
}

const PRESETS: Preset[] = [
    {
        id: 'most-accurate',
        label: 'Most accurate',
        icon: Target,
        description: 'Tightest confidence band, highest R²',
        rationale:
            '12 months of history fits the regression cleanly without dragging in stale events; a 6-month horizon stays well within the high-confidence zone (Δt before damping kicks in). Expect R² ≥ 0.4 and a narrow ±1.28σ band.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 6 as ForecastHorizon,
            timelineWindowDays: 365,
            timelineFromIso: undefined,
            timelineToIso: undefined,
        }),
    },
    {
        id: 'short-horizon',
        label: 'Next quarter',
        icon: Clock,
        description: '3-month projection · operational planning',
        rationale:
            '3 months out is the sweet spot for dispatch / staffing decisions — short enough that trend slope dominates noise, long enough to plan around. Pair with 6-month history for fast reaction to recent shifts.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 3 as ForecastHorizon,
            timelineWindowDays: 180,
            timelineFromIso: undefined,
            timelineToIso: undefined,
        }),
    },
    {
        id: 'annual-plan',
        label: 'Annual plan',
        icon: Shield,
        description: '12-month projection · budget cycle',
        rationale:
            '12-month forecast on 24 months of history captures one full seasonal cycle. The slope is still untouched by damping, so directional trends are preserved while seasonality is implicit in the long history.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 12 as ForecastHorizon,
            timelineWindowDays: 730,
            timelineFromIso: undefined,
            timelineToIso: undefined,
        }),
    },
    {
        id: 'long-term',
        label: 'Strategic outlook',
        icon: Telescope,
        description: '3-year projection · long-run mean',
        rationale:
            'Past 36 months the engine pulls toward the long-run mean — useful for executive scenarios but treat as directional, not precise. Wide confidence bands are intentional and correct.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 36 as ForecastHorizon,
            timelineWindowDays: null,
            timelineFromIso: undefined,
            timelineToIso: undefined,
        }),
    },
    {
        id: 'recent-trend',
        label: 'Recent trend',
        icon: Sparkles,
        description: 'Detect changes in the last 90 days',
        rationale:
            '90-day history weights very recent events heavily — best for spotting deterioration after a policy change, new hire wave, or seasonal shift. Forecast 3 months to keep the projection in-window.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 3 as ForecastHorizon,
            timelineWindowDays: 90,
            timelineFromIso: undefined,
            timelineToIso: undefined,
        }),
    },
    {
        id: 'maintenance-focus',
        label: 'Maintenance focus',
        icon: Wrench,
        description: 'High-mileage assets · 6-month maintenance window',
        rationale:
            'Filter to Heavy + Long-haul assets and project 6 months — exposes brake/tire/CVIP work expected in the planning window without diluting the list with low-mileage units that rarely need service.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 6 as ForecastHorizon,
            timelineWindowDays: 365,
            timelineFromIso: undefined,
            timelineToIso: undefined,
            distanceBuckets: ['heavy', 'long-haul'] as DistanceBucketKey[],
        }),
    },
    {
        id: 'hotspot-drill',
        label: 'Geographic drill-down',
        icon: MapPin,
        description: 'Per-region analysis (pick jurisdictions in filter bar)',
        rationale:
            'Use this when you suspect a specific state/province is driving risk. Set a 12-month horizon, 24-month history, then pick jurisdictions in the filter bar — predictions and the map collapse to that scope.',
        apply: (cur) => ({
            ...cur,
            horizonMonths: 12 as ForecastHorizon,
            timelineWindowDays: 730,
            timelineFromIso: undefined,
            timelineToIso: undefined,
        }),
    },
    {
        id: 'reset',
        label: 'Reset to defaults',
        icon: Compass,
        description: '12mo forecast · 12mo history · all locations',
        rationale: 'Balanced default — sensible for first-pass review when no specific question is in mind.',
        apply: () => ({ ...DEFAULT_FORECAST_FILTERS }),
    },
];

// ── Guidance rows ───────────────────────────────────────────────────────────

interface Guidance {
    filter: string;
    short: string;
    affects: string;
    rule: string;
}

const GUIDANCE: Guidance[] = [
    {
        filter: 'Forecast horizon',
        short: 'How far forward you project',
        affects: 'Confidence band width · damping factor',
        rule: '≤ 6 mo: tight band, undamped slope. 12–18 mo: still reliable. 36–60 mo: heavy damping, treat as directional.',
    },
    {
        filter: 'History window',
        short: 'How much past data feeds the model',
        affects: 'R² · slope stability',
        rule: '12 mo: highest R² in most cases. 24 mo: better for seasonal carriers. 90 d: best for change-detection. All-time: only when carrier history is long and stable.',
    },
    {
        filter: 'Distance bucket',
        short: 'Mileage class of drivers / assets',
        affects: 'Per-entity tables · maintenance projections',
        rule: 'Pick Heavy + Long-haul to focus on safety-critical units. Light + Standard for in-town/urban. Empty = full fleet.',
    },
    {
        filter: 'Country',
        short: 'US vs Canada partition',
        affects: 'Map · jurisdictional aggregation',
        rule: 'Useful when comparing FMCSA vs NSC profiles side-by-side. Empty = both.',
    },
    {
        filter: 'Jurisdictions',
        short: 'Specific states / provinces',
        affects: 'Map zoom · hotspot list · driver filtering',
        rule: 'Pick 1–3 jurisdictions to drill into recurring hotspots. More than 5 dilutes the focus.',
    },
];

// ── Component ───────────────────────────────────────────────────────────────

interface Props {
    filters: ForecastFilters;
    onApply: (next: ForecastFilters) => void;
}

export function ForecastGuide({ filters, onApply }: Props) {
    const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
    const [showTable, setShowTable] = useState(false);

    return (
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-xl ring-1 ring-blue-100 p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                        Forecast guide — pick the right combination
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setShowTable((s) => !s)}
                    className="text-[11px] text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1"
                >
                    {showTable ? 'Hide' : 'Show'} filter glossary
                    <ChevronDown className={cn('w-3 h-3 transition-transform', showTable && 'rotate-180')} />
                </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
                One-click presets tune horizon · history · distance · location for a specific question.
                Each shows why that combination produces the most accurate forecast for that goal.
            </p>

            {/* Preset chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {PRESETS.map((p) => {
                    const Icon = p.icon;
                    const expanded = expandedPreset === p.id;
                    return (
                        <div key={p.id} className={cn(
                            'rounded-lg ring-1 transition-colors',
                            expanded ? 'ring-blue-300 bg-white' : 'ring-slate-200 bg-white hover:ring-blue-200',
                        )}>
                            <button
                                type="button"
                                onClick={() => setExpandedPreset((cur) => cur === p.id ? null : p.id)}
                                className="w-full text-left p-2.5 flex items-start gap-2"
                            >
                                <div className={cn(
                                    'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
                                    'bg-blue-50 text-blue-600',
                                )}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-slate-900">{p.label}</div>
                                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5 line-clamp-2">
                                        {p.description}
                                    </div>
                                </div>
                                <ChevronRight className={cn(
                                    'w-3 h-3 text-slate-400 mt-1.5 transition-transform shrink-0',
                                    expanded && 'rotate-90',
                                )} />
                            </button>
                            {expanded && (
                                <div className="px-2.5 pb-2.5 -mt-1">
                                    <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                                        {p.rationale}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onApply(p.apply(filters));
                                            setExpandedPreset(null);
                                        }}
                                        className="w-full px-2 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700"
                                    >
                                        Apply this preset
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Glossary table */}
            {showTable && (
                <div className="mt-4 rounded-lg ring-1 ring-blue-100 bg-white overflow-hidden">
                    <table className="w-full text-xs">
                        <thead className="bg-blue-50 text-blue-900">
                            <tr>
                                <th className="text-left px-3 py-2 font-bold">Filter</th>
                                <th className="text-left px-3 py-2 font-bold">What it does</th>
                                <th className="text-left px-3 py-2 font-bold">Affects</th>
                                <th className="text-left px-3 py-2 font-bold">Rule of thumb</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {GUIDANCE.map((g, i) => (
                                <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-semibold text-slate-800">{g.filter}</td>
                                    <td className="px-3 py-2 text-slate-600">{g.short}</td>
                                    <td className="px-3 py-2 text-slate-600">{g.affects}</td>
                                    <td className="px-3 py-2 text-slate-600">{g.rule}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
