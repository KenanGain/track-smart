import { useState } from "react";
import { Plus, Building2, Briefcase, AlertTriangle, Infinity as InfinityIcon } from "lucide-react";
import { type SubTab } from "@/components/ui/SubTabs";
import { ListPageHeader, PAGE_PAD } from "@/components/ui/ListPageHeader";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
import { ListHeaderBridge, useListHeaderBridge } from "@/components/ui/list-header-bridge";
import { AccountsListPage } from "./AccountsListPage";
import { ServiceProfilesListPage } from "./ServiceProfilesListPage";
import { ACCOUNTS_DB, type AccountRecord } from "./accounts.data";
import {
    SERVICE_PROFILES_DB,
    getServiceProfileById,
    isUnlimitedLimit,
} from "./service-profiles.data";
import { useMemo } from "react";
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
    onSelectServiceProfile?: (id: string) => void;
    currentUser?: AppUser | null;
};

const TABS: SubTab<TabId>[] = [
    { id: "carriers", label: "Carrier Profiles", icon: Building2 },
    { id: "services", label: "Service Profiles", icon: Briefcase },
];

export function AccountsTabsPage({ onNavigate, onSelectAccount, onSelectServiceProfile, currentUser }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>("carriers");
    // The carrier table scrolls inside its own box; the header folds as it does.
    const { scrollRef, condensed: rowsCondensed, onScroll } = useCondensingHeader(activeTab);
    // The list says when its KPI cards have scrolled away; the header then condenses and
    // carries their figures, and opens again when the cards come back.
    const bridge = useListHeaderBridge();
    const condensed = rowsCondensed || bridge.away;

    // Role-aware visible counts for the page subtitle
    const visibleCarrierCount = useMemo(() => {
        if (!currentUser || currentUser.role === "super-admin") return ACCOUNTS_DB.length;
        const managed = currentUser.managedAccountIds && currentUser.managedAccountIds.length > 0
            ? currentUser.managedAccountIds
            : currentUser.accountId ? [currentUser.accountId] : [];
        const sp = currentUser.serviceProfileId;
        return ACCOUNTS_DB.filter((a) =>
            managed.includes(a.id) ||
            (a.createdByUserId && a.createdByUserId === currentUser.id) ||
            (!!sp && a.serviceProfileId === sp)
        ).length;
    }, [currentUser]);

    const visibleServiceCount = useMemo(() => {
        if (!currentUser || currentUser.role === "super-admin") return SERVICE_PROFILES_DB.length;
        return currentUser.serviceProfileId ? 1 : 0;
    }, [currentUser]);

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

    const addButtonCls = cn(
        "inline-flex items-center gap-2 rounded-lg px-3.5 text-sm font-semibold shadow-sm transition-colors",
        condensed ? "h-8" : "h-9",
    );

    return (
        <ListHeaderBridge value={bridge.value}>
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <ListPageHeader
                Icon={Building2}
                title="Accounts"
                count={activeTab === "carriers" ? visibleCarrierCount : visibleServiceCount}
                countTitle={activeTab === "carriers"
                    ? `${visibleCarrierCount.toLocaleString()} carrier profiles visible`
                    : `${visibleServiceCount.toLocaleString()} service profiles visible`}
                description={activeTab === "carriers"
                    ? "Carrier profiles you can see · click a row to open the carrier"
                    : "Service profiles · parent organizations that manage carriers"}
                condensed={condensed}
                chips={bridge.chips ?? undefined}
                tabs={TABS}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as TabId)}
                tabsLabel="Account types"
                actions={<>
                    {/* Service-profile usage badge for admins */}
                    {currentUser?.role === "admin" && userServiceProfile && (
                        <span className="hidden items-center gap-2 md:inline-flex">
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
                        </span>
                    )}
                    {activeTab === "carriers" ? (
                        <button
                            onClick={() => canCreate && onNavigate("/accounts/new")}
                            disabled={!canCreate}
                            title={!canCreate ? "Account limit reached for your service profile" : undefined}
                            className={cn(addButtonCls, canCreate
                                ? "bg-[#2563EB] hover:bg-blue-700 text-white"
                                : "bg-slate-200 text-slate-400 cursor-not-allowed")}
                        >
                            <Plus size={15} /> Add Carrier Profile
                        </button>
                    ) : (
                        // Add Service Profile is reserved for Super Admins.
                        currentUser?.role === "super-admin" && (
                            <button
                                onClick={() => onNavigate("/accounts/services/new")}
                                className={cn(addButtonCls, "bg-[#2563EB] hover:bg-blue-700 text-white")}
                            >
                                <Plus size={15} /> Add Service Profile
                            </button>
                        )
                    )}
                </>}
            />

            {/* Limit-reached banner */}
            {isAdminWithLimit && remaining === 0 && (
                <div className={cn("pt-4", PAGE_PAD)}>
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        <div>
                            <span className="font-semibold">Account limit reached.</span> Your service profile{" "}
                            <span className="font-semibold">{userServiceProfile.legalName}</span> has used all{" "}
                            {userServiceProfile.accountLimit} of its allowed account slots. Contact a Super Admin to raise the limit.
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            {activeTab === "carriers" ? (
                <AccountsListPage
                    onNavigate={onNavigate}
                    onSelectAccount={onSelectAccount}
                    embedded
                    currentUser={currentUser}
                    scrollRef={scrollRef}
                    onScroll={onScroll}
                />
            ) : (
                <ServiceProfilesListPage
                    onNavigate={onNavigate}
                    currentUser={currentUser}
                    onSelectServiceProfile={onSelectServiceProfile}
                    scrollRef={scrollRef}
                    onScroll={onScroll}
                />
            )}
        </div>
        </ListHeaderBridge>
    );
}
