/**
 * Risk-engine adapters.
 *
 * Spec: docs/SAFETY.md §3 (Data Sources & JSON Extraction).
 *
 * One file holds:
 *   • The adapter context factory (carrier-scoped driver/asset resolvers).
 *   • One adapter per source: FMCSA / CVOR / NSC AB-BC-PE-NS / NSC inspections /
 *     internal incidents / HOS / VEDR / maintenance / training / documents.
 *
 * Every adapter is a pure function `(raw, ctx) => RiskEvent[]`. No mutation of
 * the input. Empty / missing inputs return `[]`. Adapters never throw.
 */

import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import {
    cvorInterventionEvents,
    type CvorInterventionEvent,
} from '@/pages/inspections/cvorInterventionEvents.data';
import { NSC_INSPECTIONS, type NscInspectionRecord } from '@/pages/inspections/nscInspectionsData';
import { inspectionsData } from '@/pages/inspections/inspectionsData';
import { INCIDENTS } from '@/pages/incidents/incidents.data';
import {
    getCarrierProfileFor,
    getNscAbProfileFor,
    getNscBcProfileFor,
    getNscPeProfileFor,
    getNscNsProfileFor,
} from '@/data/carrier-safety-data';

import type {
    AdapterContext,
    AssetQuery,
    DriverQuery,
    RiskAdapter,
    RiskDomain,
    RiskEvent,
    RiskKind,
} from './risk-engine.types';

// ── Context factory ──────────────────────────────────────────────────────────

const norm = (s?: string): string => (s ?? '').trim().toLowerCase();

/** Build a carrier-scoped resolver. Driver / asset lookup is restricted to
 *  the carrier's own roster — events from other carriers don't accidentally
 *  link in. */
export function makeAdapterContext(
    carrierId: string,
    today: string = new Date().toISOString().slice(0, 10),
): AdapterContext {
    const drivers = CARRIER_DRIVERS[carrierId] ?? [];
    const assets = CARRIER_ASSETS[carrierId] ?? [];

    const driverById = new Map<string, string>();
    const driverByLicence = new Map<string, string>();
    const driverByName = new Map<string, string>();
    for (const d of drivers) {
        if (d.id) driverById.set(norm(d.id), d.id);
        if (d.licenseNumber) driverByLicence.set(norm(d.licenseNumber), d.id);
        const fullName = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim();
        if (fullName) driverByName.set(norm(fullName), d.id);
    }

    const assetById = new Map<string, string>();
    const assetByPlate = new Map<string, string>();
    const assetByUnit = new Map<string, string>();
    const assetByVin = new Map<string, string>();
    for (const a of assets) {
        if (a.id) assetById.set(norm(a.id), a.id);
        if (a.plateNumber) assetByPlate.set(norm(a.plateNumber), a.id);
        if (a.unitNumber) assetByUnit.set(norm(a.unitNumber), a.id);
        if (a.vin) assetByVin.set(norm(a.vin), a.id);
    }

    return {
        carrierId,
        today,
        resolveDriver(q: DriverQuery): string | undefined {
            return (q.id && driverById.get(norm(q.id)))
                || (q.licence && driverByLicence.get(norm(q.licence)))
                || (q.name && driverByName.get(norm(q.name)))
                || undefined;
        },
        resolveAsset(q: AssetQuery): string | undefined {
            return (q.id && assetById.get(norm(q.id)))
                || (q.plate && assetByPlate.get(norm(q.plate)))
                || (q.unit && assetByUnit.get(norm(q.unit)))
                || (q.vin && assetByVin.get(norm(q.vin)))
                || undefined;
        },
    };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Map a percentile (0..100, lower is safer in FMCSA SMS) to severity (0..10). */
function percentileToSeverity(p: number | undefined): number {
    if (p == null || Number.isNaN(p)) return 5;
    return clamp(p / 10, 0, 10);
}

/** Pull a YYYY-MM-DD slice from any input that smells like a date. */
function dateOnly(d: string | undefined, fallback: string): string {
    if (!d) return fallback;
    const m = /^\d{4}-\d{2}-\d{2}/.exec(d);
    if (m) return m[0];
    const parsed = new Date(d);
    return Number.isFinite(parsed.getTime())
        ? parsed.toISOString().slice(0, 10)
        : fallback;
}

// ── FMCSA: roadside inspection rows (`inspectionsData`) ──────────────────────

type FmcsaInspectionRow = (typeof inspectionsData)[number];

export const fmcsaInspectionAdapter: RiskAdapter<FmcsaInspectionRow[]> = {
    source: 'fmcsa',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        for (const r of rows) {
            const row = r as Record<string, unknown>;
            const driverId = ctx.resolveDriver({
                id: row.driverId as string | undefined,
                name: row.driver as string | undefined,
            });
            const assetId = ctx.resolveAsset({
                id: row.assetId as string | undefined,
                plate: row.vehiclePlate as string | undefined,
                vin: row.vin as string | undefined,
            });
            // Only keep rows that link to *this* carrier's roster.
            if (!driverId && !assetId) continue;

            const date = dateOnly(row.date as string | undefined, ctx.today);
            const violations = (row.violations as Array<Record<string, unknown>> | undefined) ?? [];

            if (violations.length === 0) {
                // Clean inspection — still register as a positive data point.
                out.push({
                    id: `fmcsa-insp:${row.id ?? `${date}:${driverId ?? assetId}`}`,
                    carrierId: ctx.carrierId,
                    source: 'fmcsa',
                    domain: 'inspection',
                    kind: 'inspection',
                    date,
                    driverId,
                    assetId,
                    severity: 0,
                    points: 0,
                    oos: false,
                    confidence: 'high',
                    raw: r,
                });
                continue;
            }

            for (const v of violations) {
                out.push({
                    id: `fmcsa-viol:${row.id ?? ''}:${(v.code as string) ?? out.length}`,
                    carrierId: ctx.carrierId,
                    source: 'fmcsa',
                    domain: mapBasicToDomain(v.basic as string | undefined),
                    kind: 'violation',
                    date,
                    driverId,
                    assetId,
                    severity: clamp(
                        ((v.severityWeight as number | undefined) ?? 5)
                        + ((v.oos as boolean) ? 4 : 0),
                        0, 10,
                    ),
                    points: (v.smsPoints as number | undefined) ?? 0,
                    oos: !!v.oos,
                    confidence: 'high',
                    raw: v,
                });
            }
        }
        return out;
    },
};

