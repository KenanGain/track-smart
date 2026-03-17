/**
 * Safety scoring settings – shared between SafetySettingsPage and SafetyAnalysisPage.
 * Persisted to localStorage so dashboard reflects settings-page changes immediately.
 *
 * v3 migration: reads old safe_settings_v2 key and migrates forward on first load.
 *
 * Settings-to-Formula Mapping:
 *   Every key in SafetySettings is mapped in SAFETY_FORMULA_MAP below.
 *   This table drives tooltip text, debug panel output, and export Formulas sheet.
 */

import { type FormulaMode, type CarrierType, type FleetSegment } from './sms-engine';

const LS_KEY_V3 = 'safe_settings_v3';
const LS_KEY_V2 = 'safe_settings_v2'; // legacy – migrated on first load

// ── Settings interface ─────────────────────────────────────────────────────────

export interface SafetySettings {
  // ── SMS / FMCSA ──────────────────────────────────────────────────────────────
  smsFormulaMode:    FormulaMode;   // 'time' | 'distance'
  smsCarrierType:    CarrierType;   // 'general' | 'hm' | 'passenger'
  smsCarrierSegment: FleetSegment;  // 'combination' | 'straight'
  smsAvgPU:              number;
  smsAnnualVmtPerPU:     number;
  smsLookbackMonths:     number;
  smsDecayBand1Pct:      number;
  smsDecayBand2Pct:      number;
  smsDecayBand3Pct:      number;
  smsOosBonus:           number;
  smsPerInspectionCap:   number;

  // ── Score Blending ────────────────────────────────────────────────────────────
  opWeight:   number;  // Operational weight  (default 70, must sum to 100 with regWeight)
  regWeight:  number;  // Regulatory weight   (default 30)
  smsBlend:   number;  // SMS share within regulatory  (default 60, must sum to 100 with cvorBlend)
  cvorBlend:  number;  // CVOR share within regulatory (default 40)

  // ── Component Weights (driver/fleet sub-scores, must sum to 100) ─────────────
  wAccidents:   number;  // default 25
  wEld:         number;  // default 20
  wVedr:        number;  // default 15
  wInspections: number;  // default 20
  wViolations:  number;  // default 10
  wTrainings:   number;  // default 10

  // ── Rating Thresholds ─────────────────────────────────────────────────────────
  threshExcellent: number;  // default 90
  threshGood:      number;  // default 80
  threshFair:      number;  // default 70

  // ── Incident Scoring ──────────────────────────────────────────────────────────
  fatalWeight:    number;  // base penalty pts for fatal crash (default 100)
  injuryWeight:   number;  // base pts injury (default 60)
  propertyWeight: number;  // base pts property damage (default 30)
  nearMissWeight: number;  // base pts near-miss (default 10)
  recencyDecay:   number;  // % decay per 12 months (default 20)
  incidentAgeCap: number;  // months after which incident no longer counted (default 36)
  towAwayMult:    number;  // multiplier when tow-away present (default 1.5)
  hazmatMult:     number;  // multiplier when hazmat involved (default 2.0)
  atFaultMult:    number;  // multiplier when preventable/at-fault (default 1.8)

  // ── Driver Rules ──────────────────────────────────────────────────────────────
  timeVol:        number;  // volatility for time-weighted scoring (default 40)
  distVol:        number;  // volatility for distance-weighted scoring (default 30)
  dateVol:        number;  // volatility for date-range scoring (default 28)
  windowDecay:    number;  // % decay across scoring window (default 60)
  baselineWindow: string;  // comparison window '12mo' | '6mo' | '3mo' (default '12mo')
  hosWindow:      number;  // HOS cycle hours 60 | 70 (default 70)
  eldGrace:       number;  // ELD grace period minutes (default 5)
  driverAgeCap:   number;  // years of history per driver (default 3)
  minDrivingDays: number;  // min days in window for score (default 30)
  noEventBonus:   number;  // bonus pts for clean period (default 5)
  speedThreshold: number;  // mph threshold for speeding event (default 80)
  harshBrakeG:    number;  // g-force threshold harsh brake (default 0.4)
  harshAccelG:    number;  // g-force threshold harsh accel (default 0.35)

  // ── Asset Scoring ─────────────────────────────────────────────────────────────
  activeScore:       number;  // score when status = Active (default 100)
  maintScore:        number;  // score when status = Maintenance (default 50)
  oosStatusScore:    number;  // score when status = OOS (default 0)
  mileageCurve:      'linear' | 'exponential' | 'stepped';  // default 'linear'
  regWarningDays:    number;  // days before expiry to show warning (default 60)
  regExpiredPenalty: number;  // penalty pts when registration expired (default 40)
  ageDecayStart:     number;  // years of age before decay starts (default 5)
  ageDecayRate:      number;  // pts lost per year of age (default 5)
  ageDecayCap:       number;  // max pts lost from age (default 40)

