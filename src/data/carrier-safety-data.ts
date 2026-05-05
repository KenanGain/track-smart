// ============================================================================
//  Per-carrier safety & compliance demo data — deterministic generator
// ============================================================================
//
// For every non-Acme carrier in `ACCOUNTS_DB`, produce realistic-looking
// safety / compliance data that matches the prop shapes the existing
// InspectionsPage components expect:
//
//     • NSC Alberta  — `NscPerformanceCardProps`
//     • NSC BC       — `NscBcCarrierProfileProps`
//     • NSC PEI      — `PeiNscData`
//     • NSC Nova Scotia — `NsNscData`
//
// The generator is keyed by `accountId` so the same carrier always renders
// the same numbers across reloads. Acme Trucking (acct-001) is the only
// carrier that ships with hand-curated mock data; for any other accountId
// the generator builds a record from the carrier's `ACCOUNTS_DB` entry
// (legalName, fleet size, state, etc.) plus deterministic randomness.
//
// ----------------------------------------------------------------------------
//  Layered fallback rule
// ----------------------------------------------------------------------------
//
//   getNscXxProfileFor(accountId)
//     • acct-001 (Acme)   → returns the hand-curated demo data
//     • any other carrier → returns a generated record
//
// All generators use a single `rng(seed)` helper so combinations are stable
// across reloads — the same carrier always renders the same values.

import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import type { NscPerformanceCardProps } from "@/pages/inspections/NscPerformanceCard";
import type {
    NscBcCarrierProfileProps,
} from "@/pages/inspections/NscBcCarrierProfile";
import { INERTIA_CARRIER_BC_DATA } from "@/pages/inspections/NscBcCarrierProfile";
import {
    ALBERTA_NSC_PERFORMANCE_CARD,
    NOVA_SCOTIA_NSC_PROFILE,
    PRINCE_EDWARD_ISLAND_NSC_PROFILE,
} from "@/pages/inspections/InspectionsPage";
import {
    carrierProfile as ACME_CARRIER_PROFILE,
    inspectionsData as ACME_INSPECTIONS,
    cvorPeriodicReports as ACME_CVOR_PERIODIC_REPORTS,
} from "@/pages/inspections/inspectionsData";
import {
    CVOR_INTERVENTION_PERIOD as ACME_CVOR_INTERVENTION_PERIOD,
    cvorInterventionEvents as ACME_CVOR_INTERVENTION_EVENTS,
    cvorTravelKm as ACME_CVOR_TRAVEL_KM,
} from "@/pages/inspections/cvorInterventionEvents.data";

// ── Deterministic RNG seeded by accountId ────────────────────────────

