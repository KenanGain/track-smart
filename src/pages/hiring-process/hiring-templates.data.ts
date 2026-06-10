import { useEffect, useState } from "react";

// ── Hiring templates ────────────────────────────────────────────────────────
// A template is an ordered list of STEPS. Each step has a title and one OR MORE
// forms attached. Stored in localStorage with three locked, seeded defaults.

export type TemplateStep = { id: string; title: string; formIds: string[]; locked?: boolean; kind?: "app" | "review" };
export type DriverType = "local" | "us" | "canada" | "cross-border";
export type HiringTemplate = { id: string; name: string; description: string; locked?: boolean; driverType?: DriverType; checklistId?: string; steps: TemplateStep[] };

// The four driver types — each maps to the application form drivers complete in step 1.
export const DRIVER_TYPES: { id: DriverType; name: string; region: string }[] = [
    { id: "local", name: "Local / Domestic", region: "Domestic" },
    { id: "us", name: "US Driver", region: "United States" },
    { id: "canada", name: "Canada Driver", region: "Canada" },
    { id: "cross-border", name: "Cross-Border (US–Canada)", region: "US · Canada" },
];
export const driverTypeName = (id?: DriverType) => DRIVER_TYPES.find((d) => d.id === id)?.name ?? "—";

// Step 1 of every template: the Application + consent forms the driver completes first.
export const APP_STEP_TITLE = "Application & Consents";
export const makeAppStep = (idSeed: string, consents: string[] = []): TemplateStep => ({ id: `${idSeed}-app`, title: APP_STEP_TITLE, formIds: ["application", ...consents], locked: true, kind: "app" });

// Final step of every template: the hiring manager's review & completion.
export const REVIEW_STEP_TITLE = "Review & Completion";
export const makeReviewStep = (idSeed: string, extra: string[] = []): TemplateStep => ({ id: `${idSeed}-review`, title: REVIEW_STEP_TITLE, formIds: ["review", ...extra], locked: true, kind: "review" });

// Everything that can be added to a step. Grouped for the picker.
export const STEP_CATALOG: { id: string; name: string; group: "Core" | "Forms" | "Policy" }[] = [
    { id: "application", name: "Application", group: "Core" },
    { id: "review", name: "Review", group: "Core" },
    { id: "driver-license", name: "Driver License Submission", group: "Forms" },
    { id: "driver-abstract", name: "Driver Abstract / MVR", group: "Forms" },
    { id: "screening-reports", name: "PSP / CVDR / CDA", group: "Forms" },
    { id: "criminal-background", name: "Criminal Background Check", group: "Forms" },
    { id: "substance-testing", name: "Substance Testing", group: "Forms" },
    { id: "employment-verification", name: "Employment Verification", group: "Forms" },
    { id: "dot-verification", name: "DOT / Employment Verification", group: "Forms" },
    { id: "road-test", name: "Road Test Evaluation", group: "Forms" },
    { id: "medical-card", name: "Medical Card Renewal", group: "Forms" },
    { id: "annual-review", name: "Annual Review (§391.25)", group: "Forms" },
    { id: "clearinghouse-query", name: "Clearinghouse Query", group: "Forms" },
    { id: "fcra-disclosure", name: "FCRA Disclosure Statement", group: "Policy" },
    { id: "license-compliance", name: "License Requirements Certification", group: "Policy" },
    { id: "on-duty-hours", name: "Statement of On-Duty Hours", group: "Policy" },
    { id: "other-compensated-work", name: "Other Compensated Work", group: "Policy" },
    { id: "mvr-release", name: "MVR Release Consent", group: "Policy" },
    { id: "clearinghouse-consent", name: "Clearinghouse Query Consent", group: "Policy" },
    { id: "substance-consent-release", name: "Substance Consent & Release", group: "Policy" },
];

export function stepName(refId: string): string {
    return STEP_CATALOG.find((c) => c.id === refId)?.name ?? refId;
}
export function stepGroup(refId: string): string {
    return STEP_CATALOG.find((c) => c.id === refId)?.group ?? "Forms";
}
export function totalForms(t: HiringTemplate): number {
    return t.steps.reduce((n, s) => n + s.formIds.length, 0);
}

const st = (tplId: string, n: number, title: string, formIds: string[]): TemplateStep => ({ id: `${tplId}-st${n}`, title, formIds });

