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

import { Eye, FileText, Receipt, ShieldCheck, Trash2, Truck, Upload, Wrench, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { UploadZone } from "@/components/ui/UploadZone";
import {
    REMEDIATION_BY_LABEL, isMaintenanceRelated, hasVehicleViolation, newDoc, unitOptionsFor,
    type RemediationBy, type RoadsideDoc, type RoadsideInspection,
} from "./roadside.data";

type Shelf = "reports" | "remediation" | "repairBills";

const DOC_TH = "px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap";

const fmtSize = (n?: number): string =>
    !n ? "" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

const fmtWhen = (iso: string): string => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

/** One filed document, with whatever that shelf makes it say about itself. */
function DocRow({ doc, shelf, units, onRemove, onPatch, readOnly }: {
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

            {/* A remediation report has to say who performed it. Asked on the document,
                not on the inspection: two re-inspections can be done by two people. */}
            {shelf === "remediation" && (
                <div className="grid gap-3 border-t border-emerald-100 pt-3 sm:grid-cols-2">
                    <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Performed by</p>
                        {readOnly ? (
                            <p className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                                {doc.performedBy === "driver" ? <User size={13} /> : <Wrench size={13} />}
                                {doc.performedBy ? REMEDIATION_BY_LABEL[doc.performedBy] : "Not stated"}
                            </p>
                        ) : (
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                                {(["mechanic", "driver"] as RemediationBy[]).map((k) => (
                                    <button key={k} type="button" onClick={() => onPatch?.({ performedBy: k })}
                                        className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors",
                                            doc.performedBy === k ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700")}>
                                        {k === "driver" ? <User size={12} /> : <Wrench size={12} />} {REMEDIATION_BY_LABEL[k]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Re-inspected on</p>
                        {readOnly
                            ? <p className="text-[13px] font-semibold text-slate-700">{doc.performedOn || "—"}</p>
                            : <input type="date" value={doc.performedOn ?? ""} onChange={(e) => onPatch?.({ performedOn: e.target.value })}
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-emerald-500" />}
                    </div>
                    {!doc.performedBy && !readOnly && (
                        <p className="text-[11px] text-amber-700 sm:col-span-2">
                            Say whether a mechanic or the driver performed it &mdash; the two are not the same evidence.
                        </p>
                    )}
                </div>
            )}

            {/* A repair bill belongs to units. Often two of them. */}
            {shelf === "repairBills" && (
                <div className="space-y-3 border-t border-amber-100 pt-3">
                    <div>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            Units this bill covers
                        </p>
                        {units.length === 0 ? (
                            <p className="text-[12px] italic text-slate-400">No truck or trailer on this inspection yet.</p>
                        ) : readOnly ? (
                            <div className="flex flex-wrap gap-1.5">
                                {units.filter((u) => doc.assetIds?.includes(u.id)).map((u) => (
                                    <span key={u.id} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[12px] font-semibold text-amber-800">
                                        <Truck size={12} /> {u.label}
                                    </span>
                                ))}
                                {!doc.assetIds?.length && <span className="text-[12px] italic text-slate-400">Not assigned to a unit.</span>}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {units.map((u) => {
                                    const on = !!doc.assetIds?.includes(u.id);
                                    return (
                                        <button key={u.id} type="button"
                                            onClick={() => onPatch?.({
                                                assetIds: on
                                                    ? (doc.assetIds ?? []).filter((x) => x !== u.id)
                                                    : [...(doc.assetIds ?? []), u.id],
                                            })}
                                            className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                                                on ? "border-amber-500 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
                                            <Truck size={12} /> {u.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <div className="sm:w-44">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Amount</p>
                        {readOnly
                            ? <p className="text-[13px] font-semibold text-slate-700">{doc.amount ? `$${doc.amount}` : "—"}</p>
                            : <input value={doc.amount ?? ""} onChange={(e) => onPatch?.({ amount: e.target.value })} placeholder="412.60"
                                className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-amber-500" />}
                    </div>
                    {!doc.assetIds?.length && !readOnly && units.length > 0 && (
                        <p className="text-[11px] text-amber-700">
                            Pick the unit (or both) this bill was spent on, or the cost is lost against the vehicle.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

const SHELVES: { key: Shelf; icon: React.ElementType; title: string; blurb: string; cta: string }[] = [
    {
        key: "reports", icon: FileText,
        title: "Inspection report",
        blurb: "The copy the inspector handed over at the roadside.",
        cta: "Drag the inspection report here — or click",
    },
    {
        key: "remediation", icon: ShieldCheck,
        title: "Remediation inspection report",
        blurb: "Performed after the defect was fixed. Say whether a mechanic or the driver did it.",
        cta: "Drag the remediation report here — or click",
    },
    {
        key: "repairBills", icon: Receipt,
        title: "Vehicle repair bill",
        blurb: "What the work cost, filed against the units it was spent on.",
        cta: "Drag the repair bill here — or click",
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
    const needsRemediation = hasVehicleViolation(inspection) || inspection.oos;
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
            {SHELVES.map(({ key, icon: Icon, title, blurb, cta }) => {
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
                            <DocRow key={d.id} doc={d} shelf={key} units={units} readOnly={readOnly}
                                onPatch={(p) => patch(key, d.id, p)} onRemove={() => remove(key, d.id)} />
                        ))}

                        {idle && docs.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[12px] text-slate-500">
                                {key === "remediation"
                                    ? "Nothing was found against the equipment, so there is nothing to re-inspect."
                                    : "No maintenance-related violation on this inspection, so no repair to bill for."}
                            </p>
                        ) : readOnly ? (
                            docs.length === 0 && (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[12px] text-slate-500">
                                    Nothing on file yet.
                                </p>
                            )
                        ) : (
                            <UploadZone compact multiple label={cta} onFiles={(files) => add(key, files)} />
                        )}
                    </section>
                );
            })}
        </div>
    );
}

// ── The same documents, as a list ───────────────────────────────────────────

/**
 * Every document on the inspection, in one table.
 *
 * The shelves are the right shape for PUTTING something on the record — three
 * labelled wells that say what belongs in each. They are the wrong shape for
 * READING it: three quarters of that screen is empty dropzone, and a record with
 * five documents on it makes you scroll past two upload targets to see the third
 * one. So the tab opens on the list, and the wells are one click away.
 *
 * The rows that are NOT there are in the list too. A missing remediation report
 * is the most important thing this record has to say, and a list that only shows
 * what exists cannot say it.
 */
export function DocList({ inspection, onChange, onAdd, readOnly }: {
    inspection: RoadsideInspection;
    onChange: (next: RoadsideInspection) => void;
    /** Switch to the upload wells, scrolled to the shelf that wants something. */
    onAdd?: (shelf: Shelf) => void;
    readOnly?: boolean;
}) {
    const units = unitOptionsFor(inspection);
    const needsRemediation = hasVehicleViolation(inspection) || inspection.oos;
    const needsBill = isMaintenanceRelated(inspection);

    const rows = SHELVES.flatMap(({ key, icon, title }) =>
        inspection[key].map((doc) => ({ key, icon, title, doc })),
    );

    /** The line that says what this particular document IS, beyond its filename. */
    const details = (key: Shelf, doc: RoadsideDoc): string => {
        if (key === "remediation") {
            return [
                doc.performedBy ? `${REMEDIATION_BY_LABEL[doc.performedBy]} performed it` : "Performer not stated",
                doc.performedOn || null,
            ].filter(Boolean).join(" · ");
        }
        if (key === "repairBills") {
            const named = units.filter((u) => doc.assetIds?.includes(u.id)).map((u) => u.label);
            return [doc.amount ? `$${doc.amount}` : null, named.length ? named.join(" + ") : "No unit assigned"]
                .filter(Boolean).join(" · ");
        }
        return fmtSize(doc.size) || "—";
    };

    /** A shelf that is expected and empty. Not an error — a job. */
    const missing = ([
        needsRemediation && inspection.remediation.length === 0 ? "remediation" : null,
        needsBill && inspection.repairBills.length === 0 ? "repairBills" : null,
        inspection.reports.length === 0 ? "reports" : null,
    ].filter(Boolean) as Shelf[]);

    const remove = (shelf: Shelf, id: string) =>
        onChange({ ...inspection, [shelf]: inspection[shelf].filter((d) => d.id !== id) });

    const TONE: Record<Shelf, string> = {
        reports: "bg-slate-100 text-slate-500",
        remediation: "bg-emerald-50 text-emerald-600",
        repairBills: "bg-amber-50 text-amber-600",
    };

    return (
        <div>
            {/* Desk: a table. Nine words per row beats a card three rows tall. */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px]">
                    <thead className="border-b border-slate-200 bg-slate-50/70">
                        <tr>
                            <th className={DOC_TH}>Document</th>
                            <th className={DOC_TH}>Kind</th>
                            <th className={DOC_TH}>Details</th>
                            <th className={DOC_TH}>Uploaded by</th>
                            <th className={DOC_TH}>Filed</th>
                            <th className={cn(DOC_TH, "pr-5 text-right")}>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rows.map(({ key, icon: Icon, title, doc }) => (
                            <tr key={doc.id} className="align-middle">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2.5">
                                        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", TONE[key])}>
                                            <Icon size={14} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block max-w-[260px] truncate text-[13px] font-semibold text-slate-800" title={doc.name}>{doc.name}</span>
                                            {doc.source === "driver-app" && (
                                                <span className="mt-0.5 inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                                    Driver app
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{title}</td>
                                <td className="px-4 py-3 text-[13px] text-slate-600">{details(key, doc)}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{doc.uploadedBy}</td>
                                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-500">{fmtWhen(doc.uploadedAt)}</td>
                                <td className="px-4 py-3 pr-5">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {doc.url && (
                                            <a href={doc.url} target="_blank" rel="noreferrer" title={`View ${doc.name}`}
                                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100">
                                                <Eye size={12} /> View
                                            </a>
                                        )}
                                        {!readOnly && (
                                            <button type="button" onClick={() => remove(key, doc.id)} title="Remove this document"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {/* What is still owed, as rows, because that is what a reader is here for. */}
                        {missing.map((key) => {
                            const meta = SHELVES.find((s) => s.key === key)!;
                            const Icon = meta.icon;
                            return (
                                <tr key={`missing-${key}`} className="bg-rose-50/30">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-rose-300 bg-white text-rose-400">
                                                <Icon size={14} />
                                            </span>
                                            <span className="text-[13px] font-semibold text-rose-700">Not on file yet</span>
                                        </div>
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-[13px] text-slate-600">{meta.title}</td>
                                    <td className="px-4 py-3 text-[12px] text-slate-500" colSpan={2}>{meta.blurb}</td>
                                    <td className="px-4 py-3" />
                                    <td className="px-4 py-3 pr-5 text-right">
                                        {!readOnly && onAdd && (
                                            <button type="button" onClick={() => onAdd(key)}
                                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-[11px] font-bold text-white hover:bg-rose-700">
                                                <Upload size={12} /> Upload
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}

                        {rows.length === 0 && missing.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-400">
                                    No documents on this inspection, and none outstanding.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Phone: the same rows, stacked. */}
            <div className="divide-y divide-slate-100 md:hidden">
                {rows.map(({ key, icon: Icon, title, doc }) => (
                    <div key={doc.id} className="flex items-start gap-3 p-4">
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", TONE[key])}>
                            <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-800" title={doc.name}>{doc.name}</p>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
                            <p className="mt-0.5 text-[12px] text-slate-600">{details(key, doc)}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{doc.uploadedBy} &middot; {fmtWhen(doc.uploadedAt)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            {doc.url && (
                                <a href={doc.url} target="_blank" rel="noreferrer"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
                                    <Eye size={13} />
                                </a>
                            )}
                            {!readOnly && (
                                <button type="button" onClick={() => remove(key, doc.id)}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {missing.map((key) => {
                    const meta = SHELVES.find((s) => s.key === key)!;
                    const Icon = meta.icon;
                    return (
                        <div key={`missing-${key}`} className="flex items-start gap-3 bg-rose-50/30 p-4">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-rose-300 bg-white text-rose-400">
                                <Icon size={15} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold text-rose-700">{meta.title} not on file yet</p>
                                <p className="mt-0.5 text-[12px] text-slate-500">{meta.blurb}</p>
                            </div>
                            {!readOnly && onAdd && (
                                <button type="button" onClick={() => onAdd(key)}
                                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-[11px] font-bold text-white">
                                    <Upload size={12} /> Upload
                                </button>
                            )}
                        </div>
                    );
                })}
                {rows.length === 0 && missing.length === 0 && (
                    <p className="px-4 py-10 text-center text-[13px] text-slate-400">
                        No documents on this inspection, and none outstanding.
                    </p>
                )}
            </div>
        </div>
    );
}
