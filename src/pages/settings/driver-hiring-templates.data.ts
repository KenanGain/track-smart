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

/**
 * Seed: four templates illustrating the full data-model relationship:
 *   Document Types → Application Forms / Subforms → Templates.
 *
 *   • Two defaults (locked) — one all-consents pipeline and one all-forms pipeline.
 *   • Two non-default examples — a short "Quick Hire" and a full "CDL-A OTR"
 *     pipeline that interleaves forms and consents in a realistic hiring order.
 */
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

    const step = (kind: StepKind, formId: string, required = true): TemplateStep => ({
        id: `step-${uid()}`, kind, formId, required,
    });

    return [
        // ── Default: every consent ────────────────────────────────────
        {
            id: "tpl-default-consents",
            name: "Default Consent Pipeline",
            description: "Every built-in consent disclosure the applicant must sign — FCRA, MVR Release, PSP, Clearinghouse, Background Check, and more.",
            formType: 'hiring-driver',
            isDefault: true,
            steps: allConsents.map(cid => step('consent', cid)),
            updatedAt: today(),
        },

        // ── Default: every application form ───────────────────────────
        {
            id: "tpl-default-application",
            name: "Default Application Pipeline",
            description: "Every built-in application form the applicant fills out — identity, license, medical, accidents, violations, employment, education, acknowledgment.",
            formType: 'hiring-driver',
            isDefault: true,
            steps: order.map(fid => step('form', fid)),
            updatedAt: today(),
        },

        // ── Non-default: short pipeline for fast hiring ───────────────
        {
            id: "tpl-quick-hire",
            name: "Quick Hire Pipeline",
            description: "Minimal onboarding for short-term or contract drivers — just identity, address, license, plus the three legally-required consents (FCRA, MVR Release, Background Check) and a signed acknowledgment.",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                step('form',    'form-applicant-information'),
                step('form',    'form-address-details'),
                step('form',    'form-license-details'),
                step('consent', 'fcra_disclosure'),
                step('consent', 'mvr_release'),
                step('consent', 'background_check'),
                step('form',    'form-acknowledgment'),
            ],
            updatedAt: today(),
        },

        // ── Non-default: realistic CDL-A OTR onboarding ───────────────
        {
            id: "tpl-cdl-a-otr",
            name: "CDL-A OTR Driver Pipeline",
            description: "Full DOT-compliant onboarding for over-the-road CDL-A drivers — identity, full driving history, employment, all consents grouped before the medical and acknowledgment steps.",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                // Identity & contact
                step('form',    'form-applicant-information'),
                step('form',    'form-address-details'),
                // Driving credentials & history
                step('form',    'form-license-details'),
                step('form',    'form-license-disqualification'),
                step('form',    'form-accident-details'),
                step('form',    'form-violation-details'),
                step('form',    'form-driving-experience'),
                step('form',    'form-employment-details'),
                step('form',    'form-education-details'),
                step('form',    'form-cross-border-details'),
                // All required consents (signed in one sitting)
                step('consent', 'fcra_disclosure'),
                step('consent', 'driver_certification'),
                step('consent', 'pre_employment_drug'),
                step('consent', 'mvr_release'),
                step('consent', 'psp_disclosure'),
                step('consent', 'clearinghouse_query'),
                step('consent', 'background_check'),
                step('consent', 'safety_performance'),
                // Medical + closing
                step('form',    'form-medical-details'),
                step('form',    'form-additional-details'),
                step('form',    'form-acknowledgment'),
            ],
            updatedAt: today(),
        },

        // ── Non-default: owner-operator (lease-on) onboarding ─────────
        {
            id: "tpl-owner-operator",
            name: "Owner-Operator Lease-On Pipeline",
            description: "For owner-operators bringing their own truck under contract — full driving history and employment, with extra emphasis on vehicle/insurance documents collected via Additional Details.",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                step('form',    'form-applicant-information'),
                step('form',    'form-address-details'),
                step('form',    'form-license-details'),
                step('form',    'form-license-disqualification'),
                step('form',    'form-accident-details'),
                step('form',    'form-violation-details'),
                step('form',    'form-driving-experience'),
                step('form',    'form-employment-details'),
                // Vehicle & insurance docs collected here
                step('form',    'form-additional-details'),
                step('consent', 'fcra_disclosure'),
                step('consent', 'driver_certification'),
                step('consent', 'mvr_release'),
                step('consent', 'pre_employment_drug'),
                step('consent', 'background_check'),
                step('form',    'form-medical-details'),
                step('form',    'form-acknowledgment'),
            ],
            updatedAt: today(),
        },

        // ── Non-default: local / regional (short-haul) ────────────────
        {
            id: "tpl-local-regional",
            name: "Local / Regional Driver Pipeline",
            description: "Short-haul home-daily routes — applicant identity, license, recent employment, and the essential consents. Cross-border and education details skipped for faster turnaround.",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                step('form',    'form-applicant-information'),
                step('form',    'form-address-details'),
                step('form',    'form-license-details'),
                step('form',    'form-accident-details'),
                step('form',    'form-violation-details'),
                step('form',    'form-employment-details'),
                step('consent', 'fcra_disclosure'),
                step('consent', 'mvr_release'),
                step('consent', 'pre_employment_drug'),
                step('consent', 'background_check'),
                step('form',    'form-medical-details'),
                step('form',    'form-acknowledgment'),
            ],
            updatedAt: today(),
        },

        // ── Non-default: cross-border (US/Canada) driver ──────────────
        {
            id: "tpl-cross-border",
            name: "Cross-Border Driver Pipeline",
            description: "For drivers running US ↔ Canada freight — emphasises identity verification, cross-border eligibility (FAST/passport), and full driving history.",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                step('form',    'form-applicant-information'),
                step('form',    'form-address-details'),
                step('form',    'form-license-details'),
                step('form',    'form-license-disqualification'),
                step('form',    'form-accident-details'),
                step('form',    'form-violation-details'),
                step('form',    'form-driving-experience'),
                step('form',    'form-employment-details'),
                step('form',    'form-cross-border-details'),
                step('form',    'form-additional-details'),
                step('consent', 'fcra_disclosure'),
                step('consent', 'driver_certification'),
                step('consent', 'mvr_release'),
                step('consent', 'psp_disclosure'),
                step('consent', 'background_check'),
                step('form',    'form-medical-details'),
                step('form',    'form-acknowledgment'),
            ],
            updatedAt: today(),
        },

        // ── Non-default: hazmat / tanker endorsement driver ───────────
        {
            id: "tpl-hazmat-tanker",
            name: "Hazmat / Tanker Driver Pipeline",
            description: "Higher-scrutiny onboarding for hazmat-endorsed drivers — full driving history with mandatory PSP, Clearinghouse, and background check consents.",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                step('form',    'form-applicant-information'),
                step('form',    'form-address-details'),
                step('form',    'form-license-details'),
                step('form',    'form-license-disqualification'),
                step('form',    'form-accident-details'),
                step('form',    'form-violation-details'),
                step('form',    'form-driving-experience'),
                step('form',    'form-employment-details'),
                step('form',    'form-education-details'),
                step('consent', 'fcra_disclosure'),
                step('consent', 'driver_certification'),
                step('consent', 'pre_employment_drug'),
                step('consent', 'mvr_release'),
                step('consent', 'psp_disclosure'),
                step('consent', 'clearinghouse_query'),
                step('consent', 'background_check'),
                step('consent', 'safety_performance'),
                step('form',    'form-medical-details'),
                step('form',    'form-additional-details'),
                step('form',    'form-acknowledgment'),
            ],
            updatedAt: today(),
        },

        // ── Non-default: re-hire / returning driver ───────────────────
        {
            id: "tpl-rehire",
            name: "Driver Re-Hire Pipeline",
            description: "Abbreviated onboarding for returning drivers — refresh identity, license, recent driving record, and re-sign the time-sensitive consents (FCRA, MVR, drug screen).",
            formType: 'hiring-driver',
            isDefault: false,
            steps: [
                step('form',    'form-applicant-information'),
                step('form',    'form-license-details'),
                step('form',    'form-accident-details'),
                step('form',    'form-violation-details'),
                step('consent', 'fcra_disclosure'),
                step('consent', 'mvr_release'),
                step('consent', 'pre_employment_drug'),
                step('form',    'form-medical-details'),
                step('form',    'form-acknowledgment'),
            ],
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
