// Hours-of-Service violations — catalog of FMCSA (US) + Canadian rule breaches,
// plus a deterministic sample dataset tied to the carrier's real HOS drivers.
import { useCallback, useEffect, useState } from 'react';
import { HOS_DAILY_LOGS, type HosDailyLog } from './hos.data';
import { getHosForCarrier } from './carrier-hos.data';
import { companyForDriver } from '@/data/eld-providers.data';
import { ACTIVITY_BADGE_TONE, type ActivityKind } from '@/components/ui/activity-kinds';

export type HosSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type HosVStatus = 'open' | 'review' | 'resolved';
export type HosRegion = 'US' | 'Canada' | 'Canada South' | 'Both';

/** Coarse violation family, shown as the "Type" column. */
export type HosCategory = 'Driving' | 'Duty / Shift' | 'Break' | 'Cycle' | 'Off-Duty' | 'Personal Conveyance';

export interface HosViolationType {
  id: string;
  label: string;
  description: string;
  region: HosRegion;
  category: HosCategory;
  defaultSeverity: HosSeverity;
  /** Risk points assigned when this rule is broken (higher = more serious). */
  points: number;
}

/** One entry in a violation's activity trail (when data arrived, reviews, etc.). */
export type HosActivityKind = 'received' | 'reviewed' | 'false' | 'note' | 'training' | 'status' | 'reopened' | 'warning' | 'alert' | 'notice' | 'terminated';

