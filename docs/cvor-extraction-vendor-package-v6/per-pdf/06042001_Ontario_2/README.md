# 06042001_Ontario (2).pdf

> **Note:** Byte-identical duplicate of 06042001_Ontario.pdf — useful for vendor determinism check.


## Quick facts

| Property | Value |
|---|---|
| Source file | `06042001_Ontario (2).pdf` (19 pages) |
| CVOR # | 060-420-001 |
| Carrier | 3580768 CANADA INC. |
| DBA | EXAMPLE FREIGHT |
| Pull date (reportDate) | **2026-04-02** (Apr 2/26) |
| Window | 2024-04-02 → 2026-04-02 |
| CVOR rating | **21.81%** |
| Fleet | 135 trucks · 155 drivers |
| Total km | 15,780,460 |
| Collisions | **18** (14 pts) |
| Convictions | **11** (24 pts) |
| OOS overall | 28.50% (V: 36.00%, D: 3.50%) |

## Files in this folder

| File | What it is |
|---|---|
| `extracted.json` | Full v2-shape extraction. Schema-valid, all 15 cross-field checks pass. |
| `annotated.pdf` | Highlighted PDF — every extractable value marked with the 7-color overlay. |
| `extraction-doc.md` | Page-by-page walk-through: what each label is, where it goes in JSON, where it shows up in TrackSmart's UI. |
| `lists/` | Flattened CSVs (one per list-shaped field). |

## Event counts in `pull.events[]`

| Type | Count | CSV file |
|---|---:|---|
| Inspections | **137** | `lists/inspection-events.csv` |
| Collisions  | **18** | `lists/collision-events.csv` |
| Convictions | **11** | `lists/conviction-events.csv` |
| **Total**   | **166** | (events array in `extracted.json`) |

## Run the validator

From the package root:

```bash
python validate.py
```

It walks every `per-pdf/<name>/extracted.json` and runs all 15 checks against each.
