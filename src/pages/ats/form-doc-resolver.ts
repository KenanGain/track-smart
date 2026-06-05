// Bridge: forms resolve document fields from BOTH the ATS Document-Types
// library AND the root Super-Admin Compliance & Documents catalog. The root
// catalog (Key Numbers + Documents you configure at Super Admin, with the
// editable form-view) is the single source of truth — a form `document` field
// whose `documentTypeId` is a root document id (`d-*`) renders with that root
// document's meta/slots.

import { getDocumentType, loadDocumentTypes, type DocumentType } from './document-types.data';
import { loadAdminDocuments, adminDocsAsFormTypes } from '@/pages/admin/compliance-catalog.data';
import { DOCUMENTS, SEED_KEY_NUMBERS, type KeyNumberRow } from '@/pages/admin/ComplianceAndDocumentsPage';

/** Root Compliance Documents that are flagged for hiring, mapped to the DocumentType shape. */
export function rootFormDocTypes(): DocumentType[] {
    return adminDocsAsFormTypes(loadAdminDocuments(DOCUMENTS));
}

/** Root Key Numbers that are flagged for hiring/forms. */
export function hiringKeyNumbers(): KeyNumberRow[] {
    return SEED_KEY_NUMBERS.filter(k => k.usedInHiring && k.status === 'Active');
}

/** Resolve a document field's type from the ATS library first, then the root catalog. */
export function resolveFormDocType(id: string | undefined | null): DocumentType | undefined {
    if (!id) return undefined;
    return getDocumentType(id) ?? rootFormDocTypes().find(d => d.id === id);
}

/** Resolve a root Compliance Key Number by id. */
export function resolveKeyNumber(id: string | undefined | null): KeyNumberRow | undefined {
    if (!id) return undefined;
    return SEED_KEY_NUMBERS.find(k => k.id === id);
}

/** The combined config for a `compliance` field — its Key Number + linked Document (if any). */
export function complianceFieldConfig(keyNumberId: string | undefined | null): {
    keyNumber: KeyNumberRow | undefined;
    docType: DocumentType | undefined;
} {
    const keyNumber = resolveKeyNumber(keyNumberId);
    const docType = keyNumber?.docRequired ? resolveFormDocType(keyNumber.linkedDocumentTypeId) : undefined;
    return { keyNumber, docType };
}

/** Combined picker list — root compliance documents first, then ATS document types (deduped by id). */
export function allFormDocTypes(): DocumentType[] {
    const root = rootFormDocTypes();
    const seen = new Set(root.map(d => d.id));
    const ats = loadDocumentTypes().filter(t => t.status === 'Active' && !seen.has(t.id));
    return [...root, ...ats];
}
