// ─────────────────────────────────────────────────────────────────────────────
// Inventory ▸ Drivers and Inventory ▸ Assets.
//
// One component behind both tabs. The question is identical — "what is this holder
// holding" — and only the roster and two columns differ, so building them twice
// would mean maintaining the same table in two files and letting them drift.
//
// A row expands in place rather than navigating: you are comparing holders, and
// opening one to see its five items should not throw away the list you were
// reading. Each item inside still links to the item's own page.
// ─────────────────────────────────────────────────────────────────────────────

import { Fragment, useEffect, useMemo, useState } from "react";
import {
    Search, Truck, IdCard, Layers, AlertTriangle, Clock,
    BellOff, PackageCheck, CircleSlash, UserRound, ClipboardList, Share2, ExternalLink,
} from "lucide-react";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, ACME_DRIVERS, CARRIER_NAME,
    itemName, type InventoryItem,
} from "./inventory.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, handoverStatusOf, seedDemoHandovers, type HandoverStatus,
} from "./handovers.data";
import { KIND_TONE } from "./inventory-assignment";
import {
    rollupByDriver, rollupByAsset, rollupTotals,
    VIA_LABEL, VIA_TONE, type HeldVia, type HolderKind, type HolderRow,
} from "./inventory-rollup";
import {
    ColumnPicker, FilterChip, ResetFilters, TableGroupBand, type PickerColumn,
} from "@/components/ui/ListChrome";
import { useDriverDqFiles } from "@/pages/dq-files/dq-driver-files.data";
import { DQ_DRIVER_TYPES, type DqDriverTypeId } from "@/pages/settings/settings-dq-checklists.data";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { setMessagesFocus, type RecordRef } from "@/pages/messages/messages-store";
import { INVENTORY_TABS } from "./InventoryTabs";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { TablePager } from "./TablePager";
import { KpiTile } from "./InventoryKpi";
import { useInventoryAdditions } from "./inventory-store";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
    kind: HolderKind;
    accountId?: string;
    accountName?: string;
};

/**
 * What the list is narrowed to. Every one of these is a tile you can click.
 *
 * Driver-returnable and asset-removable are NOT here: that is a question about an item,
 * and this is a list of the things holding them. A truck with a fuel card and a reefer
 * sensor answers both, so filtering by it barely narrows anything — the item lists are
 * where that question belongs, and both of them ask it.
 */
type LoadFilter = "all" | "with" | "without" | "expiring" | "expired";

/**
 * Which DQ file the driver runs on: Cross Border, US Only, Canada Only.
 *
 * Read off the DQ layer rather than re-derived here — it already owns this question, it
 * already stores the per-driver override, and a second opinion about the same driver is
 * how two screens start disagreeing. "all" is this list's own word for no filter.
 */
type DqFilter = DqDriverTypeId | "all";

/** How the table is banded. `dq` is a driver question and is hidden on the Assets tab. */
type HolderGroupBy = "none" | "dq" | "status" | "load";

// The select is already labelled by its first option, so the rest are the dimension and
// nothing else. "Jurisdiction" is what the bands underneath actually read — Cross Border,
// US Only, Canada Only — where "driver type" would have you expecting Long Haul and Local.
const HOLDER_GROUPS: { id: HolderGroupBy; label: string; driverOnly?: boolean }[] = [
    { id: "none", label: "Group by" },
    { id: "dq", label: "Jurisdiction", driverOnly: true },
    { id: "status", label: "Status" },
    { id: "load", label: "Holdings" },
];

// The same three colours the DQ Files list gives these, so a cross-border driver looks
// like a cross-border driver on both screens.
const DQ_TONE: Record<DqDriverTypeId, string> = {
    cross_border: "bg-violet-50 text-violet-700 border-violet-200",
    us_only: "bg-blue-50 text-blue-700 border-blue-200",
    canada_only: "bg-rose-50 text-rose-700 border-rose-200",
};

