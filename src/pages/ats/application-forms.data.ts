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
    /** For type === 'number': auto-populate (read-only) from other fields.
     *  - 'checklist-score': score = round(checkedItems / totalItems × max) across `sources` checklists.
     *  - 'sum': numeric sum of the `sources` number fields. */
    computed?: {
        kind: 'checklist-score' | 'sum';
        sources: string[];
        /** checklist-score scaling, e.g. 5 → score out of 5. Defaults to 5. */
        max?: number;
        /** For the total ('sum') field: the pass threshold (e.g. 12 of 15). */
        passMark?: number;
    };
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
 * Resolve a `computed` field's auto-populated value from the current form values.
 * Returns the value as a string (ready to render in a number input), or undefined
 * if the field isn't computed. Shared by the runtime form, preview, and print so
 * every render site shows the same auto-calculated score.
 */
export function computeFieldValue(
    field: FormField,
    values: Record<string, unknown>,
    fieldById: Map<string, FormField>,
): string | undefined {
    const c = field.computed;
    if (!c) return undefined;
    if (c.kind === 'checklist-score') {
        let total = 0;
        let checked = 0;
        for (const sid of c.sources) {
            const src = fieldById.get(sid);
            if (!src) continue;
            total += src.options.length;
            const v = values[sid];
            if (Array.isArray(v)) checked += v.filter((x) => typeof x === 'string').length;
        }
        const max = c.max ?? 5;
        return String(total > 0 ? Math.round((checked / total) * max) : 0);
    }
    if (c.kind === 'sum') {
        let sum = 0;
        for (const sid of c.sources) {
            const n = Number(values[sid]);
            if (!Number.isNaN(n)) sum += n;
        }
        return String(sum);
    }
    return undefined;
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
    /** Line of work this form belongs to (Docu/Form Generator "Form type"). Defaults to
     *  'hiring-driver' when absent (every built-in applicant form). */
    formType?: string;
    updatedAt: string;
}

const FORMS_KEY = 'ats:application-forms-v28';

/** Built-in forms that were retired — pruned from saved data on load. */
const REMOVED_FORM_IDS = new Set([
    'form-hiring-decision',
    // Hiring ATS restructure: dropped the application-review step + split combined forms.
    'form-ats-driver-application', 'form-ats-hos-dvir-quiz',
    // Hiring ATS consolidation — merged overlapping forms into combined ones:
    //  • Driver Record Review        ← abstract + cdr + violations-review
    //  • Previous Employer & Safety   ← employment-verification + emp-verify-driver + safety-performance
    //  • HOS / ELD / DVIR Knowledge   ← orientation-quiz + hos-quiz + dvir
    //  • Daily Log & HOS Declaration  ← driver-daily-log + hos-statement
    //  • Training & Policy Acks       ← training-ack + training-modules + policy-docs + acknowledgements + gps-policy
    'form-ats-cdr', 'form-ats-violations-review',
    'form-ats-emp-verify-driver', 'form-ats-safety-performance',
    'form-ats-hos-quiz', 'form-ats-dvir',
    'form-ats-hos-statement',
    'form-ats-training-modules', 'form-ats-policy-docs', 'form-ats-acknowledgements', 'form-ats-gps-policy',
]);

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
            { id: 'f-twic-compliance', label: 'TWIC Card Number', type: 'compliance', required: false, instruction: 'Transportation Worker Identification Credential number with issue & expiry.', options: [], complianceKeyNumberId: 'kn-twic', dataKey: 'identity.twic' },
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
            { id: 'f-med-examiner-reg', type: 'compliance', required: true, options: [], instruction: 'National Registry number of the certified medical examiner who issued the card.', label: 'Medical Examiner Registry Number', complianceKeyNumberId: 'kn-med-examiner', dataKey: 'medical.examinerRegistry' },
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
            { id: 'f-cb-fast-compliance', type: 'compliance', required: false, options: [], instruction: 'FAST / trusted-traveler number with its issue & expiry — used for cross-border clearance.', label: 'FAST / Trusted Traveler Number', complianceKeyNumberId: 'kn-fast-card', dataKey: 'crossborder.fastNumber' },
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
    // Hiring ATS (post-application) pipeline forms — Abstract, CDR, Employment Verification,
    // Drug & Alcohol, Road Test, HOS/DVIR Quiz, Training Modules, Contracts.
    ...hiringAtsForms(),
    ];
}

