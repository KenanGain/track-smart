import * as React from "react";
import { Search, HelpCircle, ChevronDown, LogOut, User, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ROLE_BADGE, ROLE_LABELS, getManagedAccountIds, isDriverUser, roleOn, type AppUser } from "@/data/users.data";
import { ACCOUNTS_DB, getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import { carriersOf } from "@/pages/users-roles/scope";
import { menuAccess, useRoleAccess } from "@/pages/users-roles/roles.data";
import { CarrierSwitcher } from "./CarrierSwitcher";
import { ServiceProfileSwitcher } from "./ServiceProfileSwitcher";
import { NotificationBell } from "./NotificationBell";
import { MessagesMenu } from "./MessagesMenu";

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
    /** Opens the off-canvas navigation drawer on mobile (hamburger). */
    onOpenMobileNav?: () => void;
    className?: string;
};

const PATH_TITLES: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/account/profile": "Carrier Fleet Profile",
    "/account/locations": "Locations",
    "/accounts": "Accounts",
    "/accounts/new": "Add Account",
    "/inventory": "Inventory",
    "/inventory/drivers": "Inventory by Driver",
    "/inventory/assets": "Inventory by Asset",
    "/inventory/vendors": "Vendors",
    "/inventory/vendors/new": "Add Vendor",
    "/vendors": "Vendors",
    "/vendors/new": "Add Vendor",
    "/inventory/items/new": "Add Inventory",
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
    "/admin/users": "Users & Roles",
    "/admin/users/new": "Add User",
    "/accounts/services/new": "Add Service Profile",
};

function getPageTitle(path: string): string {
    if (PATH_TITLES[path]) return PATH_TITLES[path];
    if (path.startsWith("/inventory/drivers/") && path.endsWith("/assign")) return "Assign & Hand Over";
    if (path.startsWith("/inventory/assets/") && path.endsWith("/assign")) return "Manage Inventory";
    if (path.startsWith("/vendors/") || path.startsWith("/maintenance/vendors/")) return "Vendor";
    if (path.startsWith("/settings/")) return "Settings";
    if (path.startsWith("/admin/")) return "Admin";
    return "TrackSmart";
}

/**
 * The search box. A full input only where the bar has room for one (xl and up); below
 * that it is an icon, and pressing it drops a full-width field under the bar — the field
 * keeps its width on a phone instead of squeezing the switcher and the icons together.
 */
