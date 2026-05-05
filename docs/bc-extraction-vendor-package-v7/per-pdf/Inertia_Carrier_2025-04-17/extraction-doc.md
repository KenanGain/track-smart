# Inertia_Carrier_2025-04-17 — Extraction Walk-through

Read this doc next to `raw-pdfs/CPODetailReport_INERTIA_2025-04-17.pdf` and `annotated.pdf`. Each row tells you the label printed on the PDF, the value seen in this sample, the JSON path it lands at in `extracted.json`, and which TrackSmart UI surface consumes it.

The PDF has **37 pages** in 8 logical sections. BC Carrier Profile Reports are **text-extractable** — vendors can use `search_for`-style label-anchored parsing without OCR.

---

## Cover (p.1) — yellow region

| PDF label | Sample value | JSON path | Frontend surface |
|---|---|---|---|
| (title)                 | `Carrier Profile Report`            | (audit only)                                | — |
| (carrier line)          | `INERTIA CARRIER LTD.`              | `carrier.demographics.carrierName`          | Carrier sticky |
| `NSC #:`                | `202-422-480`                       | `carrier.nscNumber` (= `demographics.nscNumber`) | Carrier sticky |
| `Profile Start Date:`   | `17-Apr-2023`                       | `source.profileFrom` / `demographics.profileFrom` | Banner |
| `Profile End Date:`     | `17-Apr-2025`                       | `source.profileTo` / `demographics.profileTo` | Banner |
| `Profile Requested By:` | `inertia`                           | `source.profileRequestedBy`                  | (audit) |
| `Report Run Date:`      | `17-Apr-2025`                       | `source.reportRunDate` / `demographics.reportRunDate` | Pull-date pill |

## TOC + NSC Carrier Profile narrative (p.2) — yellow region

Audit-only section listing each numbered section + the methodology narrative ("Contraventions / CVSA / Accidents / Total / Average Fleet Size / Total Active Vehicle Days / Active Monthly Days / Risk Band"). Not stored in JSON; the labels are highlighted PALE so a vendor reviewer can confirm they parsed every section.

---

## §1 — Carrier Information (p.3) — green/blue region

### Demographic Information block

| PDF label | Sample value | JSON path | Frontend (NscBcDemographics) |
|---|---|---|---|
| `Carrier Name:`                          | `INERTIA CARRIER LTD.`             | `carrier.demographics.carrierName`          | sticky title |
| `Jurisdiction:`                          | `BC`                                | `carrier.demographics.jurisdiction`         | subtitle |
| `Primary Types of Business:`             | `General Freight`                   | `carrier.demographics.primaryBusinessType`  | sticky |
| `Certficate Issue Date:` *(typo in PDF)* | `11-Jan-2016`                       | `carrier.demographics.certificateIssueDate` | cert panel |
| `Extra-Provincial:`                      | `Yes`                                | `carrier.demographics.extraProvincial` (boolean) | sticky |
| `Carrier Mailing Address:`               | `101-17564 56A AVE / SURREY BC V3S 1G3` | `carrier.demographics.mailingAddress` | sticky |
| `Premium Carrier:`                       | `No`                                 | `carrier.demographics.premiumCarrier`      | sticky |
| `Weigh2GoBC:`                            | `No`                                 | `carrier.demographics.weigh2GoBC`          | sticky |
| `Preventative Maintenance:`              | `No`                                 | `carrier.demographics.preventativeMaintenance` | sticky |
| `Number of Currently Licensed Vehicles:` | `73`                                 | `carrier.demographics.numberOfLicensedVehicles` | "Active Vehicles" tile |

### Certificate Information block

| PDF label | Sample value | JSON path | Frontend (NscBcCertificate) |
|---|---|---|---|
| `Certificate Status:` | `Active`                       | `carrier.certificate.certificateStatus` | "Certificate Status" row |
| `Safety Rating:`      | `Satisfactory - Unaudited`     | `carrier.certificate.safetyRating`      | "Safety Rating" row |
| `Profile Status:`     | `Satisfactory`                 | `carrier.certificate.profileStatus`     | "Profile Status" row |
| `Audit Status:`       | `Unaudited`                    | `carrier.certificate.auditStatus`       | "Audit Status" row |

### Current Profile Scores panel + Threshold ranges

The PDF shows the "Current Profile Scores as of `31-Mar-2025`" line followed by a table with 4 columns (Average Fleet Size, Contraventions, CVSA (Out of Service), Accidents, Total) and one data row with `INERTIA CARRIER LTD.` and the four numbers.

