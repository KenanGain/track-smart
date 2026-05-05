# Carrier_Profile_18_Nov_2020 — Extraction Walk-through

Read this doc next to `raw-pdfs/Carrier_Profile_18_Nov_2020.pdf` and `annotated.pdf`. Each row tells you the label printed on the PDF, the value seen in this sample, the JSON path it lands at in `extracted.json`, and which TrackSmart UI surface it drives.

The PDF has **3 pages**. Page 3 is a payment receipt and is **not** part of carrier extraction — vendors should drop it.

The PDF has **no text layer** — every page is one big image. Vendors must run OCR. See `scripts/extract_ocr.py` for the reference Tesseract pipeline.

---

## Page 1 — Header + Carrier Information + Summary + Sections + first 5 inspections

### Top header (yellow region)

| PDF region | Sample value | JSON path | Frontend surface |
|---|---|---|---|
| Top-left logos + "Highway Safety / PO Box 2000, Charlottetown / Prince Edward Island / Canada C1A 7N8" | (boilerplate) | (audit only — not stored) | Header chrome |
| Top-right logos + "Sécurité routière / C.P. 2000, Charlottetown / Île-du-Prince-Édouard / Canada C1A 7N8" | (boilerplate) | (audit only — not stored) | Header chrome |
| Top-right page header | `2020/11/18` + `Page 1 of 2` | `source.datePrinted` (`"2020-11-18"`), `source.pageCount` (`3`) | "Latest Pull" pill on `NscPeiPerformanceCard` |
| Title bar — centered | "National Safety Code Carrier Abstract Report" + helper text | (not stored) | Section header `NSC Performance` |

### Carrier Information block (green region)

| PDF label | Sample value | JSON path | Frontend surface |
|---|---|---|---|
| `NSC #` | `PEI03660` | `carrier.nscNumber` | Carrier card subtitle |
| `Company Name` | `BUSINESS PORTERS INC.` | `carrier.legalName` | Carrier card title |
| `Address` (line 1) | `5 SUMMER ST UNIT A SUMMERSIDE` | `carrier.address.street` | Carrier card subtitle |
| `Address` (line 2) | `5 SUMMER ST UNIT A SUMMERSIDE` | `carrier.address.street2` | Carrier card subtitle |
| `Address` (line 3) | `Prince Edward Island` | `carrier.address.province` | Carrier card subtitle |
| `Address` (line 4) | `C1E 1J5` | `carrier.address.postalCode` | Carrier card subtitle |
| `Phone #` | `(902)652-7575` | `carrier.phone` | Carrier card subtitle |
| `Safety Rating` | `Satisfactory - Unaudited` | `carrier.safetyRating` | "Safety Rating" row in cert panel |
| `Carrier Profile as of` | `2020/11/18` | `pull.reportDate` (`"2020-11-18"`) | "Carrier Profile as of" subtitle |

### SUMMARY block (blue region)

| PDF label | Sample value | JSON path | Frontend surface |
|---|---|---|---|
| `Collision Points:` | `0` | `pull.collisionPoints` | "Collision Points" tile |
| `Conviction Points:` | `0` | `pull.convictionPoints` | "Conviction Points" tile |
| `Inspection Points:` | `6` | `pull.inspectionPoints` | "Inspection Points" tile |
| `Current Active Vehicles at Last Assessment:` | `7` | `pull.currentActiveVehiclesAtLastAssessment` | "Vehicles at Last Assessment" row |
| `Current Active Vehicles:` | `7` | `pull.currentActiveVehicles` | "Active Vehicles" row + drives Schedule 3 max-points lookup |

> **Frontend math** (computed downstream): `total = 0 + 0 + 6 = 6`. Schedule 3 fleet 6-9 → max 28 pts. `6/28 = 21.4%` → **LOW** zone (under 25% Advisory threshold).

### Collisions section (red region)

