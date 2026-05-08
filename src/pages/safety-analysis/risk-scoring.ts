/**
 * Entity scorers — one per scope.
 *
 * Spec: docs/SAFETY.md §8 (Score Calculation by Scope).
 *
 * Pipeline (every scope):
 *   collect → filter(scope) → normalize(severity)
 *   → applyDecay(weight) → applyExposure
 *   → groupByDomain → componentScore
 *   → weightedCombine(componentWeights[scope])
 *   → clamp(0..100)
 *   → attachContributors + recommendations + confidence
 */

import type {
    ComponentScore,
    Confidence,
    EntityRiskScore,
    RiskConfig,
    RiskContribution,
    RiskDomain,
    RiskEvent,
    RiskScope,
    SourceScore,
} from './risk-engine.types';
import { hashRiskConfig, ratingForScore } from './risk-config';
import {
    blendRegulatory,
    daysBetween,
    recencyWeight,
    scoreCvor,
    scoreFmcsa,
    scoreNscAb,
    scoreNscBc,
    scoreNscNs,
    scoreNscPe,
} from './risk-normalizers';
import {
    eventsForAsset,
    eventsForDriver,
    eventsForDriverAsset,
    loadRiskEventsForCarrier,
} from './risk-load';
import { getCarrierCompliance } from '@/data/useCarrierCompliance';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { recommendationsFor } from './risk-explain';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round1 = (n: number): number => Math.round(n * 10) / 10;

// ── Public entry ─────────────────────────────────────────────────────────────

/** Compute the score for any scope. Single entry point used by UI / exports. */
export function computeRiskScore(scope: RiskScope, cfg: RiskConfig): EntityRiskScore {
    switch (scope.kind) {
        case 'carrier':            return scoreCarrier(scope.carrierId, cfg);
        case 'driver':             return scoreDriver(scope.carrierId, scope.driverId, cfg);
        case 'asset':              return scoreAsset(scope.carrierId, scope.assetId, cfg);
        case 'driverAsset':        return scoreDriverAsset(scope.carrierId, scope.driverId, scope.assetId, cfg);
        case 'carrierDriver':      return scoreCarrierDriver(scope.carrierId, scope.driverId, cfg);
        case 'carrierAsset':       return scoreCarrierAsset(scope.carrierId, scope.assetId, cfg);
        case 'carrierDriverAsset': return scoreCarrierDriverAsset(scope.carrierId, scope.driverId, scope.assetId, cfg);
    }
}

// ── Carrier (root scope) ─────────────────────────────────────────────────────

export function scoreCarrier(carrierId: string, cfg: RiskConfig): EntityRiskScore {
    const events = loadRiskEventsForCarrier(carrierId);
    const today = todayIso();
    const compliance = getCarrierCompliance(carrierId);

    const sources = collectSourceScores(carrierId, events, cfg, compliance);
    const reg = blendRegulatory(sources, cfg);

    const incidents = domainComponent(events, ['crash', 'collision'], cfg, today);
    const inspectionsOos = domainComponent(events, ['inspection', 'vehicleMaintenance'], cfg, today, /*oosOnly*/ true);
    const driverAgg = aggregateAcross(carrierId, cfg, 'driver');
    const assetAgg = aggregateAcross(carrierId, cfg, 'asset');

    const w = cfg.components.carrier;
    const components: ComponentScore[] = [
        mkComp('regulatory', 'Regulatory', reg.score, w.regulatory, 0, reg.confidence),
        mkComp('incidents', 'Incidents', incidents.score, w.incidents, incidents.count, incidents.confidence),
        mkComp('inspectionsOos', 'Inspections / OOS', inspectionsOos.score, w.inspectionsOos, inspectionsOos.count, inspectionsOos.confidence),
        mkComp('driverAggregate', 'Driver aggregate', driverAgg.score, w.driverAggregate, driverAgg.count, driverAgg.confidence),
        mkComp('assetAggregate', 'Asset aggregate', assetAgg.score, w.assetAggregate, assetAgg.count, assetAgg.confidence),
    ];

    const safety = clamp(weightedCombine(components));
    const overallConfidence = combineConfidences(components.map((c) => c.confidence));
    const baseRating = ratingForScore(safety, cfg);
    const override = checkCriticalOverrides(events, cfg, sources);
    const rating = override ? 'Critical' : baseRating;

    return finalize({
        scope: { kind: 'carrier', carrierId },
        events,
        sources,
        components,
        safety,
        rating,
        confidence: overallConfidence,
        cfg,
        criticalOverride: override,
    });
}

