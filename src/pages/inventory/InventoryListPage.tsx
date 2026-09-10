import { useEffect, useMemo, useState } from "react";
import {
    Plus, Boxes, Search,
    Truck, IdCard, Pencil,
    Fuel, Radio, Activity, Map as MapIcon, Camera, Wrench, Layers,
    KeyRound, ShieldCheck, Package, Cpu, CreditCard,
    CircleCheck, Clock, AlertTriangle, CircleSlash,
    PackageCheck, ChevronDown, ChevronRight, Undo2, UserRound, ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    INVENTORY_ITEMS,
    getInventoryForCarrier,
    VENDORS,
    VENDOR_CATEGORIES,
    ACME_ASSETS,
    ACME_DRIVERS,
    CARRIER_NAME,
    type InventoryItem,
    type InventoryStatus,
    type Assignment,
} from "./inventory.data";
import { CARRIER_ASSETS } from "@/pages/accounts/carrier-assets.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import {
    useDriverHandovers, itemsHandedElsewhere, handoverStatusOf,
    buildDriverGroups, type HandoverStatus,
} from "./handovers.data";
import { INVENTORY_TABS } from "./InventoryTabs";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { TablePager } from "./TablePager";
import { KpiTile } from "./InventoryKpi";
import { AddInventoryModule } from "./AddInventoryModule";
import { DirectHandoverDialog, ChecklistHandoverPicker } from "./HandoverDialogs";
import { useInventoryAdditions } from "./inventory-store";
import { cn } from "@/lib/utils";

type HandoverFilter = "all" | "handed" | "not";
const HANDOVER_FILTERS: { id: HandoverFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "handed", label: "Handed over" },
    { id: "not", label: "Not handed over" },
];

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

// ── Per-category visual treatment ──────────────────────────────────────────

const CATEGORY_VISUAL: Record<string, { icon: React.ElementType; bg: string; text: string; bar: string; avatarBg: string; avatarText: string }> = {
    "cat-fuel-card":          { icon: Fuel,     bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   avatarBg: "bg-amber-100",   avatarText: "text-amber-800"   },
    "cat-transponder":        { icon: Radio,    bg: "bg-violet-50",  text: "text-violet-700",  bar: "bg-violet-500",  avatarBg: "bg-violet-100",  avatarText: "text-violet-800"  },
    "cat-eld-provider":       { icon: Activity, bg: "bg-blue-50",    text: "text-blue-700",    bar: "bg-blue-500",    avatarBg: "bg-blue-100",    avatarText: "text-blue-800"    },
    "cat-gps-tracking":       { icon: MapIcon,  bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", avatarBg: "bg-emerald-100", avatarText: "text-emerald-800" },
    "cat-dashcam":            { icon: Camera,   bg: "bg-cyan-50",    text: "text-cyan-700",    bar: "bg-cyan-500",    avatarBg: "bg-cyan-100",    avatarText: "text-cyan-800"    },
    "cat-repair-maintenance": { icon: Wrench,   bg: "bg-slate-100",  text: "text-slate-700",   bar: "bg-slate-500",   avatarBg: "bg-slate-200",   avatarText: "text-slate-800"   },
    "cat-keys":               { icon: KeyRound,    bg: "bg-amber-50",   text: "text-amber-700",   bar: "bg-amber-500",   avatarBg: "bg-amber-100",   avatarText: "text-amber-800"   },
    "cat-safety-ppe":         { icon: ShieldCheck, bg: "bg-rose-50",    text: "text-rose-700",    bar: "bg-rose-500",    avatarBg: "bg-rose-100",    avatarText: "text-rose-800"    },
    "cat-equipment":          { icon: Package,     bg: "bg-teal-50",    text: "text-teal-700",    bar: "bg-teal-500",    avatarBg: "bg-teal-100",    avatarText: "text-teal-800"    },
    "cat-devices":            { icon: Cpu,         bg: "bg-sky-50",     text: "text-sky-700",     bar: "bg-sky-500",     avatarBg: "bg-sky-100",     avatarText: "text-sky-800"     },
    "cat-cards-docs":         { icon: CreditCard,  bg: "bg-violet-50",  text: "text-violet-700",  bar: "bg-violet-500",  avatarBg: "bg-violet-100",  avatarText: "text-violet-800"  },
};
const DEFAULT_VISUAL = { icon: Layers, bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-400", avatarBg: "bg-slate-200", avatarText: "text-slate-800" };
const visualFor = (categoryId: string) => CATEGORY_VISUAL[categoryId] ?? DEFAULT_VISUAL;

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d: string) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "2-digit" });
};

