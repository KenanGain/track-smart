// Carrier Compliance Setup — per-carrier on/off assignments of Key Numbers
// and Document Types pulled from the Super Admin catalogs.
//
// The catalogs (SEED_KEY_NUMBERS + DOCUMENTS) stay the source of truth.
// This file only tracks WHICH ids are enabled for each carrier, plus the
// bidirectional linkage map that drives the auto-cascade.

import {
    SEED_KEY_NUMBERS, DOCUMENTS,
    type KeyNumberRow, type DocumentRow,
} from './ComplianceAndDocumentsPage';
import {
    loadMonitoringConfigs, saveMonitoringConfigs,
    type MonitoringConfig,
} from '@/pages/compliance/compliance-monitoring.data';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { loadTemplates as loadHiringTemplates } from '@/pages/settings/driver-hiring-templates.data';

/**
 * Per-carrier flag overrides — what each carrier can tweak on top of the
 * root catalog without polluting it for other carriers. Keyed by the
 * catalog row's id; only the fields that diverge from the catalog are set.
 */
export type KeyNumberFlagOverride = Partial<{
    usedInHiring: boolean;
    numberRequired: boolean;
    docRequired: boolean;
    hasExpiry: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
}>;

export type DocumentFlagOverride = Partial<{
    usedInHiring: boolean;
    allowMultiple: boolean;
    expiryRequired: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
}>;

/**
 * Per-entity (per-driver, per-asset) override of which carrier-enabled
 * Key Numbers and Documents apply to a specific driver/asset. When absent,
 * the entity inherits everything the carrier has enabled at the carrier
 * level. When present, only the listed ids apply to that entity.
 */
export interface EntityAssignment {
    enabledKeyNumberIds: string[];
    enabledDocumentTypeIds: string[];
    /** Per-entity compliance-flag overrides (In Hiring, Number/Doc required,
     *  Has Expiry, Issue Date/State/Country), keyed by catalog row id. */
    knFlagOverrides?: Record<string, KeyNumberFlagOverride>;
    docFlagOverrides?: Record<string, DocumentFlagOverride>;
}

export interface CarrierComplianceAssignment {
    carrierId: string;
    enabledKeyNumberIds: string[];
    enabledDocumentTypeIds: string[];
    /** @deprecated single-template binding — kept for migration. Use appliedTemplateIds. */
    appliedTemplateId?: string;
    /** Templates currently stacked on this carrier. The enabled sets are the
     *  union of every listed template (+ cascade + mandatory docs). Drift
     *  surfaces in the UI when the admin hand-edits away from that union. */
    appliedTemplateIds?: string[];
    /** Per-carrier edits to compliance flags, keyed by catalog row id. */
    knFlagOverrides?: Record<string, KeyNumberFlagOverride>;
    docFlagOverrides?: Record<string, DocumentFlagOverride>;
    /** Per-driver overrides — keyed by driver id. */
    driverAssignments?: Record<string, EntityAssignment>;
    /** Per-asset overrides — keyed by asset id. */
    assetAssignments?: Record<string, EntityAssignment>;
    /**
     * Per-carrier list of Hiring Templates (ATS pipelines) that this carrier
     * has access to during the hiring process. When undefined, no templates
     * are enabled yet — the carrier admin should pick which ones flow into
     * their hiring workflow.
     */
    enabledHiringTemplateIds?: string[];
    updatedAt: string;
}

/**
 * Reusable compliance preset. Pinning one against a carrier enables the
 * listed key numbers + documents and disables everything else. Seed
 * templates ship out of the box and can't be deleted.
 */
export interface ComplianceTemplate {
    id: string;
    name: string;
    description?: string;
    enabledKeyNumberIds: string[];
    enabledDocumentTypeIds: string[];
    /** Full-bundle: hiring (ATS) templates this preset turns on. */
    enabledHiringTemplateIds?: string[];
    /** Full-bundle: monitoring config per item, keyed by monitorItemKey. Applied
     *  to the entity's monitoring scope at the page layer (separate store). */
    monitoring?: Record<string, MonitoringConfig>;
    isSeed?: boolean;
    updatedAt: string;
}

const STORAGE_KEY = 'ats:carrier-compliance-v2';
const TEMPLATES_KEY = 'ats:compliance-templates-v1';
const HANDOVER_KEY = 'ats:template-handover-v1';
const today = () => new Date().toISOString().slice(0, 10);

// ── Template hand-over (provisioning) ─────────────────────────────────
//
// Super Admin "hands over" templates (compliance + hiring) TO a service
// profile — granting it ACCESS to those templates. Provision only: nothing
// is enabled/applied. The service-profile admin then applies them at the
// Service Profile Compliance Setup, and carriers inherit via their profile.

export interface TemplateHandover {
    complianceTemplateIds: string[];
    hiringTemplateIds: string[];
}

type HandoverStore = Record<string, TemplateHandover>;

