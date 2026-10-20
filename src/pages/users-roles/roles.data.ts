import { useSyncExternalStore } from "react";
import { Crown, ShieldCheck, UserCog, HardHat, IdCard, UserRound, type LucideIcon } from "lucide-react";
import { ROLE_LABELS, ROLE_LEVEL, ROLE_ORDER, type RoleLevel, type UserRole } from "@/data/users.data";
import { SIDEBAR_NODES } from "@/data/sidebar.data";
import { isGroup, type SidebarNode } from "@/types/sidebar";

// ─────────────────────────────────────────────────────────────────────────────
// Roles — what each of the six is for, and which sidebar menus it gets.
//
// The role list and levels live with the users (users.data.ts); this is the part a person
// reads: a one-line remit, who hands the role out, and the menu table Users & Roles shows.
// The table is the Super Admin's to tune — the sidebar reads it for everyone else.
// ─────────────────────────────────────────────────────────────────────────────

export interface RoleMeta {
    role: UserRole;
    label: string;
    level: RoleLevel;
    Icon: LucideIcon;
    /** Icon chip. */
    chip: string;
    /** Status-style dot, for filter pills. */
    dot: string;
    /** One line: what this person is there to do. */
    remit: string;
    /** Who can give someone this role. */
    grantedBy: string;
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
    "super-admin": {
        role: "super-admin", label: ROLE_LABELS["super-admin"], level: "platform", Icon: Crown,
        chip: "bg-violet-100 text-violet-700", dot: "bg-violet-500",
        remit: "TrackSmart. Every service profile, every carrier, every setting — and the definition of the roles below.",
        grantedBy: "Another Super Admin",
    },
    "admin": {
        role: "admin", label: ROLE_LABELS.admin, level: "service", Icon: ShieldCheck,
        chip: "bg-blue-100 text-blue-700", dot: "bg-blue-500",
        remit: "Runs a service profile: creates its carrier profiles, adds users to it or to a carrier, and gives out the carrier roles.",
        grantedBy: "Super Admin, or another Admin of the same service profile",
    },
    "fleet-admin": {
        role: "fleet-admin", label: ROLE_LABELS["fleet-admin"], level: "carrier", Icon: UserCog,
        chip: "bg-sky-100 text-sky-700", dot: "bg-sky-500",
        remit: "In charge of one carrier: its drivers, assets, maintenance, compliance and settings.",
        grantedBy: "The service profile's Admin",
    },
    "safety-manager": {
        role: "safety-manager", label: ROLE_LABELS["safety-manager"], level: "carrier", Icon: HardHat,
        chip: "bg-amber-100 text-amber-700", dot: "bg-amber-500",
        remit: "Keeps the carrier compliant: DQ files, documents and monitoring, hiring, accidents, violations and HOS.",
        grantedBy: "The service profile's Admin",
    },
    "driver": {
        role: "driver", label: ROLE_LABELS.driver, level: "carrier", Icon: IdCard,
        chip: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500",
        remit: "Signs in to the Driver app: their own documents, hours, collections and accident reports.",
        grantedBy: "The service profile's Admin — always a driver on that carrier's roster",
    },
    "user": {
        role: "user", label: ROLE_LABELS.user, level: "carrier", Icon: UserRound,
        chip: "bg-slate-100 text-slate-600", dot: "bg-slate-400",
        remit: "Day-to-day office work on a carrier — dispatch, maintenance, inventory, fuel — without changing its setup.",
        grantedBy: "The service profile's Admin",
    },
};

export const LEVEL_META: Record<RoleLevel, { label: string; sub: string }> = {
    platform: { label: "Platform", sub: "TrackSmart" },
    service: { label: "Service profile", sub: "One organisation and its carriers" },
    carrier: { label: "Carrier profile", sub: "One carrier's team" },
};

export const rolesAt = (level: RoleLevel): UserRole[] => ROLE_ORDER.filter((r) => ROLE_LEVEL[r] === level);

// ── Sidebar menus by role ────────────────────────────────────────────────────
//
// One row per top-level sidebar menu, one column per role, and three answers: the menu is
// there and everything in it works (Full), it is there to look at (Light), or it is not in
// the menu at all (Hidden). The sidebar filters and marks itself from this table.

/** full = in the menu, use & change · light = in the menu, view only · hidden = not in the menu. */
export type Access = "full" | "light" | "hidden";

