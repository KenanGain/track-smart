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

/** Which domain the document attaches to. Drives where the uploaded file is filed in TrackSmart. */
export const DOC_TYPE_RELATED_TO = ['Carrier', 'Asset', 'Driver', 'Violation'] as const;

export type DocTypeCategory = typeof DOC_TYPE_CATEGORIES[number];
export type DocTypeRelatedTo = typeof DOC_TYPE_RELATED_TO[number];
export type DocTypeStatus = 'Active' | 'Inactive';
export type DocTypeRequirementLevel = 'required' | 'optional' | 'not_required';

export interface DocumentType {
    id: string;
    name: string;
    category: DocTypeCategory;
    /** Which TrackSmart domain this document is filed under. */
    relatedTo: DocTypeRelatedTo;
    /** Optional short description shown to admins (not the applicant). */
    description: string;
    /** Free-form classification tags admins use to group document types. */
    tags: string[];
    /** Legacy binary flag — derived from `requirementLevel === 'required'` for back-compat. */
    required: boolean;
    /** Three-state requirement: required / optional / not_required. */
    requirementLevel: DocTypeRequirementLevel;
    /** Whether this document type is offered inside Hiring / Application Forms / Templates. */
    usingInHiring: boolean;
    allowMultiple: boolean;
    /** When allowMultiple is on (compliance item): 'all' repeats number+dates+upload, 'document' repeats only the upload. */
    repeatScope?: 'all' | 'document';
    /** Allow capturing previous/historical copies of this document (each with its own number + dates). */
    allowHistorical?: boolean;
    /** When allowMultiple is on: number of labeled upload slots (undefined = unlimited). */
    numberOfSlots?: number;
    /** Per-slot labels, e.g. ["Front", "Rear"]. */
    slotLabels?: string[];
    expiryRequired: boolean;
    issueDateRequired: boolean;
    issueStateRequired: boolean;
    issueCountryRequired: boolean;
    status: DocTypeStatus;
    /** ISO date the type was added — shown in the Date column. */
    addedDate: string;
}

const STORAGE_KEY = 'ats:document-types-v5';

/**
 * Default the new fields (relatedTo / description / tags) when reading older
 * v3 records that didn't have them. Keeps the page rendering when the user
 * has localStorage from before the schema bump.
 */
function normalize(raw: Partial<DocumentType>): DocumentType {
    // requirementLevel takes precedence; if missing, derive from the binary `required` flag
    // so legacy v4 records continue to render correctly.
    const requirementLevel: DocTypeRequirementLevel =
        (raw.requirementLevel as DocTypeRequirementLevel)
        ?? (raw.required ? 'required' : 'optional');
    return {
        id: raw.id ?? uid(),
        name: raw.name ?? 'Untitled',
        category: (raw.category as DocTypeCategory) ?? 'Other',
        relatedTo: (raw.relatedTo as DocTypeRelatedTo) ?? inferRelatedTo(raw.category as DocTypeCategory),
        description: raw.description ?? '',
        tags: Array.isArray(raw.tags) ? raw.tags : [],
        required: requirementLevel === 'required',
        requirementLevel,
        usingInHiring: raw.usingInHiring ?? true,
        allowMultiple: !!raw.allowMultiple,
        expiryRequired: !!raw.expiryRequired,
        issueDateRequired: !!raw.issueDateRequired,
        issueStateRequired: !!raw.issueStateRequired,
        issueCountryRequired: !!raw.issueCountryRequired,
        status: (raw.status as DocTypeStatus) ?? 'Active',
        addedDate: raw.addedDate ?? today(),
    };
}

/** Best-guess default for `relatedTo` when migrating older records. */
function inferRelatedTo(category: DocTypeCategory | undefined): DocTypeRelatedTo {
    switch (category) {
        case 'License':
        case 'Medical':
        case 'Identity':
        case 'Background':
        case 'Photo':
            return 'Driver';
        case 'Insurance':
            return 'Carrier';
        default:
            return 'Driver';
    }
}

const today = (): string => new Date().toISOString().slice(0, 10);

export function newDocumentType(): DocumentType {
    return normalize({
        id: uid(),
        name: '',
        category: 'Other',
        relatedTo: 'Driver',
        description: '',
        tags: [],
        required: true,
        requirementLevel: 'required',
        usingInHiring: true,
        allowMultiple: false,
        expiryRequired: false,
        issueDateRequired: false,
        issueStateRequired: false,
        issueCountryRequired: false,
        status: 'Active',
        addedDate: today(),
    });
}