function hash(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h = (h ^ s.charCodeAt(i)) >>> 0;
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}
function rng(seed: string) {
    let a = hash(seed);
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const pick = <T,>(r: () => number, items: readonly T[]): T =>
    items[Math.floor(r() * items.length)] as T;

const ACME_ID = "acct-001";

// ── Helper: today + offset days ──────────────────────────────────────

function dateOffset(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}
function fmtCa(d: Date): string {
    // dd-MMM-yyyy (BC + AB style)
    return `${String(d.getDate()).padStart(2, "0")}-${
        ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]
    }-${d.getFullYear()}`;
}
function fmtSlash(d: Date): string {
    // dd/mm/yyyy (NS style)
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function fmtAbDate(d: Date): string {
    // YYYY MMM DD (Alberta style)
    return `${d.getFullYear()} ${["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"][d.getMonth()]} ${String(d.getDate()).padStart(2, "0")}`;
}

// ── Fleet-size / safety-rating bands ────────────────────────────────

function pickFleetRange(fleet: number): string {
    if (fleet < 5)   return "1.0-4.9";
    if (fleet < 10)  return "5.0-9.9";
    if (fleet < 15)  return "10.0-14.9";
    if (fleet < 20)  return "15.0-19.9";
    if (fleet < 30)  return "20.0-29.9";
    if (fleet < 45)  return "30.0-44.9";
    if (fleet < 70)  return "45.0-69.9";
    return "70.0+";
}

// ── Public API ───────────────────────────────────────────────────────

export function getNscAbProfileFor(accountId: string): NscPerformanceCardProps {
    if (accountId === ACME_ID) return ALBERTA_NSC_PERFORMANCE_CARD;
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) return ALBERTA_NSC_PERFORMANCE_CARD;

    const r = rng(`ab:${accountId}`);
    const fleet = Math.max(1, acct.drivers || Math.floor(r() * 60) + 5);
    const rFactor = +(0.05 + r() * 1.6).toFixed(3);
    const monitoringStage = rFactor < 0.42 ? "Not Monitored"
        : rFactor < 0.618 ? "Stage 1"
        : rFactor < 0.85  ? "Stage 2"
        : rFactor < 1.105 ? "Stage 3"
        : "Stage 4";
    const convictions = Math.floor(r() * 12);
    const cvsa = Math.floor(r() * 60) + 5;
    const collisions = Math.floor(r() * 8);

    const cnvPct  = +(r() * 100).toFixed(1);
    const adminPct = r() < 0.85 ? 0 : +(r() * 30).toFixed(1);
    const cvsaPct = +(100 - cnvPct - adminPct - r() * 30).toFixed(1);
    const colPct  = +(100 - cnvPct - adminPct - cvsaPct).toFixed(1);

    return {
        carrierName: acct.legalName,
        profileDate: fmtAbDate(dateOffset(-Math.floor(r() * 90))),
        rFactor,
        monitoringStage,
        fleetRange: pickFleetRange(fleet),
        fleetType: pick(r, ["Truck", "Truck", "Bus", "Mixed"] as const),
        stageThresholds: [
            { stage: 1, low: 0.42,  high: 0.617 },
            { stage: 2, low: 0.618, high: 0.849 },
            { stage: 3, low: 0.85,  high: 1.104 },
            { stage: 4, low: 1.105, high: null  },
        ],
        statusMessage: monitoringStage === "Not Monitored"
            ? `Not on NSC monitoring — performance is within acceptable range for fleet ${pickFleetRange(fleet)}`
            : `Carrier is at ${monitoringStage} monitoring — corrective action required`,
        contributions: {
            convictions:          { pct: Math.max(0, cnvPct),   events: convictions },
            adminPenalties:       { pct: Math.max(0, adminPct), events: r() < 0.9 ? 0 : Math.floor(r() * 4) },
            cvsaInspections:      { pct: Math.max(0, cvsaPct),  events: cvsa        },
            reportableCollisions: { pct: Math.max(0, colPct),   events: collisions  },
        },
        carrierInfo: {
            nscNumber:         acct.nscNumber || `AB${100 + Math.floor(r() * 899)}-${1000 + Math.floor(r() * 9000)}`,
            mvidNumber:        `${String(Math.floor(r() * 9000) + 1000)}-${String(Math.floor(r() * 90000) + 10000)}`,
            operatingStatus:   pick(r, ["Federal", "Provincial", "Federal"] as const),
            certNumber:        String(Math.floor(r() * 9_000_000) + 1_000_000),
            certEffective:     fmtAbDate(dateOffset(-Math.floor(r() * 365 + 365))),
            certExpiry:        fmtAbDate(dateOffset(Math.floor(r() * 365 + 365))),
            safetyRating:      pick(r, ["Satisfactory Unaudited", "Satisfactory", "Conditional"] as const),
            monitoringAsOf:    fmtAbDate(dateOffset(-30)),
            monitoringRFactor: +(rFactor + (r() - 0.5) * 0.05).toFixed(3),
            monitoringStage,
            totalCarriersAB:   17000 + Math.floor(r() * 1500),
            fleetAvg:          fleet,
            fleetCurrent:      fleet,
            convictionDocs:    convictions,
            convictionCount:   convictions,
            convictionPoints:  convictions * (1 + Math.floor(r() * 3)),
        },
    };
}

export function getNscBcProfileFor(accountId: string): NscBcCarrierProfileProps {
    if (accountId === ACME_ID) return INERTIA_CARRIER_BC_DATA;
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) return INERTIA_CARRIER_BC_DATA;

    const r = rng(`bc:${accountId}`);
    const fleet = Math.max(1, acct.drivers || Math.floor(r() * 80) + 10);
    const cnv = +(r() * 1.5).toFixed(2);
    const oos = +(r() * 1).toFixed(2);
    const acc = +(r() * 0.4).toFixed(2);
    const totalScore = +(cnv + oos + acc).toFixed(2);
    const profileStatus = totalScore < 2.13 ? "Satisfactory" : totalScore < 3.65 ? "Conditional" : "Unsatisfactory";

    return {
        demographics: {
            carrierName: acct.legalName.toUpperCase(),
            jurisdiction: "BC",
            primaryBusinessType: pick(r, ["General Freight", "Bulk Hauling", "Refrigerated", "Mixed Fleet"] as const),
            certificateIssueDate: fmtCa(dateOffset(-Math.floor(r() * 365 * 8 + 365))),
            extraProvincial: r() < 0.7,
            mailingAddress: `${100 + Math.floor(r() * 900)}-${10000 + Math.floor(r() * 89999)} ${pick(r, ["KING ST", "MAIN ST", "BLUEWATER RD", "RIVER RD", "INDUSTRY AVE"] as const)}, ${pick(r, ["BURNABY", "RICHMOND", "DELTA", "SURREY", "VANCOUVER"] as const)} BC ${pick(r, ["V5G 1A1","V6T 1Z2","V3S 1G3","V4K 0B7"] as const)}`,
            premiumCarrier: r() < 0.15,
            weigh2GoBC: r() < 0.3,
            preventativeMaintenance: r() < 0.5,
            numberOfLicensedVehicles: fleet,
            nscNumber: acct.nscNumber || `${100 + Math.floor(r() * 899)}-${100 + Math.floor(r() * 899)}-${100 + Math.floor(r() * 899)}`,
            reportRunDate: fmtCa(new Date()),
            profileFrom:   fmtCa(dateOffset(-365 * 2)),
            profileTo:     fmtCa(new Date()),
        },
        certificate: {
            certificateStatus: pick(r, ["Active", "Active", "Active", "Suspended"] as const),
            safetyRating:     pick(r, ["Satisfactory - Unaudited", "Satisfactory", "Conditional"] as const),
            profileStatus,
            auditStatus:      pick(r, ["Unaudited", "Audited"] as const),
        },
        complianceReview: {
            asOfDate: fmtCa(dateOffset(-30)),
            averageFleetSize: +(fleet + (r() - 0.5) * 5).toFixed(2),
            scores: [
                { category: "Contraventions",          score: cnv, events: Math.floor(r() * 25) },
                { category: "CVSA (Out of Service)",   score: oos, events: Math.floor(r() * 8)  },
                { category: "Accidents",               score: acc, events: Math.floor(r() * 6)  },
            ],
            totalScore,
        },
        thresholds: [
            { status: "Satisfactory",   contraventions: "0.00 - 1.76",     cvsa: "0.00 - 0.93",     accidents: "0.00 - 0.23",     total: "0.00 - 2.13"   },
            { status: "Conditional",    contraventions: "1.77 - 2.98",     cvsa: "0.94 - 1.08",     accidents: "0.24 - 0.27",     total: "2.14 - 3.64"   },
            { status: "Unsatisfactory", contraventions: "2.99 and above", cvsa: "1.09 and above", accidents: "0.28 and above", total: "3.65 and above" },
        ],
        interventions: profileStatus === "Satisfactory" ? [] : [
            {
                type: pick(r, ["Audit - Triggered", "Compliance Review", "Warning Letter"] as const),
                date: fmtCa(dateOffset(-Math.floor(r() * 365))),
                description: "Triggered intervention occurred due to the carrier's profile scores exceeding the thresholds set by the NSC program office in any one of the four categories.",
            },
        ],
    };
}

