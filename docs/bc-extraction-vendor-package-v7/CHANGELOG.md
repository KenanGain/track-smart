# Changelog — BC CVSE Carrier Profile Report vendor package

## v7 — 2026-05-04

§5 CVSE page-16 polish. v6 had three issues on the §5 reference page:
1. **CVSA Inspection Levels** — Level numbers `1`–`7`, `C`, `R` (the leftmost column) were never highlighted because they're 1-character tokens that would cause widespread false positives if added to the global value sets.
2. **Summary table** — values were already highlighted from earlier versions.
3. **CVSA Defect Type breakdown** — `defectBreakdown[]` carried stale frontend-mock labels (`49 - Frame`, `50 - Cargo Securement`, `52 - Vehicle Body, Doors`, etc.) that don't match the PDF's actual defect-type names (`49 - Exhaust System`, `50 - Coupling Devices`, `52 - Load Security`, …). Only 15 rows instead of the printed 16.

**Changed**

- `scripts/rebuild_arrays_from_pdf.py` — two new parsers + `main()` wiring:
  - `parse_cvsa_summary()` — re-extracts the 4 inspection-type rows × 4 columns (count / OOS / Fail / Pass) from the §5 page-16 Summary table.
  - `parse_defect_breakdown()` — re-extracts all 16 defect-type rows from the §5 page-16 CVSA Defect Type table. Handles the three printed cell counts (0 / 4 / 6 numeric values per row), preserving the PDF's literal misspelling `42 - Windhield, Wipers`.
- `per-pdf/Inertia_Carrier_2025-04-17/extracted.json`:
  - `pull.cvsa.defectBreakdown[]`: 15 stale rows → **16 PDF-accurate rows** (all six numeric cells when both OOS+Fail are present, 4 cells for OOS-only rows, and `null` cells for the 7 empty rows).
  - `pull.cvsa.summary[]`: 4 → 4 (no change in row count, but values are now sourced from the PDF parser rather than the legacy mock).
- `scripts/annotate_pdf.py` — new conditional pass on §5 reference page (`"CVSA Inspection Levels" in text`):
  - Searches for each level description (`Full Inspection (Vehicle & Driver)`, `Walk Around Inspection`, `Driver Only Inspection`, `Special Inspection`, `Vehicle Only Inspection`, `Enhanced - Radioactive`, `Other Provincial`, `School Bus - Complete`, `School Bus - Re-Inspection`).
  - For the **first** rect of each (the Levels reference table — search_for() returns matches in document order, and the Summary table appears further down the page with pluralised row labels like "Driver Only Inspection**s**"), expands it leftward by 25 pt to cover the level-letter cell and draws a PALE PURPLE rect.
  - This avoids the 1-character-token false-positive problem and limits the level-letter highlight to exactly 9 cells in the Inspection Levels reference table.

**Result**

- Total highlights: **5881** (up from 5866).
- PURPLE: 3353 (up from 3344, +9 from the new level-letter cells in the Inspection Levels reference table).
- §5 page 16 is now fully highlighted: every Level / Description cell, every Summary row + value cell, every defect-type label and every cell of the 16 defect rows + the Total Defects row.

**Validator**

- 1 / 1 OK. Schema unchanged from v6.

## v6 — 2026-05-04

Contravention completeness release. v5 fixed §3 fleet, §5 CVSA list, §6 accidents, §8 CVIP, and §4.4 pending-carrier from the PDF. v6 closes the last big set of stale arrays: the §4.1 driver guilty / §4.2 carrier guilty / §4.3 pending driver tables.

**Extended `scripts/rebuild_arrays_from_pdf.py`**

