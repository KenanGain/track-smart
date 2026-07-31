// Settings ▸ DQ Files — the two-level model behind the FMCSA Driver
// Qualification File checklist, mirroring the Hiring Process / Onboarding Setup
// logic (catalog + builder):
//
//   • CATALOG  — the 8 FMCSA categories, each holding an editable pool of check
//                items (label + regulation citation + optional note). This is
//                the master list authored on the category tabs.
//   • CHECKLIST — a named, typed (Cross Border / US Only / Canada Only) list that
//                references selected catalog item ids. Composed on the first tab
//                by ticking the items it should contain.
//
// Both persist to localStorage with a CustomEvent so open tabs stay in sync
// (same shape as hiring-process/checklists.data.ts).

import { useEffect, useState } from "react";

// ── Driver type (the checklist "type") ─────────────────────────────────────────
export type DqDriverTypeId = "cross_border" | "us_only" | "canada_only";

export const DQ_DRIVER_TYPES: { id: DqDriverTypeId; label: string; blurb: string }[] = [
    { id: "cross_border", label: "Cross Border", blurb: "Drivers crossing the US ↔ Canada border." },
    { id: "us_only", label: "US Only", blurb: "Drivers operating within the United States." },
    { id: "canada_only", label: "Canada Only", blurb: "Drivers operating within Canada." },
];

export const driverTypeLabel = (id: DqDriverTypeId) => DQ_DRIVER_TYPES.find(t => t.id === id)?.label ?? id;

// ── Categories (the 8 catalog tabs) ────────────────────────────────────────────
export type DqCategoryId =
    | "driver_id_employment"
    | "mvr_driving_history"
    | "road_test_cdl"
    | "prev_employment_safety"
    | "medical_cert"
    | "drug_alcohol"
    | "ongoing_annual"
    | "additional_supporting";

export const DQ_CATEGORIES: { id: DqCategoryId; label: string; short: string; blurb: string }[] = [
    { id: "driver_id_employment", label: "Driver Identification & Employment Records", short: "Driver ID & Employment", blurb: "Application and proof of employment eligibility." },
    { id: "mvr_driving_history", label: "Motor Vehicle Records (MVRs) & Driving History", short: "MVRs & Driving History", blurb: "Motor vehicle records and annual driving-record reviews." },
    { id: "road_test_cdl", label: "Road Test / CDL Certification", short: "Road Test / CDL", blurb: "Road test or CDL skills-test certification." },
    { id: "prev_employment_safety", label: "Previous Employment & Safety Performance History", short: "Previous Employment & Safety", blurb: "Safety performance history and prior-employer inquiries." },
    { id: "medical_cert", label: "Medical Certification & Exemptions", short: "Medical Cert", blurb: "Medical examiner's certificate and any exemptions." },
    { id: "drug_alcohol", label: "Drug & Alcohol Program Compliance", short: "Drug & Alcohol", blurb: "Testing and FMCSA Clearinghouse queries." },
    { id: "ongoing_annual", label: "Ongoing / Annual Requirements", short: "Ongoing / Annual", blurb: "Recurring annual records that must stay current." },
    { id: "additional_supporting", label: "Additional / Supporting Records", short: "Additional / Supporting", blurb: "Training, endorsements and supporting documentation." },
];

export const categoryLabel = (id: DqCategoryId) => DQ_CATEGORIES.find(c => c.id === id)?.short ?? id;

// ── Catalog item ────────────────────────────────────────────────────────────
export interface DqCatalogItem {
    id: string;
    categoryId: DqCategoryId;
    label: string;
    /** Regulation citation, e.g. "§391.21". */
    citation?: string;
    /** Clarifying note, e.g. "if required". */
    note?: string;
}

// ── ids ───────────────────────────────────────────────────────────────────────
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
export function uidDq(prefix = "dq"): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}
const today = () => new Date().toISOString().slice(0, 10);

// ── Catalog seed (verbatim from the FMCSA DQ File Checklist template) ──────────
const ci = (categoryId: DqCategoryId, label: string, citation?: string, note?: string): DqCatalogItem =>
    ({ id: `dqi-${categoryId}-${slug(label)}`, categoryId, label, citation, note });