// ── Driver ──────────────────────────────────────────────────────────────────

export function scoreDriver(carrierId: string, driverId: string, cfg: RiskConfig): EntityRiskScore {
    const all = loadRiskEventsForCarrier(carrierId);
    const events = eventsForDriver(all, driverId);
    const today = todayIso();

    const driverEv = domainComponent(events, ['unsafeDriving', 'driverFitness', 'conviction'], cfg, today);
    const hos = domainComponent(events.filter((e) => e.source !== 'internal:vedr'), ['hos'], cfg, today);
    const tele = domainComponent(events.filter((e) => e.source === 'internal:vedr'), ['unsafeDriving'], cfg, today);
    const roadside = domainComponent(events.filter((e) => e.kind === 'inspection' || e.kind === 'violation'), ['inspection', 'vehicleMaintenance'], cfg, today);
    const incidents = domainComponent(events, ['crash', 'collision'], cfg, today);
    const training = domainComponent(events, ['training', 'documentCompliance'], cfg, today);

    const w = cfg.components.driver;
    const components: ComponentScore[] = [
        mkComp('events', 'Driver events', driverEv.score, w.events, driverEv.count, driverEv.confidence),
        mkComp('hos', 'HOS / ELD', hos.score, w.hos, hos.count, hos.confidence),
        mkComp('telematics', 'Telematics / VEDR', tele.score, w.telematics, tele.count, tele.confidence),
        mkComp('roadside', 'Roadside inspections', roadside.score, w.roadside, roadside.count, roadside.confidence),
        mkComp('incidents', 'Incidents', incidents.score, w.incidents, incidents.count, incidents.confidence),
        mkComp('training', 'Training / docs', training.score, w.training, training.count, training.confidence),
    ];

    const safety = clamp(weightedCombine(components));
    const baseRating = ratingForScore(safety, cfg);
    const confidence = driverConfidence(events, cfg);

    return finalize({
        scope: { kind: 'driver', carrierId, driverId },
        events,
        sources: [],
        components,
        safety,
        rating: baseRating,
        confidence,
        cfg,
    });
}

// ── Asset ───────────────────────────────────────────────────────────────────

export function scoreAsset(carrierId: string, assetId: string, cfg: RiskConfig): EntityRiskScore {
    const all = loadRiskEventsForCarrier(carrierId);
    const events = eventsForAsset(all, assetId);
    const today = todayIso();

    const statusAge = assetStatusAgeScore(carrierId, assetId, cfg);
    const maint = domainComponent(events, ['assetHealth', 'documentCompliance'], cfg, today);
    const inspectionsOos = domainComponent(events, ['inspection', 'vehicleMaintenance'], cfg, today, /*oosOnly*/ true);
    const violations = domainComponent(events, ['hos', 'unsafeDriving'], cfg, today);
    const incidents = domainComponent(events, ['crash', 'collision'], cfg, today);

    const w = cfg.components.asset;
    const components: ComponentScore[] = [
        mkComp('statusAge', 'Status / age / reg', statusAge.score, w.statusAge, statusAge.count, statusAge.confidence),
        mkComp('maintenance', 'Maintenance / WO', maint.score, w.maintenance, maint.count, maint.confidence),
        mkComp('inspectionsOos', 'Inspections / OOS', inspectionsOos.score, w.inspectionsOos, inspectionsOos.count, inspectionsOos.confidence),
        mkComp('violations', 'Violations', violations.score, w.violations, violations.count, violations.confidence),
        mkComp('incidents', 'Incidents', incidents.score, w.incidents, incidents.count, incidents.confidence),
    ];

    const safety = clamp(weightedCombine(components));
    const confidence = assetConfidence(events, cfg);

    return finalize({
        scope: { kind: 'asset', carrierId, assetId },
        events,
        sources: [],
        components,
        safety,
        rating: ratingForScore(safety, cfg),
        confidence,
        cfg,
    });
}