Two new helpers — `_parse_violation_block()` and `_parse_driver_context()` — plus a `parse_contraventions()` driver that walks any range of pages and emits violation rows. Handles:
- The 7-line "Violation Date / Time / Ticket # / Plate/Jur / Location / Jurisdiction / Disposition Date" header (with Disposition Date optional for pending rows that haven't been disposed yet).
- The 5-line "Act / Section / Description / Equiv Code / Active Points" sub-header (Active Points optional — only present when the violation impacts the profile score).
- Multi-line `Location` cells (e.g. "WPG - / BROOKSIDE BV / NOTRE DAM" on three lines for the DHALIWAL row).
- Multi-line `Description` cells.
- Driver context block carried forward across multiple violations per driver (§4.1 and §4.3): optional driver name, `DL#/Jur:` line, optional `Class:` and `Status:` cells.
- `null` DL value for the "PARKED" no-driver-on-file row.

**Changed**
- `per-pdf/Inertia_Carrier_2025-04-17/extracted.json`:
  - `pull.driverContraventions[]`: 19 → **28** (re-extracted from §4.1 pages 8-11).
  - `pull.carrierContraventions[]`: 2 → **1** (re-extracted from §4.2 page 12 — only one carrier-guilty row in this PDF).
  - `pull.pendingDriverContraventions[]`: 15 → **9** (re-extracted from §4.3 pages 13-14).
  - `pull.cvsa.list[]`, `pull.accidents[]`, `pull.cvip[]`, `pull.pendingCarrierContraventions[]` — unchanged from v5.

**Result**
- Total highlights: **5866** (up from 5767).
- ORANGE: 1226 (up from 1121, **+105** from the new contravention details).
- Other color counts unchanged from v5.
- §4.1 driver guilty pages 8-11: every driver header (name + DL#/Jur + Class + Status) and every violation block (date / time / ticket / plate / location / juris / dispDate / act / section / desc / equiv / pts) highlighted orange.
- §4.2 carrier guilty page 12: only row (2022-08-17 EA600704101 57382P BC MERRITT BC 2023-10-12 MVA 220.4 FAIL TO WEAR SEAT BELT 0212) fully highlighted.
- §4.3 pending driver pages 13-14: 6 driver headers + 9 violation blocks fully highlighted.
- §4.4 pending carrier page 15: still empty (correct — PDF says "no contraventions").

**Validator**
- 1 / 1 OK. Schema unchanged from v5.

## v5 — 2026-05-04

Data-truthing release. v4 made the annotator pick up every value collector but the JSON itself was still partly stale frontend mock data — sections were truncated (CVSA list 12 rows vs. printed 90), some sections were entirely fabricated (CVIP 14 rows vs. printed "No CVIP"; pendingCarrierContraventions 3 rows vs. printed "no contraventions"). v5 re-extracts the affected arrays directly from the PDF text so the JSON reflects what the report actually prints, and the annotator hits ~10× more matches as a result.

**Added — `scripts/rebuild_arrays_from_pdf.py`**

One-off reference parser that walks the PDF text and rebuilds four sub-trees of `pull` from the printed content:
- `pull.cvsa.list[]` — every per-inspection block on §5 detail pages 17-33 (90 inspections, was 12). Handles single-line and multi-line `Location` formatting, the `Truck` unit kind (in addition to `Power Unit / Semi-Trailer / Trailer 1 / Trailer 2 / Bus`), and the optional Active Points cell.
- `pull.accidents[]` — every per-accident block on §6 detail pages 34-35 (5 accidents, was 11). Multi-line locations, multi-word fault values (`At Fault` / `No Fault` / `Fault Unknown`), and the new `Fatality` accident type from the printed report.
- `pull.cvip[]` — emptied. PDF prints "No CVIP Inspections or Notice & Orders occurred during the report period." The previous 14 rows were frontend-mock fabrications.
- `pull.pendingCarrierContraventions[]` — emptied. PDF prints "There are no contraventions to report for this section." The previous 3 rows were fabrications.

This script is a vendor reference: it shows the column layout of each section and how the PDF text is segmented (header lines, inconsistent location/jur joining, optional Active Points). Future PDFs can be parsed using the same patterns.

**Changed**
- `schema.json`:
  - `accidentRow.type` enum now allows `"Fatality"` in addition to the existing `"Property" / "Injury" / "Fatal"` (the printed report uses `Fatality`).
- `validate.py`:
  - Cross-field check 7 (every CVSA inspection has a Power Unit / Bus / Trailer / Vehicle) now also accepts `Truck`.
- `scripts/annotate_pdf.py`:
  - `PART5_LABELS` adds `"Truck"` so the new unit kind highlights as a PALE PURPLE label in §5 detail blocks.
  - CVSA unit `defect` collector key fixed to match the schema's singular `defect` field (not `defects`).

**Result**
- Total highlights: **5767** (up from 5242 in v4-final).
- PURPLE: 3344 (up from 2845, **+499** from the 78 newly-modelled CVSA inspections — every per-inspection date, time, document #, location, jur, level, result, driver name, DL#, plus per-unit plate/jur/regi/desc/result/defect now highlights).
- RED: 166 (up from 132, +34 from the now-correct 5 accident detail blocks).
- BROWN: 539 (down from 544, the 5-row drop is because the 14 fake CVIP rows were removed; the real 95-row Active Fleet still highlights fully).
- ORANGE: 1121 (down from 1124, the 3 fake pending-carrier rows removed).
- §5 CVSA detail pages 17-33: every printed inspection block now has every label and every value highlighted purple. Was 12/90 ≈ 13% covered, now 90/90 = 100%.
- §6 Accident page 35 (the previously bare last accident KHARA SADHU SINGH 2023-04-29): every cell now red. Was the only obvious un-highlighted accident.
- §8 CVIP page 37 + §4.4 page 15: no fake highlights polluting the "No data" pages.

**Validator**
- 1 / 1 OK against the updated schema + relaxed validator.

## v4 — 2026-05-04

Field-coverage completeness pass. The rule for v4 is simple: **every value in `extracted.json` must produce a highlight in the annotated PDF wherever the printed text matches.** v3 already covered the major sections, but a careful field-by-field walk of the JSON found several leaves that the value collectors were silently skipping. v4 closes those gaps.

**Added to value collectors in `scripts/annotate_pdf.py`**

| JSON path | Color | Was missing because |
|---|---|---|
| `pull.asOfDate` | BLUE | Top-level pull `asOfDate` was duplicated under `complianceReview.asOfDate` (which was added) but the top-level was never collected. |
| `pull.complianceReview.scores[].category` | BLUE | The score-category names (`Contraventions`, `CVSA (Out of Service)`, `Accidents`) are values printed in the §1 Profile Score row — not just labels in the cover narrative. Now added so the §1 row renders STRONG-BLUE for the category cells. |
| `pull.complianceReview.scores[].events` | BLUE | Underlying event count per category (21 / 2 / 5) was never highlighted. |
| `pull.interventions[].description` | BLUE | The intervention paragraph that prints under the Type / Date row was un-highlighted. |
| `pull.driverContraventions[].cls`, `pull.driverContraventions[].status` | ORANGE | Pending-only fields. The §4.3 Pending Driver block prints `Class:` and `Status:` columns whose values (e.g. `000`, `NORMAL`) come from these fields. |
| `pull.carrierContraventions[].status` | ORANGE | §4.4 Pending Carrier `Status:` cell. |
| `pull.accidents[].time` | RED | Time column on the §6 detail block. |
| `pull.accidents[].jur` | RED | Jur column. |
| `pull.accidents[].dlJur` | RED | DL#/Jur jurisdiction half. |
| `pull.accidents[].plateJur` | RED | Plate/Jur jurisdiction half. |
| `pull.accidents[].vehDesc` | RED | Vehicle Desc column. |
| `pull.accidents[].charges` | RED | Charges Laid column (Yes/No). |
| `pull.accidents[].pts` | RED | Active Points integer. |
| `pull.cvsa.list[].units[].kind` | PURPLE | Unit type (`Power Unit`, `Semi-Trailer`, `Trailer 1`) — already a label in `PART5_LABELS` but not added as a STRONG value, so the data-side highlight was missing. |

**Result**
- Total highlights: **5032** (up from 4981 in v3-final).
- Per-color counts: BLUE 262 (was 248), ORANGE 1124 (was 1104), RED 132 (was 103), PURPLE 2845 (was 2845), BROWN 334, YELLOW 278, GREEN 57.
- §1 score row, §4.3/4.4 pending-contravention class/status cells, all §6 accident detail columns, and §5 inspection unit kind labels all now highlighted whenever the JSON value matches the printed text.
- For values in `extracted.json` that don't appear in the PDF (e.g. an `activeFleet` regi # that differs from the printed PDF's regi), the annotator emits a no-op for that value — consistent with the "highlight whatever is in extracted.json" rule. No data was changed in `extracted.json`; this is purely an annotator polish.

**Validator**
- 1 / 1 OK. Schema unchanged from v3.

**Mid-v4 fix — full §3 Active Fleet from PDF**

`pull.activeFleet` was carrying only the first 23 rows that the legacy frontend mock had on file; the real PDF has **95 rows** spread over §3 pages 5-6 (regis from `10988354` through `14818081`). Every row past index 22 was a hole in the highlighter — printed in the PDF but not in the JSON, so nothing for the BR sink to match against. Per the rule "highlight whatever is in `extracted.json`", the fix is to put the missing 72 rows *into* `extracted.json`.

Re-parsed §3 fleet directly from page-5 + page-6 text via the section's column layout (Regi # / Plate # / Year / Make / Owner Name / GVW). Where the PDF leaves a column blank (no Plate / no Owner / no GVW for vehicles that are still on the certificate but not currently registered), the JSON row carries `""` for plate / owner and `""` for `gvw` — matching the existing convention from the original 23 rows.

`pull.activeFleet` is now **95 rows** (was 23). All 95 rows × 6 columns × matching tokens highlight on §3 pages 5 and 6.

**Result after mid-v4 fix**
- Total highlights: **5242** (up from 5032).
- BROWN: 544 (up from 334) — every fleet row's regi, plate, year, make, owner name, and GVW highlights wherever the printed text matches.
- §4 Contraventions Summary, §5 CVSA, §6 Accidents — unchanged from v4-initial; still fully covered.
- CSVs in `lists/active-fleet.csv` regenerated from the 95-row data.

## v3 — 2026-05-04

Data-completeness release. v2 fixed every label and value coverage gap that came from the *annotator* (filters, missing labels, missing per-row fields). v3 fixes the remaining coverage gaps that came from the *data*: the §4 Contraventions Summary cells were carrying old frontend-mock numbers that didn't match the printed PDF, and the §6 Accident Summary table had no corresponding structure in `extracted.json` at all. Both are now sourced directly from the printed PDF, the schema is extended to model them, and the annotator highlights every cell.

**Changed**
- `per-pdf/Inertia_Carrier_2025-04-17/extracted.json`:
  - `pull.contraventionSummary` rewritten to match the printed PDF: 12 CCMTA group rows (Speeding 3/27.27%/4/17.39%, Driver's Liabilities 1/9.09%/1/4.35%, Driving 4/36.36%/11/47.83%, Hours of Service 1/9.09%/3/13.04%, Mechanical Defects 2/18.18%/4/17.39%, plus 7 empty rows for Stop Signs / Trip Inspection / Oversize & Overweight / Security of Loads / Dangerous Goods (1000) / Criminal Code / Miscellaneous), plus a 13th `Totals` row (`isTotal: true`, 11 / 100.00% / 23 / 100.00%). The legacy `Cargo Securement (0700-0799)` / `Vehicle Insurance (0900-0999)` / `Dangerous Goods (0800-0899)` group descriptions are removed — they are not the codes BC actually prints. The earlier numbers were transcribed from a stale mock and didn't sum.
  - `pull.accidentSummary` added — new field, 4 rows (Fatality 0/0/0/0/0, Injury 0/0/0/0/0, Property 2/0/0/2/0, Total Accidents 2/0/0/2/0 with `isTotal: true`). Maps to the §6 Summary tile that was previously un-modelled.
- `schema.json`:
  - `contraventionGroupRow` gains an optional `isTotal: boolean` field, and `code` is documented as allowing the empty string (Totals row only).
  - New `accidentSummaryRow` definition (type / count / atFault / faultUnknown / notAtFault / activePoints / optional `isTotal`).
  - `pull.accidentSummary` added as a required array property of `pull`.
- `scripts/annotate_pdf.py`:
  - `collect_values()` adds the new `accidentSummary` rows to the RED set (every count cell).
  - `contraventionSummary` collection now also adds the `group` label (incl. `Totals`) and `activePointsPct`, and uses `is not None` rather than truthiness so legitimate zero / 100.00% values aren't dropped.

**Result**
- Total highlights: **4982** (up from 4913 in v2-final, 3735 in v2-initial).
- §4 Contraventions Summary table: every header, every group row, every value cell, and the Totals row all highlighted (orange).
- §6 Accident Summary table: every header, the four type rows (Fatality / Injury / Property / Total Accidents), and every count cell highlighted (red). Per-accident Details list still has full coverage from v2.
- All other v2 coverage retained.

**Validator**
- 1 / 1 OK against the updated schema.

**Mid-v3 fix — page 2 NSC Carrier Profile narrative labels**

The page 2 preamble ("NSC Carrier Profile") was rendering with only the page-banner highlights — none of the bullet labels, methodology paragraphs, or NSC Program Office contact block were annotated. These are exactly the labels the frontend uses for the Profile Score panel and the Pull-by-Pull chart legend, so they need to read as PALE YELLOW labels too.

Fixed by extending `COVER_LABELS` in `scripts/annotate_pdf.py` with:
- Page-2 narrative title: `NSC Carrier Profile`.
- Bullet-list category labels (mirror the frontend score categories): `Contraventions:`, `CVSA (Out of Service):`, `Accidents:`, `Total:`.
- Methodology paragraph labels: `Average Fleet Size:`, `Total Active Vehicle Days:`, `Active Monthly Days:`, `Risk Band:`.
- NSC Program Office contact block: `NSC Program Office, CVSE:`, `PO Box 9250`, `Stn Prov Govt`, `Victoria, BC V8W 9J2`, `Mail:`, `Fax:`, `Email:`, `(250) 952-0578`, `NSC@gov.bc.ca`.

Total highlights: **4981** (was 4982 — small dedup shift from the new yellow rects overlapping a couple of existing matches). YELLOW count: 278 (up from 260).

## v2 — 2026-05-04

Annotation fix release. v1's `add_highlight_annot` with very-pale colours rendered nearly invisible — every label that was supposed to read as PALE just disappeared. v2 reworks the rendering so labels and values are both clearly bordered, and tops up the §2 Profile Scores table with the missing 10 month rows.

**Changed**
- `scripts/annotate_pdf.py` — `Highlighter.flush()` rewritten:
  - Old: `page.add_highlight_annot(rect)` → invisible PALE colours, plus annotations didn't render in `get_pixmap` output.
  - New: `page.draw_rect(rect, color=stroke, fill=fill, fill_opacity=…, width=…)` — burns rectangles into the content stream, so they always render. PALE = thin coloured border (0.9 px) + 22 % translucent tinted fill; STRONG = thick coloured border (1.8 px) + 55 % translucent tinted fill. Result: labels are clearly outlined, values are visibly highlighted.
  - Rect inflation by 1.5 px x / 1.0 px y so the border doesn't clip glyph descenders.
- `per-pdf/Inertia_Carrier_2025-04-17/extracted.json` — `pull.monthlyScores` extended from 14 to 24 rows (frontend mock had only the most-recent 14; the actual PDF has the full 24-month rolling window). All 24 months now have visible value highlights on the §2 page.

**Result**
- **3735 highlights** total (was 3674 in v1, but those PALE ones were invisible).
- Every label on §1 (`Carrier Name:`, `Jurisdiction:`, `Certificate Issue Date:`, `Carrier Mailing Address:`, `Premium Carrier:`, `Weigh2GoBC:`, `Preventative Maintenance:`, `Number of Currently Licensed Vehicles:`, `Certificate Status:`, `Safety Rating:`, `Profile Status:`, `Audit Status:`, `Compliance Review:`, `NSC Interventions:`, `Intervention Type`, `Date`, threshold table headers) is now visibly outlined.
- §1 threshold table — every range is now highlighted: `0.00 - 1.76`, `0.00 - 0.93`, `0.00 - 0.23`, `0.00 - 2.13` (Satisfactory row), `1.77 - 2.98`, `0.94 - 1.08`, `0.24 - 0.27`, `2.14 - 3.64` (Conditional row), `2.99 and above`, `1.09 and above`, `0.28 and above`, `3.65 and above` (Unsatisfactory row) — all blue STRONG. Plus the row labels `Satisfactory`, `Conditional`, `Unsatisfactory` are also highlighted.
- §1 NSC Interventions — both `Intervention Type` / `Date` headers AND the data row values (`Audit - Triggered`, `01-Jun-2023`) are now highlighted.
- §2 monthly scores: all 24 rows × 7 numeric columns highlighted as STRONG values; 8 column headers as PALE labels.
- §3 Active Fleet, §4 Contraventions (summary + 4 sub-sections), §5 CVSA, §6 Accidents, §7 Audits, §8 CVIP — all keep their v1 coverage.

**Mid-v2 fix — threshold strings + intervention values**

After the initial v2 push, the threshold-range cells `0.00 - 1.76` etc. and the "and above" rows weren't matching `search_for` because:
1. `extracted.json` used em-dash (`–`) but the PDF uses regular hyphen (`-`).
2. The schema's shorthand `+` form (e.g. `"2.99+"`) doesn't match the printed `"2.99 and above"`.
3. NSC Intervention type + date weren't in the BLUE values set.

Fixed by:
- Updating `pull.thresholds[].{contraventions, cvsa, accidents, total}` in `extracted.json` to use the PDF-exact strings (regular hyphen, `"and above"`).
- Adding `t["status"]` (Satisfactory / Conditional / Unsatisfactory row labels) and intervention `type` + `date` to the BLUE values set in `collect_values()`.

**Mid-v2 fix — §1 Demographic Information short values**

After the threshold fix, the Demographic block still had unhighlighted cells: `BC` (jurisdiction), `Yes` (Extra-Provincial), `No` (Premium Carrier / Weigh2GoBC / Preventative Maintenance), `73` (Number of Currently Licensed Vehicles), and both lines of the mailing address. Three reasons:
1. `Highlighter.add()` filtered any token shorter than 3 characters, dropping `BC` and `No`.
2. The four boolean demographic fields are JSON booleans (`true` / `false`) — they were never converted to the printed tokens `Yes` / `No`.
3. `mailingAddress` is a single comma-joined string `"101-17564 56A AVE, SURREY BC V3S 1G3"`, but the PDF prints the two halves on separate lines, so `search_for` never matched the joined form.

Fixed by:
- Lowering the safety filter in both `Highlighter.add()` and `collect_values().add()` from `len < 3` to `len < 2` so `BC` / `No` flow through. (Single-character tokens are still rejected.)
- For each of `extraProvincial`, `premiumCarrier`, `weigh2GoBC`, `preventativeMaintenance`, emitting the literal string `"Yes"` or `"No"` into the GREEN value set based on the boolean.
- Adding `dem["jurisdiction"]` (`"BC"`) explicitly to the GREEN value set.
- Splitting `mailingAddress` on `,` and adding each half (`"101-17564 56A AVE"`, `"SURREY BC V3S 1G3"`) to the GREEN value set in addition to the joined form.
- `numberOfLicensedVehicles` (`73`) is now added directly to the GREEN set (bypassing the inner `add` so the 2-char numeric flows through cleanly).

**Result after mid-v2 fixes**
- Total highlights: **4107** (up from 3735).
- §1 Demographic Information block now has every label AND every value visibly outlined: `INERTIA CARRIER LTD.`, `BC`, `General Freight`, `11-Jan-2016`, `Yes`, `101-17564 56A AVE`, `SURREY BC V3S 1G3`, `No` × 3, `73`. Plus all certificate info, all threshold ranges, and the NSC Intervention row.

**Mid-v2 fix — §4 / §5 / §6 summary tables + per-event sub-rows**

The §4 Contraventions Summary table, §5 CVSA defect-type breakdown, §5 per-inspection details, and §6 Accident Summary table all had unhighlighted labels and missing per-row values. Reasons:

1. `PART4_LABELS` carried obsolete CCMTA group descriptions (`Cargo Securement (0700-0799)`, `Vehicle Insurance (0900-0999)`, `Dangerous Goods (0800-0899)`) that don't actually appear in current BC reports — the printed groups are `Oversize & Overweight (0700-0799)`, `Security of Loads (0900-0999)`, `Dangerous Goods (1000)`, plus two new groups `Criminal Code (1100-1199)` and `Miscellaneous (1200-1299)`. The `Totals` row label and `Details` header weren't included either.
2. `PART5_LABELS` covered the §5 schema headers but not the 16 per-defect-type row labels (`40 - Driver`, `41 - Lighting Devices`, `42 - Windshield, Wipers`, etc.) — they vary per PDF (data-driven from `defectBreakdown[]`) so they have to be built at runtime, not hard-coded.
3. `PART6_LABELS` covered only the per-accident detail block, not the §6 Summary table headers (`Accident Type`, `Number of Accidents`, `in last 12 months`, `At Fault`, `Fault Unknown`, `Not at Fault`, `Active Points`) or its row labels (`Fatality`, `Injury`, `Property`, `Total Accidents`) or the `Summary` / `Details` section headers.
4. `collect_values()` for ORANGE only added a subset of per-event fields — `act` (`MVA`/`MVR`/`HT`), `section` (`150.1`/`4.173B`/`6; b`/`122/0924(1)`), `time`, `dlJur`, `plateJur`, `juris`, and `pts` were all missing, so those columns rendered un-highlighted in §4.1–4.4.
5. CVSA `list[]` value collection skipped `time`, `level`, `jur`, `dlJur`, per-unit `plateJur`, per-unit `result`, and per-unit `defects`, so half the §5 detail rows were un-highlighted.
6. The `inspectionType` rows (`Driver/Vehicle Inspections`, `Vehicle Only Inspections`, `Driver Only Inspections`, `Total Inspections`) in the §5 summary table weren't in the PURPLE values set.

Fixed by:
- Replacing the wrong CCMTA group strings in `PART4_LABELS` with the printed forms; adding `Totals`, `Summary`, `Details`, `Criminal Code (1100-1199)`, `Miscellaneous (1200-1299)`.
- Adding §6 summary headers and row labels to `PART6_LABELS` (`Summary`, `Details`, `Accident Type`, `Number of Accidents`, `in last 12 months`, `At Fault`, `Fault Unknown`, `Not at Fault`, `Fatality`, `Injury`, `Property`, `Total Accidents`).
- In `collect_values()`:
  - For `defectBreakdown[]`, building the composite `f"{code} - {label}"` token (e.g. `"40 - Driver"`) and adding it to PURPLE so each row label highlights even though it's data-driven.
  - For driver/carrier contraventions (incl. pending), adding `act`, `section`, `time`, `dlJur`, `plateJur`, `juris`, and `str(pts)`.
  - For CVSA list, adding `time`, `level`, `jur`, `dlJur`, per-unit `plateJur`, per-unit `result`, per-unit `defects`.
  - For CVSA summary, adding `inspectionType` (the 4 row labels in the §5 summary table).

**Result after §4/§5/§6 coverage fix**
- Total highlights: **4913** (up from 4107).
- §4 Contraventions Summary: every group row + Totals row + headers highlighted (orange).
- §4.1–4.4 per-event blocks: every label, ticket #, plate, location, juris, disposition date, act, section, description, equiv code, and active-point value highlighted.
- §5 CVSA: 16 defect-type row labels, all 4 inspection-type summary rows, every per-inspection block's headers + values + per-unit details highlighted (purple).
- §6 Accidents: Summary table headers + 4 row labels + Details block + every per-accident field highlighted (red).

**Unchanged from v1**
- `schema.json`, `validate.py` — unchanged. 1/1 OK.
- `extracted.json` — only `monthlyScores` was extended; everything else still matches the frontend mock data.
- `extraction-doc.md`, `README.md`, `lists/*.csv` — unchanged.
- `scripts/emit_csvs.py`, `scripts/write_readme.py` — unchanged.

## v1 — 2026-05-04

Initial release. One canonical sample.

**Added**
- `schema.json` — Draft-07 JSON Schema covering source / carrier (demographics + certificate) / pull (with embedded complianceReview, thresholds, interventions, monthlyScores, activeFleet, contraventionSummary, driverContraventions, carrierContraventions, pendingDriverContraventions, pendingCarrierContraventions, cvsa { summary, defectBreakdown, list }, accidents, auditSummary, cvip).
- `validate.py` — schema validation + 13 cross-field math checks (avg = vd/ad, total = contra+cvsa+acc, totalScore consistency, OOS↔points, severity↔points, etc.).
- `scripts/annotate_pdf.py` — data-driven 7-color overlay (PALE labels + STRONG values via PyMuPDF `search_for`). Same approach as AB and CVOR — BC PDFs are text-extractable so this Just Works.
- `scripts/emit_csvs.py` — flattens `extracted.json` into 14 CSVs (monthly-scores, active-fleet, contravention-summary, driver/carrier/pending contras, cvsa-summary/defects/inspections/units, accidents, audits, cvip).
- `scripts/write_readme.py` — auto-generates the per-pdf summary card.
- `raw-pdfs/CPODetailReport_INERTIA_2025-04-17.pdf` — INERTIA CARRIER LTD. (NSC 202-422-480), 17-Apr-2023 → 17-Apr-2025 profile period, 37 pages.
- `per-pdf/Inertia_Carrier_2025-04-17/` — full per-pdf folder:
  - `extracted.json` — schema-valid, all 13 cross-field checks pass.
  - `annotated.pdf` — 7-color overlay (3674 highlights).
  - `extraction-doc.md` — page-by-page walkthrough mapping each PDF label to its JSON path and frontend surface.
  - `lists/*.csv` — 14 flattened CSV templates.
  - `README.md` — auto-generated summary card.

**Notes**
- BC PDFs have a real text layer (unlike PEI's image-only scans). Vendors can use any PDF text-extraction library (PyMuPDF, pdfplumber, pdftotext) without OCR.
- Values in the shipped `extracted.json` match the existing TrackSmart frontend mock data in `src/pages/inspections/NscBcCarrierProfile.tsx` + `NscBcPerformanceHistory.tsx` exactly (the frontend mocks were transcribed from this same PDF). No frontend code was modified.

## v2 (planned)

- Annotator polish — labels and values are highlighted comprehensively in v1, but a few sections (the §1 compliance-review numbers, the CVSA per-defect breakdown, the §3 active fleet line items) could use tighter coverage. Iterate on label lists.
- More samples if additional BC PDFs become available.
- Reference parser (`scripts/extractor.py`) — text-PDF parser that emits a candidate `extracted.json` directly from the raw PDF, mirroring the AB v7 pattern.
