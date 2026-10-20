// ─────────────────────────────────────────────────────────────────────────────
// Apply for a carrier — the driver's side of hiring.
//
// Everything else in this product is the office looking outward: it issues a hiring, it
// invites a driver, it reviews what comes back. A driver between jobs had no way in at all;
// the only route to an application was a link somebody emailed them.
//
// So this is the other direction. A list of carriers that are hiring, what each one is, and
// an Apply button on the row — then the one question that decides which application they get
// (where they will be driving), and through to the form itself.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import {
    Building2, MapPin, Users, Truck, ShieldCheck, Search, ArrowRight, X, Check, ChevronLeft,
} from "lucide-react";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { cn } from "@/lib/utils";

/**
 * Which application a driver gets, which is a question about where they will be driving
 * rather than who they are. The ids are the application forms' own.
 */
const DRIVER_TYPES: { id: string; label: string; blurb: string }[] = [
    { id: "us", label: "United States", blurb: "Interstate or intrastate driving within the US." },
    { id: "canada", label: "Canada", blurb: "Driving within Canada only." },
    { id: "cross-border", label: "Cross-border", blurb: "Crossing between Canada and the US." },
];

const RATING_TONE: Record<string, string> = {
    Satisfactory: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Conditional: "border-amber-200 bg-amber-50 text-amber-700",
    Unsatisfactory: "border-rose-200 bg-rose-50 text-rose-700",
};

