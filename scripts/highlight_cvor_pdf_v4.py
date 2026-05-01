"""
v2 — Annotate the Ontario MTO CVOR PDF with the TrackSmart frontend extraction map.

Expanded vs v1:
    * 7 color sinks instead of 4 (added RED collision events, ORANGE conviction
      events, BROWN travel-kilometric rows).
    * BLUE rules expanded for the new per-pull fields the frontend now renders
      (collisionDetails severity, convictionDetails category + points-status,
      levelStats Level 1-5 OOS, collisionBreakdown / convictionBreakdown
      sub-period rows).

Color legend
    GREEN   = Carrier Identity              (one-time → Carrier Profile)
    BLUE    = Per-Pull Metric               (one record per upload → cvorPeriodicReports
                                             chart + Pull-by-Pull table + KPI cards +
                                             Pull Snapshot mini sections)
    PURPLE  = Per-Inspection Event          (one record per Inspection event in the
                                             PDF event log → Intervention & Event Details
                                             list, type=inspection)
    RED     = Per-Collision Event           (one record per Collision event →
                                             Intervention & Event Details, type=collision)
    ORANGE  = Per-Conviction Event          (one record per Conviction event →
                                             Intervention & Event Details, type=conviction)
    BROWN   = Travel Kilometric row         (one row per period → Travel Kilometric
                                             Information mini section)
    YELLOW  = Optional / audit trail

For every category we use TWO shades:
    *_LABEL  = lighter / pastel  → applied to the LABEL token
    *_VALUE  = stronger / saturated → applied to the VALUE token next to it

Defaults:
    Reads:  docs/cvor-extraction-vendor-package-v2/raw-pdfs/*.pdf
    Writes: docs/cvor-extraction-vendor-package-v2/highlighted-pdfs/<name>.annotated.pdf

Override paths via CLI args:
    python scripts/highlight_cvor_pdf_v2.py path/to/file1.pdf path/to/file2.pdf
    (output written next to each source as <name>.annotated.pdf)

Companion artefacts:
    docs/cvor-extraction-vendor-package-v2/cvor-extraction-response.schema.json
    docs/cvor-extraction-vendor-package-v2/templates/*.csv
"""
from __future__ import annotations

import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import fitz  # PyMuPDF
import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

REPO_ROOT = Path(__file__).resolve().parents[1]
V4_RAW    = REPO_ROOT / "docs" / "cvor-extraction-vendor-package-v4" / "raw-pdfs"
V4_OUT    = REPO_ROOT / "docs" / "cvor-extraction-vendor-package-v4" / "highlighted-pdfs"

DEFAULT_BATCH: list[Path] = sorted(V4_RAW.glob("*.pdf")) if V4_RAW.exists() else []


def annotated_path(src: Path, out_dir: Path | None = None) -> Path:
    target_dir = out_dir if out_dir is not None else src.parent
    target_dir.mkdir(parents=True, exist_ok=True)
    return target_dir / (src.stem + ".annotated.pdf")


# ── Two-tone colors per category (RGB 0-1) ──────────────────────────────────
GREEN_LABEL  = (0.78, 0.96, 0.78)
GREEN_VALUE  = (0.30, 0.78, 0.40)
BLUE_LABEL   = (0.78, 0.90, 1.00)
BLUE_VALUE   = (0.30, 0.62, 0.95)
PURPLE_LABEL = (0.92, 0.85, 1.00)
PURPLE_VALUE = (0.62, 0.40, 0.92)
RED_LABEL    = (1.00, 0.85, 0.85)   # collision events — pale red
RED_VALUE    = (0.92, 0.30, 0.30)   # collision events — strong red
ORANGE_LABEL = (1.00, 0.92, 0.78)   # conviction events — pale orange
ORANGE_VALUE = (0.95, 0.55, 0.15)   # conviction events — strong orange
BROWN_LABEL  = (0.95, 0.88, 0.78)   # travel km rows — pale brown
BROWN_VALUE  = (0.65, 0.42, 0.20)   # travel km rows — strong brown
YELLOW_LABEL = (1.00, 0.97, 0.70)
YELLOW_VALUE = (0.95, 0.80, 0.20)

LABEL_OPACITY = 0.42
VALUE_OPACITY = 0.55

