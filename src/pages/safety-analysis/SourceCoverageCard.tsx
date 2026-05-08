/**
 * Source Coverage card — Overview tab.
 *
 * Spec extension: P2 from the user roadmap.
 *
 * For every regulatory + internal source, surface:
 *   • Enrolment status (FMCSA / CVOR / each NSC jurisdiction)
 *   • hasData flag from the carrier-compliance store
 *   • Event count contributed to this carrier's ledger
 *   • Native source score (FMCSA percentile mean, CVOR rating %, NSC stage/level)
 *     alongside the normalized 0–100 safety score
 *   • Newest + oldest event date (data freshness)
 *
 * Pure-presentational; data assembly happens in the parent.
 */

import { useMemo } from 'react';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCarrierCompliance } from '@/data/useCarrierCompliance';
import { loadRiskEventsForCarrier } from './risk-load';
import { useRiskScore } from './risk-store';
import type { SourceScore, RiskEvent } from './risk-engine.types';

interface Props {
    carrierId: string;
}

export function SourceCoverageCard({ carrierId }: Props) {
    const compliance = useCarrierCompliance(carrierId);
    const score = useRiskScore({ kind: 'carrier', carrierId }, carrierId);
    const events = useMemo(() => loadRiskEventsForCarrier(carrierId), [carrierId]);

    // Group events by source for stats.
    const stats = useMemo(() => groupBySource(events), [events]);

    const rows = useMemo(() => buildRows(score.sourceScores, stats, compliance), [score.sourceScores, stats, compliance]);

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-900">Source coverage</h3>
                <span className="text-[11px] text-slate-500">
                    {rows.filter((r) => r.enrolled).length} enrolled · {events.length} total events
                </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
                Every regulatory and internal source feeding the engine, with event counts and native scores.
                Sources without data warn rather than score.
            </p>
            <div className="overflow-auto">
                <table className="w-full text-sm">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-500 bg-slate-50">
                        <tr>
                            <th className="text-left px-3 py-2 font-semibold">Source</th>
                            <th className="text-left px-3 py-2 font-semibold">Status</th>
                            <th className="text-right px-3 py-2 font-semibold">Events</th>
                            <th className="text-right px-3 py-2 font-semibold">Native</th>
                            <th className="text-right px-3 py-2 font-semibold">Normalized</th>
                            <th className="text-left px-3 py-2 font-semibold">Newest</th>
                            <th className="text-left px-3 py-2 font-semibold">Oldest</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map((r) => (
                            <tr key={r.label} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-800">{r.label}</td>
                                <td className="px-3 py-2"><StatusPill status={r.status} /></td>
                                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{r.eventCount}</td>
                                <td className="px-3 py-2 text-right text-xs">
                                    {r.nativeLabel ? (
                                        <span className="text-slate-700">
                                            <b>{r.nativeScore}</b>
                                            <span className="text-slate-400 ml-1">{r.nativeLabel}</span>
                                        </span>
                                    ) : <span className="text-slate-400">—</span>}
                                </td>
                                <td className={cn(
                                    'px-3 py-2 text-right tabular-nums font-bold',
                                    r.normalizedScore == null ? 'text-slate-400'
                                        : r.normalizedScore >= 70 ? 'text-emerald-700'
                                        : r.normalizedScore >= 55 ? 'text-amber-700'
                                        : 'text-rose-700',
                                )}>
                                    {r.normalizedScore == null ? '—' : r.normalizedScore.toFixed(1)}
                                </td>
                                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.newestDate ?? '—'}</td>
                                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{r.oldestDate ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusPill({ status }: { status: Row['status'] }) {
    if (status === 'enrolled-data') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Enrolled · data
            </span>
        );
    }
    if (status === 'enrolled-empty') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                <AlertCircle className="w-3 h-3" /> Enrolled · empty
            </span>
        );
    }
    if (status === 'not-enrolled') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                <XCircle className="w-3 h-3" /> Not enrolled
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
            <CheckCircle2 className="w-3 h-3" /> Active
        </span>
    );
}

