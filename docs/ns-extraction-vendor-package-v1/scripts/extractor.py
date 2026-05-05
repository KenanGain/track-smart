"""Reference parser — walks an NS Carrier Profile Abstract PDF and emits a
schema-valid extracted.json.

Vendors can use this as a template. The PDF text is laid out as:

  Page 1: header banner / demographics / safety thresholds / indexed scores /
          audit history / first batch of CVSA inspection rows
  Page 2: CVSA inspection rows (continued)
  Page 3: CVSA inspection rows (continued) / Totals / Convictions / Collisions /
          Traffic Offence Reports / Totals

Run from the package root:
    python scripts/extractor.py raw-pdfs/<file>.pdf per-pdf/<name>/extracted.json
"""
from __future__ import annotations
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF

# ── helpers ───────────────────────────────────────────────────────────

DATE_RE  = re.compile(r"^\d{2}/\d{2}/\d{4}$")
PLATE_RE = re.compile(r"^[A-Z0-9-]+\s*/\s*[A-Z]{2}$")
JUR_RE   = re.compile(r"^[A-Z]{2,3}$")
RESULTS  = {"Passed", "Defect Noted", "Out-of-Service"}


def line(stripped: str) -> str:
    """Trim trailing whitespace + the trailing space the PDF often emits."""
    return stripped.rstrip()


def get_after(lines: list[str], label: str) -> str | None:
    """Return the text after the first occurrence of `label` on the same
    line (e.g. 'Phone:' → '902-440-0679' if printed as 'Phone: 902-440-0679'),
    or the next non-empty line if the label sits on a line of its own."""
    for i, ln in enumerate(lines):
        if label in ln:
            after = ln.split(label, 1)[1].strip()
            if after:
                return after
            # otherwise the value is on the next non-empty line
            for j in range(i + 1, len(lines)):
                v = lines[j].strip()
                if v:
                    return v
    return None


# ── demographics + scores (page 1) ────────────────────────────────────

