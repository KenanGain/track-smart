# 03072022_Ontario.pdf



## Quick facts

| Property | Value |
|---|---|
| Source file | `03072022_Ontario.pdf` (17 pages) |
| CVOR # | 030-720-022 |
| Carrier | NORTH ROUTES TRANSPORT LTD. |
| DBA | NORTH ROUTES |
| Pull date (reportDate) | **2024-07-25** (Jul 25/24) |
| Window | 2022-07-25 → 2024-07-25 |
| CVOR rating | **24.16%** |
| Fleet | 130 trucks · 150 drivers |
| Total km | 17,054,528 |
| Collisions | **22** (14 pts) |
| Convictions | **26** (71 pts) |
| OOS overall | 25.33% (V: 26.67%, D: 4.00%) |

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
| Inspections | **148** | `lists/inspection-events.csv` |
| Collisions  | **22** | `lists/collision-events.csv` |
| Convictions | **26** | `lists/conviction-events.csv` |
| **Total**   | **196** | (events array in `extracted.json`) |

## Run the validator

From the package root:

```bash
python validate.py
```

It walks every `per-pdf/<name>/extracted.json` and runs all 15 checks against each.