// ── Combined: Driver + Asset ────────────────────────────────────────────────

export function scoreDriverAsset(
    carrierId: string, driverId: string, assetId: string, cfg: RiskConfig,
): EntityRiskScore {
    const driver = scoreDriver(carrierId, driverId, cfg);
    const asset = scoreAsset(carrierId, assetId, cfg);
    const all = loadRiskEventsForCarrier(carrierId);
    const shared = eventsForDriverAsset(all, driverId, assetId);
    const today = todayIso();
    const sharedComp = shared.length > 0
        ? domainComponent(shared, allDomains(), cfg, today)
        : { score: cfg.confidence.lowConfidenceNeutralSafety, count: 0, confidence: 'low' as Confidence };

    const w = cfg.combined.driverAsset;
    const components: ComponentScore[] = [
        mkComp('driver', 'Driver score', driver.safetyScore, w.driver, driver.eventCount, driver.confidence),
        mkComp('asset', 'Asset score', asset.safetyScore, w.asset, asset.eventCount, asset.confidence),
        mkComp('shared', 'Shared history', sharedComp.score, w.shared, sharedComp.count, sharedComp.confidence),
    ];
    const safety = clamp(weightedCombine(components));
    const confidence = combineConfidences([driver.confidence, asset.confidence, sharedComp.confidence]);

    return finalize({
        scope: { kind: 'driverAsset', carrierId, driverId, assetId },
        events: shared,
        sources: [],
        components,
        safety,
        rating: ratingForScore(safety, cfg),
        confidence,
        cfg,
    });
}

// ── Combined: Carrier + Driver ──────────────────────────────────────────────

export function scoreCarrierDriver(carrierId: string, driverId: string, cfg: RiskConfig): EntityRiskScore {
    const driver = scoreDriver(carrierId, driverId, cfg);
    const carrier = scoreCarrier(carrierId, cfg);
    const reg = carrier.componentScores.find((c) => c.key === 'regulatory')?.safetyScore ?? cfg.confidence.lowConfidenceNeutralSafety;
    const peer = fleetPeerRank(carrierId, driverId, cfg, 'driver');

    const w = cfg.combined.carrierDriver;
    const components: ComponentScore[] = [
        mkComp('driver', 'Driver score', driver.safetyScore, w.driver, driver.eventCount, driver.confidence),
        mkComp('carrierReg', 'Carrier regulatory', reg, w.carrierReg, 0, carrier.confidence),
        mkComp('fleetPeer', 'Fleet peer rank', peer.score, w.fleetPeer, peer.count, peer.confidence),
    ];
    const safety = clamp(weightedCombine(components));

    return finalize({
        scope: { kind: 'carrierDriver', carrierId, driverId },
        events: driver.topContributors.map((c) => ({ ...mockEventFromContribution(c, carrierId, driverId) })),
        sources: carrier.sourceScores,
        components,
        safety,
        rating: ratingForScore(safety, cfg),
        confidence: combineConfidences([driver.confidence, carrier.confidence]),
        cfg,
    });
}

// ── Combined: Carrier + Asset ───────────────────────────────────────────────

