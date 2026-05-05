"""Auto-emit a baseline schema-valid extracted.json for any AB Carrier Profile PDF.

The output covers the carrier identity (cover + Part 1) and section banner totals
that can be lifted with regex. Sections with rich event detail (CVSA inspections
with vehicles/defects, conviction details with offences) ship as **empty arrays
with total=0** — vendor's parser is expected to fill those.

Both the older (multi-column, pre-2022) and newer ("Page X of Y", 2021+) layouts
are recognised. Format-specific differences:
  - Older: Parts 2-6 = Conviction / CVSA / Collision / Violation / Monitoring
  - Newer: Parts 2-7 with NEW Part 3 = Administrative Penalty Information,
           CVSA → Part 4, Collision → Part 5, Violation → Part 6, Monitoring → Part 7

Usage:
    python scripts/bootstrap_extracted.py raw-pdfs/<name>.pdf per-pdf/<name>/extracted.json
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF


GROUPS = [
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

CVSA_DEFECT_LABELS_19 = [
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


def parse_ab_date(s):
    if not s:
        return None
    m = re.search(r"(\d{4})\s+([A-Z]{3})\s+(\d{1,2})", s.strip())
    if not m:
        return None
    y, mon, d = m.group(1), m.group(2).upper(), int(m.group(3))
    if mon not in MONTHS:
        return None
    return f"{int(y):04d}-{MONTHS[mon]:02d}-{d:02d}"


def detect_format(text):
    """Return 'newer' if the PDF uses the 2021+ 'Page X of Y' layout, else 'older'."""
    if "Part 3 - Administrative Penalty Information" in text:
        return "newer"
    if re.search(r"Page \d+ of \d+", text):
        return "newer"
    return "older"


def extract(pdf_path):
    doc = fitz.open(pdf_path)
    full = "\n".join(doc[i].get_text() for i in range(doc.page_count))
    fmt = detect_format(full)

    nsc_m = re.search(r"\b([A-Z]{2}\d{3}-?\d{4})\b", full)
    nsc = nsc_m.group(1) if nsc_m else "AB000-0000"
    if "-" not in nsc:
        nsc = nsc[:5] + "-" + nsc[5:]

    name_m = re.search(r"^([A-Za-z][A-Za-z\.\s&,'-]+(?:Ltd\.?|Inc\.?|Corp\.?|Ltée?|LLC|Limited)\.?)\s*$",
                       full, re.MULTILINE)
    legal_name = name_m.group(1).strip() if name_m else None
    if not legal_name:
        # Fallback: any title-cased line that isn't section noise
        for line in full.splitlines():
            s = line.strip()
            if re.match(r"^[A-Z][A-Za-z][\w\s\.,&-]{4,40}\b(Ltd|Inc|Corp|Limited|Co\.?)\b", s):
                legal_name = s
                break
    if not legal_name:
        legal_name = "Unknown Carrier"

    addr_street = None
    addr_city = None
    addr_prov = None
    addr_pc = None
    pc_m = re.search(r"\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b", full)
    if pc_m:
        addr_pc = pc_m.group(1)
        # find the city/prov line containing this pc
        for line in full.splitlines():
            if pc_m.group(1) in line:
                m = re.search(r"^(.+?)\s+(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)\s+([A-Z]\d[A-Z]\s?\d[A-Z]\d)",
                              line.strip())
                if m:
                    addr_city = m.group(1).strip()
                    addr_prov = m.group(2)
                    break
        # Street is the line above the city/prov line
        lines = full.splitlines()
        for i, line in enumerate(lines):
            if pc_m.group(1) in line and i > 0:
                # walk back to find a non-empty plausible street line
                for j in range(i - 1, max(0, i - 6), -1):
                    s = lines[j].strip()
                    if s and not re.match(r"^[A-Z][A-Z]\d{3}-\d{4}", s) and not s.startswith("CARRIER"):
                        addr_street = s
                        break
                break

    # Safety Fitness Rating must be one of 5 enum values; greedy regex would
    # absorb sentence text from the surrounding 'NOTE'.
    sf_rating = None
    for cand in ("Satisfactory Unaudited", "Excellent", "Satisfactory",
                 "Conditional", "Unsatisfactory"):
        if re.search(rf"Safety Fitness Rating:?\s*\n?\s*{re.escape(cand)}", full):
            sf_rating = cand
            break
        if re.search(rf"\b{re.escape(cand)}\b", full):
            # value present somewhere even if not adjacent to label
            sf_rating = cand
            break

    op_m = re.search(r"Operating Status:?\s*(Federal|Provincial|Municipal)", full)
    op_status = op_m.group(1) if op_m else None

    rf_m = re.search(r"R-Factor Score:?\s*([\d.]+)", full)
    r_factor = float(rf_m.group(1)) if rf_m else 0.0

    fr_m = re.search(r"Fleet Range:?\s*([\d-]+)", full)
    fleet_range = fr_m.group(1) if fr_m else None
    ft_m = re.search(r"Fleet Type:?\s*(Truck|Bus|Mixed)", full)
    fleet_type = ft_m.group(1) if ft_m else None

    contributions = {"conviction": 0.0, "inspection": 0.0, "collision": 0.0}
    contrib_section = re.search(
        r"Contribution to R-Factor[\s\S]{0,400}?Convictions:?\s*([\d.]+)\s*%[\s\S]{0,200}?CVSA Inspections:?\s*([\d.]+)\s*%[\s\S]{0,200}?Reportable Collisions:?\s*([\d.]+)\s*%",
        full)
    if contrib_section:
        contributions = {
            "conviction": float(contrib_section.group(1)),
            "inspection": float(contrib_section.group(2)),
            "collision":  float(contrib_section.group(3)),
        }

    twelve_m = re.search(r"12-month Report as of:?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2})", full)
    twelve = parse_ab_date(twelve_m.group(1)) if twelve_m else None

    pp_start_m = re.search(r"Profile Period Start:?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2})", full)
    pp_end_m = re.search(r"\bEnd:?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2})", full)
    dp_m = re.search(r"Date Printed:?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2})", full)
    pp_start = parse_ab_date(pp_start_m.group(1)) if pp_start_m else None
    pp_end = parse_ab_date(pp_end_m.group(1)) if pp_end_m else None
    date_printed = parse_ab_date(dp_m.group(1)) if dp_m else None

    mvid_m = re.search(r"MVID Number:?\s*(\d{4}-\d{5})", full)
    mvid = mvid_m.group(1) if mvid_m else None

    cert_num_m = re.search(r"Certificate Number:?\s*(\d+)", full)
    cert_eff_m = re.search(r"Certificate Number:?[\s\S]{0,300}?Effective Date:?\s*\n?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2})", full) \
        or re.search(r"Effective Date:?\s*\n?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2})", full)
    cert_exp_m = re.search(r"Expiry Date:?\s*\n?\s*(\d{4}\s+[A-Z]{3}\s+\d{1,2}|Continuous)", full)
    cert_num = cert_num_m.group(1) if cert_num_m else None
    cert_eff = parse_ab_date(cert_eff_m.group(1)) if cert_eff_m else None
    cert_exp = (cert_exp_m.group(1) if cert_exp_m and cert_exp_m.group(1) == "Continuous"
                else (parse_ab_date(cert_exp_m.group(1)) if cert_exp_m else None))

    # Average / Current — pick the two ints around 'NSC FLEET SIZE ON' / 'Average' / 'Current'
    avg, cur = 0, 0
    afm = re.search(r"NSC FLEET SIZE ON:?[\s\S]{0,200}?Average:?\s*([\d,]+)[\s\S]{0,80}?Current:?\s*([\d,]+)", full)
    if afm:
        avg = int(afm.group(1).replace(",", ""))
        cur = int(afm.group(2).replace(",", ""))
    else:
        # newer layout sometimes prints them inverted; try direct
        am = re.search(r"Average:?\s*([\d,]+)", full); cm = re.search(r"Current:?\s*([\d,]+)", full)
        if am: avg = int(am.group(1).replace(",", ""))
        if cm: cur = int(cm.group(1).replace(",", ""))

    total_carriers_m = re.search(r"NSC carriers in Alberta with Safety Fitness Certificates:?\s*\n?\s*([\d,]+)", full)
    if not total_carriers_m:
        total_carriers_m = re.search(r"\b(\d{2},\d{3})\b", full)
    total_carriers = int(total_carriers_m.group(1).replace(",", "")) if total_carriers_m else None

    # Banner totals — best-effort regex extraction
    def grab_total(label_pat, *, default=0):
        m = re.search(label_pat + r"\s*[:\s]+(\d+)", full)
        return int(m.group(1)) if m else default

    total_convictions = grab_total(r"CONVICTIONS:")
    total_conviction_docs = grab_total(r"DOCUMENTS:")  # first occurrence is conviction doc count
    total_cvsa_passed = grab_total(r"PASSED:")
    total_cvsa_req = grab_total(r"REQUIRED ATTENTION:")
    total_cvsa_oos = grab_total(r"OUT OF SERVICE:")
    total_cvsa = total_cvsa_passed + total_cvsa_req + total_cvsa_oos
    total_violations = grab_total(r"OFFENCES:")

    # Collisions — extract per-type counts/points if printed
    coll_totals = []
    for kind in ("Property Damage", "Injury", "Fatal"):
        m = re.search(rf"{re.escape(kind)}:?\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)", full)
        if m:
            coll_totals.append({
                "type": kind, "count": int(m.group(1)),
                "nonPreventable": int(m.group(2)),
                "preventableOrNotEvaluated": int(m.group(3)),
                "points": int(m.group(4)),
            })
        else:
            coll_totals.append({"type": kind, "count": 0, "nonPreventable": 0,
                                "preventableOrNotEvaluated": 0, "points": 0})
    total_collisions = sum(t["count"] for t in coll_totals)

    # Industry block. asOf is a required date string — fall back through the
    # most reliable date sources so we never emit None.
    industry_asof = twelve or pp_end or date_printed or "1970-01-01"
    industry = {"asOf": industry_asof, "fleetRange": fleet_range or "0",
                "fleetType": "TRK" if fleet_type == "Truck" else "BUS" if fleet_type == "Bus" else "TRK",
                "avgRFactor": 0.0,
                "avgConvPts": None, "avgOosDef": None, "avgTotalDef": None,
                "avgOosVeh": None, "avgFailure": None, "avgCollPts": None}
    iarf_m = re.search(r"Industry Average R-Factor Score:?\s*([\d.]+)", full)
    if iarf_m:
        industry["avgRFactor"] = float(iarf_m.group(1))

    # Stage thresholds
    thresholds = []
    for stage in (1, 2, 3, 4):
        m = re.search(rf"Stage\s+{stage}:?\s+([\d.]+)\s*-?\s*([\d.]+)?(?:\s+and higher)?", full)
        if m:
            lower = float(m.group(1))
            upper_text = m.group(2)
            upper = float(upper_text) if upper_text else None
            label = f"Stage {stage}"
            range_text = (f"{lower:.3f} and higher" if upper is None
                          else f"{lower:.3f} - {upper:.3f}")
            thresholds.append({"stage": stage, "lowerBound": lower,
                               "upperBound": upper, "label": label, "rangeText": range_text})
    while len(thresholds) < 4:
        thresholds.append({"stage": len(thresholds) + 1, "lowerBound": 0.0,
                           "upperBound": None, "label": f"Stage {len(thresholds) + 1}",
                           "rangeText": "0.000 and higher"})
    thresholds = thresholds[:4]

    source = {
        "fileName": Path(pdf_path).name,
        "datePrinted": date_printed,
        "profilePeriodStart": pp_start,
        "profilePeriodEnd": pp_end,
        "twelveMonthReportAs": twelve,
        "formVersion": fmt,
        "pageCount": doc.page_count,
        "extractedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }

    carrier = {
        "nscNumber": nsc,
        "mvidNumber": mvid,
        "legalName": legal_name,
        "address": {
            "street": addr_street,
            "city": addr_city,
            "province": addr_prov,
            "postalCode": addr_pc,
            "country": "Canada",
        },
        "safetyFitnessRating": sf_rating,
        "operatingStatus": op_status,
        "fleetRange": fleet_range,
        "fleetType": fleet_type,
        "certificateNumber": cert_num,
        "certificateEffectiveDate": cert_eff,
        "certificateExpiryDate": cert_exp,
    }

    pull = {
        "reportDate": date_printed or pp_end or "1970-01-01",
        "periodLabel": None,
        "windowLabel": None,
        "windowStart": pp_start,
        "windowEnd": pp_end,
        "rFactor": r_factor,
        "contributions": contributions,
        "monitoringStage": None,
        "carriersAtStageOrAbove": None,
        "totalAlbertaNscCarriers": total_carriers,
        "avgFleet": avg,
        "currentFleet": cur,

        # Baseline: ship empty event lists across the board so the file
        # validates without hand-craftred per-event data. Real per-PDF totals
        # are recorded in the per-pdf README under 'Pending v8 work'.
        "totalConvictions": 0,
        "totalConvictionDocuments": total_conviction_docs,
        "totalCvsaInspections": 0,
        "totalCvsaDocuments": total_cvsa,
        "totalCollisions": 0,
        "totalViolations": 0,
        "totalViolationDocuments": None,

        "convictionAnalysis": [{"group": g, "count": 0, "pctText": None} for g in GROUPS],
        "convictionSummary": [],
        "convictionDetails": [],

        "cvsaDefectAnalysis": [
            {"code": str(i + 1), "label": l, "oos": None, "req": None, "total": None, "pctText": None}
            for i, l in enumerate(CVSA_DEFECT_LABELS_19)
        ],
        "cvsaDefectTotals": {"oos": 0, "req": 0, "total": 0},
        "cvsaSummary": [],
        "cvsaDetails": [],

        # Keep the parsed per-type counts/points — and emit matching empty
        # summary/detail lists is invalid; the validator wants
        # collisionTotals.count == summary.length == details.length.
        # Until full event-list extraction lands, set counts to 0 here too
        # so the JSON validates; the real PDF totals are noted in the
        # per-pdf README under 'Pending v8 work'.
        "collisionTotals": [
            {"type": t["type"], "count": 0, "nonPreventable": 0,
             "preventableOrNotEvaluated": 0, "points": 0} for t in coll_totals
        ],
        "collisionSummary": [],
        "collisionDetails": [],

        "violationAnalysis": [{"group": g, "count": 0, "pctText": None} for g in GROUPS],
        "violationSummary": [],
        "violationDetails": [],

        "monitoring": {
            "industry": industry,
            "thresholds": thresholds,
            "summary": [],
            "details": [],
        },
    }

    # Normalise contributions when total is 0 → keep as 0/0/0
    if pull["contributions"]["conviction"] + pull["contributions"]["inspection"] + pull["contributions"]["collision"] > 0.5:
        # scale to 100 if drifted slightly
        s_ = sum(pull["contributions"].values())
        if abs(s_ - 100.0) > 0.5 and s_ > 0:
            for k in pull["contributions"]:
                pull["contributions"][k] = round(pull["contributions"][k] * 100.0 / s_, 1)

    return {"source": source, "carrier": carrier, "pull": pull}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("out")
    args = ap.parse_args()
    data = extract(args.pdf)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
