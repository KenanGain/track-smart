// Settings ▸ DQ Files — the model behind a Driver Qualification File template.
//
// A DQ template is a NAMED, TYPED (Cross Border / US Only / Canada Only) file made
// of editable SECTIONS, each holding ITEMS. An item comes from one of two sources —
//   • 'document' — a record from the Default / New Compliance & Documents catalog
//                  (SAFETY_RECORDS + the carrier's custom records), OR
//   • 'form'     — an application Consent form or an Onboarding form, fulfilled by
//                  Fill (send the request form to sign) or Upload (attach a signed PDF),
//   • 'custom'   — a plain labelled line the user typed.
// Each item carries TWO axes:
//   • requirement — Must / Optional (does the file require it?)
//   • monitor     — how it's tracked, UNIFIED with the compliance-monitoring system:
//                   Annual review / Every month / On expiry / On issue date / Status only.
//
// Persists to localStorage with a CustomEvent so open tabs stay in sync (same shape
// as hiring-process/checklists.data.ts).

import { useEffect, useState } from "react";
import {
    DEFAULT_MONITORING, reminderSummary,
    type MonitoringConfig, type RenewalRecurrence,
} from "@/pages/compliance/compliance-monitoring.data";

// ── Driver type (the checklist "type") ─────────────────────────────────────────
export type DqDriverTypeId = "cross_border" | "us_only" | "canada_only";

export const DQ_DRIVER_TYPES: { id: DqDriverTypeId; label: string; blurb: string }[] = [
    { id: "cross_border", label: "Cross Border", blurb: "Drivers crossing the US ↔ Canada border." },
    { id: "us_only", label: "US Only", blurb: "Drivers operating within the United States." },
    { id: "canada_only", label: "Canada Only", blurb: "Drivers operating within Canada." },
];

export const driverTypeLabel = (id: DqDriverTypeId) => DQ_DRIVER_TYPES.find(t => t.id === id)?.label ?? id;

// ── Jurisdiction (template-level + per-row filter) ──────────────────────────────
export const DQ_JURISDICTIONS: string[] = [
    "Cross-border (US & Canada)", "United States (federal)", "Canada (federal)",
    "Ontario", "Quebec", "British Columbia", "Alberta", "Manitoba", "Saskatchewan",
    "Nova Scotia", "New Brunswick", "Newfoundland & Labrador", "Prince Edward Island",
];
export const defaultJurisdictionFor = (type: DqDriverTypeId): string =>
    type === "cross_border" ? "Cross-border (US & Canada)" : type === "us_only" ? "United States (federal)" : "Canada (federal)";

// ── Axis 1: requirement (Must / Optional) ──────────────────────────────────────
export type DqRequirement = "must" | "optional";
export const DQ_REQUIREMENTS: { id: DqRequirement; label: string; hint: string; chip: string }[] = [
    { id: "must", label: "Must", hint: "Required in the DQ file", chip: "bg-rose-50 text-rose-700 ring-1 ring-rose-200" },
    { id: "optional", label: "Optional", hint: "Conditional / if applicable", chip: "bg-slate-100 text-slate-600 ring-1 ring-slate-200" },
];
export const requirementMeta = (id: DqRequirement) => DQ_REQUIREMENTS.find(r => r.id === id) ?? DQ_REQUIREMENTS[0];

// ── Axis 2: monitoring — the REAL document-monitoring config ─────────────────────
// Each item carries a full MonitoringConfig (monitor-based-on + recurrence +
// reminder days + channels), the same shape edited by the Monitoring &
// Notifications card everywhere else (compliance-monitoring.data). A disabled
// config = "Status only" (on file, no date schedule).
const RECURRENCE_LABEL: Record<RenewalRecurrence, string> = {
    annually: "Annually", biannually: "Biannually", quarterly: "Quarterly", monthly: "Monthly", none: "No recurrence",
};

