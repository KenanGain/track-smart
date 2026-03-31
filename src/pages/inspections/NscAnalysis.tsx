import { Fragment, useState } from 'react';
import {
  Info, ChevronDown, ChevronUp, ShieldAlert, MapPin, Building2, User, Truck,
} from 'lucide-react';
import { NSC_CODE_TO_SYSTEM } from './nscViolationMap';

// ── Types ────────────────────────────────────────────────────────────────────

export type NscPeriod = '1M' | '3M' | '6M' | '12M' | '24M';

interface AccordionSection {
  id: string; title: string;
  contribution?: string; status?: string; subtitle?: string;
}
interface CollisionRow {
  id: number; date: string; doc: string; jur: string; plate: string;
  status: string; result: string; severity: string; points: number;
  driver: string; time: string; driverLic: string; location: string;
  vin: string; entered: string; severityColor: string;
}
interface CollisionSummaryRow { severity: string; supported: number; notSupported: number; total: number; points: number; }
interface ConvictionSummaryRow { group: string; count: number; percent: string; }
interface ViolationSummaryRow { group: string; count: number; percent: string; }
interface ViolationDetailRow {
  id: number;
  date: string;
  time: string;
  document: string;
  jurisdiction: string;
  dateEntered: string;
  issuingAgency: string;
  location: string;
  vehicle: string;
  driver: string;
  commodity: string;
  actSection: string;
  ccmtaCode: string;
  text: string;
  detailNumber: number;
  description: string;
  severity?: 'Minor' | 'Major' | 'OOS';
}
interface ConvictionDetailRow {
  id: number; date: string; doc: string; docket: string; jur: string;
  vehicle: string; driver: string; description: string; points: number;
  time: string; location: string; entered: string; convictionDate: string; ccmta: string;
}
interface CvsaSummaryRow { desc: string; oos: number | null; req: number | null; total: number | null; percent: string | null; }
export interface CvsaDefectRow { category: string; vehicleCounts: Array<number | null>; }
export interface CvsaVehicle { type: string; plate: string; vin?: string; year?: string; make: string; jur?: string; decal?: string; }
export interface CvsaDetails {
  time: string;
  dateEntered: string;
  agency: string;
  location: string;
  driver: string;
  vehicles: CvsaVehicle[];
  oos: string[];
  req: string[];
  oosRows?: CvsaDefectRow[];
  reqRows?: CvsaDefectRow[];
}
export interface CvsaRow { id: number; date: string; doc: string; jur: string; plate: string; level: number; result: string; details?: CvsaDetails; }
interface MonitoringTrendRow {
  monthEnd: string;
  type: string;
  trkPercent: string;
  busPercent: string;
  avgFleet: string;
  currentFleet: string;
  score: string;
  convictionPercent: string;
  adminPercent: string;
  collisionPercent: string;
  inspectionPercent: string;
  stage?: string;
}
interface MonitoringThresholdRow {
  stage: string;
  threshold: string;
}
interface MonitoringDetailRow {
  monthEnd: string;
  avgFleetSize: string;
  convictionPtsPerVeh: string;
  adminPenaltyPtsPerVeh: string;
  collisionPtsPerVeh: string;
  cvsaPtsPerVeh: string;
  totalInspections: string;
  oosDefectPerInspection: string;
  totalDefectPerInspection: string;
  oosPercent: string;
  oosPerVehicle: string;
}
interface SafetyCertificateRow {
  id: number;
  certificateNumber: string;
  effectiveDate: string;
  expiryDate: string;
  issueDate: string;
  cancelDate: string;
  event: string;
  status: string;
}
interface SafetyRatingRow {
  id: number;
  effectiveDate: string;
  expiryDate: string;
  description: string;
}
interface OperatingStatusRow {
  id: number;
  effectiveDate: string;
  expiryDate: string;
  description: string;
}
interface SafetyConditionRow {
  id: number;
  effectiveDate: string;
  expiryDate: string;
  dateDue: string;
  completedDate: string;
  description: string;
}
interface HistoricalSummaryRow {
  date: string;
  type: string;
  jurisdiction: string;
  description: string;
  sortTimestamp: number;
}
interface AccordionSectionMeta {
  subtitle: string;
  summaryLabel: string;
  summaryValue: string;
  badgeLabel?: string;
  badgeTone?: 'green' | 'blue' | 'amber' | 'slate';
}

// ── Static data ───────────────────────────────────────────────────────────────


const accordionSections: AccordionSection[] = [
  { id: 'CONVICTION ANALYSIS', title: 'CONVICTION ANALYSIS', contribution: '34.60%', status: 'OK', subtitle: '5 events | View Offence History' },
  { id: 'CVSA INSPECTION ANALYSIS', title: 'CVSA INSPECTION ANALYSIS', contribution: '32.30%', status: 'OK', subtitle: '43 events | 19 Pass, 7 Req. Attn, 17 OOS' },
  { id: 'COLLISION SUMMARY', title: 'COLLISION SUMMARY', contribution: '33.10%', status: 'OK', subtitle: '6 events | 4 Damage, 2 Injury' },
  { id: 'VIOLATION ANALYSIS', title: 'VIOLATION ANALYSIS' },
  { id: 'MONITORING SUMMARY', title: 'MONITORING SUMMARY' },
  { id: 'SAFETY FITNESS INFORMATION', title: 'SAFETY FITNESS INFORMATION' },
  { id: 'HISTORICAL SUMMARY', title: 'HISTORICAL SUMMARY' },
];

export const collisionData: CollisionRow[] = [
  { id: 1, date: '2024 APR 04', doc: 'NB2060948', jur: 'NB', plate: '0AU350 AB', status: 'Not Reviewed', result: '-', severity: 'Damage', points: 2, driver: 'QADIR GHULAM', time: '00:00', driverLic: 'Q01032820810405 ON', location: 'NB', vin: '3AKJHHDR8NSMX1157', entered: '2024 APR 16', severityColor: 'bg-slate-100 text-slate-700' },
  { id: 2, date: '2024 MAR 22', doc: 'NB2060733', jur: 'NB', plate: '0AP012 AB', status: 'Not Reviewed', result: '-', severity: 'Damage', points: 2, driver: 'TEGBARU YOHANES YONATAN', time: '00:00', driverLic: 'T22187909910531 ON', location: 'NB', vin: '1FUJHHDR9MLMD4298', entered: '2024 APR 02', severityColor: 'bg-slate-100 text-slate-700' },
  { id: 3, date: '2023 AUG 23', doc: '32112732', jur: 'ON', plate: 'A41990 AB', status: 'Reviewed', result: 'Supported', severity: 'Injury', points: 0, driver: 'PARMINDER SINGH', time: '00:00', driverLic: 'P06320000990826 ON', location: 'MISSISSAUGA,403', vin: '3AKJHHDRXKSKA3234', entered: '2023 OCT 18', severityColor: 'bg-orange-100 text-orange-800' },
  { id: 4, date: '2023 JAN 26', doc: '31452122', jur: 'ON', plate: 'A80357 AB', status: 'Not Reviewed', result: '-', severity: 'Injury', points: 0, driver: 'HARMAN PREET SINGH', time: '00:00', driverLic: 'S44903157000210 ON', location: 'HWY 401 OSHAWA', vin: '4V4NC9EHXKN872373', entered: '2023 FEB 07', severityColor: 'bg-orange-100 text-orange-800' },
  { id: 5, date: '2023 JAN 14', doc: '31462069', jur: 'ON', plate: 'A49908 AB', status: 'Not Reviewed', result: '-', severity: 'Damage', points: 0, driver: 'PARAMPREET SINGH BAJWA', time: '00:00', driverLic: 'B02096168930116 ON', location: 'HAMILTON,403', vin: '3AKJHHDR4JSJZ9815', entered: '2023 FEB 14', severityColor: 'bg-slate-100 text-slate-700' },
  { id: 6, date: '2022 DEC 09', doc: '403152212090005', jur: 'QC', plate: 'A49908 AB', status: 'Not Reviewed', result: '-', severity: 'Damage', points: 0, driver: 'UNKNOWN', time: '00:00', driverLic: '-', location: 'SAINTE-JULIE', vin: '3AKJHHDR4JSJZ9815', entered: '2022 DEC 27', severityColor: 'bg-slate-100 text-slate-700' },
];

export const collisionSummaryData: CollisionSummaryRow[] = [
  {
    severity: 'Property Damage',
    supported: collisionData.filter((row) => row.severity === 'Damage' && row.result === 'Supported').length,
    notSupported: collisionData.filter((row) => row.severity === 'Damage' && row.result !== 'Supported').length,
    total: collisionData.filter((row) => row.severity === 'Damage').length,
    points: collisionData.filter((row) => row.severity === 'Damage').reduce((sum, row) => sum + row.points, 0),
  },
  {
    severity: 'Injury',
    supported: collisionData.filter((row) => row.severity === 'Injury' && row.result === 'Supported').length,
    notSupported: collisionData.filter((row) => row.severity === 'Injury' && row.result !== 'Supported').length,
    total: collisionData.filter((row) => row.severity === 'Injury').length,
    points: collisionData.filter((row) => row.severity === 'Injury').reduce((sum, row) => sum + row.points, 0),
  },
  {
    severity: 'Fatal',
    supported: 0,
    notSupported: 0,
    total: 0,
    points: 0,
  },
];

const convictionSummaryData: ConvictionSummaryRow[] = [
  { group: 'Speeding', count: 0, percent: '0.0%' },
  { group: 'Stop signs/Traffic lights', count: 0, percent: '0.0%' },
  { group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)', count: 2, percent: '40.0%' },
  { group: 'Driving (Passing, Disobey Signs, Signals, etc.)', count: 1, percent: '20.0%' },
  { group: 'Hours of Service', count: 0, percent: '0.0%' },
  { group: 'Trip Inspections', count: 0, percent: '0.0%' },
  { group: 'Brakes', count: 0, percent: '0.0%' },
  { group: 'CVIP', count: 2, percent: '40.0%' },
  { group: 'Mechanical Defects', count: 0, percent: '0.0%' },
  { group: 'Oversize/Overweight', count: 0, percent: '0.0%' },
  { group: 'Security of Loads', count: 0, percent: '0.0%' },
  { group: 'Dangerous Goods', count: 0, percent: '0.0%' },
  { group: 'Criminal Code', count: 0, percent: '0.0%' },
  { group: 'Permits', count: 0, percent: '0.0%' },
  { group: 'Miscellaneous', count: 0, percent: '0.0%' },
  { group: 'Administrative Actions', count: 0, percent: '0.0%' },
];

// ── NSC Violation Catalog ─────────────────────────────────────────────────────
// Maps 3/4-digit NSC CCMTA codes → description, severity, and summary group.
// Severity drives penalty calculations in SafetySettingsPage
// (OOS → criticalPenalty, Major → majorPenalty, Minor → minorPenalty).

