// Multi-page A4 CVOR (Ontario Commercial Vehicle Operator's Registration)
// report. Mirrors the FMCSA PDF design language but with MTO branding and
// CVOR-specific sections — rating composition, collisions/convictions/
// inspections, intervention threshold status, and travel exposure.
//
// Shared building blocks (palette, typography, badges, charts) are imported
// from FmcsaPdfReport so both reports stay visually consistent.

import { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend,
    LineChart, Line,
} from "recharts";
import {
    A4_W, A4_H, PAGE_PAD_X, CHART_W,
    C, FONT, SERIF, MONO,
    TONE, type ClassTone, classifyOos, rollUp,
    Body, Eyebrow, SectionHead, Stat, ClassBadge, ChartCard, KpiBlock,
    th, td,
} from "./FmcsaPdfReport";

// ── Types ─────────────────────────────────────────────────────────────

type CarrierProfile = {
    id?: string | number;
    cvor?: string | number;
    name?: string;
    address?: string;
    vehicles?: number;
    drivers?: number;
    rating?: string;
    oosRates?: {
        vehicle?: { carrier?: string; national?: string };
        driver?:  { carrier?: string; national?: string };
        hazmat?:  { carrier?: string; national?: string };
    };
    cvorAnalysis: {
        rating: number;
        collisions:  { percentage: number; weight: number };
        convictions: { percentage: number; weight: number };
        inspections: { percentage: number; weight: number };
        counts: {
            collisions:  number;
            convictions: number;
            oosOverall:  number;
            oosVehicle:  number;
            oosDriver:   number;
            trucks?:     number;
            onMiles?:    number;
            canadaMiles?: number;
            totalMiles?: number;
            collisionPointsWithPoints?:    number;
            collisionPointsWithoutPoints?: number;
            totalCollisionPoints?:         number;
            convictionPoints?:             number;
        };
        collisionDetails?: {
            fromDate?: string;
            toDate?: string;
            monthsLabel?: string;
            withPoints?: number;
            fatal?: number;
            personalInjury?: number;
            propertyDamage?: number;
            notPointed?: number;
            total?: number;
        };
        convictionDetails?: {
            fromDate?: string;
            toDate?: string;
            monthsLabel?: string;
            withPoints?: number;
            driver?: number;
            vehicle?: number;
            load?: number;
            other?: number;
            notPointed?: number;
            total?: number;
        };
    };
};

type CvorTravelKmRow = {
    fromDate: string;
    toDate: string;
    vehicles: number;
    doubleShifted: number;
    totalVehicles: number;
    ontarioKm: number;
    restOfCanadaKm: number;
    usMexicoKm: number;
    drivers: number;
    totalKm: number;
    type: "Estimated" | "Actual";
};

type CvorPeriodicReport = {
    reportDate: string;
    periodLabel: string;
    rating: number;
    colContrib: number;
    conContrib: number;
    insContrib: number;
    collisionEvents: number;
    convictionEvents: number;
    oosOverall: number;
    oosVehicle: number;
    oosDriver: number;
    trucks?: number;
    totalMiles?: number;
};

export interface CvorPdfReportProps {
    carrierProfile: CarrierProfile;
    cvorThresholds:    { warning: number; intervention: number; showCause: number };
    cvorOosThresholds: { overall: number; vehicle: number; driver: number };
    cvorPeriodicReports: CvorPeriodicReport[];
    cvorTravelKm: CvorTravelKmRow[];
    interventionPeriod: { fromDate: string; toDate: string };
    reportDate?: Date;
}

// ── Classification helpers (CVOR-specific) ────────────────────────────

/** Classify a CVOR rating using the program's three thresholds. CVOR
 *  rating sums collisions+convictions+inspections contributions; lower
 *  is better. */
function classifyCvorRating(
    rating: number,
    t: { warning: number; intervention: number; showCause: number },
): ClassTone {
    if (rating >= t.showCause)    return "critical";
    if (rating >= t.intervention) return "concern";
    if (rating >= t.warning)      return "moderate";
    if (rating >= t.warning * 0.5) return "good";
    return "excellent";
}

const ratingStatusLabel = (
    rating: number,
    t: { warning: number; intervention: number; showCause: number },
): string =>
    rating >= t.showCause    ? "Show Cause"
    : rating >= t.intervention ? "Intervention"
    : rating >= t.warning      ? "Warning"
    : "Satisfactory";

// ── Page chrome (CVOR / MTO branding) ─────────────────────────────────

function Page({
    pageNumber, totalPages, sectionLabel, carrierName, cvorNumber, children,
}: {
    pageNumber: number;
    totalPages: number;
    sectionLabel: string;
    carrierName: string;
    cvorNumber: string | number;
    children: React.ReactNode;
}) {
    return (
        <div
            className="pdf-page"
            style={{
                width: A4_W, height: A4_H,
                background: "#ffffff",
                color: C.ink,
                fontFamily: FONT,
                fontSize: 11,
                position: "relative",
                pageBreakAfter: "always",
                breakAfter: "page",
                boxSizing: "border-box",
                padding: `40px ${PAGE_PAD_X}px 44px`,
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 10,
                    marginBottom: 22,
                    borderBottom: `2px solid ${C.accent}`,
                    fontSize: 9,
                    color: C.muted,
                    letterSpacing: 0.5,
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 4, height: 22, background: C.accent, borderRadius: 2 }} />
                    <div>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1.6 }}>
                            Ministry of Transportation Ontario · CVOR
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginTop: 1, letterSpacing: -0.1 }}>
                            CVOR Safety Performance Report
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                        Subject Carrier
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                        {carrierName}
                        <span style={{ color: C.muted, fontWeight: 600, marginLeft: 8, fontFamily: MONO }}>CVOR {cvorNumber}</span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {children}
            </div>

            <div
                style={{
                    paddingTop: 12,
                    marginTop: 18,
                    borderTop: `1px solid ${C.line}`,
                    fontSize: 8.5,
                    color: C.muted,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    letterSpacing: 0.5,
                }}
            >
                <span style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 1.4 }}>{sectionLabel}</span>
                <span style={{ fontFamily: MONO, color: C.ink, fontWeight: 700 }}>
                    <span style={{ color: C.accent }}>{String(pageNumber).padStart(2, "0")}</span>
                    <span style={{ color: C.soft, margin: "0 4px" }}>/</span>
                    <span style={{ color: C.muted }}>{String(totalPages).padStart(2, "0")}</span>
                </span>
            </div>
        </div>
    );
}

// ── Section model ────────────────────────────────────────────────────

type SectionId =
    | "cover" | "toc" | "executive" | "rating-composition"
    | "collisions" | "convictions" | "inspections" | "travel"
    | "intervention" | "recommendations";

type Section = {
    id: SectionId;
    title: string;
    label: string;
    summary?: string;
    tone?: ClassTone;
    page: number;
    chromeless?: boolean;
};

// ── Cover ─────────────────────────────────────────────────────────────

