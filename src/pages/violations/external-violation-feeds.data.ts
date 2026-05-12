// External regulatory-violation feeds (FMCSA SMS, CVOR conviction, NSC carrier
// profile convictions, and federal Contraventions) used for violation
// reconciliation against the internal violation log.
//
// The pattern mirrors `src/pages/incidents/external-feeds.data.ts` for accidents:
// match keys are date + ±60min time window + driver name (or licence) +
// violation code. Matched feed records "verify" an internal violation and we
// display badges for every feed it appears in. Unmatched records are flagged
// as MISSING from the carrier's internal log so the safety / compliance team
// can reconcile them with one click.
//
// Sources covered (per the safety & compliance brief):
//   • SMS           — FMCSA Safety Measurement System (US carriers / BASICs)
//   • CVOR-CONV     — Ontario MTO CVOR Conviction Report
//   • NSC-AB-CONV   — Alberta NSC Carrier Profile · convictions
//   • CONTRAV       — Federal Contraventions Act (NSC offences enforced where
//                     no provincial enforcement program exists)
//   • NSC-PEI-CONV  — PEI NSC Carrier Profile · convictions
//   • NSC-NS-CONV   — Nova Scotia NSC Carrier Profile · convictions

import { hash, mulberry32, pick } from "@/pages/accounts/carrier-fleet-shared.data";
import { type ViolationRecord } from "./violations-list.data";
import { CARRIER_VIOLATIONS_ALL, CARRIER_VIOLATIONS_BY_CARRIER, type CarrierViolationRecord } from "./carrier-violations.data";

// ─── Source registry ──────────────────────────────────────────────────────

export type ExternalViolationSource =
    | "SMS"
    | "CVOR-CONV"
    | "NSC-AB-CONV"
    | "CONTRAV"
    | "NSC-PEI-CONV"
    | "NSC-NS-CONV";

interface SourceMeta {
    label: string;
    short: string;
    agency: string;
    tone: string;
    /** Which jurisdiction the source covers; used to filter records to plausible matches. */
    jurisdiction: "USA" | "ON" | "AB" | "PE" | "NS" | "CA-FEDERAL";
    /** Reference field carried on the internal `ViolationRecord` (optional). */
    refField: "usdotNumber" | "cvorNumber" | "nscNumber";
    idPrefix: string;
}

