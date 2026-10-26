import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
    BellRing, Building2, Check, Crown, ExternalLink, Lock, ShieldCheck, Settings2, Truck, UserCog, UserRound, Users as UsersIcon, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListPageHeader } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { ListHeaderBridge, chipsFromStats, useHeaderChips, useListHeaderBridge } from "@/components/ui/list-header-bridge";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { RowActions } from "@/components/ui/RowActions";
import { ServiceProfileSwitcher } from "@/components/layout/ServiceProfileSwitcher";
import { ROLE_LABELS, type AppUser } from "@/data/users.data";
import { type AccountRecord } from "@/pages/accounts/accounts.data";
import { type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import {
    profileAdminsNotified, rolesFor, setProfileAdminsNotified, subscribeMonitoringRouting, usersWithRoleOn,
    type NotificationRole, type RoutingRecipient,
} from "@/pages/compliance/monitoring-routing.data";
import { RecipientChip, RoleToggle, peopleReached } from "@/pages/compliance/notification-roles-ui";
import { CoverPill } from "./AlertDialogs";
import { canManageProfile, canOpenCarrier, carriersOfProfile, profilesFor, profilesOfUser, useDirectoryVersion } from "./scope";
import { useToast } from "./pieces";

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring & Notifications for a SERVICE PROFILE — every carrier under it on one page.
//
// A carrier's Fleet Admin sets up who gets its alerts in Settings. The Admin above runs several
// carriers and asks a different question: is every carrier covered, who is told on each, and
// do the alerts reach me? This answers it per carrier — the notification roles that are on,
// the people they reach today (role recipients counted as the people who hold the role), the
// records nobody is told about, and one switch: whether this carrier escalates to the service
// profile's Admins. Deeper changes open that carrier's own Settings.
// ─────────────────────────────────────────────────────────────────────────────

export interface CarrierNotifications {
    c: AccountRecord;
    roles: NotificationRole[];
    on: number;
    paused: number;
    /** Everyone an enabled role reaches today, each once. */
    people: RoutingRecipient[];
    /** Is at least one person told about this kind of record? */
    coverage: { carrier: boolean; drivers: boolean; assets: boolean };
    gaps: number;
    adminsNotified: boolean;
    fleetAdmins: number;
}

function summarise(c: AccountRecord): CarrierNotifications {
    const roles = rolesFor(c.id);
    const live = roles.filter((r) => r.enabled && peopleReached(r, c.id).length > 0);
    const seen = new Map<string, RoutingRecipient>();
    for (const r of live) for (const p of peopleReached(r, c.id)) if (!seen.has(p.id)) seen.set(p.id, p);
    const coverage = {
        carrier: live.some((r) => r.carrier),
        drivers: live.some((r) => r.allDrivers),
        assets: live.some((r) => r.allAssets),
    };
    return {
        c, roles,
        on: roles.filter((r) => r.enabled).length,
        paused: roles.filter((r) => !r.enabled).length,
        people: [...seen.values()],
        coverage,
        gaps: [coverage.carrier, coverage.drivers, coverage.assets].filter((x) => !x).length,
        adminsNotified: profileAdminsNotified(c.id),
        fleetAdmins: usersWithRoleOn(c.id, "fleet-admin").length,
    };
}

/** Per-carrier summaries, kept current as roles and the directory change. */
export function useProfileNotifications(carriers: AccountRecord[]): CarrierNotifications[] {
    const dir = useDirectoryVersion();
    const [tick, setTick] = useState(0);
    useEffect(() => subscribeMonitoringRouting(() => setTick((t) => t + 1)), []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dir/tick are the store snapshots
    return useMemo(() => carriers.map(summarise), [carriers, dir, tick]);
}

type Col = "carrier" | "roles" | "people" | "coverage" | "admins" | "status";
const COLUMNS: PickerColumn<Col>[] = [
    { id: "carrier", label: "Carrier", locked: true },
    { id: "roles", label: "Notification roles" },
    { id: "admins", label: "Profile Admins" },
    { id: "coverage", label: "Coverage" },
    { id: "people", label: "Notified" },
    { id: "status", label: "Status" },
];
type GroupBy = "none" | "coverage" | "admins" | "status";
const GROUPS: { id: GroupBy; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "coverage", label: "Group: Coverage" },
    { id: "admins", label: "Group: Profile Admins" },
    { id: "status", label: "Group: Status" },
];
const COVERAGE = ["Fully covered", "Has gaps"];
const ADMINS = ["Escalates to Admins", "Does not escalate"];
const STATUSES: AccountRecord["status"][] = ["Active", "Pending", "Suspended", "Inactive"];
const coverageOf = (s: CarrierNotifications) => (s.gaps === 0 ? COVERAGE[0] : COVERAGE[1]);
const adminsOf = (s: CarrierNotifications) => (s.adminsNotified ? ADMINS[0] : ADMINS[1]);
const initialsOf = (c: AccountRecord) =>
    c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

const TD = ({ children, className, onClick }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void }) => (
    <td onClick={onClick} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

/** The per-carrier list, with its KPI cards, in the standard frame. */
export function ProfileNotificationsTab({ sp, carriers, canManage, canOpen, above, scrollRef, onScroll, onOpenSettings, onViewMonitoring, onOpenTeam, say }: {
    sp: ServiceProfile; carriers: AccountRecord[]; canManage: boolean;
    canOpen: (c: AccountRecord) => boolean;
    above?: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
    onOpenSettings: (c: AccountRecord) => void;
    onViewMonitoring: (c: AccountRecord) => void;
    onOpenTeam?: (c: AccountRecord) => void;
    say: (text: string, tone?: "ok" | "warn") => void;
}) {
    const rows = useProfileNotifications(carriers);
    const spName = sp.dbaName || sp.legalName;
    const [query, setQuery] = useState("");
    const [coverage, setCoverage] = useState("");
    const [admins, setAdmins] = useState("");
    const [status, setStatus] = useState("");
    const [groupBy, setGroupBy] = useState<GroupBy>("none");
    const [visible, setVisible] = useState<Set<Col>>(() => new Set(COLUMNS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const stats: KpiStat[] = [
        { id: "all", label: "Carrier profiles", value: rows.length, Icon: Truck, accent: "blue" },
        { id: "covered", label: "Fully covered", value: rows.filter((s) => s.gaps === 0).length, Icon: Check, accent: "emerald" },
        { id: "gaps", label: "With gaps", value: rows.filter((s) => s.gaps > 0).length, Icon: X, accent: "rose" },
        { id: "admins", label: "Escalate to Admins", value: rows.filter((s) => s.adminsNotified).length, Icon: ShieldCheck, accent: "violet" },
        { id: "people", label: "People notified", value: new Set(rows.flatMap((s) => s.people.map((p) => p.id))).size, Icon: UsersIcon, accent: "indigo" },
    ];
    const activeId = coverage === COVERAGE[0] ? "covered" : coverage === COVERAGE[1] ? "gaps" : admins === ADMINS[0] ? "admins" : (!coverage && !admins ? "all" : "");
    const pickKpi = (id: string) => {
        setPage(1);
        if (id === "all") { setCoverage(""); setAdmins(""); return; }
        if (id === "covered") { setAdmins(""); setCoverage((c) => (c === COVERAGE[0] ? "" : COVERAGE[0])); return; }
        if (id === "gaps") { setAdmins(""); setCoverage((c) => (c === COVERAGE[1] ? "" : COVERAGE[1])); return; }
        if (id === "admins") { setCoverage(""); setAdmins((a) => (a === ADMINS[0] ? "" : ADMINS[0])); }
    };
    // The same figures, for the page header to show once the cards have scrolled away.
    useHeaderChips(chipsFromStats(stats, activeId, pickKpi));

    const q = query.trim().toLowerCase();
    const filtered = rows.filter((s) => {
        if (q && ![s.c.legalName, s.c.dbaName, s.c.dotNumber, s.c.city, ...s.people.map((p) => p.name)].some((x) => x?.toLowerCase().includes(q))) return false;
        if (coverage && coverageOf(s) !== coverage) return false;
        if (admins && adminsOf(s) !== admins) return false;
        if (status && s.c.status !== status) return false;
        return true;
    });
    const readers = useMemo(() => ({
        carrier: (s: CarrierNotifications) => s.c.legalName,
        roles: (s: CarrierNotifications) => s.on,
        people: (s: CarrierNotifications) => s.people.length,
        coverage: (s: CarrierNotifications) => s.gaps,
        admins: (s: CarrierNotifications) => (s.adminsNotified ? 0 : 1),
        status: (s: CarrierNotifications) => STATUSES.indexOf(s.c.status),
    }), []);
    const { sort, onSort, sorted } = useTableSort<Col, CarrierNotifications>(filtered, readers, { col: "carrier", dir: "asc" });
    const groupOf = (s: CarrierNotifications): { rank: number; label: string } | null =>
        groupBy === "coverage" ? { rank: s.gaps === 0 ? 1 : 0, label: coverageOf(s) }
            : groupBy === "admins" ? { rank: s.adminsNotified ? 0 : 1, label: adminsOf(s) }
                : groupBy === "status" ? { rank: STATUSES.indexOf(s.c.status), label: s.c.status }
                    : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((s, i) => ({ s, i, g: groupOf(s)! }))
        .sort((x, y) => x.g.rank - y.g.rank || x.i - y.i)
        .map((x) => x.s);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((s) => { const l = groupOf(s)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const show = (c: Col) => visible.has(c);
    const colCount = COLUMNS.filter((c) => c.locked || visible.has(c.id)).length + 1;
    const filterCount = [!!coverage, !!admins, !!status, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setQuery(""); setCoverage(""); setAdmins(""); setStatus(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    const flipAdmins = (s: CarrierNotifications) => {
        setProfileAdminsNotified(s.c.id, !s.adminsNotified);
        say(`${s.c.dbaName || s.c.legalName} ${s.adminsNotified ? "no longer escalates" : "now escalates"} to the Admins of ${spName}`);
    };

    return (
        <ListScrollFrame
            above={<>
                {above}
                <KpiStatRow stats={stats} activeId={activeId} onPick={pickKpi} />
            </>}
            title="Carrier profiles"
            count={grouped.length}
            total={rows.length}
            description={<>Who is told about each carrier's compliance records, and whether it escalates to the Admins of {spName} — click a row to open that carrier's monitoring settings.</>}
            actions={<ColumnPicker columns={COLUMNS} visible={visible}
                onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={query} onSearch={toPage1(setQuery)} placeholder="Search carrier, USDOT, people…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={coverage} onChange={toPage1(setCoverage)} title="Coverage" allLabel="Any coverage" options={COVERAGE} />
                        <FilterSelect value={admins} onChange={toPage1(setAdmins)} title="Profile Admins" allLabel="Admins: any" options={ADMINS} />
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="All statuses" options={STATUSES} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={GROUPS} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="carrier" label="Carrier" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("roles") && <SortTh col="roles" label="Notification roles" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("admins") && <SortTh col="admins" label="Profile Admins" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("coverage") && <SortTh col="coverage" label="Coverage" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("people") && <SortTh col="people" label="Notified" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <Truck className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{rows.length ? "No carrier matches" : "No carrier profiles yet"}</p>
                                <p className="mt-1 text-xs text-slate-500">{rows.length ? "Try another filter or search." : "Create one in Users & Roles ▸ Carrier profiles."}</p>
                                {touched && (
                                    <button type="button" onClick={reset}
                                        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                        Clear filters
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((s, i) => {
                        const g = groupOf(s);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const open = canOpen(s.c);
                        const items = [
                            { label: "View monitoring", icon: BellRing, onClick: () => onViewMonitoring(s.c) },
                            ...(onOpenTeam ? [{ label: "Open its team", icon: UsersIcon, onClick: () => onOpenTeam(s.c) }] : []),
                            ...(canManage ? [{ label: s.adminsNotified ? "Stop escalating to Admins" : "Escalate to profile Admins", icon: ShieldCheck, onClick: () => flipAdmins(s) }] : []),
                        ];
                        return (
                            <Fragment key={s.c.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className={cn("group transition-colors hover:bg-slate-50", open && "cursor-pointer")} onClick={() => open && onOpenSettings(s.c)}>
                                    <TD>
                                        <div className="flex items-center gap-2.5" title={`${s.c.legalName}${s.c.dbaName ? ` · DBA ${s.c.dbaName}` : ""}`}>
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{initialsOf(s.c)}</span>
                                            <span className="font-semibold text-slate-900">{s.c.legalName}</span>
                                            {s.c.dbaName && <span className="text-xs text-slate-500">· DBA {s.c.dbaName}</span>}
                                            {s.fleetAdmins === 0 && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700" title="Nobody holds the Fleet Admin role here — roles addressed to Fleet Admins reach no one">No Fleet Admin</span>}
                                        </div>
                                    </TD>
                                    {show("roles") && (
                                        <TD>
                                            <span className="font-semibold tabular-nums text-slate-900">{s.on}</span>
                                            <span className="ml-1 text-xs text-slate-500">on{s.paused > 0 && <> · {s.paused} paused</>}</span>
                                        </TD>
                                    )}
                                    {show("admins") && (
                                        <TD onClick={(e) => e.stopPropagation()}>
                                            <span className="inline-flex items-center gap-2" title={canManage ? `Escalate ${s.c.dbaName || s.c.legalName}'s alerts to the Admins of ${spName}` : "Set by an Admin of the service profile"}>
                                                <RoleToggle on={s.adminsNotified} disabled={!canManage} onClick={() => flipAdmins(s)} />
                                                <span className={cn("text-[12px] font-semibold", s.adminsNotified ? "text-indigo-700" : "text-slate-400")}>{s.adminsNotified ? "Escalates" : "Off"}</span>
                                            </span>
                                        </TD>
                                    )}
                                    {show("coverage") && (
                                        <TD>
                                            <span className="flex items-center gap-1">
                                                <CoverPill Icon={Building2} label="Carrier" muted={!s.coverage.carrier} />
                                                <CoverPill Icon={UserRound} label="Drivers" muted={!s.coverage.drivers} />
                                                <CoverPill Icon={Truck} label="Assets" muted={!s.coverage.assets} />
                                                {s.gaps > 0 && <span className="ml-1 text-[11px] font-semibold text-rose-600">{s.gaps} not covered</span>}
                                            </span>
                                        </TD>
                                    )}
                                    {show("people") && (
                                        <TD>
                                            {s.people.length === 0 ? (
                                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Nobody</span>
                                            ) : (
                                                <span className="flex items-center gap-1" title={s.people.map((p) => (p.via ? `${p.name} (via ${p.via})` : p.name)).join("\n")}>
                                                    {s.people.slice(0, 2).map((p) => <RecipientChip key={p.id} r={p} />)}
                                                    {s.people.length > 2 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{s.people.length - 2}</span>}
                                                </span>
                                            )}
                                        </TD>
                                    )}
                                    {show("status") && (
                                        <TD>
                                            <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", s.c.status === "Active" ? "text-emerald-600" : s.c.status === "Pending" ? "text-amber-600" : "text-slate-500")}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full", s.c.status === "Active" ? "bg-emerald-500" : s.c.status === "Pending" ? "bg-amber-500" : "bg-slate-300")} />{s.c.status}
                                            </span>
                                        </TD>
                                    )}
                                    <TD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                        <RowActions noun="carrier" name={s.c.legalName} openLabel="Open monitoring settings"
                                            onOpen={open ? () => onOpenSettings(s.c) : undefined} extra={items} />
                                    </TD>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}

// ── Admin ▸ Monitoring & Notifications — the overview as a page of its own ─────

export function ServiceMonitoringPage({ currentUser, serviceProfileId, onSelectServiceProfile, onNavigate, onSelectAccount, usersPath = "/service-profile/users-roles" }: {
    currentUser: AppUser | null;
    serviceProfileId?: string;
    onSelectServiceProfile?: (id: string) => void;
    onNavigate: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
    /** The Users & Roles page of the group this was opened from. */
    usersPath?: string;
}) {
    useDirectoryVersion();
    const profiles = profilesFor(currentUser);
    const [spId, setSpId] = useState<string | undefined>(() => {
        if (serviceProfileId && profiles.some((p) => p.id === serviceProfileId)) return serviceProfileId;
        return (currentUser && profilesOfUser(currentUser)[0]) || profiles[0]?.id;
    });
    const { say, node: toast } = useToast();
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(spId);
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;

    const sp = profiles.find((p) => p.id === spId) ?? profiles[0];
    if (!sp) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <BellRing size={28} className="mx-auto mb-3 text-slate-400" />
                    <h2 className="mb-1 text-lg font-bold text-slate-900">No service profile</h2>
                    <p className="text-sm text-slate-500">You're not part of a service profile yet. Ask a Super Admin to add you.</p>
                </div>
            </div>
        );
    }
    const spName = sp.dbaName || sp.legalName;
    const canManage = canManageProfile(currentUser, sp.id);
    const carriers = carriersOfProfile(sp.id);
    const role = currentUser?.role;
    const tone = role === "super-admin" ? "border-violet-200 bg-violet-50 text-violet-800" : canManage ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-600";
    const Icon = role === "super-admin" ? Crown : canManage ? ShieldCheck : Lock;
    const strip = (
        <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]", tone)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">
                {role === "super-admin"
                    ? <>You're a <b>Super Admin</b> — every service profile. Showing <b>{spName}</b>'s carriers.</>
                    : canManage
                        ? <>You're an <b>Admin of {spName}</b> — each carrier's Fleet Admin sets up its alerts; you see all of them here and decide which escalate to you.</>
                        : <>You're a <b>{role ? ROLE_LABELS[role] : "guest"}</b> — you can see how {spName}'s carriers are covered. Only its Admins change it.</>}
            </span>
            {profiles.length > 1 && (
                <span className="shrink-0">
                    <ServiceProfileSwitcher selectedProfileId={sp.id} profiles={profiles} onSelect={(id) => { setSpId(id); onSelectServiceProfile?.(id); }}
                        scopeLabel={role === "super-admin" ? `Super Admin · All ${profiles.length} profiles` : `${profiles.length} profiles`} />
                </span>
            )}
        </div>
    );
    const openSettings = (c: AccountRecord) => { onSelectAccount?.(c); onNavigate("/settings/default-compliance-monitoring"); };
    const viewMonitoring = (c: AccountRecord) => { onSelectAccount?.(c); onNavigate("/default-compliance-monitoring"); };
    const openTeam = (c: AccountRecord) => { onSelectAccount?.(c); onNavigate("/settings/users-roles"); };

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={BellRing}
                title="Monitoring & Notifications"
                description={<>Who gets compliance notifications on each carrier of <span className="font-semibold text-slate-700">{sp.legalName}</span>, and which carriers escalate to its Admins.</>}
                count={carriers.length}
                countTitle={`${carriers.length} carrier profiles`}
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                actions={<>
                    <Button variant="outline" className={condensed ? "h-8" : "h-9"} onClick={() => onNavigate(usersPath)}>
                        <UserCog className="h-4 w-4" /> Users &amp; Roles
                    </Button>
                    <Button variant="outline" className={condensed ? "h-8" : "h-9"} onClick={() => onNavigate("/default-compliance-monitoring")}>
                        <Settings2 className="h-4 w-4" /> View monitoring <ExternalLink className="h-3 w-3" />
                    </Button>
                </>}
            />
            <ProfileNotificationsTab key={sp.id} sp={sp} carriers={carriers} canManage={canManage} canOpen={(c) => canOpenCarrier(currentUser, c)}
                above={strip} scrollRef={scrollRef} onScroll={onScroll}
                onOpenSettings={openSettings} onViewMonitoring={viewMonitoring} onOpenTeam={openTeam} say={say} />
            {toast}
        </div>
        </ListHeaderBridge>
    );
}