function CoverPage({
    carrierProfile, reportDate, overall, ratingLabel, interventionPeriod,
}: {
    carrierProfile: CarrierProfile;
    reportDate: Date;
    overall: ClassTone;
    ratingLabel: string;
    interventionPeriod: { fromDate: string; toDate: string };
}) {
    const t = TONE[overall];
    const cvor = carrierProfile.cvor ?? "—";
    const docId = `CVOR-${cvor}-${reportDate.getFullYear()}`;
    const period = `${interventionPeriod.fromDate} → ${interventionPeriod.toDate}`;
    return (
        <div
            style={{
                width: A4_W, height: A4_H,
                display: "flex", flexDirection: "column",
                background: "#ffffff",
                fontFamily: FONT,
                color: C.ink,
                boxSizing: "border-box",
                position: "relative",
            }}
        >
            {/* Navy header band — MTO Ontario */}
            <div style={{ background: C.accent, color: "#fff", padding: "26px 64px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                            style={{
                                width: 46, height: 46, borderRadius: 4,
                                background: "#fff", color: C.accent,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 22, fontWeight: 900, letterSpacing: -1,
                                fontFamily: SERIF,
                            }}
                        >O</div>
                        <div>
                            <div
                                style={{
                                    fontSize: 8.5, fontWeight: 800,
                                    color: "rgba(255,255,255,0.7)",
                                    textTransform: "uppercase", letterSpacing: 2,
                                }}
                            >
                                Province of Ontario · Ministry of Transportation
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, letterSpacing: 0.4 }}>
                                Commercial Vehicle Operator's Registration
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right", marginTop: 4 }}>
                        <div style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: 2 }}>
                            Document
                        </div>
                        <div style={{ fontSize: 10, fontFamily: MONO, fontWeight: 600, color: "rgba(255,255,255,0.95)", marginTop: 2 }}>
                            {docId}
                        </div>
                    </div>
                </div>
                <div style={{ height: 3, background: C.gold, marginTop: 22, borderRadius: 1.5 }} />
            </div>

            {/* Body */}
            <div style={{ padding: "60px 64px 56px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 2.4 }}>
                    Confidential · Management Report
                </div>
                <div
                    style={{
                        fontSize: 52, fontWeight: 700, color: C.ink,
                        lineHeight: 1.04, letterSpacing: -1.6,
                        marginTop: 14, marginBottom: 18,
                        fontFamily: SERIF,
                    }}
                >
                    CVOR Safety<br />
                    <span style={{ color: C.accent }}>&</span> Performance Report
                </div>
                <div style={{ fontSize: 13, color: C.body, lineHeight: 1.65, maxWidth: 560 }}>
                    A multi-page assessment of this carrier's CVOR safety posture — overall rating,
                    collisions, convictions, inspections, out-of-service performance, and travel
                    exposure across the current 24-month intervention review window.
                </div>

                {/* Identity */}
                <div
                    style={{
                        marginTop: 56,
                        borderTop: `1px solid ${C.line}`,
                        borderBottom: `1px solid ${C.line}`,
                        padding: "22px 0 24px",
                    }}
                >
                    <div style={{ fontSize: 8.5, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 2 }}>
                        Subject Carrier
                    </div>
                    <div
                        style={{
                            fontSize: 30, fontWeight: 700, color: C.ink,
                            marginTop: 6, marginBottom: 18, lineHeight: 1.1,
                            letterSpacing: -0.7,
                            fontFamily: SERIF,
                        }}
                    >
                        {carrierProfile.name || "—"}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, fontSize: 10 }}>
                        {[
                            { k: "CVOR #",      v: String(cvor), mono: true },
                            { k: "USDOT",       v: String(carrierProfile.id ?? "—"), mono: true },
                            { k: "Power Units", v: String(carrierProfile.vehicles ?? "—") },
                            { k: "Drivers",     v: String(carrierProfile.drivers ?? "—") },
                        ].map(({ k, v, mono }) => (
                            <div key={k}>
                                <div style={{ color: C.muted, fontWeight: 800, textTransform: "uppercase", fontSize: 8.5, letterSpacing: 1.4 }}>{k}</div>
                                <div style={{ color: C.ink, fontWeight: 700, marginTop: 4, fontFamily: mono ? MONO : FONT, fontSize: 12 }}>{v}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Posture banner */}
                <div
                    style={{
                        marginTop: 24,
                        background: "#fff",
                        border: `1px solid ${C.line}`,
                        borderLeft: `4px solid ${t.fg}`,
                        borderRadius: 4,
                        padding: "16px 20px",
                        display: "flex", alignItems: "center", gap: 18,
                    }}
                >
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 8.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.6 }}>
                            CVOR Rating Status
                        </div>
                        <div
                            style={{
                                fontSize: 24, fontWeight: 700, color: t.fg,
                                marginTop: 4, lineHeight: 1.1,
                                fontFamily: SERIF, letterSpacing: -0.4,
                            }}
                        >
                            {ratingLabel}
                        </div>
                        <div style={{ fontSize: 10.5, color: C.body, marginTop: 4, lineHeight: 1.55 }}>
                            {t.advice}
                        </div>
                    </div>
                    <div style={{ width: 1, height: 56, background: C.line }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "center" }}>
                        <KpiBlock label="Overall Rating" value={`${carrierProfile.cvorAnalysis.rating.toFixed(1)}%`} />
                        <KpiBlock label="Collisions" value={String(carrierProfile.cvorAnalysis.counts.collisions ?? 0)} />
                        <KpiBlock label="Convictions" value={String(carrierProfile.cvorAnalysis.counts.convictions ?? 0)} />
                    </div>
                </div>

                {/* Bottom metadata */}
                <div
                    style={{
                        marginTop: "auto",
                        paddingTop: 28,
                        borderTop: `1px solid ${C.line}`,
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 18, fontSize: 10,
                    }}
                >
                    {[
                        { k: "Report Date",         v: reportDate.toLocaleDateString("en-US", { dateStyle: "long" }) },
                        { k: "Intervention Period", v: period },
                        { k: "Issuing System",      v: "TrackSmart Compliance" },
                    ].map(({ k, v }) => (
                        <div key={k}>
                            <div style={{ fontSize: 8.5, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1.6 }}>{k}</div>
                            <div style={{ marginTop: 4, fontWeight: 600, color: C.ink }}>{v}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Table of Contents ─────────────────────────────────────────────────

function TocPage({ sections }: { sections: Section[] }) {
    const visible = sections.filter(s => s.id !== "cover" && s.id !== "toc");
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <SectionHead
                number={0}
                eyebrow="Document Index"
                title="Contents"
                lede={
                    `Sections present in this document, in order. Pages without supporting data ` +
                    `for the current carrier are omitted automatically — numbers below reflect only ` +
                    `what is included.`
                }
            />

            <div>
                {visible.map((s, i) => (
                    <div
                        key={s.id}
                        style={{
                            display: "grid",
                            gridTemplateColumns: "40px 1fr 110px 70px",
                            alignItems: "center",
                            gap: 14,
                            padding: "14px 0",
                            borderTop: i === 0 ? `1px solid ${C.line}` : "none",
                            borderBottom: `1px solid ${C.line}`,
                        }}
                    >
                        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, color: C.gold }}>
                            {String(i + 1).padStart(2, "0")}
                        </div>
                        <div>
                            <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: -0.3, lineHeight: 1.15 }}>
                                {s.title}
                            </div>
                            {s.summary && (
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.summary}</div>
                            )}
                        </div>
                        <div>{s.tone && <ClassBadge tone={s.tone} />}</div>
                        <div
                            style={{
                                fontFamily: MONO, fontWeight: 700, fontSize: 16,
                                color: C.accent, textAlign: "right", letterSpacing: -0.5,
                            }}
                        >
                            {String(s.page).padStart(2, "0")}
                        </div>
                    </div>
                ))}
            </div>

            <div
                style={{
                    marginTop: 8,
                    padding: "14px 16px",
                    background: C.softBg,
                    border: `1px solid ${C.line}`,
                    borderLeft: `3px solid ${C.gold}`,
                    fontSize: 10,
                    color: C.body,
                    lineHeight: 1.6,
                }}
            >
                <div style={{ fontSize: 8.5, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 6 }}>
                    How to Read the Badges
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                    {(["excellent", "good", "moderate", "concern", "critical"] as ClassTone[]).map(tn => {
                        const t = TONE[tn];
                        return (
                            <div key={tn}>
                                <ClassBadge tone={tn} />
                                <div style={{ fontSize: 9.5, color: C.body, marginTop: 5, lineHeight: 1.45 }}>
                                    {t.advice}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Executive Summary ─────────────────────────────────────────────────

function ExecutiveSummaryPage({
    carrierProfile, cvorThresholds, overall, ratingLabel,
}: {
    carrierProfile: CarrierProfile;
    cvorThresholds: { warning: number; intervention: number; showCause: number };
    overall: ClassTone;
    ratingLabel: string;
}) {
    const a = carrierProfile.cvorAnalysis;
    const t = TONE[overall];
    const collisions  = a.counts.collisions ?? 0;
    const convictions = a.counts.convictions ?? 0;
    const oosOverall  = a.counts.oosOverall ?? 0;

    const composition = [
        { name: "Collisions",  value: a.collisions.percentage,  weight: a.collisions.weight },
        { name: "Convictions", value: a.convictions.percentage, weight: a.convictions.weight },
        { name: "Inspections", value: a.inspections.percentage, weight: a.inspections.weight },
    ];

    const narrative = useMemo(() => {
        const parts: string[] = [];
        parts.push(
            `${carrierProfile.name || "The carrier"}'s overall CVOR rating is ` +
            `${a.rating.toFixed(1)}% (${ratingLabel}).`
        );
        const dom = [
            { name: "collisions",  v: a.collisions.percentage },
            { name: "convictions", v: a.convictions.percentage },
            { name: "inspections", v: a.inspections.percentage },
        ].sort((x, y) => y.v - x.v)[0];
        parts.push(
            `The largest contributing factor to the rating is ${dom.name} ` +
            `(${dom.v.toFixed(1)}% of the threshold consumed).`
        );
        if (a.rating >= cvorThresholds.intervention) {
            parts.push(
                `The rating has crossed the intervention threshold (${cvorThresholds.intervention}%); ` +
                `MTO may issue a facility audit or require remedial action plans.`
            );
        } else if (a.rating >= cvorThresholds.warning) {
            parts.push(
                `The rating has crossed the warning threshold (${cvorThresholds.warning}%); ` +
                `MTO will monitor and may issue an advisory letter — preventative action advised.`
            );
        } else {
            parts.push(
                `The rating remains below the warning threshold (${cvorThresholds.warning}%); ` +
                `MTO oversight intensity is low — focus on maintaining the trend.`
            );
        }
        parts.push(
            `Over the review period the carrier recorded ${collisions} collision${collisions === 1 ? "" : "s"}, ` +
            `${convictions} conviction${convictions === 1 ? "" : "s"}, and an overall OOS rate of ` +
            `${oosOverall.toFixed(1)}%.`
        );
        return parts.join(" ");
    }, [carrierProfile.name, a, ratingLabel, cvorThresholds, collisions, convictions, oosOverall]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHead number={1} eyebrow="Section One" title="Executive Summary" />

            {/* Posture banner */}
            <div
                style={{
                    background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12,
                    padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Eyebrow color={C.muted}>CVOR Rating Status</Eyebrow>
                        <ClassBadge tone={overall} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: t.fg, marginTop: 4, lineHeight: 1.1, fontFamily: SERIF }}>
                        {a.rating.toFixed(1)}% — {ratingLabel}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.body, marginTop: 4 }}>
                        Warning {cvorThresholds.warning}% · Intervention {cvorThresholds.intervention}% · Show Cause {cvorThresholds.showCause}%.
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Combined</div>
                    <div style={{ fontSize: 38, fontWeight: 700, color: t.fg, lineHeight: 1, fontFamily: SERIF }}>
                        {a.rating.toFixed(0)}<span style={{ fontSize: 18, color: C.muted }}>%</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: C.soft }}>of threshold</div>
                </div>
            </div>

            {/* KPI tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <Stat label="Collisions"  value={collisions}  sub="24-month window" tone={collisions > 8 ? "critical" : collisions > 4 ? "concern" : collisions > 0 ? "moderate" : "good"} />
                <Stat label="Convictions" value={convictions} sub="24-month window" tone={convictions > 14 ? "critical" : convictions > 6 ? "concern" : convictions > 0 ? "moderate" : "good"} />
                <Stat label="OOS Overall" value={`${oosOverall.toFixed(1)}%`} sub="Weighted" tone={oosOverall > 30 ? "critical" : oosOverall > 15 ? "moderate" : "good"} />
                <Stat label="Power Units" value={a.counts.trucks ?? carrierProfile.vehicles ?? "—"} sub="Active fleet" tone="indigo" />
            </div>

            {/* Narrative */}
            <div>
                <Eyebrow>Findings Narrative</Eyebrow>
                <Body>{narrative}</Body>
            </div>

            {/* Composition chart */}
            <div>
                <Eyebrow>Rating Composition</Eyebrow>
                <ChartCard>
                    <BarChart
                        width={CHART_W} height={200}
                        data={composition} margin={{ top: 6, right: 12, bottom: 24, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                        <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: C.muted, fontWeight: 700 }} />
                        <YAxis tick={{ fontSize: 9.5, fill: C.soft }} width={28} unit="%" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="value" name="% of threshold consumed" fill={C.accent} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="weight" name="Weight in rating (%)" fill={C.soft} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ChartCard>
            </div>
        </div>
    );
}