function loadHandoverStore(): HandoverStore {
    try {
        const raw = localStorage.getItem(HANDOVER_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed as HandoverStore : {};
    } catch {
        return {};
    }
}

/**
 * Default hand-over for a profile that's never been touched: every built-in
 * compliance template + every hiring template. Gives each service profile the
 * full catalog to start with, which Super Admin can then trim on the root page.
 */
function defaultHandover(): TemplateHandover {
    let hiringTemplateIds: string[] = [];
    try { hiringTemplateIds = loadHiringTemplates().map(t => t.id); } catch { /* ignore */ }
    return { complianceTemplateIds: SEED_TEMPLATES.map(t => t.id), hiringTemplateIds };
}

/** Templates made available to a service profile (defaults to the full catalog). */
export function loadHandover(serviceProfileId: string): TemplateHandover {
    const h = loadHandoverStore()[serviceProfileId];
    if (!h) return defaultHandover();
    return {
        complianceTemplateIds: h.complianceTemplateIds ?? [],
        hiringTemplateIds: h.hiringTemplateIds ?? [],
    };
}

/** Replace one service profile's handed-over set (used for revoke/edit). */
export function setHandover(serviceProfileId: string, handover: TemplateHandover): void {
    try {
        const store = loadHandoverStore();
        store[serviceProfileId] = handover;
        localStorage.setItem(HANDOVER_KEY, JSON.stringify(store));
    } catch {
        /* ignore */
    }
}

/** Provision: union-add the given templates to each service profile's available set. */
export function handOverTemplates(
    serviceProfileIds: string[],
    complianceTemplateIds: string[],
    hiringTemplateIds: string[],
): void {
    try {
        const store = loadHandoverStore();
        for (const id of serviceProfileIds) {
            const cur = store[id] ?? { complianceTemplateIds: [], hiringTemplateIds: [] };
            store[id] = {
                complianceTemplateIds: [...new Set([...cur.complianceTemplateIds, ...complianceTemplateIds])],
                hiringTemplateIds: [...new Set([...cur.hiringTemplateIds, ...hiringTemplateIds])],
            };
        }
        localStorage.setItem(HANDOVER_KEY, JSON.stringify(store));
    } catch {
        /* ignore */
    }
}

// ── Linkage maps ──────────────────────────────────────────────────────
//
// The catalogs already wire linkages by name (a KN's `linkedDocument` is a
// document name; a doc's `linkedTo` + `linkedType: 'keynumber'` is a KN
// name). We build id-based lookup tables once at module load so the
// cascade is just a couple of Map.get calls.

const docByName = new Map<string, DocumentRow>();
for (const d of DOCUMENTS) docByName.set(d.name, d);

const knByName = new Map<string, KeyNumberRow>();
for (const k of SEED_KEY_NUMBERS) knByName.set(k.name, k);

/** Key Number id → list of Document ids that share its linkage (cascade target). */
export const DOC_IDS_BY_KN_ID: Map<string, string[]> = (() => {
    const m = new Map<string, string[]>();
    // KN → DOC: each KN's linkedDocument names a document
    for (const k of SEED_KEY_NUMBERS) {
        if (!k.linkedDocumentTypeId) {
            // legacy seed uses linkedDocument by name — check that field instead
        }
    }
    // Use both directions: walk DOCUMENTS to catch every `linkedType: 'keynumber'`,
    // and walk SEED_KEY_NUMBERS for any with a linkedDocument value.
    // We don't have linkedDocument exposed on KeyNumberRow currently, so the
    // doc→kn direction (via linkedTo) is the canonical source of truth.
    for (const d of DOCUMENTS) {
        if (d.linkedType !== 'keynumber' || !d.linkedTo) continue;
        const kn = knByName.get(d.linkedTo);
        if (!kn) continue;
        const arr = m.get(kn.id) ?? [];
        arr.push(d.id);
        m.set(kn.id, arr);
    }
    return m;
})();

/** Document id → Key Number id (cascade target). */
export const KN_ID_BY_DOC_ID: Map<string, string> = (() => {
    const m = new Map<string, string>();
    for (const d of DOCUMENTS) {
        if (d.linkedType !== 'keynumber' || !d.linkedTo) continue;
        const kn = knByName.get(d.linkedTo);
        if (kn) m.set(d.id, kn.id);
    }
    return m;
})();

// ── Mandatory system / form documents ─────────────────────────────────
//
// Documents that come from the Docu/Form generator or are linked to an
// expense or a system module are part of the form/system itself. They are
// always enabled for every carrier and can't be turned off — mirrors the
// "expense-linked docs can't be deleted" rule on the catalog side.

/** True when a document is a system/form doc (Docu/Form, expense- or module-linked). */
export function isSystemFormDoc(d: DocumentRow): boolean {
    return d.source === 'docu-form' || d.linkedType === 'expense' || d.linkedType === 'module';
}

/** Active system/form document ids — always-on for every carrier. */
export const MANDATORY_DOCUMENT_IDS: string[] = DOCUMENTS
    .filter(d => d.status === 'Active' && isSystemFormDoc(d))
    .map(d => d.id);

/** Union the mandatory system/form doc ids into an enabled-doc list. */
export function withMandatoryDocs(enabledDocumentTypeIds: string[]): string[] {
    const s = new Set(enabledDocumentTypeIds);
    for (const id of MANDATORY_DOCUMENT_IDS) s.add(id);
    return [...s];
}

// ── Default assignment (everything "Active" pre-enabled) ──────────────

export function defaultAssignmentFor(carrierId: string): CarrierComplianceAssignment {
    const knActive = new Set(SEED_KEY_NUMBERS.filter(k => k.status === 'Active').map(k => k.id));
    const docActive = new Set(DOCUMENTS.filter(d => d.status === 'Active').map(d => d.id));

    const enabledKn = new Set<string>();
    const enabledDoc = new Set<string>();

    // Standalone Active key numbers (no linked document) enable on their own.
    for (const k of SEED_KEY_NUMBERS) {
        if (knActive.has(k.id) && (DOC_IDS_BY_KN_ID.get(k.id) ?? []).length === 0) enabledKn.add(k.id);
    }
    // Standalone Active documents (no linked key number) enable on their own.
    for (const d of DOCUMENTS) {
        if (docActive.has(d.id) && !KN_ID_BY_DOC_ID.has(d.id)) enabledDoc.add(d.id);
    }
    // Linked pairs enable only when BOTH sides are Active — never a half-on pair.
    for (const [docId, knId] of KN_ID_BY_DOC_ID) {
        if (docActive.has(docId) && knActive.has(knId)) {
            enabledDoc.add(docId);
            enabledKn.add(knId);
        }
    }

    return {
        carrierId,
        enabledKeyNumberIds: [...enabledKn],
        // System/form docs are always enabled, even if somehow not picked up above.
        enabledDocumentTypeIds: withMandatoryDocs([...enabledDoc]),
        updatedAt: today(),
    };
}

// ── Persistence ───────────────────────────────────────────────────────

type Store = Record<string, CarrierComplianceAssignment>;

function loadStore(): Store {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed as Store : {};
    } catch {
        return {};
    }
}

