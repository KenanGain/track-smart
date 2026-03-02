// ────────────────────────────────────────────────────────────────────────────────
// IFTA Summary — mock data modelled after the Motorq/Geotab IFTA Summary API
// Each result represents one vehicle × jurisdiction × month record.
//
// Vehicles are derived from INITIAL_ASSETS in assets.data.ts so that both
// data sources stay in sync.
// ────────────────────────────────────────────────────────────────────────────────

import { INITIAL_ASSETS } from '@/pages/assets/assets.data';
import type { Asset } from '@/pages/assets/assets.data';

// ── Types ────────────────────────────────────────────────────────────────────────

export interface IftaVehicle {
  id: string;
  sourceId: string;
  provider: 'geotab' | 'motive';
  status: 'active' | 'inactive';
  metadata: {
    addedAt: string;
    modifiedAt: string;
    deletedAt: string | null;
    visibility: 'visible' | 'hidden';
  };
  vin: string;
  name: string;
  make: string;
  model: string;
  year: number;
  groups: string[];
  devices: string[];
  licensePlate: { state: string; number: string };
  fuelType: 'diesel' | 'gasoline' | 'diesel/electric';
  fuelEfficiency: number | null;
  fuelTankCapacity: number | null;
  createdAt: string;
  updatedAt: string;
  raw: unknown[];
}

export interface IftaRawEntry {
  provider: 'geotab' | 'motive';
  schema: 'IftaSummary';
  extractedAt: string;
  data: {
    vehicleId?: string;
    vehicleExternalId?: string;
    jurisdiction: string;
    month: string;
    distanceKm: number;
  };
}

export interface IftaSummaryResult {
  provider: 'geotab' | 'motive';
  distance: number;           // km
  vehicle: IftaVehicle;
  jurisdiction: string;       // 2-letter code (ON, MI, TX, etc.)
  month: string;              // YYYY-MM
  raw: IftaRawEntry[];
}

export interface IftaSummaryResponse {
  results: IftaSummaryResult[];
  next: string | null;
}

// ── Asset → IftaVehicle mapping ─────────────────────────────────────────────────

/** Per-vehicle metadata that can't be derived from the Asset type */
interface VehicleMeta {
  assetId: string;          // INITIAL_ASSETS .id to look up
  provider: 'geotab' | 'motive';
  sourceId: string;         // telematics sourceId
  groups: string[];
  devices: string[];
  plateState: string;       // 2-letter jurisdiction code for the plate
  fuelType: 'diesel' | 'gasoline' | 'diesel/electric';
  fuelEfficiency: number | null;
  fuelTankCapacity: number | null;
}

/** Mapping table: one entry per vehicle participating in IFTA */
const VEHICLE_META: VehicleMeta[] = [
  { assetId: 'a1', provider: 'geotab',  sourceId: 'TR-1049-GEO', groups: ['grp_fleet_main'], devices: ['dvc_geotab_1049'], plateState: 'TX', fuelType: 'diesel',           fuelEfficiency: 29.2, fuelTankCapacity: 113.56 },
  { assetId: 'a2', provider: 'geotab',  sourceId: 'TR-2088-GEO', groups: ['grp_fleet_main'], devices: ['dvc_geotab_2088'], plateState: 'ON', fuelType: 'diesel',           fuelEfficiency: 30.8, fuelTankCapacity: 113.56 },
  { assetId: 'a3', provider: 'motive',  sourceId: 'TR-3055-MOT', groups: ['grp_fleet_main'], devices: [],                  plateState: 'NV', fuelType: 'diesel',           fuelEfficiency: 26.1, fuelTankCapacity: 151.41 },
  { assetId: 'a5', provider: 'geotab',  sourceId: 'TR-5200-GEO', groups: ['grp_fleet_main'], devices: ['dvc_geotab_5200'], plateState: 'CA', fuelType: 'diesel/electric',   fuelEfficiency: 32.5, fuelTankCapacity: 75.71  },
  { assetId: 'a6', provider: 'motive',  sourceId: 'TR-6001-MOT', groups: [],                 devices: [],                  plateState: 'FL', fuelType: 'diesel',           fuelEfficiency: 22.4, fuelTankCapacity: 189.27 },
  { assetId: 'a7', provider: 'geotab',  sourceId: 'TR-7044-GEO', groups: ['grp_fleet_main'], devices: ['dvc_geotab_7044'], plateState: 'ON', fuelType: 'diesel',           fuelEfficiency: 33.1, fuelTankCapacity: 113.56 },
];

