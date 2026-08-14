import { useEffect, useMemo, useState } from "react";
import {
    Plus, Search, ListChecks, FileCheck2, MapPin, Pencil, Trash2, ChevronLeft, ChevronRight,
    ChevronsUpDown, ChevronUp, ChevronDown, Users, ShieldCheck, FileSignature,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SettingsDqChecklistBuilder, type BuilderTab } from "./SettingsDqChecklistBuilder";
import { assignedDriverCount } from "./SettingsDqAssignDrivers";
import {
    useDqChecklists, driverTypeLabel, documentCount, formCount, itemCount,
    DQ_DRIVER_TYPES,
    type DqChecklist, type DqDriverTypeId,
} from "./settings-dq-checklists.data";

/**
 * Settings ▸ DQ Files — the FMCSA Driver Qualification File templates.
 * KPI cards + a searchable / filterable / sortable / paginated TABLE of typed
 * templates (Cross Border / US Only / Canada Only). Add / Edit opens the builder.
 */

const TYPE_BADGE: Record<string, string> = {
    cross_border: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    us_only: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    canada_only: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};
const PAGE_SIZES = [10, 25, 50, 100];

export function SettingsDqFilesPage({ accountId }: { accountId?: string }) {
    const [edit, setEdit] = useState<{ id: string; tab?: BuilderTab } | null>(null);
    const { checklists, save: saveChecklist, remove: removeChecklist } = useDqChecklists();

    if (edit !== null) {
        return <SettingsDqChecklistBuilder checklistId={edit.id} initialTab={edit.tab} onBack={() => setEdit(null)} onSave={saveChecklist} accountId={accountId} />;
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings · DQ Files</p>
                    <h1 className="mt-1 text-2xl font-semibold text-slate-900">Driver Qualification File Checklist</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Create and manage the FMCSA DQ file templates your drivers must complete, and assign them to drivers.</p>
                </div>
            </div>

            <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
                <KpiCards checklists={checklists} />
                <ChecklistsList
                    checklists={checklists}
                    onNew={() => setEdit({ id: "new" })}
                    onEdit={id => setEdit({ id })}
                    onRemove={removeChecklist}
                />
            </div>
        </div>
    );
}

