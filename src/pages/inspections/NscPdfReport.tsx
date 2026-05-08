// Multi-page A4 NSC (Canadian National Safety Code) report — one component
// covering Alberta, British Columbia, Prince Edward Island, and Nova
// Scotia. Each jurisdiction's score model is different, but the document
// structure (cover → TOC → executive summary → score breakdown → detail
// → recommendations) is shared so the four reports look like a coherent
// family. Visual building blocks come from FmcsaPdfReport.

import { useMemo } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    Cell, LabelList,
} from "recharts";
import {
    A4_W, A4_H, PAGE_PAD_X, CHART_W,
    C, FONT, SERIF, MONO,
    TONE, type ClassTone,
    Body, Eyebrow, SectionHead, Stat, ClassBadge, ChartCard, KpiBlock,
    th, td,
} from "./FmcsaPdfReport";

// ── Types — each jurisdiction has a different score model ─────────────

export type NscJurisdiction = "AB" | "BC" | "PE" | "NS";

type AbProfile = {
    carrierName: string;
    profileDate?: string;
    rFactor: number;
    monitoringStage: string;
    fleetRange?: string;
    fleetType?: string;
    stageThresholds?: Array<{ stage: number; low: number; high: number | null }>;
    statusMessage?: string;
    contributions: {
        convictions:          { pct: number; events: number };
        adminPenalties:       { pct: number; events: number };
        cvsaInspections:      { pct: number; events: number };
        reportableCollisions: { pct: number; events: number };
    };
    carrierInfo?: {
        nscNumber?: string;
        mvidNumber?: string;
        operatingStatus?: string;
        certNumber?: string;
        certEffective?: string;
        certExpiry?: string;
        safetyRating?: string;
        monitoringAsOf?: string;
        monitoringRFactor?: number;
        monitoringStage?: string;
        totalCarriersAB?: number;
        fleetAvg?: number;
        fleetCurrent?: number;
        convictionDocs?: number;
        convictionCount?: number;
        convictionPoints?: number;
    };
};

type BcProfile = {
    demographics: {
        carrierName: string;
        jurisdiction: string;
        primaryBusinessType?: string;
        certificateIssueDate?: string;
        extraProvincial?: boolean;
        mailingAddress?: string;
        premiumCarrier?: boolean;
        weigh2GoBC?: boolean;
        preventativeMaintenance?: boolean;
        numberOfLicensedVehicles?: number;
        nscNumber?: string;
        reportRunDate?: string;
        profileFrom?: string;
        profileTo?: string;
    };
    certificate: {
        certificateStatus?: string;
        safetyRating?: string;
        profileStatus?: string;
        auditStatus?: string;
    };
    complianceReview: {
        asOfDate?: string;
        averageFleetSize?: number;
        scores: Array<{ category: string; score: number; events: number }>;
        totalScore: number;
    };
    thresholds: Array<{ status: string; contraventions: string; cvsa: string; accidents: string; total: string }>;
    interventions: Array<{ type: string; date: string; description: string }>;
};

type PeProfile = {
    jurisdiction: string;
    profileAsOf?: string;
    nscNumber?: string;
    safetyRating?: string;
    summary: {
        collisionPoints:  number;
        convictionPoints: number;
        inspectionPoints: number;
        currentActiveVehiclesAtLastAssessment?: number;
        currentActiveVehicles?: number;
    };
};

type NsProfile = {
    carrierName: string;
    nscNumber: string;
    profileAsOf: string;
    safetyRating: string;
    safetyRatingExpires: string;
    contactName?: string;
    contactTitle?: string;
    phone?: string;
    mailingAddress?: string;
    physicalAddress?: string;
    principalPlace?: string;
    currentFleetSize: number;
    avgDailyFleetSize: number;
    scoreLevel1: number;
    scoreLevel2: number;
    scoreLevel3: number;
    convictionScore: number;
    inspectionScore: number;
    collisionScore: number;
};

type CarrierBasics = {
    id?: string | number;          // USDOT
    name?: string;
    address?: string;
    vehicles?: number;
    drivers?: number;
};

export interface NscPdfReportProps {
    jurisdiction: NscJurisdiction;
    carrierProfile: CarrierBasics;
    abProfile?: AbProfile;
    bcProfile?: BcProfile;
    peProfile?: PeProfile;
    nsProfile?: NsProfile;
    reportDate?: Date;
}

// ── Jurisdiction metadata ─────────────────────────────────────────────

const JURISDICTION_META: Record<NscJurisdiction, {
    fullName: string;
    legalName: string;
    agencyLine: string;
    brand: string; // single capital initial for the cover badge
}> = {
    AB: {
        fullName: "Alberta",
        legalName: "Province of Alberta",
        agencyLine: "Alberta Transportation · National Safety Code",
        brand: "A",
    },
    BC: {
        fullName: "British Columbia",
        legalName: "Province of British Columbia",
        agencyLine: "BC Ministry of Transportation · NSC Carrier Profile",
        brand: "B",
    },
    PE: {
        fullName: "Prince Edward Island",
        legalName: "Province of Prince Edward Island",
        agencyLine: "PEI Highway Safety · NSC Profile",
        brand: "P",
    },
    NS: {
        fullName: "Nova Scotia",
        legalName: "Province of Nova Scotia",
        agencyLine: "Nova Scotia Public Works · NSC Profile",
        brand: "N",
    },
};

// ── Per-jurisdiction normalisation ───────────────────────────────────

