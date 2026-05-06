// Multi-page A4 FMCSA report — captured by html2canvas → jsPDF in
// `generateFmcsaPdf.ts`. Layout is fully dynamic: sections without
// supporting data are skipped, the table of contents and page numbers
// update accordingly, and every chart / table / commentary string is
// derived from the active carrier's records.

import { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    PieChart, Pie, Cell, Legend,
    LineChart, Line,
} from "recharts";

export const A4_W = 794;
export const A4_H = 1123;
export const PAGE_PAD_X = 56;
export const CHART_W = A4_W - PAGE_PAD_X * 2 - 24;

// ── Types ─────────────────────────────────────────────────────────────

type BasicItem = {
    category: string;
    measure: string;
    percentile: string;
    alert: boolean;
    details: string;
};

type Inspection = {
    id: string;
    date: string;
    state?: string;
    location?: { city?: string; province?: string; raw?: string };
    level?: string;
    isClean?: boolean;
    hasOOS?: boolean;
    severityRate?: number;
    smsPoints?: { vehicle?: number; driver?: number; carrier?: number };
    violations?: Array<{
        code?: string;
        category?: string;
        description?: string;
        subDescription?: string;
        severity?: number;
        oos?: boolean;
        points?: number;
    }>;
    oosSummary?: { driver?: string; vehicle?: string; total?: number };
    violationSummary?: Record<string, number>;
};

type CarrierProfile = {
    id?: string | number;
    name?: string;
    address?: string;
    vehicles?: number;
    drivers?: number;
    rating?: string;
    oosRates?: {
        vehicle?: { carrier?: string; national?: string };
        driver?: { carrier?: string; national?: string };
        hazmat?: { carrier?: string; national?: string };
    };
    licensing?: {
        property?: { active?: string; mc?: string };
        passenger?: { active?: string; mc?: string };
        household?: { active?: string; mc?: string };
        broker?: { active?: string; mc?: string };
    };
};

export interface FmcsaPdfReportProps {
    carrierProfile: CarrierProfile;
    basicOverview: BasicItem[];
    csaThresholds: { warning: number; critical: number };
    inspections: Inspection[];
    reportDate?: Date;
    /** kept for API compatibility; intentionally not rendered now */
    generatedBy?: string;
}

// ── Theme ─────────────────────────────────────────────────────────────

// Authoritative navy/slate palette tuned for print clarity. Colours are
// chosen to read well after JPEG compression in the final PDF.
export const C = {
    ink:     "#0b1320",   // deep navy-charcoal — body text + headlines
    body:    "#1f2937",
    muted:   "#5b6573",
    soft:    "#94a3b8",
    line:    "#e6e8ec",
    softer:  "#f3f4f7",
    softBg:  "#fafbfc",

    accent:     "#0f2748", // primary navy
    accentSoft: "#e7ecf3",
    gold:       "#a37016", // restrained gold for accents

    red:        "#b91c1c",
    redSoft:    "#fdecec",
    redBorder:  "#f5cdcd",
    amber:      "#92611a",
    amberSoft:  "#fbf3df",
    amberBorder:"#ecd9aa",
    orange:     "#a3461a",
    orangeSoft: "#fbede0",
    orangeBorder:"#f0d3b5",
    green:      "#13715b",
    greenSoft:  "#e3f2ec",
    greenBorder:"#bcdcd0",
    indigo:     "#373a8e",
    indigoSoft: "#e8e9f5",
};

