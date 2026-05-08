/**
 * Safety Forecast — multi-page A4 PDF report.
 *
 * Spec: docs/SAFETY_EXPORT_PLAN.md §3.3.
 *
 * Pattern: same as FmcsaPdfReport — every page is `<div className="pdf-page">`
 * captured by html2canvas at 2× → jsPDF compose. No Tailwind classes (inline
 * styles serialise reliably through html2canvas).
 *
 * Pages — sections without supporting data are skipped, page numbers update:
 *   1. Cover
 *   2. Executive summary + score
 *   3. Forecast chart + trend commentary
 *   4. Alerts
 *   5. Hotspots (top jurisdictions)
 *   6. Top high-risk drivers
 *   7. Maintenance forecast
 *   8. Recommendations
 *   9. Methodology + filter lineage
 */

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Line, Area, ReferenceLine, ComposedChart,
} from 'recharts';

import type {
    EntityRiskScore,
    RiskConfig,
} from './risk-engine.types';
import type { ForecastSummary } from './risk-forecast';
import type {
    DriverIncidentForecast,
    JurisdictionHotspotForecast,
} from './risk-incident-forecast';
import type { MaintenanceForecastItem } from './risk-maintenance-forecast';
import type { ForecastFilters } from './risk-filters';
import { describeHorizon, summarizeFilters, describeTimeline } from './risk-filters';
import { renderNarrative, tokenizeNarrative, type NarrativeVars } from './risk-narratives';
import { DEFAULT_RISK_CONFIG } from './risk-config';

// ── Page geometry ───────────────────────────────────────────────────────────

const A4_W = 794;
const A4_H = 1123;
const PAGE_PAD_X = 56;
const PAGE_PAD_TOP = 40;
const PAGE_PAD_BOT = 44;

const C = {
    ink: '#0b1320',
    body: '#1f2937',
    muted: '#5b6573',
    soft: '#94a3b8',
    line: '#e6e8ec',
    softer: '#f3f4f7',
    softBg: '#fafbfc',
    accent: '#0f2748',
    accentSoft: '#e7ecf3',
    gold: '#a37016',
    red: '#b91c1c',
    redSoft: '#fdecec',
    amber: '#92611a',
    amberSoft: '#fbf3df',
    green: '#13715b',
    greenSoft: '#e3f2ec',
    blue: '#0369a1',
    blueSoft: '#e0f2fe',
} as const;

