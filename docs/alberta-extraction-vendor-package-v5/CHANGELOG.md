# Changelog — Alberta Carrier Profile vendor package

## v5 — 2026-05-03

Coverage release. **Reverts the v4 frontend-only scope** — the highlights are a *parser-visual-map*, not a frontend-rendered subset. The vendor needs to see every label they have to recognise to anchor extraction, regardless of whether the AB frontend re-renders that exact text.

**Bug fix (mid-v5)**: `Highlighter._overlaps` was treating two PDF text rects as overlapping whenever their y-ranges shared even 1-3 pixels. PDF font ascender/descender margins push adjacent lines into 1-3 pixels of vertical overlap, which was wrongly flagging line-adjacent labels (e.g. `DRIVER:` on one line and `VEHICLE:` directly below) as overlapping. The dedup then dropped the second label. Replaced the simple bounding-box test with **intersection-over-min-area > 0.5** — only nested rects (one substantially inside the other) now count as overlapping. Effect on counts:

| Sample | Before fix | After fix |
|---|---:|---:|
| `Carry_Freight_19_Dec_2018` | 658 | **856** |
| `Carrier_Profile_30_Sept_2019` | 1391 | **1934** |

Newly visible labels in conviction-detail blocks (per detail entry × occurrences): `VEHICLE:` (×2), `CCMTA CODE:`, `LOCATION:`, `DRIVER:`, `COMMODITY:`, `ISSUING AGENCY:`, `CONV DATE:`, `DOCKET NO:`, `TIME`, `JURISDICTION`, `DATE ENTERED`. Same fix applies to violation-detail and CVSA-detail blocks.

Also added `VEHICLE:` to PART2_LABELS and PART5_LABELS (was missing — only `VEHICLE` without colon was listed for column headers).

**Mid-v5 follow-up — Part 3 (CVSA) coverage gaps**

PART3_LABELS was missing the CVSA Inspection Summary + Detail column headers:
- Summary table: `DATE`, `DOCUMENT`, `JUR` (`CVSA`, `AGENCY`, `PLATE`, `LEVEL`, `RESULT` were already there)
- Detail table top row: `TIME`, `DATE ENTERED`
- Detail vehicle sub-table: `TYPE`, `VIN`, `YEAR`, `MAKE`, `CVSA DECAL #` (some were already there but `TYPE` was only covered by the longer `VEHICLE: TYPE` label)
- Defect-analysis column header words `TOTAL`, `PERCENT`, `OF TOTAL` (only `NUMBER OF DEFECTS`, `OUT OF`, `REQUIRES`, `SERVICE`, `ATTENTION`, `DEFECTS` were listed)

Also extended `CVSA_DEFECT_LABELS` to handle real-world wording variants:
- Category 9: PDF prints either `(Part II Section 8 OOSC only)` (2018 era) or `(Part II Section 9 only)` (2019+). Both listed.
- Category 17: column-width clipping in some PDFs truncates `(Buses)` to `(Buse`. Both listed.
- Category 20: `Driver's Seat (Missing)` (added in 2019+). Listed.

Final highlight counts for v5:
- 2018 sample: **920**
- 2019 sample: **2096**

