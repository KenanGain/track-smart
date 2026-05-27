import { useMemo, useState } from "react";
import {
    LayoutTemplate, Plus, Trash2, ChevronDown, ChevronRight, FileText,
    ArrowUp, ArrowDown, Lock, Search, Check, GripVertical, PlayCircle,
    Pencil, Link2, ShieldCheck, Layers, FileEdit, ClipboardCheck, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    loadTemplates, saveTemplates, newTemplate, newStep,
    TEMPLATE_FORM_TYPES,
    type DriverHiringTemplate, type TemplateStep, type TemplateFormType, type StepKind,
} from "./driver-hiring-templates.data";
import {
    loadApplicationForms, type ApplicationFormDef,
} from "@/pages/ats/application-forms.data";
import { CONSENT_FORMS, type ConsentForm } from "@/pages/ats/consent-forms.data";
import { PageHeader } from "./docu-form/PageHeader";
import { StatStrip } from "./docu-form/StatStrip";
import { EmptyState } from "./docu-form/EmptyState";
import { TemplateTestRunner } from "./TemplateTestRunner";

/** Resolve a step's display name (label override, else linked form/consent name). */
function resolveStepName(step: TemplateStep, form?: ApplicationFormDef, consent?: ConsentForm): string {
    if (step.label?.trim()) return step.label;
    if (consent) return consent.title;
    if (form) return form.name;
    return 'Untitled step';
}

interface TemplateStats {
    totalSteps: number;
    requiredSteps: number;
    forms: number;
    consents: number;
    consentsRequiringSignature: number;
    fields: number;
    documents: number;
}

function computeStats(
    template: DriverHiringTemplate,
    formById: Map<string, ApplicationFormDef>,
    consentById: Map<string, ConsentForm>,
): TemplateStats {
    let forms = 0, consents = 0, consentsRequiringSignature = 0, fields = 0, documents = 0;
    for (const s of template.steps) {
        const kind = s.kind ?? 'form';
        if (kind === 'consent') {
            consents += 1;
            const c = consentById.get(s.formId);
            if (c?.requiresSignature) consentsRequiringSignature += 1;
        } else {
            forms += 1;
            const f = formById.get(s.formId);
            if (f) {
                fields += f.fields.length;
                documents += f.documents.length;
                // Inline document fields also count
                documents += f.fields.filter(fld => fld.type === 'document').length;
            }
        }
    }
    return {
        totalSteps: template.steps.length,
        requiredSteps: template.steps.filter(s => s.required).length,
        forms,
        consents,
        consentsRequiringSignature,
        fields,
        documents,
    };
}

/** Small stat card used in the template's expanded body. */
function StatCard({ icon: Icon, value, label, sub, tone = 'default' }: {
    icon: typeof Layers;
    value: React.ReactNode;
    label: string;
    sub?: string;
    tone?: 'default' | 'blue' | 'amber' | 'emerald' | 'violet' | 'slate';
}) {
    const tones: Record<NonNullable<typeof tone>, { bg: string; text: string }> = {
        default: { bg: 'bg-slate-50',    text: 'text-slate-500' },
        blue:    { bg: 'bg-blue-50',     text: 'text-blue-600'  },
        amber:   { bg: 'bg-amber-50',    text: 'text-amber-700' },
        emerald: { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
        violet:  { bg: 'bg-violet-50',   text: 'text-violet-700' },
        slate:   { bg: 'bg-slate-100',   text: 'text-slate-600' },
    };
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-2">
                <span className="text-2xl font-bold text-slate-900">{value}</span>
                <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", tones[tone].bg, tones[tone].text)}>
                    <Icon size={14} />
                </span>
            </div>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {label}
            </p>
            {sub && <p className="mt-0.5 text-[11px] text-slate-400">{sub}</p>}
        </div>
    );
}

