import { useState } from "react";
import { FileText, LayoutTemplate, Plus, Search, Check, ArrowRight, Info, X, Lock, FileSearch, FileSignature, ClipboardCheck, ShieldCheck, ShieldAlert, FlaskConical, BadgeCheck, HeartPulse, CalendarCheck, DatabaseZap, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTabs } from "@/components/ui/SubTabs";
import { POLICY_FORMS, THEME_HEX } from "./policy-forms.data";
import { HiringFormView } from "./formRegistry";
import { TemplateBuilder } from "./TemplateBuilder";
import { TemplateTester } from "./TemplateTester";
import { ChecklistBuilder } from "./ChecklistBuilder";
import { useChecklists, totalChecklistItems, checklistName } from "./checklists.data";
import { useHiringTemplates, totalForms, driverTypeName, type HiringTemplate } from "./hiring-templates.data";

// Forms built so far. (Form builders are wired up per form as we add them.)
const FORMS = [
    { id: "mvr", name: "MVR — Motor Vehicle Record", desc: "US state driving record (MVR) with report upload, violations and accidents.", Icon: FileSearch, accent: "bg-emerald-50 text-emerald-600" },
    { id: "driver-abstract", name: "Driver Abstract", desc: "Canadian province driving abstract (Ontario, Alberta 5-Year, …) with report upload, violations and accidents.", Icon: FileSearch, accent: "bg-rose-50 text-rose-600" },
    { id: "employment-verification", name: "Employment Verification", desc: "Consolidated previous-employer reference (§391.23 / §40.25) — rating, safety evaluation, signatures and completed-response upload.", Icon: FileSignature, accent: "bg-violet-50 text-violet-600" },
    { id: "road-test", name: "Road Test Evaluation", desc: "FMCSA §391.31 road test — driver & equipment, scored sections with checklists, and certification.", Icon: ClipboardCheck, accent: "bg-amber-50 text-amber-600" },
    { id: "psp", name: "PSP — Pre-Employment Screening", desc: "FMCSA Pre-Employment Screening Program — 5-year crash · 3-year inspection history, with report PDF.", Icon: ShieldCheck, accent: "bg-sky-50 text-sky-600" },
    { id: "cvdr-cda", name: "CVDR / CDA", desc: "Combined Canadian commercial driver record (CVDR & CDA) with report PDF, crashes and inspections.", Icon: ShieldCheck, accent: "bg-indigo-50 text-indigo-600" },
    { id: "criminal-background", name: "Criminal Background Check", desc: "Consent, scope and results of the criminal background check, with report upload and signature.", Icon: ShieldAlert, accent: "bg-rose-50 text-rose-600" },
    { id: "substance-testing", name: "Substance Testing", desc: "DOT / non-DOT drug & alcohol test (49 CFR Part 40) — collection, lab, result, lab-report upload and consent.", Icon: FlaskConical, accent: "bg-purple-50 text-purple-600" },
    { id: "dot-verification", name: "DOT / Employment Verification", desc: "Previous DOT employer verification — §40.25 drug & alcohol history, §391.23 accidents, signature and response upload.", Icon: BadgeCheck, accent: "bg-teal-50 text-teal-600" },
    { id: "medical-card", name: "Medical Card Renewal", desc: "DOT Medical Examiner's Certificate (MEC) — examiner & registry #, exam/expiry dates, qualification result, restrictions and card upload.", Icon: HeartPulse, accent: "bg-pink-50 text-pink-600" },
    { id: "annual-review", name: "Annual Review (§391.25)", desc: "Carrier's annual review of the driving record — MVR obtained, violations in period, qualification determination and reviewer signature.", Icon: CalendarCheck, accent: "bg-indigo-50 text-indigo-600" },
    { id: "clearinghouse-query", name: "Clearinghouse Query", desc: "FMCSA Drug & Alcohol Clearinghouse — annual limited query escalating to a full query if information comes back, with result upload.", Icon: DatabaseZap, accent: "bg-cyan-50 text-cyan-600" },
];

