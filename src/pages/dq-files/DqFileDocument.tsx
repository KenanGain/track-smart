import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ReviewSignOff, newSignOff, type SignOffData } from "@/pages/hiring-process/FormKit";
import {
    itemsInCategory, driverTypeLabel, DQ_CATEGORIES,
    type DqChecklist, type DqCatalogItem, type DqDriverTypeId,
} from "@/pages/settings/settings-dq-checklists.data";
import type { DqFileFill, Verification } from "./dq-driver-files.data";

/**
 * DQ File document body — the FMCSA-style rendering shared by the Settings
 * checklist runner (session fill) and the per-driver DQ file (persisted fill).
 * Fully controlled via `fill` / `onFillChange`.
 *   • mode "test" — editable verification select + notes + inputs.
 *   • mode "pdf"  — read-only printable document.
 */

const VERIFICATIONS: { id: Verification; label: string }[] = [
    { id: "", label: "—" },
    { id: "present", label: "Present" },
    { id: "missing", label: "Missing" },
    { id: "expired", label: "Expired" },
    { id: "na", label: "N/A" },
];
const VERIF_LABEL: Record<Verification, string> = { "": "—", present: "Present", missing: "Missing", expired: "Expired", na: "N/A" };
const VERIF_CELL: Record<Verification, string> = {
    "": "bg-white text-slate-400",
    present: "bg-emerald-100 text-emerald-800",
    missing: "bg-amber-100 text-amber-800",
    expired: "bg-rose-100 text-rose-800",
    na: "bg-slate-100 text-slate-500",
};

// Driver / Vehicle information header fields (from the FMCSA template).
const HEADER_FIELDS: { key: string; label: string; type: "text" | "date" }[] = [
    { key: "driverName", label: "Driver's Name", type: "text" },
    { key: "cdl", label: "CDL Number / State", type: "text" },
    { key: "hireDate", label: "Date of Hire", type: "date" },
    { key: "dob", label: "Date of Birth", type: "date" },
    { key: "vin", label: "Vehicle Identification Number (VIN)", type: "text" },
    { key: "plate", label: "License Plate Number", type: "text" },
    { key: "fleetUnit", label: "Fleet Unit Number (if applicable)", type: "text" },
    { key: "reviewDate", label: "Date of Review / Inspection", type: "date" },
];

