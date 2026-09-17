// ─────────────────────────────────────────────────────────────────────────────
// "What is free, and where is it going" — the same list, wherever kit is given out.
//
// Two forms ask it: the assign / hand-over page and the Register Asset wizard. Both
// had grown their own copy of the two-tick row, which is exactly the sort of thing
// that ends up meaning different things in different places — and the two ticks are
// the one control in this module a user has to learn.
//
// Two destinations, one answer per row: ticking one end clears the other, because a
// row is a destination rather than four states. A blocked tick carries its reason,
// since "why can I not hand this over" is the question a dimmed box provokes and
// never answers.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { Boxes, Check, Plus, Ban, Search, ClipboardList, PenLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { itemName, VENDORS, type InventoryItem } from "./inventory.data";
import { fmtDate } from "./inventory-assignment";

const vendorOf = (it: InventoryItem) => {
    const v = VENDORS.find((x) => x.id === it.vendorId);
    return v?.companyName || v?.name || "—";
};

/** One of the two ticks on a row. */
export function Tick({ on, tone, label, disabledReason, onToggle }: {
    on: boolean; tone: "blue" | "violet"; label: string;
    disabledReason?: string | null; onToggle: () => void;
}) {
    const blocked = !!disabledReason;
    return (
        <button
            type="button" onClick={onToggle} disabled={blocked}
            title={disabledReason ?? label} aria-label={label} aria-pressed={on}
            className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                blocked ? "cursor-not-allowed border-slate-200 bg-slate-100"
                    : on
                        ? tone === "blue" ? "border-blue-600 bg-blue-600 text-white" : "border-violet-600 bg-violet-600 text-white"
                        : "border-slate-300 bg-white hover:border-slate-400",
            )}
        >
            {blocked ? <Ban size={11} className="text-slate-300" />
                : on ? <Check size={13} />
                : <Plus size={12} className="text-slate-400" />}
        </button>
    );
}

export function ItemPickList({
    items, assigned, handed, onAssign, onHand, holderNoun, handDriverName, handBlockedBecause,
    emptyAll, maxHeight = "max-h-96",
}: {
    items: InventoryItem[];
    assigned: Set<string>;
    handed: Set<string>;
    onAssign: (id: string) => void;
    onHand: (id: string) => void;
    /** "driver" or "vehicle" — what the left tick files it against. */
    holderNoun: string;
    /** Who signs, when anybody can. */
    handDriverName?: string | null;
    /** Why this item cannot be signed across, or null. */
    handBlockedBecause: (it: InventoryItem) => string | null;
    emptyAll?: React.ReactNode;
    maxHeight?: string;
}) {
    const [search, setSearch] = useState("");

    const shown = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((it) =>
            itemName(it).toLowerCase().includes(q)
            || (it.serial ?? "").toLowerCase().includes(q)
            || vendorOf(it).toLowerCase().includes(q));
    }, [items, search]);

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Unassigned <span className="ml-1 text-slate-400">({items.length} free)</span>
                </h3>
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search unassigned items…"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>

            {items.length === 0 ? (
                <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
                    {emptyAll ?? <>Every item in this carrier's inventory is already on a vehicle, a person, or a
                        hand-over. Take one back first, or add a new item.</>}
                </p>
            ) : shown.length === 0 ? (
                <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-400">
                    No free item matches “{search.trim()}”.
                </p>
            ) : (
                <div className={cn("mt-3 space-y-1.5 overflow-y-auto pr-1", maxHeight)}>
                    {/* What the two ticks mean, on the columns they label. */}
                    <div className="sticky top-0 z-[1] flex items-start justify-between gap-4 bg-white pb-1.5">
                        <span className="pl-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                <ClipboardList size={10} /> ← Assign
                            </span>
                            <span className="block text-[10px] text-slate-500">
                                Filed against this {holderNoun} · nobody signs
                            </span>
                        </span>
                        <span className="pr-1 text-right">
                            <span className={cn("flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-wider",
                                handDriverName ? "text-violet-600" : "text-slate-300")}>
                                Hand over → <PenLine size={10} />
                            </span>
                            <span className="block text-[10px] text-slate-500">
                                {handDriverName ? `${handDriverName} signs for it` : "No driver to sign"}
                            </span>
                        </span>
                    </div>

                    {shown.map((item) => {
                        const assignPicked = assigned.has(item.id);
                        const handPicked = handed.has(item.id);
                        const blocked = handBlockedBecause(item);
                        return (
                            <div key={item.id} className={cn(
                                "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors",
                                handPicked ? "border-violet-300 bg-violet-50/70"
                                    : assignPicked ? "border-blue-300 bg-blue-50/70"
                                    : "border-slate-200 bg-white",
                            )}>
                                <Tick
                                    on={assignPicked} tone="blue"
                                    label={`Assign ${itemName(item)} to this ${holderNoun}`}
                                    onToggle={() => onAssign(item.id)}
                                />
                                <Boxes size={14} className="ml-1 shrink-0 text-slate-400" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[13px] font-semibold text-slate-800">{itemName(item)}</span>
                                    <span className="block truncate text-[11px] text-slate-500">
                                        {vendorOf(item)}{item.serial && <span className="font-mono"> · {item.serial}</span>}
                                    </span>
                                </span>
                                <span className="shrink-0 text-right text-[11px] text-slate-400">
                                    {item.expiryDate ? fmtDate(item.expiryDate) : "no expiry"}
                                </span>
                                <Tick
                                    on={handPicked} tone="violet" disabledReason={blocked}
                                    label={`Hand ${itemName(item)} over to ${handDriverName ?? "the driver"}`}
                                    onToggle={() => onHand(item.id)}
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}
