// Centralized user roster. Used by the login page (quick-login dropdown) and
// by the app for role-based sidebar filtering and navbar identity.

import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";
import { INDEPENDENT_DRIVERS } from "@/data/independent-drivers.data";

/**
 * Six roles on three levels.
 *
 *   Platform         super-admin       — TrackSmart itself: every service profile, every carrier.
 *   Service profile  admin             — runs one service profile: creates its carrier profiles,
 *                                        adds users to it or to its carriers, hands out the
 *                                        carrier roles below.
 *   Carrier profile  fleet-admin · safety-manager · driver · user
 *
 * A driver login is always a driver on a carrier's roster (see `isDriverUser`), so `driver` is
 * never given to an office account and an office role is never given to a driver.
 */
export type UserRole = "super-admin" | "admin" | "fleet-admin" | "safety-manager" | "driver" | "user";

export type RoleLevel = "platform" | "service" | "carrier";

export const ROLE_LEVEL: Record<UserRole, RoleLevel> = {
    "super-admin": "platform",
    "admin": "service",
    "fleet-admin": "carrier",
    "safety-manager": "carrier",
    "driver": "carrier",
    "user": "carrier",
};

/** The roles a service-profile admin hands out on a carrier — office seats first, the driver seat last. */
export const CARRIER_ROLES: UserRole[] = ["fleet-admin", "safety-manager", "user", "driver"];

/** Every role, highest first — the order lists sort by. */
export const ROLE_ORDER: UserRole[] = ["super-admin", "admin", "fleet-admin", "safety-manager", "user", "driver"];

export const roleRank = (r: UserRole): number => ROLE_ORDER.indexOf(r);

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
    /** Invited = added and sent an invitation, not signed in yet. */
    status: "Active" | "Inactive" | "Invited";
    phone?: string;
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
        id: "u-003",
        name: "Acme Demo Admin",
        email: "demo@acmetrucking.com",
        role: "admin",
        accountId: "acct-001",
        accountName: "Acme Trucking Inc.",
        managedAccountIds: ["acct-001"],
        serviceProfileId: "svc-001",
        status: "Active",
        title: "Demo Admin (testing the Safety & Compliance page)",
        initials: "AD",
        avatarGradient: "from-blue-500 to-indigo-700",
    },
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
        role: "safety-manager",
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
        role: "safety-manager",
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
        role: "safety-manager",
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
        role: "safety-manager",
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
        role: "safety-manager",
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

    // ── Fleet Admins — the carrier-level lead, given the role by their service-profile admin.
    // Lone Star (acct-008) is left without one on purpose: a carrier with nobody in charge
    // is what Settings ▸ Users & Roles flags.
    {
        id: "u-032",
        name: "Grace Holloway",
        email: "grace.h@acmetrucking.com",
        role: "fleet-admin",
        accountId: "acct-001",
        accountName: "Acme Trucking Inc.",
        serviceProfileId: "svc-001",
        status: "Active",
        title: "Fleet Manager",
        initials: "GH",
        avatarGradient: "from-sky-500 to-sky-700",
    },
    {
        id: "u-033",
        name: "Imani Carter",
        email: "imani.c@greatlakescarrier.com",
        role: "fleet-admin",
        accountId: "acct-005",
        accountName: "Great Lakes Carrier Group",
        serviceProfileId: "svc-001",
        status: "Active",
        title: "Fleet Operations Manager",
        initials: "IC",
        avatarGradient: "from-emerald-500 to-emerald-700",
    },
    {
        id: "u-034",
        name: "Nathan Cole",
        email: "nathan.c@cascadefreight.com",
        role: "fleet-admin",
        accountId: "acct-002",
        accountName: "Cascade Freight Systems LLC",
        serviceProfileId: "svc-003",
        status: "Active",
        title: "Fleet Manager",
        initials: "NC",
        avatarGradient: "from-indigo-500 to-indigo-700",
    },
];

// ── Drivers, as accounts ────────────────────────────────────────────────────
//
// A driver was a record the office looked at, never somebody who could be signed in as —
// which was fine while everything a driver did happened on paper. It stopped being fine the
// moment the app started sending them things to answer: a collection to confirm, a receipt
// to sign. There was no way to stand where they stand and check what actually arrives.
//
// Derived from the carrier's own roster rather than typed out, because a hard-coded
// "Elizabeth Cook" would be a second Elizabeth Cook: the roster is generated, so a name
// written down here is right until the seed changes and then it is a login that matches
// nobody. Same id, same name, same email as the driver record, every time.
//
// Acme only, and only active drivers. Every carrier's roster would put three hundred names
// in a demo login list, and the point is to be able to test the driver half, not to model
// a workforce.
const DRIVER_LOGIN_CARRIER = "acct-001";

