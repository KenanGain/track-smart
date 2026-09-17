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

import { useEffect, useMemo, useState } from "react";
import {
    Boxes, Search, Pencil, Plus, ClipboardList, PackageCheck, AlertTriangle, Clock, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TablePager } from "./TablePager";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, itemName, VENDORS, VENDOR_CATEGORIES,
    getCategoryLabel, type InventoryItem, type InventoryStatus,
} from "./inventory.data";
import { useInventoryAdditions } from "./inventory-store";
import { useDriverHandovers, handedToMap } from "./handovers.data";
import {
    rollupByDriver, rollupByAsset, VIA_LABEL, VIA_TONE,
    type HeldItem, type HeldVia, type HolderKind,
} from "./inventory-rollup";
import { fmtDate, daysUntil } from "./inventory-assignment";

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
    const { records } = useDriverHandovers(accountId ?? "acct-001");

    const items = useMemo(() => {
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS).map(applyEdit);
        return additions.length ? [...additions, ...base] : base;
    }, [accountId, additions, applyEdit]);

    const handedTo = useMemo(
        () => handedToMap(records, accountId ?? "acct-001"),
        [records, accountId],
    );

    const row = useMemo(() => {
        const rows = (kind === "driver" ? rollupByDriver : rollupByAsset)(items, accountId, handedTo);
        return rows.find((r) => r.id === holderId);
    }, [kind, items, accountId, handedTo, holderId]);

    return {
        held: row?.items ?? [],
        via: row?.via ?? { direct: 0, carried: 0, handed: 0 },
        expiring: row?.expiring ?? 0,
        expired: row?.expired ?? 0,
    };
}

type SortKey = "expiry" | "vendor" | "issued";

export function HolderInventoryPanel({ kind, holderId, accountId, onNavigate }: {
    kind: HolderKind;
    holderId: string;
    accountId?: string;
    /** Without it the panel still reads; it just cannot offer to change anything. */
    onNavigate?: (path: string) => void;
}) {
    const { held, via, expiring, expired } = useHolderInventory(kind, holderId, accountId);
    const back = kind === "driver" ? "drivers" : "assets";

    const [search, setSearch] = useState("");
    const [route, setRoute] = useState<HeldVia | "all">("all");
    const [status, setStatus] = useState<InventoryStatus | "all">("all");
    const [sort, setSort] = useState<SortKey>("expiry");
    const [dir, setDir] = useState<1 | -1>(1);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(8);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = held.filter((h) => {
            if (route !== "all" && h.via !== route) return false;
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
        return [...list].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * dir);
    }, [held, search, route, status, sort, dir]);

    // A filter that empties the page should not leave you on page 4 of nothing.
    useEffect(() => { setPage(0); }, [search, route, status]);

    const paged = rows.slice(page * perPage, page * perPage + perPage);
    const routeTabs: { id: HeldVia | "all"; label: string; count: number }[] = [
        { id: "all", label: "All", count: held.length },
        { id: "direct", label: VIA_LABEL[kind].direct, count: via.direct },
        { id: "carried", label: VIA_LABEL[kind].carried, count: via.carried },
        { id: "handed", label: VIA_LABEL[kind].handed, count: via.handed },
    ];

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
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900">
                        <Boxes size={16} className="text-blue-600" /> Inventory Records
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                        {kind === "driver"
                            ? "Everything this driver is holding — issued to them, riding in their cab, or signed for."
                            : "Everything on this vehicle — kept with it, or carried by whoever drives it."}
                    </p>
                </div>
                {onNavigate && (
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Two different jobs: put something that already exists onto this holder,
                            or create a record for something that has just arrived. */}
                        <button
                            type="button"
                            onClick={() => onNavigate(`/inventory/${back}/${holderId}/assign`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            <ClipboardList size={14} /> Assign existing
                        </button>
                        <button
                            type="button"
                            onClick={() => onNavigate(`/inventory/${back}/${holderId}/add`)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
                        >
                            <Plus size={14} /> Add inventory
                        </button>
                    </div>
                )}
            </div>

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

                {/* How they came to hold it — the same three routes the Inventory tabs use. */}
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2">
                    {routeTabs.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setRoute(t.id)}
                            disabled={t.count === 0 && t.id !== "all"}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-bold transition-colors",
                                route === t.id ? "bg-blue-600 text-white"
                                    : t.count === 0 && t.id !== "all" ? "cursor-not-allowed text-slate-300"
                                    : "text-slate-600 hover:bg-slate-100",
                            )}
                        >
                            {t.label}
                            <span className={cn("text-[11px]", route === t.id ? "text-blue-100" : "text-slate-400")}>{t.count}</span>
                        </button>
                    ))}
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
                        <table className="w-full min-w-[860px] text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50">
                                <tr>
                                    {["Item", "Type", "Serial #", "PIN #", "Issued", "Expires", "Held as", "Status", ""].map((h, i) => (
                                        <th key={h || i} className={cn(
                                            "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500",
                                            i === 8 && "text-right",
                                        )}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.map(({ item, via: route_ }) => {
                                    const days = item.expiryDate ? daysUntil(item.expiryDate) : null;
                                    return (
                                        <tr
                                            key={item.id}
                                            onClick={() => onNavigate?.(`/inventory/items/${item.id}`)}
                                            className={cn("group transition-colors", onNavigate && "cursor-pointer hover:bg-slate-50/70")}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="text-[13px] font-semibold text-slate-800">{itemName(item)}</div>
                                                <div className="text-[11px] text-slate-500">{vendorOf(item)}</div>
                                            </td>
                                            <td className="px-4 py-3 text-[13px] text-slate-600">{categoryOf(item)}</td>
                                            <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{item.serial || "—"}</td>
                                            <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{item.pin || "—"}</td>
                                            <td className="px-4 py-3 text-[13px] text-slate-600">{item.issueDate ? fmtDate(item.issueDate) : "—"}</td>
                                            <td className="px-4 py-3 text-[13px]">
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
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                    VIA_TONE[route_].chip,
                                                )}>
                                                    {route_ === "handed" && <PackageCheck size={9} />}
                                                    {VIA_LABEL[kind][route_]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
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
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
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
