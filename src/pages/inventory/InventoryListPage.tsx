import { useMemo, useState } from "react";
import {
    Plus, Download, Building2, ChevronRight, ChevronDown, Search,
    Truck, IdCard, Mail, Phone, FileText,
    Fuel, Radio, Activity, Map as MapIcon, Camera, Wrench, Layers,
} from "lucide-react";
import {
    INVENTORY_ITEMS,
    VENDORS,
    VENDOR_TYPES,
    ACME_ASSETS,
    ACME_DRIVERS,
    CARRIER_NAME,
    type InventoryItem,
    type InventoryStatus,
    type VendorType,
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

// ── Per-type visual treatment ──────────────────────────────────────────────

const TYPE_VISUAL: Record<string, { icon: React.ElementType; tone: string; bg: string; text: string }> = {
    "fuel-card":          { icon: Fuel,     tone: "amber",   bg: "bg-amber-50",   text: "text-amber-700" },
    "transponder":        { icon: Radio,    tone: "violet",  bg: "bg-violet-50",  text: "text-violet-700" },
    "eld-provider":       { icon: Activity, tone: "blue",    bg: "bg-blue-50",    text: "text-blue-700" },
    "gps-tracking":       { icon: MapIcon,  tone: "emerald", bg: "bg-emerald-50", text: "text-emerald-700" },
    "dashcam":            { icon: Camera,   tone: "cyan",    bg: "bg-cyan-50",    text: "text-cyan-700" },
    "repair-maintenance": { icon: Wrench,   tone: "slate",   bg: "bg-slate-100",  text: "text-slate-700" },
};

const DEFAULT_VISUAL = { icon: Layers, tone: "slate", bg: "bg-slate-100", text: "text-slate-700" };

const visualFor = (typeKey: string) => TYPE_VISUAL[typeKey] ?? DEFAULT_VISUAL;

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

// ── Page ───────────────────────────────────────────────────────────────────

export function InventoryListPage({ onNavigate }: Props) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<InventoryStatus | "all">("all");
    const [items] = useState<InventoryItem[]>(INVENTORY_ITEMS);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [collapsedTypes, setCollapsedTypes] = useState<Record<string, boolean>>({});

    // 1) Filter items by search + status
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

    // 2) Group filtered items by vendor type
    const grouped = useMemo(() => {
        const map = new Map<string, { type: VendorType; items: InventoryItem[] }>();
        // Seed with all known types so empty blocks can still render in order
        for (const t of VENDOR_TYPES) map.set(t.key, { type: t, items: [] });
        for (const item of matched) {
            const vendor = VENDORS.find((v) => v.id === item.vendorId);
            if (!vendor) continue;
            const t = VENDOR_TYPES.find((x) => x.key === vendor.type);
            if (!t) continue;
            map.get(t.key)!.items.push(item);
        }
        return Array.from(map.values());
    }, [matched]);

    // Counts for the header summary
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
                        <span className="font-semibold text-slate-700">{totalAll}</span> items, grouped by vendor type
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

            {/* Toolbar — search + status filter */}
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
                    <button
                        type="button"
                        onClick={() => setCollapsedTypes({})}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Expand all
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                        type="button"
                        onClick={() => {
                            const all: Record<string, boolean> = {};
                            for (const g of grouped) all[g.type.key] = true;
                            setCollapsedTypes(all);
                        }}
                        className="text-blue-600 hover:underline font-medium"
                    >
                        Collapse all
                    </button>
                </div>
            </div>

            {/* Empty state when nothing matches at all */}
            {totalShown === 0 && (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <Layers size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No inventory items match your filters</p>
                    <p className="text-xs text-slate-500 mt-1">Try clearing the search or status filter.</p>
                </div>
            )}

            {/* One block per vendor type */}
            {totalShown > 0 && (
                <div className="space-y-5">
                    {grouped.map((g) => {
                        if (g.items.length === 0) return null;
                        const collapsed = !!collapsedTypes[g.type.key];
                        return (
                            <TypeBlock
                                key={g.type.key}
                                type={g.type}
                                items={g.items}
                                collapsed={collapsed}
                                onToggleCollapse={() =>
                                    setCollapsedTypes((prev) => ({ ...prev, [g.type.key]: !prev[g.type.key] }))
                                }
                                expandedId={expandedId}
                                onToggleRow={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ── Per-type block ─────────────────────────────────────────────────────────

function TypeBlock({
    type, items, collapsed, onToggleCollapse, expandedId, onToggleRow,
}: {
    type: VendorType;
    items: InventoryItem[];
    collapsed: boolean;
    onToggleCollapse: () => void;
    expandedId: string | null;
    onToggleRow: (id: string) => void;
}) {
    const visual = visualFor(type.key);
    const Icon = visual.icon;

    return (
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            {/* Block header */}
            <button
                type="button"
                onClick={onToggleCollapse}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-left"
            >
                <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    visual.bg, visual.text
                )}>
                    <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">{type.label}</h2>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                            {items.length} item{items.length === 1 ? "" : "s"}
                        </span>
                        {type.multiAsset && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Multi-asset
                            </span>
                        )}
                    </div>
                </div>
                {collapsed ? <ChevronRight size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
            </button>

            {/* Block table */}
            {!collapsed && (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50/60 border-b border-slate-200">
                            <tr>
                                <TH className="w-10"></TH>
                                <TH>Vendor</TH>
                                <TH>Serial #</TH>
                                <TH>PIN #</TH>
                                <TH>Issue Date</TH>
                                <TH>Expiry Date</TH>
                                <TH>Recurrence</TH>
                                <TH>Reminder</TH>
                                <TH>Status</TH>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item) => {
                                const vendor = VENDORS.find((v) => v.id === item.vendorId);
                                const isExpanded = expandedId === item.id;
                                return (
                                    <RowGroup
                                        key={item.id}
                                        item={item}
                                        vendorName={vendor?.name}
                                        isExpanded={isExpanded}
                                        onToggle={() => onToggleRow(item.id)}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

// ── Row + expanded detail ──────────────────────────────────────────────────

function RowGroup({
    item, vendorName, isExpanded, onToggle,
}: {
    item: InventoryItem;
    vendorName?: string;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <>
            <tr
                className={cn(
                    "transition-colors cursor-pointer",
                    isExpanded ? "bg-blue-50/40" : "hover:bg-slate-50/60"
                )}
                onClick={onToggle}
            >
                <TD className="w-10 text-slate-400">
                    <ChevronRight
                        size={16}
                        className={cn("transition-transform", isExpanded && "rotate-90 text-blue-600")}
                    />
                </TD>
                <TD className="font-semibold text-slate-900">{vendorName ?? "—"}</TD>
                <TD className="font-mono text-xs text-slate-700">{item.serial}</TD>
                <TD className="font-mono text-xs text-slate-700">{item.pin}</TD>
                <TD className="text-slate-600">{fmtDate(item.issueDate)}</TD>
                <TD className="text-slate-600">{fmtDate(item.expiryDate)}</TD>
                <TD className="text-slate-600">{item.recurrence}</TD>
                <TD className="text-slate-600">{item.reminder}</TD>
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
            {isExpanded && (
                <tr className="bg-slate-50/70 border-y border-slate-200">
                    <td colSpan={9} className="px-6 py-5">
                        <ExpandedDetail item={item} />
                    </td>
                </tr>
            )}
        </>
    );
}

function ExpandedDetail({ item }: { item: InventoryItem }) {
    const assets = (item.assignedAssetIds ?? []).map((id) => ACME_ASSETS.find((a) => a.id === id)).filter(Boolean);
    const drivers = (item.assignedDriverIds ?? []).map((id) => ACME_DRIVERS.find((d) => d.id === id)).filter(Boolean);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Assigned Assets */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider inline-flex items-center gap-2">
                        <Truck size={13} /> Assigned Assets
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        {assets.length}
                    </span>
                </div>
                {assets.length === 0 ? (
                    <div className="px-4 py-6 text-xs text-slate-400 text-center">No assets assigned.</div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {assets.map((a) => (
                            <li key={a!.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                        <Truck size={14} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{a!.unitNumber}</div>
                                        <div className="text-xs text-slate-500 truncate">{a!.year} {a!.make} {a!.model}</div>
                                    </div>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0">
                                    {a!.assetCategory}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Assigned Drivers */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider inline-flex items-center gap-2">
                        <IdCard size={13} /> Assigned Drivers
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        {drivers.length}
                    </span>
                </div>
                {drivers.length === 0 ? (
                    <div className="px-4 py-6 text-xs text-slate-400 text-center">No drivers assigned.</div>
                ) : (
                    <ul className="divide-y divide-slate-100">
                        {drivers.map((d) => (
                            <li key={d!.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-semibold shrink-0">
                                        {d!.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-slate-900 truncate">{d!.name}</div>
                                        <div className="text-xs text-slate-500 inline-flex items-center gap-1">
                                            <IdCard size={10} /> {d!.licenseNumber}
                                        </div>
                                    </div>
                                </div>
                                <span className={cn(
                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
                                    d!.status === "Active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : "bg-slate-100 text-slate-500 border-slate-200"
                                )}>
                                    {d!.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Contact + Notes */}
            {(item.contactName || item.contactInfo || item.notes) && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden lg:col-span-2">
                    <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/60">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider inline-flex items-center gap-2">
                            <FileText size={13} /> Contact & Notes
                        </h4>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        {item.contactName && (
                            <div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Contact</div>
                                <div className="text-slate-900 font-medium">{item.contactName}</div>
                            </div>
                        )}
                        {item.contactInfo && (
                            <div>
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Reach Out</div>
                                <div className="text-slate-700 inline-flex items-center gap-1">
                                    {item.contactInfo.includes("@") ? <Mail size={12} /> : <Phone size={12} />}
                                    {item.contactInfo}
                                </div>
                            </div>
                        )}
                        {item.notes && (
                            <div className="md:col-span-3">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Notes</div>
                                <div className="text-slate-600 italic">{item.notes}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
