// External regulatory feed mocks (FMCSA / CVOR / per-province NSC) used for
// accident reconciliation against the internal accident log.
//
// Match keys: accountId + occurredDate + city + occurredAt within ±60 min.
//
// Matched feed records "verify" an internal accident (we display the badges
// of every external feed it appears in). Unmatched records are flagged as
// MISSING from the log and surfaced in a warning section so admins can log
// them with one click.

import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { hash, mulberry32, pick } from "@/pages/accounts/carrier-fleet-shared.data";
import { CARRIER_INCIDENTS_BY_CARRIER } from "./carrier-accidents.data";

export type ExternalFeedSource =
    | "FMCSA"
    | "CVOR"        // Ontario
    | "NSC-AB" | "NSC-BC" | "NSC-MB" | "NSC-NB" | "NSC-NL"
    | "NSC-NS" | "NSC-PEI" | "NSC-QC" | "NSC-SK";

export interface ExternalAccidentRecord {
    source: ExternalFeedSource;
    externalId: string;
    accountId: string;
    occurredAt: string;
    occurredDate: string;
    city: string;
    stateOrProvince: string;
    country: "USA" | "Canada";
    driverName?: string;
    driverLicense?: string;
    driverLicenseState?: string;
    vehicleVin?: string;
    vehiclePlate?: string;
    vehicleMakeModel?: string;
    fatalities: number;
    injuries: number;
    towAway: boolean;
    severitySummary: string;
    reportedBy: string;
    rawDescription: string;
    /** Police report number / citation provided by the agency (when present). */
    policeReportNumber?: string;
    investigatingOfficer?: string;
}

// ── Source registry ────────────────────────────────────────────────────────

interface SourceMeta {
    label: string;
    short: string;
    agency: string;
    tone: string;
    /** Reference field in the internal `references` block. */
    refField: "usdotNumber" | "cvorNumber" | "nscNumber";
    /** Microfilm-style identifier prefix, used for display. */
    idPrefix: string;
}

export const SOURCE_META: Record<ExternalFeedSource, SourceMeta> = {
    FMCSA:    { label: "FMCSA Crash Database",                short: "FMCSA",   agency: "FMCSA Crash Database (MCMIS)",                                  tone: "bg-blue-50 text-blue-700 border-blue-200",         refField: "usdotNumber", idPrefix: "FM" },
    CVOR:     { label: "Ontario CVOR Collision Report",       short: "CVOR",    agency: "Ontario MTO — Carrier Vehicle Operator Registration",          tone: "bg-rose-50 text-rose-700 border-rose-200",         refField: "cvorNumber",  idPrefix: "CV" },
    "NSC-AB": { label: "NSC Alberta — Carrier Profile",       short: "NSC AB",  agency: "Alberta Transportation — Carrier Profile",                     tone: "bg-amber-50 text-amber-700 border-amber-200",      refField: "nscNumber",   idPrefix: "AB" },
    "NSC-BC": { label: "NSC British Columbia",                short: "NSC BC",  agency: "BC Ministry of Transportation — NSC Profile",                  tone: "bg-emerald-50 text-emerald-700 border-emerald-200",refField: "nscNumber",   idPrefix: "BC" },
    "NSC-MB": { label: "NSC Manitoba",                        short: "NSC MB",  agency: "Manitoba Transportation & Infrastructure",                     tone: "bg-yellow-50 text-yellow-700 border-yellow-200",   refField: "nscNumber",   idPrefix: "MB" },
    "NSC-NB": { label: "NSC New Brunswick",                   short: "NSC NB",  agency: "NB Department of Transportation",                              tone: "bg-cyan-50 text-cyan-700 border-cyan-200",         refField: "nscNumber",   idPrefix: "NB" },
    "NSC-NL": { label: "NSC Newfoundland & Labrador",         short: "NSC NL",  agency: "Newfoundland & Labrador Transportation",                       tone: "bg-teal-50 text-teal-700 border-teal-200",         refField: "nscNumber",   idPrefix: "NL" },
    "NSC-NS": { label: "NSC Nova Scotia",                     short: "NSC NS",  agency: "NS Transportation & Infrastructure Renewal",                   tone: "bg-indigo-50 text-indigo-700 border-indigo-200",   refField: "nscNumber",   idPrefix: "NS" },
    "NSC-PEI":{ label: "NSC Prince Edward Island",            short: "NSC PEI", agency: "PEI Transportation & Infrastructure",                          tone: "bg-violet-50 text-violet-700 border-violet-200",   refField: "nscNumber",   idPrefix: "PE" },
    "NSC-QC": { label: "NSC Quebec — PEVL (SAAQ)",            short: "NSC QC",  agency: "Quebec SAAQ — PEVL",                                            tone: "bg-orange-50 text-orange-700 border-orange-200",   refField: "nscNumber",   idPrefix: "QC" },
    "NSC-SK": { label: "NSC Saskatchewan",                    short: "NSC SK",  agency: "Saskatchewan Government Insurance",                            tone: "bg-lime-50 text-lime-700 border-lime-200",         refField: "nscNumber",   idPrefix: "SK" },
};

