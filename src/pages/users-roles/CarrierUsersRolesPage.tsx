import React, { Fragment, useMemo, useState } from "react";
import {
    BellRing, Building2, Crown, ExternalLink, Lock, Power, RotateCcw, Send, Settings2,
    ShieldCheck, Trash2, Truck, UserCog, UserPlus, Users as UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type SubTab } from "@/components/ui/SubTabs";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import { ListHeaderBridge, chipsFromStats, useListHeaderBridge } from "@/components/ui/list-header-bridge";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { KebabMenu, type KebabItem } from "@/components/ui/KebabMenu";
import {
    APP_USERS, CARRIER_ROLES, ROLE_LABELS, isDriverUser, removeAppUser, roleOn, roleRank, updateAppUser,
    type AppUser, type UserRole,
} from "@/data/users.data";
import { getAccountById } from "@/pages/accounts/accounts.data";
import { getServiceProfileById } from "@/pages/accounts/service-profiles.data";
import {
    reminderSummary, requestOpenNotificationRole, rolesReaching, useMonitoringRouting, type NotificationRole,
} from "@/pages/compliance/monitoring-routing.data";
import { NotificationRolesList } from "@/pages/compliance/notification-roles-ui";
import { ROLE_META } from "./roles.data";
import { canManageProfile, carriersOf, setCarrierRoles, useDirectoryVersion, usersOfProfile } from "./scope";
import { UserDialog, type UserDialogState } from "./UserDialog";
import { AccessMatrix, Avatar, KPI_ACCENT, RoleBadge, RoleCardsGrid, StatusDot, useToast } from "./pieces";
import { RoleRecipientsDialog, UserAlertsDialog, recipientFor, recipientIdsOf, userListedOnRole, userOnRole } from "./AlertDialogs";

// ─────────────────────────────────────────────────────────────────────────────
// Settings ▸ Users & Roles — one carrier's team, as its Fleet Admin sees it.
//
// The four carrier roles only: Fleet Admin, Safety Manager, User, Driver. The service profile
// above it (its Admins, TrackSmart's Super Admins) is not listed here — it is where these
// roles are given out from, and the page says so. What this page adds is the question every
// carrier asks about its team: who gets the monitoring alerts? Each person shows the
// notification roles that reach them — by name, or through the role they hold — and the
// Alerts tab is the same list of notification roles Settings ▸ Monitoring & Notifications
// manages in full. Both write to the one per-carrier store.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "users" | "roles" | "access" | "alerts";

const MONITORING_SETUP = "/settings/default-compliance-monitoring";

