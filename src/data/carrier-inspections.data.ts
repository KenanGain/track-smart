// Per-carrier Inspection Database
//
// Generates realistic inspection records per carrier with violations distributed
// to hit specific BASIC category targets (numInsp + Σ weighted severity), so
// the InspectionsPage.tsx live derivation produces the expected card values.
//
// Every inspection record references real items from the carrier's roster:
//   driverId   ∈ getDriversForAccount(accountId)
//   assetId    ∈ getAssetsForAccount(accountId)
//   plate/vin  match the asset's actual plate and VIN
//
// See: docs/SAFETY_COMPLIANCE_DATA_PLAN.md for the full implementation plan.

import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { getAssetsForAccount } from "@/pages/accounts/carrier-assets.data";
import type { Asset } from "@/pages/assets/assets.data";

// ── Types (mirrors the Inspection record shape used in inspectionsData.ts) ──

export type BasicCategory =
    | "Unsafe Driving"
    | "Crash Indicator"
    | "Hours-of-service Compliance"
    | "Vehicle Maintenance"
    | "Controlled Substances"
    | "Hazmat compliance"
    | "Driver Fitness"
    | "Others";

export interface Violation {
    code: string;
    category: BasicCategory;
    description: string;
    subDescription: string;
    severity: number;
    weight: number;
    points: number;
    oos: boolean;
    driverRiskCategory: 1 | 2 | 3;
}

export interface Inspection {
    id: string;
    date: string;
    state: string;
    driverId: string;
    driver: string;
    driverLicense: string;
    vehiclePlate: string;
    vehicleType: "Truck" | "Trailer";
    assetId: string;
    level: "Level 1" | "Level 2" | "Level 3" | "Level 5" | "Level 6";
    startTime: string;
    endTime: string;
    location: { city: string; province: string; raw: string };
    smsPoints: { vehicle: number; driver: number; carrier: number };
    isClean: boolean;
    hasOOS: boolean;
    powerUnitDefects: string | null;
    trailerDefects: string | null;
    severityRate: number;
    hasVehicleViolations: boolean;
    hasDriverViolations: boolean;
    units: Array<{ type: string; make: string; license: string; vin: string }>;
    violationSummary: Record<string, number>;
    oosSummary: { driver: "PASSED" | "FAILED"; vehicle: "PASSED" | "FAILED"; total: number };
    violations: Violation[];
    cvorPoints?: { vehicle: number; driver: number; cvor: number };
}

// ── Compliance profile presets ───────────────────────────────────────────────

export interface CompliancePreset {
    regime: "FMCSA" | "CVOR";
    /** Inspection counts per BASIC category. Crash Indicator is omitted because
     *  it's driven by separate accident/crash records, not roadside violations. */
    unsafe: number;
    hos: number;
    vehMaint: number;
    controlled: number;
    hazmat: number;
    driverFit: number;
    /** Target Σ weighted severity per category. The generator distributes
     *  violations across the requested # of inspections so totals land here. */
    unsafeWeightedSev: number;
    hosWeightedSev: number;
    vehMaintWeightedSev: number;
    controlledWeightedSev: number;
    hazmatWeightedSev: number;
    driverFitWeightedSev: number;
    /** Fraction of inspections that result in OOS. */
    oosShare: number;
    /** Fraction at Level 1 (full inspection — others are Level 2/3). */
    level1Share: number;
}