// ── Internals ───────────────────────────────────────────────────────────────

interface Row {
    label: string;
    status: 'enrolled-data' | 'enrolled-empty' | 'not-enrolled' | 'internal';
    enrolled: boolean;
    eventCount: number;
    nativeScore?: number | string;
    nativeLabel?: string;
    normalizedScore?: number;
    newestDate?: string;
    oldestDate?: string;
}

interface SourceStat {
    count: number;
    newest?: string;
    oldest?: string;
}

function groupBySource(events: RiskEvent[]): Record<string, SourceStat> {
    const out: Record<string, SourceStat> = {};
    for (const e of events) {
        let s = out[e.source];
        if (!s) { s = { count: 0 }; out[e.source] = s; }
        s.count += 1;
        if (!s.newest || e.date > s.newest) s.newest = e.date;
        if (!s.oldest || e.date < s.oldest) s.oldest = e.date;
    }
    return out;
}

function buildRows(
    sourceScores: SourceScore[],
    stats: Record<string, SourceStat>,
    compliance: ReturnType<typeof useCarrierCompliance>,
): Row[] {
    const norm = new Map(sourceScores.map((s) => [s.source, s] as const));
    const rows: Row[] = [];

    // Regulatory
    rows.push(buildReg('FMCSA', 'fmcsa',
        Boolean(compliance?.fmcsa.enabled), Boolean(compliance?.fmcsa.hasData),
        stats['fmcsa'], norm.get('fmcsa')));
    rows.push(buildReg('CVOR (Ontario)', 'cvor',
        Boolean(compliance?.cvor.enabled), Boolean(compliance?.cvor.hasData),
        stats['cvor'], norm.get('cvor')));
    for (const jur of ['AB', 'BC', 'PE', 'NS'] as const) {
        const enrol = compliance?.nsc.find((n) => n.jurisdiction === jur);
        rows.push(buildReg(`NSC ${jur}`, `nsc:${jur}`,
            Boolean(enrol?.enabled), Boolean(enrol?.hasData),
            stats[`nsc:${jur}`], norm.get(`nsc:${jur}`)));
    }

    // Internal — always "active" (not enrolment-gated)
    const internals: Array<[string, string]> = [
        ['Internal · Incidents',   'internal:incident'],
        ['Internal · HOS / ELD',   'internal:hos'],
        ['Internal · VEDR',        'internal:vedr'],
        ['Internal · Maintenance', 'internal:maintenance'],
        ['Internal · Training',    'internal:training'],
        ['Internal · Documents',   'internal:document'],
    ];
    for (const [label, key] of internals) {
        const stat = stats[key];
        rows.push({
            label,
            status: 'internal',
            enrolled: true,
            eventCount: stat?.count ?? 0,
            newestDate: stat?.newest,
            oldestDate: stat?.oldest,
        });
    }

    return rows;
}

function buildReg(
    label: string,
    _key: string,
    enabled: boolean,
    hasData: boolean,
    stat: SourceStat | undefined,
    normalized: SourceScore | undefined,
): Row {
    let status: Row['status'];
    if (!enabled) status = 'not-enrolled';
    else if (!hasData || (stat?.count ?? 0) === 0) status = 'enrolled-empty';
    else status = 'enrolled-data';

    return {
        label,
        status,
        enrolled: enabled,
        eventCount: stat?.count ?? 0,
        nativeScore: normalized?.nativeScore != null
            ? typeof normalized.nativeScore === 'number'
                ? round1(normalized.nativeScore).toString()
                : String(normalized.nativeScore)
            : undefined,
        nativeLabel: normalized?.nativeLabel,
        normalizedScore: normalized?.safetyScore,
        newestDate: stat?.newest,
        oldestDate: stat?.oldest,
    };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
