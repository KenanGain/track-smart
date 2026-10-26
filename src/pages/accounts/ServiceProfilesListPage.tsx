import React, { Fragment, useMemo, useState } from "react";
import {
    Mail, Phone, Briefcase, Download, PanelRight, SlidersHorizontal,
    Infinity as InfinityIcon, LayoutGrid, Check, AlertCircle, ShieldAlert, Pause, Building2,
} from "lucide-react";
import {
    SERVICE_PROFILES_DB,
    BUSINESS_TYPES,
    formatLimit,
    isUnlimitedLimit,
    type ServiceProfile,
    type ServiceProfileStatus,
} from "./service-profiles.data";
import { ACCOUNTS_DB } from "./accounts.data";
import { ServiceProfileViewModal } from "./ServiceProfileViewModal";
import { ServiceProfileEditModal } from "./ServiceProfileEditModal";
import { RowActions } from "@/components/ui/RowActions";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import {
    ColumnPicker, FilterSelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PAGE_PAD } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { chipsFromStats, useHeaderChips } from "@/components/ui/list-header-bridge";
import { type AppUser } from "@/data/users.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate?: (path: string) => void;
    /** Logged-in user — drives row-level visibility. */
    currentUser?: AppUser | null;
    /** Setter that App.tsx uses to remember which profile to load on /service-profile. */
    onSelectServiceProfile?: (id: string) => void;
    /** The table body is the thing that scrolls; a host that condenses its header listens here. */
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    /** Horizontal padding, matched to the host header. */
    pad?: string;
};

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
const STATUSES: ServiceProfileStatus[] = ["Active", "Pending", "Suspended", "Inactive"];

// How much of its carrier allowance a profile has used — a filter and a grouping.
type Usage = "Unlimited" | "At the limit" | "Near the limit" | "Has room";
const USAGES: Usage[] = ["At the limit", "Near the limit", "Has room", "Unlimited"];
const usageOf = (p: ServiceProfile): Usage => {
    if (isUnlimitedLimit(p.accountLimit)) return "Unlimited";
    if (p.accountsCreated >= p.accountLimit) return "At the limit";
    return p.accountsCreated / Math.max(1, p.accountLimit) >= 0.8 ? "Near the limit" : "Has room";
};

// ── Columns ────────────────────────────────────────────────────────────────

type Col = "service" | "stateBiz" | "address" | "contact" | "carriers" | "limit" | "createdAt" | "status";

const COLUMNS: PickerColumn<Col>[] = [
    { id: "service", label: "Service profile", locked: true },
    { id: "stateBiz", label: "State / Business type" },
    { id: "address", label: "Legal address" },
    { id: "contact", label: "Contact" },
    { id: "carriers", label: "Carriers" },
    { id: "limit", label: "Account limit" },
    { id: "createdAt", label: "Created" },
    { id: "status", label: "Status" },
];

