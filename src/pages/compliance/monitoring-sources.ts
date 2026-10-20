import { FileCheck2, Package, Wrench, Gavel, GraduationCap, Send, FileSignature, type LucideIcon } from 'lucide-react';
import type { EntityId } from '@/pages/compliance/safety-software-catalog.data';
import type { DataDocFile, RecordDataEntry } from '@/pages/compliance/compliance-data-store';
import { monitoredDateFor } from '@/pages/compliance/monitoring-schedule';
import { DEFAULT_REMINDERS } from '@/pages/compliance/monitoring-routing.data';
import { inventoryMonitoring, itemName, itemDriverId, itemAssetAssignment, type InventoryItem } from '@/pages/inventory/inventory.data';
import { getTasksForCarrier, getOrdersForCarrier, INITIAL_SERVICE_TYPES, type MaintenanceTask } from '@/pages/assets/maintenance.data';
import { dueFromRule, SEED_INTERVAL_META, tierLabel } from '@/pages/assets/service-intervals';
import type { TicketRecord } from '@/pages/tickets/tickets.data';
import type { Applicant } from '@/pages/hiring-process/applicants.data';
import { resolveOnbWorkflow, getOnboardingFormDef, type OnbWorkflow } from '@/pages/hiring-process/onboarding.data';
import { policyDocuments } from '@/pages/hiring-process/policy-forms.data';
import { formRecordIdFor } from '@/pages/hiring-process/form-copies';
import { stepName } from '@/pages/hiring-process/hiring-templates.data';

// ─────────────────────────────────────────────────────────────────────────────
// monitoring-sources — everything in the app that has a date it can miss, as one feed.
//
// The Monitoring page listed compliance documents and nothing else, while five other
// modules kept their own due dates: a fuel card expiring, a PM-B falling due by mileage, a
// fine with a court date, a training with a deadline, a request the office is still waiting
// on. Each module is right about its own items — so this reads each module's own store and
// says nothing it was not told. Nothing here re-derives a module's schedule; a maintenance
// item is what the maintenance module's open task says, no more.
//
// Every item becomes a SourceAlert: who it belongs to (so the Carrier / Drivers / Assets
// tabs still work), when it is due or what state it is in, and where to open it.
// ─────────────────────────────────────────────────────────────────────────────

export type AlertSource = 'compliance' | 'inventory' | 'maintenance' | 'ticket' | 'training' | 'request' | 'form';
export type SourcePriority = 'overdue' | 'critical' | 'high' | 'medium' | 'low';

export const SOURCE_ORDER: AlertSource[] = ['compliance', 'inventory', 'maintenance', 'ticket', 'training', 'request', 'form'];

export const SOURCE_META: Record<AlertSource, { label: string; short: string; Icon: LucideIcon; tone: string; icon: string; path: string; openLabel: string }> = {
    compliance:  { label: 'Compliance documents', short: 'Compliance', Icon: FileCheck2,    tone: 'border-blue-200 bg-blue-50 text-blue-700',       icon: 'bg-blue-50 text-blue-600',       path: '/default-compliance-documents', openLabel: 'Open in Compliances & Documents' },
    inventory:   { label: 'Inventory',            short: 'Inventory',  Icon: Package,       tone: 'border-violet-200 bg-violet-50 text-violet-700', icon: 'bg-violet-50 text-violet-600',   path: '/inventory',                    openLabel: 'Open in Inventory' },
    maintenance: { label: 'Maintenance',          short: 'Maintenance', Icon: Wrench,       tone: 'border-amber-200 bg-amber-50 text-amber-700',    icon: 'bg-amber-50 text-amber-600',     path: '/maintenance',                  openLabel: 'Open in Maintenance' },
    ticket:      { label: 'Tickets & violations', short: 'Tickets',    Icon: Gavel,         tone: 'border-rose-200 bg-rose-50 text-rose-700',       icon: 'bg-rose-50 text-rose-600',       path: '/tickets',                      openLabel: 'Open in Tickets' },
    training:    { label: 'Training',             short: 'Training',   Icon: GraduationCap, tone: 'border-indigo-200 bg-indigo-50 text-indigo-700', icon: 'bg-indigo-50 text-indigo-600',   path: '/hiring-process/onboarding',    openLabel: 'Open onboarding file' },
    request:     { label: 'Requests',             short: 'Requests',   Icon: Send,          tone: 'border-teal-200 bg-teal-50 text-teal-700',       icon: 'bg-teal-50 text-teal-600',       path: '/hiring-process/hiring',        openLabel: 'Open file' },
    form:        { label: 'Forms to sign',        short: 'Forms',      Icon: FileSignature, tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: 'bg-emerald-50 text-emerald-600', path: '/hiring-process/onboarding', openLabel: 'Open onboarding file' },
};