function saveStore(store: Store): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        /* ignore */
    }
}

/**
 * Build a carrier's starting assignment by copying its service profile's setup
 * (compliance + documents + applied templates + hiring), then copy the profile's
 * monitoring scope across on first seed. The carrier admin overrides from there.
 */
function seedFromServiceProfile(carrierId: string, serviceProfileId: string): CarrierComplianceAssignment {
    const sp = loadCarrierAssignment(serviceProfileId); // lazily seeds the profile too
    // First-open monitoring inheritance: copy the profile's scope when the carrier has none.
    try {
        if (Object.keys(loadMonitoringConfigs(carrierId)).length === 0) {
            const spMon = loadMonitoringConfigs(serviceProfileId);
            if (Object.keys(spMon).length) saveMonitoringConfigs(carrierId, spMon);
        }
    } catch { /* ignore */ }
    return {
        carrierId,
        enabledKeyNumberIds: [...sp.enabledKeyNumberIds],
        enabledDocumentTypeIds: withMandatoryDocs([...sp.enabledDocumentTypeIds]),
        appliedTemplateIds: sp.appliedTemplateIds ? [...sp.appliedTemplateIds] : undefined,
        enabledHiringTemplateIds: sp.enabledHiringTemplateIds ? [...sp.enabledHiringTemplateIds] : undefined,
        knFlagOverrides: sp.knFlagOverrides ? { ...sp.knFlagOverrides } : undefined,
        docFlagOverrides: sp.docFlagOverrides ? { ...sp.docFlagOverrides } : undefined,
        updatedAt: today(),
    };
}

/** Load a carrier's assignment; lazily seed from its service profile (or the
 *  Active catalog) if none exists yet. */
export function loadCarrierAssignment(carrierId: string): CarrierComplianceAssignment {
    const existing = loadStore()[carrierId];
    if (existing) {
        // Force-enable system/form docs even for assignments persisted before
        // those docs existed (or if they were somehow turned off).
        return { ...existing, enabledDocumentTypeIds: withMandatoryDocs(existing.enabledDocumentTypeIds) };
    }
    // No saved config yet → seed a carrier from its service profile; profiles
    // (and carriers without one) fall back to the per-seed / everything-on default.
    const acct = ACCOUNTS_DB.find(a => a.id === carrierId);
    const seeded = acct?.serviceProfileId
        ? seedFromServiceProfile(carrierId, acct.serviceProfileId)
        : buildSeededAssignment(carrierId);
    // Re-load the store before writing — seedFromServiceProfile may have just
    // persisted the parent profile's assignment.
    const store = loadStore();
    store[carrierId] = seeded;
    saveStore(store);
    return seeded;
}

export function saveCarrierAssignment(next: CarrierComplianceAssignment): void {
    const store = loadStore();
    store[next.carrierId] = { ...next, updatedAt: today() };
    saveStore(store);
}

// ── Cascade helpers ───────────────────────────────────────────────────

/**
 * Bulk toggle every id in `targets` to `enable`. Cascades through linkages so
 * paired items move together. Used by the "Enable all" / "Disable all" buttons.
 */
export function applyBulk(
    assignment: CarrierComplianceAssignment,
    kind: 'keynumber' | 'document',
    targetIds: string[],
    enable: boolean,
): CarrierComplianceAssignment {
    let next = assignment;
    for (const id of targetIds) {
        next = applyToggle(next, kind, id, enable).next;
    }
    return next;
}

/** Apply the bidirectional cascade for a single toggle action. */
export function applyToggle(
    assignment: CarrierComplianceAssignment,
    kind: 'keynumber' | 'document',
    id: string,
    enable: boolean,
): { next: CarrierComplianceAssignment; cascaded: { kind: 'keynumber' | 'document'; name: string }[] } {
    const knSet = new Set(assignment.enabledKeyNumberIds);
    const docSet = new Set(assignment.enabledDocumentTypeIds);
    const cascaded: { kind: 'keynumber' | 'document'; name: string }[] = [];

    const setKn = (knId: string, on: boolean, viaCascade: boolean) => {
        const before = knSet.has(knId);
        if (on) knSet.add(knId); else knSet.delete(knId);
        if (viaCascade && before !== on) {
            const kn = SEED_KEY_NUMBERS.find(k => k.id === knId);
            if (kn) cascaded.push({ kind: 'keynumber', name: kn.name });
        }
    };
    const setDoc = (docId: string, on: boolean, viaCascade: boolean) => {
        const before = docSet.has(docId);
        if (on) docSet.add(docId); else docSet.delete(docId);
        if (viaCascade && before !== on) {
            const d = DOCUMENTS.find(x => x.id === docId);
            if (d) cascaded.push({ kind: 'document', name: d.name });
        }
    };

    if (kind === 'keynumber') {
        setKn(id, enable, false);
        for (const linkedDocId of DOC_IDS_BY_KN_ID.get(id) ?? []) {
            setDoc(linkedDocId, enable, true);
        }
    } else {
        setDoc(id, enable, false);
        const linkedKnId = KN_ID_BY_DOC_ID.get(id);
        if (linkedKnId) setKn(linkedKnId, enable, true);
    }

    return {
        next: {
            ...assignment,
            // Keep the stacked template selection intact — a hand-edit no longer
            // detaches the templates, it just surfaces as "modified" via the
            // computed drift check (templatesMatch) in the UI.
            enabledKeyNumberIds: [...knSet],
            enabledDocumentTypeIds: [...docSet],
        },
        cascaded,
    };
}

