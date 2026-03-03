// Hours of Service – mock data linked to existing drivers & assets
import { INITIAL_ASSETS } from '@/pages/assets/assets.data';
import { DRIVER_VEHICLE_ASSIGNMENTS } from '@/pages/fuel/fuel.data';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HosDriver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: 'active' | 'inactive';
}

export interface HosVehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
}

export interface StatusDurations {
  onDuty: number;
  offDuty: number;
  driving: number;
  waiting: number;
  sleeperBed: number;
  personalConveyance: number;
  yardMove: number;
}

export interface HosDailyLog {
  id: string;
  sourceId: string;
  provider: string;
  driver: HosDriver;
  date: string;
  statusDurations: StatusDurations;
  distances: { total: number; driving: number; personalConveyance: number; yardMove: number };
  metadata: { addedAt: string };
}

export type HosStatus = 'off_duty' | 'driving' | 'on_duty' | 'sleeper_berth';

export interface HosRemark {
  notes: string;
  sourceId: string;
  submittedAt: string;
}

export interface HosLog {
  id: string;
  sourceId: string;
  provider: string;
  status: HosStatus;
  driver: HosDriver;
  vehicle: HosVehicle;
  startedAt: string;
  endedAt: string;
  location: { latitude: number; longitude: number; name: string; state: string; country: string };
  remarks: HosRemark[];
  codrivers: string[];
  metadata: { addedAt: string };
}

export interface HosTrip {
  id: string;
  sourceId: string;
  provider: string;
  driver: HosDriver;
  vehicle: HosVehicle;
  startedAt: string;
  endedAt: string;
  distance: number;
  duration: number;
  startLocation: { latitude: number; longitude: number; name: string };
  endLocation: { latitude: number; longitude: number; name: string };
  fuelConsumed: number;
  averageSpeed: number;
  maxSpeed: number;
  idleDuration: number;
  metadata: { addedAt: string };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function seeded(seed: number): number {
  const s = Math.sin(seed) * 10000;
  return s - Math.floor(s);
}
function rng(min: number, max: number, seed: number): number {
  return min + seeded(seed) * (max - min);
}
function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seeded(seed) * arr.length)];
}

// ── Build driver / vehicle maps ────────────────────────────────────────────────

const PROVIDERS = ['geotab', 'samsara', 'verizon-reveal'];

const assetMap = new Map(INITIAL_ASSETS.map(a => [a.id, a]));

/** Build HosDriver from assignment */
function toDriver(a: typeof DRIVER_VEHICLE_ASSIGNMENTS[number], seed: number): HosDriver {
  const parts = a.driverName.split(' ');
  return {
    id: a.driverId,
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    email: `${parts[0].toLowerCase()}@fleet.com`,
    status: seeded(seed) > 0.15 ? 'active' : 'inactive',
  };
}

/** Build HosVehicle from Asset */
function toVehicle(a: typeof INITIAL_ASSETS[number]): HosVehicle {
  return { id: a.id, name: a.unitNumber, make: a.make, model: a.model, year: a.year };
}

// Get primary assignments only (unique drivers)
const primaryAssignments = DRIVER_VEHICLE_ASSIGNMENTS.filter(a => a.primary);

const STATUSES: HosStatus[] = ['off_duty', 'driving', 'on_duty', 'sleeper_berth'];

const ROUTE_PAIRS: { from: { lat: number; lng: number; name: string }; to: { lat: number; lng: number; name: string } }[] = [
  { from: { lat: 37.7749, lng: -122.4194, name: 'San Francisco, CA' }, to: { lat: 36.7783, lng: -119.4179, name: 'Fresno, CA' } },
  { from: { lat: 41.8781, lng: -87.6298, name: 'Chicago, IL' }, to: { lat: 39.7684, lng: -86.1581, name: 'Indianapolis, IN' } },
  { from: { lat: 32.7767, lng: -96.7970, name: 'Dallas, TX' }, to: { lat: 29.7604, lng: -95.3698, name: 'Houston, TX' } },
  { from: { lat: 34.0522, lng: -118.2437, name: 'Los Angeles, CA' }, to: { lat: 36.1699, lng: -115.1398, name: 'Las Vegas, NV' } },
  { from: { lat: 39.7392, lng: -104.9903, name: 'Denver, CO' }, to: { lat: 38.8339, lng: -104.8214, name: 'Colorado Springs, CO' } },
  { from: { lat: 43.6532, lng: -79.3832, name: 'Toronto, ON' }, to: { lat: 45.5017, lng: -73.5673, name: 'Montreal, QC' } },
  { from: { lat: 42.3314, lng: -83.0458, name: 'Detroit, MI' }, to: { lat: 39.9612, lng: -82.9988, name: 'Columbus, OH' } },
  { from: { lat: 40.4406, lng: -79.9959, name: 'Pittsburgh, PA' }, to: { lat: 40.7128, lng: -74.0060, name: 'New York, NY' } },
];

const REMARK_NOTES = [
  'End of shift', 'Fuel stop', 'Rest break', 'Weather delay', 'Loading at dock',
  'Customer delivery', 'Inspection checkpoint', 'Lunch break', 'Scale check', 'Extended rest',
];

// ── Generate Daily Logs ────────────────────────────────────────────────────────

