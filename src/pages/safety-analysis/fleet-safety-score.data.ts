// Fleet Safety Score — computes a real per-carrier safety dashboard from the
// carrier-scoped data sources we already maintain (accidents, violations,
// inspections, HOS, work orders, and the driver/asset rosters).
//
// Every sub-score is 0–100, higher is better. Each starts at 100 and is
// deducted against discrete signals derived from real records on the active
// carrier — same data the rest of the app already renders, so the numbers on
// this dashboard line up exactly with the underlying Accidents / Violations /
// Inspections / HOS / Maintenance pages.
//
// The Fleet Safety Score is a weighted blend of the sub-scores. Weights match
// the FMCSA SMS intent: violations + inspections + HOS dominate, accidents
// pull the score down hardest when they happen, maintenance + assets fill in.

import { getAccidentsForCarrier } from "@/pages/incidents/carrier-accidents.data";
import { getViolationsForCarrier } from "@/pages/violations/carrier-violations.data";
import { getInspectionsForCarrier } from "@/data/carrier-inspections.data";
import { getHosForCarrier } from "@/pages/hos/carrier-hos.data";
import { getWorkOrdersForCarrier } from "@/pages/assets/carrier-work-orders.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-fleet.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { ALL_VIOLATIONS } from "@/pages/violations/violations-list.data";

// ── Public types ───────────────────────────────────────────────────────────

export interface ScoreCardData {
    /** Numeric score 0–100, integer. */
    score: number;
    /** Risk label derived from the score band. */
    riskLabel: "Low Risk" | "Moderate Risk" | "High Risk";
    /** % representation of the score (always score itself — kept for the donut UI). */
    percent: number;
    /** Underlying counts so the card can display 'X violations' / 'Y accidents'. */
    contributorCount: number;
    /** Optional tooltip string with the breakdown. */
    tooltip: string;
}

export interface FleetSafetyScore {
    /** Composite 0–100 score (integer). */
    overall: number;
    /** Band label used for the colored header strip + main rating. */
    band: SafetyBand;
    /** Underlying signals so the UI can show "Based on N violations, M accidents…". */
    signals: {
        accidentCount: number;
        violationCount: number;
        inspectionCount: number;
        oosCount: number;
        hosLogCount: number;
        hosViolationCount: number;
        workOrderCount: number;
        overdueWoCount: number;
        driverCount: number;
        assetCount: number;
        cmvCount: number;
        openCaseCount: number;
        cleanInspectionCount: number;
        cleanInspectionRate: number; // 0–100
        oosPer100Insp: number;
        smsScore: number;            // 0–100 (higher = better)
    };
    /** All six sub-score cards. */
    cards: {
        accident: ScoreCardData;
        eld: ScoreCardData;
        inspection: ScoreCardData;
        driver: ScoreCardData;
        vedr: ScoreCardData;
        roadsideViolation: ScoreCardData;
        maintenance: ScoreCardData;
        asset: ScoreCardData;
    };
    /** FMCSA SMS BASIC rows — one per category, derived from the carrier roster. */
    basics: BasicBreakdown[];
    /** Ontario-style CVOR rating + 3-bucket detail. */
    cvor: CvorBreakdown;
    /** Canadian NSC (provincial) ratings — one entry per province the carrier
     *  is registered in. Empty when the carrier holds no NSC abstracts. */
    nscs: NscBreakdown[];
    /** Component breakdown used by the Score Breakdown section. */
    components: ComponentBreakdown[];
    /** Which regulatory regimes apply to this carrier — drives KPI card visibility. */
    regimes: CarrierRegimes;
    /** Carrier identifiers — passed through so cards can show the actual DOT / CVOR / NSC number. */
    identity: CarrierIdentity;
}

export interface CarrierRegimes {
    fmcsa: boolean;  // US DOT carrier — FMCSA SMS applies
    cvor: boolean;   // Ontario CVOR applies
    nsc: boolean;    // Non-Ontario Canadian NSC applies
}

export interface CarrierIdentity {
    legalName: string;
    country: "US" | "CA";
    stateOrProvince: string;
    dotNumber: string;
    cvorNumber: string;
    nscNumber: string;          // Primary NSC abstract
    nscNumbers: string[];       // All NSC abstracts the carrier holds (multi-province)
}

export interface NscBreakdown {
    province: string;        // e.g. "AB", "BC", "MB"
    rating: number;          // 0–100 score (higher = better, matching CCMTA convention)
    label: "Excellent" | "Satisfactory" | "Conditional" | "Unsatisfactory";
    nscNumber: string;
    /** Provincial event counts so the KPI card can show event-level info. */
    collisions: { count: number; rate: number };  // rate = per 100 drivers
    convictions: { count: number; rate: number };
    inspections: { count: number; oosRate: number };

    /** Shared profile metadata shown in every provincial NSC card header. */
    profile: {
        legalName: string;
        fleetSize: number;       // # of CMVs in the carrier's home fleet bucket
        fleetClass: string;      // e.g. "30.0-44.9"
        lastPullDate: string;    // ISO date — header timestamp
        avgWeight?: number;      // Avg fleet weight (NS only)
    };

    /** Province-specific scoring payloads. Exactly one is populated to match
     *  the province; the UI dispatcher picks the right card. */
    ab?: AbRFactor;       // Alberta — R-Factor
    bc?: BcProfile;       // British Columbia — Profile Score
    pe?: PeiPoints;       // Prince Edward Island — Schedule 3 points
    ns?: NsIndexedDemerit; // Nova Scotia — Indexed Demerit
}

export type ContributionLevel = "NONE" | "LOW" | "MODERATE" | "HIGH";

// ── Alberta R-Factor ──────────────────────────────────────────────────────
export interface AbRFactor {
    rFactor: number;     // small decimal, e.g. 0.062
    stage: "NOT_MONITORED" | "STAGE_1" | "STAGE_2" | "STAGE_3" | "STAGE_4";
    thresholds: { stage1: number; stage2: number; stage3: number; stage4: number };
    contributions: {
        convictions:          AbBucket;
        adminPenalties:       AbBucket;
        cvsaInspections:      AbBucket;
        reportableCollisions: AbBucket;
    };
}
export interface AbBucket {
    label: string;
    pctOfRFactor: number; // e.g. 34.6 (%)
    events: number;
    impact: number;       // %
    level: ContributionLevel;
}

// ── British Columbia Profile ─────────────────────────────────────────────
export interface BcProfile {
    certificateStatus: "Active" | "Inactive" | "Cancelled";
    safetyRating: "Satisfactory" | "Satisfactory - Unaudited" | "Conditional" | "Unsatisfactory";
    profileStatus: "Satisfactory" | "Conditional" | "Unsatisfactory";
    auditStatus: "Unaudited" | "Audit Required" | "Audited";
    profileScore: number;
    thresholds: { satisfactory: number; conditional: number; unsatisfactory: number };
    contributions: {
        contraventions:   BcBucket;
        cvsaOutOfService: BcBucket;
        accidents:        BcBucket;
    };
}
export interface BcBucket {
    label: string;
    score: number;        // e.g. 0.30
    events: number;
    impactPct: number;    // e.g. 7.5
    profileBand: "SATISFACTORY" | "CONDITIONAL" | "HIGH";
}

// ── Prince Edward Island Schedule 3 Points ───────────────────────────────
export interface PeiPoints {
    points: number;
    maxPoints: number;
    pctOfMax: number; // e.g. 41.8
    band: "SAFE" | "ADVISORY" | "WARNING" | "INTERVIEW" | "SANCTION";
    thresholds: { advisory: number; warning: number; interview: number; sanction: number };
    buckets: {
        collisionPoints:  PeiBucket;
        convictionPoints: PeiBucket;
        inspectionPoints: PeiBucket;
    };
}
export interface PeiBucket {
    label: string;
    points: number;
    pctOfMax: number;     // points / maxPoints * 100
    pctOfTotal: number;   // points / current points * 100
    level: ContributionLevel;
}

// ── Nova Scotia Indexed Demerit ──────────────────────────────────────────
export interface NsIndexedDemerit {
    indexedScore: number;     // decimal, e.g. 19.67
    levelCap: number;         // L3 cap, e.g. 60.18
    pctOfCap: number;         // 32.7
    band: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
    thresholds: { moderate: number; high: number; critical: number };
    breakdown: {
        convictions: NsBucket;
        inspections: NsBucket;
        collisions:  NsBucket;
    };
}
export interface NsBucket {
    label: string;
    score: number;          // e.g. 6.25
    pctOfCap: number;       // % of L3 cap
    pctOfTotal: number;     // % of total indexed score
    level: ContributionLevel;
}

export interface BasicBreakdown {
    key: BasicKey;
    label: string;
    /** Σ severity over relevant inspections — same shape as old page. */
    measure: number;
    /** 0–100 representation of SMS percentile (higher = worse, like real SMS). */
    percentile: number;
    /** Carrier-type alert threshold (general carrier defaults). */
    threshold: number;
    isAlert: boolean;
    hasSufficientData: boolean;
}

export type BasicKey =
    | "unsafe_driving"
    | "crash_indicator"
    | "hos_compliance"
    | "vehicle_maintenance"
    | "controlled_substances"
    | "hm_compliance"
    | "driver_fitness";

export const BASIC_LABELS: Record<BasicKey, string> = {
    unsafe_driving: "Unsafe Driving",
    crash_indicator: "Crash Indicator",
    hos_compliance: "HOS Compliance",
    vehicle_maintenance: "Vehicle Maintenance",
    controlled_substances: "Controlled Substances/Alcohol",
    hm_compliance: "HM Compliance",
    driver_fitness: "Driver Fitness",
};

export const BASIC_THRESHOLDS: Record<BasicKey, number> = {
    unsafe_driving: 65,
    crash_indicator: 65,
    hos_compliance: 65,
    vehicle_maintenance: 80,
    controlled_substances: 80,
    hm_compliance: 80,
    driver_fitness: 80,
};

export interface CvorBreakdown {
    rating: number;           // overall % (lower = better)
    label: "Excellent" | "Satisfactory" | "Conditional" | "Unsatisfactory";
    cvorNumber: string;       // displayed on the right-hand pill
    /** MTO action band — OK ≤ 35 / WARN ≤ 50 / AUDIT ≤ 85 / SHOW CAUSE ≤ 100 / SEIZURE > 100. */
    band: "OK" | "WARN" | "AUDIT" | "SHOW_CAUSE" | "SEIZURE";
    thresholds: { warn: number; audit: number; showCause: number; seizure: number };
    collisions:  { raw: number; weighted: number; count: number; points: number; band: "OK" | "WARN" | "AUDIT" | "SHOW_CAUSE" };
    convictions: { raw: number; weighted: number; count: number; points: number; band: "OK" | "WARN" | "AUDIT" | "SHOW_CAUSE" };
    inspections: { raw: number; weighted: number; count: number; oosRate: number; band: "OK" | "WARN" | "AUDIT" | "SHOW_CAUSE" };
    /** Out-of-service rates section. */
    oos: {
        overall: { rate: number; threshold: number; band: "OK" | "OVER" };
        vehicle: { rate: number; threshold: number; band: "OK" | "OVER" };
        driver:  { rate: number; threshold: number; band: "OK" | "OVER" };
    };
    /** Profile period (used by the header chip in the UI). */
    period: { from: string; to: string };
}

export interface ComponentBreakdown {
    label: string;
    score: number;
    prev: number;
    color: string;
}

export type SafetyBand = "Excellent" | "Good" | "Fair" | "Poor" | "Very Poor";

// ── Monthly TrackSmart points trend (driver / asset / carrier) ──────────

export interface MonthlyTsPoint {
    /** ISO start-of-month date — "2026-05-01". */
    date: string;
    /** Driver points earned across all violations this month. */
    driverPts: number;
    /** Asset points earned. */
    assetPts: number;
    /** Carrier points earned. */
    carrierPts: number;
    /** Number of violations in the month (drives count badges in tooltips). */
    eventCount: number;
}

/** Mirror of `defaultTsPointsFor` in ViolationsPage — clamps each value to
 *  0–10 and derives Driver / Asset / Carrier points from a single violation's
 *  severity, OOS flag, DSMS status, crash-likelihood %, and BASIC group. */
function tsPointsForViolation(v: any): { driver: number; asset: number; carrier: number } {
    const def = ALL_VIOLATIONS.find((x: any) => x.id === v?.violationDataId) as any;
    const sevD = Number(def?.severityWeight?.driver  ?? 0);
    const sevC = Number(def?.severityWeight?.carrier ?? 0);
    const isOos   = !!v?.isOos;
    const inDsms  = !!def?.inDsms;
    const crashPct = Number(v?.crashLikelihood ?? def?.crashLikelihoodPercent ?? 0);
    const riskCat = Number(v?.driverRiskCategory ?? def?.driverRiskCategory ?? 3);
    const group   = String(v?.violationGroup ?? def?.violationGroup ?? '').toLowerCase();

    const clampInt = (n: number, lo: number, hi: number) =>
        Math.max(lo, Math.min(hi, Math.round(Number.isFinite(n) ? n : 0)));

    const driverBase = sevD || (riskCat === 1 ? 6 : riskCat === 2 ? 3 : 1);
    const driver = clampInt(driverBase + (isOos ? 2 : 0) + (crashPct >= 200 ? 2 : crashPct >= 100 ? 1 : 0), 0, 10);

    const carrierBase = sevC || (riskCat === 1 ? 5 : riskCat === 2 ? 3 : 1);
    const carrier = clampInt(carrierBase + (inDsms ? 2 : 0) + (isOos ? 2 : 0), 0, 10);

    const vehicleHeavy =
        group.includes('vehicle')   || group.includes('maint') ||
        group.includes('brake')     || group.includes('light') ||
        group.includes('tire')      || group.includes('lamp')  ||
        group.includes('load')      || group.includes('cargo') ||
        group.includes('hazmat')    || group.includes('hm ')   ||
        group.includes('placard')   || group.includes('coupl') ||
        group.includes('air brak')  || group.includes('emergency') ||
        group.includes('inspection');
    const vehicleLight =
        group.includes('driver fitness') || group.includes('license') ||
        group.includes('medical')        || group.includes('cdl')    ||
        group.includes('hours')          || group.includes('hos')    ||
        group.includes('logbook')        || group.includes('eld')    ||
        group.includes('drug')           || group.includes('alcohol')||
        group.includes('controlled');
    const assetBase = vehicleHeavy
        ? Math.max(sevC, riskCat === 1 ? 6 : 4)
        : vehicleLight
            ? Math.max(1, Math.min(2, Math.round(sevC / 2)))
            : Math.max(2, Math.round(sevC * 0.6));
    const asset = clampInt(assetBase + (isOos ? 2 : 0), 0, 10);

    return { driver, asset, carrier };
}

