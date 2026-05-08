/**
 * Master loader — runs every adapter and merges results into a single ledger.
 *
 * Spec: docs/SAFETY.md §3.8.
 *
 * Pure: same inputs → same output. The result is memoized per-carrier inside
 * `risk-store.ts` so UI can call `useRiskScore(scope)` cheaply.
 */

import type { RiskEvent } from './risk-engine.types';
import {
    makeAdapterContext,
    fmcsaInspectionAdapter,
    fmcsaProfileAdapter,
    cvorProfileAdapter,
    cvorInterventionAdapter,
    nscAbAdapter,
    nscBcAdapter,
    nscPeAdapter,
    nscNsAdapter,
    nscInspectionAdapter,
    incidentAdapter,
    ALL_INSPECTIONS_DATA,
    ALL_CVOR_INTERVENTION_EVENTS,
    ALL_NSC_INSPECTIONS,
    ALL_INCIDENTS,
} from './risk-adapters';
import {
    getCarrierProfileFor,
    getNscAbProfileFor,
    getNscBcProfileFor,
    getNscPeProfileFor,
    getNscNsProfileFor,
} from '@/data/carrier-safety-data';
import { getCarrierCompliance } from '@/data/useCarrierCompliance';

/**
 * Merge every available source into one canonical RiskEvent ledger for a
 * single carrier. Empty sources contribute 0 events.
 *
 * Compliance enrollment is honored: if a regime is `enabled: false` we don't
 * emit profile-style events for it (per `available-only` policy in §8.2).
 * Roadside / intervention rows stay regardless — they are objective facts
 * even when a regime toggle is off.
 */
export function loadRiskEventsForCarrier(carrierId: string): RiskEvent[] {
    const ctx = makeAdapterContext(carrierId);
    const compliance = getCarrierCompliance(carrierId);

    const fmcsaEnrolled = compliance.fmcsa.enabled && compliance.fmcsa.hasData;
    const cvorEnrolled = compliance.cvor.enabled && compliance.cvor.hasData;
    const nscJurs = new Set(
        compliance.nsc
            .filter((n) => n.enabled && n.hasData)
            .map((n) => n.jurisdiction),
    );

    const events: RiskEvent[] = [];

    // FMCSA — roadside rows are kept whether or not the toggle is on (they
    // come through inspection events). Profile signals only contribute when
    // the carrier is enrolled.
    events.push(...fmcsaInspectionAdapter.toEvents(ALL_INSPECTIONS_DATA, ctx));
    if (fmcsaEnrolled) {
        const profile = getCarrierProfileFor(carrierId);
        events.push(...fmcsaProfileAdapter.toEvents(profile, ctx));
    }

    // CVOR — same pattern.
    events.push(...cvorInterventionAdapter.toEvents(ALL_CVOR_INTERVENTION_EVENTS, ctx));
    if (cvorEnrolled) {
        const profile = getCarrierProfileFor(carrierId);
        events.push(...cvorProfileAdapter.toEvents(profile, ctx));
    }

    // NSC — roadside inspections fan out per jurisdiction; profile signals
    // contribute only when the carrier is enrolled in that province.
    events.push(...nscInspectionAdapter.toEvents(ALL_NSC_INSPECTIONS, ctx));
    if (nscJurs.has('AB')) events.push(...nscAbAdapter.toEvents(getNscAbProfileFor(carrierId), ctx));
    if (nscJurs.has('BC')) events.push(...nscBcAdapter.toEvents(getNscBcProfileFor(carrierId), ctx));
    if (nscJurs.has('PE')) events.push(...nscPeAdapter.toEvents(getNscPeProfileFor(carrierId), ctx));
    if (nscJurs.has('NS')) events.push(...nscNsAdapter.toEvents(getNscNsProfileFor(carrierId), ctx));

    // Internal — always loaded; adapter filters by carrier roster.
    // The static incidents array has a heterogeneous union of shapes, while
    // the adapter is typed against a canonical Incident — the adapter
    // itself reads fields defensively via Record<string, unknown>, so the
    // double-cast is safe.
    events.push(...incidentAdapter.toEvents(ALL_INCIDENTS as unknown as Parameters<typeof incidentAdapter.toEvents>[0], ctx));

    // (HOS / VEDR / maintenance / training / documents wire in later phases —
    //  current data files don't yet expose a carrier-keyed array. Their
    //  adapters exist and accept whatever shape arrives.)

    return events;
}

/** Return the events scoped to a specific driver inside a carrier. */
export function eventsForDriver(events: RiskEvent[], driverId: string): RiskEvent[] {
    return events.filter((e) => e.driverId === driverId);
}

/** Return the events scoped to a specific asset inside a carrier. */
export function eventsForAsset(events: RiskEvent[], assetId: string): RiskEvent[] {
    return events.filter((e) => e.assetId === assetId);
}

/** Return the events that linked to *both* a driver and an asset. */
export function eventsForDriverAsset(
    events: RiskEvent[], driverId: string, assetId: string,
): RiskEvent[] {
    return events.filter((e) => e.driverId === driverId && e.assetId === assetId);
}
