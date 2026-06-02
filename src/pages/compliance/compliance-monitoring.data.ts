// Compliance Monitoring — per-item renewal/notification config.
//
// Monitoring applies to compliance items (key numbers) and document types that
// carry a date (expiry / issue date). The config mirrors the "Monitoring &
// Notifications" card used in the Key Number editor. Stored in localStorage so
// it survives a refresh (prototype).

export type MonitorBasedOn = 'expiry' | 'issue_date';
export type RenewalRecurrence = 'annually' | 'biannually' | 'quarterly' | 'monthly' | 'none';

export interface MonitoringConfig {
    enabled: boolean;
    monitorBasedOn: MonitorBasedOn;
    renewalRecurrence: RenewalRecurrence;
    /** Reminder windows (days before) → on/off. */
    reminders: Record<number, boolean>;
    channels: { email: boolean; inApp: boolean; sms: boolean };
}

export const REMINDER_DAYS = [90, 60, 30, 7] as const;

export const DEFAULT_MONITORING: MonitoringConfig = {
    enabled: true,
    monitorBasedOn: 'expiry',
    renewalRecurrence: 'annually',
    reminders: { 90: true, 60: true, 30: true, 7: false },
    channels: { email: true, inApp: true, sms: false },
};

/** Composite key for a monitored item — `kn:<id>` / `doc:<id>`. */
export function monitorItemKey(kind: 'kn' | 'doc', id: string): string {
    return `${kind}:${id}`;
}

// Configs are scoped per entity (service-profile id at root, carrier/account id
// in Admin) so each profile/carrier keeps its own monitoring template. Shape:
// { [scopeId]: { [itemKey]: MonitoringConfig } }. An unset item falls back to
// DEFAULT_MONITORING at the call site ("seeded from root").
const STORAGE_KEY = 'ats:compliance-monitoring-v2';

type ScopedStore = Record<string, Record<string, MonitoringConfig>>;

function loadStore(): ScopedStore {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed as ScopedStore : {};
    } catch {
        return {};
    }
}

/** Load the monitoring config map for one scope (service-profile / carrier id). */
export function loadMonitoringConfigs(scopeId: string): Record<string, MonitoringConfig> {
    return loadStore()[scopeId] ?? {};
}

/** Persist the monitoring config map for one scope, leaving other scopes intact. */
export function saveMonitoringConfigs(scopeId: string, configs: Record<string, MonitoringConfig>): void {
    try {
        const store = loadStore();
        store[scopeId] = configs;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
        /* ignore */
    }
}

/** Human summary of the reminder schedule, e.g. "90, 60, 30 days before". */
export function reminderSummary(cfg: MonitoringConfig): string {
    const on = REMINDER_DAYS.filter(d => cfg.reminders[d]);
    if (on.length === 0) return 'No reminders';
    return `${on.join(', ')} days before`;
}

// ── Compliance task lifecycle (request / order / approval) ────────────────
//
// One store backs the Task Inbox, the request/communication workflow and the
// (future) document approval flow. Keyed per item + entity so each driver/asset
// gets its own task. Prototype: sends are mock (appended to the request log).

export type TaskStatus =
    | 'not_requested' | 'requested' | 'uploaded' | 'under_review'
    | 'approved' | 'rejected' | 'expired' | 'renewed';

export type Recipient = 'Driver' | 'Safety Manager' | 'Carrier Admin';
export type Channel = 'In-app' | 'Email' | 'SMS';

export interface RequestRecord {
    id: string;
    sentAt: string;
    sentBy: string;
    recipients: Recipient[];
    methods: Channel[];
    deadline?: string;
    message: string;
}

export interface ComplianceTask {
    key: string;
    status: TaskStatus;
    owner?: string;
    lastContactAt?: string;
    lastContactMethod?: string;
    requests: RequestRecord[];
}

/** Composite task key — `kn:<entity>:<id>` / `doc:<entity>:<id>` (carrier when no entity). */
export function taskKeyOf(kind: 'kn' | 'doc', id: string, entityId?: string): string {
    return `${kind}:${entityId ?? 'carrier'}:${id}`;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
    not_requested: 'Not requested',
    requested: 'Requested',
    uploaded: 'Uploaded',
    under_review: 'Under review',
    approved: 'Approved',
    rejected: 'Rejected',
    expired: 'Expired',
    renewed: 'Renewed',
};

export function taskTone(s: TaskStatus): 'red' | 'amber' | 'emerald' | 'slate' | 'blue' {
    if (s === 'approved' || s === 'renewed') return 'emerald';
    if (s === 'rejected' || s === 'expired') return 'red';
    if (s === 'requested') return 'amber';
    if (s === 'uploaded' || s === 'under_review') return 'blue';
    return 'slate';
}

export const REQUEST_TEMPLATES: { id: string; label: string; body: string }[] = [
    { id: 'missing', label: 'Missing document', body: 'Your {{item}} is missing for {{company}}. Please upload it by {{deadline}}.' },
    { id: 'expiring', label: 'Expiring soon', body: 'Your {{item}} expires soon. Please renew and upload the new document by {{deadline}}.' },
    { id: 'expired', label: 'Expired — urgent', body: 'Your {{item}} has expired. Immediate action required — upload a valid document by {{deadline}}.' },
    { id: 'renewal', label: 'Renewal reminder', body: 'Reminder: {{item}} renewal is due. Please complete it by {{deadline}}.' },
];

export function renderTemplate(body: string, vars: Record<string, string>): string {
    return body.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

const TASKS_KEY = 'ats:compliance-tasks-v1';

export function loadTasks(): Record<string, ComplianceTask> {
    try {
        const raw = localStorage.getItem(TASKS_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return typeof parsed === 'object' && parsed ? parsed as Record<string, ComplianceTask> : {};
    } catch {
        return {};
    }
}

export function saveTasks(tasks: Record<string, ComplianceTask>): void {
    try { localStorage.setItem(TASKS_KEY, JSON.stringify(tasks)); } catch { /* ignore */ }
}