function TemplateStatGrid({ stats, updatedAt }: { stats: TemplateStats; updatedAt: string }) {
    return (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
                icon={Layers}
                value={`${stats.requiredSteps}/${stats.totalSteps}`}
                label="Steps required"
                sub={`${stats.totalSteps} step${stats.totalSteps === 1 ? '' : 's'} total`}
                tone="blue"
            />
            <StatCard
                icon={FileEdit}
                value={stats.forms}
                label="Application forms"
                sub={stats.forms > 0 ? `${stats.fields} field${stats.fields === 1 ? '' : 's'}` : 'none yet'}
                tone="blue"
            />
            <StatCard
                icon={ShieldCheck}
                value={stats.consents}
                label="Consents"
                sub={stats.consents > 0
                    ? `${stats.consentsRequiringSignature} require signature`
                    : 'none yet'}
                tone="amber"
            />
            <StatCard
                icon={ClipboardCheck}
                value={stats.documents}
                label="Documents"
                sub={stats.documents > 0 ? 'across linked forms' : 'none yet'}
                tone="violet"
            />
            <StatCard
                icon={FileText}
                value={stats.fields}
                label="Total fields"
                sub="across all forms"
                tone="slate"
            />
            <StatCard
                icon={Calendar}
                value={<span className="text-sm font-bold text-slate-900">{updatedAt}</span>}
                label="Last updated"
                sub="Account Admin"
                tone="emerald"
            />
        </div>
    );
}

/**
 * Templates (Settings) — driver hiring templates.
 *
 * A template chains Application Forms together as ordered steps. Each step
 * references a form in the Application Forms library (Docu/Form Generator).
 * Admin can add/edit/delete templates, add/remove/reorder steps, and override
 * the per-step label and required flag.
 */

