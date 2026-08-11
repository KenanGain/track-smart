import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
    BellRing, Building2, Truck, User, Search, CalendarClock, CircleAlert, AlertTriangle,
    Clock, Filter, Eye, Layers, Mail, Smartphone, ArrowRight, CircleDashed, ChevronsUpDown, ChevronUp,
    LayoutDashboard, CalendarDays, ChevronLeft, ChevronRight, X,
    History, Activity, Columns, ChevronDown, ExternalLink,
    Zap, Trash2, CalendarPlus, ClipboardList, RefreshCw, Check, UserPlus,
    Send, Upload, ClipboardCheck, Wrench, Sliders, Info, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubTabs } from '@/components/ui/SubTabs';
import {
    SAFETY_RECORDS, type SafetyRecord, type EntityId,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    useComplianceData, instancesOf, CARRIER_SUBJECT, emptyEntry,
    type DocVersion, type DataDocFile, type MonitoringConfig, type MonitorBasis, type RecordDataEntry,
} from '@/pages/compliance/compliance-data-store';
import { buildSampleEntry } from '@/pages/compliance/DefaultComplianceDataPage';
import { useCustomSafetyRecords } from '@/pages/compliance/safety-custom-records.data';
import { useMonitoringActions, type MonitoringAction, type MonitoringActionType } from '@/pages/compliance/monitoring-actions.data';
import { useMonitoringRouting, useMonitoringResponses, resolveRouting, activeStageDay, stageState, DEFAULT_REMINDERS, type ResolvedRouting, type AlertResponse } from '@/pages/compliance/monitoring-routing.data';
import { getAccountById } from '@/pages/accounts/accounts.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { APP_USERS, findUserById, getManagedAccountIds, type AppUser } from '@/data/users.data';

/**
 * Default Compliance Monitoring — the alerts view over everything captured on the
 * Default Compliances & Documents page. It scans the per-carrier data store for every
 * record whose current version (or active policy) has monitoring ENABLED, resolves the
 * monitored date (or status), and lists the upcoming notifications / alerts sorted by
 * date and priority. Read-only; carrier-scoped via the top CarrierSwitcher.
 */

const ENTITY_ICON: Record<EntityId, typeof Building2> = { Carrier: Building2, Asset: Truck, Driver: User };

