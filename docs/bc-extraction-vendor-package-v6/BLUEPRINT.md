# Blueprint — BC CVSE Carrier Profile Report vendor package (v6)

## What a BC CPODetailReport looks like

The BC Commercial Vehicle Safety and Enforcement (CVSE) **National Safety Code Carrier Profile Report** is a 35-50 page text-PDF (the shipped sample is 37 pages) divided into 8 numbered sections. Every page repeats a footer banner with `Commercial Vehicle Safety and Enforcement / National Safety Code Carrier Profile Report / From: <date> To: <date> / NSC #: <id> <CARRIER NAME>`.

| Section | Pages | Content | Frontend home |
|---|---|---|---|
| Cover + TOC + narrative | 1-2 | Carrier name, NSC#, profile dates, table of contents, methodology preamble | `source.*`, `demographics.*` |
| **§1** Carrier Information | 3 | Demographics + Certificate Information + Compliance Review (current scores) + Threshold ranges + NSC Interventions | `NscBcCarrierProfileProps` (demographics + certificate + complianceReview + thresholds + interventions) |
| **§2** Profile Scores month-by-month | 4-5 | Rolling 24-month table: month / Total Active Vehicle Days / Active Monthly Days / Average Fleet Size / Contraventions / CVSA / Accidents / Total scores | `BC_MONTH_ROWS` |
| **§3** Active Fleet | 5-6 | Per-vehicle list: regi#, plate, year, make, owner, GVW | `BC_FLEET_ROWS` |
| **§4** Contraventions | 7-14 | Group-summary (CCMTA buckets) + 4 sub-sections: 4.1 Driver Guilty, 4.2 Carrier Guilty, 4.3 Pending Driver, 4.4 Pending Carrier | `DRIVER_CONTRA_ROWS`, `CARRIER_CONTRA_ROWS`, `PENDING_DRIVER_CONTRA_ROWS`, `PENDING_CARRIER_CONTRA_ROWS` |
| **§5** CVSA Inspection Results | 15-32 | Summary (D/V, V-only, D-only × OOS/Fail/Pass) + per-defect-type breakdown + per-inspection details with vehicles + per-vehicle defects | `CVSA_INSPECTION_LIST` |
| **§6** Accident Information | 33-34 | Per-accident: date, time, location, driver, vehicle, type, fault, points | `ACCIDENT_DETAIL_ROWS` |
| **§7** Audit Summary | 35 | Audits performed during the period | `pull.auditSummary[]` |
| **§8** CVIP Vehicle Inspection History | 36-37 | Per-vehicle CVIP records: regi, plate, vehicle, date, type, facility, confirmation, decal, expiry, result | `CVIP_ROWS` |

**Note** — BC PDFs are **text-extractable**: every label and value comes through `page.get_text()` and `search_for()` cleanly. No OCR is required.

## Data points → frontend mapping

The BC frontend renders four major surfaces, all of which consume sub-trees of `extracted.json`:

| Frontend block | Source field |
|---|---|
| Carrier sticky header | `carrier.demographics.*` + `carrier.certificate.*` |
| Profile Score panel + threshold ladder | `pull.complianceReview` + `pull.thresholds[]` |
| Pull-by-pull line chart | `pull.monthlyScores[]` (24 months, newest first) |
| Active Fleet table | `pull.activeFleet[]` |
| Contraventions Summary tile + 4 detail tables | `pull.contraventionSummary[]` + `driverContraventions[]` + `carrierContraventions[]` + `pendingDriverContraventions[]` + `pendingCarrierContraventions[]` |
| CVSA Inspections panel + detail list | `pull.cvsa.summary[]` + `defectBreakdown[]` + `list[]` |
| Accident Information panel | `pull.accidents[]` |
| CVIP Vehicle Inspection History | `pull.cvip[]` |
| NSC Interventions banner | `pull.interventions[]` |

## BC point system reference

