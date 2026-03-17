/**
 * Combined SAFE Fleet Safety Scoring
 *
 * Fleet Safety Score = (Operational × opWeight%) + (Regulatory × regWeight%)
 *   Operational = accidentScore×wAccidents% + eldScore×wEld% + vedrScore×wVedr% + inspScore×wInspections%
 *                 (normalized within the 4 operational components)
 *   Regulatory  = SMSScore × smsBlend% + CVORScore × cvorBlend%
 *   SMSScore    = 100 − weighted_avg_percentile  (lower percentile = better)
 *   CVORScore   = 100 − cvorRating               (lower CVOR % = better)
 *
 * Time mode  : 0–6 mo ×3, 6–12 mo ×2, 12–24 mo ×1 (with configurable decay)
 * Distance mode: 0–50k mi ×3, 50–150k mi ×2, 150–300k mi ×1 (same decay)
 *
 * All weights and thresholds come from SafetySettings — no hardcoded constants.
 */

import {
  computeCarrierBASICs,
  type BasicKey,
  type BasicResult,
  type InspectionForSMS,
  type CrashForSMS,
  type SMSConfig,
  type ViolationMultipliers,
} from './sms-engine';
import { FLEET_SAFETY_SCORES } from './safety-analysis.data';
import { carrierProfile } from '../inspections/inspectionsData';
import { type SafetySettings } from './safetySettings';

// ── BASIC composite weights (FMCSA-derived, not user-configurable) ────────────

const BASIC_W: Record<BasicKey, number> = {
  unsafe_driving:        0.20,
  crash_indicator:       0.25,
  hos_compliance:        0.15,
  vehicle_maintenance:   0.20,
  controlled_substances: 0.05,
  hm_compliance:         0.05,
  driver_fitness:        0.10,
};

// ── Component scorers ─────────────────────────────────────────────────────────

/**
 * Convert 7 BASIC percentiles → 0–100 safety score (higher = better).
 * BASICs with insufficient data get a neutral score based on settings.threshFair.
 */
export function smsCompositeScore(
  basics: Record<BasicKey, BasicResult>,
  settings: Pick<SafetySettings, 'threshFair'>
): number {
  const neutral = settings.threshFair; // insufficient-data BASICs get this score
  let ws = 0, wt = 0;
  for (const [k, r] of Object.entries(basics) as [BasicKey, BasicResult][]) {
    const w = BASIC_W[k];
    const score = r.hasSufficientData ? Math.max(0, 100 - r.percentile) : neutral;
    ws += score * w;
    wt += w;
  }
  return wt > 0 ? +(ws / wt).toFixed(1) : neutral;
}

/**
 * CVOR overall rating → 0–100 safety score (higher = better).
 */
export function cvorCompositeScore(): number {
  return Math.max(0, +(100 - carrierProfile.cvorAnalysis.rating).toFixed(1));
}

/**
 * Operational score from non-regulatory sub-scores.
 * Uses FLEET_SAFETY_SCORES with weights drawn from SafetySettings.
 * The 4 operational components (accidents, ELD, VEDR, inspections) are normalized
 * within themselves so they always sum to 100%.
 */
export function operationalScore(
  settings?: Pick<SafetySettings, 'wAccidents' | 'wEld' | 'wVedr' | 'wInspections'>
): number {
  const fs = FLEET_SAFETY_SCORES;
  const wAccidents = settings?.wAccidents ?? 25;
  const wEld = settings?.wEld ?? 25;
  const wVedr = settings?.wVedr ?? 25;
  const wInspections = settings?.wInspections ?? 25;
  const total = (wAccidents + wEld + wVedr + wInspections) || 100;
  return +(
    fs.accidentScore   * (wAccidents   / total) +
    fs.eldScore        * (wEld         / total) +
    fs.vedrScore       * (wVedr        / total) +
    fs.inspectionScore * (wInspections / total)
  ).toFixed(1);
}

// ── Combined result type ──────────────────────────────────────────────────────

export interface CombinedScoringResult {
  basics: Record<BasicKey, BasicResult>;
  smsScore: number;
  cvorScore: number;
  regulatoryScore: number;
  operationalScore: number;
  fleetSafetyScore: number;
  rating: 'Satisfactory' | 'Acceptable' | 'Conditional' | 'Unsatisfactory';
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Compute the full combined fleet safety score.
 * All thresholds, weights, and blends come from settings — no hardcoded constants.
 *
 * @param inspections  – SMS-formatted inspection records
 * @param crashes      – SMS-formatted crash records
 * @param settings     – loaded from SafetySettings (SafetySettingsPage → localStorage)
 * @param mode         – 'time' | 'distance' (overrides settings.smsFormulaMode)
 */
export function computeCombinedScore(
  inspections: InspectionForSMS[],
  crashes: CrashForSMS[],
  settings: SafetySettings,
  mode: 'time' | 'distance'
): CombinedScoringResult {
  const cfg: SMSConfig = {
    formulaMode:     mode,
    carrierType:     settings.smsCarrierType,
    segment:         settings.smsCarrierSegment,
    avgPU:           settings.smsAvgPU,
    annualVmtPerPU:  settings.smsAnnualVmtPerPU,
    decayBand1Pct:   settings.smsDecayBand1Pct,
    decayBand2Pct:   settings.smsDecayBand2Pct,
    decayBand3Pct:   settings.smsDecayBand3Pct,
    lookbackMonths:  settings.smsLookbackMonths,
  };

  const vMult: ViolationMultipliers = {
    oosBonus:         settings.smsOosBonus,
    perInspectionCap: settings.smsPerInspectionCap,
  };

  const basics = computeCarrierBASICs(inspections, crashes, cfg, vMult);

  const sms  = smsCompositeScore(basics, settings);
  const cvor = cvorCompositeScore();
  const op   = operationalScore(settings);

  // Regulatory blend (settings.smsBlend + settings.cvorBlend should = 100)
  const totalBlend = settings.smsBlend + settings.cvorBlend || 100;
  const reg = +(
    sms  * (settings.smsBlend  / totalBlend) +
    cvor * (settings.cvorBlend / totalBlend)
  ).toFixed(1);

  // Fleet blend (settings.opWeight + settings.regWeight should = 100)
  const totalW = settings.opWeight + settings.regWeight || 100;
  const fleet = +(
    op  * (settings.opWeight  / totalW) +
    reg * (settings.regWeight / totalW)
  ).toFixed(1);

  // Rating uses configurable thresholds from settings
  const rating: CombinedScoringResult['rating'] =
    fleet >= settings.threshExcellent ? 'Satisfactory' :
    fleet >= settings.threshGood      ? 'Acceptable'   :
    fleet >= settings.threshFair      ? 'Conditional'  : 'Unsatisfactory';

  return {
    basics,
    smsScore:         sms,
    cvorScore:        cvor,
    regulatoryScore:  reg,
    operationalScore: op,
    fleetSafetyScore: fleet,
    rating,
  };
}
