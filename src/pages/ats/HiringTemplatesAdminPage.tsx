import { useMemo, useState } from "react";
import {
    FileSignature, ChevronDown, ChevronRight, FileText, Briefcase,
    AlertCircle, ShieldCheck, Plus, Save, Pencil, Eye, Trash2,
    Camera, CalendarClock, IdCard, Stethoscope, Truck, Shield, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PIPELINE_BLUEPRINT, type PipelineStepId } from "./ats.data";
import { CONSENT_FORMS, CONSENT_BY_ID, type ConsentForm, type ConsentCategory } from "./consent-forms.data";
import {
    ALL_TEMPLATES, BOOKING_TYPE_META, DEFAULT_DOCUMENT_MONITORING,
    type HiringTemplate, type TemplateStep, type TemplateConsent,
    type TemplateDocument, type BookingSlot,
    type RequirementMode, type DocumentCategory,
    type TemplateFormField,
    type DocumentMonitoring,
} from "./hiring-templates.data";
import { loadApplicationForms } from "./application-forms.data";
import { SignaturePad, PhotoUpload } from "./SignaturePad";
import { Check, Download, FileDown } from "lucide-react";
import { useCompanyBranding } from "./company-branding.data";
import { downloadConsentPdf } from "./generateConsentPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";

/**
 * Hiring-Templates Admin page.
 *
 * Three-region layout:
 *   1. Header + global actions
 *   2. Left: template list. Right: editor.
 *   3. Editor body breaks the step config into four grouped sections —
 *      Consents · Identity / Photos · Documents · Bookings — so each
 *      requirement type has a distinct edit pattern rather than one mega-table.
 */