// ── Rating Composition ────────────────────────────────────────────────

function RatingCompositionPage({
    carrierProfile, cvorThresholds,
}: {
    carrierProfile: CarrierProfile;
    cvorThresholds: { warning: number; intervention: number; showCause: number };
}) {
    const a = carrierProfile.cvorAnalysis;

    const parts = [
        { name: "Collisions",  value: a.collisions.percentage,  weight: a.collisions.weight,  color: C.red,    note: "Class‑weighted points / kilometre" },
        { name: "Convictions", value: a.convictions.percentage, weight: a.convictions.weight, color: C.orange, note: "Driver / vehicle / load citations" },
        { name: "Inspections", value: a.inspections.percentage, weight: a.inspections.weight, color: C.indigo, note: "OOS-weighted CVSA points" },
    ];

    const total = a.rating;
    const ratingTone = classifyCvorRating(total, cvorThresholds);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={2}
                eyebrow="Section Two"
                title="Rating Composition"
                lede={
                    `The CVOR rating combines three weighted contributions: collisions (${a.collisions.weight}%), ` +
                    `convictions (${a.convictions.weight}%), and inspections (${a.inspections.weight}%). ` +
                    `Each contribution is the % of MTO's threshold the carrier has used in the last 24 months.`
                }
            />

            {/* Stacked breakdown */}
            <div
                style={{
                    background: "#fff",
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    padding: 14,
                }}
            >
                <div
                    style={{
                        fontSize: 9, fontWeight: 800, color: C.muted,
                        textTransform: "uppercase", letterSpacing: 1.6,
                        marginBottom: 8,
                    }}
                >
                    Contribution to overall rating
                </div>
                {parts.map((p, i) => {
                    const widthPct = Math.min(100, p.value);
                    return (
                        <div key={p.name} style={{ marginBottom: i === parts.length - 1 ? 0 : 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                                <div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{p.name}</span>
                                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>weight {p.weight}%</span>
                                </div>
                                <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13, color: C.ink }}>
                                    {p.value.toFixed(2)}%
                                </span>
                            </div>
                            <div style={{ height: 10, background: C.softer, borderRadius: 6, overflow: "hidden" }}>
                                <div style={{ width: `${widthPct}%`, height: "100%", background: p.color, borderRadius: 6 }} />
                            </div>
                            <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4 }}>{p.note}</div>
                        </div>
                    );
                })}
            </div>

            {/* Threshold dial */}
            <div>
                <Eyebrow>Threshold Position</Eyebrow>
                <div
                    style={{
                        background: "#fff",
                        border: `1px solid ${C.line}`,
                        borderRadius: 6,
                        padding: 14,
                    }}
                >
                    <div style={{ position: "relative", height: 28, background: C.softer, borderRadius: 4, overflow: "hidden" }}>
                        {/* Zone bands */}
                        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(100, cvorThresholds.warning)}%`, background: TONE.good.bg }} />
                        <div style={{ position: "absolute", left: `${cvorThresholds.warning}%`, top: 0, bottom: 0, width: `${Math.max(0, cvorThresholds.intervention - cvorThresholds.warning)}%`, background: TONE.moderate.bg }} />
                        <div style={{ position: "absolute", left: `${cvorThresholds.intervention}%`, top: 0, bottom: 0, width: `${Math.max(0, cvorThresholds.showCause - cvorThresholds.intervention)}%`, background: TONE.concern.bg }} />
                        <div style={{ position: "absolute", left: `${cvorThresholds.showCause}%`, top: 0, bottom: 0, right: 0, background: TONE.critical.bg }} />
                        {/* Carrier marker */}
                        <div
                            style={{
                                position: "absolute",
                                left: `${Math.min(99, total)}%`,
                                top: -4, bottom: -4,
                                width: 3,
                                background: TONE[ratingTone].fg,
                                borderRadius: 2,
                                boxShadow: `0 0 0 2px #fff`,
                            }}
                        />
                    </div>
                    {/* Tick marks */}
                    <div style={{ position: "relative", height: 22, marginTop: 4, fontSize: 9, color: C.muted }}>
                        {[
                            { v: 0, label: "0%" },
                            { v: cvorThresholds.warning, label: `Warn ${cvorThresholds.warning}%` },
                            { v: cvorThresholds.intervention, label: `Interv. ${cvorThresholds.intervention}%` },
                            { v: cvorThresholds.showCause, label: `Show ${cvorThresholds.showCause}%` },
                            { v: 100, label: "100%" },
                        ].map(t => (
                            <div
                                key={t.v}
                                style={{
                                    position: "absolute",
                                    left: `${t.v}%`,
                                    transform: t.v >= 95 ? "translateX(-100%)" : t.v <= 5 ? "translateX(0)" : "translateX(-50%)",
                                    fontWeight: 700, color: C.muted,
                                    whiteSpace: "nowrap",
                                }}
                            >
                                <div style={{ width: 1, height: 4, background: C.line, marginBottom: 2 }} />
                                {t.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Composition table */}
            <div>
                <Eyebrow>Reference Table</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, border: `1px solid ${C.line}` }}>
                    <thead>
                        <tr>
                            <th style={th}>Component</th>
                            <th style={{ ...th, textAlign: "center" }}>Weight</th>
                            <th style={{ ...th, textAlign: "center" }}>% of Threshold</th>
                            <th style={{ ...th, textAlign: "center" }}>Weighted</th>
                            <th style={th}>Source Data</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parts.map((p) => {
                            const weighted = (p.value * p.weight) / 100;
                            return (
                                <tr key={p.name} style={{ borderTop: `1px solid ${C.line}` }}>
                                    <td style={{ ...td, fontWeight: 700 }}>
                                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, marginRight: 8, background: p.color }} />
                                        {p.name}
                                    </td>
                                    <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{p.weight}%</td>
                                    <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{p.value.toFixed(2)}%</td>
                                    <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 800, color: C.accent }}>{weighted.toFixed(2)}%</td>
                                    <td style={{ ...td, color: C.muted }}>{p.note}</td>
                                </tr>
                            );
                        })}
                        <tr style={{ borderTop: `1.5px solid ${C.accent}`, background: C.softBg }}>
                            <td style={{ ...td, fontWeight: 800 }}>Overall</td>
                            <td style={{ ...td, textAlign: "center", color: C.muted }}>—</td>
                            <td style={{ ...td, textAlign: "center", color: C.muted }}>—</td>
                            <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 900, color: TONE[ratingTone].fg }}>
                                {total.toFixed(2)}%
                            </td>
                            <td style={td}>
                                <ClassBadge tone={ratingTone} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Collision Profile ─────────────────────────────────────────────────