// The category id an item resolves to, or null when it maps to no known
// category (surfaced under the "Other" tab).
const categoryIdOf = (item: InventoryItem): string | null => {
    const vendor = VENDORS.find((v) => v.id === item.vendorId);
    if (!vendor) return null;
    return VENDOR_CATEGORIES.some((c) => c.id === vendor.categoryId) ? vendor.categoryId : null;
};

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap", className)}>
        {children}
    </th>
);
const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={cn("px-4 py-3 text-sm whitespace-nowrap align-middle", className)}>{children}</td>
);

function resolveAssignment(
    a: Assignment | undefined,
    accountId: string | undefined,
) {
    if (!a) return null;
    // Carrier-scoped lookup: prefer the active carrier's drivers / assets,
    // fall back to Acme's so the display continues to work for the legacy
    // hand-curated INVENTORY_ITEMS that are seeded against Acme ids.
    const drivers = (accountId && CARRIER_DRIVERS[accountId]) || ACME_DRIVERS;
    const assets = (accountId && CARRIER_ASSETS[accountId]) || ACME_ASSETS;

    if (a.kind === "driver") {
        const driver = drivers.find((d: any) => d.id === a.targetId)
            ?? ACME_DRIVERS.find((d) => d.id === a.targetId);
        if (!driver) return { label: "—", sub: "Unknown driver", icon: IdCard, kindLabel: "Driver", tone: "slate" as const };
        const fullName = (driver as any).name
            ?? `${(driver as any).firstName ?? ""} ${(driver as any).lastName ?? ""}`.trim();
        return {
            label: fullName || "—",
            sub: (driver as any).licenseNumber ? `License ${(driver as any).licenseNumber}` : "—",
            icon: IdCard,
            kindLabel: "Driver",
            tone: "emerald" as const,
        };
    }
    const asset = assets.find((x: any) => x.id === a.targetId)
        ?? ACME_ASSETS.find((x) => x.id === a.targetId);
    if (!asset) return { label: "—", sub: "Unknown asset", icon: Truck, kindLabel: a.kind === "cmv" ? "CMV" : "Non-CMV", tone: "slate" as const };
    return {
        label: asset.unitNumber,
        sub: `${asset.year} ${asset.make} ${asset.model}`,
        icon: Truck,
        kindLabel: a.kind === "cmv" ? "CMV" : "Non-CMV",
        tone: a.kind === "cmv" ? ("indigo" as const) : ("orange" as const),
    };
}

const KIND_TONE: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
};

// ── Page ───────────────────────────────────────────────────────────────────

