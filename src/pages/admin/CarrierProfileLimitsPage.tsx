import { useMemo, useState } from "react";
import { AlertTriangle, ExternalLink, Gauge, Infinity as InfinityIcon, LayoutGrid, SlidersHorizontal, Truck } from "lucide-react";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ColumnPicker, FilterSelect, ListToolbar, SortTh, TablePager, useTableSort } from "@/components/ui/ListChrome";
import { RowActions } from "@/components/ui/RowActions";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { cn } from "@/lib/utils";
import { ACCOUNTS_DB, STATUS_BADGE, type AccountRecord } from "@/pages/accounts/accounts.data";
import { SERVICE_PROFILES_DB, isUnlimitedLimit } from "@/pages/accounts/service-profiles.data";
import { useDirectoryVersion } from "@/pages/users-roles/scope";
import { LimitsDialog, UsageMeter } from "./limits-pieces";
import { carrierLimits, setCarrierLimits, useLimitsVersion, type Usage } from "./profile-limits.data";

/**
 * Super Admin → Carrier Profile Configuration.
 *
 * Every carrier profile with the number that bounds it: how many users it can add. A row
 * opens its detail page (everything behind the carrier); the ⋮ also edits the limit in place
 * or opens the carrier itself.
 */

type Col = "carrier" | "service" | "status" | "users" | "drivers";
type Pick = "all" | "near" | "full" | "unlimited";

const COLUMNS: { id: Col; label: string; locked?: boolean }[] = [
    { id: "carrier", label: "Carrier profile", locked: true },
    { id: "service", label: "Service profile" },
    { id: "status", label: "Status" },
    { id: "users", label: "Users" },
    { id: "drivers", label: "Drivers" },
];

const share = (u: Usage) => (isUnlimitedLimit(u.limit) ? 0 : u.limit > 0 ? u.used / u.limit : 1);
const isFull = (u: Usage) => !isUnlimitedLimit(u.limit) && u.used >= u.limit;
const isNear = (u: Usage) => !isFull(u) && share(u) >= 0.8;

const spName = (id?: string) => {
    const sp = SERVICE_PROFILES_DB.find((p) => p.id === id);
    return sp ? sp.dbaName || sp.legalName : "";
};
const initials = (c: AccountRecord) =>
    c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

type Row = { c: AccountRecord; users: Usage; service: string };