DPI = 200
PIX_TO_PDF = 72.0 / DPI


@dataclass(frozen=True)
class FieldRule:
    label: str
    direction: str = "right"      # right | below | label-only
    pages: tuple[int, ...] = ()
    strict: bool = False


def _rule(label: str, direction: str = "right", pages: tuple[int, ...] = (), strict: bool | None = None) -> FieldRule:
    if strict is None:
        # Auto-strict for short single-word labels (<=18 chars or one token).
        strict = len(label) <= 18 or " " not in label.strip()
    return FieldRule(label=label, direction=direction, pages=pages, strict=strict)


# ── 🟢 GREEN: carrier identity (page 1 only) ────────────────────────────────
GREEN_FIELDS: list[FieldRule] = [
    _rule("CVOR / RIN #",                "right",       pages=(1,)),
    _rule("Client Name",                 "right",       pages=(1,)),
    _rule("Operating As",                "right",       pages=(1,)),
    _rule("Address",                     "below",       pages=(1,)),
    _rule("Phone #",                     "right",       pages=(1,)),
    _rule("Email",                       "right",       pages=(1,)),
    _rule("CVOR Status",                 "right",       pages=(1,)),
    _rule("Original Issue Date",         "right",       pages=(1,)),
    _rule("Start Date",                  "right",       pages=(1,)),
    _rule("Expiry Date",                 "right",       pages=(1,)),
    _rule("Carrier Safety Rating",       "right",       pages=(1,)),
    _rule("Type of Commercial Vehicle",  "right",       pages=(1,)),
    _rule("Dangerous Goods",             "right",       pages=(1,)),
]

