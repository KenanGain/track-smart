# Inertia_Carrier_2025-04-17

| Field | Value |
|---|---|
| **NSC #** | 202-422-480 |
| **Carrier** | INERTIA CARRIER LTD. |
| **Address** | 101-17564 56A AVE, SURREY BC V3S 1G3 |
| **Jurisdiction** | BC |
| **Primary Business** | General Freight |
| **Certificate Status** | Active |
| **Safety Rating** | Satisfactory - Unaudited |
| **Profile Status** | Satisfactory |
| **Audit Status** | Unaudited |
| **Certificate Issue Date** | 11-Jan-2016 |
| **Currently Licensed Vehicles** | 73 |
| **Profile period** | 17-Apr-2023 → 17-Apr-2025 |
| **Report run** | 17-Apr-2025 |
| **Profile scores as of** | 31-Mar-2025 |
| **Average fleet size** | 77.56 |
| **Pages** | 37 |

## Profile scores (§1)

| Category | Score | Events |
|---|---:|---:|
| Contraventions | 0.3 | 21 |
| CVSA (Out of Service) | 0.31 | 2 |
| Accidents | 0 | 5 |
| **Total** | **0.61** | — |

## Section counts

| Section | Rows |
|---|---:|
| §2 Monthly scores (24 months) | 14 |
| §3 Active fleet | 23 |
| §4.1 Driver contraventions (guilty) | 19 |
| §4.2 Carrier contraventions (guilty) | 2 |
| §4.3 Pending driver contraventions | 15 |
| §4.4 Pending carrier contraventions | 3 |
| §5 CVSA inspections | 12 |
| §6 Accidents | 11 |
| §7 Audits | 0 |
| §8 CVIP records | 14 |

## NSC Interventions (§1)

| Type | Date |
|---|---|
| Audit - Triggered | 01-Jun-2023 |

## File index

| File | What it is |
|---|---|
| `extracted.json`    | Schema-valid extraction. All cross-field math checks pass. |
| `extraction-doc.md` | Page-by-page walkthrough — for each PDF label, the JSON path and frontend surface that consumes it. |
| `annotated.pdf`     | Raw PDF with the 7-color overlay (PALE labels + STRONG values, drawn via PyMuPDF text-search since BC PDFs have a real text layer). |
| `lists/*.csv`       | Flattened CSV templates (monthly-scores, active-fleet, contravention-summary, driver/carrier/pending contras, cvsa-summary/defects/inspections/units, accidents, audits, cvip). |

## Notes

- BC Carrier Profile Reports are **text-extractable** PDFs (no OCR needed) — the data-driven `search_for` annotator works the same way as it does for Alberta and Ontario CVOR.
- This sample's values match the existing TrackSmart frontend mock data in `src/pages/inspections/NscBcCarrierProfile.tsx` + `NscBcPerformanceHistory.tsx` (which were transcribed from this exact PDF). A vendor's API output should reproduce these values within OCR-style tolerance for free-text fields.
