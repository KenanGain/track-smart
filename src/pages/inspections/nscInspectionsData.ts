/**
 * nscInspectionsData.ts
 *
 * NSC Inspection database — augments raw CVSA records with links to internal
 * driver profiles (MOCK_DRIVERS) and fleet assets (INITIAL_ASSETS).
 *
 * Lookup maps (DEFECT_TO_NSC, NSC_CODE_TO_SYSTEM) live in nscViolationMap.ts
 * to avoid circular imports (NscAnalysis ↔ nscInspectionsData).
 */

// Re-export the maps so existing import sites still work
export { DEFECT_TO_NSC, NSC_CODE_TO_SYSTEM } from './nscViolationMap';

/**
 * NSC Inspection Database — augments raw CVSA records with links to
 * internal driver profiles (MOCK_DRIVERS) and fleet assets (INITIAL_ASSETS).
 *
 * Source truth for driver IDs:  src/data/mock-app-data.ts → MOCK_DRIVERS
 * Source truth for asset IDs:   src/pages/assets/assets.data.ts → INITIAL_ASSETS
 */

import { cvsaDetailsData } from './NscAnalysis';
import type { CvsaRow } from './NscAnalysis';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-drivers.data';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';

// ── Extended types ────────────────────────────────────────────────────────────

export interface NscDriverLink {
  /** Internal driver ID — references MOCK_DRIVERS[].id */
  driverId: string;
  /** Display name — matches MOCK_DRIVERS[].name */
  driverName: string;
  /** Raw licence string from the NSC inspection record (audit trail) */
  rawLicence?: string;
}

export interface NscAssetLink {
  /** Internal asset ID — references INITIAL_ASSETS[].id (null if trailer not in system) */
  assetId: string | null;
  /** Internal unit number, e.g. "TR-1049" */
  unitNumber: string;
  /** Fleet plate shown on the NSC inspection report */
  plate: string;
  /** Make from the inspection report */
  make: string;
  /** VIN recorded at time of inspection */
  vin?: string;
  /** Vehicle model year at time of inspection */
  year?: string;
  /** Vehicle type code: P = power unit, ST = semi-trailer */
  vehicleTypeCode?: string;
}

/** CvsaRow extended with resolved driver and fleet-asset links */
export interface NscInspectionRecord extends CvsaRow {
  driverLink: NscDriverLink;
  /** Primary (tractor / power unit) vehicle */
  primaryVehicle: NscAssetLink;
  /** Trailer present at time of inspection (may not exist in our asset system) */
  trailerLink?: NscAssetLink;
}

// ── Plate → Asset reference map ───────────────────────────────────────────────
// NSC fleet plates used in inspection records mapped to internal asset IDs.
// Multiple plates may share an asset ID (different trips / re-registration).

const PLATE_ASSET_MAP: Record<string, { assetId: string; unitNumber: string }> = {
  'A41990 AB':  { assetId: 'a1', unitNumber: 'TR-1049' },
  '0AP132 AB':  { assetId: 'a1', unitNumber: 'TR-1049' },
  '0AP133 AB':  { assetId: 'a1', unitNumber: 'TR-1049' },
  '0AP146 AB':  { assetId: 'a2', unitNumber: 'TR-2088' },
  '0AU249 AB':  { assetId: 'a2', unitNumber: 'TR-2088' },
  'A49908 AB':  { assetId: 'a2', unitNumber: 'TR-2088' },
  '0AB116 AB':  { assetId: 'a3', unitNumber: 'TR-3055' },
  'A41989 AB':  { assetId: 'a3', unitNumber: 'TR-3055' },
  '0AP012 AB':  { assetId: 'a3', unitNumber: 'TR-3055' },
  'A85916 AB':  { assetId: 'a6', unitNumber: 'TR-6001' },
  'A94629 AB':  { assetId: 'a6', unitNumber: 'TR-6001' },
  'A41838 AB':  { assetId: 'a6', unitNumber: 'TR-6001' },
  '0AU350 AB':  { assetId: 'a5', unitNumber: 'TR-5200' },
  'A49913 AB':  { assetId: 'a7', unitNumber: 'TR-7044' },
  'A45934 AB':  { assetId: 'a7', unitNumber: 'TR-7044' },
};