| Event | Points |
|---|---:|
| CVSA — Pass / Fail | 0 |
| CVSA — Out of Service (OOS) | **3** |
| Contravention (driver or carrier) | per equivalency code (look up on the CVSE website) |
| Accident — At Fault, Property Damage | **2** |
| Accident — At Fault, Injury | **4** |
| Accident — At Fault, Fatal | **6** |
| Accident — No Fault / Fault Unknown | 0 |
| Audit — score per result | per audit type / question set (since 2015) |

Active points decay after **12 months from the disposition date** (contraventions) or **12 months from the inspection date** (CVSA OOS) and roll out of the score.

## Threshold ranges (printed in §1)

| Status | Contraventions | CVSA (OOS) | Accidents | Total |
|---|---|---|---|---|
| Satisfactory   | 0.00 – 1.76 | 0.00 – 0.93 | 0.00 – 0.23 | 0.00 – 2.13 |
| Conditional    | 1.77 – 2.98 | 0.94 – 1.08 | 0.24 – 0.27 | 2.14 – 3.64 |
| Unsatisfactory | 2.99+        | 1.09+        | 0.28+        | 3.65+        |

The carrier's **Profile Status** is the *worst* status across the four columns.

## Methodology — section by section

For each PDF we do this:

1. **Cover (p.1)** — Pull `NSC #`, `Profile Start/End Date`, `Profile Requested By`, `Report Run Date`. Anchors `source.*` + `demographics.profileFrom/To/reportRunDate`.
2. **§1 Carrier Information** — Pull all demographics + certificate + scores + thresholds + interventions. Single page.
3. **§2 Monthly scores** — Parse the table rows (24 of them). Validate `avg = vd/ad` and `total = contra + cvsa + acc`.
4. **§3 Active Fleet** — Parse per-vehicle rows. Some vehicles have empty plate/owner/gvw cells (still in the database but not currently registered).
5. **§4 Contraventions** — Parse the group-summary table, then the 4 sub-sections. Pending rows have an extra Class + Status field and no Disposition Date / Active Points.
6. **§5 CVSA** — Parse the summary tally, the defect-type breakdown, then per-inspection blocks. Each inspection has 1+ vehicle units with their own Result + optional defect codes.
7. **§6 Accidents** — Parse per-accident blocks. Type ∈ {Property, Injury, Fatal}; Fault ∈ {At Fault, No Fault, Fault Unknown}.
8. **§7 Audits** — Just count and capture. Often empty for unaudited carriers.
9. **§8 CVIP** — Per-vehicle inspection records. Each carrier vehicle should have a CVIP record (semi-annual).

## How a vendor uses this package

```bash
# 1. Read README + this BLUEPRINT
# 2. Open the per-pdf folder
cd per-pdf/Inertia_Carrier_2025-04-17/

# 3. Open raw + annotated PDFs side by side:
#    raw-pdfs/CPODetailReport_INERTIA_2025-04-17.pdf
#    per-pdf/Inertia_Carrier_2025-04-17/annotated.pdf

# 4. Read extraction-doc.md page by page; build your parser
# 5. Run your API on the raw PDF; save output to extracted.json
# 6. Compare against the shipped extracted.json field by field
# 7. From package root:
cd ../..
python validate.py
# Exit 0 = ready to ship.
```

## Differences from CVOR / AB / PEI

1. **Profile period is 24 months** rather than the 24-month rolling window AB uses (same length, different label).
2. **Threshold ranges are printed in the PDF** rather than derived from a separate fleet-band table.
3. **CVIP** (Commercial Vehicle Inspection Programme) Section 8 is BC-specific — a per-vehicle semi-annual inspection log with decal numbers and expiry dates.
4. **Risk Bands** — BC uses 7 risk bands by fleet size for cross-carrier comparison (mentioned in cover preamble). Frontend doesn't render them; not stored in v1.
5. **Pending contraventions** are split out (§4.3 + §4.4) — neither AB nor PEI has this concept; they only show convicted/guilty events.
6. **Active Fleet** is a separate section listing every vehicle that operated under the certificate during the period — not surfaced in AB or CVOR equivalents.
