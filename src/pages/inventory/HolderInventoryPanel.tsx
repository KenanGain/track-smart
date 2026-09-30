// ─────────────────────────────────────────────────────────────────────────────
// One driver's, or one vehicle's, inventory — on their own detail page.
//
// Both tabs used to answer the question themselves, from the frozen seed module:
// `getInventoryByAssetId` / `getInventoryByDriverId` filtered INVENTORY_ITEMS on a
// direct assignment. Three things were wrong with that, and all three showed:
//
//   · the seed only, so nothing added or edited in the app ever appeared;
//   · the global list rather than the carrier's, so another carrier's truck could
//     show items and this one's could show none;
//   · a DIRECT assignment only, so a driver carrying a vehicle's fuel card, or
//     holding kit on a signed hand-over, read as holding nothing at all.
//
// So both tabs now read the same rollup the Inventory module reads. An item counts
// for exactly one driver and one vehicle, and this page cannot disagree with the
// Drivers and Assets tabs about who is holding what.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from "react";
import {
    Boxes, Search, Pencil, AlertTriangle, Clock, ChevronRight, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TablePager } from "./TablePager";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, itemName, VENDORS, VENDOR_CATEGORIES,
    getCategoryLabel, itemCategoryId, assignmentOf, ASSIGNED_TO_LABEL, type AssignedTo,
    type InventoryItem, type InventoryStatus,
} from "./inventory.data";
import { TabScroller } from "@/components/ui/TabScroller";
import { ResetFilters } from "@/components/ui/ListChrome";
import { useInventoryAdditions } from "./inventory-store";
import {
    rollupByDriver, rollupByAsset,
    type HeldItem, type HolderKind,
} from "./inventory-rollup";
import { fmtDate, daysUntil } from "./inventory-assignment";

/**
 * How the list can be banded.
 *
 * `handling` first, because it is the one the item itself answers and the one that decides
 * who has to do something about it.
 */
type GroupBy = "none" | "assigned" | "status" | "category" | "vendor";

/**
 * `assetOnly` marks the question only a vehicle can answer. A driver holds the returnable
 * half of what they drive and nothing else, so banding their pile by handling produces one
 * band containing everything.
 */
const GROUPS: { id: GroupBy; label: string; assetOnly?: boolean }[] = [
    { id: "none", label: "Group by" },
    // Where it is FILED, which both kinds can answer now that the two assignments are
    // independent: a driver's pile can hold something that is also on a unit, and a unit's
    // can hold something somebody is also answerable for.
    { id: "assigned", label: "Assigned to" },
    { id: "status", label: "Status" },
    { id: "category", label: "Category" },
    { id: "vendor", label: "Vendor" },
];

/** Where an item is filed, in one chip. */
const ASSIGNED_TONE: Record<AssignedTo, string> = {
    both: "border-violet-200 bg-violet-50 text-violet-700",
    driver: "border-blue-200 bg-blue-50 text-blue-700",
    asset: "border-slate-200 bg-slate-50 text-slate-600",
    none: "border-slate-200 bg-white text-slate-400",
};

function AssignedChip({ where }: { where: AssignedTo }) {
    return (
        <span className={cn(
            "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            ASSIGNED_TONE[where],
        )}>
            {ASSIGNED_TO_LABEL[where]}
        </span>
    );
}

/** Which band a row falls in, and where that band sits. */
function groupOf(by: GroupBy, h: HeldItem): { rank: number; label: string } {
    if (by === "assigned") {
        const where = assignmentOf(h.item);
        const rank = { both: 0, driver: 1, asset: 2, none: 3 }[where];
        return { rank, label: ASSIGNED_TO_LABEL[where] };
    }
    if (by === "status") {
        // Worst first, as everywhere else in this module.
        const order: InventoryStatus[] = ["Expired", "Expiring Soon", "Active"];
        return { rank: order.indexOf(h.item.status), label: h.item.status };
    }
    if (by === "vendor") {
        const label = vendorOf(h.item) || "No vendor";
        return { rank: 0, label };
    }
    const label = categoryOf(h.item) || "Other";
    return { rank: label.charCodeAt(0), label };
}