/** Fresh monitoring config from a short token (used by the seed + inference). */
type MonToken = "annual" | "monthly" | "expiry" | "issue" | "status";
function monFromToken(t: MonToken): MonitoringConfig {
    const base: MonitoringConfig = { ...DEFAULT_MONITORING, reminders: { ...DEFAULT_MONITORING.reminders }, channels: { ...DEFAULT_MONITORING.channels } };
    switch (t) {
        case "annual": return { ...base, enabled: true, monitorBasedOn: "expiry", renewalRecurrence: "annually" };
        case "monthly": return { ...base, enabled: true, monitorBasedOn: "expiry", renewalRecurrence: "monthly" };
        case "expiry": return { ...base, enabled: true, monitorBasedOn: "expiry", renewalRecurrence: "none" };
        case "issue": return { ...base, enabled: true, monitorBasedOn: "issue_date", renewalRecurrence: "none" };
        case "status": return { ...base, enabled: false };
    }
}

/** Infer a monitoring config from a catalog record's monitor type / recurrence. */
export function inferMonitoring(monitorType?: string, recurring?: string): MonitoringConfig {
    const s = `${monitorType ?? ""} ${recurring ?? ""}`.toLowerCase();
    if (s.includes("annual") || s.includes("review")) return monFromToken("annual");
    if (s.includes("month")) return monFromToken("monthly");
    if (s.includes("issue")) return monFromToken("issue");
    if (s.includes("expiry") || s.includes("expir") || s.includes("renewal") || s.includes("valid-to") || s.includes("registration-year")) return monFromToken("expiry");
    return monFromToken("status");
}

/** Compact one-line summary of a monitoring config (for chips / the DQ document). */
export function monitoringSummary(cfg?: MonitoringConfig): string {
    if (!cfg || !cfg.enabled) return "Status only";
    const basedOn = cfg.monitorBasedOn === "expiry" ? "Expiry" : "Issue date";
    const rec = RECURRENCE_LABEL[cfg.renewalRecurrence];
    return cfg.renewalRecurrence === "none" ? basedOn : `${basedOn} · ${rec}`;
}

/** Reminder-days summary, e.g. "90, 60, 30 days before" (re-export for callers). */
export const monitoringReminders = (cfg?: MonitoringConfig): string => (cfg && cfg.enabled ? reminderSummary(cfg) : "");

// ── Form fulfilment (forms only) ───────────────────────────────────────────────
// Fill  = send the hiring request form for the driver to complete.
// Upload = attach a signed PDF (drivers already on the account skip hiring).
export type DqFulfill = "fill" | "upload";
export const DQ_FULFILL: { id: DqFulfill; label: string; hint: string }[] = [
    { id: "fill", label: "Fill", hint: "Driver completes the request form" },
    { id: "upload", label: "Upload", hint: "Attach a PDF (already-on-account drivers)" },
];

// ── Check time (how often to re-check the item — drives notifications) ───────────
export type DqCheckTime = "none" | "weekly" | "monthly" | "annual";
export const DQ_CHECK_TIMES: { id: DqCheckTime; label: string; sentence: string }[] = [
    { id: "none", label: "No schedule", sentence: "Keep a current copy on file" },
    { id: "weekly", label: "Weekly", sentence: "Weekly record check" },
    { id: "monthly", label: "Monthly", sentence: "Monthly record check" },
    { id: "annual", label: "Annual", sentence: "Annual record check" },
];
export const checkTimeMeta = (id?: DqCheckTime) => DQ_CHECK_TIMES.find(t => t.id === id) ?? DQ_CHECK_TIMES[0];
/** Derive a default check time from an inferred monitoring config. */
export function checkTimeFromMonitoring(cfg?: MonitoringConfig): DqCheckTime {
    if (!cfg || !cfg.enabled) return "none";
    if (cfg.renewalRecurrence === "annually") return "annual";
    if (cfg.renewalRecurrence === "monthly") return "monthly";
    return "none";
}

// ── Item / Section ──────────────────────────────────────────────────────────────
export type DqItemSource = "document" | "form" | "custom";

