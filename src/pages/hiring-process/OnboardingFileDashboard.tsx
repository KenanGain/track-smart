import { useState } from "react";
import {
    ChevronLeft, ChevronDown, Check, X, Send, FileText, RotateCcw, CircleCheck, Clock,
    Workflow as WorkflowIcon, Activity as ActivityIcon, StickyNote, Bell, AlertCircle,
    Eye, FileSearch, ClipboardCheck, ClipboardList, BadgeCheck, PenLine, Inbox, ListChecks,
    Mail, MessageSquarePlus, Clock3, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplicants, formName, relativeTime, ACTOR, STEP_STATUS_META, type StepStatus } from "./applicants.data";
import { useOnboardingQuizzes } from "./onboarding-quizzes.data";
import { useOnbWorkflows, resolveOnbWorkflow, onbSteps, onbProgress, ONB_STEP_META, onbDriverTypeName, MAX_ONB_QUIZ_ATTEMPTS, getTrainingType, makeAssignedTraining, TRAINING_STATUS_META, type OnbWorkflow, type AssignedTraining } from "./onboarding.data";
import { policyDocuments } from "./policy-forms.data";
import { PolicyForm } from "./PolicyForm";
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
    const [docView, setDocView] = useState<DocView | null>(null);
    const [docReview, setDocReview] = useState<DocTemplate | null>(null);
    const [quizRun, setQuizRun] = useState<{ quizId: string; mode: "take" | "review" } | null>(null);
    const [wfPicker, setWfPicker] = useState(false);
    const [reqTarget, setReqTarget] = useState<ReqTarget | null>(null);
    const [reviewTarget, setReviewTarget] = useState<ReqTarget | null>(null);
    const [remarkFor, setRemarkFor] = useState<string | null>(null);

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
    if (docView) {
        const def = resolveFormDef(docView.defId);
        if (def) return <PolicyForm def={def} startPreview={docView.pdf} onBack={() => setDocView(null)} />;
    }
    if (docReview) return <DocSignReview template={docReview} driverName={`${a.firstName} ${a.lastName}`} onBack={() => setDocReview(null)} />;
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
                <div className="sticky top-0 z-20 rounded-xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
                    <div className="overflow-x-auto pb-1">
                        <div className="flex min-w-max items-start">
                            {steps.map((s, i) => {
                                const doneStep = s.status === "complete";
                                const isSel = s.kind === activeKind;
                                return (
                                    <button key={s.kind} type="button" onClick={() => setActive(s.kind)} className="relative flex min-w-[128px] flex-1 flex-col items-center px-1 outline-none">
                                        {i > 0 && <span className="absolute left-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: steps[i - 1].status === "complete" ? "#10b981" : "#e2e8f0" }} />}
                                        {i < steps.length - 1 && <span className="absolute right-0 top-[18px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: doneStep ? "#10b981" : "#e2e8f0" }} />}
                                        <StepDot n={i + 1} status={s.status} active={isSel} />
                                        <span className={cn("mt-2 line-clamp-2 max-w-[116px] text-center text-[10px] font-bold uppercase leading-tight tracking-wide", isSel ? "text-blue-700" : "text-slate-500")}>{s.title}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main grid — same responsive sizing as the hiring file */}
                <div className="flex flex-col gap-5 lg:flex-row">
                    <div className="min-w-0 flex-1 space-y-4">
                        {activeKind === "policy" && (
                            <FormListStep kind="policy" items={(wf?.policyForms ?? []).map((id) => ({ id, label: policyLabel(id), desc: policyDesc(id), defId: id }))}
                                signedSet={new Set(onb.signedContracts ?? [])} docState={onb.docState ?? {}} setKey="signedContracts"
                                setOnb={setOnb} onOpen={setDocView} review={onb.reviews?.policy} onSign={(r) => signStep("policy", "policy forms", r)}
                                onAsk={(item, action) => openReq({ itemId: item.id, itemLabel: item.label, action })} onRemark={(label) => setRemarkFor(label)} hdr={hdr} />
                        )}
                        {activeKind === "forms" && (
                            <FormListStep kind="forms" items={(wf?.forms ?? []).map((id) => { const f = ONBOARDING_FORMS.find((x) => x.id === id); return { id, label: f?.label ?? id, desc: f?.desc ?? "", defId: id }; })}
                                signedSet={new Set(onb.signedForms ?? [])} docState={onb.docState ?? {}} setKey="signedForms"
                                setOnb={setOnb} onOpen={setDocView} review={onb.reviews?.forms} onSign={(r) => signStep("forms", "onboarding forms", r)}
                                onAsk={(item, action) => openReq({ itemId: item.id, itemLabel: item.label, action })} onRemark={(label) => setRemarkFor(label)} hdr={hdr} />
                        )}
                        {activeKind === "documents" && (
                            <DocumentsStep docs={wfDocs} signedDocs={new Set(onb.signedDocs ?? [])} docState={onb.docState ?? {}}
                                setOnb={setOnb} onReviewDoc={setDocReview} review={onb.reviews?.documents} onSign={(r) => signStep("documents", "documents", r)}
                                onAsk={(t, action) => openReq({ itemId: t.id, itemLabel: t.name, action })} onRemark={(label) => setRemarkFor(label)} hdr={hdr} />
                        )}
                        {activeKind === "quiz" && (
                            <QuizStep quizIds={wf?.quizzes ?? []} quizzes={quizzes} results={onb.quizResults ?? {}} attempts={onb.quizAttempts ?? {}}
                                onRun={(id, mode) => setQuizRun({ quizId: id, mode })} review={onb.reviews?.quiz} onSign={(r) => signStep("quiz", "post-orientation quiz", r)}
                                onAsk={(quiz, action) => openReq({ itemId: quiz.id, itemLabel: quiz.title, action })} onRemark={(label) => setRemarkFor(label)} hdr={hdr} />
                        )}
                        {activeKind === "training" && (
                            <TrainingStep trainingIds={wf?.trainings ?? []} assigned={onb.trainings ?? []} setOnb={setOnb}
                                review={onb.reviews?.training} onSign={(r) => signStep("training", "training", r)}
                                onAsk={(t, action) => openReq({ itemId: t.id, itemLabel: t.name, action })} onRemark={(label) => setRemarkFor(label)} hdr={hdr} />
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
                <WorkflowPicker workflows={workflows} currentId={wf?.id} onClose={() => setWfPicker(false)}
                    onAssign={(id) => { setOnb((p) => ({ ...p, workflowId: id }), `Assigned onboarding workflow — ${workflows.find((w) => w.id === id)?.name ?? id}`); setWfPicker(false); }} />
            )}

            {reqTarget && (
                <OrderRequestDialog target={reqTarget} driverEmail={a.email} onClose={() => setReqTarget(null)}
                    onSubmit={(r) => { submitRequest(r); setReqTarget(null); }} />
            )}

            {reviewTarget && (
                <AssignReviewDialog driverName={`${a.firstName} ${a.lastName}`} carrier={a.carrierId} context={reviewTarget.itemLabel}
                    onClose={() => setReviewTarget(null)}
                    onAssign={(v) => { assignReview(reviewTarget, v); setReviewTarget(null); }} />
            )}

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

function onbDocLabelBadge(signed: boolean, state?: OnbDocState) {
    if (signed) return { label: "Signed", cls: "bg-emerald-50 text-emerald-700" };
    if (state === "requested") return { label: "Requested", cls: "bg-blue-50 text-blue-700" };
    return { label: "Pending", cls: "bg-slate-100 text-slate-500" };
}

function ModuleShell({ Icon, stepLabel, title, desc, statusPill, action, statusMenu, children }: {
    Icon: React.ElementType; stepLabel?: string; title: string; desc: string;
    statusPill?: React.ReactNode; action?: React.ReactNode; statusMenu?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Icon className="h-5 w-5" /></div>
                <div className="min-w-0">
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
const TINY = "h-8 shrink-0 justify-center gap-1 px-2.5 text-xs";

// A fixed-width status pill + button group so every row lines up on the right edge.
function RowActions({ badge, signed, onReview, onPdf, onToggleSign, reviewIcon, menu }: {
    badge: { label: string; cls: string }; signed: boolean;
    onReview: () => void; onPdf?: () => void; onToggleSign: () => void; reviewIcon?: React.ReactNode; menu: React.ReactNode;
}) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            <span className={cn("w-[76px] shrink-0 rounded-full py-1 text-center text-[11px] font-semibold", badge.cls)}>{badge.label}</span>
            <Button variant="outline" className={cn(TINY, "w-[96px]")} onClick={onReview}>{reviewIcon ?? <Eye className="h-3.5 w-3.5" />} Review</Button>
            {onPdf && <Button variant="outline" className={cn(TINY, "w-[76px]")} onClick={onPdf}><FileText className="h-3.5 w-3.5" /> PDF</Button>}
            {menu}
            <Button variant={signed ? "outline" : "default"} className={cn(TINY, "w-[116px]")} onClick={onToggleSign}>
                {signed ? <><RotateCcw className="h-3.5 w-3.5" /> Undo</> : <><Check className="h-3.5 w-3.5" /> Mark signed</>}
            </Button>
        </div>
    );
}

// One signable row — Review · PDF · Ask/Order · Mark signed.
function OnbDocRow({ item, kind, signed, state, onReview, onPdf, onAsk, onRemark, onToggleSign }: {
    item: DocItem; kind: OnbStepKind; signed: boolean; state?: OnbDocState;
    onReview: () => void; onPdf: () => void; onAsk: (action: OnbRequestAction) => void; onRemark: () => void; onToggleSign: () => void;
}) {
    const badge = onbDocLabelBadge(signed, state);
    return (
        <div className="rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", signed ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400")}>
                    {signed ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="truncate text-xs text-slate-400">{item.desc}</p>
                </div>
                <RowActions badge={badge} signed={signed} onReview={onReview} onPdf={onPdf} onToggleSign={onToggleSign}
                    menu={<AskOrderMenu kind={kind} onPick={onAsk} onRemark={onRemark} />} />
            </div>
        </div>
    );
}

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
// Policy forms + Onboarding forms — both are PolicyForm-backed signable lists.
function FormListStep({ kind, items, signedSet, docState, setKey, setOnb, onOpen, review, onSign, onAsk, onRemark, hdr }: {
    kind: "policy" | "forms"; items: DocItem[]; signedSet: Set<string>; docState: Record<string, OnbDocState>;
    setKey: "signedContracts" | "signedForms"; setOnb: SetOnb; onOpen: (v: DocView) => void; review?: OnbReview; onSign: SignFn;
    onAsk: (item: DocItem, action: OnbRequestAction) => void; onRemark: (label: string) => void; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META[kind];
    const toggle = (item: DocItem) => setOnb((prev) => {
        const cur = new Set(prev[setKey] ?? []);
        cur.has(item.id) ? cur.delete(item.id) : cur.add(item.id);
        return { ...prev, [setKey]: [...cur] };
    }, signedSet.has(item.id) ? undefined : `${kind === "policy" ? "Policy form" : "Onboarding form"} signed — ${item.label}`);

    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}
            action={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{items.filter((i) => signedSet.has(i.id)).length} / {items.length} signed</span>}>
            {items.length === 0 ? <EmptyRow text="No items in this step for the assigned workflow." /> : (
                <div className="space-y-2.5">
                    {items.map((item) => (
                        <OnbDocRow key={item.id} item={item} kind={kind} signed={signedSet.has(item.id)} state={docState[item.id]}
                            onReview={() => item.defId && onOpen({ defId: item.defId, label: item.label, pdf: false })}
                            onPdf={() => item.defId && onOpen({ defId: item.defId, label: item.label, pdf: true })}
                            onAsk={(action) => onAsk(item, action)} onRemark={() => onRemark(item.label)} onToggleSign={() => toggle(item)} />
                    ))}
                </div>
            )}
            <StepReview label={meta.title.toLowerCase()} review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Documents & sign — PDF e-sign templates; Review opens the field-check view.
function DocumentsStep({ docs, signedDocs, docState, setOnb, onReviewDoc, review, onSign, onAsk, onRemark, hdr }: {
    docs: DocTemplate[]; signedDocs: Set<string>; docState: Record<string, OnbDocState>;
    setOnb: SetOnb; onReviewDoc: (t: DocTemplate) => void; review?: OnbReview; onSign: SignFn;
    onAsk: (t: DocTemplate, action: OnbRequestAction) => void; onRemark: (label: string) => void; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META.documents;
    const toggle = (t: DocTemplate) => setOnb((prev) => {
        const cur = new Set(prev.signedDocs ?? []);
        cur.has(t.id) ? cur.delete(t.id) : cur.add(t.id);
        return { ...prev, signedDocs: [...cur] };
    }, signedDocs.has(t.id) ? undefined : `Document e-signed — ${t.name}`);

    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}
            action={<span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{docs.filter((t) => signedDocs.has(t.id)).length} / {docs.length} signed</span>}>
            {docs.length === 0 ? <EmptyRow text="No PDF documents on the assigned workflow." /> : (
                <div className="space-y-2.5">
                    {docs.map((t) => {
                        const isSigned = signedDocs.has(t.id);
                        const badge = onbDocLabelBadge(isSigned, docState[t.id]);
                        const fieldCount = t.fields.filter((f) => !f.stampDataUrl).length;
                        return (
                            <div key={t.id} className="rounded-xl border border-slate-200">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", isSigned ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-500")}>{isSigned ? <Check className="h-4 w-4" /> : <FileText className="h-4 w-4" />}</span>
                                    <div className="min-w-0 flex-1 basis-40">
                                        <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                                        <p className="truncate text-xs text-slate-400">PDF · {t.documents.length} document{t.documents.length === 1 ? "" : "s"} · {fieldCount} field{fieldCount === 1 ? "" : "s"} to sign</p>
                                    </div>
                                    <RowActions badge={badge} signed={isSigned} reviewIcon={<FileSearch className="h-3.5 w-3.5" />}
                                        onReview={() => onReviewDoc(t)} onToggleSign={() => toggle(t)}
                                        menu={<AskOrderMenu kind="documents" onPick={(action) => onAsk(t, action)} onRemark={() => onRemark(t.name)} />} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <StepReview label="documents" review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Post-orientation quiz — tests come from the workflow; Take test / Retake / Review.
function QuizStep({ quizIds, quizzes, results, attempts, onRun, review, onSign, onAsk, onRemark, hdr }: {
    quizIds: string[]; quizzes: { id: string; title: string; category: string; passPct: number; questions: unknown[] }[];
    results: Record<string, { score: number; total: number; passed: boolean }>; attempts: Record<string, number>;
    onRun: (id: string, mode: "take" | "review") => void; review?: OnbReview; onSign: SignFn;
    onAsk: (quiz: { id: string; title: string }, action: OnbRequestAction) => void; onRemark: (label: string) => void; hdr: StepHeader;
}) {
    const meta = ONB_STEP_META.quiz;
    return (
        <ModuleShell Icon={meta.Icon} stepLabel={hdr.stepLabel} title={meta.title} desc={meta.desc} statusPill={hdr.statusPill} statusMenu={hdr.statusMenu}>
            {quizIds.length === 0 ? <EmptyRow text="No quizzes on the assigned workflow." /> : (
                <div className="space-y-2.5">
                    {quizIds.map((id) => {
                        const quiz = quizzes.find((q) => q.id === id);
                        if (!quiz) return null;
                        const cnt = quiz.questions.length;
                        const passMark = Math.ceil(cnt * (quiz.passPct / 100));
                        const r = results[id];
                        const used = attempts[id] ?? 0;
                        const passed = !!r?.passed;
                        const canTake = !passed && used < MAX_ONB_QUIZ_ATTEMPTS;
                        return (
                            <div key={id} className="rounded-xl border border-slate-200 px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600"><ClipboardList className="h-4 w-4" /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-semibold text-slate-800">{quiz.title} <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-500">{quiz.category}</span></p>
                                        <p className="truncate text-xs text-slate-500">{cnt}-question test · pass {quiz.passPct}% ({passMark}/{cnt}){r ? ` · last score ${r.score}/${r.total}` : ""}</p>
                                    </div>
                                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", used > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500")}>{used}/{MAX_ONB_QUIZ_ATTEMPTS} chances</span>
                                    {r ? <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-200")}>{passed ? "Passed" : "Did not pass"}</span>
                                        : <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">Not started</span>}
                                    {r && <Button variant="outline" className={TINY} onClick={() => onRun(id, "review")}><Eye className="h-3.5 w-3.5" /> Review</Button>}
                                    <AskOrderMenu kind="quiz" onPick={(action) => onAsk({ id, title: quiz.title }, action)} onRemark={() => onRemark(quiz.title)} />
                                    {canTake && (used === 0
                                        ? <Button className={TINY} onClick={() => onRun(id, "take")}><ClipboardCheck className="h-3.5 w-3.5" /> Take test</Button>
                                        : <Button variant="outline" className={TINY} onClick={() => onRun(id, "take")}><RotateCcw className="h-3.5 w-3.5" /> Retake ({used + 1}/{MAX_ONB_QUIZ_ATTEMPTS})</Button>)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            <StepReview label="post-orientation quiz" review={review} onSign={onSign} />
        </ModuleShell>
    );
}

// Training — safety & compliance courses assigned by the workflow; mark each complete.
function TrainingStep({ trainingIds, assigned, setOnb, review, onSign, onAsk, onRemark, hdr }: {
    trainingIds: string[]; assigned: AssignedTraining[]; setOnb: SetOnb; review?: OnbReview; onSign: SignFn;
    onAsk: (t: { id: string; name: string }, action: OnbRequestAction) => void; onRemark: (label: string) => void; hdr: StepHeader;
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
            {trainingIds.length === 0 ? <EmptyRow text="No training courses on the assigned workflow." /> : (
                <div className="space-y-2.5">
                    {trainingIds.map((id) => {
                        const t = getTrainingType(id);
                        const name = t?.name ?? id;
                        const cur = byId.get(id);
                        const status = cur?.status;
                        const m = status ? TRAINING_STATUS_META[status] : { label: "Not started", badge: "bg-slate-100 text-slate-500", dot: "bg-slate-300" };
                        const done = status === "completed";
                        return (
                            <div key={id} className="rounded-xl border border-slate-200">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
                                    <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", done ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-500")}>{done ? <Check className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}</span>
                                    <div className="min-w-0 flex-1 basis-40">
                                        <p className="truncate text-sm font-semibold text-slate-800">{name} {t?.defaultMandatory && <span className="ml-1 rounded-full bg-rose-50 px-1.5 text-[10px] font-semibold text-rose-600">Mandatory</span>}</p>
                                        <p className="truncate text-xs text-slate-400">{t?.category ?? "Training"}{t ? ` · due in ${t.defaultDueDays}d` : ""}</p>
                                    </div>
                                    <span className={cn("w-[92px] shrink-0 rounded-full py-1 text-center text-[11px] font-semibold", m.badge)}>{m.label}</span>
                                    {!done && !status && <Button variant="outline" className={cn(TINY, "w-[84px]")} onClick={() => setStatus(id, name, "in_progress")}><Clock className="h-3.5 w-3.5" /> Start</Button>}
                                    <AskOrderMenu kind="training" onPick={(action) => onAsk({ id, name }, action)} onRemark={() => onRemark(name)} />
                                    <Button variant={done ? "outline" : "default"} className={cn(TINY, "w-[124px]")} onClick={() => setStatus(id, name, done ? "reset" : "completed")}>
                                        {done ? <><RotateCcw className="h-3.5 w-3.5" /> Undo</> : <><Check className="h-3.5 w-3.5" /> Mark complete</>}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
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

// Ask / Order split-button — a dropdown of context actions per step (mirrors hiring).
function AskOrderMenu({ kind, onPick, onRemark }: { kind: OnbStepKind; onPick: (action: OnbRequestAction) => void; onRemark: () => void }) {
    const [open, setOpen] = useState(false);
    const tag = ONB_STEP_META[kind].short;
    const actions: { key: string; label: string; Icon: React.ElementType; run: () => void }[] = [
        { key: "ask", label: "Ask driver for more data", Icon: Send, run: () => onPick("Request") },
    ];
    if (kind === "documents" || kind === "quiz") actions.push({ key: "order", label: `Order ${tag} report`, Icon: FileSearch, run: () => onPick("Order") });
    actions.push({ key: "review", label: "Assign for review", Icon: BadgeCheck, run: () => onPick("Review") });
    actions.push({ key: "remark", label: "Add a remark", Icon: MessageSquarePlus, run: onRemark });
    return (
        <div className="relative">
            <Button variant="outline" className={cn(TINY, "w-[142px]")} onClick={() => setOpen((o) => !o)}>
                <MessageSquarePlus className="h-3.5 w-3.5" /> Ask / Order <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Actions · {tag}</p>
                        {actions.map((act) => (
                            <button key={act.key} type="button" onClick={() => { act.run(); setOpen(false); }}
                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                                <act.Icon className="h-4 w-4 text-slate-400" /> {act.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
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
function OrderRequestDialog({ target, driverEmail, onClose, onSubmit }: {
    target: ReqTarget; driverEmail: string; onClose: () => void;
    onSubmit: (r: Omit<OnbRequest, "id" | "status" | "at" | "by">) => void;
}) {
    const item = target.itemLabel;
    const initAction = target.action ?? "Request";
    const initDef = REQ_DEFAULTS[initAction](item);
    const [action, setAction] = useState<OnbRequestAction>(initAction);
    const [recipient, setRecipient] = useState<OnbRequestRecipient>(target.recipient ?? initDef.recipient);
    const [channel, setChannel] = useState<OnbRequestChannel>("Email");
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
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{action === "Order" ? "Order from" : action === "Review" ? "Assign to" : "Send to"}</label>
                        <select value={recipient} onChange={(e) => onRecipient(e.target.value as OnbRequestRecipient)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-400">
                            {ONB_REQUEST_RECIPIENTS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Send via</label>
                        <div className="mt-1.5 flex rounded-lg border border-slate-200 p-1">
                            {(["Email", "In-app"] as OnbRequestChannel[]).map((c) => (
                                <button key={c} type="button" onClick={() => setChannel(c)} className={cn("flex-1 rounded-md py-1.5 text-sm font-semibold transition", channel === c ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50")}>{c === "Email" ? <Mail className="mr-1 inline h-3.5 w-3.5" /> : <MessageSquarePlus className="mr-1 inline h-3.5 w-3.5" />}{c}</button>
                            ))}
                        </div>
                    </div>
                </div>
                {channel === "Email" && (
                    <div>
                        <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Recipient email</label>
                        <Input className="mt-1.5" value={to} onChange={(e) => setTo(e.target.value)} placeholder={recipient === "Driver" ? driverEmail : "name@company.com"} />
                    </div>
                )}
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
                <Button size="sm" disabled={!subject.trim()} onClick={() => onSubmit({ itemId: target.itemId, itemLabel: item, action, recipient, to, channel, subject: subject.trim(), message: message.trim(), dueDate: dueDate || undefined })}><Send className="h-4 w-4" /> {verb}</Button>
            </div>
        </Overlay>
    );
}

function WorkflowPicker({ workflows, currentId, onClose, onAssign }: { workflows: OnbWorkflow[]; currentId?: string; onClose: () => void; onAssign: (id: string) => void }) {
    const [sel, setSel] = useState<string | undefined>(currentId);
    return (
        <Overlay title="Assign onboarding workflow" onClose={onClose}>
            <p className="mb-3 text-sm text-slate-500">Choose the onboarding workflow this driver follows. It sets the steps — policy forms, onboarding forms, documents, quiz and checklist.</p>
            <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
                {workflows.map((w) => {
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
