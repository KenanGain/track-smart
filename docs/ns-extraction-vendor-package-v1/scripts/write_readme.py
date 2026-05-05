"""Generate the per-pdf/<name>/README.md summary card from extracted.json.

Usage (from package root):
    python scripts/write_readme.py per-pdf/<name>/
"""
from __future__ import annotations
import json
import sys
from pathlib import Path


TEMPLATE = """# {carrier_name} — NS Carrier Profile Abstract

| Field | Value |
|---|---|
| NSC # | `{nsc}` |
| Profile As Of | {profileAsOf} |
| Report Run Date | {reportRunDate} |
| Safety Rating | **{safetyRating}** (expires {safetyRatingExpires}) |
| Current Fleet Size | {fleet} |
| Avg. Daily Fleet Size | {avgFleet} |
| Pages | {pageCount} |

## Indexed Demerit Score

| Component | Score |
|---|---|
| Convictions | {scConv:.4f} |
| Inspections | {scInsp:.4f} |
| Collisions | {scColl:.4f} |
| **Total Demerit Score** | **{scTotal:.4f}** |

## Risk Band Thresholds

| Band | Threshold |
|---|---|
| Low | < {l1} |
| Moderate | ≥ {l1} |
| High | ≥ {l2} |
| Critical | ≥ {l3} |

## Counts

| Section | Records |
|---|--:|
| Audit History | {auditCount} |
| CVSA Inspections | {cvsaCount} |
| CVSA Demerit Points (Σ) | {cvsaPts} |
| Convictions | {convCount} |
| Collisions | {collCount} |
| Traffic Offence Reports (Warnings) | {warnCount} |

## Files

- `extracted.json` — schema-valid sample (all {cvsaCount} CVSA rows + {warnCount} warning tickets parsed from the printed PDF)
- `annotated.pdf` — 6-color overlay (PALE labels + STRONG values)
- `extraction-doc.md` — page-by-page label-to-JSON-path map
- `lists/*.csv` — flattened table templates (audit-history, cvsa-inspections, convictions, collisions, warning-tickets)
"""


def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("usage: write_readme.py <per-pdf/<name>/>\n")
        sys.exit(2)
    folder = Path(sys.argv[1]).resolve()
    d = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    car  = d["carrier"]; dem = car["demographics"]; cert = car["certificate"]
    pull = d["pull"]; src = d["source"]; sc = pull["scores"]; t = pull["thresholds"]
    cvsa = pull["cvsaInspections"]
    out = TEMPLATE.format(
        carrier_name=dem["carrierName"],
        nsc=car["nscNumber"],
        profileAsOf=src["profileAsOf"],
        reportRunDate=src["reportRunDate"],
        safetyRating=cert["safetyRating"],
        safetyRatingExpires=cert.get("safetyRatingExpires") or "—",
        fleet=dem["currentFleetSize"],
        avgFleet=dem["avgDailyFleetSize"],
        pageCount=src["pageCount"],
        scConv=sc["convictions"], scInsp=sc["inspections"],
        scColl=sc["collisions"], scTotal=sc["totalDemerit"],
        l1=t["level1"], l2=t["level2"], l3=t["level3"],
        auditCount=len(pull["auditHistory"]),
        cvsaCount=len(cvsa),
        cvsaPts=sum(r["demeritPts"] for r in cvsa),
        convCount=len(pull["convictions"]),
        collCount=len(pull["collisions"]),
        warnCount=len(pull["warningTickets"]),
    )
    (folder / "README.md").write_text(out, encoding="utf-8")
    print(f"Wrote {folder / 'README.md'}")


if __name__ == "__main__":
    main()
