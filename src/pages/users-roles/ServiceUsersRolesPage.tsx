import { useState } from "react";
import {
    Briefcase, Building2, Crown, ExternalLink, IdCard, Infinity as InfinityIcon, Info, Lock, Network,
    Power, RotateCcw, Send, ShieldCheck, Trash2, Truck, UserCog, UserPlus, Users as UsersIcon,
    HardHat, UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { KpiStatRow, type KpiStat } from "@/components/ui/KpiStatCard";
import { ServiceProfileSwitcher } from "@/components/layout/ServiceProfileSwitcher";
import { ListHeader } from "@/pages/hiring-process/ListHeader";
import { ActionsCell, CELL, Paged, ROW_CLS, RowTable } from "@/pages/hiring-process/SetupTable";
import type { KebabItem } from "@/components/ui/KebabMenu";
import {
    APP_USERS, ROLE_BADGE, ROLE_LABELS, ROLE_ORDER, isDriverUser, removeAppUser, roleRank, updateAppUser,
    type AppUser, type UserRole,
} from "@/data/users.data";
import type { AccountRecord } from "@/pages/accounts/accounts.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { formatLimit, isUnlimitedLimit, type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { LEVEL_META, ROLE_META, rolesAt } from "./roles.data";
import {
    canManageProfile, carrierSlots, carriersOf, carriersOfProfile, profilesFor, profilesOfUser, useDirectoryVersion,
    usersOfProfile,
} from "./scope";
import { UserDialog, type UserDialogState } from "./UserDialog";
import { CarrierDialog } from "./CarrierDialog";
import { AccessMatrix, Avatar, KPI_ACCENT, PROFILE_ROLES, RoleBadge, RoleCardsGrid, StatusDot, useToast } from "./pieces";

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

type Tab = "users" | "carriers" | "roles" | "info";

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
    const { say, node: toast } = useToast();

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
    const countOf = (r: UserRole) => users.filter((u) => u.role === r).length;
    const supers = APP_USERS.filter((u) => u.role === "super-admin");

    /** An Admin cannot be the last one out of the door. */
    const lastAdmin = (u: AppUser) => u.role === "admin"
        && !users.some((x) => x.id !== u.id && x.role === "admin" && x.status !== "Inactive");

    const switchProfile = (id: string) => { setSpId(id); setCarrierFilter(""); setRoleFilter(""); onSelectServiceProfile?.(id); };

    const stats: KpiStat[] = [
        { id: "all", label: "All users", value: users.length, Icon: UsersIcon, accent: "violet" },
        ...PROFILE_ROLES.map((r) => ({ id: r, label: `${ROLE_LABELS[r]}s`, value: countOf(r), Icon: ROLE_META[r].Icon, accent: KPI_ACCENT[r] })),
    ];

    const tabs: SubTab<Tab>[] = [
        { id: "users", label: "Users", icon: UsersIcon, count: users.length },
        { id: "carriers", label: "Carrier profiles", icon: Truck, count: carriers.length },
        { id: "roles", label: "Roles & access", icon: ShieldCheck, count: ROLE_ORDER.length },
        { id: "info", label: "Information", icon: Info },
    ];

    const userMenu = (u: AppUser): KebabItem[] => {
        if (!canManage) return [];
        const self = u.id === currentUser?.id;
        const items: KebabItem[] = [{ label: "Edit role & access", icon: UserCog, onClick: () => setUserDialog({ mode: "edit", user: u }) }];
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

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header band */}
            <div className="border-b border-slate-200 bg-white">
                <div className="mx-auto max-w-[1440px] px-6 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-[16rem] flex-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Service Profile · Access</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Users & Roles</h1>
                            <p className="mt-1 max-w-2xl text-sm text-slate-500">Who signs in under {sp.legalName}, where they sit, and what each role can do.</p>
                        </div>
                        {canManage && (
                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                <Button variant="outline" onClick={() => setCarrierDialog(true)}><Truck className="h-4 w-4" /> Add carrier profile</Button>
                                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setUserDialog({ mode: "add" })}><UserPlus className="h-4 w-4" /> Add user</Button>
                            </div>
                        )}
                    </div>
                    <AuthorityStrip me={currentUser} sp={sp} canManage={canManage}
                        switcher={profiles.length > 1 ? (
                            <ServiceProfileSwitcher selectedProfileId={sp.id} profiles={profiles} onSelect={switchProfile}
                                scopeLabel={currentUser?.role === "super-admin" ? `Super Admin · All ${profiles.length} profiles` : `${profiles.length} profiles`} />
                        ) : undefined} />
                </div>
                <div className="mx-auto max-w-[1440px] px-6">
                    <SubTabs tabs={tabs} activeId={tab} onChange={setTab} bordered={false} />
                </div>
            </div>

            <div className="mx-auto max-w-[1440px] space-y-5 px-6 py-6">
                {tab === "users" && (
                    <>
                        <KpiStatRow stats={stats} activeId={roleFilter || "all"}
                            onPick={(id) => setRoleFilter(id === "all" || id === roleFilter ? "" : id as UserRole)} />
                        <UsersTab users={users} carriers={carriers} spName={spName} me={currentUser} canManage={canManage}
                            roleFilter={roleFilter} onRoleFilter={setRoleFilter}
                            carrierFilter={carrierFilter} onCarrierFilter={setCarrierFilter}
                            menu={userMenu} onOpen={(u) => canManage && setUserDialog({ mode: "edit", user: u })} />
                    </>
                )}
                {tab === "carriers" && (
                    <CarriersTab sp={sp} carriers={carriers} users={users} canManage={canManage}
                        onAddCarrier={() => setCarrierDialog(true)}
                        onAddUser={(carrierId, role) => setUserDialog({ mode: "add", carrierId, role })}
                        onViewUsers={(carrierId) => { setCarrierFilter(carrierId); setRoleFilter(""); setTab("users"); }}
                        onOpenCarrier={(c) => { onSelectAccount?.(c); onNavigate("/account/profile"); }} />
                )}
                {tab === "roles" && (
                    <AccessMatrix roles={ROLE_ORDER} editable={currentUser?.role === "super-admin"} />
                )}
                {tab === "info" && (
                    <InfoTab sp={sp} carriers={carriers} users={users} supers={supers}
                        onPickRole={(r) => { setRoleFilter(r); setCarrierFilter(""); setTab("users"); }} />
                )}
            </div>

            {userDialog && (
                <UserDialog state={userDialog} sp={sp} carriers={carriers} me={currentUser}
                    onClose={() => setUserDialog(null)}
                    onDone={(text) => { setUserDialog(null); say(text); }} />
            )}
            {carrierDialog && (
                <CarrierDialog sp={sp} me={currentUser} onClose={() => setCarrierDialog(false)}
                    onDone={(text) => { setCarrierDialog(false); setTab("carriers"); say(text); }} />
            )}
            {toast}
        </div>
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
        <div className={cn("mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px]", tone)}>
            <Icon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{text}</span>
            {/* Which service profile — the switch sits where the page says which one it is showing. */}
            {switcher && <span className="shrink-0">{switcher}</span>}
        </div>
    );
}

