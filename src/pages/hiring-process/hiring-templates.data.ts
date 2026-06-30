import { useEffect, useMemo, useState } from "react";

// ── Hiring templates ────────────────────────────────────────────────────────
// A template is an ordered list of STEPS. Each step has a title and one OR MORE
// forms attached. Stored in localStorage with three locked, seeded defaults.

// How a form attached to a step gets fulfilled. Selectable per form in the
// workflow builder; each form has a sensible default (see fulfillModeFor).
export type FulfillMode = "order" | "fill" | "upload" | "upload-fill";
export const FULFILL_META: Record<FulfillMode, { label: string; hint: string }> = {
    order: { label: "Order / Request", hint: "Order a report from a provider or agency" },
    fill: { label: "Fill Form", hint: "Fill in the form directly" },
    upload: { label: "Upload Document", hint: "Attach a third-party document" },
    "upload-fill": { label: "Upload + Fill", hint: "Attach a document and fill the form" },
};
const FORM_FULFILLMENT: Record<string, FulfillMode> = {
    mvr: "order", "driver-abstract": "order", psp: "order", cvdr: "order", cda: "order", "cvdr-cda": "order",
    "employment-verification": "order", "dot-verification": "order",
    "criminal-background": "upload", "substance-testing": "upload-fill", "road-test": "upload-fill",
};
export const fulfillModeFor = (fid: string): FulfillMode => FORM_FULFILLMENT[fid] ?? "fill";

// A quiz attached to a Knowledge Test step as a default "test": which quiz + how
// many questions the test draws from it (count = 0/undefined means all questions).
export type QuizPick = { quizId: string; count: number };
export type TemplateStep = { id: string; title: string; formIds: string[]; formModes?: Record<string, FulfillMode>; quizzes?: QuizPick[]; locked?: boolean; kind?: "app" | "review" };
export const stepFormMode = (s: TemplateStep, fid: string): FulfillMode => s.formModes?.[fid] ?? fulfillModeFor(fid);
export type DriverType = "local" | "us" | "canada" | "cross-border";
export type HiringTemplate = { id: string; name: string; description: string; locked?: boolean; driverType?: DriverType; checklistId?: string; carrierId?: string; steps: TemplateStep[] };

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
    { id: "mvr", name: "MVR — Motor Vehicle Record", group: "Forms" },
    { id: "driver-abstract", name: "Driver Abstract", group: "Forms" },
    { id: "psp", name: "PSP — Pre-Employment Screening", group: "Forms" },
    { id: "cvdr-cda", name: "CVDR / CDA", group: "Forms" },
    { id: "criminal-background", name: "Criminal Background Check", group: "Forms" },
    { id: "substance-testing", name: "Substance Testing", group: "Forms" },
    { id: "employment-verification", name: "Employment Verification", group: "Forms" },
    { id: "safety-performance-history", name: "Request for Employment and Safety Performance History", group: "Forms" },
    { id: "old-safety-performance-history", name: "Old Safety & Performance History", group: "Forms" },
    { id: "dot-verification", name: "DOT / Employment Verification", group: "Forms" },
    { id: "road-test", name: "Road Test Evaluation", group: "Forms" },
    { id: "quiz", name: "Test (Quiz / Assessment)", group: "Forms" },
    { id: "medical-card", name: "Medical Card Renewal", group: "Forms" },
    { id: "annual-review", name: "Annual Review (§391.25)", group: "Forms" },
    { id: "clearinghouse-query", name: "Clearinghouse Query", group: "Forms" },
    { id: "insurance-policy", name: "Insurance Policy", group: "Policy" },
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
// A Knowledge Test step that comes with quizzes attached as a default test.
const quizStep = (tplId: string, n: number, quizzes: QuizPick[]): TemplateStep => ({ id: `${tplId}-st${n}`, title: "Knowledge Test", formIds: ["quiz"], quizzes });
// One test from EVERY category — the default knowledge-test battery.
const ALL_CATEGORY_QUIZZES: QuizPick[] = [
    { quizId: "quiz-gk-1", count: 20 },        // General Knowledge
    { quizId: "quiz-signs-1", count: 20 },     // Road Signs
    { quizId: "quiz-class-1", count: 20 },     // Licence Classes
    { quizId: "quiz-class-a-1", count: 20 },   // Class A
    { quizId: "quiz-class-d-1", count: 20 },   // Class D
    { quizId: "quiz-air-1", count: 20 },       // Air Brake
    { quizId: "quiz-hos-1", count: 20 },       // Hours of Service
    { quizId: "quiz-hazmat-1", count: 20 },    // HazMat
];
// A single-report step, titled by the report's short name (one form per step).
const REPORT_TITLES: Record<string, string> = { psp: "PSP", mvr: "MVR", "driver-abstract": "Driver Abstract", cvdr: "CVDR", cda: "CDA", "cvdr-cda": "CVDR / CDA" };
const rep = (tplId: string, n: number, fid: string): TemplateStep => ({ id: `${tplId}-st${n}`, title: REPORT_TITLES[fid] ?? stepName(fid), formIds: [fid] });

