import { useState } from "react";
import { FileText, LayoutTemplate, Plus, Search, Check, ArrowRight, Info, X, FileSearch, FileSignature, ClipboardCheck, ClipboardList, ShieldCheck, ShieldAlert, FlaskConical, BadgeCheck, HeartPulse, CalendarCheck, DatabaseZap, ListChecks, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTabs } from "@/components/ui/SubTabs";
import type { KebabItem } from "@/components/ui/KebabMenu";
import { TableGroupBand } from "@/components/ui/ListChrome";
import { RowTable, NameCell, ActionsCell, Paged, ROW_CLS, CELL } from "./SetupTable";
import { policyDocuments, THEME_HEX } from "./policy-forms.data";
import { HiringFormView } from "./formRegistry";
import { TemplateBuilder } from "./TemplateBuilder";
import { TemplateTester } from "./TemplateTester";
import { ChecklistBuilder } from "./ChecklistBuilder";
import { useChecklists, totalChecklistItems, checklistName } from "./checklists.data";
import { useQuizzes, QUIZ_CATEGORIES } from "./quizzes.data";
import { QuizRunner } from "./QuizRunner";
import { useHiringTemplates, totalForms, driverTypeName, type HiringTemplate } from "./hiring-templates.data";

// Forms built so far. (Form builders are wired up per form as we add them.)
const FORMS = [
    { id: "mvr", name: "Driver Non-Commercial Abstract", desc: "US state driving record (non-commercial abstract) with report upload, violations and accidents.", Icon: FileSearch, accent: "bg-emerald-50 text-emerald-600" },
    { id: "driver-abstract", name: "Driver Abstract", desc: "Canadian province driving abstract (Ontario, Alberta 5-Year, …) with report upload, violations and accidents.", Icon: FileSearch, accent: "bg-rose-50 text-rose-600" },
    { id: "employment-verification", name: "Employment Verification", desc: "Consolidated previous-employer reference (§391.23 / §40.25) — rating, safety evaluation, signatures and completed-response upload.", Icon: FileSignature, accent: "bg-violet-50 text-violet-600" },
    { id: "safety-performance-history", name: "Request for Employment and Safety Performance History", desc: "Previous-employer safety reference — employment summary, driving experience, equipment, U/S/G/E performance evaluation, plus incidents and violations.", Icon: ShieldCheck, accent: "bg-sky-50 text-sky-600" },
    { id: "old-safety-performance-history", name: "Old Safety & Performance History", desc: "The legacy Previous Employer & Safety History form (§391.23 / §40.25) — classic gray-table document layout.", Icon: FileText, accent: "bg-slate-100 text-slate-500" },
    { id: "road-test", name: "Road Test Evaluation", desc: "FMCSA §391.31 road test — driver & equipment, scored sections with checklists, and certification.", Icon: ClipboardCheck, accent: "bg-amber-50 text-amber-600" },
    { id: "psp", name: "PSP — Pre-Employment Screening", desc: "FMCSA Pre-Employment Screening Program — 5-year crash · 3-year inspection history, with report PDF.", Icon: ShieldCheck, accent: "bg-sky-50 text-sky-600" },
    { id: "cvdr-cda", name: "CVDR / CDA", desc: "Combined Canadian commercial driver record (CVDR & CDA) with report PDF, crashes and inspections.", Icon: ShieldCheck, accent: "bg-indigo-50 text-indigo-600" },
    { id: "criminal-background", name: "Criminal Background Check", desc: "Consent, scope and results of the criminal background check, with report upload and signature.", Icon: ShieldAlert, accent: "bg-rose-50 text-rose-600" },
    { id: "substance-testing", name: "Substance Testing", desc: "DOT / non-DOT drug & alcohol test (49 CFR Part 40) — collection, lab, result, lab-report upload and consent.", Icon: FlaskConical, accent: "bg-purple-50 text-purple-600" },
    { id: "dot-verification", name: "DOT / Employment Verification", desc: "Previous DOT employer verification — §40.25 drug & alcohol history, §391.23 accidents, signature and response upload.", Icon: BadgeCheck, accent: "bg-teal-50 text-teal-600" },
    { id: "medical-card", name: "Medical Card Renewal", desc: "DOT Medical Examiner's Certificate (MEC) — examiner & registry #, exam/expiry dates, qualification result, restrictions and card upload.", Icon: HeartPulse, accent: "bg-pink-50 text-pink-600" },
    { id: "annual-review", name: "Annual Review (§391.25)", desc: "Carrier's annual review of the driving record — abstract obtained, violations in period, qualification determination and reviewer signature.", Icon: CalendarCheck, accent: "bg-indigo-50 text-indigo-600" },
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

type Tab = "forms" | "policy" | "templates" | "checklists" | "quizzes";

export function HiringBuilderPage({ carrierId }: { carrierId?: string }) {
    const [tab, setTab] = useState<Tab>("templates");
    const [flash, setFlash] = useState<string | null>(null);
    const [openForm, setOpenForm] = useState<string | null>(null);
    const [openPreview, setOpenPreview] = useState(false);
    // A form's menu, the same for built forms and policy forms: open it, test it, see it as a PDF.
    const formActions = (id: string): KebabItem[] => [
        { label: "Open", icon: ArrowRight, onClick: () => { setOpenPreview(false); setOpenForm(id); } },
        { label: "Test", icon: FlaskConical, onClick: () => { setOpenPreview(false); setOpenForm(id); } },
        { label: "PDF view", icon: Eye, onClick: () => { setOpenPreview(true); setOpenForm(id); } },
    ];
    const [editTemplate, setEditTemplate] = useState<string | null>(null);
    const [testTemplate, setTestTemplate] = useState<HiringTemplate | null>(null);
    const [editChecklist, setEditChecklist] = useState<string | null>(null);
    const [previewQuiz, setPreviewQuiz] = useState<string | null>(null);
    const { templates, remove: removeTemplate } = useHiringTemplates(carrierId);
    const { checklists, remove: removeChecklist } = useChecklists();
    const { quizzes, remove: removeQuiz } = useQuizzes();
    // Only the workflow/onboarding policy documents — not the application consent forms.
    const policyForms = policyDocuments();

    if (testTemplate) return <TemplateTester template={testTemplate} onBack={() => setTestTemplate(null)} />;
    if (editTemplate !== null) return <TemplateBuilder templateId={editTemplate} carrierId={carrierId} onBack={() => setEditTemplate(null)} />;
    if (editChecklist !== null) return <ChecklistBuilder checklistId={editChecklist} onBack={() => setEditChecklist(null)} />;
    if (previewQuiz !== null) {
        const qz = quizzes.find((q) => q.id === previewQuiz);
        if (qz) return <QuizRunner quiz={qz} mode="preview" onClose={() => setPreviewQuiz(null)} />;
    }
    if (openForm !== null) return <HiringFormView formId={openForm} startPreview={openPreview} backLabel={tab === "policy" ? "Policy forms" : "Workflow builder"} onBack={() => { setOpenForm(null); setOpenPreview(false); }} />;

    const TABS: { key: Tab; label: string; Icon: React.ElementType; count: number }[] = [
        { key: "templates", label: "Workflows", Icon: LayoutTemplate, count: templates.length },
        { key: "forms", label: "Forms", Icon: FileText, count: FORMS.length },
        { key: "quizzes", label: "Quizzes", Icon: ClipboardList, count: quizzes.length },
        { key: "policy", label: "Policy", Icon: FileSignature, count: policyForms.length },
        { key: "checklists", label: "Checklists", Icon: ListChecks, count: checklists.length },
    ];
    const tabCount = tab === "forms" ? FORMS.length : tab === "quizzes" ? quizzes.length : tab === "policy" ? policyForms.length : tab === "templates" ? templates.length : checklists.length;
    const tabLabel = tab === "forms" ? "Forms" : tab === "quizzes" ? "Driver Quizzes" : tab === "policy" ? "Policy & Signature Forms" : tab === "templates" ? "Hiring Workflows" : "Approval Checklists";

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
                {/* Tabs — shared SubTabs, attached to the header band (same as Application Forms) */}
                <div className="mx-auto max-w-5xl px-6">
                    <SubTabs
                        tabs={TABS.map((t) => ({ id: t.key, label: t.label, icon: t.Icon }))}
                        activeId={tab}
                        onChange={(id) => setTab(id as Tab)}
                        bordered={false}
                    />
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
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
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
                                                : tab === "quizzes"
                                                    ? "Quizzes are seeded for now — share the questions and answers and we’ll add a new quiz here."
                                                    : "Policy & signature forms are config-driven — share the statement text and we’ll add it here.",
                                        );
                                    }}
                                >
                                    <Plus className="h-4 w-4" /> {tab === "forms" ? "New Form" : tab === "quizzes" ? "New Quiz" : tab === "policy" ? "New Policy" : tab === "templates" ? "New Workflow" : "New Checklist"}
                                </Button>
                            </div>
                        </div>

                        {/* Body */}
                        {/* Every tab is the same list: one line per row, the facts in columns,
                            and every action behind the three dots. A click on the row does the
                            first thing in its menu. */}
                        {tab === "checklists" ? (
                            <Paged key={tab} items={checklists}>{(rows) => (
                            <RowTable cols={[{ label: "Checklist" }, { label: "Stages", w: "w-28" }, { label: "Items", w: "w-28" }]}>
                                {rows.map((c) => (
                                    <tr key={c.id} className={ROW_CLS} onClick={() => setEditChecklist(c.id)}>
                                        <NameCell icon={ListChecks} accent="bg-emerald-50 text-emerald-600" name={c.name} sub={c.description} locked={c.locked} />
                                        <td className={CELL}>{c.stages.length}</td>
                                        <td className={CELL}>{totalChecklistItems(c)}</td>
                                        <ActionsCell name={c.name} items={[
                                            { label: "Edit", icon: Pencil, onClick: () => setEditChecklist(c.id) },
                                            ...(!c.locked ? [{ label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete checklist “${c.name}”?`)) removeChecklist(c.id); } }] : []),
                                        ]} />
                                    </tr>
                                ))}
                            </RowTable>
                            )}</Paged>
                        ) : tab === "quizzes" ? (
                            <Paged key={tab} items={quizzesByCategory(quizzes)}>{(rows) => (
                            <RowTable cols={[{ label: "Quiz" }, { label: "Questions", w: "w-28" }, { label: "Pass mark", w: "w-28" }]}>
                                {/* Paged first, then grouped: a page opens a category band wherever
                                    its category starts, and the band counts the whole category. */}
                                {rows.flatMap((qz, i) => [
                                            ...(i === 0 || rows[i - 1].category !== qz.category
                                                ? [<TableGroupBand key={`band-${qz.category}`} label={qz.category} count={quizzes.filter((x) => x.category === qz.category).length} colSpan={QUIZ_COLS} />]
                                                : []),
                                            (
                                                <tr key={qz.id} className={ROW_CLS} onClick={() => setPreviewQuiz(qz.id)}>
                                                    <NameCell icon={ClipboardList} accent="bg-sky-50 text-sky-600" name={qz.title} sub={qz.description} locked={qz.locked} />
                                                    <td className={CELL}>{qz.questions.length}</td>
                                                    <td className={CELL}>{qz.passPct}%</td>
                                                    <ActionsCell name={qz.title} items={[
                                                        { label: "Preview", icon: Eye, onClick: () => setPreviewQuiz(qz.id) },
                                                        ...(!qz.locked ? [{ label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete quiz “${qz.title}”?`)) removeQuiz(qz.id); } }] : []),
                                                    ]} />
                                                </tr>
                                            ),
                                ])}
                            </RowTable>
                            )}</Paged>
                        ) : tab === "forms" ? (
                            <Paged key={tab} items={FORMS}>{(rows) => (
                            <RowTable cols={[{ label: "Form" }]}>
                                {rows.map((f) => (
                                    <tr key={f.id} className={ROW_CLS} onClick={() => { setOpenPreview(false); setOpenForm(f.id); }}>
                                        <NameCell icon={f.Icon} accent={f.accent} name={f.name} sub={f.desc} />
                                        <ActionsCell name={f.name} items={formActions(f.id)} />
                                    </tr>
                                ))}
                            </RowTable>
                            )}</Paged>
                        ) : tab === "policy" ? (
                            <Paged key={tab} items={policyForms}>{(rows) => (
                            <RowTable cols={[{ label: "Policy form" }]}>
                                {rows.map((p) => {
                                    const name = `${p.title} ${p.accentTitle}`.trim();
                                    return (
                                        <tr key={p.id} className={ROW_CLS} onClick={() => { setOpenPreview(false); setOpenForm(p.id); }}>
                                            <NameCell icon={FileSignature} iconStyle={{ backgroundColor: `${THEME_HEX[p.theme]}1a`, color: THEME_HEX[p.theme] }} name={name} sub={p.blurb} />
                                            <ActionsCell name={name} items={formActions(p.id)} />
                                        </tr>
                                    );
                                })}
                            </RowTable>
                            )}</Paged>
                        ) : templates.length ? (
                            <Paged key={tab} items={templates}>{(rows) => (
                            <RowTable minW={880} cols={[{ label: "Workflow" }, { label: "Driver type", w: "w-40" }, { label: "Steps", w: "w-36" }, { label: "Checklist", w: "w-48" }]}>
                                {rows.map((t) => (
                                    <tr key={t.id} className={ROW_CLS} onClick={() => setEditTemplate(t.id)}>
                                        <NameCell icon={LayoutTemplate} accent="bg-violet-50 text-violet-600" name={t.name} sub={t.description} locked={t.locked} />
                                        <td className={CELL}>
                                            {t.driverType ? <span className="inline-block max-w-full truncate rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600" title={driverTypeName(t.driverType)}>{driverTypeName(t.driverType)}</span> : <span className="text-slate-300">&mdash;</span>}
                                        </td>
                                        {/* The step names are in the tooltip — the count is what the list compares. */}
                                        <td className={CELL} title={t.steps.map((s, i) => `${i + 1}. ${s.title} · ${s.formIds.length}`).join("\n")}>
                                            <span className="whitespace-nowrap">{t.steps.length} steps <span className="text-slate-400">· {totalForms(t)} forms</span></span>
                                        </td>
                                        <td className={CELL}>
                                            {t.checklistId ? <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700" title={checklistName(t.checklistId)}><ListChecks className="h-3 w-3 shrink-0" /> <span className="truncate">{checklistName(t.checklistId)}</span></span> : <span className="text-slate-300">&mdash;</span>}
                                        </td>
                                        <ActionsCell name={t.name} items={[
                                            { label: "Edit", icon: Pencil, onClick: () => setEditTemplate(t.id) },
                                            { label: "Test", icon: FlaskConical, onClick: () => setTestTemplate(t) },
                                            ...(!t.locked ? [{ label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete workflow “${t.name}”?`)) removeTemplate(t.id); } }] : []),
                                        ]} />
                                    </tr>
                                ))}
                            </RowTable>
                            )}</Paged>
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

// Quiz table columns: name · questions · pass mark · actions (the group band spans them all).
const QUIZ_COLS = 4;

// Quizzes in category order (QUIZ_CATEGORIES first, any others after), flat — so the pager
// counts quizzes, not categories.
function quizzesByCategory<T extends { category: string }>(list: T[]): T[] {
    const order = [...QUIZ_CATEGORIES] as string[];
    const rank = (c: string) => order.indexOf(c) + 1 || 99;
    return [...list].sort((a, b) => rank(a.category) - rank(b.category));
}
