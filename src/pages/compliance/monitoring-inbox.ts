import { useEffect, useMemo, useState } from 'react';
import { APP_USERS, driverIdOfUser, getManagedAccountIds, subscribeUsers, type AppUser } from '@/data/users.data';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { carriersOf } from '@/pages/users-roles/scope';
import { SAFETY_RECORDS, type SafetyRecord, type EntityId } from '@/pages/compliance/safety-software-catalog.data';
import { CARRIER_SUBJECT, readComplianceAll, subscribeComplianceData } from '@/pages/compliance/compliance-data-store';
import { customSafetyRecordsFor, subscribeCustomSafetyRecords } from '@/pages/compliance/safety-custom-records.data';
import {
    resolveRouting, roleMatches, roleNamesUser, routingFor, responsesFor, recipientsAtStage, subscribeMonitoringRouting,
    type RoutingRule,
} from '@/pages/compliance/monitoring-routing.data';
import { buildComplianceAlerts, PRIORITY_ORDER, type MonitoringAlert } from '@/pages/compliance/monitoring-alerts';
import { getConversations, subscribe as subscribeMessages } from '@/pages/messages/messages-store';

// ─────────────────────────────────────────────────────────────────────────────
// monitoring-inbox — what the signed-in person has been notified about.
//
// The Compliance Monitoring page shows, per alert, WHO is told (the "Notified" column). This
// is the same question asked the other way round: for ONE person, across every carrier they
// work on, which alerts name them — through a notification role or a routing rule — and
// have actually fired. Plus the requests and shares sent to them in Messages. It is what the
// bell in the top bar opens, so signing in as Marcus shows Marcus's alerts and signing in as
// Lily shows Lily's, from the same stores the monitoring page writes.
//
// Nothing here is persisted except what each person has already looked at.
// ─────────────────────────────────────────────────────────────────────────────

export interface InboxAlert {
    key: string;
    accountId: string;
    carrier: string;
    alert: MonitoringAlert;
    /** The notification roles and rules that put it in front of this person. */
    via: string[];
    channels: { email: boolean; inApp: boolean };
}

export interface InboxMessage {
    key: string;
    convId: string;
    /** What the thread is about — the record it was sent from, or the thread's own line. */
    about: string;
    preview: string;
    at: string;
    iso?: string;
}

export interface Inbox {
    alerts: InboxAlert[];
    messages: InboxMessage[];
    /** Every item's key, newest state — what "seen" is recorded against. */
    keys: string[];
    unseen: number;
    carriers: number;
}

const EMPTY: Inbox = { alerts: [], messages: [], keys: [], unseen: 0, carriers: 0 };

/** The recipient ids a person can be named by — a driver login answers to both. */
export function recipientIdsOf(u: AppUser): string[] {
    const d = driverIdOfUser(u);
    return d ? [`driver:${d}`, `user:${u.id}`] : [`user:${u.id}`];
}

/** Which carriers to look at: a Super Admin sees every carrier that has data; everyone else, theirs. */
function carrierIdsFor(u: AppUser, all: Record<string, unknown>): string[] {
    if (u.role !== 'super-admin') return carriersOf(u);
    const ids = new Set<string>();
    for (const k of Object.keys(all)) { const i = k.indexOf('::'); if (i > 0) ids.add(k.slice(0, i)); }
    return [...ids];
}

/** The same seed the monitoring pages use for a carrier's default notification roles. */
const seedUsersFor = (acct: string): AppUser[] =>
    APP_USERS.filter(x => x.status === 'Active' && (x.role === 'super-admin' || (getManagedAccountIds(x) ?? []).includes(acct)));

/** Has a reminder actually gone out? A dated alert once its first reminder day is reached, on the day, or overdue; a status watch once it is not simply fine. */
function fired(a: MonitoringAlert, activeDay: number | null): boolean {
    if (a.daysUntil !== null) return a.daysUntil <= 0 || activeDay !== null;
    return a.priority !== 'low';
}

/** Does this rule name the person at the stage in effect — directly, or as the alert's assigned owner? */
function ruleNames(rule: RoutingRule, mine: string[], alert: MonitoringAlert, activeDay: number | null): boolean {
    return recipientsAtStage(rule, activeDay).some(r =>
        mine.includes(r.id) || (r.kind === 'owner' && !!alert.assignee && mine.includes(`user:${alert.assignee.id}`)));
}

