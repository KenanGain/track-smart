import { useEffect, useMemo, useState } from 'react';
import { subscribeUsers, type AppUser } from '@/data/users.data';
import { getAccountById, type AccountRecord } from '@/pages/accounts/accounts.data';
import { getServiceProfileById, type ServiceProfile } from '@/pages/accounts/service-profiles.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import type { Asset } from '@/pages/assets/assets.data';
import type { Driver } from '@/data/mock-app-data';
import { carrierInsights, serviceInsights, type CarrierInsights, type ServiceInsights } from '@/pages/admin/profile-insights';
import { carrierUsers, serviceUsers } from '@/pages/admin/profile-limits.data';
import { carriersOfProfile } from '@/pages/users-roles/scope';
import { currentVersion, entryStatus, readComplianceAll, subscribeComplianceData, type RecordDataEntry } from '@/pages/compliance/compliance-data-store';
import { SAFETY_RECORDS, isDateMonitored, type EntityId, type SafetyRecord } from '@/pages/compliance/safety-software-catalog.data';
import { customSafetyRecordsFor, subscribeCustomSafetyRecords } from '@/pages/compliance/safety-custom-records.data';
import { disabledRecordIds } from '@/pages/compliance/record-enablement';
import { subscribeMonitoringRouting } from '@/pages/compliance/monitoring-routing.data';
import { maintenanceAlerts, type SourceAlert } from '@/pages/compliance/monitoring-sources';
import { useCarrierTickets } from '@/pages/tickets/tickets.store';
import type { TicketRecord } from '@/pages/tickets/tickets.data';
import { useAccidentRecords, type AccidentRecord } from '@/data/accident-records.data';
import { seedInspections, useInspections, type RoadsideInspection } from '@/pages/roadside/roadside.data';
import { getHosLogs, getHosViolations, type HosLogRecord, type HosViolationRecord } from '@/pages/hos/hos-violations.data';
import { SAFETY_EVENTS_RESULTS } from '@/pages/safety-events/SafetyEventsPage';
import { computeFleetSafetyScore, computeFleetScoreTrend, type FleetSafetyScore, type TrendPoint } from '@/pages/safety-analysis/fleet-safety-score.data';
import { useApplicants, type Applicant } from '@/pages/hiring-process/applicants.data';
import { currentInventoryItems } from '@/pages/inventory/inventory-store';
import type { InventoryItem } from '@/pages/inventory/inventory.data';
import { getFuelForCarrier } from '@/pages/fuel/carrier-fuel.data';
import { FUEL_PURCHASES, IDLING_EVENTS, type FuelPurchase, type IdlingEvent } from '@/pages/fuel/fuel.data';
import { useConversations, type Conversation } from '@/pages/messages/messages-store';
import { auditEventsFor, subscribeAudit, type AuditEvent } from '@/data/audit-log.data';

// ─────────────────────────────────────────────────────────────────────────────
// Everything the dashboard's widgets read, gathered once per render of the page.
//
// Nothing here is a second copy of a number: the counts come from `carrierInsights` (the
// same roll-up the Super Admin profile pages show) and the lists from each module's own
// store, through the same functions that module's page calls. The widgets only pick and
// format. Live: every store that can change announces itself, and the whole thing is
// recomputed — cheap enough for one carrier, and a service profile is a handful of them.
// ─────────────────────────────────────────────────────────────────────────────

export type DashScope = { kind: 'carrier'; accountId: string } | { kind: 'profile'; serviceProfileId: string };

/** One driver's or unit's required records, counted — the rows behind "who is short of what". */
export interface SubjectGaps {
    id: string;
    label: string;
    sub?: string;
    required: number;
    complete: number;
    missing: number;
    expiring: number;
    expired: number;
    /** The record to open first — a missing one, else an expired one, else one expiring — for "upload". */
    firstGap?: { recordId: string; name: string; state: 'missing' | 'expired' | 'expiring' };
    /** Every record that is missing, expired or expiring — the list behind "records to fix". */
    gapList: { recordId: string; name: string; state: 'missing' | 'expired' | 'expiring'; expiry?: string }[];
}