export function scoreCarrierAsset(carrierId: string, assetId: string, cfg: RiskConfig): EntityRiskScore {
    const asset = scoreAsset(carrierId, assetId, cfg);
    const carrier = scoreCarrier(carrierId, cfg);
    const reg = carrier.componentScores.find((c) => c.key === 'regulatory')?.safetyScore ?? cfg.confidence.lowConfidenceNeutralSafety;
    const peer = fleetPeerRank(carrierId, assetId, cfg, 'asset');

    const w = cfg.combined.carrierAsset;
    const components: ComponentScore[] = [
        mkComp('asset', 'Asset score', asset.safetyScore, w.asset, asset.eventCount, asset.confidence),
        mkComp('carrierReg', 'Carrier regulatory', reg, w.carrierReg, 0, carrier.confidence),
        mkComp('fleetPeer', 'Fleet peer rank', peer.score, w.fleetPeer, peer.count, peer.confidence),
    ];
    const safety = clamp(weightedCombine(components));

    return finalize({
        scope: { kind: 'carrierAsset', carrierId, assetId },
        events: [],
        sources: carrier.sourceScores,
        components,
        safety,
        rating: ratingForScore(safety, cfg),
        confidence: combineConfidences([asset.confidence, carrier.confidence]),
        cfg,
    });
}

// ── Combined: Carrier + Driver + Asset ──────────────────────────────────────

export function scoreCarrierDriverAsset(
    carrierId: string, driverId: string, assetId: string, cfg: RiskConfig,
): EntityRiskScore {
    const driver = scoreDriver(carrierId, driverId, cfg);
    const asset = scoreAsset(carrierId, assetId, cfg);
    const carrier = scoreCarrier(carrierId, cfg);
    const reg = carrier.componentScores.find((c) => c.key === 'regulatory')?.safetyScore ?? cfg.confidence.lowConfidenceNeutralSafety;
    const all = loadRiskEventsForCarrier(carrierId);
    const shared = eventsForDriverAsset(all, driverId, assetId);
    const today = todayIso();
    const sharedComp = shared.length > 0
        ? domainComponent(shared, allDomains(), cfg, today)
        : { score: cfg.confidence.lowConfidenceNeutralSafety, count: 0, confidence: 'low' as Confidence };

    const w = cfg.combined.triple;
    const components: ComponentScore[] = [
        mkComp('driver', 'Driver', driver.safetyScore, w.driver, driver.eventCount, driver.confidence),
        mkComp('asset', 'Asset', asset.safetyScore, w.asset, asset.eventCount, asset.confidence),
        mkComp('carrierReg', 'Carrier reg.', reg, w.carrierReg, 0, carrier.confidence),
        mkComp('shared', 'Shared history', sharedComp.score, w.shared, sharedComp.count, sharedComp.confidence),
    ];
    const safety = clamp(weightedCombine(components));

    return finalize({
        scope: { kind: 'carrierDriverAsset', carrierId, driverId, assetId },
        events: shared,
        sources: carrier.sourceScores,
        components,
        safety,
        rating: ratingForScore(safety, cfg),
        confidence: combineConfidences([driver.confidence, asset.confidence, carrier.confidence, sharedComp.confidence]),
        cfg,
    });
}

// ── Internals ───────────────────────────────────────────────────────────────

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function allDomains(): RiskDomain[] {
    return [
        'crash', 'unsafeDriving', 'hos', 'vehicleMaintenance', 'driverFitness',
        'controlledSubstance', 'hazmat', 'inspection', 'conviction', 'collision',
        'assetHealth', 'training', 'documentCompliance',
    ];
}

function mkComp(
    key: string, label: string, safetyScore: number,
    weight: number, count: number, confidence: Confidence,
): ComponentScore {
    return {
        key,
        label,
        safetyScore: round1(clamp(safetyScore)),
        weight,
        weighted: round1(clamp(safetyScore) * weight),
        eventCount: count,
        confidence,
    };
}

function weightedCombine(components: ComponentScore[]): number {
    const totalW = components.reduce((a, c) => a + c.weight, 0) || 1;
    const sum = components.reduce((a, c) => a + c.safetyScore * c.weight, 0);
    return round1(sum / totalW);
}

/** Generic domain-component scorer. Scores 100 minus penalty derived from
 *  decayed severity sum, normalized by exposure. */