export const FONT = `"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
export const SERIF = `"Source Serif Pro", "Georgia", "Times New Roman", serif`;
export const MONO = `"JetBrains Mono", "Consolas", "Menlo", monospace`;
export const PIE_COLORS = ["#0f2748", "#356596", "#13715b", "#a37016", "#a3461a", "#b91c1c", "#373a8e", "#5b6573"];

// ── Classification system ─────────────────────────────────────────────

export type ClassTone = "excellent" | "good" | "moderate" | "concern" | "critical";

export const TONE: Record<ClassTone, { label: string; fg: string; bg: string; border: string; advice: string }> = {
    excellent: { label: "Excellent", fg: C.green,  bg: C.greenSoft,  border: C.greenBorder,  advice: "Outstanding — well below peer norms." },
    good:      { label: "Good",      fg: C.green,  bg: C.greenSoft,  border: C.greenBorder,  advice: "Performance is within healthy peer ranges." },
    moderate:  { label: "Moderate",  fg: C.amber,  bg: C.amberSoft,  border: C.amberBorder,  advice: "Approaching threshold — monitor closely." },
    concern:   { label: "Concern",   fg: C.orange, bg: C.orangeSoft, border: C.orangeBorder, advice: "Above peer norms — corrective focus warranted." },
    critical:  { label: "Critical",  fg: C.red,    bg: C.redSoft,    border: C.redBorder,    advice: "Above intervention threshold — immediate action recommended." },
};

/** Classify an FMCSA-style percentile (0–100, higher = worse) using the
 *  carrier's configured warning + intervention thresholds. */
export function classifyPercentile(pct: number | null, thresholds: { warning: number; critical: number }): ClassTone {
    if (pct === null) return "good";
    if (pct >= thresholds.critical) return "critical";
    if (pct >= thresholds.warning)  return "concern";
    if (pct >= 50) return "moderate";
    if (pct >= 25) return "good";
    return "excellent";
}

/** Classify an OOS rate by comparing against the national average. */
export function classifyOos(carrierPct: number, nationalPct: number): ClassTone {
    if (!isFinite(carrierPct) || !isFinite(nationalPct) || nationalPct === 0) return "moderate";
    const ratio = carrierPct / nationalPct;
    if (ratio <= 0.5)  return "excellent";
    if (ratio <= 0.85) return "good";
    if (ratio <= 1.15) return "moderate";
    if (ratio <= 1.5)  return "concern";
    return "critical";
}

/** Worst-of helper used to roll a list of category classifications up. */
export function rollUp(tones: ClassTone[]): ClassTone {
    const order: ClassTone[] = ["critical", "concern", "moderate", "good", "excellent"];
    for (const t of order) if (tones.includes(t)) return t;
    return "good";
}

// ── Page chrome ───────────────────────────────────────────────────────

function Page({
    pageNumber, totalPages, sectionLabel, carrierName, dotNumber, children, hideHeader,
}: {
    pageNumber: number;
    totalPages: number;
    sectionLabel: string;
    carrierName: string;
    dotNumber: string | number;
    children: React.ReactNode;
    hideHeader?: boolean;
}) {
    return (
        <div
            className="pdf-page"
            style={{
                width: A4_W,
                height: A4_H,
                background: "#ffffff",
                color: C.ink,
                fontFamily: FONT,
                fontSize: 11,
                position: "relative",
                pageBreakAfter: "always",
                breakAfter: "page",
                boxSizing: "border-box",
                padding: `${hideHeader ? 0 : 40}px ${PAGE_PAD_X}px 44px`,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {!hideHeader && (
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
                        <div
                            style={{
                                width: 4, height: 22, background: C.accent, borderRadius: 2,
                            }}
                        />
                        <div>
                            <div style={{ fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1.6 }}>
                                FMCSA · Safety Measurement System
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginTop: 1, letterSpacing: -0.1 }}>
                                Carrier Safety & Compliance Report
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                            Subject Carrier
                        </div>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                            {carrierName}
                            <span style={{ color: C.muted, fontWeight: 600, marginLeft: 8, fontFamily: MONO }}>USDOT {dotNumber}</span>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {children}
            </div>

            {!hideHeader && (
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
            )}
        </div>
    );
}

// ── Reusable typography ───────────────────────────────────────────────

export function H1({ children }: { children: React.ReactNode }) {
    return (
        <h1
            style={{
                fontSize: 26, fontWeight: 700, color: C.ink, margin: 0,
                lineHeight: 1.15, letterSpacing: -0.6,
                fontFamily: SERIF,
            }}
        >
            {children}
        </h1>
    );
}
export function H2({ children }: { children: React.ReactNode }) {
    return (
        <h2 style={{ fontSize: 13.5, fontWeight: 700, color: C.ink, margin: 0, lineHeight: 1.2, letterSpacing: -0.1 }}>
            {children}
        </h2>
    );
}
export function Eyebrow({ children, color = C.gold }: { children: React.ReactNode; color?: string }) {
    return (
        <div
            style={{
                fontSize: 9, fontWeight: 800, color,
                textTransform: "uppercase", letterSpacing: 2,
                marginBottom: 6,
            }}
        >
            {children}
        </div>
    );
}
export function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <p style={{ fontSize: 10.5, lineHeight: 1.6, color: C.body, margin: 0, ...style }}>
            {children}
        </p>
    );
}

/** Elegant section header — number chip + eyebrow + serif H1 + thin rule. */
export function SectionHead({
    number, eyebrow, title, lede,
}: { number: number; eyebrow: string; title: string; lede?: string }) {
    return (
        <div style={{ marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div
                    style={{
                        fontFamily: MONO, fontWeight: 800, fontSize: 11,
                        color: "#fff", background: C.accent,
                        padding: "3px 9px", borderRadius: 3,
                        letterSpacing: 1,
                    }}
                >
                    {String(number).padStart(2, "0")}
                </div>
                <div
                    style={{
                        fontSize: 9, fontWeight: 800, color: C.gold,
                        textTransform: "uppercase", letterSpacing: 2,
                    }}
                >
                    {eyebrow}
                </div>
            </div>
            <H1>{title}</H1>
            <div style={{ height: 2, width: 48, background: C.gold, marginTop: 10, marginBottom: 12, borderRadius: 1 }} />
            {lede && <Body style={{ maxWidth: 600 }}>{lede}</Body>}
        </div>
    );
}

export function ClassBadge({ tone, big }: { tone: ClassTone; big?: boolean }) {
    const t = TONE[tone];
    const dot = big ? 7 : 6;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: big ? 10 : 9,
                fontWeight: 800,
                color: t.fg,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                lineHeight: 1,
            }}
        >
            <span
                style={{
                    width: dot, height: dot, borderRadius: dot,
                    background: t.fg, display: "inline-block",
                    // Uppercase letters have no descender — their optical centre sits
                    // above the bounding-box centre, so nudge the dot up to match.
                    transform: "translateY(-0.5px)",
                    flexShrink: 0,
                }}
            />
            {t.label}
        </span>
    );
}

export function Stat({
    label, value, sub, tone = "slate",
}: {
    label: string;
    value: React.ReactNode;
    sub?: string;
    tone?: "slate" | ClassTone | "indigo";
}) {
    const accent =
        tone === "slate"  ? C.muted
        : tone === "indigo" ? C.indigo
        : TONE[tone].fg;
    return (
        <div
            style={{
                position: "relative",
                background: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: "11px 13px 11px 16px",
                overflow: "hidden",
            }}
        >
            {/* accent rail */}
            <div
                style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: 3, background: accent,
                }}
            />
            <div
                style={{
                    fontSize: 8.5, fontWeight: 800,
                    color: C.muted,
                    textTransform: "uppercase", letterSpacing: 1.4,
                }}
            >
                {label}
            </div>
            <div
                style={{
                    fontSize: 24, fontWeight: 700,
                    color: C.ink, marginTop: 3, lineHeight: 1.05,
                    letterSpacing: -0.6,
                    fontFamily: SERIF,
                }}
            >
                {value}
            </div>
            {sub && (
                <div style={{ fontSize: 9.5, color: C.muted, marginTop: 3, fontWeight: 500 }}>{sub}</div>
            )}
        </div>
    );
}

export function ChartCard({ title, children }: { title?: string; children: React.ReactNode }) {
    return (
        <div
            style={{
                background: "#fff",
                border: `1px solid ${C.line}`,
                borderRadius: 6,
                padding: title ? "12px 14px 10px" : 10,
            }}
        >
            {title && (
                <div
                    style={{
                        fontSize: 9, fontWeight: 800, color: C.muted,
                        textTransform: "uppercase", letterSpacing: 1.6,
                        marginBottom: 6,
                        paddingBottom: 6,
                        borderBottom: `1px solid ${C.softer}`,
                    }}
                >
                    {title}
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "center" }}>{children}</div>
        </div>
    );
}

// ── Table styles ──────────────────────────────────────────────────────

export const th: React.CSSProperties = {
    textAlign: "left",
    padding: "9px 12px",
    fontSize: 8.5,
    fontWeight: 800,
    color: C.muted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    background: "#fff",
    borderBottom: `1.5px solid ${C.accent}`,
};
export const td: React.CSSProperties = {
    padding: "9px 12px",
    color: C.ink,
    verticalAlign: "top",
    fontSize: 10.5,
};

// ── Section model ────────────────────────────────────────────────────

type SectionId =
    | "cover" | "toc" | "executive" | "basic-profile" | "basic-detail"
    | "inspection-trends" | "violations" | "oos-licensing" | "recommendations";

type Section = {
    id: SectionId;
    title: string;
    /** The label shown in the page footer. */
    label: string;
    /** Short description used on the TOC. */
    summary?: string;
    /** Status pill on the TOC (only for content-bearing sections). */
    tone?: ClassTone;
    /** Page number in the final document — assigned after filtering. */
    page: number;
    /** Hide footer / header (cover only). */
    chromeless?: boolean;
};

// ── Cover ─────────────────────────────────────────────────────────────

function CoverPage({
    carrierProfile, reportDate, totalInspections, alertCount, overall,
}: {
    carrierProfile: CarrierProfile;
    reportDate: Date;
    totalInspections: number;
    alertCount: number;
    overall: ClassTone;
}) {
    const t = TONE[overall];
    const docId = `FMCSA-${(carrierProfile.id ?? "").toString()}-${reportDate.getFullYear()}`;
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
            {/* Navy header band */}
            <div
                style={{
                    background: C.accent,
                    color: "#fff",
                    padding: "26px 64px 22px",
                    position: "relative",
                }}
            >
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
                        >F</div>
                        <div>
                            <div
                                style={{
                                    fontSize: 8.5, fontWeight: 800,
                                    color: "rgba(255,255,255,0.7)",
                                    textTransform: "uppercase", letterSpacing: 2,
                                }}
                            >
                                United States · Department of Transportation
                            </div>
                            <div
                                style={{
                                    fontSize: 14, fontWeight: 700, marginTop: 2,
                                    letterSpacing: 0.4,
                                }}
                            >
                                FMCSA · Safety Measurement System
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: "right", marginTop: 4 }}>
                        <div
                            style={{
                                fontSize: 8, fontWeight: 800,
                                color: "rgba(255,255,255,0.65)",
                                textTransform: "uppercase", letterSpacing: 2,
                            }}
                        >
                            Document
                        </div>
                        <div
                            style={{
                                fontSize: 10, fontFamily: MONO, fontWeight: 600,
                                color: "rgba(255,255,255,0.95)", marginTop: 2,
                            }}
                        >
                            {docId}
                        </div>
                    </div>
                </div>
                {/* Gold accent rule */}
                <div style={{ height: 3, background: C.gold, marginTop: 22, borderRadius: 1.5 }} />
            </div>

            {/* Content */}
            <div style={{ padding: "60px 64px 56px", display: "flex", flexDirection: "column", flex: 1 }}>
                {/* Eyebrow + Title */}
                <div
                    style={{
                        fontSize: 9, fontWeight: 800, color: C.gold,
                        textTransform: "uppercase", letterSpacing: 2.4,
                    }}
                >
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
                    Carrier Safety<br/>
                    <span style={{ color: C.accent }}>&</span> Compliance Report
                </div>
                <div
                    style={{
                        fontSize: 13, color: C.body, lineHeight: 1.65,
                        maxWidth: 560, fontWeight: 400,
                    }}
                >
                    A multi-page assessment of this carrier's FMCSA safety posture — SMS BASIC
                    percentile standing, inspection history, violation profile, and out-of-service
                    performance — across the trailing twenty-four-month review window.
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
                    <div
                        style={{
                            fontSize: 8.5, fontWeight: 800, color: C.gold,
                            textTransform: "uppercase", letterSpacing: 2,
                        }}
                    >
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
                            { k: "USDOT",       v: String(carrierProfile.id ?? "—"), mono: true },
                            { k: "Address",     v: carrierProfile.address || "—" },
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
                            Overall Posture
                        </div>
                        <div
                            style={{
                                fontSize: 24, fontWeight: 700, color: t.fg,
                                marginTop: 4, lineHeight: 1.1,
                                fontFamily: SERIF, letterSpacing: -0.4,
                            }}
                        >
                            {t.label}
                        </div>
                        <div style={{ fontSize: 10.5, color: C.body, marginTop: 4, lineHeight: 1.55 }}>{t.advice}</div>
                    </div>
                    <div style={{ width: 1, height: 56, background: C.line }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "center" }}>
                        <KpiBlock label="Safety Rating" value={carrierProfile.rating || "Not Rated"} />
                        <KpiBlock label="BASIC Alerts" value={`${alertCount} / 7`} alert={alertCount > 0} />
                        <KpiBlock label="Inspections" value={String(totalInspections)} />
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
                        { k: "Report Date",       v: reportDate.toLocaleDateString("en-US", { dateStyle: "long" }) },
                        { k: "Reference Period",  v: "Trailing 24 months" },
                        { k: "Issuing System",    v: "TrackSmart Compliance" },
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

export function KpiBlock({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 8, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                {label}
            </div>
            <div
                style={{
                    fontSize: 17, fontWeight: 700, color: alert ? C.red : C.ink,
                    marginTop: 4, fontFamily: SERIF, letterSpacing: -0.3,
                }}
            >
                {value}
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
                            gridTemplateColumns: "40px 1fr 96px 70px",
                            alignItems: "center",
                            gap: 14,
                            padding: "14px 0",
                            borderTop: i === 0 ? `1px solid ${C.line}` : "none",
                            borderBottom: `1px solid ${C.line}`,
                        }}
                    >
                        <div
                            style={{
                                fontFamily: MONO,
                                fontWeight: 700,
                                fontSize: 12,
                                color: C.gold,
                                letterSpacing: 0,
                            }}
                        >
                            {String(i + 1).padStart(2, "0")}
                        </div>
                        <div>
                            <div
                                style={{
                                    fontFamily: SERIF,
                                    fontSize: 16,
                                    fontWeight: 700,
                                    color: C.ink,
                                    letterSpacing: -0.3,
                                    lineHeight: 1.15,
                                }}
                            >
                                {s.title}
                            </div>
                            {s.summary && (
                                <div style={{ fontSize: 10, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{s.summary}</div>
                            )}
                        </div>
                        <div>
                            {s.tone && <ClassBadge tone={s.tone} />}
                        </div>
                        <div
                            style={{
                                fontFamily: MONO,
                                fontWeight: 700,
                                fontSize: 16,
                                color: C.accent,
                                textAlign: "right",
                                letterSpacing: -0.5,
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
                <div
                    style={{
                        fontSize: 8.5, fontWeight: 800, color: C.gold,
                        textTransform: "uppercase", letterSpacing: 1.8, marginBottom: 6,
                    }}
                >
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
    carrierProfile, basicOverview, csaThresholds,
    totalInspections, oosCount, cleanCount, avgSeverity,
    alertedCategories, overall,
}: {
    carrierProfile: CarrierProfile;
    basicOverview: BasicItem[];
    csaThresholds: { warning: number; critical: number };
    totalInspections: number;
    oosCount: number;
    cleanCount: number;
    avgSeverity: number;
    alertedCategories: BasicItem[];
    overall: ClassTone;
}) {
    const valid = basicOverview.filter(b => b.percentile !== "N/A");
    const avgPercentile = valid.length
        ? Math.round(valid.reduce((s, b) => s + (parseInt(b.percentile) || 0), 0) / valid.length)
        : 0;

    const cleanPct = totalInspections ? Math.round((cleanCount / totalInspections) * 100) : 0;
    const oosPct   = totalInspections ? Math.round((oosCount / totalInspections) * 100) : 0;

    const bestCat = [...basicOverview]
        .filter(b => b.percentile !== "N/A")
        .sort((a, b) => parseInt(a.percentile) - parseInt(b.percentile))[0];
    const worstCat = [...basicOverview]
        .filter(b => b.percentile !== "N/A")
        .sort((a, b) => parseInt(b.percentile) - parseInt(a.percentile))[0];

    const t = TONE[overall];

    // Narrative built from data
    const narrative = useMemo(() => {
        const parts: string[] = [];
        parts.push(
            `Over the trailing 24-month review window this report covers ${totalInspections} ` +
            `roadside inspection${totalInspections === 1 ? "" : "s"} attributed to ` +
            `${carrierProfile.name || "the carrier"}.`
        );
        if (alertedCategories.length === 0) {
            parts.push(
                `No FMCSA SMS BASIC categor${valid.length === 1 ? "y" : "ies"} currently exceeds the ` +
                `${csaThresholds.critical}% intervention threshold; all measured categories sit within peer norms.`
            );
        } else {
            const names = alertedCategories.slice(0, 3).map(a => `${a.category} (${a.percentile})`).join(", ");
            parts.push(
                `${alertedCategories.length} BASIC categor${alertedCategories.length === 1 ? "y is" : "ies are"} ` +
                `above the ${csaThresholds.critical}% intervention threshold — ${names}. ` +
                `These are the highest-priority remediation targets.`
            );
        }
        if (oosPct > 25) {
            parts.push(
                `Out-of-service rate (${oosPct}%) is well above the national average and is the ` +
                `single biggest opportunity to improve the overall posture in the next 90 days.`
            );
        } else if (oosPct > 10) {
            parts.push(
                `Out-of-service rate stands at ${oosPct}% — comparable to national norms. ` +
                `Tightening pre-trip inspections will help drive it down.`
            );
        } else if (totalInspections > 0) {
            parts.push(
                `Out-of-service rate (${oosPct}%) is healthy and well below the national average.`
            );
        }
        if (worstCat && bestCat) {
            parts.push(
                `Strongest area is ${bestCat.category} (${bestCat.percentile}); the highest-priority ` +
                `area is ${worstCat.category} (${worstCat.percentile}).`
            );
        }
        return parts.join(" ");
    }, [carrierProfile.name, totalInspections, alertedCategories, valid.length, csaThresholds.critical, oosPct, bestCat, worstCat]);

    const chartData = basicOverview.map(b => ({
        name: b.category.length > 14 ? b.category.slice(0, 12) + "…" : b.category,
        full: b.category,
        percentile: b.percentile === "N/A" ? 0 : parseInt(b.percentile) || 0,
        alert: b.alert,
    }));

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
                        <Eyebrow color={C.muted}>Overall Posture</Eyebrow>
                        <ClassBadge tone={overall} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: t.fg, marginTop: 4, lineHeight: 1.1 }}>
                        {avgPercentile}% average percentile
                    </div>
                    <div style={{ fontSize: 10.5, color: C.body, marginTop: 4 }}>
                        Across {valid.length} measurable categor{valid.length === 1 ? "y" : "ies"}.
                        {" "}Warning {csaThresholds.warning}% · Intervention {csaThresholds.critical}%.
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                        Alerts
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: alertedCategories.length > 0 ? C.red : C.green, lineHeight: 1, fontFamily: MONO }}>
                        {alertedCategories.length}
                    </div>
                    <div style={{ fontSize: 9.5, color: C.soft }}>of 7 categories</div>
                </div>
            </div>

            {/* KPI tiles */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <Stat label="Inspections" value={totalInspections} sub="24-month window" tone="indigo" />
                <Stat label="Clean Rate" value={`${cleanPct}%`} sub={`${cleanCount} clean`} tone={cleanPct >= 75 ? "excellent" : cleanPct >= 60 ? "good" : cleanPct >= 40 ? "moderate" : "concern"} />
                <Stat label="Out-of-Service" value={`${oosPct}%`} sub={`${oosCount} OOS`} tone={oosPct > 25 ? "critical" : oosPct > 10 ? "moderate" : "good"} />
                <Stat label="Avg Severity" value={avgSeverity.toFixed(2)} sub="Per inspection" tone={avgSeverity > 5 ? "concern" : avgSeverity > 3 ? "moderate" : "good"} />
            </div>

            {/* Narrative */}
            <div>
                <Eyebrow>Findings Narrative</Eyebrow>
                <Body>{narrative}</Body>
            </div>

            {/* Mini chart */}
            <div>
                <Eyebrow>BASIC Percentile Ranking</Eyebrow>
                <ChartCard>
                    <BarChart
                        width={CHART_W} height={210}
                        data={chartData} margin={{ top: 6, right: 12, bottom: 38, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.muted, fontWeight: 600 }} angle={-30} textAnchor="end" interval={0} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9.5, fill: C.soft }} width={28} />
                        <Tooltip />
                        <Bar dataKey="percentile" name="Percentile" radius={[3, 3, 0, 0]}>
                            {chartData.map((entry, i) => {
                                const tone = classifyPercentile(entry.percentile, csaThresholds);
                                return <Cell key={i} fill={TONE[tone].fg} />;
                            })}
                        </Bar>
                    </BarChart>
                </ChartCard>
            </div>
        </div>
    );
}

// ── BASIC Profile (charts + per-category cards) ───────────────────────

function BasicProfilePage({
    basicOverview, csaThresholds,
}: {
    basicOverview: BasicItem[];
    csaThresholds: { warning: number; critical: number };
}) {
    const radarData = basicOverview.map(b => ({
        subject: b.category
            .replace("Hours-of-service Compliance", "HOS")
            .replace("Controlled Substances", "Ctrl Sub")
            .replace("Vehicle Maintenance", "Veh Maint")
            .replace("Driver Fitness", "Drv Fit")
            .replace("Unsafe Driving", "Unsafe Drv")
            .replace("Hazmat compliance", "Hazmat")
            .replace("Crash Indicator", "Crash")
            .replace("Others", "Other"),
        Percentile: b.percentile === "N/A" ? 0 : parseInt(b.percentile) || 0,
        Threshold: csaThresholds.critical,
    }));

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={2}
                eyebrow="Section Two"
                title="BASIC Performance Profile"
                lede={
                    `The seven Behaviour Analysis and Safety Improvement Categories (BASICs) compare this ` +
                    `carrier's roadside-inspection record against a peer group. Higher percentile means worse ` +
                    `relative performance. The dashed red line marks the FMCSA intervention threshold (` +
                    `${csaThresholds.critical}%); the amber line is the warning threshold (${csaThresholds.warning}%).`
                }
            />

            <ChartCard title="Radar Overview">
                <RadarChart
                    width={CHART_W} height={290}
                    data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
                >
                    <PolarGrid stroke={C.line} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: C.muted, fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: C.soft }} />
                    <Radar name="This Carrier" dataKey="Percentile" stroke={C.accent} fill={C.accent} fillOpacity={0.22} strokeWidth={2} />
                    <Radar name="Intervention Threshold" dataKey="Threshold" stroke={C.red} fill="none" strokeDasharray="5 4" strokeWidth={1.5} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
            </ChartCard>

            <div>
                <Eyebrow>Per-Category Status</Eyebrow>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {basicOverview.map((b, i) => {
                        const pct = b.percentile === "N/A" ? null : parseInt(b.percentile) || 0;
                        const tone = classifyPercentile(pct, csaThresholds);
                        const t = TONE[tone];
                        return (
                            <div
                                key={i}
                                style={{
                                    border: `1px solid ${C.line}`,
                                    borderLeft: `4px solid ${t.fg}`,
                                    borderRadius: 8,
                                    padding: "10px 12px",
                                    background: "#fff",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                    <div style={{ fontSize: 11.5, fontWeight: 800, color: C.ink }}>{b.category}</div>
                                    <ClassBadge tone={tone} />
                                </div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                                    <div style={{ fontSize: 22, fontWeight: 900, color: t.fg, fontFamily: MONO, lineHeight: 1 }}>
                                        {pct === null ? "—" : `${pct}%`}
                                    </div>
                                    <div style={{ fontSize: 10, color: C.muted }}>
                                        Measure <b style={{ color: C.ink, fontFamily: MONO }}>{b.measure}</b>
                                    </div>
                                </div>
                                <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4, lineHeight: 1.45 }}>{b.details}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── BASIC Detail Table ────────────────────────────────────────────────

function BasicDetailPage({
    basicOverview, csaThresholds,
}: {
    basicOverview: BasicItem[];
    csaThresholds: { warning: number; critical: number };
}) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={3}
                eyebrow="Section Three"
                title="BASIC Category Detail"
                lede={
                    `Per-category measure, percentile, classification, and supporting context. ` +
                    `Categories with Critical status exceed the ${csaThresholds.critical}% intervention threshold ` +
                    `and may trigger FMCSA prioritisation.`
                }
            />

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
                <thead>
                    <tr>
                        <th style={th}>BASIC Category</th>
                        <th style={{ ...th, textAlign: "center" }}>Measure</th>
                        <th style={th}>Percentile</th>
                        <th style={{ ...th, textAlign: "center" }}>Status</th>
                        <th style={th}>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {basicOverview.map((b, i) => {
                        const pct = b.percentile === "N/A" ? null : parseInt(b.percentile) || 0;
                        const tone = classifyPercentile(pct, csaThresholds);
                        const t = TONE[tone];
                        return (
                            <tr key={i} style={{ borderTop: `1px solid ${C.line}`, background: i % 2 ? "#fff" : "#fcfdfe" }}>
                                <td style={{ ...td, fontWeight: 700, color: C.ink }}>{b.category}</td>
                                <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{b.measure}</td>
                                <td style={td}>
                                    {pct !== null ? (
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, background: C.softer, borderRadius: 3, overflow: "hidden", minWidth: 70 }}>
                                                <div style={{ height: "100%", width: `${pct}%`, background: t.fg }} />
                                            </div>
                                            <span style={{ fontWeight: 800, color: C.ink, width: 38, textAlign: "right", fontFamily: MONO }}>{pct}%</span>
                                        </div>
                                    ) : (
                                        <span style={{ color: C.soft }}>N/A</span>
                                    )}
                                </td>
                                <td style={{ ...td, textAlign: "center" }}>
                                    <ClassBadge tone={tone} />
                                </td>
                                <td style={{ ...td, color: C.muted, fontSize: 9.5 }}>{b.details}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Legend / interpretation */}
            <div
                style={{
                    background: C.softBg,
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                }}
            >
                <Eyebrow>How to Read This Table</Eyebrow>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, fontSize: 9.5, color: C.body, lineHeight: 1.4 }}>
                    {(["excellent", "good", "moderate", "concern", "critical"] as ClassTone[]).map(tn => {
                        const t = TONE[tn];
                        return (
                            <div key={tn} style={{ borderLeft: `3px solid ${t.fg}`, paddingLeft: 8 }}>
                                <div style={{ fontWeight: 800, color: t.fg, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>{t.label}</div>
                                <div style={{ marginTop: 2 }}>{t.advice}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Inspection Trends ─────────────────────────────────────────────────

function InspectionTrendsPage({
    inspections, oosCount, cleanCount, totalInspections, csaThresholds,
}: {
    inspections: Inspection[];
    oosCount: number;
    cleanCount: number;
    totalInspections: number;
    csaThresholds: { warning: number; critical: number };
}) {
    const monthly = useMemo(() => {
        const buckets = new Map<string, { month: string; inspections: number; oos: number; clean: number }>();
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
            buckets.set(key, { month: label, inspections: 0, oos: 0, clean: 0 });
        }
        inspections.forEach((insp) => {
            const d = new Date(insp.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const b = buckets.get(key);
            if (!b) return;
            b.inspections++;
            if (insp.hasOOS) b.oos++;
            if (insp.isClean) b.clean++;
        });
        return Array.from(buckets.values());
    }, [inspections]);

    const byState = useMemo(() => {
        const map = new Map<string, number>();
        inspections.forEach(i => {
            const s = i.state || i.location?.province || "—";
            map.set(s, (map.get(s) || 0) + 1);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [inspections]);

    const byLevel = useMemo(() => {
        const map = new Map<string, number>();
        inspections.forEach(i => {
            const l = i.level || "—";
            map.set(l, (map.get(l) || 0) + 1);
        });
        return Array.from(map.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [inspections]);

    const peakMonth = monthly.reduce((a, b) => (b.inspections > a.inspections ? b : a), monthly[0]);
    const cleanPct = totalInspections ? Math.round((cleanCount / totalInspections) * 100) : 0;
    const oosPct   = totalInspections ? Math.round((oosCount / totalInspections) * 100) : 0;

    void csaThresholds;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={4}
                eyebrow="Section Four"
                title="Inspection Trends"
                lede={
                    `Trend of roadside inspections over the trailing twelve months alongside the ` +
                    `geographic and inspection-level mix. Peak month: ${peakMonth?.month || "—"} with ` +
                    `${peakMonth?.inspections || 0} inspection${peakMonth?.inspections === 1 ? "" : "s"}.`
                }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <Stat label="Total" value={totalInspections} tone="indigo" />
                <Stat label="Clean" value={cleanCount} sub={`${cleanPct}%`} tone={cleanPct >= 75 ? "excellent" : cleanPct >= 60 ? "good" : "moderate"} />
                <Stat label="OOS" value={oosCount} sub={`${oosPct}%`} tone={oosPct > 25 ? "critical" : oosPct > 10 ? "moderate" : "good"} />
                <Stat label="States Covered" value={byState.length} tone="slate" />
            </div>

            <ChartCard title="12-Month Inspection Trend">
                <LineChart
                    width={CHART_W} height={200}
                    data={monthly} margin={{ top: 6, right: 12, bottom: 24, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                    <XAxis dataKey="month" tick={{ fontSize: 9.5, fill: C.muted, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 9.5, fill: C.soft }} width={26} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="inspections" name="Inspections" stroke={C.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="oos"         name="OOS"         stroke={C.red}    strokeWidth={2}   dot={{ r: 2.5 }} />
                    <Line type="monotone" dataKey="clean"       name="Clean"       stroke={C.green}  strokeWidth={2}   strokeDasharray="4 3" dot={{ r: 2.5 }} />
                </LineChart>
            </ChartCard>

            <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 12 }}>
                <ChartCard title="Inspections by State (Top 8)">
                    <BarChart
                        width={(CHART_W - 12) * 0.58} height={180}
                        data={byState} margin={{ top: 4, right: 4, bottom: 22, left: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fill: C.muted, fontWeight: 700 }} />
                        <YAxis tick={{ fontSize: 9, fill: C.soft }} width={22} />
                        <Tooltip />
                        <Bar dataKey="value" name="Count" fill={C.indigo} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ChartCard>
                <ChartCard title="Inspection Level Mix">
                    <PieChart width={(CHART_W - 12) * 0.4} height={180}>
                        <Pie
                            data={byLevel}
                            dataKey="value" nameKey="name"
                            cx="50%" cy="50%"
                            outerRadius={62} innerRadius={32}
                            label={(e: any) => `${e.name}: ${e.value}`}
                            labelLine={false}
                            fontSize={9}
                        >
                            {byLevel.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                    </PieChart>
                </ChartCard>
            </div>
        </div>
    );
}

// ── Violations ────────────────────────────────────────────────────────

function ViolationsPage({ inspections }: { inspections: Inspection[] }) {
    const byCategory = useMemo(() => {
        const map = new Map<string, { count: number; oos: number; severity: number }>();
        inspections.forEach(i => {
            (i.violations || []).forEach(v => {
                const k = v.category || "Uncategorised";
                const cur = map.get(k) || { count: 0, oos: 0, severity: 0 };
                cur.count += 1;
                if (v.oos) cur.oos += 1;
                cur.severity += v.severity || 0;
                map.set(k, cur);
            });
        });
        return Array.from(map.entries())
            .map(([name, agg]) => ({ name, value: agg.count, oos: agg.oos, severity: agg.severity }))
            .sort((a, b) => b.value - a.value);
    }, [inspections]);

    const topCodes = useMemo(() => {
        const map = new Map<string, { code: string; description: string; count: number; oos: number; severitySum: number }>();
        inspections.forEach(i => {
            (i.violations || []).forEach(v => {
                if (!v.code) return;
                const cur = map.get(v.code) || { code: v.code, description: v.description || "—", count: 0, oos: 0, severitySum: 0 };
                cur.count += 1;
                if (v.oos) cur.oos += 1;
                cur.severitySum += v.severity || 0;
                map.set(v.code, cur);
            });
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
    }, [inspections]);

    const totalViolations = byCategory.reduce((s, c) => s + c.value, 0);
    const totalOos = byCategory.reduce((s, c) => s + c.oos, 0);
    const oosShare = totalViolations ? Math.round((totalOos / totalViolations) * 100) : 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={5}
                eyebrow="Section Five"
                title="Violation Profile"
                lede={
                    `Distribution of cited violations over the review period. Out-of-service (OOS) counts ` +
                    `measure violations severe enough to take a vehicle or driver off the road until ` +
                    `corrected — these are the highest-priority items to remediate.`
                }
            />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <Stat label="Total Violations" value={totalViolations} tone="slate" />
                <Stat
                    label="Out-of-Service"
                    value={totalOos}
                    sub={`${oosShare}% of cites`}
                    tone={oosShare > 30 ? "critical" : oosShare > 15 ? "concern" : oosShare > 5 ? "moderate" : "good"}
                />
                <Stat label="Categories Cited" value={byCategory.length} tone="indigo" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 12 }}>
                <ChartCard title="Distribution">
                    <PieChart width={280} height={240}>
                        <Pie
                            data={byCategory}
                            dataKey="value" nameKey="name"
                            cx="50%" cy="50%"
                            innerRadius={48} outerRadius={86} paddingAngle={2}
                            label={(e: any) => `${e.value}`}
                            labelLine={false} fontSize={10}
                        >
                            {byCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                    </PieChart>
                </ChartCard>
                <div>
                    <Eyebrow>By Category</Eyebrow>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
                        <thead>
                            <tr>
                                <th style={th}>Category</th>
                                <th style={{ ...th, textAlign: "center" }}>Cites</th>
                                <th style={{ ...th, textAlign: "center" }}>OOS</th>
                                <th style={{ ...th, textAlign: "center" }}>Sev.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {byCategory.slice(0, 8).map((c, i) => (
                                <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                    <td style={{ ...td, fontWeight: 700 }}>
                                        <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, marginRight: 6, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                                        {c.name}
                                    </td>
                                    <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{c.value}</td>
                                    <td style={{ ...td, textAlign: "center", color: c.oos > 0 ? C.red : C.muted, fontWeight: c.oos > 0 ? 800 : 500, fontFamily: MONO }}>{c.oos}</td>
                                    <td style={{ ...td, textAlign: "center", color: C.muted, fontFamily: MONO }}>{c.severity}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div>
                <Eyebrow>Top 10 Violation Codes</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
                    <thead>
                        <tr>
                            <th style={th}>Code</th>
                            <th style={th}>Description</th>
                            <th style={{ ...th, textAlign: "center" }}>Cites</th>
                            <th style={{ ...th, textAlign: "center" }}>OOS</th>
                            <th style={{ ...th, textAlign: "center" }}>Avg Sev.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topCodes.length === 0 ? (
                            <tr><td style={td} colSpan={5}><i style={{ color: C.soft }}>No violation codes recorded.</i></td></tr>
                        ) : topCodes.map((v, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                <td style={{ ...td, fontFamily: MONO, fontWeight: 700, color: C.accent }}>{v.code}</td>
                                <td style={{ ...td, color: C.body }}>{v.description}</td>
                                <td style={{ ...td, textAlign: "center", fontWeight: 700, fontFamily: MONO }}>{v.count}</td>
                                <td style={{ ...td, textAlign: "center", color: v.oos > 0 ? C.red : C.muted, fontWeight: v.oos > 0 ? 800 : 500, fontFamily: MONO }}>{v.oos}</td>
                                <td style={{ ...td, textAlign: "center", color: C.muted, fontFamily: MONO }}>{(v.severitySum / v.count).toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ── OOS & Licensing ───────────────────────────────────────────────────

function OosLicensingPage({ carrierProfile }: { carrierProfile: CarrierProfile }) {
    const oos = carrierProfile.oosRates || {};
    const lic = carrierProfile.licensing || {};
    const v = parseFloat(oos.vehicle?.carrier || "0") || 0;
    const vN = parseFloat(oos.vehicle?.national || "0") || 0;
    const d = parseFloat(oos.driver?.carrier  || "0") || 0;
    const dN = parseFloat(oos.driver?.national  || "0") || 0;
    const h = oos.hazmat?.carrier === "N/A" ? null : (parseFloat(oos.hazmat?.carrier || "0") || 0);
    const hN = parseFloat(oos.hazmat?.national || "0") || 0;
    const oosBars = [
        { name: "Vehicle OOS", carrier: v, national: vN },
        { name: "Driver OOS",  carrier: d, national: dN },
        { name: "Hazmat OOS",  carrier: h ?? 0, national: hN },
    ];
    const vTone = classifyOos(v, vN);
    const dTone = classifyOos(d, dN);
    const hTone = h === null ? null : classifyOos(h, hN);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={6}
                eyebrow="Section Six"
                title="Out-of-Service Performance"
                lede={
                    `Comparison of this carrier's out-of-service rates against national averages, plus ` +
                    `operating-authority licensing on file with FMCSA.`
                }
            />

            <ChartCard title="OOS Rate vs National">
                <BarChart
                    width={CHART_W} height={200}
                    data={oosBars} margin={{ top: 6, right: 12, bottom: 12, left: 0 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                    <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: C.muted, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9.5, fill: C.soft }} width={28} unit="%" />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="carrier"  name="Carrier"  fill={C.accent} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="national" name="National" fill={C.soft}   radius={[3, 3, 0, 0]} />
                </BarChart>
            </ChartCard>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <Stat label="Vehicle OOS" value={oos.vehicle?.carrier || "—"} sub={`Nat'l ${oos.vehicle?.national || "—"}`} tone={vTone} />
                <Stat label="Driver OOS"  value={oos.driver?.carrier  || "—"} sub={`Nat'l ${oos.driver?.national  || "—"}`} tone={dTone} />
                <Stat
                    label="Hazmat OOS"
                    value={oos.hazmat?.carrier || "N/A"}
                    sub={`Nat'l ${oos.hazmat?.national || "—"}`}
                    tone={hTone || "slate"}
                />
            </div>

            <div>
                <Eyebrow>Operating Authority on File</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
                    <thead>
                        <tr>
                            <th style={th}>Authority Type</th>
                            <th style={{ ...th, textAlign: "center" }}>Active</th>
                            <th style={th}>MC / Docket</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(["property", "passenger", "household", "broker"] as const).map((k, i) => {
                            const row = (lic as any)[k] || {};
                            return (
                                <tr key={k} style={{ borderTop: `1px solid ${C.line}`, background: i % 2 ? "#fff" : "#fcfdfe" }}>
                                    <td style={{ ...td, fontWeight: 700, textTransform: "capitalize" }}>{k}</td>
                                    <td style={{ ...td, textAlign: "center" }}>
                                        {row.active === "Yes"
                                            ? <ClassBadge tone="good" />
                                            : <span style={{ color: C.soft, fontSize: 10 }}>—</span>}
                                    </td>
                                    <td style={{ ...td, fontFamily: MONO }}>{row.mc || "—"}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Interpretation panel */}
            <div
                style={{
                    background: C.softBg,
                    border: `1px solid ${C.line}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                    fontSize: 10.5,
                    color: C.body,
                    lineHeight: 1.55,
                }}
            >
                <Eyebrow>Interpretation</Eyebrow>
                Vehicle OOS is <b style={{ color: TONE[vTone].fg }}>{TONE[vTone].label.toLowerCase()}</b> ({v.toFixed(1)}%
                vs national {vN.toFixed(1)}%). Driver OOS is{" "}
                <b style={{ color: TONE[dTone].fg }}>{TONE[dTone].label.toLowerCase()}</b> ({d.toFixed(1)}%
                vs national {dN.toFixed(1)}%). {h === null
                    ? "The carrier does not appear to engage in hazmat transport, so hazmat OOS is not applicable."
                    : `Hazmat OOS is ${TONE[hTone!].label.toLowerCase()} (${h.toFixed(1)}% vs national ${hN.toFixed(1)}%).`}
            </div>
        </div>
    );
}

// ── Recommendations ───────────────────────────────────────────────────

function RecommendationsPage({
    basicOverview, csaThresholds, oosCount, totalInspections, alertedCategories,
}: {
    basicOverview: BasicItem[];
    csaThresholds: { warning: number; critical: number };
    oosCount: number;
    totalInspections: number;
    alertedCategories: BasicItem[];
}) {
    const recs: Array<{ priority: "High" | "Medium" | "Low"; title: string; body: string }> = [];

    const playbooks: Record<string, string> = {
        "Vehicle Maintenance":
            "Re-baseline preventive-maintenance intervals, audit the last 90 days of brake and lighting work orders, and add a documented pre-trip inspection sign-off.",
        "Unsafe Driving":
            "Pull telematics for hard-brake and speeding events on the top-cited drivers, schedule remedial coaching, and review dispatch routing through high-violation corridors.",
        "Hours-of-service Compliance":
            "Audit ELD edits over the last 60 days, cross-check supporting documents, and retrain dispatchers on 14-hour and 70-hour limit planning.",
        "Driver Fitness":
            "Verify medical-card and CDL expiry tracking, confirm DQ files are current for all flagged drivers, and pull MVRs.",
        "Controlled Substances":
            "Review random-pool selection rates, confirm pre-employment and reasonable-suspicion testing protocols, and audit chain-of-custody records.",
        "Hazmat compliance":
            "Audit shipping papers, placarding, and emergency-response info for hazmat-cited inspections; reconfirm HM employee training currency.",
        "Crash Indicator":
            "Conduct after-action review on each crash, identify common contributing factors, and integrate findings into driver coaching.",
    };

    alertedCategories.slice(0, 3).forEach(a => {
        recs.push({
            priority: "High",
            title: `Remediate ${a.category} (${a.percentile})`,
            body: playbooks[a.category] || "Investigate root causes for cited violations in this category and design a 60-day corrective action plan.",
        });
    });

    const watchCats = basicOverview.filter(b =>
        !b.alert && b.percentile !== "N/A" && parseInt(b.percentile) >= csaThresholds.warning
    );
    if (watchCats.length > 0) {
        recs.push({
            priority: "Medium",
            title: `Pre-empt ${watchCats.length} ‘watch’ categor${watchCats.length === 1 ? "y" : "ies"}`,
            body:
                `These sit between warning (${csaThresholds.warning}%) and intervention (${csaThresholds.critical}%): ` +
                `${watchCats.map(w => w.category).join(", ")}. ` +
                `Set a 90-day target to drive each below ${csaThresholds.warning}% before they trigger an alert.`,
        });
    }

    const oosPct = totalInspections ? oosCount / totalInspections : 0;
    if (oosPct > 0.25) {
        recs.push({
            priority: "High",
            title: "Reduce out-of-service rate",
            body:
                `Current OOS rate is ${Math.round(oosPct * 100)}% of inspections. Drive a 90-day target ` +
                `below the national vehicle-OOS norm (~22%) by hardening pre-trip processes and ` +
                `accelerating brake-system PM intervals on the highest-cited equipment.`,
        });
    }

    if (recs.length === 0) {
        recs.push({
            priority: "Low",
            title: "Maintain monitoring cadence",
            body:
                "No BASIC categories currently exceed the alert threshold and OOS performance is " +
                "within national norms. Maintain monthly review cadence and act on emerging trends early.",
        });
    }

    recs.push(
        {
            priority: "Medium",
            title: "Driver-of-the-month coaching reinforcement",
            body:
                "Surface positive trends — recognise drivers whose inspections came back clean and use these as anchor examples in monthly safety meetings.",
        },
        {
            priority: "Low",
            title: "Quarterly internal mock-DOT audit",
            body:
                "Schedule a dry-run of an FMCSA compliance review each quarter — driver qualification files, drug & alcohol pool, vehicle records, and HOS supporting documents.",
        },
    );

    const ptone = (p: "High" | "Medium" | "Low") =>
        p === "High" ? TONE.critical : p === "Medium" ? TONE.moderate : TONE.good;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={7}
                eyebrow="Section Seven"
                title="Recommendations"
                lede={
                    `A prioritised, data-driven action list. Items are derived directly from this carrier's ` +
                    `BASIC standings, OOS history, and inspection mix.`
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
                            <div style={{ fontSize: 10.5, color: C.body, lineHeight: 1.55 }}>
                                {rec.body}
                            </div>
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
                and FMCSA-derived metrics for management use. It is not a substitute for the official
                FMCSA Safety Measurement System data on the SAFER website. Figures may differ slightly
                from public SMS publications based on data refresh timing.
            </div>
        </div>
    );
}

// ── Public component ──────────────────────────────────────────────────

export function FmcsaPdfReport({
    carrierProfile, basicOverview, csaThresholds, inspections,
    reportDate = new Date(),
}: FmcsaPdfReportProps) {
    const totalInspections = inspections.length;
    const oosCount = inspections.filter(i => i.hasOOS).length;
    const cleanCount = inspections.filter(i => i.isClean).length;
    const avgSeverity = inspections.length
        ? inspections.reduce((s, i) => s + (i.severityRate || 0), 0) / inspections.length
        : 0;
    const alertedCategories = basicOverview.filter(b => b.alert);

    const totalViolations = inspections.reduce((s, i) => s + (i.violations?.length || 0), 0);

    // Per-section classification
    const basicTones = basicOverview.map(b =>
        classifyPercentile(b.percentile === "N/A" ? null : parseInt(b.percentile) || 0, csaThresholds)
    );
    const basicProfileTone = rollUp(basicTones);

    const cleanPct = totalInspections ? cleanCount / totalInspections : 0;
    const oosPct   = totalInspections ? oosCount / totalInspections : 0;
    const inspectionTrendsTone: ClassTone =
        totalInspections === 0 ? "good"
        : oosPct > 0.25 ? "critical"
        : oosPct > 0.15 ? "concern"
        : cleanPct < 0.4 ? "moderate"
        : cleanPct >= 0.7 ? "excellent"
        : "good";

    const oosVehicleTone = classifyOos(
        parseFloat(carrierProfile.oosRates?.vehicle?.carrier  || "0") || 0,
        parseFloat(carrierProfile.oosRates?.vehicle?.national || "0") || 0,
    );
    const oosDriverTone = classifyOos(
        parseFloat(carrierProfile.oosRates?.driver?.carrier  || "0") || 0,
        parseFloat(carrierProfile.oosRates?.driver?.national || "0") || 0,
    );
    const oosTone = rollUp([oosVehicleTone, oosDriverTone]);

    const violationsTone: ClassTone = (() => {
        if (totalViolations === 0) return "excellent";
        const totalOos = inspections.reduce((s, i) =>
            s + ((i.violations || []).filter(v => v.oos).length), 0);
        const oosShare = totalViolations ? totalOos / totalViolations : 0;
        if (oosShare > 0.3)  return "critical";
        if (oosShare > 0.15) return "concern";
        if (oosShare > 0.05) return "moderate";
        return "good";
    })();

    const overall = rollUp([basicProfileTone, oosTone, inspectionTrendsTone]);

    // Build sections — drop pages that have no data.
    const sections: Section[] = [];
    sections.push({ id: "cover", title: "Cover", label: "Cover", page: 0, chromeless: true });
    sections.push({ id: "toc", title: "Table of Contents", label: "Index", page: 0 });
    sections.push({
        id: "executive",
        title: "Executive Summary",
        label: "Executive Summary",
        summary: "Overall posture, headline KPIs, and a data-driven narrative.",
        tone: overall,
        page: 0,
    });
    sections.push({
        id: "basic-profile",
        title: "BASIC Performance Profile",
        label: "BASIC Profile",
        summary: "Radar of the seven SMS BASIC percentiles plus per-category status cards.",
        tone: basicProfileTone,
        page: 0,
    });
    sections.push({
        id: "basic-detail",
        title: "BASIC Category Detail",
        label: "BASIC Detail",
        summary: "Per-category measure, percentile, and FMCSA classification.",
        tone: basicProfileTone,
        page: 0,
    });
    if (totalInspections > 0) {
        sections.push({
            id: "inspection-trends",
            title: "Inspection Trends",
            label: "Inspection Trends",
            summary: "12-month roadside inspection trend, geographic mix, and level breakdown.",
            tone: inspectionTrendsTone,
            page: 0,
        });
    }
    if (totalViolations > 0) {
        sections.push({
            id: "violations",
            title: "Violation Profile",
            label: "Violations",
            summary: "Distribution of cited violations and the most common codes.",
            tone: violationsTone,
            page: 0,
        });
    }
    sections.push({
        id: "oos-licensing",
        title: "Out-of-Service Performance",
        label: "OOS & Licensing",
        summary: "Carrier-vs-national OOS rates and authorities on file.",
        tone: oosTone,
        page: 0,
    });
    sections.push({
        id: "recommendations",
        title: "Recommendations",
        label: "Recommendations",
        summary: "A prioritised action list derived from this carrier's data.",
        page: 0,
    });

    sections.forEach((s, i) => { s.page = i + 1; });
    const totalPages = sections.length;

    const carrierName = carrierProfile.name || "Unknown Carrier";
    const dotNumber = carrierProfile.id ?? "—";

    const renderSection = (s: Section) => {
        switch (s.id) {
            case "cover":
                return (
                    <CoverPage
                        carrierProfile={carrierProfile}
                        reportDate={reportDate}
                        totalInspections={totalInspections}
                        alertCount={alertedCategories.length}
                        overall={overall}
                    />
                );
            case "toc":
                return <TocPage sections={sections} />;
            case "executive":
                return (
                    <ExecutiveSummaryPage
                        carrierProfile={carrierProfile}
                        basicOverview={basicOverview}
                        csaThresholds={csaThresholds}
                        totalInspections={totalInspections}
                        oosCount={oosCount}
                        cleanCount={cleanCount}
                        avgSeverity={avgSeverity}
                        alertedCategories={alertedCategories}
                        overall={overall}
                    />
                );
            case "basic-profile":
                return <BasicProfilePage basicOverview={basicOverview} csaThresholds={csaThresholds} />;
            case "basic-detail":
                return <BasicDetailPage basicOverview={basicOverview} csaThresholds={csaThresholds} />;
            case "inspection-trends":
                return (
                    <InspectionTrendsPage
                        inspections={inspections}
                        oosCount={oosCount} cleanCount={cleanCount}
                        totalInspections={totalInspections}
                        csaThresholds={csaThresholds}
                    />
                );
            case "violations":
                return <ViolationsPage inspections={inspections} />;
            case "oos-licensing":
                return <OosLicensingPage carrierProfile={carrierProfile} />;
            case "recommendations":
                return (
                    <RecommendationsPage
                        basicOverview={basicOverview}
                        csaThresholds={csaThresholds}
                        oosCount={oosCount}
                        totalInspections={totalInspections}
                        alertedCategories={alertedCategories}
                    />
                );
        }
    };

    return (
        <div style={{ background: "#fff" }}>
            {sections.map(s =>
                s.chromeless ? (
                    // Cover renders its own full-bleed A4 — wrap with the
                    // pdf-page marker so the capture loop picks it up.
                    <div key={s.id} className="pdf-page" style={{ width: A4_W, height: A4_H }}>
                        {renderSection(s)}
                    </div>
                ) : (
                    // <Page> sets `className="pdf-page"` itself.
                    <Page
                        key={s.id}
                        pageNumber={s.page}
                        totalPages={totalPages}
                        sectionLabel={s.label}
                        carrierName={carrierName}
                        dotNumber={dotNumber}
                    >
                        {renderSection(s)}
                    </Page>
                )
            )}
        </div>
    );
}
