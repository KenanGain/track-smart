import { useEffect, useMemo, useState } from "react";
import { Search, Info, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { getDqChecklist, type DqChecklist } from "./settings-dq-checklists.data";

const DRIVER_PAGE_SIZES = [10, 25, 50, 100];

/**
 * DQ File ▸ Add Drivers — pick which drivers a DQ File template applies to.
 * Rendered inside the "Add Drivers" tab on the main DQ Files page.
 * Assignments persist to localStorage keyed by checklist id.
 */

const DQ_ASSIGN_KEY = "dqfiles:assignments-v1";

export function loadDqAssignments(): Record<string, string[]> {
    try { const raw = localStorage.getItem(DQ_ASSIGN_KEY); if (raw) return JSON.parse(raw) as Record<string, string[]>; } catch { /* ignore */ }
    return {};
}
export function assignedDriverCount(checklistId: string): number {
    return (loadDqAssignments()[checklistId] ?? []).length;
}
/** The DQ file (checklist id) a driver is assigned to — a driver belongs to at most ONE. */
export function assignedChecklistId(driverId: string): string | null {
    const all = loadDqAssignments();
    for (const [cid, ids] of Object.entries(all)) if ((ids ?? []).includes(driverId)) return cid;
    return null;
}
// EXCLUSIVE — a driver belongs to exactly one DQ file. Persisting this checklist's roster
// removes those drivers from every OTHER checklist so the system is never confused about
// which DQ file a driver uses.
function persistDqAssignments(checklistId: string, ids: string[]) {
    const all = loadDqAssignments();
    const idSet = new Set(ids);
    for (const other of Object.keys(all)) {
        if (other === checklistId) continue;
        all[other] = (all[other] ?? []).filter(id => !idSet.has(id));
    }
    all[checklistId] = ids;
    try { localStorage.setItem(DQ_ASSIGN_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

// Roster panel — assign drivers to a single checklist. Re-mount (key by checklist.id)
// to reset the local assigned set when the selected template changes.
export function DriverAssignPanel({ checklist, accountId }: { checklist: DqChecklist; accountId?: string }) {
    const [q, setQ] = useState("");
    const [assigned, setAssigned] = useState<Set<string>>(() => new Set(loadDqAssignments()[checklist.id] ?? []));

    const drivers = useMemo(() => (accountId ? getDriversForAccount(accountId) : []), [accountId]);
    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        return drivers.filter(d => !query || `${d.name} ${d.email ?? ""} ${d.driverType ?? ""}`.toLowerCase().includes(query));
    }, [drivers, q]);

    const [pageSize, setPageSize] = useState(10);
    const [page, setPage] = useState(1);
    useEffect(() => setPage(1), [q, pageSize]);
    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const startIdx = (safePage - 1) * pageSize;
    const pageRows = filtered.slice(startIdx, startIdx + pageSize);

    const commit = (next: Set<string>) => { setAssigned(new Set(next)); persistDqAssignments(checklist.id, [...next]); };
    const allSel = filtered.length > 0 && filtered.every(d => assigned.has(d.id));
    const toggleOne = (id: string) => { const n = new Set(assigned); n.has(id) ? n.delete(id) : n.add(id); commit(n); };
    const toggleAll = () => {
        const n = new Set(assigned);
        if (allSel) filtered.forEach(d => n.delete(d.id)); else filtered.forEach(d => n.add(d.id));
        commit(n);
    };

    // Which OTHER DQ file each driver is currently on — a driver belongs to ONE file, so
    // toggling them on here MOVES them off that other file. Recompute after each commit.
    const otherAssignedName = useMemo(() => {
        const all = loadDqAssignments();
        const m = new Map<string, string>();
        for (const [cid, ids] of Object.entries(all)) {
            if (cid === checklist.id) continue;
            const name = getDqChecklist(cid)?.name || "another DQ file";
            (ids ?? []).forEach(id => { if (!m.has(id)) m.set(id, name); });
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checklist.id, assigned]);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[12px] text-blue-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <p>Pick the drivers <span className="font-semibold">{checklist.name || "this DQ file"}</span> applies to. <span className="font-semibold">Each driver belongs to one DQ file</span> — assigning a driver here moves them off any other DQ file so the system always knows which file a driver uses.</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="relative w-full lg:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search drivers…" className="h-9 pl-9" />
                    </div>
                    <span className="shrink-0 text-[12px] font-medium text-slate-500 tabular-nums">{assigned.size} assigned</span>
                </div>

                {drivers.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-400">No drivers on this account.</div>
                ) : filtered.length === 0 ? (
                    <div className="px-5 py-12 text-center text-sm text-slate-400">No drivers match “{q}”.</div>
                ) : (
                    <>
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full min-w-[620px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr className="text-left">
                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Driver</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</th>
                                        <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="px-4 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-2">Assigned <Toggle checked={allSel} onCheckedChange={toggleAll} /></span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(d => {
                                        const on = assigned.has(d.id);
                                        return (
                                            <tr key={d.id} className={cn("border-b border-slate-100 transition-colors", on ? "bg-blue-50/40" : "hover:bg-slate-50/60")}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">{d.avatarInitials ?? <UserRound className="h-4 w-4" />}</div>
                                                        <div className="min-w-0">
                                                            <p className="truncate text-[13px] font-semibold text-slate-800">{d.name}</p>
                                                            {d.email && <p className="truncate text-[11px] text-slate-400">{d.email}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-[12px] text-slate-600">{d.driverType ?? "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{d.status ?? "—"}</span>
                                                    {!on && otherAssignedName.has(d.id) && <span className="ml-1.5 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">On {otherAssignedName.get(d.id)}</span>}
                                                </td>
                                                <td className="px-4 py-3 pr-5 text-right"><Toggle checked={on} onCheckedChange={() => toggleOne(d.id)} className="ml-auto" /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <ul className="divide-y divide-slate-100 lg:hidden">
                            {pageRows.map(d => {
                                const on = assigned.has(d.id);
                                return (
                                    <li key={d.id} className={cn("flex items-center gap-3 px-4 py-3", on && "bg-blue-50/30")}>
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">{d.avatarInitials ?? <UserRound className="h-4 w-4" />}</div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-semibold text-slate-800">{d.name}</p>
                                            <p className="truncate text-[11px] text-slate-400">{d.driverType ?? ""}{d.status ? ` · ${d.status}` : ""}</p>
                                            {!on && otherAssignedName.has(d.id) && <span className="mt-1 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">On {otherAssignedName.get(d.id)}</span>}
                                        </div>
                                        <Toggle checked={on} onCheckedChange={() => toggleOne(d.id)} className="shrink-0" />
                                    </li>
                                );
                            })}
                        </ul>

                        {/* Pagination */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
                            <div className="flex items-center gap-3 text-[12px] text-slate-500">
                                <label className="flex items-center gap-1.5">Rows per page
                                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                                        {DRIVER_PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
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
        </div>
    );
}
