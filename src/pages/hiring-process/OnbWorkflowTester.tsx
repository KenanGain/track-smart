import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check, PartyPopper, CheckCircle2, FileText, FileSignature, ClipboardList, ListChecks, GraduationCap, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PolicyForm } from "./PolicyForm";
import { policyDocuments } from "./policy-forms.data";
import { getOnboardingFormDef, getTrainingType, type OnbWorkflow } from "./onboarding.data";
import { getDocTemplate } from "./document-templates.data";
import { getOnboardingQuiz } from "./onboarding-quizzes.data";
import { useChecklists } from "./checklists.data";

const noop = () => {};
type StepKind = "policy" | "forms" | "documents" | "quizzes" | "training" | "checklist";
type WizStep = { key: string; title: string; kind: StepKind; ids: string[]; Icon: React.ElementType };

const resolveFormDef = (id: string) => getOnboardingFormDef(id) ?? policyDocuments().find((p) => p.id === id);

/**
 * OnbWorkflowTester — walks a saved onboarding workflow the way a newly-hired
 * driver would experience it: policy forms → onboarding forms → e-sign PDF
 * documents → quiz → final checklist. Read-only preview (nothing is saved).
 */
export function OnbWorkflowTester({ workflow, onBack }: { workflow: OnbWorkflow; onBack: () => void }) {
    const { checklists } = useChecklists();
    const steps = useMemo<WizStep[]>(() => {
        const s: WizStep[] = [];
        if (workflow.policyForms?.length) s.push({ key: "policy", title: "Policy forms", kind: "policy", ids: workflow.policyForms, Icon: FileSignature });
        if (workflow.forms.length) s.push({ key: "forms", title: "Onboarding forms", kind: "forms", ids: workflow.forms, Icon: FileText });
        if (workflow.documents.length) s.push({ key: "documents", title: "Documents & sign", kind: "documents", ids: workflow.documents, Icon: PenLine });
        if (workflow.quizzes.length) s.push({ key: "quizzes", title: "Post-orientation quiz", kind: "quizzes", ids: workflow.quizzes, Icon: ClipboardList });
        if (workflow.trainings?.length) s.push({ key: "training", title: "Training", kind: "training", ids: workflow.trainings, Icon: GraduationCap });
        if (workflow.checklistId) s.push({ key: "checklist", title: "Final checklist", kind: "checklist", ids: [workflow.checklistId], Icon: ListChecks });
        return s;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow]);

    const [stepIndex, setStepIndex] = useState(0);
    const [finished, setFinished] = useState(false);
    const step = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;

    if (steps.length === 0) return (
        <div className="min-h-screen bg-slate-50">
            <TestBar onBack={onBack} />
            <div className="mx-auto max-w-xl px-6 py-24 text-center">
                <h1 className="text-lg font-bold text-slate-900">Nothing to preview yet</h1>
                <p className="mt-2 text-sm text-slate-500">This workflow has no forms, documents, quizzes or checklist attached. Edit it to add items, then test again.</p>
                <Button className="mt-5" onClick={onBack}>Back to workflows</Button>
            </div>
        </div>
    );

    if (finished) return (
        <div className="min-h-screen bg-slate-50">
            <TestBar onBack={onBack} />
            <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white"><PartyPopper className="h-8 w-8" /></div>
                <h1 className="mt-6 text-2xl font-bold text-slate-900">Onboarding complete</h1>
                <p className="mt-2 text-sm text-slate-500">Preview finished — the driver completed {steps.length} step{steps.length === 1 ? "" : "s"} of “{workflow.name}”.</p>
                <div className="mt-6 w-full space-y-2 text-left">
                    {steps.map((s) => (
                        <div key={s.key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-slate-700">{s.title}</span>
                            <span className="ml-auto text-xs text-slate-400">{s.ids.length} item{s.ids.length === 1 ? "" : "s"}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex gap-3">
                    <Button variant="outline" onClick={() => { setFinished(false); setStepIndex(0); }}>Restart preview</Button>
                    <Button onClick={onBack}>Done</Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <TestBar onBack={onBack} />

            {/* Portal header */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">ON</div>
                    <div>
                        <p className="font-semibold text-slate-900">Driver Onboarding · {workflow.name}</p>
                        <p className="text-xs text-slate-500">What a newly-hired driver completes</p>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-2xl px-6 py-6">
                {/* Stepper */}
                <div className="mb-6 flex items-center">
                    {steps.map((s, i) => {
                        const isDone = i < stepIndex;
                        const isCurrent = i === stepIndex;
                        return (
                            <div key={s.key} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
                                <button type="button" onClick={() => setStepIndex(i)} title={s.title} className="flex flex-col items-center">
                                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition", isCurrent || isDone ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>
                                        {isDone ? <Check className="h-4 w-4" /> : i + 1}
                                    </span>
                                </button>
                                {i < steps.length - 1 && <span className={cn("mx-1 h-0.5 flex-1 rounded", i < stepIndex ? "bg-blue-600" : "bg-slate-200")} />}
                            </div>
                        );
                    })}
                </div>

                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Step {stepIndex + 1} of {steps.length}</p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900"><step.Icon className="h-6 w-6 text-blue-500" /> {step.title}</h1>

                <div className="mt-5 space-y-5">
                    {(step.kind === "policy" || step.kind === "forms") && step.ids.map((id) => {
                        const def = resolveFormDef(id);
                        return (
                            <div key={id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                                {def ? <PolicyForm def={def} embedded onBack={noop} />
                                    : <p className="text-sm text-slate-400">Form “{id}” not found.</p>}
                            </div>
                        );
                    })}

                    {step.kind === "documents" && step.ids.map((id) => {
                        const t = getDocTemplate(id);
                        const fields = t ? t.fields.filter((f) => !f.stampDataUrl).length : 0;
                        return (
                            <div key={id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><PenLine className="h-5 w-5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">{t?.name ?? id}</p>
                                    <p className="truncate text-sm text-slate-500">PDF · {t?.documents.length ?? 0} document{(t?.documents.length ?? 0) === 1 ? "" : "s"} · {fields} field{fields === 1 ? "" : "s"} to e-sign</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">e-sign</span>
                            </div>
                        );
                    })}

                    {step.kind === "quizzes" && step.ids.map((id) => {
                        const qz = getOnboardingQuiz(id);
                        return (
                            <div key={id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ClipboardList className="h-5 w-5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">{qz?.title ?? id}</p>
                                    <p className="truncate text-sm text-slate-500">{qz ? `${qz.questions.length}-question test · pass ${qz.passPct}%` : "Quiz not found"}</p>
                                </div>
                            </div>
                        );
                    })}

                    {step.kind === "training" && step.ids.map((id) => {
                        const t = getTrainingType(id);
                        return (
                            <div key={id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><GraduationCap className="h-5 w-5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">{t?.name ?? id}</p>
                                    <p className="truncate text-sm text-slate-500">{t ? `${t.category} · due in ${t.defaultDueDays} days` : "Training not found"}</p>
                                </div>
                                {t?.defaultMandatory && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600">Mandatory</span>}
                            </div>
                        );
                    })}

                    {step.kind === "checklist" && step.ids.map((id) => {
                        const c = checklists.find((x) => x.id === id);
                        return (
                            <div key={id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ListChecks className="h-5 w-5" /></span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold text-slate-900">{c?.name ?? id}</p>
                                    <p className="truncate text-sm text-slate-500">Reviewer confirms this checklist to complete onboarding.</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Navigation */}
                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}><ChevronLeft className="h-4 w-4" /> Back</Button>
                    {isLast
                        ? <Button onClick={() => setFinished(true)}>Finish preview <Check className="h-4 w-4" /></Button>
                        : <Button onClick={() => { setStepIndex((i) => Math.min(steps.length - 1, i + 1)); window.scrollTo({ top: 0 }); }}>Continue <ChevronRight className="h-4 w-4" /></Button>}
                </div>
            </div>
        </div>
    );
}

function TestBar({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-800 px-6 py-2">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white"><ChevronLeft className="h-4 w-4" /> Exit preview</button>
            <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300">DRIVER PREVIEW</span>
        </div>
    );
}