export function getNscPeProfileFor(accountId: string) {
    if (accountId === ACME_ID) return PRINCE_EDWARD_ISLAND_NSC_PROFILE;
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) return PRINCE_EDWARD_ISLAND_NSC_PROFILE;

    const r = rng(`pe:${accountId}`);
    const fleet = Math.max(1, acct.drivers || Math.floor(r() * 25) + 5);
    return {
        jurisdiction: "Prince Edward Island",
        profileAsOf: fmtSlash(dateOffset(-Math.floor(r() * 90))).replaceAll("/", "/"),
        nscNumber: acct.nscNumber || `PE${100000 + Math.floor(r() * 899999)}`,
        safetyRating: pick(r, ["Satisfactory", "Conditional", "Satisfactory Unaudited"] as const),
        summary: {
            collisionPoints:  Math.floor(r() * 12),
            convictionPoints: Math.floor(r() * 14),
            inspectionPoints: Math.floor(r() * 18),
            currentActiveVehiclesAtLastAssessment: fleet,
            currentActiveVehicles: fleet,
        },
    } as typeof PRINCE_EDWARD_ISLAND_NSC_PROFILE;
}

export function getNscNsProfileFor(accountId: string): {
    carrierName: string;
    nscNumber: string;
    profileAsOf: string;
    safetyRating: string;
    safetyRatingExpires: string;
    contactName: string;
    contactTitle: string;
    phone: string;
    mailingAddress: string;
    physicalAddress: string;
    principalPlace: string;
    currentFleetSize: number;
    avgDailyFleetSize: number;
    scoreLevel1: number;
    scoreLevel2: number;
    scoreLevel3: number;
    convictionScore: number;
    inspectionScore: number;
    collisionScore: number;
} {
    if (accountId === ACME_ID) return NOVA_SCOTIA_NSC_PROFILE;
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) return NOVA_SCOTIA_NSC_PROFILE;

    const r = rng(`ns:${accountId}`);
    const fleet = Math.max(1, acct.drivers || Math.floor(r() * 60) + 5);
    const conviction = +(r() * 8).toFixed(4);
    const inspection = +(r() * 14).toFixed(4);
    const collision  = +(r() * 4).toFixed(4);

    return {
        carrierName:           acct.legalName.toUpperCase(),
        nscNumber:             acct.nscNumber || `NS${String(Math.floor(r() * 9_000_000) + 1_000_000)}`,
        profileAsOf:           fmtSlash(dateOffset(-Math.floor(r() * 60))),
        safetyRating:          pick(r, ["SATISFACTORY", "SATISFACTORY - UNAUDITED", "CONDITIONAL"] as const),
        safetyRatingExpires:   `${String(Math.floor(r() * 12) + 1).padStart(2, "0")}/${new Date().getFullYear() + 1}`,
        contactName:           acct.legalName.split(" ")[0]?.toUpperCase() + " ADMIN",
        contactTitle:          pick(r, ["DIRECTOR", "OPERATIONS MANAGER", "OWNER"] as const),
        phone:                 `${pick(r, ["902","506","709","416","647"] as const)}-${String(Math.floor(r() * 900) + 100)}-${String(Math.floor(r() * 9000) + 1000)}`,
        mailingAddress:        `${100 + Math.floor(r() * 900)} ${pick(r, ["WYSE ROAD","GOTTINGEN ST","DUNCAN ST","MAIN ST"] as const)}\n${pick(r, ["DARTMOUTH NS","HALIFAX NS","SYDNEY NS"] as const)}\n${pick(r, ["B3A4S5","B3K3T5","B1P6L7"] as const)}`,
        physicalAddress:       `${100 + Math.floor(r() * 900)} ${pick(r, ["WYSE ROAD","GOTTINGEN ST","DUNCAN ST","MAIN ST"] as const)}\n${pick(r, ["DARTMOUTH NS","HALIFAX NS","SYDNEY NS"] as const)}\n${pick(r, ["B3A4S5","B3K3T5","B1P6L7"] as const)}`,
        principalPlace:        `${100 + Math.floor(r() * 900)} ${pick(r, ["WYSE RD, DARTMOUTH","GOTTINGEN ST, HALIFAX","DUNCAN ST, SYDNEY"] as const)}`,
        currentFleetSize:      fleet,
        avgDailyFleetSize:     +(fleet + (r() - 0.5)).toFixed(2),
        scoreLevel1:           39.7531,
        scoreLevel2:           45.9602,
        scoreLevel3:           60.1836,
        convictionScore:       conviction,
        inspectionScore:       inspection,
        collisionScore:        collision,
    };
}

