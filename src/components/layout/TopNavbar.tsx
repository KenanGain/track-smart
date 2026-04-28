import * as React from "react";
import { Search, Bell, HelpCircle, ChevronDown, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ROLE_BADGE, ROLE_LABELS, type AppUser } from "@/data/users.data";

type TopNavbarProps = {
    currentPath: string;
    user: AppUser;
    onSignOut: () => void;
    onNavigate?: (path: string) => void;
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
    "/admin/users": "Users",
    "/admin/users/new": "Add User",
    "/accounts/services/new": "Add Service Profile",
};

function getPageTitle(path: string): string {
    if (PATH_TITLES[path]) return PATH_TITLES[path];
    if (path.startsWith("/settings/")) return "Settings";
    if (path.startsWith("/admin/")) return "Admin";
    return "TrackSmart";
}

export function TopNavbar({ currentPath, user, onSignOut, onNavigate, className }: TopNavbarProps) {
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
                "h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 sticky top-0 z-40",
                className
            )}
        >
            <div className="flex items-center gap-4 min-w-0">
                <h1 className="text-lg font-semibold text-slate-900 truncate">
                    {getPageTitle(currentPath)}
                </h1>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="h-9 w-64 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-colors"
                    />
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-500 hover:text-slate-900"
                    aria-label="Help"
                >
                    <HelpCircle size={18} />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-slate-500 hover:text-slate-900 relative"
                    aria-label="Notifications"
                >
                    <Bell size={18} />
                    <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white" />
                </Button>

                <div className="w-px h-6 bg-slate-200 mx-1" />

                <div ref={menuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen((o) => !o)}
                        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        <div className={cn(
                            "h-8 w-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold",
                            user.avatarGradient
                        )}>
                            {user.initials}
                        </div>
                        <div className="hidden sm:flex flex-col items-start leading-tight">
                            <span className="text-sm font-semibold text-slate-900">{user.name}</span>
                            <span className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</span>
                        </div>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", menuOpen && "rotate-180")} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50">
                            <div className="px-3 py-3 border-b border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-semibold shrink-0",
                                        user.avatarGradient
                                    )}>
                                        {user.initials}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                                        <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className={cn(
                                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        ROLE_BADGE[user.role]
                                    )}>
                                        {ROLE_LABELS[user.role]}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate">
                                        {user.accountName ?? "Platform-wide access"}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => { setMenuOpen(false); onNavigate?.("/profile/me"); }}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                            >
                                <User size={14} className="text-slate-400" /> My Profile
                            </button>
                            <div className="border-t border-slate-100 my-1" />
                            <button
                                onClick={() => { setMenuOpen(false); onSignOut(); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors inline-flex items-center gap-2"
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
