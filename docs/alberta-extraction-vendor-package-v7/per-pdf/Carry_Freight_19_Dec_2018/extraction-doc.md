# Carry_Freight_19_Dec_2018 — Extraction Walk-through

Goal: read this doc next to `raw-pdfs/Carry_Freight_19_Dec_2018.pdf` and `annotated.pdf`. Each row tells you what label is on the page, what the value should look like, where it lands in `extracted.json`, and which TrackSmart UI surface it drives.

The PDF has **30 pages** total: a cover (p.1), TOC (p.2), then six numbered Parts plus an appendix. We extract Parts 1–6.

---

## Cover page (p.1)

| PDF label | Sample value | JSON path | Color | Frontend surface |
|---|---|---|---|---|
| `NSC Number:`            | `AB243-8992`              | `carrier.nscNumber`       | 🟢 GREEN  | Carrier sticky |
| `Carrier Name` (block)   | `Carry Freight Ltd.`      | `carrier.legalName`       | 🟢 GREEN  | Carrier sticky |
| Address block (3 lines)  | `114 West Creek Springs / Chestermere AB T1X 1N7` | `carrier.address.{street,city,province,postalCode}` | 🟢 GREEN | Carrier sticky |
| `Profile Period Start:`  | `2016 DEC 20`             | `source.profilePeriodStart` (ISO) | 🟡 YELLOW | Window label |
| `End:`                   | `2018 DEC 19`             | `source.profilePeriodEnd` (ISO)   | 🟡 YELLOW | Window label |
| `Date Printed:`          | `2018 DEC 19`             | `source.datePrinted` (ISO)        | 🟡 YELLOW | Pull date |
| `Requested By:`          | `HTDSH03`                 | (audit only — not stored)         | 🟡 YELLOW | — |

## TOC (p.2)

The table of contents lists each Part with its page span. We don't store these page numbers in JSON, but they're useful for confirming the `pageCount` (= 30 here) and validating that all expected Parts are present.

---

## Part 1 — Carrier Information (p.3)

Single page. Every value here is identity / pull-level.

| PDF label | Sample value | JSON path | Color |
|---|---|---|---|
| `12-month Report as of:`   | `2018 NOV 30`            | `source.twelveMonthReportAs`           | 🟡 YELLOW |
| `NSC Number:`              | `AB243-8992`             | `carrier.nscNumber`                    | 🟢 GREEN  |
| `MVID Number:`             | `0854-32599`             | `carrier.mvidNumber`                   | 🟢 GREEN  |
| `Safety Fitness Rating:`   | `Satisfactory Unaudited` | `carrier.safetyFitnessRating`          | 🟢 GREEN  |
| ` Operating Status:`       | `Federal`                | `carrier.operatingStatus`              | 🟢 GREEN  |
| `R-Factor Score:`          | `0.468`                  | `pull.rFactor`                         | 🔵 BLUE   |
| `Fleet Range:`             | `5-9`                    | `carrier.fleetRange`                   | 🔵 BLUE   |
| `Fleet Type:`              | `Truck`                  | `carrier.fleetType`                    | 🔵 BLUE   |
| `Contribution to R-Factor — Convictions:`            | `82.0%`  | `pull.contributions.conviction` | 🔵 BLUE |
| `Contribution to R-Factor — CVSA Inspections:`       | `18.0%`  | `pull.contributions.inspection` | 🔵 BLUE |
| `Contribution to R-Factor — Reportable Collisions:`  | `0.0%`   | `pull.contributions.collision`  | 🔵 BLUE |
| `Carrier's Monitoring Stage (1 to 4 …)`             | (blank)   | `pull.monitoringStage` (`null`) | 🔵 BLUE |
| ` Total number of carriers at the same stage or greater:` | (blank) | `pull.carriersAtStageOrAbove` (`null`) | 🔵 BLUE |
| ` NSC carriers in Alberta with Safety Fitness Certificates:` | `24,726` | `pull.totalAlbertaNscCarriers` | 🔵 BLUE |
| `NSC FLEET SIZE ON: 2018 NOV 30 — Average:` | `7`  | `pull.avgFleet`     | 🔵 BLUE |
| `NSC FLEET SIZE ON: 2018 NOV 30 — Current:` | `10` | `pull.currentFleet` | 🔵 BLUE |

