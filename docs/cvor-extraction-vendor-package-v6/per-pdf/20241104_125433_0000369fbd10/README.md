# 20241104_125433_0000369fbd10.pdf



## Quick facts

| Property | Value |
|---|---|
| Source file | `20241104_125433_0000369fbd10.pdf` (8 pages) |
| CVOR # | 369-110-004 |
| Carrier | BLUEFIN LOCAL HAULERS LTD. |
| DBA | BLUEFIN HAUL |
| Pull date (reportDate) | **2026-01-26** (Jan 26/26) |
| Window | 2024-01-26 → 2026-01-26 |
| CVOR rating | **32.18%** |
| Fleet | 45 trucks · 52 drivers |
| Total km | 3,358,000 |
| Collisions | **4** (4 pts) |
| Convictions | **10** (16 pts) |
| OOS overall | 20.69% (V: 33.33%, D: 3.45%) |

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
| Inspections | **36** | `lists/inspection-events.csv` |
| Collisions  | **4** | `lists/collision-events.csv` |
| Convictions | **10** | `lists/conviction-events.csv` |
| **Total**   | **50** | (events array in `extracted.json`) |

## Run the validator

From the package root:

```bash
python validate.py
```

It walks every `per-pdf/<name>/extracted.json` and runs all 15 checks against each.
