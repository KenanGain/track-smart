# Blueprint — Alberta Carrier Profile vendor package (v6)

## What an Alberta Carrier Profile looks like

The Alberta Transportation **Carrier Profile** is a standardised PDF (~15-30 pages) divided into 6 numbered Parts plus a cover. The Table of Contents (page 2) lists each Part and its page span. Every Part repeats the carrier identity in its header banner.

| Section | Pages (typical) | Frontend home |
|---|---|---|
| Cover + TOC                       | 1–2 | `source.*` + `carrier.{nscNumber, legalName}` |
| **Part 1** Carrier Information     | 1   | `carrier.*` (identity + address) and `pull.{rFactor, contributions, fleetRange, fleetType, monitoringStage, avgFleet, currentFleet}` |
| **Part 2** Conviction Information | 4–6  | `pull.convictionAnalysis[]`, `pull.convictionSummary[]`, `pull.convictionDetails[]` |
| **Part 3** CVSA Inspection Info   | 4–10 | `pull.cvsaDefectAnalysis[]`, `pull.cvsaDefectTotals`, `pull.cvsaSummary[]`, `pull.cvsaDetails[]` |
| **Part 4** Collision Information  | 2–4  | `pull.collisionTotals[]`, `pull.collisionSummary[]`, `pull.collisionDetails[]` |
| **Part 5** Violation Information  | 3–5  | `pull.violationAnalysis[]`, `pull.violationSummary[]`, `pull.violationDetails[]` |
| **Part 6** Monitoring Information | 3–5  | `pull.monitoring.{industry, thresholds, summary[], details[]}` |

**There is no travel-kilometre section** in the Alberta profile — that's an Ontario/CVOR-only concept. R-Factor stages and the monthly Monitoring tables replace it as the time-series component.

## Why per-PDF instead of one monolithic example

Same reason as the CVOR v3+ vendor packages: a single example response is hard to mentally bind to one of N different PDFs. **v1 organises every deliverable around the PDF.** Each raw PDF gets its own folder containing every artifact a vendor needs to verify their pipeline — the source PDF, the highlighted version, the extracted JSON, the flattened CSVs, and a doc that walks page-by-page through the PDF and shows where each value lands in TrackSmart's UI.

## Folder layout

```
v1/
├── README.md            (entry point + how to use)
├── BLUEPRINT.md         (this file)
├── schema.json          (Draft-07 JSON schema)
├── validate.py          (walks every per-pdf/<name>/extracted.json)
├── CHANGELOG.md
├── raw-pdfs/            (7 raw PDFs in one place)
└── per-pdf/<name>/
    ├── README.md            (per-PDF summary card)
    ├── extracted.json       (full v1 schema, schema-valid, internally consistent)
    ├── annotated.pdf        (7-color highlighted version)
    ├── extraction-doc.md    (page-by-page → JSON path → frontend surface)
    └── lists/
        ├── conviction-analysis.csv      (Part 2 group totals — 16 rows)
        ├── conviction-summary.csv       (Part 2 short list)
        ├── conviction-details.csv       (Part 2 long list)
        ├── cvsa-defect-analysis.csv     (Part 3 defect category totals — 19 rows)
        ├── cvsa-summary.csv             (Part 3 short list)
        ├── cvsa-details.csv             (Part 3 long list — one row per inspection)
        ├── cvsa-defect-rows.csv         (Part 3 long list, exploded — one row per (inspection, vehicle, defect))
        ├── collision-totals.csv         (Part 4 totals — 3 rows)
        ├── collision-summary.csv        (Part 4 short list)
        ├── collision-details.csv        (Part 4 long list)
        ├── violation-analysis.csv       (Part 5 group totals — 16 rows)
        ├── violation-summary.csv        (Part 5 short list)
        ├── violation-details.csv        (Part 5 long list — one row per record)
        ├── violation-offences.csv       (Part 5 long list, exploded — one row per offence)
        ├── monitoring-summary.csv       (Part 6 monthly summary — newest first)
        └── monitoring-details.csv       (Part 6 monthly component metrics)
```

## Per-PDF folder — what the four deliverables prove

| Deliverable | Purpose | Vendor checks against |
|---|---|---|
| `extracted.json` | The shape your API must return for this PDF | Run `python validate.py` from the package root — schema validity + cross-field checks |
| `annotated.pdf` | Visual map: every value to extract is highlighted in one of 7 colors | Open in any PDF viewer — pale shade = LABEL, strong shade = VALUE |
| `extraction-doc.md` | Walks page 1 → page N, lists every label, target JSON path, and TrackSmart UI surface | Read while implementing each Part's parser |
| `lists/*.csv` | Flattened rows for every list-shaped field | Reproduce these from your JSON output — column names must match |

## Methodology — Part by Part

For each PDF we do this:

1. **Cover + TOC (pp.1-2)** — Pull `NSC Number`, `Carrier Name`, profile period, date printed. Each Part's page range from the TOC anchors `source.*`.
2. **Part 1 — Carrier Information** — Pull NSC #, MVID #, address, Safety Fitness Rating, Operating Status, R-Factor Score, Fleet Range, Fleet Type, contribution to R-Factor (3 %s), Monitoring Stage, Avg + Current fleet size. Extract into `carrier.*` and `pull.{rFactor, contributions, fleetRange, fleetType, monitoringStage, avgFleet, currentFleet}`.
3. **Part 2 — Conviction Information**
   - Banner totals: `Documents`, `Convictions` → `pull.totalConvictions`, `pull.totalConvictionDocuments`.
   - Conviction Analysis (16-row CCMTA group table) → `pull.convictionAnalysis[]`.
   - Conviction Summary (one row per conviction) → `pull.convictionSummary[]`.
   - Conviction Details (one block per conviction with Act/Section, CCMTA code, Active Points) → `pull.convictionDetails[]`.
4. **Part 3 — CVSA Inspection Information**
   - Banner totals: `Documents`, `CVSA Inspections` → `pull.totalCvsaInspections`, `pull.totalCvsaDocuments`.
   - Defect Analysis (19-row table — OOS / REQ / Total / %) → `pull.cvsaDefectAnalysis[]` + `pull.cvsaDefectTotals`.
   - Inspection Summary → `pull.cvsaSummary[]`.
   - Inspection Details (per record: vehicles list + defects list) → `pull.cvsaDetails[]`.
5. **Part 4 — Collision Information**
   - Totals table (Property Damage / Injury / Fatal × count, non-prev, prev-or-not-evaluated, points) → `pull.collisionTotals[]`.
   - Collision Summary → `pull.collisionSummary[]`.
   - Collision Details → `pull.collisionDetails[]`.
6. **Part 5 — Violation Information**
   - Banner totals: `Documents`, `Offences` → `pull.totalViolations`, `pull.totalViolationDocuments`.
   - Violation Group Analysis (16-row, same buckets as Part 2 but for warnings/violations) → `pull.violationAnalysis[]`.
   - Violation Summary → `pull.violationSummary[]`.
   - Violation Details (per record: 1+ offences) → `pull.violationDetails[]`.
7. **Part 6 — Monitoring Information**
   - Industry Monitoring Information block → `pull.monitoring.industry`.
   - Stage R-Factor Thresholds (4 rows) → `pull.monitoring.thresholds[]`.
   - Monitoring Summary table (one row per month, newest first) → `pull.monitoring.summary[]`.
   - Monitoring Details table → `pull.monitoring.details[]`.

Each page's annotations in `annotated.pdf` show **every** value to extract, color-coded:

| Color | Sink | What it becomes in JSON |
|---|---|---|
| 🟢 GREEN  | Carrier identity                  | `carrier.*` |
| 🔵 BLUE   | Pull-level metric                 | `pull.{rFactor, contributions, monitoringStage, fleet, totals…}` |
| 🟣 PURPLE | CVSA inspection / defect row      | `pull.cvsaDefectAnalysis[]`, `pull.cvsaSummary[]`, `pull.cvsaDetails[]` |
| 🔴 RED    | Collision row                     | `pull.collisionTotals[]`, `pull.collisionSummary[]`, `pull.collisionDetails[]` |
| 🟠 ORANGE | Conviction row                    | `pull.convictionAnalysis[]`, `pull.convictionSummary[]`, `pull.convictionDetails[]` |
| 🟤 BROWN  | Monitoring monthly row            | `pull.monitoring.summary[]`, `pull.monitoring.details[]` |
| 🟡 YELLOW | Violation row / audit             | `pull.violationAnalysis[]`, `pull.violationSummary[]`, `pull.violationDetails[]`, `source.{datePrinted, profilePeriod*}` |

Pale shade = the LABEL on the PDF, strong shade = the VALUE you actually extract.

## Internal consistency — what the validator enforces

After your API produces JSON for a PDF, the checks in `validate.py` confirm:

1. JSON Schema validity (Draft-07).
2. **convictionAnalysis sum = totalConvictions**.
3. **cvsaDefectAnalysis OOS/REQ/Total sums equal cvsaDefectTotals**.
4. **cvsaSummary.length = cvsaDetails.length = totalCvsaInspections**.
5. **Σ collisionTotals[].count = collisionSummary.length = collisionDetails.length = totalCollisions**.
6. **Σ collisionTotals[].points = Σ collisionDetails[].activePoints**.
7. **violationAnalysis sum = Σ violationDetails[].offences.length = totalViolations**.
8. **monitoring.summary[0].score ≈ pull.rFactor** (±0.001).
9. **contributions sum to ~100%** (±0.5).
10. **monitoring.summary[0].stage** matches a `monitoring.thresholds[]` row.
11. **monitoring.industry.fleetRange = carrier.fleetRange**.
12. **profile-period dates** appear identically on every Part header.
13. **cvsaDefect.vehicleIndex** resolves to a real entry in the inspection's vehicles[].

If any check fails, the JSON is mathematically inconsistent — fix it before delivery.

