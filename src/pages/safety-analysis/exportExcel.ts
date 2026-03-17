/**
 * exportExcel.ts - SheetJS (xlsx-js-style) export for Safety Analysis.
 * No exceljs dependency.
 */

import * as XLSXNS from 'xlsx-js-style';

import { MOCK_DRIVERS } from '../../data/mock-app-data';
import { INITIAL_ASSETS } from '../assets/assets.data';
import { INCIDENTS } from '../incidents/incidents.data';
import { inspectionsData, getJurisdiction, carrierProfile } from '../inspections/inspectionsData';
import {
  DRIVER_SAFETY_SCORES,
  DRIVER_KEY_INDICATORS,
  HOS_VIOLATION_EVENTS,
  VEDR_VIOLATION_EVENTS,
  FLEET_AVERAGE,
} from './safety-analysis.data';
import {
  computeCarrierBASICs,
  computeDriverBASICs,
  computeAssetBASICs,
  computeCompositeScore,
  BASIC_LABELS,
  BASIC_DESCRIPTIONS,
  ALERT_THRESHOLDS,
  type InspectionForSMS,
  type CrashForSMS,
  type BasicKey,
} from './sms-engine';
import {
  loadSafetySettings,
  DEFAULT_SAFETY_SETTINGS,
  SAFETY_FORMULA_MAP,
  type SafetySettings,
} from './safetySettings';
import { computeCombinedScore, operationalScore, cvorCompositeScore } from './safetyScoring';

// `xlsx-js-style` is CJS; in ESM bundling, `import * as` may place API under `.default`.
const XLSX = ((XLSXNS as unknown as { default?: typeof XLSXNS }).default ?? XLSXNS) as typeof XLSXNS;

export interface ExportOptions {
  datePreset?: string;
  scoringMode?: 'time' | 'distance';
  jurisdictionFilter?: string;
  severityFilter?: string[];
  preventabilityFilter?: string;
  scoreBandFilter?: string;
}

const C = {
  NAVY: '1F3864',
  NAVY_MID: '2E75B6',
  WHITE: 'FFFFFF',
  ALT: 'F5F7FA',
  GREEN_BG: 'E2EFDA',
  GREEN_FG: '375623',
  BLUE_BG: 'DDEBF7',
  BLUE_FG: '1F4E79',
  AMBER_BG: 'FFF2CC',
  AMBER_FG: '7F6000',
  RED_BG: 'FCE4D6',
  RED_FG: '843C0C',
  ALERT_BG: 'C00000',
};

const BORDER = {
  top: { style: 'thin', color: { rgb: 'D0D0D0' } },
  bottom: { style: 'thin', color: { rgb: 'D0D0D0' } },
  left: { style: 'thin', color: { rgb: 'D0D0D0' } },
  right: { style: 'thin', color: { rgb: 'D0D0D0' } },
};

function scoreColor(score: number, s: ReturnType<typeof loadSafetySettings>) {
  if (score >= s.threshExcellent) return { bg: C.GREEN_BG, fg: C.GREEN_FG };
  if (score >= s.threshGood) return { bg: C.BLUE_BG, fg: C.BLUE_FG };
  if (score >= s.threshFair) return { bg: C.AMBER_BG, fg: C.AMBER_FG };
  return { bg: C.RED_BG, fg: C.RED_FG };
}

function safeList(v?: string[]) {
  return v && v.length ? v.join(', ') : 'All';
}

function formatCellValue(value: unknown): string | number {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map((v) => String(formatCellValue(v))).join(' | ') : '-';
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return '-';
    return entries.map(([k, v]) => `${k}: ${formatCellValue(v)}`).join(' | ');
  }
  const txt = String(value).trim();
  return txt.length ? txt : '-';
}

