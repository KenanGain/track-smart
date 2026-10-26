// ─────────────────────────────────────────────────────────────────────────────
// VendorsTable — the vendor list itself: figures, filters, search, rows, paging.
//
// Lifted out of VendorsListPage so Maintenance can show the same list. A fleet has
// one set of vendors — the shop that does the brake job is the same record the
// inventory module files a fuel card against — so the two places that show them
// must not be two tables that drift. The page around it (header, title, actions)
// stays with each host; this is only the list.
//
// It is built from the shared list furniture (`ListChrome`): KPI cards, the toolbar with
// its filters, grouping and column picker, pinned headings, one pager. Given a `frame`, it
// fills its host's body the way every full-page list does — the cards scroll up and away,
// then the rows scroll under their headings (`ListScrollFrame`).
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState, type Ref, type UIEventHandler } from "react";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, useTableSort,
    type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { chipsFromStats, useHeaderChips } from "@/components/ui/list-header-bridge";
import {
    Mail, Phone, MapPin, Store, CircleCheck, CircleSlash, Share2, Pencil, Trash2,
} from "lucide-react";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { VendorFormDialog } from "./VendorFormDialog";
import { vendorsStore } from "@/data/vendorsStore";
import { TablePager } from "./TablePager";
import { TD, RowIcon, EmptyRow } from "@/components/ui/CatalogTable";
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

/** What this list can be banded by — the facts a vendor row actually carries. */
type VendorGroup = 'none' | 'status' | 'jurisdiction' | 'country';
const VENDOR_GROUPS: { id: VendorGroup; label: string }[] = [
    { id: 'none', label: 'No grouping' },
    { id: 'status', label: 'Group: Status' },
    { id: 'jurisdiction', label: 'Group: State / province' },
    { id: 'country', label: 'Group: Country' },
];
const CONTACT_OPTIONS = ['Email on file', 'Phone only', 'No contact'];
const contactOf = (v: Vendor) => (v.email ? 'Email on file' : v.phone ? 'Phone only' : 'No contact');

