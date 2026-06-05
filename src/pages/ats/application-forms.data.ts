// Application Form library — the artifacts built in the Docu/Form Generator.
//
// Two kinds of form:
//   • 'standard' — the locked, hand-built 13-step Driver Application wizard.
//                  Only its branding (title, logo, intro) is editable.
//   • 'custom'   — fully admin-built: the admin creates steps and adds fields
//                  to each. Rendered by the generic CustomFormWizard.
//
// Persisted in localStorage so the generator, the templates admin, and the
// ATS wizard all share one source of truth.

import { uid } from "./driver-application.data";
import { complianceReviewForms } from "./compliance-review-forms.data";
import { KNOWN_DATA_KEYS } from "./form-data-keys";

// ── Custom-form building blocks ───────────────────────────────────────────

export type FormFieldType =
    | 'text' | 'textarea' | 'date' | 'number'
    | 'select' | 'toggle' | 'radio' | 'checklist' | 'document'
    | 'compliance'
    | 'license-list' | 'address-list' | 'disqualification-list' | 'accident-list'
    | 'violation-list' | 'driving-experience-list' | 'employment-list' | 'education-list'
    | 'subform-button'
    | 'heading' | 'paragraph' | 'bullet-list' | 'alert' | 'signature';

export const FORM_FIELD_TYPES: FormFieldType[] = [
    'text', 'textarea', 'date', 'number', 'select', 'toggle', 'radio', 'checklist', 'document',
    'license-list', 'address-list', 'disqualification-list', 'accident-list',
    'violation-list', 'driving-experience-list', 'employment-list', 'education-list',
    'subform-button',
    'heading', 'paragraph', 'bullet-list', 'alert', 'signature',
];

/** Field types whose `options` list is used. */
export const OPTION_FIELD_TYPES: FormFieldType[] = ['select', 'radio', 'checklist'];

export interface FormField {
    id: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    /** Help text shown under the field on the form. */
    instruction: string;
    /** Choices — used by select / radio / checklist. */
    options: string[];
    /** Conditional reveal: hide this field in the live form unless another field's value matches. */
    showWhen?: { fieldId: string; equals: boolean | string };
    /** For type === 'document': references a row in the Document Types library; the type's
     *  flags drive which extra inputs the upload component renders (expiry / issue date / etc.). */
    documentTypeId?: string;
    /** For type === 'compliance': the root Compliance Key Number (`kn-*`) this field captures.
     *  Its linked document (the KN's `linkedDocumentTypeId`) supplies the combined upload + meta. */
    complianceKeyNumberId?: string;
    /** For type === 'subform-button': references an Application Form marked as a subform.
     *  The button is rendered with the subform's `buttonName` (falls back to its name) and
     *  opens a popup containing every field on the linked subform. */
    subformId?: string;
    /** Layout width on the form. 'half' lets two consecutive half-width fields sit
     *  side by side in a 2-column row. Missing = 'full' (back-compatible). */
    width?: 'full' | 'half';
    /** For type === 'document': where the expiry/issue meta inputs render relative to
     *  the Upload widget. Missing = 'below' (current behavior). */
    metaPosition?: 'above' | 'below';
    /** Canonical driver-data key (e.g. 'license.number') — fields sharing a dataKey
     *  capture once and auto-fill each other across the hiring pipeline. */
    dataKey?: string;
}

/**
 * Whether a field's `showWhen` condition is satisfied by the current form values.
 * Handles every controller kind: toggle (boolean), select/radio (string equals),
 * and checklist (string[] membership). Shared by every render site so the live
 * form, the test runner, and the print view all gate identically.
 */
export function showWhenSatisfied(
    showWhen: { fieldId: string; equals: boolean | string } | undefined,
    values: Record<string, unknown>,
): boolean {
    if (!showWhen) return true;
    const current = values[showWhen.fieldId];
    const expected = showWhen.equals;
    if (typeof expected === 'boolean') return (current === true) === expected;
    if (Array.isArray(current)) return current.map(String).includes(String(expected));
    return current === expected;
}

/**
 * Chunk ordered fields into layout rows. A `half`-width field with no dependents
 * pairs with the next consecutive `half` (no-dependent) field to sit side by side;
 * everything else is its own full-width row. Fields that control dependents stay
 * full-width so their nested block isn't squeezed. Shared by the builder list and
 * the runtime renderer so both lay fields out identically.
 */
export function chunkFieldRows<T extends FormField>(
    fields: T[],
    hasDeps: (f: T) => boolean,
): T[][] {
    const rows: T[][] = [];
    for (let i = 0; i < fields.length; i++) {
        const f = fields[i];
        const next = fields[i + 1];
        if (f.width === 'half' && !hasDeps(f) && next && next.width === 'half' && !hasDeps(next)) {
            rows.push([f, next]);
            i++;
        } else {
            rows.push([f]);
        }
    }
    return rows;
}

/** Value captured by a typed document upload field. */
export interface FormDocumentUploadValue {
    files: string[];
    expiry?: string;
    issueDate?: string;
    issueState?: string;
    issueCountry?: string;
    /** Per-set dates when labeled slots are repeatable (one entry per Front/Back set). */
    groups?: Array<{ expiry?: string; issueDate?: string; issueState?: string; issueCountry?: string }>;
    /** Previous / historical copies of this document — each with its own files + dates. */
    historical?: Array<{ files: string[]; expiry?: string; issueDate?: string; issueState?: string; issueCountry?: string }>;
}

export function emptyDocumentUploadValue(): FormDocumentUploadValue {
    return { files: [] };
}

/** One license captured by a 'license-list' field. */
export interface FormLicenseEntry {
    id: string;
    licenseNumber: string;
    licenseClass: string;
    country: string;
    stateProvince: string;
    issueDate: string;
    expiryDate: string;
}

export function newLicenseEntry(): FormLicenseEntry {
    return {
        id: uid(),
        licenseNumber: '', licenseClass: '',
        country: 'United States', stateProvince: '',
        issueDate: '', expiryDate: '',
    };
}

/** One address captured by an 'address-list' field. */
export interface FormAddressEntry {
    id: string;
    street: string;
    unitNumber: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    country: string;
    fromDate: string;
    toDate: string;
}

export function newAddressEntry(): FormAddressEntry {
    return {
        id: uid(),
        street: '', unitNumber: '', city: '',
        stateProvince: '', postalCode: '',
        country: 'United States',
        fromDate: '', toDate: '',
    };
}

/** One license-disqualification record captured by a 'disqualification-list' field. */
export interface FormDisqualificationEntry {
    id: string;
    offenceTypes: string[];
    disqualificationDate: string;
    durationDays: string;
    explanation: string;
}

export function newDisqualificationEntry(): FormDisqualificationEntry {
    return {
        id: uid(),
        offenceTypes: [],
        disqualificationDate: '',
        durationDays: '',
        explanation: '',
    };
}

/** One accident record captured by an 'accident-list' field. */
export interface FormAccidentEntry {
    id: string;
    accidentDate: string;
    natureOfAccident: string;
    country: string;
    stateProvince: string;
    locationCity: string;
    fatalities: string;
    injuries: string;
    cargoDamage: boolean;
}

export function newAccidentEntry(): FormAccidentEntry {
    return {
        id: uid(),
        accidentDate: '',
        natureOfAccident: '',
        country: 'United States',
        stateProvince: '',
        locationCity: '',
        fatalities: '',
        injuries: '',
        cargoDamage: false,
    };
}

/** Crash-type options shown as radio buttons inside the accident popup. */
export const ACCIDENT_NATURE_OPTIONS = [
    'Head-on', 'Hit fixed object', 'Jackknife', 'Other', 'Rear-end',
    'Rear-to-rear', 'Rollover', 'Side-impact', 'Sideswipe', 'Upset',
];

/** One traffic-violation record captured by a 'violation-list' field. */
export interface FormViolationEntry {
    id: string;
    charge: string;
    issuingAgency: string;
    violationDate: string;
    country: string;
    stateProvince: string;
    city: string;
    penalty: string;
    penaltyAmount: string;
    description: string;
    pointsDeducted: boolean;
}

export function newViolationEntry(): FormViolationEntry {
    return {
        id: uid(),
        charge: '',
        issuingAgency: '',
        violationDate: '',
        country: 'United States',
        stateProvince: '',
        city: '',
        penalty: '',
        penaltyAmount: '',
        description: '',
        pointsDeducted: false,
    };
}

/** Penalty options shown in the violation popup's PENALTY dropdown. */
export const VIOLATION_PENALTY_OPTIONS = [
    'Fine', 'Demerit Points', 'Licence Suspension', 'Licence Revocation',
    'Jail Time', 'Community Service', 'Warning', 'Other',
];

