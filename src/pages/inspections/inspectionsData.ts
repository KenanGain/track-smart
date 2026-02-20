export const SUMMARY_CATEGORIES = [
  "Vehicle Maintenance",
  "Unsafe Driving",
  "Hours-of-service Compliance",
  "Driver Fitness",
  "Hazmat compliance",
  "Controlled Substances",
  "Others"
];

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
  ]
};

// --- INSPECTION & CVOR DATA ---
export const inspectionsData = [
  {
    id: "MIGRAHA00829",
    date: "2025-02-06",
    state: "MI",
    driver: "MUTHUKUMARASOORIYAR, S.",
    vehiclePlate: "PA53989 (ON)",
    vehicleType: "TRUCK TRACTOR",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "TRUCK TRACTOR", make: "PTRB", license: "PA53989 (ON)", vin: "M94837197770625" },
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
    driver: "KARANPREET, SINGH",
    vehiclePlate: "PA79568 (ON)",
    vehicleType: "TRUCK TRACTOR",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "TRUCK TRACTOR", make: "UNKN", license: "PA79568 (ON)", vin: "K05370000930607" }
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
    driver: "MUTHUKUMARASOORIYAR, S.",
    vehiclePlate: "PA53989 (ON)",
    vehicleType: "TRUCK TRACTOR",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
    hasVehicleViolations: true,
    hasDriverViolations: true,
    units: [
      { type: "TRUCK TRACTOR", make: "UNKN", license: "PA53989 (ON)", vin: "M94837197770625" }
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
    driver: "MOHAMMED, MOHIUDDIN",
    vehiclePlate: "PA38966 (ON)",
    vehicleType: "TRUCK TRACTOR",
    level: "Level 3",
    isClean: true,
    hasOOS: false,
    hasVehicleViolations: false,
    hasDriverViolations: false,
    units: [
      { type: "TRUCK TRACTOR", make: "UNKN", license: "PA38966 (ON)", vin: "M61605605881122" }
    ],
    violationSummary: {},
    oosSummary: { driver: "PASSED", vehicle: "PASSED", total: 0 },
    violations: []
  },
  {
    id: "MICOPEK02873",
    date: "2024-10-08",
    state: "MI",
    driver: "KARANPREET, SINGH",
    vehiclePlate: "PA79568 (ON)",
    vehicleType: "TRUCK TRACTOR",
    level: "Level 2",
    isClean: false,
    hasOOS: false,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "TRUCK TRACTOR", make: "UNKN", license: "PA79568 (ON)", vin: "K05370000930607" }
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
    driver: "HANS, RAJ",
    vehiclePlate: "PA15366 (ON)",
    vehicleType: "TRUCK TRACTOR",
    level: "Level 1",
    isClean: false,
    hasOOS: true,
    hasVehicleViolations: true,
    hasDriverViolations: false,
    units: [
      { type: "TRUCK TRACTOR", make: "UNKN", license: "PA15366 (ON)", vin: "H04780000911012" }
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
  }
];