| PDF region | Sample content | JSON path |
|---|---|---|
| Section heading `Collisions:` + helper text "Any accident appearing on this abstract does not indicate fault on behalf of this client." | (no rows) | `pull.collisions: []` |
| Column-header row: `Collision Date / Severity / Case # / Fault / # Vehicles / # Killed / # Injured` | (empty for this carrier) | (none — no data row to map) |

### Convictions section (orange region)

| PDF region | Sample content | JSON path |
|---|---|---|
| Section heading `Convictions:` | (no rows) | `pull.convictions: []` |
| Column-header row: `Conviction Date / Loc / Charge / Not Code / Conviction Pts` | (empty) | — |

### Inspections section (purple region)

Section heading `Inspections:` followed by column headers:

`Inspection Date | CVSA Level | Log | TDG | Load Security | Driver Name | Status`

Page 1 contains rows 1-5 (the form fits 5 inspection rows on page 1; rows 6+ continue on page 2).

| seq | inspectionDate | cvsaLevel | log | tdg | loadSecurity | driverName | status | points |
|---:|---|---:|---|---|---|---|---|---:|
| 1 | 2020/10/06 | 3 | Passed | Passed | Passed | MEHRA P    | M | 3 |
| 2 | 2020/09/23 | 3 | Passed | Passed | Passed | KINCH E    | P | 0 |
| 3 | 2020/08/27 | 3 | Passed | Passed | Passed | GILL S     | P | 0 |
| 4 | 2020/06/29 | 3 | Passed | Passed | Passed | INDERJEET  | P | 0 |
| 5 | 2020/05/26 | 3 | Passed | Passed | Passed | SINGH      | M | 3 |

These map to `pull.inspections[]` items.

### Footer (yellow region)

| PDF content | Notes |
|---|---|
| Doug MacEwen signature image | Not stored |
| "Doug MacEwen — Registrar of Motor Vehicles" | Not stored (boilerplate) |
| `Tel/Tél. : 902 368 5210` / `princeedwardisland.ca` / `Fax/Téléc. : 902 368 5236` | Not stored (boilerplate) |

---

## Page 2 — Inspections continuation + Audits

### Top header (yellow region)

Same logos. Top-right shows `2020/11/18` + `Page 2 of 2`. Already captured from page 1.

### Inspections (purple region) — continuation

Same column-header row as page 1, then rows 6 + 7:

| seq | inspectionDate | cvsaLevel | log | tdg | loadSecurity | driverName | status | points |
|---:|---|---:|---|---|---|---|---|---:|
| 6 | 2020/06/19 | 3 | Passed | Passed | Passed | KULWANT    | P | 0 |
| 7 | 2020/06/18 | 3 | Passed | Passed | Passed | RANDHAWA S | P | 0 |

Append to `pull.inspections[]` from page 1.

### Audits section (yellow region)

| PDF region | Sample content | JSON path |
|---|---|---|
| Section heading `Audits:` | (no rows) | `pull.audits: []` |
| Column-header row: `Audit Date / Result / Audit Type` | (empty) | — |

---

## Page 3 — Customer Receipt (NOT extracted)

Page 3 is a $25 payment receipt for the abstract request (Customer Name, Transaction Date, Transaction Number, etc., plus a printed credit-card terminal receipt). **Skip this page entirely** — it's not part of carrier data.

---

## Cross-field validation

After extraction, the validator confirms (see `validate.py`):

1. JSON validates against `schema.json`.
2. **Σ inspection points = `pull.inspectionPoints`** → 3 + 0 + 0 + 0 + 3 + 0 + 0 = **6** ✓.
3. **Σ collision points = `pull.collisionPoints`** → 0 = 0 ✓.
4. **Σ conviction points = `pull.convictionPoints`** → 0 = 0 ✓.
5. **Inspection status ↔ points consistency** → P/W rows have 0 pts, M/OOS rows have 3 pts ✓.
6. **`currentActiveVehicles` (7) maps to Schedule 3** row 6-9 → max 28 pts ✓.
