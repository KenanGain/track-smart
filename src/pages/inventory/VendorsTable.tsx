// ─────────────────────────────────────────────────────────────────────────────
// VendorsTable — the vendor list itself: figures, categories, search, rows, paging.
//
// Lifted out of VendorsListPage so Maintenance can show the same list. A fleet has
// one set of vendors — the shop that does the brake job is the same record the
// inventory module files a fuel card against — so the two places that show them
// must not be two tables that drift. The page around it (header, title, actions)
// stays with each host; this is only the list.
//
// It is built from the same pieces as the Inventory list (`CatalogTable`): KPI tiles,
// a search row, ruled columns, one pager.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from "react";
import {
    ColumnPicker, SortTh, TableGroupBand, useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import {
    Mail, Phone, MapPin, Store, CircleCheck, CircleSlash, Search, Share2, Pencil, Trash2,
} from "lucide-react";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { VendorFormDialog } from "./VendorFormDialog";
import { vendorsStore } from "@/data/vendorsStore";
import { KpiTile } from "./InventoryKpi";
import { TablePager } from "./TablePager";
import { TH, TD, COL_RULE, RowIcon, EmptyRow } from "@/components/ui/CatalogTable";
import { formatVendorAddress, type Vendor } from "./inventory.data";
import { cn } from "@/lib/utils";

/**
 * The columns a reader can turn off, and the two they cannot.
 *
 * The name is what identifies the row and the menu is what acts on it; a list without
 * either is a list of anonymous rows nobody can do anything with. `locked` says so in the
 * picker rather than silently omitting them.
 */
type VendorCol = 'vendor' | 'address' | 'contact' | 'status' | 'actions';
const VENDOR_COLUMNS: PickerColumn<VendorCol>[] = [
    { id: 'vendor', label: 'Vendor', locked: true },
    { id: 'address', label: 'Address' },
    { id: 'contact', label: 'Contact' },
    { id: 'status', label: 'Status' },
    { id: 'actions', label: 'Actions', locked: true },
];

/** What this list can be banded by — the two facts a vendor row actually carries. */
type VendorGroup = 'none' | 'status' | 'jurisdiction';
const VENDOR_GROUPS: { id: VendorGroup; label: string }[] = [
    { id: 'none', label: 'Group by' },
    { id: 'status', label: 'Status' },
    { id: 'jurisdiction', label: 'Jurisdiction' },
];

export function VendorsTable({ vendors, accountId, onOpen, className }: {
    /** Already scoped to the carrier by whoever is showing it. */
    vendors: Vendor[];
    /** Tags a vendor added from here, so it lands in this carrier’s list. */
    accountId?: string;
    /**
     * Open one — a vendor is a thing you go into, not a row you read.
     *
     * The row holds a name, an address and a phone number; what anybody actually wants to
     * know about a shop is what it has done and what it has cost, and that is four
     * modules away. Where the host cannot show a page, the rows stay plain rather than
     * looking clickable and doing nothing.
     */
    onOpen?: (vendor: Vendor) => void;
    className?: string;
}) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | "Active" | "Inactive">("all");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    /*
     * The name and the row's own menu are locked on.
     *
     * A list whose first column can be switched off is a list of anonymous rows, and one
     * whose actions can be switched off has rows nobody can act on. Everything between
     * them is the reader's to choose.
     */
    const [visibleCols, setVisibleCols] = useState<Set<VendorCol>>(
        () => new Set(VENDOR_COLUMNS.map((c) => c.id)));
    const toggleCol = (id: VendorCol) => setVisibleCols((prev) => {
        const n = new Set(prev);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });
    const showCol = (id: VendorCol) => visibleCols.has(id);
    /** The band and the empty row have to span whatever is currently on screen. */
    const colCount = VENDOR_COLUMNS.filter((c) => c.locked || visibleCols.has(c.id)).length;
    const [groupBy, setGroupBy] = useState<VendorGroup>('none');
    // The row actions. Editing and deleting go through `vendorsStore`, so every list
    // reading the store — here, Settings, the work-order picker — agrees on the next render.
    const [editing, setEditing] = useState<Vendor | null>(null);
    const [toDelete, setToDelete] = useState<Vendor | null>(null);
    const [sharing, setSharing] = useState<Vendor | null>(null);

    const counts = useMemo(() => ({
        total: vendors.length,
        active: vendors.filter((v) => v.status === "Active").length,
        inactive: vendors.filter((v) => v.status !== "Active").length,
    }), [vendors]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return vendors.filter((v) => {
            if (status !== "all" && (v.status === "Active" ? "Active" : "Inactive") !== status) return false;
            if (!q) return true;
            return (
                v.name.toLowerCase().includes(q) ||
                (v.companyName ?? "").toLowerCase().includes(q) ||
                (v.email ?? "").toLowerCase().includes(q) ||
                (v.phone ?? "").toLowerCase().includes(q) ||
                formatVendorAddress(v.address).toLowerCase().includes(q)
            );
        });
    }, [vendors, search, status]);

    /*
     * What each column sorts by — the value, not the markup.
     *
     * Status sorts Active before Inactive rather than alphabetically, because the question
     * a reader asks of this column is "who is live", not "which word comes first".
     */
    const { sort, onSort, sorted } = useTableSort<VendorCol, Vendor>(filtered, {
        vendor: (v) => v.name,
        address: (v) => formatVendorAddress(v.address),
        contact: (v) => v.email ?? v.phone ?? '',
        status: (v) => (v.status === 'Active' ? 0 : 1),
    });

    /** The band a grouped list is split by, and the order the bands come in. */
    const bandOf = (v: Vendor) =>
        groupBy === 'status' ? (v.status === 'Active' ? 'Active' : 'Inactive')
            : groupBy === 'jurisdiction' ? (v.address?.state || v.address?.country || 'No address')
                : '';
    const banded = useMemo(() => {
        if (groupBy === 'none') return sorted;
        return [...sorted].sort((a, b) => bandOf(a).localeCompare(bandOf(b)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sorted, groupBy]);
    const bandCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy !== 'none') for (const v of banded) m.set(bandOf(v), (m.get(bandOf(v)) ?? 0) + 1);
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [banded, groupBy]);

    // A different carrier, a narrower filter — either way page 7 is nowhere.
    useEffect(() => { setPage(0); }, [vendors, search, status, groupBy]);

    const pageCount = Math.max(1, Math.ceil(banded.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const paged = banded.slice(safePage * perPage, safePage * perPage + perPage);

    const filtering = search.trim() !== "" || status !== "all" || groupBy !== 'none';
    const clear = () => { setSearch(""); setStatus("all"); setGroupBy('none'); };

    return (
        <div className={cn("space-y-5", className)}>
            {/* The figures, and the filter for each of them. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiTile label="Total Vendors" value={counts.total} Icon={Store} accent="blue"
                    onClick={() => setStatus("all")} active={status === "all"} />
                <KpiTile label="Active" value={counts.active} Icon={CircleCheck} accent="emerald"
                    onClick={() => setStatus("Active")} active={status === "Active"} />
                <KpiTile label="Inactive" value={counts.inactive} Icon={CircleSlash} accent="slate"
                    onClick={() => setStatus("Inactive")} active={status === "Inactive"} />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* No category strip: a vendor's category is an inventory concept — it is what
                    an ITEM filed against the vendor is, not what the vendor is — and tabbing
                    this list by it put "Keys & Access" on a company that issues keys. */}
                <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                    <div className="relative min-w-[190px] max-w-xs flex-1">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search vendor, contact or address…"
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as VendorGroup)}
                        title="Band the list"
                        className={cn(
                            'h-9 shrink-0 rounded-lg border px-2.5 text-[13px] font-semibold outline-none focus:border-blue-500',
                            groupBy === 'none'
                                ? 'border-slate-200 bg-white text-slate-600'
                                : 'border-blue-300 bg-blue-50/60 text-blue-700',
                        )}
                    >
                        {VENDOR_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                    <ColumnPicker columns={VENDOR_COLUMNS} visible={visibleCols} onToggle={toggleCol} />
                    {filtering && (
                        <button
                            type="button"
                            onClick={clear}
                            className="ml-auto inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <SortTh col="vendor" label="Vendor" sortable sort={sort} onSort={onSort} />
                                    {showCol('address') && <SortTh col="address" label="Address" sortable sort={sort} onSort={onSort} className={COL_RULE} />}
                                    {showCol('contact') && <SortTh col="contact" label="Contact" sortable sort={sort} onSort={onSort} className={COL_RULE} />}
                                    {showCol('status') && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={COL_RULE} />}
                                    <TH className={cn("sticky right-0 z-20 w-[92px] border-l border-slate-200 bg-slate-50 pl-4 pr-5 text-right", COL_RULE)}>Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paged.length === 0 && (
                                    <EmptyRow
                                        colSpan={colCount}
                                        Icon={Store}
                                        title="No vendors match your filters"
                                        hint={search.trim()
                                            ? <>Nothing matches <span className="font-semibold text-slate-600">{search.trim()}</span> in this view.</>
                                            : "Try another status, or show them all."}
                                        onClear={filtering ? clear : undefined}
                                    />
                                )}
                                {paged.map((v, i) => (
                                    <Fragment key={v.id}>
                                    {groupBy !== 'none' && (i === 0 || bandOf(paged[i - 1]) !== bandOf(v)) && (
                                        <TableGroupBand label={bandOf(v)} count={bandCounts.get(bandOf(v)) ?? 0} colSpan={colCount} />
                                    )}
                                    <tr
                                        onClick={onOpen ? () => onOpen(v) : undefined}
                                        onKeyDown={onOpen ? (e) => { if (e.key === "Enter") onOpen(v); } : undefined}
                                        tabIndex={onOpen ? 0 : undefined}
                                        role={onOpen ? "link" : undefined}
                                        className={cn(
                                            "transition-colors hover:bg-slate-50/60",
                                            onOpen && "cursor-pointer focus:bg-slate-50 focus:outline-none",
                                        )}
                                    >
                                        <TD>
                                            <div className="flex items-center gap-3">
                                                <RowIcon Icon={Store} tone="blue" />
                                                <div className="min-w-0">
                                                    <div className="truncate font-semibold text-slate-900">{v.name}</div>
                                                    {v.companyName && <div className="truncate text-xs text-slate-500">{v.companyName}</div>}
                                                </div>
                                            </div>
                                        </TD>
                                        {showCol('address') && (
                                        <TD className={COL_RULE}>
                                            {v.address && formatVendorAddress(v.address) ? (
                                                <div className="flex max-w-xs items-start gap-1.5 text-sm text-slate-600">
                                                    <MapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                                                    <span className="leading-snug">
                                                        {[v.address.street, v.address.apt].filter(Boolean).join(", ")}
                                                        {(v.address.city || v.address.state) && (
                                                            <>
                                                                <br />
                                                                {[v.address.city, v.address.state].filter(Boolean).join(", ")} {v.address.zip ?? ""}
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </TD>
                                        )}
                                        {showCol('contact') && (
                                        <TD className={COL_RULE}>
                                            {v.email && (
                                                <div className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                                                    <Mail size={12} className="text-slate-400" /> {v.email}
                                                </div>
                                            )}
                                            {v.phone && (
                                                <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-slate-500">
                                                    <Phone size={12} className="text-slate-400" /> {v.phone}
                                                </div>
                                            )}
                                            {!v.email && !v.phone && <span className="text-sm text-slate-400">—</span>}
                                        </TD>
                                        )}
                                        {showCol('status') && (
                                        <TD className={COL_RULE}>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                v.status === "Active"
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-slate-100 text-slate-500",
                                            )}>
                                                <span className={cn(
                                                    "mr-1.5 h-1.5 w-1.5 rounded-full",
                                                    v.status === "Active" ? "bg-emerald-500" : "bg-slate-400",
                                                )} />
                                                {v.status}
                                            </span>
                                        </TD>
                                        )}
                                        {/* The menu does its own thing without opening the page
                                            behind it — a row that is a link still has cells that
                                            are not. */}
                                        <TD className={cn("sticky right-0 z-10 w-[92px] border-l border-slate-200 bg-white pl-4 pr-5 text-right group-hover:bg-slate-50/60", COL_RULE)} onClick={(e) => e.stopPropagation()}>
                                            {/* The same three verbs the service-type list offers. */}
                                            <div className="flex items-center justify-end">
                                                <KebabMenu
                                                    title={`Actions for ${v.name}`}
                                                    items={[
                                                        { label: "Share to chat", icon: Share2, onClick: () => setSharing(v) },
                                                        { label: "Edit", icon: Pencil, onClick: () => setEditing(v) },
                                                        { label: "Delete", icon: Trash2, danger: true, onClick: () => setToDelete(v) },
                                                    ]}
                                                />
                                            </div>
                                        </TD>
                                    </tr>
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <TablePager
                        page={safePage}
                        perPage={perPage}
                        total={filtered.length}
                        label="vendors"
                        onPage={setPage}
                        onPerPage={(n) => { setPerPage(n); setPage(0); }}
                    />
                </div>
            </div>

            {/* Edit opens the one vendor form the app has — the same one Settings uses. */}
            <VendorFormDialog
                open={!!editing}
                vendor={editing}
                accountId={accountId}
                onClose={() => setEditing(null)}
            />

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share ${sharing.name}`}
                    subtitle="A vendor record, in a chat or by email"
                    source={{ type: "manual", id: sharing.id, label: sharing.name }}
                    items={[
                        { name: sharing.companyName || sharing.name, group: "Vendor" },
                        ...(sharing.email ? [{ name: sharing.email, group: "Email" }] : []),
                        ...(sharing.phone ? [{ name: sharing.phone, group: "Phone" }] : []),
                        ...(formatVendorAddress(sharing.address)
                            ? [{ name: formatVendorAddress(sharing.address), group: "Address" }] : []),
                    ]}
                    defaultChannel="in-app"
                    defaultSubject={`${sharing.name} — vendor`}
                />
            )}

            {/* Deleting takes the vendor out of every picker, so it is asked for rather
                than taken on one click of a small icon. */}
            <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>Delete “{toDelete?.name}”?</DialogTitle>
                        <DialogDescription>
                            It will stop appearing when anyone raises a work order or files inventory
                            against a vendor. Records that already name it are not changed.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setToDelete(null)}>Cancel</Button>
                        <Button
                            onClick={() => { if (toDelete) vendorsStore.remove(toDelete.id); setToDelete(null); }}
                            className="bg-red-600 text-white hover:bg-red-700"
                        >
                            Delete vendor
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
