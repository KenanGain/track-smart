import { useEffect, useMemo, useState } from "react";
import { APP_USERS, ROLE_LABELS, currentUser, type AppUser, type UserRole } from "@/data/users.data";
import { ACCOUNTS_DB, getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { SERVICE_PROFILES_DB } from "@/pages/accounts/service-profiles.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { getAssetsForAccount } from "@/pages/accounts/carrier-assets.data";
import { carriersOf, profilesOfUser } from "@/pages/users-roles/scope";
import type { ActivityKind } from "@/components/ui/activity-kinds";

// ─────────────────────────────────────────────────────────────────────────────
// Audit log — who did what, where, when.
//
// Three readers, three scopes. A carrier's Admin sees what happened on that carrier; a
// service profile's Admin sees every carrier under the profile plus the profile's own
// events (a carrier created, a user invited, a limit changed); a Super Admin sees the
// platform — all of that, plus what only a Super Admin does (the menu table, service
// profiles). One store serves all three: an event carries the carrier and the service
// profile it belongs to, and a scope is a filter over those.
//
// Events come from two places. The app logs what it actually does (`logAudit`, and the
// user-store mutation events users.data raises so this module can listen without being
// imported there). And because a prototype starts empty, every carrier and profile also
// gets a deterministic seeded history for the last six weeks, built from its own people and
// records, so the log reads like a running system from the first open.
// ─────────────────────────────────────────────────────────────────────────────

export type AuditCategory = "users" | "compliance" | "monitoring" | "fleet" | "settings" | "auth";

export const AUDIT_CATEGORY_META: Record<AuditCategory, { label: string; hint: string }> = {
    users: { label: "Users & roles", hint: "People added, roles given, access changed" },
    compliance: { label: "Compliance", hint: "Documents, dates and records" },
    monitoring: { label: "Monitoring", hint: "Notification roles and alert responses" },
    fleet: { label: "Fleet", hint: "Drivers, assets, vendors, maintenance" },
    settings: { label: "Settings", hint: "Catalogs, thresholds, integrations" },
    auth: { label: "Sign-ins", hint: "Who signed in, and as whom" },
};
export const AUDIT_CATEGORIES = Object.keys(AUDIT_CATEGORY_META) as AuditCategory[];

export interface AuditEvent {
    id: string;
    /** ISO timestamp. */
    at: string;
    category: AuditCategory;
    /** The shared activity vocabulary, for the icon and colour. */
    kind: ActivityKind;
    title: string;
    detail?: string;
    actorId?: string;
    actorName: string;
    actorRole: UserRole | "system";
    /** The carrier it happened on; absent for a profile- or platform-level event. */
    accountId?: string;
    /** The service profile it belongs to — the carrier's, or the profile itself. */
    serviceProfileId?: string;
    /** What it was done to, with a way to open it where the app has one. */
    record?: { type: string; label: string; id?: string; path?: string };
    /** Seeded history, as opposed to something the app actually logged. */
    seeded?: boolean;
}

export type AuditScope =
    | { kind: "carrier"; accountId: string }
    | { kind: "profile"; serviceProfileId: string }
    | { kind: "platform" };

// ── Live log ──────────────────────────────────────────────────────────────────
const KEY = "audit-log-v1";
const EVENT = "audit-log-change";
const MAX_LIVE = 2000;

function readLive(): AuditEvent[] {
    try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as AuditEvent[]) : []; } catch { return []; }
}
function writeLive(events: AuditEvent[]): void {
    try { localStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX_LIVE))); } catch { /* private window */ }
    window.dispatchEvent(new Event(EVENT));
}

let counter = 0;
const newId = () => `aud-${Date.now().toString(36)}-${(counter++).toString(36)}`;

/** The carrier's service profile, so a carrier event also shows up on the profile's log. */
const profileOfCarrier = (accountId?: string): string | undefined => (accountId ? getAccountById(accountId)?.serviceProfileId : undefined);

/**
 * Record something the app did. The actor is whoever is signed in; a call with nobody signed
 * in is the system. A carrier event is also a profile event; a profile event is also a
 * platform event — scope is resolved on read.
 */
