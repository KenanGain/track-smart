import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
    Briefcase, Building2, Crown, ExternalLink, IdCard, Infinity as InfinityIcon, Lock, Network,
    Power, RotateCcw, Send, ShieldCheck, Trash2, Truck, UserCheck, UserCog, UserPlus, Users as UsersIcon,
    HardHat, UserRound, LayoutGrid, Check, AlertCircle, Pause, UserX, BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type SubTab } from "@/components/ui/SubTabs";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { ListScrollFrame } from "@/components/ui/ListScrollFrame";
import {
    ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager,
    useTableSort, type PickerColumn,
} from "@/components/ui/ListChrome";
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from "@/components/ui/list-chrome";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { ListHeaderBridge, chipsFromStats, useHeaderChips, useListHeaderBridge } from "@/components/ui/list-header-bridge";
import { ServiceProfileSwitcher } from "@/components/layout/ServiceProfileSwitcher";
import { KebabMenu, type KebabItem } from "@/components/ui/KebabMenu";
import {
    APP_USERS, ROLE_BADGE, ROLE_LABELS, ROLE_ORDER, hasRole, isDriverUser, removeAppUser, roleOn, roleRank, updateAppUser,
    type AppUser, type UserRole,
} from "@/data/users.data";
import { getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { formatLimit, isUnlimitedLimit, type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { LEVEL_META, ROLE_META, rolesAt } from "./roles.data";
import {
    canManageProfile, canOpenCarrier, carrierSlots, carriersOf, carriersOfProfile, profilesFor, profilesOfUser, useDirectoryVersion,
    usersOfProfile,
} from "./scope";
import { UserDialog, type UserDialogState } from "./UserDialog";
import { CarrierDialog } from "./CarrierDialog";
import { CarrierAccessDialog, GrantCarrierAccessDialog } from "./CarrierAccessDialogs";
import { AccessMatrix, Avatar, KPI_ACCENT, PROFILE_ROLES, RoleBadge, RoleCardsGrid, StatusDot, useToast } from "./pieces";
import { ProfileNotificationsTab } from "./ProfileNotifications";
import { UserAlertsDialog, recipientFor, recipientIdsOf, userListedOnRole, userOnRole, type AlertSection } from "./AlertDialogs";
import { rolesFor, subscribeMonitoringRouting, writeRolesFor, type NotificationRole } from "@/pages/compliance/monitoring-routing.data";

// ─────────────────────────────────────────────────────────────────────────────
// Service Profile ▸ Users & Roles
//
// One service profile at a time: its Admins, its carrier profiles and each carrier's team.
// Super Admin (TrackSmart) can open any service profile; an Admin opens their own and can
// create carrier profiles in it, add users to it or to one of its carriers, and give out the
// four carrier roles. Everybody else can look but not change anything.
//
// A carrier's own Settings has the same thing cut down to that carrier — see
// CarrierUsersRolesPage.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "users" | "carriers" | "roles" | "access" | "notifications";

const carrierName = (c?: AccountRecord) => (c ? c.dbaName || c.legalName : "—");

export function ServiceUsersRolesPage({ currentUser, serviceProfileId, onSelectServiceProfile, onNavigate, onSelectAccount }: {
    currentUser: AppUser | null;
    /** The service profile to open — the one the app has selected, or the user's own. */
    serviceProfileId?: string;
    onSelectServiceProfile?: (id: string) => void;
    onNavigate: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
}) {
    useDirectoryVersion();
    const profiles = profilesFor(currentUser);
    const [spId, setSpId] = useState<string | undefined>(() => {
        if (serviceProfileId && profiles.some((p) => p.id === serviceProfileId)) return serviceProfileId;
        return (currentUser && profilesOfUser(currentUser)[0]) || profiles[0]?.id;
    });
    const [tab, setTab] = useState<Tab>("users");
    const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
    const [carrierFilter, setCarrierFilter] = useState("");
    const [userDialog, setUserDialog] = useState<UserDialogState | null>(null);
    const [carrierDialog, setCarrierDialog] = useState(false);
    /** Carrier access for one person, and the other way round: people for one carrier. */
    const [accessFor, setAccessFor] = useState<AppUser | null>(null);
    const [grantFor, setGrantFor] = useState<AccountRecord | null>(null);
    /** Monitoring alerts for one person, on every carrier they work on. */
    const [alertsFor, setAlertsFor] = useState<AppUser | null>(null);
    // The notification roles live in their own store; re-read them when any carrier's change.
    const [routingTick, setRoutingTick] = useState(0);
    useEffect(() => subscribeMonitoringRouting(() => setRoutingTick((t) => t + 1)), []);
    const { say, node: toast } = useToast();
    // The table (or the tab body) is what scrolls; the header band shrinks as it does.
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(tab);
    // The list says when its KPI cards have scrolled away; the header then condenses and
    // carries their figures, and opens again when the cards come back.
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;

    const sp = profiles.find((p) => p.id === spId) ?? profiles[0];
    if (!sp) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <Briefcase size={28} className="mx-auto mb-3 text-slate-400" />
                    <h2 className="mb-1 text-lg font-bold text-slate-900">No service profile</h2>
                    <p className="text-sm text-slate-500">You're not part of a service profile yet. Ask a Super Admin to add you.</p>
                </div>
            </div>
        );
    }

    const spName = sp.dbaName || sp.legalName;
    const canManage = canManageProfile(currentUser, sp.id);
    const carriers = carriersOfProfile(sp.id);
    const users = usersOfProfile(sp.id).sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
    // A carrier role is held per carrier — somebody counts as a Fleet Admin if they lead any carrier.
    const countOf = (r: UserRole) => users.filter((u) => hasRole(u, r)).length;
    const supers = APP_USERS.filter((u) => u.role === "super-admin");

    /** An Admin cannot be the last one out of the door. */
    const lastAdmin = (u: AppUser) => u.role === "admin"
        && !users.some((x) => x.id !== u.id && x.role === "admin" && x.status !== "Inactive");

    const switchProfile = (id: string) => { setSpId(id); setCarrierFilter(""); setRoleFilter(""); onSelectServiceProfile?.(id); };

    /** The carriers whose alerts can reach this person — an Admin's are the whole profile. */
    const alertCarriers = (u: AppUser): AccountRecord[] => (u.role === "admin" ? carriers : carriers.filter((c) => carriersOf(u).includes(c.id)));
    const alertSections = (u: AppUser): AlertSection[] =>
        alertCarriers(u).map((c) => ({ accountId: c.id, carrier: c.dbaName || c.legalName, roles: rolesFor(c.id) }));
    /** How many notification roles reach a person, over how many carriers — for the Users column. */
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routingTick is the roles snapshot
    const alertsOf = useMemo(() => (u: AppUser) => {
        const lines: string[] = [];
        let count = 0, where = 0;
        for (const sec of alertSections(u)) {
            const hits = sec.roles.filter((r) => userOnRole(r, u, sec.accountId));
            if (!hits.length) continue;
            where++; count += hits.length;
            lines.push(`${sec.carrier}: ${hits.map((r) => r.name).join(", ")}`);
        }
        return { count, where, lines };
    }, [carriers, routingTick]);
    const saveUserAlerts = (u: AppUser, on: Record<string, string[]>) => {
        const ids = recipientIdsOf(u);
        let n = 0;
        for (const sec of alertSections(u)) {
            const wanted = on[sec.accountId] ?? [];
            let changed = false;
            const next: NotificationRole[] = sec.roles.map((r) => {
                const was = userListedOnRole(r, u), is = wanted.includes(r.id);
                if (was === is) return r;
                changed = true; n++;
                return { ...r, recipients: is ? [...r.recipients, recipientFor(u)] : r.recipients.filter((x) => !ids.includes(x.id)) };
            });
            if (changed) writeRolesFor(sec.accountId, next);
        }
        setAlertsFor(null);
        say(n ? `${u.name}'s monitoring alerts updated` : "No change");
    };

    const stats: KpiStat[] = [
        { id: "all", label: "All users", value: users.length, Icon: UsersIcon, accent: "violet" },
        ...PROFILE_ROLES.map((r) => ({ id: r, label: `${ROLE_LABELS[r]}s`, value: countOf(r), Icon: ROLE_META[r].Icon, accent: KPI_ACCENT[r] })),
    ];

    const tabs: SubTab<Tab>[] = [
        { id: "users", label: "Users", icon: UsersIcon, count: users.length },
        { id: "carriers", label: "Carrier profiles", icon: Truck, count: carriers.length },
        { id: "roles", label: "Roles", icon: ShieldCheck, count: ROLE_ORDER.length },
        { id: "access", label: "Access", icon: Lock },
        { id: "notifications", label: "Monitoring & Notifications", icon: BellRing, count: carriers.length },
    ];

    const userMenu = (u: AppUser): KebabItem[] => {
        if (!canManage) return [];
        const self = u.id === currentUser?.id;
        const items: KebabItem[] = [
            { label: "Edit user", icon: UserCog, onClick: () => setUserDialog({ mode: "edit", user: u }) },
            { label: "Carrier access & roles…", icon: Truck, onClick: () => setAccessFor(u) },
        ];
        if (alertCarriers(u).length) items.push({ label: "Monitoring alerts…", icon: BellRing, onClick: () => setAlertsFor(u) });
        if (u.status === "Invited") items.push({ label: "Resend invitation", icon: Send, onClick: () => say(`Invitation sent again to ${u.email}`) });
        if (!self && u.status !== "Inactive") items.push({
            label: "Deactivate", icon: Power, onClick: () => {
                if (lastAdmin(u)) return say(`${spName} needs at least one Admin — make somebody else Admin first.`, "warn");
                updateAppUser(u.id, { status: "Inactive" });
                say(`${u.name} can no longer sign in`);
            },
        });
        if (u.status === "Inactive") items.push({ label: "Reactivate", icon: RotateCcw, onClick: () => { updateAppUser(u.id, { status: "Active" }); say(`${u.name} can sign in again`); } });
        if (!self) items.push({
            label: isDriverUser(u) ? "Remove login" : "Remove user", icon: Trash2, danger: true, onClick: () => {
                if (lastAdmin(u)) return say(`${spName} needs at least one Admin — make somebody else Admin first.`, "warn");
                const what = isDriverUser(u) ? `Remove ${u.name}'s login? They stay on the ${u.accountName ?? "carrier"} roster.` : `Remove ${u.name}? They will no longer be able to sign in.`;
                if (!window.confirm(what)) return;
                removeAppUser(u.id);
                say(`${u.name} removed`);
            },
        });
        return items;
    };

    const strip = (
        <AuthorityStrip me={currentUser} sp={sp} canManage={canManage}
            switcher={profiles.length > 1 ? (
                <ServiceProfileSwitcher selectedProfileId={sp.id} profiles={profiles} onSelect={switchProfile}
                    scopeLabel={currentUser?.role === "super-admin" ? `Super Admin · All ${profiles.length} profiles` : `${profiles.length} profiles`} />
            ) : undefined} />
    );
    const noSlots = carrierSlots(sp).remaining === 0;

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* The band stays put and shrinks as the list is read; the tabs never scroll away. */}
            <ListPageHeader
                Icon={UsersIcon}
                title="Users & Roles"
                description={<>Who signs in under <span className="font-semibold text-slate-700">{sp.legalName}</span>, where they sit, and what each role can do.</>}
                condensed={condensed}
                chips={tab === "users" ? chipsFromStats(stats, roleFilter || "all", (id) => setRoleFilter(id === "all" || id === roleFilter ? "" : id as UserRole)) : bridge.chips ?? undefined}
                tabs={tabs}
                activeTab={tab}
                onTabChange={(id) => setTab(id as Tab)}
                tabsLabel="Users & Roles sections"
                actions={canManage && (
                    <>
                        <Button variant="outline" className={condensed ? "h-8" : "h-9"} onClick={() => setCarrierDialog(true)} disabled={noSlots}
                            title={noSlots ? "No carrier profiles left in this service profile" : undefined}>
                            <Truck className="h-4 w-4" /> Add carrier profile
                        </Button>
                        <Button className={cn("bg-blue-600 text-white hover:bg-blue-700", condensed ? "h-8" : "h-9")} onClick={() => setUserDialog({ mode: "add" })}>
                            <UserPlus className="h-4 w-4" /> Add user
                        </Button>
                    </>
                )}
            />

            {tab === "users" && (
                <UsersTab users={users} carriers={carriers} spName={spName} me={currentUser} canManage={canManage}
                    roleFilter={roleFilter} onRoleFilter={setRoleFilter}
                    carrierFilter={carrierFilter} onCarrierFilter={setCarrierFilter}
                    menu={userMenu} onOpen={(u) => canManage && setUserDialog({ mode: "edit", user: u })}
                    onAccess={canManage ? (u) => setAccessFor(u) : undefined}
                    alertsOf={alertsOf}
                    above={<>
                        {strip}
                        <KpiStatRow stats={stats} activeId={roleFilter || "all"}
                            onPick={(id) => setRoleFilter(id === "all" || id === roleFilter ? "" : id as UserRole)} />
                    </>}
                    scrollRef={scrollRef} onScroll={onScroll} />
            )}
            {tab === "carriers" && (
                <CarriersTab sp={sp} carriers={carriers} users={users} canManage={canManage}
                    canOpen={(c) => canOpenCarrier(currentUser, c)}
                    onAddUser={(carrierId, role) => setUserDialog({ mode: "add", carrierId, role })}
                    onGrant={(c) => setGrantFor(c)}
                    onViewUsers={(carrierId) => { setCarrierFilter(carrierId); setRoleFilter(""); setTab("users"); }}
                    onOpenCarrier={(c) => { onSelectAccount?.(c); onNavigate("/account/profile"); }}
                    above={strip}
                    scrollRef={scrollRef} onScroll={onScroll} />
            )}
            {tab === "notifications" && (
                <ProfileNotificationsTab key={sp.id} sp={sp} carriers={carriers} canManage={canManage} canOpen={(c) => canOpenCarrier(currentUser, c)}
                    above={strip} scrollRef={scrollRef} onScroll={onScroll} say={say}
                    onOpenSettings={(c) => { onSelectAccount?.(c); onNavigate("/settings/default-compliance-monitoring"); }}
                    onViewMonitoring={(c) => { onSelectAccount?.(c); onNavigate("/default-compliance-monitoring"); }}
                    onOpenTeam={(c) => { setCarrierFilter(c.id); setRoleFilter(""); setTab("users"); }} />
            )}
            {tab === "access" && (
                <AccessMatrix roles={ROLE_ORDER} editable={currentUser?.role === "super-admin"} frame={{ above: strip, scrollRef, onScroll }} />
            )}
            {tab === "roles" && (
                <div ref={scrollRef} onScroll={onScroll} className={cn("min-h-0 flex-1 overflow-y-auto py-4 sm:py-5 [overflow-anchor:none]", PAGE_PAD)}>
                    <div className="space-y-5">
                        {strip}
                        <InfoTab sp={sp} carriers={carriers} users={users} supers={supers}
                            onPickRole={(r) => { setRoleFilter(r); setCarrierFilter(""); setTab("users"); }} />
                    </div>
                </div>
            )}

            {userDialog && (
                <UserDialog state={userDialog} sp={sp} carriers={carriers} me={currentUser}
                    onClose={() => setUserDialog(null)}
                    onDone={(text) => { setUserDialog(null); say(text); }} />
            )}
            {carrierDialog && (
                <CarrierDialog sp={sp} me={currentUser} onClose={() => setCarrierDialog(false)}
                    onDone={(text) => { setCarrierDialog(false); setTab("carriers"); say(text); }} />
            )}
            {accessFor && (
                <CarrierAccessDialog user={accessFor} sp={sp} carriers={carriers}
                    onClose={() => setAccessFor(null)} onDone={(text) => { setAccessFor(null); say(text); }} />
            )}
            {grantFor && (
                <GrantCarrierAccessDialog carrier={grantFor} sp={sp} users={users}
                    onClose={() => setGrantFor(null)} onDone={(text) => { setGrantFor(null); say(text); }} />
            )}
            {alertsFor && (
                <UserAlertsDialog user={alertsFor} sections={alertSections(alertsFor)} canEdit={canManage}
                    onClose={() => setAlertsFor(null)} onSave={(on) => saveUserAlerts(alertsFor, on)}
                    onOpenFullSetup={(accountId) => { const c = carriers.find((x) => x.id === accountId); if (c) { onSelectAccount?.(c); onNavigate("/settings/default-compliance-monitoring"); } }} />
            )}
            {toast}
        </div>
        </ListHeaderBridge>
    );
}