**Changed**
- `scripts/annotate_pdf.py` — comprehensive label coverage restored. Every label that names a value in the PDF is highlighted PALE in its sink colour:
  - **Cover (yellow)**: `CARRIER PROFILE`, `NOTE`, `NSC Number:`, `Carrier Name:`, `Profile Period Start:`, `End:`, `Date Printed:`, `Requested By:`, `TABLE OF CONTENTS`, every Part heading.
  - **Part 1 (green/blue)**: section title + `SAFETY FITNESS CERTIFICATE`, `NSC Number:`, `MVID Number:`, `Safety Fitness Rating:`, `Operating Status:`, `Effective Date:`, `Expiry Date:`, `Fleet Range:`, `Fleet Type:`, `Certificate Number:`; `R-Factor Score:`, `Contribution to R-Factor`, `Convictions:`, `CVSA Inspections:`, `Reportable Collisions:`, `Carrier's Monitoring Stage`, `Total number of carriers at the same stage or greater:`, `NSC carriers in Alberta with Safety Fitness Certificates:`, `NSC MONITORING PROGRAM ON:`, `NSC FLEET SIZE ON:`, `Average:`, `Current:`, `using MVIDS:`.
  - **Part 2 (orange)**: section banner (`Profile Period Start Date:`, `Profile Period End Date:`, `Date Printed:`, `Pages`, `TOTALS:`, `DOCUMENTS:`, `CONVICTIONS:`, `ACTIVE POINTS:`); analysis table headers (`NUMBER OF`, `PERCENT`, `OF TOTAL`, `GROUP DESCRIPTION`, `TOTAL CONVICTIONS`); summary column headers (`DATE`, `DOCUMENT`, `JUR`, `VEHICLE`, `DRIVER NAME`); detail field labels (`TIME`, `JURISDICTION`, `DATE ENTERED`, `ISSUING AGENCY:`, `LOCATION:`, `DRIVER:`, `COMMODITY:`, `CCMTA CODE:`, `CONV DATE:`, `DOCKET NO:`); end markers.
  - **Part 3 (purple)**: section banner; defect-analysis headers + 19 categories; `GRAND TOTAL DEFECTS`; CVSA summary headers (`CVSA`, `AGENCY`, `PLATE`, `LEVEL`, `RESULT`); detail labels (`AGENCY:`, `LOCATION:`, `DRIVER:`, `VEHICLE: TYPE`, `VIN`, `YEAR`, `MAKE`, `CVSA DECAL #`, `BY VEHICLE`, OOS/REQ defect headers).
  - **Part 4 (red)**: totals labels (`NUMBER OF`, `COLLISIONS`, `NON-`, `PREVENTABLE`, `PREVENTABLE OR`, `NOT EVALUATED`, `ACTIVE`, `POINTS`, `Property Damage:`, `Injury:`, `Fatal:`); summary/detail column headers (`DATE`, `DOCUMENT`, `JUR`, `PLATE`, `STATUS`, `SEVERITY`); detail block field labels (`ASSESSMENT:`, `DRIVER:`, `LOCATION:`, `VEHICLE:`); empty-state strings.
  - **Part 5 (yellow)**: section banner + `OFFENCES:` + analysis headers + 16 groups + `TOTAL VIOLATIONS`; summary columns; detail field labels including `ACT/SECTION:` and `TEXT:`; empty-state strings.
  - **Part 6 (brown)**: monitoring summary column headers (`MONTH-END`, `DATE`, `TYPE`, `TRK%`, `BUS%`, `AVG`, `CUR`, `FLEET INFORMATION`, `R-FACTOR`, `SCORE`, `CONV%`, `INSP%`, `COLL%`, `MONITORING STAGE`); industry block; `Stage 1:`–`Stage 4:`; monitoring details column headers (`FLEET`, `SIZE`, `PTS/VEH`, `TOTAL`, `INSP`, `OOS DEFECTS`, `/INSP`, `TOTAL DEFECTS`, `OOS%`, `OOS/VEH`, `FAILURE`, `RATE`, `COLLISIONS`); industry-average row labels.

**Added**
- `per-pdf/Carrier_Profile_30_Sept_2019/extracted.json` — `carrier.certificateEffectiveDate: "2018-03-23"` and `carrier.certificateExpiryDate: "Continuous"`. The 2019 PDF prints these on the SAFETY FITNESS CERTIFICATE block on Part 1; the 2018 PDF (still older format) does not.

**Result**
- 2018 sample: **662** highlights — full label + value coverage with no muddy stacking.
- 2019 sample: **1393** highlights — same.

**What we learned (mistake corrected from v4)**
v4 dropped non-frontend labels on the assumption that "vendors only need labels their UI shows". That was wrong: vendors are building **PDF parsers** — they need every label that anchors a value in the PDF, even if that label doesn't appear verbatim in the rendered UI. The annotated PDF is a *parser-side* visual map, not a frontend-side mirror. v5 reverses this.

**Inherited from v3 (still active)**
- Rect-overlap-aware dedup in the annotator (`Highlighter` class). Each text region gets exactly one annotation regardless of how many label/value lookups would have matched it. Longer (more specific) source strings win over shorter ones; STRONG values win over PALE labels at equal length.
- Schema additions for the newer Carrier Profile format: `carrier.{certificateNumber, certificateEffectiveDate, certificateExpiryDate}`, `pull.{totalAdminPenalties, totalAdminPenaltyDocuments, adminPenaltyAnalysis[], adminPenaltySummary[], adminPenaltyDetails[]}`.

## v4 — 2026-05-03

**Status: superseded by v5.** Narrowed highlight scope to "only labels the AB frontend renders" — that was the wrong interpretation. See v5.

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
