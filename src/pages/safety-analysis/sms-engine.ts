/**
 * SMS Engine – FMCSA Safety Measurement System (Adapted)
 *
 * Custom Decay Logic (per specification):
 *   0–6 months:    time_weight = 3,  decay_factor = 1.00  (no decay)
 *   6–12 months:   time_weight = 2,  decay_factor = 0.95  (5% decay)
 *   12–24 months:  time_weight = 1,  decay_factor = 0.60  (40% decay)
 *   > 24 months:   excluded from scoring
 *
 * Distance Mode (alternative to time):
 *   0–50k mi:       weight = 3, decay = 1.00
 *   50k–150k mi:    weight = 2, decay = 0.95
 *   150k–300k mi:   weight = 1, decay = 0.60
 *   > 300k mi:      excluded
 *
 * SMS BASICs:
 *   Unsafe Driving    = Σ(sev × weight) / (AvgPU × UtilFactor)
 *   Crash Indicator   = Σ(crash_sev × weight) / (AvgPU × UtilFactor)
 *   HOS Compliance    = Σ(sev × weight) / Σ(weight × relevant_inspections)
 *   Vehicle Maint.    = Σ(sev × weight) / Σ(weight × relevant_inspections)
 *   CS/Alcohol        = Σ(sev × weight) / Σ(weight × relevant_inspections)
 *   HM Compliance     = Σ(sev × weight) / Σ(weight × relevant_inspections)
 *   Driver Fitness    = Σ(sev × weight) / Σ(weight × relevant_inspections)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type BasicKey =
  | 'unsafe_driving'
  | 'crash_indicator'
  | 'hos_compliance'
  | 'vehicle_maintenance'
  | 'controlled_substances'
  | 'hm_compliance'
  | 'driver_fitness';

export type FormulaMode = 'time' | 'distance';
export type CarrierType = 'general' | 'hm' | 'passenger';
export type FleetSegment = 'combination' | 'straight';

export interface SMSConfig {
  formulaMode: FormulaMode;
  carrierType: CarrierType;
  segment: FleetSegment;
  avgPU: number;              // Average power units
  annualVmtPerPU: number;     // Annual VMT per power unit
  decayBand1Pct: number;      // Decay % for 0–6mo (default 0)
  decayBand2Pct: number;      // Decay % for 6–12mo (default 5)
  decayBand3Pct: number;      // Decay % for 12–24mo (default 40)
  lookbackMonths: number;     // Events older than this are excluded (default 24)
}

export const DEFAULT_SMS_CONFIG: SMSConfig = {
  formulaMode: 'time',
  carrierType: 'general',
  segment: 'combination',
  avgPU: 8,
  annualVmtPerPU: 100000,
  decayBand1Pct: 0,
  decayBand2Pct: 5,
  decayBand3Pct: 40,
  lookbackMonths: 24,
};

export interface ViolationMultipliers {
  oosBonus: number;           // Extra severity for OOS violations (default +2)
  perInspectionCap: number;   // Per-BASIC per-inspection severity cap (default 30)
}

export const DEFAULT_VIOLATION_MULTIPLIERS: ViolationMultipliers = {
  oosBonus: 2,
  perInspectionCap: 30,
};

export interface IncidentMultipliers {
  fatalBase: number;      // Base penalty for fatal incident (default 100)
  injuryBase: number;     // Base penalty for injury incident (default 60)
  propertyBase: number;   // Base penalty for property damage (default 30)
  nearMissBase: number;   // Base penalty for near-miss (default 10)
  towAwayMult: number;    // Tow-away multiplier (default 1.5×)
  hazmatMult: number;     // Hazmat multiplier (default 2.0×)
  atFaultMult: number;    // At-fault / preventable multiplier (default 1.8×)
}

export const DEFAULT_INCIDENT_MULTIPLIERS: IncidentMultipliers = {
  fatalBase: 100,
  injuryBase: 60,
  propertyBase: 30,
  nearMissBase: 10,
  towAwayMult: 1.5,
  hazmatMult: 2.0,
  atFaultMult: 1.8,
};

export interface BasicResult {
  key: BasicKey;
  label: string;
  measure: number;               // Raw weighted ratio (lower = better)
  score: number;                 // 0–100 inverted (higher = better, for display)
  percentile: number;            // 0–100 (higher = worse, like real SMS)
  threshold: number;             // Carrier-type alert threshold
  isAlert: boolean;
  hasSufficientData: boolean;
  violationCount: number;
  weightedViolations: number;
  relevantInspectionCount: number;
  weightedInspections: number;
}

// ── Labels & constants ────────────────────────────────────────────────────

export const BASIC_LABELS: Record<BasicKey, string> = {
  unsafe_driving: 'Unsafe Driving',
  crash_indicator: 'Crash Indicator',
  hos_compliance: 'HOS Compliance',
  vehicle_maintenance: 'Vehicle Maintenance',
  controlled_substances: 'Controlled Substances/Alcohol',
  hm_compliance: 'HM Compliance',
  driver_fitness: 'Driver Fitness',
};

export const BASIC_DESCRIPTIONS: Record<BasicKey, string> = {
  unsafe_driving: 'Speeding, reckless driving, improper lane change, texting, seat-belt violations',
  crash_indicator: 'State-reported reportable crashes (non-preventable excluded from measure)',
  hos_compliance: 'Hours-of-service violations, logbook errors, ELD non-compliance',
  vehicle_maintenance: 'Brakes, lights, mechanical defects, load securement, repair failures',
  controlled_substances: 'Impairment, possession/use, testing-program failures',
  hm_compliance: 'Hazardous materials compliance during HM-placarded transport',
  driver_fitness: 'CDL validity, medical qualification, driver qualification file issues',
};

// SMS intervention thresholds by carrier type
export const ALERT_THRESHOLDS: Record<CarrierType, Record<BasicKey, number>> = {
  general: {
    unsafe_driving: 65,
    crash_indicator: 65,
    hos_compliance: 65,
    vehicle_maintenance: 80,
    controlled_substances: 80,
    hm_compliance: 80,
    driver_fitness: 80,
  },
  hm: {
    unsafe_driving: 60,
    crash_indicator: 60,
    hos_compliance: 60,
    vehicle_maintenance: 75,
    controlled_substances: 75,
    hm_compliance: 80,
    driver_fitness: 75,
  },
  passenger: {
    unsafe_driving: 50,
    crash_indicator: 50,
    hos_compliance: 50,
    vehicle_maintenance: 65,
    controlled_substances: 65,
    hm_compliance: 80,
    driver_fitness: 65,
  },
};

// Violation category string → BASIC key
export const VIOLATION_TO_BASIC: Record<string, BasicKey> = {
  'Unsafe Driving': 'unsafe_driving',
  'Hours-of-service Compliance': 'hos_compliance',
  'HOS Compliance': 'hos_compliance',
  'Vehicle Maintenance': 'vehicle_maintenance',
  'Controlled Substances/Alcohol': 'controlled_substances',
  'Controlled Substances': 'controlled_substances',
  'Hazmat Compliance': 'hm_compliance',
  'Hazardous Materials Compliance': 'hm_compliance',
  'HM Compliance': 'hm_compliance',
  'Driver Fitness': 'driver_fitness',
};

// BASICs where OOS violations add +oosBonus to severity
const OOS_BONUS_BASICS = new Set<BasicKey>(['hos_compliance', 'vehicle_maintenance', 'hm_compliance', 'driver_fitness']);

// BASICs where per-inspection severity is capped
const CAP_BASICS = new Set<BasicKey>(['hos_compliance', 'vehicle_maintenance', 'hm_compliance', 'driver_fitness', 'controlled_substances']);

// Minimum data sufficiency counts (inspections or crashes)
const MIN_DATA: Partial<Record<BasicKey, number>> = {
  unsafe_driving: 3,
  crash_indicator: 2,
  hos_compliance: 3,
  vehicle_maintenance: 5,
  controlled_substances: 1,
  hm_compliance: 5,
  driver_fitness: 5,
};

// ── Time weight & decay ───────────────────────────────────────────────────

/**
 * Time weight tier (3 / 2 / 1 / 0) based on event age.
 */
