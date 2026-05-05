"""Apply the 7-color overlay to a BC CVSE Carrier Profile Report PDF.

BC PDFs have a real text layer, so this is data-driven — same approach as the
AB / CVOR annotators:

  - PALE colour on every LABEL the parser must recognise (universal — same on
    every BC Carrier Profile Report).
  - STRONG colour on every VALUE found in the corresponding extracted.json.

Adding a new sample = drop extracted.json + run this script. No coordinate
mapping needed.

Color sinks:
    GREEN  carrier identity                  -> demographics.*, certificate.*
    BLUE   pull-level metric                 -> complianceReview, thresholds, monthlyScores
    PURPLE CVSA inspection / defect          -> cvsa.*
    RED    accident                          -> accidents[]
    ORANGE driver contravention              -> driverContraventions[], pendingDriverContraventions[]
    BROWN  active fleet vehicle / CVIP       -> activeFleet[], cvip[]
    YELLOW audit / source / banner           -> auditSummary[], source.*, page header/footer
"""
from __future__ import annotations
import json
import re
import sys
from pathlib import Path
from typing import Iterable

import fitz  # PyMuPDF


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


# ── Universal labels — same on every BC Carrier Profile Report ────────────

COVER_LABELS = [
    # Page 1 banner / source fields
    "Carrier Profile Report", "NSC #:", "Profile Start Date:", "Profile End Date:",
    "Profile Requested By:", "Report Run Date:",
    "Commercial Vehicle Safety and Enforcement",
    "National Safety Code Carrier Profile Report",
    "From:", "To:",
    # Page 1 narrative title + bullet labels — these are exactly the
    # category names the frontend renders in the Profile Score panel and
    # the Pull-by-Pull chart legend.
    "NSC Carrier Profile",
    "Contraventions:", "CVSA (Out of Service):", "Accidents:", "Total:",
    "Average Fleet Size:", "Total Active Vehicle Days:",
    "Active Monthly Days:", "Risk Band:",
    # Page 1 NSC Program Office contact block
    "NSC Program Office, CVSE:", "PO Box 9250", "Stn Prov Govt",
    "Victoria, BC V8W 9J2",
    "Mail:", "Fax:", "Email:",
    "(250) 952-0578", "NSC@gov.bc.ca",
]

SECTION_LABELS = [
    "Section 1 - Carrier Information", "Section 2 - Profile Scores",
    "Section 3 - Active Fleet", "Section 4 - Contraventions",
    "Section 4.1 - Driver Contraventions (Guilty)",
    "Section 4.2 - Carrier Contraventions (Guilty)",
    "Section 4.3 - Pending Driver Contraventions",
    "Section 4.4 - Pending Carrier Contraventions",
    "Section 5 - CVSA Inspection Results",
    "Section 6 - Accident Information",
    "Section 7 - Audit Summary",
    "Section 8 - CVIP Vehicle Inspection History",
]

PART1_LABELS = [
    "Demographic Information:", "Carrier Name:", "Jurisdiction:",
    "Primary Types of Business:", "Certficate Issue Date:", "Certificate Issue Date:",
    "Extra-Provincial:", "Carrier Mailing Address:", "Premium Carrier:",
    "Weigh2GoBC:", "Preventative Maintenance:", "Number of Currently Licensed Vehicles:",
    "Certificate Information:", "Certificate Status:", "Safety Rating:",
    "Profile Status:", "Audit Status:", "Compliance Review:",
    "Current Profile Scores as of",
    "Average", "Fleet Size", "Contraventions", "CVSA",
    "(Out of Service)", "Accidents", "Total",
    "NSC Interventions:", "Intervention Type", "Date",
]

PART2_LABELS = [
    "Month", "Total Active", "Vehicle Days", "Active", "Monthly Days",
    "Average", "Fleet Size", "Contraventions", "Score",
    "CVSA", "Score", "Accident", "Score", "Total", "Score",
]

