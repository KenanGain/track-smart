import { MOCK_DRIVERS } from "@/data/mock-app-data";
import { VIOLATION_DATA } from "@/data/violations.data";
import type { Driver } from "@/data/mock-app-data";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ViolationRecord {
  id: string;
  date: string;            // ISO YYYY-MM-DD
  time: string;            // HH:mm (24-hr)
  driverId: string;
  driverName: string;
  driverType: string;
  driverExperience: string;
  assetId?: string;        // Linked vehicle ID
  assetName?: string;      // e.g. "TR-1049"
  locationState: string;
  locationCity?: string;
  locationStreet?: string;
  locationZip?: string;
  locationCountry?: string;
  location?: string;
  violationCode: string;
  violationDataId: string; // ID from VIOLATION_DATA (for full lookups)
  violationType: string;   // violationDescription from VIOLATION_DATA
  violationGroup: string;  // violationGroup from VIOLATION_DATA
  crashLikelihood: number; // from VIOLATION_DATA (capped at 100 for display)
  driverRiskCategory: number; // 1=High 2=Moderate 3=Lower
  isOos: boolean;
  result: 'Citation Issued' | 'Warning' | 'OOS Order' | 'Clean Inspection' | 'Under Review';
  // Money Fields
  fineAmount: number;
  expenseAmount: number;
  currency: 'USD' | 'CAD';
  // Deprecated: expenses (use expenseAmount instead or keep as alias)
  expenses: number;
  status: 'Open' | 'Closed' | 'Under Review';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** All violation items flattened from every category in VIOLATION_DATA */
export const ALL_VIOLATIONS = Object.values(VIOLATION_DATA.categories).flatMap(c => c.items);

/** Look up a violation definition by its id */
export const getViolation = (id: string) => ALL_VIOLATIONS.find(v => v.id === id);

/** Calculate driving experience from hiredDate */
const calcExperience = (driver: Driver): string => {
  const pd = (driver as any);
  if (pd.drivingExperience) return pd.drivingExperience;
  const years = Math.floor((Date.now() - new Date(driver.hiredDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  return years <= 0 ? "< 1 Year" : `${years} Year${years === 1 ? "" : "s"}`;
};

// ─── Scenario Table ────────────────────────────────────────────────────────────
//
// Each row links a real driver (by name) to a real violation (by VIOLATION_DATA id).
// When you add a new driver to MOCK_DRIVERS, add rows here to assign violations to them.
// When Settings / Violations definitions change, crash risk & description update automatically.
//
// Columns: [recordId, date, time, driverName, violationDataId, state, result, $expenses, status]

type Scenario = [
  string,
  string,
  string,
  string,
  string,
  string,
  ViolationRecord['result'],
  number,
  ViolationRecord['status']
];

const SCENARIOS: Scenario[] = [
  // ── John Smith  |  Long Haul Driver  |  DRV-2001  |  Chicago, IL ──────────
  ["V-2025-001", "2025-01-08", "06:30", "John Smith",
    "392_5c2_violating_oos_order_alcohol",          "IL", "OOS Order",       0,   "Closed"],
  ["V-2024-002", "2024-05-20", "14:45", "John Smith",
    "392_4a_driver_uses_or_possesses_drugs",        "TX", "Citation Issued", 650, "Closed"],
  ["V-2024-001", "2024-03-12", "08:15", "John Smith",
    "392_5a_alcohol_4hrs_prior_to_duty",            "MO", "Citation Issued", 500, "Open"],

  // ── Sarah Miller  |  Local Driver  |  DRV-2002  |  Dallas, TX ───────────-
  ["V-2024-010", "2024-07-17", "09:20", "Sarah Miller",
    "392_5c2_violating_oos_order_alcohol",          "TX", "OOS Order",       0,   "Under Review"],
  ["V-2024-003", "2024-04-03", "11:00", "Sarah Miller",
    "392_5a3_intoxicating_beverage_on_duty",        "TX", "Warning",         0,   "Closed"],

  // ── Mike Johnson  |  Owner Operator  |  DRV-2003  |  Miami, FL ──────────-
  ["V-2025-002", "2025-02-05", "17:00", "Mike Johnson",
    "382_115_a_failing_to_implement_a_drugalcohol_testing", "GA", "Warning", 0, "Open"],
  ["V-2023-001", "2023-09-14", "22:30", "Mike Johnson",
    "392_4a_driver_uses_or_possesses_drugs",        "FL", "Citation Issued", 850, "Closed"],

  // ── Elena Rodriguez  |  Driver Service/Lease  |  DRV-2004  |  Sacramento, CA
  ["V-2024-011", "2024-11-30", "07:45", "Elena Rodriguez",
    "392_4a_driver_uses_or_possesses_drugs",        "NV", "Citation Issued", 500, "Closed"],
  ["V-2024-004", "2024-06-22", "13:10", "Elena Rodriguez",
    "392_5a_alcohol_4hrs_prior_to_duty",            "CA", "Warning",         0,   "Closed"],

  // ── James Sullivan  |  Long Haul Driver  |  DRV-1001  |  Springfield, IL ─
  ["V-2025-003", "2025-01-19", "15:35", "James Sullivan",
    "392_4a_driver_uses_or_possesses_drugs",        "OH", "Citation Issued", 750, "Open"],
  ["V-2024-005", "2024-02-14", "10:50", "James Sullivan",
    "392_5c2_violating_oos_order_alcohol",          "IN", "OOS Order",       0,   "Closed"],
  ["V-2023-002", "2023-12-01", "03:20", "James Sullivan",
    "392_5a3_intoxicating_beverage_on_duty",        "IL", "Citation Issued", 400, "Closed"],
];

// ─── Build Records from Scenarios ─────────────────────────────────────────────

const buildRecords = (): ViolationRecord[] => {
  const driverMap = new Map<string, Driver>(MOCK_DRIVERS.map(d => [d.name, d]));
  const records: ViolationRecord[] = [];

  for (const [id, date, time, driverName, violationId, state, result, expenses, status] of SCENARIOS) {
    const driver = driverMap.get(driverName);
    const v      = getViolation(violationId);

    // Skip if either the driver or the violation no longer exists in the system
    if (!driver || !v) continue;

    records.push({
      id,
      date,
      time,
      driverId:           driver.id,
      driverName:         driver.name,
      driverType:         driver.driverType || "Company Driver",
      driverExperience:   calcExperience(driver),
      locationState:      state,
      violationCode:      v.violationCode,
      violationDataId:    violationId,
      violationType:      v.violationDescription,
      violationGroup:     v.violationGroup,
      // Cap display at 100; values >100 in VIOLATION_DATA indicate extreme risk
      crashLikelihood:    Math.min(v.crashLikelihoodPercent ?? 0, 100),
      driverRiskCategory: v.driverRiskCategory,
      isOos:              v.isOos,
      result,
      // Map legacy "expenses" from scenario to fineAmount for now
      // Map legacy "expenses" from scenario to fineAmount for now
      fineAmount: expenses, 
      expenseAmount: 0,
      currency: 'USD',
      expenses, // Keep as legacy or total
      status,
      // Default mock address data
      locationCity: 'Unknown City',
      locationStreet: 'Mile Marker 100',
      locationZip: '00000',
      locationCountry: 'US',
    });
  }

  // ── Auto-Generate Random Records for Volume Testing ──
  const VIOLATION_DEFS = ALL_VIOLATIONS;
  const CITIES = [
      { c: "Phoenix", s: "AZ" }, { c: "Sacramento", s: "CA" }, { c: "Denver", s: "CO" }, 
      { c: "Miami", s: "FL" }, { c: "Atlanta", s: "GA" }, { c: "Chicago", s: "IL" },
      { c: "Indianapolis", s: "IN" }, { c: "Des Moines", s: "IA" }, { c: "Kansas City", s: "KS" },
      { c: "Louisville", s: "KY" }, { c: "New Orleans", s: "LA" }, { c: "Detroit", s: "MI" },
      { c: "Minneapolis", s: "MN" }, { c: "St. Louis", s: "MO" }, { c: "Las Vegas", s: "NV" },
      { c: "Albuquerque", s: "NM" }, { c: "Columbus", s: "OH" }, { c: "Oklahoma City", s: "OK" },
      { c: "Portland", s: "OR" }, { c: "Philadelphia", s: "PA" }, { c: "Nashville", s: "TN" },
      { c: "Houston", s: "TX" }, { c: "Salt Lake City", s: "UT" }, { c: "Seattle", s: "WA" }
  ];

  for (let i = 0; i < 40; i++) {
      const driver = MOCK_DRIVERS[i % MOCK_DRIVERS.length];
      const v = VIOLATION_DEFS[Math.floor(Math.random() * VIOLATION_DEFS.length)];
      const loc = CITIES[Math.floor(Math.random() * CITIES.length)];
      
      // Random date in last 2 years
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - Math.floor(Math.random() * 730));
      const dateStr = dateObj.toISOString().split('T')[0];
      
      const timeStr = `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`;
      
      const possibleResults: ViolationRecord['result'][] = ['Citation Issued', 'Warning', 'Clean Inspection', 'OOS Order'];
      const res = possibleResults[Math.floor(Math.random() * possibleResults.length)];
      
      const fine = res === 'Citation Issued' || res === 'OOS Order' ? Math.floor(Math.random() * 800) + 100 : 0;
      const status: ViolationRecord['status'] = Math.random() > 0.3 ? 'Closed' : 'Open';

      if (!driver || !v) continue;

      records.push({
          id: `V-AUTO-${1000 + i}`,
          date: dateStr,
          time: timeStr,
          driverId: driver.id,
          driverName: driver.name,
          driverType: driver.driverType || "Company Driver",
          driverExperience: calcExperience(driver),
          locationState: loc.s,
          locationCity: loc.c,
          locationStreet: `I-${Math.floor(Math.random() * 99) + 1} Mile Marker ${Math.floor(Math.random() * 300)}`,
          locationZip: Math.floor(10000 + Math.random() * 90000).toString(),
          locationCountry: 'US',
          violationCode: v.violationCode,
          violationDataId: v.id,
          violationType: v.violationDescription,
          violationGroup: v.violationGroup,
          crashLikelihood: Math.min(v.crashLikelihoodPercent ?? 0, 100),
          driverRiskCategory: v.driverRiskCategory, // Ensure this exists on v
          isOos: v.isOos,
          result: res,
          fineAmount: fine,
          expenseAmount: 0,
          currency: 'USD',
          expenses: fine,
          status,
      });
  }

  // Newest first
  return records.sort((a, b) => (a.date < b.date ? 1 : -1));
};


export const MOCK_VIOLATION_RECORDS: ViolationRecord[] = buildRecords();