// ── Users ────────────────────────────────────────────────────────────────────

function UsersTab({ users, carriers, spName, me, canManage, roleFilter, onRoleFilter, carrierFilter, onCarrierFilter, menu, onOpen }: {
    users: AppUser[]; carriers: AccountRecord[]; spName: string; me: AppUser | null; canManage: boolean;
    roleFilter: UserRole | ""; onRoleFilter: (r: UserRole | "") => void;
    carrierFilter: string; onCarrierFilter: (id: string) => void;
    menu: (u: AppUser) => KebabItem[]; onOpen: (u: AppUser) => void;
}) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const searched = users.filter((u) => !q || [u.name, u.email, u.title, u.accountName].some((s) => s?.toLowerCase().includes(q)));
    const placed = searched.filter((u) => !carrierFilter ? true
        : carrierFilter === "service" ? u.role === "admin" : carriersOf(u).includes(carrierFilter));
    const rows = placed.filter((u) => !roleFilter || u.role === roleFilter);
    const filtered = !!(q || roleFilter || carrierFilter);

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <ListHeader title="Users" count={rows.length} total={placed.length} query={query} onQuery={setQuery}
                placeholder="Search name, email, title…" chipsLabel="Role" allCount={placed.length}
                chips={PROFILE_ROLES.map((r) => ({ id: r, label: ROLE_LABELS[r], count: placed.filter((u) => u.role === r).length, dot: ROLE_META[r].dot }))}
                chip={roleFilter} onChip={(id) => onRoleFilter(id as UserRole | "")}
                onReset={filtered ? () => { setQuery(""); onRoleFilter(""); onCarrierFilter(""); } : undefined}
                extra={
                    <select value={carrierFilter} onChange={(e) => onCarrierFilter(e.target.value)} aria-label="Where they sit"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-60">
                        <option value="">Everywhere in {spName}</option>
                        <option value="service">Service profile — Admins</option>
                        {carriers.length > 0 && (
                            <optgroup label="Carrier profiles">
                                {carriers.map((c) => <option key={c.id} value={c.id}>{carrierName(c)}</option>)}
                            </optgroup>
                        )}
                    </select>
                } />
            {rows.length === 0 ? (
                <div className="px-6 py-14 text-center">
                    <UsersIcon className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">{filtered ? "Nobody matches" : "No users yet"}</p>
                    <p className="mt-1 text-xs text-slate-500">{filtered ? "Try another role, carrier or search." : canManage ? "Add an Admin or a carrier's team with Add user." : "Nobody has been added here yet."}</p>
                </div>
            ) : (
                <Paged items={rows}>{(slice) => (
                    <RowTable minW={880} cols={[{ label: "User" }, { label: "Role", w: "w-36" }, { label: "Where they sit", w: "w-52" }, { label: "Job title", w: "w-40" }, { label: "Status", w: "w-24" }]} noActions={!canManage}>
                        {slice.map((u) => (
                            <tr key={u.id} className={canManage ? ROW_CLS : "transition-colors hover:bg-slate-50/70"} onClick={() => onOpen(u)}>
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
                                <td className={cn(CELL, "overflow-hidden")}><PlacementCell u={u} carriers={carriers} spName={spName} /></td>
                                <td className={cn(CELL, "truncate")} title={u.title}>{u.title || "—"}</td>
                                <td className={CELL}><StatusDot status={u.status} /></td>
                                {canManage && <ActionsCell name={u.name} items={menu(u)} />}
                            </tr>
                        ))}
                    </RowTable>
                )}</Paged>
            )}
        </div>
    );
}