// ── Who is looking, and what they may do here ────────────────────────────────

function AuthorityStrip({ me, sp, canManage, switcher }: { me: AppUser | null; sp: ServiceProfile; canManage: boolean; switcher?: React.ReactNode }) {
    const spName = sp.dbaName || sp.legalName;
    const role = me?.role;
    const tone = role === "super-admin" ? "border-violet-200 bg-violet-50 text-violet-800"
        : canManage ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-slate-50 text-slate-600";
    const Icon = role === "super-admin" ? Crown : canManage ? ShieldCheck : Lock;
    const text = role === "super-admin"
        ? <>You're a <b>Super Admin</b> — all access, every service profile. Showing <b>{spName}</b>.</>
        : canManage
            ? <>You're an <b>Admin of {spName}</b> — you can create carrier profiles, add users to {spName} or to a carrier, and give out carrier roles.</>
            : <>You're a <b>{role ? ROLE_LABELS[role] : "guest"}</b> — you can see who has access. Only an Admin of {spName} can change it.</>;
    return (
        <div className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]", tone)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{text}</span>
            {/* Which service profile — the switch sits where the page says which one it is showing. */}
            {switcher && <span className="shrink-0">{switcher}</span>}
        </div>
    );
}

// ── Users ────────────────────────────────────────────────────────────────────