# ── 🔵 BLUE: per-pull metrics (pages 1-3) ───────────────────────────────────
BLUE_FIELDS: list[FieldRule] = [
    # Page 1 — fleet & travel
    _rule("# of Commercial Vehicles",    "right",       pages=(1,)),
    _rule("# of Drivers",                "right",       pages=(1,)),
    _rule("Ontario Kms Travelled",       "right",       pages=(1,)),
    _rule("Rest of Canada Kms Travelled","right",       pages=(1,)),
    _rule("US/Mexico Kms Travelled",     "right",       pages=(1,)),
    _rule("Total Kms Travelled",         "right",       pages=(1,)),

    # Page 1 — collision/conviction event counts
    _rule("Total # of Collisions",       "right",       pages=(1,)),
    _rule("# of Collisions with points", "right",       pages=(1,)),
    _rule("# of Collisions not pointed", "right",       pages=(1,)),
    _rule("Total # of convictions",      "right",       pages=(1,)),

    # ── Page 2 — Section headers + date-range labels (NEW v4) ────────────
    _rule("Collision Details",           "label-only",  pages=(2,)),
    _rule("Conviction Details",          "label-only",  pages=(2, 3)),
    _rule("Inspection Details",          "label-only",  pages=(2, 3)),
    _rule("Inspections Details",         "label-only",  pages=(2, 3)),
    _rule("Out of Service Rates",        "label-only",  pages=(2,)),
    _rule("Performance Summary",         "label-only",  pages=(2,)),
    _rule("Most Recent Audit",           "below",       pages=(2,)),
    _rule("Summary of Interventions",    "label-only",  pages=(2, 3)),
    _rule("(Excludes Level 4)",          "label-only",  pages=(2,), strict=False),
    _rule("(24 Months)",                 "label-only",  pages=(2, 3), strict=False),

    # ── Page 2 — OOS rates row ──────────────────────────────────────────
    _rule("Overall Out of Service %",    "right",       pages=(2,)),
    _rule("Vehicle Out of Service %",    "right",       pages=(2,)),
    _rule("Driver Out of Service %",     "right",       pages=(2,)),
    # Some PDFs split the % into a separate cell — match the pre-% label too
    _rule("Overall Out of Service",      "right",       pages=(2,), strict=False),
    _rule("Vehicle Out of Service",      "right",       pages=(2,), strict=False),
    _rule("Driver Out of Service",       "right",       pages=(2,), strict=False),

    # ── Page 2 — Collision Details box (severity + points-status) ───────
    _rule("# of Collisions with points", "right",       pages=(2,)),
    _rule("# of Collisions not pointed", "right",       pages=(2,)),
    _rule("Total # of Collisions",       "right",       pages=(2,)),
    _rule("Fatal Collisions",            "right",       pages=(2,)),
    _rule("Fatal",                       "right",       pages=(2,), strict=False),
    _rule("Personal Injury Only",        "right",       pages=(2,)),
    _rule("Personal Injury",             "right",       pages=(2,), strict=False),
    _rule("Property Damage Only",        "right",       pages=(2,)),
    _rule("Property Damage",             "right",       pages=(2,), strict=False),
    _rule("Not Applicable",              "right",       pages=(2, 3), strict=False),

    # ── Page 2/3 — Conviction Details box (category + points-status) ────
    _rule("# of Conviction with points", "right",       pages=(2, 3)),
    _rule("# of Convictions with points","right",       pages=(2, 3)),
    _rule("# of Conviction not pointed", "right",       pages=(2, 3)),
    _rule("# of Convictions not pointed","right",       pages=(2, 3)),
    _rule("Total # of Convictions",      "right",       pages=(2, 3)),
    _rule("Convictions With Points",     "right",       pages=(2, 3)),
    _rule("Convictions Not Pointed",     "right",       pages=(2, 3)),
    _rule("With Points",                 "right",       pages=(2, 3), strict=False),
    _rule("Not Pointed",                 "right",       pages=(2, 3), strict=False),
    _rule("Driver Convictions",          "right",       pages=(2, 3)),
    _rule("Vehicle Convictions",         "right",       pages=(2, 3)),
    _rule("Load Convictions",            "right",       pages=(2, 3)),
    _rule("Other Convictions",           "right",       pages=(2, 3)),
    _rule("Driver Categories",           "right",       pages=(2, 3)),
    # Bare-word category labels (constrained to pp.2-3 so they don't bleed into
    # the event log on later pages).
    _rule("Driver",                      "right",       pages=(2, 3), strict=False),
    _rule("Vehicle",                     "right",       pages=(2, 3), strict=False),
    _rule("Load",                        "right",       pages=(2, 3), strict=False),
    _rule("Other",                       "right",       pages=(2, 3), strict=False),

    # ── Page 2 — # of Inspections by Level + OOS by Level (levelStats) ──
    _rule("# of Inspections by level",          "below", pages=(2,)),
    _rule("# of Inspections out of service by level", "below", pages=(2,)),
    _rule("Total number of vehicles inspected", "right", pages=(2,)),
    _rule("Level 1",                     "right",       pages=(2,)),
    _rule("Level 2",                     "right",       pages=(2,)),
    _rule("Level 3",                     "right",       pages=(2,)),
    _rule("Level 4",                     "right",       pages=(2,)),
    _rule("Level 5",                     "right",       pages=(2,)),

    # ── Page 2 — Performance Summary table (Event Type / % cols / rows) ─
    _rule("Event Type",                  "label-only",  pages=(2,)),
    _rule("% of set Threshold",          "label-only",  pages=(2,)),
    _rule("% Weight",                    "label-only",  pages=(2,)),
    _rule("% Overall Contribution",      "label-only",  pages=(2,)),
    _rule("Collision",                   "right",       pages=(2,)),
    _rule("Conviction",                  "right",       pages=(2,)),
    _rule("Inspection",                  "right",       pages=(2,)),
    _rule("Overall Violation Rate",      "right",       pages=(2,)),
    _rule("Overall Violation Rate %",    "right",       pages=(2,)),

    # ── Page 2/3 — KMR Breakdown tables ─────────────────────────────────
    _rule("Collision Breakdown by Kilometre Rate Change",  "label-only", pages=(2, 3)),
    _rule("Conviction Breakdown by Kilometre Rate Change", "label-only", pages=(2, 3)),
    # KMR period table headers (multiple variants)
    _rule("Time Period",                 "label-only",  pages=(2, 3)),
    _rule("Time",                        "label-only",  pages=(2, 3), strict=False),
    _rule("From Date",                   "label-only",  pages=(2, 3)),
    _rule("To Date",                     "label-only",  pages=(2, 3)),
    _rule("# of Months",                 "label-only",  pages=(2, 3)),
    _rule("KM Rate Per Month",           "label-only",  pages=(2, 3)),
    _rule("Number of Events",            "label-only",  pages=(2, 3)),
    _rule("Number of Points",            "label-only",  pages=(2, 3)),
    _rule("# of Events",                 "label-only",  pages=(2, 3)),
    _rule("# of Points",                 "label-only",  pages=(2, 3)),
    _rule("Set Threshold",               "label-only",  pages=(2, 3)),
    _rule("Percent of Set Threshold",    "label-only",  pages=(2, 3)),
    _rule("Period",                      "label-only",  pages=(2, 3), strict=False),
    _rule("Total",                       "right",       pages=(2, 3), strict=False),

    # ── Page 3 — Inspection Threshold Calculation ───────────────────────
    _rule("# of CVSA inspections conducted", "right",   pages=(3,)),
    _rule("# of Vehicles inspected",     "right",       pages=(3,)),
    _rule("# of Drivers inspected",      "right",       pages=(3,)),
    _rule("Total units inspected",       "right",       pages=(3,)),
    _rule("# of Driver points assigned", "right",       pages=(3,)),
    _rule("# of Driver points assigned (D)","right",    pages=(3,)),
    _rule("# of Vehicle points assigned","right",       pages=(3,)),
    _rule("# of Vehicle points assigned (V)","right",   pages=(3,)),
    _rule("Total inspection points",     "right",       pages=(3,)),
    _rule("Total inspection points (0.6875",  "right",  pages=(3,), strict=False),
    _rule("# of Set inspection threshold points", "right", pages=(3,)),
    _rule("% of set threshold",          "right",       pages=(3,)),
    _rule("% of Set Threshold",          "right",       pages=(3,)),
]

