"""Apply the 7-color overlay to a Carrier Profile PDF — exhaustive page-by-page mode.

Each page is annotated with:
  - PALE   colour on every LABEL the parser must recognise
  - STRONG colour on every VALUE the parser must capture

Colour sinks:
    GREEN  carrier identity                    -> carrier.*
    BLUE   pull-level metric                   -> pull.{rFactor, contributions, fleet, totals…}
    PURPLE CVSA inspection / defect            -> pull.cvsa*
    RED    collision                           -> pull.collision*
    ORANGE conviction                          -> pull.conviction*
    BROWN  monitoring monthly row              -> pull.monitoring.summary/details
    YELLOW violation / source audit            -> pull.violation*, source.*

Highlights are scoped to the page that owns the data so a single token
(for instance, '2018 DEC 19') doesn't bleed across Parts.

Usage:
    python scripts/annotate_pdf.py raw-pdfs/Carry_Freight_19_Dec_2018.pdf per-pdf/Carry_Freight_19_Dec_2018/annotated.pdf
"""
from __future__ import annotations
import sys
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


# 16 CCMTA group descriptions — appear on Part 2 Analysis (p.5) and Part 5 Analysis.
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

# 19 CVSA defect categories — appear on Part 3 Analysis (p.9).
CVSA_DEFECTS = [
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


def hl(page, query: str, color, opacity: float = 0.45) -> int:
    rects = page.search_for(query)
    for r in rects:
        a = page.add_highlight_annot(r)
        a.set_colors(stroke=color)
        a.set_opacity(opacity)
        a.update()
    return len(rects)


def hl_all(page, queries: Iterable[str], color, opacity: float = 0.45) -> int:
    n = 0
    for q in queries:
        n += hl(page, q, color, opacity)
    return n


def annotate(src: str, dst: str) -> None:
    doc = fitz.open(src)
    counts = {k: 0 for k in PALE}

    for i in range(doc.page_count):
        page = doc[i]
        text = page.get_text()

        # ────────────────────────────────────────────────────────────────────
        # Cover (p.1) — green carrier identity, yellow audit
        # ────────────────────────────────────────────────────────────────────
        if "Profile Period Start:" in text and "Date Printed:" in text and "Requested By:" in text:
            counts["GREEN"] += hl_all(page, [
                "CARRIER INFORMATION", "NSC Number:", "Carrier Name",
            ], PALE["GREEN"])
            counts["GREEN"] += hl_all(page, [
                "Carry Freight Ltd.", "AB243-8992",
                "114 West Creek Springs", "Chestermere AB T1X 1N7",
            ], STRONG["GREEN"])
            counts["YELLOW"] += hl_all(page, [
                "Profile Period Start:", "End:", "Date Printed:", "Requested By:",
                "CARRIER PROFILE", "NOTE",
            ], PALE["YELLOW"])
            counts["YELLOW"] += hl_all(page, [
                "2016 DEC 20", "2018 DEC 19", "HTDSH03",
            ], STRONG["YELLOW"])

        # ────────────────────────────────────────────────────────────────────
        # TOC (p.2) — yellow audit
        # ────────────────────────────────────────────────────────────────────
        if "TABLE OF CONTENTS" in text:
            counts["YELLOW"] += hl_all(page, [
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
            ], PALE["YELLOW"])
            counts["YELLOW"] += hl_all(page, [
                "Pages 1  TO 4", "Pages 1  TO 6", "Pages 1  TO 3", "Pages 1  TO 5", "Pages 1  TO 2", "Pages 1  TO 1",
            ], STRONG["YELLOW"])
            # Carrier identity also reprints in TOC banner
            counts["GREEN"] += hl_all(page, ["NSC Number:", "Carrier Name:"], PALE["GREEN"])
            counts["GREEN"] += hl_all(page, ["AB243-8992", "Carry Freight Ltd."], STRONG["GREEN"])

        # ────────────────────────────────────────────────────────────────────
        # Part 1 — Carrier Information (p.3)
        # ────────────────────────────────────────────────────────────────────
        if "PART 1 - CARRIER INFORMATION" in text:
            # Green labels (identity)
            counts["GREEN"] += hl_all(page, [
                "PART 1 - CARRIER INFORMATION", "SAFETY FITNESS CERTIFICATE",
                "NSC Number:", "MVID Number:",
                "Safety Fitness Rating:", "Operating Status:",
                "Fleet Range:", "Fleet Type:",
            ], PALE["GREEN"])
            counts["GREEN"] += hl_all(page, [
                "AB243-8992", "0854-32599",
                "Carry Freight Ltd.",
                "114 West Creek Springs", "Chestermere AB T1X 1N7",
                "Satisfactory Unaudited", "Federal",
                "5-9", "Truck",
            ], STRONG["GREEN"])

            # Blue labels (pull-level)
            counts["BLUE"] += hl_all(page, [
                "RISK FACTOR (R-Factor - Carrier must strive for the lowest score)",
                "R-Factor Score:", "Contribution to R-Factor",
                "Convictions:", "CVSA Inspections:", "Reportable Collisions:",
                "Carrier's Monitoring Stage", "Total number of carriers at the same stage or greater:",
                "NSC carriers in Alberta with Safety Fitness Certificates:",
                "NSC MONITORING PROGRAM ON:", "NSC FLEET SIZE ON:",
                "Average:", "Current:", "using MVIDS:",
            ], PALE["BLUE"])
            counts["BLUE"] += hl_all(page, [
                "0.468", "82.0%", "18.0%", "0.0%", "24,726",
            ], STRONG["BLUE"])

            # Yellow audit
            counts["YELLOW"] += hl_all(page, ["12-month Report as of:"], PALE["YELLOW"])
            counts["YELLOW"] += hl_all(page, ["2018 NOV 30"], STRONG["YELLOW"])

        # ────────────────────────────────────────────────────────────────────
        # Part 2 — Conviction (orange)
        # ────────────────────────────────────────────────────────────────────
        if "PART 2 - CONVICTION" in text or "CONVICTION NOTE" in text:
            # Banner / note
            counts["ORANGE"] += hl_all(page, [
                "CONVICTION NOTE",
                "PART 2 - CONVICTION INFORMATION",
                "PART 2 - CONVICTION ANALYSIS",
                "PART 2 - CONVICTION SUMMARY",
                "PART 2 - CONVICTION DETAIL",
                "*** END OF PART 2 ***", "TOTAL PAGES:",
                "Profile Period Start Date:", "Profile Period End Date:",
                "Date Printed:", "Pages 1  To 4",
                "TOTALS:", "DOCUMENTS:", "CONVICTIONS:", "ACTIVE POINTS:",
                "1 point", "2 points", "3 points", "5 points",
            ], PALE["ORANGE"])

            # Conviction Analysis (p.5) — every group description as a label
            if "PART 2 - CONVICTION ANALYSIS" in text:
                counts["ORANGE"] += hl_all(page, [
                    "NUMBER OF", "PERCENT", "OF TOTAL", "GROUP DESCRIPTION",
                    "TOTAL CONVICTIONS",
                ], PALE["ORANGE"])
                counts["ORANGE"] += hl_all(page, GROUPS, PALE["ORANGE"])
                # Strong values
                counts["ORANGE"] += hl_all(page, ["100.0%", "100  %"], STRONG["ORANGE"])

            # Conviction Summary (p.6) — column headers + the row data
            if "PART 2 - CONVICTION SUMMARY" in text:
                counts["ORANGE"] += hl_all(page, [
                    "DATE", "DOCUMENT", "JUR", "VEHICLE", "DRIVER NAME", "ACTIVE POINTS",
                ], PALE["ORANGE"])
                counts["ORANGE"] += hl_all(page, [
                    "2018 JUL 28", "OPC ON86937174", "ON",
                    "E65208   AB", "AMRINDER SINGH GILL",
                    "TWO LOGS OR FALSE LOGS",
                ], STRONG["ORANGE"])

            # Conviction Detail (p.7) — every label
            if "PART 2 - CONVICTION DETAIL" in text:
                counts["ORANGE"] += hl_all(page, [
                    "DATE", "TIME", "DOCUMENT", "JURISDICTION", "DATE ENTERED",
                    "ISSUING AGENCY:", "LOCATION:", "DRIVER:", "VEHICLE:", "COMMODITY:",
                    "CCMTA CODE:", "CONV DATE:", "DOCKET NO:", "ACTIVE POINTS:",
                ], PALE["ORANGE"])
                counts["ORANGE"] += hl_all(page, [
                    "2018 JUL 28", "08:18", "OPC ON86937174", "Ontario", "2018 DEC 04",
                    "HWY 17, THUNDER BAY",
                    "AMRINDER SINGH GILL    G43500408841006  ON",
                    "AMRINDER SINGH GILL",
                    "E65208   AB",
                    "0402", "TWO LOGS OR FALSE LOGS", "Hours of Service",
                    "2018 NOV 20", "86937174",
                ], STRONG["ORANGE"])

        # ────────────────────────────────────────────────────────────────────
        # Part 3 — CVSA Inspection (purple)
        # ────────────────────────────────────────────────────────────────────
        if "PART 3 - CVSA INSPECTION" in text or "CVSA INSPECTION NOTE" in text:
            counts["PURPLE"] += hl_all(page, [
                "CVSA INSPECTION NOTE",
                "PART 3 - CVSA INSPECTION INFORMATION",
                "PART 3 - CVSA INSPECTION ANALYSIS",
                "PART 3 - CVSA INSPECTION SUMMARY",
                "PART 3 - CVSA INSPECTION DETAIL",
                "*** END OF PART 3 ***", "TOTAL PAGES:",
                "Profile Period Start Date:", "Profile Period End Date:", "Date Printed:",
                "Pages 1  To 6",
                "TOTALS:", "PASSED:", "REQUIRED ATTENTION:", "OUT OF SERVICE:",
            ], PALE["PURPLE"])

            # Analysis (p.9): defect-category column + 19 categories
            if "PART 3 - CVSA INSPECTION ANALYSIS" in text:
                counts["PURPLE"] += hl_all(page, [
                    "NUMBER OF DEFECTS", "OUT OF", "REQUIRES", "TOTAL", "PERCENT",
                    "SERVICE", "ATTENTION", "DEFECTS", "OF TOTAL",
                    "DEFECT CATEGORY / DESCRIPTION", "GRAND TOTAL DEFECTS",
                ], PALE["PURPLE"])
                counts["PURPLE"] += hl_all(page, CVSA_DEFECTS, PALE["PURPLE"])
                counts["PURPLE"] += hl_all(page, [
                    "37.5%", "25.0%", "12.5%", "100  %",
                ], STRONG["PURPLE"])

            # Summary (p.10): column headers + every inspection row
            if "PART 3 - CVSA INSPECTION SUMMARY" in text:
                counts["PURPLE"] += hl_all(page, [
                    "DATE", "CVSA", "DOCUMENT", "JUR", "AGENCY", "PLATE", "LEVEL", "RESULT",
                ], PALE["PURPLE"])
                counts["PURPLE"] += hl_all(page, [
                    "2018 DEC 12", "OPI ONEA01273068",
                    "2018 NOV 27", "OPI ONEA01263997",
                    "2018 NOV 10", "OPI 8628393",
                    "2018 OCT 17", "OPI ONEA01251954",
                    "2018 SEP 25", "OPI ONEA01249644",
                    "2018 AUG 16", "OPI ONEA01237362",
                    "2018 JUN 13", "OPI ONEA01215795",
                    "2018 JUN 05", "OPI ONEA01219694",
                    "2018 JUN 01", "OPI ONEA01211359",
                    "U04031", "N3759S", "E77384", "E80652", "E75062", "E65114", "E65208",
                    "Out of Service", "Requires Attention", "Passed",
                ], STRONG["PURPLE"])

            # Detail (pp.11-13): every label per record
            if "PART 3 - CVSA INSPECTION DETAIL" in text:
                counts["PURPLE"] += hl_all(page, [
                    "DATE", "TIME", "DOCUMENT", "JUR", "LEVEL", "RESULT", "DATE ENTERED",
                    "AGENCY:", "LOCATION:", "DRIVER:",
                    "VEHICLE: TYPE", "PLATE", "JUR", "VIN", "YEAR", "MAKE", "CVSA DECAL #",
                    "OUT OF SERVICE", "REQUIRES ATTENTION",
                    "DEFECT CATEGORY / DESCRIPTION",
                    "BY VEHICLE",
                    "NUMBER OF OUT OF SERVICE DEFECTS (O)",
                    "NUMBER OF REQUIRES ATTENTION DEFECTS (X)",
                ], PALE["PURPLE"])
                counts["PURPLE"] += hl_all(page, [
                    "Gursharan Singh Grewal", "SIVALOGANATHAN NADESU", "MOHAN SINGH",
                    "MIAN NISAR AHMED", "Harjinder Singh Gill", "AMRINDER SINGH GILL",
                    ". Dilbag Singh",
                    "HEYDEN TIS", "KAMLOOPS", "WASSI NORTH TIS", "NEW LISKEARD TIS",
                    "GANANOQUE SOUTH TIS", "WASSI SOUTH TIS", "COCHRANE TIS", "KENORA DISTRICT",
                    "Volvo", "Peterbilt", "CIMC", "VANG", "UTIL",
                    "4V4NC9EH9GN928469", "4V4NC9EH4GN929559", "4V4NC9EH7EN152680",
                    "4V4NC9EH6DN133195", "4V4NC9EJ7FN180094", "1XPXD49X1JD467897",
                ], STRONG["PURPLE"])

        # ────────────────────────────────────────────────────────────────────
        # Part 4 — Collision (red)
        # ────────────────────────────────────────────────────────────────────
        if "PART 4 - COLLISION" in text or "COLLISION NOTE" in text:
            counts["RED"] += hl_all(page, [
                "COLLISION NOTE",
                "PART 4 - COLLISION INFORMATION",
                "PART 4 - COLLISION SUMMARY",
                "PART 4 - COLLISION DETAIL",
                "*** END OF PART 4 ***", "TOTAL PAGES:",
                "Profile Period Start Date:", "Profile Period End Date:", "Date Printed:",
                "Pages 1  To 3",
                "TOTALS:",
                "NUMBER OF", "COLLISIONS", "NON-", "PREVENTABLE",
                "PREVENTABLE OR", "NOT EVALUATED", "ACTIVE", "POINTS",
                "Property Damage:", "Injury:", "Fatal:",
                "Property Damage", "Personal Injury", "Fatality",
                "2 points", "4 points", "6 points",
                "No Collisions on Record for period selected",
            ], PALE["RED"])
            counts["RED"] += hl_all(page, ["0"], STRONG["RED"])  # zero-collision values

        # ────────────────────────────────────────────────────────────────────
        # Part 5 — Violation (yellow)
        # ────────────────────────────────────────────────────────────────────
        if "PART 5 - VIOLATION" in text or "VIOLATION NOTE" in text:
            counts["YELLOW"] += hl_all(page, [
                "VIOLATION NOTE",
                "PART 5 - VIOLATION INFORMATION",
                "PART 5 - VIOLATION ANALYSIS",
                "PART 5 - VIOLATION SUMMARY",
                "PART 5 - VIOLATION DETAIL",
                "*** END OF PART 5 ***", "TOTAL PAGES:",
                "Profile Period Start Date:", "Profile Period End Date:", "Date Printed:",
                "Pages 1  To 4",
                "TOTALS:", "DOCUMENTS:", "OFFENCES:",
                "NUMBER OF", "VIOLATIONS", "PERCENT", "OF TOTAL", "GROUP DESCRIPTION",
                "TOTAL VIOLATIONS",
                "No Violations on Record for period selected",
            ], PALE["YELLOW"])
            if "PART 5 - VIOLATION ANALYSIS" in text:
                counts["YELLOW"] += hl_all(page, GROUPS, PALE["YELLOW"])

        # ────────────────────────────────────────────────────────────────────
        # Part 6 — Monitoring (brown)
        # ────────────────────────────────────────────────────────────────────
        if "PART 6 - MONITORING" in text or "MONITORING NOTE" in text:
            counts["BROWN"] += hl_all(page, [
                "MONITORING NOTE",
                "PART 6 - MONITORING INFORMATION",
                "PART 6 - MONITORING SUMMARY",
                "PART 6 - MONITORING DETAILS",
                "*** END OF PART 6 ***", "TOTAL PAGES:",
                "Profile Period Start Date:", "Profile Period End Date:", "Date Printed:",
                "Pages 1  To 5",
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
                "AVG", "FLEET", "SIZE",
                "CONVICTIONS", "PTS/VEH",
                "CVSA INSPECTIONS",
                "TOTAL", "INSP", "OOS DEFECTS", "/INSP", "TOTAL DEFECTS",
                "OOS%", "OOS/VEH", "FAILURE", "RATE",
                "COLLISIONS", "PTS/VEH",
                "Industry", "Average:",
            ], PALE["BROWN"])
            counts["BROWN"] += hl_all(page, [
                # Monthly summary scores
                "0.046", "0.018", "0.022", "0.027", "0.000",
                "No Data",
                "TRK", "100%",
                # Industry block
                "0.400", "5-9",
                "1.830  -  2.464", "2.465  -  2.794", "2.795  -  3.899", "3.900  and higher",
                # Industry detail line
                "0.38", "0.5", "1.6", "0.09", "0.055", "0.08",
                # Detail rows
                "0.214", "0.083", "0.100", "0.125", "0.1", "0.0", "0.6", "0.7", "1.0",
                "14%", "0%", "0.14",
            ], STRONG["BROWN"])

    doc.save(dst, deflate=True, garbage=4)
    grand = sum(counts.values())
    print(f"Wrote {dst}; total highlights: {grand}")
    for c, n in counts.items():
        print(f"  {c:7s} {n}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.stderr.write("usage: annotate_pdf.py <src.pdf> <dst.pdf>\n"); sys.exit(2)
    annotate(sys.argv[1], sys.argv[2])
