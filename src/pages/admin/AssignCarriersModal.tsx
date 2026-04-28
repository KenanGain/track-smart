import { useEffect, useMemo, useState } from "react";
import { X, Save, AlertCircle, Building2, Lock } from "lucide-react";
import {
    canCreateUserForAccount,
    getManagedAccountIds,
    type AppUser,
} from "@/data/users.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { CarrierAccessPicker } from "./CarrierAccessPicker";
import { cn } from "@/lib/utils";

type Props = {
    user: AppUser | null;
    currentUser: AppUser;
    onClose: () => void;
    onSave: (next: AppUser) => void;
};

/**
 * Focused modal that lets the current admin / super admin grant the target
 * user access to additional carriers within the current user's own scope.
 * Identity, role, and other fields are not editable here — for those, use
 * UserEditModal. This is the quick "give Aiden access to Summit Peak" path.
 */
export function AssignCarriersModal({ user, currentUser, onClose, onSave }: Props) {
    const [managedIds, setManagedIds] = useState<string[]>([]);
    const [applyToAll, setApplyToAll] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSuperAdmin = currentUser.role === "super-admin";
    const managedScope = useMemo(() => getManagedAccountIds(currentUser), [currentUser]);

    const availableCarriers = useMemo(() => {
        if (!managedScope) return ACCOUNTS_DB; // super admin
        return ACCOUNTS_DB.filter((a) => managedScope.includes(a.id));
    }, [managedScope]);

    useEffect(() => {
        if (!user) return;
        const initial = (user.managedAccountIds && user.managedAccountIds.length > 0)
            ? user.managedAccountIds
            : (user.accountId ? [user.accountId] : []);
        setManagedIds(initial);
        setApplyToAll(false);
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [user, onClose]);

    if (!user) return null;

    // Super admins are platform-wide and not bound to a single carrier
    if (user.role === "super-admin") {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
                <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Assign Carriers</h2>
                        <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="px-6 py-6">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-violet-50 border border-violet-200">
                            <Lock size={16} className="text-violet-700 mt-0.5 shrink-0" />
                            <div className="text-sm text-slate-700">
                                <span className="font-semibold">{user.name}</span> is a Super Admin and already has platform-wide access to every carrier. No assignment needed.
                            </div>
                        </div>
                    </div>
                    <div className="px-6 py-3 border-t border-slate-200 flex justify-end">
                        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Close</button>
                    </div>
                </div>
            </div>
        );
    }

    const resolvedIds = applyToAll ? availableCarriers.map((a) => a.id) : managedIds;
    const isValid = resolvedIds.length > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) {
            setError("Pick at least one carrier to assign.");
            return;
        }
        const allowed = resolvedIds.every((id) => canCreateUserForAccount(currentUser, id));
        if (!allowed) {
            setError("You don't have permission to grant access to one of the selected carriers.");
            return;
        }
        const primaryAccountId = resolvedIds[0];
        const primaryCarrier = ACCOUNTS_DB.find((a) => a.id === primaryAccountId);
        const next: AppUser = {
            ...user,
            accountId: primaryAccountId,
            accountName: primaryCarrier?.legalName,
            managedAccountIds: resolvedIds,
        };
        onSave(next);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                            "h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shrink-0",
                            user.avatarGradient
                        )}>
                            {user.initials}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-900 truncate">Assign Carriers</h2>
                            <p className="text-xs text-slate-500 truncate">
                                {user.name} · {user.title}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Scope hint */}
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-100 text-xs text-blue-900 inline-flex items-center gap-2">
                    <Building2 size={13} />
                    {isSuperAdmin
                        ? `You can assign any of ${availableCarriers.length} carrier${availableCarriers.length === 1 ? "" : "s"} on the platform.`
                        : `You can assign any of your ${availableCarriers.length} managed carrier${availableCarriers.length === 1 ? "" : "s"}.`}
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-700">Carrier Access</label>
                            <p className="text-xs text-slate-500 mt-0.5">
                                The first selected carrier becomes their primary. They'll be able to switch between any of the selected carriers from the Account page.
                            </p>
                        </div>

                        {availableCarriers.length === 0 ? (
                            <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                                You don't manage any carriers yet — nothing to assign.
                            </div>
                        ) : (
                            <CarrierAccessPicker
                                carriers={availableCarriers}
                                selectedIds={managedIds}
                                applyToAll={applyToAll}
                                onChange={({ ids, applyToAll: a }) => {
                                    setManagedIds(ids);
                                    setApplyToAll(a);
                                    setError(null);
                                }}
                            />
                        )}

                        {error && (
                            <div className="mt-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                        <button
                            type="submit"
                            disabled={!isValid || availableCarriers.length === 0}
                            className={cn(
                                "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2",
                                (isValid && availableCarriers.length > 0)
                                    ? "bg-blue-600 hover:bg-blue-700"
                                    : "bg-slate-300 cursor-not-allowed"
                            )}
                        >
                            <Save size={16} /> Save Assignments
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