/** One driving-experience record captured by a 'driving-experience-list' field. */
export interface FormDrivingExperienceEntry {
    id: string;
    equipmentClass: string;
    freightTypes: string[];
    drivingRegions: string[];
    fromDate: string;
    toDate: string;
    approximateMiles: string;
}

export function newDrivingExperienceEntry(): FormDrivingExperienceEntry {
    return {
        id: uid(),
        equipmentClass: '',
        freightTypes: [],
        drivingRegions: [],
        fromDate: '',
        toDate: '',
        approximateMiles: '',
    };
}

export const EQUIPMENT_CLASS_OPTIONS = [
    'Bus', 'Doubles/Triples', 'Other', 'Straight truck', 'Tanker', 'Tractor-trailer',
];

export const FREIGHT_TYPE_OPTIONS = [
    'Auto', 'Bulk', 'Flat', 'Hazmat', 'Other', 'Reefer', 'Tank', 'Van',
];

export const DRIVING_REGION_OPTIONS = [
    'Border', 'Canada', 'Canada-only', 'USA', 'USA-only', 'local',
];

/** One employment record captured by an 'employment-list' field. Spans the 4-step popup wizard. */
export interface FormEmploymentEntry {
    id: string;
    /* Step 1 — Employment Details */
    employerName: string;
    startDate: string;
    endDate: string;
    positionHeld: string;
    /* Step 2 — Contact Person's Detail */
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    /* Step 3 — Address Details */
    addressStreet: string;
    addressUnitNumber: string;
    addressCity: string;
    addressZipcode: string;
    addressCountry: string;
    addressState: string;
    /* Step 4 — Additional Details */
    reasonForLeaving: string;
    wage: string;
    hasGaps: boolean;
    gapFromDate: string;
    gapToDate: string;
    gapExplanation: string;
    subjectToFMCSR: boolean;
    drugAlcoholTesting: boolean;
    hasExperienceLetter: boolean;
    experienceLetterFile: string;
    hasInsuranceLetter: boolean;
    insuranceLetterFile: string;
}

export function newEmploymentEntry(): FormEmploymentEntry {
    return {
        id: uid(),
        employerName: '', startDate: '', endDate: '', positionHeld: '',
        contactName: '', contactPhone: '', contactEmail: '',
        addressStreet: '', addressUnitNumber: '', addressCity: '',
        addressZipcode: '', addressCountry: '', addressState: '',
        reasonForLeaving: '', wage: '',
        hasGaps: false, gapFromDate: '', gapToDate: '', gapExplanation: '',
        subjectToFMCSR: false, drugAlcoholTesting: false,
        hasExperienceLetter: false, experienceLetterFile: '',
        hasInsuranceLetter: false, insuranceLetterFile: '',
    };
}

export const POSITION_HELD_OPTIONS = ['Contract Employee', 'Owner Operator'];

/** One education record captured by an 'education-list' field. */
export interface FormEducationEntry {
    id: string;
    highestEducation: string;
    school: string;
    location: string;
    courseOfStudy: string;
    yearCompleted: string;
    reasonForNotGraduating: string;
}

export function newEducationEntry(): FormEducationEntry {
    return {
        id: uid(),
        highestEducation: '',
        school: '',
        location: '',
        courseOfStudy: '',
        yearCompleted: '',
        reasonForNotGraduating: '',
    };
}

export const HIGHEST_EDUCATION_OPTIONS = [
    'Bachelor', 'College diploma', 'Doctorate', 'High-school diploma',
    'High-school or less', 'Master', 'Other',
];

/** FMCSA §383.51 disqualifying offences — checked inside the disqualification popup. */
export const DISQUALIFICATION_OFFENCE_OPTIONS = [
    'Causing a fatality through the negligent operation of a CMV.',
    'Driving a CMV while revoked, suspended, canceled or disqualified as a result of prior violations committed while operating a CMV.',
    "Driving a CMV without obtaining a CLP or CDL or without a CLP or CDL in the driver's possession.",
    'Driving a CMV without the proper class license and/or endorsements.',
    'Driving recklessly.',
    'Driving under the influence of a controlled substance.',
    'Driving under the influence of alcohol as prescribed by State law.',
    'Following the vehicle ahead too closely.',
    'Having an alcohol concentration of .04 or greater while operating a CMV.',
    'Leaving the scene of an accident.',
    'Making improper or erratic traffic lane changes.',
    'Refusing to take an alcohol test as required by implied consent laws or regulations.',
    'Speeding excessively (15 mph or more over the speed limit).',
    'Using the vehicle in the commission of a felony involving the manufacturing, distributing, or dispensing of a controlled substance.',
    'Using the vehicle to commit a felony.',
    'Violating State or local law relating to motor vehicle traffic control arising in connection with a fatal accident.',
    'Violating laws relating to prohibiting texting or using a handheld mobile telephone while driving a CMV.',
];

// ── Per-form documents ────────────────────────────────────────────────────

export const DOCUMENT_CATEGORIES = [
    'Application', 'Identity', 'License', 'Medical', 'Background', 'Photo', 'Other',
];

export interface FormDocument {
    id: string;
    /** References a row in the Document Types library — drives the upload widget. */
    documentTypeId?: string;
    /** Display label shown to the applicant (overrides the linked type's name on this form). */
    label: string;
    category: string;
    required: boolean;
    /** Whether the applicant can upload multiple files for this document. */
    allowMultiple?: boolean;
    /** When allowMultiple is on: number of labeled upload slots (undefined = unlimited). */
    numberOfSlots?: number;
    /** Per-slot labels, e.g. ["Front", "Rear"]. */
    slotLabels?: string[];
    /** Whether an expiry date is required for this document. */
    expiryRequired?: boolean;
    /** Whether an issue date is required for this document. */
    issueDateRequired?: boolean;
    /** Whether an issuing state / province is required. */
    issueStateRequired?: boolean;
    /** Whether an issuing country is required. */
    issueCountryRequired?: boolean;
    /** Active / Inactive — Inactive docs are hidden from new applicants but kept on past records. */
    status?: 'Active' | 'Inactive';
    /** ISO date this document type was added (used for the Date column). */
    addedDate?: string;
    /** Where the upload widget appears on the live form.
     *   • `'bottom'` (default) → in the Required Documents section at the bottom
     *   • `'after:{fieldId}'`  → inline, immediately after that field
     *   • `'inline-end'`       → inline, after every field, before the Required Documents section. */
    placement?: string;
    /** Conditional reveal: hide this document upload until a toggle on the form matches. */
    showWhen?: { fieldId: string; equals: boolean | string };
}

// ── Form definition ───────────────────────────────────────────────────────

export type ApplicationFormKind = 'standard' | 'custom';

export interface ApplicationFormDef {
    id: string;
    kind: ApplicationFormKind;
    /** Internal name — shown in admin lists / pickers. */
    name: string;
    /** Display title — the heading the applicant sees on the form itself. */
    displayTitle: string;
    description: string;
    /** Intro / instructions paragraph shown to the applicant before step 1. */
    introText: string;
    /** Custom forms only — the admin-built fields. Empty for 'standard'. */
    fields: FormField[];
    /** Documents the applicant must upload for this form. */
    documents: FormDocument[];
    /** Built-in form — locked against deletion. */
    isDefault: boolean;
    /** Subform = embedded inside another form via a list-with-popup field (e.g. Employer Details
     *  is the body of the Employment Details popup). Subforms are still editable Application
     *  Forms — they just get a SUBFORM badge so admins can tell them apart at a glance. */
    isSubform?: boolean;
    /** For subforms — the label shown on the button that opens the subform's popup in any
     *  Application Form that references it (e.g. "Add Employer", "Add Address"). */
    buttonName?: string;
    updatedAt: string;
}

const FORMS_KEY = 'ats:application-forms-v28';

/** Built-in forms that were retired — pruned from saved data on load. */
const REMOVED_FORM_IDS = new Set(['form-hiring-decision']);

/** Backfill the `showWhen` mapping for known seed field IDs in case older
 *  saved data was written before conditional reveal was added. */
const KNOWN_SHOW_WHEN: Record<string, { fieldId: string; equals: boolean }> = {
    'f-addr-history':         { fieldId: 'f-addr-3y',       equals: false },
    'f-lic-endorsements':     { fieldId: 'f-lic-has-end',   equals: true },
    'f-lic-restrictions':     { fieldId: 'f-lic-has-rest',  equals: true },
    'f-lic-other-list':       { fieldId: 'f-lic-other',     equals: true },
    // Incident/history sections — gated behind a leading Yes/No.
    'f-acc-list':             { fieldId: 'f-acc-any',       equals: true },
    'f-vio-list':             { fieldId: 'f-vio-any',       equals: true },
    'f-disq-list':            { fieldId: 'f-disq-any',      equals: true },
    'f-disq-denial-details':  { fieldId: 'f-disq-any',      equals: true },
};

