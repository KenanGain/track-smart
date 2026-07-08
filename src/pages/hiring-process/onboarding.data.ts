import { useEffect, useState } from "react";
import { FileText, FileSignature, BookOpenCheck, PenLine, ListChecks } from "lucide-react";
import { TRAINING_TYPES, TRAINING_CATEGORIES } from "@/data/training.data";
import { policyDocuments, type PolicyFormDef, type PolicyField } from "./policy-forms.data";
import type { StepStatus } from "./applicants.data";

// ── Onboarding (post-hire) ───────────────────────────────────────────────────
// After a driver is hired (application approved) they move into Onboarding.
// Mirrors the Hiring Process: a monitor list of drivers, each opening a file
// that works through a fixed set of steps.
//
// State lives on the Applicant record (a.onboarding) so the list board and the
// per-driver dashboard stay in sync via the shared useApplicants() store.

// Onboarding steps are DERIVED FROM THE ASSIGNED WORKFLOW (Onboarding Setup):
// Policy forms · Onboarding forms · Documents & sign · Quiz · Checklist. Only the
// sections the workflow actually populates become steps.
export type OnbStepKind = "policy" | "forms" | "documents" | "quiz" | "checklist";
export type OnbStepStatus = "pending" | "in-progress" | "complete";

export const ONB_STEP_META: Record<OnbStepKind, { title: string; short: string; desc: string; Icon: React.ElementType }> = {
    policy: { title: "Policy forms", short: "Policy", desc: "Company / FMCSA policy statements the driver reviews and signs.", Icon: FileSignature },
    forms: { title: "Onboarding forms", short: "Forms", desc: "New-hire paperwork the driver completes and signs.", Icon: FileText },
    documents: { title: "Documents & sign", short: "Documents", desc: "PDF documents the driver e-signs.", Icon: PenLine },
    quiz: { title: "Post-orientation quiz", short: "Quiz", desc: "Knowledge checks the driver must pass.", Icon: BookOpenCheck },
    checklist: { title: "Final checklist", short: "Checklist", desc: "Reviewer confirms onboarding is complete.", Icon: ListChecks },
};

// Step 1 — new-hire onboarding forms (company paperwork, not FMCSA policy docs).
export const ONBOARDING_FORMS: { id: string; label: string; desc: string }[] = [
    { id: "direct-deposit", label: "Direct Deposit Authorization", desc: "Bank details for payroll." },
    { id: "emergency-contact", label: "Emergency Contact Form", desc: "Who to reach in an emergency." },
    { id: "tax-withholding", label: "Tax Withholding (W-4 / TD1)", desc: "Payroll tax elections." },
    { id: "equipment-issue", label: "Uniform & Equipment Issue", desc: "Company property issued to the driver." },
    { id: "fuel-card", label: "Fuel Card Agreement", desc: "Fuel card usage terms and PIN acknowledgement." },
];

// Openable document definitions for the onboarding forms — rendered by the same
// PolicyForm viewer as the policy statements, so each form can be opened & signed.
const SIGN: PolicyField[] = [
    { key: "signature", label: "Signature", kind: "sign" },
    { key: "printName", label: "Print Name", kind: "text" },
    { key: "date", label: "Date", kind: "date" },
];

