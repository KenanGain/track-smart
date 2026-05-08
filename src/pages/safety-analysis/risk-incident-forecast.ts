/**
 * Per-driver incident forecasts and per-location hotspot forecasts.
 *
 * Spec extension: "where do we keep having accidents → expect them again".
 *
 * Two predictions, one shared engine:
 *   1. Driver-level — for every driver, count violations + crashes per
 *      trailing window, smooth with EWMA, project rate × horizon.
 *   2. Jurisdiction-level — for every US state / CA province where this
 *      carrier has had accidents or violations, project the rate forward.
 *
 * Both are pure functions on the canonical event ledger. Confidence drops
 * when history is sparse — never silently treat "no data" as "low risk".
 */

import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';

import type { Confidence, RiskEvent } from './risk-engine.types';
import { loadRiskEventsForCarrier } from './risk-load';
import { jurisdictionForEvent } from './risk-scoring';
import { applyEventFilters, type ForecastFilters } from './risk-filters';

// ── Types ────────────────────────────────────────────────────────────────────

export interface DriverIncidentForecast {
    driverId: string;
    driverName: string;
    licenseNumber?: string;
    /** Counts inside the trailing 24 months (history). */
    pastViolations: number;
    pastAccidents: number;
    /** Days since the most-recent event of any kind (Infinity if none). */
    daysSinceLastEvent: number;
    /** Projected counts inside the chosen horizon. */
    predictedViolations: number;
    predictedAccidents: number;
    /** σ severity of this driver's last 24 months — used to size the bubble. */
    avgSeverity: number;
    /** 0..100 — composite risk score for ranking the table. Higher = worse. */
    riskScore: number;
    confidence: Confidence;
    /** Trend direction in events / month: positive → getting worse. */
    trendSlope: number;
}

