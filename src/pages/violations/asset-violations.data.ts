/**
 * Asset / Vehicle Inspection Violation Data
 *
 * These violations are issued against the VEHICLE (asset) — not the driver —
 * during FMCSA roadside inspections (Level I–VI) under:
 *   • 49 CFR Part 393 — Parts and Accessories Necessary for Safe Operation
 *   • 49 CFR Part 396 — Inspection, Repair, and Maintenance
 *   • 49 CFR Part 392 — Driving of Commercial Motor Vehicles (vehicle-related parts)
 *   • CTPAT / NSC Schedule 1 (Canada equivalent)
 *
 * OOS criteria: North American Standard Out-of-Service Criteria (NASOC)
 */

import { INITIAL_ASSETS } from "@/pages/assets/assets.data";
import { MOCK_DRIVERS } from "@/data/mock-app-data";

// ─── Inspection Category ───────────────────────────────────────────────────────

export type AssetViolationCategory =
  | 'Brake Systems'
  | 'Tires & Wheels'
  | 'Lighting & Electrical'
  | 'Steering & Suspension'
  | 'Cargo Securement'
  | 'Fuel System'
  | 'Exhaust System'
  | 'Frame & Body'
  | 'Coupling Devices'
  | 'Inspection Certificate'
  | 'Weight & Size'
  | 'Hazmat';

export type AssetViolationSeverity = 'Critical' | 'Serious' | 'Moderate';

// ─── Asset Inspection Violation Definition ─────────────────────────────────────

export interface AssetViolationDef {
  id: string;
  code: string;                       // CFR section, e.g. "393.45(b)(1)"
  description: string;                // Full plain-English description
  category: AssetViolationCategory;
  severity: AssetViolationSeverity;
  isOos: boolean;                     // North American OOS Criteria
  crashLikelihoodPercent: number;     // 0–100
  baseFine: number;                   // USD
}

// ─── Asset Inspection Violation Record (a specific incident) ───────────────────

export interface AssetViolationRecord {
  id: string;
  date: string;                       // ISO YYYY-MM-DD
  time: string;                       // HH:mm 24-hr
  inspectionLevel: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
  assetId: string;
  assetUnitNumber: string;
  assetType: string;
  assetMakeModel: string;
  assetPlate: string;
  locationState: string;
  locationCity?: string;
  locationStreet?: string;
  locationZip?: string;
  locationCountry?: string;
  location?: string;
  violationDefId: string;
  violationCode: string;
  violationType: string;
  violationCategory: AssetViolationCategory;
  severity: AssetViolationSeverity;
  isOos: boolean;
  crashLikelihoodPercent: number;
  result: 'Citation Issued' | 'Warning' | 'OOS Order' | 'Clean Inspection' | 'Under Review';
  fineAmount: number;
  expenseAmount: number;              // Repair costs + downtime logged
  currency: 'USD' | 'CAD';
  status: 'Open' | 'Closed' | 'Under Review';
  linkedDriverId?: string;
  linkedDriverName?: string;
  inspectorId?: string;
  inspectionId?: string;   // If set, this violation came from an inspection event
  notes?: string;
}

// ─── Violation Definitions Library ────────────────────────────────────────────

