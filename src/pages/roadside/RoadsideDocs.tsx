// ─────────────────────────────────────────────────────────────────────────────
// The three shelves.
//
// A roadside inspection collects three different kinds of paper, and they are
// not interchangeable:
//
//   Inspection report      handed over at the roadside by the inspector. There
//                          is exactly one truth here and the carrier did not
//                          write it.
//   Remediation report     the re-inspection after the defect was fixed. It has
//                          to say WHO performed it — a mechanic's re-inspection
//                          and a driver's own check are different evidence, and
//                          an auditor asks which. It can arrive from the driver's
//                          phone or from the office, and the record says which.
//   Vehicle repair bill    what the work cost, filed against the units it was
//                          spent on. A list, not one unit: an invoice routinely
//                          covers the tractor and the trailer behind it.
//
// One component, three configurations, because a second hand-rolled dropzone is
// how "Uploaded" ends up meaning something slightly different in each of them.
// ─────────────────────────────────────────────────────────────────────────────

import { Eye, FileText, Receipt, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadZone } from "@/components/ui/UploadZone";
import { DocFields, billTotal } from "./RoadsideDocFields";
import {
    isMaintenanceRelated, remediationRequired, newDoc, unitOptionsFor,
    type RoadsideDoc, type RoadsideInspection,
} from "./roadside.data";

type Shelf = "reports" | "remediation" | "repairBills";

/** What a filed document says about itself, for a row nobody can edit. */
function docSummary(
    shelf: Shelf, doc: RoadsideDoc, units: { id: string; label: string }[],
): string {
    if (shelf === "reports") return doc.documentDate ? `Dated ${doc.documentDate}` : "No date on the report.";
    if (shelf === "remediation") {
        return [doc.performedByName?.trim() || "Performer not stated", doc.performedOn || null]
            .filter(Boolean).join(" · ");
    }
    const named = units.filter((u) => doc.assetIds?.includes(u.id)).map((u) => u.label);
    return [
        billTotal(doc) ? `${doc.currency ?? "USD"} ${billTotal(doc)}` : null,
        doc.vendorCompany?.trim() || doc.vendorName?.trim() || null,
        named.length ? named.join(" + ") : "No unit assigned",
    ].filter(Boolean).join(" · ");
}


const fmtSize = (n?: number): string =>
    !n ? "" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const fmtWhen = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/** One filed document, with whatever that shelf makes it say about itself. */
function DocRow({ inspection, doc, shelf, units, onRemove, onPatch, readOnly }: {
    inspection: RoadsideInspection;
    doc: RoadsideDoc;
    shelf: Shelf;
    units: { id: string; label: string }[];
    onRemove?: () => void;
    onPatch?: (patch: Partial<RoadsideDoc>) => void;
    readOnly?: boolean;
}) {
    const tone = shelf === "reports" ? "border-slate-200 bg-white"
        : shelf === "remediation" ? "border-emerald-200 bg-emerald-50/40"
            : "border-amber-200 bg-amber-50/40";

    return (
        <div className={cn("space-y-3 rounded-xl border p-3", tone)}>
            <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm">
                    <FileText size={16} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-800" title={doc.name}>{doc.name}</p>
                    <p className="text-[11px] text-slate-500">
                        {[fmtSize(doc.size), `${doc.uploadedBy}`, fmtWhen(doc.uploadedAt)].filter(Boolean).join(" · ")}
                        {/* Where it came in from. A driver's phone upload is the interesting case. */}
                        {doc.source === "driver-app" && (
                            <span className="ml-1.5 inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                                Driver app
                            </span>
                        )}
                    </p>
                </div>
                {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer"
                        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
                        <Eye size={13} /> View
                    </a>
                )}
                {!readOnly && onRemove && (
                    <button type="button" onClick={onRemove} title="Remove this document"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-rose-600">
                        <Trash2 size={15} />
                    </button>
                )}
            </div>

            {/* The same questions the Add-record dialog asks. One definition, so a bill
                filed here and one filed there cannot end up holding different things. */}
            {!readOnly && onPatch ? (
                <div className="border-t border-slate-100 pt-3">
                    <DocFields inspection={inspection} shelf={shelf} doc={doc} onPatch={onPatch} />
                </div>
            ) : (
                <p className="border-t border-slate-100 pt-3 text-[12px] text-slate-600">
                    {docSummary(shelf, doc, units)}
                </p>
            )}

        </div>
    );
}

