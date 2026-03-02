// Fuel Management Data
// Links drivers ↔ vehicles (assets) with trip, purchase, and idling records

import { INITIAL_ASSETS } from '@/pages/assets/assets.data';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface DriverVehicleAssignment {
  driverId: string;
  driverName: string;
  vehicleId: string;       // asset id
  unitNumber: string;
  primary: boolean;         // primary assignment
}

export interface TripRecord {
  id: string;
  date: string;             // YYYY-MM-DD
  jurisdiction: string;
  vehicleId: string;
  unitNumber: string;
  driverId: string;
  driverName: string;
  totalDistance: number;     // miles
  odoStart: number;
  odoEnd: number;
  fuelType: string;
}

export interface FuelPurchase {
  id: string;
  date: string;
  location: string;
  jurisdiction: string;
  vehicleId: string;
  unitNumber: string;
  driverId: string;
  driverName: string;
  gallons: number;
  pricePerGallon: number;
  totalCost: number;
  fuelType: string;
  paymentMethod: string;
}

export interface IdlingEvent {
  id: string;
  date: string;
  vehicleId: string;
  unitNumber: string;
  driverId: string;
  driverName: string;
  durationMinutes: number;
  fuelWastedGal: number;
  location: string;
  reason: string;
}

export interface DriverFuelSummary {
  driverId: string;
  driverName: string;
  status: string;
  assignedVehicle: string;
  assignedUnit: string;
  totalTrips: number;
  totalDistance: number;
  avgMpg: number;
  totalFuelGal: number;
  totalCost: number;
  idlingMinutes: number;
  idlingFuelGal: number;
}

// ── Driver ↔ Vehicle Assignments ───────────────────────────────────────────────

export const DRIVER_VEHICLE_ASSIGNMENTS: DriverVehicleAssignment[] = [
  { driverId: 'DRV-2001', driverName: 'John Smith',       vehicleId: 'a1', unitNumber: 'TR-1049', primary: true },
  { driverId: 'DRV-2002', driverName: 'Sarah Miller',     vehicleId: 'a2', unitNumber: 'TR-2088', primary: true },
  { driverId: 'DRV-1001', driverName: 'James Sullivan',   vehicleId: 'a3', unitNumber: 'TR-3055', primary: true },
  { driverId: 'DRV-2004', driverName: 'Elena Rodriguez',  vehicleId: 'a5', unitNumber: 'TR-5200', primary: true },
  { driverId: 'DRV-1002', driverName: 'Maria Rodriguez',  vehicleId: 'a1', unitNumber: 'TR-1049', primary: false },
  { driverId: 'DRV-1004', driverName: 'Sarah Johnson',    vehicleId: 'a6', unitNumber: 'TR-6001', primary: true },
];

// ── Jurisdictions ──────────────────────────────────────────────────────────────

const JURISDICTIONS = [
  'Ontario', 'Texas', 'Michigan', 'California', 'New York',
  'Ohio', 'Pennsylvania', 'Illinois', 'Florida', 'Indiana',
];

const FUEL_LOCATIONS = [
  'Pilot Travel Center, Dallas TX',
  'Love\'s Travel Stop, Houston TX',
  'Flying J, San Antonio TX',
  'TA Petro, Columbus OH',
  'Sheetz, Pittsburgh PA',
  'Circle K, Orlando FL',
  'Shell Station, Toronto ON',
  'Petro-Canada, London ON',
  'Husky, Hamilton ON',
  'Esso, Mississauga ON',
  'Pilot Travel Center, Chicago IL',
  'Love\'s Travel Stop, Indianapolis IN',
];

const IDLING_REASONS = [
  'Loading/Unloading',
  'Traffic Congestion',
  'Rest Stop - Engine On',
  'Warm-Up Period',
  'Waiting at Customer',
  'Fueling Queue',
  'Inspection Checkpoint',
  'Weather Delay',
];

// ── Helper: Deterministic Pseudo-Random ────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function rng(min: number, max: number, seed: number): number {
  return min + seededRandom(seed) * (max - min);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

