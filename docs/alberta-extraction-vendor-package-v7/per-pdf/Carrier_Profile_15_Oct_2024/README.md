# Carrier_Profile_15_Oct_2024

| Field | Value |
|---|---|
| **NSC #** | AB320-9327 |
| **MVID #** | 0930-15188 |
| **Carrier** | CARRIER PROFILE
CARRIER INFORMATION
Bent Transport Inc. |
| **Address** | Calgary T3N 1W3 |
| **Profile period** | 2022-10-01 → 2024-10-15 |
| **Date printed** | 2024-10-15 |
| **12-mo report as of** | 2024-10-15 |
| **Pages** | 64 |
| **Format** | Newer 'Page X of Y' layout |
| **Safety Fitness** | Satisfactory Unaudited |
| **Operating Status** | Federal |
| **Fleet Range / Type** | 8 / Truck |
| **Certificate Number** | — |
| **Cert. Effective Date** | — |
| **Cert. Expiry Date** | — |
| **R-Factor Score** | 0.339 |
| **Contributions** | Conv 34.6% · Insp 32.3% · Coll 33.1% |
| **Avg / Current fleet** | 13 / 9 |
| **Industry Avg R-Factor** | 0.236 (Fleet Range 8, TRK) |

## Extraction depth — v7 baseline

This folder ships a **baseline** extraction produced by `scripts/bootstrap_extracted.py`. It validates against `schema.json` and faithfully captures **carrier identity** (Part 1) and the **monitoring industry block** (Part 6). Event-list arrays (`convictionDetails`, `cvsaDetails`, `collisionDetails`, `violationDetails`, `monitoring.summary`, `monitoring.details`) are emitted **empty** with totals=0 — full per-event extraction is the **v8** target.

The annotated PDF still highlights every label and every value the parser can recognise, courtesy of the data-driven annotator. A vendor implementing their parser can compare their event-list output against the canonical samples (`Carry_Freight_19_Dec_2018` and `Carrier_Profile_30_Sept_2019`) which DO have full event-list extractions.

## File index

| File | What it is |
|---|---|
| `extracted.json` | Schema-valid baseline extraction (Part 1 + identity + industry block). |
| `annotated.pdf` | Raw PDF with the 7-color overlay applied. |
| `lists/*.csv` | 16 flattened CSV templates (mostly empty pending v8 event extraction). |
