// ─────────────────────────────────────────────────────────────────────────────
// "What is free, and where is it going" — the same list, wherever kit is given out.
//
// Two forms ask it: the assign / hand-over page and the Register Asset wizard. Both
// had grown their own copy of the two-tick row, which is exactly the sort of thing
// that ends up meaning different things in different places — and the two ticks are
// the one control in this module a user has to learn.
//
// It reads as the Inventory list does, because it is the same items: the same category
// strip across the top, the same columns (item, number / PIN, issued, expires), the same
// icons. Somebody who has learnt to scan one is not asked to learn the other. The only
// thing this list has that the other does not is the ticks — and that is the point of it.
//
// Where the caller has something already (`held`), those rows join the same flat list,
// arriving ticked. One question — which of this carrier's inventory is on this vehicle —
// and one control: the tick. Ticked means on it; untick to take it back. No headings
// dividing the list into "on it" and "free", and no chip on the row repeating what the box
// beside it already says. A row that cannot be unticked here says why instead.
//
// "Free" means on no vehicle, no person and no hand-over, within this carrier's inventory.
// Something already out cannot be given out AGAIN, so it is never offered twice.
//
// WHERE a ticked item goes is not asked here, because the item already knows: something
// driver returnable travels with whoever drives the vehicle, something asset removable
// stays on it. The form used to ask per assignment, with a second tick, which is how one
// fuel card ends up carried on one truck and not on the next. `destinationFor` turns that
// into a column, so the row says where the tick will put it before you click.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { Check, Plus, Ban, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TabScroller } from "@/components/ui/TabScroller";
import { TablePager } from "./TablePager";
import { itemName, itemCategoryId, VENDORS, VENDOR_CATEGORIES, type InventoryItem, type InventoryStatus } from "./inventory.data";
import { visualFor } from "./inventory-visuals";
import { fmtDate } from "./inventory-assignment";

const STATUS_TONE: Record<InventoryStatus, string> = {
    "Active": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Expiring Soon": "bg-amber-50 text-amber-700 border-amber-200",
    "Expired": "bg-red-50 text-red-700 border-red-200",
};
const STATUS_DOT: Record<InventoryStatus, string> = {
    "Active": "bg-emerald-500",
    "Expiring Soon": "bg-amber-500",
    "Expired": "bg-red-500",
};

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

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn(
        "sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap",
        className,
    )}>
        {children}
    </th>
);

/**
 * A row for something the holder already has.
 *
 * Deliberately not `HeldItem` from the rollup: this component draws a row, and every caller
 * that has one knows what its chip should say and whether it can come off. Passing the
 * rollup type would put the "can this be taken back here" rule in two places.
 */
export type HeldPickRow = {
    item: InventoryItem;
    /** ON VEHICLE / CARRIED / HANDED — how it got there. */
    label: string;
    /** Tailwind classes for the chip, from the caller's own tone table. */
    chipClass: string;
    /** Why it cannot be taken off from here, or null. */
    removeBlocked?: string | null;
    /** On a signed hand-over, so it shows in the hand-over column too. */
    handed?: boolean;
    /** The receipt state, where one applies. */
    right?: React.ReactNode;
};

/** The same status pill the Inventory list draws, so one table reads as one table. */
function StatusPill({ status }: { status: InventoryStatus }) {
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold",
            STATUS_TONE[status],
        )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[status])} />
            {status}
        </span>
    );
}

const ALL = "All";