/** Sum Driver / Asset / Carrier points by month, last N months. */
export function computeMonthlyTsPoints(
    accountId: string | undefined,
    months: number = 12,
): MonthlyTsPoint[] {
    const id = accountId ?? "acct-001";
    const violations = getViolationsForCarrier(id);

    // Pre-build empty month buckets so months with zero events still render.
    const buckets: MonthlyTsPoint[] = [];
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setMonth(d.getMonth() - i);
        buckets.push({
            date: d.toISOString().slice(0, 10),
            driverPts: 0, assetPts: 0, carrierPts: 0, eventCount: 0,
        });
    }

    // Index buckets by YYYY-MM for O(1) lookup.
    const idx = new Map<string, MonthlyTsPoint>();
    for (const b of buckets) idx.set(b.date.slice(0, 7), b);

    for (const v of violations) {
        const date = v?.date;
        if (!date) continue;
        const key = String(date).slice(0, 7);
        const bucket = idx.get(key);
        if (!bucket) continue;
        const pts = tsPointsForViolation(v);
        bucket.driverPts  += pts.driver;
        bucket.assetPts   += pts.asset;
        bucket.carrierPts += pts.carrier;
        bucket.eventCount += 1;
    }

    return buckets;
}

// ── Forecast types ───────────────────────────────────────────────────────

export interface ForecastPoint {
    /** Month start ISO date. */
    date: string;
    /** Carrier risk score at this month (0-100; higher = riskier here so it
     *  matches the screenshot's chart where lower-on-the-axis = safer). */
    riskScore: number;
    /** True if the value is a forecast (not history). */
    isForecast: boolean;
    /** Lower bound of the 80% prediction interval. */
    lower?: number;
    /** Upper bound of the 80% prediction interval. */
    upper?: number;
}

export interface CarrierForecast {
    points: ForecastPoint[];
    /** Most-recent observed value (history). */
    nowScore: number;
    /** Forecast value at the horizon end. */
    horizonScore: number;
    /** Forecast lower / upper at the horizon end. */
    horizonLower: number;
    horizonUpper: number;
    /** pts / month slope from the regression. */
    slope: number;
    /** Trend direction label. */
    trend: "Improving" | "Stable" | "Degrading";
    /** Goodness-of-fit (0–1). */
    rSquared: number;
    /** Residual standard deviation. */
    residualStdDev: number;
    /** Number of months of history used. */
    historyMonths: number;
    /** Confidence label drives the badge tone. */
    confidence: "Low" | "Medium" | "High";
}

/** Single explanatory factor — used by every forecast row to show why the
 *  probability came out the way it did. */
export interface ForecastFactor {
    label: string;
    /** Human-readable contribution string (e.g. "+12%", "×1.4", "+0.40 / mo"). */
    impact: string;
    /** Optional sub-detail shown in the second line (e.g. "OOS premium"). */
    detail?: string;
}

/** Per-driver crash probability forecast. */
export interface DriverCrashForecast {
    driverId: string;
    name: string;
    licenseNumber: string;
    /** Monthly event rate (accidents × 2 + serious violations × 0.5). */
    lambda: number;
    /** Probability the driver has ≥1 crash event over the forecast horizon. */
    probability: number;
    /** Risk band derived from probability. */
    band: "Low" | "Moderate" | "High" | "Critical";
    /** Underlying counts. */
    eventsLast12mo: number;
    accidentsLast12mo: number;
    oosLast12mo: number;
    /** Per-factor breakdown — drives the hover-explain popover in the UI. */
    factors: ForecastFactor[];
}

/** Per-asset maintenance probability forecast. */
export interface AssetMaintenanceForecast {
    assetId: string;
    unitNumber: string;
    make: string;
    model: string;
    year: number | string;
    /** Probability of a maintenance-driven OOS / breakdown in the horizon. */
    probability: number;
    band: "Low" | "Moderate" | "High" | "Critical";
    overdueWorkOrders: number;
    vehicleMaintViolations: number;
    daysSinceLastService: number;
    factors: ForecastFactor[];
}

/** Per-asset scorecard used by the Assets Analysis view. */
export interface AssetScorecard {
    assetId: string;
    unitNumber: string;
    plate: string;
    make: string;
    model: string;
    year: number | string;
    assetCategory: string;     // "CMV" / "Non-CMV"
    operationalStatus: string; // "Active" / "Maintenance" / "Inactive" / ...
    /** Composite 0-100 asset safety score (higher = safer). */
    overall: number;
    band: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
    /** Per-domain sub-scores (0-100, higher = safer). */
    maintenance: number;
    inspections: number;
    violations:  number;
    accidents:   number;
    vedr:        number;
    counts: {
        accidents: number;
        violations: number;
        oos: number;
        vehicleMaintViolations: number;
        overdueWorkOrders: number;
        totalWorkOrders: number;
    };
    delta30d: number;
}

/** Per-driver scorecard used by the Drivers Analysis view. */
export interface DriverScorecard {
    driverId: string;
    name: string;
    licenseNumber: string;
    status: "active" | "inactive";
    /** Composite 0-100 driver safety score (higher = safer). */
    overall: number;
    /** Risk band label (Excellent / Acceptable / Conditional / Unsatisfactory). */
    band: "Excellent" | "Good" | "Fair" | "Poor" | "Critical";
    /** Per-domain sub-scores (0-100, higher = safer). */
    accidents:   number;
    eld:         number;
    inspections: number;
    vedr:        number;
    violations:  number;
    /** Counts surfaced in the row footer / tooltip. */
    counts: {
        accidents: number;
        violations: number;
        oos: number;
        hosBreaks: number;
        vedrEvents: number;
    };
    /** 30d delta against the previous period (rough heuristic for the demo). */
    delta30d: number;
}

/** Per-violation-category breakdown used by the Violations Analysis view. */
export interface ViolationCategoryScore {
    id: string;                   // BASIC key (e.g. "vehicle_maintenance")
    label: string;                // Display label (e.g. "Vehicle Maintenance")
    score: number;                // 0–100, higher = safer
    events: number;               // # of violations in this group
    oosEvents: number;            // # of OOS in this group
    severityWeight: number;       // Σ severity × weight (used for contribution)
    contributionPct: number;      // % of total severity-weighted load
}

export interface ViolationScoreBreakdown {
    /** Composite 0–100 violation safety score (higher = safer). */
    overall: number;
    /** Total violations and OOS counts (across all categories). */
    totalEvents: number;
    totalOos: number;
    /** One entry per category that has at least one event. */
    categories: ViolationCategoryScore[];
}

/** Eight risk-domain radar — each score is 0-100 with higher = safer. */
export interface DomainRadarPoint {
    domain: "Crash" | "Unsafe Driving" | "HOS" | "Veh. Maintenance" | "Driver Fitness" | "Inspection" | "Training" | "Documents";
    score: number;
    /** Number of underlying events for this domain (used by hover tooltips). */
    events: number;
}

export interface TrendPoint {
    /** ISO start-of-month date — "2026-05-01". */
    date: string;
    /** Composite fleet score 0-100 for that month. */
    fleetScore: number;
    /** Industry benchmark for the same month (currently flat 82 for demo). */
    industryAvg: number;
}

export interface BandSpec {
    band: SafetyBand;
    min: number;
    max: number;
    /** Tailwind background utility for the colored strip. */
    bg: string;
    /** Tailwind text utility for labels rendered against that strip. */
    text: string;
    /** Stroke colour used for the donut chart at this band. */
    stroke: string;
    /** Friendly rating phrase (Conditional / Satisfactory / etc). */
    rating: string;
}

/** Color bands matching the dashboard mock. */
export const SAFETY_BANDS: BandSpec[] = [
    { band: "Very Poor", min: 0,  max: 39,  bg: "bg-red-600",    text: "text-white", stroke: "#dc2626", rating: "Unfit" },
    { band: "Poor",      min: 40, max: 49,  bg: "bg-orange-500", text: "text-white", stroke: "#f97316", rating: "Conditional" },
    { band: "Fair",      min: 50, max: 54,  bg: "bg-slate-400",  text: "text-white", stroke: "#94a3b8", rating: "Conditional" },
    { band: "Good",      min: 55, max: 69,  bg: "bg-sky-400",    text: "text-white", stroke: "#38bdf8", rating: "Satisfactory" },
    { band: "Excellent", min: 70, max: 100, bg: "bg-blue-700",   text: "text-white", stroke: "#1d4ed8", rating: "Satisfactory" },
];

export function bandForScore(score: number): BandSpec {
    const clamped = Math.max(0, Math.min(100, Math.round(score)));
    return SAFETY_BANDS.find(b => clamped >= b.min && clamped <= b.max) ?? SAFETY_BANDS[2];
}

function riskLabelForScore(score: number): ScoreCardData["riskLabel"] {
    if (score >= 70) return "Low Risk";
    if (score >= 50) return "Moderate Risk";
    return "High Risk";
}

function clamp(n: number): number {
    return Math.max(0, Math.min(100, Math.round(n)));
}

// ── Sub-score builders ─────────────────────────────────────────────────────
// Each one deducts from a clean 100 against the worst-case signal exposed by
// the underlying data.  All formulas are intentionally simple so the result
// is explainable in tooltip form ("‒8 per OOS, ‒4 per Critical, …").

function buildAccidentScore(accidents: any[], driverCount: number): ScoreCardData {
    // Carrier starts at 100. Each accident contributes a small deduction
    // weighted by severity, then time-decayed (recent events hit harder)
    // and normalised against fleet size (per-100-drivers rate).
    let deduction = 0;
    let fatal = 0;
    let preventable = 0;
    for (const a of accidents) {
        const sev = a?.severity ?? {};
        const fatalities = sev.fatalities ?? 0;
        const injuries   = sev.injuriesNonFatal ?? 0;
        const towAway    = sev.towAway ? 1 : 0;
        const hazmat     = sev.hazmatReleased ? 1 : 0;
        // Softer baseline weights so a carrier with 20+ accidents doesn't
        // pin to zero — single fatality is the worst single signal at 9.
        let perAccident = 1.5;
        perAccident += fatalities * 9;
        perAccident += injuries * 3;
        perAccident += towAway * 2;
        perAccident += hazmat * 5;
        if (a?.preventability?.isPreventable === true) {
            perAccident *= 1.4;   // preventable scales the whole event
            preventable += 1;
        }
        // Four-tier time decay: <6mo full, 6–12mo 0.6, 12–24mo 0.3, older 0.1.
        const days = Math.max(1, daysSince(a?.occurredAt));
        const recencyFactor =
            days < 180 ? 1.0 :
            days < 365 ? 0.6 :
            days < 730 ? 0.3 : 0.1;
        deduction += perAccident * recencyFactor;
        if (fatalities > 0) fatal += 1;
    }
    // Per-100-driver normalisation: a 22-driver carrier with 27 accidents is
    // ~120 accidents/100 drivers — harsh but bounded.
    const fleetScale = Math.max(10, driverCount);
    deduction = (deduction / fleetScale) * 12;
    const score = clamp(100 - deduction);
    return {
        score,
        riskLabel: riskLabelForScore(score),
        percent: score,
        contributorCount: accidents.length,
        tooltip: `${accidents.length} accident${accidents.length === 1 ? "" : "s"} on record · ${fatal} fatal · ${preventable} preventable`,
    };
}

