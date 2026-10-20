import { useMemo, useState } from "react";
import {
    BellRing, Building2, Crown, ExternalLink, Info, Lock, Pause, Pencil, Play, Power, RotateCcw, Send, Settings2,
    ShieldCheck, Trash2, Truck, UserCog, UserPlus, Users as UsersIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ListHeader } from "@/pages/hiring-process/ListHeader";
import { ActionsCell, CELL, NameCell, Paged, ROW_CLS, RowTable } from "@/pages/hiring-process/SetupTable";
import type { KebabItem } from "@/components/ui/KebabMenu";
import {
    APP_USERS, CARRIER_ROLES, ROLE_LABELS, isDriverUser, removeAppUser, roleRank, updateAppUser,
    type AppUser, type UserRole,
} from "@/data/users.data";
import { getAccountById } from "@/pages/accounts/accounts.data";
import { getServiceProfileById } from "@/pages/accounts/service-profiles.data";
import {
    reminderSummary, requestOpenNotificationRole, useMonitoringRouting, type NotificationRole,
} from "@/pages/compliance/monitoring-routing.data";
import { ROLE_META } from "./roles.data";
import { canManageProfile, carriersOf, useDirectoryVersion, usersOfProfile } from "./scope";
import { UserDialog, type UserDialogState } from "./UserDialog";
import { AccessMatrix, Avatar, KPI_ACCENT, RoleBadge, RoleCardsGrid, StatusDot, useToast } from "./pieces";
import {
    CoverPill, RoleRecipientsDialog, UserAlertsDialog, coverChips, recipientFor, recipientIdsOf, userOnRole,
} from "./AlertDialogs";

