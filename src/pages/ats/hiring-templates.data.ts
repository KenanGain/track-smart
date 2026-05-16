// Hiring path templates — admin-configured definition of which consent
// forms an applicant must sign, which documents and photos must be uploaded,
// and which appointments must be booked at each workflow step.

import type { PipelineStepId } from "./ats.data";
import type { ConsentCategory } from "./consent-forms.data";

export type RequirementMode = 'required' | 'optional' | 'conditional';

export interface TemplateConsent {
    consentId: ConsentCategory;
    mode: RequirementMode;
    condition?: string;
}

export type DocumentCategory =
    | 'Application'
    | 'Identity'        // Driver license front/back, passport, SSN card, birth certificate
    | 'Photo'           // Headshot, vehicle photos, license photo
    | 'Background'
    | 'MVR'
    | 'PSP'
    | 'Substance'
    | 'DOT'
    | 'Medical'
    | 'Insurance'
    | 'Other';

export interface DocumentMonitoring {
    /** Master switch — when false the doc has no monitoring. */
    enabled: boolean;
    /** Expiry-date field shown on the upload + tracked against the reminder schedule. */
    captureExpiryDate: boolean;
    /** Issue-date field shown on the upload. */
    captureIssueDate: boolean;
    /** Force the recruiter / applicant to select an issuing state/province. */
    issueStateRequired: boolean;
    /** Force selection of an issuing country. */
    issueCountryRequired: boolean;
    /** Whether the reminder schedule counts down from the expiry date or the issue date. */
    monitorBasedOn: 'expiry_date' | 'issue_date';
    /** Renewal cadence (drives the "next renewal" projection). */
    renewalRecurrence: 'annually' | 'biennial' | 'quarterly' | 'monthly' | 'custom';
    /** Days-before-renewal at which reminders fire. Order doesn't matter. */
    reminderDays: number[];
    /** Channels that receive the reminder. */
    channels: { email: boolean; inApp: boolean; sms: boolean };
}

export const DEFAULT_DOCUMENT_MONITORING: DocumentMonitoring = {
    enabled: false,
    captureExpiryDate: true,
    captureIssueDate: false,
    issueStateRequired: false,
    issueCountryRequired: false,
    monitorBasedOn: 'expiry_date',
    renewalRecurrence: 'annually',
    reminderDays: [90, 60, 30],
    channels: { email: true, inApp: true, sms: false },
};

export interface TemplateDocument {
    id: string;
    label: string;
    category: DocumentCategory;
    mode: RequirementMode;
    source: 'Applicant' | 'Recruiter' | 'Vendor';
    helper?: string;
    condition?: string;
    /** Photo-type slot: render a camera/upload UI instead of a file picker. */
    isPhoto?: boolean;
    /** Require an applicant signature on the uploaded document. */
    requiresSignature?: boolean;
    /** Expiry / renewal monitoring config. When undefined the doc isn't
     *  tracked. Admins flip `enabled` on to start receiving reminders. */
    monitoring?: DocumentMonitoring;
}

export interface BookingSlot {
    id: string;
    label: string;
    type: 'substance_test' | 'dot_physical' | 'road_test' | 'orientation' | 'fingerprinting' | 'other';
    mode: RequirementMode;
    /** Helper text shown in the booking card. */
    helper?: string;
    /** Where the appointment happens. */
    venue?: string;
    /** Notes for the recruiter / coordinator. */
    notes?: string;
}

export interface TemplateStep {
    stepId: PipelineStepId;
    enabled: boolean;
    consents: TemplateConsent[];
    documents: TemplateDocument[];
    /** Appointments / bookings due on this step (substance test, road test, DOT physical, …). */
    bookings: BookingSlot[];
    instruction?: string;
}

// Application-form fields shown to the applicant on the Application Review
// step. Configurable per template so admins can drop a question for one
// license class or add a custom one for owner-operators.
export type FormFieldType = 'text' | 'email' | 'phone' | 'date' | 'select' | 'textarea' | 'ssn' | 'address';

export interface TemplateFormField {
    id: string;
    label: string;
    type: FormFieldType;
    required: boolean;
    helper?: string;
    /** Group label — drives section headings on the rendered form. */
    section: 'Identity' | 'Contact' | 'Address' | 'Employment' | 'Driving Experience' | 'Other';
    /** When `type === 'select'`, options shown in the dropdown. */
    options?: string[];
    /** Validation regex (optional). */
    pattern?: string;
}