type NormalisedSnapshot = {
    nscNumber: string;
    safetyRating: string;
    headlineLabel: string;        // e.g. "R-Factor", "Total Score", "Total Points"
    headlineValue: string;        // e.g. "0.84", "2.31", "23 pts"
    headlineNumeric: number;      // for chart use
    statusLabel: string;          // e.g. "Stage 2", "Conditional", "Satisfactory"
    statusTone: ClassTone;
    fleetSize: number | undefined;
    profileAsOf: string;
    scoreBreakdown: Array<{ name: string; value: number; events?: number; color: string; note: string }>;
    /** Free-form rows used to build a "Reference / Detail" table. */
    detailRows: Array<{ k: string; v: string; mono?: boolean }>;
};

function normalise(props: NscPdfReportProps): NormalisedSnapshot {
    switch (props.jurisdiction) {
        case "AB": {
            const p = props.abProfile!;
            const c = p.contributions;
            const stageNum = parseInt((p.monitoringStage.match(/\d+/) || ["0"])[0]) || 0;
            const tone: ClassTone =
                p.monitoringStage === "Not Monitored" ? "good"
                : stageNum >= 4 ? "critical"
                : stageNum === 3 ? "concern"
                : stageNum === 2 ? "moderate"
                : "good";
            return {
                nscNumber: p.carrierInfo?.nscNumber || "—",
                safetyRating: p.carrierInfo?.safetyRating || "—",
                headlineLabel: "R-Factor",
                headlineValue: p.rFactor.toFixed(3),
                headlineNumeric: p.rFactor,
                statusLabel: p.monitoringStage,
                statusTone: tone,
                fleetSize: p.carrierInfo?.fleetCurrent ?? props.carrierProfile.vehicles,
                profileAsOf: p.profileDate || "—",
                scoreBreakdown: [
                    { name: "Convictions",          value: c.convictions.pct,          events: c.convictions.events,          color: C.red,    note: "Driver / vehicle / load convictions registered to the carrier." },
                    { name: "Admin Penalties",      value: c.adminPenalties.pct,       events: c.adminPenalties.events,       color: C.orange, note: "Administrative monetary penalties issued by the regulator." },
                    { name: "CVSA Inspections",     value: c.cvsaInspections.pct,      events: c.cvsaInspections.events,      color: C.indigo, note: "Out-of-service-weighted CVSA inspection points." },
                    { name: "Reportable Collisions",value: c.reportableCollisions.pct, events: c.reportableCollisions.events, color: C.amber,  note: "Reportable on-road collisions in the review window." },
                ],
                detailRows: [
                    { k: "NSC Number",         v: p.carrierInfo?.nscNumber || "—", mono: true },
                    { k: "MVID Number",        v: p.carrierInfo?.mvidNumber || "—", mono: true },
                    { k: "Operating Status",   v: p.carrierInfo?.operatingStatus || "—" },
                    { k: "Certificate #",      v: p.carrierInfo?.certNumber || "—", mono: true },
                    { k: "Certificate Effective", v: p.carrierInfo?.certEffective || "—" },
                    { k: "Certificate Expiry",    v: p.carrierInfo?.certExpiry || "—" },
                    { k: "Monitoring As Of",   v: p.carrierInfo?.monitoringAsOf || "—" },
                    { k: "Monitoring R-Factor",v: (p.carrierInfo?.monitoringRFactor ?? p.rFactor).toFixed(3), mono: true },
                    { k: "Monitoring Stage",   v: p.monitoringStage },
                    { k: "Fleet (current)",    v: String(p.carrierInfo?.fleetCurrent ?? "—") },
                    { k: "Fleet (avg)",        v: String(p.carrierInfo?.fleetAvg ?? "—") },
                    { k: "Conviction Points",  v: String(p.carrierInfo?.convictionPoints ?? "—") },
                ],
            };
        }
        case "BC": {
            const p = props.bcProfile!;
            const total = p.complianceReview.totalScore;
            const status = p.certificate.profileStatus || "—";
            const tone: ClassTone =
                status === "Unsatisfactory" ? "critical"
                : status === "Conditional"   ? "concern"
                : total >= 1.5  ? "moderate"
                : total >= 1.0  ? "good"
                : "excellent";
            const scores = p.complianceReview.scores;
            const colorByCat: Record<string, string> = {
                "Contraventions": C.red,
                "CVSA (Out of Service)": C.indigo,
                "Accidents": C.orange,
            };
            return {
                nscNumber: p.demographics.nscNumber || "—",
                safetyRating: p.certificate.safetyRating || "—",
                headlineLabel: "Total Score",
                headlineValue: total.toFixed(2),
                headlineNumeric: total,
                statusLabel: status,
                statusTone: tone,
                fleetSize: p.complianceReview.averageFleetSize ?? p.demographics.numberOfLicensedVehicles,
                profileAsOf: p.complianceReview.asOfDate || "—",
                scoreBreakdown: scores.map(s => ({
                    name: s.category,
                    value: s.score,
                    events: s.events,
                    color: colorByCat[s.category] || C.muted,
                    note:
                        s.category === "Contraventions"          ? "Driver / vehicle / load citations." :
                        s.category === "CVSA (Out of Service)"   ? "Out-of-service-weighted CVSA inspections." :
                        s.category === "Accidents"               ? "Reportable accidents in the review window." :
                        "Component score.",
                })),
                detailRows: [
                    { k: "NSC Number",          v: p.demographics.nscNumber || "—", mono: true },
                    { k: "Certificate Status",  v: p.certificate.certificateStatus || "—" },
                    { k: "Audit Status",        v: p.certificate.auditStatus || "—" },
                    { k: "Profile Status",      v: status },
                    { k: "Profile From",        v: p.demographics.profileFrom || "—" },
                    { k: "Profile To",          v: p.demographics.profileTo || "—" },
                    { k: "Average Fleet Size",  v: String(p.complianceReview.averageFleetSize ?? "—") },
                    { k: "Licensed Vehicles",   v: String(p.demographics.numberOfLicensedVehicles ?? "—") },
                    { k: "Business Type",       v: p.demographics.primaryBusinessType || "—" },
                    { k: "Premium Carrier",     v: p.demographics.premiumCarrier ? "Yes" : "No" },
                    { k: "Weigh2GoBC",          v: p.demographics.weigh2GoBC ? "Yes" : "No" },
                    { k: "Preventative Maint.", v: p.demographics.preventativeMaintenance ? "Yes" : "No" },
                ],
            };
        }
        case "PE": {
            const p = props.peProfile!;
            const total = (p.summary.collisionPoints || 0) + (p.summary.convictionPoints || 0) + (p.summary.inspectionPoints || 0);
            const tone: ClassTone =
                total >= 36 ? "critical"
                : total >= 24 ? "concern"
                : total >= 14 ? "moderate"
                : total >= 6  ? "good"
                : "excellent";
            return {
                nscNumber: p.nscNumber || "—",
                safetyRating: p.safetyRating || "—",
                headlineLabel: "Total Points",
                headlineValue: String(total),
                headlineNumeric: total,
                statusLabel: p.safetyRating || "—",
                statusTone: tone,
                fleetSize: p.summary.currentActiveVehicles,
                profileAsOf: p.profileAsOf || "—",
                scoreBreakdown: [
                    { name: "Collision Points",  value: p.summary.collisionPoints,  color: C.red,    note: "Severity-weighted collision points." },
                    { name: "Conviction Points", value: p.summary.convictionPoints, color: C.orange, note: "Driver / vehicle / load conviction points." },
                    { name: "Inspection Points", value: p.summary.inspectionPoints, color: C.indigo, note: "Out-of-service-weighted inspection points." },
                ],
                detailRows: [
                    { k: "NSC Number",        v: p.nscNumber || "—", mono: true },
                    { k: "Jurisdiction",      v: p.jurisdiction || "Prince Edward Island" },
                    { k: "Profile As Of",     v: p.profileAsOf || "—" },
                    { k: "Safety Rating",     v: p.safetyRating || "—" },
                    { k: "Active Vehicles",   v: String(p.summary.currentActiveVehicles ?? "—") },
                    { k: "Vehicles at Last Assessment", v: String(p.summary.currentActiveVehiclesAtLastAssessment ?? "—") },
                ],
            };
        }
        case "NS": {
            const p = props.nsProfile!;
            const cn = p.convictionScore;
            const ins = p.inspectionScore;
            const col = p.collisionScore;
            const total = cn + ins + col;
            const lvl1 = p.scoreLevel1;
            const lvl2 = p.scoreLevel2;
            const lvl3 = p.scoreLevel3;
            const tone: ClassTone =
                total >= lvl3 ? "critical"
                : total >= lvl2 ? "concern"
                : total >= lvl1 ? "moderate"
                : total >= lvl1 * 0.5 ? "good"
                : "excellent";
            return {
                nscNumber: p.nscNumber || "—",
                safetyRating: p.safetyRating || "—",
                headlineLabel: "Total Score",
                headlineValue: total.toFixed(2),
                headlineNumeric: total,
                statusLabel: p.safetyRating || "—",
                statusTone: tone,
                fleetSize: p.currentFleetSize,
                profileAsOf: p.profileAsOf || "—",
                scoreBreakdown: [
                    { name: "Conviction Score", value: cn,  color: C.red,    note: "Driver / vehicle / load convictions, severity-weighted." },
                    { name: "Inspection Score", value: ins, color: C.indigo, note: "CVSA inspection points, weighted by OOS." },
                    { name: "Collision Score",  value: col, color: C.orange, note: "Reportable collision points." },
                ],
                detailRows: [
                    { k: "NSC Number",          v: p.nscNumber || "—", mono: true },
                    { k: "Safety Rating",       v: p.safetyRating || "—" },
                    { k: "Safety Rating Expires", v: p.safetyRatingExpires || "—" },
                    { k: "Profile As Of",       v: p.profileAsOf || "—" },
                    { k: "Fleet (current)",     v: String(p.currentFleetSize ?? "—") },
                    { k: "Fleet (avg/day)",     v: String(p.avgDailyFleetSize ?? "—") },
                    { k: "Contact",             v: p.contactName ? `${p.contactName} (${p.contactTitle || "—"})` : "—" },
                    { k: "Phone",               v: p.phone || "—", mono: true },
                ],
            };
        }
    }
}

