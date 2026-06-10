import { useState } from "react";
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Check, X, Lock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectBox } from "./FormKit";
import { useHiringTemplates, STEP_CATALOG, stepName, stepGroup, makeAppStep, makeReviewStep, APP_STEP_TITLE, REVIEW_STEP_TITLE, DRIVER_TYPES, driverTypeName, type TemplateStep, type HiringTemplate, type DriverType } from "./hiring-templates.data";
import { useChecklists, checklistForDriverType } from "./checklists.data";

const GROUP_TONE: Record<string, string> = { Core: "bg-blue-50 text-blue-600", Forms: "bg-emerald-50 text-emerald-600", Policy: "bg-violet-50 text-violet-600" };
// Pickers: step 1 (Application) only takes consent forms; later steps take any form except the application itself.
const CONSENT_NAMES = STEP_CATALOG.filter((c) => c.group === "Policy").map((c) => c.name);
const STEP_NAMES = STEP_CATALOG.filter((c) => c.id !== "application").map((c) => c.name);
const idForName = (name: string) => STEP_CATALOG.find((c) => c.name === name)?.id ?? "";

let counter = 0;
const newStepId = () => `s-${Date.now()}-${counter++}`;

// Ensure the Application step is always first and the Review step always last.
function normalize(steps: TemplateStep[]): TemplateStep[] {
    const app = steps.find((s) => s.kind === "app" || s.formIds.includes("application")) ?? makeAppStep(`s-${Date.now()}a`);
    const review = steps.find((s) => s !== app && (s.kind === "review" || s.formIds.includes("review"))) ?? makeReviewStep(`s-${Date.now()}r`);
    const middle = steps.filter((s) => s !== app && s !== review);
    const appStep: TemplateStep = { ...app, title: APP_STEP_TITLE, locked: true, kind: "app", formIds: ["application", ...app.formIds.filter((f) => f !== "application")] };
    const reviewStep: TemplateStep = { ...review, title: REVIEW_STEP_TITLE, locked: true, kind: "review", formIds: ["review", ...review.formIds.filter((f) => f !== "review")] };
    return [appStep, ...middle, reviewStep];
}

// A fresh template seeds the standard required steps in order.
function seedSteps(): TemplateStep[] {
    return normalize([
        makeAppStep(newStepId()),
        { id: newStepId(), title: "License Details", formIds: ["driver-license"] },
        { id: newStepId(), title: "Employment Verification", formIds: ["dot-verification"] },
        makeReviewStep(newStepId()),
    ]);
}

