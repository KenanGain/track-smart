// ═══════════════════════════════════════════════════════════════════════════
// Safety Analysis – Relational Data Layer
// ═══════════════════════════════════════════════════════════════════════════
// This file acts as the "database" for the Safety Analysis module.
// Every record uses `driverId` foreign keys that reference MOCK_DRIVERS.id,
// matching the same convention used by incidents.data.ts and inspectionsData.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { INCIDENTS } from '../incidents/incidents.data';
import { MOCK_DRIVERS } from '../../data/mock-app-data';

// ─── Types ───────────────────────────────────────────────────────────────

export interface FleetSafetyScores {
  fleetSafetyScore: number;
  fleetSafetyRating: 'Satisfactory' | 'Acceptable' | 'Conditional' | 'Unsatisfactory';
  accidentScore: number;
  eldScore: number;
  inspectionScore: number;
  driverScore: number;
  vedrScore: number;
  roadsideViolationScore: number;
}

export interface DriverSafetyScore {
  driverId: string;        // FK → MOCK_DRIVERS.id
  name: string;            // denormalized for display convenience
  licenseNumber: string;
  status: string;
  overall: number;
  accidents: number;
  eld: number;
  inspections: number;
  violations: number;
  trainings: number;
  vedr: number;
}

export interface DriverKeyIndicator {
  driverId: string;        // FK → MOCK_DRIVERS.id
  cellPhoneEvents: number;
  speedingEvents: number;
  followingDistanceEvents: number;
  seatBeltEvents: number;
  obstructedCameraEvents: number;
  status: 'PASS' | 'FAIL';
}

export interface EldVedrEvent {
  id: string;
  driverId: string;        // FK → MOCK_DRIVERS.id
  driverName: string;      // denormalized for display
  vehicleId: string;
  date: string;
  type: 'ELD' | 'VEDR';
  event: string;
  duration: string;
  status: 'Resolved' | 'Reviewed' | 'Open';
  details: string;
}

export interface IncidentStats {
  totalAccidents: number;
  totalCost: number;
  preventableCount: number;
  preventableRate: number;
  injuries: number;
  fatalities: number;
  activePowerUnits: number;
}

// ─── Fleet-Level Safety Scores ───────────────────────────────────────────

export const FLEET_SAFETY_SCORES: FleetSafetyScores = {
  fleetSafetyScore: 92.70,
  fleetSafetyRating: 'Acceptable',
  accidentScore: 71.88,
  eldScore: 100.00,
  inspectionScore: 100.00,
  driverScore: 85.09,
  vedrScore: 100.00,
  roadsideViolationScore: 99.26,
};

// ─── Incident Filters ────────────────────────────────────────────────────

export const INCIDENT_FILTER_TYPES = [
  'All Accidents',
  'Hazmat',
  'Tow Away',
  'Injuries',
  'Fatalities',
];

// ─── Computed Incident Statistics (from real INCIDENTS data) ──────────────

export const COMPUTED_INCIDENT_STATS: IncidentStats = {
  totalAccidents: INCIDENTS.length,
  totalCost: INCIDENTS.reduce((s, i) => s + i.costs.totalAccidentCosts, 0),
  preventableCount: INCIDENTS.filter(i => i.preventability.isPreventable === true).length,
  preventableRate: Math.round(
    (INCIDENTS.filter(i => i.preventability.isPreventable === true).length / INCIDENTS.length) * 100
  ),
  injuries: INCIDENTS.reduce((s, i) => s + i.severity.injuriesNonFatal, 0),
  fatalities: INCIDENTS.reduce((s, i) => s + i.severity.fatalities, 0),
  activePowerUnits: 8,
};

// ─── Driver Safety Scores ────────────────────────────────────────────────
// Linked by driverId to MOCK_DRIVERS. Scores reflect actual incident history
// (e.g. John Smith has lower accident score because he has 2 incidents).

