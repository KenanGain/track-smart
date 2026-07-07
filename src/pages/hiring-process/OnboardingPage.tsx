import { useMemo, useState } from "react";
import { Check, Search, ArrowRight, UserCheck, CalendarDays, ClipboardList, MessageSquarePlus, ChevronDown, Send, FileSearch, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApplicants, ACTOR, type Applicant } from "./applicants.data";
import { useOnbWorkflows, onbSteps, onbProgress, resolveOnbWorkflow, ONBOARDING_FORMS, type OnbWorkflow, type OnbRequest, type OnbRequestAction, type OnbRequestRecipient } from "./onboarding.data";
import { policyDocuments } from "./policy-forms.data";
import { useDocTemplates } from "./document-templates.data";
import { useOnboardingQuizzes } from "./onboarding-quizzes.data";
import { AskDriverDialog, type AskGroup, type AskResult } from "./AskDriverDialog";
import { RemarkDialog } from "./RemarkDialog";
import { AssignReviewDialog, type AssignReviewPayload } from "./AssignReviewDialog";

const ONB_FILE = "/hiring-process/onboarding";
const parseMs = (s: string) => { const t = Date.parse(s); return Number.isNaN(t) ? Date.now() : t; };
const daysAgo = (ms: number) => Math.max(0, Math.floor((Date.now() - ms) / 86_400_000));

export function OnboardingPage({ onNavigate, carrierId }: { onNavigate: (path: string) => void; carrierId?: string }) {
    const { applicants, updateOne } = useApplicants();
    const { workflows } = useOnbWorkflows();
    const { templates } = useDocTemplates();
    const { quizzes } = useOnboardingQuizzes();
    const [query, setQuery] = useState("");
    const [dialog, setDialog] = useState<{ a: Applicant; mode: "ask" | "review" | "remark" } | null>(null);

    // The onboarding pool = drivers who have been hired (application approved).
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        return applicants
            .filter((a) => a.status === "approved")
            .filter((a) => !carrierId || a.carrierId === carrierId)
            .filter((a) => !q || `${a.firstName} ${a.lastName} ${a.email}`.toLowerCase().includes(q));
    }, [applicants, carrierId, query]);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="border-b border-slate-200 bg-white">
                <div className="px-4 py-5 sm:px-6 lg:px-8">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Hiring Process</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Onboarding</h1>
                    <p className="mt-1 text-sm text-slate-500">Bring every newly-hired driver through onboarding. Click a row to open the onboarding file.</p>
                </div>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm font-semibold text-slate-700">Drivers onboarding <span className="ml-1 font-normal text-slate-400">{rows.length}</span></p>
                        <div className="relative w-full sm:w-64">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drivers…" className="h-9 pl-9" />
                        </div>
                    </div>

                    {rows.length === 0 ? (
                        <div className="px-5 py-16 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><UserCheck className="h-6 w-6" /></div>
                            <p className="mt-3 text-sm font-semibold text-slate-700">No drivers in onboarding yet</p>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">Once a driver's application is approved in Hiring, they appear here to start onboarding.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {rows.map((a) => (
                                <OnboardingRow key={a.id} a={a} wf={resolveOnbWorkflow(a.onboarding, a.formId, workflows)} onOpen={() => onNavigate(`${ONB_FILE}/${a.id}`)}
                                    onAction={(kind, label) => {
                                        if (kind === "ask") { setDialog({ a, mode: "ask" }); return; }
                                        if (kind === "review") { setDialog({ a, mode: "review" }); return; }
                                        if (kind === "remark") { setDialog({ a, mode: "remark" }); return; }
                                        updateOne(a.id, (prev) => {
                                            const onb = prev.onboarding ?? {};
                                            return { onboarding: { ...onb, events: [{ id: `oe-${Date.now()}`, text: label, at: Date.now() }, ...(onb.events ?? [])] } };
                                        });
                                    }} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {dialog && dialog.mode === "remark" && (
                <RemarkDialog subtitle={`Add an internal remark against ${dialog.a.firstName} ${dialog.a.lastName}.`}
                    onClose={() => setDialog(null)}
                    onSubmit={(text) => {
                        const driver = dialog.a;
                        updateOne(driver.id, (prev) => {
                            const onb = prev.onboarding ?? {}; const now = Date.now();
                            return { onboarding: { ...onb,
                                notes: [{ id: `n-${now}`, text, at: now, by: ACTOR }, ...(onb.notes ?? [])],
                                events: [{ id: `oe-${now}`, text: `Remark added — ${text}`, at: now }, ...(onb.events ?? [])],
                            } };
                        });
                        setDialog(null);
                    }} />
            )}

            {dialog && dialog.mode === "ask" && (() => {
                const driver = dialog.a;
                const name = `${driver.firstName} ${driver.lastName}`;
                const wf = resolveOnbWorkflow(driver.onboarding, driver.formId, workflows);
                const groups = onbAskGroups(driver, wf, templates, quizzes);
                const labelMap = Object.fromEntries(groups.flatMap((g) => g.items.map((i) => [i.id, i.label] as const)));
                return (
                    <AskDriverDialog driverName={name} driverEmail={driver.email} groups={groups}
                        subtitle={`Ask ${name} to complete forms, documents & signatures.`}
                        onClose={() => setDialog(null)}
                        onSend={(r) => { sendOnbAsk(updateOne, driver, r, labelMap, "Request", "Driver"); setDialog(null); }} />
                );
            })()}

            {dialog && dialog.mode === "review" && (() => {
                const driver = dialog.a;
                const wf = resolveOnbWorkflow(driver.onboarding, driver.formId, workflows);
                const scopes = onbSteps(driver.onboarding, wf).map((s) => ({ id: s.kind, label: s.title }));
                return (
                    <AssignReviewDialog driverName={`${driver.firstName} ${driver.lastName}`} carrier={carrierId} context="onboarding" scopes={scopes}
                        onClose={() => setDialog(null)}
                        onAssign={(v) => { assignOnbReview(updateOne, driver, v); setDialog(null); }} />
                );
            })()}
        </div>
    );
}

