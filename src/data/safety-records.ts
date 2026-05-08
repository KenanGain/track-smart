// Unified safety-record resolver.
//
// Driver and Asset detail pages need to surface inspection / collision /
// conviction events from three carrier-profile sources — CVOR, NSC, FMCSA —
// and let the user toggle between them with sub-panels.
//
// Each source uses its own ID scheme. This module:
//   1. Imports the raw events from each source.
//   2. Resolves the source-specific driver / vehicle identifiers (licence
//      number, plate, unit) into the carrier's internal driverId / assetId.
//   3. Exposes per-driver and per-asset getters scoped to a chosen source
//      (or all sources at once).
//
// Tabs render directly off the `raw` payload so each source's column shape
// stays intact — this layer only handles linkage, not display.

import { cvorInterventionEvents, type CvorInterventionEvent } from '@/pages/inspections/cvorInterventionEvents.data';
import { NSC_INSPECTIONS, type NscInspectionRecord } from '@/pages/inspections/nscInspectionsData';
import { inspectionsData } from '@/pages/inspections/inspectionsData';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';

// ── Public types ──────────────────────────────────────────────────────────

export type SafetyEventSource = 'cvor' | 'nsc' | 'fmcsa';
export type SafetyEventKind = 'inspection' | 'violation' | 'collision' | 'conviction' | 'accident';

/** Composite source identifier used by the sub-tab switcher. CVOR and FMCSA
 *  are single-jurisdiction regimes (always 'cvor' / 'fmcsa'). NSC events
 *  fan out per province → 'nsc:BC', 'nsc:AB', 'nsc:ON', etc. */
export type SafetySourceKey = string;

/** A normalized event linkable to a driver and / or asset. The original
 *  record is preserved on `raw` so source-specific UIs can read whatever
 *  fields they need (CVOR defects, NSC level, FMCSA SMS points, etc.). */
export type SafetyEventBase = {
    /** Stable id, prefixed by source so collisions across sources are impossible. */
    id: string;
    source: SafetyEventSource;
    /** Province / state code. CVOR is always 'ON', FMCSA is the US state code,
     *  NSC carries the jurisdiction the inspection happened in (BC/AB/ON/…). */
    jurisdiction?: string;
    /** Composite key for the sub-tab switcher (cvor | nsc:BC | fmcsa | …). */
    sourceKey: SafetySourceKey;
    kind: SafetyEventKind;
    /** ISO date — every source carries at least YYYY-MM-DD. */
    date: string;

    // Resolved internal IDs after the lookup pass below. May be undefined
    // when the source row didn't link to any of the carrier's drivers / assets.
    driverId?: string;
    assetId?: string;

    // Display fallbacks pulled from the source — useful when no internal ID match.
    driverName?: string;
    licenseNumber?: string;
    licenseJurisdiction?: string;
    plateNumber?: string;
    unitNumber?: string;
    vin?: string;
    location?: string;
};

export type SafetyEvent = SafetyEventBase & {
    raw: unknown;
};

/** Build a sourceKey from a source + optional jurisdiction. */
export function makeSourceKey(source: SafetyEventSource, jurisdiction?: string): SafetySourceKey {
    return source === 'nsc' && jurisdiction ? `nsc:${jurisdiction}` : source;
}

// ── ID resolution ─────────────────────────────────────────────────────────
//
// Pure dynamic match: an event from CVOR / NSC / FMCSA only links to a
// driver / asset when the identifiers actually align — license number,
// plate, VIN, or unit number. No round-robin distribution, no synthetic
// bridges. If the source data doesn't carry an identifier matching the
// carrier's seed records, the event simply isn't attached to a specific
// asset / driver.

type DriverIndex = Map<string, { driverId: string; name: string }>;
type AssetIndex = Map<string, { assetId: string; unitNumber: string; vin?: string }>;

const driverIndex: DriverIndex = new Map();
const assetIndex: AssetIndex = new Map();

const norm = (s?: string): string => (s ?? '').trim().toLowerCase();

