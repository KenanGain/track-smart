# Changelog — Alberta Carrier Profile vendor package

## v4 — 2026-05-03

Focus release. Highlight scope reduced to **only fields the AB frontend renders**.

**Changed**
- `scripts/annotate_pdf.py` — `PARTn_LABELS` lists pruned. The annotator no longer highlights:
  - PDF table column headers (`DATE`, `DOCUMENT`, `JUR`, `PLATE`, `LEVEL`, `RESULT`, `MONTH-END`, `TYPE`, `TRK%`, `BUS%`, `AVG`, `CUR`, `SCORE`, `CONV%`, `INSP%`, `COLL%`, `MONITORING STAGE`, etc.) — the AB frontend has its own column headers.
  - Detail-block field labels (`ISSUING AGENCY:`, `LOCATION:`, `DRIVER:`, `COMMODITY:`, `CCMTA CODE:`, `CONV DATE:`, `DOCKET NO:`, `ACTIVE POINTS:`, `VEHICLE: TYPE`, `VIN`, `YEAR`, `MAKE`, `CVSA DECAL #`) — the frontend has its own inline field labels.
  - Banner totals labels (`TOTALS:`, `DOCUMENTS:`, `CONVICTIONS:`, `PASSED:`, `REQUIRED ATTENTION:`, `OUT OF SERVICE:`, `OFFENCES:`).
  - Analysis table column headers (`NUMBER OF`, `PERCENT`, `OF TOTAL`, `GROUP DESCRIPTION`, `DEFECT CATEGORY / DESCRIPTION`).
  - Administrative end markers (`*** END OF PART X ***`, `TOTAL PAGES:`).
  - Note-page point legends (`1 point`, `2 points`, `3 points`, `5 points`, `4 points`, `6 points`).
- What **is** still highlighted (because the frontend renders these as on-screen text):
  - Section/Part banners — `PART 2 - CONVICTION INFORMATION`, etc. (the frontend uses the same names for tab/section titles).
  - Carrier identity field names — `NSC Number:`, `MVID Number:`, `Safety Fitness Rating:`, `Operating Status:`, `Fleet Range:`, `Fleet Type:` (rendered by the AB Carrier Profile sticky).
  - The 16 conviction/violation group descriptions (`Speeding`, `Hours of Service`, …) — rendered as table row labels.
  - The 19+ CVSA defect category labels (`1 - Driver Credentials`, …) — rendered as table row labels.
  - Stage 1-4 labels — rendered in the Monitoring Stage R-Factor Thresholds panel.
  - Profile-period framing labels (`Profile Period Start Date:`, `Profile Period End Date:`, `Date Printed:`) — rendered in section banners.
  - Industry block labels (`INDUSTRY MONITORING INFORMATION`, `Industry Average R-Factor Score:`).
  - All VALUES from `extracted.json` (full set carried over from v3 — driver names, document numbers, plates, dates, R-Factor values, percentages, etc.).

**Result**
- 2018 sample: 676 → **437** highlights
- 2019 sample: 1414 → **976** highlights

Every remaining highlight maps directly to text the vendor sees rendered in the AB frontend — no PDF-only noise.

**Inherited from v3**
- Rect-overlap-aware dedup in the annotator: each text region gets exactly one annotation.
- Schema additions for the newer Carrier Profile format: `carrier.{certificateNumber, certificateEffectiveDate, certificateExpiryDate}`, `pull.{totalAdminPenalties, totalAdminPenaltyDocuments, adminPenaltyAnalysis[], adminPenaltySummary[], adminPenaltyDetails[]}` plus the matching `$defs`.

## v3 — 2026-05-03

Internal release (no per-PDF samples shipped). Two annotator improvements + schema additions for the newer Carrier Profile format.

**Changed**
- `scripts/annotate_pdf.py` — rect-overlap-aware dedup. Painting `"DATE"` and `"DATE ENTERED"` on the same column header used to double the opacity on the `"DATE"` prefix. The new `Highlighter` class collects candidate annotations, sorts them longest-source-first, and skips any whose rect overlaps a kept rect. One physical highlight per text region.
- `schema.json` — added `carrier.certificateNumber`, `carrier.certificateEffectiveDate`, `carrier.certificateExpiryDate` (Safety Fitness Certificate fields printed only on the newer 2021+ format) and `pull.totalAdminPenalties` / `pull.totalAdminPenaltyDocuments` / `pull.adminPenaltyAnalysis[]` / `pull.adminPenaltySummary[]` / `pull.adminPenaltyDetails[]` for the new Part 3 — Administrative Penalty Information section. Older-format extractions can omit these fields or emit empty arrays.
- Validator unchanged from v2; runs against both shipped samples successfully.

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