export function logAudit(e: {
    category: AuditCategory; kind: ActivityKind; title: string; detail?: string;
    accountId?: string; serviceProfileId?: string;
    record?: AuditEvent["record"];
    /** Override the actor (a sign-in logs the person signing in). */
    actor?: AppUser;
}): void {
    const who = e.actor ?? currentUser();
    const ev: AuditEvent = {
        id: newId(),
        at: new Date().toISOString(),
        category: e.category, kind: e.kind, title: e.title, detail: e.detail,
        actorId: who?.id, actorName: who?.name ?? "System", actorRole: who?.role ?? "system",
        accountId: e.accountId,
        serviceProfileId: e.serviceProfileId ?? profileOfCarrier(e.accountId) ?? (who && who.role !== "super-admin" ? profilesOfUser(who)[0] : undefined),
        record: e.record,
    };
    writeLive([ev, ...readLive()]);
}

/** Re-run `cb` when the live log changes. */
export function subscribeAudit(cb: () => void): () => void {
    window.addEventListener(EVENT, cb);
    window.addEventListener("storage", cb);
    return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

// ── The user store raises mutation events; this is the listener ───────────────
// users.data cannot import this module (it would be a cycle), so it announces what it did
// and the log picks it up here, with the signed-in person as the actor.
export const USER_MUTATION_EVENT = "app-users-mutation";
export interface UserMutation { type: "added" | "updated" | "removed"; user: AppUser; patch?: Partial<AppUser> }

if (typeof window !== "undefined") {
    window.addEventListener(USER_MUTATION_EVENT, (raw) => {
        const m = (raw as CustomEvent<UserMutation>).detail;
        if (!m?.user) return;
        const u = m.user;
        const acct = carriersOf(u)[0];
        const sp = profilesOfUser(u)[0] ?? profileOfCarrier(acct);
        const record = { type: "User", label: u.name, id: u.id, path: acct ? "/settings/users-roles" : "/service-profile/users-roles" };
        if (m.type === "added") {
            logAudit({ category: "users", kind: "created", title: `Added ${u.name} as ${ROLE_LABELS[u.role]}`, detail: u.email, accountId: acct, serviceProfileId: sp, record });
        } else if (m.type === "removed") {
            logAudit({ category: "users", kind: "deleted", title: `Removed ${u.name}`, detail: `${ROLE_LABELS[u.role]} · ${u.email}`, accountId: acct, serviceProfileId: sp, record });
        } else {
            const p = m.patch ?? {};
            const what = p.status ? `Set ${u.name} to ${p.status}`
                : p.role || p.carrierRoles ? `Changed ${u.name}'s role to ${ROLE_LABELS[(p.role ?? u.role)]}`
                    : p.managedAccountIds ? `Changed ${u.name}'s carrier access`
                        : `Updated ${u.name}`;
            const kind: ActivityKind = p.status === "Inactive" ? "terminated" : p.status === "Active" && u.status !== "Active" ? "reopened" : "updated";
            logAudit({ category: "users", kind, title: what, detail: Object.keys(p).join(", "), accountId: acct, serviceProfileId: sp, record });
        }
    });
}

// ── Seeded history ────────────────────────────────────────────────────────────
// Deterministic per carrier / profile, so the same demo always shows the same log.
function rng(seed: string) {
    let h = 2166136261;
    for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const daysAgo = (r: () => number, max: number) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(r() * max));
    d.setHours(7 + Math.floor(r() * 11), Math.floor(r() * 60), Math.floor(r() * 60), 0);
    return d.toISOString();
};

type Tpl = { category: AuditCategory; kind: ActivityKind; title: (ctx: SeedCtx) => string; detail?: (ctx: SeedCtx) => string; record?: (ctx: SeedCtx) => AuditEvent["record"] };
interface SeedCtx { r: () => number; carrier: AccountRecord; driver: string; asset: string; user: AppUser; doc: string; days: number }

const DOCS = ["Driver's License", "Medical Certificate", "Annual Inspection", "Insurance Certificate", "IFTA License", "Registration", "MVR", "Drug & Alcohol Policy", "Cab Card", "Road Test Certificate"];
const VENDORS = ["Comdata", "EZPass", "Samsara", "Wilmington Truck Service", "Evergreen Truck Repair"];

