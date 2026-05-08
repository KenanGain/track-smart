/**
 * Risk-score forecasting.
 *
 * Spec: docs/SAFETY.md (extension — future-prediction layer).
 *
 * Strategy (pure, deterministic):
 *   1. Build trailing-window monthly safety scores for the last 24 months.
 *   2. Fit a simple linear regression to that series.
 *   3. Project the line forward `horizonMonths` months.
 *   4. Confidence band widens as ±k·σ_residual·√Δt where Δt is months ahead.
 *   5. Add a damping factor so very long horizons revert toward the
 *      long-run carrier mean (avoids absurd extrapolation at 5y).
 *   6. Predicted event/OOS counts come from a separate Holt-style
 *      exponential smoothing on the monthly trend already shipped.
 *
 * The math here is deliberately conservative — we'd rather flag uncertainty
 * with wide bands than fake precision.
 */

import type {
    Confidence,
    EntityRiskScore,
    RiskConfig,
    RiskEvent,
} from './risk-engine.types';
import { loadRiskEventsForCarrier } from './risk-load';
import { monthlyTrend } from './risk-geo';
import { computeRiskScore } from './risk-scoring';
import { recencyWeight, daysBetween } from './risk-normalizers';
import { applyEventFilters, type ForecastFilters } from './risk-filters';

// ── Public types ────────────────────────────────────────────────────────────

export interface ForecastPoint {
    /** YYYY-MM (always first of month). */
    month: string;
    /** ISO date for sorting / display. */
    date: string;
    /** 0 = current month; 1..N for future months. */
    monthsAhead: number;
    /** Predicted safety score 0..100. */
    predictedSafety: number;
    /** Lower bound of the 80% prediction interval. */
    lowerBound: number;
    /** Upper bound of the 80% prediction interval. */
    upperBound: number;
    predictedEvents: number;
    predictedOos: number;
    /** Number of maintenance items expected to come due this month. */
    predictedMaintenance: number;
    /** Whether this point is observed (history) or forecast. */
    type: 'history' | 'forecast';
}

export type ForecastTrend = 'improving' | 'stable' | 'degrading';

export interface ForecastAlert {
    severity: 'info' | 'warn' | 'urgent';
    title: string;
    detail: string;
    /** ISO date the alert is anchored to. */
    date: string;
}

export interface ForecastSummary {
    horizonMonths: number;
    trend: ForecastTrend;
    /** Slope in safety-points / month (positive = improving). */
    slope: number;
    /** Std deviation of regression residuals (used for confidence band). */
    residualStd: number;
    /** Pearson R² of the historical fit. */
    r2: number;
    confidence: Confidence;
    /** Current month + future points. First = current snapshot. */
    points: ForecastPoint[];
    /** History points used to fit the model (for the "look-back" tail). */
    history: ForecastPoint[];
    alerts: ForecastAlert[];
    /** Snapshot of "now" before the projection runs. */
    base: EntityRiskScore;
}

// ── Public horizons ─────────────────────────────────────────────────────────

export const FORECAST_HORIZONS_MONTHS = [1, 2, 3, 6, 12, 16, 18, 36, 60] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS_MONTHS)[number];

export function horizonLabel(months: number): string {
    if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
    if (months % 12 === 0) {
        const y = months / 12;
        return `${y} year${y === 1 ? '' : 's'}`;
    }
    return `${months} months`;
}

// ── Engine ──────────────────────────────────────────────────────────────────

/** Build a forecast for a carrier.
 *  When `filters` is supplied, the same filtered ledger that the visible
 *  filter-bar count reflects feeds the regression history + EWMA — so the
 *  carrier forecast is consistent with the per-driver / per-hotspot
 *  projections shown elsewhere on the page. */
