import { useMemo, useState } from "react";
import { AlertTriangle, Building2, Check, IdCard, Lock, Mail, Save, Search, Truck, UserCheck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    APP_USERS, CARRIER_ROLES, OFFICE_ROLES, ROLE_LABELS, addAppUser, initialsOf, isDriverUser, newUserId, roleOn,
    updateAppUser, type AppUser, type UserRole,
} from "@/data/users.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import type { AccountRecord } from "@/pages/accounts/accounts.data";
import type { ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { ROLE_META } from "./roles.data";
import { carriersOf, gradientFor, setCarrierRoles, usersOfProfile } from "./scope";
import { carrierLimits, carrierUsers, serviceLimits } from "@/pages/admin/profile-limits.data";
import { findSignedUpUser, isUnplaced, placeExistingUser } from "@/data/signup";

export type UserDialogState =
    | { mode: "add"; carrierId?: string; role?: UserRole }
    | { mode: "edit"; user: AppUser };

/** Where somebody sits: the service profile (Admin), a carrier's office, or a carrier's roster. */
type Level = "service" | "carrier" | "driver";

const LABEL = "text-[11px] font-bold uppercase tracking-wider text-slate-500";
const SELECT = "h-8 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400";

const carrierLabel = (c?: AccountRecord) => (c ? c.dbaName || c.legalName : "this carrier");
const carrierSub = (c: AccountRecord) => [c.dbaName && `DBA ${c.dbaName}`, c.dotNumber && `USDOT ${c.dotNumber}`, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
const initialsFor = (c: AccountRecord) => c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

/**
 * Add someone to a service profile, or change where they sit and what they do there.
 *
 * In the order an Admin answers it: where — the service profile itself (an Admin), one or
 * more carrier profiles (an office seat), or a carrier's roster (a driver login) — and then,
 * for an office seat, the role ON EACH carrier ticked: Fleet Admin, Safety Manager or User.
 * A role is given per carrier, so the same person can lead one carrier and only look at
 * another. A Driver is always somebody already on that carrier's roster.
 *
 * With `lockCarrierId` (a carrier's own Settings) the carrier is already chosen: the dialog
 * asks only for the role on that carrier — one of the four, Driver included.
 */
export function UserDialog({ state, sp, carriers, lockCarrierId, me, onClose, onDone }: {
    state: UserDialogState;
    sp?: ServiceProfile;
    carriers: AccountRecord[];
    lockCarrierId?: string;
    me: AppUser | null;
    onClose: () => void;
    onDone: (message: string) => void;
}) {
    const editing = state.mode === "edit" ? state.user : null;
    const locked = !!lockCarrierId;
    const lockCarrier = carriers.find((c) => c.id === lockCarrierId);
    const spName = sp ? sp.dbaName || sp.legalName : carrierLabel(lockCarrier);
    const adding = state.mode === "add" ? state : null;

    const [level, setLevel] = useState<Level>(() => {
        if (locked) return "carrier";
        if (editing) return editing.role === "admin" ? "service" : isDriverUser(editing) ? "driver" : "carrier";
        return adding?.role === "admin" ? "service" : adding?.role === "driver" ? "driver" : "carrier";
    });
    // Locked to one carrier: a single role on it (Driver included).
    const [role, setRole] = useState<UserRole>(() => {
        if (editing) return isDriverUser(editing) ? "driver" : editing.role === "admin" ? "user" : roleOn(editing, lockCarrierId ?? editing.accountId);
        return adding?.role && adding.role !== "admin" ? adding.role : "user";
    });
    // The service profile's carriers: which ones, and the role on each.
    const [entries, setEntries] = useState<Record<string, UserRole>>(() => {
        const init: Record<string, UserRole> = {};
        if (editing && !isDriverUser(editing) && editing.role !== "admin") {
            for (const c of carriers) if (carriersOf(editing).includes(c.id)) init[c.id] = roleOn(editing, c.id);
        } else if (adding?.carrierId) {
            init[adding.carrierId] = adding.role && OFFICE_ROLES.includes(adding.role) ? adding.role : "user";
        } else if (!editing && carriers.length === 1) {
            init[carriers[0].id] = "user";
        }
        return init;
    });
    const [lastRole, setLastRole] = useState<UserRole>("user");
    // A driver login: whose roster, and which driver on it.
    const [driverCarrier, setDriverCarrier] = useState<string>(() => lockCarrierId ?? editing?.accountId ?? adding?.carrierId ?? (carriers.length === 1 ? carriers[0].id : ""));
    const [driverId, setDriverId] = useState("");
    const [name, setName] = useState(editing?.name ?? "");
    const [email, setEmail] = useState(editing?.email ?? "");
    const [phone, setPhone] = useState(editing?.phone ?? "");
    const [title, setTitle] = useState(editing?.title ?? "");
    const [invite, setInvite] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Somebody who signed up on their own and handed over their user ID — placed, not created.
    const [source, setSource] = useState<"new" | "existing">("new");
    const [lookup, setLookup] = useState("");
    const [existing, setExisting] = useState<AppUser | null>(null);
    const findExisting = () => {
        const u = findSignedUpUser(lookup);
        if (!u) return setError("No account with that user ID or email. They sign up first, from the sign-in page.");
        if (isDriverUser(u)) return setError("That is a driver login — a driver is added from the carrier's roster.");
        if (u.role === "super-admin") return setError("A Super Admin is placed by a Super Admin, from Roles & Access.");
        setExisting(u); setName(u.name); setEmail(u.email); setPhone(u.phone ?? ""); setTitle(u.title && u.title !== "User" ? u.title : ""); setError(null);
    };

    const driverRow = !!editing && isDriverUser(editing);
    const self = !!editing && editing.id === me?.id;
    const placementLocked = driverRow || self;
    const asDriver = locked ? role === "driver" : level === "driver";
    const rosterCarrier = locked ? lockCarrierId! : driverCarrier;

    // Roster drivers on the chosen carrier who do not have a login yet.
    const rosterOptions = useMemo(() => {
        if (!asDriver || editing || !rosterCarrier) return [];
        return getDriversForAccount(rosterCarrier)
            .filter((d) => d.status === "Active" && !APP_USERS.some((u) => u.id === `u-drv-${d.id}`))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [asDriver, editing, rosterCarrier]);

    const pickDriver = (id: string) => {
        setDriverId(id);
        const d = rosterOptions.find((x) => x.id === id);
        if (d) { setName(d.name); setEmail(d.email || ""); setPhone(d.phone || ""); setTitle(d.driverType || "Driver"); }
    };
    const clearDriver = () => { if (driverId) { setDriverId(""); setName(""); setEmail(""); setPhone(""); setTitle(""); } };

    const toggleCarrier = (id: string) => {
        setError(null);
        setEntries((e) => {
            const n = { ...e };
            if (n[id]) delete n[id]; else n[id] = lastRole;
            return n;
        });
    };
    const setRoleOn = (id: string, r: UserRole) => { setLastRole(r); setEntries((e) => ({ ...e, [id]: r })); };

    /** What the person ends up as — the summary line and the confirmation. */
    const describe = (): string => {
        if (level === "service") return `Admin of ${spName}`;
        if (asDriver) return `Driver on ${carrierLabel(carriers.find((c) => c.id === rosterCarrier))}`;
        if (locked) return `${ROLE_LABELS[role]} on ${carrierLabel(lockCarrier)}`;
        const byRole = new Map<UserRole, string[]>();
        for (const c of carriers) if (entries[c.id]) byRole.set(entries[c.id], [...(byRole.get(entries[c.id]) ?? []), carrierLabel(c)]);
        if (byRole.size === 0) return "no carrier yet";
        return [...byRole.entries()].map(([r, names]) => `${ROLE_LABELS[r]} on ${names.join(", ")}`).join(" · ");
    };

    const save = () => {
        const n = name.trim(), e = email.trim();
        if (asDriver && !editing && !driverId) return setError("Pick the driver on the roster this login is for.");
        if (asDriver && !rosterCarrier) return setError("Choose whose roster they are on.");
        if (!n) return setError("Enter their name.");
        if (!/^\S+@\S+\.\S+$/.test(e)) return setError("Enter a valid email — it is how they sign in.");
        if (source === "existing" && !existing && !editing) return setError("Find the person by their user ID or email first.");
        if (APP_USERS.some((u) => u.email.toLowerCase() === e.toLowerCase() && u.id !== (editing?.id ?? existing?.id))) {
            return setError("Somebody already signs in with this email.");
        }
        if (level === "carrier" && !locked && Object.keys(entries).length === 0) return setError("Tick at least one carrier profile and choose their role on it.");
        if (sp && editing?.role === "admin" && level !== "service") {
            const admins = usersOfProfile(sp.id).filter((u) => u.role === "admin" && u.status !== "Inactive");
            if (admins.length <= 1) return setError(`${spName} needs at least one Admin. Make somebody else Admin first.`);
        }
        // User seats — set by a Super Admin in Service / Carrier Profile Configuration. A driver
        // login takes none: the roster limits drivers.
        if (!asDriver) {
            const spId = sp?.id ?? lockCarrier?.serviceProfileId;
            const seats = spId ? serviceLimits(spId).users : null;
            if (!editing && seats && seats.remaining <= 0) {
                return setError(`${spName} has used all ${seats.limit} of its user seats. A Super Admin can raise it in Service Profile Configuration.`);
            }
            if (level === "carrier") {
                for (const id of locked ? [lockCarrierId!] : Object.keys(entries)) {
                    if (editing && carrierUsers(id).some((u) => u.id === editing.id)) continue;
                    const c = carrierLimits(id).users;
                    if (c.remaining <= 0) {
                        return setError(`${carrierLabel(carriers.find((x) => x.id === id))} has used all ${c.limit} of its user seats. A Super Admin can raise it in Carrier Profile Configuration.`);
                    }
                }
            }
        }

        const details: Partial<AppUser> = { name: n, email: e, phone: phone.trim() || undefined, title: title.trim() || undefined };
        const where = describe();

        // ── Somebody who already has a login: give them the place, keep the login.
        if (existing && !editing) {
            if (level === "service" && sp) { updateAppUser(existing.id, details); placeExistingUser(existing, { serviceProfileId: sp.id }); onDone(`${n} is now ${where}`); return; }
            if (level === "carrier") {
                const chosen: Record<string, UserRole> = locked ? { [lockCarrierId!]: role } : entries;
                updateAppUser(existing.id, details);
                setCarrierRoles({ ...existing, ...details } as AppUser, carriers, chosen);
                onDone(`${n} is now ${where}`);
                return;
            }
        }

        // ── An Admin of the service profile: every carrier in it, now and later.
        if (level === "service") {
            const all = carriers.map((c) => c.id);
            const elsewhere = editing ? carriersOf(editing).filter((id) => !all.includes(id)) : [];
            const primaryId = all[0] ?? elsewhere[0];
            const patch: Partial<AppUser> = {
                ...details, title: details.title ?? ROLE_LABELS.admin, role: "admin", carrierRoles: undefined,
                accountId: primaryId, accountName: carriers.find((c) => c.id === primaryId)?.legalName ?? editing?.accountName,
                managedAccountIds: [...all, ...elsewhere], serviceProfileId: editing?.serviceProfileId ?? sp?.id,
            };
            if (editing) { updateAppUser(editing.id, patch); onDone(`${n} is now ${where}`); return; }
            const id = newUserId();
            addAppUser({ ...(patch as AppUser), id, status: invite ? "Invited" : "Active", initials: initialsOf(n), avatarGradient: gradientFor(id) });
            onDone(invite ? `Invitation sent to ${e} — ${where}` : `${n} added — ${where}`);
            return;
        }

        // ── A driver login, tied to one roster.
        if (asDriver) {
            if (editing) { updateAppUser(editing.id, details); onDone(`${n} saved — ${where}`); return; }
            const rc = carriers.find((c) => c.id === rosterCarrier);
            const id = `u-drv-${driverId}`;
            addAppUser({
                ...(details as AppUser), id, title: details.title ?? "Driver", role: "driver", carrierRoles: { [rosterCarrier]: "driver" },
                accountId: rosterCarrier, accountName: rc?.legalName, managedAccountIds: [rosterCarrier],
                serviceProfileId: sp?.id ?? rc?.serviceProfileId,
                status: invite ? "Invited" : "Active", initials: initialsOf(n), avatarGradient: gradientFor(id),
            });
            onDone(invite ? `Invitation sent to ${e} — ${where}` : `${n} added — ${where}`);
            return;
        }

        // ── An office seat: the carriers ticked, each with its role.
        const chosen: Record<string, UserRole> = locked ? { [lockCarrierId!]: role } : entries;
        if (editing) {
            updateAppUser(editing.id, details);
            setCarrierRoles(editing, carriers, chosen);
            onDone(`${n} is now ${where}`);
            return;
        }
        const here = carriers.filter((c) => chosen[c.id]).map((c) => c.id);
        const primary = carriers.find((c) => c.id === here[0]);
        const id = newUserId();
        addAppUser({
            ...(details as AppUser), id, title: details.title ?? ROLE_LABELS[chosen[here[0]]],
            role: chosen[here[0]], carrierRoles: chosen,
            accountId: here[0], accountName: primary?.legalName, managedAccountIds: here,
            serviceProfileId: sp?.id ?? primary?.serviceProfileId,
            status: invite ? "Invited" : "Active", initials: initialsOf(n), avatarGradient: gradientFor(id),
        });
        onDone(invite ? `Invitation sent to ${e} — ${where}` : `${n} added — ${where}`);
    };

    const summary = describe();
    const tickedCount = Object.keys(entries).length;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            {editing ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        </span>
                        {editing ? `Edit ${editing.name}` : `Add a user to ${locked ? carrierLabel(lockCarrier) : spName}`}
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">
                        {locked ? "Their role on this carrier — Fleet Admin, Safety Manager, User or Driver." : "First where they sit, then their role on each carrier profile."}
                    </p>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {placementLocked && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-600">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            {self
                                ? "You can't change your own role or access — ask another Admin or a Super Admin."
                                : `A driver login belongs to a driver on the ${editing?.accountName ?? "carrier"} roster, so its carrier and role follow the roster.`}
                        </div>
                    )}

                    {/* 1 — where */}
                    {!locked && (
                        <section>
                            <p className={LABEL}>Where they sit</p>
                            <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                                <LevelTile on={level === "service"} disabled={placementLocked} Icon={Building2}
                                    title="Service profile" sub={`Admin of ${spName} — every carrier profile, now and later`}
                                    onClick={() => { setLevel("service"); setError(null); }} />
                                <LevelTile on={level === "carrier"} disabled={placementLocked} Icon={Truck}
                                    title="Carrier profiles" sub="Office seat — Fleet Admin, Safety Manager or User, per carrier"
                                    onClick={() => { setLevel("carrier"); setError(null); clearDriver(); }} />
                                <LevelTile on={level === "driver"} disabled={!!editing && !driverRow} Icon={IdCard}
                                    title="Driver login" sub="A driver on one carrier's roster — the Driver app"
                                    onClick={() => { setLevel("driver"); setError(null); }} />
                            </div>
                        </section>
                    )}

                    {/* 2 — service profile: the one role */}
                    {level === "service" && !locked && (
                        <section>
                            <p className={LABEL}>Role</p>
                            <div className="mt-2"><RoleCard role="admin" on disabled={false} onClick={() => {}} /></div>
                        </section>
                    )}

                    {/* 2 — one carrier (Settings): the role on it */}
                    {locked && (
                        <section>
                            <p className={LABEL}>Role on {carrierLabel(lockCarrier)}</p>
                            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                                {CARRIER_ROLES.map((r) => {
                                    // Office seats and driver seats do not swap: one opens the fleet, the other the driver app.
                                    const blocked = placementLocked ? r !== role : !!editing && (r === "driver") !== (editing.role === "driver");
                                    return <RoleCard key={r} role={r} on={role === r} disabled={blocked}
                                        why={blocked && r === "driver" ? "Driver logins come from the roster — use Add user ▸ Driver" : undefined}
                                        onClick={() => { setRole(r); setError(null); if (r !== "driver") clearDriver(); }} />;
                                })}
                            </div>
                        </section>
                    )}

                    {/* 2 — carrier profiles: access first, then the role on each */}
                    {level === "carrier" && !locked && (
                        <section>
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <p className={LABEL}>Carrier access &amp; role</p>
                                    <p className="mt-0.5 text-[12px] text-slate-500">Tick the carrier profiles they work on, then choose their role on each one.</p>
                                </div>
                                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-slate-500">{tickedCount} of {carriers.length}</span>
                            </div>
                            {carriers.length === 0 ? (
                                <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3.5 py-3 text-[13px] text-slate-500">{spName} has no carrier profiles yet — add one first.</p>
                            ) : (
                                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
                                    {carriers.map((c) => {
                                        const on = !!entries[c.id];
                                        return (
                                            <li key={c.id} className={cn("flex items-center gap-3 px-3.5 py-2.5", on ? "bg-blue-50/40" : "")}>
                                                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                                    <input type="checkbox" checked={on} disabled={placementLocked} onChange={() => toggleCarrier(c.id)}
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-bold text-blue-700">{initialsFor(c)}</span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold text-slate-900">{c.legalName}</span>
                                                        <span className="block truncate text-[12px] text-slate-500">{carrierSub(c) || "—"}</span>
                                                    </span>
                                                </label>
                                                <select value={on ? entries[c.id] : ""} disabled={!on || placementLocked} aria-label={`Role on ${carrierLabel(c)}`}
                                                    onChange={(ev) => setRoleOn(c.id, ev.target.value as UserRole)} className={cn(SELECT, "w-40 shrink-0")}>
                                                    {!on && <option value="">No access</option>}
                                                    {OFFICE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                                                </select>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            <p className="mt-1.5 text-[11px] text-slate-500">Fleet Admin and Safety Manager are roles on a carrier — the same person can lead one carrier and only look at another.</p>
                        </section>
                    )}

                    {/* 2 — driver login: whose roster */}
                    {level === "driver" && !locked && (
                        <section>
                            <p className={LABEL}>Carrier — whose roster they are on</p>
                            {carriers.length === 0 ? (
                                <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3.5 py-3 text-[13px] text-slate-500">{spName} has no carrier profiles yet — add one first.</p>
                            ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {carriers.map((c) => {
                                        const on = driverCarrier === c.id;
                                        return (
                                            <button key={c.id} type="button" disabled={placementLocked} onClick={() => { setDriverCarrier(c.id); clearDriver(); setError(null); }} aria-pressed={on}
                                                className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition-colors disabled:cursor-default",
                                                    on ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                                                    placementLocked && !on && "opacity-50")}>
                                                <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>
                                                    {on && <Check className="h-3 w-3" />}
                                                </span>
                                                {carrierLabel(c)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* 3 — the roster driver */}
                    {asDriver && !editing && rosterCarrier && (
                        <section>
                            <Label className={LABEL}>Driver on the roster</Label>
                            <select value={driverId} onChange={(e) => pickDriver(e.target.value)}
                                className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                <option value="">{rosterOptions.length ? `Choose one of ${rosterOptions.length} drivers without a login…` : "Every active driver here already has a login"}</option>
                                {rosterOptions.map((d) => <option key={d.id} value={d.id}>{d.name}{d.driverType ? ` · ${d.driverType}` : ""}</option>)}
                            </select>
                            <p className="mt-1.5 text-xs text-slate-500">New drivers join the roster through Hiring or Add Driver; give them a login here afterwards.</p>
                        </section>
                    )}

                    {/* 4 — who */}
                    {!editing && !asDriver && (
                        <section>
                            <p className={LABEL}>Who</p>
                            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                                <LevelTile on={source === "new"} disabled={false} Icon={UserPlus} title="A new person" sub="Create their login and send them an invitation"
                                    onClick={() => { setSource("new"); setExisting(null); setError(null); }} />
                                <LevelTile on={source === "existing"} disabled={false} Icon={UserCheck} title="Already signed up" sub="They created an account and gave you their user ID or email"
                                    onClick={() => { setSource("existing"); setError(null); }} />
                            </div>
                            {source === "existing" && (
                                <div className="mt-2.5 flex items-center gap-2">
                                    <Input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="User ID (u-…) or email" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findExisting(); } }} />
                                    <Button variant="outline" onClick={findExisting}><Search className="h-4 w-4" /> Find</Button>
                                </div>
                            )}
                            {existing && (
                                <p className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">
                                    <UserCheck className="h-4 w-4 shrink-0" /> <span className="min-w-0 truncate">{existing.name} · {existing.email} · {isUnplaced(existing) ? "not on any carrier yet" : `currently ${ROLE_LABELS[existing.role]}`}</span>
                                </p>
                            )}
                        </section>
                    )}

                    <section>
                        <p className={LABEL}>Details</p>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <Field label="Full name">
                                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" disabled={asDriver && !editing} />
                            </Field>
                            <Field label="Email (sign-in)">
                                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane.smith@company.com" disabled={asDriver && !editing} />
                            </Field>
                            <Field label="Phone (optional)">
                                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-0100" />
                            </Field>
                            <Field label="Job title">
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={level === "service" ? "Admin" : asDriver ? "Driver" : "e.g. Fleet Manager"} />
                            </Field>
                        </div>
                    </section>

                    {!editing && !existing && (
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                            <input type="checkbox" checked={invite} onChange={(e) => setInvite(e.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span>
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900"><Mail className="h-3.5 w-3.5 text-slate-400" /> Send an invitation email</span>
                                <span className="text-xs text-slate-500">They get a link to set a password at <span className="font-medium">{email || "their address"}</span>. Shown as Invited until they sign in.</span>
                            </span>
                        </label>
                    )}

                    {error && (
                        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                    <p className="min-w-0 truncate text-[13px] text-slate-500" title={summary}>
                        <span className="font-semibold text-slate-700">{name.trim() || "New user"}</span> → {summary}
                    </p>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={save}>{editing ? <><Save className="h-4 w-4" /> Save changes</> : <><UserPlus className="h-4 w-4" /> {invite ? "Add & invite" : "Add user"}</>}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <Label className="text-xs font-medium text-slate-600">{label}</Label>
            <div className="mt-1">{children}</div>
        </div>
    );
}

function LevelTile({ on, disabled, Icon, title, sub, onClick }: {
    on: boolean; disabled: boolean; Icon: React.ElementType; title: string; sub: string; onClick: () => void;
}) {
    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
            className={cn("flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors disabled:cursor-not-allowed",
                on ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                disabled && !on && "opacity-50")}>
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", on ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500")}><Icon className="h-4 w-4" /></span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{title}</span>
                <span className="block text-xs leading-snug text-slate-500">{sub}</span>
            </span>
        </button>
    );
}

function RoleCard({ role, on, disabled, why, onClick }: { role: UserRole; on: boolean; disabled: boolean; why?: string; onClick: () => void }) {
    const m = ROLE_META[role];
    return (
        <button type="button" onClick={onClick} disabled={disabled} aria-pressed={on} title={why}
            className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed",
                on ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                disabled && !on && "opacity-45")}>
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", m.chip)}><m.Icon className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    {m.label}
                    {on && <Check className="h-3.5 w-3.5 text-blue-600" />}
                </span>
                <span className="block text-xs leading-snug text-slate-500">{why ?? m.remit}</span>
            </span>
        </button>
    );
}
