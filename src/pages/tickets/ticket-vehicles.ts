import { INITIAL_ASSETS, type Asset } from '@/pages/assets/assets.data';
import { getAssetsForAccount } from '@/pages/accounts/carrier-assets.data';
import type { TicketRecord, TicketVehicle } from './tickets.data';

// ─────────────────────────────────────────────────────────────────────────────
// The vehicle on a ticket — which unit, which plate, which VIN.
//
// A ticket names a plate and a VIN; the fleet record is where they live. Picking a unit on
// the form copies them onto the ticket (`vehicleFromAsset`), and a ticket that only ever
// held an asset id — the seed, the violation hand-off — is read back against the fleet so
// the list and the page show the plate and jurisdiction rather than "—".
// ─────────────────────────────────────────────────────────────────────────────

/** The ticket's copy of an asset: unit, plate, jurisdiction, VIN, and what it is. */
export function vehicleFromAsset(a: Asset): TicketVehicle {
    return {
        assetId: a.id,
        unitNumber: a.unitNumber,
        plateNumber: a.plateNumber || undefined,
        plateJurisdiction: a.plateJurisdiction || undefined,
        vin: a.vin || undefined,
        label: [a.make, a.model, a.year ? String(a.year) : ''].filter(Boolean).join(' ') || undefined,
        kind: [a.assetType, a.vehicleType].filter(Boolean).join(' · ') || undefined,
    };
}

/** The assets a ticket can name — the carrier's fleet, or the demo fleet when there is none. */
export function assetsForTicket(accountId?: string): Asset[] {
    const fleet = accountId ? getAssetsForAccount(accountId) : [];
    return fleet.length ? fleet : INITIAL_ASSETS;
}

/** An asset by its id, or by the unit number older tickets stored in `assetId`. */
export function findTicketAsset(ref: string | undefined, accountId?: string): Asset | undefined {
    if (!ref) return undefined;
    const all = assetsForTicket(accountId);
    return all.find(a => a.id === ref) ?? all.find(a => a.unitNumber === ref);
}

/**
 * Vehicle 1 or 2 of a ticket, filled in: the ticket's own copy when it has one, else the
 * fleet record its `assetId` points at, else just the reference it stored.
 */
export function resolveTicketVehicle(t: TicketRecord, accountId?: string, slot: 1 | 2 = 1): TicketVehicle | undefined {
    const own = slot === 1 ? t.vehicle : t.vehicle2;
    if (own && (own.plateNumber || own.vin || own.unitNumber)) return own;
    if (slot === 2) return own;
    const a = findTicketAsset(t.vehicle?.assetId ?? t.assetId, accountId);
    if (a) return vehicleFromAsset(a);
    // No fleet record — the plate and VIN the citation itself printed are still the vehicle's.
    const ids = t.identifiers ?? {};
    if (!t.assetId && !ids.plateNumber && !ids.vinNumber) return undefined;
    return { assetId: t.assetId || undefined, unitNumber: t.assetId || undefined, plateNumber: ids.plateNumber || undefined, vin: ids.vinNumber || undefined };
}

/** "ACM-T0100 · ABC 1234 (DE)" — the vehicle on one line. */
export function vehicleLine(v?: TicketVehicle): string {
    if (!v) return '';
    const plate = v.plateNumber ? `${v.plateNumber}${v.plateJurisdiction ? ` (${v.plateJurisdiction})` : ''}` : '';
    return [v.unitNumber, plate].filter(Boolean).join(' · ');
}