// ─────────────────────────────────────────────────────────────────────────────
// Settings ▸ Users & Roles — one carrier's team.
//
// The four carrier roles only: Fleet Admin, Safety Manager, User, Driver. The service profile
// above it (its Admins, TrackSmart's Super Admins) is not listed here — it is where these
// roles are given out from, and the page says so. What this page adds is the question every
// carrier asks about its team: who gets the monitoring alerts? Each person shows the
// notification roles they are on, and each notification role shows who is on it. Both write
// to the carrier's notification roles that Settings ▸ Default Compliance & Monitoring manages
// in full.
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "team" | "alerts" | "roles" | "info";

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
    const [tab, setTab] = useState<Tab>("team");
    const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
    const [alertFilter, setAlertFilter] = useState<"" | "yes" | "no">("");
    const [userDialog, setUserDialog] = useState<UserDialogState | null>(null);
    const [alertsFor, setAlertsFor] = useState<AppUser | null>(null);
    const [recipientsFor, setRecipientsFor] = useState<NotificationRole | null>(null);
    const { say, node: toast } = useToast();

    // The same seed the monitoring pages use, so a carrier opened here first starts with the
    // same default notification roles it would have got there.
    const seedUsers = useMemo(() => APP_USERS.filter((u) => u.status === "Active"
        && (u.role === "super-admin" || carriersOf(u).includes(account?.id ?? ""))), [account?.id]);
    const { roles: alertRoles, updateRole, reminders } = useMonitoringRouting(account?.id, seedUsers);

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
    /** Gives out roles: Super Admin, or an Admin of the service profile this carrier is under. */
    const canAssign = me?.role === "super-admin" || (!!sp && canManageProfile(me, sp.id));
    const fleetAdminHere = me?.role === "fleet-admin" && carriersOf(me).includes(account.id);
    /** Decides who gets alerts: the same people, plus this carrier's own Fleet Admin. */
    const canAlerts = canAssign || fleetAdminHere;

    const team = APP_USERS
        .filter((u) => CARRIER_ROLES.includes(u.role) && carriersOf(u).includes(account.id))
        .sort((a, b) => roleRank(a.role) - roleRank(b.role) || a.name.localeCompare(b.name));
    const countOf = (r: UserRole) => team.filter((u) => u.role === r).length;
    const alertsOf = (u: AppUser) => alertRoles.filter((r) => userOnRole(r, u));
    const onRoles = (r: NotificationRole) => team.filter((u) => userOnRole(r, u));

    const openFullSetup = () => onNavigate(MONITORING_SETUP);

    const stats: KpiStat[] = [
        { id: "all", label: "Team", value: team.length, Icon: UsersIcon, accent: "violet" },
        ...CARRIER_ROLES.map((r) => ({ id: r, label: `${ROLE_LABELS[r]}s`, value: countOf(r), Icon: ROLE_META[r].Icon, accent: KPI_ACCENT[r] })),
    ];

    const tabs: SubTab<Tab>[] = [
        { id: "team", label: "Team", icon: UsersIcon, count: team.length },
        { id: "alerts", label: "Alerts & notifications", icon: BellRing, count: alertRoles.length },
        { id: "roles", label: "Roles", icon: ShieldCheck, count: CARRIER_ROLES.length },
        { id: "info", label: "Information", icon: Info },
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
                    const rest = carriersOf(u).filter((id) => id !== account.id);
                    updateAppUser(u.id, { managedAccountIds: rest, accountId: rest[0], accountName: getAccountById(rest[0])?.legalName });
                    say(`${u.name} taken off ${carrier}`);
                } else {
                    removeAppUser(u.id);
                    say(`${u.name} removed`);
                }
            },
        });
        return items;
    };

    const alertMenu = (r: NotificationRole): KebabItem[] => {
        if (!canAlerts) return [];
        return [
            { label: "Change who gets it", icon: UsersIcon, onClick: () => setRecipientsFor(r) },
            { label: r.enabled ? "Pause" : "Resume", icon: r.enabled ? Pause : Play, onClick: () => { updateRole(r.id, { enabled: !r.enabled }); say(`${r.name} ${r.enabled ? "paused" : "resumed"}`); } },
            { label: "Edit in full setup", icon: Pencil, onClick: () => { requestOpenNotificationRole(r.id); openFullSetup(); } },
        ];
    };

    /** One person's notification roles, ticked and unticked. */
    const saveUserAlerts = (u: AppUser, on: string[]) => {
        const ids = recipientIdsOf(u);
        let n = 0;
        for (const r of alertRoles) {
            const was = userOnRole(r, u), is = on.includes(r.id);
            if (was === is) continue;
            n++;
            updateRole(r.id, { recipients: is ? [...r.recipients, recipientFor(u)] : r.recipients.filter((x) => !ids.includes(x.id)) });
        }
        setAlertsFor(null);
        say(n ? `${u.name} now gets ${on.length ? on.length : "no"} kind${on.length === 1 ? "" : "s"} of monitoring alert` : "No change");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-[1440px] px-6 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-[16rem] flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Settings · {carrier}</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Users & Roles</h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">Who works on {account.legalName}, as what, and who gets its monitoring alerts.</p>
                        </div>
                        {canAssign && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setUserDialog({ mode: "add" })}><UserPlus className="h-4 w-4" /> Add user</Button>
                            </div>
                        )}
                    </div>
                    <AuthorityStrip me={me} carrier={carrier} spName={spName} admins={admins} canAssign={canAssign} canAlerts={canAlerts}
                        onServiceProfile={sp ? () => onNavigate("/service-profile/users-roles") : undefined} />
                </div>
                <div className="mx-auto max-w-[1440px] px-6">
                    <SubTabs tabs={tabs} activeId={tab} onChange={setTab} bordered={false} />
                </div>
            </div>

            <div className="mx-auto max-w-[1440px] space-y-5 px-6 py-6">
                {tab === "team" && (
                    <>
                        <KpiStatRow stats={stats} activeId={roleFilter || "all"}
                            onPick={(id) => setRoleFilter(id === "all" || id === roleFilter ? "" : id as UserRole)} />
                        <TeamTab team={team} me={me} canAssign={canAssign} canAlerts={canAlerts}
                            roleFilter={roleFilter} onRoleFilter={setRoleFilter}
                            alertFilter={alertFilter} onAlertFilter={setAlertFilter}
                            alertsOf={alertsOf} menu={userMenu} />
                    </>
                )}
                {tab === "alerts" && (
                    <AlertsTab roles={alertRoles} reminders={reminders} canAlerts={canAlerts} onRoles={onRoles}
                        menu={alertMenu} onOpenFullSetup={openFullSetup}
                        onNew={() => { requestOpenNotificationRole("new"); openFullSetup(); }} />
                )}
                {tab === "roles" && (
                    <AccessMatrix roles={CARRIER_ROLES} editable={me?.role === "super-admin"}
                        note={me?.role === "super-admin" ? "Click a cell — the sidebar follows it for everyone with that role, on every carrier" : "The same on every carrier · set by TrackSmart"} />
                )}
                {tab === "info" && (
                    <div className="space-y-5">
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
                )}
            </div>

            {userDialog && (
                <UserDialog state={userDialog} sp={sp} carriers={[account]} lockCarrierId={account.id} me={me}
                    onClose={() => setUserDialog(null)}
                    onDone={(text) => { setUserDialog(null); say(text); }} />
            )}
            {alertsFor && (
                <UserAlertsDialog user={alertsFor} roles={alertRoles} canEdit={canAlerts}
                    onClose={() => setAlertsFor(null)} onSave={(on) => saveUserAlerts(alertsFor, on)} onOpenFullSetup={openFullSetup} />
            )}
            {recipientsFor && (
                <RoleRecipientsDialog role={recipientsFor} team={team} canEdit={canAlerts}
                    onClose={() => setRecipientsFor(null)}
                    onSave={(recipients) => { updateRole(recipientsFor.id, { recipients }); setRecipientsFor(null); say(`${recipientsFor.name} now goes to ${recipients.length ? recipients.map((r) => r.name).join(", ") : "nobody"}`); }}
                    onOpenFullSetup={openFullSetup} />
            )}
            {toast}
        </div>
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
        <div className={cn("mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]", tone)}>
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

