import { Fragment, useEffect, useMemo, useState } from "react";
import {
    Plus, Boxes, Search,
    Truck, IdCard, Pencil, Layers,
    CircleCheck, Clock, AlertTriangle, CircleSlash,
    PackageCheck, Share2, Tag,
    Bell, BellOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    INVENTORY_ITEMS,
    getInventoryForCarrier,
    VENDORS,
    VENDOR_CATEGORIES,
    ACME_DRIVERS,
    CARRIER_NAME,
    itemName,
    itemCategoryId,
    itemTravelsWithDriver,
    handlingLabel,
    HANDLING_ALL_LABEL,
    inventoryMonitoring,
    type InventoryItem,
    type InventoryStatus,
    type VendorCategory,
} from "./inventory.data";
import { MONITOR_BASIS_LABEL } from "@/pages/compliance/monitoring-schedule";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, handoverStatusOf, seedDemoHandovers, type HandoverStatus,
} from "./handovers.data";
import {
    resolveAsset, resolveDriver, itemOnAsset, KIND_TONE, fmtDate,
} from "./inventory-assignment";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { setMessagesFocus, consumePendingRecord, type RecordRef } from "@/pages/messages/messages-store";
import { INVENTORY_TABS } from "./InventoryTabs";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { TablePager } from "./TablePager";
import { FilterChip, ResetFilters, TableGroupBand } from "@/components/ui/ListChrome";
import { VendorCategoriesModal } from "./VendorCategoriesModal";
import { TabScroller } from "@/components/ui/TabScroller";
import { visualFor } from "./inventory-visuals";
import { KpiTile } from "./InventoryKpi";
import { useInventoryAdditions } from "./inventory-store";
import { cn } from "@/lib/utils";

/**
 * Banding the list.
 *
 * `where` is what the old five-chip assignment switch used to do, and more: the switch showed
 * one place at a time, and this shows all four at once, in the order somebody chasing kit
 * cares about — what is out with people first, what is on a shelf last.
 */
type InvGroupBy = "none" | "where" | "status" | "category" | "vendor";
/**
 * The two questions a status cannot answer.
 *
 * Where it is — out on something, or on a shelf — and what kind of thing it is: something
 * a person signs for and gives back, or something bolted to a unit. Chasing a driver who is
 * leaving is the first list; stripping a truck that is going is the second.
 */
type InvAssign = "all" | "assigned" | "unassigned";
type InvHandling = "all" | "returnable" | "removable";

/** Is it on a vehicle, or on nothing. The only question assignment asks. */
const INV_ASSIGN: { id: InvAssign; label: string }[] = [
    { id: "all", label: "All items" },
    { id: "assigned", label: "Assigned" },
    // "Available" rather than "Not assigned": on a list you use to hand kit out, the
    // useful thing about an item on nobody is that you can put it on somebody.
    { id: "unassigned", label: "Available" },
];

/**
 * And if it is on one: does it come back with the driver, or come off the unit.
 *
 * A question ABOUT the vehicle an item is on, which is why it is asked second and only of
 * assigned items. Of something sitting on a shelf it has no answer.
 */
const INV_HANDLING: { id: InvHandling; label: string }[] = [
    { id: "all", label: HANDLING_ALL_LABEL },
    { id: "returnable", label: handlingLabel("driver-returnable") },
    { id: "removable", label: handlingLabel("asset-removable") },
];

// One word each, and the control names itself once. "Assignment" rather than "where it is"
// because that is what the bands say: on a vehicle, with a driver, not assigned.
const INV_GROUPS: { id: InvGroupBy; label: string }[] = [
    { id: "none", label: "Group by" },
    { id: "where", label: "Assignment" },
    { id: "status", label: "Status" },
    { id: "category", label: "Category" },
    { id: "vendor", label: "Vendor" },
];
const STATUS_RANK: Record<InventoryStatus, number> = { "Expired": 0, "Expiring Soon": 1, "Active": 2 };

type Props = {
    onNavigate: (path: string) => void;
    /** Active carrier — inventory list is filtered to this carrier's items. */
    accountId?: string;
    /** Display name for the breadcrumb. Falls back to the legacy ACME label. */
    accountName?: string;
};

// ── Status pill styling ────────────────────────────────────────────────────

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



// ── Helpers ────────────────────────────────────────────────────────────────