// ── FMCSA + CVOR — full carrierProfile shape ─────────────────────────

type CarrierProfile = typeof ACME_CARRIER_PROFILE;

/**
 * Returns a full `carrierProfile` object for the given carrier. Acme returns
 * the hand-curated demo data unchanged; every other carrier gets a
 * deterministically-generated profile that uses Acme's structure as a
 * template and tweaks the leaf values (carrier name, scores, ratings,
 * counts, miles) so the FMCSA SMS BASIC and Ontario CVOR tabs render
 * carrier-specific numbers.
 */
export function getCarrierProfileFor(accountId: string): CarrierProfile {
    if (accountId === ACME_ID) return ACME_CARRIER_PROFILE;
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) return ACME_CARRIER_PROFILE;

    const r = rng(`carrierProfile:${accountId}`);
    const fleet = Math.max(1, acct.drivers || Math.floor(r() * 60) + 5);
    const drivers = Math.max(1, acct.drivers || fleet);
    const dotNumber = acct.dotNumber || String(Math.floor(r() * 9_000_000) + 1_000_000);
    const cvorNumber = acct.cvorNumber || `${Math.floor(r() * 9_000_000) + 1_000_000}-ON`;

    // FMCSA SMS BASIC — randomize percentile + measure per category.
    const basicCats = [
        { category: "Unsafe Driving",                base: 1.4 },
        { category: "Crash Indicator",               base: 0.2 },
        { category: "Hours-of-service Compliance",   base: 0.9 },
        { category: "Vehicle Maintenance",           base: 22  },
        { category: "Controlled Substances",         base: 0   },
        { category: "Hazmat compliance",             base: 0   },
        { category: "Driver Fitness",                base: 0   },
        { category: "Others",                        base: 0   },
    ];
    const basicStatus = basicCats.map((c) => {
        const measure = +(c.base * (0.4 + r() * 1.6)).toFixed(2);
        const pct = Math.floor(r() * 100);
        const alert = pct >= 65;
        return {
            category: c.category,
            measure: String(measure),
            percentile: c.base === 0 && r() < 0.5 ? "0%" : `${pct}%`,
            alert,
            details: alert
                ? `${1 + Math.floor(r() * 7)} inspections with violations`
                : "No violations",
        };
    });

    // CVOR — derive percentages and counts.
    const collisionsPct = +(r() * 35).toFixed(2);
    const convictionsPct = +(r() * 40).toFixed(2);
    const inspectionsPct = +(r() * 30).toFixed(2);
    const rating = +(collisionsPct + convictionsPct + inspectionsPct).toFixed(2);
    const collisionsCount = Math.floor(r() * 14);
    const convictionsCount = Math.floor(r() * 25);
    const oosOverall = +(r() * 45).toFixed(2);
    const trucks = fleet;
    const onMiles = Math.floor(r() * 18_000_000) + 2_000_000;
    const canadaMiles = Math.floor(r() * 1_500_000) + 100_000;
    const totalCanadaMiles = onMiles + canadaMiles;
    const miMiles = Math.floor(r() * 4_000_000);
    const nyMiles = Math.floor(r() * 2_000_000);
    const paMiles = Math.floor(r() * 1_500_000);
    const ohMiles = Math.floor(r() * 1_500_000);
    const totalUSMiles = miMiles + nyMiles + paMiles + ohMiles;
    const totalMiles = totalCanadaMiles + totalUSMiles;
    const scaleMiles = (frac: number) => ({
        onMiles:           Math.floor(onMiles * frac),
        canadaMiles:       Math.floor(canadaMiles * frac),
        totalCanadaMiles:  Math.floor(totalCanadaMiles * frac),
        miMiles:           Math.floor(miMiles * frac),
        nyMiles:           Math.floor(nyMiles * frac),
        paMiles:           Math.floor(paMiles * frac),
        ohMiles:           Math.floor(ohMiles * frac),
        totalUSMiles:      Math.floor(totalUSMiles * frac),
        totalMiles:        Math.floor(totalMiles * frac),
    });

    return {
        id: dotNumber,
        cvor: cvorNumber,
        name: acct.legalName.toUpperCase(),
        address: `${acct.city || "—"}, ${acct.state}${acct.country === "CA" ? ", Canada" : ", USA"}`,
        vehicles: trucks,
        drivers,
        rating: pick(r, ["Satisfactory", "Conditional", "Not Rated"] as const),
        oosRates: {
            vehicle: { carrier: `${(r() * 50).toFixed(1)}%`, national: "23.2%" },
            driver:  { carrier: `${(r() * 12).toFixed(1)}%`, national: "6.4%" },
            hazmat:  { carrier: r() < 0.7 ? "N/A" : `${(r() * 10).toFixed(1)}%`, national: "4.4%" },
        },
        licensing: {
            property:  { active: "Yes", mc: `MC${dotNumber}` },
            passenger: { active: "No",  mc: "-" },
            household: { active: "No",  mc: "-" },
            broker:    { active: r() < 0.3 ? "Yes" : "No",  mc: r() < 0.3 ? `MC${dotNumber}B` : "-" },
        },
        basicStatus,
        cvorAnalysis: {
            rating,
            collisions:  { percentage: collisionsPct,  weight: 40 },
            convictions: { percentage: convictionsPct, weight: 40 },
            inspections: { percentage: inspectionsPct, weight: 20 },
            counts: {
                collisions:    collisionsCount,
                convictions:   convictionsCount,
                oosOverall,
                oosVehicle:   +(oosOverall * 1.2).toFixed(2),
                oosDriver:    +(oosOverall * 0.15).toFixed(2),
                trucks,
                onMiles,
                canadaMiles,
                totalCanadaMiles,
                miMiles, nyMiles, paMiles, ohMiles,
                totalUSMiles,
                totalMiles,
                milesByPeriod: {
                    "1M":  scaleMiles(0.04),
                    "3M":  scaleMiles(0.12),
                    "6M":  scaleMiles(0.25),
                    "12M": scaleMiles(0.50),
                    "24M": scaleMiles(1.00),
                },
                collisionPointsWithPoints: collisionsCount,
                collisionPointsWithoutPoints: 0,
                totalCollisionPoints: collisionsCount * 2,
                convictionPoints: convictionsCount * (1 + Math.floor(r() * 3)),
            },
            collisionDetails: {
                fromDate: "2024-01-27",
                toDate: "2026-01-26",
                monthsLabel: "24 Months",
                withPoints: collisionsCount + Math.floor(r() * 3),
                fatal: r() < 0.05 ? 1 : 0,
                personalInjury: Math.floor(r() * 4),
                propertyDamage: collisionsCount,
                notPointed: Math.floor(r() * 6),
                total: collisionsCount + Math.floor(r() * 8),
            },
            convictionDetails: {
                fromDate: "2024-01-27",
                toDate: "2026-01-26",
                monthsLabel: "24 Months",
                withPoints: convictionsCount,
                driver:  Math.floor(convictionsCount * 0.55),
                vehicle: Math.floor(convictionsCount * 0.25),
                load:    Math.floor(convictionsCount * 0.15),
                other:   Math.floor(convictionsCount * 0.05),
                notPointed: Math.floor(r() * 6),
                total: convictionsCount + Math.floor(r() * 8),
            },
        },
    };
}