export function HiringTemplatesAdminPage() {
    const [templates, setTemplates] = useState<HiringTemplate[]>(ALL_TEMPLATES);
    const [activeId, setActiveId] = useState<string>(templates[0].id);
    const [previewConsent, setPreviewConsent] = useState<ConsentForm | null>(null);

    const active = templates.find(t => t.id === activeId) ?? templates[0];

    const update = (next: HiringTemplate) => {
        setTemplates(prev => prev.map(t => t.id === next.id ? next : t));
    };
    const updateStep = (idx: number, patch: Partial<TemplateStep>) => {
        update({ ...active, steps: active.steps.map((s, i) => i === idx ? { ...s, ...patch } : s), updatedAt: new Date().toISOString().slice(0, 10) });
    };

    const totals = useMemo(() => {
        let consents = 0, docs = 0, photos = 0, bookings = 0, sigs = 0;
        for (const s of active.steps) {
            if (!s.enabled) continue;
            consents += s.consents.length;
            sigs += s.consents.filter(c => CONSENT_BY_ID[c.consentId].requiresSignature).length;
            docs += s.documents.filter(d => !d.isPhoto).length;
            photos += s.documents.filter(d => d.isPhoto).length;
            bookings += s.bookings.length;
        }
        return { consents, docs, photos, bookings, sigs };
    }, [active]);

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200 px-8 py-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center shadow-sm">
                            <FileSignature size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-xl font-semibold text-slate-900">Hiring Templates</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Drag & drop consents · photo & document slots · book substance test, DOT physical, road test, and orientation.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" /> New template
                        </Button>
                        <Button size="sm" className="gap-1.5">
                            <Save className="h-4 w-4" /> Save changes
                        </Button>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
                {/* Left column — Branding + Templates list */}
                <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                <BrandingPanel />
                <aside className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60">
                        <h3 className="text-sm font-bold text-slate-900">Templates</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Pick a template per CDL class.</p>
                    </div>
                    <ul className="py-1">
                        {templates.map(t => (
                            <li key={t.id}>
                                <button
                                    type="button"
                                    onClick={() => setActiveId(t.id)}
                                    className={cn(
                                        'w-full text-left px-4 py-2.5 border-l-[3px] flex items-start gap-2 transition-colors',
                                        activeId === t.id ? 'border-l-blue-600 bg-blue-50/60' : 'border-l-transparent hover:bg-slate-50',
                                    )}
                                >
                                    <FileText size={14} className={activeId === t.id ? 'text-blue-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[12px] font-bold text-slate-900 truncate">{t.name}</div>
                                        <div className="text-[10px] text-slate-500 truncate">{t.appliesToLicense === 'all' ? 'All licenses' : t.appliesToLicense}</div>
                                    </div>
                                    {t.isDefault && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-0.5 mt-0.5">
                                            Default
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>
                </div>

                {/* Editor */}
                <div className="min-w-0 space-y-5">
                    {/* Summary */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-900">{active.name}</h2>
                                <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">{active.description}</p>
                            </div>
                            <button type="button" className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-slate-50">
                                <Pencil size={12} /> Rename
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-5 py-4">
                            <SummaryTile label="Steps enabled" value={`${active.steps.filter(s => s.enabled).length}/${active.steps.length}`} Icon={Briefcase} />
                            <SummaryTile label="Consents"      value={totals.consents}  Icon={FileSignature} sub={`${totals.sigs} require signature`} />
                            <SummaryTile label="Photo slots"   value={totals.photos}    Icon={Camera} />
                            <SummaryTile label="Documents"     value={totals.docs}      Icon={FileText} />
                            <SummaryTile label="Bookings"      value={totals.bookings}  Icon={CalendarClock} />
                            <SummaryTile label="Last updated"  value={active.updatedAt} sub={active.updatedBy} mono />
                        </div>
                    </div>

                    {/* Tabbed editor */}
                    <TemplateTabsEditor
                        template={active}
                        onUpdate={update}
                        onUpdateStep={updateStep}
                        onPreviewConsent={(c) => setPreviewConsent(c)}
                    />
                </div>
            </div>

            {previewConsent && <ConsentPreviewModal consent={previewConsent} onClose={() => setPreviewConsent(null)} />}
        </div>
    );
}

// ── Tabbed editor (Consent Forms / Application Form / Documents / Bookings / Steps) ──

type EditorTab = 'preview' | 'consents' | 'form' | 'documents' | 'bookings' | 'steps';

function TemplateTabsEditor({
    template, onUpdate, onUpdateStep, onPreviewConsent,
}: {
    template: HiringTemplate;
    onUpdate: (t: HiringTemplate) => void;
    onUpdateStep: (idx: number, patch: Partial<TemplateStep>) => void;
    onPreviewConsent: (c: ConsentForm) => void;
}) {
    const [tab, setTab] = useState<EditorTab>('preview');

    const consentCount  = template.steps.reduce((s, x) => s + (x.enabled ? x.consents.length  : 0), 0);
    const documentCount = template.steps.reduce((s, x) => s + (x.enabled ? x.documents.length : 0), 0);
    const bookingCount  = template.steps.reduce((s, x) => s + (x.enabled ? x.bookings.length  : 0), 0);
    const enabledSteps  = template.steps.filter(s => s.enabled).length;

    const tabs: { id: EditorTab; label: string; Icon: React.ElementType; count: number }[] = [
        { id: 'preview',    label: 'Preview',             Icon: Eye,            count: 0 },
        { id: 'consents',   label: 'Consent Forms',       Icon: FileSignature,  count: consentCount },
        { id: 'form',       label: 'Application Form',    Icon: FileText,       count: 0 },
        { id: 'documents',  label: 'Documents',           Icon: FileText,       count: documentCount },
        { id: 'bookings',   label: 'Bookings',            Icon: CalendarClock,  count: bookingCount },
        { id: 'steps',      label: 'Steps',               Icon: Briefcase,      count: enabledSteps },
    ];

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Tab strip */}
            <div className="border-b border-slate-200 bg-slate-50/60 px-3 flex items-center gap-1 overflow-x-auto">
                {tabs.map(t => {
                    const active = tab === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={cn(
                                'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px',
                                active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300',
                            )}
                        >
                            <t.Icon size={14} className={active ? 'text-blue-600' : 'text-slate-400'} />
                            <span>{t.label}</span>
                            {t.count > 0 && (
                                <span className={cn(
                                    'inline-flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-bold tabular-nums',
                                    active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600',
                                )}>{t.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="p-5">
                {tab === 'preview'   && <TemplatePreviewTab template={template} />}
                {tab === 'consents'  && <FlatConsentsTab  template={template} onUpdate={onUpdate} onPreview={onPreviewConsent} />}
                {tab === 'form'      && <ApplicationFormTab template={template} onUpdate={onUpdate} />}
                {tab === 'documents' && <FlatDocumentsTab template={template} onUpdate={onUpdate} />}
                {tab === 'bookings'  && <FlatBookingsTab  template={template} onUpdate={onUpdate} />}
                {tab === 'steps'     && (
                    <div className="space-y-4">
                        {template.steps.map((step, idx) => (
                            <StepEditor
                                key={step.stepId}
                                step={step}
                                onChange={(patch) => onUpdateStep(idx, patch)}
                                onPreviewConsent={onPreviewConsent}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Tab: Consent Forms (flat list across all steps) ─────────────────────

function FlatConsentsTab({
    template, onUpdate, onPreview,
}: {
    template: HiringTemplate;
    onUpdate: (t: HiringTemplate) => void;
    onPreview: (c: ConsentForm) => void;
}) {
    const [branding] = useCompanyBranding();
    const rows: { stepIdx: number; stepId: PipelineStepId; consent: TemplateConsent }[] = [];
    template.steps.forEach((s, stepIdx) => {
        if (!s.enabled) return;
        for (const c of s.consents) rows.push({ stepIdx, stepId: s.stepId, consent: c });
    });

    const setMode = (stepIdx: number, consentId: ConsentCategory, mode: RequirementMode) => {
        const next = { ...template, steps: template.steps.map((s, i) => i === stepIdx
            ? { ...s, consents: s.consents.map(c => c.consentId === consentId ? { ...c, mode } : c) }
            : s) };
        onUpdate(next);
    };
    const move = (stepIdx: number, consentId: ConsentCategory, toStepIdx: number) => {
        if (stepIdx === toStepIdx) return;
        const fromStep = template.steps[stepIdx];
        const consent = fromStep.consents.find(c => c.consentId === consentId);
        if (!consent) return;
        const next = { ...template, steps: template.steps.map((s, i) => {
            if (i === stepIdx) return { ...s, consents: s.consents.filter(c => c.consentId !== consentId) };
            if (i === toStepIdx) return { ...s, consents: [...s.consents, consent] };
            return s;
        }) };
        onUpdate(next);
    };
    const remove = (stepIdx: number, consentId: ConsentCategory) => {
        const next = { ...template, steps: template.steps.map((s, i) => i === stepIdx
            ? { ...s, consents: s.consents.filter(c => c.consentId !== consentId) }
            : s) };
        onUpdate(next);
    };

    // Consents not yet attached anywhere — "Add" tray at the bottom.
    const used = new Set(rows.map(r => r.consent.consentId));
    const available = CONSENT_FORMS.filter(c => !used.has(c.id));

    const addToStep = (consentId: ConsentCategory) => {
        const form = CONSENT_BY_ID[consentId];
        const targetStepIdx = template.steps.findIndex(s => s.stepId === form.defaultStep);
        if (targetStepIdx < 0) return;
        const next = { ...template, steps: template.steps.map((s, i) => i === targetStepIdx
            ? { ...s, consents: [...s.consents, { consentId, mode: 'required' as RequirementMode }] }
            : s) };
        onUpdate(next);
    };

    return (
        <div>
            <SectionHeader icon={FileSignature} title="Consent Forms" subtitle="Every consent the applicant signs during this hiring path, grouped by the step that captures it." count={rows.length} />

            {rows.length === 0 ? (
                <EmptyHint message="No consent forms attached yet." />
            ) : (
                <div className="space-y-2">
                    {/* Column header */}
                    <div className="hidden md:grid grid-cols-[minmax(0,2fr)_150px_150px_auto_40px] gap-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Consent</span>
                        <span>Step</span>
                        <span>Mode</span>
                        <span className="text-right">Preview</span>
                        <span />
                    </div>
                    {rows.map(({ stepIdx, consent }) => {
                        const form = CONSENT_BY_ID[consent.consentId];
                        return (
                            <div key={form.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_150px_150px_auto_40px] gap-2 items-center">
                                <div className="min-w-0">
                                    <div className="text-[12px] font-bold text-slate-900 truncate">{form.title}</div>
                                    <div className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
                                        <span>{form.citation}</span>
                                        {form.requiresSignature && <span className="inline-flex items-center gap-0.5 text-emerald-700"><Pencil size={9} /> sign</span>}
                                    </div>
                                </div>
                                <select
                                    value={stepIdx}
                                    onChange={e => move(stepIdx, form.id, Number(e.target.value))}
                                    className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                                >
                                    {template.steps.map((s, i) => (
                                        <option key={s.stepId} value={i}>
                                            {PIPELINE_BLUEPRINT.find(b => b.id === s.stepId)?.label}
                                        </option>
                                    ))}
                                </select>
                                <ModeSelect value={consent.mode} onChange={(m) => setMode(stepIdx, form.id, m)} />
                                <div className="flex items-center gap-1 justify-self-end">
                                    <button
                                        type="button"
                                        onClick={() => downloadConsentPdf({ consent: form, branding, mode: 'blank' })}
                                        title="Download blank PDF"
                                        className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 inline-flex items-center gap-1.5"
                                    >
                                        <FileDown size={11} /> PDF
                                    </button>
                                    <button type="button" onClick={() => onPreview(form)} className="h-8 px-2.5 rounded border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 inline-flex items-center gap-1">
                                        <Eye size={11} /> Preview
                                    </button>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => remove(stepIdx, form.id)}
                                    aria-label="Remove"
                                    className="h-9 w-9 text-rose-600 hover:bg-rose-50 hover:border-rose-200 justify-self-end"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            )}

            {available.length > 0 && (
                <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Add consent form</div>
                    <div className="flex flex-wrap gap-2">
                        {available.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => addToStep(c.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 hover:border-slate-300"
                            >
                                <Plus size={11} /> {c.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Tab: Application Form (form picker) ─────────────────────────────────

function ApplicationFormTab({
    template, onUpdate,
}: {
    template: HiringTemplate;
    onUpdate: (t: HiringTemplate) => void;
}) {
    const forms = loadApplicationForms();
    const selectedId = template.applicationFormId
        ?? forms.find(f => f.isDefault)?.id
        ?? forms[0]?.id;

    return (
        <div>
            <SectionHeader
                icon={FileText}
                title="Application Form"
                subtitle="Choose which application form applicants fill out for this hiring path. Forms are built in the Docu/Form Generator."
                count={forms.length}
            />

            <div className="space-y-2">
                {forms.map(f => {
                    const active = f.id === selectedId;
                    return (
                        <button
                            key={f.id}
                            type="button"
                            onClick={() => onUpdate({ ...template, applicationFormId: f.id })}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
                                active
                                    ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/20'
                                    : 'border-slate-200 bg-white hover:bg-slate-50',
                            )}
                        >
                            <span className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                                active ? 'border-blue-600 bg-blue-600' : 'border-slate-300',
                            )}>
                                {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </span>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
                                <FileText className="h-4 w-4 text-slate-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[13px] font-bold text-slate-900">{f.name}</span>
                                    {f.isDefault && (
                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <div className="truncate text-[11px] text-slate-500">
                                    {f.description || (f.kind === 'standard' ? 'Standard 13-step form' : 'Custom form')}
                                    {' · '}
                                    {f.kind === 'standard'
                                        ? '13 fixed steps'
                                        : `${f.fields.length} field${f.fields.length === 1 ? '' : 's'}`}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <p className="mt-4 text-[11px] text-slate-400">
                Forms, their fields, and logos are managed in Settings → Docu/Form Generator.
            </p>
        </div>
    );
}

// ── Tab: Documents (flat list across all steps) ─────────────────────────

function FlatDocumentsTab({
    template, onUpdate,
}: {
    template: HiringTemplate;
    onUpdate: (t: HiringTemplate) => void;
}) {
    const rows: { stepIdx: number; doc: TemplateDocument }[] = [];
    template.steps.forEach((s, stepIdx) => {
        if (!s.enabled) return;
        for (const d of s.documents) rows.push({ stepIdx, doc: d });
    });

    const setField = (stepIdx: number, docId: string, patch: Partial<TemplateDocument>) => {
        onUpdate({ ...template, steps: template.steps.map((s, i) => i === stepIdx
            ? { ...s, documents: s.documents.map(d => d.id === docId ? { ...d, ...patch } : d) }
            : s) });
    };
    const move = (stepIdx: number, docId: string, toStepIdx: number) => {
        if (stepIdx === toStepIdx) return;
        const doc = template.steps[stepIdx].documents.find(d => d.id === docId);
        if (!doc) return;
        onUpdate({ ...template, steps: template.steps.map((s, i) => {
            if (i === stepIdx)   return { ...s, documents: s.documents.filter(d => d.id !== docId) };
            if (i === toStepIdx) return { ...s, documents: [...s.documents, doc] };
            return s;
        }) });
    };
    const remove = (stepIdx: number, docId: string) => {
        onUpdate({ ...template, steps: template.steps.map((s, i) => i === stepIdx
            ? { ...s, documents: s.documents.filter(d => d.id !== docId) }
            : s) });
    };
    const addNew = () => {
        const firstEnabled = template.steps.findIndex(s => s.enabled);
        if (firstEnabled < 0) return;
        onUpdate({ ...template, steps: template.steps.map((s, i) => i === firstEnabled
            ? { ...s, documents: [...s.documents, {
                id: `doc-${Math.random().toString(36).slice(2, 8)}`,
                label: 'New document', category: 'Other', mode: 'optional', source: 'Applicant',
            }] }
            : s) });
    };

    return (
        <div>
            <SectionHeader icon={FileText} title="Documents & Photos" subtitle="Every upload required across this hiring path. Toggle 'photo' for image-style slots and 'sign?' to require an applicant signature." count={rows.length} />

            {rows.length === 0 ? (
                <EmptyHint message="No documents configured yet." />
            ) : (
                <div className="space-y-2">
                    <div className="hidden lg:grid grid-cols-[40px_minmax(0,2fr)_140px_120px_120px_120px_60px_60px_40px] gap-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <span />
                        <span>Label</span>
                        <span>Step</span>
                        <span>Category</span>
                        <span>Source</span>
                        <span>Mode</span>
                        <span className="text-center">Photo?</span>
                        <span className="text-center">Sign?</span>
                        <span />
                    </div>
                    {rows.map(({ stepIdx, doc: d }) => (
                        <DocumentRow
                            key={d.id}
                            d={d}
                            stepIdx={stepIdx}
                            template={template}
                            onChange={(patch) => setField(stepIdx, d.id, patch)}
                            onMove={(to) => move(stepIdx, d.id, to)}
                            onRemove={() => remove(stepIdx, d.id)}
                        />
                    ))}
                </div>
            )}

            <Button variant="outline" size="sm" onClick={addNew} className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> Add document slot
            </Button>
        </div>
    );
}

// ── Document row + Monitoring panel ─────────────────────────────────────

function DocumentRow({
    d, stepIdx, template, onChange, onMove, onRemove,
}: {
    d: TemplateDocument;
    stepIdx: number;
    template: HiringTemplate;
    onChange: (patch: Partial<TemplateDocument>) => void;
    onMove: (to: number) => void;
    onRemove: () => void;
}) {
    const [open, setOpen] = useState(false);
    const monitoring = d.monitoring ?? DEFAULT_DOCUMENT_MONITORING;
    const monActive = !!d.monitoring?.enabled;

    return (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-3 py-2 grid grid-cols-1 lg:grid-cols-[40px_minmax(0,2fr)_140px_120px_120px_120px_60px_60px_40px] gap-2 items-center">
                <button
                    type="button"
                    onClick={() => setOpen(v => !v)}
                    className={cn(
                        'h-9 w-9 rounded-md border flex items-center justify-center transition-colors',
                        open ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                    )}
                    title={open ? 'Collapse monitoring options' : 'Expand monitoring options'}
                    aria-expanded={open}
                >
                    {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <input
                    type="text"
                    value={d.label}
                    onChange={e => onChange({ label: e.target.value })}
                    className="h-8 px-2 rounded border border-slate-200 bg-white text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                />
                <select
                    value={stepIdx}
                    onChange={e => onMove(Number(e.target.value))}
                    className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                >
                    {template.steps.map((s, i) => (
                        <option key={s.stepId} value={i}>{PIPELINE_BLUEPRINT.find(b => b.id === s.stepId)?.label}</option>
                    ))}
                </select>
                <CategorySelect value={d.category} onChange={(c) => onChange({ category: c })} />
                <SourceSelect value={d.source} onChange={(s) => onChange({ source: s })} />
                <ModeSelect value={d.mode} onChange={(m) => onChange({ mode: m })} />
                <label className="h-9 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                        type="checkbox"
                        checked={!!d.isPhoto}
                        onChange={e => onChange({ isPhoto: e.target.checked })}
                        className="accent-blue-600 h-3.5 w-3.5"
                        aria-label="Photo slot"
                    />
                </label>
                <label className="h-9 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                    <input
                        type="checkbox"
                        checked={!!d.requiresSignature}
                        onChange={e => onChange({ requiresSignature: e.target.checked })}
                        className="accent-blue-600 h-3.5 w-3.5"
                        aria-label="Requires signature"
                    />
                </label>
                <button type="button" onClick={onRemove} className="h-9 w-9 rounded-md border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 inline-flex items-center justify-center justify-self-end" aria-label="Remove">
                    <Trash2 size={13} />
                </button>
            </div>

            {/* Indicator strip (visible even when collapsed) */}
            {monActive && (
                <div className="px-3 pb-2 -mt-1">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                        <Bell size={10} /> Monitoring · {monitoring.renewalRecurrence} · {monitoring.reminderDays.sort((a, b) => b - a).join('/')}d reminders
                    </span>
                </div>
            )}

            {open && (
                <DocumentMonitoringPanel
                    monitoring={monitoring}
                    onChange={(next) => onChange({ monitoring: next })}
                />
            )}
        </div>
    );
}

function DocumentMonitoringPanel({
    monitoring, onChange,
}: {
    monitoring: DocumentMonitoring;
    onChange: (next: DocumentMonitoring) => void;
}) {
    const set = (patch: Partial<DocumentMonitoring>) => onChange({ ...monitoring, ...patch });
    const toggleReminder = (day: number) => {
        const has = monitoring.reminderDays.includes(day);
        const next = has ? monitoring.reminderDays.filter(d => d !== day) : [...monitoring.reminderDays, day];
        set({ reminderDays: next });
    };
    const toggleChannel = (key: keyof DocumentMonitoring['channels']) =>
        set({ channels: { ...monitoring.channels, [key]: !monitoring.channels[key] } });

    return (
        <div className="border-t border-slate-200 bg-slate-50/40 p-6 space-y-6">
            {/* Configuration Rules — mirrors KeyNumberEditor Requirements card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-1 bg-blue-600 rounded-full" />
                    <h2 className="text-base font-semibold text-slate-900">Configuration Rules</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <ToggleRow
                        label="Capture expiry date"
                        sub="Show an expiry-date input on the upload."
                        value={monitoring.captureExpiryDate}
                        onChange={(v) => set({ captureExpiryDate: v })}
                    />
                    <ToggleRow
                        label="Capture issue date"
                        sub="Show an issue-date input on the upload."
                        value={monitoring.captureIssueDate}
                        onChange={(v) => set({ captureIssueDate: v })}
                    />
                    <ToggleRow
                        label="Issue state required?"
                        sub="Requires selection of issuing state / province."
                        value={monitoring.issueStateRequired}
                        onChange={(v) => set({ issueStateRequired: v })}
                    />
                    <ToggleRow
                        label="Issue country required?"
                        sub="Requires selection of issuing country."
                        value={monitoring.issueCountryRequired}
                        onChange={(v) => set({ issueCountryRequired: v })}
                    />
                </div>
            </div>

            {/* Monitoring & Notifications card — matches KeyNumberEditor exactly */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-1 bg-purple-600 rounded-full" />
                        <h2 className="text-base font-semibold text-slate-900">Monitoring &amp; Notifications</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600">
                            {monitoring.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <Toggle
                            checked={monitoring.enabled}
                            onCheckedChange={(checked) => set({ enabled: checked })}
                            className="data-[state=on]:bg-purple-600"
                        />
                    </div>
                </div>

                {monitoring.enabled && (
                    <div className="pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                        {/* Left column */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Monitor Based On</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition">
                                        <input
                                            type="radio"
                                            checked={monitoring.monitorBasedOn === 'expiry_date'}
                                            onChange={() => set({ monitorBasedOn: 'expiry_date' })}
                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Expiry Date</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-lg hover:bg-slate-50 transition">
                                        <input
                                            type="radio"
                                            checked={monitoring.monitorBasedOn === 'issue_date'}
                                            onChange={() => set({ monitorBasedOn: 'issue_date' })}
                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-sm font-medium text-slate-700">Issue Date</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Renewal Recurrence</label>
                                <select
                                    value={monitoring.renewalRecurrence}
                                    onChange={e => set({ renewalRecurrence: e.target.value as DocumentMonitoring['renewalRecurrence'] })}
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="annually">Annually (Every 1 Year)</option>
                                    <option value="biennial">Biennial (Every 2 Years)</option>
                                    <option value="quarterly">Quarterly (Every 3 Months)</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>

                        {/* Right column */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Notification Reminders</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {[90, 60, 30, 7].map(days => (
                                        <label key={days} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={monitoring.reminderDays.includes(days)}
                                                onChange={() => toggleReminder(days)}
                                                className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-slate-600">{days} Days Before</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-700">Notification Channels</label>
                                <div className="flex gap-4">
                                    {([
                                        { key: 'email', label: 'Email' },
                                        { key: 'inApp', label: 'In-App' },
                                        { key: 'sms',   label: 'SMS' },
                                    ] as { key: keyof DocumentMonitoring['channels']; label: string }[]).map(c => (
                                        <label key={c.key} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={!!monitoring.channels[c.key]}
                                                onChange={() => toggleChannel(c.key)}
                                                className="w-4 h-4 rounded text-purple-600 border-slate-300 focus:ring-purple-500"
                                            />
                                            <span className="text-sm text-slate-600">{c.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 mt-2">
                            <Bell className="h-5 w-5 text-blue-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900">Projected Notification Schedule</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Monitor {monitoring.monitorBasedOn === 'expiry_date' ? 'Expiry Date' : 'Issue Date'}.{' '}
                                    {monitoring.reminderDays.length > 0
                                        ? `Reminders at ${monitoring.reminderDays.sort((a, b) => b - a).map(d => `${d} days`).join(', ')} before.`
                                        : 'No reminders configured.'}
                                    {' '}Channels:{' '}
                                    {[monitoring.channels.email && 'Email', monitoring.channels.inApp && 'In-App', monitoring.channels.sms && 'SMS'].filter(Boolean).join(', ') || 'None'}.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ToggleRow({
    label, sub, value, onChange,
}: {
    label: string;
    sub?: string;
    value: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="min-w-0">
                <label className="text-sm font-medium text-slate-900 block truncate">{label}</label>
                {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
            </div>
            <Toggle
                checked={value}
                onCheckedChange={onChange}
                className="data-[state=on]:bg-blue-600"
            />
        </div>
    );
}

// ── Tab: Bookings (flat list across all steps) ──────────────────────────

function FlatBookingsTab({
    template, onUpdate,
}: {
    template: HiringTemplate;
    onUpdate: (t: HiringTemplate) => void;
}) {
    const rows: { stepIdx: number; booking: BookingSlot }[] = [];
    template.steps.forEach((s, stepIdx) => {
        if (!s.enabled) return;
        for (const b of s.bookings) rows.push({ stepIdx, booking: b });
    });

    const setField = (stepIdx: number, id: string, patch: Partial<BookingSlot>) => {
        onUpdate({ ...template, steps: template.steps.map((s, i) => i === stepIdx
            ? { ...s, bookings: s.bookings.map(b => b.id === id ? { ...b, ...patch } : b) }
            : s) });
    };
    const move = (stepIdx: number, id: string, toStepIdx: number) => {
        if (stepIdx === toStepIdx) return;
        const b = template.steps[stepIdx].bookings.find(x => x.id === id);
        if (!b) return;
        onUpdate({ ...template, steps: template.steps.map((s, i) => {
            if (i === stepIdx)   return { ...s, bookings: s.bookings.filter(x => x.id !== id) };
            if (i === toStepIdx) return { ...s, bookings: [...s.bookings, b] };
            return s;
        }) });
    };
    const remove = (stepIdx: number, id: string) => {
        onUpdate({ ...template, steps: template.steps.map((s, i) => i === stepIdx
            ? { ...s, bookings: s.bookings.filter(b => b.id !== id) }
            : s) });
    };
    const addNew = () => {
        const firstEnabled = template.steps.findIndex(s => s.enabled);
        if (firstEnabled < 0) return;
        onUpdate({ ...template, steps: template.steps.map((s, i) => i === firstEnabled
            ? { ...s, bookings: [...s.bookings, {
                id: `bk-${Math.random().toString(36).slice(2, 8)}`,
                label: 'New booking', type: 'other', mode: 'required',
            }] }
            : s) });
    };

    return (
        <div>
            <SectionHeader icon={CalendarClock} title="Bookings & Appointments" subtitle="Substance test, DOT physical, road test, orientation, fingerprinting." count={rows.length} />

            {rows.length === 0 ? (
                <EmptyHint message="No bookings configured yet." />
            ) : (
                <div className="space-y-2">
                    <div className="hidden md:grid grid-cols-[minmax(0,2fr)_150px_140px_140px_minmax(0,2fr)_40px] gap-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Label</span>
                        <span>Step</span>
                        <span>Type</span>
                        <span>Mode</span>
                        <span>Venue</span>
                        <span />
                    </div>
                    {rows.map(({ stepIdx, booking: b }) => (
                        <div key={b.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_150px_140px_140px_minmax(0,2fr)_40px] gap-2 items-center">
                            <input
                                type="text"
                                value={b.label}
                                onChange={e => setField(stepIdx, b.id, { label: e.target.value })}
                                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                            />
                            <select
                                value={stepIdx}
                                onChange={e => move(stepIdx, b.id, Number(e.target.value))}
                                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                            >
                                {template.steps.map((s, i) => (
                                    <option key={s.stepId} value={i}>{PIPELINE_BLUEPRINT.find(b => b.id === s.stepId)?.label}</option>
                                ))}
                            </select>
                            <select
                                value={b.type}
                                onChange={e => setField(stepIdx, b.id, { type: e.target.value as BookingSlot['type'] })}
                                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                            >
                                {(Object.keys(BOOKING_TYPE_META) as BookingSlot['type'][]).map(t => (
                                    <option key={t} value={t}>{BOOKING_TYPE_META[t].label}</option>
                                ))}
                            </select>
                            <ModeSelect value={b.mode} onChange={(m) => setField(stepIdx, b.id, { mode: m })} />
                            <input
                                type="text"
                                value={b.venue ?? ''}
                                onChange={e => setField(stepIdx, b.id, { venue: e.target.value })}
                                placeholder="Clinic / venue"
                                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                            />
                            <button type="button" onClick={() => remove(stepIdx, b.id)} className="h-9 w-9 rounded-md border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 inline-flex items-center justify-center justify-self-end" aria-label="Remove">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Button variant="outline" size="sm" onClick={addNew} className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> Add booking slot
            </Button>
        </div>
    );
}

// ── Step editor ──────────────────────────────────────────────────────────

function StepEditor({
    step, onChange, onPreviewConsent,
}: {
    step: TemplateStep;
    onChange: (patch: Partial<TemplateStep>) => void;
    onPreviewConsent: (c: ConsentForm) => void;
}) {
    const [open, setOpen] = useState(true);
    const blueprint = PIPELINE_BLUEPRINT.find(b => b.id === step.stepId)!;

    const photoDocs = step.documents.filter(d => d.isPhoto);
    const otherDocs = step.documents.filter(d => !d.isPhoto);

    return (
        <div className={cn('bg-white border rounded-xl shadow-sm overflow-hidden', step.enabled ? 'border-slate-200' : 'border-slate-200 opacity-70')}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-50"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Briefcase size={14} />
                    </span>
                    <div className="text-left min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{blueprint.label}</div>
                        <div className="text-[11px] text-slate-500 truncate">
                            {step.consents.length} consent · {photoDocs.length} photo · {otherDocs.length} doc · {step.bookings.length} booking
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 select-none" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={step.enabled}
                            onChange={e => onChange({ enabled: e.target.checked })}
                            className="accent-blue-600 h-3.5 w-3.5"
                        />
                        Step enabled
                    </label>
                    {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                </div>
            </button>

            {open && step.enabled && (
                <div className="p-5 space-y-5">
                    {/* Instruction */}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">
                            Applicant-side instruction
                        </label>
                        <textarea
                            value={step.instruction ?? ''}
                            onChange={e => onChange({ instruction: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                            placeholder="Shown in the Required Actions sidebar on this step."
                        />
                    </div>

                    <ConsentsSection
                        consents={step.consents}
                        defaultStepId={step.stepId}
                        onChange={(consents) => onChange({ consents })}
                        onPreview={onPreviewConsent}
                    />

                    <PhotosSection
                        photos={photoDocs}
                        onChange={(updated) => onChange({ documents: [...updated, ...otherDocs] })}
                    />

                    <DocumentsSection
                        documents={otherDocs}
                        onChange={(updated) => onChange({ documents: [...photoDocs, ...updated] })}
                    />

                    <BookingsSection
                        bookings={step.bookings}
                        onChange={(bookings) => onChange({ bookings })}
                    />
                </div>
            )}
        </div>
    );
}

// ── Section header (uniform across the four subsections) ────────────────

function SectionHeader({ icon: Icon, title, subtitle, count }: { icon: React.ElementType; title: string; subtitle: string; count: number }) {
    return (
        <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center">
                    <Icon size={14} />
                </span>
                <div>
                    <h4 className="text-[12px] font-bold text-slate-900">{title}</h4>
                    <p className="text-[10px] text-slate-500">{subtitle}</p>
                </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 tabular-nums">{count}</span>
        </div>
    );
}

// ── Consents section ────────────────────────────────────────────────────

function ConsentsSection({
    consents, defaultStepId, onChange, onPreview,
}: {
    consents: TemplateConsent[];
    defaultStepId: PipelineStepId;
    onChange: (next: TemplateConsent[]) => void;
    onPreview: (c: ConsentForm) => void;
}) {
    const inUse = new Set(consents.map(c => c.consentId));
    const available = CONSENT_FORMS.filter(c => !inUse.has(c.id));
    const suggested = available.filter(c => c.defaultStep === defaultStepId);
    const other = available.filter(c => c.defaultStep !== defaultStepId);

    const setMode = (id: ConsentCategory, mode: RequirementMode) =>
        onChange(consents.map(c => c.consentId === id ? { ...c, mode } : c));
    const remove = (id: ConsentCategory) => onChange(consents.filter(c => c.consentId !== id));
    const add = (id: ConsentCategory) => onChange([...consents, { consentId: id, mode: 'required' }]);

    return (
        <section>
            <SectionHeader icon={FileSignature} title="Consents" subtitle="Forms the applicant signs at this step." count={consents.length} />

            {consents.length === 0 ? (
                <EmptyHint message="No consents attached to this step yet." />
            ) : (
                <ul className="space-y-2">
                    {consents.map(c => {
                        const form = CONSENT_BY_ID[c.consentId];
                        return (
                            <li key={c.consentId} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_160px_auto_auto] gap-2 items-center rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <div className="min-w-0">
                                    <div className="text-[12px] font-bold text-slate-900 truncate">{form.title}</div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                        {form.citation}
                                        {form.requiresSignature && <span className="ml-1.5 inline-flex items-center gap-1 text-emerald-700"><Pencil size={9} /> signature</span>}
                                    </div>
                                </div>
                                <ModeSelect value={c.mode} onChange={(m) => setMode(c.consentId, m)} />
                                <button type="button" onClick={() => onPreview(form)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50">
                                    <Eye size={11} /> Preview
                                </button>
                                <button type="button" onClick={() => remove(c.consentId)} className="h-7 w-7 rounded-md border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 flex items-center justify-center" aria-label="Remove">
                                    <Trash2 size={12} />
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}

            {(suggested.length + other.length) > 0 && (
                <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Add consent</div>
                    <div className="flex flex-wrap gap-2">
                        {suggested.map(c => (
                            <button key={c.id} type="button" onClick={() => add(c.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100">
                                <Plus size={11} /> {c.title}
                                <span className="text-[9px] uppercase tracking-wider text-blue-500">Suggested</span>
                            </button>
                        ))}
                        {other.map(c => (
                            <button key={c.id} type="button" onClick={() => add(c.id)} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50">
                                <Plus size={11} /> {c.title}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

// ── Photos section (subset of documents where isPhoto === true) ─────────

function PhotosSection({
    photos, onChange,
}: {
    photos: TemplateDocument[];
    onChange: (next: TemplateDocument[]) => void;
}) {
    const setField = (id: string, patch: Partial<TemplateDocument>) =>
        onChange(photos.map(p => p.id === id ? { ...p, ...patch } : p));
    const remove = (id: string) => onChange(photos.filter(p => p.id !== id));
    const addPreset = (preset: Partial<TemplateDocument>) => onChange([
        ...photos,
        {
            id: `doc-${Math.random().toString(36).slice(2, 8)}`,
            label: preset.label ?? 'New photo',
            category: preset.category ?? 'Photo',
            mode: preset.mode ?? 'required',
            source: preset.source ?? 'Applicant',
            isPhoto: true,
            ...preset,
        },
    ]);

    return (
        <section>
            <SectionHeader icon={Camera} title="Identity & Photo slots" subtitle="Applicant headshot, CDL front/back, vehicle photos, etc." count={photos.length} />

            {photos.length === 0 ? (
                <EmptyHint message="No photo slots configured for this step." />
            ) : (
                <div className="space-y-2">
                    {photos.map(p => (
                        <div key={p.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 grid grid-cols-1 md:grid-cols-[40px_minmax(0,1fr)_auto] gap-3 items-center">
                            <span className="h-9 w-9 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                                <Camera size={14} />
                            </span>
                            <div className="min-w-0 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_120px_120px_120px] gap-2 items-center">
                                <input
                                    type="text"
                                    value={p.label}
                                    onChange={e => setField(p.id, { label: e.target.value })}
                                    className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                                />
                                <CategorySelect value={p.category} onChange={(c) => setField(p.id, { category: c })} />
                                <SourceSelect value={p.source} onChange={(s) => setField(p.id, { source: s })} />
                                <ModeSelect value={p.mode} onChange={(m) => setField(p.id, { mode: m })} />
                            </div>
                            <button type="button" onClick={() => remove(p.id)} className="h-9 w-9 rounded-md border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 inline-flex items-center justify-center justify-self-end" aria-label="Remove">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 self-center mr-1">Quick add</span>
                {([
                    { label: 'Applicant Photo', category: 'Photo' as const },
                    { label: 'CDL Front',       category: 'Identity' as const },
                    { label: 'CDL Back',        category: 'Identity' as const },
                    { label: 'Medical Card',    category: 'Medical' as const },
                    { label: 'Tractor Photo',   category: 'Photo' as const },
                ]).map(preset => (
                    <button
                        key={preset.label}
                        type="button"
                        onClick={() => addPreset(preset)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50 hover:border-slate-300"
                    >
                        <Plus size={11} /> {preset.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

// ── Documents section ───────────────────────────────────────────────────

function DocumentsSection({
    documents, onChange,
}: {
    documents: TemplateDocument[];
    onChange: (next: TemplateDocument[]) => void;
}) {
    const setField = (id: string, patch: Partial<TemplateDocument>) =>
        onChange(documents.map(d => d.id === id ? { ...d, ...patch } : d));
    const remove = (id: string) => onChange(documents.filter(d => d.id !== id));
    const addNew = () => onChange([
        ...documents,
        {
            id: `doc-${Math.random().toString(36).slice(2, 8)}`,
            label: 'New document',
            category: 'Other',
            mode: 'optional',
            source: 'Applicant',
        },
    ]);

    return (
        <section>
            <SectionHeader icon={FileText} title="Documents" subtitle="PDFs and uploads that aren't photos. Toggle 'requires signature' for forms applicant must sign." count={documents.length} />

            {documents.length === 0 ? (
                <EmptyHint message="No document slots configured for this step." />
            ) : (
                <div className="space-y-2">
                    {/* Column header — visible at sm+ to label the row grid below. */}
                    <div className="hidden sm:grid grid-cols-[minmax(0,2fr)_140px_140px_140px_72px_minmax(0,2fr)_40px] gap-2 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        <span>Label</span>
                        <span>Category</span>
                        <span>Source</span>
                        <span>Mode</span>
                        <span className="text-center">Sign?</span>
                        <span>Helper / condition</span>
                        <span />
                    </div>
                    {documents.map(d => (
                        <div key={d.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 grid grid-cols-1 sm:grid-cols-[minmax(0,2fr)_140px_140px_140px_72px_minmax(0,2fr)_40px] gap-2 items-center">
                            <input
                                type="text" value={d.label} onChange={e => setField(d.id, { label: e.target.value })}
                                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 w-full"
                            />
                            <CategorySelect value={d.category} onChange={(c) => setField(d.id, { category: c })} />
                            <SourceSelect value={d.source} onChange={(s) => setField(d.id, { source: s })} />
                            <ModeSelect value={d.mode} onChange={(m) => setField(d.id, { mode: m })} />
                            <label className="h-9 inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white cursor-pointer hover:bg-slate-50">
                                <input
                                    type="checkbox"
                                    checked={!!d.requiresSignature}
                                    onChange={e => setField(d.id, { requiresSignature: e.target.checked })}
                                    className="accent-blue-600 h-3.5 w-3.5"
                                    aria-label="Requires signature"
                                />
                                <Pencil size={11} className="text-slate-400" />
                            </label>
                            <input
                                type="text"
                                value={d.mode === 'conditional' ? (d.condition ?? '') : (d.helper ?? '')}
                                onChange={e => setField(d.id, d.mode === 'conditional' ? { condition: e.target.value } : { helper: e.target.value })}
                                placeholder={d.mode === 'conditional' ? 'When does this apply?' : 'Helper text shown to applicant'}
                                className="h-9 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
                            />
                            <button type="button" onClick={() => remove(d.id)} className="h-9 w-9 rounded-md border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-200 inline-flex items-center justify-center justify-self-end" aria-label="Remove">
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <Button variant="outline" size="sm" onClick={addNew} className="mt-3 gap-1.5">
                <Plus className="h-4 w-4" /> Add document slot
            </Button>
        </section>
    );
}

// ── Bookings section ───────────────────────────────────────────────────

function BookingsSection({
    bookings, onChange,
}: {
    bookings: BookingSlot[];
    onChange: (next: BookingSlot[]) => void;
}) {
    const setField = (id: string, patch: Partial<BookingSlot>) =>
        onChange(bookings.map(b => b.id === id ? { ...b, ...patch } : b));
    const remove = (id: string) => onChange(bookings.filter(b => b.id !== id));
    const addPreset = (preset: Partial<BookingSlot>) => onChange([
        ...bookings,
        {
            id: `bk-${Math.random().toString(36).slice(2, 8)}`,
            label: preset.label ?? 'New booking',
            type: preset.type ?? 'other',
            mode: preset.mode ?? 'required',
            ...preset,
        },
    ]);

    const iconFor = (type: BookingSlot['type']) => {
        if (type === 'substance_test') return Stethoscope;
        if (type === 'dot_physical')   return Stethoscope;
        if (type === 'road_test')      return Truck;
        if (type === 'orientation')    return Briefcase;
        if (type === 'fingerprinting') return Shield;
        return CalendarClock;
    };

    return (
        <section>
            <SectionHeader icon={CalendarClock} title="Bookings & appointments" subtitle="Substance test, DOT physical, road test, orientation, fingerprinting." count={bookings.length} />

            {bookings.length === 0 ? (
                <EmptyHint message="No appointments scheduled at this step." />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {bookings.map(b => {
                        const Icon = iconFor(b.type);
                        return (
                            <div key={b.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="h-8 w-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                        <Icon size={14} />
                                    </span>
                                    <input
                                        type="text" value={b.label} onChange={e => setField(b.id, { label: e.target.value })}
                                        className="flex-1 text-[12px] font-bold bg-transparent focus:outline-none focus:bg-slate-50 focus:px-2 focus:py-0.5 focus:rounded"
                                    />
                                    <button type="button" onClick={() => remove(b.id)} className="h-7 w-7 rounded-md border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 flex items-center justify-center" aria-label="Remove">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <select
                                        value={b.type}
                                        onChange={e => setField(b.id, { type: e.target.value as BookingSlot['type'] })}
                                        className="h-8 px-2 rounded border border-slate-200 bg-white text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                    >
                                        {(Object.keys(BOOKING_TYPE_META) as BookingSlot['type'][]).map(t => (
                                            <option key={t} value={t}>{BOOKING_TYPE_META[t].label}</option>
                                        ))}
                                    </select>
                                    <ModeSelect value={b.mode} onChange={(m) => setField(b.id, { mode: m })} />
                                </div>
                                <input
                                    type="text" value={b.venue ?? ''} placeholder="Venue / clinic"
                                    onChange={e => setField(b.id, { venue: e.target.value })}
                                    className="mt-2 w-full h-8 px-2 rounded border border-slate-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                                <input
                                    type="text" value={b.helper ?? ''} placeholder="Helper text shown on the booking card"
                                    onChange={e => setField(b.id, { helper: e.target.value })}
                                    className="mt-2 w-full h-8 px-2 rounded border border-slate-200 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                {[
                    { label: 'Book Substance Test', type: 'substance_test' as const, venue: 'Concentra / Quest Diagnostics' },
                    { label: 'Book DOT Physical',   type: 'dot_physical' as const,   venue: 'NRCME registry examiner' },
                    { label: 'Schedule Road Test',  type: 'road_test' as const,      venue: 'Company yard' },
                    { label: 'Schedule Orientation', type: 'orientation' as const,   venue: 'Terminal training room' },
                    { label: 'Fingerprinting',      type: 'fingerprinting' as const, venue: 'IdentoGO partner site' },
                ].map(preset => (
                    <button
                        key={preset.label}
                        type="button"
                        onClick={() => addPreset(preset)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 text-[11px] font-semibold hover:bg-slate-50"
                    >
                        <Plus size={11} /> {preset.label}
                    </button>
                ))}
            </div>
        </section>
    );
}

// ── Tab: Preview (renders the template as the applicant will see it) ────

function TemplatePreviewTab({ template }: { template: HiringTemplate }) {
    const enabledSteps = template.steps.filter(s => s.enabled);
    const [stepId, setStepId] = useState<PipelineStepId>(enabledSteps[0]?.stepId ?? 'application_review');
    const step = template.steps.find(s => s.stepId === stepId) ?? template.steps[0];

    return (
        <div>
            <SectionHeader
                icon={Eye}
                title="Applicant preview"
                subtitle="This is exactly what an applicant sees on each step — form fields, consents, photo uploads, documents, and bookings. Read-only here."
                count={enabledSteps.length}
            />

            {/* Step picker (mini progress strip) */}
            <div className="flex flex-wrap gap-1.5 mb-5">
                {enabledSteps.map(s => {
                    const meta = PIPELINE_BLUEPRINT.find(b => b.id === s.stepId)!;
                    const isActive = stepId === s.stepId;
                    return (
                        <button
                            key={s.stepId}
                            type="button"
                            onClick={() => setStepId(s.stepId)}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-[11px] font-bold transition-colors',
                                isActive
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300',
                            )}
                        >
                            {meta.label}
                        </button>
                    );
                })}
            </div>

            {/* Step-side instruction */}
            {step.instruction && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-[12px] text-blue-900 mb-5 flex items-start gap-2">
                    <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <span>{step.instruction}</span>
                </div>
            )}

            {/* Application form preview (only on the Application Review step) */}
            {step.stepId === 'application_review' && template.formFields.length > 0 && (
                <PreviewSection title="Application Form" subtitle="Fields the applicant fills out. Required fields are marked with a red asterisk.">
                    <ApplicationFormPreview fields={template.formFields} />
                </PreviewSection>
            )}

            {/* Consents */}
            {step.consents.length > 0 && (
                <PreviewSection title="Consents" subtitle="The applicant reads each form and signs in the modal that opens.">
                    <PreviewConsents consents={step.consents} />
                </PreviewSection>
            )}

            {/* Photos / Identity */}
            {step.documents.filter(d => d.isPhoto).length > 0 && (
                <PreviewSection title="Identity & photos" subtitle="Live photo capture tiles — admins see the same upload widget the applicant uses.">
                    <PreviewPhotos photos={step.documents.filter(d => d.isPhoto)} />
                </PreviewSection>
            )}

            {/* Documents */}
            {step.documents.filter(d => !d.isPhoto).length > 0 && (
                <PreviewSection title="Documents" subtitle="File-upload slots.">
                    <PreviewDocuments documents={step.documents.filter(d => !d.isPhoto)} />
                </PreviewSection>
            )}

            {/* Bookings */}
            {step.bookings.length > 0 && (
                <PreviewSection title="Bookings & appointments" subtitle="Calendar-style buttons the recruiter clicks to schedule the applicant.">
                    <PreviewBookings bookings={step.bookings} />
                </PreviewSection>
            )}

            {/* Empty state when a step has nothing configured */}
            {step.consents.length === 0 && step.documents.length === 0 && step.bookings.length === 0 && !(step.stepId === 'application_review' && template.formFields.length > 0) && (
                <EmptyHint message="This step has no consents, documents, or bookings configured yet. Add some in the other tabs to see them previewed here." />
            )}
        </div>
    );
}

function PreviewSection({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-5">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function ApplicationFormPreview({ fields }: { fields: TemplateFormField[] }) {
    const grouped = useMemo(() => {
        const m = new Map<TemplateFormField['section'], TemplateFormField[]>();
        for (const f of fields) {
            const arr = m.get(f.section) ?? [];
            arr.push(f);
            m.set(f.section, arr);
        }
        return m;
    }, [fields]);

    const renderField = (f: TemplateFormField) => {
        const baseCls = 'w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300';
        if (f.type === 'textarea') {
            return <textarea rows={3} placeholder={f.helper} className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300" />;
        }
        if (f.type === 'select') {
            return (
                <select className={baseCls}>
                    <option value="">Choose…</option>
                    {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            );
        }
        if (f.type === 'ssn') return <input type="text" placeholder="••• - •• - ••••" className={cn(baseCls, 'font-mono')} />;
        if (f.type === 'date') return <input type="date" className={cn(baseCls, 'font-mono')} />;
        if (f.type === 'email') return <input type="email" placeholder="name@example.com" className={baseCls} />;
        if (f.type === 'phone') return <input type="tel" placeholder="(___) ___-____" className={cn(baseCls, 'font-mono')} />;
        return <input type="text" placeholder={f.helper} className={baseCls} />;
    };

    return (
        <div className="space-y-5">
            {(['Identity', 'Contact', 'Address', 'Employment', 'Driving Experience', 'Other'] as TemplateFormField['section'][]).map(section => {
                const list = grouped.get(section) ?? [];
                if (list.length === 0) return null;
                return (
                    <div key={section}>
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">{section}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {list.map(f => (
                                <div key={f.id}>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1 block">
                                        {f.label} {f.required && <span className="text-rose-600">*</span>}
                                    </label>
                                    {renderField(f)}
                                    {f.helper && <p className="text-[10px] text-slate-500 mt-1">{f.helper}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function PreviewConsents({ consents }: { consents: TemplateConsent[] }) {
    const [active, setActive] = useState<ConsentForm | null>(null);
    const [signed, setSigned] = useState<Record<string, string>>({});
    const [branding] = useCompanyBranding();

    return (
        <>
            <ul className="divide-y divide-slate-100 -mx-5">
                {consents.map(c => {
                    const form = CONSENT_BY_ID[c.consentId];
                    const sig = signed[form.id];
                    return (
                        <li key={form.id} className="px-5 py-3 flex items-start gap-3">
                            <span className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                                sig ? 'bg-emerald-50 text-emerald-600' : 'bg-violet-50 text-violet-600')}>
                                {sig ? <Check size={16} /> : <FileText size={16} />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[13px] font-bold text-slate-900">{form.title}</span>
                                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                        c.mode === 'required'    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : c.mode === 'conditional' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      :                            'bg-slate-100 text-slate-600 border border-slate-200')}>
                                        {c.mode}
                                    </span>
                                    {sig && (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                                            <Check size={10} /> Signed
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">{form.subtitle} · {form.citation}</p>
                                {sig && <img src={sig} alt="signature" className="mt-1.5 h-10 border border-slate-200 rounded bg-white object-contain" />}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button type="button" onClick={() => setActive(form)} className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50">
                                    <Eye size={11} /> View
                                </button>
                                <button
                                    type="button"
                                    onClick={() => downloadConsentPdf({ consent: form, branding, mode: 'blank' })}
                                    title="Download blank PDF (for offline signing)"
                                    className="h-9 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-slate-50"
                                >
                                    <FileDown size={11} /> Blank
                                </button>
                                {sig && (
                                    <button
                                        type="button"
                                        onClick={() => downloadConsentPdf({ consent: form, branding, mode: 'signed', signatureDataUrl: sig })}
                                        title="Download the captured-signature copy"
                                        className="h-9 px-3 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium inline-flex items-center gap-1.5 hover:bg-emerald-100"
                                    >
                                        <Download size={11} /> Signed
                                    </button>
                                )}
                                <button type="button" onClick={() => setActive(form)}
                                    className={cn('h-9 px-3 rounded-md text-sm font-medium inline-flex items-center gap-1.5 transition-colors',
                                        sig ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700')}>
                                    <Pencil size={11} /> {sig ? 'Re-sign' : 'Sign'}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>

            {active && (
                <ConsentSignerModal
                    consent={active}
                    initialSignature={signed[active.id]}
                    onClose={() => setActive(null)}
                    onSign={(dataUrl) => {
                        setSigned(s => dataUrl ? { ...s, [active.id]: dataUrl } : (() => { const { [active.id]: _, ...rest } = s; return rest; })());
                        setActive(null);
                    }}
                />
            )}
        </>
    );
}

function ConsentSignerModal({
    consent, initialSignature, onSign, onClose,
}: {
    consent: ConsentForm;
    initialSignature?: string;
    onSign: (dataUrl: string | null) => void;
    onClose: () => void;
}) {
    const [sig, setSig] = useState<string | null>(initialSignature ?? null);
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            <ShieldCheck size={11} className="text-emerald-500" /> Sign consent
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{consent.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{consent.subtitle} · {consent.citation}</p>
                    </div>
                    <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                        Close
                    </button>
                </div>
                <div className="px-5 py-4 overflow-y-auto space-y-3 text-[13px] text-slate-700 leading-relaxed">
                    {consent.body.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                </div>
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Applicant signature</div>
                    <SignaturePad value={sig} onChange={setSig} helper="Sign with mouse or touch. The captured image is attached to this consent." />
                </div>
                <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-amber-500" />
                        Captured signature is stored as a PNG and attached to this consent.
                    </span>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!sig}
                            onClick={() => onSign(sig)}
                            className="h-8 px-4 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                        >
                            <Check size={12} /> Save signature
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function PreviewPhotos({ photos }: { photos: TemplateDocument[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(p => (
                <div key={p.id} className="space-y-1.5">
                    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                            <div className="text-[11px] font-bold text-slate-700 truncate">{p.label}</div>
                        </div>
                        <div className={cn('bg-slate-50 flex items-center justify-center text-slate-400',
                            p.category === 'Photo' ? 'aspect-square' : 'aspect-[16/10]')}>
                            <div className="text-center px-3">
                                <Camera size={20} className="mx-auto text-slate-300 mb-1" />
                                <div className="text-[10px] font-bold uppercase tracking-wider">Tap to upload</div>
                            </div>
                        </div>
                        {p.helper && <div className="px-3 py-1.5 text-[10px] text-slate-500 border-t border-slate-100">{p.helper}</div>}
                    </div>
                    <div className="flex items-center gap-1.5 px-1 flex-wrap">
                        <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                            p.mode === 'required'    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : p.mode === 'conditional' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          :                            'bg-slate-100 text-slate-600 border border-slate-200')}>
                            {p.mode}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{p.source}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PreviewDocuments({ documents }: { documents: TemplateDocument[] }) {
    return (
        <ul className="divide-y divide-slate-100 -mx-5">
            {documents.map(d => (
                <li key={d.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-bold text-slate-900">{d.label}</span>
                            <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                d.mode === 'required'    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : d.mode === 'conditional' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              :                            'bg-slate-100 text-slate-600 border border-slate-200')}>{d.mode}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{d.category}</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{d.source}</span>
                            {d.requiresSignature && <span className="text-[9px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1"><Pencil size={9} /> Signature</span>}
                        </div>
                        {d.helper && <p className="text-[11px] text-slate-500 mt-0.5">{d.helper}</p>}
                        {d.condition && <p className="text-[10px] text-amber-700 mt-0.5">When: {d.condition}</p>}
                    </div>
                    <button type="button" className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-blue-700 shrink-0">
                        <Plus size={11} /> Upload
                    </button>
                </li>
            ))}
        </ul>
    );
}

function PreviewBookings({ bookings }: { bookings: BookingSlot[] }) {
    return (
        <ul className="divide-y divide-slate-100 -mx-5">
            {bookings.map(b => {
                const meta = BOOKING_TYPE_META[b.type];
                return (
                    <li key={b.id} className="px-5 py-3 flex items-start gap-3">
                        <span className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <CalendarClock size={16} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[13px] font-bold text-slate-900">{b.label}</span>
                                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
                                    b.mode === 'required'    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : b.mode === 'conditional' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  :                            'bg-slate-100 text-slate-600 border border-slate-200')}>{b.mode}</span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{meta.label}</span>
                            </div>
                            {b.helper && <p className="text-[11px] text-slate-500 mt-0.5">{b.helper}</p>}
                            {b.venue && <p className="text-[10px] text-slate-500 mt-0.5">Venue: {b.venue}</p>}
                        </div>
                        <button type="button" className="h-9 px-3 rounded-md bg-blue-600 text-white text-sm font-medium inline-flex items-center gap-1.5 hover:bg-blue-700 shrink-0">
                            <CalendarClock size={11} /> Book
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

// ── Small reusable bits ────────────────────────────────────────────────

function EmptyHint({ message }: { message: string }) {
    return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center text-[11px] text-slate-500">{message}</div>;
}

function ModeSelect({ value, onChange }: { value: RequirementMode; onChange: (v: RequirementMode) => void }) {
    // Dot-only colour cue keeps the row quiet — no full-cell red wash.
    const tone = value === 'required'    ? 'bg-rose-500'
               : value === 'conditional' ? 'bg-amber-500'
               :                            'bg-slate-300';
    return (
        <div className="relative">
            <span className={cn('absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full pointer-events-none', tone)} />
            <select
                value={value}
                onChange={e => onChange(e.target.value as RequirementMode)}
                className="h-8 w-full pl-6 pr-6 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 appearance-none"
            >
                <option value="required">Required</option>
                <option value="optional">Optional</option>
                <option value="conditional">Conditional</option>
            </select>
            <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
    );
}

function CategorySelect({ value, onChange }: { value: DocumentCategory; onChange: (v: DocumentCategory) => void }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value as DocumentCategory)}
            className="h-8 w-full px-2 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
        >
            {(['Application','Identity','Photo','Background','MVR','PSP','Substance','DOT','Medical','Insurance','Other'] as DocumentCategory[]).map(c => (
                <option key={c} value={c}>{c}</option>
            ))}
        </select>
    );
}

function SourceSelect({ value, onChange }: { value: TemplateDocument['source']; onChange: (v: TemplateDocument['source']) => void }) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value as TemplateDocument['source'])}
            className="h-8 w-full px-2 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
        >
            <option value="Applicant">Applicant</option>
            <option value="Recruiter">Recruiter</option>
            <option value="Vendor">Vendor</option>
        </select>
    );
}

function SummaryTile({ label, value, sub, mono, Icon }: { label: string; value: React.ReactNode; sub?: string; mono?: boolean; Icon?: React.ElementType }) {
    return (
        <div className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            <div className="flex items-center justify-between gap-2">
                <div className={cn('text-base font-black tabular-nums leading-none text-slate-900', mono && 'font-mono')}>{value}</div>
                {Icon && <Icon size={14} className="text-slate-400" />}
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1 leading-tight">{label}</div>
            {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
        </div>
    );
}

function ConsentPreviewModal({ consent, onClose }: { consent: ConsentForm; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            <ShieldCheck size={11} className="text-emerald-500" /> Consent preview
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{consent.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">{consent.subtitle} · {consent.citation}</p>
                    </div>
                    <button type="button" onClick={onClose} className="h-8 px-3 rounded-md border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50">
                        Close
                    </button>
                </div>
                <div className="px-5 py-4 overflow-y-auto space-y-3 text-[13px] text-slate-700 leading-relaxed">
                    {consent.body.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
                </div>
                <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <span className="text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                        <AlertCircle size={12} className="text-amber-500" />
                        {consent.requiresSignature ? 'Applicant must sign — a signed PDF is generated and attached to the file.' : 'Acknowledgment only.'}
                    </span>
                    <button type="button" onClick={onClose} className="h-8 px-4 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Done</button>
                </div>
            </div>
        </div>
    );
}

// ── Branding panel ───────────────────────────────────────────────────────
// Lives in the left column above the template list. Logo + company name +
// contact + accent color are baked into every generated consent PDF.

export function BrandingPanel({ flat = false }: { flat?: boolean }) {
    const [branding, update] = useCompanyBranding();
    const [open, setOpen] = useState(true);

    const fields = (
        <div className={cn('space-y-3', !flat && 'p-4')}>
                    <PhotoUpload
                        label="Company logo"
                        value={branding.logoDataUrl ?? null}
                        onChange={(url) => update({ logoDataUrl: url ?? undefined })}
                        aspect="landscape"
                        helper="PNG / JPG. Shows in the header of every generated form."
                    />
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Company name</label>
                        <Input value={branding.name} onChange={e => update({ name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Tagline</label>
                        <Input
                            value={branding.tagline ?? ''}
                            onChange={e => update({ tagline: e.target.value })}
                            placeholder="Safety. Compliance. Driven."
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Address</label>
                        <Input
                            value={branding.address ?? ''}
                            onChange={e => update({ address: e.target.value })}
                            placeholder="1240 Logistics Way · Aberdeen, MD 21001"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Phone</label>
                            <Input type="tel" value={branding.phone ?? ''} onChange={e => update({ phone: e.target.value })} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Email</label>
                            <Input type="email" value={branding.email ?? ''} onChange={e => update({ email: e.target.value })} className="font-mono" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Accent color</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={branding.accentColor}
                                onChange={e => update({ accentColor: e.target.value })}
                                className="h-10 w-14 rounded-md border border-slate-200 bg-white cursor-pointer"
                            />
                            <Input value={branding.accentColor} onChange={e => update({ accentColor: e.target.value })} className="flex-1 font-mono" />
                        </div>
                        <p className="text-xs text-slate-500">Used as the PDF header bar colour.</p>
                    </div>
        </div>
    );

    if (flat) return fields;

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full text-left px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2"
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className="h-7 w-7 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <ShieldCheck size={14} />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">Company branding</h3>
                        <p className="text-[10px] text-slate-500 truncate">Logo + name printed on every form.</p>
                    </div>
                </div>
                {open ? <ChevronDown size={14} className="text-slate-400 shrink-0" /> : <ChevronRight size={14} className="text-slate-400 shrink-0" />}
            </button>
            {open && fields}
        </div>
    );
}

// keep unused symbol warning quiet for one icon we may use later
void IdCard;
