import { useEffect } from "react";
import { X, Mail, Building2, Briefcase, Calendar, ShieldCheck } from "lucide-react";
import { ROLE_BADGE, ROLE_LABELS, type AppUser } from "@/data/users.data";
import { cn } from "@/lib/utils";

type Props = {
    user: AppUser | null;
    onClose: () => void;
    onEdit?: (user: AppUser) => void;
};

export function UserViewModal({ user, onClose, onEdit }: Props) {
    useEffect(() => {
        if (!user) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [user, onClose]);

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">User Details</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* Identity card */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40">
                        <div className="flex items-start gap-4">
                            <div className={cn(
                                "h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0",
                                user.avatarGradient
                            )}>
                                {user.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-lg font-bold text-slate-900 truncate">{user.name}</h3>
                                    <span className={cn(
                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        ROLE_BADGE[user.role]
                                    )}>
                                        {ROLE_LABELS[user.role]}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-600 mt-0.5">{user.title}</p>
                                <div className="text-xs text-slate-500 inline-flex items-center gap-1.5 mt-1.5">
                                    <Mail size={12} className="text-slate-400" /> {user.email}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Details list */}
                    <div className="px-6 py-5 space-y-4">
                        <DetailRow icon={ShieldCheck} label="Authority" value={ROLE_LABELS[user.role]} />
                        <DetailRow
                            icon={Building2}
                            label="Carrier Scope"
                            value={user.role === "super-admin" ? "Platform-wide (all carriers)" : user.accountName ?? "—"}
                        />
                        <DetailRow icon={Briefcase} label="Title" value={user.title} />
                        <DetailRow
                            icon={Calendar}
                            label="Status"
                            value={user.status}
                            valueClassName={user.status === "Active" ? "text-emerald-700" : "text-slate-500"}
                        />
                        {user.managedAccountIds && user.managedAccountIds.length > 1 && (
                            <DetailRow
                                icon={Building2}
                                label="Manages"
                                value={`${user.managedAccountIds.length} carriers`}
                            />
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                    {onEdit && (
                        <button
                            type="button"
                            onClick={() => { onEdit(user); onClose(); }}
                            className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Edit User
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailRow({
    icon: Icon, label, value, valueClassName,
}: { icon: React.ElementType; label: string; value: string; valueClassName?: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Icon size={14} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
                <div className={cn("text-sm font-medium text-slate-900", valueClassName)}>{value}</div>
            </div>
        </div>
    );
}