// ── Driver name → ID mapping (matched from raw NSC driver strings) ────────────
interface DriverPattern { pattern: RegExp; driverId: string; driverName: string }

const DRIVER_PATTERNS: DriverPattern[] = [
  { pattern: /Talvinder/i,   driverId: 'DRV-1001', driverName: 'James Sullivan'   },
  { pattern: /DEEP.GILL/i,   driverId: 'DRV-1002', driverName: 'Maria Rodriguez'  },
  { pattern: /Jaskaran/i,    driverId: 'DRV-1003', driverName: 'Robert Chen'       },
  { pattern: /JASMEET/i,     driverId: 'DRV-1004', driverName: 'Sarah Johnson'     },
  { pattern: /Baljinder/i,   driverId: 'DRV-1005', driverName: 'Michael Brown'     },
  { pattern: /Jagdeep/i,     driverId: 'DRV-2001', driverName: 'John Smith'        },
  { pattern: /LOVEPREET/i,   driverId: 'DRV-2002', driverName: 'Sarah Miller'      },
  { pattern: /GURDEEP/i,     driverId: 'DRV-2003', driverName: 'Mike Johnson'      },
];

function resolveDriverFromRaw(rawStr: string): NscDriverLink {
  for (const entry of DRIVER_PATTERNS) {
    if (entry.pattern.test(rawStr)) {
      return { driverId: entry.driverId, driverName: entry.driverName, rawLicence: rawStr };
    }
  }
  return { driverId: 'DRV-2004', driverName: 'Elena Rodriguez', rawLicence: rawStr };
}

function resolveAsset(plate: string, make?: string, vin?: string, year?: string, typeCode?: string): NscAssetLink {
  const ref = PLATE_ASSET_MAP[plate];
  return {
    assetId:         ref?.assetId   ?? null,
    unitNumber:      ref?.unitNumber ?? plate,
    plate,
    make:            make ?? '—',
    vin,
    year,
    vehicleTypeCode: typeCode,
  };
}

// Fallback driver rotation for records without raw driver string data
const FALLBACK_DRIVERS: NscDriverLink[] = [
  { driverId: 'DRV-1001', driverName: 'James Sullivan'   },
  { driverId: 'DRV-1002', driverName: 'Maria Rodriguez'  },
  { driverId: 'DRV-1003', driverName: 'Robert Chen'      },
  { driverId: 'DRV-1004', driverName: 'Sarah Johnson'    },
  { driverId: 'DRV-1005', driverName: 'Michael Brown'    },
  { driverId: 'DRV-2001', driverName: 'John Smith'       },
  { driverId: 'DRV-2002', driverName: 'Sarah Miller'     },
  { driverId: 'DRV-2003', driverName: 'Mike Johnson'     },
  { driverId: 'DRV-2004', driverName: 'Elena Rodriguez'  },
];

// ── Per-record explicit links (records 1–10 have full details) ────────────────
// For records 11–43, links are derived automatically from plate + fallback driver rotation.

type ExplicitLinks = {
  driverLink: NscDriverLink;
  primaryVehicle: NscAssetLink;
  trailerLink?: NscAssetLink;
};