const DEFAULT_TEMPLATES: HiringTemplate[] = [
    {
        id: "tpl-us", name: "US Driver", description: "Interstate US driver — PSP, MVR and DOT history.", locked: true, driverType: "us", checklistId: "cl-us",
        steps: [
            makeAppStep("tpl-us", ["fcra-disclosure", "mvr-release", "clearinghouse-consent", "substance-consent-release"]),
            st("tpl-us", 1, "License Details", ["driver-license"]),
            st("tpl-us", 2, "Driving Record", ["screening-reports", "driver-abstract"]),
            st("tpl-us", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-us", 4, "Employment Verification", ["dot-verification"]),
            makeReviewStep("tpl-us"),
        ],
    },
    {
        id: "tpl-canada", name: "Canada Driver", description: "Canadian driver — Abstract / CVOR and employment verification.", locked: true, driverType: "canada", checklistId: "cl-canada",
        steps: [
            makeAppStep("tpl-canada", ["mvr-release"]),
            st("tpl-canada", 1, "License Details", ["driver-license"]),
            st("tpl-canada", 2, "Driving Record", ["driver-abstract"]),
            st("tpl-canada", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-canada", 4, "Employment Verification", ["employment-verification"]),
            makeReviewStep("tpl-canada"),
        ],
    },
    {
        id: "tpl-cross", name: "Cross-Border (US–Canada)", description: "Cross-border driver — full PSP, MVR and DOT verification.", locked: true, driverType: "cross-border", checklistId: "cl-cross",
        steps: [
            makeAppStep("tpl-cross", ["fcra-disclosure", "mvr-release", "clearinghouse-consent"]),
            st("tpl-cross", 1, "License Details", ["driver-license"]),
            st("tpl-cross", 2, "Driving Record", ["screening-reports", "driver-abstract"]),
            st("tpl-cross", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-cross", 4, "Employment Verification", ["dot-verification"]),
            makeReviewStep("tpl-cross"),
        ],
    },
    {
        id: "tpl-local", name: "Local / Domestic Driver", description: "Domestic CDL hire — MVR, background check and road test.", locked: true, driverType: "local", checklistId: "cl-local",
        steps: [
            makeAppStep("tpl-local", ["mvr-release"]),
            st("tpl-local", 1, "License Details", ["driver-license"]),
            st("tpl-local", 2, "Driving Record", ["driver-abstract"]),
            st("tpl-local", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-local", 4, "Road Test", ["road-test"]),
            st("tpl-local", 5, "Employment Verification", ["employment-verification"]),
            makeReviewStep("tpl-local"),
        ],
    },
    {
        id: "tpl-us-fast", name: "US Driver — Fast Track", description: "Lean US pre-employment — MVR, drug test and DOT verification.", locked: true, driverType: "us", checklistId: "cl-us",
        steps: [
            makeAppStep("tpl-us-fast", ["mvr-release", "clearinghouse-consent", "substance-consent-release"]),
            st("tpl-us-fast", 1, "License Details", ["driver-license"]),
            st("tpl-us-fast", 2, "Driving Record", ["driver-abstract"]),
            st("tpl-us-fast", 3, "Testing", ["substance-testing"]),
            st("tpl-us-fast", 4, "Employment Verification", ["dot-verification"]),
            makeReviewStep("tpl-us-fast"),
        ],
    },
    {
        id: "tpl-oo", name: "Owner-Operator", description: "Owner-operator — full screening plus medical card and annual review.", locked: true, driverType: "us", checklistId: "cl-us",
        steps: [
            makeAppStep("tpl-oo", ["fcra-disclosure", "mvr-release", "clearinghouse-consent", "substance-consent-release"]),
            st("tpl-oo", 1, "License Details", ["driver-license"]),
            st("tpl-oo", 2, "Driving Record", ["screening-reports", "driver-abstract"]),
            st("tpl-oo", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-oo", 4, "Employment Verification", ["dot-verification"]),
            st("tpl-oo", 5, "Medical & Compliance", ["medical-card", "annual-review"]),
            makeReviewStep("tpl-oo"),
        ],
    },
];

const KEY = "hp_templates_v2";
const EVENT = "hp-templates-change";

function load(): HiringTemplate[] {
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const saved = JSON.parse(raw) as HiringTemplate[];
            // Always keep the locked defaults present (and current) alongside custom ones.
            const customs = saved.filter((t) => !DEFAULT_TEMPLATES.some((d) => d.id === t.id));
            return [...DEFAULT_TEMPLATES, ...customs];
        }
    } catch { /* ignore */ }
    return DEFAULT_TEMPLATES;
}
function persist(list: HiringTemplate[]) {
    // Don't persist the locked defaults — they're seeded from code each load.
    const customs = list.filter((t) => !t.locked && !DEFAULT_TEMPLATES.some((d) => d.id === t.id));
    localStorage.setItem(KEY, JSON.stringify(customs));
    window.dispatchEvent(new CustomEvent(EVENT));
}

export function useHiringTemplates() {
    const [templates, setTemplates] = useState<HiringTemplate[]>(load);
    useEffect(() => {
        const h = () => setTemplates(load());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);
    const save = (t: HiringTemplate) => {
        const cur = load();
        const idx = cur.findIndex((x) => x.id === t.id);
        persist(idx >= 0 ? cur.map((x) => (x.id === t.id ? t : x)) : [...cur, t]);
    };
    const remove = (id: string) => persist(load().filter((x) => x.id !== id));
    return { templates, save, remove };
}
