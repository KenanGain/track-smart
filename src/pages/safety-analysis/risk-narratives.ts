/**
 * Predefined narrative templates for forecast PDFs and CSV preambles.
 *
 * Spec: docs/SAFETY_EXPORT_PLAN.md §4.
 *
 * Pure rendering. Templates use `{var}` placeholders. Missing variables
 * collapse cleanly so a sparse data set still produces clean prose.
 *
 * Tone: factual, restrained — never editorializes. Numbers are rounded
 * for prose; raw values appear in adjacent tables.
 */

export interface NarrativeVars {
    carrierName?: string;
    horizonLabel?: string;
    timelineLabel?: string;
    /** Current safety score 0–100. */
    safetyScore?: number;
    rating?: string;
    trend?: 'improving' | 'stable' | 'degrading';
    /** Slope in pts/month. */
    slope?: number;
    confidence?: 'high' | 'medium' | 'low';
    /** R² of the historical fit. */
    r2?: number;
    /** Months of history fitted. */
    historicalMonths?: number;

    /** Total predicted incidents over the horizon. */
    predictedViolations?: number;
    predictedAccidents?: number;

    /** Top-3 jurisdiction codes ordered by composite risk. */
    topJurisdictions?: string[];
    /** % of historical incidents accounted for by topJurisdictions. */
    topJurisdictionsPct?: number;

    /** Top-3 driver names ordered by risk score. */
    topDriverNames?: string[];
    /** Count of drivers with predicted accidents ≥ 1. */
    highRiskDriverCount?: number;
    /** Total drivers in scope. */
    totalDriverCount?: number;

    /** Total maintenance items predicted. */
    predictedMaintenanceCount?: number;
    /** Items already overdue. */
    overdueMaintenanceCount?: number;
    /** Top safety-critical service types. */
    topServiceTypes?: string[];

    /** Number of band-crossing alerts active. */
    alertCount?: number;
    /** Most-imminent alert title. */
    nextAlertTitle?: string;
    /** Date of the most-imminent alert. */
    nextAlertDate?: string;

    /** Per-driver only. */
    driverName?: string;
    licenseNumber?: string;
    pastViolations?: number;
    pastAccidents?: number;
    daysSinceLastEvent?: number;
    riskBand?: string;

    /** Per-asset only. */
    unitNumber?: string;
    make?: string;
    model?: string;
    year?: number;
    odometer?: number;
    engineHours?: number;
    operationalStatus?: string;

    /** Per-hotspot only. */
    jurisdictionName?: string;
    jurisdictionCode?: string;
    country?: string;
}

// ── Template registry ──────────────────────────────────────────────────────

type TemplateKey =
    | 'exec.summary'
    | 'exec.subhead'
    | 'forecast.trend'
    | 'forecast.confidence'
    | 'alerts.summary'
    | 'alerts.empty'
    | 'hotspots.intro'
    | 'hotspots.empty'
    | 'drivers.intro'
    | 'drivers.empty'
    | 'maintenance.intro'
    | 'maintenance.empty'
    | 'recommendations.intro'
    | 'methodology.body'
    | 'methodology.distanceFilter'
    | 'methodology.timelineFilter'
    | 'driver.summary'
    | 'driver.commentary'
    | 'asset.summary'
    | 'asset.commentary'
    | 'hotspot.summary'
    | 'hotspot.commentary'
    | 'cover.subtitle'
    | 'lineage.body';

