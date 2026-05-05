# Carrier_Profile_6_Mar_2026

| Field | Value |
|---|---|
| **NSC #** | AB332-6832 |
| **MVID #** | 0977-51432 |
| **Carrier** | Mile2mile Trucking Ltd |
| **Address** | Edmonton T6T 1S5 |
| **Profile period** | 2024-03-01 → 2026-03-06 |
| **Date printed** | 2026-03-06 |
| **12-mo report as of** | 2026-03-06 |
| **Pages** | 43 |
| **Format** | Newer 'Page X of Y' layout |
| **Safety Fitness** | Satisfactory Unaudited |
| **Operating Status** | Federal |
| **Fleet Range / Type** | 1 / Truck |
| **Certificate Number** | — |
| **Cert. Effective Date** | — |
| **Cert. Expiry Date** | — |
| **R-Factor Score** | 0.138 |
| **Contributions** | Conv 0.0% · Insp 100.0% · Coll 0.0% |
| **Avg / Current fleet** | 2 / 2 |
| **Industry Avg R-Factor** | 0.292 (Fleet Range 1, TRK) |

## Extraction depth — v7 baseline

This folder ships a **baseline** extraction produced by `scripts/bootstrap_extracted.py`. It validates against `schema.json` and faithfully captures **carrier identity** (Part 1) and the **monitoring industry block** (Part 6). Event-list arrays (`convictionDetails`, `cvsaDetails`, `collisionDetails`, `violationDetails`, `monitoring.summary`, `monitoring.details`) are emitted **empty** with totals=0 — full per-event extraction is the **v8** target.

The annotated PDF still highlights every label and every value the parser can recognise, courtesy of the data-driven annotator. A vendor implementing their parser can compare their event-list output against the canonical samples (`Carry_Freight_19_Dec_2018` and `Carrier_Profile_30_Sept_2019`) which DO have full event-list extractions.

## File index

| File | What it is |
|---|---|
| `extracted.json` | Schema-valid baseline extraction (Part 1 + identity + industry block). |
| `annotated.pdf` | Raw PDF with the 7-color overlay applied. |
| `lists/*.csv` | 16 flattened CSV templates (mostly empty pending v8 event extraction). |
