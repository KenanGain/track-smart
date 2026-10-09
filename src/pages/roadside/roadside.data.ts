// ─────────────────────────────────────────────────────────────────────────────
// Roadside inspections.
//
// A roadside inspection is not the DOT history already on the Safety and
// Compliance page — that is what the authorities report back, weeks later, and
// it is read-only. This is the carrier's own record, opened the afternoon it
// happens: the inspector handed the driver a paper report, something may have
// been put out of service, and from that moment there is work to do.
//
// The work is the point. An inspection with a vehicle violation is not finished
// when it is typed in; it is finished when the defect is fixed, a REMEDIATION
// inspection says so, and — if a mechanic did the fixing — the repair bill is on
// file against the unit it was spent on. So a record here has three document
// shelves, not one, and the page's whole job is showing which shelf is empty.
//
// Who uploads what matters too. The remediation report can come from the driver
// on their phone (they are the one at the shop) or from the safety manager in
// the office, and it has to say whether a mechanic or the driver performed it —
// a driver-performed re-inspection is a different piece of evidence from a
// mechanic's, and an auditor asks which.
//
// Violations reuse the ticket module's `TicketViolation` and its picker: an SMS
// code is an SMS code whether it arrived on a citation or a roadside report, and
// two vocabularies for one chart is how a fleet ends up with two violation
// histories.
// ─────────────────────────────────────────────────────────────────────────────

import { useSyncExternalStore } from "react";
import type { TicketViolation } from "@/pages/tickets/tickets.data";
import { getAssetsForAccount } from "@/pages/accounts/carrier-assets.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
// The carrier's own shops. A seeded repair bill with no vendor on it is a bill nobody can
// ever find from the other side, which is the side the money is argued from.
import { VENDORS } from "@/pages/inventory/inventory.data";

// ── Vocabulary ──────────────────────────────────────────────────────────────

/**
 * The CVSA levels, in the enforcement community's own numbering.
 *
 * Roman numerals because that is what is printed on the report the driver is
 * holding — a page that says "Level 1" while the paper says "Level I" makes
 * somebody stop and check whether they are the same thing.
 */
export const INSPECTION_LEVELS = [
    "Level I — North American Standard",
    "Level II — Walk-Around",
    "Level III — Driver/Credential",
    "Level IV — Special Study",
    "Level V — Vehicle-Only",
    "Level VI — Radioactive",
    "Level VII — Jurisdictional Mandated",
    "Level VIII — Electronic",
] as const;
export type InspectionLevel = (typeof INSPECTION_LEVELS)[number];

export type InspectionResult = "Pass" | "Fail";

/** Which of the three things an inspector looks at. */
export type PartyKind = "truck" | "trailer" | "driver";

export const PARTY_LABEL: Record<PartyKind, string> = {
    truck: "Truck",
    trailer: "Trailer",
    driver: "Driver",
};

/**
 * Who performed a remediation inspection.
 *
 * Asked rather than assumed: a driver confirming their own light works is not
 * the same evidence as a shop's re-inspection, and the record has to be able to
 * say which one it holds.
 */
export type RemediationBy = "mechanic" | "driver";

export const REMEDIATION_BY_LABEL: Record<RemediationBy, string> = {
    mechanic: "Mechanic",
    driver: "Driver",
};

/** Where a document came in from. A driver's phone upload is worth marking. */
export type DocSource = "portal" | "driver-app";

/** The two dollars a North American fleet is billed in. */
export type BillCurrency = "USD" | "CAD";
export const BILL_CURRENCIES: BillCurrency[] = ["USD", "CAD"];

/** Miles or kilometres. Asked, never assumed — the same fleet runs both. */
export type DistanceUnit = "mi" | "km";
export const DISTANCE_UNITS: DistanceUnit[] = ["mi", "km"];

// ── Records ─────────────────────────────────────────────────────────────────

