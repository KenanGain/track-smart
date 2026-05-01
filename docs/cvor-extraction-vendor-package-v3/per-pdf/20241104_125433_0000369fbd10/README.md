# 20241104_125433_0000369fbd10.pdf



## Quick facts

| Property | Value |
|---|---|
| Source file | `20241104_125433_0000369fbd10.pdf` (8 pages) |
| CVOR # | 369-110-004 |
| Carrier | BLUEFIN LOCAL HAULERS LTD. |
| DBA | BLUEFIN HAUL |
| Pull date (reportDate) | **2024-11-04** (Nov 4/24) |
| Window | 2022-11-03 → 2024-11-04 |
| CVOR rating | **14.20%** |
| Fleet | 45 trucks · 52 drivers |
| Total km | 4,325,200 |
| Collisions | **6** (6 pts) |
| Convictions | **8** (18 pts) |
| OOS overall | 18.50% (V: 22.00%, D: 2.50%) |

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
| Inspections | **46** | `lists/inspection-events.csv` |
| Collisions  | **6** | `lists/collision-events.csv` |
| Convictions | **8** | `lists/conviction-events.csv` |
| **Total**   | **60** | (events array in `extracted.json`) |

## Run the validator

From the package root:

```bash
python validate.py
```

It walks every `per-pdf/<name>/extracted.json` and runs all 15 checks against each.