// ── Page chrome (NSC branding) ────────────────────────────────────────

function Page({
    pageNumber, totalPages, sectionLabel, carrierName, nscNumber, agencyLine, children,
}: {
    pageNumber: number;
    totalPages: number;
    sectionLabel: string;
    carrierName: string;
    nscNumber: string;
    agencyLine: string;
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
                            {agencyLine}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.ink, marginTop: 1, letterSpacing: -0.1 }}>
                            NSC Carrier Safety Profile
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1.4 }}>
                        Carrier
                    </div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: C.ink, marginTop: 1 }}>
                        {carrierName}
                        <span style={{ color: C.muted, fontWeight: 600, marginLeft: 8, fontFamily: MONO }}>NSC {nscNumber}</span>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>{children}</div>

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

type SectionId = "cover" | "toc" | "executive" | "score-breakdown" | "reference" | "interventions" | "recommendations";

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
    carrierProfile, snapshot, jurisdiction, reportDate,
}: {
    carrierProfile: CarrierBasics;
    snapshot: NormalisedSnapshot;
    jurisdiction: NscJurisdiction;
    reportDate: Date;
}) {
    const meta = JURISDICTION_META[jurisdiction];
    const t = TONE[snapshot.statusTone];
    const docId = `NSC-${jurisdiction}-${snapshot.nscNumber.replace(/[^A-Z0-9]/gi, "")}-${reportDate.getFullYear()}`;
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
                        >{meta.brand}</div>
                        <div>
                            <div
                                style={{
                                    fontSize: 8.5, fontWeight: 800,
                                    color: "rgba(255,255,255,0.7)",
                                    textTransform: "uppercase", letterSpacing: 2,
                                }}
                            >
                                {meta.legalName} · National Safety Code
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2, letterSpacing: 0.4 }}>
                                {meta.fullName} NSC Carrier Profile
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
                        fontSize: 50, fontWeight: 700, color: C.ink,
                        lineHeight: 1.04, letterSpacing: -1.4,
                        marginTop: 14, marginBottom: 18,
                        fontFamily: SERIF,
                    }}
                >
                    {meta.fullName}<br />
                    NSC <span style={{ color: C.accent }}>Safety</span> Profile
                </div>
                <div style={{ fontSize: 13, color: C.body, lineHeight: 1.65, maxWidth: 560 }}>
                    A multi-page assessment of this carrier's National Safety Code performance in
                    {" "}{meta.fullName} — score composition, monitoring status, and threshold position
                    over the most recent assessment window.
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
                        Carrier
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
                            { k: "NSC Number",  v: snapshot.nscNumber, mono: true },
                            { k: "Address",     v: carrierProfile.address || "—" },
                            { k: "Power Units", v: String(snapshot.fleetSize ?? carrierProfile.vehicles ?? "—") },
                            { k: "Profile As Of", v: snapshot.profileAsOf },
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
                            Profile Status
                        </div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: t.fg, marginTop: 4, lineHeight: 1.1, fontFamily: SERIF, letterSpacing: -0.4 }}>
                            {snapshot.statusLabel}
                        </div>
                        <div style={{ fontSize: 10.5, color: C.body, marginTop: 4, lineHeight: 1.55 }}>{t.advice}</div>
                    </div>
                    <div style={{ width: 1, height: 56, background: C.line }} />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, alignItems: "center" }}>
                        <KpiBlock label={snapshot.headlineLabel} value={snapshot.headlineValue} />
                        <KpiBlock label="Safety Rating" value={snapshot.safetyRating} />
                        <KpiBlock label="Fleet" value={String(snapshot.fleetSize ?? "—")} />
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
                        { k: "Report Date",   v: reportDate.toLocaleDateString("en-US", { dateStyle: "long" }) },
                        { k: "Jurisdiction",  v: meta.fullName },
                        { k: "Issuing System", v: "TrackSmart Compliance" },
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
                        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: C.accent, textAlign: "right", letterSpacing: -0.5 }}>
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
                                <div style={{ fontSize: 9.5, color: C.body, marginTop: 5, lineHeight: 1.45 }}>{t.advice}</div>
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
    snapshot, carrierProfile, jurisdiction,
}: {
    snapshot: NormalisedSnapshot;
    carrierProfile: CarrierBasics;
    jurisdiction: NscJurisdiction;
}) {
    const meta = JURISDICTION_META[jurisdiction];
    const t = TONE[snapshot.statusTone];
    const dom = [...snapshot.scoreBreakdown].sort((a, b) => b.value - a.value)[0];

    const narrative = useMemo(() => {
        const parts: string[] = [];
        parts.push(
            `${carrierProfile.name || "The carrier"}'s ${meta.fullName} NSC profile shows a ` +
            `${snapshot.headlineLabel.toLowerCase()} of ${snapshot.headlineValue} — currently classified as ` +
            `${snapshot.statusLabel}.`
        );
        if (dom) {
            parts.push(
                `The largest contributing factor to the score is ${dom.name.toLowerCase()} ` +
                `(${dom.value.toFixed(2)}${dom.events !== undefined ? ` from ${dom.events} event${dom.events === 1 ? "" : "s"}` : ""}).`
            );
        }
        if (snapshot.statusTone === "critical" || snapshot.statusTone === "concern") {
            parts.push(
                `The score warrants corrective focus — engagement with the regulator and an internal ` +
                `audit of the leading contributor are recommended within the next 30 days.`
            );
        } else if (snapshot.statusTone === "moderate") {
            parts.push(
                `The score is approaching threshold; preventative action over the next 60–90 days will ` +
                `keep the carrier off the regulator's monitoring list.`
            );
        } else {
            parts.push(
                `Performance is within healthy peer ranges. Maintain monthly review cadence and act on ` +
                `emerging trends early.`
            );
        }
        return parts.join(" ");
    }, [carrierProfile.name, meta.fullName, snapshot, dom]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SectionHead number={1} eyebrow="Section One" title="Executive Summary" />

            <div
                style={{
                    background: t.bg, border: `1px solid ${t.border}`, borderRadius: 12,
                    padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                }}
            >
                <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Eyebrow color={C.muted}>Profile Status</Eyebrow>
                        <ClassBadge tone={snapshot.statusTone} />
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: t.fg, marginTop: 4, lineHeight: 1.1, fontFamily: SERIF }}>
                        {snapshot.statusLabel}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.body, marginTop: 4 }}>
                        {snapshot.headlineLabel}: <b>{snapshot.headlineValue}</b>. As of {snapshot.profileAsOf}.
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                        {snapshot.headlineLabel}
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 700, color: t.fg, lineHeight: 1, fontFamily: SERIF }}>
                        {snapshot.headlineValue}
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <Stat label={snapshot.headlineLabel} value={snapshot.headlineValue} sub="Carrier score" tone={snapshot.statusTone} />
                <Stat label="Safety Rating" value={snapshot.safetyRating} tone="slate" />
                <Stat label="Fleet" value={String(snapshot.fleetSize ?? "—")} sub="Active units" tone="indigo" />
                <Stat label="Jurisdiction" value={meta.fullName} tone="slate" />
            </div>

            <div>
                <Eyebrow>Findings Narrative</Eyebrow>
                <Body>{narrative}</Body>
            </div>

            <div>
                <Eyebrow>Score Composition</Eyebrow>
                <ChartCard title={`Components contributing to ${snapshot.headlineLabel.toLowerCase()}`}>
                    <BarChart
                        width={CHART_W} height={230}
                        data={snapshot.scoreBreakdown.map(b => ({ name: b.name, value: b.value, events: b.events ?? 0, color: b.color }))}
                        margin={{ top: 18, right: 16, bottom: 8, left: 8 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={C.line} />
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 9.5, fill: C.muted, fontWeight: 600 }}
                            angle={-22}
                            textAnchor="end"
                            interval={0}
                            height={56}
                            tickMargin={6}
                        />
                        <YAxis
                            tick={{ fontSize: 9.5, fill: C.soft }}
                            width={48}
                            label={{ value: snapshot.headlineLabel, angle: -90, position: "insideLeft", offset: 16, fontSize: 9.5, fill: C.soft, fontWeight: 700 }}
                        />
                        <Tooltip
                            cursor={{ fill: C.softer }}
                            formatter={(v: any, _n: any, p: any) => {
                                const events = p?.payload?.events;
                                const score = Number(v).toFixed(2);
                                return events ? [`${score} (${events} event${events === 1 ? "" : "s"})`, "Score"] : [score, "Score"];
                            }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {snapshot.scoreBreakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                            <LabelList
                                dataKey="value"
                                position="top"
                                formatter={(v: any) => Number(v).toFixed(2)}
                                style={{ fontSize: 10, fontWeight: 700, fill: C.ink }}
                            />
                        </Bar>
                    </BarChart>
                </ChartCard>
                <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 9.5, color: C.muted, flexWrap: "wrap" }}>
                    {snapshot.scoreBreakdown.map((b) => (
                        <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color, display: "inline-block" }} />
                            <span style={{ color: C.ink, fontWeight: 700 }}>{b.name}</span>
                            <span style={{ fontFamily: MONO }}>{b.value.toFixed(2)}</span>
                            {b.events !== undefined && (
                                <span>· {b.events} event{b.events === 1 ? "" : "s"}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Score Breakdown ──────────────────────────────────────────────────

function ScoreBreakdownPage({
    snapshot, jurisdiction, abProfile,
}: {
    snapshot: NormalisedSnapshot;
    jurisdiction: NscJurisdiction;
    abProfile?: AbProfile;
}) {
    const meta = JURISDICTION_META[jurisdiction];
    const total = snapshot.scoreBreakdown.reduce((s, b) => s + b.value, 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={2}
                eyebrow="Section Two"
                title="Score Composition"
                lede={
                    `The components that combine to form the carrier's ${snapshot.headlineLabel.toLowerCase()} ` +
                    `under ${meta.fullName}'s NSC framework. Bars are scaled to each component's relative size.`
                }
            />

            <div
                style={{
                    background: "#fff",
                    border: `1px solid ${C.line}`,
                    borderRadius: 6,
                    padding: 14,
                }}
            >
                <div style={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.6, marginBottom: 10 }}>
                    Contribution to {snapshot.headlineLabel.toLowerCase()}
                </div>
                {snapshot.scoreBreakdown.map((b, i) => {
                    const max = Math.max(...snapshot.scoreBreakdown.map(x => x.value), 1);
                    const widthPct = Math.min(100, (b.value / max) * 100);
                    return (
                        <div key={b.name} style={{ marginBottom: i === snapshot.scoreBreakdown.length - 1 ? 0 : 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                                <div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{b.name}</span>
                                    {b.events !== undefined && (
                                        <span style={{ fontSize: 10, color: C.muted, marginLeft: 8 }}>{b.events} event{b.events === 1 ? "" : "s"}</span>
                                    )}
                                </div>
                                <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 13, color: C.ink }}>
                                    {b.value.toFixed(2)}
                                </span>
                            </div>
                            <div style={{ height: 10, background: C.softer, borderRadius: 6, overflow: "hidden" }}>
                                <div style={{ width: `${widthPct}%`, height: "100%", background: b.color, borderRadius: 6 }} />
                            </div>
                            <div style={{ fontSize: 9.5, color: C.muted, marginTop: 4 }}>{b.note}</div>
                        </div>
                    );
                })}
            </div>

            {/* Reference table */}
            <div>
                <Eyebrow>Reference Table</Eyebrow>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10.5, border: `1px solid ${C.line}` }}>
                    <thead>
                        <tr>
                            <th style={th}>Component</th>
                            <th style={{ ...th, textAlign: "center" }}>Value</th>
                            {snapshot.scoreBreakdown.some(b => b.events !== undefined) && (
                                <th style={{ ...th, textAlign: "center" }}>Events</th>
                            )}
                            <th style={{ ...th, textAlign: "center" }}>% of Total</th>
                            <th style={th}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {snapshot.scoreBreakdown.map((b, i) => (
                            <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                <td style={{ ...td, fontWeight: 700 }}>
                                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, marginRight: 8, background: b.color }} />
                                    {b.name}
                                </td>
                                <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 700 }}>{b.value.toFixed(2)}</td>
                                {snapshot.scoreBreakdown.some(b => b.events !== undefined) && (
                                    <td style={{ ...td, textAlign: "center", fontFamily: MONO, color: C.muted }}>
                                        {b.events ?? "—"}
                                    </td>
                                )}
                                <td style={{ ...td, textAlign: "center", color: C.muted, fontFamily: MONO }}>
                                    {total > 0 ? `${Math.round((b.value / total) * 100)}%` : "—"}
                                </td>
                                <td style={{ ...td, color: C.muted, fontSize: 9.5 }}>{b.note}</td>
                            </tr>
                        ))}
                        <tr style={{ borderTop: `1.5px solid ${C.accent}`, background: C.softBg }}>
                            <td style={{ ...td, fontWeight: 800 }}>Total</td>
                            <td style={{ ...td, textAlign: "center", fontFamily: MONO, fontWeight: 900, color: C.accent }}>{total.toFixed(2)}</td>
                            {snapshot.scoreBreakdown.some(b => b.events !== undefined) && (
                                <td style={{ ...td, textAlign: "center", color: C.muted }}>—</td>
                            )}
                            <td style={{ ...td, textAlign: "center", color: C.muted }}>—</td>
                            <td style={td}><ClassBadge tone={snapshot.statusTone} /></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Optional jurisdiction-specific extras */}
            {jurisdiction === "AB" && abProfile?.stageThresholds && (
                <AbStageLadder rFactor={abProfile.rFactor} stages={abProfile.stageThresholds} currentStage={abProfile.monitoringStage} />
            )}
        </div>
    );
}

