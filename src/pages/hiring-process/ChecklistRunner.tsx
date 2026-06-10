import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { SignaturePad } from "./FormKit";
import type { Checklist, ChecklistField, ChecklistState } from "./checklists.data";
import type { ApplicantPrefill } from "./application-prefill";
import type { DocSection } from "./FormDocument";

export const STAGE_COLORS = [
    { pill: "bg-teal-100 text-teal-700", title: "text-teal-700", bar: "bg-teal-500", border: "border-teal-200", checkBg: "border-teal-300 bg-teal-50/60" },
    { pill: "bg-orange-100 text-orange-700", title: "text-orange-600", bar: "bg-orange-500", border: "border-orange-200", checkBg: "border-orange-300 bg-orange-50/60" },
    { pill: "bg-blue-100 text-blue-700", title: "text-blue-700", bar: "bg-blue-500", border: "border-blue-200", checkBg: "border-blue-300 bg-blue-50/60" },
    { pill: "bg-emerald-100 text-emerald-700", title: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200", checkBg: "border-emerald-300 bg-emerald-50/60" },
    { pill: "bg-violet-100 text-violet-700", title: "text-violet-700", bar: "bg-violet-500", border: "border-violet-200", checkBg: "border-violet-300 bg-violet-50/60" },
    { pill: "bg-rose-100 text-rose-700", title: "text-rose-700", bar: "bg-rose-500", border: "border-rose-200", checkBg: "border-rose-300 bg-rose-50/60" },
];

function defaultFor(field: ChecklistField, pf: ApplicantPrefill): string {
    const l = field.label.toLowerCase();
    if (l.includes("name")) return pf.fullName;
    if (l.includes("phone")) return pf.phone;
    return "";
}
const resolveNote = (note: string | undefined, company: string) => (note ?? "").replace(/\{\{company\}\}/g, company);

export function checklistProgress(c: Checklist, state: ChecklistState): { done: number; total: number } {
    const total = c.stages.reduce((n, s) => n + s.items.length, 0);
    const done = c.stages.reduce((n, s) => n + s.items.filter((it) => state.items?.[it.id]).length, 0);
    return { done, total };
}

// Build the printable document sections for a filled checklist.
export function buildChecklistSections(c: Checklist, state: ChecklistState, pf: ApplicantPrefill, company: string): DocSection[] {
    const val = (f: ChecklistField) => state.fields?.[f.id] || defaultFor(f, pf);
    const sections: DocSection[] = [];
    const headRows = [
        ...(c.note ? [{ label: "Notice", value: resolveNote(c.note, company) }] : []),
        ...c.headerFields.map((f) => ({ label: f.label, value: val(f) })),
    ];
    if (headRows.length) sections.push({ title: c.name, groups: [{ rows: headRows }] });
    for (const stage of c.stages) {
        sections.push({
            title: stage.title,
            groups: [{
                rows: stage.items.map((it) => ({ label: it.text, value: state.items?.[it.id] ? "✓" : "—" })),
                images: stage.signature && state.sigs?.[stage.id] ? [state.sigs[stage.id]] : undefined,
            }],
        });
    }
    if (c.footerFields.length) sections.push({ title: "Completion", groups: [{ rows: c.footerFields.map((f) => ({ label: f.label, value: val(f) })) }] });
    return sections;
}

export function ChecklistRunner({ checklist, state, pf, company, onField, onToggle, onSig }: {
    checklist: Checklist; state: ChecklistState; pf: ApplicantPrefill; company: string;
    onField: (id: string, v: string) => void; onToggle: (id: string, v: boolean) => void; onSig: (stageId: string, v: string) => void;
}) {
    const fieldVal = (f: ChecklistField) => state.fields?.[f.id] ?? defaultFor(f, pf);
    return (
        <div className="space-y-4">
            {checklist.note && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-sm text-amber-800">{resolveNote(checklist.note, company)}</p>
                </div>
            )}

            {checklist.headerFields.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {checklist.headerFields.map((f) => (
                        <div key={f.id}>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{f.label}</label>
                            <Input type={f.type === "date" ? "date" : "text"} value={fieldVal(f)} onChange={(e) => onField(f.id, e.target.value)} />
                        </div>
                    ))}
                </div>
            )}

            {checklist.stages.map((stage, si) => {
                const c = STAGE_COLORS[si % STAGE_COLORS.length];
                const done = stage.items.filter((it) => state.items?.[it.id]).length;
                return (
                    <div key={stage.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className={`flex items-center gap-2 border-b-2 px-4 py-3 ${c.border}`}>
                            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.pill}`}>Stage {si + 1}</span>
                            <h3 className={`text-base font-bold ${c.title}`}>{stage.title}</h3>
                            <span className="ml-auto text-xs font-medium text-slate-400">{done}/{stage.items.length}</span>
                        </div>
                        <div className="space-y-2 p-4">
                            {stage.items.map((it) => {
                                const on = !!state.items?.[it.id];
                                return (
                                    <label key={it.id} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${on ? c.checkBg : "border-slate-200 hover:bg-slate-50"}`}>
                                        <Checkbox checked={on} onCheckedChange={(v) => onToggle(it.id, !!v)} className="mt-0.5" />
                                        <span className={`text-sm ${on ? "font-medium text-slate-700" : "text-slate-600"}`}>{it.text}</span>
                                    </label>
                                );
                            })}
                            {stage.signature && (
                                <div className="pt-2">
                                    <span className={`mb-1.5 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${c.pill}`}>{stage.title} Approval</span>
                                    <SignaturePad label="Supervisor Signature" onChange={(v) => onSig(stage.id, v)} />
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {checklist.footerFields.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {checklist.footerFields.map((f) => (
                        <div key={f.id}>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{f.label}</label>
                            <Input type={f.type === "date" ? "date" : "text"} value={fieldVal(f)} onChange={(e) => onField(f.id, e.target.value)} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