# ── 🟣 PURPLE: per-inspection events (Inspection rows in event log) ─────────
PURPLE_FIELDS: list[FieldRule] = [
    _rule("CVIR #",                      "right",       pages=tuple(range(3, 30))),
    _rule("Inspection Date",             "right",       pages=tuple(range(3, 30))),
    _rule("Start Time",                  "right",       pages=tuple(range(3, 30))),
    _rule("End Time",                    "right",       pages=tuple(range(3, 30))),
    _rule("Level of Inspection",         "right",       pages=tuple(range(3, 30))),
    _rule("Location",                    "right",       pages=tuple(range(3, 30))),
    _rule("Vehicle Points",              "right",       pages=tuple(range(3, 30))),
    _rule("Driver Points",               "right",       pages=tuple(range(3, 30))),
    _rule("Categories OOS",              "right",       pages=tuple(range(3, 30))),
    _rule("Total All Defects",           "right",       pages=tuple(range(3, 30))),
    _rule("Driver Name",                 "right",       pages=tuple(range(3, 30))),
    _rule("Driver Licence Number",       "right",       pages=tuple(range(3, 30))),
    _rule("Unit Number",                 "right",       pages=tuple(range(3, 30))),
    _rule("Vehicle Plate",               "right",       pages=tuple(range(3, 30))),
    _rule("Vehicle Make",                "right",       pages=tuple(range(3, 30))),
    _rule("Defect",                      "right",       pages=tuple(range(3, 30))),
    _rule("Category*",                   "right",       pages=tuple(range(3, 30))),
    _rule("Co-Driver",                   "right",       pages=tuple(range(3, 30))),
    _rule("Impoundment",                 "right",       pages=tuple(range(3, 30))),
    _rule("Charged",                     "right",       pages=tuple(range(3, 30))),
]

# ── 🔴 RED: per-collision events ────────────────────────────────────────────
RED_FIELDS: list[FieldRule] = [
    _rule("Collision Class",             "right",       pages=tuple(range(3, 30))),
    _rule("Vehicle Action",              "right",       pages=tuple(range(3, 30))),
    _rule("Vehicle Condition",           "right",       pages=tuple(range(3, 30))),
    _rule("Driver Action",               "right",       pages=tuple(range(3, 30))),
    _rule("Driver Condition",            "right",       pages=tuple(range(3, 30))),
    _rule("Driver Charged",              "right",       pages=tuple(range(3, 30))),
    _rule("Microfilm #",                 "right",       pages=tuple(range(3, 30))),
    _rule("Incident Date",               "right",       pages=tuple(range(3, 30))),
    _rule("Incident Time",               "right",       pages=tuple(range(3, 30))),
    _rule("Class",                       "right",       pages=tuple(range(3, 30))),
    # NEW v4: collision-row jurisdiction + location
    _rule("Collision Jurisdiction",      "right",       pages=tuple(range(3, 30))),
    _rule("Collision Location",          "right",       pages=tuple(range(3, 30))),
    _rule("Jurisdiction",                "right",       pages=tuple(range(3, 30)), strict=False),
    _rule("Location",                    "right",       pages=tuple(range(3, 30)), strict=False),
    _rule("Collision Date",              "right",       pages=tuple(range(3, 30))),
    _rule("Collision Time",              "right",       pages=tuple(range(3, 30))),
]

