import { useState } from "react";
import { AlertTriangle, Infinity as InfinityIcon, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    APP_USERS, addAppUser, initialsOf, newUserId, updateAppUser, type AppUser,
} from "@/data/users.data";
import { addAccountRecord, type AccountCountry, type AccountRecord, type AccountStatus } from "@/pages/accounts/accounts.data";
import { formatLimit, isUnlimitedLimit, type ServiceProfile } from "@/pages/accounts/service-profiles.data";
import { carrierSlots, carriersOf, gradientFor, usersOfProfile } from "./scope";

const SELECT = "h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

/**
 * A service-profile Admin creating a carrier profile under their service profile.
 *
 * Only what it takes to exist and be handed to somebody: names, USDOT, where it is, and —
 * optionally — its Fleet Admin, an existing one or somebody new who gets an invitation. The
 * rest of the profile is filled in on the carrier's own page. Counts against the service
 * profile's carrier limit, and is refused once the limit is used up.
 */
export function CarrierDialog({ sp, me, onClose, onDone }: {
    sp: ServiceProfile;
    me: AppUser | null;
    onClose: () => void;
    onDone: (message: string, carrier: AccountRecord) => void;
}) {
    const spName = sp.dbaName || sp.legalName;
    const { used, remaining } = carrierSlots(sp);
    const full = remaining <= 0;

    const [legalName, setLegalName] = useState("");
    const [dbaName, setDbaName] = useState("");
    const [dot, setDot] = useState("");
    const [country, setCountry] = useState<AccountCountry>(sp.legalAddress.country === "Canada" ? "CA" : "US");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [status, setStatus] = useState<AccountStatus>("Active");
    const fleetAdmins = usersOfProfile(sp.id).filter((u) => u.role === "fleet-admin" && u.status !== "Inactive");
    const [fa, setFa] = useState<string>(""); // "" later · "new" invite · user id
    const [faName, setFaName] = useState("");
    const [faEmail, setFaEmail] = useState("");
    const [error, setError] = useState<string | null>(null);

    const save = () => {
        if (full) return;
        if (!legalName.trim()) return setError("Enter the carrier's legal name.");
        if (dot && !/^\d{5,8}$/.test(dot.trim())) return setError("A USDOT number is 5 to 8 digits.");
        if (fa === "new") {
            if (!faName.trim()) return setError("Enter the Fleet Admin's name.");
            if (!/^\S+@\S+\.\S+$/.test(faEmail.trim())) return setError("Enter a valid email for the Fleet Admin.");
            if (APP_USERS.some((u) => u.email.toLowerCase() === faEmail.trim().toLowerCase())) return setError("Somebody already signs in with that email — pick them from the list instead.");
        }

        const id = `acct-${Date.now().toString(36)}`;
        const record: AccountRecord = {
            id,
            legalName: legalName.trim(),
            dbaName: dbaName.trim(),
            dotNumber: dot.trim(),
            cvorNumber: "", nscNumber: "", rinNumber: "",
            status,
            city: city.trim(),
            state: state.trim().toUpperCase(),
            country,
            drivers: 0,
            assets: 0,
            safetyRating: "Not Rated",
            createdAt: new Date().toISOString().slice(0, 10),
            profilePath: "/account/profile",
            serviceProfileId: sp.id,
            createdByUserId: me?.id,
        };
        addAccountRecord(record);

        // The profile's Admins reach every carrier in it — including this one.
        for (const a of usersOfProfile(sp.id).filter((u) => u.role === "admin")) {
            const ids = carriersOf(a);
            if (!ids.includes(id)) updateAppUser(a.id, { managedAccountIds: [...ids, id], accountId: a.accountId ?? id, accountName: a.accountName ?? record.legalName });
        }

        let who = "";
        if (fa === "new") {
            const uid = newUserId();
            addAppUser({
                id: uid, name: faName.trim(), email: faEmail.trim(), role: "fleet-admin",
                accountId: id, accountName: record.legalName, managedAccountIds: [id],
                serviceProfileId: sp.id, status: "Invited", title: "Fleet Manager",
                initials: initialsOf(faName), avatarGradient: gradientFor(uid),
            });
            who = ` · invitation sent to ${faName.trim()}`;
        } else if (fa) {
            const u = fleetAdmins.find((x) => x.id === fa);
            if (u) { updateAppUser(u.id, { managedAccountIds: [...carriersOf(u), id] }); who = ` · ${u.name} is its Fleet Admin`; }
        }
        onDone(`${record.legalName} created under ${spName}${who}`, record);
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="flex max-h-[90vh] max-w-xl flex-col p-0">
                <DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-4 text-left">
                    <DialogTitle className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"><Truck className="h-4 w-4" /></span>
                        Add a carrier profile
                    </DialogTitle>
                    <p className="text-sm font-normal text-slate-500">Created under {spName}. The rest of its profile is filled in on the carrier's own page.</p>
                </DialogHeader>

                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
                    {/* The limit, said before anything is typed. */}
                    <div className={cn("flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px]",
                        full ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-600")}>
                        {isUnlimitedLimit(sp.accountLimit)
                            ? <><InfinityIcon className="h-4 w-4 text-violet-600" /> Unlimited carrier profiles · {used} so far</>
                            : full
                                ? <><AlertTriangle className="h-4 w-4" /> {spName} has used all {formatLimit(sp.accountLimit)} carrier profiles. A Super Admin can raise the limit.</>
                                : <>{used} of {formatLimit(sp.accountLimit)} carrier profiles used · {remaining} left</>}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Legal name" className="sm:col-span-2">
                            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Northwind Freight LLC" disabled={full} />
                        </Field>
                        <Field label="DBA (optional)">
                            <Input value={dbaName} onChange={(e) => setDbaName(e.target.value)} placeholder="Northwind" disabled={full} />
                        </Field>
                        <Field label="USDOT (optional)">
                            <Input value={dot} onChange={(e) => setDot(e.target.value.replace(/\D/g, ""))} placeholder="1234567" inputMode="numeric" disabled={full} />
                        </Field>
                        <Field label="Country">
                            <select value={country} onChange={(e) => setCountry(e.target.value as AccountCountry)} className={SELECT} disabled={full}>
                                <option value="US">United States</option>
                                <option value="CA">Canada</option>
                            </select>
                        </Field>
                        <Field label="Status">
                            <select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)} className={SELECT} disabled={full}>
                                <option value="Active">Active</option>
                                <option value="Pending">Pending — not operating yet</option>
                            </select>
                        </Field>
                        <Field label="City">
                            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Columbus" disabled={full} />
                        </Field>
                        <Field label={country === "CA" ? "Province" : "State"}>
                            <Input value={state} onChange={(e) => setState(e.target.value)} placeholder={country === "CA" ? "ON" : "OH"} maxLength={2} disabled={full} />
                        </Field>
                    </div>

                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Fleet Admin</p>
                        <select value={fa} onChange={(e) => { setFa(e.target.value); setError(null); }} className={cn(SELECT, "mt-2")} disabled={full}>
                            <option value="">Assign later</option>
                            <option value="new">Invite somebody new…</option>
                            {fleetAdmins.length > 0 && (
                                <optgroup label={`Fleet Admins in ${spName}`}>
                                    {fleetAdmins.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.accountName ?? "—"}</option>)}
                                </optgroup>
                            )}
                        </select>
                        {fa === "new" && (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <Field label="Name"><Input value={faName} onChange={(e) => setFaName(e.target.value)} placeholder="Jane Smith" /></Field>
                                <Field label="Email"><Input type="email" value={faEmail} onChange={(e) => setFaEmail(e.target.value)} placeholder="jane@northwind.com" /></Field>
                            </div>
                        )}
                        <p className="mt-1.5 text-xs text-slate-500">Safety Managers, Drivers and Users are added once the carrier exists — from its ⋮ menu.</p>
                    </div>

                    {error && (
                        <p className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                        </p>
                    )}
                </div>

                <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-6 py-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={save} disabled={full}><Truck className="h-4 w-4" /> Create carrier profile</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
            <Label className="text-xs font-medium text-slate-600">{label}</Label>
            <div className="mt-1">{children}</div>
        </div>
    );
}