/** Tabbed dialog to pick one or more steps to add — Application Forms or Consent Forms. */
function StepPicker({ forms, consents, alreadyAdded, onPick, onClose }: {
    forms: ApplicationFormDef[];
    consents: ConsentForm[];
    /** Already-added IDs across both kinds — keyed as `${kind}:${id}`. */
    alreadyAdded: Set<string>;
    onPick: (picks: { kind: StepKind; id: string }[]) => void;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<StepKind>('form');
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set()); // keyed `${kind}:${id}`

    const q = query.trim().toLowerCase();
    const filteredForms = forms.filter(f =>
        !q || f.name.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q));
    const filteredConsents = consents.filter(c =>
        !q || c.title.toLowerCase().includes(q) || (c.subtitle ?? "").toLowerCase().includes(q));

    const toggle = (key: string) => setSelected(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    });

    const confirm = () => {
        const picks: { kind: StepKind; id: string }[] = [];
        for (const key of selected) {
            const [kind, id] = key.split(':');
            picks.push({ kind: kind as StepKind, id });
        }
        if (picks.length > 0) onPick(picks);
        onClose();
    };

    const tabClass = (active: boolean) => cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700",
    );

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Add Steps to Template</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500">
                    Pick one or more items — each becomes a step in this template, in the order
                    you select. Mix Application Forms and Consent Forms freely.
                </p>

                {/* Tabs */}
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                    <button type="button" onClick={() => setTab('form')} className={tabClass(tab === 'form')}>
                        <FileText size={14} /> Application Forms
                    </button>
                    <button type="button" onClick={() => setTab('consent')} className={tabClass(tab === 'consent')}>
                        <ShieldCheck size={14} /> Consent Forms
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={`Search ${tab === 'form' ? 'forms' : 'consents'}…`}
                        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>

                <div className="max-h-[50vh] space-y-1.5 overflow-y-auto">
                    {tab === 'form' && filteredForms.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm text-slate-400">No forms match "{query}".</div>
                    )}
                    {tab === 'consent' && filteredConsents.length === 0 && (
                        <div className="px-3 py-8 text-center text-sm text-slate-400">No consents match "{query}".</div>
                    )}

                    {tab === 'form' && filteredForms.map(f => {
                        const key = `form:${f.id}`;
                        const already = alreadyAdded.has(key);
                        const picked = selected.has(key);
                        return (
                            <label key={key} className={cn(
                                "flex items-center gap-3 rounded-lg border bg-white px-3 py-2 transition-colors",
                                picked ? "border-blue-400 bg-blue-50/60"
                                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30",
                                already ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                            )}>
                                <input
                                    type="checkbox"
                                    checked={picked}
                                    disabled={already}
                                    onChange={() => !already && toggle(key)}
                                    className="h-4 w-4 accent-blue-600"
                                />
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">{f.name}</p>
                                    <p className="truncate text-[11px] text-slate-500">
                                        {f.description || "No description"}
                                        {already && <span className="ml-1.5 italic text-slate-400">already in this template</span>}
                                    </p>
                                </div>
                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                                    {f.fields.length} field{f.fields.length === 1 ? "" : "s"}
                                </span>
                            </label>
                        );
                    })}

                    {tab === 'consent' && filteredConsents.map(c => {
                        const key = `consent:${c.id}`;
                        const already = alreadyAdded.has(key);
                        const picked = selected.has(key);
                        return (
                            <label key={key} className={cn(
                                "flex items-center gap-3 rounded-lg border bg-white px-3 py-2 transition-colors",
                                picked ? "border-blue-400 bg-blue-50/60"
                                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/30",
                                already ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                            )}>
                                <input
                                    type="checkbox"
                                    checked={picked}
                                    disabled={already}
                                    onChange={() => !already && toggle(key)}
                                    className="h-4 w-4 accent-blue-600"
                                />
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                                    <ShieldCheck className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-slate-800">{c.title}</p>
                                    <p className="truncate text-[11px] text-slate-500">
                                        {c.subtitle || c.citation}
                                        {already && <span className="ml-1.5 italic text-slate-400">already in this template</span>}
                                    </p>
                                </div>
                                {c.requiresSignature && (
                                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                                        Signature
                                    </span>
                                )}
                            </label>
                        );
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={selected.size === 0}
                        onClick={confirm}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Check className="h-4 w-4" />
                        Add {selected.size > 0 ? `${selected.size} ` : ""}step{selected.size === 1 ? "" : "s"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/** Single step row inside a template's expanded body. Display-only — click Edit to change. */
function StepRow({ index, step, form, consent, onEdit, onRemove, onMoveUp, onMoveDown, canMoveUp, canMoveDown }: {
    index: number;
    step: TemplateStep;
    form: ApplicationFormDef | undefined;
    consent: ConsentForm | undefined;
    onEdit: () => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    canMoveUp: boolean;
    canMoveDown: boolean;
}) {
    const kind: StepKind = step.kind ?? 'form';
    const isConsent = kind === 'consent';
    const displayName = resolveStepName(step, form, consent);
    return (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-blue-300">
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-700">
                {index + 1}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900">{displayName}</span>
                    {isConsent ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-700">
                            <ShieldCheck size={9} /> Consent
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-700">
                            <FileText size={9} /> Form
                        </span>
                    )}
                    {step.required ? (
                        <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-700">
                            Required
                        </span>
                    ) : (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                            Optional
                        </span>
                    )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <Link2 size={10} className="text-slate-400" />
                    {isConsent ? (
                        consent ? (
                            <>
                                <span>linked to</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                    {consent.title}
                                </span>
                                {consent.citation && (
                                    <>
                                        <span className="text-slate-400">·</span>
                                        <span className="font-mono">{consent.citation}</span>
                                    </>
                                )}
                                {consent.requiresSignature && (
                                    <>
                                        <span className="text-slate-400">·</span>
                                        <span>requires signature</span>
                                    </>
                                )}
                            </>
                        ) : (
                            <span className="italic text-rose-600">Linked consent was removed</span>
                        )
                    ) : form ? (
                        <>
                            <span>linked to</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                                {form.name}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span>{form.fields.length} field{form.fields.length === 1 ? '' : 's'}</span>
                            {form.documents.length > 0 && (
                                <>
                                    <span className="text-slate-400">·</span>
                                    <span>{form.documents.length} document{form.documents.length === 1 ? '' : 's'}</span>
                                </>
                            )}
                        </>
                    ) : (
                        <span className="italic text-rose-600">Linked form was removed from the library</span>
                    )}
                </div>
                {step.helperText && (
                    <p className="mt-1 text-[11px] italic text-slate-500">"{step.helperText}"</p>
                )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Edit step"
                >
                    <Pencil size={14} />
                </button>
                <div className="flex flex-col">
                    <button
                        type="button"
                        disabled={!canMoveUp}
                        onClick={onMoveUp}
                        className="flex h-4 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move up"
                    >
                        <ArrowUp size={11} />
                    </button>
                    <button
                        type="button"
                        disabled={!canMoveDown}
                        onClick={onMoveDown}
                        className="flex h-4 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent"
                        title="Move down"
                    >
                        <ArrowDown size={11} />
                    </button>
                </div>
                <button
                    type="button"
                    onClick={onRemove}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    title="Remove step"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}

/** Modal for editing a single step — choose kind (form vs consent), reference, label, required, helper text. */
function StepEditModal({ initial, forms, consents, onSave, onClose }: {
    initial: TemplateStep;
    forms: ApplicationFormDef[];
    consents: ConsentForm[];
    onSave: (step: TemplateStep) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState<TemplateStep>({ ...initial, kind: initial.kind ?? 'form' });
    const up = (p: Partial<TemplateStep>) => setDraft(d => ({ ...d, ...p }));
    const kind = draft.kind ?? 'form';
    const linkedForm = forms.find(f => f.id === draft.formId);
    const linkedConsent = consents.find(c => c.id === draft.formId);
    const canSave = !!draft.formId && (
        (kind === 'form' && !!linkedForm) || (kind === 'consent' && !!linkedConsent)
    );

    const kindBtn = (k: StepKind, label: string, Icon: typeof FileText) => (
        <button
            type="button"
            onClick={() => {
                // Switch kind — reset formId to the first option of the new kind so the select isn't empty
                const firstId = k === 'form'
                    ? (forms[0]?.id ?? '')
                    : (consents[0]?.id ?? '');
                up({ kind: k, formId: firstId });
            }}
            className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                kind === k
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
            )}
        >
            <Icon size={14} /> {label}
        </button>
    );

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Step</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Kind selector */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Step type
                        </label>
                        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                            {kindBtn('form',    'Application Form', FileText)}
                            {kindBtn('consent', 'Consent Form',     ShieldCheck)}
                        </div>
                    </div>

                    {/* Reference dropdown — depends on kind */}
                    {kind === 'form' ? (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Linked Application Form <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={draft.formId}
                                onChange={(e) => up({ formId: e.target.value })}
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {forms.map(f => (
                                    <option key={f.id} value={f.id}>{f.name}</option>
                                ))}
                            </select>
                            {linkedForm && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {linkedForm.fields.length} field{linkedForm.fields.length === 1 ? '' : 's'}
                                    {linkedForm.documents.length > 0 && (
                                        <> · {linkedForm.documents.length} document{linkedForm.documents.length === 1 ? '' : 's'}</>
                                    )}
                                    {linkedForm.description && <> · {linkedForm.description}</>}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Linked Consent Form <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={draft.formId}
                                onChange={(e) => up({ formId: e.target.value })}
                                className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {consents.map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                            {linkedConsent && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                    {linkedConsent.citation}
                                    {linkedConsent.requiresSignature && <> · requires signature</>}
                                    {linkedConsent.subtitle && <> · {linkedConsent.subtitle}</>}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Label override */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Step name (optional override)
                        </label>
                        <Input
                            value={draft.label ?? ""}
                            onChange={(e) => up({ label: e.target.value })}
                            placeholder={(kind === 'consent' ? linkedConsent?.title : linkedForm?.name) ?? 'Step label'}
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                            Leave blank to use the linked {kind === 'consent' ? 'consent' : 'form'}'s name.
                        </p>
                    </div>

                    {/* Helper text */}
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Helper text (optional)
                        </label>
                        <Textarea
                            value={draft.helperText ?? ""}
                            onChange={(e) => up({ helperText: e.target.value })}
                            placeholder="A short note shown under the step header — context, deadlines, prerequisites…"
                            className="min-h-[64px]"
                        />
                    </div>

                    {/* Required toggle */}
                    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                        <div>
                            <p className="text-sm font-medium text-slate-700">Required step</p>
                            <p className="text-[11px] text-slate-400">
                                Applicant must complete this step before advancing.
                            </p>
                        </div>
                        <Toggle
                            checked={draft.required}
                            onCheckedChange={(v) => up({ required: v })}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!canSave}
                        onClick={() => onSave(draft)}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Check className="h-4 w-4" /> Save Step
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export const TemplatesPage = () => {
    const [templates, setTemplates] = useState<DriverHiringTemplate[]>(loadTemplates);
    const [formType, setFormType] = useState<TemplateFormType>('hiring-driver');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [pickerForId, setPickerForId] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [editingStep, setEditingStep] = useState<{ templateId: string; step: TemplateStep } | null>(null);

    const forms = useMemo(() => loadApplicationForms(), []);
    const consents = useMemo(() => CONSENT_FORMS, []);
    const formById = useMemo(
        () => new Map(forms.map(f => [f.id, f])),
        [forms],
    );
    const consentById = useMemo(
        () => new Map(consents.map(c => [c.id as string, c])),
        [consents],
    );

    const commit = (next: DriverHiringTemplate[]) => {
        setTemplates(next);
        saveTemplates(next);
    };

    const updateTemplate = (id: string, patch: Partial<DriverHiringTemplate>) =>
        commit(templates.map(t => t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString().slice(0, 10) } : t));

    const addTemplate = () => {
        const t = newTemplate(formType);
        // Prepend so the new template shows at the top, expanded for immediate editing.
        commit([t, ...templates]);
        setExpandedId(t.id);
    };

    const visibleTemplates = templates.filter(t => t.formType === formType);
    const testingTemplate = testingId ? templates.find(t => t.id === testingId) : null;

    const removeTemplate = (e: React.MouseEvent, t: DriverHiringTemplate) => {
        e.stopPropagation();
        if (t.isDefault) return;
        commit(templates.filter(x => x.id !== t.id));
        if (expandedId === t.id) setExpandedId(null);
    };

    const addSteps = (templateId: string, picks: { kind: StepKind; id: string }[]) => {
        updateTemplate(templateId, {
            steps: [
                ...(templates.find(t => t.id === templateId)?.steps ?? []),
                ...picks.map(p => newStep(p.id, p.kind)),
            ],
        });
    };

    const updateStep = (templateId: string, stepId: string, patch: Partial<TemplateStep>) => {
        const t = templates.find(x => x.id === templateId);
        if (!t) return;
        updateTemplate(templateId, {
            steps: t.steps.map(s => s.id === stepId ? { ...s, ...patch } : s),
        });
    };

    const removeStep = (templateId: string, stepId: string) => {
        const t = templates.find(x => x.id === templateId);
        if (!t) return;
        updateTemplate(templateId, { steps: t.steps.filter(s => s.id !== stepId) });
    };

    const moveStep = (templateId: string, stepId: string, dir: -1 | 1) => {
        const t = templates.find(x => x.id === templateId);
        if (!t) return;
        const i = t.steps.findIndex(s => s.id === stepId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= t.steps.length) return;
        const next = [...t.steps];
        [next[i], next[j]] = [next[j], next[i]];
        updateTemplate(templateId, { steps: next });
    };

    const defaultCount = visibleTemplates.filter(t => t.isDefault).length;
    const customCount = visibleTemplates.length - defaultCount;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Page header band */}
            <div className="border-b border-slate-200 bg-white px-8 py-5">
                <nav className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500" aria-label="Breadcrumb">
                    <span>Super Admin</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900">Hiring Templates (ATS)</span>
                </nav>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                            <LayoutTemplate size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold text-slate-900">Hiring Templates (ATS)</h1>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Reusable workflows for hiring — chain Application Forms together as ordered steps applicants complete in sequence.
                            </p>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Form type
                        </label>
                        <select
                            value={formType}
                            onChange={(e) => setFormType(e.target.value as TemplateFormType)}
                            className="h-9 w-48 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {TEMPLATE_FORM_TYPES.map(t => (
                                <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="px-8 py-6">
                <PageHeader
                    icon={LayoutTemplate}
                    title={`${TEMPLATE_FORM_TYPES.find(t => t.id === formType)?.label} Templates`}
                    description="A template defines the ordered sequence of Application Forms an applicant fills out during hiring. Create multiple variants for the same workflow (e.g. CDL-A, Owner-Operator, Quick-Hire) and click Test to walk through the flow as the applicant will see it."
                    stats={(
                        <StatStrip stats={[
                            { label: "total", value: visibleTemplates.length, tone: "default" },
                            { label: "built-in", value: defaultCount, tone: "muted" },
                            { label: "custom", value: customCount, tone: "accent" },
                        ]} />
                    )}
                    actions={(
                        <Button
                            size="sm"
                            onClick={addTemplate}
                            className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                        >
                            <Plus className="h-4 w-4" /> Add Template
                        </Button>
                    )}
                />

                {visibleTemplates.length === 0 ? (
                    <EmptyState
                        icon={LayoutTemplate}
                        title="No hiring templates yet"
                        description="Templates stitch your Application Forms into a complete hiring pipeline. Click Add Template to build your first one."
                        action={(
                            <Button
                                size="sm"
                                onClick={addTemplate}
                                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" /> Add Template
                            </Button>
                        )}
                    />
                ) : (
                    <ul className="space-y-2">
                        {visibleTemplates.map(t => {
                            const expanded = expandedId === t.id;
                            const requiredSteps = t.steps.filter(s => s.required).length;
                            return (
                                <li
                                    key={t.id}
                                    className={cn(
                                        "overflow-hidden rounded-lg border bg-white",
                                        expanded ? "border-blue-300 shadow-sm" : "border-slate-200",
                                    )}
                                >
                                    {/* Header */}
                                    <div
                                        onClick={() => setExpandedId(expanded ? null : t.id)}
                                        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50"
                                    >
                                        {expanded
                                            ? <ChevronDown size={16} className="shrink-0 text-slate-400" />
                                            : <ChevronRight size={16} className="shrink-0 text-slate-400" />}
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                            <LayoutTemplate className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="text-sm font-medium text-slate-900">{t.name}</p>
                                                {t.isDefault ? (
                                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                                        Default
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-blue-600">
                                                        Custom
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-xs text-slate-400">
                                                {t.description || "No description"} · {t.steps.length} step{t.steps.length === 1 ? "" : "s"} · {requiredSteps} required
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={t.steps.length === 0}
                                                onClick={() => setTestingId(t.id)}
                                                className="gap-1.5"
                                                title={t.steps.length === 0 ? 'Add a step first' : 'Walk through the template as the applicant'}
                                            >
                                                <PlayCircle className="h-4 w-4" />
                                                Test
                                            </Button>
                                            {t.isDefault ? (
                                                <span className="flex h-9 w-9 items-center justify-center text-slate-300" title="Default template — cannot be deleted">
                                                    <Lock className="h-4 w-4" />
                                                </span>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => removeTemplate(e, t)}
                                                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    {expanded && (
                                        <div className="space-y-5 border-t border-slate-100 bg-slate-50/40 p-5">
                                            {/* Stats grid */}
                                            <TemplateStatGrid
                                                stats={computeStats(t, formById, consentById)}
                                                updatedAt={t.updatedAt}
                                            />

                                            {/* Template details card */}
                                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
                                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                                        <FileEdit size={14} className="text-blue-600" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-sm font-bold text-slate-900">Template details</h4>
                                                        <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                                                            Internal name and description shown in the list and when admins reference this template.
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4 p-5">
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                            Template name <span className="text-rose-500">*</span>
                                                        </label>
                                                        <Input
                                                            value={t.name}
                                                            onChange={e => updateTemplate(t.id, { name: e.target.value })}
                                                            placeholder="e.g. CDL-A OTR Driver Pipeline"
                                                            className="h-10"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                                                            Description
                                                        </label>
                                                        <Textarea
                                                            value={t.description}
                                                            onChange={e => updateTemplate(t.id, { description: e.target.value })}
                                                            placeholder="When to use this template, what it includes …"
                                                            className="min-h-[72px]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Steps card */}
                                            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                                                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-3.5">
                                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                                                        <Layers size={14} className="text-blue-600" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-sm font-bold text-slate-900">
                                                            Steps
                                                            <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                                                {t.steps.length}
                                                            </span>
                                                        </h4>
                                                        <p className="mt-0.5 text-[12px] leading-snug text-slate-500">
                                                            Ordered sequence of Application Forms and Consent Forms the applicant works through.
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => setPickerForId(t.id)}
                                                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" /> Add Step
                                                    </Button>
                                                </div>
                                                <div className="p-5">
                                                    {t.steps.length === 0 ? (
                                                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-10 text-center">
                                                            <FileText className="mb-2 h-7 w-7 text-slate-300" />
                                                            <p className="text-sm font-medium text-slate-600">No steps yet</p>
                                                            <p className="mt-1 max-w-sm text-[11px] text-slate-400">
                                                                Click <span className="font-semibold text-slate-600">Add Step</span> to pick
                                                                Application Forms or Consent Forms from your library.
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <ul className="space-y-2">
                                                            {t.steps.map((step, i) => {
                                                                const kind = step.kind ?? 'form';
                                                                return (
                                                                    <StepRow
                                                                        key={step.id}
                                                                        index={i}
                                                                        step={step}
                                                                        form={kind === 'form'    ? formById.get(step.formId)    : undefined}
                                                                        consent={kind === 'consent' ? consentById.get(step.formId) : undefined}
                                                                        onEdit={() => setEditingStep({ templateId: t.id, step })}
                                                                        onRemove={() => removeStep(t.id, step.id)}
                                                                        onMoveUp={() => moveStep(t.id, step.id, -1)}
                                                                        onMoveDown={() => moveStep(t.id, step.id, 1)}
                                                                        canMoveUp={i > 0}
                                                                        canMoveDown={i < t.steps.length - 1}
                                                                    />
                                                                );
                                                            })}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Step picker dialog — tabbed Forms / Consents */}
            {pickerForId && (() => {
                const t = templates.find(x => x.id === pickerForId);
                if (!t) return null;
                const alreadyAdded = new Set(t.steps.map(s => `${s.kind ?? 'form'}:${s.formId}`));
                return (
                    <StepPicker
                        forms={forms}
                        consents={consents}
                        alreadyAdded={alreadyAdded}
                        onPick={(picks) => addSteps(t.id, picks)}
                        onClose={() => setPickerForId(null)}
                    />
                );
            })()}

            {/* Test runner — walks through every step's form */}
            {testingTemplate && (
                <TemplateTestRunner
                    template={testingTemplate}
                    onClose={() => setTestingId(null)}
                />
            )}

            {/* Step edit modal */}
            {editingStep && (
                <StepEditModal
                    initial={editingStep.step}
                    forms={forms}
                    consents={consents}
                    onSave={(next) => {
                        updateStep(editingStep.templateId, editingStep.step.id, next);
                        setEditingStep(null);
                    }}
                    onClose={() => setEditingStep(null)}
                />
            )}
        </div>
    );
};

export default TemplatesPage;