export function InventoryListPage({ onNavigate, accountId, accountName }: Props) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
    const [handoverFilter, setHandoverFilter] = useState<HandoverFilter>("all");
    const [activeCat, setActiveCat] = useState<string>("All");
    const [addOpen, setAddOpen] = useState(false);
    const [directOpen, setDirectOpen] = useState(false);
    const [checklistOpen, setChecklistOpen] = useState(false);
    const [page, setPage] = useState(0);
    const [perPage, setPerPage] = useState(15);
    const handed = handoverFilter === "handed";

    // Items added inline via the Add Inventory pop-up (localStorage overlay).
    const { additions, add } = useInventoryAdditions(accountId);

    // Inventory items are scoped to the active carrier, with any inline-added
    // items layered on top. With no `accountId` we fall back to the global
    // INVENTORY_ITEMS list so super-admin first-mount still renders.
    const items = useMemo<InventoryItem[]>(() => {
        const base = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        return additions.length ? [...base, ...additions] : base;
    }, [accountId, additions]);

    // Item ids currently on some driver's hand-over list (from the Hand Over
    // module) — drives the Handed over / Not handed over switch.
    const { records } = useDriverHandovers(accountId ?? "acct-001");
    const handedSet = useMemo(
        () => itemsHandedElsewhere(records, accountId ?? "acct-001"),
        [records, accountId],
    );

    // Reset filters when the carrier changes.
    useEffect(() => {
        setSearch("");
        setStatusFilter("all");
        setHandoverFilter("all");
        setActiveCat("All");
    }, [accountId]);

    // KPI counts over the full carrier scope (independent of the filters).
    const counts = useMemo(() => {
        let active = 0, expiring = 0, expired = 0, unassigned = 0;
        for (const it of items) {
            if (it.status === "Active") active++;
            else if (it.status === "Expiring Soon") expiring++;
            else if (it.status === "Expired") expired++;
            if (!it.assignedTo) unassigned++;
        }
        return { total: items.length, active, expiring, expired, unassigned };
    }, [items]);

    // The header stays put and shrinks as the list scrolls; the body is its own scroller.
    const { scrollRef, condensed, onScroll } = useCondensingHeader(handoverFilter);
    const kpiChips = useMemo(() => [
        { id: 'total', label: 'Items', value: counts.total, tone: 'text-blue-700' },
        { id: 'active', label: 'Active', value: counts.active, tone: 'text-emerald-700' },
        { id: 'expiring', label: 'Expiring', value: counts.expiring, tone: 'text-amber-700' },
        { id: 'expired', label: 'Expired', value: counts.expired, tone: 'text-rose-700' },
        { id: 'unassigned', label: 'Unassigned', value: counts.unassigned },
    ], [counts]);

    // Status + hand-over filters drive the category tabs; search narrows rows.
    const baseFiltered = useMemo(
        () => items.filter((it) => {
            if (statusFilter !== "all" && it.status !== statusFilter) return false;
            if (handoverFilter === "handed" && !handedSet.has(it.id)) return false;
            if (handoverFilter === "not" && handedSet.has(it.id)) return false;
            return true;
        }),
        [items, statusFilter, handoverFilter, handedSet],
    );

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
                    (vendor?.name ?? "").toLowerCase().includes(q) ||
                    it.serial.toLowerCase().includes(q) ||
                    it.pin.toLowerCase().includes(q)
                );
            });
    }, [baseFiltered, activeCat, search]);

    // Pagination over the filtered item rows.
    useEffect(() => { setPage(0); }, [search, statusFilter, handoverFilter, activeCat, accountId]);
    const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
    const safePage = Math.min(page, pageCount - 1);
    const pagedRows = rows.slice(safePage * perPage, safePage * perPage + perPage);

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
                    <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                        {HANDOVER_FILTERS.map((o) => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => setHandoverFilter(o.id)}
                                className={cn(
                                    "rounded-md px-3 text-sm font-semibold whitespace-nowrap transition-colors",
                                    condensed ? "py-1" : "py-1.5",
                                    handoverFilter === o.id
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-slate-600 hover:text-slate-900",
                                )}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
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
                {!handed && <CardTabs tabs={tabs} active={activeCat} onChange={setActiveCat} />}

                {/* Toolbar */}
                <div className={cn("px-5 py-3 flex items-center gap-2 flex-wrap", handed && "border-b border-slate-100")}>
                    <div className="relative flex-1 min-w-[240px] max-w-md">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={handed ? "Search drivers by name or license…" : "Search vendor, serial, or PIN…"}
                            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    {!handed && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as InventoryStatus | "all")}
                            className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Expiring Soon">Expiring Soon</option>
                            <option value="Expired">Expired</option>
                        </select>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        {handed && (
                            <Button variant="outline" size="sm" onClick={() => setDirectOpen(true)}>
                                <PackageCheck size={15} /> Hand over to driver
                            </Button>
                        )}
                        {handoverFilter !== "all" ? (
                            <Button size="sm" onClick={() => setChecklistOpen(true)}>
                                <ListChecks size={15} /> Create checklist
                            </Button>
                        ) : (
                            <Button size="sm" onClick={() => setAddOpen(true)}>
                                <Plus size={15} /> Add Inventory
                            </Button>
                        )}
                    </div>
                </div>

                {handed ? (
                    <HandedOverDrivers onNavigate={onNavigate} accountId={accountId} search={search} />
                ) : rows.length === 0 ? (
                    <div className="border-t border-slate-100 p-12 text-center">
                        <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm font-medium text-slate-600">No inventory items match your filters</p>
                        <p className="text-xs text-slate-500 mt-1">Try a different category, status, or search.</p>
                    </div>
                ) : (
                    <div className="border-t border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <TH>Vendor</TH>
                                    <TH>Serial #</TH>
                                    <TH>PIN #</TH>
                                    <TH>Issued</TH>
                                    <TH>Expires</TH>
                                    <TH>Schedule</TH>
                                    <TH>Assigned To</TH>
                                    <TH>Status</TH>
                                    <TH className="text-right">Actions</TH>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagedRows.map((item) => {
                                    const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                    const visual = visualFor(categoryIdOf(item) ?? "");
                                    const target = resolveAssignment(item.assignedTo, accountId);
                                    const vInitials = (vendor?.name ?? "?")
                                        .replace(/[^a-zA-Z0-9\s]/g, "")
                                        .split(/\s+/).filter(Boolean).slice(0, 2)
                                        .map((p) => p[0]!.toUpperCase()).join("");
                                    return (
                                        <tr key={item.id} className="even:bg-slate-50/40 hover:bg-blue-50/40 transition-colors">
                                            {/* Vendor with avatar */}
                                            <TD>
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className={cn(
                                                        "h-8 w-8 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                                                        visual.avatarBg, visual.avatarText
                                                    )}>
                                                        {vInitials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate leading-tight">{vendor?.name ?? "—"}</div>
                                                        {vendor?.companyName && (
                                                            <div className="text-[11px] text-slate-500 truncate">{vendor.companyName}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TD>
                                            <TD className="font-mono text-xs text-slate-700">{item.serial}</TD>
                                            <TD className="font-mono text-xs text-slate-700">{item.pin || <span className="text-slate-300">—</span>}</TD>
                                            <TD className="text-slate-600 text-xs">{fmtDate(item.issueDate)}</TD>
                                            <TD className="text-slate-600 text-xs">{fmtDate(item.expiryDate)}</TD>
                                            <TD>
                                                <div className="text-xs text-slate-600 leading-tight">{item.recurrence === "None" ? "One-time" : item.recurrence}</div>
                                                {item.reminder !== "None" && <div className="text-[11px] text-slate-400 leading-tight">remind {item.reminder.toLowerCase()}</div>}
                                            </TD>
                                            <TD>
                                                {target ? (
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider shrink-0",
                                                            KIND_TONE[target.tone]
                                                        )}>
                                                            <target.icon size={10} /> {target.kindLabel}
                                                        </span>
                                                        <div className="min-w-0 leading-tight">
                                                            <div className="text-sm font-semibold text-slate-900 truncate">{target.label}</div>
                                                            <div className="text-[11px] text-slate-500 truncate">{target.sub}</div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </TD>
                                            <TD>
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                    STATUS_BADGE[item.status]
                                                )}>
                                                    <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[item.status])} />
                                                    {item.status}
                                                </span>
                                            </TD>
                                            <TD className="text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => onNavigate(`/inventory/items/${item.id}`)}
                                                    title="Edit"
                                                    aria-label="Edit"
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </TD>
                                        </tr>
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

            {addOpen && (
                <AddInventoryModule
                    items={items}
                    accountId={accountId}
                    onAdd={add}
                    onClose={() => setAddOpen(false)}
                />
            )}
            {directOpen && (
                <DirectHandoverDialog accountId={accountId} onClose={() => setDirectOpen(false)} />
            )}
            {checklistOpen && (
                <ChecklistHandoverPicker accountId={accountId} onNavigate={onNavigate} onClose={() => setChecklistOpen(false)} />
            )}
        </div>
    );
}

// ── Handed-over view: inventory grouped by the driver holding it ────────────

const driverName = (d: any) => (d?.name ?? `${d?.firstName ?? ""} ${d?.lastName ?? ""}`.trim()) || "Driver";
const driverInitials = (d: any) => driverName(d).split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
const AVATAR_TONES = [
    "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-violet-100 text-violet-700",
    "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700",
    "bg-indigo-100 text-indigo-700", "bg-cyan-100 text-cyan-700",
];
const avatarTone = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

const HANDED_STATUS_CHIP: Record<HandoverStatus, { label: string; cls: string; dot: string; icon?: React.ElementType }> = {
    "not-issued": { label: "Draft", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
    "handed-over": { label: "Handed over · awaiting driver", cls: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
    "verified": { label: "Verified by driver", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", icon: CircleCheck },
};

function HandedOverDrivers({ onNavigate, accountId, search }: {
    onNavigate: (path: string) => void;
    accountId?: string;
    search: string;
}) {
    const acct = accountId ?? "acct-001";
    const { records } = useDriverHandovers(acct);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [directFor, setDirectFor] = useState<string | null>(null);

    const drivers = useMemo(() => CARRIER_DRIVERS[acct] || CARRIER_DRIVERS["acct-001"] || [], [acct]);
    const itemById = useMemo(() => {
        const all = accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS;
        const m = new Map<string, InventoryItem>();
        for (const it of all) m.set(it.id, it);
        return m;
    }, [accountId]);

    const rows = useMemo(() => {
        const out: {
            driver: any; status: HandoverStatus; assigneeName?: string;
            groups: ReturnType<typeof buildDriverGroups>; total: number; verifiedCount: number;
        }[] = [];
        for (const d of drivers) {
            const rec = records[`${acct}::${d.id}`];
            if (!rec || rec.lines.length === 0) continue;
            out.push({
                driver: d, status: handoverStatusOf(rec), assigneeName: rec.assigneeName,
                groups: buildDriverGroups(rec, itemById), total: rec.lines.length, verifiedCount: rec.verifiedItemIds?.length ?? 0,
            });
        }
        return out;
    }, [drivers, records, acct, itemById]);

    const q = search.trim().toLowerCase();
    const shown = q
        ? rows.filter((r) => driverName(r.driver).toLowerCase().includes(q) || ((r.driver as any).licenseNumber ?? "").toLowerCase().includes(q))
        : rows;

    if (shown.length === 0) {
        return (
            <div className="border-t border-slate-100 p-12 text-center">
                <UserRound size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No drivers are holding inventory</p>
                <p className="text-xs text-slate-500 mt-1">Hand keys, devices or equipment over to a driver and it'll show here, grouped by driver.</p>
            </div>
        );
    }

    return (
        <>
        <div className="border-t border-slate-100 divide-y divide-slate-100">
            {shown.map((r) => {
                const open = !!expanded[r.driver.id];
                const chip = HANDED_STATUS_CHIP[r.status];
                const ChipIcon = chip.icon;
                const lic = (r.driver as any).licenseNumber as string | undefined;
                return (
                    <div key={r.driver.id}>
                        {/* Driver header row */}
                        <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                            <button
                                type="button"
                                onClick={() => setExpanded((e) => ({ ...e, [r.driver.id]: !e[r.driver.id] }))}
                                className="flex items-center gap-3 min-w-0 flex-1 text-left"
                            >
                                {open ? <ChevronDown size={17} className="text-slate-400 shrink-0" /> : <ChevronRight size={17} className="text-slate-400 shrink-0" />}
                                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ring-1 ring-black/5", avatarTone(r.driver.id))}>
                                    {driverInitials(r.driver)}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900 truncate">{driverName(r.driver)}</div>
                                    <div className="text-[11px] text-slate-500 truncate">
                                        {lic ? `License ${lic}` : ""}{lic && r.assigneeName ? " · " : ""}{r.assigneeName ? `by ${r.assigneeName}` : ""}
                                    </div>
                                </div>
                            </button>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={cn("hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", chip.cls)}>
                                    {ChipIcon ? <ChipIcon size={13} /> : <span className={cn("h-1.5 w-1.5 rounded-full", chip.dot)} />}
                                    {chip.label}
                                </span>
                                <span className="hidden lg:inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 whitespace-nowrap tabular-nums">
                                    {r.total} item{r.total === 1 ? "" : "s"} · {r.verifiedCount}/{r.total} verified
                                </span>
                                <Button variant="outline" size="sm" onClick={() => setDirectFor(r.driver.id)}>
                                    <PackageCheck size={14} /> Hand over
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => onNavigate(`/inventory/take-back/${r.driver.id}`)}>
                                    <Undo2 size={14} /> Take back
                                </Button>
                            </div>
                        </div>

                        {/* Items grouped by category (read-only; take-back is done from the module) */}
                        {open && (
                            <div className="bg-slate-50/40 px-5 py-3 space-y-4">
                                {r.groups.map((g) => {
                                    const visual = visualFor(g.id);
                                    const Icon = visual.icon;
                                    return (
                                        <div key={g.id}>
                                            <div className="mb-1.5 flex items-center gap-2">
                                                <div className={cn("h-6 w-6 rounded-md flex items-center justify-center", visual.bg, visual.text)}><Icon size={13} /></div>
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{g.name}</p>
                                            </div>
                                            <div className="space-y-1.5">
                                                {g.lines.map(({ item, qty, verified, requested }) => {
                                                    const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                                    return (
                                                        <div key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-sm font-semibold text-slate-900 truncate">{vendor?.name ?? "—"}</div>
                                                                <div className="text-[11px] text-slate-500 font-mono truncate">{item.serial}{item.pin ? ` · PIN ${item.pin}` : ""}</div>
                                                            </div>
                                                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">Qty {qty}</span>
                                                            {requested ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"><Undo2 size={11} /> Return requested</span>
                                                            ) : verified ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0"><CircleCheck size={11} /> Received</span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0">Pending</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
        {directFor && (
            <DirectHandoverDialog accountId={accountId} driverId={directFor} onClose={() => setDirectFor(null)} />
        )}
        </>
    );
}

// ── Category sub-tabs (carrier-compliance style) ───────────────────────────

function CardTabs<T extends string>({ tabs, active, onChange }: {
    tabs: { id: T; label: string; count: number }[];
    active: T;
    onChange: (t: T) => void;
}) {
    return (
        <div className="border-b border-slate-200 bg-slate-50/40 px-5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 -mb-px">
                {tabs.map((t) => {
                    const isActive = active === t.id;
                    return (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange(t.id)}
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
            </div>
        </div>
    );
}