const TONE_BADGE: Record<HolderRow["statusTone"], string> = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
};
const TONE_DOT: Record<HolderRow["statusTone"], string> = {
    emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500", slate: "bg-slate-400",
};

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn(
        "sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap",
        className,
    )}>{children}</th>
);
const TD = ({ children, className, onClick }: {
    children?: React.ReactNode;
    className?: string;
    /** Set on cells whose own controls must not also toggle the row open. */
    onClick?: React.MouseEventHandler<HTMLTableCellElement>;
}) => (
    <td className={cn("px-4 py-3 align-middle text-sm whitespace-nowrap", className)} onClick={onClick}>{children}</td>
);

/**
 * The columns a reader can turn on and off.
 *
 * The three health counts — expiring, expired, no alert — are OFF by default. They are a
 * property of each ITEM, and summing them onto a holder flattens the thing you actually need
 * to know: "1 expired" reads the same whether the driver holds one card or eleven, and does
 * not say WHICH. The expanded row now flags each item, so the counts are here for anyone who
 * wants to sort a fleet by them rather than as the default answer.
 */
type ColId = "holder" | "context" | "dq" | "items" | "returnable" | "removable"
    | "expiring" | "expired" | "unwatched" | "actions";

/**
 * The split into returnable and removable is an ASSET question. A driver holds the
 * returnable half of whatever they drive and nothing else, so on the Drivers tab those two
 * columns printed the Items count a second time and a column of dashes beside it.
 */
const DRIVER_COLUMNS: ColId[] = ["holder", "context", "dq", "items", "actions"];
const ASSET_COLUMNS: ColId[] = ["holder", "context", "items", "returnable", "removable", "actions"];


/** A count that reads as nothing when it is nothing, rather than as a bold zero. */
function Count({ n, tone }: { n: number; tone?: string }) {
    if (!n) return <span className="text-sm text-slate-300">—</span>;
    return <span className={cn("text-sm font-bold tabular-nums", tone ?? "text-slate-800")}>{n}</span>;
}