// The category id an item resolves to, or null when it maps to no known category (surfaced
// under the "Other" tab). The item's own answer, falling back to its vendor's — see
// `itemCategoryId`, which every list reads so a recategorised item moves everywhere at once.
const categoryIdOf = (item: InventoryItem): string | null => {
    const id = itemCategoryId(item);
    return id && VENDOR_CATEGORIES.some((c) => c.id === id) ? id : null;
};

// Sticky, so the column you are reading still has a name three screens down a long list.
const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn(
        "sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap",
        className,
    )}>
        {children}
    </th>
);
const TD = ({ children, className, onClick }: {
    children?: React.ReactNode;
    className?: string;
    /** Set on cells whose own controls must not also trigger the row's click. */
    onClick?: React.MouseEventHandler<HTMLTableCellElement>;
}) => (
    <td className={cn("px-4 py-3 text-sm whitespace-nowrap align-middle", className)} onClick={onClick}>{children}</td>
);

// ── Page ───────────────────────────────────────────────────────────────────

export function InventoryListPage({ onNavigate, accountId, accountName }: Props) {
    const [search, setSearch] = useState("");
    const [assign, setAssign] = useState<InvAssign>("all");
    const [handling, setHandling] = useState<InvHandling>("all");
    const [activeCat, setActiveCat] = useState<string>("All");
    const [groupBy, setGroupBy] = useState<InvGroupBy>("none");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    // The category catalog, opened from the header. Every number in it is an inventory
    // number — how many items are in each category, and whether one can be deleted without
    // orphaning any — so it belongs on the tab that lists them, not on Vendors.
    const [categories, setCategories] = useState<VendorCategory[]>(VENDOR_CATEGORIES);
    const [categoriesOpen, setCategoriesOpen] = useState(false);

    // The two localStorage overlays on the frozen seed: items added in the app, and edits
    // made to any item. Without the second, saving a change to a seeded row did nothing
    // visible here — the list re-read the module and showed the original values.
    const { additions, applyEdit } = useInventoryAdditions(accountId);

    // Inventory items are scoped to the active carrier, with any inline-added
    // items layered on top. With no `accountId` we fall back to the global
    // INVENTORY_ITEMS list so super-admin first-mount still renders.
    const items = useMemo<InventoryItem[]>(() => {
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS).map(applyEdit);
        return additions.length ? [...additions, ...base] : base;
    }, [accountId, additions, applyEdit]);

    // Item ids currently on some driver's hand-over list (from the Hand Over
    // module) — drives the Handed over / Not handed over switch.
    const { records } = useDriverHandovers(accountId ?? "acct-001");

    // Which driver holds which item, off the same hand-over records. `itemsHandedElsewhere`
    // answers "is it out?"; the Driver column has to say WHO, so the lines are read again
    // here into an item → driver map.
    const handedTo = useMemo(() => {
        const scope = accountId ?? "acct-001";
        const m = new Map<string, { driverId: string; status: HandoverStatus }>();
        for (const rec of Object.values(records)) {
            if (rec.accountId !== scope) continue;
            const status = handoverStatusOf(rec);
            for (const line of rec.lines) m.set(line.itemId, { driverId: rec.driverId, status });
        }
        return m;
    }, [records, accountId]);

    // The demo hand-overs used to be written only when the Hand Over page was opened, so a
    // carrier that came straight here had none — and the Driver column and the
    // "Handed to driver" filter had nothing to show. Seeding is a no-op once the carrier has
    // any record of its own.
    useEffect(() => {
        const scope = accountId ?? "acct-001";
        const roster = (CARRIER_DRIVERS[scope] ?? ACME_DRIVERS)
            .filter((d: any) => d.status === "Active")
            .map((d: any) => ({ id: d.id, name: d.name ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() }));
        seedDemoHandovers(scope, records, roster, items, "Fleet Manager");
    }, [accountId, records, items]);

    // An item being shared into a chat. Null when the dialog is closed.
    const [shareItem, setShareItem] = useState<InventoryItem | null>(null);
    const itemRef = (it: InventoryItem): RecordRef => {
        const vendor = VENDORS.find((v) => v.id === it.vendorId);
        return {
            type: "inventory", id: it.id, label: itemName(it),
            sublabel: [vendor?.companyName || vendor?.name, it.serial].filter(Boolean).join(` · `) || undefined,
            path: "/inventory",
        };
    };
    // Clicking the shared record link in a chat lands here and opens that item.
    useEffect(() => {
        const id = consumePendingRecord("/inventory");
        if (id) onNavigate(`/inventory/items/${id}`);
    }, []);

    // Reset filters when the carrier changes.
    useEffect(() => {
        setSearch("");
        setActiveCat("All");
    }, [accountId]);

    // KPI counts over the full carrier scope (independent of the filters).
    const counts = useMemo(() => {
        let active = 0, expiring = 0, expired = 0, unassigned = 0;
        for (const it of items) {
            if (it.status === "Active") active++;
            else if (it.status === "Expiring Soon") expiring++;
            else if (it.status === "Expired") expired++;
            if (!itemOnAsset(it.assignedTo)) unassigned++;
        }
        return { total: items.length, active, expiring, expired, unassigned };
    }, [items]);

    // The header stays put and shrinks as the list scrolls; the body is its own scroller.
    const { scrollRef, condensed, onScroll } = useCondensingHeader(accountId);
    const kpiChips = useMemo(() => [
        { id: 'total', label: 'Items', value: counts.total, tone: 'text-blue-700' },
        { id: 'active', label: 'Active', value: counts.active, tone: 'text-emerald-700' },
        { id: 'expiring', label: 'Expiring', value: counts.expiring, tone: 'text-amber-700' },
        { id: 'expired', label: 'Expired', value: counts.expired, tone: 'text-rose-700' },
        { id: 'unassigned', label: 'Unassigned', value: counts.unassigned },
    ], [counts]);

    // Status drives the category tabs; search narrows rows. Where an item IS is no longer
    // a filter — it is what the Asset and Driver columns say, and "Group by where it is"
    // bands all four places at once rather than showing one at a time.
    const baseFiltered = useMemo(
        () => items.filter((it) => {
            // Assigned means one thing: it is on a vehicle.
            const on = itemOnAsset(it.assignedTo);
            if (assign === "assigned" && !on) return false;
            if (assign === "unassigned" && on) return false;
            // …and, of the ones that are, which kind. Narrowing to a kind is itself a
            // statement that the item is on something, so it carries the assignment with it
            // rather than leaving you a selection that describes nothing.
            if (handling !== "all" && !on) return false;
            if (handling === "returnable" && !itemTravelsWithDriver(it)) return false;
            if (handling === "removable" && itemTravelsWithDriver(it)) return false;
            return true;
        }),
        [items, assign, handling],
    );

    /**
     * What each chip would find if you pressed it.
     *
     * Each group is counted with the OTHER group's chip already applied, and neither is
     * counted against itself. So with "Available" held down, "Driver returnable 3" means
     * three unassigned returnables — pressing it really does leave you three rows. Counting
     * both off the whole list would promise numbers the list cannot show.
     */
    const whatCounts = useMemo(() => {
        // The assignment chips are counted within the kind you are holding, so pressing one
        // really does leave you that many rows. The kind chips are counted within the
        // ASSIGNED items only, because that is the only set they describe.
        const keepKind = (it: InventoryItem) =>
            handling === "all" ? true
                : handling === "returnable" ? itemTravelsWithDriver(it)
                : !itemTravelsWithDriver(it);

        let kindTotal = 0, assignedIn = 0, assignedTotal = 0, returnableIn = 0;
        for (const it of items) {
            const on = itemOnAsset(it.assignedTo);
            if (keepKind(it)) { kindTotal += 1; if (on) assignedIn += 1; }
            if (on) { assignedTotal += 1; if (itemTravelsWithDriver(it)) returnableIn += 1; }
        }
        return {
            assign: {
                all: kindTotal,
                assigned: assignedIn,
                unassigned: kindTotal - assignedIn,
            } as Record<InvAssign, number>,
            handling: {
                all: assignedTotal,
                returnable: returnableIn,
                removable: assignedTotal - returnableIn,
            } as Record<InvHandling, number>,
        };
    }, [items, assign, handling]);

    const tabs = useMemo(() => {
        const present = VENDOR_CATEGORIES.filter((c) => baseFiltered.some((it) => categoryIdOf(it) === c.id));
        const otherCount = baseFiltered.filter((it) => categoryIdOf(it) === null).length;
        return [
            { id: "All", label: "All", count: baseFiltered.length },
            ...present.map((c) => ({ id: c.id, label: c.name, count: baseFiltered.filter((it) => categoryIdOf(it) === c.id).length })),
            ...(otherCount > 0 ? [{ id: "Other", label: "Other", count: otherCount }] : []),
        ];
    }, [baseFiltered]);

    // Keep the active tab valid if the filters remove its category.
    useEffect(() => {
        if (!tabs.some((t) => t.id === activeCat)) setActiveCat("All");
    }, [tabs, activeCat]);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return baseFiltered
            .filter((it) => {
                if (activeCat === "All") return true;
                if (activeCat === "Other") return categoryIdOf(it) === null;
                return categoryIdOf(it) === activeCat;
            })
            .filter((it) => {
                if (!q) return true;
                const vendor = VENDORS.find((v) => v.id === it.vendorId);
                return (
                    itemName(it).toLowerCase().includes(q) ||
                    (vendor?.name ?? "").toLowerCase().includes(q) ||
                    it.serial.toLowerCase().includes(q) ||
                    it.pin.toLowerCase().includes(q)
                );
            });
    }, [baseFiltered, activeCat, search]);

    /** Which band a row falls in, and where that band sits. */
    const groupOfItem = (it: InventoryItem): { rank: number; label: string } => {
        if (groupBy === "status") return { rank: STATUS_RANK[it.status] ?? 9, label: it.status };
        if (groupBy === "category") {
            const id = categoryIdOf(it);
            return { rank: 0, label: VENDOR_CATEGORIES.find((c) => c.id === id)?.name ?? "Other" };
        }
        if (groupBy === "vendor") {
            const v = VENDORS.find((x) => x.id === it.vendorId);
            return { rank: 0, label: v?.companyName || v?.name || "No vendor" };
        }
        // Assignment, and it has two answers — the SAME two the chips above the table
        // offer, in the same words. Banding the identical split as "On a vehicle" while the
        // chip called it "Assigned" made one question look like two.
        //
        // It used to have four bands, two of which ("Signed across to a driver", "With a
        // driver") described how somebody came to be holding the thing rather than what it
        // is assigned to. Who is carrying it is the Driver column's job.
        return itemOnAsset(it.assignedTo)
            ? { rank: 0, label: "Assigned" }
            : { rank: 1, label: "Available" };
    };

    // Grouped before the page is cut, so a band is never split across two pages.
    const groupedRows = useMemo(() => {
        if (groupBy === "none") return rows;
        return [...rows].sort((a, b) => {
            const ga = groupOfItem(a), gb = groupOfItem(b);
            return ga.rank - gb.rank || ga.label.localeCompare(gb.label);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, groupBy]);

    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === "none") return m;
        for (const it of groupedRows) {
            const label = groupOfItem(it).label;
            m.set(label, (m.get(label) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupedRows, groupBy]);

    // Pagination over the filtered item rows.
    useEffect(() => { setPage(0); }, [search, assign, handling, activeCat, groupBy, accountId]);
    const pageCount = Math.max(1, Math.ceil(groupedRows.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const pagedRows = groupedRows.slice(safePage * perPage, safePage * perPage + perPage);

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* The app's standard list header (see `ListPageHeader`). The section tabs are the
                header's tab row now, so they stay reachable however far down the list you are. */}
            <ListPageHeader
                Icon={Boxes}
                title="Inventory"
                description={<><span className="font-semibold text-slate-700">{accountName ?? CARRIER_NAME}</span> — company inventory across every vendor category.</>}
                count={counts.total}
                countTitle={`${counts.total.toLocaleString()} items`}
                chips={kpiChips}
                condensed={condensed}
                tabsLabel="Inventory sections"
                tabs={INVENTORY_TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
                activeTab="list"
                onTabChange={id => onNavigate(INVENTORY_TABS.find(t => t.id === id)?.path ?? '/inventory')}
                actions={
                    <button
                        onClick={() => setCategoriesOpen(true)}
                        className={cn(
                            "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50",
                            condensed ? "h-8" : "h-9",
                        )}
                    >
                        <Tag size={15} /> Categories
                    </button>
                }
            />

            {/* Body */}
            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn("py-4 sm:py-6", PAGE_PAD)}>
            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                <KpiTile label="Total Items"   value={counts.total}      Icon={Layers}        accent="blue" />
                <KpiTile label="Active"        value={counts.active}     Icon={CircleCheck}   accent="emerald" />
                <KpiTile label="Expiring Soon" value={counts.expiring}   Icon={Clock}         accent="amber" />
                <KpiTile label="Expired"       value={counts.expired}    Icon={AlertTriangle} accent="red" />
                <KpiTile label="Unassigned"    value={counts.unassigned} Icon={CircleSlash}   accent="slate" />
            </div>

            {/* Category-tabbed list */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <CardTabs tabs={tabs} active={activeCat} onChange={setActiveCat} />

                {/* Toolbar */}
                <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
                    <div className="relative min-w-[190px] max-w-xs flex-1">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search item, vendor, number or PIN…"
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button size="sm" onClick={() => onNavigate("/inventory/items/new")}>
                            <Plus size={15} /> Add Inventory
                        </Button>
                    </div>
                </div>

                {/* How the list is narrowed and banded, on a row of its own. On the same
                    line as the search box these broke to a second row at a different width
                    every time; chips left and Group by right is also where the holder panel
                    and the Drivers tab put them.

                    Two questions, so two groups with a rule between them: where it is (out
                    on something, or on a shelf) and what kind of thing it is (comes back
                    with the driver, or comes off the unit). One switch could not answer
                    both, so "which of the unassigned ones come off the truck" had no way
                    to be asked. A status filter would be a fourth way to say "Expired" —
                    the KPI tiles, the category strip and the pill on every row say it. */}
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/40 px-5 py-2">
                    {/* Is it on a vehicle. Dropping to "Available" drops the kind with
                        it: an item on nothing is neither returnable from nor removable
                        off anything. */}
                    {INV_ASSIGN.map((o) => (
                        <FilterChip
                            key={o.id}
                            label={o.label}
                            count={whatCounts.assign[o.id]}
                            on={assign === o.id}
                            always={o.id === "all"}
                            onClick={() => {
                                setAssign(o.id);
                                if (o.id === "unassigned") setHandling("all");
                            }}
                        />
                    ))}
                    <span className="mx-1 h-5 w-px shrink-0 bg-slate-300" aria-hidden />
                    {/* And of the assigned ones, which kind. Picking one says "assigned"
                        as well, because that is the only set it can describe — otherwise
                        the row would sit reading "Available + Driver returnable" over
                        an empty table. */}
                    {INV_HANDLING.map((o) => (
                        <FilterChip
                            key={o.id}
                            label={o.label}
                            count={whatCounts.handling[o.id]}
                            on={handling === o.id}
                            always={o.id === "all"}
                            onClick={() => {
                                setHandling(o.id);
                                if (o.id !== "all" && assign === "unassigned") setAssign("assigned");
                            }}
                        />
                    ))}
                    <select
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value as InvGroupBy)}
                        title="Group the list"
                        className={cn(
                            "ml-auto h-8 shrink-0 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500",
                            groupBy === "none"
                                ? "border-slate-200 bg-white text-slate-600"
                                : "border-blue-300 bg-blue-50/60 text-blue-700",
                        )}
                    >
                        {INV_GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                    </select>
                    {/* Five controls can be left set at once — two chip groups, the category
                        tab, the grouping and the search box. This puts all five back, and is
                        only here while one of them is set. */}
                    <ResetFilters
                        on={assign !== "all" || handling !== "all" || groupBy !== "none"
                            || activeCat !== "All" || search.trim() !== ""}
                        onReset={() => {
                            setAssign("all");
                            setHandling("all");
                            setGroupBy("none");
                            setActiveCat("All");
                            setSearch("");
                        }}
                    />
                </div>

                {rows.length === 0 ? (
                    <div className="border-t border-slate-100 p-12 text-center">
                        <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No inventory items match your filters</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {search.trim()
                                ? <>Nothing matches <span className="font-semibold text-slate-600">{search.trim()}</span> in this view.</>
                                : "Try a different category, or show all items."}
                        </p>
                        {(search.trim() || assign !== "all" || handling !== "all" || activeCat !== "All") && (
                            <button
                                type="button"
                                onClick={() => { setSearch(""); setAssign("all"); setHandling("all"); setActiveCat("All"); }}
                                className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <TH>Item</TH>
                                    <TH className="border-l border-slate-200">Number / PIN</TH>
                                    {/* Two dates, two columns: when it started, and when it runs out.
                                        The alert is a bell beside the expiry it counts back from — a whole
                                        column for it pushed Asset, Driver and Status off the right edge,
                                        and the detail page's Monitoring tab has the full schedule. */}
                                    <TH className="border-l border-slate-200">Issued</TH>
                                    <TH className="border-l border-slate-200">Expires</TH>
                                    <TH className="border-l border-slate-200">Asset</TH>
                                    <TH className="border-l border-slate-200">Driver</TH>
                                    <TH className="border-l border-slate-200">Status</TH>
                                    <TH className="w-px text-right border-l border-slate-200">Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagedRows.map((item, i) => {
                                    const g = groupBy === "none" ? null : groupOfItem(item);
                                    const prev = i === 0 || groupBy === "none" ? null : groupOfItem(pagedRows[i - 1]);
                                    const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                    const visual = visualFor(categoryIdOf(item) ?? "");
                                    const onAsset = resolveAsset(item.assignedTo, accountId);
                                    const withDriver = resolveDriver(item.assignedTo, accountId, handedTo.get(item.id));
                                    return (
                                        <Fragment key={item.id}>
                                        {g && (!prev || prev.label !== g.label) && (
                                            <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={8} />
                                        )}
                                        <tr
                                            // The row opens the item. Reading one used to mean opening the EDITOR,
                                            // which is the wrong default: most of the time you want to look at the
                                            // thing, not change it.
                                            onClick={() => onNavigate(`/inventory/items/${item.id}`)}
                                            tabIndex={0}
                                            role="link"
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault();
                                                    onNavigate(`/inventory/items/${item.id}`);
                                                }
                                            }}
                                            className="group cursor-pointer transition-colors even:bg-slate-50/40 hover:bg-blue-50/50 focus:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40"
                                        >
                                            <TD className="max-w-[22rem]">
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    {/* The category's icon rather than the vendor's initials: "CI" told you
                                                        nothing twelve times over on a list of company-issued kit, while the
                                                        icon says at a glance whether a row is a key, a card or a camera. */}
                                                    <span className={cn(
                                                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                        visual.avatarBg, visual.avatarText,
                                                    )}>
                                                        <visual.icon size={15} />
                                                    </span>
                                                    <div className="min-w-0">
                                                        {/* What the item is called, then who it is from — a carrier
                                                            holding four cards from one vendor tells them apart by
                                                            the first line, not the second. */}
                                                        <div className="truncate text-sm font-semibold leading-tight text-slate-900 group-hover:text-blue-700">{itemName(item)}</div>
                                                        <div className="truncate text-[11px] text-slate-500">{vendor?.companyName || vendor?.name || "—"}</div>
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD className="border-l border-slate-100">
                                                <div className="font-mono text-xs leading-tight text-slate-700">{item.serial}</div>
                                                {item.pin && <div className="font-mono text-[11px] leading-tight text-slate-400">PIN {item.pin}</div>}
                                            </TD>
                                            <TD className="border-l border-slate-100">
                                                <div className="text-xs leading-tight text-slate-600">{fmtDate(item.issueDate)}</div>
                                            </TD>
                                            {/* An item with no expiry is not missing one — a yard key never runs out.
                                                Where there IS one, the bell says whether anybody gets told: a date with
                                                a muted bell is the row that will quietly lapse. */}
                                            <TD className="border-l border-slate-100">
                                                <div className="flex items-center gap-1 text-xs leading-tight text-slate-600">
                                                    {item.expiryDate ? (
                                                        <>
                                                            <span>{fmtDate(item.expiryDate)}</span>
                                                            {(() => {
                                                                const mon = inventoryMonitoring(item);
                                                                const days = [...mon.reminders].sort((a, b) => b - a);
                                                                return mon.enabled ? (
                                                                    <span
                                                                        className="inline-flex shrink-0"
                                                                        title={`Alert on ${MONITOR_BASIS_LABEL[mon.basis].toLowerCase()}${days.length ? ` · remind ${days.map((d) => (d === 0 ? "on the day" : `${d}d`)).join(", ")}` : ""}`}
                                                                    >
                                                                        <Bell size={11} className="text-emerald-500" aria-label="Alert set" />
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex shrink-0" title="No alert set">
                                                                        <BellOff size={11} className="text-slate-300" aria-label="No alert set" />
                                                                    </span>
                                                                );
                                                            })()}
                                                        </>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400">no expiry</span>
                                                    )}
                                                </div>
                                            </TD>
                                            {/* The vehicle — blank when the item is on a person, or on nobody. */}
                                            <TD className="border-l border-slate-100">
                                                {onAsset ? (
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider shrink-0",
                                                            KIND_TONE[onAsset.tone]
                                                        )}>
                                                            <Truck size={10} /> {onAsset.kindLabel}
                                                        </span>
                                                        <div className="min-w-0 leading-tight">
                                                            <div className="text-sm font-semibold text-slate-900 truncate">{onAsset.label}</div>
                                                            <div className="text-[11px] text-slate-500 truncate">{onAsset.sub}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </TD>
                                            {/* The person — assigned to them, driving the vehicle it is on, or
                                                holding it on a signed hand-over. */}
                                            <TD className="border-l border-slate-100">
                                                {withDriver ? (
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider shrink-0",
                                                            withDriver.via === "handed" ? KIND_TONE.violet : KIND_TONE.emerald
                                                        )}>
                                                            {withDriver.via === "handed" ? <PackageCheck size={10} /> : <IdCard size={10} />}
                                                            {withDriver.via === "handed" ? "Handed" : "Driver"}
                                                        </span>
                                                        <div className="min-w-0 leading-tight">
                                                            <div className="text-sm font-semibold text-slate-900 truncate">{withDriver.label}</div>
                                                            <div className="text-[11px] text-slate-500 truncate">{withDriver.sub}</div>
                                                        </div>
                                                    </div>
                                                ) : !onAsset ? (
                                                    // Nobody and nothing — said once, in the column where a holder would be.
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                                                        Unassigned
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-300">—</span>
                                                )}
                                            </TD>
                                            <TD className="border-l border-slate-100">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                    STATUS_BADGE[item.status]
                                                )}>
                                                    <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[item.status])} />
                                                    {item.status}
                                                </span>
                                            </TD>
                                            {/* The row opens the item, so every control in here stops the click
                                                reaching it — otherwise Edit would open the item and then the editor. */}
                                            <TD className="w-px border-l border-slate-100 text-right" onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => onNavigate(`/inventory/items/${item.id}/edit`)}
                                                        title="Edit"
                                                        aria-label="Edit"
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    {/* Everything past editing goes behind the three dots, the way it does on
                                                        Tickets and the compliance records — one overflow menu per row rather
                                                        than a widening strip of icons. */}
                                                    <KebabMenu items={[
                                                        { label: "Share to chat", icon: Share2, onClick: () => setShareItem(item) },
                                                    ]} />
                                                </div>
                                            </TD>
                                        </tr>
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <TablePager
                        page={safePage}
                        perPage={perPage}
                        total={rows.length}
                        label="items"
                        onPage={setPage}
                        onPerPage={(n) => { setPerPage(n); setPage(0); }}
                    />
                    </div>
                )}
            </div>
            </div>
            </div>

            <VendorCategoriesModal
                open={categoriesOpen}
                onClose={() => setCategoriesOpen(false)}
                categories={categories}
                items={items}
                onCategoriesChange={setCategories}
            />

            {shareItem && (
                <ShareToChat
                    open
                    onClose={() => setShareItem(null)}
                    title={`Share ${itemName(shareItem)}`}
                    subtitle="Send the item in a chat, or to an outsider by email"
                    source={{ type: "manual", id: shareItem.id, label: itemName(shareItem) }}
                    items={[]}
                    record={itemRef(shareItem)}
                    defaultChannel="in-app"
                    defaultSubject={itemName(shareItem)}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}
        </div>
    );
}

// ── Category sub-tabs (carrier-compliance style) ───────────────────────────

function CardTabs<T extends string>({ tabs, active, onChange }: {
    tabs: { id: T; label: string; count: number }[];
    active: T;
    onChange: (t: T) => void;
}) {
    return (
        // The same rail as the driver and asset pages: chevrons only while there is more
        // that way, a fade so cut-off tabs look cut off, and the active tab scrolled into
        // view when it changes. Twelve categories do not fit, and `no-scrollbar` hid the
        // only thing that used to say so — the row just stopped mid-word at "Safe".
        <div className="border-b border-slate-200 bg-slate-50/40 px-5">
            <TabScroller ariaLabel="Inventory categories" activeKey={active}>
                {tabs.map((t) => {
                    const isActive = active === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
                            data-tab-active={isActive || undefined}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold whitespace-nowrap border-b-2 transition-colors",
                                isActive
                                    ? "text-blue-600 border-blue-600"
                                    : "text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300",
                            )}
                        >
                            {t.label}
                            <span className={cn(
                                "inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                                isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200/70 text-slate-600",
                            )}>
                                {t.count}
                            </span>
                        </button>
                    );
                })}
            </TabScroller>
        </div>
    );
}

