/**
 * Per-jurisdiction event aggregation.
 *
 * Spec: docs/SAFETY.md §10.5 (Jurisdiction stacked bar) & map visualization.
 *
 * Pure summarization on top of the canonical event ledger.
 */

import type { RiskEvent } from './risk-engine.types';
import { jurisdictionForEvent } from './risk-scoring';
import { loadRiskEventsForCarrier } from './risk-load';

export interface JurisdictionStats {
    /** Two-letter code (e.g. "TX", "ON", "BC"). */
    code: string;
    /** "US" or "CA" — useful for map filtering. */
    country: 'US' | 'CA';
    eventCount: number;
    oosCount: number;
    severitySum: number;
    /** Average severity across events in this jurisdiction. */
    severityAvg: number;
    /** Most-common source contributing here. */
    topSource?: RiskEvent['source'];
}

const CA_CODES = new Set([
    'AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT',
]);

const US_CODES = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC',
]);

/** Aggregate every event by US-state / CA-province. */
export function aggregateByJurisdiction(events: RiskEvent[]): JurisdictionStats[] {
    const buckets = new Map<string, JurisdictionStats>();
    const sourceCounts = new Map<string, Map<RiskEvent['source'], number>>();

    for (const e of events) {
        const code = jurisdictionForEvent(e);
        if (!code) continue;
        const country: 'US' | 'CA' = CA_CODES.has(code) ? 'CA' : US_CODES.has(code) ? 'US' : 'US';

        let b = buckets.get(code);
        if (!b) {
            b = { code, country, eventCount: 0, oosCount: 0, severitySum: 0, severityAvg: 0 };
            buckets.set(code, b);
            sourceCounts.set(code, new Map());
        }
        b.eventCount += 1;
        if (e.oos) b.oosCount += 1;
        b.severitySum += e.severity;

        const sc = sourceCounts.get(code)!;
        sc.set(e.source, (sc.get(e.source) ?? 0) + 1);
    }

    for (const [code, b] of buckets) {
        b.severityAvg = b.eventCount > 0 ? b.severitySum / b.eventCount : 0;
        let topSrc: RiskEvent['source'] | undefined;
        let topN = 0;
        for (const [s, n] of sourceCounts.get(code) ?? []) {
            if (n > topN) { topSrc = s; topN = n; }
        }
        b.topSource = topSrc;
    }

    return Array.from(buckets.values()).sort((a, b) => b.eventCount - a.eventCount);
}

export function loadJurisdictionStatsForCarrier(carrierId: string): JurisdictionStats[] {
    return aggregateByJurisdiction(loadRiskEventsForCarrier(carrierId));
}

/** Monthly trend: recompute aggregate event counts per ISO YYYY-MM bucket. */
export interface MonthlyTrendPoint {
    month: string;        // YYYY-MM
    events: number;
    oos: number;
    severityAvg: number;
}

export function monthlyTrend(events: RiskEvent[], months = 12): MonthlyTrendPoint[] {
    const out: MonthlyTrendPoint[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        out.push({ month: key, events: 0, oos: 0, severityAvg: 0 });
    }
    const byKey = new Map(out.map((p, i) => [p.month, i] as const));

    let sevSum = new Map<string, number>();
    for (const e of events) {
        const key = e.date.slice(0, 7);
        const idx = byKey.get(key);
        if (idx === undefined) continue;
        out[idx].events += 1;
        if (e.oos) out[idx].oos += 1;
        sevSum.set(key, (sevSum.get(key) ?? 0) + e.severity);
    }
    for (const p of out) {
        p.severityAvg = p.events > 0 ? (sevSum.get(p.month) ?? 0) / p.events : 0;
    }
    return out;
}

/** Per-domain safety score (0..100, higher = safer). Used by the radar chart. */
export interface DomainBreakdown {
    domain: string;
    safetyScore: number;
    eventCount: number;
}

export function domainBreakdown(events: RiskEvent[]): DomainBreakdown[] {
    const domains = ['crash', 'unsafeDriving', 'hos', 'vehicleMaintenance', 'driverFitness', 'inspection', 'training', 'documentCompliance'] as const;
    return domains.map((d) => {
        const matched = events.filter((e) => e.domain === d);
        if (matched.length === 0) return { domain: d, safetyScore: 80, eventCount: 0 };
        const meanSev = matched.reduce((a, b) => a + b.severity, 0) / matched.length;
        return {
            domain: d,
            safetyScore: Math.max(0, Math.min(100, Math.round(100 - meanSev * 10))),
            eventCount: matched.length,
        };
    });
}
