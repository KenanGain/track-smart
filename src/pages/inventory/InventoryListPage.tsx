import { useMemo, useState } from "react";
import {
    Plus, Download, Building2, ChevronRight, ChevronDown, Search,
    Truck, IdCard,
    Fuel, Radio, Activity, Map as MapIcon, Camera, Wrench, Layers,
} from "lucide-react";
import {
    INVENTORY_ITEMS,
    VENDORS,
    VENDOR_CATEGORIES,
    ACME_ASSETS,
    ACME_DRIVERS,
    CARRIER_NAME,
    type InventoryItem,
    type InventoryStatus,
    type VendorCategory,
    type Assignment,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
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

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap", className)}>
        {children}
    </th>
);
const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={cn("px-4 py-3 text-sm whitespace-nowrap align-middle", className)}>{children}</td>
);

function resolveAssignment(a: Assignment | undefined) {
    if (!a) return null;
    if (a.kind === "driver") {
        const driver = ACME_DRIVERS.find((d) => d.id === a.targetId);
        if (!driver) return { label: "—", sub: "Unknown driver", icon: IdCard, kindLabel: "Driver", tone: "slate" as const };
        return {
            label: driver.name,
            sub: `License ${driver.licenseNumber}`,
            icon: IdCard,
            kindLabel: "Driver",
            tone: "emerald" as const,
        };
    }
    const asset = ACME_ASSETS.find((x) => x.id === a.targetId);
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

export function InventoryListPage({ onNavigate }: Props) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
    const [items] = useState<InventoryItem[]>(INVENTORY_ITEMS);
    const [collapsedCats, setCollapsedCats] = useState<Record<string, boolean>>({});

    const matched = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            if (statusFilter !== "all" && item.status !== statusFilter) return false;
            if (!q) return true;
            const vendor = VENDORS.find((v) => v.id === item.vendorId);
            return (
                (vendor?.name ?? "").toLowerCase().includes(q) ||
                item.serial.toLowerCase().includes(q) ||
                item.pin.toLowerCase().includes(q)
            );
        });
    }, [items, search, statusFilter]);

    const grouped = useMemo(() => {
        const map = new Map<string, { category: VendorCategory; items: InventoryItem[] }>();
        for (const c of VENDOR_CATEGORIES) map.set(c.id, { category: c, items: [] });
        for (const item of matched) {
            const vendor = VENDORS.find((v) => v.id === item.vendorId);
            if (!vendor) continue;
            const c = VENDOR_CATEGORIES.find((x) => x.id === vendor.categoryId);
            if (!c) continue;
            map.get(c.id)!.items.push(item);
        }
        return Array.from(map.values());
    }, [matched]);

    const totalShown = matched.length;
    const totalAll = items.length;

    return (
        <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 size={14} />
                        <span className="font-medium">{CARRIER_NAME}</span>
                        <span>/</span>
                        <span>Inventory</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Showing <span className="font-semibold text-slate-700">{totalShown}</span> of{" "}
                        <span className="font-semibold text-slate-700">{totalAll}</span> items, grouped by vendor category
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 shadow-sm">
                        <Download size={15} /> Export
                    </button>
                    <button
                        onClick={() => onNavigate("/inventory/items/new")}
                        className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={15} /> Add Inventory
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 mb-5 flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search vendor, serial, or PIN…"
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
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
                <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
                    <button onClick={() => setCollapsedCats({})} className="text-blue-600 hover:underline font-medium">
                        Expand all
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                        onClick={() => {
                            const all: Record<string, boolean> = {};
                            for (const g of grouped) all[g.category.id] = true;
                            setCollapsedCats(all);
                        }}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Collapse all
                    </button>
                </div>
            </div>

            {/* Empty state */}
            {totalShown === 0 && (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No inventory items match your filters</p>
                    <p className="text-xs text-slate-500 mt-1">Try clearing the search or status filter.</p>
                </div>
            )}

            {/* One block per category */}
            {totalShown > 0 && (
                <div className="space-y-5">
                    {grouped.map((g) => {
                        if (g.items.length === 0) return null;
                        const collapsed = !!collapsedCats[g.category.id];
                        return (
                            <CategoryBlock
                                key={g.category.id}
                                category={g.category}
                                items={g.items}
                                collapsed={collapsed}
                                onToggleCollapse={() =>
                                    setCollapsedCats((prev) => ({ ...prev, [g.category.id]: !prev[g.category.id] }))
                                }
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Per-category block ─────────────────────────────────────────────────────

function CategoryBlock({
    category, items, collapsed, onToggleCollapse,
}: {
    category: VendorCategory;
    items: InventoryItem[];
    collapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const visual = visualFor(category.id);
    const Icon = visual.icon;

    // Counts for the header subtitle
    const counts = items.reduce(
        (acc, it) => {
            acc[it.status] = (acc[it.status] ?? 0) + 1;
            if (!it.assignedTo) acc.unassigned += 1;
            return acc;
        },
        { Active: 0, "Expiring Soon": 0, Expired: 0, unassigned: 0 } as Record<string, number>
    );

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
            {/* Left accent bar in the category color */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", visual.bar)} />

            {/* Block header */}
            <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full flex items-center gap-3 pl-5 pr-4 py-3.5 border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-left"
            >
                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", visual.bg, visual.text)}>
                    <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-bold text-slate-900">{category.name}</h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                            {items.length} item{items.length === 1 ? "" : "s"}
                        </span>
                        {counts["Expiring Soon"] > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider">
                                {counts["Expiring Soon"]} expiring
                            </span>
                        )}
                        {counts.Expired > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold uppercase tracking-wider">
                                {counts.Expired} expired
                            </span>
                        )}
                        {counts.unassigned > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200 text-[10px] font-bold uppercase tracking-wider">
                                {counts.unassigned} unassigned
                            </span>
                        )}
                    </div>
                    {category.description && (
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{category.description}</p>
                    )}
                </div>
                {collapsed ? <ChevronRight size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
            </button>

            {!collapsed && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/60 border-b border-slate-200">
                            <tr>
                                <TH>Vendor</TH>
                                <TH>Serial #</TH>
                                <TH>PIN #</TH>
                                <TH>Issued</TH>
                                <TH>Expires</TH>
                                <TH>Schedule</TH>
                                <TH>Assigned To</TH>
                                <TH>Status</TH>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => {
                                const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                const target = resolveAssignment(item.assignedTo);
                                const vInitials = (vendor?.name ?? "?")
                                    .replace(/[^a-zA-Z0-9\s]/g, "")
                                    .split(/\s+/).filter(Boolean).slice(0, 2)
                                    .map((p) => p[0]!.toUpperCase()).join("");
                                return (
                                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
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
                                            <div className="text-xs text-slate-600 leading-tight">{item.recurrence}</div>
                                            <div className="text-[11px] text-slate-400 leading-tight">remind {item.reminder.toLowerCase()}</div>
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
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