/** Resolution chosen by the reviewer when closing a violation. */
export type HosDisposition = 'training' | 'warning' | 'alert' | 'notice' | 'terminated' | 'false';
export const HOS_DISPOSITIONS: { id: HosDisposition; label: string; verb: string; kind: HosActivityKind; tone: string }[] = [
  { id: 'training', label: 'Assign training', verb: 'Assigned training', kind: 'training', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
  { id: 'warning', label: 'Issue warning letter', verb: 'Issued a warning letter', kind: 'warning', tone: 'border-amber-200 bg-amber-50 text-amber-700' },
  { id: 'alert', label: 'Send safety alert', verb: 'Sent a safety alert to the driver', kind: 'alert', tone: 'border-orange-200 bg-orange-50 text-orange-700' },
  { id: 'notice', label: 'Send driver notice', verb: 'Sent a notice to the driver', kind: 'notice', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  { id: 'terminated', label: 'Terminate driver', verb: 'Terminated the driver', kind: 'terminated', tone: 'border-red-200 bg-red-50 text-red-700' },
  { id: 'false', label: 'Dismiss as false', verb: 'Dismissed as a false violation', kind: 'false', tone: 'border-slate-200 bg-slate-100 text-slate-600' },
];
export const HOS_DISPOSITION_BY_ID: Record<string, { id: HosDisposition; label: string; verb: string; kind: HosActivityKind; tone: string }> =
  Object.fromEntries(HOS_DISPOSITIONS.map(d => [d.id, d]));
export interface HosActivity {
  id: string;
  at: string;   // 'YYYY-MM-DDTHH:MM'
  by: string;   // who performed it
  kind: ActivityKind;
  detail?: string;
  /** Optional title override + role/source badge for the timeline. */
  title?: string;
  badge?: { label: string; tone: string };
}

export interface HosTrainingAssignment {
  name: string;
  assignedBy: string;
  assignedAt: string;
}

export interface HosViolationRecord {
  id: string;
  typeId: string;
  driverId: string;
  driverName: string;
  company: string;    // source ELD provider that reported it (Samsara, Motive, …)
  unitId?: string;
  truckId?: string;   // power-unit number
  trailerId?: string; // trailer number
  dateTime: string; // 'YYYY-MM-DDTHH:MM' — violation start time
  durationMin: number; // how long the exceedance ran, in minutes
  severity: HosSeverity;
  riskPoints: number;
  actionTaken: string;
  reviewNotes: string;
  status: HosVStatus;
  // ── Review / verification ──────────────────────────────────────────────
  receivedAt: string;          // when the record arrived from the source API
  reviewedBy?: string;
  reviewedAt?: string;
  falseViolation?: boolean;    // reviewer flagged it as not a real violation
  disposition?: HosDisposition; // resolution chosen at close time
  training?: HosTrainingAssignment;
  activity: HosActivity[];     // audit trail
}

export const HOS_TRAINING_TYPES = [
  'HOS / ELD Refresher',
  'Fatigue Management',
  'Log Auditing & Corrections',
  'Hours-of-Service Rules (US)',
  'Hours-of-Service Rules (Canada)',
  'Trip Planning & Scheduling',
  'Defensive Driving',
];

export const HOS_ACTIVITY_META: Record<HosActivityKind, { label: string; tone: string; dot: string }> = {
  received: { label: 'Received from source', tone: 'text-slate-600', dot: 'bg-slate-400' },
  reviewed: { label: 'Reviewed', tone: 'text-blue-700', dot: 'bg-blue-500' },
  false: { label: 'Dismissed as false', tone: 'text-slate-700', dot: 'bg-slate-500' },
  note: { label: 'Note added', tone: 'text-slate-700', dot: 'bg-slate-500' },
  training: { label: 'Training assigned', tone: 'text-violet-700', dot: 'bg-violet-500' },
  status: { label: 'Status changed', tone: 'text-emerald-700', dot: 'bg-emerald-500' },
  reopened: { label: 'Reopened for review', tone: 'text-rose-700', dot: 'bg-rose-500' },
  warning: { label: 'Warning letter issued', tone: 'text-amber-700', dot: 'bg-amber-500' },
  alert: { label: 'Safety alert sent', tone: 'text-orange-700', dot: 'bg-orange-500' },
  notice: { label: 'Driver notice sent', tone: 'text-blue-700', dot: 'bg-blue-500' },
  terminated: { label: 'Driver terminated', tone: 'text-red-700', dot: 'bg-red-500' },
};

/** A daily HOS duty-status log line (Logs tab). */
export interface HosLogRecord {
  id: string;
  driverId: string;
  driverName: string;
  company: string;
  date: string;       // YYYY-MM-DD
  drivingH: number;
  onDutyH: number;
  offDutyH: number;
  sleeperH: number;
  waitingH: number;
  yardMoveH: number;
  personalConveyanceH: number;
  distanceMi: number;
  truckId: string;
  trailerId: string;
  ruleset: string;
  certified: boolean;
}

// ── Violation-type catalog (type + description) ──────────────────────────────
export const HOS_VIOLATION_TYPES: HosViolationType[] = [
  {
    id: 'driving-11',
    label: '11-Hour Driving Limit Violation',
    description: 'Driving past 11 hours following 10 consecutive hours off-duty (US property-carrying rules).',
    region: 'US',
    category: 'Driving',
    defaultSeverity: 'High',
    points: 6,
  },
  {
    id: 'duty-14',
    label: '14-Hour Duty Limit Violation',
    description: 'Operating past the 14-consecutive-hour window after coming on-duty without a required 10-hour break.',
    region: 'US',
    category: 'Duty / Shift',
    defaultSeverity: 'High',
    points: 5,
  },
  {
    id: 'break-30',
    label: '30-Minute Break Violation',
    description: 'Failing to take an off-duty/sleeper break of at least 30 minutes after 8 cumulative hours of driving.',
    region: 'Both',
    category: 'Break',
    defaultSeverity: 'Medium',
    points: 3,
  },
  {
    id: 'cycle-60-70',
    label: '60/70-Hour Cycle Violation',
    description: 'Exceeding 60 hours on-duty in 7 days or 70 hours in 8 days (or respective Canadian cycles).',
    region: 'Both',
    category: 'Cycle',
    defaultSeverity: 'Critical',
    points: 8,
  },
  {
    id: 'daily-off-duty',
    label: 'Daily/Core Off-Duty Violation',
    description: 'Not meeting the mandatory minimum off-duty hours per calendar day (such as the 10-hour daily requirement or regional rules like Canada South/North daily rest constraints).',
    region: 'Both',
    category: 'Off-Duty',
    defaultSeverity: 'High',
    points: 5,
  },
  {
    id: 'driving-13',
    label: '13-Hour Driving Limit Violation',
    description: 'Driving more than 13 hours in a day or a single work shift.',
    region: 'Canada',
    category: 'Driving',
    defaultSeverity: 'High',
    points: 6,
  },
  {
    id: 'onduty-14-ca',
    label: '14-Hour On-Duty Limit Violation',
    description: 'Staying on-duty for more than 14 hours in a day or a shift.',
    region: 'Canada',
    category: 'Duty / Shift',
    defaultSeverity: 'High',
    points: 5,
  },
  {
    id: 'elapsed-16',
    label: '16-Hour Elapsed Time Shift Limit',
    description: 'Driving after 16 hours have passed since the start of your shift (even if you have not hit your driving or on-duty limits yet).',
    region: 'Canada',
    category: 'Duty / Shift',
    defaultSeverity: 'Medium',
    points: 4,
  },
  {
    id: 'daily-10-off',
    label: 'Daily 10-Hour Off-Duty Violation',
    description: 'Failing to get a total of 10 hours off-duty within a calendar day.',
    region: 'Canada',
    category: 'Off-Duty',
    defaultSeverity: 'High',
    points: 5,
  },
  {
    id: 'exclusive-2h',
    label: 'The "2-Hour Exclusive" Off-Duty Violation',
    description: 'Under Canada South rules, you must take 2 hours of off-duty time in blocks of at least 30 minutes that are separate from your main 8-hour sleep reset. Flagged when the day does not include these 2 separate hours.',
    region: 'Canada South',
    category: 'Off-Duty',
    defaultSeverity: 'Medium',
    points: 3,
  },
  {
    id: 'pc-75km',
    label: 'Personal Conveyance 75-km Limit',
    description: 'In Canada, a maximum of 75 kilometres of personal driving per day. Once 75 km is reached the ELD forces "Driving" status, causing an immediate HOS violation if the driver is out of hours.',
    region: 'Canada',
    category: 'Personal Conveyance',
    defaultSeverity: 'Low',
    points: 2,
  },
  {
    id: 'cycle-1-2',
    label: 'Cycle 1 & Cycle 2 Violation',
    description: 'Exceeding 70 hours in 7 days (Cycle 1) or 120 hours in 14 days (Cycle 2) for Canada South.',
    region: 'Canada South',
    category: 'Cycle',
    defaultSeverity: 'Critical',
    points: 8,
  },
];

export const HOS_TYPE_BY_ID: Record<string, HosViolationType> =
  Object.fromEntries(HOS_VIOLATION_TYPES.map((t) => [t.id, t]));

export const HOS_SEVERITY_TONE: Record<HosSeverity, string> = {
  Critical: 'border-red-200 bg-red-50 text-red-700',
  High: 'border-orange-200 bg-orange-50 text-orange-700',
  Medium: 'border-amber-200 bg-amber-50 text-amber-700',
  Low: 'border-slate-200 bg-slate-50 text-slate-600',
};
const SEVERITY_RANK: Record<HosSeverity, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
export const hosSeverityRank = (s: HosSeverity) => SEVERITY_RANK[s];

export const HOS_STATUS_META: Record<HosVStatus, { label: string; tone: string; dot: string }> = {
  open: { label: 'Open', tone: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  review: { label: 'In Review', tone: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  resolved: { label: 'Closed', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
};

export const HOS_REGION_META: Record<HosRegion, { label: string; tone: string }> = {
  US: { label: 'US Federal', tone: 'border-blue-200 bg-blue-50 text-blue-700' },
  Canada: { label: 'Canada', tone: 'border-red-200 bg-red-50 text-red-700' },
  'Canada South': { label: 'Canada South', tone: 'border-rose-200 bg-rose-50 text-rose-700' },
  Both: { label: 'US · Canada', tone: 'border-violet-200 bg-violet-50 text-violet-700' },
};

// ── Deterministic sample builder ─────────────────────────────────────────────
const NOTES = [
  'Auto-flagged by ELD; awaiting driver annotation.',
  'Driver acknowledged; late load contributed to overrun.',
  'Verified against ELD edits — genuine exceedance.',
  'Weather/traffic delay noted; coaching completed.',
  'Repeat exceedance for this driver in the last 30 days.',
  'Personal conveyance mis-classified; corrected on log.',
  'Break was taken but logged incorrectly; annotation added.',
  'Discussed cycle planning with driver and dispatch.',
];
const HOURS = [22, 5, 16, 19, 13, 2, 23, 9, 17, 6];
const MINS = [5, 40, 15, 55, 30, 10, 45, 20];
const TRUCKS = ['TRK-042', 'TRK-118', 'TRK-088', 'TRK-012', 'TRK-095', 'TRK-055', 'TRK-077', 'TRK-033', 'TRK-061', 'TRK-209'];
const TRAILERS = ['TRL-301', 'TRL-455', 'TRL-782', 'TRL-119', 'TRL-640', 'TRL-528', 'TRL-903', 'TRL-214', 'TRL-376', 'TRL-687'];
const REVIEWERS = ['Dana Whitfield', 'Marcus Lee', 'Priya Nair', 'Tom Becker', 'Sofia Alvarez'];

const BASE_MS = Date.UTC(2026, 7, 24, 0, 0, 0); // 2026-08-24 — matches app "today"
const DAY_MS = 86_400_000;

function seeded(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}
function isoAt(daysAgo: number, hour: number, min: number): string {
  const d = new Date(BASE_MS - daysAgo * DAY_MS);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(hour)}:${p(min)}`;
}
/** Add minutes to a 'YYYY-MM-DDTHH:MM' stamp. */
function plusMin(dt: string, mins: number): string {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return dt;
  d.setMinutes(d.getMinutes() + mins);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

interface SampleDriver { id: string; name: string; unit?: string }

function driverPool(logs: HosDailyLog[]): SampleDriver[] {
  const seen = new Map<string, SampleDriver>();
  for (const l of logs) {
    if (!seen.has(l.driver.id)) {
      seen.set(l.driver.id, { id: l.driver.id, name: `${l.driver.firstName} ${l.driver.lastName}` });
    }
  }
  const pool = [...seen.values()];
  if (pool.length) return pool;
  // Fallback so the page never renders empty.
  return [
    { id: 'drv-1', name: 'John Smith' }, { id: 'drv-2', name: 'Maria Rodriguez' },
    { id: 'drv-3', name: 'Mike Johnson' }, { id: 'drv-4', name: 'Sarah Miller' },
    { id: 'drv-5', name: 'James Sullivan' }, { id: 'drv-6', name: 'Elena Rodriguez' },
  ];
}

/** Build a stable, seeded set of HOS violations across the full type catalog. */
export function buildHosViolations(logs: HosDailyLog[], count = 58): HosViolationRecord[] {
  const drivers = driverPool(logs);
  const out: HosViolationRecord[] = [];
  for (let i = 0; i < count; i++) {
    const type = HOS_VIOLATION_TYPES[i % HOS_VIOLATION_TYPES.length];
    const driver = drivers[Math.floor(seeded(i * 7.13 + 1) * drivers.length)];
    const daysAgo = 1 + Math.floor(seeded(i * 3.7 + 2) * 118);
    const hour = HOURS[Math.floor(seeded(i * 2.9 + 3) * HOURS.length)];
    const min = MINS[Math.floor(seeded(i * 5.1 + 4) * MINS.length)];

    // Severity: mostly the type default, occasionally bumped one notch.
    let severity = type.defaultSeverity;
    const bump = seeded(i * 1.7 + 5);
    if (bump > 0.82 && severity !== 'Critical') {
      severity = severity === 'Low' ? 'Medium' : severity === 'Medium' ? 'High' : 'Critical';
    }
    // Risk points: type baseline with small deterministic jitter.
    const jitter = Math.round((seeded(i * 4.3 + 6) - 0.5) * 2); // -1..+1
    const riskPoints = Math.max(1, type.points + jitter);

    // Records arrive from the ELD in the "In Review" state; roughly 40% have
    // already been reviewed and closed with a resolution.
    const isClosed = seeded(i * 6.7 + 7) > 0.6;
    const status: HosVStatus = isClosed ? 'resolved' : 'review';
    const note = NOTES[Math.floor(seeded(i * 2.1 + 10) * NOTES.length)];
    const truckId = TRUCKS[Math.floor(seeded(i * 3.3 + 11) * TRUCKS.length)];
    const trailerId = TRAILERS[Math.floor(seeded(i * 4.4 + 12) * TRAILERS.length)];
    const durationMin = 15 + Math.floor(seeded(i * 5.5 + 13) * 165); // 15..180 min over
    const company = companyForDriver(driver.id);
    const dateTime = isoAt(daysAgo, hour, min);

    // ── Activity trail: created → received → recorded → opened/reviewed →
    //    (verified) → closed with a resolution. Seeded so every record shows a
    //    believable multi-step history the moment the page loads. ──
    const reviewer = REVIEWERS[Math.floor(seeded(i * 7.9 + 30) * REVIEWERS.length)];
    const reviewStamp = isoAt(Math.max(0, daysAgo - 1), 10, 30);
    const srcBadge = { label: 'Source', tone: ACTIVITY_BADGE_TONE.Source };
    const sysBadge = { label: 'System', tone: ACTIVITY_BADGE_TONE.System };
    const revBadge = { label: 'Reviewer', tone: ACTIVITY_BADGE_TONE.Reviewer };
    const activity: HosActivity[] = [
      { id: `act-${i}-1`, at: dateTime, by: company, kind: 'received', title: 'Received from ELD', detail: `Imported from ${company} ELD via API`, badge: srcBadge },
      { id: `act-${i}-2`, at: plusMin(dateTime, 3), by: 'System', kind: 'recorded', detail: `Logged to HOS violations as hosv-${String(i + 1).padStart(3, '0')}`, badge: sysBadge },
    ];
    let reviewedBy: string | undefined;
    let reviewedAt: string | undefined;
    let training: HosTrainingAssignment | undefined;
    let disposition: HosDisposition | undefined;
    let falseViolation = false;
    let action = 'None — pending review';

    // The record is opened for review a little later.
    activity.push({ id: `act-${i}-3`, at: plusMin(reviewStamp, -90), by: reviewer, kind: 'viewed', title: 'Opened for review', detail: `${reviewer} opened the ELD record and log edits`, badge: revBadge });

    if (isClosed) {
      reviewedBy = reviewer;
      reviewedAt = reviewStamp;
      const disp = HOS_DISPOSITIONS[Math.floor(seeded(i * 8.3 + 40) * HOS_DISPOSITIONS.length)];
      disposition = disp.id;
      action = disp.label;
      if (disp.id === 'false') falseViolation = true;
      // A verification step before closing.
      activity.push({ id: `act-${i}-4`, at: plusMin(reviewStamp, -20), by: reviewer, kind: 'verified', title: 'Verified against ELD edits', detail: disp.id === 'false' ? 'Checked the duty-status edits before dismissing.' : 'Confirmed a genuine exceedance before closing.', badge: revBadge });
      let detail = `Closed — ${disp.label}`;
      if (disp.id === 'training') {
        const tname = HOS_TRAINING_TYPES[Math.floor(seeded(i * 2.4 + 31) * HOS_TRAINING_TYPES.length)];
        training = { name: tname, assignedBy: reviewer, assignedAt: reviewStamp };
        detail = `Closed — assigned training: ${tname}`;
      }
      activity.push({ id: `act-${i}-5`, at: reviewStamp, by: reviewer, kind: disp.kind, detail, badge: revBadge });
    }

    out.push({
      id: `hosv-${String(i + 1).padStart(3, '0')}`,
      typeId: type.id,
      driverId: driver.id,
      driverName: driver.name,
      company,
      unitId: driver.unit,
      truckId,
      trailerId,
      dateTime,
      durationMin,
      severity,
      riskPoints,
      actionTaken: action,
      reviewNotes: note,
      status,
      receivedAt: dateTime,
      reviewedBy,
      reviewedAt,
      falseViolation,
      disposition,
      training,
      activity,
    });
  }
  return out.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

/** Carrier-scoped violations (falls back to the global demo log pool). */
export function getHosViolations(accountId?: string): HosViolationRecord[] {
  const logs = accountId
    ? (getHosForCarrier(accountId).dailyLogs.length ? getHosForCarrier(accountId).dailyLogs : HOS_DAILY_LOGS)
    : HOS_DAILY_LOGS;
  return buildHosViolations(logs);
}

// ── HOS daily logs (Logs tab) ────────────────────────────────────────────────
function buildHosLogs(logs: HosDailyLog[], count = 90): HosLogRecord[] {
  const toH = (ms: number) => Math.round((ms / 3_600_000) * 10) / 10;
  return logs.slice(0, count).map((l, i) => {
    const d = l.statusDurations;
    return {
      id: l.id,
      driverId: l.driver.id,
      driverName: `${l.driver.firstName} ${l.driver.lastName}`,
      company: companyForDriver(l.driver.id),
      date: l.date,
      drivingH: toH(d.driving),
      onDutyH: toH(d.onDuty),
      offDutyH: toH(d.offDuty),
      sleeperH: toH(d.sleeperBed),
      waitingH: toH(d.waiting),
      yardMoveH: toH(d.yardMove),
      personalConveyanceH: toH(d.personalConveyance),
      distanceMi: Math.round(l.distances?.total ?? 0),
      truckId: TRUCKS[Math.floor(seeded(i * 2.2 + 21) * TRUCKS.length)],
      trailerId: TRAILERS[Math.floor(seeded(i * 3.1 + 22) * TRAILERS.length)],
      ruleset: seeded(i * 1.3 + 23) > 0.5 ? 'US 70-hour / 8-day' : 'Canada Cycle 1',
      certified: seeded(i * 4.7 + 24) > 0.25,
    };
  });
}

/** Carrier-scoped HOS daily logs (falls back to the global demo log pool). */
export function getHosLogs(accountId?: string): HosLogRecord[] {
  const logs = accountId
    ? (getHosForCarrier(accountId).dailyLogs.length ? getHosForCarrier(accountId).dailyLogs : HOS_DAILY_LOGS)
    : HOS_DAILY_LOGS;
  return buildHosLogs(logs).sort((a, b) => b.date.localeCompare(a.date));
}

/** Format a minutes value as "1h 24m" / "45m". */
export function fmtDurationMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Editable / persisted type catalog (Safety Events settings page) ──────────
export const HOS_SEVERITIES: HosSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
export const HOS_REGIONS: HosRegion[] = ['US', 'Canada', 'Canada South', 'Both'];

const HOS_TYPES_KEY = 'safety-events:hos-types-v1';

export function loadHosViolationTypes(): HosViolationType[] {
  if (typeof window === 'undefined') return HOS_VIOLATION_TYPES;
  try {
    const raw = window.localStorage.getItem(HOS_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as HosViolationType[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* ignore */ }
  return HOS_VIOLATION_TYPES;
}

export function saveHosViolationTypes(list: HosViolationType[]): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(HOS_TYPES_KEY, JSON.stringify(list)); } catch { /* ignore quota */ }
}

function hosSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `rule-${Date.now()}`;
}

/** React store hook for the HOS violation-type catalog (localStorage-backed). */
export function useHosViolationTypes() {
  const [types, setTypes] = useState<HosViolationType[]>(loadHosViolationTypes);

  useEffect(() => { saveHosViolationTypes(types); }, [types]);

  const update = useCallback((id: string, patch: Partial<HosViolationType>) => {
    setTypes(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const add = useCallback((label = 'New HOS rule') => {
    setTypes(prev => {
      let id = hosSlug(label);
      while (prev.some(t => t.id === id)) id = `${id}-x`;
      return [...prev, { id, label, description: '', region: 'US', category: 'Driving', defaultSeverity: 'Medium', points: 5 }];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setTypes(prev => prev.filter(t => t.id !== id));
  }, []);

  const reset = useCallback(() => setTypes(HOS_VIOLATION_TYPES), []);

  return { types, update, add, remove, reset };
}