export function CarrierUsersRolesPage({ currentUser, accountId, onNavigate }: {
    currentUser: AppUser | null;
    /** The carrier picked in the top bar. */
    accountId?: string;
    onNavigate: (path: string) => void;
}) {
    useDirectoryVersion();
    const me = currentUser;
    const account = accountId ? getAccountById(accountId) : undefined;
    const sp = getServiceProfileById(account?.serviceProfileId);
    const [tab, setTab] = useState<Tab>("users");
    const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
    const [userDialog, setUserDialog] = useState<UserDialogState | null>(null);
    const [alertsFor, setAlertsFor] = useState<AppUser | null>(null);
    const [recipientsFor, setRecipientsFor] = useState<NotificationRole | null>(null);
    const { say, node: toast } = useToast();
    // The table (or the tab body) is what scrolls; the header band shrinks as it does.
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(tab);
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;

    // The same seed the monitoring pages use, so a carrier opened here first starts with the
    // same default notification roles it would have got there.
    const seedUsers = useMemo(() => APP_USERS.filter((u) => u.status === "Active"), []);
    const { roles: alertRoles, updateRole, removeRole, reminders } = useMonitoringRouting(account?.id, seedUsers);

    if (!account) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <Truck size={28} className="mx-auto mb-3 text-slate-400" />
                    <h2 className="mb-1 text-lg font-bold text-slate-900">No carrier selected</h2>
                    <p className="text-sm text-slate-500">Pick a carrier in the top bar to see its team.</p>
                </div>
            </div>
        );
    }

    const carrier = account.dbaName || account.legalName;
    const spName = sp ? sp.dbaName || sp.legalName : undefined;
    const admins = sp ? usersOfProfile(sp.id).filter((u) => u.role === "admin" && u.status !== "Inactive") : [];
    const fleetAdminHere = !!me && me.role !== "admin" && me.role !== "super-admin" && carriersOf(me).includes(account.id) && roleOn(me, account.id) === "fleet-admin";
    /** Gives out roles here: Super Admin, an Admin of the service profile this carrier is under, or this carrier's own Fleet Admin. */
    const canAssign = me?.role === "super-admin" || (!!sp && canManageProfile(me, sp.id)) || fleetAdminHere;
    /** Decides who gets alerts: the same people. */
    const canAlerts = canAssign;

    // Everyone with access to this carrier, seen AS their role on this carrier — a Fleet Admin
    // here may be a User elsewhere. Writes still go by id, so the copies are safe to hand on.
    const team = APP_USERS
        .filter((u) => carriersOf(u).includes(account.id) && CARRIER_ROLES.includes(roleOn(u, account.id)))
        .map((u) => ({ ...u, role: roleOn(u, account.id) }))
        .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
    const countOf = (r: UserRole) => team.filter((u) => u.role === r).length;
    const alertsOf = (u: AppUser) => alertRoles.filter((r) => userOnRole(r, u, account.id));

    const openFullSetup = () => onNavigate(MONITORING_SETUP);

    const stats: KpiStat[] = [
        { id: "all", label: "Team", value: team.length, Icon: UsersIcon, accent: "violet" },
        ...CARRIER_ROLES.map((r) => ({ id: r, label: `${ROLE_LABELS[r]}s`, value: countOf(r), Icon: ROLE_META[r].Icon, accent: KPI_ACCENT[r] })),
    ];
    const pickKpi = (id: string) => setRoleFilter(id === "all" || id === roleFilter ? "" : id as UserRole);

    const tabs: SubTab<Tab>[] = [
        { id: "users", label: "Users", icon: UsersIcon, count: team.length },
        { id: "roles", label: "Roles", icon: ShieldCheck, count: CARRIER_ROLES.length },
        { id: "access", label: "Access", icon: Lock },
        { id: "alerts", label: "Monitoring & Notifications", icon: BellRing, count: alertRoles.length },
    ];

    const userMenu = (u: AppUser): KebabItem[] => {
        const self = u.id === me?.id;
        const items: KebabItem[] = [];
        if (canAssign) items.push({ label: "Edit role", icon: UserCog, onClick: () => setUserDialog({ mode: "edit", user: u }) });
        if (canAlerts) items.push({ label: "Monitoring alerts…", icon: BellRing, onClick: () => setAlertsFor(u) });
        if (canAssign && u.status === "Invited") items.push({ label: "Resend invitation", icon: Send, onClick: () => say(`Invitation sent again to ${u.email}`) });
        if (canAssign && !self && u.status !== "Inactive") items.push({ label: "Deactivate", icon: Power, onClick: () => { updateAppUser(u.id, { status: "Inactive" }); say(`${u.name} can no longer sign in`); } });
        if (canAssign && u.status === "Inactive") items.push({ label: "Reactivate", icon: RotateCcw, onClick: () => { updateAppUser(u.id, { status: "Active" }); say(`${u.name} can sign in again`); } });
        if (canAssign && !self) items.push({
            label: isDriverUser(u) ? "Remove login" : "Remove from carrier", icon: Trash2, danger: true, onClick: () => {
                const what = isDriverUser(u)
                    ? `Remove ${u.name}'s login? They stay on the ${carrier} roster.`
                    : carriersOf(u).length > 1 ? `Take ${u.name} off ${carrier}? They keep their other carriers.` : `Remove ${u.name}? They will no longer be able to sign in.`;
                if (!window.confirm(what)) return;
                if (!isDriverUser(u) && carriersOf(u).length > 1) {
                    setCarrierRoles(u, [account], {});
                    say(`${u.name} taken off ${carrier}`);
                } else {
                    removeAppUser(u.id);
                    say(`${u.name} removed`);
                }
            },
        });
        return items;
    };

    /** One person's notification roles, ticked and unticked — the ones they are named on. */
    const saveUserAlerts = (u: AppUser, on: Record<string, string[]>) => {
        const ids = recipientIdsOf(u);
        const wanted = on[account.id] ?? [];
        let n = 0;
        for (const r of alertRoles) {
            const was = userListedOnRole(r, u), is = wanted.includes(r.id);
            if (was === is) continue;
            n++;
            updateRole(r.id, { recipients: is ? [...r.recipients, recipientFor(u)] : r.recipients.filter((x) => !ids.includes(x.id)) });
        }
        setAlertsFor(null);
        say(n ? `${u.name}'s monitoring alerts updated` : "No change");
    };

    const strip = <AuthorityStrip me={me} carrier={carrier} spName={spName} admins={admins} canAssign={canAssign} canAlerts={canAlerts}
        onServiceProfile={sp ? () => onNavigate("/service-profile/users-roles") : undefined} />;

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={UsersIcon}
                title="Users & Roles"
                description={<>Who works on <span className="font-semibold text-slate-700">{account.legalName}</span>, as what, and who gets its monitoring alerts.</>}
                count={team.length}
                countTitle={`${team.length} on this carrier`}
                condensed={condensed}
                chips={tab === "users" ? chipsFromStats(stats, roleFilter || "all", pickKpi) : bridge.chips ?? undefined}
                tabs={tabs}
                activeTab={tab}
                onTabChange={(id) => setTab(id as Tab)}
                tabsLabel="Users & Roles sections"
                actions={canAssign && (
                    <Button className={cn("bg-blue-600 text-white hover:bg-blue-700", condensed ? "h-8" : "h-9")} onClick={() => setUserDialog({ mode: "add" })}>
                        <UserPlus className="h-4 w-4" /> Add user
                    </Button>
                )}
            />

            {tab === "users" && (
                <TeamTab team={team} me={me} canAssign={canAssign} canAlerts={canAlerts}
                    roleFilter={roleFilter} onRoleFilter={setRoleFilter}
                    alertsOf={alertsOf} viaOf={(r, u) => rolesReaching(r, u, account.id)} menu={userMenu}
                    above={<>
                        {strip}
                        <KpiStatRow stats={stats} activeId={roleFilter || "all"} onPick={pickKpi} />
                    </>}
                    scrollRef={scrollRef} onScroll={onScroll} />
            )}
            {tab === "alerts" && (
                <NotificationRolesList
                    accountId={account.id}
                    roles={alertRoles}
                    total={alertRoles.length}
                    carrierName={carrier}
                    canEdit={canAlerts}
                    onEdit={(r) => { requestOpenNotificationRole(r.id); openFullSetup(); }}
                    onRecipients={(r) => setRecipientsFor(r)}
                    onToggle={(r) => { updateRole(r.id, { enabled: !r.enabled }); say(`${r.name} ${r.enabled ? "paused" : "resumed"}`); }}
                    onDelete={(r) => { removeRole(r.id); say(`${r.name} deleted`); }}
                    onCreate={() => { requestOpenNotificationRole("new"); openFullSetup(); }}
                    actions={<>
                        <Button variant="outline" className="h-9" onClick={openFullSetup}><Settings2 className="h-4 w-4" /> Full setup</Button>
                        {canAlerts && <Button className="h-9 bg-blue-600 text-white hover:bg-blue-700" onClick={() => { requestOpenNotificationRole("new"); openFullSetup(); }}><BellRing className="h-4 w-4" /> New role</Button>}
                    </>}
                    above={<>
                        {strip}
                        {/* When and how, said once — this tab is about who. */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
                            <BellRing className="h-4 w-4 text-amber-600" />
                            <span>Reminders go out <b>{reminderSummary(reminders)}</b> a record is due. Email or in-app is chosen on each record; the roles below decide <b>who</b> is told.</span>
                        </div>
                    </>}
                    scrollRef={scrollRef} onScroll={onScroll} />
            )}
            {tab === "access" && (
                <AccessMatrix roles={CARRIER_ROLES} editable={me?.role === "super-admin"}
                    note={me?.role === "super-admin" ? "Click a cell — the sidebar follows it for everyone with that role, on every carrier" : "The same on every carrier · set by TrackSmart"}
                    frame={{ above: strip, scrollRef, onScroll }} />
            )}
            {tab === "roles" && (
                <div ref={scrollRef} onScroll={onScroll} className={cn("min-h-0 flex-1 overflow-y-auto py-4 sm:py-5 [overflow-anchor:none]", PAGE_PAD)}>
                    <div className="space-y-5">
                        {strip}
                        <RoleCardsGrid roles={CARRIER_ROLES} countOf={countOf} countSuffix={() => "on this carrier"} showLevel={false} />
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-[13px] text-slate-600">
                            <Building2 className="h-4 w-4 text-blue-500" />
                            {spName ? (
                                <>
                                    <span>These roles are given out from <b className="text-slate-800">{spName}</b>{admins.length > 0 && <> by {admins.map((a) => a.name).join(", ")}</>}.</span>
                                    <button type="button" onClick={() => onNavigate("/service-profile/users-roles")} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
                                        Service Profile ▸ Users & Roles <ExternalLink className="h-3 w-3" />
                                    </button>
                                </>
                            ) : <span>This carrier is not under a service profile yet — a Super Admin gives out its roles.</span>}
                        </div>
                    </div>
                </div>
            )}

            {userDialog && (
                <UserDialog state={userDialog} sp={sp} carriers={[account]} lockCarrierId={account.id} me={me}
                    onClose={() => setUserDialog(null)}
                    onDone={(text) => { setUserDialog(null); say(text); }} />
            )}
            {alertsFor && (
                <UserAlertsDialog user={alertsFor} sections={[{ accountId: account.id, carrier, roles: alertRoles }]} canEdit={canAlerts}
                    onClose={() => setAlertsFor(null)} onSave={(on) => saveUserAlerts(alertsFor, on)} onOpenFullSetup={openFullSetup} />
            )}
            {recipientsFor && (
                <RoleRecipientsDialog role={recipientsFor} team={team} accountId={account.id} canEdit={canAlerts}
                    onClose={() => setRecipientsFor(null)}
                    onSave={(recipients) => { updateRole(recipientsFor.id, { recipients }); setRecipientsFor(null); say(`${recipientsFor.name} now goes to ${recipients.length ? recipients.map((r) => r.name).join(", ") : "nobody"}`); }}
                    onOpenFullSetup={() => { requestOpenNotificationRole(recipientsFor.id); openFullSetup(); }} />
            )}
            {toast}
        </div>
        </ListHeaderBridge>
    );
}