export const ACCESS_META: Record<Access, { label: string; hint: string; cls: string }> = {
    full: { label: "Full", hint: "In the menu · use & change", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    light: { label: "Light", hint: "In the menu · view only", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
    hidden: { label: "Hidden", hint: "Not in the menu", cls: "bg-white text-slate-300 ring-slate-200" },
};

/** The order a click steps through. */
export const ACCESS_CYCLE: Access[] = ["full", "light", "hidden"];

export interface MenuRow {
    /** The sidebar node's key. */
    id: string;
    group: string;
    label: string;
    /** What the menu holds — a group's entries, or the page it opens. */
    hint: string;
}

export const MENU_GROUPS = ["Overview", "Fleet", "Compliance", "Safety", "Hiring", "Administration", "Driver", "Other"];

const MENU_GROUP: Record<string, string> = {
    dashboard: "Overview", messages: "Overview", account: "Overview",
    inventory: "Fleet", "dq-files-menu": "Fleet", "fleet-maintenance": "Fleet", "hours-of-service": "Fleet", fuel: "Fleet",
    "default-compliance-documents": "Compliance", "default-compliance-monitoring": "Compliance", inspections: "Compliance", "roadside-inspections": "Compliance",
    "top-violations": "Safety", "default-accidents": "Safety", tickets: "Safety", "safety-analysis-beta": "Safety", "safety-events": "Safety", "safety-event": "Safety",
    "apply-carrier": "Hiring", "hiring-process": "Hiring",
    settings: "Administration", "service-profile": "Administration", admin: "Administration", "super-admin": "Administration",
    "driver-mobile-app": "Driver",
};

const hintOf = (n: SidebarNode): string => isGroup(n) ? n.children.map((c) => c.label).join(" · ") : (n.path ?? "");

/** Every live top-level sidebar menu, in sidebar order. Superseded (greyed) entries are left out. */
export const MENU_ROWS: MenuRow[] = SIDEBAR_NODES
    .filter((n) => !n.disabled)
    .map((n) => ({ id: n.key, group: MENU_GROUP[n.key] ?? "Other", label: n.label, hint: hintOf(n) }));

type Row = Record<UserRole, Access>;
const row = (admin: Access, fleet: Access, safety: Access, user: Access, driver: Access): Row =>
    ({ "super-admin": "full", admin, "fleet-admin": fleet, "safety-manager": safety, user, driver });

/** An office menu: the carrier's leads run it, a User looks, a Driver never sees it. */
const OFFICE = row("full", "full", "full", "light", "hidden");

export const DEFAULT_MENU_ACCESS: Record<string, Row> = {
    //                                  Admin    Fleet    Safety   User     Driver
    dashboard: row("full", "full", "full", "full", "hidden"),
    messages: row("full", "full", "full", "full", "full"),
    account: row("full", "full", "light", "light", "hidden"),
    inventory: row("full", "full", "light", "full", "hidden"),
    "dq-files-menu": OFFICE,
    "default-compliance-documents": OFFICE,
    "default-compliance-monitoring": OFFICE,
    "fleet-maintenance": row("full", "full", "light", "full", "hidden"),
    "apply-carrier": row("hidden", "hidden", "hidden", "hidden", "full"),
    "hiring-process": OFFICE,
    "hours-of-service": OFFICE,
    fuel: row("full", "full", "light", "full", "hidden"),
    inspections: OFFICE,
    "roadside-inspections": OFFICE,
    "top-violations": OFFICE,
    "default-accidents": OFFICE,
    tickets: OFFICE,
    "safety-analysis-beta": OFFICE,
    "safety-events": OFFICE,
    "safety-event": OFFICE,
    settings: row("full", "full", "light", "hidden", "hidden"),
    "service-profile": row("full", "light", "hidden", "hidden", "hidden"),
    admin: row("full", "hidden", "hidden", "hidden", "hidden"),
    "super-admin": row("hidden", "hidden", "hidden", "hidden", "hidden"),
    "driver-mobile-app": row("light", "light", "light", "hidden", "full"),
};

/** A menu the table does not know yet (added to the sidebar later) behaves as an office menu. */
const defaultRow = (key: string): Row => DEFAULT_MENU_ACCESS[key] ?? OFFICE;

// Changes on top of the defaults. Super Admin is never stored: it is full everywhere.
const ACCESS_KEY = "role-menu-access-v1";
const ACCESS_EVENT = "role-menu-access-changed";
type Overrides = Record<string, Partial<Record<UserRole, Access>>>;

function readOverrides(): Overrides {
    try { return JSON.parse(localStorage.getItem(ACCESS_KEY) || "{}") as Overrides; } catch { return {}; }
}
let cache: { raw: string | null; value: Record<string, Row> } | null = null;

function snapshot(): Record<string, Row> {
    let raw: string | null = null;
    try { raw = localStorage.getItem(ACCESS_KEY); } catch { /* private window */ }
    if (cache && cache.raw === raw) return cache.value;
    const o = readOverrides();
    const value: Record<string, Row> = {};
    for (const m of MENU_ROWS) value[m.id] = { ...defaultRow(m.id), ...(o[m.id] ?? {}), "super-admin": "full" };
    cache = { raw, value };
    return value;
}

function subscribe(cb: () => void) {
    window.addEventListener(ACCESS_EVENT, cb);
    return () => window.removeEventListener(ACCESS_EVENT, cb);
}

export function useRoleAccess(): Record<string, Row> {
    return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** What this role gets for this sidebar menu. Super Admin: everything, always. */
export function menuAccess(m: Record<string, Row>, key: string, role: UserRole): Access {
    if (role === "super-admin") return "full";
    return m[key]?.[role] ?? defaultRow(key)[role];
}

export function setRoleAccess(menuKey: string, role: UserRole, access: Access): void {
    if (role === "super-admin") return;
    const o = readOverrides();
    const next = { ...(o[menuKey] ?? {}) };
    if (defaultRow(menuKey)[role] === access) delete next[role];
    else next[role] = access;
    o[menuKey] = next;
    try { localStorage.setItem(ACCESS_KEY, JSON.stringify(o)); } catch { /* private window */ }
    window.dispatchEvent(new Event(ACCESS_EVENT));
}

export function resetRoleAccess(): void {
    try { localStorage.removeItem(ACCESS_KEY); } catch { /* private window */ }
    window.dispatchEvent(new Event(ACCESS_EVENT));
}

export const isAccessChanged = (m: Record<string, Row>, menuKey: string, role: UserRole): boolean =>
    defaultRow(menuKey)[role] !== m[menuKey]?.[role];