const driverUsers = (): AppUser[] => {
    const roster = (CARRIER_DRIVERS[DRIVER_LOGIN_CARRIER] ?? []) as { id: string; name: string; email?: string; status?: string; driverType?: string }[];
    const GRADIENTS = [
        "from-cyan-500 to-cyan-700", "from-rose-500 to-rose-700", "from-lime-500 to-lime-700",
        "from-orange-500 to-orange-700", "from-indigo-500 to-indigo-700",
    ];
    return roster
        .filter((d) => d.status === "Active")
        .map((d, i) => {
            const parts = d.name.trim().split(/\s+/).filter(Boolean);
            return {
                // Namespaced off the driver id so it cannot collide with a u-0NN, and so the
                // same driver is the same login across reloads.
                id: `u-drv-${d.id}`,
                name: d.name,
                email: d.email ?? `${d.name.toLowerCase().replace(/\s+/g, ".")}@acmelogistics.com`,
                role: "driver" as const,
                accountId: DRIVER_LOGIN_CARRIER,
                accountName: "Acme Trucking Inc.",
                serviceProfileId: "svc-001",
                status: "Active" as const,
                title: d.driverType || "Driver",
                initials: ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR",
                avatarGradient: GRADIENTS[i % GRADIENTS.length],
            };
        });
};

/** Every driver on the Acme roster, as a signed-in-able account. */
export const DRIVER_USERS: AppUser[] = driverUsers();
APP_USERS.push(...DRIVER_USERS);

/*
 * Drivers who belong to no carrier.
 *
 * Built the same way as the roster logins so the driver seat treats them identically — same
 * `u-drv-` namespace, so `isDriverUser` and `driverIdOfUser` need no special case — but with
 * no `accountId`, no `accountName` and no `serviceProfileId`, because there is no carrier and
 * no service organisation behind them. `getDefaultCarrierForUser` returns null for an account
 * like this, which is correct: there is no carrier to default to.
 */
export const INDEPENDENT_DRIVER_USERS: AppUser[] = INDEPENDENT_DRIVERS.map((d, i) => {
    const parts = d.name.trim().split(/\s+/).filter(Boolean);
    return {
        id: `u-drv-${d.id}`,
        name: d.name,
        email: d.email ?? `${d.name.toLowerCase().replace(/\s+/g, ".")}@driver.example.com`,
        role: "driver" as const,
        status: "Active" as const,
        title: d.driverType || "Driver",
        initials: ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR",
        avatarGradient: ["from-teal-500 to-teal-700", "from-amber-500 to-amber-700"][i % 2],
    };
});
APP_USERS.push(...INDEPENDENT_DRIVER_USERS);

// ── What Settings ▸ Users & Roles has changed ─────────────────────────────────
//
// The roster above is the seed; people added, re-roled, moved between carriers or removed
// are kept on top of it in localStorage and replayed into APP_USERS here, at load — before
// the login page or App.tsx ever look somebody up, so an invited user can sign in after a
// reload and a removed one cannot. APP_USERS is mutated in place because everything reads
// it directly; the event tells the screens that hold a copy.

const USER_STORE_KEY = "app-users-store-v1";
export const USERS_CHANGED_EVENT = "app-users-changed";

type UserStore = { added: AppUser[]; patches: Record<string, Partial<AppUser>>; removed: string[] };

function readUserStore(): UserStore {
    try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem(USER_STORE_KEY) : null;
        const s = raw ? JSON.parse(raw) as Partial<UserStore> : {};
        return { added: s.added ?? [], patches: s.patches ?? {}, removed: s.removed ?? [] };
    } catch { return { added: [], patches: {}, removed: [] }; }
}

let usersVersion = 0;
function writeUserStore(s: UserStore) {
    try { localStorage.setItem(USER_STORE_KEY, JSON.stringify(s)); } catch { /* private window */ }
    usersVersion++;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(USERS_CHANGED_EVENT));
}

