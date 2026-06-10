import { useState } from "react";
import { ChevronLeft, Plus, Trash2, Check, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectBox, ToggleRow } from "./FormKit";
import { STAGE_COLORS } from "./ChecklistRunner";
import { useChecklists, type Checklist, type ChecklistField, type ChecklistStage, type ChecklistItem, type ChecklistFieldType } from "./checklists.data";

const FIELD_TYPES = ["text", "phone", "date"];
let counter = 0;
const nid = (p: string) => `${p}-${Date.now()}-${counter++}`;

export function ChecklistBuilder({ checklistId, onBack }: { checklistId: string; onBack: () => void }) {
    const { checklists, save } = useChecklists();
    const existing = checklistId === "new" ? undefined : checklists.find((c) => c.id === checklistId);

    const [name, setName] = useState(existing?.name ?? "");
    const [description, setDescription] = useState(existing?.description ?? "");
    const [note, setNote] = useState(existing?.note ?? "");
    const [headerFields, setHeaderFields] = useState<ChecklistField[]>(existing?.headerFields ?? [{ id: nid("h"), label: "Driver Name", type: "text" }]);
    const [stages, setStages] = useState<ChecklistStage[]>(existing?.stages ?? [{ id: nid("s"), title: "Stage 1", signature: true, items: [{ id: nid("i"), text: "" }] }]);
    const [footerFields, setFooterFields] = useState<ChecklistField[]>(existing?.footerFields ?? []);
    const [error, setError] = useState("");

    const patchStage = (id: string, patch: Partial<ChecklistStage>) => setStages((l) => l.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const patchItem = (sid: string, iid: string, text: string) => setStages((l) => l.map((s) => (s.id === sid ? { ...s, items: s.items.map((it) => (it.id === iid ? { ...it, text } : it)) } : s)));

    const onSave = () => {
        if (!name.trim()) { setError("Give the checklist a name."); return; }
        const cleanStages = stages.map((s) => ({ ...s, items: s.items.filter((it) => it.text.trim()) })).filter((s) => s.title.trim() && s.items.length);
        if (!cleanStages.length) { setError("Add at least one stage with an item."); return; }
        const cl: Checklist = {
            id: existing?.id ?? `cl-${Date.now()}`, name: name.trim(), description: description.trim() || undefined, note: note.trim() || undefined, locked: existing?.locked,
            headerFields: headerFields.filter((f) => f.label.trim()), stages: cleanStages, footerFields: footerFields.filter((f) => f.label.trim()),
        };
        save(cl);
        onBack();
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"><ChevronLeft className="h-4 w-4" /> Checklists</button>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack}>Cancel</Button>
                    <Button size="sm" onClick={onSave}><Check className="h-4 w-4" /> Save checklist</Button>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-6 px-6 py-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Hiring Process · Checklist</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{checklistId === "new" ? "New Checklist" : "Edit Checklist"}</h1>
                    <p className="mt-1 text-sm text-slate-500">Build the staged approval checklist. Attach it to a template — it becomes the final Review &amp; Completion step.</p>
                </div>

                {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <Labeled label="Checklist Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Driver Hiring Approval" /></Labeled>
                    <Labeled label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short summary" /></Labeled>
                    <Labeled label="Notice (shown at the top)" hint="Use {{company}} to insert the carrier name."><textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></Labeled>
                </div>

                <FieldEditor title="Header fields" fields={headerFields} setFields={setHeaderFields} />

                {/* Stages */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-slate-900">Stages</h2>
                    {stages.map((s, i) => {
                        const c = STAGE_COLORS[i % STAGE_COLORS.length];
                        return (
                        <div key={s.id} className={`rounded-xl border-l-4 border-y border-r border-slate-200 bg-white p-5 shadow-sm ${c.border}`}>
                            <div className="mb-4 flex items-center gap-2">
                                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white ${c.bar}`}>{i + 1}</span>
                                <Input value={s.title} onChange={(e) => patchStage(s.id, { title: e.target.value })} placeholder="Stage title" className="h-9 flex-1 font-semibold" />
                                <button type="button" onClick={() => setStages((l) => l.filter((x) => x.id !== s.id))} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                            </div>
                            <div className="space-y-2">
                                {s.items.map((it) => (
                                    <div key={it.id} className="flex items-center gap-2">
                                        <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
                                        <Input value={it.text} onChange={(e) => patchItem(s.id, it.id, e.target.value)} placeholder="Checklist item text" className="h-9 flex-1" />
                                        <button type="button" onClick={() => patchStage(s.id, { items: s.items.filter((x) => x.id !== it.id) })} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => patchStage(s.id, { items: [...s.items, { id: nid("i"), text: "" }] })} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"><Plus className="h-3.5 w-3.5" /> Add item</button>
                            </div>
                            <div className="mt-4">
                                <ToggleRow label="Require an approval signature for this stage" checked={s.signature} onChange={(v) => patchStage(s.id, { signature: v })} />
                            </div>
                        </div>
                    ); })}
                    <button type="button" onClick={() => setStages((l) => [...l, { id: nid("s"), title: `Stage ${l.length + 1}`, signature: true, items: [{ id: nid("i"), text: "" }] }])} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-300 bg-white px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Add Stage</button>
                </div>

                <FieldEditor title="Footer fields" fields={footerFields} setFields={setFooterFields} />
            </div>
        </div>
    );
}

function FieldEditor({ title, fields, setFields }: { title: string; fields: ChecklistField[]; setFields: React.Dispatch<React.SetStateAction<ChecklistField[]>> }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>
            <div className="space-y-2">
                {fields.map((f) => (
                    <div key={f.id} className="flex items-center gap-2">
                        <Input value={f.label} onChange={(e) => setFields((l) => l.map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)))} placeholder="Field label" className="h-9 flex-1" />
                        <div className="w-28"><SelectBox value={f.type} items={FIELD_TYPES} onChange={(v) => setFields((l) => l.map((x) => (x.id === f.id ? { ...x, type: v as ChecklistFieldType } : x)))} /></div>
                        <button type="button" onClick={() => setFields((l) => l.filter((x) => x.id !== f.id))} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                ))}
                <button type="button" onClick={() => setFields((l) => [...l, { id: nid("f"), label: "", type: "text" } as ChecklistField])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"><Plus className="h-3.5 w-3.5" /> Add field</button>
            </div>
        </div>
    );
}

function Labeled({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
            {children}
            {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
    );
}

// Avoid unused-import noise for ChecklistItem (referenced via ChecklistStage).
export type { ChecklistItem };