export function getSMSTimeWeight(ageMonths: number): number {
  if (ageMonths > 24) return 0;
  if (ageMonths <= 6) return 3;
  if (ageMonths <= 12) return 2;
  return 1;
}

/**
 * Additional decay factor applied on top of the time weight.
 * Band 1 (0–6mo):   1 − decayBand1Pct/100  → default 1.00
 * Band 2 (6–12mo):  1 − decayBand2Pct/100  → default 0.95
 * Band 3 (12–24mo): 1 − decayBand3Pct/100  → default 0.60
 */
export function getSMSDecayFactor(ageMonths: number, cfg: SMSConfig): number {
  if (ageMonths > 24) return 0;
  if (ageMonths <= 6) return 1 - cfg.decayBand1Pct / 100;
  if (ageMonths <= 12) return 1 - cfg.decayBand2Pct / 100;
  return 1 - cfg.decayBand3Pct / 100;
}

/** Combined effective weight = timeWeight × decayFactor */
export function getEffectiveTimeWeight(ageMonths: number, cfg: SMSConfig): number {
  return getSMSTimeWeight(ageMonths) * getSMSDecayFactor(ageMonths, cfg);
}

// ── Distance weight & decay ───────────────────────────────────────────────

/**
 * Distance weight tier (3 / 2 / 1 / 0) based on miles driven since the event.
 *   0–50k mi:     3  (recent; no decay)
 *   50k–150k mi:  2  (moderate; 5% decay)
 *   150k–300k mi: 1  (older;  40% decay)
 *   > 300k mi:    0  (excluded)
 */
