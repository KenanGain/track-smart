# Changelog — PEI Carrier Abstract Report vendor package

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
