# BC CVSE Carrier Profile Report PDF Extraction — Vendor Package (v7)

**Audience:** Backend / API vendor building a service that ingests BC Commercial Vehicle Safety and Enforcement (CVSE) **National Safety Code Carrier Profile Reports** (CPODetailReport) and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** v7 — §5 page-16 polish. The CVSA reference page (Inspection Levels + Summary + Defect Breakdown) is now fully highlighted: **all 9 level-letter cells (1-7, C, R)** are picked up via a targeted rect-expansion pass that avoids the 1-char-token false-positive problem, and `defectBreakdown[]` is re-extracted from the PDF (16 rows, with the literal `42 - Windhield, Wipers` misspelling preserved as printed) — replacing the 15 stale frontend-mock labels (`49 - Frame`, `50 - Cargo Securement`, etc.) that didn't match the actual report. **5881** highlights (up from 5866). Schema unchanged from v6. Validator stays green. Frontend code unchanged.

---

## Start here

1. **`BLUEPRINT.md`** — what's in this package and the 8-section anatomy of the BC report.
2. **`schema.json`** — Draft-07 JSON Schema. Your API output must validate against this.
3. **`per-pdf/Inertia_Carrier_2025-04-17/`** — open `README.md` + `extraction-doc.md`, look at `annotated.pdf` next to the raw PDF in `raw-pdfs/`.
4. **`validate.py`** — runs from package root. Walks every `per-pdf/<name>/extracted.json`, runs schema + 12 cross-field math checks.

---

## Package contents

```
.
├── README.md                ← you are here
├── BLUEPRINT.md             ← 8-section methodology + threshold reference
├── schema.json              ← JSON Schema (Draft-07)
├── validate.py              ← schema + 12 cross-field checks
├── CHANGELOG.md
├── raw-pdfs/
│   └── CPODetailReport_INERTIA_2025-04-17.pdf
├── per-pdf/
│   └── Inertia_Carrier_2025-04-17/
│       ├── extracted.json
│       ├── extraction-doc.md
│       ├── annotated.pdf       ← 7-color overlay (PALE labels + STRONG values)
│       ├── lists/*.csv         ← 14 flattened CSV templates
│       └── README.md
└── scripts/
    ├── annotate_pdf.py
    ├── emit_csvs.py
    └── write_readme.py
```

## The 7 highlight colors

| Color | Sink | JSON destination |
|---|---|---|
| 🟢 GREEN  | Carrier identity                      | `carrier.demographics.*`, `carrier.certificate.*` |
| 🔵 BLUE   | Pull-level metric                     | `pull.complianceReview`, `pull.thresholds[]`, `pull.monthlyScores[]` |
| 🟣 PURPLE | CVSA inspection / defect              | `pull.cvsa.summary[]`, `pull.cvsa.defectBreakdown[]`, `pull.cvsa.list[]` |
| 🔴 RED    | Accident                              | `pull.accidents[]` |
| 🟠 ORANGE | Driver contravention                  | `pull.driverContraventions[]`, `pull.pendingDriverContraventions[]`, `pull.contraventionSummary[]`, `pull.carrierContraventions[]` |
| 🟤 BROWN  | Active fleet vehicle / CVIP           | `pull.activeFleet[]`, `pull.cvip[]` |
| 🟡 YELLOW | Audit / source / cover / footer       | `pull.auditSummary[]`, `source.*`, page header / TOC |

## Validator checks (12)

| # | Check |
|---|---|
| 1 | JSON validates against `schema.json` (Draft-07) |
| 2 | `monthlyScores` ≤ 24 rows (BC's rolling window) |
| 3 | `monthlyScores` sorted newest-first |
| 4 | Each month's `avg = vd / ad` (±0.05) |
| 5 | Each month's `total = contra + cvsa + acc` (±0.02) |
| 6 | `complianceReview.totalScore = Σ scores[].score` (±0.02) |
| 7 | CVSA inspections with `result === 'OOS'` have `pts === 3`; non-OOS have `pts === null` or 0 |
| 8 | Every CVSA inspection has ≥ 1 Power Unit / Bus / Trailer / Vehicle in `units[]` |
| 9 | `defectBreakdown[].totalDefects = oos + fail` when both present |
| 10 | At-fault accident severity ↔ points (PD = 2, Injury = 4, Fatal = 6) |
| 11 | `source.profileFrom` and `source.profileTo` present |
| 12 | CVSA `Total Inspections.count = Σ (D/V + V-only + D-only) counts` |
| 13 | `carrier.nscNumber === carrier.demographics.nscNumber` |

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts a BC CPODetailReport PDF and returns JSON validating against `schema.json`.
2. For the shipped sample, your API output matches the shipped `extracted.json` field-for-field within sensible tolerance.
3. All 13 validator checks pass for every per-PDF folder.
4. CSV templates in `lists/` are reproducible from your JSON output.
5. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
6. Single PDF latency ≤ 30 s for the synchronous endpoint.
