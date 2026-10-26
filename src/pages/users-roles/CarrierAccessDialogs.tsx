import { useState } from "react";
import { Building2, Check, IdCard, Lock, Search, Truck, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CARRIER_ROLES, OFFICE_ROLES, ROLE_LABELS, isDriverUser, roleOn, type AppUser, type UserRole } from "@/data/users.data";
import { getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import type { ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { ROLE_META } from "./roles.data";
import { carriersOf, setCarrierRoles } from "./scope";
import { Avatar, RoleBadge, StatusDot } from "./pieces";

// Carrier access, from both ends: which carrier profiles one person may work on — and as
// what on each — and which people a carrier profile is open to. Same store either way.

const carrierLabel = (c: AccountRecord) => c.dbaName || c.legalName;
const carrierSub = (c: AccountRecord) => [c.dbaName && `DBA ${c.dbaName}`, c.dotNumber && `USDOT ${c.dotNumber}`, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
const initialsOf = (c: AccountRecord) => c.legalName.replace(/[^a-zA-Z0-9\s]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
const SELECT = "h-8 w-40 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

/** "Fleet Admin on Acme, GLCG · User on Lone Star" */
function describe(carriers: AccountRecord[], entries: Record<string, UserRole>): string {
    const byRole = new Map<UserRole, string[]>();
    for (const c of carriers) if (entries[c.id]) byRole.set(entries[c.id], [...(byRole.get(entries[c.id]) ?? []), carrierLabel(c)]);
    return [...byRole.entries()].map(([r, names]) => `${ROLE_LABELS[r]} on ${names.join(", ")}`).join(" · ");
}

/** One person: tick the carrier profiles they may work on, and the role on each. */
export function CarrierAccessDialog({ user, sp, carriers, onClose, onDone }: {
    user: AppUser; sp: ServiceProfile; carriers: AccountRecord[];
    onClose: () => void; onDone: (message: string) => void;
}) {
    const spName = sp.dbaName || sp.legalName;
    const admin = user.role === "admin";
    const driver = isDriverUser(user);
    const locked = admin || driver;
    const [entries, setEntries] = useState<Record<string, UserRole>>(() => {
        const init: Record<string, UserRole> = {};
        for (const c of carriers) {
            if (admin) init[c.id] = "admin";
            else if (carriersOf(user).includes(c.id)) init[c.id] = roleOn(user, c.id);
        }
        return init;
    });
    const [lastRole, setLastRole] = useState<UserRole>(() => OFFICE_ROLES.includes(user.role) ? user.role : "user");
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const shown = carriers.filter((c) => !q || [c.legalName, c.dbaName, c.dotNumber, c.city].some((s) => s?.toLowerCase().includes(q)));
    const ticked = carriers.filter((c) => entries[c.id]).length;
    const all = carriers.length > 0 && ticked === carriers.length;
    const toggle = (id: string) => setEntries((e) => { const n = { ...e }; if (n[id]) delete n[id]; else n[id] = lastRole; return n; });
    const toggleAll = () => setEntries(all ? {} : Object.fromEntries(carriers.map((c) => [c.id, lastRole])));
    const setRole = (id: string, r: UserRole) => { setLastRole(r); setEntries((e) => ({ ...e, [id]: r })); };

    const save = () => {
        setCarrierRoles(user, carriers, entries);
        onDone(ticked === 0 ? `${user.name} has no carrier profile for now`
            : all && new Set(Object.values(entries)).size === 1 ? `${user.name} is now ${ROLE_LABELS[entries[carriers[0].id]]} on every carrier profile in ${spName}`
                : `${user.name} is now ${describe(carriers, entries)}`);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Truck className="h-4 w-4" /></span>
                        Carrier access &amp; roles
                    </DialogTitle>
                    <div className="mt-1 flex items-center gap-3">
                        <Avatar u={user} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                            <p className="truncate text-[12px] text-slate-500">{user.email}</p>
                        </div>
                        <span className="ml-auto shrink-0"><RoleBadge role={user.role} /></span>
                    </div>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {admin && (
                        <p className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[13px] text-blue-800">
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0" /> An Admin of {spName} reaches every carrier profile in it — including ones created later. To limit someone to certain carriers, give them a carrier role instead.
                        </p>
                    )}
                    {driver && (
                        <p className="mb-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-600">
                            <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> A driver login follows the roster: {user.name} is a driver on {user.accountName ?? "this carrier"}. Drivers move between carriers through Hiring, not here.
                        </p>
                    )}

                    {!locked && (
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <button type="button" onClick={toggleAll} aria-pressed={all}
                                className={cn("inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-semibold transition-colors",
                                    all ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                                <span className={cn("flex h-4 w-4 items-center justify-center rounded border", all ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>{all && <Check className="h-3 w-3" />}</span>
                                All {carriers.length} carrier profile{carriers.length === 1 ? "" : "s"} in {spName}
                            </button>
                            <span className="text-[12px] font-semibold tabular-nums text-slate-500">{ticked} of {carriers.length} · tick a carrier, then its role</span>
                        </div>
                    )}
                    {carriers.length > 6 && (
                        <div className="relative mb-3">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search carrier profiles…"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    )}

                    {carriers.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">{spName} has no carrier profiles yet.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                            {shown.map((c) => {
                                const r = entries[c.id];
                                const on = !!r;
                                return (
                                    <li key={c.id} className={cn("flex items-center gap-3 px-3.5 py-2.5", on && !locked && "bg-blue-50/40", locked && !on && "opacity-50")}>
                                        <label className={cn("flex min-w-0 flex-1 items-center gap-3", locked ? "cursor-default" : "cursor-pointer")}>
                                            <input type="checkbox" checked={on} disabled={locked} onChange={() => toggle(c.id)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-bold text-blue-700">{initialsOf(c)}</span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-slate-900">{c.legalName}</span>
                                                <span className="block truncate text-[12px] text-slate-500">{carrierSub(c) || "—"}</span>
                                            </span>
                                        </label>
                                        <span className="hidden shrink-0 sm:inline-flex"><StatusDot status={c.status === "Active" ? "Active" : c.status === "Pending" ? "Invited" : "Inactive"} label={c.status} /></span>
                                        {locked ? (
                                            <span className="inline-flex w-40 shrink-0 items-center justify-end gap-1.5">
                                                {on && <><RoleBadge role={r} /><Lock className="h-3.5 w-3.5 text-slate-300" /></>}
                                            </span>
                                        ) : (
                                            <select value={on ? r : ""} disabled={!on} aria-label={`Role on ${carrierLabel(c)}`}
                                                onChange={(ev) => setRole(c.id, ev.target.value as UserRole)} className={cn(SELECT, "disabled:bg-slate-50 disabled:text-slate-400")}>
                                                {!on && <option value="">No access</option>}
                                                {OFFICE_ROLES.map((o) => <option key={o} value={o}>{ROLE_LABELS[o]}</option>)}
                                            </select>
                                        )}
                                    </li>
                                );
                            })}
                            {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No carrier matches.</li>}
                        </ul>
                    )}
                    {!locked && ticked === 0 && carriers.length > 0 && (
                        <p className="mt-2 text-[12px] text-amber-700">With no carrier profile ticked, {user.name} can sign in but has nothing to work on.</p>
                    )}
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                    <p className="min-w-0 truncate text-[12px] text-slate-500" title={describe(carriers, entries)}>{locked ? "" : describe(carriers, entries) || "No carrier yet"}</p>
                    <div className="flex shrink-0 gap-2">
                        <Button variant="outline" onClick={onClose}>{locked ? "Close" : "Cancel"}</Button>
                        {!locked && <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={save}><Check className="h-4 w-4" /> Save access</Button>}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** One carrier profile: pick people from the service profile to give access to it, with their role on it. */
export function GrantCarrierAccessDialog({ carrier, sp, users, onClose, onDone }: {
    carrier: AccountRecord; sp: ServiceProfile;
    /** Everyone under the service profile. */
    users: AppUser[];
    onClose: () => void; onDone: (message: string) => void;
}) {
    const spName = sp.dbaName || sp.legalName;
    const name = carrierLabel(carrier);
    const onIt = (u: AppUser) => u.role === "admin" || carriersOf(u).includes(carrier.id);
    // Office seats only — Admins already reach every carrier, drivers come through the roster.
    const candidates = users.filter((u) => CARRIER_ROLES.includes(u.role) && !isDriverUser(u) && u.status !== "Inactive" && !onIt(u));
    const already = users.filter((u) => u.role !== "admin" && !isDriverUser(u) && onIt(u));
    const [picked, setPicked] = useState<Record<string, UserRole>>({});
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const shown = candidates.filter((u) => !q || [u.name, u.email, u.title].some((s) => s?.toLowerCase().includes(q)));
    const groups = OFFICE_ROLES.map((r) => ({ role: r, users: shown.filter((u) => u.role === r) })).filter((g) => g.users.length);
    const defaultRole = (u: AppUser): UserRole => OFFICE_ROLES.includes(u.role) ? u.role : "user";
    const toggle = (u: AppUser) => setPicked((p) => { const n = { ...p }; if (n[u.id]) delete n[u.id]; else n[u.id] = defaultRole(u); return n; });
    const count = Object.keys(picked).length;

    const save = () => {
        const chosen = candidates.filter((u) => picked[u.id]);
        for (const u of chosen) setCarrierRoles(u, [carrier], { [carrier.id]: picked[u.id] });
        onDone(`${chosen.map((u) => `${u.name} (${ROLE_LABELS[picked[u.id]]})`).join(", ")} now ${chosen.length === 1 ? "has" : "have"} access to ${name}`);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><UserCheck className="h-4 w-4" /></span>
                        Give access to {name}
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">People already in {spName} who should also work on this carrier — tick them, then choose their role here. Admins reach it already; drivers join through the roster.</p>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {candidates.length > 6 && (
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…"
                                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                        </div>
                    )}
                    {candidates.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Everyone in {spName} already has access to {name} — add a new user from its ⋮ instead.</p>
                    ) : groups.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Nobody matches.</p>
                    ) : groups.map((g) => (
                        <div key={g.role}>
                            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {(() => { const I = ROLE_META[g.role].Icon; return <I className="h-3.5 w-3.5" />; })()} {ROLE_LABELS[g.role]}s elsewhere
                            </p>
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {g.users.map((u) => {
                                    const on = !!picked[u.id];
                                    const mine = carriersOf(u).map((id) => getAccountById(id)).filter(Boolean) as AccountRecord[];
                                    return (
                                        <li key={u.id} className={cn("flex items-center gap-3 px-3.5 py-2.5", on && "bg-blue-50/40")}>
                                            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                                <input type="checkbox" checked={on} onChange={() => toggle(u)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                                <Avatar u={u} size="sm" />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-slate-900">{u.name}</span>
                                                    <span className="block truncate text-[12px] text-slate-500">{u.title} · {mine.length ? mine.map((c) => `${ROLE_LABELS[roleOn(u, c.id)]} on ${carrierLabel(c)}`).join(", ") : "no carrier yet"}</span>
                                                </span>
                                            </label>
                                            <select value={on ? picked[u.id] : ""} disabled={!on} aria-label={`Role on ${name} for ${u.name}`}
                                                onChange={(ev) => setPicked((p) => ({ ...p, [u.id]: ev.target.value as UserRole }))} className={cn(SELECT, "disabled:bg-slate-50 disabled:text-slate-400")}>
                                                {!on && <option value="">Role on {name}</option>}
                                                {OFFICE_ROLES.map((o) => <option key={o} value={o}>{ROLE_LABELS[o]}</option>)}
                                            </select>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                    {already.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Already has access · {already.length}</p>
                            <div className="flex flex-wrap gap-1.5">
                                {already.map((u) => (
                                    <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2.5 text-[12px] font-medium text-slate-700" title={ROLE_LABELS[roleOn(u, carrier.id)]}>
                                        <Avatar u={u} size="sm" /> {u.name} <span className="text-slate-400">· {ROLE_LABELS[roleOn(u, carrier.id)]}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
                    <span className="text-[12px] font-semibold tabular-nums text-slate-500">{count} selected</span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={count === 0} onClick={save}><UserCheck className="h-4 w-4" /> Give access</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
