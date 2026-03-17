// ═══════════════════════════════════════════════════════════════════════════
// Safety Analysis – Relational Data Layer
// ═══════════════════════════════════════════════════════════════════════════
// This file acts as the "database" for the Safety Analysis module.
// Every record uses `driverId` foreign keys that reference MOCK_DRIVERS.id,
// matching the same convention used by incidents.data.ts and inspectionsData.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { INCIDENTS } from '../incidents/incidents.data';
import { MOCK_DRIVERS } from '../../data/mock-app-data';
import { type SafetySettings } from './safetySettings';

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
  // Satisfactory (≥90) — top performers
  'DRV-1001': { overall: 93.5, accidents: 96, eld: 98,  inspections: 95,  violations: 92,  trainings: 88, vedr: 91 },  // James Sullivan
  'DRV-1002': { overall: 91.2, accidents: 94, eld: 95,  inspections: 92,  violations: 90,  trainings: 85, vedr: 89 },  // Maria Rodriguez
  // Acceptable (80–89) — good standing
  'DRV-2002': { overall: 86.4, accidents: 88, eld: 90,  inspections: 85,  violations: 84,  trainings: 80, vedr: 87 },  // Sarah Miller
  'DRV-2003': { overall: 84.1, accidents: 85, eld: 87,  inspections: 82,  violations: 80,  trainings: 78, vedr: 86 },  // Mike Johnson
  'DRV-1004': { overall: 82.7, accidents: 84, eld: 86,  inspections: 80,  violations: 78,  trainings: 75, vedr: 84 },  // Sarah Johnson
  'DRV-2004': { overall: 80.5, accidents: 82, eld: 83,  inspections: 79,  violations: 76,  trainings: 72, vedr: 81 },  // Elena Rodriguez
  // Conditional (70–79) — needs monitoring
  'DRV-2001': { overall: 74.6, accidents: 62, eld: 79,  inspections: 71,  violations: 68,  trainings: 65, vedr: 72 },  // John Smith – incidents
  'DRV-1003': { overall: 71.3, accidents: 70, eld: 68,  inspections: 72,  violations: 65,  trainings: 60, vedr: 70 },  // Robert Chen
  // Unsatisfactory (<70) — intervention required
  'DRV-1005': { overall: 58.9, accidents: 45, eld: 55,  inspections: 60,  violations: 50,  trainings: 40, vedr: 55 },  // Michael Brown
};

const DEFAULT_SCORES = { overall: 83.33, accidents: 85, eld: 88, inspections: 82, violations: 80, trainings: 75, vedr: 84 };

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

// ─── Enhanced Calculation Helpers ─────────────────────────────────────────

/** Exposure-normalized rates */
export function computeExposureRates(
  totalDrivers: number,
  totalInspections: number,
  totalMiles: number,
  oosCount: number,
  accidentCount: number,
) {
  const per10kMi = totalMiles > 0 ? (accidentCount / totalMiles) * 10000 : 0;
  const per100Insp = totalInspections > 0 ? (oosCount / totalInspections) * 100 : 0;
  const accidentRatePer10k = Math.round(per10kMi * 100) / 100;
  const oosRatePer100 = Math.round(per100Insp * 100) / 100;
  return { accidentRatePer10k, oosRatePer100, totalMiles, totalInspections, totalDrivers };
}

/** Data confidence level — based on inspection/event count for a driver */
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export function computeConfidenceLevel(
  driverId: string,
  inspectionCount: number,
  eventCount: number,
): ConfidenceLevel {
  void driverId; // used for signature clarity
  if (inspectionCount >= 5 && eventCount >= 3) return 'high';
  if (inspectionCount >= 2 || eventCount >= 1) return 'medium';
  return 'low';
}