const CARRIER_TEMPLATES: Tpl[] = [
    { category: "compliance", kind: "uploaded", title: (c) => `Uploaded ${c.doc} for ${c.driver}`, detail: () => "PDF · 1 page", record: (c) => ({ type: "Document", label: c.doc, path: "/default-compliance-documents" }) },
    { category: "compliance", kind: "updated", title: (c) => `Set the expiry of ${c.doc} for ${c.asset}`, detail: (c) => `Next due in ${c.days} days`, record: (c) => ({ type: "Record", label: c.doc, path: "/default-compliance-documents" }) },
    { category: "compliance", kind: "verified", title: (c) => `Verified ${c.doc} for ${c.driver}`, record: (c) => ({ type: "Document", label: c.doc, path: "/default-compliance-documents" }) },
    { category: "monitoring", kind: "responded", title: (c) => `Responded to the ${c.doc} alert for ${c.asset}`, detail: () => "New date set", record: (c) => ({ type: "Alert", label: c.doc, path: "/default-compliance-monitoring" }) },
    { category: "monitoring", kind: "updated", title: () => "Changed who gets Safety Managers alerts", detail: (c) => `Added ${c.user.name}`, record: () => ({ type: "Notification role", label: "Safety Managers", path: "/settings/default-compliance-monitoring" }) },
    { category: "monitoring", kind: "status", title: () => "Paused the Service profile Admins notification role", record: () => ({ type: "Notification role", label: "Service profile Admins", path: "/settings/default-compliance-monitoring" }) },
    { category: "users", kind: "assigned", title: (c) => `Gave ${c.user.name} the ${ROLE_LABELS[c.user.role]} role`, record: (c) => ({ type: "User", label: c.user.name, id: c.user.id, path: "/settings/users-roles" }) },
    { category: "users", kind: "sent", title: (c) => `Invited ${c.user.name}`, detail: (c) => c.user.email, record: (c) => ({ type: "User", label: c.user.name, id: c.user.id, path: "/settings/users-roles" }) },
    { category: "fleet", kind: "created", title: (c) => `Added driver ${c.driver} to the roster`, record: (c) => ({ type: "Driver", label: c.driver, path: "/account/profile" }) },
    { category: "fleet", kind: "updated", title: (c) => `Updated ${c.asset} — plate and odometer`, record: (c) => ({ type: "Asset", label: c.asset, path: "/assets/directory" }) },
    { category: "fleet", kind: "created", title: (c) => `Added vendor ${pick(c.r, VENDORS)}`, record: () => ({ type: "Vendor", label: "Vendor", path: "/vendors" }) },
    { category: "fleet", kind: "recorded", title: (c) => `Logged a fuel purchase for ${c.asset}`, detail: (c) => `${(60 + c.r() * 120).toFixed(1)} gal`, record: (c) => ({ type: "Fuel purchase", label: c.asset, path: "/fuel" }) },
    { category: "settings", kind: "updated", title: () => "Changed CVOR warning threshold", detail: (c) => `${30 + Math.floor(c.r() * 10)}% → ${35 + Math.floor(c.r() * 10)}%`, record: () => ({ type: "Thresholds", label: "Inspections & risk", path: "/settings/inspections" }) },
    { category: "settings", kind: "created", title: (c) => `Added service type "${pick(c.r, ["Reefer Unit Service", "Brake Inspection", "DEF Top-up", "Tire Rotation"])}"`, record: () => ({ type: "Service type", label: "Maintenance", path: "/settings/maintenance" }) },
    { category: "settings", kind: "updated", title: () => "Connected Samsara", detail: () => "API key saved", record: () => ({ type: "Integration", label: "Samsara", path: "/settings/integrations" }) },
    { category: "auth", kind: "received", title: (c) => `${c.user.name} signed in`, detail: (c) => `as ${ROLE_LABELS[c.user.role]}` },
    { category: "auth", kind: "received", title: (c) => `${c.user.name} signed in`, detail: () => "Driver app" },
    { category: "compliance", kind: "shared", title: (c) => `Shared ${c.doc} for ${c.driver} to chat`, record: (c) => ({ type: "Document", label: c.doc, path: "/messages" }) },
    { category: "monitoring", kind: "alert", title: (c) => `Reminder sent: ${c.doc} for ${c.asset} due in ${c.days} days`, detail: (c) => `Email + in-app to ${c.user.name}`, record: (c) => ({ type: "Alert", label: c.doc, path: "/default-compliance-monitoring" }) },
];

