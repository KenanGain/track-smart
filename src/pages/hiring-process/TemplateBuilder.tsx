import { useState } from "react";
import { ChevronLeft, Plus, Trash2, ArrowUp, ArrowDown, Check, X, Lock, FileText, ClipboardList, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectBox } from "./FormKit";
import { useHiringTemplates, STEP_CATALOG, stepName, stepGroup, stepFormMode, FULFILL_META, makeAppStep, makeReviewStep, APP_STEP_TITLE, REVIEW_STEP_TITLE, DRIVER_TYPES, driverTypeName, type TemplateStep, type HiringTemplate, type DriverType, type FulfillMode, type QuizPick } from "./hiring-templates.data";
import { useChecklists, checklistForDriverType } from "./checklists.data";
import { useQuizzes, TEST_LENGTHS, testLength, QUIZ_CATEGORIES, type Quiz } from "./quizzes.data";

const GROUP_TONE: Record<string, string> = { Core: "bg-blue-50 text-blue-600", Forms: "bg-emerald-50 text-emerald-600", Policy: "bg-violet-50 text-violet-600" };
// Pickers: step 1 (Application) only takes consent forms; later steps take any form except the application itself.
const CONSENT_NAMES = STEP_CATALOG.filter((c) => c.group === "Policy").map((c) => c.name);
const STEP_NAMES = STEP_CATALOG.filter((c) => c.id !== "application").map((c) => c.name);
const idForName = (name: string) => STEP_CATALOG.find((c) => c.name === name)?.id ?? "";

// A plain-language summary of what a step does — shown under each step so it is
// clear "what's going on" at every stage of the workflow.
function stepPurpose(s: TemplateStep): string {
    if (s.kind === "app") return "The driver fills out the application and signs the consent forms attached here. Always the first step.";
    if (s.kind === "review") return "The hiring manager reviews the completed file against the approval checklist and finalizes the hire. Always the last step.";
    const ids = s.formIds;
    if (ids.length === 0) return "Empty step — add the forms, reports, tests or quizzes this step should collect.";
    if (ids.includes("quiz")) return "Assign knowledge tests (quizzes) to the driver — multiple-choice, scored automatically, then HR reviews the results.";
    if (ids.includes("road-test")) return "Assign an examiner and record the driver's road-test evaluation (or accept an equivalent).";
    const reports = ids.filter((f) => stepGroup(f) === "Forms");
    const policies = ids.filter((f) => stepGroup(f) === "Policy");
    const parts: string[] = [];
    if (reports.length) parts.push(`collects ${reports.map(stepName).join(", ")}`);
    if (policies.length) parts.push(`the driver signs ${policies.map(stepName).join(", ")}`);
    return `This step ${parts.join("; ")}.`;
}

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

