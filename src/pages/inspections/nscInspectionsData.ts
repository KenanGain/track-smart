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