PART3_LABELS = [
    "Regi #", "Plate #", "Year", "Make", "Owner Name", "GVW",
]

PART4_LABELS = [
    "Summary", "Details", "Totals",
    "Group Description", "and Equivalency Codes",
    "Number of Violations", "in last 12 months",
    "Percentage", "of Violations", "Number of", "Active Points",
    "Percentage of Total", "Active Points",
    # CCMTA group descriptions actually printed on the BC report:
    "Speeding (0001-0099)", "Stop Signs and Traffic Lights (0100-0199)",
    "Driver's Liabilities (0200-0299)", "Driving (0300-0399)",
    "Hours of Service (0400-0499)", "Trip Inspection (0500-0599)",
    "Mechanical Defects (0600-0699)",
    "Oversize & Overweight (0700-0799)",
    "Security of Loads (0900-0999)",
    "Dangerous Goods (1000)",
    "Criminal Code (1100-1199)",
    "Miscellaneous (1200-1299)",
    # Per-event sub-table headers
    "DL#/Jur:", "Class:", "Status:",
    "Violation Date", "Time", "Ticket #", "Plate/Jur", "Location",
    "Jurisdiction", "Disposition Date",
    "Act", "Section", "Description", "Equiv Code", "Active Points",
]

PART5_LABELS = [
    "CVSA Inspection Levels", "Level", "Description",
    "Full Inspection (Vehicle & Driver)", "Walk Around Inspection",
    "Driver Only Inspection", "Special Inspection", "Vehicle Only Inspection",
    "Enhanced - Radioactive", "Other Provincial",
    "School Bus - Complete", "School Bus - Re-Inspection",
    "Inspection Type", "Number of Inspections in", "the Past 12 Months",
    "Out of Service (OOS)", "Violations Present (Fail)", "Pass",
    "Driver/Vehicle Inspections", "Vehicle Only Inspections",
    "Driver Only Inspections", "Total Inspections",
    "CVSA Defect Type", "OOS", "% of Defects", "Fail", "Total Defects", "% of Total",
    "Inspection Date", "Document #", "Jur", "Result", "Active Points",
    "Driver Name", "Vehicle", "Plate/Jur", "Regi #", "Vehicle Desc",
    "Inspection Item Defect",
    "Power Unit", "Semi-Trailer", "Trailer 1", "Trailer 2", "Bus", "Truck",
]

PART6_LABELS = [
    # §6 Summary table headers + row labels
    "Summary", "Details",
    "Accident Type", "Number of Accidents",
    "in last 12 months",
    "At Fault", "Fault Unknown", "Not at Fault",
    "Fatality", "Injury", "Property", "Total Accidents",
    # Per-accident detail block
    "Accident Date", "Time", "Report #", "Location", "Jur",
    "Type", "Fault", "Active Points",
    "Driver Name", "DL#/Jur", "Plate/Jur", "Regi #", "Vehicle Desc", "Charges Laid",
]

PART7_LABELS = [
    "Audit Summary", "No Audits conducted for this carrier",
]

PART8_LABELS = [
    "CVIP Vehicle Inspection History",
    "Regi #", "Plate #", "Vehicle", "Date", "Type", "Facility",
    "Confirmation", "Decal", "Expiry", "Result",
]


# ── Highlighter — collects candidates, dedups by rect overlap ─────────────

