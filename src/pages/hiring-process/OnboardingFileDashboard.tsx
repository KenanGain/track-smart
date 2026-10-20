import { useEffect, useRef, useState } from "react";
import {
    ChevronLeft, ChevronDown, Check, X, Send, FileText, RotateCcw, CircleCheck, Clock,
    Workflow as WorkflowIcon, Activity as ActivityIcon, StickyNote, Bell, AlertCircle,
    Eye, FileSearch, ClipboardCheck, ClipboardList, BadgeCheck, PenLine, Inbox, ListChecks,
    MessageSquarePlus, Clock3, GraduationCap, Share2, FileSignature, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplicants, formName, relativeTime, ACTOR, STEP_STATUS_META, type StepStatus, type Applicant } from "./applicants.data";
import { DeliveryPicker, deliverRequest, needsEmail } from "@/components/share/RequestDelivery";
import { ShareToChat } from "@/components/share/ShareToChat";
import { KebabMenu, type KebabItem } from "@/components/ui/KebabMenu";
import { StepScroller } from "@/components/ui/StepScroller";
import { driverTypeMatches } from "./driver-types";
import { TH_ROW_CLS } from "@/components/ui/list-chrome";
import { useOnboardingQuizzes } from "./onboarding-quizzes.data";
import { useOnbWorkflows, resolveOnbWorkflow, onbSteps, onbProgress, ONB_STEP_META, onbDriverTypeName, MAX_ONB_QUIZ_ATTEMPTS, getTrainingType, makeAssignedTraining, TRAINING_STATUS_META, type OnbWorkflow, type AssignedTraining } from "./onboarding.data";
import { policyDocuments } from "./policy-forms.data";
import { PolicyForm, UploadedCopyView } from "./PolicyForm";
import { FormRecordView } from "./FormRecordView";
import { VerifyCopyDialog } from "./VerifyCopyDialog";
import { FORM_STATUS_META, docTemplateRecordId, formCopyStatus, formRecordIdFor, recordFormCopy, seedFormCopiesOnce, uploadFormCopy, useFormCopiesMap, verifyFormCopy, type FormCopy } from "./form-copies";
import { useCompanyBranding } from "../ats/company-branding.data";
import { QuizRunner } from "./QuizRunner";
import { DocSignReview } from "./DocSignReview";
import { SignaturePad } from "./FormKit";
import { AssignReviewDialog, type AssignReviewPayload } from "./AssignReviewDialog";
import { useDocTemplates, type DocTemplate } from "./document-templates.data";
import { useChecklists, totalChecklistItems } from "./checklists.data";
import {
    ONBOARDING_FORMS, getOnboardingFormDef, ONB_REQUEST_ACTIONS, ONB_REQUEST_RECIPIENTS,
    type OnbStepKind, type OnbStepStatus, type OnboardingState, type OnbDocState, type OnbReview,
    type OnbRequest, type OnbRequestAction, type OnbRequestRecipient, type OnbRequestChannel,
} from "./onboarding.data";

const D = 86_400_000;
type DocItem = { id: string; label: string; desc: string; defId?: string };
type DocView = { defId: string; label: string; pdf: boolean };
type SignFn = (r: { by: string; role: string; date: string; sig: string }) => void;
// A target for the Order / Request dialog — an item to chase, or a general request.
type ReqTarget = { itemId?: string; itemLabel: string; action?: OnbRequestAction; recipient?: OnbRequestRecipient };
const REQUEST_VERB: Record<OnbRequestAction, string> = { Order: "Ordered from", Review: "Assigned review to", Alert: "Alerted", Request: "Requested from" };

const resolveFormDef = (id: string) => getOnboardingFormDef(id) ?? policyDocuments().find((p) => p.id === id);
const policyLabel = (id: string) => { const p = policyDocuments().find((x) => x.id === id); return p ? `${p.title} ${p.accentTitle}`.trim() : id; };
const policyDesc = (id: string) => policyDocuments().find((x) => x.id === id)?.blurb ?? "";