const PROFILE_TEMPLATES: Tpl[] = [
    { category: "users", kind: "created", title: (c) => `Created carrier profile ${c.carrier.legalName}`, record: (c) => ({ type: "Carrier profile", label: c.carrier.legalName, path: "/accounts" }) },
    { category: "users", kind: "assigned", title: (c) => `Made ${c.user.name} Fleet Admin of ${c.carrier.dbaName || c.carrier.legalName}`, record: (c) => ({ type: "User", label: c.user.name, id: c.user.id, path: "/service-profile/users-roles" }) },
    { category: "settings", kind: "updated", title: (c) => `Raised ${c.carrier.dbaName || c.carrier.legalName}'s user limit`, detail: () => "10 → 15 seats", record: (c) => ({ type: "Limits", label: c.carrier.legalName, path: "/admin/carrier-profile-configuration" }) },
    { category: "monitoring", kind: "status", title: (c) => `${c.carrier.dbaName || c.carrier.legalName} now escalates alerts to the profile's Admins`, record: () => ({ type: "Notification role", label: "Service profile Admins", path: "/service-profile/monitoring-notifications" }) },
    { category: "compliance", kind: "updated", title: (c) => `Changed the compliance template for ${c.carrier.dbaName || c.carrier.legalName}`, record: () => ({ type: "Compliance setup", label: "Template", path: "/service-profile/compliance-setup" }) },
];

const PLATFORM_TEMPLATES: Tpl[] = [
    { category: "users", kind: "updated", title: (c) => `Set ${pick(c.r, ["Inventory", "Fuel", "Vendors", "Tickets"])} to Light for ${pick(c.r, ["Safety Manager", "User"])}`, record: () => ({ type: "Menu table", label: "Roles & Access", path: "/admin/roles" }) },
    { category: "users", kind: "created", title: () => `Created service profile ${pick(rng("sp"), SERVICE_PROFILES_DB.map((p) => p.legalName))}`, record: () => ({ type: "Service profile", label: "Service profiles", path: "/accounts" }) },
    { category: "settings", kind: "updated", title: (c) => `Changed the carrier profile limit for ${pick(c.r, SERVICE_PROFILES_DB.map((p) => p.dbaName || p.legalName))}`, detail: () => "5 → unlimited", record: () => ({ type: "Limits", label: "Service profiles", path: "/admin/service-profile-compliance" }) },
    { category: "auth", kind: "received", title: (c) => `${c.user.name} signed in as ${c.user.name}`, detail: () => "Test account, from Roles & Access" },
];

function seedFor(carrier: AccountRecord, users: AppUser[]): AuditEvent[] {
    const r = rng(`audit:${carrier.id}`);
    const drivers = getDriversForAccount(carrier.id).map((d) => d.name);
    const assets = getAssetsForAccount(carrier.id).map((a) => a.unitNumber);
    const people = users.length ? users : APP_USERS.filter((u) => u.role === "super-admin");
    const n = 28 + Math.floor(r() * 16);
    const out: AuditEvent[] = [];
    for (let i = 0; i < n; i++) {
        const t = pick(r, CARRIER_TEMPLATES);
        const ctx: SeedCtx = { r, carrier, driver: drivers.length ? pick(r, drivers) : "a driver", asset: assets.length ? pick(r, assets) : "a unit", user: pick(r, people), doc: pick(r, DOCS), days: 7 + Math.floor(r() * 80) };
        const actor = t.category === "auth" ? ctx.user : pick(r, people);
        out.push({
            id: `seed-${carrier.id}-${i}`, at: daysAgo(r, 42), category: t.category, kind: t.kind,
            title: t.title(ctx), detail: t.detail?.(ctx), actorId: actor.id, actorName: actor.name, actorRole: actor.role,
            accountId: carrier.id, serviceProfileId: carrier.serviceProfileId, record: t.record?.(ctx), seeded: true,
        });
    }
    return out;
}

function seedForProfile(spId: string): AuditEvent[] {
    const r = rng(`audit:${spId}`);
    const carriers = ACCOUNTS_DB.filter((a) => a.serviceProfileId === spId);
    const admins = APP_USERS.filter((u) => u.role === "admin" && profilesOfUser(u).includes(spId));
    if (!carriers.length) return [];
    const actors = admins.length ? admins : APP_USERS.filter((u) => u.role === "super-admin");
    const out: AuditEvent[] = [];
    const n = 6 + Math.floor(r() * 6);
    for (let i = 0; i < n; i++) {
        const t = pick(r, PROFILE_TEMPLATES);
        const carrier = pick(r, carriers);
        const team = APP_USERS.filter((u) => carriersOf(u).includes(carrier.id));
        const ctx: SeedCtx = { r, carrier, driver: "", asset: "", user: team.length ? pick(r, team) : pick(r, actors), doc: "", days: 0 };
        const actor = pick(r, actors);
        out.push({
            id: `seed-${spId}-${i}`, at: daysAgo(r, 42), category: t.category, kind: t.kind,
            title: t.title(ctx), detail: t.detail?.(ctx), actorId: actor.id, actorName: actor.name, actorRole: actor.role,
            serviceProfileId: spId, record: t.record?.(ctx), seeded: true,
        });
    }
    return out;
}

