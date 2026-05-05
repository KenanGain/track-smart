# Carry_Freight_19_Dec_2018

| Field | Value |
|---|---|
| **NSC #**           | AB243-8992 |
| **MVID #**          | 0854-32599 |
| **Carrier**         | Carry Freight Ltd. |
| **Address**         | 114 West Creek Springs, Chestermere AB T1X 1N7 |
| **Profile period**  | 2016-12-20 → 2018-12-19 (24 months) |
| **Date printed**    | 2018-12-19 |
| **12-mo report as of** | 2018-11-30 |
| **Pages**           | 30 |
| **Safety Fitness**  | Satisfactory Unaudited |
| **Operating Status**| Federal |
| **Fleet Range / Type** | 5-9 / Truck |
| **R-Factor Score**  | 0.468 |
| **Contributions**   | Conv 82.0% · Insp 18.0% · Coll 0.0% |
| **Monitoring Stage**| (none — carrier not on monitoring list) |
| **Avg / Current fleet** | 7 / 10 |

## Pull totals

| Section | Documents | Events |
|---|---:|---:|
| Convictions          | 1 | 1 (3 active points) |
| CVSA Inspections     | 9 | 9 (3 OOS, 5 REQ, 8 total defects) |
| Reportable Collisions| — | 0 |
| Violations           | 0 | 0 |

## File index

| File | What it is |
|---|---|
| `extracted.json`     | Schema-valid v1 extraction (the JSON your API should return) |
| `extraction-doc.md`  | Page-by-page walk-through linking each PDF label to its JSON path |
| `annotated.pdf`      | The raw PDF with the 7-color overlay |
| `lists/*.csv`        | Flattened CSV per list-shaped field |

## How to verify

```bash
# From package root:
python validate.py per-pdf/Carry_Freight_19_Dec_2018/extracted.json
```

## Notes

- This carrier had a single Hours-of-Service conviction within the 24-month window (Amrinder Singh Gill, plate E65208 AB, 2018 JUL 28). It contributes 3 active points and is the sole driver of the R-Factor's 82% conviction component.
- 9 CVSA inspections recorded, 3 of which were Out-of-Service. The most recent OOS (2018 DEC 12) was for a Lighting Devices defect on the trailer.
- No reportable collisions and no informal violations. The `collisionSummary`, `collisionDetails`, `violationSummary`, `violationDetails` arrays are intentionally empty — the corresponding pages in the PDF say "No Collisions on Record" / "No Violations on Record".
- The carrier is **not** on Alberta's monitoring list this pull (R-Factor 0.468 is below Stage 1's lower bound of 1.830 for fleet-range 5-9). `pull.monitoringStage` is `null` and `pull.carriersAtStageOrAbove` is `null`. The blue printout cell is blank.
- This is the **canonical sample** for the package — the existing TrackSmart frontend's AB mock data (in `src/pages/inspections/NscAbPerformanceHistory.tsx`) is largely derived from this PDF.