export interface DqItem {
    id: string;
    source: DqItemSource;
    /** SafetyRecord.id (document) | "consent:<id>" / "onbform:<id>" (form). Absent for custom items. */
    refId?: string;
    /** Denormalized display label — always shown, survives a missing ref. */
    label: string;
    requirement: DqRequirement;
    /** Full document-monitoring config (recurrence + reminders). Disabled = "Status only". */
    monitoring: MonitoringConfig;
    /** Forms only — how the form is fulfilled. */
    fulfill?: DqFulfill;
    /** How often to re-check the item (notification cadence). */
    checkTime?: DqCheckTime;
    /** "(list)" — a repeatable item (several documents on file). */
    list?: boolean;
    /** Clarifying note, e.g. "If going to USA". */
    note?: string;
    /** Jurisdiction carried from the source record (informational). */
    jurisdiction?: string;
}

export interface DqSection {
    id: string;
    title: string;
    items: DqItem[];
}

export interface DqChecklist {
    id: string;
    name: string;
    type: DqDriverTypeId;
    description?: string;
    jurisdiction?: string;
    sections: DqSection[];
    updatedAt: string;
}

// ── ids ───────────────────────────────────────────────────────────────────────
export function uidDq(prefix = "dq"): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
const today = () => new Date().toISOString().slice(0, 10);

// ── Item / section builders ────────────────────────────────────────────────────
export function newDqItem(source: DqItemSource, patch: Partial<DqItem> = {}): DqItem {
    return {
        id: uidDq("dqi"),
        source,
        label: "",
        requirement: "must",
        monitoring: monFromToken("status"),
        ...(source === "form" ? { fulfill: "fill" as DqFulfill } : {}),
        ...patch,
    };
}
export function emptyDqSection(title = "New section"): DqSection {
    return { id: uidDq("dqs"), title, items: [] };
}

// Infer the two axes when a document record is ticked in the builder.
export function inferRequirement(docRequirement?: string): DqRequirement {
    return docRequirement === "optional" ? "optional" : "must";
}

// ── Roll-up helpers ────────────────────────────────────────────────────────────
export const flattenItems = (cl: DqChecklist): DqItem[] => cl.sections.flatMap(s => s.items);
export const itemCount = (cl: DqChecklist) => flattenItems(cl).length;
export const documentCount = (cl: DqChecklist) => flattenItems(cl).filter(i => i.source === "document").length;
export const formCount = (cl: DqChecklist) => flattenItems(cl).filter(i => i.source === "form").length;
export const sectionCount = (cl: DqChecklist) => cl.sections.length;

// ── Seed: the default DQ File structure ─────────────────────────────────────────
// Built deterministically (ids from section/item indices) so seeds are stable across
// reloads. `refId`s reference real ids in safety-software-catalog.data (documents) and
// document-templates.data (forms); labels are explicit so they never depend on catalog
// wording.
type SeedItem = {
    source: DqItemSource; label: string; refId?: string;
    req: DqRequirement; mon: MonToken; fulfill?: DqFulfill; list?: boolean; note?: string;
};
type SeedSection = { title: string; items: SeedItem[] };

const doc = (label: string, refId: string, req: DqRequirement, mon: MonToken, extra: Partial<SeedItem> = {}): SeedItem =>
    ({ source: "document", label, refId, req, mon, ...extra });
const form = (label: string, refId: string, req: DqRequirement, mon: MonToken, fulfill: DqFulfill = "fill", extra: Partial<SeedItem> = {}): SeedItem =>
    ({ source: "form", label, refId, req, mon, fulfill, ...extra });
const custom = (label: string, req: DqRequirement, mon: MonToken, extra: Partial<SeedItem> = {}): SeedItem =>
    ({ source: "custom", label, req, mon, ...extra });