const DEFAULT_TEMPLATES: HiringTemplate[] = [
    {
        id: "tpl-us", name: "US Driver", description: "Interstate US driver — PSP, MVR and DOT history.", locked: true, driverType: "us", checklistId: "cl-us",
        steps: [
            makeAppStep("tpl-us", ["fcra-disclosure", "mvr-release", "clearinghouse-consent", "substance-consent-release"]),
            rep("tpl-us", 2, "psp"),
            rep("tpl-us", 3, "mvr"),
            st("tpl-us", 4, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-us", 5, "Road Test", ["road-test"]),
            quizStep("tpl-us", 9, ALL_CATEGORY_QUIZZES),
            st("tpl-us", 6, "Employment Verification", ["dot-verification"]),
            st("tpl-us", 8, "Insurance Policy", ["insurance-policy"]),
            makeReviewStep("tpl-us"),
        ],
    },
    {
        id: "tpl-canada", name: "Canada Driver", description: "Canadian driver — Abstract / CVOR and employment verification.", locked: true, driverType: "canada", checklistId: "cl-canada",
        steps: [
            makeAppStep("tpl-canada", ["mvr-release"]),
            rep("tpl-canada", 2, "driver-abstract"),  // Canada Abstract / CVOR
            st("tpl-canada", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-canada", 4, "Road Test", ["road-test"]),
            quizStep("tpl-canada", 9, ALL_CATEGORY_QUIZZES),
            st("tpl-canada", 5, "Employment Verification", ["employment-verification"]),
            st("tpl-canada", 8, "Insurance Policy", ["insurance-policy"]),
            makeReviewStep("tpl-canada"),
        ],
    },
    {
        id: "tpl-cross", name: "Cross-Border (US–Canada)", description: "Cross-border driver — full PSP, MVR and DOT verification.", locked: true, driverType: "cross-border", checklistId: "cl-cross",
        steps: [
            makeAppStep("tpl-cross", ["fcra-disclosure", "mvr-release", "clearinghouse-consent"]),
            rep("tpl-cross", 2, "psp"),
            rep("tpl-cross", 3, "mvr"),
            rep("tpl-cross", 4, "cvdr-cda"),
            st("tpl-cross", 5, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-cross", 6, "Road Test", ["road-test"]),
            quizStep("tpl-cross", 9, ALL_CATEGORY_QUIZZES),
            st("tpl-cross", 7, "Employment Verification", ["dot-verification"]),
            st("tpl-cross", 8, "Insurance Policy", ["insurance-policy"]),
            makeReviewStep("tpl-cross"),
        ],
    },
    {
        id: "tpl-local", name: "Local / Domestic Driver", description: "Domestic CDL hire — MVR, background check and road test.", locked: true, driverType: "local", checklistId: "cl-local",
        steps: [
            makeAppStep("tpl-local", ["mvr-release"]),
            rep("tpl-local", 2, "mvr"),
            st("tpl-local", 3, "Background & Testing", ["criminal-background", "substance-testing"]),
            st("tpl-local", 4, "Road Test", ["road-test"]),
            quizStep("tpl-local", 9, ALL_CATEGORY_QUIZZES),
            st("tpl-local", 5, "Employment Verification", ["employment-verification"]),
            st("tpl-local", 8, "Insurance Policy", ["insurance-policy"]),
            makeReviewStep("tpl-local"),
        ],
    },
    {
        id: "tpl-us-fast", name: "US Driver — Fast Track", description: "Lean US pre-employment — MVR, drug test and DOT verification.", locked: true, driverType: "us", checklistId: "cl-us",
        steps: [
            makeAppStep("tpl-us-fast", ["mvr-release", "clearinghouse-consent", "substance-consent-release"]),
            rep("tpl-us-fast", 2, "mvr"),
            st("tpl-us-fast", 3, "Testing", ["substance-testing"]),
            quizStep("tpl-us-fast", 9, ALL_CATEGORY_QUIZZES),
            st("tpl-us-fast", 4, "Employment Verification", ["dot-verification"]),
            st("tpl-us-fast", 8, "Insurance Policy", ["insurance-policy"]),
            makeReviewStep("tpl-us-fast"),
        ],
    },
    {
        id: "tpl-oo", name: "Owner-Operator", description: "Owner-operator — full screening plus medical card and annual review.", locked: true, driverType: "us", checklistId: "cl-us",
        steps: [
            makeAppStep("tpl-oo", ["fcra-disclosure", "mvr-release", "clearinghouse-consent", "substance-consent-release"]),
            rep("tpl-oo", 2, "psp"),
            rep("tpl-oo", 3, "mvr"),
            st("tpl-oo", 4, "Background & Testing", ["criminal-background", "substance-testing"]),
            quizStep("tpl-oo", 9, ALL_CATEGORY_QUIZZES),
            st("tpl-oo", 5, "Employment Verification", ["dot-verification"]),
            st("tpl-oo", 6, "Medical & Compliance", ["medical-card", "annual-review"]),
            st("tpl-oo", 8, "Insurance Policy", ["insurance-policy"]),
            makeReviewStep("tpl-oo"),
        ],
    },
];

const KEY = "hp_templates_v4";
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

// Shared default (locked) templates show for every carrier; custom templates
// show only for the carrier they were created under (untagged customs stay
// visible everywhere for back-compat).
export function useHiringTemplates(carrierId?: string) {
    const [all, setAll] = useState<HiringTemplate[]>(load);
    useEffect(() => {
        const h = () => setAll(load());
        window.addEventListener(EVENT, h);
        return () => window.removeEventListener(EVENT, h);
    }, []);
    const templates = useMemo(
        () => all.filter((t) => t.locked || !t.carrierId || !carrierId || t.carrierId === carrierId),
        [all, carrierId],
    );
    const save = (t: HiringTemplate) => {
        const cur = load();
        const idx = cur.findIndex((x) => x.id === t.id);
        persist(idx >= 0 ? cur.map((x) => (x.id === t.id ? t : x)) : [...cur, t]);
    };
    const remove = (id: string) => persist(load().filter((x) => x.id !== id));
    return { templates, save, remove };
}