export const ASSET_VIOLATION_DEFS: AssetViolationDef[] = [
  // ── BRAKE SYSTEMS (Part 393.40–393.55, NASOC Brake Appendix) ──────────────
  {
    id: 'brk_001',
    code: '393.45(b)(1)',
    description: 'Brake hose/tubing chafed, worn through, or cracked',
    category: 'Brake Systems',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 88,
    baseFine: 1425,
  },
  {
    id: 'brk_002',
    code: '393.47(b)',
    description: 'Brake lining/pad worn below minimum thickness (≤25% remaining)',
    category: 'Brake Systems',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 92,
    baseFine: 1900,
  },
  {
    id: 'brk_003',
    code: '393.50(b)',
    description: 'Audible air leak in brake system',
    category: 'Brake Systems',
    severity: 'Serious',
    isOos: false,
    crashLikelihoodPercent: 61,
    baseFine: 850,
  },
  {
    id: 'brk_004',
    code: '393.52(a)',
    description: 'Defective/failed service brake — vehicle cannot stop within required distance',
    category: 'Brake Systems',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 95,
    baseFine: 2400,
  },
  {
    id: 'brk_005',
    code: '393.43(b)',
    description: 'Breakaway/emergency braking device non-functional on trailer',
    category: 'Brake Systems',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 85,
    baseFine: 1750,
  },

  // ── TIRES & WHEELS (Part 393.75) ──────────────────────────────────────────
  {
    id: 'tir_001',
    code: '393.75(a)(1)',
    description: 'Flat tire or audible air leak on any tire (except low-speed vehicles)',
    category: 'Tires & Wheels',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 79,
    baseFine: 950,
  },
  {
    id: 'tir_002',
    code: '393.75(b)',
    description: 'Tire tread depth below minimum — steer axle (< 4/32") or drive axle (< 2/32")',
    category: 'Tires & Wheels',
    severity: 'Serious',
    isOos: true,
    crashLikelihoodPercent: 74,
    baseFine: 725,
  },
  {
    id: 'tir_003',
    code: '393.75(e)',
    description: 'Tire has exposed cords / ply separation visible',
    category: 'Tires & Wheels',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 88,
    baseFine: 1100,
  },
  {
    id: 'tir_004',
    code: '393.75(h)',
    description: 'Regrooved/recut tire on steer axle of vehicle over 4,500 kg',
    category: 'Tires & Wheels',
    severity: 'Moderate',
    isOos: false,
    crashLikelihoodPercent: 45,
    baseFine: 475,
  },

  // ── LIGHTING & ELECTRICAL (Part 393.9–393.23) ─────────────────────────────
  {
    id: 'lit_001',
    code: '393.9(a)',
    description: 'No/inoperative headlamp(s) — required lighting not functional',
    category: 'Lighting & Electrical',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 68,
    baseFine: 600,
  },
  {
    id: 'lit_002',
    code: '393.11(a)',
    description: 'Brake lights inoperative or not visible',
    category: 'Lighting & Electrical',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 72,
    baseFine: 650,
  },
  {
    id: 'lit_003',
    code: '393.19(a)',
    description: 'Rear license plate lamp not functioning',
    category: 'Lighting & Electrical',
    severity: 'Moderate',
    isOos: false,
    crashLikelihoodPercent: 22,
    baseFine: 175,
  },
  {
    id: 'lit_004',
    code: '393.23(a)',
    description: 'Turn signal lamps not functioning — front or rear',
    category: 'Lighting & Electrical',
    severity: 'Serious',
    isOos: false,
    crashLikelihoodPercent: 55,
    baseFine: 425,
  },

  // ── STEERING & SUSPENSION (Part 393.200–393.213) ──────────────────────────
  {
    id: 'str_001',
    code: '393.209(b)',
    description: 'Steering column/shaft loose, damaged, or missing fasteners',
    category: 'Steering & Suspension',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 90,
    baseFine: 2100,
  },
  {
    id: 'str_002',
    code: '393.205(b)',
    description: 'Broken or cracked leaf spring — any axle',
    category: 'Steering & Suspension',
    severity: 'Serious',
    isOos: true,
    crashLikelihoodPercent: 76,
    baseFine: 1400,
  },

  // ── CARGO SECUREMENT (Part 393.100–393.136) ───────────────────────────────
  {
    id: 'crg_001',
    code: '393.102(a)(1)',
    description: 'Cargo not secured — tie-down aggregate working load limit insufficient',
    category: 'Cargo Securement',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 81,
    baseFine: 1600,
  },
  {
    id: 'crg_002',
    code: '393.104(f)',
    description: 'Damaged / defective tie-down device used for cargo securement',
    category: 'Cargo Securement',
    severity: 'Serious',
    isOos: false,
    crashLikelihoodPercent: 62,
    baseFine: 875,
  },
  {
    id: 'crg_003',
    code: '393.106(b)',
    description: 'Cargo obstructing view ahead or hazardous shifting likely',
    category: 'Cargo Securement',
    severity: 'Serious',
    isOos: true,
    crashLikelihoodPercent: 78,
    baseFine: 1250,
  },

  // ── FUEL SYSTEM (Part 393.65–393.69) ─────────────────────────────────────
  {
    id: 'fue_001',
    code: '393.67(c)(1)',
    description: 'Fuel leak from tank, line, or connection',
    category: 'Fuel System',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 83,
    baseFine: 1800,
  },

  // ── EXHAUST SYSTEM (Part 393.83) ─────────────────────────────────────────
  {
    id: 'exh_001',
    code: '393.83(g)',
    description: 'Exhaust system leaking — upstream of aftertreatment / cab vicinity',
    category: 'Exhaust System',
    severity: 'Serious',
    isOos: true,
    crashLikelihoodPercent: 58,
    baseFine: 775,
  },

  // ── FRAME & BODY (Part 393.199) ───────────────────────────────────────────
  {
    id: 'frm_001',
    code: '393.199',
    description: 'Frame rail cracked or broken — visibly damaged structurally',
    category: 'Frame & Body',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 87,
    baseFine: 2200,
  },

  // ── COUPLING DEVICES (Part 393.70–393.72) ─────────────────────────────────
  {
    id: 'cpl_001',
    code: '393.70(b)(3)',
    description: 'Fifth wheel/kingpin incomplete locking — trailer could separate',
    category: 'Coupling Devices',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 94,
    baseFine: 2600,
  },
  {
    id: 'cpl_002',
    code: '393.71(g)(3)',
    description: 'Safety chain/cable missing or improperly attached — towed unit',
    category: 'Coupling Devices',
    severity: 'Critical',
    isOos: true,
    crashLikelihoodPercent: 88,
    baseFine: 1950,
  },

  // ── ANNUAL INSPECTION CERTIFICATE (Part 396.17) ───────────────────────────
  {
    id: 'ins_001',
    code: '396.17(a)',
    description: 'Annual vehicle inspection not performed / certificate expired',
    category: 'Inspection Certificate',
    severity: 'Serious',
    isOos: true,
    crashLikelihoodPercent: 48,
    baseFine: 825,
  },
  {
    id: 'ins_002',
    code: '396.11(a)',
    description: 'Driver vehicle inspection report (DVIR) not completed / available',
    category: 'Inspection Certificate',
    severity: 'Moderate',
    isOos: false,
    crashLikelihoodPercent: 31,
    baseFine: 350,
  },

  // ── WEIGHT & SIZE (Part 658 / State regulations) ──────────────────────────
  {
    id: 'wgt_001',
    code: '658.17(e)',
    description: 'Gross vehicle weight exceeds federal bridge formula limit',
    category: 'Weight & Size',
    severity: 'Serious',
    isOos: false,
    crashLikelihoodPercent: 52,
    baseFine: 2800,
  },
  {
    id: 'wgt_002',
    code: '658.17(a)',
    description: 'Axle weight exceeds allowable limit on steer axle',
    category: 'Weight & Size',
    severity: 'Moderate',
    isOos: false,
    crashLikelihoodPercent: 44,
    baseFine: 1600,
  },
];

