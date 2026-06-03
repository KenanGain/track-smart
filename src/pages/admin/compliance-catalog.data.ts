// Admin Compliance & Documents catalog — persistence + a bridge that reflects
// the admin documents into the Docu/Form Generator's form-builder picker.
//
// The admin Documents catalog is the SINGLE SOURCE: it persists here, and
// `adminDocsAsFormTypes` maps it into the ATS `DocumentType` shape the form
// builder picks from, so a document defined/enabled in admin becomes usable
// when building application forms.

import type { DocumentRow } from './ComplianceAndDocumentsPage';
import type { DocumentType } from '@/pages/ats/document-types.data';

const STORAGE_KEY = 'ats:admin-documents-v1';

/** Load the persisted admin documents, falling back to the provided seed. */
export function loadAdminDocuments(seed: DocumentRow[]): DocumentRow[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as DocumentRow[];
    } catch {
        /* localStorage unavailable / corrupt — fall through to seed */
    }
    return seed;
}

/** Persist the admin documents catalog. */
export function saveAdminDocuments(docs: DocumentRow[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
    } catch {
        /* ignore */
    }
}

/**
 * Map the admin documents that are surfaced in hiring/forms into the ATS
 * `DocumentType` shape used by the form builder's document picker. Carries the
 * meta flags + the labeled-upload-slot config so forms render them correctly.
 */
export function adminDocsAsFormTypes(docs: DocumentRow[]): DocumentType[] {
    return docs
        .filter(d => d.usedInHiring && (d.status ?? 'Active') !== 'Inactive')
        .map(d => ({
            id: d.id,
            name: d.name,
            category: d.category ?? 'Other',
            relatedTo: d.scope,
            description: d.description ?? '',
            tags: [],
            required: d.requirementLevel === 'required',
            requirementLevel: d.requirementLevel ?? 'optional',
            usingInHiring: true,
            allowMultiple: !!d.allowMultiple,
            numberOfSlots: d.numberOfSlots,
            slotLabels: d.slotLabels,
            expiryRequired: !!d.expiryRequired,
            issueDateRequired: !!d.issueDateRequired,
            issueStateRequired: !!d.issueStateRequired,
            issueCountryRequired: !!d.issueCountryRequired,
            status: (d.status ?? 'Active') === 'Inactive' ? 'Inactive' : 'Active',
            addedDate: '',
        })) as unknown as DocumentType[];
}