/** Convert an Asset + VehicleMeta into an IftaVehicle (API-shaped) */
function assetToIftaVehicle(asset: Asset, meta: VehicleMeta): IftaVehicle {
  const isInactive = asset.operationalStatus === 'OutOfService' || asset.operationalStatus === 'Deactivated';
  return {
    id: `vcl_${asset.id.toUpperCase()}_${asset.model?.replace(/\s+/g, '').toUpperCase() || 'UNKNOWN'}`,
    sourceId: meta.sourceId,
    provider: meta.provider,
    status: isInactive ? 'inactive' : 'active',
    metadata: {
      addedAt: `${asset.dateAdded}T00:00:00Z`,
      modifiedAt: new Date().toISOString(),
      deletedAt: isInactive ? new Date().toISOString() : null,
      visibility: isInactive ? 'hidden' : 'visible',
    },
    vin: asset.vin,
    name: asset.unitNumber,
    make: asset.make || '',
    model: asset.model || '',
    year: asset.year,
    groups: meta.groups,
    devices: meta.devices,
    licensePlate: { state: meta.plateState, number: asset.plateNumber || '' },
    fuelType: meta.fuelType,
    fuelEfficiency: meta.fuelEfficiency,
    fuelTankCapacity: meta.fuelTankCapacity,
    createdAt: `${asset.dateAdded}T00:00:00Z`,
    updatedAt: new Date().toISOString(),
    raw: [],
  };
}

/** Build VEHICLES from INITIAL_ASSETS using the mapping table */
const VEHICLES: IftaVehicle[] = VEHICLE_META.map(meta => {
  const asset = INITIAL_ASSETS.find(a => a.id === meta.assetId);
  if (!asset) throw new Error(`IFTA: Asset ${meta.assetId} not found in INITIAL_ASSETS`);
  return assetToIftaVehicle(asset, meta);
});

// ── Jurisdiction codes ──────────────────────────────────────────────────────────

// US state codes
// CA=California, TX=Texas, MI=Michigan, NY=New York, OH=Ohio, PA=Pennsylvania,
// IL=Illinois, IN=Indiana, FL=Florida, NV=Nevada
// Canadian province codes
// ON=Ontario, QC=Quebec, AB=Alberta, BC=British Columbia, MB=Manitoba, SK=Saskatchewan

const JURISDICTIONS = [
  'ON', 'QC', 'AB', 'BC', 'MB', 'SK',
  'TX', 'MI', 'CA', 'NY', 'OH', 'PA', 'IL', 'IN', 'FL',
];

// ── Deterministic seed helper ───────────────────────────────────────────────────