// ── Compliance Templates ──────────────────────────────────────────────

/**
 * Seeded out-of-the-box templates. Pick lists are built from KN/doc names
 * (not ids) so the constants survive the seed ids shifting. We resolve to
 * ids at module load.
 */
function knIdsByName(names: string[]): string[] {
    return names.map(n => knByName.get(n)?.id).filter((id): id is string => !!id);
}
function docIdsByName(names: string[]): string[] {
    return names.map(n => docByName.get(n)?.id).filter((id): id is string => !!id);
}

const STANDARD_CARRIER_KNS = SEED_KEY_NUMBERS
    .filter(k => k.status === 'Active' && (
        k.group === 'Regulatory and Safety Numbers' ||
        k.group === 'Tax and Business Identification Numbers' ||
        k.group === 'Carrier & Industry Codes'
    ))
    .map(k => k.id);

const STANDARD_CARRIER_DOCS = DOCUMENTS
    .filter(d => d.status === 'Active' && (d.scope === 'carrier' || d.scope === 'driver'))
    .map(d => d.id);

const HAZMAT_EXTRA_KNS = knIdsByName([
    'Hazmat Permit Number',
    'Drug & Alcohol Consortium ID',
    'FMCSA Clearinghouse Query Plan ID',
    'TWIC (Company/Program)',
]);

const HAZMAT_EXTRA_DOCS = docIdsByName([
    'Hazmat Permit',
    'Drug Consortium',
    'TWIC Card',
]);

const CROSS_BORDER_EXTRA_KNS = knIdsByName([
    'CBSA Carrier Code',
    'ACI / eManifest Carrier Code',
    'ACE / SCAC for US Customs',
    'FAST / C-TPAT ID',
    'Passport Number',
    'FAST Card Number',
    'Visa Number',
]);

const CROSS_BORDER_EXTRA_DOCS = docIdsByName([
    'CBSA Carrier Code',
    'ACE/SCAC Document',
    'FAST/C-TPAT Cert',
    'Passport',
    'FAST Card',
    'Visa',
]);

/** Dedup helper for combining the seed buckets. */
const uniq = (xs: string[]) => [...new Set(xs)];

// ── Country buckets for the locked US / Canada / Combined templates ──────
// Items unique to one jurisdiction; everything else (IFTA, IRP, licenses,
// VIN/plate, insurance, etc.) is treated as common and appears in all three.
const US_ONLY_KN_IDS = [
    'kn-usdot', 'kn-usdot-legal', 'kn-op-auth-status', 'kn-mc', 'kn-mx', 'kn-sfr-date',
    'kn-ein', 'kn-state-tax', 'kn-workers-comp', 'kn-ace-scac', 'kn-boc3', 'kn-surety',
    'kn-ucr', 'kn-hvut', 'kn-state-op-auth', 'kn-kyu', 'kn-nm-weight', 'kn-ny-hut',
    'kn-hazmat', 'kn-fmcsa-clear', 'kn-drug-alcohol', 'kn-twic-co', 'kn-twic-card',
];
const CA_ONLY_KN_IDS = [
    'kn-cvor-threshold', 'kn-nsc-profile', 'kn-copr', 'kn-gst-hst', 'kn-pst-qst',
    'kn-payroll', 'kn-wsib', 'kn-cbsa', 'kn-aci',
];
// Cross-border-only credentials — appear in the Combined template, not US/CA-only.
const CROSS_BORDER_KN_IDS = ['kn-fast-ctpat', 'kn-fast-card', 'kn-passport', 'kn-visa'];

const ACTIVE_KN_IDS = SEED_KEY_NUMBERS.filter(k => k.status === 'Active').map(k => k.id);
// Standalone (not KN-linked) active documents are country-neutral → in every template.
const STANDALONE_DOC_IDS = DOCUMENTS.filter(d => d.status === 'Active' && !KN_ID_BY_DOC_ID.has(d.id)).map(d => d.id);

/** Build a locked country template: docs follow the KNs (linked) plus neutral standalone docs. */
function countryTemplate(id: string, name: string, description: string, knIds: string[]): ComplianceTemplate {
    const kns = knIds.filter(k => ACTIVE_KN_IDS.includes(k));
    const docs = new Set<string>(STANDALONE_DOC_IDS);
    for (const kn of kns) for (const d of DOC_IDS_BY_KN_ID.get(kn) ?? []) docs.add(d);
    return { id, name, description, enabledKeyNumberIds: kns, enabledDocumentTypeIds: [...docs], isSeed: true, updatedAt: today() };
}

const US_ONLY_KNS = ACTIVE_KN_IDS.filter(id => !CA_ONLY_KN_IDS.includes(id) && !CROSS_BORDER_KN_IDS.includes(id));
const CANADA_ONLY_KNS = ACTIVE_KN_IDS.filter(id => !US_ONLY_KN_IDS.includes(id) && !CROSS_BORDER_KN_IDS.includes(id));
const COMBINED_KNS = ACTIVE_KN_IDS; // US + Canada + cross-border + common

