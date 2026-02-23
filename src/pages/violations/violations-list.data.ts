import { MOCK_DRIVERS } from "@/data/mock-app-data";
import { VIOLATION_DATA } from "@/data/violations.data";
import { INITIAL_ASSETS } from "@/pages/assets/assets.data";
import { inspectionsData } from "@/pages/inspections/inspectionsData";
import type { Driver } from "@/data/mock-app-data";
import type { Asset } from "@/pages/assets/assets.data";

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
  inspectionId?: string;   // If set, this violation came from an inspection event
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
// Each row is an INSPECTION event that links:
//   • A real driver  (by name  → resolved from MOCK_DRIVERS)
//   • A real asset   (by id    → resolved from INITIAL_ASSETS)
//   • A real violation definition (by VIOLATION_DATA id → resolved from settings)
//
// This is the single source of truth — driver, asset, and violation all live together.
// When Settings / Violations definitions change, crash risk & description update automatically.
//
// Columns: [recordId, date, time, driverName, assetId, violationDataId, state, result, $fine, status]

type Scenario = [
  string,                     // recordId
  string,                     // date (ISO)
  string,                     // time (HH:mm)
  string,                     // driverName (matched to MOCK_DRIVERS)
  string | undefined,         // assetId   (matched to INITIAL_ASSETS) — undefined = no vehicle linked
  string,                     // violationDataId (from VIOLATION_DATA / settings)
  ViolationRecord['result'],  // result
  number,                     // fine/expenses amount
  ViolationRecord['status'],  // status
  string,                     // state
];

const SCENARIOS: Scenario[] = [
  // ── John Smith  |  Long Haul Driver  |  DRV-2001  |  TR-1049 Freightliner Cascadia ──
  ["V-2025-001", "2025-01-08", "06:30", "John Smith",    "a1",
    "392_5c2_violating_oos_order_alcohol",          "OOS Order",       0,   "Closed",  "IL"],
  ["V-2024-002", "2024-05-20", "14:45", "John Smith",    "a1",
    "392_4a_driver_uses_or_possesses_drugs",        "Citation Issued", 650, "Closed",  "TX"],
  ["V-2024-001", "2024-03-12", "08:15", "John Smith",    "a1",
    "392_5a_alcohol_4hrs_prior_to_duty",            "Citation Issued", 500, "Open",    "MO"],

  // ── Sarah Miller  |  Local Driver  |  DRV-2002  |  TR-2088 Kenworth T680 ─────────
  ["V-2024-010", "2024-07-17", "09:20", "Sarah Miller",  "a2",
    "392_5c2_violating_oos_order_alcohol",          "OOS Order",       0,   "Under Review", "TX"],
  ["V-2024-003", "2024-04-03", "11:00", "Sarah Miller",  "a2",
    "392_5a3_intoxicating_beverage_on_duty",        "Warning",         0,   "Closed",  "TX"],

  // ── Mike Johnson  |  Owner Operator  |  DRV-2003  |  TR-4102 Chevrolet Silverado ──
  ["V-2025-002", "2025-02-05", "17:00", "Mike Johnson",  "a4",
    "382_115_a_failing_to_implement_a_drugalcohol_testing", "Warning", 0,   "Open",    "GA"],
  ["V-2023-001", "2023-09-14", "22:30", "Mike Johnson",  "a4",
    "392_4a_driver_uses_or_possesses_drugs",        "Citation Issued", 850, "Closed",  "FL"],

  // ── Elena Rodriguez  |  Driver Service/Lease  |  DRV-2004  |  TR-3055 Peterbilt 389 ─
  ["V-2024-011", "2024-11-30", "07:45", "Elena Rodriguez", "a3",
    "392_4a_driver_uses_or_possesses_drugs",        "Citation Issued", 500, "Closed",  "NV"],
  ["V-2024-004", "2024-06-22", "13:10", "Elena Rodriguez", "a3",
    "392_5a_alcohol_4hrs_prior_to_duty",            "Warning",         0,   "Closed",  "CA"],

  // ── James Sullivan  |  Long Haul Driver  |  DRV-1001  |  TR-6001 Mack Granite ─────
  ["V-2025-003", "2025-01-19", "15:35", "James Sullivan", "a6",
    "392_4a_driver_uses_or_possesses_drugs",        "Citation Issued", 750, "Open",    "OH"],
  ["V-2024-005", "2024-02-14", "10:50", "James Sullivan", "a6",
    "392_5c2_violating_oos_order_alcohol",          "OOS Order",       0,   "Closed",  "IN"],
  ["V-2023-002", "2023-12-01", "03:20", "James Sullivan", "a6",
    "392_5a3_intoxicating_beverage_on_duty",        "Citation Issued", 400, "Closed",  "IL"],

  // ── Maria Rodriguez  |  Local Driver  |  DRV-1002  |  TR-5200 Great Dane Reefer ───
  ["V-2024-020", "2024-08-12", "10:00", "Maria Rodriguez", "a5",
    "392_5a_alcohol_4hrs_prior_to_duty",            "Citation Issued", 300, "Closed",  "TX"],

  // ── Robert Chen  |  Long Haul Driver  |  DRV-1003  |  TR-1049 Freightliner Cascadia
  ["V-2024-021", "2024-09-25", "16:30", "Robert Chen",   "a1",
    "392_5c2_violating_oos_order_alcohol",          "Warning",         0,   "Closed",  "CA"],

  // ── Sarah Johnson  |  Long Haul Driver  |  DRV-1004  |  TR-2088 Kenworth T680 ─────
  ["V-2024-022", "2024-10-14", "08:45", "Sarah Johnson", "a2",
    "392_4a_driver_uses_or_possesses_drugs",        "Citation Issued", 600, "Open",    "FL"],

  // ── Michael Brown  |  Local Driver  |  DRV-1005  |  TR-3055 Peterbilt 389 ──────────
  ["V-2024-023", "2024-11-03", "14:20", "Michael Brown", "a3",
    "382_115_a_failing_to_implement_a_drugalcohol_testing", "Warning", 0,   "Closed",  "OH"],
];

