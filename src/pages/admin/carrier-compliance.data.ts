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
}

export interface CarrierComplianceAssignment {
    carrierId: string;
    enabledKeyNumberIds: string[];
    enabledDocumentTypeIds: string[];
    /** Last template applied to this carrier (drift surfaces in the UI). */
    appliedTemplateId?: string;
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
    isSeed?: boolean;
    updatedAt: string;
}

const STORAGE_KEY = 'ats:carrier-compliance-v1';
const TEMPLATES_KEY = 'ats:compliance-templates-v1';
const today = () => new Date().toISOString().slice(0, 10);

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

// ── Default assignment (everything "Active" pre-enabled) ──────────────

export function defaultAssignmentFor(carrierId: string): CarrierComplianceAssignment {
    return {
        carrierId,
        enabledKeyNumberIds: SEED_KEY_NUMBERS.filter(k => k.status === 'Active').map(k => k.id),
        enabledDocumentTypeIds: DOCUMENTS.filter(d => d.status === 'Active').map(d => d.id),
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

/** Load a carrier's assignment; lazily seed from the Active catalog if none exists yet. */
export function loadCarrierAssignment(carrierId: string): CarrierComplianceAssignment {
    const store = loadStore();
    const existing = store[carrierId];
    if (existing) return existing;
    const seeded = defaultAssignmentFor(carrierId);
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
            // Any direct toggle counts as drift from the applied template —
            // the UI shows "(modified)" once this flag is cleared.
            appliedTemplateId: undefined,
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

/** All templates the admin can see — seeds first, then user-saved. */
export function loadTemplates(): ComplianceTemplate[] {
    return [...SEED_TEMPLATES, ...loadCustomTemplates()];
}

/** Create or replace a user template by id. Seeds are read-only. */
export function upsertTemplate(t: ComplianceTemplate): void {
    if (t.isSeed) return;
    const custom = loadCustomTemplates();
    const idx = custom.findIndex(x => x.id === t.id);
    const next = { ...t, updatedAt: today() };
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
): ComplianceTemplate {
    const t: ComplianceTemplate = {
        id: `tmpl-${Math.random().toString(36).slice(2, 9)}`,
        name: name.trim(),
        description: description?.trim() || undefined,
        enabledKeyNumberIds:    [...assignment.enabledKeyNumberIds],
        enabledDocumentTypeIds: [...assignment.enabledDocumentTypeIds],
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
        enabledKeyNumberIds:    [...knSet],
        enabledDocumentTypeIds: [...docSet],
        updatedAt: today(),
    };
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
    if (explicit) return explicit;
    return {
        enabledKeyNumberIds: [...assignment.enabledKeyNumberIds],
        enabledDocumentTypeIds: [...assignment.enabledDocumentTypeIds],
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
