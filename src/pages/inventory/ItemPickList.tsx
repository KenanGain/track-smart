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

import { Fragment, useEffect, useMemo, useState } from "react";
import { Check, Plus, Ban, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { TabScroller } from "@/components/ui/TabScroller";
import { TablePager } from "./TablePager";
import {
    itemName, itemCategoryId, itemTravelsWithDriver, handlingLabel, HANDLING_ALL_LABEL,
    VENDORS, VENDOR_CATEGORIES,
    type InventoryItem, type InventoryStatus,
} from "./inventory.data";
import { FilterChip, ResetFilters, TableGroupBand } from "@/components/ui/ListChrome";
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

type PickWhat = "all" | "on" | "free";
type PickHandling = "all" | "returnable" | "removable";
type PickGroup = "none" | "assignment" | "category" | "vendor" | "handling" | "status";

const PICK_GROUPS: { id: PickGroup; label: string }[] = [
    { id: "none", label: "Group by" },
    // First, because it is the cut you want while giving kit out: what is already on it,
    // then everything you could add. Same word, and same two bands, as the Inventory list.
    { id: "assignment", label: "Assignment" },
    { id: "category", label: "Category" },
    { id: "vendor", label: "Vendor" },
    { id: "handling", label: "Handling" },
    { id: "status", label: "Status" },
];

const PICK_STATUS_RANK: Record<InventoryStatus, number> = {
    "Expired": 0, "Expiring Soon": 1, "Active": 2,
};

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
    // The two questions you have while giving kit out: is it already on this holder, and
    // does it come back with the driver. Same chips, same Group by, same Reset as the
    // Inventory list and the holder panel.
    const [what, setWhat] = useState<PickWhat>("all");
    const [handling, setHandling] = useState<PickHandling>("all");
    const [groupBy, setGroupBy] = useState<PickGroup>("none");
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
    useEffect(() => { setPage(0); }, [cat, search, what, handling, groupBy]);

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

    /**
     * One list, not two.
     *
     * What is already on this holder and what is free to give out were two separate loops
     * paged together, which is why nothing could band them: a group heading cannot span two
     * maps. A row is an item plus, when it is already on this holder, the entry that says
     * so — and the only thing that differs between them is the tick.
     */
    const rows = useMemo(() => {
        const out: { item: InventoryItem; on: HeldPickRow | null }[] = [];
        for (const h of held) if (matches(h.item)) out.push({ item: h.item, on: h });
        for (const it of items) if (matches(it)) out.push({ item: it, on: null });
        return out.filter((r) => {
            if (what === "on" && !r.on) return false;
            if (what === "free" && r.on) return false;
            if (handling === "returnable" && !itemTravelsWithDriver(r.item)) return false;
            if (handling === "removable" && itemTravelsWithDriver(r.item)) return false;
            return true;
        });
    }, [held, items, matches, what, handling]);

    /** What each chip would find, before it narrows anything. */
    const counts = useMemo(() => {
        const base: { item: InventoryItem; on: boolean }[] = [
            ...held.filter((h) => matches(h.item)).map((h) => ({ item: h.item, on: true })),
            ...items.filter(matches).map((it) => ({ item: it, on: false })),
        ];
        const kept = base.filter(({ item }) =>
            handling === "all" ? true
                : handling === "returnable" ? itemTravelsWithDriver(item)
                : !itemTravelsWithDriver(item));
        const inWhat = base.filter(({ on }) => what === "all" ? true : what === "on" ? on : !on);
        const ret = inWhat.filter(({ item }) => itemTravelsWithDriver(item)).length;
        return {
            all: kept.length,
            on: kept.filter((r) => r.on).length,
            free: kept.filter((r) => !r.on).length,
            kindAll: inWhat.length,
            returnable: ret,
            removable: inWhat.length - ret,
        };
    }, [held, items, matches, what, handling]);

    /** Which band a row falls in, and where that band sits. */
    const groupOfRow = (r: { item: InventoryItem; on: HeldPickRow | null }): { rank: number; label: string } => {
        // The same two bands the Inventory list uses, in the same words: what is on it, and
        // what is on nothing. Assigned first — you check what is already there before you
        // decide what to add.
        if (groupBy === "assignment") {
            return r.on ? { rank: 0, label: "Assigned" } : { rank: 1, label: "Available" };
        }
        if (groupBy === "vendor") return { rank: 0, label: vendorOf(r.item) || "No vendor" };
        if (groupBy === "handling") {
            return itemTravelsWithDriver(r.item)
                ? { rank: 0, label: handlingLabel("driver-returnable") }
                : { rank: 1, label: handlingLabel("asset-removable") };
        }
        if (groupBy === "status") return { rank: PICK_STATUS_RANK[r.item.status] ?? 9, label: r.item.status };
        const id = itemCategoryId(r.item) || "";
        return { rank: 0, label: VENDOR_CATEGORIES.find((c) => c.id === id)?.name ?? "Other" };
    };

    // Banded before the page is cut, so a band never splits across two pages. Ungrouped,
    // the order is what it always was: what is on it first, then what is free.
    const ordered = useMemo(() => {
        if (groupBy === "none") return rows;
        return [...rows].sort((a, b) => {
            const ga = groupOfRow(a), gb = groupOfRow(b);
            return ga.rank - gb.rank || ga.label.localeCompare(gb.label)
                || Number(!!b.on) - Number(!!a.on);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, groupBy]);

    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === "none") return m;
        for (const r of ordered) {
            const label = groupOfRow(r).label;
            m.set(label, (m.get(label) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ordered, groupBy]);

    const total = ordered.length;
    const safePage = Math.min(page, Math.max(0, Math.ceil(total / perPage) - 1));
    const paged = ordered.slice(safePage * perPage, safePage * perPage + perPage);

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

            {/* The same row the Inventory list and the holder panel carry: chips left,
                Group by right, Reset on the end. Picking two fuel cards out of seventeen
                free items used to mean typing a word and hoping. */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 bg-slate-50/40 px-3 py-2">
                {held.length > 0 && (
                    <>
                        {/* The Inventory list's words, not a second set: you arrive here from
                            that list, and "On this vehicle / Free" describes exactly the two
                            sets it calls Assigned and Available. */}
                        <FilterChip label="All items" count={counts.all} on={what === "all"} always
                            onClick={() => setWhat("all")} />
                        <FilterChip label="Assigned" count={counts.on} on={what === "on"}
                            onClick={() => setWhat("on")} />
                        <FilterChip label="Available" count={counts.free} on={what === "free"}
                            onClick={() => setWhat("free")} />
                        <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" aria-hidden />
                    </>
                )}
                <FilterChip label={HANDLING_ALL_LABEL} count={counts.kindAll} on={handling === "all"} always
                    onClick={() => setHandling("all")} />
                <FilterChip label={handlingLabel("driver-returnable")} count={counts.returnable} on={handling === "returnable"}
                    onClick={() => setHandling("returnable")} />
                <FilterChip label={handlingLabel("asset-removable")} count={counts.removable} on={handling === "removable"}
                    onClick={() => setHandling("removable")} />
                <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value as PickGroup)}
                    title="Group the list"
                    className={cn(
                        "ml-auto h-8 shrink-0 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500",
                        groupBy === "none"
                            ? "border-slate-200 bg-white text-slate-600"
                            : "border-blue-300 bg-blue-50/60 text-blue-700",
                    )}
                >
                    {PICK_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
                <ResetFilters
                    on={what !== "all" || handling !== "all" || groupBy !== "none"
                        || cat !== ALL || search.trim() !== ""}
                    onReset={() => {
                        setWhat("all");
                        setHandling("all");
                        setGroupBy("none");
                        setCat(ALL);
                        setSearch("");
                    }}
                />
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
                            {paged.map((r, i) => {
                                const item = r.item;
                                const visual = visualFor(itemCategoryId(item));
                                const band = groupBy === "none" ? null : groupOfRow(r);
                                const prev = i === 0 || groupBy === "none" ? null : groupOfRow(paged[i - 1]);
                                // A held row is ticked because it IS on this holder, and
                                // unticking is how you take it back. A free row is ticked to
                                // put it on. One box, two meanings, decided by which it is.
                                const off = r.on ? !!removing?.has(item.id) : false;
                                const picked = r.on ? !off : assigned.has(item.id);
                                return (
                                    <Fragment key={`${r.on ? "on" : "free"}-${item.id}`}>
                                    {band && (!prev || prev.label !== band.label) && (
                                        <TableGroupBand label={band.label} count={groupCounts.get(band.label) ?? 0} colSpan={6} />
                                    )}
                                    <tr className={cn(
                                        "transition-colors",
                                        off ? "bg-rose-50/60"
                                            : picked ? "bg-blue-50/70"
                                            : "bg-white hover:bg-slate-50/70",
                                    )}>
                                        <td className="px-3 py-2 align-middle">
                                            <Tick
                                                on={picked}
                                                tone="blue"
                                                disabledReason={r.on ? (r.on.removeBlocked ?? null) : null}
                                                label={r.on
                                                    ? (off
                                                        ? `Keep ${itemName(item)} on this ${holderNoun}`
                                                        : `Take ${itemName(item)} off this ${holderNoun}`)
                                                    : (destinationFor
                                                        ? `Put ${itemName(item)} on this ${holderNoun} → ${destinationFor(item)}`
                                                        : `Assign ${itemName(item)} to this ${holderNoun}`)}
                                                onToggle={() => (r.on ? onRemove?.(item.id) : onAssign(item.id))}
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
                                                    {/* No chip saying it is on this vehicle — the ticked box
                                                        beside it says that, and saying the same thing twice is
                                                        what made this list look complicated. */}
                                                    <div className={cn(
                                                        "truncate text-[13px] font-semibold leading-tight text-slate-900",
                                                        off && "text-slate-400 line-through",
                                                    )}>
                                                        {itemName(item)}
                                                    </div>
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
                                    </Fragment>
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
