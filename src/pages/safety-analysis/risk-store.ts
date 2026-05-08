/**
 * Risk store — `useSyncExternalStore`-backed cache so React components can
 * subscribe to live score updates as carrier compliance toggles or risk
 * settings change.
 *
 * Spec: docs/SAFETY.md §11.1.
 *
 * Strategy:
 *   • An in-memory LRU keyed by `scopeKey + configHash` holds computed
 *     `EntityRiskScore`s.
 *   • Listening to the `storage` event (which both `safetySettings.ts` and
 *     `risk-config.ts` dispatch on writes) flushes the cache so the next
 *     `useRiskScore()` call recomputes against fresh settings.
 *   • Hooks return memoized snapshots — referential stability is preserved
 *     across unrelated re-renders.
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
    DEFAULT_RISK_CONFIG,
    hashRiskConfig,
    loadRiskConfig,
    saveRiskConfig,
} from './risk-config';
import { computeRiskScore } from './risk-scoring';
import {
    assetDistribution,
    driverAssetDistribution,
    driverDistribution,
} from './risk-distribution';
import type {
    EntityRiskScore,
    RiskConfig,
    RiskScope,
    ScoreDistribution,
} from './risk-engine.types';
import { scopeKey } from './risk-engine.types';

// ── External-store glue ──────────────────────────────────────────────────────

const listeners = new Set<() => void>();
let scoreCache = new Map<string, EntityRiskScore>();
let distCache = new Map<string, ScoreDistribution>();
let configCache: RiskConfig | null = null;

function subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

function notify(): void {
    for (const cb of listeners) cb();
}

/** Bust caches and ping subscribers. Called on settings / compliance writes. */
export function invalidateRiskCaches(): void {
    scoreCache = new Map();
    distCache = new Map();
    configCache = null;
    notify();
}

if (typeof window !== 'undefined') {
    window.addEventListener('storage', (ev) => {
        if (!ev.key) return;
        if (
            ev.key.startsWith('safety:risk-config:') ||
            ev.key === 'safe_settings_v3' ||
            ev.key === 'app_carrier_compliance_overrides_v2'
        ) {
            invalidateRiskCaches();
        }
    });
}

// ── Public API (non-React) ──────────────────────────────────────────────────

/** Read the active config, accountId-aware. Memoizes within the current
 *  cache generation; cleared by `invalidateRiskCaches`. */
export function getActiveRiskConfig(accountId?: string): RiskConfig {
    if (configCache) return configCache;
    configCache = accountId ? loadRiskConfig(accountId) : { ...DEFAULT_RISK_CONFIG };
    return configCache;
}

/** Persist a new config and invalidate downstream caches. */
export function setActiveRiskConfig(cfg: RiskConfig, accountId?: string): void {
    saveRiskConfig(cfg, accountId);
    invalidateRiskCaches();
}

/** Compute (or return cached) score for a scope. */
export function getRiskScore(scope: RiskScope, accountId?: string): EntityRiskScore {
    const cfg = getActiveRiskConfig(accountId);
    const key = scopeKey(scope) + ':' + hashRiskConfig(cfg);
    const hit = scoreCache.get(key);
    if (hit) return hit;
    const score = computeRiskScore(scope, cfg);
    scoreCache.set(key, score);
    return score;
}

/** Compute (or return cached) distribution. */
export function getDistribution(
    kind: 'driver' | 'asset' | 'driverAsset',
    carrierId: string,
    accountId?: string,
): ScoreDistribution {
    const cfg = getActiveRiskConfig(accountId);
    const key = `dist:${kind}:${carrierId}:${hashRiskConfig(cfg)}`;
    const hit = distCache.get(key);
    if (hit) return hit;
    const dist = kind === 'driver' ? driverDistribution(carrierId, cfg)
        : kind === 'asset' ? assetDistribution(carrierId, cfg)
        : driverAssetDistribution(carrierId, cfg);
    distCache.set(key, dist);
    return dist;
}

// ── React hooks ─────────────────────────────────────────────────────────────

/** Subscribe to a single scope's score. Re-renders when settings change. */
export function useRiskScore(scope: RiskScope, accountId?: string): EntityRiskScore {
    const getSnapshot = useCallback(() => getRiskScore(scope, accountId), [scope, accountId]);
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to a fleet distribution. */
export function useRiskDistribution(
    kind: 'driver' | 'asset' | 'driverAsset',
    carrierId: string,
    accountId?: string,
): ScoreDistribution {
    const getSnapshot = useCallback(
        () => getDistribution(kind, carrierId, accountId),
        [kind, carrierId, accountId],
    );
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Subscribe to the active config. */
export function useRiskConfig(accountId?: string): {
    config: RiskConfig;
    update: (next: RiskConfig) => void;
} {
    const getSnapshot = useCallback(() => getActiveRiskConfig(accountId), [accountId]);
    const config = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const update = useCallback((next: RiskConfig) => setActiveRiskConfig(next, accountId), [accountId]);
    return { config, update };
}
