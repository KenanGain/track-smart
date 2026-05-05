# Changelog — PEI Carrier Abstract Report vendor package

## v3 — 2026-05-04

Annotator now distinguishes **PALE labels from STRONG values** inside each text band — the visual idiom we've been using for AB and CVOR. Plus minor doc polish.

**Changed**
- `scripts/annotate_pdf.py` — within each detected text band, classify each column-group as label (leftmost group → **PALE**) or value (other groups → **STRONG**):
  - PALE: lighter translucent fill (alpha 70/255) + 1px solid border.
  - STRONG: stronger translucent fill (alpha 90/255) + 2px solid border.
  - For 1-column bands (titles, section headings) the single group is treated as a label.
  - For 2-column bands (the typical "Label: Value" rows) the left group is the label, the right is the value.
  - For 3+ column bands (table rows like Inspections / Audits) the first column (date) is the label and every subsequent column is a value.
- `scripts/write_readme.py` — per-pdf README now links `extraction-doc.md` and updates the `annotated.pdf` line to describe the PALE/STRONG distinction.

**Unchanged from v2**
- `scripts/extract_ocr.py` — OCR reference pipeline using Tesseract / pytesseract (unchanged).
- `per-pdf/<name>/extraction-doc.md` — page-by-page walkthroughs (unchanged).
- `schema.json`, `validate.py` — unchanged. 2/2 OK.
- Auto-detection of text bands by row-darkness + 90 px column-merge gap (carried forward from v1 / v2.1).
- `extracted.json` for both samples — hand-transcribed and unchanged.

## v2 — 2026-05-04

Adds the OCR reference pipeline and per-pdf walkthroughs.

**Added**
- `scripts/extract_ocr.py` — reference OCR pipeline using Tesseract via `pytesseract`. Renders each page at 3x, runs `image_to_data` for word-level bounding boxes, groups words into lines, finds value tokens by labelled-anchor matching ("text on the same line, to the right of the label"), and parses the Inspections table into rows. Emits a candidate `extracted.json` that validates against `schema.json`.
  - Install requirements: `pip install pytesseract Pillow numpy pymupdf` plus the Tesseract binary on PATH (`choco install tesseract` on Windows / `brew install tesseract` on macOS / `apt-get install tesseract-ocr` on Linux).
  - Output sets `source.ocrEngine` to `"tesseract-<version>"` so downstream consumers can distinguish hand-transcribed vs OCR-extracted samples.
- `per-pdf/Carrier_Profile_18_Nov_2020/extraction-doc.md` — page-by-page walkthrough mirroring the CVOR/AB style. Each row maps a printed PDF label to its JSON path and the frontend surface that consumes it. Includes Schedule 3 zone-math illustration and the cross-field validator checklist for this sample (insp pts: 3 + 0 + 0 + 0 + 3 + 0 + 0 = 6 ✓).
- `per-pdf/Carrier_Profile_09_Mar_2023/extraction-doc.md` — same structure, value table specific to FOS GROUP LTD. (PEI03783, 8 vehicles, 0 total points, 2 inspections).

**Changed**
- `scripts/annotate_pdf.py` — bumped `merge_gap` from 22 px to **90 px** in `detect_text_columns`. The 22 px gap was too narrow: long phrases like "BUSINESS PORTERS INC." or the title "National Safety Code Carrier Abstract Report" got chopped into separate rectangles per word because their inter-word whitespace (20-40 px in the 2x render) exceeded the gap. The 90 px gap keeps logical phrases as a single rectangle while still treating left-column vs right-column items (which sit 400+ px apart on the form) as separate rectangles. Net effect: ~30% fewer rectangles, but each one cleanly bounds a complete label or value instead of fragments.

