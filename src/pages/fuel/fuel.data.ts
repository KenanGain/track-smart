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
  { driverId: 'DRV-2010', driverName: 'David Thompson',   vehicleId: 'a7', unitNumber: 'TR-7044', primary: true },
  { driverId: 'DRV-1002', driverName: 'Maria Rodriguez',  vehicleId: 'a1', unitNumber: 'TR-1049', primary: false },
  { driverId: 'DRV-1004', driverName: 'Sarah Johnson',    vehicleId: 'a6', unitNumber: 'TR-6001', primary: true },
];

// ── Jurisdictions ──────────────────────────────────────────────────────────────

const JURISDICTIONS = [
  'Ontario', 'Texas', 'Michigan', 'California', 'New York',
  'Ohio', 'Pennsylvania', 'Illinois', 'Florida', 'Indiana',
];

interface FuelLocation { loc: string; jur: string; }

const US_FUEL_LOCATIONS: FuelLocation[] = [
  // Texas
  { loc: 'Pilot Travel Center, Dallas TX',      jur: 'Texas' },
  { loc: "Love's Travel Stop, Houston TX",       jur: 'Texas' },
  { loc: 'Flying J, San Antonio TX',             jur: 'Texas' },
  { loc: 'TA Petro, El Paso TX',                 jur: 'Texas' },
  { loc: 'Love\'s Travel Stop, Amarillo TX',     jur: 'Texas' },
  // Ohio
  { loc: 'TA Petro, Columbus OH',                jur: 'Ohio' },
  { loc: 'Flying J, Cleveland OH',               jur: 'Ohio' },
  { loc: 'Pilot Travel Center, Cincinnati OH',   jur: 'Ohio' },
  // Pennsylvania
  { loc: 'Sheetz, Pittsburgh PA',                jur: 'Pennsylvania' },
  { loc: 'TA Petro, Philadelphia PA',            jur: 'Pennsylvania' },
  { loc: 'Pilot Travel Center, Harrisburg PA',   jur: 'Pennsylvania' },
  // Florida
  { loc: 'Circle K, Orlando FL',                 jur: 'Florida' },
  { loc: 'Pilot Travel Center, Tampa FL',        jur: 'Florida' },
  { loc: 'Flying J, Miami FL',                   jur: 'Florida' },
  // Illinois
  { loc: 'Pilot Travel Center, Chicago IL',      jur: 'Illinois' },
  { loc: "Love's Travel Stop, Springfield IL",   jur: 'Illinois' },
  // Indiana
  { loc: "Love's Travel Stop, Indianapolis IN",  jur: 'Indiana' },
  { loc: 'Flying J, Fort Wayne IN',              jur: 'Indiana' },
  // Michigan
  { loc: 'Pilot Travel Center, Detroit MI',      jur: 'Michigan' },
  { loc: 'Flying J, Grand Rapids MI',            jur: 'Michigan' },
  { loc: 'TA Petro, Flint MI',                   jur: 'Michigan' },
  // California
  { loc: 'Pilot Travel Center, Los Angeles CA',  jur: 'California' },
  { loc: 'Flying J, Sacramento CA',              jur: 'California' },
  { loc: "Love's Travel Stop, Fresno CA",        jur: 'California' },
  // New York
  { loc: 'Pilot Travel Center, Buffalo NY',      jur: 'New York' },
  { loc: 'TA Petro, Albany NY',                  jur: 'New York' },
  // Nevada
  { loc: 'Flying J, Las Vegas NV',               jur: 'Nevada' },
  { loc: 'Pilot Travel Center, Reno NV',         jur: 'Nevada' },
  // Tennessee
  { loc: 'Pilot Travel Center, Memphis TN',      jur: 'Tennessee' },
  { loc: 'Flying J, Nashville TN',               jur: 'Tennessee' },
  // Georgia
  { loc: 'Flying J, Atlanta GA',                 jur: 'Georgia' },
  { loc: "Love's Travel Stop, Savannah GA",      jur: 'Georgia' },
  // Colorado
  { loc: "Love's Travel Stop, Denver CO",        jur: 'Colorado' },
  // Missouri
  { loc: 'TA Petro, Kansas City MO',             jur: 'Missouri' },
  { loc: 'Flying J, St. Louis MO',               jur: 'Missouri' },
  // Maryland
  { loc: 'Sheetz, Baltimore MD',                 jur: 'Maryland' },
  // Arizona
  { loc: 'Pilot Travel Center, Phoenix AZ',      jur: 'Arizona' },
  { loc: 'Flying J, Tucson AZ',                  jur: 'Arizona' },
  // Washington
  { loc: 'Flying J, Seattle WA',                 jur: 'Washington' },
  // North Carolina
  { loc: "Love's Travel Stop, Charlotte NC",     jur: 'North Carolina' },
  { loc: 'Pilot Travel Center, Raleigh NC',      jur: 'North Carolina' },
  // Virginia
  { loc: 'Pilot Travel Center, Richmond VA',     jur: 'Virginia' },
  // Wisconsin
  { loc: 'Flying J, Milwaukee WI',               jur: 'Wisconsin' },
  // Minnesota
  { loc: 'Pilot Travel Center, Minneapolis MN',  jur: 'Minnesota' },
  // Oklahoma
  { loc: "Love's Travel Stop, Oklahoma City OK", jur: 'Oklahoma' },
  // Louisiana
  { loc: 'Flying J, New Orleans LA',             jur: 'Louisiana' },
  // Kentucky
  { loc: 'TA Petro, Louisville KY',              jur: 'Kentucky' },
  // Alabama
  { loc: "Love's Travel Stop, Birmingham AL",    jur: 'Alabama' },
];