const SEED_SECTIONS: SeedSection[] = [
    { title: "DQ File", items: [
        custom("Application for Employment", "must", "status"),
        doc("Certificate of Road Test or Equivalent Evaluation", "road-test", "must", "status"),
        doc("Clearing House Query", "clearinghouse-query", "optional", "status", { note: "If going to USA" }),
    ] },
    { title: "Disclosures and Authorizations", items: [
        custom("Driver Contract", "must", "status"),
        custom("Company Policy Documents", "must", "status", { list: true, note: "List of policy documents" }),
        form("Fair Credit Reporting Act Disclosure", "consent:fcra-disclosure", "must", "status"),
        form("Non-Commercial Abstract Release Consent", "consent:mvr-release", "must", "status"),
        form("PSP Disclosure & Authorization", "consent:psp-disclosure-auth", "optional", "status", "fill", { note: "If going to USA" }),
        doc("Offer Letter / Contract", "offer-letter", "must", "status"),
    ] },
    { title: "Driver License (Current & Historical)", items: [
        doc("Driver License", "cdl", "must", "expiry", { list: true }),
    ] },
    { title: "SIN Card", items: [
        doc("SIN / SSN Card", "ssn-sin-card", "must", "status"),
    ] },
    { title: "Drug & Alcohol File", items: [
        doc("Drug & Alcohol Testing File", "drug-test", "must", "status", { list: true, note: "Pre-employment, random, reasonable suspicion, post-accident, return-to-duty & follow-up" }),
    ] },
    { title: "Medical Certificate & Report", items: [
        doc("Medical Certificate & Report", "medical-cert", "must", "expiry", { note: "Examiner must be listed on the National Registry of Certified Medical Examiners" }),
    ] },
    { title: "Previous Employment Documents", items: [
        doc("Job Experience Letters", "experience-letter", "must", "status", { list: true }),
        custom("Insurance Experience Letters", "must", "status", { list: true }),
        form("Safety Performance History Request", "consent:sph-records-request", "must", "status", "fill", { note: "Convictions & collisions" }),
    ] },
    { title: "Driver Personal & Commercial Abstracts", items: [
        doc("Driver Abstracts (Non-Commercial)", "mvr", "must", "annual", { list: true }),
        doc("Driver PSP", "psp-report", "optional", "status", { note: "If going to USA" }),
        doc("Driver Commercial Abstract", "driver-cvdr", "must", "annual", { list: true }),
        doc("US Visa", "visa", "optional", "expiry", { note: "If going to USA" }),
        custom("Copy of Work Permit", "optional", "expiry", { note: "If applicable" }),
    ] },
    { title: "Hours of Service Records", items: [
        custom("First-Time HOS Records", "must", "status", { list: true }),
        custom("Intermittent HOS Records", "must", "monthly", { list: true }),
    ] },
    { title: "Driver Training Certificates", items: [
        doc("Driver Training Certificates", "training-cert", "must", "annual", { list: true, note: "Pre-employment and ongoing" }),
    ] },
    { title: "Ongoing", items: [
        doc("Annual Driver Abstract Review", "driver-cvdr", "must", "annual", { list: true }),
        custom("Annual CVDR / CDA / CDR Record Review", "must", "annual", { list: true }),
        doc("Annual Review of Driver Records (Violations)", "annual-review", "must", "annual", { list: true }),
        custom("Disciplinary Records", "optional", "status", { list: true }),
        doc("Annual Clearing House Query", "clearinghouse-query", "must", "annual", { list: true, note: "If going to USA" }),
        doc("Training & Certification Record", "training-cert", "must", "annual", { list: true }),
    ] },
];

// The DQ file is ONE flat list — the seed groups above are flattened into a single
// "Driver Qualification File" section (the user can still add more sections in the builder).
function buildSections(clId: string): DqSection[] {
    const items: DqItem[] = [];
    SEED_SECTIONS.forEach((s, si) => s.items.forEach((it, ii) => items.push({
        id: `${clId}-s${si}-i${ii}`,
        source: it.source,
        refId: it.refId,
        label: it.label,
        requirement: it.req,
        monitoring: monFromToken(it.mon),
        checkTime: it.mon === "annual" ? "annual" : it.mon === "monthly" ? "monthly" : "none",
        ...(it.source === "form" ? { fulfill: it.fulfill ?? "fill" } : {}),
        ...(it.list ? { list: true } : {}),
        ...(it.note ? { note: it.note } : {}),
    })));
    return [{ id: `${clId}-sec`, title: "Driver Qualification File", items }];
}