// Knowledge Test step editor — pick quizzes CATEGORY-WISE and set each test's
// length (10/20/25/30/40 or All). Writes the step's attached `quizzes` (QuizPick[]).
function QuizAttachEditor({ quizzes, picks, onAdd, onRemove, onCount }: {
    quizzes: Quiz[]; picks: QuizPick[];
    onAdd: (quizId: string, count: number) => void;
    onRemove: (quizId: string) => void;
    onCount: (quizId: string, count: number) => void;
}) {
    const picked = new Map(picks.map((p) => [p.quizId, p.count]));
    const order = [...QUIZ_CATEGORIES] as string[];
    const cats = Array.from(new Set(quizzes.map((x) => x.category)))
        .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    const firstSel = cats.find((c) => quizzes.some((q) => q.category === c && picked.has(q.id)));
    const [open, setOpen] = useState<string | null>(firstSel ?? cats[0] ?? null);
    return (
        <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50/50 p-3">
            <div className="mb-1.5 flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-sky-600" />
                <span className="text-[11px] font-bold uppercase tracking-wide text-sky-700">Knowledge test — select quizzes</span>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-sky-600">{picks.length} selected</span>
            </div>
            <p className="mb-2 text-xs text-slate-500">Pick quizzes by category and set how many questions each test draws (10–40). These are assigned to the driver by default at this step.</p>
            <div className="space-y-1.5">
                {cats.map((cat) => {
                    const list = quizzes.filter((x) => x.category === cat);
                    const sel = list.filter((q) => picked.has(q.id)).length;
                    const expanded = open === cat;
                    return (
                        <div key={cat} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                            <button type="button" onClick={() => setOpen(expanded ? null : cat)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-50">
                                <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", expanded ? "" : "-rotate-90")} />
                                <span className="text-[13px] font-semibold text-slate-700">{cat}</span>
                                <span className="ml-auto flex items-center gap-1.5">
                                    {sel > 0 && <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">{sel} selected</span>}
                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">{list.length}</span>
                                </span>
                            </button>
                            {expanded && (
                                <div className="space-y-1.5 border-t border-slate-100 p-2">
                                    {list.map((qz) => {
                                        const on = picked.has(qz.id);
                                        return (
                                            <div key={qz.id} className={cn("flex items-center gap-2 rounded-md border px-2.5 py-1.5", on ? "border-sky-400 bg-sky-50/70" : "border-slate-200 bg-white")}>
                                                <button type="button" onClick={() => (on ? onRemove(qz.id) : onAdd(qz.id, Math.min(20, qz.questions.length)))} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                                                    <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-sky-600 bg-sky-600 text-white" : "border-slate-300 bg-white text-transparent")}><Check className="h-3 w-3" /></span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[13px] font-medium text-slate-700">{qz.title}</span>
                                                        <span className="block truncate text-[11px] text-slate-400">{qz.questions.length} questions available · pass {qz.passPct}%</span>
                                                    </span>
                                                </button>
                                                {on && (
                                                    <label className="flex shrink-0 items-center gap-1 text-[10px] font-medium text-slate-400">Length
                                                        <select value={testLength(qz, picked.get(qz.id))} onChange={(e) => onCount(qz.id, Number(e.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                                                            {TEST_LENGTHS.filter((n) => n < qz.questions.length).map((n) => <option key={n} value={n}>{n} Q</option>)}
                                                            <option value={qz.questions.length}>All ({qz.questions.length})</option>
                                                        </select>
                                                    </label>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function TemplateBuilder({ templateId, carrierId, onBack }: { templateId: string; carrierId?: string; onBack: () => void }) {
    const { templates, save } = useHiringTemplates(carrierId);
    const { checklists } = useChecklists();
    const { quizzes } = useQuizzes();
    const existing = templateId === "new" ? undefined : templates.find((t) => t.id === templateId);

    const [name, setName] = useState(existing?.name ?? "");
    const [description, setDescription] = useState(existing?.description ?? "");
    const [driverType, setDriverType] = useState<DriverType>(existing?.driverType ?? "us");
    const [checklistId, setChecklistId] = useState<string>(existing?.checklistId ?? checklistForDriverType[existing?.driverType ?? "us"] ?? (checklists[0]?.id ?? ""));
    const [steps, setSteps] = useState<TemplateStep[]>(() => existing ? normalize(existing.steps) : seedSteps());
    const [error, setError] = useState("");

    const patchStep = (id: string, patch: Partial<TemplateStep>) => setSteps((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    // Insert new steps before the final Review step.
    const addStep = () => setSteps((l) => { const next = [...l]; next.splice(l.length - 1, 0, { id: newStepId(), title: `Check Module ${l.length - 1}`, formIds: [] }); return next; });
    const removeStep = (id: string) => setSteps((l) => l.filter((s) => s.id !== id || s.locked));
    const moveStep = (i: number, dir: -1 | 1) => setSteps((l) => {
        const j = i + dir;
        if (l[i].locked || j < 1 || j > l.length - 2) return l;   // Application stays first, Review stays last
        const next = [...l];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
    });
    const addForm = (stepId: string, refId: string) => { if (refId) setSteps((l) => l.map((s) => (s.id === stepId && !s.formIds.includes(refId) ? { ...s, formIds: [...s.formIds, refId] } : s))); };
    const removeForm = (stepId: string, refId: string) => { if (refId === "application" || refId === "review") return; setSteps((l) => l.map((s) => { if (s.id !== stepId) return s; const fm = { ...(s.formModes ?? {}) }; delete fm[refId]; return { ...s, formIds: s.formIds.filter((f) => f !== refId), formModes: fm }; })); };
    const setFormMode = (stepId: string, fid: string, mode: FulfillMode) => setSteps((l) => l.map((s) => (s.id === stepId ? { ...s, formModes: { ...(s.formModes ?? {}), [fid]: mode } } : s)));
    // Quizzes attached to a Knowledge Test step (formId "quiz") — the default test.
    const setStepQuizzes = (stepId: string, fn: (q: QuizPick[]) => QuizPick[]) => setSteps((l) => l.map((s) => (s.id === stepId ? { ...s, quizzes: fn(s.quizzes ?? []) } : s)));
    const addQuiz = (stepId: string, quizId: string, count: number) => { if (quizId) setStepQuizzes(stepId, (q) => (q.some((x) => x.quizId === quizId) ? q : [...q, { quizId, count }])); };
    const removeQuiz = (stepId: string, quizId: string) => setStepQuizzes(stepId, (q) => q.filter((x) => x.quizId !== quizId));
    const setQuizCount = (stepId: string, quizId: string, count: number) => setStepQuizzes(stepId, (q) => q.map((x) => (x.quizId === quizId ? { ...x, count } : x)));

    const onSave = () => {
        if (!name.trim()) { setError("Give the workflow a name."); return; }
        const clean = normalize(steps).filter((s) => s.locked || s.formIds.length > 0);
        if (clean.length < 3) { setError("Add at least one check module between the application and the review."); return; }
        const tpl: HiringTemplate = { id: existing?.id ?? `tpl-${Date.now()}`, name: name.trim(), description: description.trim(), locked: existing?.locked, driverType, checklistId: checklistId || undefined, carrierId: existing?.carrierId ?? carrierId, steps: clean };
        save(tpl);
        onBack();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Workflows</button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
                    <Button size="sm" onClick={onSave}><Check className="h-4 w-4" /> Save workflow</Button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Workflow</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{templateId === "new" ? "New Workflow" : "Edit Workflow"}</h1>
                    <p className="mt-1 text-sm text-slate-500">Every workflow starts with the application and ends with the manager review. Add the check modules in between — License Check, Employment Check, and more.</p>
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
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Workflow Name</label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. US Driver" />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Description</label>
                        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary of when to use this workflow" />
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="text-sm font-bold text-slate-800">Workflow steps</h2>
                            <p className="text-xs text-slate-500">Steps run top to bottom. {steps.length} step{steps.length === 1 ? "" : "s"} total.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{steps.length} steps</span>
                    </div>
                    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-slate-600">
                        <p className="mb-1 font-semibold text-slate-700">How this workflow runs</p>
                        <span className="font-semibold text-slate-700">Step 1</span> is always the driver's application and the <span className="font-semibold text-slate-700">last step</span> is the manager review — these are locked. Add your own check modules in between (reports, background &amp; testing, road test, knowledge test, …). Use the <ArrowUp className="inline h-3 w-3" /> / <ArrowDown className="inline h-3 w-3" /> arrows to reorder a step and the <Trash2 className="inline h-3 w-3" /> icon to remove it. Inside each step, attach the forms, reports, tests or quizzes it should collect.
                    </div>
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
                                        <Input value={s.title} onChange={(e) => patchStep(s.id, { title: e.target.value })} placeholder="Module name — e.g. License Check" className="h-9 flex-1 font-semibold" />
                                    )}
                                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{s.formIds.length} {s.formIds.length === 1 ? "item" : "items"}</span>
                                    {!isLocked && <>
                                        <button type="button" title="Move step up" onClick={() => moveStep(i, -1)} disabled={i <= 1} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                                        <button type="button" title="Move step down" onClick={() => moveStep(i, 1)} disabled={i >= steps.length - 2} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                                        <button type="button" title="Remove this step" onClick={() => removeStep(s.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                                    </>}
                                    {isLocked && <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-400"><Lock className="h-2.5 w-2.5" /> Locked</span>}
                                </div>

                                <p className="mb-3 -mt-1 text-xs text-slate-500">{stepPurpose(s)}</p>
                                {isReview && (
                                    <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
                                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-indigo-600">Approval Checklist</label>
                                        <div className="max-w-sm"><SelectBox value={checklists.find((c) => c.id === checklistId)?.name ?? ""} placeholder="Select a checklist" items={checklists.map((c) => c.name)} onChange={(nm) => setChecklistId(checklists.find((c) => c.name === nm)?.id ?? "")} /></div>
                                        <p className="mt-1.5 text-xs text-slate-500">This staged checklist is shown on the Review &amp; Completion step of the hiring file. Create more in the <span className="font-semibold">Checklists</span> tab.</p>
                                    </div>
                                )}

                                {/* Forms in this step — each non-policy form picks how it's fulfilled. */}
                                {s.formIds.length > 0 && (
                                    <div className="mb-3 space-y-2">
                                        {s.formIds.map((fid) => {
                                            const fixed = fid === "application" || fid === "review";
                                            const label = fid === "application" ? `${driverTypeName(driverType)} Application` : fid === "review" ? "Manager Review" : stepName(fid);
                                            const showMode = !fixed && stepGroup(fid) !== "Policy";
                                            return (
                                                <div key={fid} className={cn("flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium", fid === "review" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : fixed ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700")}>
                                                    {fixed ? <FileText className="h-3.5 w-3.5 shrink-0 text-blue-600" /> : <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold", GROUP_TONE[stepGroup(fid)])}>{stepGroup(fid)[0]}</span>}
                                                    <span className="min-w-0 truncate">{label}</span>
                                                    {showMode && (
                                                        <select
                                                            value={stepFormMode(s, fid)}
                                                            onChange={(e) => setFormMode(s.id, fid, e.target.value as FulfillMode)}
                                                            className="ml-auto shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12px] font-semibold text-slate-600 focus:border-blue-400 focus:outline-none"
                                                        >
                                                            {(Object.keys(FULFILL_META) as FulfillMode[]).map((m) => <option key={m} value={m}>{FULFILL_META[m].label}</option>)}
                                                        </select>
                                                    )}
                                                    {!fixed && <button type="button" onClick={() => removeForm(s.id, fid)} className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-100 hover:text-rose-500", !showMode && "ml-auto")}><X className="h-3 w-3" /></button>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Knowledge Test step — pick quizzes category-wise + set each test length. */}
                                {s.formIds.includes("quiz") && (
                                    <QuizAttachEditor quizzes={quizzes} picks={s.quizzes ?? []}
                                        onAdd={(id, c) => addQuiz(s.id, id, c)} onRemove={(id) => removeQuiz(s.id, id)} onCount={(id, c) => setQuizCount(s.id, id, c)} />
                                )}

                                {/* Add a form to this step */}
                                <div className="max-w-sm">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{isApp ? "Add a consent form" : "Add to this step"}</p>
                                    <SelectBox value="" placeholder={isApp ? "+ Add a consent form the driver signs…" : "+ Add a form, report, test or check…"} items={isApp ? CONSENT_NAMES : STEP_NAMES} onChange={(nm) => addForm(s.id, idForName(nm))} />
                                </div>
                            </div>
                        );
                    })}

                    <button type="button" onClick={addStep} className="flex w-full flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-blue-600 transition hover:bg-blue-50">
                        <span className="flex items-center gap-2 text-sm font-semibold"><Plus className="h-4 w-4" /> Add a step</span>
                        <span className="text-[11px] font-normal text-blue-400">Inserts a new check module before the manager review</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
