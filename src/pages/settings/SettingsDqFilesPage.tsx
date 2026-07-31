import { useState } from "react";
import { Plus, Search, ListChecks, FileCheck2, FlaskConical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SettingsDqChecklistBuilder } from "./SettingsDqChecklistBuilder";
import { SettingsDqChecklistRunner } from "./SettingsDqChecklistRunner";
import {
    useDqCatalog, useDqChecklists, categoriesCovered, driverTypeLabel,
    type DqCatalogItem, type DqChecklist,
} from "./settings-dq-checklists.data";

/**
 * Settings ▸ DQ Files — the FMCSA Driver Qualification File checklists.
 * A single Checklists page: list of typed checklists (Cross Border / US Only /
 * Canada Only), each composed from the DQ check-item catalog. Add / Edit opens
 * the builder; Test / PDF view opens the runner.
 */

const TYPE_BADGE: Record<string, string> = {
    cross_border: "bg-violet-50 text-violet-700",
    us_only: "bg-blue-50 text-blue-700",
    canada_only: "bg-rose-50 text-rose-700",
};

export function SettingsDqFilesPage() {
    const [editChecklistId, setEditChecklistId] = useState<string | null>(null);
    const [runChecklist, setRunChecklist] = useState<{ id: string; mode: "test" | "pdf" } | null>(null);
    const { items } = useDqCatalog();
    const { checklists, save: saveChecklist, remove: removeChecklist } = useDqChecklists();

    if (editChecklistId !== null) {
        return <SettingsDqChecklistBuilder checklistId={editChecklistId} onBack={() => setEditChecklistId(null)} onSave={saveChecklist} />;
    }
    if (runChecklist !== null) {
        return <SettingsDqChecklistRunner checklistId={runChecklist.id} initialMode={runChecklist.mode} onBack={() => setRunChecklist(null)} />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-[1440px] px-6 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings · DQ Files</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Driver Qualification File Checklist</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Create and manage the FMCSA DQ file checklists your drivers must complete.</p>
                </div>
            </div>

            <div className="mx-auto max-w-[1440px] px-6 py-8">
                <ChecklistsTab
                    checklists={checklists}
                    catalog={items}
                    onNew={() => setEditChecklistId("new")}
                    onEdit={id => setEditChecklistId(id)}
                    onRemove={removeChecklist}
                    onTest={id => setRunChecklist({ id, mode: "test" })}
                    onPdf={id => setRunChecklist({ id, mode: "pdf" })}
                />
            </div>
        </div>
    );
}

// ── Shared list shell (matches Onboarding Setup's ListCard) ────────────────────
function ListCard({ title, count, searchPlaceholder, action, children }: {
    title: string; count: number; searchPlaceholder: string; action?: React.ReactNode; children: React.ReactNode;
}) {
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

// ── Checklists list ────────────────────────────────────────────────────────────
function ChecklistsTab({ checklists, catalog, onNew, onEdit, onRemove, onTest, onPdf }: {
    checklists: DqChecklist[]; catalog: DqCatalogItem[];
    onNew: () => void; onEdit: (id: string) => void; onRemove: (id: string) => void;
    onTest: (id: string) => void; onPdf: (id: string) => void;
}) {
    return (
        <ListCard title="DQ Checklists" count={checklists.length} searchPlaceholder="Search checklists…"
            action={<Button size="sm" onClick={onNew}><Plus className="h-4 w-4" /> Add checklist</Button>}>
            {checklists.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><ListChecks className="h-7 w-7" /></div>
                    <h3 className="mt-5 text-base font-semibold text-slate-700">No DQ checklists yet</h3>
                    <p className="mt-1.5 max-w-md text-sm text-slate-500">A checklist is a named, typed set of FMCSA check items a driver's qualification file must contain.</p>
                    <Button className="mt-5" onClick={onNew}><Plus className="h-4 w-4" /> Add checklist</Button>
                </div>
            ) : (
                <div className="divide-y divide-slate-100">
                    {checklists.map(c => (
                        <div key={c.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center">
                            <div className="flex min-w-0 flex-1 items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FileCheck2 className="h-5 w-5" /></div>
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-1.5 font-semibold text-slate-900">
                                        {c.name || "Untitled checklist"}
                                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold", TYPE_BADGE[c.type] ?? "bg-slate-100 text-slate-600")}>{driverTypeLabel(c.type)}</span>
                                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{c.itemIds.length} items · {categoriesCovered(c, catalog)}/8 categories</span>
                                    </p>
                                    {c.description && <p className="truncate text-sm text-slate-500">{c.description}</p>}
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => onTest(c.id)}><FlaskConical className="h-4 w-4" /> Test</Button>
                                <Button variant="outline" size="sm" onClick={() => onPdf(c.id)}><Eye className="h-4 w-4" /> PDF view</Button>
                                <Button variant="outline" size="sm" onClick={() => onEdit(c.id)}>Edit</Button>
                                <Button variant="outline" size="sm" className="text-rose-500 hover:text-rose-600"
                                    onClick={() => { if (window.confirm(`Delete checklist “${c.name || "Untitled"}”?`)) onRemove(c.id); }}>Delete</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </ListCard>
    );
}
