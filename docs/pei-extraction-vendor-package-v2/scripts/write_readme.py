"""Generate a per-pdf README.md from extracted.json."""
from __future__ import annotations
import json
import sys
from pathlib import Path


def card(folder: Path) -> None:
    data = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    src = data["source"]; car = data["carrier"]; pull = data["pull"]
    addr = car.get("address") or {}
    addr_str = ", ".join(filter(None, [addr.get("street"),
                                       addr.get("city"),
                                       addr.get("province"),
                                       addr.get("postalCode")])) or "—"
    total_pts = pull["collisionPoints"] + pull["convictionPoints"] + pull["inspectionPoints"]

    md = f"""# {folder.name}

| Field | Value |
|---|---|
| **NSC #** | {car["nscNumber"]} |
| **Carrier** | {car["legalName"]} |
| **Address** | {addr_str} |
| **Phone** | {car.get("phone") or "—"} |
| **Safety Rating** | {car["safetyRating"]} |
| **Certificate Status** | {car["certificateStatus"]} |
| **Audit Status** | {car["auditStatus"]} |
| **Profile date** | {pull["reportDate"]} |
| **Window** | {pull.get("windowLabel") or "—"} |
| **Active Vehicles (current)** | {pull["currentActiveVehicles"]} |
| **Active Vehicles (last assessment)** | {pull["currentActiveVehiclesAtLastAssessment"]} |
| **Pages** | {src["pageCount"]} |

## Demerit Points

| Source | Points |
|---|---:|
| Collisions   | {pull["collisionPoints"]} |
| Convictions  | {pull["convictionPoints"]} |
| Inspections  | {pull["inspectionPoints"]} |
| **Total**    | **{total_pts}** |

PEI uses Schedule 3 — Max Allowable Points by Fleet Size — to compare totals against an absolute ceiling and a four-zone alert ladder (Advisory 25%, Warning 60%, Interview 85%, Sanction 100%). The frontend computes the percentage and zone from `pull.currentActiveVehicles`; this package does not store thresholds.

## Events

| Section | Count |
|---|---:|
| Inspections | {len(pull["inspections"])} |
| Collisions  | {len(pull["collisions"])} |
| Convictions | {len(pull["convictions"])} |
| Audits      | {len(pull.get("audits", []))} |

## File index

| File | What it is |
|---|---|
| `extracted.json`  | Schema-valid extraction (validator passes 5 cross-field checks) |
| `annotated.pdf`   | Raw PDF with the 7-color region overlay (rectangles drawn at hand-mapped form coordinates — PEI PDFs are scanned, no text layer to highlight) |
| `lists/*.csv`     | Flattened CSVs (inspections, collisions, convictions, audits, pull-summary) |
| `README.md`       | This card |

## Notes

- PEI Carrier Abstract Reports are **scanned image-only PDFs**. There is no text layer for `search_for`-based annotation. Vendors building automated extraction will need an **OCR pipeline** (Tesseract / AWS Textract / Azure Form Recognizer) plus the form-coordinate mapping in `scripts/annotate_pdf.py` to lift values reliably.
- This sample was hand-transcribed by reading the rendered PNG. `source.ocrEngine` is `null` to indicate manual transcription. A vendor's output should set `ocrEngine` to the actual engine + version they used.
- Status codes observed in the Inspections column: **P** = Pass (0 pts), **W** = Warning (0 pts), **M** = minor / OOS-related (3 pts in this sample), **OOS** = Out of Service (3 pts), **F** = Failed.
"""
    (folder / "README.md").write_text(md, encoding="utf-8")
    print(f"Wrote {folder/'README.md'}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: write_readme.py <per-pdf/<name>>\n"); sys.exit(2)
    card(Path(sys.argv[1]))
