/**
 * Per-carrier Hours-of-Service records (deterministic mock data).
 *
 * For every carrier in `ACCOUNTS_DB` we synthesise:
 *   • HosDailyLog rows — 14 days × every primary driver
 *   • HosLog rows      — 3–6 status entries / driver / day
 *   • HosTrip rows     — 1–2 dispatched trips / driver / day
 *
 * Each record references a real driver from CARRIER_DRIVERS and a real
 * truck from CARRIER_ASSETS, so the HoursOfServicePage rescopes
 * automatically when the navbar carrier dropdown changes.
 */

import { ACCOUNTS_DB, type AccountRecord } from '@/pages/accounts/accounts.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { hash, mulberry32, pick } from '@/pages/accounts/carrier-fleet-shared.data';
import type {
    HosDriver, HosVehicle, HosStatus, HosDailyLog, HosLog, HosTrip, HosRemark,
} from './hos.data';

// ── Reference pools ────────────────────────────────────────────────────────

const PROVIDERS = ['geotab', 'samsara', 'verizon-reveal', 'omnitracs', 'motive'];
const STATUSES: HosStatus[] = ['off_duty', 'driving', 'on_duty', 'sleeper_berth'];
const REMARK_NOTES = [
    'End of shift', 'Fuel stop', 'Rest break', 'Weather delay', 'Loading at dock',
    'Customer delivery', 'Inspection checkpoint', 'Lunch break', 'Scale check', 'Extended rest',
];

interface RoutePoint { lat: number; lng: number; name: string; state: string; country: 'USA' | 'Canada' }
const US_POINTS: RoutePoint[] = [
    { lat: 32.7767, lng: -96.7970, name: 'Dallas',       state: 'TX', country: 'USA' },
    { lat: 29.7604, lng: -95.3698, name: 'Houston',      state: 'TX', country: 'USA' },
    { lat: 33.7490, lng: -84.3880, name: 'Atlanta',      state: 'GA', country: 'USA' },
    { lat: 33.4484, lng: -112.0740,name: 'Phoenix',      state: 'AZ', country: 'USA' },
    { lat: 41.8781, lng: -87.6298, name: 'Chicago',      state: 'IL', country: 'USA' },
    { lat: 39.7684, lng: -86.1581, name: 'Indianapolis', state: 'IN', country: 'USA' },
    { lat: 35.1495, lng: -90.0490, name: 'Memphis',      state: 'TN', country: 'USA' },
    { lat: 35.2271, lng: -80.8431, name: 'Charlotte',    state: 'NC', country: 'USA' },
    { lat: 39.7392, lng: -104.9903,name: 'Denver',       state: 'CO', country: 'USA' },
];
const CA_POINTS: RoutePoint[] = [
    { lat: 43.5890, lng: -79.6441, name: 'Mississauga',  state: 'ON', country: 'Canada' },
    { lat: 43.6532, lng: -79.3832, name: 'Toronto',      state: 'ON', country: 'Canada' },
    { lat: 51.0447, lng: -114.0719,name: 'Calgary',      state: 'AB', country: 'Canada' },
    { lat: 53.5461, lng: -113.4938,name: 'Edmonton',     state: 'AB', country: 'Canada' },
    { lat: 49.2827, lng: -123.1207,name: 'Vancouver',    state: 'BC', country: 'Canada' },
    { lat: 49.8951, lng: -97.1384, name: 'Winnipeg',     state: 'MB', country: 'Canada' },
    { lat: 44.6488, lng: -63.5752, name: 'Halifax',      state: 'NS', country: 'Canada' },
    { lat: 45.5017, lng: -73.5673, name: 'Montreal',     state: 'QC', country: 'Canada' },
];

// ── Builder ────────────────────────────────────────────────────────────────

interface CarrierHosOutput {
    dailyLogs: HosDailyLog[];
    statusLogs: HosLog[];
    trips: HosTrip[];
}

function fullName(d: any): { first: string; last: string } {
    const first = d.firstName ?? (d.name ?? 'Driver').split(' ')[0];
    const last  = d.lastName  ?? (d.name ?? 'One').split(' ').slice(1).join(' ');
    return { first, last };
}

function toDriver(d: any): HosDriver {
    const { first, last } = fullName(d);
    return {
        id: d.id,
        firstName: first,
        lastName: last,
        email: d.email ?? `${first.toLowerCase()}.${last.toLowerCase()}@fleet.com`,
        status: (d.status ?? '').toLowerCase() === 'terminated' ? 'inactive' : 'active',
    };
}
function toVehicle(a: any): HosVehicle {
    return { id: a.id, name: a.unitNumber, make: a.make, model: a.model, year: a.year };
}