# ── 🟠 ORANGE: per-conviction events ────────────────────────────────────────
ORANGE_FIELDS: list[FieldRule] = [
    _rule("Conviction Date",             "right",       pages=tuple(range(3, 30))),
    _rule("Charged Carrier",             "right",       pages=tuple(range(3, 30))),
    _rule("Offence",                     "right",       pages=tuple(range(3, 30))),
    _rule("CCMTA Equivalency",           "right",       pages=tuple(range(3, 30))),
    _rule("Offence Location",            "right",       pages=tuple(range(3, 30))),
    _rule("Event Date",                  "right",       pages=tuple(range(3, 30))),
    _rule("Event Time",                  "right",       pages=tuple(range(3, 30))),
    _rule("Ticket #",                    "right",       pages=tuple(range(3, 30))),
    # NEW v4: conviction-row jurisdiction
    _rule("Conviction Jurisdiction",     "right",       pages=tuple(range(3, 30))),
    _rule("Conviction Location",         "right",       pages=tuple(range(3, 30))),
    _rule("Carrier Charged",             "right",       pages=tuple(range(3, 30))),
]

# ── 🟤 BROWN: travel kilometric rows (typically pages 18+) ──────────────────
BROWN_FIELDS: list[FieldRule] = [
    _rule("Travel Kilometric Information","label-only", pages=tuple(range(15, 30))),
    _rule("From Date",                   "right",       pages=tuple(range(15, 30))),
    _rule("To Date",                     "right",       pages=tuple(range(15, 30))),
    _rule("# Vehicles",                  "right",       pages=tuple(range(15, 30))),
    _rule("# Double Shifted",            "right",       pages=tuple(range(15, 30))),
    _rule("Total Vehicles",              "right",       pages=tuple(range(15, 30))),
    _rule("Ontario KM",                  "right",       pages=tuple(range(15, 30))),
    _rule("Rest of Canada KM",           "right",       pages=tuple(range(15, 30))),
    _rule("US/Mexico KM",                "right",       pages=tuple(range(15, 30))),
    _rule("Total KM",                    "right",       pages=tuple(range(15, 30))),
    _rule("Estimated",                   "label-only",  pages=tuple(range(15, 30))),
    _rule("Actual",                      "label-only",  pages=tuple(range(15, 30))),
]

# ── 🟡 YELLOW: optional / audit trail ───────────────────────────────────────
YELLOW_FIELDS: list[FieldRule] = [
    _rule("Search Date and Time",        "right",       pages=(1,)),
    _rule("Order #",                     "right",       pages=(1,)),
    _rule("US DOT #",                    "right",       pages=(1,)),
    _rule("Mobile #",                    "right",       pages=(1,)),
    _rule("Fax #",                       "right",       pages=(1,)),
    _rule("# of Vehicles Double Shifted","right",       pages=(1,)),
    _rule("Most Recent Audit",           "below",       pages=(2,)),
]