type UCol = "user" | "role" | "access" | "title" | "alerts" | "status";
const U_COLS: PickerColumn<UCol>[] = [
    { id: "user", label: "User", locked: true },
    { id: "role", label: "Role" },
    { id: "access", label: "Carrier access" },
    { id: "title", label: "Job title" },
    { id: "alerts", label: "Monitoring alerts" },
    { id: "status", label: "Status" },
];
type UGroup = "none" | "role" | "carrier" | "status";
const U_GROUPS: { id: UGroup; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "role", label: "Group: Role" },
    { id: "carrier", label: "Group: Carrier" },
    { id: "status", label: "Group: Status" },
];
const USER_STATUSES: AppUser["status"][] = ["Active", "Invited", "Inactive"];

const UTD = ({ children, className, onClick, title }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void; title?: string }) => (
    <td onClick={onClick} title={title} className={cn("px-4 py-2.5 text-sm align-middle whitespace-nowrap", className)}>{children}</td>
);

function UsersTab({ users, carriers, spName, me, canManage, roleFilter, onRoleFilter, carrierFilter, onCarrierFilter, menu, onOpen, onAccess, alertsOf, above, scrollRef, onScroll }: {
    users: AppUser[]; carriers: AccountRecord[]; spName: string; me: AppUser | null; canManage: boolean;
    roleFilter: UserRole | ""; onRoleFilter: (r: UserRole | "") => void;
    carrierFilter: string; onCarrierFilter: (id: string) => void;
    menu: (u: AppUser) => KebabItem[]; onOpen: (u: AppUser) => void;
    /** Open the carrier-access dialog for a person — the access cell is a button when set. */
    onAccess?: (u: AppUser) => void;
    /** The notification roles reaching a person, over how many carriers. */
    alertsOf: (u: AppUser) => { count: number; where: number; lines: string[] };
    /** What scrolls away above the list — the notice and the KPI cards. */
    above?: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [groupBy, setGroupBy] = useState<UGroup>("none");
    const [visible, setVisible] = useState<Set<UCol>>(() => new Set(U_COLS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Where somebody sits, in words — the access column's sort key and the carrier grouping.
    const placeOf = (u: AppUser) => {
        if (u.role === "admin") return `${spName} — Admins`;
        const first = carriersOf(u).map((id) => carriers.find((c) => c.id === id)).find(Boolean);
        return first ? carrierName(first) : "No carrier yet";
    };

    const q = query.trim().toLowerCase();
    const rows = users.filter((u) => {
        if (q && ![u.name, u.email, u.title, u.accountName].some((s) => s?.toLowerCase().includes(q))) return false;
        if (carrierFilter && !(carrierFilter === "service" ? u.role === "admin" : carriersOf(u).includes(carrierFilter))) return false;
        if (roleFilter && !hasRole(u, roleFilter)) return false;
        if (status && u.status !== status) return false;
        return true;
    });

    const readers = useMemo(() => ({
        user: (u: AppUser) => u.name,
        role: (u: AppUser) => roleRank(u.role),
        access: (u: AppUser) => placeOf(u),
        title: (u: AppUser) => u.title ?? "",
        alerts: (u: AppUser) => alertsOf(u).count,
        status: (u: AppUser) => USER_STATUSES.indexOf(u.status),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- placeOf reads carriers/spName
    }), [carriers, spName, alertsOf]);
    const { sort, onSort, sorted } = useTableSort<UCol, AppUser>(rows, readers, null);

    const groupOf = (u: AppUser): { rank: number | string; label: string } | null => {
        switch (groupBy) {
            case "role": return { rank: roleRank(u.role), label: ROLE_LABELS[u.role] };
            case "carrier": { const p = placeOf(u); return { rank: u.role === "admin" ? "" : p === "No carrier yet" ? "~" : p, label: p }; }
            case "status": return { rank: USER_STATUSES.indexOf(u.status), label: u.status };
            default: return null;
        }
    };
    const grouped = groupBy === "none" ? sorted : sorted
        .map((u, i) => ({ u, i, g: groupOf(u)! }))
        .sort((x, y) => (typeof x.g.rank === "number" && typeof y.g.rank === "number"
            ? x.g.rank - y.g.rank : String(x.g.rank).localeCompare(String(y.g.rank))) || x.i - y.i)
        .map((r) => r.u);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((u) => { const l = groupOf(u)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const show = (c: UCol) => visible.has(c);
    const colCount = U_COLS.filter((c) => c.locked || visible.has(c.id)).length + (canManage ? 1 : 0);
    const filterCount = [!!roleFilter, !!carrierFilter, !!status, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setQuery(""); onRoleFilter(""); onCarrierFilter(""); setStatus(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    return (
        <ListScrollFrame
            title="User list" count={grouped.length} total={users.length}
            description={canManage ? `Everyone who signs in under ${spName} — click a row to edit them.` : `Everyone who signs in under ${spName}, where they sit and their role.`}
            actions={<ColumnPicker columns={U_COLS} visible={visible}
                        onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            above={above}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={query} onSearch={toPage1(setQuery)} placeholder="Search name, email, title…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={roleFilter ? ROLE_LABELS[roleFilter] : ""} title="Role" allLabel="All roles"
                            options={PROFILE_ROLES.map((r) => ROLE_LABELS[r])}
                            onChange={toPage1((v: string) => onRoleFilter(PROFILE_ROLES.find((r) => ROLE_LABELS[r] === v) ?? ""))} />
                        <select value={carrierFilter} onChange={(e) => { onCarrierFilter(e.target.value); setPage(1); }} title="Where they sit"
                            className="h-9 max-w-[13rem] rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                            <option value="">Everywhere in {spName}</option>
                            <option value="service">Service profile — Admins</option>
                            {carriers.length > 0 && (
                                <optgroup label="Carrier profiles">
                                    {carriers.map((c) => <option key={c.id} value={c.id}>{carrierName(c)}</option>)}
                                </optgroup>
                            )}
                        </select>
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="All statuses" options={USER_STATUSES} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={U_GROUPS} />
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
                        {show("access") && <SortTh col="access" label="Carrier access" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("title") && <SortTh col="title" label="Job title" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("alerts") && <SortTh col="alerts" label="Monitoring alerts" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {canManage && <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <UsersIcon className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{touched ? "Nobody matches" : "No users yet"}</p>
                                <p className="mt-1 text-xs text-slate-500">{touched ? "Try another role, carrier or search." : canManage ? "Add an Admin or a carrier's team with Add user." : "Nobody has been added here yet."}</p>
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
                                <tr className={cn("group transition-colors hover:bg-slate-50", canManage && "cursor-pointer")} onClick={() => onOpen(u)}>
                                    <UTD>
                                        <div className="flex items-center gap-2.5" title={`${u.name} · ${u.email}`}>
                                            <Avatar u={u} size="sm" />
                                            <span className="font-semibold text-slate-900">{u.name}</span>
                                            {u.id === me?.id && <span className="rounded-full bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700">You</span>}
                                            <span className="text-xs text-slate-500">· {u.email}</span>
                                        </div>
                                    </UTD>
                                    {show("role") && <UTD><RoleCell u={u} /></UTD>}
                                    {show("access") && <UTD><PlacementCell u={u} carriers={carriers} spName={spName} onClick={onAccess ? () => onAccess(u) : undefined} /></UTD>}
                                    {show("title") && <UTD className="max-w-[16rem] truncate text-[13px] text-slate-600" title={u.title}>{u.title || "—"}</UTD>}
                                    {show("alerts") && (() => {
                                        const a = alertsOf(u);
                                        return (
                                            <UTD title={a.lines.join("\n")}>
                                                {a.count === 0 ? <span className="text-[12px] text-slate-400">—</span> : (
                                                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                                                        <BellRing className="h-3.5 w-3.5 text-amber-500" />
                                                        <span className="font-semibold text-slate-800">{a.count} role{a.count === 1 ? "" : "s"}</span>
                                                        {a.where > 1 && <span className="text-slate-500">· {a.where} carriers</span>}
                                                    </span>
                                                )}
                                            </UTD>
                                        );
                                    })()}
                                    {show("status") && <UTD><StatusDot status={u.status} /></UTD>}
                                    {canManage && (
                                        <UTD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                            {items.length > 0 && <KebabMenu title={`Actions for ${u.name}`} items={items} />}
                                        </UTD>
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

/** Their role on their primary carrier — and, when it differs elsewhere, how many more roles they hold. */
function RoleCell({ u }: { u: AppUser }) {
    const others = [...new Set(Object.values(u.carrierRoles ?? {}))].filter((r) => r !== u.role);
    const title = Object.entries(u.carrierRoles ?? {}).map(([id, r]) => `${carrierName(getAccountById(id))} — ${ROLE_LABELS[r]}`).join("\n");
    return (
        <span className="flex min-w-0 items-center gap-1" title={others.length ? title : undefined}>
            <RoleBadge role={u.role} />
            {others.length > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{others.length}</span>}
        </span>
    );
}

/**
 * Which carrier profiles a person may work on: every one for an Admin; otherwise the first
 * named and the rest counted, each with its role in the tooltip. A button when access can be
 * changed — it opens the carrier-access dialog without opening the row.
 */
function PlacementCell({ u, carriers, spName, onClick }: { u: AppUser; carriers: AccountRecord[]; spName: string; onClick?: () => void }) {
    const mine = u.role === "admin" ? carriers : carriersOf(u).map((id) => carriers.find((c) => c.id === id)).filter(Boolean) as AccountRecord[];
    const title = u.role === "admin" ? `Admin of ${spName} — every carrier profile in it (${carriers.length})` : mine.map((c) => `${carrierName(c)} — ${ROLE_LABELS[roleOn(u, c.id)]}`).join("\n");
    const body = u.role === "admin" ? (
        <>
            <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="truncate font-medium text-slate-700">All {carriers.length} carrier{carriers.length === 1 ? "" : "s"}</span>
        </>
    ) : mine.length === 0 ? (
        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">No carrier yet{onClick ? " · give access" : ""}</span>
    ) : (
        <>
            <Truck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700">{carrierName(mine[0])}</span>
            {mine.length > 1 && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{mine.length - 1}</span>}
        </>
    );
    const cls = "flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap text-left";
    return onClick ? (
        <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} title={`${title}\nClick to change`}
            className={cn(cls, "rounded-md -mx-1.5 px-1.5 py-0.5 transition-colors hover:bg-blue-50")}>{body}</button>
    ) : <span className={cls} title={title}>{body}</span>;
}

// ── Carrier profiles ─────────────────────────────────────────────────────────

type CCol = "carrier" | "dot" | "location" | "fleetAdmin" | "team" | "status";
const C_COLS: PickerColumn<CCol>[] = [
    { id: "carrier", label: "Carrier", locked: true },
    { id: "dot", label: "USDOT" },
    { id: "location", label: "Location" },
    { id: "fleetAdmin", label: "Fleet Admin" },
    { id: "team", label: "Team" },
    { id: "status", label: "Status" },
];
type CGroup = "none" | "status" | "fleetAdmin" | "state";
const C_GROUPS: { id: CGroup; label: string }[] = [
    { id: "none", label: "No grouping" },
    { id: "status", label: "Group: Status" },
    { id: "fleetAdmin", label: "Group: Fleet Admin" },
    { id: "state", label: "Group: State / province" },
];
const CARRIER_STATUSES: AccountRecord["status"][] = ["Active", "Pending", "Suspended", "Inactive"];
const FA_OPTIONS = ["Assigned", "Not assigned"];

function CarriersTab({ sp, carriers, users, canManage, canOpen, onAddUser, onGrant, onViewUsers, onOpenCarrier, above, scrollRef, onScroll }: {
    sp: ServiceProfile; carriers: AccountRecord[]; users: AppUser[]; canManage: boolean;
    /** May the viewer be re-scoped to this carrier — a carrier role only to the ones they hold. */
    canOpen: (c: AccountRecord) => boolean;
    onAddUser: (carrierId: string, role?: UserRole) => void;
    /** Give people already in the service profile access to this carrier. */
    onGrant: (c: AccountRecord) => void;
    onViewUsers: (carrierId: string) => void;
    onOpenCarrier: (c: AccountRecord) => void;
    /** What scrolls away above the list — the notice. The KPI cards are added here. */
    above?: React.ReactNode;
    scrollRef?: React.Ref<HTMLDivElement>;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [fa, setFa] = useState("");
    const [stateF, setStateF] = useState("");
    const [groupBy, setGroupBy] = useState<CGroup>("none");
    const [visible, setVisible] = useState<Set<CCol>>(() => new Set(C_COLS.map((c) => c.id)));
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { used, remaining } = carrierSlots(sp);
    const team = (c: AccountRecord) => users.filter((u) => u.role !== "admin" && carriersOf(u).includes(c.id));
    const fleetAdmins = (c: AccountRecord) => team(c).filter((u) => roleOn(u, c.id) === "fleet-admin");
    const faOf = (c: AccountRecord) => (fleetAdmins(c).length ? "Assigned" : "Not assigned");
    const stateOptions = [...new Set(carriers.map((c) => c.state).filter(Boolean))].sort();

    const q = query.trim().toLowerCase();
    const rows = carriers.filter((c) => {
        if (q && ![c.legalName, c.dbaName, c.dotNumber, c.city, c.state].some((s) => s?.toLowerCase().includes(q))) return false;
        if (status && c.status !== status) return false;
        if (fa && faOf(c) !== fa) return false;
        if (stateF && c.state !== stateF) return false;
        return true;
    });

    const limitText = isUnlimitedLimit(sp.accountLimit) ? `${used} · unlimited` : `${used} of ${formatLimit(sp.accountLimit)}`;
    const stats: KpiStat[] = [
        { id: "all", label: "Carrier profiles", value: carriers.length, Icon: LayoutGrid, accent: "blue" },
        { id: "Active", label: "Active", value: carriers.filter((c) => c.status === "Active").length, Icon: Check, accent: "emerald" },
        { id: "Pending", label: "Pending", value: carriers.filter((c) => c.status === "Pending").length, Icon: AlertCircle, accent: "amber" },
        { id: "Inactive", label: "Inactive", value: carriers.filter((c) => c.status === "Inactive").length, Icon: Pause, accent: "slate" },
        { id: "no-fa", label: "No Fleet Admin", value: carriers.filter((c) => faOf(c) === "Not assigned").length, Icon: UserX, accent: "rose" },
        { id: "slots", label: remaining === Infinity ? "Carrier slots" : `Carrier slots · ${remaining} left`, value: limitText, Icon: InfinityIcon, accent: "violet" },
    ];
    const kpiActive = fa === "Not assigned" && !status ? "no-fa" : status || (!fa ? "all" : "");
    const pickKpi = (id: string) => {
        if (id === "slots") return;
        setPage(1);
        if (id === "all") { setStatus(""); setFa(""); return; }
        if (id === "no-fa") { setStatus(""); setFa(fa === "Not assigned" ? "" : "Not assigned"); return; }
        setFa(""); setStatus(status === id ? "" : id);
    };
    // The same figures, for the page header to show once the cards have scrolled away.
    useHeaderChips(chipsFromStats(stats, kpiActive, pickKpi));

    const readers = useMemo(() => ({
        carrier: (c: AccountRecord) => c.legalName,
        dot: (c: AccountRecord) => c.dotNumber,
        location: (c: AccountRecord) => `${c.state} ${c.city}`,
        fleetAdmin: (c: AccountRecord) => fleetAdmins(c)[0]?.name ?? "",
        team: (c: AccountRecord) => team(c).length,
        status: (c: AccountRecord) => CARRIER_STATUSES.indexOf(c.status),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- team/fleetAdmins read users
    }), [users]);
    const { sort, onSort, sorted } = useTableSort<CCol, AccountRecord>(rows, readers, { col: "carrier", dir: "asc" });

    const groupOf = (c: AccountRecord): { rank: number | string; label: string } | null => {
        switch (groupBy) {
            case "status": return { rank: CARRIER_STATUSES.indexOf(c.status), label: c.status };
            case "fleetAdmin": { const f = faOf(c); return { rank: f === "Not assigned" ? 0 : 1, label: f === "Not assigned" ? "No Fleet Admin" : "Fleet Admin assigned" }; }
            case "state": return { rank: c.state || "~", label: c.state ? `${c.state}, ${c.country}` : "No state" };
            default: return null;
        }
    };
    const grouped = groupBy === "none" ? sorted : sorted
        .map((c, i) => ({ c, i, g: groupOf(c)! }))
        .sort((x, y) => (typeof x.g.rank === "number" && typeof y.g.rank === "number"
            ? x.g.rank - y.g.rank : String(x.g.rank).localeCompare(String(y.g.rank))) || x.i - y.i)
        .map((r) => r.c);
    const groupCounts = new Map<string, number>();
    if (groupBy !== "none") grouped.forEach((c) => { const l = groupOf(c)!.label; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });

    const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
    const safePage = Math.min(page, pages);
    const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);

    const show = (c: CCol) => visible.has(c);
    const colCount = C_COLS.filter((c) => c.locked || visible.has(c.id)).length + 1;
    const filterCount = [!!status, !!fa, !!stateF, groupBy !== "none"].filter(Boolean).length;
    const touched = filterCount > 0 || !!q;
    const reset = () => { setQuery(""); setStatus(""); setFa(""); setStateF(""); setGroupBy("none"); setPage(1); };
    const toPage1 = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

    return (
        <ListScrollFrame
            title="Carrier profile list" count={grouped.length} total={carriers.length}
            description={`The carrier profiles in ${sp.dbaName || sp.legalName} and their teams — click a row to see its users.`}
            actions={<ColumnPicker columns={C_COLS} visible={visible}
                        onToggle={(id) => setVisible((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
            above={<>
                {above}
                <KpiStatRow stats={stats} activeId={kpiActive} onPick={pickKpi} />
            </>}
            scrollRef={scrollRef}
            onScroll={onScroll}
            contentKey={`${filtersOpen}|${slice.length}`}
            toolbar={
                <ListToolbar search={query} onSearch={toPage1(setQuery)} placeholder="Search name, USDOT, city…"
                    filters={<div className={mobileFold(filtersOpen)}>
                        <FilterSelect value={status} onChange={toPage1(setStatus)} title="Status" allLabel="All statuses" options={CARRIER_STATUSES} />
                        <FilterSelect value={fa} onChange={toPage1(setFa)} title="Fleet Admin" allLabel="Any Fleet Admin" options={FA_OPTIONS} />
                        <FilterSelect value={stateF} onChange={toPage1(setStateF)} title="State / province" allLabel="All states" options={stateOptions} />
                    </div>}
                    filtersExtra={<>
                        <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} count={filterCount} />
                        <div className={mobileFold(filtersOpen)}>
                            <GroupBySelect value={groupBy} onChange={toPage1(setGroupBy)} options={C_GROUPS} />
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
                        {show("dot") && <SortTh col="dot" label="USDOT" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("location") && <SortTh col="location" label="Location" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("fleetAdmin") && <SortTh col="fleetAdmin" label="Fleet Admin" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("team") && <SortTh col="team" label="Team" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        {show("status") && <SortTh col="status" label="Status" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
                        <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {slice.length === 0 && (
                        <tr>
                            <td colSpan={colCount} className="px-6 py-14 text-center">
                                <Truck className="mx-auto h-7 w-7 text-slate-300" />
                                <p className="mt-3 text-sm font-semibold text-slate-700">{carriers.length ? "No carrier matches" : "No carrier profiles yet"}</p>
                                <p className="mt-1 text-xs text-slate-500">{carriers.length ? "Try another search or filter." : canManage ? "Create the first one with Add carrier profile." : "An Admin creates them."}</p>
                                {touched && (
                                    <button type="button" onClick={reset}
                                        className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                                        Clear filters
                                    </button>
                                )}
                            </td>
                        </tr>
                    )}
                    {slice.map((c, i) => {
                        const g = groupOf(c);
                        const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
                        const t = team(c);
                        const fas = fleetAdmins(c);
                        const roster = getDriversForAccount(c.id).length;
                        const n = (r: UserRole) => t.filter((u) => roleOn(u, c.id) === r).length;
                        const ci = c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
                        const items: KebabItem[] = [
                            { label: "View its users", icon: UsersIcon, onClick: () => onViewUsers(c.id) },
                            ...(canManage ? [
                                { label: "Give a user access", icon: UserCheck, onClick: () => onGrant(c) },
                                { label: "Add a new user here", icon: UserPlus, onClick: () => onAddUser(c.id) },
                                ...(fas.length === 0 ? [{ label: "Add a Fleet Admin", icon: UserCog, onClick: () => onAddUser(c.id, "fleet-admin") }] : []),
                            ] : []),
                            ...(canOpen(c) ? [{ label: "Open carrier profile", icon: ExternalLink, onClick: () => onOpenCarrier(c) }] : []),
                        ];
                        return (
                            <Fragment key={c.id}>
                                {g && (!prev || prev.label !== g.label) && (
                                    <TableGroupBand label={g.label} count={groupCounts.get(g.label) ?? 0} colSpan={colCount} />
                                )}
                                <tr className="group cursor-pointer transition-colors hover:bg-slate-50" onClick={() => onViewUsers(c.id)}>
                                    <UTD>
                                        <div className="flex items-center gap-2.5" title={`${c.legalName}${c.dbaName ? ` · DBA ${c.dbaName}` : ""}`}>
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-[10px] font-bold text-blue-700">{ci}</span>
                                            <span className="font-semibold text-slate-900">{c.legalName}</span>
                                            {c.dbaName && <span className="text-xs text-slate-500">· DBA {c.dbaName}</span>}
                                        </div>
                                    </UTD>
                                    {show("dot") && <UTD className="font-mono text-xs text-slate-700">{c.dotNumber || <span className="text-slate-300">—</span>}</UTD>}
                                    {show("location") && <UTD className="text-[13px] text-slate-700">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</UTD>}
                                    {show("fleetAdmin") && (
                                        <UTD>
                                            {fas.length ? (
                                                <span className="flex items-center gap-2" title={fas.map((u) => u.name).join("\n")}>
                                                    <span className="flex -space-x-1.5">{fas.slice(0, 3).map((u) => <Avatar key={u.id} u={u} size="sm" />)}</span>
                                                    <span className="font-medium text-slate-700">{fas[0].name}</span>
                                                    {fas.length > 1 && <span className="text-slate-400">+{fas.length - 1}</span>}
                                                </span>
                                            ) : (
                                                <button type="button" disabled={!canManage} onClick={(e) => { e.stopPropagation(); onAddUser(c.id, "fleet-admin"); }}
                                                    className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 enabled:hover:bg-rose-100 disabled:cursor-default">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Not assigned{canManage ? " · add" : ""}
                                                </button>
                                            )}
                                        </UTD>
                                    )}
                                    {show("team") && (
                                        <UTD>
                                            <span className="flex items-center gap-1.5">
                                                <TeamPill Icon={HardHat} n={n("safety-manager")} tone="bg-amber-50 text-amber-700" title="Safety Managers" />
                                                <TeamPill Icon={UserRound} n={n("user")} tone="bg-slate-100 text-slate-600" title="Users" />
                                                <TeamPill Icon={IdCard} n={n("driver")} tone="bg-emerald-50 text-emerald-700" title={`Driver logins — ${roster} driver${roster === 1 ? "" : "s"} on the roster`}
                                                    suffix={roster ? `/${roster}` : undefined} />
                                            </span>
                                        </UTD>
                                    )}
                                    {show("status") && <UTD><StatusDot status={c.status === "Active" ? "Active" : c.status === "Pending" ? "Invited" : "Inactive"} label={c.status} /></UTD>}
                                    <UTD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                                        <KebabMenu title={`Actions for ${c.legalName}`} items={items} />
                                    </UTD>
                                </tr>
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </ListScrollFrame>
    );
}

function TeamPill({ Icon, n, tone, title, suffix }: { Icon: React.ElementType; n: number; tone: string; title: string; suffix?: string }) {
    return (
        <span title={`${n} ${title}`} className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums", n ? tone : "bg-slate-50 text-slate-300")}>
            <Icon className="h-3 w-3" /> {n}{suffix && <span className="font-medium opacity-70">{suffix}</span>}
        </span>
    );
}

// ── Information — how the levels stack and what each role is for ─────────────

function InfoTab({ sp, carriers, users, supers, onPickRole }: {
    sp: ServiceProfile; carriers: AccountRecord[]; users: AppUser[]; supers: AppUser[];
    onPickRole: (r: UserRole) => void;
}) {
    const spName = sp.dbaName || sp.legalName;
    const countOf = (r: UserRole) => r === "super-admin" ? supers.length : users.filter((u) => hasRole(u, r)).length;
    const tiers: { level: "platform" | "service" | "carrier"; where: string; does: string }[] = [
        { level: "platform", where: "TrackSmart", does: "All access — every service profile, carrier and setting." },
        { level: "service", where: sp.legalName, does: "Creates carrier profiles · adds users to the service profile or to a carrier · gives out carrier roles." },
        { level: "carrier", where: `${carriers.length} carrier profile${carriers.length === 1 ? "" : "s"} in ${spName}`, does: "Each carrier's own team. A Driver login is always a driver on that carrier's roster." },
    ];

    return (
        <div className="space-y-5">
            {/* How the levels stack */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                    <Network className="h-4 w-4 text-blue-600" />
                    <h2 className="text-sm font-bold text-slate-800">How access is layered</h2>
                </div>
                <ol className="relative px-5 py-4">
                    {tiers.map((t, i) => (
                        <li key={t.level} className="relative flex gap-4 pb-5 last:pb-0">
                            {i < tiers.length - 1 && <span aria-hidden className="absolute left-[17px] top-10 bottom-0 w-px bg-slate-200" />}
                            <span className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                t.level === "platform" ? "bg-violet-100 text-violet-700" : t.level === "service" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600")}>
                                {t.level === "platform" ? <Crown className="h-4 w-4" /> : t.level === "service" ? <Building2 className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{LEVEL_META[t.level].label} · <span className="normal-case tracking-normal text-slate-500">{t.where}</span></p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {rolesAt(t.level).map((r) => (
                                        <button key={r} type="button" disabled={r === "super-admin"} onClick={() => onPickRole(r)}
                                            title={r === "super-admin" ? undefined : `Show the ${ROLE_LABELS[r]}s`}
                                            className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors enabled:hover:brightness-95", ROLE_BADGE[r])}>
                                            {(() => { const I = ROLE_META[r].Icon; return <I className="h-3.5 w-3.5" />; })()}
                                            {ROLE_LABELS[r]}
                                            <span className="rounded-full bg-white/70 px-1.5 text-[10px] font-bold tabular-nums">{countOf(r)}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="mt-1.5 text-[13px] text-slate-500">{t.does}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <RoleCardsGrid roles={ROLE_ORDER} countOf={countOf} countSuffix={(r) => r === "super-admin" ? "on platform" : "here"} />
        </div>
    );
}
