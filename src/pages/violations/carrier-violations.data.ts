// Per-carrier Violations (deterministic mock data)
//
// For every carrier in `ACCOUNTS_DB` (other than the demo Acme account, which
// keeps the hand-curated MOCK_VIOLATION_RECORDS verbatim) this file
// synthesises violation records keyed to that carrier's drivers, assets, and
// home jurisdiction. Records use the existing `ViolationRecord` shape
// (schema is NOT changed) plus an `accountId` carried as a sibling so the
// ViolationsListPage can filter by the active carrier-profile selection.
//
// Mirrors the carrier-accidents.data.ts pattern.
//
// IMPORTANT: This file is a *new* data source — it does not modify the
// `ViolationRecord` schema. The existing global MOCK_VIOLATION_RECORDS are
// still exported and remain wired to the Acme demo account.

import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-fleet.data";
import { hash, mulberry32, pick } from "@/pages/accounts/carrier-fleet-shared.data";
import { ALL_VIOLATIONS, MOCK_VIOLATION_RECORDS, type ViolationRecord } from "./violations-list.data";

/** Adds an `accountId` to the existing ViolationRecord shape — no schema change. */
export interface CarrierViolationRecord extends ViolationRecord {
    accountId: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const RESULTS: ViolationRecord["result"][] = [
    "Citation Issued", "Warning", "OOS Order", "Citation Issued", "Citation Issued",
];

const STATUS_OPTIONS: ViolationRecord["status"][] = [
    "Open", "Closed", "Closed", "Closed", "Under Review",
];

function isoDateOffset(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}

function isoTime(hour: number, minute: number): string {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function calcExperience(hiredDate: string | undefined): string {
    if (!hiredDate) return "1 Year";
    const years = Math.floor((Date.now() - new Date(hiredDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return years <= 0 ? "< 1 Year" : `${years} Year${years === 1 ? "" : "s"}`;
}

function convictionDateAfter(violationDate: string, r: () => number): string {
    // Convictions land roughly 30–120 days after the violation date.
    const d = new Date(`${violationDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30 + Math.floor(r() * 90));
    return d.toISOString().slice(0, 10);
}

// ── Builder ────────────────────────────────────────────────────────────────

// ── Cross-border jurisdiction pools — every carrier sees a mix of US states
// (FMCSA SMS), Ontario (CVOR), and other Canadian provinces (NSC) so the
// list always reflects the full spectrum of regulator data.
const US_STATES = ["TX", "GA", "AZ", "IL", "NC", "TN", "IN", "MO", "UT", "CO", "FL", "OH", "CA", "NY", "PA", "MI"];
const ON_STATE  = "ON";
const NSC_STATES = ["AB", "BC", "MB", "NB", "NL", "NS", "PE", "QC", "SK"];

const US_CITIES_BY_STATE: Record<string, string[]> = {
    TX: ["Dallas", "Houston", "Austin"], GA: ["Atlanta", "Savannah"], AZ: ["Phoenix", "Tucson"],
    IL: ["Chicago", "Springfield"], NC: ["Charlotte", "Raleigh"], TN: ["Memphis", "Nashville"],
    IN: ["Indianapolis", "Fort Wayne"], MO: ["St. Louis", "Kansas City"], UT: ["Salt Lake City"],
    CO: ["Denver", "Aurora"], FL: ["Miami", "Jacksonville"], OH: ["Columbus", "Cleveland"],
    CA: ["Los Angeles", "Sacramento"], NY: ["Buffalo", "Albany"], PA: ["Philadelphia", "Pittsburgh"],
    MI: ["Detroit", "Lansing"], DE: ["Wilmington", "Dover"], OR: ["Portland", "Salem"],
};
const ON_CITIES = ["Toronto", "Mississauga", "Hamilton", "Ottawa", "London", "Windsor"];
const NSC_CITIES_BY_STATE: Record<string, string[]> = {
    AB: ["Calgary", "Edmonton", "Red Deer"], BC: ["Vancouver", "Surrey", "Kelowna"],
    MB: ["Winnipeg", "Brandon"], NB: ["Moncton", "Saint John"], NL: ["St. John's"],
    NS: ["Halifax", "Sydney"], PE: ["Charlottetown", "Summerside"],
    QC: ["Montreal", "Quebec City"], SK: ["Saskatoon", "Regina"],
};

/** Decide the (state, country) pair for a synthesized violation so every
 *  carrier ends up with a mix of FMCSA SMS, CVOR, and NSC records. */
function pickJurisdiction(account: AccountRecord, r: () => number): { state: string; country: "CA" | "US"; city: string } {
    const isHomeCanada = account.country === "CA";

    // Distribution (approx):
    //   45% — carrier's home jurisdiction
    //   25% — other CVOR (Ontario)
    //   20% — other NSC provinces
    //   10% — US FMCSA states
    // Mirror-flipped for US carriers so they too see CVOR / NSC entries.
    const roll = r();

    if (isHomeCanada) {
        if (roll < 0.45) {
            const state = account.state;
            const cities = state === "ON" ? ON_CITIES : (NSC_CITIES_BY_STATE[state] ?? ["Unknown"]);
            return { state, country: "CA", city: pick(r, cities) };
        }
        if (roll < 0.65) {
            return { state: ON_STATE, country: "CA", city: pick(r, ON_CITIES) };
        }
        if (roll < 0.90) {
            const state = pick(r, NSC_STATES.filter(s => s !== account.state));
            return { state, country: "CA", city: pick(r, NSC_CITIES_BY_STATE[state] ?? ["Unknown"]) };
        }
        const state = pick(r, US_STATES);
        return { state, country: "US", city: pick(r, US_CITIES_BY_STATE[state] ?? ["Unknown"]) };
    }

    // US carrier — sees SMS at home + cross-border CVOR/NSC.
    if (roll < 0.45) {
        const state = account.state;
        return { state, country: "US", city: pick(r, US_CITIES_BY_STATE[state] ?? ["Unknown"]) };
    }
    if (roll < 0.70) {
        return { state: ON_STATE, country: "CA", city: pick(r, ON_CITIES) };
    }
    if (roll < 0.85) {
        const state = pick(r, NSC_STATES);
        return { state, country: "CA", city: pick(r, NSC_CITIES_BY_STATE[state] ?? ["Unknown"]) };
    }
    const state = pick(r, US_STATES.filter(s => s !== account.state));
    return { state, country: "US", city: pick(r, US_CITIES_BY_STATE[state] ?? ["Unknown"]) };
}

function buildForCarrier(account: AccountRecord, countOverride?: number): CarrierViolationRecord[] {
    const r = mulberry32(hash(`violations:${account.id}`));
    const drivers = CARRIER_DRIVERS[account.id] ?? [];
    const assets  = CARRIER_ASSETS[account.id] ?? [];
    if (drivers.length === 0 || ALL_VIOLATIONS.length === 0) return [];

    // 10–24 violations per carrier so the FMCSA / CVOR / NSC mix is always
    // visibly present. (Was 4–14 — too few to surface all three sources.)
    const baseCount = countOverride
        ?? Math.max(10, Math.min(24, Math.floor(drivers.length / 4) + 10));
    const out: CarrierViolationRecord[] = [];

    for (let i = 0; i < baseCount; i++) {
        const driver = pick(r, drivers);
        const asset  = assets.length ? pick(r, assets) : undefined;
        const v      = pick(r, ALL_VIOLATIONS);

        const daysAgo = 14 + Math.floor(r() * 700); // last ~2 years
        const date = isoDateOffset(daysAgo);
        const hour = 6 + Math.floor(r() * 16);
        const minute = Math.floor(r() * 59);

        const result = pick(r, RESULTS);
        const status = pick(r, STATUS_OPTIONS);
        const isOos = result === "OOS Order" || v.isOos;

        const { state, country, city } = pickJurisdiction(account, r);
        const isCanada = country === "CA";

        const fineAmount = result === "Citation Issued" ? (100 + Math.floor(r() * 800))
            : result === "OOS Order" ? 0
            : 0;

        const driverName = (driver as any).name ?? `${(driver as any).firstName ?? ""} ${(driver as any).lastName ?? ""}`.trim();

        // ── Derive source-specific paperwork fields from the violation
        // master chart. For US records the USA CFR codes apply; for Canadian
        // records the canadaEnforcement block (Act / section / CCMTA NAT
        // code / conviction descriptions) applies. Issuing agency mirrors
        // what the carrier's home regulator would file under.
        const usaCode  = v.regulatoryCodes?.usa?.[0];
        const caCode   = v.regulatoryCodes?.canada?.[0];
        const ce       = v.canadaEnforcement;
        const isOntario = state === "ON";

        const actSection = isCanada
            ? (ce ? `${ce.act} s.${ce.section}` : (caCode?.reference?.[0] || v.violationCode))
            : (usaCode?.cfr?.[0] || `49 CFR §${v.violationCode}`);

        const natCode = isCanada ? (ce?.ccmtaCode || v.violationCode) : "";

        const issuingAgency = isCanada
            ? (isOntario
                ? "Ontario MTO — Carrier Enforcement"
                : `${state} Highway Safety — NSC Enforcement`)
            : `${state} State Patrol — Roadside Inspection`;

        const charge = ce?.descriptions?.conviction
            || ce?.descriptions?.full
            || v.violationDescription;

        const offence = ce?.descriptions?.full || v.violationDescription;

        out.push({
            id: `V-${account.id.toUpperCase().replace("ACCT-", "C")}-${String(i + 1).padStart(3, "0")}`,
            date,
            time: isoTime(hour, minute),
            driverId: driver.id,
            driverName,
            driverType: (driver as any).driverType || "Long Haul Driver",
            driverExperience: calcExperience((driver as any).hiredDate),
            assetId: asset?.id,
            assetName: asset?.unitNumber,
            locationState: state,
            locationCity: city,
            locationStreet: `I-${1 + Math.floor(r() * 99)} Mile Marker ${Math.floor(r() * 300)}`,
            locationZip: isCanada
                ? `${pick(r, ["L","M","K","T","V","B","C"])}${Math.floor(r() * 9)}${pick(r, ["A","B","C"])} ${Math.floor(r() * 9)}${pick(r, ["A","B","C"])}${Math.floor(r() * 9)}`
                : String(10000 + Math.floor(r() * 89999)),
            locationCountry: isCanada ? "CA" : "US",
            violationCode: v.violationCode,
            violationDataId: v.id,
            violationType: v.violationDescription,
            violationGroup: v.violationGroup,
            crashLikelihood: Math.min(v.crashLikelihoodPercent ?? 0, 100),
            driverRiskCategory: v.driverRiskCategory,
            isOos,
            result,
            fineAmount,
            expenseAmount: 0,
            currency: isCanada ? "CAD" : "USD",
            expenses: fineAmount,
            status,
            accountId: account.id,
            // ── Source-specific paperwork (populated per jurisdiction).
            citationNumber:    `CT-${state}-${10000 + Math.floor(r() * 89999)}`,
            ticketNumber:      `TKT-${state}-${100000 + Math.floor(r() * 899999)}`,
            microfilmNumber:   `MF-${isCanada ? "CA" : "US"}${1000000 + Math.floor(r() * 8999999)}`,
            docketNumber:      result === "OOS Order" || r() < 0.4
                ? `DKT-${date.replace(/-/g, "")}-${100 + Math.floor(r() * 899)}`
                : undefined,
            driverMasterNumber: isCanada
                ? `${state}-DM-${1000000 + Math.floor(r() * 8999999)}`
                : undefined,
            charge,
            offence,
            natCode,
            actSection,
            issuingAgency,
            convictionDate:    result === "Citation Issued" || result === "OOS Order"
                ? convictionDateAfter(date, r)
                : undefined,
            convictionNumber:  result === "Citation Issued" || result === "OOS Order"
                ? `CN-${state}-${100000 + Math.floor(r() * 899999)}`
                : undefined,
        });
    }

    return out;
}

// ── Public API ────────────────────────────────────────────────────────────

const built = (() => {
    const all: CarrierViolationRecord[] = [];
    const byCarrier: Record<string, CarrierViolationRecord[]> = {};

    // Acme (acct-001) keeps the hand-curated demo records verbatim — same
    // pattern as carrier-accidents.data.ts. We map MOCK_VIOLATION_RECORDS
    // through with `accountId` set so the filter is uniform across carriers.
    // Then we APPEND ~14 synthesized cross-border records so the Acme demo
    // surfaces FMCSA SMS, CVOR (Ontario), and NSC (other Canadian provinces)
    // violations together — otherwise Acme would only ever show SMS rows.
    const acmeId = "acct-001";
    const acmeAccount = ACCOUNTS_DB.find(a => a.id === acmeId);
    const acmeHistorical: CarrierViolationRecord[] = MOCK_VIOLATION_RECORDS.map(rec => ({
        ...rec,
        accountId: acmeId,
    }));
    const acmeCrossBorder: CarrierViolationRecord[] = acmeAccount
        ? buildForCarrier(acmeAccount, 14)
        : [];
    const acmeRecords = [...acmeHistorical, ...acmeCrossBorder];
    byCarrier[acmeId] = acmeRecords;
    all.push(...acmeRecords);

    for (const account of ACCOUNTS_DB) {
        if (account.id === acmeId) continue;
        const list = buildForCarrier(account);
        byCarrier[account.id] = list;
        all.push(...list);
    }

    return { all, byCarrier };
})();

export const CARRIER_VIOLATIONS_ALL: CarrierViolationRecord[] = built.all;
export const CARRIER_VIOLATIONS_BY_CARRIER: Record<string, CarrierViolationRecord[]> = built.byCarrier;

export function getViolationsForCarrier(accountId: string): CarrierViolationRecord[] {
    return built.byCarrier[accountId] ?? [];
}