/** US states (+ DC) and Canadian provinces/territories — the canonical address picker list. */
export const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
    'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
];
export const CA_PROVINCES = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador',
    'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island',
    'Quebec', 'Saskatchewan', 'Yukon',
];
export const STATES_PROVINCES = [...US_STATES, ...CA_PROVINCES];
export const COUNTRY_OPTIONS = ['Canada', 'United States'];

/** Force the field type for known seed IDs so older saved data adopts the latest renderer. */
const KNOWN_FIELD_TYPES: Record<string, FormFieldType> = {
    'f-addr-history':   'address-list',
    'f-lic-other-list': 'license-list',
    // Country & State pickers → proper dropdowns (system address format).
    'f-addr-country': 'select', 'f-sa-country': 'select', 'f-sl-country': 'select',
    'f-sac-country': 'select', 'f-sv-country': 'select',
    'f-addr-state': 'select', 'f-sa-state': 'select', 'f-sl-state': 'select',
    'f-sac-state': 'select', 'f-sv-state': 'select',
};

/** Canonical option lists for the country/state pickers, applied when a field has no options. */
const KNOWN_OPTIONS: Record<string, string[]> = {
    'f-addr-country': COUNTRY_OPTIONS, 'f-sa-country': COUNTRY_OPTIONS, 'f-sl-country': COUNTRY_OPTIONS,
    'f-sac-country': COUNTRY_OPTIONS, 'f-sv-country': COUNTRY_OPTIONS,
    'f-addr-state': STATES_PROVINCES, 'f-sa-state': STATES_PROVINCES, 'f-sl-state': STATES_PROVINCES,
    'f-sac-state': STATES_PROVINCES, 'f-sv-state': STATES_PROVINCES,
};

/** Sensible half-width pairings for built-in forms so short fields sit side-by-side
 *  (applied in normalize() without a storage bump — only when no width is already set). */
const KNOWN_WIDTHS: Record<string, 'full' | 'half'> = {
    // Applicant Information
    'f-first-name': 'half', 'f-last-name': 'half',
    'f-phone': 'half', 'f-dob': 'half',
    // Address Details — current address block
    'f-addr-city': 'half', 'f-addr-state': 'half',
    'f-addr-zip': 'half', 'f-addr-from': 'half',
    // Cross-Border — passport & FAST card number/expiry pairs
    'f-cb-passport': 'half', 'f-cb-passport-expiry': 'half',
    'f-cb-card-number': 'half', 'f-cb-card-expiry': 'half',
    // Address subform popup
    'f-sa-city': 'half', 'f-sa-state': 'half', 'f-sa-zip': 'half', 'f-sa-country': 'half',
    'f-sa-from': 'half', 'f-sa-to': 'half',
    // License subform popup
    'f-sl-number': 'half', 'f-sl-class': 'half', 'f-sl-country': 'half', 'f-sl-state': 'half',
    'f-sl-issued': 'half', 'f-sl-expiry': 'half',
    // Accident subform popup
    'f-sac-state': 'half', 'f-sac-city': 'half', 'f-sac-fatalities': 'half', 'f-sac-injuries': 'half',
    // Violation subform popup
    'f-sv-charge': 'half', 'f-sv-agency': 'half', 'f-sv-state': 'half', 'f-sv-city': 'half',
    'f-sv-penalty': 'half', 'f-sv-amount': 'half',
    // Disqualification subform popup
    'f-sd-date': 'half', 'f-sd-duration': 'half',
    // Education subform popup
    'f-sed-school': 'half', 'f-sed-location': 'half', 'f-sed-course': 'half', 'f-sed-year': 'half',
};

/** Each built-in list field is backed by an editable subform — its "add more"
 *  popup renders the subform's fields (managed in the Subforms tab) instead of a
 *  hardcoded modal. Backfilled in normalize() so seeds + saved data both link. */
const KNOWN_LIST_SUBFORMS: Record<string, string> = {
    'f-addr-history':   'form-sub-address',
    'f-lic-other-list': 'form-sub-license',
    'f-disq-list':      'form-sub-disqualification',
    'f-acc-list':       'form-sub-accident',
    'f-vio-list':       'form-sub-violation',
    'f-drv-list':       'form-sub-driving-experience',
    'f-emp-list':       'form-employer-details',
    'f-edu-list':       'form-sub-education',
};

/** Built-in form IDs that should be tagged as subforms (used inside another form via a popup). */
const KNOWN_SUBFORM_IDS = new Set([
    'form-employer-details',
    'form-sub-address',
    'form-sub-license',
    'form-sub-disqualification',
    'form-sub-accident',
    'form-sub-violation',
    'form-sub-driving-experience',
    'form-sub-education',
]);

/** Built-in form IDs that should always be marked as default (locked). */
const KNOWN_DEFAULT_FORM_IDS = new Set([
    'form-applicant-information',
    'form-address-details',
    'form-license-details',
    'form-license-disqualification',
    'form-accident-details',
    'form-violation-details',
    'form-medical-details',
    'form-driving-experience',
    'form-employment-details',
    'form-employer-details',
    'form-education-details',
    'form-cross-border-details',
    'form-additional-details',
    'form-acknowledgment',
    // Compliance review pipeline forms
    'form-psp-review',
    'form-mvr-review',
    'form-criminal-background',
    'form-substance-testing',
    'form-clearinghouse-query',
    'form-employment-verification',
    // Subforms (one record each — opened via the "+ Add X" button on parent forms)
    'form-sub-address',
    'form-sub-license',
    'form-sub-disqualification',
    'form-sub-accident',
    'form-sub-violation',
    'form-sub-driving-experience',
    'form-sub-education',
]);

const today = (): string => new Date().toISOString().slice(0, 10);