export const NSC_VIOLATION_CATALOG: Record<string, {
  description: string;
  severity: 'Minor' | 'Major' | 'OOS';
  group: string;
}> = {
  '209':  { description: 'Unregistered Motor Vehicle',          severity: 'Major', group: 'Administrative Actions' },
  '210':  { description: 'False or no information provided',    severity: 'Minor', group: 'Administrative Actions' },
  '317':  { description: 'Fail to obey traffic control device', severity: 'Minor', group: 'Driving (Passing, Disobey Signs, Signals, etc.)' },
  '500':  { description: 'Fail to inspect vehicle',             severity: 'Major', group: 'Trip Inspections' },
  '601':  { description: 'Improper brakes',                     severity: 'OOS',   group: 'Brakes' },
  '602':  { description: 'Brake out of adjustment',             severity: 'OOS',   group: 'Brakes' },
  '603':  { description: 'Air brake system leak',               severity: 'OOS',   group: 'Brakes' },
  '604':  { description: 'Brake hose damaged',                  severity: 'OOS',   group: 'Brakes' },
  '701':  { description: 'Tire defect',                         severity: 'Major', group: 'Mechanical Defects' },
  '702':  { description: 'Tire tread depth violation',          severity: 'OOS',   group: 'Mechanical Defects' },
  '703':  { description: 'Tire flat / unsafe',                  severity: 'OOS',   group: 'Mechanical Defects' },
  '801':  { description: 'Lighting defect',                     severity: 'Minor', group: 'Mechanical Defects' },
  '802':  { description: 'Inoperative brake lights',            severity: 'Major', group: 'Mechanical Defects' },
  '901':  { description: 'Cargo not secured',                   severity: 'Major', group: 'Security of Loads' },
  '902':  { description: 'Load shift risk',                     severity: 'OOS',   group: 'Security of Loads' },
  '1001': { description: 'Driver licence violation',            severity: 'Major', group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
  '1002': { description: 'No valid driver licence',             severity: 'OOS',   group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)' },
  '1101': { description: 'Hours of service violation',          severity: 'Major', group: 'Hours of Service' },
  '1102': { description: 'Logbook not current',                 severity: 'Minor', group: 'Hours of Service' },
  '1201': { description: 'Dangerous goods violation',           severity: 'Major', group: 'Dangerous Goods' },
  '1301': { description: 'Vehicle maintenance defect',          severity: 'Major', group: 'Mechanical Defects' },
};

// Helper: extract numeric code prefix from a ccmtaCode string (e.g. "601 IMPROPER BRAKES - OOS" → "601")
export function parseCcmtaCode(raw: string): string {
  return raw.trim().split(/\s+/)[0] ?? raw;
}

export const violationDetailsData: ViolationDetailRow[] = [
  // ── Inspection ONEA01655892 · 2024 JUL 23 · ON ──────────────────────────
  {
    id: 1,
    date: '2024 JUL 23',
    time: '00:00',
    document: 'ONEA01655892',
    jurisdiction: 'ON',
    dateEntered: '2024 JUL 30',
    issuingAgency: 'Ministry of Transportation Ontario',
    location: 'WHITBY TIS',
    vehicle: 'TR-1049',
    driver: 'James Sullivan',
    commodity: 'A41990 AB',
    actSection: 'NSC 6 — Brake Systems (OOS)',
    ccmtaCode: '601 IMPROPER BRAKES - OOS',
    text: 'Brake system defect — vehicle placed out of service.',
    detailNumber: 1,
    description: 'Improper brakes',
    severity: NSC_VIOLATION_CATALOG['601']?.severity,
  },
  {
    id: 2,
    date: '2024 JUL 23',
    time: '00:00',
    document: 'ONEA01655892',
    jurisdiction: 'ON',
    dateEntered: '2024 JUL 30',
    issuingAgency: 'Ministry of Transportation Ontario',
    location: 'WHITBY TIS',
    vehicle: 'TR-1049',
    driver: 'James Sullivan',
    commodity: 'A41990 AB',
    actSection: 'NSC 7 — Tires',
    ccmtaCode: '701 TIRE DEFECT',
    text: 'Tire defect — requires attention.',
    detailNumber: 2,
    description: 'Tire defect',
    severity: NSC_VIOLATION_CATALOG['701']?.severity,
  },
  // ── Inspection 9079427 · 2024 JUL 03 · BC ───────────────────────────────
  {
    id: 3,
    date: '2024 JUL 03',
    time: '00:00',
    document: '9079427',
    jurisdiction: 'BC',
    dateEntered: '2024 JUL 09',
    issuingAgency: 'BC Ministry of Transportation',
    location: 'Kamloops Junction',
    vehicle: 'TR-3055',
    driver: 'Robert Chen',
    commodity: '0AB116 AB',
    actSection: 'NSC 7 — Tires (OOS)',
    ccmtaCode: '702 TIRE TREAD DEPTH VIOLATION - OOS',
    text: 'Tire tread depth below OOS threshold.',
    detailNumber: 1,
    description: 'Tire tread depth violation',
    severity: NSC_VIOLATION_CATALOG['702']?.severity,
  },
  {
    id: 4,
    date: '2024 JUL 03',
    time: '00:00',
    document: '9079427',
    jurisdiction: 'BC',
    dateEntered: '2024 JUL 09',
    issuingAgency: 'BC Ministry of Transportation',
    location: 'Kamloops Junction',
    vehicle: 'TR-3055',
    driver: 'Robert Chen',
    commodity: '0AB116 AB',
    actSection: 'NSC 6 — Brake Adjustment (OOS)',
    ccmtaCode: '602 BRAKE OUT OF ADJUSTMENT - OOS',
    text: 'Brake adjustment out of specification — OOS order issued.',
    detailNumber: 2,
    description: 'Brake out of adjustment',
    severity: NSC_VIOLATION_CATALOG['602']?.severity,
  },
  {
    id: 5,
    date: '2024 JUL 03',
    time: '00:00',
    document: '9079427',
    jurisdiction: 'BC',
    dateEntered: '2024 JUL 09',
    issuingAgency: 'BC Ministry of Transportation',
    location: 'Kamloops Junction',
    vehicle: 'TR-3055',
    driver: 'Robert Chen',
    commodity: '0AB116 AB',
    actSection: 'NSC 6 — Brake Systems (OOS)',
    ccmtaCode: '601 IMPROPER BRAKES - OOS',
    text: 'Brake system defect — vehicle placed out of service.',
    detailNumber: 3,
    description: 'Improper brakes',
    severity: NSC_VIOLATION_CATALOG['601']?.severity,
  },
  {
    id: 6,
    date: '2024 JUL 03',
    time: '00:00',
    document: '9079427',
    jurisdiction: 'BC',
    dateEntered: '2024 JUL 09',
    issuingAgency: 'BC Ministry of Transportation',
    location: 'Kamloops Junction',
    vehicle: 'TR-3055',
    driver: 'Robert Chen',
    commodity: '0AB116 AB',
    actSection: 'NSC 10 — Driver Credentials',
    ccmtaCode: '1001 DRIVER LICENCE VIOLATION',
    text: 'Driver credentials deficiency noted during inspection.',
    detailNumber: 4,
    description: 'Driver licence violation',
    severity: NSC_VIOLATION_CATALOG['1001']?.severity,
  },
  {
    id: 7,
    date: '2024 JUL 03',
    time: '00:00',
    document: '9079427',
    jurisdiction: 'BC',
    dateEntered: '2024 JUL 09',
    issuingAgency: 'BC Ministry of Transportation',
    location: 'Kamloops Junction',
    vehicle: 'TR-3055',
    driver: 'Robert Chen',
    commodity: '0AB116 AB',
    actSection: 'NSC 13 — Frames / Structural',
    ccmtaCode: '1301 VEHICLE MAINTENANCE DEFECT',
    text: 'Frame structural defect requires attention.',
    detailNumber: 5,
    description: 'Vehicle maintenance defect',
    severity: NSC_VIOLATION_CATALOG['1301']?.severity,
  },
  {
    id: 8,
    date: '2024 JUL 03',
    time: '00:00',
    document: '9079427',
    jurisdiction: 'BC',
    dateEntered: '2024 JUL 09',
    issuingAgency: 'BC Ministry of Transportation',
    location: 'Kamloops Junction',
    vehicle: 'TR-3055',
    driver: 'Robert Chen',
    commodity: '0AB116 AB',
    actSection: 'NSC 8 — Lighting Devices',
    ccmtaCode: '801 LIGHTING DEFECT',
    text: 'Lighting device defect noted.',
    detailNumber: 6,
    description: 'Lighting defect',
    severity: NSC_VIOLATION_CATALOG['801']?.severity,
  },
  // ── Inspection V241439653 · 2024 JUN 13 · TX ────────────────────────────
  {
    id: 9,
    date: '2024 JUN 13',
    time: '00:00',
    document: 'V241439653',
    jurisdiction: 'TX',
    dateEntered: '2024 JUL 02',
    issuingAgency: 'Texas DPS - Commercial Vehicle Enforcement',
    location: 'IH45 NB NEW WAVERLY SCALE',
    vehicle: 'TR-6001',
    driver: 'Sarah Johnson',
    commodity: 'A85916 AB',
    actSection: 'NSC 8 — Lighting Devices (OOS)',
    ccmtaCode: '802 INOPERATIVE BRAKE LIGHTS - OOS',
    text: 'Brake lights inoperative — OOS order issued.',
    detailNumber: 1,
    description: 'Inoperative brake lights',
    severity: NSC_VIOLATION_CATALOG['802']?.severity,
  },
  {
    id: 10,
    date: '2024 JUN 13',
    time: '00:00',
    document: 'V241439653',
    jurisdiction: 'TX',
    dateEntered: '2024 JUL 02',
    issuingAgency: 'Texas DPS - Commercial Vehicle Enforcement',
    location: 'IH45 NB NEW WAVERLY SCALE',
    vehicle: 'TR-6001',
    driver: 'Sarah Johnson',
    commodity: 'A85916 AB',
    actSection: 'NSC 8 — Windshield Wipers',
    ccmtaCode: '801 LIGHTING DEFECT',
    text: 'Windshield wiper defect requires attention.',
    detailNumber: 2,
    description: 'Lighting defect',
    severity: NSC_VIOLATION_CATALOG['801']?.severity,
  },
  // ── Inspection 1002415045 · 2024 MAY 29 · PA ────────────────────────────
  {
    id: 11,
    date: '2024 MAY 29',
    time: '00:00',
    document: '1002415045',
    jurisdiction: 'PA',
    dateEntered: '2024 JUN 11',
    issuingAgency: 'Pennsylvania State Police - CMV Unit',
    location: 'PA TOLL 576 WESTBOUND, ON RAMP',
    vehicle: 'TR-1049',
    driver: 'Michael Brown',
    commodity: '0AP132 AB',
    actSection: 'NSC 10 — Driver Credentials',
    ccmtaCode: '1001 DRIVER LICENCE VIOLATION',
    text: 'Driver credentials deficiency noted during inspection.',
    detailNumber: 1,
    description: 'Driver licence violation',
    severity: NSC_VIOLATION_CATALOG['1001']?.severity,
  },
  // ── Inspection 679383 · 2024 MAY 01 · NS ────────────────────────────────
  {
    id: 12,
    date: '2024 MAY 01',
    time: '00:00',
    document: '679383',
    jurisdiction: 'NS',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'Nova Scotia Highway Safety Division',
    location: 'AMHERST (OUT)',
    vehicle: 'TR-5200',
    driver: 'John Smith',
    commodity: '0AU350 AB',
    actSection: 'NSC 9 — Cargo Securement',
    ccmtaCode: '901 CARGO NOT SECURED',
    text: 'Cargo securement deficiency noted.',
    detailNumber: 1,
    description: 'Cargo not secured',
    severity: NSC_VIOLATION_CATALOG['901']?.severity,
  },
  // ── Inspection ON0001738260 · 2024 APR 26 · ON ──────────────────────────
  {
    id: 13,
    date: '2024 APR 26',
    time: '00:00',
    document: 'ON0001738260',
    jurisdiction: 'ON',
    dateEntered: '2024 MAY 14',
    issuingAgency: 'Ministry of Transportation Ontario',
    location: 'HWY 6/NORTH OF GUELPH',
    vehicle: 'TR-7044',
    driver: 'Sarah Miller',
    commodity: 'A45934 AB',
    actSection: 'NSC 6 — Brake Systems (OOS)',
    ccmtaCode: '601 IMPROPER BRAKES - OOS',
    text: 'Brake system defect — vehicle placed out of service.',
    detailNumber: 1,
    description: 'Improper brakes',
    severity: NSC_VIOLATION_CATALOG['601']?.severity,
  },
  {
    id: 14,
    date: '2024 APR 26',
    time: '00:00',
    document: 'ON0001738260',
    jurisdiction: 'ON',
    dateEntered: '2024 MAY 14',
    issuingAgency: 'Ministry of Transportation Ontario',
    location: 'HWY 6/NORTH OF GUELPH',
    vehicle: 'TR-7044',
    driver: 'Sarah Miller',
    commodity: 'A45934 AB',
    actSection: 'NSC 10 — Driver Credentials',
    ccmtaCode: '1001 DRIVER LICENCE VIOLATION',
    text: 'Driver credentials deficiency noted during inspection.',
    detailNumber: 2,
    description: 'Driver licence violation',
    severity: NSC_VIOLATION_CATALOG['1001']?.severity,
  },
  {
    id: 15,
    date: '2024 APR 26',
    time: '00:00',
    document: 'ON0001738260',
    jurisdiction: 'ON',
    dateEntered: '2024 MAY 14',
    issuingAgency: 'Ministry of Transportation Ontario',
    location: 'HWY 6/NORTH OF GUELPH',
    vehicle: 'TR-7044',
    driver: 'Sarah Miller',
    commodity: 'A45934 AB',
    actSection: 'NSC 11 — Hours of Service',
    ccmtaCode: '1101 HOURS OF SERVICE VIOLATION',
    text: 'Hours of service violation noted.',
    detailNumber: 3,
    description: 'Hours of service violation',
    severity: NSC_VIOLATION_CATALOG['1101']?.severity,
  },
  {
    id: 16,
    date: '2024 APR 26',
    time: '00:00',
    document: 'ON0001738260',
    jurisdiction: 'ON',
    dateEntered: '2024 MAY 14',
    issuingAgency: 'Ministry of Transportation Ontario',
    location: 'HWY 6/NORTH OF GUELPH',
    vehicle: 'TR-7044',
    driver: 'Sarah Miller',
    commodity: 'A45934 AB',
    actSection: 'NSC 8 — Lighting Devices',
    ccmtaCode: '801 LIGHTING DEFECT',
    text: 'Lighting device defect noted.',
    detailNumber: 4,
    description: 'Lighting defect',
    severity: NSC_VIOLATION_CATALOG['801']?.severity,
  },
  // ── Inspection 462948 · 2024 APR 17 · NB ────────────────────────────────
  {
    id: 17,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 13 — Trailer Bodies (OOS)',
    ccmtaCode: '1301 VEHICLE MAINTENANCE DEFECT - OOS',
    text: 'Van/open-top trailer body defect — OOS order issued.',
    detailNumber: 1,
    description: 'Vehicle maintenance defect',
    severity: NSC_VIOLATION_CATALOG['1301']?.severity,
  },
  {
    id: 18,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 6 — Brake Systems (OOS)',
    ccmtaCode: '601 IMPROPER BRAKES - OOS',
    text: 'Brake system defect — vehicle placed out of service.',
    detailNumber: 2,
    description: 'Improper brakes',
    severity: NSC_VIOLATION_CATALOG['601']?.severity,
  },
  {
    id: 19,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 13 — Coupling Devices (OOS)',
    ccmtaCode: '1301 VEHICLE MAINTENANCE DEFECT - OOS',
    text: 'Coupling device defect — OOS order issued.',
    detailNumber: 3,
    description: 'Vehicle maintenance defect',
    severity: NSC_VIOLATION_CATALOG['1301']?.severity,
  },
  {
    id: 20,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 8 — Lighting Devices (OOS)',
    ccmtaCode: '802 INOPERATIVE BRAKE LIGHTS - OOS',
    text: 'Lighting OOS — brake lights inoperative.',
    detailNumber: 4,
    description: 'Inoperative brake lights',
    severity: NSC_VIOLATION_CATALOG['802']?.severity,
  },
  {
    id: 21,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 13 — Trailer Bodies',
    ccmtaCode: '1301 VEHICLE MAINTENANCE DEFECT',
    text: 'Van/open-top trailer body defect requires attention.',
    detailNumber: 5,
    description: 'Vehicle maintenance defect',
    severity: NSC_VIOLATION_CATALOG['1301']?.severity,
  },
  {
    id: 22,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 6 — Brake Systems',
    ccmtaCode: '601 IMPROPER BRAKES',
    text: 'Brake system defect requires attention.',
    detailNumber: 6,
    description: 'Improper brakes',
    severity: NSC_VIOLATION_CATALOG['601']?.severity,
  },
  {
    id: 23,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 13 — Coupling Devices',
    ccmtaCode: '1301 VEHICLE MAINTENANCE DEFECT',
    text: 'Coupling device defect requires attention.',
    detailNumber: 7,
    description: 'Vehicle maintenance defect',
    severity: NSC_VIOLATION_CATALOG['1301']?.severity,
  },
  {
    id: 24,
    date: '2024 APR 17',
    time: '00:00',
    document: '462948',
    jurisdiction: 'NB',
    dateEntered: '2024 MAY 07',
    issuingAgency: 'New Brunswick Motor Vehicle Branch',
    location: 'SALISBURY',
    vehicle: 'TR-1049',
    driver: 'John Smith',
    commodity: 'A41990 AB',
    actSection: 'NSC 8 — Lighting Devices',
    ccmtaCode: '801 LIGHTING DEFECT',
    text: 'Lighting device defect noted.',
    detailNumber: 8,
    description: 'Lighting defect',
    severity: NSC_VIOLATION_CATALOG['801']?.severity,
  },
];

// Compute violation summary from events using the catalog
const _vTotal = violationDetailsData.length || 1;
function _vPct(n: number) { return n === 0 ? '0%' : `${Math.round((n / _vTotal) * 100)}%`; }
function _vCount(grp: string) {
  return violationDetailsData.filter(r => {
    const code = parseCcmtaCode(r.ccmtaCode);
    return NSC_VIOLATION_CATALOG[code]?.group === grp;
  }).length;
}

const violationSummaryData: ViolationSummaryRow[] = [
  { group: 'Speeding',                                                        count: _vCount('Speeding'),                                                        percent: _vPct(_vCount('Speeding')) },
  { group: 'Stop signs/Traffic lights',                                       count: _vCount('Stop signs/Traffic lights'),                                       percent: _vPct(_vCount('Stop signs/Traffic lights')) },
  { group: 'Driver Liabilities (Licence, Insurance, Seat Belts, etc.)',       count: _vCount('Driver Liabilities (Licence, Insurance, Seat Belts, etc.)'),       percent: _vPct(_vCount('Driver Liabilities (Licence, Insurance, Seat Belts, etc.)')) },
  { group: 'Driving (Passing, Disobey Signs, Signals, etc.)',                 count: _vCount('Driving (Passing, Disobey Signs, Signals, etc.)'),                 percent: _vPct(_vCount('Driving (Passing, Disobey Signs, Signals, etc.)')) },
  { group: 'Hours of Service',                                                count: _vCount('Hours of Service'),                                                percent: _vPct(_vCount('Hours of Service')) },
  { group: 'Trip Inspections',                                                count: _vCount('Trip Inspections'),                                                percent: _vPct(_vCount('Trip Inspections')) },
  { group: 'Brakes',                                                          count: _vCount('Brakes'),                                                          percent: _vPct(_vCount('Brakes')) },
  { group: 'CVIP',                                                            count: _vCount('CVIP'),                                                            percent: _vPct(_vCount('CVIP')) },
  { group: 'Mechanical Defects',                                              count: _vCount('Mechanical Defects'),                                              percent: _vPct(_vCount('Mechanical Defects')) },
  { group: 'Oversize/Overweight',                                             count: _vCount('Oversize/Overweight'),                                             percent: _vPct(_vCount('Oversize/Overweight')) },
  { group: 'Security of Loads',                                               count: _vCount('Security of Loads'),                                               percent: _vPct(_vCount('Security of Loads')) },
  { group: 'Dangerous Goods',                                                 count: _vCount('Dangerous Goods'),                                                 percent: _vPct(_vCount('Dangerous Goods')) },
  { group: 'Criminal Code',                                                   count: _vCount('Criminal Code'),                                                   percent: _vPct(_vCount('Criminal Code')) },
  { group: 'Permits',                                                         count: _vCount('Permits'),                                                         percent: _vPct(_vCount('Permits')) },
  { group: 'Miscellaneous',                                                   count: _vCount('Miscellaneous'),                                                   percent: _vPct(_vCount('Miscellaneous')) },
  { group: 'Administrative Actions',                                          count: _vCount('Administrative Actions'),                                          percent: _vPct(_vCount('Administrative Actions')) },
];

const convictionDetailsData: ConvictionDetailRow[] = [
  { id: 1, date: '2023 NOV 18', doc: 'OPC 45759727', docket: '45759727', jur: 'ON', vehicle: 'A94629 AB', driver: 'UNKNOWN', description: 'FAIL INSPECT VEHICLE', points: 2, time: '09:04', location: '@ABWHITBY TIS/HWY 401 EB', entered: '2024 FEB 27', convictionDate: '2024 JAN 02', ccmta: '500' },
  { id: 2, date: '2023 MAR 01', doc: 'OPC 36082153', docket: '36082153', jur: 'ON', vehicle: 'A41990 AB', driver: 'UNKNOWN', description: 'UNREGISTERED MOTOR VEH.', points: 0, time: '10:45', location: '@ABHWY 401 EB EAST OF MANNING', entered: '2023 MAY 17', convictionDate: '2023 APR 19', ccmta: '209' },
  { id: 3, date: '2023 FEB 22', doc: 'OPC 36060085', docket: '36060085', jur: 'ON', vehicle: 'A41838 AB', driver: 'UNKNOWN', description: 'FAIL INSPECT VEHICLE', points: 0, time: '13:30', location: '@AB9517 DICKENSON RD W', entered: '2023 MAY 09', convictionDate: '-', ccmta: '500' },
  { id: 4, date: '2022 DEC 09', doc: 'OPC 1004002141838086', docket: '1004002141838086', jur: 'QC', vehicle: 'A49908 AB', driver: 'XXX GAGANDEEP SINGH', description: 'ALLOW DRIVE REVOKED/SUSP.', points: 0, time: '-', location: '-', entered: '-', convictionDate: '-', ccmta: '-' },
  { id: 5, date: '2022 SEP 07', doc: 'OPC 1004003042195675', docket: '1004003042195675', jur: 'QC', vehicle: 'A41838 AB', driver: 'GURBHAGAT, SINGH AULAKH', description: 'FAIL TO OBEY DEVICE', points: 0, time: '-', location: '-', entered: '-', convictionDate: '-', ccmta: '-' },
];

export const cvsaSummaryData: CvsaSummaryRow[] = [
  { desc: '1 - Driver Credentials', oos: 8, req: null, total: 8, percent: '12.9%' },
  { desc: '2 - Hours Of Service', oos: 4, req: 5, total: 9, percent: '14.5%' },
  { desc: '3 - Brake Adjustment', oos: null, req: 1, total: 1, percent: '1.6%' },
  { desc: '4 - Brake Systems', oos: 10, req: 6, total: 16, percent: '25.8%' },
  { desc: '5 - Coupling Devices', oos: 1, req: 1, total: 2, percent: '3.2%' },
  { desc: '6 - Exhaust Systems', oos: null, req: null, total: null, percent: null },
  { desc: '7 - Frames', oos: 1, req: null, total: 1, percent: '1.6%' },
  { desc: '8 - Fuel Systems', oos: null, req: null, total: null, percent: null },
  { desc: '9 - Lighting Devices (Part II Section 9 only)', oos: 6, req: 7, total: 13, percent: '21.0%' },
  { desc: '10 - Cargo Securement', oos: 1, req: 1, total: 2, percent: '3.2%' },
  { desc: '11 - Steering Mechanisms', oos: null, req: null, total: null, percent: null },
  { desc: '12 - Suspensions', oos: null, req: null, total: null, percent: null },
  { desc: '13 - Tires', oos: 1, req: 3, total: 4, percent: '6.5%' },
  { desc: '14 - Van/Open-top Trailer Bodies', oos: 1, req: 2, total: 3, percent: '4.8%' },
  { desc: '15 - Wheels, Rims & Hubs', oos: 1, req: null, total: 1, percent: '1.6%' },
  { desc: '16 - Windshield Wipers', oos: 2, req: null, total: 2, percent: '3.2%' },
  { desc: '17 - Emergency Exits/Electrical System/Seating (Buses)', oos: null, req: null, total: null, percent: null },
  { desc: '18 - Dangerous Goods', oos: null, req: null, total: null, percent: null },
  { desc: '19 - Driveline/Driveshaft', oos: null, req: null, total: null, percent: null },
  { desc: "20 - Driver's Seat (Missing)", oos: null, req: null, total: null, percent: null },
];

export const cvsaDetailsData: CvsaRow[] = [
  { id: 1, date: '2024 JUL 23', doc: 'ONEA01655892', jur: 'ON', plate: 'A41990 AB', level: 1, result: 'Out Of Service', details: { time: '00:00', dateEntered: '2024 JUL 30', agency: '—', location: 'WHITBY TIS', driver: 'Talvinder Singh S44907320001231 ON', vehicles: [{ type: 'P', plate: 'A41990 AB', jur: 'AB', vin: '3AKJHHDRXKSKA3234', year: '2019', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: 'W2880V', jur: 'ON', make: 'UTIL', decal: '—' }], oos: ['4 - Brake Systems'], req: ['13 - Tires'], oosRows: [{ category: '4 - Brake Systems', vehicleCounts: [1, 1, null, null, null, null, null] }], reqRows: [{ category: '13 - Tires', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 2, date: '2024 JUL 22', doc: 'I037D80791', jur: 'TN', plate: '0AP146 AB', level: 2, result: 'Passed', details: { time: '00:00', dateEntered: '2024 AUG 06', agency: '—', location: 'GOODLETTSVILLE TN', driver: 'DEEP GILL G43501590910421 ON', vehicles: [{ type: 'P', plate: '0AP146 AB', jur: 'AB', vin: '3HSDZAPR2RN653376', year: '2024', make: 'International', decal: '—' }, { type: 'ST', plate: 'W1672C', jur: 'ON', make: 'UNPUBLISHE', decal: '—' }], oos: [], req: [] } },
  { id: 3, date: '2024 JUL 03', doc: '9079427', jur: 'BC', plate: '0AB116 AB', level: 1, result: 'Out Of Service', details: { time: '00:00', dateEntered: '2024 JUL 09', agency: '—', location: 'Kamloops Junction', driver: '. Jaskaran Singh 179746-979 AB', vehicles: [{ type: 'P', plate: '0AB116 AB', jur: 'AB', vin: '1FUJHHDRXNLMX0362', year: '2022', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: '6PD082', jur: 'AB', make: 'VANGUARD', decal: '—' }], oos: ['13 - Tires', '3 - Brake Adjustment', '4 - Brake Systems'], req: ['1 - Driver Credentials', '7 - Frames', '9 - Lighting Devices (Part II Section 9 only)'], oosRows: [{ category: '13 - Tires', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '3 - Brake Adjustment', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '4 - Brake Systems', vehicleCounts: [1, 1, null, null, null, null, null] }], reqRows: [{ category: '1 - Driver Credentials', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '7 - Frames', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '9 - Lighting Devices (Part II Section 9 only)', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 4, date: '2024 JUN 13', doc: 'V241439653', jur: 'TX', plate: 'A85916 AB', level: 1, result: 'Out Of Service', details: { time: '00:00', dateEntered: '2024 JUL 02', agency: '—', location: 'IH45 NB NEW WAVERLY SCALE', driver: 'JASMEET SINGH J07540000010417 ON', vehicles: [{ type: 'P', plate: 'A85916 AB', jur: 'AB', vin: '1M1AN4GYXNM027473', year: '2022', make: 'Mack', decal: '—' }], oos: ['9 - Lighting Devices (Part II Section 9 only)'], req: ['16 - Windshield Wipers'], oosRows: [{ category: '9 - Lighting Devices (Part II Section 9 only)', vehicleCounts: [1, null, null, null, null, null, null] }], reqRows: [{ category: '16 - Windshield Wipers', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 5, date: '2024 MAY 29', doc: '1002415045', jur: 'PA', plate: '0AP132 AB', level: 3, result: 'Requires Attention', details: { time: '00:00', dateEntered: '2024 JUN 11', agency: '—', location: 'PA TOLL 576 WESTBOUND, ON RAMP', driver: 'Baljinder Singh S44900720920825 ON', vehicles: [{ type: 'P', plate: '0AP132 AB', jur: 'AB', vin: '1FUJHHDR3MLMD4278', year: '2021', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: 'X8283F', jur: 'ON', make: 'VANG', decal: '—' }], oos: [], req: ['1 - Driver Credentials'], reqRows: [{ category: '1 - Driver Credentials', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 6, date: '2024 MAY 01', doc: '679383', jur: 'NS', plate: '0AU350 AB', level: 4, result: 'Requires Attention', details: { time: '00:00', dateEntered: '2024 MAY 07', agency: '—', location: 'AMHERST (OUT)', driver: 'Jagdeep Singh SINGH161194016 NS', vehicles: [{ type: 'P', plate: '0AU350 AB', jur: 'AB', vin: '3AKJHHDR8NSMX1157', year: '2022', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: '6NZ508', jur: 'AB', make: 'MANAC', decal: '—' }], oos: [], req: ['10 - Cargo Securement'], reqRows: [{ category: '10 - Cargo Securement', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 7, date: '2024 APR 27', doc: 'ONEA01635814', jur: 'ON', plate: 'A45934 AB', level: 2, result: 'Passed', details: { time: '00:00', dateEntered: '2024 MAY 07', agency: '—', location: 'LANCASTER TIS', driver: 'LOVEPREET SINGH L68540000000723 ON', vehicles: [{ type: 'P', plate: 'A45934 AB', jur: 'AB', vin: '3AKJHHDR4KSKJ4881', year: '2019', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: 'W2880V', jur: 'ON', make: 'UTIL', decal: '—' }], oos: [], req: [] } },
  { id: 8, date: '2024 APR 26', doc: 'ON0001738260', jur: 'ON', plate: 'A45934 AB', level: 1, result: 'Out Of Service', details: { time: '00:00', dateEntered: '2024 MAY 14', agency: '—', location: 'HWY 6/NORTH OF GUELPH', driver: 'LOVEPREET SINGH L68540000000723 ON', vehicles: [{ type: 'P', plate: 'A45934 AB', jur: 'AB', vin: '3AKJHHDR4KSKJ4881', year: '2019', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: 'W7735E', jur: 'ON', make: 'UTIL', decal: '—' }], oos: ['4 - Brake Systems'], req: ['1 - Driver Credentials', '2 - Hours Of Service', '9 - Lighting Devices (Part II Section 9 only)'], oosRows: [{ category: '4 - Brake Systems', vehicleCounts: [1, 1, null, null, null, null, null] }], reqRows: [{ category: '1 - Driver Credentials', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '2 - Hours Of Service', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '9 - Lighting Devices (Part II Section 9 only)', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 9, date: '2024 APR 17', doc: '462948', jur: 'NB', plate: 'A41990 AB', level: 1, result: 'Out Of Service', details: { time: '00:00', dateEntered: '2024 MAY 07', agency: '—', location: 'SALISBURY', driver: 'Jagdeep Singh SINGH161194016 NS', vehicles: [{ type: 'P', plate: 'A41990 AB', jur: 'AB', vin: '3AKJHHDRXKSKA3234', year: '2019', make: 'Freightliner', decal: '—' }, { type: 'ST', plate: 'W2208K', jur: 'ON', make: '—', decal: '—' }], oos: ['14 - Van/Open-top Trailer Bodies', '4 - Brake Systems', '5 - Coupling Devices', '9 - Lighting Devices (Part II Section 9 only)'], req: ['14 - Van/Open-top Trailer Bodies', '4 - Brake Systems', '5 - Coupling Devices', '9 - Lighting Devices (Part II Section 9 only)'], oosRows: [{ category: '14 - Van/Open-top Trailer Bodies', vehicleCounts: [null, 1, null, null, null, null, null] }, { category: '4 - Brake Systems', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '5 - Coupling Devices', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '9 - Lighting Devices (Part II Section 9 only)', vehicleCounts: [1, null, null, null, null, null, null] }], reqRows: [{ category: '14 - Van/Open-top Trailer Bodies', vehicleCounts: [null, 1, null, null, null, null, null] }, { category: '4 - Brake Systems', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '5 - Coupling Devices', vehicleCounts: [1, null, null, null, null, null, null] }, { category: '9 - Lighting Devices (Part II Section 9 only)', vehicleCounts: [1, null, null, null, null, null, null] }] } },
  { id: 10, date: '2024 APR 11', doc: 'ONEA01632644', jur: 'ON', plate: '0AU249 AB', level: 2, result: 'Passed', details: { time: '00:00', dateEntered: '2024 APR 23', agency: '—', location: 'LANCASTER TIS', driver: 'GURDEEP SINGH S44903080932013 ON', vehicles: [{ type: 'P', plate: '0AU249 AB', jur: 'AB', vin: '1HTMMMMRXFH742070', year: '2015', make: 'International', decal: '—' }], oos: [], req: [] } },
  { id: 11, date: '2024 APR 06', doc: '678575',        jur: 'NS', plate: 'A94629 AB', level: 3, result: 'Passed' },
  { id: 12, date: '2024 APR 03', doc: 'ONEA01630597',  jur: 'ON', plate: 'A85916 AB', level: 2, result: 'Out Of Service' },
  { id: 13, date: '2024 MAR 25', doc: 'ONEA01628603',  jur: 'ON', plate: '0AP012 AB', level: 2, result: 'Passed' },
  { id: 14, date: '2024 FEB 29', doc: 'SPD0225911',    jur: 'NY', plate: 'A85916 AB', level: 2, result: 'Out Of Service' },
  { id: 15, date: '2024 FEB 20', doc: 'HOULD03876',    jur: 'MI', plate: '0AP133 AB', level: 3, result: 'Requires Attention' },
  { id: 16, date: '2024 FEB 13', doc: '3472005545',    jur: 'ID', plate: '0AB116 AB', level: 2, result: 'Passed' },
  { id: 17, date: '2024 FEB 12', doc: '462469',        jur: 'NB', plate: '0AP132 AB', level: 3, result: 'Passed' },
  { id: 18, date: '2024 FEB 03', doc: 'ONEA01618135',  jur: 'ON', plate: '0AP133 AB', level: 2, result: 'Out Of Service' },
  { id: 19, date: '2024 JAN 29', doc: '677105',        jur: 'NS', plate: '0AB116 AB', level: 3, result: 'Out Of Service' },
  { id: 20, date: '2024 JAN 29', doc: 'HOULD03825',    jur: 'MI', plate: 'A94629 AB', level: 3, result: 'Requires Attention' },
  { id: 21, date: '2024 JAN 22', doc: 'ONEA01615518',  jur: 'ON', plate: '0AB116 AB', level: 2, result: 'Out Of Service' },
  { id: 22, date: '2023 DEC 22', doc: '5267000034',    jur: 'IN', plate: '0AP012 AB', level: 2, result: 'Passed' },
  { id: 23, date: '2023 NOV 23', doc: 'ONEA01604703',  jur: 'ON', plate: 'A41990 AB', level: 2, result: 'Passed' },
  { id: 24, date: '2023 NOV 03', doc: '281006350',     jur: 'MD', plate: '0AP132 AB', level: 2, result: 'Passed' },
  { id: 25, date: '2023 SEP 04', doc: 'ONEA01585186',  jur: 'ON', plate: '0AP012 AB', level: 2, result: 'Out Of Service' },
  { id: 26, date: '2023 AUG 13', doc: 'ONEA01580497',  jur: 'ON', plate: 'A41990 AB', level: 2, result: 'Passed' },
  { id: 27, date: '2023 AUG 07', doc: 'ONEA01578676',  jur: 'ON', plate: 'A41990 AB', level: 1, result: 'Out Of Service' },
  { id: 28, date: '2023 JUL 16', doc: '670960',        jur: 'NS', plate: '0AB116 AB', level: 3, result: 'Requires Attention' },
  { id: 29, date: '2023 JUL 12', doc: '451565',        jur: 'NB', plate: 'A94629 AB', level: 3, result: 'Passed' },
  { id: 30, date: '2023 JUL 07', doc: '670727',        jur: 'NS', plate: 'A49913 AB', level: 1, result: 'Requires Attention' },
  { id: 31, date: '2023 JUL 05', doc: 'ONEA01572070',  jur: 'ON', plate: 'A85916 AB', level: 2, result: 'Out Of Service' },
  { id: 32, date: '2023 MAY 21', doc: 'ONEA01563751',  jur: 'ON', plate: 'A45934 AB', level: 3, result: 'Passed' },
  { id: 33, date: '2023 APR 26', doc: 'ONEA01558038',  jur: 'ON', plate: 'A41990 AB', level: 1, result: 'Out Of Service' },
  { id: 34, date: '2023 APR 13', doc: 'ONEA01555977',  jur: 'ON', plate: 'A49913 AB', level: 2, result: 'Out Of Service' },
  { id: 35, date: '2023 FEB 24', doc: 'ONEA01547082',  jur: 'ON', plate: 'A85916 AB', level: 3, result: 'Passed' },
  { id: 36, date: '2023 FEB 18', doc: 'ONEA01546121',  jur: 'ON', plate: 'A41989 AB', level: 1, result: 'Out Of Service' },
  { id: 37, date: '2022 NOV 15', doc: 'ONEA01530441',  jur: 'ON', plate: 'A49908 AB', level: 2, result: 'Passed' },
  { id: 38, date: '2022 OCT 20', doc: 'S11221020029',  jur: 'QC', plate: 'A45934 AB', level: 2, result: 'Passed' },
  { id: 39, date: '2022 SEP 13', doc: 'WATTR03292',    jur: 'MI', plate: 'A49908 AB', level: 2, result: 'Requires Attention' },
  { id: 40, date: '2022 SEP 07', doc: 'S62220907022',  jur: 'QC', plate: 'A41838 AB', level: 2, result: 'Passed' },
  { id: 41, date: '2022 AUG 11', doc: 'SPA0294345',    jur: 'NY', plate: 'A41838 AB', level: 2, result: 'Out Of Service' },
  { id: 42, date: '2022 JUL 06', doc: '442975',        jur: 'NB', plate: 'A41990 AB', level: 3, result: 'Passed' },
  { id: 43, date: '2022 MAY 19', doc: 'ONEA01502714',  jur: 'ON', plate: 'A41989 AB', level: 1, result: 'Passed' },
];

const monitoringTrendData: MonitoringTrendRow[] = [
  { monthEnd: '2024 Sep', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '13.4', currentFleet: '9', score: '0.339', convictionPercent: '36.2', adminPercent: '0.0', collisionPercent: '34.7', inspectionPercent: '29.1' },
  { monthEnd: '2024 Aug', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '13.8', currentFleet: '8', score: '0.342', convictionPercent: '34.9', adminPercent: '0.0', collisionPercent: '33.4', inspectionPercent: '31.7' },
  { monthEnd: '2024 Jul', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '13.8', currentFleet: '16', score: '0.354', convictionPercent: '33.7', adminPercent: '0.0', collisionPercent: '32.2', inspectionPercent: '34.1' },
  { monthEnd: '2024 Jun', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '13.4', currentFleet: '16', score: '0.472', convictionPercent: '26.0', adminPercent: '0.0', collisionPercent: '49.8', inspectionPercent: '24.2' },
  { monthEnd: '2024 May', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '13.1', currentFleet: '14', score: '0.466', convictionPercent: '26.9', adminPercent: '0.0', collisionPercent: '51.6', inspectionPercent: '21.5' },
  { monthEnd: '2024 Apr', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '12.9', currentFleet: '14', score: '0.435', convictionPercent: '29.4', adminPercent: '0.0', collisionPercent: '56.2', inspectionPercent: '14.4' },
  { monthEnd: '2024 Mar', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '12.0', currentFleet: '14', score: '0.553', convictionPercent: '49.6', adminPercent: '0.0', collisionPercent: '35.6', inspectionPercent: '14.8' },
  { monthEnd: '2024 Feb', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '12.0', currentFleet: '14', score: '0.489', convictionPercent: '56.1', adminPercent: '0.0', collisionPercent: '26.9', inspectionPercent: '17.0' },
  { monthEnd: '2024 Jan', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '11.0', currentFleet: '14', score: '0.373', convictionPercent: '40.1', adminPercent: '0.0', collisionPercent: '38.4', inspectionPercent: '21.5' },
  { monthEnd: '2023 Dec', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '11.0', currentFleet: '14', score: '0.818', convictionPercent: '45.7', adminPercent: '0.0', collisionPercent: '43.8', inspectionPercent: '10.5', stage: '01' },
  { monthEnd: '2023 Nov', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '11.0', currentFleet: '14', score: '0.899', convictionPercent: '41.6', adminPercent: '0.0', collisionPercent: '47.8', inspectionPercent: '10.6', stage: '01' },
  { monthEnd: '2023 Oct', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '10.0', currentFleet: '14', score: '1.228', convictionPercent: '36.5', adminPercent: '0.0', collisionPercent: '54.7', inspectionPercent: '8.8', stage: '02' },
  { monthEnd: '2023 Sep', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '10.0', currentFleet: '13', score: '0.995', convictionPercent: '45.0', adminPercent: '0.0', collisionPercent: '45.0', inspectionPercent: '10.0', stage: '01' },
  { monthEnd: '2023 Aug', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '10.0', currentFleet: '8', score: '0.988', convictionPercent: '45.3', adminPercent: '0.0', collisionPercent: '45.3', inspectionPercent: '9.4' },
  { monthEnd: '2023 Jul', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '10.0', currentFleet: '12', score: '0.988', convictionPercent: '45.3', adminPercent: '0.0', collisionPercent: '45.3', inspectionPercent: '9.4' },
  { monthEnd: '2023 Jun', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '10.0', currentFleet: '12', score: '0.968', convictionPercent: '46.3', adminPercent: '0.0', collisionPercent: '46.3', inspectionPercent: '7.4' },
  { monthEnd: '2023 May', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '9.0', currentFleet: '12', score: '1.077', convictionPercent: '46.2', adminPercent: '0.0', collisionPercent: '46.2', inspectionPercent: '7.6' },
  { monthEnd: '2023 Apr', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '9.0', currentFleet: '12', score: '0.883', convictionPercent: '33.8', adminPercent: '0.0', collisionPercent: '56.4', inspectionPercent: '9.8' },
  { monthEnd: '2023 Mar', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '9.0', currentFleet: '14', score: '0.864', convictionPercent: '34.6', adminPercent: '0.0', collisionPercent: '57.6', inspectionPercent: '7.8' },
  { monthEnd: '2023 Feb', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '9.0', currentFleet: '14', score: '1.063', convictionPercent: '46.8', adminPercent: '0.0', collisionPercent: '46.8', inspectionPercent: '6.4' },
  { monthEnd: '2023 Jan', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '8.0', currentFleet: '12', score: '0.980', convictionPercent: '57.1', adminPercent: '0.0', collisionPercent: '42.9', inspectionPercent: '0.0' },
  { monthEnd: '2022 Dec', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '8.0', currentFleet: '12', score: '0.504', convictionPercent: '44.4', adminPercent: '0.0', collisionPercent: '55.6', inspectionPercent: '0.0' },
  { monthEnd: '2022 Nov', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '8.0', currentFleet: '9', score: '0.504', convictionPercent: '44.4', adminPercent: '0.0', collisionPercent: '55.6', inspectionPercent: '0.0' },
  { monthEnd: '2022 Oct', type: 'TRK', trkPercent: '100', busPercent: '0', avgFleet: '8.0', currentFleet: '9', score: '0.504', convictionPercent: '44.4', adminPercent: '0.0', collisionPercent: '55.6', inspectionPercent: '0.0' },
];

const monitoringThresholds: MonitoringThresholdRow[] = [
  { stage: 'Stage 1', threshold: '0.930 - 1.193' },
  { stage: 'Stage 2', threshold: '1.194 - 1.640' },
  { stage: 'Stage 3', threshold: '1.641 - 2.133' },
  { stage: 'Stage 4', threshold: '2.134 and higher' },
];

const monitoringDetailData: MonitoringDetailRow[] = [
  { monthEnd: '2024 Sep', avgFleetSize: '13.4', convictionPtsPerVeh: '0.14', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.29', cvsaPtsPerVeh: '0.57', totalInspections: '24', oosDefectPerInspection: '0.7', totalDefectPerInspection: '1.5', oosPercent: '41%', oosPerVehicle: '0.74' },
  { monthEnd: '2024 Aug', avgFleetSize: '13.8', convictionPtsPerVeh: '0.14', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.28', cvsaPtsPerVeh: '0.63', totalInspections: '25', oosDefectPerInspection: '0.7', totalDefectPerInspection: '1.5', oosPercent: '44%', oosPerVehicle: '0.79' },
  { monthEnd: '2024 Jul', avgFleetSize: '13.8', convictionPtsPerVeh: '0.14', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.28', cvsaPtsPerVeh: '0.70', totalInspections: '26', oosDefectPerInspection: '0.7', totalDefectPerInspection: '1.6', oosPercent: '46%', oosPerVehicle: '0.86' },
  { monthEnd: '2024 Jun', avgFleetSize: '13.4', convictionPtsPerVeh: '0.14', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.59', cvsaPtsPerVeh: '0.66', totalInspections: '28', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.5', oosPercent: '39%', oosPerVehicle: '0.82' },
  { monthEnd: '2024 May', avgFleetSize: '13.1', convictionPtsPerVeh: '0.15', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.61', cvsaPtsPerVeh: '0.58', totalInspections: '26', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.5', oosPercent: '38%', oosPerVehicle: '0.76' },
  { monthEnd: '2024 Apr', avgFleetSize: '12.9', convictionPtsPerVeh: '0.15', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.62', cvsaPtsPerVeh: '0.36', totalInspections: '21', oosDefectPerInspection: '0.3', totalDefectPerInspection: '1.0', oosPercent: '33%', oosPerVehicle: '0.54' },
  { monthEnd: '2024 Mar', avgFleetSize: '12.0', convictionPtsPerVeh: '0.33', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.50', cvsaPtsPerVeh: '0.47', totalInspections: '19', oosDefectPerInspection: '0.4', totalDefectPerInspection: '1.1', oosPercent: '42%', oosPerVehicle: '0.66' },
  { monthEnd: '2024 Feb', avgFleetSize: '12.0', convictionPtsPerVeh: '0.33', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.33', cvsaPtsPerVeh: '0.48', totalInspections: '16', oosDefectPerInspection: '0.4', totalDefectPerInspection: '1.1', oosPercent: '43%', oosPerVehicle: '0.58' },
  { monthEnd: '2024 Jan', avgFleetSize: '11.0', convictionPtsPerVeh: '0.18', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.36', cvsaPtsPerVeh: '0.46', totalInspections: '14', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.2', oosPercent: '42%', oosPerVehicle: '0.54' },
  { monthEnd: '2023 Dec', avgFleetSize: '11.0', convictionPtsPerVeh: '0.45', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.90', cvsaPtsPerVeh: '0.50', totalInspections: '11', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.4', oosPercent: '45%', oosPerVehicle: '0.45' },
  { monthEnd: '2023 Nov', avgFleetSize: '11.0', convictionPtsPerVeh: '0.45', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '1.09', cvsaPtsPerVeh: '0.55', totalInspections: '10', oosDefectPerInspection: '0.6', totalDefectPerInspection: '1.6', oosPercent: '50%', oosPerVehicle: '0.45' },
  { monthEnd: '2023 Oct', avgFleetSize: '10.0', convictionPtsPerVeh: '0.50', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '1.20', cvsaPtsPerVeh: '0.50', totalInspections: '11', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.4', oosPercent: '45%', oosPerVehicle: '0.50' },
  { monthEnd: '2023 Sep', avgFleetSize: '10.0', convictionPtsPerVeh: '0.50', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.80', cvsaPtsPerVeh: '0.46', totalInspections: '12', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.3', oosPercent: '41%', oosPerVehicle: '0.50' },
  { monthEnd: '2023 Aug', avgFleetSize: '10.0', convictionPtsPerVeh: '0.50', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.80', cvsaPtsPerVeh: '0.43', totalInspections: '10', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.3', oosPercent: '40%', oosPerVehicle: '0.40' },
  { monthEnd: '2023 Jul', avgFleetSize: '10.0', convictionPtsPerVeh: '0.50', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.80', cvsaPtsPerVeh: '0.43', totalInspections: '10', oosDefectPerInspection: '0.5', totalDefectPerInspection: '1.3', oosPercent: '40%', oosPerVehicle: '0.40' },
  { monthEnd: '2023 Jun', avgFleetSize: '10.0', convictionPtsPerVeh: '0.50', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.80', cvsaPtsPerVeh: '0.33', totalInspections: '9', oosDefectPerInspection: '0.4', totalDefectPerInspection: '0.4', oosPercent: '33%', oosPerVehicle: '0.30' },
  { monthEnd: '2023 May', avgFleetSize: '9.0', convictionPtsPerVeh: '0.55', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.88', cvsaPtsPerVeh: '0.38', totalInspections: '8', oosDefectPerInspection: '0.5', totalDefectPerInspection: '0.5', oosPercent: '37%', oosPerVehicle: '0.33' },
  { monthEnd: '2023 Apr', avgFleetSize: '9.0', convictionPtsPerVeh: '0.33', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.88', cvsaPtsPerVeh: '0.40', totalInspections: '5', oosDefectPerInspection: '0.6', totalDefectPerInspection: '0.6', oosPercent: '40%', oosPerVehicle: '0.22' },
  { monthEnd: '2023 Mar', avgFleetSize: '9.0', convictionPtsPerVeh: '0.33', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.88', cvsaPtsPerVeh: '0.31', totalInspections: '4', oosDefectPerInspection: '0.5', totalDefectPerInspection: '0.7', oosPercent: '25%', oosPerVehicle: '0.11' },
  { monthEnd: '2023 Feb', avgFleetSize: '9.0', convictionPtsPerVeh: '0.55', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.88', cvsaPtsPerVeh: '0.31', totalInspections: '4', oosDefectPerInspection: '0.5', totalDefectPerInspection: '0.7', oosPercent: '25%', oosPerVehicle: '0.11' },
  { monthEnd: '2023 Jan', avgFleetSize: '8.0', convictionPtsPerVeh: '0.62', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.75', cvsaPtsPerVeh: '0.00', totalInspections: '2', oosDefectPerInspection: '0.0', totalDefectPerInspection: '0.5', oosPercent: '0%', oosPerVehicle: '0.00' },
  { monthEnd: '2022 Dec', avgFleetSize: '8.0', convictionPtsPerVeh: '0.25', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.50', cvsaPtsPerVeh: '0.00', totalInspections: '2', oosDefectPerInspection: '0.0', totalDefectPerInspection: '0.5', oosPercent: '0%', oosPerVehicle: '0.00' },
  { monthEnd: '2022 Nov', avgFleetSize: '8.0', convictionPtsPerVeh: '0.25', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.50', cvsaPtsPerVeh: '0.00', totalInspections: '2', oosDefectPerInspection: '0.0', totalDefectPerInspection: '0.5', oosPercent: '0%', oosPerVehicle: '0.00' },
  { monthEnd: '2022 Oct', avgFleetSize: '8.0', convictionPtsPerVeh: '0.25', adminPenaltyPtsPerVeh: '0.00', collisionPtsPerVeh: '0.50', cvsaPtsPerVeh: '0.00', totalInspections: '2', oosDefectPerInspection: '0.0', totalDefectPerInspection: '0.5', oosPercent: '0%', oosPerVehicle: '0.00' },
];

const safetyCertificateData: SafetyCertificateRow[] = [
  {
    id: 1,
    certificateNumber: '002300366',
    effectiveDate: '2024 NOV 01',
    expiryDate: '2027 OCT 31',
    issueDate: '2024 AUG 23',
    cancelDate: '-',
    event: 'Renewal Approved',
    status: 'Future',
  },
  {
    id: 2,
    certificateNumber: '002050938',
    effectiveDate: '2021 NOV 03',
    expiryDate: '2024 OCT 31',
    issueDate: '2021 NOV 03',
    cancelDate: '-',
    event: 'Application Approved',
    status: 'Active',
  },
];

const safetyRatingData: SafetyRatingRow[] = [
  { id: 1, effectiveDate: '2024 APR 03', expiryDate: '-', description: 'Conditional' },
  { id: 2, effectiveDate: '2021 NOV 03', expiryDate: '2024 APR 03', description: 'Satisfactory Unaudited' },
];

const operatingStatusData: OperatingStatusRow[] = [
  { id: 1, effectiveDate: '2021 OCT 26', expiryDate: '-', description: 'Federal' },
];

const safetyConditionData: SafetyConditionRow[] = [
  {
    id: 1,
    effectiveDate: '2021 NOV 03',
    expiryDate: '2022 OCT 24',
    dateDue: '2022 NOV 03',
    completedDate: '2022 OCT 24',
    description: 'Complete a New Carrier Compliance Review',
  },
];

const MONTH_TOKEN_TO_INDEX: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const formatMonitoringMonthEnd = (value: string) => {
  const [yearToken, monthTokenRaw] = value.trim().split(/\s+/);
  const monthToken = monthTokenRaw.slice(0, 3).toUpperCase();
  const lastDay = new Date(Date.UTC(Number(yearToken), MONTH_TOKEN_TO_INDEX[monthToken] + 1, 0)).getUTCDate();
  return `${yearToken} ${monthToken} ${lastDay}`;
};

export const parseDisplayDate = (value: string) => {
  const [yearToken, monthTokenRaw, dayTokenRaw] = value.trim().split(/\s+/);
  const monthToken = monthTokenRaw.slice(0, 3).toUpperCase();
  const dayToken = Number(dayTokenRaw);
  return Date.UTC(Number(yearToken), MONTH_TOKEN_TO_INDEX[monthToken], dayToken);
};

const historicalSummaryData: HistoricalSummaryRow[] = [
  ...monitoringTrendData.map((row) => {
    const date = formatMonitoringMonthEnd(row.monthEnd);
    return {
      date,
      type: 'Monitoring',
      jurisdiction: 'AB',
      description: `Fleet Type: Truck, Average fleet size: ${row.avgFleet}; R-Factor: ${Number(row.score).toFixed(2)}${row.stage ? ` Stage: ${row.stage}` : ''}`,
      sortTimestamp: parseDisplayDate(date),
    };
  }),
  ...safetyRatingData.map((row) => ({
    date: row.effectiveDate,
    type: 'Safety Rating',
    jurisdiction: 'AB',
    description: `${row.description}; Effective: ${row.effectiveDate}${row.expiryDate !== '-' ? `; Expiry: ${row.expiryDate}` : ''}`,
    sortTimestamp: parseDisplayDate(row.effectiveDate),
  })),
  ...safetyCertificateData.map((row) => ({
    date: row.issueDate,
    type: 'SFC',
    jurisdiction: 'AB',
    description: `${row.certificateNumber}; Effective: ${row.effectiveDate}; Expiry: ${row.expiryDate}; Issued: ${row.issueDate}; Status: ${row.status}; ${row.event}`,
    sortTimestamp: parseDisplayDate(row.issueDate),
  })),
  ...safetyConditionData.map((row) => ({
    date: row.effectiveDate,
    type: 'Condition',
    jurisdiction: 'AB',
    description: `Effective: ${row.effectiveDate}; Expiry: ${row.expiryDate}; Due: ${row.dateDue}; Completed: ${row.completedDate}; ${row.description}`,
    sortTimestamp: parseDisplayDate(row.effectiveDate),
  })),
  ...operatingStatusData.map((row) => ({
    date: row.effectiveDate,
    type: 'Operating Status',
    jurisdiction: 'AB',
    description: `${row.description}; Effective: ${row.effectiveDate}`,
    sortTimestamp: parseDisplayDate(row.effectiveDate),
  })),
  ...cvsaDetailsData.map((row) => ({
    date: row.date,
    type: 'CVSA',
    jurisdiction: row.jur,
    description: `OPI ${row.doc}; Result: ${row.result}; Plate: ${row.plate}`,
    sortTimestamp: parseDisplayDate(row.date),
  })),
  ...collisionData.map((row) => ({
    date: row.date,
    type: 'Collision',
    jurisdiction: row.jur,
    description: `${row.doc}; Result: ${row.severity}; Plate: ${row.plate}`,
    sortTimestamp: parseDisplayDate(row.date),
  })),
  ...convictionDetailsData.map((row) => ({
    date: row.date,
    type: 'Conviction',
    jurisdiction: row.jur,
    description: `${row.doc}; CCMTA: ${row.ccmta}; Conviction Date: ${row.convictionDate}; Plate: ${row.vehicle}`,
    sortTimestamp: parseDisplayDate(row.date),
  })),
].sort((a, b) => b.sortTimestamp - a.sortTimestamp);

const historicalSummaryTotals = [
  { label: 'CVSA', value: cvsaDetailsData.length },
  { label: 'Monitoring', value: monitoringTrendData.length },
  { label: 'Collision', value: collisionData.length },
  { label: 'Conviction', value: convictionDetailsData.length },
  { label: 'Safety Rating', value: safetyRatingData.length },
  { label: 'SFC', value: safetyCertificateData.length },
  { label: 'Condition', value: safetyConditionData.length },
  { label: 'Operating', value: operatingStatusData.length },
];

const formatSectionPercent = (value: number) => `${value.toFixed(2)}%`;

const totalViolationGroups = violationSummaryData.reduce((sum, row) => sum + row.count, 0);
const activeCertificateCount = safetyCertificateData.filter((row) => row.status === 'Active').length;
const historicalTotalCount = historicalSummaryData.length;
const historicalCvsaShare = historicalTotalCount > 0 ? (cvsaDetailsData.length / historicalTotalCount) * 100 : 0;
const totalCvsaOosDefects = cvsaSummaryData.reduce((sum, row) => sum + (row.oos ?? 0), 0);
const totalCvsaRequiresAttentionDefects = cvsaSummaryData.reduce((sum, row) => sum + (row.req ?? 0), 0);
const totalCvsaDefects = cvsaSummaryData.reduce((sum, row) => sum + (row.total ?? 0), 0);

const accordionSectionMeta: Record<string, AccordionSectionMeta> = {
  'CONVICTION ANALYSIS': {
    subtitle: '5 conviction events | offence mix and detailed conviction history',
    summaryLabel: 'Contribution',
    summaryValue: '34.60%',
    badgeLabel: 'OK',
    badgeTone: 'green',
  },
  'CVSA INSPECTION ANALYSIS': {
    subtitle: '43 inspections | 19 pass, 7 req. attn, 17 OOS',
    summaryLabel: 'Contribution',
    summaryValue: '32.30%',
    badgeLabel: 'OK',
    badgeTone: 'green',
  },
  'COLLISION SUMMARY': {
    subtitle: '6 events | 4 damage, 2 injury',
    summaryLabel: 'Contribution',
    summaryValue: '33.10%',
    badgeLabel: 'OK',
    badgeTone: 'green',
  },
  'VIOLATION ANALYSIS': {
    subtitle: '3 violation occurrences | grouped categories and detailed violation history',
    summaryLabel: 'Grouped Total',
    summaryValue: formatSectionPercent(totalViolationGroups),
    badgeLabel: `${violationDetailsData.length} occurrences`,
    badgeTone: 'blue',
  },
  'MONITORING SUMMARY': {
    subtitle: '24 month-end snapshots | fleet trends, stages, and detailed inspection metrics',
    summaryLabel: 'Latest OOS',
    summaryValue: monitoringDetailData[0]?.oosPercent || '0%',
    badgeLabel: `${monitoringTrendData.length} months`,
    badgeTone: 'blue',
  },
  'SAFETY FITNESS INFORMATION': {
    subtitle: '2 certificates | 2 ratings, 1 condition, 1 operating status',
    summaryLabel: 'Active Certs',
    summaryValue: formatSectionPercent(safetyCertificateData.length > 0 ? (activeCertificateCount / safetyCertificateData.length) * 100 : 0),
    badgeLabel: `${safetyCertificateData.length} certificates`,
    badgeTone: 'blue',
  },
  'HISTORICAL SUMMARY': {
    subtitle: `${historicalTotalCount} timeline events | monitoring, CVSA, collisions, convictions, and safety actions`,
    summaryLabel: 'CVSA Share',
    summaryValue: formatSectionPercent(historicalCvsaShare),
    badgeLabel: `${historicalTotalCount} events`,
    badgeTone: 'blue',
  },
};


// ── Component ─────────────────────────────────────────────────────────────────

export function NscAnalysis() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedInspections, setExpandedInspections] = useState<Record<number, boolean>>({});
  const [expandedViolations, setExpandedViolations] = useState<Record<number, boolean>>({});
  const [expandedMonitoringRows, setExpandedMonitoringRows] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) => setExpandedSection(prev => prev === id ? null : id);
  const toggleInspection = (id: number) => setExpandedInspections(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleViolation = (id: number) => setExpandedViolations(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleMonitoringRow = (id: string) => setExpandedMonitoringRows(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <h3 className="text-base font-bold text-slate-900">NSC Analysis</h3>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded uppercase tracking-wide">NSC</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors">
            R-Factor Formula
            <Info size={12} className="text-slate-400" />
          </button>
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400 px-2">Updated December 2025</span>
        </div>
      </div>

      {/* ── KPI Strip ── */}

      {/* ── Accordion sections ── */}
      <div className="p-4 space-y-2">
        {accordionSections.map(section => {
          const isOpen = expandedSection === section.id;
          const meta = accordionSectionMeta[section.id];
          const badgeToneClass =
            meta?.badgeTone === 'green' ? 'bg-emerald-100 text-emerald-700' :
            meta?.badgeTone === 'amber' ? 'bg-amber-100 text-amber-700'   :
            meta?.badgeTone === 'slate' ? 'bg-slate-100 text-slate-500'   :
            'bg-indigo-100 text-indigo-700';

          return (
            <div key={section.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{section.title}</h4>
                    {meta?.subtitle && (
                      <p className="text-xs text-slate-500 mt-0.5 normal-case tracking-normal font-normal truncate">{meta.subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
                  {meta?.summaryValue && (
                    <span className="text-xs text-slate-500 hidden sm:block">
                      {meta.summaryLabel}: <span className="font-bold text-slate-700">{meta.summaryValue}</span>
                    </span>
                  )}
                  {meta?.badgeLabel && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wide ${badgeToneClass}`}>{meta.badgeLabel}</span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

                {/* ── CONVICTION ANALYSIS ── */}
                {isOpen && section.id === 'CONVICTION ANALYSIS' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Conviction Summary</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                              <th className="px-4 py-3 font-medium text-center">Number of Convictions</th>
                              <th className="px-4 py-3 font-medium text-center">Percent of Total</th>
                              <th className="px-4 py-3 font-medium text-left">Group Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {convictionSummaryData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className={`px-4 py-2 text-center ${row.count > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}`}>{row.count}</td>
                                <td className={`px-4 py-2 text-center ${row.count > 0 ? 'font-medium text-slate-600' : 'text-slate-400'}`}>{row.percent}</td>
                                <td className={`px-4 py-2 text-left ${row.count > 0 ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{row.group}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold text-slate-800 border-t border-slate-200">
                              <td className="px-4 py-3 text-center">5</td>
                              <td className="px-4 py-3 text-center">100%</td>
                              <td className="px-4 py-3 text-left">TOTAL CONVICTIONS</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Occurrence Details</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider bg-slate-50">
                              <th className="px-4 py-3 font-medium">Occurrence Date</th>
                              <th className="px-4 py-3 font-medium">Document / Docket #</th>
                              <th className="px-4 py-3 font-medium">Offence Details</th>
                              <th className="px-4 py-3 font-medium">Vehicle / Driver</th>
                              <th className="px-4 py-3 font-medium text-right">Active Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {convictionDetailsData.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 align-top">
                                  <div className="text-slate-900 font-bold">{item.date}</div>
                                  {item.time !== '-' && <div className="text-xs text-slate-500 mt-0.5">{item.time}</div>}
                                  {item.location !== '-' && <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate" title={item.location}>{item.location}</div>}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="text-slate-800 font-medium">{item.doc}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">Docket: {item.docket}</div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-[200px]" title={item.description}>{item.description}</span>
                                    <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{item.jur}</span>
                                  </div>
                                  {item.ccmta !== '-' && <div className="text-[10px] text-slate-500 mt-1">CCMTA: {item.ccmta}</div>}
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="text-slate-800 font-medium">{item.vehicle}</div>
                                  <div className="text-xs text-slate-500 mt-0.5 max-w-[150px] truncate" title={item.driver}>{item.driver}</div>
                                </td>
                                <td className="px-4 py-3 text-right align-top">
                                  <div className={`text-lg font-bold ${item.points > 0 ? 'text-red-600' : 'text-slate-800'}`}>{item.points}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── COLLISION SUMMARY ── */}
                {isOpen && section.id === 'CVSA INSPECTION ANALYSIS' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">CVSA Defect Summary</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                              <th className="px-4 py-3 font-medium text-center">Number of Out of Service</th>
                              <th className="px-4 py-3 font-medium text-center">Defects Requires Attention</th>
                              <th className="px-4 py-3 font-medium text-center">Total Defects</th>
                              <th className="px-4 py-3 font-medium text-right">Percent of Total</th>
                              <th className="px-4 py-3 font-medium text-left">Defect Category / Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {cvsaSummaryData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className={`px-4 py-2 text-center ${row.oos ? 'font-bold text-red-600' : 'text-slate-300'}`}>{row.oos ?? '-'}</td>
                                <td className={`px-4 py-2 text-center ${row.req ? 'font-bold text-amber-600' : 'text-slate-300'}`}>{row.req ?? '-'}</td>
                                <td className={`px-4 py-2 text-center ${row.total ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.total ?? '-'}</td>
                                <td className={`px-4 py-2 text-right ${row.percent ? 'font-medium text-slate-600' : 'text-slate-300'}`}>{row.percent ?? '-'}</td>
                                <td className={`px-4 py-2 text-left ${row.total ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{row.desc}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200 text-xs">
                              <td className="px-4 py-3 text-center text-red-700">{totalCvsaOosDefects}</td>
                              <td className="px-4 py-3 text-center text-amber-700">{totalCvsaRequiresAttentionDefects}</td>
                              <td className="px-4 py-3 text-center">{totalCvsaDefects}</td>
                              <td className="px-4 py-3 text-right">100%</td>
                              <td className="px-4 py-3 text-left uppercase">Grand Total Defects</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Inspection List</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                              <th className="px-4 py-3 font-medium text-center">Inspection</th>
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">CVSA Document</th>
                              <th className="px-4 py-3 font-medium text-center">Jur</th>
                              <th className="px-4 py-3 font-medium">Agency</th>
                              <th className="px-4 py-3 font-medium">Plate</th>
                              <th className="px-4 py-3 font-medium text-center">Level</th>
                              <th className="px-4 py-3 font-medium text-right">Result</th>
                              <th className="px-4 py-3 font-medium text-center w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {cvsaDetailsData.map((item) => {
                              let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
                              if (item.result === 'Passed') badgeClass = 'bg-green-50 text-green-700 border-green-200';
                              if (item.result === 'Requires Attention') badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
                              if (item.result === 'Out Of Service') badgeClass = 'bg-red-50 text-red-700 border-red-200';
                              const rowOpen = expandedInspections[item.id];
                              const oosRows = item.details?.oosRows ?? item.details?.oos.map((category) => ({ category, vehicleCounts: [1, null, null, null, null, null, null] })) ?? [];
                              const reqRows = item.details?.reqRows ?? item.details?.req.map((category) => ({ category, vehicleCounts: [1, null, null, null, null, null, null] })) ?? [];
                              return (
                                <Fragment key={item.id}>
                                  <tr
                                    className={`hover:bg-slate-50 transition-colors ${item.details ? 'cursor-pointer' : ''} ${rowOpen ? 'bg-slate-50' : ''}`}
                                    onClick={() => item.details && toggleInspection(item.id)}
                                  >
                                    <td className="px-4 py-3 text-center font-bold text-slate-500">{item.id}</td>
                                    <td className="px-4 py-3 text-slate-900 font-medium">{item.date}</td>
                                    <td className="px-4 py-3 text-slate-700 font-medium">OPI {item.doc}</td>
                                    <td className="px-4 py-3 text-center">
                                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{item.jur}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{item.details?.agency ?? '-'}</td>
                                    <td className="px-4 py-3 text-slate-800 font-medium">{item.plate}</td>
                                    <td className="px-4 py-3 text-center font-bold text-slate-600">{item.level}</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className={`border text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide ${badgeClass}`}>{item.result}</span>
                                    </td>
                                    <td className="px-4 py-3 text-center w-10 text-slate-400">
                                      {item.details && (rowOpen ? <ChevronUp className="w-4 h-4 mx-auto" /> : <ChevronDown className="w-4 h-4 mx-auto" />)}
                                    </td>
                                  </tr>
                                  {rowOpen && item.details && (
                                    <tr>
                                      <td colSpan={9} className="p-0 border-b border-slate-200 bg-slate-100/40">
                                        <div className="p-4 shadow-inner space-y-4">
                                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Inspection Date</div>
                                              <div className="text-sm font-medium text-slate-800">{item.date}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Time</div>
                                              <div className="text-sm font-medium text-slate-800">{item.details.time}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Document / Jur</div>
                                              <div className="text-sm font-medium text-slate-800">OPI {item.doc}</div>
                                              <div className="text-xs text-slate-500">{item.jur}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Level / Result</div>
                                              <div className="text-sm font-medium text-slate-800">Level {item.level}</div>
                                              <div className="text-xs text-slate-500">{item.result}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Date Entered</div>
                                              <div className="text-sm font-medium text-slate-800">{item.details.dateEntered}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Agency</div>
                                              <div className="text-sm font-medium text-slate-800">{item.details.agency}</div>
                                            </div>
                                          </div>
                                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Location</div>
                                              <div className="text-sm font-medium text-slate-800">{item.details.location}</div>
                                            </div>
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-1">Driver</div>
                                              <div className="text-sm font-medium text-slate-800">{item.details.driver}</div>
                                            </div>
                                          </div>
                                          {item.details.vehicles.length > 0 && (
                                            <div>
                                              <div className="text-[10px] uppercase text-slate-500 font-bold mb-2">Vehicles</div>
                                              <div className="overflow-x-auto rounded-lg border border-slate-200">
                                                <table className="w-full text-xs">
                                                  <thead className="bg-slate-50 border-b border-slate-100">
                                                    <tr>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Plate</th>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Jur</th>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">VIN</th>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Year</th>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">Make</th>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-400 uppercase tracking-wider">CVSA Decal #</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-50">
                                                    {item.details.vehicles.map((vehicle, vehicleIndex) => (
                                                      <tr key={vehicleIndex} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2 font-bold text-slate-600">{vehicle.type}</td>
                                                        <td className="px-3 py-2 font-mono text-slate-800">{vehicle.plate}</td>
                                                        <td className="px-3 py-2 text-slate-700">{vehicle.jur ?? '-'}</td>
                                                        <td className="px-3 py-2 font-mono text-slate-500">{vehicle.vin ?? '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{vehicle.year ?? '-'}</td>
                                                        <td className="px-3 py-2 text-slate-700">{vehicle.make}</td>
                                                        <td className="px-3 py-2 text-slate-700">{vehicle.decal ?? '-'}</td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          )}
                                          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                            <div className="rounded-lg border border-red-100 bg-white">
                                              <div className="border-b border-red-100 px-4 py-3">
                                                <div className="text-[10px] uppercase text-red-600 font-bold tracking-wider">Out of Service</div>
                                                <div className="mt-1 text-xs text-slate-500">Number of out of service defects by vehicle</div>
                                              </div>
                                              <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                  <thead className="bg-red-50/60">
                                                    <tr>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Defect Category / Description</th>
                                                      {Array.from({ length: 7 }, (_, index) => (
                                                        <th key={index} className="px-3 py-2 text-center font-bold text-slate-500 uppercase tracking-wider">{index + 1}</th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {oosRows.length > 0 ? oosRows.map((row, rowIndex) => (
                                                      <tr key={`${item.id}-oos-${rowIndex}`}>
                                                        <td className="px-3 py-2 font-medium text-slate-800">{row.category}</td>
                                                        {Array.from({ length: 7 }, (_, index) => (
                                                          <td key={index} className="px-3 py-2 text-center text-slate-600">{row.vehicleCounts[index] ?? '-'}</td>
                                                        ))}
                                                      </tr>
                                                    )) : (
                                                      <tr>
                                                        <td colSpan={8} className="px-3 py-4 text-center text-slate-400">No out of service defects on this inspection.</td>
                                                      </tr>
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                            <div className="rounded-lg border border-amber-100 bg-white">
                                              <div className="border-b border-amber-100 px-4 py-3">
                                                <div className="text-[10px] uppercase text-amber-600 font-bold tracking-wider">Requires Attention</div>
                                                <div className="mt-1 text-xs text-slate-500">Number of requires attention defects by vehicle</div>
                                              </div>
                                              <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                  <thead className="bg-amber-50/60">
                                                    <tr>
                                                      <th className="px-3 py-2 text-left font-bold text-slate-500 uppercase tracking-wider">Defect Category / Description</th>
                                                      {Array.from({ length: 7 }, (_, index) => (
                                                        <th key={index} className="px-3 py-2 text-center font-bold text-slate-500 uppercase tracking-wider">{index + 1}</th>
                                                      ))}
                                                    </tr>
                                                  </thead>
                                                  <tbody className="divide-y divide-slate-100">
                                                    {reqRows.length > 0 ? reqRows.map((row, rowIndex) => (
                                                      <tr key={`${item.id}-req-${rowIndex}`}>
                                                        <td className="px-3 py-2 font-medium text-slate-800">{row.category}</td>
                                                        {Array.from({ length: 7 }, (_, index) => (
                                                          <td key={index} className="px-3 py-2 text-center text-slate-600">{row.vehicleCounts[index] ?? '-'}</td>
                                                        ))}
                                                      </tr>
                                                    )) : (
                                                      <tr>
                                                        <td colSpan={8} className="px-3 py-4 text-center text-slate-400">No requires attention defects on this inspection.</td>
                                                      </tr>
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {isOpen && section.id === 'COLLISION SUMMARY' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Collision Summary</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                              <th className="px-4 py-3 font-medium text-left">Severity</th>
                              <th className="px-4 py-3 font-medium text-center">Supported</th>
                              <th className="px-4 py-3 font-medium text-center">Not Supported / Not Reviewed</th>
                              <th className="px-4 py-3 font-medium text-center">Total</th>
                              <th className="px-4 py-3 font-medium text-right">Active Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {collisionSummaryData.map((row) => (
                              <tr key={row.severity} className="hover:bg-slate-50 transition-colors">
                                <td className={`px-4 py-3 ${row.total > 0 ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{row.severity}</td>
                                <td className={`px-4 py-3 text-center ${row.supported > 0 ? 'font-bold text-emerald-700' : 'text-slate-300'}`}>{row.supported || '-'}</td>
                                <td className={`px-4 py-3 text-center ${row.notSupported > 0 ? 'font-bold text-slate-700' : 'text-slate-300'}`}>{row.notSupported || '-'}</td>
                                <td className={`px-4 py-3 text-center ${row.total > 0 ? 'font-bold text-slate-800' : 'text-slate-300'}`}>{row.total || '-'}</td>
                                <td className={`px-4 py-3 text-right ${row.points > 0 ? 'font-bold text-red-600' : 'text-slate-500'}`}>{row.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Collision Events</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider bg-slate-50">
                              <th className="px-4 py-3 font-medium text-center">Collision</th>
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">Document</th>
                              <th className="px-4 py-3 font-medium text-center">Jur</th>
                              <th className="px-4 py-3 font-medium">Plate</th>
                              <th className="px-4 py-3 font-medium">Severity</th>
                              <th className="px-4 py-3 font-medium">Driver</th>
                              <th className="px-4 py-3 font-medium text-right">Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {collisionData.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-center font-bold text-slate-500">{item.id}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-900">{item.date}</div>
                                  <div className="text-[10px] text-slate-400">{item.entered}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-800">{item.doc}</div>
                                  <div className="text-[10px] text-slate-500">{item.location}</div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{item.jur}</span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-800">{item.plate}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex rounded px-2 py-1 text-[10px] font-bold uppercase ${item.severityColor}`}>{item.severity}</span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-slate-800">{item.driver}</div>
                                  <div className="text-[10px] text-slate-500">{item.status}</div>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-slate-700">{item.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {isOpen && section.id === 'VIOLATION ANALYSIS' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Violation Summary</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase bg-slate-50">
                              <th className="px-4 py-3 font-medium text-center">Number of Violations</th>
                              <th className="px-4 py-3 font-medium text-center">Percent of Total</th>
                              <th className="px-4 py-3 font-medium text-left">Group Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {violationSummaryData.map((row, idx) => (
                              <tr key={idx} className={`hover:bg-slate-50 transition-colors ${row.count === 0 ? 'opacity-50' : ''}`}>
                                <td className={`px-4 py-2 text-center font-mono ${row.count > 0 ? 'font-bold text-slate-800' : 'text-slate-400'}`}>{row.count}</td>
                                <td className={`px-4 py-2 text-center ${row.count > 0 ? 'font-semibold text-slate-700' : 'text-slate-400'}`}>{row.percent}</td>
                                <td className={`px-4 py-2 text-left font-medium ${row.count > 0 ? 'text-slate-900' : 'text-slate-400'}`}>{row.group}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-bold text-slate-800 border-t-2 border-slate-300">
                              <td className="px-4 py-3 text-center font-black text-slate-900">{violationSummaryData.reduce((s, r) => s + r.count, 0)}</td>
                              <td className="px-4 py-3 text-center font-black text-slate-900">100%</td>
                              <td className="px-4 py-3 text-left uppercase tracking-wide">Total Violations</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Violation Occurrence Summary</h5>
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                        <table className="min-w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-3 py-2.5 font-bold">Date</th>
                              <th className="px-3 py-2.5 font-bold">Document / Violation</th>
                              <th className="px-3 py-2.5 font-bold text-center">Code</th>
                              <th className="px-3 py-2.5 font-bold">Category</th>
                              <th className="px-3 py-2.5 font-bold">Description</th>
                              <th className="px-3 py-2.5 font-bold text-center">Risk Level</th>
                              <th className="px-3 py-2.5 font-bold text-center">Severity</th>
                              <th className="px-3 py-2.5 font-bold text-center">Weight</th>
                              <th className="px-3 py-2.5 font-bold text-center">Points</th>
                              <th className="px-3 py-2.5 font-bold text-center">OOS</th>
                              <th className="px-3 py-2.5 font-bold text-center">Jur</th>
                              <th className="px-3 py-2.5 font-bold">Vehicle</th>
                              <th className="px-3 py-2.5 font-bold">Driver</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {violationDetailsData.map((row) => {
                              const rowOpen = expandedViolations[row.id];
                              const numCode  = parseCcmtaCode(row.ccmtaCode);
                              const catalog  = NSC_VIOLATION_CATALOG[numCode];
                              const sys      = NSC_CODE_TO_SYSTEM[numCode];
                              const sev      = row.severity ?? catalog?.severity;
                              const isOos    = sev === 'OOS';
                              const baseWt   = sys?.riskLevel === 'High' ? 3 : sys?.riskLevel === 'Medium' ? 2 : 1;
                              const totalPts = baseWt + (isOos ? 1 : 0);
                              const sevCls   = sev === 'OOS'   ? 'bg-red-50 text-red-700 border-red-200' :
                                               sev === 'Major' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                 'bg-slate-100 text-slate-600 border-slate-200';
                              const riskCls  = sys?.riskLevel === 'High'   ? 'bg-red-50 text-red-700 border-red-200' :
                                               sys?.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                             'bg-slate-100 text-slate-600 border-slate-200';
                              const ptsCls   = totalPts >= 4 ? 'bg-red-600 text-white' :
                                               totalPts >= 3 ? 'bg-red-500 text-white' :
                                               totalPts >= 2 ? 'bg-amber-500 text-white' :
                                                               'bg-slate-400 text-white';
                              return (
                                <Fragment key={row.id}>
                                  <tr
                                    className={`group hover:bg-blue-50/30 transition-colors align-middle cursor-pointer ${rowOpen ? 'bg-blue-50/20' : ''}`}
                                    onClick={() => toggleViolation(row.id)}
                                  >
                                    {/* Date */}
                                    <td className="px-3 py-3">
                                      <div className="font-semibold text-slate-900 text-[13px]">{row.date}</div>
                                      <div className="mt-0.5 text-[10px] text-slate-400 font-mono">{row.time}</div>
                                    </td>
                                    {/* Document / Violation */}
                                    <td className="px-3 py-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <div>
                                          <div className="font-mono font-semibold text-slate-800 text-[13px]">{row.document}</div>
                                          <div className="mt-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wide">{row.description}</div>
                                        </div>
                                        <div className={`shrink-0 transition-transform duration-150 ${rowOpen ? 'rotate-180' : ''}`}>
                                          <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                                        </div>
                                      </div>
                                    </td>
                                    {/* Code */}
                                    <td className="px-3 py-3 text-center">
                                      <span className="font-mono font-black text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[12px]">{numCode || '—'}</span>
                                    </td>
                                    {/* Category */}
                                    <td className="px-3 py-3">
                                      <span className="text-[12px] font-semibold text-slate-700">{sys?.categoryLabel ?? '—'}</span>
                                    </td>
                                    {/* Description */}
                                    <td className="px-3 py-3">
                                      <span className="text-[12px] text-slate-600">{catalog?.description ?? row.description}</span>
                                    </td>
                                    {/* Risk Level */}
                                    <td className="px-3 py-3 text-center">
                                      {sys?.riskLevel
                                        ? <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${riskCls}`}>{sys.riskLevel}</span>
                                        : <span className="text-slate-300">—</span>}
                                    </td>
                                    {/* Severity */}
                                    <td className="px-3 py-3 text-center">
                                      {sev
                                        ? <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wide ${sevCls}`}>{sev}</span>
                                        : <span className="text-slate-300">—</span>}
                                    </td>
                                    {/* Weight */}
                                    <td className="px-3 py-3 text-center">
                                      <span className="font-mono font-bold text-slate-700 text-[13px]">{baseWt}</span>
                                    </td>
                                    {/* Points */}
                                    <td className="px-3 py-3 text-center">
                                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-black ${ptsCls}`}>{totalPts}</span>
                                    </td>
                                    {/* OOS */}
                                    <td className="px-3 py-3 text-center">
                                      {isOos
                                        ? <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold bg-red-50 text-red-700 border-red-200">YES</span>
                                        : <span className="inline-flex px-2 py-0.5 rounded border text-[10px] font-bold bg-slate-50 text-slate-400 border-slate-200">NO</span>}
                                    </td>
                                    {/* Jur */}
                                    <td className="px-3 py-3 text-center">
                                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 border border-slate-200">{row.jurisdiction}</span>
                                    </td>
                                    {/* Vehicle */}
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-5 h-5 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                          <Truck size={10} className="text-slate-500" />
                                        </div>
                                        <div>
                                          <div className="font-mono font-bold text-slate-800 text-[12px]">{row.vehicle}</div>
                                          <div className="text-[10px] text-slate-400 font-mono">{row.commodity}</div>
                                        </div>
                                      </div>
                                    </td>
                                    {/* Driver */}
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[9px] font-bold text-blue-600">
                                          {row.driver.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                                        </div>
                                        <div className="text-[12px] font-semibold text-slate-800">{row.driver}</div>
                                      </div>
                                    </td>
                                  </tr>

                                  {rowOpen && (
                                    <tr>
                                      <td colSpan={13} className="p-0 border-t border-slate-200">
                                        <div className="bg-slate-50/70 px-4 pt-4 pb-5 space-y-4">

                                          {/* ── Meta grid: 3 equal-height cards ── */}
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
                                            {/* Date / Time / Location */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <MapPin size={10} /> Date / Time / Location
                                              </div>
                                              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                                                <div>
                                                  <div className="text-[13px] font-bold text-slate-900">{row.date} · {row.time}</div>
                                                  <div className="mt-1.5 text-xs text-slate-500 flex items-center gap-1.5">
                                                    <MapPin size={10} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{row.location}</span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-auto">
                                                  <span className="text-[10px] bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-700">{row.jurisdiction}</span>
                                                  <span className="text-[10px] text-slate-400">Entered: <span className="font-medium text-slate-500">{row.dateEntered}</span></span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Issuing Agency */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Building2 size={10} /> Issuing Agency
                                              </div>
                                              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
                                                <div className="flex items-start gap-3">
                                                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                                                    <ShieldAlert size={15} className="text-blue-500" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="text-[13px] font-bold text-slate-900 leading-snug">{row.issuingAgency}</div>
                                                    <div className="mt-0.5 text-[11px] text-slate-400">Enforcement Authority</div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-auto">
                                                  <span className="text-[10px] text-slate-400">Document:</span>
                                                  <span className="text-[11px] font-mono font-semibold text-slate-700">{row.document}</span>
                                                </div>
                                              </div>
                                            </div>

                                            {/* Driver / Vehicle */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <User size={10} /> Driver / Vehicle
                                              </div>
                                              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                                <div className="flex items-center gap-3 px-4 py-3 flex-1 border-b border-slate-100">
                                                  <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-blue-600">
                                                    {row.driver.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="text-[13px] font-semibold text-slate-900 truncate">{row.driver}</div>
                                                    <div className="text-[11px] text-slate-400">Driver</div>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-3 px-4 py-3 flex-1">
                                                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                                    <Truck size={14} className="text-slate-500" />
                                                  </div>
                                                  <div className="min-w-0">
                                                    <div className="text-[13px] font-bold font-mono text-slate-900">{row.vehicle}</div>
                                                    <div className="text-[11px] font-mono text-slate-400">{row.commodity}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>

                                          {/* ── Legislative Reference + Risk Matrix ── */}
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                                            {/* Legislative Reference */}
                                            <div className="flex flex-col gap-1.5">
                                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Info size={10} /> Legislative Reference
                                              </div>
                                              <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                                <div className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center justify-between">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CCMTA Code</span>
                                                    {(() => {
                                                      const numCode = parseCcmtaCode(row.ccmtaCode);
                                                      const label  = row.ccmtaCode.replace(/^\d+\s*/, '');
                                                      return (
                                                        <>
                                                          <span className="font-mono font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-sm shadow-sm">{numCode || row.ccmtaCode}</span>
                                                          {label && <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>}
                                                        </>
                                                      );
                                                    })()}
                                                  </div>
                                                  {sev && <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border shrink-0 ${sevCls}`}>{sev}</span>}
                                                </div>
                                                <div className="p-4 space-y-3 flex-1">
                                                  <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Act / Section</div>
                                                    <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-800">{row.actSection}</div>
                                                  </div>
                                                  {row.text && (
                                                    <div>
                                                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Officer Notes</div>
                                                      <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5 text-[13px] text-amber-900 italic leading-relaxed">"{row.text}"</div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>

                                            {/* System Violation Risk Matrix */}
                                            {(() => {
                                              const numCode = parseCcmtaCode(row.ccmtaCode);
                                              const sys = NSC_CODE_TO_SYSTEM[numCode];
                                              if (!sys) return <div />;
                                              const isHigh = sys.riskLevel === 'High';
                                              const isMed  = sys.riskLevel === 'Medium';
                                              const borderCls = isHigh ? 'border-red-200'   : isMed ? 'border-amber-200'  : 'border-slate-200';
                                              const bgCls     = isHigh ? 'bg-red-50'        : isMed ? 'bg-amber-50'       : 'bg-slate-50';
                                              const cellCls   = isHigh ? 'bg-white border-red-100'   : isMed ? 'bg-white border-amber-100'  : 'bg-white border-slate-100';
                                              const badgeCls  = isHigh ? 'bg-red-100 text-red-700 border-red-200' : isMed ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200';
                                              const iconCls   = isHigh ? 'text-red-500'     : isMed ? 'text-amber-500'    : 'text-slate-400';
                                              return (
                                                <div className="flex flex-col gap-1.5">
                                                  <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5`}>
                                                    <ShieldAlert size={10} className={iconCls} /> System Violation Risk Matrix
                                                  </div>
                                                  <div className={`flex-1 rounded-xl border shadow-sm overflow-hidden flex flex-col ${borderCls}`}>
                                                    <div className={`border-b ${borderCls} ${bgCls} px-4 py-2.5 flex items-center justify-between`}>
                                                      <span className="text-[11px] font-semibold text-slate-700">Risk Assessment</span>
                                                      <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${badgeCls}`}>{sys.riskLevel} Risk</span>
                                                    </div>
                                                    <div className={`flex-1 p-4 ${bgCls}`}>
                                                      <div className="grid grid-cols-3 gap-2 h-full">
                                                        <div className={`rounded-lg border px-3 py-3 ${cellCls}`}>
                                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">System Category</div>
                                                          <div className="text-[13px] font-bold text-slate-800 leading-tight">{sys.categoryLabel}</div>
                                                        </div>
                                                        <div className={`rounded-lg border px-3 py-3 ${cellCls}`}>
                                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Violation Group</div>
                                                          <div className="text-[13px] font-bold text-slate-800 leading-tight">{sys.violationGroup}</div>
                                                        </div>
                                                        <div className={`rounded-lg border px-3 py-3 ${cellCls}`}>
                                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">NSC Section</div>
                                                          <div className="text-[13px] font-bold text-slate-800">{sys.nscSection ?? '—'}</div>
                                                          <div className="text-[10px] font-mono text-slate-400 mt-1">{sys.category}</div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>

                                          {/* ── Impact Analysis ── */}
                                          {(() => {
                                            const numCode = parseCcmtaCode(row.ccmtaCode);
                                            const sys = NSC_CODE_TO_SYSTEM[numCode];
                                            if (!sys) return null;
                                            const isOos      = sev === 'OOS';
                                            const basePoints = sys.riskLevel === 'High' ? 3 : sys.riskLevel === 'Medium' ? 2 : 1;
                                            const oosBonus   = isOos ? 1 : 0;
                                            const total      = basePoints + oosBonus;
                                            const totalColor = total >= 4 ? 'text-red-600' : total >= 3 ? 'text-red-500' : total >= 2 ? 'text-amber-600' : 'text-slate-700';
                                            const totalBg    = total >= 4 ? 'bg-red-600'   : total >= 3 ? 'bg-red-500'   : total >= 2 ? 'bg-amber-500'   : 'bg-slate-500';
                                            const impactLabel = total >= 4 ? 'Critical' : total >= 3 ? 'High' : total >= 2 ? 'Moderate' : 'Low';
                                            const impactDesc  = total >= 4
                                              ? 'OOS violation in a high-risk category. Immediate corrective action required. Significant carrier score impact.'
                                              : total >= 3
                                              ? 'High-risk violation with direct NSC score impact. Corrective action strongly recommended.'
                                              : total >= 2
                                              ? 'Moderate-risk violation. Review maintenance and compliance procedures.'
                                              : 'Low-risk administrative violation. Monitor for recurrence.';
                                            const borderCls = total >= 3 ? 'border-red-200' : total >= 2 ? 'border-amber-200' : 'border-slate-200';
                                            const bgCls     = total >= 3 ? 'bg-red-50'      : total >= 2 ? 'bg-amber-50'      : 'bg-slate-50';
                                            return (
                                              <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                                                  <ShieldAlert size={10} className={total >= 3 ? 'text-red-500' : total >= 2 ? 'text-amber-500' : 'text-slate-400'} /> Impact Analysis
                                                </div>
                                                <div className={`rounded-xl border shadow-sm overflow-hidden ${borderCls}`}>
                                                  <div className={`px-4 py-2.5 border-b ${borderCls} ${bgCls} flex items-center justify-between`}>
                                                    <span className="text-[11px] font-semibold text-slate-700">NSC Carrier Score Impact</span>
                                                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                                                      total >= 4 ? 'bg-red-100 text-red-700 border-red-200' :
                                                      total >= 3 ? 'bg-red-100 text-red-700 border-red-200' :
                                                      total >= 2 ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                   'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>{impactLabel} Impact</span>
                                                  </div>
                                                  <div className={`p-4 ${bgCls}`}>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                      {/* Base Points */}
                                                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-3">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Base Points</div>
                                                        <div className="flex items-end gap-1.5">
                                                          <span className="text-2xl font-black text-slate-800 leading-none">{basePoints}</span>
                                                          <span className="text-[11px] text-slate-400 mb-0.5">pts</span>
                                                        </div>
                                                        <div className="mt-1 text-[10px] text-slate-400">{sys.riskLevel} Risk Level</div>
                                                      </div>
                                                      {/* OOS Bonus */}
                                                      <div className={`rounded-lg px-3 py-3 border ${isOos ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">OOS Bonus</div>
                                                        <div className="flex items-end gap-1.5">
                                                          <span className={`text-2xl font-black leading-none ${isOos ? 'text-red-600' : 'text-slate-300'}`}>+{oosBonus}</span>
                                                          <span className={`text-[11px] mb-0.5 ${isOos ? 'text-red-400' : 'text-slate-300'}`}>pts</span>
                                                        </div>
                                                        <div className={`mt-1 text-[10px] ${isOos ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>{isOos ? 'Out-of-Service' : 'Not OOS'}</div>
                                                      </div>
                                                      {/* Total */}
                                                      <div className={`rounded-lg px-3 py-3 border ${borderCls} ${bgCls}`}>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Total Points</div>
                                                        <div className="flex items-center gap-2">
                                                          <div className={`w-9 h-9 rounded-lg ${totalBg} flex items-center justify-center shrink-0`}>
                                                            <span className="text-white font-black text-[15px] leading-none">{total}</span>
                                                          </div>
                                                          <div>
                                                            <div className={`text-xl font-black leading-none ${totalColor}`}>{total} <span className="text-sm font-bold">pts</span></div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                      {/* Carrier Impact */}
                                                      <div className="bg-white border border-slate-200 rounded-lg px-3 py-3">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Score Effect</div>
                                                        <div className={`text-[13px] font-bold leading-tight ${totalColor}`}>{impactLabel}</div>
                                                        <div className="mt-1.5">
                                                          <div className="flex gap-0.5">
                                                            {[1,2,3,4].map(i => (
                                                              <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= total ? totalBg : 'bg-slate-200'}`} />
                                                            ))}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    {/* Description */}
                                                    <div className="mt-3 flex items-start gap-2 bg-white/70 border border-white rounded-lg px-3 py-2.5">
                                                      <Info size={12} className={`mt-0.5 shrink-0 ${total >= 3 ? 'text-red-400' : total >= 2 ? 'text-amber-400' : 'text-slate-400'}`} />
                                                      <p className="text-[12px] text-slate-600 leading-relaxed">{impactDesc}</p>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })()}

                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {isOpen && section.id === 'MONITORING SUMMARY' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg border border-slate-200 p-5">
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Industry Monitoring Information on 2024 Sep 30</h5>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Type</div>
                            <div className="mt-1 text-sm font-black text-slate-900">TRK</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Industry Avg R-Factor</div>
                            <div className="mt-1 text-sm font-black text-slate-900">0.236</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Range</div>
                            <div className="mt-1 text-sm font-black text-slate-900">8.0 - 13.9</div>
                          </div>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">
                          Industry Average is calculated for NSC carriers with and without safety events.
                        </p>
                        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Monitoring Stage R-Factor Threshold for Fleet Range 8.0 - 13.9</div>
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {monitoringThresholds.map((row) => (
                              <div key={row.stage} className="flex items-center justify-between rounded-md border border-blue-100 bg-white px-3 py-2">
                                <span className="text-sm font-bold text-slate-800">{row.stage}</span>
                                <span className="text-sm font-mono font-semibold text-slate-600">{row.threshold}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg border border-slate-200 p-5">
                        <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Current Monitoring Snapshot</h5>
                        <div className="mt-4 space-y-3">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Month-End</div>
                            <div className="mt-1 text-sm font-black text-slate-900">2024 Sep</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current R-Factor Score</div>
                            <div className="mt-1 text-sm font-black text-slate-900">0.339</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monitoring Stage</div>
                            <div className="mt-1 text-sm font-black text-emerald-700">None</div>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Fleet</div>
                            <div className="mt-1 text-sm font-black text-slate-900">9 units</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Monitoring History</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 font-medium">Month-End</th>
                              <th className="px-3 py-3 font-medium text-center">Type</th>
                              <th className="px-3 py-3 font-medium text-center">Current Fleet</th>
                              <th className="px-3 py-3 font-medium text-center">Total Insp</th>
                              <th className="px-3 py-3 font-medium text-center">R-Factor</th>
                              <th className="px-3 py-3 font-medium text-center">Stage</th>
                              <th className="px-3 py-3 font-medium text-center w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {monitoringTrendData.map((row, idx) => {
                              const rowOpen = expandedMonitoringRows[row.monthEnd];
                              const detail = monitoringDetailData.find(detailRow => detailRow.monthEnd === row.monthEnd);
                              const stageTone = row.stage === '02'
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : row.stage === '01'
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                              return (
                                <Fragment key={row.monthEnd}>
                                  <tr
                                    className={`cursor-pointer transition-colors hover:bg-slate-50 ${idx === 0 ? 'bg-blue-50/40' : ''}`}
                                    onClick={() => toggleMonitoringRow(row.monthEnd)}
                                  >
                                    <td className="px-4 py-3 font-medium text-slate-900">{row.monthEnd}</td>
                                    <td className="px-3 py-3 text-center font-semibold text-slate-700">{row.type}</td>
                                    <td className="px-3 py-3 text-center text-slate-600">{row.currentFleet}</td>
                                    <td className="px-3 py-3 text-center text-slate-600">{detail?.totalInspections || '-'}</td>
                                    <td className="px-3 py-3 text-center font-bold text-slate-900">{row.score}</td>
                                    <td className="px-3 py-3 text-center">
                                      <span className={`inline-flex min-w-[56px] justify-center rounded border px-2 py-0.5 text-[10px] font-bold ${stageTone}`}>
                                        {row.stage || 'None'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-3 text-center text-slate-400">
                                      {rowOpen ? <ChevronUp className="mx-auto h-4 w-4" /> : <ChevronDown className="mx-auto h-4 w-4" />}
                                    </td>
                                  </tr>
                                  {rowOpen && (
                                    <tr>
                                      <td colSpan={7} className="border-t border-slate-200 bg-slate-100/60 p-0">
                                        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Mix</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">TRK {row.trkPercent}%</div>
                                            <div className="text-xs text-slate-500">BUS {row.busPercent}%</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Size</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">Average {row.avgFleet}</div>
                                            <div className="text-xs text-slate-500">Current {row.currentFleet}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">R-Factor Score</div>
                                            <div className="mt-1 text-sm font-black text-slate-900">{row.score}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monitoring Stage</div>
                                            <div className="mt-1 text-sm font-black text-slate-900">{row.stage || 'None'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conviction Contribution</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{row.convictionPercent}%</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Administrative Contribution</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{row.adminPercent}%</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collision Contribution</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{row.collisionPercent}%</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inspection Contribution</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{row.inspectionPercent}%</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Inspections</div>
                                            <div className="mt-1 text-sm font-black text-slate-900">{detail?.totalInspections || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Average Fleet Size</div>
                                            <div className="mt-1 text-sm font-black text-slate-900">{detail?.avgFleetSize || row.avgFleet}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OOS%</div>
                                            <div className="mt-1 text-sm font-black text-slate-900">{detail?.oosPercent || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OOS / Vehicle</div>
                                            <div className="mt-1 text-sm font-black text-slate-900">{detail?.oosPerVehicle || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Conviction Pts / Veh</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{detail?.convictionPtsPerVeh || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Admin Penalty Pts / Veh</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{detail?.adminPenaltyPtsPerVeh || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Collision Pts / Veh</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{detail?.collisionPtsPerVeh || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">CVSA Pts / Veh</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{detail?.cvsaPtsPerVeh || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OOS Defect / Insp</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{detail?.oosDefectPerInspection || '-'}</div>
                                          </div>
                                          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Defect / Insp</div>
                                            <div className="mt-1 text-sm font-medium text-slate-800">{detail?.totalDefectPerInspection || '-'}</div>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Industry Average</div>
                          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">Conv Pts/Veh</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">0.21</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">Admin</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">0.00</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">Coll</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">0.07</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">CVSA</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">0.06</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">OOS Def/Insp</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">0.4</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">Total Def/Insp</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">1.4</div>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="text-[10px] uppercase text-slate-400">OOS/Veh</div>
                              <div className="mt-1 text-sm font-bold text-slate-900">0.07</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {isOpen && section.id === 'SAFETY FITNESS INFORMATION' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Safety Fitness Certificate</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 font-medium text-center">#</th>
                              <th className="px-4 py-3 font-medium">Certificate Number</th>
                              <th className="px-4 py-3 font-medium">Effective Date</th>
                              <th className="px-4 py-3 font-medium">Expiry Date</th>
                              <th className="px-4 py-3 font-medium">Issue Date</th>
                              <th className="px-4 py-3 font-medium">Cancel Date</th>
                              <th className="px-4 py-3 font-medium">Event</th>
                              <th className="px-4 py-3 font-medium">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {safetyCertificateData.map((row) => {
                              const statusTone = row.status === 'Active'
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200';
                              return (
                                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-center font-semibold text-slate-500">{row.id}</td>
                                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{row.certificateNumber}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.effectiveDate}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.expiryDate}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.issueDate}</td>
                                  <td className="px-4 py-3 text-slate-500">{row.cancelDate}</td>
                                  <td className="px-4 py-3 text-slate-700">{row.event}</td>
                                  <td className="px-4 py-3">
                                    <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusTone}`}>
                                      {row.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-4 text-center">
                      <p className="text-sm font-medium text-slate-600">No Certificate Suspension on Record for period selected</p>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Safety Rating</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 font-medium text-center">#</th>
                              <th className="px-4 py-3 font-medium">Effective Date</th>
                              <th className="px-4 py-3 font-medium">Expiry Date</th>
                              <th className="px-4 py-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {safetyRatingData.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-center font-semibold text-slate-500">{row.id}</td>
                                <td className="px-4 py-3 text-slate-700">{row.effectiveDate}</td>
                                <td className="px-4 py-3 text-slate-700">{row.expiryDate}</td>
                                <td className="px-4 py-3 font-medium text-slate-800">{row.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Operating Status</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 font-medium text-center">#</th>
                              <th className="px-4 py-3 font-medium">Effective Date</th>
                              <th className="px-4 py-3 font-medium">Expiry Date</th>
                              <th className="px-4 py-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {operatingStatusData.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 text-center font-semibold text-slate-500">{row.id}</td>
                                <td className="px-4 py-3 text-slate-700">{row.effectiveDate}</td>
                                <td className="px-4 py-3 text-slate-700">{row.expiryDate}</td>
                                <td className="px-4 py-3 font-medium text-slate-800">{row.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Conditions</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 font-medium text-center">#</th>
                              <th className="px-4 py-3 font-medium">Effective Date</th>
                              <th className="px-4 py-3 font-medium">Expiry Date</th>
                              <th className="px-4 py-3 font-medium">Date Due</th>
                              <th className="px-4 py-3 font-medium">Completed Date</th>
                              <th className="px-4 py-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {safetyConditionData.map((row) => (
                              <tr key={row.id} className="hover:bg-slate-50 transition-colors align-top">
                                <td className="px-4 py-3 text-center font-semibold text-slate-500">{row.id}</td>
                                <td className="px-4 py-3 text-slate-700">{row.effectiveDate}</td>
                                <td className="px-4 py-3 text-slate-700">{row.expiryDate}</td>
                                <td className="px-4 py-3 text-slate-700">{row.dateDue}</td>
                                <td className="px-4 py-3 text-slate-700">{row.completedDate}</td>
                                <td className="px-4 py-3 font-medium text-slate-800">{row.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {isOpen && section.id === 'HISTORICAL SUMMARY' && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Totals</h5>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                        {historicalSummaryTotals.map((item) => (
                          <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</div>
                            <div className="mt-1 text-lg font-black text-slate-900">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-700 uppercase mb-3 tracking-wide">Historical Summary</h5>
                      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                        <table className="min-w-[980px] w-full text-sm text-left">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                              <th className="px-4 py-3 font-medium text-center">#</th>
                              <th className="px-4 py-3 font-medium">Date</th>
                              <th className="px-4 py-3 font-medium">Type</th>
                              <th className="px-4 py-3 font-medium text-center">Jur</th>
                              <th className="px-4 py-3 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historicalSummaryData.map((row, idx) => (
                              <tr key={`${row.type}-${row.date}-${idx}`} className="hover:bg-slate-50 transition-colors align-top">
                                <td className="px-4 py-3 text-center font-semibold text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3 font-medium text-slate-900">{row.date}</td>
                                <td className="px-4 py-3 font-semibold text-slate-800">{row.type}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                    {row.jurisdiction}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-700 leading-relaxed">{row.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {/* Placeholder for remaining sections */}
                {isOpen && !['CONVICTION ANALYSIS', 'CVSA INSPECTION ANALYSIS', 'COLLISION SUMMARY', 'VIOLATION ANALYSIS', 'MONITORING SUMMARY', 'SAFETY FITNESS INFORMATION', 'HISTORICAL SUMMARY'].includes(section.id) && (
                  <div className="p-6 border-t border-slate-100 bg-slate-50/50 text-center">
                    <p className="text-sm text-slate-400 italic">Data for {section.title} will be available once the source records are connected.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
    </div>
  );
}
