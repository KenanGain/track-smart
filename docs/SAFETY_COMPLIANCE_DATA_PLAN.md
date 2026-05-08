# Safety & Compliance Data — Implementation Plan

> Per-carrier safety/compliance seeding for the Inspections page (FMCSA SMS BASICs, Ontario CVOR, Canadian NSC). Drives the carrier-by-carrier rollout and documents the schema, derivation flow, and required fields.

## 1 · Why this exists

The Inspections page does **not** display safety scores from a static `basicStatus` array. The numbers shown on the FMCSA SMS BASIC cards (e.g. "Vehicle Maintenance · Msr: 52.6 · 99% · 20 inspections with violations | Weighted Severity: 1052") are **derived at render time** from the carrier's inspection records.

The flow is:

```
inspectionsData[]  ──►  computeStatusFromInspections()  ──►  basicStatus card
        ▲
        │
   per-carrier seed
   (drivers + assets)
```

So if a carrier has no realistic inspection records, every BASIC card reads "0 / 0% / No violations" or whatever the bare generator produces. To get the user-requested output we must seed **inspection records that reference the carrier's actual drivers and assets**, with believable category mix, severity weights, and OOS flags.

## 2 · Schema (must match exactly)

### 2.1 Inspection record (`Inspection`)

Source of truth: `src/pages/inspections/inspectionsData.ts` shape. A new record must have **all** of these fields:

```ts
{
  id:           string;          // e.g. "MIGRAHA00829" — region-prefixed
  date:         string;          // "YYYY-MM-DD"
  state:        string;          // "MI", "TX", "ON" …
  driverId:     string;          // MUST reference an existing carrier driver id
  driver:       string;          // driver display name
  driverLicense:string;          // free-form — real license format optional
  vehiclePlate: string;          // MUST reference a real plate from the carrier's assets
  vehicleType:  "Truck" | "Trailer";
  assetId:      string;          // MUST reference an existing carrier asset id
  level:        "Level 1" | "Level 2" | "Level 3" | "Level 5" | "Level 6";
  startTime:    string;          // "HH:MM"
  endTime:      string;          // "HH:MM"
  location:     { city: string; province: string; raw: string };
  smsPoints:    { vehicle: number; driver: number; carrier: number };
  isClean:      boolean;
  hasOOS:       boolean;
  powerUnitDefects: string | null;
  trailerDefects:   string | null;
  severityRate: number;          // average violation severity for THIS inspection
  hasVehicleViolations: boolean;
  hasDriverViolations:  boolean;
  units: Array<{ type: string; make: string; license: string; vin: string }>;
  violationSummary: Record<string, number>;     // per-category counts
  oosSummary: { driver: "PASSED" | "FAILED"; vehicle: "PASSED" | "FAILED"; total: number };
  violations: Array<Violation>;
  // Canadian inspections may also carry:
  cvorPoints?: { vehicle: number; driver: number; cvor: number };
  fineAmount?: number;
  currency?:   "USD" | "CAD";
}
```

### 2.2 Violation record (`Violation`)

```ts
{
  code:               string;    // e.g. "393.45B2-B"
  category:           BasicCategory;
  description:        string;
  subDescription:     string;
  severity:           number;    // 1–10
  weight:             number;    // peer-weight multiplier (typically 3)
  points:             number;    // severity × weight
  oos:                boolean;
  driverRiskCategory: 1 | 2 | 3;
}
```

`category` ∈ {`"Unsafe Driving"`, `"Crash Indicator"`, `"Hours-of-service Compliance"`, `"Vehicle Maintenance"`, `"Controlled Substances"`, `"Hazmat compliance"`, `"Driver Fitness"`, `"Others"`}.

## 3 · How the BASIC card numbers are computed (read this first)

`InspectionsPage.tsx` derives each BASIC line as follows:

```
For each category:
  numInsp           = count of inspections that have ≥1 violation in this category
  totalWeightedSev  = Σ over those inspections of (max severity × weight) per category
  measure           = totalWeightedSev / numInsp   (rounded to 2 dp)
  percentile        = bucketed lookup against per-category peer thresholds
                       (p50, p65, p75, p80, p90, p95) — falls to "N/A" when numInsp < 3
  alert             = percentile parsed and ≥ csaThresholds.critical (default 80)
  details           = "No violations"                                    if numInsp == 0
                      "< 3 inspections with violations (X found)"        if 1 ≤ numInsp < 3
                      "{numInsp} inspections with violations | Weighted Severity: {totalWeightedSev}"
```

So to produce the user's example values:

