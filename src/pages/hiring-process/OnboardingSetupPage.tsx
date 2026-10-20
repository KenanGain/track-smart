import { useEffect, useState } from "react";
import { ArrowRight, FileText, FileSignature, FileCheck2, ClipboardList, ListChecks, GraduationCap, Workflow as WorkflowIcon, Eye, Plus, FlaskConical, Search, X, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTabs } from "@/components/ui/SubTabs";
import type { KebabItem } from "@/components/ui/KebabMenu";
import { TableGroupBand, TablePager } from "@/components/ui/ListChrome";
import { RowTable, NameCell, ActionsCell, Paged, ROW_CLS, CELL } from "./SetupTable";
import { cn } from "@/lib/utils";
import { policyDocuments, THEME_HEX } from "./policy-forms.data";
import { ONBOARDING_FORMS, TRAINING_TYPES, TRAINING_CATEGORIES, useOnbWorkflows, type OnbWorkflow } from "./onboarding.data";
import { OnbWorkflowBuilder } from "./OnbWorkflowBuilder";
import { OnbWorkflowTester } from "./OnbWorkflowTester";
import { useOnboardingQuizzes, ONB_QUIZ_CATEGORIES } from "./onboarding-quizzes.data";
import type { Quiz } from "./quizzes.data";
import { QuizRunner } from "./QuizRunner";
import { useChecklists, totalChecklistItems } from "./checklists.data";
import { ChecklistBuilder } from "./ChecklistBuilder";
import { useDocTemplates, totalPages, type DocTemplate } from "./document-templates.data";
import { DocumentTemplateBuilder } from "./DocumentTemplateBuilder";

/**
 * Settings → Hiring Process → Onboarding Setup
 *
 * Tabs: Workflow · Policy forms · Documents & sign · Quizzes · Checklist.
 * Onboarding quizzes are a SEPARATE catalog from the hiring/driver-knowledge
 * quizzes (see onboarding-quizzes.data.ts).
 */

type Tab = "workflow" | "policy" | "onboarding" | "documents" | "quizzes" | "training" | "checklists";

const ACTIVE_TRAININGS = TRAINING_TYPES.filter((t) => t.status === "active");

// Policy statements removed from the onboarding form per requirements.
const HIDDEN_ONBOARDING = new Set(["insurance-policy", "ctpat-cross-border-security", "drug-alcohol-policy-receipt"]);

