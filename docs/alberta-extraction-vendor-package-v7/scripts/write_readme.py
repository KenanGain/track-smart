"""Generate a per-pdf/<name>/README.md card from the bootstrapped extracted.json."""
from __future__ import annotations
import json
import sys
from pathlib import Path


def card(folder: Path) -> None:
    data = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    src = data["source"]; car = data["carrier"]; pull = data["pull"]
    addr = car.get("address") or {}
    addr_str = " ".join(filter(None, [addr.get("street"), addr.get("city"),
                                       addr.get("province"), addr.get("postalCode")])) or "—"
    contrib = pull.get("contributions") or {}
    fmt = src.get("formVersion") or "older"
    fmt_label = "Newer 'Page X of Y' layout" if fmt == "newer" else "Older multi-column layout"

    md = f"""# {folder.name}

| Field | Value |
|---|---|
| **NSC #** | {car.get("nscNumber") or "—"} |
| **MVID #** | {car.get("mvidNumber") or "—"} |
| **Carrier** | {car.get("legalName") or "—"} |
| **Address** | {addr_str} |
| **Profile period** | {src.get("profilePeriodStart") or "?"} → {src.get("profilePeriodEnd") or "?"} |
| **Date printed** | {src.get("datePrinted") or "—"} |
| **12-mo report as of** | {src.get("twelveMonthReportAs") or "—"} |
| **Pages** | {src.get("pageCount")} |
| **Format** | {fmt_label} |
| **Safety Fitness** | {car.get("safetyFitnessRating") or "—"} |
| **Operating Status** | {car.get("operatingStatus") or "—"} |
| **Fleet Range / Type** | {car.get("fleetRange") or "—"} / {car.get("fleetType") or "—"} |
| **Certificate Number** | {car.get("certificateNumber") or "—"} |
| **Cert. Effective Date** | {car.get("certificateEffectiveDate") or "—"} |
| **Cert. Expiry Date** | {car.get("certificateExpiryDate") or "—"} |
| **R-Factor Score** | {pull.get("rFactor")} |
| **Contributions** | Conv {contrib.get("conviction", 0)}% · Insp {contrib.get("inspection", 0)}% · Coll {contrib.get("collision", 0)}% |
| **Avg / Current fleet** | {pull.get("avgFleet")} / {pull.get("currentFleet")} |
| **Industry Avg R-Factor** | {pull.get("monitoring", {}).get("industry", {}).get("avgRFactor")} (Fleet Range {pull.get("monitoring", {}).get("industry", {}).get("fleetRange")}, {pull.get("monitoring", {}).get("industry", {}).get("fleetType")}) |

## Extraction depth — v7 baseline

This folder ships a **baseline** extraction produced by `scripts/bootstrap_extracted.py`. It validates against `schema.json` and faithfully captures **carrier identity** (Part 1) and the **monitoring industry block** (Part 6). Event-list arrays (`convictionDetails`, `cvsaDetails`, `collisionDetails`, `violationDetails`, `monitoring.summary`, `monitoring.details`) are emitted **empty** with totals=0 — full per-event extraction is the **v8** target.

The annotated PDF still highlights every label and every value the parser can recognise, courtesy of the data-driven annotator. A vendor implementing their parser can compare their event-list output against the canonical samples (`Carry_Freight_19_Dec_2018` and `Carrier_Profile_30_Sept_2019`) which DO have full event-list extractions.

## File index

| File | What it is |
|---|---|
| `extracted.json` | Schema-valid baseline extraction (Part 1 + identity + industry block). |
| `annotated.pdf` | Raw PDF with the 7-color overlay applied. |
| `lists/*.csv` | 16 flattened CSV templates (mostly empty pending v8 event extraction). |
"""
    (folder / "README.md").write_text(md, encoding="utf-8")
    print(f"Wrote {folder/'README.md'}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: write_readme.py <per-pdf/<name>>\n"); sys.exit(2)
    card(Path(sys.argv[1]))