export function forecastCarrierRisk(
    carrierId: string,
    horizonMonths: number,
    cfg: RiskConfig,
    upcomingMaintenanceMonthly: number[] = [], // optional — index 0 = next month
    filters?: ForecastFilters,
): ForecastSummary {
    const base = computeRiskScore({ kind: 'carrier', carrierId }, cfg);
    const rawEvents = loadRiskEventsForCarrier(carrierId);
    const events = filters ? applyEventFilters(rawEvents, filters) : rawEvents;

    // 24-month rolling-window safety scores. Each window ends on the month
    // boundary and excludes events past the cutoff. The point we plot for a
    // given month is the safety score that would have been computed *at the
    // end of that month* — this is the time series we regress on.
    const lookback = 24;
    const history = buildHistory(events, base.safetyScore, lookback, cfg);

    // Linear regression on history (x = monthsAgo, y = safetyScore).
    const { slope, intercept, r2, residualStd } = linearRegression(
        history.map((h, i) => ({ x: i, y: h.predictedSafety })),
    );

    // Damp slope toward 0 the further out we go to avoid runaway extrapolation.
    // After ~36 months the slope is reduced to 30%; after 60 months to ~15%.
    const dampedSlope = (monthsAhead: number) =>
        slope * Math.exp(-monthsAhead / 36);

    // Long-run mean for soft pull-back at very long horizons.
    const longRunMean =
        history.reduce((a, b) => a + b.predictedSafety, 0) / Math.max(1, history.length);

    const points: ForecastPoint[] = [];
    points.push(toForecastPoint(base.safetyScore, 0, residualStd, 'history', 0, 0, upcomingMaintenanceMonthly[0] ?? 0));

    // Forecast events using EWMA on the historical event count series.
    const eventSeries = monthlyTrend(events, lookback);
    const { ewma: eventForecast } = ewmaForecast(eventSeries.map((p) => p.events), horizonMonths, 0.4);
    const { ewma: oosForecast } = ewmaForecast(eventSeries.map((p) => p.oos), horizonMonths, 0.4);

    for (let m = 1; m <= horizonMonths; m++) {
        const xLast = history.length - 1;
        const xFuture = xLast + m;
        const linearPredict = intercept + slope * xFuture;
        const dampedDelta = dampedSlope(m) * m;
        const lastObserved = history[history.length - 1]?.predictedSafety ?? base.safetyScore;
        const blend = lastObserved + dampedDelta * 0.5 + (linearPredict - lastObserved) * 0.5;
        // Pull toward long-run mean as horizon grows.
        const meanPull = Math.min(0.6, m / 60);
        const projected = blend * (1 - meanPull) + longRunMean * meanPull;
        const safety = clamp(projected, 0, 100);
        const events = Math.max(0, Math.round(eventForecast[m - 1] ?? 0));
        const oos = Math.max(0, Math.round(oosForecast[m - 1] ?? 0));
        const maint = Math.max(0, upcomingMaintenanceMonthly[m] ?? 0);
        points.push(toForecastPoint(safety, m, residualStd, 'forecast', events, oos, maint));
    }

    const trend: ForecastTrend = slope > 0.5 ? 'improving' : slope < -0.5 ? 'degrading' : 'stable';
    const confidence: Confidence =
        history.length >= 18 && r2 >= 0.4 ? 'high' :
        history.length >= 9 ? 'medium' : 'low';

    const alerts = buildAlerts(points, base, cfg);

    return {
        horizonMonths,
        trend,
        slope,
        residualStd,
        r2,
        confidence,
        points,
        history,
        alerts,
        base,
    };
}

// ── History reconstruction ──────────────────────────────────────────────────

/** Approximate the historical safety score per month by re-applying the
 *  decay over the events that existed by each month boundary. We don't
 *  rerun the full carrier formula (too expensive at every snapshot) —
 *  instead we adjust the current score by the delta in decayed-severity
 *  that an extra/missing month implies. This is a decent proxy for the
 *  trend line; the user-visible "base" snapshot remains the authoritative
 *  current value. */
function buildHistory(
    events: RiskEvent[],
    currentSafety: number,
    monthsBack: number,
    cfg: RiskConfig,
): ForecastPoint[] {
    const out: ForecastPoint[] = [];
    const today = new Date();

    // Total decayed severity at "now".
    const todayIso = today.toISOString().slice(0, 10);
    const nowSeverity = events.reduce((a, e) => a + e.severity * recencyWeight(daysBetween(todayIso, e.date), cfg), 0);

    for (let i = monthsBack - 1; i >= 0; i--) {
        const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const refIso = ref.toISOString().slice(0, 10);
        const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;

        // Events older than the reference date contribute via decay relative
        // to that month boundary; events newer are excluded (they didn't
        // happen yet in that snapshot).
        const past = events.filter((e) => new Date(e.date).getTime() <= ref.getTime());
        const sev = past.reduce((a, e) => a + e.severity * recencyWeight(daysBetween(refIso, e.date), cfg), 0);

        // Anchor on the current real score; scale by severity ratio.
        const ratio = nowSeverity > 0 ? sev / nowSeverity : 1;
        const safety = clamp(currentSafety + (1 - ratio) * 12, 0, 100);

        out.push({
            month: monthKey,
            date: refIso,
            monthsAhead: -i,
            predictedSafety: round1(safety),
            lowerBound: round1(safety),
            upperBound: round1(safety),
            predictedEvents: 0,
            predictedOos: 0,
            predictedMaintenance: 0,
            type: 'history',
        });
    }
    return out;
}

// ── Math helpers ────────────────────────────────────────────────────────────