export const SOURCE_TONE: Record<ExternalFeedSource, string> = Object.fromEntries(
    Object.entries(SOURCE_META).map(([k, v]) => [k, v.tone]),
) as Record<ExternalFeedSource, string>;

const PROVINCE_TO_NSC: Record<string, ExternalFeedSource | "CVOR"> = {
    AB: "NSC-AB", BC: "NSC-BC", MB: "NSC-MB", NB: "NSC-NB", NL: "NSC-NL",
    NS: "NSC-NS", PE: "NSC-PEI", QC: "NSC-QC", SK: "NSC-SK", ON: "CVOR",
};

function allowedSourcesForRecord(country: string, prov: string): ExternalFeedSource[] {
    if (country === "USA") return ["FMCSA"];
    const provincial = PROVINCE_TO_NSC[prov];
    if (provincial) return ["FMCSA", provincial];
    return ["FMCSA"];
}

function buildSeveritySummary(fatalities: number, injuries: number, towAway: boolean): string {
    const parts: string[] = [];
    if (fatalities > 0) parts.push(`${fatalities} fatalit${fatalities === 1 ? "y" : "ies"}`);
    if (injuries > 0) parts.push(`${injuries} injur${injuries === 1 ? "y" : "ies"}`);
    if (towAway) parts.push("tow-away");
    if (parts.length === 0) parts.push("property damage only");
    return parts.join(" · ");
}

const MAKES   = ["Freightliner", "Kenworth", "Peterbilt", "Volvo", "Mack", "International"];
const MODELS  = ["Cascadia", "T680", "579", "VNL 760", "Anthem", "LT625"];
const OFFICERS = [
    "Cst. M. Reynolds", "Cst. J. Patel", "Cst. S. O'Brien",
    "Sgt. R. Cohen", "Cst. T. Nguyen", "Tpr. K. Williams",
    "Officer L. Garcia", "Officer D. Thompson",
];

// ── Stand-alone "missing" pools — spread across provinces so each NSC source gets data ──

const STANDALONE_US = [
    { city: "Oklahoma City", state: "OK" }, { city: "Albuquerque", state: "NM" },
    { city: "Birmingham",    state: "AL" }, { city: "St. Louis",   state: "MO" },
    { city: "Louisville",    state: "KY" }, { city: "Reno",        state: "NV" },
];