> **Watch out**: Avg/Current can appear in either visual order depending on the PDF layout. Cross-validate against `pull.monitoring.summary[0]` (the most-recent monitoring row); for the same carrier they must match.

---

## Part 2 — Conviction Information (pp.4–7)

### Banner (p.4)

| PDF label | Sample value | JSON path | Color |
|---|---|---|---|
| `Profile Period Start Date:`  | `2016 DEC 20` | `source.profilePeriodStart` | 🟡 YELLOW |
| `Profile Period End Date:`    | `2018 DEC 19` | `source.profilePeriodEnd`   | 🟡 YELLOW |
| `Date Printed:`               | `2018 DEC 19` | `source.datePrinted`        | 🟡 YELLOW |
| `Pages 1 To 4`                | `4`           | (audit — not stored)        | 🟡 YELLOW |
| `TOTALS: DOCUMENTS:`          | `1`           | `pull.totalConvictionDocuments` | 🟠 ORANGE |
| `TOTALS: CONVICTIONS:`        | `1`           | `pull.totalConvictions`         | 🟠 ORANGE |
| `TOTALS: ACTIVE POINTS:`      | `3`           | (only stored in summary/details points; total derives from sum of `convictionDetails[].activePoints`) | 🟠 ORANGE |

### Conviction Analysis (p.5)

The table has 16 rows. Every row maps to `pull.convictionAnalysis[]` in this exact order. Empty rows have `count = 0` and `pctText = null`.

For this PDF, only **Hours of Service = 1 (100.0%)** is non-zero.

### Conviction Summary (p.6)

Each conviction row → one entry in `pull.convictionSummary[]`. Columns map cleanly:

| PDF column | JSON field |
|---|---|
| `DATE`              | `date` (and ISO version into `dateIso`) |
| `DOCUMENT`          | `document` (e.g. `OPC ON86937174`; the trailing digits become `docket`) |
| `JUR`               | `jurisdiction` |
| `VEHICLE`           | `vehicle` (combined `plate jur`, e.g. `E65208 AB`) |
| `DRIVER NAME`       | `driverName` |
| (offence sub-line)  | `offence` (`TWO LOGS OR FALSE LOGS`) |
| `ACTIVE POINTS`     | `points` |

### Conviction Detail (p.7)

Each detail block → one entry in `pull.convictionDetails[]`. Note `jurisdiction` is the **full name** here (`Ontario`) where the summary uses the **2-letter code** (`ON`) — preserve as-printed.

Key extras that only appear in the detail view: `time`, `dateEntered`, `issuingAgency`, `location`, `driver` (full licence string), `commodity`, `ccmtaCode` (e.g. `0402 TWO LOGS OR FALSE LOGS`), `convictionDate`, `docket`, `activePoints`.

---

## Part 3 — CVSA Inspection Information (pp.8–13)

### Banner (p.8)

| PDF label | Sample value | JSON path | Color |
|---|---|---|---|
| `TOTALS: PASSED:`               | `4` | (sum of `cvsaSummary[].result === 'Passed'`)              | 🟣 PURPLE |
| `TOTALS: REQUIRED ATTENTION:`   | `2` | (sum of `cvsaSummary[].result === 'Requires Attention'`)  | 🟣 PURPLE |
| `TOTALS: OUT OF SERVICE:`       | `3` | (sum of `cvsaSummary[].result === 'Out of Service'`)      | 🟣 PURPLE |

`pull.totalCvsaInspections` = passed + required + OOS = **9**.

### Defect Analysis (p.9)

19-row table mapping to `pull.cvsaDefectAnalysis[]`. Each row has `oos`, `req`, `total`, `pctText`. Empty rows have all four as `null` — **don't put 0** unless the PDF actually printed `0`.

For this PDF, the totals row is **OOS=3, REQ=5, Total=8 (100%)** → `pull.cvsaDefectTotals`.

### Inspection Summary (p.10)

9 rows → `pull.cvsaSummary[]`.

### Inspection Detail (pp.11–13)

Each inspection block contains:
1. Header line (date, time, document, jur, level, result, date entered).
2. Agency / Location / Driver lines.
3. Vehicles sub-table — **0–3 vehicles per inspection**, with type code (`P`/`ST`/`T`/`B`/etc.), plate, jur, VIN, year, make, optional CVSA decal.
4. Optional **Out-of-Service** defect sub-table — rows like `9 - Lighting Devices …` with per-vehicle counts.
5. Optional **Requires Attention** defect sub-table — same shape, marked as `REQ`.

