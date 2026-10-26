import { useMemo, useState } from "react";
import { AlertTriangle, Briefcase, ExternalLink, Gauge, Infinity as InfinityIcon, LayoutGrid, SlidersHorizontal } from "lucide-react";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ColumnPicker, FilterSelect, ListToolbar, SortTh, TablePager, useTableSort } from "@/components/ui/ListChrome";
import { RowActions } from "@/components/ui/RowActions";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { cn } from "@/lib/utils";
import { SERVICE_PROFILES_DB, isUnlimitedLimit, type ServiceProfile, type ServiceProfileStatus } from "@/pages/accounts/service-profiles.data";
import { useDirectoryVersion } from "@/pages/users-roles/scope";
import { LimitsDialog, UsageMeter } from "./limits-pieces";
import { serviceLimits, setServiceLimits, useLimitsVersion, type Usage } from "./profile-limits.data";

/**
 * Super Admin → Service Profile Configuration.
 *
 * Every service profile with the two numbers that bound it: how many carrier profiles it
 * can create and how many users it can add. A row opens its detail page (everything behind
 * the profile); the ⋮ also edits the limits in place or opens the profile itself.
 */

type Col = "profile" | "status" | "carriers" | "users" | "created";
type Pick = "all" | "near" | "full" | "unlimited";

const COLUMNS: { id: Col; label: string; locked?: boolean }[] = [
    { id: "profile", label: "Service profile", locked: true },
    { id: "status", label: "Status" },
    { id: "carriers", label: "Carrier profiles" },
    { id: "users", label: "Users" },
    { id: "created", label: "Created" },
];

const STATUS_BADGE: Record<ServiceProfileStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-rose-50 text-rose-700 border-rose-200",
    Inactive: "bg-slate-50 text-slate-600 border-slate-200",
};

const share = (u: Usage) => (isUnlimitedLimit(u.limit) ? 0 : u.limit > 0 ? u.used / u.limit : 1);
const isFull = (u: Usage) => !isUnlimitedLimit(u.limit) && u.used >= u.limit;
const isNear = (u: Usage) => !isFull(u) && share(u) >= 0.8;

type Row = { sp: ServiceProfile; carriers: Usage; users: Usage };