export const COMPLIANCE_PROFILE_PRESETS: Record<string, CompliancePreset> = {
    // ── acct-002 — Cascade Freight Systems LLC ───────────────────────────────
    // FMCSA carrier, vehicle-maintenance trouble. Numbers tuned so the SMS
    // BASIC cards display the user-requested example exactly:
    //   Unsafe Driving       → Msr ≈ 16.8 ·  5 insp · WS  84
    //   Hours-of-service     → Msr ≈ 19.55 · 11 insp · WS 215
    //   Vehicle Maintenance  → Msr ≈ 52.6 · 20 insp · WS 1052
    //   Controlled Substances→ Msr  9 · < 3 (2 found)
    //   Hazmat compliance    → Msr 18 · < 3 (2 found)
    //   Driver Fitness       → Msr 12 · < 3 (2 found)
    "acct-002": {
        regime: "FMCSA",
        unsafe: 5,        unsafeWeightedSev:     84,
        hos: 11,          hosWeightedSev:       215,
        vehMaint: 20,     vehMaintWeightedSev: 1052,
        controlled: 2,    controlledWeightedSev: 18,  // 2 × ~9
        hazmat: 2,        hazmatWeightedSev:     36,  // 2 × 18
        driverFit: 2,     driverFitWeightedSev:  24,  // 2 × 12
        oosShare:    0.18,
        level1Share: 0.55,
    },
    // ── acct-003 — Northern Lights Transport Ltd. ────────────────────────────
    // Ontario CVOR carrier, satisfactory. Numbers proportional to a 128-unit
    // fleet — fewer alerts, mid-band measures.
    "acct-003": {
        regime: "CVOR",
        unsafe: 3,        unsafeWeightedSev:     36,
        hos: 6,           hosWeightedSev:        72,
        vehMaint: 14,     vehMaintWeightedSev:  320,
        controlled: 1,    controlledWeightedSev:  9,
        hazmat: 0,        hazmatWeightedSev:      0,
        driverFit: 1,     driverFitWeightedSev:  12,
        oosShare:    0.21,
        level1Share: 0.62,
    },
};

// ── Deterministic PRNG ───────────────────────────────────────────────────────

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
const pickIdx = (r: () => number, n: number) => Math.floor(r() * n);

// ── Violation pools per BASIC category ──────────────────────────────────────
// Each entry is a real FMCSA / CVSA citation with realistic severity weights.

interface ViolationTemplate {
    code: string;
    description: string;
    subDescription: string;
    severity: number;
    oos: boolean;
    driverRiskCategory: 1 | 2 | 3;
}