function CollisionsPage({ carrierProfile }: { carrierProfile: CarrierProfile }) {
    const cd = carrierProfile.cvorAnalysis.collisionDetails || {};
    const counts = carrierProfile.cvorAnalysis.counts;
    const fatal  = cd.fatal ?? 0;
    const injury = cd.personalInjury ?? 0;
    const pd     = cd.propertyDamage ?? 0;
    const total  = cd.total ?? (fatal + injury + pd);
    const points = counts.totalCollisionPoints ?? 0;

    const breakdown = [
        { name: "Property Damage", value: pd,     color: C.indigo },
        { name: "Personal Injury", value: injury, color: C.orange },
        { name: "Fatal",           value: fatal,  color: C.red },
    ].filter(b => b.value > 0);
    const allZero = breakdown.length === 0;

    const tone: ClassTone = fatal > 0 ? "critical" : injury > 2 ? "concern" : injury > 0 || pd > 5 ? "moderate" : pd > 0 ? "good" : "excellent";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={3}
                eyebrow="Section Three"
                title="Collision Profile"
                lede={
                    cd.fromDate && cd.toDate
                        ? `Collisions reported between ${cd.fromDate} and ${cd.toDate} ` +
                          `(${cd.monthsLabel || "review window"}). Each is classified by severity.`
                        : `Collisions over the current review window, classified by severity.`
                }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <Stat label="Total" value={total} sub="All severities" tone={tone} />
                <Stat label="Fatal" value={fatal} tone={fatal > 0 ? "critical" : "good"} />
                <Stat label="Injury" value={injury} tone={injury > 2 ? "concern" : injury > 0 ? "moderate" : "good"} />
                <Stat label="Property Damage" value={pd} tone={pd > 5 ? "moderate" : "good"} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
                <ChartCard title="Severity Mix">
                    {allZero ? (
                        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 10.5, color: C.muted, fontStyle: "italic" }}>
                            No collisions recorded in the review window.
                        </div>
                    ) : (
                        <PieChart width={280} height={220}>
                            <Pie
                                data={breakdown}
                                dataKey="value" nameKey="name"
                                cx="50%" cy="50%"
                                innerRadius={48} outerRadius={86}
                                paddingAngle={2}
                                label={(e: any) => `${e.value}`}
                                labelLine={false}
                                fontSize={10}
                            >
                                {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                            </Pie>
                        </PieChart>
                    )}
                </ChartCard>
                <div>
                    <Eyebrow>Points</Eyebrow>
                    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>With points</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: SERIF, marginTop: 3 }}>{counts.collisionPointsWithPoints ?? 0}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>Without points</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: SERIF, marginTop: 3 }}>{counts.collisionPointsWithoutPoints ?? 0}</div>
                            </div>
                            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1.4 }}>Total Collision Points</div>
                                <div style={{ fontSize: 30, fontWeight: 700, color: TONE[tone].fg, fontFamily: SERIF, marginTop: 4 }}>{points}</div>
                                <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                                    Points are weighted by severity and distance; they drive the collisions contribution to the rating.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <Eyebrow>Severity Detail</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, border: `1px solid ${C.line}` }}>
                    <thead>
                        <tr>
                            <th style={th}>Class</th>
                            <th style={{ ...th, textAlign: "center" }}>Count</th>
                            <th style={{ ...th, textAlign: "center" }}>% of Total</th>
                            <th style={th}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { name: "Fatal",           value: fatal,  notes: "Resulted in one or more fatalities; weighted highest." },
                            { name: "Personal Injury", value: injury, notes: "One or more individuals injured." },
                            { name: "Property Damage", value: pd,     notes: "No injuries; property damage only." },
                            { name: "Not Pointed",     value: cd.notPointed ?? 0, notes: "Reported but no points assigned." },
                        ].map((row, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                <td style={{ ...td, fontWeight: 700 }}>{row.name}</td>
                                <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{row.value}</td>
                                <td style={{ ...td, textAlign: "center", color: C.muted, fontFamily: MONO }}>
                                    {total > 0 ? `${Math.round(row.value / total * 100)}%` : "—"}
                                </td>
                                <td style={{ ...td, color: C.muted, fontSize: 9.5 }}>{row.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Conviction Profile ────────────────────────────────────────────────

function ConvictionsPage({ carrierProfile }: { carrierProfile: CarrierProfile }) {
    const cd = carrierProfile.cvorAnalysis.convictionDetails || {};
    const counts = carrierProfile.cvorAnalysis.counts;
    const driver  = cd.driver  ?? 0;
    const vehicle = cd.vehicle ?? 0;
    const load    = cd.load    ?? 0;
    const other   = cd.other   ?? 0;
    const total   = cd.total ?? (driver + vehicle + load + other);
    const points  = counts.convictionPoints ?? 0;

    const breakdown = [
        { name: "Driver",  value: driver,  color: C.red    },
        { name: "Vehicle", value: vehicle, color: C.orange },
        { name: "Load",    value: load,    color: C.amber  },
        { name: "Other",   value: other,   color: C.muted  },
    ].filter(b => b.value > 0);
    const allZero = breakdown.length === 0;
    const tone: ClassTone = total > 14 ? "critical" : total > 6 ? "concern" : total > 2 ? "moderate" : total > 0 ? "good" : "excellent";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={4}
                eyebrow="Section Four"
                title="Conviction Profile"
                lede={
                    cd.fromDate && cd.toDate
                        ? `Convictions registered between ${cd.fromDate} and ${cd.toDate} (${cd.monthsLabel || "review window"}), categorised by responsibility.`
                        : `Convictions over the current review window, categorised by responsibility.`
                }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <Stat label="Total" value={total} sub="All categories" tone={tone} />
                <Stat label="Driver" value={driver} tone={driver > 8 ? "concern" : driver > 0 ? "moderate" : "good"} />
                <Stat label="Vehicle" value={vehicle} tone={vehicle > 4 ? "concern" : vehicle > 0 ? "moderate" : "good"} />
                <Stat label="Load / Other" value={load + other} tone={load + other > 4 ? "concern" : "good"} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
                <ChartCard title="Category Mix">
                    {allZero ? (
                        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 10.5, color: C.muted, fontStyle: "italic" }}>
                            No convictions recorded in the review window.
                        </div>
                    ) : (
                        <PieChart width={280} height={220}>
                            <Pie
                                data={breakdown}
                                dataKey="value" nameKey="name"
                                cx="50%" cy="50%"
                                innerRadius={48} outerRadius={86}
                                paddingAngle={2}
                                label={(e: any) => `${e.value}`}
                                labelLine={false}
                                fontSize={10}
                            >
                                {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                            </Pie>
                        </PieChart>
                    )}
                </ChartCard>
                <div>
                    <Eyebrow>Points</Eyebrow>
                    <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>With points</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: SERIF, marginTop: 3 }}>{cd.withPoints ?? 0}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>Not pointed</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: C.ink, fontFamily: SERIF, marginTop: 3 }}>{cd.notPointed ?? 0}</div>
                            </div>
                            <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                                <div style={{ fontSize: 9, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1.4 }}>Total Conviction Points</div>
                                <div style={{ fontSize: 30, fontWeight: 700, color: TONE[tone].fg, fontFamily: SERIF, marginTop: 4 }}>{points}</div>
                                <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
                                    Conviction points feed the convictions contribution to the rating; driver-class convictions are typically the largest pool.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <Eyebrow>Category Detail</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, border: `1px solid ${C.line}` }}>
                    <thead>
                        <tr>
                            <th style={th}>Category</th>
                            <th style={{ ...th, textAlign: "center" }}>Count</th>
                            <th style={{ ...th, textAlign: "center" }}>% of Total</th>
                            <th style={th}>Examples</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            { name: "Driver",  value: driver,  notes: "Speeding, careless driving, log-book violations, distracted-driving offences." },
                            { name: "Vehicle", value: vehicle, notes: "Defective equipment, brakes, lighting, tyres, registration / insurance issues." },
                            { name: "Load",    value: load,    notes: "Securement, weights & dimensions, hazardous goods documentation." },
                            { name: "Other",   value: other,   notes: "Operator-level offences not captured in the categories above." },
                        ].map((row, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                <td style={{ ...td, fontWeight: 700 }}>{row.name}</td>
                                <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{row.value}</td>
                                <td style={{ ...td, textAlign: "center", color: C.muted, fontFamily: MONO }}>
                                    {total > 0 ? `${Math.round(row.value / total * 100)}%` : "—"}
                                </td>
                                <td style={{ ...td, color: C.muted, fontSize: 9.5 }}>{row.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Inspections / OOS ────────────────────────────────────────────────

function InspectionsPagePdf({
    carrierProfile, cvorOosThresholds, cvorPeriodicReports,
}: {
    carrierProfile: CarrierProfile;
    cvorOosThresholds: { overall: number; vehicle: number; driver: number };
    cvorPeriodicReports: CvorPeriodicReport[];
}) {
    const counts = carrierProfile.cvorAnalysis.counts;
    const oosOverall = counts.oosOverall ?? 0;
    const oosVehicle = counts.oosVehicle ?? 0;
    const oosDriver  = counts.oosDriver ?? 0;

    const overallTone =
        oosOverall >= cvorOosThresholds.overall ? "critical"
        : oosOverall >= cvorOosThresholds.overall * 0.75 ? "concern"
        : oosOverall >= cvorOosThresholds.overall * 0.5 ? "moderate"
        : "good" as ClassTone;
    const vehicleTone =
        oosVehicle >= cvorOosThresholds.vehicle ? "critical"
        : oosVehicle >= cvorOosThresholds.vehicle * 0.7 ? "concern"
        : oosVehicle >= cvorOosThresholds.vehicle * 0.4 ? "moderate"
        : "good" as ClassTone;
    const driverTone =
        oosDriver >= cvorOosThresholds.driver ? "critical"
        : oosDriver >= cvorOosThresholds.driver * 0.7 ? "concern"
        : oosDriver >= cvorOosThresholds.driver * 0.4 ? "moderate"
        : "good" as ClassTone;

    // Trend over the last (up to) 12 periodic pulls
    const trend = useMemo(() => {
        const list = [...cvorPeriodicReports]
            .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
            .slice(-12);
        return list.map(r => ({
            label: r.periodLabel || r.reportDate.slice(0, 7),
            overall: +Number(r.oosOverall).toFixed(1),
            vehicle: +Number(r.oosVehicle).toFixed(1),
            driver:  +Number(r.oosDriver).toFixed(1),
        }));
    }, [cvorPeriodicReports]);

    const oosBars = [
        { name: "Overall", carrier: oosOverall, threshold: cvorOosThresholds.overall },
        { name: "Vehicle", carrier: oosVehicle, threshold: cvorOosThresholds.vehicle },
        { name: "Driver",  carrier: oosDriver,  threshold: cvorOosThresholds.driver },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={5}
                eyebrow="Section Five"
                title="Inspections & Out-of-Service"
                lede={
                    `Out-of-service performance against MTO's vehicle, driver, and overall thresholds, ` +
                    `with the trend across the most recent periodic CVOR pulls.`
                }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <Stat label="Overall OOS" value={`${oosOverall.toFixed(1)}%`} sub={`Threshold ${cvorOosThresholds.overall}%`} tone={overallTone} />
                <Stat label="Vehicle OOS" value={`${oosVehicle.toFixed(1)}%`} sub={`Threshold ${cvorOosThresholds.vehicle}%`} tone={vehicleTone} />
                <Stat label="Driver OOS"  value={`${oosDriver.toFixed(1)}%`}  sub={`Threshold ${cvorOosThresholds.driver}%`}  tone={driverTone} />
            </div>

            <ChartCard title="OOS Rate vs MTO Threshold">
                <BarChart
                    width={CHART_W} height={200}
                    data={oosBars} margin={{ top: 6, right: 12, bottom: 12, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: C.muted, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9.5, fill: C.soft }} width={28} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="carrier"   name="Carrier"   fill={C.accent} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="threshold" name="Threshold" fill={C.gold}   radius={[3, 3, 0, 0]} />
                </BarChart>
            </ChartCard>

            {trend.length > 1 && (
                <ChartCard title="OOS Trend across CVOR Pulls">
                    <LineChart
                        width={CHART_W} height={200}
                        data={trend} margin={{ top: 6, right: 12, bottom: 24, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                        <XAxis dataKey="label" tick={{ fontSize: 9.5, fill: C.muted, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 9.5, fill: C.soft }} width={26} unit="%" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="overall" name="Overall" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="vehicle" name="Vehicle" stroke={C.orange} strokeWidth={2}   dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="driver"  name="Driver"  stroke={C.indigo} strokeWidth={2}   strokeDasharray="4 3" dot={{ r: 2.5 }} />
                    </LineChart>
                </ChartCard>
            )}
        </div>
    );
}

// ── Travel & Exposure ─────────────────────────────────────────────────

function TravelPage({ cvorTravelKm }: { cvorTravelKm: CvorTravelKmRow[] }) {
    const recent = useMemo(() => {
        // Most recent 10 rows by fromDate
        return [...cvorTravelKm]
            .sort((a, b) => b.fromDate.localeCompare(a.fromDate))
            .slice(0, 10);
    }, [cvorTravelKm]);

    const trend = useMemo(() => {
        const sorted = [...cvorTravelKm].sort((a, b) => a.fromDate.localeCompare(b.fromDate));
        return sorted.map(r => ({
            label: r.fromDate.slice(0, 7),
            ontario:    Math.round(r.ontarioKm / 1_000_000 * 100) / 100,
            canada:     Math.round(r.restOfCanadaKm / 1_000_000 * 100) / 100,
            usMexico:   Math.round(r.usMexicoKm / 1_000_000 * 100) / 100,
        }));
    }, [cvorTravelKm]);

    const latest = recent[0];
    const totalLatest = latest?.totalKm ?? 0;
    const onShare = latest && totalLatest ? Math.round(latest.ontarioKm    / totalLatest * 100) : 0;
    const caShare = latest && totalLatest ? Math.round(latest.restOfCanadaKm / totalLatest * 100) : 0;
    const usShare = latest && totalLatest ? Math.round(latest.usMexicoKm   / totalLatest * 100) : 0;

    const fmt = (n: number) => n.toLocaleString();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={6}
                eyebrow="Section Six"
                title="Travel & Exposure"
                lede={
                    `Reported travel kilometres by jurisdiction. CVOR ratings are normalised by ` +
                    `kilometres, so exposure data drives every per-km calculation in this report.`
                }
            />

            {latest && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                    <Stat label="Latest Period" value={`${latest.fromDate.slice(0, 7)} → ${latest.toDate.slice(0, 7)}`} tone="slate" />
                    <Stat label="Ontario km"     value={fmt(latest.ontarioKm)}      sub={`${onShare}% of total`} tone="indigo" />
                    <Stat label="Rest of Canada" value={fmt(latest.restOfCanadaKm)} sub={`${caShare}% of total`} tone="slate" />
                    <Stat label="US / Mexico"    value={fmt(latest.usMexicoKm)}     sub={`${usShare}% of total`} tone="slate" />
                </div>
            )}

            <ChartCard title="Travel by Jurisdiction (millions of km)">
                <LineChart
                    width={CHART_W} height={210}
                    data={trend} margin={{ top: 6, right: 12, bottom: 24, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.muted, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 9, fill: C.soft }} width={26} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="ontario" name="Ontario"  stroke={C.accent} strokeWidth={2.5} dot={{ r: 2.5 }} />
                    <Line type="monotone" dataKey="canada"  name="Canada"   stroke={C.indigo} strokeWidth={2}   dot={{ r: 2 }} />
                    <Line type="monotone" dataKey="usMexico" name="US / MX" stroke={C.orange} strokeWidth={2}   strokeDasharray="4 3" dot={{ r: 2 }} />
                </LineChart>
            </ChartCard>

            <div>
                <Eyebrow>Recent Reporting Periods</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, border: `1px solid ${C.line}` }}>
                    <thead>
                        <tr>
                            <th style={th}>Period</th>
                            <th style={{ ...th, textAlign: "center" }}>Type</th>
                            <th style={{ ...th, textAlign: "right" }}>Vehicles</th>
                            <th style={{ ...th, textAlign: "right" }}>Drivers</th>
                            <th style={{ ...th, textAlign: "right" }}>Ontario km</th>
                            <th style={{ ...th, textAlign: "right" }}>Rest of CA km</th>
                            <th style={{ ...th, textAlign: "right" }}>US / MX km</th>
                            <th style={{ ...th, textAlign: "right" }}>Total km</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recent.map((r, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                <td style={td}>{r.fromDate} → {r.toDate}</td>
                                <td style={{ ...td, textAlign: "center", color: r.type === "Estimated" ? C.muted : C.green, fontWeight: 700 }}>{r.type}</td>
                                <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{fmt(r.totalVehicles)}</td>
                                <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{fmt(r.drivers)}</td>
                                <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{fmt(r.ontarioKm)}</td>
                                <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{fmt(r.restOfCanadaKm)}</td>
                                <td style={{ ...td, textAlign: "right", fontFamily: MONO }}>{fmt(r.usMexicoKm)}</td>
                                <td style={{ ...td, textAlign: "right", fontFamily: MONO, fontWeight: 800, color: C.accent }}>{fmt(r.totalKm)}</td>
                            </tr>
                        ))}
                        {recent.length === 0 && (
                            <tr><td style={td} colSpan={8}><i style={{ color: C.muted }}>No travel km data available.</i></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── Intervention Status ──────────────────────────────────────────────

function InterventionPage({
    carrierProfile, cvorThresholds, cvorPeriodicReports, interventionPeriod,
}: {
    carrierProfile: CarrierProfile;
    cvorThresholds: { warning: number; intervention: number; showCause: number };
    cvorPeriodicReports: CvorPeriodicReport[];
    interventionPeriod: { fromDate: string; toDate: string };
}) {
    const rating = carrierProfile.cvorAnalysis.rating;
    const tone = classifyCvorRating(rating, cvorThresholds);
    const label = ratingStatusLabel(rating, cvorThresholds);

    const trend = useMemo(() => {
        return [...cvorPeriodicReports]
            .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
            .slice(-12)
            .map(r => ({
                label: r.periodLabel || r.reportDate.slice(0, 7),
                rating: +Number(r.rating).toFixed(2),
            }));
    }, [cvorPeriodicReports]);

    const cap = Math.max(rating, cvorThresholds.showCause + 10, 100);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={7}
                eyebrow="Section Seven"
                title="Intervention Status"
                lede={
                    `Where this carrier sits on the CVOR rating scale and how the rating has trended ` +
                    `over recent periodic pulls. Current intervention period: ` +
                    `${interventionPeriod.fromDate} → ${interventionPeriod.toDate}.`
                }
            />

            <div
                style={{
                    background: "#fff",
                    border: `1px solid ${C.line}`,
                    borderLeft: `4px solid ${TONE[tone].fg}`,
                    borderRadius: 4,
                    padding: "14px 18px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                }}
            >
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Eyebrow color={C.muted}>Current Status</Eyebrow>
                        <ClassBadge tone={tone} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: TONE[tone].fg, marginTop: 4, fontFamily: SERIF, letterSpacing: -0.4, lineHeight: 1.1 }}>
                        {label}
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>Rating</div>
                    <div style={{ fontSize: 38, fontWeight: 700, color: TONE[tone].fg, lineHeight: 1, fontFamily: SERIF }}>
                        {rating.toFixed(1)}<span style={{ fontSize: 18, color: C.muted }}>%</span>
                    </div>
                </div>
            </div>

            {/* Threshold ladder */}
            <div>
                <Eyebrow>Rating Ladder</Eyebrow>
                <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: 14 }}>
                    {[
                        { from: cvorThresholds.showCause,    to: 100,                               name: "Show Cause",    tone: "critical" as ClassTone, advice: "MTO may issue a Show Cause notice; possible registration suspension." },
                        { from: cvorThresholds.intervention, to: cvorThresholds.showCause,          name: "Intervention",  tone: "concern" as ClassTone,  advice: "MTO will likely require a facility audit and written remedial plan." },
                        { from: cvorThresholds.warning,      to: cvorThresholds.intervention,       name: "Warning",       tone: "moderate" as ClassTone, advice: "Advisory letter from MTO; preventative action expected." },
                        { from: 0,                           to: cvorThresholds.warning,            name: "Satisfactory",  tone: "good" as ClassTone,     advice: "No formal action required; maintain monitoring." },
                    ].map((band) => {
                        const inThis = rating >= band.from && rating < band.to;
                        const t = TONE[band.tone];
                        return (
                            <div
                                key={band.name}
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "120px 1fr 110px",
                                    gap: 14, alignItems: "center",
                                    padding: "10px 12px",
                                    background: inThis ? t.bg : "transparent",
                                    border: `1px solid ${inThis ? t.border : "transparent"}`,
                                    borderRadius: 4,
                                    marginBottom: 4,
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <ClassBadge tone={band.tone} />
                                </div>
                                <div>
                                    <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{band.name}</div>
                                    <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2, lineHeight: 1.45 }}>{band.advice}</div>
                                </div>
                                <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 11, fontWeight: 700, color: inThis ? t.fg : C.muted }}>
                                    {band.from}% – {band.to === 100 ? "100" : band.to}%
                                    {inThis && (
                                        <div style={{ fontSize: 9, fontWeight: 800, color: t.fg, marginTop: 2 }}>YOU ARE HERE</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {trend.length > 1 && (
                <ChartCard title="Rating Trend across CVOR Pulls">
                    <LineChart
                        width={CHART_W} height={200}
                        data={trend} margin={{ top: 6, right: 12, bottom: 24, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.muted, fontWeight: 600 }} />
                        <YAxis domain={[0, cap]} tick={{ fontSize: 9, fill: C.soft }} width={28} unit="%" />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="rating" name="Carrier rating" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                        {/* Threshold reference lines */}
                        <Line dataKey={() => cvorThresholds.showCause}    name={`Show Cause ${cvorThresholds.showCause}%`}       stroke={TONE.critical.fg} strokeDasharray="4 3" strokeWidth={1} dot={false} legendType="line" />
                        <Line dataKey={() => cvorThresholds.intervention} name={`Intervention ${cvorThresholds.intervention}%`}  stroke={TONE.concern.fg}  strokeDasharray="4 3" strokeWidth={1} dot={false} legendType="line" />
                        <Line dataKey={() => cvorThresholds.warning}      name={`Warning ${cvorThresholds.warning}%`}            stroke={TONE.moderate.fg} strokeDasharray="4 3" strokeWidth={1} dot={false} legendType="line" />
                    </LineChart>
                </ChartCard>
            )}
        </div>
    );
}

// ── Recommendations ──────────────────────────────────────────────────

function RecommendationsPage({
    carrierProfile, cvorThresholds, cvorOosThresholds,
}: {
    carrierProfile: CarrierProfile;
    cvorThresholds:    { warning: number; intervention: number; showCause: number };
    cvorOosThresholds: { overall: number; vehicle: number; driver: number };
}) {
    const a = carrierProfile.cvorAnalysis;
    const counts = a.counts;
    const rating = a.rating;

    const recs: Array<{ priority: "High" | "Medium" | "Low"; title: string; body: string }> = [];

    if (rating >= cvorThresholds.intervention) {
        recs.push({
            priority: "High",
            title: "Prepare for MTO intervention",
            body:
                `Rating (${rating.toFixed(1)}%) has crossed the intervention threshold (${cvorThresholds.intervention}%). ` +
                `Initiate an internal facility audit dry-run, gather DQ files / PM records / HOS documents, ` +
                `and prepare a written corrective action plan to present if MTO contacts the carrier.`,
        });
    } else if (rating >= cvorThresholds.warning) {
        recs.push({
            priority: "High",
            title: "Drive rating below warning threshold",
            body:
                `Rating (${rating.toFixed(1)}%) is between warning (${cvorThresholds.warning}%) and ` +
                `intervention (${cvorThresholds.intervention}%). Set a 90-day target to drive the rating ` +
                `back below ${cvorThresholds.warning}% before MTO escalates oversight.`,
        });
    }

    // Drill into the largest contributor
    const contributors = [
        { name: "collisions",  v: a.collisions.percentage,
          play: "Conduct an after-action review on each collision in the period; identify common contributing actions / conditions and integrate findings into driver coaching." },
        { name: "convictions", v: a.convictions.percentage,
          play: "Audit the top 10 convicted drivers' MVRs, schedule remedial training, and review dispatch routing through high-violation corridors." },
        { name: "inspections", v: a.inspections.percentage,
          play: "Tighten pre-trip inspection checks on the highest-cited equipment, accelerate brake / lighting PM intervals, and audit the last 90 days of work orders." },
    ].sort((x, y) => y.v - x.v);
    const dom = contributors[0];
    if (dom.v > 0) {
        recs.push({
            priority: rating >= cvorThresholds.warning ? "High" : "Medium",
            title: `Reduce ${dom.name} contribution (${dom.v.toFixed(1)}% of threshold)`,
            body: dom.play,
        });
    }

    if ((counts.oosOverall ?? 0) >= cvorOosThresholds.overall) {
        recs.push({
            priority: "High",
            title: "Reduce overall OOS rate",
            body:
                `Overall OOS rate (${(counts.oosOverall ?? 0).toFixed(1)}%) meets or exceeds the MTO ` +
                `threshold (${cvorOosThresholds.overall}%). Drive a 90-day target by hardening pre-trip ` +
                `inspections and accelerating PM intervals on the highest-cited equipment.`,
        });
    }

    if ((a.collisionDetails?.fatal ?? 0) > 0) {
        recs.push({
            priority: "High",
            title: "Conduct fatality after-action review",
            body:
                `One or more fatal collisions were recorded in the review window. Conduct a structured ` +
                `after-action review with safety, operations, and legal — capture root causes and apply ` +
                `findings to driver hiring, training, and dispatch policy.`,
        });
    }

    if (recs.length === 0) {
        recs.push({
            priority: "Low",
            title: "Maintain monitoring cadence",
            body:
                "The rating remains comfortably below MTO's warning threshold. Continue monthly review cadence and act on emerging trends early.",
        });
    }

    recs.push(
        {
            priority: "Medium",
            title: "Driver coaching reinforcement",
            body:
                "Recognise drivers whose CVOR-period inspections were clean and use these as anchor examples in monthly safety meetings.",
        },
        {
            priority: "Low",
            title: "Quarterly internal mock CVOR audit",
            body:
                "Run an internal mock audit each quarter — driver qualification files, daily inspection records, hours-of-service supporting documents, and PM records.",
        },
    );

    const ptone = (p: "High" | "Medium" | "Low") =>
        p === "High" ? TONE.critical : p === "Medium" ? TONE.moderate : TONE.good;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={8}
                eyebrow="Section Eight"
                title="Recommendations"
                lede={
                    `A prioritised, data-driven action list. Items are derived directly from this carrier's ` +
                    `CVOR rating, collisions, convictions, inspections, and OOS performance.`
                }
            />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recs.map((rec, i) => {
                    const t = ptone(rec.priority);
                    return (
                        <div
                            key={i}
                            style={{
                                border: `1px solid ${C.line}`,
                                borderLeft: `4px solid ${t.fg}`,
                                borderRadius: 8,
                                background: "#fff",
                                padding: "10px 14px",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                                <span
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        width: 78,
                                        color: t.fg,
                                        fontSize: 9, fontWeight: 800,
                                        textTransform: "uppercase",
                                        letterSpacing: 1.2,
                                        flexShrink: 0,
                                        lineHeight: 1,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 6, height: 6, borderRadius: 6,
                                            background: t.fg, display: "inline-block",
                                            transform: "translateY(-0.5px)",
                                            flexShrink: 0,
                                        }}
                                    />
                                    {rec.priority}
                                </span>
                                <span
                                    style={{
                                        display: "inline-block",
                                        width: 22,
                                        fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: C.muted,
                                        flexShrink: 0,
                                    }}
                                >
                                    {String(i + 1).padStart(2, "0")}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: -0.2 }}>{rec.title}</span>
                            </div>
                            <div style={{ fontSize: 10.5, color: C.body, lineHeight: 1.55 }}>{rec.body}</div>
                        </div>
                    );
                })}
            </div>

            <div
                style={{
                    marginTop: 6,
                    padding: "12px 14px",
                    background: C.softBg,
                    border: `1px solid ${C.line}`,
                    borderRadius: 8,
                    fontSize: 9.5,
                    color: C.muted,
                    lineHeight: 1.5,
                }}
            >
                <b style={{ color: C.ink }}>Disclaimer.</b> This report is generated from internal records
                and CVOR-derived metrics for management use. It is not a substitute for the official CVOR
                Abstract issued by the Ontario Ministry of Transportation. Figures may differ slightly
                from MTO publications based on data refresh timing.
            </div>
        </div>
    );
}

