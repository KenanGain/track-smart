# v6 Changelog — combines v4 data + v5 highlighter

## What's in v6

v6 inherits from two sources to give you both correctness AND coverage:

| Component | Source | What it gives v6 |
|---|---|---|
| **JSON Schema** (`schema.json`)             | v4 | Authoritative Draft-07 — all per-pull fields the frontend renders |
| **Validator** (`validate.py`)               | v4 | 15 cross-field math checks; walks every `per-pdf/<name>/extracted.json` |
| **Per-PDF data** (`per-pdf/<name>/extracted.json`, `lists/*.csv`, `extraction-doc.md`, `README.md`) | v4 | Real values from your PDF paste wired into the small-carrier folder; per-page extraction map; flattened CSVs |
| **Highlighter coverage** (`highlighted-pdfs/*.annotated.pdf` + `scripts/highlight_cvor_pdf_v6.py`) | **v5** | Three coverage fixes that v4 still missed: |
| | | • Page-1 inclusion for Collision/Conviction Detail boxes (v4 had them scoped pp.2-3 only) |
| | | • `Category*` asterisk-strip on BOTH sides so the column header label matches `Category` data tokens |
| | | • **KMR matrix zone-highlight pass** — the Collision/Conviction Breakdown by Kilometre Rate tables are matrix data with no per-cell labels, so the label→value-to-right matcher couldn't reach them. v5/v6 add a band-based zone-fill below each KMR title. |

## v6 file inventory

```
docs/cvor-extraction-vendor-package-v6/                ~38 MB / 69 files
├── README.md                      ← entry point (from v3 docs)
├── BLUEPRINT.md                   ← per-PDF + per-page methodology
├── CHANGELOG.md                   ← this file
├── schema.json                    ← Draft-07 JSON Schema (v4)
├── validate.py                    ← walks per-pdf/, runs 15 checks (v4)
├── raw-pdfs/                      ← 5 raw PDFs
├── highlighted-pdfs/              ← 5 v5-quality annotated PDFs (mirror of per-pdf/<name>/annotated.pdf)
└── per-pdf/                       ← 5 PDF folders, each with:
    ├── README.md                      per-PDF summary card
    ├── extracted.json                 full v2 schema, internally consistent
    ├── annotated.pdf                  ← v5-quality highlights (page-1 detail boxes + KMR zones now caught)
    ├── extraction-doc.md              page-by-page → JSON path → frontend surface
    └── lists/                         7 flattened CSVs
```

## Companion scripts

- `scripts/generate-v6-package.cjs` — rebuilds every per-PDF folder (deterministic; same generator as v4).
- `scripts/highlight_cvor_pdf_v6.py` — v5-quality highlighter (page-1 inclusion, Category* fix, KMR zone-highlight pass).

## Validator: 15 / 15 cross-field checks pass on all 5 per-PDF folders ✅

```
[1]  Schema is a valid Draft-07 document
[2]  Every per-pdf/<name>/extracted.json validates against schema
[3]  CSV templates parse cleanly
[4]  collisionDetails sums to collisionEvents
[5]  convictionDetails axes both sum to convictionEvents
[6]  levelStats counts sum to cvsaInspections
[7]  derived OOS rate ≈ oosOverall (±2.0)
[8]  totalInspectionPoints ≈ 0.6875×D + V (±0.05)
[9]  collisionBreakdown events + points sum
[10] convictionBreakdown events + points sum
[11–13] event-list type counts match summary fields
[14] event-points totals match
[15] travelKm[] totalKm sums to ±5% of totalMiles
```

## Real PDF data — small-carrier folder

The folder `per-pdf/20241104_125433_0000369fbd10/` carries the **real values from your PDF paste**:

| Field | Value |
|---|---|
| Window | 2024-01-27 → 2026-01-26 (24 mo) |
| Rating | **32.18%** |
| Collisions | **4** (0 fatal · 0 PI · 4 PD; 2 with-pts / 2 not-pointed) |
| Convictions | **10** (6 driver · 0 vehicle · 1 load · 3 other; 9 with-pts / 1 not-pointed) |
| Inspections | **36 CVSA** across L1=5 / L2=4 / L3=17 / L4=7 / L5=3 |
| Inspections OOS | L1=4 / L2=1 / L3=1 / L4=1 / L5=0 = **7 total** |
| OOS rates | Vehicle 33.33% · Driver 3.45% · Overall 20.69% (excl. L4) |
| Performance | Col 23.47% · Conv 38.48% · Insp 37.00% · Overall 32.18% |
| Coll KMR | P1: 1/0 · P2: 0/0 · P3: 3/4 · Total: 4/4 |
| Conv KMR | P1: 0/0 · P2: 4/6 · P3: 6/10 · Total: 10/16 |
| Insp threshold | CVSA 36 · Veh 38 · Drv 36 · D=1 · V=6 · Total 6.69 · Threshold 18.08 |

All math closes against the validator's 15 checks.

## How a vendor uses v6

```bash
cd per-pdf/06042001_Ontario/
# Open raw-pdfs/06042001_Ontario.pdf and per-pdf/06042001_Ontario/annotated.pdf
# side by side. The annotated.pdf is the v5-quality version with KMR matrix
# zone-highlights and page-1 detail-box highlights.
# Read extraction-doc.md while building your parser.
# Save your output as extracted.json.
cd ../..
python validate.py     # all 15 checks must pass
```

Generator script (re-run any time the schema or specs change):

```bash
node scripts/generate-v6-package.cjs    # rebuilds per-pdf/<name>/{extracted.json, README.md, extraction-doc.md, lists/*.csv}
python scripts/highlight_cvor_pdf_v6.py # rebuilds highlighted-pdfs/*.annotated.pdf  (slow — OCR ≈ 12 min)
```

## Lineage

```
v1  →  v2 (schema expanded for new frontend fields)
       ↓
       v3 (per-PDF folder reorganization + bare bucket priorities + 7-color overlay)
       ↓
       v4 (real PDF data wired into small-carrier; expanded BLUE label list +
           Jurisdiction/Location for events)
       ↓
       v5 (highlighter coverage fixes: page-1 inclusion, Category* asterisk,
           KMR matrix zone-highlight pass)
       ↓
       v6 = v4 data + v5 highlighting  ← YOU ARE HERE
```