function mapBasicToDomain(basic: string | undefined): RiskDomain {
    switch ((basic ?? '').toLowerCase()) {
        case 'unsafe driving':         return 'unsafeDriving';
        case 'crash indicator':        return 'crash';
        case 'hours-of-service compliance':
        case 'hos compliance':         return 'hos';
        case 'vehicle maintenance':    return 'vehicleMaintenance';
        case 'controlled substances':  return 'controlledSubstance';
        case 'hazmat compliance':      return 'hazmat';
        case 'driver fitness':         return 'driverFitness';
        default:                       return 'inspection';
    }
}

// ── FMCSA carrier profile (BASIC percentiles) ────────────────────────────────

type FmcsaProfileLike = {
    basicStatus?: Array<{
        category: string;
        measure?: string;
        percentile?: string | number;
        alert?: boolean;
    }>;
};

export const fmcsaProfileAdapter: RiskAdapter<FmcsaProfileLike> = {
    source: 'fmcsa',
    toEvents(p, ctx) {
        const list = p?.basicStatus ?? [];
        return list
            .filter((b) => b.category && b.category !== 'Others')
            .map((b) => {
                const pStr = typeof b.percentile === 'string'
                    ? b.percentile.replace('%', '').trim()
                    : String(b.percentile ?? '');
                const pNum = pStr === '' ? undefined : Number(pStr);
                const severity = b.alert
                    ? Math.max(7, percentileToSeverity(pNum))
                    : percentileToSeverity(pNum);
                return {
                    id: `fmcsa-basic:${ctx.carrierId}:${b.category}`,
                    carrierId: ctx.carrierId,
                    source: 'fmcsa' as const,
                    domain: mapBasicToDomain(b.category),
                    kind: 'profile' as RiskKind,
                    date: ctx.today,
                    severity,
                    points: 0,
                    oos: false,
                    confidence: pNum == null ? 'low' : 'high',
                    raw: b,
                };
            });
    },
};