/** One uploaded file on an inspection. */
export interface RoadsideDoc {
    id: string;
    name: string;
    size?: number;
    /** Object URL for the demo; a real one would be a storage key. */
    url?: string;
    uploadedAt: string;
    uploadedBy: string;
    source: DocSource;
    /**
     * The rest of the same document.
     *
     * An invoice is rarely one page and a repair rarely one photograph: the shop sends the
     * bill, the parts list and a picture of the old part, and all three are evidence of the
     * SAME work. Filing them as separate records would say the truck was fixed three times.
     */
    attachments?: { id: string; name: string; size?: number; url?: string }[];
    /**
     * The date ON the document.
     *
     * Not `uploadedAt`: an inspection report written at the roadside on Tuesday
     * and photographed on Friday has two dates, and the one that matters to
     * anybody reading the record is the first.
     */
    documentDate?: string;
    /** Remediation reports only — whether a mechanic or the driver did it. */
    performedBy?: RemediationBy;
    /**
     * Remediation reports only — the PERSON, by name.
     *
     * "A mechanic" is a category; an auditor asking who signed off a brake repair
     * wants the name on the sheet. The two are kept apart because one is a fact
     * about the kind of work and the other is a fact about who did it.
     */
    performedByName?: string;
    /** Remediation reports only — the day the re-inspection happened. */
    performedOn?: string;
    /**
     * Repair bills only: the units this bill was spent on.
     *
     * A list, because one invoice routinely covers the tractor and the trailer
     * it was pulling, and filing it against only one of them loses the cost on
     * the other.
     */
    assetIds?: string[];
    /**
     * Repair bills only — what was spent on each unit, keyed by asset id.
     *
     * One invoice covering the tractor and the trailer is one bill and two costs. Filed as
     * a single total, the trailer’s share is lost the moment anybody asks what that
     * trailer has cost this year — and that is the question a lease return turns on.
     */
    assetAmounts?: Record<string, string>;
    /** Repair bills only — what the shop charged in total, as typed. */
    amount?: string;
    /**
     * The invoice's own number.
     *
     * The handle the bill is known by on the other side of the transaction: it is what the
     * shop says on the phone and what the accounts payable line is matched against. A
     * service record has carried one since it was written, and the roadside bill not
     * having one meant the vendor's bill list could show an invoice number for half its
     * rows and a dash for the rest — for no reason except which screen filed it.
     */
    invoiceNumber?: string;
    /** Repair bills only — the driver, where the driver paid for it on the road. */
    performedById?: string;

    // Repair bills only — who did the work, and what it came to. Kept on the
    // document rather than on the inspection: one inspection can send the tractor
    // to one shop and the trailer to another, and each bill is its own vendor.
    /**
     * The shop on the carrier's own list, where it is one.
     *
     * The name was being kept and the identity thrown away, so a bill could not be found
     * again from the vendor's side: "what has this shop done for us and what have we paid
     * them" had to be answered by matching strings, and "Wilmington Truck Service" is not
     * "Wilmington Truck Service Inc." A typed shop still files with a name and no id —
     * that is a real case, not a gap — and the vendor's page falls back to the name for it.
     */
    vendorId?: string;
    vendorName?: string;
    vendorCompany?: string;
    vendorEmail?: string;
    vendorPhone?: string;
    /** Which dollar. A cross-border fleet gets both, and an unlabelled number is
     *  the one that turns into a reconciliation argument. */
    currency?: BillCurrency;
    labour?: string;
    parts?: string;
    /** What the vehicle had run when the work was done. */
    odometer?: string;
    odometerUnit?: DistanceUnit;
}

/** One of the three inspected parties, and what was found against it. */
export interface RoadsideParty {
    /** The asset or driver inspected, when it is one on the roster. */
    id?: string;
    /** Unit number or name, kept on the record so it reads after a roster change. */
    label?: string;
    hasViolation: boolean;
    /** Only meaningful when `hasViolation` — the linked violation categories. */
    violations: TicketViolation[];
    /**
     * The driver only: was the logbook actually looked at?
     *
     * A Level III with no hours-of-service violation means two different things
     * depending on this, and the report says which. Undefined means nobody
     * recorded it, which is not the same as "no".
     */
    logbookInspected?: boolean;
}

export const emptyParty = (): RoadsideParty => ({ hasViolation: false, violations: [] });

// ── What an inspector actually writes ───────────────────────────────────────

