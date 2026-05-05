# PEI Carrier Abstract Report PDF Extraction — Vendor Package (v2)

**Audience:** Backend / API vendor building a service that ingests PEI Highway Safety **National Safety Code Carrier Abstract Reports** and returns structured JSON.

**TrackSmart owner:** Kenan Gain — `kenangain2910@gmail.com`

**Status:** v2 — adds the OCR reference pipeline (`scripts/extract_ocr.py` using Tesseract via pytesseract) and per-pdf `extraction-doc.md` page-by-page walkthroughs (page → label → JSON path → frontend surface). The image-based annotator from v1 is unchanged (auto-detects text bands + column extents). Schema, validator, hand-transcribed `extracted.json` files unchanged from v1.

---

## Start here

1. **`BLUEPRINT.md`** — what's in this package and how the PEI Carrier Abstract Report is structured.
2. **`schema.json`** — Draft-07 JSON Schema. Your API output must validate against this.
3. **One folder under `per-pdf/`** — pick a PDF, open `README.md` + `extracted.json`, look at `annotated.pdf` next to the raw PDF in `raw-pdfs/`.
4. **`validate.py`** — runs from package root. Walks every `per-pdf/<name>/extracted.json` and confirms schema validity + cross-field math.

---

## Package contents

```
.
├── README.md                ← you are here
├── BLUEPRINT.md             ← form anatomy + extraction methodology
├── schema.json              ← JSON Schema (Draft-07)
├── validate.py              ← schema + cross-field math
├── CHANGELOG.md
├── raw-pdfs/                ← 2 raw scanned-image PDFs
│   ├── Carrier_Profile_18_Nov_2020.pdf
│   └── Carrier_Profile_09_Mar_2023.pdf
├── per-pdf/                 ← per-PDF deliverables
│   ├── Carrier_Profile_18_Nov_2020/
│   │   ├── extracted.json
│   │   ├── annotated.pdf       (7-color region overlay drawn at auto-detected text bands)
│   │   ├── extraction-doc.md   (page-by-page label → JSON path → frontend surface)
│   │   ├── lists/*.csv
│   │   └── README.md
│   └── Carrier_Profile_09_Mar_2023/
│       └── (same)
└── scripts/                 ← helper scripts
    ├── extract_ocr.py       (raw PDF → candidate extracted.json via Tesseract)  [v2]
    ├── emit_csvs.py         (extracted.json → 5 CSVs)
    ├── annotate_pdf.py      (raw PDF → annotated.pdf with auto-detected rect overlay)
    └── write_readme.py      (extracted.json → per-pdf README)
```

---

## Important — these are scanned image-only PDFs

Unlike the Ontario CVOR and Alberta Carrier Profile PDFs in our other packages, **PEI Carrier Abstract Reports have no text layer**. Each page is a single embedded image. Consequences:

- `pdftotext`, PyMuPDF's `page.get_text()`, etc. all return empty strings.
- `search_for` cannot find labels or values; the data-driven annotator strategy used for AB/CVOR is not applicable.
- A real vendor pipeline must run **OCR** on each page. Recommended engines: **Tesseract 5+** (open source), **AWS Textract** (managed, table-aware), or **Azure Form Recognizer** (managed, key-value pairs).
- v1 of this package was built by **hand-transcription** from the rendered PNGs (the 2 sample PDFs were small enough to do this manually). `source.ocrEngine` is set to `null` to indicate this. A vendor's pipeline output should set `ocrEngine` to a string like `"tesseract-5.3.0"` or `"textract"`.

The annotated PDFs in this package have hand-mapped region rectangles drawn at PEI form coordinates (the 2020 and 2023 PDFs use the same layout). When the form revision changes, those coordinates need to be re-mapped — see `scripts/annotate_pdf.py`.

---

## The 7-color region legend

Same colors as the AB and CVOR packages so a vendor's reviewer can switch between jurisdictions without learning a new key.

| Color | Sink | JSON destination |
|---|---|---|
| 🟢 GREEN  | Carrier identity                  | `carrier.*` |
| 🔵 BLUE   | Pull-level metric (point totals, fleet) | `pull.{collisionPoints, convictionPoints, inspectionPoints, currentActiveVehicles, …}` |
| 🟣 PURPLE | CVSA inspection row               | `pull.inspections[]` |
| 🔴 RED    | Collision row                     | `pull.collisions[]` |
| 🟠 ORANGE | Conviction row                    | `pull.convictions[]` |
| 🟡 YELLOW | Audit / source / footer           | `pull.audits[]`, `source.*`, `pull.carrierInfo.*` |

PEI uses no 7th sink (no monitoring section like AB has) — Brown is unused in this package.

---

## How a vendor uses this package

```bash
# 1. Read this README + BLUEPRINT.md
# 2. Pick a per-pdf folder
cd per-pdf/Carrier_Profile_18_Nov_2020/

# 3. Open the raw PDF + the annotated PDF side by side:
#    raw-pdfs/Carrier_Profile_18_Nov_2020.pdf  ← what your OCR sees
#    per-pdf/Carrier_Profile_18_Nov_2020/annotated.pdf  ← what to extract

# 4. Compare to the shipped extracted.json field by field
cat extracted.json

# 5. From the package root, run the validator on your own output:
cd ../..
python validate.py
```

Validator exit code `0` = schema-valid + cross-field math passes.

---

## Validator checks

| # | Check |
|---|---|
| 1 | JSON validates against `schema.json` (Draft-07) |
| 2 | `Σ inspections[].points === pull.inspectionPoints` (each Out-of-Service inspection contributes 3 pts) |
| 3 | `Σ collisions[].points === pull.collisionPoints` |
| 4 | `Σ convictions[].points === pull.convictionPoints` |
| 5 | Each `inspections[].status` is consistent with its `points` (P/W → 0; M/OOS → 3) |
| 6 | Each at-fault `collisions[].severity` matches its `points` (PD=2 / Injury=4 / Fatal=6) |
| 7 | `pull.currentActiveVehicles` maps to a row in PEI Schedule 3 (1-2, 3-5, 6-9, 10-14, …, 100+) |

---

## Acceptance criteria

Your delivery is "done" when:

1. Your API accepts a PEI Carrier Abstract Report PDF and returns JSON validating against `schema.json`.
2. For each shipped sample (2 PDFs), your API output matches the shipped `extracted.json` field-for-field within sensible tolerance for OCR-induced text variation (e.g. driver names, leading/trailing whitespace).
3. All validator checks pass for every per-PDF folder.
4. CSV templates in `lists/` are reproducible from your JSON output.
5. Bulk endpoint accepts 1–50 PDFs and returns a list of per-file results, including partial failures.
6. Single PDF latency ≤ 30 s for the synchronous endpoint (OCR makes this slower than text-based; that's OK).

---

## Open questions to confirm with vendor

1. Which OCR engine? (Tesseract 5+ is fine for this layout.)
2. Pricing model: per-PDF, per-page, per-month?
3. Async vs sync default for single uploads?
4. Webhook support for bulk-job completion?
5. SLA on accuracy — which fields must be >99%? (Recommend: NSC#, dates, point totals, fleet counts.)
6. Data retention policy on uploaded PDFs and extracted JSON?