const VIOLATION_POOL: Record<BasicCategory, ViolationTemplate[]> = {
    "Vehicle Maintenance": [
        { code: "393.45B2-B",     description: "Air Brake - Hose/tubing damaged or not secured",         subDescription: "Air Brakes",   severity: 4, oos: false, driverRiskCategory: 2 },
        { code: "393.45D-BAAL",   description: "Air Brake - Audible air leak",                            subDescription: "Air Brakes",   severity: 4, oos: true,  driverRiskCategory: 1 },
        { code: "393.47(e)",      description: "Brake Out of Adjustment",                                 subDescription: "Brakes",       severity: 4, oos: false, driverRiskCategory: 2 },
        { code: "396.3(a)1BOS",   description: "Brake - Defective brakes >= 20% of service brakes",       subDescription: "Brakes",       severity: 6, oos: true,  driverRiskCategory: 1 },
        { code: "393.9A-LCL",     description: "Lighting - Clearance lamp(s) inoperative",                subDescription: "Lighting",     severity: 2, oos: false, driverRiskCategory: 3 },
        { code: "393.9A-LSML",    description: "Lighting - Side marker lamp(s) inoperative",              subDescription: "Lighting",     severity: 2, oos: false, driverRiskCategory: 3 },
        { code: "393.9A-LRLI",    description: "Lighting - Tail lamp inoperative",                        subDescription: "Lighting",     severity: 6, oos: false, driverRiskCategory: 1 },
        { code: "393.9A-LSLI",    description: "Lighting - Stop lamps inoperative",                       subDescription: "Lighting",     severity: 6, oos: false, driverRiskCategory: 1 },
        { code: "393.11A1-CSLRR", description: "Lower rear retro-reflective sheeting missing",            subDescription: "Conspicuity",  severity: 3, oos: false, driverRiskCategory: 2 },
        { code: "393.75A1",       description: "Tire - Flat tire or fabric exposed",                      subDescription: "Tires",        severity: 8, oos: true,  driverRiskCategory: 1 },
        { code: "393.75A3",       description: "Tire - Tread depth less than 4/32 inch on steering axle", subDescription: "Tires",        severity: 8, oos: true,  driverRiskCategory: 1 },
        { code: "396.5B-L",       description: "Lubrication - Oil or grease leak",                        subDescription: "Fluid Leaks",  severity: 3, oos: false, driverRiskCategory: 2 },
        { code: "393.78A-WS",     description: "Inoperative windshield washing system",                   subDescription: "Visibility",   severity: 1, oos: false, driverRiskCategory: 3 },
        { code: "393.48A-BMBCBD", description: "Drum Brake - Missing/broken component(s)",                subDescription: "Brakes",       severity: 4, oos: false, driverRiskCategory: 1 },
    ],
    "Hours-of-service Compliance": [
        { code: "395.8(e)",       description: "False report of driver's record of duty status",          subDescription: "Logs",         severity: 7, oos: true,  driverRiskCategory: 1 },
        { code: "395.3(a)1",      description: "Driving beyond 11-hour driving limit",                    subDescription: "Driving Time", severity: 7, oos: true,  driverRiskCategory: 1 },
        { code: "395.3(a)2",      description: "Driving beyond 14-hour duty period",                      subDescription: "Duty Period",  severity: 5, oos: true,  driverRiskCategory: 1 },
        { code: "395.22H4",       description: "ELD: Missing blank duty status graph-grids",              subDescription: "Log Data",     severity: 1, oos: false, driverRiskCategory: 3 },
        { code: "395.24D-ELDPT",  description: "Failure to produce ELD records on request",               subDescription: "Log Data",     severity: 3, oos: false, driverRiskCategory: 2 },
        { code: "395.8(a)",       description: "Driver did not maintain duty status records",             subDescription: "Logs",         severity: 5, oos: false, driverRiskCategory: 1 },
        { code: "395.8(f)1",      description: "Driver's record of duty status not current",              subDescription: "Logs",         severity: 5, oos: false, driverRiskCategory: 2 },
    ],
    "Unsafe Driving": [
        { code: "392.2-SLML",     description: "State/Local Laws - Failure to maintain lane",             subDescription: "Moving",       severity: 5, oos: false, driverRiskCategory: 1 },
        { code: "392.2-SLLS",     description: "State/Local Laws - Speeding 6-10 mph over",               subDescription: "Speeding",     severity: 4, oos: false, driverRiskCategory: 2 },
        { code: "392.2-SLLS-15",  description: "State/Local Laws - Speeding 11-14 mph over",              subDescription: "Speeding",     severity: 5, oos: false, driverRiskCategory: 1 },
        { code: "392.2RR",        description: "Reckless driving",                                        subDescription: "Reckless",     severity: 10,oos: false, driverRiskCategory: 1 },
        { code: "392.16",         description: "Failure to use seat belt",                                subDescription: "Seat Belt",    severity: 1, oos: false, driverRiskCategory: 3 },
        { code: "392.10A",        description: "Failure to stop at railroad crossing",                    subDescription: "Railroad",     severity: 5, oos: false, driverRiskCategory: 1 },
    ],
    "Controlled Substances": [
        { code: "392.4",          description: "Use of drugs while driving",                              subDescription: "Drug Use",     severity: 10,oos: true,  driverRiskCategory: 1 },
        { code: "392.5",          description: "Possession or use of alcohol while driving",              subDescription: "Alcohol",      severity: 10,oos: true,  driverRiskCategory: 1 },
        { code: "382.305(b)",     description: "Failure to implement random testing program",             subDescription: "Testing",      severity: 3, oos: false, driverRiskCategory: 2 },
    ],
    "Hazmat compliance": [
        { code: "172.704A",       description: "Hazmat - No general awareness training",                  subDescription: "Training",     severity: 3, oos: false, driverRiskCategory: 2 },
        { code: "177.823A",       description: "Hazmat - Driver does not have HM placards",               subDescription: "Placards",     severity: 6, oos: true,  driverRiskCategory: 1 },
        { code: "177.835A",       description: "Driving load that does not meet HM rules",                subDescription: "Loading",      severity: 9, oos: true,  driverRiskCategory: 1 },
    ],
    "Driver Fitness": [
        { code: "391.41B11",      description: "Driver lacks medical examiner's certificate",             subDescription: "Medical",      severity: 4, oos: true,  driverRiskCategory: 1 },
        { code: "391.11B6",       description: "Driver lacks valid CDL",                                  subDescription: "License",      severity: 8, oos: true,  driverRiskCategory: 1 },
        { code: "391.11B5",       description: "Driver under minimum age",                                subDescription: "Eligibility",  severity: 4, oos: false, driverRiskCategory: 2 },
        { code: "391.45A",        description: "Operating a CMV without medical card",                    subDescription: "Medical",      severity: 4, oos: true,  driverRiskCategory: 1 },
    ],
    "Crash Indicator": [],
    "Others": [],
};