const EXPLICIT_LINKS: Record<number, ExplicitLinks> = {
  1: {
    driverLink:     resolveDriverFromRaw('Talvinder Singh S44907320001231 ON'),
    primaryVehicle: resolveAsset('A41990 AB', 'Freightliner', '3AKJHHDRXKSKA3234', '2019', 'P'),
    trailerLink:    resolveAsset('W2880V', 'UTIL', undefined, undefined, 'ST'),
  },
  2: {
    driverLink:     resolveDriverFromRaw('DEEP GILL G43501590910421 ON'),
    primaryVehicle: resolveAsset('0AP146 AB', 'International', '3HSDZAPR2RN653376', '2024', 'P'),
    trailerLink:    resolveAsset('W1672C', 'UNPUBLISHE', undefined, undefined, 'ST'),
  },
  3: {
    driverLink:     resolveDriverFromRaw('. Jaskaran Singh 179746-979 AB'),
    primaryVehicle: resolveAsset('0AB116 AB', 'Freightliner', '1FUJHHDRXNLMX0362', '2022', 'P'),
    trailerLink:    resolveAsset('6PD082', 'VANGUARD', undefined, undefined, 'ST'),
  },
  4: {
    driverLink:     resolveDriverFromRaw('JASMEET SINGH J07540000010417 ON'),
    primaryVehicle: resolveAsset('A85916 AB', 'Mack', '1M1AN4GYXNM027473', '2022', 'P'),
  },
  5: {
    driverLink:     resolveDriverFromRaw('Baljinder Singh S44900720920825 ON'),
    primaryVehicle: resolveAsset('0AP132 AB', 'Freightliner', '1FUJHHDR3MLMD4278', '2021', 'P'),
    trailerLink:    resolveAsset('X8283F', 'VANG', undefined, undefined, 'ST'),
  },
  6: {
    driverLink:     resolveDriverFromRaw('Jagdeep Singh SINGH161194016 NS'),
    primaryVehicle: resolveAsset('0AU350 AB', 'Freightliner', '3AKJHHDR8NSMX1157', '2022', 'P'),
    trailerLink:    resolveAsset('6NZ508', 'MANAC', undefined, undefined, 'ST'),
  },
  7: {
    driverLink:     resolveDriverFromRaw('LOVEPREET SINGH L68540000000723 ON'),
    primaryVehicle: resolveAsset('A45934 AB', 'Freightliner', '3AKJHHDR4KSKJ4881', '2019', 'P'),
    trailerLink:    resolveAsset('W2880V', 'UTIL', undefined, undefined, 'ST'),
  },
  8: {
    driverLink:     resolveDriverFromRaw('LOVEPREET SINGH L68540000000723 ON'),
    primaryVehicle: resolveAsset('A45934 AB', 'Freightliner', '3AKJHHDR4KSKJ4881', '2019', 'P'),
    trailerLink:    resolveAsset('W7735E', 'UTIL', undefined, undefined, 'ST'),
  },
  9: {
    driverLink:     resolveDriverFromRaw('Jagdeep Singh SINGH161194016 NS'),
    primaryVehicle: resolveAsset('A41990 AB', 'Freightliner', '3AKJHHDRXKSKA3234', '2019', 'P'),
    trailerLink:    resolveAsset('W2208K', '—', undefined, undefined, 'ST'),
  },
  10: {
    driverLink:     resolveDriverFromRaw('GURDEEP SINGH S44903080932013 ON'),
    primaryVehicle: resolveAsset('0AU249 AB', 'International', '1HTMMMMRXFH742070', '2015', 'P'),
  },
};

// ── Build the full NSC inspection database ────────────────────────────────────

export const NSC_INSPECTIONS: NscInspectionRecord[] = cvsaDetailsData.map((row: CvsaRow, arrayIndex: number): NscInspectionRecord => {
  if (EXPLICIT_LINKS[row.id]) {
    return { ...row, ...EXPLICIT_LINKS[row.id] };
  }

  // Derive links for records without explicit mapping (ids 11–43)
  const fallbackIdx = (arrayIndex - 10 + FALLBACK_DRIVERS.length * 10) % FALLBACK_DRIVERS.length;
  const driverLink = { ...FALLBACK_DRIVERS[fallbackIdx] };

  const vehicleMake = row.details?.vehicles?.[0]?.make ?? '—';
  const vehicleVin  = row.details?.vehicles?.[0]?.vin;
  const vehicleYear = row.details?.vehicles?.[0]?.year;
  const primaryVehicle = resolveAsset(row.plate, vehicleMake, vehicleVin, vehicleYear, 'P');

  let trailerLink: NscAssetLink | undefined;
  const trailer = row.details?.vehicles?.[1];
  if (trailer) {
    trailerLink = resolveAsset(trailer.plate, trailer.make, undefined, undefined, trailer.type);
  }

  return { ...row, driverLink, primaryVehicle, ...(trailerLink ? { trailerLink } : {}) };
});

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** All inspections involving a specific driver */
export function getNscByDriverId(driverId: string): NscInspectionRecord[] {
  return NSC_INSPECTIONS.filter((r) => r.driverLink.driverId === driverId);
}