// ── Public component ──────────────────────────────────────────────────

export function CvorPdfReport({
    carrierProfile,
    cvorThresholds,
    cvorOosThresholds,
    cvorPeriodicReports,
    cvorTravelKm,
    interventionPeriod,
    reportDate = new Date(),
}: CvorPdfReportProps) {
    const a = carrierProfile.cvorAnalysis;
    const ratingTone = classifyCvorRating(a.rating, cvorThresholds);
    const ratingLabel = ratingStatusLabel(a.rating, cvorThresholds);

    const collisionTone: ClassTone = (() => {
        const f = a.collisionDetails?.fatal ?? 0;
        const i = a.collisionDetails?.personalInjury ?? 0;
        const p = a.collisionDetails?.propertyDamage ?? 0;
        if (f > 0) return "critical";
        if (i > 2) return "concern";
        if (i > 0 || p > 5) return "moderate";
        if (p > 0) return "good";
        return "excellent";
    })();
    const convictionTone: ClassTone = (() => {
        const total = (a.convictionDetails?.total ?? 0)
            || ((a.convictionDetails?.driver ?? 0)
              + (a.convictionDetails?.vehicle ?? 0)
              + (a.convictionDetails?.load ?? 0)
              + (a.convictionDetails?.other ?? 0));
        if (total > 14) return "critical";
        if (total > 6)  return "concern";
        if (total > 2)  return "moderate";
        if (total > 0)  return "good";
        return "excellent";
    })();
    const inspectionsTone: ClassTone = classifyOos(a.counts.oosOverall ?? 0, cvorOosThresholds.overall);
    const overall = rollUp([ratingTone, collisionTone, convictionTone, inspectionsTone]);

    // Build sections — all are present unconditionally for CVOR (data is always
    // there even if zeros). We could skip travel if `cvorTravelKm` is empty.
    const sections: Section[] = [];
    sections.push({ id: "cover", title: "Cover", label: "Cover", page: 0, chromeless: true });
    sections.push({ id: "toc", title: "Table of Contents", label: "Index", page: 0 });
    sections.push({
        id: "executive", title: "Executive Summary", label: "Executive Summary",
        summary: "Headline rating, KPIs, and a data-driven narrative.",
        tone: overall, page: 0,
    });
    sections.push({
        id: "rating-composition", title: "Rating Composition", label: "Rating Composition",
        summary: "How collisions, convictions, and inspections combine into the overall rating.",
        tone: ratingTone, page: 0,
    });
    sections.push({
        id: "collisions", title: "Collision Profile", label: "Collisions",
        summary: "Breakdown of reported collisions by severity, plus assigned points.",
        tone: collisionTone, page: 0,
    });
    sections.push({
        id: "convictions", title: "Conviction Profile", label: "Convictions",
        summary: "Breakdown of convictions by responsibility (driver / vehicle / load / other).",
        tone: convictionTone, page: 0,
    });
    sections.push({
        id: "inspections", title: "Inspections & Out-of-Service", label: "Inspections / OOS",
        summary: "OOS performance against MTO thresholds and the trend across recent CVOR pulls.",
        tone: inspectionsTone, page: 0,
    });
    if (cvorTravelKm && cvorTravelKm.length > 0) {
        sections.push({
            id: "travel", title: "Travel & Exposure", label: "Travel & Exposure",
            summary: "Reported kilometres by jurisdiction across recent reporting periods.",
            tone: "good", page: 0,
        });
    }
    sections.push({
        id: "intervention", title: "Intervention Status", label: "Intervention Status",
        summary: "Where the rating sits on the CVOR ladder and how it has trended.",
        tone: ratingTone, page: 0,
    });
    sections.push({
        id: "recommendations", title: "Recommendations", label: "Recommendations",
        summary: "Prioritised, data-driven action list.",
        page: 0,
    });

    sections.forEach((s, i) => { s.page = i + 1; });
    const totalPages = sections.length;

    const carrierName = carrierProfile.name || "Unknown Carrier";
    const cvorNumber = carrierProfile.cvor ?? "—";

    const renderSection = (s: Section) => {
        switch (s.id) {
            case "cover":
                return (
                    <CoverPage
                        carrierProfile={carrierProfile}
                        reportDate={reportDate}
                        overall={ratingTone}
                        ratingLabel={ratingLabel}
                        interventionPeriod={interventionPeriod}
                    />
                );
            case "toc":
                return <TocPage sections={sections} />;
            case "executive":
                return (
                    <ExecutiveSummaryPage
                        carrierProfile={carrierProfile}
                        cvorThresholds={cvorThresholds}
                        overall={ratingTone}
                        ratingLabel={ratingLabel}
                    />
                );
            case "rating-composition":
                return <RatingCompositionPage carrierProfile={carrierProfile} cvorThresholds={cvorThresholds} />;
            case "collisions":
                return <CollisionsPage carrierProfile={carrierProfile} />;
            case "convictions":
                return <ConvictionsPage carrierProfile={carrierProfile} />;
            case "inspections":
                return (
                    <InspectionsPagePdf
                        carrierProfile={carrierProfile}
                        cvorOosThresholds={cvorOosThresholds}
                        cvorPeriodicReports={cvorPeriodicReports}
                    />
                );
            case "travel":
                return <TravelPage cvorTravelKm={cvorTravelKm} />;
            case "intervention":
                return (
                    <InterventionPage
                        carrierProfile={carrierProfile}
                        cvorThresholds={cvorThresholds}
                        cvorPeriodicReports={cvorPeriodicReports}
                        interventionPeriod={interventionPeriod}
                    />
                );
            case "recommendations":
                return (
                    <RecommendationsPage
                        carrierProfile={carrierProfile}
                        cvorThresholds={cvorThresholds}
                        cvorOosThresholds={cvorOosThresholds}
                    />
                );
        }
    };

    // Suppress overall-only warnings — overall is rolled up but currently
    // surfaces only via per-section tones; keeping the calc for future use.
    void overall;

    return (
        <div style={{ background: "#fff" }}>
            {sections.map(s =>
                s.chromeless ? (
                    <div key={s.id} className="pdf-page" style={{ width: A4_W, height: A4_H }}>
                        {renderSection(s)}
                    </div>
                ) : (
                    <Page
                        key={s.id}
                        pageNumber={s.page}
                        totalPages={totalPages}
                        sectionLabel={s.label}
                        carrierName={carrierName}
                        cvorNumber={cvorNumber}
                    >
                        {renderSection(s)}
                    </Page>
                )
            )}
        </div>
    );
}