export interface JurisdictionHotspotForecast {
    code: string;
    country: 'US' | 'CA';
    /** Counts inside the trailing 24 months. */
    pastViolations: number;
    pastAccidents: number;
    /** Projected events inside the chosen horizon. */
    predictedViolations: number;
    predictedAccidents: number;
    /** Average severity (0..10) of past events here. */
    avgSeverity: number;
    /** Composite risk score for sorting (predicted events × avg severity). */
    riskScore: number;
    confidence: Confidence;
    /** Most-recent event date in this jurisdiction. */
    lastEventDate?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const VIOLATION_KINDS: ReadonlyArray<RiskEvent['kind']> = ['violation', 'conviction'];
const ACCIDENT_KINDS:  ReadonlyArray<RiskEvent['kind']> = ['collision', 'crash'];

const CA_CODES = new Set([
    'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
]);

function isViolation(e: RiskEvent): boolean { return VIOLATION_KINDS.includes(e.kind); }
function isAccident(e: RiskEvent):  boolean { return ACCIDENT_KINDS.includes(e.kind); }

const TODAY = () => new Date();
const HISTORY_MONTHS = 24;

/** Bucket events into trailing months. Index 0 = oldest, len-1 = current. */
function monthlyCounts(events: RiskEvent[], months = HISTORY_MONTHS): number[] {
    const today = TODAY();
    const buckets = new Array(months).fill(0);
    for (const e of events) {
        const d = new Date(e.date);
        const monthsAgo = (today.getFullYear() - d.getFullYear()) * 12
            + (today.getMonth() - d.getMonth());
        if (monthsAgo < 0 || monthsAgo >= months) continue;
        buckets[months - 1 - monthsAgo] += 1;
    }
    return buckets;
}

/** Linear regression slope on a count series — pts/month. */
function trendSlope(series: number[]): number {
    const n = series.length;
    if (n < 2) return 0;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    for (let i = 0; i < n; i++) {
        sx += i;
        sy += series[i];
        sxy += i * series[i];
        sxx += i * i;
    }
    const denom = n * sxx - sx * sx;
    return denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
}

/**
 * Holt double-exponential — projects total events over the horizon as the
 * sum of level + k·trend per month (rather than level × horizon, which
 * ignores momentum). Trend damped by exp(-k/36) to keep long horizons
 * from running away.
 *
 * α tuned by data density: short series (< 6 non-zero observations) lean
 * reactive (α = 0.55), deeper history uses 0.4. β fixed at 0.2.
 */
function ewmaProject(series: number[], horizonMonths: number, alphaOverride?: number): number {
    if (series.length === 0) return 0;
    if (series.length === 1) return Math.max(0, series[0]) * horizonMonths;
    const observed = series.filter((v) => v > 0).length;
    const alpha = alphaOverride ?? (observed < 6 ? 0.55 : 0.4);
    const beta = 0.2;
    let level = series[0];
    let trend = series[1] - series[0];
    for (let i = 1; i < series.length; i++) {
        const prevLevel = level;
        level = alpha * series[i] + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    let total = 0;
    for (let k = 1; k <= horizonMonths; k++) {
        const damped = trend * Math.exp(-k / 36);
        total += Math.max(0, level + k * damped);
    }
    return total;
}

function confidenceFor(historicalCount: number, monthsCovered: number): Confidence {
    if (historicalCount === 0) return 'low';
    if (historicalCount >= 5 && monthsCovered >= 6) return 'high';
    if (historicalCount >= 2) return 'medium';
    return 'low';
}

function daysAgo(dateStr: string): number {
    const d = new Date(dateStr).getTime();
    if (!Number.isFinite(d)) return Infinity;
    return Math.max(0, Math.floor((Date.now() - d) / 86_400_000));
}

// ── Driver forecast ──────────────────────────────────────────────────────────

export function forecastDriverIncidents(
    carrierId: string,
    horizonMonths: number,
    filters?: ForecastFilters,
): DriverIncidentForecast[] {
    const drivers = CARRIER_DRIVERS[carrierId] ?? [];
    if (drivers.length === 0) return [];

    const rawEvents = loadRiskEventsForCarrier(carrierId);
    const allEvents = filters ? applyEventFilters(rawEvents, filters) : rawEvents;

    return drivers.map((d): DriverIncidentForecast => {
        const driverEvents = allEvents.filter((e) => e.driverId === d.id);
        const violations = driverEvents.filter(isViolation);
        const accidents  = driverEvents.filter(isAccident);

        const violationsByMonth = monthlyCounts(violations);
        const accidentsByMonth  = monthlyCounts(accidents);
        const allByMonth        = monthlyCounts(driverEvents);

        const predictedViolations = ewmaProject(violationsByMonth, horizonMonths);
        const predictedAccidents  = ewmaProject(accidentsByMonth, horizonMonths);

        const avgSeverity = driverEvents.length > 0
            ? driverEvents.reduce((a, e) => a + e.severity, 0) / driverEvents.length
            : 0;

        // Composite risk = weighted predicted incidents × severity bonus.
        // Accidents weigh ~2.5× violations because of their consequence cost.
        const riskScore = clamp(
            (predictedViolations + predictedAccidents * 2.5) * (1 + avgSeverity / 10) * 6,
            0, 100,
        );

        const lastEventDate = driverEvents
            .map((e) => e.date)
            .sort()
            .pop();

        const slope = trendSlope(allByMonth);

        return {
            driverId: d.id,
            driverName: `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() || d.id,
            licenseNumber: d.licenseNumber,
            pastViolations: violations.length,
            pastAccidents: accidents.length,
            daysSinceLastEvent: lastEventDate ? daysAgo(lastEventDate) : Infinity,
            predictedViolations: round1(predictedViolations),
            predictedAccidents: round1(predictedAccidents),
            avgSeverity: round1(avgSeverity),
            riskScore: round1(riskScore),
            confidence: confidenceFor(driverEvents.length, HISTORY_MONTHS),
            trendSlope: round2(slope),
        };
    }).sort((a, b) => b.riskScore - a.riskScore);
}

// ── Jurisdiction hotspot forecast ────────────────────────────────────────────

export function forecastJurisdictionHotspots(
    carrierId: string,
    horizonMonths: number,
    filters?: ForecastFilters,
): JurisdictionHotspotForecast[] {
    const rawEvents = loadRiskEventsForCarrier(carrierId);
    const events = filters ? applyEventFilters(rawEvents, filters) : rawEvents;

    // Bucket events by jurisdiction.
    const byCode = new Map<string, RiskEvent[]>();
    for (const e of events) {
        const code = jurisdictionForEvent(e);
        if (!code) continue;
        if (!isViolation(e) && !isAccident(e)) continue;
        let bucket = byCode.get(code);
        if (!bucket) { bucket = []; byCode.set(code, bucket); }
        bucket.push(e);
    }

    const out: JurisdictionHotspotForecast[] = [];
    for (const [code, evs] of byCode) {
        const violations = evs.filter(isViolation);
        const accidents  = evs.filter(isAccident);

        const vByMonth = monthlyCounts(violations);
        const aByMonth = monthlyCounts(accidents);

        const predictedViolations = ewmaProject(vByMonth, horizonMonths);
        const predictedAccidents  = ewmaProject(aByMonth, horizonMonths);

        const avgSeverity = evs.length > 0
            ? evs.reduce((a, e) => a + e.severity, 0) / evs.length
            : 0;

        const riskScore = clamp(
            (predictedViolations + predictedAccidents * 2.5) * (1 + avgSeverity / 10) * 4,
            0, 100,
        );

        const lastEventDate = evs.map((e) => e.date).sort().pop();

        out.push({
            code,
            country: CA_CODES.has(code) ? 'CA' : 'US',
            pastViolations: violations.length,
            pastAccidents: accidents.length,
            predictedViolations: round1(predictedViolations),
            predictedAccidents: round1(predictedAccidents),
            avgSeverity: round1(avgSeverity),
            riskScore: round1(riskScore),
            confidence: confidenceFor(evs.length, HISTORY_MONTHS),
            lastEventDate,
        });
    }

    return out.sort((a, b) => b.riskScore - a.riskScore);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, n)); }
function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
