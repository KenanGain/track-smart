# Changelog — Nova Scotia NSC Carrier Profile Abstract vendor package

## v1 — 2026-05-04

Initial release. One canonical sample.

**Added**
- `schema.json` — Draft-07 JSON Schema covering source / carrier (demographics + certificate) / pull (thresholds, scores, auditHistory, cvsaInspections, cvsaTotals, convictions, collisions, warningTickets, warningTotals).
- `validate.py` — schema validation + 9 cross-field checks (total demerit sum, CVSA totals consistency, OOS↔3pts mapping, threshold ordering, profileAsOf consistency, contiguous CVSA seq).
- `scripts/extractor.py` — reference text-PDF parser. Walks the abstract page-by-page and emits a candidate `extracted.json`. Handles:
  - Side-by-side mailing/physical address blocks (PDF interleaves the two columns line-by-line).
  - Inline `Label: value` pairs vs. label-on-its-own-line + value-on-next-line layouts.
  - Inline-and-multiline driver-master numbers (e.g. `D4391-00009-90407 / ` on one line then `ON` on the next).
  - Plate vs. driver-master disambiguation in the CVSA section (the LAST plate-shaped line before the result keyword is always the driver master, even when its `<id> / <jur>` shape matches a plate).
  - "Totals" row for both CVSA section (records + demerit pts) and Warning Tickets section (records).
  - "There are no … records." sentinel handling for Convictions and Collisions.
- `scripts/annotate_pdf.py` — 6-color overlay (PALE labels + STRONG values via PyMuPDF `search_for`). Same approach as BC v6 — `page.draw_rect()` content-stream drawing so PALE highlights always render. Sinks: GREEN demographics, BLUE thresholds + scores + audits, PURPLE CVSA, ORANGE convictions, RED collisions, YELLOW warnings + source/banner.
- `scripts/emit_csvs.py` — flattens `extracted.json` into 5 CSVs (audit-history, cvsa-inspections, convictions, collisions, warning-tickets).
- `scripts/write_readme.py` — auto-generates the per-pdf summary card.
- `raw-pdfs/9496971_CANADA_INC_NS_Carrier_Profile.pdf` — 9496971 CANADA INC (NSC ZZZZZ728361002), profile as of 26/11/2024, 3 pages.
- `per-pdf/9496971_Canada_2024-11-26/` — full per-pdf folder:
  - `extracted.json` — schema-valid, all 9 cross-field checks pass. **50 CVSA inspections** (4 OOS, 11 Defect Noted, 35 Passed) + **2 warning tickets** parsed directly from the PDF text.
  - `annotated.pdf` — 6-color overlay (465 highlights).
  - `extraction-doc.md` — page-by-page walkthrough mapping each PDF label to its JSON path.
  - `lists/*.csv` — 5 flattened CSV templates.
  - `README.md` — auto-generated summary card.

**Notes**
- NS abstracts are short text-PDFs (3-5 pages typical). Vendors can use any PDF text-extraction library (PyMuPDF, pdfplumber, pdftotext) without OCR.
- Values in the shipped `extracted.json` are **parsed directly from the printed PDF**, not transcribed from the frontend mock. The frontend mock in `src/pages/inspections/NscNsPerformanceBlock.tsx` carries an abbreviated 18-row CVSA subset; this vendor sample carries the full 50 rows that the PDF actually prints. Frontend code is not modified.
- `pull.convictions` and `pull.collisions` are empty arrays for this carrier — the PDF prints "There are no … records." for both sections. Validator handles this case explicitly.

## v2 (planned)

- More samples if additional NS abstracts become available.
- A bulk-mode wrapper for the extractor (parses N PDFs in one pass).
- Lookups for the demerit-multiplier table (NS publishes a separate weighting matrix per offence severity and fleet-size band).