/**
 * The quick charges each party's picker offers.
 *
 * The shared picker defaults to a citation's traffic charges — Speeding, Improper
 * Lane Change, Failure to Yield. None of those can be found against a parked
 * trailer, and offering them on this form tells the person filling it in that
 * they are on the wrong screen. These are the defects and paperwork failures a
 * roadside inspection is actually written up for, each carrying its real FMCSA
 * code so the category and group fill themselves in from the master chart.
 */
/**
 * The four buckets an inspector writes a violation under.
 *
 * Offered first, on every party, because they are what a person reading the paper
 * report is looking at — the specific code comes off the sheet afterwards, in the
 * search below. A list that opens on seven specific defects makes you scan for
 * yours; a list that opens on four categories matches the form in your hand.
 */
export const VIOLATION_BASICS: readonly { label: string; code: string }[] = [
    { label: "Vehicle Maintenance", code: "396.3" },
    { label: "Driver Fitness", code: "391.11" },
    { label: "Cargo Securement", code: "392.9A" },
    { label: "Hours of Service Compliance", code: "395.8" },
];

export const ROADSIDE_PRESETS: Record<PartyKind, readonly { label: string; code: string }[]> = {
    truck: [
        { label: "Brakes out of adjustment", code: "393.47(e)" },
        { label: "Brake hose/tubing chafing", code: "393.45(a)(4)" },
        { label: "Inoperative required lamp", code: "393.9" },
        { label: "Tire tread below 4/32 (steer)", code: "393.75(b)" },
        { label: "Flat tire or audible air leak", code: "393.75(a)(3)" },
        { label: "Oil and/or grease leak", code: "396.5(b)" },
        { label: "Windshield obstructed", code: "393.60EWS" },
    ],
    trailer: [
        { label: "Brakes out of adjustment", code: "393.47(e)" },
        { label: "Inoperative required lamp", code: "393.9" },
        { label: "Tire tread below 2/32", code: "393.75(c)" },
        { label: "Flat tire or audible air leak", code: "393.75(a)(3)" },
        { label: "Cargo not secured", code: "393.106(b)" },
        { label: "No reflective sheeting on mud flaps", code: "393.11TL" },
    ],
    driver: [
        { label: "No record of duty status", code: "395.8(a)" },
        { label: "Exceeding the 11-hour driving limit", code: "395.3(a)(3)" },
        { label: "30-minute break not taken", code: "395.3(a)(3)(ii)" },
        { label: "No medical certificate", code: "391.41(a)" },
        { label: "Seat belt not worn", code: "392.16" },
        { label: "More than one driver's licence", code: "383.21" },
    ],
};


export interface RoadsideInspection {
    id: string;
    accountId: string;

    // What happened, and when
    date: string;
    startTime?: string;
    endTime?: string;
    level: InspectionLevel;
    location: string;
    /** The looked-up address behind `location`, when it came from the lookup. */
    locationCity?: string;
    locationState?: string;
    locationCountry?: string;
    result: InspectionResult;
    /** Anything placed out of service — the vehicle, the trailer, or the driver. */
    oos: boolean;
    citationIssued: boolean;
    /** Required when a citation was issued; the number printed on it. */
    citationNumber?: string;

    // What was inspected
    truck: RoadsideParty;
    trailer: RoadsideParty;
    driver: RoadsideParty;

    /** What the power unit had run at the roadside, and in which unit of distance. */
    truckOdometer?: string;
    truckOdometerUnit?: DistanceUnit;

    notes?: string;

    /** Handed over at the roadside by the inspector. */
    reports: RoadsideDoc[];
    /** Performed after the defect was fixed. */
    remediation: RoadsideDoc[];
    /** What the repair cost, against the units it was spent on. */
    repairBills: RoadsideDoc[];

    createdAt: string;
    createdBy: string;
    updatedAt?: string;
}

// ── What still has to happen ────────────────────────────────────────────────

export type InspectionStage = "clean" | "awaiting-report" | "awaiting-repair" | "closed";

export const STAGE_LABEL: Record<InspectionStage, string> = {
    clean: "Clean",
    "awaiting-report": "Awaiting remediation",
    "awaiting-repair": "Awaiting repair bill",
    closed: "Closed",
};

export const STAGE_TONE: Record<InspectionStage, string> = {
    clean: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "awaiting-report": "border-rose-200 bg-rose-50 text-rose-700",
    "awaiting-repair": "border-amber-200 bg-amber-50 text-amber-700",
    closed: "border-slate-200 bg-slate-50 text-slate-600",
};

