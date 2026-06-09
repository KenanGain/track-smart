// Driver hiring templates — admin-built workflows that chain Application
// Forms together as ordered steps. Each step references a form in the
// Application Forms library (managed under Docu/Form Generator).
//
// Stored in localStorage. Seeded with one default template that walks the
// applicant through every built-in application form in a sensible order.

import { uid } from "@/pages/ats/driver-application.data";

/** A template step can reference either an Application Form (default) or a Consent Form. */
export type StepKind = 'form' | 'consent';

export interface TemplateStep {
    id: string;
    /** What this step references — defaults to 'form' for backwards-compat with v1 data. */
    kind?: StepKind;
    /** Reference id — for `kind === 'form'` this is an Application Form id, for
     *  `kind === 'consent'` this is a ConsentCategory id. The field name stays
     *  `formId` for backwards-compat with saved data. */
    formId: string;
    /** Optional per-template label override (defaults to the form / consent name). */
    label?: string;
    /** Whether this step must be completed to advance. */
    required: boolean;
    /** Optional helper text shown to the applicant under the step header. */
    helperText?: string;
}

/** Supported template lines of work. `hiring-driver` = the applicant-facing
 *  Driver Application forms; `hiring-ats` = the post-application ATS pipeline. */
export type TemplateFormType = 'hiring-driver' | 'hiring-ats';

export const TEMPLATE_FORM_TYPES: { id: TemplateFormType; label: string }[] = [
    { id: 'hiring-driver', label: 'Driver Application' },
    { id: 'hiring-ats', label: 'Hiring ATS' },
];

export interface DriverHiringTemplate {
    id: string;
    name: string;
    description: string;
    /** Which workflow this template belongs to. Filters the page. */
    formType: TemplateFormType;
    isDefault: boolean;
    steps: TemplateStep[];
    updatedAt: string;
}

const STORAGE_KEY = "ats:driver-hiring-templates-v6";
const today = (): string => new Date().toISOString().slice(0, 10);

export function newTemplate(formType: TemplateFormType = 'hiring-driver'): DriverHiringTemplate {
    return {
        id: `tpl-${uid()}`,
        name: "New Hiring Template",
        description: "",
        formType,
        isDefault: false,
        steps: [],
        updatedAt: today(),
    };
}

export function newStep(formId: string, kind: StepKind = 'form'): TemplateStep {
    return { id: `step-${uid()}`, kind, formId, required: true };
}

/* ── Master pipeline pieces — one source of truth the templates are built from ── */

/** Every applicant-facing application form, in order. Acknowledgment always closes a template. */
const APPLICATION_FORMS = [
    'form-applicant-information',
    'form-address-details',
    'form-license-details',
    'form-license-disqualification',
    'form-accident-details',
    'form-violation-details',
    'form-driving-experience',
    'form-employment-details',
    'form-education-details',
    'form-cross-border-details',
    'form-medical-details',
    'form-additional-details',
];

/** All built-in consent disclosures. */
const CONSENTS = [
    'fcra_disclosure',
    'driver_certification',
    'pre_employment_drug',
    'mvr_release',
    'psp_disclosure',
    'clearinghouse_query',
    'background_check',
    'safety_performance',
];

/** Back-office compliance review forms (admin / safety filled). */
const REVIEW_FORMS = [
    'form-psp-review',
    'form-mvr-review',
    'form-criminal-background',
    'form-substance-testing',
    'form-clearinghouse-query',
    'form-employment-verification',
];

/** All built-in template ids (current + retired) — used to re-seed built-ins on load
 *  while preserving the user's own custom templates. */
const BUILTIN_TEMPLATE_IDS = new Set([
    // current — Driver Application line of work
    'tpl-complete-hiring', 'tpl-all-forms', 'tpl-quick-hire', 'tpl-cdl-a-otr', 'tpl-cross-border',
    'tpl-owner-operator', 'tpl-local-regional', 'tpl-hazmat-tanker', 'tpl-non-cdl', 'tpl-rehire', 'tpl-seasonal',
    // current — Hiring ATS line of work
    'tpl-ats-us', 'tpl-ats-local', 'tpl-ats-canada', 'tpl-ats-cross-border',
    'tpl-ats-screening', 'tpl-ats-onboarding', 'tpl-ats-complete',
    // retired (pruned on load)
    'tpl-default-consents', 'tpl-default-application',
]);

