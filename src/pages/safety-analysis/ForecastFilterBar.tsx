/**
 * Forecast filter bar — time / distance / location / timeline.
 *
 * Spec: docs/SAFETY_EXPORT_PLAN.md §5.1.
 *
 * One self-contained component. Pure UI; filter state is owned by the
 * parent (SafetyForecast). Persistence is a parent concern via the
 * `loadFilters` / `saveFilters` helpers in `risk-filters.ts`.
 */

import { useMemo, useState } from 'react';
import {
    Filter,
    Calendar,
    MapPin,
    Truck,
    Clock,
    RotateCcw,
    Info,
    ChevronDown,
    AlertTriangle,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    HORIZON_OPTIONS,
    TIMELINE_PRESETS,
    DISTANCE_BUCKETS,
    DEFAULT_FORECAST_FILTERS,
    summarizeFilters,
    describeHorizon,
    validateFilters,
    type ForecastFilters,
    type CountryCode,
    type ForecastHorizon,
} from './risk-filters';
import type { JurisdictionStats } from './risk-geo';

export interface ForecastFilterBarProps {
    filters: ForecastFilters;
    onChange: (next: ForecastFilters) => void;
    /** Available jurisdictions in this carrier's data — used for the location chips. */
    jurisdictions: JurisdictionStats[];
    /** Total event count summary for the status row. */
    totalEvents: number;
    filteredEvents: number;
}

export function ForecastFilterBar({
    filters, onChange, jurisdictions, totalEvents, filteredEvents,
}: ForecastFilterBarProps) {
    const update = (patch: Partial<ForecastFilters>) =>
        onChange({ ...filters, ...patch });
    const reset = () => onChange({ ...DEFAULT_FORECAST_FILTERS });
    const warnings = useMemo(() => validateFilters(filters), [filters]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            {warnings.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 ring-1 ring-amber-200 text-amber-800 text-xs">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        {warnings.map((w, i) => <div key={i}>{w}</div>)}
                    </div>
                    <button
                        type="button"
                        onClick={() => update({ timelineFromIso: undefined, timelineToIso: undefined })}
                        className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium"
                    >
                        <X className="w-3.5 h-3.5" /> Clear range
                    </button>
                </div>
            )}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-semibold text-slate-700">Forecast filters</span>
                    <Tip text="Compose four orthogonal filter dimensions: time (forecast horizon), timeline (history window), distance (mileage bucket), and location (country / jurisdiction). Filters apply to every section below and to every export." />
                </div>
                <button
                    type="button"
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md text-slate-600 hover:bg-slate-100 ring-1 ring-slate-200 font-medium"
                >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
            </div>

            {/* Horizon */}
            <FilterRow icon={<Clock className="w-3.5 h-3.5" />} label="Forecast horizon">
                <ChipGroup
                    options={HORIZON_OPTIONS.map((m) => ({ value: m, label: describeHorizon(m) }))}
                    value={filters.horizonMonths}
                    onChange={(v) => update({ horizonMonths: v as ForecastHorizon })}
                />
            </FilterRow>

            {/* Timeline */}
            <FilterRow icon={<Calendar className="w-3.5 h-3.5" />} label="History window">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {Object.keys(TIMELINE_PRESETS).map((key) => {
                        const days = TIMELINE_PRESETS[key];
                        const active = !filters.timelineFromIso && !filters.timelineToIso
                            && filters.timelineWindowDays === days;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => update({
                                    timelineWindowDays: days,
                                    timelineFromIso: undefined,
                                    timelineToIso: undefined,
                                })}
                                className={cn(
                                    'px-2.5 py-1 text-xs rounded-full font-medium ring-1 transition-colors',
                                    active
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                                )}
                            >
                                {key}
                            </button>
                        );
                    })}
                    <CustomDateRange filters={filters} onChange={update} />
                </div>
            </FilterRow>

            {/* Distance */}
            <FilterRow icon={<Truck className="w-3.5 h-3.5" />} label="Distance bucket">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {DISTANCE_BUCKETS.map((b) => {
                        const active = filters.distanceBuckets.includes(b.key);
                        return (
                            <button
                                key={b.key}
                                type="button"
                                onClick={() => {
                                    const next = active
                                        ? filters.distanceBuckets.filter((x) => x !== b.key)
                                        : [...filters.distanceBuckets, b.key];
                                    update({ distanceBuckets: next });
                                }}
                                title={`${b.min.toLocaleString()} – ${b.max === Number.POSITIVE_INFINITY ? '∞' : b.max.toLocaleString()} mi`}
                                className={cn(
                                    'px-2.5 py-1 text-xs rounded-full font-medium ring-1 transition-colors',
                                    active
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                                )}
                            >
                                {b.label}
                            </button>
                        );
                    })}
                </div>
            </FilterRow>

            {/* Country */}
            <FilterRow icon={<MapPin className="w-3.5 h-3.5" />} label="Country">
                <div className="flex items-center gap-1.5">
                    {(['US', 'CA'] as CountryCode[]).map((c) => {
                        const active = filters.countries.includes(c);
                        return (
                            <button
                                key={c}
                                type="button"
                                onClick={() => {
                                    const next = active
                                        ? filters.countries.filter((x) => x !== c)
                                        : [...filters.countries, c];
                                    update({ countries: next });
                                }}
                                className={cn(
                                    'px-2.5 py-1 text-xs rounded-full font-medium ring-1 transition-colors',
                                    active
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                                )}
                            >
                                {c}
                            </button>
                        );
                    })}
                </div>
            </FilterRow>

            {/* Jurisdictions */}
            <FilterRow icon={<MapPin className="w-3.5 h-3.5" />} label="Jurisdictions">
                <JurisdictionPicker
                    available={jurisdictions}
                    selected={filters.jurisdictions}
                    onChange={(next) => update({ jurisdictions: next })}
                />
            </FilterRow>

            {/* Status line */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                <span className="font-mono">{summarizeFilters(filters)}</span>
                <span>
                    <b className="text-slate-700">{filteredEvents.toLocaleString()}</b> of{' '}
                    {totalEvents.toLocaleString()} events in scope
                </span>
            </div>
        </div>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterRow({
    icon, label, children,
}: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold min-w-[140px] pt-1">
                <span className="text-slate-400">{icon}</span>
                <span>{label}</span>
            </div>
            <div className="flex-1 min-w-[200px]">{children}</div>
        </div>
    );
}

