# CVOR PDF Extraction — Vendor Package (v3)

**Audience:** Backend / API vendor building a service that ingests Ontario MTO CVOR PDFs and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** v3 — per-PDF deliverables. Same schema as v2; reorganised so every artifact for a single PDF lives together.

---

## Start here

Read in this order:

1. **`BLUEPRINT.md`** — what's in this package and why it's organised this way (per-PDF folders).
2. **`schema.json`** — the authoritative JSON Schema (Draft-07). Your API output must validate against this.
3. **One folder under `per-pdf/`** — pick a PDF, open its folder, read its `README.md` + `extraction-doc.md` while looking at `annotated.pdf` next to the raw `raw-pdfs/<name>.pdf`. The folder also contains `extracted.json` (the JSON your API should produce) and `lists/*.csv` (flattened CSV templates).
4. **`validate.py`** — runs from the package root. Walks every `per-pdf/<name>/extracted.json` and confirms schema validity + 15 cross-field math checks.

---

## Package contents

```
.
├── README.md                        ← you are here
├── BLUEPRINT.md                     ← per-PDF + per-page methodology
├── schema.json                      ← JSON Schema (Draft-07)
├── validate.py                      ← walks every per-pdf/<name>/extracted.json
├── raw-pdfs/                        ← all 5 raw PDFs in one folder
│   ├── 06042001_Ontario.pdf
│   ├── 06042001_Ontario (2).pdf
│   ├── 03072022_Ontario.pdf
│   ├── 20250203_100539_0000850abd10.pdf
│   └── 20241104_125433_0000369fbd10.pdf
└── per-pdf/                         ← one folder per PDF
    ├── 06042001_Ontario/
    ├── 06042001_Ontario_2/          ← duplicate of #1, byte-identical
    ├── 03072022_Ontario/
    ├── 20250203_100539_0000850abd10/
    └── 20241104_125433_0000369fbd10/
```

Inside every `per-pdf/<name>/` folder:

| File | What it is |
|---|---|
| `README.md`         | Per-PDF summary card (CVOR #, carrier, pull date, fleet, totals, file index). |
| `extracted.json`    | Full v2-shape extraction for this PDF. Schema-valid, all cross-field checks pass. |
| `annotated.pdf`     | The raw PDF with the 7-color overlay. Pale = label, strong = value. |
| `extraction-doc.md` | **Page 1 → page N walk-through** for THIS PDF. Each row: label on the page → JSON path → frontend surface. |
| `lists/`            | One CSV per list-shaped field: pull-summary, level-stats, breakdown-by-km, inspection-events, collision-events, conviction-events, travel-km. |

---

## The 7 highlight colors

| Color | Sink | JSON destination |
|---|---|---|
| 🟢 GREEN  | Carrier identity | `carrier.*` |
| 🔵 BLUE   | Per-pull metric  | `pull.{rating, oos*, contributions, severity, level stats, …}` |
| 🟣 PURPLE | Inspection event | `events[i]` with `type='inspection'` |
| 🔴 RED    | Collision event  | `events[i]` with `type='collision'` |
| 🟠 ORANGE | Conviction event | `events[i]` with `type='conviction'` |
| 🟤 BROWN  | Travel KM row    | `travelKm[i]` |
| 🟡 YELLOW | Optional / audit | `source.{orderNumber, searchDate}`, `carrier.{mobile, fax, usDotNumber}` |

In each color, **pale shade = LABEL** (the text on the PDF that names the field) and **strong shade = VALUE** (the data you actually capture).

---

## How a vendor uses this package

```bash
# 1. Pick a PDF folder
cd per-pdf/06042001_Ontario/

# 2. Open the raw PDF + the annotated PDF side by side
#    raw-pdfs/06042001_Ontario.pdf      ← what your parser sees
#    per-pdf/06042001_Ontario/annotated.pdf  ← what to extract (color-coded)

# 3. Read extraction-doc.md page by page; build your parser
# 4. Run your API on the raw PDF; save output as extracted.json (overwriting)
# 5. Compare your output against the shipped extracted.json — field-for-field, with sensible tolerance
# 6. Run the validator from package root:
cd ../..
python validate.py
```

Validator exit code `0` = schema-conformant **and** mathematically consistent.

---

## Validator checks

| # | Check |
|---|---|
| 1 | JSON Schema is a valid Draft-07 document |
| 2 | Every `per-pdf/<name>/extracted.json` validates against the schema |
| 3 | CSV templates parse cleanly, no duplicate columns |
| 4 | `collisionDetails.fatal + personalInjury + propertyDamage === collisionEvents` |
| 5 | `convictionDetails.{withPoints+notPointed}` and `{driver+vehicle+load+other}` both equal `convictionEvents` |
| 6 | `Σ levelStats.levelN.count === inspectionStats.cvsaInspections` |
| 7 | `(Σ oosCount × 100) / cvsa ≈ oosOverall` (±1.0) |
| 8 | `0.6875 × driverPoints + vehiclePoints ≈ totalInspectionPoints` (±0.05) |
| 9 | `Σ collisionBreakdown[i].events === collisionEvents` AND points sum to `totalCollisionPoints` |
| 10 | Same for `convictionBreakdown` |
| 11 | `events.filter(type=='inspection').length === cvsaInspections` |
| 12 | `events.filter(type=='collision').length === collisionEvents` |
| 13 | `events.filter(type=='conviction').length === convictionEvents` |
| 14 | Σ collision-event `points` === `totalCollisionPoints`; same for convictions |
| 15 | `Σ travelKm[].totalKm ≈ totalMiles` (±5%) |

When any of these fail for any per-PDF JSON, the validator prints which file and which check failed.

---

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts a CVOR PDF and returns JSON validating against `schema.json`.
2. For each shipped sample (5 PDFs in this package), your API output matches the shipped `extracted.json` field-for-field within sensible tolerance.
3. All 15 validator checks pass for every per-PDF folder.
4. CSV templates in `lists/` are reproducible from your JSON output.
5. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
6. Single PDF latency ≤ 30 s for the synchronous endpoint; bulk allowed to be async.

---

## Open questions to confirm with vendor

1. Will OCR be used, or do you have a structured PDF extractor for MTO forms?
2. Pricing model: per-PDF, per-page, per-month?
3. Async vs sync default for single uploads?
4. Webhook support for bulk-job completion?
5. SLA on accuracy (which fields >99%)?
6. Data retention policy on the uploaded PDFs and the extracted JSON?
