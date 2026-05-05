# Carrier_Profile_30_Sept_2019

| Field | Value |
|---|---|
| **NSC #**           | AB243-8992 |
| **MVID #**          | 0854-32599 |
| **Carrier**         | Carry Freight Ltd. |
| **Address**         | 320-3770 Westwinds Dr NE, Calgary AB T3J 5H3 |
| **Profile period**  | 2017-10-01 → 2019-09-30 (24 months) |
| **Date printed**    | 2019-09-30 |
| **12-mo report as of** | 2019-08-31 |
| **Pages**           | 39 |
| **Safety Fitness**  | Satisfactory Unaudited |
| **Operating Status**| Federal |
| **Fleet Range / Type** | 10 / Truck |
| **R-Factor Score**  | 2.559 |
| **Contributions**   | Conv 91.0% · Insp 4.6% · Coll 4.4% |
| **Monitoring Stage**| (none — R-Factor 2.559 falls inside Stage 1's 1.830-2.464 band but no stage assignment is printed) |
| **Avg / Current fleet** | 10 / 16 |

## Pull totals

| Section | Documents | Events |
|---|---:|---:|
| Convictions          | 13 | 13 (26 active points across Speeding/Driving/HoS/Trip Inspections) |
| CVSA Inspections     | 25 | 25 (10 OOS, 7 Required Attention, 8 Passed; 39 total defects across 14 categories) |
| Reportable Collisions| —  | 1 (Property Damage, 2 active points, HARJOT S SIDHU) |
| Violations           | 1  | 1 (Miscellaneous, TVR 118300EI, Jagseer singh BATTH) |

## Why this sample matters

This is the **same carrier** as the canonical 2018 sample (`Carry_Freight_19_Dec_2018`), one pull later. Demonstrates:

- **Cross-pull continuity** — the carrier moved address (Chestermere → Calgary) and grew the fleet (5-9 range → 10).
- **Heavy event rate** — 13 convictions + 25 CVSA inspections + 1 collision + 1 violation, vs. the 2018 PDF's 1 + 9 + 0 + 0. The vendor's extractor must scale to this density without performance regressions.
- **Schema drift** — the 2019 PDF's CVSA Defect Analysis includes a 20th category, "20 - Driver's Seat (Missing)", and the label for category 9 is "Lighting Devices (Part II Section 9 only)" rather than the 2018 PDF's "(Part II Section 8 OOSC only)". The schema's `cvsaDefectAnalysis` was relaxed in v2 (no `maxItems`) to accommodate this.
- **Real R-Factor crossing** — 0.468 (Dec 2018) → 2.559 (Sep 2019), a ~5× jump that's almost entirely driven by the 12-conviction surge in 2018. Useful for testing the frontend's R-Factor warning thresholds.
- **Multi-vehicle plates** — many of the same plates (E65208, E75062, E65114, U04031, U11096) appear across both pulls, demonstrating that downstream dedup must key on (date + document + plate) rather than on driver name.

## File index

| File | What it is |
|---|---|
| `extracted.json`     | Schema-valid v1 extraction. All 14 cross-field checks pass. |
| `annotated.pdf`      | The raw PDF with the 7-color overlay applied. |
| `lists/*.csv`        | 16 flattened CSV templates (same shape as the canonical sample). |
| `README.md`          | This summary card. |

## How to verify

```bash
python validate.py per-pdf/Carrier_Profile_30_Sept_2019/extracted.json
```

For the page-by-page methodology, see the canonical sample's `extraction-doc.md`:

```
per-pdf/Carry_Freight_19_Dec_2018/extraction-doc.md
```

The label → JSON path → frontend surface mapping is identical for both PDFs (same older Alberta Carrier Profile format). Differences from canonical:

- **Part 1** adds an `Effective Date:` line (2018 MAR 23) — not stored in v1 schema; arrives in v2 schema as `carrier.safetyFitnessEffectiveDate` (TBD).
- **Part 3 Defect Analysis** has 20 rows instead of 19. Treat the analysis as a list of whatever PDF rows are printed (don't hard-code 19).
- **Part 4 Collision Detail** is populated (the canonical sample has 0 collisions). Use this sample to verify your collision-detail parser.
- **Part 5 Violation Detail** is populated (one offence with `text` field). Use this sample to verify your violation-offence parser.
