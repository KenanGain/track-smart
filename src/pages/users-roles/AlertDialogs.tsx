import { useState } from "react";
import { BellRing, Building2, Check, ExternalLink, Truck, UserRound, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CARRIER_ROLES, ROLE_LABELS, driverIdOfUser, isDriverUser, type AppUser } from "@/data/users.data";
import type { NotificationRole, RoutingRecipient } from "@/pages/compliance/monitoring-routing.data";
import { ROLE_META } from "./roles.data";
import { Avatar, RoleBadge } from "./pieces";

// Who gets a carrier's monitoring alerts, seen from both ends: a person (which notification
// roles are they on?) and a notification role (which of the team is on it?). Both write to
// the same per-carrier notification roles that Settings ▸ Default Compliance & Monitoring
// manages in full — this is the short way in, not a second store.

/** The recipient a team member is addressed as — a driver login by their roster id. */
export function recipientFor(u: AppUser): RoutingRecipient {
    const d = driverIdOfUser(u);
    return d ? { id: `driver:${d}`, name: u.name, kind: "driver", email: u.email }
        : { id: `user:${u.id}`, name: u.name, kind: "user", email: u.email };
}

/** Both ids a team member may have been added under. */
export const recipientIdsOf = (u: AppUser): string[] => {
    const d = driverIdOfUser(u);
    return d ? [`driver:${d}`, `user:${u.id}`] : [`user:${u.id}`];
};

export const userOnRole = (role: NotificationRole, u: AppUser): boolean => {
    const ids = recipientIdsOf(u);
    return role.recipients.some((r) => ids.includes(r.id));
};

/** Which records a notification role covers, as short chips. */
export function coverChips(r: NotificationRole): { Icon: React.ElementType; label: string }[] {
    const out: { Icon: React.ElementType; label: string }[] = [];
    if (r.carrier) out.push({ Icon: Building2, label: "Carrier" });
    if (r.allDrivers) out.push({ Icon: UserRound, label: "All drivers" });
    else if (r.driverIds.length) out.push({ Icon: UserRound, label: `${r.driverIds.length} driver${r.driverIds.length === 1 ? "" : "s"}` });
    if (r.allAssets) out.push({ Icon: Truck, label: "All assets" });
    else if (r.assetIds.length) out.push({ Icon: Truck, label: `${r.assetIds.length} asset${r.assetIds.length === 1 ? "" : "s"}` });
    return out;
}

export function CoverPill({ Icon, label, muted }: { Icon: React.ElementType; label: string; muted?: boolean }) {
    return (
        <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
            muted ? "border-slate-100 bg-white text-slate-300" : "border-slate-200 bg-slate-50 text-slate-600")}>
            <Icon className={cn("h-3 w-3", muted ? "text-slate-300" : "text-slate-400")} /> {label}
        </span>
    );
}

function Footer({ onClose, onSave, canEdit, onOpenFullSetup }: { onClose: () => void; onSave: () => void; canEdit: boolean; onOpenFullSetup: () => void }) {
    return (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-4">
            <button type="button" onClick={onOpenFullSetup} className="inline-flex items-center gap-1 text-[12px] font-semibold text-blue-600 hover:underline">
                Full monitoring setup <ExternalLink className="h-3 w-3" />
            </button>
            <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>{canEdit ? "Cancel" : "Close"}</Button>
                {canEdit && <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={onSave}><Check className="h-4 w-4" /> Save</Button>}
            </div>
        </div>
    );
}

