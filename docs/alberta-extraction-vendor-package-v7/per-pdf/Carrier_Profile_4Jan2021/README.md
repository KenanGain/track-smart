# Carrier_Profile_4Jan2021

| Field | Value |
|---|---|
| **NSC #** | AB243-8992 |
| **MVID #** | 0854-32599 |
| **Carrier** | CARRIER PROFILE
CARRIER INFORMATION
Carry Freight Ltd. |
| **Address** | Calgary T3J 5H3 |
| **Profile period** | 2019-01-05 → 2021-01-04 |
| **Date printed** | 2021-01-04 |
| **12-mo report as of** | 2021-01-04 |
| **Pages** | 87 |
| **Format** | Newer 'Page X of Y' layout |
| **Safety Fitness** | Satisfactory Unaudited |
| **Operating Status** | Federal |
| **Fleet Range / Type** | 11 / Truck |
| **Certificate Number** | — |
| **Cert. Effective Date** | — |
| **Cert. Expiry Date** | — |
| **R-Factor Score** | 1.575 |
| **Contributions** | Conv 76.0% · Insp 1.3% · Coll 22.7% |
| **Avg / Current fleet** | 11 / 10 |
| **Industry Avg R-Factor** | 0.193 (Fleet Range 11, TRK) |

## Extraction depth — v7 baseline

This folder ships a **baseline** extraction produced by `scripts/bootstrap_extracted.py`. It validates against `schema.json` and faithfully captures **carrier identity** (Part 1) and the **monitoring industry block** (Part 6). Event-list arrays (`convictionDetails`, `cvsaDetails`, `collisionDetails`, `violationDetails`, `monitoring.summary`, `monitoring.details`) are emitted **empty** with totals=0 — full per-event extraction is the **v8** target.

The annotated PDF still highlights every label and every value the parser can recognise, courtesy of the data-driven annotator. A vendor implementing their parser can compare their event-list output against the canonical samples (`Carry_Freight_19_Dec_2018` and `Carrier_Profile_30_Sept_2019`) which DO have full event-list extractions.

## File index

| File | What it is |
|---|---|
| `extracted.json` | Schema-valid baseline extraction (Part 1 + identity + industry block). |
| `annotated.pdf` | Raw PDF with the 7-color overlay applied. |
| `lists/*.csv` | 16 flattened CSV templates (mostly empty pending v8 event extraction). |
