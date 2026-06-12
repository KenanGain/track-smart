import { useState } from "react";
import {
    ChevronLeft, ChevronDown, Check, Send, FileSearch, BadgeCheck, SkipForward, RotateCcw,
    AlertCircle, Clock, ExternalLink, Mail,
    MessageSquarePlus, FileText, StickyNote, PenLine, CreditCard, FileSignature, Upload, Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    useApplicants, ACTOR, STATUS_META, STATUS_ORDER, DOC_STATUS_META, relativeTime, formName, formRegion, EMP_MAX_ATTEMPTS, REQUEST_ACTIONS,
    type AppStatus, type DocStatus, type Applicant, type AppRequest, type RequestRecipient, type RequestChannel, type RequestAction, type EmpCheck, type UploadedFile, type Remark,
} from "./applicants.data";
import { useHiringTemplates, stepName, stepGroup, stepFormMode, fulfillModeFor, FULFILL_META, type HiringTemplate, type FulfillMode } from "./hiring-templates.data";
import { getChecklist } from "./checklists.data";
import { ChecklistRunner, buildChecklistSections, checklistProgress } from "./ChecklistRunner";
import { HiringFormView } from "./formRegistry";
import { ThemedDocumentViewer } from "./ThemedDocumentViewer";
import { HiringPdfReview } from "./HiringPdfReview";
import { PrefillProvider, buildPrefill, type PrefillEmployer, type ApplicantPrefill } from "./application-prefill";
import { SignaturePad } from "./FormKit";
import { PolicyDocument } from "./PolicyForm";
import { POLICY_FORMS } from "./policy-forms.data";
import { useCompanyBranding } from "../ats/company-branding.data";
import type { DocSection } from "./FormDocument";

