import * as React from "react";
import { Search, Bell, HelpCircle, ChevronDown, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ROLE_BADGE, ROLE_LABELS, getManagedAccountIds, type AppUser } from "@/data/users.data";
import { ACCOUNTS_DB, type AccountRecord } from "@/pages/accounts/accounts.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import { CarrierSwitcher } from "./CarrierSwitcher";
import { ServiceProfileSwitcher } from "./ServiceProfileSwitcher";

type TopNavbarProps = {
    currentPath: string;
    user: AppUser;
    onSignOut: () => void;
    onNavigate?: (path: string) => void;
    /** Currently-active carrier (the one whose data is rendered on
     *  carrier-scoped pages like Safety and Compliance). */
    selectedAccountId?: string;
    /** Fired when a super-admin picks a different carrier from the
     *  top-bar carrier switcher. */
    onSelectAccount?: (account: AccountRecord) => void;
    /** Currently-active service profile — used by the top-bar Service Profile
     *  switcher when the user is on the /service-profile page. */
    selectedServiceProfileId?: string;
    /** Fired when the user picks a different service profile from the
     *  top-bar Service Profile switcher. */
    onSelectServiceProfile?: (id: string) => void;
    className?: string;
};

const PATH_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/account/profile": "Carrier Profile",
    "/account/locations": "Locations",
    "/accounts": "Accounts",
    "/accounts/new": "Add Account",
    "/inventory": "Inventory",
    "/inventory/vendors": "Vendors",
    "/inventory/vendors/new": "Add Vendor",
    "/inventory/items/new": "Add Inventory",
    "/inventory/handover": "Hand Over",
    "/inventory/driver-inventory": "Driver Inventory",
    "/compliance": "Compliance & Documents",
    "/maintenance": "Maintenance",
    "/paystubs": "Paystubs",
    "/hours-of-service": "Hours of Service",
    "/fuel": "Fuel",
    "/accidents": "Accidents",
    "/inspections": "Safety and Compliance",
    "/violations": "Violations",
    "/safety-events": "Safety Events",
    "/safety-analysis": "Safety Analysis",
    "/tickets": "Tickets",
    "/profile/me": "My Profile",
    "/service-profile": "Service Profile",
    "/admin/users": "Users",
    "/admin/users/new": "Add User",
    "/accounts/services/new": "Add Service Profile",
};

function getPageTitle(path: string): string {
    if (PATH_TITLES[path]) return PATH_TITLES[path];
    if (path.startsWith("/inventory/driver-inventory/")) return "Driver Inventory";
    if (path.startsWith("/inventory/handover/")) return "Hand Over";
    if (path.startsWith("/settings/")) return "Settings";
    if (path.startsWith("/admin/")) return "Admin";
    return "TrackSmart";
}