class Highlighter:
    """v2 — uses rect annotations (visible PALE fill + STRONG border) instead of
    highlight annotations. PyMuPDF's add_highlight_annot with very-pale colors
    rendered nearly invisible in v1, especially for labels. Rect annotations
    let us specify fill and stroke independently so PALE is reliably readable.
    """

    def __init__(self, page):
        self.page = page
        self.candidates: list = []
        self.painted: list = []
        self.counts: dict[str, int] = {}

    def add(self, source: str, color, kind: str, color_name: str) -> None:
        if not source:
            return
        s = str(source).strip()
        # 2-char tokens allowed: BC (jurisdiction), No (boolean cells).
        if len(s) < 2:
            return
        rects = self.page.search_for(s)
        priority = (len(s) << 1) | (1 if kind == "STRONG" else 0)
        for r in rects:
            self.candidates.append((priority, s, color, kind, r, color_name))

    def _overlaps(self, a, b) -> bool:
        ix0, iy0 = max(a.x0, b.x0), max(a.y0, b.y0)
        ix1, iy1 = min(a.x1, b.x1), min(a.y1, b.y1)
        if ix1 <= ix0 or iy1 <= iy0: return False
        intersection = (ix1 - ix0) * (iy1 - iy0)
        area_a = max(1e-6, (a.x1 - a.x0) * (a.y1 - a.y0))
        area_b = max(1e-6, (b.x1 - b.x0) * (b.y1 - b.y0))
        return intersection / min(area_a, area_b) > 0.5

    def flush(self) -> dict[str, int]:
        # Highest-priority first so longer/STRONG candidates win.
        self.candidates.sort(key=lambda t: -t[0])
        for _, _, color, kind, rect, color_name in self.candidates:
            if any(self._overlaps(rect, k) for k in self.painted):
                continue
            # Inflate the rect a few points so the border doesn't clip the
            # glyphs.
            r = fitz.Rect(rect.x0 - 1.5, rect.y0 - 1.0,
                          rect.x1 + 1.5, rect.y1 + 1.0)
            strong = STRONG[color_name]
            if kind == "STRONG":
                # Strong: visible coloured fill + thick coloured border.
                self.page.draw_rect(r, color=strong, fill=color,
                                    fill_opacity=0.55, width=1.8, overlay=True)
            else:
                # Pale: same coloured border, very-light tinted fill, thin border.
                self.page.draw_rect(r, color=strong, fill=color,
                                    fill_opacity=0.22, width=0.9, overlay=True)
            self.painted.append(rect)
            self.counts[color_name] = self.counts.get(color_name, 0) + 1
        return self.counts


def add_all(hl: Highlighter, queries: Iterable, color, kind: str, color_name: str) -> None:
    for q in queries:
        if q is None: continue
        hl.add(str(q), color, kind, color_name)


# ── Walk extracted.json -> value tokens per colour sink ───────────────────

