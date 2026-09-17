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

import { useEffect, useMemo, useState } from "react";
import {
    Search, Truck, IdCard, ChevronRight, Boxes, Layers, AlertTriangle, Clock,
    Bell, BellOff, PackageCheck, CircleSlash, UserRound, Pencil, Share2,
} from "lucide-react";
import {
    INVENTORY_ITEMS, getInventoryForCarrier, VENDORS, ACME_DRIVERS, CARRIER_NAME,
    itemName, inventoryMonitoring, type InventoryItem,
} from "./inventory.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, handoverStatusOf, seedDemoHandovers, type HandoverStatus,
} from "./handovers.data";
import { KIND_TONE, fmtDate, daysUntil } from "./inventory-assignment";
import {
    rollupByDriver, rollupByAsset, rollupTotals,
    VIA_LABEL, VIA_TONE, type HeldVia, type HolderKind, type HolderRow,
} from "./inventory-rollup";
import { ColumnPicker, type PickerColumn } from "@/components/ui/ListChrome";
import { KebabMenu } from "@/components/ui/KebabMenu";
import { ShareToChat } from "@/components/share/ShareToChat";
import { setMessagesFocus, type RecordRef } from "@/pages/messages/messages-store";
import { MONITOR_BASIS_LABEL } from "@/pages/compliance/monitoring-schedule";
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

/** All / holders carrying something / holders carrying nothing. */
type LoadFilter = "all" | "with" | "without";
const LOAD_FILTERS: { id: LoadFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "with", label: "Holding inventory" },
    { id: "without", label: "Holding nothing" },
];

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
type ColId = "holder" | "context" | "items" | "direct" | "carried" | "handed"
    | "expiring" | "expired" | "unwatched" | "actions";

const DEFAULT_COLUMNS: ColId[] = ["holder", "context", "items", "direct", "carried", "handed", "actions"];

/** What each route actually means, said once in the group header rather than in a legend
 *  the reader has to scroll to and hold in their head. */
const VIA_NOTE: Record<HolderKind, Record<HeldVia, string>> = {
    driver: {
        direct: "issued to them",
        carried: "goes with a vehicle they drive",
        handed: "on a signed hand-over",
    },
    asset: {
        direct: "stays with the vehicle",
        carried: "in the hands of whoever drives it",
        handed: "on a signed hand-over",
    },
};

/**
 * What state ONE item is in — the thing the removed Expiring / Expired / No-alert columns
 * were summing. A count against a holder cannot say which of their eleven cards expired;
 * a badge on the card can.
 */
function ItemState({ item }: { item: InventoryItem }) {
    const mon = inventoryMonitoring(item);
    const days = item.expiryDate ? daysUntil(item.expiryDate) : null;

    const pill = (tone: string, icon: React.ReactNode, label: string, title?: string) => (
        <span title={title} className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            tone,
        )}>
            {icon} {label}
        </span>
    );

    return (
        <span className="flex shrink-0 items-center gap-1">
            {days !== null && days < 0
                ? pill("border-rose-200 bg-rose-50 text-rose-700", <AlertTriangle size={9} />, "Expired", `Ran out ${Math.abs(days)} days ago`)
                : days !== null && days <= 30
                ? pill("border-amber-200 bg-amber-50 text-amber-700", <Clock size={9} />, `${days}d`, `Due in ${days} days`)
                : null}
            {/* An expiry nobody is alerted about is a gap, not a state — flagged whether or not
                the date is close, because the point is that nothing will announce it. */}
            {item.expiryDate && !mon.enabled &&
                pill("border-slate-200 bg-slate-100 text-slate-500", <BellOff size={9} />, "No alert", "This has an expiry date and no reminder set")}
        </span>
    );
}

/** A count that reads as nothing when it is nothing, rather than as a bold zero. */
function Count({ n, tone }: { n: number; tone?: string }) {
    if (!n) return <span className="text-sm text-slate-300">—</span>;
    return <span className={cn("text-sm font-bold tabular-nums", tone ?? "text-slate-800")}>{n}</span>;
}

