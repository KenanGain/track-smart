"""Apply the 7-color overlay to a Carrier Profile PDF — data-driven exhaustive mode.

The script highlights:
  - PALE   colour on every LABEL the parser must recognise (universal — same on every Alberta Carrier Profile)
  - STRONG colour on every VALUE found in the corresponding extracted.json (per-PDF)

Adding a new sample PDF is therefore: drop a hand-verified extracted.json in
per-pdf/<name>/, then run:

    python scripts/annotate_pdf.py raw-pdfs/<name>.pdf per-pdf/<name>/

The script picks up extracted.json from the destination folder automatically.

Colour sinks:
    GREEN  carrier identity                    -> carrier.*
    BLUE   pull-level metric                   -> pull.{rFactor, contributions, fleet, totals…}
    PURPLE CVSA inspection / defect            -> pull.cvsa*
    RED    collision                           -> pull.collision*
    ORANGE conviction                          -> pull.conviction*
    BROWN  monitoring monthly row              -> pull.monitoring.summary/details
    YELLOW violation / source audit            -> pull.violation*, source.*
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
from typing import Iterable

import fitz  # PyMuPDF


# ────────────────────────────────────────────────────────────────────────────
# Colour palette
# ────────────────────────────────────────────────────────────────────────────

PALE = {
    "GREEN":  (0.78, 0.96, 0.82),
    "BLUE":   (0.78, 0.86, 0.99),
    "PURPLE": (0.92, 0.85, 0.99),
    "RED":    (0.99, 0.82, 0.82),
    "ORANGE": (0.99, 0.88, 0.74),
    "BROWN":  (0.93, 0.84, 0.74),
    "YELLOW": (0.99, 0.94, 0.74),
}
STRONG = {
    "GREEN":  (0.32, 0.72, 0.40),
    "BLUE":   (0.27, 0.45, 0.92),
    "PURPLE": (0.62, 0.32, 0.85),
    "RED":    (0.86, 0.22, 0.22),
    "ORANGE": (0.92, 0.55, 0.18),
    "BROWN":  (0.55, 0.35, 0.18),
    "YELLOW": (0.85, 0.70, 0.10),
}


# ────────────────────────────────────────────────────────────────────────────
# Universal labels — same wording on every (older-format) Alberta Carrier Profile
# ────────────────────────────────────────────────────────────────────────────

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

CVSA_DEFECT_LABELS = [
    "1 - Driver Credentials",
    "2 - Hours Of Service",
    "3 - Brake Adjustment",
    "4 - Brake Systems",
    "5 - Coupling Devices",
    "6 - Exhaust Systems",
    "7 - Frames",
    "8 - Fuel Systems",
    "9 - Lighting Devices (Part II Section 8 OOSC only)",
    "10 - Cargo Securement",
    "11 - Steering Mechanisms",
    "12 - Suspensions",
    "13 - Tires",
    "14 - Van/Open-top Trailer Bodies",
    "15 - Wheels, Rims & Hubs",
    "16 - Windshield Wipers",
    "17 - Emergency Exits/Wiring & Electrical Systems (Buses)",
    "18 - Dangerous Goods",
    "19 - Driveline/Driveshaft",
]

COVER_LABELS_YELLOW = [
    "CARRIER PROFILE", "NOTE",
    "NSC Number:",
    "Profile Period Start:", "End:",
    "Date Printed:", "Requested By:",
    "TABLE OF CONTENTS",
    "Part 1 - Carrier information",
    "Part 2 - Conviction Information",
    "Part 3 - CVSA Inspection Information",
    "Part 4 - Collision Information",
    "Part 5 - Violation Information",
    "Part 6 - Monitoring Information",
    "Part 7 - Facility Licence Information",
    "Part 8 - Safety Fitness Information",
    "Part 10 - Historical Summary",
]

PART1_LABELS_GREEN = [
    "PART 1 - CARRIER INFORMATION", "SAFETY FITNESS CERTIFICATE",
    "NSC Number:", "MVID Number:",
    "Safety Fitness Rating:", "Operating Status:",
    "Effective Date:", "Expiry Date:",
    "Fleet Range:", "Fleet Type:",
]

PART1_LABELS_BLUE = [
    "RISK FACTOR (R-Factor - Carrier must strive for the lowest score)",
    "R-Factor Score:", "Contribution to R-Factor",
    "Convictions:", "CVSA Inspections:", "Reportable Collisions:",
    "Carrier's Monitoring Stage", "Total number of carriers at the same stage or greater:",
    "NSC carriers in Alberta with Safety Fitness Certificates:",
    "NSC MONITORING PROGRAM ON:", "NSC FLEET SIZE ON:",
    "Average:", "Current:", "using MVIDS:",
]

PART2_LABELS = [
    "CONVICTION NOTE",
    "PART 2 - CONVICTION INFORMATION",
    "PART 2 - CONVICTION ANALYSIS",
    "PART 2 - CONVICTION SUMMARY",
    "PART 2 - CONVICTION DETAIL",
    "TOTALS:", "DOCUMENTS:", "CONVICTIONS:", "ACTIVE POINTS:",
    "1 point", "2 points", "3 points", "5 points",
    "NUMBER OF", "PERCENT", "OF TOTAL", "GROUP DESCRIPTION",
    "TOTAL CONVICTIONS",
    "DATE", "DOCUMENT", "JUR", "VEHICLE", "DRIVER NAME",
    "TIME", "JURISDICTION", "DATE ENTERED",
    "ISSUING AGENCY:", "LOCATION:", "DRIVER:", "COMMODITY:",
    "CCMTA CODE:", "CONV DATE:", "DOCKET NO:", "ACTIVE POINTS:",
    "*** END OF PART 2 ***", "TOTAL PAGES:",
]

PART3_LABELS = [
    "CVSA INSPECTION NOTE",
    "PART 3 - CVSA INSPECTION INFORMATION",
    "PART 3 - CVSA INSPECTION ANALYSIS",
    "PART 3 - CVSA INSPECTION SUMMARY",
    "PART 3 - CVSA INSPECTION DETAIL",
    "TOTALS:", "PASSED:", "REQUIRED ATTENTION:", "OUT OF SERVICE:",
    "NUMBER OF DEFECTS", "OUT OF", "REQUIRES", "TOTAL", "PERCENT",
    "SERVICE", "ATTENTION", "DEFECTS", "OF TOTAL",
    "DEFECT CATEGORY / DESCRIPTION", "GRAND TOTAL DEFECTS",
    "DATE", "CVSA", "DOCUMENT", "JUR", "AGENCY", "PLATE", "LEVEL", "RESULT",
    "TIME", "DATE ENTERED",
    "AGENCY:", "LOCATION:", "DRIVER:",
    "VEHICLE: TYPE", "VIN", "YEAR", "MAKE", "CVSA DECAL #",
    "OUT OF SERVICE", "REQUIRES ATTENTION",
    "BY VEHICLE",
    "NUMBER OF OUT OF SERVICE DEFECTS (O)",
    "NUMBER OF REQUIRES ATTENTION DEFECTS (X)",
    "*** END OF PART 3 ***", "TOTAL PAGES:",
]

PART4_LABELS = [
    "COLLISION NOTE",
    "PART 4 - COLLISION INFORMATION",
    "PART 4 - COLLISION SUMMARY",
    "PART 4 - COLLISION DETAIL",
    "TOTALS:",
    "NUMBER OF", "COLLISIONS", "NON-", "PREVENTABLE",
    "PREVENTABLE OR", "NOT EVALUATED", "ACTIVE", "POINTS",
    "Property Damage:", "Injury:", "Fatal:",
    "Property Damage", "Personal Injury", "Fatality",
    "2 points", "4 points", "6 points",
    "No Collisions on Record for period selected",
    "*** END OF PART 4 ***", "TOTAL PAGES:",
]

PART5_LABELS = [
    "VIOLATION NOTE",
    "PART 5 - VIOLATION INFORMATION",
    "PART 5 - VIOLATION ANALYSIS",
    "PART 5 - VIOLATION SUMMARY",
    "PART 5 - VIOLATION DETAIL",
    "TOTALS:", "DOCUMENTS:", "OFFENCES:",
    "NUMBER OF", "VIOLATIONS", "PERCENT", "OF TOTAL", "GROUP DESCRIPTION",
    "TOTAL VIOLATIONS",
    "No Violations on Record for period selected",
    "*** END OF PART 5 ***", "TOTAL PAGES:",
]

PART6_LABELS = [
    "MONITORING NOTE",
    "PART 6 - MONITORING INFORMATION",
    "PART 6 - MONITORING SUMMARY",
    "PART 6 - MONITORING DETAILS",
    "MONTH-END", "DATE", "TYPE", "TRK%", "BUS%", "AVG", "CUR",
    "FLEET INFORMATION", "R-FACTOR", "SCORE",
    "CONV%", "INSP%", "COLL%", "MONITORING STAGE",
    "INDUSTRY MONITORING INFORMATION",
    "For Fleet Range:", "and for Fleet type:",
    "Industry Average R-Factor Score:",
    "(Industry Average is calculated for carriers with one or more NSC events)",
    "Monitoring Stage R-Factor threshold for Fleet Range:",
    "Stage 1:", "Stage 2:", "Stage 3:", "Stage 4:",
    "and higher",
    "FLEET", "SIZE",
    "CONVICTIONS", "PTS/VEH",
    "CVSA INSPECTIONS",
    "TOTAL", "INSP", "OOS DEFECTS", "/INSP", "TOTAL DEFECTS",
    "OOS%", "OOS/VEH", "FAILURE", "RATE",
    "COLLISIONS", "PTS/VEH",
    "Industry", "Average:",
    "*** END OF PART 6 ***", "TOTAL PAGES:",
]


# ────────────────────────────────────────────────────────────────────────────
# Highlight helpers
# ────────────────────────────────────────────────────────────────────────────

# Tokens that look like values but are too ambiguous to highlight on their own.
# Two-letter Canadian province codes appear hundreds of times in plate columns;
# bare digits appear in row numbers, page numbers, dates, etc.
PROVINCE_CODES = {"AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU",
                  "ON", "PE", "QC", "SK", "YT"}


def _is_value_safe(s: str) -> bool:
    """A value token is 'safe' to highlight only if it's distinctive enough.

    Drop tokens that produce mass over-highlighting:
      - Pure integers under 4 digits ("1", "10", "100")
      - 2-letter province codes ("AB", "ON")
      - Empty / very short strings (< 3 chars)
    """
    if not s:
        return False
    if len(s) < 3:
        return False
    if s in PROVINCE_CODES:
        return False
    if s.isdigit() and int(s) < 1000:
        return False
    return True


# ────────────────────────────────────────────────────────────────────────────
# Page-scoped Highlighter — collects candidate rects, dedups them so two
# highlights never stack on the same text region. Without this, painting
# both "DATE" and "DATE ENTERED" on the same column header doubles the
# opacity on the 'DATE' prefix and renders muddier than the surrounding text.
# ────────────────────────────────────────────────────────────────────────────

class Highlighter:
    """One per page. Calls to add() are queued; flush() applies them in priority
    order, skipping any candidate whose rect significantly overlaps a kept rect.

    Priority rules (highest first):
      1. Longer source string wins (more specific text).
      2. Strong (value) wins over Pale (label) when string lengths tie.
    """

    def __init__(self, page):
        self.page = page
        # candidates: list of (priority, source, color, opacity, rect)
        self.candidates: list[tuple[int, str, tuple, float, "fitz.Rect"]] = []
        self.painted_rects: list = []
        self.counts: dict[str, int] = {}

    def add(self, source: str, color, kind: str, color_name: str,
            opacity: float = 0.40, filter_short: bool = False) -> None:
        if not source:
            return
        s = str(source).strip()
        if not s:
            return
        if filter_short and not _is_value_safe(s):
            return
        rects = self.page.search_for(s)
        # Strong > Pale, longer > shorter. Higher priority => kept first.
        priority = (len(s) << 1) | (1 if kind == "STRONG" else 0)
        for r in rects:
            self.candidates.append((priority, s, color, opacity, r, color_name))

    def _overlaps(self, a, b, tol: float = 0.5) -> bool:
        # Two rects overlap "significantly" when their intersection is non-empty
        # by more than `tol` points on each axis. Adjacent text on the same line
        # has zero-area intersection (they touch), so we leave those alone.
        if a.x1 - tol <= b.x0 or b.x1 - tol <= a.x0:
            return False
        if a.y1 - tol <= b.y0 or b.y1 - tol <= a.y0:
            return False
        return True

    def flush(self) -> dict[str, int]:
        # Highest-priority first.
        self.candidates.sort(key=lambda t: -t[0])
        for priority, source, color, opacity, rect, color_name in self.candidates:
            if any(self._overlaps(rect, kept) for kept in self.painted_rects):
                continue
            ann = self.page.add_highlight_annot(rect)
            ann.set_colors(stroke=color)
            ann.set_opacity(opacity)
            ann.update()
            self.painted_rects.append(rect)
            self.counts[color_name] = self.counts.get(color_name, 0) + 1
        return self.counts


def add_all(hl: Highlighter, queries: Iterable, color, kind: str, color_name: str,
            opacity: float = 0.40, filter_short: bool = False) -> None:
    for q in queries:
        if q is None:
            continue
        hl.add(str(q), color, kind, color_name, opacity=opacity, filter_short=filter_short)


# ────────────────────────────────────────────────────────────────────────────
# Convert ISO dates back to AB display format
# ────────────────────────────────────────────────────────────────────────────

MONTH_ABBR = {1: "JAN", 2: "FEB", 3: "MAR", 4: "APR", 5: "MAY", 6: "JUN",
              7: "JUL", 8: "AUG", 9: "SEP", 10: "OCT", 11: "NOV", 12: "DEC"}


def iso_to_ab(iso):
    if not iso or not re.match(r"\d{4}-\d{2}-\d{2}$", str(iso)):
        return None
    y, m, d = iso.split("-")
    return f"{y} {MONTH_ABBR[int(m)]} {int(d):02d}"


def iso_to_ab_month(iso):
    if not iso:
        return None
    m = re.match(r"(\d{4})-(\d{2})", str(iso))
    if not m:
        return None
    return f"{m.group(1)} {MONTH_ABBR[int(m.group(2))]}"


# ────────────────────────────────────────────────────────────────────────────
# Walk extracted.json -> per-colour value tokens
# ────────────────────────────────────────────────────────────────────────────

def collect_value_tokens(data: dict) -> dict:
    src = data.get("source", {})
    car = data.get("carrier", {})
    pull = data.get("pull", {})

    sets = {k: set() for k in PALE}
    G, B, P, R, O, BR, Y = (sets["GREEN"], sets["BLUE"], sets["PURPLE"],
                             sets["RED"], sets["ORANGE"], sets["BROWN"], sets["YELLOW"])

    def add(s, v):
        if v is None: return
        t = str(v).strip()
        if t:
            s.add(t)

    # GREEN — carrier identity
    add(G, car.get("nscNumber"))
    add(G, car.get("mvidNumber"))
    add(G, car.get("legalName"))
    addr = car.get("address") or {}
    add(G, addr.get("street"))
    city, prov, pc = (addr.get("city") or ""), (addr.get("province") or ""), (addr.get("postalCode") or "")
    if city and prov and pc:
        add(G, f"{city.strip()} {prov.strip()} {pc.strip()}")
    elif city:
        add(G, city.strip())
    add(G, car.get("safetyFitnessRating"))
    add(G, car.get("operatingStatus"))
    add(G, car.get("fleetRange"))
    add(G, car.get("fleetType"))

    # BLUE — pull-level metrics (printed values)
    rf = pull.get("rFactor")
    if rf is not None:
        add(B, f"{float(rf):.3f}")
    contrib = pull.get("contributions") or {}
    for k in ("conviction", "inspection", "collision"):
        v = contrib.get(k)
        if v is not None:
            add(B, f"{float(v):.1f}%")
    if pull.get("totalAlbertaNscCarriers") is not None:
        n = pull["totalAlbertaNscCarriers"]
        add(B, f"{n:,}")

    # YELLOW — source / audit dates + violation values handled below
    for iso in (src.get("datePrinted"), src.get("profilePeriodStart"),
                src.get("profilePeriodEnd"), src.get("twelveMonthReportAs")):
        ab = iso_to_ab(iso)
        if ab: add(Y, ab)

    # ORANGE — convictions
    for r in pull.get("convictionAnalysis", []):
        if r.get("count"):
            add(O, str(r["count"]))
            if r.get("pctText"): add(O, r["pctText"])
    for r in pull.get("convictionSummary", []):
        for k in ("date", "document", "jurisdiction", "vehicle", "driverName", "offence"):
            add(O, r.get(k))
    for r in pull.get("convictionDetails", []):
        for k in ("date", "time", "document", "docket", "jurisdiction", "dateEntered",
                  "issuingAgency", "location", "driver", "vehicle", "commodity",
                  "offence", "convictionDate"):
            add(O, r.get(k))
        ccmta = r.get("ccmtaCode") or ""
        m = re.match(r"(\d{4})\s+(.+)", ccmta)
        if m:
            add(O, m.group(1))

    # PURPLE — CVSA
    for r in pull.get("cvsaDefectAnalysis", []):
        if r.get("oos"): add(P, str(r["oos"]))
        if r.get("req"): add(P, str(r["req"]))
        if r.get("total"): add(P, str(r["total"]))
        if r.get("pctText"): add(P, r["pctText"])
    totals = pull.get("cvsaDefectTotals") or {}
    for k in ("oos", "req", "total"):
        if totals.get(k): add(P, str(totals[k]))
    for r in pull.get("cvsaSummary", []):
        for k in ("date", "document", "jurisdiction", "agency", "plate", "plateJur", "result"):
            add(P, r.get(k))
    for r in pull.get("cvsaDetails", []):
        for k in ("date", "time", "document", "dateEntered", "agency", "location", "driver"):
            add(P, r.get(k))
        for v in r.get("vehicles", []):
            for k in ("plate", "vin", "make", "year", "decal"):
                add(P, v.get(k))

    # RED — collisions
    for r in pull.get("collisionTotals", []):
        for k in ("count", "nonPreventable", "preventableOrNotEvaluated", "points"):
            if r.get(k):
                add(R, str(r[k]))
    for r in pull.get("collisionSummary", []):
        for k in ("date", "document", "jurisdiction", "plate", "driver", "severity"):
            add(R, r.get(k))
    for r in pull.get("collisionDetails", []):
        for k in ("date", "document", "location", "vehicle", "vin", "driver"):
            add(R, r.get(k))

    # YELLOW — violations
    for r in pull.get("violationAnalysis", []):
        if r.get("count"):
            add(Y, str(r["count"]))
            if r.get("pctText"): add(Y, r["pctText"])
    for r in pull.get("violationSummary", []):
        for k in ("date", "document", "plate", "driverName", "offence"):
            add(Y, r.get(k))
    for r in pull.get("violationDetails", []):
        for k in ("date", "document", "location", "driver"):
            add(Y, r.get(k))
        for off in r.get("offences", []):
            for k in ("actSection", "ccmtaCode", "ccmtaLabel"):
                add(Y, off.get(k))

    # BROWN — monitoring
    mon = pull.get("monitoring") or {}
    ind = mon.get("industry") or {}
    for k in ("avgRFactor", "avgConvPts", "avgOosDef", "avgTotalDef",
              "avgOosVeh", "avgFailure", "avgCollPts"):
        v = ind.get(k)
        if v is not None:
            add(BR, f"{float(v):.3f}")
            add(BR, f"{float(v):.2f}")
            add(BR, f"{float(v):.1f}")
    if ind.get("fleetRange"): add(BR, ind["fleetRange"])
    if ind.get("fleetType"): add(BR, ind["fleetType"])
    for t in mon.get("thresholds", []):
        if t.get("rangeText"): add(BR, t["rangeText"])
    for r in mon.get("summary", []):
        if r.get("scoreText"): add(BR, r["scoreText"])
        for k in ("convPctText", "inspPctText", "collPctText"):
            add(BR, r.get(k))
        ab = iso_to_ab_month(r.get("monthEndIso"))
        if ab: add(BR, ab)
    for r in mon.get("details", []):
        for k in ("convPtsPerVeh", "oosDefPerInsp", "totalDefPerInsp",
                  "oosPerVeh", "failureRate", "collPtsPerVeh"):
            v = r.get(k)
            if v is not None:
                add(BR, f"{float(v):.3f}")
                add(BR, f"{float(v):.2f}")
                add(BR, f"{float(v):.1f}")
        if r.get("oosPctText"): add(BR, r["oosPctText"])

    return sets


# ────────────────────────────────────────────────────────────────────────────
# Main pass
# ────────────────────────────────────────────────────────────────────────────

def annotate(src_pdf: Path, dst: Path, extracted_path: Path | None = None) -> None:
    if dst.is_dir():
        dst_pdf = dst / "annotated.pdf"
        if extracted_path is None:
            extracted_path = dst / "extracted.json"
    else:
        dst_pdf = dst
        if extracted_path is None:
            extracted_path = dst.with_name("extracted.json")

    data = json.loads(extracted_path.read_text(encoding="utf-8"))
    values = collect_value_tokens(data)

    doc = fitz.open(str(src_pdf))
    grand_counts = {k: 0 for k in PALE}

    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()
        hl = Highlighter(page)

        # Queue ALL candidates for this page first; flush() de-dups overlaps.
        # Cover (p.1)
        if "Profile Period Start:" in text and "Date Printed:" in text and "Requested By:" in text:
            add_all(hl, COVER_LABELS_YELLOW, PALE["YELLOW"], "PALE", "YELLOW")
            add_all(hl, ["NSC Number:", "Carrier Name", "CARRIER INFORMATION"], PALE["GREEN"], "PALE", "GREEN")
            add_all(hl, values["YELLOW"], STRONG["YELLOW"], "STRONG", "YELLOW", filter_short=True)
            add_all(hl, values["GREEN"],  STRONG["GREEN"],  "STRONG", "GREEN",  filter_short=True)

        # TOC
        if "TABLE OF CONTENTS" in text:
            add_all(hl, COVER_LABELS_YELLOW, PALE["YELLOW"], "PALE", "YELLOW")
            add_all(hl, ["NSC Number:", "Carrier Name:"], PALE["GREEN"], "PALE", "GREEN")
            add_all(hl, values["GREEN"], STRONG["GREEN"], "STRONG", "GREEN", filter_short=True)

        # Part 1
        if "PART 1 - CARRIER INFORMATION" in text:
            add_all(hl, PART1_LABELS_GREEN, PALE["GREEN"], "PALE", "GREEN")
            add_all(hl, PART1_LABELS_BLUE,  PALE["BLUE"],  "PALE", "BLUE")
            add_all(hl, ["12-month Report as of:"], PALE["YELLOW"], "PALE", "YELLOW")
            add_all(hl, values["GREEN"],  STRONG["GREEN"],  "STRONG", "GREEN",  filter_short=True)
            add_all(hl, values["BLUE"],   STRONG["BLUE"],   "STRONG", "BLUE",   filter_short=True)
            add_all(hl, values["YELLOW"], STRONG["YELLOW"], "STRONG", "YELLOW", filter_short=True)

        # Part 2 — Conviction
        if "PART 2 - CONVICTION" in text or "CONVICTION NOTE" in text:
            add_all(hl, PART2_LABELS, PALE["ORANGE"], "PALE", "ORANGE")
            if "PART 2 - CONVICTION ANALYSIS" in text:
                add_all(hl, GROUPS, PALE["ORANGE"], "PALE", "ORANGE")
            add_all(hl, values["ORANGE"], STRONG["ORANGE"], "STRONG", "ORANGE", filter_short=True)

        # Part 3 — CVSA Inspection
        if "PART 3 - CVSA INSPECTION" in text or "CVSA INSPECTION NOTE" in text:
            add_all(hl, PART3_LABELS, PALE["PURPLE"], "PALE", "PURPLE")
            if "PART 3 - CVSA INSPECTION ANALYSIS" in text:
                add_all(hl, CVSA_DEFECT_LABELS, PALE["PURPLE"], "PALE", "PURPLE")
            add_all(hl, values["PURPLE"], STRONG["PURPLE"], "STRONG", "PURPLE", filter_short=True)

        # Part 4 — Collision
        if "PART 4 - COLLISION" in text or "COLLISION NOTE" in text:
            add_all(hl, PART4_LABELS, PALE["RED"], "PALE", "RED")
            add_all(hl, values["RED"], STRONG["RED"], "STRONG", "RED", filter_short=True)

        # Part 5 — Violation
        if "PART 5 - VIOLATION" in text or "VIOLATION NOTE" in text:
            add_all(hl, PART5_LABELS, PALE["YELLOW"], "PALE", "YELLOW")
            if "PART 5 - VIOLATION ANALYSIS" in text:
                add_all(hl, GROUPS, PALE["YELLOW"], "PALE", "YELLOW")
            add_all(hl, values["YELLOW"], STRONG["YELLOW"], "STRONG", "YELLOW", filter_short=True)

        # Part 6 — Monitoring
        if "PART 6 - MONITORING" in text or "MONITORING NOTE" in text:
            add_all(hl, PART6_LABELS, PALE["BROWN"], "PALE", "BROWN")
            add_all(hl, values["BROWN"], STRONG["BROWN"], "STRONG", "BROWN", filter_short=True)

        page_counts = hl.flush()
        for c, n in page_counts.items():
            grand_counts[c] = grand_counts.get(c, 0) + n

    doc.save(str(dst_pdf), deflate=True, garbage=4)
    grand = sum(grand_counts.values())
    print(f"Wrote {dst_pdf}; total highlights: {grand}")
    for c, n in grand_counts.items():
        print(f"  {c:7s} {n}")


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("usage: annotate_pdf.py <src.pdf> <per-pdf/<name>/ | annotated.pdf>\n")
        sys.exit(2)
    src_pdf = Path(sys.argv[1]).resolve()
    dst = Path(sys.argv[2]).resolve()
    annotate(src_pdf, dst)


if __name__ == "__main__":
    main()