export interface HiringTemplate {
    id: string;
    name: string;
    description: string;
    appliesToLicense: 'CDL-A' | 'CDL-B' | 'CDL' | 'Non-CDL' | 'all';
    isDefault: boolean;
    /** Application-form fields shown to the applicant. */
    formFields: TemplateFormField[];
    steps: TemplateStep[];
    updatedAt: string;
    updatedBy: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const stub = (stepId: PipelineStepId): TemplateStep => ({
    stepId, enabled: true, consents: [], documents: [], bookings: [],
});

// Default application-form fields — what the applicant fills out on the
// Application Review step. Admins can add/remove/reorder per template.
const DEFAULT_FORM_FIELDS: TemplateFormField[] = [
    // Identity
    { id: 'ff-first',     label: 'First Name',     type: 'text',     required: true,  section: 'Identity' },
    { id: 'ff-middle',    label: 'Middle Name',    type: 'text',     required: false, section: 'Identity' },
    { id: 'ff-last',      label: 'Last Name',      type: 'text',     required: true,  section: 'Identity' },
    { id: 'ff-dob',       label: 'Date of Birth',  type: 'date',     required: true,  section: 'Identity' },
    { id: 'ff-ssn',       label: 'SSN / SIN',      type: 'ssn',      required: true,  section: 'Identity', helper: 'Stored encrypted at rest. Display masked.' },
    // Contact
    { id: 'ff-email',     label: 'Email',          type: 'email',    required: true,  section: 'Contact' },
    { id: 'ff-phone',     label: 'Primary Phone',  type: 'phone',    required: true,  section: 'Contact' },
    { id: 'ff-cell',      label: 'Cell Phone',     type: 'phone',    required: false, section: 'Contact' },
    // Address
    { id: 'ff-street',    label: 'Street Address', type: 'address',  required: true,  section: 'Address' },
    { id: 'ff-city',      label: 'City',           type: 'text',     required: true,  section: 'Address' },
    { id: 'ff-state',     label: 'State / Province', type: 'select', required: true,  section: 'Address', options: ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'] },
    { id: 'ff-zip',       label: 'Zip / Postal',   type: 'text',     required: true,  section: 'Address' },
    { id: 'ff-country',   label: 'Country',        type: 'select',   required: false, section: 'Address', options: ['USA', 'Canada', 'Mexico'] },
    // Employment
    { id: 'ff-position',  label: 'Position Applying For', type: 'select', required: true,  section: 'Employment', options: ['OTR Driver', 'Regional Driver', 'Local Driver', 'Owner-Operator', 'Mechanic'] },
    { id: 'ff-eligible',  label: 'Legally eligible for US employment?', type: 'select', required: true, section: 'Employment', options: ['Yes', 'No'] },
    { id: 'ff-twic',      label: 'Hold a current TWIC card?',          type: 'select', required: false, section: 'Employment', options: ['Yes', 'No'] },
    // Driving experience
    { id: 'ff-cdl-class', label: 'CDL Class', type: 'select', required: true, section: 'Driving Experience', options: ['CDL-A', 'CDL-B', 'CDL', 'Non-CDL'] },
    { id: 'ff-years-exp', label: 'Years of CMV experience', type: 'text', required: true, section: 'Driving Experience' },
];

// Owner-Operator adds equipment-specific fields.
const OWNER_OP_FORM_FIELDS: TemplateFormField[] = [
    ...DEFAULT_FORM_FIELDS,
    { id: 'ff-tractor-vin',   label: 'Tractor VIN',       type: 'text', required: true, section: 'Driving Experience' },
    { id: 'ff-tractor-year',  label: 'Tractor Year',      type: 'text', required: true, section: 'Driving Experience' },
    { id: 'ff-tractor-make',  label: 'Tractor Make',      type: 'text', required: true, section: 'Driving Experience' },
    { id: 'ff-tractor-model', label: 'Tractor Model',     type: 'text', required: true, section: 'Driving Experience' },
    { id: 'ff-trailer-type',  label: 'Trailer Type',      type: 'select', required: false, section: 'Driving Experience', options: ['Dry Van','Reefer','Flatbed','Tanker','Step Deck','Lowboy','Other'] },
];

// ── Default DOT CDL template (full / strict) ─────────────────────────────

export const DEFAULT_TEMPLATE: HiringTemplate = {
    id: 'tpl-default-cdl',
    name: 'Default DOT CDL Hiring Path',
    description: 'Full DOT-compliant pipeline with every standard consent, screening order, and document slot. Applies to CDL-A / CDL-B / CDL when no narrower template matches.',
    appliesToLicense: 'all',
    isDefault: true,
    updatedAt: '2026-05-15',
    updatedBy: 'Account Admin',
    formFields: DEFAULT_FORM_FIELDS,
    steps: [
        {
            ...stub('application_review'),
            instruction: 'Review every required field; flag placeholder data; capture every consent on this step. Collect identity photos and the master application PDF.',
            consents: [
                { consentId: 'fcra_disclosure',      mode: 'required' },
                { consentId: 'driver_certification', mode: 'required' },
            ],
            documents: [
                { id: 'doc-app-pdf',     label: 'Driver Application PDF',  category: 'Application', mode: 'required',    source: 'Applicant', helper: 'Auto-generated from the application form on submit.', requiresSignature: true },
                { id: 'doc-headshot',    label: 'Applicant Photo',          category: 'Photo',       mode: 'required',    source: 'Applicant', isPhoto: true, helper: 'Front-facing headshot used for the driver profile.' },
                { id: 'doc-cdl-front',   label: 'CDL Front',                category: 'Identity',    mode: 'required',    source: 'Applicant', isPhoto: true },
                { id: 'doc-cdl-back',    label: 'CDL Back',                 category: 'Identity',    mode: 'required',    source: 'Applicant', isPhoto: true },
                { id: 'doc-ssn-card',    label: 'SSN Card',                 category: 'Identity',    mode: 'optional',    source: 'Applicant', isPhoto: true },
                { id: 'doc-birth-cert',  label: 'Birth Certificate',        category: 'Identity',    mode: 'conditional', source: 'Applicant', condition: 'Required when SSN card not provided.' },
                { id: 'doc-twic',        label: 'TWIC Card',                category: 'Identity',    mode: 'conditional', source: 'Applicant', condition: 'Required only for port-access positions.' },
                { id: 'doc-resume',      label: 'Resume / CV',              category: 'Application', mode: 'optional',    source: 'Applicant' },
            ],
            bookings: [],
        },
        {
            ...stub('psp'),
            instruction: 'Run PSP query through the FMCSA-authorized vendor. Attach the result PDF before completing the step.',
            consents: [
                { consentId: 'psp_disclosure', mode: 'required' },
            ],
            documents: [
                { id: 'doc-psp-report', label: 'PSP Report PDF', category: 'PSP', mode: 'required', source: 'Vendor', helper: 'Returned by the PSP vendor — attach when the order completes.' },
            ],
            bookings: [],
        },
        {
            ...stub('mvr'),
            instruction: 'Order MVR through Samba (or equivalent). Review for serious violations before clearing the step.',
            consents: [
                { consentId: 'mvr_release', mode: 'required' },
            ],
            documents: [
                { id: 'doc-mvr-report',  label: 'MVR Report PDF', category: 'MVR', mode: 'required', source: 'Vendor' },
                { id: 'doc-mvr-summary', label: 'Reviewer Summary Note', category: 'MVR', mode: 'optional', source: 'Recruiter' },
            ],
            bookings: [],
        },
        {
            ...stub('criminal_background'),
            instruction: 'Order through Checkr (or equivalent). Review reportable records against the company\'s exclusion matrix.',
            consents: [
                { consentId: 'background_check', mode: 'required' },
            ],
            documents: [
                { id: 'doc-bg-report', label: 'Background Check Report PDF', category: 'Background', mode: 'required', source: 'Vendor' },
            ],
            bookings: [
                { id: 'bk-fingerprint', label: 'Fingerprinting Appointment', type: 'fingerprinting', mode: 'conditional', helper: 'Required for jurisdictions that mandate Live Scan.', venue: 'IdentoGO partner site nearest applicant ZIP', notes: 'Schedule within 5 business days of consent signature.' },
            ],
        },
        {
            ...stub('substance_testing'),
            instruction: 'Confirm DOT vs NON-DOT before scheduling. Book the lab appointment and attach the result + clearinghouse query when they return.',
            consents: [
                { consentId: 'pre_employment_drug',  mode: 'required' },
                { consentId: 'clearinghouse_query',  mode: 'required' },
            ],
            documents: [
                { id: 'doc-st-order',  label: 'Substance Test Order PDF',   category: 'Substance', mode: 'required', source: 'Recruiter' },
                { id: 'doc-st-result', label: 'Substance Test Result PDF',  category: 'Substance', mode: 'required', source: 'Vendor', helper: 'Attach the lab result when it returns from Quest / LabCorp.' },
                { id: 'doc-ch-query',  label: 'Clearinghouse Query Result', category: 'Substance', mode: 'required', source: 'Vendor' },
            ],
            bookings: [
                { id: 'bk-st-appt',     label: 'Book Substance Test',         type: 'substance_test', mode: 'required', helper: 'Pick clinic + 4-hour window. Driver receives an SMS confirmation.', venue: 'Concentra / Quest Diagnostics' },
                { id: 'bk-dot-physical', label: 'Book DOT Physical Exam',     type: 'dot_physical',   mode: 'required', helper: 'Required by FMCSR § 391.41. Medical certificate uploaded to DOT Verification step.', venue: 'Certified Medical Examiner — NRCME registry' },
            ],
        },
        {
            ...stub('dot_employment_verification'),
            instruction: '3-year DOT employment + safety performance history. Document every prior employer\'s response (or non-response).',
            consents: [
                { consentId: 'safety_performance', mode: 'required' },
            ],
            documents: [
                { id: 'doc-empv-pkg', label: 'Employment Verification Package', category: 'DOT',     mode: 'required', source: 'Recruiter' },
                { id: 'doc-empv-mc',  label: 'Medical Certificate',             category: 'Medical', mode: 'required', source: 'Applicant', isPhoto: true, helper: 'Image of the valid med-cert card.' },
            ],
            bookings: [
                { id: 'bk-road-test',   label: 'Schedule Road Test',          type: 'road_test',     mode: 'required', helper: 'FMCSR § 391.31 road test before offer extends.', venue: 'Company terminal yard' },
            ],
        },
        {
            ...stub('decision'),
            instruction: 'Resolve every Critical alert before Hired can be saved. Generate the offer letter and book orientation.',
            documents: [
                { id: 'doc-offer-letter', label: 'Offer Letter', category: 'Other', mode: 'conditional', source: 'Recruiter', condition: 'Generated only when status = Hired.', requiresSignature: true },
            ],
            bookings: [
                { id: 'bk-orientation', label: 'Schedule Orientation',         type: 'orientation',   mode: 'required', helper: '2-day onboarding session. Triggers employee profile creation.', venue: 'Company terminal — Aberdeen training room' },
            ],
        },
    ],
};

// ── Non-CDL local-driver template (lighter / no PSP) ─────────────────────

export const NON_CDL_TEMPLATE: HiringTemplate = {
    id: 'tpl-non-cdl',
    name: 'Non-CDL Local Driver',
    description: 'Light-duty, intrastate-only roles. Skips PSP, runs a simplified substance test, and drops the road test.',
    appliesToLicense: 'Non-CDL',
    isDefault: false,
    updatedAt: '2026-05-15',
    updatedBy: 'Account Admin',
    formFields: DEFAULT_FORM_FIELDS.filter(f => !['ff-cdl-class', 'ff-twic'].includes(f.id)),
    steps: [
        {
            ...stub('application_review'),
            consents: [{ consentId: 'fcra_disclosure', mode: 'required' }, { consentId: 'driver_certification', mode: 'required' }],
            documents: [
                { id: 'doc-app-pdf',  label: 'Driver Application PDF', category: 'Application', mode: 'required', source: 'Applicant', requiresSignature: true },
                { id: 'doc-headshot', label: 'Applicant Photo',         category: 'Photo',       mode: 'required', source: 'Applicant', isPhoto: true },
                { id: 'doc-dl-front', label: 'Driver License Front',    category: 'Identity',    mode: 'required', source: 'Applicant', isPhoto: true },
                { id: 'doc-dl-back',  label: 'Driver License Back',     category: 'Identity',    mode: 'required', source: 'Applicant', isPhoto: true },
            ],
        },
        { ...stub('psp'), enabled: false },
        {
            ...stub('mvr'),
            consents: [{ consentId: 'mvr_release', mode: 'required' }],
            documents: [{ id: 'doc-mvr-report', label: 'MVR Report PDF', category: 'MVR', mode: 'required', source: 'Vendor' }],
        },
        {
            ...stub('criminal_background'),
            consents: [{ consentId: 'background_check', mode: 'required' }],
            documents: [{ id: 'doc-bg-report', label: 'Background Check Report PDF', category: 'Background', mode: 'required', source: 'Vendor' }],
        },
        {
            ...stub('substance_testing'),
            consents: [{ consentId: 'pre_employment_drug', mode: 'required' }],
            documents: [{ id: 'doc-st-result', label: 'Substance Test Result PDF', category: 'Substance', mode: 'required', source: 'Vendor' }],
            bookings: [{ id: 'bk-st-appt', label: 'Book Substance Test', type: 'substance_test', mode: 'required', venue: 'Concentra' }],
        },
        { ...stub('dot_employment_verification'), enabled: false },
        {
            ...stub('decision'),
            documents: [{ id: 'doc-offer-letter', label: 'Offer Letter', category: 'Other', mode: 'conditional', source: 'Recruiter', condition: 'Generated only when status = Hired.', requiresSignature: true }],
            bookings: [{ id: 'bk-orientation', label: 'Schedule Orientation', type: 'orientation', mode: 'required', helper: '1-day onboarding session.' }],
        },
    ],
};

// ── Owner-Operator template ──────────────────────────────────────────────

export const OWNER_OP_TEMPLATE: HiringTemplate = {
    id: 'tpl-owner-op',
    name: 'Owner / Operator Onboarding',
    description: 'Contractor lease — adds tractor / trailer paperwork, insurance, and lease-agreement signing.',
    appliesToLicense: 'CDL-A',
    isDefault: false,
    updatedAt: '2026-05-15',
    updatedBy: 'Account Admin',
    formFields: OWNER_OP_FORM_FIELDS,
    steps: DEFAULT_TEMPLATE.steps.map(s => {
        if (s.stepId === 'application_review') {
            return {
                ...s,
                documents: [
                    ...s.documents,
                    { id: 'doc-truck-photo', label: 'Tractor Photo',  category: 'Photo',     mode: 'required', source: 'Applicant', isPhoto: true },
                    { id: 'doc-trailer-photo', label: 'Trailer Photo', category: 'Photo',     mode: 'optional', source: 'Applicant', isPhoto: true },
                    { id: 'doc-vin-doc',    label: 'Vehicle Registration', category: 'Identity', mode: 'required', source: 'Applicant' },
                    { id: 'doc-insurance',  label: 'Bobtail / Cargo Insurance', category: 'Insurance', mode: 'required', source: 'Applicant', helper: 'Proof of insurance with minimum coverage per company policy.' },
                    { id: 'doc-lease',      label: 'Lease Agreement', category: 'Other', mode: 'required', source: 'Recruiter', requiresSignature: true },
                ],
            };
        }
        return s;
    }),
};

// ── Quick-Hire template ──────────────────────────────────────────────────

export const QUICK_HIRE_TEMPLATE: HiringTemplate = {
    id: 'tpl-quick-hire',
    name: 'Quick-Hire (Rehire / Expedited)',
    description: 'Streamlined path for rehires within their DOT-eligibility window. Skips PSP + employment-verification packages.',
    appliesToLicense: 'all',
    isDefault: false,
    updatedAt: '2026-05-15',
    updatedBy: 'Account Admin',
    formFields: DEFAULT_FORM_FIELDS,
    steps: DEFAULT_TEMPLATE.steps.map(s => {
        if (s.stepId === 'psp') return { ...s, enabled: false };
        if (s.stepId === 'dot_employment_verification') return { ...s, enabled: false };
        return s;
    }),
};

export const ALL_TEMPLATES: HiringTemplate[] = [
    DEFAULT_TEMPLATE,
    NON_CDL_TEMPLATE,
    OWNER_OP_TEMPLATE,
    QUICK_HIRE_TEMPLATE,
];

export const TEMPLATE_BY_ID: Record<string, HiringTemplate> = Object.fromEntries(
    ALL_TEMPLATES.map(t => [t.id, t]),
);

// ── Booking-type display metadata ────────────────────────────────────────

export const BOOKING_TYPE_META: Record<BookingSlot['type'], { label: string; description: string }> = {
    substance_test:  { label: 'Substance Test',  description: 'Lab appointment for DOT or NON-DOT testing.' },
    dot_physical:    { label: 'DOT Physical',    description: 'Medical examination by a certified examiner.' },
    road_test:       { label: 'Road Test',       description: 'In-cab road test per FMCSR § 391.31.' },
    orientation:     { label: 'Orientation',     description: 'New-hire onboarding session.' },
    fingerprinting:  { label: 'Fingerprinting',  description: 'Live Scan or ink fingerprints for background.' },
    other:           { label: 'Other Appointment', description: 'Custom appointment.' },
};
