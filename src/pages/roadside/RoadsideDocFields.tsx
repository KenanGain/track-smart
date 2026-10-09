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

import { useState } from "react";
import { Truck, Scale, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    BILL_CURRENCIES, DISTANCE_UNITS, REMEDIATION_BY_LABEL, unitOptionsFor,
    type BillCurrency, type DistanceUnit, type RemediationBy, type RoadsideDoc,
    type RoadsideInspection,
} from "./roadside.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { VENDORS } from "@/pages/inventory/inventory.data";
import { Combobox } from "@/components/ui/combobox";

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

const num = (v?: string) => Number(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

/** What was split across the units, where anybody has split it. */
export function billSplitTotal(doc: Pick<RoadsideDoc, "assetAmounts">): number {
    return Object.values(doc.assetAmounts ?? {}).reduce((t, v) => t + num(v), 0);
}

/**
 * What a bill came to.
 *
 * ONE definition, and it is the invoice: what was typed as a total, or labour + parts.
 *
 * It deliberately ignores the per-unit split. The split is how that money is divided
 * between the units, not a second opinion about how much there was — and when the total
 * followed whichever number was larger, the headline figure moved every time somebody
 * typed a digit into an allocation box. A bill has one amount.
 */
export function billTotal(doc: Pick<RoadsideDoc, "amount" | "labour" | "parts">): string {
    if (doc.amount?.trim()) return doc.amount.trim();
    const sum = num(doc.labour) + num(doc.parts);
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
    if (shelf === "repairBills" && !d.vendorCompany?.trim() && !d.vendorName?.trim() && !d.performedByName?.trim()) {
        out.push("who did the work");
    }
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
    // The vendor’s four fields, open only when somebody is typing them: on a bill whose
    // shop is on the list they are four inputs nobody touches, and a form you scroll past
    // is a form that hides the questions that matter.
    const [vendorOpen, setVendorOpen] = useState(false);

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
    const performedBy: RemediationBy = doc.performedBy ?? "mechanic";
    const roster = getDriversForAccount(inspection.accountId);
    // The invoice, and how much of it has been put against a unit. Two different
    // questions: the first is what the shop charged, the second is who carries it.
    const charged = num(billTotal(doc));
    const split = billSplitTotal(doc);
    const left = charged - split;
    const cur = doc.currency ?? "USD";
    const carrierVendors = VENDORS.filter((v) => v.accountId === inspection.accountId);
    // Which one is showing, worked out from what is in the fields rather than kept twice:
    // typing over the company name un-picks it, which is what somebody just did.
    const selectedVendorId = carrierVendors.find(
        (v) => (v.companyName || v.name) === doc.vendorCompany,
    )?.id ?? "";
    const vendorFilled = !!(doc.vendorCompany?.trim() || doc.vendorName?.trim());

    return (
        <div className="space-y-5">
            {/*
             * 1. The vendor — a choice, not four fields.
             *
             * Picked from the carrier’s own list, which is nearly always where the shop
             * already is; what it fills in then reads back as one line rather than sitting
             * there as four live inputs nobody is going to touch. The details open on
             * demand, for the shop that is not on the list or the invoice that disagrees
             * with it.
             */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <L required>Vendor</L>
                    <button
                        type="button"
                        onClick={() => setVendorOpen((o) => !o)}
                        className="text-[11px] font-bold uppercase tracking-wide text-slate-400 transition-colors hover:text-blue-600"
                    >
                        {vendorOpen ? "Hide details" : vendorFilled ? "Edit details" : "Enter manually"}
                    </button>
                </div>

                <Combobox
                    value={selectedVendorId}
                    placeholder="Search vendors…"
                    searchPlaceholder="Search by company, contact or town…"
                    options={carrierVendors.map((v) => ({
                        value: v.id,
                        label: v.companyName || v.name || "Vendor",
                        description: [v.contactName || v.name, v.address?.city, v.phone]
                            .filter(Boolean).join(" · "),
                    }))}
                    onValueChange={(id) => {
                        const v = carrierVendors.find((x) => x.id === id);
                        if (!v) return;
                        onPatch({
                            // The id as well as the name. Without it the bill cannot be
                            // found again from the vendor's side, and "Wilmington Truck
                            // Service" is not "Wilmington Truck Service Inc."
                            vendorId: v.id,
                            vendorCompany: v.companyName || v.name || "",
                            vendorName: v.contactName || v.name || "",
                            vendorEmail: v.email || "",
                            vendorPhone: v.phone || "",
                        });
                        setVendorOpen(false);
                    }}
                />

                {/* What was filled in, as a line. */}
                {!vendorOpen && vendorFilled && (
                    <p className="mt-1.5 truncate text-[12px] text-slate-500">
                        {[doc.vendorCompany, doc.vendorName, doc.vendorEmail, doc.vendorPhone]
                            .filter(Boolean).join(" · ")}
                    </p>
                )}
                {!vendorOpen && !vendorFilled && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                        Not on the list? <span className="font-semibold text-slate-500">Enter manually</span> and the bill still files.
                    </p>
                )}

                {vendorOpen && (
                    <div className="mt-2.5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2">
                        <div>
                            <label className={SUBLABEL}>Company name</label>
                            {/* Typed over, it is no longer the shop that was picked — the id
                                goes with the name, or the bill claims to be from a company
                                whose name it no longer carries. */}
                            <input className={cn(FIELD, "mt-1")} value={doc.vendorCompany ?? ""}
                                onChange={(e) => onPatch({ vendorCompany: e.target.value, vendorId: undefined })}
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
                )}
            </div>

            {/*
             * 2. Who actually did the work.
             *
             * A shop invoice and a driver’s own receipt from the roadside are different
             * records: one is a vendor the office has a relationship with, the other is a
             * person owed an expense. Asked as two choices rather than a free-text name,
             * because the answer decides what the next question is.
             */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <L required>Performed by</L>
                    <div className="mt-1.5 flex flex-wrap gap-4">
                        {(["mechanic", "driver"] as RemediationBy[]).map((id) => (
                            <label key={id} className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="radio"
                                    name="bill-performed-by"
                                    checked={performedBy === id}
                                    onChange={() => onPatch({
                                        performedBy: id,
                                        // The name belongs to whoever was picked; carrying the
                                        // other one over would put a mechanic’s name on a
                                        // driver’s receipt.
                                        performedByName: "",
                                        performedById: undefined,
                                    })}
                                    className="h-4 w-4 accent-blue-600"
                                />
                                <span className="text-sm text-slate-700">{REMEDIATION_BY_LABEL[id]}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    {performedBy === "driver" ? (<>
                        <L required>Driver</L>
                        <select
                            className={cn(FIELD, "mt-1.5")}
                            value={doc.performedById ?? ""}
                            onChange={(e) => onPatch({
                                performedById: e.target.value || undefined,
                                performedByName: roster.find((d) => d.id === e.target.value)?.name ?? "",
                            })}
                        >
                            <option value="">Select the driver…</option>
                            {roster.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <p className="mt-1 text-[11px] text-slate-400">
                            The driver who paid for it, so the expense reaches the right person.
                        </p>
                    </>) : (<>
                        <L required>Mechanic name</L>
                        <input
                            className={cn(FIELD, "mt-1.5")}
                            value={doc.performedByName ?? ""}
                            onChange={(e) => onPatch({ performedByName: e.target.value })}
                            placeholder="Dale Foster"
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                            Who at the shop did the work — an auditor asking about a brake repair
                            wants the name on the sheet.
                        </p>
                    </>)}
                </div>
            </div>

            {/* 3. What it cost. Labour and parts separately, because the invoice lists them
                   separately and the total is arithmetic rather than a judgement. */}
            <div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                        <L>Labour</L>
                        <input className={cn(FIELD, "mt-1.5 tabular-nums")} inputMode="decimal" value={doc.labour ?? ""}
                            onChange={(e) => onPatch({ labour: e.target.value })} placeholder="280.00" />
                    </div>
                    <div>
                        <L>Parts</L>
                        <input className={cn(FIELD, "mt-1.5 tabular-nums")} inputMode="decimal" value={doc.parts ?? ""}
                            onChange={(e) => onPatch({ parts: e.target.value })} placeholder="132.60" />
                    </div>
                    <div>
                        <L>Currency</L>
                        <select className={cn(FIELD, "mt-1.5")} value={cur}
                            onChange={(e) => onPatch({ currency: e.target.value as BillCurrency })}>
                            {BILL_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                {/* The invoice's own number — what the shop says on the phone, and what the
                    payable line is matched against. The same field a service record has
                    carried since it was written, so the vendor's bill list reads the same
                    whichever screen filed the row. */}
                <div className="mt-3 sm:max-w-[16rem]">
                    <L>Invoice #</L>
                    <input
                        className={cn(FIELD, "mt-1.5")}
                        value={doc.invoiceNumber ?? ""}
                        onChange={(e) => onPatch({ invoiceNumber: e.target.value })}
                        placeholder="INV-44812"
                    />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                    <span className="text-[12px] font-semibold text-amber-900">Charges</span>
                    <span className="text-[14px] font-bold tabular-nums text-amber-900">
                        {charged > 0 ? `${cur} ${charged.toFixed(2)}` : "—"}
                    </span>
                </div>
            </div>

            {/*
             * 4. Which units it was spent on, and what each one carries.
             *
             * One list, not two. The chips said which units, and a second card underneath
             * named the same units again to ask for their share — so the tractor appeared
             * twice on a form with six fields on it. A unit is a row: tick it, and type
             * what it carries on the same line.
             *
             * A bill against the wrong trailer is a cost on the wrong unit for the rest of
             * its life, and a single total loses the trailer’s share the moment anybody asks
             * what that trailer has cost this year.
             */}
            <div>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <L required={units.length > 0}>Units this bill covers</L>
                    {charged > 0 && (doc.assetIds?.length ?? 0) > 1 && (
                        <button
                            type="button"
                            onClick={() => {
                                // Even shares, with the remainder on the first unit so the
                                // allocation adds up to the penny rather than to 29.99.
                                const ids = doc.assetIds ?? [];
                                const each = Math.floor((charged / ids.length) * 100) / 100;
                                const amounts: Record<string, string> = {};
                                ids.forEach((id, i) => {
                                    const v = i === 0 ? charged - each * (ids.length - 1) : each;
                                    amounts[id] = v.toFixed(2);
                                });
                                onPatch({ assetAmounts: amounts });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700"
                        >
                            <Scale size={13} className="text-slate-400" /> Split evenly
                        </button>
                    )}
                </div>

                {units.length === 0 ? (
                    <p className="text-[12px] italic text-slate-400">No truck or trailer on this inspection.</p>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {units.map((u) => {
                            const on = !!doc.assetIds?.includes(u.id);
                            return (
                                <div
                                    key={u.id}
                                    className={cn(
                                        "flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 transition-colors",
                                        on ? "bg-white" : "bg-slate-50/60",
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const next = on
                                                ? (doc.assetIds ?? []).filter((x) => x !== u.id)
                                                : [...(doc.assetIds ?? []), u.id];
                                            // Taking a unit off takes its share with it, or the
                                            // total keeps counting money spent on something this
                                            // bill no longer covers.
                                            const amounts = { ...(doc.assetAmounts ?? {}) };
                                            if (on) delete amounts[u.id];
                                            onPatch({ assetIds: next, assetAmounts: amounts });
                                        }}
                                        aria-pressed={on}
                                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                                    >
                                        <span className={cn(
                                            "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                                            on ? "border-amber-500 bg-amber-500 text-white" : "border-slate-300 bg-white",
                                        )}>
                                            {on && <Check size={11} />}
                                        </span>
                                        <Truck size={14} className={cn("shrink-0", on ? "text-amber-600" : "text-slate-300")} />
                                        <span className={cn("truncate text-[13px] font-semibold", on ? "text-slate-800" : "text-slate-400")}>
                                            {u.label}
                                        </span>
                                        <span className="shrink-0 text-[11px] font-medium text-slate-400">{u.detail}</span>
                                    </button>

                                    <div className="relative w-40 shrink-0">
                                        <span className={cn(
                                            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold",
                                            on ? "text-slate-400" : "text-slate-300",
                                        )}>
                                            {cur}
                                        </span>
                                        <input
                                            className={cn(FIELD, "pl-12 text-right tabular-nums", !on && "bg-slate-50 text-slate-300")}
                                            inputMode="decimal"
                                            disabled={!on}
                                            value={doc.assetAmounts?.[u.id] ?? ""}
                                            onChange={(e) => onPatch({
                                                assetAmounts: { ...(doc.assetAmounts ?? {}), [u.id]: e.target.value },
                                            })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        {/*
                         * How much of the bill is still unallocated.
                         *
                         * The figure to watch while typing, and the only one that moves: the
                         * charges above are the invoice and do not change because somebody is
                         * deciding which trailer carries which share.
                         */}
                        {(doc.assetIds?.length ?? 0) > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 text-[12px]">
                                <span className="font-semibold text-slate-500">
                                    Allocated <span className="tabular-nums text-slate-900">{cur} {split.toFixed(2)}</span>
                                    {charged > 0 && <> of <span className="tabular-nums text-slate-900">{cur} {charged.toFixed(2)}</span></>}
                                </span>
                                {charged > 0 && (
                                    <span className={cn(
                                        "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                                        Math.abs(left) < 0.005 ? "bg-emerald-50 text-emerald-700"
                                            : left > 0 ? "bg-white text-slate-600 ring-1 ring-slate-200"
                                                : "bg-amber-50 text-amber-800",
                                    )}>
                                        {Math.abs(left) < 0.005 ? "All of it"
                                            : left > 0 ? `${cur} ${left.toFixed(2)} left`
                                                : `${cur} ${Math.abs(left).toFixed(2)} over`}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 5. What the vehicle had run when the work was done. */}
            <div className="sm:w-64">
                <L>Odometer</L>
                <div className="mt-1.5 flex gap-2">
                    <input className={cn(FIELD, "tabular-nums")} inputMode="numeric" value={doc.odometer ?? ""}
                        onChange={(e) => onPatch({ odometer: e.target.value })} placeholder="412,860" />
                    <select className={cn(FIELD, "w-24 shrink-0")}
                        value={doc.odometerUnit ?? inspection.truckOdometerUnit ?? "mi"}
                        onChange={(e) => onPatch({ odometerUnit: e.target.value as DistanceUnit })}>
                        {DISTANCE_UNITS.map((u) => <option key={u} value={u}>{u === "mi" ? "Mi" : "Km"}</option>)}
                    </select>
                </div>
            </div>
        </div>
    );
}