function domainComponent(
    events: RiskEvent[],
    domains: RiskDomain[],
    cfg: RiskConfig,
    today: string,
    oosOnly = false,
): { score: number; count: number; confidence: Confidence } {
    const matched = events.filter((e) =>
        domains.includes(e.domain) && (oosOnly ? e.oos : true),
    );
    if (matched.length === 0) {
        return {
            score: cfg.confidence.lowConfidenceNeutralSafety,
            count: 0,
            confidence: 'low',
        };
    }
    let penalty = 0;
    for (const e of matched) {
        const days = daysBetween(today, e.date);
        const w = recencyWeight(days, cfg);
        penalty += e.severity * w;
    }
    const exposure = Math.max(1, matched.length); // simple per-event exposure
    const norm = penalty / exposure;
    // 1 unit of severity-weight ≈ 8 points off, capped at 100.
    const score = clamp(100 - norm * 8);
    const confidence: Confidence = matched.length >= cfg.confidence.minDriverEventsHigh ? 'high'
        : matched.length >= 1 ? 'medium' : 'low';
    return { score, count: matched.length, confidence };
}

function aggregateAcross(
    carrierId: string, cfg: RiskConfig, kind: 'driver' | 'asset',
): { score: number; count: number; confidence: Confidence } {
    const ids = (kind === 'driver' ? CARRIER_DRIVERS[carrierId] ?? [] : CARRIER_ASSETS[carrierId] ?? [])
        .map((x) => x.id);
    if (ids.length === 0) {
        return { score: cfg.confidence.lowConfidenceNeutralSafety, count: 0, confidence: 'low' };
    }
    const scores = ids.map((id) => kind === 'driver'
        ? scoreDriver(carrierId, id, cfg).safetyScore
        : scoreAsset(carrierId, id, cfg).safetyScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const conf: Confidence = ids.length >= 5 ? 'high' : ids.length >= 1 ? 'medium' : 'low';
    return { score: round1(clamp(mean)), count: ids.length, confidence: conf };
}

function fleetPeerRank(
    carrierId: string, entityId: string, cfg: RiskConfig, kind: 'driver' | 'asset',
): { score: number; count: number; confidence: Confidence } {
    const list = kind === 'driver' ? CARRIER_DRIVERS[carrierId] ?? [] : CARRIER_ASSETS[carrierId] ?? [];
    if (list.length <= 1) {
        return { score: cfg.confidence.lowConfidenceNeutralSafety, count: list.length, confidence: 'low' };
    }
    const scores = list.map((x) => kind === 'driver'
        ? scoreDriver(carrierId, x.id, cfg).safetyScore
        : scoreAsset(carrierId, x.id, cfg).safetyScore);
    const mine = kind === 'driver'
        ? scoreDriver(carrierId, entityId, cfg).safetyScore
        : scoreAsset(carrierId, entityId, cfg).safetyScore;
    const better = scores.filter((s) => s <= mine).length;
    const pct = (better / scores.length) * 100;
    return { score: round1(pct), count: list.length, confidence: list.length >= 5 ? 'high' : 'medium' };
}

function assetStatusAgeScore(
    carrierId: string, assetId: string, cfg: RiskConfig,
): { score: number; count: number; confidence: Confidence } {
    const asset = (CARRIER_ASSETS[carrierId] ?? []).find((a) => a.id === assetId);
    if (!asset) return { score: cfg.confidence.lowConfidenceNeutralSafety, count: 0, confidence: 'low' };

    let score = 100;
    const status = (asset as { operationalStatus?: string }).operationalStatus ?? 'Active';
    if (status === 'Out of Service') score -= 60;
    else if (status === 'Maintenance') score -= 20;
    else if (status === 'Deactivated') score -= 40;

    const year = (asset as { year?: number }).year;
    if (typeof year === 'number') {
        const age = new Date().getFullYear() - year;
        if (age > 5) score -= Math.min(40, (age - 5) * 5);
    }

    return { score: round1(clamp(score)), count: 1, confidence: 'high' };
}

function driverConfidence(events: RiskEvent[], cfg: RiskConfig): Confidence {
    if (events.length >= cfg.confidence.minDriverEventsHigh) return 'high';
    if (events.length >= 1) return 'medium';
    return 'low';
}

function assetConfidence(events: RiskEvent[], cfg: RiskConfig): Confidence {
    if (events.length >= cfg.confidence.minAssetEventsHigh) return 'high';
    if (events.length >= 1) return 'medium';
    return 'low';
}

function combineConfidences(list: Confidence[]): Confidence {
    if (list.includes('low')) return list.every((c) => c === 'low') ? 'low' : 'medium';
    if (list.includes('medium')) return 'medium';
    return 'high';
}

function collectSourceScores(
    carrierId: string,
    events: RiskEvent[],
    cfg: RiskConfig,
    compliance: ReturnType<typeof getCarrierCompliance>,
): SourceScore[] {
    const out: SourceScore[] = [];
    if (compliance.fmcsa.enabled) out.push(scoreFmcsa(carrierId, events, cfg));
    if (compliance.cvor.enabled) out.push(scoreCvor(carrierId, events, cfg));
    for (const n of compliance.nsc) {
        if (!n.enabled) continue;
        if (n.jurisdiction === 'AB') out.push(scoreNscAb(carrierId, events, cfg));
        else if (n.jurisdiction === 'BC') out.push(scoreNscBc(carrierId, events, cfg));
        else if (n.jurisdiction === 'PE') out.push(scoreNscPe(carrierId, events, cfg));
        else if (n.jurisdiction === 'NS') out.push(scoreNscNs(carrierId, events, cfg));
    }
    return out;
}

function checkCriticalOverrides(
    events: RiskEvent[],
    cfg: RiskConfig,
    sources: SourceScore[],
): EntityRiskScore['criticalOverride'] | undefined {
    const today = todayIso();
    const o = cfg.criticalOverrides;

    if (o.fatalCrash24mo) {
        const found = events.find((e) =>
            (e.kind === 'crash' || e.kind === 'collision')
            && (e.raw as { fatal?: boolean })?.fatal
            && daysBetween(today, e.date) <= 24 * 30);
        if (found) return { rule: 'Fatal crash within 24 months', eventId: found.id };
    }
    if (o.twoOosIn6mo) {
        const oosByAsset = new Map<string, number>();
        for (const e of events) {
            if (e.oos && e.assetId && daysBetween(today, e.date) <= 6 * 30) {
                oosByAsset.set(e.assetId, (oosByAsset.get(e.assetId) ?? 0) + 1);
            }
        }
        const entries = Array.from(oosByAsset.entries());
        const culprit = entries.find(([, n]) => n >= 2);
        if (culprit) return { rule: `2+ OOS in 6 months for asset ${culprit[0]}` };
    }
    if (o.crashIndicatorAlert) {
        const crash = events.find((e) => e.source === 'fmcsa' && e.domain === 'crash' && (e.raw as { alert?: boolean })?.alert);
        if (crash) return { rule: 'FMCSA Crash Indicator BASIC alert' };
    }
    if (o.nscBcUnsatisfactory) {
        const bc = sources.find((s) => s.source === 'nsc:BC');
        if (bc && /Unsatisfactory/i.test(bc.explanation)) return { rule: 'NSC BC Unsatisfactory rating' };
    }
    return undefined;
}

function topContributorsFromEvents(
    events: RiskEvent[], cfg: RiskConfig, parentSafety: number,
): RiskContribution[] {
    const today = todayIso();
    const scored = events.map((e) => {
        const days = daysBetween(today, e.date);
        const w = recencyWeight(days, cfg);
        return { e, weighted: e.severity * w };
    }).filter((x) => x.weighted > 0)
      .sort((a, b) => b.weighted - a.weighted)
      .slice(0, 10);

    const totalWeighted = scored.reduce((a, x) => a + x.weighted, 0) || 1;
    return scored.map(({ e, weighted }) => ({
        eventId: e.id,
        source: e.source,
        domain: e.domain,
        date: e.date,
        title: titleForEvent(e),
        severity: round1(e.severity),
        weighted: round1(weighted),
        pctOfScore: round1((weighted / totalWeighted) * 100 * (1 - parentSafety / 200)),
    }));
}

function titleForEvent(e: RiskEvent): string {
    if (e.kind === 'profile') return `${labelForSource(e.source)} profile signal · ${e.domain}`;
    const verb = e.kind === 'inspection' ? 'Inspection' : e.kind === 'violation' ? 'Violation' : e.kind === 'collision' ? 'Collision' : e.kind === 'conviction' ? 'Conviction' : e.kind === 'crash' ? 'Crash' : e.kind === 'maintenance' ? 'Maintenance overdue' : e.kind === 'training' ? 'Training expiry' : 'Document expiry';
    return `${verb} · ${labelForSource(e.source)}${e.oos ? ' · OOS' : ''}`;
}

function labelForSource(s: RiskEvent['source']): string {
    if (s === 'fmcsa') return 'FMCSA';
    if (s === 'cvor') return 'CVOR';
    if (s.startsWith('nsc:')) return `NSC ${s.slice(4)}`;
    if (s === 'internal:incident') return 'Incident';
    if (s === 'internal:hos') return 'HOS';
    if (s === 'internal:vedr') return 'VEDR';
    if (s === 'internal:maintenance') return 'Maintenance';
    if (s === 'internal:training') return 'Training';
    if (s === 'internal:document') return 'Document';
    return s;
}

function mockEventFromContribution(
    c: RiskContribution, carrierId: string, driverId?: string,
): RiskEvent {
    return {
        id: c.eventId, carrierId, driverId,
        source: c.source, domain: c.domain, kind: 'profile' as const,
        date: c.date, severity: c.severity, points: 0, oos: false,
        confidence: 'medium', raw: c,
    };
}

interface FinalizeArgs {
    scope: RiskScope;
    events: RiskEvent[];
    sources: SourceScore[];
    components: ComponentScore[];
    safety: number;
    rating: EntityRiskScore['rating'];
    confidence: Confidence;
    cfg: RiskConfig;
    criticalOverride?: EntityRiskScore['criticalOverride'];
}

function finalize(a: FinalizeArgs): EntityRiskScore {
    const perJur = perJurisdictionMap(a.events);
    const topContributors = topContributorsFromEvents(a.events, a.cfg, a.safety);
    const recommendations = recommendationsFor(topContributors, a.scope);
    const final = a.criticalOverride
        ? Math.min(a.safety, a.cfg.bands.poorFloor - 0.1)
        : a.safety;
    return {
        scope: a.scope,
        safetyScore: round1(clamp(final)),
        riskScore: round1(100 - clamp(final)),
        rating: a.rating,
        confidence: a.confidence,
        sourceScores: a.sources,
        componentScores: a.components,
        perJurisdiction: perJur,
        topContributors,
        recommendations,
        generatedAt: new Date().toISOString(),
        configHash: hashRiskConfig(a.cfg),
        eventCount: a.events.length,
        criticalOverride: a.criticalOverride,
    };
}

function perJurisdictionMap(events: RiskEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const e of events) {
        // FMCSA events carry the actual US state on the raw payload — fall
        // through to a generic 'US' when missing.
        const jur = jurisdictionForEvent(e);
        if (!jur) continue;
        counts[jur] = (counts[jur] ?? 0) + 1;
    }
    return counts;
}

/** Extract a 2-letter jurisdiction code (US state or CA province) for an event.
 *  Returns undefined when the source provides no geographic anchor. */
export function jurisdictionForEvent(e: RiskEvent): string | undefined {
    if (e.source === 'cvor') return 'ON';
    if (e.source.startsWith('nsc:')) return e.source.slice(4);
    if (e.source === 'fmcsa') {
        const r = e.raw as { state?: string; jurisdiction?: string } | undefined;
        const code = (r?.state ?? r?.jurisdiction ?? '').toString().toUpperCase().trim();
        if (/^[A-Z]{2}$/.test(code)) return code;
        return undefined;
    }
    if (e.source === 'internal:incident') {
        const r = e.raw as { state?: string; location?: string } | undefined;
        const code = (r?.state ?? '').toString().toUpperCase().trim();
        if (/^[A-Z]{2}$/.test(code)) return code;
    }
    return undefined;
}