function buildViolationScore(
    violations: any[],
    driverCount: number,
    inspectionCount: number = 0,
): { card: ScoreCardData; roadside: ScoreCardData; vedr: ScoreCardData } {
    // ── Time-decayed deduction per violation. The roadside subset is scored
    // separately on a per-100-inspection basis (the FMCSA/CVOR/NSC convention)
    // so volume of inspections doesn't unfairly pin the score to zero.
    let deduction = 0;
    let roadsideDeduction = 0;
    let vedrDeduction = 0;
    let oosCount = 0;
    let highRisk = 0;
    let moderate = 0;
    let roadsideCount = 0;
    let roadsideOos = 0;
    const vedrPool: any[] = [];
    for (const v of violations) {
        const isOos     = v?.isOos === true;
        const riskCat   = v?.driverRiskCategory ?? 3;
        const crashPct  = v?.crashLikelihood ?? 0;
        const fromInsp  = !!v?.inspectionId;
        const result    = v?.result;

        // Softer per-violation cost so a carrier with hundreds of records
        // doesn't bottom-out at zero. OOS still hurts the most.
        let perViolation = 0.4;
        if (isOos)              perViolation += 2.8;
        else if (riskCat === 1) perViolation += 1.8;
        else if (riskCat === 2) perViolation += 0.9;
        else                    perViolation += 0.3;
        perViolation += Math.min(2, Math.max(0, (crashPct - 50) / 30));

        // Recency: <6mo full · 6–12mo 0.6 · 12–24mo 0.3 · older 0.1.
        const days = Math.max(1, daysSince(v?.date));
        const recencyFactor =
            days < 180 ? 1.0 :
            days < 365 ? 0.6 :
            days < 730 ? 0.3 : 0.1;
        deduction += perViolation * recencyFactor;
        if (isOos)               oosCount += 1;
        if (riskCat === 1)       highRisk += 1;
        else if (riskCat === 2)  moderate += 1;

        const isRoadside = fromInsp || result === "Citation Issued" || result === "Warning" || result === "OOS Order";
        if (isRoadside) {
            roadsideCount += 1;
            if (isOos) roadsideOos += 1;
            // OOS contributes 3× more than a clean citation.
            roadsideDeduction += (isOos ? 3 : 1) * recencyFactor;
        }

        const grp = String(v?.violationGroup ?? "").toLowerCase();
        const isVedr = grp.includes("eld") || grp.includes("telematics") || grp.includes("video") || grp.includes("hours") || grp.includes("camera");
        if (isVedr) {
            vedrPool.push(v);
            vedrDeduction += (isOos ? 2.2 : 1.0) * recencyFactor;
        }
    }

    const fleetScale = Math.max(10, driverCount);

    // Overall violation score — per-100-driver rate.
    const score = clamp(100 - (deduction / fleetScale) * 10);

    // Roadside — per-100-inspection rate (FMCSA SMS convention). If a carrier
    // had 100 inspections and zero events, that's a perfect 100. With ~430
    // events over 200 inspections, the rate is high but capped.
    const inspScale = Math.max(20, inspectionCount);
    const roadsideRate = (roadsideDeduction / inspScale) * 100; // points / 100 inspections
    const roadsideScore = clamp(100 - roadsideRate * 0.45);

    // VEDR — per-100-driver, lighter weight because telematics fires often.
    const vedrScore = clamp(100 - (vedrDeduction / fleetScale) * 8);

    return {
        card: {
            score,
            riskLabel: riskLabelForScore(score),
            percent: score,
            contributorCount: violations.length,
            tooltip: `${violations.length} violation${violations.length === 1 ? "" : "s"} · ${oosCount} OOS · ${highRisk} high-risk · ${moderate} moderate`,
        },
        roadside: {
            score: roadsideScore,
            riskLabel: riskLabelForScore(roadsideScore),
            percent: roadsideScore,
            contributorCount: roadsideCount,
            tooltip: `${roadsideCount} roadside-issued · ${roadsideOos} OOS · ${inspectionCount} inspections`,
        },
        vedr: {
            score: vedrScore,
            riskLabel: riskLabelForScore(vedrScore),
            percent: vedrScore,
            contributorCount: vedrPool.length,
            tooltip: `${vedrPool.length} ELD / telematics / video event${vedrPool.length === 1 ? "" : "s"}`,
        },
    };
}

function buildInspectionScore(inspections: any[] | undefined): ScoreCardData {
    if (!inspections || inspections.length === 0) {
        return {
            score: 92,
            riskLabel: "Low Risk",
            percent: 92,
            contributorCount: 0,
            tooltip: "No inspections recorded yet — defaulting to baseline.",
        };
    }
    const total = inspections.length;
    const clean = inspections.filter(i => i.isClean).length;
    const oos   = inspections.filter(i => i.hasOOS).length;
    const passRate = clean / total;
    const oosRate  = oos / total;
    // 70% pass rate gives 70 score; pure clean = 100; each OOS pulls 5 more.
    const score = clamp(100 * passRate - oosRate * 30);
    return {
        score,
        riskLabel: riskLabelForScore(score),
        percent: score,
        contributorCount: total,
        tooltip: `${total} inspection${total === 1 ? "" : "s"} · ${clean} clean · ${oos} with OOS`,
    };
}

function buildDriverScore(violations: any[], accidents: any[], drivers: any[]): ScoreCardData {
    if (drivers.length === 0) {
        return { score: 92, riskLabel: "Low Risk", percent: 92, contributorCount: 0, tooltip: "No drivers on roster." };
    }
    // Each driver starts at 100, deducted by their own violations + accidents
    // with time-decay so a year-old citation doesn't anchor the score.
    const byDriverViol = new Map<string, number>();
    for (const v of violations) {
        const k = v?.driverId || v?.driverName;
        if (!k) continue;
        const days = Math.max(1, daysSince(v?.date));
        const recency =
            days < 180 ? 1.0 :
            days < 365 ? 0.6 :
            days < 730 ? 0.3 : 0.1;
        const weight = v?.isOos ? 5 : v?.driverRiskCategory === 1 ? 3 : v?.driverRiskCategory === 2 ? 2 : 1;
        byDriverViol.set(k, (byDriverViol.get(k) ?? 0) + weight * recency);
    }
    const byDriverAcc = new Map<string, number>();
    for (const a of accidents) {
        const k = a?.driver?.driverId || a?.driver?.name;
        if (!k) continue;
        const sev = a?.severity ?? {};
        const w = 4 + (sev.fatalities ?? 0) * 8 + (sev.injuriesNonFatal ?? 0) * 3 + (sev.towAway ? 2 : 0);
        const days = Math.max(1, daysSince(a?.occurredAt));
        const recency =
            days < 180 ? 1.0 :
            days < 365 ? 0.6 :
            days < 730 ? 0.3 : 0.1;
        byDriverAcc.set(k, (byDriverAcc.get(k) ?? 0) + w * recency);
    }
    let sum = 0;
    let atRisk = 0;
    for (const d of drivers) {
        const k = d.id ?? d.driverId ?? d.name;
        const deduct = (byDriverViol.get(k) ?? 0) + (byDriverAcc.get(k) ?? 0);
        const s = clamp(100 - deduct);
        if (s < 70) atRisk += 1;
        sum += s;
    }
    const score = clamp(sum / drivers.length);
    return {
        score,
        riskLabel: riskLabelForScore(score),
        percent: score,
        contributorCount: drivers.length,
        tooltip: `${drivers.length} active driver${drivers.length === 1 ? "" : "s"} · ${atRisk} below 70`,
    };
}

function buildHosScore(
    hos: ReturnType<typeof getHosForCarrier>,
    hosGroupViolations: number = 0,
    driverCount: number = 10,
): ScoreCardData {
    const daily = hos.dailyLogs ?? [];
    if (daily.length === 0 && hosGroupViolations === 0) {
        return { score: 90, riskLabel: "Low Risk", percent: 90, contributorCount: 0, tooltip: "No HOS logs in window — defaulting to baseline." };
    }
    let ruleBreaks = 0;
    let drivingOverages = 0;
    for (const log of daily) {
        const sd = log.statusDurations ?? ({} as any);
        const drivingHrs = (sd.driving ?? 0) / 3600;
        const onDutyHrs  = ((sd.onDuty ?? 0) + (sd.driving ?? 0)) / 3600;
        if (drivingHrs > 11) { ruleBreaks += 1; drivingOverages += 1; }
        if (onDutyHrs > 14)  { ruleBreaks += 1; }
    }
    // Rule-break rate (cap penalty at 60 points so a habitual-overrun carrier
    // still keeps a floor instead of bottoming-out).
    const breakRate = daily.length > 0 ? ruleBreaks / daily.length : 0;
    const ruleBreakPenalty = Math.min(60, breakRate * 80);

    // HOS-group violations layered on top, normalised per-100-driver.
    const fleetScale = Math.max(10, driverCount);
    const violationPenalty = Math.min(25, (hosGroupViolations / fleetScale) * 6);

    const score = clamp(100 - ruleBreakPenalty - violationPenalty);
    return {
        score,
        riskLabel: riskLabelForScore(score),
        percent: score,
        contributorCount: daily.length,
        tooltip: `${daily.length} daily logs · ${ruleBreaks} rule break${ruleBreaks === 1 ? "" : "s"} · ${drivingOverages} 11-hr overages · ${hosGroupViolations} HOS violations`,
    };
}

function buildMaintenanceScore(
    work: ReturnType<typeof getWorkOrdersForCarrier>,
    assetCount: number,
    vehicleViolations: any[] = [],
): ScoreCardData {
    const tasks = work?.tasks ?? [];
    const scale = Math.max(8, assetCount);

    // Work-order signal — overdue tasks hurt, completed tasks help.
    let workPenalty = 0;
    let overdue = 0;
    let completed = 0;
    if (tasks.length > 0) {
        overdue   = tasks.filter(t => t.status === "overdue").length;
        completed = tasks.filter(t => t.status === "completed").length;
        const overdueRate   = overdue / tasks.length;
        const completedRate = completed / tasks.length;
        workPenalty = overdueRate * 70 - completedRate * 6;
    }

    // Vehicle Maintenance BASIC violations layered on top (time-decayed).
    let vehPenalty = 0;
    let vmOos = 0;
    for (const v of vehicleViolations) {
        const isOos = v?.isOos === true;
        const days = Math.max(1, daysSince(v?.date));
        const recency =
            days < 180 ? 1.0 :
            days < 365 ? 0.6 :
            days < 730 ? 0.3 : 0.1;
        vehPenalty += (isOos ? 2.0 : 0.6) * recency;
        if (isOos) vmOos += 1;
    }
    // Normalise per-100-asset so larger fleets aren't punished for volume.
    vehPenalty = Math.min(40, (vehPenalty / scale) * 10);

    const score = clamp(100 - workPenalty - vehPenalty);

    return {
        score,
        riskLabel: riskLabelForScore(score),
        percent: score,
        contributorCount: tasks.length,
        tooltip: `${tasks.length} task${tasks.length === 1 ? "" : "s"} · ${overdue} overdue · ${completed} completed · ${vehicleViolations.length} vehicle-maint. violation${vehicleViolations.length === 1 ? "" : "s"}${vmOos > 0 ? ` · ${vmOos} OOS` : ""}`,
    };
}

function buildAssetScore(assets: any[], violations: any[], accidents: any[]): ScoreCardData {
    if (assets.length === 0) {
        return { score: 92, riskLabel: "Low Risk", percent: 92, contributorCount: 0, tooltip: "No assets on roster." };
    }
    // Per-asset deductions with time decay so old vehicle violations age out.
    const byAssetViol = new Map<string, number>();
    for (const v of violations) {
        const k = v?.assetId;
        if (!k) continue;
        const days = Math.max(1, daysSince(v?.date));
        const recency = days < 180 ? 1.0 : days < 365 ? 0.6 : days < 730 ? 0.3 : 0.1;
        byAssetViol.set(k, (byAssetViol.get(k) ?? 0) + (v?.isOos ? 4 : 1.5) * recency);
    }
    const byAssetAcc = new Map<string, number>();
    for (const a of accidents) {
        for (const v of a?.vehicles ?? []) {
            const k = v?.assetId;
            if (!k) continue;
            const sev = a?.severity ?? {};
            const w = 5 + (sev.fatalities ?? 0) * 6 + (sev.injuriesNonFatal ?? 0) * 2 + (sev.towAway ? 2 : 0);
            const days = Math.max(1, daysSince(a?.occurredAt));
            const recency = days < 180 ? 1.0 : days < 365 ? 0.6 : days < 730 ? 0.3 : 0.1;
            byAssetAcc.set(k, (byAssetAcc.get(k) ?? 0) + w * recency);
        }
    }
    let sum = 0;
    let atRisk = 0;
    for (const asset of assets) {
        const k = asset.id ?? asset.assetId;
        const deduct = (byAssetViol.get(k) ?? 0) + (byAssetAcc.get(k) ?? 0);
        const s = clamp(100 - deduct);
        if (s < 70) atRisk += 1;
        sum += s;
    }
    const score = clamp(sum / assets.length);
    return {
        score,
        riskLabel: riskLabelForScore(score),
        percent: score,
        contributorCount: assets.length,
        tooltip: `${assets.length} asset${assets.length === 1 ? "" : "s"} · ${atRisk} below 70`,
    };
}

// ── BASIC + CVOR breakdowns ───────────────────────────────────────────────

function categoryToBasicKey(cat: string | undefined): BasicKey | null {
    switch ((cat ?? "").toLowerCase()) {
        case "unsafe driving":              return "unsafe_driving";
        case "crash indicator":             return "crash_indicator";
        case "hours-of-service compliance": return "hos_compliance";
        case "hours of service compliance": return "hos_compliance";
        case "hos compliance":              return "hos_compliance";
        case "vehicle maintenance":         return "vehicle_maintenance";
        case "controlled substances":       return "controlled_substances";
        case "hazmat compliance":           return "hm_compliance";
        case "hm compliance":               return "hm_compliance";
        case "driver fitness":              return "driver_fitness";
        default:                            return null;
    }
}

function buildBasicBreakdown(inspections: any[] | undefined, accidents: any[]): BasicBreakdown[] {
    const insp = inspections ?? [];
    // Accumulate severity + relevant inspection counts per BASIC.
    const weightedSev: Record<BasicKey, number>      = blankBasicMap();
    const relevantInsp: Record<BasicKey, number>     = blankBasicMap();
    for (const i of insp) {
        const cats = new Set<BasicKey>();
        for (const v of i.violations ?? []) {
            const bk = categoryToBasicKey(v.category);
            if (!bk) continue;
            weightedSev[bk] += (v.severity ?? 0) * (v.weight ?? 1) + (v.oos ? 2 : 0);
            cats.add(bk);
        }
        for (const bk of cats) relevantInsp[bk] += 1;
    }
    // Crash Indicator comes from accidents rather than inspections.
    let crashWeighted = 0;
    for (const a of accidents) {
        const sev = a?.severity ?? {};
        crashWeighted += (sev.fatalities ?? 0) * 12 + (sev.injuriesNonFatal ?? 0) * 6 + (sev.towAway ? 4 : 0) + (a?.preventability?.isPreventable ? 3 : 0);
    }
    const crashCount = accidents.length;
    weightedSev.crash_indicator     = crashWeighted;
    relevantInsp.crash_indicator    = Math.max(crashCount, 0);
    const keys = Object.keys(BASIC_LABELS) as BasicKey[];
    return keys.map((bk) => {
        const measure = relevantInsp[bk] > 0 ? weightedSev[bk] / relevantInsp[bk] : weightedSev[bk];
        // Percentile model: scale measure into 0–100 using a soft curve. Higher = worse.
        const percentile = Math.min(99, Math.round(measure * 1.6));
        const threshold = BASIC_THRESHOLDS[bk];
        const hasSufficientData = relevantInsp[bk] >= 3;
        const isAlert = hasSufficientData && percentile >= threshold;
        return {
            key: bk,
            label: BASIC_LABELS[bk],
            measure: Number(measure.toFixed(2)),
            percentile,
            threshold,
            isAlert,
            hasSufficientData,
        };
    });
}

