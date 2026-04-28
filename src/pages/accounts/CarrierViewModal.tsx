import { useEffect } from "react";
import {
    X, Building2, MapPin, Hash, Calendar, Truck, Users, ShieldCheck,
} from "lucide-react";
import { type AccountRecord, type AccountStatus, type SafetyRating, cvorNscRinDisplay } from "./accounts.data";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<AccountStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inactive: "bg-slate-100 text-slate-500 border-slate-200",
    Suspended: "bg-red-50 text-red-700 border-red-200",
    Pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const RATING_BADGE: Record<SafetyRating, string> = {
    Satisfactory: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Conditional: "bg-amber-50 text-amber-700 border-amber-200",
    Unsatisfactory: "bg-red-50 text-red-700 border-red-200",
    "Not Rated": "bg-slate-50 text-slate-500 border-slate-200",
};

type Props = {
    account: AccountRecord | null;
    onClose: () => void;
    onEdit?: (account: AccountRecord) => void;
    onOpenProfile?: (account: AccountRecord) => void;
};

export function CarrierViewModal({ account, onClose, onEdit, onOpenProfile }: Props) {
    useEffect(() => {
        if (!account) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [account, onClose]);

    if (!account) return null;

    const initials = account.legalName
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .split(/\s+/).filter(Boolean).slice(0, 2)
        .map((p) => p[0]!.toUpperCase()).join("");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Carrier Profile</h2>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base font-bold shadow-sm shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg font-bold text-slate-900 truncate">{account.legalName}</h3>
                                    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_BADGE[account.status])}>
                                        {account.status}
                                    </span>
                                </div>
                                {account.dbaName && <p className="text-sm text-slate-600 mt-0.5">DBA {account.dbaName}</p>}
                                <div className="text-xs text-slate-500 inline-flex items-center gap-3 mt-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1"><Hash size={11} className="text-slate-400" /> DOT {account.dotNumber || "—"}</span>
                                    <span className="inline-flex items-center gap-1"><MapPin size={11} className="text-slate-400" /> {account.city}, {account.state}</span>
                                    <span className="inline-flex items-center gap-1"><Calendar size={11} className="text-slate-400" /> Since {account.createdAt}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Stat icon={Truck} label="Assets" value={account.assets.toLocaleString()} accent="indigo" />
                        <Stat icon={Users} label="Drivers" value={account.drivers.toLocaleString()} accent="emerald" />

                        <Card title="Identifiers" className="md:col-span-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
                                <Row label="DOT Number" value={account.dotNumber || "—"} />
                                <Row label="CVOR / NSC / RIN" value={cvorNscRinDisplay(account) || "—"} />
                            </div>
                        </Card>

                        <Card title="Location" className="md:col-span-2">
                            <div className="flex items-start gap-2 text-sm text-slate-700">
                                <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                <div className="leading-snug">
                                    {account.city}, {account.state}<br />
                                    <span className="text-xs text-slate-500">{account.country === "US" ? "United States" : "Canada"}</span>
                                </div>
                            </div>
                        </Card>

                        <Card title="Safety Rating" className="md:col-span-2">
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider", RATING_BADGE[account.safetyRating])}>
                                <ShieldCheck size={11} /> {account.safetyRating}
                            </span>
                        </Card>
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Close</button>
                    {onOpenProfile && (
                        <button onClick={() => { onOpenProfile(account); onClose(); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 inline-flex items-center gap-2">
                            <Building2 size={14} /> Open Full Profile
                        </button>
                    )}
                    {onEdit && (
                        <button onClick={() => { onEdit(account); onClose(); }} className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 shadow-sm">
                            Edit Carrier
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={cn("bg-white border border-slate-200 rounded-xl p-4", className)}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">{title}</h4>
            {children}
        </section>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
            <div className="text-slate-900 font-mono text-sm">{value}</div>
        </div>
    );
}

function Stat({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: "indigo" | "emerald" }) {
    const map = {
        indigo: "bg-indigo-50 text-indigo-700",
        emerald: "bg-emerald-50 text-emerald-700",
    };
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", map[accent])}>
                <Icon size={16} />
            </div>
            <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                <div className="text-2xl font-bold text-slate-900">{value}</div>
            </div>
        </div>
    );
}