// ─── Build Records from Scenarios ─────────────────────────────────────────────
//
// Resolves each scenario row into a full ViolationRecord by looking up:
//   • Driver  → from MOCK_DRIVERS (by name)
//   • Asset   → from INITIAL_ASSETS (by id)
//   • Violation definition → from VIOLATION_DATA / settings (by id)
//
// The result carries driver + asset + violation data together in every record.

const assetMap = new Map<string, Asset>(INITIAL_ASSETS.map(a => [a.id, a]));

/** Format an asset's display name: "TR-1049" */
const assetDisplayName = (asset: Asset | undefined): string | undefined =>
  asset ? asset.unitNumber : undefined;

const buildRecords = (): ViolationRecord[] => {
  const driverMap = new Map<string, Driver>(MOCK_DRIVERS.map(d => [d.name, d]));
  const records: ViolationRecord[] = [];

  for (const [id, date, time, driverName, assetId, violationId, result, expenses, status, state] of SCENARIOS) {
    const driver = driverMap.get(driverName);
    const v      = getViolation(violationId);

    // Skip if either the driver or the violation no longer exists in the system
    if (!driver || !v) continue;

    const asset = assetId ? assetMap.get(assetId) : undefined;

    records.push({
      id,
      date,
      time,
      driverId:           driver.id,
      driverName:         driver.name,
      driverType:         driver.driverType || "Company Driver",
      driverExperience:   calcExperience(driver),
      assetId:            asset?.id,
      assetName:          assetDisplayName(asset),
      locationState:      state,
      violationCode:      v.violationCode,
      violationDataId:    violationId,
      violationType:      v.violationDescription,
      violationGroup:     v.violationGroup,
      crashLikelihood:    Math.min(v.crashLikelihoodPercent ?? 0, 100),
      driverRiskCategory: v.driverRiskCategory,
      isOos:              v.isOos,
      result,
      fineAmount:   expenses,
      expenseAmount: 0,
      currency: 'USD',
      expenses,
      status,
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
      const asset = INITIAL_ASSETS[i % INITIAL_ASSETS.length];

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
          assetId: asset.id,
          assetName: asset.unitNumber,
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
          driverRiskCategory: v.driverRiskCategory,
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



// ─── Build Violation Records from Inspections Data ──────────────────────────
// Instead of hardcoding, we derive violation records directly from inspectionsData.
// This ensures the violations list always reflects what's in the inspections page.

const RISK_TO_CRASH: Record<number, number> = { 1: 85, 2: 45, 3: 15 };

const driverMapById = new Map(MOCK_DRIVERS.map(d => [d.id, d]));

const INSP_RECORDS: ViolationRecord[] = inspectionsData.flatMap(insp => {
  const driver = (insp as any).driverId ? driverMapById.get((insp as any).driverId) : undefined;
  const asset = (insp as any).assetId ? assetMap.get((insp as any).assetId) : undefined;

  return insp.violations.map((v, idx) => ({
    id: `VINSP-${insp.id}-${idx}`,
    date: insp.date,
    time: "12:00",
    locationState: insp.state,
    violationCode: v.code,
    violationDataId: `${v.code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_auto`,
    violationType: v.description,
    violationGroup: v.subDescription || v.category,
    crashLikelihood: RISK_TO_CRASH[v.driverRiskCategory] ?? 45,
    driverRiskCategory: v.driverRiskCategory,
    isOos: v.oos,
    result: (v.oos ? 'OOS Order' : 'Citation Issued') as ViolationRecord['result'],
    fineAmount: v.oos ? 500 : 200,
    expenseAmount: 0,
    currency: 'USD' as const,
    expenses: v.oos ? 500 : 200,
    status: 'Closed' as ViolationRecord['status'],
    driverId: (insp as any).driverId || '',
    driverName: insp.driver,
    driverType: driver?.driverType || "Company Driver",
    driverExperience: driver ? calcExperience(driver) : "N/A",
    locationCity: "Unknown City",
    locationStreet: "Inspection Station",
    locationZip: "00000",
    locationCountry: "US",
    assetId: asset?.id,
    assetName: asset?.unitNumber,
    inspectionId: insp.id,
  }));
});
// ─── All built records (scenarios + auto-generated) ─────────────────────────
const _builtRecords = buildRecords();

export const MOCK_VIOLATION_RECORDS: ViolationRecord[] = [..._builtRecords, ...INSP_RECORDS];


export interface AssetViolationRecord extends ViolationRecord {
  assetId: string;
  assetUnitNumber: string;
  assetMakeModel: string;
  assetPlate: string;
  assetType: string;
  linkedDriverId?: string;
  linkedDriverName?: string;
  crashLikelihoodPercent?: number;
}

// ─── Derive Asset Violation Records from the same built data ────────────────
// Every violation record that has an asset linked gets projected into an
// AssetViolationRecord as well — this is the "unified" bridge.
const _derivedAssetRecords: AssetViolationRecord[] = _builtRecords
  .filter(r => r.assetId)
  .map(r => {
    const asset = assetMap.get(r.assetId!);
    return {
      ...r,
      assetId: asset?.id || r.assetId!,
      assetUnitNumber: asset?.unitNumber || r.assetName || '',
      assetMakeModel: asset ? `${asset.make} ${asset.model} ${asset.year}` : '',
      assetPlate: asset?.plateNumber || '',
      assetType: asset?.assetType || '',
      linkedDriverId: r.driverId,
      linkedDriverName: r.driverName,
      crashLikelihoodPercent: r.crashLikelihood,
    };
  });

// ─── Build Asset Violation Records from Inspections Data ─────────────────────
// Mirrors INSP_RECORDS but adds the asset-specific fields for the Assets tab.
const INSP_ASSET_RECORDS: AssetViolationRecord[] = inspectionsData.flatMap(insp => {
  const driver = (insp as any).driverId ? driverMapById.get((insp as any).driverId) : undefined;
  const asset = (insp as any).assetId ? assetMap.get((insp as any).assetId) : undefined;
  if (!asset) return []; // skip inspections without a linked asset

  return insp.violations.map((v, idx) => ({
    id: `AVINSP-${insp.id}-${idx}`,
    date: insp.date,
    time: "12:00",
    locationState: insp.state,
    violationCode: v.code,
    violationDataId: `${v.code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_auto`,
    violationType: v.description,
    violationGroup: v.subDescription || v.category,
    crashLikelihood: RISK_TO_CRASH[v.driverRiskCategory] ?? 45,
    driverRiskCategory: v.driverRiskCategory,
    isOos: v.oos,
    result: (v.oos ? 'OOS Order' : 'Citation Issued') as ViolationRecord['result'],
    fineAmount: v.oos ? 500 : 200,
    expenseAmount: 0,
    currency: 'USD' as const,
    expenses: v.oos ? 500 : 200,
    status: 'Closed' as ViolationRecord['status'],
    driverId: (insp as any).driverId || '',
    driverName: insp.driver,
    driverType: driver?.driverType || "Company Driver",
    driverExperience: driver ? calcExperience(driver) : "N/A",
    locationCity: "Unknown City",
    locationStreet: "Inspection Station",
    locationZip: "00000",
    locationCountry: "US",
    assetId: asset.id,
    assetName: asset.unitNumber,
    assetUnitNumber: asset.unitNumber,
    assetMakeModel: `${asset.make} ${asset.model} ${asset.year}`,
    assetPlate: asset.plateNumber || '',
    assetType: asset.assetType || '',
    linkedDriverId: (insp as any).driverId || '',
    linkedDriverName: insp.driver,
    crashLikelihoodPercent: RISK_TO_CRASH[v.driverRiskCategory] ?? 45,
    inspectionId: insp.id,
  }));
});
export const MOCK_ASSET_VIOLATION_RECORDS: AssetViolationRecord[] = [
  ..._derivedAssetRecords,
  ...INSP_ASSET_RECORDS,
].sort((a, b) => (a.date < b.date ? 1 : -1));