// Assign a hiring manager to review this driver's onboarding — logged as an open Review request.
function assignOnbReview(updateOne: (id: string, fn: (prev: Applicant) => Partial<Applicant>) => void, a: Applicant, v: AssignReviewPayload) {
    updateOne(a.id, (prev) => {
        const onb = prev.onboarding ?? {}; const now = Date.now();
        const req: OnbRequest = { id: `orq-${now}`, itemLabel: v.scopeLabel, action: "Review", recipient: "Hiring Manager", to: v.email, channel: "Email", subject: v.subject, message: v.message, status: "open", at: now, by: ACTOR };
        return { onboarding: { ...onb, requests: [req, ...(onb.requests ?? [])], events: [{ id: `oe-${now}`, text: `Assigned review (${v.scopeLabel}) to ${v.name}${v.role ? ` (${v.role})` : ""} · ${v.email}`, at: now }, ...(onb.events ?? [])] } };
    });
}

// Build the requestable-item groups for a driver from the assigned onboarding workflow.
function onbAskGroups(a: Applicant, wf: OnbWorkflow | undefined, templates: { id: string; name: string }[], quizzes: { id: string; title: string }[]): AskGroup[] {
    const onb = a.onboarding ?? {};
    const signedContracts = new Set(onb.signedContracts ?? []);
    const signedForms = new Set(onb.signedForms ?? []);
    const signedDocs = new Set(onb.signedDocs ?? []);
    const policyLabel = (id: string) => { const p = policyDocuments().find((x) => x.id === id); return p ? `${p.title} ${p.accentTitle}`.trim() : id; };
    return [
        { title: "Policy forms", items: (wf?.policyForms ?? []).map((id) => ({ id, label: policyLabel(id), done: signedContracts.has(id) })) },
        { title: "Onboarding forms", items: (wf?.forms ?? []).map((id) => ({ id, label: ONBOARDING_FORMS.find((x) => x.id === id)?.label ?? id, done: signedForms.has(id) })) },
        { title: "Documents & signatures", items: (wf?.documents ?? []).map((id) => ({ id, label: templates.find((t) => t.id === id)?.name ?? id, done: signedDocs.has(id) })) },
        { title: "Quizzes", items: (wf?.quizzes ?? []).map((id) => ({ id, label: quizzes.find((q) => q.id === id)?.title ?? id, done: !!onb.quizResults?.[id]?.passed })) },
    ].filter((g) => g.items.length > 0);
}

// Record an "ask driver" / "assign review" send — mark each item requested and log open requests.
function sendOnbAsk(updateOne: (id: string, fn: (prev: Applicant) => Partial<Applicant>) => void, a: Applicant, r: AskResult, labelMap: Record<string, string>, action: OnbRequestAction, recipient: OnbRequestRecipient) {
    updateOne(a.id, (prev) => {
        const onb = prev.onboarding ?? {};
        const docState = { ...(onb.docState ?? {}) };
        const now = Date.now();
        const reqs: OnbRequest[] = r.itemIds.map((id, i) => {
            if (action === "Request") docState[id] = "requested";
            return { id: `orq-${now}-${i}`, itemId: id, itemLabel: labelMap[id] ?? id, action, recipient, to: r.to, channel: r.channel, subject: r.subject, message: r.message, status: "open", at: now, by: ACTOR };
        });
        const n = r.itemIds.length;
        const verb = action === "Review" ? `Assigned ${n} item${n === 1 ? "" : "s"} for review to ${r.to || recipient}` : n ? `Asked ${a.firstName} for ${n} item${n === 1 ? "" : "s"}` : `Sent ${a.firstName} a note`;
        return { onboarding: { ...onb, docState, requests: [...reqs, ...(onb.requests ?? [])], events: [{ id: `oe-${now}`, text: `${verb} via ${r.channel}: “${r.subject}”`, at: now }, ...(onb.events ?? [])] } };
    });
}