  // ── Inspection Scoring ────────────────────────────────────────────────────────
  passScore:       number;  // pts for clean inspection (default 100)
  failScore:       number;  // pts for inspection with violations (default 40)
  oosScore:        number;  // pts for OOS inspection (default 0)
  oosPenalty:      number;  // additional penalty pts per OOS violation (default 20)
  inspDecay:       number;  // % decay per 12 months (default 15)
  inspAgeCap:      number;  // months after which inspection not counted (default 24)
  minInspections:  number;  // minimum inspections for confidence (default 3)

  // ── Violation Scoring ─────────────────────────────────────────────────────────
  movingWeight:    number;  // % weight for moving violations (default 70)
  nonMovingWeight: number;  // % weight for non-moving (default 30)
  criticalPenalty: number;  // pts per critical violation (default 25)
  majorPenalty:    number;  // pts per major violation (default 15)
  minorPenalty:    number;  // pts per minor violation (default 5)
  violAgeCap:      number;  // months after which violation not counted (default 24)
  violDecay:       number;  // % decay per 12 months (default 10)

  // ── Training Scoring ──────────────────────────────────────────────────────────
  completionWeight: number;  // % of score from completion rate (default 60)
  mandatoryBonus:   number;  // bonus pts for all mandatory complete (default 30)
  optionalBonus:    number;  // bonus pts for optional training (default 10)
  expiryWarning:    number;  // days before expiry to flag (default 30)
  expiryPenalty:    number;  // pts penalty for near-expiry training (default 15)
  expiredPenalty:   number;  // pts penalty for expired training (default 35)
  minTrainingHrs:   number;  // minimum training hours per period (default 8)

  // ── VEDR / Camera Scoring ─────────────────────────────────────────────────────
  followDistPenalty:  number;  // pts per following-distance event (default 10)
  laneDevPenalty:     number;  // pts per lane-deviation event (default 8)
  distractionPenalty: number;  // pts per distraction event (default 15)
  drowsinessPenalty:  number;  // pts per drowsiness event (default 20)
  maskingPenalty:     number;  // pts per camera-masking event (default 30)
  coachingBonus:      number;  // bonus pts for completed coaching (default 5)
  vedrDecay:          number;  // % decay per 12 months (default 25)

  // ── Alert / Intervention ──────────────────────────────────────────────────────
  scoreDropAlert: number;   // alert when score drops by this many pts (default 10)
  criticalAlert:  number;   // flag driver if score < criticalAlert (default 65)
  alertCooldown:  number;   // days between repeat alerts (default 7)
  emailAlerts:    boolean;  // send email alerts (default true)
  inAppAlerts:    boolean;  // show in-app alerts (default true)
  weeklyDigest:   boolean;  // send weekly digest (default true)
  autoFlag:       boolean;  // auto-flag drivers below criticalAlert (default true)