export function DqFileDocument({ checklist, catalog, mode, fill, onFillChange, subjectName, typeLabelOverride }: {
    checklist: DqChecklist | undefined;
    catalog: DqCatalogItem[];
    mode: "test" | "pdf";
    fill: DqFileFill;
    onFillChange: (f: DqFileFill) => void;
    subjectName?: string;
    typeLabelOverride?: DqDriverTypeId;
}) {
    const isPdf = mode === "pdf";

    const grouped = useMemo(() => {
        if (!checklist) return [];
        const sel = new Set(checklist.itemIds);
        return DQ_CATEGORIES
            .map(cat => ({ cat, items: itemsInCategory(catalog, cat.id).filter(i => sel.has(i.id)) }))
            .filter(g => g.items.length > 0);
    }, [checklist, catalog]);

    const itemFill = (id: string) => fill.items[id] ?? { verification: "" as Verification, notes: "" };
    const setItem = (id: string, patch: Partial<{ verification: Verification; notes: string }>) =>
        onFillChange({ ...fill, items: { ...fill.items, [id]: { ...itemFill(id), ...patch } } });
    const setHeader = (key: string, v: string) => onFillChange({ ...fill, header: { ...fill.header, [key]: v } });
    const setNextReview = (v: string) => onFillChange({ ...fill, nextReview: v });
    const setSignoff = (v: SignOffData) => onFillChange({ ...fill, signoff: v });

    const typeLabel = driverTypeLabel(typeLabelOverride ?? checklist?.type ?? "us_only");

    return (
        <div className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white", isPdf ? "shadow-none print:border-0" : "shadow-sm")}>
            {/* Document header */}
            <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Driver Qualification File</p>
                        <h1 className="mt-1 text-xl font-bold text-slate-900">{subjectName ?? checklist?.name ?? "DQ File"}</h1>
                        {subjectName && checklist && <p className="mt-0.5 text-sm text-slate-500">{checklist.name}</p>}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{typeLabel}</span>
                </div>
            </div>

            {/* Driver / Vehicle Information */}
            <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="mb-3 text-sm font-bold text-blue-700">Driver / Vehicle Information</h2>
                <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    {HEADER_FIELDS.map(f => (
                        <div key={f.key} className="flex flex-col gap-1">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{f.label}</label>
                            {isPdf ? (
                                <div className="min-h-[26px] border-b border-slate-200 pb-1 text-sm text-slate-800">{fill.header[f.key] || " "}</div>
                            ) : (
                                <input type={f.type} value={fill.header[f.key] ?? ""} onChange={e => setHeader(f.key, e.target.value)}
                                    className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Category tables */}
            <div className="space-y-6 px-6 py-5">
                {grouped.map(({ cat, items: catItems }) => (
                    <section key={cat.id}>
                        <h3 className="mb-2 text-sm font-bold text-slate-800">{cat.label}</h3>
                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                        <th className="w-1/2 border-b border-slate-200 px-3 py-2">Check Item</th>
                                        <th className="w-32 border-b border-slate-200 px-3 py-2">Verification</th>
                                        <th className="border-b border-slate-200 px-3 py-2">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {catItems.map((item: DqCatalogItem) => {
                                        const st = itemFill(item.id);
                                        return (
                                            <tr key={item.id} className="align-top">
                                                <td className="border-b border-slate-100 px-3 py-2.5">
                                                    <p className="font-semibold text-slate-800">
                                                        {item.label}
                                                        {item.citation && <span className="ml-1.5 text-[11px] font-medium text-slate-400">({item.citation})</span>}
                                                    </p>
                                                    {item.note && <p className="mt-0.5 text-[11px] text-slate-400">{item.note}</p>}
                                                </td>
                                                <td className={cn("border-b border-slate-100 px-3 py-2.5", isPdf && VERIF_CELL[st.verification])}>
                                                    {isPdf ? (
                                                        <span className="text-[13px] font-semibold">{VERIF_LABEL[st.verification]}</span>
                                                    ) : (
                                                        <select value={st.verification} onChange={e => setItem(item.id, { verification: e.target.value as Verification })}
                                                            className={cn("h-8 w-full rounded-md border px-2 text-[13px] font-semibold focus:outline-none", VERIF_CELL[st.verification], "border-slate-300")}>
                                                            {VERIFICATIONS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="border-b border-slate-100 px-3 py-2.5">
                                                    {isPdf ? (
                                                        <span className="text-[13px] text-slate-700">{st.notes || " "}</span>
                                                    ) : (
                                                        <input value={st.notes} onChange={e => setItem(item.id, { notes: e.target.value })} placeholder="Add a note…"
                                                            className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[13px] focus:border-blue-400 focus:outline-none" />
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}
                {grouped.length === 0 && (
                    <p className="py-8 text-center text-sm text-slate-400">This checklist has no check items selected. Edit it in Settings ▸ DQ Files.</p>
                )}
            </div>

            {/* Review & Sign-Off — shared ReviewSignOff module */}
            <div className="border-t border-slate-200 px-6 py-5">
                <h2 className="mb-3 text-sm font-bold text-blue-700">Review & Sign-Off</h2>
                <div className="mb-4 max-w-xs">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Next Review Due (Annual)</label>
                    {isPdf ? (
                        <div className="mt-1 min-h-[26px] border-b border-slate-200 pb-1 text-sm text-slate-800">{fill.nextReview || " "}</div>
                    ) : (
                        <input type="date" value={fill.nextReview} onChange={e => setNextReview(e.target.value)}
                            className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none" />
                    )}
                </div>
                <ReviewSignOff
                    bare
                    heading="I confirm this Driver Qualification File has been reviewed and is complete."
                    value={fill.signoff ?? { ...newSignOff(), role: "Safety Manager" }}
                    onChange={setSignoff}
                    kicker="Reviewer Sign-Off"
                    subtext="By signing you confirm every required item above has been reviewed. Your name, title, date and signature are recorded on file."
                    nameLabel="Reviewed by"
                    buttonLabel="Confirm review & sign"
                    signedLabel="Reviewed & signed"
                    signedByLabel="Reviewed by"
                />
            </div>
        </div>
    );
}
