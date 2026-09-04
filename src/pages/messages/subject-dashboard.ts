// ─────────────────────────────────────────────────────────────────────────────
// Subject mini dashboards — what an AI agent answers with when you tag a driver
// or an asset with `@` and ask about them.
//
// Each domain is one interactive widget (documents, monitoring, safety score,
// tickets, DQ files, violations, accidents, hours). Ask for everything and you get
// the whole board; ask for one domain and you get that widget on its own.
//
// Real data wherever the app has it — the compliance data store drives documents
// and monitoring, the DQ store drives DQ completeness, the ticket store drives
// tickets. Safety / violation / accident telemetry has no per-driver store yet, so
// those widgets are derived DETERMINISTICALLY from the subject id (same driver →
// same numbers every time), matching how the rest of the prototype seeds fleet data.
// ─────────────────────────────────────────────────────────────────────────────

import { hash, mulberry32 } from '@/pages/accounts/carrier-fleet-shared.data';
import type { Driver } from '@/data/mock-app-data';
import type { Asset } from '@/pages/assets/assets.data';
import {
    isDateMonitored, type SafetyRecord, type EntityId,
} from '@/pages/compliance/safety-software-catalog.data';
import {
    currentVersion, entryStatus, instancesOf, type RecordDataEntry,
} from '@/pages/compliance/compliance-data-store';
import type { TicketRecord } from '@/pages/tickets/tickets.data';
import type {
    AiChart, AiDashboard, AiRow, AiSubject, AiTone, AiWidget, AiWidgetKey,
} from './ai-agents';

// ── shared helpers ───────────────────────────────────────────────────────────

const DRIVER_COLORS = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-500', 'bg-rose-600', 'bg-teal-600'];

function initialsOf(name: string): string {
    const p = name.trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}