type GroupBy = "none" | "status" | "businessType" | "stateOfInc" | "usage" | "country";
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "status", label: "Group: Status" },
    { id: "businessType", label: "Group: Business type" },
    { id: "stateOfInc", label: "Group: State of incorporation" },
    { id: "usage", label: "Group: Limit usage" },
    { id: "country", label: "Group: Country" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const initialsOf = (name: string) =>
    name.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
const addressLine = (p: ServiceProfile) => {
    const a = p.legalAddress;
    return [a.street + (a.apt ? `, ${a.apt}` : ""), a.city, `${a.state} ${a.zip}`.trim()].filter(Boolean).join(", ");
};
const carrierCount = (p: ServiceProfile) => ACCOUNTS_DB.filter((a) => a.serviceProfileId === p.id).length;

// Pinned to the top of the table's own scroll box, so a column keeps its name 30 rows down.
const PIN_TH = "sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_#e2e8f0]";

const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

// ── Page ───────────────────────────────────────────────────────────────────

export function ServiceProfilesListPage({ currentUser, onNavigate, onSelectServiceProfile, scrollRef, onScroll, pad = PAGE_PAD }: Props = {}) {
    const [search, setSearch] = useState("");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [statusFilter, setStatusFilter] = useState<ServiceProfileStatus | "all">("all");
    const [bizType, setBizType] = useState("");
    const [stateOfInc, setStateOfInc] = useState("");
    const [usage, setUsage] = useState("");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    // Phones only: the filter row folds behind a button so the table keeps the screen.
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [profiles, setProfiles] = useState<ServiceProfile[]>(SERVICE_PROFILES_DB);
    const [viewing, setViewing] = useState<ServiceProfile | null>(null);
    const [editing, setEditing] = useState<ServiceProfile | null>(null);

    // Role-aware visibility:
    //   - Super admin → all profiles
    //   - Admin → only the service profile they belong to
    //   - User → only the service profile they belong to (rare)
    const profilesScoped = useMemo(() => {
        if (!currentUser || currentUser.role === "super-admin") return profiles;
        if (!currentUser.serviceProfileId) return [];
        return profiles.filter((p) => p.id === currentUser.serviceProfileId);
    }, [profiles, currentUser]);

    const show = (c: Col) => visible.has(c);
    const toggleColumn = (id: Col) =>
        setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    const colCount = COLUMNS.filter((c) => c.locked || visible.has(c.id)).length + 1;
    const stateOptions = useMemo(() => [...new Set(profilesScoped.map((p) => p.stateOfInc).filter(Boolean))].sort(), [profilesScoped]);
    const bizOptions = useMemo(() => BUSINESS_TYPES.filter((b) => profilesScoped.some((p) => p.businessType === b)), [profilesScoped]);

    const stats: KpiStat[] = useMemo(() => [
        { id: "all", label: "Total", value: profilesScoped.length, Icon: LayoutGrid, accent: "blue" },
        { id: "Active", label: "Active", value: profilesScoped.filter((p) => p.status === "Active").length, Icon: Check, accent: "emerald" },
        { id: "Pending", label: "Pending", value: profilesScoped.filter((p) => p.status === "Pending").length, Icon: AlertCircle, accent: "amber" },
        { id: "Suspended", label: "Suspended", value: profilesScoped.filter((p) => p.status === "Suspended").length, Icon: ShieldAlert, accent: "rose" },
        { id: "Inactive", label: "Inactive", value: profilesScoped.filter((p) => p.status === "Inactive").length, Icon: Pause, accent: "slate" },
        { id: "carriers", label: "Carriers", value: profilesScoped.reduce((s, p) => s + carrierCount(p), 0), Icon: Building2, accent: "indigo" },
    ], [profilesScoped]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return profilesScoped.filter((p) => {
            if (statusFilter !== "all" && p.status !== statusFilter) return false;
            if (bizType && p.businessType !== bizType) return false;
            if (stateOfInc && p.stateOfInc !== stateOfInc) return false;
            if (usage && usageOf(p) !== usage) return false;
            if (!q) return true;
            return (
                p.legalName.toLowerCase().includes(q) ||
                (p.dbaName ?? "").toLowerCase().includes(q) ||
                p.businessType.toLowerCase().includes(q) ||
                p.stateOfInc.toLowerCase().includes(q) ||
                addressLine(p).toLowerCase().includes(q) ||
                (p.contactEmail ?? "").toLowerCase().includes(q) ||
                (p.contactPhone ?? "").toLowerCase().includes(q)
            );
        });
    }, [profilesScoped, search, statusFilter, bizType, stateOfInc, usage]);

    const readers = useMemo(() => ({
        service: (p: ServiceProfile) => p.legalName,
        stateBiz: (p: ServiceProfile) => `${p.stateOfInc} ${p.businessType}`,
        address: (p: ServiceProfile) => `${p.legalAddress.state} ${p.legalAddress.city}`,
        contact: (p: ServiceProfile) => p.contactEmail ?? p.contactPhone ?? "",
        carriers: (p: ServiceProfile) => carrierCount(p),
        limit: (p: ServiceProfile) => (isUnlimitedLimit(p.accountLimit) ? Number.MAX_SAFE_INTEGER : p.accountsCreated / Math.max(1, p.accountLimit)),
        createdAt: (p: ServiceProfile) => p.createdAt,
        status: (p: ServiceProfile) => p.status,
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, ServiceProfile>(filtered, readers, { col: "service", dir: "asc" });

    // Group — the bands follow the sort inside each group, groups in their natural order.
    const groupOf = (p: ServiceProfile): { rank: number | string; label: string } | null => {
        switch (groupBy) {
            case "status": return { rank: STATUSES.indexOf(p.status), label: p.status };
            case "businessType": return { rank: BUSINESS_TYPES.indexOf(p.businessType), label: p.businessType };
            case "stateOfInc": return { rank: p.stateOfInc, label: p.stateOfInc || "Not recorded" };
            case "usage": { const u = usageOf(p); return { rank: USAGES.indexOf(u), label: u }; }
            case "country": return { rank: p.legalAddress.country, label: p.legalAddress.country };
            default: return null;
        }
    };
    const grouped = useMemo(() => {
        if (groupBy === "none") return sorted;
        return sorted
            .map((p, i) => ({ p, i, g: groupOf(p)! }))
            .sort((x, y) => {
                const r = typeof x.g.rank === "number" && typeof y.g.rank === "number"
                    ? x.g.rank - y.g.rank
                    : String(x.g.rank).localeCompare(String(y.g.rank));
                return r || x.i - y.i;
            })
            .map((r) => r.p);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- groupOf reads groupBy only
    }, [sorted, groupBy]);
    const groupCounts = useMemo(() => {
        const m = new Map<string, number>();
        if (groupBy !== "none") grouped.forEach((p) => { const l = groupOf(p)!.label; m.set(l, (m.get(l) ?? 0) + 1); });
        return m;
        // eslint-disable-next-line react-hooks/exhaustive-deps -- groupOf reads groupBy only
    }, [grouped, groupBy]);

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const paged = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
    const filterCount = [statusFilter !== "all", !!bizType, !!stateOfInc, !!usage, groupBy !== "none"].filter(Boolean).length;
    const mobileFold = filtersOpen ? "contents" : "max-md:hidden contents";
    // The same figures, for the page header to show once the cards have scrolled away.
    useHeaderChips(chipsFromStats(stats, statusFilter, (id) => { if (id !== "carriers") { setStatusFilter(id as ServiceProfileStatus | "all"); setPage(1); } }));
    const touched = filterCount > 0 || search.trim() !== "";
    const reset = () => {
        setStatusFilter("all"); setBizType(""); setStateOfInc(""); setUsage(""); setGroupBy("none"); setSearch(""); setPage(1);
    };
    const set = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };
    const openProfile = (p: ServiceProfile) => { onSelectServiceProfile?.(p.id); onNavigate?.("/service-profile"); };

    const handleSaveProfile = (next: ServiceProfile) => {
        setProfiles((prev) => prev.map((p) => (p.id === next.id ? next : p)));
    };

    const handleExport = () => {
        const headers = ["Legal Name", "DBA", "State of Inc", "Business Type", "Legal Address", "Email", "Phone", "Carriers", "Account Limit", "Status", "Created"];
        const rows = grouped.map((p) => [
            p.legalName,
            p.dbaName ?? "",
            p.stateOfInc,
            p.businessType,
            addressLine(p),
            p.contactEmail ?? "",
            p.contactPhone ?? "",
            carrierCount(p),
            isUnlimitedLimit(p.accountLimit) ? "Unlimited" : `${p.accountsCreated}/${p.accountLimit}`,
            p.status,
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
        // The KPI cards scroll up and away (the page header then shows their figures); the
        // list card below is one screen tall, so the rows scroll under their own header.
        <>
        <ListScrollFrame
            pad={pad}
            above={<KpiStatRow
                stats={stats}
                activeId={statusFilter}
                onPick={(id) => { if (id !== "carriers") { setStatusFilter(id as ServiceProfileStatus | "all"); setPage(1); } }}
            />}
            title="Service profile list"
            count={grouped.length}
            total={profilesScoped.length}
            description="Parent organizations that manage carriers — click a row to open the profile."
            actions={<>
                <button type="button" onClick={handleExport}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                    <Download size={14} /> Export CSV
                </button>
                <ColumnPicker columns={COLUMNS} visible={visible} onToggle={toggleColumn} />
            </>}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${paged.length}`}
            toolbar={
                <ListToolbar
                    search={search}
                    onSearch={set(setSearch)}
                    placeholder="Search name, state, address, contact…"
                    filters={<div className={mobileFold}>
                        <FilterSelect value={statusFilter === "all" ? "" : statusFilter} onChange={set((v: string) => setStatusFilter((v || "all") as ServiceProfileStatus | "all"))} title="Status" allLabel="All statuses" options={STATUSES} />
                        <FilterSelect value={bizType} onChange={set(setBizType)} title="Business type" allLabel="All business types" options={bizOptions} />
                        <FilterSelect value={stateOfInc} onChange={set(setStateOfInc)} title="State of incorporation" allLabel="All states" options={stateOptions} />
                        <FilterSelect value={usage} onChange={set(setUsage)} title="Account limit usage" allLabel="Any limit usage" options={USAGES} />
                    </div>}
                    filtersExtra={<>
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((o) => !o)}
                            aria-expanded={filtersOpen}
                            className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold md:hidden",
                                filterCount ? "border-blue-300 bg-blue-50/60 text-blue-700" : "border-slate-200 bg-white text-slate-600")}
                        >
                            <SlidersHorizontal size={14} /> Filters{filterCount ? ` · ${filterCount}` : ""}
                        </button>
                        <div className={mobileFold}>
                            <select
                                value={groupBy}
                                onChange={(e) => { setGroupBy(e.target.value as GroupBy); setPage(1); }}
                                title="Group the list"
                                className={cn(
                                    "h-9 shrink-0 rounded-lg border px-2.5 text-[13px] font-semibold outline-none focus:ring-2 focus:ring-blue-500/30",
                                    groupBy === "none" ? "border-slate-200 bg-white text-slate-600" : "border-blue-300 bg-blue-50/60 text-blue-700",
                                )}
                            >
                                {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
                            </select>
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>}
                />
            }
            footer={<TablePager
                    page={safePage}
                    pageSize={pageSize}
                    total={grouped.length}
                    onPage={setPage}
                    onPageSize={(n) => { setPageSize(n); setPage(1); }}
                />}
        >
            <table className="w-full">
                        <thead>
                            <tr>
                                <SortTh col="service" label="Service profile" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                                {show("stateBiz") && <SortTh col="stateBiz" label="State / Business type" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show("address") && <SortTh col="address" label="Legal address" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show("contact") && <SortTh col="contact" label="Contact" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show("carriers") && <SortTh col="carriers" label="Carriers" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show("limit") && <SortTh col="limit" label="Account limit" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show("createdAt") && <SortTh col="createdAt" label="Created" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                                <SortTh label="Actions" sort={sort} className={cn(PIN_TH, "right-0 z-20 w-[84px] pr-4 text-right shadow-[inset_0_-1px_0_#e2e8f0,inset_1px_0_0_#e2e8f0]")} />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.length === 0 && (
                                <tr>
                                    <td colSpan={colCount} className="px-4 py-16 text-center">
                                        <Briefcase size={28} className="mx-auto mb-2 text-slate-300" />
                                        <p className="text-sm font-semibold text-slate-700">No service profiles match your filters</p>
                                        {touched && (
                                            <button type="button" onClick={reset}
                                                className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                                Clear filters
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )}
                            {paged.map((p, i) => {
                                const g = groupOf(p);
                                const prev = i === 0 || !g ? null : groupOf(paged[i - 1]);
                                const utilization = isUnlimitedLimit(p.accountLimit) ? null : Math.round((p.accountsCreated / Math.max(1, p.accountLimit)) * 100);
                                const addr = addressLine(p);
                                return (
                                    <Fragment key={p.id}>
                                        {g && (!prev || prev.label !== g.label) && (
                                            <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                        )}
                                        <tr onClick={() => openProfile(p)} className="group cursor-pointer transition-colors hover:bg-slate-50">
                                            <TD>
                                                <div className="flex items-center gap-2.5" title={`${p.legalName}${p.dbaName ? ` · DBA ${p.dbaName}` : ""}`}>
                                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-violet-100 text-[10px] font-bold text-violet-700">
                                                        {initialsOf(p.legalName)}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900">{p.legalName}</span>
                                                    {p.dbaName && <span className="text-xs text-slate-500">· DBA {p.dbaName}</span>}
                                                </div>
                                            </TD>
                                            {show("stateBiz") && (
                                                <TD>
                                                    <span className="text-sm font-semibold text-slate-900">{p.stateOfInc}</span>
                                                    <span className="ml-1.5 text-xs text-slate-500">· {p.businessType}</span>
                                                </TD>
                                            )}
                                            {show("address") && (
                                                <TD className="max-w-[18rem] truncate text-[13px] text-slate-600" >
                                                    <span title={addr}>{addr}</span>
                                                </TD>
                                            )}
                                            {show("contact") && (
                                                <TD className="text-xs text-slate-600">
                                                    {!p.contactEmail && !p.contactPhone ? (
                                                        <span className="text-slate-300">—</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-3">
                                                            {p.contactEmail && <span className="inline-flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {p.contactEmail}</span>}
                                                            {p.contactPhone && <span className="inline-flex items-center gap-1.5 text-slate-500"><Phone size={11} className="text-slate-400" /> {p.contactPhone}</span>}
                                                        </span>
                                                    )}
                                                </TD>
                                            )}
                                            {show("carriers") && <TD className="font-semibold tabular-nums text-slate-900">{carrierCount(p)}</TD>}
                                            {show("limit") && (
                                                <TD>
                                                    <div className="flex items-center gap-2">
                                                        {isUnlimitedLimit(p.accountLimit) ? (
                                                            <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700">
                                                                <InfinityIcon size={12} /> Unlimited
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-semibold tabular-nums text-slate-900">{p.accountsCreated} / {formatLimit(p.accountLimit)}</span>
                                                        )}
                                                        {utilization !== null && (
                                                            <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                                                                <span className={cn("block h-full rounded-full", utilization < 70 ? "bg-emerald-500" : utilization < 90 ? "bg-amber-500" : "bg-red-500")} style={{ width: `${Math.min(100, utilization)}%` }} />
                                                            </span>
                                                        )}
                                                    </div>
                                                </TD>
                                            )}
                                            {show("createdAt") && <TD className="text-xs text-slate-500">{p.createdAt}</TD>}
                                            {show("status") && (
                                                <TD>
                                                    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_BADGE[p.status])}>
                                                        <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", STATUS_DOT[p.status])} />
                                                        {p.status}
                                                    </span>
                                                </TD>
                                            )}
                                            <TD className="sticky right-0 bg-white pr-4 text-right shadow-[inset_1px_0_0_#f1f5f9] group-hover:bg-slate-50" onClick={(e) => e.stopPropagation()}>
                                                <RowActions
                                                    noun="service profile"
                                                    name={p.legalName}
                                                    openLabel="Open service profile"
                                                    onOpen={() => openProfile(p)}
                                                    onEdit={() => setEditing(p)}
                                                    extra={[{ label: "Quick view", icon: PanelRight, onClick: () => setViewing(p) }]}
                                                />
                                            </TD>
                                        </tr>
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
        </ListScrollFrame>

            <ServiceProfileViewModal
                profile={viewing}
                onClose={() => setViewing(null)}
                onEdit={(p) => setEditing(p)}
            />
            <ServiceProfileEditModal
                profile={editing}
                currentUser={currentUser}
                onClose={() => setEditing(null)}
                onSave={handleSaveProfile}
            />
        </>
    );
}
