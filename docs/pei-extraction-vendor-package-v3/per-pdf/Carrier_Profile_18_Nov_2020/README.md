# Carrier_Profile_18_Nov_2020

| Field | Value |
|---|---|
| **NSC #** | PEI03660 |
| **Carrier** | BUSINESS PORTERS INC. |
| **Address** | 5 SUMMER ST UNIT A SUMMERSIDE, Summerside, Prince Edward Island, C1E 1J5 |
| **Phone** | (902)652-7575 |
| **Safety Rating** | Satisfactory - Unaudited |
| **Certificate Status** | Active |
| **Audit Status** | Unaudited |
| **Profile date** | 2020-11-18 |
| **Window** | Nov 2019 → Nov 2020 |
| **Active Vehicles (current)** | 7 |
| **Active Vehicles (last assessment)** | 7 |
| **Pages** | 3 |

## Demerit Points

| Source | Points |
|---|---:|
| Collisions   | 0 |
| Convictions  | 0 |
| Inspections  | 6 |
| **Total**    | **6** |

PEI uses Schedule 3 — Max Allowable Points by Fleet Size — to compare totals against an absolute ceiling and a four-zone alert ladder (Advisory 25%, Warning 60%, Interview 85%, Sanction 100%). The frontend computes the percentage and zone from `pull.currentActiveVehicles`; this package does not store thresholds.

## Events

| Section | Count |
|---|---:|
| Inspections | 7 |
| Collisions  | 0 |
| Convictions | 0 |
| Audits      | 0 |

## File index

| File | What it is |
|---|---|
| `extracted.json`     | Schema-valid extraction (validator passes 7 cross-field checks) |
| `extraction-doc.md`  | Page-by-page walkthrough — for each PDF label, the exact JSON path it lands at + which TrackSmart frontend surface consumes it |
| `annotated.pdf`      | Raw PDF with the 7-color region overlay (auto-detected text bands; PALE labels + STRONG values, mirroring the AB / CVOR overlay style) |
| `lists/*.csv`     | Flattened CSVs (inspections, collisions, convictions, audits, pull-summary) |
| `README.md`       | This card |

## Notes

- PEI Carrier Abstract Reports are **scanned image-only PDFs**. There is no text layer for `search_for`-based annotation. Vendors building automated extraction will need an **OCR pipeline** (Tesseract / AWS Textract / Azure Form Recognizer) plus the form-coordinate mapping in `scripts/annotate_pdf.py` to lift values reliably.
- This sample was hand-transcribed by reading the rendered PNG. `source.ocrEngine` is `null` to indicate manual transcription. A vendor's output should set `ocrEngine` to the actual engine + version they used.
- Status codes observed in the Inspections column: **P** = Pass (0 pts), **W** = Warning (0 pts), **M** = minor / OOS-related (3 pts in this sample), **OOS** = Out of Service (3 pts), **F** = Failed.