const initialsOf = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function CarrierOpportunitiesPage({ driverName, onOpenForm }: {
    driverName?: string;
    /** Hand off to the real application form, with the type the driver picked. */
    onOpenForm?: (carrier: AccountRecord, driverType: string) => void;
}) {
    const [search, setSearch] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);
    const [applyTo, setApplyTo] = useState<AccountRecord | null>(null);

    // Only carriers actually taking drivers; a closed account is not an opportunity.
    const carriers = useMemo(() => {
        const q = search.trim().toLowerCase();
        return ACCOUNTS_DB
            .filter((c) => c.status === "Active")
            .filter((c) => !q
                || c.dbaName.toLowerCase().includes(q)
                || c.legalName.toLowerCase().includes(q)
                || `${c.city} ${c.state}`.toLowerCase().includes(q));
    }, [search]);

    const open = carriers.find((c) => c.id === openId) ?? null;

    // On a phone the profile replaces the list rather than sitting beside it — there is no
    // room for two columns, and a driver reading about a carrier wants the whole width.
    return (
        <div className="min-h-full bg-slate-50">
            <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Apply for a carrier</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                    Carriers hiring now. Open one to read about them, or apply straight from the list.
                </p>
            </header>

            <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
                    {/* ── The listing ─────────────────────────────────────── */}
                    <div className={cn("min-w-0", open && "hidden lg:block")}>
                        <div className="relative mb-3">
                            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search carrier or location..."
                                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <p className="mb-2 px-1 text-xs font-semibold text-slate-500">{carriers.length} carriers hiring</p>

                        <ul className="space-y-2.5">
                            {carriers.map((c) => (
                                <li key={c.id}>
                                    <div
                                        className={cn(
                                            "rounded-xl border bg-white p-4 shadow-sm transition-colors",
                                            openId === c.id ? "border-blue-300 ring-1 ring-blue-500/20" : "border-slate-200 hover:border-slate-300",
                                        )}
                                    >
                                        {/* The row stacks on a phone: name and badges first, the
                                            button full width underneath. A 44px tap target squeezed
                                            beside a truncated name is neither readable nor tappable. */}
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                            <button
                                                type="button"
                                                onClick={() => setOpenId(c.id)}
                                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                            >
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-bold text-white">
                                                    {initialsOf(c.dbaName)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-bold text-slate-900">{c.dbaName}</div>
                                                    <div className="truncate text-xs text-slate-500">{c.legalName}</div>
                                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                                                        <span className="inline-flex items-center gap-1"><MapPin size={11} /> {c.city}, {c.state}</span>
                                                        <span className="inline-flex items-center gap-1"><Users size={11} /> {c.drivers} drivers</span>
                                                        <span className="inline-flex items-center gap-1"><Truck size={11} /> {c.assets} units</span>
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setApplyTo(c)}
                                                className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-5 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:h-9"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {carriers.length === 0 && (
                                <li className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                                    No carrier matches that search.
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* ── The carrier, when one is open ───────────────────── */}
                    {open && (
                        <div className="min-w-0">
                            <CarrierProfileCard
                                carrier={open}
                                onBack={() => setOpenId(null)}
                                onApply={() => setApplyTo(open)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {applyTo && (
                <ApplyDialog
                    carrier={applyTo}
                    driverName={driverName}
                    onClose={() => setApplyTo(null)}
                    onOpenForm={onOpenForm}
                />
            )}
        </div>
    );
}

/** What a driver would want to know about a carrier before applying to it. */
function CarrierProfileCard({ carrier, onBack, onApply }: {
    carrier: AccountRecord; onBack: () => void; onApply: () => void;
}) {
    const rows: { label: string; value: string }[] = [
        { label: "Legal name", value: carrier.legalName },
        { label: "Operating as", value: carrier.dbaName },
        { label: "Based in", value: `${carrier.city}, ${carrier.state}` },
        { label: "DOT number", value: carrier.dotNumber || "—" },
        { label: "CVOR", value: carrier.cvorNumber || "—" },
        { label: "NSC", value: carrier.nscNumber || "—" },
        { label: "Fleet", value: `${carrier.assets} units` },
        { label: "Drivers", value: `${carrier.drivers}` },
        { label: "Carrier since", value: carrier.createdAt },
    ];
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-5">
            {/* Back is for the phone, where this replaced the list rather than sitting beside it. */}
            <button
                type="button" onClick={onBack}
                className="flex w-full items-center gap-1 border-b border-slate-100 px-4 py-3 text-xs font-semibold text-slate-500 hover:text-slate-700 lg:hidden"
            >
                <ChevronLeft size={14} /> All carriers
            </button>
            <div className="p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-base font-bold text-white">
                        {initialsOf(carrier.dbaName)}
                    </div>
                    <div className="min-w-0">
                        <h2 className="truncate text-base font-bold text-slate-900">{carrier.dbaName}</h2>
                        <p className="truncate text-xs text-slate-500">{carrier.legalName}</p>
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold", RATING_TONE[carrier.safetyRating] ?? "border-slate-200 bg-slate-50 text-slate-600")}>
                        <ShieldCheck size={11} /> {carrier.safetyRating}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                        <Building2 size={11} /> {carrier.country === "US" ? "United States" : carrier.country}
                    </span>
                </div>

                <dl className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                    {rows.map((r) => (
                        <div key={r.label} className="flex items-baseline justify-between gap-3 py-2">
                            <dt className="text-[11px] font-medium text-slate-400">{r.label}</dt>
                            <dd className="min-w-0 truncate text-right text-sm font-semibold text-slate-900">{r.value}</dd>
                        </div>
                    ))}
                </dl>

                <button
                    type="button" onClick={onApply}
                    className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                >
                    Apply to {carrier.dbaName} <ArrowRight size={15} />
                </button>
            </div>
        </div>
    );
}

/**
 * One question before the form: where will they be driving.
 *
 * It is asked here rather than inside the application because it decides WHICH application
 * they get — a Canada-only driver is never asked for a PSP authorization, and a cross-border
 * driver is asked for both countries' consents.
 */
function ApplyDialog({ carrier, driverName, onClose, onOpenForm }: {
    carrier: AccountRecord;
    driverName?: string;
    onClose: () => void;
    onOpenForm?: (carrier: AccountRecord, driverType: string) => void;
}) {
    const [picked, setPicked] = useState<string | null>(null);
    const [started, setStarted] = useState(false);

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={onClose}>
            {/* A sheet on a phone, a dialog on a desktop. Header and footer stay put and only
                the middle scrolls, so the action is always reachable. */}
            <div
                className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog" aria-modal="true" aria-label={`Apply to ${carrier.dbaName}`}
            >
                <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Apply</p>
                        <h2 className="truncate text-base font-bold text-slate-900">{carrier.dbaName}</h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close"
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                        <X size={18} />
                    </button>
                </header>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {started ? (
                        <div className="py-6 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <Check size={22} strokeWidth={3} />
                            </div>
                            <h3 className="text-base font-bold text-slate-900">Application started</h3>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                {driverName ? `${driverName.split(" ")[0]}, your` : "Your"}{" "}
                                {DRIVER_TYPES.find((t) => t.id === picked)?.label} application to{" "}
                                {carrier.dbaName} is open. Continue to the form to fill it in — you can save
                                and come back to it.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="mb-3 text-sm text-slate-600">Where will you be driving?</p>
                            <div className="space-y-2">
                                {DRIVER_TYPES.map((t) => (
                                    <button
                                        key={t.id} type="button" onClick={() => setPicked(t.id)}
                                        aria-pressed={picked === t.id}
                                        className={cn(
                                            "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors",
                                            picked === t.id
                                                ? "border-blue-400 bg-blue-50/60 ring-1 ring-blue-500/20"
                                                : "border-slate-200 bg-white hover:border-slate-300",
                                        )}
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-bold text-slate-900">{t.label}</span>
                                            <span className="block text-xs text-slate-500">{t.blurb}</span>
                                        </span>
                                        <span className={cn(
                                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                            picked === t.id ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300",
                                        )}>
                                            {picked === t.id && <Check size={12} strokeWidth={3} />}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-slate-400">
                                This decides which application you are given — a Canada-only driver is not
                                asked for US authorizations, and a cross-border driver is asked for both.
                            </p>
                        </>
                    )}
                </div>

                <footer className="shrink-0 border-t border-slate-100 px-5 py-3.5">
                    {started ? (
                        <button type="button" onClick={() => { onOpenForm?.(carrier, picked!); onClose(); }}
                            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-700">
                            Continue to the application form <ArrowRight size={15} />
                        </button>
                    ) : (
                        <button type="button" onClick={() => picked && setStarted(true)} disabled={!picked}
                            className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-blue-600 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400">
                            Continue <ArrowRight size={15} />
                        </button>
                    )}
                </footer>
            </div>
        </div>
    );
}
