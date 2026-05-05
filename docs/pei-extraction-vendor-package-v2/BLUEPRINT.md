# Blueprint — PEI Carrier Abstract Report vendor package (v2)

## What a PEI Carrier Abstract Report looks like

The PEI Highway Safety **National Safety Code Carrier Abstract Report** is a 2-3 page scanned-image PDF (most reports are 2 pages of data + an optional page 3 receipt). The form has the same layout for the 2020 and 2023 samples in this package. Anatomy:

### Page 1 — header, identity, summary, events

| Region | Content |
|---|---|
| Top banner (centered) | "National Safety Code Carrier Abstract Report" + "Information on this abstract is recorded from the date of implementation of the commercial driver, carrier and audit review systems regulations, Jan 17, 2009." |
| Top-right corner | Date (`YYYY/MM/DD`) + "Page 1 of N" |
| **Carrier Information** | NSC #, Company Name, Address (2 lines), Phone #, Carrier Profile as of (date), Safety Rating |
| **SUMMARY** | Collision Points / Conviction Points / Inspection Points (left half) + Current Active Vehicles at Last Assessment / Current Active Vehicles (right half) |
| **Collisions** | Table with Collision Date / Severity / Case # / Fault / # Vehicles / # Killed / # Injured. Empty in both shipped samples (just an explanatory line). |
| **Convictions** | Table with Conviction Date / Severity / Charge / Not Guilty / Conviction Pts. Empty in both shipped samples. |
| **Inspections** | Table with Inspection Date / CVSA Level / Log / TDG / Load Security / Driver Name / Status. The most data-dense block. |
| Footer | "Doug MacEwen — Registrar of Motor Vehicles" + Tel/Fax + URL |

### Page 2 — inspections continuation + audits

| Region | Content |
|---|---|
| Top-right | Date + "Page 2 of N" |
| **Inspections** (continuation) | Same table headers + remaining rows when p.1 didn't have room |
| **Audits** | Table with Audit Date / Result / Audit Type. Empty for unaudited carriers (both shipped samples). |

### Page 3 (optional) — payment receipt

A "Customer Receipt" for the $25 abstract request fee. **Not part of the carrier data**; v1 ignores this page for extraction.

---

## Data points → frontend mapping

The PEI frontend (`src/pages/inspections/NscPeiPerformanceCard.tsx` + `NscPeiPerformanceHistory.tsx`) renders four sections:

| Frontend block | Source field |
|---|---|
| Carrier sticky header | `carrier.legalName`, `carrier.nscNumber`, `carrier.address`, `carrier.phone`, `carrier.safetyRating` |
| Profile Score (large number + zone bar) | `pull.collisionPoints + convictionPoints + inspectionPoints`, `pull.currentActiveVehicles` (drives Schedule 3 max) |
| 3 contribution tiles (Collision / Conviction / Inspection) | `pull.collisionPoints`, `pull.convictionPoints`, `pull.inspectionPoints` |
| Safety Fitness Certificate panel | `carrier.safetyRating`, `carrier.certificateStatus`, `carrier.auditStatus`, `pull.currentActiveVehicles`, `pull.currentActiveVehiclesAtLastAssessment` |
| Pull-by-pull table | One `extracted.json` per row — `pullDate=reportDate`, points totals, `fleet=currentActiveVehicles`, `avgFleet` |

---

## Schedule 3 — Max Allowable Points by Fleet Size

Stored in the **frontend** (not in extraction). Computed from `pull.currentActiveVehicles`:

| Fleet | Advisory (25%) | Warning (60%) | Interview (85%) | Sanction (100%) |
|---|---:|---:|---:|---:|
| 1-2     | 3   | 6   | 9   | 10  |
| 3-5     | 5   | 11  | 15  | 18  |
| 6-9     | 7   | 17  | 24  | 28  |
| 10-14   | 10  | 24  | 34  | 40  |
| 15-19   | 14  | 33  | 47  | 55  |
| 20-24   | 17  | 41  | 58  | 68  |
| 25-29   | 20  | 48  | 68  | 80  |
| 30-39   | 24  | 57  | 81  | 95  |
| 40-49   | 29  | 69  | 98  | 115 |
| 50-59   | 33  | 78  | 111 | 130 |
| 60-79   | 38  | 90  | 128 | 150 |
| 80-99   | 41  | 99  | 140 | 165 |
| 100+    | 46  | 111 | 157 | 185 |

Both shipped samples fall in the **6-9 fleet** band → max 28 points. With totals ≤ 7 they're well under Advisory (25% = 7).

---

## Demerit point values

| Event | Points |
|---|---:|
| Collision — Not At Fault | 0 |
| Collision — At Fault, Property Damage | 2 |
| Collision — At Fault, Injury | 4 |
| Collision — At Fault, Fatality | 6 |
| CVSA — Pass / Warning | 0 |
| CVSA — Out of Service | 3 |
| Facility Audit — Compliant | 0 |
| Facility Audit — Action Required | 1 |
| Facility Audit — Non-Compliant | 3 |

---

## Why per-pdf instead of one monolithic example

Same reasoning as the CVOR v3+ and AB v7 packages: a single example response is hard to mentally bind to one of N different PDFs. Every artefact for one PDF lives in its own folder so a vendor can open the raw PDF + the annotated PDF + the extracted JSON side by side.

## Why these PDFs are harder than AB/CVOR

PEI Carrier Abstract Reports are **scanned images**, not text-rendered PDFs. There is no font / glyph data to extract — every page is one big image. To build an automated extractor you must:

1. **Convert each page to a high-DPI image** (>=200 DPI; we used 2x of 612x792 = 1224x1584).
2. **Run OCR** with bounding-box output (Tesseract `image_to_data`, AWS Textract `analyze_document`, etc.).
3. **Map OCR tokens to fields** using either fixed form-coordinate templates (when the layout is stable, like the 2020 and 2023 samples) or label-anchored heuristics ("the value to the right of `Inspection Points:`").
4. **Validate dates and numbers** — OCR will occasionally misread `0` as `O`, `1` as `l`, etc. Your pipeline should regex-validate dates, NSC numbers, and integer totals.

The annotated PDFs in this package show **where on the page each field lives**, drawn as colored rectangles via `scripts/annotate_pdf.py`. Coordinates are in the original 612x792 PDF coordinate space; if the form revision changes you'll need to remap them.

## What changes in v2 (planned)

- **OCR pipeline reference implementation** using Tesseract + bounding-box regex → JSON.
- **More samples** if/when more PEI PDFs are available.
- **Form-revision detection** for any future PEI layouts that differ from the 2020/2023 form.
- **Frontend-update step** — wire the 2 shipped samples into `NscPeiPullByPull` mock data (same surgical pattern used for AB).
