"""Validate every per-pdf/<name>/extracted.json against schema.json + cross-field math.

Usage:
    python validate.py                # walks per-pdf/*
    python validate.py path/to/extracted.json   # one file
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

# PEI Schedule 3 — fleet size to max points (used for cross-field check #6)
SCHEDULE_3 = [
    (1, 2, 10),    (3, 5, 18),    (6, 9, 28),    (10, 14, 40),
    (15, 19, 55),  (20, 24, 68),  (25, 29, 80),  (30, 39, 95),
    (40, 49, 115), (50, 59, 130), (60, 79, 150), (80, 99, 165),
    (100, 10**9, 185),
]


def max_points_for(fleet: int) -> int:
    for lo, hi, pts in SCHEDULE_3:
        if lo <= fleet <= hi:
            return pts
    return 55


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

    # 1. Σ inspection.points (OOS=3 each) = pull.inspectionPoints
    s_insp = sum((r.get("points") or 0) for r in pull["inspections"])
    if s_insp != pull["inspectionPoints"]:
        msgs.append(f"Sum inspection points ({s_insp}) != pull.inspectionPoints ({pull['inspectionPoints']})")

    # 2. Σ collision.points = pull.collisionPoints
    s_coll = sum((r.get("points") or 0) for r in pull["collisions"])
    if s_coll != pull["collisionPoints"]:
        msgs.append(f"Sum collision points ({s_coll}) != pull.collisionPoints ({pull['collisionPoints']})")

    # 3. Σ conviction.points = pull.convictionPoints
    s_conv = sum((r.get("points") or 0) for r in pull["convictions"])
    if s_conv != pull["convictionPoints"]:
        msgs.append(f"Sum conviction points ({s_conv}) != pull.convictionPoints ({pull['convictionPoints']})")

    # 4. Each inspection's status code consistent with its points
    for r in pull["inspections"]:
        st = r.get("status")
        pts = r.get("points") or 0
        if st in ("P", "W") and pts != 0:
            msgs.append(f"Inspection seq={r['seq']} status={st!r} but points={pts} (Pass/Warning should be 0 pts)")
        if st in ("OOS", "M") and pts != 3:
            msgs.append(f"Inspection seq={r['seq']} status={st!r} but points={pts} (OOS / minor-OOS should be 3 pts)")

    # 5. Σ severity matches collision points
    sev_to_pts = {"Property Damage": 2, "Injury": 4, "Fatal": 6}
    for r in pull["collisions"]:
        if r.get("atFault") and sev_to_pts.get(r["severity"]) != r["points"]:
            msgs.append(f"Collision seq={r['seq']} severity={r['severity']} at-fault should be {sev_to_pts[r['severity']]} pts, got {r['points']}")

    # 6. fleet maps to a Schedule 3 row (sanity check on fleet field)
    fleet = pull["currentActiveVehicles"]
    if fleet < 0:
        msgs.append(f"currentActiveVehicles ({fleet}) is negative")
    max_pts = max_points_for(fleet)
    total = pull["collisionPoints"] + pull["convictionPoints"] + pull["inspectionPoints"]
    # Note: total > max_pts is allowed (over-max display state, Sanction zone)
    # Just check that max_points lookup didn't fall through to default.
    if not any(lo <= fleet <= hi for lo, hi, _ in SCHEDULE_3):
        msgs.append(f"currentActiveVehicles ({fleet}) doesn't map to a Schedule 3 row")

    return msgs


def validate_one(json_path, schema):
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


def main():
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