## Per-PDF specs shipped with v2

| PDF | Pages | Carrier | Profile period | v2 status |
|---|---:|---|---|---|
| `Carry_Freight_19_Dec_2018.pdf`     | 30 | Carry Freight Ltd. (AB243-8992) | 2016 DEC 20 → 2018 DEC 19 | ✅ Full per-pdf folder (canonical sample). Matches existing AB frontend mock data. R-Factor 0.468. |
| `Carrier_Profile_30_Sept_2019.pdf`  | 39 | Carry Freight Ltd. (AB243-8992) | 2017 OCT 01 → 2019 SEP 30 | ✅ Full per-pdf folder. Same carrier, one pull later. R-Factor 2.559 (jumped). 13 convictions, 25 CVSA inspections, 1 collision, 1 violation. |
| `Carrier_Profile_4Jan2021.pdf`      | 87 | (newer format) | TBD | Raw only. **Newer "Page X of Y" layout** — schema extension required. **v3** target. |
| `Carrier_Profile_07_Sep_2022.pdf`   | 33 | Carry Freight Ltd. (AB243-8992) | 2021 SEP 07 → 2022 SEP 06 | Raw only. Newer format. **v3** target. |
| `Carrier_Profile_21_Feb_2024.pdf`   | 46 | (newer format) | TBD | Raw only. **v3** target. |
| `Carrier_Profile_15_Oct_2024.pdf`   | 64 | (newer format) | TBD | Raw only. **v3** target. |
| `Carrier_Profile_6_Mar_2026.pdf`    | 43 | (newer format) | TBD | Raw only. **v3** target. |

### Format families (v2 covers the older one)

| Aspect | Older format (2018, 2019) — covered in v2 | Newer format (2021+) — v3 target |
|---|---|---|
| Page layout | Multi-column, label/value visually aligned | Single-column, "Page X of Y" footer |
| Cover encoding | Page 1 has narrative + carrier identity at the bottom | Page 1 has narrative + identity at the top |
| Part numbering | Parts 2-6 = Conviction / CVSA / Collision / Violation / Monitoring | Parts 2-7 — **Part 3 is new** ("Administrative Penalty Information"); CVSA → Part 4; Collision → Part 5; Violation → Part 6; Monitoring → Part 7 |
| New top-level field | — | `Certificate Number:` (e.g. `002061190`), `Effective Date`, `Expiry Date` (Safety Fitness Certificate explicit dates) |
| New section | — | Part 3 — Administrative Penalty Information (a third event class with its own analysis/summary/details — schema additions: `pull.totalAdminPenalties`, `pull.adminPenaltyAnalysis[]`, `pull.adminPenaltySummary[]`, `pull.adminPenaltyDetails[]`) |
| CVSA defect categories | 19 standard rows in 2018; **20 rows** in 2019 (added "Driver's Seat (Missing)") | Format may add or rename categories further. Schema relaxed in v2 (no `maxItems`). |
| Category 9 label | `Lighting Devices (Part II Section 8 OOSC only)` (2018) → `Lighting Devices (Part II Section 9 only)` (2019) | TBD |

### Why v2 ships two older-format examples and defers the newer format

The 2018 + 2019 pair establishes a strong cross-pull baseline for the same carrier. The newer format is genuinely different — adding Administrative Penalties is a schema change that the frontend doesn't yet render (the AB mock data already has an `adminPenalties` count on the pull row, but no detail surface). v3 will:

1. Extend the schema with `pull.adminPenalty*` fields.
2. Adapt the page-detection logic for the "Page X of Y" footer layout.
3. Add front-end surface for the Administrative Penalty section.
4. Ship per-pdf folders for the 5 newer-format PDFs.

## How a vendor uses this package

```bash
# 1. Read the master README + this BLUEPRINT
# 2. Pick a PDF, open its folder
cd per-pdf/Carry_Freight_19_Dec_2018/

# 3. Open the raw PDF + the highlighted PDF side by side
#    raw-pdfs/Carry_Freight_19_Dec_2018.pdf   ← what your parser sees
#    annotated.pdf                            ← what to extract (color-coded)

# 4. Read extraction-doc.md page by page; build your parser
# 5. Run your API on the raw PDF; save output to extracted.json
# 6. Compare against the shipped extracted.json (field-for-field, with sensible tolerance)
# 7. Run validator from package root:
cd ../..
python validate.py
# Exit 0 = ready to ship.
```

## Relationship to the CVOR (Ontario) vendor package

This package follows the same organisational pattern as `docs/cvor-extraction-vendor-package-v6/`. The schema shape is **different** — Alberta's Carrier Profile is a different document with different fields (no travel-km, R-Factor stages instead of Ontario thresholds, 16-CCMTA-group totals on both convictions and violations, 19 CVSA defect categories, monthly monitoring tables). But the *delivery model* is identical: schema + per-pdf folders + annotated PDFs + extraction-doc + lists/CSV + validator.

A vendor familiar with the CVOR package will be able to onboard the Alberta extractor with no surprises.