function composeAddress(parts: Array<string | undefined>) {
  const clean = parts.map((p) => (p ?? '').trim()).filter(Boolean);
  return clean.length ? clean.join(', ') : '-';
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function hash01(a: number, b: number) {
  return Math.abs(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453) % 1;
}

function getScoreBandLabel(score: number, s: SafetySettings) {
  if (score >= s.threshExcellent) return 'Excellent';
  if (score >= s.threshGood) return 'Good';
  if (score >= s.threshFair) return 'Fair';
  return 'Poor';
}

function buildSmsConfigFromSettings(s: SafetySettings, mode: 'time' | 'distance') {
  return {
    formulaMode: mode,
    carrierType: s.smsCarrierType,
    segment: s.smsCarrierSegment,
    avgPU: 1,
    annualVmtPerPU: s.smsAnnualVmtPerPU,
    decayBand1Pct: s.smsDecayBand1Pct,
    decayBand2Pct: s.smsDecayBand2Pct,
    decayBand3Pct: s.smsDecayBand3Pct,
    lookbackMonths: s.smsLookbackMonths,
  } as const;
}

function buildViolationMultipliersFromSettings(s: SafetySettings) {
  return {
    oosBonus: s.smsOosBonus,
    perInspectionCap: s.smsPerInspectionCap,
  } as const;
}

function getAssetRiskScoreForExport(asset: any, today = new Date()) {
  const baseByStatus: Record<string, number> = {
    Active: 95,
    Maintenance: 78,
    OutOfService: 62,
    Deactivated: 70,
    Drafted: 74,
  };

  let score = baseByStatus[asset.operationalStatus] ?? 70;

  const age = today.getFullYear() - (asset.year ?? today.getFullYear());
  if (age >= 10) score -= 10;
  else if (age >= 7) score -= 6;
  else if (age >= 5) score -= 3;

  const odo = asset.odometer ?? 0;
  const isHighMileage = asset.odometerUnit === 'km' ? odo >= 700000 : odo >= 430000;
  const isMediumMileage = asset.odometerUnit === 'km' ? odo >= 500000 : odo >= 310000;
  if (isHighMileage) score -= 8;
  else if (isMediumMileage) score -= 4;

  const expiry = new Date(asset.registrationExpiryDate);
  if (!Number.isNaN(expiry.getTime())) {
    const daysToExpiry = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
    if (daysToExpiry < 0) score -= 12;
    else if (daysToExpiry <= 30) score -= 8;
    else if (daysToExpiry <= 90) score -= 4;
  }

  return clamp(score, 30, 100);
}

function getAssetSubScoresForExport(asset: any) {
  const today = new Date();
  const baseByStatus: Record<string, number> = {
    Active: 95,
    Maintenance: 78,
    OutOfService: 62,
    Deactivated: 70,
    Drafted: 74,
  };
  const statusScore = baseByStatus[asset.operationalStatus] ?? 70;

  const age = today.getFullYear() - (asset.year ?? today.getFullYear());
  const ageScore = age >= 10 ? 60 : age >= 7 ? 72 : age >= 5 ? 82 : 95;

  const odo = asset.odometer ?? 0;
  const isHighMileage = asset.odometerUnit === 'km' ? odo >= 700000 : odo >= 430000;
  const isMediumMileage = asset.odometerUnit === 'km' ? odo >= 500000 : odo >= 310000;
  const mileageScore = isHighMileage ? 60 : isMediumMileage ? 75 : 95;

  const expiry = new Date(asset.registrationExpiryDate);
  let regScore = 95;
  if (!Number.isNaN(expiry.getTime())) {
    const days = Math.floor((expiry.getTime() - today.getTime()) / 86400000);
    regScore = days < 0 ? 50 : days <= 30 ? 62 : days <= 90 ? 78 : 95;
  }

  const overall = getAssetRiskScoreForExport(asset, today);
  return { overall, statusScore, ageScore, mileageScore, regScore };
}

function getAssetIntervalProgressForExport(asset: any, intervalMi: number): number {
  const odo = asset.odometer ?? 0;
  const odoInMi = asset.odometerUnit === 'km' ? odo / 1.60934 : odo;
  return Math.min(1, (odoInMi % intervalMi) / intervalMi);
}

function getMaintenancePenaltyFromProgress(progress: number) {
  if (progress > 0.9) return 18;
  if (progress > 0.75) return 10;
  if (progress > 0.5) return 4;
  return 0;
}

function buildDriverWeeksForExport(drv: {
  overall: number;
  accidents: number;
  eld: number;
  vedr: number;
  violations: number;
  trainings: number;
}) {
  return Array.from({ length: 8 }, (_, i) => {
    const r = hash01(drv.overall, i);
    const score = clamp(drv.overall + (r - 0.5) * 12, 62, 100);
    const behaviors = [
      (drv.accidents - FLEET_AVERAGE) / 20 + (hash01(drv.overall + 1, i) - 0.5) * 2.2,
      (drv.eld - FLEET_AVERAGE) / 22 + (hash01(drv.overall + 2, i) - 0.5) * 1.8,
      (drv.vedr - FLEET_AVERAGE) / 22 + (hash01(drv.overall + 3, i) - 0.5) * 1.5,
      (drv.violations - FLEET_AVERAGE) / 25 + (hash01(drv.overall + 4, i) - 0.5) * 1.2,
      (drv.trainings - FLEET_AVERAGE) / 30 + (hash01(drv.overall + 5, i) - 0.5) * 1.0,
    ];
    const base = new Date(2025, 9, 27);
    base.setDate(base.getDate() + i * 7);
    const label = `${base.getMonth() + 1}/${String(base.getDate()).padStart(2, '0')}`;
    return { label, score, behaviors };
  });
}

function buildAssetWeeksForExport(
  odoSeed: number,
  scores: { overall: number; statusScore: number; ageScore: number; mileageScore: number; regScore: number },
) {
  const seed = (odoSeed % 9999) + 1;
  return Array.from({ length: 8 }, (_, i) => {
    const r = hash01(seed, i);
    const score = clamp(scores.overall + (r - 0.5) * 14, 30, 100);
    const behaviors = [
      (scores.statusScore - FLEET_AVERAGE) / 20 + (hash01(seed + 1, i) - 0.5) * 1.8,
      (scores.ageScore - FLEET_AVERAGE) / 22 + (hash01(seed + 2, i) - 0.5) * 1.5,
      (scores.mileageScore - FLEET_AVERAGE) / 22 + (hash01(seed + 3, i) - 0.5) * 1.5,
      (scores.regScore - FLEET_AVERAGE) / 25 + (hash01(seed + 4, i) - 0.5) * 1.2,
    ];
    const base = new Date(2025, 9, 27);
    base.setDate(base.getDate() + i * 7);
    const label = `${base.getMonth() + 1}/${String(base.getDate()).padStart(2, '0')}`;
    return { label, score, behaviors };
  });
}

function addKeyValueGrid(
  b: SheetBuilder,
  section: string,
  pairs: Array<[string, unknown]>,
  pairsPerRow = 4,
) {
  b.addSection(section);
  const headers: string[] = [];
  for (let i = 0; i < pairsPerRow; i++) headers.push('Field', 'Value');
  b.addHeaders(headers);

  for (let i = 0; i < pairs.length; i += pairsPerRow) {
    const row: Array<string | number> = [];
    for (let j = 0; j < pairsPerRow; j++) {
      const pair = pairs[i + j];
      if (pair) {
        row.push(pair[0], formatCellValue(pair[1]));
      } else {
        row.push('', '');
      }
    }
    b.addData(row, Math.floor(i / pairsPerRow) % 2 === 1);
  }
  b.addEmpty();
}

function sanitizeSheetName(raw: string) {
  const cleaned = raw.replace(/[\\/*?:[\]]/g, ' ').replace(/'/g, '').trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

function uniqueSheetName(base: string, used: Set<string>) {
  const root = sanitizeSheetName(base);
  if (!used.has(root)) {
    used.add(root);
    return root;
  }
  let i = 2;
  while (i < 1000) {
    const suffix = `_${i}`;
    const candidate = `${root.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    i += 1;
  }
  const fallback = `Sheet_${Date.now()}`.slice(0, 31);
  used.add(fallback);
  return fallback;
}

function downloadWorkbookViaBlob(wb: XLSXNS.WorkBook, filename: string) {
  const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  // Legacy IE / Edge fallback.
  const nav = window.navigator as Navigator & {
    msSaveOrOpenBlob?: (blob: Blob, defaultName?: string) => boolean;
  };
  if (typeof nav.msSaveOrOpenBlob === 'function') {
    nav.msSaveOrOpenBlob(blob, filename);
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke asynchronously; immediate revoke can cancel download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function saveWorkbookViaFilePicker(wb: XLSXNS.WorkBook, filename: string): Promise<boolean> {
  const showSaveFilePickerFn = (window as Window & {
    showSaveFilePicker?: (options?: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: ArrayBuffer | Uint8Array | Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  }).showSaveFilePicker;

  if (typeof showSaveFilePickerFn !== 'function') return false;

  try {
    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const handle = await showSaveFilePickerFn({
      suggestedName: filename,
      types: [
        {
          description: 'Excel Workbook (.xlsx)',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
    });
    const writable = await handle.createWritable();
    await writable.write(wbArray);
    await writable.close();
    return true;
  } catch (err) {
    // User canceled dialog: treat as handled and do not trigger fallback download.
    if ((err as { name?: string })?.name === 'AbortError') return true;
    return false;
  }
}

class SheetBuilder {
  rows: any[][] = [];
  merges: XLSXNS.Range[] = [];
  cols: number;

  constructor(cols: number) {
    this.cols = cols;
  }

  addTitle(text: string) {
    const style = {
      font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: C.WHITE } },
      fill: { fgColor: { rgb: C.NAVY } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: BORDER,
    };
    const row = [{ v: text, t: 's', s: style }];
    for (let i = 1; i < this.cols; i++) row.push({ v: '', t: 's', s: style });
    this.rows.push(row);
    this.merges.push({ s: { r: this.rows.length - 1, c: 0 }, e: { r: this.rows.length - 1, c: this.cols - 1 } });
  }

  addSubtitle(text: string) {
    const style = {
      font: { name: 'Calibri', sz: 10, italic: true, color: { rgb: C.WHITE } },
      fill: { fgColor: { rgb: C.NAVY_MID } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: BORDER,
    };
    const row = [{ v: text, t: 's', s: style }];
    for (let i = 1; i < this.cols; i++) row.push({ v: '', t: 's', s: style });
    this.rows.push(row);
    this.merges.push({ s: { r: this.rows.length - 1, c: 0 }, e: { r: this.rows.length - 1, c: this.cols - 1 } });
  }

  addSection(text: string) {
    const style = {
      font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: C.WHITE } },
      fill: { fgColor: { rgb: C.NAVY } },
      alignment: { vertical: 'center', horizontal: 'left' },
      border: BORDER,
    };
    const row = [{ v: text, t: 's', s: style }];
    for (let i = 1; i < this.cols; i++) row.push({ v: '', t: 's', s: style });
    this.rows.push(row);
    this.merges.push({ s: { r: this.rows.length - 1, c: 0 }, e: { r: this.rows.length - 1, c: this.cols - 1 } });
  }

  addHeaders(headers: string[]) {
    const row = headers.map((h) => ({
      v: h,
      t: 's',
      s: {
        font: { name: 'Calibri', sz: 9, bold: true, color: { rgb: C.WHITE } },
        fill: { fgColor: { rgb: C.NAVY_MID } },
        alignment: { vertical: 'center', horizontal: 'center', wrapText: true },
        border: BORDER,
      },
    }));
    while (row.length < this.cols) row.push({ v: '', t: 's', s: row[0].s });
    this.rows.push(row);
  }

  addData(values: any[], alt = false, cellColors?: Record<number, { bg: string; fg: string; b?: boolean }>) {
    const bg = alt ? C.ALT : C.WHITE;
    const row = values.map((val, i) => {
      const custom = cellColors?.[i];
      return {
        v: val ?? '',
        t: typeof val === 'number' ? 'n' : 's',
        s: {
          font: { name: 'Calibri', sz: 9, color: { rgb: custom?.fg ?? '000000' }, bold: !!custom?.b },
          fill: { fgColor: { rgb: custom?.bg ?? bg } },
          alignment: {
            vertical: 'center',
            wrapText: true,
            horizontal: custom ? 'center' : (typeof val === 'number' ? 'right' : 'left'),
          },
          border: BORDER,
        },
      };
    });
    while (row.length < this.cols) row.push({ v: '', t: 's', s: row[0].s });
    this.rows.push(row);
    return this.rows.length - 1;
  }

  addEmpty() {
    this.rows.push(Array(this.cols).fill({ v: '', t: 's', s: {} }));
  }

  colorizeCellRowCol(r: number, c: number, bg: string, fg: string, b = true) {
    this.rows[r][c].s.fill = { fgColor: { rgb: bg } };
    this.rows[r][c].s.font.color = { rgb: fg };
    this.rows[r][c].s.font.bold = b;
    this.rows[r][c].s.alignment.horizontal = 'center';
  }

  toWorksheet(colWidths: number[]) {
    const ws = XLSX.utils.aoa_to_sheet(this.rows);
    ws['!merges'] = this.merges;
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
    return ws;
  }
}

function toSMSInspections(): InspectionForSMS[] {
  return (inspectionsData as any[]).map((i) => ({
    id: i.id,
    date: i.date,
    level: i.level,
    driverId: i.driverId,
    assetId: i.assetId ?? '',
    hasHM: !!(i.violations?.some((v: any) => {
      const cat = String(v.category ?? '').toLowerCase();
      return cat.includes('hazmat') || cat.includes('hm');
    })),
    violations: (i.violations ?? []).map((v: any) => ({
      code: v.code ?? '',
      category: v.category ?? '',
      severity: v.severity ?? 0,
      oos: !!v.oos,
    })),
  }));
}

function toSMSCrashes(): CrashForSMS[] {
  return INCIDENTS.map((i) => ({
    id: i.incidentId,
    date: i.occurredDate,
    driverId: i.driver?.driverId ?? '',
    fatalities: i.severity.fatalities,
    injuries: i.severity.injuriesNonFatal,
    towAway: i.severity.towAway,
    hazmat: i.severity.hazmatReleased,
    isPreventable: i.preventability.isPreventable,
  }));
}

const SMS_INSP = toSMSInspections();
const SMS_CRASHES = toSMSCrashes();

function buildIntroduction(opts: ExportOptions) {
  const b = new SheetBuilder(5);
  const s = loadSafetySettings();
  const cp = carrierProfile;
  const mode = opts.scoringMode ?? 'time';
  const res = computeCombinedScore(SMS_INSP, SMS_CRASHES, s, mode);

  b.addTitle('FLEET SAFETY REPORT');
  b.addSubtitle(`${cp.name} | MC: ${cp.licensing.property.mc} | Date: ${new Date().toLocaleDateString()}`);
  b.addEmpty();

  b.addSection('ABOUT TRACKSMART SAFETY ANALYSIS');
  b.addHeaders(['Area', 'Description', 'Coverage', 'Output', '']);
  b.addData([
    'Application',
    'Unified safety analytics dashboard combining incidents, inspections, HOS/ELD, VEDR, FMCSA SMS BASIC, and Ontario CVOR.',
    'Carrier and entity-level monitoring',
    'Export snapshot for review and audits',
    '',
  ]);
  b.addData([
    'Scoring Perspective',
    'Operational behavior + regulatory risk are calculated separately, then blended into one fleet score.',
    'Operational + Regulatory',
    'Time mode and Distance mode',
    '',
  ], true);
  b.addEmpty();

  b.addSection('FILTERS APPLIED IN THIS EXPORT');
  b.addHeaders(['Filter', 'Selected Value', 'Applied To', 'Extraction Rule', '']);
  b.addData(['Date Preset', opts.datePreset ?? '90d', 'Incidents, inspections, violations', 'Uses dashboard time context', '']);
  b.addData(['Scoring Mode', mode.toUpperCase(), 'Fleet/SMS calculations', 'TIME uses age bands, DISTANCE uses miles-since-event bands', ''], true);
  b.addData(['Jurisdiction', opts.jurisdictionFilter ?? 'All', 'Inspection/CVOR context', 'US favors CSA/SMS, Canada favors CVOR', '']);
  b.addData(['Severity Filter', safeList(opts.severityFilter), 'Incidents/HOS/VEDR', 'Slices by severity tags', ''], true);
  b.addData(['Preventability', opts.preventabilityFilter ?? 'All', 'Incidents', 'Preventable / Non-Preventable / Under Review', '']);
  b.addData(['Score Band', opts.scoreBandFilter ?? 'All', 'Driver ranking tables', '90+, 80-89, 70-79, <70', ''], true);
  b.addEmpty();

  b.addSection('COLOR SCHEME');
  b.addHeaders(['Band', 'Meaning', 'Rule', 'Action', '']);
  b.addData(['Green', 'Excellent', `score >= ${s.threshExcellent}`, 'Maintain controls', ''], false, { 0: { bg: C.GREEN_BG, fg: C.GREEN_FG, b: true } });
  b.addData(['Blue', 'Good', `${s.threshGood} <= score < ${s.threshExcellent}`, 'Monitor trend', ''], true, { 0: { bg: C.BLUE_BG, fg: C.BLUE_FG, b: true } });
  b.addData(['Amber', 'Fair', `${s.threshFair} <= score < ${s.threshGood}`, 'Targeted intervention', ''], false, { 0: { bg: C.AMBER_BG, fg: C.AMBER_FG, b: true } });
  b.addData(['Red', 'Poor', `score < ${s.threshFair}`, 'Immediate corrective action', ''], true, { 0: { bg: C.RED_BG, fg: C.RED_FG, b: true } });
  b.addEmpty();

  b.addSection('FLEET SNAPSHOT');
  b.addHeaders(['Fleet Score', 'Rating', 'Drivers', 'Assets', 'Open Violations']);
  const openViol = [...HOS_VIOLATION_EVENTS, ...VEDR_VIOLATION_EVENTS].filter((v) => ['Open', 'Under Review'].includes(v.status)).length;
  const scoreC = scoreColor(res.fleetSafetyScore, s);
  b.addData([res.fleetSafetyScore, res.rating, MOCK_DRIVERS.length, INITIAL_ASSETS.length, openViol], false, {
    0: { bg: scoreC.bg, fg: scoreC.fg, b: true },
  });

  return b.toWorksheet([24, 58, 34, 38, 4]);
}

function buildFormulas() {
  const b = new SheetBuilder(6);
  const s = loadSafetySettings();
  const wt6 = (s.wAccidents + s.wEld + s.wInspections + s.wVedr + s.wViolations + s.wTrainings) || 100;
  const wt4 = (s.wAccidents + s.wEld + s.wVedr + s.wInspections) || 100;
  const regBlendDen = (s.smsBlend + s.cvorBlend) || 100;
  const fleetBlendDen = (s.opWeight + s.regWeight) || 100;

  b.addTitle('FORMULAS AND LEGEND');
  b.addSubtitle(`Generated: ${new Date().toLocaleDateString()}`);
  b.addEmpty();

  b.addSection('PRIMARY SCORING FORMULAS');
  b.addHeaders(['Component', 'Formula', 'Description', 'Current Setting']);
  b.addData(['Overall Driver/Fleet Composite', 'overall = SUM(subScore[i] * weight[i]) / SUM(weights)', '6-component weighted blend for driver/fleet operational posture', `weights sum = ${wt6}`]);
  b.addData(['Operational Score', 'operational = (accident*wAccidents + eld*wEld + vedr*wVedr + inspection*wInspections) / (wAccidents+wEld+wVedr+wInspections)', 'Operational-only normalized blend', `operational weight sum = ${wt4}`], true);
  b.addData(['Accident Adjusted Score', 'accidents = 100 - (filteredIncidents/totalIncidents) * (100 - baseAccidentsScore)', 'Reduces score when filtered incidents rise', 'Safety dashboard filtered mode']);
  b.addData(['Inspection Adjusted Score', 'inspections = (cleanFilteredInspections/filteredInspections) * 100', 'Date/jurisdiction scoped pass-rate score', 'Safety dashboard filtered mode'], true);
  b.addData(['ELD Adjusted Score', 'eld = 100 - (filteredHOS/totalHOS) * (100 - baseEldScore)', 'Scales HOS risk by active filter context', 'Safety dashboard filtered mode']);
  b.addData(['VEDR Adjusted Score', 'vedr = 100 - (filteredVEDR/totalVEDR) * (100 - baseVedrScore)', 'Scales telematics/camera risk by active filter context', 'Safety dashboard filtered mode'], true);
  b.addData(['SMS Composite Score', 'smsScore = weightedAvg(100 - percentile[basic])', 'Lower SMS percentile gives higher safety score', 'BASIC weights: UD 20%, CI 25%, HOS 15%, VM 20%, CS 5%, HM 5%, DF 10%']);
  b.addData(['CVOR Score', 'cvorScore = max(0, 100 - cvorRating)', 'Lower CVOR rating gives higher safety score', 'Ontario CVOR']);
  b.addData(['Regulatory Score', 'reg = (smsScore*smsBlend + cvorScore*cvorBlend) / (smsBlend+cvorBlend)', 'Regulatory blend', `smsBlend=${s.smsBlend}, cvorBlend=${s.cvorBlend}, denominator=${regBlendDen}`], true);
  b.addData(['Fleet Safety Score', 'fleet = (operational*opWeight + reg*regWeight) / (opWeight+regWeight)', 'Final blended fleet score', `opWeight=${s.opWeight}, regWeight=${s.regWeight}, denominator=${fleetBlendDen}`]);
  b.addEmpty();

  b.addSection('SMS BASIC MEASURE FORMULAS');
  b.addHeaders(['BASIC', 'Formula', 'Notes', 'Source']);
  b.addData(['Unsafe Driving', 'SUM(severity * effectiveWeight) / (avgPU * utilizationFactor)', 'Inspections + unsafe violations', 'sms-engine.ts']);
  b.addData(['Crash Indicator', 'SUM(crashSeverity * effectiveWeight) / (avgPU * utilizationFactor)', 'Crash records weighted by severity', 'sms-engine.ts'], true);
  b.addData(['HOS Compliance', 'SUM(severity * effectiveWeight) / SUM(effectiveWeight * relevantInspections)', 'Inspection-normalized', 'sms-engine.ts']);
  b.addData(['Vehicle Maintenance', 'SUM(severity * effectiveWeight) / SUM(effectiveWeight * relevantInspections)', 'Inspection-normalized', 'sms-engine.ts'], true);
  b.addData(['Controlled Substances', 'SUM(severity * effectiveWeight) / SUM(effectiveWeight * relevantInspections)', 'Inspection-normalized', 'sms-engine.ts']);
  b.addData(['HM Compliance', 'SUM(severity * effectiveWeight) / SUM(effectiveWeight * relevantInspections)', 'Inspection-normalized', 'sms-engine.ts'], true);
  b.addData(['Driver Fitness', 'SUM(severity * effectiveWeight) / SUM(effectiveWeight * relevantInspections)', 'Inspection-normalized', 'sms-engine.ts']);
  b.addData(['Percentile to Safety Score', 'basicScore = 100 - percentile', 'Lower percentile is safer', 'applied per BASIC'], true);
  b.addData(['SMS BASIC Threshold Rule', 'alert when percentile >= thresholdByCarrierType', 'General carrier: UD/CI/HOS 65, VM/CS/HM/DF 80', s.smsCarrierType]);
  b.addEmpty();

  b.addSection('TIME, DISTANCE, AND DECAY WEIGHTING');
  b.addHeaders(['Band', 'Time Mode', 'Distance Mode', 'Effective Weight']);
  b.addData(['Effective Weight Rule', 'effectiveWeight = bandWeight * (1 - decayBandPct/100)', 'same rule for both modes', 'sms-engine.ts']);
  b.addData(['Band 1', `0-6 months: w=3, decay=${s.smsDecayBand1Pct}%`, `0-50k miles: w=3, decay=${s.smsDecayBand1Pct}%`, `${(3 * (1 - s.smsDecayBand1Pct / 100)).toFixed(2)}`]);
  b.addData(['Band 2', `6-12 months: w=2, decay=${s.smsDecayBand2Pct}%`, `50k-150k miles: w=2, decay=${s.smsDecayBand2Pct}%`, `${(2 * (1 - s.smsDecayBand2Pct / 100)).toFixed(2)}`], true);
  b.addData(['Band 3', `12-24 months: w=1, decay=${s.smsDecayBand3Pct}%`, `150k-300k miles: w=1, decay=${s.smsDecayBand3Pct}%`, `${(1 * (1 - s.smsDecayBand3Pct / 100)).toFixed(2)}`]);
  b.addEmpty();

  b.addSection('INCIDENT PENALTY FORMULA');
  b.addHeaders(['Part', 'Formula', 'Description', 'Current Value']);
  b.addData(['Base Severity', 'base = fatalWeight | injuryWeight | propertyWeight', 'Selects base by incident severity', `${s.fatalWeight}/${s.injuryWeight}/${s.propertyWeight}`]);
  b.addData(['Multipliers', 'mult = towAwayMult * hazmatMult * atFaultMult', 'Applied only when condition true', `${s.towAwayMult} x ${s.hazmatMult} x ${s.atFaultMult}`], true);
  b.addData(['Final Penalty', 'penalty = base * mult', 'Used in incident impact widgets', 'Dynamic']);
  b.addData(['Preventable Rate', 'preventableRate = preventableIncidents / totalIncidents * 100', 'Displayed in dashboard KPI tiles', 'Dashboard incidents panel'], true);
  b.addEmpty();

  b.addSection('CVOR FORMULAS');
  b.addHeaders(['Metric', 'Formula', 'Description', 'Context']);
  b.addData(['Po (CVOR Rate)', 'Po = (2*Pcol + 2*Pcon + Pins) / 5', 'Ontario weighted performance index', 'Carrier profile']);
  b.addData(['CVOR Weighted Contribution', 'componentWeighted = componentPct * (componentWeight/100)', 'Collisions 40%, Convictions 40%, Inspections 20%', 'CVOR snapshot'], true);
  b.addData(['OOS Overall', 'oosOverall = outOfServiceInspections / inspectedVehicles * 100', 'Carrier equipment and compliance exposure', 'Carrier profile']);
  b.addData(['Regulatory Blend', 'reg = blend(SMS score, CVOR score)', 'Uses smsBlend/cvorBlend settings', `${s.smsBlend}/${s.cvorBlend}`], true);
  b.addEmpty();

  b.addSection('RATING THRESHOLDS');
  b.addHeaders(['Rating', 'Rule', 'Meaning', 'Threshold']);
  b.addData(['Satisfactory', `score >= ${s.threshExcellent}`, 'Best performance band', `${s.threshExcellent}+`]);
  b.addData(['Acceptable', `${s.threshGood} <= score < ${s.threshExcellent}`, 'Stable but monitor', `${s.threshGood}-${s.threshExcellent - 1}`], true);
  b.addData(['Conditional', `${s.threshFair} <= score < ${s.threshGood}`, 'Needs corrective plan', `${s.threshFair}-${s.threshGood - 1}`]);
  b.addData(['Unsatisfactory', `score < ${s.threshFair}`, 'Immediate action required', `<${s.threshFair}`], true);
  b.addEmpty();

  b.addSection('SETTINGS VARIABLES WITH CURRENT VALUES');
  b.addHeaders(['Variable', 'Current Value', 'Default Value', 'Formula Usage', 'Widgets', 'Export Fields']);
  const settingKeys = Object.keys(DEFAULT_SAFETY_SETTINGS) as Array<keyof SafetySettings>;
  settingKeys.forEach((key, i) => {
    const meta = SAFETY_FORMULA_MAP[key];
    const currentValue = formatCellValue(s[key]);
    const defaultValue = formatCellValue(DEFAULT_SAFETY_SETTINGS[key]);
    const isChanged = String(currentValue) !== String(defaultValue);
    b.addData(
      [
        key,
        currentValue,
        defaultValue,
        meta?.formula ?? '-',
        meta?.widgets?.join(', ') || '-',
        meta?.exportFields?.join(', ') || '-',
      ],
      i % 2 === 1,
      isChanged ? { 1: { bg: C.AMBER_BG, fg: C.AMBER_FG, b: true } } : undefined,
    );
  });
  b.addEmpty();

  b.addSection('FORMULA MAP COVERAGE CHECK');
  b.addHeaders(['Check', 'Result', 'Details', 'Notes', '', '']);
  b.addData([
    'Settings keys in default object',
    settingKeys.length,
    'Object.keys(DEFAULT_SAFETY_SETTINGS)',
    'Should match mapping entries',
    '',
    '',
  ]);
  b.addData([
    'Settings keys in formula map',
    Object.keys(SAFETY_FORMULA_MAP).length,
    'Object.keys(SAFETY_FORMULA_MAP)',
    'Mismatch indicates missing formula documentation',
    '',
    '',
  ], true);
  b.addData([
    'Coverage status',
    Object.keys(SAFETY_FORMULA_MAP).length === settingKeys.length ? 'Complete' : 'Review Needed',
    'Current export checks variable-to-formula mapping',
    'This tab is the single source for formula/setting transparency',
    '',
    '',
  ]);

  return b.toWorksheet([24, 20, 20, 64, 38, 38]);
}

function buildFiltersAndExtraction(opts: ExportOptions) {
  const b = new SheetBuilder(5);
  b.addTitle('FILTERS AND EXTRACTION LOGIC');
  b.addSubtitle(`Generated: ${new Date().toLocaleDateString()} | Mode: ${(opts.scoringMode ?? 'time').toUpperCase()}`);
  b.addEmpty();

  b.addSection('TIME DATA EXTRACTION');
  b.addHeaders(['Scope', 'Rule', 'Effect', 'Source', '']);
  b.addData(['Date Preset', `datePreset = ${opts.datePreset ?? '90d'}`, 'Defines active dashboard window', 'Dashboard filter state', '']);
  b.addData(['Lookback', 'events older than smsLookbackMonths are excluded', 'Removes stale events from BASIC measures', 'Safety settings', ''], true);
  b.addData(['Weight', 'effectiveWeight = timeWeight(ageBand) * (1 - decayBandPct/100)', 'Recent events have higher influence', 'sms-engine.ts', '']);
  b.addEmpty();

  b.addSection('DISTANCE DATA EXTRACTION');
  b.addHeaders(['Scope', 'Rule', 'Effect', 'Source', '']);
  b.addData(['Distance Bands', '0-50k, 50k-150k, 150k-300k miles', 'Converts recency to mileage context', 'sms-engine.ts', '']);
  b.addData(['Weight', 'effectiveWeight = distanceBandWeight * (1 - decayBandPct/100)', 'Closer distance has higher influence', 'sms-engine.ts', ''], true);
  b.addData(['Mode Switch', `scoringMode = ${opts.scoringMode ?? 'time'}`, 'Selects active scoring branch', 'SafetyAnalysisPage export options', '']);
  b.addEmpty();

  b.addSection('WORKBOOK TAB COVERAGE');
  b.addHeaders(['Tab', 'Primary Content', 'Data Type', 'Purpose', '']);
  b.addData(['Introduction', 'Overview + filters + color scheme', 'Narrative + KPI', 'Executive context', '']);
  b.addData(['Formulas & Legend', 'All formulas and thresholds used', 'Formula reference', 'Transparency', ''], true);
  b.addData(['Filters & Extraction', 'Extraction rules and filter logic', 'Methodology', 'Auditability', '']);
  b.addData(['Fleet Summary', 'Combined score snapshots', 'Aggregate metrics', 'Top-level health', ''], true);
  b.addData(['SMS & CVOR', 'Single combined regulatory summary tab', 'Regulatory analytics', 'Cross-regime review', '']);
  b.addData(['SMS BASIC Analysis', 'BASIC details by mode', 'Regulatory analytics', 'FMCSA perspective', ''], true);
  b.addData(['CVOR Analysis', 'Ontario CVOR components and OOS rates', 'Regulatory analytics', 'Ontario perspective', '']);
  b.addData(['Drivers', 'Driver-level scores', 'Entity detail', 'Coaching priorities', ''], true);
  b.addData(['Assets', 'Asset-level inventory and status', 'Entity detail', 'Asset risk review', '']);
  b.addData(['Driver_XX_*', 'Individual tab per driver with full profile + incidents + inspections + violations', 'Entity deep dive', `${MOCK_DRIVERS.length} tabs`, ''], true);
  b.addData(['Asset_XX_*', 'Individual tab per asset with full profile + incidents + inspections + violations', 'Entity deep dive', `${INITIAL_ASSETS.length} tabs`, '']);
  b.addData(['Inspections', 'Inspection events and OOS flags', 'Operational events', 'Compliance monitoring', ''], true);
  b.addData(['Violations', 'HOS + VEDR violations', 'Operational events', 'Behavior trend', '']);
  b.addData(['Accidents', 'Incident severity + preventability', 'Operational events', 'Loss analysis', ''], true);

  return b.toWorksheet([24, 60, 32, 36, 4]);
}

function buildFleetSummary() {
  const b = new SheetBuilder(4);
  const s = loadSafetySettings();
  const timeRes = computeCombinedScore(SMS_INSP, SMS_CRASHES, s, 'time');
  const distRes = computeCombinedScore(SMS_INSP, SMS_CRASHES, s, 'distance');
  const opScore = operationalScore(s);
  const cvorScore = cvorCompositeScore();

  b.addTitle('FLEET SUMMARY');
  b.addSubtitle(`Generated: ${new Date().toLocaleDateString()}`);
  b.addEmpty();

  b.addSection('COMBINED SCORES (TIME VS DISTANCE)');
  b.addHeaders(['Metric', 'Time Mode', 'Distance Mode', 'Formula']);
  const rows: [string, number | string, number | string, string][] = [
    ['Operational Score', opScore, opScore, 'Weighted operational blend'],
    ['CVOR Score', cvorScore, cvorScore, '100 - cvorRating'],
    ['Regulatory Score', timeRes.regulatoryScore, distRes.regulatoryScore, `SMS(${s.smsBlend}%) + CVOR(${s.cvorBlend}%)`],
    ['Fleet Safety Score', timeRes.fleetSafetyScore, distRes.fleetSafetyScore, `Operational(${s.opWeight}%) + Regulatory(${s.regWeight}%)`],
    ['Fleet Safety Rating', timeRes.rating, distRes.rating, 'Threshold-based label'],
  ];

  rows.forEach((r, i) => {
    const rowIndex = b.addData(r, i % 2 === 1);
    if (r[0] === 'Fleet Safety Score') {
      const c1 = scoreColor(r[1] as number, s);
      const c2 = scoreColor(r[2] as number, s);
      b.colorizeCellRowCol(rowIndex, 1, c1.bg, c1.fg);
      b.colorizeCellRowCol(rowIndex, 2, c2.bg, c2.fg);
    }
  });

  return b.toWorksheet([32, 18, 18, 52]);
}

function buildSmsCvorSummary() {
  const b = new SheetBuilder(6);
  const s = loadSafetySettings();
  const cfg = {
    formulaMode: 'time' as const,
    carrierType: s.smsCarrierType,
    segment: s.smsCarrierSegment,
    avgPU: s.smsAvgPU,
    annualVmtPerPU: s.smsAnnualVmtPerPU,
    decayBand1Pct: s.smsDecayBand1Pct,
    decayBand2Pct: s.smsDecayBand2Pct,
    decayBand3Pct: s.smsDecayBand3Pct,
    lookbackMonths: s.smsLookbackMonths,
  };
  const vMult = { oosBonus: 0, perInspectionCap: 0 };
  const basics = computeCarrierBASICs(SMS_INSP, SMS_CRASHES, cfg, vMult);
  const combined = computeCombinedScore(SMS_INSP, SMS_CRASHES, s, 'time');
  const cv = carrierProfile.cvorAnalysis;

  b.addTitle('SMS AND CVOR SUMMARY');
  b.addSubtitle(`Carrier: ${carrierProfile.name} | Type: ${s.smsCarrierType} | CVOR: ${carrierProfile.cvor}`);
  b.addEmpty();

  b.addSection('REGULATORY SCORE BLEND');
  b.addHeaders(['Metric', 'Value', 'Rule', 'Weight', 'Contribution', '']);
  b.addData(['SMS Score', combined.smsScore, '100 - weighted percentile profile', `${s.smsBlend}%`, +(combined.smsScore * (s.smsBlend / 100)).toFixed(2), '']);
  b.addData(['CVOR Score', combined.cvorScore, '100 - cvorRating', `${s.cvorBlend}%`, +(combined.cvorScore * (s.cvorBlend / 100)).toFixed(2), ''], true);
  b.addData(['Regulatory Score', combined.regulatoryScore, '(SMS*blend + CVOR*blend)/(sum blends)', '100%', combined.regulatoryScore, '']);
  b.addEmpty();

  b.addSection('SMS BASIC SNAPSHOT (TIME MODE)');
  b.addHeaders(['BASIC', 'Measure', 'Percentile', 'Threshold', 'Status', 'Description']);
  const keys: BasicKey[] = ['unsafe_driving', 'crash_indicator', 'hos_compliance', 'vehicle_maintenance', 'controlled_substances', 'hm_compliance', 'driver_fitness'];
  keys.forEach((key, i) => {
    const bas = basics[key];
    const threshold = ALERT_THRESHOLDS[s.smsCarrierType]?.[key] ?? 65;
    const alert = bas.percentile >= threshold;
    b.addData(
      [BASIC_LABELS[key], +bas.measure.toFixed(3), +bas.percentile.toFixed(1), threshold, alert ? 'ALERT' : 'OK', BASIC_DESCRIPTIONS[key]],
      i % 2 === 1,
      alert ? { 4: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined,
    );
  });
  b.addEmpty();

  b.addSection('CVOR SNAPSHOT');
  b.addHeaders(['Component', 'Raw %', 'Weight %', 'Weighted %', 'Counts', 'Notes']);
  b.addData(['Collisions', cv.collisions.percentage, cv.collisions.weight, +(cv.collisions.percentage * cv.collisions.weight / 100).toFixed(2), cv.counts.collisions, 'Collision profile']);
  b.addData(['Convictions', cv.convictions.percentage, cv.convictions.weight, +(cv.convictions.percentage * cv.convictions.weight / 100).toFixed(2), cv.counts.convictions, 'Conviction profile'], true);
  b.addData(['Inspections', cv.inspections.percentage, cv.inspections.weight, +(cv.inspections.percentage * cv.inspections.weight / 100).toFixed(2), 'N/A', 'Inspection profile']);

  return b.toWorksheet([24, 14, 12, 14, 12, 40]);
}

function buildSMSBasics() {
  const b = new SheetBuilder(6);
  const s = loadSafetySettings();
  const cfg = {
    formulaMode: 'time' as const,
    carrierType: s.smsCarrierType,
    segment: s.smsCarrierSegment,
    avgPU: s.smsAvgPU,
    annualVmtPerPU: s.smsAnnualVmtPerPU,
    decayBand1Pct: s.smsDecayBand1Pct,
    decayBand2Pct: s.smsDecayBand2Pct,
    decayBand3Pct: s.smsDecayBand3Pct,
    lookbackMonths: s.smsLookbackMonths,
  };
  const vMult = { oosBonus: 0, perInspectionCap: 0 };
  const timeBasics = computeCarrierBASICs(SMS_INSP, SMS_CRASHES, cfg, vMult);
  const distBasics = computeCarrierBASICs(SMS_INSP, SMS_CRASHES, { ...cfg, formulaMode: 'distance' }, vMult);
  const basicKeys: BasicKey[] = ['unsafe_driving', 'crash_indicator', 'hos_compliance', 'vehicle_maintenance', 'controlled_substances', 'hm_compliance', 'driver_fitness'];

  b.addTitle('SMS BASIC ANALYSIS');
  b.addSubtitle(`Carrier: ${carrierProfile.name} | Type: ${s.smsCarrierType} | Avg PU: ${s.smsAvgPU}`);
  b.addEmpty();

  b.addSection('TIME-WEIGHTED SCORING');
  b.addHeaders(['BASIC', 'Measure', 'Percentile', 'Threshold', 'Status', 'Description']);
  basicKeys.forEach((key, i) => {
    const bas = timeBasics[key];
    const threshold = ALERT_THRESHOLDS[s.smsCarrierType]?.[key] ?? 65;
    const alert = bas.percentile >= threshold;
    b.addData(
      [BASIC_LABELS[key], +bas.measure.toFixed(3), +bas.percentile.toFixed(1), threshold, alert ? 'ALERT' : 'OK', BASIC_DESCRIPTIONS[key]],
      i % 2 === 1,
      alert ? { 4: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined,
    );
  });
  b.addEmpty();

  b.addSection('DISTANCE-WEIGHTED SCORING');
  b.addHeaders(['BASIC', 'Measure', 'Percentile', 'Threshold', 'Status', 'Description']);
  basicKeys.forEach((key, i) => {
    const bas = distBasics[key];
    const threshold = ALERT_THRESHOLDS[s.smsCarrierType]?.[key] ?? 65;
    const alert = bas.percentile >= threshold;
    b.addData(
      [BASIC_LABELS[key], +bas.measure.toFixed(3), +bas.percentile.toFixed(1), threshold, alert ? 'ALERT' : 'OK', BASIC_DESCRIPTIONS[key]],
      i % 2 === 1,
      alert ? { 4: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined,
    );
  });

  return b.toWorksheet([24, 16, 16, 14, 12, 44]);
}

function buildCVOR() {
  const b = new SheetBuilder(5);
  const cp = carrierProfile;
  const cv = cp.cvorAnalysis;

  b.addTitle('CVOR ANALYSIS');
  b.addSubtitle(`Carrier: ${cp.name} | CVOR: ${cp.cvor}`);
  b.addEmpty();

  b.addSection('CVOR COMPONENT BREAKDOWN');
  b.addHeaders(['Component', 'Raw %', 'Weight %', 'Weighted Contribution', 'Description']);
  b.addData(['Collisions', cv.collisions.percentage, cv.collisions.weight, +(cv.collisions.percentage * cv.collisions.weight / 100).toFixed(2), 'Collision history']);
  b.addData(['Convictions', cv.convictions.percentage, cv.convictions.weight, +(cv.convictions.percentage * cv.convictions.weight / 100).toFixed(2), 'HTA / CTA convictions'], true);
  b.addData(['Inspections', cv.inspections.percentage, cv.inspections.weight, +(cv.inspections.percentage * cv.inspections.weight / 100).toFixed(2), 'Inspection outcomes']);
  b.addEmpty();

  b.addSection('OUT-OF-SERVICE RATES');
  b.addHeaders(['Category', 'Carrier Rate', 'National Average', 'Comparison', 'Risk Flag']);
  const vehAbove = parseFloat(cp.oosRates.vehicle.carrier) > parseFloat(cp.oosRates.vehicle.national);
  b.addData(
    ['Vehicle OOS', cp.oosRates.vehicle.carrier, cp.oosRates.vehicle.national, vehAbove ? 'ABOVE' : 'BELOW', vehAbove ? 'Review maintenance' : 'OK'],
    false,
    vehAbove ? { 4: { bg: C.RED_BG, fg: C.RED_FG, b: true } } : undefined,
  );

  return b.toWorksheet([30, 22, 18, 30, 30]);
}

function buildDrivers() {
  const b = new SheetBuilder(11);
  const s = loadSafetySettings();

  b.addTitle('DRIVERS');
  b.addSubtitle(`${DRIVER_SAFETY_SCORES.length} driver records`);
  b.addEmpty();

  b.addHeaders(['Driver ID', 'Name', 'License #', 'Status', 'Overall %', 'Accidents', 'ELD', 'Inspections', 'Violations', 'Trainings', 'VEDR']);
  DRIVER_SAFETY_SCORES.forEach((drv, i) => {
    const color = scoreColor(drv.overall, s);
    b.addData(
      [drv.driverId, drv.name, drv.licenseNumber, drv.status, drv.overall, drv.accidents, drv.eld, drv.inspections, drv.violations, drv.trainings, drv.vedr],
      i % 2 === 1,
      { 4: { bg: color.bg, fg: color.fg, b: true } },
    );
  });

  return b.toWorksheet([12, 22, 16, 10, 12, 12, 12, 12, 12, 12, 14]);
}

function buildAssets() {
  const b = new SheetBuilder(10);

  b.addTitle('ASSETS');
  b.addSubtitle(`${INITIAL_ASSETS.length} asset records`);
  b.addEmpty();

  b.addHeaders(['Unit #', 'Make', 'Model', 'Year', 'Type', 'Status', 'Odometer', 'Reg. Expiry', 'License Plate', 'VIN']);
  INITIAL_ASSETS.forEach((a, i) => {
    b.addData(
      [
        a.unitNumber,
        a.make,
        a.model,
        a.year,
        (a as any).type ?? a.make,
        a.operationalStatus,
        (a as any).currentOdometer ?? a.odometer ?? '',
        a.registrationExpiryDate ?? '',
        (a as any).licensePlate ?? '',
        a.vin ?? '',
      ],
      i % 2 === 1,
    );
  });

  return b.toWorksheet([14, 14, 14, 10, 14, 14, 14, 16, 14, 18]);
}

function buildDriverDetailSheet(driver: any, index: number) {
  const b = new SheetBuilder(8);
  const s = loadSafetySettings();
  const mode: 'time' | 'distance' = s.defaultMode === 'distance' ? 'distance' : 'time';
  const score = DRIVER_SAFETY_SCORES.find((d) => d.driverId === driver.id);
  const driverScore = score ?? {
    driverId: driver.id,
    name: driver.name,
    licenseNumber: driver.licenseNumber ?? '-',
    status: driver.status ?? '-',
    overall: 0,
    accidents: 0,
    eld: 0,
    inspections: 0,
    violations: 0,
    trainings: 0,
    vedr: 0,
  };
  const keyIndicator = DRIVER_KEY_INDICATORS.find((k) => k.driverId === driver.id);
  const driverInspections = (inspectionsData as any[]).filter((insp) => insp.driverId === driver.id);
  const driverIncidents = INCIDENTS.filter((inc: any) => inc.driver?.driverId === driver.id);
  const driverHos = HOS_VIOLATION_EVENTS.filter((v) => v.driverId === driver.id);
  const driverVedr = VEDR_VIOLATION_EVENTS.filter((v) => v.driverId === driver.id);
  const totalSmsPoints = driverInspections.reduce((sum, insp) => sum + ((insp.violations ?? []).reduce((s: number, v: any) => s + (v.severity ?? 0), 0)), 0);
  const preventableIncidents = driverIncidents.filter((inc: any) => inc.preventability?.isPreventable === true).length;
  const totalIncidentCost = driverIncidents.reduce((sum: number, inc: any) => sum + (inc.costs?.totalAccidentCosts ?? 0), 0);
  const smsCfg = buildSmsConfigFromSettings(s, mode);
  const smsVMult = buildViolationMultipliersFromSettings(s);
  const driverBasics = computeDriverBASICs(driver.id, SMS_INSP, SMS_CRASHES, smsCfg, smsVMult);
  const driverSmsComposite = computeCompositeScore(driverBasics);
  const driverWeeks = buildDriverWeeksForExport(driverScore);
  const thisWeek = driverWeeks[driverWeeks.length - 1];
  const prevWeek = driverWeeks[driverWeeks.length - 2];
  const netChange = +(thisWeek && prevWeek ? thisWeek.score - prevWeek.score : 0).toFixed(2);
  const driverFactors = [
    { label: 'Overall Safety', score: driverScore.overall },
    { label: 'Accidents', score: driverScore.accidents },
    { label: 'ELD / HOS', score: driverScore.eld },
    { label: 'Camera / VEDR', score: driverScore.vedr },
    { label: 'Inspections', score: driverScore.inspections },
    { label: 'Violations', score: driverScore.violations },
    { label: 'Training', score: driverScore.trainings },
  ];
  const rankingRows = [...DRIVER_SAFETY_SCORES]
    .sort((a, b2) => b2.overall - a.overall)
    .map((d, i) => ({
      rank: i + 1,
      ...d,
      delta: +(d.overall - FLEET_AVERAGE).toFixed(2),
    }));
  const currentRank = rankingRows.find((r) => r.driverId === driver.id)?.rank ?? '-';

  b.addTitle(`DRIVER PROFILE - ${driver.name}`);
  b.addSubtitle(`Driver ${index + 1} | ID: ${driver.id} | Status: ${driver.status} | Rank: ${currentRank}`);
  b.addEmpty();

  addKeyValueGrid(b, 'PROFILE', [
    ['Driver ID', driver.id],
    ['Name', driver.name],
    ['Status', driver.status],
    ['Driver Type', driver.driverType],
    ['Phone', driver.phone],
    ['Email', driver.email],
    ['Terminal', driver.terminal],
    ['Carrier Code', driver.carrierCode],
    ['Hired Date', driver.hiredDate],
    ['Date Added', driver.dateAdded],
    ['DOB', driver.dob],
    ['Gender', driver.gender],
    ['License #', driver.licenseNumber],
    ['License State', driver.licenseState],
    ['License Expiry', driver.licenseExpiry],
    ['Authorized To Work', driver.authorizedToWork],
    ['Address', composeAddress([driver.address, driver.unit, driver.city, driver.state, driver.zip, driver.country])],
    ['Citizenship', driver.citizenship],
  ]);

  addKeyValueGrid(b, 'SAFETY SUMMARY', [
    ['Overall Score', driverScore.overall],
    ['Accident Score', driverScore.accidents],
    ['ELD Score', driverScore.eld],
    ['Inspection Score', driverScore.inspections],
    ['Violation Score', driverScore.violations],
    ['Training Score', driverScore.trainings],
    ['VEDR Score', driverScore.vedr],
    ['Incidents', driverIncidents.length],
    ['Preventable Incidents', preventableIncidents],
    ['Inspections', driverInspections.length],
    ['HOS Violations', driverHos.length],
    ['VEDR Violations', driverVedr.length],
    ['Total SMS Points', totalSmsPoints],
    ['Incident Cost', totalIncidentCost],
    ['Key Indicator Status', keyIndicator?.status ?? 'N/A'],
  ]);

  b.addSection('DASHBOARD SCORE CARDS');
  b.addHeaders(['Card', 'Score %', 'Fleet Avg %', 'Delta', 'Band', 'Formula', 'Status', '']);
  driverFactors.forEach((f, i) => {
    const delta = +(f.score - FLEET_AVERAGE).toFixed(2);
    const rowIndex = b.addData([
      f.label,
      +f.score.toFixed(2),
      +FLEET_AVERAGE.toFixed(2),
      delta,
      getScoreBandLabel(f.score, s),
      'delta = factorScore - fleetAverage',
      delta >= 0 ? 'Above Fleet Avg' : 'Below Fleet Avg',
      '',
    ], i % 2 === 1);
    const color = scoreColor(f.score, s);
    b.colorizeCellRowCol(rowIndex, 1, color.bg, color.fg);
  });
  b.addData([
    'Key Indicator',
    '-',
    '-',
    '-',
    keyIndicator?.status ?? 'N/A',
    'PASS when event counts remain at 0',
    `${keyIndicator?.status ?? 'N/A'} (${(keyIndicator?.cellPhoneEvents ?? 0) + (keyIndicator?.speedingEvents ?? 0) + (keyIndicator?.followingDistanceEvents ?? 0) + (keyIndicator?.seatBeltEvents ?? 0) + (keyIndicator?.obstructedCameraEvents ?? 0)} events)`,
    '',
  ], true, (keyIndicator?.status ?? 'N/A') === 'FAIL' ? { 6: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined);
  b.addEmpty();

  b.addSection('CONTRIBUTING FACTORS VS FLEET AVERAGE');
  b.addHeaders(['Factor', 'Driver %', 'Fleet Avg %', 'Delta', 'Level', 'Widget', 'Formula', '']);
  driverFactors.forEach((f, i) => {
    const delta = +(f.score - FLEET_AVERAGE).toFixed(2);
    b.addData([
      f.label,
      +f.score.toFixed(2),
      +FLEET_AVERAGE.toFixed(2),
      delta,
      delta >= 0 ? 'Positive' : 'Negative',
      'Contributing Factors',
      'delta = driverFactor - fleetAverage',
      '',
    ], i % 2 === 1);
  });
  b.addEmpty();

  b.addSection('THIS WEEK SNAPSHOT');
  b.addHeaders(['Week', 'Safety Score', 'Net Change', 'Accidents', 'ELD / HOS', 'Camera', 'Violations', 'Training']);
  if (thisWeek) {
    const scoreBand = scoreColor(thisWeek.score, s);
    b.addData(
      [
        thisWeek.label,
        +thisWeek.score.toFixed(2),
        netChange,
        +thisWeek.behaviors[0].toFixed(2),
        +thisWeek.behaviors[1].toFixed(2),
        +thisWeek.behaviors[2].toFixed(2),
        +thisWeek.behaviors[3].toFixed(2),
        +thisWeek.behaviors[4].toFixed(2),
      ],
      false,
      { 1: { bg: scoreBand.bg, fg: scoreBand.fg, b: true } },
    );
  }
  b.addData([
    'Delta vs Fleet Avg',
    '',
    '',
    +(driverScore.accidents - FLEET_AVERAGE).toFixed(2),
    +(driverScore.eld - FLEET_AVERAGE).toFixed(2),
    +(driverScore.vedr - FLEET_AVERAGE).toFixed(2),
    +(driverScore.violations - FLEET_AVERAGE).toFixed(2),
    +(driverScore.trainings - FLEET_AVERAGE).toFixed(2),
  ], true);
  b.addEmpty();

  b.addSection('KEY INDICATOR EVENTS');
  b.addHeaders(['Cell Phone', 'Speeding', 'Following Dist.', 'Seat Belt', 'Cam Block', 'Status', 'Notes', '']);
  b.addData([
    keyIndicator?.cellPhoneEvents ?? 0,
    keyIndicator?.speedingEvents ?? 0,
    keyIndicator?.followingDistanceEvents ?? 0,
    keyIndicator?.seatBeltEvents ?? 0,
    keyIndicator?.obstructedCameraEvents ?? 0,
    keyIndicator?.status ?? 'N/A',
    'Monthly safety event counters',
    '',
  ]);
  b.addEmpty();

  b.addSection('SMS BASIC SCORES (DRIVER)');
  b.addHeaders(['BASIC', 'Measure', 'Percentile', 'Threshold', 'Status', 'Violations', 'Score', 'Description']);
  const driverBasicKeys: BasicKey[] = ['unsafe_driving', 'crash_indicator', 'hos_compliance', 'vehicle_maintenance', 'controlled_substances', 'hm_compliance', 'driver_fitness'];
  driverBasicKeys.forEach((key, i) => {
    const br = driverBasics[key];
    const status = br.isAlert ? 'ALERT' : br.hasSufficientData ? 'OK' : 'LOW DATA';
    b.addData(
      [
        br.label,
        +br.measure.toFixed(3),
        +br.percentile.toFixed(1),
        br.threshold,
        status,
        br.violationCount,
        +br.score.toFixed(1),
        BASIC_DESCRIPTIONS[key],
      ],
      i % 2 === 1,
      br.isAlert ? { 4: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined,
    );
  });
  const smsCompositeColor = scoreColor(driverSmsComposite, s);
  b.addData(
    [
      'Composite',
      '-',
      '-',
      '-',
      mode.toUpperCase(),
      '-',
      +driverSmsComposite.toFixed(1),
      'FMCSA-style weighted BASIC composite',
    ],
    true,
    { 6: { bg: smsCompositeColor.bg, fg: smsCompositeColor.fg, b: true } },
  );
  b.addEmpty();

  b.addSection('DRIVER FLEET RANKING CONTEXT');
  b.addHeaders(['Rank', 'Driver', 'Overall %', 'Delta vs Fleet', 'Status', 'Accidents', 'ELD', 'Violations']);
  rankingRows.forEach((r, i) => {
    const rowColors = r.driverId === driver.id ? { 1: { bg: C.BLUE_BG, fg: C.BLUE_FG, b: true } } : undefined;
    b.addData([
      r.rank,
      r.name,
      +r.overall.toFixed(2),
      r.delta,
      r.status,
      +r.accidents.toFixed(2),
      +r.eld.toFixed(2),
      +r.violations.toFixed(2),
    ], i % 2 === 1, rowColors);
  });
  b.addEmpty();

  b.addSection('EMERGENCY CONTACTS');
  b.addHeaders(['Name', 'Relation', 'Phone', 'Email', '', '', '', '']);
  if (Array.isArray(driver.emergencyContacts) && driver.emergencyContacts.length) {
    driver.emergencyContacts.forEach((c: any, i: number) => {
      b.addData([c.name, c.relation, c.phone, c.email], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('LICENSES');
  b.addHeaders(['Type', 'Number', 'Class', 'Jurisdiction', 'Issue Date', 'Expiry Date', 'Status', 'Primary?']);
  const licenses = Array.isArray(driver.licenses) && driver.licenses.length
    ? driver.licenses
    : [{
        type: 'Primary',
        licenseNumber: driver.licenseNumber,
        class: '-',
        province: driver.licenseState,
        country: driver.country,
        issueDate: '-',
        expiryDate: driver.licenseExpiry,
        status: 'Valid',
        isPrimary: true,
      }];
  licenses.forEach((lic: any, i: number) => {
    b.addData([
      lic.type,
      lic.licenseNumber,
      lic.class,
      composeAddress([lic.province, lic.country]),
      lic.issueDate,
      lic.expiryDate,
      lic.status,
      lic.isPrimary ? 'Yes' : 'No',
    ], i % 2 === 1);
  });
  b.addEmpty();

  b.addSection('EMPLOYMENT HISTORY');
  b.addHeaders(['Employer', 'Start', 'End', 'Zone', 'Termination', 'Contact Name', 'Contact Phone', 'Contact Email']);
  if (Array.isArray(driver.employmentHistory) && driver.employmentHistory.length) {
    driver.employmentHistory.forEach((eh: any, i: number) => {
      b.addData([
        eh.employerName,
        eh.startDate,
        eh.endDate,
        eh.operatingZone,
        eh.terminationStatus,
        eh.employerContact?.name ?? '-',
        eh.employerContact?.phone ?? '-',
        eh.employerContact?.email ?? '-',
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('TRAVEL DOCUMENTS');
  b.addHeaders(['Doc ID', 'Type', 'Number', 'Country', 'Expiry', 'Upload Type', '', '']);
  if (Array.isArray(driver.travelDocuments) && driver.travelDocuments.length) {
    driver.travelDocuments.forEach((doc: any, i: number) => {
      b.addData([doc.id, doc.type, doc.number, doc.country, doc.expiryDate, doc.uploadType], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('RELATED INCIDENTS');
  b.addHeaders(['Incident ID', 'Date', 'Type', 'Preventable', 'Inj/Fatal', 'Tow', 'Hazmat', 'Cost']);
  if (driverIncidents.length) {
    driverIncidents.forEach((inc: any, i: number) => {
      b.addData([
        inc.incidentId,
        inc.occurredDate,
        inc.cause?.incidentType ?? '-',
        inc.preventability?.isPreventable === true ? 'Yes' : inc.preventability?.isPreventable === false ? 'No' : 'TBD',
        `${(inc.severity?.injuriesNonFatal ?? 0)}/${(inc.severity?.fatalities ?? 0)}`,
        inc.severity?.towAway ? 'Yes' : 'No',
        inc.severity?.hazmatReleased ? 'Yes' : 'No',
        inc.costs?.totalAccidentCosts ?? 0,
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('RELATED INSPECTIONS');
  b.addHeaders(['Inspection ID', 'Date', 'Level', 'Jurisdiction', 'Clean?', 'Has OOS?', 'Violation #', 'SMS Pts']);
  if (driverInspections.length) {
    driverInspections.forEach((insp: any, i: number) => {
      const smsPts = (insp.violations ?? []).reduce((sum: number, v: any) => sum + (v.severity ?? 0), 0);
      b.addData([
        insp.id,
        insp.date,
        insp.level,
        getJurisdiction(insp.state ?? ''),
        insp.isClean ? 'Yes' : 'No',
        insp.hasOOS ? 'Yes' : 'No',
        insp.violations?.length ?? 0,
        smsPts,
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('RELATED VIOLATIONS (HOS + VEDR)');
  b.addHeaders(['Type', 'ID', 'Date', 'Vehicle', 'Code', 'Description', 'Severity', 'OOS / Status']);
  const relatedViolations = [
    ...driverHos.map((v) => ({ type: 'HOS', ...v })),
    ...driverVedr.map((v) => ({ type: 'VEDR', ...v })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  if (relatedViolations.length) {
    relatedViolations.forEach((v, i) => {
      b.addData([
        v.type,
        v.id,
        v.date,
        v.vehicleId,
        v.violationCode,
        v.violationDescription,
        v.driverSeverity,
        `${v.isOos ? 'Yes' : 'No'} / ${v.status}`,
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }

  return b.toWorksheet([20, 24, 14, 18, 14, 18, 14, 24]);
}

function buildAssetDetailSheet(asset: any, index: number) {
  const b = new SheetBuilder(8);
  const s = loadSafetySettings();
  const mode: 'time' | 'distance' = s.defaultMode === 'distance' ? 'distance' : 'time';
  const assetIntervalMi = s.defaultInterval > 0 ? s.defaultInterval : 10000;
  const driverNameById = new Map(MOCK_DRIVERS.map((d: any) => [d.id, d.name]));

  const assetInspections = (inspectionsData as any[]).filter((insp) => {
    if (insp.assetId && String(insp.assetId) === String(asset.id)) return true;
    if (insp.vehiclePlate && asset.plateNumber && String(insp.vehiclePlate) === String(asset.plateNumber)) return true;
    if (Array.isArray(insp.units) && asset.vin) {
      return insp.units.some((u: any) => String(u.vin ?? '') === String(asset.vin));
    }
    return false;
  });

  const assetIncidents = INCIDENTS.filter((inc: any) => {
    if (!Array.isArray(inc.vehicles)) return false;
    return inc.vehicles.some((veh: any) => {
      const vehAssetId = String(veh.assetId ?? '');
      const vehVin = String(veh.vin ?? '');
      return vehAssetId === String(asset.id)
        || vehAssetId === String(asset.unitNumber)
        || (asset.vin && vehVin === String(asset.vin));
    });
  });

  const assetHos = HOS_VIOLATION_EVENTS.filter((v) => v.vehicleId === asset.unitNumber);
  const assetVedr = VEDR_VIOLATION_EVENTS.filter((v) => v.vehicleId === asset.unitNumber);
  const allAssetViol = [...assetHos.map((v) => ({ type: 'HOS', ...v })), ...assetVedr.map((v) => ({ type: 'VEDR', ...v }))];

  const assignmentIds = Array.isArray(asset.driverAssignments) ? asset.driverAssignments.map((a: any) => a.driverId) : [];
  const inspectionDriverIds = assetInspections.map((i: any) => i.driverId);
  const incidentDriverIds = assetIncidents.map((i: any) => i.driver?.driverId).filter(Boolean);
  const relatedDriverIds = Array.from(new Set([...assignmentIds, ...inspectionDriverIds, ...incidentDriverIds].filter(Boolean)));

  const totalIncidentCost = assetIncidents.reduce((sum: number, inc: any) => sum + (inc.costs?.totalAccidentCosts ?? 0), 0);
  const riskScores = getAssetSubScoresForExport(asset);
  const progress = getAssetIntervalProgressForExport(asset, assetIntervalMi);
  const maintenancePenalty = getMaintenancePenaltyFromProgress(progress);
  const adjustedOverall = clamp(riskScores.overall - maintenancePenalty, 30, 100);
  const odometerValue = asset.odometer ?? 0;
  const odometerInMi = asset.odometerUnit === 'km' ? odometerValue / 1.60934 : odometerValue;
  const sinceLastMi = odometerInMi % assetIntervalMi;
  const untilNextMi = assetIntervalMi - sinceLastMi;
  const assetWeeks = buildAssetWeeksForExport(odometerValue, riskScores);
  const thisWeek = assetWeeks[assetWeeks.length - 1];
  const prevWeek = assetWeeks[assetWeeks.length - 2];
  const netChange = +(thisWeek && prevWeek ? thisWeek.score - prevWeek.score : 0).toFixed(2);
  const smsCfg = buildSmsConfigFromSettings(s, mode);
  const smsVMult = buildViolationMultipliersFromSettings(s);
  const assetBasics = computeAssetBASICs(asset.unitNumber, SMS_INSP, SMS_CRASHES, smsCfg, smsVMult);
  const assetSmsComposite = computeCompositeScore(assetBasics);
  const riskFactors = [
    { label: 'Status', score: riskScores.statusScore, weekImpact: thisWeek?.behaviors[0] ?? 0 },
    { label: 'Age', score: riskScores.ageScore, weekImpact: thisWeek?.behaviors[1] ?? 0 },
    { label: 'Mileage', score: riskScores.mileageScore, weekImpact: thisWeek?.behaviors[2] ?? 0 },
    { label: 'Registration', score: riskScores.regScore, weekImpact: thisWeek?.behaviors[3] ?? 0 },
  ];
  const assetRankingRows = (INITIAL_ASSETS as any[])
    .map((a) => {
      const p = getAssetIntervalProgressForExport(a, assetIntervalMi);
      const penalty = getMaintenancePenaltyFromProgress(p);
      const score = clamp(getAssetRiskScoreForExport(a) - penalty, 30, 100);
      return {
        id: a.id,
        unitNumber: a.unitNumber,
        score,
        status: a.operationalStatus,
        progressPct: +(p * 100).toFixed(1),
        ageYears: new Date().getFullYear() - (a.year ?? new Date().getFullYear()),
        regExpiry: a.registrationExpiryDate ?? '-',
      };
    })
    .sort((a, b2) => b2.score - a.score);
  const assetRank = assetRankingRows.findIndex((r) => r.id === asset.id) + 1;

  b.addTitle(`ASSET PROFILE - ${asset.unitNumber}`);
  b.addSubtitle(`Asset ${index + 1} | ID: ${asset.id} | Status: ${asset.operationalStatus} | Rank: ${assetRank > 0 ? assetRank : '-'}`);
  b.addEmpty();

  b.addSection('RISK SCORE SUMMARY');
  b.addHeaders(['Metric', 'Score %', 'Fleet Avg %', 'Delta', 'Band', 'Formula', 'Setting', '']);
  const riskSummaryRows = [
    {
      metric: 'Overall (Adjusted)',
      score: adjustedOverall,
      formula: 'adjusted = baseOverall - maintenancePenalty',
      setting: `defaultInterval=${assetIntervalMi}mi`,
    },
    {
      metric: 'Status',
      score: riskScores.statusScore,
      formula: 'status by operational state',
      setting: `active=${s.activeScore}, maint=${s.maintScore}, oos=${s.oosStatusScore}`,
    },
    {
      metric: 'Age',
      score: riskScores.ageScore,
      formula: 'age score from age decay thresholds',
      setting: `ageDecayStart=${s.ageDecayStart}, ageDecayRate=${s.ageDecayRate}`,
    },
    {
      metric: 'Mileage',
      score: riskScores.mileageScore,
      formula: 'mileage score from odometer band',
      setting: `defaultInterval=${s.defaultInterval}, curve=${s.mileageCurve}`,
    },
    {
      metric: 'Registration',
      score: riskScores.regScore,
      formula: 'registration score from days-to-expiry',
      setting: `regWarningDays=${s.regWarningDays}, regExpiredPenalty=${s.regExpiredPenalty}`,
    },
  ];
  riskSummaryRows.forEach((r, i) => {
    const delta = +(r.score - FLEET_AVERAGE).toFixed(2);
    const rowIndex = b.addData([
      r.metric,
      +r.score.toFixed(2),
      +FLEET_AVERAGE.toFixed(2),
      delta,
      getScoreBandLabel(r.score, s),
      r.formula,
      r.setting,
      '',
    ], i % 2 === 1);
    const color = scoreColor(r.score, s);
    b.colorizeCellRowCol(rowIndex, 1, color.bg, color.fg);
  });
  b.addEmpty();

  b.addSection('MAINTENANCE INTERVAL PROGRESS');
  b.addHeaders(['Metric', 'Value', 'Formula', 'Threshold / Rule', 'Context', '', '', '']);
  b.addData(['Interval (mi)', +assetIntervalMi.toFixed(0), 'selected interval', 'settings.defaultInterval', 'Used for maintenance-progress penalty']);
  b.addData(['Current Odometer (mi)', +odometerInMi.toFixed(0), 'odoInMi = km ? odo/1.60934 : odo', 'Asset odometer normalized to miles', asset.odometerUnit === 'km' ? 'Source unit: km' : 'Source unit: mi'], true);
  b.addData(['Since Last Service (mi)', +sinceLastMi.toFixed(1), 'sinceLast = odometer % interval', 'higher value means approaching service', 'Progress numerator']);
  b.addData(['Until Next Service (mi)', +untilNextMi.toFixed(1), 'untilNext = interval - sinceLast', 'lower value means due soon', 'Remaining mileage'], true);
  b.addData(['Interval Used (%)', +(progress * 100).toFixed(2), 'progress = sinceLast / interval', 'Penalty bands: >50%=4, >75%=10, >90%=18', 'Dashboard maintenance bar']);
  b.addData(['Maintenance Penalty', maintenancePenalty, 'penalty by progress band', 'applies to overall risk score', 'adjustedOverall only'], true);
  b.addEmpty();

  b.addSection('THIS WEEK RISK SNAPSHOT');
  b.addHeaders(['Week', 'Risk Score', 'Net Change', 'Status', 'Age', 'Mileage', 'Reg.', 'Mode']);
  if (thisWeek) {
    const scoreBand = scoreColor(thisWeek.score, s);
    b.addData(
      [
        thisWeek.label,
        +thisWeek.score.toFixed(2),
        netChange,
        +thisWeek.behaviors[0].toFixed(2),
        +thisWeek.behaviors[1].toFixed(2),
        +thisWeek.behaviors[2].toFixed(2),
        +thisWeek.behaviors[3].toFixed(2),
        mode.toUpperCase(),
      ],
      false,
      { 1: { bg: scoreBand.bg, fg: scoreBand.fg, b: true } },
    );
  }
  b.addData([
    'Delta vs Fleet Avg',
    '',
    '',
    +(riskScores.statusScore - FLEET_AVERAGE).toFixed(2),
    +(riskScores.ageScore - FLEET_AVERAGE).toFixed(2),
    +(riskScores.mileageScore - FLEET_AVERAGE).toFixed(2),
    +(riskScores.regScore - FLEET_AVERAGE).toFixed(2),
    'Factor baseline',
  ], true);
  b.addEmpty();

  b.addSection('RISK FACTORS');
  b.addHeaders(['Factor', 'Score %', 'Delta vs Fleet', 'This Week Impact', 'Status', 'Rule', 'Widget', '']);
  riskFactors.forEach((f, i) => {
    b.addData([
      f.label,
      +f.score.toFixed(2),
      +(f.score - FLEET_AVERAGE).toFixed(2),
      +f.weekImpact.toFixed(2),
      f.score >= FLEET_AVERAGE ? 'Positive' : 'Negative',
      'factorDelta = factorScore - fleetAverage',
      'Risk Factors panel',
      '',
    ], i % 2 === 1);
  });
  b.addEmpty();

  b.addSection('SMS BASIC SCORES (ASSET)');
  b.addHeaders(['BASIC', 'Measure', 'Percentile', 'Threshold', 'Status', 'Violations', 'Score', 'Description']);
  const assetBasicKeys: BasicKey[] = ['vehicle_maintenance', 'hm_compliance'];
  assetBasicKeys.forEach((key, i) => {
    const br = assetBasics[key];
    const status = br.isAlert ? 'ALERT' : br.hasSufficientData ? 'OK' : 'LOW DATA';
    b.addData(
      [
        br.label,
        +br.measure.toFixed(3),
        +br.percentile.toFixed(1),
        br.threshold,
        status,
        br.violationCount,
        +br.score.toFixed(1),
        BASIC_DESCRIPTIONS[key],
      ],
      i % 2 === 1,
      br.isAlert ? { 4: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined,
    );
  });
  const compositeColor = scoreColor(assetSmsComposite, s);
  b.addData(
    [
      'Composite',
      '-',
      '-',
      '-',
      mode.toUpperCase(),
      '-',
      +assetSmsComposite.toFixed(1),
      'Asset composite from Vehicle Maintenance + HM Compliance',
    ],
    true,
    { 6: { bg: compositeColor.bg, fg: compositeColor.fg, b: true } },
  );
  b.addEmpty();

  b.addSection('ASSET FLEET RANKING CONTEXT');
  b.addHeaders(['Rank', 'Unit #', 'Score %', 'Status', 'Interval Used %', 'Age (yr)', 'Reg. Expiry', '']);
  assetRankingRows.forEach((r, i) => {
    const rowColors = r.id === asset.id ? { 1: { bg: C.GREEN_BG, fg: C.GREEN_FG, b: true } } : undefined;
    b.addData([
      i + 1,
      r.unitNumber,
      +r.score.toFixed(2),
      r.status,
      r.progressPct,
      r.ageYears,
      r.regExpiry,
      '',
    ], i % 2 === 1, rowColors);
  });
  b.addEmpty();

  addKeyValueGrid(b, 'ASSET IDENTITY', [
    ['Asset ID', asset.id],
    ['Unit Number', asset.unitNumber],
    ['Status', asset.operationalStatus],
    ['Asset Category', asset.assetCategory],
    ['Asset Type', asset.assetType],
    ['Vehicle Type', asset.vehicleType],
    ['Year', asset.year],
    ['Make', asset.make],
    ['Model', asset.model],
    ['Color', asset.color],
    ['VIN', asset.vin],
    ['Date Added', asset.dateAdded],
    ['Date Removed', asset.dateRemoved],
  ]);

  addKeyValueGrid(b, 'REGISTRATION AND INSURANCE', [
    ['Plate Number', asset.plateNumber],
    ['Plate Jurisdiction', asset.plateJurisdiction],
    ['Plate Country', asset.plateCountry],
    ['Plate Type', asset.plateType],
    ['Registration Issue', asset.registrationIssueDate],
    ['Registration Expiry', asset.registrationExpiryDate],
    ['Insurance Added', asset.insuranceAddedDate],
    ['Insurance Removed', asset.insuranceRemovedDate],
    ['Address', composeAddress([asset.streetAddress, asset.city, asset.stateProvince, asset.zipCode, asset.country])],
    ['Yard ID', asset.yardId],
  ]);

  addKeyValueGrid(b, 'WEIGHTS AND ODOMETER', [
    ['Gross Weight', asset.grossWeight],
    ['Gross Unit', asset.grossWeightUnit],
    ['Unloaded Weight', asset.unloadedWeight],
    ['Unloaded Unit', asset.unloadedWeightUnit],
    ['Odometer', asset.odometer],
    ['Odometer Unit', asset.odometerUnit],
    ['Permits Count', Array.isArray(asset.permits) ? asset.permits.length : 0],
    ['Related Inspections', assetInspections.length],
    ['Related Incidents', assetIncidents.length],
    ['Related Violations', allAssetViol.length],
    ['Incident Cost', totalIncidentCost],
  ]);

  addKeyValueGrid(b, 'FINANCIAL AND OWNERSHIP', [
    ['Financial Structure', asset.financialStructure],
    ['Market Value', asset.marketValue],
    ['Market Value Currency', asset.marketValueCurrency],
    ['Owner Name', asset.ownerName],
    ['Leasing Name', asset.leasingName],
    ['Lessor Company', asset.lessorCompanyName],
    ['Rental Agency', asset.rentalAgencyName],
    ['Lien Holder Business', asset.lienHolderBusiness],
    ['Lien Holder Name', asset.lienHolderName],
    ['Notes', asset.notes],
  ]);

  addKeyValueGrid(b, 'MONITORING SETTINGS', [
    ['Plate Monitoring', asset.plateMonitoringEnabled],
    ['Plate Based On', asset.plateMonitorBasedOn],
    ['Plate Recurrence', asset.plateRenewalRecurrence],
    ['Plate Reminders', Array.isArray(asset.plateReminderSchedule) ? asset.plateReminderSchedule.join(', ') : '-'],
    ['Plate Channels', Array.isArray(asset.plateNotificationChannels) ? asset.plateNotificationChannels.join(', ') : '-'],
    ['Transponder #', asset.transponderNumber],
    ['Transponder Issue', asset.transponderIssueDate],
    ['Transponder Expiry', asset.transponderExpiryDate],
    ['Transponder Monitoring', asset.transponderMonitoringEnabled],
    ['Transponder Based On', asset.transponderMonitorBasedOn],
    ['Transponder Recurrence', asset.transponderRenewalRecurrence],
    ['Transponder Reminders', Array.isArray(asset.transponderReminderSchedule) ? asset.transponderReminderSchedule.join(', ') : '-'],
    ['Transponder Channels', Array.isArray(asset.transponderNotificationChannels) ? asset.transponderNotificationChannels.join(', ') : '-'],
  ]);

  b.addSection('DRIVER ASSIGNMENTS');
  b.addHeaders(['Driver ID', 'Driver Name', 'Start Date', 'End Date', 'Source', '', '', '']);
  if (Array.isArray(asset.driverAssignments) && asset.driverAssignments.length) {
    asset.driverAssignments.forEach((a: any, i: number) => {
      b.addData([
        a.driverId,
        driverNameById.get(a.driverId) ?? 'Unknown',
        a.startDate,
        a.endDate ?? '-',
        'Manual Assignment',
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', 'No direct assignment']);
  }
  b.addEmpty();

  b.addSection('RELATED DRIVERS');
  b.addHeaders(['Driver ID', 'Driver Name', 'Status', 'Source', 'License #', '', '', '']);
  if (relatedDriverIds.length) {
    relatedDriverIds.forEach((driverId, i) => {
      const profile = (MOCK_DRIVERS as any[]).find((d) => d.id === driverId);
      const source: string[] = [];
      if (assignmentIds.includes(driverId)) source.push('Assignment');
      if (inspectionDriverIds.includes(driverId)) source.push('Inspection');
      if (incidentDriverIds.includes(driverId)) source.push('Incident');
      b.addData([
        driverId,
        profile?.name ?? 'Unknown',
        profile?.status ?? '-',
        source.join(' | '),
        profile?.licenseNumber ?? '-',
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('RELATED INSPECTIONS');
  b.addHeaders(['Inspection ID', 'Date', 'Driver', 'Level', 'Jurisdiction', 'Clean?', 'OOS?', 'Violations #']);
  if (assetInspections.length) {
    assetInspections.forEach((insp: any, i: number) => {
      b.addData([
        insp.id,
        insp.date,
        insp.driver ?? driverNameById.get(insp.driverId) ?? '-',
        insp.level,
        getJurisdiction(insp.state ?? ''),
        insp.isClean ? 'Yes' : 'No',
        insp.hasOOS ? 'Yes' : 'No',
        insp.violations?.length ?? 0,
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('RELATED INCIDENTS');
  b.addHeaders(['Incident ID', 'Date', 'Driver', 'Type', 'Inj/Fatal', 'Tow', 'Preventable', 'Cost']);
  if (assetIncidents.length) {
    assetIncidents.forEach((inc: any, i: number) => {
      b.addData([
        inc.incidentId,
        inc.occurredDate,
        inc.driver?.name ?? '-',
        inc.cause?.incidentType ?? '-',
        `${(inc.severity?.injuriesNonFatal ?? 0)}/${(inc.severity?.fatalities ?? 0)}`,
        inc.severity?.towAway ? 'Yes' : 'No',
        inc.preventability?.isPreventable === true ? 'Yes' : inc.preventability?.isPreventable === false ? 'No' : 'TBD',
        inc.costs?.totalAccidentCosts ?? 0,
      ], i % 2 === 1);
    });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }
  b.addEmpty();

  b.addSection('RELATED VIOLATIONS (HOS + VEDR)');
  b.addHeaders(['Type', 'ID', 'Date', 'Driver', 'Code', 'Description', 'Severity', 'OOS / Status']);
  if (allAssetViol.length) {
    allAssetViol
      .sort((a, b2) => b2.date.localeCompare(a.date))
      .forEach((v, i) => {
        b.addData([
          v.type,
          v.id,
          v.date,
          v.driverName,
          v.violationCode,
          v.violationDescription,
          v.driverSeverity,
          `${v.isOos ? 'Yes' : 'No'} / ${v.status}`,
        ], i % 2 === 1);
      });
  } else {
    b.addData(['-', '-', '-', '-', '-', '-', '-', '-']);
  }

  return b.toWorksheet([20, 24, 14, 18, 14, 22, 12, 24]);
}

function buildInspections() {
  const b = new SheetBuilder(10);

  b.addTitle('INSPECTIONS');
  b.addSubtitle(`${inspectionsData.length} inspection records`);
  b.addEmpty();

  b.addHeaders(['Inspection ID', 'Date', 'Driver', 'Jurisdiction', 'Level', 'Location', 'Clean?', 'Has OOS?', 'Violations #', 'SMS Pts']);
  (inspectionsData as any[]).forEach((insp, i) => {
    const smsPts = (insp.violations ?? []).reduce((sum: number, v: any) => sum + (v.severity ?? 0), 0);
    const hasOos = !!insp.hasOOS;
    b.addData(
      [
        insp.id,
        insp.date,
        insp.driverName ?? '',
        getJurisdiction(insp.state),
        insp.level,
        `${insp.city ?? ''}, ${insp.state ?? ''}`,
        insp.isClean ? 'Yes' : 'No',
        hasOos ? 'Yes' : 'No',
        insp.violations?.length ?? 0,
        smsPts,
      ],
      i % 2 === 1,
      hasOos ? { 7: { bg: C.RED_BG, fg: C.RED_FG, b: true } } : undefined,
    );
  });

  return b.toWorksheet([14, 12, 20, 12, 10, 24, 10, 10, 12, 10]);
}

function buildViolations() {
  const b = new SheetBuilder(9);
  const allViol = [...HOS_VIOLATION_EVENTS, ...VEDR_VIOLATION_EVENTS];

  b.addTitle('VIOLATIONS');
  b.addSubtitle(`${allViol.length} HOS/VEDR violation records`);
  b.addEmpty();

  b.addHeaders(['Violation ID', 'Driver', 'Date', 'Vehicle', 'Description', 'Group', 'Severity', 'OOS?', 'Status']);
  allViol.forEach((v, i) => {
    const isOos = !!v.isOos;
    b.addData(
      [v.id, v.driverName, v.date, v.vehicleId, v.violationDescription, v.violationGroup, v.driverSeverity, isOos ? 'Yes' : 'No', v.status],
      i % 2 === 1,
      isOos ? { 7: { bg: C.RED_BG, fg: C.RED_FG, b: true } } : undefined,
    );
  });

  return b.toWorksheet([12, 18, 14, 12, 38, 20, 10, 10, 14]);
}

function buildAccidents() {
  const b = new SheetBuilder(12);

  b.addTitle('ACCIDENTS');
  b.addSubtitle(`${INCIDENTS.length} incident records`);
  b.addEmpty();

  b.addHeaders(['Incident ID', 'Date', 'Driver', 'Type', 'Fatalities', 'Injuries', 'Tow Away?', 'Hazmat?', 'Preventable?', 'Total Cost ($)', 'Location', 'Status']);
  INCIDENTS.forEach((inc, i) => {
    const fatal = inc.severity.fatalities > 0;
    b.addData(
      [
        inc.incidentId,
        inc.occurredDate,
        inc.driver?.name ?? '',
        inc.cause?.incidentType ?? '',
        inc.severity.fatalities,
        inc.severity.injuriesNonFatal,
        inc.severity.towAway ? 'Yes' : 'No',
        inc.severity.hazmatReleased ? 'Yes' : 'No',
        inc.preventability.isPreventable === true ? 'Yes' : inc.preventability.isPreventable === false ? 'No' : 'TBD',
        inc.costs?.totalAccidentCosts ?? 0,
        inc.location?.full ?? '',
        inc.status?.label ?? '',
      ],
      i % 2 === 1,
      fatal ? { 4: { bg: C.ALERT_BG, fg: C.WHITE, b: true } } : undefined,
    );
  });

  return b.toWorksheet([16, 14, 18, 12, 10, 10, 10, 10, 14, 16, 24, 14]);
}

export async function exportSafetyDataXLSX(opts: ExportOptions = {}): Promise<void> {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, buildIntroduction(opts), 'Introduction');
  XLSX.utils.book_append_sheet(wb, buildFormulas(), 'Formulas & Legend');
  XLSX.utils.book_append_sheet(wb, buildFiltersAndExtraction(opts), 'Filters & Extraction');
  XLSX.utils.book_append_sheet(wb, buildFleetSummary(), 'Fleet Summary');
  XLSX.utils.book_append_sheet(wb, buildSmsCvorSummary(), 'SMS & CVOR');
  XLSX.utils.book_append_sheet(wb, buildSMSBasics(), 'SMS BASIC Analysis');
  XLSX.utils.book_append_sheet(wb, buildCVOR(), 'CVOR Analysis');
  XLSX.utils.book_append_sheet(wb, buildDrivers(), 'Drivers');
  XLSX.utils.book_append_sheet(wb, buildAssets(), 'Assets');
  XLSX.utils.book_append_sheet(wb, buildInspections(), 'Inspections');
  XLSX.utils.book_append_sheet(wb, buildViolations(), 'Violations');
  XLSX.utils.book_append_sheet(wb, buildAccidents(), 'Accidents');

  // Individual Driver Tabs
  const usedSheetNames = new Set<string>(wb.SheetNames);
  (MOCK_DRIVERS as any[]).forEach((driver, idx) => {
    const ws = buildDriverDetailSheet(driver, idx);
    const sheetName = uniqueSheetName(
      `Driver_${String(idx + 1).padStart(2, '0')}_${driver.name}`,
      usedSheetNames,
    );
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Individual Asset Tabs
  (INITIAL_ASSETS as any[]).forEach((asset, idx) => {
    const ws = buildAssetDetailSheet(asset, idx);
    const label = asset.unitNumber || asset.id || `Asset_${idx + 1}`;
    const sheetName = uniqueSheetName(
      `Asset_${String(idx + 1).padStart(2, '0')}_${label}`,
      usedSheetNames,
    );
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const now = new Date();
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Safety_Analysis_Export_${stamp}.xlsx`;

  // Preferred path on Chromium/Edge: explicit Save As prompt with exact .xlsx file name.
  if (await saveWorkbookViaFilePicker(wb, filename)) return;

  try {
    // Primary path: lets SheetJS manage save flow with requested filename.
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', compression: true });
  } catch (err) {
    // Secondary fallback: object URL download.
    console.error('XLSX writeFile failed, trying blob fallback:', err);
    downloadWorkbookViaBlob(wb, filename);
  }
}
