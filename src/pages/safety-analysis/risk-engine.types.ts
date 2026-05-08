/**
 * Risk Engine — canonical types.
 *
 * Spec: docs/SAFETY.md §3, §4, §8.6
 *
 * Every adapter / normalizer / scorer in the engine speaks these shapes.
 * Pure types — no runtime dependencies.
 */

// ── Source identity ──────────────────────────────────────────────────────────

export type RegulatorySource =
    | 'fmcsa'
    | 'cvor'
    | 'nsc:AB'
    | 'nsc:BC'
    | 'nsc:PE'
    | 'nsc:NS';

export type InternalSource =
    | 'internal:incident'
    | 'internal:hos'
    | 'internal:vedr'
    | 'internal:maintenance'
    | 'internal:workOrder'
    | 'internal:training'
    | 'internal:document';

export type RiskSource = RegulatorySource | InternalSource;

export const REGULATORY_SOURCES: RegulatorySource[] = [
    'fmcsa', 'cvor', 'nsc:AB', 'nsc:BC', 'nsc:PE', 'nsc:NS',
];

export const NSC_JURISDICTIONS = ['AB', 'BC', 'PE', 'NS'] as const;
export type NscJurisdiction = typeof NSC_JURISDICTIONS[number];

// ── Domain & kind ────────────────────────────────────────────────────────────

export type RiskDomain =
    | 'crash'
    | 'unsafeDriving'
    | 'hos'
    | 'vehicleMaintenance'
    | 'driverFitness'
    | 'controlledSubstance'
    | 'hazmat'
    | 'inspection'
    | 'conviction'
    | 'collision'
    | 'assetHealth'
    | 'training'
    | 'documentCompliance';

export type RiskKind =
    | 'inspection'
    | 'violation'
    | 'collision'
    | 'conviction'
    | 'crash'
    | 'maintenance'
    | 'training'
    | 'document'
    | 'profile';

export type Confidence = 'high' | 'medium' | 'low';

// ── The atom ─────────────────────────────────────────────────────────────────

/** Canonical risk event. Adapters emit these; scorers consume them. */
export interface RiskEvent {
    id: string;
    carrierId: string;
    source: RiskSource;
    domain: RiskDomain;
    kind: RiskKind;
    /** YYYY-MM-DD (always normalize). */
    date: string;
    driverId?: string;
    assetId?: string;
    /** 0..10 normalized severity. */
    severity: number;
    /** Source-native points (kept for transparency). */
    points: number;
    oos: boolean;
    preventable?: boolean;
    confidence: Confidence;
    /** Source-specific payload — preserved for audit / drill-down. */
    raw: unknown;
}

// ── Scope ────────────────────────────────────────────────────────────────────

export type RiskScope =
    | { kind: 'carrier'; carrierId: string }
    | { kind: 'driver'; carrierId: string; driverId: string }
    | { kind: 'asset'; carrierId: string; assetId: string }
    | { kind: 'driverAsset'; carrierId: string; driverId: string; assetId: string }
    | { kind: 'carrierDriver'; carrierId: string; driverId: string }
    | { kind: 'carrierAsset'; carrierId: string; assetId: string }
    | { kind: 'carrierDriverAsset'; carrierId: string; driverId: string; assetId: string };

export type RiskScopeKind = RiskScope['kind'];

/** Stable string key for caching / lookups. */
export function scopeKey(s: RiskScope): string {
    switch (s.kind) {
        case 'carrier': return `carrier:${s.carrierId}`;
        case 'driver': return `driver:${s.carrierId}:${s.driverId}`;
        case 'asset': return `asset:${s.carrierId}:${s.assetId}`;
        case 'driverAsset': return `da:${s.carrierId}:${s.driverId}:${s.assetId}`;
        case 'carrierDriver': return `cd:${s.carrierId}:${s.driverId}`;
        case 'carrierAsset': return `ca:${s.carrierId}:${s.assetId}`;
        case 'carrierDriverAsset': return `cda:${s.carrierId}:${s.driverId}:${s.assetId}`;
    }
}

// ── Score outputs ────────────────────────────────────────────────────────────

export type Rating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';

export interface SourceScore {
    source: RegulatorySource;
    /** 0..100 normalized safety. */
    safetyScore: number;
    /** 0..100 risk = 100 - safetyScore. */
    riskScore: number;
    /** Source-native value (CVOR rating %, FMCSA percentile mean, NSC level, etc.). */
    nativeScore?: number;
    nativeLabel?: string;
    confidence: Confidence;
    eventCount: number;
    explanation: string;
}

export interface ComponentScore {
    /** Component key — unique within a formula (e.g. "regulatory", "incidents"). */
    key: string;
    label: string;
    /** 0..100 component safety score. */
    safetyScore: number;
    /** 0..1 weight applied in the parent formula. */
    weight: number;
    /** safetyScore × weight. */
    weighted: number;
    eventCount: number;
    confidence: Confidence;
}

export interface RiskContribution {
    eventId: string;
    source: RiskSource;
    domain: RiskDomain;
    date: string;
    title: string;
    severity: number;
    weighted: number;
    /** Percentage of the parent score this contribution represents (0..100). */
    pctOfScore: number;
    deepLink?: string;
}