| Category                    | Required `numInsp` | Required Σ weighted severity |
| --- | --- | --- |
| Unsafe Driving              | 5  | 84  |
| Crash Indicator             | 0  | —   |
| Hours-of-service Compliance | 11 | 215 |
| Vehicle Maintenance         | 20 | 1052|
| Controlled Substances       | 2  | 9 (sub-3, shows "< 3 inspections") |
| Hazmat compliance           | 2  | 18  |
| Driver Fitness              | 2  | 12  |

Inspection records must distribute violations so those category totals fall out naturally.

## 4 · CVOR derivation (Canadian carriers)

For Ontario carriers the same inspection list also drives the CVOR analysis:

```
cvorAnalysis = {
  rating:             collisions.percentage + convictions.percentage + inspections.percentage
  collisions:  { percentage, weight: 40 }
  convictions: { percentage, weight: 40 }
  inspections: { percentage, weight: 20 }
  counts:      { collisions, convictions, oosOverall, oosVehicle, oosDriver, trucks, miles… }
  collisionDetails / convictionDetails: granular splits
}
```

For a clean per-carrier data set we'll seed:
- The `cvorAnalysis` block on the Carrier Profile (already present via `CARRIER_PROFILE_OVERRIDES` from the previous batch).
- A list of CVOR-flavoured inspection records (`cvorPoints` instead of `smsPoints`).
- `cvorPeriodicReports`, `cvorTravelKm`, `cvorInterventionEvents` slices so the CVOR PDF report generator has real data to draw from.

## 5 · NSC derivation (other Canadian provinces)

The NSC (AB / BC / PE / NS) profiles are a **snapshot** rather than a derivation. They take the form `NscPerformanceCardProps` (Alberta), `NscBcCarrierProfileProps` (BC), and the lighter PE / NS shapes. These are already auto-generated per-carrier via the `getNscXxProfileFor()` helpers, but we'll add hand-curated overrides for carriers that need realistic, screenshot-grade values.

## 6 · Driver / Asset linkage rule

**Every** inspection record must reference real items from the carrier's roster:

- `driverId` ∈ output of `getDriversForAccount(accountId)`
- `driver` = matching driver's `firstName + " " + lastName`
- `driverLicense` = matching driver's license number (or generated based on license state)
- `assetId` ∈ output of `getAssetsForAccount(accountId)`
- `vehiclePlate` = matching asset's `plateNumber`
- `vehicleType` = matching asset's `assetType`
- `units[].vin` = matching asset's `vin`
- `units[].make` = matching asset's `make`
- `units[].license` = `${plateNumber} (${plateJurisdiction})`

This means inspection records are **late-bound**: they're generated at module load after the driver and asset registries exist.

## 7 · File layout

```
src/
  data/
    carrier-safety-data.ts           ← already exists; gets new override hook
    carrier-inspections.data.ts      ← NEW · per-carrier inspection generator + override map
    carrier-cvor-data.ts             ← NEW · per-carrier CVOR periodic / km / events overrides
    carrier-safety-overrides.data.ts ← NEW · NSC AB/BC/PE/NS override maps
docs/
  SAFETY_COMPLIANCE_DATA_PLAN.md     ← this file
```

The new files export:

```ts
// carrier-inspections.data.ts
export function getInspectionsForCarrier(accountId: string): Inspection[];
export const CARRIER_INSPECTION_OVERRIDES: Record<string, Inspection[]>;

// carrier-cvor-data.ts
export const CARRIER_CVOR_PERIODIC_OVERRIDES: Record<string, CvorPeriodicReport[]>;
export const CARRIER_CVOR_TRAVEL_OVERRIDES:   Record<string, CvorTravelKmRow[]>;
export const CARRIER_CVOR_EVENT_OVERRIDES:    Record<string, CvorInterventionEvent[]>;

// carrier-safety-overrides.data.ts
export const NSC_AB_OVERRIDES: Record<string, NscPerformanceCardProps>;
export const NSC_BC_OVERRIDES: Record<string, NscBcCarrierProfileProps>;
export const NSC_PE_OVERRIDES: Record<string, PeProfile>;
export const NSC_NS_OVERRIDES: Record<string, NsProfile>;
```

The existing `carrier-safety-data.ts` helpers (`getInspectionsFor`, `getCvorPeriodicReportsFor`, `getNscAbProfileFor`, …) now check the override maps first and fall through to the existing slice/generator logic when no override is registered.

## 8 · Per-carrier inspection generator

The generator is deterministic — same `accountId` → same inspection list every reload — and takes the carrier's roster as input.

