import type { AppUser, UserRole } from "@/data/users.data";
import { CARRIER_DRIVERS } from "@/pages/accounts/carrier-drivers.data";

// ─────────────────────────────────────────────────────────────────────────────
// Role test accounts — one login per thing the roles system has to get right.
//
// Everything is under the TrackSmart service profile (svc-001) and its three carriers, so
// one Admin (John Doe) can be watched giving all of it out:
//
//     acct-001  Acme Trucking Inc.          (DBA Acme Logistics)
//     acct-005  Great Lakes Carrier Group   (DBA GLCG)
//     acct-008  Lone Star Freightways LLC   (DBA Lone Star) — no Fleet Admin, on purpose
//
// The people added here fill the gaps in the seed roster: somebody with a different role on
// each carrier, a Safety Manager on two carriers, an invitation not yet accepted, a
// deactivated login and a driver on a second carrier. The rest of the matrix below points at
// people the seed already has. The Login page's "Sign in as a role" panel and Admin ▸ Roles ▸
// Test accounts both read `ROLE_TEST_ACCOUNTS`, so the expectations written here are the
// ones on screen.
//
// Only `type` imports from users.data — that file imports this one.
// ─────────────────────────────────────────────────────────────────────────────

const TRACKSMART = "svc-001";
const ACME = { id: "acct-001", name: "Acme Trucking Inc." };
const GLCG = { id: "acct-005", name: "Great Lakes Carrier Group" };
const LONE_STAR = { id: "acct-008", name: "Lone Star Freightways LLC" };

type RosterDriver = { id: string; name: string; email?: string; status?: string; driverType?: string };

/** A driver login for the first active driver on a carrier's roster — same id scheme as the Acme logins. */
function driverLoginOn(carrier: { id: string; name: string }, gradient: string): AppUser | null {
    const d = ((CARRIER_DRIVERS[carrier.id] ?? []) as RosterDriver[]).find((x) => x.status === "Active");
    if (!d) return null;
    const parts = d.name.trim().split(/\s+/).filter(Boolean);
    return {
        id: `u-drv-${d.id}`,
        name: d.name,
        email: d.email ?? `${d.name.toLowerCase().replace(/\s+/g, ".")}@${carrier.id}.example.com`,
        role: "driver",
        accountId: carrier.id,
        accountName: carrier.name,
        carrierRoles: { [carrier.id]: "driver" },
        serviceProfileId: TRACKSMART,
        status: "Active",
        title: d.driverType || "Driver",
        initials: ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "DR",
        avatarGradient: gradient,
    };
}

const GLCG_DRIVER = driverLoginOn(GLCG, "from-lime-500 to-lime-700");
/** The first Acme driver login (built in users.data from the same roster), for the matrix. */
const ACME_DRIVER_ID = (() => {
    const d = ((CARRIER_DRIVERS[ACME.id] ?? []) as RosterDriver[]).find((x) => x.status === "Active");
    return d ? `u-drv-${d.id}` : undefined;
})();

/** The logins this file adds to the seed roster. */
export const ROLE_TEST_USERS: AppUser[] = [
    {
        // Carrier roles are per carrier: leads one, works on another.
        id: "u-t01",
        name: "Anika Rao",
        email: "anika.r@acmetrucking.com",
        role: "fleet-admin",
        accountId: ACME.id,
        accountName: ACME.name,
        managedAccountIds: [ACME.id, GLCG.id],
        carrierRoles: { [ACME.id]: "fleet-admin", [GLCG.id]: "user" },
        serviceProfileId: TRACKSMART,
        status: "Active",
        phone: "(312) 555-0144",
        title: "Fleet Manager",
        initials: "AR",
        avatarGradient: "from-fuchsia-500 to-fuchsia-700",
    },
    {
        // The same role on two carriers — the carrier switcher, not the role, is what changes.
        id: "u-t02",
        name: "Omar Haddad",
        email: "omar.h@greatlakescarrier.com",
        role: "safety-manager",
        accountId: GLCG.id,
        accountName: GLCG.name,
        managedAccountIds: [GLCG.id, LONE_STAR.id],
        carrierRoles: { [GLCG.id]: "safety-manager", [LONE_STAR.id]: "safety-manager" },
        serviceProfileId: TRACKSMART,
        status: "Active",
        phone: "(216) 555-0188",
        title: "Regional Safety Manager",
        initials: "OH",
        avatarGradient: "from-amber-500 to-amber-700",
    },
    {
        // Added and invited, not signed in yet — the first sign-in makes them Active.
        id: "u-t03",
        name: "Noah Bright",
        email: "noah.b@lonestarfreight.com",
        role: "user",
        accountId: LONE_STAR.id,
        accountName: LONE_STAR.name,
        carrierRoles: { [LONE_STAR.id]: "user" },
        serviceProfileId: TRACKSMART,
        status: "Invited",
        title: "Dispatcher",
        initials: "NB",
        avatarGradient: "from-teal-500 to-teal-700",
    },
    {
        // Deactivated — stays in the directory, cannot sign in.
        id: "u-t04",
        name: "Dana Whitfield",
        email: "dana.w@acmetrucking.com",
        role: "safety-manager",
        accountId: ACME.id,
        accountName: ACME.name,
        carrierRoles: { [ACME.id]: "safety-manager" },
        serviceProfileId: TRACKSMART,
        status: "Inactive",
        title: "Safety Manager (left the company)",
        initials: "DW",
        avatarGradient: "from-slate-500 to-slate-700",
    },
    ...(GLCG_DRIVER ? [GLCG_DRIVER] : []),
];