/** A telematics event, the few fields a tile needs. The feed is fleet-wide (no carrier on it). */
export interface TelematicsEvent {
    id: string;
    type: string;
    driverName: string;
    vehicle: string;
    startedAt: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface DashData {
    scope: DashScope;
    account: AccountRecord | null;
    profile: ServiceProfile | null;
    /** The carriers in scope — one, or a service profile's. */
    carriers: AccountRecord[];
    carrier: CarrierInsights | null;
    service: ServiceInsights | null;
    gaps: { drivers: SubjectGaps[]; assets: SubjectGaps[] };
    drivers: Driver[];
    assets: Asset[];
    maintenance: SourceAlert[];
    tickets: TicketRecord[];
    accidents: AccidentRecord[];
    inspections: RoadsideInspection[];
    hosViolations: HosViolationRecord[];
    hosLogs: HosLogRecord[];
    telematics: TelematicsEvent[];
    safety: FleetSafetyScore | null;
    trend: TrendPoint[];
    applicants: Applicant[];
    inventory: InventoryItem[];
    purchases: FuelPurchase[];
    idling: IdlingEvent[];
    users: AppUser[];
    conversations: Conversation[];
    audit: AuditEvent[];
}

const DAY = 86_400_000;
/** Where a date stands today: gone, inside 30 days, or further out. */
export function dayState(iso?: string): 'past' | 'soon' | 'later' | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    const d = Math.floor((t - Date.now()) / DAY);
    return d < 0 ? 'past' : d <= 30 ? 'soon' : 'later';
}

/** Required records per subject, the way the Compliance & Documents page counts them. */
function subjectGaps(acct: string, entity: EntityId, subjects: { id: string; label: string; sub?: string }[], records: SafetyRecord[], all: Record<string, RecordDataEntry>): SubjectGaps[] {
    const mine = records.filter((r) => r.entity === entity);
    const empty: RecordDataEntry = { versions: [] };
    return subjects.map((s) => {
        const off = new Set(disabledRecordIds(acct, s.id));
        const g: SubjectGaps = { id: s.id, label: s.label, sub: s.sub, required: 0, complete: 0, missing: 0, expiring: 0, expired: 0, gapList: [] };
        for (const r of mine) {
            if (off.has(r.id)) continue;
            const entry = all[`${acct}::${s.id}::${r.id}`] ?? empty;
            const st = entryStatus(r, entry);
            if (st === 'optional') continue;
            g.required++;
            if (st === 'missing') { g.missing++; g.gapList.push({ recordId: r.id, name: r.recordName, state: 'missing' }); if (!g.firstGap || g.firstGap.state !== 'missing') g.firstGap = { recordId: r.id, name: r.recordName, state: 'missing' }; continue; }
            const cur = currentVersion(entry);
            const d = isDateMonitored(r) ? dayState(cur?.expiryDate) : null;
            if (d === 'past') { g.expired++; g.gapList.push({ recordId: r.id, name: r.recordName, state: 'expired', expiry: cur?.expiryDate }); if (!g.firstGap || g.firstGap.state === 'expiring') g.firstGap = { recordId: r.id, name: r.recordName, state: 'expired' }; }
            else { g.complete++; if (d === 'soon') { g.expiring++; g.gapList.push({ recordId: r.id, name: r.recordName, state: 'expiring', expiry: cur?.expiryDate }); if (!g.firstGap) g.firstGap = { recordId: r.id, name: r.recordName, state: 'expiring' }; } }
        }
        return g;
    });
}

const LIVE_EVENTS = [
    'carrier-drivers-changed', 'carrier-assets-changed', 'inv-item-additions-change', 'app-accounts-changed',
    'compliance-record-enablement-change', 'accident-records-change', 'storage',
];