export const VIOLATION_SOURCE_META: Record<ExternalViolationSource, SourceMeta> = {
    SMS:            { label: "FMCSA Safety Measurement System",     short: "SMS",        agency: "FMCSA — Safety Measurement System (MCMIS / SAFER)",  tone: "bg-blue-50 text-blue-700 border-blue-200",       jurisdiction: "USA",        refField: "usdotNumber", idPrefix: "SMS" },
    "CVOR-CONV":    { label: "Ontario CVOR Conviction Report",      short: "CVOR Conv.", agency: "Ontario MTO — CVOR Conviction Abstract",            tone: "bg-rose-50 text-rose-700 border-rose-200",       jurisdiction: "ON",         refField: "cvorNumber",  idPrefix: "CV" },
    "NSC-AB-CONV":  { label: "NSC Alberta — Conviction Record",     short: "NSC AB Conv.", agency: "Alberta Transportation — NSC Carrier Profile",    tone: "bg-amber-50 text-amber-700 border-amber-200",    jurisdiction: "AB",         refField: "nscNumber",   idPrefix: "ABC" },
    CONTRAV:        { label: "Federal Contraventions Act ticket",   short: "Contrav.",   agency: "Public Prosecution Service of Canada — Contraventions", tone: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200", jurisdiction: "CA-FEDERAL", refField: "nscNumber",  idPrefix: "CON" },
    "NSC-PEI-CONV": { label: "NSC Prince Edward Island — Conviction", short: "NSC PEI Conv.", agency: "PEI Transportation & Infrastructure — NSC Profile", tone: "bg-violet-50 text-violet-700 border-violet-200", jurisdiction: "PE",         refField: "nscNumber",   idPrefix: "PEC" },
    "NSC-NS-CONV":  { label: "NSC Nova Scotia — Conviction Record", short: "NSC NS Conv.", agency: "Nova Scotia Transportation — NSC Carrier Profile", tone: "bg-indigo-50 text-indigo-700 border-indigo-200", jurisdiction: "NS",         refField: "nscNumber",   idPrefix: "NSC" },
};

export const VIOLATION_SOURCE_TONE: Record<ExternalViolationSource, string> =
    Object.fromEntries(
        Object.entries(VIOLATION_SOURCE_META).map(([k, v]) => [k, v.tone]),
    ) as Record<ExternalViolationSource, string>;

const STATE_TO_SOURCES: Record<string, ExternalViolationSource[]> = {
    // Canadian provinces — convictions are recorded against NSC carrier profile
    // and (federally) on the Contraventions ticket register.
    ON: ["CVOR-CONV", "CONTRAV"],
    AB: ["NSC-AB-CONV", "CONTRAV"],
    PE: ["NSC-PEI-CONV", "CONTRAV"],
    NS: ["NSC-NS-CONV", "CONTRAV"],
    BC: ["CONTRAV"], MB: ["CONTRAV"], NB: ["CONTRAV"], NL: ["CONTRAV"],
    QC: ["CONTRAV"], SK: ["CONTRAV"], YT: ["CONTRAV"], NT: ["CONTRAV"], NU: ["CONTRAV"],
};

function allowedSourcesForRecord(country: string, state: string): ExternalViolationSource[] {
    if (country === "CA") return STATE_TO_SOURCES[state] ?? ["CONTRAV"];
    return ["SMS"];
}

// ─── Public record type ───────────────────────────────────────────────────

export interface ExternalViolationRecord {
    source: ExternalViolationSource;
    externalId: string;
    /** Carrier this feed entry is attached to (matches CARRIER_VIOLATIONS_BY_CARRIER). */
    accountId: string;
    /** ISO YYYY-MM-DD (date of violation). */
    date: string;
    /** HH:mm 24-hour (time of violation as recorded by the regulator). */
    time: string;
    /** Combined ISO timestamp — useful for ±60 min matching. */
    occurredAt: string;
    /** Date the conviction was registered (for conviction-type sources). */
    convictionDate?: string;
    convictionNumber?: string;
    city: string;
    state: string;
    country: "USA" | "CA";
    driverName: string;
    driverLicense?: string;
    driverLicenseState?: string;
    vehicleUnit?: string;
    vehiclePlate?: string;
    violationCode: string;
    violationDescription: string;
    severity: "OOS" | "Critical" | "Serious" | "Moderate" | "Minor";
    fineAmount: number;
    currency: "USD" | "CAD";
    reportedBy: string;
    rawDescription: string;
    citationNumber?: string;
    /** USDOT / CVOR / NSC carrier identifier carried on the feed entry. */
    carrierRef?: string;
}

// ─── Feed builders ────────────────────────────────────────────────────────

function isoFor(date: string, time: string): string {
    // Treat the existing string fields as local; encode as the date in ISO Z
    // form so we can use timestamps for ±60-min matching deterministically.
    return new Date(`${date}T${time || "00:00"}:00Z`).toISOString();
}

function jitterMinutes(date: string, time: string, r: () => number): { time: string; iso: string } {
    const base = new Date(`${date}T${time || "00:00"}:00Z`);
    const delta = Math.floor((r() - 0.5) * 30); // ±15 min
    base.setUTCMinutes(base.getUTCMinutes() + delta);
    const hh = String(base.getUTCHours()).padStart(2, "0");
    const mm = String(base.getUTCMinutes()).padStart(2, "0");
    return { time: `${hh}:${mm}`, iso: base.toISOString() };
}

function buildExternalId(src: ExternalViolationSource, date: string, r: () => number) {
    return `${VIOLATION_SOURCE_META[src].idPrefix}-${date.replace(/-/g, "")}-${Math.floor(r() * 999999).toString().padStart(6, "0")}`;
}

function severityFromRecord(rec: ViolationRecord): ExternalViolationRecord["severity"] {
    if (rec.isOos) return "OOS";
    if (rec.driverRiskCategory === 1) return "Critical";
    if (rec.driverRiskCategory === 2) return "Serious";
    if (rec.driverRiskCategory === 3) return "Moderate";
    return "Minor";
}

function convictionDateFor(violationDate: string, r: () => number): string {
    // Convictions land roughly 30–120 days after the violation date.
    const d = new Date(`${violationDate}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 30 + Math.floor(r() * 90));
    return d.toISOString().slice(0, 10);
}

const STANDALONE_BY_STATE: Record<string, { city: string; state: string; country: "USA" | "CA" }[]> = {
    ON: [
        { city: "Toronto",   state: "ON", country: "CA" },
        { city: "Hamilton",  state: "ON", country: "CA" },
        { city: "Ottawa",    state: "ON", country: "CA" },
    ],
    AB: [
        { city: "Calgary",   state: "AB", country: "CA" },
        { city: "Edmonton",  state: "AB", country: "CA" },
        { city: "Red Deer",  state: "AB", country: "CA" },
    ],
    PE: [
        { city: "Charlottetown", state: "PE", country: "CA" },
        { city: "Summerside",    state: "PE", country: "CA" },
    ],
    NS: [
        { city: "Halifax",   state: "NS", country: "CA" },
        { city: "Sydney",    state: "NS", country: "CA" },
    ],
    US: [
        { city: "Dallas",      state: "TX", country: "USA" },
        { city: "Atlanta",     state: "GA", country: "USA" },
        { city: "Phoenix",     state: "AZ", country: "USA" },
        { city: "Chicago",     state: "IL", country: "USA" },
        { city: "Indianapolis",state: "IN", country: "USA" },
    ],
};

const STANDALONE_VIOLATIONS: { code: string; description: string; severity: ExternalViolationRecord["severity"]; fine: number }[] = [
    { code: "395.8(a)",        description: "Driver record-of-duty status not current",                        severity: "Serious",  fine: 250 },
    { code: "395.3(a)(2)",     description: "Driving beyond 14-hour duty period (Property carrier)",            severity: "Critical", fine: 500 },
    { code: "392.2S",          description: "Speeding 6-10 mph over the limit",                                 severity: "Serious",  fine: 175 },
    { code: "393.95(a)",       description: "No / discharged / unsecured fire extinguisher",                    severity: "Moderate", fine: 100 },
    { code: "396.3(a)(1)",     description: "Inspection / repair / maintenance — parts and accessories",        severity: "Serious",  fine: 200 },
    { code: "392.16",          description: "Failing to use seat belt while operating CMV",                     severity: "Moderate", fine: 150 },
    { code: "Sch.1 §4(1)",     description: "Driver — daily log not maintained (NSC Standard 9)",               severity: "Serious",  fine: 310 },
    { code: "HTA 84.1",        description: "Drive commercial motor vehicle — wheel not secured",               severity: "OOS",      fine: 1410 },
    { code: "NSC §6.2",        description: "Carrier failed to maintain pre-trip inspection records",           severity: "Critical", fine: 685 },
];

const DRIVER_POOL = [
    "Unknown — pending identification", "John Smith", "Sarah Miller",
    "Mike Johnson", "Elena Rodriguez", "James Sullivan",
    "Maria Rodriguez", "Robert Chen", "Sarah Johnson",
    "Driver name redacted by agency",
];

function makeStandalone(
    src: ExternalViolationSource,
    accountId: string,
    r: () => number,
): ExternalViolationRecord {
    const meta = VIOLATION_SOURCE_META[src];
    const pools = meta.jurisdiction === "USA"
        ? STANDALONE_BY_STATE.US
        : meta.jurisdiction === "CA-FEDERAL"
            ? [...STANDALONE_BY_STATE.ON, ...STANDALONE_BY_STATE.AB, ...STANDALONE_BY_STATE.NS, ...STANDALONE_BY_STATE.PE]
            : STANDALONE_BY_STATE[meta.jurisdiction] ?? [];
    if (pools.length === 0) {
        return null as unknown as ExternalViolationRecord;
    }
    const loc = pick(r, pools);
    const v = pick(r, STANDALONE_VIOLATIONS);

    const daysAgo = 14 + Math.floor(r() * 600);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const date = d.toISOString().slice(0, 10);
    const hh = String(8 + Math.floor(r() * 10)).padStart(2, "0");
    const mm = String(Math.floor(r() * 59)).padStart(2, "0");
    const time = `${hh}:${mm}`;
    const occurredAt = isoFor(date, time);

    const currency: "USD" | "CAD" = loc.country === "USA" ? "USD" : "CAD";

    return {
        source: src,
        externalId: buildExternalId(src, date, r),
        accountId,
        date,
        time,
        occurredAt,
        convictionDate: meta.jurisdiction === "USA" ? undefined : convictionDateFor(date, r),
        convictionNumber: meta.jurisdiction === "USA" ? undefined : `CN-${loc.state}-${100000 + Math.floor(r() * 899999)}`,
        city: loc.city,
        state: loc.state,
        country: loc.country,
        driverName: pick(r, DRIVER_POOL),
        driverLicense: `${pick(r, ["A","B","C","D"])}${(100000000 + Math.floor(r() * 899999999))}`,
        driverLicenseState: loc.state,
        vehicleUnit: `T-${1000 + Math.floor(r() * 8999)}`,
        vehiclePlate: `${loc.state}-${1000 + Math.floor(r() * 8999)}`,
        violationCode: v.code,
        violationDescription: v.description,
        severity: v.severity,
        fineAmount: v.fine,
        currency,
        reportedBy: meta.agency,
        rawDescription: pick(r, [
            `${meta.short} feed entry — no matching record in the carrier violation log.`,
            "Regulator-recorded violation; carrier acknowledgement pending.",
            "Conviction registered against the carrier safety profile — reconcile with internal record.",
            "External feed entry — carrier should add this violation to its register within the reporting window.",
        ]),
        citationNumber: `CT-${loc.state}-${10000 + Math.floor(r() * 89999)}`,
        carrierRef: meta.refField === "usdotNumber"
            ? String(1000000 + Math.floor(r() * 8999999))
            : meta.refField === "cvorNumber"
                ? String(100000000 + Math.floor(r() * 899999999))
                : `NSC-${100000 + Math.floor(r() * 899999)}`,
    };
}

function buildForCarrier(accountId: string, internal: CarrierViolationRecord[]): ExternalViolationRecord[] {
    const r = mulberry32(hash(`external-violation-feeds:${accountId}`));
    const out: ExternalViolationRecord[] = [];

    // ── Matched: ~55% of each carrier's internal violations get one (or
    // occasionally two) external feed entries. The chosen source set depends
    // on the violation's jurisdiction so SMS matches US-state records and
    // CVOR / NSC-AB / NSC-PEI / NSC-NS / Contraventions match Canadian ones.
    for (const rec of internal) {
        if (r() >= 0.55) continue;
        const country = (rec.locationCountry === "CA" || rec.locationCountry === "Canada") ? "CA" : "USA";
        const state = rec.locationState || "";
        const allowed = allowedSourcesForRecord(country, state);
        if (allowed.length === 0) continue;
        const numSources = 1 + (r() < 0.25 ? 1 : 0);

        const used = new Set<ExternalViolationSource>();
        for (let i = 0; i < numSources; i++) {
            const src = allowed[Math.floor(r() * allowed.length)] as ExternalViolationSource;
            if (used.has(src)) continue;
            used.add(src);
            const { time, iso } = jitterMinutes(rec.date, rec.time, r);
            const meta = VIOLATION_SOURCE_META[src];
            out.push({
                source: src,
                externalId: buildExternalId(src, rec.date, r),
                accountId,
                date: rec.date,
                time,
                occurredAt: iso,
                convictionDate: meta.jurisdiction === "USA" ? undefined : convictionDateFor(rec.date, r),
                convictionNumber: meta.jurisdiction === "USA" ? undefined : `CN-${state || "NA"}-${100000 + Math.floor(r() * 899999)}`,
                city: rec.locationCity || "Unknown City",
                state,
                country: country === "CA" ? "CA" : "USA",
                driverName: rec.driverName,
                driverLicense: undefined,
                driverLicenseState: state,
                vehicleUnit: rec.assetName,
                vehiclePlate: undefined,
                violationCode: rec.violationCode,
                violationDescription: rec.violationType,
                severity: severityFromRecord(rec),
                fineAmount: rec.fineAmount,
                currency: rec.currency,
                reportedBy: meta.agency,
                rawDescription: `${meta.short} feed match for ${rec.violationType} (${rec.violationCode}) in ${rec.locationCity ?? state}.`,
                citationNumber: `CT-${state || "US"}-${10000 + Math.floor(r() * 89999)}`,
                carrierRef: meta.refField === "usdotNumber"
                    ? String(1000000 + Math.floor(r() * 8999999))
                    : meta.refField === "cvorNumber"
                        ? String(100000000 + Math.floor(r() * 899999999))
                        : `NSC-${100000 + Math.floor(r() * 899999)}`,
            });
        }
    }

    // ── Unmatched standalone entries — only emit sources that are plausible
    // for this carrier (US carriers see SMS-only; Canadian carriers see the
    // sources for their home province + federal Contraventions).
    const carrierJurisdiction = internal.find(rec => rec.locationCountry === "CA" || rec.locationCountry === "Canada")
        ? "CA"
        : "USA";
    const plausibleSources = (Object.keys(VIOLATION_SOURCE_META) as ExternalViolationSource[]).filter(src => {
        const meta = VIOLATION_SOURCE_META[src];
        if (carrierJurisdiction === "USA") return meta.jurisdiction === "USA";
        return meta.jurisdiction !== "USA";
    });
    for (const src of plausibleSources) {
        // 1–2 standalone records per applicable source per carrier
        const n = 1 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
            const rec = makeStandalone(src, accountId, r);
            if (rec) out.push(rec);
        }
    }

    return out;
}

function buildAll(): { all: ExternalViolationRecord[]; byCarrier: Record<string, ExternalViolationRecord[]> } {
    const all: ExternalViolationRecord[] = [];
    const byCarrier: Record<string, ExternalViolationRecord[]> = {};
    for (const accountId of Object.keys(CARRIER_VIOLATIONS_BY_CARRIER)) {
        const list = buildForCarrier(accountId, CARRIER_VIOLATIONS_BY_CARRIER[accountId]);
        byCarrier[accountId] = list;
        all.push(...list);
    }
    return { all, byCarrier };
}

const built = buildAll();

export const EXTERNAL_VIOLATION_FEEDS_ALL: ExternalViolationRecord[] = built.all;
export const EXTERNAL_VIOLATION_FEEDS_BY_CARRIER: Record<string, ExternalViolationRecord[]> = built.byCarrier;

export function getExternalViolationsForCarrier(accountId: string): ExternalViolationRecord[] {
    return built.byCarrier[accountId] ?? [];
}

// ─── Runtime feed sync ────────────────────────────────────────────────────
// Used by the ViolationsListPage "Sync feeds" button to simulate a live
// regulator-feed refresh: each call returns one or more fresh
// ExternalViolationRecord entries scoped to the carrier's jurisdiction.

/**
 * Generate a batch of new feed entries for a carrier on demand. The output
 * is non-deterministic on purpose — every Sync click yields fresh records
 * with unique externalIds, plausible jurisdiction-appropriate sources, and
 * varied violation payloads so the missing-from-system notification grows.
 */
export function generateLiveFeedBatch(accountId: string, batchSize = 1 + Math.floor(Math.random() * 3)): ExternalViolationRecord[] {
    // Mix in a fresh entropy seed so successive clicks return new records.
    const r = mulberry32(hash(`live-feed:${accountId}:${Date.now()}:${Math.random()}`));

    // Decide carrier jurisdiction from existing data so US carriers only
    // get SMS, Canadian carriers get the right province-specific sources.
    const existing = built.byCarrier[accountId] ?? [];
    const isCA = existing.some(e => e.country === "CA");
    const sources = (Object.keys(VIOLATION_SOURCE_META) as ExternalViolationSource[]).filter(src => {
        const meta = VIOLATION_SOURCE_META[src];
        if (isCA) return meta.jurisdiction !== "USA";
        return meta.jurisdiction === "USA";
    });
    if (sources.length === 0) return [];

    const out: ExternalViolationRecord[] = [];
    for (let i = 0; i < batchSize; i++) {
        const src = pick(r, sources);
        const rec = makeStandalone(src, accountId, r);
        if (rec) out.push(rec);
    }
    return out;
}

// Suppress unused-import warning — re-exported for callers that need the full
// global set when no specific carrier is selected.
void CARRIER_VIOLATIONS_ALL;

// ─── Matching ────────────────────────────────────────────────────────────

export interface ViolationMatchResult {
    /** Internal record id → external sources that verified it. */
    verifiedById: Map<string, ExternalViolationSource[]>;
    /** External records with no internal counterpart — flagged as missing. */
    missing: ExternalViolationRecord[];
}

function codesEqual(a: string, b: string): boolean {
    const norm = (s: string) => (s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    return norm(a) === norm(b);
}

export function matchInternalToExternalViolations(
    internal: ViolationRecord[],
    external: ExternalViolationRecord[] = EXTERNAL_VIOLATION_FEEDS_ALL,
): ViolationMatchResult {
    const verifiedById = new Map<string, ExternalViolationSource[]>();
    const missing: ExternalViolationRecord[] = [];
    const SIXTY_MIN = 60 * 60 * 1000;

    for (const ext of external) {
        const candidate = internal.find((rec) => {
            if (rec.date !== ext.date) return false;
            if (!codesEqual(rec.violationCode, ext.violationCode)) return false;
            const aName = (rec.driverName || "").trim().toLowerCase();
            const bName = (ext.driverName || "").trim().toLowerCase();
            if (aName && bName && aName !== bName) return false;
            const tA = new Date(`${rec.date}T${rec.time || "00:00"}:00Z`).getTime();
            const tB = new Date(ext.occurredAt).getTime();
            if (Number.isFinite(tA) && Number.isFinite(tB)) {
                if (Math.abs(tA - tB) > SIXTY_MIN) return false;
            }
            return true;
        });

        if (candidate?.id) {
            const cur = verifiedById.get(candidate.id) ?? [];
            if (!cur.includes(ext.source)) cur.push(ext.source);
            verifiedById.set(candidate.id, cur);
        } else {
            missing.push(ext);
        }
    }

    return { verifiedById, missing };
}