// ── Who is looking, and what they may do here ────────────────────────────────

function AuthorityStrip({ me, carrier, spName, admins, canAssign, canAlerts, onServiceProfile }: {
    me: AppUser | null; carrier: string; spName?: string; admins: AppUser[]; canAssign: boolean; canAlerts: boolean; onServiceProfile?: () => void;
}) {
    const role = me?.role;
    const tone = role === "super-admin" ? "border-violet-200 bg-violet-50 text-violet-800"
        : canAssign ? "border-blue-200 bg-blue-50 text-blue-800"
            : canAlerts ? "border-sky-200 bg-sky-50 text-sky-800" : "border-slate-200 bg-slate-50 text-slate-600";
    const Icon = role === "super-admin" ? Crown : canAssign ? ShieldCheck : canAlerts ? Settings2 : Lock;
    const from = spName ? <>Roles here are given out from <b>{spName}</b>{admins.length > 0 && <> by {admins.map((a) => a.name).join(", ")}</>}.</> : null;
    const text = role === "super-admin"
        ? <>You're a <b>Super Admin</b> — all access. Showing <b>{carrier}</b>'s team.</>
        : canAssign
            ? <>You're an <b>Admin of {spName}</b> — you give out roles on {carrier} and decide who gets its monitoring alerts.</>
            : canAlerts
                ? <>You're the <b>Fleet Admin of {carrier}</b> — you decide who gets its monitoring alerts. {from}</>
                : <>You're a <b>{role ? ROLE_LABELS[role] : "guest"}</b> — you can see the team. {from}</>;
    return (
        <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]", tone)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{text}</span>
            {onServiceProfile && (
                <button type="button" onClick={onServiceProfile} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold hover:underline">
                    Service Profile ▸ Users & Roles <ExternalLink className="h-3 w-3" />
                </button>
            )}
        </div>
    );
}