export interface SourceAlert {
    id: string;
    source: AlertSource;
    entity: EntityId;
    subjectId: string;
    subjectLabel: string;
    title: string;
    description: string;
    numberLabel?: string;
    numberValue?: string;
    /** YYYY-MM-DD, or '' for a status watch. */
    date: string;
    daysUntil: number | null;
    isStatus: boolean;
    status: string;
    /** For a status watch, how urgent the source itself says it is. */
    statusPriority?: SourcePriority;
    reminders: number[];
    channels: { email: boolean; inApp: boolean };
    assignee?: { id: string; name: string };
    file?: DataDocFile | null;
    /** Where this item lives — the page, and the record to focus there. */
    link: { path: string; pendingId?: string; pendingType?: string };
}

// ── date helpers (YYYY-MM-DD, local) ─────────────────────────────────────────
const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
export function daysUntilYmd(s: string): number | null {
    if (!s) return null;
    const [y, m, d] = s.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return null;
    const dt = new Date(y, m - 1, d); dt.setHours(0, 0, 0, 0);
    return isNaN(dt.getTime()) ? null : Math.round((dt.getTime() - todayStart().getTime()) / 86400000);
}
const ymdOf = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ALL_CHANNELS = { email: true, inApp: true };

type AssetLite = { id: string; unitNumber: string; make?: string; model?: string; odometer?: number; odometerUnit?: string };
type DriverLite = { id: string; name: string };
const assetLabel = (a?: AssetLite, id = '') => (a ? `${a.unitNumber} · ${[a.make, a.model].filter(Boolean).join(' ')}`.replace(/ · $/, '') : id);

// ── Inventory ────────────────────────────────────────────────────────────────
/**
 * Items whose alert is switched on, filed against whoever holds them: the driver the item
 * is handed to, else the unit it is on, else the carrier.
 */
export function inventoryAlerts(items: InventoryItem[], assets: AssetLite[], drivers: DriverLite[], carrierLabel: string): SourceAlert[] {
    const out: SourceAlert[] = [];
    for (const item of items) {
        const cfg = inventoryMonitoring(item);
        if (!cfg.enabled) continue;
        const isStatus = cfg.basis === 'status';
        const date = isStatus ? '' : monitoredDateFor(cfg, item);
        if (!isStatus && !date) continue;
        const driverId = itemDriverId(item);
        const driver = driverId ? drivers.find((d) => d.id === driverId) : undefined;
        const unit = itemAssetAssignment(item);
        const asset = unit ? assets.find((a) => a.id === unit.targetId) : undefined;
        const [entity, subjectId, subjectLabel]: [EntityId, string, string] = driver
            ? ['Driver', driver.id, driver.name]
            : asset ? ['Asset', asset.id, assetLabel(asset)]
                : ['Carrier', '__carrier__', carrierLabel];
        const expired = item.status === 'Expired';
        out.push({
            id: `inventory:${item.id}`, source: 'inventory', entity, subjectId, subjectLabel,
            title: itemName(item), description: `Inventory · ${item.status}`,
            numberLabel: 'Serial', numberValue: item.serial,
            date, daysUntil: daysUntilYmd(date), isStatus, status: item.status,
            statusPriority: expired ? 'overdue' : item.status === 'Expiring Soon' ? 'high' : 'low',
            reminders: cfg.reminders?.length ? cfg.reminders : DEFAULT_REMINDERS,
            channels: cfg.channels ?? ALL_CHANNELS, assignee: cfg.assignee, file: null,
            link: { path: `/inventory/items/${item.id}` },
        });
    }
    return out;
}

// ── Maintenance ──────────────────────────────────────────────────────────────
const STATE_PRIORITY: Partial<Record<MaintenanceTask['status'], SourcePriority>> = { overdue: 'overdue', due: 'critical', upcoming: 'medium' };

/**
 * Every open PM task the maintenance module holds, one per rule per unit.
 *
 * A rule that runs on days has a date; one that runs on miles or hours has a reading to
 * reach, which is a status ("Mileage · 1,200 mi over"), not a date. Both are what the
 * module's own asset page shows — read from the task, not worked out again here.
 */