/** Contribution breakdown — how each component shifts a driver's total score */
export interface ContributionItem {
  component: string;
  score: number;
  weight: number;
  weightedContrib: number;
  deltaFromFleetAvg: number;
}
export function computeContributionBreakdown(drv: DriverSafetyScore): ContributionItem[] {
  const components: { key: keyof DriverSafetyScore; label: string; weight: number }[] = [
    { key: 'accidents',   label: 'Accidents',    weight: 0.25 },
    { key: 'eld',         label: 'ELD / HOS',    weight: 0.15 },
    { key: 'inspections', label: 'Inspections',  weight: 0.15 },
    { key: 'violations',  label: 'Violations',   weight: 0.15 },
    { key: 'vedr',        label: 'Camera / VEDR', weight: 0.15 },
    { key: 'trainings',   label: 'Training',     weight: 0.15 },
  ];
  return components.map(c => {
    const score = drv[c.key] as number;
    const weightedContrib = score * c.weight;
    const fleetAvgComponent = DRIVER_SAFETY_SCORES.reduce((s, d) => s + (d[c.key] as number), 0) / DRIVER_SAFETY_SCORES.length;
    return {
      component: c.label,
      score,
      weight: c.weight,
      weightedContrib,
      deltaFromFleetAvg: Math.round((score - fleetAvgComponent) * 100) / 100,
    };
  });
}

/** Rolling window comparison — current period vs previous period */
export interface RollingComparison {
  currentScore: number;
  previousScore: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
}
export function computeRollingComparison(
  allEvents: { date: string; severity?: number }[],
  windowDays: number = 90,
): RollingComparison {
  const now = new Date();
  const cutoffCurrent = new Date(now.getTime() - windowDays * 86400000);
  const cutoffPrevious = new Date(cutoffCurrent.getTime() - windowDays * 86400000);

  const currentEvents = allEvents.filter(e => {
    const d = new Date(e.date);
    return d >= cutoffCurrent && d <= now;
  });
  const previousEvents = allEvents.filter(e => {
    const d = new Date(e.date);
    return d >= cutoffPrevious && d < cutoffCurrent;
  });

  // Score = 100 - (weighted severity sum / max)  — simulated scoring
  const score = (events: typeof allEvents) => {
    if (events.length === 0) return 100;
    const totalSev = events.reduce((s, e) => s + (e.severity ?? 5), 0);
    return Math.max(0, Math.min(100, 100 - totalSev));
  };

  const currentScore = score(currentEvents);
  const previousScore = score(previousEvents);
  const delta = Math.round((currentScore - previousScore) * 100) / 100;

  return {
    currentScore,
    previousScore,
    delta,
    direction: delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat',
  };
}

/** Percentile rank — where a score sits relative to all peers */
export function computePercentileRank(score: number, allScores: number[]): number {
  if (allScores.length === 0) return 50;
  const sorted = [...allScores].sort((a, b) => a - b);
  const belowCount = sorted.filter(s => s < score).length;
  return Math.round((belowCount / sorted.length) * 100);
}

/** Monthly trend data for charts */
export interface TrendPoint { month: string; score: number; label: string; }
export function computeTrendData(baseScore: number, monthsBack: number = 12): TrendPoint[] {
  const result: TrendPoint[] = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    // Simulate slight monthly variation around base score
    const seed = (d.getMonth() + 1) * 7 + d.getFullYear();
    const variation = ((seed % 13) - 6) * 0.8; // ±~5 points
    const score = Math.max(30, Math.min(100, baseScore + variation));
    result.push({ month: monthLabel, score: Math.round(score * 10) / 10, label: monthLabel });
  }
  return result;
}

/** Intervention priority list — who needs attention now */
export interface InterventionItem {
  driverId: string;
  name: string;
  score: number;
  reason: string;
  priority: 'critical' | 'high' | 'medium';
  delta30d: number;
  recentOOS: number;
}
/**
 * Returns drivers needing intervention.
 * @param threshold  score below which a driver is flagged (defaults to 70; pass settings.criticalAlert)
 * @param scoreDropThreshold  minimum score drop in 30 days to trigger alert (defaults to 5; pass settings.scoreDropAlert)
 */