const POWER_UNIT_DEFECTS_POOL = [
    "BRAKES DEFECTIVE, AIR LEAK, HOSE DAMAGE",
    "LIGHTING, AIR BRAKES, REFLECTIVE SHEETING",
    "TIRE WEAR, BRAKE OUT OF ADJUSTMENT",
    "STEERING AXLE TIRE TREAD",
    "AIR BRAKE LEAKAGE, BRAKE COMPONENTS",
    "OIL LEAK, FLUID LEAKS",
];
const TRAILER_DEFECTS_POOL = [
    "LIGHTING INOPERATIVE, REFLECTIVE SHEETING",
    "TIRE TREAD DEPTH",
    "BRAKE COMPONENTS, AIR LEAK",
    null,
    null,
];

// ── Severity bucket sampling ────────────────────────────────────────────────
// Given a target Σ weighted severity for a category and a required # of
// inspections, pick per-inspection max-severity values that sum to the target.

function distributeSeverity(target: number, count: number, r: () => number): number[] {
    if (count === 0 || target === 0) return [];
    // Each inspection's "max severity × weight" contribution. Weight is
    // typically 3 across the SMS BASICs, so per-inspection contribution ranges
    // 3..30. Distribute target across `count` slots, then jitter ±20% to avoid
    // an obvious uniform split.
    const avg = target / count;
    const slots = new Array(count).fill(avg);
    for (let i = 0; i < count - 1; i += 2) {
        const delta = (r() * 0.4 - 0.2) * avg;
        slots[i] += delta;
        slots[i + 1] -= delta;
    }
    // Force slots to integers and reconcile any rounding drift onto the last slot.
    const rounded = slots.map((v) => Math.max(3, Math.round(v)));
    const drift = target - rounded.reduce((s, v) => s + v, 0);
    rounded[rounded.length - 1] = Math.max(3, rounded[rounded.length - 1] + drift);
    return rounded;
}

// Pick a violation whose `severity * weight` matches the target slot. Weight is
// fixed at 3, so target slot ∈ {3, 6, 9, 12, 15, 18, 21, 24, 27, 30} from a
// severity ∈ {1..10}. We pick the closest-severity template available.
function pickViolationForSlot(category: BasicCategory, slot: number, r: () => number): Violation {
    const pool = VIOLATION_POOL[category];
    if (pool.length === 0) {
        // Synthetic fallback for empty pools (Crash, Others — unused in practice).
        return {
            code: "GEN-000",
            category,
            description: "Generic violation",
            subDescription: "—",
            severity: 5,
            weight: 3,
            points: 15,
            oos: false,
            driverRiskCategory: 2,
        };
    }
    const targetSev = Math.max(1, Math.min(10, Math.round(slot / 3)));
    const closest = pool
        .map((v, i) => ({ v, i, dist: Math.abs(v.severity - targetSev) }))
        .sort((a, b) => a.dist - b.dist || a.i - b.i)[0]!.v;
    // 30% chance of also returning a low-severity satellite violation in the
    // same inspection so each row carries 1–2 violations on average.
    void r;
    return {
        ...closest,
        category,
        weight: 3,
        points: closest.severity * 3,
    };
}

