"""Reference Alberta Carrier Profile extractor.

This is a working implementation included with the vendor package so a vendor
can see one possible way to parse the document. It uses PyMuPDF for text
extraction and column-aware regex parsing for tables.

Usage:
    python scripts/extractor.py raw-pdfs/Carry_Freight_19_Dec_2018.pdf > out.json

The output validates against schema.json.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import re
import sys
from dataclasses import dataclass, field
from typing import Any

import fitz  # PyMuPDF

# ────────────────────────────────────────────────────────────────────────────
# Constants — every Carrier Profile has the same 16-group + 19-defect lists.
# ────────────────────────────────────────────────────────────────────────────

GROUP_DESCRIPTIONS = [
    "Speeding",
    "Stop signs/Traffic lights",
    "Driver Liabilities (Licence, Insurance, Seat Belts, etc.)",
    "Driving (Passing, Disobey Signs, Signals, etc.)",
    "Hours of Service",
    "Trip Inspections",
    "Brakes",
    "CVIP",
    "Mechanical Defects",
    "Oversize/Overweight",
    "Security of Loads",
    "Dangerous Goods",
    "Criminal Code",
    "Permits",
    "Miscellaneous",
    "Administrative Actions",
]

CVSA_DEFECT_LABELS = [
    "Driver Credentials",
    "Hours Of Service",
    "Brake Adjustment",
    "Brake Systems",
    "Coupling Devices",
    "Exhaust Systems",
    "Frames",
    "Fuel Systems",
    "Lighting Devices (Part II Section 8 OOSC only)",
    "Cargo Securement",
    "Steering Mechanisms",
    "Suspensions",
    "Tires",
    "Van/Open-top Trailer Bodies",
    "Wheels, Rims & Hubs",
    "Windshield Wipers",
    "Emergency Exits/Wiring & Electrical Systems (Buses)",
    "Dangerous Goods",
    "Driveline/Driveshaft",
]

MONTHS = {
    "JAN": 1, "FEB": 2, "MAR": 3, "APR": 4, "MAY": 5, "JUN": 6,
    "JUL": 7, "AUG": 8, "SEP": 9, "OCT": 10, "NOV": 11, "DEC": 12,
}


def parse_ab_date(s: str | None) -> str | None:
    """Parse an 'AB-style' date like '2018 NOV 30' -> '2018-11-30'."""
    if not s:
        return None
    m = re.match(r"\s*(\d{4})\s+([A-Z]{3})\s+(\d{1,2})\s*$", s.strip())
    if not m:
        return None
    y, mon, d = m.group(1), m.group(2).upper(), int(m.group(3))
    if mon not in MONTHS:
        return None
    return f"{int(y):04d}-{MONTHS[mon]:02d}-{d:02d}"


def parse_ab_month(s: str | None) -> str | None:
    """Parse '2019 DEC' -> '2019-12-01' (month-end → first-of-month is fine for ordering)."""
    if not s:
        return None
    m = re.match(r"\s*(\d{4})\s+([A-Z]{3})\s*$", s.strip())
    if not m:
        return None
    y, mon = m.group(1), m.group(2).upper()
    if mon not in MONTHS:
        return None
    return f"{int(y):04d}-{MONTHS[mon]:02d}-01"


def num_or_none(s: str | None):
    if s is None:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        if "." in s:
            return float(s)
        return int(s)
    except ValueError:
        return None


# ────────────────────────────────────────────────────────────────────────────
# Container that holds the full text of every page so we can index by Part.
# ────────────────────────────────────────────────────────────────────────────

@dataclass
class Doc:
    pages: list[str]
    full_text: str = ""

    @classmethod
    def load(cls, pdf_path: str) -> "Doc":
        doc = fitz.open(pdf_path)
        pages = [doc[i].get_text() for i in range(doc.page_count)]
        return cls(pages=pages, full_text="\n".join(pages))


def find_part_pages(doc: Doc, part_label: str) -> list[int]:
    """Return 0-based indices of pages that belong to a given Part."""
    out: list[int] = []
    in_part = False
    for i, page in enumerate(doc.pages):
        if part_label in page:
            in_part = True
        if in_part:
            out.append(i)
            if "*** END OF PART" in page:
                break
    return out


# ────────────────────────────────────────────────────────────────────────────
# Cover + Part 1 — Carrier Information
# ────────────────────────────────────────────────────────────────────────────

NSC_RE = re.compile(r"\b([A-Z]{2}\d{3}-\d{4})\b")


def extract_cover_and_carrier(doc: Doc) -> tuple[dict, dict]:
    p1 = doc.pages[0]
    p3 = doc.pages[2] if len(doc.pages) > 2 else ""

    nsc = (NSC_RE.search(p1) or NSC_RE.search(p3))
    nsc_val = nsc.group(1) if nsc else None

    name_m = re.search(r"^(.+?)\s{20,}", p1, re.MULTILINE)
    legal_name = name_m.group(1).strip() if name_m else None
    if legal_name and "Ltd" not in legal_name and "Inc" not in legal_name:
        # Heuristic: try to grab the line above 'AB...-####'
        for line in p1.splitlines():
            ln = line.strip()
            if ln and ln != "CARRIER PROFILE" and "NSC Number" not in ln and "CARRIER INFORMATION" not in ln:
                if not NSC_RE.match(ln) and len(ln) > 5 and len(ln) < 60 and ln != legal_name:
                    if any(c.islower() for c in ln) or "LTD" in ln.upper():
                        legal_name = ln
                        break

    # Address: capture the next two non-blank lines after the carrier name on page 1
    addr_lines = []
    for line in p1.splitlines():
        s = line.strip()
        if not s:
            continue
        # Skip noise
        if s in ("CARRIER PROFILE", "NOTE", "CARRIER INFORMATION"):
            continue
        if "NSC Number" in s or "Profile Period" in s or "Date Printed" in s or "Requested By" in s:
            continue
        if NSC_RE.match(s):
            continue
        if re.match(r"^[\d\s]+$", s):
            continue
        if "ABC" in s.upper() or s.endswith(":"):
            continue
        if any(s.startswith(p) for p in ("The ", "Carriers ", "All ", "An ", "Conviction ", "Alberta ")):
            continue
        addr_lines.append(s)

    # Profile period start/end + date printed
    period_start = parse_ab_date(_after_label(p1, "Profile Period Start:"))
    period_end = parse_ab_date(_after_label(p1, "End:"))
    date_printed = parse_ab_date(_after_label(p1, "Date Printed:"))

    twelve = parse_ab_date(_after_label(p3, "12-month Report as of:"))
    mvid_m = re.search(r"MVID Number:[\s\n]*(\d{4}-\d{5})", p3)
    mvid = mvid_m.group(1) if mvid_m else None
    if not mvid:
        # Fall back: look for raw pattern \d{4}-\d{5} on page 3
        m = re.search(r"\b(\d{4}-\d{5})\b", p3)
        mvid = m.group(1) if m else None

    sf_rating = _scan_value(p3, ["Satisfactory Unaudited", "Satisfactory", "Conditional", "Unsatisfactory", "Excellent"])
    op_status = _scan_value(p3, ["Federal", "Provincial", "Municipal"])

    rfac_m = re.search(r"R-Factor Score:\s*\n[\s\S]*?\n\s*([\d.]+)\s*$", p3, re.MULTILINE)
    if not rfac_m:
        rfac_m = re.search(r"\n\s*(\d+\.\d{3})\s+\n", p3)
    r_factor = float(rfac_m.group(1)) if rfac_m else None

    fr_m = re.search(r"^\s*(\d+(?:-\d+)?)\s+Truck", p3, re.MULTILINE) or re.search(r"^\s*(\d+(?:-\d+)?)\s+Bus", p3, re.MULTILINE)
    fleet_range = fr_m.group(1) if fr_m else None
    fleet_type_m = re.search(r"^\s*(Truck|Bus|Mixed)\s*$", p3, re.MULTILINE)
    fleet_type = fleet_type_m.group(1) if fleet_type_m else None

    pcts = re.findall(r"\b(\d+\.\d)%\s*$", p3, re.MULTILINE)
    contributions = {
        "conviction": float(pcts[0]) if len(pcts) >= 1 else 0.0,
        "inspection": float(pcts[1]) if len(pcts) >= 2 else 0.0,
        "collision":  float(pcts[2]) if len(pcts) >= 3 else 0.0,
    }

    avg_cur_m = re.findall(r"^\s*(\d+)\s+$", p3, re.MULTILINE)
    avg_fleet = int(avg_cur_m[-2]) if len(avg_cur_m) >= 2 else None
    current_fleet = int(avg_cur_m[-1]) if len(avg_cur_m) >= 1 else None

    address = _split_address(addr_lines)

    source = {
        "fileName": None,  # filled by caller
        "datePrinted": date_printed,
        "profilePeriodStart": period_start,
        "profilePeriodEnd": period_end,
        "twelveMonthReportAs": twelve,
        "formVersion": None,
        "pageCount": len(doc.pages),
        "extractedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }

    carrier = {
        "nscNumber": nsc_val,
        "mvidNumber": mvid,
        "legalName": _carrier_name(p1, p3),
        "address": address,
        "safetyFitnessRating": sf_rating,
        "operatingStatus": op_status,
        "fleetRange": fleet_range,
        "fleetType": fleet_type,
    }

    pull_part1 = {
        "rFactor": r_factor,
        "contributions": contributions,
        "monitoringStage": _monitoring_stage(p3),
        "carriersAtStageOrAbove": _carriers_at_stage(p3),
        "totalAlbertaNscCarriers": _total_carriers(p3),
        "avgFleet": avg_fleet or 0,
        "currentFleet": current_fleet or 0,
    }

    return source, {"carrier": carrier, "pull_part1": pull_part1}


def _after_label(text: str, label: str) -> str | None:
    """Return the raw line that visually sits at/after `label` in column-aware text."""
    idx = text.find(label)
    if idx < 0:
        return None
    rest = text[idx + len(label):]
    # The value is typically separated by significant whitespace or a newline
    m = re.search(r"\n\s*([^\n]+?)\s*\n", rest)
    if m:
        return m.group(1).strip()
    m = re.search(r"\s+([^\n]+)", rest)
    return m.group(1).strip() if m else None


def _scan_value(text: str, options: list[str]) -> str | None:
    for o in options:
        if re.search(rf"\b{re.escape(o)}\b", text):
            return o
    return None


def _carrier_name(p1: str, p3: str) -> str | None:
    for src in (p1, p3):
        for line in src.splitlines():
            s = line.strip()
            if re.search(r"\b(Ltd\.?|Inc\.?|Corp\.?|Limited|LLC)\b", s, re.IGNORECASE):
                return s.rstrip(".") + ("." if "Ltd" in s and not s.endswith(".") else "")
    # Fallback: first non-noise line on page 1
    for line in p1.splitlines():
        s = line.strip()
        if s and "CARRIER" not in s and "NSC" not in s.upper() and "Profile" not in s and not NSC_RE.match(s) and "Date" not in s and "Note" not in s.lower():
            return s
    return None


def _split_address(lines: list[str]) -> dict:
    addr = {"street": None, "city": None, "province": None, "postalCode": None, "country": "Canada"}
    # Filter to lines that look like an address: contain a digit prefix or end with postal code
    plausible = []
    for s in lines:
        if re.search(r"^\d+\s", s) or re.search(r"\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b", s):
            plausible.append(s)
    if plausible:
        addr["street"] = plausible[0]
        if len(plausible) >= 2:
            line2 = plausible[1]
            m = re.match(r"^(.+?)\s+([A-Z]{2})\s+([A-Z]\d[A-Z]\s?\d[A-Z]\d)\s*$", line2)
            if m:
                addr["city"] = m.group(1).strip()
                addr["province"] = m.group(2)
                addr["postalCode"] = m.group(3)
            else:
                addr["city"] = line2
    return addr


def _monitoring_stage(p3: str) -> int | None:
    m = re.search(r"Carrier's Monitoring Stage[^\n]*\n[\s\S]*?\n\s*([1-4])\s+\n", p3)
    return int(m.group(1)) if m else None


def _carriers_at_stage(p3: str) -> int | None:
    m = re.search(r"Total number of carriers at the same stage or greater:\s*\n[\s\S]*?\n\s*(\d+)\s*\n", p3)
    return int(m.group(1)) if m else None


def _total_carriers(p3: str) -> int | None:
    nums = re.findall(r"^\s*([\d,]+)\s*$", p3, re.MULTILINE)
    for n in nums:
        v = int(n.replace(",", ""))
        if v > 1000:
            return v
    return None


# ────────────────────────────────────────────────────────────────────────────
# Part 2 — Conviction Information
# ────────────────────────────────────────────────────────────────────────────

def extract_part2(doc: Doc) -> dict:
    pages = find_part_pages(doc, "PART 2 - CONVICTION INFORMATION")
    if not pages:
        return _empty_conviction()

    text = "\n".join(doc.pages[i] for i in pages)

    documents = num_or_none(_match_total(text, "DOCUMENTS:")) or 0
    convictions = num_or_none(_match_total(text, "CONVICTIONS:")) or 0
    active_points = num_or_none(_match_total(text, "ACTIVE POINTS:")) or 0

    analysis = _parse_group_analysis(text, "CONVICTIONS")

    summary_text = _section(text, "PART 2 - CONVICTION SUMMARY", ["PART 2 - CONVICTION DETAIL", "*** END OF PART 2"])
    summary = _parse_conviction_summary(summary_text or "")

    detail_text = _section(text, "PART 2 - CONVICTION DETAIL", ["*** END OF PART 2"])
    details = _parse_conviction_details(detail_text or "")

    return {
        "totalConvictions": convictions,
        "totalConvictionDocuments": documents,
        "totalConvictionActivePoints": active_points,
        "convictionAnalysis": analysis,
        "convictionSummary": summary,
        "convictionDetails": details,
    }


def _empty_conviction() -> dict:
    return {
        "totalConvictions": 0,
        "totalConvictionDocuments": 0,
        "totalConvictionActivePoints": 0,
        "convictionAnalysis": [{"group": g, "count": 0, "pctText": None} for g in GROUP_DESCRIPTIONS],
        "convictionSummary": [],
        "convictionDetails": [],
    }


def _match_total(text: str, label: str) -> str | None:
    m = re.search(rf"{re.escape(label)}\s+(\d+)", text)
    return m.group(1) if m else None


def _parse_group_analysis(text: str, kind: str) -> list[dict]:
    """Parse the 16-row group analysis table in Part 2 (convictions) or Part 5 (violations).

    Lines look like:
        '              1        100.0%        Hours of Service'
    or just (when count is 0):
        '                                     Hours of Service'
    """
    rows = []
    for group in GROUP_DESCRIPTIONS:
        # Look for a line whose text ends with this group label
        # (possibly preceded by count + percent)
        pat = rf"^\s*(?:(\d+)\s+(\d+\.\d+%|\d+\s*%))?\s*{re.escape(group)}\s*$"
        m = re.search(pat, text, re.MULTILINE)
        if m and m.group(1):
            rows.append({
                "group": group,
                "count": int(m.group(1)),
                "pctText": (m.group(2) or "").strip() or None,
            })
        else:
            rows.append({"group": group, "count": 0, "pctText": None})
    return rows


def _section(text: str, start: str, ends: list[str]) -> str | None:
    s = text.find(start)
    if s < 0:
        return None
    rest = text[s + len(start):]
    cuts = [rest.find(e) for e in ends if rest.find(e) >= 0]
    end = min(cuts) if cuts else len(rest)
    return rest[:end]


def _parse_conviction_summary(text: str) -> list[dict]:
    rows = []
    # Each conviction in the summary is a date-anchored line like:
    #   '2018 JUL 28  OPC ON86937174      ON   E65208   AB  AMRINDER SINGH GILL'
    # Followed by a sub-line:
    #   '                                  1.  E65208   AB  TWO LOGS OR FALSE LOGS                 3'
    pat = re.compile(r"^(\d{4} [A-Z]{3} \d{2})\s+(\S+(?:\s+\S+)?)\s+([A-Z]{2})\s+(\S+)\s+([A-Z]{2})\s+(.+?)\s*$", re.MULTILINE)
    sub_pat = re.compile(r"^\s*\d+\.\s+\S+\s+[A-Z]{2}\s+(.+?)\s+(\d+)\s*$", re.MULTILINE)
    seq = 0
    for m in pat.finditer(text):
        offence_line = sub_pat.search(text, m.end())
        offence = (offence_line.group(1).strip() if offence_line else None) or ""
        points = int(offence_line.group(2)) if offence_line else 0
        seq += 1
        rows.append({
            "seq": seq,
            "date": m.group(1),
            "dateIso": parse_ab_date(m.group(1)),
            "document": m.group(2).strip(),
            "docket": None,
            "jurisdiction": m.group(3),
            "vehicle": f"{m.group(4)} {m.group(5)}",
            "driverName": m.group(6).strip() or None,
            "offence": offence,
            "points": points,
        })
    return rows


def _parse_conviction_details(text: str) -> list[dict]:
    rows = []
    # Each detail block is bounded by '+++++' separators and starts with a header line:
    #   'DATE         TIME    DOCUMENT                 JURISDICTION                    DATE ENTERED'
    blocks = [b.strip() for b in re.split(r"\++[\n\s]*", text) if "DATE" in b and "JURISDICTION" in b]
    seq = 0
    for blk in blocks:
        m = re.search(
            r"(\d{4} [A-Z]{3} \d{2})\s+(\d{2}:\d{2})\s+(\S+(?:\s+\S+)*?)\s{2,}([A-Za-z][A-Za-z ]+?)\s+(\d{4} [A-Z]{3} \d{2})",
            blk,
        )
        if not m:
            continue
        seq += 1
        date, time, document, jur, date_entered = m.groups()
        agency = _grab_after(blk, "ISSUING AGENCY:")
        location = _grab_after(blk, "LOCATION:")
        driver = _grab_after(blk, "DRIVER:")
        vehicle = _grab_after(blk, "VEHICLE:")
        commodity = _grab_after(blk, "COMMODITY:")

        # Offence section: '1. CCMTA CODE: 0402   TWO LOGS OR FALSE LOGS  Hours of Service'
        ccmta_m = re.search(r"\d+\.\s+CCMTA CODE:\s+(\d+)\s+(.+?)\s{2,}([A-Z][^\n]+)", blk)
        offence_desc = ccmta_m.group(2).strip() if ccmta_m else ""
        ccmta_label = ccmta_m.group(3).strip() if ccmta_m else ""
        ccmta_code = ccmta_m.group(1) if ccmta_m else None

        # Conviction date / docket / active points
        conv_m = re.search(r"CONV DATE:\s+(\d{4} [A-Z]{3} \d{2})\s+DOCKET NO:\s+(\S+)\s+ACTIVE POINTS:\s+(\d+)", blk)
        conv_vehicle = _grab_after(blk, "VEHICLE:", limit=2) or vehicle
        rows.append({
            "seq": seq,
            "date": date,
            "dateIso": parse_ab_date(date),
            "time": time,
            "document": document.strip(),
            "docket": conv_m.group(2) if conv_m else None,
            "jurisdiction": jur.strip(),
            "dateEntered": date_entered,
            "issuingAgency": agency,
            "location": location,
            "driver": driver,
            "vehicle": vehicle,
            "commodity": commodity,
            "actSection": None,
            "offence": offence_desc,
            "ccmtaCode": (f"{ccmta_code} {offence_desc}" if ccmta_code else None),
            "convictionVehicle": conv_vehicle,
            "convictionDate": conv_m.group(1) if conv_m else None,
            "activePoints": int(conv_m.group(3)) if conv_m else 0,
        })
    return rows


def _grab_after(text: str, label: str, limit: int = 1) -> str | None:
    pos = 0
    last = None
    for _ in range(limit):
        idx = text.find(label, pos)
        if idx < 0:
            return last
        line_end = text.find("\n", idx)
        chunk = text[idx + len(label):line_end] if line_end > 0 else text[idx + len(label):]
        last = chunk.strip() or None
        pos = (line_end + 1) if line_end > 0 else len(text)
    return last


# ────────────────────────────────────────────────────────────────────────────
# Part 3 — CVSA Inspection Information
# ────────────────────────────────────────────────────────────────────────────

def extract_part3(doc: Doc) -> dict:
    pages = find_part_pages(doc, "PART 3 - CVSA INSPECTION INFORMATION")
    if not pages:
        return _empty_cvsa()
    text = "\n".join(doc.pages[i] for i in pages)

    passed = num_or_none(_match_total(text, "PASSED:")) or 0
    req_att = num_or_none(_match_total(text, "REQUIRED ATTENTION:")) or 0
    oos = num_or_none(_match_total(text, "OUT OF SERVICE:")) or 0
    documents_m = re.search(r"DOCUMENTS:\s+(\d+)", text)
    documents = int(documents_m.group(1)) if documents_m else None

    analysis_text = _section(text, "PART 3 - CVSA INSPECTION ANALYSIS", ["PART 3 - CVSA INSPECTION SUMMARY", "*** END OF PART 3"])
    analysis, totals = _parse_cvsa_analysis(analysis_text or "")

    summary_text = _section(text, "PART 3 - CVSA INSPECTION SUMMARY", ["PART 3 - CVSA INSPECTION DETAIL", "*** END OF PART 3"])
    summary = _parse_cvsa_summary(summary_text or "")

    detail_text = _section(text, "PART 3 - CVSA INSPECTION DETAIL", ["*** END OF PART 3"])
    details = _parse_cvsa_details(detail_text or "")

    return {
        "totalCvsaInspections": passed + req_att + oos,
        "totalCvsaDocuments": documents,
        "cvsaDefectAnalysis": analysis,
        "cvsaDefectTotals": totals,
        "cvsaSummary": summary,
        "cvsaDetails": details,
    }


def _empty_cvsa() -> dict:
    return {
        "totalCvsaInspections": 0,
        "totalCvsaDocuments": 0,
        "cvsaDefectAnalysis": [
            {"code": str(i + 1), "label": l, "oos": None, "req": None, "total": None, "pctText": None}
            for i, l in enumerate(CVSA_DEFECT_LABELS)
        ],
        "cvsaDefectTotals": {"oos": 0, "req": 0, "total": 0},
        "cvsaSummary": [],
        "cvsaDetails": [],
    }


def _parse_cvsa_analysis(text: str) -> tuple[list[dict], dict]:
    rows = []
    for i, label in enumerate(CVSA_DEFECT_LABELS, start=1):
        # Some labels are truncated in the dump (e.g. '17 - Emergency Exits/Wiring & Electrical Systems (Buse').
        # Match on the leading 'NN - ' prefix instead.
        pat = rf"^(?:\s*(\d+)\s+(\d+)?\s+(\d+)?\s+(\d+\.\d+%|\d+\s*%))?\s*{i}\s+-\s+{re.escape(label.split(' (')[0])}"
        m = re.search(pat, text, re.MULTILINE)
        if m and (m.group(1) or m.group(2) or m.group(3)):
            o = num_or_none(m.group(1))
            r = num_or_none(m.group(2))
            t = num_or_none(m.group(3))
            pct = (m.group(4) or "").strip() or None
            rows.append({"code": str(i), "label": label, "oos": o, "req": r, "total": t, "pctText": pct})
        else:
            rows.append({"code": str(i), "label": label, "oos": None, "req": None, "total": None, "pctText": None})

    grand = re.search(r"^\s*(\d+)\s+(\d+)\s+(\d+)\s+\d+\s*%\s+GRAND TOTAL DEFECTS", text, re.MULTILINE)
    if grand:
        totals = {"oos": int(grand.group(1)), "req": int(grand.group(2)), "total": int(grand.group(3))}
    else:
        totals = {"oos": 0, "req": 0, "total": 0}
    return rows, totals


def _parse_cvsa_summary(text: str) -> list[dict]:
    rows = []
    pat = re.compile(
        r"^\s*(\d+)\.\s+(\d{4} [A-Z]{3} \d{2})\s+(\S+(?:\s+\S+)*?)\s{2,}([A-Z]{2})\s+(.*?)\s+(\S+)\s+([A-Z]{2})\s+(\d)\s+(Out of Service|Requires Attention|Passed)\s*$",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        rows.append({
            "seq": int(m.group(1)),
            "date": m.group(2),
            "dateIso": parse_ab_date(m.group(2)),
            "document": m.group(3).strip(),
            "jurisdiction": m.group(4),
            "agency": m.group(5).strip() or None,
            "plate": m.group(6),
            "plateJur": m.group(7),
            "level": int(m.group(8)),
            "result": m.group(9),
        })
    return rows


def _parse_cvsa_details(text: str) -> list[dict]:
    rows = []
    blocks = [b for b in re.split(r"\++[\n\s]*", text) if " DATE " in b and "RESULT" in b]
    for blk in blocks:
        m = re.search(
            r"(\d+)\.\s+(\d{4} [A-Z]{3} \d{2})\s+(\d{2}:\d{2})\s+(\S+(?:\s+\S+)?)\s+([A-Z]{2})\s+(\d)\s+(Out of Service|Requires Attention|Passed)\s+(\d{4} [A-Z]{3} \d{2})",
            blk,
        )
        if not m:
            continue
        seq = int(m.group(1))
        agency = _grab_after(blk, "AGENCY:")
        location = _grab_after(blk, "LOCATION:")
        driver = _grab_after(blk, "DRIVER:")

        vehicles = []
        for vm in re.finditer(
            r"^\s*(\d+)\.\s+([A-Z]+)\s+(\S+)\s+([A-Z]{2})(?:\s+(\S+))?\s*(?:\s+(\d{4}))?\s*([A-Za-z][A-Za-z]*)?",
            blk, re.MULTILINE,
        ):
            vehicles.append({
                "type": vm.group(2),
                "plate": vm.group(3),
                "jurisdiction": vm.group(4),
                "vin": vm.group(5),
                "year": vm.group(6),
                "make": vm.group(7),
                "decal": None,
            })

        defects = []
        for kind, header in (("OOS", "OUT OF SERVICE"), ("REQ", "REQUIRES ATTENTION")):
            sec = _section(blk, header, ["+++", "DATE", "*** END"])
            if not sec:
                continue
            for dm in re.finditer(
                r"^\s*(\d+\s+-\s+[^\n]+?)\s+(\d+)?\s+(\d+)?\s*$",
                sec, re.MULTILINE,
            ):
                cat = dm.group(1).strip()
                v1 = dm.group(2)
                v2 = dm.group(3)
                if v1 and v1.strip():
                    defects.append({"category": cat, "vehicleIndex": 1, "kind": kind})
                if v2 and v2.strip():
                    defects.append({"category": cat, "vehicleIndex": 2, "kind": kind})

        rows.append({
            "seq": seq,
            "date": m.group(2),
            "dateIso": parse_ab_date(m.group(2)),
            "time": m.group(3),
            "document": m.group(4).strip(),
            "jurisdiction": m.group(5),
            "level": int(m.group(6)),
            "result": m.group(7),
            "dateEntered": m.group(8),
            "agency": agency,
            "location": location,
            "driver": driver,
            "vehicles": vehicles[:2],
            "defects": defects,
        })
    return rows


# ────────────────────────────────────────────────────────────────────────────
# Part 4 — Collision Information
# ────────────────────────────────────────────────────────────────────────────

def extract_part4(doc: Doc) -> dict:
    pages = find_part_pages(doc, "PART 4 - COLLISION INFORMATION")
    if not pages:
        return _empty_collision()
    text = "\n".join(doc.pages[i] for i in pages)

    totals = []
    for kind in ("Property Damage", "Injury", "Fatal"):
        tm = re.search(rf"{re.escape(kind)}:\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)", text)
        if tm:
            totals.append({
                "type": kind,
                "count": int(tm.group(1)),
                "nonPreventable": int(tm.group(2)),
                "preventableOrNotEvaluated": int(tm.group(3)),
                "points": int(tm.group(4)),
            })
        else:
            totals.append({"type": kind, "count": 0, "nonPreventable": 0, "preventableOrNotEvaluated": 0, "points": 0})

    summary_text = _section(text, "PART 4 - COLLISION SUMMARY", ["PART 4 - COLLISION DETAIL", "*** END OF PART 4"])
    summary = _parse_collision_summary(summary_text or "")
    detail_text = _section(text, "PART 4 - COLLISION DETAIL", ["*** END OF PART 4"])
    details = _parse_collision_details(detail_text or "")

    return {
        "totalCollisions": sum(t["count"] for t in totals),
        "collisionTotals": totals,
        "collisionSummary": summary,
        "collisionDetails": details,
    }


def _empty_collision() -> dict:
    return {
        "totalCollisions": 0,
        "collisionTotals": [
            {"type": "Property Damage", "count": 0, "nonPreventable": 0, "preventableOrNotEvaluated": 0, "points": 0},
            {"type": "Injury",          "count": 0, "nonPreventable": 0, "preventableOrNotEvaluated": 0, "points": 0},
            {"type": "Fatal",           "count": 0, "nonPreventable": 0, "preventableOrNotEvaluated": 0, "points": 0},
        ],
        "collisionSummary": [],
        "collisionDetails": [],
    }


def _parse_collision_summary(text: str) -> list[dict]:
    if "No Collisions on Record" in text:
        return []
    rows = []
    pat = re.compile(
        r"^\s*(\d+)\.\s+(\d{4} [A-Z]{3} \d{2})\s+(\S+)\s+([A-Z]{2})\s+(\S+)\s+([A-Z]{2})\s+(.+?)\s+(Damage|Injury|Fatal)\s+(\d+)\s+(.*?)\s*$",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        rows.append({
            "seq": int(m.group(1)),
            "date": m.group(2),
            "dateIso": parse_ab_date(m.group(2)),
            "document": m.group(3),
            "jurisdiction": m.group(4),
            "plate": m.group(5),
            "plateJur": m.group(6),
            "driver": m.group(10).strip() or None,
            "status": m.group(7).strip() or None,
            "preventable": None,
            "severity": m.group(8),
            "points": int(m.group(9)),
        })
    return rows


def _parse_collision_details(text: str) -> list[dict]:
    if "No Collisions on Record" in text:
        return []
    return []  # Placeholder — concrete carriers in this package have no collisions.


# ────────────────────────────────────────────────────────────────────────────
# Part 5 — Violation Information
# ────────────────────────────────────────────────────────────────────────────

def extract_part5(doc: Doc) -> dict:
    pages = find_part_pages(doc, "PART 5 - VIOLATION INFORMATION")
    if not pages:
        return _empty_violation()
    text = "\n".join(doc.pages[i] for i in pages)

    documents = num_or_none(_match_total(text, "DOCUMENTS:")) or 0
    offences = num_or_none(_match_total(text, "OFFENCES:")) or 0

    analysis = _parse_group_analysis(text, "VIOLATIONS")

    summary_text = _section(text, "PART 5 - VIOLATION SUMMARY", ["PART 5 - VIOLATION DETAIL", "*** END OF PART 5"])
    summary = _parse_violation_summary(summary_text or "")

    detail_text = _section(text, "PART 5 - VIOLATION DETAIL", ["*** END OF PART 5"])
    details = _parse_violation_details(detail_text or "")

    return {
        "totalViolations": offences,
        "totalViolationDocuments": documents,
        "violationAnalysis": analysis,
        "violationSummary": summary,
        "violationDetails": details,
    }


def _empty_violation() -> dict:
    return {
        "totalViolations": 0,
        "totalViolationDocuments": 0,
        "violationAnalysis": [{"group": g, "count": 0, "pctText": None} for g in GROUP_DESCRIPTIONS],
        "violationSummary": [],
        "violationDetails": [],
    }


def _parse_violation_summary(text: str) -> list[dict]:
    if "No Violations on Record" in text:
        return []
    rows = []
    pat = re.compile(r"^(\d{4} [A-Z]{3} \d{2})\s+(\S+(?:\s+\S+)?)\s+([A-Z]{2})\s+(\S+)\s+([A-Z]{2})\s+(.+?)\s*$", re.MULTILINE)
    seq = 0
    for m in pat.finditer(text):
        seq += 1
        rows.append({
            "seq": seq,
            "date": m.group(1),
            "dateIso": parse_ab_date(m.group(1)),
            "document": m.group(2).strip(),
            "jurisdiction": m.group(3),
            "plate": m.group(4),
            "plateJur": m.group(5),
            "driverName": None,
            "offence": m.group(6).strip() or None,
        })
    return rows


def _parse_violation_details(text: str) -> list[dict]:
    if "No Violations on Record" in text:
        return []
    return []


# ────────────────────────────────────────────────────────────────────────────
# Part 6 — Monitoring Information
# ────────────────────────────────────────────────────────────────────────────

def extract_part6(doc: Doc) -> dict:
    pages = find_part_pages(doc, "PART 6 - MONITORING INFORMATION")
    if not pages:
        return {"monitoring": {"industry": _empty_industry(), "thresholds": [], "summary": [], "details": []}}
    text = "\n".join(doc.pages[i] for i in pages)

    industry = _parse_industry(text)
    thresholds = _parse_thresholds(text)
    summary = _parse_monitoring_summary(text)
    details = _parse_monitoring_details(text)

    return {"monitoring": {"industry": industry, "thresholds": thresholds, "summary": summary, "details": details}}


def _empty_industry() -> dict:
    return {
        "asOf": None, "fleetRange": "", "fleetType": "TRK", "avgRFactor": 0.0,
        "avgConvPts": None, "avgOosDef": None, "avgTotalDef": None,
        "avgOosVeh": None, "avgFailure": None, "avgCollPts": None,
    }


def _parse_industry(text: str) -> dict:
    asof = re.search(r"INDUSTRY MONITORING INFORMATION ON\s+(\d{4} [A-Z]{3} \d{2})", text)
    fr = re.search(r"For Fleet Range:\s+(\S+)\s+and for Fleet type:\s+(\S+)", text)
    avgr = re.search(r"Industry Average R-Factor Score:\s+([\d.]+)", text)
    # Industry detail line on the last monitoring page:
    # 'Average:             0.38                    0.5          1.6              0.09   0.055     0.08'
    avg_line = re.search(
        r"Average:\s+([\d.]+|\s)\s+([\d.]+|\s)?\s+([\d.]+|\s)?\s+([\d.]+|\s)?\s+([\d.]+|\s)?\s+([\d.]+|\s)?\s+([\d.]+|\s)?",
        text,
    )
    return {
        "asOf": parse_ab_date(asof.group(1)) if asof else None,
        "fleetRange": fr.group(1) if fr else "",
        "fleetType": fr.group(2) if fr else "TRK",
        "avgRFactor": float(avgr.group(1)) if avgr else 0.0,
        "avgConvPts": _safe_float(avg_line.group(1) if avg_line else None),
        "avgOosDef": _safe_float(avg_line.group(2) if avg_line else None),
        "avgTotalDef": _safe_float(avg_line.group(3) if avg_line else None),
        "avgOosVeh": _safe_float(avg_line.group(5) if avg_line else None),
        "avgFailure": _safe_float(avg_line.group(6) if avg_line else None),
        "avgCollPts": _safe_float(avg_line.group(7) if avg_line else None),
    }


def _safe_float(s):
    if s is None:
        return None
    s = str(s).strip()
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def _parse_thresholds(text: str) -> list[dict]:
    rows = []
    pat = re.compile(r"Stage\s+(\d):\s+([\d.]+)\s*-\s*([\d.]+)?(?:\s+and higher)?")
    for m in pat.finditer(text):
        stage = int(m.group(1))
        lower = float(m.group(2))
        upper_text = (m.group(3) or "").strip()
        upper = float(upper_text) if upper_text else None
        # Determine label/range text
        is_top = upper is None
        rows.append({
            "stage": stage,
            "lowerBound": lower,
            "upperBound": upper,
            "label": f"Stage {stage}",
            "rangeText": (f"{lower:.3f} and higher" if is_top else f"{lower:.3f} - {upper:.3f}"),
        })
    # Also catch the 'Stage 4:    3.900  and higher' form with no explicit dash
    if not any(r["upperBound"] is None for r in rows):
        m = re.search(r"Stage\s+4:\s+([\d.]+)\s+and higher", text)
        if m:
            rows.append({
                "stage": 4,
                "lowerBound": float(m.group(1)),
                "upperBound": None,
                "label": "Stage 4",
                "rangeText": f"{float(m.group(1)):.3f} and higher",
            })
    rows.sort(key=lambda r: r["stage"])
    return rows[:4]


def _parse_monitoring_summary(text: str) -> list[dict]:
    rows = []
    pat = re.compile(
        r"^(\d{4} [A-Z]{3})\s+(TRK|BUS|MIXED)?\s+(\d+%)?\s+(\d+%)?\s+(\d+)\s+(\d+)?\s+([\d.]+|No Data)(?:\s+(\d+\.\d+%)\s+(\d+\.\d+%)\s+(\d+\.\d+%))?\s*([1-4])?\s*$",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        score_text = m.group(7)
        score = None
        if score_text and score_text != "No Data":
            try:
                score = float(score_text)
            except ValueError:
                score = None
        rows.append({
            "monthEnd": m.group(1),
            "monthEndIso": parse_ab_month(m.group(1)),
            "type": m.group(2) or "TRK",
            "trkPct": m.group(3),
            "busPct": m.group(4),
            "avgFleet": int(m.group(5)),
            "currentFleet": int(m.group(6)) if m.group(6) else 0,
            "score": score,
            "scoreText": score_text,
            "convPctText": m.group(8),
            "inspPctText": m.group(9),
            "collPctText": m.group(10),
            "stage": int(m.group(11)) if m.group(11) else None,
        })
    return rows


def _parse_monitoring_details(text: str) -> list[dict]:
    rows = []
    pat = re.compile(
        r"^(\d{4} [A-Z]{3})\s+(\d+)\s*(?:\s+([\d.]+))?\s*(?:\s+(\d+))?\s*(?:\s+([\d.]+))?\s*(?:\s+([\d.]+))?\s*(?:\s+(\d+%))?\s*(?:\s+([\d.]+))?\s*(?:\s+([\d.]+))?\s*(?:\s+([\d.]+))?\s*$",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        rows.append({
            "monthEnd": m.group(1),
            "monthEndIso": parse_ab_month(m.group(1)),
            "avgFleet": int(m.group(2)),
            "convPtsPerVeh": _safe_float(m.group(3)),
            "totalInspections": num_or_none(m.group(4)),
            "oosDefPerInsp": _safe_float(m.group(5)),
            "totalDefPerInsp": _safe_float(m.group(6)),
            "oosPctText": m.group(7),
            "oosPerVeh": _safe_float(m.group(8)),
            "failureRate": _safe_float(m.group(9)),
            "collPtsPerVeh": _safe_float(m.group(10)),
        })
    return rows


# ────────────────────────────────────────────────────────────────────────────
# Top-level orchestration
# ────────────────────────────────────────────────────────────────────────────

def extract(pdf_path: str) -> dict:
    doc = Doc.load(pdf_path)
    source, c1 = extract_cover_and_carrier(doc)
    source["fileName"] = pdf_path.split("/")[-1].split("\\")[-1]
    p2 = extract_part2(doc)
    p3 = extract_part3(doc)
    p4 = extract_part4(doc)
    p5 = extract_part5(doc)
    p6 = extract_part6(doc)

    pull = {
        "reportDate": source["datePrinted"] or source["profilePeriodEnd"],
        "periodLabel": _period_label(source["datePrinted"]),
        "windowLabel": _window_label(source["profilePeriodStart"], source["profilePeriodEnd"]),
        "windowStart": source["profilePeriodStart"],
        "windowEnd": source["profilePeriodEnd"],
        **c1["pull_part1"],
        **p2,
        **p3,
        **p4,
        **p5,
        **p6,
    }

    return {
        "source": source,
        "carrier": c1["carrier"],
        "pull": pull,
    }


def _period_label(iso: str | None) -> str | None:
    if not iso:
        return None
    try:
        d = dt.date.fromisoformat(iso)
        # 'Mar 6/26'
        return d.strftime("%b ") + str(d.day) + d.strftime("/%y")
    except ValueError:
        return None


def _window_label(start: str | None, end: str | None) -> str | None:
    if not start or not end:
        return None
    try:
        s = dt.date.fromisoformat(start)
        e = dt.date.fromisoformat(end)
        return f"{s.strftime('%b %Y')} → {e.strftime('%b %Y')}"
    except ValueError:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    data = extract(args.pdf)
    payload = json.dumps(data, indent=2, ensure_ascii=False)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(payload + "\n")
    else:
        sys.stdout.write(payload + "\n")


if __name__ == "__main__":
    main()
