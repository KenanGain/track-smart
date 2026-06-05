// Compliance review forms — the back-office hiring-pipeline forms (PSP, MVR/Abstract,
// Criminal Background, Substance/DOT Drug & Alcohol, FMCSA Clearinghouse, Employment
// Safety Verification, and the final Hiring Decision). These are seeded into the
// Docu/Form Generator alongside the applicant forms and reference the compliance PDF
// document types defined in document-types.data.ts.
//
// Each form is organised into labelled sections (heading fields), pairs short fields
// half-width, captures a workflow Status, and uses proper country / state dropdowns +
// document-upload fields (which carry their own issue country/state/date/expiry config).

import { STATES_PROVINCES, COUNTRY_OPTIONS } from './application-forms.data';
import type { ApplicationFormDef, FormField, FormFieldType } from './application-forms.data';

const today = (): string => new Date().toISOString().slice(0, 10);

/* ── compact field builders ─────────────────────────────────────────────── */
function mk(id: string, type: FormFieldType, label: string, extra: Partial<FormField> = {}): FormField {
    return { id, type, label, required: false, instruction: '', options: [], ...extra };
}
const heading = (id: string, label: string, instruction = '') => mk(id, 'heading', label, { instruction });
const text = (id: string, label: string, extra: Partial<FormField> = {}) => mk(id, 'text', label, extra);
const date = (id: string, label: string, extra: Partial<FormField> = {}) => mk(id, 'date', label, extra);
const num = (id: string, label: string, extra: Partial<FormField> = {}) => mk(id, 'number', label, extra);
const toggle = (id: string, label: string, extra: Partial<FormField> = {}) => mk(id, 'toggle', label, extra);
const select = (id: string, label: string, options: string[], extra: Partial<FormField> = {}) => mk(id, 'select', label, { options, ...extra });
const stateSel = (id: string, label = 'State / Province', extra: Partial<FormField> = {}) => mk(id, 'select', label, { options: STATES_PROVINCES, ...extra });
const countrySel = (id: string, label = 'Country', extra: Partial<FormField> = {}) => mk(id, 'select', label, { options: COUNTRY_OPTIONS, ...extra });
const docf = (id: string, label: string, documentTypeId: string, extra: Partial<FormField> = {}) => mk(id, 'document', label, { documentTypeId, ...extra });
const H = { width: 'half' as const };

function form(id: string, name: string, description: string, introText: string, fields: FormField[]): ApplicationFormDef {
    return {
        id, kind: 'custom', name, displayTitle: name, description, introText,
        fields, documents: [], isDefault: true, isSubform: false, updatedAt: today(),
    };
}