const STATUS_BADGE: Record<InventoryStatus, string> = {
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
const ALL_CAT = "All";

const categoryOf = (it: InventoryItem) => {
    const v = VENDORS.find((x) => x.id === it.vendorId);
    return v ? getCategoryLabel(v.categoryId, VENDOR_CATEGORIES) : "—";
};

/**
 * What one holder is holding, off the shared rollup.
 *
 * Exported because the tab's own count comes from here too: a tab that says 0 over a
 * table showing two rows is worse than either number on its own.
 */
export function useHolderInventory(kind: HolderKind, holderId: string, accountId?: string) {
    const { additions, applyEdit } = useInventoryAdditions(accountId);

    const items = useMemo(() => {
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS).map(applyEdit);
        return additions.length ? [...additions, ...base] : base;
    }, [accountId, additions, applyEdit]);

    const row = useMemo(() => {
        const rows = (kind === "driver" ? rollupByDriver : rollupByAsset)(items, accountId);
        return rows.find((r) => r.id === holderId);
    }, [kind, items, accountId, holderId]);

    return {
        held: row?.items ?? [],
        via: row?.via ?? { returnable: 0, removable: 0 },
        expiring: row?.expiring ?? 0,
        expired: row?.expired ?? 0,
    };
}

type SortKey = "expiry" | "vendor" | "issued";

