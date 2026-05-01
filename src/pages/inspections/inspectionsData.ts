import type { CvorInterventionEvent, CvorTravelKmRow } from './cvorInterventionEvents.data';

export const SUMMARY_CATEGORIES = [
  "Vehicle Maintenance",
  "Unsafe Driving",
  "Hours-of-service Compliance",
  "Driver Fitness",
  "Hazmat compliance",
  "Controlled Substances",
  "Others"
];

// Canadian provinces/territories for jurisdiction detection
export const CANADIAN_PROVINCES = ['ON', 'QC', 'AB', 'BC', 'MB', 'SK', 'NB', 'NS', 'PE', 'NL', 'NT', 'YT', 'NU'];

export type Jurisdiction = 'CSA' | 'CVOR';

export function getJurisdiction(state: string): Jurisdiction {
  return CANADIAN_PROVINCES.includes(state.toUpperCase()) ? 'CVOR' : 'CSA';
}

// Cross-reference mapping: CSA (FMCSA) code <-> CVOR (Canadian) equivalent
// Each entry maps a code to its equivalent in the other regulatory system
export interface RegulatoryEquivalent {
  code: string;
  source: 'FMCSA' | 'Ontario HTA' | 'O.Reg.199/07' | 'O.Reg.555/06' | 'TDG Act' | 'NSC';
  shortDescription: string;
}

// Bidirectional mapping: key = violation code, value = equivalent in other jurisdiction
export const REGULATORY_CROSS_REFERENCE: Record<string, RegulatoryEquivalent> = {
  // CSA → CVOR equivalents
  "393.48(a)":        { code: "O.Reg.199/07 s.6(1)", source: "O.Reg.199/07", shortDescription: "Brake system defective" },
  "396.3(a)1BOS":     { code: "O.Reg.199/07 s.6(2)", source: "O.Reg.199/07", shortDescription: "≥20% brakes below standard" },
  "393.47A-BSF":      { code: "O.Reg.199/07 s.6(3)", source: "O.Reg.199/07", shortDescription: "Brake overheating/smoke" },
  "393.45D-BAAL":     { code: "O.Reg.199/07 s.11",   source: "O.Reg.199/07", shortDescription: "Air brake audible leak" },
  "393.47(e)":        { code: "O.Reg.199/07 s.7",     source: "O.Reg.199/07", shortDescription: "Brake adjustment" },
  "393.45B2-B":       { code: "O.Reg.199/07 s.10",    source: "O.Reg.199/07", shortDescription: "Brake hose/tubing damage" },
  "393.45B2-BHTD":    { code: "O.Reg.199/07 s.10(2)", source: "O.Reg.199/07", shortDescription: "Brake hose reinforcement damage" },
  "396.3A1-BALR":     { code: "O.Reg.199/07 s.11(2)", source: "O.Reg.199/07", shortDescription: "Air loss rate failure" },
  "393.53(b)":        { code: "O.Reg.199/07 s.8",     source: "O.Reg.199/07", shortDescription: "Auto adjustment failure" },
  "393.48A-BMBC":     { code: "O.Reg.199/07 s.6(4)",  source: "O.Reg.199/07", shortDescription: "Missing brake components" },
  "393.48A-BMBCBD":   { code: "O.Reg.199/07 s.6(5)",  source: "O.Reg.199/07", shortDescription: "Drum brake components missing" },
  "393.47(d)":        { code: "O.Reg.199/07 s.5",     source: "O.Reg.199/07", shortDescription: "No brakes as required" },
  "393.9(a)":         { code: "HTA s.64(1)",           source: "Ontario HTA",  shortDescription: "Inoperative brake lamps" },
  "393.9A-LCL":       { code: "HTA s.62(17)",          source: "Ontario HTA",  shortDescription: "Clearance lamps inoperative" },
  "393.9A-LSLI":      { code: "HTA s.64(1)",           source: "Ontario HTA",  shortDescription: "Stop lamps inoperative" },
  "393.9A-LRLI":      { code: "HTA s.62(1)",           source: "Ontario HTA",  shortDescription: "Tail lamp inoperative" },
  "393.9A-LHLI":      { code: "HTA s.62(2)",           source: "Ontario HTA",  shortDescription: "Headlamp inoperative" },
  "393.9A-LTIL":      { code: "HTA s.142(7)",          source: "Ontario HTA",  shortDescription: "Turn signal inoperative" },
  "393.9A-LSML":      { code: "HTA s.62(18)",          source: "Ontario HTA",  shortDescription: "Side marker inoperative" },
  "393.9A-LLPL":      { code: "HTA s.62(19)",          source: "Ontario HTA",  shortDescription: "Licence plate lamp" },
  "393.9A-LIL":       { code: "HTA s.62(16)",          source: "Ontario HTA",  shortDescription: "Identification lamp" },
  "393.9A-HLLH":      { code: "HTA s.62(3)",           source: "Ontario HTA",  shortDescription: "High/low beam failure" },
  "393.75(a)(1)":     { code: "HTA s.78(2)",           source: "Ontario HTA",  shortDescription: "Flat tire/fabric exposed" },
  "393.75C":          { code: "HTA s.78(1)",           source: "Ontario HTA",  shortDescription: "Tire tread depth" },
  "393.75(a)(3)":     { code: "HTA s.78(3)",           source: "Ontario HTA",  shortDescription: "Belt/ply material exposed" },
  "393.75(a)(4)":     { code: "HTA s.78(4)",           source: "Ontario HTA",  shortDescription: "Sidewall separation" },
  "393.207(a)":       { code: "HTA s.84(2)",           source: "Ontario HTA",  shortDescription: "Frame defective" },
  "393.201(a)":       { code: "HTA s.84(1)",           source: "Ontario HTA",  shortDescription: "Frame cracked/broken" },
  "393.207(b)":       { code: "HTA s.75(4)",           source: "Ontario HTA",  shortDescription: "Exhaust location" },
  "393.83(a)":        { code: "HTA s.75(3)",           source: "Ontario HTA",  shortDescription: "Exhaust burns/damage" },
  "393.78(b)":        { code: "HTA s.73(1)",           source: "Ontario HTA",  shortDescription: "Windshield condition" },
  "393.78A-WS":       { code: "HTA s.66(3)",           source: "Ontario HTA",  shortDescription: "Washers inoperative" },
  "393.60(b)":        { code: "HTA s.73(2)",           source: "Ontario HTA",  shortDescription: "Windshield glazing" },
  "393.95A1":         { code: "O.Reg.199/07 s.16",     source: "O.Reg.199/07", shortDescription: "Fire extinguisher" },
  "393.95(a)":        { code: "O.Reg.199/07 s.16(1)",  source: "O.Reg.199/07", shortDescription: "Fire extinguisher missing" },
  "393.11A1-CSLRR":   { code: "O.Reg.199/07 s.4(3)",  source: "O.Reg.199/07", shortDescription: "Rear reflective sheeting" },
  "393.11A1-CSURR":   { code: "O.Reg.199/07 s.4(4)",  source: "O.Reg.199/07", shortDescription: "Upper rear sheeting" },
  "393.100(b)(1)":    { code: "HTA s.111(2)",          source: "Ontario HTA",  shortDescription: "Cargo not secured" },
  "393.100(c)":       { code: "HTA s.111(3)",          source: "Ontario HTA",  shortDescription: "Cargo shifting" },
  "393.209(d)":       { code: "HTA s.84(3)",           source: "Ontario HTA",  shortDescription: "Steering components" },
  "393.45DLUV":       { code: "O.Reg.199/07 s.11(3)",  source: "O.Reg.199/07", shortDescription: "Brake connections leaking" },
  "396.3A1-BALAC":    { code: "O.Reg.199/07 s.11(4)",  source: "O.Reg.199/07", shortDescription: "Brake chamber leak" },
  "396.3A1-ALBV":     { code: "O.Reg.199/07 s.11(5)",  source: "O.Reg.199/07", shortDescription: "Brake valve leak" },
  "396.3A1-ALATR":    { code: "O.Reg.199/07 s.11(6)",  source: "O.Reg.199/07", shortDescription: "Air tank reservoir leak" },
  "396.5(b)":         { code: "O.Reg.199/07 s.14",     source: "O.Reg.199/07", shortDescription: "Oil/grease leak" },
  "396.5B-L":         { code: "O.Reg.199/07 s.14(1)",  source: "O.Reg.199/07", shortDescription: "Lubrication leak" },
  "395.3(a)(1)":      { code: "O.Reg.555/06 s.8(1)",   source: "O.Reg.555/06", shortDescription: "Daily driving limit" },
  "395.3(a)(2)":      { code: "O.Reg.555/06 s.8(2)",   source: "O.Reg.555/06", shortDescription: "Daily duty limit" },
  "395.3(b)(2)":      { code: "O.Reg.555/06 s.9(1)",   source: "O.Reg.555/06", shortDescription: "Cycle hour limit" },
  "395.8(a)":         { code: "O.Reg.555/06 s.13(1)",  source: "O.Reg.555/06", shortDescription: "Daily log records" },
  "395.8(e)":         { code: "O.Reg.555/06 s.13(4)",  source: "O.Reg.555/06", shortDescription: "False log records" },
  "395.8(k)(2)":      { code: "O.Reg.555/06 s.13(3)",  source: "O.Reg.555/06", shortDescription: "Insufficient log data" },
  "395.22(b)":        { code: "O.Reg.555/06 s.15(1)",  source: "O.Reg.555/06", shortDescription: "ELD registration" },
  "395.22H4":         { code: "O.Reg.555/06 s.15(2)",  source: "O.Reg.555/06", shortDescription: "ELD graph-grids" },
  "395.24(d)":        { code: "O.Reg.555/06 s.16(1)",  source: "O.Reg.555/06", shortDescription: "Produce ELD records" },
  "395.24D-ELDPT":    { code: "O.Reg.555/06 s.16(2)",  source: "O.Reg.555/06", shortDescription: "Transfer ELD records" },
  "395.30(b)":        { code: "O.Reg.555/06 s.10(1)",  source: "O.Reg.555/06", shortDescription: "Mandatory break" },
  "391.41(a)":        { code: "HTA s.32(2)",            source: "Ontario HTA",  shortDescription: "Medical certificate" },
  "391.11(a)":        { code: "HTA s.32(1)",            source: "Ontario HTA",  shortDescription: "Valid licence class" },
  "392.2-SLSP":       { code: "HTA s.128(1)",           source: "Ontario HTA",  shortDescription: "Speeding" },
  "392.2-SLML":       { code: "HTA s.154(1)",           source: "Ontario HTA",  shortDescription: "Failure to maintain lane" },
  "392.2-SLSB":       { code: "HTA s.106(2)",           source: "Ontario HTA",  shortDescription: "Seat belt" },
  "392.2-SLDUI":      { code: "Criminal Code s.320.14", source: "NSC",          shortDescription: "Impaired driving" },
  "397.7(a)":         { code: "TDG s.7.1(1)",           source: "TDG Act",      shortDescription: "DG vehicle parking" },
  "397.19(a)":        { code: "TDG s.14(1)",            source: "TDG Act",      shortDescription: "DG documents" },
  "382.115(a)":       { code: "O.Reg.340/94 s.3(1)",    source: "O.Reg.199/07", shortDescription: "Drug/alcohol testing program" },

  // CVOR → CSA equivalents (reverse mapping)
  "O.Reg.199/07 s.6(1)":  { code: "393.48(a)",       source: "FMCSA", shortDescription: "Inoperative/defective brakes" },
  "O.Reg.199/07 s.6(2)":  { code: "396.3(a)1BOS",    source: "FMCSA", shortDescription: "≥20% service brakes defective" },
  "O.Reg.199/07 s.6(3)":  { code: "393.47A-BSF",     source: "FMCSA", shortDescription: "Brake smoke/fire" },
  "O.Reg.199/07 s.11":    { code: "393.45D-BAAL",    source: "FMCSA", shortDescription: "Air brake audible leak" },
  "HTA s.62(17)":          { code: "393.9A-LCL",      source: "FMCSA", shortDescription: "Clearance lamps inoperative" },
  "HTA s.84(2)":           { code: "393.207(a)",      source: "FMCSA", shortDescription: "Frame defective" },
  "HTA s.84(1)":           { code: "393.201(a)",      source: "FMCSA", shortDescription: "Frame cracked/broken" },
  "HTA s.128(1)":          { code: "392.2-SLSP",      source: "FMCSA", shortDescription: "Speeding violation" },
  "HTA s.32(1)":           { code: "391.11(a)",       source: "FMCSA", shortDescription: "Invalid CDL class" },
  "HTA s.32(2)":           { code: "391.41(a)",       source: "FMCSA", shortDescription: "No medical certificate" },
  "HTA s.64(1)":           { code: "393.9A-LSLI",     source: "FMCSA", shortDescription: "Stop lamps inoperative" },
  "HTA s.62(1)":           { code: "393.9A-LRLI",     source: "FMCSA", shortDescription: "Tail lamp inoperative" },
  "HTA s.66(3)":           { code: "393.78A-WS",      source: "FMCSA", shortDescription: "Washers inoperative" },
  "HTA s.78(2)":           { code: "393.75(a)(1)",    source: "FMCSA", shortDescription: "Flat tire/fabric exposed" },
  "HTA s.78(1)":           { code: "393.75C",         source: "FMCSA", shortDescription: "Tire tread depth" },
  "TDG s.7.1(1)":          { code: "397.7(a)",        source: "FMCSA", shortDescription: "HM vehicle parking" },
  "TDG s.14(1)":           { code: "397.19(a)",       source: "FMCSA", shortDescription: "HM documents missing" },
  "O.Reg.555/06 s.8(1)":   { code: "395.3(a)(1)",    source: "FMCSA", shortDescription: "Daily driving limit" },
  "O.Reg.555/06 s.8(2)":   { code: "395.3(a)(2)",    source: "FMCSA", shortDescription: "Daily duty limit" },
  "O.Reg.555/06 s.13(1)":  { code: "395.8(a)",       source: "FMCSA", shortDescription: "Log records retention" },
  "O.Reg.555/06 s.13(4)":  { code: "395.8(e)",       source: "FMCSA", shortDescription: "False log records" },
  "Criminal Code s.320.14": { code: "392.2-SLDUI",   source: "FMCSA", shortDescription: "Impaired driving" },
};

// Helper to get equivalent code for a violation
export function getEquivalentCode(violationCode: string): RegulatoryEquivalent | null {
  return REGULATORY_CROSS_REFERENCE[violationCode] || null;
}