function seedForms(): ApplicationFormDef[] {
    return [{
        id: 'form-applicant-information',
        kind: 'custom',
        name: 'Applicant Information',
        displayTitle: 'Applicant Information',
        description: 'Applicant identity and contact details.',
        introText: '',
        fields: [
            { id: 'f-first-name', label: 'First Name', type: 'text', required: false, instruction: '', options: [] },
            { id: 'f-last-name', label: 'Last Name', type: 'text', required: false, instruction: '', options: [] },
            { id: 'f-email', label: 'Email', type: 'text', required: false, instruction: '', options: [] },
            { id: 'f-phone', label: 'Phone Number', type: 'text', required: true, instruction: '', options: [] },
            { id: 'f-dob', label: 'Date of Birth', type: 'date', required: true, instruction: '', options: [] },
            { id: 'f-ssn', label: 'Social Security Number', type: 'text', required: true, instruction: '', options: [] },
            { id: 'f-legal-work', label: 'Do you have legal right to work in the United States?', type: 'toggle', required: false, instruction: '', options: [] },
            { id: 'f-position-type', label: 'Position Type', type: 'select', required: false, instruction: '', options: ['Local', 'Regional', 'OTR (Over the Road)', 'Owner-Operator', 'Casual / Part-time'] },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-address-details',
        kind: 'custom',
        name: 'Address Details',
        displayTitle: 'Driver Address',
        description: 'Current residential address plus 3-year address history.',
        introText: '',
        fields: [
            { id: 'f-addr-street', label: 'Street', type: 'text', required: true, instruction: '', options: [] },
            { id: 'f-addr-unit', label: 'Unit Number', type: 'text', required: false, instruction: '', options: [] },
            { id: 'f-addr-city', label: 'City', type: 'text', required: true, instruction: '', options: [] },
            { id: 'f-addr-state', label: 'State / Province', type: 'select', required: true, instruction: '', options: [] },
            { id: 'f-addr-zip', label: 'Zipcode', type: 'text', required: true, instruction: '', options: [] },
            { id: 'f-addr-country', label: 'Country', type: 'radio', required: true, instruction: '', options: ['Canada', 'United States'] },
            { id: 'f-addr-from', label: 'From', type: 'date', required: true, instruction: '', options: [] },
            { id: 'f-addr-3y', label: 'Lived here 3+ years?', type: 'toggle', required: false, instruction: 'If no, add prior addresses below covering the past 3 years.', options: [] },
            { id: 'f-addr-history', label: 'Address History', type: 'address-list', required: false, instruction: "Please provide all addresses where you've lived in the past 3 years.", options: [], subformId: 'form-sub-address', showWhen: { fieldId: 'f-addr-3y', equals: false } },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-license-details',
        kind: 'custom',
        name: 'License Details',
        displayTitle: 'Driver License',
        description: 'Current driver\'s license with endorsements, restrictions, and front/back photos.',
        introText: "Enter your active driver's license information.",
        fields: [
            // ONE combined component — the Driver License key number + its linked
            // document (Front/Back + dates) captured together, because they're linked.
            { id: 'f-lic-compliance', label: 'Driver License', type: 'compliance', required: true, instruction: 'Enter the license number and upload the Front & Back. Issue/expiry/state/country are captured once.', options: [], complianceKeyNumberId: 'kn-dl-std', dataKey: 'license.number' },
            {
                id: 'f-lic-has-end', label: 'Have Endorsements?', type: 'toggle', required: false,
                instruction: '', options: [],
            },
            {
                id: 'f-lic-endorsements', label: 'Endorsements', type: 'checklist', required: false, instruction: '',
                options: [
                    'H - Placarded Hazmat',
                    'N - Tank Vehicles',
                    'P - Passengers',
                    'S - School Bus',
                    'T - Double/Triple Trailers',
                    'X - Placarded Hazmat & Tank Vehicles',
                    'AZ - Tractor-trailer with air-brake',
                ],
                showWhen: { fieldId: 'f-lic-has-end', equals: true },
            },
            {
                id: 'f-lic-has-rest', label: 'Have Restriction?', type: 'toggle', required: false,
                instruction: '', options: [],
            },
            {
                id: 'f-lic-restrictions', label: 'Restrictions', type: 'checklist', required: false, instruction: '',
                options: [
                    'B - Corrective Lenses',
                    'C - Mechanical aid',
                    'D - Prosthetic aid',
                    'E - The driver may only operate a commercial vehicle with an automatic transmission.',
                    'F - An outside mirror is required on the commercial vehicle',
                    'G - The driver of a commercial vehicle is only allowed to operate during daylight hours',
                    'H - Hazardous-materials prohibition (U.S. only)',
                    'K - Drivers are authorized to drive a commercial vehicle within the state of issue (intrastate) only',
                    'L - Drivers are restricted from operating a commercial vehicle with air brakes',
                    'M - CDL-A holders may operate CDL-B school buses only',
                    'N - CDL-A and CDL-B holders may operate CDL-C school buses only',
                    'O - Driver limited to pintle hook trailers only',
                    'Q - Power steering / air-assist required',
                    'R - Farm-vehicle-only restriction',
                    'S - No air-brake CMV (Ontario equivalent of L)',
                    'T - 60-day temporary license',
                    'V - Medical variance / skill-performance evaluation (FMCSA medical waiver)',
                    'Z - Alcohol Interlock Device required in the commercial vehicle',
                ],
                showWhen: { fieldId: 'f-lic-has-rest', equals: true },
            },
            { id: 'f-lic-other', label: 'Any Other Licenses (Last 3 Years)?', type: 'toggle', required: false, instruction: '', options: [] },
            { id: 'f-lic-other-list', label: 'Previous Licenses', type: 'license-list', required: false, instruction: 'Add each prior license held in the last 3 years.', options: [], subformId: 'form-sub-license', showWhen: { fieldId: 'f-lic-other', equals: true } },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-license-disqualification',
        kind: 'custom',
        name: 'License Disqualification Details',
        displayTitle: 'License Disqualification Details',
        description: 'Driver license denials, suspensions, and revocations.',
        introText: '',
        fields: [
            {
                id: 'f-disq-any', type: 'toggle', required: false, options: [], instruction: '',
                label: 'Have you ever been denied, suspended, revoked, or disqualified from a license, permit, or privilege to operate a motor vehicle?',
            },
            {
                id: 'f-disq-denial-details', type: 'text', required: false, options: [], instruction: 'Briefly describe what happened.',
                label: 'Details',
                showWhen: { fieldId: 'f-disq-any', equals: true },
            },
            {
                id: 'f-disq-list', type: 'disqualification-list', required: false, options: [], subformId: 'form-sub-disqualification',
                label: 'Suspensions / Revocations',
                instruction: 'Add each suspension, revocation, or disqualification using the "+" button.',
                showWhen: { fieldId: 'f-disq-any', equals: true },
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-accident-details',
        kind: 'custom',
        name: 'Accident Details',
        displayTitle: 'Accident Details',
        description: 'Commercial-vehicle accident history with dates, locations, injuries, and cargo damage.',
        introText: '',
        fields: [
            {
                id: 'f-acc-heading', type: 'heading', required: false, options: [],
                label: 'Accident History',
                instruction: 'Accidents or incidents you have been involved in over the last 3 years.',
            },
            {
                id: 'f-acc-any', type: 'toggle', required: false, options: [], instruction: '',
                label: 'Have you been involved in any accidents or incidents in the last 3 years (even if not at fault)?',
            },
            {
                id: 'f-acc-list', type: 'accident-list', required: false, options: [], subformId: 'form-sub-accident',
                label: 'Accidents',
                instruction: 'Add each accident using the "+" button.',
                showWhen: { fieldId: 'f-acc-any', equals: true },
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-violation-details',
        kind: 'custom',
        name: 'Traffic Violation Details',
        displayTitle: 'Traffic Violation Details',
        description: 'Traffic violations or convictions with charge, date, location, penalty, and points.',
        introText: '',
        fields: [
            {
                id: 'f-vio-heading', type: 'heading', required: false, options: [],
                label: 'Traffic Violations',
                instruction: 'Moving violations or traffic convictions over the last 3 years.',
            },
            {
                id: 'f-vio-any', type: 'toggle', required: false, options: [], instruction: '',
                label: 'Have you had any moving violations or traffic convictions in the last 3 years?',
            },
            {
                id: 'f-vio-list', type: 'violation-list', required: false, options: [], subformId: 'form-sub-violation',
                label: 'Violations',
                instruction: 'Add each violation using the "+" button.',
                showWhen: { fieldId: 'f-vio-any', equals: true },
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-medical-details',
        kind: 'custom',
        name: 'Medical Details',
        displayTitle: 'Medical Clearance',
        description: 'Medical certificate, examiner, and commercial-driving health questions.',
        introText: 'Upload your medical card and answer a few quick health questions required for commercial driving.',
        fields: [
            { id: 'f-med-cert', type: 'document', required: false, options: [], instruction: 'The certificate upload also captures its issue & expiry dates — no separate date field needed.', label: 'Medical Certificate Document', documentTypeId: 'dt-medcert' },
            { id: 'f-med-doctor', type: 'text', required: false, options: [], instruction: '', label: 'Doctor / Examiner Name' },
            { id: 'f-med-fit', type: 'toggle', required: false, options: [], instruction: '', label: 'Are you generally fit to drive a commercial vehicle?' },
            { id: 'f-med-lenses', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you need corrective lenses to drive?' },
            { id: 'f-med-hearing', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you need a hearing aid to drive?' },
            { id: 'f-med-diabetes', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you take insulin for diabetes?' },
            { id: 'f-med-seizure', type: 'toggle', required: false, options: [], instruction: '', label: 'Have you had a seizure in the last 5 years?' },
            { id: 'f-med-heart', type: 'toggle', required: false, options: [], instruction: '', label: 'Any heart / cardiovascular event in the last 12 months?' },
            { id: 'f-med-bp', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you have high or low blood pressure that affects driving?' },
            { id: 'f-med-exam', type: 'toggle', required: false, options: [], instruction: '', label: 'Will you take a medical exam if requested by our doctor?' },
            {
                id: 'f-med-frequency', type: 'radio', required: false, instruction: '',
                label: 'How often do you usually drive commercially?',
                options: ['Daily', 'Occasionally', 'Weekly'],
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-driving-experience',
        kind: 'custom',
        name: 'Driving Experience',
        displayTitle: 'Driving Experience',
        description: 'Equipment class, freight types, regions driven, dates, mileage, and owner-operator status.',
        introText: '',
        fields: [
            {
                id: 'f-drv-heading', type: 'heading', required: false, options: [],
                label: 'Driving Experience',
                instruction: 'Add each equipment class you have driven — equipment, freight types, regions, dates, and mileage.',
            },
            {
                id: 'f-drv-list', type: 'driving-experience-list', required: true, options: [], subformId: 'form-sub-driving-experience',
                label: 'Experience Records',
                instruction: 'Add each driving-experience record using the "+" button.',
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-employment-details',
        kind: 'custom',
        name: 'Employment Details',
        displayTitle: 'Employment Details',
        description: 'Bonding, essential job functions, and 10-year (US) / 3-year (Canada) employment history.',
        introText: '',
        fields: [
            {
                id: 'f-emp-bond', type: 'toggle', required: false, options: [], instruction: '',
                label: 'Does your job require you to fill bond with any company information?',
            },
            {
                id: 'f-emp-bond-details', type: 'text', required: false, options: [], instruction: '',
                label: 'Company Name and Bonding Details',
                showWhen: { fieldId: 'f-emp-bond', equals: true },
            },
            {
                id: 'f-emp-can-perform', type: 'toggle', required: false, options: [], instruction: '',
                label: 'Can you perform, with or without reasonable accommodation, the essential functions as per the job requirement?',
            },
            {
                id: 'f-emp-heading', type: 'heading', required: false, options: [],
                label: 'Employment History',
                instruction: 'Please provide employment history: last 10 years for the United States, last 3 years for Canada. List employers in reverse order, starting with the most recent. Applicants applying to drive a commercial motor vehicle in intrastate or interstate commerce must also provide an additional 7 years of employment information for positions involving the operation of such vehicles.',
            },
            {
                id: 'f-emp-list', type: 'employment-list', required: false, options: [], subformId: 'form-employer-details',
                label: 'Employers',
                instruction: 'Use the "+" button to add each employer.',
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-employer-details',
        kind: 'custom',
        name: 'Employer Details',
        displayTitle: 'Employer Details',
        description: 'Single-employer record — every field from the Employment Details "Add Employer" popup, available as a standalone form.',
        introText: 'Provide complete details for one employer. Fields are grouped by section so each piece of the popup wizard is editable here.',
        isSubform: true,
        buttonName: 'Add Employer',
        fields: [
            /* ── Section 1 — Employment Details ─────────────────────────── */
            { id: 'f-emper-heading-1', type: 'heading', required: false, options: [], label: 'Employment Details', instruction: 'Basic employer + role information.' },
            { id: 'f-emper-employer-name', type: 'text', required: true, options: [], instruction: '', label: 'Employer Name' },
            { id: 'f-emper-start-date',    type: 'date', required: true, options: [], instruction: '', label: 'Start Date' },
            { id: 'f-emper-end-date',      type: 'date', required: true, options: [], instruction: '', label: 'End Date' },
            { id: 'f-emper-position', type: 'radio', required: false, instruction: '', label: 'Position Held', options: ['Contract Employee', 'Owner Operator'] },

            /* ── Section 2 — Contact Person ─────────────────────────────── */
            { id: 'f-emper-heading-2', type: 'heading', required: false, options: [], label: 'Contact Person', instruction: 'Who can we contact for employment verification?' },
            { id: 'f-emper-contact-name',  type: 'text', required: true, options: [], instruction: '', label: 'Name' },
            { id: 'f-emper-contact-phone', type: 'text', required: true, options: [], instruction: '', label: 'Phone Number' },
            { id: 'f-emper-contact-email', type: 'text', required: false, options: [], instruction: '', label: 'Email' },

            /* ── Section 3 — Address ────────────────────────────────────── */
            { id: 'f-emper-heading-3', type: 'heading', required: false, options: [], label: 'Employer Address', instruction: '' },
            { id: 'f-emper-street', type: 'text', required: false, options: [], instruction: '', label: 'Street' },
            { id: 'f-emper-unit',   type: 'text', required: false, options: [], instruction: '', label: 'Unit Number' },
            { id: 'f-emper-city',   type: 'text', required: false, options: [], instruction: '', label: 'City' },
            { id: 'f-emper-zip',    type: 'text', required: false, options: [], instruction: '', label: 'Zipcode' },
            { id: 'f-emper-country', type: 'radio', required: false, instruction: '', label: 'Country', options: ['Canada', 'United States'] },
            { id: 'f-emper-state',  type: 'text', required: false, options: [], instruction: '', label: 'State / Province' },

            /* ── Section 4 — Additional Details ─────────────────────────── */
            { id: 'f-emper-heading-4', type: 'heading', required: false, options: [], label: 'Additional Details', instruction: '' },
            { id: 'f-emper-reason', type: 'text',   required: false, options: [], instruction: '', label: 'Reason for Leaving' },
            { id: 'f-emper-wage',   type: 'text',   required: false, options: [], instruction: '', label: 'Wage ($/hr)' },
            { id: 'f-emper-has-gaps', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you have any gaps in employment?' },
            { id: 'f-emper-gap-from', type: 'date', required: false, options: [], instruction: '', label: 'Gap From', showWhen: { fieldId: 'f-emper-has-gaps', equals: true } },
            { id: 'f-emper-gap-to',   type: 'date', required: false, options: [], instruction: '', label: 'Gap To',   showWhen: { fieldId: 'f-emper-has-gaps', equals: true } },
            { id: 'f-emper-gap-explain', type: 'text', required: false, options: [], instruction: '', label: 'Explain Reason', showWhen: { fieldId: 'f-emper-has-gaps', equals: true } },
            { id: 'f-emper-fmcsr', type: 'toggle', required: false, options: [], instruction: '', label: 'Were you subjected to US DOT regulations while employed (FMCSRs*)?' },
            { id: 'f-emper-drug-alcohol', type: 'toggle', required: false, options: [], instruction: '', label: 'Were you required to do drug and alcohol testing as per 49 CFR Part 40?' },
            { id: 'f-emper-has-exp-letter', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you have an Employer Experience Letter from this employer?' },
            { id: 'f-emper-exp-letter',  type: 'document', required: false, options: [], instruction: '', label: 'Employer Experience Letter', documentTypeId: 'dt-emp-experience-letter', showWhen: { fieldId: 'f-emper-has-exp-letter', equals: true } },
            { id: 'f-emper-has-ins-letter', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you have an Employer Insurance Experience Letter for this employer?' },
            { id: 'f-emper-ins-letter', type: 'document', required: false, options: [], instruction: '', label: 'Insurance Experience Letter', documentTypeId: 'dt-insurance-letter', showWhen: { fieldId: 'f-emper-has-ins-letter', equals: true } },
            {
                id: 'f-emper-fmcsr-note', type: 'alert', required: false, options: [], instruction: '',
                label: '* The Federal Motor Carrier Safety Regulations (FMCSRs) apply to anyone operating a motor vehicle on a highway in interstate commerce to transport passengers or property when the vehicle: (1) weighs or has a GVWR of 10,001 pounds or more, (2) is designed or used to transport more than 8 passengers (including the driver), OR (3) is of any size and is used to transport hazardous materials in a quantity requiring placarding.',
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-education-details',
        kind: 'custom',
        name: 'Education Details',
        displayTitle: 'Education Details',
        description: 'Highest level completed, institution name, course of study, and graduation status.',
        introText: '',
        fields: [
            {
                id: 'f-edu-heading', type: 'heading', required: false, options: [],
                label: 'Education',
                instruction: 'Add each school you attended — highest level, institution, course of study, and graduation status.',
            },
            {
                id: 'f-edu-list', type: 'education-list', required: true, options: [], subformId: 'form-sub-education',
                label: 'Schools',
                instruction: 'Add each school using the "+" button.',
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-cross-border-details',
        kind: 'custom',
        name: 'Cross Border Details',
        displayTitle: 'Driver Cross Border Details',
        description: 'Legal status, passport, FAST card, and entry-history details for cross-border driving.',
        introText: '',
        fields: [
            {
                id: 'f-cb-status', type: 'radio', required: true, instruction: '',
                label: 'Legal Status in Canada / U.S.',
                options: [
                    'Canadian citizen', 'Canadian permanent resident', 'Other / will provide on hire',
                    'U.S. citizen', 'U.S. permanent resident', 'Work-permit holder',
                ],
            },
            { id: 'f-cb-passport', type: 'text', required: false, options: [], instruction: '', label: 'Passport Number' },
            { id: 'f-cb-passport-expiry', type: 'date', required: false, options: [], instruction: '', label: 'Passport Expiry Date' },
            { id: 'f-cb-enhanced-license', type: 'toggle', required: false, options: [], instruction: '', label: 'Do you have an enhanced driver licence?' },
            {
                id: 'f-cb-fast-type', type: 'radio', required: false, instruction: '',
                label: 'FAST Card Type',
                options: ['FAST', 'KTN (Known Traveler Number)', 'NEXUS', 'SENTRI'],
            },
            { id: 'f-cb-card-number', type: 'text', required: false, options: [], instruction: '', label: 'Card / Membership Number' },
            { id: 'f-cb-card-expiry', type: 'date', required: false, options: [], instruction: '', label: 'FAST Card Expiry Date' },
            { id: 'f-cb-willing', type: 'toggle', required: false, options: [], instruction: '', label: 'Are you willing to obtain a FAST card if required?' },
            { id: 'f-cb-felony', type: 'toggle', required: false, options: [], instruction: '', label: 'Have you ever been convicted of a felony in the U.S. or Canada?' },
            { id: 'f-cb-denied', type: 'toggle', required: false, options: [], instruction: '', label: 'Have you ever been denied entry to the U.S. or Canada?' },
            { id: 'f-cb-passport-doc', type: 'document', required: false, options: [], instruction: '', label: 'Passport Document', documentTypeId: 'dt-passport' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-additional-details',
        kind: 'custom',
        name: 'Additional Declarations',
        displayTitle: 'Additional Declarations',
        description: 'Driver self-declarations (criminal charges, English proficiency). Compliance documents (MVR, PSP, abstract, background) are collected on their own review forms.',
        introText: 'A couple of declarations. The driving-record, PSP, abstract and background documents are gathered on the dedicated review forms — not here.',
        fields: [
            { id: 'f-add-criminal-charges', type: 'toggle', required: false, options: [], instruction: 'Self-declaration. The criminal background report is collected on the Criminal Background Check form.', label: 'Do you have any criminal charges against you?' },
            {
                id: 'f-add-english', type: 'toggle', required: false, options: [], instruction: '',
                label: 'Can you speak and read English satisfactorily to converse with the general public, understand traffic signs and signals, respond to official questions, and make legible entries on reports and records?',
            },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-acknowledgment',
        kind: 'custom',
        name: 'Acknowledgment',
        displayTitle: 'To Be Read and Signed by Applicant',
        description: 'Applicant authorization, rights statement, and e-signature.',
        introText: '',
        fields: [
            {
                id: 'f-ack-title', type: 'heading', required: false, options: [],
                label: 'To Be Read and Signed by Applicant',
                instruction: '',
            },
            {
                id: 'f-ack-p1', type: 'paragraph', required: false, options: [], label: '',
                instruction: 'I authorize you to make investigations (including contacting current and prior employers) into my personal, employment, financial, medical history, and other related matters as may be necessary in arriving at an employment decision. I hereby release employers, schools, health care providers, and other persons from all liability in responding to inquiries and releasing information in connection with my application.',
            },
            {
                id: 'f-ack-p2', type: 'paragraph', required: false, options: [], label: '',
                instruction: 'In the event of employment, I understand that false or misleading information given in my application or interview(s) may result in discharge. I also understand that I am required to abide by all rules and regulations of the Company.',
            },
            {
                id: 'f-ack-p3', type: 'paragraph', required: false, options: [], label: '',
                instruction: 'I understand that the information I provide regarding my current and/or prior employers may be used, and those employer(s) will be contacted for the purpose of investigating my safety performance history as required by 49 CFR 391.23.',
            },
            {
                id: 'f-ack-rights', type: 'bullet-list', required: false, instruction: '',
                label: 'I understand that I have the right to:',
                options: [
                    'Review information provided by current/previous employers;',
                    'Have errors in the information corrected by previous employers, and for those previous employers to resend the corrected information to the prospective employer; and',
                    'Have a rebuttal statement attached to the alleged erroneous information, if the previous employer(s) and I cannot agree on the accuracy of the information.',
                ],
            },
            {
                id: 'f-ack-p4', type: 'paragraph', required: false, options: [], label: '',
                instruction: 'This certifies that I completed this application, and that all entries on it and information in it are true and complete to the best of my knowledge.',
            },
            {
                id: 'f-ack-alert', type: 'alert', required: false, options: [], instruction: '',
                label: 'Note: A motor carrier may require an applicant to provide more information than that required by the Federal Motor Carrier Safety Regulations.',
            },
            {
                id: 'f-ack-signature', type: 'signature', required: true, options: [],
                label: 'Applicant Signature',
                instruction: 'Draw your signature using your mouse or finger.',
            },
            { id: 'f-ack-print-name', type: 'text', required: true, options: [], instruction: '', label: 'Print Name' },
            { id: 'f-ack-date', type: 'date', required: true, options: [], instruction: '', label: 'Signed Date' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),

    /* ═══════════════════════════════════════════════════════════════════════
     * Subforms — single-record forms opened from list-type popups (+ Add X).
     * Each one mirrors a hardcoded popup in CustomFormWizard so admins can
     * inspect and tweak the popup fields through the same builder UI.
     * ═══════════════════════════════════════════════════════════════════════ */

    }, {
        id: 'form-sub-address',
        kind: 'custom',
        name: 'Add Address',
        displayTitle: 'Add Address',
        description: 'Single address record — used inside the Address Details "+ Add Address" popup.',
        introText: '',
        isSubform: true,
        buttonName: 'Add Address',
        fields: [
            { id: 'f-sa-street',   type: 'text',  required: true,  options: [], instruction: '', label: 'Street' },
            { id: 'f-sa-unit',     type: 'text',  required: false, options: [], instruction: '', label: 'Unit Number' },
            { id: 'f-sa-city',     type: 'text',  required: true,  options: [], instruction: '', label: 'City' },
            { id: 'f-sa-state',    type: 'text',  required: false, options: [], instruction: '', label: 'State / Province' },
            { id: 'f-sa-zip',      type: 'text',  required: true,  options: [], instruction: '', label: 'Zipcode' },
            { id: 'f-sa-country',  type: 'radio', required: true,  options: ['Canada', 'United States'], instruction: '', label: 'Country' },
            { id: 'f-sa-from',     type: 'date',  required: false, options: [], instruction: '', label: 'From Date' },
            { id: 'f-sa-to',       type: 'date',  required: false, options: [], instruction: '', label: 'To Date' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-sub-license',
        kind: 'custom',
        name: 'Add License',
        displayTitle: 'Add License',
        description: 'Single license record — used inside the License Details "+ Add License" popup. Captures the front + back uploads via linked Document Types.',
        introText: '',
        isSubform: true,
        buttonName: 'Add License',
        fields: [
            { id: 'f-sl-number',   type: 'text',  required: true,  options: [], instruction: '', label: 'License Number', width: 'half' },
            { id: 'f-sl-class',    type: 'text',  required: false, options: [], instruction: 'e.g. Class A', label: 'License Class', width: 'half' },
            // ONE combined Front/Back license document — issuing country/state + issue/expiry
            // dates are captured here once, so we don't ask for the same data twice.
            { id: 'f-sl-doc', type: 'document', required: true, options: [], instruction: 'Upload the Front & Back. Issuing country/state and issue/expiry dates are captured here once.', label: 'Driver License (Front & Back)', documentTypeId: 'dt-lic-frontback' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-sub-disqualification',
        kind: 'custom',
        name: 'Add Disqualification',
        displayTitle: 'License Disqualification',
        description: 'Single license-disqualification record — used inside the License Disqualification Details "+ Add Disqualification" popup.',
        introText: 'Pick every offence that applies, then capture the disqualification date and duration.',
        isSubform: true,
        buttonName: 'Add Disqualification',
        fields: [
            {
                id: 'f-sd-offences', type: 'checklist', required: false, instruction: '',
                label: 'Offence Type',
                options: [
                    'Causing a fatality through the negligent operation of a CMV.',
                    'Driving a CMV while revoked, suspended, canceled or disqualified as a result of prior violations committed while operating a CMV.',
                    "Driving a CMV without obtaining a CLP or CDL or without a CLP or CDL in the driver's possession.",
                    'Driving a CMV without the proper class license and/or endorsements.',
                    'Driving recklessly.',
                    'Driving under the influence of a controlled substance.',
                    'Driving under the influence of alcohol as prescribed by State law.',
                    'Following the vehicle ahead too closely.',
                    'Having an alcohol concentration of .04 or greater while operating a CMV.',
                    'Leaving the scene of an accident.',
                    'Making improper or erratic traffic lane changes.',
                    'Refusing to take an alcohol test as required by implied consent laws or regulations.',
                    'Speeding excessively (15 mph or more over the speed limit).',
                    'Using the vehicle in the commission of a felony involving the manufacturing, distributing, or dispensing of a controlled substance.',
                    'Using the vehicle to commit a felony.',
                    'Violating State or local law relating to motor vehicle traffic control arising in connection with a fatal accident.',
                    'Violating laws relating to prohibiting texting or using a handheld mobile telephone while driving a CMV.',
                ],
            },
            { id: 'f-sd-date',     type: 'date',     required: true, options: [], instruction: '', label: 'Disqualification Date' },
            { id: 'f-sd-duration', type: 'number',   required: true, options: [], instruction: '', label: 'Duration in Days' },
            { id: 'f-sd-explain',  type: 'textarea', required: false, options: [], instruction: '', label: 'Explanation' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-sub-accident',
        kind: 'custom',
        name: 'Add Accident',
        displayTitle: 'Accident Record',
        description: 'Single accident record — used inside the Accident Details "+ Add Accident" popup.',
        introText: 'Please include the accident date, location, nature of the accident, and any injuries, fatalities, or cargo damage / spill.',
        isSubform: true,
        buttonName: 'Add Accident',
        fields: [
            { id: 'f-sac-date', type: 'date', required: true, options: [], instruction: '', label: 'Accident Date' },
            {
                id: 'f-sac-nature', type: 'radio', required: true, instruction: '',
                label: 'Nature of Accident',
                options: ['Head-on', 'Hit fixed object', 'Jackknife', 'Other', 'Rear-end', 'Rear-to-rear', 'Rollover', 'Side-impact', 'Sideswipe', 'Upset'],
            },
            { id: 'f-sac-country', type: 'radio', required: true, options: ['Canada', 'United States'], instruction: '', label: 'Country' },
            { id: 'f-sac-state',   type: 'text',  required: true, options: [], instruction: 'e.g. Ontario', label: 'State / Province' },
            { id: 'f-sac-city',    type: 'text',  required: true, options: [], instruction: '', label: 'Location City' },
            { id: 'f-sac-fatalities', type: 'number', required: false, options: [], instruction: '', label: '# of Fatalities' },
            { id: 'f-sac-injuries',   type: 'number', required: false, options: [], instruction: '', label: '# of Injuries' },
            { id: 'f-sac-cargo',      type: 'toggle', required: false, options: [], instruction: '', label: 'Cargo Damage / Spill?' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-sub-violation',
        kind: 'custom',
        name: 'Add Violation',
        displayTitle: 'Traffic Violation Record',
        description: 'Single traffic-violation record — used inside the Traffic Violation Details "+ Add Violation" popup.',
        introText: 'Please provide details of the traffic violation, including the charge or offense, issuing authority, date, location, penalties, and any demerit points deducted.',
        isSubform: true,
        buttonName: 'Add Violation',
        fields: [
            { id: 'f-sv-charge', type: 'text', required: true, options: [], instruction: '', label: 'Charge or Offense' },
            { id: 'f-sv-agency', type: 'text', required: true, options: [], instruction: '', label: 'Issuing Agency / Police Department' },
            { id: 'f-sv-date',   type: 'date', required: true, options: [], instruction: '', label: 'Violation Date' },
            { id: 'f-sv-country', type: 'radio', required: true, options: ['Canada', 'United States'], instruction: '', label: 'Country' },
            { id: 'f-sv-state',  type: 'text', required: true, options: [], instruction: 'e.g. Ontario', label: 'State / Province' },
            { id: 'f-sv-city',   type: 'text', required: true, options: [], instruction: '', label: 'City' },
            {
                id: 'f-sv-penalty', type: 'select', required: true, instruction: '',
                label: 'Penalty',
                options: ['Fine', 'Demerit Points', 'Licence Suspension', 'Licence Revocation', 'Jail Time', 'Community Service', 'Warning', 'Other'],
            },
            { id: 'f-sv-amount',      type: 'text',     required: false, options: [], instruction: '', label: 'Penalty Amount' },
            { id: 'f-sv-description', type: 'textarea', required: false, options: [], instruction: '', label: 'Description' },
            { id: 'f-sv-points',      type: 'toggle',   required: false, options: [], instruction: '', label: 'Did your points get deducted?' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-sub-driving-experience',
        kind: 'custom',
        name: 'Add Driving Experience',
        displayTitle: 'Driving Experience Record',
        description: 'Single driving-experience record — used inside the Driving Experience "+ Add Experience" popup.',
        introText: 'Please provide details of your driving experience, including equipment class, freight types, regions driven, dates, mileage, and owner-operator status.',
        isSubform: true,
        buttonName: 'Add Experience',
        fields: [
            {
                id: 'f-sde-equipment', type: 'radio', required: true, instruction: '',
                label: 'Equipment Class',
                options: ['Bus', 'Doubles/Triples', 'Other', 'Straight truck', 'Tanker', 'Tractor-trailer'],
            },
            {
                id: 'f-sde-freight', type: 'checklist', required: false, instruction: '',
                label: 'Freight Types',
                options: ['Auto', 'Bulk', 'Flat', 'Hazmat', 'Other', 'Reefer', 'Tank', 'Van'],
            },
            {
                id: 'f-sde-regions', type: 'checklist', required: false, instruction: '',
                label: 'Driving Regions',
                options: ['Border', 'Canada', 'Canada-only', 'USA', 'USA-only', 'local'],
            },
            { id: 'f-sde-from',  type: 'date',   required: true, options: [], instruction: '', label: 'From Date' },
            { id: 'f-sde-to',    type: 'date',   required: true, options: [], instruction: '', label: 'To Date' },
            { id: 'f-sde-miles', type: 'number', required: true, options: [], instruction: '', label: 'Approximate Miles' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    }, {
        id: 'form-sub-education',
        kind: 'custom',
        name: 'Add Education',
        displayTitle: 'Education Details',
        description: 'Single education record — used inside the Education Details "+ Add Education" popup.',
        introText: 'Please provide details of your educational background, including highest level completed, institution name, course of study, years completed, and graduation status.',
        isSubform: true,
        buttonName: 'Add Education',
        fields: [
            {
                id: 'f-sed-level', type: 'radio', required: true, instruction: '',
                label: 'Highest Education',
                options: ['Bachelor', 'College diploma', 'Doctorate', 'High-school diploma', 'High-school or less', 'Master', 'Other'],
            },
            { id: 'f-sed-school',   type: 'text',   required: true,  options: [], instruction: '', label: 'School' },
            { id: 'f-sed-location', type: 'text',   required: false, options: [], instruction: '', label: 'Location (City, State, Country)' },
            { id: 'f-sed-course',   type: 'text',   required: false, options: [], instruction: '', label: 'Course of Study' },
            { id: 'f-sed-year',     type: 'number', required: true,  options: [], instruction: '', label: 'Year Completed' },
            { id: 'f-sed-no-grad',  type: 'text',   required: false, options: [], instruction: '', label: 'Reason for Not Graduating' },
        ],
        documents: [],
        isDefault: true,
        updatedAt: today(),
    },
    // Back-office compliance pipeline forms (PSP / MVR / Background / Substance / Clearinghouse / Employment / Decision).
    ...complianceReviewForms(),
    ];
}

/** Fill in any fields missing from older localStorage data. */
function normalize(f: Partial<ApplicationFormDef> & { id: string; name: string }): ApplicationFormDef {
    const rawFields = Array.isArray(f.fields) ? f.fields : [];
    let fields = rawFields.map((field) => {
        let next = field;
        const forcedType = KNOWN_FIELD_TYPES[field.id];
        if (forcedType && field.type !== forcedType) next = { ...next, type: forcedType };
        const backfill = KNOWN_SHOW_WHEN[field.id];
        if (backfill && !next.showWhen) next = { ...next, showWhen: backfill };
        const subBackfill = KNOWN_LIST_SUBFORMS[field.id];
        if (subBackfill && !next.subformId) next = { ...next, subformId: subBackfill };
        const widthBackfill = KNOWN_WIDTHS[field.id];
        if (widthBackfill && !next.width) next = { ...next, width: widthBackfill };
        // Country/State pickers: seed the canonical dropdown options when none are set.
        const optBackfill = KNOWN_OPTIONS[field.id];
        if (optBackfill && (!Array.isArray(next.options) || next.options.length === 0)) next = { ...next, options: optBackfill };
        // Canonical data key — lets the same fact (license number, DOB…) capture once and reuse.
        const keyBackfill = KNOWN_DATA_KEYS[field.id];
        if (keyBackfill && !next.dataKey) next = { ...next, dataKey: keyBackfill };
        return next;
    });

    /* Migration: every entry in `documents[]` becomes an inline `document` field. The
     *  documents[] array is the legacy "Required documents" section — we removed that UI;
     *  all document uploads are now regular fields. Placement metadata is honoured: an
     *  `after:{fieldId}` placement inserts the field at that point, everything else appends
     *  at the end. */
    const rawDocs = Array.isArray(f.documents) ? f.documents : [];
    if (rawDocs.length > 0) {
        for (const d of rawDocs) {
            // Skip if the form already has an inline field with this id (avoids duplication on re-load)
            if (fields.some(x => x.id === d.id)) continue;
            const newField = {
                id: d.id,
                label: d.label,
                type: 'document' as FormFieldType,
                required: !!d.required,
                instruction: '',
                options: [],
                documentTypeId: d.documentTypeId,
                showWhen: d.showWhen,
            };
            if (d.placement && d.placement.startsWith('after:')) {
                const targetId = d.placement.slice('after:'.length);
                const idx = fields.findIndex(x => x.id === targetId);
                if (idx >= 0) fields = [...fields.slice(0, idx + 1), newField, ...fields.slice(idx + 1)];
                else fields = [...fields, newField];
            } else {
                fields = [...fields, newField];
            }
        }
    }
    const isDefault = KNOWN_DEFAULT_FORM_IDS.has(f.id) || !!f.isDefault;
    const isSubform = KNOWN_SUBFORM_IDS.has(f.id) || !!f.isSubform;
    return {
        id: f.id,
        kind: f.kind ?? (f.isDefault ? 'standard' : 'custom'),
        name: f.name,
        displayTitle: f.displayTitle ?? f.name ?? 'Driver Application',
        description: f.description ?? '',
        introText: f.introText ?? '',
        fields,
        documents: Array.isArray(f.documents) ? f.documents : [],
        isDefault,
        isSubform,
        updatedAt: f.updatedAt ?? today(),
    };
}

export function loadApplicationForms(): ApplicationFormDef[] {
    try {
        const raw = localStorage.getItem(FORMS_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
            const stored = parsed.map(normalize);
            const seed = seedForms().map(normalize);
            const seedIds = new Set(seed.map(f => f.id));
            // Built-in forms ALWAYS reflect the latest seed design (so structural fixes —
            // dedup, combined components, retired forms — take effect). The user's own
            // custom forms are preserved; retired built-ins are pruned.
            const custom = stored.filter(f => !seedIds.has(f.id) && !REMOVED_FORM_IDS.has(f.id));
            return [...seed, ...custom];
        }
    } catch {
        /* localStorage unavailable / corrupt — fall through to seed */
    }
    // Normalize the seed too, so width / showWhen / subform backfills apply identically
    // whether the forms come from storage or the built-in seed.
    return seedForms().map(normalize);
}

export function saveApplicationForms(forms: ApplicationFormDef[]): void {
    try {
        localStorage.setItem(FORMS_KEY, JSON.stringify(forms));
    } catch {
        /* localStorage unavailable — ignore */
    }
}

export function newFormField(): FormField {
    return { id: uid(), label: 'New field', type: 'text', required: false, instruction: '', options: [] };
}

export function newFormDocument(): FormDocument {
    return { id: uid(), label: 'New document', category: 'Other', required: true };
}

export function newApplicationForm(): ApplicationFormDef {
    return {
        id: uid(),
        kind: 'custom',
        name: 'New Application Form',
        displayTitle: 'Application Form',
        description: '',
        introText: '',
        fields: [],
        documents: [],
        isDefault: false,
        updatedAt: today(),
    };
}

/** Look up a single form by id (returns the default form if not found). */
export function getApplicationForm(id: string | undefined | null): ApplicationFormDef {
    const forms = loadApplicationForms();
    return forms.find(f => f.id === id) ?? forms.find(f => f.isDefault) ?? forms[0];
}

// ── Standard Driver Application — field blueprint ─────────────────────────
// The standard 13-step form's fields, described as data so the builder and
// the print view can render them. Mirrors the DriverApplicationWizard.

export interface StandardField {
    label: string;
    type: FormFieldType;
    required: boolean;
    options?: string[];
    instruction?: string;
}

export interface StandardStep {
    id: number;
    title: string;
    fields: StandardField[];
    /** Extra note for record-list steps. */
    note?: string;
}

const sf = (label: string, type: FormFieldType, required = false): StandardField =>
    ({ label, type, required });

export const STANDARD_FORM_STEPS: StandardStep[] = [
    {
        id: 1, title: 'Applicant Information', fields: [
            sf('First Name', 'text', true),
            sf('Last Name', 'text', true),
            sf('Email', 'text', true),
            sf('Phone Number', 'text', true),
            sf('Date of Birth', 'date', true),
            sf('Social Security Number', 'text', true),
            sf('Do you have legal right to work in the United States?', 'toggle'),
            sf('Position Type', 'select'),
        ],
    },
    {
        id: 2, title: 'Address Details', note: 'Applicants add one or more addresses (3-year history).',
        fields: [
            sf('Street Address', 'text', true),
            sf('City', 'text', true),
            sf('Country', 'select', true),
            sf('State / Province', 'select', true),
            sf('Postal / Zip Code', 'text', true),
            sf('From Date', 'date', true),
            sf('To Date', 'date'),
        ],
    },
    {
        id: 3, title: 'License Details', note: 'Applicants add one or more licenses.',
        fields: [
            sf('License Number', 'text', true),
            sf('License Class', 'select', true),
            sf('Country', 'select', true),
            sf('State / Province', 'select', true),
            sf('Issue Date', 'date', true),
            sf('Expiry Date', 'date', true),
            sf('Endorsements', 'checklist'),
            sf('Restrictions', 'text'),
        ],
    },
    {
        id: 4, title: 'License Disqualification Details',
        note: 'Plus one or more disqualification records (offence type, date, duration, explanation).',
        fields: [
            sf('Have you ever been denied a license, permit, or privilege?', 'toggle'),
            sf('Denial details', 'text'),
        ],
    },
    {
        id: 5, title: 'Accident Details',
        note: 'Plus one or more accident records (date, nature, location, fatalities, injuries, cargo damage).',
        fields: [sf('Have you been involved in any accidents?', 'toggle')],
    },
    {
        id: 6, title: 'Violation Details',
        note: 'Plus one or more traffic violation records (charge, agency, date, location, penalty).',
        fields: [sf('Have you had any traffic violations or convictions?', 'toggle')],
    },
    {
        id: 7, title: 'Medical Details', fields: [
            sf("Do you hold a valid Medical Examiner's Certificate?", 'toggle'),
            sf('Medical Certificate Number', 'text'),
            sf('Medical Examiner Name', 'text'),
            sf('National Registry Number', 'text'),
            sf('Issue Date', 'date'),
            sf('Expiry Date', 'date'),
            sf('Medical Conditions or Limitations', 'textarea'),
        ],
    },
    {
        id: 8, title: 'Driving Experience', note: 'Applicants add one or more experience records.',
        fields: [
            sf('Equipment Class', 'radio', true),
            sf('Freight Types', 'checklist'),
            sf('Driving Regions', 'checklist'),
            sf('From Date', 'date', true),
            sf('To Date', 'date', true),
            sf('Approximate Miles', 'number', true),
        ],
    },
    {
        id: 9, title: 'Employment Details', note: 'Applicants add a 10-year employment history.',
        fields: [
            sf('Employer Name', 'text', true),
            sf('Employer Phone', 'text'),
            sf('Street Address', 'text'),
            sf('City', 'text'),
            sf('Country', 'select'),
            sf('State / Province', 'select'),
            sf('Position Held', 'text', true),
            sf('From Date', 'date', true),
            sf('To Date', 'date'),
            sf('Reason for Leaving', 'text'),
            sf('Subject to FMCSRs while employed?', 'toggle'),
            sf('DOT safety-sensitive function?', 'toggle'),
        ],
    },
    {
        id: 10, title: 'Education Details', note: 'Applicants add one or more education records.',
        fields: [
            sf('School Name', 'text', true),
            sf('City', 'text'),
            sf('State / Province', 'select'),
            sf('Level of Education', 'select', true),
            sf('Field of Study', 'text'),
            sf('Graduated?', 'toggle'),
            sf('Completion Year', 'text'),
        ],
    },
    {
        id: 11, title: 'Cross Border Details', fields: [
            sf('Do you drive across the Canada / US border?', 'toggle'),
            sf('FAST Card Number', 'text'),
            sf('FAST Card Expiry', 'date'),
            sf('Passport Number', 'text'),
            sf('Passport Issuing Country', 'text'),
            sf('Passport Expiry', 'date'),
            sf('Do you have a TWIC card?', 'toggle'),
            sf('TWIC Card Number', 'text'),
            sf('TWIC Card Expiry', 'date'),
        ],
    },
    {
        id: 12, title: 'Additional Details & Documents', fields: [
            sf('Emergency Contact Name', 'text'),
            sf('Emergency Contact Phone', 'text'),
            sf('Relationship', 'text'),
            sf('How did you hear about us?', 'text'),
            sf('Additional Notes', 'textarea'),
            sf('Supporting Documents', 'document'),
        ],
    },
    {
        id: 13, title: 'Acknowledgment', fields: [
            sf('I certify the information is true and complete', 'toggle', true),
            sf('Applicant Signature', 'text', true),
            sf('Print Name', 'text', true),
            sf('Date', 'date', true),
        ],
    },
];

/** A form's content in a uniform shape for rendering / printing. */
export function printableStepsFor(form: ApplicationFormDef): StandardStep[] {
    if (form.kind === 'standard') return STANDARD_FORM_STEPS;
    return [{
        id: 1,
        title: form.displayTitle || form.name,
        fields: form.fields.map(ff => ({
            label: ff.label, type: ff.type, required: ff.required,
            options: ff.options, instruction: ff.instruction,
        })),
    }];
}