// ── Generate Trip Records ──────────────────────────────────────────────────────

function generateTrips(): TripRecord[] {
  const trips: TripRecord[] = [];
  const assignments = DRIVER_VEHICLE_ASSIGNMENTS;
  const cmvAssets = INITIAL_ASSETS.filter(a => a.assetCategory === 'CMV' && a.operationalStatus !== 'Drafted');

  let id = 1;
  // Generate trips for last 60 days
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const date = new Date(2025, 1, 21); // Feb 21 2025 as reference
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    // Each active driver makes 0-2 trips per day
    for (const assignment of assignments) {
      const asset = cmvAssets.find(a => a.id === assignment.vehicleId);
      if (!asset || asset.operationalStatus === 'OutOfService') continue;
      if (asset.operationalStatus === 'Maintenance' && dayOffset < 14) continue; // recently in maintenance

      const seed = id * 31 + dayOffset * 7;
      const tripCount = Math.floor(rng(0, 2.5, seed));

      for (let t = 0; t < tripCount; t++) {
        const tripSeed = seed + t * 13;
        const dist = Math.round(rng(15, 280, tripSeed));
        const baseOdo = (asset.odometer ?? 200000) - dayOffset * 180 + t * dist;
        const jurisdiction = pick(JURISDICTIONS, tripSeed + 3);

        trips.push({
          id: `trip-${String(id).padStart(4, '0')}`,
          date: dateStr,
          jurisdiction,
          vehicleId: assignment.vehicleId,
          unitNumber: assignment.unitNumber,
          driverId: assignment.driverId,
          driverName: assignment.driverName,
          totalDistance: dist,
          odoStart: baseOdo,
          odoEnd: baseOdo + dist,
          fuelType: asset.vehicleType === 'Reefer' ? 'Diesel/Electric' : 'Diesel',
        });
        id++;
      }
    }
  }

  return trips.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Generate Fuel Purchases ────────────────────────────────────────────────────

function generatePurchases(): FuelPurchase[] {
  const purchases: FuelPurchase[] = [];
  const assignments = DRIVER_VEHICLE_ASSIGNMENTS;
  let id = 1;

  for (let dayOffset = 0; dayOffset < 60; dayOffset += 1) {
    const date = new Date(2025, 1, 21);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    for (const assignment of assignments) {
      const asset = INITIAL_ASSETS.find(a => a.id === assignment.vehicleId);
      if (!asset || asset.operationalStatus === 'OutOfService') continue;

      const seed = id * 47 + dayOffset * 11;
      // Drivers fuel every 2-4 days
      if (seededRandom(seed) > 0.35) continue;

      const gallons = +rng(30, 150, seed + 1).toFixed(1);
      const ppg = +rng(3.29, 4.89, seed + 2).toFixed(2);
      const location = pick(FUEL_LOCATIONS, seed + 3);
      const jur = location.includes('ON') ? 'Ontario' : location.split(', ')[1]?.split(' ')[0] || 'Texas';

      purchases.push({
        id: `fp-${String(id).padStart(4, '0')}`,
        date: dateStr,
        location,
        jurisdiction: jur,
        vehicleId: assignment.vehicleId,
        unitNumber: assignment.unitNumber,
        driverId: assignment.driverId,
        driverName: assignment.driverName,
        gallons,
        pricePerGallon: ppg,
        totalCost: +(gallons * ppg).toFixed(2),
        fuelType: asset?.vehicleType === 'Reefer' ? 'Diesel/Electric' : 'Diesel',
        paymentMethod: seededRandom(seed + 5) > 0.3 ? 'Fuel Card' : 'Company Card',
      });
      id++;
    }
  }

  return purchases.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Generate Idling Events ─────────────────────────────────────────────────────

function generateIdlingEvents(): IdlingEvent[] {
  const events: IdlingEvent[] = [];
  const assignments = DRIVER_VEHICLE_ASSIGNMENTS;
  let id = 1;

  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const date = new Date(2025, 1, 21);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    for (const assignment of assignments) {
      const asset = INITIAL_ASSETS.find(a => a.id === assignment.vehicleId);
      if (!asset || asset.operationalStatus === 'OutOfService') continue;

      const seed = id * 53 + dayOffset * 19;
      // 0-3 idling events per driver per day
      const eventCount = Math.floor(rng(0, 3.2, seed));

      for (let e = 0; e < eventCount; e++) {
        const eSeed = seed + e * 17;
        const duration = Math.round(rng(5, 90, eSeed));
        const fuelWasted = +(duration * rng(0.3, 0.8, eSeed + 1) / 60).toFixed(2);
        const reason = pick(IDLING_REASONS, eSeed + 2);
        const loc = pick(FUEL_LOCATIONS, eSeed + 3).split(',')[0];

        events.push({
          id: `idle-${String(id).padStart(4, '0')}`,
          date: dateStr,
          vehicleId: assignment.vehicleId,
          unitNumber: assignment.unitNumber,
          driverId: assignment.driverId,
          driverName: assignment.driverName,
          durationMinutes: duration,
          fuelWastedGal: fuelWasted,
          location: loc,
          reason,
        });
        id++;
      }
    }
  }

  return events.sort((a, b) => b.date.localeCompare(a.date));
}

