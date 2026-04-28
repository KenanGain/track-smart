import { Building2, Briefcase, Plus, Inbox, ListChecks } from "lucide-react";
import { type AppUser } from "@/data/users.data";
import { getServiceProfileById } from "@/pages/accounts/service-profiles.data";

type Props = {
    user: AppUser;
    onNavigate: (path: string) => void;
};

/**
 * Shown on /account/profile when the logged-in user has no carrier in their
 * scope (e.g. an admin whose service profile has zero carriers yet, or a
 * super admin who hasn't picked one). Replaces the old "fall through to
 * Acme" behavior so users always see *their* context.
 */
export function EmptyCarrierProfile({ user, onNavigate }: Props) {
    const serviceProfile = getServiceProfileById(user.serviceProfileId);
    const canCreate = user.role === "super-admin" || user.role === "admin";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Building2 size={14} />
                    <span>Account</span>
                    <span>/</span>
                    <span className="font-medium text-slate-900">Carrier Profile</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Carrier Profile</h1>
            </div>

            <div className="px-6 py-10 max-w-3xl mx-auto">
                {/* Service profile context (if any) */}
                {serviceProfile && (
                    <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-800 text-xs font-semibold">
                        <Briefcase size={13} /> Service profile: {serviceProfile.legalName}
                    </div>
                )}

                {/* Empty state card */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-5">
                        <Inbox size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        No carrier profile yet
                    </h2>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                        {serviceProfile
                            ? <>You don't have any carrier accounts under <span className="font-semibold text-slate-900">{serviceProfile.legalName}</span> yet.</>
                            : <>You don't have any carrier accounts assigned to you yet.</>}
                        {" "}
                        {canCreate
                            ? "Create one below to get started, or browse the Accounts page."
                            : "Ask your administrator to assign you to a carrier."}
                    </p>

                    <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
                        {canCreate && (
                            <button
                                onClick={() => onNavigate("/accounts/new")}
                                className="h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                            >
                                <Plus size={15} /> Add Carrier Profile
                            </button>
                        )}
                        <button
                            onClick={() => onNavigate("/accounts")}
                            className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 shadow-sm"
                        >
                            <ListChecks size={15} /> Browse Accounts
                        </button>
                    </div>
                </div>

                <p className="mt-4 text-xs text-slate-500 text-center">
                    Once a carrier is assigned to you (or you create one), it will appear here automatically.
                </p>
            </div>
        </div>
    );
}
