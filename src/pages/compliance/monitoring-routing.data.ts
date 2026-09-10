import { useEffect, useState } from 'react';
import type { EntityId } from '@/pages/compliance/safety-software-catalog.data';

/**
 * Notification ROUTING for the Default Compliance Monitoring page.
 *
 * The monitoring page turns every monitored record into an ALERT (entity + type + priority).
 * This store answers the question "which notification goes to WHOM, and how?" — a set of
 * per-carrier ROUTING RULES. Each rule scopes a slice of alerts (by entity / severity / type)
 * and lists the recipients + channels that slice should notify. An alert notifies the UNION
 * of recipients across every enabled rule whose scope matches it.
 *
 * Managed in Settings ▸ Default Compliance & Monitoring. localStorage + CustomEvent, keyed by
 * accountId — same pattern as the other per-carrier stores. Seeded once per carrier with a
 * sensible default rule set so the page is never empty.
 */

// ── shared enums (mirror the monitoring page's PriorityLevel / AlertType) ──
export type Severity = 'overdue' | 'critical' | 'high' | 'medium' | 'low';
export const SEVERITY_ORDER: Severity[] = ['overdue', 'critical', 'high', 'medium', 'low'];

export type RoutingAlertType = 'expiry' | 'review' | 'scheduled' | 'status';
export const ROUTING_TYPE_META: Record<RoutingAlertType, string> = {
    expiry: 'Expiry / Renewal', review: 'Review', scheduled: 'Scheduled', status: 'Status change',
};

export type RoutingEntity = 'all' | EntityId;

/** A "floor" — the rule applies to alerts at this severity OR MORE URGENT. */
export const SEVERITY_FLOOR_LABEL: Record<Severity, string> = {
    overdue: 'Overdue only',
    critical: 'Critical & above',
    high: 'High & above',
    medium: 'Medium & above',
    low: 'Any priority',
};

/** True when an alert's priority is at least as urgent as the rule's floor. */
export function severityMeetsFloor(priority: Severity, floor: Severity): boolean {
    return SEVERITY_ORDER.indexOf(priority) <= SEVERITY_ORDER.indexOf(floor);
}

// ── recipient ─────────────────────────────────────────────────────────
export type RecipientKind = 'user' | 'driver' | 'role' | 'contact' | 'owner';

export interface RoutingRecipient {
    id: string;        // 'user:<id>' | 'driver:<id>' | 'role:<slug>' | 'contact:<email>' | 'owner'
    name: string;
    kind: RecipientKind;
    email?: string;
}

/** Preset role recipients — illustrative "who" values that don't depend on the user directory. */
export const ROLE_PRESETS = ['Safety Manager', 'Compliance Lead', 'Fleet Administrator', 'Dispatcher', 'Operations Manager'];
export const OWNER_RECIPIENT: RoutingRecipient = { id: 'owner', name: 'Assigned owner', kind: 'owner' };
export const roleRecipient = (name: string): RoutingRecipient => ({ id: `role:${name.toLowerCase().replace(/\s+/g, '-')}`, name, kind: 'role' });

// ── per-stage escalation ───────────────────────────────────────────────
// A reminder "stage" = one lead-time from the carrier's Reminder schedule (e.g. 90 / 30 / 7 days
// before due). Escalation lets each stage notify DIFFERENT people — early stages ping the owner,
// the final stage escalates to add a manager. `days` must be one of the carrier's reminder days.
export interface RoutingStage {
    days: number;                 // lead-time this stage maps to (a value from the reminder schedule)
    recipients: RoutingRecipient[];
}

// ── rule ──────────────────────────────────────────────────────────────
export interface RoutingRule {
    id: string;
    name: string;
    enabled: boolean;
    entity: RoutingEntity;
    types: RoutingAlertType[];   // empty = every type
    severityFloor: Severity;     // applies to alerts at this severity or more urgent
    recipients: RoutingRecipient[];   // base list — used when a stage has no explicit recipients (or stages is empty)
    channels: { email: boolean; inApp: boolean };
    // ── targeting (individual / group) — absent/empty subjectIds = every subject of `entity` ──
    subjectIds?: string[];       // narrow the rule to specific asset/driver ids (a single pick or a group's members)
    groupId?: string;            // provenance when the target is a saved group (members re-materialised on group edit)
    targetLabel?: string;        // display name of the specific subject / group (e.g. "John Doe" · "West Fleet")
    // ── per-stage escalation — when present, recipients differ by reminder stage; `recipients` is the fallback ──
    stages?: RoutingStage[];
}

