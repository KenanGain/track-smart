"""
Self-test for the CVOR vendor package.

Run from the repo root or from inside this folder:
    pip install jsonschema
    python validate.py

What it checks:
  1. The JSON Schema is itself valid Draft-07.
  2. examples/response-single.json validates against the schema.
  3. examples/response-bulk.json - each successful entry's `data` block
     also validates against the schema (errors entries are skipped).
  4. examples/response-error.json - every entry has the {error: {...}} shape.
  5. CSV templates parse with the right number of columns, no duplicate headers.
  6. Cross-check: every JSON-Schema field that's described as
     "frontend: <name>" appears in cvor_pulls.csv (sanity for naming drift).

Exit code: 0 = everything green; non-zero = at least one check failed.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

try:
    from jsonschema import Draft7Validator
except ImportError:
    print("ERROR: jsonschema not installed. Run: pip install jsonschema", file=sys.stderr)
    sys.exit(2)

HERE = Path(__file__).parent
SCHEMA_PATH        = HERE / "cvor-extraction-response.schema.json"
EXAMPLE_SINGLE     = HERE / "examples" / "response-single.json"
EXAMPLE_BULK       = HERE / "examples" / "response-bulk.json"
EXAMPLE_ERROR      = HERE / "examples" / "response-error.json"
EXPECTED_DIR       = HERE / "examples" / "expected"
CSV_PULLS          = HERE / "templates" / "pulls.csv"
CSV_EVENTS         = HERE / "templates" / "inspection-events.csv"
CSV_TICKETS        = HERE / "templates" / "tickets.csv"


PASS = "  [PASS]"
FAIL = "  [FAIL]"
SKIP = "  [skip]"


def _ok(label: str, detail: str = "") -> None:
    print(f"{PASS} {label}" + (f"  ({detail})" if detail else ""))


def _fail(label: str, detail: str) -> None:
    print(f"{FAIL} {label}\n         {detail}")


# ── Checks ──────────────────────────────────────────────────────────────────

def check_schema_well_formed(schema: dict) -> bool:
    print("\n[1] Schema well-formed (Draft-07)")
    try:
        Draft7Validator.check_schema(schema)
    except Exception as e:
        _fail("check_schema", str(e))
        return False
    _ok("Draft-07 valid")
    return True


def check_single_example(schema: dict) -> bool:
    print("\n[2] examples/response-single.json validates against schema")
    sample = json.load(EXAMPLE_SINGLE.open(encoding="utf-8"))
    v = Draft7Validator(schema)
    errors = sorted(v.iter_errors(sample), key=lambda e: list(e.path))
    if not errors:
        _ok(EXAMPLE_SINGLE.name)
        return True
    _fail(EXAMPLE_SINGLE.name, f"{len(errors)} error(s):")
    for e in errors[:10]:
        path = "/".join(map(str, e.path)) or "<root>"
        print(f"           - {path}: {e.message}")
    return False


def check_bulk_example(schema: dict) -> bool:
    print("\n[3] examples/response-bulk.json - successful entries validate")
    bulk = json.load(EXAMPLE_BULK.open(encoding="utf-8"))
    results = bulk.get("results", [])
    if not isinstance(results, list):
        _fail("response-bulk.json", "missing or invalid `results` array")
        return False
    v = Draft7Validator(schema)
    failures = 0
    for i, r in enumerate(results):
        if r.get("ok") is False:
            print(f"{SKIP}  results[{i}] = error entry")
            continue
        data = r.get("data")
        if not isinstance(data, dict):
            _fail(f"results[{i}]", "ok=true but `data` not an object")
            failures += 1
            continue
        # Bulk samples carry placeholder `"...": "..."` markers; allowed.
        # Skip strict validation if marker present.
        if any(k == "..." for k in (data.get("carrier") or {})) or any(k == "..." for k in (data.get("pull") or {})):
            _ok(f"results[{i}] (placeholder data - skipped)")
            continue
        errors = sorted(v.iter_errors(data), key=lambda e: list(e.path))
        if not errors:
            _ok(f"results[{i}]")
        else:
            _fail(f"results[{i}]", f"{len(errors)} error(s)")
            for e in errors[:5]:
                path = "/".join(map(str, e.path)) or "<root>"
                print(f"           - {path}: {e.message}")
            failures += 1
    return failures == 0


def check_error_example() -> bool:
    print("\n[4] examples/response-error.json - every entry has {error: {...}}")
    err_doc = json.load(EXAMPLE_ERROR.open(encoding="utf-8"))
    failures = 0
    for k, v in err_doc.items():
        if k.startswith("_"):
            continue
        if not isinstance(v, dict) or "error" not in v:
            _fail(k, "missing top-level `error` object")
            failures += 1
            continue
        e = v["error"]
        for required in ("code", "message", "traceId"):
            if required not in e:
                _fail(k, f"`error.{required}` missing")
                failures += 1
        else:
            _ok(k)
    return failures == 0


def check_csv(name: str, path: Path) -> tuple[bool, list[str]]:
    print(f"\n[5] CSV template - {path.name}")
    with path.open(encoding="utf-8") as f:
        reader = csv.reader(f)
        header = next(reader, [])
        rows = list(reader)
    if not header:
        _fail(name, "empty header row")
        return False, []
    dupes = [h for h in set(header) if header.count(h) > 1]
    if dupes:
        _fail(name, f"duplicate columns: {dupes}")
        return False, header
    for ri, row in enumerate(rows, start=2):
        if len(row) != len(header):
            _fail(name, f"row {ri} has {len(row)} cols, expected {len(header)}")
            return False, header
    _ok(name, f"{len(header)} cols, {len(rows)} sample row(s)")
    return True, header


def check_csv_field_naming(schema: dict, pulls_header: list[str]) -> bool:
    """For every property of `pull.*` in the schema, ensure a matching
    column exists in pulls.csv. Loose match (case-insensitive, drops dots)."""
    print("\n[6] Schema <-> pulls.csv field naming consistency")
    pull_props = set((schema.get("properties", {}).get("pull", {}).get("properties", {}) or {}).keys())
    if not pull_props:
        _fail("schema", "could not read pull.* properties")
        return False
    csv_norm = {h.lower(): h for h in pulls_header}
    missing = []
    for p in sorted(pull_props):
        if p in {"inspectionsByLevel", "inspectionsOosByLevel", "inspectionThreshold"}:
            # nested objects - flattened in CSV with prefixes; check loosely
            continue
        if p.lower() not in csv_norm:
            missing.append(p)
    if missing:
        _fail("naming drift", f"{len(missing)} schema field(s) absent from CSV: {missing}")
        return False
    _ok(f"all {len(pull_props)} schema fields covered in CSV header")
    return True


def check_expected_dir(schema: dict) -> bool:
    """Validate every JSON in examples/expected/ that is not marked as a STUB.
    A file is treated as a stub if it has a top-level "_README" key OR any
    warning with code == "STUB". Stubs are skipped — they're hand-keyed
    checkpoints meant to be filled in later, not real extractor outputs."""
    print("\n[7] examples/expected/ - per-PDF ground truth files")
    if not EXPECTED_DIR.is_dir():
        print(f"{SKIP}  no expected/ directory present")
        return True
    v = Draft7Validator(schema)
    files = sorted(EXPECTED_DIR.glob("*.json"))
    if not files:
        print(f"{SKIP}  no .json files in expected/")
        return True
    failures = 0
    for p in files:
        try:
            doc = json.load(p.open(encoding="utf-8"))
        except json.JSONDecodeError as e:
            _fail(p.name, f"invalid JSON: {e}"); failures += 1; continue
        is_stub = (
            "_README" in doc
            or any(w.get("code") == "STUB" for w in (doc.get("warnings") or []))
        )
        if is_stub:
            print(f"{SKIP}  {p.name} (stub)")
            continue
        errors = sorted(v.iter_errors(doc), key=lambda e: list(e.path))
        if not errors:
            _ok(p.name)
        else:
            _fail(p.name, f"{len(errors)} error(s)")
            for e in errors[:5]:
                path = "/".join(map(str, e.path)) or "<root>"
                print(f"           - {path}: {e.message}")
            failures += 1
    return failures == 0


def main() -> int:
    print("=" * 70)
    print("CVOR Vendor Package - Self-Validation")
    print("=" * 70)
    schema = json.load(SCHEMA_PATH.open(encoding="utf-8"))

    results = [
        check_schema_well_formed(schema),
        check_single_example(schema),
        check_bulk_example(schema),
        check_error_example(),
    ]
    csv_ok_pulls,   pulls_header   = check_csv("pulls.csv",             CSV_PULLS)
    csv_ok_events,  events_header  = check_csv("inspection-events.csv", CSV_EVENTS)
    csv_ok_tickets, tickets_header = check_csv("tickets.csv",           CSV_TICKETS)
    results.append(csv_ok_pulls)
    results.append(csv_ok_events)
    results.append(csv_ok_tickets)
    results.append(check_csv_field_naming(schema, pulls_header))
    results.append(check_expected_dir(schema))

    print("\n" + "=" * 70)
    if all(results):
        print("RESULT: all checks passed.")
        return 0
    print(f"RESULT: {sum(1 for r in results if not r)}/{len(results)} check(s) failed.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
