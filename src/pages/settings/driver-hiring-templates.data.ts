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

/** Currently the only supported form type — placeholder for future workflows
 *  (e.g. mechanic hiring, vendor onboarding). */
export type TemplateFormType = 'hiring-driver';

export const TEMPLATE_FORM_TYPES: { id: TemplateFormType; label: string }[] = [
    { id: 'hiring-driver', label: 'Hiring Driver' },
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
    // current
    'tpl-complete-hiring', 'tpl-all-forms', 'tpl-quick-hire', 'tpl-cdl-a-otr', 'tpl-cross-border',
    // retired (pruned on load)
    'tpl-default-consents', 'tpl-default-application', 'tpl-owner-operator',
    'tpl-local-regional', 'tpl-hazmat-tanker', 'tpl-rehire',
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
    ): DriverHiringTemplate => ({ id, name, description, formType: 'hiring-driver', isDefault, steps, updatedAt: today() });

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