function SearchBox() {
    const [open, setOpen] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
    React.useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open]);
    const field = "h-9 w-full pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-colors";
    return (
        <>
            <div className="relative hidden xl:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search…" className={cn(field, "w-44 2xl:w-56")} />
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen((o) => !o)}
                className={cn("h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 xl:hidden", open && "bg-slate-100 text-slate-900")}
                aria-label={open ? "Close search" : "Search"}
                aria-expanded={open}
            >
                {open ? <X size={17} /> : <Search size={17} />}
            </Button>
            {open && (
                <div className="absolute inset-x-0 top-full z-40 border-b border-slate-200 bg-white px-4 py-2 shadow-md sm:px-6 xl:hidden">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input ref={inputRef} type="text" placeholder="Search drivers, assets, documents…" className={field} />
                    </div>
                </div>
            )}
        </>
    );
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
    onOpenMobileNav,
    className,
}: TopNavbarProps) {
    // Swap the top-bar switcher when the user is on the Service Profile page —
    // there's no carrier scope on that page, so the carrier switcher would
    // be misleading. Picking a service profile re-scopes the page to that SP.
    const isOnServiceProfilePage = currentPath === "/service-profile";
    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);
    // The role under the name follows the carrier being looked at — a carrier role is per carrier.
    const role = roleOn(user, selectedAccountId);
    const here = selectedAccountId ? getAccountById(selectedAccountId) : undefined;
    // Whether Settings is in this person's menu here — the bell offers its Users & Roles only then.
    const access = useRoleAccess();
    const canOpenSettings = !isDriverUser(user) && menuAccess(access, "settings", role) !== "hidden";

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
                // The bar is a fixed 4rem; the parts inside it give way by breakpoint (the page
                // title and the user's name go first, the switcher narrows to its badge, the
                // search becomes an icon) rather than all shrinking into each other at once.
                "h-16 border-b border-slate-200 bg-white flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 sticky top-0 z-40",
                className
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                {/* Hamburger — opens the nav drawer on mobile only */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onOpenMobileNav}
                    className="h-9 w-9 -ml-1 shrink-0 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg md:hidden"
                    aria-label="Open navigation menu"
                >
                    <Menu size={20} />
                </Button>
                <h1 className="hidden md:block max-w-[200px] shrink-0 truncate text-base font-semibold text-slate-900">
                    {getPageTitle(currentPath)}
                </h1>
                <div className="hidden md:block h-5 w-px bg-slate-200" />

                {/* Carrier switcher pinned to the top-left so any page that
                    scopes to a carrier (Safety and Compliance, Carrier Profile,
                    Inventory, …) reflects the choice immediately.
                      • super-admin → switch between every carrier in the system
                      • everyone else → the carriers they have access to (an
                                       Admin: every carrier of their service
                                       profile; a Fleet Admin, Safety Manager or
                                       User: the ones they were given). The
                                       CarrierSwitcher collapses to a static
                                       label when there is only one, and to its
                                       badge on a phone.
                    A driver's seat is the driver app — no switcher. */}
                {!isDriverUser(user) && (() => {
                    if (isOnServiceProfilePage) {
                        // The Service Profile page has no carrier scope, so the carrier switcher
                        // would be misleading there; Admins get the profile switcher instead.
                        if (!onSelectServiceProfile || (user.role !== "super-admin" && user.role !== "admin")) return null;
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
                    // super-admin → every carrier; everyone else → the ones they have access to.
                    const mine = user.role === "super-admin" ? undefined : carriersOf(user);
                    const accounts = mine ? ACCOUNTS_DB.filter((a) => mine.includes(a.id)) : ACCOUNTS_DB;
                    if (accounts.length === 0) return null;
                    const scopeLabel = user.role === "super-admin"
                        ? "Super Admin · All Carriers"
                        : `${ROLE_LABELS[role]} · ${accounts.length} carrier${accounts.length === 1 ? "" : "s"}`;
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
                            scopeLabel={scopeLabel}
                            className="min-w-0"
                        />
                    );
                })()}
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                <SearchBox />

                {/* Action icons grouped together with consistent 9x9 hit area */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden sm:inline-flex h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                        aria-label="Help"
                    >
                        <HelpCircle size={17} />
                    </Button>

                    {/* Chat and alerts — each opens what is waiting, with a count of what is unread. */}
                    <MessagesMenu user={user} onNavigate={onNavigate} />
                    <NotificationBell user={user} onNavigate={onNavigate} onSelectAccount={onSelectAccount} canOpenSettings={canOpenSettings} />
                </div>

                <div className="hidden sm:block h-5 w-px bg-slate-200 mx-1" />

                {/* User menu */}
                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        className={cn(
                            "flex items-center gap-2 pl-1 pr-1.5 lg:pr-2 py-1 rounded-lg transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/20",
                            menuOpen ? "bg-slate-100" : "hover:bg-slate-100"
                        )}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label={`${user.name} · ${ROLE_LABELS[role]}`}
                    >
                        <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-[12px] font-semibold">
                            {user.initials}
                        </div>
                        <div className="hidden lg:flex flex-col items-start leading-tight max-w-[140px]">
                            <span className="text-sm font-semibold text-slate-900 truncate w-full text-left">{user.name}</span>
                            <span className="text-[11px] text-slate-500 truncate w-full text-left">{ROLE_LABELS[role]}</span>
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
                                        ROLE_BADGE[role]
                                    )}>
                                        {ROLE_LABELS[role]}
                                    </span>
                                    {/* The carrier being looked at — the role above is the role there. */}
                                    <span className="truncate" title={here ? `on ${here.legalName}` : undefined}>
                                        {user.role === "super-admin" && !here ? "Platform-wide" : here?.legalName ?? user.accountName ?? "Platform-wide"}
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
