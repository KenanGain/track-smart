"""Flatten an extracted.json into per-list CSV files in <folder>/lists/.

Usage:
    python scripts/emit_csvs.py per-pdf/Carry_Freight_19_Dec_2018
"""
from __future__ import annotations
import csv
import json
import os
import sys
from pathlib import Path


def write(path: Path, rows: list[dict], cols: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow({c: ("" if r.get(c) is None else r.get(c)) for c in cols})


def emit(folder: Path) -> None:
    data = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    pull = data["pull"]
    lists = folder / "lists"

    write(lists / "conviction-analysis.csv", pull["convictionAnalysis"],
          ["group", "count", "pctText"])
    write(lists / "conviction-summary.csv", pull["convictionSummary"],
          ["seq", "date", "dateIso", "document", "docket", "jurisdiction", "vehicle", "driverName", "offence", "points"])
    write(lists / "conviction-details.csv", pull["convictionDetails"],
          ["seq", "date", "dateIso", "time", "document", "docket", "jurisdiction", "dateEntered",
           "issuingAgency", "location", "driver", "vehicle", "commodity",
           "actSection", "offence", "ccmtaCode", "convictionVehicle", "convictionDate", "activePoints"])

    write(lists / "cvsa-defect-analysis.csv", pull["cvsaDefectAnalysis"],
          ["code", "label", "oos", "req", "total", "pctText"])
    write(lists / "cvsa-summary.csv", pull["cvsaSummary"],
          ["seq", "date", "dateIso", "document", "jurisdiction", "agency", "plate", "plateJur", "level", "result"])

    cvsa_details_flat = [
        {
            "seq": rec["seq"],
            "date": rec["date"],
            "dateIso": rec["dateIso"],
            "time": rec["time"],
            "document": rec["document"],
            "jurisdiction": rec["jurisdiction"],
            "level": rec["level"],
            "result": rec["result"],
            "dateEntered": rec["dateEntered"],
            "agency": rec["agency"],
            "location": rec["location"],
            "driver": rec["driver"],
            "vehicleCount": len(rec.get("vehicles", [])),
            "defectCount": len(rec.get("defects", [])),
            "oosDefectCount": sum(1 for d in rec.get("defects", []) if d["kind"] == "OOS"),
            "reqDefectCount": sum(1 for d in rec.get("defects", []) if d["kind"] == "REQ"),
        }
        for rec in pull["cvsaDetails"]
    ]
    write(lists / "cvsa-details.csv", cvsa_details_flat,
          ["seq", "date", "dateIso", "time", "document", "jurisdiction", "level", "result", "dateEntered",
           "agency", "location", "driver", "vehicleCount", "defectCount", "oosDefectCount", "reqDefectCount"])

    cvsa_defect_rows = []
    for rec in pull["cvsaDetails"]:
        vehicles = rec.get("vehicles", [])
        for d in rec.get("defects", []):
            v = vehicles[d["vehicleIndex"] - 1] if d["vehicleIndex"] - 1 < len(vehicles) else {}
            cvsa_defect_rows.append({
                "inspectionSeq": rec["seq"],
                "inspectionDate": rec["date"],
                "category": d["category"],
                "kind": d["kind"],
                "vehicleIndex": d["vehicleIndex"],
                "vehicleType": v.get("type"),
                "vehiclePlate": v.get("plate"),
                "vehicleJur": v.get("jurisdiction"),
            })
    write(lists / "cvsa-defect-rows.csv", cvsa_defect_rows,
          ["inspectionSeq", "inspectionDate", "category", "kind",
           "vehicleIndex", "vehicleType", "vehiclePlate", "vehicleJur"])

    write(lists / "collision-totals.csv", pull["collisionTotals"],
          ["type", "count", "nonPreventable", "preventableOrNotEvaluated", "points"])
    write(lists / "collision-summary.csv", pull["collisionSummary"],
          ["seq", "date", "dateIso", "document", "jurisdiction", "plate", "plateJur",
           "driver", "status", "preventable", "severity", "points"])
    write(lists / "collision-details.csv", pull["collisionDetails"],
          ["seq", "date", "dateIso", "time", "document", "jurisdiction", "plate", "plateJur",
           "severity", "assessment", "driver", "location", "vehicle", "vin", "activePoints"])

    write(lists / "violation-analysis.csv", pull["violationAnalysis"],
          ["group", "count", "pctText"])
    write(lists / "violation-summary.csv", pull["violationSummary"],
          ["seq", "date", "dateIso", "document", "jurisdiction", "plate", "plateJur",
           "driverName", "offence"])

    viol_details_flat = [
        {
            "seq": r["seq"],
            "date": r["date"],
            "dateIso": r["dateIso"],
            "time": r["time"],
            "document": r["document"],
            "jurisdiction": r["jurisdiction"],
            "dateEntered": r["dateEntered"],
            "issuingAgency": r["issuingAgency"],
            "location": r["location"],
            "driver": r["driver"],
            "vehicle": r["vehicle"],
            "commodity": r["commodity"],
            "offenceCount": len(r.get("offences", [])),
        }
        for r in pull["violationDetails"]
    ]
    write(lists / "violation-details.csv", viol_details_flat,
          ["seq", "date", "dateIso", "time", "document", "jurisdiction", "dateEntered",
           "issuingAgency", "location", "driver", "vehicle", "commodity", "offenceCount"])

    viol_offences = []
    for r in pull["violationDetails"]:
        for off in r.get("offences", []):
            viol_offences.append({
                "violationSeq": r["seq"],
                "violationDate": r["date"],
                "num": off["num"],
                "actSection": off["actSection"],
                "actDesc": off["actDesc"],
                "ccmtaCode": off["ccmtaCode"],
                "ccmtaLabel": off["ccmtaLabel"],
                "vehicle": off["vehicle"],
                "text": off["text"],
            })
    write(lists / "violation-offences.csv", viol_offences,
          ["violationSeq", "violationDate", "num", "actSection", "actDesc",
           "ccmtaCode", "ccmtaLabel", "vehicle", "text"])

    write(lists / "monitoring-summary.csv", pull["monitoring"]["summary"],
          ["monthEnd", "monthEndIso", "type", "trkPct", "busPct", "avgFleet", "currentFleet",
           "score", "scoreText", "convPctText", "inspPctText", "collPctText", "stage"])
    write(lists / "monitoring-details.csv", pull["monitoring"]["details"],
          ["monthEnd", "monthEndIso", "avgFleet", "convPtsPerVeh", "totalInspections",
           "oosDefPerInsp", "totalDefPerInsp", "oosPctText", "oosPerVeh", "failureRate", "collPtsPerVeh"])

    print(f"Wrote {len(list(lists.glob('*.csv')))} CSVs to {lists}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.stderr.write("usage: emit_csvs.py <per-pdf/<name>>\n"); sys.exit(2)
    emit(Path(sys.argv[1]))
