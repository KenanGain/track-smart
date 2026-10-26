import { useEffect, useState, useSyncExternalStore } from "react";
import { APP_USERS, subscribeUsers, updateAppUser, usersSnapshot, type AppUser, type UserRole } from "@/data/users.data";
import { ACCOUNTS_DB, ACCOUNTS_CHANGED_EVENT, getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { SERVICE_PROFILES_DB, isUnlimitedLimit, type ServiceProfile } from "@/pages/accounts/service-profiles.data";

// Who sits where, and who may change it — the rules Settings ▸ Users & Roles applies.

/** The carriers a user has access to. Admins reach every carrier of their service profile. */
export const carriersOf = (u: AppUser): string[] =>
    u.managedAccountIds?.length ? u.managedAccountIds : u.accountId ? [u.accountId] : [];

/**
 * Set which of `scope`'s carriers a person works on, and as what: `entries` maps carrier id →
 * role for the ones they keep; a scope carrier missing from it is taken away. Carriers outside
 * the scope (another service profile) are left exactly as they were. The person's `role`
 * follows their primary carrier, so the rest of the app keeps reading one role.
 */
export function setCarrierRoles(user: AppUser, scope: AccountRecord[], entries: Record<string, UserRole>): void {
    const scopeIds = scope.map((c) => c.id);
    const here = scopeIds.filter((id) => entries[id]);
    const elsewhere = carriersOf(user).filter((id) => !scopeIds.includes(id));
    const carrierRoles: Record<string, UserRole> = { ...(user.carrierRoles ?? {}) };
    for (const id of scopeIds) { if (entries[id]) carrierRoles[id] = entries[id]; else delete carrierRoles[id]; }
    const kept = [...here, ...elsewhere];
    // The primary carrier stays what it was while they still hold it — being given one more
    // carrier must not quietly move where they sign in to and what `role` reads as.
    const primary = user.accountId && kept.includes(user.accountId) ? user.accountId : kept[0];
    const role: UserRole = user.role === "admin" || user.role === "super-admin" ? user.role
        : primary ? (carrierRoles[primary] ?? user.role) : user.role;
    updateAppUser(user.id, {
        managedAccountIds: kept, accountId: primary,
        accountName: primary ? getAccountById(primary)?.legalName : undefined, carrierRoles, role,
    });
}

/** The service profiles a user belongs to. */
export const profilesOfUser = (u: AppUser): string[] =>
    [...new Set([u.serviceProfileId, ...(u.serviceProfileIds ?? [])].filter(Boolean) as string[])];

/**
 * May this person be re-scoped to this carrier — switch the top bar to it, open its profile?
 * A Super Admin anywhere; an Admin on any carrier of their service profile; a carrier role
 * only on the carriers they were given. Pages that list a whole profile's carriers ask this
 * before handing one to the app, and the app asks it again before accepting.
 */
export function canOpenCarrier(me: AppUser | null | undefined, carrier: AccountRecord): boolean {
    if (!me) return false;
    if (me.role === "super-admin") return true;
    if (carriersOf(me).includes(carrier.id)) return true;
    return me.role === "admin" && !!carrier.serviceProfileId && profilesOfUser(me).includes(carrier.serviceProfileId);
}

/** Service profiles the signed-in user can open here. Super Admin: all of them. */
export function profilesFor(me: AppUser | null): ServiceProfile[] {
    if (!me || me.role === "super-admin") return SERVICE_PROFILES_DB;
    const ids = profilesOfUser(me);
    return SERVICE_PROFILES_DB.filter((p) => ids.includes(p.id));
}

/** Super Admin anywhere; an Admin in their own service profile; nobody else. */
export function canManageProfile(me: AppUser | null, spId: string): boolean {
    if (!me) return false;
    if (me.role === "super-admin") return true;
    return me.role === "admin" && profilesOfUser(me).includes(spId);
}

export const carriersOfProfile = (spId: string): AccountRecord[] =>
    ACCOUNTS_DB.filter((a) => a.serviceProfileId === spId);

/** Everyone under a service profile — its Admins and every carrier's team. Super Admins sit above it. */
export function usersOfProfile(spId: string): AppUser[] {
    const carrierIds = new Set(carriersOfProfile(spId).map((a) => a.id));
    return APP_USERS.filter((u) => u.role !== "super-admin"
        && (profilesOfUser(u).includes(spId) || carriersOf(u).some((id) => carrierIds.has(id))));
}

/** Carrier profiles used against the profile's limit, and how many are left (Infinity = unlimited). */
export function carrierSlots(sp: ServiceProfile): { used: number; remaining: number } {
    const used = Math.max(sp.accountsCreated, carriersOfProfile(sp.id).length);
    return { used, remaining: isUnlimitedLimit(sp.accountLimit) ? Infinity : Math.max(0, sp.accountLimit - used) };
}

/** Re-render when users or carriers change. Returns a number that moves with both. */
export function useDirectoryVersion(): number {
    const users = useSyncExternalStore(subscribeUsers, usersSnapshot, usersSnapshot);
    const [accounts, setAccounts] = useState(0);
    useEffect(() => {
        const on = () => setAccounts((n) => n + 1);
        window.addEventListener(ACCOUNTS_CHANGED_EVENT, on);
        return () => window.removeEventListener(ACCOUNTS_CHANGED_EVENT, on);
    }, []);
    return users * 1000 + accounts;
}

export const AVATAR_GRADIENTS = [
    "from-blue-500 to-blue-700", "from-emerald-500 to-emerald-700", "from-amber-500 to-amber-700",
    "from-rose-500 to-rose-700", "from-violet-500 to-violet-700", "from-sky-500 to-sky-700",
    "from-teal-500 to-teal-700", "from-indigo-500 to-indigo-700",
];
export const gradientFor = (seed: string): string => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
};
