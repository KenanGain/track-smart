"""One-off rebuild of CVSA list, accidents, CVIP, and §4.4 pending carrier
from the printed PDF.

The earlier extracted.json was a mirror of the legacy frontend mock and
carried only a subset of each section's rows (or, in the case of §4.4
and §8, fabricated rows the PDF doesn't contain). Per the v5 rule
"highlight whatever is in extracted.json", we make extracted.json reflect
what the PDF actually prints so the highlighter has every row to match.

Run from the v5 package root:
    python scripts/rebuild_arrays_from_pdf.py
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path
import fitz  # PyMuPDF

PKG = Path(__file__).resolve().parent.parent
PDF = PKG / "raw-pdfs" / "CPODetailReport_INERTIA_2025-04-17.pdf"
EXT = PKG / "per-pdf" / "Inertia_Carrier_2025-04-17" / "extracted.json"


# ── helpers ──────────────────────────────────────────────────────────
def page_lines(d: fitz.Document, idx: int) -> list[str]:
    return [ln for ln in d[idx].get_text().splitlines()]

def is_footer_or_banner(ln: str) -> bool:
    s = ln.strip()
    return (
        not s
        or s.startswith("Commercial Vehicle Safety")
        or s.startswith("National Safety Code")
        or s.startswith("From:")
        or s.startswith("NSC #:")
        or s.startswith("Section ")
        or s.startswith("Page ")
        or s.startswith("This section")
        or s.startswith("NSC Points")
        or s.startswith("Contraventions are")
        or s.startswith("Details")
    )


# ── §5 CVSA inspections (pages 17-33, indices 16-32) ─────────────────
def parse_cvsa_list(d: fitz.Document) -> list[dict]:
    text = "\n".join(d[i].get_text() for i in range(16, 33))
    lines = [ln.strip() for ln in text.splitlines()]
    out: list[dict] = []
    i = 0
    while i < len(lines):
        if lines[i] == "Inspection Date":
            # 8-line header, then a metadata block of variable line count
            # ending before "Driver Name". The PDF inconsistently merges
            # location+jur onto one line vs. separate lines, so collect all
            # block lines and assign by content pattern.
            j = i + 8
            block: list[str] = []
            while j < len(lines) and lines[j] != "Driver Name":
                s = lines[j].strip()
                if s and s not in ("Inspection Date", "Time", "Document #", "Location",
                                       "Jur", "Level", "Result", "Active Points"):
                    block.append(s)
                j += 1
            # Pull date, time, doc off the front
            if len(block) < 4:
                i += 1
                continue
            date, time, doc = block[0], block[1], block[2]
            tail = block[3:]
            # tail = location parts + jur + level + result + [pts]
            # Identify pts (last entry, all-digits, only if Result is OOS)
            pts = None
            if tail and tail[-1].isdigit() and len(tail[-1]) <= 2:
                # could be pts or could be level
                pass
            # Identify result from the right (Pass/Fail/OOS)
            result_idx = None
            for k in range(len(tail) - 1, -1, -1):
                if tail[k] in ("Pass", "Fail", "OOS"):
                    result_idx = k
                    break
            if result_idx is None:
                # malformed; skip
                i = j
                continue
            result = tail[result_idx]
            # Anything after result is pts
            after = tail[result_idx + 1:]
            if after and after[0].isdigit():
                pts = int(after[0])
            # Level is right before result and is a small integer
            level_idx = result_idx - 1
            level_raw = tail[level_idx] if level_idx >= 0 else ""
            level = int(level_raw) if level_raw.isdigit() else level_raw
            # Jur is right before level and is a 2-3-letter uppercase token,
            # which might be the trailing word of a "LOCATION JUR" combined line.
            jur_idx = level_idx - 1
            jur = ""
            location_parts: list[str] = []
            if jur_idx >= 0:
                last = tail[jur_idx]
                m = re.match(r"^(?:(.+)\s+)?([A-Z]{2,3})$", last)
                if m:
                    if m.group(1):
                        location_parts.append(m.group(1))
                    jur = m.group(2)
                else:
                    jur = last
                location_parts = tail[:jur_idx] + location_parts
            location = " ".join(p for p in location_parts if p).strip()

            # Skip until "Driver Name" header, then parse driver block
            while j < len(lines) and lines[j] != "Driver Name":
                j += 1
            j += 2  # skip "Driver Name", "DL#/Jur"
            driver_name = ""
            dl = ""
            dl_jur = ""
            if j < len(lines) and lines[j] != "Vehicle":
                # may be "Driver Name" line then "DL DL_JUR" line, or empty
                if not lines[j].startswith("Vehicle"):
                    driver_name = lines[j].strip()
                    j += 1
                    if j < len(lines) and lines[j] != "Vehicle":
                        # DL line e.g. "P71220000940801 ON"
                        m = re.match(r"^(\S+)\s+([A-Z]{2})$", lines[j].strip())
                        if m:
                            dl, dl_jur = m.group(1), m.group(2)
                        j += 1

            # Skip until "Vehicle" header, then parse units
            while j < len(lines) and not lines[j].startswith("Vehicle"):
                j += 1
            # Header: Vehicle / Plate/Jur / Regi # / Vehicle Desc / Result / Inspection Item Defect
            j += 6  # skip 6 column header lines
            units: list[dict] = []
            kinds = {"Power Unit", "Semi-Trailer", "Trailer 1", "Trailer 2", "Bus", "Truck"}
            while j < len(lines) and lines[j] != "Inspection Date":
                if lines[j].strip() in kinds:
                    kind = lines[j].strip()
                    # next: "{plate} {plateJur}"
                    j += 1
                    plate, plate_jur = "", ""
                    if j < len(lines):
                        m = re.match(r"^(\S+)\s+([A-Z]{2})$", lines[j].strip())
                        if m:
                            plate, plate_jur = m.group(1), m.group(2)
                        j += 1
                    # next: regi
                    regi = ""
                    if j < len(lines) and re.match(r"^\d{6,9}$", lines[j].strip()):
                        regi = lines[j].strip()
                        j += 1
                    # next: vehicle desc
                    desc = ""
                    if j < len(lines) and not lines[j].startswith(("Pass", "Fail", "OOS", "N/A", "Inspection", "Driver")) and lines[j].strip() not in kinds:
                        desc = lines[j].strip()
                        j += 1
                    # next: result
                    unit_result = ""
                    if j < len(lines) and lines[j].strip() in ("Pass", "Fail", "OOS", "N/A"):
                        unit_result = lines[j].strip()
                        j += 1
                    # optional defect codes line(s)
                    defects = ""
                    while j < len(lines) and lines[j].strip() in ("Pass", "Fail", "OOS", "N/A"):
                        # might be additional result/defect line — skip to be safe
                        j += 1
                    if j < len(lines) and re.match(r"^[\d,\s]+$", lines[j].strip()):
                        defects = lines[j].strip()
                        j += 1
                    units.append({
                        "kind": kind, "plate": plate, "plateJur": plate_jur,
                        "regi": regi, "desc": desc,
                        "result": unit_result or None, "defect": defects or None,
                    })
                else:
                    j += 1

            out.append({
                "date": date, "time": time, "doc": doc,
                "location": location, "jur": jur,
                "level": level,
                "result": result, "pts": pts,
                "driverName": driver_name or None,
                "dl": dl or None, "dlJur": dl_jur or None,
                "units": units,
            })
            i = j
        else:
            i += 1
    return out


# ── §6 accidents (pages 34-35, indices 33-34) ────────────────────────
def parse_accidents(d: fitz.Document) -> list[dict]:
    text = "\n".join(d[i].get_text() for i in range(33, 35))
    # Strip Details header text from §6 narrative
    lines = [ln.strip() for ln in text.splitlines()]
    out: list[dict] = []
    i = 0
    while i < len(lines):
        if lines[i] == "Accident Date":
            # 8-line header, then date/time/report/location/jur/type/fault[/pts].
            # location can span multiple lines.
            j = i + 8
            while j < len(lines) and not lines[j].strip():
                j += 1
            date = lines[j].strip(); j += 1
            time = lines[j].strip(); j += 1
            report = lines[j].strip(); j += 1
            loc_parts = []
            while j < len(lines):
                s = lines[j].strip()
                if re.match(r"^[A-Z]{2,3}$", s):
                    break
                loc_parts.append(s)
                j += 1
            location = " ".join(p for p in loc_parts if p).strip()
            jur = lines[j].strip(); j += 1
            atype = lines[j].strip(); j += 1
            # fault may span 2 words on 1 line
            fault = lines[j].strip(); j += 1
            if j < len(lines) and lines[j].strip() in ("Fault", "Unknown"):
                fault = (fault + " " + lines[j].strip()).strip()
                j += 1
            pts = 0
            if j < len(lines) and lines[j].strip().isdigit():
                pts = int(lines[j].strip()); j += 1

            # Driver Name block
            while j < len(lines) and lines[j] != "Driver Name":
                j += 1
            j += 2  # skip Driver Name, DL#/Jur headers
            driver_name = ""
            dl = ""
            dl_jur = ""
            if j < len(lines) and lines[j] not in ("Plate/Jur", "Accident Date"):
                if lines[j] != "null":
                    driver_name = lines[j].strip()
                j += 1
                if j < len(lines) and lines[j] != "Plate/Jur" and lines[j] != "Accident Date":
                    if lines[j].strip() == "null":
                        j += 1
                    else:
                        m = re.match(r"^(\S+)\s+([A-Z]{2})$", lines[j].strip())
                        if m:
                            dl, dl_jur = m.group(1), m.group(2)
                        j += 1

            # Plate/Jur block: "Plate/Jur" / "Regi #" / "Vehicle Desc" / "Charges Laid"
            # then values
            while j < len(lines) and lines[j] != "Plate/Jur":
                j += 1
            j += 4
            plate, plate_jur, regi, veh_desc, charges = "", "", "", "", ""
            # plate line
            if j < len(lines):
                m = re.match(r"^(\S+)\s+([A-Z]{2})$", lines[j].strip())
                if m:
                    plate, plate_jur = m.group(1), m.group(2)
                j += 1
            # regi
            if j < len(lines) and re.match(r"^\d{6,9}$", lines[j].strip()):
                regi = lines[j].strip()
                j += 1
            # vehicle desc may span 1-2 lines, ends before charges (Yes/No)
            while j < len(lines) and lines[j].strip() not in ("Yes", "No"):
                if lines[j] in ("Accident Date",):
                    break
                if lines[j].strip():
                    veh_desc = (veh_desc + " " + lines[j].strip()).strip()
                j += 1
            if j < len(lines) and lines[j].strip() in ("Yes", "No"):
                charges = lines[j].strip()
                j += 1

            out.append({
                "date": date, "time": time, "report": report,
                "location": location, "jur": jur,
                "driverName": driver_name or None, "dl": dl or None, "dlJur": dl_jur or None,
                "plate": plate or None, "plateJur": plate_jur or None,
                "regi": regi or None, "vehDesc": veh_desc or None,
                "type": atype, "fault": fault,
                "charges": charges or None, "pts": pts,
            })
            i = j
        else:
            i += 1
    return out


# ── §4 contraventions (pages 8-15, indices 7-14) ─────────────────────
#
# Layout per violation block:
#   "Violation Date" / "Time" / "Ticket #" / "Plate/Jur" / "Location" /
#   "Jurisdiction" / "Disposition Date"     ← 7-line header
#   {date} / {time} / {ticket} / "{plate} {plateJur}" / {location...} /
#   {juris} / {dispDate?}                    ← 6-7 data lines (location can span)
#   "Act" / "Section" / "Description" / "Equiv Code" / "Active Points"
#   {act} / {section} / {desc...} / {equiv} / {pts?}
#
# Driver context (for §4.1 and §4.3) appears before each driver's first violation:
#   {driverName?}              ← optional, may be missing if not on file
#   "DL#/Jur:   {dl} {jur}"
#   "Class:" {cls?}
#   "Status:" {status?}

VIO_HDR = ("Violation Date", "Time", "Ticket #", "Plate/Jur", "Location",
           "Jurisdiction", "Disposition Date")
ACT_HDR = ("Act", "Section", "Description", "Equiv Code", "Active Points")


def _parse_violation_block(lines: list[str], i: int) -> tuple[dict | None, int]:
    """Parse one violation block starting at the 'Violation Date' header line.
    Returns (block_dict, next_index)."""
    if lines[i].strip() != "Violation Date":
        return None, i + 1
    # skip 7-line header
    j = i + 7
    # date / time / ticket
    date = lines[j].strip(); j += 1
    time = lines[j].strip(); j += 1
    ticket = lines[j].strip(); j += 1
    # plate + plateJur joined by space
    plate, plate_jur = "", ""
    m = re.match(r"^(\S+)\s+([A-Z]{2})$", lines[j].strip())
    if m:
        plate, plate_jur = m.group(1), m.group(2)
    j += 1
    # location: read until next line is a 2-letter jur code
    loc_parts: list[str] = []
    while j < len(lines):
        s = lines[j].strip()
        if re.match(r"^[A-Z]{2}$", s):
            break
        loc_parts.append(s)
        j += 1
    location = " ".join(p for p in loc_parts if p).strip()
    juris = lines[j].strip(); j += 1
    # disposition date (optional — pending rows omit it)
    disp_date = ""
    if j < len(lines) and re.match(r"^\d{4}-\d{2}-\d{2}$", lines[j].strip()):
        disp_date = lines[j].strip()
        j += 1
    # Act header
    while j < len(lines) and lines[j].strip() != "Act":
        j += 1
    j += 5  # skip 5-line act header
    # act / section / description / equiv / [pts]
    act = lines[j].strip(); j += 1
    section = lines[j].strip(); j += 1
    # description: read until equiv code (4-digit numeric line)
    desc_parts: list[str] = []
    while j < len(lines):
        s = lines[j].strip()
        if re.match(r"^\d{4}$", s):
            break
        # also stop on driver header markers / next violation
        if s == "Violation Date" or s == "DL#/Jur:" or s.startswith("Section "):
            break
        desc_parts.append(s)
        j += 1
    desc = " ".join(p for p in desc_parts if p).strip()
    equiv = ""
    pts = None
    if j < len(lines) and re.match(r"^\d{4}$", lines[j].strip()):
        equiv = lines[j].strip()
        j += 1
        # pts is optional integer
        if j < len(lines) and lines[j].strip().isdigit():
            pts = int(lines[j].strip())
            j += 1
    return ({
        "date": date, "time": time, "ticket": ticket,
        "plate": plate, "plateJur": plate_jur,
        "location": location or None,
        "juris": juris or None,
        "dispDate": disp_date or None,
        "act": act, "section": section,
        "desc": desc, "equiv": equiv, "pts": pts,
    }, j)


def _parse_driver_context(lines: list[str], i: int) -> tuple[dict, int]:
    """Parse driver header at line i. Returns (context, next_index).
    context has driverName, dl, dlJur, cls, status (any may be empty)."""
    ctx = {"driverName": "", "dl": "", "dlJur": "", "cls": "", "status": ""}
    j = i
    # Optional driver name line (no colon, not a known header)
    if j < len(lines):
        s = lines[j].strip()
        if not s.startswith("DL#/Jur:") and not s.startswith("Violation Date") \
                and s and not s.startswith("Section ") and not s.startswith("Class:") \
                and not s.startswith("Status:"):
            ctx["driverName"] = s
            j += 1
    # DL#/Jur: line
    if j < len(lines) and lines[j].strip().startswith("DL#/Jur:"):
        rest = lines[j].split(":", 1)[1].strip()
        m = re.match(r"^(\S+)\s+([A-Z]{2})$", rest)
        if m:
            ctx["dl"], ctx["dlJur"] = m.group(1), m.group(2)
        elif rest == "null":
            pass  # both stay empty
        else:
            ctx["dl"] = rest
        j += 1
    # Class:
    if j < len(lines) and lines[j].strip().startswith("Class:"):
        ctx["cls"] = lines[j].split(":", 1)[1].strip()
        j += 1
    # Status:
    if j < len(lines) and lines[j].strip().startswith("Status:"):
        ctx["status"] = lines[j].split(":", 1)[1].strip()
        j += 1
    return ctx, j


def parse_contraventions(d: fitz.Document, page_range: range, with_driver: bool) -> list[dict]:
    """Walk the given pages collecting violation blocks. If with_driver,
    each block carries the most recently seen driver context (name/dl/dlJur/cls/status)."""
    text = "\n".join(d[i].get_text() for i in page_range)
    lines = text.splitlines()
    out: list[dict] = []
    ctx = {"driverName": "", "dl": "", "dlJur": "", "cls": "", "status": ""}
    i = 0
    while i < len(lines):
        s = lines[i].strip()
        if with_driver and (
            (s and not s.startswith(("Violation Date", "Section ", "Details", "Time", "Ticket"))
             and i + 1 < len(lines) and lines[i + 1].strip().startswith("DL#/Jur:"))
            or s.startswith("DL#/Jur:")
        ):
            ctx, i = _parse_driver_context(lines, i)
            continue
        if s == "Violation Date":
            block, i = _parse_violation_block(lines, i)
            if block is None:
                continue
            if with_driver:
                block.update({
                    "driverName": ctx["driverName"] or None,
                    "dl": ctx["dl"] or None,
                    "dlJur": ctx["dlJur"] or None,
                    "cls": ctx["cls"] or None,
                    "status": ctx["status"] or None,
                })
            # carrier rows just carry the violation fields (no driver context)
            out.append(block)
            continue
        i += 1
    return out


def main():
    d = fitz.open(str(PDF))
    data = json.loads(EXT.read_text(encoding="utf-8"))
    pull = data["pull"]

    # CVSA
    new_cvsa = parse_cvsa_list(d)
    print(f"CVSA list: {len(pull['cvsa']['list'])} -> {len(new_cvsa)}")
    pull["cvsa"]["list"] = new_cvsa

    # Accidents
    new_acc = parse_accidents(d)
    print(f"accidents: {len(pull['accidents'])} -> {len(new_acc)}")
    pull["accidents"] = new_acc

    # CVIP — PDF says no CVIP for this carrier
    print(f"cvip: {len(pull['cvip'])} -> 0  (PDF says 'No CVIP Inspections')")
    pull["cvip"] = []

    # §4.1 driver guilty — pages 8-11 (indices 7-10)
    new_drv = parse_contraventions(d, range(7, 11), with_driver=True)
    print(f"driverContraventions: {len(pull['driverContraventions'])} -> {len(new_drv)}")
    pull["driverContraventions"] = new_drv

    # §4.2 carrier guilty — page 12 (index 11)
    new_car = parse_contraventions(d, range(11, 12), with_driver=False)
    print(f"carrierContraventions: {len(pull['carrierContraventions'])} -> {len(new_car)}")
    pull["carrierContraventions"] = new_car

    # §4.3 pending driver — pages 13-14 (indices 12-13)
    new_pdrv = parse_contraventions(d, range(12, 14), with_driver=True)
    print(f"pendingDriverContraventions: {len(pull['pendingDriverContraventions'])} -> {len(new_pdrv)}")
    pull["pendingDriverContraventions"] = new_pdrv

    # §4.4 pending carrier — PDF says 'no contraventions to report'
    print(f"pendingCarrierContraventions: {len(pull['pendingCarrierContraventions'])} -> 0")
    pull["pendingCarrierContraventions"] = []

    EXT.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"wrote {EXT}")


if __name__ == "__main__":
    main()