// ── named subject group ────────────────────────────────────────────────
// A reusable set of drivers OR assets a checklist can target as one unit. Editing the group
// re-materialises `subjectIds` on every rule that references it (see updateGroup).
export interface RoutingGroup {
    id: string;
    name: string;
    entity: 'Driver' | 'Asset';
    subjectIds: string[];
}

// ── notification ROLE (Simple mode) ─────────────────────────────────────
// A friendly checklist that says "notify these user(s) about these records". Scope is a simple
// checklist — all carrier compliance / all drivers / all assets — plus optional individual
// drivers or assets. Additive to Advanced rules (both notify). This is what Simple mode manages.
export interface NotificationRole {
    id: string;
    name: string;
    description?: string;             // optional free-text note about what the role is for
    enabled: boolean;
    carrier: boolean;                 // all carrier compliance records
    allDrivers: boolean;              // every driver
    allAssets: boolean;               // every asset
    driverIds: string[];              // specific drivers (added on top of / instead of allDrivers)
    assetIds: string[];               // specific assets
    recipients: RoutingRecipient[];   // the assigned user(s) who get notified
    // NOTE: no channels — Email / In-app is chosen per RECORD (its Monitoring & Notifications panel),
    // not on the role. The role only decides WHO.
}

/** Does this role's checklist cover the alert? */
export function roleMatches(role: NotificationRole, alert: { entity: EntityId; subjectId: string }): boolean {
    if (!role.enabled) return false;
    if (alert.entity === 'Carrier') return role.carrier;
    if (alert.entity === 'Driver') return role.allDrivers || role.driverIds.includes(alert.subjectId);
    if (alert.entity === 'Asset') return role.allAssets || role.assetIds.includes(alert.subjectId);
    return false;
}

/** Shape passed to the resolver — a lightweight view of a monitoring alert. */
export interface RoutingAlertView {
    entity: EntityId;
    subjectId: string;               // the asset/driver this alert belongs to (for individual/group targeting)
    type: RoutingAlertType;
    priority: Severity;
    daysUntil?: number | null;       // days until due — picks the active escalation stage (null = status watch)
    assignee?: { id: string; name: string };
}

export interface ResolvedRouting {
    recipients: RoutingRecipient[];  // who is notified AT THE ACTIVE STAGE
    channels: { email: boolean; inApp: boolean };
    ruleIds: string[];
    activeDay: number | null;        // the reminder stage currently in effect (null = none fired / status)
    scoped: boolean;                 // true when an individual/group rule overrode the broad type rules
    staged: boolean;                 // true when an effective rule uses per-stage escalation (recipients vary by stage)
    roleHit: boolean;                // true when a Simple-mode role contributed recipients
}

/** Does this rule's scope cover the alert? (Ignores enabled + subject targeting — caller handles those.) */
export function ruleMatches(rule: RoutingRule, alert: RoutingAlertView): boolean {
    if (rule.entity !== 'all' && rule.entity !== alert.entity) return false;
    if (rule.types.length && !rule.types.includes(alert.type)) return false;
    if (!severityMeetsFloor(alert.priority, rule.severityFloor)) return false;
    return true;
}

/** True when this rule is narrowed to specific subjects (individual pick or group). */
export function ruleIsScoped(rule: RoutingRule): boolean {
    return !!(rule.subjectIds && rule.subjectIds.length > 0);
}

/**
 * The reminder stage currently "in effect" for an alert `daysUntil` from its due date, given the
 * carrier's schedule: the most-recently-fired reminder = the smallest reminder day ≥ daysUntil.
 * Returns null when nothing has fired yet (still further out than the earliest reminder) or n/a.
 *   e.g. schedule [90,30,7]: daysUntil 45 → 90 · 20 → 30 · 3 → 7 · overdue(−5) → 7 · 120 → null
 */