export function getDistanceWeight(miSinceEvent: number): number {
  if (miSinceEvent > 300000) return 0;
  if (miSinceEvent <= 50000) return 3;
  if (miSinceEvent <= 150000) return 2;
  return 1;
}

export function getDistanceDecayFactor(miSinceEvent: number, cfg: SMSConfig): number {
  if (miSinceEvent > 300000) return 0;
  if (miSinceEvent <= 50000) return 1 - cfg.decayBand1Pct / 100;
  if (miSinceEvent <= 150000) return 1 - cfg.decayBand2Pct / 100;
  return 1 - cfg.decayBand3Pct / 100;
}

export function getEffectiveDistanceWeight(miSinceEvent: number, cfg: SMSConfig): number {
  return getDistanceWeight(miSinceEvent) * getDistanceDecayFactor(miSinceEvent, cfg);
}

// ── Utilization Factor ────────────────────────────────────────────────────

/**
 * Utilization Factor normalizes exposure for Unsafe Driving and Crash Indicator.
 * Combination carriers: low VMT/PU → factor 1; high → 1.6; very high → 1.
 * Straight carriers: scales 1→3 up to 60k VMT/PU.
 */
export function getUtilizationFactor(vmtPerPU: number, segment: FleetSegment): number {
  if (segment === 'combination') {
    if (vmtPerPU < 80000) return 1;
    if (vmtPerPU <= 160000) return vmtPerPU / 100000;
    if (vmtPerPU <= 200000) return 1.6;
    return 1;
  }
  // Straight
  if (vmtPerPU < 20000) return 1;
  if (vmtPerPU <= 60000) return vmtPerPU / 20000;
  if (vmtPerPU <= 200000) return 3;
  return 1;
}

// ── Incident penalty ──────────────────────────────────────────────────────

export function calcIncidentPenalty(
  inc: { fatalities: number; injuries: number; towAway: boolean; hazmat: boolean; isPreventable: boolean | null },
  mult: IncidentMultipliers = DEFAULT_INCIDENT_MULTIPLIERS
): number {
  const base =
    inc.fatalities > 0 ? mult.fatalBase
    : inc.injuries > 0 ? mult.injuryBase
    : inc.towAway   ? mult.propertyBase
    : mult.nearMissBase;
  const t = inc.towAway            ? mult.towAwayMult : 1;
  const h = inc.hazmat             ? mult.hazmatMult  : 1;
  const f = inc.isPreventable === true ? mult.atFaultMult : 1;
  return parseFloat((base * t * h * f).toFixed(1));
}

/** SMS crash severity weight (for Crash Indicator BASIC) */
export function getCrashSMSSeverity(
  fatalities: number,
  injuries: number,
  hazmat: boolean
): number {
  const base = (fatalities > 0 || injuries > 0) ? 2 : 1;
  return hazmat ? base + 1 : base;
}

// ── Input types ───────────────────────────────────────────────────────────

export interface InspectionForSMS {
  id: string;
  date: string;
  level: string;       // "Level 1", "Level 2", etc.
  driverId: string;
  assetId: string;
  hasHM: boolean;      // placardable HM being transported
  miSinceEvent?: number; // for distance mode (optional)
  violations: Array<{
    code: string;
    category: string;  // maps via VIOLATION_TO_BASIC
    severity: number;  // 1–10
    oos: boolean;
  }>;
}

export interface CrashForSMS {
  id: string;
  date: string;
  driverId: string;
  fatalities: number;
  injuries: number;
  towAway: boolean;
  hazmat: boolean;
  isPreventable: boolean | null;
  miSinceEvent?: number;
}