export const SEED_TEMPLATES: ComplianceTemplate[] = [
    {
        id: 'tmpl-standard',
        name: 'Standard Carrier',
        description: 'Baseline compliance — regulatory & safety, tax IDs, industry codes, plus core carrier and driver documents. Good default for most US/CA fleets.',
        enabledKeyNumberIds:   STANDARD_CARRIER_KNS,
        enabledDocumentTypeIds: STANDARD_CARRIER_DOCS,
        isSeed: true,
        updatedAt: today(),
    },
    {
        id: 'tmpl-hazmat',
        name: 'Hazmat Carrier',
        description: 'Standard Carrier plus hazardous-materials permits, drug & alcohol consortium, and TWIC credentials. Use for fleets hauling DOT-regulated hazmat loads.',
        enabledKeyNumberIds:   uniq([...STANDARD_CARRIER_KNS,  ...HAZMAT_EXTRA_KNS]),
        enabledDocumentTypeIds: uniq([...STANDARD_CARRIER_DOCS, ...HAZMAT_EXTRA_DOCS]),
        isSeed: true,
        updatedAt: today(),
    },
    {
        id: 'tmpl-cross-border',
        name: 'Cross-Border (US ↔ CA)',
        description: 'Standard Carrier plus customs IDs (CBSA, ACI/ACE, SCAC), FAST/C-TPAT, and driver travel docs (passport, FAST, visa). Use for carriers running cross-border lanes.',
        enabledKeyNumberIds:   uniq([...STANDARD_CARRIER_KNS,  ...CROSS_BORDER_EXTRA_KNS]),
        enabledDocumentTypeIds: uniq([...STANDARD_CARRIER_DOCS, ...CROSS_BORDER_EXTRA_DOCS]),
        isSeed: true,
        updatedAt: today(),
    },
    countryTemplate(
        'tmpl-us-only', 'US Only',
        'US domestic compliance — FMCSA / USDOT authority, US tax & state permits, hazmat/clearinghouse, plus common carrier & driver documents. Excludes Canada-specific and cross-border items.',
        US_ONLY_KNS,
    ),
    countryTemplate(
        'tmpl-ca-only', 'Canada Only',
        'Canadian domestic compliance — CVOR / NSC, CBSA / ACI eManifest, Canadian tax & workplace accounts, plus common carrier & driver documents. Excludes US-specific and cross-border items.',
        CANADA_ONLY_KNS,
    ),
    countryTemplate(
        'tmpl-combined', 'Combined (US + Canada)',
        'Full cross-border bundle — every US and Canadian compliance item plus FAST / C-TPAT and driver travel documents (passport, FAST, visa).',
        COMBINED_KNS,
    ),
];

