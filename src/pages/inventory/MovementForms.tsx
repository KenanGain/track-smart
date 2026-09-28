// ─────────────────────────────────────────────────────────────────────────────
// What they sign for it — chosen on the same step that words the message.
//
// Handing a driver a fuel card, a tablet and a set of keys has always had two
// halves: the record change, and the receipt. The app did both, in two places
// that had never met — the kit was assigned here, and the Uniform & Equipment
// Issue Receipt was signed over in onboarding, once, on the driver's first day,
// with the item list typed in by hand.
//
// So it is offered here, and it is filled from the movement. The office picks
// the paperwork on the same screen it reads the message, because "did we get a
// signature for that" is a question about this save, not a separate errand.
//
// The picker is the system's own form catalog rather than a shortlist: a carrier
// that wants its property agreement signed on hand-out should not have to ask.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useRef, useState } from "react";
import { FileSignature, Plus, Search, X, Eye, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    INVENTORY_FORM_CATALOG, ISSUE_RECEIPT_ID, inventoryFormOption, type InventoryFormOption,
} from "./inventory-forms";

const GROUP_LABEL: Record<InventoryFormOption["group"], string> = {
    onboarding: "Company paperwork",
    consent: "Policy & consent forms",
};

export function MovementForms({ ids, onChange, onPreview, collectCount }: {
    ids: string[];
    onChange: (next: string[]) => void;
    /** Open a form read-only, so nobody attaches one they have not read. */
    onPreview?: (defId: string) => void;
    /** How many people are being asked to collect — for the sentence, not the logic. */
    collectCount: number;
}) {
    const [picking, setPicking] = useState(false);
    const [q, setQ] = useState("");
    // What was attached before the switch went off, so turning it back on restores the
    // choice rather than silently re-defaulting to the receipt somebody had just swapped out.
    const last = useRef<string[]>(ids.length ? ids : [ISSUE_RECEIPT_ID]);
    if (ids.length) last.current = ids;
    const on = ids.length > 0;

    const flip = () => {
        if (on) { setPicking(false); onChange([]); return; }
        onChange(last.current.length ? last.current : [ISSUE_RECEIPT_ID]);
    };

    const chosen = useMemo(
        () => ids.map(inventoryFormOption).filter((o): o is InventoryFormOption => !!o),
        [ids],
    );

    const results = useMemo(() => {
        const query = q.trim().toLowerCase();
        const list = query
            ? INVENTORY_FORM_CATALOG.filter((o) => `${o.title} ${o.blurb}`.toLowerCase().includes(query))
            : INVENTORY_FORM_CATALOG;
        // Grouped, in the picker's own order, so a policy statement and a payroll form are
        // not shuffled together in one flat list of thirty.
        return (["onboarding", "consent"] as const)
            .map((g) => ({ group: g, items: list.filter((o) => o.group === g) }))
            .filter((s) => s.items.length > 0);
    }, [q]);

    const toggle = (id: string) =>
        onChange(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

    return (
        <div className="overflow-hidden rounded-xl border border-violet-200">
            <div className={cn(
                "flex flex-wrap items-center gap-2.5 border-b px-3.5 py-2.5 transition-colors",
                on ? "border-violet-100 bg-violet-50/60" : "border-slate-200 bg-slate-50",
            )}>
                <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    on ? "bg-violet-100 text-violet-600" : "bg-slate-200 text-slate-500",
                )}>
                    <FileSignature size={15} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-bold text-slate-800">
                        {!on
                            ? "Take a signature for this"
                            : chosen.length === 1 ? "One form to sign" : `${chosen.length} forms to sign`}
                    </span>
                    <span className="block text-[11px] leading-snug text-slate-500">
                        {!on
                            ? "Off. The kit moves and the message goes; nobody signs for it."
                            : <>The form goes out in the same message, filled in from what
                                {collectCount === 1 ? " they tick" : " each of them ticks"} off, and
                                filed onto their record once signed.</>}
                    </span>
                </span>
                {on && (
                    <button
                        type="button"
                        onClick={() => { setPicking((p) => !p); setQ(""); }}
                        className={cn(
                            "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-bold transition-colors",
                            picking
                                ? "border-violet-300 bg-violet-600 text-white hover:bg-violet-700"
                                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                        )}
                    >
                        {picking ? <><Check size={13} /> Done</> : <><Plus size={13} /> Add a form</>}
                    </button>
                )}
                <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label="Take a signature for this"
                    onClick={flip}
                    className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        on ? "bg-violet-600" : "bg-slate-300",
                    )}
                >
                    <span className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        on ? "left-[22px]" : "left-0.5",
                    )} />
                </button>
            </div>

            {/* What is attached. Each one removable — the office that does not take a receipt
                for a spare key should not have to argue with the form about it. */}
            {on && chosen.length > 0 && (
                <ul className="divide-y divide-slate-100">
                    {chosen.map((o) => (
                        <li key={o.id} className="flex flex-wrap items-center gap-2 px-3.5 py-2">
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-slate-800">{o.title}</span>
                                <span className="block truncate text-[11px] text-slate-500">{o.blurb}</span>
                            </span>
                            {onPreview && (
                                <button
                                    type="button"
                                    onClick={() => onPreview(o.id)}
                                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    <Eye size={11} /> Read it
                                </button>
                            )}
                            {/* Only where there is another one left. Removing the last row
                                and turning the whole thing off are the same act, and it has a
                                switch — an x that empties the block leaves it saying nothing. */}
                            {chosen.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => toggle(o.id)}
                                    aria-label={`Do not send ${o.title}`}
                                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* The system's form list. Not a second catalog: these are the same definitions the
                driver's Forms tab opens, which is why a copy signed here lands on that record. */}
            {on && picking && (
                <div className="border-t border-slate-200 bg-slate-50/60">
                    <div className="flex items-center gap-2 px-3 py-2">
                        <Search size={13} className="shrink-0 text-slate-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search the form catalog…"
                            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto border-t border-slate-200 bg-white">
                        {results.length === 0 ? (
                            <p className="px-3.5 py-3 text-[12px] text-slate-500">
                                No form matches “{q.trim()}”.
                            </p>
                        ) : results.map((sec) => (
                            <div key={sec.group}>
                                <p className="sticky top-0 border-b border-slate-100 bg-slate-50 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    {GROUP_LABEL[sec.group]}
                                </p>
                                {sec.items.map((o) => {
                                    const on = ids.includes(o.id);
                                    return (
                                        <label
                                            key={o.id}
                                            className={cn(
                                                "flex cursor-pointer items-start gap-2.5 border-b border-slate-50 px-3.5 py-2 transition-colors",
                                                on ? "bg-violet-50/60" : "hover:bg-slate-50",
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={on}
                                                onChange={() => toggle(o.id)}
                                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-violet-600 focus:ring-violet-500/30"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-[13px] font-semibold text-slate-800">{o.title}</span>
                                                <span className="block text-[11px] leading-snug text-slate-500">{o.blurb}</span>
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
