import { useMemo, useState } from "react";
import { Plus, Download, Building2, ChevronRight, Truck, IdCard, Mail, Phone, FileText } from "lucide-react";
import { DataListToolbar, PaginationBar, type ColumnDef } from "@/components/ui/DataListToolbar";
import {
    INVENTORY_ITEMS,
    VENDORS,
    ACME_ASSETS,
    ACME_DRIVERS,
    VENDOR_TYPE_LABELS,
    CARRIER_NAME,
    type InventoryItem,
    type InventoryStatus,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
};

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

const ALL_COLUMNS: ColumnDef[] = [
    { id: "vendorName", label: "Vendor Name", visible: true },
    { id: "vendorType", label: "Vendor Type", visible: true },
    { id: "serial", label: "Serial #", visible: true },
    { id: "pin", label: "PIN #", visible: true },
    { id: "issueDate", label: "Issue Date", visible: true },
    { id: "expiryDate", label: "Expiry Date", visible: true },
    { id: "recurrence", label: "Recurrence", visible: true },
    { id: "reminder", label: "Reminder", visible: true },
    { id: "status", label: "Status", visible: true },
];

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

export function InventoryListPage({ onNavigate }: Props) {
    const [search, setSearch] = useState("");
    const [columns, setColumns] = useState<ColumnDef[]>(ALL_COLUMNS);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [items] = useState<InventoryItem[]>(INVENTORY_ITEMS);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const colVisible = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c.visible])), [columns]);
    const toggleColumn = (id: string) =>
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));

    const visibleColCount = columns.filter((c) => c.visible).length + 1; // +1 for chevron col

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items
            .map((item) => ({ item, vendor: VENDORS.find((v) => v.id === item.vendorId) }))
            .filter(({ item, vendor }) => {
                if (!vendor) return false;
                if (!q) return true;
                return (
                    vendor.name.toLowerCase().includes(q) ||
                    VENDOR_TYPE_LABELS[vendor.type].toLowerCase().includes(q) ||
                    item.serial.toLowerCase().includes(q) ||
                    item.pin.toLowerCase().includes(q)
                );
            });
    }, [search, items]);

    const paged = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filtered.slice(start, start + rowsPerPage);
    }, [filtered, page, rowsPerPage]);

    return (
        <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
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
                        {items.length} items across {VENDORS.length} vendors · click a row to view assignments
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

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <DataListToolbar
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    searchPlaceholder="Search vendor, serial, or PIN..."
                    columns={columns}
                    onToggleColumn={toggleColumn}
                    totalItems={filtered.length}
                    currentPage={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={setRowsPerPage}
                />

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <TH className="w-10"></TH>
                                {colVisible.vendorName && <TH>Vendor Name</TH>}
                                {colVisible.vendorType && <TH>Vendor Type</TH>}
                                {colVisible.serial && <TH>Serial #</TH>}
                                {colVisible.pin && <TH>PIN #</TH>}
                                {colVisible.issueDate && <TH>Issue Date</TH>}
                                {colVisible.expiryDate && <TH>Expiry Date</TH>}
                                {colVisible.recurrence && <TH>Recurrence</TH>}
                                {colVisible.reminder && <TH>Reminder</TH>}
                                {colVisible.status && <TH>Status</TH>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={visibleColCount} className="text-center py-16 text-slate-400 text-sm">
                                        No inventory items match your filters.
                                    </td>
                                </tr>
                            )}
                            {paged.map(({ item, vendor }) => {
                                const isExpanded = expandedId === item.id;
                                return (
                                    <RowGroup
                                        key={item.id}
                                        item={item}
                                        vendorName={vendor?.name}
                                        vendorTypeLabel={vendor ? VENDOR_TYPE_LABELS[vendor.type] : undefined}
                                        isExpanded={isExpanded}
                                        onToggle={() => setExpandedId(isExpanded ? null : item.id)}
                                        colVisible={colVisible}
                                        colSpan={visibleColCount}
                                    />
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <PaginationBar
                    totalItems={filtered.length}
                    currentPage={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={(r) => { setRowsPerPage(r); setPage(1); }}
                />
            </div>
        </div>
    );
}

// ── Expandable Row ──────────────────────────────────────────────────────────

function RowGroup({
    item, vendorName, vendorTypeLabel, isExpanded, onToggle, colVisible, colSpan,
}: {
    item: InventoryItem;
    vendorName?: string;
    vendorTypeLabel?: string;
    isExpanded: boolean;
    onToggle: () => void;
    colVisible: Record<string, boolean>;
    colSpan: number;
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
                {colVisible.vendorName && <TD className="font-semibold text-slate-900">{vendorName ?? "—"}</TD>}
                {colVisible.vendorType && <TD className="text-slate-600">{vendorTypeLabel ?? "—"}</TD>}
                {colVisible.serial && <TD className="font-mono text-xs text-slate-700">{item.serial}</TD>}
                {colVisible.pin && <TD className="font-mono text-xs text-slate-700">{item.pin}</TD>}
                {colVisible.issueDate && <TD className="text-slate-600">{fmtDate(item.issueDate)}</TD>}
                {colVisible.expiryDate && <TD className="text-slate-600">{fmtDate(item.expiryDate)}</TD>}
                {colVisible.recurrence && <TD className="text-slate-600">{item.recurrence}</TD>}
                {colVisible.reminder && <TD className="text-slate-600">{item.reminder}</TD>}
                {colVisible.status && (
                    <TD>
                        <span className={cn(
                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                            STATUS_BADGE[item.status]
                        )}>
                            <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[item.status])} />
                            {item.status}
                        </span>
                    </TD>
                )}
            </tr>
            {isExpanded && (
                <tr className="bg-slate-50/70 border-y border-slate-200">
                    <td colSpan={colSpan} className="px-6 py-5">
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