# ── Matching helpers ────────────────────────────────────────────────────────
def normalize(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s


def poly_to_rect(poly, scale: float) -> fitz.Rect:
    xs = [p[0] for p in poly]
    ys = [p[1] for p in poly]
    return fitz.Rect(min(xs) * scale, min(ys) * scale, max(xs) * scale, max(ys) * scale)


def find_value_rect(label_rect: fitz.Rect, other_rects: list[tuple[fitz.Rect, str]], direction: str) -> fitz.Rect | None:
    if direction == "label-only":
        return None
    label_cy = (label_rect.y0 + label_rect.y1) / 2
    label_h  = max(label_rect.y1 - label_rect.y0, 6)
    candidates: list[tuple[float, fitz.Rect]] = []
    for rect, _t in other_rects:
        if rect == label_rect:
            continue
        cy = (rect.y0 + rect.y1) / 2
        if direction == "right":
            if abs(cy - label_cy) > label_h * 0.85: continue
            if rect.x0 < label_rect.x1 - 2:        continue
            dx = rect.x0 - label_rect.x1
            if dx > 320:                           continue
            candidates.append((dx, rect))
        elif direction == "below":
            if rect.y0 < label_rect.y1 - 2:        continue
            dy = rect.y0 - label_rect.y1
            if dy > 60:                            continue
            if rect.x1 < label_rect.x0 - 30 or rect.x0 > label_rect.x1 + 240: continue
            candidates.append((dy, rect))
    if not candidates: return None
    candidates.sort(key=lambda t: t[0])
    return candidates[0][1]


def add_highlight(page: fitz.Page, rect: fitz.Rect, color, opacity: float) -> None:
    ann = page.add_highlight_annot(rect)
    ann.set_colors(stroke=color)
    ann.set_opacity(opacity)
    ann.update()


# ── Legend page ─────────────────────────────────────────────────────────────
def add_legend_page(doc: fitz.Document, totals: dict[str, dict[str, int]], src_name: str) -> None:
    legend = doc.new_page(pno=0, width=612, height=792)
    legend.insert_text((50, 70), "CVOR PDF — Frontend Extraction Map (v2)",
                       fontsize=20, fontname="hebo", color=(0.1, 0.2, 0.45))
    legend.insert_text((50, 96), f"Source: {src_name}",
                       fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))
    legend.insert_text((50, 110),
                       "Highlights ONLY the values the TrackSmart frontend renders. Labels and values use distinct shades.",
                       fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4))

    y = 150
    legend.insert_text((50, y), "Color legend  (label = pale shade, value = strong shade)",
                       fontsize=13, fontname="hebo")
    y += 24

    rows = [
        (GREEN_LABEL,  GREEN_VALUE,  "GREEN",  "Carrier Identity        →  Carrier Profile (one-time)",                    totals["green"]),
        (BLUE_LABEL,   BLUE_VALUE,   "BLUE",   "Per-Pull Metric         →  cvorPeriodicReports + Pull Snapshot mini sections", totals["blue"]),
        (PURPLE_LABEL, PURPLE_VALUE, "PURPLE", "Inspection Event        →  events[type=inspection]",                       totals["purple"]),
        (RED_LABEL,    RED_VALUE,    "RED",    "Collision Event         →  events[type=collision]",                        totals["red"]),
        (ORANGE_LABEL, ORANGE_VALUE, "ORANGE", "Conviction Event        →  events[type=conviction]",                       totals["orange"]),
        (BROWN_LABEL,  BROWN_VALUE,  "BROWN",  "Travel Kilometric row   →  pull.travelKm[]",                               totals["brown"]),
        (YELLOW_LABEL, YELLOW_VALUE, "YELLOW", "Optional / Audit trail  →  push if present, OK to skip",                   totals["yellow"]),
    ]
    for col_label, col_value, name, desc, sub in rows:
        legend.draw_rect(fitz.Rect(50, y, 80, y + 18),  color=col_label, fill=col_label, overlay=True)
        legend.draw_rect(fitz.Rect(82, y, 112, y + 18), color=col_value, fill=col_value, overlay=True)
        legend.insert_text((120, y + 13), f"{name:6}  =  {desc}", fontsize=11, fontname="helv")
        y += 18
        legend.insert_text((120, y + 11),
                           f"  labels: {sub['label']:3d}   values: {sub['value']:3d}   total: {sub['label'] + sub['value']:3d}",
                           fontsize=9.5, fontname="heit", color=(0.5, 0.5, 0.5))
        y += 22

    y += 8
    legend.insert_text((50, y), "Frontend surfaces driven by this data (v2)", fontsize=13, fontname="hebo")
    y += 22
    surfaces = [
        "•  Pull Snapshot card → 10 collapsible mini-sections (Performance, Mileage, Collision/Conviction Details,",
        "                       Rating Comparison, KMR Breakdowns, Inspection Stats, Intervention & Event Details,",
        "                       Travel Kilometric Information)",
        "•  Top KPI cards (8): Inspections / CVOR Impact / OOS / Clean / Tickets / Veh Pts / Dvr Pts / CVOR Pts",
        "•  Bottom all-pulls aggregate Intervention & Event Details table with chart toggle",
        "•  Pull-by-Pull Data table (15 rows, one per upload)",
        "•  CVOR Performance History charts (Rating, Category Contribs, OOS, Event Counts)",
    ]
    for line in surfaces:
        legend.insert_text((60, y), line, fontsize=10.5, fontname="helv"); y += 15

    y += 14
    legend.insert_text((50, y), "Companion artefacts:", fontsize=11, fontname="hebo"); y += 18
    for line in (
        "•  cvor-extraction-response.schema.json     — authoritative JSON schema (Draft-07)",
        "•  examples/response-single.json            — full ground-truth example",
        "•  templates/*.csv                          — flattened CSV per data shape",
        "•  validate.py                              — schema + cross-field self-test (15 checks)",
    ):
        legend.insert_text((60, y), line, fontsize=10, fontname="helv"); y += 14

    legend.insert_text((50, 760), "Original PDF follows on the next page →",
                       fontsize=9, fontname="heit", color=(0.4, 0.4, 0.4))