const DRIVER_SCORE_MAP: Record<string, {
  overall: number; accidents: number; eld: number;
  inspections: number; violations: number; trainings: number; vedr: number;
}> = {
  'DRV-2001': { overall: 77.08, accidents: 62.50, eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // John Smith – 2 incidents
  'DRV-2002': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Sarah Miller
  'DRV-2003': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Mike Johnson
  'DRV-2004': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Elena Rodriguez
  'DRV-1001': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // James Sullivan
  'DRV-1002': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Maria Rodriguez
  'DRV-1003': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Robert Chen
  'DRV-1004': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Sarah Johnson
  'DRV-1005': { overall: 83.33, accidents: 100,   eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 },  // Michael Brown
};

const DEFAULT_SCORES = { overall: 83.33, accidents: 100, eld: 100, inspections: 100, violations: 100, trainings: 0, vedr: 100 };

export const DRIVER_SAFETY_SCORES: DriverSafetyScore[] = MOCK_DRIVERS.map((drv) => {
  const seed = DRIVER_SCORE_MAP[drv.id] || DEFAULT_SCORES;
  return {
    driverId: drv.id,
    name: drv.name,
    licenseNumber: drv.licenseNumber || '',
    status: drv.status,
    overall: seed.overall,
    accidents: seed.accidents,
    eld: seed.eld,
    inspections: seed.inspections,
    violations: seed.violations,
    trainings: seed.trainings,
    vedr: seed.vedr,
  };
});

// ─── Driver Key Indicator Events ─────────────────────────────────────────
// Monthly event counts per driver. All zeros currently – status is PASS.

export const DRIVER_KEY_INDICATORS: DriverKeyIndicator[] = MOCK_DRIVERS.map((drv) => ({
  driverId: drv.id,
  cellPhoneEvents: 0,
  speedingEvents: 0,
  followingDistanceEvents: 0,
  seatBeltEvents: 0,
  obstructedCameraEvents: 0,
  status: 'PASS' as const,
}));

// ─── ELD / VEDR Events ──────────────────────────────────────────────────
// Each event is linked to a driver by driverId (FK → MOCK_DRIVERS.id).
// driverName is denormalized for fast table rendering.

export const ELD_VEDR_EVENTS: EldVedrEvent[] = [
  {
    id: 'ELD-001',
    driverId: 'DRV-2001',
    driverName: 'John Smith',
    vehicleId: 'TR-1049',
    date: '2025-12-10',
    type: 'ELD',
    event: 'Malfunction',
    duration: '2h 15m',
    status: 'Resolved',
    details: 'GPS signal lost; re-established after truck restart.',
  },
  {
    id: 'ELD-002',
    driverId: 'DRV-1003',
    driverName: 'Robert Chen',
    vehicleId: 'TR-2188',
    date: '2025-11-28',
    type: 'VEDR',
    event: 'Harsh Braking',
    duration: '0m 3s',
    status: 'Reviewed',
    details: 'Sudden stop to avoid debris on highway.',
  },
  {
    id: 'ELD-003',
    driverId: 'DRV-1001',
    driverName: 'James Sullivan',
    vehicleId: 'TR-4456',
    date: '2025-11-15',
    type: 'ELD',
    event: 'Data Transfer Failure',
    duration: '4h 30m',
    status: 'Open',
    details: 'Monthly data transfer failed; retry scheduled.',
  },
  {
    id: 'ELD-004',
    driverId: 'DRV-2003',
    driverName: 'Mike Johnson',
    vehicleId: 'TR-3321',
    date: '2025-10-22',
    type: 'VEDR',
    event: 'Forward Collision Warning',
    duration: '0m 1s',
    status: 'Reviewed',
    details: 'ADAS triggered FCW approaching stopped traffic.',
  },
  {
    id: 'ELD-005',
    driverId: 'DRV-1004',
    driverName: 'Sarah Johnson',
    vehicleId: 'TR-5590',
    date: '2025-10-05',
    type: 'ELD',
    event: 'Unassigned Driving',
    duration: '0h 45m',
    status: 'Resolved',
    details: 'Driver forgot to log in; corrected after notification.',
  },
  {
    id: 'ELD-006',
    driverId: 'DRV-2004',
    driverName: 'Elena Rodriguez',
    vehicleId: 'TR-6623',
    date: '2025-09-18',
    type: 'VEDR',
    event: 'Speeding',
    duration: '5m 12s',
    status: 'Reviewed',
    details: 'Exceeded posted speed by 15 mph on I-75.',
  },
];

// ─── HOS Violation Events (actual ELD-detected HOS violations) ───────────

export interface HosViolationEvent {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  violationCode: string;
  violationDescription: string;
  violationGroup: string;
  driverSeverity: number;
  isOos: boolean;
  status: 'Open' | 'Resolved' | 'Reviewed' | 'Under Review';
}

export const HOS_VIOLATION_EVENTS: HosViolationEvent[] = [
  { id: 'HOS-001', driverId: 'DRV-2001', driverName: 'John Smith',      vehicleId: 'TR-1049', date: '2025-11-15', violationCode: '395.8',       violationDescription: 'No current record of duty status',             violationGroup: 'Logbook',          driverSeverity: 5, isOos: false, status: 'Resolved'     },
  { id: 'HOS-002', driverId: 'DRV-1003', driverName: 'Robert Chen',     vehicleId: 'TR-2188', date: '2025-10-28', violationCode: '395.3',       violationDescription: 'Failing to retain records of duty status',     violationGroup: 'Logbook',          driverSeverity: 5, isOos: false, status: 'Resolved'     },
  { id: 'HOS-003', driverId: 'DRV-1001', driverName: 'James Sullivan',  vehicleId: 'TR-4456', date: '2025-10-15', violationCode: '395.1(a)(1)', violationDescription: '11-hour driving limit exceeded',               violationGroup: 'Hours of Service', driverSeverity: 7, isOos: true,  status: 'Under Review' },
  { id: 'HOS-004', driverId: 'DRV-2003', driverName: 'Mike Johnson',    vehicleId: 'TR-3321', date: '2025-09-22', violationCode: '395.1(a)(2)', violationDescription: '14-hour on-duty driving window exceeded',      violationGroup: 'Hours of Service', driverSeverity: 7, isOos: true,  status: 'Resolved'     },
  { id: 'HOS-005', driverId: 'DRV-1004', driverName: 'Sarah Johnson',   vehicleId: 'TR-5590', date: '2025-09-05', violationCode: '395.8(e)(1)', violationDescription: 'ELD malfunctioned — no paper logs provided',   violationGroup: 'ELD Compliance',  driverSeverity: 5, isOos: false, status: 'Resolved'     },
  { id: 'HOS-006', driverId: 'DRV-2004', driverName: 'Elena Rodriguez', vehicleId: 'TR-6623', date: '2025-08-18', violationCode: '395.1(d)',    violationDescription: '10-hour consecutive rest requirement not met', violationGroup: 'Rest Requirements',driverSeverity: 7, isOos: true,  status: 'Resolved'     },
  { id: 'HOS-007', driverId: 'DRV-1002', driverName: 'Maria Rodriguez', vehicleId: 'TR-2088', date: '2025-07-30', violationCode: '395.8(f)(1)', violationDescription: 'ELD data transfer failure — non-compliant',    violationGroup: 'ELD Compliance',  driverSeverity: 5, isOos: false, status: 'Resolved'     },
  { id: 'HOS-008', driverId: 'DRV-1005', driverName: 'Michael Brown',   vehicleId: 'TR-7044', date: '2025-07-10', violationCode: '395.1(f)(1)', violationDescription: '70-hour/8-day driving limit exceeded',         violationGroup: 'Hours of Service', driverSeverity: 7, isOos: true,  status: 'Open'         },
  { id: 'HOS-009', driverId: 'DRV-2002', driverName: 'Sarah Miller',    vehicleId: 'TR-3055', date: '2025-06-25', violationCode: '395.8(a)(1)', violationDescription: 'Required ELD information missing from record',  violationGroup: 'ELD Compliance',  driverSeverity: 5, isOos: false, status: 'Resolved'     },
  { id: 'HOS-010', driverId: 'DRV-2001', driverName: 'John Smith',      vehicleId: 'TR-1049', date: '2025-05-14', violationCode: '395.1(b)',    violationDescription: '34-hour restart provisions violated',          violationGroup: 'Hours of Service', driverSeverity: 5, isOos: false, status: 'Resolved'     },
];

// ─── VEDR Violation Events (actual VEDR-detected violations) ─────────────

export interface VedrViolationEvent {
  id: string;
  driverId: string;
  driverName: string;
  vehicleId: string;
  date: string;
  violationCode: string;
  violationDescription: string;
  violationGroup: string;
  category: 'Driver Fitness' | 'Unsafe Driving';
  driverSeverity: number;
  isOos: boolean;
  telematicsTags: string[];
  status: 'Open' | 'Resolved' | 'Reviewed' | 'Under Review';
}

export const VEDR_VIOLATION_EVENTS: VedrViolationEvent[] = [
  { id: 'VEDR-001', driverId: 'DRV-2001', driverName: 'John Smith',      vehicleId: 'TR-1049', date: '2025-12-01', violationCode: '392.2S',      violationDescription: 'Speeding',                               violationGroup: 'Speed Related',             category: 'Unsafe Driving',  driverSeverity: 6,  isOos: false, telematicsTags: ['speeding'],                   status: 'Resolved'     },
  { id: 'VEDR-002', driverId: 'DRV-1003', driverName: 'Robert Chen',     vehicleId: 'TR-2188', date: '2025-11-20', violationCode: '392.16',      violationDescription: 'Failing to use seat belt',              violationGroup: 'Seat Belt',                 category: 'Unsafe Driving',  driverSeverity: 6,  isOos: false, telematicsTags: ['seat_belt_violation'],        status: 'Reviewed'     },
  { id: 'VEDR-003', driverId: 'DRV-1001', driverName: 'James Sullivan',  vehicleId: 'TR-4456', date: '2025-11-10', violationCode: '392.80',      violationDescription: 'Using hand-held mobile telephone',      violationGroup: 'Cell Phone Use',            category: 'Unsafe Driving',  driverSeverity: 10, isOos: true,  telematicsTags: ['cell_phone', 'distracted'],   status: 'Under Review' },
  { id: 'VEDR-004', driverId: 'DRV-2003', driverName: 'Mike Johnson',    vehicleId: 'TR-3321', date: '2025-10-28', violationCode: '391.11(b)(1)','violationDescription': 'Driver not qualified — failed physical',violationGroup: 'Driver Qualification',      category: 'Driver Fitness',  driverSeverity: 10, isOos: true,  telematicsTags: [],                             status: 'Open'         },
  { id: 'VEDR-005', driverId: 'DRV-1004', driverName: 'Sarah Johnson',   vehicleId: 'TR-5590', date: '2025-10-05', violationCode: '392.3',       violationDescription: 'Ill or fatigued operator',              violationGroup: 'Ill/Fatigued Driver',       category: 'Unsafe Driving',  driverSeverity: 7,  isOos: true,  telematicsTags: ['drowsiness'],                 status: 'Resolved'     },
  { id: 'VEDR-006', driverId: 'DRV-2004', driverName: 'Elena Rodriguez', vehicleId: 'TR-6623', date: '2025-09-18', violationCode: '392.2FC',     violationDescription: 'Following too closely',                 violationGroup: 'Following Distance',        category: 'Unsafe Driving',  driverSeverity: 5,  isOos: false, telematicsTags: ['tailgating', 'near_crash'],   status: 'Resolved'     },
  { id: 'VEDR-007', driverId: 'DRV-1002', driverName: 'Maria Rodriguez', vehicleId: 'TR-2088', date: '2025-08-25', violationCode: '391.41(b)(1)','violationDescription': 'Driver not medically certified',       violationGroup: 'Physical Qualifications',   category: 'Driver Fitness',  driverSeverity: 10, isOos: true,  telematicsTags: [],                             status: 'Resolved'     },
  { id: 'VEDR-008', driverId: 'DRV-1005', driverName: 'Michael Brown',   vehicleId: 'TR-7044', date: '2025-08-10', violationCode: '392.82',      violationDescription: 'Texting while driving',                 violationGroup: 'Cell Phone Use',            category: 'Unsafe Driving',  driverSeverity: 10, isOos: true,  telematicsTags: ['cell_phone'],                 status: 'Resolved'     },
  { id: 'VEDR-009', driverId: 'DRV-2002', driverName: 'Sarah Miller',    vehicleId: 'TR-3055', date: '2025-07-22', violationCode: '392.2R',      violationDescription: 'Reckless driving — improper lane change',violationGroup: 'Reckless/Erratic Driving',  category: 'Unsafe Driving',  driverSeverity: 7,  isOos: false, telematicsTags: ['harsh_turn', 'unsafe_lane_change'], status: 'Resolved' },
  { id: 'VEDR-010', driverId: 'DRV-1003', driverName: 'Robert Chen',     vehicleId: 'TR-2188', date: '2025-06-30', violationCode: '391.21',      violationDescription: 'Failing to file annual review of driving record', violationGroup: 'Licensing', category: 'Driver Fitness',  driverSeverity: 5,  isOos: false, telematicsTags: [],                             status: 'Resolved'     },
];

// ─── Computed Fleet-Wide Aggregates ──────────────────────────────────────

export const FLEET_AVERAGE =
  DRIVER_SAFETY_SCORES.reduce((s, d) => s + d.overall, 0) / DRIVER_SAFETY_SCORES.length;

export const LOWEST_DRIVERS = DRIVER_SAFETY_SCORES
  .filter(d => d.overall <= FLEET_AVERAGE)
  .sort((a, b) => a.overall - b.overall);

export const HIGHEST_DRIVERS = DRIVER_SAFETY_SCORES
  .filter(d => d.overall > FLEET_AVERAGE)
  .sort((a, b) => b.overall - a.overall);

export const NUM_ACTIVE_DRIVERS = MOCK_DRIVERS.filter(d => d.status === 'Active').length;

// ─── Lookup Helpers ──────────────────────────────────────────────────────

/** Resolve a driverId to the driver's full name from MOCK_DRIVERS */
export function getDriverName(driverId: string): string {
  return MOCK_DRIVERS.find(d => d.id === driverId)?.name ?? 'Unknown';
}

/** Get key indicators for a specific driver */
export function getDriverKeyIndicators(driverId: string): DriverKeyIndicator | undefined {
  return DRIVER_KEY_INDICATORS.find(ki => ki.driverId === driverId);
}

/** Get safety scores for a specific driver */
export function getDriverSafetyScore(driverId: string): DriverSafetyScore | undefined {
  return DRIVER_SAFETY_SCORES.find(ds => ds.driverId === driverId);
}