function seedCatalog(): DqCatalogItem[] {
    return [
        // Driver Identification & Employment Records
        ci("driver_id_employment", "Driver's Employment Application", "§391.21", "Includes past 10 years employment history."),
        ci("driver_id_employment", "Proof of employment eligibility", undefined, "If required."),
        // Motor Vehicle Records (MVRs) & Driving History
        ci("mvr_driving_history", "Initial MVR", "§391.23", "Within 30 days of hire."),
        ci("mvr_driving_history", "Annual MVR from each state of licensure", "§391.25"),
        ci("mvr_driving_history", "Annual Review of Driving Record", "§391.25(c)(2)"),
        ci("mvr_driving_history", "Driver's Annual List of Violations", "§391.27"),
        // Road Test / CDL Certification
        ci("road_test_cdl", "Road Test Certificate (§391.31) OR CDL Skills Test Certificate (§391.33)"),
        // Previous Employment & Safety Performance History
        ci("prev_employment_safety", "Safety Performance History Inquiries", "§391.23(d)", "3 years."),
        ci("prev_employment_safety", "Drug & Alcohol Testing History from prior employers", "§40.25"),
        ci("prev_employment_safety", "Documentation of non-responses / attempts"),
        // Medical Certification & Exemptions
        ci("medical_cert", "Medical Examiner's Certificate (MEC)", "§391.43"),
        ci("medical_cert", "Copy of Examiner's National Registry Listing", "§391.51(b)(8)"),
        ci("medical_cert", "Skill Performance Evaluation (SPE) Certificate", "§391.49", "If applicable."),
        ci("medical_cert", "FMCSA Exemption Letter(s)", undefined, "Vision, diabetes, etc."),
        // Drug & Alcohol Program Compliance
        ci("drug_alcohol", "Pre-Employment Negative Drug Test Result", "§382.301"),
        ci("drug_alcohol", "FMCSA Clearinghouse Full Query at hire", "§382.701"),
        ci("drug_alcohol", "Annual Clearinghouse Limited Query", "§382.701(b)"),
        // Ongoing / Annual Requirements
        ci("ongoing_annual", "Annual updated MVR(s)", "§391.25"),
        ci("ongoing_annual", "Updated Medical Certificate (before expiration)"),
        ci("ongoing_annual", "Annual Review of Driving Record", "§391.25"),
        ci("ongoing_annual", "Driver's Annual List of Violations", "§391.27"),
        // Additional / Supporting Records
        ci("additional_supporting", "Entry-Level Driver Training (ELDT) Certificate", "§380 Subpart F"),
        ci("additional_supporting", "HAZMAT Endorsement Background Check"),
        ci("additional_supporting", "Training Records (HOS, cargo securement, safety policies)"),
        ci("additional_supporting", "Corrective / Disciplinary Action Documentation"),
    ];
}

const SEED_IDS = new Set(seedCatalog().map(i => i.id));

// ── Catalog store ─────────────────────────────────────────────────────────────
// Defaults are seeded and can be edited/removed; edits + custom items live in
// localStorage. We persist the full list (so seed edits/removals stick) and only
// re-add missing *unmodified* seed items on a totally-empty store.
const CATALOG_KEY = "settings:dq-catalog-v1";
const CATALOG_EVENT = "settings-dq-catalog-change";

export function loadDqCatalog(): DqCatalogItem[] {
    try {
        const raw = localStorage.getItem(CATALOG_KEY);
        if (raw) {
            const parsed = JSON.parse(raw) as DqCatalogItem[];
            if (Array.isArray(parsed)) return parsed;
        }
    } catch { /* fall through */ }
    return seedCatalog();
}
function persistCatalog(items: DqCatalogItem[]) {
    try { localStorage.setItem(CATALOG_KEY, JSON.stringify(items)); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(CATALOG_EVENT));
}

export const itemsInCategory = (items: DqCatalogItem[], catId: DqCategoryId) => items.filter(i => i.categoryId === catId);
export const isSeedItem = (id: string) => SEED_IDS.has(id);

export function useDqCatalog() {
    const [items, setItems] = useState<DqCatalogItem[]>(loadDqCatalog);
    useEffect(() => {
        const h = () => setItems(loadDqCatalog());
        window.addEventListener(CATALOG_EVENT, h);
        return () => window.removeEventListener(CATALOG_EVENT, h);
    }, []);
    const add = (categoryId: DqCategoryId): DqCatalogItem => {
        const item: DqCatalogItem = { id: uidDq("dqi"), categoryId, label: "" };
        persistCatalog([...loadDqCatalog(), item]);
        return item;
    };
    const update = (id: string, patch: Partial<Omit<DqCatalogItem, "id" | "categoryId">>) =>
        persistCatalog(loadDqCatalog().map(i => (i.id === id ? { ...i, ...patch } : i)));
    const remove = (id: string) => persistCatalog(loadDqCatalog().filter(i => i.id !== id));
    return { items, add, update, remove };
}

// ── Checklist ──────────────────────────────────────────────────────────────
export interface DqChecklist {
    id: string;
    name: string;
    type: DqDriverTypeId;
    description?: string;
    /** Catalog item ids this checklist includes. */
    itemIds: string[];
    updatedAt: string;
}

const CHECKLIST_KEY = "settings:dq-checklists-v2";
const CHECKLIST_EVENT = "settings-dq-checklists-change";

function seedChecklists(): DqChecklist[] {
    const allIds = seedCatalog().map(i => i.id);
    const mk = (id: string, name: string, type: DqDriverTypeId, description: string): DqChecklist =>
        ({ id, name, type, description, itemIds: [...allIds], updatedAt: today() });
    return [
        mk("dqcl-cross-border", "Cross Border DQ File", "cross_border", "Full FMCSA DQ file for US ↔ Canada drivers."),
        mk("dqcl-us-only", "US Only DQ File", "us_only", "FMCSA DQ file for US domestic drivers."),
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

// Track deleted seed checklists so they don't resurrect on reload.
const DELETED_KEY = "settings:dq-checklists-deleted-v2";
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

export function blankDqChecklist(): DqChecklist {
    return { id: uidDq("dqcl"), name: "", type: "cross_border", description: "", itemIds: [], updatedAt: today() };
}

export const checklistItemCount = (cl: DqChecklist) => cl.itemIds.length;
export function categoriesCovered(cl: DqChecklist, items: DqCatalogItem[]): number {
    const byId = new Map(items.map(i => [i.id, i]));
    const cats = new Set<DqCategoryId>();
    for (const id of cl.itemIds) { const it = byId.get(id); if (it) cats.add(it.categoryId); }
    return cats.size;
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