| PDF cell | Sample value | JSON path | Frontend (NscBcComplianceReview) |
|---|---|---|---|
| Avg Fleet Size cell      | `77.56` | `pull.complianceReview.averageFleetSize` | bar header |
| Contraventions cell      | `0.30`  | `pull.complianceReview.scores[0].score`  | category bar |
| CVSA (Out of Service)    | `0.31`  | `pull.complianceReview.scores[1].score`  | category bar |
| Accidents                | `0.00`  | `pull.complianceReview.scores[2].score`  | category bar |
| Total                    | `0.61`  | `pull.complianceReview.totalScore`       | total bar |
| `Profile Status` table   | three rows × four columns ("Satisfactory 0.00–1.76" etc.) | `pull.thresholds[]` (3 rows) | threshold ladder |

### NSC Interventions block

| PDF cell | Sample value | JSON path | Frontend (NscBcIntervention) |
|---|---|---|---|
| `Intervention Type` | `Audit - Triggered` | `pull.interventions[i].type` | "Recent Interventions" panel |
| `Date`              | `01-Jun-2023`       | `pull.interventions[i].date` | row date |

---

## §2 — Profile Scores month-by-month (pp.4-5) — blue region

Header row: `Month / Total Active Vehicle Days / Active Monthly Days / Average Fleet Size / Contraventions Score / CVSA Score / Accident Score / Total Score`.

24 monthly rows, newest first (`2025-03` → `2023-04` for this 24-month profile period).

Each row → `pull.monthlyScores[i]`:

| PDF column | JSON field | Notes |
|---|---|---|
| Month                  | `month`  | YYYY-MM, newest first |
| Total Active Vehicle Days | `vd`  | Sum of vehicle-days over the month |
| Active Monthly Days    | `ad`     | # days in month with ≥1 active vehicle |
| Average Fleet Size     | `avg`    | = `vd / ad` (validator checks ±0.05) |
| Contraventions Score   | `contra` | |
| CVSA Score             | `cvsa`   | |
| Accident Score         | `acc`    | |
| Total Score            | `total`  | = `contra + cvsa + acc` (validator checks ±0.02) |

Frontend: `BC_MONTH_ROWS` (`BcMonthRow[]`) drives the pull-by-pull line chart on `NscBcPerformanceHistory`.

---

## §3 — Active Fleet (pp.5-6) — brown region

Per-vehicle table:

| PDF column | JSON field | Frontend (BcFleetRow) |
|---|---|---|
| `Regi #` | `regi`  | row id |
| `Plate #` | `plate` | (blank when not on file) |
| `Year`   | `year`  | |
| `Make`   | `make`  | abbreviation as printed (e.g. `VOLVO`, `FREIGHTLIN`, `KENWORTH`) |
| `Owner Name` | `owner` | typically a leasing/finance company |
| `GVW`        | `gvw`   | empty string when blank |

Frontend: `BC_FLEET_ROWS` powers the Active Fleet table on `NscBcPerformanceHistory`.

---

## §4 — Contraventions (pp.7-14) — orange region

### §4 Summary (p.7)

Group-summary table at the top of §4:

| PDF column | JSON path |
|---|---|
| `Group Description and Equivalency Codes` (e.g. "Speeding (0001-0099)") | `pull.contraventionSummary[i].group` + `.code` |
| `Number of Violations in last 12 months` | `.violations` |
| `Percentage of Violations` | `.violationsPct` |
| `Number of Active Points`  | `.activePoints` |
| `Percentage of Total Active Points` | `.activePointsPct` |

