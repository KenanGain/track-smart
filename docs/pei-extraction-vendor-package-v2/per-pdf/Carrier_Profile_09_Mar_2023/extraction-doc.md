# Carrier_Profile_09_Mar_2023 — Extraction Walk-through

Read this doc next to `raw-pdfs/Carrier_Profile_09_Mar_2023.pdf` and `annotated.pdf`. Same form layout as `Carrier_Profile_18_Nov_2020` — see that file's `extraction-doc.md` for the full label-to-JSON-path table; this doc only highlights the field values that differ for this carrier.

The PDF has **3 pages** (page 3 is a payment receipt — not extracted).

The PDF has **no text layer**. Vendors must run OCR. Reference pipeline: `scripts/extract_ocr.py`.

---

## Page 1 — Carrier Information

| PDF label | Sample value | JSON path |
|---|---|---|
| `NSC #` | `PEI03783` | `carrier.nscNumber` |
| `Company Name` | `FOS GROUP LTD.` | `carrier.legalName` |
| `Address` (line 1) | `17822 RTE 2 SPRINGVALE` | `carrier.address.street` |
| `Address` (line 2) | `17822 RTE 2 SPRINGVALE` | `carrier.address.street2` |
| `Address` (line 3) | `Prince Edward Island` | `carrier.address.province` |
| `Address` (line 4) | `C1E 0M5` | `carrier.address.postalCode` |
| `Phone #` | `(902)388-0127` | `carrier.phone` |
| `Safety Rating` | `Satisfactory - Unaudited` | `carrier.safetyRating` |
| `Carrier Profile as of` | `2023/03/09` | `pull.reportDate` (`"2023-03-09"`) |

### SUMMARY

| PDF label | Sample value | JSON path |
|---|---|---|
| `Collision Points:` | `0` | `pull.collisionPoints` |
| `Conviction Points:` | `0` | `pull.convictionPoints` |
| `Inspection Points:` | `0` | `pull.inspectionPoints` |
| `Current Active Vehicles at Last Assessment:` | `8` | `pull.currentActiveVehiclesAtLastAssessment` |
| `Current Active Vehicles:` | `8` | `pull.currentActiveVehicles` |

> **Frontend math**: `total = 0`. Schedule 3 fleet 6-9 → max 28 pts. `0/28 = 0.0%` → **LOW** zone.

### Collisions / Convictions

Both empty → `pull.collisions: []`, `pull.convictions: []`.

### Inspections (only 2 rows — both fit on page 1)

| seq | inspectionDate | cvsaLevel | log | tdg | loadSecurity | driverName | status | points |
|---:|---|---:|---|---|---|---|---|---:|
| 1 | 2022/11/22 | 3 | Passed  | Passed | Passed | SINGH        | P | 0 |
| 2 | 2022/10/07 | 3 | Warning | Passed | Passed | NAVJOT SINGH | W | 0 |

Note: row 2 has a **Warning** in the Log column rather than Passed — the form distinguishes Warning (W status) from Pass (P status). Both carry **0 points** (only OOS-related Major status `M` or full `OOS` contribute 3 pts each).

---

## Page 2 — Audits only

Inspections section is empty on page 2 (only 2 rows total, both fit on page 1). Audits section heading appears with empty data.

| PDF region | Sample content | JSON path |
|---|---|---|
| Section heading `Audits:` | (no rows) | `pull.audits: []` |

---

## Page 3 — Customer Receipt (NOT extracted)

Same as the 2020 sample — drop this page.

---

## Cross-field validation

1. JSON validates against `schema.json`.
2. Σ inspection points = `pull.inspectionPoints` → 0 + 0 = **0** ✓.
3. Σ collision points = `pull.collisionPoints` → 0 = 0 ✓.
4. Σ conviction points = `pull.convictionPoints` → 0 = 0 ✓.
5. Inspection status ↔ points consistency → both rows are P/W → 0 pts ✓.
6. `currentActiveVehicles` (8) maps to Schedule 3 row 6-9 → max 28 pts ✓.
