# 06 — PDF Extraction, Page-by-Page

This walks through the **standard 19-page MTO CVOR Carrier Safety Profile** (form `SR-LV-029A (2021/10)`) page by page. Use it together with the highlighted PDFs in `highlighted-pdfs/` — each highlight maps to one of the 4 sinks (Green / Blue / Purple / Yellow).

PDFs that are shorter (8 pages) or longer (29 pages) follow the same template; the carrier-identity + summary sections are always pages 1–3, and event-log pages can grow or shrink based on how many inspection events the operator has in the 24-month window.

---

## Page 1 — Header, Carrier Identity, Fleet, Travel, Collisions, Convictions

**Sinks on this page:** GREEN (carrier identity), BLUE (per-pull metric), YELLOW (audit).

### 1A. Document chrome (top of page) — YELLOW

| Label | JSON path | Notes |
|---|---|---|
| `Search Date and Time` | `source.searchDate` | This is the pull date (`pull.reportDate` derives from this). |
| `Order #` | `source.orderNumber` | MTO order number, e.g. `06042001`. |
| Form version (footer) | `source.formVersion` | `SR-LV-029A (2021/10)` |

### 1B. Carrier Identity card — GREEN

| Label | JSON path |
|---|---|
| `CVOR / RIN #` | `carrier.cvorNumber` |
| `Client Name` | `carrier.legalName` |
| `Operating As` | `carrier.operatingAs` |
| `Address` (multi-line) | `carrier.address.{street,city,state,zip,country}` |
| `Phone #` | `carrier.phone` |
| `Mobile #` | `carrier.mobile` (often blank) |
| `Fax #` | `carrier.fax` (often blank) |
| `Email` | `carrier.email` |
| `US DOT #` | `carrier.usDotNumber` (often blank) |
| `CVOR Status` | `carrier.cvorStatus` |
| `Original Issue Date` | `carrier.originalIssueDate` |
| `Start Date` | `pull.effectiveDate` |
| `Expiry Date` | `pull.expiryDate` |
| `Carrier Safety Rating` | `carrier.safetyRating` |
| `Type of Commercial Vehicle` | `carrier.vehicleTypes[]` |
| `Dangerous Goods` | `carrier.dangerousGoods` (Yes/No → bool) |

### 1C. Fleet snapshot — BLUE

| Label | JSON path |
|---|---|
| `# of Commercial Vehicles` | `pull.trucks` |
| `# of Vehicles Double Shifted` | (yellow / optional) |
| `# of Drivers` | `pull.drivers` |

### 1D. Kilometric travel (current annual rate) — BLUE

| Label | JSON path | Notes |
|---|---|---|
| `Ontario Kms Travelled` | `pull.onMiles` | Stored as KILOMETRES; UI converts km↔mi. |
| `Rest of Canada Kms Travelled` | `pull.canadaMiles` | |
| `US/Mexico Kms Travelled` | `pull.usMexicoMiles` | `Not Applicable` → `0` |
| `Total Kms Travelled` | `pull.totalMiles` | Should equal sum of the three. |

### 1E. Collision details (24-month) — BLUE

| Label | JSON path | Notes |
|---|---|---|
| `Total # of Collisions` | `pull.collisionEvents` | |
| `# of Collisions with points` | `pull.collWithPoints` | |
| `# of Collisions not pointed` | `pull.collWithoutPoints` | |
| `Fatal` / `Personal Injury` / `Property Damage` (under "with points") | not stored at root | Counts feed the collision events total — useful in QA but UI doesn't render them separately. |

### 1F. Conviction details (24-month) — BLUE

| Label | JSON path |
|---|---|
| `Total # of convictions` | `pull.convictionEvents` |

(Sub-categories `Driver / Vehicle / Load / Other` aren't stored separately; the per-event log on later pages carries the conviction detail, which we don't extract.)

---

## Page 2 — Inspections by Level, OOS Rates, Performance Summary, KM Rate Breakdown

**Sinks on this page:** BLUE (per-pull metric), YELLOW (audit).

### 2A. Inspections by Level — BLUE