function seedTemplates(): DriverHiringTemplate[] {
    const step = (kind: StepKind, formId: string, required = true): TemplateStep => ({
        id: `step-${uid()}`, kind, formId, required,
    });
    const forms = (ids: string[], required = true) => ids.map(id => step('form', id, required));
    const signs = (ids: string[]) => ids.map(id => step('consent', id));
    const ack = () => step('form', 'form-acknowledgment');

    const tpl = (
        id: string, name: string, description: string, isDefault: boolean, steps: TemplateStep[],
        formType: TemplateFormType = 'hiring-driver',
    ): DriverHiringTemplate => ({ id, name, description, formType, isDefault, steps, updatedAt: today() });

    // Post-application ATS pipeline forms (Hiring ATS line of work). The driver
    // application itself is the first step (invite → submit) handled by the
    // Driver Application flow, so the ATS pipeline starts at screening.
    // Post-application ATS forms after the Hiring-ATS consolidation (merged forms).
    const ATS_RECORD = 'form-ats-abstract';                 // Driver Record Review (Abstract / CVOR / MVR / Annual Review)
    const ATS_LICENSE = 'form-ats-license-compliance';       // License Compliance Certification
    const ATS_EMP = 'form-ats-employment-verification';      // Previous Employer & Safety History
    const ATS_DRUG_CONSENT = 'form-ats-drug-alcohol-consent';
    const ATS_DRUG = 'form-ats-drug-alcohol';               // Drug Testing Form
    const ATS_MEDICAL = 'form-ats-medical-declaration';
    const ATS_ONBOARDING = [
        'form-ats-road-test', 'form-ats-hiring-approval',
        'form-ats-orientation-quiz', 'form-ats-driver-daily-log',
        'form-ats-tdg-cert', 'form-ats-training-certificates', 'form-ats-training-ack',
        'form-ats-contracts',
    ];

    return [
        // ── DEFAULT (main, test this) — the complete driver hiring data set ──
        tpl('tpl-complete-hiring', 'Complete Driver Hiring',
            "The full driver hiring pipeline — every application form, all required consents, and the back-office compliance reviews (PSP, MVR, Background, Substance, Clearinghouse, Employment). Assign this to capture a driver's entire application.",
            true,
            [...forms(APPLICATION_FORMS), ...signs(CONSENTS), ...forms(REVIEW_FORMS, false), ack()]),

        // ── Just the application forms (no consents / reviews) ──
        tpl('tpl-all-forms', 'Driver Application — All Forms',
            "Every applicant-facing application form, start to finish — identity, address, license, driving history, employment, education, cross-border, medical, and declarations. No consents or back-office reviews.",
            false,
            [...forms(APPLICATION_FORMS), ack()]),

        // ── Short pipeline for fast hiring ──
        tpl('tpl-quick-hire', 'Quick Hire',
            "Fast onboarding — identity, address, and license, plus the three time-sensitive consents (FCRA, MVR release, background check) and a signed acknowledgment.",
            false,
            [
                ...forms(['form-applicant-information', 'form-address-details', 'form-license-details']),
                ...signs(['fcra_disclosure', 'mvr_release', 'background_check']),
                ack(),
            ]),

        // ── Full DOT-compliant CDL-A over-the-road onboarding ──
        tpl('tpl-cdl-a-otr', 'CDL-A OTR Driver',
            "Full DOT-compliant onboarding for over-the-road CDL-A drivers — the complete application, every consent, and the full set of compliance reviews.",
            false,
            [...forms(APPLICATION_FORMS), ...signs(CONSENTS), ...forms(REVIEW_FORMS, false), ack()]),

        // ── Cross-border (US ↔ Canada) driver ──
        tpl('tpl-cross-border', 'Cross-Border Driver',
            "US ↔ Canada drivers — the full application (with cross-border eligibility), all consents, and the PSP / MVR / background reviews.",
            false,
            [
                ...forms(APPLICATION_FORMS),
                ...signs(CONSENTS),
                ...forms(['form-psp-review', 'form-mvr-review', 'form-criminal-background'], false),
                ack(),
            ]),

        // ── Owner-operator leasing on ──
        tpl('tpl-owner-operator', 'Owner-Operator',
            "Owner-operators leasing on — identity, address, license, driving history, employment, and declarations, plus FCRA, MVR, background, and pre-employment drug consents and the PSP / MVR reviews.",
            false,
            [
                ...forms(['form-applicant-information', 'form-address-details', 'form-license-details',
                    'form-driving-experience', 'form-employment-details', 'form-additional-details']),
                ...signs(['fcra_disclosure', 'mvr_release', 'background_check', 'pre_employment_drug']),
                ...forms(['form-psp-review', 'form-mvr-review'], false),
                ack(),
            ]),

        // ── Local / regional day-cab driver ──
        tpl('tpl-local-regional', 'Local / Regional Driver',
            "Day-cab local & regional drivers — identity, address, license, driving experience, and medical, with the core consents (FCRA, MVR release, background, drug) and an MVR review.",
            false,
            [
                ...forms(['form-applicant-information', 'form-address-details', 'form-license-details',
                    'form-driving-experience', 'form-medical-details']),
                ...signs(['fcra_disclosure', 'mvr_release', 'background_check', 'pre_employment_drug']),
                ...forms(['form-mvr-review'], false),
                ack(),
            ]),

        // ── Hazmat / tanker endorsement (background-heavy) ──
        tpl('tpl-hazmat-tanker', 'Hazmat / Tanker Endorsement',
            "Endorsement-heavy onboarding — the complete application plus every consent and the full PSP, MVR, background, and clearinghouse reviews required for hazmat & tanker operations.",
            false,
            [
                ...forms(APPLICATION_FORMS),
                ...signs(CONSENTS),
                ...forms(['form-psp-review', 'form-mvr-review', 'form-criminal-background', 'form-clearinghouse-query'], false),
                ack(),
            ]),

        // ── Non-CDL light-vehicle delivery driver ──
        tpl('tpl-non-cdl', 'Non-CDL Delivery Driver',
            "Light-vehicle / non-CDL delivery drivers — identity, address, license, driving experience, and medical, with FCRA, MVR release, and background consents and an MVR review.",
            false,
            [
                ...forms(['form-applicant-information', 'form-address-details', 'form-license-details',
                    'form-driving-experience', 'form-medical-details']),
                ...signs(['fcra_disclosure', 'mvr_release', 'background_check']),
                ...forms(['form-mvr-review'], false),
                ack(),
            ]),

        // ── Rehire / returning driver (short refresh) ──
        tpl('tpl-rehire', 'Rehire / Returning Driver',
            "Returning drivers we've employed before — a short refresh: identity, license, and medical, with driver certification, MVR release, and background consents plus an MVR review.",
            false,
            [
                ...forms(['form-applicant-information', 'form-license-details', 'form-medical-details']),
                ...signs(['driver_certification', 'mvr_release', 'background_check']),
                ...forms(['form-mvr-review'], false),
                ack(),
            ]),

        // ── Seasonal / temporary driver (minimal) ──
        tpl('tpl-seasonal', 'Seasonal / Temporary Driver',
            "Short-term seasonal drivers — identity, address, license, and medical, with FCRA and MVR-release consents and a quick MVR review.",
            false,
            [
                ...forms(['form-applicant-information', 'form-address-details', 'form-license-details', 'form-medical-details']),
                ...signs(['fcra_disclosure', 'mvr_release']),
                ...forms(['form-mvr-review'], false),
                ack(),
            ]),

        // ══ Hiring ATS pipelines (post-application) — per driver type ════════════
        // Review application first, then screening, then onboarding.
        tpl('tpl-ats-us', 'US Driver — Hiring ATS',
            'Post-application ATS pipeline for US drivers — driver record review, license compliance, previous-employer & safety history, drug/alcohol consent & testing, then onboarding (road test, hiring approval, HOS/DVIR knowledge, daily log, training & policy acknowledgements, contracts).',
            true,
            forms([ATS_RECORD, ATS_LICENSE, ATS_EMP, ATS_DRUG_CONSENT, ATS_DRUG, ...ATS_ONBOARDING]),
            'hiring-ats'),

        tpl('tpl-ats-local', 'Local / Domestic — Hiring ATS',
            'Post-application ATS pipeline for local / domestic drivers — driver record review, previous-employer & safety history, drug/alcohol screening, then onboarding.',
            false,
            forms([ATS_RECORD, ATS_EMP, ATS_DRUG_CONSENT, ATS_DRUG, ...ATS_ONBOARDING]),
            'hiring-ats'),

        tpl('tpl-ats-canada', 'Canada Driver — Hiring ATS',
            'Post-application ATS pipeline for Canada-based drivers — driver record review (CVOR / MVR), previous-employer & safety history, drug/alcohol screening, medical declaration, then onboarding.',
            false,
            forms([ATS_RECORD, ATS_LICENSE, ATS_EMP, ATS_DRUG_CONSENT, ATS_DRUG, ATS_MEDICAL, ...ATS_ONBOARDING]),
            'hiring-ats'),

        tpl('tpl-ats-cross-border', 'Cross-Border — Hiring ATS',
            'Post-application ATS pipeline for cross-border (US ↔ Canada) drivers — full screening, medical declaration, and onboarding.',
            false,
            forms([ATS_RECORD, ATS_LICENSE, ATS_EMP, ATS_DRUG_CONSENT, ATS_DRUG, ATS_MEDICAL, ...ATS_ONBOARDING]),
            'hiring-ats'),

        // ── Stage packages (mix & match) ──
        tpl('tpl-ats-screening', 'Screening Package — Hiring ATS',
            'Screening stage only — driver record review (abstract / CVOR / MVR + annual review), license compliance, previous employer & safety history, and drug/alcohol consent + testing.',
            false,
            forms([ATS_RECORD, ATS_LICENSE, ATS_EMP, ATS_DRUG_CONSENT, ATS_DRUG]),
            'hiring-ats'),

        tpl('tpl-ats-onboarding', 'Onboarding Package — Hiring ATS',
            'Onboarding stage only — road test, hiring approval, HOS/ELD/DVIR knowledge, daily log & HOS declaration, training & policy acknowledgements, TDG certificate, module certificates, and contracts.',
            false,
            forms([...ATS_ONBOARDING]),
            'hiring-ats'),

        tpl('tpl-ats-complete', 'Complete Hiring ATS',
            'The entire post-application pipeline — every consolidated hiring form from driver record review through screening, medical, onboarding, and policy acknowledgements.',
            false,
            forms([ATS_RECORD, ATS_LICENSE, ATS_EMP, ATS_DRUG_CONSENT, ATS_DRUG, ATS_MEDICAL, ...ATS_ONBOARDING]),
            'hiring-ats'),
    ];
}

export function loadTemplates(): DriverHiringTemplate[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) {
            const stored = parsed as DriverHiringTemplate[];
            // Built-in templates ALWAYS reflect the latest seed (so the cleaned-up set,
            // retired templates, and new forms take effect). The user's own custom
            // templates are preserved.
            const custom = stored.filter(t => !BUILTIN_TEMPLATE_IDS.has(t.id));
            return [...seedTemplates(), ...custom];
        }
    } catch {
        /* localStorage unavailable / corrupt — fall through to seed */
    }
    return seedTemplates();
}

export function saveTemplates(templates: DriverHiringTemplate[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {
        /* localStorage unavailable — ignore */
    }
}