// ── Team ─────────────────────────────────────────────────────────────────────

type TCol = "user" | "role" | "title" | "alerts" | "status";
const T_COLS: PickerColumn<TCol>[] = [
    { id: "user", label: "User", locked: true },
    { id: "role", label: "Role" },
    { id: "title", label: "Job title" },
    { id: "alerts", label: "Monitoring alerts" },
    { id: "status", label: "Status" },
];
type TGroup = "none" | "role" | "status" | "alerts";
const T_GROUPS: { id: TGroup; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "role", label: "Group: Role" },
    { id: "status", label: "Group: Status" },
    { id: "alerts", label: "Group: Monitoring alerts" },
];
const USER_STATUSES: AppUser["status"][] = ["Active", "Invited", "Inactive"];
const ALERT_OPTIONS = ["Gets monitoring alerts", "Gets no alerts"];

const TD = ({ children, className, onClick, title }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void; title?: string }) => (
    <td onClick={onClick} title={title} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

function TeamTab({ team, me, canAssign, canAlerts, roleFilter, onRoleFilter, alertsOf, viaOf, menu, above, scrollRef, onScroll }: {
    team: AppUser[]; me: AppUser | null; canAssign: boolean; canAlerts: boolean;
    roleFilter: UserRole | ""; onRoleFilter: (r: UserRole | "") => void;
    alertsOf: (u: AppUser) => NotificationRole[];
    /** The roles a notification role reaches this person through, if any. */
    viaOf: (r: NotificationRole, u: AppUser) => UserRole[];
    menu: (u: AppUser) => KebabItem[];
    above?: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [alerts, setAlerts] = useState("");
    const [groupBy, setGroupBy] = useState<TGroup>("none");
    const [visible, setVisible] = useState<Set<TCol>>(() => new Set(T_COLS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const q = query.trim().toLowerCase();
    const rows = team.filter((u) => {
        if (q && ![u.name, u.email, u.title].some((s) => s?.toLowerCase().includes(q))) return false;
        if (roleFilter && u.role !== roleFilter) return false;
        if (status && u.status !== status) return false;
        if (alerts && (alertsOf(u).length > 0 ? ALERT_OPTIONS[0] : ALERT_OPTIONS[1]) !== alerts) return false;
        return true;
    });

    const readers = useMemo(() => ({
        user: (u: AppUser) => u.name,
        role: (u: AppUser) => roleRank(u.role),
        title: (u: AppUser) => u.title ?? "",
        alerts: (u: AppUser) => alertsOf(u).length,
        status: (u: AppUser) => USER_STATUSES.indexOf(u.status),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- alertsOf reads the live roles
    }), [alertsOf]);
    const { sort, onSort, sorted } = useTableSort<TCol, AppUser>(rows, readers, null);

    const groupOf = (u: AppUser): { rank: number; label: string } | null =>
        groupBy === "role" ? { rank: roleRank(u.role), label: ROLE_LABELS[u.role] }
            : groupBy === "status" ? { rank: USER_STATUSES.indexOf(u.status), label: u.status }
                : groupBy === "alerts" ? (alertsOf(u).length ? { rank: 0, label: "Gets monitoring alerts" } : { rank: 1, label: "Gets no alerts" })
                    : null;
    const grouped = groupBy === "none" ? sorted : sorted
        .map((u, i) => ({ u, i, g: groupOf(u)! }))
        .sort((x, y) => x.g.rank - y.g.rank || x.i - y.i)
        .map((x) => x.u);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((u) => { const l = groupOf(u)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const hasActions = canAssign || canAlerts;
    const show = (c: TCol) => visible.has(c);
    const colCount = T_COLS.filter((c) => c.locked || visible.has(c.id)).length + (hasActions ? 1 : 0);
    const filterCount = [!!roleFilter, !!status, !!alerts, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setQuery(""); onRoleFilter(""); setStatus(""); setAlerts(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    return (
        <ListScrollFrame
            above={above}
            title="Users"
            count={grouped.length}
            total={team.length}
            description={canAssign ? "Everyone on this carrier — click a row to edit their role." : canAlerts ? "Everyone on this carrier — click a row to change their monitoring alerts." : "Everyone on this carrier and the alerts that reach them."}
            actions={<ColumnPicker columns={T_COLS} visible={visible}
                onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={query} onSearch={toPage1(setQuery)} placeholder="Search name, email, title…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={roleFilter ? ROLE_LABELS[roleFilter] : ""} title="Role" allLabel="All roles"
                            options={CARRIER_ROLES.map((r) => ROLE_LABELS[r])}
                            onChange={toPage1((v: string) => onRoleFilter(CARRIER_ROLES.find((r) => ROLE_LABELS[r] === v) ?? ""))} />
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="All statuses" options={USER_STATUSES} />
                        <FilterSelect value={alerts} onChange={toPage1(setAlerts)} title="Monitoring alerts" allLabel="Alerts: everyone" options={ALERT_OPTIONS} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={T_GROUPS} />
                            <ResetFilters on={touched} onReset={reset} />
                        </div>
                    </>} />
            }
            footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
        >
            <table className="w-full">
                <thead>
                    <tr>
                        <SortTh col="user" label="User" sortable sort={sort} onSort={onSort} className={PIN_TH} />
                        {show("role") && <SortTh col="role" label="Role" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("title") && <SortTh col="title" label="Job title" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("alerts") && <SortTh col="alerts" label="Monitoring alerts" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {hasActions && <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <UsersIcon className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{touched ? "Nobody matches" : "Nobody on this carrier yet"}</p>
                                <p className="mt-1 text-xs text-slate-500">{touched ? "Try another role, filter or search." : canAssign ? "Add a Fleet Admin, Safety Manager, User or Driver with Add user." : "The service profile's Admin adds the team."}</p>
                                {touched && (
                                    <button type="button" onClick={reset}
                                        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                        Clear filters
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((u, i) => {
                        const g = groupOf(u);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const items = menu(u);
                        return (
                            <Fragment key={u.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className={cn("group transition-colors hover:bg-slate-50", items.length && "cursor-pointer")} onClick={() => items[0]?.onClick()}>
                                    <TD>
                                        <div className="flex items-center gap-2.5" title={`${u.name} · ${u.email}`}>
                                            <Avatar u={u} size="sm" />
                                            <span className="font-semibold text-slate-900">{u.name}</span>
                                            {u.id === me?.id && <span className="rounded-full bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700">You</span>}
                                            <span className="text-xs text-slate-500">· {u.email}</span>
                                        </div>
                                    </TD>
                                    {show("role") && <TD><RoleBadge role={u.role} /></TD>}
                                    {show("title") && <TD className="max-w-[16rem] truncate text-[13px] text-slate-600" title={u.title}>{u.title || "—"}</TD>}
                                    {show("alerts") && <TD><AlertsCell roles={alertsOf(u)} viaOf={(r) => viaOf(r, u)} /></TD>}
                                    {show("status") && <TD><StatusDot status={u.status} /></TD>}
                                    {hasActions && (
                                        <TD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                            {items.length > 0 && <KebabMenu title={`Actions for ${u.name}`} items={items} />}
                                        </TD>
                                    )}
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}

/** The notification roles reaching a person — the first two named, the rest counted; paused ones greyed; a lock where the role they hold brings it. */
function AlertsCell({ roles, viaOf }: { roles: NotificationRole[]; viaOf: (r: NotificationRole) => UserRole[] }) {
    if (roles.length === 0) return <span className="text-[12px] text-slate-400">—</span>;
    const shown = roles.slice(0, 2);
    const line = (r: NotificationRole) => { const via = viaOf(r); return `${r.name}${r.enabled ? "" : " (paused)"}${via.length ? ` — via ${via.map((x) => ROLE_LABELS[x]).join(" + ")} role` : ""}`; };
    return (
        <span className="flex items-center gap-1.5" title={roles.map(line).join("\n")}>
            <BellRing className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            {shown.map((r) => (
                <span key={r.id} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                    r.enabled ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-400 line-through")}>
                    {viaOf(r).length > 0 && <Lock className="h-3 w-3 opacity-60" />}{r.name}
                </span>
            ))}
            {roles.length > 2 && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{roles.length - 2}</span>}
        </span>
    );
}
