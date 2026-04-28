import { useState } from "react";
import { Plus, Building2, Briefcase, AlertTriangle, Infinity as InfinityIcon } from "lucide-react";
import { SubTabs, type SubTab } from "@/components/ui/SubTabs";
import { AccountsListPage } from "./AccountsListPage";
import { ServiceProfilesListPage } from "./ServiceProfilesListPage";
import { ACCOUNTS_DB, type AccountRecord } from "./accounts.data";
import {
    SERVICE_PROFILES_DB,
    getServiceProfileById,
    isUnlimitedLimit,
} from "./service-profiles.data";
import {
    canCreateAnotherAccount,
    getRemainingAccountSlotsForUser,
    type AppUser,
} from "@/data/users.data";
import { cn } from "@/lib/utils";

type TabId = "carriers" | "services";

type Props = {
    onNavigate: (path: string) => void;
    onSelectAccount?: (account: AccountRecord) => void;
    currentUser?: AppUser | null;
};

const TABS: SubTab<TabId>[] = [
    { id: "carriers", label: "Carrier Profiles", icon: Building2 },
    { id: "services", label: "Service Profiles", icon: Briefcase },
];

export function AccountsTabsPage({ onNavigate, onSelectAccount, currentUser }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>("carriers");

    // Service-profile based limit logic
    const userServiceProfile = currentUser ? getServiceProfileById(currentUser.serviceProfileId) : undefined;
    const remaining = currentUser
        ? getRemainingAccountSlotsForUser(currentUser, SERVICE_PROFILES_DB)
        : Infinity;
    const canCreate = currentUser ? canCreateAnotherAccount(currentUser, SERVICE_PROFILES_DB) : true;
    const isAdminWithLimit =
        currentUser?.role === "admin" &&
        userServiceProfile !== undefined &&
        !isUnlimitedLimit(userServiceProfile.accountLimit);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Page header */}
            <div className="bg-white border-b border-slate-200 px-6 pt-6 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {activeTab === "carriers"
                                ? `${ACCOUNTS_DB.length.toLocaleString()} carrier profiles · click a row to open the carrier`
                                : `${SERVICE_PROFILES_DB.length.toLocaleString()} service profiles · parent organizations that manage carriers`}
                        </p>

                        {/* Service-profile usage badge for admins */}
                        {currentUser?.role === "admin" && userServiceProfile && (
                            <div className="mt-3 inline-flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Service profile:
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold">
                                    <Briefcase size={11} /> {userServiceProfile.legalName}
                                </span>
                                {isUnlimitedLimit(userServiceProfile.accountLimit) ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                                        <InfinityIcon size={11} /> Unlimited account creation
                                    </span>
                                ) : (
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold",
                                        remaining === 0
                                            ? "bg-red-50 text-red-700 border-red-200"
                                            : remaining <= 2
                                            ? "bg-amber-50 text-amber-700 border-amber-200"
                                            : "bg-slate-50 text-slate-700 border-slate-200"
                                    )}>
                                        {userServiceProfile.accountsCreated} of {userServiceProfile.accountLimit} accounts used
                                        {remaining === 0 && <AlertTriangle size={11} />}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {activeTab === "carriers" ? (
                            <button
                                onClick={() => canCreate && onNavigate("/accounts/new")}
                                disabled={!canCreate}
                                title={!canCreate ? "Account limit reached for your service profile" : undefined}
                                className={cn(
                                    "h-9 px-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors",
                                    canCreate
                                        ? "bg-[#2563EB] hover:bg-blue-700 text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <Plus size={15} /> Add Carrier Profile
                            </button>
                        ) : (
                            <button
                                onClick={() => canCreate && onNavigate("/accounts/services/new")}
                                disabled={!canCreate}
                                title={!canCreate ? "Account limit reached for your service profile" : undefined}
                                className={cn(
                                    "h-9 px-3.5 rounded-lg text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition-colors",
                                    canCreate
                                        ? "bg-[#2563EB] hover:bg-blue-700 text-white"
                                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                <Plus size={15} /> Add Service Profile
                            </button>
                        )}
                    </div>
                </div>

                {/* Limit-reached banner */}
                {isAdminWithLimit && remaining === 0 && (
                    <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <div>
                            <span className="font-semibold">Account limit reached.</span> Your service profile{" "}
                            <span className="font-semibold">{userServiceProfile.legalName}</span> has used all{" "}
                            {userServiceProfile.accountLimit} of its allowed account slots. Contact a Super Admin to raise the limit.
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <SubTabs tabs={TABS} activeId={activeTab} onChange={setActiveTab} />
            </div>

            {/* Content */}
            <div>
                {activeTab === "carriers" ? (
                    <AccountsListPage onNavigate={onNavigate} onSelectAccount={onSelectAccount} embedded />
                ) : (
                    <div className="px-6 py-6">
                        <ServiceProfilesListPage onNavigate={onNavigate} />
                    </div>
                )}
            </div>
        </div>
    );
}