function AbStageLadder({
    rFactor, stages, currentStage,
}: {
    rFactor: number;
    stages: Array<{ stage: number; low: number; high: number | null }>;
    currentStage: string;
}) {
    return (
        <div>
            <Eyebrow>Alberta Monitoring Stages</Eyebrow>
            <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: 14 }}>
                {stages.map((s) => {
                    const inThis = rFactor >= s.low && (s.high === null || rFactor < s.high);
                    const stageLabel = `Stage ${s.stage}`;
                    const tone: ClassTone = s.stage === 1 ? "moderate" : s.stage === 2 ? "concern" : s.stage >= 3 ? "critical" : "good";
                    const t = TONE[tone];
                    return (
                        <div
                            key={s.stage}
                            style={{
                                display: "grid",
                                gridTemplateColumns: "120px 1fr 130px",
                                gap: 14, alignItems: "center",
                                padding: "10px 12px",
                                background: inThis ? t.bg : "transparent",
                                border: `1px solid ${inThis ? t.border : "transparent"}`,
                                borderRadius: 4,
                                marginBottom: 4,
                            }}
                        >
                            <div><ClassBadge tone={tone} /></div>
                            <div>
                                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink }}>{stageLabel}</div>
                                <div style={{ fontSize: 9.5, color: C.muted, marginTop: 2 }}>
                                    R-factor range {s.low} – {s.high === null ? "∞" : s.high}.
                                </div>
                            </div>
                            <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 11, fontWeight: 700, color: inThis ? t.fg : C.muted }}>
                                {s.low.toFixed(3)} – {s.high === null ? "∞" : s.high.toFixed(3)}
                                {inThis && (
                                    <div style={{ fontSize: 9, fontWeight: 800, color: t.fg, marginTop: 2 }}>YOU ARE HERE</div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {currentStage === "Not Monitored" && (
                    <div style={{ marginTop: 8, fontSize: 10, color: C.muted, fontStyle: "italic", textAlign: "center" }}>
                        Carrier is below all monitoring stages — currently <b style={{ color: C.green }}>Not Monitored</b>.
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Reference / Detail page ──────────────────────────────────────────

function ReferencePage({
    snapshot, jurisdiction, bcProfile,
}: {
    snapshot: NormalisedSnapshot;
    jurisdiction: NscJurisdiction;
    bcProfile?: BcProfile;
}) {
    const meta = JURISDICTION_META[jurisdiction];

    // Two-column layout for the detail rows
    const half = Math.ceil(snapshot.detailRows.length / 2);
    const left = snapshot.detailRows.slice(0, half);
    const right = snapshot.detailRows.slice(half);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={3}
                eyebrow="Section Three"
                title="Carrier Reference"
                lede={
                    `Identifying numbers, certificate dates, and demographic detail recorded with ` +
                    `${meta.fullName} NSC for this carrier.`
                }
            />

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 14,
                }}
            >
                {[left, right].map((col, ci) => (
                    <div key={ci} style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 6, padding: 14 }}>
                        {col.map((row, ri) => (
                            <div
                                key={ri}
                                style={{
                                    padding: "8px 0",
                                    borderTop: ri === 0 ? "none" : `1px solid ${C.softer}`,
                                    display: "grid",
                                    gridTemplateColumns: "118px 1fr",
                                    alignItems: "baseline",
                                    gap: 12,
                                }}
                            >
                                <div style={{ fontSize: 8.5, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 1.2 }}>
                                    {row.k}
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, fontFamily: row.mono ? MONO : FONT, lineHeight: 1.45, wordBreak: "break-word" }}>
                                    {row.v}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {jurisdiction === "BC" && bcProfile?.thresholds && (
                <div>
                    <Eyebrow>BC Profile Thresholds</Eyebrow>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, border: `1px solid ${C.line}` }}>
                        <thead>
                            <tr>
                                <th style={th}>Status</th>
                                <th style={th}>Contraventions</th>
                                <th style={th}>CVSA</th>
                                <th style={th}>Accidents</th>
                                <th style={th}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bcProfile.thresholds.map((t, i) => {
                                const tone: ClassTone =
                                    t.status === "Satisfactory"   ? "good"
                                    : t.status === "Conditional"  ? "moderate"
                                    : "critical";
                                return (
                                    <tr key={i} style={{ borderTop: `1px solid ${C.line}` }}>
                                        <td style={{ ...td, fontWeight: 700 }}>
                                            <ClassBadge tone={tone} /> <span style={{ marginLeft: 8 }}>{t.status}</span>
                                        </td>
                                        <td style={{ ...td, fontFamily: MONO }}>{t.contraventions}</td>
                                        <td style={{ ...td, fontFamily: MONO }}>{t.cvsa}</td>
                                        <td style={{ ...td, fontFamily: MONO }}>{t.accidents}</td>
                                        <td style={{ ...td, fontFamily: MONO, fontWeight: 700 }}>{t.total}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Interventions (BC only) ──────────────────────────────────────────

function InterventionsPage({ bcProfile, sectionNumber }: { bcProfile: BcProfile; sectionNumber: number }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={sectionNumber}
                eyebrow={`Section ${["One","Two","Three","Four","Five","Six"][sectionNumber - 1] || sectionNumber}`}
                title="Interventions"
                lede={
                    `Regulator-issued interventions on file for this carrier. Each entry indicates ` +
                    `the type of action and the date it was triggered.`
                }
            />

            {bcProfile.interventions.length === 0 ? (
                <div
                    style={{
                        background: TONE.good.bg,
                        border: `1px solid ${TONE.good.border}`,
                        borderRadius: 8,
                        padding: "14px 18px",
                        fontSize: 11,
                        color: C.body,
                    }}
                >
                    No interventions on file — the carrier is currently in good standing.
                </div>
            ) : (
                bcProfile.interventions.map((iv, i) => {
                    const tone: ClassTone =
                        iv.type.toLowerCase().includes("audit") ? "concern"
                        : iv.type.toLowerCase().includes("warning") ? "moderate"
                        : "concern";
                    const t = TONE[tone];
                    return (
                        <div
                            key={i}
                            style={{
                                background: "#fff",
                                border: `1px solid ${C.line}`,
                                borderLeft: `4px solid ${t.fg}`,
                                borderRadius: 6,
                                padding: "12px 16px",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <ClassBadge tone={tone} />
                                <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{iv.type}</div>
                                <div style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10.5, color: C.muted, fontWeight: 700 }}>
                                    {iv.date}
                                </div>
                            </div>
                            <div style={{ fontSize: 10.5, color: C.body, marginTop: 6, lineHeight: 1.55 }}>
                                {iv.description}
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}

// ── Recommendations ──────────────────────────────────────────────────

function RecommendationsPage({
    snapshot, jurisdiction, sectionNumber,
}: {
    snapshot: NormalisedSnapshot;
    jurisdiction: NscJurisdiction;
    sectionNumber: number;
}) {
    const meta = JURISDICTION_META[jurisdiction];
    const recs: Array<{ priority: "High" | "Medium" | "Low"; title: string; body: string }> = [];

    if (snapshot.statusTone === "critical" || snapshot.statusTone === "concern") {
        recs.push({
            priority: "High",
            title: `Engage with ${meta.fullName} regulator proactively`,
            body:
                `Profile status is ${snapshot.statusLabel}. Open a dialogue with the ${meta.fullName} ` +
                `NSC office, prepare DQ files, PM records, and HOS supporting documents, and write ` +
                `a 30/60/90-day corrective action plan to present if the regulator initiates contact.`,
        });
    } else if (snapshot.statusTone === "moderate") {
        recs.push({
            priority: "High",
            title: "Drive score below threshold",
            body:
                `Score is approaching the regulator's monitoring threshold. Set a 90-day target to ` +
                `reduce the leading contributor before the carrier is escalated.`,
        });
    }

    const dom = [...snapshot.scoreBreakdown].sort((a, b) => b.value - a.value)[0];
    if (dom && dom.value > 0) {
        const playbooks: Record<string, string> = {
            "Convictions":              "Audit the top convicted drivers' MVRs, schedule remedial training, and review dispatch routing through high-violation corridors.",
            "Conviction Score":         "Audit the top convicted drivers' MVRs, schedule remedial training, and review dispatch routing through high-violation corridors.",
            "Conviction Points":        "Audit the top convicted drivers' MVRs, schedule remedial training, and review dispatch routing through high-violation corridors.",
            "Contraventions":           "Identify the most-cited driver / vehicle / load contraventions and integrate findings into monthly safety meetings.",
            "CVSA Inspections":         "Tighten pre-trip inspection checks on the highest-cited equipment and accelerate brake / lighting PM intervals.",
            "CVSA (Out of Service)":    "Tighten pre-trip inspection checks on the highest-cited equipment and accelerate brake / lighting PM intervals.",
            "Inspection Score":         "Tighten pre-trip inspection checks on the highest-cited equipment and accelerate brake / lighting PM intervals.",
            "Inspection Points":        "Tighten pre-trip inspection checks on the highest-cited equipment and accelerate brake / lighting PM intervals.",
            "Reportable Collisions":    "After-action review on every collision; identify common conditions and integrate findings into driver coaching.",
            "Accidents":                "After-action review on every reportable accident; identify common conditions and integrate findings into driver coaching.",
            "Collision Score":          "After-action review on every reportable collision; identify common conditions and integrate findings into driver coaching.",
            "Collision Points":         "After-action review on every reportable collision; identify common conditions and integrate findings into driver coaching.",
            "Admin Penalties":          "Review the regulator's penalty notices, identify the underlying compliance gap, and embed remediation into operations workflows.",
        };
        recs.push({
            priority: snapshot.statusTone === "critical" || snapshot.statusTone === "concern" ? "High" : "Medium",
            title: `Reduce leading contributor: ${dom.name}`,
            body: playbooks[dom.name] || "Investigate root causes and design a 60-day corrective action plan focused on this component.",
        });
    }

    if (recs.length === 0) {
        recs.push({
            priority: "Low",
            title: "Maintain monitoring cadence",
            body:
                `Score remains comfortably below ${meta.fullName}'s regulatory thresholds. Continue monthly ` +
                `review and act on emerging trends early.`,
        });
    }

    recs.push(
        {
            priority: "Medium",
            title: "Driver-of-the-month coaching reinforcement",
            body:
                "Recognise drivers whose inspections were clean during the review window and use these as anchor examples in monthly safety meetings.",
        },
        {
            priority: "Low",
            title: "Quarterly internal mock NSC audit",
            body:
                `Run an internal mock audit each quarter — driver qualification files, daily inspection records, ` +
                `hours-of-service supporting documents, and PM records — using ${meta.fullName} criteria.`,
        },
    );

    const ptone = (p: "High" | "Medium" | "Low") =>
        p === "High" ? TONE.critical : p === "Medium" ? TONE.moderate : TONE.good;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SectionHead
                number={sectionNumber}
                eyebrow={`Section ${["One","Two","Three","Four","Five","Six","Seven"][sectionNumber - 1] || sectionNumber}`}
                title="Recommendations"
                lede={
                    `A prioritised, data-driven action list. Items are derived directly from this carrier's ` +
                    `${meta.fullName} NSC profile.`
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
                and {meta.fullName} NSC-derived metrics for management use. It is not a substitute for the
                official Carrier Profile issued by the {meta.fullName} regulator. Figures may differ
                slightly from regulator publications based on data refresh timing.
            </div>
        </div>
    );
}

// ── Public component ──────────────────────────────────────────────────

export function NscPdfReport(props: NscPdfReportProps) {
    const { jurisdiction, carrierProfile, reportDate = new Date() } = props;
    const meta = JURISDICTION_META[jurisdiction];
    const snapshot = useMemo(() => normalise(props), [props]);

    const sections: Section[] = [];
    sections.push({ id: "cover", title: "Cover", label: "Cover", page: 0, chromeless: true });
    sections.push({ id: "toc", title: "Table of Contents", label: "Index", page: 0 });
    sections.push({
        id: "executive",
        title: "Executive Summary",
        label: "Executive Summary",
        summary: `Headline status, KPIs, and a data-driven narrative for ${meta.fullName}.`,
        tone: snapshot.statusTone,
        page: 0,
    });
    sections.push({
        id: "score-breakdown",
        title: "Score Composition",
        label: "Score Composition",
        summary: "Components that combine to form the carrier's NSC score.",
        tone: snapshot.statusTone,
        page: 0,
    });
    sections.push({
        id: "reference",
        title: "Carrier Reference",
        label: "Reference",
        summary: "Identifying numbers, certificate dates, and demographic detail.",
        page: 0,
    });
    if (jurisdiction === "BC" && props.bcProfile && props.bcProfile.interventions.length > 0) {
        sections.push({
            id: "interventions",
            title: "Interventions",
            label: "Interventions",
            summary: "Regulator-issued interventions on file.",
            tone: "concern",
            page: 0,
        });
    }
    sections.push({
        id: "recommendations",
        title: "Recommendations",
        label: "Recommendations",
        summary: "Prioritised, data-driven action list.",
        page: 0,
    });

    sections.forEach((s, i) => { s.page = i + 1; });
    const totalPages = sections.length;

    const carrierName = carrierProfile.name || "Unknown Carrier";

    const renderSection = (s: Section) => {
        switch (s.id) {
            case "cover":
                return <CoverPage carrierProfile={carrierProfile} snapshot={snapshot} jurisdiction={jurisdiction} reportDate={reportDate} />;
            case "toc":
                return <TocPage sections={sections} />;
            case "executive":
                return <ExecutiveSummaryPage snapshot={snapshot} carrierProfile={carrierProfile} jurisdiction={jurisdiction} />;
            case "score-breakdown":
                return <ScoreBreakdownPage snapshot={snapshot} jurisdiction={jurisdiction} abProfile={props.abProfile} />;
            case "reference":
                return <ReferencePage snapshot={snapshot} jurisdiction={jurisdiction} bcProfile={props.bcProfile} />;
            case "interventions": {
                if (!props.bcProfile) return null;
                const contentSections = sections.filter(x => x.id !== "cover" && x.id !== "toc");
                const idx = contentSections.findIndex(x => x.id === "interventions");
                return <InterventionsPage bcProfile={props.bcProfile} sectionNumber={idx + 1} />;
            }
            case "recommendations": {
                // Section ordinal among the visible content pages (skipping
                // cover + toc). Bumps past 4 when BC's interventions page is
                // included, etc.
                const contentSections = sections.filter(x => x.id !== "cover" && x.id !== "toc");
                const idx = contentSections.findIndex(x => x.id === "recommendations");
                return <RecommendationsPage snapshot={snapshot} jurisdiction={jurisdiction} sectionNumber={idx + 1} />;
            }
        }
    };

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
                        nscNumber={snapshot.nscNumber}
                        agencyLine={meta.agencyLine}
                    >
                        {renderSection(s)}
                    </Page>
                )
            )}
        </div>
    );
}