function loadCustomTemplates(): ComplianceTemplate[] {
    try {
        const raw = localStorage.getItem(TEMPLATES_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed as ComplianceTemplate[] : [];
    } catch {
        return [];
    }
}

function saveCustomTemplates(custom: ComplianceTemplate[]): void {
    try {
        localStorage.setItem(TEMPLATES_KEY, JSON.stringify(custom));
    } catch {
        /* ignore */
    }
}

/**
 * All templates the admin can see — seeds first, then user-saved. Every
 * template is normalized so the mandatory system/form (required) documents
 * are always enabled, mirroring the carrier-side rule.
 */
export function loadTemplates(): ComplianceTemplate[] {
    return [...SEED_TEMPLATES, ...loadCustomTemplates()].map(t => ({
        ...t,
        enabledDocumentTypeIds: withMandatoryDocs(t.enabledDocumentTypeIds),
    }));
}

/** Create or replace a user template by id. Seeds are read-only. */
export function upsertTemplate(t: ComplianceTemplate): void {
    if (t.isSeed) return;
    const custom = loadCustomTemplates();
    const idx = custom.findIndex(x => x.id === t.id);
    // System/form docs are required — force them on for every saved template.
    const next = { ...t, enabledDocumentTypeIds: withMandatoryDocs(t.enabledDocumentTypeIds), updatedAt: today() };
    if (idx === -1) custom.push(next);
    else custom[idx] = next;
    saveCustomTemplates(custom);
}

export function deleteTemplate(id: string): void {
    if (SEED_TEMPLATES.some(s => s.id === id)) return;
    saveCustomTemplates(loadCustomTemplates().filter(t => t.id !== id));
}

/**
 * Bottle the current carrier's enabled sets into a new custom template.
 * Returns the saved record so the caller can highlight it.
 */
export function templateFromAssignment(
    name: string,
    description: string | undefined,
    assignment: CarrierComplianceAssignment,
    monitoring?: Record<string, MonitoringConfig>,
): ComplianceTemplate {
    const t: ComplianceTemplate = {
        id: `tmpl-${Math.random().toString(36).slice(2, 9)}`,
        name: name.trim(),
        description: description?.trim() || undefined,
        enabledKeyNumberIds:    [...assignment.enabledKeyNumberIds],
        enabledDocumentTypeIds: [...assignment.enabledDocumentTypeIds],
        enabledHiringTemplateIds: [...(assignment.enabledHiringTemplateIds ?? [])],
        monitoring: monitoring && Object.keys(monitoring).length ? { ...monitoring } : undefined,
        isSeed: false,
        updatedAt: today(),
    };
    upsertTemplate(t);
    return t;
}

/**
 * Overwrite the carrier's enabled sets with the template's. Cascade then
 * re-runs over the linkages so KN ↔ Doc pairs remain consistent (e.g. if a
 * template enables only one side of a pair, the other side gets pulled
 * along).
 */
export function applyTemplate(
    assignment: CarrierComplianceAssignment,
    template: ComplianceTemplate,
): CarrierComplianceAssignment {
    const knSet = new Set(template.enabledKeyNumberIds);
    const docSet = new Set(template.enabledDocumentTypeIds);

    // Cascade pass — pull partners along so each pair is both-on or both-off.
    for (const knId of [...knSet]) {
        for (const docId of DOC_IDS_BY_KN_ID.get(knId) ?? []) docSet.add(docId);
    }
    for (const docId of [...docSet]) {
        const knId = KN_ID_BY_DOC_ID.get(docId);
        if (knId) knSet.add(knId);
    }

    return {
        ...assignment,
        appliedTemplateId: template.id,
        appliedTemplateIds: [template.id],
        enabledKeyNumberIds:    [...knSet],
        enabledDocumentTypeIds: [...docSet],
        updatedAt: today(),
    };
}

/**
 * Stack a SET of templates onto a carrier additively (union semantics).
 *
 * The carrier's enabled sets become the union of every selected template's
 * key numbers + documents, cascaded so KN ↔ Doc pairs stay consistent, with
 * the mandatory system/form docs always force-enabled. An item enabled by
 * ANY selected template is enabled; deselecting a template drops only the
 * items no other still-selected template carries. Passing an empty list
 * clears everything back to the mandatory baseline.
 */
export function applyTemplates(
    assignment: CarrierComplianceAssignment,
    selected: ComplianceTemplate[],
): CarrierComplianceAssignment {
    const knSet = new Set<string>();
    const docSet = new Set<string>();
    const hiringSet = new Set<string>();
    for (const t of selected) {
        for (const id of t.enabledKeyNumberIds) knSet.add(id);
        for (const id of t.enabledDocumentTypeIds) docSet.add(id);
        for (const id of t.enabledHiringTemplateIds ?? []) hiringSet.add(id);
    }

    // Cascade pass — pull partners along so each pair is both-on.
    for (const knId of [...knSet]) {
        for (const docId of DOC_IDS_BY_KN_ID.get(knId) ?? []) docSet.add(docId);
    }
    for (const docId of [...docSet]) {
        const knId = KN_ID_BY_DOC_ID.get(docId);
        if (knId) knSet.add(knId);
    }

    // Only overwrite hiring enrolment when at least one selected template carries
    // hiring ids — keeps back-compat with compliance-only templates.
    const anyHiring = selected.some(t => (t.enabledHiringTemplateIds?.length ?? 0) > 0);

    return {
        ...assignment,
        appliedTemplateId: undefined,
        appliedTemplateIds: selected.map(t => t.id),
        enabledKeyNumberIds:    [...knSet],
        enabledDocumentTypeIds: withMandatoryDocs([...docSet]),
        enabledHiringTemplateIds: anyHiring ? [...hiringSet] : assignment.enabledHiringTemplateIds,
        updatedAt: today(),
    };
}

/** Merge the monitoring maps carried by the selected templates (later wins). */
export function mergeTemplateMonitoring(selected: ComplianceTemplate[]): Record<string, MonitoringConfig> {
    const out: Record<string, MonitoringConfig> = {};
    for (const t of selected) {
        if (!t.monitoring) continue;
        for (const [key, cfg] of Object.entries(t.monitoring)) out[key] = cfg;
    }
    return out;
}

/**
 * Stack ONE template additively onto an existing assignment (union with what's
 * already enabled — nothing is removed), cascading KN ↔ Doc pairs and unioning
 * hiring templates + the applied-template list. Used by "Assign template" to
 * push a template onto a service profile / carrier without wiping its setup.
 * (Monitoring is applied separately at the call site via the entity's scope.)
 */
export function stackTemplateOnto(
    assignment: CarrierComplianceAssignment,
    template: ComplianceTemplate,
): CarrierComplianceAssignment {
    const knSet = new Set([...assignment.enabledKeyNumberIds, ...template.enabledKeyNumberIds]);
    const docSet = new Set([...assignment.enabledDocumentTypeIds, ...template.enabledDocumentTypeIds]);
    for (const knId of [...knSet]) {
        for (const docId of DOC_IDS_BY_KN_ID.get(knId) ?? []) docSet.add(docId);
    }
    for (const docId of [...docSet]) {
        const knId = KN_ID_BY_DOC_ID.get(docId);
        if (knId) knSet.add(knId);
    }
    const hiring = new Set([...(assignment.enabledHiringTemplateIds ?? []), ...(template.enabledHiringTemplateIds ?? [])]);
    const tplIds = new Set([...selectedTemplateIds(assignment), template.id]);
    return {
        ...assignment,
        appliedTemplateId: undefined,
        appliedTemplateIds: [...tplIds],
        enabledKeyNumberIds: [...knSet],
        enabledDocumentTypeIds: withMandatoryDocs([...docSet]),
        enabledHiringTemplateIds: [...hiring],
        updatedAt: today(),
    };
}

/** Normalize the stacked selection, migrating the legacy single-id field. */
export function selectedTemplateIds(assignment: CarrierComplianceAssignment): string[] {
    if (assignment.appliedTemplateIds) return assignment.appliedTemplateIds;
    return assignment.appliedTemplateId ? [assignment.appliedTemplateId] : [];
}

/**
 * Does the carrier's current enabled set still match the applied template,
 * or has the admin drifted? Used to render "(modified)" next to the
 * template name in the header.
 */
export function templateMatches(
    assignment: CarrierComplianceAssignment,
    template: ComplianceTemplate,
): boolean {
    const sameKn = sameSet(assignment.enabledKeyNumberIds, template.enabledKeyNumberIds);
    const sameDoc = sameSet(assignment.enabledDocumentTypeIds, template.enabledDocumentTypeIds);
    return sameKn && sameDoc;
}

/**
 * Drift check for a stacked selection — does the carrier's enabled set still
 * equal the union of all selected templates (+ cascade + mandatory docs)?
 */
export function templatesMatch(
    assignment: CarrierComplianceAssignment,
    selected: ComplianceTemplate[],
): boolean {
    const expected = applyTemplates(assignment, selected);
    return sameSet(assignment.enabledKeyNumberIds, expected.enabledKeyNumberIds)
        && sameSet(assignment.enabledDocumentTypeIds, expected.enabledDocumentTypeIds);
}

function sameSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const s = new Set(a);
    return b.every(x => s.has(x));
}

// ── Per-carrier flag merging ──────────────────────────────────────────

/**
 * Effective key-number flags = catalog row + per-carrier override. Used by
 * the Settings → Compliance Setup page so each carrier sees its own
 * configuration without polluting the root.
 */
