// ─────────────────────────────────────────────────────────────────────────────
// What each kind of document has to say about itself.
//
// Asked in two places — the Add record dialog on a kind's page, and inline on
// the record form where all three shelves are filled at once — and they have to
// be the SAME questions. They were not: the dialog asked a repair bill for its
// vendor, its labour and its parts, and the form asked it for an amount and a
// unit. Two forms writing one record is how a bill ends up with a vendor when it
// was filed one way and none when it was filed the other.
//
// So the fields live here once, and both hosts render them. The hosts differ in
// what they wrap them in — a dialog with a Save, or a row that patches as you
// type — which is presentation, not the question.
// ─────────────────────────────────────────────────────────────────────────────

import { Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    BILL_CURRENCIES, DISTANCE_UNITS, unitOptionsFor,
    type BillCurrency, type DistanceUnit, type RoadsideDoc, type RoadsideInspection,
} from "./roadside.data";

export type Shelf = "reports" | "remediation" | "repairBills";

/**
 * The input every other form in this app uses.
 *
 * Copied from the compliance record form rather than invented here: a field that
 * is a shade of slate off from the one on the next screen is the kind of thing
 * nobody reports and everybody notices.
 */
const FIELD = "w-full h-9 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400";
const SUBLABEL = "block text-[11px] font-semibold text-slate-500";

/**
 * A field's label, in the app's own words.
 *
 * Required is a blue pill here, not a red asterisk — that is what the compliance
 * record form uses, and an asterisk on one screen beside a pill on the next makes
 * the two look like different products.
 */