const CA_FUEL_LOCATIONS: FuelLocation[] = [
  { loc: 'Shell Station, Toronto ON',            jur: 'Ontario' },
  { loc: 'Petro-Canada, London ON',              jur: 'Ontario' },
  { loc: 'Husky, Hamilton ON',                   jur: 'Ontario' },
  { loc: 'Esso, Mississauga ON',                 jur: 'Ontario' },
  { loc: 'Shell Station, Ottawa ON',             jur: 'Ontario' },
  { loc: 'Petro-Canada, Calgary AB',             jur: 'Alberta' },
  { loc: 'Shell Station, Edmonton AB',           jur: 'Alberta' },
  { loc: 'Esso, Red Deer AB',                    jur: 'Alberta' },
  { loc: 'Husky, Vancouver BC',                  jur: 'British Columbia' },
  { loc: 'Petro-Canada, Surrey BC',              jur: 'British Columbia' },
  { loc: 'Petro-Canada, Winnipeg MB',            jur: 'Manitoba' },
  { loc: 'Co-op, Saskatoon SK',                  jur: 'Saskatchewan' },
  { loc: 'Co-op, Regina SK',                     jur: 'Saskatchewan' },
  { loc: 'Shell Station, Montreal QC',           jur: 'Quebec' },
  { loc: 'Petro-Canada, Quebec City QC',         jur: 'Quebec' },
];

const FUEL_LOCATIONS: FuelLocation[] = [...US_FUEL_LOCATIONS, ...CA_FUEL_LOCATIONS];

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

type FuelPurchaseProfile = {
  minGallons: number;
  maxGallons: number;
  minPpg: number;
  maxPpg: number;
};

// Base fuel type per assigned unit, then expanded to related variants for richer demo data.
const BASE_FUEL_TYPE_BY_ASSET_ID: Record<string, string> = {
  a1: 'Diesel',
  a2: 'Biodiesel',
  a3: 'Propane',
  a5: 'Hybrid electric',
  a6: 'Compressed natural gas',
  a7: 'Gasoline',
};

const FUEL_TYPE_VARIANTS_BY_BASE: Record<string, string[]> = {
  Diesel: ['Diesel', 'Biodiesel', 'A55'],
  Biodiesel: ['Biodiesel', 'Diesel', 'A55'],
  Gasoline: ['Gasoline', 'E-85', 'Ethanol', 'M-85', 'Methanol'],
  Propane: ['Propane', 'Compressed natural gas', 'Liquid natural gas'],
  'Compressed natural gas': ['Compressed natural gas', 'Liquid natural gas', 'Propane'],
  'Hybrid electric': ['Hybrid electric', 'Plug-in hybrid electric', 'Electric', 'Hydrogen'],
  Other: ['Other'],
};

const FUEL_PURCHASE_PROFILES: Record<string, FuelPurchaseProfile> = {
  'A55': { minGallons: 35, maxGallons: 145, minPpg: 3.35, maxPpg: 5.2 },
  'Biodiesel': { minGallons: 32, maxGallons: 140, minPpg: 3.3, maxPpg: 5.1 },
  'Compressed natural gas': { minGallons: 18, maxGallons: 85, minPpg: 2.4, maxPpg: 3.9 },
  'Diesel': { minGallons: 35, maxGallons: 150, minPpg: 3.25, maxPpg: 4.95 },
  'E-85': { minGallons: 22, maxGallons: 95, minPpg: 2.2, maxPpg: 3.8 },
  'Electric': { minGallons: 10, maxGallons: 50, minPpg: 1.1, maxPpg: 2.6 },
  'Ethanol': { minGallons: 20, maxGallons: 90, minPpg: 2.1, maxPpg: 3.7 },
  'Gasoline': { minGallons: 24, maxGallons: 110, minPpg: 2.6, maxPpg: 4.35 },
  'Hydrogen': { minGallons: 8, maxGallons: 32, minPpg: 4.8, maxPpg: 8.6 },
  'Hybrid electric': { minGallons: 14, maxGallons: 68, minPpg: 2.0, maxPpg: 3.9 },
  'Liquid natural gas': { minGallons: 24, maxGallons: 96, minPpg: 2.7, maxPpg: 4.45 },
  'M-85': { minGallons: 20, maxGallons: 86, minPpg: 2.0, maxPpg: 3.8 },
  'Methanol': { minGallons: 18, maxGallons: 82, minPpg: 1.9, maxPpg: 3.6 },
  'Plug-in hybrid electric': { minGallons: 10, maxGallons: 55, minPpg: 1.8, maxPpg: 3.4 },
  'Propane': { minGallons: 18, maxGallons: 88, minPpg: 2.2, maxPpg: 3.6 },
  'Other': { minGallons: 15, maxGallons: 80, minPpg: 2.4, maxPpg: 6.4 },
};

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