const TEMPLATES: Record<TemplateKey, string> = {
    'cover.subtitle':
        '{carrierName} · forecast {horizonLabel} · history {timelineLabel}',

    'exec.subhead':
        'Forecast for {carrierName} over the next {horizonLabel}, fit on {historicalMonths} months of history.',

    'exec.summary':
        '{carrierName} is currently rated **{rating}** with a safety score of **{safetyScore}**. '
        + 'Over the next {horizonLabel} the carrier is projected to experience approximately '
        + '**{predictedViolations} violations** and **{predictedAccidents} accidents**, with the score trending '
        + '**{trend}** at {slope} points per month. '
        + 'Confidence in this projection is **{confidence}**, based on {historicalMonths} months of history (R² {r2}).',

    'forecast.trend':
        'The {horizonLabel} forward projection is bounded by an 80% prediction interval that widens with the '
        + 'horizon. Beyond 36 months the slope is damped and pulled toward the long-run mean to avoid '
        + 'compounding extrapolation. Reference lines mark the configured Excellent / Good / Fair / Poor floors.',

    'forecast.confidence':
        'Confidence is reported as {confidence}. With R² of {r2} and {historicalMonths} months of fit, the '
        + 'projection should be treated as directional rather than precise — wider bands at longer horizons '
        + 'reflect the increased uncertainty, not added risk.',

    'alerts.summary':
        '**{alertCount}** band-crossing alert{alertCount_plural} {alertCount_verb} been raised within the forecast horizon. '
        + 'The earliest is "{nextAlertTitle}" anchored to {nextAlertDate}.',

    'alerts.empty':
        'No band-crossing alerts are predicted within the chosen horizon — the projection stays in or above '
        + 'the current band throughout.',

    'hotspots.intro':
        '{topJurisdictions} account for approximately {topJurisdictionsPct}% of historical incidents and are '
        + 'predicted to remain primary hotspots over the forecast horizon. Recurring incidents in the same '
        + 'geography materially raise the predicted risk for those locations.',

    'hotspots.empty':
        'No jurisdictional hotspots have been identified — the carrier has either no historical incidents on '
        + 'file or events are evenly distributed across geographies.',

    'drivers.intro':
        '{highRiskDriverCount} of {totalDriverCount} drivers contribute disproportionately to predicted risk. '
        + 'The leading contributors are {topDriverNames}, with composite risk scores driven primarily by recent '
        + 'violation rate and accident severity. Each is profiled in the per-driver appendix.',

    'drivers.empty':
        'No drivers in scope show meaningful predicted incident counts within the horizon. Continue routine '
        + 'monitoring; revisit if conditions change.',

    'maintenance.intro':
        '**{predictedMaintenanceCount}** maintenance items are predicted to come due within the {horizonLabel} '
        + 'window. **{overdueMaintenanceCount}** of those are already overdue and require immediate attention. '
        + 'Top safety-critical service types pending: {topServiceTypes}.',

    'maintenance.empty':
        'No upcoming maintenance items are predicted within the horizon, and no items are currently overdue.',

    'recommendations.intro':
        'The recommendations that follow are auto-derived from top contributors and predicted alerts. Each '
        + 'is ranked by severity and tagged with an action key — opening a work order, scheduling training, '
        + 'reviewing an inspection, or verifying a document.',

    'methodology.body':
        'Forecasts are produced by a deterministic engine that combines three techniques: '
        + '(1) **linear regression** on a 24-month rolling-window safety-score series, '
        + '(2) **Holt-style EWMA** on the monthly event-count and OOS-count series with α = 0.4, and '
        + '(3) **damped extrapolation** that decays the regression slope by exp(−Δt/36 months) and pulls the '
        + 'projection toward the long-run mean as the horizon lengthens. The 80% prediction interval is '
        + 'computed as ±1.28σ·√Δt where σ is the residual standard deviation of the regression. '
        + 'Configuration is identified by a stable hash printed on the cover page so any two runs of the same '
        + 'data and configuration produce identical artefacts.',

    'methodology.distanceFilter':
        'Distance filter is active. Drivers and assets outside the selected mileage bucket(s) have been '
        + 'excluded from per-entity tables. Aggregate forecasts still reflect the carrier as a whole.',

    'methodology.timelineFilter':
        'History window is restricted to {timelineLabel}. Events outside this window are excluded from '
        + 'EWMA fitting and trend regression.',

    'driver.summary':
        '{driverName} ({licenseNumber}) currently presents a {riskBand} risk profile. Over the trailing '
        + '{timelineLabel}, the driver has logged **{pastViolations} violations** and **{pastAccidents} '
        + 'accidents**. The most recent event was **{daysSinceLastEvent} days ago**.',

    'driver.commentary':
        'Projected over the next {horizonLabel}: **{predictedViolations} violations** and '
        + '**{predictedAccidents} accidents**. Trend on this driver is {trend}.',

    'asset.summary':
        'Unit {unitNumber} ({make} {model}, {year}) is operating in {operationalStatus} status with '
        + '{odometer} miles and {engineHours} engine hours on the clock.',

    'asset.commentary':
        'Maintenance scheduling for the next {horizonLabel} is summarised below — items are sorted by '
        + 'predicted-due date with safety-critical service types prioritised.',

    'hotspot.summary':
        '{jurisdictionName} ({jurisdictionCode}) has accumulated **{pastViolations} violations** and '
        + '**{pastAccidents} accidents** from this carrier over the {timelineLabel}.',

    'hotspot.commentary':
        'Forecast for {jurisdictionCode}: **{predictedViolations} violations** and **{predictedAccidents} '
        + 'accidents** in the next {horizonLabel}. Recurrence in this jurisdiction is consistent with '
        + 'historical patterns.',

    'lineage.body':
        'This document is reproducible: a re-run with the same risk-config hash and the same source data '
        + 'will produce identical numerical results. Filters in effect at generation are recorded above.',
};

