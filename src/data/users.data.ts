// Centralized user roster. Used by the login page (quick-login dropdown) and
// by the app for role-based sidebar filtering and navbar identity.

export type UserRole = "super-admin" | "admin" | "user";

export type AppUser = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    accountId?: string;     // primary carrier the user belongs to
    accountName?: string;
    /**
     * Carriers this user can manage. Defaults to [accountId] for admins.
     * Empty for super admins (they manage all carriers — handled by the helpers).
     */
    managedAccountIds?: string[];
    status: "Active" | "Inactive";
    title: string;
    initials: string;
    avatarGradient: string; // tailwind gradient classes
};

export const APP_USERS: AppUser[] = [
    // ── Super Admins ─────────────────────────────────────────────────────────
    {
        id: "u-001",
        name: "Kenan Gain",
        email: "kenan.gain@tracksmart.com",
        role: "super-admin",
        status: "Active",
        title: "Platform Super Admin",
        initials: "KG",
        avatarGradient: "from-violet-500 to-violet-700",
    },
    {
        id: "u-002",
        name: "Vijay",
        email: "vijay@tracksmart.com",
        role: "super-admin",
        status: "Active",
        title: "Platform Super Admin",
        initials: "VJ",
        avatarGradient: "from-fuchsia-500 to-fuchsia-700",
    },
    // ── Acme Trucking Inc. (acct-001) ────────────────────────────────────────
    {
        id: "u-004",
        name: "John Doe",
        email: "john.doe@acmetrucking.com",
        role: "admin",
        accountId: "acct-001",
        accountName: "Acme Trucking Inc.",
        managedAccountIds: ["acct-001"],
        status: "Active",
        title: "Owner / General Manager",
        initials: "JD",
        avatarGradient: "from-blue-500 to-blue-700",
    },
    {
        id: "u-005",
        name: "Sarah Mitchell",
        email: "sarah.m@acmetrucking.com",
        role: "user",
        accountId: "acct-001",
        accountName: "Acme Trucking Inc.",
        status: "Active",
        title: "Dispatcher",
        initials: "SM",
        avatarGradient: "from-emerald-500 to-emerald-700",
    },
    {
        id: "u-006",
        name: "Marcus Reed",
        email: "marcus.r@acmetrucking.com",
        role: "user",
        accountId: "acct-001",
        accountName: "Acme Trucking Inc.",
        status: "Active",
        title: "Safety & Compliance Manager",
        initials: "MR",
        avatarGradient: "from-amber-500 to-amber-700",
    },
    {
        id: "u-007",
        name: "Lily Chen",
        email: "lily.c@acmetrucking.com",
        role: "user",
        accountId: "acct-001",
        accountName: "Acme Trucking Inc.",
        status: "Active",
        title: "Maintenance Coordinator",
        initials: "LC",
        avatarGradient: "from-orange-500 to-orange-700",
    },

    // ── Cascade Freight Systems LLC (acct-002) ───────────────────────────────
    {
        id: "u-008",
        name: "Diego Alvarez",
        email: "diego.a@cascadefreight.com",
        role: "admin",
        accountId: "acct-002",
        accountName: "Cascade Freight Systems LLC",
        managedAccountIds: ["acct-002"],
        status: "Active",
        title: "Owner / Operations Director",
        initials: "DA",
        avatarGradient: "from-sky-500 to-sky-700",
    },
    {
        id: "u-009",
        name: "Rachel Kim",
        email: "rachel.k@cascadefreight.com",
        role: "user",
        accountId: "acct-002",
        accountName: "Cascade Freight Systems LLC",
        status: "Active",
        title: "Dispatcher",
        initials: "RK",
        avatarGradient: "from-teal-500 to-teal-700",
    },
    {
        id: "u-010",
        name: "Owen Brooks",
        email: "owen.b@cascadefreight.com",
        role: "user",
        accountId: "acct-002",
        accountName: "Cascade Freight Systems LLC",
        status: "Active",
        title: "Safety & Compliance Manager",
        initials: "OB",
        avatarGradient: "from-cyan-500 to-cyan-700",
    },
];

export const ROLE_LABELS: Record<UserRole, string> = {
    "super-admin": "Super Admin",
    "admin": "Admin",
    "user": "User",
};

export const ROLE_BADGE: Record<UserRole, string> = {
    "super-admin": "bg-violet-50 text-violet-700 border-violet-200",
    "admin": "bg-blue-50 text-blue-700 border-blue-200",
    "user": "bg-slate-50 text-slate-700 border-slate-200",
};

export function findUserById(id: string): AppUser | undefined {
    return APP_USERS.find((u) => u.id === id);
}

export function findUserByEmail(email: string): AppUser | undefined {
    const e = email.trim().toLowerCase();
    return APP_USERS.find((u) => u.email.toLowerCase() === e);
}

// Demo password for prototype only — every account uses this string. No real
// authentication is performed.
export const DEMO_PASSWORD = "demo1234";

// ── Role-aware visibility helpers ──────────────────────────────────────────

/**
 * Carrier IDs the given user can manage / create users for.
 * Super admin → undefined (means "all carriers"). Admin → managedAccountIds (or
 * just their primary accountId). Plain user → just their own carrier.
 */
export function getManagedAccountIds(u: AppUser): string[] | undefined {
    if (u.role === "super-admin") return undefined; // all carriers
    if (u.role === "admin") {
        if (u.managedAccountIds && u.managedAccountIds.length > 0) return u.managedAccountIds;
        return u.accountId ? [u.accountId] : [];
    }
    return u.accountId ? [u.accountId] : [];
}

/**
 * Returns the list of users the given currentUser is allowed to see on the
 * Users admin page.
 */
export function getVisibleUsers(currentUser: AppUser): AppUser[] {
    if (currentUser.role === "super-admin") return APP_USERS;
    const managed = getManagedAccountIds(currentUser) ?? [];
    return APP_USERS.filter((u) => u.accountId && managed.includes(u.accountId));
}

/**
 * Whether the current user is allowed to create users for the target carrier.
 */
export function canCreateUserForAccount(currentUser: AppUser, accountId: string): boolean {
    if (currentUser.role === "super-admin") return true;
    if (currentUser.role !== "admin") return false;
    const managed = getManagedAccountIds(currentUser) ?? [];
    return managed.includes(accountId);
}

/**
 * Whether the current user is allowed to create *new carrier profiles*.
 * Super admins always can; admins can (per the requirement).
 */
export function canCreateCarrier(currentUser: AppUser): boolean {
    return currentUser.role === "super-admin" || currentUser.role === "admin";
}