/** All inspections involving a specific fleet asset */
export function getNscByAssetId(assetId: string): NscInspectionRecord[] {
  return NSC_INSPECTIONS.filter(
    (r) => r.primaryVehicle.assetId === assetId || r.trailerLink?.assetId === assetId,
  );
}

/** Aggregate pass / OOS / req counts across all NSC inspections */
export function getNscStats() {
  const total   = NSC_INSPECTIONS.length;
  const passed  = NSC_INSPECTIONS.filter((r) => r.result === 'Passed').length;
  const oos     = NSC_INSPECTIONS.filter((r) => r.result === 'Out Of Service').length;
  const reqAttn = NSC_INSPECTIONS.filter((r) => r.result === 'Requires Attention').length;
  return { total, passed, oos, reqAttn, oosRate: total > 0 ? +(oos / total * 100).toFixed(1) : 0 };
}

/** Driver-level inspection summary (for a driver profile page) */
export function getDriverInspectionSummary(driverId: string) {
  const records = getNscByDriverId(driverId);
  return {
    driverId,
    total:   records.length,
    passed:  records.filter((r) => r.result === 'Passed').length,
    oos:     records.filter((r) => r.result === 'Out Of Service').length,
    reqAttn: records.filter((r) => r.result === 'Requires Attention').length,
  };
}

/** Vehicle-level inspection summary (for an asset profile page) */
export function getAssetInspectionSummary(assetId: string) {
  const records = getNscByAssetId(assetId);
  return {
    assetId,
    total:   records.length,
    passed:  records.filter((r) => r.result === 'Passed').length,
    oos:     records.filter((r) => r.result === 'Out Of Service').length,
    reqAttn: records.filter((r) => r.result === 'Requires Attention').length,
  };
}

