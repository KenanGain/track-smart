"""Flatten an extracted.json into per-list CSV files in <folder>/lists/.

Usage:
    python scripts/emit_csvs.py per-pdf/Carrier_Profile_18_Nov_2020
"""
from __future__ import annotations
import csv
import json
import sys
from pathlib import Path


def write(path, rows, cols):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: ("" if r.get(c) is None else r.get(c)) for c in cols})


def emit(folder: Path):
    data = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    pull = data["pull"]
    lists = folder / "lists"

    write(lists / "inspections.csv", pull["inspections"],
          ["seq", "inspectionDate", "inspectionDateIso", "cvsaLevel",
           "log", "tdg", "loadSecurity", "driverName", "status", "points"])
    write(lists / "collisions.csv", pull["collisions"],
          ["seq", "collisionDate", "collisionDateIso", "severity", "fault",
           "atFault", "vehicles", "killed", "injured", "driverName", "points"])
    write(lists / "convictions.csv", pull["convictions"],
          ["seq", "convictionDate", "convictionDateIso", "charge", "driverName", "points"])
    write(lists / "audits.csv", pull.get("audits", []),
          ["auditDate", "auditDateIso", "result", "auditType"])

    # Pull-level summary (one row)
    write(lists / "pull-summary.csv", [{
        "reportDate": pull["reportDate"],
        "nscNumber": data["carrier"]["nscNumber"],
        "legalName": data["carrier"]["legalName"],
        "safetyRating": data["carrier"]["safetyRating"],
        "collisionPoints": pull["collisionPoints"],
        "convictionPoints": pull["convictionPoints"],
        "inspectionPoints": pull["inspectionPoints"],
        "totalPoints": pull["collisionPoints"] + pull["convictionPoints"] + pull["inspectionPoints"],
        "currentActiveVehicles": pull["currentActiveVehicles"],
        "currentActiveVehiclesAtLastAssessment": pull["currentActiveVehiclesAtLastAssessment"],
    }], ["reportDate", "nscNumber", "legalName", "safetyRating",
         "collisionPoints", "convictionPoints", "inspectionPoints", "totalPoints",
         "currentActiveVehicles", "currentActiveVehiclesAtLastAssessment"])

    print(f"Wrote {len(list(lists.glob('*.csv')))} CSVs to {lists}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: emit_csvs.py <per-pdf/<name>>\n"); sys.exit(2)
    emit(Path(sys.argv[1]))