// ── Core BASIC computation ────────────────────────────────────────────────

function isRelevantForBasic(insp: InspectionForSMS, basicKey: BasicKey): boolean {
  const lvl = parseInt(insp.level.replace(/\D/g, ''), 10) || 0;
  switch (basicKey) {
    case 'unsafe_driving':
    case 'hos_compliance':
    case 'controlled_substances':
    case 'driver_fitness':
      return [1, 2, 3, 6].includes(lvl);
    case 'vehicle_maintenance':
      return [1, 2, 5, 6].includes(lvl);
    case 'hm_compliance':
      return [1, 2, 5, 6].includes(lvl) && insp.hasHM;
    default:
      return false;
  }
}

/**
 * Compute all 7 SMS BASIC results from inspections + crashes.
 */
export function computeCarrierBASICs(
  inspections: InspectionForSMS[],
  crashes: CrashForSMS[],
  cfg: SMSConfig = DEFAULT_SMS_CONFIG,
  violMult: ViolationMultipliers = DEFAULT_VIOLATION_MULTIPLIERS
): Record<BasicKey, BasicResult> {
  const now = new Date();
  const ageMonths = (d: string) =>
    (now.getTime() - new Date(d).getTime()) / (1000 * 60 * 60 * 24 * 30.44);

  const recentInsp   = inspections.filter(i => ageMonths(i.date) <= cfg.lookbackMonths);
  const recentCrash  = crashes.filter(c => ageMonths(c.date) <= cfg.lookbackMonths);

  const utilFactor = getUtilizationFactor(cfg.annualVmtPerPU, cfg.segment);
  const puExposure = cfg.avgPU * utilFactor;
  const thresholds = ALERT_THRESHOLDS[cfg.carrierType];

  // Effective weight selector based on formula mode
  const ew = (dateStr: string, mi?: number): number =>
    cfg.formulaMode === 'distance' && mi != null
      ? getEffectiveDistanceWeight(mi, cfg)
      : getEffectiveTimeWeight(ageMonths(dateStr), cfg);

  const results = {} as Record<BasicKey, BasicResult>;
  const ALL_BASICS: BasicKey[] = [
    'unsafe_driving', 'crash_indicator', 'hos_compliance',
    'vehicle_maintenance', 'controlled_substances', 'hm_compliance', 'driver_fitness',
  ];

  for (const bk of ALL_BASICS) {

    // ── Crash Indicator (PU-normalized) ────────────────────────────────
    if (bk === 'crash_indicator') {
      let num = 0;
      let crashCount = 0;
      for (const cr of recentCrash) {
        // Non-preventable crashes excluded from measure (but counted)
        if (cr.isPreventable === false) continue;
        const w = ew(cr.date, cr.miSinceEvent);
        if (w === 0) continue;
        const sev = getCrashSMSSeverity(cr.fatalities, cr.injuries, cr.hazmat);
        num += sev * w;
        crashCount++;
      }
      const measure = puExposure > 0 ? num / puExposure : 0;
      // Convert to 0-100 score: scale so measure ≈ 5 → score ≈ 50
      const score = Math.max(0, Math.min(100, 100 - measure * 10));
      const percentile = Math.min(100, Math.round(measure * 20));
      const threshold = thresholds[bk];
      results[bk] = {
        key: bk, label: BASIC_LABELS[bk],
        measure: +measure.toFixed(3), score: +score.toFixed(1),
        percentile: +percentile.toFixed(1), threshold,
        isAlert: percentile >= threshold,
        hasSufficientData: crashCount >= (MIN_DATA[bk] ?? 2),
        violationCount: crashCount, weightedViolations: +num.toFixed(2),
        relevantInspectionCount: 0, weightedInspections: 0,
      };
      continue;
    }

    // ── All other BASICs ───────────────────────────────────────────────
    const usesPU = bk === 'unsafe_driving';
    let num = 0;
    let denom = 0;
    let violCount = 0;
    let relevantInspCount = 0;
    let inspWithViolations = 0;

    for (const insp of recentInsp) {
      if (!isRelevantForBasic(insp, bk)) continue;
      const w = ew(insp.date, insp.miSinceEvent);
      if (w === 0) continue;

      if (!usesPU) {
        denom += w;
        relevantInspCount++;
      }

      const applicable = insp.violations.filter(v => VIOLATION_TO_BASIC[v.category] === bk);
      if (applicable.length === 0) continue;
      inspWithViolations++;

      // Severity sum for this inspection × BASIC (before time weight)
      let inspSev = 0;
      for (const v of applicable) {
        let sev = v.severity;
        if (OOS_BONUS_BASICS.has(bk) && v.oos) sev += violMult.oosBonus;
        inspSev += sev;
        violCount++;
      }
      if (CAP_BASICS.has(bk)) inspSev = Math.min(violMult.perInspectionCap, inspSev);
      num += inspSev * w;
    }

    const denomFinal = usesPU ? puExposure : denom;
    const measure = denomFinal > 0 ? num / denomFinal : 0;
    // Scale to 0-100 score
    const scaleFactor = usesPU ? 5 : 15;
    const score = Math.max(0, Math.min(100, 100 - measure * scaleFactor));
    const percentile = Math.min(100, Math.round(measure * (usesPU ? 10 : 30)));
    const threshold = thresholds[bk];
    const minD = MIN_DATA[bk] ?? 3;
    const hasSufficient =
      bk === 'controlled_substances'
        ? inspWithViolations >= 1
        : relevantInspCount >= minD && inspWithViolations >= 1;

    results[bk] = {
      key: bk, label: BASIC_LABELS[bk],
      measure: +measure.toFixed(3), score: +score.toFixed(1),
      percentile: +percentile.toFixed(1), threshold,
      isAlert: hasSufficient && percentile >= threshold,
      hasSufficientData: hasSufficient,
      violationCount: violCount, weightedViolations: +num.toFixed(2),
      relevantInspectionCount: relevantInspCount, weightedInspections: +denom.toFixed(2),
    };
  }

  return results;
}