function seedDocumentTypes(): DocumentType[] {
    const d = today();
    return ([
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
            // Combined Front + Back license capture — TWO labeled slots, and the issuing
            // country/state + issue/expiry dates captured ONCE on the document (so the
            // license popup never asks for the same data twice).
            id: 'dt-lic-frontback', name: 'Driver License (Front & Back)', category: 'License',
            required: true, allowMultiple: false, numberOfSlots: 2, slotLabels: ['Front', 'Back'],
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: true,
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
        {
            id: 'dt-emp-experience-letter', name: 'Employer Experience Letter', category: 'Other',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-insurance-letter', name: 'Employer Insurance Experience Letter', category: 'Insurance',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        /* Additional core document types so every form / subform has a sensible pick. */
        {
            id: 'dt-headshot', name: 'Applicant Headshot / Photo', category: 'Photo',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: false,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-ssn-card', name: 'SSN / SIN Card', category: 'Identity',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: false,
            issueStateRequired: false, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-birth-certificate', name: 'Birth Certificate', category: 'Identity',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-twic', name: 'TWIC Card', category: 'Identity',
            required: false, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-fast', name: 'FAST Card', category: 'Identity',
            required: false, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-resume', name: 'Resume / CV', category: 'Other',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: false,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-vehicle-registration', name: 'Vehicle Registration', category: 'Identity',
            required: false, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: true, issueCountryRequired: true,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-bobtail-insurance', name: 'Bobtail / Cargo Insurance', category: 'Insurance',
            required: false, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-lease-agreement', name: 'Lease Agreement', category: 'Other',
            required: false, allowMultiple: false,
            expiryRequired: true, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },
        {
            id: 'dt-offer-letter', name: 'Offer Letter', category: 'Other',
            required: false, allowMultiple: false,
            expiryRequired: false, issueDateRequired: true,
            issueStateRequired: false, issueCountryRequired: false,
            status: 'Active', addedDate: d,
        },

        /* ── Compliance review PDFs (PSP / MVR / Background / Substance / Clearinghouse / Employment) ── */
        // PSP Review
        { id: 'dt-psp-auth', name: 'PSP Disclosure & Authorization Form', category: 'Background', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: true,  issueCountryRequired: true,  status: 'Active', addedDate: d },
        { id: 'dt-psp-review-notes', name: 'PSP Review Notes', category: 'Background', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        // MVR / Abstract Review
        { id: 'dt-mvr-auth', name: 'MVR / Abstract Authorization', category: 'License', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: true,  issueCountryRequired: true,  status: 'Active', addedDate: d },
        { id: 'dt-annual-mvr', name: 'Annual MVR Review', category: 'License', required: false, allowMultiple: false, expiryRequired: true,  issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        // Criminal Background Check
        { id: 'dt-bgc-consent', name: 'Background Check Consent', category: 'Background', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: true,  issueCountryRequired: true,  status: 'Active', addedDate: d },
        { id: 'dt-bgc-report', name: 'Criminal Background Report', category: 'Background', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: true,  issueCountryRequired: true,  status: 'Active', addedDate: d },
        { id: 'dt-bgc-adjudication', name: 'Adjudication / Decision Summary', category: 'Background', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        // Substance / DOT Drug & Alcohol Testing
        { id: 'dt-da-policy', name: 'Drug/Alcohol Testing Policy Acknowledgment', category: 'Medical', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-da-order', name: 'Test Order / Authorization', category: 'Medical', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-da-ccf', name: 'Federal Drug Testing Custody and Control Form', category: 'Medical', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-da-mro', name: 'MRO Final Result', category: 'Medical', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-da-alcohol', name: 'U.S. DOT Alcohol Testing Form', category: 'Medical', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        // FMCSA Clearinghouse
        { id: 'dt-ch-limited-consent', name: 'Clearinghouse Limited Query Consent', category: 'Background', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-ch-full-consent', name: 'Clearinghouse Full Query Consent Proof', category: 'Background', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-ch-result', name: 'Clearinghouse Query Result', category: 'Background', required: true,  allowMultiple: false, expiryRequired: true,  issueDateRequired: true, issueStateRequired: true,  issueCountryRequired: false, status: 'Active', addedDate: d },
        // Employment / Safety Performance Verification
        { id: 'dt-emp-verif-consent', name: 'Employment Verification Consent', category: 'Other', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-sphr-request', name: 'Safety Performance History Records Request', category: 'Other', required: true,  allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-emp-response', name: 'Employer Response', category: 'Other', required: false, allowMultiple: true,  expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
        { id: 'dt-goodfaith-log', name: 'Good-Faith Attempt Log', category: 'Other', required: false, allowMultiple: false, expiryRequired: false, issueDateRequired: true, issueStateRequired: false, issueCountryRequired: false, status: 'Active', addedDate: d },
    ] as Partial<DocumentType>[]).map(normalize);
}

export function loadDocumentTypes(): DocumentType[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
            const stored = (parsed as Partial<DocumentType>[]).map(normalize);
            // Append any built-in document types the user doesn't have yet (new compliance
            // PDFs etc.) without wiping their saved/custom types.
            const have = new Set(stored.map(t => t.id));
            const missing = seedDocumentTypes().filter(t => !have.has(t.id));
            return [...stored, ...missing];
        }
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