// --- BASIC MEASURE HISTORY (6 months of carrier measure snapshots) ---
export const basicMeasureHistory: Record<string, { date: string; measure: number }[]> = {
  "Unsafe Driving": [
    { date: "2025-08-29", measure: 2.17 },
    { date: "2025-09-26", measure: 2.07 },
    { date: "2025-10-31", measure: 2.15 },
    { date: "2025-11-28", measure: 1.83 },
    { date: "2025-12-26", measure: 2.07 },
    { date: "2026-01-30", measure: 1.93 },
  ],
  "Hours-of-service Compliance": [
    { date: "2025-08-29", measure: 1.05 },
    { date: "2025-09-26", measure: 0.92 },
    { date: "2025-10-31", measure: 0.88 },
    { date: "2025-11-28", measure: 0.95 },
    { date: "2025-12-26", measure: 0.88 },
    { date: "2026-01-30", measure: 0.88 },
  ],
  "Vehicle Maintenance": [
    { date: "2025-08-29", measure: 18.5 },
    { date: "2025-09-26", measure: 20.1 },
    { date: "2025-10-31", measure: 21.3 },
    { date: "2025-11-28", measure: 22.8 },
    { date: "2025-12-26", measure: 23.5 },
    { date: "2026-01-30", measure: 24.0 },
  ],
  "Controlled Substances": [
    { date: "2025-08-29", measure: 0 },
    { date: "2025-09-26", measure: 0 },
    { date: "2025-10-31", measure: 0 },
    { date: "2025-11-28", measure: 0 },
    { date: "2025-12-26", measure: 0 },
    { date: "2026-01-30", measure: 0 },
  ],
  "Driver Fitness": [
    { date: "2025-08-29", measure: 0 },
    { date: "2025-09-26", measure: 0 },
    { date: "2025-10-31", measure: 0 },
    { date: "2025-11-28", measure: 0 },
    { date: "2025-12-26", measure: 0 },
    { date: "2026-01-30", measure: 0 },
  ],
};

// --- SINGLE CARRIER DATA ---
export const carrierProfile = {
  id: "2789727",
  cvor: "1718593-ON",
  name: "ROYAL ROADLINES LTD",
  address: "77 CHALKFARM CRES, BRAMPTON, ON L7A 3V9",
  vehicles: 5,
  drivers: 5,
  rating: "Not Rated",
  oosRates: {
    vehicle: { carrier: "40.0%", national: "23.2%" },
    driver: { carrier: "0.0%", national: "6.4%" },
    hazmat: { carrier: "N/A", national: "4.4%" }
  },
  licensing: {
    property: { active: "Yes", mc: "MC1718593" },
    passenger: { active: "No", mc: "-" },
    household: { active: "No", mc: "-" },
    broker: { active: "No", mc: "-" }
  },
  basicStatus: [
    { category: "Unsafe Driving", measure: "1.38", percentile: "N/A", alert: false, details: "< 3 driver inspections with violations" },
    { category: "Crash Indicator", measure: "0.13", percentile: "N/A", alert: false, details: "1 crash included in SMS" },
    { category: "Hours-of-service Compliance", measure: "0.88", percentile: "N/A", alert: false, details: "2 driver inspections with violations" },
    { category: "Vehicle Maintenance", measure: "24", percentile: "99%", alert: true, details: "5 inspections with violations (Avg PU×UF: 7.2)" },
    { category: "Controlled Substances", measure: "0", percentile: "0%", alert: false, details: "No violations" },
    { category: "Hazmat compliance", measure: "0", percentile: "0%", alert: false, details: "No HM placardable inspections" },
    { category: "Driver Fitness", measure: "0", percentile: "N/A", alert: false, details: "No violations" },
    { category: "Others", measure: "0", percentile: "0%", alert: false, details: "No violations" },
  ],
  cvorAnalysis: {
    rating: 58.19,
    collisions: { percentage: 19.06, weight: 40 },
    convictions: { percentage: 21.56, weight: 40 },
    inspections: { percentage: 17.57, weight: 20 },
    counts: {
        collisions: 5,
        convictions: 9,
        oosOverall: 28.12,
        oosVehicle: 33.33,
        oosDriver: 3.12,
        trucks: 20,
        // Canada miles breakdown
        onMiles: 16388058,
        canadaMiles: 666469,
        totalCanadaMiles: 17054528,
        // USA miles breakdown
        miMiles: 3242100,
        nyMiles: 1185460,
        paMiles: 892340,
        ohMiles: 754200,
        totalUSMiles: 6074100,
        // Combined total
        totalMiles: 23128628,
        // Per-period miles (keyed by period label)
        milesByPeriod: {
          '1M':  { onMiles: 1342580, canadaMiles: 53120, totalCanadaMiles: 1395700, miMiles: 268320, nyMiles: 97850, paMiles: 74600, ohMiles: 62100, totalUSMiles: 502870, totalMiles: 1898570 },
          '3M':  { onMiles: 4012740, canadaMiles: 162400, totalCanadaMiles: 4175140, miMiles: 812640, nyMiles: 296380, paMiles: 223060, ohMiles: 188550, totalUSMiles: 1520630, totalMiles: 5695770 },
          '6M':  { onMiles: 8195030, canadaMiles: 333235, totalCanadaMiles: 8528265, miMiles: 1621050, nyMiles: 592730, paMiles: 446170, ohMiles: 377100, totalUSMiles: 3037050, totalMiles: 11565315 },
          '12M': { onMiles: 12407962, canadaMiles: 3372498, totalCanadaMiles: 15780460, miMiles: 2430750, nyMiles: 889080, paMiles: 669255, ohMiles: 565650, totalUSMiles: 4554735, totalMiles: 20335195 },
          '24M': { onMiles: 16388058, canadaMiles: 666469, totalCanadaMiles: 17054528, miMiles: 3242100, nyMiles: 1185460, paMiles: 892340, ohMiles: 754200, totalUSMiles: 6074100, totalMiles: 23128628 },
        },
        collisionPointsWithPoints: 5,
        collisionPointsWithoutPoints: 0,
        totalCollisionPoints: 10,
        convictionPoints: 26,
    },
    // Granular collision breakdown (CVOR PDF "Collision Details" section)
    collisionDetails: {
      fromDate: '2024-01-27',
      toDate: '2026-01-26',
      monthsLabel: '24 Months',
      withPoints: 8,
      fatal: 0,
      personalInjury: 2,
      propertyDamage: 11,
      notPointed: 5,
      total: 13,
    },
    // Granular conviction breakdown (CVOR PDF "Conviction Details" section)
    convictionDetails: {
      fromDate: '2024-01-27',
      toDate: '2026-01-26',
      monthsLabel: '24 Months',
      withPoints: 24,
      driver: 16,
      vehicle: 7,
      load: 4,
      other: 2,
      notPointed: 5,
      total: 29,
    },
  }
};


