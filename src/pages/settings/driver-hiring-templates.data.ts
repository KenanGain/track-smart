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

const STORAGE_KEY = "ats:driver-hiring-templates-v4";
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

/** Seed: one canonical "full DOT pipeline" template walking through every
 *  built-in application form in the natural hiring order. */
function seedTemplates(): DriverHiringTemplate[] {
    const order = [
        'form-applicant-information',
        'form-address-details',
        'form-license-details',
        'form-license-disqualification',
        'form-accident-details',
        'form-violation-details',
        'form-medical-details',
        'form-driving-experience',
        'form-employment-details',
        'form-education-details',
        'form-cross-border-details',
        'form-additional-details',
        'form-acknowledgment',
    ];
    const allConsents = [
        'fcra_disclosure',
        'driver_certification',
        'pre_employment_drug',
        'mvr_release',
        'psp_disclosure',
        'clearinghouse_query',
        'background_check',
        'safety_performance',
    ];

    return [
        {
            id: "tpl-default-consents",
            name: "Default Consent Pipeline",
            description: "Every built-in consent disclosure the applicant must sign — FCRA, MVR Release, PSP, Clearinghouse, Background Check, and more.",
            formType: 'hiring-driver',
            isDefault: true,
            steps: allConsents.map(cid => ({
                id: `step-${uid()}`, kind: 'consent' as StepKind, formId: cid, required: true,
            })),
            updatedAt: today(),
        },
        {
            id: "tpl-default-application",
            name: "Default Application Pipeline",
            description: "Every built-in application form the applicant fills out — identity, license, medical, accidents, violations, employment, education, acknowledgment.",
            formType: 'hiring-driver',
            isDefault: true,
            steps: order.map(fid => ({
                id: `step-${uid()}`, kind: 'form' as StepKind, formId: fid, required: true,
            })),
            updatedAt: today(),
        },
    ];
}

export function loadTemplates(): DriverHiringTemplate[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as DriverHiringTemplate[];
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