export function maintenanceAlerts(accountId: string, assets: AssetLite[]): SourceAlert[] {
    const tasks = getTasksForCarrier(accountId);
    const orders = getOrdersForCarrier(accountId);
    const onOrder = new Set(orders.filter((o) => o.status === 'open').flatMap((o) => o.taskIds));
    const serviceName = (id: string) => INITIAL_SERVICE_TYPES.find((t) => t.id === id)?.name ?? id;
    const seen = new Map<string, SourceAlert>();
    for (const t of tasks) {
        const pri = STATE_PRIORITY[t.status];
        if (!pri) continue;
        const asset = assets.find((a) => a.id === t.assetId);
        const assetMiles = !asset?.odometer ? 0 : asset.odometerUnit === 'km' ? Math.round(asset.odometer * 0.621371) : asset.odometer;
        const meter = { odometer: Math.max(t.meterSnapshot?.odometer ?? 0, assetMiles), engineHours: t.meterSnapshot?.engineHours ?? 0 };
        const due = dueFromRule(t.dueRule, meter);
        const meta = SEED_INTERVAL_META[t.scheduleId];
        const services = t.serviceTypeIds.map(serviceName);
        const tier = tierLabel(meta?.tier);
        const title = meta?.name ?? (tier ? `${tier} — ${services[0] ?? 'Service'}` : services.slice(0, 2).join(' · ') || 'Scheduled service');
        const byDate = t.dueRule?.unit === 'days' && !!t.dueRule.dueAtDate;
        const date = byDate ? t.dueRule!.dueAtDate!.slice(0, 10) : '';
        const key = `${t.assetId}|${t.scheduleId || title}`;
        const alert: SourceAlert = {
            id: `maintenance:${t.id}`, source: 'maintenance', entity: 'Asset', subjectId: t.assetId, subjectLabel: assetLabel(asset, t.assetId),
            title,
            description: [services.slice(0, 3).join(' · '), due ? `${due.label} · due at ${due.at}` : '', onOrder.has(t.id) ? 'On a work order' : ''].filter(Boolean).join(' · '),
            date, daysUntil: daysUntilYmd(date), isStatus: !byDate,
            status: due ? `${due.left ?? due.at}` : t.status,
            statusPriority: pri,
            reminders: DEFAULT_REMINDERS, channels: ALL_CHANNELS, file: null,
            link: { path: '/maintenance', pendingId: t.assetId, pendingType: 'asset' },
        };
        // One line per rule per unit — the most urgent open task wins.
        const prev = seen.get(key);
        if (!prev || rank(pri) < rank(prev.statusPriority ?? 'low')) seen.set(key, alert);
    }
    return [...seen.values()];
}
const rank = (p: SourcePriority) => ['overdue', 'critical', 'high', 'medium', 'low'].indexOf(p);