export function TopNavbar({
    currentPath,
    user,
    onSignOut,
    onNavigate,
    selectedAccountId,
    onSelectAccount,
    selectedServiceProfileId,
    onSelectServiceProfile,
    className,
}: TopNavbarProps) {
    // Swap the top-bar switcher when the user is on the Service Profile page —
    // there's no carrier scope on that page, so the carrier switcher would
    // be misleading. Picking a service profile re-scopes the page to that SP.
    const isOnServiceProfilePage = currentPath === "/service-profile";
    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!menuOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    return (
        <header
            className={cn(
                "h-16 border-b border-slate-200 bg-white flex items-center justify-between gap-4 px-6 sticky top-0 z-40",
                className
            )}
        >
            <div className="flex items-center gap-3 min-w-0">
                <h1 className="text-base font-semibold text-slate-900 truncate">
                    {getPageTitle(currentPath)}
                </h1>
                <div className="hidden md:block h-5 w-px bg-slate-200" />

                {/* Carrier switcher pinned to the top-left so any page that
                    scopes to a carrier (Safety and Compliance, Carrier Profile,
                    Inventory, …) reflects the choice immediately.
                      • super-admin → switch between every carrier in the system
                      • admin       → switch between the carriers in their
                                       managedAccountIds (the CarrierSwitcher
                                       collapses to a static label when there
                                       is only one)
                    Plain users don't get the switcher — they're always scoped
                    to their single carrier already. */}
                {(user.role === "super-admin" || user.role === "admin") && (() => {
                    if (isOnServiceProfilePage && onSelectServiceProfile) {
                        // Show the Service Profile switcher when we're on the
                        // /service-profile page. Scope it the same way as
                        // accounts: super-admins see all, admins see only the
                        // service profiles they manage (their own + any tied
                        // to their managed carriers).
                        const inScopeProfiles = (() => {
                            if (user.role === "super-admin") return SERVICE_PROFILES_DB;
                            const set = new Set<string>();
                            if (user.serviceProfileId) set.add(user.serviceProfileId);
                            for (const id of (user.serviceProfileIds ?? [])) set.add(id);
                            const managed = getManagedAccountIds(user) ?? [];
                            for (const a of ACCOUNTS_DB) {
                                if (managed.includes(a.id) && a.serviceProfileId) set.add(a.serviceProfileId);
                            }
                            return SERVICE_PROFILES_DB.filter((sp) => set.has(sp.id));
                        })();
                        if (inScopeProfiles.length === 0) return null;
                        return (
                            <ServiceProfileSwitcher
                                selectedProfileId={selectedServiceProfileId}
                                profiles={inScopeProfiles}
                                onSelect={(id) => onSelectServiceProfile(id)}
                                scopeLabel={user.role === "super-admin" ? "Super Admin · All Service Profiles" : `Admin · ${inScopeProfiles.length} service profile${inScopeProfiles.length === 1 ? "" : "s"}`}
                                className="hidden md:flex"
                            />
                        );
                    }
                    if (!onSelectAccount) return null;
                    const managed = getManagedAccountIds(user);
                    // super-admin returns undefined (= "all"); for admins
                    // restrict to their managed list.
                    const accounts = managed
                        ? ACCOUNTS_DB.filter((a) => managed.includes(a.id))
                        : ACCOUNTS_DB;
                    if (accounts.length === 0) return null;
                    return (
                        <CarrierSwitcher
                            selectedAccountId={selectedAccountId}
                            accounts={accounts.map((a) => ({
                                id: a.id,
                                legalName: a.legalName,
                                dbaName: a.dbaName,
                                dotNumber: a.dotNumber,
                                status: a.status,
                                city: a.city,
                                state: a.state,
                            }))}
                            onSelect={(id) => {
                                const next = ACCOUNTS_DB.find((a) => a.id === id);
                                if (next) onSelectAccount(next);
                            }}
                            scopeLabel={user.role === "super-admin" ? "Super Admin · All Carriers" : `Admin · ${accounts.length} carrier${accounts.length === 1 ? "" : "s"}`}
                            className="hidden md:flex"
                        />
                    );
                })()}
            </div>

            <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative hidden lg:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search…"
                        className="h-9 w-56 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    />
                </div>

                {/* Action icons grouped together with consistent 9x9 hit area */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        aria-label="Help"
                    >
                        <HelpCircle size={17} />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg relative"
                        aria-label="Notifications"
                    >
                        <Bell size={17} />
                        <span className="absolute top-2 right-2 h-2 w-2 bg-rose-500 rounded-full ring-2 ring-white" />
                    </Button>
                </div>

                <div className="h-5 w-px bg-slate-200 mx-1.5" />

                {/* User menu */}
                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        className={cn(
                            "flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20",
                            menuOpen ? "bg-slate-100" : "hover:bg-slate-100"
                        )}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                    >
                        <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[12px] font-semibold">
                            {user.initials}
                        </div>
                        <div className="hidden sm:flex flex-col items-start leading-tight max-w-[140px]">
                            <span className="text-sm font-semibold text-slate-900 truncate w-full text-left">{user.name}</span>
                            <span className="text-[11px] text-slate-500 truncate w-full text-left">{ROLE_LABELS[user.role]}</span>
                        </div>
                        <ChevronDown
                            size={14}
                            className={cn("text-slate-400 transition-transform shrink-0", menuOpen && "rotate-180")}
                        />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                            {/* Identity block — minimal, no gradients */}
                            <div className="px-3 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-slate-900 flex items-center justify-center text-white text-[13px] font-semibold shrink-0">
                                        {user.initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="mt-2.5 text-[11px] text-slate-500 inline-flex items-center gap-1.5">
                                    <span className={cn(
                                        "inline-flex items-center rounded-md border px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider",
                                        ROLE_BADGE[user.role]
                                    )}>
                                        {ROLE_LABELS[user.role]}
                                    </span>
                                    <span className="truncate">
                                        {user.accountName ?? "Platform-wide"}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => { setMenuOpen(false); onNavigate?.("/profile/me"); }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-2.5 rounded-none"
                            >
                                <User size={14} className="text-slate-400" /> My Profile
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                                onClick={() => { setMenuOpen(false); onSignOut(); }}
                                className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center gap-2.5"
                            >
                                <LogOut size={14} /> Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
