import { useMemo, useState } from "react";
import { AlertTriangle, Building2, Check, Lock, Mail, Save, Truck, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    APP_USERS, CARRIER_ROLES, ROLE_LEVEL, addAppUser, initialsOf, isDriverUser, newUserId, updateAppUser,
    type AppUser, type UserRole,
} from "@/data/users.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import type { AccountRecord } from "@/pages/accounts/accounts.data";
import type { ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { ROLE_META } from "./roles.data";
import { carriersOf, gradientFor, usersOfProfile } from "./scope";

export type UserDialogState =
    | { mode: "add"; carrierId?: string; role?: UserRole }
    | { mode: "edit"; user: AppUser };

type Level = "service" | "carrier";

const LABEL = "text-[11px] font-bold uppercase tracking-wider text-slate-500";

/**
 * Add someone to a service profile, or change where they sit and what they can do.
 *
 * Two questions, in the order an Admin answers them: where (the service profile itself, or
 * one of its carriers) and as what. A service-profile seat is always Admin; a carrier seat is
 * one of the four carrier roles. A Driver is always somebody already on that carrier's roster,
 * because the login opens the driver app on their own record.
 *
 * With `lockCarrierId` (a carrier's own Settings) the first question is already answered: the
 * person sits on that carrier, and only the four carrier roles are offered.
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
    const carrierLabel = (c?: AccountRecord) => (c ? c.dbaName || c.legalName : "this carrier");
    const spName = sp ? sp.dbaName || sp.legalName : carrierLabel(lockCarrier);
    const inProfile = (ids: string[]) => ids.filter((id) => carriers.some((c) => c.id === id));

    const [level, setLevel] = useState<Level>(() => {
        if (locked) return "carrier";
        if (editing) return ROLE_LEVEL[editing.role] === "service" ? "service" : "carrier";
        return state.mode === "add" && state.role === "admin" ? "service" : "carrier";
    });
    const [role, setRole] = useState<UserRole>(() => {
        if (editing) return ROLE_LEVEL[editing.role] === "carrier" ? editing.role : "user";
        return state.mode === "add" && state.role && state.role !== "admin" ? state.role : "user";
    });
    const [carrierIds, setCarrierIds] = useState<string[]>(() => {
        if (lockCarrierId) return [lockCarrierId];
        if (editing) return inProfile(carriersOf(editing));
        if (state.mode === "add" && state.carrierId) return [state.carrierId];
        return carriers.length === 1 ? [carriers[0].id] : [];
    });
    const [driverId, setDriverId] = useState("");
    const [name, setName] = useState(editing?.name ?? "");
    const [email, setEmail] = useState(editing?.email ?? "");
    const [phone, setPhone] = useState(editing?.phone ?? "");
    const [title, setTitle] = useState(editing?.title ?? "");
    const [invite, setInvite] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const driverRow = !!editing && isDriverUser(editing);
    const self = !!editing && editing.id === me?.id;
    const placementLocked = driverRow || self;
    const effectiveRole: UserRole = level === "service" ? "admin" : role;
    const asDriver = effectiveRole === "driver";

    // Roster drivers on the chosen carrier who do not have a login yet.
    const rosterOptions = useMemo(() => {
        if (!asDriver || editing || !carrierIds[0]) return [];
        return getDriversForAccount(carrierIds[0])
            .filter((d) => d.status === "Active" && !APP_USERS.some((u) => u.id === `u-drv-${d.id}`))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [asDriver, editing, carrierIds]);

    const pickDriver = (id: string) => {
        setDriverId(id);
        const d = rosterOptions.find((x) => x.id === id);
        if (d) { setName(d.name); setEmail(d.email || ""); setPhone(d.phone || ""); setTitle(d.driverType || "Driver"); }
    };

    const chooseRole = (r: UserRole) => {
        setRole(r);
        setError(null);
        // A driver sits on exactly one roster.
        if (r === "driver") setCarrierIds((ids) => ids.slice(0, 1));
        if (r !== "driver" && driverId) { setDriverId(""); setName(""); setEmail(""); setPhone(""); setTitle(""); }
    };

    const toggleCarrier = (id: string) => {
        setError(null);
        if (asDriver) { setCarrierIds([id]); setDriverId(""); return; }
        setCarrierIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
    };

    const save = () => {
        const n = name.trim(), e = email.trim();
        if (asDriver && !editing && !driverId) return setError("Pick the driver on the roster this login is for.");
        if (!n) return setError("Enter their name.");
        if (!/^\S+@\S+\.\S+$/.test(e)) return setError("Enter a valid email — it is how they sign in.");
        if (APP_USERS.some((u) => u.email.toLowerCase() === e.toLowerCase() && u.id !== editing?.id)) {
            return setError("Somebody already signs in with this email.");
        }
        if (level === "carrier" && carrierIds.length === 0) return setError("Choose at least one carrier profile.");
        if (sp && editing?.role === "admin" && effectiveRole !== "admin") {
            const admins = usersOfProfile(sp.id).filter((u) => u.role === "admin" && u.status !== "Inactive");
            if (admins.length <= 1) return setError(`${spName} needs at least one Admin. Make somebody else Admin first.`);
        }

        // Admins reach every carrier of the profile; carrier seats reach the ones ticked.
        // Carriers this user has elsewhere are kept as they were.
        const here = level === "service" ? carriers.map((c) => c.id) : carrierIds;
        const elsewhere = editing ? carriersOf(editing).filter((id) => !carriers.some((c) => c.id === id)) : [];
        const managed = [...here, ...elsewhere];
        const primaryId = here[0] ?? elsewhere[0];
        const primary = carriers.find((c) => c.id === primaryId);
        const patch: Partial<AppUser> = {
            name: n, email: e, phone: phone.trim() || undefined,
            title: title.trim() || ROLE_META[effectiveRole].label,
            role: effectiveRole,
            accountId: primaryId,
            accountName: primary?.legalName ?? editing?.accountName,
            managedAccountIds: managed,
            serviceProfileId: editing?.serviceProfileId ?? sp?.id ?? primary?.serviceProfileId,
        };
        const where = level === "service" ? spName : carriers.filter((c) => here.includes(c.id)).map(carrierLabel).join(", ");

        if (editing) {
            updateAppUser(editing.id, patch);
            onDone(`${n} is now ${ROLE_META[effectiveRole].label} · ${where}`);
            return;
        }
        const id = asDriver ? `u-drv-${driverId}` : newUserId();
        addAppUser({
            ...(patch as AppUser),
            id,
            status: invite ? "Invited" : "Active",
            initials: initialsOf(n),
            avatarGradient: gradientFor(id),
        });
        onDone(invite ? `Invitation sent to ${e} — ${ROLE_META[effectiveRole].label} · ${where}` : `${n} added as ${ROLE_META[effectiveRole].label} · ${where}`);
    };

    const summary = level === "service"
        ? `Admin of ${spName}`
        : `${ROLE_META[role].label}${carrierIds.length ? ` on ${carriers.filter((c) => carrierIds.includes(c.id)).map(carrierLabel).join(", ")}` : ""}`;

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
                        {locked ? "Fleet Admin, Safety Manager, Driver or User on this carrier." : "Where they sit decides which roles they can have."}
                    </p>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {placementLocked && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-600">
                            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                            {self
                                ? "You can't change your own role or access — ask another Admin or a Super Admin."
                                : `A driver login belongs to a driver on the ${editing?.accountName ?? "carrier"} roster, so its role and carrier follow the roster.`}
                        </div>
                    )}

                    {/* 1 — where */}
                    {!locked && (
                        <section>
                            <p className={LABEL}>Where they sit</p>
                            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                                <LevelTile on={level === "service"} disabled={placementLocked} Icon={Building2}
                                    title="Service profile" sub={`Admin of ${spName} — reaches all ${carriers.length} carrier profile${carriers.length === 1 ? "" : "s"}`}
                                    onClick={() => { setLevel("service"); setError(null); }} />
                                <LevelTile on={level === "carrier"} disabled={placementLocked} Icon={Truck}
                                    title="Carrier profile" sub="Part of a carrier's team — Fleet Admin, Safety Manager, Driver or User"
                                    onClick={() => { setLevel("carrier"); setError(null); }} />
                            </div>
                        </section>
                    )}

                    {/* 2 — role */}
                    <section>
                        <p className={LABEL}>Role</p>
                        {level === "service" ? (
                            <div className="mt-2"><RoleCard role="admin" on disabled={false} onClick={() => {}} /></div>
                        ) : (
                            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
                                {CARRIER_ROLES.map((r) => {
                                    // Office seats and driver seats do not swap: one opens the fleet, the other the driver app.
                                    const blocked = placementLocked ? r !== role
                                        : !!editing && (r === "driver") !== (editing.role === "driver");
                                    return <RoleCard key={r} role={r} on={role === r} disabled={blocked}
                                        why={blocked && r === "driver" ? "Driver logins come from a carrier's roster — use Add user ▸ Driver" : undefined}
                                        onClick={() => chooseRole(r)} />;
                                })}
                            </div>
                        )}
                    </section>

                    {/* 3 — which carriers */}
                    {level === "carrier" && (
                        <section>
                            <p className={LABEL}>{asDriver ? "Carrier — whose roster they are on" : locked ? "Carrier" : "Carrier profiles they work on"}</p>
                            {carriers.length === 0 ? (
                                <p className="mt-2 rounded-lg border border-dashed border-slate-200 px-3.5 py-3 text-[13px] text-slate-500">{spName} has no carrier profiles yet — add one first.</p>
                            ) : (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {carriers.map((c) => {
                                        const on = carrierIds.includes(c.id);
                                        const fixed = placementLocked || locked;
                                        return (
                                            <button key={c.id} type="button" disabled={fixed} onClick={() => toggleCarrier(c.id)} aria-pressed={on}
                                                className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition-colors disabled:cursor-default",
                                                    on ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                                                    fixed && !on && "opacity-50")}>
                                                <span className={cn("flex h-4 w-4 items-center justify-center border", asDriver || locked ? "rounded-full" : "rounded",
                                                    on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>
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

                    {/* 3b — the roster driver */}
                    {asDriver && !editing && carrierIds[0] && (
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
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ROLE_META[effectiveRole].label} />
                            </Field>
                        </div>
                    </section>

                    {!editing && (
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