const SHELVES: { key: Shelf; icon: React.ElementType; title: string; blurb: string; accepts: string }[] = [
    {
        key: "reports", icon: FileText,
        title: "Inspection report",
        blurb: "The copy the inspector handed over at the roadside.",
        accepts: "Attach the inspector's copy — PDF, JPG or PNG up to 10MB",
    },
    {
        key: "remediation", icon: ShieldCheck,
        title: "Remediation inspection report",
        blurb: "Performed after the defect was fixed. Say whether a mechanic or the driver did it.",
        accepts: "Attach the signed re-inspection — PDF, JPG or PNG up to 10MB",
    },
    {
        key: "repairBills", icon: Receipt,
        title: "Vehicle repair bill",
        blurb: "What the work cost, filed against the units it was spent on.",
        accepts: "Attach the shop invoice — PDF, JPG or PNG up to 10MB",
    },
];

/**
 * All three shelves, in the order they fill up.
 *
 * Shown even while empty, with the reason they are empty. A remediation shelf
 * that appears only once somebody knows to look for it is a shelf that stays
 * empty; this one says "nothing needs fixing" or "this is waiting on you".
 */
export function DocShelf({ inspection, uploadedBy, onChange, readOnly }: {
    inspection: RoadsideInspection;
    uploadedBy: string;
    onChange: (next: RoadsideInspection) => void;
    readOnly?: boolean;
}) {
    const units = unitOptionsFor(inspection);
    // A FAILED inspection needs a re-inspection, whatever it failed on. Reading it off
     // the violation categories instead is what put "nothing to re-inspect" under a Fail.
    const needsRemediation = remediationRequired(inspection);
    const needsBill = isMaintenanceRelated(inspection);

    const add = (shelf: Shelf, files: FileList | null) => {
        if (!files?.length) return;
        const docs = Array.from(files).map((f) => {
            const d = newDoc(f, uploadedBy);
            // A bill lands pre-assigned to every unit on the inspection: one unit is
            // the common case and two is the next, and both beat starting at none.
            return shelf === "repairBills" ? { ...d, assetIds: units.map((u) => u.id) } : d;
        });
        onChange({ ...inspection, [shelf]: [...inspection[shelf], ...docs] });
    };
    const patch = (shelf: Shelf, id: string, p: Partial<RoadsideDoc>) =>
        onChange({ ...inspection, [shelf]: inspection[shelf].map((d) => (d.id === id ? { ...d, ...p } : d)) });
    const remove = (shelf: Shelf, id: string) =>
        onChange({ ...inspection, [shelf]: inspection[shelf].filter((d) => d.id !== id) });

    return (
        <div className="space-y-6">
            {SHELVES.map(({ key, icon: Icon, title, blurb, accepts }) => {
                const docs = inspection[key];
                // Why this shelf is empty, when it is. Three different reasons.
                const idle = key === "remediation" ? !needsRemediation : key === "repairBills" ? !needsBill : false;
                return (
                    <section key={key} className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg",
                                key === "reports" ? "bg-slate-100 text-slate-500"
                                    : key === "remediation" ? "bg-emerald-50 text-emerald-600"
                                        : "bg-amber-50 text-amber-600")}>
                                <Icon size={14} />
                            </span>
                            <p className="text-[13px] font-bold text-slate-800">{title}</p>
                            {docs.length > 0 && (
                                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                    {docs.length}
                                </span>
                            )}
                            {!idle && docs.length === 0 && key !== "reports" && (
                                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                                    Needed
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-500">{blurb}</p>

                        {docs.map((d) => (
                            <DocRow key={d.id} inspection={inspection} doc={d} shelf={key} units={units} readOnly={readOnly}
                                onPatch={(p) => patch(key, d.id, p)} onRemove={() => remove(key, d.id)} />
                        ))}

                        {idle && docs.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[12px] text-slate-500">
                                {key === "remediation"
                                    ? "This inspection passed and nothing was put out of service, so there is nothing to re-inspect."
                                    : "No maintenance-related violation on this inspection, so no repair to bill for."}
                            </p>
                        ) : readOnly ? (
                            docs.length === 0 && (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[12px] text-slate-500">
                                    Nothing on file yet.
                                </p>
                            )
                        ) : (
                            <>{/* The full panel while the shelf is empty, a slim strip once
                               something is on it — the same two states the asset wizard's
                               bill-of-sale upload has. A shelf with three documents on it
                               does not need a six-line invitation to add a fourth. */}
                            <UploadZone
                                variant={docs.length === 0 ? "card" : "inline"}
                                compact={docs.length > 0}
                                multiple
                                accept="image/*,application/pdf"
                                label={docs.length === 0 ? "Click to upload or drag & drop" : "Add another"}
                                hint={docs.length === 0 ? accepts : undefined}
                                onFiles={(files) => add(key, files)}
                            /></>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