/** The monitoring alerts routed to this person, most urgent first. */
export function inboxAlertsFor(user: AppUser): InboxAlert[] {
    const all = readComplianceAll();
    const mine = recipientIdsOf(user);
    const out: InboxAlert[] = [];
    for (const acct of carrierIdsFor(user, all)) {
        const account = getAccountById(acct);
        if (!account) continue;
        const prefix = `${acct}::`;
        if (!Object.keys(all).some(k => k.startsWith(prefix))) continue; // nothing captured here yet
        const carrier = account.dbaName || account.legalName;
        const assets = getAssetsForAccount(acct);
        const drivers = getDriversForAccount(acct);
        const recordsById = new Map<string, SafetyRecord>();
        for (const r of [...customSafetyRecordsFor(acct), ...SAFETY_RECORDS]) recordsById.set(r.id, r);
        const labelForSubject = (entity: EntityId, subjectId: string): string => {
            if (subjectId === CARRIER_SUBJECT) return carrier;
            if (entity === 'Asset') { const a = assets.find(x => x.id === subjectId); return a ? `${a.unitNumber} · ${a.make} ${a.model}` : subjectId; }
            if (entity === 'Driver') return drivers.find(x => x.id === subjectId)?.name ?? subjectId;
            return subjectId;
        };
        const { rules, roles } = routingFor(acct, seedUsersFor(acct));
        const responses = responsesFor(acct);
        for (const alert of buildComplianceAlerts({ acct, all, recordsById, labelForSubject })) {
            if (responses[alert.id]) continue; // handled — the page shows it green, the bell drops it
            const r = resolveRouting(rules, alert, alert.reminders, roles, acct);
            if (!r.recipients.some(x => mine.includes(x.id))) continue;
            if (!fired(alert, r.activeDay)) continue;
            const via = [
                ...roles.filter(role => roleMatches(role, alert) && roleNamesUser(role, user, acct)).map(role => role.name),
                ...rules.filter(rule => r.ruleIds.includes(rule.id) && ruleNames(rule, mine, alert, r.activeDay)).map(rule => rule.name),
            ];
            out.push({ key: `alert:${acct}:${alert.id}`, accountId: acct, carrier, alert, via: [...new Set(via)], channels: r.channels });
        }
    }
    out.sort((a, b) => PRIORITY_ORDER.indexOf(a.alert.priority) - PRIORITY_ORDER.indexOf(b.alert.priority)
        || (a.alert.daysUntil ?? Infinity) - (b.alert.daysUntil ?? Infinity));
    return out;
}

/**
 * Requests and shares sent to this person in Messages — the threads the store names after
 * them (that is how an Ask / notify or a Share reaches somebody), newest first.
 */
export function inboxMessagesFor(user: AppUser): InboxMessage[] {
    const me = user.name.trim().toLowerCase();
    const out: InboxMessage[] = [];
    for (const c of getConversations()) {
        if (c.kind !== 'internal' || c.ai || c.name.trim().toLowerCase() !== me) continue;
        const last = [...c.messages].reverse().find(m => !m.system) ?? c.messages[c.messages.length - 1];
        if (!last) continue;
        out.push({ key: `msg:${c.id}:${last.id}`, convId: c.id, about: c.source?.label ?? c.role, preview: last.text, at: last.at, iso: last.iso });
    }
    return out.sort((a, b) => (b.iso ?? '').localeCompare(a.iso ?? ''));
}

// ── Seen ─────────────────────────────────────────────────────────────────────
// Per person: the item keys they have had in front of them. An alert's key does not change as
// it ages, so it is seen once; a thread's key carries its last message, so a new message
// makes it new again.
const SEEN_KEY = 'notification-seen-v1';
const SEEN_EVENT = 'notification-seen-change';
type SeenStore = Record<string, string[]>;

function readSeen(): SeenStore {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') as SeenStore; } catch { return {}; }
}
export function seenKeysOf(userId: string): Set<string> {
    return new Set(readSeen()[userId] ?? []);
}
export function markInboxSeen(userId: string, keys: string[]): void {
    const s = readSeen();
    // What is in front of them now comes first, so a bound never cuts the most urgent alerts
    // — those are the ones the badge is about.
    s[userId] = [...new Set([...keys, ...(s[userId] ?? [])])].slice(0, 4000);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch { /* private window */ }
    window.dispatchEvent(new Event(SEEN_EVENT));
}

type Items = { alerts: InboxAlert[]; messages: InboxMessage[] };
const NO_ITEMS: Items = { alerts: [], messages: [] };

function withSeen(user: AppUser, { alerts, messages }: Items): Inbox {
    const keys = [...alerts.map(a => a.key), ...messages.map(m => m.key)];
    const seen = seenKeysOf(user.id);
    return {
        alerts, messages, keys,
        unseen: keys.filter(k => !seen.has(k)).length,
        carriers: new Set(alerts.map(a => a.accountId)).size,
    };
}

export function inboxFor(user: AppUser): Inbox {
    return withSeen(user, { alerts: inboxAlertsFor(user), messages: inboxMessagesFor(user) });
}

/** The signed-in person's inbox, kept current as the stores behind it change. */
export function useInbox(user: AppUser | null): Inbox {
    const [tick, setTick] = useState(0);
    const [seenTick, setSeenTick] = useState(0);
    useEffect(() => {
        const bump = () => setTick(t => t + 1);
        const bumpSeen = () => setSeenTick(t => t + 1);
        const offs = [
            subscribeComplianceData(bump), subscribeCustomSafetyRecords(bump), subscribeMonitoringRouting(bump),
            subscribeMessages(bump), subscribeUsers(bump),
        ];
        window.addEventListener(SEEN_EVENT, bumpSeen);
        return () => { offs.forEach(f => f()); window.removeEventListener(SEEN_EVENT, bumpSeen); };
    }, []);
    // The alerts are rebuilt only when a store behind them changes; marking things seen just
    // recounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const items = useMemo<Items>(() => (user ? { alerts: inboxAlertsFor(user), messages: inboxMessagesFor(user) } : NO_ITEMS), [user?.id, tick]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => (user ? withSeen(user, items) : EMPTY), [user?.id, items, seenTick]);
}