// ── Build Driver Fuel Summaries ────────────────────────────────────────────────

function buildDriverSummaries(
  trips: TripRecord[],
  purchases: FuelPurchase[],
  idling: IdlingEvent[]
): DriverFuelSummary[] {
  return DRIVER_VEHICLE_ASSIGNMENTS.filter(a => a.primary).map(a => {
    const dTrips = trips.filter(t => t.driverId === a.driverId);
    const dPurchases = purchases.filter(p => p.driverId === a.driverId);
    const dIdling = idling.filter(i => i.driverId === a.driverId);
    const totalDist = dTrips.reduce((sum, t) => sum + t.totalDistance, 0);
    const totalFuel = dPurchases.reduce((sum, p) => sum + p.gallons, 0);
    const totalCost = dPurchases.reduce((sum, p) => sum + p.totalCost, 0);
    const idleMin = dIdling.reduce((sum, i) => sum + i.durationMinutes, 0);
    const idleFuel = dIdling.reduce((sum, i) => sum + i.fuelWastedGal, 0);
    const asset = INITIAL_ASSETS.find(v => v.id === a.vehicleId);

    return {
      driverId: a.driverId,
      driverName: a.driverName,
      status: asset?.operationalStatus === 'OutOfService' ? 'Inactive' : 'Active',
      assignedVehicle: asset ? `${asset.make} ${asset.model}` : '—',
      assignedUnit: a.unitNumber,
      totalTrips: dTrips.length,
      totalDistance: totalDist,
      avgMpg: totalFuel > 0 ? +(totalDist / totalFuel).toFixed(2) : 0,
      totalFuelGal: +totalFuel.toFixed(1),
      totalCost: +totalCost.toFixed(2),
      idlingMinutes: idleMin,
      idlingFuelGal: +idleFuel.toFixed(1),
    };
  });
}

// ── Export Generated Data ──────────────────────────────────────────────────────

export const TRIP_RECORDS = generateTrips();
export const FUEL_PURCHASES = generatePurchases();
export const IDLING_EVENTS = generateIdlingEvents();
export const DRIVER_FUEL_SUMMARIES = buildDriverSummaries(TRIP_RECORDS, FUEL_PURCHASES, IDLING_EVENTS);

// Unique jurisdictions from trip data (for filter dropdowns)
export const TRIP_JURISDICTIONS = [...new Set(TRIP_RECORDS.map(t => t.jurisdiction))].sort();
// Unique vehicle unit numbers (for filter dropdowns)
export const TRIP_VEHICLES = [...new Set(TRIP_RECORDS.map(t => t.unitNumber))].sort();
// Unique drivers (for filter dropdowns)
export const TRIP_DRIVERS = [...new Set(DRIVER_VEHICLE_ASSIGNMENTS.map(a => a.driverName))].sort();