export const ONBOARDING_FORM_DEFS: PolicyFormDef[] = [
    {
        id: "direct-deposit", title: "Direct Deposit", accentTitle: "Authorization", theme: "blue", kind: "policy",
        blurb: "Bank details for payroll direct deposit.",
        intro: [{ key: "applicant", label: "Employee name", kind: "text" }],
        fieldsTitle: "Bank account",
        fields: [
            { key: "bankName", label: "Bank / Financial institution" },
            { key: "accountHolder", label: "Account holder name" },
            { key: "routing", label: "Routing / Transit number" },
            { key: "account", label: "Account number" },
            { key: "accountType", label: "Account type", kind: "choice", options: ["Checking", "Savings"] },
        ],
        body: [{ p: "I authorize the company to deposit my net pay directly to the account above and, if necessary, to reverse any amounts deposited in error. This authorization remains in effect until I provide written notice of a change." }],
        signers: SIGN,
        sample: { applicant: "Jane Doe", bankName: "First National Bank", accountHolder: "Jane Doe", routing: "021000021", account: "****4471", accountType: "Checking", printName: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "emergency-contact", title: "Emergency Contact", accentTitle: "Information", theme: "blue", kind: "policy",
        blurb: "Who to reach in an emergency.",
        intro: [{ key: "applicant", label: "Employee name", kind: "text" }],
        fieldsTitle: "Emergency contact",
        fields: [
            { key: "ecName", label: "Contact name" },
            { key: "ecRelation", label: "Relationship" },
            { key: "ecPhone", label: "Primary phone" },
            { key: "ecAltPhone", label: "Alternate phone" },
            { key: "ecAddress", label: "Contact address" },
        ],
        body: [{ p: "I authorize the company to contact the person named above in the event of an emergency involving me while I am employed." }],
        signers: SIGN,
        sample: { applicant: "Jane Doe", ecName: "John Doe", ecRelation: "Spouse", ecPhone: "(312) 555-0148", ecAltPhone: "(312) 555-0192", ecAddress: "123 Main St, Chicago, IL", printName: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "tax-withholding", title: "Tax Withholding", accentTitle: "(W-4 / TD1)", theme: "blue", kind: "policy",
        blurb: "Payroll tax withholding elections.",
        intro: [{ key: "applicant", label: "Employee name", kind: "text" }],
        fieldsTitle: "Withholding elections",
        fields: [
            { key: "filingStatus", label: "Filing status", kind: "choice", options: ["Single", "Married filing jointly", "Head of household"] },
            { key: "dependents", label: "Number of dependents" },
            { key: "extraWithholding", label: "Additional amount withheld per pay period" },
            { key: "exempt", label: "Claiming exemption from withholding?", kind: "choice", options: ["No", "Yes"] },
        ],
        body: [{ p: "Under penalties of perjury, I declare that the withholding information above is true, correct, and complete. I will submit an updated form if my circumstances change." }],
        signers: SIGN,
        sample: { applicant: "Jane Doe", filingStatus: "Single", dependents: "0", extraWithholding: "$0", exempt: "No", printName: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "equipment-issue", title: "Uniform & Equipment", accentTitle: "Issue Receipt", theme: "blue", kind: "policy",
        blurb: "Company property issued to the driver.",
        intro: [{ key: "applicant", label: "Employee name", kind: "text" }],
        fieldsTitle: "Issued items",
        fields: [
            { key: "itemsIssued", label: "Items issued (uniforms, fuel card, ELD / tablet, keys, PPE)" },
            { key: "issueDate", label: "Issue date", kind: "date" },
        ],
        body: [{ p: "I acknowledge receipt of the company property listed above. I agree to keep it in good condition, use it only for company purposes, and return all items upon separation or on request. I understand the value of unreturned items may be deducted from my final pay where permitted by law." }],
        signers: SIGN,
        sample: { applicant: "Jane Doe", itemsIssued: "2 uniforms, fuel card, ELD tablet, cab keys, hi-vis vest", issueDate: "2026-06-05", printName: "Jane Doe", date: "2026-06-05" },
    },
    {
        id: "fuel-card", title: "Fuel Card", accentTitle: "Agreement", theme: "blue", kind: "policy",
        blurb: "Fuel card usage terms and PIN acknowledgement.",
        intro: [{ key: "applicant", label: "Employee name", kind: "text" }],
        fieldsTitle: "Card details",
        fields: [
            { key: "cardNumber", label: "Fuel card number (last 4)" },
            { key: "pinAck", label: "PIN received and kept confidential", kind: "choice", options: ["Yes", "No"] },
        ],
        body: [
            { p: "I agree to use the company fuel card only for authorized fuel and vehicle purchases at approved locations, never for personal use, and to keep my PIN confidential." },
            { p: "I will retain all receipts, report a lost or stolen card immediately, and understand that misuse may result in disciplinary action and repayment of unauthorized charges." },
        ],
        signers: SIGN,
        sample: { applicant: "Jane Doe", cardNumber: "1234", pinAck: "Yes", printName: "Jane Doe", date: "2026-06-05" },
    },
];

export const getOnboardingFormDef = (id: string): PolicyFormDef | undefined => ONBOARDING_FORM_DEFS.find((d) => d.id === id);

// Step 2 — contract documents (shown alongside the onboarding policy statements).
export const CONTRACT_DOCS: { id: string; label: string; desc: string }[] = [
    { id: "employment-agreement", label: "Employment Agreement", desc: "Driver employment contract." },
    { id: "pay-agreement", label: "Driver Pay Agreement", desc: "Rate, per-mile / percentage, deductions." },
    { id: "lease-agreement", label: "Independent Contractor / Lease Agreement", desc: "For owner-operators (if applicable)." },
];

// The full step-2 checklist = contract docs + the onboarding policy statements.
// Only the policy statements shown in Settings → Onboarding Setup (the same
// HIDDEN_POLICY exclusions) so the driver file matches what's configured.
export const contractChecklist = (): { id: string; label: string; desc: string; policy?: boolean }[] => [
    ...CONTRACT_DOCS,
    ...onbPolicyItems().map((p) => ({ id: p.id, label: p.label, desc: p.desc, policy: true })),
];

// Policy statements the driver reviews & signs (shown as the "Policy forms" tab in
// the Forms step) — matches Settings → Onboarding Setup (HIDDEN_POLICY excluded).
export function onbPolicyItems(): { id: string; label: string; desc: string; defId: string }[] {
    return policyDocuments().filter((p) => !HIDDEN_POLICY.includes(p.id)).map((p) => ({ id: `policy:${p.id}`, label: `${p.title} ${p.accentTitle}`, desc: p.blurb ?? "", defId: p.id }));
}

export { TRAINING_TYPES, TRAINING_CATEGORIES };

// A training course assigned to the driver from the catalog.
export type AssignedTraining = {
    id: string;
    name: string;
    category: string;
    mandatory: boolean;
    dueDays: number;
    assignedAt: number;
    status: "assigned" | "in_progress" | "completed";
    completedAt?: number;
};

export const TRAINING_STATUS_META: Record<AssignedTraining["status"], { label: string; badge: string; dot: string }> = {
    assigned: { label: "Assigned", badge: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
    in_progress: { label: "In progress", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    completed: { label: "Completed", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

export type OnbQuizResult = { score: number; total: number; passed: boolean; at: number; answers?: Record<string, number> };

// Interim per-document state (beyond signed) — mirrors the hiring "requested/uploaded"
// flow so onboarding docs get the same Order/Request · Upload actions.
export type OnbDocState = "requested" | "uploaded";

// Reviewer sign-off recorded against a step (HR reviews what the driver signed).
export type OnbReview = { by: string; role?: string; date: string; sig?: string; at: number };

// An order/request the manager raises — ask anyone (driver, HR, a provider…) to
// complete a form, document or quiz, or send a reminder. Mirrors the hiring flow.
export type OnbRequestAction = "Request" | "Order" | "Review" | "Alert";
export type OnbRequestRecipient = "Driver" | "Hiring Manager" | "Provider / Agency" | "Trainer / Examiner" | "Other";
export type OnbRequestChannel = "Email" | "In-app";
export const ONB_REQUEST_ACTIONS: { id: OnbRequestAction; label: string; hint: string }[] = [
    { id: "Request", label: "Request completion", hint: "Ask someone to complete or sign this item" },
    { id: "Order", label: "Order report", hint: "Order a report / result from a provider or agency" },
    { id: "Review", label: "Assign review", hint: "Assign a review task to HR / a manager" },
    { id: "Alert", label: "Alert / Remind", hint: "Send a reminder or notification" },
];
export const ONB_REQUEST_RECIPIENTS: OnbRequestRecipient[] = ["Driver", "Hiring Manager", "Provider / Agency", "Trainer / Examiner", "Other"];
export type OnbRequest = {
    id: string; itemId?: string; itemLabel: string;
    action: OnbRequestAction; recipient: OnbRequestRecipient; to?: string;
    channel: OnbRequestChannel; subject: string; message: string; dueDate?: string;
    status: "open" | "resolved"; at: number; by: string;
};

// How many attempts (chances) a driver gets per onboarding quiz.
export const MAX_ONB_QUIZ_ATTEMPTS = 3;

export type OnboardingState = {
    startedAt?: number;
    workflowId?: string;          // the specific OnbWorkflow assigned to this driver
    signedForms?: string[];       // onboarding form ids the driver signed
    signedContracts?: string[];   // contract / policy doc ids acknowledged
    signedDocs?: string[];        // PDF document-template ids e-signed (kept separate)
    docState?: Record<string, OnbDocState>;   // interim state (requested / uploaded) per item id
    quizIds?: string[];           // assigned quiz ids
    quizResults?: Record<string, OnbQuizResult>;
    quizAttempts?: Record<string, number>;    // chances used per quiz
    trainings?: AssignedTraining[];
    reviews?: Record<string, OnbReview>;      // reviewer sign-off keyed by step id
    stepStatus?: Record<string, StepStatus>;  // manual per-step review lifecycle (keyed by OnbStepKind)
    requests?: OnbRequest[];                  // open/resolved order-request records
    events?: { id: string; text: string; at: number }[];
    notes?: { id: string; text: string; at: number; by: string }[];
};

export const STEP_STATUS_META: Record<OnbStepStatus, { label: string; badge: string; dot: string }> = {
    pending: { label: "Not started", badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
    "in-progress": { label: "In progress", badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    complete: { label: "Complete", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

// ── Workflow-driven steps ────────────────────────────────────────────────────
export const REGION_TYPE: Record<string, string> = { us: "us", "us-owner-operator": "cross-border", local: "local", canada: "canada", "cross-border": "cross-border" };

// The ordered steps a workflow produces — only the sections it populates.
export function onbWorkflowSteps(wf?: OnbWorkflow): OnbStepKind[] {
    if (!wf) return ["forms"];
    const s: OnbStepKind[] = [];
    if (wf.policyForms?.length) s.push("policy");
    if (wf.forms.length) s.push("forms");
    if (wf.documents.length) s.push("documents");
    if (wf.quizzes.length) s.push("quiz");
    if (wf.checklistId) s.push("checklist");
    return s.length ? s : ["forms"];
}

const allDone = (ids: string[], set?: string[]): OnbStepStatus => {
    if (!ids.length) return "complete";
    const s = new Set(set ?? []);
    const d = ids.filter((i) => s.has(i)).length;
    return d >= ids.length ? "complete" : d > 0 ? "in-progress" : "pending";
};

// A step's status for a driver, against their assigned workflow.
export function onbStepStatus(kind: OnbStepKind, wf: OnbWorkflow | undefined, o: OnboardingState | undefined): OnbStepStatus {
    const onb = o ?? {};
    switch (kind) {
        case "policy": return allDone(wf?.policyForms ?? [], onb.signedContracts);
        case "forms": return allDone(wf?.forms ?? [], onb.signedForms);
        case "documents": return allDone(wf?.documents ?? [], onb.signedDocs);
        case "quiz": {
            const ids = wf?.quizzes ?? [];
            if (!ids.length) return "complete";
            const r = onb.quizResults ?? {};
            const passed = ids.filter((i) => r[i]?.passed).length;
            const attempted = ids.filter((i) => r[i]).length;
            return passed >= ids.length ? "complete" : attempted > 0 ? "in-progress" : "pending";
        }
        case "checklist": return onb.reviews?.checklist ? "complete" : "pending";
    }
}

export function onbSteps(o: OnboardingState | undefined, wf?: OnbWorkflow): { kind: OnbStepKind; title: string; short: string; status: OnbStepStatus }[] {
    return onbWorkflowSteps(wf).map((k) => ({ kind: k, title: ONB_STEP_META[k].title, short: ONB_STEP_META[k].short, status: onbStepStatus(k, wf, o) }));
}

export function onbProgress(o: OnboardingState | undefined, wf?: OnbWorkflow): { done: number; total: number; complete: boolean } {
    const steps = onbSteps(o, wf);
    const done = steps.filter((s) => s.status === "complete").length;
    return { done, total: steps.length, complete: steps.length > 0 && done === steps.length };
}

// ── Onboarding workflows ─────────────────────────────────────────────────────
// A named onboarding workflow (like the hiring workflows). Each has 4 steps that
// attach items: forms → documents → quizzes → checklist. Multiple workflows can
// exist; persisted so the list, the Edit builder and driver files stay in sync.
export type OnbWorkflow = {
    id: string;
    name: string;
    description?: string;
    driverType?: string;         // local | us | canada | cross-border (which drivers it's for)
    policyForms: string[];       // policy statement ids (Policy forms tab)
    forms: string[];             // onboarding form ids (Onboarding forms tab)
    documents: string[];         // document template ids (Documents & sign tab)
    quizzes: string[];           // onboarding quiz ids
    checklistId: string | null;  // one review checklist
};

const WF_KEY = "onb_workflows_v1";
const WF_HIDE_KEY = "onb_workflows_hidden_v1";
const WF_EVENT = "onb-workflows-change";
const HIDDEN_POLICY = ["insurance-policy", "ctpat-cross-border-security", "drug-alcohol-policy-receipt"];

// Ready-made onboarding workflows. Each sequences forms → documents → quizzes →
// checklist so it can be assigned to a driver once hiring is complete.
function seededWorkflows(): OnbWorkflow[] {
    const policyIds = policyDocuments().filter((d) => !HIDDEN_POLICY.includes(d.id)).map((d) => d.id);
    const onbFormIds = ONBOARDING_FORM_DEFS.map((d) => d.id);
    return [
        {
            id: "onbwf-standard",
            name: "Standard Onboarding",
            description: "Forms, documents, post-orientation quiz and final checklist for every new hire.",
            driverType: "local",
            policyForms: policyIds,
            forms: onbFormIds,
            documents: ["tpl-driver-agreement", "tpl-driver-acknowledgements"],
            quizzes: ["onb-post-orientation"],
            checklistId: "cl-us",
        },
        {
            id: "onbwf-us",
            name: "US Driver Onboarding",
            description: "US company drivers — company policies, driver agreement, ELD/HOS acknowledgement, quiz and review.",
            driverType: "us",
            policyForms: ["license-compliance", "on-duty-hours"],
            forms: ["direct-deposit", "emergency-contact", "tax-withholding", "equipment-issue"],
            documents: ["tpl-driver-agreement", "tpl-cell-phone-policy", "tpl-dashcam-policy", "tpl-eld-hos-dvir-ack", "tpl-driver-acknowledgements"],
            quizzes: ["onb-post-orientation"],
            checklistId: "cl-us",
        },
        {
            id: "onbwf-canada",
            name: "Canadian Driver Onboarding",
            description: "Canadian company drivers — weights & dimensions, load securement, payroll forms and review.",
            driverType: "canada",
            policyForms: ["license-compliance", "other-compensated-work"],
            forms: ["direct-deposit", "emergency-contact", "tax-withholding"],
            documents: ["tpl-driver-agreement", "tpl-cell-phone-policy", "tpl-weights-dimensions", "tpl-load-securement-dvir", "tpl-driver-acknowledgements"],
            quizzes: ["onb-post-orientation"],
            checklistId: "cl-canada",
        },
        {
            id: "onbwf-owner-op",
            name: "Owner-Operator Onboarding",
            description: "Contractors / owner-operators — contractor agreement, compliance certifications, fuel card and equipment.",
            driverType: "cross-border",
            policyForms: ["on-duty-hours"],
            forms: ["direct-deposit", "fuel-card", "equipment-issue"],
            documents: ["tpl-contractor-agreement", "tpl-driver-agreement", "tpl-dashcam-policy", "tpl-cert-compliance-logbook", "tpl-security-awareness"],
            quizzes: ["onb-post-orientation"],
            checklistId: "cl-cross",
        },
    ];
}

// Migrate older workflows that kept policy + onboarding form ids together in
// `forms` — split them into `policyForms` (policy statements) + `forms`.
function normalizeWf(w: OnbWorkflow): OnbWorkflow {
    if (Array.isArray(w.policyForms)) return w;
    const policyIds = new Set(policyDocuments().map((d) => d.id));
    const all = w.forms ?? [];
    return { ...w, policyForms: all.filter((id) => policyIds.has(id)), forms: all.filter((id) => !policyIds.has(id)) };
}

function loadStoredWorkflows(): OnbWorkflow[] {
    try { const raw = localStorage.getItem(WF_KEY); if (raw) return (JSON.parse(raw) as OnbWorkflow[]).map(normalizeWf); } catch { /* ignore */ }
    return [];
}
function loadHiddenWorkflows(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(WF_HIDE_KEY) ?? "[]") as string[]); } catch { return new Set(); }
}
function persistHiddenWorkflows(s: Set<string>) {
    try { localStorage.setItem(WF_HIDE_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}
// Full list = stored (user-created / edited) + seeded (a stored copy overrides a
// seed of the same id; a deleted id is remembered so seeds stay removed).
function loadWorkflows(): OnbWorkflow[] {
    const hidden = loadHiddenWorkflows();
    const stored = loadStoredWorkflows().filter((w) => !hidden.has(w.id));
    const ids = new Set(stored.map((w) => w.id));
    const seeds = seededWorkflows().filter((w) => !ids.has(w.id) && !hidden.has(w.id));
    return [...stored, ...seeds];
}
function persistWorkflows(list: OnbWorkflow[]) {
    localStorage.setItem(WF_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(WF_EVENT));
}
export function useOnbWorkflows() {
    const [workflows, setWorkflows] = useState<OnbWorkflow[]>(loadWorkflows);
    useEffect(() => {
        const h = () => setWorkflows(loadWorkflows());
        window.addEventListener(WF_EVENT, h);
        return () => window.removeEventListener(WF_EVENT, h);
    }, []);
    const save = (wf: OnbWorkflow) => {
        const cur = loadStoredWorkflows();
        const i = cur.findIndex((x) => x.id === wf.id);
        persistWorkflows(i >= 0 ? cur.map((x) => (x.id === wf.id ? wf : x)) : [...cur, wf]);
    };
    const remove = (id: string) => {
        const hidden = loadHiddenWorkflows();
        hidden.add(id);
        persistHiddenWorkflows(hidden);
        persistWorkflows(loadStoredWorkflows().filter((x) => x.id !== id));
    };
    return { workflows, save, remove };
}
export function getOnbWorkflow(id: string): OnbWorkflow | undefined { const w = loadWorkflows().find((x) => x.id === id); return w ? normalizeWf(w) : undefined; }

// The workflow a driver follows: their explicitly-assigned one → region default →
// standard → first available.
export function resolveOnbWorkflow(o: OnboardingState | undefined, formId: string, workflows: OnbWorkflow[]): OnbWorkflow | undefined {
    if (!workflows.length) return undefined;
    return workflows.find((w) => w.id === o?.workflowId)
        ?? workflows.find((w) => w.driverType === REGION_TYPE[formId])
        ?? workflows.find((w) => w.id === "onbwf-standard") ?? workflows[0];
}
export function blankOnbWorkflow(): OnbWorkflow {
    return { id: `onbwf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`, name: "", description: "", driverType: "us", policyForms: [], forms: [], documents: [], quizzes: [], checklistId: null };
}

export const ONB_DRIVER_TYPES: { id: string; label: string; sub: string }[] = [
    { id: "local", label: "Local / Domestic", sub: "Domestic" },
    { id: "us", label: "US Driver", sub: "United States" },
    { id: "canada", label: "Canada Driver", sub: "Canada" },
    { id: "cross-border", label: "Cross-Border", sub: "US · Canada" },
];
export const onbDriverTypeName = (id?: string) => ONB_DRIVER_TYPES.find((d) => d.id === id)?.label;