function buildForCarrier(account: AccountRecord): CarrierHosOutput {
    const r = mulberry32(hash(`hos:${account.id}`));
    const drivers = CARRIER_DRIVERS[account.id] ?? [];
    const assets  = CARRIER_ASSETS[account.id] ?? [];
    if (drivers.length === 0 || assets.length === 0) return { dailyLogs: [], statusLogs: [], trips: [] };

    const trucks = assets.filter(a => a.assetType !== 'Trailer');
    const trucksAvailable = trucks.length > 0 ? trucks : assets;
    const isCanada = account.country === 'CA';
    const points = isCanada ? CA_POINTS : US_POINTS;

    const dailyLogs: HosDailyLog[] = [];
    const statusLogs: HosLog[] = [];
    const trips: HosTrip[] = [];

    let seq = 0;
    drivers.forEach((d, dIdx) => {
        const truck = trucksAvailable[dIdx % trucksAvailable.length];
        const hosDriver = toDriver(d);
        const hosVehicle = toVehicle(truck);

        for (let day = 0; day < 14; day++) {
            const date = new Date();
            date.setDate(date.getDate() - day);
            const dateStr = date.toISOString().slice(0, 10);

            // ── Daily log — duration in ms, distances in miles.
            const driving = Math.round(10_000_000 + r() * 22_400_000);   // 2.7–9h
            const onDuty  = Math.round(3_600_000 + r() * 10_800_000);    // 1–4h
            const sleeperBed = Math.round(r() * 7_200_000);
            const personalConveyance = Math.round(r() * 1_800_000);
            const yardMove = Math.round(r() * 600_000);
            const waiting = Math.round(r() * 900_000);
            const offDuty = Math.max(0, 86_400_000 - driving - onDuty - sleeperBed - personalConveyance - yardMove - waiting);
            const drivingDist = Math.round(150 + r() * 450);
            const pcDist = Math.round(r() * 40);
            const ymDist = Math.round(r() * 15);

            dailyLogs.push({
                id: `${account.id}-hos-day-${++seq}`,
                sourceId: String(100_000_000 + Math.floor(r() * 899_999_999)),
                provider: pick(r, PROVIDERS),
                driver: hosDriver,
                date: dateStr,
                statusDurations: { onDuty, offDuty, driving, waiting, sleeperBed, personalConveyance, yardMove },
                distances: { total: drivingDist + pcDist + ymDist, driving: drivingDist, personalConveyance: pcDist, yardMove: ymDist },
                metadata: { addedAt: new Date(date.getTime() + 86_400_000).toISOString() },
            });

            // ── 3–5 status entries that day.
            const entries = 3 + Math.floor(r() * 3);
            for (let e = 0; e < entries; e++) {
                const hourStart = Math.floor(r() * 22);
                const durHours = 1 + r() * 4;
                const startedAt = new Date(date.getTime() + hourStart * 3_600_000);
                const endedAt = new Date(startedAt.getTime() + durHours * 3_600_000);
                const p = pick(r, points);

                const remarkCount = Math.floor(r() * 3);
                const remarks: HosRemark[] = [];
                for (let i = 0; i < remarkCount; i++) {
                    remarks.push({
                        notes: pick(r, REMARK_NOTES),
                        sourceId: `rem_${++seq}`,
                        submittedAt: new Date(startedAt.getTime() + r() * 1_800_000).toISOString(),
                    });
                }

                statusLogs.push({
                    id: `${account.id}-hos-log-${++seq}`,
                    sourceId: String(100_000_000 + Math.floor(r() * 899_999_999)),
                    provider: pick(r, PROVIDERS),
                    status: pick(r, STATUSES),
                    driver: hosDriver,
                    vehicle: hosVehicle,
                    startedAt: startedAt.toISOString(),
                    endedAt: endedAt.toISOString(),
                    location: {
                        latitude: p.lat + (r() - 0.5),
                        longitude: p.lng + (r() - 0.5),
                        name: p.name,
                        state: p.state,
                        country: p.country,
                    },
                    remarks,
                    codrivers: [],
                    metadata: { addedAt: endedAt.toISOString() },
                });
            }

            // ── 1–2 dispatched trips that day.
            const tripCount = 1 + Math.floor(r() * 2);
            for (let t = 0; t < tripCount; t++) {
                const hourStart = 4 + Math.floor(r() * 6);
                const durationMs = Math.round(14_400_000 + r() * 28_800_000); // 4–12h
                const startedAt = new Date(date.getTime() + hourStart * 3_600_000);
                const endedAt = new Date(startedAt.getTime() + durationMs);
                const from = pick(r, points);
                const to = pick(r, points.filter(p => p.name !== from.name)) ?? from;
                const distance = +(180 + r() * 670).toFixed(1);
                const fuelConsumed = +(distance / (4 + r() * 3)).toFixed(1);
                const avgSpeed = Math.round(45 + r() * 23);
                trips.push({
                    id: `${account.id}-hos-trip-${++seq}`,
                    sourceId: `T-${100_200 + seq}`,
                    provider: pick(r, PROVIDERS),
                    driver: hosDriver,
                    vehicle: hosVehicle,
                    startedAt: startedAt.toISOString(),
                    endedAt: endedAt.toISOString(),
                    distance,
                    duration: durationMs,
                    startLocation: { latitude: from.lat, longitude: from.lng, name: `${from.name}, ${from.state}` },
                    endLocation:   { latitude: to.lat,   longitude: to.lng,   name: `${to.name}, ${to.state}` },
                    fuelConsumed,
                    averageSpeed: avgSpeed,
                    maxSpeed: Math.round(avgSpeed + 5 + r() * 15),
                    idleDuration: Math.round(300_000 + r() * 5_100_000),
                    metadata: { addedAt: endedAt.toISOString() },
                });
            }
        }
    });

    // Newest first across the board.
    dailyLogs.sort((a, b) => b.date.localeCompare(a.date));
    statusLogs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    trips.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return { dailyLogs, statusLogs, trips };
}

// ── Public surface ─────────────────────────────────────────────────────────

const built = (() => {
    const byCarrier: Record<string, CarrierHosOutput> = {};
    for (const account of ACCOUNTS_DB) {
        byCarrier[account.id] = buildForCarrier(account);
    }
    return byCarrier;
})();

export const CARRIER_HOS_BY_ID: Record<string, CarrierHosOutput> = built;

/** HOS records scoped to one carrier. Empty when no drivers/assets. */
export function getHosForCarrier(accountId: string): CarrierHosOutput {
    return built[accountId] ?? { dailyLogs: [], statusLogs: [], trips: [] };
}
