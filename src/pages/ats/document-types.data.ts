// Document Types library — master list of document definitions that forms reference.
//
// Each entry defines a document the applicant can be asked to upload: its name,
// category, requirement flags (expiry, issue date, issue state, issue country),
// whether multiple files are allowed, and an Active / Inactive status.
//
// Stored in localStorage. Seeded with the documents previously declared inline
// on Application Forms so existing forms keep working.

import { uid } from './driver-application.data';

export const DOC_TYPE_CATEGORIES = [
    'License', 'Medical', 'Identity', 'Background', 'Photo', 'Insurance', 'Other',
] as const;

export type DocTypeCategory = typeof DOC_TYPE_CATEGORIES[number];
export type DocTypeStatus = 'Active' | 'Inactive';

export interface DocumentType {
    id: string;
    name: string;
    category: DocTypeCategory;
    required: boolean;
    allowMultiple: boolean;
    expiryRequired: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
    status: DocTypeStatus;
    /** ISO date the type was added — shown in the Date column. */
    addedDate: string;
}

const STORAGE_KEY = 'ats:document-types-v1';

const today = (): string => new Date().toISOString().slice(0, 10);

export function newDocumentType(): DocumentType {
    return {
        id: uid(),
        name: 'New Document',
        category: 'Other',
        required: false,
        allowMultiple: false,
        expiryRequired: false,
        issueDateRequired: false,
        issueStateRequired: false,
        issueCountryRequired: false,
        status: 'Active',
        addedDate: today(),
    };
}

function seedDocumentTypes(): DocumentType[] {
    const d = today();
    return [
        {
            id: 'dt-cdl', name: 'CDL — Front & Back', category: 'License',
            required: true, allowMultiple: true,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-medcert', name: "Medical Examiner's Certificate", category: 'Medical',
            required: true, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-lic-front', name: 'Driving License Front', category: 'License',
            required: true, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-lic-back', name: 'Driving License Back', category: 'License',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: false,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-passport', name: 'Passport Document', category: 'Identity',
            required: false, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-criminal', name: 'Criminal Record Document', category: 'Background',
            required: false, allowMultiple: true,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-mvr', name: 'State / Province Driving Record (3-year MVR)', category: 'License',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-cvor', name: 'Commercial Vehicle Operator Record (CVOR)', category: 'License',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-psp', name: 'Pre-Employment Screening Program (PSP) Report', category: 'Background',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-abstract', name: '3-Year Driver Abstract (Non-Commercial)', category: 'License',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
    ];
}

export function loadDocumentTypes(): DocumentType[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as DocumentType[];
    } catch {
        /* localStorage unavailable / corrupt — fall through to seed */
    }
    return seedDocumentTypes();
}

export function saveDocumentTypes(types: DocumentType[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
    } catch {
        /* localStorage unavailable — ignore */
    }
}

/** Look up a single document type by id from the current library. */
export function getDocumentType(id: string | undefined | null): DocumentType | undefined {
    if (!id) return undefined;
    return loadDocumentTypes().find(t => t.id === id);
}