export function OnboardingFileDashboard({ applicantId, onBack }: { applicantId: string; onBack: () => void }) {
    const { applicants, updateOne } = useApplicants();
    const { workflows } = useOnbWorkflows();
    const { quizzes } = useOnboardingQuizzes();
    const { templates } = useDocTemplates();
    const { checklists } = useChecklists();
    const a = applicants.find((x) => x.id === applicantId);
    const [active, setActive] = useState<OnbStepKind | null>(null);
    const [docView, setDocView] = useState<DocView | null>(null);   // the BLANK form, as a document
    // One form's record page — its copies on file — opened from a policy / onboarding form row.
    const [formRecord, setFormRecord] = useState<{ defId: string; label: string; setKey: "signedContracts" | "signedForms"; fill?: boolean } | null>(null);
    // A signed copy of a PDF template, being read; and a copy being verified.
    const [openUpload, setOpenUpload] = useState<{ copy: FormCopy; label: string; recordId: string } | null>(null);
    const [verifying, setVerifying] = useState<{ copy: FormCopy; label: string; recordId: string } | null>(null);
    const [docReview, setDocReview] = useState<DocTemplate | null>(null);
    const [quizRun, setQuizRun] = useState<{ quizId: string; mode: "take" | "review" } | null>(null);
    const [wfPicker, setWfPicker] = useState(false);
    const [reqTarget, setReqTarget] = useState<ReqTarget | null>(null);
    const [reviewTarget, setReviewTarget] = useState<ReqTarget | null>(null);
    const [remarkFor, setRemarkFor] = useState<string | null>(null);
    // A step item being shared to chat — its name, where it stands, and its files.
    const [sharing, setSharing] = useState<{ label: string; status: string; files: string[] } | null>(null);

    // Every signed copy on this driver's file, for every form and document the workflow
    // asks for. Read above the early return, because hooks run the same way every render.
    const wfEarly = a ? resolveOnbWorkflow(a.onboarding ?? {}, a.formId, workflows) : undefined;
    const formIds = [...(wfEarly?.policyForms ?? []), ...(wfEarly?.forms ?? [])];
    const recordIds = [...formIds.map(formRecordIdFor), ...(wfEarly?.documents ?? []).map(docTemplateRecordId)];
    const copiesMap = useFormCopiesMap(a?.carrierId, a ? [a.id] : [], recordIds);
    const [branding] = useCompanyBranding();
    // The seeded files that arrived "signed" get the copies that signing would have
    // produced, once — so Review opens a signed form rather than a blank one.
    useEffect(() => {
        const o = a?.onboarding;
        if (!a || !o) return;
        const signedForms = [...(o.signedContracts ?? []), ...(o.signedForms ?? [])];
        const signedDocs = o.signedDocs ?? [];
        if (!signedForms.length && !signedDocs.length) return;
        const name = `${a.firstName} ${a.lastName}`.trim();
        const hired = Date.parse(a.invitedAt);
        const date = Number.isNaN(hired) ? undefined : new Date(hired).toISOString().slice(0, 10);
        seedFormCopiesOnce({
            accountId: a.carrierId, subjectId: a.id,
            forms: signedForms.map((defId) => ({ defId, signedBy: name, date, values: { company: branding.name } })),
            templates: signedDocs.map((templateId) => ({ templateId, name: templates.find((t) => t.id === templateId)?.name ?? templateId, signedBy: name, date })),
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [a?.id]);

    if (!a) return (
        <div className="min-h-screen bg-slate-50 p-8">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Onboarding</button>
            <p className="mt-8 text-center text-sm text-slate-400">Driver not found.</p>
        </div>
    );

    const onb = a.onboarding ?? {};
    const setOnb = (fn: (prev: OnboardingState) => OnboardingState, note?: string) =>
        updateOne(a.id, (prev) => {
            const next = fn(prev.onboarding ?? {});
            if (note) next.events = [{ id: `oe-${Date.now()}`, text: note, at: Date.now() }, ...(next.events ?? [])];
            return { onboarding: next };
        });

    const wf = resolveOnbWorkflow(onb, a.formId, workflows);
    const steps = onbSteps(onb, wf);
    const { done, total, complete } = onbProgress(onb, wf);
    const activeKind: OnbStepKind = steps.find((s) => s.kind === active)?.kind ?? steps[0]?.kind ?? "forms";
    const activeIdx = Math.max(0, steps.findIndex((s) => s.kind === activeKind));
    const daysIn = onb.startedAt ? Math.max(1, Math.round((Date.now() - onb.startedAt) / D)) : null;
    const who = `${a.firstName} ${a.lastName}`.trim();
    const copiesFor = (recordId: string): FormCopy[] => copiesMap[recordId] ?? [];
    // Copies are the record; the signed sets the steps complete on follow them.
    const markSigned = (key: "signedContracts" | "signedForms" | "signedDocs", id: string, note: string) =>
        setOnb((prev) => ({ ...prev, [key]: Array.from(new Set([...(prev[key] ?? []), id])) }), note);
    const logOnly = (note: string) => setOnb((prev) => ({ ...prev }), note);
    const uploadCopy = async (recordId: string, label: string, file: File, key: "signedContracts" | "signedForms" | "signedDocs", id: string) => {
        await uploadFormCopy({ accountId: a.carrierId, subjectId: a.id, recordId, label: `${label} — uploaded copy`, file, by: ACTOR });
        markSigned(key, id, `Uploaded signed copy — ${label}`);
    };
    const receiveCopy = (recordId: string, label: string, key: "signedContracts" | "signedForms" | "signedDocs", id: string) => {
        recordFormCopy({ accountId: a.carrierId, subjectId: a.id, recordId, label: `${label} — paper copy`, by: ACTOR });
        markSigned(key, id, `Marked received — ${label}`);
    };
    const shareCopies = (label: string, copies: FormCopy[], requested?: boolean) =>
        setSharing({ label, status: FORM_STATUS_META[formCopyStatus(copies, requested)].label, files: copies.map((c) => c.fileName ?? `${label}.pdf`) });
    // Share a step item to chat — its files attached, the step and status in the note, and a
    // link back to this onboarding file. Built above the early returns so a record page
    // opened from a row can offer it too.
    const shareDialog = sharing && (
        <ShareToChat
            open
            onClose={() => setSharing(null)}
            title={`Share ${sharing.label}`}
            subtitle={`${who} · ${ONB_STEP_META[activeKind].title}`}
            source={{ type: "manual", id: a.id, label: `Onboarding — ${who}` }}
            items={sharing.files.map((name) => ({ name, group: sharing.label }))}
            record={{ type: "onboarding", id: a.id, label: `${who} — ${sharing.label}`, sublabel: `${wf?.name ?? "Onboarding"} · Step ${activeIdx + 1}: ${ONB_STEP_META[activeKind].title}`, path: `/hiring-process/onboarding/${a.id}` }}
            defaultSubject={`${sharing.label} — ${who}`}
            defaultMessage={`${sharing.label} from ${who}'s onboarding file.\n\n  Step: ${ONB_STEP_META[activeKind].title}\n  Status: ${sharing.status}`}
            defaultChannel="in-app"
        />
    );
    const verifyDialog = verifying && (
        <VerifyCopyDialog copy={verifying.copy} formName={verifying.label} onClose={() => setVerifying(null)}
            onConfirm={(r) => {
                verifyFormCopy({ accountId: a.carrierId, subjectId: a.id, recordId: verifying.recordId, copyId: verifying.copy.id, by: r.by, date: r.date, note: r.note });
                logOnly(`Verified signed copy — ${verifying.label} (${r.by})`);
                if (openUpload?.copy.id === verifying.copy.id) setOpenUpload({ ...openUpload, copy: { ...openUpload.copy, verified: { by: r.by, at: r.date, note: r.note } } });
                setVerifying(null);
            }} />
    );

    const signStep = (kind: OnbStepKind, label: string, r: { by: string; role: string; date: string; sig: string }) => setOnb(
        (prev) => ({ ...prev, reviews: { ...(prev.reviews ?? {}), [kind]: { by: r.by, role: r.role, date: r.date, sig: r.sig, at: Date.now() } } }),
        `Reviewed & signed off — ${label} (${r.by})`,
    );

    // Manual per-step review status (Initial / Waiting / Reviewed / Complete / Incomplete).
    const stepStatusOf = (kind: OnbStepKind): StepStatus => onb.stepStatus?.[kind] ?? (steps.find((s) => s.kind === kind)?.status === "complete" ? "complete" : "initial");
    const setStepStatus = (kind: OnbStepKind, to: StepStatus) => setOnb(
        (prev) => ({ ...prev, stepStatus: { ...(prev.stepStatus ?? {}), [kind]: to } }),
        `Step status set — ${ONB_STEP_META[kind].title}: ${STEP_STATUS_META[to].label}`,
    );
    // Header bits threaded into the active step module (hiring-style card header).
    const activeStatus = STEP_STATUS_META[stepStatusOf(activeKind)];
    const hdr: StepHeader = {
        stepLabel: `Step ${activeIdx + 1} of ${total}`,
        statusPill: <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold", activeStatus.tone)}><span className={cn("h-1.5 w-1.5 rounded-full", activeStatus.dot)} /> {activeStatus.label}</span>,
        statusMenu: <StepStatusMenu current={stepStatusOf(activeKind)} onSet={(to) => setStepStatus(activeKind, to)} />,
    };

    // PDF documents attached to the assigned workflow.
    const wfDocs = (wf?.documents ?? []).map((id) => templates.find((t) => t.id === id)).filter(Boolean) as DocTemplate[];

    // ── Order / Request — ask anyone (driver, HR, a provider…) to complete an item ──
    // Per-item Ask/Order → the recipient-picker request form; Review → the hiring-manager picker.
    const openReq = (t: ReqTarget) => (t.action === "Review" ? setReviewTarget(t) : setReqTarget(t));
    const assignReview = (t: ReqTarget, v: AssignReviewPayload) => setOnb(
        (prev) => ({ ...prev, requests: [{ id: `orq-${Date.now()}`, itemId: t.itemId, itemLabel: t.itemLabel, action: "Review", recipient: "Hiring Manager", to: v.email, channel: "Email", subject: v.subject, message: v.message, status: "open", at: Date.now(), by: ACTOR }, ...(prev.requests ?? [])] }),
        `Assigned review to ${v.name}${v.role ? ` (${v.role})` : ""} — ${t.itemLabel}`,
    );
    const openRequests = (onb.requests ?? []).filter((r) => r.status === "open");
    const submitRequest = (r: Omit<OnbRequest, "id" | "status" | "at" | "by">) => setOnb((prev) => {
        const req: OnbRequest = { ...r, id: `orq-${Date.now()}`, status: "open", at: Date.now(), by: ACTOR };
        const docState = r.itemId ? { ...(prev.docState ?? {}), [r.itemId]: "requested" as OnbDocState } : prev.docState;
        return { ...prev, requests: [req, ...(prev.requests ?? [])], docState };
    }, `${REQUEST_VERB[r.action]} ${r.recipient}: “${r.subject}”${r.channel ? ` via ${r.channel}` : ""}`);
    // Resolve = the item came back completed → mark it signed and close the request.
    const resolveRequest = (req: OnbRequest) => setOnb((prev) => {
        const requests = (prev.requests ?? []).map((x) => (x.id === req.id ? { ...x, status: "resolved" as const } : x));
        const ds = { ...(prev.docState ?? {}) }; if (req.itemId) delete ds[req.itemId];
        let extra: Partial<OnboardingState> = {};
        if (req.itemId) {
            const isDoc = req.itemId.startsWith("tpl-");
            const isForm = ONBOARDING_FORMS.some((x) => x.id === req.itemId);
            const isPolicy = policyDocuments().some((x) => x.id === req.itemId);
            if (isDoc || isForm || isPolicy) {
                const key = isDoc ? "signedDocs" : isForm ? "signedForms" : "signedContracts";
                const cur = new Set(prev[key] ?? []); cur.add(req.itemId); extra = { [key]: [...cur] };
            }
        }
        return { ...prev, requests, docState: ds, ...extra };
    }, `Completed — ${req.itemLabel} (${req.recipient})`);
    const cancelRequest = (req: OnbRequest) => setOnb((prev) => {
        const ds = { ...(prev.docState ?? {}) }; if (req.itemId) delete ds[req.itemId];
        return { ...prev, requests: (prev.requests ?? []).filter((x) => x.id !== req.id), docState: ds };
    }, `Cancelled request — ${req.itemLabel}`);
    const addRemark = (label: string, text: string) => setOnb(
        (prev) => ({ ...prev, notes: [{ id: `n-${Date.now()}`, text: `Remark — ${label}: ${text}`, at: Date.now(), by: ACTOR }, ...(prev.notes ?? [])] }),
        `Remark added — ${label}`,
    );

    // ── Full-screen sub-views ──────────────────────────────────────────────────
    // One form's record page: its copies on file, and the viewer they open in.
    if (formRecord) {
        const def = resolveFormDef(formRecord.defId);
        const fr = formRecord;
        const kindLabel = fr.setKey === "signedContracts" ? "Policy form" : "Onboarding form";
        if (def) return (
            <>
                <FormRecordView def={def} title={fr.label} backLabel="Onboarding file" subject={`${who} · Onboarding file`}
                    accountId={a.carrierId} subjectIds={[a.id]} writeSubjectId={a.id} requested={onb.docState?.[fr.defId] === "requested"} startFilling={fr.fill}
                    onBack={() => setFormRecord(null)}
                    onShare={(copies) => shareCopies(fr.label, copies, onb.docState?.[fr.defId] === "requested")}
                    onAsk={() => openReq({ itemId: fr.defId, itemLabel: fr.label, action: "Request" })}
                    onRemark={() => setRemarkFor(fr.label)}
                    onFiled={() => markSigned(fr.setKey, fr.defId, `${kindLabel} signed — ${fr.label}`)}
                    onVerified={({ by }) => logOnly(`Verified signed copy — ${fr.label} (${by})`)}
                    onReceived={() => markSigned(fr.setKey, fr.defId, `Marked received — ${fr.label}`)} />
                {shareDialog}
            </>
        );
    }
    // The blank form, as a document — what the driver will be asked to sign.
    if (docView) {
        const def = resolveFormDef(docView.defId);
        if (def) return <PolicyForm def={def} mode="template" readOnly startPreview backLabel="Onboarding file" onBack={() => setDocView(null)} />;
    }
    // A signed copy of a PDF template, read as the file that was uploaded.
    if (openUpload) return (
        <>
            <UploadedCopyView copy={openUpload.copy} title={openUpload.label} subject={who} backLabel="Onboarding file" onBack={() => setOpenUpload(null)}
                onVerify={() => setVerifying(openUpload)} />
            {verifyDialog}
        </>
    );
    if (docReview) {
        const rid = docTemplateRecordId(docReview.id);
        const t = docReview;
        return (
            <>
                <DocSignReview template={t} driverName={who} onBack={() => setDocReview(null)}
                    copies={copiesFor(rid)} requested={onb.docState?.[t.id] === "requested"}
                    onUpload={(file) => uploadCopy(rid, t.name, file, "signedDocs", t.id)}
                    onVerify={(copy) => setVerifying({ copy, label: t.name, recordId: rid })}
                    onOpenCopy={(copy) => setOpenUpload({ copy, label: t.name, recordId: rid })}
                    onShare={() => shareCopies(t.name, copiesFor(rid), onb.docState?.[t.id] === "requested")}
                    onAsk={() => openReq({ itemId: t.id, itemLabel: t.name, action: "Request" })}
                    onMarkReceived={() => receiveCopy(rid, t.name, "signedDocs", t.id)} />
                {verifyDialog}
                {shareDialog}
            </>
        );
    }
    if (quizRun) {
        const quiz = quizzes.find((q) => q.id === quizRun.quizId);
        if (quiz) return (
            <QuizRunner quiz={quiz} mode={quizRun.mode} driverName={`${a.firstName} ${a.lastName}`}
                initialAnswers={quizRun.mode === "review" ? onb.quizResults?.[quiz.id]?.answers : undefined}
                onClose={() => setQuizRun(null)}
                onSubmit={(r) => {
                    setOnb((prev) => {
                        const attempts = { ...(prev.quizAttempts ?? {}) };
                        attempts[quiz.id] = (attempts[quiz.id] ?? 0) + 1;
                        return { ...prev, quizAttempts: attempts, quizResults: { ...(prev.quizResults ?? {}), [quiz.id]: { score: r.score, total: r.total, passed: r.passed, at: r.at, answers: r.answers } } };
                    }, `Quiz ${r.passed ? "passed" : "attempted"} — ${quiz.title}: ${r.score}/${r.total}`);
                    setQuizRun(null);
                }} />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="space-y-5 px-4 py-6 sm:px-6 lg:px-8">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Back to List</button>

                {/* Header card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">{(a.firstName[0] ?? "") + (a.lastName[0] ?? "")}</span>
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Onboarding File</p>
                                <h1 className="text-2xl font-bold text-slate-900">{a.firstName} {a.lastName}</h1>
                                <p className="mt-0.5 text-sm text-slate-500">{formName(a.formId)} · {a.position ?? "Driver"} · Hired {a.invitedAt}{daysIn ? ` · ${daysIn}d in onboarding` : ""}</p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <StatusBadge done={done} complete={complete} />
                            <Button variant="outline" size="sm" onClick={() => openReq({ itemLabel: `${a.firstName}'s onboarding`, action: "Alert", recipient: "Driver" })}><Bell className="h-4 w-4" /> Send reminder</Button>
                            <Button size="sm" onClick={() => openReq({ itemLabel: "an onboarding item" })}><MessageSquarePlus className="h-4 w-4" /> Ask / Order</Button>
                        </div>
                    </div>
                </div>

                {/* Status banner */}
                <div className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-2 text-sm text-blue-900"><Send className="h-4 w-4 shrink-0 text-blue-500" /> Onboarding · {done}/{total} steps complete · {complete ? "Ready for final review" : "In progress"}</p>
                    <StatusBadge done={done} complete={complete} />
                </div>

                {/* Assigned workflow bar */}
                {wf && (
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:gap-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Onboarding Workflow</span>
                            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800"><WorkflowIcon className="h-4 w-4 text-blue-500" /> {wf.name} <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{onb.workflowId ? "ASSIGNED" : "SUGGESTED"}</span></span>
                        </div>
                        <p className="hidden flex-1 truncate text-sm text-slate-500 lg:block">{wf.description}</p>
                        <div className="flex items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-400">
                            <span><span className="font-bold text-slate-600">{(wf.policyForms?.length ?? 0) + wf.forms.length}</span> forms</span>
                            <span><span className="font-bold text-slate-600">{wf.documents.length}</span> docs</span>
                            <span><span className="font-bold text-slate-600">{wf.quizzes.length}</span> quiz</span>
                            <span><span className="font-bold text-slate-600">{wf.trainings?.length ?? 0}</span> training</span>
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setWfPicker(true)}><WorkflowIcon className="h-4 w-4" /> {onb.workflowId ? "Change" : "Assign"}</Button>
                    </div>
                )}

                {/* Clickable stepper — sticks to the top while scrolling */}
                <div className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white px-3 py-5 shadow-sm">
                    <StepScroller focus={activeIdx}>
                            {steps.map((s, i) => {
                                const doneStep = s.status === "complete";
                                const isSel = s.kind === activeKind;
                                return (
                                    <button key={s.kind} type="button" data-step onClick={() => setActive(s.kind)} className="relative flex min-w-[128px] flex-1 flex-col items-center px-1 outline-none">
                                        {i > 0 && <span className="absolute left-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: steps[i - 1].status === "complete" ? "#10b981" : "#e2e8f0" }} />}
                                        {i < steps.length - 1 && <span className="absolute right-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: doneStep ? "#10b981" : "#e2e8f0" }} />}
                                        <StepDot n={i + 1} status={s.status} active={isSel} />
                                        <span className={cn("mt-2 line-clamp-2 max-w-[116px] text-center text-[10px] font-bold uppercase leading-tight tracking-wide", isSel ? "text-blue-700" : "text-slate-500")}>{s.title}</span>
                                    </button>
                                );
                            })}
                    </StepScroller>
                </div>

                {/* Main grid — same responsive sizing as the hiring file */}
                <div className="flex flex-col gap-5 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-4">
                        {(activeKind === "policy" || activeKind === "forms") && (() => {
                            const kind = activeKind;
                            const setKey = kind === "policy" ? "signedContracts" : "signedForms";
                            const items = kind === "policy"
                                ? (wf?.policyForms ?? []).map((id) => ({ id, label: policyLabel(id), desc: policyDesc(id), defId: id }))
                                : (wf?.forms ?? []).map((id) => { const f = ONBOARDING_FORMS.find((x) => x.id === id); return { id, label: f?.label ?? id, desc: f?.desc ?? "", defId: id }; });
                            return (
                                <FormListStep kind={kind} items={items} docState={onb.docState ?? {}}
                                    copiesFor={(item) => copiesFor(formRecordIdFor(item.defId ?? item.id))}
                                    onOpenRecord={(item, fill) => setFormRecord({ defId: item.defId ?? item.id, label: item.label, setKey, fill })}
                                    onBlank={(item) => setDocView({ defId: item.defId ?? item.id, label: item.label, pdf: true })}
                                    onUploadCopy={(item, file) => uploadCopy(formRecordIdFor(item.defId ?? item.id), item.label, file, setKey, item.id)}
                                    onVerify={(item, copy) => setVerifying({ copy, label: item.label, recordId: formRecordIdFor(item.defId ?? item.id) })}
                                    onMarkReceived={(item) => receiveCopy(formRecordIdFor(item.defId ?? item.id), item.label, setKey, item.id)}
                                    review={kind === "policy" ? onb.reviews?.policy : onb.reviews?.forms}
                                    onSign={(r) => signStep(kind, kind === "policy" ? "policy forms" : "onboarding forms", r)}
                                    onAsk={(item, action) => openReq({ itemId: item.id, itemLabel: item.label, action })} onRemark={(label) => setRemarkFor(label)}
                                    onShare={(item, copies) => shareCopies(item.label, copies, onb.docState?.[item.id] === "requested")} hdr={hdr} />
                            );
                        })()}
                        {activeKind === "documents" && (
                            <DocumentsStep docs={wfDocs} docState={onb.docState ?? {}}
                                copiesFor={(t) => copiesFor(docTemplateRecordId(t.id))}
                                onReviewDoc={setDocReview}
                                onOpenCopy={(t, copy) => setOpenUpload({ copy, label: t.name, recordId: docTemplateRecordId(t.id) })}
                                onUploadCopy={(t, file) => uploadCopy(docTemplateRecordId(t.id), t.name, file, "signedDocs", t.id)}
                                onVerify={(t, copy) => setVerifying({ copy, label: t.name, recordId: docTemplateRecordId(t.id) })}
                                onMarkReceived={(t) => receiveCopy(docTemplateRecordId(t.id), t.name, "signedDocs", t.id)}
                                review={onb.reviews?.documents} onSign={(r) => signStep("documents", "documents", r)}
                                onAsk={(t, action) => openReq({ itemId: t.id, itemLabel: t.name, action })} onRemark={(label) => setRemarkFor(label)}
                                onShare={(t, copies) => shareCopies(t.name, copies, onb.docState?.[t.id] === "requested")} hdr={hdr} />
                        )}
                        {activeKind === "quiz" && (
                            <QuizStep quizIds={wf?.quizzes ?? []} quizzes={quizzes} results={onb.quizResults ?? {}} attempts={onb.quizAttempts ?? {}}
                                onRun={(id, mode) => setQuizRun({ quizId: id, mode })} review={onb.reviews?.quiz} onSign={(r) => signStep("quiz", "post-orientation quiz", r)}
                                onAsk={(quiz, action) => openReq({ itemId: quiz.id, itemLabel: quiz.title, action })} onRemark={(label) => setRemarkFor(label)} onShare={setSharing} hdr={hdr} />
                        )}
                        {activeKind === "training" && (
                            <TrainingStep trainingIds={wf?.trainings ?? []} assigned={onb.trainings ?? []} setOnb={setOnb}
                                review={onb.reviews?.training} onSign={(r) => signStep("training", "training", r)}
                                onAsk={(t, action) => openReq({ itemId: t.id, itemLabel: t.name, action })} onRemark={(label) => setRemarkFor(label)} onShare={setSharing} hdr={hdr} />
                        )}
                        {activeKind === "checklist" && (
                            <ChecklistStep checklist={checklists.find((c) => c.id === wf?.checklistId)} review={onb.reviews?.checklist} onSign={(r) => signStep("checklist", "final checklist", r)} hdr={hdr} />
                        )}

                        <NotesCard notes={onb.notes ?? []} onAdd={(text) => setOnb((p) => ({ ...p, notes: [{ id: `n-${Date.now()}`, text, at: Date.now(), by: ACTOR }, ...(p.notes ?? [])] }))} />
                    </div>

                    <div className="w-full space-y-5 lg:w-80">
                        <RequestsCard requests={openRequests} onResolve={resolveRequest} onCancel={cancelRequest} onNew={() => openReq({ itemLabel: "an onboarding item" })} />
                        <ActivityCard events={onb.events ?? []} />
                    </div>
                </div>
            </div>

            {wfPicker && (
                <WorkflowPicker workflows={workflows} currentId={wf?.id} formId={a.formId} onClose={() => setWfPicker(false)}
                    onAssign={(id) => { setOnb((p) => ({ ...p, workflowId: id }), `Assigned onboarding workflow — ${workflows.find((w) => w.id === id)?.name ?? id}`); setWfPicker(false); }} />
            )}

            {reqTarget && (
                <OrderRequestDialog target={reqTarget} driver={a} driverEmail={a.email} onClose={() => setReqTarget(null)}
                    onSubmit={(r) => { submitRequest(r); setReqTarget(null); }} />
            )}

            {reviewTarget && (
                <AssignReviewDialog driverName={`${a.firstName} ${a.lastName}`} carrier={a.carrierId} context={reviewTarget.itemLabel}
                    onClose={() => setReviewTarget(null)}
                    onAssign={(v) => { assignReview(reviewTarget, v); setReviewTarget(null); }} />
            )}

            {shareDialog}
            {verifyDialog}

            {remarkFor !== null && (
                <RemarkDialog label={remarkFor} onClose={() => setRemarkFor(null)}
                    onSubmit={(text) => { addRemark(remarkFor, text); setRemarkFor(null); }} />
            )}
        </div>
    );
}


// Manual step-status dropdown (Initial / Waiting for review / Reviewed / Complete / Incomplete).
const STEP_STATUS_FLOW: { value: StepStatus; icon: React.ElementType }[] = [
    { value: "initial", icon: RotateCcw },
    { value: "waiting", icon: Clock },
    { value: "reviewed", icon: BadgeCheck },
    { value: "complete", icon: Check },
    { value: "incomplete", icon: AlertCircle },
];
function StepStatusMenu({ current, onSet }: { current: StepStatus; onSet: (to: StepStatus) => void }) {
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

// ── Header / sidebar bits ─────────────────────────────────────────────────────
function StatusBadge({ done, complete }: { done: number; complete: boolean }) {
    if (complete) return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700"><CircleCheck className="h-4 w-4" /> Onboarding complete</span>;
    if (done > 0) return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700"><Clock className="h-4 w-4" /> In progress</span>;
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">Not started</span>;
}

function StepDot({ n, status, active }: { n: number; status: OnbStepStatus; active: boolean }) {
    if (status === "complete") return <span className={cn("z-10 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm", active && "ring-4 ring-blue-100")}><Check className="h-4 w-4" /></span>;
    const cls = active ? "bg-blue-600 text-white ring-4 ring-blue-100" : status === "in-progress" ? "bg-amber-500 text-white ring-4 ring-amber-100" : "border-2 border-slate-200 bg-white text-slate-400";
    return <span className={cn("z-10 flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold", cls)}>{status === "in-progress" && !active ? <span className="h-2 w-2 rounded-full bg-white" /> : n}</span>;
}

function ActivityCard({ events }: { events: { id: string; text: string; at: number }[] }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800"><ActivityIcon className="h-4 w-4 text-slate-400" /> Activity</h3>
            {events.length === 0 ? <p className="text-sm text-slate-400">No activity yet.</p> : (
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                    {events.slice(0, 12).map((e) => (
                        <div key={e.id} className="flex gap-2.5">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                            <div className="min-w-0"><p className="text-sm text-slate-700">{e.text}</p><p className="text-xs text-slate-400">{relativeTime(e.at)}</p></div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function NotesCard({ notes, onAdd }: { notes: { id: string; text: string; at: number; by: string }[]; onAdd: (text: string) => void }) {
    const [text, setText] = useState("");
    const add = () => { if (text.trim()) { onAdd(text.trim()); setText(""); } };
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800"><StickyNote className="h-4 w-4 text-slate-400" /> Notes &amp; Comments</h3>
            <div className="flex gap-2">
                <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} placeholder="Add an internal note or comment…" className="flex-1" />
                <Button size="sm" onClick={add} disabled={!text.trim()}>Add</Button>
            </div>
            {notes.length === 0 ? <p className="mt-3 text-sm text-slate-400">No notes yet.</p> : (
                <div className="mt-4 space-y-3">
                    {notes.map((n) => (
                        <div key={n.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                            <p className="text-sm text-slate-700">{n.text}</p>
                            <p className="mt-1 text-xs text-slate-400">{n.by} · {relativeTime(n.at)}</p>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}


function ModuleShell({ Icon, stepLabel, title, desc, statusPill, action, statusMenu, children }: {
    Icon: React.ElementType; stepLabel?: string; title: string; desc: string;
    statusPill?: React.ReactNode; action?: React.ReactNode; statusMenu?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Icon className="h-5 w-5" /></div>
                {/* flex-1 so a long description wraps beside the icon instead of dropping the
                    whole block below it. */}
                <div className="min-w-0 flex-1 basis-56">
                    {stepLabel && <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{stepLabel}</p>}
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900">{title}</h2>
                        {statusPill}
                    </div>
                    <p className="text-sm text-slate-500">{desc}</p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                    {action}
                    {statusMenu}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </section>
    );
}

// Shared header props threaded from the dashboard into each step module.
type StepHeader = { stepLabel: string; statusPill: React.ReactNode; statusMenu: React.ReactNode };

type SetOnb = (fn: (prev: OnboardingState) => OnboardingState, note?: string) => void;

// ── Step item table — the same list as the hiring file's step checklist ──────
// One line per item: icon · name + description · status · ⋮ (every action). A click on the
// row does the first thing in its menu (Review / Take test / Start).
type ShareFn = (s: { label: string; status: string; files: string[] }) => void;
type OnbRow = {
    id: string; icon: React.ElementType; tone: string; label: string; desc?: string; tag?: React.ReactNode;
    status: React.ReactNode; actions: KebabItem[];
};
// The step item table's columns: icon · item · status · actions.
const ONB_TABLE_COLS = 4;
function OnbItemTable({ rows, empty }: { rows: OnbRow[]; empty: string }) {
    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[420px] table-fixed text-sm">
                <thead>
                    <tr className={TH_ROW_CLS}>
                        <th className="w-12 py-2.5 pl-3 pr-0"><span className="sr-only">Type</span></th>
                        <th className="px-3 py-2.5">Item</th>
                        <th className="w-[140px] px-3 py-2.5">Status</th>
                        <th className="w-20 py-2.5 pl-1 pr-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 && <tr><td colSpan={ONB_TABLE_COLS} className="px-4 py-6 text-center text-sm text-slate-400">{empty}</td></tr>}
                    {rows.map((r) => (
                        <tr key={r.id} className={cn("transition-colors hover:bg-slate-50/70", r.actions[0] && "cursor-pointer")} onClick={() => r.actions[0]?.onClick()}>
                            <td className="py-2.5 pl-3 pr-0">
                                <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", r.tone)}><r.icon className="h-3.5 w-3.5" /></span>
                            </td>
                            <td className="px-3 py-2.5">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <span className="truncate font-semibold text-slate-900" title={r.label}>{r.label}</span>
                                    {r.tag}
                                </div>
                                {r.desc && <p className="truncate text-[11px] text-slate-400" title={r.desc}>{r.desc}</p>}
                            </td>
                            <td className="px-3 py-2.5">{r.status}</td>
                            <td className="py-2.5 pl-1 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                                <KebabMenu title={`Actions for ${r.label}`} items={r.actions} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
const Pill = ({ cls, children }: { cls: string; children: React.ReactNode }) => (
    <span className={cn("inline-block max-w-full truncate whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>{children}</span>
);

// Reviewer sign-off — signature captured inline via the Draw/Type SignaturePad.
function StepReview({ label, review, onSign }: { label: string; review?: OnbReview; onSign: SignFn }) {
    const [name, setName] = useState(ACTOR);
    const [role, setRole] = useState("Hiring Manager");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [sig, setSig] = useState("");
    if (review) return (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700"><BadgeCheck className="h-4 w-4" /> Reviewed &amp; signed off</p>
            <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                <p><span className="text-slate-500">Reviewed by:</span> <span className="font-semibold text-slate-800">{review.by}</span></p>
                {review.role && <p><span className="text-slate-500">Title:</span> <span className="font-semibold text-slate-800">{review.role}</span></p>}
                <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{review.date}</span></p>
            </div>
            {review.sig && <div className="mt-3"><span className="text-sm text-slate-500">Signature:</span><img src={review.sig} alt="signature" className="mt-1 h-16 rounded border border-slate-200 bg-white" /></div>}
        </div>
    );
    return (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-white p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Reviewer Sign-Off</p>
            <h4 className="mt-0.5 text-sm font-bold text-slate-900">I have reviewed the {label} above.</h4>
            <p className="mt-0.5 text-xs text-slate-500">Confirm you have reviewed the items above. Your name, title, date and signature are recorded on file.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div><label className="mb-1 block text-xs font-semibold text-slate-600">Reviewer name</label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600">Title / role</label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
                <div><label className="mb-1 block text-xs font-semibold text-slate-600">Date</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            </div>
            <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-slate-600">Signature</label>
                <SignaturePad label="Your signature" onChange={setSig} />
            </div>
            <Button size="sm" className="mt-3" disabled={!sig || !name.trim()} onClick={() => onSign({ by: name.trim(), role: role.trim(), date, sig })}><PenLine className="h-4 w-4" /> Confirm review &amp; sign</Button>
        </div>
    );
}

// ── Step modules ──────────────────────────────────────────────────────────────
/**
 * The row actions a signable item gets, in the product's order: the copy, the ways a copy
 * gets here, then the chasing. "Mark signed" is gone — a copy on file is what signed means.
 */
function copyActions(args: {
    copies: FormCopy[]; canFill: boolean;
    onOpen: (copy: FormCopy) => void; onFill?: () => void; onReview?: () => void; onBlank?: () => void;
    onUpload: () => void; onVerify: (copy: FormCopy) => void; onShare: () => void; onMarkReceived: () => void;
}): KebabItem[] {
    const latest = args.copies[0];
    return [
        ...(latest ? [{ label: "Open signed copy", icon: Eye, onClick: () => args.onOpen(latest) }] : []),
        ...(args.onReview ? [{ label: "Review", icon: FileSearch, onClick: args.onReview }] : []),
        ...(args.canFill && args.onFill ? [{ label: latest ? "Fill again" : "Fill out & sign", icon: FileSignature, onClick: args.onFill }] : []),
        { label: "Upload signed copy", icon: Upload, onClick: args.onUpload },
        ...(args.onBlank ? [{ label: "Blank form (PDF)", icon: FileText, onClick: args.onBlank }] : []),
        { label: "Share to chat", icon: Share2, onClick: args.onShare },
        ...(latest && !latest.verified ? [{ label: "Verify latest copy", icon: BadgeCheck, onClick: () => args.onVerify(latest) }] : []),
        ...(!latest ? [{ label: "Mark received (paper copy)", icon: Check, onClick: args.onMarkReceived }] : []),
    ];
}

/**
 * A hidden file input the row menus share — one per step, pointed at whichever row asked.
 * A menu item cannot be a file input, and the picker has to open from a click the user made.
 */
function useRowUpload<T>(onFile: (target: T, file: File) => void) {
    const ref = useRef<HTMLInputElement>(null);
    const target = useRef<T | null>(null);
    const pick = (t: T) => { target.current = t; ref.current?.click(); };
    const input = (
        <input ref={ref} type="file" accept="application/pdf,image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; const t = target.current; target.current = null; if (f && t !== null) onFile(t, f); e.target.value = ""; }} />
    );
    return { pick, input };
}

// Policy forms + Onboarding forms — both are PolicyForm-backed signable lists. Each row's
// status is what is on file for it (see form-copies); opening a row shows its copies.
function FormListStep({ kind, items, docState, copiesFor, onOpenRecord, onBlank, onUploadCopy, onVerify, onMarkReceived, review, onSign, onAsk, onRemark, onShare, hdr }: {
    kind: "policy" | "forms"; items: DocItem[]; docState: Record<string, OnbDocState>;
    copiesFor: (item: DocItem) => FormCopy[];
    onOpenRecord: (item: DocItem, fill?: boolean) => void; onBlank: (item: DocItem) => void;
    onUploadCopy: (item: DocItem, file: File) => void; onVerify: (item: DocItem, copy: FormCopy) => void; onMarkReceived: (item: DocItem) => void;
    review?: OnbReview; onSign: SignFn;
    onAsk: (item: DocItem, action: OnbRequestAction) => void; onRemark: (label: string) => void; onShare: (item: DocItem, copies: FormCopy[]) => void; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META[kind];
    const upload = useRowUpload<DocItem>(onUploadCopy);
    const onFile = items.filter((i) => copiesFor(i).length > 0).length;
    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}
            action={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{onFile} / {items.length} on file</span>}>
            {upload.input}
            <OnbItemTable empty="No items in this step for the assigned workflow." rows={items.map((item) => {
                const copies = copiesFor(item);
                const st = formCopyStatus(copies, docState[item.id] === "requested");
                const m = FORM_STATUS_META[st];
                const signed = copies.length > 0;
                return {
                    id: item.id, icon: st === "verified" ? BadgeCheck : signed ? Check : FileText,
                    tone: st === "verified" ? "bg-emerald-50 text-emerald-600" : signed ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400",
                    label: item.label, desc: copies[0] ? `${copies.length} on file · latest ${copies[0].at}${copies[0].by ? ` by ${copies[0].by}` : ""}` : item.desc,
                    status: <Pill cls={m.badge}>{m.label}</Pill>,
                    actions: [
                        { label: "Open", icon: Eye, onClick: () => onOpenRecord(item) },
                        ...copyActions({
                            copies, canFill: true,
                            onOpen: () => onOpenRecord(item), onFill: () => onOpenRecord(item, true), onBlank: () => onBlank(item),
                            onUpload: () => upload.pick(item), onVerify: (copy) => onVerify(item, copy),
                            onShare: () => onShare(item, copies), onMarkReceived: () => onMarkReceived(item),
                        }).filter((x) => x.label !== "Open signed copy"),
                        ...askItems(kind, (action) => onAsk(item, action), () => onRemark(item.label)),
                    ],
                };
            })} />
            <StepReview label={meta.title.toLowerCase()} review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Documents & sign — PDF e-sign templates; Review walks the fields, and the signed copy
// is the file the driver returned.
function DocumentsStep({ docs, docState, copiesFor, onReviewDoc, onOpenCopy, onUploadCopy, onVerify, onMarkReceived, review, onSign, onAsk, onRemark, onShare, hdr }: {
    docs: DocTemplate[]; docState: Record<string, OnbDocState>;
    copiesFor: (t: DocTemplate) => FormCopy[];
    onReviewDoc: (t: DocTemplate) => void; onOpenCopy: (t: DocTemplate, copy: FormCopy) => void;
    onUploadCopy: (t: DocTemplate, file: File) => void; onVerify: (t: DocTemplate, copy: FormCopy) => void; onMarkReceived: (t: DocTemplate) => void;
    review?: OnbReview; onSign: SignFn;
    onAsk: (t: DocTemplate, action: OnbRequestAction) => void; onRemark: (label: string) => void; onShare: (t: DocTemplate, copies: FormCopy[]) => void; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META.documents;
    const upload = useRowUpload<DocTemplate>(onUploadCopy);
    const onFile = docs.filter((t) => copiesFor(t).length > 0).length;
    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}
            action={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{onFile} / {docs.length} on file</span>}>
            {upload.input}
            <OnbItemTable empty="No PDF documents on the assigned workflow." rows={docs.map((t) => {
                const copies = copiesFor(t);
                const st = formCopyStatus(copies, docState[t.id] === "requested");
                const m = FORM_STATUS_META[st];
                const signed = copies.length > 0;
                const fieldCount = t.fields.filter((f) => !f.stampDataUrl).length;
                return {
                    id: t.id, icon: st === "verified" ? BadgeCheck : signed ? Check : FileText,
                    tone: st === "verified" ? "bg-emerald-50 text-emerald-600" : signed ? "bg-blue-50 text-blue-600" : "bg-blue-50 text-blue-500",
                    label: t.name,
                    desc: copies[0] ? `${copies.length} on file · latest ${copies[0].at}${copies[0].by ? ` by ${copies[0].by}` : ""}` : `PDF · ${t.documents.length} document${t.documents.length === 1 ? "" : "s"} · ${fieldCount} field${fieldCount === 1 ? "" : "s"} to sign`,
                    status: <Pill cls={m.badge}>{m.label}</Pill>,
                    actions: [
                        ...copyActions({
                            copies, canFill: false,
                            onOpen: (copy) => onOpenCopy(t, copy), onReview: () => onReviewDoc(t),
                            onUpload: () => upload.pick(t), onVerify: (copy) => onVerify(t, copy),
                            onShare: () => onShare(t, copies), onMarkReceived: () => onMarkReceived(t),
                        }),
                        ...askItems("documents", (action) => onAsk(t, action), () => onRemark(t.name)),
                    ],
                };
            })} />
            <StepReview label="documents" review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Post-orientation quiz — tests come from the workflow; Take test / Retake / Review.
function QuizStep({ quizIds, quizzes, results, attempts, onRun, review, onSign, onAsk, onRemark, onShare, hdr }: {
    quizIds: string[]; quizzes: { id: string; title: string; category: string; passPct: number; questions: unknown[] }[];
    results: Record<string, { score: number; total: number; passed: boolean }>; attempts: Record<string, number>;
    onRun: (id: string, mode: "take" | "review") => void; review?: OnbReview; onSign: SignFn;
    onAsk: (quiz: { id: string; title: string }, action: OnbRequestAction) => void; onRemark: (label: string) => void; onShare: ShareFn; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META.quiz;
    const rows: OnbRow[] = quizIds.flatMap((id) => {
        const quiz = quizzes.find((q) => q.id === id);
        if (!quiz) return [];
        const cnt = quiz.questions.length;
        const passMark = Math.ceil(cnt * (quiz.passPct / 100));
        const r = results[id];
        const used = attempts[id] ?? 0;
        const passed = !!r?.passed;
        const canTake = !passed && used < MAX_ONB_QUIZ_ATTEMPTS;
        const statusLabel = r ? (passed ? "Passed" : "Did not pass") : "Not started";
        return [{
            id, icon: passed ? Check : ClipboardList, tone: passed ? "bg-emerald-50 text-emerald-600" : "bg-sky-50 text-sky-600",
            label: quiz.title, tag: <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">{quiz.category}</span>,
            // The chances used ride along in the description — the status column is the result.
            desc: `${cnt}-question test · pass ${quiz.passPct}% (${passMark}/${cnt}) · ${used}/${MAX_ONB_QUIZ_ATTEMPTS} chances used${r ? ` · last score ${r.score}/${r.total}` : ""}`,
            status: <Pill cls={r ? (passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600") : "bg-slate-100 text-slate-500"}>{statusLabel}</Pill>,
            actions: [
                ...(canTake ? [{ label: used === 0 ? "Take test" : `Retake (${used + 1}/${MAX_ONB_QUIZ_ATTEMPTS})`, icon: used === 0 ? ClipboardCheck : RotateCcw, onClick: () => onRun(id, "take") }] : []),
                ...(r ? [{ label: "Review answers", icon: Eye, onClick: () => onRun(id, "review") }] : []),
                { label: "Share to chat", icon: Share2, onClick: () => onShare({ label: quiz.title, status: r ? `${statusLabel} · ${r.score}/${r.total}` : statusLabel, files: r ? [`${quiz.title} — result.pdf`] : [] }) },
                ...askItems("quiz", (action) => onAsk({ id, title: quiz.title }, action), () => onRemark(quiz.title)),
            ],
        }];
    });
    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}>
            <OnbItemTable empty="No quizzes on the assigned workflow." rows={rows} />
            <StepReview label="post-orientation quiz" review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Training — safety & compliance courses assigned by the workflow; mark each complete.
function TrainingStep({ trainingIds, assigned, setOnb, review, onSign, onAsk, onRemark, onShare, hdr }: {
    trainingIds: string[]; assigned: AssignedTraining[]; setOnb: SetOnb; review?: OnbReview; onSign: SignFn;
    onAsk: (t: { id: string; name: string }, action: OnbRequestAction) => void; onRemark: (label: string) => void; onShare: ShareFn; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META.training;
    const byId = new Map(assigned.map((t) => [t.id, t]));
    const doneCount = trainingIds.filter((id) => byId.get(id)?.status === "completed").length;
    const setStatus = (id: string, name: string, status: AssignedTraining["status"] | "reset") => setOnb((prev) => {
        const list = (prev.trainings ?? []).filter((t) => t.id !== id);
        if (status === "reset") return { ...prev, trainings: list };
        const base = makeAssignedTraining(id, status) ?? { id, name, category: "", mandatory: false, dueDays: 0, assignedAt: Date.now(), status };
        return { ...prev, trainings: [...list, { ...base, status, completedAt: status === "completed" ? Date.now() : undefined }] };
    }, status === "reset" ? undefined : `Training ${status === "completed" ? "completed" : status === "in_progress" ? "started" : "assigned"} — ${name}`);

    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}
            action={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{doneCount} / {trainingIds.length} completed</span>}>
            <OnbItemTable empty="No training courses on the assigned workflow." rows={trainingIds.map((id) => {
                const t = getTrainingType(id);
                const name = t?.name ?? id;
                const status = byId.get(id)?.status;
                const m = status ? TRAINING_STATUS_META[status] : { label: "Not started", badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300" };
                const done = status === "completed";
                return {
                    id, icon: done ? Check : GraduationCap, tone: done ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-500",
                    label: name, tag: t?.defaultMandatory ? <span className="shrink-0 rounded-full bg-rose-50 px-1.5 text-[10px] font-semibold text-rose-600">Mandatory</span> : undefined,
                    desc: `${t?.category ?? "Training"}${t ? ` · due in ${t.defaultDueDays}d` : ""}`,
                    status: <Pill cls={m.badge}>{m.label}</Pill>,
                    actions: [
                        ...(!done && !status ? [{ label: "Start", icon: Clock, onClick: () => setStatus(id, name, "in_progress") }] : []),
                        done ? { label: "Undo complete", icon: RotateCcw, onClick: () => setStatus(id, name, "reset") } : { label: "Mark complete", icon: Check, onClick: () => setStatus(id, name, "completed") },
                        { label: "Share to chat", icon: Share2, onClick: () => onShare({ label: name, status: m.label, files: done ? [`${name} — certificate.pdf`] : [] }) },
                        ...askItems("training", (action) => onAsk({ id, name }, action), () => onRemark(name)),
                    ],
                };
            })} />
            <StepReview label="training" review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Final checklist — reviewer confirms & signs off (this completes the step).
function ChecklistStep({ checklist, review, onSign, hdr }: { checklist?: { id: string; name: string; description?: string; stages: unknown[] }; review?: OnbReview; onSign: SignFn; hdr: StepHeader }) {
    const meta = ONB_STEP_META.checklist;
    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}>
            {checklist ? (
                <div className="flex items-center gap-4 rounded-xl border border-slate-200 px-4 py-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ListChecks className="h-5 w-5" /></span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{checklist.name}</p>
                        <p className="truncate text-sm text-slate-500">{checklist.description || "Final review checklist"} · {totalChecklistItems(checklist as never)} items</p>
                    </div>
                </div>
            ) : <EmptyRow text="No checklist on the assigned workflow." />}
            <StepReview label="final checklist" review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// ── Requests / pickers / small UI ─────────────────────────────────────────────
const REQ_TAG: Record<OnbRequestAction, { label: string; cls: string }> = {
    Request: { label: "REQUEST", cls: "bg-blue-50 text-blue-600" },
    Order: { label: "ORDER", cls: "bg-violet-50 text-violet-600" },
    Review: { label: "REVIEW", cls: "bg-amber-50 text-amber-700" },
    Alert: { label: "ALERT", cls: "bg-rose-50 text-rose-600" },
};
function RequestsCard({ requests, onResolve, onCancel, onNew }: { requests: OnbRequest[]; onResolve: (r: OnbRequest) => void; onCancel: (r: OnbRequest) => void; onNew: () => void }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-800"><Inbox className="h-4 w-4 text-slate-400" /> Requests</h3>
                <span className={cn("text-xs font-bold", requests.length ? "text-amber-600" : "text-slate-400")}>{requests.length} open</span>
            </div>
            <Button size="sm" className="mb-3 w-full" onClick={onNew}><MessageSquarePlus className="h-4 w-4" /> Ask / Order</Button>
            {requests.length === 0 ? (
                <p className="py-2 text-center text-sm text-slate-400">No open requests.</p>
            ) : (
                <div className="space-y-2">
                    {requests.map((r) => {
                        const tag = REQ_TAG[r.action];
                        return (
                            <div key={r.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                                <div className="flex items-center gap-1.5">
                                    <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", tag.cls)}>{tag.label}</span>
                                    <span className="truncate text-[13px] font-semibold text-slate-800">{r.subject}</span>
                                </div>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                    <Send className="h-3 w-3" /> {r.recipient}{r.to ? ` · ${r.to}` : ""} · {r.channel}
                                </p>
                                {r.dueDate && <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 className="h-3 w-3" /> Due {r.dueDate}</p>}
                                <div className="mt-1.5 flex items-center gap-3">
                                    <button type="button" onClick={() => onResolve(r)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /> Mark completed</button>
                                    <button type="button" onClick={() => onCancel(r)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Cancel</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

// The Ask / Order actions for an item — what used to be its own split-button, now the
// tail of the row's ⋮ menu (mirrors hiring).
function askItems(kind: OnbStepKind, onPick: (action: OnbRequestAction) => void, onRemark: () => void): KebabItem[] {
    const tag = ONB_STEP_META[kind].short;
    const items: KebabItem[] = [{ label: "Ask driver for more data", icon: Send, onClick: () => onPick("Request") }];
    if (kind === "documents" || kind === "quiz") items.push({ label: `Order ${tag} report`, icon: FileSearch, onClick: () => onPick("Order") });
    items.push({ label: "Assign for review", icon: BadgeCheck, onClick: () => onPick("Review") });
    items.push({ label: "Add a remark", icon: MessageSquarePlus, onClick: onRemark });
    return items;
}

// Quick remark composer — adds a note against a specific item.
function RemarkDialog({ label, onClose, onSubmit }: { label: string; onClose: () => void; onSubmit: (text: string) => void }) {
    const [text, setText] = useState("");
    return (
        <Overlay title="Add a remark" onClose={onClose}>
            <p className="-mt-1 mb-3 text-sm text-slate-500">Add an internal remark against <span className="font-semibold text-slate-700">“{label}”</span>. It's saved to Notes &amp; Comments.</p>
            <textarea autoFocus className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a remark or comment…" />
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" disabled={!text.trim()} onClick={() => onSubmit(text.trim())}><MessageSquarePlus className="h-4 w-4" /> Add remark</Button>
            </div>
        </Overlay>
    );
}

// ── Ask / Order dialog — ask anyone to complete a form, document or quiz ────────
const REQ_DEFAULTS: Record<OnbRequestAction, (item: string) => { recipient: OnbRequestRecipient; subject: string; message: string }> = {
    Order: (item) => ({ recipient: "Provider / Agency", subject: `Order — ${item}`, message: `Please run and return ${item} for this driver.` }),
    Review: (item) => ({ recipient: "Hiring Manager", subject: `Review — ${item}`, message: `Please review ${item} and confirm it meets requirements.` }),
    Alert: (item) => ({ recipient: "Driver", subject: `Reminder — ${item}`, message: `This is a reminder to complete ${item}. Please action it at your earliest convenience.` }),
    Request: (item) => ({ recipient: "Driver", subject: `Please complete — ${item}`, message: `Please complete and sign ${item}.` }),
};
function OrderRequestDialog({ target, driver, driverEmail, onClose, onSubmit }: {
    target: ReqTarget; driver: Applicant; driverEmail: string; onClose: () => void;
    onSubmit: (r: Omit<OnbRequest, "id" | "status" | "at" | "by">) => void;
}) {
    const item = target.itemLabel;
    const initAction = target.action ?? "Request";
    const initDef = REQ_DEFAULTS[initAction](item);
    const [action, setAction] = useState<OnbRequestAction>(initAction);
    const [recipient, setRecipient] = useState<OnbRequestRecipient>(target.recipient ?? initDef.recipient);
    // A hired driver is on the app, so their chat is the default; anyone else gets email.
    const [channel, setChannel] = useState<OnbRequestChannel>((target.recipient ?? initDef.recipient) === "Driver" ? "In-app" : "Email");
    const [to, setTo] = useState((target.recipient ?? initDef.recipient) === "Driver" ? driverEmail : "");
    const [subject, setSubject] = useState(initDef.subject);
    const [message, setMessage] = useState(initDef.message);
    const [dueDate, setDueDate] = useState("");

    const onAction = (act: OnbRequestAction) => {
        setAction(act);
        const d = REQ_DEFAULTS[act](item);
        setRecipient(d.recipient); setTo(d.recipient === "Driver" ? driverEmail : ""); setSubject(d.subject); setMessage(d.message);
    };
    const onRecipient = (r: OnbRequestRecipient) => { setRecipient(r); setTo(r === "Driver" ? driverEmail : ""); };
    const verb = action === "Order" ? "Send order" : action === "Alert" ? "Send reminder" : action === "Review" ? "Assign review" : "Send request";
    const canSend = !!subject.trim() && (!needsEmail(channel) || /\S+@\S+\.\S+/.test(to));
    // Delivered through Messages (in-app chat, external chat link, or one-way email), then
    // handed to the caller to log against the onboarding file.
    const submit = () => {
        if (!canSend) return;
        const who = `${driver.firstName} ${driver.lastName}`;
        deliverRequest({
            delivery: channel,
            name: recipient === "Driver" ? who : (to.trim() || recipient),
            email: to.trim(),
            subject: subject.trim(),
            message: [message.trim(), dueDate ? `Due by ${dueDate}.` : ""].filter(Boolean).join("\n\n"),
            asked: target.itemId ? [item] : [],
            source: { type: "manual", id: driver.id, label: `Onboarding — ${who}` },
            record: { type: "onboarding", id: driver.id, label: `${who} — Onboarding file`, sublabel: item, path: `/hiring-process/onboarding/${driver.id}` },
            roleTag: recipient === "Driver" ? "Driver" : recipient === "Hiring Manager" ? "Manager" : "External",
        });
        onSubmit({ itemId: target.itemId, itemLabel: item, action, recipient, to, channel, subject: subject.trim(), message: message.trim(), dueDate: dueDate || undefined });
    };

    return (
        <Overlay title="Ask / Order" onClose={onClose}>
            <p className="-mt-1 mb-4 text-sm text-slate-500">{target.itemId ? <>For <span className="font-semibold text-slate-700">“{item}”</span>. </> : "Ask anyone to complete a form, document or quiz. "}Choose who should action it and how they're notified.</p>
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Action</label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {ONB_REQUEST_ACTIONS.map((act) => (
                            <button key={act.id} type="button" onClick={() => onAction(act.id)} className={cn("rounded-lg border px-3 py-2 text-left transition", action === act.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300")}>
                                <span className={cn("block text-[13px] font-semibold", action === act.id ? "text-blue-700" : "text-slate-800")}>{act.label}</span>
                                <span className="block text-[11px] leading-tight text-slate-400">{act.hint}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</label>
                    <DeliveryPicker className="mt-1.5" value={channel} onChange={setChannel} />
                </div>
                <div className={cn("grid gap-3", needsEmail(channel) && "sm:grid-cols-2")}>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{action === "Order" ? "Order from" : action === "Review" ? "Assign to" : "Send to"}</label>
                        <select value={recipient} onChange={(e) => onRecipient(e.target.value as OnbRequestRecipient)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400">
                            {ONB_REQUEST_RECIPIENTS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    {needsEmail(channel) && (
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Recipient email</label>
                            <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder={recipient === "Driver" ? driverEmail : "name@company.com"} />
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject</label>
                    <Input className="mt-1.5" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Message</label>
                    <textarea className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
                </div>
                <div className="max-w-[200px]">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Due date (optional)</label>
                    <Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" disabled={!canSend} onClick={submit}><Send className="h-4 w-4" /> {verb}</Button>
            </div>
        </Overlay>
    );
}

function WorkflowPicker({ workflows, currentId, formId, onClose, onAssign }: { workflows: OnbWorkflow[]; currentId?: string; /** The driver's application form — only workflows for its driver type are offered. */ formId: string; onClose: () => void; onAssign: (id: string) => void }) {
    const [sel, setSel] = useState<string | undefined>(currentId);
    const matching = workflows.filter((w) => driverTypeMatches(w.driverType, formId));
    return (
        <Overlay title="Assign onboarding workflow" onClose={onClose}>
            <p className="mb-3 text-sm text-slate-500">Choose the onboarding workflow this driver follows. Only workflows for <span className="font-semibold text-slate-700">{onbDriverTypeName(formId) ?? "this driver type"}</span> are shown. It sets the steps — policy forms, onboarding forms, documents, quiz and checklist.</p>
            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                {matching.length === 0 && <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">No onboarding workflow is set up for {onbDriverTypeName(formId)} yet. Create one in Settings ▸ Onboarding Setup.</p>}
                {matching.map((w) => {
                    const on = sel === w.id;
                    return (
                        <button key={w.id} type="button" onClick={() => setSel(w.id)}
                            className={cn("flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition", on ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50")}>
                            <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300")}>{on && <Check className="h-3 w-3" />}</span>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-slate-800">{w.name}</p>
                                    {w.driverType && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">{onbDriverTypeName(w.driverType)}</span>}
                                </div>
                                {w.description && <p className="truncate text-xs text-slate-400">{w.description}</p>}
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">{(w.policyForms?.length ?? 0) + w.forms.length} forms · {w.documents.length} docs · {w.quizzes.length} quiz · {w.checklistId ? 1 : 0} checklist</p>
                            </div>
                        </button>
                    );
                })}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-sm text-slate-500">{sel ? "1 selected" : "None selected"}</span>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" disabled={!sel} onClick={() => sel && onAssign(sel)}><WorkflowIcon className="h-4 w-4" /> Assign workflow</Button>
                </div>
            </div>
        </Overlay>
    );
}

function EmptyRow({ text }: { text: string }) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-5 py-10 text-center text-sm text-slate-400">{text}</div>;
}

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-5">{children}</div>
            </div>
        </div>
    );
}