  // ── Display ───────────────────────────────────────────────────────────────────
  defaultWindow:   string;   // initial date window '12mo' | '6mo' | '3mo' | '1mo' (default '12mo')
  defaultMode:     string;   // initial scoring mode 'time' | 'distance' (default 'time')
  defaultDistUnit: string;   // distance unit 'mi' | 'km' (default 'mi')
  defaultInterval: number;   // mileage interval for scoring (default 10000)
  scoreDecimals:   number;   // decimal places for score display (default 1)
  showPercent:     boolean;  // append % to scores (default true)
  showRankBadges:  boolean;  // show Excellent/Good/Fair/Poor badges (default true)
  showTrendArrows: boolean;  // show trend arrows on scores (default true)
  colorBlindMode:  boolean;  // use color-blind safe palette (default false)
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  // SMS / FMCSA
  smsFormulaMode:    'time',
  smsCarrierType:    'general',
  smsCarrierSegment: 'combination',
  smsAvgPU:            8,
  smsAnnualVmtPerPU:   150000,
  smsLookbackMonths:   24,
  smsDecayBand1Pct:    0,
  smsDecayBand2Pct:    5,
  smsDecayBand3Pct:    40,
  smsOosBonus:         2,
  smsPerInspectionCap: 30,
  // Score Blending
  opWeight:  70,
  regWeight: 30,
  smsBlend:  60,
  cvorBlend: 40,
  // Component Weights
  wAccidents:   25,
  wEld:         20,
  wVedr:        15,
  wInspections: 20,
  wViolations:  10,
  wTrainings:   10,
  // Rating Thresholds
  threshExcellent: 90,
  threshGood:      80,
  threshFair:      70,
  // Incident
  fatalWeight:    100,
  injuryWeight:   60,
  propertyWeight: 30,
  nearMissWeight: 10,
  recencyDecay:   20,
  incidentAgeCap: 36,
  towAwayMult:    1.5,
  hazmatMult:     2.0,
  atFaultMult:    1.8,
  // Driver Rules
  timeVol:        40,
  distVol:        30,
  dateVol:        28,
  windowDecay:    60,
  baselineWindow: '12mo',
  hosWindow:      70,
  eldGrace:       5,
  driverAgeCap:   3,
  minDrivingDays: 30,
  noEventBonus:   5,
  speedThreshold: 80,
  harshBrakeG:    0.4,
  harshAccelG:    0.35,
  // Asset
  activeScore:       100,
  maintScore:        50,
  oosStatusScore:    0,
  mileageCurve:      'linear',
  regWarningDays:    60,
  regExpiredPenalty: 40,
  ageDecayStart:     5,
  ageDecayRate:      5,
  ageDecayCap:       40,
  // Inspection
  passScore:      100,
  failScore:      40,
  oosScore:       0,
  oosPenalty:     20,
  inspDecay:      15,
  inspAgeCap:     24,
  minInspections: 3,
  // Violation
  movingWeight:    70,
  nonMovingWeight: 30,
  criticalPenalty: 25,
  majorPenalty:    15,
  minorPenalty:    5,
  violAgeCap:      24,
  violDecay:       10,
  // Training
  completionWeight: 60,
  mandatoryBonus:   30,
  optionalBonus:    10,
  expiryWarning:    30,
  expiryPenalty:    15,
  expiredPenalty:   35,
  minTrainingHrs:   8,
  // VEDR
  followDistPenalty:  10,
  laneDevPenalty:     8,
  distractionPenalty: 15,
  drowsinessPenalty:  20,
  maskingPenalty:     30,
  coachingBonus:      5,
  vedrDecay:          25,
  // Alerts
  scoreDropAlert: 10,
  criticalAlert:  65,
  alertCooldown:  7,
  emailAlerts:    true,
  inAppAlerts:    true,
  weeklyDigest:   true,
  autoFlag:       true,
  // Display
  defaultWindow:   '12mo',
  defaultMode:     'time',
  defaultDistUnit: 'mi',
  defaultInterval: 10000,
  scoreDecimals:   1,
  showPercent:     true,
  showRankBadges:  true,
  showTrendArrows: true,
  colorBlindMode:  false,
};

// ── Persistence helpers ────────────────────────────────────────────────────────

export function loadSafetySettings(): SafetySettings {
  try {
    // Try v3 first
    const raw3 = localStorage.getItem(LS_KEY_V3);
    if (raw3) {
      const parsed = JSON.parse(raw3);
      // Migrate old default VMT (100k was too low, caused time≡distance bands)
      if (parsed.smsAnnualVmtPerPU === 100000) parsed.smsAnnualVmtPerPU = 150000;
      return { ...DEFAULT_SAFETY_SETTINGS, ...parsed };
    }
    // Migrate from v2
    const raw2 = localStorage.getItem(LS_KEY_V2);
    const v2 = raw2 ? JSON.parse(raw2) : {};
    const merged: SafetySettings = { ...DEFAULT_SAFETY_SETTINGS, ...v2 };
    saveSafetySettings(merged);
    return merged;
  } catch {
    return { ...DEFAULT_SAFETY_SETTINGS };
  }
}

export function saveSafetySettings(s: SafetySettings): void {
  try {
    localStorage.setItem(LS_KEY_V3, JSON.stringify(s));
    // Notify same-window listeners (cross-tab is automatic via storage event)
    window.dispatchEvent(new StorageEvent('storage', { key: LS_KEY_V3 }));
  } catch { /* ignore quota errors */ }
}

export function resetSafetySettings(): void {
  try {
    localStorage.removeItem(LS_KEY_V3);
    localStorage.removeItem(LS_KEY_V2);
  } catch { /* ignore */ }
}

// ── Display helpers ────────────────────────────────────────────────────────────

/** Format a score value respecting scoreDecimals and showPercent settings. */
export function formatScore(v: number, s: SafetySettings): string {
  const rounded = v.toFixed(s.scoreDecimals);
  return s.showPercent ? `${rounded}%` : rounded;
}

