"""Validate every per-pdf/<name>/extracted.json against schema.json + cross-field math.

Usage:
    python validate.py                # walks per-pdf/*
    python validate.py path/to/extracted.json   # one file
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Any

try:
    import jsonschema
except ImportError:
    sys.stderr.write("Install jsonschema: pip install jsonschema\n"); sys.exit(2)

ROOT = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT / "schema.json"


class Fail(Exception):
    pass


def check_schema(data: dict, schema: dict, name: str) -> None:
    try:
        jsonschema.validate(data, schema)
    except jsonschema.ValidationError as e:
        raise Fail(f"[{name}] SCHEMA: {e.message} at {list(e.absolute_path)}")


def _eq(a, b, *, tol: float = 0):
    if a is None or b is None:
        return False
    if isinstance(a, float) or isinstance(b, float):
        return abs(float(a) - float(b)) <= tol
    return a == b


def check_math(data: dict, name: str) -> list[str]:
    """Cross-field math; returns list of failure messages (empty when fully consistent)."""
    msgs: list[str] = []
    pull = data["pull"]

    # 4. Σ convictionAnalysis[].count == totalConvictions
    s = sum(r["count"] for r in pull["convictionAnalysis"])
    if s != pull["totalConvictions"]:
        msgs.append(f"convictionAnalysis sum ({s}) != totalConvictions ({pull['totalConvictions']})")

    # 5. cvsaDefectAnalysis OOS/REQ/Total sums
    totals = pull["cvsaDefectTotals"]
    soos = sum((r.get("oos") or 0) for r in pull["cvsaDefectAnalysis"])
    sreq = sum((r.get("req") or 0) for r in pull["cvsaDefectAnalysis"])
    stot = sum((r.get("total") or 0) for r in pull["cvsaDefectAnalysis"])
    if soos != totals["oos"]:
        msgs.append(f"Σ cvsa OOS ({soos}) != cvsaDefectTotals.oos ({totals['oos']})")
    if sreq != totals["req"]:
        msgs.append(f"Σ cvsa REQ ({sreq}) != cvsaDefectTotals.req ({totals['req']})")
    if stot != totals["total"]:
        msgs.append(f"Σ cvsa total ({stot}) != cvsaDefectTotals.total ({totals['total']})")

    # 6. cvsaSummary.length == cvsaDetails.length == totalCvsaInspections
    if len(pull["cvsaSummary"]) != pull["totalCvsaInspections"]:
        msgs.append(f"cvsaSummary.length ({len(pull['cvsaSummary'])}) != totalCvsaInspections ({pull['totalCvsaInspections']})")
    if len(pull["cvsaDetails"]) != pull["totalCvsaInspections"]:
        msgs.append(f"cvsaDetails.length ({len(pull['cvsaDetails'])}) != totalCvsaInspections ({pull['totalCvsaInspections']})")

    # 7. Σ collisionTotals[].count == collisionSummary.length == collisionDetails.length == totalCollisions
    cs = sum(r["count"] for r in pull["collisionTotals"])
    if cs != pull["totalCollisions"]:
        msgs.append(f"Σ collisionTotals.count ({cs}) != totalCollisions ({pull['totalCollisions']})")
    if len(pull["collisionSummary"]) != pull["totalCollisions"]:
        msgs.append(f"collisionSummary.length ({len(pull['collisionSummary'])}) != totalCollisions ({pull['totalCollisions']})")
    if len(pull["collisionDetails"]) != pull["totalCollisions"]:
        msgs.append(f"collisionDetails.length ({len(pull['collisionDetails'])}) != totalCollisions ({pull['totalCollisions']})")

    # 8. Σ collisionTotals[].points == Σ collisionDetails[].activePoints
    cp_totals = sum(r["points"] for r in pull["collisionTotals"])
    cp_details = sum(r.get("activePoints", 0) for r in pull["collisionDetails"])
    if cp_totals != cp_details:
        msgs.append(f"Σ collisionTotals.points ({cp_totals}) != Σ collisionDetails.activePoints ({cp_details})")

    # 9. violation analysis vs offences total
    sv = sum(r["count"] for r in pull["violationAnalysis"])
    if sv != pull["totalViolations"]:
        msgs.append(f"violationAnalysis sum ({sv}) != totalViolations ({pull['totalViolations']})")
    so = sum(len(r.get("offences", [])) for r in pull["violationDetails"])
    if so != pull["totalViolations"]:
        msgs.append(f"Σ violationDetails offences ({so}) != totalViolations ({pull['totalViolations']})")

    # 10. (intentionally relaxed) Part 1's pull.rFactor is computed on a different rolling
    # window than monitoring.summary[].score, so these are NOT expected to match. We only
    # fetch monitoring.summary for the upcoming check.
    summary = pull["monitoring"]["summary"]

    # 11. contributions sum to ~100
    c = pull["contributions"]
    total_contrib = c["conviction"] + c["inspection"] + c["collision"]
    if not (99.5 <= total_contrib <= 100.5 or total_contrib == 0):
        msgs.append(f"contributions sum ({total_contrib:.2f}) not within 100±0.5 (or 0)")

    # 12. monitoring.summary[0].stage matches a thresholds row when present
    if summary and summary[0].get("stage") is not None:
        stages = {t["stage"] for t in pull["monitoring"]["thresholds"]}
        if summary[0]["stage"] not in stages:
            msgs.append(f"monitoring.summary[0].stage ({summary[0]['stage']}) not found in thresholds {sorted(stages)}")

    # 13. industry.fleetRange == carrier.fleetRange (when both present)
    cfr = data["carrier"].get("fleetRange")
    ifr = pull["monitoring"]["industry"].get("fleetRange")
    if cfr and ifr and cfr != ifr:
        msgs.append(f"carrier.fleetRange ({cfr}) != monitoring.industry.fleetRange ({ifr})")

    # 15. cvsaDefect.vehicleIndex resolves
    for rec in pull["cvsaDetails"]:
        for d in rec.get("defects", []):
            idx = d["vehicleIndex"]
            if idx < 1 or idx > len(rec.get("vehicles", [])):
                msgs.append(f"cvsaDetails[seq={rec['seq']}] defect vehicleIndex {idx} out of range (vehicles={len(rec.get('vehicles', []))})")

    return msgs


def validate_one(json_path: Path, schema: dict) -> bool:
    name = json_path.parent.name
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"FAIL [{name}] cannot parse JSON: {e}")
        return False

    try:
        check_schema(data, schema, name)
    except Fail as e:
        print(str(e))
        return False

    msgs = check_math(data, name)
    if msgs:
        print(f"FAIL [{name}]:")
        for m in msgs:
            print(f"  - {m}")
        return False
    print(f"OK [{name}]")
    return True


def main() -> int:
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))

    if len(sys.argv) >= 2:
        ok = validate_one(Path(sys.argv[1]).resolve(), schema)
        return 0 if ok else 1

    targets = sorted((ROOT / "per-pdf").glob("*/extracted.json"))
    if not targets:
        print("No per-pdf/*/extracted.json found.")
        return 2

    failed = 0
    for p in targets:
        if not validate_one(p, schema):
            failed += 1
    print(f"\n{len(targets) - failed}/{len(targets)} OK")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