/** Every violation found, across all three parties. */
export const allViolations = (i: RoadsideInspection): TicketViolation[] =>
    [i.truck, i.trailer, i.driver].flatMap((p) => (p.hasViolation ? p.violations : []));

/** Was anything found against the equipment? That is what needs fixing and re-inspecting. */
export const hasVehicleViolation = (i: RoadsideInspection): boolean =>
    (i.truck.hasViolation && i.truck.violations.length > 0) ||
    (i.trailer.hasViolation && i.trailer.violations.length > 0);

/**
 * Does a maintenance cost belong on this record?
 *
 * Read off the violation categories rather than asked as a separate question:
 * the inspector already said what was wrong, and a form that asks the office to
 * re-classify it gets a different answer than the report.
 */
export const isMaintenanceRelated = (i: RoadsideInspection): boolean =>
    allViolations(i).some((v) =>
        /maintenance|brake|light|tire|wheel|coupling|cargo secure|steering|suspension|exhaust|frame|fuel system|windshield|wiper|defect/i.test(
            `${v.category ?? ""} ${v.group ?? ""} ${v.subtype ?? v.label}`,
        ),
    );

/**
 * Where this inspection has got to.
 *
 * Deliberately derived rather than stored: a status somebody has to remember to
 * change is a status that is wrong by Thursday. Nothing found → clean. Something
 * found on the equipment → it needs a remediation inspection, and if the fault
 * was a maintenance one it needs the bill for the work as well.
 */
/**
 * Is a re-inspection owed on this one?
 *
 * The RESULT decides it, not a reading of the violation list. A failed inspection
 * is a failed inspection: something has to be put right and somebody has to say
 * it was, whether what failed was a brake drum or the driver's logbook. Reading
 * it off the categories instead meant a Fail could quietly close itself because
 * nothing on it looked mechanical.
 */
export const remediationRequired = (i: RoadsideInspection): boolean => i.result === "Fail" || i.oos;

export function inspectionStage(i: RoadsideInspection): InspectionStage {
    if (!remediationRequired(i)) {
        // Passed, and nothing ordered off the road. A violation noted on a pass is
        // recorded and done — there is nothing outstanding to chase.
        return allViolations(i).length > 0 ? "closed" : "clean";
    }
    if (i.remediation.length === 0) return "awaiting-report";
    if (isMaintenanceRelated(i) && i.repairBills.length === 0) return "awaiting-repair";
    return "closed";
}

/** The one line a list row needs: which units were looked at. */
export const unitsLabel = (i: RoadsideInspection): string =>
    [i.truck.label, i.trailer.label].filter(Boolean).join(" · ") || "—";

/** "Level II" out of the long official name — what fits in a column. */
export const shortLevel = (l: string): string => l.split("—")[0].trim();

/** "09:30 → 11:15", or just the start, or nothing. */
export function durationLabel(i: RoadsideInspection): string {
    if (i.startTime && i.endTime) return `${i.startTime} → ${i.endTime}`;
    return i.startTime || i.endTime || "—";
}

// ── Store ───────────────────────────────────────────────────────────────────
//
// The same shape the tickets store uses: localStorage behind
// `useSyncExternalStore`, so a driver-app upload and the office list are looking
// at one array rather than two copies that drift.

const STORAGE_KEY = "tracksmart_roadside_inspections_v1";

function load(): RoadsideInspection[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as RoadsideInspection[]) : [];
    } catch {
        return [];
    }
}

function persist(list: RoadsideInspection[]): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
        /* quota — the demo carries on with what is in memory */
    }
}

let records: RoadsideInspection[] = load();
const listeners = new Set<() => void>();

function commit(next: RoadsideInspection[]): void {
    records = next;
    persist(next);
    for (const l of listeners) l();
}

const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

