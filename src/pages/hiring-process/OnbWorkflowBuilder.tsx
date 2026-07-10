import { useState } from "react";
import { ChevronLeft, Check, X, FileText, FileSignature, FilePlus2, ClipboardList, ListChecks, GraduationCap, KeyRound, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { policyDocuments } from "./policy-forms.data";
import { ONBOARDING_FORMS, ONB_DRIVER_TYPES, TRAINING_TYPES, useAccessoryChecklists, getOnbWorkflow, blankOnbWorkflow, type OnbWorkflow } from "./onboarding.data";
import { useDocTemplates } from "./document-templates.data";
import { useOnboardingQuizzes } from "./onboarding-quizzes.data";
import { useChecklists } from "./checklists.data";

const HIDDEN = new Set(["insurance-policy", "ctpat-cross-border-security", "drug-alcohol-policy-receipt"]);
type PoolItem = { id: string; label: string };

export function OnbWorkflowBuilder({ workflowId, onBack, onSave }: { workflowId: string; onBack: () => void; onSave: (w: OnbWorkflow) => void }) {
    const existing = workflowId !== "new" ? getOnbWorkflow(workflowId) : undefined;
    const [wf, setWf] = useState<OnbWorkflow>(existing ?? blankOnbWorkflow());
    const { templates } = useDocTemplates();
    const { quizzes } = useOnboardingQuizzes();
    const { checklists } = useChecklists();
    const { checklists: accessoryChecklists } = useAccessoryChecklists();

    const policyPool: PoolItem[] = policyDocuments().filter((d) => !HIDDEN.has(d.id)).map((d) => ({ id: d.id, label: `${d.title} ${d.accentTitle}` }));
    const formPool: PoolItem[] = ONBOARDING_FORMS.map((f) => ({ id: f.id, label: f.label }));
    const docPool: PoolItem[] = templates.map((t) => ({ id: t.id, label: t.name }));
    const quizPool: PoolItem[] = quizzes.map((q) => ({ id: q.id, label: q.title }));
    const trainingPool: PoolItem[] = TRAINING_TYPES.filter((t) => t.status === "active").map((t) => ({ id: t.id, label: `${t.name} · ${t.category}` }));
    const accessoryChecklistPool: PoolItem[] = accessoryChecklists.map((c) => ({ id: c.id, label: `${c.name} · ${c.items.length} item${c.items.length === 1 ? "" : "s"}` }));
    const checklistPool: PoolItem[] = checklists.map((c) => ({ id: c.id, label: c.name }));

    const set = (patch: Partial<OnbWorkflow>) => setWf((w) => ({ ...w, ...patch }));
    const canSave = wf.name.trim().length > 0;
    const save = () => { if (canSave) { onSave({ ...wf, name: wf.name.trim() }); onBack(); } };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Workflows</button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
                    <Button size="sm" onClick={save} disabled={!canSave}><Check className="h-4 w-4" /> Save workflow</Button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Hiring · Onboarding</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{workflowId === "new" ? "New Workflow" : "Edit Workflow"}</h1>
                    <p className="mt-1 text-sm text-slate-500">Every workflow runs its steps in order — the driver signs the forms and documents, passes the quiz, then a reviewer confirms the checklist.</p>
                </div>

                {/* Driver type */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Driver type</p>
                    <p className="mt-0.5 text-xs text-slate-400">Which drivers this onboarding workflow is for.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {ONB_DRIVER_TYPES.map((dt) => {
                            const on = wf.driverType === dt.id;
                            return (
                                <button key={dt.id} type="button" onClick={() => set({ driverType: dt.id })}
                                    className={cn("rounded-xl border px-3 py-2.5 text-left transition", on ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:bg-slate-50")}>
                                    <p className={cn("text-sm font-semibold", on ? "text-blue-700" : "text-slate-800")}>{dt.label}</p>
                                    <p className="text-[11px] text-slate-400">{dt.sub}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Name + description */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <label className="block text-xs font-semibold text-slate-500">Workflow name
                        <Input value={wf.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Standard Onboarding" className="mt-1" autoFocus />
                    </label>
                    <label className="block text-xs font-semibold text-slate-500">Description
                        <Input value={wf.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Short summary of this workflow" className="mt-1" />
                    </label>
                </div>

                {/* Steps section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Workflow steps</h2>
                        <p className="text-xs text-slate-500">Steps run top to bottom. Mirrors the Onboarding Setup tabs.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">7 steps</span>
                </div>

                <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p><span className="font-semibold">How this workflow runs.</span> A new hire completes each step in order — sign the policy forms, sign the onboarding forms, e-sign the PDF documents, pass the post-orientation quiz — then a reviewer confirms the final checklist. Each step maps to a tab in Onboarding Setup; attach the items it should collect below.</p>
                </div>

                <WorkflowStep n={1} Icon={FileSignature} title="Policy forms" desc="Company / FMCSA policy statements the driver reviews and signs." addTitle="Add a policy form"
                    attached={wf.policyForms} pool={policyPool} addLabel="Add a policy form…"
                    onAdd={(id) => set({ policyForms: [...wf.policyForms, id] })}
                    onRemove={(id) => set({ policyForms: wf.policyForms.filter((x) => x !== id) })} />
                <WorkflowStep n={2} Icon={FileText} title="Onboarding forms" desc="New-hire paperwork the driver completes and signs." addTitle="Add an onboarding form"
                    attached={wf.forms} pool={formPool} addLabel="Add an onboarding form…"
                    onAdd={(id) => set({ forms: [...wf.forms, id] })}
                    onRemove={(id) => set({ forms: wf.forms.filter((x) => x !== id) })} />
                <WorkflowStep n={3} Icon={FilePlus2} title="Documents & sign" desc="PDF signing templates you built in the Documents & sign tab." addTitle="Add a document template"
                    attached={wf.documents} pool={docPool} addLabel="Add a document template…"
                    emptyPoolHint="No document templates yet — create one in the Documents & sign tab."
                    onAdd={(id) => set({ documents: [...wf.documents, id] })}
                    onRemove={(id) => set({ documents: wf.documents.filter((x) => x !== id) })} />
                <WorkflowStep n={4} Icon={ClipboardList} title="Quizzes" desc="Post-orientation knowledge checks the driver must pass." addTitle="Add a quiz"
                    attached={wf.quizzes} pool={quizPool} addLabel="Add a quiz…"
                    onAdd={(id) => set({ quizzes: [...wf.quizzes, id] })}
                    onRemove={(id) => set({ quizzes: wf.quizzes.filter((x) => x !== id) })} />
                <WorkflowStep n={5} Icon={GraduationCap} title="Training" desc="Safety & compliance training courses the driver must complete." addTitle="Add a training course"
                    attached={wf.trainings} pool={trainingPool} addLabel="Add a training course…"
                    onAdd={(id) => set({ trainings: [...wf.trainings, id] })}
                    onRemove={(id) => set({ trainings: wf.trainings.filter((x) => x !== id) })} />
                <SelectStep n={6} Icon={KeyRound} title="Accessories hand-over" desc="Keys, devices & equipment issued to the driver, then verified by them."
                    attachLabel="Attach an accessory checklist" selectedLabel="checklist" value={wf.accessoryChecklistId} pool={accessoryChecklistPool}
                    emptyHint="No accessory checklists yet — create one in the Accessories tab." onChange={(id) => set({ accessoryChecklistId: id })} />
                <SelectStep n={7} Icon={ListChecks} title="Checklist" desc="Final review checklist to confirm onboarding is complete."
                    attachLabel="Attach a checklist" selectedLabel="checklist" value={wf.checklistId} pool={checklistPool}
                    emptyHint="No checklists yet — create one in the Checklist tab." onChange={(id) => set({ checklistId: id })} />

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button onClick={save} disabled={!canSave}><Check className="h-4 w-4" /> Save workflow</Button>
                </div>
            </div>
        </div>
    );
}

function StepHeader({ n, Icon, title, desc, badge }: { n: number; Icon: React.ElementType; title: string; desc: string; badge: string }) {
    return (
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{n}</span>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">{title}
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">Step {n} · Onboarding</span>
                </p>
                <p className="truncate text-xs text-slate-500">{desc}</p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{badge}</span>
        </div>
    );
}

function WorkflowStep({ n, Icon, title, desc, attached, pool, addLabel, addTitle, emptyPoolHint, onAdd, onRemove }: {
    n: number; Icon: React.ElementType; title: string; desc: string; attached: string[]; pool: PoolItem[]; addLabel: string; addTitle: string; emptyPoolHint?: string;
    onAdd: (id: string) => void; onRemove: (id: string) => void;
}) {
    const byId = new Map(pool.map((p) => [p.id, p.label]));
    const available = pool.filter((p) => !attached.includes(p.id));
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <StepHeader n={n} Icon={Icon} title={title} desc={desc} badge={`${attached.length} item${attached.length !== 1 ? "s" : ""}`} />
            <div className="space-y-2 p-5">
                {attached.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-4 text-center text-sm text-slate-400">Nothing attached yet.</p>}
                {attached.map((id, i) => (
                    <div key={id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">{i + 1}</span>
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{byId.get(id) ?? id}</span>
                        <button type="button" onClick={() => onRemove(id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                    </div>
                ))}
                {pool.length === 0 && emptyPoolHint
                    ? <p className="pt-1 text-xs text-slate-400">{emptyPoolHint}</p>
                    : <div className="pt-1">
                        <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{addTitle}</p>
                        <AddSelect options={available} placeholder={addLabel} onSelect={onAdd} />
                    </div>}
            </div>
        </div>
    );
}

// A step that attaches ONE item (a checklist) rather than a list — used for both
// the accessory checklist and the final review checklist.
function SelectStep({ n, Icon, title, desc, attachLabel, selectedLabel, emptyHint, value, pool, onChange }: {
    n: number; Icon: React.ElementType; title: string; desc: string; attachLabel: string; selectedLabel: string; emptyHint: string;
    value: string | null; pool: PoolItem[]; onChange: (id: string | null) => void;
}) {
    const selected = pool.find((p) => p.id === value);
    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <StepHeader n={n} Icon={Icon} title={title} desc={desc} badge={selected ? "1 selected" : "none"} />
            <div className="space-y-2 p-5">
                {selected ? (
                    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                        <Icon className="h-4 w-4 shrink-0 text-emerald-500" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{selected.label}</span>
                        <button type="button" onClick={() => onChange(null)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                    </div>
                ) : <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-4 text-center text-sm text-slate-400">No {selectedLabel} attached.</p>}
                <div className="pt-1">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{attachLabel}</p>
                    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        <option value="">{pool.length ? `Select a ${selectedLabel}…` : emptyHint}</option>
                        {pool.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}

function AddSelect({ options, placeholder, onSelect }: { options: PoolItem[]; placeholder: string; onSelect: (id: string) => void }) {
    return (
        <select value="" onChange={(e) => { if (e.target.value) onSelect(e.target.value); }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <option value="">{options.length ? placeholder : "All available items added"}</option>
            {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
    );
}
