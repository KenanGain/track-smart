/**
 * Forecast filters — time / distance / location / timeline.
 *
 * Spec: docs/SAFETY_EXPORT_PLAN.md §2.
 *
 * Pure functions — no React, no I/O. The Forecast tab keeps an instance
 * of `ForecastFilters` in component state and feeds it into every
 * downstream computation. Apply once, reuse everywhere.
 */

import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import type { RiskEvent } from './risk-engine.types';
import { jurisdictionForEvent } from './risk-scoring';

// ── Types ────────────────────────────────────────────────────────────────────

export const HORIZON_OPTIONS = [1, 2, 3, 6, 12, 16, 18, 36, 60] as const;
export type ForecastHorizon = (typeof HORIZON_OPTIONS)[number];

export const TIMELINE_PRESETS: Record<string, number | null> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '6mo': 180,
    '12mo': 365,
    '24mo': 730,
    'all': null,
};
export type TimelinePresetKey = keyof typeof TIMELINE_PRESETS;

export const DISTANCE_BUCKETS: ReadonlyArray<{
    key: DistanceBucketKey;
    label: string;
    min: number;
    max: number; // inclusive upper; Number.POSITIVE_INFINITY for the last
}> = [
    { key: 'light',     label: 'Light',     min: 0,       max: 25_000 },
    { key: 'standard',  label: 'Standard',  min: 25_000,  max: 50_000 },
    { key: 'heavy',     label: 'Heavy',     min: 50_000,  max: 100_000 },
    { key: 'long-haul', label: 'Long-haul', min: 100_000, max: 250_000 },
    { key: 'veteran',   label: 'Veteran',   min: 250_000, max: Number.POSITIVE_INFINITY },
];
export type DistanceBucketKey = 'light' | 'standard' | 'heavy' | 'long-haul' | 'veteran';

export type CountryCode = 'US' | 'CA';

export interface ForecastFilters {
    horizonMonths: ForecastHorizon;
    /** Distance buckets included (empty = no distance filter). */
    distanceBuckets: DistanceBucketKey[];
    /** Countries included (empty = both). */
    countries: CountryCode[];
    /** 2-letter jurisdiction codes (empty = all jurisdictions). */
    jurisdictions: string[];
    /** Number of trailing days kept; null = unrestricted. */
    timelineWindowDays: number | null;
    /** ISO date — overrides timelineWindowDays when both `from` and `to` set. */
    timelineFromIso?: string;
    timelineToIso?: string;
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_FORECAST_FILTERS: ForecastFilters = {
    horizonMonths: 12,
    distanceBuckets: [],
    countries: [],
    jurisdictions: [],
    timelineWindowDays: 365,
};

// ── Persistence (sessionStorage) ────────────────────────────────────────────

const STORAGE_KEY = 'safety:forecast-filters';

export function loadFilters(): ForecastFilters {
    if (typeof sessionStorage === 'undefined') return { ...DEFAULT_FORECAST_FILTERS };
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_FORECAST_FILTERS };
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_FORECAST_FILTERS, ...parsed };
    } catch {
        return { ...DEFAULT_FORECAST_FILTERS };
    }
}