/** Days from today until an ISO date (negative = already past). */
function daysUntil(iso: string): number | null {
    if (!iso) return null;
    const t = Date.parse(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    if (Number.isNaN(t)) return null;
    return Math.round((t - Date.now()) / 86_400_000);
}

function dueLabel(days: number): string {
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'due today';
    return `${days} days`;
}

/** Tone for a countdown: overdue/urgent → rose, soon → amber, otherwise emerald. */
function dueTone(days: number): AiTone {
    if (days < 0) return 'rose';
    if (days <= 30) return 'amber';
    return 'emerald';
}

function pct(part: number, total: number): number {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

// ── the subjects ─────────────────────────────────────────────────────────────

export function driverSubject(d: Driver): AiSubject {
    const bits = [d.driverType || 'Driver', d.terminal, d.carrierCode].filter(Boolean);
    return {
        kind: 'driver', id: d.id, name: d.name,
        sub: bits.join(' · '),
        initials: d.avatarInitials || initialsOf(d.name),
        color: DRIVER_COLORS[hash(d.id) % DRIVER_COLORS.length],
        status: d.status,
        statusTone: d.status === 'Active' ? 'emerald' : d.status === 'Terminated' ? 'rose' : 'amber',
        path: '/account/profile', recordId: d.id,
    };
}

export function assetSubject(a: Asset): AiSubject {
    const bits = [a.assetType || a.vehicleType, `${a.year} ${a.make} ${a.model}`.trim(), a.plateNumber].filter(Boolean);
    return {
        kind: 'asset', id: a.id, name: a.unitNumber,
        sub: bits.join(' · '),
        initials: a.unitNumber.replace(/[^A-Za-z0-9]/g, '').slice(-3).toUpperCase() || 'AST',
        color: a.assetCategory === 'CMV' ? 'bg-indigo-600' : 'bg-slate-600',
        status: a.operationalStatus === 'OutOfService' ? 'Out of service' : a.operationalStatus,
        statusTone: a.operationalStatus === 'Active' ? 'emerald' : a.operationalStatus === 'OutOfService' ? 'rose' : 'amber',
        path: '/assets/directory', recordId: a.id,
    };
}

// ── documents + monitoring (real: compliance data store) ─────────────────────

interface RecordState {
    record: SafetyRecord;
    status: 'complete' | 'missing' | 'optional';
    days: number | null;      // days until the monitored date (null = not date-monitored / unset)
    hasFile: boolean;
}

function recordStates(records: SafetyRecord[], entity: EntityId, subjectId: string,
                      getEntry: (subjectId: string, recordId: string) => RecordDataEntry): RecordState[] {
    return records.filter(r => r.entity === entity).map(record => {
        const entry = getEntry(subjectId, record.id);
        const versions = [...(entry.versions ?? []), ...instancesOf(entry).flatMap(i => i.versions ?? [])];
        const cur = currentVersion(entry) ?? versions[0] ?? null;
        return {
            record,
            status: entryStatus(record, entry),
            days: cur && isDateMonitored(record) ? daysUntil(cur.expiryDate) : null,
            hasFile: versions.some(v => (v.files ?? []).length > 0),
        };
    });
}

function documentsWidget(states: RecordState[], subjectName: string): AiWidget {
    const total = states.length;
    const onFile = states.filter(s => s.status === 'complete');
    const missing = states.filter(s => s.status === 'missing');
    const optional = states.filter(s => s.status === 'optional');
    const expiring = states.filter(s => s.days !== null && s.days >= 0 && s.days <= 60);
    const expired = states.filter(s => s.days !== null && s.days < 0);

    const rowFor = (s: RecordState): AiRow => {
        const tags = ['all'];
        if (s.status === 'complete') tags.push('onfile');
        if (s.status === 'missing') tags.push('missing');
        if (s.days !== null && s.days >= 0 && s.days <= 60) tags.push('expiring');
        if (s.days !== null && s.days < 0) tags.push('expired');
        const tone: AiTone = s.status === 'missing' ? 'rose'
            : s.days !== null ? dueTone(s.days) : 'emerald';
        return {
            title: s.record.recordName,
            subtitle: s.record.documentName || s.record.description,
            badge: s.status === 'missing' ? 'Missing' : s.days !== null && s.days < 0 ? 'Expired' : s.status === 'optional' ? 'Optional' : 'On file',
            tone,
            meta: s.days !== null ? dueLabel(s.days) : s.hasFile ? 'document attached' : undefined,
            tags,
            path: '/default-compliance-documents',
            recordId: s.record.id,
        };
    };

    // Worst first: missing, then expired, then soonest expiry, then the rest.
    const ordered = [...states].sort((a, b) => {
        const rank = (s: RecordState) => s.status === 'missing' ? 0 : (s.days !== null && s.days < 0) ? 1 : s.days !== null ? 2 : 3;
        const ra = rank(a), rb = rank(b);
        if (ra !== rb) return ra - rb;
        return (a.days ?? 9999) - (b.days ?? 9999);
    });

    const required = total - optional.length;
    const complete = pct(onFile.length, Math.max(1, required));
    const chart: AiChart = { kind: 'donut', title: 'Document health', points: [
        { label: 'On file', value: onFile.length, tone: 'emerald', filter: 'onfile' },
        { label: 'Expiring', value: expiring.length, tone: 'amber', filter: 'expiring' },
        { label: 'Missing', value: missing.length + expired.length, tone: 'rose', filter: 'missing' },
    ] };

    return {
        key: 'documents', title: 'Documents',
        summary: `${onFile.length} of ${required} required records on file for ${subjectName}.`,
        progress: { label: 'Complete', value: complete, tone: complete >= 90 ? 'emerald' : complete >= 70 ? 'amber' : 'rose' },
        stats: [
            { label: 'On file', value: String(onFile.length), tone: 'emerald', filter: 'onfile' },
            { label: 'Missing', value: String(missing.length), tone: 'rose', filter: 'missing' },
            { label: 'Expiring', value: String(expiring.length), tone: 'amber', filter: 'expiring' },
            { label: 'Tracked', value: String(total), tone: 'blue', filter: 'all' },
        ],
        chart,
        filters: [
            { id: 'missing', label: 'Missing', tone: 'rose' },
            { id: 'expiring', label: 'Expiring', tone: 'amber' },
            { id: 'onfile', label: 'On file', tone: 'emerald' },
        ],
        rows: ordered.map(rowFor),
        footnote: `${total} catalog records tracked for this ${states[0]?.record.entity.toLowerCase() ?? 'subject'}`,
        link: { label: 'Open Compliances & Documents', path: '/default-compliance-documents' },
    };
}

function monitoringWidget(states: RecordState[], subjectName: string): AiWidget {
    const dated = states.filter(s => s.days !== null) as (RecordState & { days: number })[];
    const overdue = dated.filter(s => s.days < 0);
    const week = dated.filter(s => s.days >= 0 && s.days <= 7);
    const month = dated.filter(s => s.days >= 0 && s.days <= 30);
    const quarter = dated.filter(s => s.days >= 0 && s.days <= 90);
    const monitored = states.filter(s => isDateMonitored(s.record));

    const rows: AiRow[] = [...dated].sort((a, b) => a.days - b.days).map(s => {
        const tags = ['all'];
        if (s.days < 0) tags.push('overdue');
        if (s.days >= 0 && s.days <= 7) tags.push('week');
        if (s.days >= 0 && s.days <= 30) tags.push('month');
        if (s.days >= 0 && s.days <= 90) tags.push('quarter');
        return {
            title: s.record.recordName,
            subtitle: `${s.record.monitorType}${s.record.recurring ? ` · ${s.record.recurring}` : ''}`,
            badge: s.days < 0 ? 'Overdue' : s.days <= 7 ? 'This week' : s.days <= 30 ? 'This month' : 'Upcoming',
            tone: dueTone(s.days),
            meta: dueLabel(s.days),
            tags,
            path: '/default-compliance-monitoring',
            recordId: s.record.id,
        };
    });

    return {
        key: 'monitoring', title: 'Monitoring & alerts',
        summary: overdue.length
            ? `${overdue.length} monitored date${overdue.length > 1 ? 's are' : ' is'} past due for ${subjectName}.`
            : `${quarter.length} monitored date${quarter.length === 1 ? '' : 's'} come due in the next 90 days.`,
        stats: [
            { label: 'Overdue', value: String(overdue.length), tone: 'rose', filter: 'overdue' },
            { label: '≤ 7 days', value: String(week.length), tone: 'rose', filter: 'week' },
            { label: '≤ 30 days', value: String(month.length), tone: 'amber', filter: 'month' },
            { label: '≤ 90 days', value: String(quarter.length), tone: 'blue', filter: 'quarter' },
        ],
        chart: { kind: 'bar', title: 'Alerts by window', unit: 'items', points: [
            { label: 'Overdue', value: overdue.length, tone: 'rose', filter: 'overdue' },
            { label: '≤7d', value: week.length, tone: 'rose', filter: 'week' },
            { label: '≤30d', value: month.length, tone: 'amber', filter: 'month' },
            { label: '≤90d', value: quarter.length, tone: 'blue', filter: 'quarter' },
        ] },
        filters: [
            { id: 'overdue', label: 'Overdue', tone: 'rose' },
            { id: 'week', label: 'This week', tone: 'rose' },
            { id: 'month', label: '30 days', tone: 'amber' },
            { id: 'quarter', label: '90 days', tone: 'blue' },
        ],
        rows,
        footnote: `${monitored.length} of ${states.length} records are date-monitored`,
        link: { label: 'Open Compliance Monitoring', path: '/default-compliance-monitoring' },
    };
}

// ── tickets (real: ticket store) ─────────────────────────────────────────────

function ticketsWidget(tickets: TicketRecord[], subjectName: string): AiWidget {
    const open = tickets.filter(t => /open|outstanding|unpaid|new/i.test(t.status));
    const review = tickets.filter(t => /court|review|contest|dispute|pending/i.test(t.status));
    const closed = tickets.filter(t => /paid|closed|resolved|dismiss/i.test(t.status));
    const outstanding = open.reduce((n, t) => n + (t.fineAmount || 0), 0);
    const points = tickets.reduce((n, t) => n + (t.demeritPoints || 0), 0);

    const byType = new Map<string, number>();
    for (const t of tickets) byType.set(t.violationType, (byType.get(t.violationType) ?? 0) + 1);

    const rows: AiRow[] = tickets.map(t => {
        const tags = ['all'];
        if (open.includes(t)) tags.push('open');
        if (review.includes(t)) tags.push('review');
        if (closed.includes(t)) tags.push('closed');
        if (t.outOfService) tags.push('oos');
        return {
            title: t.offenseNumber || t.id,
            subtitle: [t.violationSubtype || t.violationType, t.location].filter(Boolean).join(' · '),
            badge: t.status,
            tone: closed.includes(t) ? 'emerald' : review.includes(t) ? 'amber' : 'rose',
            meta: t.fineAmount ? `${t.currency === 'CAD' ? 'CA$' : '$'}${t.fineAmount.toLocaleString()}` : t.date,
            tags,
            path: '/tickets',
            recordId: t.id,
        };
    });

    return {
        key: 'tickets', title: 'Tickets & citations',
        summary: tickets.length
            ? `${tickets.length} citation${tickets.length > 1 ? 's' : ''} on file for ${subjectName} — ${open.length} still open.`
            : `No citations on file for ${subjectName}.`,
        stats: [
            { label: 'Open', value: String(open.length), tone: 'rose', filter: 'open' },
            { label: 'In court', value: String(review.length), tone: 'amber', filter: 'review' },
            { label: 'Resolved', value: String(closed.length), tone: 'emerald', filter: 'closed' },
            { label: 'Points', value: String(points), tone: points > 6 ? 'rose' : 'blue' },
        ],
        chart: byType.size
            ? { kind: 'bar', title: 'Citations by type', points: [...byType.entries()].map(([label, value]) => ({ label, value, tone: 'amber' as AiTone })) }
            : undefined,
        filters: [
            { id: 'open', label: 'Open', tone: 'rose' },
            { id: 'review', label: 'In court', tone: 'amber' },
            { id: 'closed', label: 'Resolved', tone: 'emerald' },
            { id: 'oos', label: 'Placed OOS', tone: 'rose' },
        ],
        rows,
        footnote: outstanding ? `$${outstanding.toLocaleString()} in outstanding fines` : 'No outstanding fines',
        link: { label: 'Open Tickets', path: '/tickets' },
    };
}

// ── DQ files (real: DQ driver-file store) ────────────────────────────────────

export interface DqSnapshot { typeLabel: string; pct: number; present: number; missing: number; na: number; total: number; required: number; complete: boolean }

function dqWidget(dq: DqSnapshot, subjectName: string): AiWidget {
    const tone: AiTone = dq.pct >= 100 ? 'emerald' : dq.pct >= 80 ? 'amber' : 'rose';
    return {
        key: 'dqfiles', title: 'DQ file',
        summary: dq.total
            ? `${subjectName}’s ${dq.typeLabel} file is ${dq.pct}% complete — ${dq.missing} item${dq.missing === 1 ? '' : 's'} outstanding.`
            : `No DQ checklist is configured for ${subjectName}’s driver type yet.`,
        progress: { label: 'Required items verified', value: dq.pct, tone },
        stats: [
            { label: 'Verified', value: String(dq.present), tone: 'emerald' },
            { label: 'Outstanding', value: String(dq.missing), tone: dq.missing ? 'rose' : 'emerald' },
            { label: 'N/A', value: String(dq.na), tone: 'slate' },
            { label: 'Checklist', value: String(dq.total), tone: 'blue' },
        ],
        chart: { kind: 'donut', title: 'Checklist items', points: [
            { label: 'Verified', value: dq.present, tone: 'emerald' },
            { label: 'Outstanding', value: dq.missing, tone: 'rose' },
            { label: 'N/A', value: dq.na, tone: 'slate' },
        ] },
        rows: [
            { title: `${dq.typeLabel} checklist`, subtitle: `${dq.required} required items`, badge: dq.complete ? 'Complete' : `${dq.pct}%`, tone, meta: dq.complete ? 'signed off' : `${dq.missing} to go`, progress: dq.pct, path: '/dq-files' },
        ],
        footnote: dq.complete ? 'File is complete and ready for audit' : 'File is incomplete — outstanding items block sign-off',
        link: { label: 'Open DQ Files', path: '/dq-files' },
    };
}

// ── safety / violations / accidents / hours (derived per subject) ────────────
// No per-driver telematics store exists yet, so these are seeded from the subject id:
// stable across renders and reloads, and different for every driver / asset.

const SAFETY_EVENT_TYPES = ['Harsh braking', 'Harsh acceleration', 'Harsh cornering', 'Speeding', 'Following too close', 'Distracted driving'];
const SAFETY_LOCATIONS = ['I-40 WB', 'Hwy 401 near Exit 312', 'US-59 S', 'I-10 E', 'Hwy 400 NB', 'Downtown yard'];
const VIOLATION_ITEMS = [
    { title: 'Logbook form & manner', basic: 'HOS Compliance', pts: 2 },
    { title: 'Brake out of adjustment', basic: 'Vehicle Maintenance', pts: 4 },
    { title: 'Speeding 11–14 mph over', basic: 'Unsafe Driving', pts: 4 },
    { title: 'Tire tread depth', basic: 'Vehicle Maintenance', pts: 3 },
    { title: 'No medical certificate in possession', basic: 'Driver Fitness', pts: 1 },
];

function safetyWidget(subject: AiSubject): AiWidget {
    const rng = mulberry32(hash(`${subject.id}::safety`));
    const total = Math.floor(rng() * 9);                    // 0–8 events in the window
    const high = total ? Math.floor(rng() * Math.min(3, total)) : 0;
    const medium = total ? Math.min(total - high, Math.floor(rng() * 4)) : 0;
    const low = Math.max(0, total - high - medium);
    const coached = total ? Math.floor(rng() * (total + 1)) : 0;
    // Score: 100 down-weighted by severity, floored at 40.
    const score = Math.max(40, 100 - high * 12 - medium * 5 - low * 2);
    const tone: AiTone = score >= 90 ? 'emerald' : score >= 75 ? 'amber' : 'rose';

    const rows: AiRow[] = Array.from({ length: total }, (_, i) => {
        const sev = i < high ? 'high' : i < high + medium ? 'medium' : 'low';
        const ago = 1 + Math.floor(rng() * 27);
        return {
            title: SAFETY_EVENT_TYPES[Math.floor(rng() * SAFETY_EVENT_TYPES.length)],
            subtitle: `${subject.name} · ${SAFETY_LOCATIONS[Math.floor(rng() * SAFETY_LOCATIONS.length)]}`,
            badge: sev === 'high' ? 'High' : sev === 'medium' ? 'Medium' : 'Low',
            tone: sev === 'high' ? 'rose' : sev === 'medium' ? 'amber' : 'slate',
            meta: `${ago}d ago`,
            tags: ['all', sev, i < coached ? 'coached' : 'uncoached'],
            path: '/safety-events',
        };
    });

    return {
        key: 'safety', title: 'Safety score',
        summary: total
            ? `${total} event${total > 1 ? 's' : ''} in the last 30 days — ${high} high severity, ${coached} coached.`
            : `No safety events in the last 30 days. Clean record.`,
        progress: { label: 'Safety score', value: score, tone },
        stats: [
            { label: 'Score', value: String(score), tone },
            { label: 'High', value: String(high), tone: 'rose', filter: 'high' },
            { label: 'Medium', value: String(medium), tone: 'amber', filter: 'medium' },
            { label: 'Coached', value: String(coached), tone: 'emerald', filter: 'coached' },
        ],
        chart: { kind: 'bar', title: 'Events by severity', points: [
            { label: 'High', value: high, tone: 'rose', filter: 'high' },
            { label: 'Medium', value: medium, tone: 'amber', filter: 'medium' },
            { label: 'Low', value: low, tone: 'slate', filter: 'low' },
        ] },
        filters: [
            { id: 'high', label: 'High severity', tone: 'rose' },
            { id: 'medium', label: 'Medium', tone: 'amber' },
            { id: 'uncoached', label: 'Needs coaching', tone: 'amber' },
            { id: 'coached', label: 'Coached', tone: 'emerald' },
        ],
        rows,
        footnote: total > coached ? `${total - coached} event${total - coached > 1 ? 's' : ''} awaiting a coaching disposition` : 'Every event has a coaching disposition',
        link: { label: 'Open Safety Events', path: '/safety-events' },
    };
}

function violationsWidget(subject: AiSubject): AiWidget {
    const rng = mulberry32(hash(`${subject.id}::violations`));
    const count = Math.floor(rng() * 5);
    const picks = Array.from({ length: count }, () => VIOLATION_ITEMS[Math.floor(rng() * VIOLATION_ITEMS.length)]);
    const open = picks.filter((_, i) => i % 2 === 0);
    const points = picks.reduce((n, v) => n + v.pts, 0);
    const byBasic = new Map<string, number>();
    for (const v of picks) byBasic.set(v.basic, (byBasic.get(v.basic) ?? 0) + v.pts);

    return {
        key: 'violations', title: 'Violations & inspections',
        summary: count
            ? `${count} violation${count > 1 ? 's' : ''} on record — ${points} severity points across ${byBasic.size} BASIC${byBasic.size > 1 ? 's' : ''}.`
            : `No roadside violations on record.`,
        stats: [
            { label: 'Total', value: String(count), tone: 'blue', filter: 'all' },
            { label: 'Open', value: String(open.length), tone: 'rose', filter: 'open' },
            { label: 'Points', value: String(points), tone: points > 6 ? 'rose' : 'amber' },
            { label: 'OOS', value: String(picks.filter(v => v.pts >= 4).length), tone: 'rose', filter: 'oos' },
        ],
        chart: byBasic.size
            ? { kind: 'bar', title: 'Points by BASIC', points: [...byBasic.entries()].map(([label, value]) => ({ label, value, tone: 'rose' as AiTone })) }
            : undefined,
        filters: [{ id: 'open', label: 'Open', tone: 'rose' }, { id: 'oos', label: 'OOS qualifying', tone: 'rose' }],
        rows: picks.map((v, i) => ({
            title: v.title,
            subtitle: `${v.basic} · ${subject.name}`,
            badge: i % 2 === 0 ? 'Open' : 'Resolved',
            tone: i % 2 === 0 ? 'rose' : 'emerald',
            meta: `${v.pts} pts`,
            tags: ['all', i % 2 === 0 ? 'open' : 'resolved', ...(v.pts >= 4 ? ['oos'] : [])],
            path: '/violations',
        })),
        footnote: 'Roadside inspection results feed the carrier SMS profile',
        link: { label: 'Open Violations', path: '/violations' },
    };
}

function accidentsWidget(subject: AiSubject): AiWidget {
    const rng = mulberry32(hash(`${subject.id}::accidents`));
    const count = Math.floor(rng() * 3);
    const kinds = ['Rear-end', 'Sideswipe', 'Backing', 'Animal strike', 'Weather-related'];
    const rows: AiRow[] = Array.from({ length: count }, (_, i) => {
        const open = i === 0 && rng() > 0.4;
        return {
            title: `ACC-2026-00${20 + i}`,
            subtitle: `${kinds[Math.floor(rng() * kinds.length)]} · ${subject.name}`,
            badge: open ? 'Open' : 'Closed',
            tone: open ? 'rose' : 'emerald',
            meta: open ? 'awaiting report' : 'settled',
            tags: ['all', open ? 'open' : 'closed'],
            path: '/default-accidents',
        };
    });
    return {
        key: 'accidents', title: 'Accidents',
        summary: count ? `${count} accident${count > 1 ? 's' : ''} on record.` : 'No accidents on record.',
        stats: [
            { label: 'Total', value: String(count), tone: 'blue', filter: 'all' },
            { label: 'Open', value: String(rows.filter(r => r.badge === 'Open').length), tone: 'rose', filter: 'open' },
            { label: 'Closed', value: String(rows.filter(r => r.badge === 'Closed').length), tone: 'emerald', filter: 'closed' },
        ],
        filters: [{ id: 'open', label: 'Open', tone: 'rose' }, { id: 'closed', label: 'Closed', tone: 'emerald' }],
        rows,
        footnote: 'DOT-recordable accidents affect the crash BASIC',
        link: { label: 'Open Accidents', path: '/default-accidents' },
    };
}

function hosWidget(subject: AiSubject): AiWidget {
    const rng = mulberry32(hash(`${subject.id}::hos`));
    const used = Math.round(rng() * 140) / 10;              // 0.0 – 14.0 hours
    const left = Math.max(0, 14 - used);
    const driving = Math.min(11, Math.round(used * 0.8 * 10) / 10);
    const cycle = Math.round((30 + rng() * 40) * 10) / 10;   // of 70
    const tone: AiTone = left <= 1 ? 'rose' : left <= 3 ? 'amber' : 'emerald';
    const hm = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`;
    return {
        key: 'hos', title: 'Hours of Service',
        summary: left <= 1
            ? `${subject.name} is at the 14-hour limit — a 10-hour reset is required.`
            : `${hm(left)} left on the 14-hour clock; ${hm(cycle)} used of the 70-hour cycle.`,
        progress: { label: '14-hour clock used', value: Math.round((used / 14) * 100), tone },
        stats: [
            { label: 'On duty', value: hm(used), tone: 'blue' },
            { label: 'Driving', value: hm(driving), tone: 'blue' },
            { label: 'Remaining', value: hm(left), tone },
            { label: 'Cycle', value: `${cycle}h`, tone: cycle > 60 ? 'amber' : 'emerald' },
        ],
        chart: { kind: 'progress', title: 'Clocks', max: 14, unit: 'h', points: [
            { label: '14-hour', value: used, tone },
            { label: '11-hour drive', value: driving, tone: driving >= 10.5 ? 'rose' : 'emerald' },
            { label: '30-min break', value: rng() > 0.5 ? 0.5 : 0, tone: 'emerald' },
        ] },
        rows: [
            { title: 'Current duty status', subtitle: left <= 0 ? 'Off duty required' : 'On duty — driving', badge: left <= 1 ? 'Near limit' : 'OK', tone, meta: hm(left) + ' left', path: '/hours-of-service' },
        ],
        footnote: 'Live from the ELD feed',
        link: { label: 'Open Hours of Service', path: '/hours-of-service' },
    };
}

// ── the board ────────────────────────────────────────────────────────────────

export interface DashboardInput {
    subject: AiSubject;
    keys: AiWidgetKey[];
    /** Catalog + carrier custom records. */
    records: SafetyRecord[];
    getEntry: (subjectId: string, recordId: string) => RecordDataEntry;
    tickets: TicketRecord[];
    dq?: DqSnapshot;
}

/** Build the requested widgets for one driver / asset. */
export function buildSubjectDashboard(input: DashboardInput): AiDashboard {
    const { subject, keys, records, getEntry, tickets, dq } = input;
    const entity: EntityId = subject.kind === 'driver' ? 'Driver' : 'Asset';
    const states = recordStates(records, entity, subject.id, getEntry);
    const wanted = new Set(keys);
    const widgets: AiWidget[] = [];

    if (wanted.has('documents')) widgets.push(documentsWidget(states, subject.name));
    if (wanted.has('monitoring')) widgets.push(monitoringWidget(states, subject.name));
    if (wanted.has('safety')) widgets.push(safetyWidget(subject));
    if (wanted.has('tickets')) widgets.push(ticketsWidget(tickets, subject.name));
    if (wanted.has('dqfiles') && subject.kind === 'driver' && dq) widgets.push(dqWidget(dq, subject.name));
    if (wanted.has('violations')) widgets.push(violationsWidget(subject));
    if (wanted.has('accidents')) widgets.push(accidentsWidget(subject));
    if (wanted.has('hos') && subject.kind === 'driver') widgets.push(hosWidget(subject));

    // A one-line headline that leads with whatever needs attention most.
    const docs = widgets.find(w => w.key === 'documents');
    const missing = docs?.stats?.find(s => s.label === 'Missing')?.value ?? '0';
    const headline = missing !== '0'
        ? `${missing} document${missing === '1' ? '' : 's'} outstanding`
        : 'Nothing outstanding right now';

    return {
        subject, headline, widgets,
        link: { label: `Open ${subject.kind === 'driver' ? 'driver' : 'asset'} page`, path: subject.path },
    };
}