export function CarrierProfileLimitsPage({ onOpenCarrier, onOpenDetail }: {
    /** Open the carrier's own profile. */
    onOpenCarrier?: (account: AccountRecord) => void;
    /** Open the Super Admin detail page for the carrier. */
    onOpenDetail?: (id: string) => void;
}) {
    const dir = useDirectoryVersion();
    const lim = useLimitsVersion();
    const { scrollRef, condensed, onScroll } = useCondensingHeader();

    const [search, setSearch] = useState("");
    const [service, setService] = useState("");
    const [status, setStatus] = useState("");
    const [pick, setPick] = useState<Pick>("all");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [editing, setEditing] = useState<Row | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- dir/lim are the store snapshots
    const rows: Row[] = useMemo(() => ACCOUNTS_DB.map((c) => ({ c, service: spName(c.serviceProfileId), ...carrierLimits(c.id) })), [dir, lim]);
    const serviceOptions = useMemo(() => [...new Set(rows.map((r) => r.service).filter(Boolean))].sort(), [rows]);

    const counts = useMemo(() => ({
        all: rows.length,
        near: rows.filter((r) => isNear(r.users)).length,
        full: rows.filter((r) => isFull(r.users)).length,
        unlimited: rows.filter((r) => isUnlimitedLimit(r.users.limit)).length,
    }), [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter((r) => {
            if (service && r.service !== service) return false;
            if (status && r.c.status !== status) return false;
            if (pick === "near" && !isNear(r.users)) return false;
            if (pick === "full" && !isFull(r.users)) return false;
            if (pick === "unlimited" && !isUnlimitedLimit(r.users.limit)) return false;
            return !q || [r.c.legalName, r.c.dbaName, r.c.dotNumber, r.c.city, r.c.state, r.service]
                .some((v) => v?.toLowerCase().includes(q));
        });
    }, [rows, search, service, status, pick]);

    const readers = useMemo(() => ({
        carrier: (r: Row) => r.c.legalName,
        service: (r: Row) => r.service,
        status: (r: Row) => r.c.status,
        users: (r: Row) => share(r.users),
        drivers: (r: Row) => r.c.drivers,
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, Row>(filtered, readers, { col: "carrier", dir: "asc" });
    const shown = sorted.slice((page - 1) * pageSize, page * pageSize);

    const stats: KpiStat[] = [
        { id: "all", label: "Carrier profiles", value: counts.all, Icon: LayoutGrid, accent: "blue" },
        { id: "near", label: "Near the limit", value: counts.near, Icon: Gauge, accent: "amber" },
        { id: "full", label: "At the limit", value: counts.full, Icon: AlertTriangle, accent: "rose" },
        { id: "unlimited", label: "Unlimited", value: counts.unlimited, Icon: InfinityIcon, accent: "violet" },
    ];
    const totalUsers = rows.reduce((s, r) => s + r.users.used, 0);
    const toggle = (id: Col) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const say = (t: string) => { setToast(t); window.setTimeout(() => setToast(null), 2600); };
    const label = (c: AccountRecord) => c.dbaName || c.legalName;

    return (
        <div className="flex h-full flex-col bg-slate-50">
            <ListPageHeader
                Icon={Truck}
                title="Carrier Profile Configuration"
                description={<>How many users each carrier profile can add · <span className="font-semibold text-slate-700">{totalUsers}</span> users in use</>}
                count={rows.length}
                countTitle={`${rows.length} carrier profiles`}
                condensed={condensed}
                chips={stats.map((s) => ({ id: s.id, label: s.label, value: s.value, active: pick === s.id }))}
            />

            <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto">
                <div className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
                    <KpiStatRow stats={stats} activeId={pick} condensed={condensed}
                        onPick={(id) => { setPick(id as Pick); setPage(1); }} />

                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <ListToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search name, USDOT, city…"
                            filters={<>
                                <FilterSelect value={service} onChange={(v) => { setService(v); setPage(1); }} title="Service profile" allLabel="All service profiles" options={serviceOptions} />
                                <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} title="Status" allLabel="All statuses" options={["Active", "Pending", "Suspended", "Inactive"]} />
                            </>}
                            columns={<ColumnPicker columns={COLUMNS} visible={visible} onToggle={toggle} />} />

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-slate-200 bg-slate-50">
                                    <tr>
                                        <SortTh col="carrier" label="Carrier profile" sortable sort={sort} onSort={onSort} />
                                        {visible.has("service") && <SortTh col="service" label="Service profile" sortable sort={sort} onSort={onSort} />}
                                        {visible.has("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} />}
                                        {visible.has("users") && <SortTh col="users" label="Users" sortable sort={sort} onSort={onSort} />}
                                        {visible.has("drivers") && <SortTh col="drivers" label="Drivers" sortable sort={sort} onSort={onSort} />}
                                        <SortTh label={<span className="sr-only">Actions</span>} sort={sort} className="w-12" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {shown.map((r) => (
                                        <tr key={r.c.id} onClick={() => (onOpenDetail ? onOpenDetail(r.c.id) : setEditing(r))} className="cursor-pointer hover:bg-slate-50/70">
                                            <td className="min-w-[15rem] px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[12px] font-bold text-blue-700">{initials(r.c)}</span>
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-900">{r.c.legalName}</p>
                                                        <p className="truncate text-[12px] text-slate-500">
                                                            {[r.c.dotNumber && `USDOT ${r.c.dotNumber}`, [r.c.city, r.c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {visible.has("service") && <td className="px-4 py-3 text-[13px] text-slate-700">{r.service || <span className="text-slate-400">—</span>}</td>}
                                            {visible.has("status") && (
                                                <td className="px-4 py-3">
                                                    <span className={cn("rounded-md border px-2 py-0.5 text-[11px] font-bold", STATUS_BADGE[r.c.status])}>{r.c.status}</span>
                                                </td>
                                            )}
                                            {visible.has("users") && <td className="px-4 py-3"><UsageMeter usage={r.users} noun="seat" className="min-w-[8.5rem]" /></td>}
                                            {visible.has("drivers") && <td className="px-4 py-3 text-sm tabular-nums text-slate-700">{r.c.drivers}</td>}
                                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <RowActions noun="carrier" name={r.c.legalName} openLabel="Open details"
                                                    onOpen={onOpenDetail ? () => onOpenDetail(r.c.id) : undefined}
                                                    extra={[
                                                        { label: "Edit limits", icon: SlidersHorizontal, onClick: () => setEditing(r) },
                                                        ...(onOpenCarrier ? [{ label: "Open carrier", icon: ExternalLink, onClick: () => onOpenCarrier(r.c) }] : []),
                                                    ]} />
                                            </td>
                                        </tr>
                                    ))}
                                    {shown.length === 0 && (
                                        <tr><td colSpan={COLUMNS.filter((c) => c.locked || visible.has(c.id)).length + 1} className="px-4 py-12 text-center text-sm text-slate-500">No carrier profiles match.</td></tr>
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
                    title={`Limits · ${label(editing.c)}`}
                    subtitle={`How many people can sign in to ${label(editing.c)}. Add User stops at this number.`}
                    fields={[
                        { key: "users", label: "Users it can add", help: "Office logins on this carrier — Fleet Admins, Safety Managers and Users. Service-profile Admins and driver logins are not counted.", used: editing.users.used, value: editing.users.limit },
                    ]}
                    onClose={() => setEditing(null)}
                    onSave={(v) => {
                        setCarrierLimits(editing.c.id, { userLimit: v.users });
                        setEditing(null);
                        say(`Limit saved for ${label(editing.c)}`);
                    }}
                />
            )}

            {toast && (
                <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">{toast}</div>
            )}
        </div>
    );
}