export function OnboardingSetupPage({ onNavigate, carrierId }: { onNavigate: (path: string) => void; carrierId?: string }) {
    const [tab, setTab] = useState<Tab>("workflow");
    const [previewQuiz, setPreviewQuiz] = useState<string | null>(null);
    const [editChecklist, setEditChecklist] = useState<string | null>(null);
    const [editDoc, setEditDoc] = useState<string | null>(null);
    const [docPreview, setDocPreview] = useState(false);
    const [newQuiz, setNewQuiz] = useState(false);
    const [editWorkflow, setEditWorkflow] = useState<string | null>(null);
    const [testWorkflow, setTestWorkflow] = useState<string | null>(null);
    const { quizzes, remove: removeQuiz, save: saveQuiz } = useOnboardingQuizzes();
    const { checklists, remove: removeChecklist } = useChecklists();
    const { templates: docTemplates, save: saveDoc, remove: removeDoc } = useDocTemplates();
    const { workflows, save: saveWorkflow, remove: removeWorkflow } = useOnbWorkflows();

    const docs = policyDocuments().filter((d) => !HIDDEN_ONBOARDING.has(d.id));
    const openDoc = (id: string, pdf?: boolean) => onNavigate(`/settings/hiring-process/policy/${id}${pdf ? "?pdf=1" : ""}`);

    if (previewQuiz !== null) {
        const qz = quizzes.find((q) => q.id === previewQuiz);
        if (qz) return <QuizRunner quiz={qz} mode="preview" onClose={() => setPreviewQuiz(null)} />;
    }
    if (editChecklist !== null) return <ChecklistBuilder checklistId={editChecklist} onBack={() => setEditChecklist(null)} />;
    if (editDoc !== null) return <DocumentTemplateBuilder templateId={editDoc} startPreview={docPreview} carrierId={carrierId} onSave={saveDoc} onBack={() => { setEditDoc(null); setDocPreview(false); }} />;
    if (editWorkflow !== null) return <OnbWorkflowBuilder workflowId={editWorkflow} onSave={saveWorkflow} onBack={() => setEditWorkflow(null)} />;
    if (testWorkflow !== null) {
        const w = workflows.find((x) => x.id === testWorkflow);
        if (w) return <OnbWorkflowTester workflow={w} onBack={() => setTestWorkflow(null)} />;
    }

    const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
        { id: "workflow", label: "Workflow", icon: WorkflowIcon, count: workflows.length },
        { id: "policy", label: "Policy forms", icon: FileSignature, count: docs.length },
        { id: "onboarding", label: "Onboarding forms", icon: FileText, count: ONBOARDING_FORMS.length },
        { id: "documents", label: "Documents & sign", icon: FileCheck2, count: docTemplates.length },
        { id: "quizzes", label: "Quizzes", icon: ClipboardList, count: quizzes.length },
        { id: "training", label: "Training", icon: GraduationCap, count: ACTIVE_TRAININGS.length },
        { id: "checklists", label: "Checklist", icon: ListChecks, count: checklists.length },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-[1440px] px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Hiring · Onboarding</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Onboarding Setup</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Configure what a newly-hired driver completes during onboarding.</p>
                </div>
                <div className="mx-auto max-w-[1440px] px-6">
                    <SubTabs tabs={TABS} activeId={tab} onChange={setTab} bordered={false} size="sm" fill />
                </div>
            </div>

            <div className="mx-auto max-w-[1440px] px-6 py-8">
                {tab === "workflow" && <WorkflowTab workflows={workflows} onNew={() => setEditWorkflow("new")} onEdit={(id) => setEditWorkflow(id)} onRemove={removeWorkflow} onTest={(id) => setTestWorkflow(id)} />}
                {tab === "policy" && <PolicyTab docs={docs} openDoc={openDoc} />}
                {tab === "onboarding" && <OnboardingFormsTab openDoc={openDoc} />}
                {tab === "documents" && <DocumentsTab templates={docTemplates} onNew={() => setEditDoc("new")} onEdit={(id) => setEditDoc(id)} onPreview={(id) => { setDocPreview(true); setEditDoc(id); }} onRemove={removeDoc} />}
                {tab === "quizzes" && <QuizzesTab quizzes={quizzes} onPreview={setPreviewQuiz} onRemove={removeQuiz} onNew={() => setNewQuiz(true)} />}
                {tab === "training" && <TrainingTab />}
                {tab === "checklists" && <ChecklistsTab checklists={checklists} onEdit={setEditChecklist} onRemove={removeChecklist} />}
            </div>

            {newQuiz && <NewQuizModal onClose={() => setNewQuiz(false)} onCreate={(qz) => { saveQuiz(qz); setNewQuiz(false); }} />}
        </div>
    );
}