export function VendorsTable({ vendors, accountId, onOpen, className, frame }: {
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
    /**
     * Fill the host's body: the KPI cards scroll up and away, then the rows scroll in their
     * own box under pinned headings. `scrollRef` / `onScroll` are for a condensing header.
     */
    frame?: { scrollRef?: Ref<HTMLDivElement>; onScroll?: UIEventHandler<HTMLDivElement> };
}) {
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<"all" | "Active" | "Inactive">("all");
    const [jurisdiction, setJurisdiction] = useState("");
    const [contact, setContact] = useState("");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const [filtersOpen, setFiltersOpen] = useState(false);
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
    const stats: KpiStat[] = [
        { id: "all", label: "Total vendors", value: counts.total, Icon: Store, accent: "blue" },
        { id: "Active", label: "Active", value: counts.active, Icon: CircleCheck, accent: "emerald" },
        { id: "Inactive", label: "Inactive", value: counts.inactive, Icon: CircleSlash, accent: "slate" },
    ];
    const jurisdictionOf = (v: Vendor) => v.address?.state || '';
    const jurisdictionOptions = useMemo(
        () => [...new Set(vendors.map(jurisdictionOf).filter(Boolean))].sort(),
        [vendors],
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return vendors.filter((v) => {
            if (status !== "all" && (v.status === "Active" ? "Active" : "Inactive") !== status) return false;
            if (jurisdiction && jurisdictionOf(v) !== jurisdiction) return false;
            if (contact && contactOf(v) !== contact) return false;
            if (!q) return true;
            return (
                v.name.toLowerCase().includes(q) ||
                (v.companyName ?? "").toLowerCase().includes(q) ||
                (v.email ?? "").toLowerCase().includes(q) ||
                (v.phone ?? "").toLowerCase().includes(q) ||
                formatVendorAddress(v.address).toLowerCase().includes(q)
            );
        });
    }, [vendors, search, status, jurisdiction, contact]);

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
                : groupBy === 'country' ? (v.address?.country || 'No address')
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
    useEffect(() => { setPage(0); }, [vendors, search, status, jurisdiction, contact, groupBy]);

    const pageCount = Math.max(1, Math.ceil(banded.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const paged = banded.slice(safePage * perPage, safePage * perPage + perPage);

    const filterCount = [status !== "all", !!jurisdiction, !!contact, groupBy !== 'none'].filter(Boolean).length;
    const filtering = search.trim() !== "" || filterCount > 0;
    const clear = () => { setSearch(""); setStatus("all"); setJurisdiction(""); setContact(""); setGroupBy('none'); };

    const pickStatus = (id: string) => setStatus(id as "all" | "Active" | "Inactive");
    const kpis = <KpiStatRow stats={stats} activeId={status} onPick={pickStatus} />;
    // The same figures, for the page header to show once the cards have scrolled away.
    useHeaderChips(chipsFromStats(stats, status, pickStatus));
    const columnPicker = <ColumnPicker columns={VENDOR_COLUMNS} visible={visibleCols} onToggle={toggleCol} />;

    // No category filter: a vendor's category is an inventory concept — it is what an ITEM
    // filed against the vendor is, not what the vendor is — and filtering this list by it put
    // "Keys & Access" on a company that issues keys.
    const toolbar = (
        <ListToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search vendor, contact or address…"
            filters={<div className={mobileFold(filtersOpen)}>
                <FilterSelect value={status === "all" ? "" : status} onChange={(v) => setStatus((v || "all") as "all" | "Active" | "Inactive")} title="Status" allLabel="All statuses" options={["Active", "Inactive"]} />
                {jurisdictionOptions.length > 0 && (
                    <FilterSelect value={jurisdiction} onChange={setJurisdiction} title="State / province" allLabel="All states" options={jurisdictionOptions} />
                )}
                <FilterSelect value={contact} onChange={setContact} title="Contact on file" allLabel="Any contact" options={CONTACT_OPTIONS} />
            </div>}
            filtersExtra={<>
                <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                <div className={mobileFold(filtersOpen)}>
                    <GroupBySelect value={groupBy} onChange={setGroupBy} options={VENDOR_GROUPS} />
                    <ResetFilters on={filtering} onReset={clear} />
                </div>
            </>}
            // In the frame the picker sits on the list line above, so this row stays one row.
            columns={frame ? undefined : columnPicker}
        />
    );

    const table = (
        <table className="w-full min-w-[920px] table-fixed">
            <thead>
                <tr>
                    <SortTh col="vendor" label="Vendor" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                    {showCol('address') && <SortTh col="address" label="Address" sortable sort={sort} onSort={onSort} className={cn("w-[236px]", PIN_TH)} />}
                    {showCol('contact') && <SortTh col="contact" label="Contact" sortable sort={sort} onSort={onSort} className={cn("w-[236px]", PIN_TH)} />}
                    {showCol('status') && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={cn("w-[118px]", PIN_TH)} />}
                    <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
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
                            "group transition-colors hover:bg-slate-50",
                            onOpen && "cursor-pointer focus:bg-slate-50 focus:outline-none",
                        )}
                    >
                        <TD className="py-2.5">
                            <div className="flex min-w-0 items-center gap-3" title={[v.name, v.companyName].filter(Boolean).join(" — ")}>
                                <RowIcon Icon={Store} tone="blue" />
                                <span className="min-w-0 truncate">
                                    <span className="font-semibold text-slate-900">{v.name}</span>
                                    {v.companyName && v.companyName !== v.name && <span className="text-xs text-slate-500"> · {v.companyName}</span>}
                                </span>
                            </div>
                        </TD>
                        {showCol('address') && (
                        <TD className="py-2.5">
                            {v.address && formatVendorAddress(v.address) ? (
                                <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-600" title={formatVendorAddress(v.address)}>
                                    <MapPin size={13} className="shrink-0 text-slate-400" />
                                    <span className="truncate">{formatVendorAddress(v.address)}</span>
                                </div>
                            ) : (
                                <span className="text-sm text-slate-400">—</span>
                            )}
                        </TD>
                        )}
                        {showCol('contact') && (
                        <TD className="py-2.5">
                            {v.email || v.phone ? (
                                <div className="flex min-w-0 items-center gap-1.5 text-sm text-slate-600" title={[v.email, v.phone].filter(Boolean).join(" · ")}>
                                    {v.email ? <Mail size={12} className="shrink-0 text-slate-400" /> : <Phone size={12} className="shrink-0 text-slate-400" />}
                                    <span className="truncate">{v.email ?? v.phone}{v.email && v.phone && <span className="text-slate-400"> · {v.phone}</span>}</span>
                                </div>
                            ) : <span className="text-sm text-slate-400">—</span>}
                        </TD>
                        )}
                        {showCol('status') && (
                        <TD className="py-2.5">
                            <span className={cn(
                                "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
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
                        <TD className={cn("py-2.5", PIN_TD_ACTIONS)} onClick={(e) => e.stopPropagation()}>
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
    );

    const pager = (
        <TablePager
            page={safePage}
            perPage={perPage}
            total={filtered.length}
            label="vendors"
            onPage={setPage}
            onPerPage={(n) => { setPerPage(n); setPage(0); }}
        />
    );

    const dialogs = (
        <>
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
        </>
    );

    if (frame) {
        return (
            <>
                <ListScrollFrame above={kpis} toolbar={toolbar} footer={pager}
                    title="Vendor list" count={filtered.length} total={vendors.length}
                    description="Every shop and supplier this carrier buys from — click a row to open its profile."
                    actions={columnPicker}
                    scrollRef={frame.scrollRef} onScroll={frame.onScroll}
                    contentKey={`${filtersOpen}|${paged.length}`}>
                    {table}
                </ListScrollFrame>
                {dialogs}
            </>
        );
    }

    return (
        <div className={cn("space-y-5", className)}>
            {kpis}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {toolbar}
                <div className="overflow-x-auto">{table}</div>
                {pager}
            </div>
            {dialogs}
        </div>
    );
}
