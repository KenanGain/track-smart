// Per-carrier safety & compliance enrollment registry.
//
// Every carrier in ACCOUNTS_DB has zero or more of the three compliance
// regimes enrolled: FMCSA (US DOT), CVOR (Ontario), and NSC (Canadian
// National Safety Code). Each enrollment carries:
//   - hasData: whether this carrier has a backing safety/compliance data file
//               for that regime. If false, the panel is hidden entirely.
//   - enabled: whether the user has the regime currently switched on. If
//               hasData=true and enabled=false, the panel renders greyed-out
//               with a "Not Enrolled" badge so the user can see what would
//               appear if they re-enabled it.
//   - number:  the carrier's registration number for that regime.
//
// NSC is multi-jurisdiction: a single carrier can be enrolled in BC + ON +
// NS at the same time (cross-province operations).
//
// The defaults below are seeded from each carrier's address (country/state)
// using a deterministic hash so the same accountId always gets the same
// initial enrollment combo. Acme Trucking (acct-001) is hard-coded with
// FMCSA + CVOR enabled because the existing safety/compliance mock data
// lives under Acme — keep it stable.
//
// Runtime mutations (the Configure modal) write into localStorage; reads
// merge the override on top of the seeded defaults. See `getCarrierCompliance`
// and `setCarrierCompliance` in `useCarrierCompliance.ts`.

import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";

// ── Types ────────────────────────────────────────────────────────────

export type NscJurisdiction =
    | "BC" | "AB" | "ON" | "NS" | "QC"
    | "MB" | "SK" | "NB" | "PE" | "NL"
    | "NT" | "YT" | "NU";

export const NSC_JURISDICTION_LABEL: Record<NscJurisdiction, string> = {
    BC: "British Columbia",
    AB: "Alberta",
    ON: "Ontario",
    NS: "Nova Scotia",
    QC: "Quebec",
    MB: "Manitoba",
    SK: "Saskatchewan",
    NB: "New Brunswick",
    PE: "Prince Edward Island",
    NL: "Newfoundland and Labrador",
    NT: "Northwest Territories",
    YT: "Yukon",
    NU: "Nunavut",
};

export const NSC_JURISDICTIONS: NscJurisdiction[] = [
    "BC", "AB", "ON", "NS", "QC", "MB", "SK", "NB", "PE", "NL", "NT", "YT", "NU",
];

export interface FmcsaEnrollment {
    hasData: boolean;
    enabled: boolean;
    /** US DOT number, e.g. "1234567". */
    usdot: string;
}

export interface CvorEnrollment {
    hasData: boolean;
    enabled: boolean;
    /** Ontario CVOR #, e.g. "CVOR-41289". */
    number: string;
}

export interface NscJurisdictionEnrollment {
    jurisdiction: NscJurisdiction;
    hasData: boolean;
    enabled: boolean;
    /** NSC carrier #, format varies by province. */
    number: string;
}

export interface CarrierCompliance {
    accountId: string;
    fmcsa: FmcsaEnrollment;
    cvor: CvorEnrollment;
    /** Zero or more NSC enrollments — one entry per province the carrier
     *  operates under. Carriers that operate exclusively under FMCSA / CVOR
     *  carry an empty array. */
    nsc: NscJurisdictionEnrollment[];
    /** Audit fields — set by the Configure modal. */
    lastEditedBy?: string;
    lastEditedAt?: string;
}

// ── Deterministic helpers ────────────────────────────────────────────

/** Tiny hash → 32-bit unsigned. */
function hash(s: string): number {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
        h = (h ^ s.charCodeAt(i)) >>> 0;
        h = Math.imul(h, 16777619) >>> 0;
    }
    return h;
}

/** Mulberry32 PRNG seeded from a string. Same seed → same sequence. */
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

/** Format a fake USDOT, CVOR, or NSC # deterministically from accountId. */
function fakeUsdot(seed: string): string {
    const r = rng(`${seed}:usdot`);
    return String(1_000_000 + Math.floor(r() * 8_999_999));
}
function fakeCvor(seed: string): string {
    const r = rng(`${seed}:cvor`);
    return `CVOR-${10_000 + Math.floor(r() * 89_999)}`;
}
function fakeNsc(seed: string, jur: NscJurisdiction): string {
    const r = rng(`${seed}:nsc:${jur}`);
    return `${jur}-${10_000 + Math.floor(r() * 89_999)}`;
}

// Map a state/province code to its NSC home jurisdiction (Canadian only).
const PROVINCE_TO_NSC: Partial<Record<string, NscJurisdiction>> = {
    BC: "BC", AB: "AB", ON: "ON", NS: "NS", QC: "QC",
    MB: "MB", SK: "SK", NB: "NB", PE: "PE", NL: "NL",
    NT: "NT", YT: "YT", NU: "NU",
};

// ── Default builder ──────────────────────────────────────────────────

