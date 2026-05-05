# Changelog — BC CVSE Carrier Profile Report vendor package

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