// ── CVOR profile + intervention events ───────────────────────────────────────

type CvorProfileLike = ReturnType<typeof getCarrierProfileFor>;

export const cvorProfileAdapter: RiskAdapter<CvorProfileLike> = {
    source: 'cvor',
    toEvents(p, ctx) {
        const a = p?.cvorAnalysis;
        if (!a) return [];
        const mk = (
            domain: RiskDomain,
            label: string,
            pct: number | undefined,
        ): RiskEvent => ({
            id: `cvor-profile:${ctx.carrierId}:${label}`,
            carrierId: ctx.carrierId,
            source: 'cvor',
            domain,
            kind: 'profile',
            date: ctx.today,
            severity: clamp((pct ?? 0) / 10, 0, 10),
            points: pct ?? 0,
            oos: false,
            confidence: pct == null ? 'low' : 'high',
            raw: { label, pct },
        });
        return [
            mk('collision',  'collisions',  a.collisions?.percentage),
            mk('conviction', 'convictions', a.convictions?.percentage),
            mk('inspection', 'inspections', a.inspections?.percentage),
        ];
    },
};

export const cvorInterventionAdapter: RiskAdapter<CvorInterventionEvent[]> = {
    source: 'cvor',
    toEvents(events, ctx) {
        if (!events?.length) return [];
        const out: RiskEvent[] = [];
        for (const e of events) {
            const driverId = ctx.resolveDriver({
                id: e.driverId,
                licence: e.driverLicence,
                name: e.driverName,
            });
            const assetId = ctx.resolveAsset({
                id: e.assetId,
                plate: e.vehicle1?.plate,
                unit: e.vehicle1?.unit,
            });
            // Carrier filter — events that don't link to this carrier are dropped.
            if (!driverId && !assetId) continue;

            const domain: RiskDomain = e.type === 'collision' ? 'collision'
                : e.type === 'conviction' ? 'conviction'
                : 'inspection';
            const oosCount = e.oosCount ?? 0;
            const points =
                e.pointsTotal
                ?? e.collision?.points
                ?? e.conviction?.points
                ?? e.vehiclePoints
                ?? 0;
            let severity = 0;
            if (e.type === 'collision') {
                severity = clamp(4 + (e.collision?.points ?? 0) * 0.5
                    + ((e.collision?.driverCharged === 'Y') ? 2 : 0), 0, 10);
            } else if (e.type === 'conviction') {
                severity = clamp(2 + (e.conviction?.points ?? 0), 0, 10);
            } else {
                severity = oosCount > 0 ? 10 : clamp((e.totalDefects ?? 0), 0, 6);
            }

            out.push({
                id: `cvor-evt:${e.id}`,
                carrierId: ctx.carrierId,
                source: 'cvor',
                domain,
                kind: e.type as RiskKind,
                date: dateOnly(e.date, ctx.today),
                driverId,
                assetId,
                severity,
                points,
                oos: oosCount > 0,
                confidence: 'high',
                raw: e,
            });
        }
        return out;
    },
};

// ── NSC profile adapters (AB / BC / PE / NS) ─────────────────────────────────

export const nscAbAdapter: RiskAdapter<ReturnType<typeof getNscAbProfileFor>> = {
    source: 'nsc:AB',
    toEvents(p, ctx) {
        if (!p) return [];
        // R-Factor surcharge: how far past stage threshold.
        const stage = p.monitoringStage ?? 'Not Monitored';
        const stageBase: Record<string, number> = {
            'Not Monitored': 1, 'Stage 1': 3, 'Stage 2': 5, 'Stage 3': 7, 'Stage 4': 9,
        };
        const severity = clamp(stageBase[stage] ?? 5, 0, 10);
        return [{
            id: `nsc-ab-profile:${ctx.carrierId}`,
            carrierId: ctx.carrierId,
            source: 'nsc:AB',
            domain: 'inspection',
            kind: 'profile',
            date: ctx.today,
            severity,
            points: p.rFactor ?? 0,
            oos: false,
            confidence: 'high',
            raw: p,
        }];
    },
};