// ── Inspection arrays (sliced subsets of Acme's data) ────────────────

/** Returns a deterministic per-carrier slice of the master inspection list.
 *  Different carriers see different subsets and different counts (12-95% of
 *  Acme's, depending on accountId). Acme returns the full array unchanged. */
export function getInspectionsFor(accountId: string): typeof ACME_INSPECTIONS {
    if (accountId === ACME_ID) return ACME_INSPECTIONS;
    const r = rng(`inspections:${accountId}`);
    const fraction = 0.12 + r() * 0.83;
    const len = Math.max(3, Math.floor(ACME_INSPECTIONS.length * fraction));
    // Deterministic shuffle by sort-key derived from RNG so each carrier sees
    // a different selection. Slice to `len`.
    const tagged = ACME_INSPECTIONS.map((insp, idx) => ({
        insp,
        key: rng(`inspections:${accountId}:${idx}`)(),
    }));
    tagged.sort((a, b) => a.key - b.key);
    return tagged.slice(0, len).map((t) => t.insp);
}

export function getCvorPeriodicReportsFor(accountId: string): typeof ACME_CVOR_PERIODIC_REPORTS {
    if (accountId === ACME_ID) return ACME_CVOR_PERIODIC_REPORTS;
    const r = rng(`cvorReports:${accountId}`);
    const len = Math.max(3, Math.floor(ACME_CVOR_PERIODIC_REPORTS.length * (0.4 + r() * 0.6)));
    return ACME_CVOR_PERIODIC_REPORTS.slice(0, len);
}