Always 10 group buckets (Speeding 0001-0099, Stop Signs 0100-0199, Driver's Liabilities 0200-0299, Driving 0300-0399, Hours of Service 0400-0499, Trip Inspection 0500-0599, Mechanical Defects 0600-0699, Cargo Securement 0700-0799, Dangerous Goods 0800-0899, Vehicle Insurance 0900-0999).

### §4.1 Driver Contraventions (Guilty) (pp.7-11) — `pull.driverContraventions[]`

Each entry is a 3-line block:
1. Driver name + DL# + jurisdiction
2. Violation Date / Time / Ticket # / Plate / Location / Jurisdiction / Disposition Date
3. Act / Section / Description / Equiv Code / Active Points

Maps to `DriverContraventionRow` exactly.

### §4.2 Carrier Contraventions (Guilty) (p.11) — `pull.carrierContraventions[]`

Same shape minus the driver block.

### §4.3 Pending Driver Contraventions (pp.12-14) — `pull.pendingDriverContraventions[]`

Same shape as §4.1 but with extra fields (Class, Status); no Disposition Date or Active Points yet (they're pending).

### §4.4 Pending Carrier Contraventions (p.14) — `pull.pendingCarrierContraventions[]`

Empty in this sample ("There are no contraventions to report for this section.").

---

## §5 — CVSA Inspection Results (pp.15-32) — purple region

### §5 Summary (p.15)

Two tables:

**Inspection counts table** — 4 rows:
| PDF column | JSON path |
|---|---|
| Inspection Type (`Driver/Vehicle Inspections`, `Vehicle Only Inspections`, `Driver Only Inspections`, `Total Inspections`) | `pull.cvsa.summary[i].inspectionType` |
| Number of Inspections in the Past 12 Months | `.count` |
| Out of Service (OOS) | `.oos` |
| Violations Present (Fail) | `.fail` |
| Pass | `.pass` |

For this sample: 50 total (40 D/V + 6 V-only + 4 D-only), 8 OOS, 10 Fail, 32 Pass.

**Defect-type breakdown table** — one row per CVSA defect category:
| PDF column | JSON path |
|---|---|
| `40 - Driver`, `41 - Lighting Devices`, … | `pull.cvsa.defectBreakdown[i].code` + `.label` |
| OOS / % of Defects / Fail / % of Defects / Total Defects / % of Total | `.oos`, `.oosPct`, `.fail`, `.failPct`, `.totalDefects`, `.totalPct` |

### §5 Per-inspection details (pp.16-32) — `pull.cvsa.list[]`

Each inspection block has:
1. Header: Inspection Date / Time / Document # / Location / Jur / Level / Result / Active Points
2. Driver Name / DL#/Jur
3. One or more vehicle rows (Power Unit / Semi-Trailer / Trailer / Bus) each with Plate/Jur, Regi #, Vehicle Desc, Result, and any defect codes

Maps to `CvsaInspectionRec` with `units: CvsaUnit[]`.

---

## §6 — Accident Information (pp.33-34) — red region

Per-accident block:
1. Accident Date / Time / Report # / Location / Jur / Type / Fault / Active Points
2. Driver Name / DL#/Jur
3. Plate/Jur / Regi # / Vehicle Desc / Charges Laid

Maps to `AccidentDetailRow`. Type ∈ `{Property, Injury, Fatal}`. Fault ∈ `{At Fault, No Fault, Fault Unknown}`. Active points: PD = 2, Injury = 4, Fatal = 6, but only when at-fault.

---

## §7 — Audit Summary (p.35) — yellow region

Empty in this sample ("No Audits conducted for this carrier during the report period."). Maps to `pull.auditSummary: []`.

---

## §8 — CVIP Vehicle Inspection History (pp.36-37) — brown region

Per-vehicle row:

| PDF column | JSON field | Frontend (CvipRow) |
|---|---|---|
| Regi #         | `regi`         | row id |
| Plate #        | `plate`        | |
| Vehicle        | `vehicle`      | year + make abbrev |
| Date           | `date`         | inspection date |
| Type           | `type`         | `CVIP` or `N&O` |
| Facility       | `facility`     | facility code (e.g. `S6903`) |
| Confirmation   | `confirmation` | confirmation # |
| Decal          | `decal`        | decal sticker # |
| Expiry         | `expiry`       | decal expiry date |
| Result         | `result`       | `Pass`, `Pass (Repair Same Day)`, `Fail`, `N&O 2`, etc. |

---

## Cross-field validation

After extraction, `validate.py` confirms:

1. JSON schema validity.
2. `monthlyScores` is sorted newest-first and ≤ 24 rows.
3. Each month's `avg = vd / ad` (within 0.05).
4. Each month's `total = contra + cvsa + acc` (within 0.02).
5. `complianceReview.totalScore = Σ scores[].score` (within 0.02).
6. CVSA inspections marked `OOS` have `pts === 3`; non-OOS have `pts === null` or 0.
7. Every CVSA inspection has at least one Power Unit / Trailer / Bus / Vehicle in `units[]`.
8. CVSA `defectBreakdown[i].totalDefects = oos + fail` when both present.
9. At-fault accidents have `pts ∈ {0, expected}` for their severity (PD=2 / Injury=4 / Fatal=6).
10. `source.profileFrom` and `profileTo` are present.
11. `carrier.nscNumber === demographics.nscNumber`.
12. CVSA `Total Inspections.count = Σ (D/V + V-only + D-only) counts`.