export const nscBcAdapter: RiskAdapter<ReturnType<typeof getNscBcProfileFor>> = {
    source: 'nsc:BC',
    toEvents(p, ctx) {
        if (!p) return [];
        const status = p.certificate?.profileStatus ?? 'Unrated';
        const sev: Record<string, number> = {
            Satisfactory: 2, Conditional: 5, Unsatisfactory: 8, Unrated: 3,
        };
        return [{
            id: `nsc-bc-profile:${ctx.carrierId}`,
            carrierId: ctx.carrierId,
            source: 'nsc:BC',
            domain: 'inspection',
            kind: 'profile',
            date: ctx.today,
            severity: clamp(sev[status] ?? 5, 0, 10),
            points: p.complianceReview?.totalScore ?? 0,
            oos: false,
            confidence: 'high',
            raw: p,
        }];
    },
};

export const nscPeAdapter: RiskAdapter<ReturnType<typeof getNscPeProfileFor>> = {
    source: 'nsc:PE',
    toEvents(p, ctx) {
        if (!p) return [];
        const s = (p as { summary?: { collisionPoints: number; convictionPoints: number; inspectionPoints: number; currentActiveVehicles: number } }).summary;
        if (!s) return [];
        const total = s.collisionPoints + s.convictionPoints + s.inspectionPoints;
        const ppv = total / Math.max(1, s.currentActiveVehicles);
        return [{
            id: `nsc-pe-profile:${ctx.carrierId}`,
            carrierId: ctx.carrierId,
            source: 'nsc:PE',
            domain: 'inspection',
            kind: 'profile',
            date: ctx.today,
            severity: clamp(ppv, 0, 10),
            points: total,
            oos: false,
            confidence: 'high',
            raw: p,
        }];
    },
};

export const nscNsAdapter: RiskAdapter<ReturnType<typeof getNscNsProfileFor>> = {
    source: 'nsc:NS',
    toEvents(p, ctx) {
        if (!p) return [];
        const total = (p.convictionScore ?? 0) + (p.inspectionScore ?? 0) + (p.collisionScore ?? 0);
        const lvl1 = p.scoreLevel1 ?? 0;
        const lvl2 = p.scoreLevel2 ?? 0;
        const lvl3 = p.scoreLevel3 ?? 0;
        const severity = total <= lvl1 ? 1
            : total <= lvl2 ? 4
            : total <= lvl3 ? 7
            : 9;
        return [{
            id: `nsc-ns-profile:${ctx.carrierId}`,
            carrierId: ctx.carrierId,
            source: 'nsc:NS',
            domain: 'inspection',
            kind: 'profile',
            date: ctx.today,
            severity,
            points: total,
            oos: false,
            confidence: 'high',
            raw: p,
        }];
    },
};

// ── NSC inspections (multi-jurisdiction roadside rows) ───────────────────────

export const nscInspectionAdapter: RiskAdapter<NscInspectionRecord[]> = {
    source: 'nsc:AB', // overridden per-row below
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        for (const r of rows) {
            const jur = r.jur as 'AB' | 'BC' | 'PE' | 'NS' | undefined;
            if (!jur || !['AB', 'BC', 'PE', 'NS'].includes(jur)) continue;
            const driverId = ctx.resolveDriver({
                id: r.driverLink?.driverId,
                licence: r.driverLink?.rawLicence,
                name: r.driverLink?.driverName,
            });
            const assetId = ctx.resolveAsset({
                id: r.primaryVehicle?.assetId ?? undefined,
                plate: r.primaryVehicle?.plate,
                unit: r.primaryVehicle?.unitNumber,
                vin: r.primaryVehicle?.vin,
            });
            if (!driverId && !assetId) continue;

            const oosCount = r.details?.oosRows?.length ?? 0;
            const reqCount = r.details?.reqRows?.length ?? 0;
            const severity = oosCount > 0 ? clamp(7 + oosCount, 0, 10)
                : reqCount > 0 ? clamp(2 + reqCount, 0, 6)
                : 0;
            out.push({
                id: `nsc-${jur}-insp:${r.id}`,
                carrierId: ctx.carrierId,
                source: `nsc:${jur}` as RiskEvent['source'],
                domain: oosCount > 0 ? 'vehicleMaintenance' : 'inspection',
                kind: 'inspection',
                date: dateOnly(r.date, ctx.today),
                driverId,
                assetId,
                severity,
                points: oosCount * 10 + reqCount * 2,
                oos: oosCount > 0,
                confidence: 'high',
                raw: r,
            });
        }
        return out;
    },
};

