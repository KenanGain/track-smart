import { useEffect, useMemo } from "react";
import {
    X, Briefcase, MapPin, Mail, Phone, Building2, Hash, Calendar,
    Infinity as InfinityIcon, Truck, UserCircle2,
} from "lucide-react";
import {
    formatLimit,
    isUnlimitedLimit,
    type ServiceProfile,
    type ServiceProfileStatus,
} from "./service-profiles.data";
import { getAccountsByServiceProfileId, type AccountStatus } from "./accounts.data";
import { findUserById } from "@/data/users.data";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<ServiceProfileStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
};

const CARRIER_STATUS_BADGE: Record<AccountStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
};

type Props = {
    profile: ServiceProfile | null;
    onClose: () => void;
    onEdit?: (profile: ServiceProfile) => void;
};

export function ServiceProfileViewModal({ profile, onClose, onEdit }: Props) {
    useEffect(() => {
        if (!profile) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [profile, onClose]);

    const linkedCarriers = useMemo(
        () => (profile ? getAccountsByServiceProfileId(profile.id) : []),
        [profile]
    );

    if (!profile) return null;

    const utilization = isUnlimitedLimit(profile.accountLimit)
        ? null
        : Math.round((profile.accountsCreated / Math.max(1, profile.accountLimit)) * 100);

    const initials = profile.legalName
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map((p) => p[0]!.toUpperCase()).join("");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Service Profile</h2>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-base font-bold shadow-sm shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg font-bold text-slate-900 truncate">{profile.legalName}</h3>
                                    <span className={cn(
                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        STATUS_BADGE[profile.status]
                                    )}>
                                        {profile.status}
                                    </span>
                                </div>
                                {profile.dbaName && <p className="text-sm text-slate-600 mt-0.5">DBA {profile.dbaName}</p>}
                                <div className="text-xs text-slate-500 inline-flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1"><Hash size={11} className="text-slate-400" /> {profile.stateOfInc}</span>
                                    <span className="inline-flex items-center gap-1"><Briefcase size={11} className="text-slate-400" /> {profile.businessType}</span>
                                    <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> Since {profile.createdAt}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Account creation usage */}
                        <Card title="Account Creation" className="md:col-span-2">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                {isUnlimitedLimit(profile.accountLimit) ? (
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 text-sm font-bold">
                                        <InfinityIcon size={14} /> Unlimited
                                    </span>
                                ) : (
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                                            <span className="font-semibold uppercase tracking-wider">Usage</span>
                                            <span>{profile.accountsCreated} of {formatLimit(profile.accountLimit)}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all",
                                                    (utilization ?? 0) < 70 ? "bg-emerald-500" :
                                                    (utilization ?? 0) < 90 ? "bg-amber-500" : "bg-red-500"
                                                )}
                                                style={{ width: `${utilization ?? 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-900">{profile.accountsCreated}</div>
                                    <div className="text-[11px] text-slate-500">accounts created</div>
                                </div>
                            </div>
                        </Card>

                        {/* Linked carriers — what fills up the limit */}
                        <Card title={`Carrier Accounts Created (${linkedCarriers.length})`} className="md:col-span-2">
                            {linkedCarriers.length === 0 ? (
                                <div className="text-xs text-slate-400 italic">
                                    No carrier accounts have been created under this service profile yet.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {linkedCarriers.map((c) => {
                                        const creator = c.createdByUserId ? findUserById(c.createdByUserId) : undefined;
                                        const carrierInitials = c.legalName
                                            .replace(/[^a-zA-Z0-9\s]/g, "")
                                            .split(/\s+/).filter(Boolean).slice(0, 2)
                                            .map((p) => p[0]!.toUpperCase()).join("");
                                        return (
                                            <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold shrink-0">
                                                        {carrierInitials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-slate-900 truncate">{c.legalName}</div>
                                                        <div className="text-[11px] text-slate-500 inline-flex items-center gap-2 mt-0.5">
                                                            <span className="inline-flex items-center gap-1"><Truck size={11} className="text-slate-400" /> {c.assets} assets · {c.drivers} drivers</span>
                                                            <span className="text-slate-300">·</span>
                                                            <span className="inline-flex items-center gap-1"><MapPin size={11} className="text-slate-400" /> {c.city}, {c.state}</span>
                                                        </div>
                                                        {creator && (
                                                            <div className="text-[11px] text-slate-500 inline-flex items-center gap-1 mt-0.5">
                                                                <UserCircle2 size={11} className="text-slate-400" />
                                                                Created by <span className="font-semibold text-slate-700">{creator.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
                                                    CARRIER_STATUS_BADGE[c.status]
                                                )}>
                                                    {c.status}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Card>

                        <Card title="Legal / Main Address">
                            <div className="flex items-start gap-2 text-sm text-slate-700">
                                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                <div className="leading-snug">
                                    {profile.legalAddress.street}{profile.legalAddress.apt ? `, ${profile.legalAddress.apt}` : ""}<br />
                                    {profile.legalAddress.city}, {profile.legalAddress.state} {profile.legalAddress.zip}<br />
                                    <span className="text-xs text-slate-500">{profile.legalAddress.country}</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="Mailing Address">
                            <div className="flex items-start gap-2 text-sm text-slate-700">
                                <Mail size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                <div className="leading-snug">
                                    {profile.mailingAddress.streetOrPoBox}<br />
                                    {profile.mailingAddress.city}, {profile.mailingAddress.state} {profile.mailingAddress.zip}<br />
                                    <span className="text-xs text-slate-500">{profile.mailingAddress.country}</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="Contact" className="md:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div className="inline-flex items-center gap-2 text-slate-700">
                                    <Mail size={13} className="text-slate-400" /> {profile.contactEmail ?? "—"}
                                </div>
                                <div className="inline-flex items-center gap-2 text-slate-700">
                                    <Phone size={13} className="text-slate-400" /> {profile.contactPhone ?? "—"}
                                </div>
                            </div>
                        </Card>

                        <Card title={`Office Locations (${profile.officeLocations.length})`} className="md:col-span-2">
                            {profile.officeLocations.length === 0 ? (
                                <div className="text-xs text-slate-400 italic">No office locations on file.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {profile.officeLocations.map((o) => (
                                        <li key={o.id} className="py-2 flex items-start gap-2.5">
                                            <div className="h-7 w-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                <Building2 size={13} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-slate-900 truncate">{o.label}</div>
                                                <div className="text-xs text-slate-500 truncate">
                                                    {o.address}{o.address && (o.city || o.state) ? ", " : ""}
                                                    {[o.city, o.state].filter(Boolean).join(", ")}
                                                </div>
                                                {(o.contactName || o.phone) && (
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {o.contactName} {o.phone && <>· {o.phone}</>}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Close</button>
                    {onEdit && (
                        <button onClick={() => { onEdit(profile); onClose(); }} className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 shadow-sm">
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Card({
    title, children, className,
}: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("bg-white border border-slate-200 rounded-xl p-4", className)}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h4>
            {children}
        </section>
    );
}