for (const drivers of Object.values(CARRIER_DRIVERS)) {
    for (const d of drivers) {
        const fullName = `${d.firstName ?? ''} ${d.lastName ?? ''}`.trim();
        const entry = { driverId: d.id, name: fullName };
        if (d.licenseNumber) driverIndex.set(`lic:${norm(d.licenseNumber)}`, entry);
        if (fullName) driverIndex.set(`name:${norm(fullName)}`, entry);
        // Direct match by internal driver id (used by FMCSA + NSC).
        if (d.id) driverIndex.set(`id:${norm(d.id)}`, entry);
    }
}

for (const assets of Object.values(CARRIER_ASSETS)) {
    for (const a of assets) {
        const entry = { assetId: a.id, unitNumber: a.unitNumber, vin: a.vin };
        if (a.plateNumber) assetIndex.set(`plate:${norm(a.plateNumber)}`, entry);
        if (a.unitNumber) assetIndex.set(`unit:${norm(a.unitNumber)}`, entry);
        if (a.vin) assetIndex.set(`vin:${norm(a.vin)}`, entry);
        if (a.id) assetIndex.set(`id:${norm(a.id)}`, entry);
    }
}

const resolveDriverByLicence = (licence?: string) =>
    (licence && driverIndex.get(`lic:${norm(licence)}`)) || undefined;

const resolveDriverByName = (name?: string) =>
    (name && driverIndex.get(`name:${norm(name)}`)) || undefined;

const resolveDriverById = (id?: string) =>
    (id && driverIndex.get(`id:${norm(id)}`)) || undefined;

const resolveAssetByPlate = (plate?: string) =>
    (plate && assetIndex.get(`plate:${norm(plate)}`)) || undefined;

const resolveAssetByUnit = (unit?: string) =>
    (unit && assetIndex.get(`unit:${norm(unit)}`)) || undefined;

const resolveAssetByVin = (vin?: string) =>
    (vin && assetIndex.get(`vin:${norm(vin)}`)) || undefined;

const resolveAssetById = (id?: string) =>
    (id && assetIndex.get(`id:${norm(id)}`)) || undefined;

// ── Source normalizers ────────────────────────────────────────────────────

function fromCvor(e: CvorInterventionEvent): SafetyEvent {
    // Prefer embedded internal ids (set by the carrier-extension generator
    // when the event was built from a real seed asset/driver). Fall back
    // to licence / plate / unit lookup only when the row predates the id
    // embedding (the static seed list at the top of cvorInterventionEvents).
    const driver = resolveDriverById(e.driverId)
        ?? resolveDriverByLicence(e.driverLicence)
        ?? resolveDriverByName(e.driverName);
    const asset = resolveAssetById(e.assetId)
        ?? resolveAssetByPlate(e.vehicle1?.plate)
        ?? resolveAssetByUnit(e.vehicle1?.unit);
    const kind: SafetyEventKind =
        e.type === 'inspection' ? 'inspection' :
        e.type === 'collision' ? 'collision' : 'conviction';
    return {
        id: `cvor:${e.id}`,
        source: 'cvor',
        sourceKey: 'cvor',
        jurisdiction: 'ON',
        kind,
        date: e.date,
        driverId: driver?.driverId,
        assetId: asset?.assetId,
        driverName: e.driverName,
        licenseNumber: e.driverLicence,
        licenseJurisdiction: e.driverLicenceJurisdiction,
        plateNumber: e.vehicle1?.plate,
        unitNumber: e.vehicle1?.unit ?? asset?.unitNumber,
        location: e.location,
        raw: e,
    };
}