def parse_page1(d: fitz.Document) -> dict:
    text = d[0].get_text()
    lines = [line(ln) for ln in text.splitlines()]

    out: dict = {"demographics": {}, "certificate": {}, "thresholds": {}, "scores": {}, "audits": []}

    # NSC #
    nsc = get_after(lines, "NSC #:") or ""
    out["nscNumber"] = nsc

    # Date / Carrier Profile Abstract as of
    out["reportRunDate"] = (get_after(lines, "Date:") or "").strip()
    # 'as of <date>' under the title 'Carrier Profile Abstract'
    for i, ln in enumerate(lines):
        s = ln.strip()
        if s.startswith("as of "):
            out["profileAsOf"] = s[len("as of "):].strip()
            break
    if "profileAsOf" not in out:
        out["profileAsOf"] = out["reportRunDate"]

    dem = out["demographics"]
    dem["carrierName"]   = (get_after(lines, "Name:") or "").strip()
    dem["contactName"]   = get_after(lines, "Contact Name:")
    dem["contactTitle"]  = get_after(lines, "Contact Title:")
    dem["phone"]         = get_after(lines, "Phone:")
    dem["principalPlace"] = get_after(lines, "Principal Place of Business:")

    # U.S. DOT#: / IRP #: / MVI Stn #: — values may be inline or on next line
    dem["usDotNumber"] = get_after(lines, "U.S. DOT#:") or None
    dem["irpNumber"]   = get_after(lines, "IRP #:") or None
    dem["mviStnNumber"] = get_after(lines, "MVI Stn #:") or None

    # Current Fleet Size / Avg. Daily Fleet Size
    cfs = get_after(lines, "Current Fleet Size:")
    dem["currentFleetSize"] = int(cfs) if cfs and cfs.isdigit() else 0
    adfs = get_after(lines, "Avg. Daily Fleet Size:")
    dem["avgDailyFleetSize"] = float(adfs) if adfs else 0.0

    # Mailing Address / Physical Address — laid out as two side-by-side blocks;
    # PDF emits them as alternating lines (mail line / phys line) for street,
    # city, postal. Walk after the "Mailing Address" header.
    mail_lines: list[str] = []
    phys_lines: list[str] = []
    for i, ln in enumerate(lines):
        if "Mailing Address" in ln and "Physical Address" in lines[i + 1] if i + 1 < len(lines) else False:
            # They print on adjacent lines as headers; data starts at i+2
            j = i + 2
            buf: list[str] = []
            while j < len(lines):
                s = lines[j].strip()
                if s.startswith("Principal Place of Business") or s.startswith("U.S. DOT") or not s:
                    break
                buf.append(s)
                j += 1
            # Buf is interleaved: mail, phys, mail, phys, mail, phys
            for k, v in enumerate(buf):
                (mail_lines if k % 2 == 0 else phys_lines).append(v)
            break
    if mail_lines:
        dem["mailingAddress"] = ", ".join(mail_lines)
    else:
        dem["mailingAddress"] = None
    if phys_lines:
        dem["physicalAddress"] = ", ".join(phys_lines)
    else:
        dem["physicalAddress"] = None

    # Safety Rating + Expires
    cert = out["certificate"]
    cert["safetyRating"] = (get_after(lines, "Safety Rating:") or "").strip()
    cert["safetyRatingExpires"] = get_after(lines, "Expires:")

    # Thresholds (Level 1 / Level 2 / Level 3) — printed as label rows then number rows
    for i, ln in enumerate(lines):
        if ln.strip() == "Safety Rating Score":
            # next 3 are Level 1 / Level 2 / Level 3 labels, then 3 numbers
            try:
                nums = [float(lines[i + 4].strip()), float(lines[i + 5].strip()), float(lines[i + 6].strip())]
                out["thresholds"] = {"level1": nums[0], "level2": nums[1], "level3": nums[2]}
            except (ValueError, IndexError):
                pass
            break

    # Indexed scores (Convictions / Inspections / Collisions / Total Demerit Score)
    def _score_after(label: str) -> float:
        for i, ln in enumerate(lines):
            if ln.strip() == label and i + 1 < len(lines):
                try:
                    return float(lines[i + 1].strip())
                except ValueError:
                    pass
        return 0.0
    out["scores"] = {
        "convictions":  _score_after("Convictions"),
        "inspections":  _score_after("Inspections"),
        "collisions":   _score_after("Collisions"),
        "totalDemerit": 0.0,
    }
    # Total Demerit Score = (printed on its own line after '=')
    for i, ln in enumerate(lines):
        if ln.strip().startswith("Total Demerit Score"):
            # next non-empty line is the number
            for j in range(i + 1, len(lines)):
                v = lines[j].strip()
                if v:
                    try:
                        out["scores"]["totalDemerit"] = float(v)
                    except ValueError:
                        pass
                    break
            break

    # Audit History rows on page 1 (between "Audit Result" header and "CVSA Inspection")
    in_audit = False
    audit_buf: list[str] = []
    for ln in lines:
        s = ln.strip()
        if s == "Audit Result":
            in_audit = True
            continue
        if in_audit:
            if s == "CVSA Inspection":
                break
            if s:
                audit_buf.append(s)
    # Each audit is 3 successive lines: "{date}", "{auditNum} / {sequence}", "{result}"
    i = 0
    while i + 2 < len(audit_buf):
        date = audit_buf[i]
        if not DATE_RE.match(date):
            i += 1
            continue
        slash = audit_buf[i + 1]
        result = audit_buf[i + 2]
        m = re.match(r"^(\S+)\s*/\s*(\S+)$", slash)
        if not m:
            i += 1
            continue
        out["audits"].append({
            "date": date,
            "auditNum": m.group(1),
            "sequence": m.group(2),
            "result": result,
        })
        i += 3

    return out