function blankBasicMap(): Record<BasicKey, number> {
    return {
        unsafe_driving: 0,
        crash_indicator: 0,
        hos_compliance: 0,
        vehicle_maintenance: 0,
        controlled_substances: 0,
        hm_compliance: 0,
        driver_fitness: 0,
    };
}

function buildCvorBreakdown(accidents: any[], violations: any[], inspections: any[] | undefined, accountId: string): CvorBreakdown {
    // Mirrors the old page's "Po = (2×Pcol + 2×Pcon + Pins) / 5" recipe but
    // computed from per-carrier accident + violation + inspection counts.
    const collisionsCount = accidents.length;
    const collisionPoints = accidents.reduce((s, a) => {
        const sev = a?.severity ?? {};
        return s + (sev.fatalities ? 6 : 0) + (sev.injuriesNonFatal ? 3 : 0) + (sev.towAway ? 2 : 0) + 1;
    }, 0);
    const convictionsCount = violations.filter((v: any) => v.result === "Citation Issued" || v.convictionDate).length;
    const convictionPoints = violations.reduce((s, v) => s + (v.isOos ? 4 : v.driverRiskCategory === 1 ? 3 : v.driverRiskCategory === 2 ? 2 : 1), 0);
    const insp = inspections ?? [];
    const oosShare = insp.length > 0 ? insp.filter((i: any) => i.hasOOS).length / insp.length : 0;
    // Each bucket: raw % "of threshold used". Scale counts to a 0..100 range.
    const colRaw = Math.min(100, collisionPoints * 4);
    const conRaw = Math.min(100, convictionPoints * 2.5);
    const insRaw = Math.min(100, oosShare * 100 + insp.length * 0.6);
    const colWeighted = colRaw * 0.4;
    const conWeighted = conRaw * 0.4;
    const insWeighted = insRaw * 0.2;
    const rating = Math.min(100, (2 * colRaw + 2 * conRaw + insRaw) / 5);
    const label: CvorBreakdown["label"] =
        rating < 25 ? "Excellent" :
        rating < 40 ? "Satisfactory" :
        rating < 75 ? "Conditional" : "Unsatisfactory";
    // Synthetic CVOR no. — stable per carrier so the UI shows a real number.
    const cvorNumber = `CVOR-${(hashLite(accountId) % 9000000 + 1000000).toString()}`;

    // ── MTO action bands ────────────────────────────────────────────────
    const thresholds = { warn: 35, audit: 50, showCause: 85, seizure: 100 };
    const cvorBandFor = (raw: number): "OK" | "WARN" | "AUDIT" | "SHOW_CAUSE" =>
        raw >= thresholds.showCause ? "SHOW_CAUSE" :
        raw >= thresholds.audit     ? "AUDIT" :
        raw >= thresholds.warn      ? "WARN" : "OK";
    const overallBand: CvorBreakdown["band"] =
        rating >= thresholds.seizure   ? "SEIZURE" :
        rating >= thresholds.showCause ? "SHOW_CAUSE" :
        rating >= thresholds.audit     ? "AUDIT" :
        rating >= thresholds.warn      ? "WARN" : "OK";

    // ── Out-of-service rates (Ontario MTO surfaces these on the abstract) ─
    const vehicleOosCount = insp.filter((i: any) => i.oosSummary?.vehicle === "FAILED").length;
    const driverOosCount  = insp.filter((i: any) => i.oosSummary?.driver  === "FAILED").length;
    const overallOosRate  = oosShare * 100;
    const vehicleOosRate  = insp.length > 0 ? (vehicleOosCount / insp.length) * 100 : 0;
    const driverOosRate   = insp.length > 0 ? (driverOosCount  / insp.length) * 100 : 0;
    const oos = {
        overall: { rate: Number(overallOosRate.toFixed(1)), threshold: 30, band: (overallOosRate > 30 ? "OVER" : "OK") as "OK" | "OVER" },
        vehicle: { rate: Number(vehicleOosRate.toFixed(1)), threshold: 25, band: (vehicleOosRate > 25 ? "OVER" : "OK") as "OK" | "OVER" },
        driver:  { rate: Number(driverOosRate.toFixed(1)),  threshold: 10, band: (driverOosRate  > 10 ? "OVER" : "OK") as "OK" | "OVER" },
    };

    // ── Profile period (24-month rolling, ending today) ─────────────────
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setMonth(fromDate.getMonth() - 24);
    const period = {
        from: fromDate.toISOString().slice(0, 10),
        to:   today.toISOString().slice(0, 10),
    };

    return {
        rating: Number(rating.toFixed(2)),
        label,
        cvorNumber,
        band: overallBand,
        thresholds,
        collisions:  { raw: Number(colRaw.toFixed(1)), weighted: Number(colWeighted.toFixed(2)), count: collisionsCount, points: collisionPoints, band: cvorBandFor(colRaw) },
        convictions: { raw: Number(conRaw.toFixed(1)), weighted: Number(conWeighted.toFixed(2)), count: convictionsCount, points: convictionPoints, band: cvorBandFor(conRaw) },
        inspections: { raw: Number(insRaw.toFixed(1)), weighted: Number(insWeighted.toFixed(2)), count: insp.length, oosRate: Number((oosShare * 100).toFixed(1)), band: cvorBandFor(insRaw) },
        oos,
        period,
    };
}

function inferNscProvince(identity: CarrierIdentity): string {
    // NSC numbers are prefixed with the issuing province (e.g. AB-55410, ON-11234).
    const prefix = identity.nscNumber.split("-")[0]?.toUpperCase() ?? "";
    const known = ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU"];
    if (known.includes(prefix)) return prefix;
    // Fallback: carrier's home province if it lives in Canada.
    if (identity.country === "CA" && identity.stateOrProvince) return identity.stateOrProvince;
    return "ON";
}

function buildNscBreakdown(
    accidents: any[],
    violations: any[],
    inspections: any[] | undefined,
    identity: CarrierIdentity,
    driverCount: number,
    nscNo: string,
): NscBreakdown {
    // Provincial NSC carriers track three event types tied to the carrier's
    // National Safety Code abstract: collisions, convictions, and roadside
    // inspections. Each province has its own scoring model — Alberta uses
    // R-Factor decimals, BC uses a Profile Score, PEI uses Schedule 3 point
    // totals, and Nova Scotia uses an indexed demerit against a Level-3 cap.
    //
    // We compute the shared rating + counts (used by the KPI cards) and one
    // province-specific payload (used by the dedicated Regulatory card).
    const province = nscProvinceFromNumber(nscNo) || inferNscProvince(identity);
    const inProvince = (loc: any): boolean => {
        const v = String(loc ?? "").toUpperCase();
        return v === province;
    };
    const provAccidents  = accidents.filter(a => inProvince(a?.location?.stateOrProvince));
    const provViolations = violations.filter(v => inProvince(v?.locationState));
    const provInspections = (inspections ?? []).filter((i: any) => inProvince(i?.state) || inProvince(i?.location?.province));

    const collisionsCount  = provAccidents.length;
    const convictionsCount = provViolations.filter(v => v.result === "Citation Issued" || v.convictionDate).length;
    const oosCount = provInspections.filter((i: any) => i.hasOOS).length;
    const oosRate  = provInspections.length > 0 ? (oosCount / provInspections.length) * 100 : 0;
    const driverScale = Math.max(driverCount, 8);
    const colRate = (collisionsCount / driverScale) * 100;
    const conRate = (convictionsCount / driverScale) * 100;
    const colScore = clamp(100 - colRate * 5);
    const conScore = clamp(100 - conRate * 1.5);
    const insScore = clamp(100 - oosRate * 1.8);
    const rating = clamp(colScore * 0.4 + conScore * 0.4 + insScore * 0.2);
    const label: NscBreakdown["label"] =
        rating >= 80 ? "Excellent" :
        rating >= 65 ? "Satisfactory" :
        rating >= 50 ? "Conditional" : "Unsatisfactory";

    // Shared profile (fleet bucket — used in every provincial card header).
    const profile = {
        legalName:    identity.legalName,
        fleetSize:    driverCount,
        fleetClass:   fleetClassFor(driverCount),
        lastPullDate: new Date().toISOString().slice(0, 10),
    };

    // Province-specific payloads — only one is populated per breakdown.
    let ab: AbRFactor | undefined;
    let bc: BcProfile | undefined;
    let pe: PeiPoints | undefined;
    let ns: NsIndexedDemerit | undefined;

    if (province === "AB") {
        ab = buildAbRFactor(provAccidents, provViolations, provInspections, profile.fleetClass);
    } else if (province === "BC") {
        bc = buildBcProfile(provAccidents, provViolations, provInspections);
    } else if (province === "PE") {
        pe = buildPeiPoints(provAccidents, provViolations, provInspections);
    } else if (province === "NS") {
        ns = buildNsIndexedDemerit(provAccidents, provViolations, provInspections);
    }

    return {
        province,
        rating,
        label,
        nscNumber: nscNo,
        collisions:  { count: collisionsCount,  rate: Number(colRate.toFixed(1)) },
        convictions: { count: convictionsCount, rate: Number(conRate.toFixed(1)) },
        inspections: { count: provInspections.length, oosRate: Number(oosRate.toFixed(1)) },
        profile,
        ab, bc, pe, ns,
    };
}

// ── Fleet-class buckets (used by Alberta R-Factor thresholds) ────────────
function fleetClassFor(fleetSize: number): string {
    if (fleetSize < 5)     return "0.0-4.9";
    if (fleetSize < 15)    return "5.0-14.9";
    if (fleetSize < 30)    return "15.0-29.9";
    if (fleetSize < 45)    return "30.0-44.9";
    if (fleetSize < 75)    return "45.0-74.9";
    if (fleetSize < 150)   return "75.0-149.9";
    return "150.0+";
}

function levelForPct(pct: number): ContributionLevel {
    if (pct >= 70) return "HIGH";
    if (pct >= 30) return "MODERATE";
    if (pct > 0)   return "LOW";
    return "NONE";
}

// ── Alberta — R-Factor builder ────────────────────────────────────────────
function buildAbRFactor(accidents: any[], violations: any[], inspections: any[], fleetClass: string): AbRFactor {
    // Alberta R-Factor: small decimal where lower = safer. Each contribution
    // type (convictions, admin penalties, CVSA inspections, reportable
    // collisions) adds a fractional value to the total R-Factor.
    const convCount = violations.filter(v => v.result === "Citation Issued" || v.convictionDate).length;
    const apCount   = violations.filter(v => /admin/i.test(v.result ?? "") || /penalty/i.test(v.charge ?? "")).length;
    const cvsaCount = inspections.length;
    const colCount  = accidents.length;

    const convVal = convCount * 0.018;
    const apVal   = apCount   * 0.014;
    const cvsaVal = cvsaCount * 0.004;
    const colVal  = colCount  * 0.022;
    const rFactor = +(convVal + apVal + cvsaVal + colVal).toFixed(3);

    // Fleet-class threshold matrix (mirrors Alberta MTS R-Factor schedule).
    const matrix: Record<string, AbRFactor["thresholds"]> = {
        "0.0-4.9":     { stage1: 1.200, stage2: 1.700, stage3: 2.400, stage4: 3.100 },
        "5.0-14.9":    { stage1: 0.700, stage2: 1.000, stage3: 1.400, stage4: 1.800 },
        "15.0-29.9":   { stage1: 0.500, stage2: 0.730, stage3: 1.000, stage4: 1.300 },
        "30.0-44.9":   { stage1: 0.420, stage2: 0.618, stage3: 0.850, stage4: 1.105 },
        "45.0-74.9":   { stage1: 0.380, stage2: 0.560, stage3: 0.760, stage4: 0.990 },
        "75.0-149.9":  { stage1: 0.320, stage2: 0.470, stage3: 0.640, stage4: 0.830 },
        "150.0+":      { stage1: 0.260, stage2: 0.380, stage3: 0.520, stage4: 0.680 },
    };
    const thresholds = matrix[fleetClass] ?? matrix["30.0-44.9"];

    const stage: AbRFactor["stage"] =
        rFactor >= thresholds.stage4 ? "STAGE_4" :
        rFactor >= thresholds.stage3 ? "STAGE_3" :
        rFactor >= thresholds.stage2 ? "STAGE_2" :
        rFactor >= thresholds.stage1 ? "STAGE_1" : "NOT_MONITORED";

    const mkBucket = (label: string, value: number): AbBucket => {
        const pct = rFactor > 0 ? (value / rFactor) * 100 : 0;
        return {
            label,
            pctOfRFactor: Number(pct.toFixed(1)),
            events: label === "Convictions" ? convCount
                  : label === "Admin Penalties" ? apCount
                  : label === "CVSA Inspections" ? cvsaCount
                  : colCount,
            impact: Number(pct.toFixed(1)),
            level: levelForPct(pct),
        };
    };

    return {
        rFactor,
        stage,
        thresholds,
        contributions: {
            convictions:          mkBucket("Convictions",          convVal),
            adminPenalties:       mkBucket("Admin Penalties",      apVal),
            cvsaInspections:      mkBucket("CVSA Inspections",     cvsaVal),
            reportableCollisions: mkBucket("Reportable Collisions", colVal),
        },
    };
}