// ── Workflow list ─────────────────────────────────────────────────────────────
function WorkflowTab({ workflows, onNew, onEdit, onRemove, onTest }: { workflows: OnbWorkflow[]; onNew: () => void; onEdit: (id: string) => void; onRemove: (id: string) => void; onTest: (id: string) => void }) {
    return (
        <ListCard title="Onboarding Workflows" count={workflows.length} searchPlaceholder="Search workflows…"
            action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4" /> New Workflow</Button>}>
            {workflows.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><WorkflowIcon className="h-7 w-7" /></div>
                    <h3 className="mt-5 text-base font-semibold text-slate-700">No onboarding workflows yet</h3>
                    <p className="mt-1.5 max-w-md text-sm text-slate-500">A workflow sequences the forms, documents, quizzes and checklist a new hire completes during onboarding.</p>
                    <Button className="mt-5" onClick={onNew}><Plus className="h-4 w-4" /> New Workflow</Button>
                </div>
            ) : (
                <Paged items={workflows}>{(rows) => (
                <RowTable minW={640} cols={[{ label: "Workflow" }, { label: "Steps", w: "w-36" }, { label: "Checklist", w: "w-32" }]}>
                    {rows.map((w) => {
                        const steps: [string, number][] = [["Policy forms", w.policyForms?.length ?? 0], ["Onboarding forms", w.forms.length], ["Documents", w.documents.length], ["Quizzes", w.quizzes.length], ["Training", w.trainings?.length ?? 0], ["Checklist", w.checklistId ? 1 : 0]];
                        const totalItems = steps.reduce((n, [, c]) => n + c, 0);
                        const name = w.name || "Untitled workflow";
                        return (
                            <tr key={w.id} className={ROW_CLS} onClick={() => onEdit(w.id)}>
                                <NameCell icon={WorkflowIcon} accent="bg-violet-50 text-violet-600" name={name} sub={w.description} />
                                {/* What each step holds is in the tooltip — the totals are what the list compares. */}
                                <td className={CELL} title={steps.map(([label, n], i) => `${i + 1}. ${label} · ${n}`).join("\n")}>
                                    <span className="whitespace-nowrap">7 steps <span className="text-slate-400">· {totalItems} items</span></span>
                                </td>
                                <td className={CELL}>
                                    {w.checklistId ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><ListChecks className="h-3 w-3" /> Checklist</span> : <span className="text-slate-300">&mdash;</span>}
                                </td>
                                <ActionsCell name={name} items={[
                                    { label: "Edit", icon: Pencil, onClick: () => onEdit(w.id) },
                                    { label: "Test", icon: FlaskConical, onClick: () => onTest(w.id) },
                                    { label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete workflow “${w.name || "Untitled"}”?`)) onRemove(w.id); } },
                                ]} />
                            </tr>
                        );
                    })}
                </RowTable>
                )}</Paged>
            )}
        </ListCard>
    );
}

// Shared list-view shell — matches the hiring Forms & Workflow Builder card
// (white card, toolbar with title + count + search + action, divided rows).
function ListCard({ title, count, searchPlaceholder, action, children }: { title: string; count: number; searchPlaceholder: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-700">{title}<span className="ml-2 font-normal text-slate-400">{count}</span></p>
                <div className="flex items-center gap-2">
                    <div className="relative w-56">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input disabled placeholder={searchPlaceholder} className="h-9 pl-9" />
                    </div>
                    {action}
                </div>
            </div>
            {children}
        </div>
    );
}

function NewQuizModal({ onClose, onCreate }: { onClose: () => void; onCreate: (q: Quiz) => void }) {
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState<string>(ONB_QUIZ_CATEGORIES[0]);
    const [passPct, setPassPct] = useState(80);
    const create = () => {
        if (!title.trim()) return;
        const quiz: Quiz = {
            id: `onb-custom-${Date.now().toString(36)}`, title: title.trim(), description: "Custom onboarding quiz.", category, passPct,
            questions: [{ id: "q1", prompt: "Sample question — edit this quiz to add your questions.", options: ["Option A", "Option B", "Option C", "Option D"], answer: 0 }],
        };
        onCreate(quiz);
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">New quiz</h3>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
                </div>
                <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-500">Quiz title
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Winter Driving Quiz" className="mt-1 h-9" autoFocus />
                    </label>
                    <label className="block text-xs font-semibold text-slate-500">Category
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700">
                            {ONB_QUIZ_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-500">Pass mark (%)
                        <Input type="number" value={passPct} onChange={(e) => setPassPct(Math.max(1, Math.min(100, Number(e.target.value) || 0)))} className="mt-1 h-9 w-28" />
                    </label>
                    <p className="text-xs text-slate-400">The quiz is created with one sample question so you can preview it. It's added as a custom (non-default) quiz.</p>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" disabled={!title.trim()} onClick={create}><Plus className="h-4 w-4" /> Create quiz</Button>
                </div>
            </div>
        </div>
    );
}

// ── Policy forms ─────────────────────────────────────────────────────────────
// A form's menu: open it, test it, or see it as a PDF.
const docActions = (id: string, openDoc: (id: string, pdf?: boolean) => void): KebabItem[] => [
    { label: "Open form", icon: ArrowRight, onClick: () => openDoc(id) },
    { label: "Test", icon: FlaskConical, onClick: () => openDoc(id) },
    { label: "PDF view", icon: Eye, onClick: () => openDoc(id, true) },
];

function PolicyTab({ docs, openDoc }: { docs: ReturnType<typeof policyDocuments>; openDoc: (id: string, pdf?: boolean) => void }) {
    return (
        <ListCard title="Policy forms" count={docs.length} searchPlaceholder="Search policy forms…">
            <Paged items={docs}>{(rows) => (
            <RowTable cols={[{ label: "Policy form" }]}>
                {rows.map((d) => {
                    const name = `${d.title} ${d.accentTitle}`.trim();
                    return (
                        <tr key={d.id} className={ROW_CLS} onClick={() => openDoc(d.id)}>
                            <NameCell icon={FileSignature} iconStyle={{ backgroundColor: `${THEME_HEX[d.theme]}1a`, color: THEME_HEX[d.theme] }} name={name} sub={d.blurb} />
                            <ActionsCell name={name} items={docActions(d.id, openDoc)} />
                        </tr>
                    );
                })}
            </RowTable>
            )}</Paged>
        </ListCard>
    );
}

function OnboardingFormsTab({ openDoc }: { openDoc: (id: string, pdf?: boolean) => void }) {
    return (
        <ListCard title="Onboarding forms" count={ONBOARDING_FORMS.length} searchPlaceholder="Search onboarding forms…">
            <Paged items={ONBOARDING_FORMS}>{(rows) => (
            <RowTable cols={[{ label: "Onboarding form" }]}>
                {rows.map((f) => (
                    <tr key={f.id} className={ROW_CLS} onClick={() => openDoc(f.id)}>
                        <NameCell icon={FileText} accent="bg-teal-50 text-teal-500" name={f.label} sub={f.desc} />
                        <ActionsCell name={f.label} items={docActions(f.id, openDoc)} />
                    </tr>
                ))}
            </RowTable>
            )}</Paged>
        </ListCard>
    );
}

// ── Documents & sign ─────────────────────────────────────────────────────────
// Upload a PDF or build a reusable signing template with drag-and-drop fields.
const DOC_FILTERS: { id: "all" | "single" | "combined"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "single", label: "Single" },
    { id: "combined", label: "Combined" },
];

function DocumentsTab({ templates, onNew, onEdit, onPreview, onRemove }: { templates: DocTemplate[]; onNew: () => void; onEdit: (id: string) => void; onPreview: (id: string) => void; onRemove: (id: string) => void }) {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<"all" | "single" | "combined">("all");
    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    const query = q.trim().toLowerCase();
    const shown = templates.filter((t) => {
        const matchesText = !query || t.name.toLowerCase().includes(query) || t.documents.some((d) => d.fileName.toLowerCase().includes(query));
        const matchesFilter = filter === "all" || (filter === "single" ? t.documents.length === 1 : t.documents.length > 1);
        return matchesText && matchesFilter;
    });
    // Reset to the first page whenever the result set or page size changes.
    useEffect(() => { setPage(1); }, [query, filter, pageSize]);
    const pageCount = Math.max(1, Math.ceil(shown.length / pageSize));
    const safePage = Math.min(page, pageCount);
    const startIdx = (safePage - 1) * pageSize;
    const paged = shown.slice(startIdx, startIdx + pageSize);
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-700">Documents &amp; sign<span className="ml-2 font-normal text-slate-400">{templates.length}</span></p>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-56">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="h-9 pl-9" />
                        {q && <button type="button" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>}
                    </div>
                    <div className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                        {DOC_FILTERS.map((f) => (
                            <button key={f.id} type="button" onClick={() => setFilter(f.id)}
                                className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition", filter === f.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <Button size="sm" onClick={onNew}><Plus className="h-4 w-4" /> New template</Button>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-600">No document templates yet</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">Upload a PDF and place signature and data fields on it to create a reusable signing template.</p>
                    <Button size="sm" className="mt-4" onClick={onNew}><Plus className="h-4 w-4" /> New template</Button>
                </div>
            ) : shown.length === 0 ? (
                <div className="px-5 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-600">No templates match</p>
                    <p className="mt-1 text-sm text-slate-400">Try a different search or filter.</p>
                </div>
            ) : (
                <>
                    <RowTable minW={720} cols={[{ label: "Template" }, { label: "Type", w: "w-28" }, { label: "Documents", w: "w-28" }, { label: "Pages", w: "w-24" }, { label: "Fields", w: "w-24" }]}>
                        {paged.map((t) => (
                            <tr key={t.id} className={ROW_CLS} onClick={() => onEdit(t.id)}>
                                <NameCell icon={FileSignature} accent="bg-blue-50 text-blue-500" name={t.name} sub={t.documents.map((d) => d.fileName).join(", ")} />
                                <td className={CELL}>
                                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", t.documents.length > 1 ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-500")}>{t.documents.length > 1 ? "Combined" : "Single"}</span>
                                </td>
                                <td className={CELL}>{t.documents.length}</td>
                                <td className={CELL}>{totalPages(t)}</td>
                                <td className={CELL}>{t.fields.length}</td>
                                <ActionsCell name={t.name} items={[
                                    { label: "Edit", icon: Pencil, onClick: () => onEdit(t.id) },
                                    { label: "Preview", icon: Eye, onClick: () => onPreview(t.id) },
                                    { label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete template “${t.name}”?`)) onRemove(t.id); } },
                                ]} />
                            </tr>
                        ))}
                    </RowTable>
                    <TablePager page={safePage} pageSize={pageSize} total={shown.length}
                        onPage={setPage} onPageSize={setPageSize} className="rounded-b-xl bg-slate-50/60" />
                </>
            )}
        </div>
    );
}

