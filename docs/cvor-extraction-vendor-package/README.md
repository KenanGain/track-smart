# CVOR PDF Extraction — Vendor Specification Package

**Audience:** Backend / API vendor building a service that ingests Ontario MTO CVOR PDFs and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** Draft v1 — frozen scope, ready for vendor quote.

---

## ⭐ Which data we need extracted (3-second summary)

Extract every value highlighted in our reference PDFs. The 4-color overlay tells you which sink each value belongs to:

| Color | Sink | What it becomes | Approx fields per PDF |
|---|---|---|---|
| 🟢 GREEN  | Carrier Identity      | Sticky carrier-profile fields (CVOR #, name, address, status, dates, rating, fleet) | ~13 |
| 🔵 BLUE   | Per-Pull Metric       | One row in `cvorPeriodicReports` (drives KPI cards, history chart, Pull-by-Pull table) | ~30 |
| 🟣 PURPLE | Per-Inspection Event  | One entry in the bottom CVOR Inspections list (with defects array) | ~20 per event |
| 🟡 YELLOW | Optional / audit      | Order #, Search Date, US DOT, Mobile, Fax, Vehicles Double Shifted | ~7 |

In each color, the **pale shade marks the LABEL** (the field name on the PDF) and the **strong shade marks the VALUE** (the data to extract). Match by label, capture value, emit JSON.

**Authoritative field-by-field map:** `02-data-model.md` + `cvor-extraction-response.schema.json`.

---

## What we need from you

A REST API that accepts an MTO CVOR PDF and returns the extracted data as JSON conforming to **`cvor-extraction-response.schema.json`** in this package.

- **Input:** one CVOR PDF (or many, in bulk).
- **Output:** one JSON object per PDF, matching the schema.
- **We persist** the JSON in our database.
- **We render** it on our existing CVOR page (KPI cards, performance charts, OOS rates, mileage summary, Pull-by-Pull table, CVOR Inspections list).

Each uploaded PDF represents **one CVOR pull** (a 24-month rolling snapshot). The same carrier is uploaded multiple times across years — every upload is appended to a history (`cvorPeriodicReports`) that drives the time-series charts and the Pull-by-Pull table.

---

## What's in this package

| Path | Purpose |
|---|---|
| `00-CRUX.txt`                                | Plain-text one-page summary. Read first. |
| `README.md`                                  | This document — start here |
| `01-overview.md`                             | Problem statement + carrier-context primer |
| `02-data-model.md`                           | Field-by-field walkthrough, with PDF source label and page number |
| `03-api-contract.md`                         | Endpoints, auth, request/response, errors, bulk semantics |
| `04-validation.md`                           | Validation rules, edge cases, OCR pitfalls |
| `05-frontend-mapping.md`                     | How each JSON field is rendered in our UI |
| `06-pdf-extraction-by-page.md`               | **NEW** — Page-by-page extraction map for the standard 19-page PDF |
| `07-training-data-guide.md`                  | **NEW** — How to use the 5 sample PDFs as a training set + per-PDF profiles |
| `cvor-extraction-response.schema.json`       | **Authoritative JSON Schema (draft-07)**. Your API output must validate against this |
| `examples/response-single.json`              | Full example response (= PDF #1 ground truth) |
| `examples/response-bulk.json`                | Bulk response shape (success + failure example) |
| `examples/response-error.json`               | All 7 error codes, one example each |
| `examples/expected/<pdf>.json`               | **NEW** — Per-PDF ground truth (one per training PDF). #1 + #3 fully filled; #2/#4/#5 are stubs to fill in. |
| `templates/pulls.csv`                        | CSV header + sample row, per-pull record (one row = one pull) |
| `templates/inspection-events.csv`            | CSV header + sample rows, inspection events (one row = one event) |
| `templates/tickets.csv`                      | **NEW** — CSV header + sample rows, tickets (one row = one ticket) |
| `validate.py`                                | Self-test — checks schema + examples + CSVs + per-PDF expected. Run after any change. |
| `highlighted-pdfs/`                          | **NEW** — 5 annotated PDFs with the 4-color extraction overlay |
| `raw-pdfs/`                                  | **NEW** — 5 raw PDFs (the training/validation set) |
| `reference-highlighted-pdf.md`               | How to read the annotated reference PDFs |

---

## Sample PDFs (now bundled inside this package)

**5 raw CVOR PDFs** in `raw-pdfs/` + **5 annotated counterparts** in `highlighted-pdfs/`. They cover four distinct carriers, three different page lengths (8 / 17 / 19 / 29), and one duplicate (so you can verify deterministic output across two identical inputs).

| # | Raw PDF | Annotated PDF | Pages | Highlights (G / B / P / Y) | Total |
|---|---|---|---:|---|---:|
| 1 | `06042001_Ontario.pdf`                  | `06042001_Ontario.annotated.pdf`                  | 19 | 25 / 57 / 746 / 9   | **837** |
| 2 | `03072022_Ontario.pdf`                  | `03072022_Ontario.annotated.pdf`                  | 17 | 24 / 55 / 648 / 8   | **735** |
| 3 | `06042001_Ontario (2).pdf`              | `06042001_Ontario (2).annotated.pdf`              | 19 | 25 / 57 / 746 / 9   | **837** (dup of #1, useful for determinism check) |
| 4 | `20250203_100539_0000850abd10.pdf`      | `20250203_100539_0000850abd10.annotated.pdf`      | 29 | 25 / 48 / 718 / 10  | **801** |
| 5 | `20241104_125433_0000369fbd10.pdf`      | `20241104_125433_0000369fbd10.annotated.pdf`      | 8  | 23 / 39 / 224 / 6   | **292** |
| | | | | **Grand total** | **3,502 highlights** |

The annotated PDFs each begin with a **legend page** (auto-generated) that names the 4-color scheme and the data sinks it maps to.

A copy of the script that produced the annotated PDFs is checked in at `scripts/highlight_cvor_pdf.py` in our repo (Python 3 + PyMuPDF + RapidOCR). You don't need to run it; it's there as a transparent reference for what we've mapped. To regenerate: `python scripts/highlight_cvor_pdf.py` (defaults batch over the 5 PDFs above) or pass paths: `python scripts/highlight_cvor_pdf.py path/to/cvor.pdf …`.

---

## How to validate (vendor self-test)

A one-shot validator ships with this package: **`validate.py`**. It checks that the schema, examples, and CSV templates are internally consistent and that field names haven't drifted between docs.

```bash
pip install jsonschema
python validate.py
```

What it checks:

| # | Check | Purpose |
|---|---|---|
| 1 | JSON Schema is a valid Draft-07 document | catches typos in the schema |
| 2 | `examples/response-single.json` validates against the schema | confirms the canonical example matches what we ask vendors to return |
| 3 | `examples/response-bulk.json` — every successful entry's `data` block validates against the schema | bulk responses must wrap conformant payloads |
| 4 | `examples/response-error.json` — every entry has `{error: {code, message, traceId}}` | error envelope shape is consistent |
| 5 | CSV templates parse cleanly, no duplicate columns, all rows match header width | CSV alternative output stays usable |
| 6 | Every `pull.*` field in the schema appears in `templates/pulls.csv` | guards against silent naming drift |

Exit code `0` = all green; non-zero = at least one check failed (with line-by-line diagnostics).

**For the vendor:** run `validate.py` against your own API output by saving a response to `examples/response-single.json` and re-running. If it exits 0, your schema conformance is automatic.

**Latest run (delivered package):** all 6 checks pass.

---

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts a single CVOR PDF and returns a JSON document that **validates against `cvor-extraction-response.schema.json`**.
2. For our sample PDF (`06042001_Ontario.pdf`), the returned JSON matches `examples/response-single.json` field-for-field (within sensible tolerance — see `04-validation.md`).
3. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
4. The CSV templates (`templates/`) are reproducible from the JSON output (we'll do that conversion ourselves; we just need the CSVs to be a faithful flattening — confirm field names match).
5. Latency: single PDF response within **30 s** for the synchronous endpoint; bulk allowed to be async (return job id, poll for result).

---

## Out of scope (for now)

- Multi-year travel kilometric history table (PDF pages 18–19 — we don't render this).
- Conviction and Collision *event* details (only their **counts and points** are used at the pull level; we list only Inspection events in the UI).
- Tow-operator sanctions (this carrier doesn't have any; defer until a tow operator carrier is uploaded).
- Insurance / TDG certificate / audit reports — those are uploaded separately, not extracted from the CVOR PDF.

---

## Open questions to confirm with vendor

Please respond to these in your proposal:

1. Will OCR be used, or do you have a structured PDF extractor for MTO forms?
2. Pricing model: per-PDF, per-page, per-month?
3. Async vs sync for single uploads — what's your default?
4. Webhook support for bulk-job completion?
5. SLA on accuracy — what % of fields do you guarantee at >99% correct, and which ones are best-effort?
6. Data retention policy — do you store the uploaded PDF, the extracted JSON, or neither? For how long?
