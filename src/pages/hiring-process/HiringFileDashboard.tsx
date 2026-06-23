import { useMemo, useRef, useState } from "react";
import {
    ChevronLeft, ChevronDown, Check, Send, FileSearch, BadgeCheck, RotateCcw,
    AlertCircle, Clock, ExternalLink, Mail, Printer, Share2,
    MessageSquarePlus, FileText, StickyNote, Upload, Download, Eye, Calendar, Paperclip, ClipboardCheck, CreditCard, Award,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    useApplicants, ACTOR, STATUS_META, STATUS_ORDER, DOC_STATUS_META, STEP_STATUS_META, relativeTime, formName, formRegion, EMP_MAX_ATTEMPTS, REQUEST_ACTIONS,
    type AppStatus, type DocStatus, type StepStatus, type ReviewSignoff, type Applicant, type AppRequest, type RequestRecipient, type RequestChannel, type RequestAction, type EmpCheck, type UploadedFile, type Remark, type RoadTestMethod, type RoadTestDoc,
} from "./applicants.data";
import { useHiringTemplates, stepName, stepGroup, stepFormMode, fulfillModeFor, type HiringTemplate, type FulfillMode } from "./hiring-templates.data";
import { getChecklist } from "./checklists.data";
import { ChecklistRunner, buildChecklistSections, checklistProgress } from "./ChecklistRunner";
import { HiringFormView } from "./formRegistry";
import { EmployerRequestDialog } from "./EmployerRequestDialog";
import { SendDocumentDialog } from "./SendDocumentDialog";
import { EmployerDocTile } from "./EmployerDocTile";
import { ThemedDocumentViewer } from "./ThemedDocumentViewer";
import { HiringPdfReview } from "./HiringPdfReview";
import { PrefillProvider, buildPrefill, splitDates, type PrefillEmployer, type PrefillUnemployment, type ApplicantPrefill } from "./application-prefill";
import { SignaturePad } from "./FormKit";
import { PolicyDocument } from "./PolicyForm";
import { POLICY_FORMS } from "./policy-forms.data";
import { useCompanyBranding, type CompanyBranding } from "../ats/company-branding.data";
import { AssignExaminerDialog } from "./AssignExaminerDialog";
import { FormDocument, THEMES, type DocSection, type ThemeKey } from "./FormDocument";
import { ClassicSphForms, type ClassicSphData } from "./ClassicSphForms";

const TEMPLATE_FOR_FORM: Record<string, string> = { us: "tpl-us", canada: "tpl-canada", "cross-border": "tpl-cross" };
// Map the Road Test form's §391.33 method (radio value) → the module's RoadTestMethod.
const ROAD_TEST_METHOD_BY_FORM: Record<string, RoadTestMethod> = {
    "Road test conducted (§391.31)": "certify",
    "License accepted as equivalent": "license",
    "Prior certificate accepted as equivalent": "document",
};
const DONE_STATES: DocStatus[] = ["received", "verified", "skipped"];
// Event verb recorded when a form is marked done, by fulfillment mode.
const FULFILL_VERB: Record<FulfillMode, string> = { order: "Recorded result", fill: "Filled form", upload: "Uploaded document", "upload-fill": "Uploaded & filled" };
// The generic Ask/Order dialog never offers "Previous Employer" — that belongs to the Employment module.
const GENERIC_RECIPIENTS: RequestRecipient[] = ["Driver", "Hiring Manager", "Provider / Agency", "Other"];

// Default recipient + copy for an action on a given form.
function actionTemplate(action: RequestAction, formLabel: string): { recipient: RequestRecipient; subject: string; message: string } {
    switch (action) {
        case "Order": return { recipient: "Provider / Agency", subject: `Order report — ${formLabel}`, message: `Please run and return the ${formLabel} report for this applicant.` };
        case "Review": return { recipient: "Hiring Manager", subject: `Review — ${formLabel}`, message: `Please review the ${formLabel} for this applicant and confirm it meets requirements.` };
        case "Alert": return { recipient: "Driver", subject: `Reminder — ${formLabel}`, message: `This is a reminder that the ${formLabel} is still pending. Please action it at your earliest convenience.` };
        default: return { recipient: "Driver", subject: `Please complete — ${formLabel}`, message: `Please complete and upload the ${formLabel}.` };
    }
}

const PHASE_TEXT: Record<AppStatus, string> = {
    waiting: "Driver still completing the application",
    "in-progress": "Driver is filling out the application",
    submitted: "Application received — ready to review",
    "under-review": "In progress — checks underway",
    approved: "Hired — file complete",
    rejected: "Application rejected",
};

// Pick the default action for a form, then build copy from the action template.
function requestPrefill(fid: string | undefined, driverEmail: string): Partial<AppRequest> {
    const label = fid ? stepName(fid) : "this item";
    const n = (fid ? stepName(fid) : "").toLowerCase();
    const action: RequestAction = (fid && fulfillModeFor(fid) === "order") || /psp|mvr|abstract|screen|criminal|substance|medical|annual|clearinghouse|record|driving|cvdr|cda/.test(n) ? "Order" : "Request";
    const t = actionTemplate(action, label);
    return { fid, action, recipient: t.recipient, to: t.recipient === "Driver" ? driverEmail : "", subject: t.subject, message: t.message };
}