function L({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <span className="mb-1 flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{children}</span>
            {required && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-600">Required</span>}
        </span>
    );
}

/** What a bill came to: the typed total, else labour + parts. */
export function billTotal(doc: Pick<RoadsideDoc, "amount" | "labour" | "parts">): string {
    if (doc.amount?.trim()) return doc.amount.trim();
    const n = (v?: string) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
    const sum = n(doc.labour) + n(doc.parts);
    return sum > 0 ? sum.toFixed(2) : "";
}

/** The draft a host is editing — a saved document, or the one being added. */
export type DocDraft = Partial<RoadsideDoc>;

/**
 * What this kind still needs before it is a record rather than a file.
 *
 * Returned as sentence fragments so a host can say "Still needs a file, and the
 * name of the person who did it" without assembling that itself.
 */
export function docProblems(shelf: Shelf, d: DocDraft, hasFile: boolean, unitCount: number): string[] {
    const out: string[] = [];
    if (!hasFile) out.push("a file");
    if (shelf === "remediation" && !d.performedByName?.trim()) out.push("the name of the person who did it");
    if (shelf === "repairBills" && !d.vendorCompany?.trim() && !d.vendorName?.trim()) out.push("who did the work");
    if (shelf === "repairBills" && unitCount > 0 && (d.assetIds?.length ?? 0) === 0) out.push("which unit it was spent on");
    return out;
}

/**
 * The questions, for one kind.
 *
 * `onPatch` is called with a partial so a host can merge it into whatever it is
 * holding — a draft in a dialog, or the saved document in a list.
 */
export function DocFields({ inspection, shelf, doc, onPatch }: {
    inspection: RoadsideInspection;
    shelf: Shelf;
    doc: DocDraft;
    onPatch: (patch: DocDraft) => void;
}) {
    const units = unitOptionsFor(inspection);

    // ── The inspector's copy: the date printed on it ───────────────────────
    if (shelf === "reports") {
        return (
            <div className="sm:w-56">
                <L>Report date</L>
                <input type="date" className={cn(FIELD, "mt-1.5")}
                    value={doc.documentDate ?? inspection.date}
                    onChange={(e) => onPatch({ documentDate: e.target.value })} />
                <p className="mt-1 text-[11px] text-slate-400">
                    The date on the inspector&rsquo;s copy, which is not always the day it reached the office.
                </p>
            </div>
        );
    }

    // ── The re-inspection: when, and who ───────────────────────────────────
    if (shelf === "remediation") {
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <L>Remediation date</L>
                    <input type="date" className={cn(FIELD, "mt-1.5")}
                        value={doc.performedOn ?? ""}
                        onChange={(e) => onPatch({ performedOn: e.target.value })} />
                </div>
                {/*
                 * One field, not a picker and a field.
                 *
                 * It used to ask "mechanic or driver?" and then ask for the name, which
                 * made the person answer the same question twice in two shapes. Whoever
                 * signed the sheet writes their name; what they are is said in the hint,
                 * because it tells you what to write rather than making you classify it.
                 */}
                <div>
                    <L required>Performed by</L>
                    <input className={cn(FIELD, "mt-1.5")}
                        value={doc.performedByName ?? ""}
                        onChange={(e) => onPatch({ performedByName: e.target.value })}
                        placeholder="Dale Foster" />
                    <p className="mt-1 text-[11px] text-slate-400">
                        The mechanic or the driver who did the re-inspection, by name.
                    </p>
                </div>
            </div>
        );
    }

    // ── The bill: who, what it came to, and against what ───────────────────
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2.5"><L required>Vendor</L></div>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <label className={SUBLABEL}>Company name</label>
                        <input className={cn(FIELD, "mt-1")} value={doc.vendorCompany ?? ""}
                            onChange={(e) => onPatch({ vendorCompany: e.target.value })}
                            placeholder="Elkhart Truck Center" />
                    </div>
                    <div>
                        <label className={SUBLABEL}>Contact name</label>
                        <input className={cn(FIELD, "mt-1")} value={doc.vendorName ?? ""}
                            onChange={(e) => onPatch({ vendorName: e.target.value })}
                            placeholder="Dale Foster" />
                    </div>
                    <div>
                        <label className={SUBLABEL}>Email</label>
                        <input type="email" className={cn(FIELD, "mt-1")} value={doc.vendorEmail ?? ""}
                            onChange={(e) => onPatch({ vendorEmail: e.target.value })}
                            placeholder="service@elkharttruck.com" />
                    </div>
                    <div>
                        <label className={SUBLABEL}>Phone</label>
                        <input className={cn(FIELD, "mt-1")} value={doc.vendorPhone ?? ""}
                            onChange={(e) => onPatch({ vendorPhone: e.target.value })}
                            placeholder="(574) 555-0148" />
                    </div>
                </div>
            </div>

            {/* Labour and parts separately, because the invoice lists them separately
                and the total is arithmetic rather than a judgement. */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <L>Labour</L>
                    <input className={cn(FIELD, "mt-1.5")} inputMode="decimal" value={doc.labour ?? ""}
                        onChange={(e) => onPatch({ labour: e.target.value })} placeholder="280.00" />
                </div>
                <div>
                    <L>Parts</L>
                    <input className={cn(FIELD, "mt-1.5")} inputMode="decimal" value={doc.parts ?? ""}
                        onChange={(e) => onPatch({ parts: e.target.value })} placeholder="132.60" />
                </div>
                <div>
                    <L>Currency</L>
                    <select className={cn(FIELD, "mt-1.5")} value={doc.currency ?? "USD"}
                        onChange={(e) => onPatch({ currency: e.target.value as BillCurrency })}>
                        {BILL_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-[12px] font-semibold text-amber-900">Charges</span>
                <span className="text-[14px] font-bold tabular-nums text-amber-900">
                    {billTotal(doc) ? `${doc.currency ?? "USD"} ${billTotal(doc)}` : "—"}
                </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <L>Odometer</L>
                    <div className="mt-1.5 flex gap-2">
                        <input className={FIELD} inputMode="numeric" value={doc.odometer ?? ""}
                            onChange={(e) => onPatch({ odometer: e.target.value })} placeholder="412,860" />
                        <select className={cn(FIELD, "w-24 shrink-0")}
                            value={doc.odometerUnit ?? inspection.truckOdometerUnit ?? "mi"}
                            onChange={(e) => onPatch({ odometerUnit: e.target.value as DistanceUnit })}>
                            {DISTANCE_UNITS.map((u) => <option key={u} value={u}>{u === "mi" ? "Mi" : "Km"}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <L required={units.length > 0}>Units this bill covers</L>
                    {units.length === 0 ? (
                        <p className="mt-1.5 text-[12px] italic text-slate-400">No truck or trailer on this inspection.</p>
                    ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {units.map((u) => {
                                const on = !!doc.assetIds?.includes(u.id);
                                return (
                                    <button key={u.id} type="button"
                                        onClick={() => onPatch({
                                            assetIds: on
                                                ? (doc.assetIds ?? []).filter((x) => x !== u.id)
                                                : [...(doc.assetIds ?? []), u.id],
                                        })}
                                        className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                                            on ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
                                        <Truck size={12} /> {u.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
