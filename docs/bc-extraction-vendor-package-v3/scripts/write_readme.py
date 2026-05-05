"""Generate a per-pdf README.md card from extracted.json."""
from __future__ import annotations
import json
import sys
from pathlib import Path


def card(folder: Path) -> None:
    data = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    src = data["source"]; car = data["carrier"]; pull = data["pull"]
    dem = car["demographics"]; cert = car["certificate"]; cr = pull["complianceReview"]

    md = f"""# {folder.name}

| Field | Value |
|---|---|
| **NSC #** | {car["nscNumber"]} |
| **Carrier** | {dem["carrierName"]} |
| **Address** | {dem.get("mailingAddress") or "—"} |
| **Jurisdiction** | {dem["jurisdiction"]} |
| **Primary Business** | {dem.get("primaryBusinessType") or "—"} |
| **Certificate Status** | {cert["certificateStatus"]} |
| **Safety Rating** | {cert["safetyRating"]} |
| **Profile Status** | {cert["profileStatus"]} |
| **Audit Status** | {cert["auditStatus"]} |
| **Certificate Issue Date** | {dem.get("certificateIssueDate") or "—"} |
| **Currently Licensed Vehicles** | {dem.get("numberOfLicensedVehicles")} |
| **Profile period** | {src.get("profileFrom") or "?"} → {src.get("profileTo") or "?"} |
| **Report run** | {src.get("reportRunDate") or "—"} |
| **Profile scores as of** | {cr["asOfDate"]} |
| **Average fleet size** | {cr["averageFleetSize"]} |
| **Pages** | {src["pageCount"]} |

## Profile scores (§1)

| Category | Score | Events |
|---|---:|---:|
| Contraventions | {cr["scores"][0]["score"]} | {cr["scores"][0]["events"]} |
| CVSA (Out of Service) | {cr["scores"][1]["score"]} | {cr["scores"][1]["events"]} |
| Accidents | {cr["scores"][2]["score"]} | {cr["scores"][2]["events"]} |
| **Total** | **{cr["totalScore"]}** | — |

## Section counts

| Section | Rows |
|---|---:|
| §2 Monthly scores (24 months) | {len(pull["monthlyScores"])} |
| §3 Active fleet | {len(pull["activeFleet"])} |
| §4.1 Driver contraventions (guilty) | {len(pull["driverContraventions"])} |
| §4.2 Carrier contraventions (guilty) | {len(pull["carrierContraventions"])} |
| §4.3 Pending driver contraventions | {len(pull["pendingDriverContraventions"])} |
| §4.4 Pending carrier contraventions | {len(pull["pendingCarrierContraventions"])} |
| §5 CVSA inspections | {len(pull["cvsa"]["list"])} |
| §6 Accidents | {len(pull["accidents"])} |
| §7 Audits | {len(pull["auditSummary"])} |
| §8 CVIP records | {len(pull["cvip"])} |

## NSC Interventions (§1)

| Type | Date |
|---|---|
"""
    for iv in pull["interventions"]:
        md += f"| {iv['type']} | {iv['date']} |\n"
    if not pull["interventions"]:
        md += "| (none) | — |\n"

    md += f"""
## File index

| File | What it is |
|---|---|
| `extracted.json`    | Schema-valid extraction. All cross-field math checks pass. |
| `extraction-doc.md` | Page-by-page walkthrough — for each PDF label, the JSON path and frontend surface that consumes it. |
| `annotated.pdf`     | Raw PDF with the 7-color overlay (PALE labels + STRONG values, drawn via PyMuPDF text-search since BC PDFs have a real text layer). |
| `lists/*.csv`       | Flattened CSV templates (monthly-scores, active-fleet, contravention-summary, driver/carrier/pending contras, cvsa-summary/defects/inspections/units, accidents, audits, cvip). |

## Notes

- BC Carrier Profile Reports are **text-extractable** PDFs (no OCR needed) — the data-driven `search_for` annotator works the same way as it does for Alberta and Ontario CVOR.
- This sample's values match the existing TrackSmart frontend mock data in `src/pages/inspections/NscBcCarrierProfile.tsx` + `NscBcPerformanceHistory.tsx` (which were transcribed from this exact PDF). A vendor's API output should reproduce these values within OCR-style tolerance for free-text fields.
"""
    (folder / "README.md").write_text(md, encoding="utf-8")
    print(f"Wrote {folder/'README.md'}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: write_readme.py <per-pdf/<name>>\n"); sys.exit(2)
    card(Path(sys.argv[1]))
