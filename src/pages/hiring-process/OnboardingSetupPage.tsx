import { useEffect, useState } from "react";
import { ArrowRight, FileText, FileSignature, FileCheck2, ClipboardList, ListChecks, Workflow as WorkflowIcon, Lock, Eye, Plus, FlaskConical, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubTabs } from "@/components/ui/SubTabs";
import { cn } from "@/lib/utils";
import { policyDocuments, THEME_HEX } from "./policy-forms.data";
import { ONBOARDING_FORMS, useOnbWorkflows, type OnbWorkflow } from "./onboarding.data";
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

type Tab = "workflow" | "policy" | "onboarding" | "documents" | "quizzes" | "checklists";

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
        { id: "checklists", label: "Checklist", icon: ListChecks, count: checklists.length },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-5xl px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Hiring · Onboarding</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Onboarding Setup</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Configure what a newly-hired driver completes during onboarding.</p>
                </div>
                <div className="mx-auto max-w-5xl px-6">
                    <SubTabs tabs={TABS} activeId={tab} onChange={setTab} bordered={false} />
                </div>
            </div>

            <div className="mx-auto max-w-5xl px-6 py-8">
                {tab === "workflow" && <WorkflowTab workflows={workflows} onNew={() => setEditWorkflow("new")} onEdit={(id) => setEditWorkflow(id)} onRemove={removeWorkflow} onTest={(id) => setTestWorkflow(id)} />}
                {tab === "policy" && <PolicyTab docs={docs} openDoc={openDoc} />}
                {tab === "onboarding" && <OnboardingFormsTab openDoc={openDoc} />}
                {tab === "documents" && <DocumentsTab templates={docTemplates} onNew={() => setEditDoc("new")} onEdit={(id) => setEditDoc(id)} onPreview={(id) => { setDocPreview(true); setEditDoc(id); }} onRemove={removeDoc} />}
                {tab === "quizzes" && <QuizzesTab quizzes={quizzes} onPreview={setPreviewQuiz} onRemove={removeQuiz} onNew={() => setNewQuiz(true)} />}
                {tab === "checklists" && <ChecklistsTab checklists={checklists} onEdit={setEditChecklist} onRemove={removeChecklist} />}
            </div>

            {newQuiz && <NewQuizModal onClose={() => setNewQuiz(false)} onCreate={(qz) => { saveQuiz(qz); setNewQuiz(false); }} />}
        </div>
    );
}