// Helper lookup
export function getAssetViolationDef(id: string): AssetViolationDef | undefined {
  return ASSET_VIOLATION_DEFS.find(d => d.id === id);
}

// ─── Mock Asset Inspection Violation Records ───────────────────────────────────

type InspectionScenario = [
  id: string,
  date: string,
  time: string,
  inspectionLevel: AssetViolationRecord['inspectionLevel'],
  assetId: string,
  defId: string,
  state: string,
  result: AssetViolationRecord['result'],
  fineAmount: number,
  expenseAmount: number,
  status: AssetViolationRecord['status'],
  linkedDriverId?: string,
  notes?: string,
];

const INSPECTION_SCENARIOS: InspectionScenario[] = [
  // ── TR-1049 Freightliner Cascadia ──────────────────────────────────────────
  [
    'AIV-2025-001', '2025-02-10', '08:15', 'I',
    'a1', 'brk_002', 'IL', 'OOS Order', 1900, 2400, 'Closed', 'DRV-2001',
    'Brake lining worn below OOS threshold on drive axle — vehicle placed OOS until repair confirmed',
  ],
  [
    'AIV-2024-001', '2024-09-18', '10:30', 'II',
    'a1', 'tir_001', 'TX', 'Citation Issued', 950, 650, 'Closed', 'DRV-2001',
    'Left rear steer tire found flat — tire replaced roadside',
  ],
  [
    'AIV-2024-002', '2024-04-02', '14:50', 'I',
    'a1', 'lit_002', 'IL', 'Warning', 0, 0, 'Closed', 'DRV-2002',
    'Right rear brake light bulb out — verbal warning, replaced immediately',
  ],

  // ── TR-2088 Kenworth T680 ────────────────────────────────────────────────
  [
    'AIV-2025-002', '2025-01-22', '07:00', 'I',
    'a2', 'cpl_001', 'GA', 'OOS Order', 2600, 1800, 'Open', undefined,
    'Fifth wheel locking jaw not fully engaged — trailer pulled 80 miles before detection at weigh station',
  ],
  [
    'AIV-2024-003', '2024-11-05', '16:40', 'II',
    'a2', 'crg_001', 'OH', 'Citation Issued', 1600, 0, 'Closed', 'DRV-2003',
    'Load of steel coils — insufficient number of chains, WLL less than cargo weight',
  ],
  [
    'AIV-2024-004', '2024-07-14', '11:15', 'II',
    'a2', 'ins_001', 'PA', 'Citation Issued', 825, 0, 'Closed', 'DRV-2002',
    'Annual inspection certificate expired 47 days prior — vehicle grounded until re-inspected',
  ],

  // ── TR-3055 Peterbilt 389 (Maintenance status) ────────────────────────────
  [
    'AIV-2024-005', '2024-02-28', '09:45', 'I',
    'a3', 'brk_004', 'NV', 'OOS Order', 2400, 3200, 'Closed', 'DRV-2001',
    'Service brakes failed performance test — stopping distance exceeded 110% of required',
  ],
  [
    'AIV-2023-001', '2023-10-11', '13:00', 'III',
    'a3', 'exh_001', 'NV', 'Citation Issued', 775, 900, 'Closed', undefined,
    'Exhaust leak detected at flex-pipe near cab — fumes detectable inside cab during idle',
  ],
  [
    'AIV-2023-002', '2023-05-30', '08:30', 'II',
    'a3', 'tir_002', 'AZ', 'Citation Issued', 725, 0, 'Closed', 'DRV-2003',
    'Drive axle tires at 1.5/32" — below 2/32" OOS threshold on both inside duals',
  ],

  // ── TR-4102 Chevrolet Silverado ───────────────────────────────────────────
  [
    'AIV-2024-006', '2024-10-03', '15:20', 'II',
    'a4', 'lit_004', 'AZ', 'Warning', 0, 0, 'Closed', 'DRV-2003',
    'Left front turn signal inoperative — repaired same day',
  ],
  [
    'AIV-2024-007', '2024-06-21', '08:00', 'IV',
    'a4', 'wgt_001', 'CA', 'Citation Issued', 2800, 0, 'Closed', 'DRV-2003',
    'GVW exceeded federal bridge formula by 4,200 lbs — load redistribution required',
  ],

  // ── TR-5200 Great Dane Reefer ─────────────────────────────────────────────
  [
    'AIV-2025-003', '2025-02-05', '06:45', 'I',
    'a5', 'crg_003', 'CA', 'OOS Order', 1250, 0, 'Open', undefined,
    'Refrigerated cargo not secured against forward movement — dry van rear doors damaged in previous stop',
  ],
  [
    'AIV-2024-008', '2024-12-18', '19:30', 'I',
    'a5', 'brk_001', 'CA', 'OOS Order', 1425, 2100, 'Closed', undefined,
    'Brake hose on rear trailer axle visibly cracked and weeping brake fluid — immediate OOS',
  ],
  [
    'AIV-2024-009', '2024-08-07', '11:00', 'II',
    'a5', 'cpl_002', 'OR', 'Citation Issued', 1950, 0, 'Closed', undefined,
    'Breakaway cable for reefer unit missing — safety chain adequate but cable absent',
  ],

  // ── TR-6001 Mack Granite (OOS status) ────────────────────────────────────
  [
    'AIV-2023-003', '2023-11-20', '14:00', 'I',
    'a6', 'frm_001', 'FL', 'OOS Order', 2200, 8500, 'Closed', 'DRV-2001',
    'Frame rail crack discovered at rear spring hanger — welded repair required, 11-day downtime',
  ],
  [
    'AIV-2023-004', '2023-07-04', '07:30', 'I',
    'a6', 'fue_001', 'FL', 'OOS Order', 1800, 1400, 'Closed', undefined,
    'Diesel fuel leak at primary fuel filter housing — pooling visible under vehicle',
  ],
  [
    'AIV-2022-001', '2022-09-14', '10:15', 'II',
    'a6', 'str_001', 'GA', 'OOS Order', 2100, 4200, 'Closed', undefined,
    'Steering column intermediate shaft u-joint cracked — vehicle removed from service',
  ],
];