/** Return the rating label for a score using configured thresholds. */
export function getRatingLabel(score: number, s: SafetySettings): string {
  if (score >= s.threshExcellent) return 'Excellent';
  if (score >= s.threshGood)      return 'Good';
  if (score >= s.threshFair)      return 'Fair';
  return 'Poor';
}

/** Return a Tailwind text-color class for a score using configured thresholds. */
export function getBandColor(score: number, s: SafetySettings): string {
  if (score >= s.threshExcellent) return 'text-emerald-600';
  if (score >= s.threshGood)      return 'text-blue-600';
  if (score >= s.threshFair)      return 'text-amber-600';
  return 'text-red-600';
}

/** Return a Tailwind bg-color class for a score using configured thresholds. */
export function getBandBgColor(score: number, s: SafetySettings): string {
  if (score >= s.threshExcellent) return 'bg-emerald-500';
  if (score >= s.threshGood)      return 'bg-blue-500';
  if (score >= s.threshFair)      return 'bg-amber-500';
  return 'bg-red-500';
}

// ── Settings-to-Formula mapping ────────────────────────────────────────────────
/**
 * Maps each SafetySettings key → { label, formula, widgets, exportFields }.
 * Used by: debug panel, export Formulas sheet, tooltip descriptions.
 */
export const SAFETY_FORMULA_MAP: Record<keyof SafetySettings, {
  label:        string;
  formula:      string;
  widgets:      string[];
  exportFields: string[];
}> = {
  // SMS / FMCSA
  smsFormulaMode:    { label: 'SMS Formula Mode',         formula: 'Selects time-weighted vs distance-weighted BASIC calculation',   widgets: ['scoringModeToggle','combinedTimeScore','combinedDistScore'], exportFields: ['SMS BASIC Analysis!A1'] },
  smsCarrierType:    { label: 'Carrier Type',             formula: 'Sets alert threshold percentiles (general: 65%, hm: varies)',    widgets: ['basicTable','alertBadges'], exportFields: ['SMS BASIC Analysis!E'] },
  smsCarrierSegment: { label: 'Fleet Segment',            formula: 'Affects utilization factor in BASIC exposure normalization',      widgets: ['basicTable'], exportFields: ['SMS BASIC Analysis'] },
  smsAvgPU:          { label: 'Average Power Units',      formula: 'Exposure denominator for BASIC percentile calculation',          widgets: ['basicTable'], exportFields: ['SMS BASIC Analysis!notes'] },
  smsAnnualVmtPerPU: { label: 'Annual VMT per PU',        formula: 'miSinceEvent ≈ ageMonths × (annualVmtPerPU / 12)',              widgets: ['combinedDistScore','distanceModeToggle'], exportFields: ['SMS BASIC Analysis'] },
  smsLookbackMonths: { label: 'SMS Lookback',             formula: 'Events older than lookbackMonths get weight = 0',               widgets: ['basicTable','combinedTimeScore'], exportFields: ['SMS BASIC Analysis!lookback'] },
  smsDecayBand1Pct:  { label: 'Decay Band 1 (0–6 mo)',    formula: 'effectiveWeight = timeWeight × (1 - band1/100)',                widgets: ['basicTable','combinedTimeScore'], exportFields: ['Inspections!decay_factor'] },
  smsDecayBand2Pct:  { label: 'Decay Band 2 (6–12 mo)',   formula: 'effectiveWeight = timeWeight × (1 - band2/100)',                widgets: ['basicTable','combinedTimeScore'], exportFields: ['Inspections!decay_factor'] },
  smsDecayBand3Pct:  { label: 'Decay Band 3 (12–24 mo)',  formula: 'effectiveWeight = timeWeight × (1 - band3/100)',                widgets: ['basicTable','combinedTimeScore'], exportFields: ['Inspections!decay_factor'] },
  smsOosBonus:       { label: 'OOS Inspection Bonus',     formula: 'violScore += oosBonus for OOS-related BASICs',                  widgets: ['basicTable'], exportFields: ['SMS BASIC Analysis'] },
  smsPerInspectionCap: { label: 'Per-Inspection Cap',     formula: 'violScore = MIN(perInspectionCap, violScore)',                  widgets: ['basicTable'], exportFields: ['SMS BASIC Analysis'] },
  // Score Blending
  opWeight:  { label: 'Operational Weight',      formula: 'fleetScore = operational × (opWeight/100) + regulatory × (regWeight/100)', widgets: ['fleetScoreRing','scoreFormula','kpiCards'], exportFields: ['Fleet Summary!blend'] },
  regWeight: { label: 'Regulatory Weight',       formula: 'fleetScore = operational × (opWeight/100) + regulatory × (regWeight/100)', widgets: ['fleetScoreRing','scoreFormula','kpiCards'], exportFields: ['Fleet Summary!blend'] },
  smsBlend:  { label: 'SMS Blend (regulatory)',  formula: 'regulatory = sms × (smsBlend/total) + cvor × (cvorBlend/total)',          widgets: ['scoreFormula','regulatoryRing'], exportFields: ['Fleet Summary!reg_blend'] },
  cvorBlend: { label: 'CVOR Blend (regulatory)', formula: 'regulatory = sms × (smsBlend/total) + cvor × (cvorBlend/total)',          widgets: ['scoreFormula','regulatoryRing'], exportFields: ['Fleet Summary!reg_blend'] },
  // Component Weights
  wAccidents:   { label: 'Accident Weight',    formula: 'overall += accidents × (wAccidents/100)',   widgets: ['dashComponentScores','driverTable','scoreBreakdown'], exportFields: ['Drivers Data!V formula','Fleet Summary!B5'] },
  wEld:         { label: 'ELD/HOS Weight',     formula: 'overall += eld × (wEld/100)',               widgets: ['dashComponentScores','driverTable','scoreBreakdown'], exportFields: ['Drivers Data!V formula'] },
  wVedr:        { label: 'VEDR Weight',        formula: 'overall += vedr × (wVedr/100)',             widgets: ['dashComponentScores','driverTable','scoreBreakdown'], exportFields: ['Drivers Data!V formula'] },
  wInspections: { label: 'Inspection Weight',  formula: 'overall += inspections × (wInspections/100)', widgets: ['dashComponentScores','driverTable','scoreBreakdown'], exportFields: ['Drivers Data!V formula'] },
  wViolations:  { label: 'Violation Weight',   formula: 'overall += violations × (wViolations/100)',  widgets: ['dashComponentScores','driverTable','scoreBreakdown'], exportFields: ['Drivers Data!V formula'] },
  wTrainings:   { label: 'Training Weight',    formula: 'overall += trainings × (wTrainings/100)',    widgets: ['dashComponentScores','driverTable','scoreBreakdown'], exportFields: ['Drivers Data!V formula'] },
  // Rating Thresholds
  threshExcellent: { label: 'Excellent Threshold', formula: 'score >= threshExcellent → "Excellent"/"Satisfactory"', widgets: ['scoreBadges','kpiCards','bandChart','driverTable'], exportFields: ['Drivers Data!W IF','Assets Data!W IF'] },
  threshGood:      { label: 'Good Threshold',      formula: 'score >= threshGood → "Good"/"Acceptable"',            widgets: ['scoreBadges','kpiCards','bandChart','driverTable'], exportFields: ['Drivers Data!W IF','Assets Data!W IF'] },
  threshFair:      { label: 'Fair Threshold',      formula: 'score >= threshFair → "Fair"/"Conditional"',           widgets: ['scoreBadges','kpiCards','bandChart','driverTable'], exportFields: ['Drivers Data!W IF','Assets Data!W IF'] },
  // Incident
  fatalWeight:    { label: 'Fatal Base Weight',    formula: 'penalty = fatalWeight × mults',   widgets: ['dashIncidentStats','accidentScore'], exportFields: ['Incidents!base_penalty'] },
  injuryWeight:   { label: 'Injury Base Weight',   formula: 'penalty = injuryWeight × mults',  widgets: ['dashIncidentStats','accidentScore'], exportFields: ['Incidents!base_penalty'] },
  propertyWeight: { label: 'Property Base Weight', formula: 'penalty = propertyWeight × mults',widgets: ['dashIncidentStats','accidentScore'], exportFields: ['Incidents!base_penalty'] },
  nearMissWeight: { label: 'Near-Miss Base Weight',formula: 'penalty = nearMissWeight × mults',widgets: ['dashIncidentStats','accidentScore'], exportFields: ['Incidents!base_penalty'] },
  recencyDecay:   { label: 'Recency Decay',        formula: 'penalty × (1 - recencyDecay/100 × ageYears)', widgets: ['dashIncidentStats'], exportFields: ['Incidents!decay'] },
  incidentAgeCap: { label: 'Incident Age Cap',     formula: 'incidents older than incidentAgeCap months excluded', widgets: ['dashIncidentStats'], exportFields: ['Incidents!age_filter'] },
  towAwayMult:    { label: 'Tow-Away Multiplier',  formula: 'penalty × towAwayMult (if tow-away)',  widgets: ['dashIncidentStats','incidentsTab'], exportFields: ['Incidents!N formula'] },
  hazmatMult:     { label: 'Hazmat Multiplier',    formula: 'penalty × hazmatMult (if hazmat)',     widgets: ['dashIncidentStats','incidentsTab'], exportFields: ['Incidents!N formula'] },
  atFaultMult:    { label: 'At-Fault Multiplier',  formula: 'penalty × atFaultMult (if preventable)', widgets: ['dashIncidentStats','incidentsTab'], exportFields: ['Incidents!N formula'] },
  // Driver Rules
  timeVol:        { label: 'Time Volatility',       formula: 'Volatility factor for time-weighted driver scoring',       widgets: ['driverScoreCard'], exportFields: ['DRV-*!notes'] },
  distVol:        { label: 'Distance Volatility',   formula: 'Volatility factor for distance-weighted driver scoring',   widgets: ['driverScoreCard'], exportFields: ['DRV-*!notes'] },
  dateVol:        { label: 'Date Volatility',       formula: 'Volatility factor for date-range driver scoring',          widgets: ['driverScoreCard'], exportFields: ['DRV-*!notes'] },
  windowDecay:    { label: 'Window Decay',          formula: '% decay applied across the scoring window baseline',       widgets: ['driverScoreCard'], exportFields: ['DRV-*!notes'] },
  baselineWindow: { label: 'Baseline Window',       formula: 'Historical comparison window length',                      widgets: ['driverScoreCard','trendChart'], exportFields: ['DRV-*!notes'] },
  hosWindow:      { label: 'HOS Cycle Hours',       formula: '60h/7d or 70h/8d HOS cycle rule',                          widgets: ['hosEldTab'], exportFields: [] },
  eldGrace:       { label: 'ELD Grace Period',      formula: 'Minutes of ELD variance allowed before violation',         widgets: ['hosEldTab'], exportFields: [] },
  driverAgeCap:   { label: 'Driver History Cap',    formula: 'Years of events included per driver',                      widgets: ['driverTable'], exportFields: ['DRV-*!notes'] },
  minDrivingDays: { label: 'Min Driving Days',      formula: 'Min days in window required for a valid score',            widgets: ['driverTable'], exportFields: [] },
  noEventBonus:   { label: 'Clean Period Bonus',    formula: 'Bonus pts added when no events in window',                 widgets: ['driverScoreCard'], exportFields: [] },
  speedThreshold: { label: 'Speed Threshold',       formula: 'MPH threshold above which a VEDR speeding event fires',    widgets: ['vedrTab'], exportFields: [] },
  harshBrakeG:    { label: 'Harsh Brake Threshold', formula: 'g-force threshold for harsh braking event',               widgets: ['vedrTab'], exportFields: [] },
  harshAccelG:    { label: 'Harsh Accel Threshold', formula: 'g-force threshold for harsh acceleration event',           widgets: ['vedrTab'], exportFields: [] },
  // Asset
  activeScore:       { label: 'Active Status Score',   formula: 'statusScore = activeScore when asset.status = Active',   widgets: ['assetRiskCard','assetsTab'], exportFields: ['Assets Data!R formula'] },
  maintScore:        { label: 'Maintenance Score',     formula: 'statusScore = maintScore when asset.status = Maintenance', widgets: ['assetRiskCard','assetsTab'], exportFields: ['Assets Data!R formula'] },
  oosStatusScore:    { label: 'OOS Status Score',      formula: 'statusScore = oosStatusScore when asset.status = OOS',   widgets: ['assetRiskCard','assetsTab'], exportFields: ['Assets Data!R formula'] },
  mileageCurve:      { label: 'Mileage Decay Curve',   formula: 'linear | exponential | stepped mileage score curve',     widgets: ['assetRiskCard'], exportFields: ['Assets Data!S formula'] },
  regWarningDays:    { label: 'Reg Warning Days',      formula: 'If days until expiry ≤ regWarningDays → warning state',  widgets: ['assetRiskCard','assetsTab'], exportFields: ['Assets Data!U formula'] },
  regExpiredPenalty: { label: 'Expired Reg Penalty',   formula: 'regScore = 100 - regExpiredPenalty (when expired)',      widgets: ['assetRiskCard','assetsTab'], exportFields: ['Assets Data!U formula'] },
  ageDecayStart:     { label: 'Age Decay Start (yrs)', formula: 'age decay applies after ageDecayStart years',           widgets: ['assetRiskCard'], exportFields: ['Assets Data!T formula'] },
  ageDecayRate:      { label: 'Age Decay Rate',        formula: 'ageScore -= ageDecayRate per year beyond ageDecayStart', widgets: ['assetRiskCard'], exportFields: ['Assets Data!T formula'] },
  ageDecayCap:       { label: 'Age Decay Cap',         formula: 'max pts lost from age = ageDecayCap',                   widgets: ['assetRiskCard'], exportFields: ['Assets Data!T formula'] },
  // Inspection
  passScore:      { label: 'Pass Score',         formula: 'inspScore = passScore for clean inspection',           widgets: ['inspTab','driverScoreCard'], exportFields: ['Inspections!result_score'] },
  failScore:      { label: 'Fail Score',         formula: 'inspScore = failScore for inspection with violations', widgets: ['inspTab','driverScoreCard'], exportFields: ['Inspections!result_score'] },
  oosScore:       { label: 'OOS Score',          formula: 'inspScore = oosScore for OOS inspection',             widgets: ['inspTab','driverScoreCard'], exportFields: ['Inspections!result_score'] },
  oosPenalty:     { label: 'OOS Penalty',        formula: 'inspScore -= oosPenalty per OOS violation',           widgets: ['inspTab'], exportFields: ['Inspections!oos_penalty'] },
  inspDecay:      { label: 'Inspection Decay',   formula: 'inspScore × (1 - inspDecay/100 × ageYears)',         widgets: ['inspTab'], exportFields: ['Inspections!decay'] },
  inspAgeCap:     { label: 'Inspection Age Cap', formula: 'inspections older than inspAgeCap months excluded',  widgets: ['inspTab'], exportFields: ['Inspections!age_filter'] },
  minInspections: { label: 'Min Inspections',    formula: 'confidence = low when inspCount < minInspections',   widgets: ['inspTab','confidenceBadge'], exportFields: [] },
  // Violation
  movingWeight:    { label: 'Moving Viol. Weight',    formula: 'violScore = moving×(movingWeight/100) + nonMoving×(nonMovingWeight/100)', widgets: ['violTab'], exportFields: ['Violations!weight'] },
  nonMovingWeight: { label: 'Non-Moving Viol. Weight',formula: 'violScore = moving×(movingWeight/100) + nonMoving×(nonMovingWeight/100)', widgets: ['violTab'], exportFields: ['Violations!weight'] },
  criticalPenalty: { label: 'Critical Violation',     formula: 'penalty += criticalPenalty per critical violation',  widgets: ['violTab','hosEldTab'], exportFields: ['Violations!severity'] },
  majorPenalty:    { label: 'Major Violation',        formula: 'penalty += majorPenalty per major violation',        widgets: ['violTab','hosEldTab'], exportFields: ['Violations!severity'] },
  minorPenalty:    { label: 'Minor Violation',        formula: 'penalty += minorPenalty per minor violation',        widgets: ['violTab','hosEldTab'], exportFields: ['Violations!severity'] },
  violAgeCap:      { label: 'Violation Age Cap',      formula: 'violations older than violAgeCap months excluded',   widgets: ['violTab'], exportFields: ['Violations!age_filter'] },
  violDecay:       { label: 'Violation Decay',        formula: 'violScore × (1 - violDecay/100 × ageYears)',         widgets: ['violTab'], exportFields: ['Violations!decay'] },
  // Training
  completionWeight: { label: 'Completion Weight',   formula: 'trainingScore = completion × (completionWeight/100) + bonuses', widgets: ['driverScoreCard'], exportFields: [] },
  mandatoryBonus:   { label: 'Mandatory Bonus',     formula: 'trainingScore += mandatoryBonus (all mandatory complete)',     widgets: ['driverScoreCard'], exportFields: [] },
  optionalBonus:    { label: 'Optional Bonus',      formula: 'trainingScore += optionalBonus per optional completed',        widgets: ['driverScoreCard'], exportFields: [] },
  expiryWarning:    { label: 'Expiry Warning Days', formula: 'flag training if days_until_expiry ≤ expiryWarning',           widgets: ['driverScoreCard'], exportFields: [] },
  expiryPenalty:    { label: 'Near-Expiry Penalty', formula: 'trainingScore -= expiryPenalty (near-expiry training)',        widgets: ['driverScoreCard'], exportFields: [] },
  expiredPenalty:   { label: 'Expired Penalty',     formula: 'trainingScore -= expiredPenalty (expired training)',           widgets: ['driverScoreCard'], exportFields: [] },
  minTrainingHrs:   { label: 'Min Training Hours',  formula: 'flag driver if training_hours < minTrainingHrs',              widgets: ['driverScoreCard'], exportFields: [] },
  // VEDR
  followDistPenalty:  { label: 'Following Distance Penalty', formula: 'vedrScore -= followDistPenalty per event',   widgets: ['vedrTab','driverScoreCard'], exportFields: ['ELD VEDR Events!penalty'] },
  laneDevPenalty:     { label: 'Lane Deviation Penalty',     formula: 'vedrScore -= laneDevPenalty per event',      widgets: ['vedrTab','driverScoreCard'], exportFields: ['ELD VEDR Events!penalty'] },
  distractionPenalty: { label: 'Distraction Penalty',        formula: 'vedrScore -= distractionPenalty per event',  widgets: ['vedrTab','driverScoreCard'], exportFields: ['ELD VEDR Events!penalty'] },
  drowsinessPenalty:  { label: 'Drowsiness Penalty',         formula: 'vedrScore -= drowsinessPenalty per event',   widgets: ['vedrTab','driverScoreCard'], exportFields: ['ELD VEDR Events!penalty'] },
  maskingPenalty:     { label: 'Camera Masking Penalty',     formula: 'vedrScore -= maskingPenalty per masking event', widgets: ['vedrTab','driverScoreCard'], exportFields: ['ELD VEDR Events!penalty'] },
  coachingBonus:      { label: 'Coaching Bonus',             formula: 'vedrScore += coachingBonus per coaching session completed', widgets: ['vedrTab','driverScoreCard'], exportFields: [] },
  vedrDecay:          { label: 'VEDR Score Decay',           formula: 'vedrScore × (1 - vedrDecay/100 × ageYears)',  widgets: ['vedrTab'], exportFields: ['ELD VEDR Events!decay'] },
  // Alerts
  scoreDropAlert: { label: 'Score Drop Alert',   formula: 'alert when score drops by ≥ scoreDropAlert pts',       widgets: ['alertBanner','interventionList'], exportFields: ['Fleet Summary!alerts'] },
  criticalAlert:  { label: 'Critical Alert Threshold', formula: 'flag driver/asset when score < criticalAlert',   widgets: ['driverTable','interventionList','kpiCards'], exportFields: ['Fleet Summary!critical_count'] },
  alertCooldown:  { label: 'Alert Cooldown',     formula: 'min days between repeat alerts for same entity',       widgets: ['alertBanner'], exportFields: [] },
  emailAlerts:    { label: 'Email Alerts',       formula: 'send email when alert triggers',                       widgets: ['alertSettings'], exportFields: [] },
  inAppAlerts:    { label: 'In-App Alerts',      formula: 'show in-app notification when alert triggers',         widgets: ['alertBanner'], exportFields: [] },
  weeklyDigest:   { label: 'Weekly Digest',      formula: 'send weekly summary email',                            widgets: ['alertSettings'], exportFields: [] },
  autoFlag:       { label: 'Auto-Flag Drivers',  formula: 'automatically show flag icon on drivers below criticalAlert', widgets: ['driverTable','interventionList'], exportFields: [] },
  // Display
  defaultWindow:   { label: 'Default Time Window',   formula: 'initial date window on page load',        widgets: ['dateFilter'], exportFields: [] },
  defaultMode:     { label: 'Default Scoring Mode',  formula: 'initial time/distance mode on page load', widgets: ['scoringModeToggle'], exportFields: [] },
  defaultDistUnit: { label: 'Distance Unit',         formula: 'mi or km for all distance displays',      widgets: ['distanceDisplays'], exportFields: [] },
  defaultInterval: { label: 'Mileage Interval',      formula: 'interval used in mileage score: 100 - odo/defaultInterval', widgets: ['assetRiskCard'], exportFields: ['Assets Data!S formula'] },
  scoreDecimals:   { label: 'Score Decimal Places',  formula: 'toFixed(scoreDecimals) on all score displays', widgets: ['allScoreDisplays'], exportFields: [] },
  showPercent:     { label: 'Show % Symbol',         formula: 'append % to score values when true',       widgets: ['allScoreDisplays'], exportFields: [] },
  showRankBadges:  { label: 'Show Rank Badges',      formula: 'show Excellent/Good/Fair/Poor chip badges', widgets: ['scoreBadges','driverTable'], exportFields: [] },
  showTrendArrows: { label: 'Show Trend Arrows',     formula: 'show ↑↓ trend arrows on changing scores',   widgets: ['trendArrows'], exportFields: [] },
  colorBlindMode:  { label: 'Color-Blind Mode',      formula: 'use color-blind safe palette instead of red/green', widgets: ['allColorDisplays'], exportFields: [] },
};