/** Post-application "Hiring ATS" forms — the recruiter-facing screening / onboarding steps. */
function hiringAtsForms(): ApplicationFormDef[] {
    const mk = (id: string, name: string, displayTitle: string, description: string, fields: FormField[]): ApplicationFormDef => ({
        id, kind: 'custom', name, displayTitle, description, introText: '',
        fields, documents: [], isDefault: true, formType: 'hiring-ats', updatedAt: today(),
    });
    return [
        mk('form-ats-abstract', 'Driver Record Review', 'Driver Record Review (Abstract / CVOR / MVR)', "Consolidated driving-record review — driver abstract / CVOR / MVR details, operator-record summary, and the §391.25 annual review of the driving record.", [
            // ════════ 1 · Abstract Request ════════
            // Covers both Ontario abstract formats: the CVOR (Commercial Vehicle
            // Operator Record) and the 3-Year Driver Record Search. Both are uploaded
            // as PDFs — a primary upload plus an optional second so a driver file can
            // hold both abstracts at once.
            { id: 'f-ats-abstract-req-head', type: 'heading', required: false, options: [], label: 'Abstract Request', instruction: 'Pull the driver abstract (CVOR and/or 3-Year Driver Record), attach the PDF(s), and record the request details from the document header.' },
            { id: 'f-ats-abstract-type', type: 'radio', required: false, options: ['CVOR — Commercial Vehicle Operator Record', '3-Year Driver Record Search', 'Other'], instruction: '', label: 'Abstract Type' },
            { id: 'f-ats-abstract-doc', type: 'document', required: true, options: [], instruction: 'Upload the driver abstract PDF (CVOR or 3-Year Driver Record).', label: 'Driver Abstract (PDF)', documentTypeId: 'dt-abstract' },
            { id: 'f-ats-abstract-doc2', type: 'document', required: false, options: [], instruction: 'Optional — attach a second abstract PDF (e.g. both the CVOR and the 3-Year Driver Record).', label: 'Additional Abstract (PDF)', documentTypeId: 'dt-abstract' },
            { id: 'f-ats-abstract-order', type: 'text', required: false, options: [], instruction: '', label: 'Order / Ministry Number', width: 'half' },
            { id: 'f-ats-abstract-search-dt', type: 'text', required: false, options: [], instruction: 'Date & time the abstract was pulled.', label: 'Search Date & Time', width: 'half' },
            { id: 'f-ats-abstract-issued', type: 'date', required: false, options: [], instruction: '', label: 'Date Issued', width: 'half' },
            { id: 'f-ats-abstract-received', type: 'date', required: false, options: [], instruction: '', label: 'Date Received', width: 'half' },

            // ════════ 2 · Driver Details ════════
            { id: 'f-ats-abstract-details-head', type: 'heading', required: false, options: [], label: 'Driver Details', instruction: 'Enter the driver details exactly as shown on the abstract.' },
            { id: 'f-ats-abstract-client', type: 'text', required: false, options: [], instruction: '', label: 'Client Name (Last, First)', dataKey: 'driver.fullName' },
            { id: 'f-ats-abstract-dob', type: 'date', required: false, options: [], instruction: '', label: 'Date of Birth', width: 'half', dataKey: 'driver.dob' },
            { id: 'f-ats-abstract-sex', type: 'radio', required: false, options: ['Male', 'Female', 'X'], instruction: '', label: 'Sex' },
            { id: 'f-ats-abstract-licence', type: 'text', required: false, options: [], instruction: '', label: 'Reference / Driver Licence Number', width: 'half', dataKey: 'license.number' },
            { id: 'f-ats-abstract-class', type: 'text', required: false, options: [], instruction: '', label: 'Class', width: 'half' },
            { id: 'f-ats-abstract-condition', type: 'text', required: false, options: [], instruction: '', label: 'Condition / Restriction', width: 'half' },
            { id: 'f-ats-abstract-height', type: 'text', required: false, options: [], instruction: '', label: 'Height (cm)', width: 'half' },
            { id: 'f-ats-abstract-earliest', type: 'date', required: false, options: [], instruction: 'Earliest licence date available.', label: 'Earliest Licence Date', width: 'half', dataKey: 'license.issue' },
            { id: 'f-ats-abstract-expiry', type: 'date', required: false, options: [], instruction: '', label: 'Licence Expiry Date', width: 'half', dataKey: 'license.expiry' },
            { id: 'f-ats-abstract-lic-status', type: 'radio', required: false, options: ['Licenced', 'Suspended', 'Expired', 'Cancelled', 'Unlicensed'], instruction: '', label: 'Licence Status' },
            { id: 'f-ats-abstract-medical', type: 'date', required: false, options: [], instruction: '', label: 'Medical Due Date', width: 'half' },
            { id: 'f-ats-abstract-num', type: 'compliance', required: false, options: [], instruction: '', label: 'CVOR / Abstract Number', complianceKeyNumberId: 'kn-abstract' },

            // ════════ 3 · Operator Record Summary ════════
            { id: 'f-ats-abstract-summary-head', type: 'heading', required: false, options: [], label: 'Operator Record Summary', instruction: 'Summarize the record for the abstract period (3 years for the driver record, up to 60 months for the CVOR).' },
            { id: 'f-ats-abstract-period', type: 'text', required: false, options: [], instruction: 'e.g. 2019-11-29 to 2024-11-27 (60 months)', label: 'Record period' },
            { id: 'f-ats-abstract-demerit', type: 'number', required: false, options: [], instruction: '', label: 'Current Demerit Points Total', width: 'half' },
            { id: 'f-ats-abstract-merit', type: 'number', required: false, options: [], instruction: '', label: 'Merit Points', width: 'half' },
            { id: 'f-ats-abstract-nonmoving', type: 'number', required: false, options: [], instruction: '', label: 'Number of Non-Moving Violations', width: 'half' },
            { id: 'f-ats-abstract-moving', type: 'number', required: false, options: [], instruction: '', label: 'Number of Moving Violations / Convictions', width: 'half' },
            { id: 'f-ats-abstract-collisions', type: 'number', required: false, options: [], instruction: '', label: 'Collisions', width: 'half' },
            { id: 'f-ats-abstract-tow', type: 'number', required: false, options: [], instruction: '', label: 'Tow Driver Interventions', width: 'half' },
            { id: 'f-ats-abstract-clean', type: 'toggle', required: false, options: [], instruction: '', label: 'Abstract with no violations — clean record for the period?' },
            { id: 'f-ats-abstract-violation-details', type: 'textarea', required: false, options: [], instruction: 'List each conviction / collision / action with its date and description.', label: 'Violation description', showWhen: { fieldId: 'f-ats-abstract-clean', equals: false } },

            // ════════ 4 · Annual Review of Driving Record (§391.25) ════════
            { id: 'f-ats-abstract-ar-head', type: 'heading', required: false, options: [], label: 'Annual Review of Driving Record (§391.25)', instruction: 'Each motor carrier shall, at least once every 12 months, review the driver’s motor vehicle record to determine whether the driver meets minimum requirements for safe driving or is disqualified pursuant to §391.15.' },
            { id: 'f-ats-abstract-ar-date', type: 'date', required: false, options: [], instruction: '', label: 'Date of Review', width: 'half' },
            { id: 'f-ats-abstract-ar-next', type: 'date', required: false, options: [], instruction: '', label: 'Next Review Date', width: 'half' },
            { id: 'f-ats-abstract-ar-finding', type: 'radio', required: false, options: ['Meets minimum requirements for safe driving', 'Is disqualified to drive a motor vehicle (§391.15)'], instruction: 'I have reviewed the driving record in accordance with §391.25 and find that he/she:', label: 'Annual review finding' },
            { id: 'f-ats-abstract-ar-actions', type: 'textarea', required: false, options: [], instruction: '', label: 'Actions / violations noted in the review period' },
            { id: 'f-ats-abstract-ar-reviewer', type: 'text', required: false, options: [], instruction: '', label: 'Reviewed by', width: 'half' },
            { id: 'f-ats-abstract-ar-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Reviewer signature' },

            // ════════ 5 · Review ════════
            { id: 'f-ats-abstract-review-head', type: 'heading', required: false, options: [], label: 'Review', instruction: 'Record the screening outcome.' },
            { id: 'f-ats-abstract-status', type: 'radio', required: false, options: ['Missing', 'In Review', 'Accepted', 'Flagged'], instruction: '', label: 'Status' },
            { id: 'f-ats-abstract-reviewed-by', type: 'text', required: false, options: [], instruction: '', label: 'Reviewed by', width: 'half' },
            { id: 'f-ats-abstract-reviewed-date', type: 'date', required: false, options: [], instruction: '', label: 'Reviewed date', width: 'half' },
            { id: 'f-ats-abstract-notes', type: 'textarea', required: false, options: [], instruction: '', label: 'Reviewer notes' },
        ]),
        mk('form-ats-employment-verification', 'Previous Employer & Safety History', 'Previous Employer & Safety History', 'Consolidated previous-employer reference — employment verification (§391.23), DOT drug/alcohol history (§40.25), employer rating / rehire, and the detailed safety & performance evaluation.', [
            // ════════ 1 · Request for Safety Performance History (applicant) ════════
            { id: 'f-ats-emp-req-head', type: 'heading', required: false, options: [], label: 'Request for Safety Performance History', instruction: 'Completed by the applicant authorizing the previous employer to release their safety-performance and DOT testing history.' },
            { id: 'f-ats-emp-print-name', type: 'text', required: true, options: [], instruction: '', label: 'I, (Print Name)' },
            { id: 'f-ats-emp-ssn', type: 'text', required: false, options: [], instruction: '', label: 'Social Security Number', width: 'half' },
            { id: 'f-ats-emp-dob', type: 'date', required: false, options: [], instruction: '', label: 'Date of Birth', width: 'half' },
            { id: 'f-ats-emp-prev-employer', type: 'text', required: true, options: [], instruction: '', label: 'Previous Employer' },
            { id: 'f-ats-emp-email', type: 'text', required: false, options: [], instruction: '', label: 'Email', width: 'half' },
            { id: 'f-ats-emp-telephone', type: 'text', required: false, options: [], instruction: '', label: 'Telephone', width: 'half' },
            { id: 'f-ats-emp-address', type: 'text', required: false, options: [], instruction: '', label: 'Address' },
            { id: 'f-ats-emp-prospective', type: 'text', required: false, options: [], instruction: '', label: 'To: Prospective Employer' },
            { id: 'f-ats-emp-attention', type: 'text', required: false, options: [], instruction: '', label: 'Attention', width: 'half' },
            { id: 'f-ats-emp-prospective-tel', type: 'text', required: false, options: [], instruction: '', label: 'Telephone', width: 'half' },
            { id: 'f-ats-emp-prospective-address', type: 'text', required: false, options: [], instruction: '', label: 'Address' },
            { id: 'f-ats-emp-confidentiality-note', type: 'paragraph', required: false, options: [], label: '', instruction: 'In compliance with §40.25(g) and §391.23(h), release of this information must be made in a written form that ensures confidentiality, such as fax, email, or letter.' },
            { id: 'f-ats-emp-prospective-email', type: 'text', required: false, options: [], instruction: '', label: "Prospective employer's email address" },
            { id: 'f-ats-emp-applicant-sign', type: 'signature', required: false, options: [], instruction: '', label: "Applicant's Signature" },
            { id: 'f-ats-emp-applicant-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },

            // ════════ 2 · Employment Verification (§391.23) — previous employer ════════
            // The lead toggle "was employed by us" gates the entire employment block;
            // inside it, "did drive" reveals the vehicle type and "accident history"
            // reveals the accident register — the natural FMCSA conditional flow.
            { id: 'f-ats-emp-verify-head', type: 'heading', required: false, options: [], label: 'Employment Verification (§391.23)', instruction: 'To be completed and signed by the previous employer. Answer "Yes" if the applicant was employed by you, then complete the details below.' },
            { id: 'f-ats-emp-was-employed', type: 'toggle', required: false, options: [], instruction: '', label: 'The applicant named above was employed by us.' },
            { id: 'f-ats-emp-employed-as', type: 'text', required: false, options: [], instruction: '', label: 'Employed as', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-emp-from', type: 'date', required: false, options: [], instruction: '', label: 'From', width: 'half', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-emp-to', type: 'date', required: false, options: [], instruction: '', label: 'To', width: 'half', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-did-drive', type: 'toggle', required: false, options: [], instruction: '', label: 'Did he/she drive a motor vehicle for you?', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-vehicle-type', type: 'text', required: false, options: [], instruction: '', label: 'If yes, what type?', showWhen: { fieldId: 'f-ats-emp-did-drive', equals: true } },
            { id: 'f-ats-emp-reason-leaving', type: 'radio', required: false, options: ['Discharged', 'Lay Off', 'Military Duty', 'Resignation'], instruction: '', label: 'Reason for leaving your employ', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-accident-history', type: 'toggle', required: false, options: [], instruction: '', label: 'Is there any accident history to report?', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-accident-note', type: 'paragraph', required: false, options: [], label: '', instruction: 'Complete the following for any accidents included on your accident register (§390.15(b)) that involved the applicant in the 3 years prior to the application date shown above.', showWhen: { fieldId: 'f-ats-emp-accident-history', equals: true } },
            { id: 'f-ats-emp-accidents', type: 'accident-list', required: false, options: [], instruction: '', label: 'Accidents', showWhen: { fieldId: 'f-ats-emp-accident-history', equals: true } },
            { id: 'f-ats-emp-other-accidents', type: 'textarea', required: false, options: [], instruction: '', label: 'Please provide information concerning any other accidents involving the applicant that were reported to government agencies or insurers or retained under internal company policies', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-remarks', type: 'textarea', required: false, options: [], instruction: '', label: 'Any other remarks', showWhen: { fieldId: 'f-ats-emp-was-employed', equals: true } },
            { id: 'f-ats-emp-sign1', type: 'signature', required: false, options: [], instruction: '', label: 'Signature' },
            { id: 'f-ats-emp-title1', type: 'text', required: false, options: [], instruction: '', label: 'Title', width: 'half' },
            { id: 'f-ats-emp-date-signed1', type: 'date', required: false, options: [], instruction: '', label: 'Date Signed', width: 'half' },

            // ════════ 3 · DOT Drug & Alcohol Testing History (§40.25) ════════
            // The lead toggle gates the whole testing block — none of the §40.25
            // questions apply unless the driver was subject to DOT testing. The SAP
            // question further reveals a documentation upload when answered "Yes".
            { id: 'f-ats-emp-dot-head', type: 'heading', required: false, options: [], label: 'DOT Drug & Alcohol Testing History (§40.25)', instruction: 'Required by 49 CFR §40.25. To be completed by the previous DOT-regulated employer. Answer "Yes" below to record the testing history.' },
            { id: 'f-ats-emp-dot-subject', type: 'toggle', required: false, options: [], instruction: '', label: 'Was the driver subject to Department of Transportation testing requirements while employed by this employer?' },
            { id: 'f-ats-emp-dot-note', type: 'paragraph', required: false, options: [], label: '', instruction: 'Driver was subject to Department of Transportation testing requirements during the following period:', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-dot-from', type: 'date', required: false, options: [], instruction: '', label: 'From', width: 'half', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-dot-to', type: 'date', required: false, options: [], instruction: '', label: 'To', width: 'half', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-alcohol-004', type: 'toggle', required: false, options: [], instruction: '', label: 'Has this person had an alcohol test with the result of 0.04 or higher alcohol concentration?', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-positive-test', type: 'toggle', required: false, options: [], instruction: '', label: 'Has this person tested positive, or adulterated or substituted a test specimen for controlled substances?', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-refused', type: 'toggle', required: false, options: [], instruction: '', label: 'Has this person refused to submit to a post-accident, random, reasonable suspicion, or follow-up alcohol or controlled substance test?', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-other-violations', type: 'toggle', required: false, options: [], instruction: '', label: 'Has this person committed other violations of Subpart B of Part 382, or Part 40?', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-sap-completed', type: 'toggle', required: false, options: [], instruction: 'If yes, please send documentation back with this form.', label: 'If this person has violated a DOT drug and alcohol regulation, did this person complete a SAP-prescribed rehabilitation program in your employ, including return-to-duty and follow-up tests?', showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },
            { id: 'f-ats-emp-sap-docs', type: 'document', required: false, options: [], instruction: 'Attach SAP / return-to-duty and follow-up testing documentation.', label: 'SAP / return-to-duty documentation', documentTypeId: 'dt-emp-response', showWhen: { fieldId: 'f-ats-emp-sap-completed', equals: true } },
            { id: 'f-ats-emp-sap-subsequent', type: 'toggle', required: false, options: [], instruction: '', label: "For a driver who successfully completed a SAP's rehabilitation referral and remained in your employ, did this driver subsequently have an alcohol test result of 0.04 or greater, a verified positive drug test, or refuse to be tested?", showWhen: { fieldId: 'f-ats-emp-dot-subject', equals: true } },

            // ════════ 4 · Employer Rating & Rehire ════════
            { id: 'f-ats-emp-rate-head', type: 'heading', required: false, options: [], label: 'Employer Rating & Rehire', instruction: 'Overall assessment from the previous employer.' },
            { id: 'f-ats-emp-quality', type: 'radio', required: false, options: ['Excellent', 'Good', 'Satisfactory', 'Fair', 'Poor'], instruction: '', label: 'Quality of Work' },
            { id: 'f-ats-emp-rehire', type: 'radio', required: false, options: ['Yes', 'No', 'Upon Review'], instruction: '', label: 'Eligible for Rehire' },
            { id: 'f-ats-emp-travel', type: 'checklist', required: false, options: ['Canada', 'US', 'Local', 'Other'], instruction: '', label: 'Areas of Travel' },
            { id: 'f-ats-emp-issues', type: 'checklist', required: false, options: ['Border Crossing', 'Paperwork', 'Attitude', 'Attendance', 'Equipment', 'Dispatch'], instruction: 'Check any area where there were issues.', label: 'Any issues with the following' },
            { id: 'f-ats-emp-acc-prevent', type: 'number', required: false, options: [], instruction: '', label: 'Accidents — Preventable', width: 'half' },
            { id: 'f-ats-emp-acc-nonprevent', type: 'number', required: false, options: [], instruction: '', label: 'Accidents — Non-Preventable', width: 'half' },

            // ════════ 5 · Safety & Performance Evaluation ════════
            { id: 'f-ats-emp-eval-head', type: 'heading', required: false, options: [], label: 'Safety & Performance Evaluation', instruction: 'Rate each item: U = Unsatisfactory · S = Satisfactory · G = Good · E = Excellent.' },
            { id: 'f-ats-emp-driving-exp', type: 'checklist', required: false, options: ['Canada', 'Canada Only', 'Local', 'Local Only', 'Mountain', 'USA Central', 'USA Eastern', 'USA Midwest', 'USA Northern', 'USA Only', 'USA Southern', 'USA Western'], instruction: '', label: 'Driving experience' },
            { id: 'f-ats-emp-equip', type: 'text', required: false, options: [], instruction: '', label: 'Equipment operated most' },
            { id: 'f-ats-emp-ev-equipment-care', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Takes Care of Assigned Equipment', width: 'half' },
            { id: 'f-ats-emp-ev-attitude', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Attitude', width: 'half' },
            { id: 'f-ats-emp-ev-aptitude', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Aptitude', width: 'half' },
            { id: 'f-ats-emp-ev-compliance', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Compliance', width: 'half' },
            { id: 'f-ats-emp-ev-reliability', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Reliability', width: 'half' },
            { id: 'f-ats-emp-ev-dependability', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Dependability', width: 'half' },
            { id: 'f-ats-emp-ev-logbook', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Logbook', width: 'half' },
            { id: 'f-ats-emp-ev-communication', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Communication', width: 'half' },
            { id: 'f-ats-emp-ev-courtesy', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Client Courtesy', width: 'half' },
            { id: 'f-ats-emp-ev-instructions', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Follows Instructions', width: 'half' },
            { id: 'f-ats-emp-ev-equip-handling', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Equipment Handling', width: 'half' },
            { id: 'f-ats-emp-ev-cleanliness', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Equipment Cleanliness', width: 'half' },
            { id: 'f-ats-emp-ev-conflicts', type: 'radio', required: false, options: ['Unsatisfactory', 'Satisfactory', 'Good', 'Excellent'], instruction: '', label: 'Conflicts (Resolution/Handling)', width: 'half' },
            { id: 'f-ats-emp-inc-any', type: 'toggle', required: false, options: [], instruction: '', label: 'Any violations, accidents, incidents or cargo claims?' },
            { id: 'f-ats-emp-incidents', type: 'accident-list', required: false, options: [], instruction: '', label: 'Incidents', showWhen: { fieldId: 'f-ats-emp-inc-any', equals: true } },
            { id: 'f-ats-emp-susp-any', type: 'toggle', required: false, options: [], instruction: '', label: 'Any suspensions?' },
            { id: 'f-ats-emp-susp-details', type: 'textarea', required: false, options: [], instruction: '', label: 'Suspension details', showWhen: { fieldId: 'f-ats-emp-susp-any', equals: true } },

            // ════════ 6 · Verified By (respondent) ════════
            { id: 'f-ats-emp-resp-head', type: 'heading', required: false, options: [], label: 'Verified By', instruction: 'In answering these questions, include any required DOT drug or alcohol testing information obtained from previous employers in the 3 years prior to the application date shown on page 1.' },
            { id: 'f-ats-emp-resp-name', type: 'text', required: false, options: [], instruction: '', label: 'Name', width: 'half' },
            { id: 'f-ats-emp-resp-company', type: 'text', required: false, options: [], instruction: '', label: 'Company', width: 'half' },
            { id: 'f-ats-emp-resp-address', type: 'text', required: false, options: [], instruction: '', label: 'Address' },
            { id: 'f-ats-emp-resp-telephone', type: 'text', required: false, options: [], instruction: '', label: 'Telephone', width: 'half' },
            { id: 'f-ats-emp-sign2', type: 'signature', required: false, options: [], instruction: '', label: 'Signature' },
            { id: 'f-ats-emp-date-signed2', type: 'date', required: false, options: [], instruction: '', label: 'Date Signed', width: 'half' },
            { id: 'f-ats-emp-doc', type: 'document', required: false, options: [], instruction: 'Attach the completed, signed employer response.', label: 'Completed employer response', documentTypeId: 'dt-emp-response' },
        ]),
        mk('form-ats-drug-alcohol', 'Drug Testing', 'Drug Testing Form', 'On-site drug testing form (United States & Canada) — collection, donor consent, screen results, and certification.', [
            // ════════ Step 1 · Employer / Organization / Agency (EOA) Information ════════
            { id: 'f-ats-da-s1-head', type: 'heading', required: false, options: [], label: 'Step 1 · Employer, Organization or Agency (EOA) Information', instruction: 'Please print. Completed by the collector / collection site.' },
            { id: 'f-ats-da-jurisdiction', type: 'radio', required: false, options: ['United States', 'Canada'], instruction: '', label: 'Testing Jurisdiction' },
            { id: 'f-ats-da-eoa-name', type: 'text', required: false, options: [], instruction: '', label: 'A · EOA Name' },
            { id: 'f-ats-da-eoa-phone', type: 'text', required: false, options: [], instruction: '', label: 'B · EOA Phone', width: 'half' },
            { id: 'f-ats-da-eoa-fax', type: 'text', required: false, options: [], instruction: '', label: 'EOA Fax', width: 'half' },
            { id: 'f-ats-da-eoa-contact', type: 'text', required: false, options: [], instruction: '', label: 'C · EOA Contact Person', width: 'half' },
            { id: 'f-ats-da-eoa-contact-phone', type: 'text', required: false, options: [], instruction: '', label: 'Direct Phone Number', width: 'half' },
            { id: 'f-ats-da-site-address', type: 'text', required: false, options: [], instruction: '', label: 'D · Collection Site Address' },
            { id: 'f-ats-da-coll-company', type: 'text', required: false, options: [], instruction: '', label: 'E · Collection Company', width: 'half' },
            { id: 'f-ats-da-collector-name', type: 'text', required: false, options: [], instruction: '', label: 'F · Collector Name', width: 'half' },
            { id: 'f-ats-da-collector-phone', type: 'text', required: false, options: [], instruction: '', label: 'Collector Direct Phone Number', width: 'half' },
            { id: 'f-ats-da-specimen-type', type: 'radio', required: false, options: ['Urine', 'Oral Fluid'], instruction: '', label: 'G · Specimen Type' },
            { id: 'f-ats-da-device-name', type: 'text', required: false, options: [], instruction: '', label: 'H · Device Name', width: 'half' },
            { id: 'f-ats-da-device-model', type: 'text', required: false, options: [], instruction: '', label: 'Device Model Number', width: 'half' },
            { id: 'f-ats-da-device-lot', type: 'text', required: false, options: [], instruction: '', label: 'Device Lot Number', width: 'half' },
            { id: 'f-ats-da-device-expiry', type: 'text', required: false, options: [], instruction: 'MM/YY', label: 'Device Expiry Date', width: 'half' },

            // ════════ Step 2 · Donor Information ════════
            { id: 'f-ats-da-s2-head', type: 'heading', required: false, options: [], label: 'Step 2 · Donor Information', instruction: '' },
            { id: 'f-ats-da-donor-name', type: 'text', required: false, options: [], instruction: '', label: 'A · Donor Name', dataKey: 'driver.fullName' },
            { id: 'f-ats-da-donor-id', type: 'text', required: false, options: [], instruction: '', label: 'Donor ID #', width: 'half' },
            { id: 'f-ats-da-donor-phone', type: 'text', required: false, options: [], instruction: '', label: 'Direct Phone Number', width: 'half' },
            { id: 'f-ats-da-id-type', type: 'radio', required: false, options: ["Driver's License", 'Employee Photo ID', 'Other'], instruction: '', label: 'B · Identification Type' },
            { id: 'f-ats-da-id-other', type: 'text', required: false, options: [], instruction: '', label: 'If other, specify', showWhen: { fieldId: 'f-ats-da-id-type', equals: 'Other' } },
            { id: 'f-ats-da-reason', type: 'radio', required: false, options: ['Pre-employment', 'Reasonable Suspicion', 'Post-accident/incident', 'Return to Duty', 'Follow-up', 'Random'], instruction: '', label: 'C · Reason for Test' },
            { id: 'f-ats-da-donor-consent', type: 'paragraph', required: false, options: [], label: '', instruction: 'I hereby agree to submit to a test for the purpose of screening for drugs. I certify that the specimen is my own and has not been substituted or adulterated in any way, and that the identifying information I provided is true and correct.' },
            { id: 'f-ats-da-donor-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Donor Signature' },
            { id: 'f-ats-da-donor-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },

            // ════════ Step 3 · Screen Results ════════
            { id: 'f-ats-da-s3-head', type: 'heading', required: false, options: [], label: 'Step 3 · Screen Results', instruction: '' },
            { id: 'f-ats-da-date-collected', type: 'date', required: false, options: [], instruction: '', label: 'A · Date Collected', width: 'half' },
            { id: 'f-ats-da-time-collected', type: 'text', required: false, options: [], instruction: 'e.g. 09:30 am', label: 'Time Collected', width: 'half' },
            { id: 'f-ats-da-time-interpreted', type: 'text', required: false, options: [], instruction: 'e.g. 09:35 am', label: 'Time Interpreted', width: 'half' },
            { id: 'f-ats-da-temperature', type: 'radio', required: false, options: ['Normal 32–38°C (90–100°F)', 'Abnormal'], instruction: 'Temperature must be read within four (4) minutes of collection.', label: 'B · Temperature' },
            { id: 'f-ats-da-temp-reading', type: 'text', required: false, options: [], instruction: '', label: 'Abnormal temperature reading (°C / °F)', showWhen: { fieldId: 'f-ats-da-temperature', equals: 'Abnormal' } },

            // Drugs screened — one result per substance.
            { id: 'f-ats-da-drugs-head', type: 'heading', required: false, options: [], label: 'Drug(s) Screened', instruction: 'Record the screen result for each substance.' },
            { id: 'f-ats-da-drug-amp', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Amphetamines (AMP)', width: 'half' },
            { id: 'f-ats-da-drug-coc', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Cocaine (COC)', width: 'half' },
            { id: 'f-ats-da-drug-mdma', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Ecstasy (MDMA)', width: 'half' },
            { id: 'f-ats-da-drug-met', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Methamphetamines (MET)', width: 'half' },
            { id: 'f-ats-da-drug-opi', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Opiates (OPI)', width: 'half' },
            { id: 'f-ats-da-drug-pcp', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Phencyclidine (PCP)', width: 'half' },
            { id: 'f-ats-da-drug-thc', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Marijuana (THC)', width: 'half' },
            { id: 'f-ats-da-drug-bzo', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Benzodiazepine (BZO)', width: 'half' },
            { id: 'f-ats-da-drug-bar', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Barbiturates (BAR)', width: 'half' },
            { id: 'f-ats-da-drug-mtd', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Methadone (MTD)', width: 'half' },
            { id: 'f-ats-da-drug-ppx', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Propoxyphene (PPX)', width: 'half' },
            { id: 'f-ats-da-drug-bup', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Buprenorphine (BUP)', width: 'half' },
            { id: 'f-ats-da-drug-oxy', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Oxycodone (OXY)', width: 'half' },
            { id: 'f-ats-da-drug-eddp', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'EDDP (EDDP)', width: 'half' },
            { id: 'f-ats-da-drug-fyl', type: 'radio', required: false, options: ['Negative', 'Confirm', 'Invalid'], instruction: '', label: 'Fentanyl (FYL)', width: 'half' },

            // Specimen validity test — adulterants.
            { id: 'f-ats-da-validity-head', type: 'heading', required: false, options: [], label: 'Specimen Validity Test', instruction: 'Adulterant checks.' },
            { id: 'f-ats-da-val-creatinine', type: 'radio', required: false, options: ['Normal', 'Abnormal', 'N/A'], instruction: '', label: 'Creatinine', width: 'half' },
            { id: 'f-ats-da-val-nitrites', type: 'radio', required: false, options: ['Normal', 'Abnormal', 'N/A'], instruction: '', label: 'Nitrites', width: 'half' },
            { id: 'f-ats-da-val-ph', type: 'radio', required: false, options: ['Normal', 'Abnormal', 'N/A'], instruction: '', label: 'pH', width: 'half' },
            { id: 'f-ats-da-val-gravity', type: 'radio', required: false, options: ['Normal', 'Abnormal', 'N/A'], instruction: '', label: 'Specific Gravity', width: 'half' },
            { id: 'f-ats-da-val-oxidants', type: 'radio', required: false, options: ['Normal', 'Abnormal', 'N/A'], instruction: '', label: 'Oxidants', width: 'half' },
            { id: 'f-ats-da-val-glutaraldehyde', type: 'radio', required: false, options: ['Normal', 'Abnormal', 'N/A'], instruction: '', label: 'Glutaraldehyde', width: 'half' },

            // Confirmation testing.
            { id: 'f-ats-da-confirm-head', type: 'heading', required: false, options: [], label: 'Confirmation Testing', instruction: '' },
            { id: 'f-ats-da-confirm-sent', type: 'radio', required: false, options: ['Yes', 'No'], instruction: '', label: 'Specimen sent for confirmation testing' },
            { id: 'f-ats-da-ccf-id', type: 'text', required: false, options: [], instruction: '', label: 'Custody & Control Form Specimen ID', showWhen: { fieldId: 'f-ats-da-confirm-sent', equals: 'Yes' } },
            { id: 'f-ats-da-confirm-doc', type: 'document', required: false, options: [], instruction: 'Attach the lab confirmation (MRO) result when available.', label: 'Confirmation / MRO result', documentTypeId: 'dt-da-result', showWhen: { fieldId: 'f-ats-da-confirm-sent', equals: 'Yes' } },
            { id: 'f-ats-da-remarks', type: 'textarea', required: false, options: [], instruction: '', label: 'Remarks' },

            // ════════ Step 4 · Collector Certification ════════
            { id: 'f-ats-da-s4-head', type: 'heading', required: false, options: [], label: 'Step 4 · Collector Certification', instruction: '' },
            { id: 'f-ats-da-cert-note', type: 'paragraph', required: false, options: [], label: '', instruction: 'I hereby certify that a specimen was collected from the donor specified in Step 2 of this form, and that the results recorded on this form are true and correct.' },
            { id: 'f-ats-da-collector-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Collector Signature' },
            { id: 'f-ats-da-collector-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },

            // Completed form on file.
            { id: 'f-ats-da-doc', type: 'document', required: false, options: [], instruction: 'Attach the completed, signed test form (PDF).', label: 'Completed test form', documentTypeId: 'dt-da-result' },
        ]),
        mk('form-ats-road-test', 'Road Test', 'Road Test Evaluation', 'Road test evaluation, FMCSA §391.31 record, certification, and §391.33 equivalent.', [
            // ── Driver information (top of the form) ──
            { id: 'f-ats-rt-driver', type: 'text', required: true, options: [], instruction: '', label: "Driver's name", width: 'half' },
            { id: 'f-ats-rt-dob', type: 'date', required: false, options: [], instruction: '', label: 'Date of birth', width: 'half' },
            { id: 'f-ats-rt-address', type: 'text', required: false, options: [], instruction: '', label: 'Home address', width: 'half' },
            { id: 'f-ats-rt-license', type: 'text', required: false, options: [], instruction: '', label: 'License No.', width: 'half' },
            { id: 'f-ats-rt-state', type: 'text', required: false, options: [], instruction: '', label: 'State / Province', width: 'half' },
            { id: 'f-ats-rt-class', type: 'text', required: false, options: [], instruction: '', label: 'Licence class', width: 'half' },
            { id: 'f-ats-rt-endorsements', type: 'text', required: false, options: [], instruction: '', label: 'Endorsements', width: 'half' },
            { id: 'f-ats-rt-license-exp', type: 'date', required: false, options: [], instruction: '', label: 'Licence expiry date', width: 'half' },
            { id: 'f-ats-rt-ssn', type: 'text', required: false, options: [], instruction: '', label: 'Social Security No.', width: 'half' },

            // ── Vehicle information ──
            { id: 'f-ats-rt-tractor', type: 'text', required: false, options: [], instruction: '', label: 'Equipment — Truck Tractor (Make & Model)', width: 'half' },
            { id: 'f-ats-rt-vehicle-year', type: 'text', required: false, options: [], instruction: '', label: 'Year', width: 'half' },
            { id: 'f-ats-rt-plate', type: 'text', required: false, options: [], instruction: '', label: 'License plate', width: 'half' },
            { id: 'f-ats-rt-vin', type: 'text', required: false, options: [], instruction: '', label: 'VIN', width: 'half' },
            { id: 'f-ats-rt-config', type: 'text', required: false, options: [], instruction: 'e.g. 3-axle, Semi.', label: 'Configuration', width: 'half' },
            { id: 'f-ats-rt-trailer', type: 'text', required: false, options: [], instruction: '', label: 'Trailer(s) (Body Type & Length)', width: 'half' },
            { id: 'f-ats-rt-transmission', type: 'radio', required: false, options: ['Manual', 'Automatic'], instruction: '', label: 'Transmission type', width: 'half' },
            { id: 'f-ats-rt-brakes', type: 'radio', required: false, options: ['Air', 'Hydraulic'], instruction: '', label: 'Brake system type', width: 'half' },
            { id: 'f-ats-rt-special-equip', type: 'text', required: false, options: [], instruction: 'Specify any special equipment used during the test.', label: 'Use of special equipment (specify)', width: 'half' },

            // ── Test details ──
            { id: 'f-ats-rt-date', type: 'date', required: false, options: [], instruction: '', label: 'Date of test', width: 'half' },
            { id: 'f-ats-rt-length', type: 'text', required: false, options: [], instruction: '', label: 'Duration of test', width: 'half' },
            { id: 'f-ats-rt-weather', type: 'text', required: false, options: [], instruction: '', label: 'Weather conditions', width: 'half' },
            { id: 'f-ats-rt-test-miles', type: 'text', required: false, options: [], instruction: 'Total distance driven on the road-test route.', label: 'Length of the test (route distance)', width: 'half' },

            // ════════ RECORD OF ROAD TEST (FMCSA §391.31) ════════
            { id: 'f-ats-rt-record-head', type: 'heading', required: false, options: [], label: 'Record of Road Test (§391.31)', instruction: 'Check each item the driver performs satisfactorily. Note unsatisfactory items in Remarks; leave blank any item not evaluated.' },

            // ── Part 1 ──
            { id: 'f-ats-rt-p1-head', type: 'heading', required: false, options: [], label: 'Part 1 — Pre-Trip Inspection and Emergency Equipment', instruction: 'Check each item the driver performs satisfactorily.' },
            { id: 'f-ats-rt-p1', type: 'checklist', required: false, label: 'Checklist', instruction: '', options: [
                'Checks general condition approaching unit',
                'Checks fuel, oil, water and for excessive oil on engine',
                'Checks around unit — tires, lights, trailer hook-up, brake and light line, doors; inspects for body damage',
                'Tests steering, brake action, tractor protection valve, and parking brake',
                'Checks horn, windshield wipers, mirrors, emergency equipment; reflectors, flares, fuses, tire chains (if necessary), fire equipment',
                'Checks instruments for normal readings',
                'Checks dashboard warning lights for proper functioning',
                'Cleans windshield, windows, mirrors, lights and reflectors',
                'Reviews and signs previous report',
            ] },

            // ── Part 2 ──
            { id: 'f-ats-rt-p2-head', type: 'heading', required: false, options: [], label: 'Part 2 — Coupling and Uncoupling', instruction: '' },
            { id: 'f-ats-rt-p2', type: 'checklist', required: false, label: 'Checklist', instruction: '', options: [
                'Connects glad hands to trailer to apply trailer brakes before coupling',
                'Connects glad hands and light line properly',
                'Couples without difficulty',
                'Raises landing gear fully after coupling',
                'Visually checks king pin assembly to be certain of proper coupling',
                'Checks coupling by applying hand valve or tractor-protection valve (trailer air supply valve) and gently applying pressure by trying to pull away from trailer',
                'Assures himself that surface will support trailer before uncoupling',
            ] },

            // ── Part 3 ──
            { id: 'f-ats-rt-p3-head', type: 'heading', required: false, options: [], label: 'Part 3 — Placing Vehicle in Motion and Use of Controls', instruction: '' },
            { id: 'f-ats-rt-p3a', type: 'checklist', required: false, label: 'A. Motor', instruction: '', options: [
                'Places transmission in neutral before starting engine',
                'Starts engine without difficulty',
                'Checks instruments at regular intervals',
                'Maintains proper engine rpm while driving',
            ] },
            { id: 'f-ats-rt-p3b', type: 'checklist', required: false, label: 'B. Brakes', instruction: '', options: [
                'Knows proper use of and checks tractor-protection valve (trailer air supply valve)',
                'Tests service brakes',
                'Builds full air pressure before moving',
            ] },
            { id: 'f-ats-rt-p3c', type: 'checklist', required: false, label: 'C. Clutch and Transmission', instruction: '', options: [
                'Starts unit moving smoothly',
                'Uses clutch properly',
            ] },
            { id: 'f-ats-rt-p3d', type: 'checklist', required: false, label: 'D. Lights (if tested at night)', instruction: '', options: [
                'Adjusts speed for range of headlights',
                'Dims lights when approaching another vehicle or following other traffic',
            ] },

            // ── Part 4 ──
            { id: 'f-ats-rt-p4-head', type: 'heading', required: false, options: [], label: 'Part 4 — Backing and Parking', instruction: '' },
            { id: 'f-ats-rt-p4a', type: 'checklist', required: false, label: 'A. Backing', instruction: '', options: [
                'Gets out and checks area before backing',
                'Understands and utilizes mirrors properly',
                'Signals when backing (if appropriate)',
                'Avoids backing from blind side',
            ] },
            { id: 'f-ats-rt-p4b', type: 'checklist', required: false, label: 'B. Parking (City)', instruction: '', options: [
                'Parks without hitting any other vehicles or stationary objects',
                'Parks correct distance from curb',
                'Secures unit properly — sets parking brake, transmission in correct gear, shuts off engine, blocks wheels (when necessary)',
                'Carefully enters traffic from parked position',
            ] },
            { id: 'f-ats-rt-p4c', type: 'checklist', required: false, label: 'C. Parking (Road)', instruction: '', options: [
                'Parks off pavement',
                'Secures unit properly',
                'Uses emergency warning signal or devices when necessary',
            ] },

            // ── Part 5 ──
            { id: 'f-ats-rt-p5-head', type: 'heading', required: false, options: [], label: 'Part 5 — Slowing and Stopping', instruction: '' },
            { id: 'f-ats-rt-p5', type: 'checklist', required: false, label: 'Checklist', instruction: '', options: [
                'Uses clutch and gears properly',
                'Gears down properly before descending hills',
                'Starts without rolling back',
                'Tests brakes before descending grades',
                'Uses brakes properly on grades',
                'Makes proper use of mirrors',
                'Plans stop far enough in advance to avoid hard braking',
                'Stops clear of crosswalks',
            ] },

            // ── Part 6 ──
            { id: 'f-ats-rt-p6-head', type: 'heading', required: false, options: [], label: 'Part 6 — Operating in Traffic, Passing and Turning', instruction: '' },
            { id: 'f-ats-rt-p6a', type: 'checklist', required: false, label: 'A. Turning', instruction: '', options: [
                'Signals intention to turn well in advance',
                'Gets into proper lane well in advance of turn',
                'Checks traffic conditions and turns only when intersection is clear',
                'Restricts traffic from passing on right when preparing to complete right-hand turn',
                'Completes turn promptly and safely and does not impede other traffic',
            ] },
            { id: 'f-ats-rt-p6b', type: 'checklist', required: false, label: 'B. Traffic Signs and Signals', instruction: '', options: [
                'Plans stop in advance and adjusts speed correctly',
                'Obeys all traffic signals',
                'Comes to a complete stop at all stop signs',
            ] },
            { id: 'f-ats-rt-p6c', type: 'checklist', required: false, label: 'C. Intersections', instruction: '', options: [
                'Yields right of way',
                'Checks for cross traffic regardless of traffic controls',
                'Enters all intersections prepared to stop if necessary',
            ] },
            { id: 'f-ats-rt-p6d', type: 'checklist', required: false, label: 'D. Grade Crossings', instruction: '', options: [
                'Stops at a minimum 15 feet but not more than 50 feet before crossing if a stop is necessary',
                'Selects proper gear and does not shift gears while crossing',
                'Knows and understands Federal and State rules governing grade crossings',
            ] },
            { id: 'f-ats-rt-p6e', type: 'checklist', required: false, label: 'E. Passing', instruction: '', options: [
                'Allows sufficient space ahead for passing',
                'Passes only in safe locations',
                'Signals changing lanes before and after passing',
                'Warns driver ahead of his intention to pass',
                'Passes with sufficient speed differential to minimize obstructing traffic',
                'Returns to right lane promptly but only when safe to do so',
            ] },
            { id: 'f-ats-rt-p6f', type: 'checklist', required: false, label: 'F. Speed', instruction: '', options: [
                'Observes speed limits',
                'Drives at speed consistent with ability',
                'Adjusts speed properly to road, weather and traffic conditions',
                'Slows down in advance of curves, danger zones and intersections',
                'Maintains constant speed where possible',
            ] },
            { id: 'f-ats-rt-p6g', type: 'checklist', required: false, label: 'G. Courtesy and Safety', instruction: '', options: [
                'Yields right of way',
                'Consistently strives to drive in safe manner',
                'Allows faster traffic to pass',
                'Uses horn only when necessary',
            ] },

            // ── Part 7 ──
            { id: 'f-ats-rt-p7-head', type: 'heading', required: false, options: [], label: 'Part 7 — Examiner Certification and Verdict', instruction: '' },
            { id: 'f-ats-rt-result', type: 'radio', required: false, options: ['Passed', 'Failed'], instruction: '', label: 'Overall test result' },
            { id: 'f-ats-rt-p7a', type: 'checklist', required: false, label: 'General Driving Ability and Habits', instruction: '', options: [
                'Consistently alert and attentive',
                'Consistently is aware of changing traffic conditions',
                'Anticipates problems',
                'Performs routine functions without taking eyes from road',
                'Checks instruments regularly while driving',
                'Personal appearance is professional',
                'Remains calm under pressure',
            ] },

            // ── Result ──
            { id: 'f-ats-rt-remarks', type: 'textarea', required: false, options: [], instruction: '', label: 'Remarks' },
            { id: 'f-ats-rt-performance', type: 'radio', required: false, options: ['Satisfactory', 'Needs Training', 'Unsatisfactory'], instruction: '', label: 'General performance' },
            { id: 'f-ats-rt-explain', type: 'text', required: false, options: [], instruction: '', label: 'Explain (if needs training or unsatisfactory)' },
            { id: 'f-ats-rt-qualified', type: 'checklist', required: false, label: 'Qualified for', instruction: '', options: ['Straight Truck', 'Tractor-Semitrailer', 'Twin Trailers', 'Other Combination'] },

            // ── Certification of Road Test (§391.33) ──
            { id: 'f-ats-rt-cert-head', type: 'heading', required: false, options: [], label: 'Certification of Road Test', instruction: '' },
            { id: 'f-ats-rt-cert-driver', type: 'text', required: false, options: [], instruction: '', label: "Driver's name", width: 'half' },
            { id: 'f-ats-rt-cert-ssn', type: 'text', required: false, options: [], instruction: '', label: 'Social Security Number', width: 'half' },
            { id: 'f-ats-rt-cert-license', type: 'text', required: false, options: [], instruction: '', label: "Operator's / Chauffeur's License Number", width: 'half' },
            { id: 'f-ats-rt-cert-state', type: 'text', required: false, options: [], instruction: '', label: 'State', width: 'half' },
            { id: 'f-ats-rt-power-unit', type: 'text', required: false, options: [], instruction: '', label: 'Type of power unit', width: 'half' },
            { id: 'f-ats-rt-trailer-type', type: 'text', required: false, options: [], instruction: '', label: 'Type of trailer(s)', width: 'half' },
            { id: 'f-ats-rt-bus-type', type: 'text', required: false, options: [], instruction: 'If passenger carrier.', label: 'Type of bus', width: 'half' },
            { id: 'f-ats-rt-cert-date', type: 'date', required: false, options: [], instruction: '', label: 'Date of road test', width: 'half' },
            { id: 'f-ats-rt-approx-miles', type: 'number', required: false, options: [], instruction: '', label: 'Approx. miles of driving', width: 'half' },
            { id: 'f-ats-rt-cert-statement', type: 'paragraph', required: false, options: [], label: '', instruction: 'This is to certify that the above-named driver was given a road test under my supervision, consisting of approximately the miles of driving stated above. It is my considered opinion that this driver possesses sufficient driving skill to operate safely the type of commercial motor vehicle listed above.' },
            { id: 'f-ats-rt-examiner', type: 'text', required: false, options: [], instruction: '', label: 'Examiner name', width: 'half' },
            { id: 'f-ats-rt-examiner-title', type: 'text', required: false, options: [], instruction: '', label: 'Title', width: 'half' },
            { id: 'f-ats-rt-org', type: 'textarea', required: false, options: [], instruction: '', label: 'Organization and address of examiner' },
            { id: 'f-ats-rt-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Signature of examiner' },
            { id: 'f-ats-rt-cert', type: 'document', required: false, options: [], instruction: 'Upload the signed Record / Certification of Road Test.', label: 'Signed Road Test Record', documentTypeId: 'dt-road-test' },

            // ── Equivalent of Road Test for CDL Drivers (§391.33) ──
            { id: 'f-ats-rt-equiv-head', type: 'heading', required: false, options: [], label: 'Equivalent of Road Test for CDL Drivers (§391.33)', instruction: '' },
            { id: 'f-ats-rt-equiv-a', type: 'paragraph', required: false, options: [], label: '', instruction: '(a) In place of, and as equivalent to, the road test required by §391.31, a person who seeks to drive a motor vehicle may present, and a motor carrier may accept —\n\n  (1) A valid operator’s license which has been issued to him by a State that licenses drivers to operate specific categories of motor vehicles and which, under the laws of that State, licenses him after successful completion of a road test in a motor vehicle of the type the motor carrier intends to assign to him; or\n\n  (2) A copy of a valid certificate of driver’s road test issued to him pursuant to §391.31 within the preceding 3 years.' },
            { id: 'f-ats-rt-equiv-b', type: 'paragraph', required: false, options: [], label: '', instruction: '(b) If a driver presents, and a motor carrier accepts, a license or certificate as equivalent to the road test, the motor carrier shall retain a legible copy of the license or certificate in its files as part of the driver’s qualification file.' },
            { id: 'f-ats-rt-equiv-c', type: 'paragraph', required: false, options: [], label: '', instruction: '(c) A motor carrier may require any person who presents a license or certificate as equivalent to the road test to take a road test or any other test of his driving skill as a condition to his employment as a driver.' },
            // The §391.33 equivalents (license / prior certificate) are collected on the hiring page (asked of the driver),
            // so the examiner's form only conducts the road test and issues the §391.31 certificate.
            { id: 'f-ats-rt-equiv-method', type: 'radio', required: false, options: ['Road test conducted (§391.31)'], instruction: 'How was this requirement satisfied?', label: 'Method' },
            { id: 'f-ats-rt-equiv-doc', type: 'document', required: false, options: [], instruction: 'If accepting an equivalent, retain a legible copy of the license / certificate.', label: 'Equivalent license / certificate copy', documentTypeId: 'dt-road-test' },
        ]),
        // Custom-rendered (TrainingCertificateForm): branded module-completion certificate generator.
        mk('form-ats-training-certificates', 'Module Completion Certificates', 'Module Completion Certificate', 'Generate branded training / module completion certificates — recipient, module name and date — with dynamic company branding; issue more than one and attach uploaded certificates.', [
            { id: 'f-ats-cert-recipient', type: 'text', required: false, options: [], instruction: '', label: 'Recipient name', dataKey: 'driver.fullName' },
            { id: 'f-ats-cert-module', type: 'text', required: false, options: [], instruction: '', label: 'Training / module name' },
            { id: 'f-ats-cert-date', type: 'date', required: false, options: [], instruction: '', label: 'Completion date' },
            { id: 'f-ats-cert-doc', type: 'document', required: false, options: [], instruction: 'Optional — upload the recipient’s certificate.', label: 'Certificate', documentTypeId: 'dt-training-cert' },
        ]),
        mk('form-ats-contracts', 'Contracts', 'Contracts', 'Employment / lease contract.', [
            { id: 'f-ats-contract-type', type: 'select', required: false, options: ['Employment agreement', 'Owner-operator lease', 'Independent contractor'], instruction: '', label: 'Contract type' },
            { id: 'f-ats-contract-doc', type: 'document', required: true, options: [], instruction: 'Upload the signed contract.', label: 'Signed contract', documentTypeId: 'dt-signed-contract' },
            { id: 'f-ats-contract-date', type: 'date', required: false, options: [], instruction: '', label: 'Signed date' },
            { id: 'f-ats-contract-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Driver signature' },
        ]),
        // ════════ Transportation of Dangerous Goods — Certificate of Training ════════
        mk('form-ats-tdg-cert', 'TDG Certificate of Training', 'Transportation of Dangerous Goods — Certificate of Training', 'Transportation of Dangerous Goods (TDG) training certificate and competencies.', [
            { id: 'f-ats-tdg-head', type: 'heading', required: false, options: [], label: 'Transportation of Dangerous Goods — Certificate of Training', instruction: 'This certifies that the employee named below has completed the training described below, in accordance with the requirements of the Transportation of Dangerous Goods Act and Regulations.' },
            { id: 'f-ats-tdg-issued-to', type: 'text', required: false, options: [], instruction: '', label: 'Issued To', dataKey: 'driver.fullName' },
            { id: 'f-ats-tdg-issued-by', type: 'text', required: false, options: [], instruction: 'Your carrier’s company name (set per company — not a fixed value).', label: 'Issued By (Company)' },
            { id: 'f-ats-tdg-issuer-address', type: 'text', required: false, options: [], instruction: '', label: 'Company Address' },
            { id: 'f-ats-tdg-issued-date', type: 'date', required: false, options: [], instruction: '', label: 'Issued Date', width: 'half' },
            { id: 'f-ats-tdg-expires', type: 'date', required: false, options: [], instruction: '', label: 'Expires On', width: 'half' },
            { id: 'f-ats-tdg-trained', type: 'checklist', required: false, options: ['Handling', 'Offering for transport', 'Transport'], instruction: '', label: 'Trained in' },
            { id: 'f-ats-tdg-specific', type: 'checklist', required: false, options: ['Classification', 'Shipping names', 'Use of Schedules 1, 2 & 3', 'Documentation', 'Dangerous goods safety marks', 'Means of containment', 'Emergency Response Assistance Plans', 'Reporting requirements', 'Safe handling and transport practices, and characteristics of dangerous goods', 'Proper use of equipment for handling or transporting dangerous goods', 'Emergency measures to reduce or eliminate danger to the public', 'Trained in all classes'], instruction: '', label: 'Specific training in' },
            { id: 'f-ats-tdg-type', type: 'text', required: false, options: [], instruction: 'e.g. DG Training', label: 'Type of Training' },
            { id: 'f-ats-tdg-trainer', type: 'text', required: false, options: [], instruction: '', label: 'Trainer Name', width: 'half' },
            { id: 'f-ats-tdg-location', type: 'text', required: false, options: [], instruction: 'e.g. Online / In-person', label: 'Location', width: 'half' },
            { id: 'f-ats-tdg-result', type: 'number', required: false, options: [], instruction: 'Score out of 100.', label: 'Result (%)', width: 'half' },
            { id: 'f-ats-tdg-training-date', type: 'date', required: false, options: [], instruction: '', label: 'Training Date', width: 'half' },
            { id: 'f-ats-tdg-expiry', type: 'date', required: false, options: [], instruction: '', label: 'Expiry Date', width: 'half' },
            { id: 'f-ats-tdg-emp-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Employee Signature' },
            { id: 'f-ats-tdg-employer-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Employer Signature' },
            { id: 'f-ats-tdg-doc', type: 'document', required: false, options: [], instruction: 'Attach the Certificate of Training (PDF).', label: 'Certificate of Training', documentTypeId: 'dt-training-cert' },
        ]),

        // ════════════════════════ Medical Declaration Form ════════════════════════
        mk('form-ats-medical-declaration', 'Medical Declaration', 'Medical Declaration Form', 'Driver self-declaration of medical fitness and any disqualifying / reportable conditions.', [
            { id: 'f-ats-md-head', type: 'heading', required: false, options: [], label: 'Medical Declaration Form', instruction: 'On March 30, 1999, Transport Canada and the U.S. Federal Highway Administration (FHWA) entered into a reciprocal agreement regarding the physical requirements for Canadian drivers of a commercial vehicle in the U.S., as continued in the Federal Motor Carrier Safety Regulations, Part 391.43, and vice versa. The reciprocal agreement removes the requirement for a Canadian driver to carry a copy of a medical examiner’s certificate indicating that the driver is physically qualified. (In effect, the existence of a valid driver’s license issued by the province of Ontario is deemed to be proof that a driver is physically qualified to drive in the U.S.) However, FHWA will not recognize an Ontario license if the driver has certain medical conditions, and those conditions would prohibit them from driving in the U.S.' },
            { id: 'f-ats-md-diabetes-note', type: 'paragraph', required: false, options: [], label: '', instruction: 'The Qualifications of Drivers, Diabetes Standard final rule was published on September 19, 2018 (83 FR 47486).' },
            { id: 'f-ats-md-conditions', type: 'bullet-list', required: false, label: 'Disqualifying / reportable conditions', instruction: '', options: [
                'Medical history or clinical diagnosis of epilepsy.',
                'Obstructive sleep apnea (OSA).',
                'Impaired hearing — a driver must be able to perceive a forced whispered voice in the better ear at not less than 5 feet (with or without a hearing aid), or have an average hearing loss in the better ear no greater than 40 dB at 500Hz, 1000Hz and 2000Hz (with or without a hearing aid) when tested by an audiometric device calibrated to ANSI Z24.5-1951.',
                'Issued a waiver by the province of Ontario allowing me to operate a commercial motor vehicle under Section 20 or 21 of Ontario Regulation 340/94.',
                'If a “W” condition on my Ontario license, then I am considered diabetic and will follow the requirements below in the USA.',
                '49 CFR 391.41(b)(3): to allow insulin use if 391.46 requirements are met.',
                '49 CFR 391.46: to indicate certification every 12 months if taking insulin.',
                '49 CFR 391.46: to outline regulatory requirements for certification if taking insulin.',
                'Considered disqualified if an unstable insulin regimen is present.',
                'Diabetes mellitus that is not properly controlled.',
                'Considered permanently disqualified if severe non-proliferative or proliferative diabetic retinopathy is diagnosed.',
                'Carry prescribed medicine to take, must keep the prescription at all times, and will present it upon inquiry.',
                'Required to carry over-the-counter medicine — I will provide documented proof of carrying the medicine.',
                'Cognitive impairment.',
                'A disorder resulting in cognitive impairment that affects attention, judgment and problem-solving, planning and sequencing, memory, insight, reaction time, or visuospatial perception, resulting in substantial limitation of the ability to perform activities of daily living. Due to: Dementia / Brain Injury / Tumor.',
                'Sudden incapacitation.',
                'A disorder with a moderate or high risk of sudden incapacitation, or that has resulted in sudden incapacitation and has a moderate or high risk of recurrence. Due to: Seizure, Alcohol/Drug Withdrawal, Epilepsy, Stroke, Syncope (single episode not yet diagnosed).',
                'Heart disease with pre-syncope / syncope / arrhythmia.',
                'Narcolepsy with uncontrolled cataplexy or daytime sleep attacks.',
                'Obstructive sleep apnea — untreated or unsuccessfully treated with an apnea-hypopnea index (AHI) greater than or equal to 30 with daytime sleepiness.',
                'Hypoglycemia requiring the intervention of a third party or producing loss of consciousness.',
                'Uncontrolled diabetes or hypoglycemia.',
                'Motor or sensory impairment.',
                'A condition resulting in severe motor impairment affecting coordination, muscle strength and control, flexibility, motor planning, touch, or positional sense. Due to: Loss of Limb, Spinal Cord Injury, Visual Impairment (best corrected visual acuity below 20/50 with both eyes open and examined together).',
                'Visual field less than 120 continuous degrees along the horizontal meridian, or less than 15 continuous degrees above and below fixation, or less than 60 degrees to either side of the vertical meridian, including hemianopia.',
                'Diplopia within 40 degrees of the fixation point (in all directions) of a primary position, that cannot be corrected using prism lenses or patching.',
                'Substance Use Disorder.',
                'A diagnosis of an uncontrolled substance use disorder (excluding caffeine and nicotine) where the patient is non-compliant with treatment recommendations.',
                'Psychiatric illness.',
                'A condition currently involving any of the following: acute psychosis, severe abnormalities of perception, or a patient who has a suicidal plan involving a vehicle or an intent to use a vehicle to harm others.',
            ] },
            { id: 'f-ats-md-status', type: 'radio', required: false, options: ['No medical condition mentioned above', 'I have a medical condition mentioned above'], instruction: 'I have understood all the above-mentioned and declare that:', label: 'Declaration' },
            { id: 'f-ats-md-condition-name', type: 'text', required: false, options: [], instruction: 'Name the medical condition.', label: 'Name of the medical condition', showWhen: { fieldId: 'f-ats-md-status', equals: 'I have a medical condition mentioned above' } },
            { id: 'f-ats-md-agree', type: 'paragraph', required: false, options: [], label: '', instruction: 'I further agree to inform the carrier immediately should my medical status change, or if I can no longer certify the conditions described.' },
            { id: 'f-ats-md-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Driver signature' },
            { id: 'f-ats-md-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },
        ]),

        // ════════ Certification of Compliance with Driver License Requirements ════════
        mk('form-ats-license-compliance', 'Certification of Compliance – Driver License', "Driver's Certification of Compliance with Driver License Requirements", "Driver certification of compliance with Part 383 / Part 391 driver license requirements (§383.21 single-license rule).", [
            { id: 'f-ats-lc-head', type: 'heading', required: false, options: [], label: "Certification of Compliance with Driver License Requirements", instruction: 'Motor Carrier Instructions: The requirements in Part 383 apply to every driver who operates in intrastate, interstate, or foreign commerce and operates a vehicle weighing 26,001 pounds or more, can transport more than 15 people, or transports hazardous materials that require placarding. The requirements in Part 391 apply to every driver who operates in interstate commerce and operates a vehicle weighing 10,001 pounds or more, can transport more than 15 people, or transports hazardous materials that require placarding.' },
            { id: 'f-ats-lc-intro', type: 'paragraph', required: false, options: [], label: '', instruction: 'Driver Requirements: Parts 383 and 391 of the Federal Motor Carrier Safety Regulations contain some requirements that you as a driver must comply with. These requirements are in effect as of July 1, 1987. They are as follows:' },
            { id: 'f-ats-lc-req1', type: 'paragraph', required: false, options: [], label: '', instruction: '1. Legislation in force prohibits the holding of more than one valid and subsisting driver licence issued by a competent authority in Canada and/or U.S.A. If you currently have more than one license, you should keep the license from your Province/State of residence and return the additional licenses to the states that issued them. DESTROYING a license does not close the record in the state that issued it; you must notify the state. If a multiple license has been lost, stolen, or destroyed, you should close your record by notifying the state of issuance that you no longer want to be licensed by that state.' },
            { id: 'f-ats-lc-req2', type: 'paragraph', required: false, options: [], label: '', instruction: '2. Sections 392.42 and 383.33 of the Federal Motor Carrier Safety Regulations require that you notify your employer the NEXT BUSINESS DAY of any revocation or suspension of your driver\'s license. In addition, section 383.31 requires that any time you violate a Province/State or local traffic law (other than parking), you must report it to your employing motor carrier and the state that issued your license within 30 days.' },
            { id: 'f-ats-lc-cert', type: 'paragraph', required: false, options: [], label: '', instruction: 'Driver Certification: I certify that I have read and understood the above requirements. The following license is the only one I will possess:' },
            { id: 'f-ats-lc-licence', type: 'text', required: false, options: [], instruction: '', label: "Driver's Licence Number", width: 'half', dataKey: 'license.number' },
            { id: 'f-ats-lc-province', type: 'text', required: false, options: [], instruction: '', label: 'Province / State', width: 'half' },
            { id: 'f-ats-lc-expiry', type: 'date', required: false, options: [], instruction: '', label: 'Expiry Date', width: 'half', dataKey: 'license.expiry' },
            { id: 'f-ats-lc-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Driver signature' },
            { id: 'f-ats-lc-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },
        ]),

        // ════════════════════════ Drug and Alcohol Consent ════════════════════════
        mk('form-ats-drug-alcohol-consent', 'Drug and Alcohol Consent', 'Drug and Alcohol Consent', 'Driver authorization to release DOT-regulated drug & alcohol testing records from previous employers (49 CFR §382.413 / §40.25).', [
            { id: 'f-ats-dac-head', type: 'heading', required: false, options: [], label: 'Drug and Alcohol Consent', instruction: 'Request for Drug and Alcohol Testing Information from Previous Employers IAW 49 CFR §382.413 and 49 CFR §40.25, and for Pre-Employment Test Exemption IAW 49 CFR §382.301(b).' },
            { id: 'f-ats-dac-auth', type: 'paragraph', required: false, options: [], label: '', instruction: 'I hereby authorize the release of information from my Department of Transportation–regulated drug and alcohol testing records by my previous employer to the prospective employer named below and/or its service provider. This release is in accordance with DOT Regulation 49 CFR Part 40, Section 40.25. I understand that the information to be released by my previous employer is limited to the following DOT-regulated testing items:' },
            { id: 'f-ats-dac-items', type: 'bullet-list', required: false, label: '', instruction: '', options: [
                'Alcohol tests with a result of 0.04 or higher;',
                'Verified positive drug tests;',
                'Refusals to be tested;',
                'Other violations of DOT agency drug and alcohol testing regulations;',
                'Information obtained from previous employers of a drug and alcohol rule violation;',
                'Documentation, if any, of completion of the return-to-duty process following a rule violation.',
            ] },
            { id: 'f-ats-dac-employer', type: 'text', required: false, options: [], instruction: 'Previous employer the records are requested from.', label: 'Employer / Contractor' },
            { id: 'f-ats-dac-driver', type: 'text', required: false, options: [], instruction: '', label: 'Driver name', width: 'half', dataKey: 'driver.fullName' },
            { id: 'f-ats-dac-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },
            { id: 'f-ats-dac-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Driver signature' },
        ]),

        // ════════════════════════ Post Orientation Quiz ════════════════════════
        mk('form-ats-orientation-quiz', 'HOS / ELD / DVIR / PTI Knowledge', 'HOS / ELD / DVIR / PTI Knowledge', 'Driver knowledge check — the 20-question post-orientation quiz (HOS, ELD, inspections, company procedures) plus the HOS score and DVIR competency sign-off.', [
            { id: 'f-ats-poq-head', type: 'heading', required: false, options: [], label: 'Post Orientation Quiz', instruction: 'Select the correct answer for each question.' },
            { id: 'f-ats-poq-name', type: 'text', required: false, options: [], instruction: '', label: 'Name', width: 'half', dataKey: 'driver.fullName' },
            { id: 'f-ats-poq-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },
            { id: 'f-ats-poq-score', type: 'number', required: false, options: [], instruction: 'Out of 20.', label: 'Score (/20)', width: 'half' },
            { id: 'f-ats-poq-q1', type: 'radio', required: false, instruction: '', label: '1 · Who do you ask for your load information?', options: ['Owner of the company', 'Safety Department', 'Send a text on the dispatch text number to ask about load information', 'Samsara ELD'] },
            { id: 'f-ats-poq-q2', type: 'radio', required: false, instruction: '', label: '2 · Before starting the load from the yard, or after a pickup, when do you send a temperature setting photo to dispatch?', options: ['Never', 'When I remember', 'Most of the time', 'Always'] },
            { id: 'f-ats-poq-q3', type: 'radio', required: false, instruction: '', label: '3 · Make sure to scale the weight after the pickup from a nearby scale to confirm the trailer is not overweight.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q4', type: 'radio', required: false, instruction: 'After getting the BOL and POD, the driver must wait for dispatch approval before moving forward to the next assignment.', label: '4 · Who do you email your BOL (Bill of Lading) and POD (Proof of Delivery)?', options: ['Safety (safety@)', 'Payroll (payroll@)', 'POD inbox (pod@)', 'Dispatch (dispatch@)'] },
            { id: 'f-ats-poq-q5', type: 'radio', required: false, instruction: '', label: '5 · Send a photo showing that the load is secured before closing the doors of the trailer after the pickup.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q6', type: 'radio', required: false, instruction: '', label: '6 · Always call dispatch in case of breakdown.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q7', type: 'radio', required: false, instruction: '', label: '7 · Fuel ups should be done from BVD locations only. Do not leave for a run without a fuel card.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q8', type: 'radio', required: false, instruction: '', label: '8 · Run sheets must be sent to payroll by every 8th and 23rd to get paid on time.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q9', type: 'radio', required: false, instruction: '', label: '9 · Payday is the 1st and 16th of every month; driver settlements are sent prior to pay day, and corrections must be emailed to payroll within 24 hrs of receiving the settlement.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q10', type: 'radio', required: false, instruction: '', label: '10 · All expenses are only reimbursed if receipts are attached along with the trip sheets.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q11', type: 'radio', required: false, instruction: '', label: '11 · If you drive O/O trucks, you are entitled to receive a separate pay settlement along with a separate cheque on pay day.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q12', type: 'radio', required: false, instruction: '', label: '12 · The Electronic Log Device (ELD) must be ON and logged in at all times when on duty. It is illegal to drive while the ELD is off.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q13', type: 'radio', required: false, instruction: '', label: '13 · When do you report ALL accidents and ALL incidents?', options: ['Never', 'When I remember', 'Most of the time', 'Always — to Safety'] },
            { id: 'f-ats-poq-q14', type: 'radio', required: false, instruction: 'Original inspections (Pass or Fail) must be handed in to the Safety department upon arrival at the terminal.', label: '14 · A copy must be emailed immediately following the inspection to?', options: ['Safety Department', 'Payroll', 'POD inbox', 'Dispatch'] },
            { id: 'f-ats-poq-q15', type: 'radio', required: false, instruction: '', label: '15 · Any issues with Samsara ELD, logs and/or safety must be addressed to which email?', options: ['Safety Department', 'Payroll', 'POD inbox', 'Dispatch'] },
            { id: 'f-ats-poq-q16', type: 'radio', required: false, instruction: 'GPS devices must be mounted to the dash or windshield, pre-programmed before departing, and only manipulated while parked.', label: '16 · What type of GPS do you own?', options: ['Personal cell phone with Waze / Google Maps', 'Approved Truckers GPS giving info on low bridges, truck routes, etc.', 'Any GPS will do', "I know my way — I don't need GPS"] },
            { id: 'f-ats-poq-q17', type: 'radio', required: false, instruction: '', label: '17 · A DVIR confirms a driver has completed an inspection on a commercial motor vehicle. Drivers must complete pre-trip and post-trip inspections and detail any mechanical defects per Schedule 1.', options: ['True', 'False'] },
            { id: 'f-ats-poq-q18', type: 'radio', required: false, instruction: 'Schedule 1 must always be carried.', label: '18 · What is a Schedule 1?', options: ['Drivers work schedule', 'Truck, Tractor, or Trailer Daily Inspections — items to be inspected are numbered, with minor and major defects identified', 'Dispatch work schedule', 'Safety and Compliance schedule'] },
            { id: 'f-ats-poq-q19', type: 'radio', required: false, instruction: '', label: '19 · The DOT Instruction Sheet (Samsara) is required to be kept on board and available to present during inspections per FMCSA 49 CFR 395.22(h).', options: ['True', 'False'] },
            { id: 'f-ats-poq-q20', type: 'radio', required: false, instruction: '', label: "20 · In the event of an ELD malfunction that can't be fixed quickly, the FMCSA requires you to have 8 days of blank paper logs in your truck, or 14 if you're driving in Canada.", options: ['True', 'False'] },
            { id: 'f-ats-poq-result-head', type: 'heading', required: false, options: [], label: 'Result & DVIR Competency', instruction: '' },
            { id: 'f-ats-poq-pass', type: 'toggle', required: false, options: [], instruction: '', label: 'Quiz passed?' },
            { id: 'f-ats-poq-dvir-trained', type: 'toggle', required: false, options: [], instruction: '', label: 'DVIR / pre-trip & post-trip inspection procedure trained & understood?' },
            { id: 'f-ats-poq-dvir-doc', type: 'document', required: false, options: [], instruction: 'Upload a completed sample DVIR or competency record.', label: 'DVIR competency record', documentTypeId: 'dt-dvir' },
        ]),

        // ══════ Training & Policy Acknowledgements (merged: training modules + policy docs + GPS + acknowledgements) ══════
        mk('form-ats-training-ack', 'Training & Policy Acknowledgements', 'Training & Policy Acknowledgements', 'Consolidated onboarding acknowledgement — training modules completed, HOS/ELD/PTI/Hazmat training, company policy documents, GPS policy, and the driver acknowledgement of company rules.', [
            { id: 'f-ats-tack-head', type: 'heading', required: false, options: [], label: 'HOS / ELD / PTI / Hazmat & Company Policies Acknowledgement', instruction: 'Subject: HOS Training / ELD / PTI / Hazardous Material Handling / Company Policies.' },
            { id: 'f-ats-tack-date', type: 'date', required: false, options: [], instruction: '', label: 'Date', width: 'half' },
            { id: 'f-ats-tack-p1', type: 'paragraph', required: false, options: [], label: '', instruction: 'I, the driver named below, having received the above-mentioned training from {{company}}, acknowledge it was explained and that I have read and understand the requirements, guidelines and regulations contained within the ELD-HOS / DVIR / PTI and all Policies of the company. I accept that {{company}} shall from time to time make amendments to this Plan and I agree to ACCEPT such amendments in a timely manner upon receipt of such changes.' },
            { id: 'f-ats-tack-p2', type: 'paragraph', required: false, options: [], label: '', instruction: 'I acknowledge that I have received the ELD-HOS / DVIR / Hazardous Material Handling & PTI training. I fully understand the Company Policies as stipulated in the ELD-HOS / DVIR & PTI training and the consequences for non-compliance. I agree to confirm with my supervisor immediately if I am uncertain of any Policy, Requirement, Guideline or Regulation with which I am to comply, and I confirm that I have cleared my doubts with the safety staff of the company, and I shall comply with all the Hours-of-Service regulations.' },

            { id: 'f-ats-tack-modules-head', type: 'heading', required: false, options: [], label: 'Training Modules Completed', instruction: '' },
            { id: 'f-ats-tack-modules', type: 'checklist', required: false, options: ['Company orientation', 'Safety & defensive driving', 'HOS & ELD', 'Cargo securement', 'Hazmat awareness', 'Accident procedures'], instruction: 'Mark completed modules.', label: 'Training modules' },
            { id: 'f-ats-tack-modules-date', type: 'date', required: false, options: [], instruction: '', label: 'Completed date', width: 'half' },
            { id: 'f-ats-tack-modules-cert', type: 'document', required: false, options: [], instruction: 'Attach training certificates.', label: 'Training certificates', documentTypeId: 'dt-training-cert' },

            { id: 'f-ats-tack-policy-head', type: 'heading', required: false, options: [], label: 'Company Policy Documents', instruction: '' },
            { id: 'f-ats-tack-policy-provided', type: 'toggle', required: false, options: [], instruction: '', label: 'Policy documents provided to driver?' },
            { id: 'f-ats-tack-policy-doc', type: 'document', required: false, options: [], instruction: 'Upload the policy documents provided.', label: 'Policy documents', documentTypeId: 'dt-policy-ack' },

            { id: 'f-ats-tack-gps-head', type: 'heading', required: false, options: [], label: 'GPS Policy', instruction: 'Attn: all {{company}} drivers — Re: GPS Policy.' },
            { id: 'f-ats-tack-gps-body', type: 'paragraph', required: false, options: [], label: '', instruction: 'All drivers are to own and operate their own "TRUCKING" GPS device, mounted to the dash or windshield so no hand-holding is required. The GPS device must be pre-programmed before departing and can only be manipulated while the vehicle is parked — no adjusting or tampering while driving. {{company}} is prepared to help those who need financial assistance to obtain a proper GPS device (see management to fill out a deduction form). If you own a GPS device or plan on buying one, you must provide the purchase details so we can confirm it. I have read and understand the GPS policy.' },
            { id: 'f-ats-tack-gps-ack', type: 'toggle', required: false, options: [], instruction: '', label: 'I understand and accept the GPS policy.' },

            { id: 'f-ats-tack-ack-head', type: 'heading', required: false, options: [], label: 'Policies Read & Acknowledged', instruction: '' },
            { id: 'f-ats-tack-ack-items', type: 'checklist', required: false, options: ['Employee handbook', 'Safety policy', 'Drug & alcohol policy', 'HOS / ELD policy', 'Code of conduct', 'GPS policy', 'Cell phone / dash cam policy', 'Scale & inspection policy'], instruction: 'Items the driver has read & acknowledged.', label: 'Acknowledged' },

            { id: 'f-ats-tack-sign-head', type: 'heading', required: false, options: [], label: 'Signatures', instruction: '' },
            { id: 'f-ats-tack-driver-name', type: 'text', required: false, options: [], instruction: '', label: 'Driver Name (Print)', dataKey: 'driver.fullName' },
            { id: 'f-ats-tack-license', type: 'text', required: false, options: [], instruction: '', label: 'Driver License Number', width: 'half', dataKey: 'license.number' },
            { id: 'f-ats-tack-driver-date', type: 'date', required: false, options: [], instruction: '', label: 'Driver Sign Date', width: 'half' },
            { id: 'f-ats-tack-driver-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Driver Signature' },
            { id: 'f-ats-tack-trainer-name', type: 'text', required: false, options: [], instruction: '', label: 'Trainer Name (Print)', width: 'half' },
            { id: 'f-ats-tack-trainer-date', type: 'date', required: false, options: [], instruction: '', label: 'Trainer Sign Date', width: 'half' },
            { id: 'f-ats-tack-trainer-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Trainer Signature' },
        ]),

        // ════════════════════ Driver Hiring Approval Template ════════════════════
        mk('form-ats-hiring-approval', 'Driver Hiring Approval', 'Driver Hiring Approval Template', 'Three-stage supervisor sign-off before a driver is dispatched — review, interview/road test, and final onboarding.', [
            { id: 'f-ats-hap-head', type: 'heading', required: false, options: [], label: 'Driver Hiring Approval Template', instruction: 'NOTE: All drivers must be approved by a supervisor before hitting the road on any {{company}} equipment. If a supervisor has not signed the approval for all 3 stages, do not dispatch the driver.' },
            { id: 'f-ats-hap-driver-name', type: 'text', required: false, options: [], instruction: '', label: 'Driver Name', dataKey: 'driver.fullName' },
            { id: 'f-ats-hap-driver-phone', type: 'text', required: false, options: [], instruction: '', label: 'Driver Phone #', width: 'half', dataKey: 'driver.phone' },
            { id: 'f-ats-hap-reference', type: 'text', required: false, options: [], instruction: '', label: 'Reference By', width: 'half' },

            { id: 'f-ats-hap-s1-head', type: 'heading', required: false, options: [], label: 'Stage 1', instruction: '' },
            { id: 'f-ats-hap-s1-items', type: 'checklist', required: false, instruction: 'Complete each item before approving Stage 1.', label: 'Stage 1 checklist', options: [
                'Reviewed CVOR / Abstract / Experience / Attitude',
                'Started application on Truckright',
                'Primarily had discussions on which lane the driver wants to drive',
            ] },
            { id: 'f-ats-hap-s1-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Stage 1 — Approval Signature' },

            { id: 'f-ats-hap-s2-head', type: 'heading', required: false, options: [], label: 'Stage 2', instruction: '' },
            { id: 'f-ats-hap-s2-items', type: 'checklist', required: false, instruction: 'Complete each item before approving Stage 2.', label: 'Stage 2 checklist', options: [
                'Driver is interviewed in detail to make sure the driver understands the pay structures, the routes, the type of trucks and the work environment',
                'Schedule a road test with one of the approved examiners',
                'After the road test is passed — review the road test results; if passed, inform the safety team on completing the Truckright application / CarriersEdge training / drug test, send reference checks and schedule the driver for the next orientation',
                'PSP check (if USA driving experience)',
            ] },
            { id: 'f-ats-hap-s2-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Stage 2 — Approval Signature' },

            { id: 'f-ats-hap-s3-head', type: 'heading', required: false, options: [], label: 'Stage 3', instruction: '' },
            { id: 'f-ats-hap-s3-items', type: 'checklist', required: false, instruction: 'Complete each item before approving Stage 3.', label: 'Stage 3 checklist', options: [
                'After the driver has done CarriersEdge training, road test passed, Truckright profile fully completed, drug test results good, and orientation complete — Safety team will assign a CC#',
                'Driver added in: Samsara, Transplus, active driver list (Google Sheet)',
            ] },
            { id: 'f-ats-hap-cc', type: 'text', required: false, options: [], instruction: '', label: 'Driver CC#', width: 'half' },
            { id: 'f-ats-hap-s3-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Stage 3 — Approval Signature' },
        ]),

        // ════════════════════════ Daily Log & HOS Declaration ════════════════════════
        mk('form-ats-driver-daily-log', 'Daily Log & HOS Declaration', 'Daily Log & HOS Declaration', "Canadian driver's daily log plus the prior 14-day Statement of Hours of Service — carrier & terminal details, duty-status hours, shipping/deferral, the daily vehicle (DVIR) inspection, and the new-hire 14-day HOS declaration.", [
            { id: 'f-ats-ddl-head', type: 'heading', required: false, options: [], label: 'Driver Daily Log', instruction: 'Original: submit to carrier. Duplicate: driver retain. Use local time standard at the home terminal.' },
            { id: 'f-ats-ddl-carrier', type: 'text', required: false, options: [], instruction: 'Name of carrier(s).', label: 'Name of Carrier' },
            { id: 'f-ats-ddl-office', type: 'text', required: false, options: [], instruction: '', label: 'Main / Principal Office Address' },
            { id: 'f-ats-ddl-terminal', type: 'text', required: false, options: [], instruction: '', label: 'Home Terminal Address' },
            { id: 'f-ats-ddl-date', type: 'date', required: false, options: [], instruction: '', label: 'Log Date (Day / Month / Year)', width: 'half' },
            { id: 'f-ats-ddl-cycle', type: 'radio', required: false, options: ['70 Hour / 7 Days', '120 Hour / 14 Days'], instruction: 'Canadian cycle.', label: 'Cycle' },
            { id: 'f-ats-ddl-driver', type: 'text', required: false, options: [], instruction: '', label: "Driver's Name (Print)", dataKey: 'driver.fullName' },
            { id: 'f-ats-ddl-codriver', type: 'text', required: false, options: [], instruction: '', label: "Co-Driver's Name" },
            { id: 'f-ats-ddl-truck', type: 'text', required: false, options: [], instruction: '', label: 'Truck / Tractor Licence Plate and/or Unit #', width: 'half' },
            { id: 'f-ats-ddl-trailer', type: 'text', required: false, options: [], instruction: '', label: 'Trailer Licence Plate and/or Unit #', width: 'half' },
            { id: 'f-ats-ddl-odo-start', type: 'number', required: false, options: [], instruction: '', label: 'Starting Odometer', width: 'half' },
            { id: 'f-ats-ddl-odo-end', type: 'number', required: false, options: [], instruction: '', label: 'Ending Odometer', width: 'half' },
            { id: 'f-ats-ddl-driven', type: 'number', required: false, options: [], instruction: '', label: 'Driven Today (km/mi)', width: 'half' },
            { id: 'f-ats-ddl-sign', type: 'signature', required: false, options: [], instruction: 'Certified true and correct.', label: "Driver's Signature" },

            { id: 'f-ats-ddl-status-head', type: 'heading', required: false, options: [], label: 'Duty Status (Total Hours)', instruction: 'Enter the total hours in each duty status. The four statuses should add up to 24.' },
            { id: 'f-ats-ddl-h-offduty', type: 'number', required: false, options: [], instruction: '', label: 'Off-duty time (other than sleeper berth)', width: 'half' },
            { id: 'f-ats-ddl-h-sleeper', type: 'number', required: false, options: [], instruction: '', label: 'Off-duty time in a sleeper berth', width: 'half' },
            { id: 'f-ats-ddl-h-driving', type: 'number', required: false, options: [], instruction: '', label: 'Driving time', width: 'half' },
            { id: 'f-ats-ddl-h-onduty', type: 'number', required: false, options: [], instruction: '', label: 'On-duty time (other than driving)', width: 'half' },
            { id: 'f-ats-ddl-h-total', type: 'number', required: false, options: [], instruction: 'Auto-calculated — should equal 24.', label: 'Total Hours', computed: { kind: 'sum', sources: ['f-ats-ddl-h-offduty', 'f-ats-ddl-h-sleeper', 'f-ats-ddl-h-driving', 'f-ats-ddl-h-onduty'] } },
            { id: 'f-ats-ddl-remarks', type: 'textarea', required: false, options: [], instruction: '', label: 'Remarks' },

            { id: 'f-ats-ddl-ship-head', type: 'heading', required: false, options: [], label: 'Shipping & Deferral', instruction: '' },
            { id: 'f-ats-ddl-defer', type: 'radio', required: false, options: ['None', 'Day 1', 'Day 2'], instruction: 'Driver deferring off-duty time.', label: 'Deferral' },
            { id: 'f-ats-ddl-ship-doc', type: 'text', required: false, options: [], instruction: '', label: 'Shipping Document(s) #', width: 'half' },
            { id: 'f-ats-ddl-shipper', type: 'text', required: false, options: [], instruction: '', label: 'Shipper(s)', width: 'half' },
            { id: 'f-ats-ddl-commodity', type: 'text', required: false, options: [], instruction: '', label: 'Commodity', width: 'half' },
            { id: 'f-ats-ddl-personal-odo', type: 'text', required: false, options: [], instruction: '', label: 'Personal Use Odometer Info', width: 'half' },

            { id: 'f-ats-ddl-dvir-head', type: 'heading', required: false, options: [], label: 'Daily Vehicle Inspection (DVIR)', instruction: 'Pre-trip / post-trip inspection performed per Schedule 1.' },
            { id: 'f-ats-ddl-inspector', type: 'text', required: false, options: [], instruction: '', label: 'Name of the person who conducted the inspection' },
            { id: 'f-ats-ddl-insp-time', type: 'text', required: false, options: [], instruction: 'e.g. 06:30', label: 'Inspection Time', width: 'half' },
            { id: 'f-ats-ddl-insp-date', type: 'date', required: false, options: [], instruction: '', label: 'Inspection Date', width: 'half' },
            { id: 'f-ats-ddl-insp-city', type: 'text', required: false, options: [], instruction: '', label: 'City', width: 'half' },
            { id: 'f-ats-ddl-insp-prov', type: 'text', required: false, options: [], instruction: '', label: 'Prov / State', width: 'half' },
            { id: 'f-ats-ddl-defects-start', type: 'toggle', required: false, options: [], instruction: '', label: 'Defects found at start of trip?' },
            { id: 'f-ats-ddl-defects-end', type: 'toggle', required: false, options: [], instruction: '', label: 'Defects found at end of trip?' },
            { id: 'f-ats-ddl-defect-details', type: 'textarea', required: false, options: [], instruction: 'List the vehicle/unit, defect number and the defect.', label: 'Defect details', showWhen: { fieldId: 'f-ats-ddl-defects-end', equals: true } },
            { id: 'f-ats-ddl-repaired', type: 'toggle', required: false, options: [], instruction: '', label: 'Defects repaired / corrected?', showWhen: { fieldId: 'f-ats-ddl-defects-end', equals: true } },
            { id: 'f-ats-ddl-declare', type: 'paragraph', required: false, options: [], label: '', instruction: 'I declare that each vehicle shown on this report has been inspected in accordance with Schedule 1.' },
            { id: 'f-ats-ddl-insp-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Signature of the person who conducted the inspection' },

            // ── Prior 14-Day HOS Declaration (new hires, contractors, casual & temporary) ──
            { id: 'f-ats-ddl-decl-head', type: 'heading', required: false, options: [], label: 'Prior 14-Day HOS Declaration', instruction: 'For new hires, contractors, casual & temporary employees. Section 81.(2)(c) and Section 84 require the carrier to keep daily duty-status records and the driver to carry the preceding 14 days of logs.' },
            { id: 'f-ats-ddl-decl-cert', type: 'paragraph', required: false, options: [], label: '', instruction: 'I hereby certify that the information given below is correct to the best of my knowledge and belief, and that I was last relieved from work at:' },
            { id: 'f-ats-ddl-relieved-time', type: 'text', required: false, options: [], instruction: 'e.g. 03:29', label: 'Last relieved from work at (time)', width: 'half' },
            { id: 'f-ats-ddl-relieved-date', type: 'date', required: false, options: [], instruction: '', label: 'On (date)', width: 'half' },
            { id: 'f-ats-ddl-d1', type: 'number', required: false, options: [], instruction: '', label: 'Day 1 (Yesterday) — hours', width: 'half' },
            { id: 'f-ats-ddl-d2', type: 'number', required: false, options: [], instruction: '', label: 'Day 2 — hours', width: 'half' },
            { id: 'f-ats-ddl-d3', type: 'number', required: false, options: [], instruction: '', label: 'Day 3 — hours', width: 'half' },
            { id: 'f-ats-ddl-d4', type: 'number', required: false, options: [], instruction: '', label: 'Day 4 — hours', width: 'half' },
            { id: 'f-ats-ddl-d5', type: 'number', required: false, options: [], instruction: '', label: 'Day 5 — hours', width: 'half' },
            { id: 'f-ats-ddl-d6', type: 'number', required: false, options: [], instruction: '', label: 'Day 6 — hours', width: 'half' },
            { id: 'f-ats-ddl-d7', type: 'number', required: false, options: [], instruction: '', label: 'Day 7 — hours', width: 'half' },
            { id: 'f-ats-ddl-d8', type: 'number', required: false, options: [], instruction: '', label: 'Day 8 — hours', width: 'half' },
            { id: 'f-ats-ddl-d9', type: 'number', required: false, options: [], instruction: '', label: 'Day 9 — hours', width: 'half' },
            { id: 'f-ats-ddl-d10', type: 'number', required: false, options: [], instruction: '', label: 'Day 10 — hours', width: 'half' },
            { id: 'f-ats-ddl-d11', type: 'number', required: false, options: [], instruction: '', label: 'Day 11 — hours', width: 'half' },
            { id: 'f-ats-ddl-d12', type: 'number', required: false, options: [], instruction: '', label: 'Day 12 — hours', width: 'half' },
            { id: 'f-ats-ddl-d13', type: 'number', required: false, options: [], instruction: '', label: 'Day 13 — hours', width: 'half' },
            { id: 'f-ats-ddl-d14', type: 'number', required: false, options: [], instruction: '', label: 'Day 14 — hours', width: 'half' },
            { id: 'f-ats-ddl-d-total', type: 'number', required: false, options: [], instruction: 'Sum of all 14 days.', label: 'Total Hours Worked (14 days)', computed: { kind: 'sum', sources: ['f-ats-ddl-d1', 'f-ats-ddl-d2', 'f-ats-ddl-d3', 'f-ats-ddl-d4', 'f-ats-ddl-d5', 'f-ats-ddl-d6', 'f-ats-ddl-d7', 'f-ats-ddl-d8', 'f-ats-ddl-d9', 'f-ats-ddl-d10', 'f-ats-ddl-d11', 'f-ats-ddl-d12', 'f-ats-ddl-d13', 'f-ats-ddl-d14'] } },
            { id: 'f-ats-ddl-decl-sign', type: 'signature', required: false, options: [], instruction: '', label: 'Driver signature (14-day declaration)' },
        ]),
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
        formType: f.formType,
        buttonName: f.buttonName,
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