def collect_values(data: dict) -> dict:
    pull = data.get("pull", {})
    car = data.get("carrier", {})
    src = data.get("source", {})
    sets = {k: set() for k in PALE}
    G, B, P, R, O, BR, Y = (sets["GREEN"], sets["BLUE"], sets["PURPLE"],
                             sets["RED"], sets["ORANGE"], sets["BROWN"], sets["YELLOW"])

    def add(s, v):
        if v is None: return
        t = str(v).strip()
        # 2-char tokens allowed so demographic short cells (BC, No) flow through.
        if t and len(t) >= 2:
            s.add(t)

    # Carrier identity (GREEN)
    dem = car.get("demographics", {})
    cert = car.get("certificate", {})
    add(G, car.get("nscNumber"))
    add(G, dem.get("carrierName"))
    add(G, dem.get("jurisdiction"))           # "BC" — 2-char value
    add(G, dem.get("primaryBusinessType"))
    add(G, dem.get("certificateIssueDate"))
    # Boolean cells render as "Yes"/"No" in the PDF; emit the printed token.
    for bool_field in ("extraProvincial", "premiumCarrier",
                        "weigh2GoBC", "preventativeMaintenance"):
        v = dem.get(bool_field)
        if isinstance(v, bool):
            G.add("Yes" if v else "No")
    # Mailing address: PDF prints it on TWO lines; extracted.json joins them
    # with ", ". Add the joined form (in case it ever appears) AND each line
    # so search_for() matches the printed layout.
    addr = dem.get("mailingAddress")
    if addr:
        add(G, addr)
        for piece in str(addr).split(","):
            piece = piece.strip()
            if piece:
                G.add(piece)
    if dem.get("numberOfLicensedVehicles") is not None:
        # 2-char numeric ("73") flows through now that the filter is len>=2.
        G.add(str(dem["numberOfLicensedVehicles"]))
    add(G, cert.get("certificateStatus"))
    add(G, cert.get("safetyRating"))
    add(G, cert.get("profileStatus"))
    add(G, cert.get("auditStatus"))

    # Pull metrics (BLUE)
    cr = pull.get("complianceReview", {})
    add(B, pull.get("asOfDate"))
    add(B, cr.get("asOfDate"))
    add(B, str(cr.get("averageFleetSize", "")))
    add(B, str(cr.get("totalScore", "")))
    for s in cr.get("scores", []):
        add(B, s.get("category"))
        add(B, f"{s['score']:.2f}")
        if s.get("events") is not None:
            B.add(str(s["events"]))
    for t in pull.get("thresholds", []):
        # Status name itself ("Satisfactory" / "Conditional" / "Unsatisfactory")
        # is also a value worth highlighting in the threshold ladder rows.
        add(B, t["status"])
        add(B, t["contraventions"])
        add(B, t["cvsa"])
        add(B, t["accidents"])
        add(B, t["total"])
    # NSC Interventions — type + date + description are values
    for iv in pull.get("interventions", []):
        add(B, iv.get("type"))
        add(B, iv.get("date"))
        add(B, iv.get("description"))
    for r in pull.get("monthlyScores", []):
        add(B, r["month"])
        add(B, str(r["vd"])); add(B, str(r["ad"]))
        add(B, f"{r['avg']:.2f}")
        add(B, f"{r['contra']:.2f}")
        add(B, f"{r['cvsa']:.2f}")
        add(B, f"{r['acc']:.2f}")
        add(B, f"{r['total']:.2f}")

    # Active fleet (BROWN) + CVIP
    for r in pull.get("activeFleet", []):
        add(BR, r["regi"])
        if r.get("plate"): add(BR, r["plate"])
        add(BR, str(r["year"]))
        add(BR, r["make"])
        if r.get("owner"): add(BR, r["owner"])
        if r.get("gvw"): add(BR, str(r["gvw"]))
    for r in pull.get("cvip", []):
        add(BR, r["regi"])
        if r.get("plate"): add(BR, r["plate"])
        if r.get("vehicle"): add(BR, r["vehicle"])
        add(BR, r["date"])
        add(BR, r["type"])
        if r.get("facility"): add(BR, r["facility"])
        if r.get("confirmation"): add(BR, r["confirmation"])
        if r.get("decal"): add(BR, r["decal"])
        if r.get("expiry"): add(BR, r["expiry"])
        add(BR, r["result"])

    # Contraventions (ORANGE)
    for r in pull.get("contraventionSummary", []):
        # Group label (incl. "Totals") so the row label highlights as STRONG.
        if r.get("group"): O.add(r["group"])
        if r["violations"]: O.add(str(r["violations"]))
        if r.get("violationsPct") is not None:
            O.add(f"{r['violationsPct']:.2f}%")
        if r["activePoints"]: O.add(str(r["activePoints"]))
        if r.get("activePointsPct") is not None:
            O.add(f"{r['activePointsPct']:.2f}%")
    for collection in (pull.get("driverContraventions", []),
                       pull.get("pendingDriverContraventions", [])):
        for r in collection:
            add(O, r.get("driverName"))
            add(O, r.get("dl"))
            add(O, r.get("dlJur"))
            add(O, r.get("cls"))           # pending only
            add(O, r.get("status"))        # pending only
            add(O, r["date"])
            add(O, r.get("time"))
            add(O, r["ticket"])
            add(O, r["plate"])
            add(O, r.get("plateJur"))
            add(O, r.get("location"))
            add(O, r.get("juris"))
            add(O, r.get("dispDate"))
            add(O, r.get("act"))
            add(O, r.get("section"))
            add(O, r["desc"])
            add(O, r["equiv"])
            if r.get("pts") is not None:
                O.add(str(r["pts"]))
    for collection in (pull.get("carrierContraventions", []),
                       pull.get("pendingCarrierContraventions", [])):
        for r in collection:
            add(O, r.get("status"))        # pending only
            add(O, r["date"])
            add(O, r.get("time"))
            add(O, r["ticket"])
            add(O, r["plate"])
            add(O, r.get("plateJur"))
            add(O, r.get("location"))
            add(O, r.get("juris"))
            add(O, r.get("dispDate"))
            add(O, r.get("act"))
            add(O, r.get("section"))
            add(O, r["desc"])
            add(O, r["equiv"])
            if r.get("pts") is not None:
                O.add(str(r["pts"]))

    # CVSA (PURPLE)
    for r in pull.get("cvsa", {}).get("summary", []):
        add(P, r.get("inspectionType"))
        add(P, str(r["count"])); add(P, str(r["oos"])); add(P, str(r["fail"])); add(P, str(r["pass"]))
    for r in pull.get("cvsa", {}).get("defectBreakdown", []):
        # PDF prints the row label as "{code} - {label}", e.g. "40 - Driver".
        code, label = r.get("code"), r.get("label")
        if code and label:
            P.add(f"{code} - {label}")
        if r.get("oos"): add(P, str(r["oos"]))
        if r.get("fail"): add(P, str(r["fail"]))
        if r.get("totalDefects"): add(P, str(r["totalDefects"]))
        if r.get("oosPct"): add(P, f"{r['oosPct']:.2f}")
        if r.get("failPct"): add(P, f"{r['failPct']:.2f}")
        if r.get("totalPct"): add(P, f"{r['totalPct']:.2f}")
    for r in pull.get("cvsa", {}).get("list", []):
        add(P, r["date"])
        add(P, r.get("time"))
        add(P, r["doc"])
        add(P, r.get("location"))
        add(P, r.get("jur"))
        if r.get("level") is not None: P.add(str(r["level"]))
        add(P, r.get("driverName"))
        add(P, r.get("dl"))
        add(P, r.get("dlJur"))
        add(P, r["result"])
        for u in r.get("units", []):
            add(P, u.get("kind"))           # "Power Unit" / "Semi-Trailer" / "Trailer 1"
            add(P, u["plate"])
            add(P, u.get("plateJur"))
            if u.get("regi"): add(P, u["regi"])
            if u.get("desc"): add(P, u["desc"])
            if u.get("result"): add(P, u["result"])
            if u.get("defect"): add(P, u["defect"])

    # Accidents (RED)
    # §6 Summary table
    for r in pull.get("accidentSummary", []):
        if r.get("type"): R.add(r["type"])
        # Counts are tiny (often 0); add as plain string. The table cells are
        # spatially constrained to the §6 page where false positives are rare.
        for k in ("count", "atFault", "faultUnknown", "notAtFault", "activePoints"):
            v = r.get(k)
            if v is not None:
                R.add(str(v))
    # §6 Details list (per-accident)
    for r in pull.get("accidents", []):
        add(R, r["date"])
        add(R, r.get("time"))
        add(R, r["report"])
        add(R, r.get("location"))
        add(R, r.get("jur"))
        add(R, r.get("driverName"))
        add(R, r.get("dl"))
        add(R, r.get("dlJur"))
        add(R, r.get("plate"))
        add(R, r.get("plateJur"))
        add(R, r.get("regi"))
        add(R, r.get("vehDesc"))
        add(R, r["type"])
        add(R, r["fault"])
        add(R, r.get("charges"))
        if r.get("pts") is not None:
            R.add(str(r["pts"]))

    # Audits + source (YELLOW)
    for r in pull.get("auditSummary", []):
        add(Y, r["auditDate"])
        add(Y, r["result"])
        if r.get("auditType"): add(Y, r["auditType"])
    add(Y, src.get("reportRunDate"))
    add(Y, src.get("profileFrom"))
    add(Y, src.get("profileTo"))
    add(Y, src.get("profileRequestedBy"))

    return sets