/**
 * Filter inspections/crashes to a single driver and compute their BASICs.
 */
export function computeDriverBASICs(
  driverId: string,
  inspections: InspectionForSMS[],
  crashes: CrashForSMS[],
  cfg: SMSConfig = DEFAULT_SMS_CONFIG,
  violMult: ViolationMultipliers = DEFAULT_VIOLATION_MULTIPLIERS
): Record<BasicKey, BasicResult> {
  return computeCarrierBASICs(
    inspections.filter(i => i.driverId === driverId),
    crashes.filter(c => c.driverId === driverId),
    { ...cfg, avgPU: 1 },
    violMult
  );
}

/**
 * Filter inspections to a single asset and compute its BASICs.
 * Crashes linked to this asset by unit number.
 */
export function computeAssetBASICs(
  assetId: string,
  inspections: InspectionForSMS[],
  crashes: CrashForSMS[],
  cfg: SMSConfig = DEFAULT_SMS_CONFIG,
  violMult: ViolationMultipliers = DEFAULT_VIOLATION_MULTIPLIERS
): Record<BasicKey, BasicResult> {
  return computeCarrierBASICs(
    inspections.filter(i => i.assetId === assetId),
    crashes,
    { ...cfg, avgPU: 1 },
    violMult
  );
}

/**
 * Composite safety score (0–100, higher = better) from BASIC scores.
 * Weights: UD 20%, CI 25%, HOS 15%, VM 20%, CS 5%, HM 5%, DF 10%
 */
export function computeCompositeScore(basics: Record<BasicKey, BasicResult>): number {
  const W: Record<BasicKey, number> = {
    unsafe_driving: 0.20,
    crash_indicator: 0.25,
    hos_compliance: 0.15,
    vehicle_maintenance: 0.20,
    controlled_substances: 0.05,
    hm_compliance: 0.05,
    driver_fitness: 0.10,
  };
  let ws = 0;
  let wt = 0;
  for (const [k, r] of Object.entries(basics) as [BasicKey, BasicResult][]) {
    ws += r.score * W[k];
    wt += W[k];
  }
  return wt > 0 ? +(ws / wt).toFixed(1) : 100;
}

/**
 * Human-readable description of the time/distance weight for a given age.
 */
export function explainWeight(ageMonths: number, cfg: SMSConfig): string {
  const tw = getSMSTimeWeight(ageMonths);
  const df = getSMSDecayFactor(ageMonths, cfg);
  if (tw === 0) return 'Excluded (> 24 months)';
  const band = ageMonths <= 6 ? '0–6mo' : ageMonths <= 12 ? '6–12mo' : '12–24mo';
  return `${band}: time_wt=${tw} × decay=${df.toFixed(2)} = ${(tw * df).toFixed(2)}`;
}