const STANDALONE_CA_BY_PROV: Record<string, { city: string; state: string }[]> = {
    AB: [ { city: "Calgary",      state: "AB" }, { city: "Edmonton",   state: "AB" }, { city: "Red Deer",  state: "AB" } ],
    BC: [ { city: "Vancouver",    state: "BC" }, { city: "Surrey",     state: "BC" }, { city: "Kelowna",   state: "BC" } ],
    MB: [ { city: "Winnipeg",     state: "MB" }, { city: "Brandon",    state: "MB" } ],
    NB: [ { city: "Moncton",      state: "NB" }, { city: "Saint John", state: "NB" } ],
    NL: [ { city: "St. John's",   state: "NL" }, { city: "Corner Brook", state: "NL" } ],
    NS: [ { city: "Halifax",      state: "NS" }, { city: "Sydney",     state: "NS" } ],
    PE: [ { city: "Charlottetown",state: "PE" }, { city: "Summerside", state: "PE" } ],
    QC: [ { city: "Sherbrooke",   state: "QC" }, { city: "Quebec City",state: "QC" } ],
    SK: [ { city: "Saskatoon",    state: "SK" }, { city: "Regina",     state: "SK" } ],
    ON: [ { city: "Thunder Bay",  state: "ON" }, { city: "Sudbury",    state: "ON" }, { city: "London", state: "ON" } ],
};

function isoOffset(daysAgo: number, hour = 9, minute = 0): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

function jitterMinutes(iso: string, r: () => number): string {
    const d = new Date(iso);
    const delta = Math.floor((r() - 0.5) * 30); // ±15 min
    d.setMinutes(d.getMinutes() + delta);
    return d.toISOString();
}

function buildExternalId(src: ExternalFeedSource, date: string, r: () => number) {
    return `${SOURCE_META[src].idPrefix}-${date.replace(/-/g, "")}-${Math.floor(r() * 999999).toString().padStart(6, "0")}`;
}

// ── Per-carrier builder ───────────────────────────────────────────────────

function buildForCarrier(account: AccountRecord): ExternalAccidentRecord[] {
    const r = mulberry32(hash(`externalFeeds-v2:${account.id}`));
    const internal = CARRIER_INCIDENTS_BY_CARRIER[account.id] ?? [];
    const out: ExternalAccidentRecord[] = [];

    // ─── Matched: ~60% of internal accidents get one or two external matches.
    for (const inc of internal) {
        if (r() >= 0.6) continue;
        const country = inc.location?.country === "Canada" ? "Canada" : "USA";
        const prov    = inc.location?.stateOrProvince ?? "";
        const allowed = allowedSourcesForRecord(country, prov);
        const numSources = 1 + Math.floor(r() * Math.min(2, allowed.length));
        const used = new Set<ExternalFeedSource>();
        for (let i = 0; i < numSources; i++) {
            const src = allowed[Math.floor(r() * allowed.length)] as ExternalFeedSource;
            if (used.has(src)) continue;
            used.add(src);
            const fatalities = inc.severity?.fatalities ?? 0;
            const injuries   = inc.severity?.injuriesNonFatal ?? 0;
            const towAway    = !!inc.severity?.towAway;
            out.push({
                source: src,
                externalId: buildExternalId(src, inc.occurredDate ?? "", r),
                accountId: account.id,
                occurredAt: jitterMinutes(inc.occurredAt, r),
                occurredDate: inc.occurredDate,
                city: inc.location?.city ?? "",
                stateOrProvince: prov,
                country,
                driverName: inc.driver?.name,
                driverLicense: inc.driver?.license,
                driverLicenseState: inc.driver?.licenseState,
                vehicleVin: inc.vehicles?.[0]?.vin,
                vehiclePlate: inc.vehicles?.[0]?.licenseNumber,
                vehicleMakeModel: inc.vehicles?.[0] ? `${inc.vehicles[0].make ?? ""} ${inc.vehicles[0].model ?? ""}`.trim() : undefined,
                fatalities,
                injuries,
                towAway,
                severitySummary: buildSeveritySummary(fatalities, injuries, towAway),
                reportedBy: SOURCE_META[src].agency,
                rawDescription: `${SOURCE_META[src].short} feed match for ${inc.cause?.incidentType ?? "accident"} at ${inc.location?.city ?? "unknown"}.`,
                policeReportNumber: `PR-${prov}-${100000 + Math.floor(r() * 899999)}`,
                investigatingOfficer: pick(r, OFFICERS),
            });
        }
    }

    // ─── Unmatched: stand-alone records that don't correspond to any internal accident.
    const isCanada = account.country === "CA";
    if (isCanada) {
        // For Canadian carriers seed at least one missing record per province
        // so each NSC variant has data (great for the demo / Beta Safety Analysis).
        for (const prov of Object.keys(STANDALONE_CA_BY_PROV)) {
            if (r() >= 0.45) continue; // 45% chance per province
            const loc = pick(r, STANDALONE_CA_BY_PROV[prov]);
            const daysAgo = 14 + Math.floor(r() * 600);
            const occurredAt = isoOffset(daysAgo, 8 + Math.floor(r() * 10), Math.floor(r() * 59));
            const occurredDate = occurredAt.slice(0, 10);
            const allowed = allowedSourcesForRecord("Canada", prov);
            const src = pick(r, allowed);
            out.push(makeMissing(src, account, loc, occurredAt, occurredDate, r));
        }
    } else {
        const missingCount = 1 + Math.floor(r() * 3);
        for (let i = 0; i < missingCount; i++) {
            const loc = pick(r, STANDALONE_US);
            const daysAgo = 14 + Math.floor(r() * 600);
            const occurredAt = isoOffset(daysAgo, 8 + Math.floor(r() * 10), Math.floor(r() * 59));
            const occurredDate = occurredAt.slice(0, 10);
            out.push(makeMissing("FMCSA", account, loc, occurredAt, occurredDate, r));
        }
    }

    return out;
}

