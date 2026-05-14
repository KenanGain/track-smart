/**
 * Per-carrier Fuel records (deterministic mock data).
 *
 * For every carrier in `ACCOUNTS_DB` we synthesise:
 *   • Driver↔asset assignments (each driver paired with one primary truck)
 *   • Trip records — IFTA-style daily mileage rows
 *   • Fuel purchases — card-paid pump events with gallons / cost
 *   • Idling events — minutes idling + estimated fuel wasted
 *   • Driver fuel summaries — rolled-up totals per driver
 *
 * Everything keys off CARRIER_DRIVERS + CARRIER_ASSETS so the FuelPage will
 * automatically rescope when the navbar carrier dropdown changes — same
 * pattern carrier-tickets / carrier-accidents / carrier-violations use.
 */

import { ACCOUNTS_DB, type AccountRecord } from '@/pages/accounts/accounts.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { hash, mulberry32, pick } from '@/pages/accounts/carrier-fleet-shared.data';
import type {
    DriverVehicleAssignment,
    TripRecord,
    FuelPurchase,
    IdlingEvent,
    DriverFuelSummary,
} from './fuel.data';

// ── Per-jurisdiction location pools ────────────────────────────────────────
// US carriers see US fuel stops + states; Canadian carriers see Canadian
// stops + provinces. Keeps the page on-brand for either side of the border.

const US_FUEL_LOCATIONS: Array<{ loc: string; jur: string }> = [
    { loc: 'Pilot Travel Center, Dallas TX',  jur: 'Texas' },
    { loc: "Love's Travel Stop, Houston TX",  jur: 'Texas' },
    { loc: 'TA Travel Center, Atlanta GA',    jur: 'Georgia' },
    { loc: 'Flying J, Phoenix AZ',            jur: 'Arizona' },
    { loc: 'Pilot Travel Center, Chicago IL', jur: 'Illinois' },
    { loc: 'Shell, Indianapolis IN',          jur: 'Indiana' },
    { loc: "Love's Travel Stop, Memphis TN",  jur: 'Tennessee' },
    { loc: 'TA Travel Center, Charlotte NC',  jur: 'North Carolina' },
    { loc: 'Pilot Travel Center, Denver CO',  jur: 'Colorado' },
    { loc: 'Flying J, Salt Lake City UT',     jur: 'Utah' },
];

const CA_FUEL_LOCATIONS: Array<{ loc: string; jur: string }> = [
    { loc: 'Husky, Mississauga ON',     jur: 'Ontario' },
    { loc: "Petro-Canada, Toronto ON",  jur: 'Ontario' },
    { loc: 'Esso, Calgary AB',          jur: 'Alberta' },
    { loc: 'Husky, Edmonton AB',        jur: 'Alberta' },
    { loc: 'Petro-Canada, Vancouver BC',jur: 'British Columbia' },
    { loc: 'Esso, Winnipeg MB',         jur: 'Manitoba' },
    { loc: 'Irving Oil, Halifax NS',    jur: 'Nova Scotia' },
    { loc: 'Esso, Montreal QC',         jur: 'Quebec' },
    { loc: 'Husky, Saskatoon SK',       jur: 'Saskatchewan' },
];

const FUEL_TYPES = ['Diesel', 'Diesel', 'Diesel', 'DEF', 'Gasoline'];
const PAYMENT_METHODS = ['WEX Fleet Card', 'Comdata', 'EFS', 'Voyager', 'Company Visa'];
const IDLING_REASONS = ['Loading dock', 'Driver break', 'Climate control', 'Customer wait', 'Sleeper berth', 'Roadside inspection'];

// ── Builder ────────────────────────────────────────────────────────────────

interface CarrierFuelOutput {
    assignments: DriverVehicleAssignment[];
    trips: TripRecord[];
    purchases: FuelPurchase[];
    idlingEvents: IdlingEvent[];
    summaries: DriverFuelSummary[];
}

