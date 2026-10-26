import { APP_USERS, roleOn, type AppUser, type UserRole } from "@/data/users.data";
import { vendorsStore } from "@/data/vendorsStore";
import { ACCOUNTS_DB, getAccountById, type AccountRecord } from "@/pages/accounts/accounts.data";
import { getAssetsForAccount, getFleetCountsForAccount } from "@/pages/accounts/carrier-assets.data";
import { getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";
import { SUBSCRIPTIONS, TRANSACTIONS } from "@/pages/admin/billing.data";
import { getOrdersForCarrier, getTasksForCarrier } from "@/pages/assets/maintenance.data";
import {
    CARRIER_SUBJECT, currentVersion, entryStatus, instanceCurrent, instancesOf, readComplianceAll,
    type DocVersion, type RecordDataEntry,
} from "@/pages/compliance/compliance-data-store";
import { buildComplianceAlerts, priorityFor, priorityForStatus, type MonitoringAlert, type PriorityLevel } from "@/pages/compliance/monitoring-alerts";
import { responsesFor, routingFor } from "@/pages/compliance/monitoring-routing.data";
import { inventoryAlerts, maintenanceAlerts, ticketAlerts, type AlertSource, type SourceAlert } from "@/pages/compliance/monitoring-sources";
import { disabledRecordIds } from "@/pages/compliance/record-enablement";
import { customSafetyRecordsFor } from "@/pages/compliance/safety-custom-records.data";
import { SAFETY_RECORDS, isDateMonitored, type EntityId, type SafetyRecord } from "@/pages/compliance/safety-software-catalog.data";
import { getFuelForCarrier } from "@/pages/fuel/carrier-fuel.data";
import { readApplicants } from "@/pages/hiring-process/applicants.data";
import { getHosForCarrier } from "@/pages/hos/carrier-hos.data";
import { currentInventoryItems } from "@/pages/inventory/inventory-store";
import { isCompanyIssuedVendor } from "@/pages/inventory/inventory.data";
import { getConversations } from "@/pages/messages/messages-store";
import { getInspections } from "@/pages/roadside/roadside.data";
import { getChatContacts, getChatTags } from "@/pages/settings/chat-tags.data";
import { getTicketsForCarrierAccount } from "@/pages/tickets/tickets.store";
import { getViolationsForCarrier } from "@/pages/violations/carrier-violations.data";
import { carriersOfProfile } from "@/pages/users-roles/scope";
import { carrierUsers, serviceUsers } from "./profile-limits.data";

// Everything a Super Admin is shown about one carrier profile, or a service profile's worth
// of them, on the profile pages under Super Admin ▸ … Configuration.
//
// Read straight from each module's own store, the same functions those modules' pages read,
// so a number here and the number on the page it summarises are the same number. Nothing is
// seeded from here: a store that fills itself the first time its page opens (roadside,
// accidents) reads 0 until somebody has opened it — which is the truth about that carrier.

export type PriorityCounts = Record<PriorityLevel, number>;
const emptyPriorities = (): PriorityCounts => ({ overdue: 0, critical: 0, high: 0, medium: 0, low: 0 });

export type CarrierInsights = {
    carrier: AccountRecord;
    users: { office: number; byRole: Partial<Record<UserRole, number>>; driverLogins: number };
    fleet: { drivers: number; assets: number; powerUnits: number; trailers: number };
    documents: {
        /** Files on file across every version and instance. */
        files: number;
        /** Records with something captured. */
        captured: number;
        complete: number;
        requiredMissing: number;
        expired: number;
        expiringSoon: number;
        keyNumbers: number;
    };
    monitoring: {
        /** Versions with a monitor switched on — the watches that are running. */
        running: number;
        openAlerts: number;
        handled: number;
        byPriority: PriorityCounts;
        bySource: Partial<Record<AlertSource, number>>;
        rulesEnabled: number;
        rolesEnabled: number;
        alerts: MonitoringAlert[];
    };
    safety: { tickets: number; ticketsOpen: number; violations: number; inspections: number; inspectionsOos: number; accidents: number; hosLogs: number };
    operations: { workOrdersOpen: number; tasksOverdue: number; inventory: number; vendors: number; fuelPurchases: number; fuelSpend: number };
    hiring: { applicants: number; inProgress: number; approved: number; rejected: number };
    setup: { templates: number; keyNumbersEnabled: number; documentTypesEnabled: number };

    // ── The deeper cut. Every field a count, so a service profile can add them up.
    /** Office logins by state. */
    userStates: { active: number; invited: number; inactive: number };
    /** The roster, by status, and the licence every driver drives on. */
    drivers: { active: number; onLeave: number; inactive: number; cdlExpired: number; cdlExpiring: number };
    /** Units by operating status, the plate that keeps them on the road, how they are held and how old. */
    assets: {
        active: number; maintenance: number; outOfService: number; deactivated: number;
        regExpired: number; regExpiring: number;
        owned: number; leased: number;
        /** Sum of model years and how many had one — divide for the average. */
        yearSum: number; yearCount: number;
    };
    /** Required records complete vs missing, per subject kind. */
    coverage: { carrierComplete: number; carrierMissing: number; assetComplete: number; assetMissing: number; driverComplete: number; driverMissing: number };
    /** What the safety record has cost, and how serious it is. */
    risk: {
        finesUsd: number; finesCad: number; legalUsd: number; legalCad: number; demeritPoints: number;
        violationsOpen: number; violationsOos: number;
        accidentsInjury: number; accidentsPreventable: number;
        inspectionsPass: number; inspectionsFail: number;
    };
    /** Fuel burned and wasted. MPG is summed per driver summary — divide by `mpgCount`. */
    fuel: { gallons: number; idleMinutes: number; idleEvents: number; mpgSum: number; mpgCount: number };
    maintenance: { ordersCompleted: number; tasksDue: number; spend: number };
    inventoryState: { expired: number; expiring: number; handedOut: number };
    /** Carriers by safety rating, and the registrations held. One carrier counts once. */
    authority: {
        satisfactory: number; conditional: number; unsatisfactory: number; notRated: number;
        usdot: number; cvor: number; nsc: number; rin: number;
    };
    /** What people did on the carrier's alerts — Monitoring ▸ Take action. */
    activity: { actions: number; actions30d: number; lastActionAt: number };
};

const DAY = 86_400_000;
function dayState(iso?: string): "past" | "soon" | "later" | null {
    if (!iso) return null;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return null;
    const d = Math.floor((t - Date.now()) / DAY);
    return d < 0 ? "past" : d <= 30 ? "soon" : "later";
}

/** The assignment of templates and enabled items, read without writing a seed for the carrier. */
function readAssignment(carrierId: string): { appliedTemplateIds?: string[]; appliedTemplateId?: string; enabledKeyNumberIds?: string[]; enabledDocumentTypeIds?: string[] } | null {
    try {
        const raw = localStorage.getItem("ats:carrier-compliance-v2");
        const all = raw ? JSON.parse(raw) : null;
        return all?.[carrierId] ?? null;
    } catch { return null; }
}

type StoredAccident = { injuries?: boolean; preventable?: string };
function readAccidents(carrierId: string): StoredAccident[] {
    try {
        const raw = localStorage.getItem("accident-records-v2");
        const all = raw ? (JSON.parse(raw) as Record<string, StoredAccident[]>) : {};
        return all[carrierId] ?? [];
    } catch { return []; }
}

/** Take-action log of the Monitoring page, read without its hook. */
function readMonitoringActions(carrierId: string): { at: string }[] {
    try {
        const raw = localStorage.getItem("compliance-monitoring-actions-v1");
        const all = raw ? (JSON.parse(raw) as { acct: string; at: string }[]) : [];
        return all.filter((a) => a.acct === carrierId);
    } catch { return []; }
}

export function carrierInsights(carrierId: string, all: Record<string, RecordDataEntry> = readComplianceAll()): CarrierInsights | null {
    const carrier = getAccountById(carrierId);
    if (!carrier) return null;
    const drivers = getDriversForAccount(carrierId);
    const assets = getAssetsForAccount(carrierId);
    const fleet = getFleetCountsForAccount(carrierId);

    // ── Users
    const office = carrierUsers(carrierId);
    const byRole: Partial<Record<UserRole, number>> = {};
    for (const u of office) { const r = roleOn(u, carrierId); byRole[r] = (byRole[r] ?? 0) + 1; }
    const driverLogins = APP_USERS.filter((u) => u.id.startsWith("u-drv-") && u.accountId === carrierId).length;

    // ── Compliance documents — every subject the carrier has: itself, each asset, each driver.
    const records = [...customSafetyRecordsFor(carrierId), ...SAFETY_RECORDS];
    const recordsById = new Map<string, SafetyRecord>(records.map((r) => [r.id, r]));
    const empty: RecordDataEntry = { versions: [] };
    const subjects: { entity: EntityId; id: string }[] = [
        { entity: "Carrier", id: CARRIER_SUBJECT },
        ...assets.map((a) => ({ entity: "Asset" as EntityId, id: a.id })),
        ...drivers.map((d) => ({ entity: "Driver" as EntityId, id: d.id })),
    ];
    const docs = { files: 0, captured: 0, complete: 0, requiredMissing: 0, expired: 0, expiringSoon: 0, keyNumbers: 0 };
    const coverage = { carrierComplete: 0, carrierMissing: 0, assetComplete: 0, assetMissing: 0, driverComplete: 0, driverMissing: 0 };
    const coverKey = { Carrier: "carrier", Asset: "asset", Driver: "driver" } as const;
    let running = 0;
    for (const s of subjects) {
        const off = new Set(disabledRecordIds(carrierId, s.id));
        const k = coverKey[s.entity];
        for (const r of records) {
            if (r.entity !== s.entity || off.has(r.id)) continue;
            const entry = all[`${carrierId}::${s.id}::${r.id}`] ?? empty;
            const st = entryStatus(r, entry);
            if (st === "complete") { docs.complete++; coverage[`${k}Complete`]++; }
            else if (st === "missing") { docs.requiredMissing++; coverage[`${k}Missing`]++; }
        }
    }
    const prefix = `${carrierId}::`;
    for (const [key, entry] of Object.entries(all)) {
        if (!key.startsWith(prefix)) continue;
        const r = recordsById.get(key.slice(key.lastIndexOf("::") + 2));
        const versions: DocVersion[] = [...entry.versions, ...instancesOf(entry).flatMap((i) => i.versions)];
        if (versions.length) docs.captured++;
        docs.files += versions.reduce((n, v) => n + (v.files?.length ?? 0), 0);
        const currents = [currentVersion(entry), ...instancesOf(entry).map(instanceCurrent)].filter((v): v is DocVersion => !!v);
        for (const v of currents) {
            if (v.numberValue) docs.keyNumbers++;
            if (v.monitoring?.enabled) running++;
            if (r && isDateMonitored(r)) {
                const d = dayState(v.expiryDate);
                if (d === "past") docs.expired++;
                else if (d === "soon") docs.expiringSoon++;
            }
        }
    }

    // ── Monitoring — the alerts the carrier's Monitoring page shows, less the ones answered.
    const labelForSubject = (entity: EntityId, subjectId: string) => {
        if (subjectId === CARRIER_SUBJECT) return carrier.legalName;
        if (entity === "Asset") { const a = assets.find((x) => x.id === subjectId); return a ? a.unitNumber : subjectId; }
        if (entity === "Driver") return drivers.find((x) => x.id === subjectId)?.name ?? subjectId;
        return subjectId;
    };
    const tickets = getTicketsForCarrierAccount(carrierId);
    const assetLite = assets.map((a) => ({ id: a.id, unitNumber: a.unitNumber, make: a.make, model: a.model, odometer: a.odometer }));
    const driverLite = drivers.map((d) => ({ id: d.id, name: d.name }));
    const sources: SourceAlert[] = [
        ...inventoryAlerts(currentInventoryItems(carrierId), assetLite, driverLite, carrier.legalName),
        ...maintenanceAlerts(carrierId, assetLite),
        ...ticketAlerts(tickets, driverLite, assetLite),
    ];
    const alerts: MonitoringAlert[] = [
        ...buildComplianceAlerts({ acct: carrierId, all, recordsById, labelForSubject }),
        ...sources.map((s) => ({
            id: s.id, source: s.source, title: s.title, description: s.description, link: s.link,
            entity: s.entity, subjectId: s.subjectId, subjectLabel: s.subjectLabel, date: s.date, daysUntil: s.daysUntil, status: s.status,
            priority: s.isStatus ? (s.statusPriority ?? priorityForStatus(s.status)) : priorityFor(s.daysUntil ?? 9999, s.reminders.slice().sort((x, y) => y - x)),
        }) as MonitoringAlert),
    ];
    const answered = responsesFor(carrierId);
    const open = alerts.filter((a) => !answered[a.id]);
    const byPriority = emptyPriorities();
    const bySource: Partial<Record<AlertSource, number>> = {};
    for (const a of open) { byPriority[a.priority]++; bySource[a.source] = (bySource[a.source] ?? 0) + 1; }
    const routing = routingFor(carrierId);

    // ── Safety, operations, hiring
    const inspections = getInspections(carrierId);
    const orders = getOrdersForCarrier(carrierId);
    const tasks = getTasksForCarrier(carrierId);
    const fuel = getFuelForCarrier(carrierId);
    const applicants = readApplicants().filter((a) => a.carrierId === carrierId);
    const assignment = readAssignment(carrierId);
    const accidents = readAccidents(carrierId);
    const violations = getViolationsForCarrier(carrierId);
    const inventory = currentInventoryItems(carrierId);
    const actions = readMonitoringActions(carrierId);
    const actionTimes = actions.map((a) => Date.parse(a.at)).filter((t) => !Number.isNaN(t));
    const cdl = drivers.map((d) => dayState(d.licenseExpiry));
    const reg = assets.map((a) => dayState(a.registrationExpiryDate));
    const years = assets.map((a) => a.year).filter((y) => typeof y === "number" && y > 1900);
    const sumBy = <T,>(list: T[], read: (x: T) => number | undefined) => list.reduce((s, x) => s + (Number(read(x)) || 0), 0);

    return {
        carrier,
        users: { office: office.length, byRole, driverLogins },
        fleet: { drivers: drivers.length, assets: assets.length, powerUnits: fleet.powerUnits, trailers: fleet.trailers },
        documents: docs,
        monitoring: {
            running, openAlerts: open.length, handled: alerts.length - open.length, byPriority, bySource,
            rulesEnabled: routing.rules.filter((r) => r.enabled).length, rolesEnabled: routing.roles.filter((r) => r.enabled).length,
            alerts: open,
        },
        safety: {
            tickets: tickets.length,
            ticketsOpen: tickets.filter((t) => t.status === "Due" || t.status === "In Court").length,
            violations: violations.length,
            inspections: inspections.length,
            inspectionsOos: inspections.filter((i) => i.oos).length,
            accidents: accidents.length,
            hosLogs: getHosForCarrier(carrierId).dailyLogs.length,
        },
        operations: {
            workOrdersOpen: orders.filter((o) => o.status === "open").length,
            tasksOverdue: tasks.filter((t) => t.status === "overdue").length,
            inventory: inventory.length,
            // Real suppliers only — every company-issued accessory carries a placeholder
            // "Company Issued" vendor row, and counting those made vendors equal inventory.
            vendors: vendorsStore.getForAccount(carrierId).filter((v) => !isCompanyIssuedVendor(v)).length,
            fuelPurchases: fuel.purchases.length,
            fuelSpend: fuel.purchases.reduce((n, p) => n + (Number((p as { totalCost?: number }).totalCost) || 0), 0),
        },
        hiring: {
            applicants: applicants.length,
            inProgress: applicants.filter((a) => a.status === "in-progress" || a.status === "submitted" || a.status === "under-review" || a.status === "waiting").length,
            approved: applicants.filter((a) => a.status === "approved").length,
            rejected: applicants.filter((a) => a.status === "rejected").length,
        },
        setup: {
            templates: assignment?.appliedTemplateIds?.length ?? (assignment?.appliedTemplateId ? 1 : 0),
            keyNumbersEnabled: assignment?.enabledKeyNumberIds?.length ?? 0,
            documentTypesEnabled: assignment?.enabledDocumentTypeIds?.length ?? 0,
        },
        userStates: {
            active: office.filter((u) => u.status === "Active").length,
            invited: office.filter((u) => u.status === "Invited").length,
            inactive: office.filter((u) => u.status === "Inactive").length,
        },
        drivers: {
            active: drivers.filter((d) => d.status === "Active").length,
            onLeave: drivers.filter((d) => d.status === "On Leave").length,
            inactive: drivers.filter((d) => d.status === "Inactive" || d.status === "Terminated").length,
            cdlExpired: cdl.filter((s) => s === "past").length,
            cdlExpiring: cdl.filter((s) => s === "soon").length,
        },
        assets: {
            active: assets.filter((a) => a.operationalStatus === "Active").length,
            maintenance: assets.filter((a) => a.operationalStatus === "Maintenance").length,
            outOfService: assets.filter((a) => a.operationalStatus === "OutOfService").length,
            deactivated: assets.filter((a) => a.operationalStatus === "Deactivated").length,
            regExpired: reg.filter((s) => s === "past").length,
            regExpiring: reg.filter((s) => s === "soon").length,
            owned: assets.filter((a) => a.financialStructure === "Owned").length,
            leased: assets.filter((a) => a.financialStructure && a.financialStructure !== "Owned").length,
            yearSum: years.reduce((s, y) => s + y, 0),
            yearCount: years.length,
        },
        coverage,
        risk: {
            finesUsd: sumBy(tickets.filter((t) => t.currency !== "CAD"), (t) => t.fineAmount),
            finesCad: sumBy(tickets.filter((t) => t.currency === "CAD"), (t) => t.fineAmount),
            legalUsd: sumBy(tickets.filter((t) => t.currency !== "CAD"), (t) => t.legalExpense),
            legalCad: sumBy(tickets.filter((t) => t.currency === "CAD"), (t) => t.legalExpense),
            demeritPoints: sumBy(tickets, (t) => t.demeritPoints),
            violationsOpen: violations.filter((v) => v.status === "Open").length,
            violationsOos: violations.filter((v) => v.isOos).length,
            accidentsInjury: accidents.filter((a) => a.injuries).length,
            accidentsPreventable: accidents.filter((a) => a.preventable === "Preventable").length,
            inspectionsPass: inspections.filter((i) => i.result === "Pass").length,
            inspectionsFail: inspections.filter((i) => i.result !== "Pass").length,
        },
        fuel: {
            gallons: Math.round(sumBy(fuel.purchases, (p) => p.gallons)),
            idleMinutes: sumBy(fuel.idlingEvents, (e) => e.durationMinutes),
            idleEvents: fuel.idlingEvents.length,
            mpgSum: sumBy(fuel.summaries.filter((s) => s.avgMpg > 0), (s) => s.avgMpg),
            mpgCount: fuel.summaries.filter((s) => s.avgMpg > 0).length,
        },
        maintenance: {
            ordersCompleted: orders.filter((o) => o.status === "completed").length,
            tasksDue: tasks.filter((t) => t.status === "due").length,
            spend: sumBy(orders, (o) => o.bill?.total),
        },
        inventoryState: {
            expired: inventory.filter((i) => i.status === "Expired").length,
            expiring: inventory.filter((i) => i.status === "Expiring Soon").length,
            handedOut: inventory.filter((i) => !!i.assignedTo || !!i.assignedDriverId).length,
        },
        authority: {
            satisfactory: carrier.safetyRating === "Satisfactory" ? 1 : 0,
            conditional: carrier.safetyRating === "Conditional" ? 1 : 0,
            unsatisfactory: carrier.safetyRating === "Unsatisfactory" ? 1 : 0,
            notRated: carrier.safetyRating === "Not Rated" ? 1 : 0,
            usdot: carrier.dotNumber ? 1 : 0,
            cvor: carrier.cvorNumber ? 1 : 0,
            nsc: carrier.nscNumber || carrier.nscNumbers?.length ? 1 : 0,
            rin: carrier.rinNumber ? 1 : 0,
        },
        activity: {
            actions: actions.length,
            actions30d: actionTimes.filter((t) => Date.now() - t <= 30 * DAY).length,
            lastActionAt: actionTimes.length ? Math.max(...actionTimes) : 0,
        },
    };
}

/** A service profile's carriers added up, plus what only a profile has: its Admins and its bill. */
export function serviceInsights(spId: string) {
    const all = readComplianceAll();
    const carriers = carriersOfProfile(spId).map((c) => carrierInsights(c.id, all)).filter((x): x is CarrierInsights => !!x);
    // Every section starts at zero, so a profile with no carriers yet still answers every
    // question with 0 rather than with a missing key (which a figure would try to format).
    const Z = {
        fleet: { drivers: 0, assets: 0, powerUnits: 0, trailers: 0 },
        documents: { files: 0, captured: 0, complete: 0, requiredMissing: 0, expired: 0, expiringSoon: 0, keyNumbers: 0 },
        safety: { tickets: 0, ticketsOpen: 0, violations: 0, inspections: 0, inspectionsOos: 0, accidents: 0, hosLogs: 0 },
        operations: { workOrdersOpen: 0, tasksOverdue: 0, inventory: 0, vendors: 0, fuelPurchases: 0, fuelSpend: 0 },
        hiring: { applicants: 0, inProgress: 0, approved: 0, rejected: 0 },
        drivers: { active: 0, onLeave: 0, inactive: 0, cdlExpired: 0, cdlExpiring: 0 },
        assets: { active: 0, maintenance: 0, outOfService: 0, deactivated: 0, regExpired: 0, regExpiring: 0, owned: 0, leased: 0, yearSum: 0, yearCount: 0 },
        coverage: { carrierComplete: 0, carrierMissing: 0, assetComplete: 0, assetMissing: 0, driverComplete: 0, driverMissing: 0 },
        risk: { finesUsd: 0, finesCad: 0, legalUsd: 0, legalCad: 0, demeritPoints: 0, violationsOpen: 0, violationsOos: 0, accidentsInjury: 0, accidentsPreventable: 0, inspectionsPass: 0, inspectionsFail: 0 },
        fuel: { gallons: 0, idleMinutes: 0, idleEvents: 0, mpgSum: 0, mpgCount: 0 },
        maintenance: { ordersCompleted: 0, tasksDue: 0, spend: 0 },
        inventoryState: { expired: 0, expiring: 0, handedOut: 0 },
        authority: { satisfactory: 0, conditional: 0, unsatisfactory: 0, notRated: 0, usdot: 0, cvor: 0, nsc: 0, rin: 0 },
    } satisfies { [K in keyof CarrierInsights]?: Record<string, number> };
    const sum = <T extends Record<string, number>>(pick: (c: CarrierInsights) => T, zero: T): T => {
        const out = { ...zero } as Record<string, number>;
        for (const c of carriers) for (const [k, v] of Object.entries(pick(c))) out[k] = (out[k] ?? 0) + v;
        return out as T;
    };
    const users = serviceUsers(spId);
    const sub = SUBSCRIPTIONS.find((s) => s.serviceProfileId === spId);
    const tx = TRANSACTIONS.filter((t) => t.serviceProfileId === spId);
    const byPriority = emptyPriorities();
    for (const c of carriers) for (const k of Object.keys(byPriority) as PriorityLevel[]) byPriority[k] += c.monitoring.byPriority[k];
    return {
        carriers,
        users: { office: users.length, admins: users.filter((u: AppUser) => u.role === "admin").length },
        fleet: sum((c) => c.fleet, Z.fleet),
        documents: sum((c) => c.documents, Z.documents),
        monitoring: {
            running: carriers.reduce((n, c) => n + c.monitoring.running, 0),
            openAlerts: carriers.reduce((n, c) => n + c.monitoring.openAlerts, 0),
            handled: carriers.reduce((n, c) => n + c.monitoring.handled, 0),
            rulesEnabled: carriers.reduce((n, c) => n + c.monitoring.rulesEnabled, 0),
            byPriority,
            alerts: carriers.flatMap((c) => c.monitoring.alerts.map((a) => ({ ...a, carrier: c.carrier }))),
        },
        safety: sum((c) => c.safety, Z.safety),
        operations: sum((c) => c.operations, Z.operations),
        hiring: sum((c) => c.hiring, Z.hiring),
        userStates: {
            active: users.filter((u) => u.status === "Active").length,
            invited: users.filter((u) => u.status === "Invited").length,
            inactive: users.filter((u) => u.status === "Inactive").length,
        },
        drivers: sum((c) => c.drivers, Z.drivers),
        assets: sum((c) => c.assets, Z.assets),
        coverage: sum((c) => c.coverage, Z.coverage),
        risk: sum((c) => c.risk, Z.risk),
        fuel: sum((c) => c.fuel, Z.fuel),
        maintenance: sum((c) => c.maintenance, Z.maintenance),
        inventoryState: sum((c) => c.inventoryState, Z.inventoryState),
        authority: sum((c) => c.authority, Z.authority),
        activity: {
            actions: carriers.reduce((s, c) => s + c.activity.actions, 0),
            actions30d: carriers.reduce((s, c) => s + c.activity.actions30d, 0),
            lastActionAt: Math.max(0, ...carriers.map((c) => c.activity.lastActionAt)),
        },
        billing: {
            subscription: sub ?? null,
            paid: tx.filter((t) => t.status === "Paid").reduce((n, t) => n + t.amount, 0),
            transactions: tx.length,
            failed: tx.filter((t) => t.status === "Failed").length,
            pending: tx.filter((t) => t.status === "Pending").length,
        },
    };
}
export type ServiceInsights = ReturnType<typeof serviceInsights>;

/**
 * The Messages hub, counted. Conversations carry no carrier yet — the hub is the workspace's —
 * so this is the same for every profile and is labelled that way where it is shown.
 */
export function chatInsights() {
    const convs = getConversations();
    const internal = convs.filter((c) => c.kind === "internal" && !c.ai);
    const external = convs.filter((c) => c.kind === "external");
    const messages = convs.flatMap((c) => c.messages);
    return {
        internal: internal.length,
        external: external.length,
        aiAgents: convs.filter((c) => c.ai).length,
        secureLinks: external.filter((c) => !!c.linkToken && !c.emailOnly).length,
        emailOnly: external.filter((c) => c.emailOnly).length,
        disabled: convs.filter((c) => c.status === "disabled").length,
        unread: convs.reduce((n, c) => n + (c.unread ?? 0), 0),
        messages: messages.filter((m) => (m as { system?: boolean }).system !== true).length,
        attachments: messages.reduce((n, m) => n + ((m as { attachments?: unknown[] }).attachments?.length ?? 0), 0),
        tags: getChatTags().length,
        taggedContacts: getChatContacts().length,
    };
}
export type ChatInsights = ReturnType<typeof chatInsights>;

/** Carriers with no service profile are still carriers; this is the list either page starts from. */
export const allCarriers = (): AccountRecord[] => ACCOUNTS_DB;
