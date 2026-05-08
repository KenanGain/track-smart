/**
 * Source-level normalizers and recency / exposure helpers.
 *
 * Spec: docs/SAFETY.md §5 (Source Normalization), §6 (Recency / Decay / Exposure),
 *       §7 (Confidence).
 *
 * All functions are pure. Settings flow in explicitly so the same input
 * always produces the same output for a given config.
 */

import type {
    Confidence,
    NscJurisdiction,
    RegulatorySource,
    RiskConfig,
    RiskEvent,
    SourceScore,
} from './risk-engine.types';
import { getCarrierProfileFor, getNscAbProfileFor, getNscBcProfileFor, getNscPeProfileFor, getNscNsProfileFor } from '@/data/carrier-safety-data';

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// ── Recency decay ────────────────────────────────────────────────────────────

/** Days between two YYYY-MM-DD strings (lhs after rhs → positive). */
export function daysBetween(later: string, earlier: string): number {
    const a = new Date(later).getTime();
    const b = new Date(earlier).getTime();
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.max(0, Math.floor((a - b) / 86_400_000));
}

/** Multiplier applied to an event's severity based on its age in days. */
export function recencyWeight(daysAgo: number, cfg: RiskConfig): number {
    const r = cfg.recency;
    if (daysAgo > r.hardCutoffMonths * 30) return 0;
    let step: number;
    if (daysAgo <= 6 * 30) step = r.step0to6;
    else if (daysAgo <= 12 * 30) step = r.step6to12;
    else if (daysAgo <= 24 * 30) step = r.step12to24;
    else step = 0;
    const half = Math.pow(0.5, daysAgo / (r.halfLifeMonths * 30));
    return step * half;
}

// ── Confidence buckets ───────────────────────────────────────────────────────

export function bucketConfidence(eventCount: number, minHigh: number): Confidence {
    if (eventCount >= minHigh) return 'high';
    if (eventCount >= 1) return 'medium';
    return 'low';
}

// ── FMCSA SMS source score ──────────────────────────────────────────────────

export function scoreFmcsa(carrierId: string, events: RiskEvent[], cfg: RiskConfig): SourceScore {
    const profile = getCarrierProfileFor(carrierId);
    const basics = (profile.basicStatus ?? []).filter((b) => b.category && b.category !== 'Others');

    if (basics.length === 0) {
        return neutralSourceScore('fmcsa', cfg, 'No FMCSA BASIC data on file.');
    }

    const safetyParts: number[] = [];
    let alerts = 0;
    for (const b of basics) {
        const pStr = typeof b.percentile === 'string'
            ? b.percentile.replace('%', '').trim()
            : String(b.percentile ?? '');
        const pNum = pStr === '' ? null : Number(pStr);
        if (pNum == null || Number.isNaN(pNum)) continue;
        safetyParts.push(clamp(100 - pNum));
        if (b.alert) alerts += 1;
    }
    const safety = safetyParts.length
        ? clamp(safetyParts.reduce((a, b) => a + b, 0) / safetyParts.length)
        : cfg.confidence.lowConfidenceNeutralSafety;
    const fmcsaEventCount = events.filter((e) => e.source === 'fmcsa').length;

    const confidence: Confidence = safetyParts.length >= 4 ? 'high'
        : safetyParts.length >= 2 ? 'medium' : 'low';

    return {
        source: 'fmcsa',
        safetyScore: round1(safety),
        riskScore: round1(100 - safety),
        nativeScore: safetyParts.length
            ? round1(safetyParts.reduce((a, b) => a + b, 0) / safetyParts.length)
            : undefined,
        nativeLabel: 'BASIC mean (100 − %ile)',
        confidence,
        eventCount: fmcsaEventCount,
        explanation: alerts > 0
            ? `${alerts} BASIC alert${alerts === 1 ? '' : 's'} active.`
            : 'No BASIC alerts.',
    };
}

// ── CVOR source score ───────────────────────────────────────────────────────

export function scoreCvor(carrierId: string, events: RiskEvent[], cfg: RiskConfig): SourceScore {
    const profile = getCarrierProfileFor(carrierId);
    const a = profile?.cvorAnalysis;
    if (!a) return neutralSourceScore('cvor', cfg, 'No CVOR data on file.');
    const native = a.rating;
    const safety = clamp(100 - native);
    const cvorEventCount = events.filter((e) => e.source === 'cvor').length;
    return {
        source: 'cvor',
        safetyScore: round1(safety),
        riskScore: round1(100 - safety),
        nativeScore: round1(native),
        nativeLabel: 'CVOR rating %',
        confidence: 'high',
        eventCount: cvorEventCount,
        explanation: native >= 50 ? 'Rating above 50% — investigate components.' : 'Rating within healthy range.',
    };
}

// ── NSC source scores ───────────────────────────────────────────────────────

export function scoreNscAb(carrierId: string, events: RiskEvent[], cfg: RiskConfig): SourceScore {
    const p = getNscAbProfileFor(carrierId);
    const stage = p?.monitoringStage ?? 'Not Monitored';
    const map = cfg.nsc.ab.stageSafety;
    const safety = stage === 'Stage 4' ? map.stage4
        : stage === 'Stage 3' ? map.stage3
        : stage === 'Stage 2' ? map.stage2
        : stage === 'Stage 1' ? map.stage1
        : map.notMonitored;
    const ec = events.filter((e) => e.source === 'nsc:AB').length;
    return {
        source: 'nsc:AB',
        safetyScore: round1(safety),
        riskScore: round1(100 - safety),
        nativeScore: p?.rFactor,
        nativeLabel: `R-Factor / ${stage}`,
        confidence: 'high',
        eventCount: ec,
        explanation: `Alberta monitoring: ${stage}.`,
    };
}