// ── Tickets ──────────────────────────────────────────────────────────────────
/** Open tickets: a court date where there is one, otherwise the fine itself, still due. */
export function ticketAlerts(tickets: TicketRecord[], drivers: DriverLite[], assets: AssetLite[]): SourceAlert[] {
    const out: SourceAlert[] = [];
    for (const t of tickets) {
        if (t.status !== 'Due' && t.status !== 'In Court') continue;
        const driver = drivers.find((d) => d.id === t.driverId);
        const asset = assets.find((a) => a.id === t.assetId);
        const court = t.ticketDetails?.courtDate?.slice(0, 10) ?? '';
        const fine = `${t.currency} ${t.fineAmount.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
        const violation = t.violationSubtype || t.violationType;
        out.push({
            id: `ticket:${t.id}`, source: 'ticket', entity: 'Driver', subjectId: t.driverId, subjectLabel: driver?.name ?? t.driverName,
            title: violation,
            description: [t.status === 'In Court' ? `In court${t.ticketDetails?.courtLocation ? ` · ${t.ticketDetails.courtLocation}` : ''}` : `Fine ${fine} due`, asset ? assetLabel(asset) : t.assetId, t.location].filter(Boolean).join(' · '),
            numberLabel: 'Offense #', numberValue: t.offenseNumber,
            date: court, daysUntil: daysUntilYmd(court), isStatus: !court,
            status: t.status === 'In Court' ? 'In court' : `Fine due · ${fine}`,
            statusPriority: t.status === 'Due' ? 'high' : 'medium',
            reminders: DEFAULT_REMINDERS, channels: ALL_CHANNELS, file: null,
            link: { path: '/tickets', pendingId: t.id, pendingType: 'ticket' },
        });
    }
    return out;
}

// ── Hiring & onboarding: training · requests · forms to sign ─────────────────
/**
 * What a driver's file is still waiting on. Training has a deadline; a request has one when
 * the office set it; a form that nobody has signed has no date, only a state.
 */
export function hiringAlerts(acct: string, applicants: Applicant[], workflows: OnbWorkflow[], complianceAll: Record<string, RecordDataEntry>): SourceAlert[] {
    const out: SourceAlert[] = [];
    const D = 86400000;
    for (const a of applicants) {
        if (a.carrierId && a.carrierId !== acct) continue;
        const name = `${a.firstName} ${a.lastName}`.trim();
        const hiringPath = `/hiring-process/hiring/${a.id}`;
        const onbPath = `/hiring-process/onboarding/${a.id}`;
        const subject = { entity: 'Driver' as EntityId, subjectId: a.id, subjectLabel: name };
        const base = { reminders: DEFAULT_REMINDERS, channels: ALL_CHANNELS, file: null as DataDocFile | null };

        // Requests still open — hiring file, then onboarding file.
        const reqs = [
            ...(a.requests ?? []).map((r) => ({ r, path: hiringPath, label: r.fid ? stepName(r.fid) : r.subject })),
            ...(a.onboarding?.requests ?? []).map((r) => ({ r, path: onbPath, label: r.itemLabel })),
        ];
        for (const { r, path, label } of reqs) {
            if (r.status !== 'open') continue;
            const date = r.dueDate?.slice(0, 10) ?? '';
            out.push({
                ...subject, ...base, id: `request:${r.id}`, source: 'request',
                title: label || r.subject,
                description: [`${r.action ?? 'Request'} → ${r.recipient}`, r.to, r.channel].filter(Boolean).join(' · '),
                date, daysUntil: daysUntilYmd(date), isStatus: !date, status: 'Awaiting response', statusPriority: 'medium',
                link: { path },
            });
        }

        const onb = a.onboarding;
        if (!onb || a.status !== 'approved') continue;

        // Training with a deadline.
        for (const t of onb.trainings ?? []) {
            if (t.status === 'completed') continue;
            const date = ymdOf(t.assignedAt + t.dueDays * D);
            out.push({
                ...subject, ...base, id: `training:${a.id}:${t.id}`, source: 'training',
                title: t.name, description: `Training · ${t.category}${t.mandatory ? ' · Mandatory' : ''} · ${t.status === 'in_progress' ? 'In progress' : 'Assigned'}`,
                date, daysUntil: daysUntilYmd(date), isStatus: false, status: t.status,
                link: { path: onbPath },
            });
        }

        // Forms the workflow asks for that nobody has signed yet.
        const wf = resolveOnbWorkflow(onb, a.formId, workflows);
        const signed = new Set([...(onb.signedContracts ?? []), ...(onb.signedForms ?? [])]);
        const started = onb.startedAt ? (Date.now() - onb.startedAt) / D : 0;
        for (const id of [...(wf?.policyForms ?? []), ...(wf?.forms ?? [])]) {
            if (signed.has(id)) continue;
            if ((complianceAll[`${acct}::${a.id}::${formRecordIdFor(id)}`]?.versions.length ?? 0) > 0) continue;
            const def = getOnboardingFormDef(id) ?? policyDocuments().find((p) => p.id === id);
            const label = def ? `${def.title} ${def.accentTitle}`.replace(/\s+/g, ' ').trim() : id;
            out.push({
                ...subject, ...base, id: `form:${a.id}:${id}`, source: 'form',
                title: label, description: `Onboarding · ${def?.kind === 'policy' ? 'Policy form' : 'Onboarding form'} · not yet signed`,
                date: '', daysUntil: null, isStatus: true, status: 'Awaiting signature',
                statusPriority: started > 14 ? 'high' : started > 7 ? 'medium' : 'low',
                link: { path: onbPath },
            });
        }
    }
    // Hiring consents the office asked the applicant for and has not got back.
    for (const a of applicants) {
        if (a.carrierId && a.carrierId !== acct) continue;
        for (const [fid, st] of Object.entries(a.docs ?? {})) {
            if (st !== 'requested') continue;
            out.push({
                entity: 'Driver', subjectId: a.id, subjectLabel: `${a.firstName} ${a.lastName}`.trim(),
                id: `form:${a.id}:${fid}`, source: 'form', title: stepName(fid), description: 'Hiring · requested from the applicant',
                date: '', daysUntil: null, isStatus: true, status: 'Requested · awaiting driver', statusPriority: 'high',
                reminders: DEFAULT_REMINDERS, channels: ALL_CHANNELS, file: null,
                link: { path: `/hiring-process/hiring/${a.id}` },
            });
        }
    }
    return out;
}