A pair of 5-cell rows.

| Label | JSON path |
|---|---|
| `# of Inspections by level → Level 1..5` | `pull.inspectionsByLevel.{l1..l5}` |
| `# of Inspections out of service by level → Level 1..5` | `pull.inspectionsOosByLevel.{l1..l5}` |
| `Total number of vehicles inspected` | `pull.totalVehiclesInspected` |

### 2B. Out-of-Service rates — BLUE (excludes Level 4)

| Label | JSON path |
|---|---|
| `Vehicle Out of Service %` | `pull.oosVehicle` |
| `Driver Out of Service %` | `pull.oosDriver` |
| `Overall Out of Service %` | `pull.oosOverall` |

### 2C. Performance Summary (R-Factor) — BLUE

The 4-column table is the official R-Factor breakdown. Three rows + an Overall row.

| Row | Column 1 (`% of set Threshold`) | Column 2 (`% Weight`) | Column 3 (`% Overall Contribution`) |
|---|---|---|---|
| `Collision`   | `pull.colPctOfThresh` | (always 40) | `pull.colContrib` |
| `Conviction`  | `pull.conPctOfThresh` | (always 40) | `pull.conContrib` |
| `Inspection`  | `pull.insPctOfThresh` | (always 20) | `pull.insContrib` |
| `Overall Violation Rate %` | — | — | `pull.rating` |

Sanity: `colContrib + conContrib + insContrib ≈ rating` (drift ≤ 0.1).

### 2D. Audit info (top of page) — YELLOW

| Label | JSON path |
|---|---|
| `Most Recent Audit → Date` | (optional, often blank) |
| `Most Recent Audit → Type` | (optional) |

### 2E. Collision Breakdown by Kilometre Rate Change — BLUE

A multi-row table. Pull the `# of Points` from the **`Total`** row only.

| Source row | JSON path |
|---|---|
| `Total → # of Points` | `pull.totalCollisionPoints` |

The other columns (`Time Period`, `From Date`, `To Date`, `# of Months`, `KM Rate Per Month`, `# of Events`, `Set Threshold Points`, `Percent of Set Threshold`) are not stored — they explain the math.

### 2F. Conviction Breakdown by Kilometre Rate Change — BLUE

Same shape as 2E, often continues on page 3.

| Source row | JSON path |
|---|---|
| `Total → # of Points` | `pull.convictionPoints` |

---

## Page 3 — Conviction Breakdown continuation, Inspection Threshold formula, Tow Operator

**Sinks on this page:** BLUE (per-pull metric), YELLOW (audit).

### 3A. Conviction Breakdown continued — BLUE

If page 2's table didn't finish, the `Total` row appears here. Same `pull.convictionPoints` rule applies — pull from the very last `Total` row.

### 3B. Inspection Threshold Calculation — BLUE (optional but recommended)

Used to verify `pull.insPctOfThresh`.

| Label | JSON path |
|---|---|
| `# of CVSA inspections conducted` | `pull.inspectionThreshold.cvsaInspectionsConducted` |
| `# of Vehicles inspected` | `pull.inspectionThreshold.vehiclesInspected` |
| `# of Drivers inspected` | `pull.inspectionThreshold.driversInspected` |
| `Total units inspected` | `pull.inspectionThreshold.totalUnitsInspected` |
| `# of Driver points assigned (D)` | `pull.inspectionThreshold.driverPointsAssigned` |
| `# of Vehicle points assigned (V)` | `pull.inspectionThreshold.vehiclePointsAssigned` |
| `Total inspection points (0.6875 × D+V)` | `pull.inspectionThreshold.totalInspectionPoints` |
| `# of Set inspection threshold points` | `pull.inspectionThreshold.setThresholdPoints` |
| `% of set threshold` | `pull.inspectionThreshold.pctOfSetThreshold` |

### 3C. Tow Operator section — IGNORE

Capture if present (yellow), but typically blank. Not on the UI.

---

## Pages 4 – 17 — Intervention and Event Details

**Sinks on these pages:** PURPLE (per-inspection event).

