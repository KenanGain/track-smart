# 02 — Data Model

The authoritative schema is `cvor-extraction-response.schema.json` (JSON Schema draft-07). This document is a human-readable narrative of the same fields, with the **PDF source label** and **page number** for each.

---

## Top-level shape

```json
{
  "source":           { ... PDF metadata ... },
  "carrier":          { ... carrier identity (sink A) ... },
  "pull":             { ... per-pull metric (sink B) ... },
  "inspectionEvents": [ ... per-inspection events (sink C) ... ]
}
```

---

## `source` — PDF metadata (audit trail)

Lightweight metadata about the source PDF. Stored on the upload record so we can prove what was extracted.

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `fileName` | ✓ | (filename of upload) | |
| `orderNumber` | ✗ | p.1 — `Order #` | MTO order number (e.g. `06042001`) |
| `searchDate` | ✗ | p.1 — `Search Date and Time` | ISO 8601 datetime (e.g. `2026-04-02T15:42:00-04:00`) |
| `formVersion` | ✗ | every page footer | e.g. `SR-LV-029A (2021/10)` |
| `pageCount` | ✓ | (count) | |
| `extractedAt` | ✓ | (now()) | When your API processed the file |

---

## `carrier` — Carrier Identity (Sink A)

One-time, sticky. Populates the Carrier Profile identity card. All from page 1.

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `cvorNumber` | ✓ | `CVOR / RIN #` | 9 digits, format `XXX-XXX-XXX`. Strip dashes for storage. |
| `legalName` | ✓ | `Client Name` | Exact legal entity name |
| `operatingAs` | ✗ | `Operating As` | Trade / DBA name. Often blank. |
| `address.street` | ✗ | `Address` (line 1) | |
| `address.city` | ✗ | `Address` (line 2) | |
| `address.state` | ✗ | `Address` (line 2) | 2-letter province code |
| `address.zip` | ✗ | `Address` (line 2) | Canadian postal format `A1A 1A1` |
| `address.country` | ✗ | `Address` (line 2 or 3) | Default `Canada` |
| `phone` | ✗ | `Phone #` | |
| `mobile` | ✗ | `Mobile #` | |
| `fax` | ✗ | `Fax #` | |
| `email` | ✗ | `Email` | |
| `usDotNumber` | ✗ | `US DOT #` | Often blank for ON-only carriers |
| `cvorStatus` | ✓ | `CVOR Status` | One of: `Registered` / `Cancelled` / `Surrendered` / `Suspended` |
| `originalIssueDate` | ✓ | `Original Issue Date` | ISO date `YYYY-MM-DD` |
| `safetyRating` | ✓ | `Carrier Safety Rating` | One of: `Excellent` / `Satisfactory` / `Satisfactory-Unaudited` / `Conditional` / `Unsatisfactory` |
| `vehicleTypes` | ✓ | `Type of Commercial Vehicle` | Array, parsed from comma/slash list. Values: `Truck` / `Bus` / `School Bus` / `Tow` / `Coach` / `Other`. |
| `dangerousGoods` | ✓ | `Dangerous Goods` | `Yes`/`No` → boolean |

---

## `pull` — Per-Pull Metric (Sink B)

One record per uploaded PDF. Maps 1-to-1 to `CvorPeriodicReport` in our frontend.

### B.1 Pull header

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `reportDate` | ✓ | derived from `Search Date and Time` | The pull date. ISO date. |
| `periodLabel` | ✓ | derived | Display label, e.g. `"Apr 2/26"`. Format: `<Mmm> <D>/<YY>`. |
| `effectiveDate` | ✓ | `Start Date` | Current registration start |
| `expiryDate` | ✓ | `Expiry Date` | When current cert expires |
| `windowStart` | ✓ | derived: `reportDate − 24 months` | |
| `windowEnd` | ✓ | `= reportDate` | |

### B.2 Top-level rating (page 2)

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `rating` | ✓ | `Overall Violation Rate %` (page 2 footer of Performance Summary) | Composite R-Factor, e.g. `21.81` |