export function getInterventionList(threshold = 70, scoreDropThreshold = 5): InterventionItem[] {
  const hosOosByDriver = HOS_VIOLATION_EVENTS
    .filter(e => e.isOos)
    .reduce<Record<string, number>>((acc, e) => { acc[e.driverId] = (acc[e.driverId] ?? 0) + 1; return acc; }, {});
  const vedrOosByDriver = VEDR_VIOLATION_EVENTS
    .filter(e => e.isOos)
    .reduce<Record<string, number>>((acc, e) => { acc[e.driverId] = (acc[e.driverId] ?? 0) + 1; return acc; }, {});

  return DRIVER_SAFETY_SCORES
    .map(drv => {
      const oos = (hosOosByDriver[drv.driverId] ?? 0) + (vedrOosByDriver[drv.driverId] ?? 0);
      const seed = drv.driverId.charCodeAt(drv.driverId.length - 1);
      const delta30d = ((seed % 11) - 5) * 1.5;
      const adjustedScore = drv.overall + delta30d;

      let reason = '';
      let priority: 'critical' | 'high' | 'medium' = 'medium';

      if (adjustedScore < threshold && oos > 0) {
        reason = `Score ${adjustedScore.toFixed(0)}% with ${oos} OOS violation${oos > 1 ? 's' : ''}`;
        priority = 'critical';
      } else if (adjustedScore < threshold) {
        reason = `Score below ${threshold}% (${adjustedScore.toFixed(0)}%)`;
        priority = 'high';
      } else if (delta30d < -scoreDropThreshold) {
        reason = `Score dropped ${Math.abs(delta30d).toFixed(1)} pts in 30 days`;
        priority = 'high';
      } else if (oos > 0) {
        reason = `${oos} OOS violation${oos > 1 ? 's' : ''} on record`;
        priority = 'medium';
      } else {
        return null;
      }

      return {
        driverId: drv.driverId,
        name: drv.name,
        score: Math.round(adjustedScore * 10) / 10,
        reason,
        priority,
        delta30d: Math.round(delta30d * 10) / 10,
        recentOOS: oos,
      };
    })
    .filter((item): item is InterventionItem => item !== null)
    .sort((a, b) => {
      const prio = { critical: 0, high: 1, medium: 2 };
      return prio[a.priority] - prio[b.priority] || a.score - b.score;
    });
}

/** Score band distribution */
export interface ScoreBandDistribution {
  band: string;
  range: string;
  count: number;
  pct: number;
  color: string;
  bgColor: string;
}

/**
 * Compute score band distribution.
 * @param scores   Array of numeric scores to bucket
 * @param settings Optional SafetySettings — when provided, uses threshExcellent/Good/Fair for band boundaries.
 *                 Falls back to 90/80/70 defaults when omitted (backward compatible).
 */
export function computeScoreBandDistribution(
  scores: number[],
  settings?: Pick<SafetySettings, 'threshExcellent' | 'threshGood' | 'threshFair'>
): ScoreBandDistribution[] {
  const total = scores.length || 1;
  const e = settings?.threshExcellent ?? 90;
  const g = settings?.threshGood      ?? 80;
  const f = settings?.threshFair      ?? 70;
  const bands = [
    { band: 'Excellent', range: `${e}+`,       color: 'text-emerald-700', bgColor: 'bg-emerald-500', min: e, max: 101 },
    { band: 'Good',      range: `${g}–${e-1}`, color: 'text-blue-700',    bgColor: 'bg-blue-500',    min: g, max: e },
    { band: 'Fair',      range: `${f}–${g-1}`, color: 'text-amber-700',   bgColor: 'bg-amber-500',   min: f, max: g },
    { band: 'Poor',      range: `<${f}`,        color: 'text-red-700',     bgColor: 'bg-red-500',     min: 0, max: f },
  ];
  return bands.map(b => {
    const count = scores.filter(s => s >= b.min && s < b.max).length;
    return { band: b.band, range: b.range, count, pct: Math.round((count / total) * 100), color: b.color, bgColor: b.bgColor };
  });
}

/** Component score formulas — human-readable descriptions */
export const SCORE_FORMULAS: Record<string, string> = {
  'Fleet Safety Score': '(Accidents×25% + ELD×15% + Inspections×15% + Violations×15% + VEDR×15% + Training×15%) with recency + severity weighting',
  'Accidents': '100 − (preventable_count × 12.5 per incident) with severity multipliers (fatal ×3, injury ×2, tow ×1.5)',
  'ELD / HOS': '100 − (hos_violations × severity_weight), OOS violations ×2 multiplier',
  'Inspections': '100 − ((failed_inspections / total_inspections) × 100) adjusted by jurisdiction',
  'Violations': '100 − (violation_severity_sum / max_possible) × 100',
  'Camera / VEDR': '100 − (vedr_events × event_severity), critical events ×2',
  'Training': '(completed_trainings / required_trainings) × 100',
};