// ── Per-carrier NSC extension ─────────────────────────────────────────────
//
// NSC has four supported jurisdictions in this system: Alberta, British
// Columbia, Prince Edward Island, Nova Scotia. Each carrier's enrollment
// determines which provinces' inspections it accumulates. To populate the
// per-entity tabs we generate deterministic NSC records across these four
// jurisdictions using each carrier's *real* generated assets and drivers.
{
    type AnyAsset = { id: string; unitNumber: string; plateNumber?: string; vin?: string; make?: string; year?: number };
    type AnyDriver = { id: string; firstName?: string; lastName?: string; licenseNumber?: string };
    type AnyAccount = { id: string; country?: string };
    const _h = (s: string): number => {
        let h = 2166136261;
        for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
        return h >>> 0;
    };
    const _r = (seed: number) => {
        let a = seed >>> 0;
        return () => {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    };
    const _pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length) % arr.length];
    const _today = new Date();
    const _daysAgo = (n: number) => { const d = new Date(_today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

    const NSC_JURS = ['AB', 'BC', 'PE', 'NS'] as const;
    const LOCATIONS_BY_JUR: Record<string, string[]> = {
        AB: ['Calgary, AB', 'Edmonton, AB', 'Red Deer, AB', 'Lethbridge, AB'],
        BC: ['Vancouver, BC', 'Burnaby, BC', 'Surrey, BC', 'Kamloops, BC', 'Kelowna, BC'],
        PE: ['Charlottetown, PE', 'Summerside, PE'],
        NS: ['Halifax, NS', 'Sydney, NS', 'Truro, NS'],
    };
    const OOS_CATEGORIES = [
        'Brake System (OOS)',
        'Tires / Wheels (OOS)',
        'Coupling Devices (OOS)',
        'Hours-of-Service (OOS)',
        'Steering Mechanism (OOS)',
    ];
    const REQ_CATEGORIES = [
        'Lighting Devices',
        'Cargo Securement',
        'Mirrors',
        'Body — Mudflaps',
        'Driver Documentation',
    ];

    let nextId = 100000;
    for (const account of ACCOUNTS_DB as AnyAccount[]) {
        const assets = (CARRIER_ASSETS as Record<string, AnyAsset[]>)[account.id] ?? [];
        const drivers = (CARRIER_DRIVERS as Record<string, AnyDriver[]>)[account.id] ?? [];
        if (assets.length === 0 || drivers.length === 0) continue;

        const baseR = _r(_h(`nsc-extension:${account.id}`));
        // Each carrier draws 1–3 of the four NSC jurisdictions deterministically.
        const jurCount = 1 + Math.floor(baseR() * 3);
        const carrierJurs = NSC_JURS.slice(0, jurCount);

        for (const jur of carrierJurs) {
            const count = 2 + Math.floor(baseR() * 4);
            for (let i = 0; i < count; i++) {
                const r = _r(_h(`nsc-extension:${account.id}:${jur}:${i}`));
                const asset = assets[i % assets.length];
                const driver = drivers[Math.floor(r() * drivers.length)];
                const oosCount = r() < 0.18 ? 1 + Math.floor(r() * 2) : 0;
                const reqCount = r() < 0.35 ? 1 + Math.floor(r() * 2) : 0;
                const oosRows = Array.from({ length: oosCount }, () => ({ category: _pick(r, OOS_CATEGORIES), vehicleCounts: [] as (number | null)[] }));
                const reqRows = Array.from({ length: reqCount }, () => ({ category: _pick(r, REQ_CATEGORIES), vehicleCounts: [] as (number | null)[] }));
                const result = oosCount > 0 ? 'Out Of Service' : reqCount > 0 ? 'Requires Attention' : 'Passed';
                const driverName = `${driver.firstName ?? ''} ${driver.lastName ?? ''}`.trim();
                const date = _daysAgo(Math.floor(r() * 365));

                const rec: NscInspectionRecord = {
                    id: nextId++,
                    date,
                    doc: `NSC-${jur}-${(100000 + Math.floor(r() * 899999)).toString()}`,
                    jur,
                    plate: asset.plateNumber ?? '',
                    level: 1 + Math.floor(r() * 3),
                    result,
                    details: {
                        time: `${Math.floor(r() * 24).toString().padStart(2, '0')}:${Math.floor(r() * 60).toString().padStart(2, '0')}`,
                        dateEntered: date,
                        agency: jur === 'AB' ? 'Alberta Transportation' : jur === 'BC' ? 'BC Commercial Vehicle Safety' : jur === 'PE' ? 'PEI Highway Safety' : 'NS RCMP',
                        location: _pick(r, LOCATIONS_BY_JUR[jur]),
                        driver: driverName,
                        vehicles: [{
                            type: 'Power Unit',
                            plate: asset.plateNumber ?? '',
                            vin: asset.vin,
                            year: asset.year !== undefined ? String(asset.year) : undefined,
                            make: asset.make ?? 'Freightliner',
                            jur,
                        }],
                        oos: oosRows.map(o => o.category),
                        req: reqRows.map(o => o.category),
                        oosRows,
                        reqRows,
                    },
                    driverLink: {
                        driverId: driver.id,
                        driverName,
                        rawLicence: driver.licenseNumber,
                    },
                    primaryVehicle: {
                        assetId: asset.id,
                        unitNumber: asset.unitNumber,
                        plate: asset.plateNumber ?? '',
                        make: asset.make ?? 'Freightliner',
                        vin: asset.vin,
                        year: asset.year !== undefined ? String(asset.year) : undefined,
                        vehicleTypeCode: 'P',
                    },
                };
                NSC_INSPECTIONS.push(rec);
            }
        }
    }
}
