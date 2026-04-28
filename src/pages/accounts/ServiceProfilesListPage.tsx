import { useMemo, useState } from "react";
import {
    Mail, Phone, MapPin, Briefcase, Hash, Eye, Edit2, Download,
    Infinity as InfinityIcon, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import { DataListToolbar, PaginationBar, type ColumnDef } from "@/components/ui/DataListToolbar";
import {
    SERVICE_PROFILES_DB,
    formatLimit,
    isUnlimitedLimit,
    type ServiceProfile,
    type ServiceProfileStatus,
} from "./service-profiles.data";
import { ServiceProfileViewModal } from "./ServiceProfileViewModal";
import { ServiceProfileEditModal } from "./ServiceProfileEditModal";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate?: (path: string) => void;
};

const ALL_COLUMNS: ColumnDef[] = [
    { id: "service", label: "Service Profile", visible: true },
    { id: "stateBiz", label: "State / Business Type", visible: true },
    { id: "address", label: "Legal Address", visible: true },
    { id: "contact", label: "Contact", visible: true },
    { id: "limit", label: "Account Limit", visible: true },
    { id: "createdAt", label: "Created", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "actions", label: "Actions", visible: true },
];

const STATUS_BADGE: Record<ServiceProfileStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_DOT: Record<ServiceProfileStatus, string> = {
    Active: "bg-emerald-500",
    Inactive: "bg-slate-400",
    Pending: "bg-amber-500",
    Suspended: "bg-red-500",
};

type SortKey = "legalName" | "stateOfInc" | "businessType" | "accountsCreated" | "createdAt" | "status";
type SortDir = "asc" | "desc";