export function InventoryHoldersPage({ onNavigate, kind, accountId, accountName }: Props) {
    const isDriver = kind === "driver";
    const [search, setSearch] = useState("");
    const [loadFilter, setLoadFilter] = useState<LoadFilter>("all");
    const [dqFilter, setDqFilter] = useState<DqFilter>("all");
    const [groupBy, setGroupBy] = useState<HolderGroupBy>("none");
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    // The holder being shared. Null = closed. Assignment is a page of its own now: it grew
    // a take-back list, a receipt tick per item, two destinations per free item, a signature
    // and a message, which is more than a box the page scrolls behind can hold.
    const [sharing, setSharing] = useState<HolderRow | null>(null);
    const [visible, setVisible] = useState<Set<ColId>>(() => new Set(isDriver ? DRIVER_COLUMNS : ASSET_COLUMNS));
    const show = (c: ColId) => visible.has(c);
    const toggleCol = (c: ColId) => setVisible((prev) => {
        const next = new Set(prev);
        next.has(c) ? next.delete(c) : next.add(c);
        return next;
    });

    const { additions, applyEdit } = useInventoryAdditions(accountId);
    const items = useMemo<InventoryItem[]>(() => {
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS).map(applyEdit);
        return additions.length ? [...additions, ...base] : base;
    }, [accountId, additions, applyEdit]);

    const { records } = useDriverHandovers(accountId ?? "acct-001");

    // Same seed as the List — a carrier landing on this tab first should still see who
    // is holding what, rather than a Handed column of zeroes.
    useEffect(() => {
        const scope = accountId ?? "acct-001";
        const roster = (CARRIER_DRIVERS[scope] ?? ACME_DRIVERS)
            .filter((d: any) => d.status === "Active")
            .map((d: any) => ({ id: d.id, name: d.name ?? `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() }));
        seedDemoHandovers(scope, records, roster, items, "Fleet Manager");
    }, [accountId, records, items]);

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

    const allRows = useMemo(
        () => (isDriver ? rollupByDriver : rollupByAsset)(items, accountId, handedTo),
        [isDriver, items, accountId, handedTo],
    );

    /**
     * Each driver's DQ type, by row id.
     *
     * getRecord() wants the roster record, not the rollup row, so the roster is indexed
     * once here rather than searched per cell. A row with no roster record behind it — an
     * item still filed against someone who has left — gets no type, and no type is not a
     * fourth kind of driver: it is excluded from all three chips and bands as "Unknown".
     */
    const { getRecord } = useDriverDqFiles(accountId);
    const dqTypeOf = useMemo(() => {
        const scope = accountId ?? "acct-001";
        const roster = new Map<string, any>();
        if (isDriver) for (const d of (CARRIER_DRIVERS[scope] ?? ACME_DRIVERS) as any[]) roster.set(d.id, d);
        const cache = new Map<string, DqDriverTypeId | null>();
        return (id: string): DqDriverTypeId | null => {
            if (cache.has(id)) return cache.get(id)!;
            const d = roster.get(id);
            const t = d ? getRecord(d).driverType : null;
            cache.set(id, t);
            return t;
        };
        // getRecord is rebuilt on every store change, which is exactly when the cache
        // must be thrown away.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDriver, accountId, getRecord]);

    /** What each driver-type chip would find, before it narrows anything. */
    const dqCounts = useMemo(() => {
        const out: Record<string, number> = { all: allRows.length };
        for (const t of DQ_DRIVER_TYPES) out[t.id] = 0;
        if (isDriver) for (const r of allRows) {
            const t = dqTypeOf(r.id);
            if (t) out[t] += 1;
        }
        return out;
    }, [allRows, isDriver, dqTypeOf]);
    const totals = useMemo(() => rollupTotals(allRows), [allRows]);
    const holderRef = (r: HolderRow): RecordRef => ({
        type: isDriver ? "inventory-driver" : "inventory-asset",
        id: r.id,
        label: r.label,
        sublabel: `${r.items.length} inventory item${r.items.length === 1 ? "" : "s"}${r.sub ? ` · ${r.sub}` : ""}`,
        path: isDriver ? "/inventory/drivers" : "/inventory/assets",
    });

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allRows.filter((r) => {
            if (loadFilter === "with" && r.items.length === 0) return false;
            if (loadFilter === "without" && r.items.length > 0) return false;
            // The two that are worth opening the page for.
            if (loadFilter === "expiring" && r.expiring === 0) return false;
            if (loadFilter === "expired" && r.expired === 0) return false;
            // Which border this driver's paperwork is written for. A separate question from
            // how much they are carrying, so a separate switch: "which of the cross-border
            // drivers is holding nothing" is the thing you open this tab to ask.
            if (isDriver && dqFilter !== "all" && dqTypeOf(r.id) !== dqFilter) return false;
            if (!q) return true;
            return r.label.toLowerCase().includes(q)
                || r.sub.toLowerCase().includes(q)
                || (r.driverLabel ?? "").toLowerCase().includes(q)
                // Searching for a fuel card should find who has it, not just the card.
                || r.items.some(({ item }) => itemName(item).toLowerCase().includes(q) || item.serial.toLowerCase().includes(q));
        });
    }, [allRows, loadFilter, search, isDriver, dqFilter, dqTypeOf]);

    /** Which band a row falls in, and where that band sits. */
    const groupOfRow = (r: HolderRow): { rank: number; label: string } => {
        if (groupBy === "dq") {
            const t = dqTypeOf(r.id);
            const ix = DQ_DRIVER_TYPES.findIndex((x) => x.id === t);
            return ix < 0 ? { rank: 9, label: "Unknown driver type" } : { rank: ix, label: DQ_DRIVER_TYPES[ix].label };
        }
        if (groupBy === "status") return { rank: 0, label: r.status };
        // What they hold. Two bands, because the useful cut is "has something" against
        // "has nothing", not a band per count.
        return r.items.length > 0
            ? { rank: 0, label: isDriver ? "Holding inventory" : "Carrying inventory" }
            : { rank: 1, label: "Holding nothing" };
    };

    // Banded before the page is cut, so a band is never split across two pages.
    const groupedRows = useMemo(() => {
        if (groupBy === "none") return rows;
        return [...rows].sort((a, b) => {
            const ga = groupOfRow(a), gb = groupOfRow(b);
            return ga.rank - gb.rank || ga.label.localeCompare(gb.label);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, groupBy, dqTypeOf, isDriver]);

    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy === "none") return m;
        for (const r of groupedRows) {
            const label = groupOfRow(r).label;
            m.set(label, (m.get(label) ?? 0) + 1);
        }
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupedRows, groupBy, dqTypeOf, isDriver]);

    useEffect(() => { setPage(0); }, [search, loadFilter, dqFilter, groupBy, accountId, kind]);
    // Switching tabs switches the question, so it switches the columns too: the two tabs
    // do not show the same ones, and a Drivers column set carried onto Assets would hide
    // the split that tab exists to show.
    useEffect(() => {
        setSearch("");
        setLoadFilter("all");
        setDqFilter("all");
        setGroupBy("none");
        setVisible(new Set(kind === "driver" ? DRIVER_COLUMNS : ASSET_COLUMNS));
    }, [accountId, kind]);

    const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const pagedRows = groupedRows.slice(safePage * perPage, safePage * perPage + perPage);

    const { scrollRef, condensed, onScroll } = useCondensingHeader(loadFilter);
    const kpiChips = useMemo(() => [
        { id: "holders", label: isDriver ? "Drivers" : "Assets", value: totals.holders, tone: "text-blue-700" },
        { id: "assigned", label: "Items", value: totals.assigned, tone: "text-slate-700" },
        { id: "expiring", label: "Expiring", value: totals.expiring, tone: "text-amber-700" },
        { id: "expired", label: "Expired", value: totals.expired, tone: "text-rose-700" },
    ], [totals, isDriver]);

    // The holder and its actions are always on: a table of counts with no name against them
    // is not a table, and hiding the menu would leave no way to assign anything.
    const pickerColumns: PickerColumn<ColId>[] = [
        { id: "holder", label: isDriver ? "Driver" : "Asset", locked: true },
        { id: "context", label: isDriver ? "Status" : "Driver" },
        // Only the Drivers tab has a driver type, and only the Assets tab has two kinds
        // of load to split. Offering either on the wrong tab offers a column of dashes.
        ...(isDriver
            ? [{ id: "dq" as ColId, label: "Driver type" }]
            : []),
        { id: "items", label: isDriver ? "Returnable items" : "Items" },
        ...(isDriver ? [] : [
            { id: "returnable" as ColId, label: VIA_LABEL[kind].returnable },
            { id: "removable" as ColId, label: VIA_LABEL[kind].removable },
        ]),
        { id: "expiring", label: "Expiring" },
        { id: "expired", label: "Expired" },
        { id: "unwatched", label: "No alert" },
        { id: "actions", label: "Actions", locked: true },
    ];
    const groupOptions = HOLDER_GROUPS.filter((g) => isDriver || !g.driverOnly);
    const noun = isDriver ? "driver" : "asset";
    const back = isDriver ? "/inventory/drivers" : "/inventory/assets";
    const HolderIcon = isDriver ? IdCard : Truck;

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={isDriver ? UserRound : Truck}
                title={isDriver ? "Inventory by Driver" : "Inventory by Asset"}
                description={
                    <>
                        <span className="font-semibold text-slate-700">{accountName ?? CARRIER_NAME}</span>
                        {" "}— what each {noun} is holding, and what needs attention.
                    </>
                }
                count={totals.assigned}
                countTitle={`${totals.assigned} items across ${totals.withItems} ${noun}s`}
                chips={kpiChips}
                condensed={condensed}
                tabsLabel="Inventory sections"
                tabs={INVENTORY_TABS.map(t => ({ id: t.id, label: t.label, icon: t.Icon }))}
                activeTab={isDriver ? "drivers" : "assets"}
                onTabChange={id => onNavigate(INVENTORY_TABS.find(t => t.id === id)?.path ?? "/inventory")}
            />

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
                <div className={cn("py-4 sm:py-6", PAGE_PAD)}>
                    <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                        {/* The tiles ARE the filter. They carried the numbers and did nothing;
                            under them sat five chips repeating three of the same words. */}
                        <KpiTile label={isDriver ? "Drivers" : "Assets"} value={totals.holders} Icon={HolderIcon} accent="blue"
                            onClick={() => setLoadFilter("all")} active={loadFilter === "all"} />
                        <KpiTile label="Holding inventory" value={totals.withItems} Icon={PackageCheck} accent="emerald"
                            onClick={() => setLoadFilter("with")} active={loadFilter === "with"} />
                        <KpiTile label="Holding nothing" value={totals.none} Icon={CircleSlash} accent="slate"
                            onClick={() => setLoadFilter("without")} active={loadFilter === "without"} />
                        <KpiTile label="Expiring soon" value={totals.expiring} Icon={Clock} accent="amber"
                            onClick={() => setLoadFilter("expiring")} active={loadFilter === "expiring"} />
                        <KpiTile label="Expired" value={totals.expired} Icon={AlertTriangle} accent="red"
                            onClick={() => setLoadFilter("expired")} active={loadFilter === "expired"} />
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
                            <div className="relative min-w-[190px] max-w-xs flex-1">
                                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={isDriver ? "Search driver, or an item they hold…" : "Search unit, make, or an item on it…"}
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <ColumnPicker columns={pickerColumns} visible={visible} onToggle={toggleCol} />
                            <span className="ml-auto text-xs text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{rows.length}</span> of {totals.holders}
                            </span>
                        </div>

                        {/* How the list is narrowed and banded, on a row of its own — the same
                            row, in the same place, as the one on the Inventory list.

                            The chips ask which border a driver's paperwork is written for.
                            It is the cut a roster is actually read by: a cross-border driver
                            carries documents a domestic one never sees, so "who crosses"
                            decides what has to be on them before they leave. */}
                        {(isDriver || groupOptions.length > 1) && (
                            <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/40 px-5 py-2">
                                {isDriver && (
                                    <>
                                        <FilterChip
                                            label="All drivers"
                                            count={dqCounts.all}
                                            on={dqFilter === "all"}
                                            always
                                            onClick={() => setDqFilter("all")}
                                        />
                                        {DQ_DRIVER_TYPES.map((t) => (
                                            <FilterChip
                                                key={t.id}
                                                label={t.label}
                                                count={dqCounts[t.id] ?? 0}
                                                on={dqFilter === t.id}
                                                onClick={() => setDqFilter(t.id)}
                                            />
                                        ))}
                                    </>
                                )}
                                <select
                                    value={groupBy}
                                    onChange={(e) => setGroupBy(e.target.value as HolderGroupBy)}
                                    title="Group the list"
                                    className={cn(
                                        "ml-auto h-8 shrink-0 rounded-lg border px-2 text-[12px] font-semibold outline-none focus:border-blue-500",
                                        groupBy === "none"
                                            ? "border-slate-200 bg-white text-slate-600"
                                            : "border-blue-300 bg-blue-50/60 text-blue-700",
                                    )}
                                >
                                    {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                                </select>
                                {/* The KPI tiles are a filter too, so a holder list can be
                                    narrowed four ways at once. */}
                                <ResetFilters
                                    on={loadFilter !== "all" || dqFilter !== "all"
                                        || groupBy !== "none" || search.trim() !== ""}
                                    onReset={() => {
                                        setLoadFilter("all");
                                        setDqFilter("all");
                                        setGroupBy("none");
                                        setSearch("");
                                    }}
                                />
                            </div>
                        )}

                        {rows.length === 0 ? (
                            <div className="border-t border-slate-100 p-12 text-center">
                                <Layers size={28} className="mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">No {noun}s match this view</p>
                                <p className="mt-1 text-xs text-slate-500">Try a different search, or show all {noun}s.</p>
                            </div>
                        ) : (
                            <div className="border-t border-slate-100">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <TH>{isDriver ? "Driver" : "Asset"}</TH>
                                                {show("context") && (isDriver ? <TH>Status</TH> : <TH>Driver</TH>)}
                                                {show("dq") && <TH>Driver type</TH>}
                                                {/* On the Drivers tab this is the whole pile AND the returnable
                                                    count, which are the same number there — so it is named for
                                                    what it holds rather than printed twice. */}
                                                {show("items") && <TH className="text-right">{isDriver ? "Returnable" : "Items"}</TH>}
                                                {/* A column each, not two chips in one cell: you cannot scan one
                                                    carrier against another down a stacked cell. */}
                                                {(["returnable", "removable"] as HeldVia[]).filter(show).map((v) => (
                                                    <TH key={v} className="text-right">{VIA_LABEL[kind][v]}</TH>
                                                ))}
                                                {show("expiring") && <TH className="text-right">Expiring</TH>}
                                                {show("expired") && <TH className="text-right">Expired</TH>}
                                                {show("unwatched") && <TH className="text-right">No alert</TH>}
                                                <TH className="w-px text-right">Actions</TH>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pagedRows.map((r, i) => {
                                                const empty = r.items.length === 0;
                                                const g = groupBy === "none" ? null : groupOfRow(r);
                                                const prev = i === 0 || groupBy === "none" ? null : groupOfRow(pagedRows[i - 1]);
                                                const dq = show("dq") ? dqTypeOf(r.id) : null;
                                                return (
                                                    <Fragment key={r.id}>
                                                    {g && (!prev || prev.label !== g.label) && (
                                                        <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={visible.size} />
                                                    )}
                                                    <tr
                                                        // The row opens the holder's own page. It used to unfold
                                                        // in place, which is a page's worth of detail inside a
                                                        // table cell — and nothing you could link anybody to.
                                                        // An empty holder still has a page: nothing on it yet is
                                                        // an answer, and you can put something on it from there.
                                                        onClick={() => onNavigate(`${back}/${r.id}`)}
                                                        tabIndex={0}
                                                        role="link"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault();
                                                                onNavigate(`${back}/${r.id}`);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40",
                                                            "cursor-pointer hover:bg-blue-50/50",
                                                            empty && "text-slate-400",
                                                            "even:bg-slate-50/40",
                                                        )}
                                                    >
                                                        <TD className="max-w-[18rem]">
                                                            <div className="flex min-w-0 items-center gap-2.5">
                                                                <span className={cn(
                                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                                    empty ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600",
                                                                )}>
                                                                    <HolderIcon size={15} />
                                                                </span>
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="truncate text-sm font-semibold text-slate-900">{r.label}</span>
                                                                        {r.kindLabel && (
                                                                            <span className={cn(
                                                                                "shrink-0 rounded border px-1 py-px text-[9px] font-bold uppercase tracking-wider",
                                                                                KIND_TONE[r.kindLabel === "Non-CMV" ? "orange" : "indigo"],
                                                                            )}>
                                                                                {r.kindLabel}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="truncate text-[11px] text-slate-500">{r.sub}</div>
                                                                </div>
                                                            </div>
                                                        </TD>
                                                        {show("context") && (isDriver ? (
                                                            <TD>
                                                                <span className={cn(
                                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                                    TONE_BADGE[r.statusTone],
                                                                )}>
                                                                    <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", TONE_DOT[r.statusTone])} />
                                                                    {r.status}
                                                                </span>
                                                            </TD>
                                                        ) : (
                                                            <TD className="max-w-[12rem]">
                                                                {r.driverLabel
                                                                    ? <span className="truncate text-sm text-slate-700">{r.driverLabel}</span>
                                                                    : <span className="text-xs text-slate-300">—</span>}
                                                            </TD>
                                                        ))}
                                                        {show("dq") && (
                                                            <TD>
                                                                {dq ? (
                                                                    <span className={cn(
                                                                        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-bold",
                                                                        DQ_TONE[dq],
                                                                    )}>
                                                                        {DQ_DRIVER_TYPES.find((t) => t.id === dq)?.label ?? dq}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs text-slate-300">—</span>
                                                                )}
                                                            </TD>
                                                        )}
                                                        {show("items") && <TD className="text-right">
                                                            <span className={cn(
                                                                "inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-bold tabular-nums",
                                                                empty ? "text-slate-300" : "bg-slate-100 text-slate-800",
                                                            )}>
                                                                {r.items.length}
                                                            </span>
                                                        </TD>}
                                                        {(["returnable", "removable"] as HeldVia[]).filter(show).map((v) => (
                                                            <TD key={v} className="text-right">
                                                                {r.via[v] ? (
                                                                    <span className={cn(
                                                                        "inline-flex min-w-[1.75rem] items-center justify-center rounded border px-1.5 py-0.5 text-[12px] font-bold tabular-nums",
                                                                        VIA_TONE[v].chip,
                                                                    )}>
                                                                        {r.via[v]}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-sm text-slate-300">—</span>
                                                                )}
                                                            </TD>
                                                        ))}
                                                        {show("expiring") && <TD className="text-right"><Count n={r.expiring} tone="text-amber-600" /></TD>}
                                                        {show("expired") && <TD className="text-right"><Count n={r.expired} tone="text-rose-600" /></TD>}
                                                        {show("unwatched") && <TD className="text-right"><Count n={r.unwatched} tone="text-slate-500" /></TD>}
                                                        {/* The row navigates on click, so the menu has to keep its own
                                                            clicks to itself. Opening the holder comes first: it is what
                                                            the row is for, and a menu that names only "Share to chat"
                                                            leaves the main verb to be guessed at.

                                                            Assignment is an ASSET action. Nothing is filed against a
                                                            person any more — a driver holds the returnable half of
                                                            whatever they drive — so on the Drivers tab it opened a
                                                            page to do something the model no longer does. */}
                                                        <TD className="w-px text-right" onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                                                            <KebabMenu items={[
                                                                { label: isDriver ? "Open driver" : "Open asset", icon: ExternalLink, onClick: () => onNavigate(`${back}/${r.id}`) },
                                                                ...(isDriver ? [] : [
                                                                    { label: "Manage inventory", icon: ClipboardList, onClick: () => onNavigate(`${back}/${r.id}/assign`) },
                                                                ]),
                                                                { label: "Share to chat", icon: Share2, onClick: () => setSharing(r) },
                                                            ]} />
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
                                    label={`${noun}s`}
                                    onPage={setPage}
                                    onPerPage={(n) => { setPerPage(n); setPage(0); }}
                                />
                            </div>
                        )}
                    </div>

                    {/* What the two columns mean, said once under the table. */}
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {(["returnable", "removable"] as HeldVia[]).map((v) => (
                            <span key={v} className="flex items-center gap-1.5">
                                <span className={cn("h-2.5 w-2.5 rounded-full", VIA_TONE[v].bar)} />
                                <span className={cn("font-semibold", VIA_TONE[v].text)}>{VIA_LABEL[kind][v]}</span>
                                <span>— {v === "returnable"
                                    ? "travels with whoever drives it, and has to come back"
                                    : "fitted to the vehicle, and has to come off"}</span>
                            </span>
                        ))}
                        <span className="flex items-center gap-1.5">
                            <BellOff size={11} />
                            <span className="font-semibold text-slate-600">No alert</span>
                            <span>— has an expiry date nobody will be told about</span>
                        </span>
                    </p>
                </div>
            </div>

            {sharing && (
                <ShareToChat
                    open
                    onClose={() => setSharing(null)}
                    title={`Share ${sharing.label}`}
                    subtitle={`What this ${noun} is holding, in a chat or by email`}
                    source={{ type: "manual", id: sharing.id, label: sharing.label }}
                    items={sharing.items.map(({ item, via }) => ({ name: itemName(item), group: VIA_LABEL[kind][via] }))}
                    record={holderRef(sharing)}
                    defaultChannel="in-app"
                    defaultSubject={`${sharing.label} — inventory`}
                    onOpenInMessages={(id) => { setMessagesFocus(id); onNavigate("/messages"); }}
                />
            )}
        </div>
    );
}