**Unchanged from v1**
- `schema.json` — Draft-07 JSON Schema covering source / carrier / pull (with embedded inspections / collisions / convictions / audits / interventions / carrierInfo).
- `validate.py` — schema + 7 cross-field math checks (point sums, status↔points consistency, severity↔points, fleet→Schedule-3 mapping). 2/2 OK.
- `scripts/annotate_pdf.py` — auto-detection of text bands by percentile-adaptive row-darkness threshold (handles both shipped scans regardless of grain noise) and per-band y-range → colour-sink mapping is unchanged.
- `scripts/emit_csvs.py`, `scripts/write_readme.py` — unchanged.
- `extracted.json` for both samples — hand-transcribed and unchanged.

## v1 — 2026-05-04

Initial release.

**Added**
- `schema.json` — Draft-07 JSON Schema covering `source`, `carrier`, `pull` (with embedded `inspections[]`, `collisions[]`, `convictions[]`, `audits[]`, `interventions[]`, `carrierInfo`). Field names match the existing TrackSmart frontend (`PeiNscData`, `PeiPullRow`).
- `validate.py` — schema validation + 7 cross-field checks (point-sum consistency per category, status↔points consistency for inspections, severity↔points for at-fault collisions, fleet-to-Schedule-3 mapping).
- `scripts/emit_csvs.py` — flattens `extracted.json` into 5 CSVs (`inspections`, `collisions`, `convictions`, `audits`, `pull-summary`).
- `scripts/annotate_pdf.py` — draws colored region rectangles on each page at hand-mapped form coordinates. Used because PEI PDFs have **no text layer** to `search_for`.
- `scripts/write_readme.py` — generates per-pdf summary cards.
- `raw-pdfs/` — 2 PEI Carrier Abstract Reports (2020-11-18, 2023-03-09).
- `per-pdf/Carrier_Profile_18_Nov_2020/` — full per-pdf folder. BUSINESS PORTERS INC. (PEI03660), 7 active vehicles, 0/0/6 points (collision/conviction/inspection), 7 inspections.
- `per-pdf/Carrier_Profile_09_Mar_2023/` — full per-pdf folder. FOS GROUP LTD. (PEI03783), 8 active vehicles, 0/0/0 points, 2 inspections.
- `README.md`, `BLUEPRINT.md` — vendor onboarding + form anatomy + Schedule 3 reference table + demerit point values.

**Notes — extraction strategy**
- PEI Carrier Abstract Reports are **scanned image-only PDFs** (`page.get_text()` returns `""`; one image per page). Unlike the AB and CVOR packages, the data-driven `search_for` annotator approach cannot be used.
- Both v1 samples were **hand-transcribed** from rendered PNGs of each PDF page. `source.ocrEngine` is `null` to indicate manual transcription. A vendor's extracted JSON should set `ocrEngine` to its actual backend identifier.
- The annotated PDFs use hand-mapped region coordinates against the 612x792 page space — both samples share the same form layout, so a single coordinate set covers them.

**Demerit-point translation observed in 2020 sample**
- 7 inspections total, all CVSA Level 3, all sub-checks "Passed".
- Inspection Points = **6**. Status column shows two `M` markers (rows 1 + 5). Inferred: each `M` = 3 pts (OOS-related minor classification). Every other inspection `P` (Pass) contributes 0. Confirmed by validator (Σ = 6).

## v2 (planned)

- **OCR reference pipeline** using Tesseract 5 (`pytesseract.image_to_data` → bounding boxes → field extraction). Ship a `scripts/extract_ocr.py` that produces a `extracted.json` candidate from a fresh PDF.
- **Frontend-update step** — wire the 2 shipped pulls into the `PEI_PULL_DATA` array in `src/pages/inspections/NscPeiPerformanceHistory.tsx`, mirroring how we updated AB's mock data from v7 of that package.
- **Per-pdf `extraction-doc.md`** — page-by-page label → JSON path → frontend surface walkthrough (omitted from v1; the README + annotated PDF cover the same ground for these simple 2-3 page reports).
- **More samples** if more PEI PDFs become available.