### B.3 R-Factor breakdown — Performance Summary table (page 2)

The Performance Summary is a 4-column table. Each row gives `% of set Threshold`, `% Weight`, `% Overall Contribution`. We need 6 numbers (2 per row) and the 7th is the Overall row.

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `colContrib` | ✓ | row `Collision` → `% Overall Contribution` | Weight = 40% |
| `colPctOfThresh` | ✓ | row `Collision` → `% of set Threshold` | |
| `conContrib` | ✓ | row `Conviction` → `% Overall Contribution` | Weight = 40% |
| `conPctOfThresh` | ✓ | row `Conviction` → `% of set Threshold` | |
| `insContrib` | ✓ | row `Inspection` → `% Overall Contribution` | Weight = 20% |
| `insPctOfThresh` | ✓ | row `Inspection` → `% of set Threshold` | |

**Sanity check:** `colContrib + conContrib + insContrib ≈ rating` (drift < 0.1).

### B.4 Event counts (page 1)

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `collisionEvents` | ✓ | `Total # of Collisions` | |
| `collWithPoints` | ✓ | `# of Collisions with points` | |
| `collWithoutPoints` | ✓ | `# of Collisions not pointed` | |
| `convictionEvents` | ✓ | `Total # of convictions` | |

### B.5 Points (page 2 / 3 — Breakdown by Kilometre Rate Change)

The Collision and Conviction Breakdown tables both end with a **`Total`** row. Pull `# of Points` from that row.

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `totalCollisionPoints` | ✓ | `Collision Breakdown by Kilometre Rate Change` → row `Total` → `# of Points` | |
| `convictionPoints` | ✓ | `Conviction Breakdown by Kilometre Rate Change` → row `Total` → `# of Points` | |

### B.6 OOS rates (page 2)

Already expressed as percentages by MTO.

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `oosOverall` | ✓ | `Overall Out of Service %` | |
| `oosVehicle` | ✓ | `Vehicle Out of Service %` | |
| `oosDriver`  | ✓ | `Driver Out of Service %` | |

### B.7 Fleet & travel (page 1)

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `trucks` | ✓ | `# of Commercial Vehicles` | Combined power units + trailers as MTO reports it |
| `drivers` | ✓ | `# of Drivers` | |
| `onMiles` | ✓ | `Ontario Kms Travelled` | **Stored as KILOMETRES** despite the field name. UI converts. |
| `canadaMiles` | ✓ | `Rest of Canada Kms Travelled` | KMs |
| `usMexicoMiles` | ✓ | `US/Mexico Kms Travelled` | KMs. May be `Not Applicable` → emit `0`. |
| `totalMiles` | ✓ | `Total Kms Travelled` | KMs. Should equal sum of three above (warn if drift >1%). |

### B.8 Inspections by level (page 2)

Two parallel rows of 5 numbers each.

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `inspectionsByLevel.l1`-`l5` | ✓ | `# of Inspections by level` (5 cells) | |
| `inspectionsOosByLevel.l1`-`l5` | ✓ | `# of Inspections out of service by level` (5 cells) | |
| `totalVehiclesInspected` | ✓ | `Total number of vehicles inspected` | |

### B.9 Inspection threshold formula (page 3)

Used to verify `insPctOfThresh`. Optional but strongly recommended.

| JSON field | PDF source |
|---|---|
| `inspectionThreshold.cvsaInspectionsConducted` | `# of CVSA inspections conducted` |
| `inspectionThreshold.vehiclesInspected` | `# of Vehicles inspected` |
| `inspectionThreshold.driversInspected` | `# of Drivers inspected` |
| `inspectionThreshold.totalUnitsInspected` | `Total units inspected` |
| `inspectionThreshold.driverPointsAssigned` | `# of Driver points assigned (D)` |
| `inspectionThreshold.vehiclePointsAssigned` | `# of Vehicle points assigned (V)` |
| `inspectionThreshold.totalInspectionPoints` | `Total inspection points (0.6875 × D+V)` |
| `inspectionThreshold.setThresholdPoints` | `# of Set inspection threshold points` |
| `inspectionThreshold.pctOfSetThreshold` | `% of set threshold` |

