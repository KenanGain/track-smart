import { useState } from "react";
import { X as XIcon, Plus, Trash2, Save, FileCheck2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    loadDqProfiles, upsertDqProfile, deleteDqProfile, newDqProfile, uidDq,
    DQ_DRIVER_TYPES, type DqProfile, type DqDriverType,
} from "./dq-profiles.data";

/**
 * DQ Checklist builder — create / edit checklist PROFILES (Local, US, Canada,
 * Cross-Border, or custom). Each profile is a set of sections + items and the
 * driver types it auto-applies to. Saved to localStorage.
 */
export function DqChecklistBuilder({ onClose }: { onClose: () => void }) {
    const [profiles, setProfiles] = useState<DqProfile[]>(() => loadDqProfiles());
    const [selectedId, setSelectedId] = useState<string>(() => loadDqProfiles()[0]?.id ?? '');
    const [draft, setDraft] = useState<DqProfile | null>(() => {
        const list = loadDqProfiles();
        return list.find(p => p.id === (list[0]?.id ?? '')) ?? null;
    });
    const [savedFlash, setSavedFlash] = useState(false);

    const select = (id: string) => {
        setSelectedId(id);
        setDraft(profiles.find(p => p.id === id) ?? null);
    };
    const createNew = () => {
        const p = newDqProfile();
        setProfiles([p, ...profiles]);
        setSelectedId(p.id);
        setDraft(p);
    };
    const save = () => {
        if (!draft) return;
        const next = upsertDqProfile(draft);
        setProfiles(next);
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
    };
    const remove = () => {
        if (!draft || draft.isBuiltIn) return;
        if (!window.confirm(`Delete checklist "${draft.name}"?`)) return;
        const next = deleteDqProfile(draft.id);
        setProfiles(next);
        select(next[0]?.id ?? '');
    };

    // ── Draft editing ──
    const patch = (p: Partial<DqProfile>) => setDraft(d => d ? { ...d, ...p } : d);
    const setSections = (fn: (s: DqProfile['sections']) => DqProfile['sections']) =>
        setDraft(d => d ? { ...d, sections: fn(d.sections) } : d);
    const addSection = () => setSections(s => [...s, { id: `sec-${uidDq()}`, title: 'New section', items: [] }]);
    const removeSection = (i: number) => setSections(s => s.filter((_, x) => x !== i));
    const renameSection = (i: number, title: string) => setSections(s => s.map((sec, x) => x === i ? { ...sec, title } : sec));
    const addItem = (si: number) => setSections(s => s.map((sec, x) => x === si ? { ...sec, items: [...sec.items, { id: `it-${uidDq()}`, label: 'New item', keywords: [] }] } : sec));
    const removeItem = (si: number, ii: number) => setSections(s => s.map((sec, x) => x === si ? { ...sec, items: sec.items.filter((_, y) => y !== ii) } : sec));
    const patchItem = (si: number, ii: number, p: Partial<{ label: string; keywords: string[]; conditional: boolean }>) =>
        setSections(s => s.map((sec, x) => x === si ? { ...sec, items: sec.items.map((it, y) => y === ii ? { ...it, ...p } : it) } : sec));
    const toggleType = (t: DqDriverType) => patch({
        appliesTo: draft!.appliesTo.includes(t) ? draft!.appliesTo.filter(x => x !== t) : [...draft!.appliesTo, t],
    });

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><FileCheck2 size={16} /></span>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">DQ Checklists</h2>
                            <p className="text-[11px] text-slate-500">Create and edit the DQ file requirements per driver type.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"><XIcon size={16} /></button>
                </div>

                <div className="flex min-h-0 flex-1">
                    {/* Left — profile list */}
                    <div className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/60 p-3">
                        <button type="button" onClick={createNew}
                            className="mb-3 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 text-[12px] font-bold text-white hover:bg-blue-700">
                            <Plus size={13} /> New checklist
                        </button>
                        <ul className="space-y-1">
                            {profiles.map(p => (
                                <li key={p.id}>
                                    <button type="button" onClick={() => select(p.id)}
                                        className={cn('w-full rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors',
                                            selectedId === p.id ? 'bg-white font-bold text-blue-700 shadow-sm ring-1 ring-blue-200' : 'text-slate-600 hover:bg-white')}>
                                        <span className="flex items-center gap-1.5">
                                            <span className="truncate">{p.name}</span>
                                            {p.isBuiltIn && <Lock size={10} className="shrink-0 text-slate-300" />}
                                        </span>
                                        <span className="mt-0.5 block truncate text-[10px] font-normal text-slate-400">
                                            {p.appliesTo.length ? p.appliesTo.map(t => DQ_DRIVER_TYPES.find(d => d.id === t)?.label).join(', ') : 'Unassigned'}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Right — editor */}
                    {!draft ? (
                        <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Select or create a checklist.</div>
                    ) : (
                        <div className="flex min-w-0 flex-1 flex-col">
                            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                                {/* Profile meta */}
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <Field label="Checklist name">
                                        <input value={draft.name} onChange={e => patch({ name: e.target.value })} className={INP} />
                                    </Field>
                                    <Field label="Description">
                                        <input value={draft.description} onChange={e => patch({ description: e.target.value })} className={INP} />
                                    </Field>
                                </div>
                                <div className="mt-3">
                                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Applies to driver types (auto)</div>
                                    <div className="flex flex-wrap gap-2">
                                        {DQ_DRIVER_TYPES.map(t => {
                                            const on = draft.appliesTo.includes(t.id);
                                            return (
                                                <button key={t.id} type="button" onClick={() => toggleType(t.id)}
                                                    className={cn('rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors',
                                                        on ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300')}>
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Sections */}
                                <div className="mt-5 space-y-4">
                                    {draft.sections.map((sec, si) => (
                                        <div key={sec.id ?? si} className="overflow-hidden rounded-xl border border-slate-200">
                                            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                                                <input value={sec.title} onChange={e => renameSection(si, e.target.value)}
                                                    className="flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-bold text-slate-800 hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:outline-none" />
                                                <button type="button" onClick={() => removeSection(si)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={13} /></button>
                                            </div>
                                            <ul className="divide-y divide-slate-100">
                                                {sec.items.map((it, ii) => (
                                                    <li key={it.id ?? ii} className="flex flex-wrap items-center gap-2 px-3 py-2">
                                                        <input value={it.label} onChange={e => patchItem(si, ii, { label: e.target.value })}
                                                            placeholder="Item label" className="min-w-[160px] flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-[12px] focus:border-blue-400 focus:outline-none" />
                                                        <input value={it.keywords.join(', ')} onChange={e => patchItem(si, ii, { keywords: e.target.value.split(',').map(k => k.trim().toLowerCase()).filter(Boolean) })}
                                                            placeholder="match keywords (comma-separated)" title="Lowercased substrings that mark this item present"
                                                            className="min-w-[160px] flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-[11px] text-slate-500 focus:border-blue-400 focus:outline-none" />
                                                        <label className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                                                            <input type="checkbox" checked={!!it.conditional} onChange={e => patchItem(si, ii, { conditional: e.target.checked })} className="accent-blue-600" />
                                                            If applicable
                                                        </label>
                                                        <button type="button" onClick={() => removeItem(si, ii)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={12} /></button>
                                                    </li>
                                                ))}
                                            </ul>
                                            <button type="button" onClick={() => addItem(si)}
                                                className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-2 text-[11px] font-bold text-blue-600 hover:bg-blue-50">
                                                <Plus size={12} /> Add item
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addSection}
                                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-4 text-[12px] font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                                        <Plus size={14} /> Add section
                                    </button>
                                </div>
                            </div>

                            {/* Footer actions */}
                            <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-5 py-3">
                                <div>
                                    {!draft.isBuiltIn && (
                                        <button type="button" onClick={remove} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 text-[13px] font-bold text-rose-600 hover:bg-rose-50">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {savedFlash && <span className="text-[12px] font-bold text-emerald-600">Saved ✓</span>}
                                    <button type="button" onClick={save} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-5 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700">
                                        <Save size={14} /> Save checklist
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const INP = "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return <div><label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>{children}</div>;
}