```ts
function buildInspectionsForCarrier(accountId: string, profile: {
  unsafe: number;       // # inspections with Unsafe Driving violations
  hos: number;          // # with HOS violations
  vehMaint: number;     // # with Vehicle Maintenance violations
  controlled: number;   // # with Controlled Substances violations
  hazmat: number;       // # with Hazmat violations
  driverFit: number;    // # with Driver Fitness violations
  unsafeWeightedSev: number; // target Σ weighted severity for Unsafe
  hosWeightedSev: number;
  vehMaintWeightedSev: number;
  // …
  oosShare: number;     // fraction of inspections that are OOS
  level1Share: number;  // fraction at Level 1 (full inspection)
  cvorMode?: boolean;   // produce cvorPoints instead of smsPoints
}): Inspection[];
```

For each category we randomly distribute violations across the requested # of inspections so the total weighted severity hits the target.

## 9 · Per-carrier "compliance profile" presets

The numbers above (target inspection counts and severity totals per category) come from a small lookup keyed by accountId. Example presets:

```ts
const COMPLIANCE_PROFILE_PRESETS = {
  // Big US fleet, vehicle-maintenance trouble (matches user's example exactly).
  'acct-002': {
    regime: 'FMCSA',
    unsafe: 5,        unsafeWeightedSev:    84,
    crash: 0,
    hos: 11,          hosWeightedSev:      215,
    vehMaint: 20,     vehMaintWeightedSev: 1052,
    controlled: 2,    controlledWeightedSev: 9,
    hazmat: 2,        hazmatWeightedSev:    18,
    driverFit: 2,     driverFitWeightedSev: 12,
    oosShare: 0.18,
    level1Share: 0.55,
  },
  // Ontario carrier, satisfactory CVOR.
  'acct-003': {
    regime: 'CVOR',
    unsafe: 3,        unsafeWeightedSev:    36,
    crash: 0,
    hos: 6,           hosWeightedSev:       72,
    vehMaint: 14,     vehMaintWeightedSev: 320,
    controlled: 1,    controlledWeightedSev: 3,
    hazmat: 0,
    driverFit: 1,     driverFitWeightedSev:  4,
    oosShare: 0.21,
    level1Share: 0.62,
  },
};
```

These presets are the dial we tune for each carrier as the rollout proceeds.

## 10 · Rollout order

| Batch | Carriers | Regime focus |
| --- | --- | --- |
| 1 (done) | acct-002, acct-003 | Carrier-profile FMCSA + CVOR overrides only |
| 2 (this turn) | acct-002, acct-003 | Inspection records + CVOR slices wired into `getInspectionsFor` etc. |
| 3 | acct-004 (US/TX), acct-007 (CA/AB) | FMCSA + NSC AB |
| 4 | acct-009 (US/CO), acct-010 (US/FL) | FMCSA |
| 5 | acct-013 (US/CA), acct-018 (CA/BC) | FMCSA + NSC BC |
| 6 | acct-015 (CA/QC), acct-029 (CA/PE) | NSC QC, NSC PE |
| 7 | acct-019 (US/PA), acct-024 (US/AZ) | FMCSA |
| 8 | acct-026 (US/CO), acct-028 (US/LA) | FMCSA |
| 9 | acct-030 (US/CA), acct-006 (US/WA) | FMCSA |
| 10 | acct-011 (CA/AB), acct-027 (CA/NS) | NSC AB, NSC NS |

(15 + 15 carriers across 10 batches; 1–2 carriers per turn.)

## 11 · Acceptance criteria for each carrier

A carrier is considered "done" when:

1. `getInspectionsForCarrier(accountId)` returns ≥ 1 inspection per active BASIC category, with realistic severity totals.
2. Every inspection references a real `driverId` from `getDriversForAccount` and a real `assetId` from `getAssetsForAccount`.
3. The Inspections page renders the expected "{N} inspections with violations | Weighted Severity: {S}" message for at least Vehicle Maintenance and Hours-of-service.
4. For Ontario carriers, `cvorAnalysis` shows non-zero contributions and the CVOR PDF report can render without missing-data fallbacks.
5. For non-Ontario Canadian carriers, the matching NSC card shows hand-curated rather than auto-generated values.
6. `npm run build` (or `npx tsc -b`) is clean — no new TS errors introduced.

## 12 · No frontend changes

This rollout adds only **data** files and extends existing data exports. `InspectionsPage.tsx` and the Carrier Profile page are untouched. UI continues to read through the existing `getInspectionsFor`, `getCarrierProfileFor`, `getNscXxProfileFor` helpers; the new override maps are consulted inside those functions.
