"""Flatten an extracted.json into per-list CSVs in <folder>/lists/.

Usage:
    python scripts/emit_csvs.py per-pdf/Inertia_Carrier_2025-04-17
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

    write(lists / "monthly-scores.csv", pull["monthlyScores"],
          ["month", "vd", "ad", "avg", "contra", "cvsa", "acc", "total"])
    write(lists / "active-fleet.csv", pull["activeFleet"],
          ["regi", "plate", "year", "make", "owner", "gvw"])
    write(lists / "contravention-summary.csv", pull["contraventionSummary"],
          ["group", "code", "violations", "violationsPct", "activePoints", "activePointsPct"])
    write(lists / "driver-contraventions.csv", pull["driverContraventions"],
          ["driverName", "dl", "dlJur", "date", "time", "ticket", "plate", "plateJur",
           "location", "juris", "dispDate", "act", "section", "desc", "equiv", "pts"])
    write(lists / "carrier-contraventions.csv", pull["carrierContraventions"],
          ["date", "time", "ticket", "plate", "plateJur", "location", "juris",
           "dispDate", "act", "section", "desc", "equiv", "pts"])
    write(lists / "pending-driver-contraventions.csv", pull["pendingDriverContraventions"],
          ["driverName", "dl", "dlJur", "cls", "status", "date", "time", "ticket",
           "plate", "plateJur", "location", "juris", "act", "section", "desc", "equiv"])
    write(lists / "pending-carrier-contraventions.csv", pull["pendingCarrierContraventions"],
          ["status", "date", "time", "ticket", "plate", "plateJur", "location", "juris",
           "act", "section", "desc", "equiv"])

    write(lists / "cvsa-summary.csv", pull["cvsa"]["summary"],
          ["inspectionType", "count", "oos", "fail", "pass"])
    write(lists / "cvsa-defects.csv", pull["cvsa"]["defectBreakdown"],
          ["code", "label", "oos", "oosPct", "fail", "failPct", "totalDefects", "totalPct"])

    cvsa_list_flat = []
    for r in pull["cvsa"]["list"]:
        cvsa_list_flat.append({
            "date": r["date"], "time": r.get("time"),
            "doc": r["doc"], "location": r.get("location"), "jur": r.get("jur"),
            "level": r["level"], "result": r["result"], "pts": r.get("pts"),
            "driverName": r.get("driverName"),
            "dl": r.get("dl"), "dlJur": r.get("dlJur"),
            "unitsCount": len(r.get("units", [])),
        })
    write(lists / "cvsa-inspections.csv", cvsa_list_flat,
          ["date", "time", "doc", "location", "jur", "level", "result", "pts",
           "driverName", "dl", "dlJur", "unitsCount"])

    cvsa_units = []
    for r in pull["cvsa"]["list"]:
        for u in r.get("units", []):
            cvsa_units.append({
                "inspectionDate": r["date"],
                "inspectionDoc": r["doc"],
                "kind": u["kind"], "plate": u["plate"], "plateJur": u["plateJur"],
                "regi": u.get("regi"), "desc": u.get("desc"),
                "result": u["result"], "defect": u.get("defect"),
            })
    write(lists / "cvsa-units.csv", cvsa_units,
          ["inspectionDate", "inspectionDoc", "kind", "plate", "plateJur",
           "regi", "desc", "result", "defect"])

    write(lists / "accidents.csv", pull["accidents"],
          ["date", "time", "report", "location", "jur", "driverName", "dl", "dlJur",
           "plate", "plateJur", "regi", "vehDesc", "type", "fault", "charges", "pts"])
    write(lists / "audits.csv", pull["auditSummary"],
          ["auditDate", "result", "auditType"])
    write(lists / "cvip.csv", pull["cvip"],
          ["regi", "plate", "vehicle", "date", "type", "facility",
           "confirmation", "decal", "expiry", "result"])

    print(f"Wrote {len(list(lists.glob('*.csv')))} CSVs to {lists}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: emit_csvs.py <per-pdf/<name>>\n"); sys.exit(2)
    emit(Path(sys.argv[1]))
