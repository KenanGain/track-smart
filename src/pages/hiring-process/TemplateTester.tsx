import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, PartyPopper, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCompanyBranding } from "../ats/company-branding.data";
import { HiringFormView } from "./formRegistry";
import { stepName, stepGroup, type HiringTemplate } from "./hiring-templates.data";

const GROUP_TONE: Record<string, string> = { Core: "bg-blue-50 text-blue-600", Forms: "bg-emerald-50 text-emerald-600", Policy: "bg-violet-50 text-violet-600" };
const noop = () => {};

export function TemplateTester({ template, onBack }: { template: HiringTemplate; onBack: () => void }) {
    const [branding] = useCompanyBranding();
    const [stepIndex, setStepIndex] = useState(0);
    const [finished, setFinished] = useState(false);
    const accent = branding.accentColor;

    const steps = template.steps;
    const step = steps[stepIndex];
    const isLast = stepIndex === steps.length - 1;

    // ── Completion screen ───────────────────────────────────────────────────
    if (finished) {
        return (
            <div className="min-h-screen bg-slate-50">
                <TestBar onBack={onBack} />
                <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: accent }}><PartyPopper className="h-8 w-8" /></div>
                    <h1 className="mt-6 text-2xl font-bold text-slate-900">Application submitted</h1>
                    <p className="mt-2 text-sm text-slate-500">Thanks — {branding.name} has received your application. You completed {steps.length} steps.</p>
                    <div className="mt-6 w-full space-y-2 text-left">
                        {steps.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                                <CheckCircle2 className="h-4 w-4" style={{ color: accent }} />
                                <span className="font-medium text-slate-700">{s.title}</span>
                                <span className="ml-auto text-xs text-slate-400">{s.formIds.length} {s.formIds.length === 1 ? "form" : "forms"}</span>
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
    }

    // ── Wizard ──────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50">
            <TestBar onBack={onBack} />

            {/* Applicant portal header */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
                    {branding.logoDataUrl
                        ? <img src={branding.logoDataUrl} alt="" className="h-10 w-10 rounded-lg object-contain" />
                        : <div className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: accent }}>{branding.name.slice(0, 2).toUpperCase()}</div>}
                    <div>
                        <p className="font-semibold text-slate-900">{branding.name}</p>
                        <p className="text-xs text-slate-500">Driver Application · {template.name}</p>
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
                            <div key={s.id} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
                                <button type="button" onClick={() => setStepIndex(i)} title={s.title} className="flex flex-col items-center">
                                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition", !isCurrent && !isDone && "bg-slate-100 text-slate-400")} style={isCurrent || isDone ? { backgroundColor: accent, color: "#fff" } : undefined}>
                                        {isDone ? <Check className="h-4 w-4" /> : i + 1}
                                    </span>
                                </button>
                                {i < steps.length - 1 && <span className="mx-1 h-0.5 flex-1 rounded bg-slate-200" style={i < stepIndex ? { backgroundColor: accent } : undefined} />}
                            </div>
                        );
                    })}
                </div>

                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Step {stepIndex + 1} of {steps.length}</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{step.title}</h1>
                <p className="mt-1 text-sm text-slate-500">Fill in the {step.formIds.length === 1 ? "form" : `${step.formIds.length} forms`} below, then continue.</p>

                {/* Forms in this step — rendered inline as the applicant sees them */}
                <div className="mt-5 space-y-5">
                    {step.formIds.map((fid) => (
                        <div key={fid} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                            <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-3">
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", GROUP_TONE[stepGroup(fid)])}>{stepGroup(fid)}</span>
                                <h3 className="text-base font-semibold text-slate-900">{stepName(fid)}</h3>
                            </div>
                            <HiringFormView formId={fid} embedded onBack={noop} />
                        </div>
                    ))}
                </div>

                {/* Navigation */}
                <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0}><ChevronLeft className="h-4 w-4" /> Back</Button>
                    {isLast
                        ? <Button onClick={() => setFinished(true)} style={{ backgroundColor: accent }}>Submit application <Check className="h-4 w-4" /></Button>
                        : <Button onClick={() => { setStepIndex((i) => Math.min(steps.length - 1, i + 1)); window.scrollTo({ top: 0 }); }} style={{ backgroundColor: accent }}>Continue <ChevronRight className="h-4 w-4" /></Button>}
                </div>
            </div>
        </div>
    );
}

// Thin admin bar so the tester can exit back to the template list.
function TestBar({ onBack }: { onBack: () => void }) {
    return (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-800 px-6 py-2">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-200 hover:text-white"><ChevronLeft className="h-4 w-4" /> Exit preview</button>
            <span className="rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-bold text-amber-300">APPLICANT PREVIEW</span>
        </div>
    );
}