The PDF section header reads `Intervention and Event Details - From <start> To <end>`. Three event types appear in chronological order:

- `Inspection`  ← **EXTRACT every one of these into `inspectionEvents[]`**
- `Conviction`  ← skip detail (counts captured on page 1)
- `Collision`   ← skip detail (counts captured on page 1)

You identify the type by the leading row label on the event block. **Do not** push Conviction or Collision events into the JSON output — only Inspection events.

### Per-Inspection event fields → `inspectionEvents[i]`

| PDF label | JSON path |
|---|---|
| `CVIR #` | `cvirNumber` |
| `Inspection Date` | `inspectionDate` |
| `Start Time` | `startTime` |
| `End Time` | `endTime` |
| `Level of Inspection` | `level` (1–5) |
| `Location` | `location` |
| `Vehicle Points` | `vehiclePoints` |
| `Driver Points` | `driverPoints` |
| (derived: vehiclePoints + driverPoints) | `cvorPoints` |
| `Categories OOS*` | `categoriesOos` |
| `Total All Defects` | `totalDefects` |
| `Co-Driver` (Y/N) | (extension field — see below) |
| `Impoundment` (Y/N) | (extension field — see below) |
| `Charged` (Y/N) | (extension field — see below) |
| `# of Vehicles` | (use to know whether Vehicle 2 block is present) |

### Per-Inspection driver block → `inspectionEvents[i].driver`

| PDF label | JSON path |
|---|---|
| `Driver Name` | `driver.name` |
| `Driver Licence Number` | `driver.licenseNumber` |
| `Jurisdiction` (under Driver) | `driver.jurisdiction` |

### Per-Inspection vehicles → `inspectionEvents[i].vehicles[]`

PDF has up to 2 vehicles labelled `Vehicle 1` / `Vehicle 2`. Each contributes one entry.

| PDF label | JSON path |
|---|---|
| `Vehicle Make` | `vehicles[k].make` |
| `Unit Number` | `vehicles[k].unitNumber` |
| `Vehicle Plate` | `vehicles[k].plate` |
| `Jurisdiction` (under that Vehicle) | `vehicles[k].jurisdiction` |

### Per-Inspection defects → `inspectionEvents[i].defects[]`

Repeating `Category* + Defect` rows. Asterisk on Category = OOS-eligible.

| PDF label | JSON path |
|---|---|
| `Category*` | `defects[k].category` (asterisk → `defects[k].oos = true`) |
| `Defect` | `defects[k].defect` |
| (inline points if listed) | `defects[k].points` |

### Per-Inspection tickets (NEW)

When the inspection's `Charged = Y`, the operator has been issued ticket(s). Some PDFs list the ticket number inline; some don't. If you can find:

- `Ticket #` (text near the Inspection block, or on a linked Conviction event — match by date + driver + plate)

… emit a `tickets[]` array per inspection. The shape is in the JSON Schema. If you cannot reliably link tickets to inspections (which is fine — MTO does not always render the linkage), emit `tickets: []` and let our backend match heuristically.

---

## Pages 18 – 19 — Travel Kilometric History — IGNORE

Multi-year history table. Not on our UI. Skip it.

---

## Per-PDF training set (this bundle)

| # | File | Pages | Notes |
|---|---|---:|---|
| 1 | `06042001_Ontario.pdf` | 19 | Full standard layout. Ground truth in `examples/response-single.json` and `examples/expected/06042001_Ontario.json`. |
| 2 | `03072022_Ontario.pdf` | 17 | Slightly shorter event log. |
| 3 | `06042001_Ontario (2).pdf` | 19 | Byte-identical duplicate of #1 — use to verify deterministic output. |
| 4 | `20250203_100539_0000850abd10.pdf` | 29 | Long event log; tests how your parser scales. |
| 5 | `20241104_125433_0000369fbd10.pdf` |  8 | Compact PDF, fewer events. Tests minimal case. |

Open the matching `*.annotated.pdf` from `highlighted-pdfs/` alongside the raw to see exactly which tokens get pushed where.
