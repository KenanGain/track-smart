/**
 * Risk-engine configuration: defaults, persistence, and config hashing.
 *
 * Spec: docs/SAFETY.md §12 (Settings) and §17 (Config hash).
 *
 * Storage key:  `safety:risk-config:<accountId>`  (per-account)
 *               `safety:risk-config:__global`    (fallback)
 *
 * Pure module — no React. UI components subscribe through `risk-store.ts`.
 */

import type { RiskConfig } from './risk-engine.types';

const KEY_PREFIX = 'safety:risk-config:';
const GLOBAL_KEY = '__global';

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_RISK_CONFIG: RiskConfig = {
    bands: {
        excellentFloor: 85,
        goodFloor: 70,
        fairFloor: 55,
        poorFloor: 35,
    },
    regulatory: {
        sourceMode: 'available-only',
        weights: {
            fmcsa: 0.35,
            cvor: 0.30,
            nscHome: 0.25,
            nscOther: 0.10,
        },
        multiNscMode: 'split',
        homeJurisdiction: undefined,
    },
    nsc: {
        ab: {
            stageSafety: { notMonitored: 90, stage1: 83, stage2: 67, stage3: 50, stage4: 25 },
        },
        bc: {
            satisfactory: 85,
            conditional: 65,
            unsatisfactory: 35,
            unrated: 80,
        },
        pe: {
            pointsPerVehicleMultiplier: 8.0,
        },
        ns: {
            level1Safety: 95,
            level2Safety: 75,
            level3Safety: 50,
            level4Safety: 25,
        },
    },
    recency: {
        halfLifeMonths: 12,
        hardCutoffMonths: 36,
        step0to6: 1.0,
        step6to12: 0.8,
        step12to24: 0.5,
    },
    confidence: {
        minDriverEventsHigh: 3,
        minAssetEventsHigh: 3,
        minCarrierMonthsHigh: 12,
        lowConfidenceNeutralSafety: 75,
        missingSourcePolicy: 'ignore',
    },
    combined: {
        driverAsset: { driver: 0.45, asset: 0.35, shared: 0.20 },
        carrierDriver: { driver: 0.70, carrierReg: 0.20, fleetPeer: 0.10 },
        carrierAsset: { asset: 0.70, carrierReg: 0.20, fleetPeer: 0.10 },
        triple: { driver: 0.35, asset: 0.30, carrierReg: 0.20, shared: 0.15 },
    },
    components: {
        carrier: { regulatory: 0.45, incidents: 0.20, inspectionsOos: 0.15, driverAggregate: 0.10, assetAggregate: 0.10 },
        driver: { events: 0.35, hos: 0.20, telematics: 0.15, roadside: 0.15, incidents: 0.10, training: 0.05 },
        asset: { statusAge: 0.25, maintenance: 0.25, inspectionsOos: 0.25, violations: 0.15, incidents: 0.10 },
    },
    criticalOverrides: {
        fatalCrash24mo: true,
        twoOosIn6mo: true,
        crashIndicatorAlert: true,
        nscBcUnsatisfactory: true,
    },
};

// ── Validation / repair ──────────────────────────────────────────────────────

/** Deep-merge a (possibly partial) parsed config onto defaults — never throws. */
export function reconcileRiskConfig(input: unknown): RiskConfig {
    const base = structuredClone(DEFAULT_RISK_CONFIG);
    if (!input || typeof input !== 'object') return base;
    const src = input as Record<string, unknown>;

    function mergeInto<T>(target: T, patch: unknown): T {
        if (!patch || typeof patch !== 'object') return target;
        const out = target as unknown as Record<string, unknown>;
        const p = patch as Record<string, unknown>;
        for (const k of Object.keys(p)) {
            const pv = p[k];
            const tv = out[k];
            if (pv && typeof pv === 'object' && !Array.isArray(pv) &&
                tv && typeof tv === 'object' && !Array.isArray(tv)) {
                mergeInto(tv, pv);
            } else if (typeof pv === typeof tv || tv === undefined) {
                out[k] = pv;
            }
        }
        return target;
    }
    return mergeInto(base, src);
}

// ── Persistence ──────────────────────────────────────────────────────────────

export function loadRiskConfig(accountId?: string): RiskConfig {
    if (typeof localStorage === 'undefined') return structuredClone(DEFAULT_RISK_CONFIG);
    try {
        if (accountId) {
            const raw = localStorage.getItem(KEY_PREFIX + accountId);
            if (raw) return reconcileRiskConfig(JSON.parse(raw));
        }
        const rawG = localStorage.getItem(KEY_PREFIX + GLOBAL_KEY);
        if (rawG) return reconcileRiskConfig(JSON.parse(rawG));
    } catch { /* swallow — fall through to defaults */ }
    return structuredClone(DEFAULT_RISK_CONFIG);
}

export function saveRiskConfig(cfg: RiskConfig, accountId?: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const key = KEY_PREFIX + (accountId ?? GLOBAL_KEY);
        localStorage.setItem(key, JSON.stringify(cfg));
        // Notify same-window listeners (cross-tab is automatic via storage event).
        window.dispatchEvent(new StorageEvent('storage', { key }));
    } catch { /* quota / privacy mode — ignore */ }
}

export function resetRiskConfig(accountId?: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
        const key = KEY_PREFIX + (accountId ?? GLOBAL_KEY);
        localStorage.removeItem(key);
        window.dispatchEvent(new StorageEvent('storage', { key }));
    } catch { /* ignore */ }
}

// ── Hashing (for export reproducibility) ─────────────────────────────────────

/**
 * Deterministic short hash of a config object — used as `configHash` on every
 * EntityRiskScore and stamped on every export. Same config + same data ⇒
 * identical hash. Implementation: FNV-1a 32-bit over canonical JSON, hex.
 */
export function hashRiskConfig(cfg: RiskConfig): string {
    const json = canonicalJson(cfg);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < json.length; i++) {
        h ^= json.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
}

/** JSON.stringify with object keys sorted — required for stable hashing. */
function canonicalJson(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
    const keys = Object.keys(value as Record<string, unknown>).sort();
    return '{' + keys.map((k) =>
        JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k])
    ).join(',') + '}';
}

// ── Threshold helpers (used by scorers + UI) ────────────────────────────────

import type { Rating } from './risk-engine.types';

export function ratingForScore(safety: number, cfg: RiskConfig): Rating {
    const b = cfg.bands;
    if (safety >= b.excellentFloor) return 'Excellent';
    if (safety >= b.goodFloor) return 'Good';
    if (safety >= b.fairFloor) return 'Fair';
    if (safety >= b.poorFloor) return 'Poor';
    return 'Critical';
}

export function ratingColor(r: Rating): { text: string; bg: string; ring: string } {
    switch (r) {
        case 'Excellent': return { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' };
        case 'Good':      return { text: 'text-lime-700',    bg: 'bg-lime-50',    ring: 'ring-lime-200' };
        case 'Fair':      return { text: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'ring-amber-200' };
        case 'Poor':      return { text: 'text-orange-700',  bg: 'bg-orange-50',  ring: 'ring-orange-200' };
        case 'Critical':  return { text: 'text-rose-700',    bg: 'bg-rose-50',    ring: 'ring-rose-200' };
    }
}