function ChipGroup<T extends string | number>({
    options, value, onChange,
}: {
    options: Array<{ value: T; label: string }>;
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            {options.map((o) => (
                <button
                    key={String(o.value)}
                    type="button"
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'px-2.5 py-1 text-xs rounded-full font-medium ring-1 transition-colors',
                        value === o.value
                            ? 'bg-blue-600 text-white ring-blue-600'
                            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function JurisdictionPicker({
    available, selected, onChange,
}: {
    available: JurisdictionStats[];
    selected: string[];
    onChange: (next: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const sorted = useMemo(
        () => [...available].sort((a, b) => b.eventCount - a.eventCount),
        [available],
    );

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
                {selected.map((code) => (
                    <button
                        key={code}
                        type="button"
                        onClick={() => onChange(selected.filter((c) => c !== code))}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-slate-900 text-white"
                    >
                        {code} <span className="opacity-60">×</span>
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 font-medium"
                >
                    {selected.length === 0 ? 'All jurisdictions' : 'Edit'}
                    <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
                </button>
            </div>
            {open && (
                <div className="bg-slate-50 ring-1 ring-slate-200 rounded-lg p-2 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1 max-h-44 overflow-auto">
                    {sorted.length === 0 && (
                        <span className="col-span-full text-xs text-slate-500 text-center py-3">
                            No jurisdictions in this carrier's data.
                        </span>
                    )}
                    {sorted.map((j) => {
                        const active = selectedSet.has(j.code);
                        return (
                            <button
                                key={j.code}
                                type="button"
                                onClick={() => {
                                    onChange(active
                                        ? selected.filter((c) => c !== j.code)
                                        : [...selected, j.code]);
                                }}
                                className={cn(
                                    'flex items-center justify-between px-2 py-1 text-xs rounded font-medium ring-1 transition-colors',
                                    active
                                        ? 'bg-blue-600 text-white ring-blue-600'
                                        : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-100',
                                )}
                            >
                                <span>{j.code}</span>
                                <span className={cn('text-[10px]', active ? 'text-white/60' : 'text-slate-400')}>
                                    {j.eventCount}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function CustomDateRange({
    filters, onChange,
}: { filters: ForecastFilters; onChange: (patch: Partial<ForecastFilters>) => void }) {
    const todayIso = new Date().toISOString().slice(0, 10);
    const hasRange = !!(filters.timelineFromIso || filters.timelineToIso);
    return (
        <div className="inline-flex items-center gap-1 ring-1 ring-slate-200 rounded-full px-2 py-0.5 bg-white">
            <input
                type="date"
                max={filters.timelineToIso ?? todayIso}
                value={filters.timelineFromIso ?? ''}
                onChange={(e) => onChange({
                    timelineFromIso: e.target.value || undefined,
                    timelineWindowDays: e.target.value ? null : filters.timelineWindowDays,
                })}
                className="text-xs bg-transparent focus:outline-none w-[120px]"
            />
            <span className="text-slate-400 text-xs">→</span>
            <input
                type="date"
                min={filters.timelineFromIso ?? undefined}
                max={todayIso}
                value={filters.timelineToIso ?? ''}
                onChange={(e) => onChange({
                    timelineToIso: e.target.value || undefined,
                    timelineWindowDays: e.target.value ? null : filters.timelineWindowDays,
                })}
                className="text-xs bg-transparent focus:outline-none w-[120px]"
            />
            {hasRange && (
                <button
                    type="button"
                    onClick={() => onChange({ timelineFromIso: undefined, timelineToIso: undefined })}
                    className="text-slate-400 hover:text-slate-700"
                    aria-label="Clear custom range"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}

function Tip({ text }: { text: string }) {
    return (
        <span className="group relative inline-flex">
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
            <span className="absolute left-0 top-5 z-10 hidden group-hover:block w-72 p-2 text-xs leading-relaxed bg-slate-900 text-white rounded-md shadow-lg">
                {text}
            </span>
        </span>
    );
}