export function HiringFileDashboard({ applicantId, onBack }: { applicantId: string; onBack: () => void }) {
    const { applicants, updateOne } = useApplicants();
    const { templates } = useHiringTemplates();
    const [openForm, setOpenForm] = useState<string | null>(null);
    const [formPreview, setFormPreview] = useState(false);   // open the form straight into its PDF/document view
    const [uploadFor, setUploadFor] = useState<StepItem | null>(null);   // item whose upload popup is open
    const [openConsent, setOpenConsent] = useState<string | null>(null);   // consent review (stacked forms)
    const [consentView, setConsentView] = useState<"form" | "document">("form");  // consent screen: our form UI vs PDF/document
    const [consentFocus, setConsentFocus] = useState<string | null>(null);   // a single consent to show (else all)
    const [appSection, setAppSection] = useState<string | null>(null);   // a single application section to show (else all)
    const [docPreview, setDocPreview] = useState<UploadedFile | null>(null);   // uploaded document being previewed
    const [empReview, setEmpReview] = useState<string | null>(null);   // employer being reviewed on its dedicated page (emp-check id)
    const [showPacket, setShowPacket] = useState(false);
    const [pdfReview, setPdfReview] = useState<number | null>(null);
    const [showChecklistPdf, setShowChecklistPdf] = useState(false);
    const [selected, setSelected] = useState(0);
    const [reqOpen, setReqOpen] = useState<Partial<AppRequest> | null>(null);
    const [note, setNote] = useState("");

    const a = applicants.find((x) => x.id === applicantId);
    if (!a) return <NotFound onBack={onBack} />;

    const tpl: HiringTemplate | undefined = templates.find((t) => t.name === a.template) ?? templates.find((t) => t.id === TEMPLATE_FOR_FORM[a.formId]) ?? templates[0];
    const steps = tpl?.steps ?? [];
    const docOf = (fid: string): DocStatus => a.docs?.[fid] ?? "pending";
    const stepDone = (s: HiringTemplate["steps"][number]) => s.formIds.length > 0 && s.formIds.every((f) => DONE_STATES.includes(docOf(f)));
    // Per-step review lifecycle. Explicit status wins; otherwise derive: all docs in → "waiting for review", else "initial".
    const stepStatusOf = (s: HiringTemplate["steps"][number]): StepStatus => a.stepStatus?.[s.id] ?? (stepDone(s) ? "waiting" : "initial");
    const isStepDone = (s: HiringTemplate["steps"][number]) => stepStatusOf(s) === "complete";
    const currentIdx = steps.findIndex((s) => !isStepDone(s));
    const sel = Math.min(selected, steps.length - 1);
    const step = steps[sel];
    const pf = buildPrefill(a);
    const empFid = step?.formIds.find((f) => f === "dot-verification" || f === "employment-verification");
    const isEmpStep = !!empFid && pf.employment.length > 0;
    const isRoadTestStep = !!step && step.kind !== "review" && step.formIds.includes("road-test");
    const checklist = getChecklist(tpl?.checklistId);
    // Hiring review shows only Stage 1 (the hiring decision); later stages are completed in Onboarding.
    const reviewChecklist = checklist ? { ...checklist, stages: checklist.stages.slice(0, 1) } : undefined;
    const clState = a.checklistState ?? {};
    // The step's required items (forms + license uploads). Empty for review / employment steps (handled specially).
    // A license form holds a LIST of licenses → expand into one row per license.
    const baseItems = step && step.kind !== "review" && !isEmpStep && !isRoadTestStep ? stepItems(step) : [];
    const items = baseItems.flatMap((it) => {
        if (it.fid !== "driver-license" || pf.licenses.length === 0) return [it];
        return pf.licenses.map((l, i) => ({ ...it, id: `driver-license:${i}`, label: `License ${i + 1}${l.number ? ` · ${l.number}` : ""}`, licIndex: i }));
    });

    // ── application & packet documents ──
    const appSections: DocSection[] = (a.submission ?? []).map((s) => ({ title: s.title, groups: s.groups.map((g) => ({ label: g.label, rows: g.fields.map((f) => ({ label: f.label, value: f.value })) })) }));
    const totalDocs = steps.reduce((n, s) => n + s.formIds.length, 0);
    const doneDocs = steps.reduce((n, s) => n + s.formIds.filter((f) => DONE_STATES.includes(docOf(f))).length, 0);
    const consents = steps.reduce((n, s) => n + s.formIds.filter((f) => stepGroup(f) === "Policy").length, 0);
    const doneSteps = steps.filter(isStepDone).length;
    const openRequests = (a.requests ?? []).filter((r) => r.status === "open");
    const phase = STATUS_META[a.status];
    const pipelineDays = Math.max(0, Math.floor((Date.now() - (Date.parse(a.invitedAt) || Date.now())) / 86_400_000));
    // Remarks added on a review page — tagged with the review target so they show on that page + in the global notes.
    const addReviewNote = (formId: string, formLabel: string, text: string) => { const t = text.trim(); if (!t) return; updateOne(a.id, (prev) => ({ remarks: [{ id: `rm-${Date.now()}`, text: t, at: new Date().toLocaleString(), author: ACTOR, formId, formLabel }, ...prev.remarks], events: [{ id: `ev-${Date.now()}`, type: "note", text: `Remark (${formLabel}): ${t}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
    if (openForm === "application") {
        const appTitle = `${formName(a.formId)} Application`;
        const appSubtitle = `${a.firstName} ${a.lastName} · ${a.email}`;
        const appBadge = (formRegion(a.formId) || "").toUpperCase() || undefined;
        const appFile = `${a.firstName}-${a.lastName}-application.pdf`;
        const appStepId = steps.find((s) => s.kind === "app")?.id;
        const reviewApp = (r: ReviewSignoff) => updateOne(a.id, (prev) => ({ reviews: { ...(prev.reviews ?? {}), application: r }, stepStatus: appStepId ? { ...(prev.stepStatus ?? {}), [appStepId]: "reviewed" } : prev.stepStatus, events: [{ id: `ev-${Date.now()}`, type: "review", text: `Reviewed & signed the application — ${r.by}`, at: Date.now(), author: ACTOR }, ...prev.events] }));
        return <ApplicationFormView title={appTitle} subtitle={appSubtitle} badge={appBadge} sections={appSections} fileName={appFile} focusSection={appSection} licenses={pf.licenses} employment={pf.employment} empDocStatus={(i, key) => docOf(`doc:emp-${i}:${key}`)} uploads={a.uploads} existingReview={a.reviews?.application} remarks={a.remarks.filter((r) => r.formId === "application")} onAddRemark={(t) => addReviewNote("application", "Application", t)} onBack={() => { setOpenForm(null); setAppSection(null); }} onReview={reviewApp}
            documentProps={{ title: appTitle, subtitle: appSubtitle, badge: appBadge, sections: appSections, fileName: appFile, onBack: () => setOpenForm(null), backLabel: "Hiring file", emptyTitle: "Application not submitted yet", emptyText: "The driver is still completing the application. Once submitted, it appears here as a document you can print or download." }} />;
    }
    if (openForm && openForm.startsWith("driver-license")) {
        const focusIndex = openForm.includes(":") ? Number(openForm.split(":")[1]) : undefined;
        const licStepId = steps.find((s) => s.formIds.includes("driver-license"))?.id;
        const licKey = (i: number | undefined) => i !== undefined ? `driver-license:${i}` : "driver-license";
        const reviewLic = (r: ReviewSignoff) => updateOne(a.id, (prev) => {
            const reviews = { ...(prev.reviews ?? {}), [licKey(focusIndex)]: r };
            // The step is "Reviewed" only once every license has been signed off.
            const allReviewed = pf.licenses.length > 0 && pf.licenses.every((_, i) => reviews[licKey(i)]);
            return {
                reviews,
                stepStatus: licStepId && allReviewed ? { ...(prev.stepStatus ?? {}), [licStepId]: "reviewed" as StepStatus } : prev.stepStatus,
                docs: allReviewed ? { ...(prev.docs ?? {}), "driver-license": "verified" as DocStatus } : prev.docs,
                events: [{ id: `ev-${Date.now()}`, type: "review", text: allReviewed ? `Reviewed & signed all driver licenses — ${r.by}` : `Reviewed & signed License ${(focusIndex ?? 0) + 1} — ${r.by}`, at: Date.now(), author: ACTOR }, ...prev.events],
            };
        });
        return <LicenseReviewView a={a} pf={pf} focusIndex={focusIndex} existingReview={a.reviews?.[licKey(focusIndex)]} remarks={a.remarks.filter((r) => r.formId === licKey(focusIndex))} onAddRemark={(t) => addReviewNote(licKey(focusIndex), focusIndex !== undefined ? `License ${focusIndex + 1}` : "Driver Licenses", t)} onBack={() => setOpenForm(null)} onReview={reviewLic} />;
    }
    if (empReview) {
        const empStepId = steps.find((s) => s.formIds.includes("dot-verification") || s.formIds.includes("employment-verification"))?.id;
        const base: EmpCheck[] = pf.employment.map((e, i) => ({ id: `emp-${i}`, employer: e.employer, position: e.position, dates: e.dates, email: "", attempts: [], status: "pending" }));
        const checks = base.map((b) => (a.empChecks ?? []).find((c) => c.id === b.id) ?? b);
        const idx = checks.findIndex((c) => c.id === empReview);
        const check = checks[idx];
        const reviewEmp = (r: ReviewSignoff) => updateOne(a.id, (prev) => {
            const reviews = { ...(prev.reviews ?? {}), [`employment:${empReview}`]: r };
            const allReviewed = pf.employment.length > 0 && pf.employment.every((_, i) => reviews[`employment:emp-${i}`]);
            return {
                reviews,
                stepStatus: empStepId && allReviewed ? { ...(prev.stepStatus ?? {}), [empStepId]: "reviewed" as StepStatus } : prev.stepStatus,
                events: [{ id: `ev-${Date.now()}`, type: "review", text: allReviewed ? `Reviewed & signed all employment history — ${r.by}` : `Reviewed & signed employer ${check?.employer ?? idx + 1} — ${r.by}`, at: Date.now(), author: ACTOR }, ...prev.events],
            };
        });
        // One-click fulfilment for the actionable checklist items on the review page.
        const fulfill = (kind: "send" | "respond" | "verify" | "doc", docKey?: string, attempt?: number) => updateOne(a.id, (prev) => {
            if (kind === "doc" && docKey) return { docs: { ...(prev.docs ?? {}), [docKey]: "received" as DocStatus }, events: [{ id: `ev-${Date.now()}`, type: "doc", text: `Marked received — ${docKey.split(":").slice(-1)[0]} (${check.employer})`, at: Date.now(), author: ACTOR }, ...prev.events] };
            const cur = base.map((b) => (prev.empChecks ?? []).find((c) => c.id === b.id) ?? b);
            const next = cur.map((c) => {
                if (c.id !== empReview) return c;
                if (kind === "send") return { ...c, status: "sent" as const, attempts: [...c.attempts, { at: Date.now(), method: "Email" as RequestChannel, to: c.email || "" }] };
                if (kind === "respond") return { ...c, status: "responded" as const, respondedAt: Date.now(), respondedAttempt: attempt ?? c.attempts.length - 1 };
                return { ...c, status: "verified" as const, verifiedAt: Date.now() };
            });
            const verb = kind === "send" ? "Sent verification request" : kind === "respond" ? "Recorded employer response" : "Verified employment";
            return { empChecks: next, events: [{ id: `ev-${Date.now()}`, type: "emp", text: `${verb} — ${check.employer}`, at: Date.now(), author: ACTOR }, ...prev.events] };
        });
        // Editable-email verification request — records an attempt with the entered address; for a
        // specific document it also marks that document requested.
        const sendEmpRequest = (req: { to: string; subject: string; message: string; verifyData?: boolean; docKeys?: string[]; docLabels?: string[] }) => updateOne(a.id, (prev) => {
            const cur = base.map((b) => (prev.empChecks ?? []).find((c) => c.id === b.id) ?? b);
            const next = cur.map((c) => (c.id === empReview ? { ...c, email: req.to || c.email, status: (c.status === "pending" ? "sent" : c.status) as EmpCheck["status"], attempts: [...c.attempts, { at: Date.now(), method: "Email" as RequestChannel, to: req.to || "" }] } : c));
            const docs = { ...(prev.docs ?? {}) };
            (req.docKeys ?? []).forEach((k) => { if (!DONE_STATES.includes(docs[k])) docs[k] = "requested" as DocStatus; });
            const what = [req.docLabels?.length ? req.docLabels.join(", ") : "", req.verifyData ? "confirm employment details" : ""].filter(Boolean).join(" + ");
            return {
                empChecks: next,
                docs,
                events: [{ id: `ev-${Date.now()}`, type: "request", text: `Sent verification request to ${check.employer}${what ? ` — ${what}` : ""} via Email`, at: Date.now(), author: ACTOR }, ...prev.events],
            };
        });
        // Forwarding an uploaded document to a third party (issuer / insurer / agency) — logged only.
        const sendDocThirdParty = (p: { docLabel: string; org: string; to: string }) => updateOne(a.id, (prev) => ({
            events: [{ id: `ev-${Date.now()}`, type: "request", text: `Sent ${p.docLabel} to ${p.org || p.to || "third party"} for verification`, at: Date.now(), author: ACTOR }, ...prev.events],
        }));
        if (!check) { setEmpReview(null); return null; }
        return <EmploymentReviewView a={a} check={check} filled={pf.employment[idx]} index={idx} total={checks.length} existingReview={a.reviews?.[`employment:${empReview}`]} remarks={a.remarks.filter((r) => r.formId === `employment:${empReview}`)} onAddRemark={(t) => addReviewNote(`employment:${empReview}`, check?.employer ?? "Employer", t)} onFulfill={fulfill} onRequest={sendEmpRequest} onSendDoc={sendDocThirdParty} onBack={() => setEmpReview(null)} onReview={reviewEmp} />;
    }
    if (openForm) return <PrefillProvider value={buildPrefill(a)}><HiringFormView formId={openForm} startPreview={formPreview} roadTestValues={a.roadTest?.formValues}
        roadTestNote={openForm === "road-test" && a.roadTest?.examiner ? { examiner: a.roadTest.examiner, driver: `${a.firstName} ${a.lastName}`.trim() } : undefined}
        onSaveValues={(values) => {
            if (!values || Object.keys(values).length === 0) return;
            const fm = typeof values["f-ats-rt-equiv-method"] === "string" ? ROAD_TEST_METHOD_BY_FORM[values["f-ats-rt-equiv-method"] as string] : undefined;
            updateOne(a.id, (prev) => ({ roadTest: { ...(prev.roadTest ?? {}), formValues: values, ...(fm ? { method: fm } : {}) } }));
        }}
        onSignOff={(info) => {
        if (openForm === "road-test") {
            const m = info?.method ? ROAD_TEST_METHOD_BY_FORM[info.method] : undefined;
            const documents = info?.docs as RoadTestDoc[] | undefined;
            updateOne(a.id, (prev) => ({ roadTest: { ...(prev.roadTest ?? {}), ...(m ? { method: m } : {}), ...(documents ? { documents } : {}), ...(info?.values ? { formValues: info.values } : {}) } }));
            setDoc(openForm, "received", "Road test recorded");
        } else setDoc(openForm, "verified", "Reviewed & signed");
    }} onBack={() => { setOpenForm(null); setFormPreview(false); }} /></PrefillProvider>;
    if (openConsent) {
        const allConsentIds = (steps.find((s) => s.kind === "app")?.formIds ?? []).filter((f) => stepGroup(f) === "Policy");
        const consentIds = consentFocus ? allConsentIds.filter((f) => f === consentFocus) : allConsentIds;
        const markReceived = (f: string) => updateOne(a.id, (prev) => ({ docs: { ...(prev.docs ?? {}), [f]: "received" as DocStatus }, events: [{ id: `ev-${Date.now()}`, type: "doc", text: `Marked received — ${stepName(f)}`, at: Date.now(), author: ACTOR }, ...prev.events] }));
        const appStepId = steps.find((s) => s.kind === "app")?.id;
        const reviewConsents = (r: ReviewSignoff) => updateOne(a.id, (prev) => ({ reviews: { ...(prev.reviews ?? {}), consents: r }, stepStatus: appStepId ? { ...(prev.stepStatus ?? {}), [appStepId]: "reviewed" } : prev.stepStatus, events: [{ id: `ev-${Date.now()}`, type: "review", text: `Reviewed & signed all consent forms — ${r.by}`, at: Date.now(), author: ACTOR }, ...prev.events] }));
        return <ConsentReviewView consents={consentIds} pf={pf} statusOf={docOf} existingReview={a.reviews?.consents} initialMode={consentView} onReceived={markReceived} onReview={reviewConsents} onBack={() => { setOpenConsent(null); setConsentFocus(null); }} />;
    }
    if (showPacket) {
        const packetSections: DocSection[] = [
            { title: "Hiring File Summary", groups: [{ rows: [
                { label: "Applicant", value: `${a.firstName} ${a.lastName}` }, { label: "Email", value: a.email }, { label: "Phone", value: a.phone ?? "—" },
                { label: "Position", value: a.position ?? "Driver" }, { label: "Carrier", value: a.carrier }, { label: "Hiring Workflow", value: tpl?.name ?? "—" },
                { label: "Status", value: STATUS_META[a.status].label }, { label: "Applied", value: a.invitedAt },
                { label: "Steps complete", value: `${doneSteps}/${steps.length}` }, { label: "Documents in", value: `${doneDocs}/${totalDocs}` },
            ] }] },
            ...appSections,
            { title: "Documents Checklist", groups: steps.map((s) => ({ label: s.title, rows: s.formIds.map((f) => ({ label: stepName(f), value: DOC_STATUS_META[docOf(f)].label })) })) },
        ];
        return <ThemedDocumentViewer title={`Hiring File — ${a.firstName} ${a.lastName}`} subtitle={`${tpl?.name} · ${a.carrier}`} badge={STATUS_META[a.status].label.toUpperCase()} sections={packetSections} fileName={`${a.firstName}-${a.lastName}-hiring-file.pdf`} onBack={() => setShowPacket(false)} backLabel="Hiring file" />;
    }
    if (pdfReview !== null) return <HiringPdfReview a={a} tpl={tpl} initialStep={pdfReview} onBack={() => setPdfReview(null)}
        onRequest={(fid) => { setPdfReview(null); setReqOpen(requestPrefill(fid, a.email)); }}
        onToggleComplete={(idx) => {
            const s = steps[idx]; if (!s) return;
            const done = stepDone(s);
            updateOne(a.id, (prev) => {
                const docs = { ...(prev.docs ?? {}) };
                s.formIds.forEach((f) => { docs[f] = done ? "pending" : "received"; });
                return { docs, events: [{ id: `ev-${Date.now()}`, type: "step", text: `${done ? "Reopened" : "Completed"} step — ${s.title}`, at: Date.now(), author: ACTOR }, ...prev.events] };
            });
        }} />;
    if (showChecklistPdf && reviewChecklist) return <ThemedDocumentViewer title={`${reviewChecklist.name} — ${a.firstName} ${a.lastName}`} subtitle={`${tpl?.name} · ${a.carrier}`} badge="CHECKLIST" sections={buildChecklistSections(reviewChecklist, clState, pf, a.carrier)} fileName={`${a.firstName}-${a.lastName}-checklist.pdf`} onBack={() => setShowChecklistPdf(false)} backLabel="Hiring file" />;

    // ── mutations ──
    const setDoc = (fid: string, to: DocStatus, verb: string) => updateOne(a.id, (prev) => {
        const resolved = (to === "received" || to === "verified" || to === "skipped");
        return {
            docs: { ...(prev.docs ?? {}), [fid]: to },
            requests: resolved ? (prev.requests ?? []).map((r) => (r.fid === fid && r.status === "open" ? { ...r, status: "resolved" as const } : r)) : prev.requests,
            events: [{ id: `ev-${Date.now()}`, type: "doc", text: `${verb} — ${stepName(fid)}`, at: Date.now(), author: ACTOR }, ...prev.events],
        };
    });
    // Upload popup → store the file against the item and mark it received (resolving any open request).
    const saveUpload = (item: StepItem, fileName: string) => {
        const fid = item.fid ?? item.id;
        const upId = `up:${item.id}`;
        updateOne(a.id, (prev) => ({
            uploads: [...(prev.uploads ?? []).filter((u) => u.id !== upId), { id: upId, label: item.label, file: fileName, category: item.label }],
            docs: { ...(prev.docs ?? {}), [fid]: "received" as DocStatus },
            requests: (prev.requests ?? []).map((r) => (r.fid === fid && r.status === "open" ? { ...r, status: "resolved" as const } : r)),
            events: [{ id: `ev-${Date.now()}`, type: "doc", text: `${FULFILL_VERB.upload} — ${item.label}`, at: Date.now(), author: ACTOR }, ...prev.events],
        }));
        setUploadFor(null);
    };
    // Set the per-step review status (initial → waiting → reviewed → complete / incomplete).
    const setStepStatus = (s: HiringTemplate["steps"][number], to: StepStatus) => updateOne(a.id, (prev) => ({
        stepStatus: { ...(prev.stepStatus ?? {}), [s.id]: to },
        events: [{ id: `ev-${Date.now()}`, type: "step", text: `${STEP_STATUS_META[to].label} — ${s.title}`, at: Date.now(), author: ACTOR }, ...prev.events],
    }));
    const setStatus = (s: AppStatus) => updateOne(a.id, { status: s });
    const setClField = (id: string, v: string) => updateOne(a.id, (prev) => ({ checklistState: { ...prev.checklistState, fields: { ...(prev.checklistState?.fields ?? {}), [id]: v } } }));
    const toggleClItem = (id: string, v: boolean) => updateOne(a.id, (prev) => ({ checklistState: { ...prev.checklistState, items: { ...(prev.checklistState?.items ?? {}), [id]: v } } }));
    const setClSig = (stageId: string, v: string) => updateOne(a.id, (prev) => ({ checklistState: { ...prev.checklistState, sigs: { ...(prev.checklistState?.sigs ?? {}), [stageId]: v } } }));
    const submitRequest = (req: Partial<AppRequest>) => updateOne(a.id, (prev) => {
        const full: AppRequest = { id: `rq-${Date.now()}`, status: "open", at: Date.now(), by: ACTOR, action: req.action ?? "Request", subject: req.subject ?? "Request", recipient: req.recipient ?? "Driver", channel: req.channel ?? "Email", message: req.message ?? "", fid: req.fid, to: req.to, dueDate: req.dueDate };
        const verb = full.action === "Order" ? "Ordered" : full.action === "Alert" ? "Alerted" : full.action === "Review" ? "Assigned review to" : "Requested from";
        return {
            requests: [full, ...(prev.requests ?? [])],
            docs: req.fid ? { ...(prev.docs ?? {}), [req.fid]: "requested" as DocStatus } : prev.docs,
            events: [{ id: `ev-${Date.now()}`, type: "request", text: `${verb} ${full.recipient}: “${full.subject}” via ${full.channel}`, at: Date.now(), author: ACTOR }, ...prev.events],
        };
    });
    const resolveRequest = (r: AppRequest) => { if (r.fid) setDoc(r.fid, "received", "Recorded output"); else updateOne(a.id, (prev) => ({ requests: (prev.requests ?? []).map((x) => (x.id === r.id ? { ...x, status: "resolved" as const } : x)), events: [{ id: `ev-${Date.now()}`, type: "resolve", text: `Resolved request — ${r.subject}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
    const addNote = () => { if (!note.trim()) return; const text = note.trim(); setNote(""); updateOne(a.id, (prev) => ({ remarks: [{ id: `rm-${Date.now()}`, text, at: new Date().toLocaleString(), author: ACTOR }, ...prev.remarks], events: [{ id: `ev-${Date.now()}`, type: "note", text: `Note: ${text}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
    const openRequestFor = (fid?: string) => setReqOpen(requestPrefill(fid, a.email));

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="space-y-5 px-6 py-6 lg:px-8">
                {/* Header */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"><ChevronLeft className="h-4 w-4" /> Back to List</button>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">{(a.firstName[0] ?? "") + (a.lastName[0] ?? "")}</div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Application File</p>
                                <h1 className="text-2xl font-bold text-slate-900">{a.firstName} {a.lastName}</h1>
                                <p className="mt-0.5 text-sm text-slate-500">{formName(a.formId)} · {a.position ?? "Driver"} · Applied {a.invitedAt} · {pipelineDays}d in pipeline</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => updateOne(a.id, (prev) => ({ events: [{ id: `ev-${Date.now()}`, type: "invited", text: `Invite re-sent to ${a.email}`, at: Date.now(), author: ACTOR }, ...prev.events] }))}><Send className="h-4 w-4" /> Resend invite</Button>
                            <Button variant="outline" size="sm" onClick={() => window.alert("Opening applicant portal…")}><ExternalLink className="h-4 w-4" /> Portal</Button>
                            <Button variant="outline" size="sm" onClick={() => setPdfReview(sel)}><FileText className="h-4 w-4" /> Review (PDF)</Button>
                        </div>
                    </div>
                </div>

                {/* Status banner */}
                <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <Send className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Linked to Application Tracking</p>
                            <p className="text-xs text-slate-500">Invited {relativeTime(Date.parse(a.invitedAt) || Date.now())} · {tpl?.name} · {doneSteps}/{steps.length} steps complete · <span className="font-medium text-slate-600">{PHASE_TEXT[a.status]}</span></p>
                        </div>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-bold sm:self-auto", phase.badge)}><phase.Icon className="h-3.5 w-3.5" /> {phase.label}</span>
                </div>

                {/* Workflow row */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:gap-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Hiring Workflow</span>
                        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800">{tpl?.name} <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">ASSIGNED</span></span>
                    </div>
                    <p className="flex-1 truncate text-sm text-slate-500">{tpl?.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                        <span><span className="font-bold text-slate-600">{steps.length}</span> steps</span>
                        <span><span className="font-bold text-slate-600">{consents}</span> consents</span>
                        <span><span className="font-bold text-slate-600">{totalDocs}</span> docs</span>
                    </div>
                </div>

                {/* Clickable stepper */}
                <div className="rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <div className="overflow-x-auto pb-1">
                        <div className="flex min-w-max items-start">
                            {steps.map((s, i) => {
                                const done = isStepDone(s);
                                const isSel = i === sel;
                                const isCurrent = i === currentIdx;
                                return (
                                    <button key={s.id} type="button" onClick={() => setSelected(i)} className="relative flex min-w-[124px] flex-1 flex-col items-center px-1 outline-none">
                                        {i > 0 && <span className="absolute left-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: i <= currentIdx || currentIdx === -1 ? "#10b981" : "#e2e8f0" }} />}
                                        {i < steps.length - 1 && <span className="absolute right-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: (i < currentIdx || currentIdx === -1) ? "#10b981" : "#e2e8f0" }} />}
                                        <span className={cn("z-10 flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold transition",
                                            done ? "bg-emerald-500 text-white" : isCurrent ? "bg-amber-500 text-white ring-4 ring-amber-100" : isSel ? "bg-blue-600 text-white ring-4 ring-blue-100" : "border-2 border-slate-200 bg-white text-slate-400")}>
                                            {done ? <Check className="h-4 w-4" /> : isCurrent ? <span className="h-2 w-2 rounded-full bg-white" /> : i + 1}
                                        </span>
                                        <span className={cn("mt-2 line-clamp-2 max-w-[116px] text-center text-[10px] font-bold uppercase leading-tight tracking-wide", isSel ? "text-blue-700" : "text-slate-500")}>{s.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main grid */}
                <div className="flex flex-col gap-5 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-4">
                        {step && (
                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Step {sel + 1} of {steps.length}</p>
                                            <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
                                        </div>
                                        {(() => { const m = STEP_STATUS_META[stepStatusOf(step)]; return (
                                            <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", m.tone)}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} /> {m.label}
                                            </span>
                                        ); })()}
                                    </div>
                                    <div className="ml-auto flex flex-wrap gap-2">
                                        <MarkMenu current={stepStatusOf(step)} onSet={(to) => setStepStatus(step, to)} />
                                    </div>
                                </div>
                                {step.kind === "review" ? (
                                    <div className="space-y-6 p-5">
                                        {reviewChecklist && (() => {
                                            const { done, total } = checklistProgress(reviewChecklist, clState);
                                            return (
                                                <div>
                                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Approval Checklist · Hiring</p>
                                                            <h3 className="text-base font-semibold text-slate-900">{reviewChecklist.name} <span className="ml-1 text-xs font-medium text-slate-400">{done}/{total} done</span></h3>
                                                        </div>
                                                        <Button variant="outline" size="sm" onClick={() => setShowChecklistPdf(true)}><FileText className="h-4 w-4" /> Checklist (PDF)</Button>
                                                    </div>
                                                    <ChecklistRunner checklist={reviewChecklist} state={clState} pf={pf} company={a.carrier} onField={setClField} onToggle={toggleClItem} onSig={setClSig} />
                                                    <p className="mt-2 text-xs text-slate-400">Only the hiring stage is shown here — interview &amp; onboarding stages are completed in Onboarding.</p>
                                                </div>
                                            );
                                        })()}
                                        <DecisionPanel a={a} steps={steps} doneDocs={doneDocs} totalDocs={totalDocs} doneSteps={doneSteps} setStatus={setStatus} onPacket={() => setShowPacket(true)} />
                                    </div>
                                ) : isEmpStep ? (
                                    <EmploymentModule a={a} fid={empFid!} employment={pf.employment} unemployment={pf.unemployment} updateOne={updateOne} onPdf={() => setPdfReview(sel)} onReviewEmployer={(c) => setEmpReview(c.id)} reviews={a.reviews} />
                                ) : isRoadTestStep ? (
                                    <RoadTestModule a={a} updateOne={updateOne}
                                        review={a.reviews?.["road-test"]}
                                        onReview={(r) => updateOne(a.id, (prev) => ({
                                            reviews: { ...(prev.reviews ?? {}), "road-test": r },
                                            stepStatus: { ...(prev.stepStatus ?? {}), [step.id]: "complete" as StepStatus },
                                            events: [{ id: `ev-${Date.now()}`, type: "review", text: `Reviewed & signed off the road test — ${r.by}`, at: Date.now(), author: ACTOR }, ...prev.events],
                                        }))}
                                        onOpenForm={() => { setFormPreview(false); setOpenForm("road-test"); }}
                                        onPreviewForm={() => { setFormPreview(true); setOpenForm("road-test"); }} />
                                ) : (
                                    <div className="space-y-2.5 p-5">
                                        {items.map((item) => (
                                            <StepItemRow key={item.id} item={item} a={a} mode={item.fid ? stepFormMode(step, item.fid) : "upload"}
                                                review={item.fid === "application" ? a.reviews?.application : item.fid === "driver-license" ? a.reviews?.[`driver-license:${item.licIndex ?? 0}`] : item.kind === "consent" ? a.reviews?.consents : undefined}
                                                subItems={
                                                    item.kind === "consent"
                                                        ? (item.subIds ?? []).map((fid) => ({ id: fid, label: stepName(fid), status: (a.docs?.[fid] ?? (a.submission ? "received" : "pending")) as DocStatus, onView: () => { setFormPreview(false); setConsentView("form"); setConsentFocus(fid); setOpenConsent(fid); }, onPdf: () => { setConsentView("document"); setConsentFocus(fid); setOpenConsent(fid); } }))
                                                        : item.fid === "application"
                                                            ? (a.submission ?? []).map((s) => ({ id: s.title, label: s.title, onView: () => { setFormPreview(false); setAppSection(s.title); setOpenForm("application"); } }))
                                                            : undefined
                                                }
                                                onForm={(vw) => { setFormPreview(false); if (item.kind === "consent") { setConsentView(vw === "document" ? "document" : "form"); setOpenConsent(item.subIds?.[0] ?? null); } else if (item.fid === "driver-license") setOpenForm(`driver-license:${item.licIndex ?? 0}`); else if (item.fid) setOpenForm(item.fid); }} onPdf={() => { if (item.kind === "form" && item.fid && item.fid !== "application" && item.fid !== "driver-license") { setFormPreview(true); setOpenForm(item.fid); } else setPdfReview(sel); }} onUpload={() => setUploadFor(item)} onRequest={() => openRequestFor(item.fid)} onSet={(to, verb) => { if (item.kind === "consent") (item.subIds ?? []).forEach((f) => setDoc(f, to, verb)); else setDoc(item.fid ?? item.id, to, verb); }} />
                                        ))}
                                        {items.length === 0 && <p className="text-sm text-slate-400">No items in this step.</p>}
                                        {step?.kind === "app" && <DocumentsRow items={[
                                            ...(a.uploads ?? []).map((u) => ({ id: u.id, label: u.label, sublabel: `${u.file} · ${u.category}`, onView: () => setDocPreview(u) })),
                                            ...pf.employment.flatMap((e, i) => EMPLOYER_VERIFICATION_DOCS.map((d) => {
                                                const st = docOf(`doc:emp-${i}:${d.key}`);
                                                const provided = DONE_STATES.includes(st);
                                                return { id: `emp-${i}-${d.key}`, label: d.label, sublabel: e.employer || `Employer ${i + 1}`, status: st, onView: provided ? () => setDocPreview({ id: `emp-${i}-${d.key}`, label: d.label, file: `${d.label}.pdf`, category: "Employment Verification" }) : undefined };
                                            })),
                                        ]} />}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes & comments */}
                        <Card title="Notes & Comments" icon={StickyNote}>
                            <div className="flex gap-2">
                                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add an internal note or comment…" className="resize-none" />
                                <Button size="sm" className="self-end" onClick={addNote} disabled={!note.trim()}>Add</Button>
                            </div>
                            <div className="mt-3 space-y-2">
                                {a.remarks.map((r) => (
                                    <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                        {(r.formLabel || r.stepTitle) && <span className="mb-1 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">{r.formLabel ?? r.stepTitle}</span>}
                                        <p className="text-[13px] text-slate-700">{r.text}</p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">{r.author} · {r.at}</p>
                                    </div>
                                ))}
                                {a.remarks.length === 0 && <p className="text-xs text-slate-400">No notes yet.</p>}
                            </div>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full shrink-0 space-y-4 lg:w-[300px]">
                        <RequestsCard requests={openRequests} onResolve={resolveRequest} onNew={() => openRequestFor(step?.formIds[0])} />
                        <ActivityCard a={a} />
                    </div>
                </div>
            </div>

            {reqOpen && <RequestDialog prefill={reqOpen} driverEmail={a.email} onClose={() => setReqOpen(null)} onSubmit={(req) => { submitRequest(req); setReqOpen(null); }} />}
            {uploadFor && <UploadDialog item={uploadFor} onClose={() => setUploadFor(null)} onUpload={(name) => saveUpload(uploadFor, name)} />}
            {docPreview && (
                <Dialog open onOpenChange={(o) => { if (!o) setDocPreview(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{docPreview.label}</DialogTitle></DialogHeader>
                        <div className="px-6 pb-6">
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <FileText className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">{docPreview.file}</p>
                                <p className="text-xs text-slate-400">Image preview unavailable in this prototype.</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// ── Step status dropdown — full lifecycle: initial → waiting → reviewed → complete / incomplete
const STEP_STATUS_FLOW: { value: StepStatus; icon: React.ElementType }[] = [
    { value: "initial", icon: RotateCcw },
    { value: "waiting", icon: Clock },
    { value: "reviewed", icon: BadgeCheck },
    { value: "complete", icon: Check },
    { value: "incomplete", icon: AlertCircle },
];
function MarkMenu({ current, onSet }: { current: StepStatus; onSet: (to: StepStatus) => void }) {
    const [open, setOpen] = useState(false);
    const cur = STEP_STATUS_META[current];
    return (
        <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
                <span className={cn("h-2 w-2 rounded-full", cur.dot)} /> {cur.label} <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Set step status</p>
                        {STEP_STATUS_FLOW.map(({ value, icon: Icon }) => {
                            const m = STEP_STATUS_META[value];
                            const active = value === current;
                            return (
                                <button key={value} type="button" onClick={() => { onSet(value); setOpen(false); }}
                                    className={cn("flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50", active ? "font-semibold text-slate-900" : "text-slate-700")}>
                                    <Icon className={cn("h-4 w-4", active ? "text-blue-600" : "text-slate-400")} /> {m.label}
                                    {active && <Check className="ml-auto h-4 w-4 text-blue-600" />}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Hiring-manager review form — name, role, date & signature (who reviewed it) ──
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function ReviewSignOff({ label, signedNote, existing, onConfirm }: { label: string; signedNote?: string; existing?: ReviewSignoff; onConfirm: (r: { sig: string; by: string; role: string; date: string }) => void }) {
    const [name, setName] = useState(existing?.by ?? ACTOR);
    const [role, setRole] = useState(existing?.role ?? "Hiring Manager");
    const [date, setDate] = useState(existing?.date ?? todayISO());
    const [sig, setSig] = useState(existing?.sig ?? "");
    const [done, setDone] = useState(!!existing);
    return (
        <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Reviewer Sign-Off</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900">{label}</h3>
            <p className="mt-1 text-sm text-slate-500">Confirm you have reviewed the form above. Your name, title, date and signature are recorded on file.</p>
            {done ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> {signedNote ?? "Reviewed & signed"}</p>
                    <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                        <p><span className="text-slate-500">Reviewed by:</span> <span className="font-semibold text-slate-800">{name}</span></p>
                        <p><span className="text-slate-500">Title:</span> <span className="font-semibold text-slate-800">{role}</span></p>
                        <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{date}</span></p>
                    </div>
                    {sig && <div className="mt-3"><span className="text-sm text-slate-500">Signature:</span><img src={sig} alt="signature" className="mt-1 h-16 rounded border border-slate-200 bg-white" /></div>}
                </div>
            ) : (
                <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Reviewer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Title / role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
                        <div><Label className="mb-1 block text-xs font-semibold text-slate-600">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                    </div>
                    <div className="mt-4"><Label className="mb-1 block text-xs font-semibold text-slate-600">Signature</Label><SignaturePad onChange={setSig} /></div>
                    <Button className="mt-4" disabled={!sig || !name.trim()} onClick={() => { onConfirm({ sig, by: name.trim(), role: role.trim(), date }); setDone(true); }}><Check className="h-4 w-4" /> Confirm review &amp; sign</Button>
                </>
            )}
        </div>
    );
}

// ── "Someone reviewed this" banner (shown on the file once a sign-off is recorded) ──
function ReviewedBanner({ review }: { review: ReviewSignoff }) {
    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700"><BadgeCheck className="h-4 w-4" /> Reviewed &amp; signed</span>
            <span className="text-[13px] text-slate-600">by <span className="font-semibold text-slate-800">{review.by}</span>{review.role ? ` · ${review.role}` : ""} · {review.date}</span>
            {review.sig && <img src={review.sig} alt="signature" className="ml-auto h-9 rounded border border-blue-200 bg-white" />}
        </div>
    );
}

// Remarks & comments block for a review page.
function ReviewRemarks({ remarks, onAdd }: { remarks: Remark[]; onAdd: (text: string) => void }) {
    const [draft, setDraft] = useState("");
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Remarks &amp; Comments</p>
            <div className="mt-2 flex gap-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Add a remark or comment…" className="resize-none" />
                <Button size="sm" className="self-end" disabled={!draft.trim()} onClick={() => { onAdd(draft); setDraft(""); }}>Add</Button>
            </div>
            {remarks.length > 0 && (
                <div className="mt-3 space-y-2">
                    {remarks.map((r) => (
                        <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                            <p className="text-[13px] text-slate-700">{r.text}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{r.author} · {r.at}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Read-only application FORM view (form-style fields) + reviewer sign-off ──────
function RoField({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
            <div className="min-h-[38px] rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-800">{value || <span className="text-slate-300">—</span>}</div>
        </div>
    );
}

// A single ✓/✗ review-checklist line, with an optional one-click action that fulfils it.
function CheckLine({ ok, label, actionLabel, onAction }: { ok: boolean; label: string; actionLabel?: string; onAction?: () => void }) {
    return (
        <li className="flex items-center gap-2 text-sm">
            {ok ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />}
            <span className={ok ? "text-slate-700" : "text-amber-700"}>{label}</span>
            {!ok && onAction && (
                <button type="button" onClick={onAction} className="ml-auto shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100">{actionLabel ?? "Complete"}</button>
            )}
        </li>
    );
}

// An uploaded license-image tile (front / back) with a View option, or a "not provided" placeholder.
function LicenseImageTile({ title, file, onView }: { title: string; file?: UploadedFile; onView: () => void }) {
    return (
        <div>
            <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
            {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm"><FileText className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{file.file}</p>
                        <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Uploaded</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={onView}><Eye className="h-3.5 w-3.5" /> View</Button>
                </div>
            ) : (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-amber-400 shadow-sm"><Upload className="h-5 w-5" /></div>
                    <div><p className="text-sm font-semibold text-amber-700">Not provided</p><p className="text-xs text-amber-600">No image on file</p></div>
                </div>
            )}
        </div>
    );
}

// A From → To date chip shown on history entries (address, employment, …).
function FromToChip({ from, to }: { from: string; to: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-normal text-slate-400">From</span> {from || "—"}
            <span className="font-normal text-slate-400">to</span> {to || "Present"}
        </span>
    );
}

// The standard employer verification documents, obtained from the previous employer at hiring.
const EMPLOYER_VERIFICATION_DOCS = [
    { key: "experience", label: "Employer Experience Letter" },
    { key: "insurance", label: "Employer Insurance Experience Letter" },
];

// A verification-document tile (license-style): name + provided status + View when on file.
function VerificationDocTile({ label, status, onView }: { label: string; status: DocStatus; onView: () => void }) {
    const provided = DONE_STATES.includes(status);
    const prov = provided ? "Yes" : status === "requested" ? "Request from Employer" : "No";
    const badge = provided ? "bg-emerald-100 text-emerald-700" : status === "requested" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
    const tint = provided ? "border-emerald-200 bg-emerald-50/50" : status === "requested" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-white";
    return (
        <div className={cn("flex items-center gap-3 rounded-xl border p-3", tint)}>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm", provided ? "text-emerald-500" : "text-slate-400")}><FileText className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-0.5 text-xs"><span className="text-slate-400">Provided: </span><span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", badge)}>{prov}</span></p>
            </div>
            {provided && <Button variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={onView}><Eye className="h-3.5 w-3.5" /> View</Button>}
        </div>
    );
}

// ── Driver-license review — one dedicated section per license + reviewer sign-off ──
function LicenseReviewView({ a, pf, focusIndex, existingReview, remarks, onAddRemark, onBack, onReview }: {
    a: Applicant; pf: ApplicantPrefill; focusIndex?: number; existingReview?: ReviewSignoff;
    remarks: Remark[]; onAddRemark: (text: string) => void; onBack: () => void; onReview: (r: ReviewSignoff) => void;
}) {
    const [preview, setPreview] = useState<UploadedFile | null>(null);
    const upFor = (i: number, side: "front" | "back") => (a.uploads ?? []).find((u) => u.id === `lic-${i}-${side}`);
    // Show only the focused license when opened from its row; otherwise all.
    const shown = focusIndex !== undefined && pf.licenses[focusIndex] ? [[focusIndex, pf.licenses[focusIndex]] as const] : pf.licenses.map((l, i) => [i, l] as const);
    const licenses = pf.licenses;
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Hiring file</button>
                <span className="text-xs font-semibold text-slate-500">{focusIndex !== undefined ? `License ${focusIndex + 1} of ${licenses.length}` : `${licenses.length} license${licenses.length === 1 ? "" : "s"}`} — read-only</span>
            </div>
            <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">License Review</p>
                    <h1 className="text-2xl font-bold text-slate-900">{focusIndex !== undefined ? `License ${focusIndex + 1}` : "Driver Licenses"}</h1>
                    <p className="mt-1 text-sm text-slate-500">Review the details, the front &amp; back images and the checklist, then sign off below.</p>
                </div>

                {existingReview && <ReviewedBanner review={existingReview} />}
                {licenses.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">No licenses were submitted with the application.</p>}

                {/* Data — just the licenses, read-only */}
                {shown.map(([i, l]) => {
                    const front = upFor(i, "front");
                    const back = upFor(i, "back");
                    const rows = [
                        { label: "License Number", value: l.number }, { label: "Country", value: l.country ?? "" },
                        { label: "Licensing Authority", value: l.authority }, { label: "License Class", value: l.cls },
                        { label: "Issue Date", value: l.issue }, { label: "Expiration Date", value: l.exp },
                        { label: "Commercial (CDL)", value: l.cdl }, { label: "Endorsements", value: l.endorsements },
                    ];
                    return (
                        <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{i + 1}</span>
                                    <h2 className="text-sm font-bold text-slate-800">License {i + 1}{l.number ? ` · ${l.number}` : ""}</h2>
                                </div>
                                {l.cls && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{l.cls}</span>}
                            </div>
                            <div className="space-y-6 p-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {rows.map((r, ri) => <RoField key={ri} label={r.label} value={r.value} />)}
                                </div>
                                <div>
                                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Uploaded Documents</p>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <LicenseImageTile title="Front of License" file={front} onView={() => front && setPreview(front)} />
                                        <LicenseImageTile title="Back of License" file={back} onView={() => back && setPreview(back)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Review checklist + reviewer sign-off — together at the bottom */}
                {licenses.length > 0 && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                        {shown.map(([i, l]) => {
                            const checks = [
                                { label: "Front of license uploaded", ok: !!upFor(i, "front") }, { label: "Back of license uploaded", ok: !!upFor(i, "back") },
                                { label: "License number provided", ok: !!l.number }, { label: "Issue date provided", ok: !!l.issue },
                                { label: "Expiration date provided", ok: !!l.exp }, { label: "License class specified", ok: !!l.cls },
                            ];
                            return (
                                <div key={i} className="mt-2">
                                    {shown.length > 1 && <p className="mb-1 text-sm font-semibold text-slate-700">License {i + 1}</p>}
                                    <ul className="grid gap-1.5 sm:grid-cols-2">{checks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} />)}</ul>
                                </div>
                            );
                        })}
                    </div>
                )}
                {licenses.length > 0 && <ReviewRemarks remarks={remarks} onAdd={onAddRemark} />}
                {licenses.length > 0 && <ReviewSignOff label="I have reviewed the driver license(s) above." signedNote="Licenses reviewed & signed" existing={existingReview} onConfirm={(r) => onReview({ ...r, at: Date.now() })} />}
            </div>

            {/* Front / back image preview */}
            {preview && (
                <Dialog open onOpenChange={(o) => { if (!o) setPreview(null); }}>
                    <DialogContent className="max-w-2xl p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Eye className="h-4 w-4" /></span> {preview.label}</DialogTitle>
                        </DialogHeader>
                        <div className="p-6">
                            <img src={preview.file} alt={preview.label} className="mx-auto max-h-[60vh] rounded-lg border border-slate-200"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"; }} />
                            <div className="hidden flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
                                <FileText className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-600">{preview.file}</p>
                                <p className="text-xs text-slate-400">Image preview unavailable in this prototype.</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// ── Employment-verification review — a dedicated page per previous employer ─────
// Dedicated page for the employer's returned §391.23 form — themes, Print, Download PDF, Share.
// "Traditional" renders the verbatim FMCSA paper forms (filled + signed); other themes render
// the styled key-value document.
function ReturnedFormPage({ title, subtitle, sections, classic, formPage, branding, onBack }: {
    title: string; subtitle?: string; sections: DocSection[]; classic: ClassicSphData; formPage: "accident" | "drug"; branding: CompanyBranding; onBack: () => void;
}) {
    const [theme, setTheme] = useState<ThemeKey>("traditional");
    const [downloading, setDownloading] = useState(false);
    const [shared, setShared] = useState(false);
    const docRef = useRef<HTMLDivElement>(null);
    const downloadPdf = async () => {
        const el = docRef.current;
        if (!el) return;
        setDownloading(true);
        try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
            const pdf = new jsPDF({ unit: "pt", format: "a4" });
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const imgH = (canvas.height * pageW) / canvas.width;
            let heightLeft = imgH, position = 0;
            const img = canvas.toDataURL("image/png");
            pdf.addImage(img, "PNG", 0, position, pageW, imgH);
            heightLeft -= pageH;
            while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(img, "PNG", 0, position, pageW, imgH); heightLeft -= pageH; }
            pdf.save("safety-performance-history.pdf");
        } finally { setDownloading(false); }
    };
    const share = async () => {
        const payload = { title, text: `${title}${subtitle ? ` — ${subtitle}` : ""}`, url: window.location.href };
        try {
            if (typeof navigator !== "undefined" && (navigator as Navigator).share) { await (navigator as Navigator).share(payload); return; }
            if (typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(payload.url); setShared(true); setTimeout(() => setShared(false), 1800); }
        } catch { /* user dismissed share sheet */ }
    };
    return (
        <div className="min-h-screen bg-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Back</button>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {THEMES.map((t) => (
                            <button key={t.key} type="button" onClick={() => setTheme(t.key)} className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", theme === t.key ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-white")}>{t.name}</button>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={share}><Share2 className="h-3.5 w-3.5" /> {shared ? "Link copied" : "Share"}</Button>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button>
                    <Button size="sm" className="h-8 gap-1.5" onClick={downloadPdf} disabled={downloading}><Download className="h-3.5 w-3.5" /> {downloading ? "Generating…" : "Download PDF"}</Button>
                </div>
            </div>
            <div className="px-4 py-8">
                <div ref={docRef} className={cn("mx-auto max-w-[820px]", theme === "traditional" && "bg-white p-6 shadow-lg")}>
                    {theme === "traditional"
                        ? <ClassicSphForms data={classic} branding={branding} page={formPage} />
                        : <FormDocument title={title} subtitle={subtitle} sections={sections} theme={theme} branding={branding} />}
                </div>
            </div>
        </div>
    );
}

function EmploymentReviewView({ a, check, filled, index, total, existingReview, remarks, onAddRemark, onFulfill, onRequest, onSendDoc, onBack, onReview }: {
    a: Applicant; check: EmpCheck; filled?: PrefillEmployer; index: number; total: number; existingReview?: ReviewSignoff;
    remarks: Remark[]; onAddRemark: (text: string) => void;
    onFulfill: (kind: "send" | "respond" | "verify" | "doc", docKey?: string, attempt?: number) => void;
    onRequest: (req: { to: string; subject: string; message: string; verifyData?: boolean; docKeys?: string[]; docLabels?: string[] }) => void;
    onSendDoc: (p: { docLabel: string; org: string; to: string }) => void;
    onBack: () => void; onReview: (r: ReviewSignoff) => void;
}) {
    const [preview, setPreview] = useState<{ label: string } | null>(null);
    // `only` pre-checks a single document; otherwise every employer-sourced, not-yet-received letter.
    const [reqOpen, setReqOpen] = useState<{ only?: string } | null>(null);
    const [sendDoc, setSendDoc] = useState<{ label: string } | null>(null);
    const [openResp, setOpenResp] = useState<number | null>(null);   // which request row is expanded
    const [viewForm, setViewForm] = useState<"accident" | "drug" | null>(null);   // which returned form to view
    const [branding] = useCompanyBranding();
    const openReq = (docKey?: string) => setReqOpen({ only: docKey });
    const tinyBtn = "h-7 gap-1 px-2.5 text-xs";
    const statusLabel: Record<string, string> = { pending: "Not requested", sent: `Sent · ${check.attempts.length}/${EMP_MAX_ATTEMPTS}`, responded: "Responded", verified: "Verified" };
    const dateOf = (ts?: number) => ts ? new Date(ts).toLocaleDateString() : "—";
    // What the driver filled in the application for this employer (with proper From / To dates).
    const filledRows = [
        { label: "Employer", value: filled?.employer ?? check.employer }, { label: "Position", value: filled?.position ?? check.position },
        { label: "From", value: filled?.from ?? "" }, { label: "To", value: filled?.to ?? "" },
        { label: "Telephone", value: filled?.telephone ?? "" }, { label: "Employer Address", value: filled?.address ?? "" },
        { label: "Reason for Leaving", value: filled?.reason ?? "" }, { label: "Terminated / Discharged / Laid Off", value: filled?.terminated ?? "" },
        { label: "Current Employer", value: filled?.current ?? "" }, { label: "Operated Commercial Motor Vehicle", value: filled?.operatedCMV ?? "" },
    ];
    const verifyRows = [
        { label: "Verification Status", value: statusLabel[check.status] ?? check.status }, { label: "Contact", value: check.email || "—" },
        { label: "Attempts", value: `${check.attempts.length} / ${EMP_MAX_ATTEMPTS}` }, { label: "Responded", value: dateOf(check.respondedAt) },
        { label: "Verified", value: dateOf(check.verifiedAt) },
    ];
    const docMode = (key: string): "off" | "upload" | "ask" => a.employerDocModes?.[key] ?? "ask";
    const docs = EMPLOYER_DOC_ITEMS.filter((d) => docMode(d.key) !== "off").map((d) => ({
        key: d.key, label: d.label, status: (a.docs?.[`doc:${check.id}:${d.key}`] ?? "pending") as DocStatus,
        source: (docMode(d.key) === "ask" ? "employer" : "driver") as "driver" | "employer",
    }));
    // Verification activity log — requests, response and verification, newest first.
    const activity = [
        ...check.attempts.map((at, i) => ({ at: at.at, title: `Verification request sent (attempt ${i + 1})`, detail: `via ${at.method}${at.to ? ` · to ${at.to}` : ""}`, dot: "bg-amber-500" })),
        ...(check.respondedAt ? [{ at: check.respondedAt, title: "Employer responded", detail: "Response recorded on file", dot: "bg-blue-500" }] : []),
        ...(check.verifiedAt ? [{ at: check.verifiedAt, title: "Verified & signed", detail: "Employment confirmed", dot: "bg-emerald-500" }] : []),
    ].sort((x, y) => y.at - x.at);
    // Checklist — every employment field from the application is confirmed, then each
    // letter received, the employment verified, and reviewer sign-off. Actionable items
    // get a one-click button.
    const fieldChecks = [
        { label: "Employer name provided", ok: !!(filled?.employer ?? check.employer) },
        { label: "Position provided", ok: !!(filled?.position ?? check.position) },
        { label: "Employment dates (from / to) provided", ok: !!(filled?.from || filled?.to) },
        { label: "Telephone provided", ok: !!filled?.telephone },
        { label: "Employer address provided", ok: !!filled?.address },
        { label: "Reason for leaving provided", ok: !!filled?.reason },
        { label: "Terminated / discharged / laid off answered", ok: !!filled?.terminated },
        { label: "Current-employer question answered", ok: !!filled?.current },
        { label: "Operated commercial motor vehicle answered", ok: !!filled?.operatedCMV },
    ];
    const baseChecks: { label: string; ok: boolean; actionLabel?: string; onAction?: () => void }[] = [
        ...fieldChecks,
        ...docs.map((d) => ({
            label: `${d.label} received`, ok: DONE_STATES.includes(d.status),
            actionLabel: d.source === "employer" ? "Ask employer" : "Mark received",
            onAction: () => (d.source === "employer" ? openReq(d.key) : onFulfill("doc", `doc:${check.id}:${d.key}`)),
        })),
        { label: "Employment dates & position verified", ok: check.status === "verified", actionLabel: "Verify", onAction: () => onFulfill("verify") },
        { label: "Reviewer sign-off completed", ok: !!existingReview },
    ];
    // ── The employer's returned §391.23 form (shown once they've responded) ──
    const hasResponse = check.status === "responded" || check.status === "verified" || !!check.respondedAt;
    const respondedIdx = hasResponse ? (check.respondedAttempt ?? check.attempts.length - 1) : -1;   // the request that got the response
    const effectiveOpen = openResp === null ? respondedIdx : openResp;    // default-open the responded row
    const respPos = filled?.position ?? check.position ?? "Driver";
    const responseRows = [
        { label: "Employed by this company", value: "Yes" },
        { label: "Employed as", value: respPos },
        { label: "Employment dates", value: `${filled?.from ?? "—"} to ${filled?.to ?? "—"}` },
        { label: "Operated a commercial motor vehicle", value: filled?.operatedCMV || "Yes" },
        { label: "Subject to FMCSRs while employed", value: "Yes" },
        { label: "Performed a safety-sensitive function (Part 40)", value: "Yes" },
        { label: "Reason for leaving", value: filled?.reason || "—" },
        { label: "Eligible for rehire", value: "Yes" },
        { label: "Reportable accidents (last 3 years)", value: "None reported" },
        { label: "Alcohol test result ≥ 0.04", value: "No" },
        { label: "Verified positive / refused drug test", value: "No" },
        { label: "Completed a SAP-prescribed program", value: "N/A" },
    ];
    const completedByRows = [
        { label: "Completed by", value: "Dana Whitfield" }, { label: "Title", value: "Safety Manager" },
        { label: "Company", value: filled?.employer ?? check.employer }, { label: "Telephone", value: filled?.telephone || "—" },
        { label: "Address", value: filled?.address || "—" }, { label: "Date", value: dateOf(check.respondedAt) },
    ];
    const attachedDocs = docs.filter((d) => DONE_STATES.includes(d.status));
    // Render the signer's name as a script-font signature image so it shows in the document & PDF.
    const sigDataUrl = useMemo(() => {
        const c = document.createElement("canvas");
        c.width = 440; c.height = 280;   // matches the document's h-28 w-44 image box (no crop)
        const ctx = c.getContext("2d");
        if (!ctx) return "";
        ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#1e293b";
        ctx.font = "60px 'Segoe Script', 'Brush Script MT', 'Snell Roundhand', cursive";
        ctx.textBaseline = "middle";
        ctx.fillText("Dana Whitfield", 20, c.height / 2);
        return c.toDataURL();
    }, []);
    // Data for the verbatim FMCSA §391.23 paper forms (Traditional / Classic view).
    const classicData: ClassicSphData = {
        applicantName: `${a.firstName} ${a.lastName}`,
        employedByUs: "Yes",
        employedAs: respPos, fromMY: filled?.from ?? "", toMY: filled?.to ?? "",
        droveCMV: filled?.operatedCMV || "Yes",
        vehicleTypes: ["Tractor-Semitrailer"], otherVehicle: "",
        reasons: [], noHistory: false, noAccidentData: true, accidents: [],
        otherAccidents: "None on file.", remarks: "Driver maintained a good safety record during employment.",
        daNotSubject: false, daFrom: filled?.from ?? "", daTo: filled?.to ?? "",
        answers: ["No", "No", "No", "No", "No", "No"],
        company: filled?.employer ?? check.employer,
        street: filled?.address ?? "", cityStateZip: "", telephone: filled?.telephone ?? "",
        name: "Dana Whitfield", title: "Safety Manager", date: dateOf(check.respondedAt), sig: sigDataUrl,
    };
    // The returned form rendered as a themed, printable §391.23 document.
    const respSections: DocSection[] = [
        { title: "Safety Performance History (§391.23)", groups: [{ rows: responseRows.map((r) => ({ label: r.label, value: r.value })) }] },
        { title: "Completed By", groups: [{ rows: [...completedByRows.map((r) => ({ label: r.label, value: r.value })), { label: "Signature", value: "Dana Whitfield (electronically signed)" }], images: sigDataUrl ? [sigDataUrl] : undefined }] },
        ...(attachedDocs.length ? [{ title: "Documents Attached", groups: [{ rows: attachedDocs.map((d) => ({ label: d.label, value: "Attached by employer" })) }] }] : []),
    ];

    // Dedicated returned-form page (replaces the review view while open).
    if (viewForm) {
        return (
            <ReturnedFormPage
                title="Safety Performance History — Returned Form"
                subtitle={`${filled?.employer ?? check.employer} · ${a.firstName} ${a.lastName}`}
                sections={respSections}
                classic={classicData}
                formPage={viewForm}
                branding={branding}
                onBack={() => setViewForm(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Hiring file</button>
                <span className="text-xs font-semibold text-slate-500">Employer {index + 1} of {total} — read-only</span>
            </div>
            <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Employment Verification Review</p>
                    <h1 className="text-2xl font-bold text-slate-900">{check.employer}</h1>
                    {/* From / To prominently at the top */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                        {(filled?.position || check.position) && <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{filled?.position || check.position}</span>}
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700"><span className="text-[10px] font-bold uppercase tracking-wide text-blue-400">From</span> {filled?.from || "—"}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700"><span className="text-[10px] font-bold uppercase tracking-wide text-blue-400">To</span> {filled?.to || "—"}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Review the employer details, the verification documents and the checklist, then sign off below.</p>
                </div>

                {existingReview && <ReviewedBanner review={existingReview} />}

                {/* What the driver filled in the application */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{index + 1}</span>
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Employer Details — as the driver provided</h2>
                    </div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        {filledRows.map((r, ri) => <RoField key={ri} label={r.label} value={r.value} />)}
                    </div>
                </div>

                {/* Requests & responses — a list of every request sent, each expandable to its response */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Requests &amp; Responses</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{check.attempts.length} sent · {hasResponse ? "1 response" : "0 responses"}</span>
                    </div>
                    {check.attempts.length === 0 ? (
                        <div className="flex items-center gap-3 px-5 py-5 text-sm text-slate-500">
                            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                            <p>No requests sent yet. Use <span className="font-semibold text-slate-600">Send request</span> below; once the employer completes the form, their response appears here.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {check.attempts.map((at, i) => {
                                const responded = i === respondedIdx;
                                const open = effectiveOpen === i;
                                return (
                                    <li key={i}>
                                        <button type="button" onClick={() => setOpenResp(open ? -1 : i)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-slate-50">
                                            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", responded ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
                                                {responded ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800">Request #{i + 1} <span className="font-normal text-slate-400">· via {at.method}{at.to ? ` · ${at.to}` : ""}</span></p>
                                                <p className="text-xs text-slate-400">Sent {relativeTime(at.at)}{responded ? ` · responded ${relativeTime(check.respondedAt!)}` : ""}</p>
                                            </div>
                                            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", responded ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>{responded ? "Responded" : "Awaiting response"}</span>
                                            <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
                                        </button>
                                        {open && (
                                            <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-4">
                                                {responded ? (
                                                    <div className="space-y-4">
                                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Returned form · Safety Performance History (§391.23)</p>
                                                        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                                                            {responseRows.map((r, ri) => (
                                                                <div key={ri} className="border-b border-slate-100 pb-2">
                                                                    <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                                                                    <dd className="mt-0.5 text-sm font-semibold text-slate-800">{r.value || "—"}</dd>
                                                                </div>
                                                            ))}
                                                        </dl>
                                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Completed by</p>
                                                            <div className="mt-2 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                                                                {completedByRows.map((r, ri) => (
                                                                    <p key={ri} className={r.label === "Address" ? "sm:col-span-2" : ""}><span className="text-slate-500">{r.label}:</span> <span className="font-semibold text-slate-800">{r.value}</span></p>
                                                                ))}
                                                            </div>
                                                            <div className="mt-3 flex items-center gap-2">
                                                                <span className="text-sm text-slate-500">Signature:</span>
                                                                <span className="inline-block rounded border border-slate-200 bg-white px-4 py-1.5 text-lg italic text-slate-800" style={{ fontFamily: "'Segoe Script','Brush Script MT','Snell Roundhand',cursive" }}>Dana Whitfield</span>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Forms (2)</p>
                                                            <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                                {([["accident", "Accident History (§391.23)"], ["drug", "Drug & Alcohol History (§391.23)"]] as const).map(([k, lbl]) => (
                                                                    <li key={k} className="flex items-center gap-3 px-4 py-2.5">
                                                                        <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                                                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{lbl}</span>
                                                                        <span className="text-[11px] font-semibold text-emerald-600">Completed</span>
                                                                        <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setViewForm(k)}><Eye className="h-3.5 w-3.5" /> View</Button>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                        <div>
                                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Documents attached ({attachedDocs.length})</p>
                                                            {attachedDocs.length ? (
                                                                <ul className="mt-2 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                                    {attachedDocs.map((d, di) => (
                                                                        <li key={di} className="flex items-center gap-3 px-4 py-2.5">
                                                                            <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                                                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{d.label}</span>
                                                                            <span className="text-[11px] font-semibold text-emerald-600">Attached</span>
                                                                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setPreview({ label: d.label })}><Eye className="h-3.5 w-3.5" /> View</Button>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <p className="mt-2 text-sm text-slate-400">No documents attached with this response.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-3 text-sm text-slate-500">
                                                            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                                                            <p>Awaiting the employer's response to this request. When they complete the form, the returned answers and documents will show here — or log it now.</p>
                                                        </div>
                                                        {check.status !== "verified" && (
                                                            <Button size="sm" className={tinyBtn} onClick={() => onFulfill("respond", undefined, i)}><Check className="h-3.5 w-3.5" /> Record response &amp; mark fulfilled</Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Verification documents — driver-provided letters or asked from the employer, side by side */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Verification Documents</h2>
                    </div>
                    <div className="grid gap-3 p-5 sm:grid-cols-2">
                        {docs.map((d, di) => <EmployerDocTile key={di} label={d.label} status={d.status} source={d.source}
                            onView={() => setPreview({ label: d.label })}
                            onReplace={() => onFulfill("doc", `doc:${check.id}:${d.key}`)}
                            onSend={() => setSendDoc({ label: d.label })}
                            onAsk={() => openReq(d.key)}
                            onUpload={() => onFulfill("doc", `doc:${check.id}:${d.key}`)} />)}
                    </div>
                </div>

                {/* Verification status — actionable: send the request (editable email), record the response, verify. */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Verification</h2>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {check.status !== "verified" && <Button size="sm" className={tinyBtn} disabled={check.attempts.length >= EMP_MAX_ATTEMPTS} onClick={() => openReq()}><Send className="h-3.5 w-3.5" /> {check.attempts.length ? "Resend request" : "Send request"}</Button>}
                            {check.status === "sent" && <Button variant="outline" size="sm" className={tinyBtn} onClick={() => onFulfill("respond")}><Check className="h-3.5 w-3.5" /> Record response</Button>}
                            {check.status === "responded" && <Button size="sm" className={tinyBtn} onClick={() => onFulfill("verify")}><BadgeCheck className="h-3.5 w-3.5" /> Verify</Button>}
                            {check.status === "verified" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Check className="h-3 w-3" /> Verified</span>}
                        </div>
                    </div>
                    <div className="grid gap-4 p-5 sm:grid-cols-2">
                        {verifyRows.map((r, ri) => <RoField key={ri} label={r.label} value={r.value} />)}
                    </div>
                </div>

                {/* Verification activity — monitor what's happening with this employment check */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">Verification Activity</h2>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{check.attempts.length} / {EMP_MAX_ATTEMPTS} attempts</span>
                    </div>
                    {activity.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400">No activity yet — send a verification request to this employer to begin.</p>
                    ) : (
                        <ol className="p-5">
                            {activity.map((ev, ai) => (
                                <li key={ai} className="relative flex gap-3 pb-4 last:pb-0">
                                    <div className="relative flex w-3 shrink-0 flex-col items-center">
                                        <span className={cn("z-10 mt-1 h-3 w-3 rounded-full ring-4 ring-white", ev.dot)} />
                                        {ai < activity.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-slate-800">{ev.title}</p>
                                            <span className="text-xs text-slate-400">{relativeTime(ev.at)}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">{ev.detail}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>

                {/* Review checklist (quick-complete) + reviewer sign-off — together at the bottom */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                    <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{baseChecks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} actionLabel={c.actionLabel} onAction={c.onAction} />)}</ul>
                </div>
                <ReviewRemarks remarks={remarks} onAdd={onAddRemark} />
                <ReviewSignOff label={`I have reviewed the employment verification for ${check.employer}.`} signedNote="Employment reviewed & signed" existing={existingReview} onConfirm={(r) => onReview({ ...r, at: Date.now() })} />
            </div>

            {preview && (
                <Dialog open onOpenChange={(o) => { if (!o) setPreview(null); }}>
                    <DialogContent className="max-w-lg p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Eye className="h-4 w-4" /></span> {preview.label}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-2 p-10 text-center">
                            <FileText className="h-10 w-10 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">{preview.label}</p>
                            <p className="text-xs text-slate-400">Document preview unavailable in this prototype.</p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Shared ask-employer module — document checklist + confirm-the-data option */}
            {reqOpen && (
                <EmployerRequestDialog
                    employerName={filled?.employer ?? check.employer}
                    applicantName={`${a.firstName} ${a.lastName}`}
                    period={filled?.from || filled?.to ? `${filled?.from || "—"} to ${filled?.to || "Present"}` : check.dates}
                    brandName={a.carrier}
                    attemptLabel={`attempt ${check.attempts.length + 1} of ${EMP_MAX_ATTEMPTS}`}
                    prefill={{ email: check.email, phone: filled?.telephone, address: filled?.address }}
                    docs={docs.map((d) => ({ key: d.key, label: d.label, preselected: reqOpen.only ? d.key === reqOpen.only : d.source === "employer", received: DONE_STATES.includes(d.status) }))}
                    forms={[
                        { key: "accident-history", label: "Accident History (§391.23)", preselected: false },
                        { key: "drug-alcohol-history", label: "Drug & Alcohol History (§391.23)", preselected: false },
                    ]}
                    dataRows={[
                        { label: "Employer", value: filled?.employer ?? check.employer },
                        { label: "Position", value: filled?.position ?? check.position },
                        { label: "Employment dates", value: filled?.from || filled?.to ? `${filled?.from || "—"} to ${filled?.to || "Present"}` : check.dates },
                        { label: "Reason for leaving", value: filled?.reason ?? "" },
                    ]}
                    onClose={() => setReqOpen(null)}
                    onSend={({ docKeys, docLabels, verifyData, to, subject, message }) => {
                        onRequest({ to, subject, message, verifyData, docKeys: docKeys.map((k) => `doc:${check.id}:${k}`), docLabels });
                        setReqOpen(null);
                    }}
                />
            )}

            {/* Send an uploaded document to a third party to verify it */}
            {sendDoc && (
                <SendDocumentDialog
                    docLabel={sendDoc.label}
                    applicantName={`${a.firstName} ${a.lastName}`}
                    employerName={filled?.employer ?? check.employer}
                    brandName={a.carrier}
                    onClose={() => setSendDoc(null)}
                    onSend={({ docLabel, org, to }) => { onSendDoc({ docLabel, org, to }); setSendDoc(null); }}
                />
            )}
        </div>
    );
}
function ApplicationFormView({ title, subtitle, badge, sections, fileName, focusSection, licenses, employment, empDocStatus, uploads, existingReview, remarks, onAddRemark, onBack, onReview, documentProps }: {
    title: string; subtitle?: string; badge?: string; sections: DocSection[]; fileName: string; focusSection?: string | null;
    licenses?: ApplicantPrefill["licenses"]; employment?: PrefillEmployer[]; empDocStatus?: (i: number, key: string) => DocStatus;
    uploads?: UploadedFile[]; existingReview?: ReviewSignoff;
    remarks: Remark[]; onAddRemark: (text: string) => void; onBack: () => void;
    onReview: (r: ReviewSignoff) => void; documentProps: React.ComponentProps<typeof ThemedDocumentViewer>;
}) {
    const [mode, setMode] = useState<"form" | "document">("form");
    const [preview, setPreview] = useState<UploadedFile | null>(null);
    const upFor = (i: number, side: "front" | "back") => (uploads ?? []).find((u) => u.id === `lic-${i}-${side}`);
    // When focused on a single section (from the row dropdown), show just that one.
    const displaySections = focusSection ? sections.filter((s) => s.title === focusSection) : sections;
    void fileName;
    if (mode === "document") return <ThemedDocumentViewer {...documentProps} onBack={() => setMode("form")} backLabel="Form view" />;
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Hiring file</button>
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button type="button" onClick={() => setMode("form")} className={cn("rounded-md px-3 py-1 text-xs font-semibold transition", mode === "form" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Form</button>
                    <button type="button" onClick={() => setMode("document")} className="rounded-md px-3 py-1 text-xs font-semibold text-slate-500 transition hover:text-slate-700">Document / PDF</button>
                </div>
            </div>
            <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
                <div>
                    {badge && <span className="mb-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">{badge}</span>}
                    <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                    <p className="mt-1 text-xs text-slate-400">Read-only — this is exactly what the applicant submitted. Review each section, then sign off below.</p>
                </div>

                {existingReview && <ReviewedBanner review={existingReview} />}

                {sections.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-400">The application has not been submitted yet.</p>}

                {/* Each section as its own read-only form card. License + Employment get
                    the richer review layout; history sections show a From → To header. */}
                {displaySections.map((sec) => {
                    const si = sections.indexOf(sec);
                    const header = (
                        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{si + 1}</span>
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">{sec.title}</h2>
                        </div>
                    );

                    // License — per-license card with images + checklist.
                    if (/licen/i.test(sec.title) && licenses && licenses.length > 0) {
                        return (
                            <div key={si} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {header}
                                <div className="space-y-6 p-5">
                                    {licenses.map((l, i) => {
                                        const rows = [
                                            { label: "License Number", value: l.number }, { label: "Country", value: l.country ?? "" },
                                            { label: "Licensing Authority", value: l.authority }, { label: "License Class", value: l.cls },
                                            { label: "Issue Date", value: l.issue }, { label: "Expiration Date", value: l.exp },
                                            { label: "Commercial (CDL)", value: l.cdl }, { label: "Endorsements", value: l.endorsements },
                                        ];
                                        const front = upFor(i, "front"), back = upFor(i, "back");
                                        const checks = [
                                            { label: "Front of license uploaded", ok: !!front }, { label: "Back of license uploaded", ok: !!back },
                                            { label: "License number provided", ok: !!l.number }, { label: "Expiration date provided", ok: !!l.exp },
                                            { label: "License class specified", ok: !!l.cls }, { label: "Endorsements noted", ok: !!l.endorsements },
                                        ];
                                        return (
                                            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200">
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{i + 1}</span>
                                                        <h3 className="text-sm font-bold text-slate-800">License {i + 1}{l.number ? ` · ${l.number}` : ""}</h3>
                                                    </div>
                                                    {l.cls && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{l.cls}</span>}
                                                </div>
                                                <div className="space-y-6 p-5">
                                                    <div className="grid gap-4 sm:grid-cols-2">{rows.map((r, ri) => <RoField key={ri} label={r.label} value={r.value} />)}</div>
                                                    <div>
                                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Uploaded Documents</p>
                                                        <div className="grid gap-4 sm:grid-cols-2">
                                                            <LicenseImageTile title="Front of License" file={front} onView={() => front && setPreview(front)} />
                                                            <LicenseImageTile title="Back of License" file={back} onView={() => back && setPreview(back)} />
                                                        </div>
                                                    </div>
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Review Checklist</p>
                                                        <ul className="grid gap-1.5 sm:grid-cols-2">{checks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} />)}</ul>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // Employment — per-employer card with From → To header + verification documents.
                    // Note: must NOT match "Unemployment History" (which has no verification docs).
                    if (/^employment/i.test(sec.title) && employment && employment.length > 0) {
                        return (
                            <div key={si} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                {header}
                                <div className="space-y-6 p-5">
                                    {employment.map((e, i) => {
                                        const rows = [
                                            { label: "Employer", value: e.employer }, { label: "Position", value: e.position },
                                            { label: "Reason for leaving", value: e.reason },
                                        ];
                                        return (
                                            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200">
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{i + 1}</span>
                                                        <h3 className="text-sm font-bold text-slate-800">{e.employer || `Employer ${i + 1}`}</h3>
                                                    </div>
                                                    {(e.from || e.to) && <FromToChip from={e.from} to={e.to} />}
                                                </div>
                                                <div className="space-y-6 p-5">
                                                    <div className="grid gap-4 sm:grid-cols-2">{rows.map((r, ri) => <RoField key={ri} label={r.label} value={r.value} />)}</div>
                                                    <div>
                                                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Verification Documents</p>
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            {EMPLOYER_VERIFICATION_DOCS.map((d) => {
                                                                const st = empDocStatus ? empDocStatus(i, d.key) : "pending";
                                                                return <VerificationDocTile key={d.key} label={d.label} status={st}
                                                                    onView={() => setPreview({ id: `emp-${i}-${d.key}`, label: d.label, file: `${d.label}.pdf`, category: "Verification" })} />;
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // Generic — read-only field grid; each group gets a From → To header when it has
                    // dates. Multi-entry sections render each entry as its own numbered card.
                    const multi = sec.groups.length > 1;
                    return (
                        <div key={si} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {header}
                            <div className={cn("p-5", multi ? "space-y-4" : "space-y-5")}>
                                {sec.groups.map((g, gi) => {
                                    const gRows = g.rows ?? [];
                                    const dateRow = gRows.find((r) => /^dates$/i.test(r.label));
                                    const rest = gRows.filter((r) => r !== dateRow);
                                    const ft = dateRow ? splitDates(String(dateRow.value ?? "")) : null;
                                    const chip = ft && (ft.from || ft.to) ? <FromToChip from={ft.from} to={ft.to} /> : null;
                                    if (multi) {
                                        return (
                                            <div key={gi} className="overflow-hidden rounded-2xl border border-slate-200">
                                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white">{gi + 1}</span>
                                                        <h3 className="text-sm font-bold text-slate-800">{g.label || `Entry ${gi + 1}`}</h3>
                                                    </div>
                                                    {chip}
                                                </div>
                                                <div className="grid gap-4 p-5 sm:grid-cols-2">
                                                    {rest.map((r, ri) => <RoField key={ri} label={r.label} value={String(r.value ?? "")} />)}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={gi}>
                                            {(g.label || chip) && (
                                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                                    {g.label && <p className="text-xs font-bold uppercase tracking-wide text-blue-600">{g.label}</p>}
                                                    {chip}
                                                </div>
                                            )}
                                            <div className="grid gap-4 sm:grid-cols-2">
                                                {rest.map((r, ri) => <RoField key={ri} label={r.label} value={String(r.value ?? "")} />)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Review checklist + reviewer sign-off — together at the bottom (full application only) */}
                {!focusSection && sections.length > 0 && (() => {
                    const has = (kw: RegExp) => sections.some((s) => kw.test(s.title) && s.groups.some((g) => (g.rows ?? []).some((r) => String(r.value ?? "").trim())));
                    const checks = [
                        { label: "Applicant information complete", ok: has(/applicant|personal/i) }, { label: "Address history provided", ok: has(/address/i) },
                        { label: "License details provided", ok: has(/licen/i) }, { label: "Employment history provided", ok: has(/employ/i) },
                        { label: "Application submitted", ok: sections.length > 0 },
                    ];
                    return (
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">{checks.map((c, ci) => <CheckLine key={ci} ok={c.ok} label={c.label} />)}</ul>
                        </div>
                    );
                })()}
                {!focusSection && sections.length > 0 && <ReviewRemarks remarks={remarks} onAdd={onAddRemark} />}
                {!focusSection && sections.length > 0 && <ReviewSignOff label="I have reviewed the entire application above." signedNote="Application reviewed & signed" existing={existingReview} onConfirm={(r) => onReview({ ...r, at: Date.now() })} />}
            </div>

            {/* Front / back image preview */}
            {preview && (
                <Dialog open onOpenChange={(o) => { if (!o) setPreview(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader><DialogTitle>{preview.label}</DialogTitle></DialogHeader>
                        <div className="px-6 pb-6">
                            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
                                <FileText className="h-10 w-10 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">{preview.file}</p>
                                <p className="text-xs text-slate-400">Image preview unavailable in this prototype.</p>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// ── Request dialog ────────────────────────────────────────────────────────────
function RequestDialog({ prefill, driverEmail, recipients = GENERIC_RECIPIENTS, lockAction, onClose, onSubmit }: { prefill: Partial<AppRequest>; driverEmail: string; recipients?: RequestRecipient[]; lockAction?: boolean; onClose: () => void; onSubmit: (r: Partial<AppRequest>) => void }) {
    const formLabel = prefill.fid ? stepName(prefill.fid) : "this item";
    const [action, setAction] = useState<RequestAction>(prefill.action ?? "Request");
    const [recipient, setRecipient] = useState<RequestRecipient>(prefill.recipient ?? recipients[0]);
    const [to, setTo] = useState(prefill.to ?? (prefill.recipient === "Driver" ? driverEmail : ""));
    const [channel, setChannel] = useState<RequestChannel>(prefill.channel ?? "Email");
    const [subject, setSubject] = useState(prefill.subject ?? "");
    const [message, setMessage] = useState(prefill.message ?? "");
    const [dueDate, setDueDate] = useState("");

    // Switching the action re-templates the recipient + copy (kept editable).
    const onAction = (act: RequestAction) => {
        setAction(act);
        const t = actionTemplate(act, formLabel);
        const r = recipients.includes(t.recipient) ? t.recipient : recipients[0];
        setRecipient(r);
        setTo(r === "Driver" ? driverEmail : "");
        setSubject(t.subject);
        setMessage(t.message);
    };
    const onRecipient = (r: RequestRecipient) => { setRecipient(r); setTo(r === "Driver" ? driverEmail : ""); };
    const verb = action === "Order" ? "Send order" : action === "Alert" ? "Send alert" : action === "Review" ? "Assign review" : "Send request";

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg p-0">
                <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Send className="h-4 w-4" /></span> Ask / Order</DialogTitle>
                    <p className="text-sm font-normal text-slate-500">{prefill.fid ? `For “${formLabel}”.` : "Request a document, order a report, assign a review or send an alert."}</p>
                </DialogHeader>
                <div className="space-y-4 px-6 py-5">
                    {!lockAction && (
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Action</Label>
                            <div className="mt-1.5 grid grid-cols-2 gap-2">
                                {REQUEST_ACTIONS.map((act) => (
                                    <button key={act.id} type="button" onClick={() => onAction(act.id)} className={cn("rounded-lg border px-3 py-2 text-left transition", action === act.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300")}>
                                        <span className={cn("block text-[13px] font-semibold", action === act.id ? "text-blue-700" : "text-slate-800")}>{act.label}</span>
                                        <span className="block text-[11px] leading-tight text-slate-400">{act.hint}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">{action === "Order" ? "Order from" : action === "Review" ? "Assign to" : "Send to"}</Label>
                            <Select value={recipient} onValueChange={(v) => onRecipient(v as RequestRecipient)}>
                                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                                <SelectContent>{recipients.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</Label>
                            <div className="mt-1.5 flex rounded-lg border border-slate-200 p-1">
                                {(["Email", "In-app"] as RequestChannel[]).map((c) => (
                                    <button key={c} type="button" onClick={() => setChannel(c)} className={cn("flex-1 rounded-md py-1.5 text-sm font-semibold transition", channel === c ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>{c === "Email" ? <Mail className="mr-1 inline h-3.5 w-3.5" /> : <MessageSquarePlus className="mr-1 inline h-3.5 w-3.5" />}{c}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {channel === "Email" && (
                        <div>
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Recipient email</Label>
                            <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder={recipient === "Driver" ? driverEmail : "name@company.com"} />
                        </div>
                    )}
                    <div>
                        <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</Label>
                        <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                    <div>
                        <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</Label>
                        <Textarea className="mt-1.5 resize-none" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </div>
                    <div className="max-w-[180px]">
                        <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Due date (optional)</Label>
                        <Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!subject.trim()} onClick={() => onSubmit({ fid: prefill.fid, action, recipient, to, channel, subject: subject.trim(), message: message.trim(), dueDate })}><Send className="h-4 w-4" /> {verb}</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Upload popup ─────────────────────────────────────────────────────────────
// A focused drag-and-drop dialog for one item's document. On confirm it stores the
// file against the item and marks it received.
function UploadDialog({ item, onClose, onUpload }: { item: StepItem; onClose: () => void; onUpload: (fileName: string) => void }) {
    const [file, setFile] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const pick = (f?: File) => { if (f) setFile(f.name); };
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Upload className="h-4 w-4" /></span> Upload document</DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Attach the completed <span className="font-semibold text-slate-700">{item.label}</span> document.</p>
                </DialogHeader>
                <div className="px-6 pb-2">
                    <input ref={inputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                    {file ? (
                        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-500 shadow-sm"><FileText className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{file}</p>
                                <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Ready to upload</p>
                            </div>
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}>Replace</Button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
                            className={cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition", dragging ? "border-blue-400 bg-blue-50/60" : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40")}
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-500 shadow-sm"><Upload className="h-6 w-6" /></span>
                            <span className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</span>
                            <span className="text-xs text-slate-400">PDF or image · up to 10MB</span>
                        </button>
                    )}
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!file} onClick={() => file && onUpload(file)}><Upload className="h-4 w-4" /> Upload document</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Per-step required items ──────────────────────────────────────────────────
// A step is a checklist of items. Items are forms (filled / ordered / uploaded) or
// the combined consent pack. Each item tracks its own status.
type StepItem = { id: string; label: string; kind: "form" | "consent"; fid?: string; subIds?: string[]; licIndex?: number };

// The standard employer-supplied verification documents (driver uploads OR we ask the employer).
const EMPLOYER_DOC_ITEMS = [
    { key: "experience", label: "Employer Experience Letter" },
    { key: "insurance", label: "Insurance Experience Letter" },
];

// Whether the driver submitted both license images (front + back) in the application.
const licenseUpload = (a: Applicant, side: "front" | "back"): UploadedFile | undefined =>
    (a.uploads ?? []).filter((u) => u.category === "License").find((u) => new RegExp(side, "i").test(u.label) || new RegExp(`-${side}`, "i").test(u.id));
const licenseImagesSubmitted = (a: Applicant) => Boolean(licenseUpload(a, "front")) && Boolean(licenseUpload(a, "back"));

// Required items for a (non-review, non-employment) step. Consent forms collapse into
// one "Consent Forms" item (View opens the full list); license images stay inside the form.
function stepItems(step: HiringTemplate["steps"][number]): StepItem[] {
    const items: StepItem[] = [];
    const consents = step.formIds.filter((f) => stepGroup(f) === "Policy");
    for (const fid of step.formIds) {
        if (stepGroup(fid) === "Policy") continue;
        items.push({ id: fid, label: stepName(fid), kind: "form", fid });
    }
    if (consents.length) items.push({ id: "consents", label: `Consent Forms`, kind: "consent", subIds: consents });
    return items;
}


// An item's status. Consent pack = received only when every consent is done.
function itemStatus(item: StepItem, a: Applicant): DocStatus {
    // The driver fills the application and signs the consents — once they've
    // submitted, those are received by definition (no manual marking needed).
    const submitted = Boolean(a.submission);
    if (item.kind === "consent") return submitted ? "received" : "pending";
    if (item.fid === "application") return submitted ? "received" : "pending";
    return a.docs?.[item.fid ?? item.id] ?? "pending";
}

// A checklist item row — a single clean row (no dropdown): label + status + inline
// actions. Reviewing/data happens in the View screen the buttons open.
type RowSubItem = { id: string; label: string; status?: DocStatus; onView: () => void; onPdf?: () => void };
function StepItemRow({ item, a, mode, review, subItems, onForm, onPdf, onRequest, onUpload, onSet }: {
    item: StepItem; a: Applicant; mode: FulfillMode; review?: ReviewSignoff; subItems?: RowSubItem[];
    onForm: (view?: "form" | "document") => void; onPdf: () => void; onRequest: () => void; onUpload: () => void; onSet: (to: DocStatus, verb: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const status = itemStatus(item, a);
    const meta = DOC_STATUS_META[status];
    const tiny = "h-7 shrink-0 gap-1 px-2 text-xs";
    const isConsent = item.kind === "consent";
    const isApp = item.fid === "application";
    const isLicense = item.fid === "driver-license";
    // Report forms can be ordered OR provided (filled / uploaded) by the manager.
    const ordering = mode === "order";
    const uploading = mode === "upload" || mode === "upload-fill";
    const hasUp = (id: string) => Boolean((a.uploads ?? []).find((u) => u.id === id));
    const imagesOk = isLicense ? (item.licIndex !== undefined ? hasUp(`lic-${item.licIndex}-front`) && hasUp(`lic-${item.licIndex}-back`) : licenseImagesSubmitted(a)) : false;
    const hasSub = !!subItems && subItems.length > 0;
    return (
        <div className="rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-slate-900">
                    <span className="truncate">{isConsent ? `${item.label} · ${item.subIds?.length ?? 0}` : item.label}</span>
                    {isLicense && <span className={cn("hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:inline-block", imagesOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{imagesOk ? "Front & Back ✓" : "Images missing"}</span>}
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badge)}>{meta.label}</span>
                {review && <span className="hidden shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 sm:inline-flex"><BadgeCheck className="h-3.5 w-3.5" /> Reviewed by {review.by} · {review.date}</span>}
                {isConsent ? (
                    <>
                        {/* Driver-signed consents — submission = received, so just Review / PDF */}
                        <Button variant="outline" className={tiny} onClick={() => onForm("form")}><Eye className="h-3.5 w-3.5" /> Review</Button>
                        <Button variant="outline" className={tiny} onClick={() => onForm("document")}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                    </>
                ) : (
                    <>
                        <Button variant="outline" className={tiny} onClick={() => onForm()}><Eye className="h-3.5 w-3.5" /> Review</Button>
                        <Button variant="outline" className={tiny} onClick={onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                        {ordering && <Button className={tiny} onClick={onRequest}><FileSearch className="h-3.5 w-3.5" /> Order / Request</Button>}
                        {(ordering || uploading) && status === "pending" && <Button variant={ordering ? "outline" : "default"} className={tiny} onClick={onUpload}><Upload className="h-3.5 w-3.5" /> Upload</Button>}
                        {mode === "fill" && !isApp && status === "pending" && <Button className={tiny} onClick={() => onSet("received", "Marked received")}><Check className="h-3.5 w-3.5" /> Received</Button>}
                    </>
                )}
                {hasSub && <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="Show forms"><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>}
            </div>
            {/* Per-form dropdown — open each form one by one */}
            {hasSub && open && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/40">
                    {subItems!.map((s) => {
                        const sm = s.status ? DOC_STATUS_META[s.status] : null;
                        return (
                            <div key={s.id} className="flex flex-wrap items-center gap-2 px-4 py-2 pl-6">
                                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">{s.label}</span>
                                {sm && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", sm.badge)}>{sm.label}</span>}
                                <Button variant="outline" className={tiny} onClick={s.onView}><Eye className="h-3.5 w-3.5" /> View</Button>
                                {s.onPdf && <Button variant="outline" className={tiny} onClick={s.onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// A collapsible "Documents" row — application uploads (license front/back) plus the
// employment verification documents, each with status and a View when on file.
type DocRowItem = { id: string; label: string; sublabel: string; status?: DocStatus; onView?: () => void };
function DocumentsRow({ items }: { items: DocRowItem[] }) {
    const [open, setOpen] = useState(false);
    const tiny = "h-7 shrink-0 gap-1 px-2 text-xs";
    return (
        <div className="rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold text-slate-900">
                    <Paperclip className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">Documents</span>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{items.length}</span>
                <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="Show documents"><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>
            </div>
            {open && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/40">
                    {items.length === 0 && <p className="px-6 py-3 text-[13px] text-slate-400">No documents on this application.</p>}
                    {items.map((it) => {
                        const sm = it.status ? DOC_STATUS_META[it.status] : null;
                        const has = !!it.onView;
                        return (
                            <div key={it.id} className="flex flex-wrap items-center gap-2 px-4 py-2 pl-6">
                                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm", has ? "text-emerald-500" : "text-slate-400")}><FileText className="h-4 w-4" /></div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[13px] font-medium text-slate-700">{it.label}</p>
                                    <p className="truncate text-[11px] text-slate-400">{it.sublabel}</p>
                                </div>
                                {sm && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", sm.badge)}>{sm.label}</span>}
                                {has && <Button variant="outline" className={tiny} onClick={it.onView}><Eye className="h-3.5 w-3.5" /> View</Button>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}


// ── Employment Verification module ───────────────────────────────────────────
type UpdateFn = (id: string, patch: (prev: Applicant) => Partial<Applicant>) => void;

// ── Road Test module — assign an examiner to take the driver's §391.31 road test,
//    then satisfy it one of three ways: generate the certification (fill the Road
//    Test Evaluation), accept a license as equivalent, or upload a supporting doc.
//    Once recorded, the step moves to "Waiting for review" for HR (step status menu). ──
const ROAD_TEST_METHODS: { id: RoadTestMethod; label: string; desc: string; icon: React.ElementType; actionLabel: string; uploadLabel?: string }[] = [
    { id: "certify", label: "Generate Certification", desc: "Conduct the road test and fill the Road Test Evaluation — produces the §391.31 certificate.", icon: BadgeCheck, actionLabel: "Open Evaluation" },
    { id: "license", label: "Upload License", desc: "Accept a valid CDL as the equivalent of the road test (§391.33).", icon: Upload, actionLabel: "Upload License", uploadLabel: "Road Test — License accepted as equivalent (§391.33)" },
    { id: "document", label: "Upload Supporting Document", desc: "Attach a prior road-test certificate or other supporting document.", icon: Paperclip, actionLabel: "Upload Document", uploadLabel: "Road Test — Supporting document" },
];
const ROAD_TEST_DOC_ICON: Record<string, React.ElementType> = { certificate: Award, license: CreditCard, document: FileText, additional: Paperclip };
function RoadTestModule({ a, updateOne, review, onReview, onOpenForm, onPreviewForm }: {
    a: Applicant; updateOne: UpdateFn; review?: ReviewSignoff; onReview: (r: ReviewSignoff) => void; onOpenForm: () => void; onPreviewForm: () => void;
}) {
    const rt = a.roadTest ?? {};
    const status = a.docs?.["road-test"] ?? "pending";
    const recorded = DONE_STATES.includes(status);
    const meta = DOC_STATUS_META[status];
    const upload = (a.uploads ?? []).find((u) => u.id === "up:road-test");
    const assigned = !!rt.examiner;
    const [assignOpen, setAssignOpen] = useState(false);
    // What the examiner produced (from the form), else the quick module upload.
    const docsList: { label: string; fileName?: string; kind?: string }[] = (rt.documents && rt.documents.length) ? rt.documents : (upload ? [{ label: upload.label, fileName: upload.file, kind: "document" }] : []);
    const methodLabel = ROAD_TEST_METHODS.find((x) => x.id === rt.method)?.label;
    const hasDraft = !!rt.formValues && Object.keys(rt.formValues).length > 0;
    const tiny = "h-7 shrink-0 gap-1 px-2 text-xs";

    // Assign the examiner (selected user) and email them the assignment — logged as an open request.
    const onAssign = (v: { name: string; role: string; email: string; subject: string; message: string }) => {
        updateOne(a.id, (prev) => ({
            roadTest: { ...(prev.roadTest ?? {}), examiner: v.name, examinerRole: v.role, examinerEmail: v.email, assignedAt: Date.now() },
            requests: [{ id: `rq-${Date.now()}`, fid: "road-test", status: "open" as const, at: Date.now(), by: ACTOR, action: "Review" as const, subject: v.subject, recipient: "Hiring Manager" as const, to: v.email, channel: "Email" as const, message: v.message }, ...(prev.requests ?? [])],
            events: [{ id: `ev-${Date.now()}`, type: "request", text: `Assigned road test to ${v.name}${v.role ? ` (${v.role})` : ""} and emailed the assignment to ${v.email}`, at: Date.now(), author: ACTOR }, ...prev.events],
        }));
        setAssignOpen(false);
    };

    // Three sequenced steps — rendered as a vertical timeline (like Employment Verification).
    const steps = [
        { label: "Assign Examiner", done: assigned },
        { label: "Road Test & Completion", done: recorded },
        { label: "HR Review", done: !!review },
    ];
    const currentIdx = steps.findIndex((s) => !s.done);
    const Row = ({ i, children }: { i: number; children: React.ReactNode }) => {
        const s = steps[i];
        const current = i === currentIdx;
        return (
            <div className="relative flex gap-4">
                <div className="relative flex w-7 shrink-0 flex-col items-center">
                    <span className={cn("z-10 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ring-4 ring-white",
                        s.done ? "bg-emerald-500 text-white" : current ? "bg-blue-600 text-white" : "border-2 border-slate-200 bg-white text-slate-400")}>
                        {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    {i < steps.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
                </div>
                <div className="min-w-0 flex-1 pb-5">
                    <p className="mb-1.5 mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Step {i + 1} · {s.label}</p>
                    {children}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><BadgeCheck className="h-4 w-4" /></span>
                <p className="text-[13px] leading-relaxed text-slate-600">FMCSA §391.31 road test. Assign an examiner to take the driver's road test, complete it (generate a certification, accept a license as equivalent, or upload a supporting document), then HR reviews &amp; signs it off.</p>
            </div>

            <div>
                {/* Step 1 — Assign examiner (select a user + email them) */}
                <Row i={0}>
                    <div className="rounded-xl border border-slate-200 p-4">
                        {assigned ? (
                            <div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600 ring-1 ring-blue-100">{(rt.examiner!.match(/\b\w/g) ?? []).slice(0, 2).join("")}</div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">{rt.examiner}</p>
                                            <p className="truncate text-xs text-slate-500">{rt.examinerRole || "Examiner"}{rt.examinerEmail ? ` · ${rt.examinerEmail}` : ""}</p>
                                        </div>
                                    </div>
                                    <Button variant="outline" size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={() => setAssignOpen(true)}>Reassign</Button>
                                </div>
                                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><Check className="h-3.5 w-3.5" /> Assignment emailed{rt.examinerEmail ? ` to ${rt.examinerEmail}` : ""}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800">No examiner assigned</p>
                                    <p className="text-xs text-slate-500">Select a user to take {a.firstName} {a.lastName}'s §391.31 road test and email them the assignment.</p>
                                </div>
                                <Button className="shrink-0" onClick={() => setAssignOpen(true)}><Send className="h-4 w-4" /> Assign examiner</Button>
                            </div>
                        )}
                    </div>
                </Row>

                {/* Step 2 — Road test & completion */}
                <Row i={1}>
                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">How is the road test satisfied?</p>
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", meta.badge)}><span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {meta.label}</span>
                        </div>
                        {!assigned ? (
                            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-3 text-[13px] text-slate-400">Assign an examiner above to begin the road test.</p>
                        ) : recorded ? (
                            <div className="space-y-3.5">
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-start gap-2.5">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check className="h-5 w-5" /></span>
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-bold text-emerald-800">Road test completed</p>
                                                <p className="mt-0.5 text-xs text-emerald-700">By {rt.examiner || "examiner"}{methodLabel ? ` · ${methodLabel}` : ""}</p>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 gap-2">
                                            <Button variant="outline" className={cn(tiny, "bg-white")} onClick={onOpenForm}><Eye className="h-3.5 w-3.5" /> Review</Button>
                                            <Button variant="outline" className={cn(tiny, "bg-white")} onClick={onPreviewForm}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                                        </div>
                                    </div>
                                </div>
                                {docsList.length > 0 && (
                                    <div>
                                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Documents · {docsList.length}</p>
                                        <div className="space-y-1.5">
                                            {docsList.map((d, i) => {
                                                const DocIcon = ROAD_TEST_DOC_ICON[d.kind ?? "document"] ?? FileText;
                                                return (
                                                    <div key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><DocIcon className="h-4 w-4" /></span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-[13px] font-semibold text-slate-800">{d.label}</p>
                                                            <p className="truncate text-xs text-slate-500">{d.fileName || "Generated in the evaluation form"}</p>
                                                        </div>
                                                        <Button variant="outline" className={tiny} onClick={onOpenForm}><Eye className="h-3.5 w-3.5" /> View</Button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <button type="button" onClick={onOpenForm} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"><RotateCcw className="h-3.5 w-3.5" /> Reopen / edit the road test</button>
                            </div>
                        ) : (
                            <>
                                {hasDraft && (
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5">
                                        <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-800"><FileText className="h-4 w-4 text-amber-500" /> Road Test Evaluation — saved draft (not submitted){methodLabel ? ` · ${methodLabel}` : ""}</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className={tiny} onClick={onOpenForm}><Eye className="h-3.5 w-3.5" /> Review</Button>
                                            <Button variant="outline" className={tiny} onClick={onPreviewForm}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                                        </div>
                                    </div>
                                )}
                                {/* One entry point — open the evaluation form. The method (certify / licence / document)
                                    is a section inside the form, completed by the examiner, then surfaced here once submitted. */}
                                <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800">{hasDraft ? "Continue the Road Test Evaluation" : "Open the Road Test Evaluation"}</p>
                                            <p className="mt-0.5 text-xs text-slate-500">{rt.examiner || "The examiner"} scores each §391.31 section and, inside the form, chooses how the road test is satisfied — then submits it back here.</p>
                                        </div>
                                        <Button className="shrink-0" onClick={onOpenForm}><ClipboardCheck className="h-4 w-4" /> {hasDraft ? "Continue Review" : "Review"}</Button>
                                    </div>
                                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                        {ROAD_TEST_METHODS.map((m) => {
                                            const active = rt.method === m.id;
                                            return (
                                                <div key={m.id} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 transition", active ? "border-blue-500 bg-blue-50/60" : "border-slate-200 bg-white")}>
                                                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}><m.icon className="h-3.5 w-3.5" /></span>
                                                    <div className="min-w-0">
                                                        <p className="flex items-center gap-1.5 text-[12px] font-bold text-slate-700">{m.label}{active && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Selected</span>}</p>
                                                        <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{m.desc}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-400"><FileText className="h-3 w-3" /> These are sections inside the form — the examiner generates the certificate or uploads the document there, and it appears here once submitted.</p>
                                </div>
                            </>
                        )}
                    </div>
                </Row>

                {/* Step 3 — HR review & sign-off */}
                <Row i={2}>
                    {!recorded ? (
                        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-[13px] text-slate-400">Complete the road test above — HR can then review and sign it off.</p>
                    ) : review ? (
                        <div className="space-y-2.5">
                            <ReviewedBanner review={review} />
                            <div className="flex gap-2">
                                <Button variant="outline" className={tiny} onClick={onOpenForm}><Eye className="h-3.5 w-3.5" /> Review</Button>
                                <Button variant="outline" className={tiny} onClick={onPreviewForm}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                            </div>
                        </div>
                    ) : (
                        <ReviewSignOff label="Road Test — Reviewer Sign-Off" signedNote="Road test reviewed & signed off" onConfirm={(r) => onReview({ ...r, at: Date.now() })} />
                    )}
                </Row>
            </div>

            {assignOpen && (
                <AssignExaminerDialog
                    driverName={`${a.firstName} ${a.lastName}`.trim()}
                    carrier={a.carrier}
                    initial={{ examiner: rt.examiner, examinerRole: rt.examinerRole, email: rt.examinerEmail }}
                    onClose={() => setAssignOpen(false)}
                    onAssign={onAssign}
                />
            )}
        </div>
    );
}

function EmploymentModule({ a, fid, employment, unemployment, updateOne, onPdf, onReviewEmployer, reviews }: { a: Applicant; fid: string; employment: PrefillEmployer[]; unemployment: PrefillUnemployment[]; updateOne: UpdateFn; onPdf: () => void; onReviewEmployer: (c: EmpCheck) => void; reviews?: Record<string, ReviewSignoff> }) {
    const [mailFor, setMailFor] = useState<EmpCheck | null>(null);
    const [docMailFor, setDocMailFor] = useState<{ id: string; label: string } | null>(null);   // verification doc being asked of the employer
    const [docView, setDocView] = useState<string | null>(null);   // verification doc being viewed
    const [gapView, setGapView] = useState<PrefillUnemployment | null>(null);   // unemployment gap being viewed
    const base: EmpCheck[] = employment.map((e, i) => ({ id: `emp-${i}`, employer: e.employer, position: e.position, dates: e.dates, email: "", attempts: [], status: "pending" }));
    const checks = base.map((b) => (a.empChecks ?? []).find((c) => c.id === b.id) ?? b);
    const yearOf = (d: string) => { const m = (d || "").match(/\d{4}/g); return m ? Math.max(...m.map(Number)) : 0; };
    // Build one timeline interleaving employers and unemployment gaps, newest first.
    type TL = { kind: "emp"; check: EmpCheck; year: number } | { kind: "gap"; u: PrefillUnemployment; year: number };
    const timeline: TL[] = [
        ...checks.map((c) => ({ kind: "emp" as const, check: c, year: yearOf(c.dates) })),
        ...unemployment.map((u) => ({ kind: "gap" as const, u, year: yearOf(u.dates) })),
    ].sort((x, y) => y.year - x.year);
    const DOT: Record<string, string> = { pending: "bg-slate-300", sent: "bg-amber-500", responded: "bg-blue-500", verified: "bg-emerald-500" };
    // Per verification-doc type, how it's provided — configured in the application builder.
    const docMode = (key: string): "off" | "upload" | "ask" => a.employerDocModes?.[key] ?? "ask";
    const activeDocs = EMPLOYER_DOC_ITEMS.filter((d) => docMode(d.key) !== "off");
    // The documents this employer is being asked to provide (used in the request email) — only the "ask employer" ones.
    const docsToRequest = (c: EmpCheck) => activeDocs.filter((d) => docMode(d.key) === "ask" && !DONE_STATES.includes(a.docs?.[`doc:${c.id}:${d.key}`] ?? "pending")).map((d) => d.label);
    const requestMessage = (c: EmpCheck) => {
        const docs = docsToRequest(c);
        const period = c.dates ? ` (${c.dates})` : "";
        return [
            `Dear ${c.employer},`,
            ``,
            `We are completing an employment verification for ${a.firstName} ${a.lastName}, who has listed your company as a previous employer.`,
            ``,
            `Position: ${c.position || "Driver"}`,
            `Employment period: ${c.dates || "—"}`,
            ``,
            `Please confirm the above employment${period} and complete the attached §391.23 verification form.`,
            docs.length ? `\nThe applicant has also requested the following documents from you:\n${docs.map((d) => `  • ${d}`).join("\n")}` : ``,
            ``,
            `Thank you,`,
            `${ACTOR} — Hiring Manager`,
        ].filter((l) => l !== undefined).join("\n");
    };

    const aggregateDoc = (next: EmpCheck[]): DocStatus => next.every((c) => c.status === "verified") ? "verified" : next.every((c) => c.status === "responded" || c.status === "verified") ? "received" : next.some((c) => c.attempts.length > 0) ? "requested" : "pending";
    const writeDocs = (prev: Applicant, next: EmpCheck[]) => ({ ...(prev.docs ?? {}), [fid]: aggregateDoc(next) });

    const send = (check: EmpCheck, req: Partial<AppRequest>) => {
        const next = checks.map((c) => c.id === check.id ? { ...c, email: req.to ?? c.email, status: "sent" as const, attempts: [...c.attempts, { at: Date.now(), method: req.channel ?? "Email", to: req.to ?? "" }] } : c);
        updateOne(a.id, (prev) => ({
            empChecks: next, docs: writeDocs(prev, next),
            requests: [{ id: `rq-${Date.now()}`, fid, status: "open" as const, at: Date.now(), by: ACTOR, subject: req.subject ?? `Employment verification — ${check.employer}`, recipient: "Previous Employer" as const, to: req.to, channel: req.channel ?? "Email", message: req.message ?? "" }, ...(prev.requests ?? [])],
            events: [{ id: `ev-${Date.now()}`, type: "request", text: `Sent employment verification to ${check.employer} (attempt ${check.attempts.length + 1}/${EMP_MAX_ATTEMPTS}) via ${req.channel}`, at: Date.now(), author: ACTOR }, ...prev.events],
        }));
    };
    // Verification documents — the driver uploads them, or we ask the employer (per builder config).
    const setDocStatus = (docId: string, to: DocStatus, verb: string, label: string) => updateOne(a.id, (prev) => ({ docs: { ...(prev.docs ?? {}), [docId]: to }, events: [{ id: `ev-${Date.now()}`, type: "doc", text: `${verb} — ${label}`, at: Date.now(), author: ACTOR }, ...prev.events] }));
    const sendDoc = (req: Partial<AppRequest>, doc: { id: string; label: string }) => updateOne(a.id, (prev) => ({
        docs: { ...(prev.docs ?? {}), [doc.id]: "requested" as DocStatus },
        requests: [{ id: `rq-${Date.now()}`, fid: doc.id, status: "open" as const, at: Date.now(), by: ACTOR, subject: req.subject ?? `Request — ${doc.label}`, recipient: "Previous Employer" as const, to: req.to, channel: req.channel ?? "Email", message: req.message ?? "" }, ...(prev.requests ?? [])],
        events: [{ id: `ev-${Date.now()}`, type: "request", text: `Asked employer for ${doc.label} via ${req.channel}`, at: Date.now(), author: ACTOR }, ...prev.events],
    }));

    return (
        <div className="space-y-3 p-5">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p className="text-sm text-slate-600">Each previous employer from the application is verified independently. Send a request to the employer, record their response, then verify — up to <span className="font-semibold text-slate-700">{EMP_MAX_ATTEMPTS} attempts</span> (FMCSA requires 3).</p>
            </div>
            <div>
                {timeline.map((item, i) => {
                    const last = i === timeline.length - 1;
                    if (item.kind === "gap") {
                        return (
                            <div key={`gap-${i}`} className="relative flex gap-4">
                                <div className="relative flex w-4 shrink-0 flex-col items-center">
                                    <span className="z-10 mt-4 h-3.5 w-3.5 rounded-full bg-slate-300 ring-4 ring-white" />
                                    {!last && <span className="w-0.5 flex-1 bg-slate-200" />}
                                </div>
                                <div className="flex-1 pb-4">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.year || "—"}</p>
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 p-3.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-700">Unemployment / Gap</p>
                                                <p className="truncate text-xs text-slate-500">{item.u.comments || "No employment during this period"}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1.5">
                                                <Button variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => setGapView(item.u)}><Eye className="h-3.5 w-3.5" /> View</Button>
                                                <Button variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"><span className="text-[10px] uppercase tracking-wide text-slate-400">From</span> {item.u.from || "—"}</span>
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500"><span className="text-[10px] uppercase tracking-wide text-slate-400">To</span> {item.u.to || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    }
                    const c = item.check;
                    const docTiles = activeDocs.map((d) => {
                        const docId = `doc:${c.id}:${d.key}`;
                        const lbl = `${d.label} — ${c.employer}`;
                        return (
                            <EmployerDocTile key={docId} label={d.label}
                                status={a.docs?.[docId] ?? "pending"}
                                source={docMode(d.key) === "ask" ? "employer" : "driver"}
                                onUpload={() => setDocStatus(docId, "received", "Uploaded document", lbl)}
                                onAsk={() => setDocMailFor({ id: docId, label: lbl })}
                                onView={() => setDocView(d.label)} />
                        );
                    });
                    return (
                        <div key={c.id} className="relative flex gap-4">
                            <div className="relative flex w-4 shrink-0 flex-col items-center">
                                <span className={cn("z-10 mt-4 h-3.5 w-3.5 rounded-full ring-4 ring-white", DOT[c.status])} />
                                {!last && <span className="w-0.5 flex-1 bg-slate-200" />}
                            </div>
                            <div className="flex-1 pb-4">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.year || "—"}</p>
                                <EmployerCard c={c} docs={<>{docTiles}</>} docsTotal={activeDocs.length} docsDone={activeDocs.filter((d) => DONE_STATES.includes(a.docs?.[`doc:${c.id}:${d.key}`] ?? "pending")).length} review={reviews?.[`employment:${c.id}`]} onSend={() => setMailFor(c)} onView={() => onReviewEmployer(c)} onPdf={onPdf} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {mailFor && <RequestDialog recipients={["Previous Employer"]} lockAction prefill={{ fid, action: "Request", recipient: "Previous Employer", to: mailFor.email, subject: `Employment verification — ${mailFor.employer} · ${a.firstName} ${a.lastName}`, message: requestMessage(mailFor) }} driverEmail={a.email} onClose={() => setMailFor(null)} onSubmit={(req) => { send(mailFor, req); setMailFor(null); }} />}
            {docMailFor && <RequestDialog recipients={["Previous Employer"]} lockAction prefill={{ fid: docMailFor.id, action: "Request", recipient: "Previous Employer", subject: `Request — ${docMailFor.label}`, message: `Please provide the ${docMailFor.label} for ${a.firstName} ${a.lastName}. The applicant advised they do not have a copy.` }} driverEmail={a.email} onClose={() => setDocMailFor(null)} onSubmit={(req) => { sendDoc(req, docMailFor); setDocMailFor(null); }} />}

            {/* Verification document preview */}
            {docView && (
                <Dialog open onOpenChange={(o) => { if (!o) setDocView(null); }}>
                    <DialogContent className="max-w-lg p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Eye className="h-4 w-4" /></span> {docView}</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col items-center gap-2 p-10 text-center">
                            <FileText className="h-10 w-10 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-600">{docView}</p>
                            <p className="text-xs text-slate-400">Document preview unavailable in this prototype.</p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Unemployment / gap details */}
            {gapView && (
                <Dialog open onOpenChange={(o) => { if (!o) setGapView(null); }}>
                    <DialogContent className="max-w-md p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-600 text-white"><Eye className="h-4 w-4" /></span> Unemployment / Gap</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 p-6">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">From</p><p className="text-sm font-semibold text-slate-700">{gapView.from || "—"}</p></div>
                                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">To</p><p className="text-sm font-semibold text-slate-700">{gapView.to || "—"}</p></div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Explanation</p><p className="text-sm text-slate-600">{gapView.comments || "—"}</p></div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

function EmployerCard({ c, docs, docsDone = 0, docsTotal = 0, review, onSend, onView, onPdf }: { c: EmpCheck; docs?: React.ReactNode; docsDone?: number; docsTotal?: number; review?: ReviewSignoff; onSend: () => void; onView: () => void; onPdf: () => void }) {
    const [showDocs, setShowDocs] = useState(false);
    const tone: Record<string, string> = { pending: "bg-slate-100 text-slate-500", sent: "bg-amber-100 text-amber-700", responded: "bg-blue-100 text-blue-700", verified: "bg-emerald-100 text-emerald-700" };
    const label: Record<string, string> = { pending: "Not requested", sent: `Sent · ${c.attempts.length}/${EMP_MAX_ATTEMPTS}`, responded: "Responded", verified: "Verified" };
    const maxed = c.attempts.length >= EMP_MAX_ATTEMPTS;
    const last = c.attempts[c.attempts.length - 1];
    const tiny = "h-7 gap-1 px-2 text-xs";
    return (
        <div className="rounded-xl border border-slate-200 p-3.5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.employer}</p>
                    <p className="truncate text-xs text-slate-500">{[c.position, c.dates].filter(Boolean).join(" · ") || "Previous employer"}</p>
                </div>
                {/* Three actions in the top-right corner: View · PDF · Send request */}
                <div className="flex shrink-0 items-center gap-1.5">
                    <Button variant="outline" className={tiny} onClick={onView}><Eye className="h-3.5 w-3.5" /> View</Button>
                    <Button variant="outline" className={tiny} onClick={onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                    {c.status !== "verified" && <Button className={tiny} disabled={maxed} onClick={onSend}><Send className="h-3.5 w-3.5" /> {c.attempts.length ? `Resend` : "Send request"}</Button>}
                </div>
            </div>
            {/* Status chips on their own full-width row — kept side by side */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {review
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Reviewed by {review.by} · {review.date}</span>
                    : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Not reviewed</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", tone[c.status])}>{label[c.status]}</span>
            </div>
            {last && <p className="mt-2 text-xs text-slate-400">Last request {relativeTime(last.at)} · to {last.to || "—"} via {last.method}</p>}
            {c.attempts.length >= 3 && c.status !== "verified" && <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> {c.attempts.length} attempts — good-faith effort documented.</p>}
            {maxed && c.status !== "verified" && c.status !== "responded" && <p className="mt-1 text-xs font-medium text-rose-500">Maximum {EMP_MAX_ATTEMPTS} attempts reached.</p>}
            {/* This employer's documents — collapsed by default, expand to see the tiles */}
            {docs && docsTotal > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                    <button type="button" onClick={() => setShowDocs((v) => !v)} className="flex w-full items-center justify-between gap-2 text-left">
                        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                            <FileText className="h-3.5 w-3.5 text-slate-400" /> Verification Documents
                            <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", docsDone === docsTotal ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{docsDone}/{docsTotal}</span>
                        </span>
                        <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", showDocs && "rotate-180")} />
                    </button>
                    {showDocs && <div className="mt-2 space-y-2">{docs}</div>}
                </div>
            )}
        </div>
    );
}

function DecisionPanel({ a, steps, doneDocs, totalDocs, doneSteps, setStatus, onPacket }: {
    a: Applicant; steps: HiringTemplate["steps"]; doneDocs: number; totalDocs: number; doneSteps: number; setStatus: (s: AppStatus) => void; onPacket: () => void;
}) {
    return (
        <div className="space-y-5 border-t border-slate-100 pt-5">
            <div className="grid grid-cols-3 gap-3">
                <Stat label="Steps complete" value={`${doneSteps}/${steps.length}`} />
                <Stat label="Documents in" value={`${doneDocs}/${totalDocs}`} />
                <Stat label="Open items" value={`${totalDocs - doneDocs}`} />
            </div>
            <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">Decision</p>
                <div className="flex flex-wrap gap-2">
                    {STATUS_ORDER.map((s) => {
                        const meta = STATUS_META[s];
                        const active = a.status === s;
                        return <button key={s} type="button" onClick={() => setStatus(s)} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition", active ? "border-transparent " + meta.badge : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50")}><meta.Icon className="h-3.5 w-3.5" /> {meta.label}</button>;
                    })}
                </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-600"><FileText className="h-4 w-4 text-slate-400" /> The complete file — application data and every document — as one PDF.</div>
                <Button size="sm" className="mt-2" onClick={onPacket}><FileText className="h-4 w-4" /> Open full packet (PDF)</Button>
            </div>
        </div>
    );
}
function Stat({ label, value }: { label: string; value: string }) {
    return <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center"><p className="text-xl font-bold text-slate-900">{value}</p><p className="text-[11px] font-medium text-slate-400">{label}</p></div>;
}

// ── Sidebar cards ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, right, children }: { title: string; icon?: React.ElementType; right?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800">{Icon && <Icon className="h-4 w-4 text-slate-400" />}{title}</h3>{right}</div>
            {children}
        </div>
    );
}


function RequestsCard({ requests, onResolve, onNew }: { requests: AppRequest[]; onResolve: (r: AppRequest) => void; onNew: () => void }) {
    return (
        <Card title="Requests" right={<span className={cn("text-xs font-bold", requests.length ? "text-amber-600" : "text-slate-400")}>{requests.length} open</span>}>
            <Button size="sm" className="mb-3 w-full" onClick={onNew}><MessageSquarePlus className="h-4 w-4" /> Ask / Order</Button>
            {requests.length === 0 ? <p className="py-2 text-center text-xs text-slate-400">No open requests.</p> : (
                <div className="space-y-2">
                    {requests.map((r) => (
                        <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                            <div className="flex items-center gap-1.5">
                                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">{(r.action ?? "Request").toUpperCase()}</span>
                                <span className="truncate text-[13px] font-semibold text-slate-800">{r.subject}</span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">{r.recipient} · via {r.channel.toLowerCase()} · {relativeTime(r.at)}</p>
                            <button type="button" onClick={() => onResolve(r)} className="mt-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Record output →</button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

function ActivityCard({ a }: { a: Applicant }) {
    return (
        <Card title="Activity">
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {a.events.map((e) => (
                    <div key={e.id} className="flex items-start gap-2"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" /><div className="min-w-0 flex-1"><p className="text-[13px] text-slate-700">{e.text}</p><p className="text-[11px] text-slate-400">{e.author} · {relativeTime(e.at)}</p></div></div>
                ))}
                {a.events.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
            </div>
        </Card>
    );
}

// Consent review — a left sidebar listing every consent form (like the application
// form's steps sidebar) + the selected consent rendered on the right, with Mark received.
function ConsentReviewView({ consents, pf, statusOf, existingReview, initialMode = "form", onReceived, onReview, onBack }: {
    consents: string[]; pf: ApplicantPrefill; existingReview?: ReviewSignoff; initialMode?: "form" | "document";
    statusOf: (fid: string) => DocStatus; onReceived: (fid: string) => void; onReview: (r: ReviewSignoff) => void; onBack: () => void;
}) {
    const [branding] = useCompanyBranding();
    const [mode, setMode] = useState<"form" | "document">(initialMode);
    const values: Record<string, string> = {
        company: branding.name, applicant: pf.fullName, printName: pf.fullName, driverName: pf.fullName,
        ssn: pf.ssn, licenseNumber: pf.licenses[0]?.number ?? "", state: pf.licenses[0]?.authority ?? "", date: "",
    };
    const sigsFor = (d: (typeof POLICY_FORMS)[number]) => Object.fromEntries(d.signers.filter((s) => s.kind === "sign").map((s) => [s.key, ""]));
    return (
        <div className="min-h-screen bg-slate-50">
            <style>{`@media print { body * { visibility: hidden !important; } #consent-print, #consent-print * { visibility: visible !important; } #consent-print { position: absolute !important; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }`}</style>
            <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Hiring file</button>
                <div className="flex items-center gap-3">
                    {/* Form (our consent form UI) vs Document / PDF */}
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {(["form", "document"] as const).map((vw) => (
                            <button key={vw} type="button" onClick={() => setMode(vw)} className={cn("rounded-md px-3 py-1 text-xs font-semibold transition", mode === vw ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{vw === "form" ? "Form" : "Document / PDF"}</button>
                        ))}
                    </div>
                    {mode === "document" && <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="h-4 w-4" /> Print / Save PDF</Button>}
                </div>
            </div>
            <div id="consent-print" className="mx-auto max-w-4xl space-y-6 px-6 py-8">
                <div className="no-print">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Consent &amp; Authorization</p>
                    <h1 className="text-2xl font-bold text-slate-900">Signed Consent Forms</h1>
                    <p className="mt-1 text-sm text-slate-500">Every consent the driver signed, shown one by one for review. {mode === "form" ? "Shown in our consent form layout." : "Read-only document copies — print or save as PDF."}</p>
                </div>

                {existingReview && <div className="no-print"><ReviewedBanner review={existingReview} /></div>}

                {/* All consents, one after another */}
                {consents.map((fid, i) => {
                    const def = POLICY_FORMS.find((p) => p.id === fid);
                    const st = statusOf(fid);
                    const m = DOC_STATUS_META[st];
                    return (
                        <div key={fid} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">{i + 1}</span>
                                    <h2 className="text-sm font-bold text-slate-800">{stepName(fid)}</h2>
                                </div>
                                <span className={cn("inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold", m.badge)}>{m.label}</span>
                            </div>
                            <div className="overflow-x-auto p-5">
                                {mode === "form"
                                    ? <PrefillProvider value={pf}><HiringFormView formId={fid} embedded onBack={onBack} /></PrefillProvider>
                                    : def
                                        ? <PolicyDocument def={def} values={values} sigs={sigsFor(def)} branding={branding} />
                                        : <p className="text-sm text-slate-400">This consent has no document template.</p>}
                            </div>
                        </div>
                    );
                })}

                {/* Review checklist — each consent signed & on file */}
                {consents.length > 0 && (
                    <div className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Review checklist</p>
                        <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                            {consents.map((fid) => <CheckLine key={fid} ok={DONE_STATES.includes(statusOf(fid))} label={`${stepName(fid)} signed`} />)}
                            <CheckLine ok={consents.every((f) => DONE_STATES.includes(statusOf(f)))} label="All consents received" />
                        </ul>
                    </div>
                )}

                {/* Review & sign-off at the end */}
                <div className="no-print">
                    <ReviewSignOff label="I have reviewed all consent forms above." signedNote="Consents reviewed & signed" existing={existingReview}
                        onConfirm={(r) => { consents.forEach((f) => onReceived(f)); onReview({ ...r, at: Date.now() }); }} />
                </div>
            </div>
        </div>
    );
}

function NotFound({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-center">
            <AlertCircle className="h-10 w-10 text-slate-300" />
            <p className="text-slate-500">This hiring file could not be found.</p>
            <Button variant="outline" onClick={onBack}><ChevronLeft className="h-4 w-4" /> Back to Hiring</Button>
        </div>
    );
}
