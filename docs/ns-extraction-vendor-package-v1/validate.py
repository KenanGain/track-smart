"""Validate every per-pdf/<name>/extracted.json under this package.

Runs:
  1. JSON-Schema Draft-07 validation against schema.json
  2. 10 cross-field math + consistency checks specific to NS reports

Exit code 0 when every per-pdf folder is OK.

Usage (from package root):
    python validate.py
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

import jsonschema

PKG = Path(__file__).resolve().parent
SCHEMA = json.loads((PKG / "schema.json").read_text(encoding="utf-8"))


def cross_field_checks(data: dict) -> list[str]:
    msgs: list[str] = []
    car  = data["carrier"]
    pull = data["pull"]
    src  = data["source"]

    # 2. Total demerit = sum of three components (±0.0001)
    s = pull["scores"]
    derived = round(s["convictions"] + s["inspections"] + s["collisions"], 4)
    if abs(derived - s["totalDemerit"]) > 0.0001:
        msgs.append(
            f"scores.totalDemerit={s['totalDemerit']} != convictions+inspections+collisions={derived}"
        )

    # 3. cvsaTotals.records == len(cvsaInspections)
    insp = pull["cvsaInspections"]
    if pull["cvsaTotals"]["records"] != len(insp):
        msgs.append(
            f"cvsaTotals.records={pull['cvsaTotals']['records']} != len(cvsaInspections)={len(insp)}"
        )

    # 4. cvsaTotals.demeritPts == Σ cvsaInspections[].demeritPts
    pts_sum = sum(r["demeritPts"] for r in insp)
    if pull["cvsaTotals"]["demeritPts"] != pts_sum:
        msgs.append(
            f"cvsaTotals.demeritPts={pull['cvsaTotals']['demeritPts']} != Σdemeritpts={pts_sum}"
        )

    # 5. CVSA result==Out-of-Service ↔ demeritPts==3
    for r in insp:
        if r["result"] == "Out-of-Service" and r["demeritPts"] != 3:
            msgs.append(
                f"CVSA seq={r['seq']} ({r['cvsaNumber']}) is Out-of-Service but demeritPts={r['demeritPts']} (expected 3)"
            )

    # 6. CVSA result!=Out-of-Service → demeritPts==0
    for r in insp:
        if r["result"] != "Out-of-Service" and r["demeritPts"] != 0:
            msgs.append(
                f"CVSA seq={r['seq']} ({r['cvsaNumber']}) result={r['result']} but demeritPts={r['demeritPts']} (expected 0)"
            )

    # 7. warningTotals.records == len(warningTickets)
    if pull["warningTotals"]["records"] != len(pull["warningTickets"]):
        msgs.append(
            f"warningTotals.records={pull['warningTotals']['records']} != len(warningTickets)={len(pull['warningTickets'])}"
        )

    # 8. Threshold ordering: level1 < level2 < level3
    t = pull["thresholds"]
    if not (t["level1"] < t["level2"] < t["level3"]):
        msgs.append(
            f"thresholds out of order: level1={t['level1']} level2={t['level2']} level3={t['level3']}"
        )

    # 9. profileAsOf consistency between source and pull
    if src["profileAsOf"] != pull["asOfDate"]:
        msgs.append(
            f"source.profileAsOf={src['profileAsOf']} != pull.asOfDate={pull['asOfDate']}"
        )

    # 10. CVSA seq numbers are 1..N contiguous
    seqs = [r["seq"] for r in insp]
    if seqs and seqs != list(range(1, len(seqs) + 1)):
        msgs.append(
            f"cvsaInspections[].seq is not 1..{len(seqs)} contiguous (got {seqs[:3]}...{seqs[-3:]})"
        )

    return msgs


def main() -> int:
    rc = 0
    folders = sorted((PKG / "per-pdf").glob("*/"))
    okay = 0
    for folder in folders:
        ext = folder / "extracted.json"
        if not ext.exists():
            continue
        try:
            data = json.loads(ext.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"FAIL [{folder.name}]: cannot parse JSON: {e}")
            rc = 1
            continue
        # 1. Schema
        try:
            jsonschema.validate(data, SCHEMA)
        except jsonschema.ValidationError as e:
            print(f"[{folder.name}] SCHEMA: {e.message} at {list(e.path)}")
            rc = 1
            continue
        # 2-10. Cross-field
        msgs = cross_field_checks(data)
        if msgs:
            print(f"FAIL [{folder.name}]:")
            for m in msgs:
                print(f"  - {m}")
            rc = 1
        else:
            print(f"OK [{folder.name}]")
            okay += 1

    total = sum(1 for _ in folders if (PKG / "per-pdf" / _.name / "extracted.json").exists())
    print(f"\n{okay}/{total} OK")
    return rc


if __name__ == "__main__":
    sys.exit(main())