# ── CVSA inspections (pages 1-3, until 'Totals') ──────────────────────

def parse_cvsa(d: fitz.Document) -> tuple[list[dict], dict]:
    text = "\n".join(d[i].get_text() for i in range(d.page_count))
    lines = [line(ln) for ln in text.splitlines()]

    # Find the start of CVSA data: first 'Date' header followed by 'CVSA Number'
    out: list[dict] = []
    seq = 1
    i = 0
    # Skip until we are PAST the page-1 Audit History (so the "Audit Date" row
    # doesn't get parsed as a CVSA date). Anchor on the first "CVSA Inspection"
    # block header.
    in_section = False
    totals = {"records": 0, "demeritPts": 0}

    while i < len(lines):
        s = lines[i].strip()
        if s == "CVSA Inspection":
            in_section = True
            i += 1
            continue
        if not in_section:
            i += 1
            continue
        # End of CVSA section — Totals row OR Convictions section
        if s == "Totals":
            # Next two non-empty lines are records and demerit pts
            j = i + 1
            nums: list[int] = []
            while j < len(lines) and len(nums) < 2:
                v = lines[j].strip()
                if v.isdigit():
                    nums.append(int(v))
                j += 1
            if len(nums) == 2:
                totals = {"records": nums[0], "demeritPts": nums[1]}
            i = j
            break
        if s == "Convictions":
            break
        # Date marker → start a new row
        if DATE_RE.match(s):
            row, i = _parse_cvsa_row(lines, i, seq)
            if row is not None:
                out.append(row)
                seq += 1
            continue
        i += 1

    return out, totals


def _parse_cvsa_row(lines: list[str], i: int, seq: int) -> tuple[dict | None, int]:
    """Parse one CVSA row starting at the date line. Returns (row, next_i)."""
    date = lines[i].strip()
    j = i + 1
    # cvsaNumber: the next non-empty line that isn't a known column header
    cvsa_number = ""
    while j < len(lines):
        v = lines[j].strip()
        if v and v not in ("Date", "dd/mm/yyyy", "CVSA Number", "Jur",
                              "Plate Number(s)", "Driver Master No.",
                              "CVSA Result", "Demerit", "Points",
                              "CVSA Inspection"):
            cvsa_number = v
            j += 1
            break
        j += 1
    # jur (2-3 char uppercase)
    jur = ""
    while j < len(lines):
        v = lines[j].strip()
        if v and JUR_RE.match(v):
            jur = v
            j += 1
            break
        j += 1
    # Read every non-empty line up to the result keyword. Each row prints
    # 1-2 plate lines followed by 1 driver-master line (which can itself span
    # two lines when the trailing jur wraps, e.g. 'D4391-00009-90407 / ' on
    # one line then 'ON' on the next).
    collected: list[str] = []
    while j < len(lines):
        v = lines[j].strip()
        if v in RESULTS:
            break
        if v:
            collected.append(v)
        j += 1

    plates: list[str] = []
    driver_master = ""
    if collected:
        # Case A: driver master split across 2 lines (last is 2-letter jur,
        # second-to-last ends with '/').
        if (len(collected) >= 2
                and JUR_RE.match(collected[-1])
                and collected[-2].rstrip().endswith("/")):
            head = collected[-2].rstrip().rstrip("/").rstrip()
            driver_master = f"{head} / {collected[-1]}"
            plates = collected[:-2]
        # Case B: driver master on single line, looks like '{id} / {jur}'.
        elif PLATE_RE.match(collected[-1]):
            driver_master = collected[-1]
            plates = collected[:-1]
        # Case C: no recognisable driver master — leave empty.
        else:
            plates = collected
    # Normalise plate / driver-master spacing
    plates = [re.sub(r"\s*/\s*", " / ", p) for p in plates]
    driver_master = re.sub(r"\s*/\s*", " / ", driver_master).strip()
    # result
    if j >= len(lines):
        return None, j
    result = lines[j].strip()
    j += 1
    # optional demerit points (single digit on its own line, only for OOS)
    demerit_pts = 0
    if j < len(lines) and lines[j].strip().isdigit():
        demerit_pts = int(lines[j].strip())
        j += 1

    if result not in RESULTS:
        return None, j

    return ({
        "seq": seq,
        "date": date,
        "cvsaNumber": cvsa_number,
        "jur": jur,
        "plates": plates,
        "driverMaster": driver_master,
        "result": result,
        "demeritPts": demerit_pts,
    }, j)


