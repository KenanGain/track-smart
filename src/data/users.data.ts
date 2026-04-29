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
    /**
     * Primary service profile this user belongs to. For users assigned to
     * multiple service profiles, this is the first entry of `serviceProfileIds`.
     * Admins inherit their primary service profile's account-creation limit
     * when creating new carrier or service accounts. Super admins are not
     * bound to a service profile.
     */
    serviceProfileId?: string;
    /**
     * All service profiles this user has access to. Empty/undefined means
     * none. Useful when a user works across multiple service organizations.
     */
    serviceProfileIds?: string[];
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
        managedAccountIds: ["acct-001", "acct-005", "acct-008"],
        serviceProfileId: "svc-001",
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
        serviceProfileId: "svc-001",
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
        serviceProfileId: "svc-001",
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
        serviceProfileId: "svc-001",
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
        serviceProfileId: "svc-003",
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
        serviceProfileId: "svc-003",
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
        serviceProfileId: "svc-003",
        status: "Active",
        title: "Safety & Compliance Manager",
        initials: "OB",
        avatarGradient: "from-cyan-500 to-cyan-700",
    },

    // ── Admins for additional service profiles ───────────────────────────────
    // Each is the admin "owner" of a service profile and has created the
    // carrier accounts that fill that profile's usage count.
    {
        id: "u-011",
        name: "Carlos Mendez",
        email: "carlos.m@rmlg.com",
        role: "admin",
        accountId: "acct-009",
        accountName: "Rocky Mountain Hauling Inc.",
        managedAccountIds: ["acct-009", "acct-014", "acct-022", "acct-026"],
        serviceProfileId: "svc-002",
        status: "Active",
        title: "Owner / Operations Director",
        initials: "CM",
        avatarGradient: "from-rose-500 to-rose-700",
    },
    {
        id: "u-012",
        name: "Marisol Ortiz",
        email: "marisol.o@atlanticcarrier.com",
        role: "admin",
        accountId: "acct-010",
        accountName: "Atlantic Coastal Transport LLC",
        managedAccountIds: ["acct-010", "acct-016", "acct-019", "acct-021", "acct-027"],
        serviceProfileId: "svc-005",
        status: "Active",
        title: "President",
        initials: "MO",
        avatarGradient: "from-pink-500 to-pink-700",
    },
    {
        id: "u-013",
        name: "Jean Tremblay",
        email: "jean.t@mapleleaf.ca",
        role: "admin",
        accountId: "acct-003",
        accountName: "Northern Lights Transport Ltd.",
        managedAccountIds: ["acct-003", "acct-007", "acct-011", "acct-015", "acct-018", "acct-029"],
        serviceProfileId: "svc-006",
        status: "Active",
        title: "Managing Director",
        initials: "JT",
        avatarGradient: "from-red-500 to-red-700",
    },
    {
        id: "u-014",
        name: "Luis Ramirez",
        email: "luis.r@sunbelthauling.com",
        role: "admin",
        accountId: "acct-004",
        accountName: "Sunbelt Haulers Corporation",
        managedAccountIds: ["acct-004", "acct-006", "acct-017", "acct-024"],
        serviceProfileId: "svc-007",
        status: "Active",
        title: "Owner",
        initials: "LR",
        avatarGradient: "from-orange-500 to-orange-700",
    },
    {
        id: "u-015",
        name: "Erin Ferraro",
        email: "erin.f@heartlandfreight.com",
        role: "admin",
        accountId: "acct-012",
        accountName: "Heartland Trucking Partners",
        managedAccountIds: ["acct-012", "acct-020", "acct-023"],
        serviceProfileId: "svc-008",
        status: "Active",
        title: "CEO",
        initials: "EF",
        avatarGradient: "from-indigo-500 to-indigo-700",
    },
    {
        id: "u-016",
        name: "Priya Nguyen",
        email: "priya.n@bayviewexpress.com",
        role: "admin",
        accountId: "acct-013",
        accountName: "Bay Area Logistics Inc.",
        managedAccountIds: ["acct-013", "acct-028", "acct-030"],
        serviceProfileId: "svc-009",
        status: "Inactive",
        title: "Owner / Director",
        initials: "PN",
        avatarGradient: "from-yellow-500 to-yellow-700",
    },
    {
        id: "u-017",
        name: "Margo Lindqvist",
        email: "margo.l@northstardistribution.com",
        role: "admin",
        accountId: undefined,
        accountName: undefined,
        managedAccountIds: [],
        serviceProfileId: "svc-010",
        status: "Inactive",
        title: "Sole Proprietor",
        initials: "ML",
        avatarGradient: "from-teal-500 to-teal-700",
    },

    // ── Pinecrest Operations LP (svc-004) — admin (no carriers yet) ──────────
    {
        id: "u-018",
        name: "Hudson Wells",
        email: "hudson.w@pinecrestops.com",
        role: "admin",
        accountId: undefined,
        accountName: undefined,
        managedAccountIds: [],
        serviceProfileId: "svc-004",
        status: "Active",
        title: "Managing Partner",
        initials: "HW",
        avatarGradient: "from-emerald-500 to-emerald-700",
    },

    // ── TrackSmart (svc-001) — operational users beyond Acme ────────────────
    {
        id: "u-019",
        name: "Tessa Wright",
        email: "tessa.w@greatlakescarrier.com",
        role: "user",
        accountId: "acct-005",
        accountName: "Great Lakes Carrier Group",
        managedAccountIds: ["acct-005", "acct-008"], // multi-carrier user
        serviceProfileId: "svc-001",
        status: "Active",
        title: "Regional Dispatcher",
        initials: "TW",
        avatarGradient: "from-purple-500 to-purple-700",
    },
    {
        id: "u-020",
        name: "Marcus Hill",
        email: "marcus.h@lonestarfreight.com",
        role: "user",
        accountId: "acct-008",
        accountName: "Lone Star Freightways LLC",
        serviceProfileId: "svc-001",
        status: "Active",
        title: "Maintenance Coordinator",
        initials: "MH",
        avatarGradient: "from-blue-500 to-blue-700",
    },

    // ── RMLG (svc-002) — operational users ──────────────────────────────────
    {
        id: "u-021",
        name: "Aiden Park",
        email: "aiden.p@rmlg.com",
        role: "user",
        accountId: "acct-009",
        accountName: "Rocky Mountain Hauling Inc.",
        serviceProfileId: "svc-002",
        status: "Active",
        title: "Dispatcher",
        initials: "AP",
        avatarGradient: "from-rose-500 to-rose-700",
    },
    {
        id: "u-022",
        name: "Brielle Foster",
        email: "brielle.f@summitpeak.com",
        role: "user",
        accountId: "acct-014",
        accountName: "Summit Peak Transport Corp.",
        serviceProfileId: "svc-002",
        status: "Active",
        title: "Safety & Compliance Manager",
        initials: "BF",
        avatarGradient: "from-pink-500 to-pink-700",
    },

    // ── Atlantic Carrier Solutions (svc-005) — operational users ────────────
    {
        id: "u-023",
        name: "Camille Reyes",
        email: "camille.r@atlanticcoastal.com",
        role: "user",
        accountId: "acct-010",
        accountName: "Atlantic Coastal Transport LLC",
        serviceProfileId: "svc-005",
        status: "Active",
        title: "Dispatcher",
        initials: "CR",
        avatarGradient: "from-pink-500 to-pink-700",
    },
    {
        id: "u-024",
        name: "Jordan Banks",
        email: "jordan.b@libertybell.com",
        role: "user",
        accountId: "acct-019",
        accountName: "Liberty Bell Carriers Corp.",
        serviceProfileId: "svc-005",
        status: "Active",
        title: "Safety Manager",
        initials: "JB",
        avatarGradient: "from-amber-500 to-amber-700",
    },

    // ── Maple Leaf Logistics (svc-006) — operational users (Canadian) ───────
    {
        id: "u-025",
        name: "Sophie Bouchard",
        email: "sophie.b@nltransport.ca",
        role: "user",
        accountId: "acct-003",
        accountName: "Northern Lights Transport Ltd.",
        serviceProfileId: "svc-006",
        status: "Active",
        title: "Dispatcher",
        initials: "SB",
        avatarGradient: "from-red-500 to-red-700",
    },
    {
        id: "u-026",
        name: "Liam MacDonald",
        email: "liam.m@pacificcrown.ca",
        role: "user",
        accountId: "acct-018",
        accountName: "Pacific Crown Logistics Inc.",
        serviceProfileId: "svc-006",
        status: "Active",
        title: "Maintenance Coordinator",
        initials: "LM",
        avatarGradient: "from-rose-500 to-rose-700",
    },

    // ── Sunbelt Hauling (svc-007) — operational users ───────────────────────
    {
        id: "u-027",
        name: "Diego Santiago",
        email: "diego.s@sunbelthauling.com",
        role: "user",
        accountId: "acct-004",
        accountName: "Sunbelt Haulers Corporation",
        serviceProfileId: "svc-007",
        status: "Active",
        title: "Dispatcher",
        initials: "DS",
        avatarGradient: "from-orange-500 to-orange-700",
    },
    {
        id: "u-028",
        name: "Rosa Martinez",
        email: "rosa.m@desertwind.com",
        role: "user",
        accountId: "acct-017",
        accountName: "Desert Wind Transport LLC",
        serviceProfileId: "svc-007",
        status: "Active",
        title: "Safety & Compliance Manager",
        initials: "RM",
        avatarGradient: "from-yellow-500 to-yellow-700",
    },

    // ── Heartland Freight Holdings (svc-008) — operational users ────────────
    {
        id: "u-029",
        name: "Kayla Bennett",
        email: "kayla.b@heartlandtrucking.com",
        role: "user",
        accountId: "acct-012",
        accountName: "Heartland Trucking Partners",
        serviceProfileId: "svc-008",
        status: "Active",
        title: "Dispatcher",
        initials: "KB",
        avatarGradient: "from-indigo-500 to-indigo-700",
    },
    {
        id: "u-030",
        name: "Caleb Reed",
        email: "caleb.r@gatewaycarriers.com",
        role: "user",
        accountId: "acct-023",
        accountName: "Gateway Carriers LLC",
        serviceProfileId: "svc-008",
        status: "Active",
        title: "Maintenance Coordinator",
        initials: "CR",
        avatarGradient: "from-violet-500 to-violet-700",
    },

    // ── Bayview Express Partners (svc-009) — operational user ───────────────
    {
        id: "u-031",
        name: "Wesley Tan",
        email: "wesley.t@bayarealogistics.com",
        role: "user",
        accountId: "acct-013",
        accountName: "Bay Area Logistics Inc.",
        serviceProfileId: "svc-009",
        status: "Active",
        title: "Dispatcher",
        initials: "WT",
        avatarGradient: "from-yellow-500 to-yellow-700",
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
    // Both admins and regular users may belong to multiple carriers via the
    // managedAccountIds list. Fall back to the legacy single accountId field.
    if (u.managedAccountIds && u.managedAccountIds.length > 0) return u.managedAccountIds;
    return u.accountId ? [u.accountId] : [];
}

