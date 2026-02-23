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
        onMiles: 1377520,
        canadaMiles: 373323,
        totalMiles: 2237881,
        collisionPointsWithPoints: 5,
        collisionPointsWithoutPoints: 0,
        totalCollisionPoints: 10,
        convictionPoints: 26,
    }
  }
};


// --- INSPECTION & CVOR DATA ---
export const inspectionsData = [
  {
    id: "MIGRAHA00829",
    date: "2025-02-06",
    state: "MI",
    driverId: "DRV-2001",
    driver: "John Smith",
    vehiclePlate: "P-7762",
    vehicleType: "Truck",
    assetId: "a1",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
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
    date: "2025-01-07",
    state: "MI",
    driverId: "DRV-2002",
    driver: "Sarah Miller",
    vehiclePlate: "ABC-1234",
    vehicleType: "Trailer",
    assetId: "a2",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
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
    date: "2024-12-26",
    state: "MI",
    driverId: "DRV-1001",
    driver: "James Sullivan",
    vehiclePlate: "TANK-01",
    vehicleType: "Truck",
    assetId: "a6",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
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
    date: "2024-10-28",
    state: "MI",
    driverId: "DRV-1002",
    driver: "Maria Rodriguez",
    vehiclePlate: "COLD-88",
    vehicleType: "Trailer",
    assetId: "a5",
    level: "Level 3",
    isClean: true,
    hasOOS: false,
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
    date: "2024-10-08",
    state: "MI",
    driverId: "DRV-2003",
    driver: "Mike Johnson",
    vehiclePlate: "WRK-4422",
    vehicleType: "Non-CMV Vehicle",
    assetId: "a4",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
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
    id: "MIGRAHA00524",
    date: "2024-04-10",
    state: "MI",
    driverId: "DRV-2004",
    driver: "Elena Rodriguez",
    vehiclePlate: "HAUL-55",
    vehicleType: "Truck",
    assetId: "a3",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
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
    date: "2025-01-22",
    state: "TX",
    driverId: "DRV-1003",
    driver: "Robert Chen",
    vehiclePlate: "BIG-RIG7",
    vehicleType: "Truck",
    assetId: "a7",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
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
    date: "2025-02-01",
    state: "OH",
    driverId: "DRV-1004",
    driver: "Sarah Johnson",
    vehiclePlate: "FLT-409",
    vehicleType: "Truck",
    assetId: "a8",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
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
    date: "2024-11-15",
    state: "NY",
    driverId: "DRV-1005",
    driver: "Michael Brown",
    vehiclePlate: "NYC-321",
    vehicleType: "Truck",
    assetId: "a9",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
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
    date: "2024-09-05",
    state: "IL",
    driverId: "DRV-2001",
    driver: "John Smith",
    vehiclePlate: "P-7762",
    vehicleType: "Truck",
    assetId: "a1",
    level: "Level 3",
    isClean: false,
    hasOOS: false,
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
    date: "2024-08-18",
    state: "IN",
    driverId: "DRV-2002",
    driver: "Sarah Miller",
    vehiclePlate: "ABC-1234",
    vehicleType: "Trailer",
    assetId: "a2",
    level: "Level 2",
    isClean: true,
    hasOOS: false,
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
    date: "2024-07-30",
    state: "PA",
    driverId: "DRV-1002",
    driver: "Maria Rodriguez",
    vehiclePlate: "COLD-88",
    vehicleType: "Trailer",
    assetId: "a5",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
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
    date: "2024-06-12",
    state: "FL",
    driverId: "DRV-2003",
    driver: "Mike Johnson",
    vehiclePlate: "WRK-4422",
    vehicleType: "Non-CMV Vehicle",
    assetId: "a4",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
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
    date: "2025-01-30",
    state: "ON",
    driverId: "DRV-1001",
    driver: "James Sullivan",
    vehiclePlate: "TANK-01",
    vehicleType: "Truck",
    assetId: "a6",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "Mack", license: "TANK-01", vin: "2FMZA5147XBA98765" },
      { type: "Trailer", make: "Manac", license: "MNC-801 (ON)", vin: "2M5920241MW001234" }
    ],
    violationSummary: { "Vehicle Maintenance": 3, "Hazmat compliance": 2, "Unsafe Driving": 1 },
    oosSummary: { driver: "PASSED", vehicle: "FAILED", total: 2 },
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
    date: "2024-05-20",
    state: "CA",
    driverId: "DRV-1003",
    driver: "Robert Chen",
    vehiclePlate: "BIG-RIG7",
    vehicleType: "Truck",
    assetId: "a7",
    level: "Level 2",
    isClean: true,
    hasOOS: false,
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
    date: "2024-03-14",
    state: "MI",
    driverId: "DRV-1005",
    driver: "Michael Brown",
    vehiclePlate: "DET-777",
    vehicleType: "Truck",
    assetId: "a10",
    level: "Level 1",
    isClean: false,
    hasOOS: false,
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
    date: "2024-02-28",
    state: "TX",
    driverId: "DRV-2004",
    driver: "Elena Rodriguez",
    vehiclePlate: "HAUL-55",
    vehicleType: "Truck",
    assetId: "a3",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
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
    date: "2025-02-10",
    state: "ON",
    driverId: "DRV-1004",
    driver: "Sarah Johnson",
    vehiclePlate: "FLT-409",
    vehicleType: "Truck",
    assetId: "a8",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "Truck", make: "International", license: "FLT-409", vin: "3HSDJAPR5CN601234" },
      { type: "SEMI-TRAILER", make: "Stoughton", license: "STN-220 (ON)", vin: "2HSFHAHT1SC098765" }
    ],
    violationSummary: { "Vehicle Maintenance": 7, "Hours-of-service Compliance": 2, "Driver Fitness": 1 },
    oosSummary: { driver: "FAILED", vehicle: "FAILED", total: 5 },
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
  }
];
