"""Flatten extracted.json into CSV templates under per-pdf/<name>/lists/.

Usage (from package root):
    python scripts/emit_csvs.py per-pdf/<name>/
"""
from __future__ import annotations
import csv
import json
import sys
from pathlib import Path


def write_csv(path: Path, header: list[str], rows: list[list]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)


def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("usage: emit_csvs.py <per-pdf/<name>/>\n")
        sys.exit(2)
    folder = Path(sys.argv[1]).resolve()
    data = json.loads((folder / "extracted.json").read_text(encoding="utf-8"))
    out = folder / "lists"
    pull = data["pull"]

    write_csv(
        out / "audit-history.csv",
        ["date", "auditNum", "sequence", "result"],
        [[r["date"], r["auditNum"], r["sequence"], r["result"]] for r in pull["auditHistory"]],
    )

    write_csv(
        out / "cvsa-inspections.csv",
        ["seq", "date", "cvsaNumber", "jur", "plates", "driverMaster", "result", "demeritPts"],
        [
            [r["seq"], r["date"], r["cvsaNumber"], r["jur"],
             "; ".join(r["plates"]), r["driverMaster"], r["result"], r["demeritPts"]]
            for r in pull["cvsaInspections"]
        ],
    )

    write_csv(
        out / "convictions.csv",
        ["seq", "offenceDate", "convDate", "ticket", "offence", "driverMaster", "sectionActReg", "pts"],
        [
            [r["seq"], r["offenceDate"], r["convDate"], r["ticket"], r["offence"],
             r["driverMaster"], r["sectionActReg"], r["pts"]]
            for r in pull["convictions"]
        ],
    )

    write_csv(
        out / "collisions.csv",
        ["seq", "date", "severity", "location", "driverMaster", "driverJur", "plate", "plateJur", "pts"],
        [
            [r["seq"], r["date"], r["severity"], r["location"],
             r.get("driverMaster") or "", r["driverJur"], r["plate"], r["plateJur"], r["pts"]]
            for r in pull["collisions"]
        ],
    )

    write_csv(
        out / "warning-tickets.csv",
        ["seq", "offenceDate", "plate", "driverMaster", "statute", "description"],
        [
            [r["seq"], r["offenceDate"], r["plate"], r["driverMaster"],
             r["statute"], r["description"]]
            for r in pull["warningTickets"]
        ],
    )

    print(f"Wrote 5 CSVs to {out}")


if __name__ == "__main__":
    main()