export function saveFilters(f: ForecastFilters): void {
    if (typeof sessionStorage === 'undefined') return;
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

// ── Application ──────────────────────────────────────────────────────────────

const CA_CODES = new Set(['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']);

/** Validate a filter set. Returns a list of human-readable warnings.
 *  An empty array means the filter set is valid as-is. */
export function validateFilters(f: ForecastFilters): string[] {
    const warnings: string[] = [];
    if (f.timelineFromIso && f.timelineToIso) {
        const from = new Date(f.timelineFromIso).getTime();
        const to = new Date(f.timelineToIso).getTime();
        if (Number.isFinite(from) && Number.isFinite(to) && from > to) {
            warnings.push('Custom range: "from" date is after "to" date — range ignored.');
        }
    }
    return warnings;
}

/** True when the custom from/to range is a usable interval. */
function customRangeIsValid(f: ForecastFilters): boolean {
    if (!f.timelineFromIso || !f.timelineToIso) return Boolean(f.timelineFromIso || f.timelineToIso);
    const from = new Date(f.timelineFromIso).getTime();
    const to = new Date(f.timelineToIso).getTime();
    if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
    return from <= to;
}

/** Apply timeline + location filters to an event ledger.
 *  Distance filtering is a downstream concern (driver/asset partitioning).
 *  An invalid custom range (from > to) is ignored — never silently
 *  excludes the entire ledger. */
export function applyEventFilters(events: RiskEvent[], f: ForecastFilters): RiskEvent[] {
    const cutoff = computeTimelineCutoff(f);
    const wantedJurs = new Set(f.jurisdictions);
    const wantedCountries = new Set(f.countries);
    const useCustomRange = customRangeIsValid(f);

    return events.filter((e) => {
        // Timeline (preset window)
        if (cutoff && new Date(e.date).getTime() < cutoff) return false;
        // Custom range — only when valid; mismatched ranges are skipped.
        if (useCustomRange && f.timelineFromIso) {
            if (new Date(e.date).getTime() < new Date(f.timelineFromIso).getTime()) return false;
        }
        if (useCustomRange && f.timelineToIso) {
            if (new Date(e.date).getTime() > new Date(f.timelineToIso).getTime()) return false;
        }

        // Country / jurisdiction
        if (wantedCountries.size > 0 || wantedJurs.size > 0) {
            const code = jurisdictionForEvent(e);
            if (!code) return wantedJurs.size === 0 && wantedCountries.size === 0 ? true : false;
            if (wantedJurs.size > 0 && !wantedJurs.has(code)) return false;
            if (wantedCountries.size > 0) {
                const country: CountryCode = CA_CODES.has(code) ? 'CA' : 'US';
                if (!wantedCountries.has(country)) return false;
            }
        }
        return true;
    });
}

/** Bucket an asset into a distance bucket based on its odometer. */
export function distanceBucketForAsset(carrierId: string, assetId: string): DistanceBucketKey | undefined {
    const asset = (CARRIER_ASSETS[carrierId] ?? []).find((a) => a.id === assetId) as
        | { odometer?: number } | undefined;
    if (!asset) return undefined;
    const miles = asset.odometer ?? 0;
    return bucketFor(miles);
}

export function bucketFor(miles: number): DistanceBucketKey {
    for (const b of DISTANCE_BUCKETS) {
        if (miles >= b.min && miles <= b.max) return b.key;
    }
    return 'light';
}

/** True when the asset's bucket passes the distance filter (empty = pass). */
export function passesDistanceFilter(carrierId: string, assetId: string, f: ForecastFilters): boolean {
    if (f.distanceBuckets.length === 0) return true;
    const bucket = distanceBucketForAsset(carrierId, assetId);
    if (!bucket) return false;
    return f.distanceBuckets.includes(bucket);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeTimelineCutoff(f: ForecastFilters): number | null {
    if (f.timelineWindowDays == null) return null;
    return Date.now() - f.timelineWindowDays * 86_400_000;
}

/** Human-readable label for the active timeline. */
export function describeTimeline(f: ForecastFilters): string {
    if (f.timelineFromIso && f.timelineToIso) return `${f.timelineFromIso} → ${f.timelineToIso}`;
    if (f.timelineWindowDays == null) return 'all time';
    if (f.timelineWindowDays <= 7) return `last ${f.timelineWindowDays} days`;
    if (f.timelineWindowDays <= 90) return `last ${f.timelineWindowDays} days`;
    if (f.timelineWindowDays <= 730) return `last ${Math.round(f.timelineWindowDays / 30)} months`;
    return `last ${Math.round(f.timelineWindowDays / 365)} years`;
}

/** Human-readable label for the forecast horizon. */
export function describeHorizon(months: number): string {
    if (months >= 12 && months % 12 === 0) {
        const y = months / 12;
        return `${y} year${y === 1 ? '' : 's'}`;
    }
    return `${months} month${months === 1 ? '' : 's'}`;
}

/** Compact summary line of every active filter — used in headers + PDF cover. */
export function summarizeFilters(f: ForecastFilters): string {
    const parts: string[] = [];
    parts.push(`forecast ${describeHorizon(f.horizonMonths)}`);
    parts.push(`history ${describeTimeline(f)}`);
    if (f.distanceBuckets.length > 0) parts.push(`${f.distanceBuckets.join(', ')} mileage`);
    if (f.countries.length > 0) parts.push(f.countries.join(' + '));
    if (f.jurisdictions.length > 0) parts.push(f.jurisdictions.slice(0, 6).join(', ') +
        (f.jurisdictions.length > 6 ? ` +${f.jurisdictions.length - 6}` : ''));
    return parts.join(' · ');
}