const FONT = `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
const SERIF = `"Source Serif Pro", "Georgia", "Times New Roman", serif`;
const MONO = `"JetBrains Mono", "Consolas", "Menlo", monospace`;

// ── Props ───────────────────────────────────────────────────────────────────

export interface SafetyForecastPdfReportProps {
    carrierName: string;
    carrierId: string;
    accountIdentifiers?: { dot?: string; cvor?: string; nsc?: string };
    forecast: ForecastSummary;
    drivers: DriverIncidentForecast[];
    hotspots: JurisdictionHotspotForecast[];
    maintenance: MaintenanceForecastItem[];
    filters: ForecastFilters;
    /** Snapshot of carrier-level score; used for cover + summary. */
    carrierScore: EntityRiskScore;
    /** Active risk config — drives band thresholds in the chart. */
    riskConfig?: RiskConfig;
    reportDate?: Date;
    /** Optional org branding; falls back to system defaults. */
    org?: { name?: string };
}

// ── Component ───────────────────────────────────────────────────────────────

export function SafetyForecastPdfReport(p: SafetyForecastPdfReportProps) {
    const reportDate = p.reportDate ?? new Date();
    const horizonLabel = describeHorizon(p.forecast.horizonMonths);
    const timelineLabel = describeTimeline(p.filters);

    // Predefined narrative variables resolved once.
    const baseVars: NarrativeVars = {
        carrierName: p.carrierName,
        horizonLabel,
        timelineLabel,
        safetyScore: p.forecast.base.safetyScore,
        rating: p.forecast.base.rating,
        trend: p.forecast.trend,
        slope: p.forecast.slope,
        confidence: p.forecast.confidence,
        r2: round2(p.forecast.r2),
        historicalMonths: p.forecast.history.length,
        predictedViolations: round1(p.drivers.reduce((a, d) => a + d.predictedViolations, 0)),
        predictedAccidents: round1(p.drivers.reduce((a, d) => a + d.predictedAccidents, 0)),
        topJurisdictions: p.hotspots.slice(0, 3).map((h) => h.code),
        topJurisdictionsPct: hotspotConcentration(p.hotspots),
        topDriverNames: p.drivers.slice(0, 3).map((d) => d.driverName),
        highRiskDriverCount: p.drivers.filter((d) => d.riskScore >= 50).length,
        totalDriverCount: p.drivers.length,
        predictedMaintenanceCount: p.maintenance.length,
        overdueMaintenanceCount: p.maintenance.filter((m) => m.status === 'overdue').length,
        topServiceTypes: pickTopServices(p.maintenance),
        alertCount: p.forecast.alerts.length,
        nextAlertTitle: p.forecast.alerts[0]?.title,
        nextAlertDate: p.forecast.alerts[0]?.date,
    };

    // Build the page list dynamically — skip empty sections.
    const pages: Array<{ label: string; node: React.ReactNode }> = [];

    const bands = p.riskConfig?.bands ?? DEFAULT_RISK_CONFIG.bands;

    pages.push({ label: 'Cover', node: <CoverPage {...p} reportDate={reportDate} horizonLabel={horizonLabel} /> });
    pages.push({ label: 'Executive Summary', node: <ExecutivePage vars={baseVars} score={p.carrierScore} forecast={p.forecast} /> });
    pages.push({ label: 'Forecast', node: <ForecastChartPage forecast={p.forecast} vars={baseVars} bands={bands} /> });
    if (p.forecast.alerts.length > 0) {
        pages.push({ label: 'Alerts', node: <AlertsPage forecast={p.forecast} vars={baseVars} /> });
    }
    if (p.hotspots.length > 0) {
        pages.push({ label: 'Hotspots', node: <HotspotsPage hotspots={p.hotspots} vars={baseVars} /> });
    }
    if (p.drivers.some((d) => d.riskScore > 0)) {
        pages.push({ label: 'High-Risk Drivers', node: <DriversPage drivers={p.drivers} vars={baseVars} /> });
    }
    if (p.maintenance.length > 0) {
        pages.push({ label: 'Maintenance', node: <MaintenancePage items={p.maintenance} vars={baseVars} /> });
    }
    if (p.carrierScore.recommendations.length > 0) {
        pages.push({ label: 'Recommendations', node: <RecommendationsPage score={p.carrierScore} vars={baseVars} /> });
    }
    pages.push({ label: 'Methodology', node: <MethodologyPage vars={baseVars} filters={p.filters} forecast={p.forecast} reportDate={reportDate} /> });

    return (
        <div style={{ background: '#ffffff' }}>
            {pages.map((pg, i) => (
                <Page
                    key={i}
                    pageNumber={i + 1}
                    totalPages={pages.length}
                    sectionLabel={pg.label}
                    carrierName={p.carrierName}
                    carrierId={p.carrierId}
                    hideHeader={i === 0}
                >
                    {pg.node}
                </Page>
            ))}
        </div>
    );
}

// ── Page chrome ─────────────────────────────────────────────────────────────

function Page({
    pageNumber, totalPages, sectionLabel, carrierName, carrierId, children, hideHeader,
}: {
    pageNumber: number;
    totalPages: number;
    sectionLabel: string;
    carrierName: string;
    carrierId: string;
    children: React.ReactNode;
    hideHeader?: boolean;
}) {
    return (
        <div
            className="pdf-page"
            style={{
                width: A4_W,
                height: A4_H,
                background: '#ffffff',
                color: C.ink,
                fontFamily: FONT,
                fontSize: 11,
                position: 'relative',
                pageBreakAfter: 'always',
                breakAfter: 'page',
                boxSizing: 'border-box',
                padding: `${hideHeader ? 0 : PAGE_PAD_TOP}px ${PAGE_PAD_X}px ${PAGE_PAD_BOT}px`,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {!hideHeader && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingBottom: 10,
                        marginBottom: 22,
                        borderBottom: `2px solid ${C.accent}`,
                        fontSize: 9,
                        color: C.muted,
                        letterSpacing: 0.5,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 4, height: 22, background: C.accent, borderRadius: 2 }} />
                        <div>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 1.6 }}>
                                Safety Forecast Report
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginTop: 1, letterSpacing: -0.1 }}>
                                {carrierName}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, color: C.ink, fontSize: 10 }}>{sectionLabel}</div>
                        <div style={{ color: C.muted, fontFamily: MONO, fontSize: 9 }}>{carrierId.slice(-12)}</div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {children}
            </div>

            {/* Footer */}
            <div
                style={{
                    position: 'absolute',
                    left: PAGE_PAD_X,
                    right: PAGE_PAD_X,
                    bottom: 18,
                    fontSize: 8.5,
                    color: C.muted,
                    display: 'flex',
                    justifyContent: 'space-between',
                    borderTop: `1px solid ${C.line}`,
                    paddingTop: 8,
                }}
            >
                <span>Generated by TrackSmart · risk-engine</span>
                <span style={{ fontFamily: MONO }}>{pageNumber} / {totalPages}</span>
            </div>
        </div>
    );
}

// ── Page 1 · Cover ──────────────────────────────────────────────────────────

function CoverPage({
    carrierName, carrierId, accountIdentifiers, forecast, filters, reportDate, horizonLabel, org,
}: SafetyForecastPdfReportProps & { reportDate: Date; horizonLabel: string }) {
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: `90px ${PAGE_PAD_X}px 70px`,
        }}>
            <div>
                <div style={{ fontSize: 10, color: C.gold, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase' }}>
                    {org?.name ?? 'TrackSmart'} · Safety Analytics
                </div>
                <div style={{ marginTop: 80 }}>
                    <div style={{ fontSize: 14, color: C.muted, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                        Multi-Source Forecast
                    </div>
                    <div style={{ fontSize: 42, color: C.ink, fontFamily: SERIF, fontWeight: 700, marginTop: 12, lineHeight: 1.1 }}>
                        Safety Risk &<br />Maintenance Forecast
                    </div>
                    <div style={{ fontSize: 16, color: C.body, marginTop: 18, fontWeight: 500 }}>
                        {carrierName}
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 8, color: C.muted, fontSize: 11, flexWrap: 'wrap' }}>
                        {accountIdentifiers?.dot && <span><b style={{ color: C.body }}>DOT</b> {accountIdentifiers.dot}</span>}
                        {accountIdentifiers?.cvor && <span><b style={{ color: C.body }}>CVOR</b> {accountIdentifiers.cvor}</span>}
                        {accountIdentifiers?.nsc && <span><b style={{ color: C.body }}>NSC</b> {accountIdentifiers.nsc}</span>}
                        <span><b style={{ color: C.body }}>ID</b> <span style={{ fontFamily: MONO }}>{carrierId.slice(-12)}</span></span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <CoverFact label="Forecast horizon" value={horizonLabel} />
                <CoverFact label="History window" value={describeTimeline(filters)} />
                <CoverFact label="Generated" value={reportDate.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })} />
                <CoverFact label="Config hash" value={forecast.base.configHash} mono />
            </div>

            <div style={{
                marginTop: 18,
                padding: 14,
                background: C.accentSoft,
                borderLeft: `4px solid ${C.accent}`,
                fontSize: 10.5,
                color: C.body,
                lineHeight: 1.5,
            }}>
                <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4 }}>Active filters</div>
                <div style={{ fontFamily: MONO, fontSize: 10 }}>{summarizeFilters(filters)}</div>
            </div>
        </div>
    );
}

function CoverFact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div style={{
            background: C.softBg,
            border: `1px solid ${C.line}`,
            borderRadius: 6,
            padding: 12,
        }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
            <div style={{
                fontSize: 13,
                color: C.ink,
                marginTop: 4,
                fontWeight: 600,
                fontFamily: mono ? MONO : FONT,
            }}>{value}</div>
        </div>
    );
}

// ── Page 2 · Executive Summary ──────────────────────────────────────────────

function ExecutivePage({
    vars, score, forecast,
}: { vars: NarrativeVars; score: EntityRiskScore; forecast: ForecastSummary }) {
    return (
        <>
            <SectionTitle eyebrow="Executive Summary" title={`Outlook for the next ${vars.horizonLabel}`} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 20, marginTop: 8 }}>
                <NarrativeBlock>
                    {renderNarrative('exec.summary', vars)}
                </NarrativeBlock>
                <ScoreCard score={score} forecast={forecast} />
            </div>

            <div style={{ marginTop: 20 }}>
                <SubTitle>Headline numbers</SubTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    <Stat label="Today" value={`${score.safetyScore.toFixed(1)}`} hint={score.rating} />
                    <Stat label="In horizon" value={forecast.points[forecast.points.length - 1]?.predictedSafety.toFixed(1) ?? '—'} hint="80% lower–upper" />
                    <Stat label="Pred. violations" value={String(vars.predictedViolations ?? 0)} hint="across all drivers" />
                    <Stat label="Pred. accidents" value={String(vars.predictedAccidents ?? 0)} hint="across all drivers" tone={(vars.predictedAccidents ?? 0) >= 1 ? 'red' : 'default'} />
                </div>
            </div>

            <div style={{ marginTop: 18 }}>
                <SubTitle>Confidence</SubTitle>
                <NarrativeBlock muted>{renderNarrative('forecast.confidence', vars)}</NarrativeBlock>
            </div>
        </>
    );
}

function ScoreCard({ score, forecast }: { score: EntityRiskScore; forecast: ForecastSummary }) {
    const ringColor = score.rating === 'Excellent' ? C.green
        : score.rating === 'Good' ? '#84cc16'
        : score.rating === 'Fair' ? '#f59e0b'
        : score.rating === 'Poor' ? '#f97316'
        : C.red;
    return (
        <div style={{
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            padding: 16,
            background: C.softBg,
            textAlign: 'center',
        }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: 700 }}>
                Carrier safety
            </div>
            <div style={{
                fontSize: 56,
                color: ringColor,
                fontWeight: 800,
                marginTop: 6,
                lineHeight: 1,
                fontFamily: SERIF,
            }}>{score.safetyScore.toFixed(0)}</div>
            <div style={{
                marginTop: 8,
                display: 'inline-block',
                padding: '2px 10px',
                fontSize: 10,
                color: ringColor,
                background: `${ringColor}15`,
                border: `1px solid ${ringColor}`,
                borderRadius: 12,
                fontWeight: 700,
                letterSpacing: 0.5,
            }}>
                {score.rating}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 8 }}>
                Trend: <b style={{ color: C.body, textTransform: 'capitalize' }}>{forecast.trend}</b>
            </div>
            <div style={{ fontSize: 9, color: C.muted }}>
                Slope: {forecast.slope >= 0 ? '+' : ''}{forecast.slope.toFixed(2)} pts/mo
            </div>
        </div>
    );
}

// ── Page 3 · Forecast Chart ─────────────────────────────────────────────────

function ForecastChartPage({
    forecast, vars, bands,
}: {
    forecast: ForecastSummary;
    vars: NarrativeVars;
    bands: { excellentFloor: number; goodFloor: number; fairFloor: number; poorFloor: number };
}) {
    const data = [
        ...forecast.history.map((h) => ({
            month: h.month,
            actual: h.predictedSafety,
            forecast: null as number | null,
            lower: null as number | null,
            upper: null as number | null,
        })),
        ...forecast.points.map((p, i) => ({
            month: p.month,
            actual: i === 0 ? p.predictedSafety : null,
            forecast: p.predictedSafety,
            lower: p.lowerBound,
            upper: p.upperBound,
        })),
    ];

    return (
        <>
            <SectionTitle eyebrow="Risk-score forecast" title={`24 mo history → ${vars.horizonLabel} projection`} />
            <NarrativeBlock>{renderNarrative('forecast.trend', vars)}</NarrativeBlock>

            <div style={{ marginTop: 14, padding: 10, border: `1px solid ${C.line}`, borderRadius: 8, background: '#fff' }}>
                <ComposedChart width={A4_W - PAGE_PAD_X * 2 - 24} height={300} data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: C.muted }} stroke={C.soft} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} stroke={C.soft} />
                    <Area dataKey="upper" stroke="none" fill={C.blue} fillOpacity={0.12} isAnimationActive={false} />
                    <Area dataKey="lower" stroke="none" fill="#ffffff" isAnimationActive={false} />
                    <ReferenceLine y={bands.excellentFloor} stroke={C.green}  strokeDasharray="2 4" label={{ value: `Excellent ≥ ${bands.excellentFloor}`, position: 'right', fontSize: 9, fill: C.green }} />
                    <ReferenceLine y={bands.goodFloor}      stroke="#84cc16"   strokeDasharray="2 4" label={{ value: `Good ≥ ${bands.goodFloor}`,           position: 'right', fontSize: 9, fill: '#84cc16' }} />
                    <ReferenceLine y={bands.fairFloor}      stroke={C.amber}   strokeDasharray="2 4" label={{ value: `Fair ≥ ${bands.fairFloor}`,           position: 'right', fontSize: 9, fill: C.amber }} />
                    <ReferenceLine y={bands.poorFloor}      stroke="#f97316"   strokeDasharray="2 4" label={{ value: `Poor ≥ ${bands.poorFloor}`,           position: 'right', fontSize: 9, fill: '#f97316' }} />
                    <Line dataKey="actual" stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line dataKey="forecast" stroke={C.blue} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3, fill: C.blue }} isAnimationActive={false} />
                </ComposedChart>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <Stat label="R²" value={forecast.r2.toFixed(2)} />
                <Stat label="σ residual" value={forecast.residualStd.toFixed(2)} />
                <Stat label="Slope" value={`${forecast.slope >= 0 ? '+' : ''}${forecast.slope.toFixed(2)}`} hint="pts / month" />
                <Stat label="Confidence" value={forecast.confidence} hint={`${forecast.history.length} mo fit`} />
            </div>

            {/* Hard-numbers table for executive readers — exact predicted
                values at key forecast milestones. */}
            <div style={{ marginTop: 14 }}>
                <SubTitle>Predicted score at key milestones</SubTitle>
                <ForecastMilestoneTable forecast={forecast} />
            </div>
        </>
    );
}

function ForecastMilestoneTable({ forecast }: { forecast: ForecastSummary }) {
    const targets = [1, 3, 6, 12, 18, 24, 36, 60];
    const rows = targets
        .filter((m) => m <= forecast.horizonMonths)
        .map((m) => {
            const p = forecast.points.find((x) => x.monthsAhead === m);
            return p ? {
                label: `Month +${m}`,
                date: p.date,
                predicted: p.predictedSafety.toFixed(1),
                lower: p.lowerBound.toFixed(1),
                upper: p.upperBound.toFixed(1),
                events: String(p.predictedEvents),
                oos: String(p.predictedOos),
            } : null;
        })
        .filter((r): r is Exclude<typeof r, null> => r !== null);
    if (rows.length === 0) return null;
    const th: React.CSSProperties = {
        padding: '5px 8px',
        textAlign: 'left',
        fontSize: 9,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        fontWeight: 700,
    };
    return (
        <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 10,
            color: C.body,
            marginTop: 4,
        }}>
            <thead>
                <tr style={{ background: C.accent, color: '#fff' }}>
                    <th style={th}>Milestone</th>
                    <th style={th}>Date</th>
                    <th style={{ ...th, textAlign: 'right' }}>Predicted</th>
                    <th style={{ ...th, textAlign: 'right' }}>Lower 80%</th>
                    <th style={{ ...th, textAlign: 'right' }}>Upper 80%</th>
                    <th style={{ ...th, textAlign: 'right' }}>Events</th>
                    <th style={{ ...th, textAlign: 'right' }}>OOS</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{
                        background: i % 2 === 0 ? '#fff' : C.softBg,
                        borderBottom: `1px solid ${C.line}`,
                    }}>
                        <td style={{ padding: '5px 8px', fontWeight: 700, color: C.ink }}>{r.label}</td>
                        <td style={{ padding: '5px 8px', fontFamily: MONO, fontSize: 9.5, color: C.muted }}>{r.date}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, fontFamily: MONO }}>{r.predicted}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: MONO, color: C.muted }}>{r.lower}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: MONO, color: C.muted }}>{r.upper}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: MONO }}>{r.events}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontFamily: MONO, color: r.oos === '0' ? C.body : C.red }}>{r.oos}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── Page 4 · Alerts ─────────────────────────────────────────────────────────

function AlertsPage({ forecast, vars }: { forecast: ForecastSummary; vars: NarrativeVars }) {
    const groups = {
        urgent: forecast.alerts.filter((a) => a.severity === 'urgent'),
        warn:   forecast.alerts.filter((a) => a.severity === 'warn'),
        info:   forecast.alerts.filter((a) => a.severity === 'info'),
    };
    return (
        <>
            <SectionTitle eyebrow="Forecast Alerts" title="Band-crossing predictions" />
            <NarrativeBlock>{renderNarrative('alerts.summary', vars)}</NarrativeBlock>

            {groups.urgent.length > 0 && (
                <AlertBox
                    title={`Urgent · ${groups.urgent.length} item${groups.urgent.length === 1 ? '' : 's'}`}
                    headerColor={C.red}
                    headerBg={C.redSoft}
                    items={groups.urgent}
                />
            )}
            {groups.warn.length > 0 && (
                <AlertBox
                    title={`Warning · ${groups.warn.length} item${groups.warn.length === 1 ? '' : 's'}`}
                    headerColor={C.amber}
                    headerBg={C.amberSoft}
                    items={groups.warn}
                />
            )}
            {groups.info.length > 0 && (
                <AlertBox
                    title={`Informational · ${groups.info.length}`}
                    headerColor={C.muted}
                    headerBg={C.softBg}
                    items={groups.info}
                />
            )}
        </>
    );
}

function AlertBox({
    title, headerColor, headerBg, items,
}: {
    title: string;
    headerColor: string;
    headerBg: string;
    items: ForecastSummary['alerts'];
}) {
    return (
        <div style={{
            marginTop: 14,
            border: `1.5px solid ${headerColor}`,
            borderRadius: 6,
            overflow: 'hidden',
        }}>
            <div style={{
                background: headerBg,
                padding: '8px 12px',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                color: headerColor,
                textTransform: 'uppercase',
                borderBottom: `1px solid ${headerColor}`,
            }}>{title}</div>
            <div style={{ background: '#fff' }}>
                {items.map((a, i) => (
                    <div key={i} style={{
                        padding: '10px 12px',
                        borderBottom: i < items.length - 1 ? `1px solid ${C.line}` : 'none',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ fontWeight: 700, color: C.ink, fontSize: 11.5 }}>{a.title}</div>
                            <div style={{ fontSize: 9, color: C.muted, fontFamily: MONO }}>{a.date}</div>
                        </div>
                        <div style={{ fontSize: 10.5, color: C.body, marginTop: 3, lineHeight: 1.5 }}>{a.detail}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Page 5 · Hotspots ───────────────────────────────────────────────────────

function HotspotsPage({
    hotspots, vars,
}: { hotspots: JurisdictionHotspotForecast[]; vars: NarrativeVars }) {
    const top = hotspots.slice(0, 12);
    const chartData = top.slice(0, 8).map((h) => ({
        code: h.code,
        Past: h.pastViolations + h.pastAccidents,
        Predicted: h.predictedViolations + h.predictedAccidents,
    }));

    return (
        <>
            <SectionTitle eyebrow="Geographic Hotspots" title="Locations expected to recur" />
            <NarrativeBlock>{renderNarrative('hotspots.intro', vars)}</NarrativeBlock>

            <div style={{ marginTop: 14, padding: 10, border: `1px solid ${C.line}`, borderRadius: 8 }}>
                <BarChart width={A4_W - PAGE_PAD_X * 2 - 24} height={210} data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                    <XAxis dataKey="code" tick={{ fontSize: 9, fill: C.muted }} stroke={C.soft} />
                    <YAxis tick={{ fontSize: 9, fill: C.muted }} stroke={C.soft} />
                    <Bar dataKey="Past" fill={C.muted} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                    <Bar dataKey="Predicted" fill={C.blue} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
            </div>

            <div style={{ marginTop: 12 }}>
                <DataTable
                    headers={['Code', 'Country', 'Past viol.', 'Past acc.', 'Pred. viol.', 'Pred. acc.', 'σ avg', 'Risk', 'Last seen']}
                    rows={top.map((h) => [
                        h.code, h.country,
                        String(h.pastViolations), String(h.pastAccidents),
                        h.predictedViolations.toFixed(1), h.predictedAccidents.toFixed(1),
                        h.avgSeverity.toFixed(1),
                        h.riskScore.toFixed(0),
                        h.lastEventDate ?? '—',
                    ])}
                    emphasizeColumns={[7]}
                />
            </div>
        </>
    );
}

// ── Page 6 · High-risk drivers ──────────────────────────────────────────────

function DriversPage({
    drivers, vars,
}: { drivers: DriverIncidentForecast[]; vars: NarrativeVars }) {
    const top = drivers.filter((d) => d.riskScore > 0).slice(0, 14);
    return (
        <>
            <SectionTitle eyebrow="High-Risk Drivers" title="Top contributors to predicted incidents" />
            <NarrativeBlock>{renderNarrative('drivers.intro', vars)}</NarrativeBlock>
            <div style={{ marginTop: 14 }}>
                <DataTable
                    headers={['Driver', 'Licence', 'Past viol.', 'Past acc.', 'Pred. viol.', 'Pred. acc.', 'Risk', 'Confidence']}
                    rows={top.map((d) => [
                        d.driverName,
                        d.licenseNumber ?? '—',
                        String(d.pastViolations),
                        String(d.pastAccidents),
                        d.predictedViolations.toFixed(1),
                        d.predictedAccidents.toFixed(1),
                        d.riskScore.toFixed(0),
                        d.confidence,
                    ])}
                    emphasizeColumns={[6]}
                />
            </div>
        </>
    );
}

// ── Page 7 · Maintenance ────────────────────────────────────────────────────

function MaintenancePage({
    items, vars,
}: { items: MaintenanceForecastItem[]; vars: NarrativeVars }) {
    const top = items.slice(0, 18);
    const totalCost = top.reduce((a, it) => a + (it.estimatedCost ?? 0), 0);
    const fullTotal = items.reduce((a, it) => a + (it.estimatedCost ?? 0), 0);
    return (
        <>
            <SectionTitle eyebrow="Maintenance Forecast" title="Upcoming work items by asset" />
            <NarrativeBlock>{renderNarrative('maintenance.intro', vars)}</NarrativeBlock>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <Stat label="Items in horizon" value={String(items.length)} />
                <Stat label="Top 18 cost" value={`$${totalCost.toLocaleString()}`} hint="shown below" />
                <Stat label="All-items cost" value={`$${fullTotal.toLocaleString()}`} hint="full forecast" />
            </div>

            <div style={{ marginTop: 14 }}>
                <DataTable
                    headers={['Asset', 'Service', 'Status', 'Predicted Due', 'Days', 'Est. cost', 'Method', 'Conf.']}
                    rows={top.map((it) => [
                        it.assetLabel,
                        truncate(it.serviceLabels.join(', '), 40),
                        it.status,
                        it.predictedDue,
                        String(it.daysUntilDue),
                        `$${(it.estimatedCost ?? 0).toLocaleString()}${it.costSampleSize === 0 ? '*' : ''}`,
                        it.method,
                        it.confidence,
                    ])}
                    emphasizeColumns={[5]}
                />
                <div style={{ marginTop: 6, fontSize: 9, color: C.muted, fontStyle: 'italic' }}>
                    * = category default (no historical sample on file). Items without a star use the average of {' '}
                    that asset / service combination's prior completed work orders.
                </div>
            </div>
        </>
    );
}

// ── Page 8 · Recommendations ────────────────────────────────────────────────

function RecommendationsPage({
    score, vars,
}: { score: EntityRiskScore; vars: NarrativeVars }) {
    return (
        <>
            <SectionTitle eyebrow="Recommendations" title="Auto-derived next actions" />
            <NarrativeBlock>{renderNarrative('recommendations.intro', vars)}</NarrativeBlock>
            <div style={{ marginTop: 14 }}>
                {score.recommendations.map((r, i) => (
                    <div key={i} style={{
                        padding: 12,
                        marginBottom: 10,
                        borderLeft: `4px solid ${r.severity === 'urgent' ? C.red : r.severity === 'warn' ? C.amber : C.muted}`,
                        background: r.severity === 'urgent' ? C.redSoft : r.severity === 'warn' ? C.amberSoft : C.softBg,
                        borderRadius: 4,
                    }}>
                        <div style={{ fontWeight: 700, fontSize: 11.5, color: C.ink }}>{r.title}</div>
                        <div style={{ fontSize: 10.5, color: C.body, marginTop: 4, lineHeight: 1.5 }}>{r.description}</div>
                        <div style={{ fontSize: 9, color: C.muted, marginTop: 4, fontFamily: MONO }}>action: {r.actionKey}</div>
                    </div>
                ))}
            </div>
        </>
    );
}

// ── Page 9 · Methodology + lineage ──────────────────────────────────────────

function MethodologyPage({
    vars, filters, forecast, reportDate,
}: { vars: NarrativeVars; filters: ForecastFilters; forecast: ForecastSummary; reportDate: Date }) {
    return (
        <>
            <SectionTitle eyebrow="Methodology" title="How these projections are produced" />
            <NarrativeBlock>{renderNarrative('methodology.body', vars)}</NarrativeBlock>
            {filters.distanceBuckets.length > 0 && (
                <NarrativeBlock muted>{renderNarrative('methodology.distanceFilter', vars)}</NarrativeBlock>
            )}
            {filters.timelineWindowDays != null && (
                <NarrativeBlock muted>{renderNarrative('methodology.timelineFilter', vars)}</NarrativeBlock>
            )}

            <SubTitle>Filter snapshot</SubTitle>
            <pre style={{
                background: C.softBg,
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: 12,
                fontFamily: MONO,
                fontSize: 9.5,
                color: C.body,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                margin: '8px 0',
            }}>{JSON.stringify(filters, null, 2)}</pre>

            <SubTitle>Lineage</SubTitle>
            <NarrativeBlock muted>{renderNarrative('lineage.body', vars)}</NarrativeBlock>
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CoverFact label="Config hash" value={forecast.base.configHash} mono />
                <CoverFact label="Generated" value={reportDate.toISOString()} mono />
            </div>
        </>
    );
}

// ── Shared sub-components ───────────────────────────────────────────────────

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: C.gold, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                {eyebrow}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: SERIF, marginTop: 2 }}>
                {title}
            </div>
        </div>
    );
}

function SubTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: 10.5,
            color: C.accent,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            marginTop: 14,
            marginBottom: 6,
        }}>{children}</div>
    );
}

function NarrativeBlock({
    children, muted,
}: { children: React.ReactNode; muted?: boolean }) {
    if (typeof children !== 'string') {
        return (
            <p style={{
                margin: 0,
                color: muted ? C.muted : C.body,
                lineHeight: 1.65,
                fontSize: 11,
            }}>{children}</p>
        );
    }
    const tokens = tokenizeNarrative(children);
    return (
        <p style={{
            margin: 0,
            color: muted ? C.muted : C.body,
            lineHeight: 1.65,
            fontSize: 11,
        }}>
            {tokens.map((t, i) => (
                <span key={i} style={{ fontWeight: t.bold ? 700 : 400, color: t.bold ? C.ink : 'inherit' }}>
                    {t.text}
                </span>
            ))}
        </p>
    );
}

function Stat({
    label, value, hint, tone,
}: { label: string; value: string | number; hint?: string; tone?: 'red' | 'default' }) {
    const valueColor = tone === 'red' ? C.red : C.ink;
    return (
        <div style={{
            border: `1px solid ${C.line}`,
            borderRadius: 6,
            padding: 10,
            background: '#fff',
        }}>
            <div style={{ fontSize: 8.5, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>{label}</div>
            <div style={{
                fontSize: 18,
                color: valueColor,
                fontWeight: 700,
                marginTop: 2,
                textTransform: 'capitalize',
            }}>{value}</div>
            {hint && <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{hint}</div>}
        </div>
    );
}

function DataTable({
    headers, rows, emphasizeColumns,
}: { headers: string[]; rows: string[][]; emphasizeColumns?: number[] }) {
    return (
        <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 10,
            color: C.body,
        }}>
            <thead>
                <tr style={{ background: C.accent, color: '#fff' }}>
                    {headers.map((h, i) => (
                        <th key={i} style={{
                            padding: '6px 8px',
                            textAlign: 'left',
                            fontSize: 9,
                            letterSpacing: 0.8,
                            textTransform: 'uppercase',
                            fontWeight: 700,
                        }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, i) => (
                    <tr key={i} style={{
                        background: i % 2 === 0 ? '#fff' : C.softBg,
                        borderBottom: `1px solid ${C.line}`,
                    }}>
                        {r.map((cell, j) => (
                            <td key={j} style={{
                                padding: '6px 8px',
                                fontWeight: emphasizeColumns?.includes(j) ? 700 : 400,
                                color: emphasizeColumns?.includes(j) ? C.ink : C.body,
                                fontFamily: /^\d+(\.\d+)?$/.test(cell) ? MONO : FONT,
                            }}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

function truncate(s: string, n: number): string {
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function hotspotConcentration(hotspots: JurisdictionHotspotForecast[]): number {
    if (hotspots.length === 0) return 0;
    const total = hotspots.reduce((a, h) => a + h.pastViolations + h.pastAccidents, 0);
    if (total === 0) return 0;
    const top3 = hotspots.slice(0, 3).reduce((a, h) => a + h.pastViolations + h.pastAccidents, 0);
    return Math.round((top3 / total) * 100);
}

function pickTopServices(items: MaintenanceForecastItem[]): string[] {
    const counts = new Map<string, number>();
    for (const it of items) {
        for (const lab of it.serviceLabels) {
            if (/brake|tire|steer|cvip|annual|safety/i.test(lab)) {
                counts.set(lab, (counts.get(lab) ?? 0) + 1);
            }
        }
    }
    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([k]) => k);
}