export function activeStageDay(daysUntil: number | null | undefined, reminders: number[]): number | null {
    if (daysUntil === null || daysUntil === undefined) return null;
    const asc = [...reminders].filter(r => r > 0).sort((a, b) => a - b);
    for (const r of asc) if (daysUntil <= r) return r;
    return null;
}

/** How a given reminder day relates to the alert's progress — for styling the chips. */
export type StageState = 'active' | 'past' | 'upcoming';
export function stageState(day: number, daysUntil: number | null | undefined, activeDay: number | null): StageState {
    if (activeDay !== null && day === activeDay) return 'active';
    if (daysUntil === null || daysUntil === undefined) return 'upcoming';
    return day >= daysUntil ? 'past' : 'upcoming';   // fired-but-not-current vs not-yet-fired
}

/**
 * Recipients a single rule notifies at the active stage. Rule stages are defined on canonical days
 * (90/30/7); a record can use OTHER reminder days, so we map its active day to the same "phase":
 * the smallest rule-stage day ≥ activeDay (e.g. a 45-day-out record uses the 90-day stage, a 20-day
 * uses the 30-day, a 3-day uses the final 7-day). Falls back to the earliest stage when further out.
 */
function recipientsAtStage(rule: RoutingRule, activeDay: number | null): RoutingRecipient[] {
    if (!rule.stages || rule.stages.length === 0) return rule.recipients;
    const asc = [...rule.stages].sort((a, b) => a.days - b.days);           // [7,30,90]
    if (activeDay === null) return asc[asc.length - 1]?.recipients ?? rule.recipients; // upcoming → earliest stage
    const exact = asc.find(s => s.days === activeDay);
    if (exact) return exact.recipients;
    const samePhase = asc.find(s => s.days >= activeDay);                    // nearest stage covering this day
    return (samePhase ?? asc[asc.length - 1]).recipients;
}

/**
 * Resolve who gets notified for a single alert, at its ACTIVE reminder stage.
 * - Scope: an alert matched by any individual/group rule uses ONLY those (they OVERRIDE broad
 *   type rules); otherwise the broad type rules apply.
 * - Recipients: the union across the effective rules, taken from each rule's active stage; the
 *   "Assigned owner" token expands to the alert's real assignee (dropped when unassigned).
 * - Channels: OR-ed across the effective rules.
 */
export function resolveRouting(rules: RoutingRule[], alert: RoutingAlertView, reminders: number[] = DEFAULT_REMINDERS, roles: NotificationRole[] = []): ResolvedRouting {
    const matching = rules.filter(r => r.enabled && ruleMatches(r, alert));
    const scopedHits = matching.filter(r => ruleIsScoped(r) && r.subjectIds!.includes(alert.subjectId));
    const effective = scopedHits.length ? scopedHits : matching.filter(r => !ruleIsScoped(r));
    const activeDay = activeStageDay(alert.daysUntil, reminders);

    const seen = new Map<string, RoutingRecipient>();
    const channels = { email: false, inApp: false };
    const ruleIds: string[] = [];
    for (const rule of effective) {
        ruleIds.push(rule.id);
        channels.email ||= rule.channels.email;
        channels.inApp ||= rule.channels.inApp;
        for (const r of recipientsAtStage(rule, activeDay)) {
            if (r.kind === 'owner') {
                if (!alert.assignee) continue;                       // owner token but nobody assigned → skip
                const key = `owner:${alert.assignee.id}`;
                if (!seen.has(key)) seen.set(key, { id: `user:${alert.assignee.id}`, name: alert.assignee.name, kind: 'owner' });
            } else if (!seen.has(r.id)) {
                seen.set(r.id, r);
            }
        }
    }
    // Roles (Simple mode) are additive — every matching role's assigned users are notified too.
    // Roles carry no channels; Email / In-app comes from the record's own config.
    let roleHit = false;
    for (const role of roles) {
        if (!roleMatches(role, alert)) continue;
        roleHit = true;
        for (const r of role.recipients) if (!seen.has(r.id)) seen.set(r.id, r);
    }
    return { recipients: [...seen.values()], channels, ruleIds, activeDay, scoped: scopedHits.length > 0, staged: effective.some(r => !!r.stages?.length), roleHit };
}

