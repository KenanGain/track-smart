"""Apply the 6-color overlay to a Nova Scotia NSC Carrier Profile Abstract PDF.

NS PDFs are text-extractable, so the overlay is data-driven (same approach as
BC and AB):

    PALE colour on every LABEL (universal — same on every NS abstract).
    STRONG colour on every VALUE found in the corresponding extracted.json.

Color sinks:
    GREEN  carrier identity                  -> demographics.*, certificate.*
    BLUE   pull-level metric                 -> thresholds, scores, auditHistory[]
    PURPLE CVSA inspection                   -> cvsaInspections[], cvsaTotals
    ORANGE conviction                        -> convictions[]
    RED    collision                         -> collisions[]
    YELLOW warning ticket / source / banner  -> warningTickets[], source.*, footer

Adding a new sample: drop a fresh extracted.json next to the PDF + run this
script. No coordinate mapping needed — `page.search_for()` finds every match.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Iterable

import fitz  # PyMuPDF


PALE = {
    "GREEN":  (0.78, 0.96, 0.82),
    "BLUE":   (0.78, 0.86, 0.99),
    "PURPLE": (0.92, 0.85, 0.99),
    "ORANGE": (0.99, 0.88, 0.74),
    "RED":    (0.99, 0.82, 0.82),
    "YELLOW": (0.99, 0.94, 0.74),
}
STRONG = {
    "GREEN":  (0.32, 0.72, 0.40),
    "BLUE":   (0.27, 0.45, 0.92),
    "PURPLE": (0.62, 0.32, 0.85),
    "ORANGE": (0.92, 0.55, 0.18),
    "RED":    (0.86, 0.22, 0.22),
    "YELLOW": (0.85, 0.70, 0.10),
}


# ── Universal NS labels — same on every Carrier Profile Abstract ──────

PAGE_LABELS = [
    # Page banner / header
    "Department of Public Works",
    "Carrier Profile Abstract",
    "as of",
    "Date:",
    "NSC #:",
    "Abstract",                    # footer banner '<nsc> Abstract Page n of N'
]

DEMOGRAPHIC_LABELS = [
    "Name:", "Contact Name:", "Contact Title:", "Phone:",
    "Mailing Address", "Physical Address",
    "Principal Place of Business:",
    "U.S. DOT#:", "IRP #:", "MVI Stn #:",
    "Current Fleet Size:", "Avg. Daily Fleet Size:",
]

CERT_LABELS = [
    "Safety Rating:", "Expires:",
]

THRESHOLD_LABELS = [
    "Safety Rating Score",
    "Level 1", "Level 2", "Level 3",
]

SCORE_LABELS = [
    "Area", "Indexed Score",
    "Convictions", "Inspections", "Collisions",
    "Total Demerit Score =",
]

AUDIT_LABELS = [
    "Audit History",
    "Audit Date", "Audit#/Sequence#", "Audit Result",
]

CVSA_LABELS = [
    "CVSA Inspection",
    "Date", "dd/mm/yyyy", "CVSA Number", "Jur",
    "Plate Number(s)", "Driver Master No.",
    "CVSA Result", "Demerit", "Points",
    "Totals",
]

CONVICTION_LABELS = [
    "Convictions",
    "There are no Conviction records.",
    # When non-empty, the full §Convictions header appears with these columns:
    "Offence Date", "Conv Date", "Ticket No.", "Offence",
    "Section Act/Reg.", "Demerit Points",
]

COLLISION_LABELS = [
    "Collisions",
    "There are no Collision records.",
    "Collision Date", "Severity", "Location",
    "Driver Master # / Jur.", "Plate # / Jur.",
]

WARNING_LABELS = [
    "Traffic Offence Reports (Warning Tickets)",
    "Offence Date",
    "Plate Number",
    "Driver Master No.",
    "Statute / Sect.", "Sub-Sect / Clause",
    "Totals",
]


# ── Highlighter — collects candidates, dedups by rect overlap ─────────

class Highlighter:
    """Burns rectangles into the content stream so PALE highlights always
    render in the saved PDF + in pixmap output (which `add_highlight_annot`
    does not). PALE = thin coloured border + 22% translucent tint;
    STRONG = thick coloured border + 55% translucent tint."""

    def __init__(self, page):
        self.page = page
        self.candidates: list = []
        self.painted: list = []
        self.counts: dict[str, int] = {}

    def add(self, source, color, kind: str, color_name: str) -> None:
        if not source:
            return
        s = str(source).strip()
        if len(s) < 2:
            return
        rects = self.page.search_for(s)
        priority = (len(s) << 1) | (1 if kind == "STRONG" else 0)
        for r in rects:
            self.candidates.append((priority, s, color, kind, r, color_name))

    @staticmethod
    def _overlaps(a, b) -> bool:
        ix0, iy0 = max(a.x0, b.x0), max(a.y0, b.y0)
        ix1, iy1 = min(a.x1, b.x1), min(a.y1, b.y1)
        if ix1 <= ix0 or iy1 <= iy0:
            return False
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
            r = fitz.Rect(rect.x0 - 1.5, rect.y0 - 1.0,
                          rect.x1 + 1.5, rect.y1 + 1.0)
            strong = STRONG[color_name]
            if kind == "STRONG":
                self.page.draw_rect(r, color=strong, fill=color,
                                     fill_opacity=0.55, width=1.8, overlay=True)
            else:
                self.page.draw_rect(r, color=strong, fill=color,
                                     fill_opacity=0.22, width=0.9, overlay=True)
            self.painted.append(rect)
            self.counts[color_name] = self.counts.get(color_name, 0) + 1
        return self.counts


def add_all(hl: Highlighter, queries: Iterable, color, kind: str, color_name: str) -> None:
    for q in queries:
        if q is None:
            continue
        hl.add(str(q), color, kind, color_name)


# ── extracted.json -> per-color value sets ────────────────────────────

def collect_values(data: dict) -> dict:
    car  = data.get("carrier", {})
    pull = data.get("pull", {})
    src  = data.get("source", {})

    sets = {k: set() for k in PALE}
    G, B, P, O, R, Y = (sets["GREEN"], sets["BLUE"], sets["PURPLE"],
                        sets["ORANGE"], sets["RED"], sets["YELLOW"])

    def add(s, v):
        if v is None:
            return
        t = str(v).strip()
        if t and len(t) >= 2:
            s.add(t)

    # Carrier identity (GREEN)
    dem  = car.get("demographics", {})
    cert = car.get("certificate", {})
    add(G, car.get("nscNumber"))
    add(G, dem.get("carrierName"))
    add(G, dem.get("contactName"))
    add(G, dem.get("contactTitle"))
    add(G, dem.get("phone"))
    add(G, dem.get("principalPlace"))
    add(G, dem.get("usDotNumber"))
    add(G, dem.get("irpNumber"))
    add(G, dem.get("mviStnNumber"))
    if dem.get("currentFleetSize") is not None:
        G.add(str(dem["currentFleetSize"]))
    if dem.get("avgDailyFleetSize") is not None:
        G.add(str(dem["avgDailyFleetSize"]))
    # Address: PDF prints street/city/postal each on their own line, so add
    # each piece separately in addition to the joined form.
    for addr_field in ("mailingAddress", "physicalAddress"):
        addr = dem.get(addr_field)
        if addr:
            add(G, addr)
            for piece in str(addr).split(","):
                piece = piece.strip()
                if piece:
                    G.add(piece)
    add(G, cert.get("safetyRating"))
    add(G, cert.get("safetyRatingExpires"))

    # Pull metrics (BLUE)
    add(B, pull.get("asOfDate"))
    t = pull.get("thresholds", {})
    for k in ("level1", "level2", "level3"):
        if t.get(k) is not None:
            B.add(f"{t[k]:.4f}")
    sc = pull.get("scores", {})
    for k in ("convictions", "inspections", "collisions", "totalDemerit"):
        if sc.get(k) is not None:
            B.add(f"{sc[k]:.4f}")
    for r in pull.get("auditHistory", []):
        add(B, r.get("date"))
        add(B, r.get("auditNum"))
        add(B, r.get("sequence"))
        add(B, r.get("result"))
        # PDF prints '<num> / <seq>' — also add the joined form
        if r.get("auditNum") and r.get("sequence"):
            B.add(f"{r['auditNum']} / {r['sequence']}")

    # CVSA (PURPLE)
    for r in pull.get("cvsaInspections", []):
        add(P, r["date"])
        add(P, r["cvsaNumber"])
        add(P, r["jur"])
        for plate in r["plates"]:
            add(P, plate)
        add(P, r["driverMaster"])
        add(P, r["result"])
        if r["demeritPts"]:
            P.add(str(r["demeritPts"]))
    ct = pull.get("cvsaTotals", {})
    if ct.get("records"):    P.add(str(ct["records"]))
    if ct.get("demeritPts"): P.add(str(ct["demeritPts"]))

    # Convictions (ORANGE)
    for r in pull.get("convictions", []):
        add(O, r.get("offenceDate"))
        add(O, r.get("convDate"))
        add(O, r.get("ticket"))
        add(O, r.get("offence"))
        add(O, r.get("driverMaster"))
        add(O, r.get("sectionActReg"))
        if r.get("pts"):
            O.add(str(r["pts"]))

    # Collisions (RED)
    for r in pull.get("collisions", []):
        add(R, r.get("date"))
        add(R, r.get("severity"))
        add(R, r.get("location"))
        add(R, r.get("driverMaster"))
        add(R, r.get("driverJur"))
        add(R, r.get("plate"))
        add(R, r.get("plateJur"))
        if r.get("pts"):
            R.add(str(r["pts"]))

    # Warning tickets + source / banner (YELLOW)
    for r in pull.get("warningTickets", []):
        add(Y, r["offenceDate"])
        add(Y, r["plate"])
        add(Y, r["driverMaster"])
        add(Y, r["statute"])
        add(Y, r["description"])
    if pull.get("warningTotals", {}).get("records"):
        Y.add(str(pull["warningTotals"]["records"]))
    add(Y, src.get("reportRunDate"))
    add(Y, src.get("profileAsOf"))
    add(Y, src.get("fileName"))

    return sets


# ── Driver ────────────────────────────────────────────────────────────

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

        # Universal page banner / header / footer (yellow)
        add_all(hl, PAGE_LABELS, PALE["YELLOW"], "PALE", "YELLOW")

        # Demographics + certificate (green) — page 1 only
        if "Carrier Profile Abstract" in text and "Mailing Address" in text:
            add_all(hl, DEMOGRAPHIC_LABELS, PALE["GREEN"], "PALE", "GREEN")
            add_all(hl, CERT_LABELS,        PALE["GREEN"], "PALE", "GREEN")
            add_all(hl, values["GREEN"], STRONG["GREEN"], "STRONG", "GREEN")

            # Thresholds + scores (blue) — also page 1
            add_all(hl, THRESHOLD_LABELS, PALE["BLUE"], "PALE", "BLUE")
            add_all(hl, SCORE_LABELS,     PALE["BLUE"], "PALE", "BLUE")
            add_all(hl, AUDIT_LABELS,     PALE["BLUE"], "PALE", "BLUE")
            add_all(hl, values["BLUE"], STRONG["BLUE"], "STRONG", "BLUE")

        # CVSA Inspection table (purple) — pages 1-3 (header repeats)
        if "CVSA Inspection" in text:
            add_all(hl, CVSA_LABELS, PALE["PURPLE"], "PALE", "PURPLE")
            add_all(hl, values["PURPLE"], STRONG["PURPLE"], "STRONG", "PURPLE")

        # Convictions (orange) + Collisions (red) — page 3
        if "Conviction records" in text or "Conviction" in text:
            add_all(hl, CONVICTION_LABELS, PALE["ORANGE"], "PALE", "ORANGE")
            add_all(hl, values["ORANGE"], STRONG["ORANGE"], "STRONG", "ORANGE")
        if "Collision records" in text or "Collision" in text:
            add_all(hl, COLLISION_LABELS, PALE["RED"], "PALE", "RED")
            add_all(hl, values["RED"], STRONG["RED"], "STRONG", "RED")

        # Traffic Offence Reports / Warning Tickets (yellow) — page 3
        if "Traffic Offence Reports" in text:
            add_all(hl, WARNING_LABELS, PALE["YELLOW"], "PALE", "YELLOW")
            add_all(hl, values["YELLOW"], STRONG["YELLOW"], "STRONG", "YELLOW")

        page_counts = hl.flush()
        for c, n in page_counts.items():
            grand[c] = grand.get(c, 0) + n

    doc.save(str(dst_pdf), deflate=True, garbage=4)
    grand_total = sum(grand.values())
    print(f"Wrote {dst_pdf}; total highlights: {grand_total}")
    for c, n in sorted(grand.items()):
        print(f"  {c:7s} {n}")


def main() -> None:
    if len(sys.argv) < 3:
        sys.stderr.write("usage: annotate_pdf.py <src.pdf> <per-pdf/<name>/ | annotated.pdf>\n")
        sys.exit(2)
    src_pdf = Path(sys.argv[1]).resolve()
    dst = Path(sys.argv[2]).resolve()
    annotate(src_pdf, dst)


if __name__ == "__main__":
    main()