function seedForPlatform(): AuditEvent[] {
    const r = rng("audit:platform");
    const supers = APP_USERS.filter((u) => u.role === "super-admin");
    if (!supers.length) return [];
    const out: AuditEvent[] = [];
    for (let i = 0; i < 8; i++) {
        const t = pick(r, PLATFORM_TEMPLATES);
        const actor = pick(r, supers);
        const ctx: SeedCtx = { r, carrier: ACCOUNTS_DB[0], driver: "", asset: "", user: actor, doc: "", days: 0 };
        out.push({ id: `seed-platform-${i}`, at: daysAgo(r, 42), category: t.category, kind: t.kind, title: t.title(ctx), detail: t.detail?.(ctx), actorId: actor.id, actorName: actor.name, actorRole: actor.role, record: t.record?.(ctx), seeded: true });
    }
    return out;
}

const seedCache = new Map<string, AuditEvent[]>();
function seeded(key: string, build: () => AuditEvent[]): AuditEvent[] {
    let v = seedCache.get(key);
    if (!v) { v = build(); seedCache.set(key, v); }
    return v;
}

// ── Reading a scope ───────────────────────────────────────────────────────────

/** Everyone whose actions can appear on a carrier's log — its team and the Admins above it. */
const carrierActors = (accountId: string): AppUser[] => {
    const sp = getAccountById(accountId)?.serviceProfileId;
    return APP_USERS.filter((u) => u.status !== "Inactive" && u.role !== "super-admin"
        && (carriersOf(u).includes(accountId) || (u.role === "admin" && !!sp && profilesOfUser(u).includes(sp))));
};

export function auditEventsFor(scope: AuditScope): AuditEvent[] {
    const live = readLive();
    let events: AuditEvent[];
    if (scope.kind === "carrier") {
        const a = scope.accountId;
        const acct = getAccountById(a);
        events = [
            ...live.filter((e) => e.accountId === a),
            ...(acct ? seeded(`c:${a}`, () => seedFor(acct, carrierActors(a))) : []),
        ];
    } else if (scope.kind === "profile") {
        const sp = scope.serviceProfileId;
        const carriers = ACCOUNTS_DB.filter((c) => c.serviceProfileId === sp);
        events = [
            ...live.filter((e) => e.serviceProfileId === sp),
            ...seeded(`p:${sp}`, () => seedForProfile(sp)),
            ...carriers.flatMap((c) => seeded(`c:${c.id}`, () => seedFor(c, carrierActors(c.id)))),
        ];
    } else {
        events = [
            ...live,
            ...seeded("platform", seedForPlatform),
            ...SERVICE_PROFILES_DB.flatMap((p) => seeded(`p:${p.id}`, () => seedForProfile(p.id))),
            ...ACCOUNTS_DB.flatMap((c) => seeded(`c:${c.id}`, () => seedFor(c, carrierActors(c.id)))),
        ];
    }
    return events.sort((x, y) => y.at.localeCompare(x.at));
}

/** A scope's events, kept current as the live log grows. */
export function useAuditEvents(scope: AuditScope): AuditEvent[] {
    const [tick, setTick] = useState(0);
    useEffect(() => subscribeAudit(() => setTick((t) => t + 1)), []);
    const key = scope.kind === "carrier" ? scope.accountId : scope.kind === "profile" ? scope.serviceProfileId : "platform";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick is the log snapshot
    return useMemo(() => auditEventsFor(scope), [scope.kind, key, tick]);
}

/** The carrier an event belongs to, for the profile and platform views. */
export const auditCarrierName = (e: AuditEvent): string => {
    const a = e.accountId ? getAccountById(e.accountId) : undefined;
    if (a) return a.dbaName || a.legalName;
    const p = e.serviceProfileId ? SERVICE_PROFILES_DB.find((x) => x.id === e.serviceProfileId) : undefined;
    return p ? `${p.dbaName || p.legalName} (profile)` : "Platform";
};