# ── Convictions / Collisions / Warnings (page 3) ─────────────────────

def parse_warnings(d: fitz.Document) -> tuple[list[dict], dict]:
    text = "\n".join(d[i].get_text() for i in range(d.page_count))
    lines = [line(ln) for ln in text.splitlines()]
    rows: list[dict] = []
    totals = {"records": 0}

    # Find "Traffic Offence Reports" anchor
    start = None
    for i, ln in enumerate(lines):
        if "Traffic Offence Reports" in ln:
            start = i
            break
    if start is None:
        return rows, totals
    # Header columns: Offence Date / dd/mm/yyyy / Plate Number / Driver Master No. / Statute / Sect. / Sub-Sect / Clause
    # Walk past header line(s) until first DATE_RE match
    seq = 1
    i = start + 1
    while i < len(lines):
        s = lines[i].strip()
        if s == "Totals":
            j = i + 1
            while j < len(lines):
                v = lines[j].strip()
                if v.isdigit():
                    totals = {"records": int(v)}
                    break
                j += 1
            break
        if DATE_RE.match(s):
            offence_date = s
            plate = lines[i + 1].strip() if i + 1 < len(lines) else ""
            driver_master = lines[i + 2].strip() if i + 2 < len(lines) else ""
            statute = lines[i + 3].strip() if i + 3 < len(lines) else ""
            description = lines[i + 4].strip() if i + 4 < len(lines) else ""
            # Strip leading "- " from description if present
            description = re.sub(r"^-\s*", "", description).strip()
            rows.append({
                "seq": seq,
                "offenceDate": offence_date,
                "plate": plate,
                "driverMaster": driver_master,
                "statute": statute,
                "description": description,
            })
            seq += 1
            i += 5
            continue
        i += 1
    return rows, totals


# ── main ──────────────────────────────────────────────────────────────

def extract(pdf_path: Path) -> dict:
    d = fitz.open(str(pdf_path))
    p1 = parse_page1(d)
    cvsa, cvsa_totals = parse_cvsa(d)
    warnings, warning_totals = parse_warnings(d)

    return {
        "source": {
            "fileName":      pdf_path.name,
            "reportRunDate": p1["reportRunDate"],
            "profileAsOf":   p1["profileAsOf"],
            "pageCount":     d.page_count,
            "formVersion":   None,
            "extractedAt":   datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "carrier": {
            "nscNumber":   p1["nscNumber"],
            "demographics": p1["demographics"],
            "certificate":  p1["certificate"],
        },
        "pull": {
            "asOfDate":        p1["profileAsOf"],
            "thresholds":      p1["thresholds"],
            "scores":          p1["scores"],
            "auditHistory":    p1["audits"],
            "cvsaInspections": cvsa,
            "cvsaTotals":      cvsa_totals,
            "convictions":     [],
            "collisions":      [],
            "warningTickets":  warnings,
            "warningTotals":   warning_totals,
        },
    }


def main() -> None:
    if len(sys.argv) < 3:
        sys.stderr.write("usage: extractor.py <src.pdf> <dst.json>\n")
        sys.exit(2)
    src = Path(sys.argv[1]).resolve()
    dst = Path(sys.argv[2]).resolve()
    data = extract(src)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Wrote {dst} (CVSA={len(data['pull']['cvsaInspections'])}, warnings={len(data['pull']['warningTickets'])})")


if __name__ == "__main__":
    main()