// ── Internal: incidents ──────────────────────────────────────────────────────

type Incident = (typeof INCIDENTS)[number];

export const incidentAdapter: RiskAdapter<Incident[]> = {
    source: 'internal:incident',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        for (const i of rows) {
            const r = i as Record<string, unknown>;
            const driverId = ctx.resolveDriver({
                id: r.driverId as string | undefined,
                name: r.driverName as string | undefined,
            });
            const assetId = ctx.resolveAsset({
                id: r.assetId as string | undefined,
                plate: r.plateNumber as string | undefined,
                unit: r.unitNumber as string | undefined,
            });
            if (!driverId && !assetId) continue;

            const fatal = !!r.fatal;
            const injury = !!r.injury;
            const tow = !!r.towAway;
            const severity = fatal ? 10 : injury ? 8 : tow ? 5 : 3;

            out.push({
                id: `incident:${(r.id as string) ?? out.length}`,
                carrierId: ctx.carrierId,
                source: 'internal:incident',
                domain: 'crash',
                kind: 'crash',
                date: dateOnly(r.date as string | undefined, ctx.today),
                driverId,
                assetId,
                severity,
                points: (r.cost as number) ?? 0,
                oos: false,
                preventable: !!r.preventable,
                confidence: 'high',
                raw: i,
            });
        }
        return out;
    },
};

// ── Internal: HOS / VEDR / maintenance / training / documents ────────────────
//
// These adapters read whatever happens to be in the source file; if the
// source isn't populated yet for a given carrier, they emit no events. The
// engine handles "no events" naturally — confidence drops to low.

export const hosAdapter: RiskAdapter<Array<Record<string, unknown>>> = {
    source: 'internal:hos',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        for (const r of rows) {
            const driverId = ctx.resolveDriver({
                id: r.driverId as string | undefined,
                name: r.driver as string | undefined,
            });
            if (!driverId) continue;
            const t = String(r.violationType ?? r.type ?? '').toLowerCase();
            const severity = t.includes('falsif') ? 9
                : t.includes('drive') || t.includes('limit') ? 7
                : 2;
            out.push({
                id: `hos:${(r.id as string) ?? out.length}`,
                carrierId: ctx.carrierId,
                source: 'internal:hos',
                domain: 'hos',
                kind: 'violation',
                date: dateOnly(r.date as string | undefined, ctx.today),
                driverId,
                severity,
                points: 0,
                oos: !!r.oos,
                confidence: 'high',
                raw: r,
            });
        }
        return out;
    },
};

export const vedrAdapter: RiskAdapter<Array<Record<string, unknown>>> = {
    source: 'internal:vedr',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        for (const r of rows) {
            const driverId = ctx.resolveDriver({
                id: r.driverId as string | undefined,
                name: r.driver as string | undefined,
            });
            const assetId = ctx.resolveAsset({
                id: r.assetId as string | undefined,
                plate: r.plate as string | undefined,
                unit: r.unitNumber as string | undefined,
            });
            if (!driverId && !assetId) continue;
            const t = String(r.eventType ?? r.type ?? '').toLowerCase();
            const severity = t.includes('collision') ? 8
                : t.includes('harsh') || t.includes('brake') ? 5
                : t.includes('speed') ? 4
                : 3;
            out.push({
                id: `vedr:${(r.id as string) ?? out.length}`,
                carrierId: ctx.carrierId,
                source: 'internal:vedr',
                domain: 'unsafeDriving',
                kind: 'violation',
                date: dateOnly(r.date as string | undefined, ctx.today),
                driverId,
                assetId,
                severity,
                points: 0,
                oos: false,
                confidence: 'high',
                raw: r,
            });
        }
        return out;
    },
};