/**
 * Settings -> Hiring Process -> Hiring
 *
 * Forms & Template Builder — the setup workspace. The flow is:
 *   1. Create forms (the building blocks applicants fill in)
 *   2. Build templates (combine forms into a hiring workflow)
 *   3. Use templates when inviting applicants
 *
 * This is the settings / setup UI only — the form builder and template builder
 * are wired up later.
 */

type Tab = "forms" | "policy" | "templates" | "checklists";

export function HiringBuilderPage({ carrierId }: { carrierId?: string }) {
    const [tab, setTab] = useState<Tab>("forms");
    const [flash, setFlash] = useState<string | null>(null);
    const [openForm, setOpenForm] = useState<string | null>(null);
    const [editTemplate, setEditTemplate] = useState<string | null>(null);
    const [testTemplate, setTestTemplate] = useState<HiringTemplate | null>(null);
    const [editChecklist, setEditChecklist] = useState<string | null>(null);
    const { templates, remove: removeTemplate } = useHiringTemplates(carrierId);
    const { checklists, remove: removeChecklist } = useChecklists();

    if (testTemplate) return <TemplateTester template={testTemplate} onBack={() => setTestTemplate(null)} />;
    if (editTemplate !== null) return <TemplateBuilder templateId={editTemplate} carrierId={carrierId} onBack={() => setEditTemplate(null)} />;
    if (editChecklist !== null) return <ChecklistBuilder checklistId={editChecklist} onBack={() => setEditChecklist(null)} />;
    if (openForm !== null) return <HiringFormView formId={openForm} onBack={() => setOpenForm(null)} />;

    const TABS: { key: Tab; label: string; Icon: React.ElementType; count: number }[] = [
        { key: "forms", label: "Forms", Icon: FileText, count: FORMS.length },
        { key: "policy", label: "Policy", Icon: FileSignature, count: POLICY_FORMS.length },
        { key: "templates", label: "Workflows", Icon: LayoutTemplate, count: templates.length },
        { key: "checklists", label: "Checklists", Icon: ListChecks, count: checklists.length },
    ];
    const tabCount = tab === "forms" ? FORMS.length : tab === "policy" ? POLICY_FORMS.length : tab === "templates" ? templates.length : checklists.length;
    const tabLabel = tab === "forms" ? "Forms" : tab === "policy" ? "Policy & Signature Forms" : tab === "templates" ? "Hiring Workflows" : "Approval Checklists";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Hiring Process · Setup</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Forms &amp; Workflow Builder</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Set up the forms applicants complete, then sequence them into reusable hiring workflows — License Check, Employment Check, and more.
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
                {flash && (
                    <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <p className="flex-1">{flash}</p>
                        <button type="button" onClick={() => setFlash(null)} className="text-blue-400 hover:text-blue-600"><X className="h-4 w-4" /></button>
                    </div>
                )}

                {/* Tabs */}
                <div>
                    <SubTabs
                        tabs={TABS.map((t) => ({ id: t.key, label: t.label, icon: t.Icon, count: t.count }))}
                        activeId={tab}
                        onChange={(id) => setTab(id as Tab)}
                    />

                    <div className="mt-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Toolbar */}
                        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-semibold text-slate-700">
                                {tabLabel}
                                <span className="ml-2 font-normal text-slate-400">{tabCount}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="relative w-56">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <Input disabled placeholder={`Search ${tab}…`} className="h-9 pl-9" />
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        if (tab === "templates") { setEditTemplate("new"); return; }
                                        if (tab === "checklists") { setEditChecklist("new"); return; }
                                        setFlash(
                                            tab === "forms"
                                                ? "The form builder is the next step — share the form details and we’ll build it here."
                                                : "Policy & signature forms are config-driven — share the statement text and we’ll add it here.",
                                        );
                                    }}
                                >
                                    <Plus className="h-4 w-4" /> {tab === "forms" ? "New Form" : tab === "policy" ? "New Policy" : tab === "templates" ? "New Workflow" : "New Checklist"}
                                </Button>
                            </div>
                        </div>

                        {/* Body */}
                        {tab === "checklists" ? (
                            <div className="divide-y divide-slate-100">
                                {checklists.map((c) => (
                                    <div key={c.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><ListChecks className="h-5 w-5" /></div>
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                                    {c.name}
                                                    {c.locked && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"><Lock className="h-2.5 w-2.5" /> Default</span>}
                                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{c.stages.length} stages · {totalChecklistItems(c)} items</span>
                                                </p>
                                                {c.description && <p className="truncate text-sm text-slate-500">{c.description}</p>}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setEditChecklist(c.id)}>Edit</Button>
                                            {!c.locked && <Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Delete checklist “${c.name}”?`)) removeChecklist(c.id); }} className="text-rose-500 hover:text-rose-600">Delete</Button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : tab === "forms" ? (
                            <div className="divide-y divide-slate-100">
                                {FORMS.map((f) => (
                                    <div key={f.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", f.accent)}>
                                                <f.Icon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900">{f.name}</p>
                                                <p className="truncate text-sm text-slate-500">{f.desc}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button size="sm" onClick={() => setOpenForm(f.id)}>Open <ArrowRight className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : tab === "policy" ? (
                            <div className="divide-y divide-slate-100">
                                {POLICY_FORMS.map((p) => (
                                    <div key={p.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${THEME_HEX[p.theme]}1a`, color: THEME_HEX[p.theme] }}>
                                                <FileSignature className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900">{p.title} <span style={{ color: THEME_HEX[p.theme] }}>{p.accentTitle}</span></p>
                                                <p className="truncate text-sm text-slate-500">{p.blurb}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end">
                                            <Button size="sm" onClick={() => setOpenForm(p.id)}>Open <ArrowRight className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : templates.length ? (
                            <div className="divide-y divide-slate-100">
                                {templates.map((t) => (
                                    <div key={t.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-start gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                                                <LayoutTemplate className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                                    {t.name}
                                                    {t.driverType && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">{driverTypeName(t.driverType)}</span>}
                                                    {t.locked && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"><Lock className="h-2.5 w-2.5" /> Default</span>}
                                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{t.steps.length} steps · {totalForms(t)} forms</span>
                                                    {t.checklistId && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><ListChecks className="h-2.5 w-2.5" /> {checklistName(t.checklistId)}</span>}
                                                </p>
                                                {t.description && <p className="truncate text-sm text-slate-500">{t.description}</p>}
                                                <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {t.steps.slice(0, 6).map((s, i) => (
                                                        <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                                                            <span className="font-semibold text-slate-400">{i + 1}</span> {s.title}
                                                            <span className="text-slate-300">·</span><span className="text-slate-400">{s.formIds.length}</span>
                                                        </span>
                                                    ))}
                                                    {t.steps.length > 6 && <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-400">+{t.steps.length - 6} more</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setTestTemplate(t)}><FlaskConical className="h-4 w-4" /> Test</Button>
                                            <Button variant="outline" size="sm" onClick={() => setEditTemplate(t.id)}>Edit</Button>
                                            {!t.locked && <Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Delete workflow “${t.name}”?`)) removeTemplate(t.id); }} className="text-rose-500 hover:text-rose-600">Delete</Button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                                    <LayoutTemplate className="h-7 w-7" />
                                </div>
                                <h3 className="mt-5 text-base font-semibold text-slate-700">No workflows yet</h3>
                                <p className="mt-1.5 max-w-md text-sm text-slate-500">
                                    A workflow sequences your forms into named check modules — License Check, Employment Check, and more — in the order the hiring file runs.
                                </p>
                                <Button className="mt-5" onClick={() => setEditTemplate("new")}>
                                    <Plus className="h-4 w-4" /> New Workflow
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                    <Check className="h-3.5 w-3.5" /> Build forms first, then workflows. The builders are set up in the next step.
                </p>
            </div>
        </div>
    );
}