// ── Quizzes (onboarding-specific catalog) ────────────────────────────────────
function QuizzesTab({ quizzes, onPreview, onRemove, onNew }: { quizzes: ReturnType<typeof useOnboardingQuizzes>["quizzes"]; onPreview: (id: string) => void; onRemove: (id: string) => void; onNew: () => void }) {
    // Quizzes in category order, flat — paged first, then grouped, so the pager counts quizzes.
    const order = [...ONB_QUIZ_CATEGORIES] as string[];
    const rank = (c: string) => order.indexOf(c) + 1 || 99;
    const sorted = [...quizzes].sort((a, b) => rank(a.category) - rank(b.category));
    return (
        <ListCard title="Quizzes" count={quizzes.length} searchPlaceholder="Search quizzes…"
            action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4" /> New Quiz</Button>}>
            <Paged items={sorted}>{(rows) => (
            <RowTable cols={[{ label: "Quiz" }, { label: "Questions", w: "w-28" }, { label: "Pass mark", w: "w-28" }]}>
                {rows.flatMap((qz, i) => [
                        // A band wherever a category starts on this page; it counts the whole category.
                        ...(i === 0 || rows[i - 1].category !== qz.category
                            ? [<TableGroupBand key={`band-${qz.category}`} label={qz.category} count={quizzes.filter((x) => x.category === qz.category).length} colSpan={QUIZ_COLS} />]
                            : []),
                        (
                            <tr key={qz.id} className={ROW_CLS} onClick={() => onPreview(qz.id)}>
                                <NameCell icon={ClipboardList} accent="bg-sky-50 text-sky-600" name={qz.title} sub={qz.description} locked={qz.locked} />
                                <td className={CELL}>{qz.questions.length}</td>
                                <td className={CELL}>{qz.passPct}%</td>
                                <ActionsCell name={qz.title} items={[
                                    { label: "Preview", icon: Eye, onClick: () => onPreview(qz.id) },
                                    ...(!qz.locked ? [{ label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete quiz “${qz.title}”?`)) onRemove(qz.id); } }] : []),
                                ]} />
                            </tr>
                        ),
                ])}
            </RowTable>
            )}</Paged>
        </ListCard>
    );
}

// ── Training (catalog, grouped by category) ──────────────────────────────────
function TrainingTab() {
    // Category order, flat — paged first, then grouped (same as the quiz list).
    const sorted = sortByCategory(ACTIVE_TRAININGS, TRAINING_CATEGORIES);
    return (
        <ListCard title="Training" count={ACTIVE_TRAININGS.length} searchPlaceholder="Search training…">
            <Paged items={sorted}>{(rows) => (
            <RowTable noActions minW={720} cols={[{ label: "Training" }, { label: "Due", w: "w-28" }, { label: "Delivery", w: "w-48" }, { label: "Assessment", w: "w-32" }]}>
                {rows.map((t, i) => (
                    <TrainingRow key={t.id} t={t} band={i === 0 || rows[i - 1].category !== t.category} />
                ))}
            </RowTable>
            )}</Paged>
        </ListCard>
    );
}

// One training course, with its category band above it when it opens a category on the page.
function TrainingRow({ t, band }: { t: (typeof ACTIVE_TRAININGS)[number]; band: boolean }) {
    const assessment = t.defaultAssessment;
    return (
        <>
            {band && <TableGroupBand label={t.category} count={ACTIVE_TRAININGS.filter((x) => x.category === t.category).length} colSpan={TRAINING_COLS} />}
            <tr className="transition-colors hover:bg-slate-50/70">
                <NameCell icon={GraduationCap} accent="bg-indigo-50 text-indigo-600" name={t.name} sub={t.defaultMandatory ? "Mandatory" : "Optional"} />
                <td className={CELL}>{t.defaultDueDays} days</td>
                <td className={CELL}><span className="block truncate capitalize" title={deliveryText(t.defaultDeliveryModes)}>{deliveryText(t.defaultDeliveryModes)}</span></td>
                <td className={CELL}>
                    {assessment?.enabled
                        ? <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-600">{assessment.passingScore}% to pass</span>
                        : <span className="text-slate-300">&mdash;</span>}
                </td>
            </tr>
        </>
    );
}

// A list in the order its categories are declared (unknown categories last), flat.
function sortByCategory<T extends { category: string }>(list: readonly T[], order: readonly string[]): T[] {
    const rank = (c: string) => order.indexOf(c) + 1 || 99;
    return [...list].sort((a, b) => rank(a.category) - rank(b.category));
}

// ── Checklist ────────────────────────────────────────────────────────────────
function ChecklistsTab({ checklists, onEdit, onRemove }: { checklists: ReturnType<typeof useChecklists>["checklists"]; onEdit: (id: string) => void; onRemove: (id: string) => void }) {
    return (
        <ListCard title="Checklist" count={checklists.length} searchPlaceholder="Search checklists…"
            action={<Button size="sm" onClick={() => onEdit("new")}><Plus className="h-4 w-4" /> New Checklist</Button>}>
            <Paged items={checklists}>{(rows) => (
            <RowTable cols={[{ label: "Checklist" }, { label: "Stages", w: "w-28" }, { label: "Items", w: "w-28" }]}>
                {rows.map((c) => (
                    <tr key={c.id} className={ROW_CLS} onClick={() => onEdit(c.id)}>
                        <NameCell icon={ListChecks} accent="bg-emerald-50 text-emerald-600" name={c.name} sub={c.description} locked={c.locked} />
                        <td className={CELL}>{c.stages.length}</td>
                        <td className={CELL}>{totalChecklistItems(c)}</td>
                        <ActionsCell name={c.name} items={[
                            { label: "Edit", icon: Pencil, onClick: () => onEdit(c.id) },
                            ...(!c.locked ? [{ label: "Delete", icon: Trash2, danger: true, onClick: () => { if (window.confirm(`Delete checklist “${c.name}”?`)) onRemove(c.id); } }] : []),
                        ]} />
                    </tr>
                ))}
            </RowTable>
            )}</Paged>
        </ListCard>
    );
}

// Quiz table columns: name · questions · pass mark · actions (the group band spans them all).
const QUIZ_COLS = 4;

// Training table columns: name · due · delivery · assessment (no actions column).
const TRAINING_COLS = 4;
// "in_person" → "in person", joined. split/join rather than a regex literal: a regex inside
// a JSX attribute here tripped Vite's import scanner on the minified bundle.
const deliveryText = (modes: string[]) => modes.map((m) => m.split("_").join(" ")).join(", ");