export function scoreNscBc(carrierId: string, events: RiskEvent[], cfg: RiskConfig): SourceScore {
    const p = getNscBcProfileFor(carrierId);
    const status = p?.certificate?.profileStatus ?? 'Unrated';
    const map = cfg.nsc.bc;
    const safety = status === 'Satisfactory' ? map.satisfactory
        : status === 'Conditional' ? map.conditional
        : status === 'Unsatisfactory' ? map.unsatisfactory
        : map.unrated;
    const ec = events.filter((e) => e.source === 'nsc:BC').length;
    return {
        source: 'nsc:BC',
        safetyScore: round1(safety),
        riskScore: round1(100 - safety),
        nativeScore: p?.complianceReview?.totalScore,
        nativeLabel: `BC profile (${status})`,
        confidence: 'high',
        eventCount: ec,
        explanation: `British Columbia status: ${status}.`,
    };
}

export function scoreNscPe(carrierId: string, events: RiskEvent[], cfg: RiskConfig): SourceScore {
    const p = getNscPeProfileFor(carrierId);
    const s = p?.summary as { collisionPoints: number; convictionPoints: number; inspectionPoints: number; currentActiveVehicles: number } | undefined;
    if (!s) return neutralSourceScore('nsc:PE', cfg, 'No PEI NSC data on file.');
    const total = s.collisionPoints + s.convictionPoints + s.inspectionPoints;
    const ppv = total / Math.max(1, s.currentActiveVehicles);
    const safety = clamp(100 - clamp(ppv * cfg.nsc.pe.pointsPerVehicleMultiplier));
    const ec = events.filter((e) => e.source === 'nsc:PE').length;
    return {
        source: 'nsc:PE',
        safetyScore: round1(safety),
        riskScore: round1(100 - safety),
        nativeScore: round1(ppv),
        nativeLabel: 'Points / active vehicle',
        confidence: 'high',
        eventCount: ec,
        explanation: `${total} total points across ${s.currentActiveVehicles} vehicles.`,
    };
}

export function scoreNscNs(carrierId: string, events: RiskEvent[], cfg: RiskConfig): SourceScore {
    const p = getNscNsProfileFor(carrierId);
    if (!p) return neutralSourceScore('nsc:NS', cfg, 'No Nova Scotia NSC data on file.');
    const total = (p.convictionScore ?? 0) + (p.inspectionScore ?? 0) + (p.collisionScore ?? 0);
    const map = cfg.nsc.ns;
    const safety = total <= (p.scoreLevel1 ?? 0) ? map.level1Safety
        : total <= (p.scoreLevel2 ?? 0) ? map.level2Safety
        : total <= (p.scoreLevel3 ?? 0) ? map.level3Safety
        : map.level4Safety;
    const ec = events.filter((e) => e.source === 'nsc:NS').length;
    return {
        source: 'nsc:NS',
        safetyScore: round1(safety),
        riskScore: round1(100 - safety),
        nativeScore: round1(total),
        nativeLabel: 'NS total score',
        confidence: 'high',
        eventCount: ec,
        explanation: `Score ${round1(total)} across NS thresholds.`,
    };
}

// ── Available-only blending ─────────────────────────────────────────────────

/** Pick the source scorers a carrier is eligible for, based on enrolment.
 *  Caller supplies a snapshot of which sources are enrolled. */
export function blendRegulatory(
    sourceScores: SourceScore[],
    cfg: RiskConfig,
): { score: number; confidence: Confidence; usedSources: RegulatorySource[] } {
    const usable = sourceScores.filter((s) => s.eventCount > 0 || s.nativeScore != null);
    if (usable.length === 0) {
        return {
            score: cfg.confidence.lowConfidenceNeutralSafety,
            confidence: 'low',
            usedSources: [],
        };
    }
    const w = cfg.regulatory.weights;
    const home = cfg.regulatory.homeJurisdiction;

    function rawWeight(s: SourceScore): number {
        if (s.source === 'fmcsa') return w.fmcsa;
        if (s.source === 'cvor')  return w.cvor;
        const jur = (s.source.split(':')[1] ?? '') as NscJurisdiction;
        if (home && jur === home) return w.nscHome;
        return w.nscOther;
    }

    let totalW = 0;
    let weighted = 0;
    for (const s of usable) {
        const wi = rawWeight(s);
        totalW += wi;
        weighted += s.safetyScore * wi;
    }
    const score = totalW > 0 ? weighted / totalW : cfg.confidence.lowConfidenceNeutralSafety;

    const confidence: Confidence = usable.length >= 2 ? 'high'
        : usable.some((s) => s.confidence === 'high') ? 'medium' : 'low';

    return {
        score: round1(clamp(score)),
        confidence,
        usedSources: usable.map((s) => s.source),
    };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round1(n: number): number {
    return Math.round(n * 10) / 10;
}

function neutralSourceScore(
    source: RegulatorySource,
    cfg: RiskConfig,
    explanation: string,
): SourceScore {
    return {
        source,
        safetyScore: cfg.confidence.lowConfidenceNeutralSafety,
        riskScore: 100 - cfg.confidence.lowConfidenceNeutralSafety,
        confidence: 'low',
        eventCount: 0,
        explanation,
    };
}
