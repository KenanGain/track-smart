/**
 * Score distributions across populations (drivers, assets, pairs, sources).
 *
 * Spec: docs/SAFETY.md §9.
 *
 * Each function takes a config + carrier id and returns a `ScoreDistribution`
 * the chart layer can render directly.
 */

import type {
    Rating,
    RiskConfig,
    ScoreDistribution,
    ScoreDistributionBucket,
} from './risk-engine.types';
import { ratingForScore } from './risk-config';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { scoreAsset, scoreDriver } from './risk-scoring';

const BANDS_ORDER: Rating[] = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];

function emptyBuckets(): Record<Rating, number> {
    return { Excellent: 0, Good: 0, Fair: 0, Poor: 0, Critical: 0 };
}

function summarize(scores: number[], cfg: RiskConfig, scope: ScoreDistribution['scope']): ScoreDistribution {
    if (scores.length === 0) {
        return {
            scope,
            buckets: BANDS_ORDER.map((band) => ({ band, count: 0, pct: 0 })),
            total: 0, median: 0, p10: 0, p90: 0,
        };
    }
    const counts = emptyBuckets();
    for (const s of scores) counts[ratingForScore(s, cfg)] += 1;
    const total = scores.length;
    const buckets: ScoreDistributionBucket[] = BANDS_ORDER.map((band) => ({
        band,
        count: counts[band],
        pct: Math.round((counts[band] / total) * 1000) / 10,
    }));
    const sorted = [...scores].sort((a, b) => a - b);
    const pick = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
    return {
        scope,
        buckets,
        total,
        median: pick(0.5),
        p10: pick(0.1),
        p90: pick(0.9),
    };
}

export function driverDistribution(carrierId: string, cfg: RiskConfig): ScoreDistribution {
    const drivers = CARRIER_DRIVERS[carrierId] ?? [];
    const scores = drivers.map((d) => scoreDriver(carrierId, d.id, cfg).safetyScore);
    return summarize(scores, cfg, 'driver');
}

export function assetDistribution(carrierId: string, cfg: RiskConfig): ScoreDistribution {
    const assets = CARRIER_ASSETS[carrierId] ?? [];
    const scores = assets.map((a) => scoreAsset(carrierId, a.id, cfg).safetyScore);
    return summarize(scores, cfg, 'asset');
}

export function driverAssetDistribution(carrierId: string, cfg: RiskConfig): ScoreDistribution {
    // Sample only existing pairings — guard against quadratic blowup on big fleets.
    const drivers = (CARRIER_DRIVERS[carrierId] ?? []).slice(0, 25);
    const assets = (CARRIER_ASSETS[carrierId] ?? []).slice(0, 25);
    const scores: number[] = [];
    for (const d of drivers) {
        for (const a of assets) {
            // Skip the all-pairs cartesian — only score pairs the carrier
            // actually runs together would require an assignment table.
            // Until we have one, use a deterministic 1:1 round-robin.
            if (drivers.indexOf(d) % 5 !== assets.indexOf(a) % 5) continue;
            scores.push(scoreDriver(carrierId, d.id, cfg).safetyScore * 0.5
                      + scoreAsset(carrierId, a.id, cfg).safetyScore * 0.5);
        }
    }
    return summarize(scores, cfg, 'driverAsset');
}