function TeamTab({ team, me, canAssign, canAlerts, roleFilter, onRoleFilter, alertFilter, onAlertFilter, alertsOf, menu }: {
    team: AppUser[]; me: AppUser | null; canAssign: boolean; canAlerts: boolean;
    roleFilter: UserRole | ""; onRoleFilter: (r: UserRole | "") => void;
    alertFilter: "" | "yes" | "no"; onAlertFilter: (v: "" | "yes" | "no") => void;
    alertsOf: (u: AppUser) => NotificationRole[]; menu: (u: AppUser) => KebabItem[];
}) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const searched = team.filter((u) => !q || [u.name, u.email, u.title].some((s) => s?.toLowerCase().includes(q)));
    const byAlert = searched.filter((u) => !alertFilter ? true : alertFilter === "yes" ? alertsOf(u).length > 0 : alertsOf(u).length === 0);
    const rows = byAlert.filter((u) => !roleFilter || u.role === roleFilter);
    const filtered = !!(q || roleFilter || alertFilter);
    const hasActions = canAssign || canAlerts;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <ListHeader title="Team" count={rows.length} total={byAlert.length} query={query} onQuery={setQuery}
                placeholder="Search name, email, title…" chipsLabel="Role" allCount={byAlert.length}
                chips={CARRIER_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r], count: byAlert.filter((u) => u.role === r).length, dot: ROLE_META[r].dot }))}
                chip={roleFilter} onChip={(id) => onRoleFilter(id as UserRole | "")}
                onReset={filtered ? () => { setQuery(""); onRoleFilter(""); onAlertFilter(""); } : undefined}
                extra={
                    <select value={alertFilter} onChange={(e) => onAlertFilter(e.target.value as "" | "yes" | "no")} aria-label="Monitoring alerts"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-52">
                        <option value="">Alerts: everyone</option>
                        <option value="yes">Gets monitoring alerts</option>
                        <option value="no">Gets no alerts</option>
                    </select>
                } />
            {rows.length === 0 ? (
                <div className="px-6 py-14 text-center">
                    <UsersIcon className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">{filtered ? "Nobody matches" : "Nobody on this carrier yet"}</p>
                    <p className="mt-1 text-xs text-slate-500">{filtered ? "Try another role, filter or search." : canAssign ? "Add a Fleet Admin, Safety Manager, User or Driver with Add user." : "The service profile's Admin adds the team."}</p>
                </div>
            ) : (
                <Paged items={rows}>{(slice) => (
                    <RowTable minW={900} cols={[{ label: "User" }, { label: "Role", w: "w-36" }, { label: "Job title", w: "w-40" }, { label: "Monitoring alerts", w: "w-64" }, { label: "Status", w: "w-24" }]} noActions={!hasActions}>
                        {slice.map((u) => {
                            const items = menu(u);
                            return (
                                <tr key={u.id} className={items.length ? ROW_CLS : "transition-colors hover:bg-slate-50/70"} onClick={() => items[0]?.onClick()}>
                                    <td className="px-5 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar u={u} />
                                            <div className="min-w-0">
                                                <p className="flex min-w-0 items-center gap-1.5">
                                                    <span className="truncate font-semibold text-slate-900" title={u.name}>{u.name}</span>
                                                    {u.id === me?.id && <span className="shrink-0 rounded-full bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700">You</span>}
                                                </p>
                                                <p className="truncate text-[12px] text-slate-500" title={u.email}>{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={CELL}><RoleBadge role={u.role} /></td>
                                    <td className={cn(CELL, "truncate")} title={u.title}>{u.title || "—"}</td>
                                    <td className={cn(CELL, "overflow-hidden")}><AlertsCell roles={alertsOf(u)} /></td>
                                    <td className={CELL}><StatusDot status={u.status} /></td>
                                    {hasActions && <ActionsCell name={u.name} items={items} />}
                                </tr>
                            );
                        })}
                    </RowTable>
                )}</Paged>
            )}
        </div>
    );
}

