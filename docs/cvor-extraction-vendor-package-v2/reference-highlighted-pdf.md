# Reference — Highlighted Sample PDFs

**Ten PDFs ship alongside this package** (5 raw + 5 annotated). They cover four distinct carriers and two different document lengths, so you can validate your extractor across the variation we've actually seen in production.

| # | Raw PDF | Annotated PDF | Pages |
|---|---|---|---:|
| 1 | `06042001_Ontario.pdf`                  | `06042001_Ontario.annotated.pdf`                  | 19 |
| 2 | `03072022_Ontario.pdf`                  | `03072022_Ontario.annotated.pdf`                  | 17 |
| 3 | `06042001_Ontario (2).pdf`              | `06042001_Ontario (2).annotated.pdf`              | 19 |
| 4 | `20250203_100539_0000850abd10.pdf`      | `20250203_100539_0000850abd10.annotated.pdf`      | 29 |
| 5 | `20241104_125433_0000369fbd10.pdf`      | `20241104_125433_0000369fbd10.annotated.pdf`      | 8  |

PDFs #1 and #3 are byte-identical — included so you can verify that your extractor returns identical JSON for the same input (deterministic output). PDF #4 is a longer document with extra event-log pages, and PDF #5 is a shorter document with fewer events. PDFs #1 and #2 belong to two different carriers — both 17–19 pages.

---

## How the annotated PDF is colored

The first page of the annotated PDF is a **legend** explaining the four-color scheme. Every value the TrackSmart frontend renders is highlighted; everything else is left clean.

| Color | Sink | What's highlighted |
|---|---|---|
| 🟢 Green   | Carrier Identity        | Page 1 only — CVOR #, Client Name, Address, Status, Dates, Rating, Fleet, etc. |
| 🔵 Blue    | Per-Pull Metric         | Pages 1–3 — counts, kms, OOS rates, Performance Summary, Inspections by Level |
| 🟣 Purple  | Per-Inspection Event    | Pages 3–17 — one set of fields per Inspection event in the event log |
| 🟡 Yellow  | Optional / Audit trail  | Order #, Search Date, US DOT, Mobile, Fax |

**Each category uses TWO shades:**
- **Pale shade** = the LABEL (the field name, e.g. `CVOR / RIN #`)
- **Strong shade** = the VALUE (the actual data, e.g. `138-903-258`)

This makes it visually obvious which token is the field name vs the value to extract.

### Highlight counts across the 5 reference PDFs

| File | GRN (carrier) | BLU (per-pull) | PUR (events) | YEL (optional) | **Total** |
|---|---:|---:|---:|---:|---:|
| `06042001_Ontario.pdf`                | 25 | 57 | 746 | 9  | **837** |
| `03072022_Ontario.pdf`                | 24 | 55 | 648 | 8  | **735** |
| `06042001_Ontario (2).pdf`            | 25 | 57 | 746 | 9  | **837** |
| `20250203_100539_0000850abd10.pdf`    | 25 | 48 | 718 | 10 | **801** |
| `20241104_125433_0000369fbd10.pdf`    | 23 | 39 | 224 | 6  | **292** |
| **Grand total**                       | **122** | **256** | **3,082** | **42** | **3,502** |

Counts are **labels + values combined**. Carrier identity (GREEN) and per-pull metric (BLUE) totals are nearly constant across PDFs — they're a fixed schema. Per-Inspection-Event (PURPLE) totals scale with the number of events in the 24-month window for each pull. The shorter PDF #5 has fewer events; the longer PDF #4 has more.

**Sanity check for your extractor:** if your output has materially fewer carrier-identity or per-pull values than the table above (e.g. fewer than 20 GREEN or 40 BLUE), you're likely missing required fields. Per-Inspection-Event coverage will vary by carrier; what matters is that the count of inspection events matches the number of `Inspection`-typed entries on PDF pages 4–17 of each input.

---

## How the highlights were generated

A Python OCR-based annotator: **`scripts/highlight_cvor_pdf.py`** in our repo.

- OCR engine: [RapidOCR-onnxruntime](https://github.com/RapidAI/RapidOCR)
- Rendering: [PyMuPDF](https://pymupdf.readthedocs.io/) (`fitz`)
- Per-rule **page restrictions** prevent bleed (e.g. the word "Collision" only highlights on page 2 inside the Performance Summary, not in the event log on pages 4–17).
- **Strict whole-token matching** for short single-word labels.
- For each label match, the script searches for the OCR token immediately to the **right** (or **below**, for stacked layouts like the Address block) and highlights it in the strong shade.

You don't need to run this yourself. It's provided as a transparent reference for what we've already mapped. If you want to run it: `pip install pymupdf pillow numpy rapidocr-onnxruntime` then `python scripts/highlight_cvor_pdf.py`.

---

## What the annotated PDF does NOT highlight (deliberately)

| Pages / sections | Why |
|---|---|
| Page footers (`PAGE n OF m`, MTO URL) | Page chrome |
| Tow Operator section (page 3) | Not applicable to fleets we serve; mostly blank in this sample |
| Conviction event detail rows (pages 4–17) | We only need Conviction *counts* (pull-level) |
| Collision event detail rows (pages 4–17) | We only need Collision *counts* (pull-level) |
| Travel Kilometric Information history (pages 18–19) | Not rendered today; current-year kms suffice |

If your extractor grabs these for free, no problem — we just won't store them. They're not required.