function fromNsc(e: NscInspectionRecord): SafetyEvent {
    const jurisdiction = (e as { jur?: string }).jur ?? 'BC';
    const rawDriverId = e.driverLink?.driverId ?? undefined;
    const rawAssetId = e.primaryVehicle?.assetId ?? undefined;
    // Try internal id first, then plate / VIN / license. No bridging.
    const driver = resolveDriverById(rawDriverId)
        ?? resolveDriverByLicence(e.driverLink?.rawLicence)
        ?? resolveDriverByName(e.driverLink?.driverName);
    const asset = resolveAssetById(rawAssetId)
        ?? resolveAssetByPlate(e.primaryVehicle?.plate)
        ?? resolveAssetByVin(e.primaryVehicle?.vin)
        ?? resolveAssetByUnit(e.primaryVehicle?.unitNumber);
    return {
        id: `nsc:${rawDriverId ?? ''}:${rawAssetId ?? ''}:${(e as { date?: string }).date ?? ''}`,
        source: 'nsc',
        sourceKey: makeSourceKey('nsc', jurisdiction),
        jurisdiction,
        kind: 'inspection',
        date: (e as { date?: string }).date ?? '',
        driverId: driver?.driverId ?? rawDriverId,
        assetId: asset?.assetId ?? rawAssetId,
        driverName: e.driverLink?.driverName,
        licenseNumber: e.driverLink?.rawLicence,
        plateNumber: e.primaryVehicle?.plate,
        unitNumber: e.primaryVehicle?.unitNumber ?? asset?.unitNumber,
        vin: e.primaryVehicle?.vin ?? asset?.vin,
        location: (e as { location?: string }).location,
        raw: e,
    };
}

function fromFmcsa(e: typeof inspectionsData[number]): SafetyEvent {
    const r = e as Record<string, unknown>;
    const rawAssetId = r.assetId as string | undefined;
    const rawDriverId = r.driverId as string | undefined;
    const driver = resolveDriverById(rawDriverId)
        ?? resolveDriverByName(r.driver as string | undefined);
    const asset = resolveAssetById(rawAssetId)
        ?? resolveAssetByPlate(r.vehiclePlate as string | undefined)
        ?? resolveAssetByVin(r.vin as string | undefined);
    return {
        id: `fmcsa:${(r.id as string) ?? ''}`,
        source: 'fmcsa',
        sourceKey: 'fmcsa',
        jurisdiction: r.state as string | undefined,
        kind: 'inspection',
        date: (r.date as string) ?? '',
        driverId: driver?.driverId ?? rawDriverId,
        assetId: asset?.assetId ?? rawAssetId,
        driverName: (r.driver as string | undefined),
        plateNumber: (r.vehiclePlate as string | undefined) ?? asset?.unitNumber,
        unitNumber: (r.unitNumber as string | undefined) ?? asset?.unitNumber,
        vin: (r.vin as string | undefined) ?? asset?.vin,
        location: r.state as string | undefined,
        raw: e,
    };
}

// ── Master event list — sourced exclusively from the Safety & Compliance
// data files. NSC is restricted to the four Canadian NSC jurisdictions
// the carrier-safety-data layer actually provides profile bundles for:
// Alberta, British Columbia, Prince Edward Island, Nova Scotia. Other
// jurisdiction codes that show up on raw CVSA rows (US states, NB, ON…)
// are dropped from the NSC stream. ─────────────────────────────────────

export const SUPPORTED_NSC_JURISDICTIONS = ['AB', 'BC', 'PE', 'NS'] as const;
type SupportedNscJurisdiction = typeof SUPPORTED_NSC_JURISDICTIONS[number];

const isSupportedNsc = (jur: string | undefined): jur is SupportedNscJurisdiction =>
    !!jur && (SUPPORTED_NSC_JURISDICTIONS as readonly string[]).includes(jur);

export const ALL_SAFETY_EVENTS: SafetyEvent[] = [
    ...cvorInterventionEvents.map(fromCvor),
    ...NSC_INSPECTIONS
        .filter((e) => isSupportedNsc((e as { jur?: string }).jur))
        .map(fromNsc),
    ...inspectionsData.map(fromFmcsa),
];

// ── Per-driver / per-asset getters ────────────────────────────────────────

export function getSafetyEventsForDriver(
    driverId: string,
    options?: { source?: SafetyEventSource; kinds?: SafetyEventKind[] }
): SafetyEvent[] {
    return ALL_SAFETY_EVENTS.filter((e) => {
        if (e.driverId !== driverId) return false;
        if (options?.source && e.source !== options.source) return false;
        if (options?.kinds && !options.kinds.includes(e.kind)) return false;
        return true;
    });
}