export function getCvorInterventionEventsFor(accountId: string): typeof ACME_CVOR_INTERVENTION_EVENTS {
    if (accountId === ACME_ID) return ACME_CVOR_INTERVENTION_EVENTS;
    const r = rng(`cvorEvents:${accountId}`);
    const fraction = 0.2 + r() * 0.8;
    const len = Math.max(3, Math.floor(ACME_CVOR_INTERVENTION_EVENTS.length * fraction));
    const tagged = ACME_CVOR_INTERVENTION_EVENTS.map((e, idx) => ({
        e,
        key: rng(`cvorEvents:${accountId}:${idx}`)(),
    }));
    tagged.sort((a, b) => a.key - b.key);
    return tagged.slice(0, len).map((t) => t.e);
}

export function getCvorTravelKmFor(accountId: string): typeof ACME_CVOR_TRAVEL_KM {
    if (accountId === ACME_ID) return ACME_CVOR_TRAVEL_KM;
    const r = rng(`cvorKm:${accountId}`);
    const len = Math.max(2, Math.floor(ACME_CVOR_TRAVEL_KM.length * (0.4 + r() * 0.6)));
    return ACME_CVOR_TRAVEL_KM.slice(0, len);
}

export function getCvorInterventionPeriodFor(accountId: string): typeof ACME_CVOR_INTERVENTION_PERIOD {
    // Period boundaries are universal — same 24-month sliding window per
    // CVOR program rules — so don't randomise. Returning the same constant
    // keeps the carrier's CVOR view consistent with regulatory expectations.
    void accountId;
    return ACME_CVOR_INTERVENTION_PERIOD;
}