Each defect collapses to `{ category, vehicleIndex, kind }` — `vehicleIndex` is the 1-based row number from the vehicles sub-table.

---

## Part 4 — Collision Information (pp.14–16)

### Totals (p.14)

3 rows → `pull.collisionTotals[]`. Always Property Damage, Injury, Fatal in that order, even when all zero. For this PDF every cell is 0.

### Summary (p.15) and Detail (p.16)

Both pages say **"No Collisions on Record for period selected"**. That maps to:
```json
"collisionSummary": [],
"collisionDetails": []
```

When collisions exist, each summary row → `collisionSummary[]` (with `severity` ∈ `Damage|Injury|Fatal`) and each detail block → `collisionDetails[]` (with `assessment`, full `vehicle` make/year, `vin`, `location`, `activePoints`).

---

## Part 5 — Violation Information (pp.17–20)

Same structure as Part 2, but for warnings/violations (no NSC points assigned).

### Banner (p.17)

| PDF label | Sample value | JSON path |
|---|---|---|
| `TOTALS: DOCUMENTS:` | `0` | `pull.totalViolationDocuments` |
| `TOTALS: OFFENCES:`  | `0` | `pull.totalViolations` |

### Violation Analysis (p.18)

Same 16 group descriptions as Part 2 → `pull.violationAnalysis[]`. All zero in this PDF.

### Summary (p.19) and Detail (p.20)

Both empty. When non-empty, each detail entry has 1+ offences → `violationDetails[].offences[]` with Act/Section, CCMTA code+label (matching one of the 16 groups), and an officer's note `text`.

---

## Part 6 — Monitoring Information (pp.21–25)

### Cover note (p.21)

Just narrative — no values to extract.

### Monitoring Summary (pp.22) — 24 rows newest-first

Each row → `pull.monitoring.summary[]`:

| PDF column | JSON field |
|---|---|
| `MONTH-END DATE` | `monthEnd` (also ISO into `monthEndIso`) |
| `TYPE`           | `type` (`TRK` / `BUS` / `MIXED`) |
| `TRK%`           | `trkPct` |
| `BUS%`           | `busPct` |
| `AVG`            | `avgFleet` |
| `CUR`            | `currentFleet` |
| `SCORE`          | `score` (number) + `scoreText` (literal — `"No Data"` when blank) |
| `CONV%` `INSP%` `COLL%` | `convPctText`, `inspPctText`, `collPctText` |
| `MONITORING STAGE` | `stage` (1-4 or `null`) |

Months without `TRK%/BUS%/AVG/CUR` filled (very early periods before this carrier had a fleet on the books) get `null` for those columns and `0` for the integer counts.

### Industry block + Stage thresholds (p.23)

| PDF label | Sample value | JSON path |
|---|---|---|
| `INDUSTRY MONITORING INFORMATION ON 2018 NOV 30` | `2018-11-30` | `pull.monitoring.industry.asOf` |
| `For Fleet Range: 5-9 and for Fleet type: TRK`  | `5-9`, `TRK` | `pull.monitoring.industry.fleetRange`, `.fleetType` |
| `Industry Average R-Factor Score: 0.400`         | `0.400`       | `pull.monitoring.industry.avgRFactor` |
| `Stage 1: 1.830 - 2.464`                         | bounds        | `pull.monitoring.thresholds[0]` |
| `Stage 2: 2.465 - 2.794`                         | bounds        | `pull.monitoring.thresholds[1]` |
| `Stage 3: 2.795 - 3.899`                         | bounds        | `pull.monitoring.thresholds[2]` |
| `Stage 4: 3.900 and higher`                      | open          | `pull.monitoring.thresholds[3]` (with `upperBound: null`) |

### Monitoring Details (pp.24–25)

Each month's component metrics → `pull.monitoring.details[]`. Industry-average row at the bottom of p.25 fills out the rest of `pull.monitoring.industry` (`avgConvPts`, `avgOosDef`, etc.).

---

## What we DON'T extract

Parts 7 (Facility Licence Information), 8 (Safety Fitness Information), and 10 (Historical Summary) appear in the TOC but are **not** part of v1 of this schema. The frontend doesn't surface them, and they're not load-bearing for the R-Factor / monitoring story. A future v2 of this schema may add them.
