import { Briefcase, Inbox, Plus, ListChecks } from "lucide-react";
import { type AppUser } from "@/data/users.data";

type Props = {
    user: AppUser;
    onNavigate?: (path: string) => void;
};

/**
 * Shown on /service-profile when the logged-in user has no service profile in
 * their scope. Mirrors EmptyCarrierProfile so the experience is consistent.
 * Note: super-admins shouldn't reach this — App.tsx defaults them to svc-001.
 */
export function EmptyServiceProfile({ user, onNavigate }: Props) {
    const canCreate = user.role === "super-admin";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    <Briefcase size={14} />
                    <span>Service Profile</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Service Profile</h1>
            </div>

            <div className="px-6 py-10 max-w-3xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-10 text-center">
                    <div className="mx-auto h-16 w-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center mb-5">
                        <Inbox size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">
                        No service profile yet
                    </h2>
                    <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                        You're not linked to a service profile yet.{" "}
                        {canCreate
                            ? "Create one below or browse from the Accounts page."
                            : "Ask a Super Admin to assign you."}
                    </p>

                    {onNavigate && (
                        <div className="mt-7 flex items-center justify-center gap-2 flex-wrap">
                            {canCreate && (
                                <button
                                    onClick={() => onNavigate("/accounts/services/new")}
                                    className="h-10 px-4 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-2 shadow-sm"
                                >
                                    <Plus size={15} /> Add Service Profile
                                </button>
                            )}
                            <button
                                onClick={() => onNavigate("/accounts")}
                                className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2 shadow-sm"
                            >
                                <ListChecks size={15} /> Browse Accounts
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