export function InventoryHoldersPage({ onNavigate, kind, accountId, accountName }: Props) {
    const isDriver = kind === "driver";
    const [search, setSearch] = useState("");
    const [loadFilter, setLoadFilter] = useState<LoadFilter>("all");
    const [openId, setOpenId] = useState<string | null>(null);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    // The holder being shared. Null = closed. Assignment is a page of its own now: it grew
    // a take-back list, a receipt tick per item, two destinations per free item, a signature
    // and a message, which is more than a box the page scrolls behind can hold.
    const [sharing, setSharing] = useState<HolderRow | null>(null);
    const [visible, setVisible] = useState<Set<ColId>>(() => new Set(DEFAULT_COLUMNS));
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
            if (!q) return true;
            return r.label.toLowerCase().includes(q)
                || r.sub.toLowerCase().includes(q)
                || (r.driverLabel ?? "").toLowerCase().includes(q)
                // Searching for a fuel card should find who has it, not just the card.
                || r.items.some(({ item }) => itemName(item).toLowerCase().includes(q) || item.serial.toLowerCase().includes(q));
        });
    }, [allRows, loadFilter, search]);

    useEffect(() => { setPage(0); setOpenId(null); }, [search, loadFilter, accountId, kind]);
    useEffect(() => { setSearch(""); setLoadFilter("all"); }, [accountId, kind]);

    const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const pagedRows = rows.slice(safePage * perPage, safePage * perPage + perPage);

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
        { id: "items", label: "Items" },
        { id: "direct", label: VIA_LABEL[kind].direct },
        { id: "carried", label: VIA_LABEL[kind].carried },
        { id: "handed", label: VIA_LABEL[kind].handed },
        { id: "expiring", label: "Expiring" },
        { id: "expired", label: "Expired" },
        { id: "unwatched", label: "No alert" },
        { id: "actions", label: "Actions", locked: true },
    ];
    // Chevron + holder + actions are always rendered; the rest are counted as shown.
    const colCount = 3 + (["context", "items", "direct", "carried", "handed", "expiring", "expired", "unwatched"] as ColId[])
        .filter(show).length;

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
                        <KpiTile label={isDriver ? "Drivers" : "Assets"} value={totals.holders} Icon={HolderIcon} accent="blue" />
                        <KpiTile label="Holding inventory" value={totals.withItems} Icon={PackageCheck} accent="emerald" />
                        <KpiTile label="Holding nothing" value={totals.none} Icon={CircleSlash} accent="slate" />
                        <KpiTile label="Expiring soon" value={totals.expiring} Icon={Clock} accent="amber" />
                        <KpiTile label="Expired" value={totals.expired} Icon={AlertTriangle} accent="red" />
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
                            <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5">
                                {LOAD_FILTERS.map((o) => (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => setLoadFilter(o.id)}
                                        className={cn(
                                            "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-semibold transition-colors",
                                            loadFilter === o.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900",
                                        )}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                            <ColumnPicker columns={pickerColumns} visible={visible} onToggle={toggleCol} />
                            <span className="ml-auto text-xs text-slate-500">
                                Showing <span className="font-semibold text-slate-700">{rows.length}</span> of {totals.holders}
                            </span>
                        </div>

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
                                                <TH className="w-8" />
                                                <TH>{isDriver ? "Driver" : "Asset"}</TH>
                                                {show("context") && (isDriver ? <TH>Status</TH> : <TH>Driver</TH>)}
                                                {show("items") && <TH className="text-right">Items</TH>}
                                                {/* A column each, not three chips in one cell. How an item reached
                                                    a holder is the difference between kit issued to a person and kit
                                                    that happens to be in the truck they were given this week, and you
                                                    cannot scan one carrier against another down a stacked cell. */}
                                                {(["direct", "carried", "handed"] as HeldVia[]).filter(show).map((v) => (
                                                    <TH key={v} className="text-right">{VIA_LABEL[kind][v]}</TH>
                                                ))}
                                                {show("expiring") && <TH className="text-right">Expiring</TH>}
                                                {show("expired") && <TH className="text-right">Expired</TH>}
                                                {show("unwatched") && <TH className="text-right">No alert</TH>}
                                                <TH className="w-px text-right">Actions</TH>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pagedRows.map((r) => {
                                                const open = openId === r.id;
                                                const empty = r.items.length === 0;
                                                return [
                                                    <tr
                                                        key={r.id}
                                                        // An empty holder has nothing to expand, so it does not
                                                        // pretend to be clickable.
                                                        onClick={() => !empty && setOpenId(open ? null : r.id)}
                                                        tabIndex={empty ? -1 : 0}
                                                        role={empty ? undefined : "button"}
                                                        aria-expanded={empty ? undefined : open}
                                                        onKeyDown={(e) => {
                                                            if (empty) return;
                                                            if (e.key === "Enter" || e.key === " ") {
                                                                e.preventDefault();
                                                                setOpenId(open ? null : r.id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/40",
                                                            empty ? "text-slate-400" : "cursor-pointer hover:bg-blue-50/50",
                                                            open ? "bg-blue-50/60" : "even:bg-slate-50/40",
                                                        )}
                                                    >
                                                        <TD className="pr-0">
                                                            {!empty && (
                                                                <ChevronRight
                                                                    size={15}
                                                                    className={cn("text-slate-400 transition-transform", open && "rotate-90 text-blue-600")}
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </TD>
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
                                                        {show("items") && <TD className="text-right">
                                                            <span className={cn(
                                                                "inline-flex min-w-[2rem] items-center justify-center rounded-md px-1.5 py-0.5 text-sm font-bold tabular-nums",
                                                                empty ? "text-slate-300" : "bg-slate-100 text-slate-800",
                                                            )}>
                                                                {r.items.length}
                                                            </span>
                                                        </TD>}
                                                        {(["direct", "carried", "handed"] as HeldVia[]).filter(show).map((v) => (
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
                                                        {/* The row expands on click, so the menu has to keep its own
                                                            clicks to itself. Edit comes first: assigning inventory is
                                                            what you open a holder's row to do. */}
                                                        <TD className="w-px text-right" onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                                                            <KebabMenu items={[
                                                                { label: "Edit assignment", icon: Pencil, onClick: () => onNavigate(`${back}/${r.id}/assign`) },
                                                                { label: "Share to chat", icon: Share2, onClick: () => setSharing(r) },
                                                            ]} />
                                                        </TD>
                                                    </tr>,

                                                    open && (
                                                        <tr key={`${r.id}-items`} className="bg-slate-50/80">
                                                            <td colSpan={colCount} className="px-4 pb-4 pt-0">
                                                                {/* Grouped by route, not listed flat: "three items" means one thing
                                                                    when all three were issued to the person and another when two of
                                                                    them are simply in the truck they are driving this week. */}
                                                                <div className="space-y-3">
                                                                    {(["direct", "carried", "handed"] as HeldVia[]).map((v) => {
                                                                        const group = r.items.filter((h) => h.via === v);
                                                                        if (group.length === 0) return null;
                                                                        const tone = VIA_TONE[v];
                                                                        return (
                                                                            <div key={v} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                                                                                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-1.5">
                                                                                    <span className={cn("h-2 w-2 rounded-full", tone.bar)} />
                                                                                    <span className={cn("text-[11px] font-bold uppercase tracking-wide", tone.text)}>
                                                                                        {VIA_LABEL[kind][v]}
                                                                                    </span>
                                                                                    <span className="text-[11px] font-semibold text-slate-400">{group.length}</span>
                                                                                    <span className="ml-auto text-[10px] text-slate-400">{VIA_NOTE[kind][v]}</span>
                                                                                    {/* The counts the holder row used to carry, scoped to the
                                                                                        group they are about rather than summed over everything. */}
                                                                                    {(() => {
                                                                                        const bad = group.filter(({ item }) => {
                                                                                            const d = item.expiryDate ? daysUntil(item.expiryDate) : null;
                                                                                            return d !== null && d <= 30;
                                                                                        }).length;
                                                                                        return bad > 0 ? (
                                                                                            <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                                                                                <Clock size={9} /> {bad} need attention
                                                                                            </span>
                                                                                        ) : null;
                                                                                    })()}
                                                                                </div>
                                                                                {group.map(({ item: it }) => {
                                                                                    const vendor = VENDORS.find((v2) => v2.id === it.vendorId);
                                                                                    const days = it.expiryDate ? daysUntil(it.expiryDate) : null;
                                                                                    const mon = inventoryMonitoring(it);
                                                                                    const reminders = [...mon.reminders].sort((a, b) => b - a);
                                                                                    return (
                                                                                        <button
                                                                                            key={it.id}
                                                                                            type="button"
                                                                                            onClick={(e) => { e.stopPropagation(); onNavigate(`/inventory/items/${it.id}`); }}
                                                                                            className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-blue-50/60"
                                                                                        >
                                                                                            <span className={cn("h-8 w-1 shrink-0 rounded-full", tone.bar)} />
                                                                                            <Boxes size={14} className="shrink-0 text-slate-400" />
                                                                                            <span className="min-w-0 flex-1">
                                                                                                <span className="flex items-center gap-1.5">
                                                                                                    <span className="truncate text-[13px] font-semibold text-slate-800">{itemName(it)}</span>
                                                                                                    <ItemState item={it} />
                                                                                                </span>
                                                                                                <span className="block truncate text-[11px] text-slate-500">
                                                                                                    {vendor?.companyName || vendor?.name || "—"}
                                                                                                    {it.serial && <span className="font-mono"> · {it.serial}</span>}
                                                                                                </span>
                                                                                            </span>
                                                                                            {/* The alert, in the same words the item page uses. An expiry
                                                                                                with a muted bell is the row that lapses without a sound. */}
                                                                                            <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
                                                                                                {mon.enabled ? (
                                                                                                    <>
                                                                                                        <Bell size={12} className="text-emerald-500" />
                                                                                                        <span className="text-right text-[11px] leading-tight">
                                                                                                            <span className="block font-semibold text-slate-600">{MONITOR_BASIS_LABEL[mon.basis]}</span>
                                                                                                            <span className="block text-slate-400">
                                                                                                                {reminders.length
                                                                                                                    ? `remind ${reminders.map((d) => (d === 0 ? "on the day" : `${d}d`)).join(", ")}`
                                                                                                                    : "no reminders set"}
                                                                                                            </span>
                                                                                                        </span>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <BellOff size={12} className="text-slate-300" />
                                                                                                        <span className="text-[11px] text-slate-400">
                                                                                                            {it.expiryDate ? "no alert" : "nothing to watch"}
                                                                                                        </span>
                                                                                                    </>
                                                                                                )}
                                                                                            </span>
                                                                                            <span className="w-24 shrink-0 text-right text-[11px] leading-tight">
                                                                                                {it.expiryDate ? (
                                                                                                    <>
                                                                                                        <span className={cn(
                                                                                                            "block font-semibold",
                                                                                                            days !== null && days < 0 ? "text-rose-600"
                                                                                                                : days !== null && days <= 30 ? "text-amber-600" : "text-slate-600",
                                                                                                        )}>
                                                                                                            {fmtDate(it.expiryDate)}
                                                                                                        </span>
                                                                                                        <span className="block text-slate-400">
                                                                                                            {days === null ? "" : days < 0 ? `${Math.abs(days)}d overdue` : `in ${days}d`}
                                                                                                        </span>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <span className="block text-slate-400">no expiry</span>
                                                                                                )}
                                                                                            </span>
                                                                                            <ChevronRight size={14} className="shrink-0 text-slate-300" />
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ),
                                                ];
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

                    {/* What the three route columns mean, said once under the table. The same
                        words appear on each group header inside an expanded row, so the legend
                        is a reminder rather than the only place it is explained. */}
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        {(["direct", "carried", "handed"] as HeldVia[]).map((v) => (
                            <span key={v} className="flex items-center gap-1.5">
                                <span className={cn("h-2.5 w-2.5 rounded-full", VIA_TONE[v].bar)} />
                                <span className={cn("font-semibold", VIA_TONE[v].text)}>{VIA_LABEL[kind][v]}</span>
                                <span>— {VIA_NOTE[kind][v]}</span>
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