/**
 * Build the default compliance record for a carrier given its country +
 * state. Uses deterministic randomization so the same accountId always
 * gets the same initial combo across reloads.
 *
 * Special case: acct-001 (Acme Trucking Inc.) is hard-coded with FMCSA +
 * CVOR enabled because the existing safety mock data lives under that
 * carrier. NSC stays unenrolled by default for Acme — they can add it via
 * Configure.
 */
export function buildDefaultCompliance(accountId: string): CarrierCompliance {
    const acct = ACCOUNTS_DB.find((a) => a.id === accountId);
    if (!acct) {
        // Unknown carrier — return an empty record.
        return {
            accountId,
            fmcsa: { hasData: false, enabled: false, usdot: "" },
            cvor:  { hasData: false, enabled: false, number: "" },
            nsc:   [],
        };
    }

    // Acme Trucking — preserve existing safety data attachment. All six
    // Safety & Compliance tabs in InspectionsPage have backing mock data
    // for Acme (FMCSA SMS, Ontario CVOR, plus NSC profiles for AB, BC, PE,
    // NS), so every regime is enrolled and enabled by default.
    if (accountId === "acct-001") {
        return {
            accountId,
            fmcsa: { hasData: true, enabled: true, usdot: acct.dotNumber || "1234567" },
            cvor:  { hasData: true, enabled: true, number: "CVOR-41289" },
            nsc: [
                { jurisdiction: "AB", hasData: true, enabled: true, number: "AB-55410" },
                { jurisdiction: "BC", hasData: true, enabled: true, number: "BC-202-422-480" },
                { jurisdiction: "PE", hasData: true, enabled: true, number: "PE-072022" },
                { jurisdiction: "NS", hasData: true, enabled: true, number: "ZZZZZ728361002" },
            ],
        };
    }

    const r = rng(accountId);
    const isCanadian = acct.country === "CA";
    const isOntario  = isCanadian && acct.state === "ON";
    const homeNsc    = PROVINCE_TO_NSC[acct.state.toUpperCase()];

    // Realistic enrollment matrix:
    //   US carrier            → always FMCSA. ~25% also CVOR (cross-border).
    //   Ontario carrier       → always CVOR. ~70% also NSC ON. ~30% also FMCSA.
    //   Other Canadian carrier → always NSC matching province. ~40% also FMCSA.
    //                            ~10% also CVOR.
    let fmcsaEnabled = false;
    let cvorEnabled  = false;
    const nscEntries: NscJurisdictionEnrollment[] = [];

    if (!isCanadian) {
        fmcsaEnabled = true;
        cvorEnabled  = r() < 0.25;
    } else if (isOntario) {
        cvorEnabled  = true;
        fmcsaEnabled = r() < 0.30;
        if (r() < 0.70) {
            nscEntries.push({
                jurisdiction: "ON",
                hasData: true,
                enabled: true,
                number: fakeNsc(accountId, "ON"),
            });
        }
    } else if (homeNsc) {
        nscEntries.push({
            jurisdiction: homeNsc,
            hasData: true,
            enabled: true,
            number: fakeNsc(accountId, homeNsc),
        });
        fmcsaEnabled = r() < 0.40;
        cvorEnabled  = r() < 0.10;
    }

    // ~10% of all carriers also operate under a *second* NSC jurisdiction
    // (cross-province ops). Pick a random different province.
    if (isCanadian && r() < 0.20) {
        const others = NSC_JURISDICTIONS.filter(
            (j) => !nscEntries.some((e) => e.jurisdiction === j)
        );
        const pick = others[Math.floor(r() * others.length)];
        if (pick) {
            nscEntries.push({
                jurisdiction: pick,
                hasData: true,
                enabled: true,
                number: fakeNsc(accountId, pick),
            });
        }
    }

    return {
        accountId,
        fmcsa: {
            hasData: fmcsaEnabled,
            enabled: fmcsaEnabled,
            usdot: fmcsaEnabled ? (acct.dotNumber || fakeUsdot(accountId)) : "",
        },
        cvor: {
            hasData: cvorEnabled,
            enabled: cvorEnabled,
            number: cvorEnabled ? (acct.cvorNumber || fakeCvor(accountId)) : "",
        },
        nsc: nscEntries,
    };
}

/** Pre-computed defaults for every carrier in ACCOUNTS_DB. */
export const DEFAULT_CARRIER_COMPLIANCE: Record<string, CarrierCompliance> =
    Object.fromEntries(
        ACCOUNTS_DB.map((a) => [a.id, buildDefaultCompliance(a.id)])
    );

/** Returns true when the carrier has at least one enrolled-and-enabled regime. */
export function hasAnyEnabledRegime(c: CarrierCompliance): boolean {
    return (
        c.fmcsa.enabled
        || c.cvor.enabled
        || c.nsc.some((n) => n.enabled)
    );
}

/** Returns true when the carrier has at least one regime with backing data
 *  (regardless of toggle state). Used to decide whether to render the
 *  greyed-out "Not Enrolled" placeholder vs. hide the section entirely. */
export function hasAnyData(c: CarrierCompliance): boolean {
    return (
        c.fmcsa.hasData
        || c.cvor.hasData
        || c.nsc.some((n) => n.hasData)
    );
}