function OnboardingRow({ a, wf, onOpen, onAction }: { a: Applicant; wf?: OnbWorkflow; onOpen: () => void; onAction: (kind: string, label: string) => void }) {
    const steps = onbSteps(a.onboarding, wf);
    const { done, total, complete } = onbProgress(a.onboarding, wf);
    const current = steps.findIndex((s) => s.status !== "complete");
    const currentIdx = current === -1 ? steps.length : current;
    const phase = complete
        ? { label: "Onboarding complete", dot: "bg-emerald-500", text: "text-emerald-600" }
        : done > 0
            ? { label: "In progress", dot: "bg-amber-500", text: "text-amber-600" }
            : { label: "Not started", dot: "bg-slate-400", text: "text-slate-500" };
    const stepLabel = steps[Math.min(currentIdx, steps.length - 1)]?.title ?? "";

    return (
        <div className="px-5 py-4 hover:bg-slate-50/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                {/* Driver */}
                <div className="w-full min-w-0 lg:w-56 lg:shrink-0">
                    <button type="button" onClick={onOpen} className="truncate text-left text-[15px] font-semibold text-blue-700 hover:underline">{a.firstName} {a.lastName}</button>
                    <p className="truncate text-xs text-slate-400">{a.position ?? "Driver"} · {wf?.name ?? "—"}</p>
                    <span className={cn("mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide", phase.text)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", phase.dot)} /> {phase.label}
                    </span>
                </div>

                {/* Workflow stepper (from the assigned onboarding workflow) */}
                <div className="min-w-0 flex-1 overflow-x-auto pb-1">
                    <div className="flex min-w-max items-start">
                        {steps.map((s, i) => {
                            const isDone = s.status === "complete";
                            const isCurrent = !complete && i === currentIdx;
                            return (
                                <div key={s.kind} className="relative flex min-w-[116px] flex-1 flex-col items-center px-1">
                                    {i > 0 && <span className="absolute left-0 top-[14px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: i <= currentIdx || complete ? "#10b981" : "#e2e8f0" }} />}
                                    {i < steps.length - 1 && <span className="absolute right-0 top-[14px] h-0.5 w-1/2 -translate-y-1/2" style={{ backgroundColor: i < currentIdx || complete ? "#10b981" : "#e2e8f0" }} />}
                                    <Bubble done={isDone} current={isCurrent} inProgress={s.status === "in-progress"} />
                                    <span className="mt-2 line-clamp-2 max-w-[108px] text-center text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-500">{s.title}</span>
                                </div>
                            );
                        })}
                        {steps.length === 0 && <span className="text-xs text-slate-400">No steps in this workflow.</span>}
                    </div>
                </div>
            </div>

            {/* Footer: meta + actions */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Hired {a.invitedAt}</span>
                    <span>·</span>
                    <span>{daysAgo(parseMs(a.invitedAt))}d in onboarding</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" /> {done}/{total} steps</span>
                    {!complete && stepLabel && <><span>·</span><span className="text-slate-500">On: <span className="font-semibold text-slate-600">{stepLabel}</span></span></>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {!complete && <AskOrderMenu stepLabel={stepLabel} count={a.onboarding?.notes?.length ?? 0} onAction={onAction} />}
                    <Button variant="outline" size="sm" onClick={onOpen}>Open onboarding <ArrowRight className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    );
}

function Bubble({ done, current, inProgress }: { done: boolean; current: boolean; inProgress: boolean }) {
    if (done) return <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"><Check className="h-4 w-4" /></span>;
    if (current || inProgress) return <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm ring-4 ring-amber-100"><span className="h-2 w-2 rounded-full bg-white" /></span>;
    return <span className="z-10 h-7 w-7 rounded-full border-2 border-slate-200 bg-white" />;
}

// Ask / Order dropdown — context actions depend on the driver's current step.
function AskOrderMenu({ stepLabel, count, onAction }: { stepLabel: string; count: number; onAction: (kind: string, label: string) => void }) {
    const [open, setOpen] = useState(false);
    const lower = stepLabel.toLowerCase();
    const actions: { kind: string; label: string; Icon: React.ElementType }[] = [
        { kind: "ask", label: "Ask driver for more data", Icon: Send },
    ];
    if (/document|sign|quiz|report/.test(lower)) actions.push({ kind: "order", label: `Order ${stepLabel} report`, Icon: FileSearch });
    actions.push({ kind: "review", label: "Assign for review", Icon: BadgeCheck });
    actions.push({ kind: "remark", label: "Add a remark", Icon: MessageSquarePlus });

    return (
        <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>
                <MessageSquarePlus className="h-4 w-4" /> Ask / Order
                {count > 0 && <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">{count}</span>}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
            {open && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-30 mt-1 w-60 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">Actions · {stepLabel || "Step"}</p>
                        {actions.map((act) => (
                            <button key={act.kind} type="button" onClick={() => { onAction(act.kind, act.label); setOpen(false); }}
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