def annotate(src_pdf: Path, dst: Path) -> None:
    if dst.is_dir():
        dst_pdf = dst / "annotated.pdf"
        ext_path = dst / "extracted.json"
    else:
        dst_pdf = dst
        ext_path = dst.with_name("extracted.json")
    data = json.loads(ext_path.read_text(encoding="utf-8"))
    values = collect_values(data)

    doc = fitz.open(str(src_pdf))
    grand: dict[str, int] = {}

    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()
        hl = Highlighter(page)

        # ── Universal cover/section labels (yellow) ───────────────────────
        add_all(hl, COVER_LABELS, PALE["YELLOW"], "PALE", "YELLOW")
        add_all(hl, SECTION_LABELS, PALE["YELLOW"], "PALE", "YELLOW")

        # ── Section-specific labels by detection ──────────────────────────
        if "Section 1 - Carrier Information" in text or "Demographic Information" in text:
            add_all(hl, PART1_LABELS, PALE["GREEN"], "PALE", "GREEN")
            add_all(hl, values["GREEN"], STRONG["GREEN"], "STRONG", "GREEN")
            add_all(hl, values["BLUE"], STRONG["BLUE"], "STRONG", "BLUE")
        if "Section 2 - Profile Scores" in text:
            add_all(hl, PART2_LABELS, PALE["BLUE"], "PALE", "BLUE")
            add_all(hl, values["BLUE"], STRONG["BLUE"], "STRONG", "BLUE")
        if "Section 3 - Active Fleet" in text:
            add_all(hl, PART3_LABELS, PALE["BROWN"], "PALE", "BROWN")
            add_all(hl, values["BROWN"], STRONG["BROWN"], "STRONG", "BROWN")
        if "Section 4" in text and "Contravention" in text:
            add_all(hl, PART4_LABELS, PALE["ORANGE"], "PALE", "ORANGE")
            add_all(hl, values["ORANGE"], STRONG["ORANGE"], "STRONG", "ORANGE")
        if "Section 5 - CVSA Inspection" in text or "CVSA Inspection Results" in text:
            add_all(hl, PART5_LABELS, PALE["PURPLE"], "PALE", "PURPLE")
            add_all(hl, values["PURPLE"], STRONG["PURPLE"], "STRONG", "PURPLE")
        if "Section 6 - Accident" in text or "Accident Information" in text:
            add_all(hl, PART6_LABELS, PALE["RED"], "PALE", "RED")
            add_all(hl, values["RED"], STRONG["RED"], "STRONG", "RED")
        if "Section 7" in text or "Audit Summary" in text:
            add_all(hl, PART7_LABELS, PALE["YELLOW"], "PALE", "YELLOW")
            add_all(hl, values["YELLOW"], STRONG["YELLOW"], "STRONG", "YELLOW")
        if "Section 8" in text or "CVIP" in text:
            add_all(hl, PART8_LABELS, PALE["BROWN"], "PALE", "BROWN")
            add_all(hl, values["BROWN"], STRONG["BROWN"], "STRONG", "BROWN")

        page_counts = hl.flush()
        for c, n in page_counts.items():
            grand[c] = grand.get(c, 0) + n

    doc.save(str(dst_pdf), deflate=True, garbage=4)
    grand_total = sum(grand.values())
    print(f"Wrote {dst_pdf}; total highlights: {grand_total}")
    for c, n in sorted(grand.items()):
        print(f"  {c:7s} {n}")


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("usage: annotate_pdf.py <src.pdf> <per-pdf/<name>/ | annotated.pdf>\n"); sys.exit(2)
    src_pdf = Path(sys.argv[1]).resolve()
    dst = Path(sys.argv[2]).resolve()
    annotate(src_pdf, dst)


if __name__ == "__main__":
    main()