// ── British Columbia — Profile Score builder ─────────────────────────────
function buildBcProfile(accidents: any[], violations: any[], inspections: any[]): BcProfile {
    const contraventions = violations.length;
    const oosCount = inspections.filter((i: any) => i.hasOOS).length;
    const accidentsCount = accidents.length;

    const contraventionsScore = +(contraventions * 0.06).toFixed(2);
    const cvsaScore           = +(oosCount       * 0.12).toFixed(2);
    const accidentsScore      = +(accidentsCount * 0.18).toFixed(2);
    const profileScore        = +(contraventionsScore + cvsaScore + accidentsScore).toFixed(3);

    // BC thresholds — satisfactory ≤ 2.13, conditional 2.14–3.64, ≥ 3.65 unsatisfactory.
    const thresholds = { satisfactory: 2.13, conditional: 3.64, unsatisfactory: 3.65 };
    const profileStatus: BcProfile["profileStatus"] =
        profileScore >= thresholds.unsatisfactory ? "Unsatisfactory" :
        profileScore >  thresholds.satisfactory   ? "Conditional"   : "Satisfactory";

    const totalScore = Math.max(profileScore, 0.01);
    const mkBucket = (label: string, score: number, events: number): BcBucket => {
        const impact = (score / totalScore) * 100;
        return {
            label,
            score: Number(score.toFixed(2)),
            events,
            impactPct: Number(impact.toFixed(1)),
            profileBand: score <= thresholds.satisfactory ? "SATISFACTORY" : score < thresholds.unsatisfactory ? "CONDITIONAL" : "HIGH",
        };
    };

    return {
        certificateStatus: "Active",
        safetyRating:      "Satisfactory - Unaudited",
        profileStatus,
        auditStatus:       "Unaudited",
        profileScore,
        thresholds,
        contributions: {
            contraventions:   mkBucket("Contraventions",       contraventionsScore, contraventions),
            cvsaOutOfService: mkBucket("CVSA (Out of Service)", cvsaScore,           oosCount),
            accidents:        mkBucket("Accidents",            accidentsScore,      accidentsCount),
        },
    };
}

// ── Prince Edward Island — Schedule 3 points builder ─────────────────────
function buildPeiPoints(accidents: any[], violations: any[], inspections: any[]): PeiPoints {
    const colPts = accidents.reduce((s, a) => {
        const sev = a?.severity ?? {};
        return s + (sev.fatalities ? 4 : 0) + (sev.injuriesNonFatal ? 2 : 0) + (sev.towAway ? 1 : 0) + 1;
    }, 0);
    const conPts = violations.reduce((s, v) => s + (v.isOos ? 3 : v.driverRiskCategory === 1 ? 2 : 1), 0);
    const insPts = inspections.reduce((s, i: any) => s + (i.hasOOS ? 3 : i.isClean ? 0 : 1), 0);

    const points    = colPts + conPts + insPts;
    const maxPoints = 55;
    const pctOfMax  = (points / maxPoints) * 100;

    // PEI thresholds — PEI MTPI Schedule 3 escalation levels.
    const thresholds = { advisory: 14, warning: 33, interview: 47, sanction: 55 };
    const band: PeiPoints["band"] =
        points >= thresholds.sanction  ? "SANCTION" :
        points >= thresholds.interview ? "INTERVIEW" :
        points >= thresholds.warning   ? "WARNING" :
        points >= thresholds.advisory  ? "ADVISORY" : "SAFE";

    const totalPts = Math.max(points, 1);
    const mkBucket = (label: string, p: number): PeiBucket => ({
        label,
        points: p,
        pctOfMax:   Number(((p / maxPoints) * 100).toFixed(1)),
        pctOfTotal: Number(((p / totalPts) * 100).toFixed(1)),
        level: levelForPct((p / totalPts) * 100),
    });

    return {
        points,
        maxPoints,
        pctOfMax: Number(pctOfMax.toFixed(1)),
        band,
        thresholds,
        buckets: {
            collisionPoints:  mkBucket("Collision Points",  colPts),
            convictionPoints: mkBucket("Conviction Points", conPts),
            inspectionPoints: mkBucket("Inspection Points", insPts),
        },
    };
}

// ── Nova Scotia — Indexed Demerit builder ────────────────────────────────
function buildNsIndexedDemerit(accidents: any[], violations: any[], inspections: any[]): NsIndexedDemerit {
    const convScore = +(violations.reduce((s, v) => s + (v.isOos ? 1.4 : v.driverRiskCategory === 1 ? 1.0 : 0.4), 0)).toFixed(4);
    const insScore  = +(inspections.reduce((s, i: any) => s + (i.hasOOS ? 1.5 : i.isClean ? 0 : 0.6), 0)).toFixed(4);
    const colScore  = +(accidents.reduce((s, a) => {
        const sev = a?.severity ?? {};
        return s + (sev.fatalities ? 4 : 0) + (sev.injuriesNonFatal ? 2 : 0) + (sev.towAway ? 0.8 : 0) + 0.4;
    }, 0)).toFixed(4);

    const indexedScore = +(convScore + insScore + colScore).toFixed(4);
    const levelCap     = 60.1836;
    const pctOfCap     = (indexedScore / levelCap) * 100;

    const thresholds = { moderate: 39.7531, high: 45.9602, critical: 60.1836 };
    const band: NsIndexedDemerit["band"] =
        indexedScore >= thresholds.critical ? "CRITICAL" :
        indexedScore >= thresholds.high     ? "HIGH" :
        indexedScore >= thresholds.moderate ? "MODERATE" : "LOW";

    const total = Math.max(indexedScore, 0.0001);
    const mkBucket = (label: string, score: number): NsBucket => ({
        label,
        score: Number(score.toFixed(4)),
        pctOfCap:   Number(((score / levelCap) * 100).toFixed(1)),
        pctOfTotal: Number(((score / total) * 100).toFixed(1)),
        level: levelForPct((score / total) * 100),
    });

    return {
        indexedScore,
        levelCap,
        pctOfCap: Number(pctOfCap.toFixed(1)),
        band,
        thresholds,
        breakdown: {
            convictions: mkBucket("Convictions", convScore),
            inspections: mkBucket("Inspections", insScore),
            collisions:  mkBucket("Collisions",  colScore),
        },
    };
}

function nscProvinceFromNumber(nscNo: string): string {
    const prefix = nscNo.split("-")[0]?.toUpperCase() ?? "";
    const known = ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU"];
    return known.includes(prefix) ? prefix : "";
}

function hashLite(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
    return Math.abs(h);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysSince(isoOrDate: string | undefined): number {
    if (!isoOrDate) return 9999;
    const t = new Date(isoOrDate).getTime();
    if (Number.isNaN(t)) return 9999;
    return Math.max(0, Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24)));
}

// ── Public entry point ─────────────────────────────────────────────────────

export function computeFleetSafetyScore(accountId: string | undefined): FleetSafetyScore {
    const id = accountId ?? "acct-001";
    const accidents   = getAccidentsForCarrier(id);
    const violations  = getViolationsForCarrier(id);
    const inspections = getInspectionsForCarrier(id);
    const hos         = getHosForCarrier(id);
    const work        = getWorkOrdersForCarrier(id);
    const drivers     = CARRIER_DRIVERS[id] ?? [];
    const assets      = CARRIER_ASSETS[id] ?? [];
    const cmvAssets   = assets.filter((a: any) => (a.assetCategory ?? "").toUpperCase() === "CMV");

    const inspectionCount = (inspections ?? []).length;
    const hosGroupViolations = violations.filter((v: any) => {
        const g = String(v?.violationGroup ?? "").toLowerCase();
        return g.includes("hours") || g.includes("hos") || g.includes("eld") || g.includes("logbook");
    });
    const vehMaintViolations = violations.filter((v: any) => {
        const g = String(v?.violationGroup ?? "").toLowerCase();
        return g.includes("vehicle") || g.includes("maint") || g.includes("brake") || g.includes("light") || g.includes("tire");
    });

    const accidentCard    = buildAccidentScore(accidents, drivers.length);
    const violationBundle = buildViolationScore(violations, drivers.length, inspectionCount);
    const inspectionCard  = buildInspectionScore(inspections);
    const driverCard      = buildDriverScore(violations, accidents, drivers);
    const eldCard         = buildHosScore(hos, hosGroupViolations.length, drivers.length);
    const maintenanceCard = buildMaintenanceScore(work, assets.length, vehMaintViolations);
    const assetCard       = buildAssetScore(assets, violations, accidents);

    // Weighted composite. Weights total 100. Tuned to the SMS intent.
    const overall = clamp(
        accidentCard.score    * 0.18 +
        violationBundle.card.score * 0.18 +
        inspectionCard.score  * 0.14 +
        eldCard.score         * 0.14 +
        driverCard.score      * 0.12 +
        violationBundle.roadside.score * 0.08 +
        violationBundle.vedr.score     * 0.06 +
        maintenanceCard.score * 0.06 +
        assetCard.score       * 0.04,
    );

    const oosCount = violations.filter((v: any) => v.isOos).length;
    const hosViolationCount = hos.dailyLogs.filter(l => {
        const drv = (l.statusDurations?.driving ?? 0) / 3600;
        const onDuty = ((l.statusDurations?.onDuty ?? 0) + (l.statusDurations?.driving ?? 0)) / 3600;
        return drv > 11 || onDuty > 14;
    }).length;
    const overdueWoCount = (work?.tasks ?? []).filter(t => t.status === "overdue").length;

    const basics = buildBasicBreakdown(inspections, accidents);
    const cvor   = buildCvorBreakdown(accidents, violations, inspections, id);

    // ── Carrier identity + regime detection ─────────────────────────────
    const account = ACCOUNTS_DB.find(a => a.id === id);
    const allNscs: string[] = (() => {
        const seen = new Set<string>();
        if (account?.nscNumber) seen.add(account.nscNumber);
        for (const n of account?.nscNumbers ?? []) if (n) seen.add(n);
        return Array.from(seen);
    })();
    const identity: CarrierIdentity = {
        legalName:       account?.legalName ?? "Unknown Carrier",
        country:         (account?.country ?? "US") as "US" | "CA",
        stateOrProvince: account?.state ?? "",
        dotNumber:       account?.dotNumber ?? "",
        cvorNumber:      account?.cvorNumber ?? "",
        nscNumber:       account?.nscNumber ?? "",
        nscNumbers:      allNscs,
    };
    // Regime applies whenever the carrier holds the matching registration —
    // cross-border carriers can hold all three (USDOT + CVOR + NSC).
    const regimes: CarrierRegimes = {
        fmcsa: !!identity.dotNumber,
        cvor:  !!identity.cvorNumber,
        nsc:   identity.nscNumbers.length > 0,
    };
    // One breakdown per NSC abstract — each filtered to its issuing province
    // so events counted in Alberta don't bleed into the British Columbia card.
    const nscs: NscBreakdown[] = identity.nscNumbers.map(nscNo =>
        buildNscBreakdown(accidents, violations, inspections, identity, drivers.length, nscNo),
    );

    const openCaseCount = violations.filter((v: any) => v.status === "Open" || v.status === "Under Review").length
                         + accidents.filter((a: any) => {
                            const s = (a?.status?.value ?? "").toLowerCase();
                            return s === "open" || s === "active" || s === "review";
                         }).length;
    const cleanInspectionCount = (inspections ?? []).filter((i: any) => i.isClean).length;
    const cleanInspectionRate  = inspections && inspections.length > 0
        ? Math.round((cleanInspectionCount / inspections.length) * 100)
        : 0;
    const oosPer100Insp = inspections && inspections.length > 0
        ? Number(((oosCount / inspections.length) * 100).toFixed(2))
        : 0;
    // SMS Score: average of (100 − percentile) across the seven BASICs, so
    // higher = safer (lower SMS percentile is the FMCSA "good" direction).
    const smsScore = basics.length > 0
        ? clamp(basics.reduce((s, b) => s + (100 - b.percentile), 0) / basics.length)
        : 90;

    // Synthetic prior period (30d back) so the period-delta column has movement.
    const components: ComponentBreakdown[] = [
        { label: "Accidents",     score: accidentCard.score,          prev: Math.max(0, accidentCard.score - 4),         color: "bg-red-500" },
        { label: "ELD / HOS",     score: eldCard.score,               prev: Math.max(0, eldCard.score + 2),              color: "bg-amber-500" },
        { label: "Inspections",   score: inspectionCard.score,        prev: Math.max(0, inspectionCard.score - 1.5),     color: "bg-blue-500" },
        { label: "Violations",    score: violationBundle.card.score,  prev: Math.max(0, violationBundle.card.score + 0.5),color: "bg-purple-500" },
        { label: "Camera / VEDR", score: violationBundle.vedr.score,  prev: Math.max(0, violationBundle.vedr.score - 3), color: "bg-teal-500" },
        { label: "Training",      score: maintenanceCard.score,       prev: maintenanceCard.score,                       color: "bg-slate-500" },
    ];

    return {
        overall,
        band: bandForScore(overall).band,
        signals: {
            accidentCount: accidents.length,
            violationCount: violations.length,
            inspectionCount: (inspections ?? []).length,
            oosCount,
            hosLogCount: hos.dailyLogs.length,
            hosViolationCount,
            workOrderCount: (work?.tasks ?? []).length,
            overdueWoCount,
            driverCount: drivers.length,
            assetCount: assets.length,
            cmvCount: cmvAssets.length,
            openCaseCount,
            cleanInspectionCount,
            cleanInspectionRate,
            oosPer100Insp,
            smsScore,
        },
        cards: {
            accident: accidentCard,
            eld: eldCard,
            inspection: inspectionCard,
            driver: driverCard,
            vedr: violationBundle.vedr,
            roadsideViolation: violationBundle.roadside,
            maintenance: maintenanceCard,
            asset: assetCard,
        },
        basics,
        cvor,
        nscs,
        components,
        regimes,
        identity,
    };
}

// ── Historical trend ─────────────────────────────────────────────────────
// Compute month-by-month fleet score for the given carrier. Each month bucket
// re-uses the same weighted formula but filters accidents/violations/HOS to
// events that occurred within that calendar month. The industry average is a
// constant 82 placeholder so the chart has a stable reference line.

// ── Eight-domain radar ────────────────────────────────────────────────────
// Higher = safer for every domain. Scores derive from the same carrier-scoped
// data sources the rest of the dashboard uses (accidents, violations, HOS,
// inspections, work orders) so the radar moves in lock-step with the cards.