/**
 * Returns the list of users the given currentUser is allowed to see on the
 * Users admin page. A user is visible if any of the carriers they belong to
 * overlaps with the current user's managed carriers.
 */
export function getVisibleUsers(currentUser: AppUser): AppUser[] {
    if (currentUser.role === "super-admin") return APP_USERS;
    const managed = getManagedAccountIds(currentUser) ?? [];
    return APP_USERS.filter((u) => {
        if (u.role === "super-admin") return false;
        const userCarriers = getManagedAccountIds(u) ?? [];
        return userCarriers.some((id) => managed.includes(id));
    });
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

/**
 * Account-creation limit for the user. Returns:
 *   - Infinity for super admins (no limit, no service profile)
 *   - Infinity for admins whose service profile is unlimited or unset
 *   - The remaining count for admins whose service profile has a custom limit
 *   - 0 for users with no creation rights
 */
export function getRemainingAccountSlotsForUser(
    user: AppUser,
    serviceProfilesDb: { id: string; accountLimit: number; accountsCreated: number }[],
): number {
    if (user.role === "super-admin") return Infinity;
    if (user.role !== "admin") return 0;
    if (!user.serviceProfileId) return Infinity; // legacy admin, treat as unlimited
    const sp = serviceProfilesDb.find((s) => s.id === user.serviceProfileId);
    if (!sp) return Infinity;
    if (sp.accountLimit < 0) return Infinity; // unlimited
    return Math.max(0, sp.accountLimit - sp.accountsCreated);
}

export function canCreateAnotherAccount(
    user: AppUser,
    serviceProfilesDb: { id: string; accountLimit: number; accountsCreated: number }[],
): boolean {
    return getRemainingAccountSlotsForUser(user, serviceProfilesDb) > 0;
}
