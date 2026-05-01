# 07 — Training Data Guide

How to use the 5 sample PDFs in this bundle as a training/validation set for your extractor.

---

## What's shipped

```
raw-pdfs/
   06042001_Ontario.pdf                   738 KB   19 pages
   03072022_Ontario.pdf                   623 KB   17 pages
   06042001_Ontario (2).pdf               738 KB   19 pages   (duplicate of #1)
   20250203_100539_0000850abd10.pdf      6.3 MB   29 pages
   20241104_125433_0000369fbd10.pdf      1.7 MB    8 pages

highlighted-pdfs/
   <same 5 files>.annotated.pdf          Same content + 4-color extraction overlay
                                         and a legend page on the front.

examples/expected/
   06042001_Ontario.json                  FULL ground truth (mirrors response-single.json)
   03072022_Ontario.json                  Schema-conforming stub. Fill in from highlighted PDF.
   06042001_Ontario (2).json              = #1 (deterministic-output check)
   20250203_100539_0000850abd10.json      Schema-conforming stub.
   20241104_125433_0000369fbd10.json      Schema-conforming stub.
```

---

## Per-PDF profile

Use these to spot-check that your extractor behaves correctly across the variation we've seen in production.

### #1 · `06042001_Ontario.pdf`  (19 pages)

- **Carrier:** `3580768 CANADA INC.` · CVOR `138-903-258`
- **Pull date:** Apr 2, 2026
- **Distinctive features:** Standard 19-page layout. Has dangerous goods false. Has hazmat-tagged inspections. Two-vehicle (truck + trailer) inspections present.
- **Highlights:** 25 GREEN · 57 BLUE · 746 PURPLE · 9 YELLOW · **837 total**
- **Ground truth:** `examples/expected/06042001_Ontario.json`

### #2 · `03072022_Ontario.pdf`  (17 pages)

- **Carrier:** different operator
- **Distinctive features:** Slightly shorter event log; no Vehicle 2 in some inspections. Tests how your parser handles single-unit inspections.
- **Highlights:** 24 GREEN · 55 BLUE · 648 PURPLE · 8 YELLOW · **735 total**
- **Ground truth:** `examples/expected/03072022_Ontario.json`

### #3 · `06042001_Ontario (2).pdf`  (19 pages)

- **Identical bytes to #1.** Use as a determinism check: feed it through your extractor twice (or once each as #1 and #3) — output JSON must be byte-equal except for `source.fileName` and `source.extractedAt`.
- **Highlights:** identical to #1.
- **Ground truth:** `examples/expected/06042001_Ontario (2).json`

### #4 · `20250203_100539_0000850abd10.pdf`  (29 pages)

- **Distinctive features:** **Long event log** — extra event-log pages (4–17 plus more). Tests parser's pagination handling. Larger fleet → more inspection events.
- **Highlights:** 25 GREEN · 48 BLUE · 718 PURPLE · 10 YELLOW · **801 total**
- **Ground truth:** `examples/expected/20250203_100539_0000850abd10.json`

### #5 · `20241104_125433_0000369fbd10.pdf`  (8 pages)

- **Distinctive features:** **Compact PDF** — fewer inspection events, shorter event-log section. Tests minimal-case behavior. The page numbering for sections shifts (event log starts on page 4 but ends sooner).
- **Highlights:** 23 GREEN · 39 BLUE · 224 PURPLE · 6 YELLOW · **292 total**
- **Ground truth:** `examples/expected/20241104_125433_0000369fbd10.json`

---

## Suggested training/eval workflow

1. **Start with #1.** It has full ground truth in `examples/expected/06042001_Ontario.json`. Run your extractor on `raw-pdfs/06042001_Ontario.pdf`, diff against the ground truth, and iterate until field-by-field match is ≥ 99%.

2. **Validate determinism with #3.** Feed it independently — output should equal #1's except for `source.fileName` and `source.extractedAt`.

3. **Stress-test #4** (long event log) and **#5** (compact). The number of inspection events scales: #4 has many, #5 has few. The carrier-identity (GREEN) and per-pull (BLUE) field counts stay roughly constant.

4. **Cross-check #2.** Different carrier; same schema. Watch for: missing `Operating As`, missing `US DOT #`, single-unit inspections (no Vehicle 2 block).

5. **Run our self-test** on your output:
   ```bash
   pip install jsonschema
   cp your-output.json examples/response-single.json
   python validate.py
   ```

   Six checks must pass with exit code 0.

---

## How the ground-truth files were derived

- The annotated PDFs in `highlighted-pdfs/` show **exactly** which tokens get pushed into which JSON field.
- Each annotated PDF has a **legend page** on front explaining the 4 colors.
- `cvor-extraction-response.schema.json` is the contract — any file in `examples/expected/` must validate against it.
- For the stubs (PDFs #2, #3, #4, #5), only `source.*` and `carrier.cvorNumber` are pre-filled. Open the matching annotated PDF, read each highlighted value, and fill in the JSON. **You don't need to do this** — your API does — but the stubs give you a hand-keyable checkpoint to validate against.

---

## Accuracy SLA we'd like to see

Per-field accuracy on the training set, broken out by sink:

| Sink | Fields | Accuracy target |
|---|---|---|
| GREEN  (carrier identity)   | ~13 fields | **100%** — these are headline fields |
| BLUE   (per-pull metric)    | ~30 fields | **≥ 99.5%** — drives charts and KPIs |
| PURPLE (inspection events)  | ~20 fields × N events | **≥ 98%** — high volume, OCR-noisy |
| YELLOW (audit fields)       | ~7 fields  | best-effort |

Please report these numbers in your acceptance test, computed against the 5 ground-truth JSONs in `examples/expected/`.

---

## Edge cases we've seen across the 5 PDFs

- `US/Mexico Kms Travelled` may print `Not Applicable` instead of `0`. Coerce to `0`.
- `Operating As` is often blank; emit `null`.
- `Mobile #` and `Fax #` are often blank.
- `Vehicle 2` is only present in some inspections — `vehicles[]` must be variable-length.
- The *Categories OOS* asterisk on per-defect category rows must be parsed off the category string into `defects[k].oos = true`.
- Pull date sometimes appears as the timestamp portion of `Search Date and Time` (top of page 1), not as a separate "Pull Date" label.
- Form versions other than `SR-LV-029A (2021/10)` should still be attempted — emit a `warnings[]` entry with `code: FORM_VERSION_UNKNOWN`.