# ── Main pipeline ───────────────────────────────────────────────────────────
def _by_length_desc(rules: Iterable[FieldRule]) -> list[tuple[FieldRule, str]]:
    return sorted(((r, normalize(r.label)) for r in rules), key=lambda t: len(t[1]), reverse=True)


def _matches_label(rule: FieldRule, lbl_norm: str, tnorm: str, page_no: int) -> bool:
    if rule.pages and page_no not in rule.pages: return False
    if rule.strict: return tnorm.rstrip(":*") == lbl_norm
    return lbl_norm == tnorm or lbl_norm in tnorm


# Match buckets in priority order. More specific (event-type) buckets before
# generic blue/yellow so e.g. "Driver" inside a conviction row goes ORANGE not BLUE.
_BUCKET_ORDER = ["green", "red", "orange", "brown", "purple", "blue", "yellow"]


def _build_rules() -> dict:
    return {
        "green":  ("GREEN",  GREEN_LABEL,  GREEN_VALUE,  _by_length_desc(GREEN_FIELDS)),
        "blue":   ("BLUE",   BLUE_LABEL,   BLUE_VALUE,   _by_length_desc(BLUE_FIELDS)),
        "purple": ("PURPLE", PURPLE_LABEL, PURPLE_VALUE, _by_length_desc(PURPLE_FIELDS)),
        "red":    ("RED",    RED_LABEL,    RED_VALUE,    _by_length_desc(RED_FIELDS)),
        "orange": ("ORANGE", ORANGE_LABEL, ORANGE_VALUE, _by_length_desc(ORANGE_FIELDS)),
        "brown":  ("BROWN",  BROWN_LABEL,  BROWN_VALUE,  _by_length_desc(BROWN_FIELDS)),
        "yellow": ("YELLOW", YELLOW_LABEL, YELLOW_VALUE, _by_length_desc(YELLOW_FIELDS)),
    }


