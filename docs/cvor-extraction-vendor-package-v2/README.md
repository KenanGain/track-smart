# CVOR PDF Extraction — Vendor Specification Package (v2)

**Audience:** Backend / API vendor building a service that ingests Ontario MTO CVOR PDFs and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** v2 — expanded scope. Now reflects every per-pull field the TrackSmart frontend renders.

---

## What changed vs v1

The TrackSmart CVOR page now drives every section of the **Pull Snapshot** from the per-pull JSON — no fall-back to global lists or hard-coded values. Therefore the extractor must now return:

| New / expanded field | What it drives in the UI | PDF source page(s) |
|---|---|---|
| `pull.collisionDetails` (fatal / personalInjury / propertyDamage) | "By Severity" rows in **Collision Details** mini section | p.2 — Collision Details box |
| `pull.convictionDetails` (driver / vehicle / load / other / withPoints / notPointed) | "By Category" + "By Points Status" rows in **Conviction Details** mini section | p.2/p.3 — Conviction Details box |
| `pull.levelStats` (Level 1-5 count + oosCount) | **CVOR Rating Comparison** mini section + main page Level cards | p.2 — # Inspections by Level table |
| `pull.inspectionStats` (cvsa / vehicles / drivers / D-pts / V-pts / total / threshold) | **Inspection Statistics** mini section | p.3 — Inspection Threshold Calculation table |
| `pull.collisionBreakdown[3]` and `pull.convictionBreakdown[3]` | **Collision / Conviction Breakdown by Kilometre Rate** mini sections | p.3 — KMR breakdown tables |
| `pull.events[]` | **Intervention & Event Details** mini section + bottom all-pulls aggregate table + KPI cards | pp.4–N — Intervention & Event Details list |
| `pull.travelKm[]` | **Travel Kilometric Information** mini section | p.18+ — Travel Kilometric Information table |

All v1 fields (`rating`, `colContrib`, `oosOverall`, `trucks`, etc.) are preserved with the same semantics.

---

## ⭐ Which data we need extracted (3-second summary)

Every value highlighted in our reference PDFs. The 4-color overlay tells you which sink each value belongs to:

| Color | Sink | What it becomes | Approx fields per PDF |
|---|---|---|---|
| 🟢 GREEN  | Carrier Identity      | Sticky carrier-profile fields | ~13 |
| 🔵 BLUE   | Per-Pull Metric       | One row in `cvorPeriodicReports` (drives KPI cards, history chart, Pull-by-Pull table, **Latest Pull Snapshot card**) | ~70 (was ~30) |
| 🟣 PURPLE | Per-Inspection Event  | One entry in `pull.events[]` of type `inspection` | ~20 per event |
| 🔴 RED    | Per-Collision Event   | One entry in `pull.events[]` of type `collision` | ~15 per event |
| 🟠 ORANGE | Per-Conviction Event  | One entry in `pull.events[]` of type `conviction` | ~15 per event |
| 🟤 BROWN  | Travel KM row         | One entry in `pull.travelKm[]` | ~11 per row |
| 🟡 YELLOW | Optional / audit      | Order #, Search Date, US DOT, Mobile, Fax | ~7 |

In each color, the **pale shade marks the LABEL** and the **strong shade marks the VALUE**. Match by label, capture value, emit JSON.

**Authoritative field-by-field map:** `02-data-model.md` + `cvor-extraction-response.schema.json`.

---

## What we need from you

A REST API that accepts an MTO CVOR PDF and returns extracted data as JSON conforming to **`cvor-extraction-response.schema.json`** in this package.

- **Input:** one CVOR PDF (or many, in bulk).
- **Output:** one JSON object per PDF, matching the v2 schema.
- **We persist** the JSON in our database.
- **We render** it on our existing CVOR page (Pull-by-Pull Data table → Pull Snapshot card with all 10 sub-sections + bottom all-pulls aggregate table).

Each uploaded PDF represents **one CVOR pull** (a 24-month rolling snapshot). Same carrier uploaded multiple times → every upload is appended to history (`cvorPeriodicReports`).

---

## What's in this package