export function useDashData(scope: DashScope): DashData {
    // One counter for every store without a hook; the hooks below re-render on their own.
    const [version, setVersion] = useState(0);
    useEffect(() => {
        const bump = () => setVersion((v) => v + 1);
        const offs = [subscribeComplianceData(bump), subscribeCustomSafetyRecords(bump), subscribeMonitoringRouting(bump), subscribeUsers(bump), subscribeAudit(bump)];
        LIVE_EVENTS.forEach((e) => window.addEventListener(e, bump));
        return () => { offs.forEach((off) => { if (typeof off === 'function') off(); }); LIVE_EVENTS.forEach((e) => window.removeEventListener(e, bump)); };
    }, []);

    const acct = scope.kind === 'carrier' ? scope.accountId : undefined;
    // Roadside fills itself the first time its page opens; the dashboard is often that first time.
    useEffect(() => { if (acct) seedInspections(acct); }, [acct]);
    const tickets = useCarrierTickets(acct);
    const { records: accidents } = useAccidentRecords(acct);
    const inspectionsAll = useInspections(acct);
    const { applicants: applicantsAll } = useApplicants();
    const conversations = useConversations();

    return useMemo<DashData>(() => {
        const all = readComplianceAll();
        if (scope.kind === 'carrier') {
            const account = getAccountById(scope.accountId) ?? null;
            const carrier = carrierInsights(scope.accountId, all);
            const drivers = getDriversForAccount(scope.accountId);
            const assets = getAssetsForAccount(scope.accountId);
            const records = [...customSafetyRecordsFor(scope.accountId), ...SAFETY_RECORDS];
            const fuel = getFuelForCarrier(scope.accountId);
            return {
                scope, account, profile: account?.serviceProfileId ? getServiceProfileById(account.serviceProfileId) ?? null : null,
                carriers: account ? [account] : [],
                carrier, service: null,
                gaps: {
                    drivers: subjectGaps(scope.accountId, 'Driver', drivers.map((d) => ({ id: d.id, label: d.name, sub: d.status })), records, all),
                    assets: subjectGaps(scope.accountId, 'Asset', assets.map((a) => ({ id: a.id, label: a.unitNumber, sub: `${a.assetType} · ${a.operationalStatus}` })), records, all),
                },
                drivers, assets,
                maintenance: maintenanceAlerts(scope.accountId, assets.map((a) => ({ id: a.id, unitNumber: a.unitNumber, make: a.make, model: a.model, odometer: a.odometer }))),
                tickets, accidents,
                inspections: inspectionsAll,
                hosViolations: getHosViolations(scope.accountId),
                hosLogs: getHosLogs(scope.accountId),
                telematics: (SAFETY_EVENTS_RESULTS as TelematicsEvent[]).map((e) => ({ id: String(e.id), type: e.type, driverName: e.driverName, vehicle: e.vehicle, startedAt: e.startedAt, severity: e.severity })),
                safety: computeFleetSafetyScore(scope.accountId),
                trend: computeFleetScoreTrend(scope.accountId, 12),
                applicants: applicantsAll.filter((a) => a.carrierId === scope.accountId),
                inventory: currentInventoryItems(scope.accountId),
                purchases: fuel.purchases.length ? fuel.purchases : FUEL_PURCHASES,
                idling: fuel.idlingEvents.length ? fuel.idlingEvents : IDLING_EVENTS,
                users: carrierUsers(scope.accountId),
                conversations,
                audit: auditEventsFor({ kind: 'carrier', accountId: scope.accountId }),
            };
        }
        const profile = getServiceProfileById(scope.serviceProfileId) ?? null;
        const carriers = carriersOfProfile(scope.serviceProfileId);
        const ids = new Set(carriers.map((c) => c.id));
        const service = serviceInsights(scope.serviceProfileId);
        return {
            scope, account: null, profile, carriers,
            carrier: null, service,
            gaps: { drivers: [], assets: [] },
            drivers: carriers.flatMap((c) => getDriversForAccount(c.id)),
            assets: carriers.flatMap((c) => getAssetsForAccount(c.id)),
            maintenance: carriers.flatMap((c) => maintenanceAlerts(c.id, getAssetsForAccount(c.id).map((a) => ({ id: a.id, unitNumber: a.unitNumber, make: a.make, model: a.model, odometer: a.odometer })))),
            tickets: [], accidents: [],
            inspections: inspectionsAll.filter((i) => ids.has(i.accountId)),
            hosViolations: carriers.flatMap((c) => getHosViolations(c.id)),
            hosLogs: carriers.flatMap((c) => getHosLogs(c.id)),
            telematics: [],
            safety: null, trend: [],
            applicants: applicantsAll.filter((a) => !!a.carrierId && ids.has(a.carrierId)),
            inventory: carriers.flatMap((c) => currentInventoryItems(c.id)),
            purchases: carriers.flatMap((c) => getFuelForCarrier(c.id).purchases),
            idling: carriers.flatMap((c) => getFuelForCarrier(c.id).idlingEvents),
            users: serviceUsers(scope.serviceProfileId),
            conversations,
            audit: auditEventsFor({ kind: 'profile', serviceProfileId: scope.serviceProfileId }),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `version` stands for every store without a hook
    }, [scope, version, tickets, accidents, inspectionsAll, applicantsAll, conversations]);
}
