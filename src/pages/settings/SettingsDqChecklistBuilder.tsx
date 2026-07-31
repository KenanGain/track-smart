import { useMemo, useState } from "react";
import { ChevronLeft, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    useDqCatalog, getDqChecklist, blankDqChecklist, itemsInCategory,
    DQ_DRIVER_TYPES, DQ_CATEGORIES,
    type DqChecklist, type DqDriverTypeId,
} from "./settings-dq-checklists.data";

/**
 * DQ Checklist builder — compose a named, typed DQ checklist by ticking which
 * catalog check items it should contain, grouped by the 8 FMCSA categories.
 * Mirrors hiring-process/OnbWorkflowBuilder (driver-type tiles + attach items).
 */
export function SettingsDqChecklistBuilder({ checklistId, onBack, onSave }: {
    checklistId: string;
    onBack: () => void;
    onSave: (c: DqChecklist) => void;
}) {
    const { items } = useDqCatalog();
    const existing = checklistId !== "new" ? getDqChecklist(checklistId) : undefined;
    const [cl, setCl] = useState<DqChecklist>(existing ?? blankDqChecklist());

    const selected = useMemo(() => new Set(cl.itemIds), [cl.itemIds]);
    const set = (patch: Partial<DqChecklist>) => setCl(c => ({ ...c, ...patch }));
    const canSave = cl.name.trim().length > 0;
    const save = () => { if (canSave) { onSave({ ...cl, name: cl.name.trim() }); onBack(); } };

    const toggle = (id: string) => set({ itemIds: selected.has(id) ? cl.itemIds.filter(x => x !== id) : [...cl.itemIds, id] });
    const setCategory = (catId: string, on: boolean) => {
        const catIds = itemsInCategory(items, catId as any).map(i => i.id);
        const rest = cl.itemIds.filter(x => !catIds.includes(x));
        set({ itemIds: on ? [...rest, ...catIds] : rest });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Top bar */}
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
                    <ChevronLeft className="h-4 w-4" /> Checklists
                </button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
                    <Button size="sm" onClick={save} disabled={!canSave}><Check className="h-4 w-4" /> Save checklist</Button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings · DQ Files</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{checklistId === "new" ? "New DQ Checklist" : "Edit DQ Checklist"}</h1>
                    <p className="mt-1 text-sm text-slate-500">Pick a driver type, name the checklist, then tick which check items it should contain.</p>
                </div>

                {/* Driver type */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Driver type</p>
                    <p className="mt-0.5 text-xs text-slate-400">Which drivers this DQ checklist is for.</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {DQ_DRIVER_TYPES.map(dt => {
                            const on = cl.type === dt.id;
                            return (
                                <button key={dt.id} type="button" onClick={() => set({ type: dt.id as DqDriverTypeId })}
                                    className={cn("rounded-xl border px-3 py-2.5 text-left transition", on ? "border-blue-400 bg-blue-50 ring-1 ring-blue-200" : "border-slate-200 hover:bg-slate-50")}>
                                    <p className={cn("text-sm font-semibold", on ? "text-blue-700" : "text-slate-800")}>{dt.label}</p>
                                    <p className="text-[11px] text-slate-400">{dt.blurb}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Name + description */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <label className="block text-xs font-semibold text-slate-500">Checklist name
                        <Input value={cl.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Cross Border DQ File" className="mt-1" autoFocus />
                    </label>
                    <label className="block text-xs font-semibold text-slate-500">Description
                        <Input value={cl.description ?? ""} onChange={e => set({ description: e.target.value })} placeholder="Short summary of this checklist" className="mt-1" />
                    </label>
                </div>

                {/* Item selection */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-800">Check items</h2>
                        <p className="text-xs text-slate-500">Tick the items this checklist requires, grouped by FMCSA category.</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{cl.itemIds.length} selected</span>
                </div>

                <div className="flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                    <p><span className="font-semibold">Items come from the category tabs.</span> Anything you add there becomes available to tick here. Uncheck the items that don't apply to this driver type.</p>
                </div>

                {DQ_CATEGORIES.map(cat => {
                    const catItems = itemsInCategory(items, cat.id);
                    const selCount = catItems.filter(i => selected.has(i.id)).length;
                    const allOn = catItems.length > 0 && selCount === catItems.length;
                    return (
                        <div key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-800">{cat.label}</p>
                                    <p className="text-[11px] text-slate-400">{selCount}/{catItems.length} selected</p>
                                </div>
                                {catItems.length > 0 && (
                                    <button type="button" onClick={() => setCategory(cat.id, !allOn)}
                                        className="shrink-0 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                                        {allOn ? "Clear all" : "Select all"}
                                    </button>
                                )}
                            </div>
                            {catItems.length === 0 ? (
                                <div className="px-5 py-6 text-center text-[12px] text-slate-400">No items in this category yet — add some on the “{cat.short}” tab.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {catItems.map(item => {
                                        const on = selected.has(item.id);
                                        return (
                                            <li key={item.id}>
                                                <label className={cn("flex cursor-pointer items-start gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70", on && "bg-blue-50/30")}>
                                                    <input type="checkbox" checked={on} onChange={() => toggle(item.id)} className="mt-0.5 h-4 w-4 accent-blue-600" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-slate-800">
                                                            {item.label || <span className="italic text-slate-400">Untitled item</span>}
                                                            {item.citation && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">{item.citation}</span>}
                                                        </p>
                                                        {item.note && <p className="mt-0.5 text-[11px] text-slate-500">{item.note}</p>}
                                                    </div>
                                                </label>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    );
                })}

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button onClick={save} disabled={!canSave}><Check className="h-4 w-4" /> Save checklist</Button>
                </div>
            </div>
        </div>
    );
}
