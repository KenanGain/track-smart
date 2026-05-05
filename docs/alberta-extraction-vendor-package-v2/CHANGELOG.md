# Changelog — Alberta Carrier Profile vendor package

## v2 — 2026-05-03

Refinement release. Adds the Sept 2019 sample and a data-driven annotator.

**Added**
- `per-pdf/Carrier_Profile_30_Sept_2019/` — full per-pdf folder for the same carrier (Carry Freight Ltd., AB243-8992) one pull later. Schema-valid; all cross-field checks pass. 13 convictions, 25 CVSA inspections, 1 reportable collision, 1 violation.

**Changed**
- `scripts/annotate_pdf.py` rewritten to be **data-driven**. It now reads `extracted.json` from the per-pdf folder and highlights every value it contains as `STRONG` colour, plus all the universal Alberta Carrier Profile labels as `PALE` colour. Adding a new sample requires no code changes — just drop in `extracted.json` and run `python scripts/annotate_pdf.py raw-pdfs/<name>.pdf per-pdf/<name>/`.
- `scripts/annotate_pdf.py` — value tokens are now filtered through `_is_value_safe()` to drop ambiguous matches that were causing mass over-highlighting in v2.0:
   - 2-letter Canadian province codes (`AB`, `ON`, `BC`, `MB`, `QC`, …) appear hundreds of times per page in plate-jurisdiction columns; highlighting every occurrence painted entire columns purple.
   - Pure integers under 1000 (`1`, `2`, `10`, `100`) match row numbers, page numbers, and dates.
   - Tokens shorter than 3 characters are skipped outright.
- `scripts/annotate_pdf.py` — two-pass rendering. PALE labels paint first across all six Parts; STRONG values paint on top. With PyMuPDF's later-on-top z-order this guarantees the value highlight is visually dominant wherever they overlap.
- `schema.json` — `cvsaDefectAnalysis.maxItems` removed. The 2019 PDF has 20 defect categories (added "20 - Driver's Seat (Missing)") and future runs may add more. `minItems: 19` retained as a sanity floor.
- `README.md`, `BLUEPRINT.md` — updated for v2 scope, two samples, and a clear v3 roadmap.
- The 2018 sample's `annotated.pdf` was regenerated with the data-driven annotator. Final highlight counts: **1173** for 2018 (after filter), **2737** for 2019.

**Notes**
- Cross-pull continuity: same carrier, two consecutive Carrier Profiles. Same NSC #, same MVID, address moved (Chestermere → Calgary), fleet grew (range 5-9 → 10), R-Factor jumped (0.468 → 2.559), event count exploded (1+9+0+0 → 13+25+1+1).
- Format drift: the 2019 PDF uses a slightly different label for CVSA category 9 ("Part II Section 9 only" vs the 2018 PDF's "Part II Section 8 OOSC only") and adds category 20 ("Driver's Seat (Missing)"). The schema accepts both.

## v3 (planned)

The 5 newer-format Alberta Carrier Profiles in `raw-pdfs/` (2021, 2022, 2024 ×2, 2026) use a substantially different layout:

- Single-column "Page X of Y" footer instead of the older banner format
- New **Part 3 — Administrative Penalty Information** with its own analysis / summary / details tables
- Parts renumbered: CVSA → Part 4, Collision → Part 5, Violation → Part 6, Monitoring → Part 7, plus new Parts 8 (Facility Audit), 9 (Facility Licence), 10 (Safety Fitness Certificate Information), 12 (Historical Information)
- New explicit Safety Fitness Certificate fields: `Certificate Number`, `Effective Date`, `Expiry Date`

v3 will:
1. Add `pull.totalAdminPenalties`, `pull.adminPenaltyAnalysis[]`, `pull.adminPenaltySummary[]`, `pull.adminPenaltyDetails[]` to the schema.
2. Add `carrier.certificateNumber`, `carrier.certificateEffectiveDate`, `carrier.certificateExpiryDate`.
3. Adapt the page-detection logic for the "Page X of Y" footer.
4. Ship per-pdf folders for all 5 newer-format PDFs.
5. Surface admin penalties in the AB frontend (`NscAbPullByPull.tsx` already has the column; no detail view yet).

## v1 — 2026-05-03

Initial release.

**Added**
- `schema.json` — Draft-07 JSON schema covering all six Parts (Carrier Information, Conviction, CVSA Inspection, Collision, Violation, Monitoring) of the older Alberta Transportation Carrier Profile format.
- `BLUEPRINT.md`, `README.md` — vendor onboarding + 6-Part methodology.
- `validate.py` — schema validation + 14 cross-field math checks.
- `scripts/dump_pdf.py`, `scripts/extractor.py`, `scripts/emit_csvs.py`, `scripts/annotate_pdf.py` — helper scripts.
- `raw-pdfs/` — 7 representative Carrier Profiles spanning 2018 → 2026.
- `per-pdf/Carry_Freight_19_Dec_2018/` — canonical sample (extracted.json + annotated.pdf + extraction-doc.md + lists/*.csv + README.md).

**Notes**
- Validator check #10 (`monitoring.summary[0].score ≈ pull.rFactor`) was originally proposed but dropped before release: Part 1's R-Factor and Part 6's monthly score are computed on different rolling windows and should not match.
