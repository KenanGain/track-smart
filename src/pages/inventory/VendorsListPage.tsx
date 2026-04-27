import { useMemo, useState } from "react";
import { Plus, Building2, Mail, Phone, MapPin, Tag } from "lucide-react";
import { DataListToolbar, PaginationBar, type ColumnDef } from "@/components/ui/DataListToolbar";
import { VendorCategoriesModal } from "./VendorCategoriesModal";
import {
    VENDORS,
    VENDOR_CATEGORIES,
    VENDOR_TYPE_LABELS,
    CARRIER_NAME,
    formatVendorAddress,
    type Vendor,
    type VendorCategory,
} from "./inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
};

const ALL_COLUMNS: ColumnDef[] = [
    { id: "vendor", label: "Vendor", visible: true },
    { id: "category", label: "Category", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "address", label: "Address", visible: true },
    { id: "contact", label: "Contact", visible: true },
    { id: "status", label: "Status", visible: true },
];

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap", className)}>
        {children}
    </th>
);
const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={cn("px-4 py-3 text-sm align-middle", className)}>{children}</td>
);

export function VendorsListPage({ onNavigate }: Props) {
    const [search, setSearch] = useState("");
    const [columns, setColumns] = useState<ColumnDef[]>(ALL_COLUMNS);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [vendors] = useState<Vendor[]>(VENDORS);
    const [categories, setCategories] = useState<VendorCategory[]>(VENDOR_CATEGORIES);
    const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

    const colVisible = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c.visible])), [columns]);
    const toggleColumn = (id: string) =>
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return vendors.filter((v) => {
            if (!q) return true;
            return (
                v.name.toLowerCase().includes(q) ||
                (v.companyName ?? "").toLowerCase().includes(q) ||
                (v.email ?? "").toLowerCase().includes(q) ||
                VENDOR_TYPE_LABELS[v.type].toLowerCase().includes(q) ||
                formatVendorAddress(v.address).toLowerCase().includes(q)
            );
        });
    }, [search, vendors]);

    const paged = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filtered.slice(start, start + rowsPerPage);
    }, [filtered, page, rowsPerPage]);

    const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

    return (
        <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 size={14} />
                        <span className="font-medium">{CARRIER_NAME}</span>
                        <span>/</span>
                        <span>Inventory</span>
                        <span>/</span>
                        <span>Vendors</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {vendors.length} vendor{vendors.length === 1 ? "" : "s"} across {categories.length} categor{categories.length === 1 ? "y" : "ies"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCategoriesModalOpen(true)}
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 shadow-sm"
                    >
                        <Tag size={15} /> Categories
                    </button>
                    <button
                        onClick={() => onNavigate("/inventory/vendors/new")}
                        className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                    >
                        <Plus size={15} /> Add Vendor
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <DataListToolbar
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    searchPlaceholder="Search vendors..."
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
                                {colVisible.vendor && <TH>Vendor</TH>}
                                {colVisible.category && <TH>Category</TH>}
                                {colVisible.type && <TH>Type</TH>}
                                {colVisible.address && <TH>Address</TH>}
                                {colVisible.contact && <TH>Contact</TH>}
                                {colVisible.status && <TH>Status</TH>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-16 text-slate-400 text-sm">
                                        No vendors match your filters.
                                    </td>
                                </tr>
                            )}
                            {paged.map((v) => (
                                <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                                    {colVisible.vendor && (
                                        <TD>
                                            <div className="font-semibold text-slate-900">{v.name}</div>
                                            {v.companyName && <div className="text-xs text-slate-500">{v.companyName}</div>}
                                        </TD>
                                    )}
                                    {colVisible.category && <TD className="text-sm text-slate-600">{categoryName(v.categoryId)}</TD>}
                                    {colVisible.type && <TD className="text-sm text-slate-600">{VENDOR_TYPE_LABELS[v.type]}</TD>}
                                    {colVisible.address && (
                                        <TD>
                                            {v.address && formatVendorAddress(v.address) ? (
                                                <div className="flex items-start gap-1.5 text-sm text-slate-600 max-w-xs">
                                                    <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
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
                                    {colVisible.contact && (
                                        <TD>
                                            {v.email && (
                                                <div className="text-sm text-slate-600 inline-flex items-center gap-1.5">
                                                    <Mail size={12} className="text-slate-400" /> {v.email}
                                                </div>
                                            )}
                                            {v.phone && (
                                                <div className="text-sm text-slate-500 inline-flex items-center gap-1.5 mt-0.5">
                                                    <Phone size={12} className="text-slate-400" /> {v.phone}
                                                </div>
                                            )}
                                            {!v.email && !v.phone && <span className="text-sm text-slate-400">—</span>}
                                        </TD>
                                    )}
                                    {colVisible.status && (
                                        <TD>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                v.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                            )}>
                                                <span className={cn(
                                                    "mr-1.5 h-1.5 w-1.5 rounded-full",
                                                    v.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                                                )} />
                                                {v.status}
                                            </span>
                                        </TD>
                                    )}
                                </tr>
                            ))}
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

            <VendorCategoriesModal
                open={categoriesModalOpen}
                onClose={() => setCategoriesModalOpen(false)}
                categories={categories}
                vendors={vendors}
                onChange={setCategories}
            />
        </div>
    );
}