// ── Workflow list — same list-view shell as the hiring Workflows tab ──────────
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
                <div className="divide-y divide-slate-100">
                    {workflows.map((w) => {
                        const steps: [string, number][] = [["Policy forms", w.policyForms?.length ?? 0], ["Onboarding forms", w.forms.length], ["Documents", w.documents.length], ["Quizzes", w.quizzes.length], ["Checklist", w.checklistId ? 1 : 0]];
                        const totalItems = steps.reduce((n, [, c]) => n + c, 0);
                        return (
                            <div key={w.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-start gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><WorkflowIcon className="h-5 w-5" /></div>
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                            {w.name || "Untitled workflow"}
                                            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">5 steps · {totalItems} items</span>
                                            {w.checklistId && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"><ListChecks className="h-2.5 w-2.5" /> Checklist</span>}
                                        </p>
                                        {w.description && <p className="truncate text-sm text-slate-500">{w.description}</p>}
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {steps.map(([label, n], i) => (
                                                <span key={label} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-500">
                                                    <span className="font-semibold text-slate-400">{i + 1}</span> {label} <span className="text-slate-300">·</span> <span className="text-slate-400">{n}</span>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onTest(w.id)}><FlaskConical className="h-4 w-4" /> Test</Button>
                                    <Button variant="outline" size="sm" onClick={() => onEdit(w.id)}>Edit</Button>
                                    <Button variant="outline" size="sm" className="text-rose-500 hover:text-rose-600" onClick={() => { if (window.confirm(`Delete workflow “${w.name || "Untitled"}”?`)) onRemove(w.id); }}>Delete</Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </ListCard>
    );
}

// Shared list-view shell — matches the hiring Forms & Workflow Builder cards
// (white card, toolbar with title + count + search + action, divided rows).
function ListCard({ title, count, searchPlaceholder, action, children }: { title: string; count: number; searchPlaceholder: string; action: React.ReactNode; children: React.ReactNode }) {
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
function DocActions({ id, openDoc }: { id: string; openDoc: (id: string, pdf?: boolean) => void }) {
    return (
        <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => openDoc(id)}><FlaskConical className="h-4 w-4" /> Test</Button>
            <Button variant="outline" size="sm" onClick={() => openDoc(id, true)}><Eye className="h-4 w-4" /> PDF view</Button>
            <Button variant="outline" size="sm" onClick={() => openDoc(id)}>Open form <ArrowRight className="h-4 w-4" /></Button>
        </div>
    );
}

function PolicyTab({ docs, openDoc }: { docs: ReturnType<typeof policyDocuments>; openDoc: (id: string, pdf?: boolean) => void }) {
    return (
        <ListCard title="Policy forms" count={docs.length} searchPlaceholder="Search policy forms…" action={null}>
            <div className="divide-y divide-slate-100">
                {docs.map((d) => (
                    <div key={d.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${THEME_HEX[d.theme]}1a`, color: THEME_HEX[d.theme] }}>
                                <FileSignature className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{d.title} <span style={{ color: THEME_HEX[d.theme] }}>{d.accentTitle}</span></p>
                                <p className="truncate text-sm text-slate-500">{d.blurb}</p>
                            </div>
                        </div>
                        <DocActions id={d.id} openDoc={openDoc} />
                    </div>
                ))}
            </div>
        </ListCard>
    );
}

function OnboardingFormsTab({ openDoc }: { openDoc: (id: string, pdf?: boolean) => void }) {
    return (
        <ListCard title="Onboarding forms" count={ONBOARDING_FORMS.length} searchPlaceholder="Search onboarding forms…" action={null}>
            <div className="divide-y divide-slate-100">
                {ONBOARDING_FORMS.map((f) => (
                    <div key={f.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-500"><FileText className="h-5 w-5" /></div>
                            <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{f.label}</p>
                                <p className="truncate text-sm text-slate-500">{f.desc}</p>
                            </div>
                        </div>
                        <DocActions id={f.id} openDoc={openDoc} />
                    </div>
                ))}
            </div>
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Single toolbar — the tab already provides the "Documents & sign" heading */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
                <div className="relative min-w-[180px] flex-1">
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
                <Button size="sm" className="ml-auto" onClick={onNew}><Plus className="h-4 w-4" /> New template</Button>
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
                    <div className="divide-y divide-slate-100 px-4">
                        {paged.map((t) => (
                            <div key={t.id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center">
                                <div className="flex min-w-0 flex-1 items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-500"><FileSignature className="h-5 w-5" /></div>
                                    <div className="min-w-0">
                                        <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                            {t.name}
                                            {t.documents.length > 1 && <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-600">{t.documents.length} docs</span>}
                                        </p>
                                        <p className="truncate text-sm text-slate-500">{t.documents.length} document{t.documents.length !== 1 ? "s" : ""} · {totalPages(t)} page{totalPages(t) !== 1 ? "s" : ""} · {t.fields.length} field{t.fields.length !== 1 ? "s" : ""}</p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => onPreview(t.id)}><Eye className="h-4 w-4" /> Preview</Button>
                                    <Button variant="outline" size="sm" onClick={() => onEdit(t.id)}>Edit</Button>
                                    <Button variant="outline" size="sm" className="text-rose-500 hover:text-rose-600" onClick={() => { if (window.confirm(`Delete template “${t.name}”?`)) onRemove(t.id); }}>Delete</Button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Pagination footer */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-500">
                            <span>Rows</span>
                            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700">
                                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span className="text-slate-400">{startIdx + 1}–{Math.min(startIdx + pageSize, shown.length)} of {shown.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Prev</button>
                            <span className="px-2 text-xs font-medium text-slate-500">Page {safePage} of {pageCount}</span>
                            <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight className="h-4 w-4" /></button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// ── Quizzes (onboarding-specific catalog) ────────────────────────────────────
function QuizzesTab({ quizzes, onPreview, onRemove, onNew }: { quizzes: ReturnType<typeof useOnboardingQuizzes>["quizzes"]; onPreview: (id: string) => void; onRemove: (id: string) => void; onNew: () => void }) {
    const order = [...ONB_QUIZ_CATEGORIES] as string[];
    const cats = Array.from(new Set(quizzes.map((x) => x.category)))
        .sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
    return (
        <SectionCard Icon={ClipboardList} tint="bg-sky-50 text-sky-500" title="Quizzes"
            desc="Onboarding knowledge checks — assigned as the driver's post-orientation quiz. Separate from the hiring quizzes." count={`${quizzes.length} quizzes`}
            action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4" /> New Quiz</Button>}>
            <div className="-mx-5 -mb-5">
                {cats.map((cat) => {
                    const list = quizzes.filter((x) => x.category === cat);
                    return (
                        <div key={cat}>
                            <div className="flex items-center gap-2 border-y border-slate-100 bg-slate-50/80 px-5 py-2 first:border-t-0">
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{cat}</span>
                                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 ring-1 ring-slate-200">{list.length}</span>
                            </div>
                            <div className="divide-y divide-slate-100 px-5">
                                {list.map((qz) => (
                                    <div key={qz.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 items-center gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ClipboardList className="h-5 w-5" /></div>
                                            <div className="min-w-0">
                                                <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                                    {qz.title}
                                                    {qz.locked && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"><Lock className="h-2.5 w-2.5" /> Default</span>}
                                                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{qz.questions.length} questions · pass {qz.passPct}%</span>
                                                </p>
                                                {qz.description && <p className="truncate text-sm text-slate-500">{qz.description}</p>}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => onPreview(qz.id)}><Eye className="h-4 w-4" /> Preview</Button>
                                            {!qz.locked && <Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Delete quiz “${qz.title}”?`)) onRemove(qz.id); }} className="text-rose-500 hover:text-rose-600">Delete</Button>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ── Checklist ────────────────────────────────────────────────────────────────
function ChecklistsTab({ checklists, onEdit, onRemove }: { checklists: ReturnType<typeof useChecklists>["checklists"]; onEdit: (id: string) => void; onRemove: (id: string) => void }) {
    return (
        <SectionCard Icon={ListChecks} tint="bg-emerald-50 text-emerald-500" title="Checklist"
            desc="Review checklists used to confirm the driver's onboarding is complete." count={`${checklists.length} checklists`}
            action={<Button size="sm" onClick={() => onEdit("new")}><Plus className="h-4 w-4" /> New Checklist</Button>}>
            <div className="divide-y divide-slate-100">
                {checklists.map((c) => (
                    <div key={c.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
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
                            <Button variant="outline" size="sm" onClick={() => onEdit(c.id)}>Edit</Button>
                            {!c.locked && <Button variant="outline" size="sm" onClick={() => { if (window.confirm(`Delete checklist “${c.name}”?`)) onRemove(c.id); }} className="text-rose-500 hover:text-rose-600">Delete</Button>}
                        </div>
                    </div>
                ))}
            </div>
        </SectionCard>
    );
}

// ── Shared card shell ────────────────────────────────────────────────────────
function SectionCard({ Icon, tint, title, desc, count, action, children }: { Icon: React.ElementType; tint: string; title: string; desc: string; count?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section>
            <div className="mb-3 flex items-center gap-2.5">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tint)}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
                    <p className="text-xs text-slate-500">{desc}</p>
                </div>
                {count && <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">{count}</span>}
                {action && <div className={cn("shrink-0", count ? "ml-2" : "ml-auto")}>{action}</div>}
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</div>
        </section>
    );
}
