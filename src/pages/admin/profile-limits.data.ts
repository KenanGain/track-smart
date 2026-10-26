import { useSyncExternalStore } from "react";
import { APP_USERS, OFFICE_ROLES, isDriverUser, roleOn, type AppUser } from "@/data/users.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { ACCOUNT_LIMIT_UNLIMITED, SERVICE_PROFILES_DB, isUnlimitedLimit } from "@/pages/accounts/service-profiles.data";
import { carriersOf, carriersOfProfile, usersOfProfile } from "@/pages/users-roles/scope";

// How much a service profile and a carrier profile may grow — the Super Admin's two
// configuration pages read and write these.
//
//   Service profile: how many carrier profiles it can create, how many users it can add.
//   Carrier profile: how many users it can add.
//
// "Users" are office logins — Admins, Fleet Admins, Safety Managers, Users. Driver logins are
// not counted: a driver login belongs to somebody already on a roster, and the roster is
// where drivers are limited.
//
// The carrier limit is the service profile's existing `accountLimit`, not a second number:
// Add Carrier and the Users & Roles carrier dialog already stop at it, and two limits that
// could disagree would leave nobody sure which one bites. Saving here writes it back onto
// the profile record in place, and the store replays it at load.

export const LIMIT_UNLIMITED = ACCOUNT_LIMIT_UNLIMITED;

type ServiceLimits = { carrierLimit: number; userLimit: number };
type CarrierLimits = { userLimit: number };
type LimitStore = { services: Record<string, Partial<ServiceLimits>>; carriers: Record<string, Partial<CarrierLimits>> };

const STORE_KEY = "app-profile-limits-v1";
const CHANGED_EVENT = "app-profile-limits-changed";

/** A profile or carrier nobody has set a user limit for yet. */
const DEFAULT_SERVICE_USERS = 50;
const DEFAULT_CARRIER_USERS = 10;

function readStore(): LimitStore | null {
    try {
        const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORE_KEY) : null;
        return raw ? (JSON.parse(raw) as LimitStore) : null;
    } catch { return null; }
}

let version = 0;
function writeStore(s: LimitStore) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* private window */ }
    version++;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(CHANGED_EVENT));
}

// ── Who is counted ──────────────────────────────────────────────────────────

const isOfficeLogin = (u: AppUser) => u.role !== "super-admin" && !isDriverUser(u);

/** Office logins under a service profile — its Admins plus every carrier's office team. */
export const serviceUsers = (spId: string): AppUser[] => usersOfProfile(spId).filter(isOfficeLogin);

/** Office logins on one carrier — the people holding an office role on it. Admins sit above. */
export const carrierUsers = (carrierId: string): AppUser[] =>
    APP_USERS.filter((u) => isOfficeLogin(u) && u.role !== "admin"
        && carriersOf(u).includes(carrierId) && OFFICE_ROLES.includes(roleOn(u, carrierId)));

// ── Seed ────────────────────────────────────────────────────────────────────

/** Never below what is already there — a seed that starts a profile over its limit is a bug report. */
const roomFor = (used: number, base: number) => Math.max(base, Math.ceil((used + 1) / 5) * 5);

// The first load writes the seed down, so a limit stays put as users are added afterwards
// instead of growing to fit them.
const store: LimitStore = readStore() ?? (() => {
    const s: LimitStore = { services: {}, carriers: {} };
    for (const sp of SERVICE_PROFILES_DB) s.services[sp.id] = { userLimit: roomFor(serviceUsers(sp.id).length, DEFAULT_SERVICE_USERS) };
    for (const c of ACCOUNTS_DB) s.carriers[c.id] = { userLimit: roomFor(carrierUsers(c.id).length, DEFAULT_CARRIER_USERS) };
    writeStore(s);
    return s;
})();

// Carrier limits saved earlier go back onto the profile records everything else reads.
for (const [id, l] of Object.entries(store.services)) {
    const sp = SERVICE_PROFILES_DB.find((p) => p.id === id);
    if (sp && l.carrierLimit !== undefined) sp.accountLimit = l.carrierLimit;
}

// ── Read ────────────────────────────────────────────────────────────────────

export type Usage = { used: number; limit: number; remaining: number };

const usage = (used: number, limit: number): Usage =>
    ({ used, limit, remaining: isUnlimitedLimit(limit) ? Infinity : Math.max(0, limit - used) });

export function serviceLimits(spId: string): { carriers: Usage; users: Usage } {
    const sp = SERVICE_PROFILES_DB.find((p) => p.id === spId);
    const carrierLimit = sp?.accountLimit ?? LIMIT_UNLIMITED;
    const carriersUsed = Math.max(sp?.accountsCreated ?? 0, carriersOfProfile(spId).length);
    return {
        carriers: usage(carriersUsed, carrierLimit),
        users: usage(serviceUsers(spId).length, store.services[spId]?.userLimit ?? DEFAULT_SERVICE_USERS),
    };
}

export function carrierLimits(carrierId: string): { users: Usage } {
    return { users: usage(carrierUsers(carrierId).length, store.carriers[carrierId]?.userLimit ?? DEFAULT_CARRIER_USERS) };
}

// ── Write ───────────────────────────────────────────────────────────────────

export function setServiceLimits(spId: string, next: ServiceLimits): void {
    store.services[spId] = { ...store.services[spId], ...next };
    const sp = SERVICE_PROFILES_DB.find((p) => p.id === spId);
    if (sp) sp.accountLimit = next.carrierLimit;
    writeStore(store);
}

export function setCarrierLimits(carrierId: string, next: CarrierLimits): void {
    store.carriers[carrierId] = { ...store.carriers[carrierId], ...next };
    writeStore(store);
}

/** Re-render when a limit changes. */
export function useLimitsVersion(): number {
    return useSyncExternalStore(
        (cb) => { window.addEventListener(CHANGED_EVENT, cb); return () => window.removeEventListener(CHANGED_EVENT, cb); },
        () => version, () => version,
    );
}