export interface RoleTestAccount {
    /** The login — in the seed roster or in `ROLE_TEST_USERS`. */
    userId: string;
    /** What this login is for testing. */
    scenario: string;
    /** Where they sit, in words. */
    where: string;
    /** What the sidebar and top bar should look like after signing in. */
    menus: string;
    /** What data is in reach — carriers, service profiles. */
    data: string;
    /** What the bell should show, and why. */
    alerts: string;
}

/** The test matrix — one row per role and per access shape, highest role first. */
export const ROLE_TEST_ACCOUNTS: RoleTestAccount[] = [
    {
        userId: "u-001",
        scenario: "Super Admin — all access",
        where: "TrackSmart · every service profile and carrier",
        menus: "Every menu, Super Admin group included. The only role that can edit the Sidebar menus by role table.",
        data: "Carrier switcher lists all carriers; Service Profile switcher lists all profiles; every Users & Roles page is editable.",
        alerts: "Only alerts that name them. Being Super Admin puts them on no notification role — unless a carrier has nobody owner-titled, in which case its seeded Admin role falls back to a Super Admin.",
    },
    {
        userId: "u-004",
        scenario: "Admin of a service profile",
        where: "TrackSmart (svc-001) · Acme, GLCG and Lone Star",
        menus: "All office menus plus Service Profile and Admin; no Super Admin group. Service Profile ▸ Users & Roles is editable.",
        data: "Carrier switcher: the three TrackSmart carriers only. Can create carrier profiles, add users and give out carrier roles.",
        alerts: "Admin / Manager notification roles on Acme (seeded from the title 'Owner / General Manager') — the overdue escalations.",
    },
    {
        userId: "u-008",
        scenario: "Admin of another service profile",
        where: "Cascade Holdings (svc-003) · Cascade Freight",
        menus: "Same menus as an Admin.",
        data: "Sees Cascade only — none of TrackSmart's carriers, users or alerts.",
        alerts: "Cascade's alerts only.",
    },
    {
        userId: "u-032",
        scenario: "Fleet Admin on one carrier",
        where: "Acme",
        menus: "Office menus and Settings in full; Service Profile is view-only (eye icon); no Admin.",
        data: "One carrier — the top bar shows it as a label, no switcher. Decides who gets Acme's alerts in Settings ▸ Users & Roles.",
        alerts: "The notification roles they are on — none seeded, add them under Settings ▸ Users & Roles ▸ Monitoring alerts.",
    },
    {
        userId: "u-t01",
        scenario: "Fleet Admin here, User there",
        where: "Acme (Fleet Admin) · GLCG (User)",
        menus: "Switch carrier in the top bar: the role under the name, the sidebar and the Settings page all follow the carrier.",
        data: "Two carriers in the switcher — Fleet Admin menus on Acme, User menus on GLCG.",
        alerts: "Per carrier — whichever roles they are put on at each.",
    },
    {
        userId: "u-006",
        scenario: "Safety Manager",
        where: "Acme",
        menus: "Compliance and safety menus in full; Account, Inventory, Maintenance, Fuel and Settings view-only; no Service Profile or Admin.",
        data: "Acme only.",
        alerts: "Drivers Manager role on Acme (seeded from the title) — every driver record alert, once its reminder has fired.",
    },
    {
        userId: "u-t02",
        scenario: "Safety Manager on two carriers",
        where: "GLCG · Lone Star",
        menus: "Safety Manager menus on both.",
        data: "Two carriers in the switcher; the bell groups alerts by carrier.",
        alerts: "Per carrier — put them on a role at each carrier to see both groups.",
    },
    {
        userId: "u-005",
        scenario: "User — day-to-day office work",
        where: "Acme",
        menus: "Dashboard, Messages, Inventory, Maintenance, Fuel in full; compliance and safety menus view-only; no Settings, Service Profile or Admin.",
        data: "Acme only. A hidden page opened by link shows 'Not in your menu'.",
        alerts: "None until put on a notification role.",
    },
    {
        userId: "u-019",
        scenario: "User on two carriers",
        where: "GLCG · Lone Star",
        menus: "User menus.",
        data: "Two carriers in the switcher; never Acme.",
        alerts: "Per carrier.",
    },
    ...(ACME_DRIVER_ID ? [{
        userId: ACME_DRIVER_ID,
        scenario: "Driver — the mobile app",
        where: "Acme roster",
        menus: "Driver Mobile App, Messages and Apply for Carrier only; every other path lands back in the app.",
        data: "Their own documents, hours and chat.",
        alerts: "Alerts naming them as a driver, and anything sent to them in chat (collections, requests).",
    }] : []),
    ...(GLCG_DRIVER ? [{
        userId: GLCG_DRIVER.id,
        scenario: "Driver on another carrier",
        where: "GLCG roster",
        menus: "The same driver seat, on GLCG.",
        data: "GLCG's chat and documents.",
        alerts: "GLCG alerts naming them.",
    }] : []),
    {
        userId: "u-t03",
        scenario: "Invited — not signed in yet",
        where: "Lone Star",
        menus: "Signs in like anyone; the first sign-in flips Invited to Active on every Users & Roles page.",
        data: "Lone Star only.",
        alerts: "None yet.",
    },
    {
        userId: "u-t04",
        scenario: "Deactivated",
        where: "Acme",
        menus: "Cannot sign in — the login page says the account is deactivated. Reactivate from Users & Roles.",
        data: "—",
        alerts: "—",
    },
];

/** Rows of the matrix for one role, in matrix order. */
export const testAccountsForRole = (users: AppUser[], role: UserRole): RoleTestAccount[] =>
    ROLE_TEST_ACCOUNTS.filter((t) => users.find((u) => u.id === t.userId)?.role === role);