export function ServiceProfileLimitsPage({ onOpenProfile, onOpenDetail }: {
    /** Open the profile's own page. */
    onOpenProfile?: (id: string) => void;
    /** Open the Super Admin detail page for the profile. */
    onOpenDetail?: (id: string) => void;
}) {
    const dir = useDirectoryVersion();
    const lim = useLimitsVersion();
    const { scrollRef, condensed, onScroll } = useCondensingHeader();

    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [pick, setPick] = useState<Pick>("all");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [editing, setEditing] = useState<Row | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- dir/lim are the store snapshots
    const rows: Row[] = useMemo(() => SERVICE_PROFILES_DB.map((sp) => ({ sp, ...serviceLimits(sp.id) })), [dir, lim]);

    const counts = useMemo(() => ({
        all: rows.length,
        near: rows.filter((r) => isNear(r.carriers) || isNear(r.users)).length,
        full: rows.filter((r) => isFull(r.carriers) || isFull(r.users)).length,
        unlimited: rows.filter((r) => isUnlimitedLimit(r.carriers.limit) || isUnlimitedLimit(r.users.limit)).length,
    }), [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (status && r.sp.status !== status) return false;
            if (pick === "near" && !(isNear(r.carriers) || isNear(r.users))) return false;
            if (pick === "full" && !(isFull(r.carriers) || isFull(r.users))) return false;
            if (pick === "unlimited" && !(isUnlimitedLimit(r.carriers.limit) || isUnlimitedLimit(r.users.limit))) return false;
            return !q || [r.sp.legalName, r.sp.dbaName, r.sp.contactEmail, r.sp.legalAddress.city, r.sp.legalAddress.state]
                .some((v) => v?.toLowerCase().includes(q));
        });
    }, [rows, search, status, pick]);

    const readers = useMemo(() => ({
        profile: (r: Row) => r.sp.legalName,
        status: (r: Row) => r.sp.status,
        carriers: (r: Row) => share(r.carriers),
        users: (r: Row) => share(r.users),
        created: (r: Row) => r.sp.createdAt,
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, Row>(filtered, readers, { col: "profile", dir: "asc" });
    const shown = sorted.slice((page - 1) * pageSize, page * pageSize);

    const stats: KpiStat[] = [
        { id: "all", label: "Service profiles", value: counts.all, Icon: LayoutGrid, accent: "blue" },
        { id: "near", label: "Near a limit", value: counts.near, Icon: Gauge, accent: "amber" },
        { id: "full", label: "At a limit", value: counts.full, Icon: AlertTriangle, accent: "rose" },
        { id: "unlimited", label: "Unlimited", value: counts.unlimited, Icon: InfinityIcon, accent: "violet" },
    ];
    const totalCarriers = rows.reduce((s, r) => s + r.carriers.used, 0);
    const totalUsers = rows.reduce((s, r) => s + r.users.used, 0);
    const toggle = (id: Col) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const say = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2600); };

    return (
        <div className="flex h-full flex-col bg-slate-50">
            <ListPageHeader
                Icon={Briefcase}
                title="Service Profile Configuration"
                description={<>How many carrier profiles and users each service profile can have · <span className="font-semibold text-slate-700">{totalCarriers}</span> carrier profiles and <span className="font-semibold text-slate-700">{totalUsers}</span> users in use</>}
                count={rows.length}
                countTitle={`${rows.length} service profiles`}
                condensed={condensed}
                chips={stats.map((s) => ({ id: s.id, label: s.label, value: s.value, active: pick === s.id }))}
            />

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
                    <KpiStatRow stats={stats} activeId={pick} condensed={condensed}
                        onPick={(id) => { setPick(id as Pick); setPage(1); }} />

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <ListToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search service profiles…"
                            filters={<FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} title="Status" allLabel="All statuses"
                                options={["Active", "Pending", "Suspended", "Inactive"]} />}
                            columns={<ColumnPicker columns={COLUMNS} visible={visible} onToggle={toggle} />} />

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <SortTh col="profile" label="Service profile" sortable sort={sort} onSort={onSort} />
                                        {visible.has("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} />}
                                        {visible.has("carriers") && <SortTh col="carriers" label="Carrier profiles" sortable sort={sort} onSort={onSort} />}
                                        {visible.has("users") && <SortTh col="users" label="Users" sortable sort={sort} onSort={onSort} />}
                                        {visible.has("created") && <SortTh col="created" label="Created" sortable sort={sort} onSort={onSort} />}
                                        <SortTh label={<span className="sr-only">Actions</span>} sort={sort} className="w-12" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {shown.map((r) => (
                                        <tr key={r.sp.id} onClick={() => (onOpenDetail ? onOpenDetail(r.sp.id) : setEditing(r))} className="cursor-pointer hover:bg-slate-50/70">
                                            <td className="min-w-[15rem] px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-[12px] font-bold text-violet-700">
                                                        {(r.sp.dbaName || r.sp.legalName).slice(0, 2).toUpperCase()}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-900">{r.sp.legalName}</p>
                                                        <p className="truncate text-[12px] text-slate-500">{r.sp.dbaName ? `DBA ${r.sp.dbaName}` : r.sp.businessType}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {visible.has("status") && (
                                                <td className="px-4 py-3">
                                                    <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold", STATUS_BADGE[r.sp.status])}>{r.sp.status}</span>
                                                </td>
                                            )}
                                            {visible.has("carriers") && <td className="px-4 py-3"><UsageMeter usage={r.carriers} noun="slot" className="min-w-[8.5rem]" /></td>}
                                            {visible.has("users") && <td className="px-4 py-3"><UsageMeter usage={r.users} noun="seat" className="min-w-[8.5rem]" /></td>}
                                            {visible.has("created") && <td className="whitespace-nowrap px-4 py-3 text-[13px] tabular-nums text-slate-600">{r.sp.createdAt}</td>}
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <RowActions noun="service profile" name={r.sp.legalName} openLabel="Open details"
                                                    onOpen={onOpenDetail ? () => onOpenDetail(r.sp.id) : undefined}
                                                    extra={[
                                                        { label: "Edit limits", icon: SlidersHorizontal, onClick: () => setEditing(r) },
                                                        ...(onOpenProfile ? [{ label: "Open service profile", icon: ExternalLink, onClick: () => onOpenProfile(r.sp.id) }] : []),
                                                    ]} />
                                            </td>
                                        </tr>
                                    ))}
                                    {shown.length === 0 && (
                                        <tr><td colSpan={COLUMNS.filter((c) => c.locked || visible.has(c.id)).length + 1} className="px-4 py-12 text-center text-sm text-slate-500">No service profiles match.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <TablePager page={page} pageSize={pageSize} total={sorted.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
                    </div>
                </div>
            </div>

            {editing && (
                <LimitsDialog
                    title={`Limits · ${editing.sp.dbaName || editing.sp.legalName}`}
                    subtitle="How far this service profile can grow. Add Carrier and Add User stop at these numbers."
                    fields={[
                        { key: "carriers", label: "Carrier profiles it can create", help: "Carrier profiles under this service profile.", used: editing.carriers.used, value: editing.carriers.limit },
                        { key: "users", label: "Users it can add", help: "Office logins across the profile — its Admins and every carrier's team. Driver logins are not counted.", used: editing.users.used, value: editing.users.limit },
                    ]}
                    onClose={() => setEditing(null)}
                    onSave={(v) => {
                        setServiceLimits(editing.sp.id, { carrierLimit: v.carriers, userLimit: v.users });
                        setEditing(null);
                        say(`Limits saved for ${editing.sp.dbaName || editing.sp.legalName}`);
                    }}
                />
            )}

            {toast && (
                <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
            )}
        </div>
    );
}