function getFuelTypeForAssignment(assignment: DriverVehicleAssignment, seed: number, vehicleType?: string): string {
  const defaultBase = vehicleType === 'Reefer' ? 'Hybrid electric' : 'Diesel';
  const baseType = BASE_FUEL_TYPE_BY_ASSET_ID[assignment.vehicleId] || defaultBase;
  const typePool = FUEL_TYPE_VARIANTS_BY_BASE[baseType] || [baseType];
  if (seededRandom(seed + 97) > 0.965) return 'Other';
  return pick(typePool, seed + assignment.driverId.length + assignment.unitNumber.length);
}

function getFuelPurchaseProfile(fuelType: string): FuelPurchaseProfile {
  return FUEL_PURCHASE_PROFILES[fuelType] || { minGallons: 24, maxGallons: 110, minPpg: 2.8, maxPpg: 4.9 };
}

// ── Generate Trip Records ──────────────────────────────────────────────────────

function generateTrips(): TripRecord[] {
  const trips: TripRecord[] = [];
  const assignments = DRIVER_VEHICLE_ASSIGNMENTS;
  const cmvAssets = INITIAL_ASSETS.filter(a => a.assetCategory === 'CMV' && a.operationalStatus !== 'Drafted');

  let id = 1;
  const REF_DATE_T = new Date(2026, 2, 1); // Mar 1 2026
  for (let dayOffset = 0; dayOffset < 425; dayOffset++) {
    const date = new Date(REF_DATE_T);
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
          fuelType: getFuelTypeForAssignment(assignment, tripSeed + 9, asset.vehicleType),
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

  // Cover all of 2025 (Q1–Q4) + Q1 2026: 425 days from 2025-01-01 to 2026-03-01
  const REF_DATE = new Date(2026, 2, 1); // Mar 1 2026
  const LOOKBACK_DAYS = 425;

  for (let dayOffset = 0; dayOffset < LOOKBACK_DAYS; dayOffset += 1) {
    const date = new Date(REF_DATE);
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split('T')[0];

    for (const assignment of assignments) {
      const asset = INITIAL_ASSETS.find(a => a.id === assignment.vehicleId);
      if (!asset || asset.operationalStatus === 'OutOfService') continue;

      const seed = id * 47 + dayOffset * 11;
      // Drivers fuel roughly every 2-3 days
      if (seededRandom(seed) > 0.40) continue;

      // US vehicles favour US locations (~80%), CA plate vehicles favour CA (~80%)
      const isCAVehicle = ['TR-2088', 'TR-7044'].includes(assignment.unitNumber);
      const locPool = seededRandom(seed + 88) < (isCAVehicle ? 0.75 : 0.20)
        ? CA_FUEL_LOCATIONS
        : US_FUEL_LOCATIONS;

      const locObj = pick(locPool, seed + 3);
      const fuelType = getFuelTypeForAssignment(assignment, seed + 4, asset.vehicleType);
      const profile = getFuelPurchaseProfile(fuelType);
      const gallons = +rng(profile.minGallons, profile.maxGallons, seed + 1).toFixed(1);
      const ppg = +rng(profile.minPpg, profile.maxPpg, seed + 2).toFixed(2);

      purchases.push({
        id: `fp-${String(id).padStart(4, '0')}`,
        date: dateStr,
        location: locObj.loc,
        jurisdiction: locObj.jur,
        vehicleId: assignment.vehicleId,
        unitNumber: assignment.unitNumber,
        driverId: assignment.driverId,
        driverName: assignment.driverName,
        gallons,
        pricePerGallon: ppg,
        totalCost: +(gallons * ppg).toFixed(2),
        fuelType,
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
  const REF_DATE_I = new Date(2026, 2, 1);

  for (let dayOffset = 0; dayOffset < 425; dayOffset++) {
    const date = new Date(REF_DATE_I);
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
        const loc = pick(FUEL_LOCATIONS, eSeed + 3).loc.split(',')[0];

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