export function ServiceProfilesListPage(_: Props = {}) {
    const [search, setSearch] = useState("");
    const [columns, setColumns] = useState<ColumnDef[]>(ALL_COLUMNS);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>({ key: "legalName", dir: "asc" });
    const [profiles, setProfiles] = useState<ServiceProfile[]>(SERVICE_PROFILES_DB);
    const [viewing, setViewing] = useState<ServiceProfile | null>(null);
    const [editing, setEditing] = useState<ServiceProfile | null>(null);

    const colVisible = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c.visible])), [columns]);
    const toggleColumn = (id: string) =>
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));

    const handleSort = (key: SortKey) => {
        setSort((prev) => {
            if (!prev || prev.key !== key) return { key, dir: "asc" };
            if (prev.dir === "asc") return { key, dir: "desc" };
            return null;
        });
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return profiles.filter((p) => {
            if (!q) return true;
            return (
                p.legalName.toLowerCase().includes(q) ||
                (p.dbaName ?? "").toLowerCase().includes(q) ||
                p.businessType.toLowerCase().includes(q) ||
                p.stateOfInc.toLowerCase().includes(q) ||
                (p.contactEmail ?? "").toLowerCase().includes(q)
            );
        });
    }, [profiles, search]);

    const sorted = useMemo(() => {
        if (!sort) return filtered;
        const dir = sort.dir === "asc" ? 1 : -1;
        return [...filtered].sort((a, b) => {
            const va = (a as any)[sort.key];
            const vb = (b as any)[sort.key];
            if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
            return String(va ?? "").localeCompare(String(vb ?? "")) * dir;
        });
    }, [filtered, sort]);

    const paged = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return sorted.slice(start, start + rowsPerPage);
    }, [sorted, page, rowsPerPage]);

    const handleSaveProfile = (next: ServiceProfile) => {
        setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    };

    const handleExport = () => {
        const headers = ["Legal Name", "DBA", "State of Inc", "Business Type", "Status", "Account Limit", "Created"];
        const rows = sorted.map((p) => [
            p.legalName,
            p.dbaName ?? "",
            p.stateOfInc,
            p.businessType,
            p.status,
            isUnlimitedLimit(p.accountLimit) ? "Unlimited" : `${p.accountsCreated}/${p.accountLimit}`,
            p.createdAt,
        ]);
        const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "service-profiles.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-slate-50">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <DataListToolbar
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    searchPlaceholder="Search service profiles…"
                    columns={columns}
                    onToggleColumn={toggleColumn}
                    totalItems={filtered.length}
                    currentPage={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={setRowsPerPage}
                />

                <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-end gap-2 bg-slate-50/40">
                    <button
                        onClick={handleExport}
                        className="h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-sm"
                    >
                        <Download size={13} /> Export CSV
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {colVisible.service && <SortHeader label="Service Profile" sortKey="legalName" sort={sort} onSort={handleSort} />}
                                {colVisible.stateBiz && <SortHeader label="State / Business Type" sortKey="stateOfInc" sort={sort} onSort={handleSort} />}
                                {colVisible.address && <TH>Legal Address</TH>}
                                {colVisible.contact && <TH>Contact</TH>}
                                {colVisible.limit && <SortHeader label="Account Limit" sortKey="accountsCreated" sort={sort} onSort={handleSort} />}
                                {colVisible.createdAt && <SortHeader label="Created" sortKey="createdAt" sort={sort} onSort={handleSort} />}
                                {colVisible.status && <SortHeader label="Status" sortKey="status" sort={sort} onSort={handleSort} />}
                                {colVisible.actions && <TH className="text-right pr-6">Actions</TH>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                                        No service profiles match your filters.
                                    </td>
                                </tr>
                            )}
                            {paged.map((p) => {
                                const initials = p.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
                                const utilization = isUnlimitedLimit(p.accountLimit) ? null : Math.round((p.accountsCreated / Math.max(1, p.accountLimit)) * 100);
                                return (
                                    <tr key={p.id} onClick={() => setViewing(p)} className="hover:bg-slate-50/60 transition-colors cursor-pointer">
                                        {colVisible.service && (
                                            <TD>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">{initials}</div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate">{p.legalName}</div>
                                                        {p.dbaName && <div className="text-xs text-slate-500 truncate">DBA {p.dbaName}</div>}
                                                    </div>
                                                </div>
                                            </TD>
                                        )}
                                        {colVisible.stateBiz && (
                                            <TD>
                                                <div className="text-sm text-slate-700 inline-flex items-center gap-1.5">
                                                    <Hash size={11} className="text-slate-400" /> {p.stateOfInc}
                                                </div>
                                                <div className="text-xs text-slate-500 inline-flex items-center gap-1.5 mt-0.5">
                                                    <Briefcase size={11} className="text-slate-400" /> {p.businessType}
                                                </div>
                                            </TD>
                                        )}
                                        {colVisible.address && (
                                            <TD className="text-sm text-slate-600">
                                                <div className="inline-flex items-start gap-1.5 max-w-xs">
                                                    <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                                    <span className="leading-snug">
                                                        {p.legalAddress.street}{p.legalAddress.apt ? `, ${p.legalAddress.apt}` : ""}<br />
                                                        {p.legalAddress.city}, {p.legalAddress.state} {p.legalAddress.zip}
                                                    </span>
                                                </div>
                                            </TD>
                                        )}
                                        {colVisible.contact && (
                                            <TD>
                                                {p.contactEmail && <div className="text-xs text-slate-600 inline-flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {p.contactEmail}</div>}
                                                {p.contactPhone && <div className="text-xs text-slate-500 inline-flex items-center gap-1.5 mt-0.5"><Phone size={11} className="text-slate-400" /> {p.contactPhone}</div>}
                                                {!p.contactEmail && !p.contactPhone && <span className="text-xs text-slate-400">—</span>}
                                            </TD>
                                        )}
                                        {colVisible.limit && (
                                            <TD>
                                                <div className="flex items-center gap-2">
                                                    {isUnlimitedLimit(p.accountLimit) ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold">
                                                            <InfinityIcon size={12} /> Unlimited
                                                        </span>
                                                    ) : (
                                                        <span className="text-sm font-semibold text-slate-900 tabular-nums">{p.accountsCreated} / {formatLimit(p.accountLimit)}</span>
                                                    )}
                                                    {utilization !== null && (
                                                        <span className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden inline-block">
                                                            <span className={cn("block h-full rounded-full", utilization < 70 ? "bg-emerald-500" : utilization < 90 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${utilization}%` }} />
                                                        </span>
                                                    )}
                                                </div>
                                            </TD>
                                        )}
                                        {colVisible.createdAt && <TD className="text-xs text-slate-500">{p.createdAt}</TD>}
                                        {colVisible.status && (
                                            <TD>
                                                <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_BADGE[p.status])}>
                                                    <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[p.status])} />
                                                    {p.status}
                                                </span>
                                            </TD>
                                        )}
                                        {colVisible.actions && (
                                            <TD className="text-right pr-6" onClick={(e) => e.stopPropagation()}>
                                                <div className="inline-flex items-center gap-1">
                                                    <ActionBtn icon={Eye} title="View profile" onClick={() => setViewing(p)} />
                                                    <ActionBtn icon={Edit2} title="Edit profile" onClick={() => setEditing(p)} />
                                                </div>
                                            </TD>
                                        )}
                                    </tr>
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

            <ServiceProfileViewModal
                profile={viewing}
                onClose={() => setViewing(null)}
                onEdit={(p) => setEditing(p)}
            />
            <ServiceProfileEditModal
                profile={editing}
                onClose={() => setEditing(null)}
                onSave={handleSaveProfile}
            />
        </div>
    );
}

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap", className)}>
        {children}
    </th>
);
const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn("px-4 py-3 text-sm align-middle", className)}>{children}</td>
);

function SortHeader({
    label, sortKey, sort, onSort,
}: { label: string; sortKey: SortKey; sort: { key: SortKey; dir: SortDir } | null; onSort: (k: SortKey) => void }) {
    const isActive = sort?.key === sortKey;
    const Icon = !isActive ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className={cn(
                    "inline-flex items-center gap-1.5 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                )}
            >
                {label} <Icon size={12} className={isActive ? "text-blue-600" : "text-slate-400"} />
            </button>
        </th>
    );
}

function ActionBtn({ icon: Icon, title, onClick }: { icon: React.ElementType; title: string; onClick: () => void }) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={onClick}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
            <Icon size={14} />
        </button>
    );
}