export function effectiveKnFlags(
    row: KeyNumberRow,
    assignment: CarrierComplianceAssignment,
): KeyNumberRow {
    const o = assignment.knFlagOverrides?.[row.id];
    if (!o) return row;
    return { ...row, ...o };
}

export function effectiveDocFlags(
    row: DocumentRow,
    assignment: CarrierComplianceAssignment,
): DocumentRow {
    const o = assignment.docFlagOverrides?.[row.id];
    if (!o) return row;
    return { ...row, ...o };
}

/** Patch a single key number's flag override on the assignment. */
export function patchKnOverride(
    assignment: CarrierComplianceAssignment,
    knId: string,
    patch: KeyNumberFlagOverride,
): CarrierComplianceAssignment {
    return {
        ...assignment,
        knFlagOverrides: {
            ...(assignment.knFlagOverrides ?? {}),
            [knId]: { ...(assignment.knFlagOverrides?.[knId] ?? {}), ...patch },
        },
        updatedAt: today(),
    };
}

export function patchDocOverride(
    assignment: CarrierComplianceAssignment,
    docId: string,
    patch: DocumentFlagOverride,
): CarrierComplianceAssignment {
    return {
        ...assignment,
        docFlagOverrides: {
            ...(assignment.docFlagOverrides ?? {}),
            [docId]: { ...(assignment.docFlagOverrides?.[docId] ?? {}), ...patch },
        },
        updatedAt: today(),
    };
}

// ── Per-entity (driver / asset) assignment helpers ────────────────────

export type EntityScope = 'driver' | 'asset';

function entityMapKey(scope: EntityScope): 'driverAssignments' | 'assetAssignments' {
    return scope === 'driver' ? 'driverAssignments' : 'assetAssignments';
}

/**
 * Resolve the EntityAssignment for a specific driver/asset.
 * If no per-entity override exists, fall back to the carrier-level enabled
 * lists so the entity inherits everything the carrier has enabled.
 */
export function getEntityAssignment(
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
): EntityAssignment {
    const map = assignment[entityMapKey(scope)];
    const explicit = map?.[entityId];
    if (explicit) {
        // System/form docs stay enabled per-entity too.
        return { ...explicit, enabledDocumentTypeIds: withMandatoryDocs(explicit.enabledDocumentTypeIds) };
    }
    return {
        enabledKeyNumberIds: [...assignment.enabledKeyNumberIds],
        enabledDocumentTypeIds: withMandatoryDocs([...assignment.enabledDocumentTypeIds]),
    };
}

/**
 * Toggle a single key number / document for a specific driver or asset.
 * Cascades linked KN↔Doc pairs together (same behaviour as the carrier
 * level applyToggle).
 */
export function toggleForEntity(
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
    kind: 'keynumber' | 'document',
    id: string,
    enable: boolean,
): CarrierComplianceAssignment {
    const current = getEntityAssignment(assignment, scope, entityId);
    const knSet = new Set(current.enabledKeyNumberIds);
    const docSet = new Set(current.enabledDocumentTypeIds);

    const setKn  = (knId: string, on: boolean)  => { if (on) knSet.add(knId);  else knSet.delete(knId); };
    const setDoc = (docId: string, on: boolean) => { if (on) docSet.add(docId); else docSet.delete(docId); };

    if (kind === 'keynumber') {
        setKn(id, enable);
        for (const linkedDocId of DOC_IDS_BY_KN_ID.get(id) ?? []) setDoc(linkedDocId, enable);
    } else {
        setDoc(id, enable);
        const linkedKnId = KN_ID_BY_DOC_ID.get(id);
        if (linkedKnId) setKn(linkedKnId, enable);
    }

    const nextEntity: EntityAssignment = {
        ...current,
        enabledKeyNumberIds: Array.from(knSet),
        enabledDocumentTypeIds: Array.from(docSet),
    };
    const key = entityMapKey(scope);
    return {
        ...assignment,
        [key]: { ...(assignment[key] ?? {}), [entityId]: nextEntity },
        updatedAt: today(),
    };
}

/** Bulk enable/disable every catalog item that has the given scope, for one entity. */
export function bulkSetForEntity(
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
    enable: boolean,
): CarrierComplianceAssignment {
    const next: EntityAssignment = enable
        ? {
            enabledKeyNumberIds: [...assignment.enabledKeyNumberIds],
            enabledDocumentTypeIds: [...assignment.enabledDocumentTypeIds],
        }
        : { enabledKeyNumberIds: [], enabledDocumentTypeIds: [] };
    const key = entityMapKey(scope);
    return {
        ...assignment,
        [key]: { ...(assignment[key] ?? {}), [entityId]: next },
        updatedAt: today(),
    };
}

/** Drop the per-entity override so the entity falls back to the carrier-level defaults. */
export function clearEntityAssignment(
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
): CarrierComplianceAssignment {
    const key = entityMapKey(scope);
    const map = { ...(assignment[key] ?? {}) };
    delete map[entityId];
    return { ...assignment, [key]: map, updatedAt: today() };
}

// ── Per-entity compliance-flag overrides ──────────────────────────────
//
// Flags layer in three tiers: catalog row → carrier override → entity
// override. The entity tier lets a carrier admin tune "what's required"
// for one specific driver/asset at assignment time, without touching the
// carrier default or any sibling entity.

/** Effective key-number flags for a single driver/asset (catalog + carrier + entity). */
export function effectiveEntityKnFlags(
    row: KeyNumberRow,
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
): KeyNumberRow {
    const carrierEffective = effectiveKnFlags(row, assignment);
    const o = assignment[entityMapKey(scope)]?.[entityId]?.knFlagOverrides?.[row.id];
    if (!o) return carrierEffective;
    return { ...carrierEffective, ...o };
}