// --- INSPECTION DATA (Unified SMS + CVOR) ---
// All inspections share these optional fields:
// startTime/endTime: inspection time window
// driverLicense: driver licence number
// location: { city, province, raw }
// smsPoints: { vehicle, driver, carrier } - SMS/CSA point breakdown (US inspections)
// cvorPoints: { vehicle, driver, cvor } - CVOR point breakdown (Canadian inspections)
// powerUnitDefects / trailerDefects: defect summaries
// severityRate: average violation severity for this inspection
export const inspectionsData = [
  {
    id: "MIGRAHA00829",
    date: "2026-02-06",
    state: "MI",
    driverId: "DRV-2001",
    driver: "John Smith",
    driverLicense: "S530-4120-6789",
    vehiclePlate: "P-7762",
    vehicleType: "Truck",
    assetId: "a1",
    level: "Level 1",
    startTime: "09:30",
    endTime: "11:15",
    location: { city: "GRAND HAVEN", province: "MI", raw: "GRAND HAVEN, MI" },
    smsPoints: { vehicle: 117, driver: 9, carrier: 126 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES DEFECTIVE, AIR LEAK, HOSE DAMAGE, DRUM COMPONENTS",
    trailerDefects: "LIGHTING INOPERATIVE, REFLECTIVE SHEETING",
    severityRate: 8.5,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Freightliner", license: "P-7762", vin: "1M8GDM9A6HP05X12" },
      { type: "SEMI-TRAILER", make: "WAB", license: "T99887 (TX)", vin: "4N2AA062X8W701203" }
    ],
    violationSummary: {
      "Vehicle Maintenance": 15,
      "Hours-of-service Compliance": 1
    },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 4 },
    violations: [
      { code: "396.3(a)1BOS", category: "Vehicle Maintenance", description: "Brake - Defective brakes >= 20% of service brakes on combo", subDescription: "Brakes", severity: 0, weight: 3, points: 0, oos: true, driverRiskCategory: 1 },
      { code: "393.47A-BSF", category: "Vehicle Maintenance", description: "Brake malfunction causing smoke/fire from wheel end", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "393.9A-LCL", category: "Vehicle Maintenance", description: "Lighting - Clearance lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.9A-LSML", category: "Vehicle Maintenance", description: "Lighting - Side marker lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.45B2-B", category: "Vehicle Maintenance", description: "Air Brake - Hose/tubing damaged or not secured", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.45D-BAAL", category: "Vehicle Maintenance", description: "Air Brake - Audible air leak at other than a proper connection", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "393.45B2-BHTD", category: "Vehicle Maintenance", description: "Air Brake - Hose damage into the outer reinforcement ply", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "393.78A-WS", category: "Vehicle Maintenance", description: "Washers - Inoperative washing system", subDescription: "Visibility", severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 },
      { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", subDescription: "Conspicuity", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "396.3A1-BALR", category: "Vehicle Maintenance", description: "Air Brake - Fails air loss rate test", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "396.3A1-BALAC", category: "Vehicle Maintenance", description: "Brake - Audible air leak from a brake chamber", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "396.3A1-ALBV", category: "Vehicle Maintenance", description: "Air Brake - Any leak from a brake valve", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "396.3A1-ALATR", category: "Vehicle Maintenance", description: "Air Brake - Any leak from an air tank reservoir", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "396.5B-L", category: "Vehicle Maintenance", description: "Lubrication - Oil or grease leak", subDescription: "Fluid Leaks", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "395.24D-ELDPT", category: "Hours-of-service Compliance", description: "Failure to produce and transfer ELD records on request", subDescription: "Log Data", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.48A-BMBCBD", category: "Vehicle Maintenance", description: "Drum Brake - Missing/broken component(s)", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 1 },
      { code: "393.47(e)", category: "Vehicle Maintenance", description: "Brake Out of Adjustment", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "MIHOULD04386",
    date: "2026-01-07",
    state: "MI",
    driverId: "DRV-2002",
    driver: "Sarah Miller",
    driverLicense: "M460-2287-3456",
    vehiclePlate: "ABC-1234",
    vehicleType: "Trailer",
    assetId: "a2",
    level: "Level 2",
    startTime: "14:20",
    endTime: "15:05",
    location: { city: "HOULTON", province: "MI", raw: "HOULTON, MI" },
    smsPoints: { vehicle: 39, driver: 0, carrier: 39 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: "LIGHTING DEFECTS, REFLECTIVE SHEETING",
    severityRate: 3.25,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Trailer", make: "Kenworth", license: "ABC-1234", vin: "1A2B3C4D5E6F7G8H9" }
    ],
    violationSummary: { "Vehicle Maintenance": 4 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.9A-LLPL", category: "Vehicle Maintenance", description: "Lighting - License plate lamp inoperative", subDescription: "Lighting Details", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", subDescription: "Reflective Gear", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.9A-LSLI", category: "Vehicle Maintenance", description: "Lighting - Stop lamps inoperative", subDescription: "Lighting Details", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.9A-LIL", category: "Vehicle Maintenance", description: "Lighting - Identification lamp(s) inoperative", subDescription: "Lighting Details", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 }
    ]
  },
  {
    id: "MIGRAHA00796",
    date: "2025-12-26",
    state: "MI",
    driverId: "DRV-1001",
    driver: "James Sullivan",
    driverLicense: "S840-5567-1234",
    vehiclePlate: "TANK-01",
    vehicleType: "Truck",
    assetId: "a6",
    level: "Level 2",
    startTime: "07:45",
    endTime: "09:10",
    location: { city: "GRAND HAVEN", province: "MI", raw: "GRAND HAVEN, MI" },
    smsPoints: { vehicle: 96, driver: 18, carrier: 114 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "LIGHTING, AIR BRAKES, REFLECTIVE SHEETING",
    trailerDefects: null,
    severityRate: 4.56,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Mack", license: "TANK-01", vin: "2FMZA5147XBA98765" }
    ],
    violationSummary: { "Vehicle Maintenance": 7, "Hours-of-service Compliance": 1, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", subDescription: "Conspicuity", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.9A-LCL", category: "Vehicle Maintenance", description: "Lighting - Clearance lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.9A-LRLI", category: "Vehicle Maintenance", description: "Lighting - Tail lamp inoperative", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.9A-LHLI", category: "Vehicle Maintenance", description: "Lighting - Headlamp(s) inoperative", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "395.22H4", category: "Hours-of-service Compliance", description: "ELD: Missing blank duty status graph-grids (min 8 days)", subDescription: "Log Data", severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 },
      { code: "392.2-SLML", category: "Unsafe Driving", description: "State/Local Laws - Failure to maintain lane", subDescription: "Moving Violation", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 1 },
      { code: "393.9A-HLLH", category: "Vehicle Maintenance", description: "Headlamp(s) fail to operate on low and high beam", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.45B2-B", category: "Vehicle Maintenance", description: "Air brake hose damaged or not secured", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.11A1-CSURR", category: "Vehicle Maintenance", description: "Upper rear retro-reflective sheeting missing", subDescription: "Conspicuity", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "MICOPEK02915",
    date: "2025-10-28",
    state: "MI",
    driverId: "DRV-1002",
    driver: "Maria Rodriguez",
    driverLicense: "R300-8834-5678",
    vehiclePlate: "COLD-88",
    vehicleType: "Trailer",
    assetId: "a5",
    level: "Level 3",
    startTime: "13:10",
    endTime: "13:35",
    location: { city: "COOPERSVILLE", province: "MI", raw: "COOPERSVILLE, MI" },
    smsPoints: { vehicle: 0, driver: 0, carrier: 0 },
    isClean: true,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Trailer", make: "Great Dane", license: "COLD-88", vin: "5NPE24AF8FH123456" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: []
  },
  {
    id: "MICOPEK02873",
    date: "2025-10-08",
    state: "MI",
    driverId: "DRV-2003",
    driver: "Mike Johnson",
    driverLicense: "J525-1143-7890",
    vehiclePlate: "WRK-4422",
    vehicleType: "Non-CMV Vehicle",
    assetId: "a4",
    level: "Level 2",
    startTime: "10:00",
    endTime: "10:45",
    location: { city: "COOPERSVILLE", province: "MI", raw: "COOPERSVILLE, MI" },
    smsPoints: { vehicle: 48, driver: 0, carrier: 48 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "TIRES, LIGHTING, FIRE EXTINGUISHER",
    trailerDefects: null,
    severityRate: 5.33,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Non-CMV Vehicle", make: "Chevrolet", license: "WRK-4422", vin: "1GC4KYEY9KF192847" }
    ],
    violationSummary: { "Vehicle Maintenance": 3 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.9A-LRLI", category: "Vehicle Maintenance", description: "Lighting - Tail lamp inoperative", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.75C", category: "Vehicle Maintenance", description: "Tires - Less than 2/32 inch tread depth", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 },
      { code: "393.95A1", category: "Vehicle Maintenance", description: "Fire Extinguisher missing or not properly rated", subDescription: "Emergency Eq", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 }
    ]
  },
  {
    id: "ILCHICG10001",
    date: "2025-10-12",
    state: "IL",
    driverId: "DRV-1001",
    driver: "James Sullivan",
    driverLicense: "S853-7721-5566",
    vehiclePlate: "TRK-8812",
    vehicleType: "Truck Tractor",
    assetId: "a1",
    level: "Level 1",
    startTime: "08:15",
    endTime: "10:30",
    location: { city: "CHICAGO", province: "IL", raw: "CHICAGO, IL" },
    smsPoints: { vehicle: 96, driver: 54, carrier: 150 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES OOS, AIR BRAKE DEFECTS, LIGHTING",
    trailerDefects: null,
    severityRate: 6.25,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [{ type: "Truck Tractor", make: "Freightliner", license: "TRK-8812", vin: "1FUJGEDV5CLBP8411" }],
    violationSummary: { "Vehicle Maintenance": 5, "Hours-of-service Compliance": 2 },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 2 },
    violations: [
      { code: "393.48(a)", category: "Vehicle Maintenance", description: "Brake system defective or not maintained", subDescription: "Brakes", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 },
      { code: "396.3A1-BALR", category: "Vehicle Maintenance", description: "Air Brake - Fails air loss rate test", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "393.47(e)", category: "Vehicle Maintenance", description: "Brake Out of Adjustment", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.75C", category: "Vehicle Maintenance", description: "Tires - Less than 2/32 inch tread depth", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 },
      { code: "393.9A-LSLI", category: "Vehicle Maintenance", description: "Lighting - Stop lamps inoperative", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "395.3(a)(1)", category: "Hours-of-service Compliance", description: "HOS - Driving beyond daily driving limit", subDescription: "Driving Time", severity: 7, weight: 3, points: 21, oos: false, driverRiskCategory: 1 },
      { code: "395.8(a)", category: "Hours-of-service Compliance", description: "HOS - Failure to keep required ELD/log records", subDescription: "Records", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "PAHARRS10002",
    date: "2025-10-22",
    state: "PA",
    driverId: "DRV-1002",
    driver: "Maria Rodriguez",
    driverLicense: "R300-4421-9988",
    vehiclePlate: "FLEET-22",
    vehicleType: "Truck Tractor",
    assetId: "a2",
    level: "Level 2",
    startTime: "13:00",
    endTime: "14:15",
    location: { city: "HARRISBURG", province: "PA", raw: "HARRISBURG, PA" },
    smsPoints: { vehicle: 87, driver: 0, carrier: 87 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "STEERING, BRAKES, OIL LEAK, LIGHTING",
    trailerDefects: "LIGHTING",
    severityRate: 5.50,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [{ type: "Truck Tractor", make: "Kenworth", license: "FLEET-22", vin: "2NP2HM7X9KM600123" }],
    violationSummary: { "Vehicle Maintenance": 5 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.209(d)", category: "Vehicle Maintenance", description: "Steering system components worn/missing", subDescription: "Steering", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.45D-BAAL", category: "Vehicle Maintenance", description: "Air Brake - Audible air leak", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "396.5B-L", category: "Vehicle Maintenance", description: "Lubrication - Oil or grease leak", subDescription: "Fluid Leaks", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.9A-LCL", category: "Vehicle Maintenance", description: "Lighting - Clearance lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.9A-LTIL", category: "Vehicle Maintenance", description: "Lighting - Turn signal lamp inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 }
    ]
  },
  {
    id: "TXDALLA10003",
    date: "2025-11-03",
    state: "TX",
    driverId: "DRV-2001",
    driver: "John Smith",
    driverLicense: "S625-3392-4477",
    vehiclePlate: "DAL-9901",
    vehicleType: "Truck Tractor",
    assetId: "a5",
    level: "Level 1",
    startTime: "07:30",
    endTime: "09:45",
    location: { city: "DALLAS", province: "TX", raw: "DALLAS, TX" },
    smsPoints: { vehicle: 66, driver: 30, carrier: 96 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "BRAKES, CARGO SECUREMENT",
    trailerDefects: "CARGO SECUREMENT",
    severityRate: 5.33,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [{ type: "Truck Tractor", make: "Peterbilt", license: "DAL-9901", vin: "1XPBD49X1ND780214" }],
    violationSummary: { "Vehicle Maintenance": 3, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.48(a)", category: "Vehicle Maintenance", description: "Brake system defective or not maintained", subDescription: "Brakes", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 },
      { code: "393.45B2-B", category: "Vehicle Maintenance", description: "Air Brake - Hose/tubing damaged or not secured", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", subDescription: "Conspicuity", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "392.2", category: "Unsafe Driving", description: "Failure to obey traffic control device", subDescription: "Traffic Laws", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "MIGRAHA00524",
    date: "2025-04-10",
    state: "MI",
    driverId: "DRV-2004",
    driver: "Elena Rodriguez",
    driverLicense: "R300-4421-2345",
    vehiclePlate: "HAUL-55",
    vehicleType: "Truck",
    assetId: "a3",
    level: "Level 1",
    startTime: "16:20",
    endTime: "18:00",
    location: { city: "GRAND HAVEN", province: "MI", raw: "GRAND HAVEN, MI" },
    smsPoints: { vehicle: 117, driver: 0, carrier: 117 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES, STEERING, AIR BRAKES, OIL LEAK",
    trailerDefects: null,
    severityRate: 4.33,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Peterbilt", license: "HAUL-55", vin: "3GCP51C9XKG192837" }
    ],
    violationSummary: { "Vehicle Maintenance": 9 },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 1 },
    violations: [
      { code: "393.209(d)", category: "Vehicle Maintenance", description: "Steering system components worn/welded/missing", subDescription: "Steering", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.53(b)", category: "Vehicle Maintenance", description: "Auto airbrake adjustment system fails to compensate", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.45(b)(2)", category: "Vehicle Maintenance", description: "Brake hose/tubing chafing and/or kinking", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "396.5(b)", category: "Vehicle Maintenance", description: "Oil and/or grease leak", subDescription: "Fluid Leaks", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 },
      { code: "393.48(a)", category: "Vehicle Maintenance", description: "Inoperative/defective brakes", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 1 },
      { code: "393.9(a)", category: "Vehicle Maintenance", description: "Inoperative Brake Lamps", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: true, driverRiskCategory: 1 },
      { code: "393.45DLUV", category: "Vehicle Maintenance", description: "Brake connections with leaks under vehicle", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.48A-BMBC", category: "Vehicle Maintenance", description: "All brakes missing/broken components", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 1 },
      { code: "393.47(e)", category: "Vehicle Maintenance", description: "Brake out of adjustment", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "TXDALLA01247",
    date: "2026-01-22",
    state: "TX",
    driverId: "DRV-1003",
    driver: "Robert Chen",
    driverLicense: "C550-3890-1122",
    vehiclePlate: "BIG-RIG7",
    vehicleType: "Truck",
    assetId: "a7",
    level: "Level 1",
    startTime: "06:15",
    endTime: "08:30",
    location: { city: "DALLAS", province: "TX", raw: "DALLAS, TX" },
    smsPoints: { vehicle: 84, driver: 66, carrier: 150 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "TIRES, CARGO UNSECURED, FRAME/BODY, AIR BRAKES",
    trailerDefects: "TIRES SIDEWALL SEPARATION",
    severityRate: 6.25,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Volvo", license: "BIG-RIG7", vin: "4V4NC9TH5FN612345" },
      { type: "SEMI-TRAILER", make: "Utility", license: "TRL-2288 (TX)", vin: "1JJV532D8FL456789" }
    ],
    violationSummary: { "Vehicle Maintenance": 5, "Unsafe Driving": 1, "Hours-of-service Compliance": 2 },
    oosSummary: { driver: "FAILED", vehicle: "FAILED", total: 3 },
    violations: [
      { code: "395.8(a)", category: "Hours-of-service Compliance", description: "Driver failed to retain previous 7 days records of duty status", subDescription: "Log Records", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 1 },
      { code: "395.3(a)(1)", category: "Hours-of-service Compliance", description: "Driving beyond 11-hour driving limit", subDescription: "HOS Limit", severity: 7, weight: 3, points: 21, oos: true, driverRiskCategory: 1 },
      { code: "392.2-SLDUI", category: "Unsafe Driving", description: "State/Local Laws - Driving under influence of alcohol/drugs", subDescription: "Impairment", severity: 10, weight: 3, points: 30, oos: true, driverRiskCategory: 1 },
      { code: "393.75(a)(1)", category: "Vehicle Maintenance", description: "Flat tire or fabric exposed", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 },
      { code: "393.75(a)(4)", category: "Vehicle Maintenance", description: "Tire-sidewall separation/chunk missing", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 },
      { code: "393.100(b)(1)", category: "Vehicle Maintenance", description: "Cargo not immobilized or secured", subDescription: "Cargo", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 },
      { code: "393.207(a)", category: "Vehicle Maintenance", description: "Cab body components damaged", subDescription: "Frame/Body", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 },
      { code: "393.45(d)", category: "Vehicle Maintenance", description: "Air brake system audible air leak", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "OHCOLMB03891",
    date: "2026-02-01",
    state: "OH",
    driverId: "DRV-1004",
    driver: "Sarah Johnson",
    driverLicense: "J525-8801-9988",
    vehiclePlate: "FLT-409",
    vehicleType: "Truck",
    assetId: "a8",
    level: "Level 2",
    startTime: "11:40",
    endTime: "12:20",
    location: { city: "COLUMBUS", province: "OH", raw: "COLUMBUS, OH" },
    smsPoints: { vehicle: 30, driver: 0, carrier: 30 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "TURN SIGNALS, WINDSHIELD, FRAME",
    trailerDefects: null,
    severityRate: 3.33,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "International", license: "FLT-409", vin: "3HSDJAPR5CN601234" }
    ],
    violationSummary: { "Vehicle Maintenance": 3 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.9A-LTIL", category: "Vehicle Maintenance", description: "Lighting - Turn indicator lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.78(b)", category: "Vehicle Maintenance", description: "Windshield - Cracked/discolored/obstructed", subDescription: "Visibility", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.201(a)", category: "Vehicle Maintenance", description: "Frame cracked/loose/sagging/broken", subDescription: "Frame", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "NYBROOK05612",
    date: "2025-11-15",
    state: "NY",
    driverId: "DRV-1005",
    driver: "Michael Brown",
    driverLicense: "B650-7721-4455",
    vehiclePlate: "NYC-321",
    vehicleType: "Truck",
    assetId: "a9",
    level: "Level 1",
    startTime: "08:00",
    endTime: "10:30",
    location: { city: "BROOKLYN", province: "NY", raw: "BROOKLYN, NY" },
    smsPoints: { vehicle: 78, driver: 36, carrier: 114 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES, EXHAUST, LIGHTING, TIRES",
    trailerDefects: "REFLECTIVE SHEETING",
    severityRate: 4.13,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Kenworth", license: "NYC-321", vin: "5KJJJHDR2FPKA5678" },
      { type: "Trailer", make: "Wabash", license: "WB-9910 (NY)", vin: "1JJV532D0HL890123" },
      { type: "SEMI-TRAILER", make: "Stoughton", license: "STN-445 (IN)", vin: "2HSFHAHT9SC654321" }
    ],
    violationSummary: { "Vehicle Maintenance": 6, "Driver Fitness": 1, "Hours-of-service Compliance": 1 },
    oosSummary: { driver: "FAILED", vehicle: "FAILED", total: 4 },
    violations: [
      { code: "391.41(a)", category: "Driver Fitness", description: "Operating a CMV without a valid medical certificate", subDescription: "Medical", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 1 },
      { code: "395.8(e)", category: "Hours-of-service Compliance", description: "False report of driver's record of duty status", subDescription: "Log Falsification", severity: 7, weight: 3, points: 21, oos: true, driverRiskCategory: 1 },
      { code: "393.47(e)", category: "Vehicle Maintenance", description: "Brake out of adjustment", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.48(a)", category: "Vehicle Maintenance", description: "Inoperative/defective brakes", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "393.207(b)", category: "Vehicle Maintenance", description: "Exhaust system location causing damage", subDescription: "Exhaust", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.9A-LCL", category: "Vehicle Maintenance", description: "Lighting - Clearance lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", subDescription: "Conspicuity", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.75C", category: "Vehicle Maintenance", description: "Tires - Less than 2/32 inch tread depth", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 }
    ]
  },
  {
    id: "ILCHICG07234",
    date: "2025-09-05",
    state: "IL",
    driverId: "DRV-2001",
    driver: "John Smith",
    driverLicense: "S530-4120-6789",
    vehiclePlate: "P-7762",
    vehicleType: "Truck",
    assetId: "a1",
    level: "Level 3",
    startTime: "15:00",
    endTime: "15:30",
    location: { city: "CHICAGO", province: "IL", raw: "CHICAGO, IL" },
    smsPoints: { vehicle: 0, driver: 21, carrier: 21 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 2.33,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Freightliner", license: "P-7762", vin: "1M8GDM9A6HP05X12" }
    ],
    violationSummary: { "Hours-of-service Compliance": 2, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "395.22(b)", category: "Hours-of-service Compliance", description: "ELD not registered with FMCSA", subDescription: "ELD", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "395.24(d)", category: "Hours-of-service Compliance", description: "Failure to produce ELD records on request", subDescription: "Log Data", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "392.2-SLSB", category: "Unsafe Driving", description: "State/Local Laws - Failure to use seat belt", subDescription: "Safety Belt", severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 }
    ]
  },
  {
    id: "ININDPLS08891",
    date: "2025-08-18",
    state: "IN",
    driverId: "DRV-2002",
    driver: "Sarah Miller",
    driverLicense: "M460-2287-3456",
    vehiclePlate: "ABC-1234",
    vehicleType: "Trailer",
    assetId: "a2",
    level: "Level 2",
    startTime: "09:15",
    endTime: "09:40",
    location: { city: "INDIANAPOLIS", province: "IN", raw: "INDIANAPOLIS, IN" },
    smsPoints: { vehicle: 0, driver: 0, carrier: 0 },
    isClean: true,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Trailer", make: "Kenworth", license: "ABC-1234", vin: "1A2B3C4D5E6F7G8H9" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: []
  },
  {
    id: "PAHARRS09102",
    date: "2025-07-30",
    state: "PA",
    driverId: "DRV-1002",
    driver: "Maria Rodriguez",
    driverLicense: "R300-8834-5678",
    vehiclePlate: "COLD-88",
    vehicleType: "Trailer",
    assetId: "a5",
    level: "Level 1",
    startTime: "05:30",
    endTime: "07:15",
    location: { city: "HARRISBURG", province: "PA", raw: "HARRISBURG, PA" },
    smsPoints: { vehicle: 51, driver: 36, carrier: 87 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: null,
    trailerDefects: "LIGHTING, AIR BRAKES, CARGO, WINDSHIELD",
    severityRate: 4.83,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Trailer", make: "Great Dane", license: "COLD-88", vin: "5NPE24AF8FH123456" },
      { type: "SEMI-TRAILER", make: "Hyundai Translead", license: "HT-5501 (PA)", vin: "3H3V532D3JL567890" }
    ],
    violationSummary: { "Vehicle Maintenance": 4, "Controlled Substances": 1, "Hours-of-service Compliance": 1 },
    oosSummary: { driver: "FAILED", vehicle: "PASSED", total: 1 },
    violations: [
      { code: "382.115(a)", category: "Controlled Substances", description: "Failing to implement an alcohol and/or controlled substance testing program", subDescription: "Drug Testing", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 1 },
      { code: "395.3(a)(2)", category: "Hours-of-service Compliance", description: "Driving beyond 14-hour duty limit", subDescription: "HOS Limit", severity: 7, weight: 3, points: 21, oos: false, driverRiskCategory: 1 },
      { code: "393.9A-LRLI", category: "Vehicle Maintenance", description: "Lighting - Tail lamp inoperative", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.45B2-B", category: "Vehicle Maintenance", description: "Air Brake - Hose/tubing damaged or not secured", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.100(c)", category: "Vehicle Maintenance", description: "Failure to prevent cargo shifting", subDescription: "Cargo", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.60(b)", category: "Vehicle Maintenance", description: "Glazing in lower half of windshield has damage", subDescription: "Visibility", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 }
    ]
  },
  {
    id: "FLJACKV10445",
    date: "2025-06-12",
    state: "FL",
    driverId: "DRV-2003",
    driver: "Mike Johnson",
    driverLicense: "J525-1143-7890",
    vehiclePlate: "WRK-4422",
    vehicleType: "Non-CMV Vehicle",
    assetId: "a4",
    level: "Level 2",
    startTime: "12:30",
    endTime: "13:05",
    location: { city: "JACKSONVILLE", province: "FL", raw: "JACKSONVILLE, FL" },
    smsPoints: { vehicle: 24, driver: 0, carrier: 24 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "STOP LAMPS, FIRE EXTINGUISHER",
    trailerDefects: null,
    severityRate: 4.0,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Non-CMV Vehicle", make: "Chevrolet", license: "WRK-4422", vin: "1GC4KYEY9KF192847" }
    ],
    violationSummary: { "Vehicle Maintenance": 2 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.9A-LSLI", category: "Vehicle Maintenance", description: "Lighting - Stop lamps inoperative", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.95(a)", category: "Vehicle Maintenance", description: "No/discharged/unsecured fire extinguisher", subDescription: "Emergency Eq", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 }
    ]
  },
  {
    id: "ONCALGR11738",
    date: "2026-01-30",
    state: "ON",
    driverId: "DRV-1001",
    driver: "James Sullivan",
    driverLicense: "PA72341",
    driverJurisdiction: "CAON",
    vehiclePlate: "TANK-01",
    vehicleType: "Truck",
    assetId: "a6",
    level: "Level 1",
    startTime: "14:15",
    endTime: "15:48",
    location: { city: "HAMILTON", province: "ON", raw: "HAMILTON, ON" },
    cvorPoints: { vehicle: 5, driver: 3, cvor: 8 },
    isClean: false,
    hasOOS: true,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    coDriver: false,
    impoundment: false,
    charged: true,
    categoriesOos: 2,
    totalDefects: 6,
    units: [
      { type: "Truck",   make: "Mack",  license: "TANK-01",      vin: "2FMZA5147XBA98765", jurisdiction: "CAON" },
      { type: "Trailer", make: "Manac", license: "MNC-801 (ON)", vin: "2M5920241MW001234", jurisdiction: "CAON" }
    ],
    tickets: [
      { ticketNumber: "C-2026-0142", issueDate: "2026-01-30", chargedTo: "Driver",  fineAmount: 365, currency: "CAD", offenceCode: "HTA s.128(1)",  offenceDescription: "Speeding 15+ km/h over posted limit", status: "Pending",  courtDate: "2026-04-22" },
      { ticketNumber: "C-2026-0143", issueDate: "2026-01-30", chargedTo: "Carrier", fineAmount: 1210, currency: "CAD", offenceCode: "TDG s.7.1(1)", offenceDescription: "Dangerous goods parked within 5m of travelled roadway", status: "Paid", courtDate: null },
    ],
    violationSummary: { "Vehicle Maintenance": 3, "Hazmat compliance": 2, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 2 },
    powerUnitDefects: "BRAKES DEFECTIVE, CLEARANCE LAMPS, FRAME CONDITION",
    trailerDefects: null,
    severityRate: 4.5,
    violations: [
      { code: "TDG s.7.1(1)", category: "Hazmat compliance", description: "Transporting dangerous goods - vehicle parked within 5m of travelled roadway", subDescription: "DG Parking", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 1 },
      { code: "TDG s.14(1)", category: "Hazmat compliance", description: "No shipping documents or safety marks for dangerous goods transport", subDescription: "DG Documents", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "HTA s.128(1)", category: "Unsafe Driving", description: "Exceeding posted speed limit by 15+ km/h in a designated zone", subDescription: "Speed", severity: 7, weight: 3, points: 21, oos: false, driverRiskCategory: 1 },
      { code: "O.Reg.199/07 s.6(1)", category: "Vehicle Maintenance", description: "Brake system defective - failing to meet performance standards", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "HTA s.62(17)", category: "Vehicle Maintenance", description: "Clearance lamps inoperative on commercial motor vehicle", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "HTA s.84(2)", category: "Vehicle Maintenance", description: "Frame or body cracked, loose or sagging - unsafe condition", subDescription: "Frame", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "CALOSAG12984",
    date: "2025-05-20",
    state: "CA",
    driverId: "DRV-1003",
    driver: "Robert Chen",
    driverLicense: "C550-3890-1122",
    vehiclePlate: "BIG-RIG7",
    vehicleType: "Truck",
    assetId: "a7",
    level: "Level 2",
    startTime: "14:45",
    endTime: "15:10",
    location: { city: "LOS ANGELES", province: "CA", raw: "LOS ANGELES, CA" },
    smsPoints: { vehicle: 0, driver: 0, carrier: 0 },
    isClean: true,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Volvo", license: "BIG-RIG7", vin: "4V4NC9TH5FN612345" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: []
  },
  {
    id: "MIDETRT13556",
    date: "2026-03-14",
    state: "MI",
    driverId: "DRV-1005",
    driver: "Michael Brown",
    driverLicense: "B650-7721-4455",
    vehiclePlate: "DET-777",
    vehicleType: "Truck",
    assetId: "a10",
    level: "Level 1",
    startTime: "06:00",
    endTime: "07:45",
    location: { city: "DETROIT", province: "MI", raw: "DETROIT, MI" },
    smsPoints: { vehicle: 18, driver: 33, carrier: 51 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "SIDE MARKER LAMPS, AIR BRAKE HOSE",
    trailerDefects: null,
    severityRate: 2.6,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Western Star", license: "DET-777", vin: "5KJJJHDR2FPKB9012" },
      { type: "Trailer", make: "Vanguard", license: "VGD-100 (MI)", vin: "1JJV532D5GL345678" }
    ],
    violationSummary: { "Vehicle Maintenance": 2, "Hours-of-service Compliance": 3 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "395.8(k)(2)", category: "Hours-of-service Compliance", description: "ELD - Insufficient data logged", subDescription: "ELD", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "395.30(b)", category: "Hours-of-service Compliance", description: "Failing to take 30-minute break within 8 hours", subDescription: "HOS Break", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "395.3(b)(2)", category: "Hours-of-service Compliance", description: "Driving beyond 60/70-hour limit", subDescription: "HOS Limit", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 1 },
      { code: "393.9A-LSML", category: "Vehicle Maintenance", description: "Lighting - Side marker lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.45B2-BHTD", category: "Vehicle Maintenance", description: "Air Brake - Hose damage into the outer reinforcement ply", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "TXHOUST14201",
    date: "2026-02-28",
    state: "TX",
    driverId: "DRV-2004",
    driver: "Elena Rodriguez",
    driverLicense: "R300-4421-2345",
    vehiclePlate: "HAUL-55",
    vehicleType: "Truck",
    assetId: "a3",
    level: "Level 2",
    startTime: "17:00",
    endTime: "17:40",
    location: { city: "HOUSTON", province: "TX", raw: "HOUSTON, TX" },
    smsPoints: { vehicle: 57, driver: 0, carrier: 57 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "EXHAUST, LIGHTING, BRAKES, TIRES",
    trailerDefects: null,
    severityRate: 4.75,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Peterbilt", license: "HAUL-55", vin: "3GCP51C9XKG192837" }
    ],
    violationSummary: { "Vehicle Maintenance": 4 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.83(a)", category: "Vehicle Maintenance", description: "Exhaust system location causing burns/damage", subDescription: "Exhaust", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "393.9A-LIL", category: "Vehicle Maintenance", description: "Lighting - Identification lamp(s) inoperative", subDescription: "Lighting", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "393.47(d)", category: "Vehicle Maintenance", description: "No brakes as required", subDescription: "Brakes", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "393.75(a)(3)", category: "Vehicle Maintenance", description: "Tire - Body ply or belt material exposed", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 }
    ]
  },
  {
    id: "ONTORON15003",
    date: "2026-02-10",
    state: "ON",
    driverId: "DRV-1004",
    driver: "Sarah Johnson",
    driverLicense: "PA63102",
    driverJurisdiction: "CAON",
    vehiclePlate: "FLT-409",
    vehicleType: "Truck",
    assetId: "a8",
    level: "Level 1",
    startTime: "08:45",
    endTime: "10:20",
    location: { city: "TORONTO", province: "ON", raw: "TORONTO, ON" },
    cvorPoints: { vehicle: 8, driver: 5, cvor: 13 },
    isClean: false,
    hasOOS: true,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    coDriver: false,
    impoundment: true,
    charged: true,
    categoriesOos: 3,
    totalDefects: 10,
    units: [
      { type: "Truck",        make: "International", license: "FLT-409",      vin: "3HSDJAPR5CN601234", jurisdiction: "CAON" },
      { type: "SEMI-TRAILER", make: "Stoughton",     license: "STN-220 (ON)", vin: "2HSFHAHT1SC098765", jurisdiction: "CAON" }
    ],
    tickets: [
      { ticketNumber: "C-2026-0289", issueDate: "2026-02-10", chargedTo: "Driver",  fineAmount: 730,  currency: "CAD", offenceCode: "HTA s.32(1)",        offenceDescription: "Operating CMV without valid licence class",     status: "Convicted", courtDate: "2026-03-18" },
      { ticketNumber: "C-2026-0290", issueDate: "2026-02-10", chargedTo: "Driver",  fineAmount: 425,  currency: "CAD", offenceCode: "O.Reg.555/06 s.8(1)", offenceDescription: "Exceed 13-hour daily driving time limit",       status: "Pending",   courtDate: "2026-05-04" },
      { ticketNumber: "C-2026-0291", issueDate: "2026-02-10", chargedTo: "Carrier", fineAmount: 2150, currency: "CAD", offenceCode: "O.Reg.199/07 s.6(2)", offenceDescription: "Defective brake performance — ≥20% below standard", status: "Pending",   courtDate: "2026-05-12" },
    ],
    violationSummary: { "Vehicle Maintenance": 7, "Hours-of-service Compliance": 2, "Driver Fitness": 1 },
    oosSummary: { driver: "FAILED", vehicle: "FAILED", total: 5 },
    powerUnitDefects: "BRAKES ≥20% DEFECTIVE, BRAKE SMOKE/FIRE, TIRES EXPOSED CORD, AIR LEAK, STOP LAMPS, WASHER, FRAME",
    trailerDefects: "NONE",
    severityRate: 7.2,
    violations: [
      { code: "HTA s.32(1)", category: "Driver Fitness", description: "Operating CMV without valid class of driver's licence for that vehicle", subDescription: "Licensing", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 },
      { code: "O.Reg.555/06 s.8(1)", category: "Hours-of-service Compliance", description: "Exceeding 13-hour daily driving time limit under Canadian HOS rules", subDescription: "HOS Limit", severity: 7, weight: 3, points: 21, oos: true, driverRiskCategory: 1 },
      { code: "O.Reg.555/06 s.13(1)", category: "Hours-of-service Compliance", description: "Failure to maintain daily log records for previous 14 days", subDescription: "Log Records", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 1 },
      { code: "O.Reg.199/07 s.6(2)", category: "Vehicle Maintenance", description: "Defective brake performance - ≥20% of service brakes below standard", subDescription: "Brakes", severity: 0, weight: 3, points: 0, oos: true, driverRiskCategory: 1 },
      { code: "O.Reg.199/07 s.6(3)", category: "Vehicle Maintenance", description: "Brake overheating causing smoke or fire from wheel end assembly", subDescription: "Brakes", severity: 4, weight: 3, points: 12, oos: true, driverRiskCategory: 1 },
      { code: "HTA s.78(2)", category: "Vehicle Maintenance", description: "Tire with cord or fabric exposed, or flat/deflated tire", subDescription: "Tires", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 },
      { code: "O.Reg.199/07 s.11", category: "Vehicle Maintenance", description: "Air brake system - audible air leak not at a proper connection point", subDescription: "Air Brakes", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "HTA s.64(1)", category: "Vehicle Maintenance", description: "Stop lamps inoperative or not meeting prescribed standards", subDescription: "Lighting", severity: 6, weight: 3, points: 18, oos: false, driverRiskCategory: 1 },
      { code: "HTA s.66(3)", category: "Vehicle Maintenance", description: "Windshield washing system inoperative", subDescription: "Visibility", severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 },
      { code: "HTA s.84(1)", category: "Vehicle Maintenance", description: "Frame cracked, loose, sagging or broken - unsafe vehicle condition", subDescription: "Frame", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 }
    ]
  },
  // --- NEW CVOR INSPECTIONS (from CVOR Event Report) ---
  {
    id: "ONWINDS16001",
    date: "2026-03-19",
    state: "ON",
    driverId: "DRV-3001",
    driver: "Gurwinder Singh",
    driverLicense: "PA58877",
    driverJurisdiction: "CAON",
    vehiclePlate: "X1954W",
    vehicleType: "Truck",
    assetId: "a11",
    level: "Level 2",
    startTime: "11:29",
    endTime: "12:02",
    location: { city: "WINDSOR", province: "ON", raw: "WINDSOR, ON" },
    cvorPoints: { vehicle: 0, driver: 0, cvor: 0 },
    isClean: true,
    hasOOS: false,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    coDriver: false,
    impoundment: false,
    charged: false,
    categoriesOos: 0,
    totalDefects: 0,
    units: [
      { type: "Truck", make: "Volvo", license: "X1954W", vin: "4V4NC9TH5FN612345", jurisdiction: "CAON" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    violations: []
  },
  {
    id: "ONBOWMN16002",
    date: "2026-03-18",
    state: "ON",
    driverId: "DRV-3002",
    driver: "Jashandeep Singh",
    driverLicense: "PA55649",
    vehiclePlate: "Y4337T",
    vehicleType: "Truck",
    assetId: "a12",
    level: "Level 2",
    startTime: "21:30",
    endTime: "22:02",
    location: { city: "BOWMANVILLE", province: "ON", raw: "BOWMANVILLE, ON" },
    cvorPoints: { vehicle: 0, driver: 0, cvor: 0 },
    isClean: true,
    hasOOS: false,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Unknown", license: "Y4337T", vin: "" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    violations: []
  },
  {
    id: "ONWININ16003",
    date: "2026-03-10",
    state: "ON",
    driverId: "DRV-3003",
    driver: "Davinder Singh",
    driverLicense: "PA49664",
    vehiclePlate: "T9646B",
    vehicleType: "Truck",
    assetId: "a13",
    level: "Level 2",
    startTime: "09:40",
    endTime: "10:02",
    location: { city: "WINONA", province: "ON", raw: "WINONA, ON" },
    cvorPoints: { vehicle: 0, driver: 0, cvor: 0 },
    isClean: true,
    hasOOS: false,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Unknown", license: "T9646B", vin: "" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    violations: []
  },
  {
    id: "ONBOWMN16004",
    date: "2026-03-01",
    state: "ON",
    driverId: "DRV-3004",
    driver: "Anterpreet Singh",
    driverLicense: "PA89233",
    vehiclePlate: "W5616Y",
    vehicleType: "Truck",
    assetId: "a14",
    level: "Level 2",
    startTime: "22:10",
    endTime: "22:59",
    location: { city: "BOWMANVILLE", province: "ON", raw: "BOWMANVILLE, ON" },
    cvorPoints: { vehicle: 2, driver: 2, cvor: 4 },
    isClean: false,
    hasOOS: false,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Unknown", license: "W5616Y", vin: "" }
    ],
    violationSummary: { "Vehicle Maintenance": 2 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    powerUnitDefects: "TRIP INSPECTION / BRAKES - AIR LINES",
    trailerDefects: null,
    severityRate: 2.0,
    violations: [
      { code: "O.Reg.199/07 s.6(1)", category: "Vehicle Maintenance", description: "Daily trip inspection not completed or deficient", subDescription: "Trip Inspection", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "O.Reg.199/07 s.11", category: "Vehicle Maintenance", description: "Air brake system - audible air leak not at a proper connection point", subDescription: "Brakes - Air Lines", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },
  {
    id: "ONPUTNM16005",
    date: "2026-02-27",
    state: "ON",
    driverId: "DRV-3005",
    driver: "Bhupinder Singh",
    driverLicense: "PA46096",
    vehiclePlate: "X3203Z",
    vehicleType: "Truck",
    assetId: "a15",
    level: "Level 1",
    startTime: "10:30",
    endTime: "11:06",
    location: { city: "PUTNAM SOUTH", province: "ON", raw: "PUTNAM SOUTH, ON" },
    cvorPoints: { vehicle: 1, driver: 1, cvor: 2 },
    isClean: false,
    hasOOS: false,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Unknown", license: "X3203Z", vin: "" }
    ],
    violationSummary: { "Vehicle Maintenance": 1 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    powerUnitDefects: "TIRES - FLAT/LEAKING",
    trailerDefects: null,
    severityRate: 1.0,
    violations: [
      { code: "HTA s.78(2)", category: "Vehicle Maintenance", description: "Tire with cord or fabric exposed, or flat/deflated tire", subDescription: "Tires - Flat/Leaking", severity: 8, weight: 3, points: 24, oos: false, driverRiskCategory: 1 }
    ]
  },

  // ===== SMS Level 4 – Special Inspection =====
  {
    id: "GAATLAN17001",
    date: "2025-11-05",
    state: "GA",
    driverId: "DRV-2001",
    driver: "John Smith",
    driverLicense: "S530-4120-6789",
    vehiclePlate: "P-7762",
    vehicleType: "Truck",
    assetId: "a1",
    level: "Level 4",
    startTime: "08:00",
    endTime: "08:45",
    location: { city: "ATLANTA", province: "GA", raw: "1580 FULTON INDUSTRIAL BLVD, ATLANTA, GA 30336" },
    smsPoints: { vehicle: 0, driver: 18, carrier: 18 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 3.0,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Freightliner", license: "P-7762", vin: "1M8GDM9A6HP05X12" }
    ],
    violationSummary: { "Hazmat compliance": 2 },
    oosSummary: { driver: "PASSED", vehicle: "N/A", total: 0 },
    violations: [
      { code: "173.24B", category: "Hazmat compliance", description: "Package not conforming to specification or having components damaged", subDescription: "Hazmat Package", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 },
      { code: "172.800A", category: "Hazmat compliance", description: "No security plan or plan not in accordance with regulation", subDescription: "Hazmat Security", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== SMS Level 5 – Vehicle Only =====
  {
    id: "TNMEMPH17002",
    date: "2025-09-18",
    state: "TN",
    driverId: "DRV-2004",
    driver: "Mike Johnson",
    driverLicense: "J525-8810-1234",
    vehiclePlate: "TRK-5589",
    vehicleType: "Truck",
    assetId: "a4",
    level: "Level 5",
    startTime: "13:10",
    endTime: "13:55",
    location: { city: "MEMPHIS", province: "TN", raw: "2200 AIRWAYS BLVD, MEMPHIS, TN 38114" },
    smsPoints: { vehicle: 42, driver: 0, carrier: 42 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "FRAME CRACKED, STEERING LINKAGE WORN",
    trailerDefects: null,
    severityRate: 7.0,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Peterbilt", license: "TRK-5589", vin: "2NP2HN0X19M77T412" }
    ],
    violationSummary: { "Vehicle Maintenance": 3 },
    oosSummary: { driver: "N/A", vehicle: "FAILED", total: 2 },
    violations: [
      { code: "393.201A-FC", category: "Vehicle Maintenance", description: "Frame - Cracked, broken, loose, or sagging", subDescription: "Frame", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 },
      { code: "393.209A-SLBW", category: "Vehicle Maintenance", description: "Steering - Linkage ball and socket joint worn", subDescription: "Steering", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 1 },
      { code: "396.3A1-TF", category: "Vehicle Maintenance", description: "Tire - Flat or underinflated", subDescription: "Tires", severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 }
    ]
  },

  // ===== SMS Level 6 – Enhanced NAS Radioactive =====
  {
    id: "SCCHARL17003",
    date: "2025-07-12",
    state: "SC",
    driverId: "DRV-2006",
    driver: "Robert Chen",
    driverLicense: "C550-9980-5678",
    vehiclePlate: "HZ-4411",
    vehicleType: "Truck",
    assetId: "a6",
    level: "Level 6",
    startTime: "06:30",
    endTime: "08:20",
    location: { city: "CHARLESTON", province: "SC", raw: "4755 RIVERS AVE, NORTH CHARLESTON, SC 29405" },
    smsPoints: { vehicle: 9, driver: 27, carrier: 36 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 4.5,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Kenworth", license: "HZ-4411", vin: "3WKAD49X89F401456" },
      { type: "SEMI-TRAILER", make: "UTILITY", license: "HZ-T903 (SC)", vin: "1UYVS2536BU801990" }
    ],
    violationSummary: { "Hazmat compliance": 2, "Vehicle Maintenance": 1, "Hours-of-service Compliance": 1 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "173.441A", category: "Hazmat compliance", description: "Radioactive material - TI exceeds allowable", subDescription: "Radioactive", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 1 },
      { code: "172.704A", category: "Hazmat compliance", description: "Hazmat employee not trained as required", subDescription: "Hazmat Training", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "393.9A-LTLI", category: "Vehicle Maintenance", description: "Lighting - Turn signal lamp inoperative", subDescription: "Lighting", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 },
      { code: "395.8E1", category: "Hours-of-service Compliance", description: "ELD not compliant with FMCSA specifications", subDescription: "ELD", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== CVOR Level 3 – Driver Only =====
  {
    id: "ONLONDN17004",
    date: "2026-01-15",
    state: "ON",
    driverId: "DRV-3001",
    driver: "Gurwinder Singh",
    driverLicense: "GS82140",
    vehiclePlate: "BN19 4TW",
    vehicleType: "Truck",
    assetId: "a10",
    level: "Level 3",
    startTime: "11:00",
    endTime: "11:30",
    location: { city: "LONDON", province: "ON", raw: "1155 WELLINGTON RD S, LONDON, ON N6E 1M2" },
    cvorPoints: { vehicle: 0, driver: 3, cvor: 3 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 5.0,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Volvo", license: "BN19 4TW", vin: "4V4NC9EJ3EN167832" }
    ],
    violationSummary: { "Hours-of-service Compliance": 1 },
    oosSummary: { driver: "PASSED", vehicle: "N/A", total: 0 },
    violations: [
      { code: "HTA s.190(3)", category: "Hours-of-service Compliance", description: "Driver failed to maintain daily log as required", subDescription: "Daily Log", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== CVOR Level 4 – Special Inspection =====
  {
    id: "ONBRANT17005",
    date: "2025-12-03",
    state: "ON",
    driverId: "DRV-3003",
    driver: "Davinder Singh",
    driverLicense: "RK33018",
    vehiclePlate: "AR72 MKN",
    vehicleType: "Truck",
    assetId: "a12",
    level: "Level 4",
    startTime: "14:15",
    endTime: "15:00",
    location: { city: "BRANTFORD", province: "ON", raw: "100 SAVANNAH OAKS DR, BRANTFORD, ON N3V 1E8" },
    cvorPoints: { vehicle: 2, driver: 0, cvor: 2 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "CARGO SECUREMENT DEFICIENCY",
    trailerDefects: null,
    severityRate: 4.0,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Mack", license: "AR72 MKN", vin: "1M1AW07Y88N007123" },
      { type: "Flatbed", make: "MANAC", license: "FB-3921 (ON)", vin: "2M592088XCA302111" }
    ],
    violationSummary: { "Cargo Securement": 2 },
    oosSummary: { driver: "N/A", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "O.Reg 363/04 s.14", category: "Cargo Securement", description: "Cargo not properly secured – insufficient tiedowns for commodity", subDescription: "Tiedowns", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "O.Reg 363/04 s.11", category: "Cargo Securement", description: "Cargo securement system not adequate for load", subDescription: "Load Security", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== CVOR Level 5 – Vehicle Only =====
  {
    id: "ONKITCH17006",
    date: "2025-10-20",
    state: "ON",
    driverId: "DRV-3004",
    driver: "Anterpreet Singh",
    driverLicense: "AA91257",
    vehiclePlate: "AX83 JRE",
    vehicleType: "Truck",
    assetId: "a13",
    level: "Level 5",
    startTime: "09:00",
    endTime: "09:50",
    location: { city: "KITCHENER", province: "ON", raw: "4220 KING ST E, KITCHENER, ON N2P 2G5" },
    cvorPoints: { vehicle: 4, driver: 0, cvor: 4 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES - AIR COMPRESSOR DEFECTIVE, EXHAUST LEAK",
    trailerDefects: "FRAME - CRACKED CROSSMEMBER",
    severityRate: 7.5,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "International", license: "AX83 JRE", vin: "3HSDJAPR5CN603844" },
      { type: "SEMI-TRAILER", make: "GREAT DANE", license: "GD-2088 (ON)", vin: "1GRAA0626DB256901" }
    ],
    violationSummary: { "Vehicle Maintenance": 3 },
    oosSummary: { driver: "N/A", vehicle: "FAILED", total: 2 },
    violations: [
      { code: "O.Reg 199/07 s.6(1)", category: "Vehicle Maintenance", description: "Air brake system - Air compressor defective or inoperative", subDescription: "Air Compressor", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 },
      { code: "HTA s.84(1)", category: "Vehicle Maintenance", description: "Exhaust system – leak or defective component", subDescription: "Exhaust", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 },
      { code: "O.Reg 199/07 s.13(1)", category: "Vehicle Maintenance", description: "Frame or body – Cracked crossmember on trailer frame", subDescription: "Frame", severity: 8, weight: 3, points: 24, oos: true, driverRiskCategory: 1 }
    ]
  },

  // ===== Additional SMS – Level 1 with full address =====
  {
    id: "NCRALGH17007",
    date: "2026-02-18",
    state: "NC",
    driverId: "DRV-2003",
    driver: "James Sullivan",
    driverLicense: "S840-5501-9012",
    vehiclePlate: "NC-8421",
    vehicleType: "Truck",
    assetId: "a3",
    level: "Level 1",
    startTime: "07:15",
    endTime: "09:00",
    location: { city: "RALEIGH", province: "NC", raw: "3901 CAPITAL BLVD, RALEIGH, NC 27604" },
    smsPoints: { vehicle: 54, driver: 21, carrier: 75 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES DEFECTIVE, TIRE TREAD DEPTH",
    trailerDefects: "LIGHTING INOPERATIVE",
    severityRate: 5.5,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Volvo", license: "NC-8421", vin: "4V4NC9EH3FN188904" },
      { type: "SEMI-TRAILER", make: "WABASH", license: "WB-T221 (NC)", vin: "1JJV532D6FL888340" }
    ],
    violationSummary: { "Vehicle Maintenance": 4, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 2 },
    violations: [
      { code: "393.47E", category: "Vehicle Maintenance", description: "Brake Out of Adjustment - steer axle", subDescription: "Brakes", severity: 6, weight: 3, points: 18, oos: true, driverRiskCategory: 1 },
      { code: "393.75A2", category: "Vehicle Maintenance", description: "Tire - Tread depth less than 4/32 on steer axle", subDescription: "Tires", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 1 },
      { code: "393.9A-LTI", category: "Vehicle Maintenance", description: "Lighting - Tail lamp inoperative on trailer", subDescription: "Lighting", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 },
      { code: "393.100-CSIB", category: "Vehicle Maintenance", description: "Cargo not properly secured - insufficient blocking", subDescription: "Cargo", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 },
      { code: "392.2-SPDZ", category: "Unsafe Driving", description: "Speeding in a construction/work zone", subDescription: "Speed", severity: 7, weight: 3, points: 21, oos: false, driverRiskCategory: 1 }
    ]
  },

  // ===== Additional CVOR – Level 1 with full address =====
  {
    id: "ONOTTAW17008",
    date: "2026-02-05",
    state: "ON",
    driverId: "DRV-3002",
    driver: "Jashandeep Singh",
    driverLicense: "JD72503",
    vehiclePlate: "BV68 9XK",
    vehicleType: "Truck",
    assetId: "a11",
    level: "Level 1",
    startTime: "08:30",
    endTime: "10:15",
    location: { city: "OTTAWA", province: "ON", raw: "2760 LANCASTER RD, OTTAWA, ON K1B 4T7" },
    cvorPoints: { vehicle: 5, driver: 2, cvor: 7 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: "BRAKES DEFECTIVE, STEERING COMPONENTS WORN",
    trailerDefects: "LIGHTING INOPERATIVE, MUDFLAP MISSING",
    severityRate: 6.0,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Freightliner", license: "BV68 9XK", vin: "1FUJHHDR8CLBR8877" },
      { type: "SEMI-TRAILER", make: "STOUGHTON", license: "ST-7729 (ON)", vin: "1DW1A532X6S694001" }
    ],
    violationSummary: { "Vehicle Maintenance": 4, "Hours-of-service Compliance": 1, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 3 },
    violations: [
      { code: "O.Reg 199/07 s.4(1)a", category: "Vehicle Maintenance", description: "Brake – Pushrod stroke exceeds adjustment limit", subDescription: "Brakes", severity: 7, weight: 3, points: 21, oos: true, driverRiskCategory: 1 },
      { code: "O.Reg 199/07 s.7(1)", category: "Vehicle Maintenance", description: "Steering components – worn or improperly adjusted", subDescription: "Steering", severity: 6, weight: 3, points: 18, oos: true, driverRiskCategory: 1 },
      { code: "HTA s.62(17)", category: "Vehicle Maintenance", description: "Tail lamp or stop lamp not working on trailer", subDescription: "Lighting", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 },
      { code: "O.Reg 199/07 s.12", category: "Vehicle Maintenance", description: "Mudflap or splash guard missing or defective", subDescription: "Body", severity: 2, weight: 3, points: 6, oos: false, driverRiskCategory: 3 },
      { code: "HTA s.190(3)", category: "Hours-of-service Compliance", description: "Driver failed to maintain daily log as required", subDescription: "Daily Log", severity: 5, weight: 3, points: 15, oos: true, driverRiskCategory: 2 },
      { code: "HTA s.128", category: "Unsafe Driving", description: "Speeding – exceed posted limit by more than 15 km/h", subDescription: "Speed", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 1 }
    ]
  },

  // ===== Additional CVOR – Level 2 clean =====
  {
    id: "ONTHUNB17009",
    date: "2025-08-14",
    state: "ON",
    driverId: "DRV-3005",
    driver: "Bhupinder Singh",
    driverLicense: "PA46096",
    vehiclePlate: "X3203Z",
    vehicleType: "Truck",
    assetId: "a15",
    level: "Level 2",
    startTime: "15:45",
    endTime: "16:10",
    location: { city: "THUNDER BAY", province: "ON", raw: "1000 DAWSON RD, THUNDER BAY, ON P7B 5E1" },
    cvorPoints: { vehicle: 0, driver: 0, cvor: 0 },
    isClean: true,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Kenworth", license: "X3203Z", vin: "1XKAD49X39J267001" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: []
  },

  // ===== Additional SMS – Level 3 clean =====
  {
    id: "AZPHOEN17010",
    date: "2025-12-10",
    state: "AZ",
    driverId: "DRV-2005",
    driver: "Elena Rodriguez",
    driverLicense: "R362-1150-3456",
    vehiclePlate: "AZ-3019",
    vehicleType: "Truck",
    assetId: "a5",
    level: "Level 3",
    startTime: "10:00",
    endTime: "10:25",
    location: { city: "PHOENIX", province: "AZ", raw: "2402 W MCDOWELL RD, PHOENIX, AZ 85009" },
    smsPoints: { vehicle: 0, driver: 0, carrier: 0 },
    isClean: true,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Peterbilt", license: "AZ-3019", vin: "2NP2HN0X09M771140" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "N/A", total: 0 },
    violations: []
  },

  // ===== Additional CVOR – Level 3 with violations =====
  {
    id: "ONBARRI17011",
    date: "2025-06-22",
    state: "ON",
    driverId: "DRV-3004",
    driver: "Anterpreet Singh",
    driverLicense: "AA91257",
    vehiclePlate: "AX83 JRE",
    vehicleType: "Truck",
    assetId: "a13",
    level: "Level 3",
    startTime: "12:30",
    endTime: "13:00",
    location: { city: "BARRIE", province: "ON", raw: "55 CEDAR POINTE DR, BARRIE, ON L4N 5R7" },
    cvorPoints: { vehicle: 0, driver: 2, cvor: 2 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 4.0,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "International", license: "AX83 JRE", vin: "3HSDJAPR5CN603844" }
    ],
    violationSummary: { "Driver Fitness": 1 },
    oosSummary: { driver: "PASSED", vehicle: "N/A", total: 0 },
    violations: [
      { code: "HTA s.32(2)", category: "Driver Fitness", description: "Driver not holding proper class of licence for vehicle operated", subDescription: "Licence Class", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== Additional SMS – Level 4 =====
  {
    id: "WASEATT17012",
    date: "2025-04-25",
    state: "WA",
    driverId: "DRV-2008",
    driver: "Michael Brown",
    driverLicense: "B650-4409-7890",
    vehiclePlate: "WA-7801",
    vehicleType: "Truck",
    assetId: "a8",
    level: "Level 4",
    startTime: "16:00",
    endTime: "16:40",
    location: { city: "SEATTLE", province: "WA", raw: "3200 S 216TH ST, SEATTLE, WA 98198" },
    smsPoints: { vehicle: 0, driver: 12, carrier: 12 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 4.0,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Mack", license: "WA-7801", vin: "1M2AX04C57M001290" }
    ],
    violationSummary: { "Controlled Substances": 1 },
    oosSummary: { driver: "PASSED", vehicle: "N/A", total: 0 },
    violations: [
      { code: "382.301D", category: "Controlled Substances", description: "Failing to implement random controlled substances testing program", subDescription: "Drug Test", severity: 4, weight: 3, points: 12, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== Additional SMS – Level 5 =====
  {
    id: "CODENVE17013",
    date: "2025-08-01",
    state: "CO",
    driverId: "DRV-2002",
    driver: "Sarah Miller",
    driverLicense: "M460-2287-3456",
    vehiclePlate: "CO-2245",
    vehicleType: "Trailer",
    assetId: "a2",
    level: "Level 5",
    startTime: "11:30",
    endTime: "12:15",
    location: { city: "DENVER", province: "CO", raw: "5001 E 56TH AVE, DENVER, CO 80216" },
    smsPoints: { vehicle: 24, driver: 0, carrier: 24 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: "TIRES WORN, REFLECTIVE TAPE MISSING",
    severityRate: 4.0,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "SEMI-TRAILER", make: "HYUNDAI", license: "CO-2245", vin: "3H3V532D2FL060291" }
    ],
    violationSummary: { "Vehicle Maintenance": 2 },
    oosSummary: { driver: "N/A", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.75C", category: "Vehicle Maintenance", description: "Tire - Worn, tread depth less than 2/32 on drive axle", subDescription: "Tires", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 },
      { code: "393.11A1-CSLRR", category: "Vehicle Maintenance", description: "Lower rear retro-reflective sheeting missing", subDescription: "Conspicuity", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 3 }
    ]
  },

  // ===== SMS Level 7 – Jurisdictional Mandated =====
  {
    id: "MNMINNE18001",
    date: "2026-01-08",
    state: "MN",
    driverId: "DRV-2003",
    driver: "James Sullivan",
    driverLicense: "S840-5501-9012",
    vehiclePlate: "MN-6104",
    vehicleType: "Truck",
    assetId: "a3",
    level: "Level 7",
    startTime: "09:45",
    endTime: "10:30",
    location: { city: "MINNEAPOLIS", province: "MN", raw: "7150 HUMPHREY DR, MINNEAPOLIS, MN 55450" },
    smsPoints: { vehicle: 18, driver: 9, carrier: 27 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: "TIRE TREAD DEPTH",
    trailerDefects: null,
    severityRate: 3.0,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Volvo", license: "MN-6104", vin: "4V4NC9EH7FN192847" },
      { type: "SEMI-TRAILER", make: "UTILITY", license: "UT-3310 (MN)", vin: "1UYVS253XBU801556" }
    ],
    violationSummary: { "Vehicle Maintenance": 2, "Driver Fitness": 1 },
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: [
      { code: "393.75A2", category: "Vehicle Maintenance", description: "Tire - Tread depth less than 4/32 on steer axle", subDescription: "Tires", severity: 5, weight: 3, points: 15, oos: false, driverRiskCategory: 2 },
      { code: "396.17C", category: "Vehicle Maintenance", description: "Operating a CMV without periodic inspection", subDescription: "Periodic Inspection", severity: 1, weight: 3, points: 3, oos: false, driverRiskCategory: 3 },
      { code: "391.11B4", category: "Driver Fitness", description: "Failing to have valid medical certificate in driver's possession", subDescription: "Medical Certificate", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== SMS Level 7 – Jurisdictional Mandated (clean) =====
  {
    id: "OKCITYO18002",
    date: "2025-06-30",
    state: "OK",
    driverId: "DRV-2005",
    driver: "Elena Rodriguez",
    driverLicense: "R362-1150-3456",
    vehiclePlate: "OK-9022",
    vehicleType: "Truck",
    assetId: "a5",
    level: "Level 7",
    startTime: "14:00",
    endTime: "14:25",
    location: { city: "OKLAHOMA CITY", province: "OK", raw: "4501 MARTIN LUTHER KING AVE, OKLAHOMA CITY, OK 73111" },
    smsPoints: { vehicle: 0, driver: 0, carrier: 0 },
    isClean: true,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: null,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "Truck", make: "Kenworth", license: "OK-9022", vin: "1XKAD49X09J267301" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: []
  },

  // ===== SMS Level 8 – Electronic Inspection =====
  {
    id: "VARICHN18003",
    date: "2026-02-12",
    state: "VA",
    driverId: "DRV-2004",
    driver: "Mike Johnson",
    driverLicense: "J525-8810-1234",
    vehiclePlate: "VA-1137",
    vehicleType: "Truck",
    assetId: "a4",
    level: "Level 8",
    startTime: "06:00",
    endTime: "06:10",
    location: { city: "RICHMOND", province: "VA", raw: "3160 COMMERCE RD, RICHMOND, VA 23234" },
    smsPoints: { vehicle: 0, driver: 9, carrier: 9 },
    isClean: false,
    hasOOS: false,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 3.0,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Freightliner", license: "VA-1137", vin: "1FUJHHDR5DLBR2210" }
    ],
    violationSummary: { "Hours-of-service Compliance": 1 },
    oosSummary: { driver: "PASSED", vehicle: "N/A", total: 0 },
    violations: [
      { code: "395.8E5", category: "Hours-of-service Compliance", description: "ELD data transfer – unable to produce electronic output at roadside", subDescription: "ELD Transfer", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 }
    ]
  },

  // ===== SMS Level 8 – Electronic Inspection (with violations) =====
  {
    id: "MOKASNC18004",
    date: "2025-10-15",
    state: "MO",
    driverId: "DRV-2008",
    driver: "Michael Brown",
    driverLicense: "B650-4409-7890",
    vehiclePlate: "MO-3380",
    vehicleType: "Truck",
    assetId: "a8",
    level: "Level 8",
    startTime: "17:30",
    endTime: "17:42",
    location: { city: "KANSAS CITY", province: "MO", raw: "1200 E 18TH ST, KANSAS CITY, MO 64108" },
    smsPoints: { vehicle: 0, driver: 21, carrier: 21 },
    isClean: false,
    hasOOS: true,
    powerUnitDefects: null,
    trailerDefects: null,
    severityRate: 7.0,
    hasVehicleViolations: false,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Mack", license: "MO-3380", vin: "1M2AX04C97M001401" }
    ],
    violationSummary: { "Hours-of-service Compliance": 2 },
    oosSummary: { driver: "FAILED", vehicle: "N/A", total: 1 },
    violations: [
      { code: "395.3A2", category: "Hours-of-service Compliance", description: "Driving beyond 14-hour duty period", subDescription: "Duty Period", severity: 7, weight: 3, points: 21, oos: true, driverRiskCategory: 1 },
      { code: "395.8E1", category: "Hours-of-service Compliance", description: "ELD not compliant with FMCSA specifications", subDescription: "ELD Compliance", severity: 3, weight: 3, points: 9, oos: false, driverRiskCategory: 2 }
    ]
  }
];

export const cvorOosThresholds = {
  overall: 20,
  vehicle: 20,
  driver: 5
};

export const nscAnalytics = {
  periodMiles: 17054528, 
  pointsPerMillionMiles: 0.35
};

export const nscRiskBand = {
  label: 'Conditional',
  badge: 'bg-amber-100 text-amber-800 border-amber-200',
  detail: 'Carrier has exceeded warning thresholds and may require an intervention.'
};



// ─────────────────────────────────────────────────────────────────────────────
// CVOR PERIODIC REPORT SNAPSHOTS
// Each row = one actual MTO CVOR abstract pull for the carrier.
// Real pull dates: Apr 2022 → Jan 2024 (15 pulls).
// colContrib/conContrib/insContrib are the weighted contributions to overall rating.
// colPctOfThresh = colContrib / 0.40, conPctOfThresh = conContrib / 0.40,
// insPctOfThresh = insContrib / 0.20
// ─────────────────────────────────────────────────────────────────────────────

export type CvorPeriodicReport = {
  reportDate:           string;   // ISO date of actual pull
  periodLabel:          string;   // display label e.g. "Apr 4, 2022"
  rating:               number;   // overall CVOR %
  // Weighted contributions to overall rating
  colContrib:           number;   // % Collisions contribution (weight 40%)
  conContrib:           number;   // % Convictions contribution (weight 40%)
  insContrib:           number;   // % Inspections contribution (weight 20%)
  // % of threshold used (derived: colContrib/0.40, conContrib/0.40, insContrib/0.20)
  colPctOfThresh:       number;
  conPctOfThresh:       number;
  insPctOfThresh:       number;
  // Event counts
  collisionEvents:      number;
  convictionEvents:     number;
  // OOS rates
  oosOverall:           number;
  oosVehicle:           number;
  oosDriver:            number;
  // Fleet stats
  trucks:               number;
  onMiles:              number;
  canadaMiles:          number;
  totalMiles:           number;
  // Points breakdown
  collWithPoints:       number;
  collWithoutPoints:    number;
  totalCollisionPoints: number;
  convictionPoints:     number;
  // Granular collision breakdown (CVOR PDF "Collision Details" section).
  // fatal + personalInjury + propertyDamage MUST equal collisionEvents.
  collisionDetails: {
    fatal:          number;
    personalInjury: number;
    propertyDamage: number;
  };
  // Granular conviction breakdown (CVOR PDF "Conviction Details" section).
  // withPoints + notPointed MUST equal convictionEvents.
  // driver + vehicle + load + other MUST equal convictionEvents.
  convictionDetails: {
    withPoints: number;
    notPointed: number;
    driver:     number;
    vehicle:    number;
    load:       number;
    other:      number;
  };
  // CVOR Rating Comparison data per pull. Sum of level counts = cvsaInspections.
  // Sum of oosCount × 100 / cvsaInspections ≈ oosOverall.
  levelStats: {
    level1: { count: number; oosCount: number };
    level2: { count: number; oosCount: number };
    level3: { count: number; oosCount: number };
    level4: { count: number; oosCount: number };
    level5: { count: number; oosCount: number };
  };
  // Inspection Statistics per pull. cvsaInspections = sum of levelStats counts.
  // totalInspectionPoints = 0.6875 × driverPoints + vehiclePoints.
  // pctSetThreshold = totalInspectionPoints / setThreshold × 100 ≈ insPctOfThresh.
  inspectionStats: {
    cvsaInspections:        number;
    vehiclesInspected:      number;
    driversInspected:       number;
    driverPoints:           number;
    vehiclePoints:          number;
    totalInspectionPoints:  number;
    setThreshold:           number;
  };
  // 3-period Km-rate breakdowns (P1=most recent 8 mo, P2=middle 8 mo, P3=earliest 8 mo).
  // Sum of events across 3 periods = collisionEvents (or convictionEvents).
  // Sum of points across 3 periods = totalCollisionPoints (or convictionPoints).
  // Dates and thresholds are derived at render time from reportDate + totalMiles.
  collisionBreakdown:  { events: number; points: number }[];  // length === 3
  convictionBreakdown: { events: number; points: number }[];  // length === 3
  // Per-pull events list (Intervention & Event Details PDF section).
  // Generated procedurally from collisionBreakdown / convictionBreakdown / levelStats so:
  //   - count of type='collision' events  = collisionEvents
  //   - count of type='conviction' events = convictionEvents
  //   - count of type='inspection' events = inspectionStats.cvsaInspections
  //   - sum of collision points = totalCollisionPoints
  //   - sum of conviction points = convictionPoints
  //   - sum of inspection vehiclePoints = inspectionStats.vehiclePoints
  //   - sum of inspection driverPoints  = inspectionStats.driverPoints
  events: CvorInterventionEvent[];
  // Per-pull travel kilometric rows (Travel Kilometric Information PDF section).
  // Generated as 2 rows (Estimated recent 12 mo + Actual older 12 mo) summing to totalMiles.
  travelKm: CvorTravelKmRow[];
};

// 15 real CVOR abstract pulls (Apr 2022 → Jan 2024).
// Specs without `events` — events are generated below by genEventsForPull and merged.
type CvorPeriodicReportSpec = Omit<CvorPeriodicReport, 'events' | 'travelKm'>;
const _cvorPullSpecs: CvorPeriodicReportSpec[] = [
  { reportDate:'2024-06-23', periodLabel:'Jun 23/24', rating:24.29, colContrib:2.52, conContrib:5.17, insContrib:16.59, colPctOfThresh:6.30, conPctOfThresh:12.93, insPctOfThresh:82.95, collisionEvents:21, convictionEvents:27, oosOverall:26.58, oosVehicle:27.69, oosDriver:3.80, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:15, totalCollisionPoints:14, convictionPoints:74,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:18 },
    convictionDetails:{ withPoints:23, notPointed:4, driver:15, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:58,oosCount:20}, level2:{count:44,oosCount:14}, level3:{count:36,oosCount:4}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:145, vehiclesInspected:218, driversInspected:145, driverPoints:2, vehiclePoints:45, totalInspectionPoints:46.38, setThreshold:55.91 },
    collisionBreakdown:[ {events:8,points:6}, {events:7,points:5}, {events:6,points:3} ],
    convictionBreakdown:[ {events:10,points:28}, {events:9,points:26}, {events:8,points:20} ] },
  { reportDate:'2024-07-25', periodLabel:'Jul 25/24', rating:24.16, colContrib:2.52, conContrib:5.06, insContrib:16.57, colPctOfThresh:6.30, conPctOfThresh:12.65, insPctOfThresh:82.85, collisionEvents:22, convictionEvents:26, oosOverall:25.33, oosVehicle:26.67, oosDriver:4.00, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:71,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:19 },
    convictionDetails:{ withPoints:22, notPointed:4, driver:14, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:59,oosCount:19}, level2:{count:44,oosCount:13}, level3:{count:37,oosCount:4}, level4:{count:5,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:148, vehiclesInspected:222, driversInspected:148, driverPoints:2, vehiclePoints:46, totalInspectionPoints:47.38, setThreshold:57.19 },
    collisionBreakdown:[ {events:8,points:6}, {events:7,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:10,points:27}, {events:9,points:25}, {events:7,points:19} ] },
  { reportDate:'2024-10-21', periodLabel:'Oct 21/24', rating:26.55, colContrib:2.52, conContrib:6.23, insContrib:17.79, colPctOfThresh:6.30, conPctOfThresh:15.58, insPctOfThresh:88.95, collisionEvents:22, convictionEvents:30, oosOverall:27.59, oosVehicle:29.41, oosDriver:4.60, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:86,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:19 },
    convictionDetails:{ withPoints:26, notPointed:4, driver:17, vehicle:7, load:4, other:2 },
    levelStats:{ level1:{count:60,oosCount:21}, level2:{count:45,oosCount:14}, level3:{count:37,oosCount:4}, level4:{count:4,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:149, vehiclesInspected:224, driversInspected:149, driverPoints:2, vehiclePoints:49, totalInspectionPoints:50.38, setThreshold:56.64 },
    collisionBreakdown:[ {events:8,points:6}, {events:7,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:11,points:32}, {events:10,points:30}, {events:9,points:24} ] },
  { reportDate:'2024-11-20', periodLabel:'Nov 20/24', rating:26.40, colContrib:2.92, conContrib:5.75, insContrib:17.73, colPctOfThresh:7.30, conPctOfThresh:14.38, insPctOfThresh:88.65, collisionEvents:23, convictionEvents:27, oosOverall:27.91, oosVehicle:28.99, oosDriver:4.65, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:76,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:23, notPointed:4, driver:15, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:61,oosCount:22}, level2:{count:46,oosCount:14}, level3:{count:38,oosCount:4}, level4:{count:4,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:152, vehiclesInspected:228, driversInspected:152, driverPoints:2, vehiclePoints:49, totalInspectionPoints:50.38, setThreshold:56.83 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:10,points:28}, {events:9,points:27}, {events:8,points:21} ] },
  { reportDate:'2025-01-06', periodLabel:'Jan 6/25',  rating:26.34, colContrib:2.92, conContrib:5.74, insContrib:17.68, colPctOfThresh:7.30, conPctOfThresh:14.35, insPctOfThresh:88.40, collisionEvents:23, convictionEvents:26, oosOverall:27.78, oosVehicle:29.58, oosDriver:4.44, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:73,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:22, notPointed:4, driver:14, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:61,oosCount:22}, level2:{count:46,oosCount:14}, level3:{count:39,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:153, vehiclesInspected:230, driversInspected:153, driverPoints:2, vehiclePoints:49, totalInspectionPoints:50.38, setThreshold:56.99 },
    collisionBreakdown:[ {events:8,points:5}, {events:8,points:5}, {events:7,points:4} ],
    convictionBreakdown:[ {events:10,points:27}, {events:9,points:26}, {events:7,points:20} ] },
  { reportDate:'2025-02-11', periodLabel:'Feb 11/25', rating:27.21, colContrib:3.31, conContrib:5.62, insContrib:18.29, colPctOfThresh:8.28, conPctOfThresh:14.05, insPctOfThresh:91.45, collisionEvents:22, convictionEvents:26, oosOverall:28.57, oosVehicle:31.43, oosDriver:4.40, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:8, collWithoutPoints:14, totalCollisionPoints:18, convictionPoints:72,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:19 },
    convictionDetails:{ withPoints:22, notPointed:4, driver:14, vehicle:7, load:3, other:2 },
    levelStats:{ level1:{count:61,oosCount:22}, level2:{count:46,oosCount:15}, level3:{count:38,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:152, vehiclesInspected:228, driversInspected:152, driverPoints:3, vehiclePoints:51, totalInspectionPoints:53.06, setThreshold:58.02 },
    collisionBreakdown:[ {events:8,points:8}, {events:7,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:10,points:27}, {events:9,points:26}, {events:7,points:19} ] },
  { reportDate:'2025-05-04', periodLabel:'May 4/25',  rating:26.33, colContrib:3.02, conContrib:5.00, insContrib:18.30, colPctOfThresh:7.55, conPctOfThresh:12.50, insPctOfThresh:91.50, collisionEvents:23, convictionEvents:22, oosOverall:28.72, oosVehicle:33.33, oosDriver:3.19, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:61,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:18, notPointed:4, driver:12, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:60,oosCount:22}, level2:{count:45,oosCount:14}, level3:{count:37,oosCount:5}, level4:{count:4,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:149, vehiclesInspected:224, driversInspected:149, driverPoints:3, vehiclePoints:51, totalInspectionPoints:53.06, setThreshold:57.99 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:9,points:23}, {events:7,points:22}, {events:6,points:16} ] },
  { reportDate:'2025-06-02', periodLabel:'Jun 2/25',  rating:27.18, colContrib:3.02, conContrib:4.82, insContrib:19.34, colPctOfThresh:7.55, conPctOfThresh:12.05, insPctOfThresh:96.70, collisionEvents:23, convictionEvents:20, oosOverall:30.77, oosVehicle:36.23, oosDriver:3.30, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:7, collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:58,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:16, notPointed:4, driver:11, vehicle:5, load:2, other:2 },
    levelStats:{ level1:{count:59,oosCount:23}, level2:{count:44,oosCount:15}, level3:{count:36,oosCount:5}, level4:{count:5,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:147, vehiclesInspected:220, driversInspected:147, driverPoints:3, vehiclePoints:54, totalInspectionPoints:56.06, setThreshold:57.97 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:6}, {events:7,points:4} ],
    convictionBreakdown:[ {events:8,points:22}, {events:7,points:21}, {events:5,points:15} ] },
  { reportDate:'2025-07-13', periodLabel:'Jul 13/25', rating:28.39, colContrib:2.74, conContrib:5.07, insContrib:20.58, colPctOfThresh:6.85, conPctOfThresh:12.68, insPctOfThresh:102.90, collisionEvents:23, convictionEvents:22, oosOverall:34.12, oosVehicle:41.94, oosDriver:3.53, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:17, totalCollisionPoints:14, convictionPoints:61,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:19 },
    convictionDetails:{ withPoints:18, notPointed:4, driver:12, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:58,oosCount:25}, level2:{count:44,oosCount:17}, level3:{count:36,oosCount:6}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:145, vehiclesInspected:218, driversInspected:145, driverPoints:3, vehiclePoints:58, totalInspectionPoints:60.06, setThreshold:58.37 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:9,points:23}, {events:7,points:22}, {events:6,points:16} ] },
  { reportDate:'2025-08-19', periodLabel:'Aug 19/25', rating:28.71, colContrib:2.45, conContrib:4.70, insContrib:21.56, colPctOfThresh:6.13, conPctOfThresh:11.75, insPctOfThresh:107.80, collisionEvents:22, convictionEvents:21, oosOverall:36.36, oosVehicle:45.45, oosDriver:3.90, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:16, totalCollisionPoints:12, convictionPoints:53,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:18 },
    convictionDetails:{ withPoints:17, notPointed:4, driver:11, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:57,oosCount:26}, level2:{count:43,oosCount:18}, level3:{count:36,oosCount:6}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:143, vehiclesInspected:215, driversInspected:143, driverPoints:3, vehiclePoints:61, totalInspectionPoints:63.06, setThreshold:58.50 },
    collisionBreakdown:[ {events:8,points:5}, {events:7,points:4}, {events:7,points:3} ],
    convictionBreakdown:[ {events:9,points:21}, {events:7,points:19}, {events:5,points:13} ] },
  { reportDate:'2025-08-20', periodLabel:'Aug 20/25', rating:29.67, colContrib:2.74, conContrib:5.02, insContrib:21.91, colPctOfThresh:6.85, conPctOfThresh:12.55, insPctOfThresh:109.55, collisionEvents:24, convictionEvents:23, oosOverall:36.36, oosVehicle:45.45, oosDriver:3.90, trucks:130, onMiles:16388058, canadaMiles:666469,  totalMiles:17054528, collWithPoints:6, collWithoutPoints:18, totalCollisionPoints:14, convictionPoints:59,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:20 },
    convictionDetails:{ withPoints:19, notPointed:4, driver:13, vehicle:6, load:2, other:2 },
    levelStats:{ level1:{count:58,oosCount:26}, level2:{count:43,oosCount:18}, level3:{count:36,oosCount:6}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:144, vehiclesInspected:216, driversInspected:144, driverPoints:3, vehiclePoints:62, totalInspectionPoints:64.06, setThreshold:58.48 },
    collisionBreakdown:[ {events:9,points:6}, {events:8,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:9,points:22}, {events:8,points:21}, {events:6,points:16} ] },
  { reportDate:'2025-10-22', periodLabel:'Oct 22/25', rating:25.62, colContrib:2.39, conContrib:3.06, insContrib:20.17, colPctOfThresh:5.98, conPctOfThresh:7.65,  insPctOfThresh:100.85, collisionEvents:22, convictionEvents:35, oosOverall:31.94, oosVehicle:41.67, oosDriver:4.17, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5, collWithoutPoints:17, totalCollisionPoints:12, convictionPoints:35,
    collisionDetails:{ fatal:0, personalInjury:4, propertyDamage:18 },
    convictionDetails:{ withPoints:29, notPointed:6, driver:19, vehicle:9, load:4, other:3 },
    levelStats:{ level1:{count:56,oosCount:23}, level2:{count:42,oosCount:15}, level3:{count:35,oosCount:5}, level4:{count:5,oosCount:2}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:141, vehiclesInspected:212, driversInspected:141, driverPoints:3, vehiclePoints:57, totalInspectionPoints:59.06, setThreshold:58.56 },
    collisionBreakdown:[ {events:8,points:5}, {events:7,points:4}, {events:7,points:3} ],
    convictionBreakdown:[ {events:13,points:13}, {events:12,points:13}, {events:10,points:9} ] },
  { reportDate:'2026-01-02', periodLabel:'Jan 2/26',  rating:20.98, colContrib:2.39, conContrib:2.81, insContrib:15.78, colPctOfThresh:5.98, conPctOfThresh:7.03,  insPctOfThresh:78.90,  collisionEvents:21, convictionEvents:14, oosOverall:29.11, oosVehicle:38.46, oosDriver:3.80, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5, collWithoutPoints:16, totalCollisionPoints:12, convictionPoints:32,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:18 },
    convictionDetails:{ withPoints:11, notPointed:3, driver:8,  vehicle:3, load:2, other:1 },
    levelStats:{ level1:{count:55,oosCount:21}, level2:{count:41,oosCount:14}, level3:{count:35,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:138, vehiclesInspected:207, driversInspected:138, driverPoints:2, vehiclePoints:43, totalInspectionPoints:44.38, setThreshold:56.25 },
    collisionBreakdown:[ {events:8,points:5}, {events:7,points:4}, {events:6,points:3} ],
    convictionBreakdown:[ {events:6,points:12}, {events:5,points:11}, {events:3,points:9} ] },
  { reportDate:'2026-02-02', periodLabel:'Feb 2/26',  rating:22.31, colContrib:2.81, conContrib:3.00, insContrib:16.49, colPctOfThresh:7.03, conPctOfThresh:7.50,  insPctOfThresh:82.45,  collisionEvents:23, convictionEvents:14, oosOverall:30.00, oosVehicle:42.00, oosDriver:3.75, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:6, collWithoutPoints:17, totalCollisionPoints:14, convictionPoints:34,
    collisionDetails:{ fatal:0, personalInjury:3, propertyDamage:20 },
    convictionDetails:{ withPoints:11, notPointed:3, driver:8,  vehicle:3, load:2, other:1 },
    levelStats:{ level1:{count:56,oosCount:22}, level2:{count:42,oosCount:15}, level3:{count:35,oosCount:5}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:140, vehiclesInspected:210, driversInspected:140, driverPoints:2, vehiclePoints:46, totalInspectionPoints:47.38, setThreshold:57.46 },
    collisionBreakdown:[ {events:8,points:6}, {events:8,points:5}, {events:7,points:3} ],
    convictionBreakdown:[ {events:6,points:13}, {events:5,points:12}, {events:3,points:9} ] },
  { reportDate:'2026-04-02', periodLabel:'Apr 2/26',  rating:21.81, colContrib:2.81, conContrib:2.16, insContrib:16.84, colPctOfThresh:7.03, conPctOfThresh:5.40,  insPctOfThresh:84.20,  collisionEvents:18, convictionEvents:11, oosOverall:28.50, oosVehicle:36.00, oosDriver:3.50, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5, collWithoutPoints:13, totalCollisionPoints:14, convictionPoints:24,
    collisionDetails:{ fatal:0, personalInjury:2, propertyDamage:16 },
    convictionDetails:{ withPoints:9,  notPointed:2, driver:6,  vehicle:3, load:1, other:1 },
    levelStats:{ level1:{count:55,oosCount:21}, level2:{count:41,oosCount:14}, level3:{count:34,oosCount:4}, level4:{count:4,oosCount:1}, level5:{count:3,oosCount:0} },
    inspectionStats:{ cvsaInspections:137, vehiclesInspected:205, driversInspected:137, driverPoints:2, vehiclePoints:46, totalInspectionPoints:47.38, setThreshold:56.27 },
    collisionBreakdown:[ {events:7,points:6}, {events:6,points:5}, {events:5,points:3} ],
    convictionBreakdown:[ {events:5,points:9}, {events:4,points:9}, {events:2,points:6} ] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Per-pull events generator. Produces a CvorInterventionEvent[] consistent with
// the pull's own breakdown / level / inspection-stat fields. Deterministic.
// ─────────────────────────────────────────────────────────────────────────────
const _addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

const _DRIVER_NAMES = ['SINGH, M', 'SHARMA, R', 'PATEL, A', 'GREWAL, J', 'DHILLON, K', 'BRAR, H', 'BAJWA, S', 'GILL, P'];
const _LOCATIONS   = ['HWY 401 Toronto, ON', 'HWY 400 Barrie, ON', 'HWY 7 Mississauga, ON', 'HWY 11 North Bay, ON', 'QEW Hamilton, ON', 'HWY 403 Brantford, ON', 'HWY 416 Ottawa, ON'];
const _MAKES       = ['VOLVO', 'FREIGHTLN', 'PETERBILT', 'KENWORTH', 'MACK', 'INTL', 'WESTERN'];
const _TIMES       = ['09:30', '13:45', '16:20', '08:15', '11:00', '14:30', '10:15'];
const _START_TIMES = ['09:00', '11:30', '13:15', '15:45', '08:30', '14:00', '10:30'];
const _END_TIMES   = ['09:45', '12:15', '13:55', '16:25', '09:10', '14:40', '11:10'];

function genEventsForPull(pull: CvorPeriodicReportSpec): CvorInterventionEvent[] {
  const events: CvorInterventionEvent[] = [];
  const reportDate = new Date(pull.reportDate);
  const stamp      = pull.reportDate.replace(/-/g, '');

  // ── Collisions ─────────────────────────────────────────────────────────────
  let cIdx = 0;
  let fatalRem = pull.collisionDetails.fatal;
  let piRem    = pull.collisionDetails.personalInjury;
  let pdRem    = pull.collisionDetails.propertyDamage;
  let withPtsRem = pull.collWithPoints;

  pull.collisionBreakdown.forEach((slice, periodIdx) => {
    const periodEnd = new Date(reportDate);
    periodEnd.setMonth(periodEnd.getMonth() - periodIdx * 8);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 8);
    const periodDays = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000));

    let slicePtsRem = slice.points;
    let sliceWithPts = Math.min(withPtsRem, slice.events);

    for (let i = 0; i < slice.events; i++) {
      const dayOffset = Math.floor((i + 1) * periodDays / (slice.events + 1));
      const eventDate = _addDays(periodStart, dayOffset);

      let severity: 'fatal' | 'personalInjury' | 'propertyDamage' = 'propertyDamage';
      if (fatalRem > 0)        { severity = 'fatal';          fatalRem--; }
      else if (piRem > 0)      { severity = 'personalInjury'; piRem--;    }
      else if (pdRem > 0)      { severity = 'propertyDamage'; pdRem--;    }

      // Distribute slice.points across the first sliceWithPts events
      let points = 0;
      if (sliceWithPts > 0 && slicePtsRem > 0) {
        const remainingWithPts = sliceWithPts;
        points = Math.max(1, Math.min(6, Math.ceil(slicePtsRem / remainingWithPts)));
        if (sliceWithPts === 1) points = slicePtsRem; // last with-points event mops up the rest
        points = Math.min(points, slicePtsRem);
        slicePtsRem -= points;
        sliceWithPts--;
        withPtsRem--;
      }

      const collisionClass =
        severity === 'fatal'           ? 'CLASS-FATAL' :
        severity === 'personalInjury'  ? 'CLASS-INJURY' :
                                         'CLASS-PROPERTY DAMAGE ONLY';

      events.push({
        id:                          `${stamp}-coll-${cIdx}`,
        type:                        'collision',
        date:                        eventDate.toISOString().split('T')[0],
        time:                        _TIMES[cIdx % _TIMES.length],
        ticket:                      `COLL-${stamp}-${String(cIdx).padStart(3, '0')}`,
        location:                    _LOCATIONS[cIdx % _LOCATIONS.length],
        driverName:                  _DRIVER_NAMES[cIdx % _DRIVER_NAMES.length],
        driverLicence:               `D${String(1000000 + cIdx * 137).slice(0, 7)}-ON`,
        driverLicenceJurisdiction:   'ON',
        vehicle1:                    { make: _MAKES[cIdx % _MAKES.length], unit: `T${100 + cIdx}`, plate: `PR${4000 + cIdx * 7}`, jurisdiction: 'CAON' },
        pointsTotal:                 points,
        collision: {
          collisionClass,
          jurisdiction:    'CAON',
          vehicleAction:   'VEH ACTN-CHANGING LANES',
          vehicleCondition:'VEH COND-NO APPARENT DEFECT',
          driverAction:    severity === 'fatal' ? 'DR ACT-FAILED TO YIELD' : 'DR ACT-IMPROPER LANE CHANGE',
          driverCondition: 'DR COND-NORMAL',
          driverCharged:   points > 0 ? 'Y' : 'N',
          points,
          microfilm:       `MF${stamp.slice(2)}-${String(cIdx).padStart(4, '0')}`,
        },
      });
      cIdx++;
    }
  });

  // ── Convictions ────────────────────────────────────────────────────────────
  let vIdx = 0;
  let drvRem   = pull.convictionDetails.driver;
  let vehRem   = pull.convictionDetails.vehicle;
  let loadRem  = pull.convictionDetails.load;
  let otherRem = pull.convictionDetails.other;
  let convWithPtsRem = pull.convictionDetails.withPoints;

  pull.convictionBreakdown.forEach((slice, periodIdx) => {
    const periodEnd = new Date(reportDate);
    periodEnd.setMonth(periodEnd.getMonth() - periodIdx * 8);
    const periodStart = new Date(periodEnd);
    periodStart.setMonth(periodStart.getMonth() - 8);
    const periodDays = Math.max(1, Math.floor((periodEnd.getTime() - periodStart.getTime()) / 86400000));

    let slicePtsRem = slice.points;
    let sliceWithPts = Math.min(convWithPtsRem, slice.events);

    for (let i = 0; i < slice.events; i++) {
      const dayOffset = Math.floor((i + 1) * periodDays / (slice.events + 1));
      const eventDate = _addDays(periodStart, dayOffset);

      let category: 'driver' | 'vehicle' | 'load' | 'other' = 'other';
      if      (drvRem   > 0) { category = 'driver';  drvRem--;   }
      else if (vehRem   > 0) { category = 'vehicle'; vehRem--;   }
      else if (loadRem  > 0) { category = 'load';    loadRem--;  }
      else                   { category = 'other';   otherRem--; }

      let points = 0;
      if (sliceWithPts > 0 && slicePtsRem > 0) {
        points = Math.max(1, Math.min(6, Math.ceil(slicePtsRem / sliceWithPts)));
        if (sliceWithPts === 1) points = slicePtsRem;
        points = Math.min(points, slicePtsRem);
        slicePtsRem -= points;
        sliceWithPts--;
        convWithPtsRem--;
      }

      const offence =
        category === 'driver'  ? 'HTA s.128 - Speeding' :
        category === 'vehicle' ? 'HTA s.84 - Defective brakes' :
        category === 'load'    ? 'HTA s.111 - Improperly secured load' :
                                 'HTA s.74 - Other';

      events.push({
        id:                          `${stamp}-conv-${vIdx}`,
        type:                        'conviction',
        date:                        eventDate.toISOString().split('T')[0],
        time:                        _TIMES[vIdx % _TIMES.length],
        ticket:                      `CONV-${stamp}-${String(vIdx).padStart(3, '0')}`,
        location:                    _LOCATIONS[vIdx % _LOCATIONS.length],
        driverName:                  _DRIVER_NAMES[vIdx % _DRIVER_NAMES.length],
        driverLicence:               `D${String(2000000 + vIdx * 91).slice(0, 7)}-ON`,
        driverLicenceJurisdiction:   'ON',
        vehicle1:                    { make: _MAKES[vIdx % _MAKES.length], unit: `T${200 + vIdx}`, plate: `PR${5000 + vIdx * 7}`, jurisdiction: 'CAON' },
        pointsTotal:                 points,
        conviction: {
          convictionDate: _addDays(eventDate, 30).toISOString().split('T')[0],
          jurisdiction:   'CAON',
          chargedCarrier: category === 'load' ? 'Y' : 'N',
          microfilm:      `MF${stamp.slice(2)}-${String(vIdx).padStart(4, '0')}`,
          offence,
          ccmtaEquivalency: '',
          points,
        },
      });
      vIdx++;
    }
  });

  // ── Inspections ────────────────────────────────────────────────────────────
  const totalCvsa = pull.inspectionStats.cvsaInspections;
  const winStart  = new Date(reportDate);
  winStart.setMonth(winStart.getMonth() - 24);
  const winDays   = Math.max(1, Math.floor((reportDate.getTime() - winStart.getTime()) / 86400000));

  let drvPtsRem  = pull.inspectionStats.driverPoints;
  let vehPtsRem  = pull.inspectionStats.vehiclePoints;
  // Total OOS inspections across all levels (these absorb the points)
  let oosTotal =
    pull.levelStats.level1.oosCount + pull.levelStats.level2.oosCount +
    pull.levelStats.level3.oosCount + pull.levelStats.level4.oosCount +
    pull.levelStats.level5.oosCount;

  let iIdx = 0;
  const levels: { lvl: 1 | 2 | 3 | 4 | 5; stat: { count: number; oosCount: number } }[] = [
    { lvl: 1, stat: pull.levelStats.level1 },
    { lvl: 2, stat: pull.levelStats.level2 },
    { lvl: 3, stat: pull.levelStats.level3 },
    { lvl: 4, stat: pull.levelStats.level4 },
    { lvl: 5, stat: pull.levelStats.level5 },
  ];

  for (const ld of levels) {
    let levelOosRem = ld.stat.oosCount;
    for (let i = 0; i < ld.stat.count; i++) {
      const dayOffset = Math.floor((iIdx + 1) * winDays / (totalCvsa + 1));
      const eventDate = _addDays(winStart, dayOffset);
      const isOos = levelOosRem > 0;
      if (isOos) levelOosRem--;

      // Distribute vehicle / driver points across remaining OOS inspections.
      let vp = 0, dp = 0;
      if (isOos && oosTotal > 0) {
        if (vehPtsRem > 0) {
          vp = Math.max(0, Math.min(3, Math.ceil(vehPtsRem / oosTotal)));
          if (oosTotal === 1) vp = vehPtsRem;
          vp = Math.min(vp, vehPtsRem);
          vehPtsRem -= vp;
        }
        if (drvPtsRem > 0) {
          dp = Math.max(0, Math.min(2, Math.ceil(drvPtsRem / oosTotal)));
          if (oosTotal === 1) dp = drvPtsRem;
          dp = Math.min(dp, drvPtsRem);
          drvPtsRem -= dp;
        }
        oosTotal--;
      }

      events.push({
        id:                          `${stamp}-insp-${iIdx}`,
        type:                        'inspection',
        date:                        eventDate.toISOString().split('T')[0],
        startTime:                   _START_TIMES[iIdx % _START_TIMES.length],
        endTime:                     _END_TIMES[iIdx % _END_TIMES.length],
        cvir:                        `CVIR${stamp.slice(2)}${String(iIdx).padStart(4, '0')}`,
        location:                    _LOCATIONS[iIdx % _LOCATIONS.length],
        driverName:                  _DRIVER_NAMES[iIdx % _DRIVER_NAMES.length],
        driverLicence:               `D${String(3000000 + iIdx * 53).slice(0, 7)}-ON`,
        driverLicenceJurisdiction:   'ON',
        vehicle1:                    { make: _MAKES[iIdx % _MAKES.length], unit: `T${300 + iIdx}`, plate: `PR${6000 + iIdx * 7}`, jurisdiction: 'CAON' },
        level:                       ld.lvl,
        numVehicles:                 1,
        vehiclePoints:               vp,
        driverPoints:                dp,
        oosCount:                    isOos ? 1 : 0,
        totalDefects:                isOos ? 2 : (vp > 0 || dp > 0 ? 1 : 0),
        charged:                     isOos ? 'Y' : 'N',
        coDriver:                    'N',
        impoundment:                 'N',
      });
      iIdx++;
    }
  }

  // Sort by date descending so the events table opens with the newest first.
  events.sort((a, b) => b.date.localeCompare(a.date));
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-pull travelKm generator. Two rows summing to pull.totalMiles, with
// Estimated (recent 12 mo) + Actual (older 12 mo) period split.
// ─────────────────────────────────────────────────────────────────────────────
function genTravelKmForPull(pull: CvorPeriodicReportSpec): CvorTravelKmRow[] {
  const reportDate = new Date(pull.reportDate);
  const winStart   = new Date(reportDate);
  winStart.setMonth(winStart.getMonth() - 24);
  const periodMid  = new Date(reportDate);
  periodMid.setMonth(periodMid.getMonth() - 12);

  const halfMiles    = pull.totalMiles / 2;
  const ontarioRatio = pull.totalMiles > 0 ? pull.onMiles / pull.totalMiles : 0.96;
  const canadaRatio  = pull.totalMiles > 0 ? pull.canadaMiles / pull.totalMiles : 0.04;
  const drivers      = Math.round(pull.trucks * 1.15);

  // Recent half is the Estimated forward-looking projection; older half is Actual.
  return [
    {
      fromDate:        periodMid.toISOString().split('T')[0],
      toDate:          reportDate.toISOString().split('T')[0],
      type:            'Estimated',
      vehicles:        pull.trucks,
      doubleShifted:   0,
      totalVehicles:   pull.trucks,
      ontarioKm:       Math.round(halfMiles * ontarioRatio),
      restOfCanadaKm:  Math.round(halfMiles * canadaRatio),
      usMexicoKm:      0,
      drivers,
      totalKm:         Math.round(halfMiles),
    },
    {
      fromDate:        winStart.toISOString().split('T')[0],
      toDate:          periodMid.toISOString().split('T')[0],
      type:            'Actual',
      vehicles:        pull.trucks,
      doubleShifted:   0,
      totalVehicles:   pull.trucks,
      ontarioKm:       Math.round(halfMiles * ontarioRatio),
      restOfCanadaKm:  Math.round(halfMiles * canadaRatio),
      usMexicoKm:      0,
      drivers,
      totalKm:         Math.round(halfMiles),
    },
  ];
}

export const cvorPeriodicReports: CvorPeriodicReport[] = _cvorPullSpecs.map(spec => ({
  ...spec,
  events:   genEventsForPull(spec),
  travelKm: genTravelKmForPull(spec),
}));