// ── KPI cards ────────────────────────────────────────────────────────────────────
function KpiCards({ checklists }: { checklists: DqChecklist[] }) {
    const totals = useMemo(() => ({
        templates: checklists.length,
        compliances: checklists.reduce((s, c) => s + documentCount(c), 0),
        forms: checklists.reduce((s, c) => s + formCount(c), 0),
        drivers: checklists.reduce((s, c) => s + assignedDriverCount(c.id), 0),
    }), [checklists]);
    const cards = [
        { label: "Templates", value: totals.templates, Icon: FileCheck2, tone: "bg-emerald-50 text-emerald-600" },
        { label: "Compliances", value: totals.compliances, Icon: ShieldCheck, tone: "bg-blue-50 text-blue-600" },
        { label: "Forms", value: totals.forms, Icon: FileSignature, tone: "bg-violet-50 text-violet-600" },
        { label: "Drivers assigned", value: totals.drivers, Icon: Users, tone: "bg-amber-50 text-amber-600" },
    ];
    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(k => (
                <div key={k.label} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", k.tone)}><k.Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                        <p className="text-2xl font-bold tabular-nums text-slate-900">{k.value}</p>
                        <p className="truncate text-[12px] font-medium text-slate-500">{k.label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Checklists list (table) ─────────────────────────────────────────────────────
type SortCol = "name" | "compliances" | "forms" | "items" | "drivers" | "updated";

function ChecklistsList({ checklists, onNew, onEdit, onRemove }: {
    checklists: DqChecklist[];
    onNew: () => void; onEdit: (id: string) => void; onRemove: (id: string) => void;
}) {
    const [q, setQ] = useState("");
    const [typeFilter, setTypeFilter] = useState<DqDriverTypeId | "all">("all");
    const [sort, setSort] = useState<{ col: SortCol; dir: "asc" | "desc" } | null>(null);

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        return checklists.filter(c => {
            if (typeFilter !== "all" && c.type !== typeFilter) return false;
            if (!query) return true;
            return [c.name, c.description ?? "", driverTypeLabel(c.type), c.jurisdiction ?? ""].join(" ").toLowerCase().includes(query);
        });
    }, [checklists, q, typeFilter]);

    const sortValue = (c: DqChecklist, col: SortCol): string | number =>
        col === "name" ? (c.name || "").toLowerCase()
            : col === "compliances" ? documentCount(c)
                : col === "forms" ? formCount(c)
                    : col === "items" ? itemCount(c)
                        : col === "drivers" ? assignedDriverCount(c.id)
                            : c.updatedAt;
    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const arr = [...filtered];
        arr.sort((a, b) => {
            const av = sortValue(a, sort.col), bv = sortValue(b, sort.col);
            const r = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
            return sort.dir === "asc" ? r : -r;
        });
        return arr;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtered, sort]);
    const toggleSort = (col: SortCol) => setSort(p => (p && p.col === col ? (p.dir === "asc" ? { col, dir: "desc" } : null) : { col, dir: "asc" }));

    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    useEffect(() => setPage(1), [q, pageSize, typeFilter, sort]);
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(startIdx, startIdx + pageSize);

    const confirmDelete = (c: DqChecklist) => { if (window.confirm(`Delete template “${c.name || "Untitled"}”?`)) onRemove(c.id); };

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Card header */}
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className="text-sm font-semibold text-slate-700">DQ Templates
                    <span className="ml-2 font-normal text-slate-400">{q || typeFilter !== "all" ? `${sorted.length} of ${checklists.length}` : checklists.length}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative w-full sm:w-56">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search templates…" className="h-9 pl-9" />
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as DqDriverTypeId | "all")}
                        className="h-9 rounded-md border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                        <option value="all">All types</option>
                        {DQ_DRIVER_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <Button size="sm" onClick={onNew} className="shrink-0"><Plus className="h-4 w-4" /> Add</Button>
                </div>
            </div>

            {checklists.length === 0 ? (
                <EmptyState onNew={onNew} />
            ) : sorted.length === 0 ? (
                <div className="px-6 py-14 text-center">
                    <p className="text-sm font-semibold text-slate-600">No templates match your filters.</p>
                    <button type="button" onClick={() => { setQ(""); setTypeFilter("all"); }} className="mt-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700">Clear filters</button>
                </div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto lg:block">
                        <table className="w-full min-w-[880px]">
                            <thead className="border-b border-slate-200 bg-slate-50/50">
                                <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <SortTh col="name" label="Template" sort={sort} onSort={toggleSort} className="pl-5" />
                                    <SortTh col="compliances" label="Compliances" sort={sort} onSort={toggleSort} className="w-24 justify-center text-center" />
                                    <SortTh col="forms" label="Forms" sort={sort} onSort={toggleSort} className="w-16 justify-center text-center" />
                                    <SortTh col="items" label="Items" sort={sort} onSort={toggleSort} className="w-16 justify-center text-center" />
                                    <SortTh col="drivers" label="Drivers" sort={sort} onSort={toggleSort} className="w-16 justify-center text-center" />
                                    <SortTh col="updated" label="Updated" sort={sort} onSort={toggleSort} className="w-28" />
                                    <th className="w-24 px-4 py-2.5 pr-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map(c => (
                                    <tr key={c.id} className="border-b border-slate-100 align-middle transition-colors hover:bg-slate-50/60">
                                        <td className="px-5 py-3">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FileCheck2 className="h-5 w-5" /></div>
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <p className="truncate text-[14px] font-semibold text-slate-900">{c.name || "Untitled template"}</p>
                                                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", TYPE_BADGE[c.type] ?? "bg-slate-100 text-slate-600")}>{driverTypeLabel(c.type)}</span>
                                                        {c.jurisdiction && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                                                <MapPin className="h-3 w-3 text-slate-400" /> {c.jurisdiction}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {c.description && <p className="mt-0.5 truncate text-[12px] text-slate-500">{c.description}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-slate-700">{documentCount(c)}</td>
                                        <td className="px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-slate-700">{formCount(c)}</td>
                                        <td className="px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-slate-700">{itemCount(c)}</td>
                                        <td className="px-3 py-3 text-center text-[13px] font-semibold tabular-nums text-slate-700">{assignedDriverCount(c.id)}</td>
                                        <td className="px-3 py-3 text-[12px] text-slate-500 whitespace-nowrap">{c.updatedAt}</td>
                                        <td className="px-4 py-3 pr-5">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button type="button" title="Edit" onClick={() => onEdit(c.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                                                <button type="button" title="Delete" onClick={() => confirmDelete(c)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <ul className="divide-y divide-slate-100 lg:hidden">
                        {pageRows.map(c => (
                            <li key={c.id} className="px-4 py-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FileCheck2 className="h-5 w-5" /></div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                            <p className="truncate text-[14px] font-semibold text-slate-900">{c.name || "Untitled template"}</p>
                                            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", TYPE_BADGE[c.type] ?? "bg-slate-100 text-slate-600")}>{driverTypeLabel(c.type)}</span>
                                        </div>
                                        {c.description && <p className="mt-0.5 truncate text-[12px] text-slate-500">{c.description}</p>}
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            <Stat value={documentCount(c)} label="compliances" />
                                            <Stat value={formCount(c)} label="forms" />
                                            <Stat value={itemCount(c)} label="items" />
                                            <Stat value={assignedDriverCount(c.id)} label="drivers" />
                                            <span className="text-[11px] text-slate-400">· Updated {c.updatedAt}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(c.id)}><Pencil className="h-4 w-4" /> Edit</Button>
                                    <Button variant="outline" size="sm" className="flex-1 text-rose-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600" onClick={() => confirmDelete(c)}><Trash2 className="h-4 w-4" /> Delete</Button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                        <div className="flex items-center gap-3 text-[12px] text-slate-500">
                            <label className="flex items-center gap-1.5">Rows per page
                                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                            <span className="tabular-nums">{total === 0 ? "0" : `${startIdx + 1}–${Math.min(startIdx + pageSize, total)}`} of {total}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Prev</button>
                            <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                            <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                                className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function SortTh({ col, label, sort, onSort, className }: {
    col: SortCol; label: string; sort: { col: SortCol; dir: "asc" | "desc" } | null;
    onSort: (col: SortCol) => void; className?: string;
}) {
    const active = sort?.col === col;
    const Icon = !active ? ChevronsUpDown : sort!.dir === "asc" ? ChevronUp : ChevronDown;
    return (
        <th className={cn("px-3 py-2.5", className)}>
            <button type="button" onClick={() => onSort(col)} className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700">
                {label}<Icon size={12} className={active ? "text-slate-600" : "text-slate-300"} />
            </button>
        </th>
    );
}

function Stat({ value, label }: { value: number; label: string }) {
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
            <span className="font-bold tabular-nums text-slate-800">{value}</span> {label}
        </span>
    );
}

function EmptyState({ onNew }: { onNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-500"><ListChecks className="h-7 w-7" /></div>
            <h3 className="mt-5 text-base font-semibold text-slate-700">No DQ templates yet</h3>
            <p className="mt-1.5 max-w-md text-sm text-slate-500">A template is a named, typed set of compliances, forms and check items a driver's qualification file must contain.</p>
            <Button className="mt-5" onClick={onNew}><Plus className="h-4 w-4" /> Add template</Button>
        </div>
    );
}
