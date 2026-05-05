# Alberta Carrier Profile PDF Extraction — Vendor Package (v4)

**Audience:** Backend / API vendor building a service that ingests Alberta Transportation **Carrier Profile** PDFs and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** v4 — focus release. Same two canonical examples as v2/v3 (`Carry_Freight_19_Dec_2018` and `Carrier_Profile_30_Sept_2019`), but the annotator now highlights **only fields the TrackSmart AB frontend actually renders** — no PDF column headers, no detail-block field names, no point-legend or end-marker noise. Each text region gets exactly one annotation (no overlap stacking). Schema retains the v3 additions for the newer 2021+ Carrier Profile layout (Certificate fields + new Part 3 Administrative Penalty Information).

---

## Start here

Read in this order:

1. **`BLUEPRINT.md`** — what's in this package, the 6 Parts of an Alberta Carrier Profile, and how this package is organised.
2. **`schema.json`** — the authoritative JSON Schema (Draft-07). Your API output must validate against this.
3. **One folder under `per-pdf/`** — pick a PDF, open its folder, read its `README.md` + `extraction-doc.md` while looking at `annotated.pdf` next to the raw PDF in `raw-pdfs/`. The folder also contains `extracted.json` and `lists/*.csv` (flattened CSV templates).
4. **`validate.py`** — runs from the package root. Walks every `per-pdf/<name>/extracted.json` and confirms schema validity + cross-field math checks.

---

## Package contents

```
.
├── README.md                ← you are here
├── BLUEPRINT.md             ← per-PDF + 6-part methodology
├── schema.json              ← JSON Schema (Draft-07)
├── validate.py              ← walks every per-pdf/<name>/extracted.json
├── CHANGELOG.md
├── raw-pdfs/                ← raw Carrier Profile PDFs in one folder
│   ├── Carry_Freight_19_Dec_2018.pdf
│   ├── Carrier_Profile_30_Sept_2019.pdf
│   ├── Carrier_Profile_4Jan2021.pdf
│   ├── Carrier_Profile_07_Sep_2022.pdf
│   ├── Carrier_Profile_21_Feb_2024.pdf
│   ├── Carrier_Profile_15_Oct_2024.pdf
│   └── Carrier_Profile_6_Mar_2026.pdf
└── per-pdf/                 ← one folder per processed PDF (v2 ships two: 2018 + 2019)
    ├── Carry_Freight_19_Dec_2018/
    └── Carrier_Profile_30_Sept_2019/
```

**v2 scope**: Same Alberta carrier (Carry Freight Ltd., NSC AB243-8992) at two consecutive pulls. Demonstrates cross-pull continuity (carrier moved address, fleet grew, R-Factor jumped 0.468 → 2.559) and structural variation (the 2019 PDF adds a 20th defect category, "Driver's Seat (Missing)", and uses different label wording for category 9). The 5 newer-format Carrier Profiles in `raw-pdfs/` (2021, 2022, 2024 ×2, 2026) use Alberta's revised "Page X of Y" layout, which adds a new **Part 3 — Administrative Penalty Information** and renumbers everything else. They are scoped for **v3**.

### Helper scripts

```
scripts/
├── dump_pdf.py        ← print every page as plain text (for parser exploration)
├── extractor.py       ← reference Python extractor (best-effort; produces schema.json output)
├── emit_csvs.py       ← flatten an extracted.json into the 16 CSV templates
└── annotate_pdf.py    ← apply the 7-color overlay
```

Inside every `per-pdf/<name>/` folder:

| File | What it is |
|---|---|
| `README.md`         | Per-PDF summary card (NSC #, carrier, profile period, R-Factor, fleet, totals, file index). |
| `extracted.json`    | Full v1-shape extraction for this PDF. Schema-valid, all cross-field checks pass. |
| `annotated.pdf`     | The raw PDF with the 7-color overlay. Pale = label, strong = value. |
| `extraction-doc.md` | **Page 1 → page N walk-through** for THIS PDF. Each row: label on the page → JSON path → frontend surface. |
| `lists/`            | One CSV per list-shaped field: conviction-analysis, conviction-summary, conviction-details, cvsa-defect-analysis, cvsa-summary, cvsa-details, cvsa-defect-rows, collision-totals, collision-summary, collision-details, violation-analysis, violation-summary, violation-details, violation-offences, monitoring-summary, monitoring-details. |

---

## The 7 highlight colors

| Color | Sink | JSON destination |
|---|---|---|
| 🟢 GREEN  | Carrier identity                  | `carrier.*` |
| 🔵 BLUE   | Pull-level metric                 | `pull.{rFactor, contributions, monitoringStage, fleet, totals…}` |
| 🟣 PURPLE | CVSA inspection / defect row      | `pull.cvsaDefectAnalysis[]`, `pull.cvsaSummary[]`, `pull.cvsaDetails[]` |
| 🔴 RED    | Collision row                     | `pull.collisionTotals[]`, `pull.collisionSummary[]`, `pull.collisionDetails[]` |
| 🟠 ORANGE | Conviction row                    | `pull.convictionAnalysis[]`, `pull.convictionSummary[]`, `pull.convictionDetails[]` |
| 🟤 BROWN  | Monitoring monthly row            | `pull.monitoring.summary[]`, `pull.monitoring.details[]` |
| 🟡 YELLOW | Violation row / audit             | `pull.violationAnalysis[]`, `pull.violationSummary[]`, `pull.violationDetails[]`, `source.{datePrinted, profilePeriod*}` |

In each color, **pale shade = LABEL** (the text on the PDF that names the field) and **strong shade = VALUE** (the data you actually capture).

---

## How a vendor uses this package

```bash
# 1. Pick a PDF folder
cd per-pdf/Carry_Freight_19_Dec_2018/

# 2. Open the raw PDF + the annotated PDF side by side
#    raw-pdfs/Carry_Freight_19_Dec_2018.pdf      ← what your parser sees
#    per-pdf/Carry_Freight_19_Dec_2018/annotated.pdf  ← what to extract (color-coded)

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
| 4 | `Σ convictionAnalysis[].count === totalConvictions` |
| 5 | `Σ cvsaDefectAnalysis[].oos === cvsaDefectTotals.oos` (and same for `req`, `total`) |
| 6 | `cvsaSummary.length === cvsaDetails.length === totalCvsaInspections` |
| 7 | `Σ collisionTotals[].count === collisionSummary.length === collisionDetails.length === totalCollisions` |
| 8 | `Σ collisionTotals[].points === Σ collisionDetails[].activePoints` |
| 9 | `Σ violationAnalysis[].count === Σ violationDetails[].offences.length === totalViolations` |
| 10 | (reserved — see note below) |
| 11 | `pull.contributions.{conviction + inspection + collision} ≈ 100` (±0.5) |
| 12 | `monitoring.summary[0].stage` (when present) corresponds to a row in `monitoring.thresholds` |
| 13 | `monitoring.industry.fleetRange === carrier.fleetRange` |
| 14 | Profile-period dates appear identically on every Part header |
| 15 | Each `cvsaDefect.vehicleIndex` resolves to a real entry in `cvsaDetails[i].vehicles` |

When any of these fail for any per-PDF JSON, the validator prints which file and which check failed.

> **Note on R-Factor**: `pull.rFactor` (Part 1) and `pull.monitoring.summary[0].score` (Part 6) are two different metrics. Part 1's R-Factor is the carrier's 12-month rolling score used for comparison against industry thresholds; Part 6's monthly score is a per-month snapshot. They do **not** need to match.

---

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts an Alberta Carrier Profile PDF and returns JSON validating against `schema.json`.
2. For each shipped sample (7 PDFs in this package), your API output matches the shipped `extracted.json` field-for-field within sensible tolerance.
3. All validator checks pass for every per-PDF folder.
4. CSV templates in `lists/` are reproducible from your JSON output.
5. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
6. Single PDF latency ≤ 30 s for the synchronous endpoint; bulk allowed to be async.

---

## Open questions to confirm with vendor

1. Will OCR be used, or do you have a structured PDF extractor for Alberta Transportation forms?
2. Pricing model: per-PDF, per-page, per-month?
3. Async vs sync default for single uploads?
4. Webhook support for bulk-job completion?
5. SLA on accuracy (which fields >99%)?
6. Data retention policy on the uploaded PDFs and the extracted JSON?