| Path | Purpose |
|---|---|
| `README.md`                                  | This document — start here |
| `00-CRUX.txt`                                | Plain-text one-page summary |
| `01-overview.md`                             | Problem statement + carrier-context primer |
| `02-data-model.md`                           | Field-by-field walkthrough, with PDF source label and page |
| `03-api-contract.md`                         | Endpoints, auth, request/response, errors, bulk semantics |
| `04-validation.md`                           | Validation rules + cross-field checks (sums, math closure) |
| `05-frontend-mapping.md`                     | How each JSON field is rendered in our UI |
| `06-pdf-extraction-by-page.md`               | Page-by-page extraction map for the standard 19-page PDF |
| `07-training-data-guide.md`                  | Per-PDF profiles for the 5 sample PDFs |
| `08-v2-changes.md`                           | **NEW** — Detailed changelog of v1 → v2 fields |
| `cvor-extraction-response.schema.json`       | **Authoritative JSON Schema (draft-07) — v2** |
| `examples/response-single.json`              | Full example response (PDF #1 ground truth, v2) |
| `examples/response-bulk.json`                | Bulk response shape (success + failure example) |
| `examples/response-error.json`               | All 7 error codes, one example each |
| `examples/expected/<pdf>.json`               | Per-PDF ground truth (one per training PDF) |
| `templates/pulls.csv`                        | CSV header + sample row, per-pull record (v2) |
| `templates/inspection-events.csv`            | CSV header + sample rows for inspection events |
| `templates/collision-events.csv`             | **NEW** — CSV for collision events |
| `templates/conviction-events.csv`            | **NEW** — CSV for conviction events |
| `templates/level-stats.csv`                  | **NEW** — CSV for per-level inspection counts/OOS |
| `templates/breakdown-by-km.csv`              | **NEW** — CSV for collision + conviction km-rate breakdowns |
| `templates/travel-km.csv`                    | **NEW** — CSV for travel kilometric rows |
| `templates/tickets.csv`                      | CSV for tickets |
| `validate.py`                                | Self-test |
| `highlighted-pdfs/`                          | 5 annotated PDFs with the color overlay (run script to regenerate after v2 schema changes) |
| `raw-pdfs/`                                  | 5 raw PDFs (the training/validation set) |
| `reference-highlighted-pdf.md`               | How to read the annotated reference PDFs |

---

## Sample PDFs

Same 5 PDFs as v1 (in `raw-pdfs/`) — copied in, byte-identical:

| # | Raw PDF | Pages |
|---|---|---:|
| 1 | `06042001_Ontario.pdf`                  | 19 |
| 2 | `03072022_Ontario.pdf`                  | 17 |
| 3 | `06042001_Ontario (2).pdf`              | 19 (duplicate of #1, useful for determinism check) |
| 4 | `20250203_100539_0000850abd10.pdf`      | 29 |
| 5 | `20241104_125433_0000369fbd10.pdf`      | 8 |

The annotated PDFs in `highlighted-pdfs/` will be regenerated by running the updated highlight script:
```bash
pip install pymupdf rapidocr-onnxruntime
python ../../scripts/highlight_cvor_pdf.py
```

The script's `--out` defaults to `docs/cvor-extraction-vendor-package-v2/highlighted-pdfs/` when run from the repo root.

---

## How to validate (vendor self-test)

```bash
pip install jsonschema
python validate.py
```

Validates schema, examples, CSV templates, and per-PDF expected against the v2 schema. Adds these v2 cross-field checks:

| # | Check | Purpose |
|---|---|---|
| 7 | `collisionDetails.fatal + personalInjury + propertyDamage === collisionEvents` | Severity sum closure |
| 8 | `convictionDetails.driver + vehicle + load + other === convictionEvents` AND `withPoints + notPointed === convictionEvents` | Both axes sum to total |
| 9 | `Σ levelStats.levelN.count === inspectionStats.cvsaInspections` | Level distribution sums to total |
| 10 | `(Σ levelStats.levelN.oosCount × 100) / cvsaInspections ≈ oosOverall` (±0.5) | OOS overall is internally consistent |
| 11 | `inspectionStats.totalInspectionPoints ≈ 0.6875 × driverPoints + vehiclePoints` (±0.05) | Threshold formula |
| 12 | `Σ collisionBreakdown[i].events === collisionEvents` AND `Σ points === totalCollisionPoints` | KMR breakdown sums |
| 13 | Same for `convictionBreakdown` | KMR breakdown sums |
| 14 | `events.filter(type==='collision').length === collisionEvents` etc. for inspection + conviction | Event-list consistency with summary counts |
| 15 | `Σ travelKm[].totalKm ≈ totalMiles` (±5%) | Travel KM closure |

---

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts a CVOR PDF and returns JSON that **validates against `cvor-extraction-response.schema.json` (v2)**.
2. For our sample PDF (`06042001_Ontario.pdf`), the returned JSON matches `examples/response-single.json` field-for-field (within sensible tolerance — see `04-validation.md`).
3. All 15 cross-field validation checks pass when `validate.py` is run against your output.
4. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
5. CSV templates (`templates/`) are reproducible from your JSON output.
6. Latency: single PDF response within **30 s** for the synchronous endpoint; bulk allowed to be async.

---

## Out of scope

- Multi-year travel-kilometric rows older than the pull's 24-month window (we only need rows that overlap the window).
- Tow-operator sanctions (no carrier in the training set has any).
- Insurance / TDG / audit reports — those are uploaded separately, not extracted from the CVOR PDF.

---

## Open questions to confirm with vendor

1. Will OCR be used, or do you have a structured PDF extractor for MTO forms?
2. Pricing model: per-PDF, per-page, per-month?
3. Async vs sync for single uploads — what's your default?
4. Webhook support for bulk-job completion?
5. SLA on accuracy — what % of fields do you guarantee at >99% correct?
6. Data retention policy?