export interface RiskRecommendation {
    severity: 'info' | 'warn' | 'urgent';
    title: string;
    description: string;
    actionKey:
        | 'open-work-order'
        | 'schedule-training'
        | 'review-inspection'
        | 'verify-document'
        | 'review-driver'
        | 'review-asset'
        | 'review-carrier-profile'
        | 'no-action';
    deepLink?: string;
}

export interface ScoreDistributionBucket {
    band: Rating;
    count: number;
    pct: number;
}

export interface ScoreDistribution {
    scope: 'driver' | 'asset' | 'driverAsset' | 'source' | 'jurisdiction';
    buckets: ScoreDistributionBucket[];
    total: number;
    median: number;
    p10: number;
    p90: number;
}

export interface EntityRiskScore {
    scope: RiskScope;
    /** 0..100 — higher is safer. */
    safetyScore: number;
    /** 100 - safetyScore. */
    riskScore: number;
    rating: Rating;
    confidence: Confidence;
    /** Source-level breakdown (FMCSA / CVOR / NSC:*). Empty when scope has no regulatory dimension. */
    sourceScores: SourceScore[];
    /** Component breakdown for the entity formula. */
    componentScores: ComponentScore[];
    /** Per-jurisdiction score map (e.g. AB/BC/PE/NS/ON/<US-state>). */
    perJurisdiction: Record<string, number>;
    topContributors: RiskContribution[];
    recommendations: RiskRecommendation[];
    /** ISO timestamp when this score was computed. */
    generatedAt: string;
    /** SHA-1-style fingerprint of the settings used (auditability). */
    configHash: string;
    /** Number of events that fed the score (informational). */
    eventCount: number;
    /** Critical override fired? When true, rating is forced to 'Critical'. */
    criticalOverride?: { rule: string; eventId?: string };
}

// ── Adapter contract ─────────────────────────────────────────────────────────

export interface DriverQuery {
    id?: string;
    licence?: string;
    name?: string;
}

export interface AssetQuery {
    id?: string;
    plate?: string;
    unit?: string;
    vin?: string;
}

export interface AdapterContext {
    carrierId: string;
    /** ISO date — pass in for testability. Defaults to today at runtime. */
    today: string;
    resolveDriver(query: DriverQuery): string | undefined;
    resolveAsset(query: AssetQuery): string | undefined;
}

export interface RiskAdapter<TRaw> {
    source: RiskSource;
    /** Pure: never mutates the input. */
    toEvents(raw: TRaw, ctx: AdapterContext): RiskEvent[];
}

// ── Settings extension (persisted per-account) ───────────────────────────────

/**
 * Risk-engine config — extends the existing SafetySettings shape.
 * Stored under `safety:risk-config:<accountId>` (separate from legacy
 * `safe_settings_v3`, so the new engine can iterate without breaking
 * the existing dashboard).
 */
export interface RiskConfig {
    /** Band thresholds (safety scale). */
    bands: {
        excellentFloor: number;   // default 85
        goodFloor: number;        // default 70
        fairFloor: number;        // default 55
        poorFloor: number;        // default 35
    };

    /** Regulatory-source equivalency weights & policy. */
    regulatory: {
        sourceMode: 'available-only' | 'strict-required';
        weights: {
            fmcsa: number;        // default 0.35
            cvor: number;         // default 0.30
            nscHome: number;      // default 0.25
            nscOther: number;     // default 0.10
        };
        multiNscMode: 'split' | 'max-risk' | 'home-primary';
        homeJurisdiction?: NscJurisdiction;
    };

    /** Per-jurisdiction NSC normalization tunables. */
    nsc: {
        ab: { stageSafety: { notMonitored: number; stage1: number; stage2: number; stage3: number; stage4: number } };
        bc: { satisfactory: number; conditional: number; unsatisfactory: number; unrated: number };
        pe: { pointsPerVehicleMultiplier: number };
        ns: { level1Safety: number; level2Safety: number; level3Safety: number; level4Safety: number };
    };

    /** Recency / decay. */
    recency: {
        halfLifeMonths: number;   // default 12
        hardCutoffMonths: number; // default 36
        step0to6: number;         // default 1.0
        step6to12: number;        // default 0.8
        step12to24: number;       // default 0.5
    };

    /** Confidence policy. */
    confidence: {
        minDriverEventsHigh: number;     // default 3
        minAssetEventsHigh: number;      // default 3
        minCarrierMonthsHigh: number;    // default 12
        lowConfidenceNeutralSafety: number; // default 75
        missingSourcePolicy: 'ignore' | 'neutral' | 'penalize';
    };

    /** Combined formulas. */
    combined: {
        driverAsset: { driver: number; asset: number; shared: number };
        carrierDriver: { driver: number; carrierReg: number; fleetPeer: number };
        carrierAsset: { asset: number; carrierReg: number; fleetPeer: number };
        triple: { driver: number; asset: number; carrierReg: number; shared: number };
    };

    /** Component weights per entity formula. */
    components: {
        carrier: { regulatory: number; incidents: number; inspectionsOos: number; driverAggregate: number; assetAggregate: number };
        driver: { events: number; hos: number; telematics: number; roadside: number; incidents: number; training: number };
        asset: { statusAge: number; maintenance: number; inspectionsOos: number; violations: number; incidents: number };
    };

    /** Critical override toggles. */
    criticalOverrides: {
        fatalCrash24mo: boolean;
        twoOosIn6mo: boolean;
        crashIndicatorAlert: boolean;
        nscBcUnsatisfactory: boolean;
    };
}