function linearRegression(pts: { x: number; y: number }[]): {
    slope: number; intercept: number; r2: number; residualStd: number;
} {
    if (pts.length < 2) return { slope: 0, intercept: pts[0]?.y ?? 80, r2: 0, residualStd: 5 };
    const n = pts.length;
    const sumX = pts.reduce((a, p) => a + p.x, 0);
    const sumY = pts.reduce((a, p) => a + p.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    let sumXY = 0, sumXX = 0, sumYY = 0;
    for (const p of pts) {
        sumXY += (p.x - meanX) * (p.y - meanY);
        sumXX += (p.x - meanX) ** 2;
        sumYY += (p.y - meanY) ** 2;
    }
    const slope = sumXX === 0 ? 0 : sumXY / sumXX;
    const intercept = meanY - slope * meanX;
    const ssRes = pts.reduce((a, p) => {
        const yhat = intercept + slope * p.x;
        return a + (p.y - yhat) ** 2;
    }, 0);
    const r2 = sumYY === 0 ? 0 : 1 - ssRes / sumYY;
    const residualStd = Math.sqrt(ssRes / Math.max(1, n - 2));
    return { slope, intercept, r2, residualStd };
}

/**
 * Holt double-exponential smoothing — tracks level + trend so the forecast
 * reflects momentum instead of flat-lining at the smoothed mean.
 *
 *   level_t   = α · y_t + (1 − α) · (level_{t-1} + trend_{t-1})
 *   trend_t   = β · (level_t − level_{t-1}) + (1 − β) · trend_{t-1}
 *   forecast(k) = level_T + k · trend_T   (clamped at 0 — counts can't go negative)
 *
 * α = 0.4 (level smoothing), β = 0.2 (trend smoothing) — conservative defaults
 * that respond to recent shifts without overreacting to a single noisy month.
 */
function ewmaForecast(
    series: number[],
    horizon: number,
    alpha = 0.4,
    beta = 0.2,
): { ewma: number[] } {
    const out: number[] = [];
    if (series.length === 0) {
        for (let i = 0; i < horizon; i++) out.push(0);
        return { ewma: out };
    }
    if (series.length === 1) {
        for (let i = 0; i < horizon; i++) out.push(Math.max(0, series[0]));
        return { ewma: out };
    }
    let level = series[0];
    let trend = series[1] - series[0];
    for (let i = 1; i < series.length; i++) {
        const prevLevel = level;
        level = alpha * series[i] + (1 - alpha) * (prevLevel + trend);
        trend = beta * (level - prevLevel) + (1 - beta) * trend;
    }
    for (let k = 1; k <= horizon; k++) {
        // Damp the trend slightly with horizon so 5-year forecasts don't run
        // away — same spirit as the safety-score slope dampening.
        const damped = trend * Math.exp(-k / 36);
        out.push(Math.max(0, level + k * damped));
    }
    return { ewma: out };
}

function toForecastPoint(
    safety: number, monthsAhead: number, residualStd: number,
    type: 'history' | 'forecast', events: number, oos: number, maintenance: number,
): ForecastPoint {
    const today = new Date();
    const ref = new Date(today.getFullYear(), today.getMonth() + monthsAhead, 1);
    const monthKey = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
    // 80% interval = ±1.28 σ; widen by √Δt for forecast points.
    const k = 1.28;
    const halfWidth = monthsAhead === 0 ? 0 : k * residualStd * Math.sqrt(monthsAhead);
    return {
        month: monthKey,
        date: ref.toISOString().slice(0, 10),
        monthsAhead,
        predictedSafety: round1(clamp(safety, 0, 100)),
        lowerBound: round1(clamp(safety - halfWidth, 0, 100)),
        upperBound: round1(clamp(safety + halfWidth, 0, 100)),
        predictedEvents: events,
        predictedOos: oos,
        predictedMaintenance: maintenance,
        type,
    };
}

function buildAlerts(
    points: ForecastPoint[],
    base: EntityRiskScore,
    cfg: RiskConfig,
): ForecastAlert[] {
    const alerts: ForecastAlert[] = [];
    for (const p of points) {
        if (p.type === 'history') continue;
        if (p.predictedSafety < cfg.bands.poorFloor) {
            alerts.push({
                severity: 'urgent',
                title: `Critical band entered in ${p.month}`,
                detail: `Forecast safety drops to ${p.predictedSafety.toFixed(1)} — below the Critical floor of ${cfg.bands.poorFloor}.`,
                date: p.date,
            });
            break;
        }
        if (p.predictedSafety < cfg.bands.fairFloor && base.safetyScore >= cfg.bands.fairFloor) {
            alerts.push({
                severity: 'warn',
                title: `Score forecast to fall to Poor in ${p.month}`,
                detail: `Predicted ${p.predictedSafety.toFixed(1)} — currently ${base.safetyScore.toFixed(1)}.`,
                date: p.date,
            });
            break;
        }
    }
    return alerts;
}

function clamp(n: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, n));
}

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}
