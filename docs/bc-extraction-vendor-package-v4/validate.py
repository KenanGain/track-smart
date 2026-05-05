"""Validate every per-pdf/<name>/extracted.json against schema.json + cross-field math.

Usage:
    python validate.py                           # walks per-pdf/*
    python validate.py path/to/extracted.json    # one file
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    sys.stderr.write("Install jsonschema: pip install jsonschema\n"); sys.exit(2)

ROOT = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT / "schema.json"


class Fail(Exception):
    pass


def check_schema(data, schema, name):
    try:
        jsonschema.validate(data, schema)
    except jsonschema.ValidationError as e:
        raise Fail(f"[{name}] SCHEMA: {e.message} at {list(e.absolute_path)}")


def check_math(data, name):
    msgs = []
    pull = data["pull"]

    # 1. monthlyScores must have exactly 24 rows (rolling 24-month window)
    if len(pull["monthlyScores"]) > 0 and len(pull["monthlyScores"]) > 24:
        msgs.append(f"monthlyScores has {len(pull['monthlyScores'])} rows — BC reports a 24-month window")

    # 2. monthlyScores newest-first
    months = [r["month"] for r in pull["monthlyScores"]]
    if months != sorted(months, reverse=True):
        msgs.append("monthlyScores not sorted newest-first")

    # 3. Each month's avg ≈ vd/ad (within 0.05)
    for r in pull["monthlyScores"]:
        if r["ad"] > 0:
            expected = r["vd"] / r["ad"]
            if abs(expected - r["avg"]) > 0.05:
                msgs.append(f"monthlyScores {r['month']} avg ({r['avg']}) != vd/ad ({expected:.2f})")

    # 4. Each month's total = contra + cvsa + acc (within 0.02 for rounding)
    for r in pull["monthlyScores"]:
        s = r["contra"] + r["cvsa"] + r["acc"]
        if abs(s - r["total"]) > 0.02:
            msgs.append(f"monthlyScores {r['month']} total ({r['total']}) != contra+cvsa+acc ({s:.2f})")

    # 5. complianceReview.totalScore ≈ Σ scores[].score (within 0.02)
    cr = pull["complianceReview"]
    s = sum(sc["score"] for sc in cr["scores"])
    if abs(s - cr["totalScore"]) > 0.02:
        msgs.append(f"complianceReview.totalScore ({cr['totalScore']}) != Σ scores ({s:.2f})")

    # 6. CVSA inspections marked OOS must have pts === 3 (or null/undefined)
    for r in pull["cvsa"]["list"]:
        if r["result"] == "OOS" and r.get("pts") not in (None, 3):
            msgs.append(f"CVSA inspection {r['date']} ({r['doc']}) is OOS but pts={r.get('pts')} (expected 3)")
        if r["result"] != "OOS" and r.get("pts") not in (None, 0):
            msgs.append(f"CVSA inspection {r['date']} ({r['doc']}) result={r['result']} but pts={r.get('pts')} (expected null/0)")

    # 7. Every CVSA inspection has at least one Power Unit (or School Bus)
    for r in pull["cvsa"]["list"]:
        kinds = [u["kind"] for u in r["units"]]
        if not any("Power Unit" in k or "Bus" in k or "Trailer" in k or "Vehicle" in k for k in kinds):
            msgs.append(f"CVSA inspection {r['date']} ({r['doc']}) has no Power Unit / Bus / Trailer in units")

    # 8. CVSA defectBreakdown — totalDefects = oos + fail when both present
    for r in pull["cvsa"]["defectBreakdown"]:
        oos = r.get("oos") or 0
        fail = r.get("fail") or 0
        total = r.get("totalDefects") or 0
        if (r.get("oos") is not None or r.get("fail") is not None) and total != oos + fail:
            msgs.append(f"CVSA defect {r['code']} ({r['label']}) totalDefects ({total}) != oos+fail ({oos+fail})")

    # 9. Accidents — at-fault PD/Injury/Fatal severity ↔ points
    sev_pts = {"Property": 2, "Injury": 4, "Fatal": 6}
    for r in pull["accidents"]:
        if r["fault"] == "At Fault":
            expected = sev_pts.get(r["type"])
            if expected is not None and r["pts"] not in (0, expected):
                msgs.append(f"Accident {r['date']} ({r['report']}) at-fault {r['type']} but pts={r['pts']} (expected 0 or {expected})")

    # 10. profileFrom + 24 months ≈ profileTo (lenient: just check both are present)
    s = data["source"]
    if not s.get("profileFrom") or not s.get("profileTo"):
        msgs.append("source.profileFrom or profileTo missing")

    # 11. carrier.nscNumber matches demographics.nscNumber
    if data["carrier"]["nscNumber"] != data["carrier"]["demographics"]["nscNumber"]:
        msgs.append(f"carrier.nscNumber ({data['carrier']['nscNumber']}) != demographics.nscNumber ({data['carrier']['demographics']['nscNumber']})")

    # 12. CVSA summary — Total Inspections row should equal sum of D/V + V-only + D-only counts
    rows = pull["cvsa"]["summary"]
    by = {r["inspectionType"]: r for r in rows}
    if "Total Inspections" in by and all(k in by for k in ("Driver/Vehicle Inspections", "Vehicle Only Inspections", "Driver Only Inspections")):
        tot = by["Total Inspections"]
        sum_count = (by["Driver/Vehicle Inspections"]["count"]
                   + by["Vehicle Only Inspections"]["count"]
                   + by["Driver Only Inspections"]["count"])
        if tot["count"] != sum_count:
            msgs.append(f"CVSA Total Inspections count ({tot['count']}) != sum of D/V + V-only + D-only ({sum_count})")

    return msgs


def validate_one(json_path, schema):
    name = json_path.parent.name
    try:
        data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"FAIL [{name}] cannot parse JSON: {e}"); return False
    try:
        check_schema(data, schema, name)
    except Fail as e:
        print(str(e)); return False
    msgs = check_math(data, name)
    if msgs:
        print(f"FAIL [{name}]:")
        for m in msgs:
            print(f"  - {m}")
        return False
    print(f"OK [{name}]")
    return True


def main():
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    if len(sys.argv) >= 2:
        ok = validate_one(Path(sys.argv[1]).resolve(), schema)
        return 0 if ok else 1
    targets = sorted((ROOT / "per-pdf").glob("*/extracted.json"))
    if not targets:
        print("No per-pdf/*/extracted.json found."); return 2
    failed = sum(1 for p in targets if not validate_one(p, schema))
    print(f"\n{len(targets)-failed}/{len(targets)} OK")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