// ── per-carrier store ─────────────────────────────────────────────────
type Store = Record<string, RoutingRule[]>; // accountId -> rules

const KEY = 'default-monitoring-routing-v2';
const EVENT = 'default-monitoring-routing-change';
const NO_ACCOUNT = '_noacct';

function loadStore(): Store {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Store; } catch { /* ignore */ }
    return {};
}
function persist(store: Store) {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* quota — best-effort */ }
    window.dispatchEvent(new CustomEvent(EVENT));
}

// ── Reminder schedule (the "reminder module") ─────────────────────────
// A per-carrier list of lead times (days before the due date) at which a reminder is sent.
// This is the single schedule the Monitoring page uses for its Reminders column, Next-alert and
// (reminder-aware) priority — so "monitoring follows the schedule". Default = 90 / 30 / 7 days.
export const REMINDER_OPTIONS = [90, 60, 30, 14, 7, 3, 1];
export const DEFAULT_REMINDERS = [90, 30, 7];
const REMINDERS_KEY = 'default-monitoring-reminders-v1';
const REM_EVENT = 'default-monitoring-reminders-change';
type RemStore = Record<string, number[]>;
function loadReminders(): RemStore {
    try { const raw = localStorage.getItem(REMINDERS_KEY); if (raw) return JSON.parse(raw) as RemStore; } catch { /* ignore */ }
    return {};
}
function persistReminders(store: RemStore) {
    try { localStorage.setItem(REMINDERS_KEY, JSON.stringify(store)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(REM_EVENT));
}
/** Compact chip label for a reminder lead-time — "90d" (or "On date" for 0). */
export const reminderLabelShort = (d: number) => (d === 0 ? 'On date' : `${d}d`);

/** Human summary like "90, 30 and 7 days before". */
export function reminderSummary(days: number[]): string {
    const s = [...days].sort((a, b) => b - a);
    if (!s.length) return 'no reminders';
    if (s.length === 1) return `${s[0]} days before`;
    return `${s.slice(0, -1).join(', ')} and ${s[s.length - 1]} days before`;
}

let rid = 0;
function newId(): string { rid += 1; return `rule-${Date.now().toString(36)}-${rid}-${Math.random().toString(36).slice(2, 6)}`; }
function newGroupId(): string { rid += 1; return `grp-${Date.now().toString(36)}-${rid}-${Math.random().toString(36).slice(2, 6)}`; }

// ── Subject groups (named sets of drivers / assets a checklist can target) ─────────────
type GroupStore = Record<string, RoutingGroup[]>; // accountId -> groups
const GROUPS_KEY = 'default-monitoring-groups-v1';
const GROUPS_EVENT = 'default-monitoring-groups-change';
function loadGroups(): GroupStore {
    try { const raw = localStorage.getItem(GROUPS_KEY); if (raw) return JSON.parse(raw) as GroupStore; } catch { /* ignore */ }
    return {};
}
function persistGroups(store: GroupStore) {
    try { localStorage.setItem(GROUPS_KEY, JSON.stringify(store)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(GROUPS_EVENT));
}
function newRoleId(): string { rid += 1; return `role-${Date.now().toString(36)}-${rid}-${Math.random().toString(36).slice(2, 6)}`; }

// ── Notification roles (Simple mode) ───────────────────────────────────
type RoleStore = Record<string, NotificationRole[]>; // accountId -> roles
const ROLES_KEY = 'default-monitoring-roles-v2';
const ROLES_SEEDED_KEY = 'default-monitoring-roles-seeded-v2';
const ROLES_EVENT = 'default-monitoring-roles-change';
function loadRoles(): RoleStore {
    try { const raw = localStorage.getItem(ROLES_KEY); if (raw) return JSON.parse(raw) as RoleStore; } catch { /* ignore */ }
    return {};
}
function persistRoles(store: RoleStore) {
    try { localStorage.setItem(ROLES_KEY, JSON.stringify(store)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(ROLES_EVENT));
}

// ── Notification RESPONSES ────────────────────────────────────────────
// A SINGLE response per alert — logged when its record is actually resolved (a new date set, status
// updated, or a document added via Take action). One response flips the alert GREEN ("handled").
export interface AlertResponse { at: string; kind: 'date' | 'document' | 'status'; by?: string; detail?: string }
type ResponseStore = Record<string, Record<string, AlertResponse>>; // accountId -> alertId -> response
const RESPONSES_KEY = 'default-monitoring-responses-v2';
const RESPONSES_EVENT = 'default-monitoring-responses-change';
function loadResponses(): ResponseStore {
    try { const raw = localStorage.getItem(RESPONSES_KEY); if (raw) return JSON.parse(raw) as ResponseStore; } catch { /* ignore */ }
    return {};
}
function persistResponses(store: ResponseStore) {
    try { localStorage.setItem(RESPONSES_KEY, JSON.stringify(store)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(RESPONSES_EVENT));
}
export function useMonitoringResponses(accountId?: string) {
    const acct = accountId ?? NO_ACCOUNT;
    const [store, setStore] = useState<ResponseStore>(loadResponses);
    useEffect(() => {
        const h = () => setStore(loadResponses());
        window.addEventListener(RESPONSES_EVENT, h);
        window.addEventListener('storage', h);
        return () => { window.removeEventListener(RESPONSES_EVENT, h); window.removeEventListener('storage', h); };
    }, []);
    const responses = store[acct] ?? {};
    /** Record that an alert has been responded to (record updated). One response = resolved. */
    const markResponded = (alertId: string, kind: AlertResponse['kind'], detail?: string, by?: string) => {
        const cur = loadResponses();
        const acctMap = { ...(cur[acct] ?? {}) };
        acctMap[alertId] = { at: new Date().toISOString(), kind, detail, by };
        cur[acct] = acctMap;
        persistResponses(cur);
    };
    const clearResponse = (alertId: string) => {
        const cur = loadResponses();
        if (!cur[acct]?.[alertId]) return;
        const acctMap = { ...cur[acct] };
        delete acctMap[alertId];
        cur[acct] = acctMap;
        persistResponses(cur);
    };
    return { responses, markResponded, clearResponse };
}

/**
 * The default notification roles a carrier starts with — each ships with its checklist pre-selected
 * and a recipient auto-picked from the carrier's own users by title:
 *  • Admin — everything (carrier + drivers + assets)      → a super-admin / owner
 *  • Drivers Manager — all driver records                 → safety / compliance / driver lead
 *  • Asset Manager — all asset records                    → maintenance / fleet / equipment lead
 *  • Manager — everything (operational oversight)         → owner / GM / operations
 * Falls back to a role placeholder when no user matches, so the checklist is never left empty.
 */
export function defaultRolesFor(users: SeedUser[] = []): NotificationRole[] {
    const admin = pickUser(users, /super[- ]?admin|\badmin\b|owner|president/i);
    const driverMgr = pickUser(users, /driver|safety|compliance/i);
    const assetMgr = pickUser(users, /maintenance|fleet|equipment|asset/i);
    const gm = pickUser(users, /general manager|operations|owner|\bgm\b|director/i);
    const adminR = admin ?? gm ?? roleRecipient('Operations Manager');
    const driverR = driverMgr ?? gm ?? roleRecipient('Safety Manager');
    const assetR = assetMgr ?? gm ?? roleRecipient('Fleet Administrator');
    const managerR = gm ?? admin ?? roleRecipient('Operations Manager');
    return [
        { id: 'role-admin', name: 'Admin', enabled: true, carrier: true, allDrivers: true, allAssets: true, driverIds: [], assetIds: [], recipients: [adminR] },
        { id: 'role-drivers-manager', name: 'Drivers Manager', enabled: true, carrier: false, allDrivers: true, allAssets: false, driverIds: [], assetIds: [], recipients: [driverR] },
        { id: 'role-asset-manager', name: 'Asset Manager', enabled: true, carrier: false, allDrivers: false, allAssets: true, driverIds: [], assetIds: [], recipients: [assetR] },
        { id: 'role-manager', name: 'Manager', enabled: true, carrier: true, allDrivers: true, allAssets: true, driverIds: [], assetIds: [], recipients: [managerR] },
    ];
}

// ── Simple-mode assignment slots ──────────────────────────────────────
// The four canonical rules the "Simple" setup manages (by stable id) — one per scope + overdue
// escalation. Advanced mode can add more rules freely; these four stay in sync with Simple.
export interface SimpleSlot { key: 'carrier' | 'drivers' | 'assets' | 'overdue'; ruleId: string; label: string; sub: string; entity: RoutingEntity; severityFloor: Severity }
export const SIMPLE_SLOTS: SimpleSlot[] = [
    { key: 'carrier', ruleId: 'rule-carrier', label: 'Carrier records', sub: 'MC/DOT, IFTA, insurance…', entity: 'Carrier', severityFloor: 'low' },
    { key: 'drivers', ruleId: 'rule-drivers', label: 'Driver records', sub: 'Licenses, medicals, abstracts…', entity: 'Driver', severityFloor: 'low' },
    { key: 'assets', ruleId: 'rule-assets', label: 'Asset records', sub: 'Registrations, inspections…', entity: 'Asset', severityFloor: 'low' },
    { key: 'overdue', ruleId: 'rule-overdue', label: 'Escalate overdue', sub: 'Anything past its due date', entity: 'all', severityFloor: 'overdue' },
];

/** A user the seed can assign to (subset of AppUser). */
export interface SeedUser { id: string; name: string; email?: string; title?: string }
function pickUser(users: SeedUser[], re: RegExp): RoutingRecipient | null {
    // Skip testing/demo accounts (e.g. a "Demo Admin" whose title incidentally mentions Compliance),
    // then prefer someone whose title names an actual role over a passing mention.
    const candidates = users.filter(x => x.title && re.test(x.title) && !/\bdemo\b/i.test(x.title));
    const u = candidates.find(x => /manager|officer|coordinator|lead|director|supervisor/i.test(x.title!)) ?? candidates[0];
    return u ? { id: `user:${u.id}`, name: u.name, kind: 'user', email: u.email } : null;
}

/** De-duplicate recipients by id, preserving order. */
export function uniqRecipients(arr: RoutingRecipient[]): RoutingRecipient[] {
    const m = new Map<string, RoutingRecipient>();
    for (const r of arr) if (!m.has(r.id)) m.set(r.id, r);
    return [...m.values()];
}

/**
 * A default escalation ladder over the carrier's reminder schedule: every stage notifies `primary`,
 * and the FINAL (nearest-to-due) stage additionally escalates to `escalateR`. `days` defaults to the
 * standard 90/30/7. The base recipient list is the union (used as a fallback / "everyone involved").
 */
export function escalationLadder(primary: RoutingRecipient, escalateR: RoutingRecipient, days: number[] = DEFAULT_REMINDERS): { base: RoutingRecipient[]; stages: RoutingStage[] } {
    const desc = [...days].filter(d => d > 0).sort((a, b) => b - a);
    const lastIdx = desc.length - 1;
    const stages: RoutingStage[] = desc.map((d, i) => ({
        days: d,
        recipients: i === lastIdx ? uniqRecipients([primary, escalateR]) : [primary],
    }));
    return { base: uniqRecipients([primary, escalateR]), stages };
}

/**
 * The default rule set a carrier starts with — one assignment per scope + an overdue escalation.
 * Recipients are chosen from the carrier's own users by title (Safety/Compliance → carrier+drivers,
 * Maintenance/Fleet → assets, Owner/GM → escalation); falls back to role placeholders when no user
 * matches. So Acme auto-assigns Marcus Reed / Lily Chen / John Doe. Each scope ships with a per-stage
 * escalation ladder (early reminders → the owner; the final reminder also escalates to the GM).
 */
export function defaultRulesFor(users: SeedUser[] = []): RoutingRule[] {
    const safety = pickUser(users, /safety|compliance/i);
    const maint = pickUser(users, /maintenance|fleet|equipment/i);
    const owner = pickUser(users, /owner|general manager|president|director/i);
    const carrierR = safety ?? owner ?? roleRecipient('Safety Manager');
    const driverR = safety ?? owner ?? roleRecipient('Safety Manager');
    const assetR = maint ?? safety ?? roleRecipient('Fleet Administrator');
    const escalateR = owner ?? safety ?? roleRecipient('Compliance Lead');
    const both = { email: true, inApp: true };
    const carrierL = escalationLadder(carrierR, escalateR);
    const driverL = escalationLadder(driverR, escalateR);
    const assetL = escalationLadder(assetR, escalateR);
    return [
        { id: 'rule-carrier', name: `Carrier records → ${carrierR.name}`, enabled: true, entity: 'Carrier', types: [], severityFloor: 'low', recipients: carrierL.base, stages: carrierL.stages, channels: both },
        { id: 'rule-drivers', name: `Driver records → ${driverR.name}`, enabled: true, entity: 'Driver', types: [], severityFloor: 'low', recipients: driverL.base, stages: driverL.stages, channels: both },
        { id: 'rule-assets', name: `Asset records → ${assetR.name}`, enabled: true, entity: 'Asset', types: [], severityFloor: 'low', recipients: assetL.base, stages: assetL.stages, channels: both },
        { id: 'rule-overdue', name: `Overdue escalation → ${escalateR.name}`, enabled: true, entity: 'all', types: [], severityFloor: 'overdue', recipients: [escalateR], channels: both },
    ];
}
/** Role-placeholder defaults (no user directory available). */
export function defaultRules(): RoutingRule[] { return defaultRulesFor([]); }

export function useMonitoringRouting(accountId?: string, seedUsers?: SeedUser[]) {
    const acct = accountId ?? NO_ACCOUNT;
    const [store, setStore] = useState<Store>(loadStore);
    const [remStore, setRemStore] = useState<RemStore>(loadReminders);
    const [groupStore, setGroupStore] = useState<GroupStore>(loadGroups);
    const [roleStore, setRoleStore] = useState<RoleStore>(loadRoles);

    useEffect(() => {
        const h = () => setStore(loadStore());
        const rh = () => setRemStore(loadReminders());
        const gh = () => setGroupStore(loadGroups());
        const oh = () => setRoleStore(loadRoles());
        window.addEventListener(EVENT, h);
        window.addEventListener(REM_EVENT, rh);
        window.addEventListener(GROUPS_EVENT, gh);
        window.addEventListener(ROLES_EVENT, oh);
        window.addEventListener('storage', h);
        window.addEventListener('storage', rh);
        window.addEventListener('storage', gh);
        window.addEventListener('storage', oh);
        return () => {
            window.removeEventListener(EVENT, h); window.removeEventListener(REM_EVENT, rh); window.removeEventListener(GROUPS_EVENT, gh); window.removeEventListener(ROLES_EVENT, oh);
            window.removeEventListener('storage', h); window.removeEventListener('storage', rh); window.removeEventListener('storage', gh); window.removeEventListener('storage', oh);
        };
    }, []);

    // Seed this carrier's default ROLES the first time it's opened (Simple mode is now the default
    // config). Also migrate away the old canonical Simple rules (rule-carrier/…), whose job roles now
    // do, so they don't double-notify. Advanced rules the user added are left untouched.
    const CANONICAL_RULE_IDS = ['rule-carrier', 'rule-drivers', 'rule-assets', 'rule-overdue'];
    useEffect(() => {
        let seeded: Record<string, boolean> = {};
        try { const raw = localStorage.getItem(ROLES_SEEDED_KEY); if (raw) seeded = JSON.parse(raw); } catch { /* ignore */ }
        if (seeded[acct]) return;
        const cur = loadRoles();
        if (!cur[acct]) { cur[acct] = defaultRolesFor(seedUsers ?? []); persistRoles(cur); }
        // drop the superseded canonical rules if a previous version seeded them
        const rs = loadStore();
        if (rs[acct]?.some(r => CANONICAL_RULE_IDS.includes(r.id))) {
            rs[acct] = rs[acct].filter(r => !CANONICAL_RULE_IDS.includes(r.id));
            persist(rs);
        }
        seeded[acct] = true;
        try { localStorage.setItem(ROLES_SEEDED_KEY, JSON.stringify(seeded)); } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acct]);

    const rules = store[acct] ?? [];

    const writeRules = (next: RoutingRule[]) => {
        const cur = loadStore();
        cur[acct] = next;
        persist(cur);
    };
    const add = (rule: Omit<RoutingRule, 'id'>) => { writeRules([...(loadStore()[acct] ?? []), { ...rule, id: newId() }]); };
    const update = (id: string, patch: Partial<RoutingRule>) =>
        writeRules((loadStore()[acct] ?? []).map(r => (r.id === id ? { ...r, ...patch } : r)));
    const remove = (id: string) => writeRules((loadStore()[acct] ?? []).filter(r => r.id !== id));
    const duplicate = (id: string) => {
        const list = loadStore()[acct] ?? [];
        const src = list.find(r => r.id === id);
        if (!src) return;
        const copy: RoutingRule = { ...src, id: newId(), name: `${src.name} (copy)` };
        const idx = list.findIndex(r => r.id === id);
        writeRules([...list.slice(0, idx + 1), copy, ...list.slice(idx + 1)]);
    };
    const resetDefaults = () => writeRules(defaultRulesFor(seedUsers ?? []));
    /** Create-or-update a canonical rule by fixed id (used by Simple mode); pass null recipients to clear it. */
    const upsertRule = (rule: RoutingRule) => {
        const list = loadStore()[acct] ?? [];
        writeRules(list.some(r => r.id === rule.id) ? list.map(r => (r.id === rule.id ? rule : r)) : [...list, rule]);
    };

    // Reminder schedule — the lead times (days before due) at which reminders fire, carrier-wide.
    const reminders = (remStore[acct] ?? DEFAULT_REMINDERS).slice().sort((a, b) => b - a);
    const setReminders = (next: number[]) => {
        const cleaned = Array.from(new Set(next.filter(n => n > 0))).sort((a, b) => b - a);
        const cur = loadReminders();
        cur[acct] = cleaned.length ? cleaned : DEFAULT_REMINDERS;
        persistReminders(cur);
    };

    // Subject groups — reusable named sets of drivers/assets a checklist can target.
    const groups = groupStore[acct] ?? [];
    const writeGroups = (next: RoutingGroup[]) => { const cur = loadGroups(); cur[acct] = next; persistGroups(cur); };
    const addGroup = (g: Omit<RoutingGroup, 'id'>): RoutingGroup => {
        const created: RoutingGroup = { ...g, id: newGroupId() };
        writeGroups([...(loadGroups()[acct] ?? []), created]);
        return created;
    };
    const updateGroup = (id: string, patch: Partial<Omit<RoutingGroup, 'id'>>) => {
        const list = (loadGroups()[acct] ?? []).map(g => (g.id === id ? { ...g, ...patch } : g));
        writeGroups(list);
        // Re-materialise members onto every rule that targets this group so the resolver stays correct.
        const g = list.find(x => x.id === id);
        if (g) writeRules((loadStore()[acct] ?? []).map(r => (r.groupId === id ? { ...r, subjectIds: [...g.subjectIds], targetLabel: g.name } : r)));
    };
    const removeGroup = (id: string) => {
        writeGroups((loadGroups()[acct] ?? []).filter(g => g.id !== id));
        // Rules keep their last members but drop the (now dangling) group link.
        writeRules((loadStore()[acct] ?? []).map(r => (r.groupId === id ? { ...r, groupId: undefined } : r)));
    };

    // Notification roles (Simple mode).
    const roles = roleStore[acct] ?? [];
    const writeRoles = (next: NotificationRole[]) => { const cur = loadRoles(); cur[acct] = next; persistRoles(cur); };
    const addRole = (role: Omit<NotificationRole, 'id'>) => { writeRoles([...(loadRoles()[acct] ?? []), { ...role, id: newRoleId() }]); };
    const updateRole = (id: string, patch: Partial<Omit<NotificationRole, 'id'>>) =>
        writeRoles((loadRoles()[acct] ?? []).map(r => (r.id === id ? { ...r, ...patch } : r)));
    const removeRole = (id: string) => writeRoles((loadRoles()[acct] ?? []).filter(r => r.id !== id));
    const resetRoles = () => writeRoles(defaultRolesFor(seedUsers ?? []));

    return { rules, add, update, upsertRule, remove, duplicate, resetDefaults, reminders, setReminders, groups, addGroup, updateGroup, removeGroup, roles, addRole, updateRole, removeRole, resetRoles };
}