export function ItemPickList({
    items, assigned, onAssign, holderNoun, destinationFor,
    emptyAll,
    held = [], removing, onRemove,
}: {
    /** The FREE items — on nobody, and so available to give out. */
    items: InventoryItem[];
    assigned: Set<string>;
    onAssign: (id: string) => void;
    /** "driver" or "vehicle" — what the tick files it against. */
    holderNoun: string;
    /**
     * Where ticking this row would put it, in words.
     *
     * Read off the item's own "how it comes back": driver returnable goes to whoever drives
     * the vehicle, asset removable stays on it. Not a column — a column about where a tick
     * will put something is the table explaining its own control — but the tick's tooltip
     * says it, so the answer is a hover away rather than absent.
     */
    destinationFor?: (it: InventoryItem) => string;
    emptyAll?: React.ReactNode;
    /** What the holder has already. Empty on a form for something that holds nothing yet. */
    held?: HeldPickRow[];
    /** Which held items this save would take back. */
    removing?: Set<string>;
    /** Untick a held row. Required whenever `held` is non-empty. */
    onRemove?: (id: string) => void;
}) {
    const [search, setSearch] = useState("");
    const [cat, setCat] = useState<string>(ALL);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);

    /**
     * The category strip, built from what is actually on this list — held and free both.
     *
     * Not from the full catalog: a tab reading "Dashcam 0" on a list of things you can give
     * out is a tab that cannot do anything. And not from the free half alone, or the tab
     * carrying the fuel card already on the truck would vanish the moment it was the last
     * one of its kind.
     */
    const all = useMemo(() => [...held.map((h) => h.item), ...items], [held, items]);
    const tabs = useMemo(() => {
        const counts = new Map<string, number>();
        for (const it of all) {
            const id = itemCategoryId(it) || "";
            counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        const out = [{ id: ALL, label: "All", count: all.length }];
        for (const c of VENDOR_CATEGORIES) {
            const n = counts.get(c.id);
            if (n) out.push({ id: c.id, label: c.name, count: n });
        }
        const other = counts.get("");
        if (other) out.push({ id: "", label: "Other", count: other });
        return out;
    }, [all]);

    // Taking the last item out of a category (ticking it does not, but a parent refresh can)
    // would otherwise leave you on a tab that is no longer there, showing nothing.
    useEffect(() => {
        if (!tabs.some((t) => t.id === cat)) setCat(ALL);
    }, [tabs, cat]);

    // Narrowing the list puts you back at the start of it: page 4 of a list that now has
    // two pages is an empty table, which reads as "nothing matches".
    useEffect(() => { setPage(0); }, [cat, search]);

    // The tab and the search box narrow both halves, so a category with nothing free in it
    // still shows what is already on the vehicle rather than reading as empty.
    const matches = useMemo(() => {
        const q = search.trim().toLowerCase();
        return (it: InventoryItem) => {
            if (cat !== ALL && (itemCategoryId(it) || "") !== cat) return false;
            if (!q) return true;
            return itemName(it).toLowerCase().includes(q)
                || (it.serial ?? "").toLowerCase().includes(q)
                || (it.pin ?? "").toLowerCase().includes(q)
                || vendorOf(it).toLowerCase().includes(q);
        };
    }, [cat, search]);

    const allHeld = useMemo(() => held.filter((h) => matches(h.item)), [held, matches]);
    const allFree = useMemo(() => items.filter(matches), [items, matches]);
    const total = allHeld.length + allFree.length;

    /**
     * One page of the one list.
     *
     * Held rows come first and page WITH the free ones, because they are one list: a page
     * boundary is just where the rows ran out, not a change of subject. Ticking a row does
     * not move it, so what you just ticked stays where you left it.
     */
    const safePage = Math.min(page, Math.max(0, Math.ceil(total / perPage) - 1));
    const from = safePage * perPage;
    const to = from + perPage;
    const shownHeld = allHeld.slice(from, to);
    const shown = allFree.slice(Math.max(0, from - allHeld.length), Math.max(0, to - allHeld.length));

    if (all.length === 0) {
        return (
            <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2.5 text-[12px] leading-snug text-amber-800">
                {emptyAll ?? <>Every item in this carrier's inventory is already on a vehicle, a person, or a
                    hand-over. Take one back first, or add a new item.</>}
            </p>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200">
            {/* The category strip, with the same paging chevrons as the driver and asset
                pages — twelve categories do not fit, and a row that simply stops mid-word
                gives you nothing to click. */}
            <div className="border-b border-slate-200 bg-slate-50/40 px-3">
                <TabScroller ariaLabel="Inventory categories" activeKey={cat}>
                    {tabs.map((t) => {
                        const active = cat === t.id;
                        return (
                            <button
                                key={t.id || "other"}
                                type="button"
                                onClick={() => setCat(t.id)}
                                data-tab-active={active || undefined}
                                className={cn(
                                    "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors",
                                    active
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                                )}
                            >
                                {t.label}
                                <span className={cn(
                                    "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                    active ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600",
                                )}>
                                    {t.count}
                                </span>
                            </button>
                        );
                    })}
                </TabScroller>
            </div>

            {/* What this list is, and a way to narrow it. The scope is stated once here
                rather than implied: everything below is free, and it is this carrier's. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-3 py-2.5">
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                    <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search unassigned items…"
                        className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[13px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <p className="text-right text-[11px] leading-tight text-slate-500">
                        {held.length > 0 && <><span className="font-bold text-slate-700">{held.length}</span> on it — </>}
                        <span className="font-bold text-slate-700">{items.length}</span> free to give out
                        <span className="block text-slate-400">On nobody, in this carrier's inventory.</span>
                    </p>
                </div>
            </div>

            {total === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-400">
                    {search.trim()
                        ? <>Nothing matches “{search.trim()}”{cat !== ALL && " in this category"}.</>
                        : "Nothing in this category."}
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr>
                                {/* No caption over the tick. A box in the first column of a table
                                    is a box you tick; ticked means the item is on this {holderNoun}.
                                    The heading used to explain itself in two lines, which is what
                                    made a list of things look like a form. */}
                                <TH className="w-px" />
                                <TH className="border-l border-slate-200">Item</TH>
                                <TH className="border-l border-slate-200">Number / PIN</TH>
                                <TH className="border-l border-slate-200">Issued</TH>
                                <TH className="border-l border-slate-200">Expires</TH>
                                <TH className="border-l border-slate-200">Status</TH>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* What is already on it, ticked, at the top of the same list. */}
                            {shownHeld.map((h) => {
                                const item = h.item;
                                const visual = visualFor(itemCategoryId(item));
                                const off = !!removing?.has(item.id);
                                const blocked = h.removeBlocked ?? null;
                                return (
                                    <tr key={`held-${item.id}`} className={cn(
                                        "transition-colors",
                                        off ? "bg-rose-50/60" : "bg-white hover:bg-slate-50/70",
                                    )}>
                                        <td className="px-3 py-2 align-middle">
                                            {/* Ticked because it IS on this holder. Unticking is how you
                                                take it back — the same box, the same meaning. */}
                                            <Tick
                                                on={!off} tone="blue" disabledReason={blocked}
                                                label={off
                                                    ? `Keep ${itemName(item)} on this ${holderNoun}`
                                                    : `Take ${itemName(item)} off this ${holderNoun}`}
                                                onToggle={() => onRemove?.(item.id)}
                                            />
                                        </td>
                                        <td className="max-w-[20rem] px-3 py-2 align-middle">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className={cn(
                                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                                    visual.avatarBg, visual.avatarText,
                                                )}>
                                                    <visual.icon size={14} />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className={cn(
                                                        "truncate text-[13px] font-semibold leading-tight text-slate-900",
                                                        off && "text-slate-400 line-through",
                                                    )}>
                                                        {itemName(item)}
                                                    </div>
                                                    {/* No chip saying it is on this vehicle — the ticked box
                                                        beside it says that, and saying the same thing twice is
                                                        what made this list look complicated. */}
                                                    <div className="truncate text-[11px] leading-tight text-slate-500">{vendorOf(item)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle">
                                            <div className="font-mono text-[11px] leading-tight text-slate-700">{item.serial || "—"}</div>
                                            {item.pin && <div className="font-mono text-[10px] leading-tight text-slate-400">PIN {item.pin}</div>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle text-[11px] text-slate-600">
                                            {item.issueDate ? fmtDate(item.issueDate) : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle text-[11px]">
                                            {item.expiryDate
                                                ? <span className="text-slate-600">{fmtDate(item.expiryDate)}</span>
                                                : <span className="text-slate-400">no expiry</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle">
                                            <StatusPill status={item.status} />
                                        </td>
                                    </tr>
                                );
                            })}
                            {shown.map((item) => {
                                const assignPicked = assigned.has(item.id);
                                const visual = visualFor(itemCategoryId(item));
                                return (
                                    <tr
                                        key={item.id}
                                        className={cn(
                                            "transition-colors",
                                            assignPicked ? "bg-blue-50/70" : "bg-white hover:bg-slate-50/70",
                                        )}
                                    >
                                        <td className="px-3 py-2 align-middle">
                                            <Tick
                                                on={assignPicked} tone="blue"
                                                // Where it will land, on the control that puts it there.
                                                // It was a column of its own, which is a table explaining
                                                // its own tick box; on the tick it is one hover away.
                                                label={destinationFor
                                                    ? `Put ${itemName(item)} on this ${holderNoun} → ${destinationFor(item)}`
                                                    : `Assign ${itemName(item)} to this ${holderNoun}`}
                                                onToggle={() => onAssign(item.id)}
                                            />
                                        </td>
                                        <td className="max-w-[20rem] px-3 py-2 align-middle">
                                            <div className="flex min-w-0 items-center gap-2.5">
                                                <span className={cn(
                                                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                                                    visual.avatarBg, visual.avatarText,
                                                )}>
                                                    <visual.icon size={14} />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="truncate text-[13px] font-semibold leading-tight text-slate-900">{itemName(item)}</div>
                                                    <div className="truncate text-[11px] leading-tight text-slate-500">{vendorOf(item)}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle">
                                            <div className="font-mono text-[11px] leading-tight text-slate-700">{item.serial || "—"}</div>
                                            {item.pin && <div className="font-mono text-[10px] leading-tight text-slate-400">PIN {item.pin}</div>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle text-[11px] text-slate-600">
                                            {item.issueDate ? fmtDate(item.issueDate) : "—"}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle text-[11px]">
                                            {/* An item with no expiry is not missing one — a yard key never
                                                runs out — so it is said quietly rather than as a gap. */}
                                            {item.expiryDate
                                                ? <span className="text-slate-600">{fmtDate(item.expiryDate)}</span>
                                                : <span className="text-slate-400">no expiry</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-2 align-middle">
                                            <StatusPill status={item.status} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* How much of the list you are looking at, and how to see the rest. The same
                footer the Inventory list uses — a second idea of what a long list is would
                be one more thing to learn about the same table. */}
            {total > 0 && (
                <TablePager
                    page={safePage}
                    perPage={perPage}
                    total={total}
                    label="items"
                    onPage={setPage}
                    onPerPage={(n) => { setPerPage(n); setPage(0); }}
                />
            )}
        </div>
    );
}