export function getSafetyEventsForAsset(
    assetId: string,
    options?: { source?: SafetyEventSource; kinds?: SafetyEventKind[]; plateNumber?: string; vin?: string; unitNumber?: string }
): SafetyEvent[] {
    return ALL_SAFETY_EVENTS.filter((e) => {
        // Strict identity match: only show events whose resolved assetId
        // matches *this* asset. Plate / unit / VIN can collide across the
        // fleet, so we don't fall back on them — the generators embed the
        // real internal id, so a missing id means the event genuinely
        // doesn't belong to any specific asset.
        if (e.assetId !== assetId) return false;
        if (options?.source && e.source !== options.source) return false;
        if (options?.kinds && !options.kinds.includes(e.kind)) return false;
        return true;
    });
}

export function countSafetyEventsForDriver(driverId: string, source: SafetyEventSource): number {
    return getSafetyEventsForDriver(driverId, { source }).length;
}

export function countSafetyEventsForAsset(assetId: string, source: SafetyEventSource): number {
    return getSafetyEventsForAsset(assetId, { source }).length;
}

// ── Source palette + label helpers (used by the sub-tab switcher) ─────────

export const SOURCE_LABELS: Record<SafetyEventSource, string> = {
    cvor: 'CVOR',
    nsc: 'NSC',
    fmcsa: 'FMCSA',
};

/** Tailwind classes for the source pill / chip — keep static so Tailwind's
 *  scanner picks them up at build time. */
export const SOURCE_TONE: Record<SafetyEventSource, { active: string; idle: string; pill: string }> = {
    cvor: {
        active: 'bg-rose-600 text-white border-rose-600',
        idle: 'border-slate-200 text-slate-600 hover:bg-slate-50',
        pill: 'bg-rose-50 text-rose-700 border-rose-200',
    },
    nsc: {
        active: 'bg-blue-600 text-white border-blue-600',
        idle: 'border-slate-200 text-slate-600 hover:bg-slate-50',
        pill: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    fmcsa: {
        active: 'bg-amber-600 text-white border-amber-600',
        idle: 'border-slate-200 text-slate-600 hover:bg-slate-50',
        pill: 'bg-amber-50 text-amber-700 border-amber-200',
    },
};

/** Parse a sourceKey back into (source, jurisdiction). */
export function parseSourceKey(key: SafetySourceKey): { source: SafetyEventSource; jurisdiction?: string } {
    if (key.startsWith('nsc:')) return { source: 'nsc', jurisdiction: key.slice(4) };
    if (key === 'cvor' || key === 'fmcsa' || key === 'nsc') return { source: key };
    return { source: 'cvor' }; // defensive fallback
}

/** Display label for a source key — "CVOR · ON", "NSC · BC", "FMCSA". */
export function getSourceLabel(key: SafetySourceKey): string {
    const { source, jurisdiction } = parseSourceKey(key);
    const base = SOURCE_LABELS[source];
    return jurisdiction ? `${base} · ${jurisdiction}` : base;
}

/** Tone classes for a source key — defers to base-source tone. */
export function getSourceTone(key: SafetySourceKey) {
    const { source } = parseSourceKey(key);
    return SOURCE_TONE[source];
}

/** Enumerate every distinct sourceKey present in the given event list, in a
 *  stable order: CVOR first, then NSC jurisdictions alphabetically, then
 *  FMCSA. Used by the sub-tab switcher to know which chips to render. */
export function distinctSourceKeys(events: SafetyEvent[]): SafetySourceKey[] {
    const set = new Set<SafetySourceKey>();
    for (const e of events) set.add(e.sourceKey);
    const arr = Array.from(set);
    const orderRank = (k: SafetySourceKey): number => {
        if (k === 'cvor') return 0;
        if (k.startsWith('nsc:')) return 1;
        if (k === 'fmcsa') return 2;
        return 3;
    };
    arr.sort((a, b) => {
        const ra = orderRank(a);
        const rb = orderRank(b);
        return ra !== rb ? ra - rb : a.localeCompare(b);
    });
    return arr;
}