---

## `inspectionEvents[]` — Per-Inspection Event (Sink C)

Pages 4–17 contain the **Intervention and Event Details** log. Three event types: Inspection, Conviction, Collision. **We only extract Inspection events.** Discard the others.

Each Inspection event becomes one entry in `inspectionEvents[]`.

### Per-event fields

| JSON field | Required | PDF source | Notes |
|---|:---:|---|---|
| `cvirNumber` | ✓ | `CVIR #` | Primary key, e.g. `ONEA01827393` |
| `inspectionDate` | ✓ | `Inspection Date` | ISO date |
| `startTime` | ✗ | `Start Time` | `HH:MM` 24-hour |
| `endTime` | ✗ | `End Time` | `HH:MM` 24-hour |
| `level` | ✓ | `Level of Inspection` | Integer 1–5 |
| `location` | ✗ | `Location` | TIS / district name (e.g. `HAMILTON`) |
| `vehiclePoints` | ✓ | `Vehicle Points` | |
| `driverPoints` | ✓ | `Driver Points` | |
| `cvorPoints` | ✓ | derived: `vehiclePoints + driverPoints` | |
| `categoriesOos` | ✓ | `Categories OOS*` | Drives `status` |
| `totalDefects` | ✓ | `Total All Defects` | |
| `status` | ✓ | derived: `categoriesOos>0 → "OOS"` else `totalDefects>0 → "DEFECT"` else `"OK"` | |

### `driver` sub-object

| JSON field | PDF source |
|---|---|
| `driver.name` | `Driver Name` |
| `driver.licenseNumber` | `Driver Licence Number` |
| `driver.jurisdiction` | `Jurisdiction` (the row under `Driver`) |

### `vehicles[]` array (1 or 2 entries)

PDF has `Vehicle 1` and optionally `Vehicle 2`. Each contributes one entry.

| JSON field | PDF source |
|---|---|
| `vehicles[i].make` | `Vehicle Make` (4-char code, e.g. `VOLV`, `FRHT`) |
| `vehicles[i].unitNumber` | `Unit Number` |
| `vehicles[i].plate` | `Vehicle Plate` |
| `vehicles[i].jurisdiction` | `Jurisdiction` (the row under that Vehicle) |

### `defects[]` array (variable length)

Each inspection has 0..N repeating Category/Defect rows. Asterisk on the Category column indicates an OOS-eligible category.

| JSON field | PDF source | Notes |
|---|---|---|
| `defects[i].category` | `Category*` | e.g. `"Vehicle Maintenance"`, `"Hours-of-service Compliance"` |
| `defects[i].defect` | `Defect` | e.g. `"BRAKES DEFECTIVE"` |
| `defects[i].oos` | derived from asterisk | True if Category had `*` |
| `defects[i].points` | (sometimes inline) | Optional — if not extractable, emit `null` |

---

## What we deliberately do NOT extract

| PDF section | Page | Reason |
|---|---|---|
| Conviction events (full detail) | 4–17 | Only counts/points used (sink B) |
| Collision events (full detail) | 4–17 | Only counts/points used (sink B) |
| Tow Operator section | 3 | Not applicable to fleets we serve |
| Travel Kilometric Information history | 18–19 | Not rendered today; current-year kms are enough |
| Page footers (PAGE n OF m, URL) | all | Page chrome |

If you can extract these for free, great — but they don't have to be in the response. They will simply be ignored.

---

## Component naming convention

All `pull.*` field names match the existing `CvorPeriodicReport` TypeScript interface in our frontend (`src/pages/inspections/inspectionsData.ts`). All `carrier.*` fields match the `cvorNumber` / `legalName` / etc. naming used on the carrier profile page. **Do not rename fields** — our renderers consume them by name.