def process_one(src: Path, ocr: RapidOCR, rules_by_bucket: dict, out_dir: Path | None = None) -> dict:
    dst = annotated_path(src, out_dir)
    print(f"\n=== {src.name}  ->  {dst} ===")
    doc = fitz.open(src)
    print(f"  {doc.page_count} pages")

    totals = {b: {"label": 0, "value": 0} for b in _BUCKET_ORDER}

    for i, page in enumerate(doc, start=1):
        t0 = time.time()
        pix = page.get_pixmap(dpi=DPI)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        result, _ = ocr(np.array(img))
        if not result:
            print(f"  p.{i:2d}: no text detected, skipping")
            continue

        all_rects: list[tuple[fitz.Rect, str]] = [
            (poly_to_rect(poly, PIX_TO_PDF), text) for poly, text, _ in result
        ]
        page_counts = {b: {"label": 0, "value": 0} for b in _BUCKET_ORDER}

        def key(r: fitz.Rect) -> tuple[int, int, int, int]:
            return (round(r.x0), round(r.y0), round(r.x1), round(r.y1))

        claimed: set[tuple[int, int, int, int]] = set()

        for poly, text, _conf in result:
            tnorm = normalize(text)
            label_rect = poly_to_rect(poly, PIX_TO_PDF)
            if key(label_rect) in claimed: continue

            matched_bucket: str | None = None
            matched_rule: FieldRule | None = None
            for bucket in _BUCKET_ORDER:
                _name, _l, _v, rule_list = rules_by_bucket[bucket]
                for rule, lbl_norm in rule_list:
                    if _matches_label(rule, lbl_norm, tnorm, i):
                        matched_bucket = bucket
                        matched_rule = rule
                        break
                if matched_bucket: break
            if not matched_bucket or not matched_rule: continue

            _name, label_color, value_color, _rules = rules_by_bucket[matched_bucket]
            add_highlight(page, label_rect, label_color, LABEL_OPACITY)
            claimed.add(key(label_rect))
            page_counts[matched_bucket]["label"] += 1

            value_rect = find_value_rect(label_rect, all_rects, matched_rule.direction)
            if value_rect is not None and key(value_rect) not in claimed:
                add_highlight(page, value_rect, value_color, VALUE_OPACITY)
                claimed.add(key(value_rect))
                page_counts[matched_bucket]["value"] += 1

        for b in _BUCKET_ORDER:
            totals[b]["label"] += page_counts[b]["label"]
            totals[b]["value"] += page_counts[b]["value"]
        summary = " ".join(f"{rules_by_bucket[b][0][:3]} {page_counts[b]['label']+page_counts[b]['value']:2d}"
                           for b in _BUCKET_ORDER)
        print(f"  p.{i:2d}:  {summary}  ({len(result)} ocr regions, {time.time() - t0:.1f}s)")

    add_legend_page(doc, totals, src.name)
    doc.save(dst, garbage=4, deflate=True, clean=True)
    doc.close()

    print()
    print(f"  totals for {src.name}:")
    for b in _BUCKET_ORDER:
        name, _l, _v, _r = rules_by_bucket[b]
        l, v = totals[b]["label"], totals[b]["value"]
        print(f"    {name:6}  {l:3d} L  +  {v:3d} V  =  {l + v:3d}")
    grand = sum(totals[b]["label"] + totals[b]["value"] for b in _BUCKET_ORDER)
    print(f"    GRAND   {grand:3d} highlights")
    print(f"  saved {dst}")
    return totals


def main(argv: list[str]) -> int:
    if argv:
        sources = [Path(a) for a in argv]
        out_dir = None  # write next to each source
    else:
        sources = DEFAULT_BATCH
        out_dir = V4_OUT
        if not sources:
            print(f"ERROR: no PDFs found in {V4_RAW}", file=sys.stderr)
            return 1

    missing = [p for p in sources if not p.exists()]
    if missing:
        for m in missing:
            print(f"ERROR: source not found: {m}", file=sys.stderr)
        return 1

    print("loading OCR engine ...")
    ocr = RapidOCR()
    rules_by_bucket = _build_rules()

    grand_totals = {b: {"label": 0, "value": 0} for b in _BUCKET_ORDER}
    per_file: list[tuple[Path, dict]] = []

    for src in sources:
        t = process_one(src, ocr, rules_by_bucket, out_dir)
        per_file.append((src, t))
        for b in _BUCKET_ORDER:
            grand_totals[b]["label"] += t[b]["label"]
            grand_totals[b]["value"] += t[b]["value"]

    print("\n" + "=" * 100)
    print("BATCH SUMMARY (v2)")
    print("=" * 100)
    cols = ["GRN", "BLU", "PUR", "RED", "ORG", "BRN", "YEL", "TOTAL"]
    header = f"{'file':54}  " + " ".join(f"{c:>5}" for c in cols)
    print(header); print("-" * len(header))
    for src, t in per_file:
        bvals = [t[b]["label"] + t[b]["value"] for b in _BUCKET_ORDER]
        total = sum(bvals)
        print(f"{src.name[:54]:54}  " + " ".join(f"{v:5d}" for v in bvals + [total]))
    bvals = [grand_totals[b]["label"] + grand_totals[b]["value"] for b in _BUCKET_ORDER]
    total = sum(bvals)
    print("-" * len(header))
    print(f"{'GRAND TOTAL':54}  " + " ".join(f"{v:5d}" for v in bvals + [total]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