export function HolderInventoryPanel({ kind, holderId, accountId, onNavigate, showManage }: {
    kind: HolderKind;
    holderId: string;
    accountId?: string;
    /** Without it the panel still reads; it just cannot offer to change anything. */
    onNavigate?: (path: string) => void;
    /**
     * Show the Manage inventory button above the table.
     *
     * Off by default, and on for the two places this panel is EMBEDDED — the driver
     * profile and the asset record. Those pages have their own headers, full of their own
     * actions, and nothing in them is about inventory; without this the tab is a table you
     * can read and not a screen you can do anything on. The inventory module’s own holder
     * page leaves it off, because its header already carries the same button.
     */
    showManage?: boolean;
}) {
    const { held, expiring, expired } = useHolderInventory(kind, holderId, accountId);
    const isDriver = kind === "driver";

    const [search, setSearch] = useState("");
    /**
     * What KIND of thing, not how it got here.
     *
     * The route (on vehicle / carried / handed) is a fact about a row and stays a column.
     * What you filter by is what you are chasing: a driver leaving hands back everything
     * returnable, and a truck going off the road gives up everything removable.
     */
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [status, setStatus] = useState<InventoryStatus | "all">("all");
    const [cat, setCat] = useState<string>(ALL_CAT);
    /**
     * The same nine on both kinds.
     *
     * "Assigned to" used to be an asset-only column printing the item’s own tick, on the
     * grounds that every row of a driver’s pile would read the same. It no longer does: the
     * two assignments are independent, so a driver’s row can say Driver or Both, and that
     * is exactly what somebody looking at their pile wants to know.
     */
    const COLS = ["Item", "Type", "Serial", "PIN", "Issued", "Expires", "Assigned to", "Status", ""];
    const groupOptions = GROUPS.filter((g) => !isDriver || !g.assetOnly);
    const [sort, setSort] = useState<SortKey>("expiry");
    const [dir, setDir] = useState<1 | -1>(1);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(8);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = held.filter((h) => {
            if (cat !== ALL_CAT && (itemCategoryId(h.item) || "") !== cat) return false;
            if (status !== "all" && h.item.status !== status) return false;
            if (!q) return true;
            return itemName(h.item).toLowerCase().includes(q)
                || (h.item.serial ?? "").toLowerCase().includes(q)
                || (h.item.pin ?? "").toLowerCase().includes(q)
                || vendorOf(h.item).toLowerCase().includes(q);
        });
        const val = (h: HeldItem) => (
            sort === "vendor" ? vendorOf(h.item).toLowerCase()
                : sort === "issued" ? (h.item.issueDate || "")
                : (h.item.expiryDate || "9999-12-31")   // no expiry sorts last, not first
        );
        const sorted = [...list].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * dir);
        // Grouping sorts by band BEFORE the page is cut, so a band never splits across two
        // pages and a page never opens mid-group with no heading above it.
        if (groupBy === "none") return sorted;
        return sorted.sort((a, b) => groupOf(groupBy, a).rank - groupOf(groupBy, b).rank);
    }, [held, search, cat, status, sort, dir, groupBy]);

    // Counts are of the WHOLE filtered list, not of the page: a band reading "2" on page one
    // and "2" again on page two is two different twos.
    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy !== "none") {
            for (const h of rows) {
                const label = groupOf(groupBy, h).label;
                m.set(label, (m.get(label) ?? 0) + 1);
            }
        }
        return m;
    }, [rows, groupBy]);

    // A filter that empties the page should not leave you on page 4 of nothing.
    useEffect(() => { setPage(0); }, [search, cat, status, groupBy]);

    /**
     * The category strip, built from what this holder actually has.
     *
     * Not from the catalog: a tab reading "Dashcam 0" over a truck that has never had one
     * is a tab that cannot do anything.
     */
    const catTabs = useMemo(() => {
        const counts = new Map<string, number>();
        for (const h of held) {
            const id = itemCategoryId(h.item) || "";
            counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        const out = [{ id: ALL_CAT, label: "All", count: held.length }];
        for (const c of VENDOR_CATEGORIES) {
            const n = counts.get(c.id);
            if (n) out.push({ id: c.id, label: c.name, count: n });
        }
        const other = counts.get("");
        if (other) out.push({ id: "", label: "Other", count: other });
        return out;
    }, [held]);

    // Taking something off the holder can empty the tab you are standing on.
    useEffect(() => {
        if (!catTabs.some((t) => t.id === cat)) setCat(ALL_CAT);
    }, [catTabs, cat]);

    const paged = rows.slice(page * perPage, page * perPage + perPage);

    const sortBtn = (key: SortKey, label: string) => (
        <button
            type="button"
            onClick={() => (sort === key ? setDir((d) => (d === 1 ? -1 : 1)) : (setSort(key), setDir(1)))}
            className={cn(
                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                sort === key ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
        >
            {label} <span className="text-[10px]">{sort === key ? (dir === 1 ? "↑" : "↓") : "↕"}</span>
        </button>
    );

    return (
        <div className="space-y-4">
            {/* No heading: all three callers render this under a tab that already says
                "Inventory", on a page whose title is the holder. */}
            {/* One action, and it is the same screen the inventory module opens: the whole
                pile, what is free to add to it, and one save. There is no second route
                that skips the list. */}
            {showManage && onNavigate && (
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate(`/inventory/${isDriver ? "drivers" : "assets"}/${holderId}/assign`)}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                    >
                        <ClipboardList size={15} /> Manage inventory
                    </button>
                </div>
            )}

            {/* What needs attention, if anything does. A row of zeroes is noise. */}
            {(expiring > 0 || expired > 0) && (
                <div className="flex flex-wrap gap-2">
                    {expired > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[12px] font-bold text-red-700">
                            <AlertTriangle size={12} /> {expired} expired
                        </span>
                    )}
                    {expiring > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-bold text-amber-700">
                            <Clock size={12} /> {expiring} expiring soon
                        </span>
                    )}
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Categories across the top, as on the Inventory list and the give-out
                    picker — the same strip, with the same paging chevrons. */}
                <div className="border-b border-slate-200 bg-slate-50/40 px-3">
                    <TabScroller ariaLabel="Categories held" activeKey={cat}>
                        {catTabs.map((t) => {
                            const on = cat === t.id;
                            return (
                                <button
                                    key={t.id || "other"}
                                    type="button"
                                    onClick={() => setCat(t.id)}
                                    data-tab-active={on || undefined}
                                    className={cn(
                                        "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-[12px] font-semibold transition-colors",
                                        on ? "border-blue-600 text-blue-600"
                                            : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                                    )}
                                >
                                    {t.label}
                                    <span className={cn(
                                        "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                        on ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600",
                                    )}>
                                        {t.count}
                                    </span>
                                </button>
                            );
                        })}
                    </TabScroller>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
                    <div className="relative min-w-[200px] flex-1">
                        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search item, vendor, serial or PIN…"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    {sortBtn("expiry", "Expiry")}
                    {sortBtn("vendor", "Vendor")}
                    {sortBtn("issued", "Issued")}
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as InventoryStatus | "all")}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none focus:border-blue-500"
                    >
                        <option value="all">All statuses</option>
                        <option value="Active">Active</option>
                        <option value="Expiring Soon">Expiring Soon</option>
                        <option value="Expired">Expired</option>
                    </select>
                </div>

                {/* The Both / Driver / Asset switch used to sit here. It filtered on the
                    same answer the "Assigned to" column already prints, one half at a
                    time — and the Handling grouping below says it for the whole pile at
                    once, which is what somebody stripping a truck actually needs. */}
                <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 px-3 py-2">
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                        title="Group the list"
                        className={cn(
                            "ml-auto h-8 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500",
                            groupBy === "none"
                                ? "border-slate-200 bg-white text-slate-600"
                                : "border-blue-300 bg-blue-50/60 text-blue-700",
                        )}
                    >
                        {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                    {/* Four here: the category tab, the status select, the grouping and the
                        search box. */}
                    <ResetFilters
                        on={cat !== ALL_CAT || status !== "all"
                            || groupBy !== "none" || search.trim() !== ""}
                        onReset={() => {
                            setCat(ALL_CAT);
                            setStatus("all");
                            setGroupBy("none");
                            setSearch("");
                        }}
                    />
                </div>

                {rows.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                            <Boxes size={20} className="text-slate-400" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-700">
                            {held.length === 0 ? "Nothing on file" : "Nothing matches that"}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                            {held.length === 0
                                ? kind === "driver"
                                    ? "Nothing is issued to this driver, riding in their cab, or signed across to them."
                                    : "Nothing is kept on this vehicle or carried by whoever drives it."
                                : "Clear the search or pick a different filter."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    {/* Ruled, so nine columns do not run into each other. */}
                                    {COLS.map((h, i) => (
                                        <th key={h || i} className={cn(
                                            "whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500",
                                            i > 0 && "border-l border-slate-200",
                                            i === COLS.length - 1 && "text-right",
                                        )}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.map((h, i) => {
                                    const { item } = h;
                                    const days = item.expiryDate ? daysUntil(item.expiryDate) : null;
                                    const band = groupBy === "none" ? null : groupOf(groupBy, h);
                                    const prev = i === 0 || groupBy === "none" ? null : groupOf(groupBy, paged[i - 1]);
                                    const where = assignmentOf(item);
                                    return (
                                        <Fragment key={item.id}>
                                        {band && (!prev || prev.label !== band.label) && (
                                            <tr>
                                                <td colSpan={COLS.length} className="border-y border-slate-200 bg-slate-50 p-0">
                                                    <div className="flex items-center gap-2 px-3 py-1.5">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">{band.label}</span>
                                                        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-slate-200/70 px-1.5 text-[10px] font-bold tabular-nums text-slate-600">
                                                            {groupCounts.get(band.label) ?? 0}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        <tr
                                            onClick={() => onNavigate?.(`/inventory/items/${item.id}`)}
                                            className={cn("group transition-colors", onNavigate && "cursor-pointer hover:bg-slate-50/70")}
                                        >
                                            {/* One line. The name truncates rather than wrapping: nine columns
                                                with a five-line cell in one of them is not a list you can scan. */}
                                            <td className="max-w-[16rem] px-3 py-2">
                                                <div className="truncate text-[13px] font-semibold leading-tight text-slate-800" title={itemName(item)}>{itemName(item)}</div>
                                                <div className="truncate text-[11px] leading-tight text-slate-500">{vendorOf(item)}</div>
                                            </td>
                                            <td className="max-w-[10rem] truncate border-l border-slate-200 px-3 py-2 text-[13px] text-slate-600" title={categoryOf(item)}>{categoryOf(item)}</td>
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2 font-mono text-[12px] text-slate-600">{item.serial || "—"}</td>
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2 font-mono text-[12px] text-slate-600">{item.pin || "—"}</td>
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-[13px] text-slate-600">{item.issueDate ? fmtDate(item.issueDate) : "—"}</td>
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-[13px]">
                                                {item.expiryDate ? (
                                                    <>
                                                        <span className={cn(
                                                            "font-semibold",
                                                            days !== null && days < 0 ? "text-red-600"
                                                                : days !== null && days <= 30 ? "text-amber-600" : "text-slate-600",
                                                        )}>
                                                            {fmtDate(item.expiryDate)}
                                                        </span>
                                                        {days !== null && (
                                                            <span className="block text-[11px] text-slate-400">
                                                                {days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}
                                                            </span>
                                                        )}
                                                    </>
                                                ) : <span className="text-slate-400">no expiry</span>}
                                            </td>
                                            {/* Where it is filed, not what it is ticked for. An item can be
                                                on a unit and on a person at once, and that is the answer
                                                somebody chasing it needs. */}
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2">
                                                <AssignedChip where={where} />
                                            </td>
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                    STATUS_BADGE[item.status],
                                                )}>
                                                    <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[item.status])} />
                                                    {item.status}
                                                </span>
                                            </td>
                                            {/* The row opens the item, so the editor stops the click reaching it —
                                                otherwise Edit would open the item and then the form over it. */}
                                            <td className="whitespace-nowrap border-l border-slate-200 px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                                                {onNavigate && (
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => onNavigate(`/inventory/items/${item.id}/edit`)}
                                                            title="Edit" aria-label="Edit"
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                        <ChevronRight size={14} className="shrink-0 text-slate-300 transition-colors group-hover:text-blue-500" />
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {rows.length > 0 && (
                    <TablePager
                        page={page}
                        perPage={perPage}
                        total={rows.length}
                        label="items"
                        onPage={setPage}
                        onPerPage={(n) => { setPerPage(n); setPage(0); }}
                        perPageOptions={[5, 8, 15, 25]}
                    />
                )}
            </div>
        </div>
    );
}