function seeded(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
function rng(min: number, max: number, seed: number): number {
  return min + seeded(seed) * (max - min);
}

// ── Months covered ──────────────────────────────────────────────────────────────

const MONTHS = [
  '2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06',
  '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12',
  '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06',
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03',
];

// ── Generate IFTA summary results ───────────────────────────────────────────────

function generateIftaSummaryResults(): IftaSummaryResult[] {
  const results: IftaSummaryResult[] = [];
  let seedCounter = 1;

  for (const vehicle of VEHICLES) {
    // Inactive vehicles stop producing records after deletion
    const cutoffMonth = vehicle.status === 'inactive' ? '2024-02' : '2099-12';

    for (const month of MONTHS) {
      if (month > cutoffMonth) continue;

      // Each vehicle doesn't travel in every jurisdiction every month
      // Pick 3-7 jurisdictions per vehicle per month
      const jurCount = Math.floor(rng(3, 7.9, seedCounter++));
      const shuffled = [...JURISDICTIONS].sort((a, _b) => seeded(seedCounter++ + a.charCodeAt(0)) - 0.5 > 0 ? 1 : -1);
      const activeJur = shuffled.slice(0, jurCount);

      for (const jur of activeJur) {
        const s = seedCounter++;
        // Distance in km — ranges from ~200 to ~8000 km per jurisdiction/month
        const distKm = +rng(180, 8200, s).toFixed(1);

        // Compute extractedAt as ~3 days into the next month
        const [y, m] = month.split('-').map(Number);
        const nextMonth = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
        const extractDay = Math.floor(rng(2, 6, s + 1));
        const extractedAt = `${nextMonth}-${String(extractDay).padStart(2, '0')}T${String(Math.floor(rng(8, 16, s + 2))).padStart(2, '0')}:${String(Math.floor(rng(0, 59, s + 3))).padStart(2, '0')}:${String(Math.floor(rng(0, 59, s + 4))).padStart(2, '0')}.${String(Math.floor(rng(100, 999, s + 5)))}Z`;

        const rawData: IftaRawEntry['data'] = vehicle.provider === 'geotab'
          ? { vehicleId: vehicle.sourceId, jurisdiction: jur, month, distanceKm: distKm }
          : { vehicleExternalId: vehicle.sourceId, jurisdiction: jur, month, distanceKm: distKm };

        results.push({
          provider: vehicle.provider,
          distance: distKm,
          vehicle,
          jurisdiction: jur,
          month,
          raw: [
            {
              provider: vehicle.provider,
              schema: 'IftaSummary',
              extractedAt,
              data: rawData,
            },
          ],
        });
      }
    }
  }

  // Sort: newest month first, then by vehicle name, then jurisdiction
  return results.sort((a, b) => {
    if (a.month !== b.month) return b.month.localeCompare(a.month);
    if (a.vehicle.name !== b.vehicle.name) return a.vehicle.name.localeCompare(b.vehicle.name);
    return a.jurisdiction.localeCompare(b.jurisdiction);
  });
}

// ── Export ───────────────────────────────────────────────────────────────────────

export const IFTA_SUMMARY_RESULTS = generateIftaSummaryResults();

export const IFTA_SUMMARY_RESPONSE: IftaSummaryResponse = {
  results: IFTA_SUMMARY_RESULTS,
  next: 'cD0yMDI2LTAzLTAxKzAwJTNBMDAlM0EwMC4wMDAwMDAlMkIwMCUzQTAw',
};

// ── Derived helpers (for filter dropdowns) ──────────────────────────────────────

/** All unique jurisdiction codes in the data */
export const IFTA_JURISDICTION_CODES = [...new Set(IFTA_SUMMARY_RESULTS.map(r => r.jurisdiction))].sort();

/** All unique months in the data (YYYY-MM) */
export const IFTA_AVAILABLE_MONTHS = [...new Set(IFTA_SUMMARY_RESULTS.map(r => r.month))].sort().reverse();

/** All unique years in the data */
export const IFTA_AVAILABLE_YEARS = [...new Set(IFTA_SUMMARY_RESULTS.map(r => Number(r.month.split('-')[0])))].sort((a, b) => b - a);

/** All unique vehicle names in the data */
export const IFTA_VEHICLE_NAMES = [...new Set(IFTA_SUMMARY_RESULTS.map(r => r.vehicle.name))].sort();

/** Jurisdiction code → full name mapping */
export const JURISDICTION_LABELS: Record<string, string> = {
  ON: 'Ontario', QC: 'Quebec', AB: 'Alberta', BC: 'British Columbia',
  MB: 'Manitoba', SK: 'Saskatchewan',
  TX: 'Texas', MI: 'Michigan', CA: 'California', NY: 'New York',
  OH: 'Ohio', PA: 'Pennsylvania', IL: 'Illinois', IN: 'Indiana', FL: 'Florida',
  NV: 'Nevada',
};

/** Jurisdiction code → region */
export const JURISDICTION_REGION: Record<string, 'US' | 'Canada'> = {
  ON: 'Canada', QC: 'Canada', AB: 'Canada', BC: 'Canada', MB: 'Canada', SK: 'Canada',
  TX: 'US', MI: 'US', CA: 'US', NY: 'US', OH: 'US', PA: 'US', IL: 'US', IN: 'US', FL: 'US',
  NV: 'US',
};

/** Quarter for a given month string */
export function getQuarter(month: string): number {
  const m = Number(month.split('-')[1]);
  return Math.ceil(m / 3);
}