export const maintenanceAdapter: RiskAdapter<Array<Record<string, unknown>>> = {
    source: 'internal:maintenance',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        const todayMs = new Date(ctx.today).getTime();
        for (const r of rows) {
            const assetId = ctx.resolveAsset({
                id: r.assetId as string | undefined,
                plate: r.plate as string | undefined,
                unit: r.unitNumber as string | undefined,
            });
            if (!assetId) continue;
            const completed = r.completedDate as string | undefined;
            const due = r.dueDate as string | undefined;
            if (completed) continue; // closed work — no risk contribution
            const daysOverdue = due
                ? Math.floor((todayMs - new Date(due).getTime()) / 86_400_000)
                : 0;
            if (daysOverdue <= 0) continue;
            const type = String(r.type ?? '').toLowerCase();
            const severity = (type.includes('brake') || type.includes('tire')) ? 7
                : daysOverdue > 30 ? 5
                : 3;
            out.push({
                id: `maint:${(r.id as string) ?? out.length}`,
                carrierId: ctx.carrierId,
                source: 'internal:maintenance',
                domain: 'assetHealth',
                kind: 'maintenance',
                date: dateOnly(due, ctx.today),
                assetId,
                severity,
                points: daysOverdue,
                oos: false,
                confidence: 'high',
                raw: r,
            });
        }
        return out;
    },
};

export const trainingAdapter: RiskAdapter<Array<Record<string, unknown>>> = {
    source: 'internal:training',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        const todayMs = new Date(ctx.today).getTime();
        for (const r of rows) {
            const driverId = ctx.resolveDriver({
                id: r.driverId as string | undefined,
                name: r.driver as string | undefined,
            });
            if (!driverId) continue;
            const expiry = r.expiryDate as string | undefined;
            if (!expiry) continue;
            const expired = new Date(expiry).getTime() < todayMs;
            if (!expired) continue;
            const mandatory = !!r.mandatory;
            const severity = mandatory ? 6 : 3;
            out.push({
                id: `train:${(r.id as string) ?? out.length}`,
                carrierId: ctx.carrierId,
                source: 'internal:training',
                domain: 'training',
                kind: 'training',
                date: dateOnly(expiry, ctx.today),
                driverId,
                severity,
                points: 0,
                oos: false,
                confidence: 'high',
                raw: r,
            });
        }
        return out;
    },
};

export const documentAdapter: RiskAdapter<Array<Record<string, unknown>>> = {
    source: 'internal:document',
    toEvents(rows, ctx) {
        if (!rows?.length) return [];
        const out: RiskEvent[] = [];
        const todayMs = new Date(ctx.today).getTime();
        for (const r of rows) {
            const driverId = ctx.resolveDriver({ id: r.driverId as string | undefined });
            const assetId = ctx.resolveAsset({ id: r.assetId as string | undefined });
            if (!driverId && !assetId) continue;
            const expiry = r.expiryDate as string | undefined;
            if (!expiry) continue;
            const expired = new Date(expiry).getTime() < todayMs;
            if (!expired) continue;
            const type = String(r.type ?? '').toLowerCase();
            const severity = type.includes('registration') ? 8
                : type.includes('dot') ? 6
                : 4;
            out.push({
                id: `doc:${(r.id as string) ?? out.length}`,
                carrierId: ctx.carrierId,
                source: 'internal:document',
                domain: 'documentCompliance',
                kind: 'document',
                date: dateOnly(expiry, ctx.today),
                driverId,
                assetId,
                severity,
                points: 0,
                oos: false,
                confidence: 'high',
                raw: r,
            });
        }
        return out;
    },
};

// ── Source bundle for the loader ─────────────────────────────────────────────

export const ALL_INSPECTIONS_DATA = inspectionsData;
export const ALL_CVOR_INTERVENTION_EVENTS = cvorInterventionEvents;
export const ALL_NSC_INSPECTIONS = NSC_INSPECTIONS;
export const ALL_INCIDENTS = INCIDENTS as unknown as Array<Record<string, unknown>>;
