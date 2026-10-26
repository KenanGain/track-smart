import type { SafetyRecord, EntityId } from '@/pages/compliance/safety-software-catalog.data';
import {
    instancesOf, type DocVersion, type DataDocFile, type MonitorBasis, type RecordDataEntry,
} from '@/pages/compliance/compliance-data-store';
import { monitoredDateFor } from '@/pages/compliance/monitoring-schedule';
import { DEFAULT_REMINDERS } from '@/pages/compliance/monitoring-routing.data';
import type { AlertSource } from '@/pages/compliance/monitoring-sources';

// ─────────────────────────────────────────────────────────────────────────────
// monitoring-alerts — a compliance record as an ALERT, built the same way everywhere.
//
// The Compliance Monitoring page turned the per-carrier compliance store into alerts inside
// its own component, and nothing else could ask "what is due at Acme?" without mounting the
// page. The notification inbox needs exactly that answer for every carrier a person works
// on, so the builder and the priority rules live here and the page reads them back.
// Nothing here is a hook: it reads a snapshot it is handed and returns plain objects.
// ─────────────────────────────────────────────────────────────────────────────

// ── date helpers ──────────────────────────────────────────────────────
export function todayStart(): Date { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
export function parseDate(s: string): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d); dt.setHours(0, 0, 0, 0);
    return isNaN(dt.getTime()) ? null : dt;
}
export function fmtYMD(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function daysUntil(s: string): number | null {
    const d = parseDate(s);
    return d ? Math.round((d.getTime() - todayStart().getTime()) / 86400000) : null;
}
export function shiftDate(s: string, delta: number): string {
    const d = parseDate(s); if (!d) return s;
    d.setDate(d.getDate() + delta); return fmtYMD(d);
}

// ── priority ──────────────────────────────────────────────────────────
export type PriorityLevel = 'overdue' | 'critical' | 'high' | 'medium' | 'low';
export const PRIORITY_ORDER: PriorityLevel[] = ['overdue', 'critical', 'high', 'medium', 'low'];
export const PRIORITY_META: Record<PriorityLevel, { label: string; tone: string; dot: string; bar: string }> = {
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
export function priorityFor(d: number, reminders: number[]): PriorityLevel {
    if (d < 0) return 'overdue';
    const valid = reminders.filter(r => r > 0);
    const near = valid.length ? Math.min(...valid) : 7;   // nearest reminder to the due date (smallest lead)
    const far = valid.length ? Math.max(...valid) : 30;   // earliest reminder (largest lead)
    if (d <= near) return 'critical';
    if (d <= far) return 'high';
    if (d <= far + 90) return 'medium';
    return 'low';
}
export function priorityForStatus(status: string): PriorityLevel {
    const s = status.toLowerCase();
    if (/expired|incomplete|inactive/.test(s)) return 'high';
    if (/pending/.test(s)) return 'medium';
    return 'low';
}

// ── alert type (what kind of alert this is) — derived from the monitoring basis ──
export type AlertType = 'expiry' | 'review' | 'scheduled' | 'status';
export const TYPE_ORDER: AlertType[] = ['expiry', 'review', 'scheduled', 'status'];
export function typeForBasis(b: MonitorBasis): AlertType {
    return b === 'expiry' ? 'expiry' : b === 'issue' ? 'review' : b === 'custom' ? 'scheduled' : 'status';
}

export interface Assignee { id: string; name: string }

// ── alert model ───────────────────────────────────────────────────────
// One shape for every source. A compliance alert carries its catalog record (the actions
// that edit a version need it); everything else carries where it came from and a link.
export interface MonitoringAlert {
    id: string;
    source: AlertSource;
    /** The catalog record — compliance documents only. */
    record?: SafetyRecord;
    title: string;
    description: string;
    numberLabel?: string;
    link: { path: string; pendingId?: string; pendingType?: string };
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

/** When the next reminder fires for a dated alert — '' once it is overdue or has no date. */
export function nextAlert(date: string, d: number | null, reminders: number[]): string {
    if (d === null || d < 0) return '';
    const future = reminders.filter(r => r < d);           // reminders that fire in the future (fire at date - r)
    if (future.length) return shiftDate(date, -Math.max(...future));
    return date;                                            // all reminders passed → the due date itself
}

/** Short due text — "Overdue 3d", "Due today", "Due in 12d"; '' for a status watch. */
export function dueShort(d: number | null): string {
    if (d === null) return '';
    return d < 0 ? `Overdue ${-d}d` : d === 0 ? 'Due today' : `Due in ${d}d`;
}

/**
 * Every monitored compliance record of one carrier, as alerts.
 *
 * `all` is the whole compliance store (keys `${acct}::${subjectId}::${recordId}`); only this
 * carrier's keys are read. Reminders, next-alert and priority follow each record's own
 * reminder checkboxes, falling back to the standard 90 / 30 / 7 when none are set.
 */
export function buildComplianceAlerts({ acct, all, recordsById, labelForSubject, lockSubjectId }: {
    acct: string;
    all: Record<string, RecordDataEntry>;
    recordsById: Map<string, SafetyRecord>;
    labelForSubject: (entity: EntityId, subjectId: string) => string;
    /** Embedded per-subject view — only this subject's records. */
    lockSubjectId?: string;
}): MonitoringAlert[] {
    const out: MonitoringAlert[] = [];
    const prefix = `${acct}::`;
    for (const [key, entry] of Object.entries(all)) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const sep = rest.indexOf('::');
        if (sep < 0) continue;
        const subjectId = rest.slice(0, sep);
        if (lockSubjectId && subjectId !== lockSubjectId) continue;
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
            const recReminders = (cfg.reminders && cfg.reminders.length ? cfg.reminders : DEFAULT_REMINDERS).slice().sort((a, b) => b - a);
            const priority = isStatus ? priorityForStatus(v.status) : priorityFor(d ?? 9999, recReminders);
            out.push({
                id: `${key}::${instanceId ?? ''}::${v.id}`,
                source: 'compliance', record, title: record.recordName, description: record.description, numberLabel: record.numberName,
                link: { path: '/default-compliance-documents' },
                entity: record.entity, subjectId, subjectLabel, instanceName, instanceId,
                basis: cfg.basis, type: typeForBasis(cfg.basis), isStatus, recurrence: cfg.recurrence || 'annually',
                date, daysUntil: d, status: v.status, numberValue: v.numberValue,
                priority, reminders: recReminders,
                nextAlertDate: nextAlert(date, d, recReminders),
                channels: cfg.channels, assignee: cfg.assignee, file: v.files[0] ?? null,
            });
        }
    }
    return out;
}