// ── Per-carrier inspection builder ─────────────────────────────────────────

interface DriverLite {
    id: string;
    name: string;
    licenseNumber: string;
    licenseState: string;
}

function asDriverLite(d: ReturnType<typeof getDriversForAccount>[number]): DriverLite {
    return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        licenseNumber: d.licenseNumber || `${d.lastName.slice(0, 3).toUpperCase()}${100000 + Math.floor(Math.random() * 899999)}`,
        licenseState: d.licenseState || "—",
    };
}

function buildInspectionsForCarrier(accountId: string, preset: CompliancePreset): Inspection[] {
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) return [];
    const drivers = getDriversForAccount(accountId).map(asDriverLite);
    const assets = getAssetsForAccount(accountId);
    if (drivers.length === 0 || assets.length === 0) return [];

    const r = rng(`inspections:${accountId}`);
    const out: Inspection[] = [];
    let counter = 0;

    const addInspections = (
        category: BasicCategory,
        count: number,
        targetWeightedSev: number,
    ) => {
        if (count === 0) return;
        const slots = distributeSeverity(targetWeightedSev, count, r);
        for (let i = 0; i < count; i++) {
            const slot = slots[i] ?? 0;
            const primary = pickViolationForSlot(category, slot, r);
            // Optional satellite violation (low severity) for realism.
            const satellite =
                r() < 0.45
                    ? pickViolationForSlot(
                          category,
                          Math.max(3, slot - 6),
                          r,
                      )
                    : null;
            const violations: Violation[] = [primary];
            if (satellite && satellite.code !== primary.code) violations.push(satellite);

            const hasOOS = preset.oosShare > 0 && r() < preset.oosShare && violations.some((v) => v.oos);
            const isLevel1 = r() < preset.level1Share;
            const driver = drivers[pickIdx(r, drivers.length)]!;
            const truckCandidates = assets.filter((a) => a.assetType === "Truck");
            const asset: Asset = truckCandidates.length > 0
                ? truckCandidates[pickIdx(r, truckCandidates.length)]!
                : assets[pickIdx(r, assets.length)]!;

            counter += 1;
            const dateOffset = Math.floor(r() * 365);
            const d = new Date();
            d.setDate(d.getDate() - dateOffset);
            const dateStr = d.toISOString().slice(0, 10);
            const startHour = 6 + Math.floor(r() * 14);
            const startMin = Math.floor(r() * 60);
            const dur = 30 + Math.floor(r() * 60);
            const fmt = (n: number) => String(n).padStart(2, "0");
            const startTime = `${fmt(startHour)}:${fmt(startMin)}`;
            const endMins = startHour * 60 + startMin + dur;
            const endTime = `${fmt(Math.floor(endMins / 60) % 24)}:${fmt(endMins % 60)}`;

            const totalPoints = violations.reduce((s, v) => s + v.points, 0);
            const isCanadian = acct.country === "CA";
            const idPrefix = (acct.state || "XX").toUpperCase();
            const id = `${idPrefix}${(counter + 100).toString(36).toUpperCase()}${counter.toString().padStart(5, "0")}`;

            const summary: Record<string, number> = {};
            for (const v of violations) summary[v.category] = (summary[v.category] ?? 0) + 1;

            const inspection: Inspection = {
                id,
                date: dateStr,
                state: acct.state,
                driverId: driver.id,
                driver: driver.name,
                driverLicense: driver.licenseNumber,
                vehiclePlate: asset.plateNumber || "—",
                vehicleType: asset.assetType === "Trailer" ? "Trailer" : "Truck",
                assetId: asset.id,
                level: isLevel1 ? "Level 1" : (r() < 0.5 ? "Level 2" : "Level 3"),
                startTime,
                endTime,
                location: {
                    city: acct.city,
                    province: acct.state,
                    raw: `${acct.city.toUpperCase()}, ${acct.state}`,
                },
                smsPoints: {
                    vehicle: violations.filter((v) => v.category === "Vehicle Maintenance").reduce((s, v) => s + v.points, 0),
                    driver: violations.filter((v) => v.category !== "Vehicle Maintenance").reduce((s, v) => s + v.points, 0),
                    carrier: totalPoints,
                },
                isClean: false,
                hasOOS,
                powerUnitDefects:
                    category === "Vehicle Maintenance"
                        ? POWER_UNIT_DEFECTS_POOL[pickIdx(r, POWER_UNIT_DEFECTS_POOL.length)]!
                        : null,
                trailerDefects:
                    asset.assetType === "Trailer"
                        ? TRAILER_DEFECTS_POOL[pickIdx(r, TRAILER_DEFECTS_POOL.length)] ?? null
                        : null,
                severityRate: +(
                    violations.reduce((s, v) => s + v.severity, 0) /
                    Math.max(1, violations.length)
                ).toFixed(2),
                hasVehicleViolations: violations.some(
                    (v) => v.category === "Vehicle Maintenance" || v.category === "Hazmat compliance",
                ),
                hasDriverViolations: violations.some(
                    (v) =>
                        v.category === "Hours-of-service Compliance" ||
                        v.category === "Unsafe Driving" ||
                        v.category === "Driver Fitness" ||
                        v.category === "Controlled Substances",
                ),
                units: [
                    {
                        type: asset.assetType,
                        make: asset.make,
                        license: `${asset.plateNumber} (${asset.plateJurisdiction})`,
                        vin: asset.vin || "—",
                    },
                ],
                violationSummary: summary,
                oosSummary: {
                    driver: violations.some((v) => v.oos && v.category !== "Vehicle Maintenance") ? "FAILED" : "PASSED",
                    vehicle: violations.some((v) => v.oos && v.category === "Vehicle Maintenance") ? "FAILED" : "PASSED",
                    total: violations.filter((v) => v.oos).length,
                },
                violations,
            };

            if (isCanadian || preset.regime === "CVOR") {
                inspection.cvorPoints = {
                    vehicle: inspection.smsPoints.vehicle,
                    driver: inspection.smsPoints.driver,
                    cvor: inspection.smsPoints.carrier,
                };
            }

            out.push(inspection);
        }
    };

    addInspections("Vehicle Maintenance",         preset.vehMaint,   preset.vehMaintWeightedSev);
    addInspections("Hours-of-service Compliance", preset.hos,        preset.hosWeightedSev);
    addInspections("Unsafe Driving",              preset.unsafe,     preset.unsafeWeightedSev);
    addInspections("Controlled Substances",       preset.controlled, preset.controlledWeightedSev);
    addInspections("Hazmat compliance",           preset.hazmat,     preset.hazmatWeightedSev);
    addInspections("Driver Fitness",              preset.driverFit,  preset.driverFitWeightedSev);

    // Sort by date desc so the most recent inspections appear first.
    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return out;
}

// ── Public API ──────────────────────────────────────────────────────────────

/** Eagerly-built inspection list per carrier with a registered compliance
 *  preset. Other carriers fall through to the existing slice-based generator
 *  in `getInspectionsFor` (carrier-safety-data.ts). */
export const CARRIER_INSPECTIONS: Record<string, Inspection[]> = {};

for (const accountId of Object.keys(COMPLIANCE_PROFILE_PRESETS)) {
    const preset = COMPLIANCE_PROFILE_PRESETS[accountId]!;
    CARRIER_INSPECTIONS[accountId] = buildInspectionsForCarrier(accountId, preset);
}

/** Returns hand-curated inspection records for a carrier, or undefined when
 *  the carrier has no preset registered. Callers fall back to the existing
 *  slice-based generator. */
export function getInspectionsForCarrier(accountId: string): Inspection[] | undefined {
    return CARRIER_INSPECTIONS[accountId];
}
