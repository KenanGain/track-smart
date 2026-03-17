/**
 * nscViolationMap.ts
 *
 * Pure lookup tables with NO imports — safe to import from any file without
 * risk of circular dependency.
 *
 * DEFECT_TO_NSC          — CVSA defect category prefix → NSC CCMTA numeric code
 * NSC_CODE_TO_SYSTEM     — NSC CCMTA numeric code (3-4 digit) → system violation category
 * CCMTA_ALPHA_CODE_MAP   — CCMTA 2-char conviction code (e.g. "OE","HD") → full description + mapping
 * FMCSA_BASIC_MAP        — FMCSA BASIC category key → label, CFR parts, weight
 * CFR_PART_TO_BASIC      — 49 CFR part number → FMCSA BASIC category key
 */

/** Maps CVSA defect category number prefix → NSC CCMTA violation code */
export const DEFECT_TO_NSC: Record<string, string> = {
  '1':  '1001', // Driver Credentials
  '2':  '1101', // Hours Of Service
  '3':  '602',  // Brake Adjustment
  '4':  '601',  // Brake Systems
  '5':  '1301', // Coupling Devices
  '7':  '1301', // Frames
  '9':  '801',  // Lighting Devices
  '10': '901',  // Cargo Securement
  '13': '701',  // Tires (req) — OOS tier uses '702'
  '14': '1301', // Trailer Bodies
  '16': '801',  // Windshield Wipers
};

/**
 * Maps numeric NSC / CCMTA roadside-inspection violation codes
 * (from NSC Standard 16 / CVSA) → system violation category info.
 *
 * 3-4 digit codes used in CVSA inspection reports and the NSC_VIOLATION_CATALOG.
 */
