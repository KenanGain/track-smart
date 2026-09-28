// ─────────────────────────────────────────────────────────────────────────────
// The remediation report, from the driver's phone.
//
// The requirement says the driver can upload it or the safety manager can. That
// is not a convenience — it is who is physically there. The tractor is at the
// shop, the driver is holding the signed re-inspection sheet, and the office is
// four hundred miles away waiting to hear the unit is legal again. Making them
// email it to somebody who then uploads it adds a day to a record that exists to
// show how quickly the defect was fixed.
//
// So this is the same shelf the office writes to — `addInspectionDoc` on the one
// store — with the source marked `driver-app`, and the same question asked: was
// this re-inspection done by a mechanic, or by you? A driver who confirms their
// own lamp works has done something real and different, and the record says so
// rather than quietly letting it pass as a shop's work.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { Camera, Check, ChevronLeft, ShieldAlert, ShieldCheck, User, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    REMEDIATION_BY_LABEL, addInspectionDoc, allViolations, inspectionStage, newDoc, todayIso,
    unitsLabel, useInspections,
    type RemediationBy, type RoadsideInspection,
} from "./roadside.data";

/** The inspections this driver still owes a re-inspection on. */
export function openRemediations(list: RoadsideInspection[], driverId: string): RoadsideInspection[] {
    return list.filter((i) => i.driver.id === driverId && inspectionStage(i) === "awaiting-report");
}

/** One inspection, and the upload for it. */
function Card({ i, driverName }: { i: RoadsideInspection; driverName: string }) {
    const [by, setBy] = useState<RemediationBy | null>(null);
    const [on, setOn] = useState(todayIso());
    const [sent, setSent] = useState(false);

    const upload = (files: FileList | null) => {
        if (!files?.length || !by) return;
        addInspectionDoc(i.id, "remediation", {
            ...newDoc(files[0], driverName, "driver-app"),
            performedBy: by,
            performedOn: on,
        });
        setSent(true);
    };

    const vios = allViolations(i);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                    <ShieldAlert size={18} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{unitsLabel(i)}</p>
                    <p className="text-xs text-slate-500">{i.date} &middot; {i.location}</p>
                </div>
                {i.oos && (
                    <span className="shrink-0 rounded-md border border-rose-300 bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                        OOS
                    </span>
                )}
            </div>

            {vios.length > 0 && (
                <ul className="mt-3 space-y-1 rounded-xl bg-slate-50 p-2.5">
                    {vios.map((v, k) => (
                        <li key={k} className="flex items-start gap-1.5 text-[12px] text-slate-700">
                            {v.code && <span className="shrink-0 rounded bg-white px-1 font-mono text-[10px] font-bold text-slate-500">{v.code}</span>}
                            <span className="min-w-0">{v.subtype || v.label}</span>
                        </li>
                    ))}
                </ul>
            )}

            {sent ? (
                <p className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-800">
                    <Check size={14} /> Sent to the office. They can see it now.
                </p>
            ) : (
                <>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Who re-inspected it?</p>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {(["mechanic", "driver"] as RemediationBy[]).map((k) => (
                            <button key={k} type="button" onClick={() => setBy(k)}
                                className={cn("flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[13px] font-semibold transition-colors",
                                    by === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600")}>
                                {k === "driver" ? <User size={14} /> : <Wrench size={14} />}
                                {k === "driver" ? "I did" : REMEDIATION_BY_LABEL[k]}
                            </button>
                        ))}
                    </div>

                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Re-inspected on</p>
                    <input type="date" value={on} onChange={(e) => setOn(e.target.value)}
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[13px] text-slate-800" />

                    {/* The camera is the point: the sheet is on the counter in front of them. */}
                    <label className={cn("mt-3 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[13px] font-bold transition-colors",
                        by ? "cursor-pointer bg-blue-600 text-white hover:bg-blue-700" : "cursor-not-allowed bg-slate-200 text-slate-400")}>
                        <Camera size={16} /> {by ? "Photograph or attach the report" : "Say who re-inspected it first"}
                        <input type="file" accept="image/*,application/pdf" className="hidden" disabled={!by}
                            onChange={(e) => upload(e.target.files)} />
                    </label>
                </>
            )}
        </div>
    );
}

/**
 * The phone screen.
 *
 * An overlay like the collect list and the accident report, so it sits in the
 * same place in the app and closes the same way.
 */
export function DriverRemediationScreen({ driverId, driverName, accountId, onClose }: {
    driverId: string;
    driverName: string;
    accountId?: string;
    onClose: () => void;
}) {
    const all = useInspections(accountId);
    const open = openRemediations(all, driverId);
    // Kept on screen after they upload, rather than vanishing mid-gesture: the row
    // disappearing the instant it is done reads as having lost the upload.
    const recent = all.filter((i) => i.driver.id === driverId && i.remediation.length > 0).slice(0, 2);

    return (
        <div className="absolute inset-x-0 bottom-0 top-11 z-50 flex flex-col bg-slate-50">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-3">
                <button onClick={onClose} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><ChevronLeft size={22} /></button>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 text-white"><ShieldAlert size={16} /></span>
                <h3 className="min-w-0 flex-1 truncate text-base font-bold text-slate-900">Roadside repairs</h3>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
                {open.length === 0 && recent.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                        <ShieldCheck size={30} className="text-slate-300" />
                        <p className="text-sm font-semibold text-slate-600">Nothing outstanding</p>
                        <p className="text-xs text-slate-400">
                            When an inspection finds something on your truck, it turns up here until the
                            re-inspection is on file.
                        </p>
                    </div>
                ) : (
                    <>
                        {open.length > 0 && (
                            <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                Waiting on a re-inspection
                            </p>
                        )}
                        {open.map((i) => <Card key={i.id} i={i} driverName={driverName} />)}

                        {recent.length > 0 && (
                            <>
                                <p className="px-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Sent</p>
                                {recent.map((i) => (
                                    <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                            <ShieldCheck size={16} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-bold text-slate-800">{unitsLabel(i)}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {i.remediation.length} report{i.remediation.length === 1 ? "" : "s"} on file
                                                {i.remediation[0]?.performedBy ? ` · ${REMEDIATION_BY_LABEL[i.remediation[0].performedBy]}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