function makeMissing(
    src: ExternalFeedSource,
    account: AccountRecord,
    loc: { city: string; state: string },
    occurredAt: string,
    occurredDate: string,
    r: () => number,
): ExternalAccidentRecord {
    const isCanada = account.country === "CA";
    const fatalities = r() < 0.06 ? 1 : 0;
    const injuries   = r() < 0.30 ? 1 + Math.floor(r() * 2) : 0;
    const towAway    = r() < 0.45;
    return {
        source: src,
        externalId: buildExternalId(src, occurredDate, r),
        accountId: account.id,
        occurredAt,
        occurredDate,
        city: loc.city,
        stateOrProvince: loc.state,
        country: isCanada ? "Canada" : "USA",
        driverName: pick(r, [
            "Unknown — pending identification",
            "Driver name redacted by agency",
            `${pick(r, ["John", "Sarah", "Liam", "Anna"])} ${pick(r, ["Smith", "Brown", "Tremblay", "Singh"])}`,
        ]),
        driverLicense: `${pick(r, ["A", "B", "C", "D"])}${(100000000 + Math.floor(r() * 899999999))}`,
        driverLicenseState: loc.state,
        vehiclePlate: `${loc.state}-${(1000 + Math.floor(r() * 8999))}`,
        vehicleVin: `1${pick(r, ["F","X","M","K"])}${Math.floor(r() * 1e15).toString(36).toUpperCase().padEnd(15, "X").slice(0, 15)}`,
        vehicleMakeModel: `${pick(r, MAKES)} ${pick(r, MODELS)}`,
        fatalities,
        injuries,
        towAway,
        severitySummary: buildSeveritySummary(fatalities, injuries, towAway),
        reportedBy: SOURCE_META[src].agency,
        rawDescription: pick(r, [
            "Police-reported collision found in the agency feed but no matching record in the carrier accident log.",
            "Reportable collision logged by regulator; carrier acknowledgement pending.",
            "External crash database entry — carrier should reconcile or dispute the match.",
            "FMCSR §390.15 — carrier must add this record to the accident register within reporting window.",
        ]),
        policeReportNumber: `PR-${loc.state}-${100000 + Math.floor(r() * 899999)}`,
        investigatingOfficer: pick(r, OFFICERS),
    };
}

const built = (() => {
    const all: ExternalAccidentRecord[] = [];
    const byCarrier: Record<string, ExternalAccidentRecord[]> = {};
    for (const a of ACCOUNTS_DB) {
        const list = buildForCarrier(a);
        byCarrier[a.id] = list;
        all.push(...list);
    }
    return { all, byCarrier };
})();

