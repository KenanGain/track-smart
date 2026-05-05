# Carrier_Profile_09_Jan_2020

| Field | Value |
|---|---|
| **NSC #** | AB243-8992 |
| **MVID #** | — |
| **Carrier** | Carry Freight Ltd. |
| **Address** | 320-3770 Westwinds Dr NE Calgary AB T3J 5H3 |
| **Profile period** | ? → ? |
| **Date printed** | 2020-01-09 |
| **12-mo report as of** | — |
| **Pages** | 45 |
| **Format** | Older multi-column layout |
| **Safety Fitness** | Satisfactory Unaudited |
| **Operating Status** | — |
| **Fleet Range / Type** | 11 / — |
| **Certificate Number** | — |
| **Cert. Effective Date** | — |
| **Cert. Expiry Date** | — |
| **R-Factor Score** | 0.364 |
| **Contributions** | Conv 0.0% · Insp 0.0% · Coll 0.0% |
| **Avg / Current fleet** | 0 / 0 |
| **Industry Avg R-Factor** | 0.364 (Fleet Range 11, TRK) |

## Extraction depth — v7 baseline

This folder ships a **baseline** extraction produced by `scripts/bootstrap_extracted.py`. It validates against `schema.json` and faithfully captures **carrier identity** (Part 1) and the **monitoring industry block** (Part 6). Event-list arrays (`convictionDetails`, `cvsaDetails`, `collisionDetails`, `violationDetails`, `monitoring.summary`, `monitoring.details`) are emitted **empty** with totals=0 — full per-event extraction is the **v8** target.

The annotated PDF still highlights every label and every value the parser can recognise, courtesy of the data-driven annotator. A vendor implementing their parser can compare their event-list output against the canonical samples (`Carry_Freight_19_Dec_2018` and `Carrier_Profile_30_Sept_2019`) which DO have full event-list extractions.

## File index

| File | What it is |
|---|---|
| `extracted.json` | Schema-valid baseline extraction (Part 1 + identity + industry block). |
| `annotated.pdf` | Raw PDF with the 7-color overlay applied. |
| `lists/*.csv` | 16 flattened CSV templates (mostly empty pending v8 event extraction). |