// ── Renderer ────────────────────────────────────────────────────────────────

/**
 * Substitute `{var}` placeholders with values from `vars`. Missing values
 * become an empty string. Special pluralization helpers:
 *   {x_plural}  — 's' if x !== 1, else ''
 *   {x_verb}    — 'have' if x !== 1, else 'has'
 *
 * Does NOT interpret markdown — emit raw text. Callers split on '**' to
 * apply bold styling in PDF rendering.
 */
export function renderNarrative(key: TemplateKey, vars: NarrativeVars): string {
    const tpl = TEMPLATES[key];
    if (!tpl) return '';

    return tpl.replace(/\{(\w+)(?:_(plural|verb))?\}/g, (_, name: string, suffix?: string) => {
        const v = (vars as Record<string, unknown>)[name];
        if (suffix === 'plural') {
            const n = typeof v === 'number' ? v : 0;
            return n === 1 ? '' : 's';
        }
        if (suffix === 'verb') {
            const n = typeof v === 'number' ? v : 0;
            return n === 1 ? 'has' : 'have';
        }
        return formatVar(v);
    });
}

function formatVar(v: unknown): string {
    if (v == null) return '—';
    if (Array.isArray(v)) return v.join(', ') || '—';
    if (typeof v === 'number') {
        if (!Number.isFinite(v)) return '—';
        if (Number.isInteger(v)) return v.toLocaleString();
        return v.toFixed(1);
    }
    return String(v);
}

/** Split a rendered string on `**bold**` markers — used by PDF renderers
 *  to interleave normal and bold text spans. */
export function tokenizeNarrative(rendered: string): Array<{ text: string; bold: boolean }> {
    const out: Array<{ text: string; bold: boolean }> = [];
    let i = 0;
    while (i < rendered.length) {
        const next = rendered.indexOf('**', i);
        if (next === -1) {
            out.push({ text: rendered.slice(i), bold: false });
            break;
        }
        if (next > i) out.push({ text: rendered.slice(i, next), bold: false });
        const close = rendered.indexOf('**', next + 2);
        if (close === -1) {
            out.push({ text: rendered.slice(next + 2), bold: true });
            break;
        }
        out.push({ text: rendered.slice(next + 2, close), bold: true });
        i = close + 2;
    }
    return out;
}

/** Convenience: render then strip markdown stars (for plain-text uses). */
export function renderPlain(key: TemplateKey, vars: NarrativeVars): string {
    return renderNarrative(key, vars).replace(/\*\*/g, '');
}