function generateDailyLogs(): HosDailyLog[] {
  const logs: HosDailyLog[] = [];
  let sc = 100;

  // Generate 2 weeks of daily logs for each primary driver
  for (const assignment of primaryAssignments) {
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const date = new Date(2026, 1, 1 + dayOffset); // Feb 2026
      const dateStr = date.toISOString().split('T')[0];
      const driver = toDriver(assignment, sc++);

      const driving = Math.round(rng(10000000, 32400000, sc++)); // 2.7h-9h
      const onDuty = Math.round(rng(3600000, 14400000, sc++));   // 1h-4h
      const sleeperBed = Math.round(rng(0, 7200000, sc++));
      const personalConveyance = Math.round(rng(0, 1800000, sc++));
      const yardMove = Math.round(rng(0, 600000, sc++));
      const waiting = Math.round(rng(0, 900000, sc++));
      const offDuty = 86400000 - driving - onDuty - sleeperBed - personalConveyance - yardMove - waiting;

      const drivingDist = Math.round(rng(150, 600, sc++));
      const pcDist = Math.round(rng(0, 40, sc++));
      const ymDist = Math.round(rng(0, 15, sc++));

      logs.push({
        id: `hos_day_${sc}`,
        sourceId: String(Math.round(rng(100000000, 999999999, sc++))),
        provider: pick(PROVIDERS, sc++),
        driver,
        date: dateStr,
        statusDurations: { onDuty, offDuty: Math.max(0, offDuty), driving, waiting, sleeperBed, personalConveyance, yardMove },
        distances: { total: drivingDist + pcDist + ymDist, driving: drivingDist, personalConveyance: pcDist, yardMove: ymDist },
        metadata: { addedAt: new Date(date.getTime() + 86400000).toISOString() },
      });
    }
  }

  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Generate HOS Status Logs ───────────────────────────────────────────────────

function generateHosLogs(): HosLog[] {
  const logs: HosLog[] = [];
  let sc = 500;

  for (const assignment of primaryAssignments) {
    const asset = assetMap.get(assignment.vehicleId);
    if (!asset) continue;

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const baseDate = new Date(2026, 1, 1 + dayOffset);
      // 3-6 log entries per day
      const entryCount = Math.floor(rng(3, 6.9, sc++));

      for (let e = 0; e < entryCount; e++) {
        const hourStart = Math.floor(rng(0, 20, sc++));
        const durationH = rng(1, 4, sc++);
        const startedAt = new Date(baseDate.getTime() + hourStart * 3600000);
        const endedAt = new Date(startedAt.getTime() + durationH * 3600000);

        const route = pick(ROUTE_PAIRS, sc++);
        const remarkCount = Math.floor(rng(0, 2.9, sc++));
        const remarks: HosRemark[] = [];
        for (let r = 0; r < remarkCount; r++) {
          remarks.push({
            notes: pick(REMARK_NOTES, sc++),
            sourceId: `rem_${sc}`,
            submittedAt: new Date(startedAt.getTime() + rng(0, 1800000, sc++)).toISOString(),
          });
        }

        logs.push({
          id: `hos_log_${sc++}`,
          sourceId: String(Math.round(rng(100000000, 999999999, sc++))),
          provider: pick(PROVIDERS, sc++),
          status: pick(STATUSES, sc++),
          driver: toDriver(assignment, sc++),
          vehicle: toVehicle(asset),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          location: {
            latitude: route.from.lat + rng(-0.5, 0.5, sc++),
            longitude: route.from.lng + rng(-0.5, 0.5, sc++),
            name: route.from.name.split(',')[0].trim(),
            state: route.from.name.split(',')[1]?.trim() || '',
            country: route.from.name.includes('ON') || route.from.name.includes('QC') ? 'Canada' : 'USA',
          },
          remarks,
          codrivers: [],
          metadata: { addedAt: endedAt.toISOString() },
        });
      }
    }
  }

  return logs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ── Generate Trips ─────────────────────────────────────────────────────────────

function generateTrips(): HosTrip[] {
  const trips: HosTrip[] = [];
  let sc = 900;

  for (const assignment of primaryAssignments) {
    const asset = assetMap.get(assignment.vehicleId);
    if (!asset) continue;

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      // 1-2 trips per day per driver
      const tripCount = Math.floor(rng(1, 2.8, sc++));

      for (let t = 0; t < tripCount; t++) {
        const baseDate = new Date(2026, 1, 1 + dayOffset);
        const hourStart = Math.floor(rng(4, 10, sc++));
        const durationMs = Math.round(rng(14400000, 43200000, sc++)); // 4h-12h
        const startedAt = new Date(baseDate.getTime() + hourStart * 3600000);
        const endedAt = new Date(startedAt.getTime() + durationMs);

        const route = pick(ROUTE_PAIRS, sc++);
        const distance = +(rng(180, 850, sc++)).toFixed(1);
        const fuelConsumed = +(distance / rng(4, 7, sc++)).toFixed(1);
        const avgSpeed = Math.round(rng(45, 68, sc++));
        const maxSpeed = Math.round(avgSpeed + rng(5, 20, sc++));
        const idleDuration = Math.round(rng(300000, 5400000, sc++));

        trips.push({
          id: `trip_${sc++}`,
          sourceId: `T-${100200 + sc}`,
          provider: pick(PROVIDERS, sc++),
          driver: toDriver(assignment, sc++),
          vehicle: toVehicle(asset),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          distance,
          duration: durationMs,
          startLocation: { latitude: route.from.lat, longitude: route.from.lng, name: route.from.name },
          endLocation: { latitude: route.to.lat, longitude: route.to.lng, name: route.to.name },
          fuelConsumed,
          averageSpeed: avgSpeed,
          maxSpeed,
          idleDuration,
          metadata: { addedAt: endedAt.toISOString() },
        });
      }
    }
  }

  return trips.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// ── Exports ────────────────────────────────────────────────────────────────────

export const HOS_DAILY_LOGS = generateDailyLogs();
export const HOS_LOGS = generateHosLogs();
export const HOS_TRIPS = generateTrips();