/** The notification roles a person is on — the first two named, the rest counted; paused ones greyed. */
function AlertsCell({ roles }: { roles: NotificationRole[] }) {
    if (roles.length === 0) return <span className="text-[12px] text-slate-400">—</span>;
    const shown = roles.slice(0, 2);
    return (
        <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap" title={roles.map((r) => `${r.name}${r.enabled ? "" : " (paused)"}`).join("\n")}>
            <BellRing className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            {shown.map((r) => (
                <span key={r.id} className={cn("truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
                    r.enabled ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-400 line-through")}>{r.name}</span>
            ))}
            {roles.length > 2 && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{roles.length - 2}</span>}
        </span>
    );
}

// ── Alerts & notifications ───────────────────────────────────────────────────

function AlertsTab({ roles, reminders, canAlerts, onRoles, menu, onOpenFullSetup, onNew }: {
    roles: NotificationRole[]; reminders: number[]; canAlerts: boolean;
    onRoles: (r: NotificationRole) => AppUser[]; menu: (r: NotificationRole) => KebabItem[];
    onOpenFullSetup: () => void; onNew: () => void;
}) {
    const [query, setQuery] = useState("");
    const [chip, setChip] = useState("");
    const q = query.trim().toLowerCase();
    const searched = roles.filter((r) => !q || [r.name, r.description, ...r.recipients.map((x) => x.name)].some((s) => s?.toLowerCase().includes(q)));
    const test = (r: NotificationRole, id: string) =>
        id === "carrier" ? r.carrier
            : id === "drivers" ? r.allDrivers || r.driverIds.length > 0
                : id === "assets" ? r.allAssets || r.assetIds.length > 0
                    : id === "paused" ? !r.enabled : true;
    const rows = searched.filter((r) => !chip || test(r, chip));
    const chips = [
        { id: "carrier", label: "Carrier records", dot: "bg-blue-500" },
        { id: "drivers", label: "Driver records", dot: "bg-emerald-500" },
        { id: "assets", label: "Asset records", dot: "bg-sky-500" },
        { id: "paused", label: "Paused", dot: "bg-slate-400" },
    ].map((x) => ({ ...x, count: searched.filter((r) => test(r, x.id)).length }));

    return (
        <div className="space-y-4">
            {/* When and how, said once — this page is about who. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
                <BellRing className="h-4 w-4 text-amber-600" />
                <span>Reminders go out <b>{reminderSummary(reminders)}</b> a record is due. Email or in-app is chosen on each record; the roles below decide <b>who</b> is told.</span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <ListHeader title="Notification roles" count={rows.length} total={searched.length} query={query} onQuery={setQuery}
                    placeholder="Search roles, people…" chipsLabel="Covers" allCount={searched.length}
                    chips={chips} chip={chip} onChip={setChip}
                    onReset={q || chip ? () => { setQuery(""); setChip(""); } : undefined}
                    extra={
                        <div className="flex items-center gap-2">
                            <Button variant="outline" className="h-10" onClick={onOpenFullSetup}><Settings2 className="h-4 w-4" /> Full setup</Button>
                            {canAlerts && <Button className="h-10 bg-blue-600 text-white hover:bg-blue-700" onClick={onNew}><BellRing className="h-4 w-4" /> New role</Button>}
                        </div>
                    } />
                {rows.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <BellRing className="mx-auto h-7 w-7 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">{roles.length ? "No role matches" : "No notification roles yet"}</p>
                        <p className="mt-1 text-xs text-slate-500">{roles.length ? "Try another filter or search." : "Create one in the full setup to start sending alerts."}</p>
                    </div>
                ) : (
                    <Paged items={rows}>{(slice) => (
                        <RowTable minW={920} cols={[{ label: "Notification role" }, { label: "Covers", w: "w-72" }, { label: "Who gets it", w: "w-64" }, { label: "Status", w: "w-24" }]} noActions={!canAlerts}>
                            {slice.map((r) => {
                                const items = menu(r);
                                const people = onRoles(r);
                                const others = r.recipients.length - people.length;
                                const chipsFor = coverChips(r);
                                return (
                                    <tr key={r.id} className={cn(items.length ? ROW_CLS : "transition-colors hover:bg-slate-50/70", !r.enabled && "opacity-60")} onClick={() => items[0]?.onClick()}>
                                        <NameCell icon={BellRing} accent={r.enabled ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"} name={r.name} sub={r.description || `${r.recipients.length} recipient${r.recipients.length === 1 ? "" : "s"}`} />
                                        <td className={cn(CELL, "overflow-hidden")}>
                                            <span className="flex items-center gap-1 whitespace-nowrap">
                                                {chipsFor.length ? chipsFor.map((c) => <CoverPill key={c.label} {...c} />) : <span className="text-slate-300">—</span>}
                                            </span>
                                        </td>
                                        <td className={cn(CELL, "overflow-hidden")}>
                                            {r.recipients.length === 0 ? (
                                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">Nobody yet{canAlerts ? " · add" : ""}</span>
                                            ) : (
                                                <span className="flex min-w-0 items-center gap-2 whitespace-nowrap" title={r.recipients.map((x) => x.name).join("\n")}>
                                                    <span className="flex shrink-0 -space-x-1.5">{people.slice(0, 3).map((u) => <Avatar key={u.id} u={u} size="sm" />)}</span>
                                                    <span className="truncate font-medium text-slate-700">{(people[0] ?? r.recipients[0]).name}</span>
                                                    {r.recipients.length > 1 && <span className="shrink-0 text-slate-400">+{r.recipients.length - 1}</span>}
                                                    {others > 0 && people.length > 0 && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500" title="Not on this carrier's team">{others} outside</span>}
                                                </span>
                                            )}
                                        </td>
                                        <td className={CELL}><StatusDot status={r.enabled ? "Active" : "Inactive"} label={r.enabled ? "On" : "Paused"} /></td>
                                        {canAlerts && <ActionsCell name={r.name} items={items} />}
                                    </tr>
                                );
                            })}
                        </RowTable>
                    )}</Paged>
                )}
            </div>
        </div>
    );
}
