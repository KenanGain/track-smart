# Nova Scotia NSC Carrier Profile Abstract — Vendor Package (v1)

**Audience:** Backend / API vendor building a service that ingests Nova Scotia **Department of Public Works — Carrier Profile Abstracts** and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** v1 — initial release. One canonical sample (9496971 CANADA INC, 50 CVSA inspections + 2 warning tickets, NSC `ZZZZZ728361002`). Schema, validator, annotator, and a reference text-PDF parser are all included. Frontend code is not modified.

---

## Start here

1. **`BLUEPRINT.md`** — what's in this package and the 3-section anatomy of an NS Carrier Profile Abstract.
2. **`schema.json`** — Draft-07 JSON Schema. Your API output must validate against this.
3. **`per-pdf/9496971_Canada_2024-11-26/`** — open `README.md` + `extraction-doc.md`, look at `annotated.pdf` next to the raw PDF in `raw-pdfs/`.
4. **`validate.py`** — runs from package root. Walks every `per-pdf/<name>/extracted.json`, runs schema + 9 cross-field math/consistency checks.

---

## Package contents

```
.
├── README.md                 ← you are here
├── BLUEPRINT.md              ← 3-page anatomy + frontend mapping
├── schema.json               ← JSON Schema (Draft-07)
├── validate.py               ← schema + 9 cross-field checks
├── CHANGELOG.md
├── raw-pdfs/
│   └── 9496971_CANADA_INC_NS_Carrier_Profile.pdf
├── per-pdf/
│   └── 9496971_Canada_2024-11-26/
│       ├── extracted.json
│       ├── extraction-doc.md
│       ├── annotated.pdf       ← 6-color overlay (PALE labels + STRONG values)
│       ├── lists/*.csv         ← 5 flattened CSV templates
│       └── README.md
└── scripts/
    ├── extractor.py           ← reference parser: PDF → extracted.json
    ├── annotate_pdf.py        ← 6-color overlay
    ├── emit_csvs.py           ← extracted.json → 5 CSVs
    └── write_readme.py        ← per-pdf summary card
```

## The 6 highlight colors

| Color | Sink | JSON destination |
|---|---|---|
| 🟢 GREEN  | Carrier identity                       | `carrier.demographics.*`, `carrier.certificate.*` |
| 🔵 BLUE   | Pull-level metric                      | `pull.thresholds`, `pull.scores`, `pull.auditHistory[]` |
| 🟣 PURPLE | CVSA inspection                        | `pull.cvsaInspections[]`, `pull.cvsaTotals` |
| 🟠 ORANGE | Conviction                             | `pull.convictions[]` |
| 🔴 RED    | Collision                              | `pull.collisions[]` |
| 🟡 YELLOW | Warning ticket / source / page banner  | `pull.warningTickets[]`, `pull.warningTotals`, `source.*` |

NS uses fewer colour sinks than BC (no Active Fleet, no CVIP) — six sinks instead of seven.

## Validator checks

| # | Check |
|---|---|
| 1 | JSON validates against `schema.json` (Draft-07) |
| 2 | `pull.scores.totalDemerit ≈ convictions + inspections + collisions` (±0.0001) |
| 3 | `pull.cvsaTotals.records == len(pull.cvsaInspections)` |
| 4 | `pull.cvsaTotals.demeritPts == Σ pull.cvsaInspections[].demeritPts` |
| 5 | CVSA `result === 'Out-of-Service'` ↔ `demeritPts === 3` |
| 6 | CVSA `result !== 'Out-of-Service'` → `demeritPts === 0` |
| 7 | `pull.warningTotals.records == len(pull.warningTickets)` |
| 8 | Threshold ordering: `level1 < level2 < level3` |
| 9 | `source.profileAsOf == pull.asOfDate` |
| 10 | `cvsaInspections[].seq` is contiguous 1..N |

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts an NS Carrier Profile Abstract PDF and returns JSON validating against `schema.json`.
2. For the shipped sample, your API output matches the shipped `extracted.json` field-for-field within sensible tolerance.
3. All 10 validator checks pass for every per-PDF folder.
4. CSV templates in `lists/` are reproducible from your JSON output.
5. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
6. Single PDF latency ≤ 15 s for the synchronous endpoint (NS PDFs are short — usually 2-4 pages).
