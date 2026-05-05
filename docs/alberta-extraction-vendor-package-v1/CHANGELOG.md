# Changelog — Alberta Carrier Profile vendor package

## v1 — 2026-05-03

Initial release.

**Added**
- `schema.json` — Draft-07 JSON schema covering all six Parts (Carrier Information, Conviction, CVSA Inspection, Collision, Violation, Monitoring) of the older Alberta Transportation Carrier Profile format.
- `BLUEPRINT.md`, `README.md` — vendor onboarding + 6-Part methodology.
- `validate.py` — schema validation + 14 cross-field math checks.
- `scripts/dump_pdf.py`, `scripts/extractor.py`, `scripts/emit_csvs.py`, `scripts/annotate_pdf.py` — helper scripts.
- `raw-pdfs/` — 7 representative Carrier Profiles spanning 2018 → 2026.
- `per-pdf/Carry_Freight_19_Dec_2018/` — **canonical sample**:
  - `extracted.json` — schema-valid, all cross-field checks pass
  - `annotated.pdf` — 7-color overlay (green=carrier, blue=pull, purple=CVSA, red=collision, orange=conviction, brown=monitoring, yellow=violation/audit)
  - `extraction-doc.md` — page-by-page label → JSON path → frontend surface
  - `lists/*.csv` — 16 flattened CSV templates (conviction-analysis/summary/details, cvsa-defect-analysis/summary/details/defect-rows, collision-totals/summary/details, violation-analysis/summary/details/offences, monitoring-summary/details)
  - `README.md` — per-PDF summary card

**Notes**
- v1 covers the older Carrier Profile layout (2018 — 2019). The 2021+ PDFs in `raw-pdfs/` use Alberta's newer "Page X of Y" layout, which differs structurally and is **deferred to v2**.
- Validator check #10 (`monitoring.summary[0].score ≈ pull.rFactor`) was originally proposed but **dropped** before release: Part 1's R-Factor and Part 6's monthly score are computed on different rolling windows and should not be expected to match.

## v2 (planned)

- Process `Carrier_Profile_30_Sept_2019.pdf` (same older format, same carrier as canonical — useful for cross-pull consistency demonstrations).
- Extend the schema and the reference extractor for the 2021+ "Page X of Y" layout.
- Ship per-pdf folders for the remaining 5 PDFs (2021, 2022, 2024×2, 2026).
- Polish `scripts/extractor.py` so it produces complete, schema-valid output without hand-editing.
- Add a `tests/` folder with golden snapshots so future schema changes break loudly.