export const NSC_CODE_TO_SYSTEM: Record<string, {
  category: string;
  categoryLabel: string;
  violationGroup: string;
  riskLevel: 'High' | 'Medium' | 'Low';
  nscSection?: string;   // NSC Standard section reference
  oosEligible?: boolean; // true if code can trigger OOS order
}> = {
  // ── Administrative ───────────────────────────────────────────────────────
  '209':  { category: 'driver_fitness',      categoryLabel: 'Driver Fitness',      violationGroup: 'Operating Authority',          riskLevel: 'High',   nscSection: 'NSC 2',  oosEligible: false },
  '210':  { category: 'driver_fitness',      categoryLabel: 'Driver Fitness',      violationGroup: 'Operating Authority',          riskLevel: 'Medium', nscSection: 'NSC 2',  oosEligible: false },
  // ── Driving Behaviour ───────────────────────────────────────────────────
  '317':  { category: 'unsafe_driving',      categoryLabel: 'Unsafe Driving',      violationGroup: 'Traffic Control Devices',      riskLevel: 'Low',    nscSection: 'NSC 3',  oosEligible: false },
  // ── Trip Inspections ────────────────────────────────────────────────────
  '500':  { category: 'driver_fitness',      categoryLabel: 'Driver Fitness',      violationGroup: 'Trip Inspection',              riskLevel: 'Medium', nscSection: 'NSC 5',  oosEligible: false },
  // ── Brakes ──────────────────────────────────────────────────────────────
  '601':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Brakes',                       riskLevel: 'High',   nscSection: 'NSC 6',  oosEligible: true  },
  '602':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Brake Adjustment',             riskLevel: 'High',   nscSection: 'NSC 6',  oosEligible: true  },
  '603':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Air Brake System',             riskLevel: 'High',   nscSection: 'NSC 6',  oosEligible: true  },
  '604':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Brake Hose / Lines',           riskLevel: 'High',   nscSection: 'NSC 6',  oosEligible: true  },
  // ── Tires ───────────────────────────────────────────────────────────────
  '701':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Tires',                        riskLevel: 'Medium', nscSection: 'NSC 7',  oosEligible: false },
  '702':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Tires — OOS',                  riskLevel: 'High',   nscSection: 'NSC 7',  oosEligible: true  },
  '703':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Tires — Flat / Unsafe',        riskLevel: 'High',   nscSection: 'NSC 7',  oosEligible: true  },
  // ── Lighting & Lamps ────────────────────────────────────────────────────
  '801':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Lighting & Lamps',             riskLevel: 'Medium', nscSection: 'NSC 8',  oosEligible: false },
  '802':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Brake Lights Inoperative',     riskLevel: 'High',   nscSection: 'NSC 8',  oosEligible: true  },
  // ── Cargo Securement ────────────────────────────────────────────────────
  '901':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Cargo Securement',             riskLevel: 'High',   nscSection: 'NSC 9',  oosEligible: true  },
  '902':  { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Cargo Load Shift Risk',        riskLevel: 'High',   nscSection: 'NSC 9',  oosEligible: true  },
  // ── Driver Credentials ──────────────────────────────────────────────────
  '1001': { category: 'driver_fitness',      categoryLabel: 'Driver Fitness',      violationGroup: 'Driver License / CDL',         riskLevel: 'High',   nscSection: 'NSC 10', oosEligible: true  },
  '1002': { category: 'driver_fitness',      categoryLabel: 'Driver Fitness',      violationGroup: 'No Valid Driver Licence',       riskLevel: 'High',   nscSection: 'NSC 10', oosEligible: true  },
  // ── Hours of Service ────────────────────────────────────────────────────
  '1101': { category: 'hours_of_service',    categoryLabel: 'Hours of Service',    violationGroup: 'HOS / Logbook / ELD',          riskLevel: 'High',   nscSection: 'NSC 11', oosEligible: true  },
  '1102': { category: 'hours_of_service',    categoryLabel: 'Hours of Service',    violationGroup: 'Logbook Not Current',          riskLevel: 'Medium', nscSection: 'NSC 11', oosEligible: false },
  // ── Dangerous Goods ─────────────────────────────────────────────────────
  '1201': { category: 'hazmat_compliance',   categoryLabel: 'Hazmat Compliance',   violationGroup: 'Dangerous Goods',              riskLevel: 'High',   nscSection: 'NSC 12', oosEligible: true  },
  // ── Mechanical / Structural ─────────────────────────────────────────────
  '1301': { category: 'vehicle_maintenance', categoryLabel: 'Vehicle Maintenance', violationGroup: 'Mechanical / Structural',      riskLevel: 'Medium', nscSection: 'NSC 13', oosEligible: false },
};

/**
 * CCMTA 2-character alpha conviction codes — from the CCMTA Schedule of Convictions
 * (NSC Schedule B).  These appear in violations.data.ts under
 * `canadaEnforcement.ccmtaCode` and on driver abstract / CVOR records.
 *
 * Distinct from the 3-4 digit NSC roadside inspection codes above.
 */
export const CCMTA_ALPHA_CODE_MAP: Record<string, {
  label: string;                          // short display label
  description: string;                    // full conviction category description
  nscCategory: string;                    // system category key
  nscCategoryLabel: string;              // display label for system category
  fmcsaBasic: string;                    // closest FMCSA BASIC equivalent key
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  nscSection?: string;                   // NSC Standard reference
  pointsTypical?: number;                // typical NSC demerit points (indicative only)
}> = {
  // ── Alcohol / Drug ───────────────────────────────────────────────────────
  'DE': {
    label:            'Impaired — Criminal',
    description:      'Criminal Code impaired driving (alcohol or drug) — over 80 mg, refusal, or care & control',
    nscCategory:      'controlled_substances_alcohol',
    nscCategoryLabel: 'Controlled Substances / Alcohol',
    fmcsaBasic:       'controlled_substances',
    riskLevel:        'Critical',
    nscSection:       'Criminal Code s.320.14',
    pointsTypical:    7,
  },
  'DI': {
    label:            'Impaired — HTA',
    description:      'Provincial HTA impaired driving (blood-alcohol concentration warn-range)',
    nscCategory:      'controlled_substances_alcohol',
    nscCategoryLabel: 'Controlled Substances / Alcohol',
    fmcsaBasic:       'controlled_substances',
    riskLevel:        'Critical',
    nscSection:       'HTA s.48',
    pointsTypical:    6,
  },
  'OE': {
    label:            'Operating — Suspended',
    description:      'Operating a commercial vehicle while licence suspended, cancelled, or under disqualification',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'driver_fitness',
    riskLevel:        'Critical',
    nscSection:       'HTA s.53',
    pointsTypical:    6,
  },
  // ── Driver Disqualification / Prohibited ────────────────────────────────
  'DQ': {
    label:            'Disqualification',
    description:      'Federal or provincial driver disqualification order (CDL / commercial class)',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'driver_fitness',
    riskLevel:        'Critical',
    nscSection:       'NSC Std. 14',
    pointsTypical:    7,
  },
  'DP': {
    label:            'Driving Prohibited',
    description:      'Court-issued driving prohibition (Criminal Code or provincial)',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'driver_fitness',
    riskLevel:        'Critical',
    nscSection:       'Criminal Code s.320.24',
    pointsTypical:    7,
  },
  // ── Dangerous / Negligent Driving ───────────────────────────────────────
  'DR': {
    label:            'Dangerous Driving',
    description:      'Criminal Code dangerous operation of a motor vehicle',
    nscCategory:      'unsafe_driving',
    nscCategoryLabel: 'Unsafe Driving',
    fmcsaBasic:       'unsafe_driving',
    riskLevel:        'Critical',
    nscSection:       'Criminal Code s.320.13',
    pointsTypical:    6,
  },
  'NE': {
    label:            'Negligent Driving',
    description:      'Careless or negligent driving under provincial HTA / traffic act',
    nscCategory:      'unsafe_driving',
    nscCategoryLabel: 'Unsafe Driving',
    fmcsaBasic:       'unsafe_driving',
    riskLevel:        'High',
    nscSection:       'HTA s.130',
    pointsTypical:    4,
  },
  // ── Driver Fitness / Medical ─────────────────────────────────────────────
  'DA': {
    label:            'Driving Ability',
    description:      'Driving while medically unfit or with a condition impairing ability to operate safely',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'driver_fitness',
    riskLevel:        'High',
    nscSection:       'NSC Std. 6',
    pointsTypical:    5,
  },
  'DF': {
    label:            'Driver Fatigue',
    description:      'Driving while fatigued or excessively tired (distinct from logbook HOS violation)',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'hos_compliance',
    riskLevel:        'High',
    nscSection:       'NSC Std. 9',
    pointsTypical:    4,
  },
  'NL': {
    label:            'No Licence',
    description:      'Driving without a valid driver\'s licence (no licence or wrong class for vehicle)',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'driver_fitness',
    riskLevel:        'High',
    nscSection:       'HTA s.32',
    pointsTypical:    3,
  },
  'VR': {
    label:            'Vehicle Registration',
    description:      'Operating an unregistered or improperly plated commercial vehicle',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'driver_fitness',
    riskLevel:        'Medium',
    nscSection:       'HTA s.7',
    pointsTypical:    2,
  },
  // ── Hours of Service ────────────────────────────────────────────────────
  'HD': {
    label:            'Hours of Driving',
    description:      'Exceeding maximum hours of driving (on-duty driving time limits)',
    nscCategory:      'hours_of_service',
    nscCategoryLabel: 'Hours of Service',
    fmcsaBasic:       'hos_compliance',
    riskLevel:        'High',
    nscSection:       'NSC Std. 9 / HOS Reg.',
    pointsTypical:    3,
  },
  'HR': {
    label:            'Hours — Rest',
    description:      'Insufficient rest period (daily off-duty or sleeper berth requirement not met)',
    nscCategory:      'hours_of_service',
    nscCategoryLabel: 'Hours of Service',
    fmcsaBasic:       'hos_compliance',
    riskLevel:        'High',
    nscSection:       'NSC Std. 9 / HOS Reg.',
    pointsTypical:    3,
  },
  'HE': {
    label:            'HOS — ELD',
    description:      'Electronic Logging Device (ELD) violation or malfunction not corrected',
    nscCategory:      'hours_of_service',
    nscCategoryLabel: 'Hours of Service',
    fmcsaBasic:       'hos_compliance',
    riskLevel:        'High',
    nscSection:       'NSC Std. 9 / ELD Reg.',
    pointsTypical:    3,
  },
  'HP': {
    label:            'HOS — Paper Log',
    description:      'Paper logbook violation (falsification, missing, or not current)',
    nscCategory:      'hours_of_service',
    nscCategoryLabel: 'Hours of Service',
    fmcsaBasic:       'hos_compliance',
    riskLevel:        'Medium',
    nscSection:       'NSC Std. 9',
    pointsTypical:    2,
  },
  'HS': {
    label:            'HOS — Special Permit',
    description:      'HOS violation under special permit or exemption conditions',
    nscCategory:      'hours_of_service',
    nscCategoryLabel: 'Hours of Service',
    fmcsaBasic:       'hos_compliance',
    riskLevel:        'Medium',
    nscSection:       'NSC Std. 9',
    pointsTypical:    2,
  },
  'HT': {
    label:            'Trip Inspection',
    description:      'Failure to conduct or record a required pre-trip or en-route vehicle inspection',
    nscCategory:      'driver_fitness',
    nscCategoryLabel: 'Driver Fitness',
    fmcsaBasic:       'vehicle_maintenance',
    riskLevel:        'Medium',
    nscSection:       'NSC Std. 13',
    pointsTypical:    2,
  },
  // ── Mechanical / Vehicle ─────────────────────────────────────────────────
  'MF': {
    label:            'Mechanical Fitness',
    description:      'Operating a vehicle that is mechanically unfit — brake, tire, lighting, or structural defect',
    nscCategory:      'vehicle_maintenance',
    nscCategoryLabel: 'Vehicle Maintenance',
    fmcsaBasic:       'vehicle_maintenance',
    riskLevel:        'High',
    nscSection:       'NSC Std. 11',
    pointsTypical:    3,
  },
  'ML': {
    label:            'Load Security',
    description:      'Unsafe or improperly secured load (cargo securement, overload, or load shift)',
    nscCategory:      'vehicle_maintenance',
    nscCategoryLabel: 'Vehicle Maintenance',
    fmcsaBasic:       'vehicle_maintenance',
    riskLevel:        'High',
    nscSection:       'NSC Std. 11 / HTA s.111',
    pointsTypical:    3,
  },
  'WC': {
    label:            'Weight Compliance',
    description:      'Operating in excess of permitted weight (axle, gross, or bridge formula violation)',
    nscCategory:      'vehicle_maintenance',
    nscCategoryLabel: 'Vehicle Maintenance',
    fmcsaBasic:       'vehicle_maintenance',
    riskLevel:        'Medium',
    nscSection:       'HTA s.116–122',
    pointsTypical:    2,
  },
  // ── Dangerous Goods ─────────────────────────────────────────────────────
  'DG': {
    label:            'Dangerous Goods',
    description:      'Transportation of Dangerous Goods Act violation (placarding, documentation, handling)',
    nscCategory:      'hazmat_compliance',
    nscCategoryLabel: 'Hazmat Compliance',
    fmcsaBasic:       'hazmat',
    riskLevel:        'Critical',
    nscSection:       'TDGA / NSC Std. 12',
    pointsTypical:    5,
  },
};

/**
 * FMCSA Behavior Analysis and Safety Improvement Categories (BASICs).
 * Each entry describes the SMS BASIC, the CFR parts that fall under it,
 * and its relative SMS weight in the carrier safety scoring algorithm.
 */
export const FMCSA_BASIC_MAP: Record<string, {
  label: string;
  description: string;
  cfrParts: number[];       // primary 49 CFR parts that map to this BASIC
  smsWeight: number;        // relative weight in SMS scoring (illustrative %)
  oosThreshold?: number;    // typical OOS intervention threshold %
  canadaEquivalent?: string; // closest NSC/CCMTA system category
}> = {
  unsafe_driving: {
    label:            'Unsafe Driving',
    description:      'Operation of commercial vehicles in a dangerous or careless manner (speeding, reckless driving, improper lane change)',
    cfrParts:         [392],
    smsWeight:        35,
    oosThreshold:     65,
    canadaEquivalent: 'unsafe_driving',
  },
  hos_compliance: {
    label:            'HOS Compliance',
    description:      'Operating a commercial vehicle in violation of hours-of-service regulations (driving time, rest, logbook/ELD)',
    cfrParts:         [395],
    smsWeight:        25,
    oosThreshold:     65,
    canadaEquivalent: 'hours_of_service',
  },
  driver_fitness: {
    label:            'Driver Fitness',
    description:      'Operating a commercial vehicle without a proper CDL or while medically unqualified',
    cfrParts:         [383, 391],
    smsWeight:        15,
    oosThreshold:     80,
    canadaEquivalent: 'driver_fitness',
  },
  controlled_substances: {
    label:            'Controlled Substances / Alcohol',
    description:      'Violations related to use of alcohol or controlled substances by drivers',
    cfrParts:         [382, 392],
    smsWeight:        15,
    oosThreshold:     80,
    canadaEquivalent: 'controlled_substances_alcohol',
  },
  vehicle_maintenance: {
    label:            'Vehicle Maintenance',
    description:      'Failure to properly maintain a commercial vehicle (brakes, lights, tires, cargo securement)',
    cfrParts:         [393, 396],
    smsWeight:        20,
    oosThreshold:     80,
    canadaEquivalent: 'vehicle_maintenance',
  },
  hazmat: {
    label:            'Hazardous Materials Compliance',
    description:      'Violations related to the safe transportation of hazardous materials (placarding, packaging, shipping papers)',
    cfrParts:         [171, 172, 173, 177, 180, 397],
    smsWeight:        10,
    oosThreshold:     80,
    canadaEquivalent: 'hazmat_compliance',
  },
  crash_indicator: {
    label:            'Crash Indicator',
    description:      'History of involvement in serious crashes — not a direct inspection violation category but factored into SMS',
    cfrParts:         [],
    smsWeight:        50,
    oosThreshold:     undefined,
    canadaEquivalent: undefined,
  },
};

/**
 * Maps 49 CFR part numbers → FMCSA BASIC category key.
 * Use: look up regulatoryCodes.usa[].cfr strings, parse the part number,
 * then look it up here to get the BASIC label.
 */
export const CFR_PART_TO_BASIC: Record<number, string> = {
  // Unsafe Driving
  392: 'unsafe_driving',
  // HOS Compliance
  395: 'hos_compliance',
  // Driver Fitness
  383: 'driver_fitness',
  391: 'driver_fitness',
  // Controlled Substances / Alcohol
  382: 'controlled_substances',
  40:  'controlled_substances',
  // Vehicle Maintenance
  393: 'vehicle_maintenance',
  396: 'vehicle_maintenance',
  // Hazmat
  171: 'hazmat',
  172: 'hazmat',
  173: 'hazmat',
  177: 'hazmat',
  180: 'hazmat',
  397: 'hazmat',
};

/**
 * Utility: derive FMCSA BASIC category from a CFR string like "49 CFR 392.4(a)".
 * Returns the BASIC key or null if not mapped.
 */
export function cfr_to_basic(cfrString: string): string | null {
  const match = cfrString.match(/\b(\d{2,3})\b/);
  if (!match) return null;
  const part = parseInt(match[1], 10);
  return CFR_PART_TO_BASIC[part] ?? null;
}
