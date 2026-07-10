import { useState } from "react";
import { ChevronLeft, Check, X, KeyRound, Plus, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ACCESSORY_TYPES, ACCESSORY_CATEGORIES, getAccessoryChecklist, blankAccessoryChecklist,
    type AccessoryChecklist, type AccessoryChecklistItem,
} from "./onboarding.data";

/**
 * AccessoryChecklistBuilder — create / edit a named accessory hand-over checklist.
 * Pick items from the master catalog (grouped by category) or add custom items;
 * the saved checklist is then attachable to an onboarding workflow's Accessories step.
 */
export function AccessoryChecklistBuilder({ checklistId, onBack, onSave }: { checklistId: string; onBack: () => void; onSave: (c: AccessoryChecklist) => void }) {
    const existing = checklistId !== "new" ? getAccessoryChecklist(checklistId) : undefined;
    const [cl, setCl] = useState<AccessoryChecklist>(existing ?? blankAccessoryChecklist());
    const [customName, setCustomName] = useState("");

    const set = (patch: Partial<AccessoryChecklist>) => setCl((c) => ({ ...c, ...patch }));
    const attachedIds = new Set(cl.items.map((i) => i.id));
    const addItem = (item: AccessoryChecklistItem) => { if (!attachedIds.has(item.id)) set({ items: [...cl.items, item] }); };
    const removeItem = (id: string) => set({ items: cl.items.filter((i) => i.id !== id) });
    const addCustom = () => {
        const name = customName.trim();
        if (!name) return;
        addItem({ id: `acc-${Date.now().toString(36)}-${cl.items.length}`, name, category: "Custom" });
        setCustomName("");
    };

    const canSave = cl.name.trim().length > 0 && cl.items.length > 0;
    const save = () => { if (canSave) { onSave({ ...cl, name: cl.name.trim() }); onBack(); } };

    const cats = ACCESSORY_CATEGORIES.filter((c) => ACCESSORY_TYPES.some((a) => a.category === c));

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Accessories</button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
                    <Button size="sm" onClick={save} disabled={!canSave}><Check className="h-4 w-4" /> Save checklist</Button>
                </div>
            </div>

            <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Hiring · Onboarding</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{checklistId === "new" ? "New Accessory Checklist" : "Edit Accessory Checklist"}</h1>
                    <p className="mt-1 text-sm text-slate-500">A named set of items handed over to a driver. Attach it to an onboarding workflow's Accessories step.</p>
                </div>

                {/* Name + description */}
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <label className="block text-xs font-semibold text-slate-500">Checklist name
                        <Input value={cl.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Standard Driver Kit" className="mt-1" autoFocus />
                    </label>
                    <label className="block text-xs font-semibold text-slate-500">Description
                        <Input value={cl.description ?? ""} onChange={(e) => set({ description: e.target.value })} placeholder="Short summary of this kit" className="mt-1" />
                    </label>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Attached items */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                            <p className="flex items-center gap-2 text-sm font-bold text-slate-800"><KeyRound className="h-4 w-4 text-amber-500" /> Items in this checklist</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{cl.items.length} item{cl.items.length === 1 ? "" : "s"}</span>
                        </div>
                        <div className="space-y-2 p-5">
                            {cl.items.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-3 py-6 text-center text-sm text-slate-400">No items yet — add from the catalog or a custom item.</p>}
                            {cl.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2">
                                    <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-700">{item.name}</p>
                                        <p className="truncate text-xs text-slate-400">{item.category ?? "Accessory"}{item.note ? ` · ${item.note}` : ""}</p>
                                    </div>
                                    <button type="button" onClick={() => removeItem(item.id)} className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button>
                                </div>
                            ))}
                            <div className="flex gap-2 pt-1">
                                <Input value={customName} onChange={(e) => setCustomName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }} placeholder="Add a custom item…" className="flex-1" />
                                <Button variant="outline" size="sm" onClick={addCustom} disabled={!customName.trim()}><Plus className="h-4 w-4" /> Add</Button>
                            </div>
                        </div>
                    </div>

                    {/* Catalog picker */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-3.5">
                            <p className="text-sm font-bold text-slate-800">Add from catalog</p>
                            <p className="text-xs text-slate-500">Tap an item to add it to the checklist.</p>
                        </div>
                        <div className="max-h-[520px] space-y-4 overflow-y-auto p-5">
                            {cats.map((cat) => {
                                const list = ACCESSORY_TYPES.filter((a) => a.category === cat);
                                return (
                                    <div key={cat}>
                                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{cat}</p>
                                        <div className="space-y-1.5">
                                            {list.map((a) => {
                                                const on = attachedIds.has(a.id);
                                                return (
                                                    <button key={a.id} type="button" disabled={on} onClick={() => addItem({ id: a.id, name: a.name, category: a.category, note: a.note })}
                                                        className={cn("flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition", on ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 hover:border-blue-300 hover:bg-blue-50/40")}>
                                                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", on ? "bg-emerald-100 text-emerald-600" : "bg-amber-50 text-amber-600")}>{on ? <Check className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}</span>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate text-sm font-medium text-slate-700">{a.name}</p>
                                                            {a.note && <p className="truncate text-xs text-slate-400">{a.note}</p>}
                                                        </div>
                                                        {on ? <span className="shrink-0 text-[11px] font-semibold text-emerald-600">Added</span> : <Plus className="h-4 w-4 shrink-0 text-slate-400" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                    <Button variant="outline" onClick={onBack}>Cancel</Button>
                    <Button onClick={save} disabled={!canSave}><Check className="h-4 w-4" /> Save checklist</Button>
                </div>
            </div>
        </div>
    );
}