/** The seven compliance review forms, in pipeline order. */
export function complianceReviewForms(): ApplicationFormDef[] {
    return [
        /* 1 — PSP Review */
        form('form-psp-review', 'PSP Review',
            'Pre-Employment Screening Program — 5-year crash and 3-year inspection history review.',
            'Driver & license details come from the application (captured once). PSP requires driver authorization before access — capture consent, query details, the report summary, and the decision.',
            [
                heading('h-psp-status', 'Review Status'),
                select('f-psp-status', 'PSP Status', ['Pending Consent', 'Consent Received', 'PSP Ordered', 'PSP Received', 'Under Review', 'Passed', 'Needs Review', 'Failed'], H),
                heading('h-psp-consent', 'Consent'),
                toggle('f-psp-consent-signed', 'PSP consent signed?'),
                date('f-psp-consent-date', 'Consent Signed Date', { ...H, showWhen: { fieldId: 'f-psp-consent-signed', equals: true } }),
                docf('f-psp-consent-doc', 'PSP Disclosure & Authorization PDF', 'dt-psp-auth', { required: true }),
                heading('h-psp-query', 'Query Information'),
                date('f-psp-requested', 'PSP Requested Date', H),
                date('f-psp-received', 'PSP Report Received Date', H),
                text('f-psp-ref', 'PSP Internal Reference Number', H),
                heading('h-psp-summary', 'Report Summary'),
                num('f-psp-crash', 'Crash Count', H),
                num('f-psp-insp', 'Inspection Count', H),
                num('f-psp-oos', 'Out-of-Service Count', H),
                toggle('f-psp-violations', 'Violations found?'),
                heading('h-psp-review', 'Review'),
                select('f-psp-risk', 'Risk Level', ['Low', 'Medium', 'High'], H),
                text('f-psp-reviewer', 'Reviewer Name', H),
                date('f-psp-review-date', 'Review Date', H),
                select('f-psp-decision', 'Decision', ['Passed', 'Needs Review', 'Failed'], H),
                heading('h-psp-docs', 'Documents'),
                docf('f-psp-report-doc', 'PSP Report PDF', 'dt-psp', { required: true }),
                docf('f-psp-notes-doc', 'PSP Review Notes PDF', 'dt-psp-review-notes'),
            ]),

        /* 2 — MVR / Driver Abstract Review */
        form('form-mvr-review', 'MVR / Driver Abstract Review',
            'US MVR, Canadian driver abstract, Ontario CVOR abstract and other provincial records. Annual review at least every 12 months for DOT.',
            'License details come from the application (captured once). Capture the ordered record and period, the record result, and the annual review outcome.',
            [
                heading('h-mvr-status', 'Review Status'),
                select('f-mvr-status', 'Status', ['Consent Needed', 'Ordered', 'Received', 'Reviewed', 'Passed', 'Needs Review', 'Failed', 'Annual Review Due'], H),
                date('f-mvr-med-due', 'Medical Certificate Expiry / Due', H),
                heading('h-mvr-order', 'MVR / Abstract Order'),
                date('f-mvr-requested', 'Requested Date', H),
                date('f-mvr-received', 'Report Received Date', H),
                text('f-mvr-agency', 'Issuing Agency', H),
                select('f-mvr-period', 'Report Period', ['3-year', '5-year', '10-year', 'Custom'], H),
                heading('h-mvr-result', 'Record Result'),
                select('f-mvr-license-status', 'Current License Status', ['Valid', 'Suspended', 'Revoked', 'Expired', 'Disqualified'], H),
                num('f-mvr-suspensions', 'Suspensions', H),
                num('f-mvr-convictions', 'Convictions', H),
                num('f-mvr-collisions', 'Collisions', H),
                num('f-mvr-demerits', 'Demerit Points', H),
                num('f-mvr-disqualifications', 'Disqualifications', H),
                heading('h-mvr-review', 'Review'),
                toggle('f-mvr-meets', 'Meets company criteria?'),
                text('f-mvr-reviewer', 'Reviewer', H),
                date('f-mvr-review-date', 'Review Date', H),
                date('f-mvr-next-review', 'Next Annual Review Due', H),
                heading('h-mvr-docs', 'Documents'),
                docf('f-mvr-auth-doc', 'MVR / Abstract Authorization', 'dt-mvr-auth', { required: true }),
                docf('f-mvr-mvr-doc', 'MVR / State Driving Record', 'dt-mvr'),
                docf('f-mvr-abstract-doc', 'Provincial Driver Abstract', 'dt-abstract'),
                docf('f-mvr-cvor-doc', 'CVOR Driver Abstract', 'dt-cvor'),
                docf('f-mvr-annual-doc', 'Annual MVR Review PDF', 'dt-annual-mvr'),
            ]),

        /* 3 — Criminal Background Check */
        form('form-criminal-background', 'Criminal Background Check',
            'Criminal record screening per company policy and jurisdiction. Contains sensitive personal information — kept separate from PSP/MVR.',
            'Role-based access applies: applicant sees status only; recruiter sees status + missing items; safety/compliance sees the report summary; admin/legal sees the full PDF.',
            [
                heading('h-bgc-status', 'Result & Status'),
                select('f-bgc-result', 'Result', ['Clear', 'Record Found', 'Pending', 'Unable to Verify', 'Needs Review'], H),
                select('f-bgc-adjudication', 'Adjudication', ['Approved', 'Conditional', 'Rejected', 'Escalated'], H),
                heading('h-bgc-consent', 'Consent'),
                toggle('f-bgc-consent-signed', 'Background check consent signed?'),
                date('f-bgc-consent-date', 'Consent Signed Date', { ...H, showWhen: { fieldId: 'f-bgc-consent-signed', equals: true } }),
                docf('f-bgc-consent-doc', 'Background Check Consent PDF', 'dt-bgc-consent', { required: true }),
                heading('h-bgc-identity', 'Identity Check'),
                select('f-bgc-id-type', 'ID Type', ['Driver License', 'Passport', 'PR Card', 'State / Provincial ID', 'Other'], H),
                toggle('f-bgc-id-verified', 'ID verified?'),
                text('f-bgc-verified-by', 'Verified By', H),
                heading('h-bgc-scope', 'Search Scope'),
                countrySel('f-bgc-country', 'Country', H),
                stateSel('f-bgc-state', 'State / Province', H),
                text('f-bgc-county', 'County / City (if applicable)', H),
                heading('h-bgc-vendor', 'Vendor'),
                text('f-bgc-provider', 'Background Check Provider', H),
                text('f-bgc-ref', 'Reference Number', H),
                heading('h-bgc-review', 'Review'),
                text('f-bgc-reviewer', 'Reviewer', H),
                date('f-bgc-review-date', 'Review Date', H),
                text('f-bgc-reason-code', 'Reason Code', H),
                mk('f-bgc-notes', 'textarea', 'Notes'),
                heading('h-bgc-docs', 'Documents'),
                docf('f-bgc-report-doc', 'Criminal Background Report', 'dt-bgc-report', { required: true }),
                docf('f-bgc-adjudication-doc', 'Adjudication / Decision Summary', 'dt-bgc-adjudication'),
            ]),

        /* 4 — Substance / DOT Drug & Alcohol Testing */
        form('form-substance-testing', 'Substance / DOT Drug & Alcohol Testing',
            'US DOT/FMCSA drivers and Canadian drivers operating into the US under FMCSA rules. A driver cannot perform safety-sensitive work until a verified negative result is received (unless an exception applies).',
            'Canada-only testing is privacy and human-rights sensitive — random testing is limited to specific circumstances.',
            [
                heading('h-sub-status', 'Status'),
                select('f-sub-status', 'Status', ['Policy Signed', 'Test Ordered', 'Collection Complete', 'MRO Pending', 'Result Received', 'Cleared', 'Not Cleared', 'Needs Review'], H),
                heading('h-sub-program', 'Program'),
                select('f-sub-program', 'Program Type', ['DOT / FMCSA', 'Non-DOT company policy', 'Canada-only policy'], H),
                select('f-sub-category', 'Driver Category', ['US CDL', 'Canadian cross-border', 'Canada-only'], H),
                select('f-sub-reason', 'Test Reason', ['Pre-employment', 'Random', 'Post-accident', 'Reasonable suspicion', 'Return-to-duty', 'Follow-up'], H),
                heading('h-sub-order', 'Order Information'),
                date('f-sub-ordered', 'Test Ordered Date', H),
                text('f-sub-site', 'Collection Site', H),
                text('f-sub-ctpa', 'C / TPA', H),
                text('f-sub-lab', 'Lab / Vendor', H),
                text('f-sub-mro', 'MRO', H),
                heading('h-sub-result', 'Result Information'),
                date('f-sub-collection', 'Collection Date', H),
                date('f-sub-received', 'Result Received Date', H),
                select('f-sub-result', 'Final Result Status', ['Pending', 'Verified Negative', 'Canceled', 'Refusal', 'Positive', 'Needs Review'], H),
                toggle('f-sub-can-work', 'Can perform safety-sensitive work?'),
                heading('h-sub-ch', 'Clearinghouse'),
                toggle('f-sub-ch-done', 'Clearinghouse query completed?'),
                date('f-sub-ch-date', 'Query Date', { ...H, showWhen: { fieldId: 'f-sub-ch-done', equals: true } }),
                text('f-sub-ch-status', 'Clearinghouse Status', { ...H, showWhen: { fieldId: 'f-sub-ch-done', equals: true } }),
                heading('h-sub-docs', 'Documents'),
                docf('f-sub-policy-doc', 'Drug/Alcohol Testing Policy Acknowledgment', 'dt-da-policy', { required: true }),
                docf('f-sub-order-doc', 'Test Order / Authorization', 'dt-da-order', { required: true }),
                docf('f-sub-ccf-doc', 'Federal Drug Testing Custody and Control Form (DOT)', 'dt-da-ccf'),
                docf('f-sub-mro-doc', 'MRO Final Result (DOT)', 'dt-da-mro'),
                docf('f-sub-alcohol-doc', 'US DOT Alcohol Testing Form', 'dt-da-alcohol'),
                docf('f-sub-ch-doc', 'Clearinghouse Query Proof', 'dt-ch-result'),
            ]),

        /* 5 — FMCSA Clearinghouse Query */
        form('form-clearinghouse-query', 'FMCSA Clearinghouse Query',
            'A database query / status check (not the test result itself). Kept separate from substance testing.',
            'Driver / CDL details come from the application (captured once). Track limited vs full query, consent, query result, and the annual query schedule.',
            [
                heading('h-ch-status', 'Status'),
                select('f-ch-status', 'Status', ['No records', 'Prohibited', 'RTD in progress', 'Needs full query'], H),
                heading('h-ch-query', 'Query'),
                select('f-ch-type', 'Query Type', ['Limited query', 'Full query'], H),
                toggle('f-ch-consent', 'Consent received?'),
                date('f-ch-consent-date', 'Consent Date', { ...H, showWhen: { fieldId: 'f-ch-consent', equals: true } }),
                date('f-ch-query-date', 'Query Date', H),
                text('f-ch-result', 'Query Result', H),
                text('f-ch-ref', 'Query Reference', H),
                heading('h-ch-annual', 'Annual Tracking'),
                date('f-ch-last-query', 'Last Query Date', H),
                date('f-ch-next-query', 'Next Annual Query Due', H),
                heading('h-ch-docs', 'Documents'),
                docf('f-ch-limited-consent-doc', 'Limited Query Consent', 'dt-ch-limited-consent', { required: true }),
                docf('f-ch-full-consent-doc', 'Full Query Consent Proof', 'dt-ch-full-consent'),
                docf('f-ch-result-doc', 'Clearinghouse Query Result', 'dt-ch-result', { required: true }),
            ]),

        /* 6 — DOT / Employment Verification */
        form('form-employment-verification', 'DOT / Employment Verification',
            'FMCSA requires investigation of previous employers with written records of contacts or good-faith efforts (employer name/address, contact dates/attempts, and information received).',
            'Capture each previous employer, contact attempts, the response, and the safety / drug-alcohol history outcome.',
            [
                heading('h-ev-status', 'Status'),
                select('f-ev-status', 'Status', ['Verified', 'Unable to verify', 'Needs review'], H),
                heading('h-ev-employer', 'Previous Employer'),
                text('f-ev-company', 'Company Name', H),
                text('f-ev-phone', 'Phone', H),
                text('f-ev-address', 'Address'),
                text('f-ev-email', 'Email', H),
                heading('h-ev-period', 'Employment Period'),
                date('f-ev-start', 'Start Date', H),
                date('f-ev-end', 'End Date', H),
                text('f-ev-position', 'Position', H),
                toggle('f-ev-cmv', 'Operated CMV?'),
                select('f-ev-dot', 'DOT Regulated?', ['Yes', 'No', 'Unknown'], H),
                heading('h-ev-contact', 'Contact Attempts'),
                date('f-ev-attempt1', 'Attempt 1 Date', H),
                date('f-ev-attempt2', 'Attempt 2 Date', H),
                date('f-ev-attempt3', 'Attempt 3 Date', H),
                toggle('f-ev-response', 'Response received?'),
                date('f-ev-response-date', 'Response Date', { ...H, showWhen: { fieldId: 'f-ev-response', equals: true } }),
                heading('h-ev-safety', 'Safety & Drug/Alcohol History'),
                num('f-ev-accidents', 'Accidents', H),
                num('f-ev-violations', 'Violations', H),
                select('f-ev-rehire', 'Eligible for Rehire', ['Yes', 'No', 'Unknown'], H),
                toggle('f-ev-da-requested', 'DOT drug/alcohol violation info requested?'),
                heading('h-ev-docs', 'Documents'),
                docf('f-ev-consent-doc', 'Employment Verification Consent', 'dt-emp-verif-consent', { required: true }),
                docf('f-ev-sphr-doc', 'Safety Performance History Records Request', 'dt-sphr-request', { required: true }),
                docf('f-ev-response-doc', 'Employer Response PDF', 'dt-emp-response'),
                docf('f-ev-goodfaith-doc', 'Good-Faith Attempt Log', 'dt-goodfaith-log'),
            ]),
    ];
}

/** Ids of the compliance review forms — used to flag them as built-in defaults. */
export const COMPLIANCE_REVIEW_FORM_IDS = [
    'form-psp-review', 'form-mvr-review', 'form-criminal-background', 'form-substance-testing',
    'form-clearinghouse-query', 'form-employment-verification',
];