export function computeDomainRadar(accountId: string | undefined): DomainRadarPoint[] {
    const id = accountId ?? "acct-001";
    const accidents   = getAccidentsForCarrier(id);
    const violations  = getViolationsForCarrier(id);
    const inspections = getInspectionsForCarrier(id) ?? [];
    const hos         = getHosForCarrier(id);
    const work        = getWorkOrdersForCarrier(id);
    const drivers     = CARRIER_DRIVERS[id] ?? [];
    const assets      = CARRIER_ASSETS[id] ?? [];

    const fleetScale = Math.max(8, drivers.length);

    // Helper: severity-weighted deduction per BASIC group with normalisation.
    const groupDeduction = (groupMatcher: (g: string) => boolean) => {
        const rows = violations.filter(v => groupMatcher(String(v?.violationGroup ?? "").toLowerCase()));
        const raw  = rows.reduce((s, v) => s
            + (v.isOos ? 7 : 0)
            + (v.driverRiskCategory === 1 ? 5 : v.driverRiskCategory === 2 ? 3 : 1),
        0);
        return { score: clamp(100 - raw * (10 / fleetScale)), events: rows.length };
    };

    // Crash domain — derived from the existing accident score logic.
    const crashCard = buildAccidentScore(accidents, drivers.length);

    const unsafe     = groupDeduction(g => g.includes("unsafe") || g.includes("speed"));
    const hosDom     = groupDeduction(g => g.includes("hours") || g.includes("hos") || g.includes("eld") || g.includes("logbook"));
    const vehMaint   = groupDeduction(g => g.includes("vehicle") || g.includes("maint") || g.includes("brake") || g.includes("light") || g.includes("tire"));
    const driverFit  = groupDeduction(g => g.includes("driver fitness") || g.includes("license") || g.includes("medical") || g.includes("qualif"));

    // HOS — blend the violation-group score with the rule-break score.
    const eldCard = buildHosScore(hos, hosDom.events, drivers.length);
    const hosScore = clamp(hosDom.score * 0.4 + eldCard.score * 0.6);
    const hosEvents = hosDom.events + hos.dailyLogs.filter(l => {
        const drv = (l.statusDurations?.driving ?? 0) / 3600;
        const onD = ((l.statusDurations?.onDuty ?? 0) + (l.statusDurations?.driving ?? 0)) / 3600;
        return drv > 11 || onD > 14;
    }).length;

    // Veh. Maintenance — blend with overdue work orders + maintenance card.
    const maintCard = buildMaintenanceScore(work, assets.length);
    const vehScore = clamp(vehMaint.score * 0.6 + maintCard.score * 0.4);
    const vehEvents = vehMaint.events + (work?.tasks ?? []).filter(t => t.status === "overdue").length;

    // Inspection — pass rate from inspections.
    const inspCard = buildInspectionScore(inspections);
    const inspEvents = inspections.length;

    // Training — proxy from driver score (lower-score drivers usually = lower training compliance).
    const trainEvents = drivers.length;
    const driverCard  = buildDriverScore(violations, accidents, drivers);
    // Documents — proxy from regulatory paperwork density; high when conviction-paperwork
    // is present on every citation, lower when paperwork is missing.
    const citationCount = violations.filter(v => v.result === "Citation Issued" || v.result === "OOS Order").length;
    const paperworkOk   = violations.filter(v => v.convictionNumber || v.docketNumber).length;
    const docScore = citationCount > 0
        ? clamp((paperworkOk / citationCount) * 100)
        : 92;

    return [
        { domain: "Crash",            score: crashCard.score, events: accidents.length },
        { domain: "Unsafe Driving",   score: unsafe.score,    events: unsafe.events    },
        { domain: "HOS",              score: hosScore,        events: hosEvents        },
        { domain: "Veh. Maintenance", score: vehScore,        events: vehEvents        },
        { domain: "Driver Fitness",   score: driverFit.score, events: driverFit.events },
        { domain: "Inspection",       score: inspCard.score,  events: inspEvents       },
        { domain: "Training",         score: driverCard.score,events: trainEvents      },
        { domain: "Documents",        score: docScore,        events: citationCount    },
    ];
}

export function computeFleetScoreTrend(accountId: string | undefined, months: number = 12): TrendPoint[] {
    const id = accountId ?? "acct-001";
    const accidents  = getAccidentsForCarrier(id);
    const violations = getViolationsForCarrier(id);
    const hos        = getHosForCarrier(id);
    const drivers    = CARRIER_DRIVERS[id] ?? [];
    const assets     = CARRIER_ASSETS[id] ?? [];

    const points: TrendPoint[] = [];
    const today = new Date();
    today.setDate(1);
    today.setHours(0, 0, 0, 0);

    for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date(today);
        monthStart.setMonth(monthStart.getMonth() - i);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const inMonth = (iso: string | undefined): boolean => {
            if (!iso) return false;
            const t = new Date(iso).getTime();
            return t >= monthStart.getTime() && t < monthEnd.getTime();
        };

        const ma = accidents.filter(a => inMonth(a?.occurredAt));
        const mv = violations.filter(v => inMonth(v?.date));
        const mh = hos.dailyLogs.filter(l => inMonth(l.date));

        const hosGroupCount   = mv.filter((v: any) => {
            const g = String(v?.violationGroup ?? "").toLowerCase();
            return g.includes("hours") || g.includes("hos") || g.includes("eld") || g.includes("logbook");
        }).length;
        const accidentCard    = buildAccidentScore(ma, drivers.length);
        const violationBundle = buildViolationScore(mv, drivers.length, 0);
        const eldCard         = buildHosScore({ dailyLogs: mh, statusLogs: [], trips: [] } as any, hosGroupCount, drivers.length);
        const driverCard      = buildDriverScore(mv, ma, drivers);
        const assetCard       = buildAssetScore(assets, mv, ma);
        const overall = clamp(
            accidentCard.score             * 0.22 +
            violationBundle.card.score     * 0.22 +
            eldCard.score                  * 0.16 +
            driverCard.score               * 0.14 +
            violationBundle.roadside.score * 0.10 +
            violationBundle.vedr.score     * 0.08 +
            assetCard.score                * 0.08,
        );

        points.push({
            date: monthStart.toISOString().slice(0, 10),
            fleetScore: overall,
            industryAvg: 82,
        });
    }
    return points;
}

// ── Per-violation-category breakdown ─────────────────────────────────────
// Buckets the carrier's violations into the FMCSA SMS BASIC categories and
// computes a 0–100 safety score per category (higher = safer). The overall
// score is a severity-weighted average across categories so each bucket's
// contribution to the headline number is transparent.

interface CategoryDef { id: string; label: string; matches: (group: string) => boolean }

const VIOLATION_CATEGORY_DEFS: CategoryDef[] = [
    { id: "vehicle_maintenance",   label: "Vehicle Maintenance",         matches: g => g.includes("vehicle") || g.includes("maint") || g.includes("brake") || g.includes("light") || g.includes("tire") },
    { id: "unsafe_driving",        label: "Unsafe Driving",              matches: g => g.includes("unsafe") || g.includes("speed") || g.includes("reckless") || g.includes("seat belt") },
    { id: "hos_compliance",        label: "Hours-of-service Compliance", matches: g => g.includes("hours") || g.includes("hos") || g.includes("eld") || g.includes("logbook") },
    { id: "driver_fitness",        label: "Driver Fitness",              matches: g => g.includes("driver fitness") || g.includes("license") || g.includes("medical") || g.includes("qualif") },
    { id: "controlled_substances", label: "Controlled Substances",       matches: g => g.includes("controlled") || g.includes("alcohol") || g.includes("substance") || g.includes("drug") },
    { id: "hm_compliance",         label: "Hazmat Compliance",           matches: g => g.includes("hazmat") || g.includes("hm ") || g.includes("hazardous") || g.includes("placard") },
    { id: "crash_indicator",       label: "Crash Indicator",             matches: g => g.includes("crash") || g.includes("collision") },
];