(function replayUserStore() {
    const s = readUserStore();
    for (const u of s.added) if (!APP_USERS.some((x) => x.id === u.id)) APP_USERS.push(u);
    for (const [id, p] of Object.entries(s.patches)) {
        const u = APP_USERS.find((x) => x.id === id);
        if (u) Object.assign(u, p);
    }
    for (const id of s.removed) {
        const i = APP_USERS.findIndex((x) => x.id === id);
        if (i >= 0) APP_USERS.splice(i, 1);
    }
})();

/** Add a user (or a driver login). Ids must be new — use `newUserId`. */
export function addAppUser(u: AppUser): void {
    const s = readUserStore();
    s.added = [...s.added.filter((x) => x.id !== u.id), u];
    s.removed = s.removed.filter((id) => id !== u.id);
    if (!APP_USERS.some((x) => x.id === u.id)) APP_USERS.push(u);
    writeUserStore(s);
}

/** Change a user — role, carriers, details, status. */
export function updateAppUser(id: string, patch: Partial<AppUser>): void {
    const s = readUserStore();
    const added = s.added.find((x) => x.id === id);
    if (added) Object.assign(added, patch);
    else s.patches[id] = { ...(s.patches[id] ?? {}), ...patch };
    const live = APP_USERS.find((x) => x.id === id);
    if (live) Object.assign(live, patch);
    writeUserStore(s);
}

/** Take a user off the platform. A driver's roster record is untouched — only the login goes. */
export function removeAppUser(id: string): void {
    const s = readUserStore();
    if (s.added.some((x) => x.id === id)) s.added = s.added.filter((x) => x.id !== id);
    else if (!s.removed.includes(id)) s.removed.push(id);
    delete s.patches[id];
    const i = APP_USERS.findIndex((x) => x.id === id);
    if (i >= 0) APP_USERS.splice(i, 1);
    writeUserStore(s);
}

export const newUserId = (): string => `u-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function subscribeUsers(cb: () => void): () => void {
    window.addEventListener(USERS_CHANGED_EVENT, cb);
    return () => window.removeEventListener(USERS_CHANGED_EVENT, cb);
}
export const usersSnapshot = (): number => usersVersion;

/** A user's initials from their name, for an avatar. */
export const initialsOf = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
};

/** A driver login with no carrier behind it. */
export const isIndependentDriverUser = (u: AppUser | undefined): boolean =>
    isDriverUser(u) && !u!.accountId;

/** Is this account one of the roster drivers, rather than an office user? */
export const isDriverUser = (u: AppUser | undefined): boolean => !!u && u.id.startsWith("u-drv-");

/** The driver record behind a driver login, for the surfaces that are about that driver. */
export const driverIdOfUser = (u: AppUser | undefined): string | undefined =>
    isDriverUser(u) ? u!.id.slice("u-drv-".length) : undefined;

export const ROLE_LABELS: Record<UserRole, string> = {
    "super-admin": "Super Admin",
    "admin": "Admin",
    "fleet-admin": "Fleet Admin",
    "safety-manager": "Safety Manager",
    "driver": "Driver",
    "user": "User",
};

export const ROLE_BADGE: Record<UserRole, string> = {
    "super-admin": "bg-violet-50 text-violet-700 border-violet-200",
    "admin": "bg-blue-50 text-blue-700 border-blue-200",
    "fleet-admin": "bg-sky-50 text-sky-700 border-sky-200",
    "safety-manager": "bg-amber-50 text-amber-700 border-amber-200",
    "driver": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "user": "bg-slate-50 text-slate-700 border-slate-200",
};

export function findUserById(id: string): AppUser | undefined {
    return APP_USERS.find((u) => u.id === id);
}

/**
 * Who is signed in, read from where App.tsx puts it.
 *
 * Anything that stamps an action with an author needs this, and the one-liner had been
 * copied into three files before it was written down anywhere. Wrapped in try/catch because
 * localStorage throws in a private window rather than returning null.
 */
export const CURRENT_USER_KEY = "app_current_user_id";

export function currentUser(): AppUser | undefined {
    try {
        const id = localStorage.getItem(CURRENT_USER_KEY);
        return id ? findUserById(id) : undefined;
    } catch { return undefined; }
}

/** The signed-in user's display name, or "You" when nobody is. */
export function currentUserName(): string {
    return currentUser()?.name || "You";
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