function buildAssetViolationRecords(): AssetViolationRecord[] {
  const assetMap = new Map(INITIAL_ASSETS.map(a => [a.id, a]));
  const driverMap = new Map(MOCK_DRIVERS.map(d => [d.id, d]));
  const defMap = new Map(ASSET_VIOLATION_DEFS.map(d => [d.id, d]));
  const records: AssetViolationRecord[] = [];

  for (const [
    id, date, time, inspectionLevel, assetId, defId, state,
    result, fineAmount, expenseAmount, status, driverId, notes,
  ] of INSPECTION_SCENARIOS) {
    const asset = assetMap.get(assetId);
    const def = defMap.get(defId);
    if (!asset || !def) continue;

    records.push({
      id,
      date,
      time,
      inspectionLevel,
      assetId: asset.id,
      assetUnitNumber: asset.unitNumber,
      assetType: asset.assetType,
      assetMakeModel: `${asset.make} ${asset.model} ${asset.year}`,
      assetPlate: asset.plateNumber,
      locationState: state,
      locationCity: 'Unknown City',
      locationStreet: 'Inspection Site',
      locationZip: '00000',
      locationCountry: 'US',
      violationDefId: def.id,
      violationCode: def.code,
      violationType: def.description,
      violationCategory: def.category,
      severity: def.severity,
      isOos: def.isOos && result === 'OOS Order',
      crashLikelihoodPercent: def.crashLikelihoodPercent,
      result,
      fineAmount,
      expenseAmount,
      currency: 'USD',
      status,
      linkedDriverId: driverId,
      linkedDriverName: driverId ? driverMap.get(driverId)?.name : undefined,
      notes,
    });
  }

  // ── Auto-Generate Random Asset Records ──
  const VIOLATION_DEFS = ASSET_VIOLATION_DEFS;
  const DRIVERS = MOCK_DRIVERS;
  const CITIES = [
      { c: "Phoenix", s: "AZ" }, { c: "Sacramento", s: "CA" }, { c: "Denver", s: "CO" }, 
      { c: "Miami", s: "FL" }, { c: "Atlanta", s: "GA" }, { c: "Chicago", s: "IL" },
      { c: "Indianapolis", s: "IN" }, { c: "Des Moines", s: "IA" }, { c: "Kansas City", s: "KS" },
      { c: "Louisville", s: "KY" }, { c: "New Orleans", s: "LA" }, { c: "Detroit", s: "MI" },
      { c: "Minneapolis", s: "MN" }, { c: "St. Louis", s: "MO" }, { c: "Las Vegas", s: "NV" },
      { c: "Albuquerque", s: "NM" }, { c: "Columbus", s: "OH" }, { c: "Oklahoma City", s: "OK" },
      { c: "Portland", s: "OR" }, { c: "Philadelphia", s: "PA" }, { c: "Nashville", s: "TN" },
      { c: "Houston", s: "TX" }, { c: "Salt Lake City", s: "UT" }, { c: "Seattle", s: "WA" }
  ];

  for (let i = 0; i < 40; i++) {
      const asset = assetMap.get(INITIAL_ASSETS[i % INITIAL_ASSETS.length].id);
      const def = VIOLATION_DEFS[Math.floor(Math.random() * VIOLATION_DEFS.length)];
      const loc = CITIES[Math.floor(Math.random() * CITIES.length)];
      const driver = DRIVERS[Math.floor(Math.random() * DRIVERS.length)];
      
      if (!asset || !def) continue;

      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - Math.floor(Math.random() * 730));
      const dateStr = dateObj.toISOString().split('T')[0];
      const timeStr = `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
      
      const possibleResults: AssetViolationRecord['result'][] = ['Citation Issued', 'Warning', 'Clean Inspection', 'OOS Order'];
      const res = possibleResults[Math.floor(Math.random() * possibleResults.length)];
      const fine = (res === 'Citation Issued' || res === 'OOS Order') ? Math.floor(Math.random() * 2000) + 200 : 0;
      
      records.push({
          id: `A-AUTO-${2000 + i}`,
          date: dateStr,
          time: timeStr,
          inspectionLevel: Math.random() > 0.5 ? 'I' : 'II',
          assetId: asset.id,
          assetUnitNumber: asset.unitNumber,
          assetType: asset.assetType,
          assetMakeModel: `${asset.make} ${asset.model} ${asset.year}`,
          assetPlate: asset.plateNumber,
          locationState: loc.s,
          locationCity: loc.c,
          locationStreet: `I-${Math.floor(Math.random() * 99) + 1} MM ${Math.floor(Math.random() * 500)}`,
          locationZip: Math.floor(10000 + Math.random() * 90000).toString(),
          locationCountry: 'US',
          violationDefId: def.id,
          violationCode: def.code,
          violationType: def.description,
          violationCategory: def.category,
          severity: def.severity,
          isOos: def.isOos && res === 'OOS Order',
          crashLikelihoodPercent: def.crashLikelihoodPercent,
          result: res,
          fineAmount: fine,
          expenseAmount: 0, // Simplified
          currency: 'USD',
          status: Math.random() > 0.5 ? 'Closed' : 'Open',
          linkedDriverId: driver.id,
          linkedDriverName: driver.name,
      });
  }

  return records.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export const MOCK_ASSET_VIOLATION_RECORDS: AssetViolationRecord[] = buildAssetViolationRecords();