// ── Checklist store ─────────────────────────────────────────────────────────────
const CHECKLIST_KEY = "settings:dq-checklists-v8";
const CHECKLIST_EVENT = "settings-dq-checklists-change";
const DELETED_KEY = "settings:dq-checklists-deleted-v8";

function seedChecklists(): DqChecklist[] {
    const mk = (id: string, name: string, type: DqDriverTypeId, description: string): DqChecklist =>
        ({ id, name, type, description, jurisdiction: defaultJurisdictionFor(type), sections: buildSections(id), updatedAt: today() });
    return [
        mk("dqcl-cross-border", "Cross Border DQ File", "cross_border", "Full DQ file for US ↔ Canada drivers."),
        mk("dqcl-us-only", "US Only DQ File", "us_only", "DQ file for US domestic drivers."),
        mk("dqcl-canada-only", "Canada Only DQ File", "canada_only", "DQ file for Canada domestic drivers."),
    ];
}

const CHECKLIST_SEED_IDS = new Set(seedChecklists().map(c => c.id));

function loadCustomChecklists(): DqChecklist[] {
    try { const raw = localStorage.getItem(CHECKLIST_KEY); if (raw) return JSON.parse(raw) as DqChecklist[]; } catch { /* ignore */ }
    return [];
}
export function loadDqChecklists(): DqChecklist[] {
    const stored = loadCustomChecklists();
    if (stored.length === 0) return seedChecklists();
    // Keep stored edits (incl. edited seeds); re-add only seed checklists the user hasn't touched/deleted.
    const storedSeedIds = new Set(stored.filter(c => CHECKLIST_SEED_IDS.has(c.id)).map(c => c.id));
    const deleted = new Set(readDeletedSeeds());
    const missingSeeds = seedChecklists().filter(c => !storedSeedIds.has(c.id) && !deleted.has(c.id));
    return [...stored, ...missingSeeds];
}

function readDeletedSeeds(): string[] {
    try { const raw = localStorage.getItem(DELETED_KEY); if (raw) return JSON.parse(raw) as string[]; } catch { /* ignore */ }
    return [];
}
function persistChecklists(list: DqChecklist[]) {
    try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(list)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(CHECKLIST_EVENT));
}

export function getDqChecklist(id?: string): DqChecklist | undefined {
    return loadDqChecklists().find(c => c.id === id);
}

export function blankDqChecklist(type: DqDriverTypeId = "cross_border"): DqChecklist {
    return { id: uidDq("dqcl"), name: "", type, description: "", jurisdiction: defaultJurisdictionFor(type), sections: [emptyDqSection("Documents")], updatedAt: today() };
}

export function useDqChecklists() {
    const [checklists, setChecklists] = useState<DqChecklist[]>(loadDqChecklists);
    useEffect(() => {
        const h = () => setChecklists(loadDqChecklists());
        window.addEventListener(CHECKLIST_EVENT, h);
        return () => window.removeEventListener(CHECKLIST_EVENT, h);
    }, []);
    const save = (c: DqChecklist) => {
        const cur = loadDqChecklists();
        const next = { ...c, updatedAt: today() };
        const idx = cur.findIndex(x => x.id === c.id);
        persistChecklists(idx >= 0 ? cur.map(x => (x.id === c.id ? next : x)) : [...cur, next]);
    };
    const remove = (id: string) => {
        persistChecklists(loadDqChecklists().filter(x => x.id !== id));
        if (CHECKLIST_SEED_IDS.has(id)) {
            const del = Array.from(new Set([...readDeletedSeeds(), id]));
            try { localStorage.setItem(DELETED_KEY, JSON.stringify(del)); } catch { /* ignore */ }
        }
    };
    return { checklists, save, remove };
}