export function effectiveEntityDocFlags(
    row: DocumentRow,
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
): DocumentRow {
    const carrierEffective = effectiveDocFlags(row, assignment);
    const o = assignment[entityMapKey(scope)]?.[entityId]?.docFlagOverrides?.[row.id];
    if (!o) return carrierEffective;
    return { ...carrierEffective, ...o };
}

/**
 * Patch a single key number's flag override for one driver/asset. If the
 * entity had no explicit assignment yet, it's seeded from the carrier-level
 * enabled lists so the snapshot stays consistent with toggleForEntity.
 */
export function patchEntityKnOverride(
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
    knId: string,
    patch: KeyNumberFlagOverride,
): CarrierComplianceAssignment {
    const current = getEntityAssignment(assignment, scope, entityId);
    const nextEntity: EntityAssignment = {
        ...current,
        knFlagOverrides: {
            ...(current.knFlagOverrides ?? {}),
            [knId]: { ...(current.knFlagOverrides?.[knId] ?? {}), ...patch },
        },
    };
    const key = entityMapKey(scope);
    return {
        ...assignment,
        [key]: { ...(assignment[key] ?? {}), [entityId]: nextEntity },
        updatedAt: today(),
    };
}

export function patchEntityDocOverride(
    assignment: CarrierComplianceAssignment,
    scope: EntityScope,
    entityId: string,
    docId: string,
    patch: DocumentFlagOverride,
): CarrierComplianceAssignment {
    const current = getEntityAssignment(assignment, scope, entityId);
    const nextEntity: EntityAssignment = {
        ...current,
        docFlagOverrides: {
            ...(current.docFlagOverrides ?? {}),
            [docId]: { ...(current.docFlagOverrides?.[docId] ?? {}), ...patch },
        },
    };
    const key = entityMapKey(scope);
    return {
        ...assignment,
        [key]: { ...(assignment[key] ?? {}), [entityId]: nextEntity },
        updatedAt: today(),
    };
}

// ── Per-carrier seed configurations ───────────────────────────────────
//
// Each carrier starts on one of the seed templates; a few carry small custom
// tweaks so they surface as "(modified)" / custom. System/form docs stay
// force-enabled regardless. Carriers without a seed entry fall back to the
// everything-on default.

interface CarrierSetupSeed {
    templateId: string;
    /** Catalog ids enabled on top of the template (creates drift → "modified"). */
    enableKn?: string[];
    enableDoc?: string[];
    /** Catalog ids disabled from the template (creates drift → "modified"). */
    disableKn?: string[];
    disableDoc?: string[];
}

const SEED_CARRIER_SETUP: Record<string, CarrierSetupSeed> = {
    'acct-001': { templateId: 'tmpl-cross-border' },
    'acct-002': { templateId: 'tmpl-standard', enableKn: knIdsByName(['Hazmat Permit Number']) }, // custom
    'acct-003': { templateId: 'tmpl-standard' },
    'acct-004': { templateId: 'tmpl-standard' },
    'acct-005': { templateId: 'tmpl-cross-border' },
    'acct-006': { templateId: 'tmpl-standard' },
    'acct-007': { templateId: 'tmpl-standard', disableKn: knIdsByName(['DUNS Number']) }, // custom
    'acct-008': { templateId: 'tmpl-hazmat' },
    'acct-009': { templateId: 'tmpl-standard' },
    'acct-010': { templateId: 'tmpl-cross-border' },
    'acct-011': { templateId: 'tmpl-standard' },
    'acct-012': { templateId: 'tmpl-standard', enableKn: knIdsByName(['FAST / C-TPAT ID']) }, // custom
    'acct-013': { templateId: 'tmpl-hazmat' },
    'acct-014': { templateId: 'tmpl-standard' },
    'acct-015': { templateId: 'tmpl-standard' },
    'acct-016': { templateId: 'tmpl-standard' },
    'acct-017': { templateId: 'tmpl-hazmat' },
    'acct-018': { templateId: 'tmpl-standard' },
    'acct-019': { templateId: 'tmpl-standard' },
    'acct-020': { templateId: 'tmpl-standard' },
    'acct-021': { templateId: 'tmpl-standard' },
    'acct-022': { templateId: 'tmpl-hazmat', disableKn: knIdsByName(['NAICS Code']) }, // custom
    'acct-023': { templateId: 'tmpl-standard' },
    'acct-024': { templateId: 'tmpl-standard' },
    'acct-025': { templateId: 'tmpl-cross-border' },
    'acct-026': { templateId: 'tmpl-hazmat' },
    'acct-027': { templateId: 'tmpl-standard' },
    'acct-028': { templateId: 'tmpl-standard' },
    'acct-029': { templateId: 'tmpl-standard' },
    'acct-030': { templateId: 'tmpl-standard' },
};

/**
 * Build a carrier's seeded assignment: apply its template, layer any custom
 * tweaks (which clear appliedTemplateId so the carrier reads as "modified"),
 * then force-enable the mandatory system/form documents.
 */
function buildSeededAssignment(carrierId: string): CarrierComplianceAssignment {
    const seed = SEED_CARRIER_SETUP[carrierId];
    if (!seed) return defaultAssignmentFor(carrierId);

    const template = SEED_TEMPLATES.find(t => t.id === seed.templateId);
    let a = template
        ? applyTemplate(defaultAssignmentFor(carrierId), template)
        : defaultAssignmentFor(carrierId);

    for (const id of seed.enableKn ?? [])   a = applyToggle(a, 'keynumber', id, true).next;
    for (const id of seed.disableKn ?? [])  a = applyToggle(a, 'keynumber', id, false).next;
    for (const id of seed.enableDoc ?? [])  a = applyToggle(a, 'document', id, true).next;
    for (const id of seed.disableDoc ?? []) a = applyToggle(a, 'document', id, false).next;

    return {
        ...a,
        enabledDocumentTypeIds: withMandatoryDocs(a.enabledDocumentTypeIds),
        updatedAt: today(),
    };
}
