"""
Annotate the Ontario MTO CVOR PDF with the TrackSmart frontend extraction map.

Goal: every value the UI actually renders is highlighted, in a color keyed
to which data sink it lands in. Labels and values get distinct shades of
the same hue so the reader can tell them apart at a glance.

Color legend
    GREEN   = Carrier Identity     (one-time → Carrier Profile)
    BLUE    = Per-Pull Metric      (one record per upload → cvorPeriodicReports
                                   chart + Pull-by-Pull table + KPI cards)
    PURPLE  = Per-Inspection Event (one record per Inspection event in the
                                   PDF event log → bottom CVOR Inspections list)
    YELLOW  = Optional / audit trail

For every category we use TWO shades:
    *_LABEL  = lighter / pastel  → applied to the LABEL token
    *_VALUE  = stronger / saturated → applied to the VALUE token next to it

Reads:  C:/Users/kenan/Downloads/06042001_Ontario.pdf
Writes: C:/Users/kenan/Downloads/06042001_Ontario.annotated.pdf

Companion artefacts (in scripts/):
    cvor_extraction_schema.json
    cvor_pulls_template.csv
    cvor_inspection_events_template.csv
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

# Default batch — run over every CVOR sample we have. Override with CLI args:
#   python scripts/highlight_cvor_pdf.py path/to/file1.pdf path/to/file2.pdf
# Output: <name>.annotated.pdf written next to each source.
DEFAULT_BATCH: list[Path] = [
    Path(r"C:/Users/kenan/Downloads/06042001_Ontario.pdf"),
    Path(r"C:/Users/kenan/Downloads/03072022_Ontario.pdf"),
    Path(r"C:/Users/kenan/Downloads/06042001_Ontario (2).pdf"),
    Path(r"C:/Users/kenan/Downloads/20250203_100539_0000850abd10.pdf"),
    Path(r"C:/Users/kenan/Downloads/20241104_125433_0000369fbd10.pdf"),
]


def annotated_path(src: Path) -> Path:
    return src.with_name(src.stem + ".annotated.pdf")

# ── Two-tone colors per category (RGB 0-1) ──────────────────────────────────
GREEN_LABEL  = (0.78, 0.96, 0.78)   # carrier identity — pale green
GREEN_VALUE  = (0.30, 0.78, 0.40)   # carrier identity — strong green
BLUE_LABEL   = (0.78, 0.90, 1.00)   # per-pull metric — pale blue
BLUE_VALUE   = (0.30, 0.62, 0.95)   # per-pull metric — strong blue
PURPLE_LABEL = (0.92, 0.85, 1.00)   # inspection event — pale violet
PURPLE_VALUE = (0.62, 0.40, 0.92)   # inspection event — strong violet
YELLOW_LABEL = (1.00, 0.97, 0.70)   # optional — pale yellow
YELLOW_VALUE = (0.95, 0.80, 0.20)   # optional — strong yellow

LABEL_OPACITY = 0.42
VALUE_OPACITY = 0.55

DPI = 200
PIX_TO_PDF = 72.0 / DPI


# ── Field-rule model ────────────────────────────────────────────────────────
@dataclass(frozen=True)
class FieldRule:
    label: str
    direction: str = "right"      # right | below | label-only
    pages: tuple[int, ...] = ()   # () = any page; otherwise restrict
    strict: bool = False          # True = whole-token equality (set by helper)


def _rule(label: str, direction: str = "right", pages: tuple[int, ...] = ()) -> FieldRule:
    """Auto-strict for short labels (<=18 chars or single word)."""
    short = len(label) <= 18 or " " not in label.strip()
    return FieldRule(label=label, direction=direction, pages=pages, strict=short)


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

# ── 🔵 BLUE: per-pull metrics (pages 1–3) ───────────────────────────────────
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

    # Page 2 — OOS rates
    _rule("Overall Out of Service %",    "right",       pages=(2,)),
    _rule("Vehicle Out of Service %",    "right",       pages=(2,)),
    _rule("Driver Out of Service %",     "right",       pages=(2,)),

    # Page 2 — Inspections by Level (drives "CVOR Rating Comparison" cards)
    _rule("# of Inspections by level",          "below", pages=(2,)),
    _rule("# of Inspections out of service by level", "below", pages=(2,)),
    _rule("Total number of vehicles inspected", "right", pages=(2,)),

    # Page 2 — Performance Summary (R-Factor)
    _rule("Performance Summary",         "label-only",  pages=(2,)),
    _rule("% of set Threshold",          "label-only",  pages=(2,)),
    _rule("% Weight",                    "label-only",  pages=(2,)),
    _rule("% Overall Contribution",      "label-only",  pages=(2,)),
    _rule("Collision",                   "right",       pages=(2,)),
    _rule("Conviction",                  "right",       pages=(2,)),
    _rule("Inspection",                  "right",       pages=(2,)),
    _rule("Overall Violation Rate",      "right",       pages=(2,)),

    # Page 2/3 — Collision & Conviction Breakdown by Kilometre Rate Change
    _rule("Collision Breakdown by Kilometre Rate Change",  "label-only", pages=(2, 3)),
    _rule("Conviction Breakdown by Kilometre Rate Change", "label-only", pages=(2, 3)),
    _rule("# of Points",                 "label-only",  pages=(2, 3)),

    # Page 3 — Inspection Threshold formula
    _rule("# of CVSA inspections conducted", "right",   pages=(3,)),
    _rule("# of Vehicles inspected",     "right",       pages=(3,)),
    _rule("# of Drivers inspected",      "right",       pages=(3,)),
    _rule("Total units inspected",       "right",       pages=(3,)),
    _rule("# of Driver points assigned", "right",       pages=(3,)),
    _rule("# of Vehicle points assigned","right",       pages=(3,)),
    _rule("Total inspection points",     "right",       pages=(3,)),
    _rule("# of Set inspection threshold points", "right", pages=(3,)),
    _rule("% of set threshold",          "right",       pages=(3,)),
]

# ── 🟣 PURPLE: per-inspection events (pages 4–17, Inspection events only) ──
PURPLE_FIELDS: list[FieldRule] = [
    _rule("CVIR #",                      "right",       pages=tuple(range(3, 18))),
    _rule("Inspection Date",             "right",       pages=tuple(range(3, 18))),
    _rule("Start Time",                  "right",       pages=tuple(range(3, 18))),
    _rule("End Time",                    "right",       pages=tuple(range(3, 18))),
    _rule("Level of Inspection",         "right",       pages=tuple(range(3, 18))),
    _rule("Location",                    "right",       pages=tuple(range(3, 18))),
    _rule("Vehicle Points",              "right",       pages=tuple(range(3, 18))),
    _rule("Driver Points",               "right",       pages=tuple(range(3, 18))),
    _rule("Categories OOS",              "right",       pages=tuple(range(3, 18))),
    _rule("Total All Defects",           "right",       pages=tuple(range(3, 18))),
    _rule("Driver Name",                 "right",       pages=tuple(range(3, 18))),
    _rule("Driver Licence Number",       "right",       pages=tuple(range(3, 18))),
    _rule("Unit Number",                 "right",       pages=tuple(range(3, 18))),
    _rule("Vehicle Plate",               "right",       pages=tuple(range(3, 18))),
    _rule("Vehicle Make",                "right",       pages=tuple(range(3, 18))),
    _rule("Defect",                      "right",       pages=tuple(range(3, 18))),
    _rule("Category*",                   "right",       pages=tuple(range(3, 18))),
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


def find_value_rect(
    label_rect: fitz.Rect,
    other_rects: list[tuple[fitz.Rect, str]],
    direction: str,
) -> fitz.Rect | None:
    """Return the OCR rect that visually represents the value for this label."""
    if direction == "label-only":
        return None

    label_cy = (label_rect.y0 + label_rect.y1) / 2
    label_h  = max(label_rect.y1 - label_rect.y0, 6)
    candidates: list[tuple[float, fitz.Rect]] = []

    for rect, _text in other_rects:
        if rect == label_rect:
            continue
        cy = (rect.y0 + rect.y1) / 2

        if direction == "right":
            if abs(cy - label_cy) > label_h * 0.85:
                continue
            if rect.x0 < label_rect.x1 - 2:
                continue
            dx = rect.x0 - label_rect.x1
            if dx > 320:
                continue
            candidates.append((dx, rect))

        elif direction == "below":
            if rect.y0 < label_rect.y1 - 2:
                continue
            dy = rect.y0 - label_rect.y1
            if dy > 60:
                continue
            if rect.x1 < label_rect.x0 - 30 or rect.x0 > label_rect.x1 + 240:
                continue
            candidates.append((dy, rect))

    if not candidates:
        return None
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

    legend.insert_text(
        (50, 70), "CVOR PDF — Frontend Extraction Map",
        fontsize=20, fontname="hebo", color=(0.1, 0.2, 0.45),
    )
    legend.insert_text(
        (50, 96),
        f"Source: {src_name}",
        fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4),
    )
    legend.insert_text(
        (50, 110),
        "Highlights ONLY the values the TrackSmart frontend renders. Labels and values use distinct shades.",
        fontsize=10, fontname="helv", color=(0.4, 0.4, 0.4),
    )

    y = 150
    legend.insert_text((50, y), "Color legend  (label = pale shade, value = strong shade)",
                       fontsize=13, fontname="hebo")
    y += 24

    rows = [
        (GREEN_LABEL,  GREEN_VALUE,  "GREEN",
         "Carrier Identity        →  Carrier Profile (one-time)",
         totals["green"]),
        (BLUE_LABEL,   BLUE_VALUE,   "BLUE",
         "Per-Pull Metric         →  cvorPeriodicReports (chart, KPIs, table)",
         totals["blue"]),
        (PURPLE_LABEL, PURPLE_VALUE, "PURPLE",
         "Per-Inspection Event    →  bottom CVOR Inspections list",
         totals["purple"]),
        (YELLOW_LABEL, YELLOW_VALUE, "YELLOW",
         "Optional / Audit trail  →  push if present, OK to skip",
         totals["yellow"]),
    ]
    for col_label, col_value, name, desc, sub in rows:
        legend.draw_rect(fitz.Rect(50, y,  80, y + 18),
                         color=col_label, fill=col_label, overlay=True)
        legend.draw_rect(fitz.Rect(82, y,  112, y + 18),
                         color=col_value, fill=col_value, overlay=True)
        legend.insert_text((120, y + 13),
                           f"{name:6}  =  {desc}",
                           fontsize=11, fontname="helv")
        y += 18
        legend.insert_text((120, y + 11),
                           f"  labels: {sub['label']:3d}   values: {sub['value']:3d}   total: {sub['label'] + sub['value']:3d}",
                           fontsize=9.5, fontname="heit", color=(0.5, 0.5, 0.5))
        y += 22

    y += 8
    legend.insert_text((50, y), "Frontend surfaces driven by this data",
                       fontsize=13, fontname="hebo")
    y += 22
    surfaces = [
        "•  Top KPI cards: Overall CVOR Rating, Collisions, Convictions, Inspections (zone + threshold)",
        "•  Out-of-Service Rates strip:    Overall / Vehicle / Driver",
        "•  Mileage Summary:               Ontario, Canada, US/Mexico, Total",
        "•  CVOR Rating Comparison:        Inspections by Level (L1-L5) + OOS counts",
        "•  CVOR Performance History:      multi-line chart over all pulls (15 here)",
        "•  Category Contributions chart:  Col% / Con% / Ins% over time",
        "•  Out-of-Service Rates chart:    Overall / Vehicle / Driver over time",
        "•  Event Counts & Points chart:   collision/conviction bars + col/conv pts lines",
        "•  Pull-by-Pull table:            14 columns, one row per pull",
        "•  CVOR Inspections list:         per-event, drilldown for selected pull",
    ]
    for line in surfaces:
        legend.insert_text((60, y), line, fontsize=10.5, fontname="helv")
        y += 15

    y += 14
    legend.insert_text((50, y), "Companion artefacts (scripts/):", fontsize=11, fontname="hebo")
    y += 18
    for line in (
        "•  cvor_extraction_schema.json          — full JSON schema for extractor output",
        "•  cvor_pulls_template.csv              — CSV header + sample row for the per-pull record",
        "•  cvor_inspection_events_template.csv  — CSV header + sample rows for inspection events",
        "•  obsidian-vault/09 - References/CVOR Upload Reference.md  — long-form readme",
    ):
        legend.insert_text((60, y), line, fontsize=10, fontname="helv")
        y += 14

    legend.insert_text(
        (50, 760),
        "Original PDF follows on the next page →",
        fontsize=9, fontname="heit", color=(0.4, 0.4, 0.4),
    )


# ── Main pipeline ───────────────────────────────────────────────────────────
def _by_length_desc(rules: Iterable[FieldRule]) -> list[tuple[FieldRule, str]]:
    return sorted(
        ((r, normalize(r.label)) for r in rules),
        key=lambda t: len(t[1]),
        reverse=True,
    )


def _matches_label(rule: FieldRule, lbl_norm: str, tnorm: str, page_no: int) -> bool:
    if rule.pages and page_no not in rule.pages:
        return False
    if rule.strict:
        return tnorm.rstrip(":*") == lbl_norm
    return lbl_norm == tnorm or lbl_norm in tnorm


_BUCKET_ORDER = ["green", "blue", "purple", "yellow"]


def _build_rules() -> dict:
    return {
        "green":  ("GREEN",  GREEN_LABEL,  GREEN_VALUE,  _by_length_desc(GREEN_FIELDS)),
        "blue":   ("BLUE",   BLUE_LABEL,   BLUE_VALUE,   _by_length_desc(BLUE_FIELDS)),
        "purple": ("PURPLE", PURPLE_LABEL, PURPLE_VALUE, _by_length_desc(PURPLE_FIELDS)),
        "yellow": ("YELLOW", YELLOW_LABEL, YELLOW_VALUE, _by_length_desc(YELLOW_FIELDS)),
    }


def process_one(src: Path, ocr: RapidOCR, rules_by_bucket: dict) -> dict:
    """Annotate a single CVOR PDF. Returns per-bucket totals."""
    dst = annotated_path(src)
    print(f"\n=== {src.name}  ->  {dst.name} ===")

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
            if key(label_rect) in claimed:
                continue

            matched_bucket: str | None = None
            matched_rule: FieldRule | None = None
            for bucket in _BUCKET_ORDER:
                _name, _l, _v, rule_list = rules_by_bucket[bucket]
                for rule, lbl_norm in rule_list:
                    if _matches_label(rule, lbl_norm, tnorm, i):
                        matched_bucket = bucket
                        matched_rule = rule
                        break
                if matched_bucket:
                    break
            if not matched_bucket or not matched_rule:
                continue

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
        summary = " | ".join(
            f"{rules_by_bucket[b][0]:6} L{page_counts[b]['label']:3d} V{page_counts[b]['value']:3d}"
            for b in _BUCKET_ORDER
        )
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
    else:
        sources = DEFAULT_BATCH

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
        t = process_one(src, ocr, rules_by_bucket)
        per_file.append((src, t))
        for b in _BUCKET_ORDER:
            grand_totals[b]["label"] += t[b]["label"]
            grand_totals[b]["value"] += t[b]["value"]

    # ── Batch summary ──
    print("\n" + "═" * 78)
    print("BATCH SUMMARY")
    print("═" * 78)
    header = f"{'file':54}  {'GRN':>5} {'BLU':>5} {'PUR':>5} {'YEL':>5} {'TOTAL':>6}"
    print(header)
    print("-" * len(header))
    for src, t in per_file:
        g = t["green"]["label"]  + t["green"]["value"]
        b = t["blue"]["label"]   + t["blue"]["value"]
        p = t["purple"]["label"] + t["purple"]["value"]
        y = t["yellow"]["label"] + t["yellow"]["value"]
        print(f"{src.name[:54]:54}  {g:5d} {b:5d} {p:5d} {y:5d} {g+b+p+y:6d}")
    g = grand_totals["green"]["label"]  + grand_totals["green"]["value"]
    b = grand_totals["blue"]["label"]   + grand_totals["blue"]["value"]
    p = grand_totals["purple"]["label"] + grand_totals["purple"]["value"]
    y = grand_totals["yellow"]["label"] + grand_totals["yellow"]["value"]
    print("-" * len(header))
    print(f"{'GRAND TOTAL':54}  {g:5d} {b:5d} {p:5d} {y:5d} {g+b+p+y:6d}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