/** The service profile for an Admin; otherwise the carrier(s), the first named and the rest counted. */
function PlacementCell({ u, carriers, spName }: { u: AppUser; carriers: AccountRecord[]; spName: string }) {
    if (u.role === "admin") {
        return (
            <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap" title={`Admin of ${spName} — all ${carriers.length} carrier profiles`}>
                <Building2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                <span className="truncate font-medium text-slate-700">{spName}</span>
                <span className="shrink-0 text-slate-400">· all {carriers.length}</span>
            </span>
        );
    }
    const mine = carriersOf(u).map((id) => carriers.find((c) => c.id === id)).filter(Boolean) as AccountRecord[];
    if (mine.length === 0) return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">No carrier yet</span>;
    return (
        <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap" title={mine.map(carrierName).join("\n")}>
            <Truck className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate font-medium text-slate-700">{carrierName(mine[0])}</span>
            {mine.length > 1 && <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500">+{mine.length - 1}</span>}
        </span>
    );
}

// ── Carrier profiles ─────────────────────────────────────────────────────────

function CarriersTab({ sp, carriers, users, canManage, onAddCarrier, onAddUser, onViewUsers, onOpenCarrier }: {
    sp: ServiceProfile; carriers: AccountRecord[]; users: AppUser[]; canManage: boolean;
    onAddCarrier: () => void;
    onAddUser: (carrierId: string, role?: UserRole) => void;
    onViewUsers: (carrierId: string) => void;
    onOpenCarrier: (c: AccountRecord) => void;
}) {
    const [query, setQuery] = useState("");
    const [chip, setChip] = useState("");
    const { used, remaining } = carrierSlots(sp);
    const team = (c: AccountRecord) => users.filter((u) => u.role !== "admin" && carriersOf(u).includes(c.id));
    const fleetAdmins = (c: AccountRecord) => team(c).filter((u) => u.role === "fleet-admin");

    const q = query.trim().toLowerCase();
    const searched = carriers.filter((c) => !q || [c.legalName, c.dbaName, c.dotNumber, c.city, c.state].some((s) => s?.toLowerCase().includes(q)));
    const test = (c: AccountRecord, id: string) => id === "no-fa" ? fleetAdmins(c).length === 0 : c.status.toLowerCase() === id;
    const rows = searched.filter((c) => !chip || test(c, chip));
    const chips = [
        { id: "active", label: "Active", dot: "bg-emerald-500" },
        { id: "pending", label: "Pending", dot: "bg-amber-500" },
        { id: "inactive", label: "Inactive", dot: "bg-slate-400" },
        { id: "no-fa", label: "No Fleet Admin", dot: "bg-rose-500" },
    ].map((x) => ({ ...x, count: searched.filter((c) => test(c, x.id)).length }));

    const limitText = isUnlimitedLimit(sp.accountLimit) ? `${used} · unlimited` : `${used} of ${formatLimit(sp.accountLimit)} used`;

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <ListHeader title="Carrier profiles" count={rows.length} total={searched.length} query={query} onQuery={setQuery}
                placeholder="Search name, USDOT, city…" chipsLabel="Show" allCount={searched.length}
                chips={chips} chip={chip} onChip={setChip}
                onReset={q || chip ? () => { setQuery(""); setChip(""); } : undefined}
                extra={
                    <div className="flex items-center gap-2">
                        <span title={remaining === Infinity ? "No limit on carrier profiles" : `${remaining} left`}
                            className={cn("inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[12px] font-semibold",
                                remaining === 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                            {isUnlimitedLimit(sp.accountLimit) && <InfinityIcon className="h-3.5 w-3.5 text-violet-600" />} {limitText}
                        </span>
                        {canManage && <Button size="sm" className="h-10 bg-blue-600 text-white hover:bg-blue-700" onClick={onAddCarrier} disabled={remaining === 0}><Truck className="h-4 w-4" /> Add carrier</Button>}
                    </div>
                } />
            {rows.length === 0 ? (
                <div className="px-6 py-14 text-center">
                    <Truck className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">{carriers.length ? "No carrier matches" : "No carrier profiles yet"}</p>
                    <p className="mt-1 text-xs text-slate-500">{carriers.length ? "Try another search or filter." : canManage ? "Create the first one with Add carrier profile." : "An Admin creates them."}</p>
                </div>
            ) : (
                <Paged items={rows}>{(slice) => (
                    <RowTable minW={920} cols={[{ label: "Carrier" }, { label: "Location", w: "w-36" }, { label: "Fleet Admin", w: "w-52" }, { label: "Team", w: "w-64" }, { label: "Status", w: "w-28" }]}>
                        {slice.map((c) => {
                            const t = team(c);
                            const fas = fleetAdmins(c);
                            const roster = getDriversForAccount(c.id).length;
                            const n = (r: UserRole) => t.filter((u) => u.role === r).length;
                            const ci = c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
                            const items: KebabItem[] = [
                                { label: "View its users", icon: UsersIcon, onClick: () => onViewUsers(c.id) },
                                ...(canManage ? [
                                    { label: "Add user to this carrier", icon: UserPlus, onClick: () => onAddUser(c.id) },
                                    ...(fas.length === 0 ? [{ label: "Add a Fleet Admin", icon: UserCog, onClick: () => onAddUser(c.id, "fleet-admin") }] : []),
                                ] : []),
                                { label: "Open carrier profile", icon: ExternalLink, onClick: () => onOpenCarrier(c) },
                            ];
                            return (
                                <tr key={c.id} className={ROW_CLS} onClick={() => onViewUsers(c.id)}>
                                    <td className="px-5 py-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-bold text-blue-700">{ci}</span>
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-slate-900" title={c.legalName}>{c.legalName}</p>
                                                <p className="truncate text-[12px] text-slate-500">{[c.dbaName && `DBA ${c.dbaName}`, c.dotNumber && `USDOT ${c.dotNumber}`].filter(Boolean).join(" · ") || "—"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={cn(CELL, "truncate")}>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                                    <td className={cn(CELL, "overflow-hidden")}>
                                        {fas.length ? (
                                            <span className="flex min-w-0 items-center gap-2 whitespace-nowrap" title={fas.map((u) => u.name).join("\n")}>
                                                <span className="flex -space-x-1.5">{fas.slice(0, 3).map((u) => <Avatar key={u.id} u={u} size="sm" />)}</span>
                                                <span className="truncate font-medium text-slate-700">{fas[0].name}</span>
                                                {fas.length > 1 && <span className="shrink-0 text-slate-400">+{fas.length - 1}</span>}
                                            </span>
                                        ) : (
                                            <button type="button" disabled={!canManage} onClick={(e) => { e.stopPropagation(); onAddUser(c.id, "fleet-admin"); }}
                                                className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 enabled:hover:bg-rose-100 disabled:cursor-default">
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Not assigned{canManage ? " · add" : ""}
                                            </button>
                                        )}
                                    </td>
                                    <td className={CELL}>
                                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                                            <TeamPill Icon={HardHat} n={n("safety-manager")} tone="bg-amber-50 text-amber-700" title="Safety Managers" />
                                            <TeamPill Icon={UserRound} n={n("user")} tone="bg-slate-100 text-slate-600" title="Users" />
                                            <TeamPill Icon={IdCard} n={n("driver")} tone="bg-emerald-50 text-emerald-700" title={`Driver logins — ${roster} driver${roster === 1 ? "" : "s"} on the roster`}
                                                suffix={roster ? `/${roster}` : undefined} />
                                        </span>
                                    </td>
                                    <td className={CELL}><StatusDot status={c.status === "Active" ? "Active" : c.status === "Pending" ? "Invited" : "Inactive"} label={c.status} /></td>
                                    <ActionsCell name={c.legalName} items={items} />
                                </tr>
                            );
                        })}
                    </RowTable>
                )}</Paged>
            )}
        </div>
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
    const countOf = (r: UserRole) => r === "super-admin" ? supers.length : users.filter((u) => u.role === r).length;
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
