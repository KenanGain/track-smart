# 20250203_100539_0000850abd10.pdf



## Quick facts

| Property | Value |
|---|---|
| Source file | `20250203_100539_0000850abd10.pdf` (29 pages) |
| CVOR # | 850-000-203 |
| Carrier | GTA EXPRESS LOGISTICS INC. |
| DBA | GTA EXPRESS |
| Pull date (reportDate) | **2025-02-03** (Feb 3/25) |
| Window | 2023-02-03 → 2025-02-03 |
| CVOR rating | **27.21%** |
| Fleet | 130 trucks · 150 drivers |
| Total km | 17,054,528 |
| Collisions | **22** (18 pts) |
| Convictions | **26** (72 pts) |
| OOS overall | 28.57% (V: 31.43%, D: 4.40%) |

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
| Inspections | **152** | `lists/inspection-events.csv` |
| Collisions  | **22** | `lists/collision-events.csv` |
| Convictions | **26** | `lists/conviction-events.csv` |
| **Total**   | **200** | (events array in `extracted.json`) |

## Run the validator

From the package root:

```bash
python validate.py
```

It walks every `per-pdf/<name>/extracted.json` and runs all 15 checks against each.