// ── date helpers ──────────────────────────────────────────────────────
function todayStart(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function parseDate(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d); dt.setHours(0, 0, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
}
function fmtYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysUntil(s: string): number | null {
    const d = parseDate(s);
    return d ? Math.round((d.getTime() - todayStart().getTime()) / 86400000) : null;
}
function shiftDate(s: string, delta: number): string {
    const d = parseDate(s); if (!d) return s;
    d.setDate(d.getDate() + delta); return fmtYMD(d);
}
function fmtNice(s: string): string {
    const d = parseDate(s); if (!d) return s || '—';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── priority ──────────────────────────────────────────────────────────
type PriorityLevel = 'overdue' | 'critical' | 'high' | 'medium' | 'low';
const PRIORITY_ORDER: PriorityLevel[] = ['overdue', 'critical', 'high', 'medium', 'low'];
const PRIORITY_META: Record<PriorityLevel, { label: string; tone: string; dot: string; bar: string }> = {
    overdue: { label: 'Overdue', tone: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500', bar: 'bg-rose-500' },
    critical: { label: 'Critical', tone: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500', bar: 'bg-orange-500' },
    high: { label: 'High', tone: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500', bar: 'bg-amber-500' },
    medium: { label: 'Medium', tone: 'border-blue-200 bg-blue-50 text-blue-700', dot: 'bg-blue-500', bar: 'bg-blue-500' },
    low: { label: 'Low', tone: 'border-slate-200 bg-slate-50 text-slate-600', dot: 'bg-slate-400', bar: 'bg-slate-400' },
};
/**
 * Reminder-aware priority. Instead of arbitrary global day cutoffs, severity escalates relative
 * to the record's OWN monitoring reminders (e.g. [90,60,30]): critical inside the final reminder
 * window, high while any reminder is firing, then upcoming / scheduled. Falls back to 7/30 when a
 * record has no reminders configured.
 */
function priorityFor(d: number, reminders: number[]): PriorityLevel {
    if (d < 0) return 'overdue';
    const valid = reminders.filter(r => r > 0);
    const near = valid.length ? Math.min(...valid) : 7;   // nearest reminder to the due date (smallest lead)
    const far = valid.length ? Math.max(...valid) : 30;   // earliest reminder (largest lead)
    if (d <= near) return 'critical';
    if (d <= far) return 'high';
    if (d <= far + 90) return 'medium';
    return 'low';
}
/** Human explanation of each level for the "How priority works" legend. */
const PRIORITY_LEGEND: { level: PriorityLevel; when: string }[] = [
    { level: 'overdue', when: 'Past its due date — action needed now.' },
    { level: 'critical', when: 'Inside the record’s final reminder window (the nearest reminder has fired).' },
    { level: 'high', when: 'A reminder is actively firing — due within the earliest reminder lead.' },
    { level: 'medium', when: 'Upcoming — due within ~90 days after the reminder window.' },
    { level: 'low', when: 'Scheduled further out — nothing to do yet.' },
];
function priorityForStatus(status: string): PriorityLevel {
    const s = status.toLowerCase();
    if (/expired|incomplete|inactive/.test(s)) return 'high';
    if (/pending/.test(s)) return 'medium';
    return 'low';
}

// ── monitoring helpers (mirror DefaultComplianceDataPage) ─────────────
function monitoredDateFor(cfg: MonitoringConfig, v: { issueDate: string; expiryDate: string }): string {
    if (cfg.basis === 'status') return '';
    return cfg.basis === 'issue' ? v.issueDate : cfg.basis === 'custom' ? cfg.customDate : v.expiryDate;
}
const BASIS_LABEL: Record<MonitorBasis, string> = { issue: 'Issue date', expiry: 'Expiry date', custom: 'Custom date', status: 'Status' };
const reminderLabel = (d: number) => (d === 0 ? 'On date' : `${d}d`);
const STATUS_OPTIONS = ['Active', 'Pending', 'On File', 'Complete', 'Incomplete', 'Expired', 'Inactive'];
// Suggested renewal interval (days) from the monitoring recurrence id — used to pre-fill "set next date".
const RECURRENCE_DAYS: Record<string, number> = {
    monthly: 30, quarterly: 91, semiannually: 182, annually: 365, biennially: 730, triennially: 1095, fiveyearly: 1825,
};

// ── Notification type (what kind of alert this is) — derived from the monitoring basis ──
type AlertType = 'expiry' | 'review' | 'scheduled' | 'status';
const TYPE_ORDER: AlertType[] = ['expiry', 'review', 'scheduled', 'status'];
function typeForBasis(b: MonitorBasis): AlertType {
    return b === 'expiry' ? 'expiry' : b === 'issue' ? 'review' : b === 'custom' ? 'scheduled' : 'status';
}
const TYPE_META: Record<AlertType, { label: string; Icon: typeof BellRing; tone: string }> = {
    expiry: { label: 'Expiry / Renewal', Icon: CalendarClock, tone: 'border-blue-200 bg-blue-50 text-blue-700' },
    review: { label: 'Review', Icon: History, tone: 'border-violet-200 bg-violet-50 text-violet-700' },
    scheduled: { label: 'Scheduled', Icon: CalendarDays, tone: 'border-teal-200 bg-teal-50 text-teal-700' },
    status: { label: 'Status change', Icon: Activity, tone: 'border-amber-200 bg-amber-50 text-amber-700' },
};

// ── List columns (show/hide via the Columns dropdown) ─────────────────
type ColId = 'priority' | 'type' | 'monitors' | 'due' | 'assignee' | 'notified' | 'reminders' | 'channels' | 'nextAlert';
const COLUMNS: { id: ColId; label: string }[] = [
    { id: 'priority', label: 'Priority' },
    { id: 'type', label: 'Type' },
    { id: 'monitors', label: 'Monitors' },
    { id: 'due', label: 'Due / Status' },
    { id: 'assignee', label: 'Assigned to' },
    { id: 'notified', label: 'Notified' },
    { id: 'reminders', label: 'Reminders' },
    { id: 'channels', label: 'Channels' },
    { id: 'nextAlert', label: 'Next alert' },
];
// Keep the default list lean — the essentials only. Everything else stays one click away in Columns.
const DEFAULT_COLS: ColId[] = ['priority', 'due', 'notified'];

/** Convert any stored data: URL to a blob URL before opening (browsers block data: navigation); real file URLs open directly. */
function openFile(f: DataDocFile) {
    if (!f.url) return;
    if (f.url.startsWith('data:')) {
        try {
            const comma = f.url.indexOf(',');
            const mime = /data:([^;]+)/.exec(f.url.slice(0, comma))?.[1] || 'application/pdf';
            const bin = atob(f.url.slice(comma + 1));
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blobUrl = URL.createObjectURL(new Blob([bytes], { type: mime }));
            window.open(blobUrl, '_blank', 'noopener');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
            return;
        } catch { /* fall through */ }
    }
    window.open(f.url, '_blank', 'noopener');
}

// ── take-action modes ─────────────────────────────────────────────────
// self = resolve it yourself; the rest are outbound "ask / order" actions to a user or driver.
type RequestMode = 'request' | 'assign' | 'notify';
type ActionMode = 'self' | RequestMode;

// ── assignee ──────────────────────────────────────────────────────────
interface Assignee { id: string; name: string }
const GRADIENTS = ['from-blue-500 to-blue-700', 'from-emerald-500 to-emerald-700', 'from-amber-500 to-amber-700', 'from-violet-500 to-violet-700', 'from-rose-500 to-rose-700', 'from-teal-500 to-teal-700'];
function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
/** Avatar look for an assignee — a real user keeps their gradient/initials; a free-typed name gets a stable gradient. */
function avatarFor(assignee: Assignee): { initials: string; gradient: string } {
    const u = findUserById(assignee.id);
    if (u) return { initials: u.initials, gradient: u.avatarGradient };
    let h = 0; for (let i = 0; i < assignee.name.length; i++) h = (h * 31 + assignee.name.charCodeAt(i)) >>> 0;
    return { initials: initialsOf(assignee.name), gradient: GRADIENTS[h % GRADIENTS.length] };
}

// ── alert model ───────────────────────────────────────────────────────
interface Alert {
    id: string;
    record: SafetyRecord;
    entity: EntityId;
    subjectId: string;
    subjectLabel: string;
    instanceName?: string;
    instanceId?: string;
    basis: MonitorBasis;
    type: AlertType;
    isStatus: boolean;
    recurrence: string;
    date: string;              // monitored date (YYYY-MM-DD) or ''
    daysUntil: number | null;  // null for status watches
    status: string;
    numberValue: string;
    priority: PriorityLevel;
    reminders: number[];
    nextAlertDate: string;     // computed next notification fire date ('' if n/a)
    channels: { email: boolean; inApp: boolean };
    assignee?: Assignee;       // who's responsible for this alert
    file: DataDocFile | null;
}

function nextAlert(date: string, d: number | null, reminders: number[]): string {
    if (d === null || d < 0) return '';
    const future = reminders.filter(r => r < d);           // reminders that fire in the future (fire at date - r)
    if (future.length) return shiftDate(date, -Math.max(...future));
    return date;                                            // all reminders passed → the due date itself
}

type SortKey = 'date' | 'priority';

// A driver / asset the roster view lists.
interface RosterSubj { id: string; label: string; sub?: string; initials?: string }

export function DefaultComplianceMonitoringPage({ accountId, onNavigate, embedded, lockSubject }: {
    accountId?: string;
    onNavigate?: (path: string) => void;
    /** Embedded in an entity detail tab — hides the full-page header/chrome and page background. */
    embedded?: boolean;
    /** Lock the whole page to a single subject (asset/driver) — hides entity scope tabs + the roster switch. */
    lockSubject?: { entity: EntityId; subjectId: string; label: string };
}) {
    const account = accountId ? getAccountById(accountId) : undefined;
    const carrierName = account ? (account.dbaName || account.legalName) : 'the selected carrier';
    const { acct, all, getEntry, setEntry, setEntries } = useComplianceData(accountId);
    const { actions, log } = useMonitoringActions(acct);
    const assets = useMemo(() => getAssetsForAccount(acct), [acct]);
    const drivers = useMemo(() => getDriversForAccount(acct), [acct]);

    // Current user (for "by whom" on the activity log) + the users this carrier's alerts can be assigned to.
    const currentUser = useMemo(() => {
        try { const id = localStorage.getItem('app_current_user_id'); return id ? findUserById(id) : undefined; } catch { return undefined; }
    }, []);
    const currentUserName = currentUser?.name ?? 'You';
    const assignableUsers = useMemo<AppUser[]>(() => APP_USERS.filter(u =>
        u.status === 'Active' && (u.role === 'super-admin' || (getManagedAccountIds(u) ?? []).includes(acct))), [acct]);
    // Routing rules resolve the "Notified" column; seed a fresh carrier from its own users.
    // Reminders come from EACH record's own Monitoring & Notifications config (per-record), not a
    // carrier-wide schedule — so Reminders / Next alert / priority / stages follow that record.
    // `roles` = Simple-mode notification roles (additive to the Advanced rules).
    const { rules: routingRules, roles: routingRoles } = useMonitoringRouting(accountId, assignableUsers);
    // A single response per alert — set when its record is actually updated (new date / status /
    // document) via Take action. One response flips the alert green.
    const { responses, markResponded } = useMonitoringResponses(accountId);
    // Records this carrier can alert on = system defaults + this carrier's CUSTOM records, so custom
    // records (e.g. "Business License") also surface as alerts and deep-link back to their detail page.
    const { records: customRecords } = useCustomSafetyRecords(accountId);
    // Custom records first so, when seeding sample data, they land on the low (monitored) sample modes.
    const allRecords = useMemo(() => [...customRecords, ...SAFETY_RECORDS], [customRecords]);
    const recordsById = useMemo(() => {
        const m = new Map<string, SafetyRecord>();
        for (const r of allRecords) m.set(r.id, r);
        return m;
    }, [allRecords]);

    // "Load sample data" — populate the compliance-data store with monitored records across the
    // carrier + every asset & driver (reuses the Default C&D sample builder), so this page has alerts to test.
    const seedSampleData = () => {
        const items: { subjectId: string; recordId: string; entry: RecordDataEntry }[] = [];
        const push = (subjectId: string, entity: EntityId) =>
            allRecords.filter(r => r.entity === entity).forEach((r, i) =>
                items.push({ subjectId, recordId: r.id, entry: buildSampleEntry(r, i) ?? emptyEntry() }));
        push(CARRIER_SUBJECT, 'Carrier');
        for (const a of assets) push(a.id, 'Asset');
        for (const d of drivers) push(d.id, 'Driver');
        setEntries(items);
    };

    const [tab, setTab] = useState<'Dashboard' | 'Calendar' | 'Activity'>('Dashboard');
    const [actionAlert, setActionAlert] = useState<Alert | null>(null);
    const [search, setSearch] = useState('');
    const [entityFilter, setEntityFilter] = useState<'all' | EntityId>('all');
    const [priorityFilter, setPriorityFilter] = useState<'all' | PriorityLevel>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | AlertType>('all');
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc'); // asc = most urgent / soonest first
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    // Driver/Asset scopes: flat "Records" (alerts) view vs a per-subject roster. subjectFilter drills into one subject.
    const [subView, setSubView] = useState<'records' | 'roster'>('records');
    const [subjectFilter, setSubjectFilter] = useState<{ id: string; label: string } | null>(null);
    const [visibleCols, setVisibleCols] = useState<Set<ColId>>(() => new Set(DEFAULT_COLS));
    const toggleCol = (id: ColId) => setVisibleCols(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    // Click a sortable header: toggle direction if it's the active key, else switch to it (ascending).
    const sortBy = (key: SortKey) => { if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); else { setSortKey(key); setSortDir('asc'); } };
    const changeEntity = (e: 'all' | EntityId) => { setEntityFilter(e); setSubView('records'); setSubjectFilter(null); };
    const changeSubView = (v: 'records' | 'roster') => { setSubView(v); setSubjectFilter(null); };

    // Per-entity subject lists for the roster view.
    const driverSubjects = useMemo<RosterSubj[]>(() => drivers.map(d => ({ id: d.id, label: d.name, sub: d.driverType ?? undefined, initials: d.avatarInitials })), [drivers]);
    const assetSubjects = useMemo<RosterSubj[]>(() => assets.map(a => ({ id: a.id, label: a.unitNumber, sub: `${a.make} ${a.model}` })), [assets]);

    // Deep-link to the linked record in Default Compliances & Documents (opens its detail page there).
    const openLinked = (a: Alert) => {
        try { localStorage.setItem('dcd-focus', JSON.stringify({ acct, entity: a.entity, subjectId: a.subjectId, recordId: a.record.id })); } catch { /* ignore */ }
        onNavigate?.('/default-compliance-documents');
    };

    const labelForSubject = (entity: EntityId, subjectId: string): string => {
        if (subjectId === CARRIER_SUBJECT) return carrierName;
        if (entity === 'Asset') { const a = assets.find(x => x.id === subjectId); return a ? `${a.unitNumber} · ${a.make} ${a.model}` : subjectId; }
        if (entity === 'Driver') { const dr = drivers.find(x => x.id === subjectId); return dr ? dr.name : subjectId; }
        return subjectId;
    };

    const alerts = useMemo<Alert[]>(() => {
        const out: Alert[] = [];
        const prefix = `${acct}::`;
        for (const [key, entry] of Object.entries(all)) {
            if (!key.startsWith(prefix)) continue;
            const rest = key.slice(prefix.length);
            const sep = rest.indexOf('::');
            if (sep < 0) continue;
            const subjectId = rest.slice(0, sep);
            if (lockSubject && subjectId !== lockSubject.subjectId) continue; // embedded per-subject view
            const recordId = rest.slice(sep + 2);
            const record = recordsById.get(recordId);
            if (!record) continue;
            const subjectLabel = labelForSubject(record.entity, subjectId);

            const items: { v: DocVersion; instanceName?: string; instanceId?: string }[] = [];
            const insts = instancesOf(entry);
            if (insts.length) { for (const inst of insts) { const c = inst.versions[0]; if (c) items.push({ v: c, instanceName: inst.name, instanceId: inst.id }); } }
            else { const c = entry.versions[0]; if (c) items.push({ v: c }); }

            for (const { v, instanceName, instanceId } of items) {
                const cfg = v.monitoring;
                if (!cfg?.enabled) continue;
                const isStatus = cfg.basis === 'status';
                const date = isStatus ? '' : monitoredDateFor(cfg, v);
                if (!isStatus && !date) continue; // enabled but no date captured → nothing to alert on yet
                const d = date ? daysUntil(date) : null;
                // Reminders / next-alert / priority follow THIS record's own reminder checkboxes
                // (Monitoring & Notifications panel), falling back to the standard 90/30/7 when unset.
                const recReminders = (cfg.reminders && cfg.reminders.length ? cfg.reminders : DEFAULT_REMINDERS).slice().sort((a, b) => b - a);
                const priority = isStatus ? priorityForStatus(v.status) : priorityFor(d ?? 9999, recReminders);
                out.push({
                    id: `${key}::${instanceId ?? ''}::${v.id}`,
                    record, entity: record.entity, subjectId, subjectLabel, instanceName, instanceId,
                    basis: cfg.basis, type: typeForBasis(cfg.basis), isStatus, recurrence: cfg.recurrence || 'annually',
                    date, daysUntil: d, status: v.status, numberValue: v.numberValue,
                    priority, reminders: recReminders,
                    nextAlertDate: nextAlert(date, d, recReminders),
                    channels: cfg.channels, assignee: cfg.assignee, file: v.files[0] ?? null,
                });
            }
        }
        return out;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [all, acct, assets, drivers, carrierName, lockSubject, recordsById]);

    // Per-entity counts (drive the Carrier / Drivers / Assets scope tabs).
    const entityCounts = useMemo(() => {
        const c: Record<'all' | EntityId, number> = { all: alerts.length, Carrier: 0, Asset: 0, Driver: 0 };
        for (const a of alerts) c[a.entity]++;
        return c;
    }, [alerts]);

    // The Dashboard is scoped to the selected entity tab (health + KPIs + list all follow it).
    const scopedAlerts = useMemo(
        () => (entityFilter === 'all' ? alerts : alerts.filter(a => a.entity === entityFilter)),
        [alerts, entityFilter],
    );

    const counts = useMemo(() => {
        let overdue = 0, week = 0, month = 0;
        for (const a of scopedAlerts) {
            if (a.daysUntil === null) continue;
            if (a.daysUntil < 0) overdue++;
            else if (a.daysUntil <= 7) week++;
            if (a.daysUntil >= 0 && a.daysUntil <= 30) month++;
        }
        return { overdue, week, month, total: scopedAlerts.length };
    }, [scopedAlerts]);

    // Dated alerts only (status watches have no date → not shown on the calendar).
    const dateAlerts = useMemo(() => alerts.filter(a => !a.isStatus && a.date), [alerts]);

    // Compliance health score (weighted by each item's priority) — drives the health meter.
    const health = useMemo(() => {
        const W: Record<PriorityLevel, number> = { overdue: 0, critical: 35, high: 65, medium: 88, low: 100 };
        let sum = 0, overdue = 0, dueSoon = 0, onTrack = 0;
        for (const a of scopedAlerts) {
            sum += W[a.priority];
            if (a.priority === 'overdue') overdue++;
            else if (a.priority === 'critical' || a.priority === 'high') dueSoon++;
            else onTrack++;
        }
        const score = scopedAlerts.length ? Math.round(sum / scopedAlerts.length) : 100;
        return { score, overdue, dueSoon, onTrack, total: scopedAlerts.length };
    }, [scopedAlerts]);

    // ── Actions on an alert (update the compliance-data store + record to the activity log) ──
    const applyToCurrent = (a: Alert, fn: (v: DocVersion) => DocVersion) => {
        const entry = getEntry(a.subjectId, a.record.id);
        if (a.instanceId && entry.instances?.length) {
            const instances = entry.instances.map(inst => inst.id === a.instanceId
                ? { ...inst, versions: inst.versions.map((v, i) => (i === 0 ? fn(v) : v)) } : inst);
            setEntry(a.subjectId, a.record.id, { ...entry, instances });
        } else {
            setEntry(a.subjectId, a.record.id, { ...entry, versions: entry.versions.map((v, i) => (i === 0 ? fn(v) : v)) });
        }
    };
    const logBase = (a: Alert) => ({ recordId: a.record.id, subjectId: a.subjectId, instanceName: a.instanceName, recordName: a.record.recordName, subjectLabel: a.subjectLabel, by: currentUserName });
    const setNextDate = (a: Alert, newDate: string) => {
        if (!newDate) return;
        applyToCurrent(a, v => (a.basis === 'custom'
            ? { ...v, monitoring: { ...v.monitoring, customDate: newDate } }
            : a.basis === 'issue' ? { ...v, issueDate: newDate } : { ...v, expiryDate: newDate }));
        log({ ...logBase(a), type: 'renewed', detail: `Next ${BASIS_LABEL[a.basis].toLowerCase()} set to ${fmtNice(newDate)}` });
        markResponded(a.id, 'date', `date set to ${fmtNice(newDate)}`, currentUserName);
        setActionAlert(null);
    };
    const updateStatus = (a: Alert, status: string) => {
        applyToCurrent(a, v => ({ ...v, status }));
        log({ ...logBase(a), type: 'status', detail: `Status updated to “${status}”` });
        markResponded(a.id, 'status', `status set to “${status}”`, currentUserName);
        setActionAlert(null);
    };
    const removeMonitoring = (a: Alert) => {
        applyToCurrent(a, v => ({ ...v, monitoring: { ...v.monitoring, enabled: false } }));
        log({ ...logBase(a), type: 'removed', detail: 'Removed from monitoring' });
        setActionAlert(null);
    };
    const assignTo = (a: Alert, assignee: Assignee | null) => {
        applyToCurrent(a, v => ({ ...v, monitoring: { ...v.monitoring, assignee: assignee ?? undefined } }));
        log({ ...logBase(a), type: 'assigned', detail: assignee ? `Assigned to ${assignee.name}` : 'Assignment cleared' });
        setActionAlert(null);
    };
    // Ask / order: request a document, assign a review, or notify — to a user or driver.
    const sendRequest = (a: Alert, p: { mode: RequestMode; recipient: Assignee; channel: 'email' | 'inApp'; dueDate: string }) => {
        const via = p.channel === 'email' ? 'email' : 'in-app';
        if (p.mode !== 'notify') applyToCurrent(a, v => ({ ...v, monitoring: { ...v.monitoring, assignee: p.recipient } }));
        const due = p.dueDate ? ` · due ${fmtNice(p.dueDate)}` : '';
        const detail = p.mode === 'request' ? `Requested document from ${p.recipient.name} · ${via}${due}`
            : p.mode === 'assign' ? `Assigned review to ${p.recipient.name} · ${via}${due}`
                : `Reminder sent to ${p.recipient.name} · ${via}`;
        const type: MonitoringActionType = p.mode === 'assign' ? 'assigned' : p.mode === 'request' ? 'requested' : 'notified';
        log({ ...logBase(a), type, detail });
        setActionAlert(null);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return scopedAlerts.filter(a => {
            if (subjectFilter && a.subjectId !== subjectFilter.id) return false;
            if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
            if (typeFilter !== 'all' && a.type !== typeFilter) return false;
            if (q) {
                const hay = `${a.record.recordName} ${a.record.description} ${a.subjectLabel} ${a.instanceName ?? ''} ${a.numberValue} ${TYPE_META[a.type].label} ${BASIS_LABEL[a.basis]} ${a.record.monitorType ?? ''} ${a.status} ${a.assignee?.name ?? ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [scopedAlerts, search, priorityFilter, typeFilter, subjectFilter]);

    const sorted = useMemo(() => {
        const arr = [...filtered];
        if (sortKey === 'priority') {
            arr.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
                || (a.daysUntil ?? Infinity) - (b.daysUntil ?? Infinity));
        } else {
            arr.sort((a, b) => (a.daysUntil ?? Infinity) - (b.daysUntil ?? Infinity)
                || PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
        }
        if (sortDir === 'desc') arr.reverse();
        return arr;
    }, [filtered, sortKey, sortDir]);

    // Pagination (system list pattern — mirrors SubjectRoster / AllRecordsView on the Default C&D page).
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);
    useEffect(() => { setPage(1); }, [search, entityFilter, priorityFilter, typeFilter, sortKey, sortDir, pageSize, subjectFilter, subView]);

    // Records | Drivers/Assets view switch is only offered on the Driver & Asset scopes.
    const showSwitch = entityFilter === 'Driver' || entityFilter === 'Asset';
    const rosterSubjects = entityFilter === 'Driver' ? driverSubjects : assetSubjects;
    const isRoster = showSwitch && subView === 'roster';

    const selectCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    return (
        <div className={embedded ? '' : 'flex-1 bg-slate-50 min-h-screen'}>
            {/* Header — hidden in embedded (entity-detail tab) mode */}
            <div className={embedded ? '' : 'bg-white border-b border-slate-200'}>
                {!embedded && (
                <div className="px-4 sm:px-8 pt-5 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <BellRing size={20} />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-slate-900">Default Compliance Monitoring</h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Upcoming notifications &amp; alerts from <span className="font-semibold text-slate-700">{carrierName}</span>’s compliance &amp; document records — by date and priority.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {account && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                                <Building2 size={15} /> {carrierName}
                            </span>
                        )}
                        <button type="button" onClick={seedSampleData}
                            title="Populate the carrier plus every asset & driver with monitored sample records so you can test this page"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                            <Sparkles size={15} className="text-amber-500" /> Load sample data
                        </button>
                        {onNavigate && (
                            <button type="button" onClick={() => onNavigate('/settings/default-compliance-monitoring')}
                                title="Manage which notifications go to whom"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                <Sliders size={15} /> Notification routing
                            </button>
                        )}
                    </div>
                </div>
                )}
                <div className={embedded ? '' : 'px-4 sm:px-8 mt-4'}>
                    <SubTabs
                        tabs={[
                            { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, count: alerts.length },
                            { id: 'Calendar', label: 'Calendar', icon: CalendarDays, count: dateAlerts.length },
                            { id: 'Activity', label: 'Activity Log', icon: ClipboardList, count: actions.length },
                        ]}
                        activeId={tab}
                        onChange={setTab}
                        bordered={false}
                    />
                </div>
            </div>

            <div className={embedded ? 'pt-5 space-y-5' : 'px-4 sm:px-8 py-6 space-y-5'}>
                {tab === 'Dashboard' ? (
                <>
                {/* Compliance health meter */}
                <HealthMeter health={health} scope={entityFilter} />

                {/* KPI tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <KpiTile label="Overdue" value={counts.overdue} Icon={AlertTriangle} accent="rose" />
                    <KpiTile label="Due this week" value={counts.week} Icon={CircleAlert} accent="orange" />
                    <KpiTile label="Due in 30 days" value={counts.month} Icon={CalendarClock} accent="amber" />
                    <KpiTile label="Monitored items" value={counts.total} Icon={BellRing} accent="blue" />
                </div>

                {/* List card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    {/* Entity scope tabs — atop the list, like the category tabs on Default Compliances & Documents.
                        Driver/Asset scopes also get a Records | Drivers/Assets view switch on the right.
                        Hidden when locked to a single subject (embedded per-subject monitoring). */}
                    {!lockSubject && (
                    <EntityScopeTabs value={entityFilter} counts={entityCounts} onChange={changeEntity}
                        right={showSwitch ? (
                            <SubViewSwitch value={subView} onChange={changeSubView}
                                label={entityFilter === 'Driver' ? 'Drivers' : 'Assets'} Icon={entityFilter === 'Driver' ? User : Truck}
                                recordCount={scopedAlerts.length} subjectCount={rosterSubjects.length} />
                        ) : undefined} />
                    )}

                    {isRoster ? (
                        <SubjectAlertRoster entity={entityFilter as EntityId} subjects={rosterSubjects} alerts={scopedAlerts}
                            onOpen={(id, label) => { setSubjectFilter({ id, label }); setSubView('records'); }} />
                    ) : (
                    <>
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 flex-wrap">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records, subject, number…"
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                        </div>
                        {subjectFilter && (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-blue-700 whitespace-nowrap">
                                {subjectFilter.label}
                                <button type="button" onClick={() => setSubjectFilter(null)} className="text-blue-400 hover:text-blue-700"><X size={13} /></button>
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400"><Filter size={13} /></span>
                        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'all' | PriorityLevel)} className={selectCls} title="Filter by priority">
                            <option value="all">All priorities</option>
                            {PRIORITY_ORDER.map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                        </select>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as 'all' | AlertType)} className={selectCls} title="Filter by notification type">
                            <option value="all">All types</option>
                            {TYPE_ORDER.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
                        </select>
                        <ColumnsDropdown visible={visibleCols} onToggle={toggleCol} />
                        <div className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                            <ChevronsUpDown size={13} className="text-slate-400" /> Sort
                            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className={selectCls} title="Sort by">
                                <option value="date">By date (soonest)</option>
                                <option value="priority">By priority</option>
                            </select>
                        </div>
                    </div>

                    {sorted.length === 0 ? (
                        <EmptyState hasAny={alerts.length > 0} onNavigate={onNavigate} onLoadSample={seedSampleData} />
                    ) : (
                        <>
                        {/* Mobile / narrow: stacked cards — column-driven, same as the table */}
                        <div className="lg:hidden divide-y divide-slate-100">
                            {pageRows.map(a => <AlertCard key={a.id} a={a} routing={resolveRouting(routingRules, a, a.reminders, routingRoles)} response={responses[a.id]} visibleCols={visibleCols} onOpenLinked={onNavigate ? openLinked : undefined} onTakeAction={setActionAlert} />)}
                        </div>
                        {/* Desktop: full table */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full min-w-[820px]">
                                <thead className="border-b border-slate-200 bg-slate-50/50">
                                    <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        <th className="px-4 py-2.5 pl-5">Record &amp; Subject</th>
                                        {COLUMNS.filter(c => visibleCols.has(c.id)).map(c => {
                                            const sortForCol: SortKey | null = c.id === 'priority' ? 'priority' : c.id === 'due' ? 'date' : null;
                                            if (!sortForCol) return <th key={c.id} className="px-4 py-2.5 whitespace-nowrap">{c.label}</th>;
                                            const active = sortKey === sortForCol;
                                            return (
                                                <th key={c.id} className="px-4 py-2.5 whitespace-nowrap">
                                                    <button type="button" onClick={() => sortBy(sortForCol)}
                                                        className={cn('inline-flex items-center gap-1 uppercase tracking-wider hover:text-slate-700', active ? 'text-blue-600' : 'text-slate-500')}>
                                                        {c.label}
                                                        {active ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronsUpDown size={12} className="text-slate-300" />}
                                                    </button>
                                                </th>
                                            );
                                        })}
                                        <th className="px-4 py-2.5 pr-5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pageRows.map(a => <AlertRow key={a.id} a={a} routing={resolveRouting(routingRules, a, a.reminders, routingRoles)} response={responses[a.id]} visibleCols={visibleCols} onOpenLinked={onNavigate ? openLinked : undefined} onTakeAction={setActionAlert} />)}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}

                    {total > 0 && (
                        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap">
                            <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
                                <label className="flex items-center gap-1.5">
                                    Rows per page
                                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                        {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </label>
                                <span className="tabular-nums">{total === 0 ? '0' : `${start + 1}–${Math.min(start + pageSize, total)}`} of {total}</span>
                                {onNavigate && (
                                    <button type="button" onClick={() => onNavigate('/default-compliance-documents')}
                                        className="hidden sm:inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700">
                                        Manage in Default Compliances &amp; Documents <ArrowRight size={13} />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                                <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                                    className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                    </>
                    )}
                </div>
                </>
                ) : tab === 'Calendar' ? (
                    <MonitoringCalendar dateAlerts={dateAlerts} />
                ) : (
                    <ActivityLog actions={actions} />
                )}
            </div>

            {actionAlert && (
                <ActionModal
                    a={actionAlert}
                    actions={actions.filter(x => x.recordId === actionAlert.record.id && x.subjectId === actionAlert.subjectId)}
                    users={assignableUsers}
                    drivers={drivers}
                    onSetNextDate={setNextDate}
                    onUpdateStatus={updateStatus}
                    onRemove={removeMonitoring}
                    onAssign={assignTo}
                    onSend={sendRequest}
                    onClose={() => setActionAlert(null)}
                />
            )}
        </div>
    );
}

// ── Columns dropdown (show/hide list columns) ─────────────────────────
function ColumnsDropdown({ visible, onToggle }: { visible: Set<ColId>; onToggle: (id: ColId) => void }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="relative">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
                <Columns size={14} /> Columns <ChevronDown size={13} className="text-slate-400" />
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white shadow-lg p-1.5">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
                        {COLUMNS.map(c => (
                            <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer text-[13px] text-slate-700">
                                <input type="checkbox" checked={visible.has(c.id)} onChange={() => onToggle(c.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                {c.label}
                            </label>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// ── Entity scope — underline tab row atop the list card (All · Carrier · Drivers · Assets) ──
// Mirrors the category-tab bar on the Default Compliances & Documents list card. Scopes the
// dashboard (health + KPIs + list) to the selected entity.
const SCOPE_TABS: { id: 'all' | EntityId; label: string; Icon: typeof Layers }[] = [
    { id: 'all', label: 'All entities', Icon: Layers },
    { id: 'Carrier', label: 'Carrier', Icon: Building2 },
    { id: 'Driver', label: 'Drivers', Icon: User },
    { id: 'Asset', label: 'Assets', Icon: Truck },
];
function EntityScopeTabs({ value, counts, onChange, right }: {
    value: 'all' | EntityId;
    counts: Record<'all' | EntityId, number>;
    onChange: (v: 'all' | EntityId) => void;
    right?: ReactNode;
}) {
    return (
        <div className="flex items-end justify-between gap-2 px-4 pt-3 border-b border-slate-100">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {SCOPE_TABS.map(t => {
                    const active = value === t.id;
                    return (
                        <button key={t.id} type="button" onClick={() => onChange(t.id)}
                            className={cn('inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                                active ? 'text-blue-600 border-blue-600' : 'text-slate-500 hover:text-slate-800 border-transparent')}>
                            <t.Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                            {t.label}
                            <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{counts[t.id]}</span>
                        </button>
                    );
                })}
            </div>
            {right && <div className="shrink-0 pb-1.5">{right}</div>}
        </div>
    );
}

// ── Records | Drivers/Assets view switch (mirrors the SubViewSwitch on the Default C&D page) ──
function SubViewSwitch({ value, onChange, label, Icon, recordCount, subjectCount }: {
    value: 'records' | 'roster'; onChange: (v: 'records' | 'roster') => void;
    label: string; Icon: typeof Truck; recordCount: number; subjectCount: number;
}) {
    const opts = [
        { id: 'records' as const, label: 'Records', Icon: Layers, count: recordCount },
        { id: 'roster' as const, label, Icon, count: subjectCount },
    ];
    return (
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/70 p-0.5">
            {opts.map(o => {
                const active = value === o.id;
                return (
                    <button key={o.id} type="button" onClick={() => onChange(o.id)}
                        className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors',
                            active ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                        <o.Icon size={13} className={active ? 'text-blue-600' : 'text-slate-400'} /> {o.label}
                        <span className={cn('inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums', active ? 'bg-blue-50 text-blue-600' : 'bg-slate-200/70 text-slate-500')}>{o.count}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ── Subject roster (per-driver / per-asset monitoring summary) ────────
interface RosterRow { subject: RosterSubj; monitored: number; overdue: number; dueSoon: number; onTrack: number; worst: PriorityLevel | null }
function CountPill({ n, tone }: { n: number; tone: string }) {
    if (n === 0) return <span className="text-[12px] text-slate-300">—</span>;
    return <span className={cn('inline-flex min-w-[22px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums', tone)}>{n}</span>;
}
function SubjectAlertRoster({ entity, subjects, alerts, onOpen }: {
    entity: EntityId; subjects: RosterSubj[]; alerts: Alert[]; onOpen: (id: string, label: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<'priority' | 'name' | 'monitored'>('priority');
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(1);
    useEffect(() => { setPage(1); }, [search, sortKey, pageSize]);

    const bySubject = useMemo(() => {
        const m = new Map<string, Alert[]>();
        for (const a of alerts) { const arr = m.get(a.subjectId); if (arr) arr.push(a); else m.set(a.subjectId, [a]); }
        return m;
    }, [alerts]);

    const rows = useMemo<RosterRow[]>(() => subjects.map(s => {
        const list = bySubject.get(s.id) ?? [];
        let overdue = 0, dueSoon = 0, onTrack = 0, worstIdx = 99;
        for (const a of list) {
            if (a.priority === 'overdue') overdue++;
            else if (a.priority === 'critical' || a.priority === 'high') dueSoon++;
            else onTrack++;
            worstIdx = Math.min(worstIdx, PRIORITY_ORDER.indexOf(a.priority));
        }
        return { subject: s, monitored: list.length, overdue, dueSoon, onTrack, worst: worstIdx < 99 ? PRIORITY_ORDER[worstIdx] : null };
    }), [subjects, bySubject]);

    const kpis = useMemo(() => {
        let withOverdue = 0, allClear = 0, monitored = 0;
        for (const r of rows) { monitored += r.monitored; if (r.overdue > 0) withOverdue++; if (r.monitored > 0 && r.overdue === 0 && r.dueSoon === 0) allClear++; }
        return { total: rows.length, withOverdue, allClear, monitored };
    }, [rows]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? rows.filter(r => `${r.subject.label} ${r.subject.sub ?? ''}`.toLowerCase().includes(q)) : rows;
    }, [rows, search]);
    const sorted = useMemo(() => {
        const arr = [...filtered];
        if (sortKey === 'name') arr.sort((a, b) => a.subject.label.localeCompare(b.subject.label));
        else if (sortKey === 'monitored') arr.sort((a, b) => b.monitored - a.monitored || a.subject.label.localeCompare(b.subject.label));
        else arr.sort((a, b) => (b.overdue - a.overdue) || (b.dueSoon - a.dueSoon) || (b.monitored - a.monitored) || a.subject.label.localeCompare(b.subject.label));
        return arr;
    }, [filtered, sortKey]);

    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const pageRows = sorted.slice(start, start + pageSize);

    const noun = entity === 'Driver' ? 'Drivers' : 'Assets';
    const SubjIcon = entity === 'Driver' ? User : Truck;
    const selectCls = 'h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

    return (
        <div>
            {/* KPI tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-4">
                <KpiTile label={noun} value={kpis.total} Icon={SubjIcon} accent="blue" />
                <KpiTile label="With overdue" value={kpis.withOverdue} Icon={AlertTriangle} accent="rose" />
                <KpiTile label="All clear" value={kpis.allClear} Icon={Check} accent="emerald" />
                <KpiTile label="Monitored items" value={kpis.monitored} Icon={BellRing} accent="amber" />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 pb-3 border-b border-slate-100 flex-wrap">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${noun.toLowerCase()}…`}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
                </div>
                <div className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                    <ChevronsUpDown size={13} className="text-slate-400" /> Sort
                    <select value={sortKey} onChange={e => setSortKey(e.target.value as 'priority' | 'name' | 'monitored')} className={selectCls} title="Sort by">
                        <option value="priority">Most urgent</option>
                        <option value="monitored">Most monitored</option>
                        <option value="name">Name (A–Z)</option>
                    </select>
                </div>
            </div>

            {total === 0 ? (
                <div className="px-6 py-14 text-center">
                    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><SubjIcon size={22} /></div>
                    <h3 className="text-base font-bold text-slate-800">No {noun.toLowerCase()} to show</h3>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">This carrier has no {noun.toLowerCase()} matching your search.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px]">
                        <thead className="border-b border-slate-200 bg-slate-50/50">
                            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <th className="px-4 py-2.5 pl-5">{noun.slice(0, -1)}</th>
                                <th className="px-4 py-2.5 whitespace-nowrap">Monitored</th>
                                <th className="px-4 py-2.5 whitespace-nowrap">Overdue</th>
                                <th className="px-4 py-2.5 whitespace-nowrap">Due soon</th>
                                <th className="px-4 py-2.5 whitespace-nowrap">On track</th>
                                <th className="px-4 py-2.5 whitespace-nowrap">Status</th>
                                <th className="px-4 py-2.5 pr-5 text-right">View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageRows.map(r => (
                                <tr key={r.subject.id} onClick={() => onOpen(r.subject.id, r.subject.label)}
                                    className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer">
                                    <td className="px-4 py-3 pl-5">
                                        <div className="flex items-center gap-2.5 min-w-[160px]">
                                            {r.subject.initials
                                                ? <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold flex items-center justify-center shrink-0">{r.subject.initials}</div>
                                                : <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0"><SubjIcon size={15} /></div>}
                                            <div className="min-w-0">
                                                <div className="text-[13px] font-semibold text-slate-800 truncate">{r.subject.label}</div>
                                                {r.subject.sub && <div className="text-[11px] text-slate-400 truncate">{r.subject.sub}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-700 tabular-nums">{r.monitored}</td>
                                    <td className="px-4 py-3"><CountPill n={r.overdue} tone="bg-rose-50 text-rose-700" /></td>
                                    <td className="px-4 py-3"><CountPill n={r.dueSoon} tone="bg-amber-50 text-amber-700" /></td>
                                    <td className="px-4 py-3"><CountPill n={r.onTrack} tone="bg-emerald-50 text-emerald-700" /></td>
                                    <td className="px-4 py-3">
                                        {r.monitored === 0
                                            ? <span className="text-[11px] text-slate-400">Not monitored</span>
                                            : r.overdue === 0 && r.dueSoon === 0
                                                ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><Check size={11} /> All clear</span>
                                                : r.worst && <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', PRIORITY_META[r.worst].tone)}><span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_META[r.worst].dot)} /> {PRIORITY_META[r.worst].label}</span>}
                                    </td>
                                    <td className="px-4 py-3 pr-5 text-right"><ChevronRight size={16} className="inline text-slate-300" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > 0 && (
                <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 flex-wrap">
                    <div className="flex items-center gap-3 text-[12px] text-slate-500">
                        <label className="flex items-center gap-1.5">
                            Rows per page
                            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </label>
                        <span className="tabular-nums">{`${start + 1}–${Math.min(start + pageSize, total)}`} of {total}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {totalPages}</span>
                        <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Reminder-stage chips ──────────────────────────────────────────────
// Renders the schedule (90d/30d/7d) with the CURRENT stage solid-blue, already-fired stages
// light-blue, and not-yet-reached stages a muted outline — so it's obvious which reminder is live.
function StageChips({ reminders, daysUntil, isStatus, size = 'sm' }: { reminders: number[]; daysUntil: number | null; isStatus: boolean; size?: 'sm' | 'md' }) {
    if (isStatus) return <span className="text-[11px] text-slate-400">On change</span>;
    if (!reminders.length) return <span className="text-[11px] text-slate-400">—</span>;
    const activeDay = activeStageDay(daysUntil, reminders);
    const desc = [...reminders].sort((x, y) => y - x);
    const pad = size === 'md' ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]';
    return (
        <div className="flex flex-wrap items-center gap-1">
            {desc.map(r => {
                const st = stageState(r, daysUntil, activeDay);
                return (
                    <span key={r} title={st === 'active' ? 'Current stage — notifying now' : st === 'past' ? 'Already sent' : 'Upcoming'}
                        className={cn('inline-flex items-center rounded border font-semibold', pad,
                            st === 'active' ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                : st === 'past' ? 'bg-blue-50 border-blue-200 text-blue-600'
                                    : 'bg-slate-50 border-slate-200 text-slate-400')}>
                        {reminderLabel(r)}
                    </span>
                );
            })}
        </div>
    );
}

/** Small "stage" caption tying the Notified list to the active reminder (only when escalation is on). */
function StageCaption({ routing }: { routing: ResolvedRouting }) {
    if (!routing.staged || routing.activeDay === null) return null;
    return <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600"><BellRing size={10} /> at {reminderLabel(routing.activeDay)} stage</span>;
}

// ── Notified + response status ────────────────────────────────────────
// The recipients an alert routes to (from Settings ▸ roles) + a single RESPONSE badge: green once the
// record has been updated (date / status / document) via Take action, amber while still awaiting.
const RESPONSE_KIND_LABEL: Record<AlertResponse['kind'], string> = { date: 'date updated', document: 'document added', status: 'status updated' };
function NotifiedRecipients({ recipients, response, max = 3 }: {
    recipients: ResolvedRouting['recipients'];
    response?: AlertResponse;
    max?: number;
}) {
    if (recipients.length === 0) return <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><BellRing size={12} /> No route</span>;
    return (
        <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1">
                {recipients.slice(0, max).map(r => <AssigneeChip key={r.id} assignee={{ id: r.id.replace(/^(user|driver):/, ''), name: r.name }} />)}
                {recipients.length > max && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">+{recipients.length - max}</span>
                )}
            </div>
            {response
                ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600" title={response.detail}><Check size={11} /> Responded · {RESPONSE_KIND_LABEL[response.kind]}</span>
                : <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600"><Clock size={11} /> Awaiting response</span>}
        </div>
    );
}

// ── Alert row (column-driven) ─────────────────────────────────────────
function AlertRow({ a, routing, response, visibleCols, onOpenLinked, onTakeAction }: { a: Alert; routing: ResolvedRouting; response?: AlertResponse; visibleCols: Set<ColId>; onOpenLinked?: (a: Alert) => void; onTakeAction?: (a: Alert) => void }) {
    const EntityIcon = ENTITY_ICON[a.entity];
    const pm = PRIORITY_META[a.priority];
    const tm = TYPE_META[a.type];
    const has = (c: ColId) => visibleCols.has(c);
    // One response (record updated via Take action) = resolved → tint the row green.
    const responded = !!response;
    return (
        <tr className={cn('border-b align-top transition-colors', responded ? 'border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50' : 'border-slate-100 hover:bg-slate-50/50')}>
            {/* Record & Subject (locked) — record name opens the record on the Default C&D page */}
            <td className="px-4 py-3.5 pl-5">
                {onOpenLinked ? (
                    <button type="button" onClick={() => onOpenLinked(a)} title="Open this record in Default Compliances & Documents"
                        className="group inline-flex items-center gap-1 text-left text-sm font-semibold text-slate-900 hover:text-blue-700">
                        <span className="hover:underline">{a.record.recordName}</span>
                        <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-500 shrink-0" />
                    </button>
                ) : (
                    <div className="text-sm font-semibold text-slate-900">{a.record.recordName}</div>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><EntityIcon size={11} className="text-slate-400" /> {a.subjectLabel}</span>
                    {a.instanceName && <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-1.5 py-0.5 font-semibold text-blue-600">{a.instanceName}</span>}
                    {a.record.numberName && a.numberValue && <span className="text-slate-400">{a.record.numberName}: <span className="font-medium text-slate-600">{a.numberValue}</span></span>}
                </div>
            </td>
            {/* Priority */}
            {has('priority') && (
                <td className="px-4 py-3.5">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', pm.tone)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', pm.dot)} /> {pm.label}
                    </span>
                </td>
            )}
            {/* Type */}
            {has('type') && (
                <td className="px-4 py-3.5">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', tm.tone)}>
                        <tm.Icon size={11} /> {tm.label}
                    </span>
                </td>
            )}
            {/* Monitors — the trigger field */}
            {has('monitors') && (
                <td className="px-4 py-3.5 text-[12px]">
                    <div className="inline-flex items-center gap-1 font-medium text-slate-700">
                        {a.isStatus ? <CircleDashed size={12} className="text-slate-400" /> : <CalendarClock size={12} className="text-slate-400" />}
                        {BASIS_LABEL[a.basis]}
                    </div>
                    {a.record.monitorType && <div className="mt-0.5 text-[10px] text-slate-400">{a.record.monitorType}</div>}
                </td>
            )}
            {/* Due / Status */}
            {has('due') && (
                <td className="px-4 py-3.5">
                    {a.isStatus ? (
                        <div className="text-[12px]">
                            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                a.priority === 'high' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                                {a.status || '—'}
                            </span>
                            <div className="mt-1 text-[10px] text-slate-400">Watching for change</div>
                        </div>
                    ) : (
                        <div className="text-[12px] leading-tight">
                            <div className="font-semibold text-slate-800 whitespace-nowrap">{fmtNice(a.date)}</div>
                            <DuePill d={a.daysUntil ?? 0} priority={a.priority} />
                        </div>
                    )}
                </td>
            )}
            {/* Assigned to */}
            {has('assignee') && (
                <td className="px-4 py-3.5">
                    {a.assignee
                        ? <AssigneeChip assignee={a.assignee} />
                        : <span className="inline-flex items-center gap-1 text-[11px] text-slate-400"><UserPlus size={12} /> Unassigned</span>}
                </td>
            )}
            {/* Notified — who this alert routes to (from Settings ▸ roles) + response status */}
            {has('notified') && (
                <td className="px-4 py-3.5">
                    <div className="flex flex-col gap-1 max-w-[230px]">
                        <NotifiedRecipients recipients={routing.recipients} response={response} max={3} />
                        {routing.recipients.length > 0 && ((routing.staged && routing.activeDay !== null) || routing.scoped) ? (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <StageCaption routing={routing} />
                                {routing.scoped && <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">Specific</span>}
                            </div>
                        ) : null}
                    </div>
                </td>
            )}
            {/* Reminders — current stage solid, fired stages light, upcoming muted */}
            {has('reminders') && (
                <td className="px-4 py-3.5">
                    <div className="max-w-[160px]"><StageChips reminders={a.reminders} daysUntil={a.daysUntil} isStatus={a.isStatus} /></div>
                </td>
            )}
            {/* Channels */}
            {has('channels') && (
                <td className="px-4 py-3.5 text-[10px] text-slate-500">
                    <div className="flex flex-col gap-0.5">
                        {a.channels.email && <span className="inline-flex items-center gap-1"><Mail size={11} className="text-slate-400" /> Email</span>}
                        {a.channels.inApp && <span className="inline-flex items-center gap-1"><Smartphone size={11} className="text-slate-400" /> In-App</span>}
                        {!a.channels.email && !a.channels.inApp && <span className="text-slate-300">—</span>}
                    </div>
                </td>
            )}
            {/* Next alert */}
            {has('nextAlert') && (
                <td className="px-4 py-3.5 text-[12px]">
                    {a.isStatus ? (
                        <span className="inline-flex items-center gap-1 text-slate-500"><BellRing size={12} className="text-slate-400" /> On any change</span>
                    ) : a.daysUntil !== null && a.daysUntil < 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><AlertTriangle size={12} /> Action needed</span>
                    ) : a.nextAlertDate ? (
                        <span className="inline-flex items-center gap-1 text-slate-600"><Clock size={12} className="text-slate-400" /> {fmtNice(a.nextAlertDate)}</span>
                    ) : <span className="text-slate-400">—</span>}
                </td>
            )}
            {/* Actions — Take action (fix) · Open record · View document */}
            <td className="px-4 py-3.5 pr-5">
                <div className="flex items-center justify-end gap-1.5">
                    {onTakeAction && (
                        <button type="button" title="Take action — set next date / update status / remove" onClick={() => onTakeAction(a)}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[12px] font-semibold hover:bg-emerald-700 shadow-sm">
                            <Zap size={14} /> Take action
                        </button>
                    )}
                    {onOpenLinked && (
                        <button type="button" title="Open this record in Default Compliances & Documents" onClick={() => onOpenLinked(a)}
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[12px] font-semibold hover:bg-blue-100">
                            <ExternalLink size={14} /> <span className="hidden xl:inline">Open</span>
                        </button>
                    )}
                    <button type="button" title={a.file?.url ? 'View document' : 'No document'} disabled={!a.file?.url}
                        onClick={() => a.file && openFile(a.file)}
                        className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                            a.file?.url ? 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200'
                                : 'border-slate-200 text-slate-300 cursor-not-allowed')}>
                        <Eye size={15} />
                    </button>
                </div>
            </td>
        </tr>
    );
}

// ── Alert card (mobile / narrow screens — replaces the wide table row) ──
// Column-driven, exactly like the table: only the columns selected in the Columns dropdown render.
function AlertCard({ a, routing, response, visibleCols, onOpenLinked, onTakeAction }: { a: Alert; routing: ResolvedRouting; response?: AlertResponse; visibleCols: Set<ColId>; onOpenLinked?: (a: Alert) => void; onTakeAction?: (a: Alert) => void }) {
    const EntityIcon = ENTITY_ICON[a.entity];
    const pm = PRIORITY_META[a.priority];
    const tm = TYPE_META[a.type];
    const has = (c: ColId) => visibleCols.has(c);

    const field = (id: string, label: string, node: ReactNode) => (
        <div key={id} className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-0.5">{node}</div>
        </div>
    );
    const fields: ReactNode[] = [];
    if (has('type')) fields.push(field('type', 'Type', <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', tm.tone)}><tm.Icon size={11} /> {tm.label}</span>));
    if (has('monitors')) fields.push(field('monitors', 'Monitors', <span className="inline-flex items-center gap-1 text-[12px] font-medium text-slate-700">{a.isStatus ? <CircleDashed size={12} className="text-slate-400" /> : <CalendarClock size={12} className="text-slate-400" />} {BASIS_LABEL[a.basis]}</span>));
    if (has('due')) fields.push(field('due', 'Due / Status', a.isStatus
        ? <span className="text-[12px] font-medium text-slate-700">{a.status || '—'} <span className="text-slate-400">· watching</span></span>
        : <div className="text-[12px]"><span className="font-semibold text-slate-800">{fmtNice(a.date)}</span> <DuePill d={a.daysUntil ?? 0} priority={a.priority} /></div>));
    if (has('assignee')) fields.push(field('assignee', 'Assigned to', a.assignee ? <AssigneeChip assignee={a.assignee} /> : <span className="text-[11px] text-slate-400">Unassigned</span>));
    if (has('notified')) fields.push(field('notified', 'Notified', (
        <div className="flex flex-col gap-1">
            <NotifiedRecipients recipients={routing.recipients} response={response} max={3} />
            {routing.recipients.length > 0 && ((routing.staged && routing.activeDay !== null) || routing.scoped) ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <StageCaption routing={routing} />
                    {routing.scoped && <span className="inline-flex items-center rounded-full bg-violet-50 border border-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-600">Specific</span>}
                </div>
            ) : null}
        </div>
    )));
    if (has('reminders')) fields.push(field('reminders', 'Reminders', <StageChips reminders={a.reminders} daysUntil={a.daysUntil} isStatus={a.isStatus} />));
    if (has('channels')) fields.push(field('channels', 'Channels', <div className="flex items-center gap-2 text-[11px] text-slate-500">{a.channels.email && <span className="inline-flex items-center gap-1"><Mail size={11} className="text-slate-400" /> Email</span>}{a.channels.inApp && <span className="inline-flex items-center gap-1"><Smartphone size={11} className="text-slate-400" /> In-App</span>}{!a.channels.email && !a.channels.inApp && <span className="text-slate-300">—</span>}</div>));
    if (has('nextAlert')) fields.push(field('nextAlert', 'Next alert', a.isStatus
        ? <span className="text-[12px] text-slate-500">On any change</span>
        : a.daysUntil !== null && a.daysUntil < 0
            ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-rose-600"><AlertTriangle size={12} /> Action needed</span>
            : a.nextAlertDate ? <span className="text-[12px] text-slate-600">{fmtNice(a.nextAlertDate)}</span> : <span className="text-slate-400">—</span>));

    const responded = !!response;
    return (
        <div className={cn('px-4 py-3.5 border-l-2 transition-colors', responded ? 'border-l-emerald-400 bg-emerald-50/50' : 'border-l-transparent')}>
            <div className="flex items-start justify-between gap-2">
                <button type="button" onClick={() => onOpenLinked?.(a)} disabled={!onOpenLinked} className="min-w-0 text-left">
                    <div className="flex items-center gap-1 text-[14px] font-semibold text-slate-900">
                        <span className="truncate">{a.record.recordName}</span>
                        {onOpenLinked && <ExternalLink size={12} className="text-slate-300 shrink-0" />}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1"><EntityIcon size={11} className="text-slate-400" /> {a.subjectLabel}</span>
                        {a.instanceName && <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-1.5 py-0.5 font-semibold text-blue-600">{a.instanceName}</span>}
                        {a.record.numberName && a.numberValue && <span className="text-slate-400">{a.record.numberName}: <span className="font-medium text-slate-600">{a.numberValue}</span></span>}
                    </div>
                </button>
                {has('priority') && (
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap shrink-0', pm.tone)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', pm.dot)} /> {pm.label}
                    </span>
                )}
            </div>

            {fields.length > 0 && (
                <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5">{fields}</div>
            )}

            <div className="mt-3 flex items-center gap-2">
                {onTakeAction && (
                    <button type="button" onClick={() => onTakeAction(a)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 h-9 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 shadow-sm">
                        <Zap size={15} /> Take action
                    </button>
                )}
                {onOpenLinked && (
                    <button type="button" onClick={() => onOpenLinked(a)}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[13px] font-semibold hover:bg-blue-100">
                        <ExternalLink size={15} /> Open
                    </button>
                )}
                <button type="button" disabled={!a.file?.url} onClick={() => a.file && openFile(a.file)} title={a.file?.url ? 'View document' : 'No document'}
                    className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg border shrink-0',
                        a.file?.url ? 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-blue-600' : 'border-slate-200 text-slate-300 cursor-not-allowed')}>
                    <Eye size={16} />
                </button>
            </div>
        </div>
    );
}

// Soft (borderless) tone per priority — used for the relative "due" label so the cell reads cleaner.
const DUE_SOFT: Record<PriorityLevel, string> = {
    overdue: 'bg-rose-50 text-rose-600',
    critical: 'bg-orange-50 text-orange-600',
    high: 'bg-amber-50 text-amber-700',
    medium: 'bg-blue-50 text-blue-600',
    low: 'bg-slate-100 text-slate-500',
};
function DuePill({ d, priority }: { d: number; priority: PriorityLevel }) {
    const label = d < 0 ? `Overdue by ${-d} day${-d === 1 ? '' : 's'}` : d === 0 ? 'Due today' : `in ${d} day${d === 1 ? '' : 's'}`;
    return (
        <span className={cn('mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap', DUE_SOFT[priority])}>
            {d < 0 && <AlertTriangle size={10} />}{label}
        </span>
    );
}

function AssigneeChip({ assignee, size = 'sm' }: { assignee: Assignee; size?: 'sm' | 'md' }) {
    const { initials, gradient } = avatarFor(assignee);
    const dim = size === 'md' ? 'h-7 w-7 text-[11px]' : 'h-5 w-5 text-[9px]';
    return (
        <span className="inline-flex items-center gap-1.5 max-w-[160px]">
            <span className={cn('inline-flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shrink-0', dim, gradient)}>{initials}</span>
            <span className={cn('truncate font-medium text-slate-700', size === 'md' ? 'text-[13px]' : 'text-[12px]')}>{assignee.name}</span>
        </span>
    );
}

function EmptyState({ hasAny, onNavigate, onLoadSample }: { hasAny: boolean; onNavigate?: (path: string) => void; onLoadSample?: () => void }) {
    return (
        <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                <BellRing size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800">{hasAny ? 'No alerts match your filters' : 'Nothing is being monitored yet'}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {hasAny
                    ? 'Adjust the entity / priority filters or search to see monitored items.'
                    : 'Load sample data to preview this page, or enable monitoring on records in Default Compliances & Documents (each version has a Monitoring panel).'}
            </p>
            {!hasAny && (
                <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                    {onLoadSample && (
                        <button type="button" onClick={onLoadSample}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                            <Sparkles size={15} /> Load sample data
                        </button>
                    )}
                    {onNavigate && (
                        <button type="button" onClick={() => onNavigate('/default-compliance-documents')}
                            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50">
                            <Layers size={15} /> Go to Default Compliances &amp; Documents
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Calendar tab (year heatmap of monitored due dates) ────────────────
type CalTone = 'red' | 'amber' | 'blue' | 'slate';
const CAL_RANK: Record<CalTone, number> = { slate: 0, blue: 1, amber: 2, red: 3 };
const CAL_CELL: Record<CalTone, string> = {
    red: 'bg-red-500 text-white',
    amber: 'bg-amber-400 text-white',
    blue: 'bg-blue-400 text-white',
    slate: 'bg-slate-300 text-slate-700',
};
const CAL_DOT: Record<CalTone, string> = { red: 'bg-red-500', amber: 'bg-amber-400', blue: 'bg-blue-400', slate: 'bg-slate-300' };
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function toneForDays(d: number | null): CalTone {
    if (d === null) return 'slate';
    if (d < 0) return 'red';
    if (d <= 30) return 'amber';
    if (d <= 90) return 'blue';
    return 'slate';
}
const prettyDate = (iso: string) => { const d = parseDate(iso); return d ? `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : iso; };

function MonitoringCalendar({ dateAlerts }: { dateAlerts: Alert[] }) {
    const today = new Date();
    const todayKey = fmtYMD(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
    const [year, setYear] = useState(today.getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const byDate = useMemo(() => {
        const m = new Map<string, Alert[]>();
        for (const a of dateAlerts) {
            const d = parseDate(a.date);
            if (!d || d.getFullYear() !== year) continue;
            const arr = m.get(a.date); if (arr) arr.push(a); else m.set(a.date, [a]);
        }
        return m;
    }, [dateAlerts, year]);

    const dayTone = (key: string): CalTone | null => {
        const evs = byDate.get(key);
        if (!evs || !evs.length) return null;
        return evs.reduce<CalTone>((w, a) => { const t = toneForDays(a.daysUntil); return CAL_RANK[t] > CAL_RANK[w] ? t : w; }, 'slate');
    };
    const perMonth = useMemo(() => {
        const counts = Array.from({ length: 12 }, () => 0);
        for (const [key, evs] of byDate) { const d = parseDate(key); if (d) counts[d.getMonth()] += evs.length; }
        return counts;
    }, [byDate]);
    const upcoming = useMemo(() =>
        dateAlerts.filter(a => parseDate(a.date)?.getFullYear() === year).sort((a, b) => a.date.localeCompare(b.date)),
        [dateAlerts, year]);
    const maxMonth = Math.max(1, ...perMonth);

    return (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-4">
                {/* Year nav + legend */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="inline-flex items-center gap-1">
                        <button type="button" onClick={() => setYear(y => y - 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronLeft size={16} /></button>
                        <span className="px-2 text-lg font-bold tabular-nums text-slate-900">{year}</span>
                        <button type="button" onClick={() => setYear(y => y + 1)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"><ChevronRight size={16} /></button>
                        {year !== today.getFullYear() && (
                            <button type="button" onClick={() => setYear(today.getFullYear())} className="ml-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Today</button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <Legend tone="red" label="Overdue" />
                        <Legend tone="amber" label="≤30 days" />
                        <Legend tone="blue" label="≤90 days" />
                        <Legend tone="slate" label="Later" />
                    </div>
                </div>

                {/* Yearly month strip */}
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid grid-cols-12 gap-1.5">
                        {perMonth.map((c, m) => (
                            <div key={m} className="flex flex-col items-center gap-1">
                                <div className="flex h-16 w-full items-end justify-center rounded bg-slate-50">
                                    <div className="w-3 rounded-t bg-blue-500/80" style={{ height: `${(c / maxMonth) * 100}%` }} />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500">{MONTH_NAMES[m]}</span>
                                <span className="text-[10px] font-bold tabular-nums text-slate-700">{c}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 12 mini-month heatmap calendars */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 12 }, (_, m) => (
                        <MiniMonth key={m} year={year} month={m} dayTone={dayTone} todayKey={todayKey}
                            selectedDate={selectedDate} onSelectDay={setSelectedDate} />
                    ))}
                </div>
            </div>

            {/* Right panel — selected day items or upcoming */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden self-start">
                {selectedDate ? (
                    <>
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <CalendarDays size={16} className="text-blue-600" />
                                <h3 className="text-base font-bold text-slate-800">{prettyDate(selectedDate)}</h3>
                            </div>
                            <button type="button" onClick={() => setSelectedDate(null)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={15} /></button>
                        </div>
                        {(byDate.get(selectedDate) ?? []).length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-500">Nothing due on this day.</div>
                        ) : (
                            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                                {(byDate.get(selectedDate) ?? []).map((a, i) => <CalEventRow key={i} a={a} />)}
                            </ul>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                            <CalendarClock size={16} className="text-blue-600" />
                            <h3 className="text-base font-bold text-slate-800">Upcoming in {year}</h3>
                            <span className="text-[11px] text-slate-400">— click a day for details</span>
                        </div>
                        {upcoming.length === 0 ? (
                            <div className="px-5 py-12 text-center text-sm text-slate-500">No dated items in {year}.</div>
                        ) : (
                            <ul className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
                                {upcoming.map((a, i) => <CalEventRow key={i} a={a} />)}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function Legend({ tone, label }: { tone: CalTone; label: string }) {
    return <span className="inline-flex items-center gap-1"><span className={cn('h-2.5 w-2.5 rounded-sm', CAL_DOT[tone])} /> {label}</span>;
}

function CalEventRow({ a }: { a: Alert }) {
    const d = parseDate(a.date)!;
    const tone = toneForDays(a.daysUntil);
    return (
        <li className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-50 leading-none">
                <span className="text-[9px] font-bold uppercase text-slate-400">{MONTH_NAMES[d.getMonth()]}</span>
                <span className="text-sm font-black tabular-nums text-slate-800">{d.getDate()}</span>
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900">{a.record.recordName}</span>
                    {a.instanceName && <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">{a.instanceName}</span>}
                </div>
                <p className="truncate text-[12px] text-slate-500">{a.subjectLabel}</p>
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap',
                tone === 'red' ? 'bg-red-50 text-red-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                {a.daysUntil === null ? '—' : a.daysUntil < 0 ? `${-a.daysUntil}d ago` : `${a.daysUntil}d`}
            </span>
            <button type="button" disabled={!a.file?.url} onClick={() => a.file && openFile(a.file)} title={a.file?.url ? 'View document' : 'No document'}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <Eye size={12} /> View
            </button>
        </li>
    );
}

function MiniMonth({ year, month, dayTone, todayKey, selectedDate, onSelectDay }: {
    year: number; month: number; dayTone: (key: string) => CalTone | null; todayKey: string;
    selectedDate: string | null; onSelectDay: (key: string) => void;
}) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-sm font-bold text-slate-800">{MONTH_NAMES[month]} {year}</div>
            <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i} className="text-[9px] font-bold text-slate-400">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (day === null) return <span key={i} />;
                    const key = fmtYMD(new Date(year, month, day));
                    const tone = dayTone(key);
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDate;
                    const base = cn(
                        'flex h-6 w-full items-center justify-center rounded text-[11px] tabular-nums',
                        tone ? CAL_CELL[tone] + ' font-bold' : 'text-slate-600',
                        isToday && 'ring-2 ring-blue-600 ring-offset-1',
                        isSelected && 'outline outline-2 outline-blue-600',
                    );
                    return tone ? (
                        <button key={i} type="button" onClick={() => onSelectDay(key)} title={`${day} ${MONTH_NAMES[month]} — view items due`}
                            className={cn(base, 'cursor-pointer transition-transform hover:scale-110')}>
                            {day}
                        </button>
                    ) : <span key={i} className={base}>{day}</span>;
                })}
            </div>
        </div>
    );
}

// ── Health meter ──────────────────────────────────────────────────────
function healthBand(score: number): { label: string; ring: string; text: string } {
    if (score >= 90) return { label: 'Excellent', ring: '#10b981', text: 'text-emerald-600' };
    if (score >= 75) return { label: 'Good', ring: '#2563eb', text: 'text-blue-600' };
    if (score >= 50) return { label: 'Fair', ring: '#f59e0b', text: 'text-amber-600' };
    return { label: 'At Risk', ring: '#e11d48', text: 'text-rose-600' };
}
function Dot({ tone, label }: { tone: string; label: string }) {
    return <span className="inline-flex items-center gap-1.5 text-slate-500"><span className={cn('h-2 w-2 rounded-full', tone)} /> {label}</span>;
}
const SCOPE_HEALTH_TITLE: Record<'all' | EntityId, string> = {
    all: 'Compliance Health', Carrier: 'Carrier Compliance Health', Driver: 'Driver Compliance Health', Asset: 'Asset Compliance Health',
};
const SCOPE_NOUN: Record<'all' | EntityId, string> = { all: 'monitored item', Carrier: 'carrier item', Driver: 'driver item', Asset: 'asset item' };
/** Hover ⓘ explaining how each priority level is derived (reminder-aware). */
function PriorityLegend() {
    return (
        <span className="group relative inline-flex">
            <Info size={14} className="cursor-help text-slate-400 hover:text-slate-600" />
            <span className="pointer-events-none absolute left-0 top-full z-30 mt-1.5 hidden w-80 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-xl group-hover:block">
                <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">How priority works</span>
                <span className="mb-2 block text-[11px] leading-snug text-slate-500">Each item’s priority escalates against its <span className="font-semibold text-slate-600">own monitoring reminders</span> — not a fixed calendar.</span>
                <span className="block space-y-1.5">
                    {PRIORITY_LEGEND.map(({ level, when }) => {
                        const pm = PRIORITY_META[level];
                        return (
                            <span key={level} className="flex items-start gap-2">
                                <span className={cn('mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', pm.tone)}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', pm.dot)} /> {pm.label}
                                </span>
                                <span className="text-[11px] leading-snug text-slate-600">{when}</span>
                            </span>
                        );
                    })}
                </span>
            </span>
        </span>
    );
}

function HealthMeter({ health, scope }: { health: { score: number; overdue: number; dueSoon: number; onTrack: number; total: number }; scope: 'all' | EntityId }) {
    const { score, overdue, dueSoon, onTrack, total } = health;
    const noun = SCOPE_NOUN[scope];
    const band = healthBand(score);
    const R = 52, C = 2 * Math.PI * R;
    const dash = (score / 100) * C;
    const seg = (n: number) => (total ? (n / total) * 100 : 0);
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-6 flex-wrap">
            <div className="relative h-32 w-32 shrink-0">
                <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
                    <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="12" />
                    <circle cx="60" cy="60" r={R} fill="none" stroke={band.ring} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} ${C - dash}`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black tabular-nums text-slate-900">{score}<span className="text-lg">%</span></span>
                    <span className={cn('text-[11px] font-bold', band.text)}>{band.label}</span>
                </div>
            </div>
            <div className="min-w-[240px] flex-1">
                <div className="flex items-center gap-2">
                    <BellRing size={16} className="text-blue-500" />
                    <h3 className="text-base font-bold text-slate-800">{SCOPE_HEALTH_TITLE[scope]}</h3>
                    <PriorityLegend />
                </div>
                <p className="mt-0.5 text-[12px] text-slate-500">
                    {total === 0 ? `No ${noun}s being monitored yet.` : `Across ${total} ${noun}${total === 1 ? '' : 's'} — ${onTrack} on track, ${dueSoon} due soon, ${overdue} overdue.`}
                </p>
                <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="bg-rose-500" style={{ width: `${seg(overdue)}%` }} />
                    <div className="bg-amber-400" style={{ width: `${seg(dueSoon)}%` }} />
                    <div className="bg-emerald-500" style={{ width: `${seg(onTrack)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap gap-4 text-[11px]">
                    <Dot tone="bg-rose-500" label={`Overdue · ${overdue}`} />
                    <Dot tone="bg-amber-400" label={`Due soon · ${dueSoon}`} />
                    <Dot tone="bg-emerald-500" label={`On track · ${onTrack}`} />
                </div>
            </div>
        </div>
    );
}

// ── Take-action modal — "Ask / Order" style: handle it yourself, or ask/assign a user or driver ──
const ACTION_CARDS: { id: ActionMode; label: string; sub: string; Icon: typeof Wrench }[] = [
    { id: 'self', label: 'Handle it myself', sub: 'Renew, update status, or stop monitoring', Icon: Wrench },
    { id: 'request', label: 'Request document', sub: 'Ask a driver or user to upload / renew', Icon: Upload },
    { id: 'assign', label: 'Assign review', sub: 'Make a user responsible for this item', Icon: ClipboardCheck },
    { id: 'notify', label: 'Alert / Notify', sub: 'Send a reminder or notification', Icon: BellRing },
];
function ActionModal({ a, actions, users, drivers, onSetNextDate, onUpdateStatus, onRemove, onAssign, onSend, onClose }: {
    a: Alert; actions: MonitoringAction[]; users: AppUser[]; drivers: { id: string; name: string; email?: string }[];
    onSetNextDate: (a: Alert, d: string) => void;
    onUpdateStatus: (a: Alert, s: string) => void;
    onRemove: (a: Alert) => void;
    onAssign: (a: Alert, assignee: Assignee | null) => void;
    onSend: (a: Alert, p: { mode: RequestMode; recipient: Assignee; channel: 'email' | 'inApp'; dueDate: string }) => void;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<ActionMode>('self');
    const suggested = a.isStatus ? '' : shiftDate(a.date || fmtYMD(new Date()), RECURRENCE_DAYS[a.recurrence] ?? 365);
    const [nextDate, setNextDate] = useState(suggested);
    const [status, setStatus] = useState(a.status || 'Active');
    const tm = TYPE_META[a.type];
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
            <div className="relative z-10 flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-5">
                    <div className="min-w-0 flex items-start gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-blue-600 text-white flex items-center justify-center"><Send size={17} /></div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-bold text-slate-900">Take action</h3>
                                <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold', tm.tone)}><tm.Icon size={11} /> {tm.label}</span>
                            </div>
                            <p className="mt-0.5 text-[12px] text-slate-500 truncate">For “<span className="font-semibold text-slate-700">{a.record.recordName}</span>” · {a.subjectLabel}{a.instanceName ? ` · ${a.instanceName}` : ''}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Context + current owner */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[12px] text-slate-600 flex items-center justify-between gap-3 flex-wrap">
                        <span>
                            {a.isStatus
                                ? <>Watching <span className="font-semibold text-slate-800">status</span> — <span className="font-semibold text-slate-800">{a.status || '—'}</span></>
                                : <>{BASIS_LABEL[a.basis]}: <span className="font-semibold text-slate-800">{fmtNice(a.date)}</span> · {a.daysUntil !== null && a.daysUntil < 0 ? <span className="font-semibold text-rose-600">overdue by {-a.daysUntil} days</span> : <span>due in {a.daysUntil} days</span>}</>}
                        </span>
                        {a.assignee && (
                            <span className="inline-flex items-center gap-2">
                                <span className="text-slate-400">Owner:</span><AssigneeChip assignee={a.assignee} />
                                <button type="button" onClick={() => onAssign(a, null)} className="text-[11px] font-semibold text-slate-400 hover:text-rose-600">Clear</button>
                            </span>
                        )}
                    </div>

                    {/* ACTION selector */}
                    <div>
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Action</p>
                        <div className="grid grid-cols-2 gap-2">
                            {ACTION_CARDS.map(c => {
                                const active = mode === c.id;
                                return (
                                    <button key={c.id} type="button" onClick={() => setMode(c.id)}
                                        className={cn('flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors',
                                            active ? 'border-blue-500 bg-blue-50/60 ring-1 ring-blue-500/30' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}>
                                        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500')}><c.Icon size={15} /></span>
                                        <span className="min-w-0">
                                            <span className={cn('block text-[13px] font-bold', active ? 'text-blue-700' : 'text-slate-800')}>{c.label}</span>
                                            <span className="block text-[11px] leading-tight text-slate-500">{c.sub}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Panel for the selected action */}
                    {mode === 'self' ? (
                        <div className="space-y-4">
                            {a.isStatus ? (
                                <div>
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Update status</p>
                                    <div className="flex items-center gap-2">
                                        <select value={status} onChange={e => setStatus(e.target.value)} className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <button type="button" onClick={() => onUpdateStatus(a, status)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><Check size={15} /> Save</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Set next {BASIS_LABEL[a.basis].toLowerCase()}</p>
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="h-9 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                                        <button type="button" onClick={() => onSetNextDate(a, nextDate)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"><CalendarPlus size={15} /> Save</button>
                                    </div>
                                    <p className="mt-1 text-[10px] text-slate-400">Suggested from the record’s renewal cadence — clears the alert until the new date approaches.</p>
                                </div>
                            )}
                            <div className="rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-3 flex items-center justify-between gap-2 flex-wrap">
                                <div>
                                    <p className="text-[13px] font-semibold text-slate-800">Remove from monitoring</p>
                                    <p className="text-[11px] text-slate-500">Turns off monitoring for this item — it leaves the alert list.</p>
                                </div>
                                <button type="button" onClick={() => onRemove(a)} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-rose-200 bg-white text-sm font-semibold text-rose-600 hover:bg-rose-50"><Trash2 size={15} /> Remove</button>
                            </div>
                        </div>
                    ) : (
                        <AskForm key={mode} mode={mode} a={a} users={users} drivers={drivers} onSend={onSend} />
                    )}

                    {/* Recent activity */}
                    <div className="border-t border-slate-100 pt-4">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">Recent activity</p>
                        {actions.length === 0 ? (
                            <p className="text-[12px] text-slate-400">No actions recorded yet for this item.</p>
                        ) : (
                            <ul className="space-y-1.5">
                                {actions.slice(0, 5).map(x => (
                                    <li key={x.id} className="flex items-start gap-2 text-[12px]">
                                        <ActivityIcon type={x.type} />
                                        <div><span className="text-slate-700">{x.detail}</span> <span className="text-slate-400">· {fmtDateTime(x.at)}</span></div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Ask / order form (request document / assign review / alert-notify) ──
function AskForm({ mode, a, users, drivers, onSend }: {
    mode: RequestMode; a: Alert; users: AppUser[]; drivers: { id: string; name: string; email?: string }[];
    onSend: (a: Alert, p: { mode: RequestMode; recipient: Assignee; channel: 'email' | 'inApp'; dueDate: string }) => void;
}) {
    const preUser = a.assignee && findUserById(a.assignee.id) ? `user:${a.assignee.id}` : '';
    const [recipientSel, setRecipientSel] = useState(preUser);
    const [otherName, setOtherName] = useState('');
    const [email, setEmail] = useState(a.assignee ? (findUserById(a.assignee.id)?.email ?? '') : '');
    const [channel, setChannel] = useState<'email' | 'inApp'>('email');
    const [subject, setSubject] = useState(
        mode === 'request' ? `Document needed — ${a.record.recordName}`
            : mode === 'assign' ? `Review needed — ${a.record.recordName}`
                : `Reminder — ${a.record.recordName}`);
    const [message, setMessage] = useState(
        mode === 'request' ? `Please upload or renew ${a.record.recordName} for ${a.subjectLabel}.`
            : mode === 'assign' ? `Please review ${a.record.recordName} for ${a.subjectLabel} and confirm it's in order.`
                : `Reminder: ${a.record.recordName} for ${a.subjectLabel} needs attention.`);
    const suggested = a.isStatus ? '' : shiftDate(a.date || fmtYMD(new Date()), RECURRENCE_DAYS[a.recurrence] ?? 365);
    const [dueDate, setDueDate] = useState(mode === 'notify' ? '' : suggested);

    const pick = (val: string) => {
        setRecipientSel(val);
        if (val === 'other') { setEmail(''); return; }
        const sep = val.indexOf(':'); const kind = val.slice(0, sep), id = val.slice(sep + 1);
        if (kind === 'user') setEmail(users.find(x => x.id === id)?.email ?? '');
        else if (kind === 'driver') setEmail(drivers.find(x => x.id === id)?.email ?? '');
        else setEmail('');
    };
    const recipient = (): Assignee | null => {
        if (recipientSel === 'other') { const name = otherName.trim(); return name ? { id: `other:${name.toLowerCase()}`, name } : null; }
        const sep = recipientSel.indexOf(':'); if (sep < 0) return null;
        const kind = recipientSel.slice(0, sep), id = recipientSel.slice(sep + 1);
        if (kind === 'user') { const u = users.find(x => x.id === id); return u ? { id: u.id, name: u.name } : null; }
        if (kind === 'driver') { const d = drivers.find(x => x.id === id); return d ? { id: d.id, name: d.name } : null; }
        return null;
    };
    const rcpt = recipient();
    const sendLabel = mode === 'assign' ? 'Assign & notify' : mode === 'notify' ? 'Send reminder' : 'Send request';
    const labelCls = 'mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500';
    const inputCls = 'h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <p className={labelCls}>Send to</p>
                    <select value={recipientSel} onChange={e => pick(e.target.value)} className={cn(inputCls, 'bg-white')}>
                        <option value="">Select a person…</option>
                        <optgroup label="Users">
                            {users.map(u => <option key={u.id} value={`user:${u.id}`}>{u.name} · {u.title}</option>)}
                        </optgroup>
                        {drivers.length > 0 && (
                            <optgroup label="Drivers">
                                {drivers.map(d => <option key={d.id} value={`driver:${d.id}`}>{d.name}</option>)}
                            </optgroup>
                        )}
                        <option value="other">Someone else…</option>
                    </select>
                </div>
                <div>
                    <p className={labelCls}>Send via</p>
                    <div className="inline-flex h-9 w-full rounded-lg bg-slate-100 p-0.5">
                        <button type="button" onClick={() => setChannel('email')} className={cn('flex-1 inline-flex items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold', channel === 'email' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500')}><Mail size={14} /> Email</button>
                        <button type="button" onClick={() => setChannel('inApp')} className={cn('flex-1 inline-flex items-center justify-center gap-1.5 rounded-md text-[13px] font-semibold', channel === 'inApp' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500')}><Smartphone size={14} /> In-app</button>
                    </div>
                </div>
            </div>

            {recipientSel === 'other' && (
                <div>
                    <p className={labelCls}>Name</p>
                    <input value={otherName} onChange={e => setOtherName(e.target.value)} placeholder="Recipient name" className={inputCls} />
                </div>
            )}

            {channel === 'email' && (
                <div>
                    <p className={labelCls}>Recipient email</p>
                    <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" className={inputCls} />
                </div>
            )}

            <div>
                <p className={labelCls}>Subject</p>
                <input value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} />
            </div>
            <div>
                <p className={labelCls}>Message</p>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
            </div>
            {mode !== 'notify' && (
                <div>
                    <p className={labelCls}>Due date <span className="font-medium normal-case text-slate-400">(optional)</span></p>
                    <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
                </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
                <p className="text-[10px] text-slate-400">
                    {mode === 'notify' ? 'Sends a reminder — does not change who owns this item.' : 'Sends the request and makes this person the item’s owner.'}
                </p>
                <button type="button" onClick={() => { if (rcpt) onSend(a, { mode, recipient: rcpt, channel, dueDate }); }} disabled={!rcpt}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"><Send size={15} /> {sendLabel}</button>
            </div>
        </div>
    );
}

// ── Activity log (tab) ────────────────────────────────────────────────
const ACTIVITY_META: Record<MonitoringActionType, { Icon: typeof RefreshCw; tone: string; label: string }> = {
    renewed: { Icon: RefreshCw, tone: 'text-emerald-600 bg-emerald-50', label: 'Renewed' },
    status: { Icon: Activity, tone: 'text-amber-600 bg-amber-50', label: 'Status updated' },
    removed: { Icon: Trash2, tone: 'text-rose-600 bg-rose-50', label: 'Removed' },
    assigned: { Icon: UserPlus, tone: 'text-blue-600 bg-blue-50', label: 'Assigned' },
    requested: { Icon: Send, tone: 'text-indigo-600 bg-indigo-50', label: 'Requested' },
    notified: { Icon: BellRing, tone: 'text-violet-600 bg-violet-50', label: 'Notified' },
};
function ActivityIcon({ type }: { type: MonitoringActionType }) {
    const m = ACTIVITY_META[type];
    return <span className={cn('mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full shrink-0', m.tone)}><m.Icon size={12} /></span>;
}
function ActivityLog({ actions }: { actions: MonitoringAction[] }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
                <ClipboardList size={16} className="text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Activity Log</h3>
                <span className="text-[11px] text-slate-400">— actions taken on monitored items</span>
            </div>
            {actions.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><ClipboardList size={22} /></div>
                    <h4 className="text-base font-bold text-slate-800">No activity yet</h4>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Actions you take on alerts (set next date, update status, remove) are recorded here.</p>
                </div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {actions.map(x => {
                        const m = ACTIVITY_META[x.type];
                        return (
                            <li key={x.id} className="flex items-start gap-3 px-5 py-3.5">
                                <ActivityIcon type={x.type} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-900">{x.recordName}</span>
                                        <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold', m.tone)}>{m.label}</span>
                                    </div>
                                    <p className="mt-0.5 text-[12px] text-slate-600">{x.detail}</p>
                                    <p className="mt-0.5 text-[11px] text-slate-400">{x.subjectLabel}{x.instanceName ? ` · ${x.instanceName}` : ''} · {x.by} · {fmtDateTime(x.at)}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

// ── KPI tile ──────────────────────────────────────────────────────────
const ACCENT: Record<string, string> = {
    slate: 'text-slate-500 bg-slate-100',
    rose: 'text-rose-600 bg-rose-50',
    orange: 'text-orange-600 bg-orange-50',
    amber: 'text-amber-600 bg-amber-50',
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
};
function KpiTile({ label, value, Icon, accent }: { label: string; value: string | number; Icon: typeof Layers; accent: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3.5 flex items-center justify-between">
            <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
                <div className="mt-0.5 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
            </div>
            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', ACCENT[accent] ?? ACCENT.slate)}>
                <Icon size={18} />
            </div>
        </div>
    );
}
