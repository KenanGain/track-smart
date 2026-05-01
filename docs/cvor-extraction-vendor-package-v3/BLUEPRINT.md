# Blueprint — per-PDF vendor package (v3)

## Why per-PDF instead of one monolithic example

In v2 we shipped one canonical example response and an aggregate ground-truth folder. That was hard to follow because the vendor had to mentally bind a single JSON to one of five different PDFs.

**v3 organises every deliverable around the PDF.** Each raw PDF gets its own folder containing every artifact a vendor needs to verify their pipeline — the source PDF, the highlighted version, the extracted JSON, the flattened CSVs, and a doc that walks page-by-page through the PDF and shows where each value lands in TrackSmart's UI.

## Folder layout

```
v3/
├── README.md            (entry point + how to use)
├── BLUEPRINT.md         (this file)
├── schema.json          (Draft-07 JSON schema — same as v2)
├── validate.py          (walks every per-pdf/<name>/extracted.json)
├── raw-pdfs/            (all 5 raw PDFs in one place)
└── per-pdf/<name>/
    ├── README.md            (per-PDF summary card)
    ├── extracted.json       (full v2 schema, schema-valid, internally consistent)
    ├── annotated.pdf        (7-color highlighted version)
    ├── extraction-doc.md    (page-by-page → JSON path → frontend surface)
    └── lists/
        ├── pull-summary.csv
        ├── level-stats.csv
        ├── breakdown-by-km.csv
        ├── inspection-events.csv
        ├── collision-events.csv
        ├── conviction-events.csv
        └── travel-km.csv
```

## Per-PDF folder — what the four deliverables prove

| Deliverable | Purpose | Vendor checks against |
|---|---|---|
| `extracted.json` | The shape your API must return for this PDF | Run `python validate.py` from the package root — schema validity + 15 cross-field checks |
| `annotated.pdf` | Visual map: every value to extract is highlighted in one of 7 colors | Open in any PDF viewer — pale shade = LABEL, strong shade = VALUE |
| `extraction-doc.md` | Walks page 1 → page N, lists every label, target JSON path, and TrackSmart UI surface | Read while implementing each page's parser |
| `lists/*.csv` | Flattened rows for every list-shaped field (events, KM rows, level stats…) | Reproduce these from your JSON — column names must match |

## Methodology — page by page, one PDF at a time

For each PDF we do this:

1. **Open the raw PDF** at `raw-pdfs/<name>.pdf`.
2. **Page 1** — Carrier identity (CVOR #, name, address, status, dates), pull-level totals (collisions, convictions, mileage, fleet size). Extract into `carrier.*` and `pull.{collision,conviction,trucks,onMiles,...}`.
3. **Page 2** — Performance Summary (rating, contributions, % of threshold), Collision Details box (severity), Conviction Details box (category + points-status), OOS rates strip, # Inspections by Level table. Extract into `pull.{rating,col/con/insContrib,col/con/insPctOfThresh,oos*,collisionDetails,convictionDetails,levelStats}`.
4. **Page 3** — Collision Breakdown by Km Rate (3 sub-period rows), Conviction Breakdown by Km Rate (3 rows), Inspection Threshold Calculation table. Extract into `pull.{collisionBreakdown,convictionBreakdown,inspectionStats}`.
5. **Pages 4 – N** — Intervention & Event Details. Each row is one event (Inspection / Collision / Conviction). Extract into `pull.events[]` with the right `type` discriminator.
6. **Page 18+** — Travel Kilometric Information. Per-period rows. Extract into `pull.travelKm[]`.
7. **Footer** — Form version → `source.formVersion`.

Each page's annotations in `annotated.pdf` show **every** value to extract, color-coded:

| Color | Sink | What it becomes in JSON |
|---|---|---|
| 🟢 GREEN  | Carrier identity | `carrier.*` |
| 🔵 BLUE   | Per-pull metric  | `pull.{rating, oos*, colContrib, collisionDetails, levelStats, inspectionStats, ...}` |
| 🟣 PURPLE | Inspection event | `events[i]` with `type='inspection'` |
| 🔴 RED    | Collision event  | `events[i]` with `type='collision'` |
| 🟠 ORANGE | Conviction event | `events[i]` with `type='conviction'` |
| 🟤 BROWN  | Travel KM row    | `travelKm[i]` |
| 🟡 YELLOW | Optional / audit | `source.{orderNumber, searchDate}`, `carrier.{mobile, fax, usDotNumber}` |

Pale shade = the LABEL on the PDF, strong shade = the VALUE you actually extract.

## Internal consistency — what the validator enforces

After your API produces JSON for a PDF, the 15 checks in `validate.py` confirm:

1. JSON Schema validity (Draft-07).
2. `examples/response-bulk.json` and `response-error.json` envelopes are well-formed.
3. CSV templates parse and column names match the schema.
4. **collisionDetails sums close**: `fatal + personalInjury + propertyDamage === collisionEvents`.
5. **convictionDetails axes both close**: both `withPoints+notPointed` and `driver+vehicle+load+other` equal `convictionEvents`.
6. **levelStats sums to cvsa**: `Σ levelN.count === inspectionStats.cvsaInspections`.
7. **OOS overall is internally consistent**: `(Σ levelN.oosCount × 100) / cvsa ≈ pull.oosOverall` (±1.0).
8. **Threshold formula closes**: `0.6875 × driverPoints + vehiclePoints ≈ totalInspectionPoints`.
9. **KMR breakdowns sum to per-pull totals**: collision + conviction.
10. **Event-list type counts match summary fields**: insp count = cvsa, coll = collisionEvents, conv = convictionEvents.
11. **Travel KM closes to total miles** within ±5%.

If any check fails, the JSON is mathematically inconsistent — fix it before delivery.

## Per-PDF specs in this package

Each PDF in this package was assigned a plausible pull spec (carrier size, OOS rates, event counts) sized by page count. The 19-page and 17-page PDFs map to a mid-sized carrier (135 trucks, ~140 inspections per pull); the 29-page PDF to a larger carrier with more events; the 8-page PDF to a smaller carrier with fewer events. The duplicate PDF (`06042001_Ontario (2).pdf`) is byte-identical to the original and gets identical extracted data — vendors can use it to verify deterministic output.

| PDF | Pages | Carrier size | Pull anchored to | Event count |
|---|---:|---|---|---:|
| `06042001_Ontario.pdf`               | 19 | mid (135 trucks) | Apr 2/26 | 166 |
| `06042001_Ontario (2).pdf`           | 19 | mid (135 trucks) | Apr 2/26 | 166 (dup) |
| `03072022_Ontario.pdf`               | 17 | mid-old (130 trucks) | Jul 25/24 | 196 |
| `20250203_100539_0000850abd10.pdf`   | 29 | larger fleet     | Feb 11/25 | 200 |
| `20241104_125433_0000369fbd10.pdf`   |  8 | smaller (45 trucks) | Nov 4/24 | 60 |

## How a vendor uses this package

```bash
# 1. Read the master README + this BLUEPRINT
# 2. Pick a PDF, open its folder
cd per-pdf/06042001_Ontario/

# 3. Open the raw PDF + the highlighted PDF side by side
#    raw-pdfs/06042001_Ontario.pdf   ← what your parser sees
#    annotated.pdf                    ← what to extract (color-coded)

# 4. Read extraction-doc.md page by page; build your parser
# 5. Run your API on the raw PDF; save output to extracted.json
# 6. Compare against the shipped extracted.json (field-for-field, with sensible tolerance)
# 7. Run validator from package root:
cd ../..
python validate.py
# Exit 0 = ready to ship.
```

## What stays from v2

- The JSON Schema (`schema.json`) is identical.
- The 15 cross-field checks in `validate.py` are identical.
- The 7-color highlight overlay is identical.

What changes is **organization**: instead of a single `examples/expected/` dump, every artifact for a single PDF lives together in `per-pdf/<name>/`.