function dateOffset(daysAgo: number): string {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
}

function fullName(d: any): string {
    return `${d.firstName ?? ''} ${d.lastName ?? d.name ?? ''}`.trim() || (d.name ?? 'Driver');
}

function buildForCarrier(account: AccountRecord): CarrierFuelOutput {
    const r = mulberry32(hash(`fuel:${account.id}`));
    const drivers = CARRIER_DRIVERS[account.id] ?? [];
    const assets  = CARRIER_ASSETS[account.id] ?? [];
    if (drivers.length === 0 || assets.length === 0) {
        return { assignments: [], trips: [], purchases: [], idlingEvents: [], summaries: [] };
    }

    const isCanada = account.country === 'CA';
    const locations = isCanada ? CA_FUEL_LOCATIONS : US_FUEL_LOCATIONS;
    const currency: 'USD' | 'CAD' = isCanada ? 'CAD' : 'USD';

    // ── 1) Driver ↔ vehicle assignments. Each driver gets one primary truck;
    //    ~30% of drivers also get a secondary (relief) assignment.
    const assignments: DriverVehicleAssignment[] = [];
    const trucks = assets.filter(a => a.assetType !== 'Trailer');
    const trucksAvailable = trucks.length > 0 ? trucks : assets;
    drivers.forEach((d, i) => {
        const t = trucksAvailable[i % trucksAvailable.length];
        assignments.push({
            driverId: d.id,
            driverName: fullName(d),
            vehicleId: t.id,
            unitNumber: t.unitNumber,
            primary: true,
        });
        if (r() < 0.3) {
            const tAlt = trucksAvailable[(i + 1) % trucksAvailable.length];
            if (tAlt.id !== t.id) {
                assignments.push({
                    driverId: d.id,
                    driverName: fullName(d),
                    vehicleId: tAlt.id,
                    unitNumber: tAlt.unitNumber,
                    primary: false,
                });
            }
        }
    });

    // ── 2) Trip records — ~6 per primary driver over the last 30 days.
    const trips: TripRecord[] = [];
    const primary = assignments.filter(a => a.primary);
    let tripSeq = 0;
    for (const a of primary) {
        for (let n = 0; n < 6; n++) {
            const daysAgo = Math.floor(r() * 30);
            const dist = Math.round(150 + r() * 700);
            const odoStart = 50000 + Math.floor(r() * 200000);
            trips.push({
                id: `${account.id}-trip-${++tripSeq}`,
                date: dateOffset(daysAgo),
                jurisdiction: pick(r, locations).jur,
                vehicleId: a.vehicleId,
                unitNumber: a.unitNumber,
                driverId: a.driverId,
                driverName: a.driverName,
                totalDistance: dist,
                odoStart,
                odoEnd: odoStart + dist,
                fuelType: 'Diesel',
            });
        }
    }

    // ── 3) Fuel purchases — ~5 pump events per primary driver. Diesel fills
    //    are the majority; a few smaller DEF / gasoline buys mix in.
    const purchases: FuelPurchase[] = [];
    let purchaseSeq = 0;
    for (const a of primary) {
        for (let n = 0; n < 5; n++) {
            const daysAgo = Math.floor(r() * 30);
            const fuelType = pick(r, FUEL_TYPES);
            const isDiesel = fuelType === 'Diesel';
            const gallons = isDiesel ? +(60 + r() * 90).toFixed(2) : +(5 + r() * 25).toFixed(2);
            const ppg = isDiesel ? +(3.65 + r() * 0.85).toFixed(3) : +(3.20 + r() * 0.60).toFixed(3);
            const totalCost = +(gallons * ppg).toFixed(2);
            const loc = pick(r, locations);
            purchases.push({
                id: `${account.id}-fuel-${++purchaseSeq}`,
                date: dateOffset(daysAgo),
                location: loc.loc,
                jurisdiction: loc.jur,
                vehicleId: a.vehicleId,
                unitNumber: a.unitNumber,
                driverId: a.driverId,
                driverName: a.driverName,
                gallons,
                pricePerGallon: ppg,
                totalCost,
                fuelType,
                paymentMethod: pick(r, PAYMENT_METHODS),
                fuelCard: r() < 0.7 ? `${pick(r, PAYMENT_METHODS).split(' ')[0]} ****${1000 + Math.floor(r() * 9000)}` : undefined,
            });
        }
    }

    // ── 4) Idling events — ~4 per primary driver.
    const idlingEvents: IdlingEvent[] = [];
    let idleSeq = 0;
    for (const a of primary) {
        for (let n = 0; n < 4; n++) {
            const daysAgo = Math.floor(r() * 30);
            const durationMinutes = Math.round(15 + r() * 90);
            const fuelWastedGal = +(durationMinutes * 0.85 / 60).toFixed(2);
            const loc = pick(r, locations);
            idlingEvents.push({
                id: `${account.id}-idle-${++idleSeq}`,
                date: dateOffset(daysAgo),
                vehicleId: a.vehicleId,
                unitNumber: a.unitNumber,
                driverId: a.driverId,
                driverName: a.driverName,
                durationMinutes,
                fuelWastedGal,
                location: loc.loc,
                reason: pick(r, IDLING_REASONS),
            });
        }
    }

    // ── 5) Driver summaries — roll-up of the rows above.
    const summaries: DriverFuelSummary[] = drivers.map(d => {
        const myTrips = trips.filter(t => t.driverId === d.id);
        const myPurchases = purchases.filter(p => p.driverId === d.id);
        const myIdle = idlingEvents.filter(e => e.driverId === d.id);
        const primaryAssn = assignments.find(a => a.driverId === d.id && a.primary);
        const totalDistance = myTrips.reduce((s, t) => s + t.totalDistance, 0);
        const totalFuelGal = myPurchases.reduce((s, p) => s + p.gallons, 0);
        const totalCost = myPurchases.reduce((s, p) => s + p.totalCost, 0);
        const idlingMinutes = myIdle.reduce((s, e) => s + e.durationMinutes, 0);
        const idlingFuelGal = myIdle.reduce((s, e) => s + e.fuelWastedGal, 0);
        const drivableFuel = Math.max(0, totalFuelGal - idlingFuelGal);
        const avgMpg = drivableFuel > 0 ? +(totalDistance / drivableFuel).toFixed(2) : 0;
        return {
            driverId: d.id,
            driverName: fullName(d),
            status: (d as any).status ?? 'Active',
            assignedVehicle: primaryAssn?.unitNumber ?? '—',
            assignedUnit: primaryAssn?.unitNumber ?? '—',
            totalTrips: myTrips.length,
            totalDistance,
            avgMpg,
            totalFuelGal: +totalFuelGal.toFixed(2),
            totalCost: +totalCost.toFixed(2),
            idlingMinutes,
            idlingFuelGal: +idlingFuelGal.toFixed(2),
        };
    });

    // Silence unused-currency warnings — currency lives on the carrier
    // profile and is what FuelPage uses when rendering totals.
    void currency;

    return { assignments, trips, purchases, idlingEvents, summaries };
}

// ── Public surface ─────────────────────────────────────────────────────────

const built = (() => {
    const byCarrier: Record<string, CarrierFuelOutput> = {};
    for (const account of ACCOUNTS_DB) {
        byCarrier[account.id] = buildForCarrier(account);
    }
    return byCarrier;
})();

export const CARRIER_FUEL_BY_ID: Record<string, CarrierFuelOutput> = built;

/** Fuel records scoped to one carrier. Empty when no drivers / assets. */
export function getFuelForCarrier(accountId: string): CarrierFuelOutput {
    return built[accountId] ?? { assignments: [], trips: [], purchases: [], idlingEvents: [], summaries: [] };
}