/** Every inspection for a carrier, newest first. */
export function getInspections(accountId?: string): RoadsideInspection[] {
    const all = accountId ? records.filter((r) => r.accountId === accountId) : records;
    return [...all].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const getInspectionById = (id: string): RoadsideInspection | undefined =>
    records.find((r) => r.id === id);

export function saveInspection(next: RoadsideInspection): RoadsideInspection {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    const exists = records.some((r) => r.id === stamped.id);
    commit(exists ? records.map((r) => (r.id === stamped.id ? stamped : r)) : [stamped, ...records]);
    return stamped;
}

export function deleteInspection(id: string): void {
    commit(records.filter((r) => r.id !== id));
}

/**
 * Attach a document to one of the three shelves.
 *
 * Its own entry point rather than a full save, because the driver app writes
 * here from a phone with none of the rest of the record in hand — and a full
 * save from there would overwrite whatever the office typed in the meantime.
 */
export function addInspectionDoc(
    id: string,
    shelf: "reports" | "remediation" | "repairBills",
    doc: RoadsideDoc,
): void {
    const target = records.find((r) => r.id === id);
    if (!target) return;
    saveInspection({ ...target, [shelf]: [...target[shelf], doc] });
}

export function removeInspectionDoc(
    id: string,
    shelf: "reports" | "remediation" | "repairBills",
    docId: string,
): void {
    const target = records.find((r) => r.id === id);
    if (!target) return;
    saveInspection({ ...target, [shelf]: target[shelf].filter((d) => d.id !== docId) });
}

/** The list, live. Re-renders when a driver uploads from their phone. */
export function useInspections(accountId?: string): RoadsideInspection[] {
    useSyncExternalStore(subscribe, () => records, () => records);
    return getInspections(accountId);
}

/** One record, live — the detail page follows its own uploads without a reload. */
export function useInspection(id: string | undefined): RoadsideInspection | undefined {
    useSyncExternalStore(subscribe, () => records, () => records);
    return id ? getInspectionById(id) : undefined;
}

// ── A blank one ─────────────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

export const todayIso = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export const newInspectionId = (): string =>
    `RSI-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;

export function blankInspection(accountId: string, createdBy: string): RoadsideInspection {
    return {
        id: newInspectionId(),
        accountId,
        date: todayIso(),
        level: INSPECTION_LEVELS[0],
        location: "",
        result: "Pass",
        oos: false,
        citationIssued: false,
        truck: emptyParty(),
        trailer: emptyParty(),
        driver: emptyParty(),
        reports: [],
        remediation: [],
        repairBills: [],
        createdAt: new Date().toISOString(),
        createdBy,
    };
}

/**
 * How many pages one record may carry.
 *
 * A repair is the bill, the parts list and a photograph of the old part — three pages of
 * one document, not three documents. Past about ten it stops being a record and becomes a
 * filing cabinet nobody reads.
 */
export const MAX_DOC_FILES = 10;

/** One more page of the same document. */
export const newAttachment = (file: File) => ({
    id: `att-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    name: file.name,
    size: file.size,
    url: typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : undefined,
});