/** One person: tick the notification roles they should be on. */
export function UserAlertsDialog({ user, roles, canEdit, onClose, onSave, onOpenFullSetup }: {
    user: AppUser; roles: NotificationRole[]; canEdit: boolean;
    onClose: () => void; onSave: (roleIdsOn: string[]) => void; onOpenFullSetup: () => void;
}) {
    const [on, setOn] = useState<Set<string>>(() => new Set(roles.filter((r) => userOnRole(r, user)).map((r) => r.id)));
    const toggle = (id: string) => setOn((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-xl flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white"><BellRing className="h-4 w-4" /></span>
                        Monitoring alerts for {user.name}
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Each notification role below says which records somebody is told about. Email or in-app is chosen on the record itself.</p>
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    <div className="mb-3 flex items-center gap-3">
                        <Avatar u={user} />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                            <p className="truncate text-[12px] text-slate-500">{user.email}</p>
                        </div>
                        <span className="ml-auto shrink-0"><RoleBadge role={user.role} /></span>
                    </div>
                    {roles.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">No notification roles yet — create one in the full monitoring setup.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                            {roles.map((r) => {
                                const checked = on.has(r.id);
                                return (
                                    <li key={r.id}>
                                        <label className={cn("flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50", !canEdit && "cursor-default")}>
                                            <input type="checkbox" checked={checked} disabled={!canEdit} onChange={() => toggle(r.id)}
                                                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                                                    {r.name}
                                                    {!r.enabled && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">Paused</span>}
                                                </span>
                                                {r.description && <span className="block text-[12px] text-slate-500">{r.description}</span>}
                                                <span className="mt-1.5 flex flex-wrap gap-1">
                                                    {coverChips(r).map((c) => <CoverPill key={c.label} {...c} />)}
                                                    {coverChips(r).length === 0 && <CoverPill Icon={X} label="Covers nothing yet" muted />}
                                                </span>
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <Footer onClose={onClose} canEdit={canEdit} onOpenFullSetup={onOpenFullSetup} onSave={() => onSave([...on])} />
            </DialogContent>
        </Dialog>
    );
}

/** One notification role: tick the team members who get it. */
export function RoleRecipientsDialog({ role, team, canEdit, onClose, onSave, onOpenFullSetup }: {
    role: NotificationRole; team: AppUser[]; canEdit: boolean;
    onClose: () => void; onSave: (recipients: RoutingRecipient[]) => void; onOpenFullSetup: () => void;
}) {
    const [picked, setPicked] = useState<RoutingRecipient[]>(role.recipients);
    const teamIds = new Set(team.flatMap(recipientIdsOf));
    // People on the role who are not on this carrier's team — the service profile's Admins, a
    // role placeholder, an outside contact. Kept, shown, removable; never dropped on save.
    const others = picked.filter((r) => !teamIds.has(r.id));
    const isOn = (u: AppUser) => { const ids = recipientIdsOf(u); return picked.some((r) => ids.includes(r.id)); };
    const toggle = (u: AppUser) => {
        const ids = recipientIdsOf(u);
        setPicked((p) => isOn(u) ? p.filter((r) => !ids.includes(r.id)) : [...p, recipientFor(u)]);
    };
    const groups = CARRIER_ROLES.map((r) => ({ role: r, users: team.filter((u) => u.role === r && u.status !== "Inactive") })).filter((g) => g.users.length);

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-xl flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white"><BellRing className="h-4 w-4" /></span>
                        Who gets “{role.name}” alerts
                    </DialogTitle>
                    <p className="flex flex-wrap items-center gap-1 text-sm font-normal text-slate-500">
                        Covers {coverChips(role).map((c) => <CoverPill key={c.label} {...c} />)}{coverChips(role).length === 0 && "nothing yet"}
                    </p>
                </DialogHeader>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    {groups.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">Nobody on this carrier's team yet.</p>}
                    {groups.map((g) => (
                        <div key={g.role}>
                            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {(() => { const I = ROLE_META[g.role].Icon; return <I className="h-3.5 w-3.5" />; })()} {ROLE_LABELS[g.role]}s
                            </p>
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {g.users.map((u) => (
                                    <li key={u.id}>
                                        <label className={cn("flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50", !canEdit && "cursor-default")}>
                                            <input type="checkbox" checked={isOn(u)} disabled={!canEdit} onChange={() => toggle(u)}
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                            <Avatar u={u} size="sm" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-semibold text-slate-900">{u.name}</span>
                                                <span className="block truncate text-[12px] text-slate-500">{u.title}{isDriverUser(u) ? " · alerts in the driver app" : ` · ${u.email}`}</span>
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    {others.length > 0 && (
                        <div>
                            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Also notified</p>
                            <div className="flex flex-wrap gap-1.5">
                                {others.map((r) => (
                                    <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-2.5 pr-1.5 text-[12px] font-medium text-slate-700">
                                        {r.name}
                                        {canEdit && <button type="button" onClick={() => setPicked((p) => p.filter((x) => x.id !== r.id))} className="rounded-full p-0.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label={`Remove ${r.name}`}><X className="h-3 w-3" /></button>}
                                    </span>
                                ))}
                            </div>
                            <p className="mt-1.5 text-[11px] text-slate-500">Not on this carrier's team — the service profile's Admins, a placeholder role or an outside contact.</p>
                        </div>
                    )}
                </div>
                <Footer onClose={onClose} canEdit={canEdit} onOpenFullSetup={onOpenFullSetup} onSave={() => onSave(picked)} />
            </DialogContent>
        </Dialog>
    );
}