export const EXTERNAL_ACCIDENT_FEEDS_ALL = built.all;
export const EXTERNAL_ACCIDENT_FEEDS_BY_CARRIER: Record<string, ExternalAccidentRecord[]> = built.byCarrier;

export function getExternalAccidentsForCarrier(accountId: string): ExternalAccidentRecord[] {
    return built.byCarrier[accountId] ?? [];
}

// ── Runtime feed sync ─────────────────────────────────────────────────────
// Used by the AccidentsPage "Sync feeds" button to simulate a live feed
// refresh — each call returns 1–3 fresh ExternalAccidentRecord entries that
// are jurisdictionally appropriate for the carrier (US carriers see FMCSA;
// Canadian carriers see CVOR or NSC for their province plus FMCSA when
// operating cross-border).
export function generateLiveAccidentBatch(accountId: string, batchSize = 1 + Math.floor(Math.random() * 3)): ExternalAccidentRecord[] {
    const r = mulberry32(hash(`live-accident-feed:${accountId}:${Date.now()}:${Math.random()}`));
    const account = ACCOUNTS_DB.find(a => a.id === accountId);
    const isCanada = account?.country === "CA";
    const out: ExternalAccidentRecord[] = [];
    const pools = isCanada
        ? STANDALONE_CA_BY_PROV[account?.state ?? "ON"] ?? STANDALONE_CA_BY_PROV.ON
        : STANDALONE_US;
    for (let i = 0; i < batchSize; i++) {
        const loc = pick(r, pools);
        const daysAgo = 1 + Math.floor(r() * 30); // recent — last month
        const occurredAt = isoOffset(daysAgo, 8 + Math.floor(r() * 10), Math.floor(r() * 59));
        const occurredDate = occurredAt.slice(0, 10);
        const allowed = allowedSourcesForRecord(isCanada ? "Canada" : "USA", loc.state);
        const src = pick(r, allowed);
        out.push(makeMissing(src, account ?? ACCOUNTS_DB[0], loc, occurredAt, occurredDate, r));
    }
    return out;
}

// ── Matching logic ────────────────────────────────────────────────────────

export interface MatchResult {
    /** Internal incidentId → external sources that verified it. */
    verifiedByIncidentId: Map<string, ExternalFeedSource[]>;
    /** External records with no internal counterpart — flagged as missing. */
    missing: ExternalAccidentRecord[];
}

export function matchInternalToExternal(
    internal: any[],
    external: ExternalAccidentRecord[],
): MatchResult {
    const verifiedByIncidentId = new Map<string, ExternalFeedSource[]>();
    const missing: ExternalAccidentRecord[] = [];
    const SIXTY_MIN = 60 * 60 * 1000;

    for (const ext of external) {
        const candidate = internal.find((inc) => {
            if (inc.accountId && ext.accountId && inc.accountId !== ext.accountId) return false;
            if (inc.occurredDate !== ext.occurredDate) return false;
            const cityA = (inc.location?.city ?? "").trim().toLowerCase();
            const cityB = (ext.city ?? "").trim().toLowerCase();
            if (cityA && cityB && cityA !== cityB) return false;
            const tA = inc.occurredAt ? new Date(inc.occurredAt).getTime() : NaN;
            const tB = ext.occurredAt ? new Date(ext.occurredAt).getTime() : NaN;
            if (Number.isFinite(tA) && Number.isFinite(tB)) {
                if (Math.abs(tA - tB) > SIXTY_MIN) return false;
            }
            return true;
        });
        if (candidate?.incidentId) {
            const cur = verifiedByIncidentId.get(candidate.incidentId) ?? [];
            if (!cur.includes(ext.source)) cur.push(ext.source);
            verifiedByIncidentId.set(candidate.incidentId, cur);
        } else {
            missing.push(ext);
        }
    }
    return { verifiedByIncidentId, missing };
}