export const newDoc = (file: File, by: string, source: DocSource = "portal"): RoadsideDoc => ({
    id: `doc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    name: file.name,
    size: file.size,
    // A real object URL, so View opens the file the person just picked.
    url: typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : undefined,
    uploadedAt: new Date().toISOString(),
    uploadedBy: by,
    source,
});

// ── Roster helpers ──────────────────────────────────────────────────────────
//
// The pickers list the carrier's real fleet, so an inspection is bound to the
// unit it happened to rather than to a unit number somebody typed.

export interface UnitOption { id: string; label: string; detail: string }

const TRAILER_RE = /trailer/i;

export function truckOptions(accountId?: string): UnitOption[] {
    if (!accountId) return [];
    return getAssetsForAccount(accountId)
        .filter((a) => !TRAILER_RE.test(a.assetType))
        .map((a) => ({
            id: a.id,
            label: a.unitNumber,
            detail: [a.year, a.make, a.model].filter(Boolean).join(" ") || a.assetType,
        }));
}

export function trailerOptions(accountId?: string): UnitOption[] {
    if (!accountId) return [];
    return getAssetsForAccount(accountId)
        .filter((a) => TRAILER_RE.test(a.assetType))
        .map((a) => ({
            id: a.id,
            label: a.unitNumber,
            detail: [a.year, a.make, a.model].filter(Boolean).join(" ") || a.assetType,
        }));
}

export function driverOptions(accountId?: string): UnitOption[] {
    if (!accountId) return [];
    return getDriversForAccount(accountId).map((d) => ({
        id: d.id,
        label: d.name,
        detail: d.licenseNumber ? `CDL ${d.licenseNumber}` : (d.status ?? ""),
    }));
}

/** All units on a record, for a repair bill to be filed against. */
export function unitOptionsFor(i: RoadsideInspection): UnitOption[] {
    const out: UnitOption[] = [];
    if (i.truck.id && i.truck.label) out.push({ id: i.truck.id, label: i.truck.label, detail: "Truck" });
    if (i.trailer.id && i.trailer.label) out.push({ id: i.trailer.id, label: i.trailer.label, detail: "Trailer" });
    return out;
}

// ── Seed ────────────────────────────────────────────────────────────────────
//
// Three records against the carrier's real roster, one in each state the page
// exists to show: clean, waiting on a re-inspection, and closed with the bill
// filed. Seeded once — after that the store is whatever the user has done.

// Bumped when the seeded demo changes, so a carrier already seeded picks it up.
const SEEDED_KEY = "tracksmart_roadside_seeded_v2";

function seedViolation(label: string, code: string, category: string, group: string, oos: boolean): TicketViolation {
    return { label, subtype: label, code, category, group, isOos: oos, source: "sms" };
}

export function seedInspections(accountId: string): void {
    if (typeof window === "undefined" || !accountId) return;
    try {
        const done = JSON.parse(window.localStorage.getItem(SEEDED_KEY) || "[]");
        if (Array.isArray(done) && done.includes(accountId)) return;
        window.localStorage.setItem(SEEDED_KEY, JSON.stringify([...(Array.isArray(done) ? done : []), accountId]));
    } catch {
        return;
    }
    // Anything the user recorded stays; only the previous demo rows are replaced. The
     // seeded ids are namespaced for exactly this, so a seed that gets richer can reach a
     // carrier that was seeded with the older one.
    const SEED_PREFIX = `RSI-SEED-${accountId}-`;
    const mine = records.filter((r) => r.accountId === accountId);
    if (mine.some((r) => !r.id.startsWith(SEED_PREFIX))) {
        // This carrier has real records. Leave it alone entirely.
        if (mine.length > 0) return;
    }

    const trucks = truckOptions(accountId);
    const trailers = trailerOptions(accountId);
    const drivers = driverOptions(accountId);
    if (!trucks.length || !drivers.length) return;

    const unit = (list: UnitOption[], i: number) => list[i % Math.max(1, list.length)];
    const now = new Date().toISOString();
    const dayBefore = (n: number) => {
        const d = new Date();
        d.setDate(d.getDate() - n);
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };

    const t0 = unit(trucks, 0), t1 = unit(trucks, 1), t2 = unit(trucks, 2);
    /*
     * A real shop off this carrier's own list for the seeded bills.
     *
     * Not a typed name. The bill carries the vendor's ID so it can be found from the
     * vendor's page — "what has this shop charged us" is the question a renewal turns on,
     * and a bill that only carries a string cannot answer it without matching text.
     */
    const all = VENDORS.filter((v) => v.accountId === accountId);
    /*
     * A repair shop, not whichever vendor happens to be first.
     *
     * The carrier's list is mostly fuel cards, transponders and telematics, and the first
     * of them was getting the brake bill — a toll account invoicing for a wheel seal
     * reads as nonsense the moment anybody looks at it. Repair and Maintenance vendors
     * first; anything else only if the carrier has no shop on its list at all.
     */
    const shops = all.filter((v) => v.categoryId === "cat-repair-maintenance");
    const pool = shops.length ? shops : all;
    const shop = pool[0];
    const shop2 = pool[1] ?? shop;
    const tr0 = trailers.length ? unit(trailers, 0) : undefined;
    const tr1 = trailers.length ? unit(trailers, 1) : undefined;
    const d0 = unit(drivers, 0), d1 = unit(drivers, 1), d2 = unit(drivers, 2);

    const seeded: RoadsideInspection[] = [
        {
            id: `RSI-SEED-${accountId}-1`,
            accountId,
            date: dayBefore(4),
            startTime: "08:40",
            endTime: "09:25",
            level: INSPECTION_LEVELS[1],
            location: "I-80 WB, Mile 214 — Elkhart, IN",
            result: "Fail",
            oos: true,
            citationIssued: true,
            citationNumber: "IN-2026-884120",
            truck: {
                id: t0.id, label: t0.label, hasViolation: true,
                violations: [
                    seedViolation("Brakes out of adjustment", "393.47", "Vehicle Maintenance", "Brakes", true),
                    seedViolation("Inoperative required lamp", "393.9", "Vehicle Maintenance", "Lighting", false),
                ],
            },
            trailer: tr0
                ? { id: tr0.id, label: tr0.label, hasViolation: true, violations: [seedViolation("Tire tread depth less than 2/32", "393.75(c)", "Vehicle Maintenance", "Tires", true)] }
                : emptyParty(),
            driver: { id: d0.id, label: d0.label, hasViolation: false, violations: [] },
            notes: "Placed out of service at the scale. Towed to Elkhart Truck Center the same afternoon.",
            reports: [{
                id: "seed-rep-1", name: "IN-inspection-report.pdf", size: 184_320,
                // A real file behind it: a seeded row whose View opens nothing teaches
                // the wrong thing about the screen it is demonstrating.
                url: "/demo-docs/annual-inspection.pdf",
                uploadedAt: now, uploadedBy: "Inspector copy", source: "portal",
            }],
            remediation: [],
            repairBills: [],
            createdAt: now,
            createdBy: "Safety Manager",
        },
        {
            id: `RSI-SEED-${accountId}-2`,
            accountId,
            date: dayBefore(12),
            startTime: "14:05",
            endTime: "14:50",
            level: INSPECTION_LEVELS[0],
            location: "Weigh station — Breezewood, PA",
            result: "Fail",
            oos: false,
            citationIssued: false,
            truck: {
                id: t1.id, label: t1.label, hasViolation: true,
                violations: [seedViolation("Oil and/or grease leak", "396.5(b)", "Vehicle Maintenance", "Leaks", false)],
            },
            trailer: tr1 ? { id: tr1.id, label: tr1.label, hasViolation: false, violations: [] } : emptyParty(),
            driver: { id: d1.id, label: d1.label, hasViolation: false, violations: [] },
            notes: "Minor leak at the steer hub. Repaired in-house.",
            reports: [{
                id: "seed-rep-2", name: "PA-inspection-report.pdf", size: 152_064,
                url: "/demo-docs/annual-inspection.pdf",
                uploadedAt: now, uploadedBy: "Inspector copy", source: "portal",
            }],
            remediation: [{
                id: "seed-rem-2", name: "re-inspection-signed.pdf", size: 98_304,
                url: "/demo-docs/compliance-document.pdf",
                uploadedAt: now, uploadedBy: "Fleet Shop", source: "portal",
                performedBy: "mechanic", performedOn: dayBefore(11),
            }, {
                // A second copy, from the driver's phone — the list has to be able to
                // show more than one record under a kind, and to say where each came from.
                id: "seed-rem-2b", name: "driver-photo-recheck.pdf", size: 61_440,
                url: "/demo-docs/compliance-document.pdf",
                uploadedAt: now, uploadedBy: d1.label, source: "driver-app",
                performedBy: "driver", performedOn: dayBefore(10),
            }],
            repairBills: [{
                id: "seed-bill-2", name: "shop-invoice-44812.pdf", size: 76_800,
                url: "/demo-docs/business-registration.pdf",
                uploadedAt: now, uploadedBy: "Safety Manager", source: "portal",
                invoiceNumber: "INV-44812",
                documentDate: dayBefore(10),
                vendorId: shop?.id,
                vendorCompany: shop?.companyName || shop?.name,
                vendorName: shop?.contactName || shop?.name,
                vendorEmail: shop?.email,
                vendorPhone: shop?.phone,
                performedBy: "mechanic",
                performedByName: shop?.contactName || "Shop mechanic",
                currency: "USD",
                labour: "280.00",
                parts: "132.60",
                assetIds: [t1.id], amount: "412.60",
                assetAmounts: { [t1.id]: "412.60" },
            }],
            createdAt: now,
            createdBy: "Safety Manager",
        },
        {
            id: `RSI-SEED-${accountId}-3`,
            accountId,
            date: dayBefore(21),
            startTime: "11:20",
            endTime: "11:35",
            level: INSPECTION_LEVELS[2],
            location: "US-30 — North Platte, NE",
            result: "Pass",
            oos: false,
            citationIssued: false,
            truck: { id: t2.id, label: t2.label, hasViolation: false, violations: [] },
            trailer: emptyParty(),
            driver: { id: d2.id, label: d2.label, hasViolation: false, violations: [] },
            notes: "Credentials only. Clean.",
            reports: [{
                id: "seed-rep-3", name: "NE-inspection-report.pdf", size: 121_856,
                url: "/demo-docs/annual-inspection.pdf",
                uploadedAt: now, uploadedBy: "Inspector copy", source: "portal",
            }],
            remediation: [],
            repairBills: [],
            createdAt: now,
            createdBy: "Safety Manager",
        },
        /*
         * A fail that was fixed, paid for and closed — by a DIFFERENT shop.
         *
         * The three above cover the three stages; this one covers what the money side
         * needs: roadside repair spend is not all with one garage. A vendor's page adds up
         * what that shop has charged across planned work and roadside work both, and with
         * a single billed inspection in the whole demo, four vendors out of five showed a
         * roadside total of nothing and the column could not be read at all.
         */
        {
            id: `RSI-SEED-${accountId}-4`,
            accountId,
            date: dayBefore(34),
            startTime: "06:15",
            endTime: "07:05",
            level: INSPECTION_LEVELS[0],
            location: "I-70 EB, Mile 68 — Hays, KS",
            result: "Fail",
            oos: false,
            citationIssued: false,
            truck: {
                id: t2.id, label: t2.label, hasViolation: true,
                violations: [seedViolation("Windshield wipers inoperative", "393.78", "Vehicle Maintenance", "Windshield", false)],
            },
            trailer: tr0
                ? { id: tr0.id, label: tr0.label, hasViolation: true, violations: [seedViolation("Inoperative required lamp", "393.9", "Vehicle Maintenance", "Lighting", false)] }
                : emptyParty(),
            driver: { id: d1.id, label: d1.label, hasViolation: false, violations: [] },
            notes: "Wipers and a trailer marker lamp. Fixed the same day at Hays; back on the road by noon.",
            reports: [{
                id: "seed-rep-4", name: "KS-inspection-report.pdf", size: 142_336,
                url: "/demo-docs/annual-inspection.pdf",
                uploadedAt: now, uploadedBy: "Inspector copy", source: "portal",
            }],
            remediation: [{
                id: "seed-rem-4", name: "repair-confirmation.pdf", size: 58_112,
                url: "/demo-docs/annual-inspection.pdf",
                uploadedAt: now, uploadedBy: "Safety Manager", source: "portal",
                performedBy: "mechanic",
                performedByName: shop2?.contactName || "Shop mechanic",
                performedOn: dayBefore(34),
            }],
            repairBills: [{
                id: "seed-bill-4", name: "shop-invoice-51203.pdf", size: 64_512,
                url: "/demo-docs/business-registration.pdf",
                uploadedAt: now, uploadedBy: "Safety Manager", source: "portal",
                invoiceNumber: "INV-51203",
                documentDate: dayBefore(34),
                vendorId: shop2?.id,
                vendorCompany: shop2?.companyName || shop2?.name,
                vendorName: shop2?.contactName || shop2?.name,
                vendorEmail: shop2?.email,
                vendorPhone: shop2?.phone,
                performedBy: "mechanic",
                performedByName: shop2?.contactName || "Shop mechanic",
                currency: "USD",
                labour: "95.00",
                parts: "64.80",
                // One invoice, two units — which is why a bill carries a share per unit
                // rather than a single total.
                assetIds: tr0 ? [t2.id, tr0.id] : [t2.id],
                amount: "159.80",
                assetAmounts: tr0 ? { [t2.id]: "112.30", [tr0.id]: "47.50" } : { [t2.id]: "159.80" },
            }],
            createdAt: now,
            createdBy: "Safety Manager",
        },
    ];

    commit([...seeded, ...records.filter((r) => !r.id.startsWith(SEED_PREFIX))]);
}