export function computeViolationScoreBreakdown(accountId: string | undefined): ViolationScoreBreakdown {
    const id = accountId ?? "acct-001";
    const violations = getViolationsForCarrier(id);
    const drivers = CARRIER_DRIVERS[id] ?? [];
    const fleetScale = Math.max(10, drivers.length);

    const totalEvents = violations.length;
    const totalOos = violations.filter(v => v.isOos).length;

    // Bucket each violation into the first matching category; uncategorised
    // rows fall into a synthetic "Other" bucket.
    const byCat: Record<string, any[]> = {};
    const otherKey = "other";
    for (const v of violations) {
        const grp = String(v?.violationGroup ?? "").toLowerCase();
        const match = VIOLATION_CATEGORY_DEFS.find(d => d.matches(grp));
        const k = match?.id ?? otherKey;
        (byCat[k] ??= []).push(v);
    }

    // Per-category severity-weighted load (used for both score + contribution).
    const computeLoad = (rows: any[]): { load: number; oos: number } => {
        let load = 0; let oos = 0;
        for (const v of rows) {
            const isOos = v?.isOos === true;
            const riskCat = v?.driverRiskCategory ?? 3;
            const weight =
                isOos ? 3.0 :
                riskCat === 1 ? 2.0 :
                riskCat === 2 ? 1.0 : 0.4;
            const days = Math.max(1, Math.floor((Date.now() - new Date(v?.date ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
            const recency = days < 180 ? 1.0 : days < 365 ? 0.6 : days < 730 ? 0.3 : 0.1;
            load += weight * recency;
            if (isOos) oos += 1;
        }
        return { load, oos };
    };

    const catEntries: { def: CategoryDef; load: number; oos: number; rows: any[] }[] = [];
    for (const def of VIOLATION_CATEGORY_DEFS) {
        const rows = byCat[def.id] ?? [];
        if (rows.length === 0) continue;
        const { load, oos } = computeLoad(rows);
        catEntries.push({ def, load, oos, rows });
    }
    if (byCat[otherKey] && byCat[otherKey].length > 0) {
        const { load, oos } = computeLoad(byCat[otherKey]);
        catEntries.push({
            def: { id: otherKey, label: "Other", matches: () => false },
            load, oos, rows: byCat[otherKey],
        });
    }

    const totalLoad = catEntries.reduce((s, e) => s + e.load, 0);

    const categories: ViolationCategoryScore[] = catEntries.map(e => {
        // Score = 100 minus the per-100-driver load contribution for this
        // category, capped so a single high-volume category doesn't pin to 0.
        const score = clamp(100 - (e.load / fleetScale) * 12);
        return {
            id: e.def.id,
            label: e.def.label,
            score,
            events: e.rows.length,
            oosEvents: e.oos,
            severityWeight: Number(e.load.toFixed(2)),
            contributionPct: totalLoad > 0 ? Number(((e.load / totalLoad) * 100).toFixed(1)) : 0,
        };
    }).sort((a, b) => b.severityWeight - a.severityWeight);

    // Overall = severity-weighted average of category scores so categories
    // with the heaviest load drag the headline number the most.
    const overall = totalLoad > 0
        ? clamp(categories.reduce((s, c) => s + c.score * (c.severityWeight / totalLoad), 0))
        : 95;

    return {
        overall,
        totalEvents,
        totalOos,
        categories,
    };
}

// ── Driver scorecards ────────────────────────────────────────────────────
// Build a per-driver row showing each driver's overall + per-domain safety
// score. Used by the Driver tab on the Beta Safety Analysis page.

export function computeDriverScorecards(accountId: string | undefined): DriverScorecard[] {
    const id = accountId ?? "acct-001";
    const drivers    = CARRIER_DRIVERS[id] ?? [];
    const accidents  = getAccidentsForCarrier(id);
    const violations = getViolationsForCarrier(id);
    const hos        = getHosForCarrier(id);

    // Group events by driver id once for fast per-driver lookups.
    const violationsByDriver = new Map<string, any[]>();
    for (const v of violations) {
        const k = v?.driverId || v?.driverName;
        if (!k) continue;
        (violationsByDriver.get(k) ?? violationsByDriver.set(k, []).get(k))!.push(v);
    }
    const accidentsByDriver = new Map<string, any[]>();
    for (const a of accidents) {
        const k = a?.driver?.driverId || a?.driver?.name;
        if (!k) continue;
        (accidentsByDriver.get(k) ?? accidentsByDriver.set(k, []).get(k))!.push(a);
    }
    const hosLogsByDriver = new Map<string, any[]>();
    for (const l of hos.dailyLogs) {
        const k = l.driver?.id || `${l.driver?.firstName ?? ''} ${l.driver?.lastName ?? ''}`.trim();
        if (!k) continue;
        (hosLogsByDriver.get(k) ?? hosLogsByDriver.set(k, []).get(k))!.push(l);
    }

    const out: DriverScorecard[] = drivers.map((d: any) => {
        const did = d.id ?? d.driverId ?? d.name;
        const dViols = violationsByDriver.get(did) ?? violationsByDriver.get(d.name) ?? [];
        const dAccs  = accidentsByDriver.get(did)  ?? accidentsByDriver.get(d.name)  ?? [];
        const dHos   = hosLogsByDriver.get(did)    ?? hosLogsByDriver.get(d.name)    ?? [];

        const inspViols = dViols.filter(v => !!v?.inspectionId);
        const vedrViols = dViols.filter(v => {
            const g = String(v?.violationGroup ?? "").toLowerCase();
            return g.includes("eld") || g.includes("telematics") || g.includes("video") || g.includes("camera") || g.includes("hours");
        });

        // Time-decayed deduction helper.
        const decayDeduction = (rows: any[], perRow: (r: any) => number, scale: number) => {
            let d = 0;
            for (const r of rows) {
                const t = r?.date || r?.occurredAt;
                const days = Math.max(1, Math.floor((Date.now() - new Date(t ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
                const recency = days < 180 ? 1.0 : days < 365 ? 0.6 : days < 730 ? 0.3 : 0.1;
                d += perRow(r) * recency;
            }
            return clamp(100 - d * scale);
        };

        const accidentsScore = decayDeduction(dAccs, (a) => {
            const sev = a?.severity ?? {};
            return 6 + (sev.fatalities ?? 0) * 12 + (sev.injuriesNonFatal ?? 0) * 5 + (sev.towAway ? 3 : 0);
        }, 1.4);

        const violationsScore = decayDeduction(dViols, (v) =>
            v.isOos ? 5 : v.driverRiskCategory === 1 ? 3 : v.driverRiskCategory === 2 ? 1.5 : 0.6,
        2);

        const vedrScore = decayDeduction(vedrViols, (v) => v.isOos ? 5 : 3, 2.5);

        // Inspections: pass rate proxy — clean inspections lift, OOS drops.
        const inspsScore = inspViols.length === 0
            ? 95
            : clamp(100 - inspViols.reduce((s, v) => s + (v.isOos ? 7 : 2), 0) * 1.2);

        // ELD: rule-breaks rate over driver's logs + HOS-group violations.
        const hosBreaks = dHos.filter(l => {
            const drv  = (l.statusDurations?.driving ?? 0) / 3600;
            const onD  = ((l.statusDurations?.onDuty ?? 0) + (l.statusDurations?.driving ?? 0)) / 3600;
            return drv > 11 || onD > 14;
        }).length;
        const hosBreakRate = dHos.length > 0 ? hosBreaks / dHos.length : 0;
        const hosViolPenalty = Math.min(20, dViols.filter(v => {
            const g = String(v?.violationGroup ?? "").toLowerCase();
            return g.includes("hours") || g.includes("hos") || g.includes("eld") || g.includes("logbook");
        }).length * 4);
        const eldScore = clamp(100 - hosBreakRate * 80 - hosViolPenalty);

        // Composite — weighted average mirroring the fleet model.
        const overall = clamp(
            accidentsScore   * 0.22 +
            violationsScore  * 0.22 +
            inspsScore       * 0.18 +
            eldScore         * 0.16 +
            vedrScore        * 0.12 +
            // small floor for drivers with no events so we don't anchor at 100.
            (dViols.length === 0 && dAccs.length === 0 ? 88 : 75) * 0.10,
        );

        const band: DriverScorecard["band"] =
            overall >= 90 ? "Excellent"
          : overall >= 80 ? "Good"
          : overall >= 70 ? "Fair"
          : overall >= 55 ? "Poor"
          :                 "Critical";

        // Synthetic 30d delta based on score relative to band midpoints —
        // demo-friendly stand-in for an actual trailing window comparison.
        const delta30d = Math.round((overall - 80) * 0.18 * 100) / 100;

        return {
            driverId: did,
            name: d.name ?? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() ?? '—',
            licenseNumber: d.licenseNumber ?? d.license ?? '—',
            status: (String(d.status ?? '').toLowerCase() === 'terminated' ? 'inactive' : 'active'),
            overall,
            band,
            accidents:   accidentsScore,
            eld:         eldScore,
            inspections: inspsScore,
            vedr:        vedrScore,
            violations:  violationsScore,
            counts: {
                accidents:  dAccs.length,
                violations: dViols.length,
                oos:        dViols.filter(v => v.isOos).length,
                hosBreaks,
                vedrEvents: vedrViols.length,
            },
            delta30d,
        };
    });

    return out.sort((a, b) => b.overall - a.overall);
}

// ── Asset scorecards ─────────────────────────────────────────────────────
// Per-asset risk profile, used by the Assets tab on the Beta Safety Analysis
// page. Mirrors the driver scorecard structure but groups events by assetId
// instead of driverId.

export function computeAssetScorecards(accountId: string | undefined): AssetScorecard[] {
    const id = accountId ?? "acct-001";
    const assets     = CARRIER_ASSETS[id] ?? [];
    const accidents  = getAccidentsForCarrier(id);
    const violations = getViolationsForCarrier(id);
    const work       = getWorkOrdersForCarrier(id);

    // Group events by asset id.
    const violationsByAsset = new Map<string, any[]>();
    for (const v of violations) {
        const k = v?.assetId;
        if (!k) continue;
        (violationsByAsset.get(k) ?? violationsByAsset.set(k, []).get(k))!.push(v);
    }
    const accidentsByAsset = new Map<string, any[]>();
    for (const a of accidents) {
        for (const veh of a?.vehicles ?? []) {
            const k = veh?.assetId;
            if (!k) continue;
            (accidentsByAsset.get(k) ?? accidentsByAsset.set(k, []).get(k))!.push(a);
        }
    }
    const tasksByAsset = new Map<string, any[]>();
    for (const t of work?.tasks ?? []) {
        const k = (t as any).assetId;
        if (!k) continue;
        (tasksByAsset.get(k) ?? tasksByAsset.set(k, []).get(k))!.push(t);
    }

    const decay = (rows: any[], perRow: (r: any) => number, scale: number) => {
        let d = 0;
        for (const r of rows) {
            const t = r?.date || r?.occurredAt;
            const days = Math.max(1, Math.floor((Date.now() - new Date(t ?? Date.now()).getTime()) / (1000 * 60 * 60 * 24)));
            const recency = days < 180 ? 1.0 : days < 365 ? 0.6 : days < 730 ? 0.3 : 0.1;
            d += perRow(r) * recency;
        }
        return clamp(100 - d * scale);
    };

    const out: AssetScorecard[] = assets.map((a: any) => {
        const aid    = a.id ?? a.assetId;
        const aViols = violationsByAsset.get(aid) ?? [];
        const aAccs  = accidentsByAsset.get(aid)  ?? [];
        const aTasks = tasksByAsset.get(aid)      ?? [];

        const vehMaintViols = aViols.filter((v: any) => {
            const g = String(v?.violationGroup ?? "").toLowerCase();
            return g.includes("vehicle") || g.includes("maint") || g.includes("brake") || g.includes("light") || g.includes("tire");
        });
        const inspViols = aViols.filter((v: any) => !!v?.inspectionId);
        const vedrViols = aViols.filter((v: any) => {
            const g = String(v?.violationGroup ?? "").toLowerCase();
            return g.includes("eld") || g.includes("telematics") || g.includes("video") || g.includes("camera");
        });

        const accidentsScore  = decay(aAccs, (acc) => {
            const sev = acc?.severity ?? {};
            return 5 + (sev.fatalities ?? 0) * 10 + (sev.injuriesNonFatal ?? 0) * 4 + (sev.towAway ? 3 : 0);
        }, 1.5);

        const violationsScore = decay(aViols, (v) =>
            v.isOos ? 4 : v.driverRiskCategory === 1 ? 2.5 : v.driverRiskCategory === 2 ? 1.2 : 0.5,
        2);

        const vedrScore = decay(vedrViols, (v) => v.isOos ? 5 : 2.5, 3);

        const inspsScore = inspViols.length === 0
            ? 95
            : clamp(100 - inspViols.reduce((s, v) => s + (v.isOos ? 6 : 2), 0) * 1.4);

        const overdue   = aTasks.filter(t => t.status === "overdue").length;
        const completed = aTasks.filter(t => t.status === "completed").length;
        const overdueRate   = aTasks.length > 0 ? overdue   / aTasks.length : 0;
        const completedRate = aTasks.length > 0 ? completed / aTasks.length : 0;
        const vehViolPenalty = Math.min(25, vehMaintViols.length * 5);
        const maintScore = clamp(100 - overdueRate * 70 + completedRate * 6 - vehViolPenalty);

        const overall = clamp(
            maintenance(maintScore)   * 0.25 +
            inspsScore                * 0.20 +
            violationsScore           * 0.20 +
            accidentsScore            * 0.20 +
            vedrScore                 * 0.10 +
            (aViols.length === 0 && aAccs.length === 0 ? 88 : 75) * 0.05,
        );

        const band: AssetScorecard["band"] =
            overall >= 90 ? "Excellent"
          : overall >= 80 ? "Good"
          : overall >= 70 ? "Fair"
          : overall >= 55 ? "Poor"
          :                 "Critical";

        return {
            assetId: aid,
            unitNumber: a.unitNumber ?? aid,
            plate: a.licensePlate ?? "—",
            make: a.make ?? "—",
            model: a.model ?? "—",
            year: a.year ?? "—",
            assetCategory: a.assetCategory ?? a.assetType ?? "CMV",
            operationalStatus: a.operationalStatus ?? "Active",
            overall,
            band,
            maintenance: maintScore,
            inspections: inspsScore,
            violations:  violationsScore,
            accidents:   accidentsScore,
            vedr:        vedrScore,
            counts: {
                accidents:               aAccs.length,
                violations:              aViols.length,
                oos:                     aViols.filter((v: any) => v.isOos).length,
                vehicleMaintViolations:  vehMaintViols.length,
                overdueWorkOrders:       overdue,
                totalWorkOrders:         aTasks.length,
            },
            delta30d: Math.round((overall - 80) * 0.18 * 100) / 100,
        };
    });

    return out.sort((a, b) => b.overall - a.overall);
}

/** Identity passthrough used by the asset composite formula. Keeps the
 *  expression readable: `maintenance(maintScore) * 0.25 + ...`. */
function maintenance(v: number): number { return v; }

// ── Forecasting ──────────────────────────────────────────────────────────
// Carrier risk-score forecast = linear regression on the monthly composite
// score over the lookback window, projected forward to `horizonMonths`. The
// score is inverted relative to the safety score (100 - fleetSafetyScore) so
// it matches the screenshot's "risk-score forecast" semantics (lower = safer).

/** Simple OLS linear regression — returns slope, intercept, R². */
function linreg(ys: number[]): { slope: number; intercept: number; rSquared: number; residuals: number[] } {
    const n = ys.length;
    if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, rSquared: 0, residuals: [] };
    const xs = ys.map((_, i) => i);
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (xs[i] - xMean) * (ys[i] - yMean);
        den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    const residuals: number[] = [];
    let ssRes = 0, ssTot = 0;
    for (let i = 0; i < n; i++) {
        const pred = intercept + slope * xs[i];
        const r = ys[i] - pred;
        residuals.push(r);
        ssRes += r * r;
        ssTot += (ys[i] - yMean) ** 2;
    }
    const rSquared = ssTot === 0 ? 0 : Math.max(0, 1 - ssRes / ssTot);
    return { slope, intercept, rSquared, residuals };
}

export function computeCarrierForecast(
    accountId: string | undefined,
    horizonMonths: number = 12,
    historyMonths: number = 12,
): CarrierForecast {
    const history = computeFleetScoreTrend(accountId, historyMonths);
    if (history.length === 0) {
        return {
            points: [], nowScore: 0, horizonScore: 0, horizonLower: 0, horizonUpper: 0,
            slope: 0, trend: "Stable", rSquared: 0, residualStdDev: 0,
            historyMonths: 0, confidence: "Low",
        };
    }
    // Convert "higher = safer" fleet score into "higher = riskier" risk score
    // so the forecast line reads the way the screenshot does.
    const ys = history.map(p => 100 - p.fleetScore);
    const { slope, intercept, rSquared, residuals } = linreg(ys);
    const n = ys.length;
    const residualVar = residuals.reduce((a, b) => a + b * b, 0) / Math.max(1, n - 2);
    const residualStdDev = Math.sqrt(residualVar);

    const points: ForecastPoint[] = history.map((p, i) => ({
        date: p.date,
        riskScore: ys[i],
        isForecast: false,
    }));

    // Append forecast — damp the trend toward the long-run mean over 36 months
    // so the projection doesn't run away to ±∞ on a steep slope.
    const lastDate = new Date(history[history.length - 1].date);
    const longRunMean = ys.reduce((a, b) => a + b, 0) / n;
    for (let k = 1; k <= horizonMonths; k++) {
        const d = new Date(lastDate);
        d.setMonth(d.getMonth() + k);
        const xIdx = n - 1 + k;
        const linear = intercept + slope * xIdx;
        const dampW = Math.min(1, k / 36);
        const value = linear * (1 - dampW) + longRunMean * dampW;
        // 80% prediction interval ≈ ±1.28σ widening with √k.
        const widen = residualStdDev * 1.28 * Math.sqrt(1 + k / Math.max(2, n));
        points.push({
            date: d.toISOString().slice(0, 10),
            riskScore: clamp(value),
            isForecast: true,
            lower: clamp(value - widen),
            upper: clamp(value + widen),
        });
    }

    const last = points[points.length - 1];
    const nowScore = ys[ys.length - 1];

    const trend: CarrierForecast["trend"] =
        slope > 0.15 ? "Degrading" :
        slope < -0.15 ? "Improving" : "Stable";

    const confidence: CarrierForecast["confidence"] =
        n >= 18 && rSquared >= 0.55 ? "High" :
        n >= 9  && rSquared >= 0.30 ? "Medium" : "Low";

    return {
        points,
        nowScore,
        horizonScore: last.riskScore,
        horizonLower: last.lower ?? last.riskScore,
        horizonUpper: last.upper ?? last.riskScore,
        slope,
        trend,
        rSquared,
        residualStdDev,
        historyMonths: n,
        confidence,
    };
}

// ── Per-driver crash probability ─────────────────────────────────────────
// Pure rate-based model: estimate the driver's monthly "serious event" rate λ
// from the last 12 months, then convert to P(≥1 event in horizon) using a
// Poisson tail: P = 1 - e^(-λ × horizonMonths). Captures fatigue/violation
// patterns even when the driver hasn't crashed yet.

export function computeDriverCrashForecasts(
    accountId: string | undefined,
    horizonMonths: number = 12,
): DriverCrashForecast[] {
    const id = accountId ?? "acct-001";
    const drivers    = CARRIER_DRIVERS[id] ?? [];
    const accidents  = getAccidentsForCarrier(id);
    const violations = getViolationsForCarrier(id);
    const since = Date.now() - 365 * 24 * 60 * 60 * 1000;

    const out: DriverCrashForecast[] = drivers.map((d: any) => {
        const did = d.id ?? d.driverId ?? d.name;
        const dAccs  = accidents.filter(a => (a?.driver?.driverId === did || a?.driver?.name === d.name)
            && new Date(a?.occurredAt ?? 0).getTime() >= since);
        const dViols = violations.filter(v => (v?.driverId === did || v?.driverName === d.name)
            && new Date(v?.date ?? 0).getTime() >= since);

        // Serious-event monthly rate: weight crashes 1.0, OOS violations 0.4,
        // high-risk citations 0.18 — divided by 12 months.
        const oos = dViols.filter(v => v.isOos).length;
        const highRiskCitations = dViols.filter(v => v.driverRiskCategory === 1 && !v.isOos).length;
        const seriousEvents = dAccs.length * 1.0 + oos * 0.4 + highRiskCitations * 0.18;
        const lambda = seriousEvents / 12;
        const probability = 1 - Math.exp(-lambda * horizonMonths);
        const band: DriverCrashForecast["band"] =
            probability >= 0.50 ? "Critical"
          : probability >= 0.25 ? "High"
          : probability >= 0.10 ? "Moderate"
          :                       "Low";

        // Per-factor breakdown for the hover-explain popover.
        const factors: ForecastFactor[] = [];
        if (dAccs.length > 0) {
            factors.push({
                label: 'Accidents (12mo)',
                impact: `+${dAccs.length}.0 events`,
                detail: `${dAccs.length} reportable accident${dAccs.length === 1 ? '' : 's'} × 1.0 weight`,
            });
        }
        if (oos > 0) {
            factors.push({
                label: 'OOS violations',
                impact: `+${(oos * 0.4).toFixed(2)} events`,
                detail: `${oos} OOS × 0.4 weight`,
            });
        }
        if (highRiskCitations > 0) {
            factors.push({
                label: 'High-risk citations',
                impact: `+${(highRiskCitations * 0.18).toFixed(2)} events`,
                detail: `${highRiskCitations} citation${highRiskCitations === 1 ? '' : 's'} × 0.18 weight`,
            });
        }
        if (factors.length === 0) {
            factors.push({
                label: 'Clean record',
                impact: 'baseline',
                detail: 'No accidents or serious violations in the last 12 months — using fleet baseline.',
            });
        }
        factors.push({
            label: 'Monthly rate (λ)',
            impact: lambda.toFixed(3) + ' / mo',
            detail: `Σ weighted events ÷ 12 months`,
        });
        factors.push({
            label: 'Horizon multiplier',
            impact: `× ${horizonMonths} months`,
            detail: `Forecast window applied to λ`,
        });
        factors.push({
            label: 'Probability',
            impact: `${(probability * 100).toFixed(1)}%`,
            detail: `Poisson tail · P = 1 − e^(−λ × horizon)`,
        });

        return {
            driverId: did,
            name: d.name ?? `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim() ?? '—',
            licenseNumber: d.licenseNumber ?? d.license ?? '—',
            lambda: Number(lambda.toFixed(4)),
            probability: Number(probability.toFixed(4)),
            band,
            eventsLast12mo: dAccs.length + dViols.length,
            accidentsLast12mo: dAccs.length,
            oosLast12mo: oos,
            factors,
        };
    });

    return out.sort((a, b) => b.probability - a.probability);
}

// ── Per-asset maintenance probability ────────────────────────────────────
export function computeAssetMaintenanceForecasts(
    accountId: string | undefined,
    horizonMonths: number = 12,
): AssetMaintenanceForecast[] {
    const id = accountId ?? "acct-001";
    const assets     = CARRIER_ASSETS[id] ?? [];
    const work       = getWorkOrdersForCarrier(id);
    const violations = getViolationsForCarrier(id);

    const tasksByAsset = new Map<string, any[]>();
    for (const t of work?.tasks ?? []) {
        const k = (t as any).assetId;
        if (!k) continue;
        (tasksByAsset.get(k) ?? tasksByAsset.set(k, []).get(k))!.push(t);
    }
    const violsByAsset = new Map<string, any[]>();
    for (const v of violations) {
        if (!v?.assetId) continue;
        const g = String(v?.violationGroup ?? "").toLowerCase();
        const isVehMaint = g.includes("vehicle") || g.includes("maint") || g.includes("brake") || g.includes("light") || g.includes("tire");
        if (!isVehMaint) continue;
        (violsByAsset.get(v.assetId) ?? violsByAsset.set(v.assetId, []).get(v.assetId))!.push(v);
    }

    const out: AssetMaintenanceForecast[] = assets.map((a: any) => {
        const aid = a.id ?? a.assetId;
        const aTasks = tasksByAsset.get(aid) ?? [];
        const aViols = violsByAsset.get(aid) ?? [];
        const overdue = aTasks.filter(t => t.status === "overdue").length;
        const completedTasks = aTasks.filter(t => t.status === "completed");
        const lastService = completedTasks.length > 0
            ? Math.max(...completedTasks.map(t => new Date((t as any).completedAt ?? Date.now()).getTime()))
            : 0;
        const daysSinceLastService = lastService > 0
            ? Math.floor((Date.now() - lastService) / (1000 * 60 * 60 * 24))
            : 365 * 2; // assume 2 years if no record

        // Hazard model: baseline 4%/yr, multiplied by horizon-fraction, with
        // each overdue task and recent veh-maint violation adding incremental
        // risk. Older assets see a small age premium.
        const ageYrs = typeof a.year === 'number' ? Math.max(0, new Date().getFullYear() - a.year) : 0;
        const baseAnnual = 0.04 + ageYrs * 0.012;
        const overduePremium = overdue * 0.08;
        const violationPremium = aViols.length * 0.05;
        const overdueServicePremium = Math.min(0.25, daysSinceLastService / 365 * 0.10);
        const annualHazard = baseAnnual + overduePremium + violationPremium + overdueServicePremium;
        const probability = clamp01(1 - Math.exp(-annualHazard * (horizonMonths / 12)));

        const band: AssetMaintenanceForecast["band"] =
            probability >= 0.60 ? "Critical"
          : probability >= 0.35 ? "High"
          : probability >= 0.15 ? "Moderate"
          :                       "Low";

        // Per-factor breakdown for the hover-explain popover.
        const factors: ForecastFactor[] = [];
        factors.push({
            label: 'Baseline hazard',
            impact: `+${(0.04 * 100).toFixed(1)}% / yr`,
            detail: 'Fleet-wide annual maintenance OOS baseline',
        });
        if (ageYrs > 0) {
            factors.push({
                label: `Asset age (${ageYrs} yr${ageYrs === 1 ? '' : 's'})`,
                impact: `+${(ageYrs * 0.012 * 100).toFixed(1)}% / yr`,
                detail: `1.2% age premium per model-year`,
            });
        }
        if (overdue > 0) {
            factors.push({
                label: 'Overdue work orders',
                impact: `+${(overduePremium * 100).toFixed(1)}% / yr`,
                detail: `${overdue} overdue task${overdue === 1 ? '' : 's'} × 8% each`,
            });
        }
        if (aViols.length > 0) {
            factors.push({
                label: 'Veh-maint violations',
                impact: `+${(violationPremium * 100).toFixed(1)}% / yr`,
                detail: `${aViols.length} violation${aViols.length === 1 ? '' : 's'} × 5% each`,
            });
        }
        if (overdueServicePremium > 0.001) {
            factors.push({
                label: 'Days since last service',
                impact: `+${(overdueServicePremium * 100).toFixed(1)}% / yr`,
                detail: `${daysSinceLastService} days · scaled · capped at 25%`,
            });
        }
        if (factors.length === 1) {
            factors.push({
                label: 'Clean record',
                impact: 'baseline only',
                detail: 'No overdue work, violations, or stale service intervals.',
            });
        }
        factors.push({
            label: 'Total annual hazard',
            impact: `${(annualHazard * 100).toFixed(1)}% / yr`,
            detail: `Σ baseline + age + overdue + violations + service`,
        });
        factors.push({
            label: 'Horizon fraction',
            impact: `× ${(horizonMonths / 12).toFixed(2)}`,
            detail: `${horizonMonths}-month window applied to annual hazard`,
        });
        factors.push({
            label: 'Probability',
            impact: `${(probability * 100).toFixed(1)}%`,
            detail: `P = 1 − e^(−H × t)`,
        });

        return {
            assetId: aid,
            unitNumber: a.unitNumber ?? aid,
            make: a.make ?? '—',
            model: a.model ?? '—',
            year: a.year ?? '—',
            probability: Number(probability.toFixed(4)),
            band,
            overdueWorkOrders: overdue,
            vehicleMaintViolations: aViols.length,
            daysSinceLastService,
            factors,
        };
    });

    return out.sort((a, b) => b.probability - a.probability);
}

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

// ── Vehicle maintenance forecast ─────────────────────────────────────────

export interface MaintenanceForecastRow {
    taskId: string;
    assetId: string;
    serviceLabel: string;
    /** Original task status. */
    status: "overdue" | "due" | "upcoming" | "in_progress" | "completed" | "cancelled";
    /** Predicted due date — ISO YYYY-MM-DD. */
    predictedDue: string;
    /** Days until due. Negative for overdue. */
    days: number;
    /** Severity / urgency points (overdue items get the most). */
    severity: number;
    /** Estimated cost in USD. */
    estCost: number;
    /** How the prediction was made. */
    method: "scheduled" | "overdue" | "projected-miles" | "engine-hours";
    /** Confidence band drives the badge tone. */
    confidence: "High" | "Medium" | "Low";
    /** Category bucket used by the cost donut. */
    category: "Brake / Tire" | "CVIP / Annual" | "Fluids / Oil" | "Other";
}

export interface MaintenanceForecast {
    rows: MaintenanceForecastRow[];
    /** Per-category aggregates for the donut card. */
    byCategory: { label: string; itemCount: number; cost: number; color: string }[];
    /** Top-line totals. */
    totalItems: number;
    totalCost: number;
}

const SERVICE_LABELS: Record<string, string> = {
    oil_filter: "Oil & Filter Change",
    tire_rotation: "Tire Rotation",
    brake_inspection: "Brake Inspection",
    annual_inspection: "Annual Inspection",
    grease_fifth_wheel: "Grease Fifth Wheel",
    reefer_service: "Reefer Service",
    wiper_fluid: "Wiper Fluid Top-up",
};

const SERVICE_BASE_COST: Record<string, number> = {
    oil_filter: 596,
    tire_rotation: 358,
    brake_inspection: 866,
    annual_inspection: 765,
    grease_fifth_wheel: 670,
    reefer_service: 920,
    wiper_fluid: 180,
};

function categoryFor(serviceId: string): MaintenanceForecastRow["category"] {
    if (serviceId === "brake_inspection" || serviceId === "tire_rotation") return "Brake / Tire";
    if (serviceId === "annual_inspection") return "CVIP / Annual";
    if (serviceId === "oil_filter" || serviceId === "reefer_service" || serviceId === "grease_fifth_wheel" || serviceId === "wiper_fluid") return "Fluids / Oil";
    return "Other";
}

export function computeMaintenanceForecast(
    accountId: string | undefined,
    horizonMonths: number = 12,
): MaintenanceForecast {
    const id = accountId ?? "acct-001";
    const work = getWorkOrdersForCarrier(id);
    const tasks = work?.tasks ?? [];
    const today = new Date();
    const horizonEnd = new Date(today);
    horizonEnd.setMonth(horizonEnd.getMonth() + horizonMonths);

    const rows: MaintenanceForecastRow[] = [];

    for (const t of tasks) {
        if (t.status === "completed" || t.status === "cancelled") continue;
        const serviceId = t.serviceTypeIds?.[0] ?? "other";
        const label = SERVICE_LABELS[serviceId] ?? serviceId.replace(/_/g, ' ');
        const baseCost = SERVICE_BASE_COST[serviceId] ?? 480;

        // Predicted due date — prefer dueAtDate, else fall back to ~30 days
        // out from today (scheduled cadence).
        const dueAt = t.dueRule?.dueAtDate
            ? new Date(t.dueRule.dueAtDate)
            : new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const days = Math.round((dueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Skip rows outside the horizon window so the table is bounded.
        if (dueAt.getTime() > horizonEnd.getTime()) continue;

        const status = t.status;
        const severity = status === "overdue" ? 10
            : status === "due" ? 8
            : status === "in_progress" ? 4
            : 5;

        const method: MaintenanceForecastRow["method"] = status === "overdue"
            ? "overdue"
            : (t.dueRule?.unit === "miles" ? "projected-miles"
              : t.dueRule?.unit === "engine_hours" ? "engine-hours"
              : "scheduled");

        const confidence: MaintenanceForecastRow["confidence"] =
            status === "overdue" || status === "due" ? "Low"
          : method === "scheduled" ? "High"
          : "Medium";

        rows.push({
            taskId: t.id,
            assetId: t.assetId,
            serviceLabel: label,
            status,
            predictedDue: dueAt.toISOString().slice(0, 10),
            days,
            severity,
            estCost: baseCost,
            method,
            confidence,
            category: categoryFor(serviceId),
        });
    }

    // Sort by predicted due ascending (most urgent first).
    rows.sort((a, b) => a.predictedDue.localeCompare(b.predictedDue));

    // Roll up by category for the donut.
    const catColors: Record<MaintenanceForecastRow["category"], string> = {
        "Brake / Tire":  "#ef4444",
        "CVIP / Annual": "#10b981",
        "Fluids / Oil":  "#94a3b8",
        "Other":         "#cbd5e1",
    };
    const buckets = new Map<string, { itemCount: number; cost: number }>();
    for (const r of rows) {
        const b = buckets.get(r.category) ?? { itemCount: 0, cost: 0 };
        b.itemCount += 1;
        b.cost += r.estCost;
        buckets.set(r.category, b);
    }
    const byCategory = Array.from(buckets.entries())
        .map(([label, b]) => ({ label, itemCount: b.itemCount, cost: b.cost, color: catColors[label as MaintenanceForecastRow["category"]] }))
        .sort((a, b) => b.cost - a.cost);

    const totalCost  = rows.reduce((s, r) => s + r.estCost, 0);

    return {
        rows,
        byCategory,
        totalItems: rows.length,
        totalCost,
    };
}