export function TemplateBuilder({ templateId, onBack }: { templateId: string; onBack: () => void }) {
    const { templates, save } = useHiringTemplates();
    const { checklists } = useChecklists();
    const existing = templateId === "new" ? undefined : templates.find((t) => t.id === templateId);

    const [name, setName] = useState(existing?.name ?? "");
    const [description, setDescription] = useState(existing?.description ?? "");
    const [driverType, setDriverType] = useState<DriverType>(existing?.driverType ?? "us");
    const [checklistId, setChecklistId] = useState<string>(existing?.checklistId ?? checklistForDriverType[existing?.driverType ?? "us"] ?? (checklists[0]?.id ?? ""));
    const [steps, setSteps] = useState<TemplateStep[]>(() => existing ? normalize(existing.steps) : seedSteps());
    const [error, setError] = useState("");

    const patchStep = (id: string, patch: Partial<TemplateStep>) => setSteps((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    // Insert new steps before the final Review step.
    const addStep = () => setSteps((l) => { const next = [...l]; next.splice(l.length - 1, 0, { id: newStepId(), title: `Step ${l.length - 1}`, formIds: [] }); return next; });
    const removeStep = (id: string) => setSteps((l) => l.filter((s) => s.id !== id || s.locked));
    const moveStep = (i: number, dir: -1 | 1) => setSteps((l) => {
        const j = i + dir;
        if (l[i].locked || j < 1 || j > l.length - 2) return l;   // Application stays first, Review stays last
        const next = [...l];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });
    const addForm = (stepId: string, refId: string) => { if (refId) setSteps((l) => l.map((s) => (s.id === stepId && !s.formIds.includes(refId) ? { ...s, formIds: [...s.formIds, refId] } : s))); };
    const removeForm = (stepId: string, refId: string) => { if (refId === "application" || refId === "review") return; setSteps((l) => l.map((s) => (s.id === stepId ? { ...s, formIds: s.formIds.filter((f) => f !== refId) } : s))); };

    const onSave = () => {
        if (!name.trim()) { setError("Give the template a name."); return; }
        const clean = normalize(steps).filter((s) => s.locked || s.formIds.length > 0);
        if (clean.length < 3) { setError("Add at least one step between the application and the review."); return; }
        const tpl: HiringTemplate = { id: existing?.id ?? `tpl-${Date.now()}`, name: name.trim(), description: description.trim(), locked: existing?.locked, driverType, checklistId: checklistId || undefined, steps: clean };
        save(tpl);
        onBack();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Templates</button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
                    <Button size="sm" onClick={onSave}><Check className="h-4 w-4" /> Save template</Button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Template</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{templateId === "new" ? "New Template" : "Edit Template"}</h1>
                    <p className="mt-1 text-sm text-slate-500">Every template starts with the application and ends with the manager review. Add the hiring steps in between.</p>
                </div>

                {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

                {/* Driver type → application form */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Driver type</p>
                    <p className="mb-3 mt-0.5 text-xs text-slate-400">Determines the application form drivers complete in step 1, and is carried into the later forms.</p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {DRIVER_TYPES.map((d) => (
                            <button key={d.id} type="button" onClick={() => { setDriverType(d.id); setChecklistId(checklistForDriverType[d.id] ?? checklistId); }}
                                className={cn("rounded-xl border p-3 text-left transition", driverType === d.id ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:border-slate-300")}>
                                <span className={cn("block text-sm font-semibold", driverType === d.id ? "text-blue-700" : "text-slate-800")}>{d.name}</span>
                                <span className="text-[11px] text-slate-400">{d.region}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Template Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. US Driver" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Description</label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary of when to use this template" />
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                    {steps.map((s, i) => {
                        const isApp = s.kind === "app";
                        const isReview = s.kind === "review";
                        const isLocked = isApp || isReview;
                        const lockTone = isReview ? "border-indigo-200 ring-1 ring-indigo-100" : "border-blue-200 ring-1 ring-blue-100";
                        return (
                            <div key={s.id} className={cn("rounded-xl border bg-white p-5 shadow-sm", isLocked ? lockTone : "border-slate-200")}>
                                <div className="mb-4 flex items-center gap-2">
                                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white", isReview ? "bg-indigo-600" : "bg-blue-600")}>{i + 1}</span>
                                    {isLocked ? (
                                        <span className="flex flex-1 flex-wrap items-center gap-2 font-semibold text-slate-900">{s.title}
                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"><Lock className="h-2.5 w-2.5" /> {isApp ? `Step 1 · ${driverTypeName(driverType)}` : "Final step"}</span>
                                        </span>
                                    ) : (
                                        <Input value={s.title} onChange={(e) => patchStep(s.id, { title: e.target.value })} placeholder="Step title" className="h-9 flex-1 font-semibold" />
                                    )}
                                    {!isLocked && <>
                                        <button type="button" onClick={() => moveStep(i, -1)} disabled={i <= 1} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => moveStep(i, 1)} disabled={i >= steps.length - 2} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                                        <button type="button" onClick={() => removeStep(s.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                    </>}
                                </div>

                                {isApp && <p className="mb-3 -mt-1 text-xs text-slate-400">The driver completes the application form for the selected driver type. Add the consent forms they sign alongside it.</p>}
                                {isReview && <p className="mb-3 -mt-1 text-xs text-slate-400">The hiring manager reviews the completed file and finalizes the hire. Always the last step.</p>}
                                {isReview && (
                                    <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-indigo-600">Approval Checklist</label>
                                        <div className="max-w-sm"><SelectBox value={checklists.find((c) => c.id === checklistId)?.name ?? ""} placeholder="Select a checklist" items={checklists.map((c) => c.name)} onChange={(nm) => setChecklistId(checklists.find((c) => c.name === nm)?.id ?? "")} /></div>
                                        <p className="mt-1.5 text-xs text-slate-500">This staged checklist is shown on the Review &amp; Completion step of the hiring file. Create more in the <span className="font-semibold">Checklists</span> tab.</p>
                                    </div>
                                )}

                                {/* Forms in this step */}
                                {s.formIds.length > 0 && (
                                    <div className="mb-3 flex flex-wrap gap-2">
                                        {s.formIds.map((fid) => {
                                            const fixed = fid === "application" || fid === "review";
                                            const label = fid === "application" ? `${driverTypeName(driverType)} Application` : fid === "review" ? "Manager Review" : stepName(fid);
                                            return (
                                                <span key={fid} className={cn("inline-flex items-center gap-1.5 rounded-lg border py-1 pl-2.5 pr-1.5 text-[13px] font-medium", fid === "review" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : fixed ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-700")}>
                                                    {fixed ? <FileText className="h-3.5 w-3.5" /> : <span className={cn("rounded-full px-1.5 py-0.5 text-[9px] font-bold", GROUP_TONE[stepGroup(fid)])}>{stepGroup(fid)[0]}</span>}
                                                    {label}
                                                    {!fixed && <button type="button" onClick={() => removeForm(s.id, fid)} className="ml-0.5 flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-rose-100 hover:text-rose-500"><X className="h-3 w-3" /></button>}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add a form to this step */}
                                <div className="max-w-xs">
                                    <SelectBox value="" placeholder={isApp ? "+ Add a consent form…" : "+ Add a form to this step…"} items={isApp ? CONSENT_NAMES : STEP_NAMES} onChange={(nm) => addForm(s.id, idForName(nm))} />
                                </div>
                            </div>
                        );
                    })}

                    <button type="button" onClick={addStep} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Step</button>
                </div>
            </div>
        </div>
    );
}
