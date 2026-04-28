import { useMemo, useState } from "react";
import { Plus, Building2, Mail, Shield, Users as UsersIcon, Filter, Eye, Edit2 } from "lucide-react";
import { DataListToolbar, PaginationBar, type ColumnDef } from "@/components/ui/DataListToolbar";
import {
    APP_USERS,
    ROLE_BADGE,
    ROLE_LABELS,
    getManagedAccountIds,
    type AppUser,
    type UserRole,
} from "@/data/users.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { UserViewModal } from "./UserViewModal";
import { UserEditModal } from "./UserEditModal";
import { cn } from "@/lib/utils";

type Props = {
    currentUser: AppUser;
    onNavigate: (path: string) => void;
};

const ALL_COLUMNS: ColumnDef[] = [
    { id: "user", label: "User", visible: true },
    { id: "role", label: "Role", visible: true },
    { id: "carrier", label: "Carrier", visible: true },
    { id: "title", label: "Title", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "actions", label: "Actions", visible: true },
];

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap", className)}>
        {children}
    </th>
);
const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
    <td className={cn("px-4 py-3 text-sm align-middle", className)}>{children}</td>
);

export function UsersListPage({ currentUser, onNavigate }: Props) {
    const [search, setSearch] = useState("");
    const [columns, setColumns] = useState<ColumnDef[]>(ALL_COLUMNS);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
    const [carrierFilter, setCarrierFilter] = useState<string>("all");
    const [users, setUsers] = useState<AppUser[]>(APP_USERS);
    const [viewingUser, setViewingUser] = useState<AppUser | null>(null);
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);

    const colVisible = useMemo(() => Object.fromEntries(columns.map((c) => [c.id, c.visible])), [columns]);
    const toggleColumn = (id: string) =>
        setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)));

    // Carriers visible in the filter dropdown
    const visibleCarriers = useMemo(() => {
        if (currentUser.role === "super-admin") return ACCOUNTS_DB;
        const managed = getManagedAccountIds(currentUser) ?? [];
        return ACCOUNTS_DB.filter((a) => managed.includes(a.id));
    }, [currentUser]);

    // Base list, scoped by current user role. A target user is visible when
    // any of their carriers overlaps with what the viewer manages.
    const baseUsers = useMemo(() => {
        if (currentUser.role === "super-admin") return users;
        const managed = getManagedAccountIds(currentUser) ?? [];
        return users.filter((u) => {
            if (u.role === "super-admin") return false;
            const userCarriers = getManagedAccountIds(u) ?? [];
            return userCarriers.some((id) => managed.includes(id));
        });
    }, [users, currentUser]);

    const handleSaveUser = (next: AppUser) => {
        setUsers((prev) => prev.map((u) => (u.id === next.id ? next : u)));
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return baseUsers.filter((u) => {
            if (roleFilter !== "all" && u.role !== roleFilter) return false;
            if (carrierFilter !== "all") {
                if (carrierFilter === "_platform") {
                    if (u.role !== "super-admin") return false;
                } else {
                    const userCarriers = getManagedAccountIds(u) ?? [];
                    if (!userCarriers.includes(carrierFilter)) return false;
                }
            }
            if (!q) return true;
            return (
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.title.toLowerCase().includes(q) ||
                (u.accountName ?? "").toLowerCase().includes(q)
            );
        });
    }, [baseUsers, search, roleFilter, carrierFilter]);

    const paged = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filtered.slice(start, start + rowsPerPage);
    }, [filtered, page, rowsPerPage]);

    const isSuperAdmin = currentUser.role === "super-admin";

    return (
        <div className="p-6 lg:p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Shield size={14} />
                        <span>Admin</span>
                        <span>/</span>
                        <span>Users</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Users</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {isSuperAdmin
                            ? `Showing all ${APP_USERS.length} users across the platform`
                            : `Showing ${baseUsers.length} user${baseUsers.length === 1 ? "" : "s"} in your carrier${visibleCarriers.length > 1 ? "s" : ""}`}
                    </p>
                </div>
                <button
                    onClick={() => onNavigate("/admin/users/new")}
                    className="h-9 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                >
                    <Plus size={15} /> Add User
                </button>
            </div>

            {/* Scope badge */}
            {!isSuperAdmin && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 inline-flex items-center gap-2">
                    <Building2 size={12} />
                    Scope: {visibleCarriers.map((c) => c.legalName).join(" · ") || "(no carriers)"}
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <DataListToolbar
                    searchValue={search}
                    onSearchChange={(v) => { setSearch(v); setPage(1); }}
                    searchPlaceholder="Search by name, email, or title..."
                    columns={columns}
                    onToggleColumn={toggleColumn}
                    totalItems={filtered.length}
                    currentPage={page}
                    rowsPerPage={rowsPerPage}
                    onPageChange={setPage}
                    onRowsPerPageChange={setRowsPerPage}
                />

                {/* Filter strip */}
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-wrap bg-slate-50/40">
                    <Filter size={13} className="text-slate-400" />
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value as UserRole | "all"); setPage(1); }}
                        className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    >
                        <option value="all">All Roles</option>
                        {isSuperAdmin && <option value="super-admin">Super Admin</option>}
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                    {visibleCarriers.length > 1 && (
                        <select
                            value={carrierFilter}
                            onChange={(e) => { setCarrierFilter(e.target.value); setPage(1); }}
                            className="h-8 px-2.5 rounded-md border border-slate-200 bg-white text-xs text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        >
                            <option value="all">All Carriers</option>
                            {isSuperAdmin && <option value="_platform">Platform (Super Admins)</option>}
                            {visibleCarriers.map((c) => (
                                <option key={c.id} value={c.id}>{c.legalName}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {colVisible.user && <TH>User</TH>}
                                {colVisible.role && <TH>Role</TH>}
                                {colVisible.carrier && <TH>Carrier</TH>}
                                {colVisible.title && <TH>Title</TH>}
                                {colVisible.status && <TH>Status</TH>}
                                {colVisible.actions && <TH className="text-right pr-6">Actions</TH>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-16">
                                        <div className="inline-flex flex-col items-center gap-2 text-slate-400">
                                            <UsersIcon size={28} />
                                            <p className="text-sm">No users match your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {paged.map((u) => (
                                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                                    {colVisible.user && (
                                        <TD>
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xs font-semibold shrink-0",
                                                    u.avatarGradient
                                                )}>
                                                    {u.initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div>
                                                    <div className="text-xs text-slate-500 inline-flex items-center gap-1 truncate">
                                                        <Mail size={11} className="text-slate-400" /> {u.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </TD>
                                    )}
                                    {colVisible.role && (
                                        <TD>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                ROLE_BADGE[u.role]
                                            )}>
                                                {ROLE_LABELS[u.role]}
                                            </span>
                                        </TD>
                                    )}
                                    {colVisible.carrier && (
                                        <TD className="text-sm text-slate-600">
                                            {u.role === "super-admin" ? (
                                                <span className="text-violet-700 font-medium">Platform-wide</span>
                                            ) : (() => {
                                                const ids = getManagedAccountIds(u) ?? [];
                                                if (ids.length === 0) return "—";
                                                if (ids.length === 1) {
                                                    const a = ACCOUNTS_DB.find((x) => x.id === ids[0]);
                                                    return a?.legalName ?? u.accountName ?? "—";
                                                }
                                                const primary = ACCOUNTS_DB.find((x) => x.id === ids[0]);
                                                return (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <span>{primary?.legalName ?? u.accountName ?? "—"}</span>
                                                        <span
                                                            title={ids
                                                                .map((id) => ACCOUNTS_DB.find((x) => x.id === id)?.legalName)
                                                                .filter(Boolean)
                                                                .join(", ")}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold"
                                                        >
                                                            +{ids.length - 1}
                                                        </span>
                                                    </span>
                                                );
                                            })()}
                                        </TD>
                                    )}
                                    {colVisible.title && <TD className="text-sm text-slate-600">{u.title}</TD>}
                                    {colVisible.status && (
                                        <TD>
                                            <span className={cn(
                                                "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                                u.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                    : "bg-slate-100 text-slate-500 border-slate-200"
                                            )}>
                                                <span className={cn(
                                                    "mr-1.5 h-1.5 w-1.5 rounded-full",
                                                    u.status === "Active" ? "bg-emerald-500" : "bg-slate-400"
                                                )} />
                                                {u.status}
                                            </span>
                                        </TD>
                                    )}
                                    {colVisible.actions && (
                                        <TD className="text-right pr-6">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewingUser(u)}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="View user"
                                                    aria-label="View user"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingUser(u)}
                                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Edit user"
                                                    aria-label="Edit user"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
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

            {/* View / Edit modals */}
            <UserViewModal
                user={viewingUser}
                onClose={() => setViewingUser(null)}
                onEdit={(u) => setEditingUser(u)}
            />
            <UserEditModal
                user={editingUser}
                currentUser={currentUser}
                onClose={() => setEditingUser(null)}
                onSave={handleSaveUser}
            />
        </div>
    );
}