const TEMPLATE_FOR_FORM: Record<string, string> = { us: "tpl-us", canada: "tpl-canada", "cross-border": "tpl-cross" };
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
    const [openConsent, setOpenConsent] = useState<string | null>(null);   // consent review (sidebar list + form)
    const [showPacket, setShowPacket] = useState(false);
    const [pdfReview, setPdfReview] = useState<number | null>(null);
    const [showChecklistPdf, setShowChecklistPdf] = useState(false);
    const [selected, setSelected] = useState(0);
    const [reqOpen, setReqOpen] = useState<Partial<AppRequest> | null>(null);
    const [note, setNote] = useState("");
    const [openByStep, setOpenByStep] = useState<Record<string, string | null>>({});   // expanded item row, per step id

    const a = applicants.find((x) => x.id === applicantId);
    if (!a) return <NotFound onBack={onBack} />;

    const tpl: HiringTemplate | undefined = templates.find((t) => t.name === a.template) ?? templates.find((t) => t.id === TEMPLATE_FOR_FORM[a.formId]) ?? templates[0];
    const steps = tpl?.steps ?? [];
    const docOf = (fid: string): DocStatus => a.docs?.[fid] ?? "pending";
    const stepDone = (s: HiringTemplate["steps"][number]) => s.formIds.length > 0 && s.formIds.every((f) => DONE_STATES.includes(docOf(f)));
    const currentIdx = steps.findIndex((s) => !stepDone(s));
    const sel = Math.min(selected, steps.length - 1);
    const step = steps[sel];
    const pf = buildPrefill(a);
    const empFid = step?.formIds.find((f) => f === "dot-verification" || f === "employment-verification");
    const isEmpStep = !!empFid && pf.employment.length > 0;
    const checklist = getChecklist(tpl?.checklistId);
    // Hiring review shows only Stage 1 (the hiring decision); later stages are completed in Onboarding.
    const reviewChecklist = checklist ? { ...checklist, stages: checklist.stages.slice(0, 1) } : undefined;
    const clState = a.checklistState ?? {};
    // The step's required items (forms + license uploads). Empty for review / employment steps (handled specially).
    const items = step && step.kind !== "review" && !isEmpStep ? stepItems(step) : [];
    // Collapsible item rows: single-item steps open by default; multi-item steps collapsed.
    const defaultOpen = items.length === 1 ? items[0].id : null;
    const rowOpen = step && step.id in openByStep ? openByStep[step.id] : defaultOpen;
    const toggleRow = (id: string) => { if (step) setOpenByStep((m) => ({ ...m, [step.id]: (step.id in m ? m[step.id] : defaultOpen) === id ? null : id })); };

    // ── application & packet documents ──
    const appSections: DocSection[] = (a.submission ?? []).map((s) => ({ title: s.title, groups: s.groups.map((g) => ({ label: g.label, rows: g.fields.map((f) => ({ label: f.label, value: f.value })) })) }));
    const totalDocs = steps.reduce((n, s) => n + s.formIds.length, 0);
    const doneDocs = steps.reduce((n, s) => n + s.formIds.filter((f) => DONE_STATES.includes(docOf(f))).length, 0);
    const consents = steps.reduce((n, s) => n + s.formIds.filter((f) => stepGroup(f) === "Policy").length, 0);
    const doneSteps = steps.filter(stepDone).length;
    const openRequests = (a.requests ?? []).filter((r) => r.status === "open");
    const phase = STATUS_META[a.status];
    const pipelineDays = Math.max(0, Math.floor((Date.now() - (Date.parse(a.invitedAt) || Date.now())) / 86_400_000));

    if (openForm === "application") return <ThemedDocumentViewer title={`${formName(a.formId)} Application`} subtitle={`${a.firstName} ${a.lastName} · ${a.email}`} badge={(formRegion(a.formId) || "").toUpperCase() || undefined} sections={appSections} fileName={`${a.firstName}-${a.lastName}-application.pdf`} onBack={() => setOpenForm(null)} backLabel="Hiring file" emptyTitle="Application not submitted yet" emptyText="The driver is still completing the application. Once submitted, it appears here as a document you can print or download." />;
    if (openForm) return <PrefillProvider value={buildPrefill(a)}><HiringFormView formId={openForm} onBack={() => setOpenForm(null)} /></PrefillProvider>;
    if (openConsent) {
        const consentIds = (steps.find((s) => s.kind === "app")?.formIds ?? []).filter((f) => stepGroup(f) === "Policy");
        const markReceived = (f: string) => updateOne(a.id, (prev) => ({ docs: { ...(prev.docs ?? {}), [f]: "received" as DocStatus }, events: [{ id: `ev-${Date.now()}`, type: "doc", text: `Marked received — ${stepName(f)}`, at: Date.now(), author: ACTOR }, ...prev.events] }));
        return <ConsentReviewView consents={consentIds} pf={pf} initial={openConsent} statusOf={docOf} onReceived={markReceived} onBack={() => setOpenConsent(null)} />;
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
    const completeStep = (s: HiringTemplate["steps"][number]) => updateOne(a.id, (prev) => {
        const docs = { ...(prev.docs ?? {}) };
        s.formIds.forEach((f) => { docs[f] = "received"; });
        return { docs, events: [{ id: `ev-${Date.now()}`, type: "complete", text: `Completed step — ${s.title}`, at: Date.now(), author: ACTOR }, ...prev.events] };
    });
    const reopenStep = (s: HiringTemplate["steps"][number]) => updateOne(a.id, (prev) => {
        const docs = { ...(prev.docs ?? {}) };
        s.formIds.forEach((f) => { docs[f] = "pending"; });
        return { docs, events: [{ id: `ev-${Date.now()}`, type: "step", text: `Reopened step — ${s.title}`, at: Date.now(), author: ACTOR }, ...prev.events] };
    });
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
    // Per-item remark — tagged with the step + item so it shows in that item's dropdown and is labelled in the global notes.
    const addItemNote = (s: HiringTemplate["steps"][number], item: StepItem, text: string) => { const t = text.trim(); if (!t) return; updateOne(a.id, (prev) => ({ remarks: [{ id: `rm-${Date.now()}`, text: t, at: new Date().toLocaleString(), author: ACTOR, stepId: s.id, stepTitle: s.title, formId: item.id, formLabel: item.label }, ...prev.remarks], events: [{ id: `ev-${Date.now()}`, type: "note", text: `Remark (${item.label}): ${t}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
    const markReviewed = (s: HiringTemplate["steps"][number]) => updateOne(a.id, (prev) => ({ events: [{ id: `ev-${Date.now()}`, type: "review", text: `Reviewed step — ${s.title}`, at: Date.now(), author: ACTOR }, ...prev.events] }));

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
                                const done = stepDone(s);
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
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Step {sel + 1} of {steps.length}</p>
                                        <h2 className="text-lg font-bold text-slate-900">{step.title}</h2>
                                    </div>
                                    <div className="ml-auto flex flex-wrap gap-2">
                                        <Button variant="outline" size="sm" onClick={() => markReviewed(step)}><BadgeCheck className="h-4 w-4" /> Mark reviewed</Button>
                                        {stepDone(step)
                                            ? <Button variant="outline" size="sm" onClick={() => reopenStep(step)}><RotateCcw className="h-4 w-4" /> Mark incomplete</Button>
                                            : <Button size="sm" onClick={() => completeStep(step)}><Check className="h-4 w-4" /> Mark complete</Button>}
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
                                    <EmploymentModule a={a} fid={empFid!} employment={pf.employment} pf={pf} updateOne={updateOne} onPdf={() => setPdfReview(sel)} stepId={step.id} stepTitle={step.title} />
                                ) : (
                                    <div className="space-y-2.5 p-5">
                                        {items.map((item) => (
                                            <StepItemRow key={item.id} item={item} a={a} data={item.kind === "form" ? formDataRows(item.fid!, pf) : []} mode={item.fid ? stepFormMode(step, item.fid) : "upload"}
                                                open={rowOpen === item.id} onToggle={() => toggleRow(item.id)}
                                                remarks={a.remarks.filter((r) => r.formId === item.id)} onAddRemark={(t) => addItemNote(step, item, t)}
                                                onForm={() => { if (item.kind === "consent") setOpenConsent(item.subIds?.[0] ?? null); else if (item.fid) setOpenForm(item.fid); }} onPdf={() => setPdfReview(sel)} onRequest={() => openRequestFor(item.fid)} onSet={(to, verb) => { if (item.kind === "consent") (item.subIds ?? []).forEach((f) => setDoc(f, to, verb)); else setDoc(item.id, to, verb); }} />
                                        ))}
                                        {items.length === 0 && <p className="text-sm text-slate-400">No items in this step.</p>}
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

// ── Document row ──────────────────────────────────────────────────────────────
// The key data shown for a step's form, pulled from the application.
function formDataRows(fid: string, pf: ApplicantPrefill): { label: string; value: string }[] {
    const n = stepName(fid).toLowerCase();
    const lic = pf.licenses[0];
    if (fid === "application") return [{ label: "Applicant", value: pf.fullName }, { label: "Email", value: pf.email }, { label: "Phone", value: pf.phone || "—" }, { label: "Position", value: pf.position }];
    if (/license/.test(n)) return lic ? [{ label: "License #", value: lic.number || "—" }, { label: "Class", value: lic.cls || "—" }, { label: "Issuing State / Province", value: lic.authority || "—" }, { label: "Expiration", value: lic.exp || "—" }] : [{ label: "Driver", value: pf.fullName }];
    if (/abstract|mvr|driving|psp|cvdr|cda|record/.test(n)) return [{ label: "Driver", value: pf.fullName }, ...(lic ? [{ label: "License #", value: lic.number || "—" }, { label: "Issuing State / Province", value: lic.authority || "—" }] : [])];
    if (/criminal/.test(n)) return [{ label: "Driver", value: pf.fullName }, ...(pf.dob ? [{ label: "DOB", value: pf.dob }] : []), ...(pf.ssn ? [{ label: "SSN / SIN", value: pf.ssn }] : []), ...(pf.address.full ? [{ label: "Address", value: pf.address.full }] : [])];
    if (/substance|clearinghouse|medical|annual/.test(n)) return [{ label: "Driver", value: pf.fullName }, ...(lic ? [{ label: "CDL #", value: lic.number || "—" }] : [])];
    if (stepGroup(fid) === "Policy") return [{ label: "Applicant", value: pf.fullName }, ...(lic ? [{ label: "License #", value: lic.number || "—" }] : [])];
    return [{ label: "Driver", value: pf.fullName }];
}

// ── Per-step required items ──────────────────────────────────────────────────
// A step is a checklist of items. Items are forms (filled / ordered / uploaded) or
// the combined consent pack. Each item tracks its own status.
type StepItem = { id: string; label: string; kind: "form" | "consent"; fid?: string; subIds?: string[] };

// The standard employer-supplied verification documents (driver uploads OR we ask the employer).
const EMPLOYER_DOC_ITEMS = [
    { key: "performance", label: "Employer Performance Verification" },
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

const isDone = (a: Applicant, fid: string) => DONE_STATES.includes(a.docs?.[fid] ?? "pending");

// An item's status. Consent pack = received only when every consent is done.
function itemStatus(item: StepItem, a: Applicant): DocStatus {
    if (item.kind === "consent") {
        const all = item.subIds ?? [];
        return all.length > 0 && all.every((f) => isDone(a, f)) ? "received" : "pending";
    }
    return a.docs?.[item.id] ?? "pending";
}

// A driver's-license styled card for the License Details data.
function LicenseCardBody({ data }: { data: { label: string; value: string }[] }) {
    const get = (kw: string) => data.find((d) => d.label.toLowerCase().includes(kw))?.value || "—";
    return (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-white">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest"><CreditCard className="h-3.5 w-3.5" /> Driver License</span>
                <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold">{get("class")}</span>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-white p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">License Number</p>
                <p className="font-mono text-xl font-bold tracking-wider text-slate-900">{get("license")}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Issuing State / Province</p><p className="text-sm font-semibold text-slate-700">{get("issuing")}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Expiration</p><p className="text-sm font-semibold text-slate-700">{get("expiration")}</p></div>
                </div>
            </div>
        </div>
    );
}

// A checklist item row: header (label + status + inline actions) always visible;
// the data/actions + per-item remarks show in the dropdown when expanded.
function StepItemRow({ item, a, data, mode, open, onToggle, remarks, onAddRemark, onForm, onPdf, onRequest, onSet }: {
    item: StepItem; a: Applicant; data: { label: string; value: string }[]; mode: FulfillMode; open: boolean; onToggle: () => void;
    remarks: Remark[]; onAddRemark: (text: string) => void;
    onForm: () => void; onPdf: () => void; onRequest: () => void; onSet: (to: DocStatus, verb: string) => void;
}) {
    const status = itemStatus(item, a);
    const meta = DOC_STATUS_META[status];
    const tiny = "h-7 shrink-0 gap-1 px-2 text-xs";
    const isConsent = item.kind === "consent";
    const isApp = item.fid === "application";
    const isLicense = item.fid === "driver-license";
    // Report forms can be ordered OR provided (filled / uploaded) by the manager.
    const ordering = mode === "order";
    const uploading = mode === "upload" || mode === "upload-fill";
    const imagesOk = isLicense ? licenseImagesSubmitted(a) : false;
    return (
        <div className={cn("overflow-hidden rounded-xl border transition", open ? "border-slate-300 shadow-sm" : "border-slate-200")}>
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold text-slate-900">
                    <span className="truncate">{isConsent ? `${item.label} · ${item.subIds?.length ?? 0}` : item.label}</span>
                    {isLicense && <span className={cn("hidden shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:inline-block", imagesOk ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>{imagesOk ? "Front & Back ✓" : "Images missing"}</span>}
                </button>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.badge)}>{meta.label}</span>
                {isConsent ? (
                    <>
                        <Button variant="outline" className={tiny} onClick={onForm}><FileSignature className="h-3.5 w-3.5" /> View</Button>
                        {status !== "received" && <Button className={tiny} onClick={() => onSet("received", "Marked received")}><Check className="h-3.5 w-3.5" /> Received</Button>}
                    </>
                ) : (
                    <>
                        <Button variant="outline" className={tiny} onClick={onForm}><PenLine className="h-3.5 w-3.5" /> {isApp || isLicense ? "View" : "Form"}</Button>
                        <Button variant="outline" className={tiny} onClick={onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>
                        {ordering && <Button className={tiny} onClick={onRequest}><FileSearch className="h-3.5 w-3.5" /> Order / Request</Button>}
                        {(ordering || uploading) && status === "pending" && <Button variant={ordering ? "outline" : "default"} className={tiny} onClick={() => onSet("received", FULFILL_VERB[ordering ? "upload" : mode])}><Upload className="h-3.5 w-3.5" /> Upload</Button>}
                        {mode === "fill" && status === "pending" && <Button className={tiny} onClick={() => onSet("received", "Marked received")}><Check className="h-3.5 w-3.5" /> Received</Button>}
                    </>
                )}
                <button type="button" onClick={onToggle} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>
            </div>
            {open && (
                <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                    {isConsent
                        ? <ConsentItemBody a={a} subIds={item.subIds ?? []} />
                        : <FormCardBody fid={item.fid!} status={status} data={data} mode={mode} onSet={onSet} extraNote={isLicense ? (imagesOk ? "Driver submitted both license images (front & back)." : "Driver has not submitted both license images.") : undefined} />}
                    <ItemRemarks remarks={remarks} label={item.label} onAdd={onAddRemark} />
                </div>
            )}
        </div>
    );
}

// Dropdown body for the combined consent pack — lists each consent + status.
function ConsentItemBody({ a, subIds }: { a: Applicant; subIds: string[] }) {
    return (
        <div>
            <p className="mb-2 text-xs text-slate-400">Open <span className="font-semibold text-slate-600">View</span> to review and sign each consent in the sidebar.</p>
            <div className="overflow-hidden rounded-lg border border-slate-200 divide-y divide-slate-100">
                {subIds.map((f) => {
                    const st = a.docs?.[f] ?? "pending";
                    const m = DOC_STATUS_META[st];
                    return (
                        <div key={f} className="flex items-center gap-2 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">{stepName(f)}</span>
                            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", m.badge)}>{m.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Per-item remarks block (lives in the row dropdown).
function ItemRemarks({ remarks, label, onAdd }: { remarks: Remark[]; label: string; onAdd: (text: string) => void }) {
    const [draft, setDraft] = useState("");
    return (
        <div className="rounded-lg border border-slate-100 bg-slate-50/40 p-3">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Remarks</p>
            <div className="flex gap-2">
                <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder={`Add a remark for ${label}…`} className="resize-none bg-white" />
                <Button size="sm" className="self-end" disabled={!draft.trim()} onClick={() => { onAdd(draft); setDraft(""); }}>Add</Button>
            </div>
            {remarks.length > 0 && (
                <div className="mt-2 space-y-1.5">
                    {remarks.map((r) => (
                        <div key={r.id} className="rounded-md border border-slate-100 bg-white px-2.5 py-1.5">
                            <p className="text-[13px] text-slate-700">{r.text}</p>
                            <p className="text-[10px] text-slate-400">{r.author} · {r.at}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// The submitted-data view for a form item (shown in the dropdown). Header carries
// the Form / PDF / Order buttons; here we show what was submitted + completion actions.
function FormCardBody({ fid, status, data, mode = "fill", extraNote, onSet }: { fid: string; status: DocStatus; data: { label: string; value: string }[]; mode?: FulfillMode; extraNote?: string; onSet: (to: DocStatus, verb: string) => void }) {
    const group = stepGroup(fid);
    const canVerify = group === "Policy" || /employ|verif/i.test(stepName(fid));
    const isApp = fid === "application";
    const isLicense = fid === "driver-license";
    const tiny = "h-7 gap-1 px-2 text-xs";
    const subByStatus = status === "pending" ? "Not started" : status === "requested" ? "Sent / awaiting output" : status === "received" ? "Output recorded" : status === "verified" ? "Verified" : "Skipped";
    const sub = isApp ? "Submitted application — open Form / PDF to review" : `${FULFILL_META[mode].label} · ${subByStatus}`;

    return (
        <div>
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">Submitted in the application</p>
            <p className="text-xs text-slate-400">{sub}</p>
            {extraNote && <p className="mt-1 text-xs font-medium text-slate-500">{extraNote}</p>}
            {isLicense ? <LicenseCardBody data={data} /> : data.length > 0 && (
                <dl className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    {data.map((d, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 border-b border-dashed border-slate-100 py-1.5">
                            <dt className="shrink-0 text-xs text-slate-400">{d.label}</dt>
                            <dd className="truncate text-sm font-medium text-slate-700">{d.value || "—"}</dd>
                        </div>
                    ))}
                </dl>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {status === "requested" && <Button className={tiny} onClick={() => onSet("received", "Upload result")}><Check className="h-3.5 w-3.5" /> Upload result</Button>}
                {status === "received" && canVerify && <Button className={tiny} onClick={() => onSet("verified", "Verified")}><BadgeCheck className="h-3.5 w-3.5" /> Verify</Button>}
                {status !== "pending" && <button type="button" title="Reset" onClick={() => onSet("pending", "Reset")} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><RotateCcw className="h-3.5 w-3.5" /></button>}
                {!DONE_STATES.includes(status) && <button type="button" title="Skip" onClick={() => onSet("skipped", "Skipped")} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><SkipForward className="h-3.5 w-3.5" /></button>}
            </div>
        </div>
    );
}

// ── Employment Verification module ───────────────────────────────────────────
type UpdateFn = (id: string, patch: (prev: Applicant) => Partial<Applicant>) => void;

function EmploymentModule({ a, fid, employment, pf, updateOne, onPdf, stepId, stepTitle }: { a: Applicant; fid: string; employment: PrefillEmployer[]; pf: ApplicantPrefill; updateOne: UpdateFn; onPdf: () => void; stepId: string; stepTitle: string }) {
    const [mailFor, setMailFor] = useState<EmpCheck | null>(null);
    const [formPopup, setFormPopup] = useState<EmpCheck | null>(null);   // our blank verification form (what we send to the employer)
    const [viewPopup, setViewPopup] = useState<EmpCheck | null>(null);   // what the end user / employer filled in
    const [docMailFor, setDocMailFor] = useState<{ id: string; label: string } | null>(null);   // verification doc being asked of the employer
    const [verifyFor, setVerifyFor] = useState<EmpCheck | null>(null);     // employer being verified — hiring manager signs
    const [verifySig, setVerifySig] = useState("");
    const base: EmpCheck[] = employment.map((e, i) => ({ id: `emp-${i}`, employer: e.employer, position: e.position, dates: e.dates, email: "", attempts: [], status: "pending" }));
    const checks = base.map((b) => (a.empChecks ?? []).find((c) => c.id === b.id) ?? b);
    const yearOf = (d: string) => { const m = (d || "").match(/\d{4}/g); return m ? Math.max(...m.map(Number)) : 0; };
    const sorted = [...checks].sort((x, y) => yearOf(y.dates) - yearOf(x.dates));
    const DOT: Record<string, string> = { pending: "bg-slate-300", sent: "bg-amber-500", responded: "bg-blue-500", verified: "bg-emerald-500" };

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
    const respond = (check: EmpCheck) => { const next = checks.map((c) => c.id === check.id ? { ...c, status: "responded" as const, respondedAt: Date.now() } : c); updateOne(a.id, (prev) => ({ empChecks: next, docs: writeDocs(prev, next), requests: (prev.requests ?? []).map((r) => (r.fid === fid && r.status === "open" ? { ...r, status: "resolved" as const } : r)), events: [{ id: `ev-${Date.now()}`, type: "emp", text: `Recorded response from ${check.employer}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
    const verify = (check: EmpCheck, sig: string) => { const next = checks.map((c) => c.id === check.id ? { ...c, status: "verified" as const, verifiedAt: Date.now(), verifierSig: sig } : c); updateOne(a.id, (prev) => ({ empChecks: next, docs: writeDocs(prev, next), events: [{ id: `ev-${Date.now()}`, type: "emp", text: `Verified & signed employment — ${check.employer}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
    const reset = (check: EmpCheck) => { const next = checks.map((c) => c.id === check.id ? { ...c, status: "pending" as const, attempts: [], respondedAt: undefined, verifiedAt: undefined } : c); updateOne(a.id, (prev) => ({ empChecks: next, docs: writeDocs(prev, next), events: [{ id: `ev-${Date.now()}`, type: "emp", text: `Reset employment check — ${check.employer}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };

    // Verification documents — the driver uploads them, or (default) we ask the employer.
    const setDocSource = (docId: string, src: "driver" | "employer") => updateOne(a.id, (prev) => ({ docSource: { ...(prev.docSource ?? {}), [docId]: src } }));
    const setDocStatus = (docId: string, to: DocStatus, verb: string, label: string) => updateOne(a.id, (prev) => ({ docs: { ...(prev.docs ?? {}), [docId]: to }, events: [{ id: `ev-${Date.now()}`, type: "doc", text: `${verb} — ${label}`, at: Date.now(), author: ACTOR }, ...prev.events] }));
    const addDocNote = (docId: string, label: string, text: string) => { const t = text.trim(); if (!t) return; updateOne(a.id, (prev) => ({ remarks: [{ id: `rm-${Date.now()}`, text: t, at: new Date().toLocaleString(), author: ACTOR, stepId, stepTitle, formId: docId, formLabel: label }, ...prev.remarks], events: [{ id: `ev-${Date.now()}`, type: "note", text: `Remark (${label}): ${t}`, at: Date.now(), author: ACTOR }, ...prev.events] })); };
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
                {sorted.map((c, i) => {
                    const docRows = EMPLOYER_DOC_ITEMS.map((d) => {
                        const docId = `doc:${c.id}:${d.key}`;
                        const lbl = `${d.label} — ${c.employer}`;
                        return (
                            <DocItemRow key={docId} docId={docId} label={d.label}
                                status={a.docs?.[docId] ?? "pending"}
                                source={a.docSource?.[docId] ?? "employer"}
                                remarks={a.remarks.filter((r) => r.formId === docId)}
                                onSource={(s) => setDocSource(docId, s)}
                                onUpload={() => setDocStatus(docId, "received", "Uploaded document", lbl)}
                                onAsk={() => setDocMailFor({ id: docId, label: lbl })}
                                onReset={() => setDocStatus(docId, "pending", "Reset", lbl)}
                                onAddRemark={(t) => addDocNote(docId, lbl, t)} />
                        );
                    });
                    const docsDone = EMPLOYER_DOC_ITEMS.filter((d) => DONE_STATES.includes(a.docs?.[`doc:${c.id}:${d.key}`] ?? "pending")).length;
                    return (
                        <div key={c.id} className="relative flex gap-4">
                            <div className="relative flex w-4 shrink-0 flex-col items-center">
                                <span className={cn("z-10 mt-4 h-3.5 w-3.5 rounded-full ring-4 ring-white", DOT[c.status])} />
                                {i < sorted.length - 1 && <span className="w-0.5 flex-1 bg-slate-200" />}
                            </div>
                            <div className="flex-1 pb-4">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{yearOf(c.dates) ? yearOf(c.dates) : "—"}</p>
                                <EmployerCard c={c} docs={<>{docRows}</>} docsCount={EMPLOYER_DOC_ITEMS.length} docsDone={docsDone} onSend={() => setMailFor(c)} onRespond={() => respond(c)} onVerify={() => { setVerifySig(""); setVerifyFor(c); }} onReset={() => reset(c)} onForm={() => setFormPopup(c)} onView={() => setViewPopup(c)} onPdf={onPdf} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {mailFor && <RequestDialog recipients={["Previous Employer"]} lockAction prefill={{ fid, action: "Request", recipient: "Previous Employer", to: mailFor.email, subject: `Employment verification — ${mailFor.employer}`, message: `Please verify ${a.firstName} ${a.lastName}'s employment as ${mailFor.position || "driver"} (${mailFor.dates || "—"}) and complete and return the attached verification form.` }} driverEmail={a.email} onClose={() => setMailFor(null)} onSubmit={(req) => { send(mailFor, req); setMailFor(null); }} />}
            {docMailFor && <RequestDialog recipients={["Previous Employer"]} lockAction prefill={{ fid: docMailFor.id, action: "Request", recipient: "Previous Employer", subject: `Request — ${docMailFor.label}`, message: `Please provide the ${docMailFor.label} for ${a.firstName} ${a.lastName}. The applicant advised they do not have a copy.` }} driverEmail={a.email} onClose={() => setDocMailFor(null)} onSubmit={(req) => { sendDoc(req, docMailFor); setDocMailFor(null); }} />}

            {/* Our blank verification form — what we send to the employer */}
            {formPopup && (
                <Dialog open onOpenChange={(o) => { if (!o) setFormPopup(null); }}>
                    <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><FileSignature className="h-4 w-4" /></span> Verification form — sent to {formPopup.employer}</DialogTitle>
                            <p className="text-sm font-normal text-slate-500">This is the form we send to the employer to complete and return.</p>
                        </DialogHeader>
                        <div className="px-6 py-5"><HiringFormView formId={fid} embedded onBack={() => setFormPopup(null)} /></div>
                    </DialogContent>
                </Dialog>
            )}
            {/* What the end user / employer filled in */}
            {viewPopup && (
                <Dialog open onOpenChange={(o) => { if (!o) setViewPopup(null); }}>
                    <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white"><FileText className="h-4 w-4" /></span> Submitted — {viewPopup.employer}</DialogTitle>
                            <p className="text-sm font-normal text-slate-500">What the applicant / employer provided for this reference.</p>
                        </DialogHeader>
                        <div className="px-6 py-5"><PrefillProvider value={pf}><HiringFormView formId={fid} embedded onBack={() => setViewPopup(null)} /></PrefillProvider></div>
                    </DialogContent>
                </Dialog>
            )}

            {/* Hiring manager verifies & signs the employer response */}
            {verifyFor && (
                <Dialog open onOpenChange={(o) => { if (!o) setVerifyFor(null); }}>
                    <DialogContent className="max-w-lg p-0">
                        <DialogHeader className="border-b border-slate-200 px-6 py-4 text-left">
                            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white"><BadgeCheck className="h-4 w-4" /></span> Verify employment</DialogTitle>
                            <p className="text-sm font-normal text-slate-500">Confirm you reviewed the response from <span className="font-semibold text-slate-700">{verifyFor.employer}</span> and sign to verify.</p>
                        </DialogHeader>
                        <div className="px-6 py-5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Hiring manager signature</Label>
                            <div className="mt-1.5"><SignaturePad onChange={setVerifySig} /></div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
                            <Button variant="outline" onClick={() => setVerifyFor(null)}>Cancel</Button>
                            <Button disabled={!verifySig} onClick={() => { verify(verifyFor, verifySig); setVerifyFor(null); }}><BadgeCheck className="h-4 w-4" /> Verify &amp; sign</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// A verification-document row: Driver-uploads vs Ask-employer, with per-doc remarks.
function DocItemRow({ label, status, source, remarks, onSource, onUpload, onAsk, onReset, onAddRemark }: {
    docId: string; label: string; status: DocStatus; source: "driver" | "employer";
    remarks: Remark[]; onSource: (s: "driver" | "employer") => void; onUpload: () => void; onAsk: () => void; onReset: () => void; onAddRemark: (text: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const meta = DOC_STATUS_META[status];
    return (
        <div className={cn("overflow-hidden rounded-lg border transition", open ? "border-slate-300" : "border-slate-200")}>
            <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-slate-800">{label}</button>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.badge)}>{meta.label}</span>
                {status === "pending" && (source === "driver"
                    ? <Button className="h-7 gap-1 px-2 text-xs" onClick={onUpload}><Upload className="h-3.5 w-3.5" /> Upload</Button>
                    : <Button className="h-7 gap-1 px-2 text-xs" onClick={onAsk}><Send className="h-3.5 w-3.5" /> Ask employer</Button>)}
                {status === "requested" && <Button className="h-7 gap-1 px-2 text-xs" onClick={onUpload}><Check className="h-3.5 w-3.5" /> Mark received</Button>}
                <button type="button" onClick={() => setOpen((o) => !o)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button>
            </div>
            {open && (
                <div className="space-y-3 border-t border-slate-100 px-3 py-3">
                    <div>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Provided by</p>
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                            {(["driver", "employer"] as const).map((s) => (
                                <button key={s} type="button" onClick={() => onSource(s)} className={cn("rounded-md px-3 py-1 text-xs font-semibold transition", source === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{s === "driver" ? "Driver uploads" : "Ask employer"}</button>
                            ))}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-400">{source === "driver" ? "The driver provides this document." : "The driver doesn’t have it — request it from the employer."}</p>
                    </div>
                    {status !== "pending" && <Button variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={onReset}><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>}
                    <ItemRemarks remarks={remarks} label={label} onAdd={onAddRemark} />
                </div>
            )}
        </div>
    );
}

function EmployerCard({ c, docs, docsCount = 0, docsDone = 0, onSend, onRespond, onVerify, onReset, onForm, onView, onPdf }: { c: EmpCheck; docs?: React.ReactNode; docsCount?: number; docsDone?: number; onSend: () => void; onRespond: () => void; onVerify: () => void; onReset: () => void; onForm: () => void; onView: () => void; onPdf: () => void }) {
    const tone: Record<string, string> = { pending: "bg-slate-100 text-slate-500", sent: "bg-amber-100 text-amber-700", responded: "bg-blue-100 text-blue-700", verified: "bg-emerald-100 text-emerald-700" };
    const label: Record<string, string> = { pending: "Not requested", sent: `Sent · ${c.attempts.length}/${EMP_MAX_ATTEMPTS}`, responded: "Responded", verified: "Verified" };
    const maxed = c.attempts.length >= EMP_MAX_ATTEMPTS;
    const last = c.attempts[c.attempts.length - 1];
    const tiny = "h-7 gap-1 px-2 text-xs";
    const [docsOpen, setDocsOpen] = useState(false);
    return (
        <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{c.employer}</p>
                    <p className="truncate text-xs text-slate-500">{[c.position, c.dates].filter(Boolean).join(" · ") || "Previous employer"}</p>
                </div>
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", tone[c.status])}>{label[c.status]}</span>
            </div>
            {last && <p className="mt-2 text-xs text-slate-400">Last request {relativeTime(last.at)} · to {last.to || "—"} via {last.method}</p>}
            {c.attempts.length >= 3 && c.status !== "verified" && <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600"><AlertCircle className="h-3.5 w-3.5" /> {c.attempts.length} attempts — good-faith effort documented.</p>}
            {maxed && c.status !== "verified" && c.status !== "responded" && <p className="mt-1 text-xs font-medium text-rose-500">Maximum {EMP_MAX_ATTEMPTS} attempts reached.</p>}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Button variant="outline" className={tiny} onClick={onForm}><FileSignature className="h-3.5 w-3.5" /> Form</Button>
                <Button variant="outline" className={tiny} onClick={onView}><FileText className="h-3.5 w-3.5" /> View</Button>
                <Button variant="outline" className={tiny} onClick={onPdf}><Download className="h-3.5 w-3.5" /> PDF</Button>
                {c.status !== "verified" && <Button className={tiny} disabled={maxed} onClick={onSend}><Send className="h-3.5 w-3.5" /> {c.attempts.length ? `Resend (${c.attempts.length}/${EMP_MAX_ATTEMPTS})` : "Send request"}</Button>}
                {c.status === "sent" && <Button className={tiny} onClick={onRespond}><Check className="h-3.5 w-3.5" /> Record response</Button>}
                {c.status === "responded" && <Button className={tiny} onClick={onVerify}><BadgeCheck className="h-3.5 w-3.5" /> Verify</Button>}
                {c.status !== "pending" && <button type="button" title="Reset" onClick={onReset} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><RotateCcw className="h-3.5 w-3.5" /></button>}
            </div>
            {/* This employer's documents — collapsible dropdown inside the card */}
            {docs && (
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <button type="button" onClick={() => setDocsOpen((o) => !o)} className="flex w-full items-center gap-2 bg-slate-50/60 px-3 py-2 text-left transition hover:bg-slate-50">
                        <FileSignature className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[13px] font-semibold text-slate-700">Documents</span>
                        <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{docsDone}/{docsCount}</span>
                        <ChevronDown className={cn("ml-auto h-4 w-4 text-slate-400 transition-transform", docsOpen && "rotate-180")} />
                    </button>
                    {docsOpen && <div className="space-y-2 border-t border-slate-100 p-3">{docs}</div>}
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
function ConsentReviewView({ consents, pf, initial, statusOf, onReceived, onBack }: {
    consents: string[]; pf: ApplicantPrefill; initial: string;
    statusOf: (fid: string) => DocStatus; onReceived: (fid: string) => void; onBack: () => void;
}) {
    const [branding] = useCompanyBranding();
    const [sel, setSel] = useState(Math.max(0, consents.indexOf(initial)));
    const [view, setView] = useState<"document" | "form">("document");
    const fid = consents[sel];
    const status = fid ? statusOf(fid) : "pending";
    const done = DONE_STATES.includes(status);
    const def = fid ? POLICY_FORMS.find((p) => p.id === fid) : undefined;
    const values: Record<string, string> = {
        company: branding.name, applicant: pf.fullName, printName: pf.fullName, driverName: pf.fullName,
        ssn: pf.ssn, licenseNumber: pf.licenses[0]?.number ?? "", state: pf.licenses[0]?.authority ?? "", date: "",
    };
    const sigsFor = (d: NonNullable<typeof def>) => Object.fromEntries(d.signers.filter((s) => s.kind === "sign").map((s) => [s.key, ""]));
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Hiring file</button>
                <span className="text-xs font-semibold text-slate-500">Consent {sel + 1} / {consents.length}</span>
            </div>
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6 lg:flex-row">
                {/* Consent sidebar */}
                <aside className="lg:w-80 lg:shrink-0">
                    <div className="lg:sticky lg:top-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Consent Forms</p>
                        <nav className="max-h-[64vh] space-y-1 overflow-y-auto pr-1">
                            {consents.map((c, i) => {
                                const active = i === sel;
                                const st = statusOf(c);
                                const m = DOC_STATUS_META[st];
                                return (
                                    <button key={c} type="button" onClick={() => setSel(i)} className={cn("flex w-full items-start gap-3 rounded-xl p-3 text-left transition", active ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50")}>
                                        <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold", active ? "bg-blue-600 text-white" : DONE_STATES.includes(st) ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500")}>{DONE_STATES.includes(st) ? <Check className="h-4 w-4" /> : i + 1}</span>
                                        <span className="min-w-0">
                                            <span className={cn("block text-sm font-semibold", active ? "text-blue-700" : "text-slate-700")}>{stepName(c)}</span>
                                            <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold", m.badge)}>{m.label}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Selected consent */}
                <div className="min-w-0 flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Consent &amp; Authorization</p>
                            <h1 className="text-xl font-bold text-slate-900">{fid ? stepName(fid) : "Consents"}</h1>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Document view (read-only) vs editable Form */}
                            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                                {(["document", "form"] as const).map((vw) => (
                                    <button key={vw} type="button" onClick={() => setView(vw)} className={cn("rounded-md px-3 py-1 text-xs font-semibold capitalize transition", view === vw ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}>{vw === "document" ? "Document" : "Form"}</button>
                                ))}
                            </div>
                            {done
                                ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"><Check className="h-4 w-4" /> Received</span>
                                : <Button onClick={() => fid && onReceived(fid)}><Check className="h-4 w-4" /> Mark received</Button>}
                        </div>
                    </div>
                    {fid && (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            {view === "document" && def
                                ? <PolicyDocument def={def} values={values} sigs={sigsFor(def)} branding={branding} />
                                : <PrefillProvider value={pf}><HiringFormView formId={fid} embedded onBack={onBack} /></PrefillProvider>}
                        </div>
                    )}
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
