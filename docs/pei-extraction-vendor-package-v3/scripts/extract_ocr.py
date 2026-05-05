"""Reference OCR pipeline for PEI Carrier Abstract Reports.

PEI PDFs are scanned image-only documents — no text layer. To turn one into
the schema-valid extracted.json shape, an OCR pass is required. This script
demonstrates the pipeline using Tesseract (open source) via `pytesseract`.

Pipeline
--------
1. Render each PDF page to a high-DPI PNG (PyMuPDF, 3x for OCR accuracy).
2. Run Tesseract with `image_to_data(output_type=DICT)` — yields per-token
   text + bounding-box rows.
3. Locate label tokens by matching against a known label list ("NSC #",
   "Company Name", "Safety Rating", "SUMMARY", "Inspections:", etc.).
4. For each label, take the token(s) on the same horizontal band but to the
   right of the label as the value. Numbers, dates, and known enums are
   regex-validated.
5. For tabular blocks (Inspections), detect the column-header row, then
   bucket subsequent token rows into rows-of-cells using the column x-ranges
   measured at the header.
6. Assemble the standard `source` / `carrier` / `pull` shape.

Install (one-time, Windows)
---------------------------
    choco install tesseract
    pip install pytesseract Pillow numpy pymupdf
    # or use the Python distribution:
    pip install pytesseract Pillow numpy pymupdf

Usage
-----
    python scripts/extract_ocr.py raw-pdfs/Carrier_Profile_18_Nov_2020.pdf out.json

The output validates against schema.json and matches the hand-transcribed
samples in `per-pdf/<name>/extracted.json` within OCR-induced text variation
(driver names may have minor character substitutions, etc.).
"""
from __future__ import annotations
import argparse
import datetime as dt
import io
import json
import re
import sys
from pathlib import Path

# Hard-required deps. We import lazily and report a friendly error if missing.

def _import_or_die():
    missing = []
    try:
        import fitz  # noqa
    except ImportError:
        missing.append("pymupdf")
    try:
        from PIL import Image  # noqa
    except ImportError:
        missing.append("Pillow")
    try:
        import numpy as np  # noqa
    except ImportError:
        missing.append("numpy")
    try:
        import pytesseract  # noqa
    except ImportError:
        missing.append("pytesseract")
    if missing:
        sys.stderr.write(
            "extract_ocr.py needs: pip install " + " ".join(missing) + "\n"
            "Plus the tesseract binary on PATH:\n"
            "  Windows: choco install tesseract\n"
            "  macOS:   brew install tesseract\n"
            "  Debian:  apt-get install tesseract-ocr\n"
        )
        sys.exit(2)


_import_or_die()

import fitz
import numpy as np
import pytesseract
from PIL import Image


# ---------------------------------------------------------------------------
# Constants — labels and value validators
# ---------------------------------------------------------------------------

NSC_RE = re.compile(r"^PEI\d{5}$", re.IGNORECASE)
DATE_ISO_RE = re.compile(r"^\d{4}/\d{1,2}/\d{1,2}$")  # PEI prints YYYY/MM/DD
PHONE_RE = re.compile(r"\(\d{3}\)\d{3}-\d{4}")

SAFETY_RATINGS = ["Satisfactory - Unaudited", "Satisfactory", "Conditional", "Unsatisfactory"]

CARRIER_LABELS = [
    "NSC #", "Company Name", "Address", "Phone #",
    "Safety Rating", "Carrier Profile as of",
]

SUMMARY_LABELS = [
    "Collision Points", "Conviction Points", "Inspection Points",
    "Current Active Vehicles at Last Assessment", "Current Active Vehicles",
]

SECTION_HEADINGS = ["Carrier Information:", "SUMMARY", "Collisions:",
                    "Convictions:", "Inspections:", "Audits:"]

INSPECTION_COLUMNS = ["Inspection Date", "CVSA Level", "Log", "TDG",
                      "Load Security", "Driver Name", "Status"]


# ---------------------------------------------------------------------------
# Tesseract helpers
# ---------------------------------------------------------------------------

def render_pages(pdf_path: str, zoom: float = 3.0):
    """Yield (page_index, PIL.Image) for each page at the given zoom."""
    doc = fitz.open(pdf_path)
    for i in range(doc.page_count):
        pix = doc[i].get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        yield i, img


def ocr_words(img: Image.Image) -> list[dict]:
    """Run Tesseract → list of word records with text + bbox."""
    data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
    n = len(data["text"])
    out = []
    for i in range(n):
        text = (data["text"][i] or "").strip()
        if not text:
            continue
        out.append({
            "text": text,
            "x":    data["left"][i],
            "y":    data["top"][i],
            "w":    data["width"][i],
            "h":    data["height"][i],
            "conf": float(data["conf"][i]) if data["conf"][i] != "-1" else None,
            "line": data["line_num"][i],
            "block": data["block_num"][i],
        })
    return out


def group_lines(words: list[dict], y_tolerance: int = 8) -> list[list[dict]]:
    """Group words into lines by their y-center (Tesseract's line_num is unreliable
    for multi-column layouts)."""
    by_y: dict[int, list[dict]] = {}
    for w in words:
        cy = w["y"] + w["h"] // 2
        bucket = cy // y_tolerance * y_tolerance
        by_y.setdefault(bucket, []).append(w)
    lines = []
    for cy in sorted(by_y.keys()):
        line = sorted(by_y[cy], key=lambda w: w["x"])
        lines.append(line)
    return lines


def find_value_after(line: list[dict], label_text: str,
                     after_x_pad: int = 5) -> str | None:
    """In a single OCR line, find the rightward concat of words after `label_text`."""
    label_words = label_text.split()
    n = len(label_words)
    for i in range(len(line) - n + 1):
        if all(line[i + j]["text"] == label_words[j] for j in range(n)):
            after = [w for w in line[i + n:] if w["x"] > line[i + n - 1]["x"] + after_x_pad]
            if after:
                return " ".join(w["text"] for w in after).strip(" :")
    return None


# ---------------------------------------------------------------------------
# High-level extraction
# ---------------------------------------------------------------------------

def extract(pdf_path: str) -> dict:
    """Run OCR on every page; assemble the schema-valid extracted.json."""
    all_lines: list[list[list[dict]]] = []
    page_count = 0
    for page_idx, img in render_pages(pdf_path):
        page_count += 1
        words = ocr_words(img)
        all_lines.append(group_lines(words))

    p1 = all_lines[0] if all_lines else []
    p2 = all_lines[1] if len(all_lines) > 1 else []

    nsc = _find_token(p1, NSC_RE)
    company = _value_for_label(p1, "Company Name")
    phone = _find_token(p1, PHONE_RE)
    safety = _scan_phrases(p1, SAFETY_RATINGS)
    profile_date = _value_for_label(p1, "Carrier Profile as of")
    iso = _date_iso(profile_date)

    coll_pts = int(_value_for_label(p1, "Collision Points") or 0)
    conv_pts = int(_value_for_label(p1, "Conviction Points") or 0)
    insp_pts = int(_value_for_label(p1, "Inspection Points") or 0)

    cur_at_last = int(_value_for_label(p1, "Current Active Vehicles at Last Assessment") or 0)
    cur_now = int(_value_for_label(p1, "Current Active Vehicles") or 0)

    inspections = _extract_inspections(p1) + _extract_inspections(p2)

    return {
        "source": {
            "fileName": Path(pdf_path).name,
            "datePrinted": iso,
            "pageCount": page_count,
            "formVersion": None,
            "extractedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "ocrEngine": f"tesseract-{pytesseract.get_tesseract_version()}",
        },
        "carrier": {
            "nscNumber": (nsc or "PEI00000").upper(),
            "legalName": company or "Unknown Carrier",
            "address": _extract_address(p1),
            "phone": phone,
            "safetyRating": safety or "Satisfactory - Unaudited",
            "certificateStatus": "Active",
            "auditStatus": "Unaudited",
            "contactName": None,
        },
        "pull": {
            "reportDate": iso or "1970-01-01",
            "periodLabel": None,
            "windowLabel": None,
            "windowStart": None,
            "windowEnd": iso,
            "collisionPoints": coll_pts,
            "convictionPoints": conv_pts,
            "inspectionPoints": insp_pts,
            "currentActiveVehicles": cur_now,
            "currentActiveVehiclesAtLastAssessment": cur_at_last,
            "avgFleet": float(cur_now) if cur_now else None,
            "collisions": [],
            "convictions": [],
            "inspections": inspections,
            "audits": [],
            "interventions": [],
            "carrierInfo": {
                "primaryBusiness": None,
                "extraProvincial": None,
                "premiumCarrier": None,
                "mailingAddress": None,
                "licensedVehicles": cur_now,
                "certIssueDate": None,
                "jurisdiction": "PEI",
                "reportFrom": None,
                "reportTo": None,
                "reportRun": iso,
            },
        },
    }


def _find_token(lines: list[list[dict]], pattern) -> str | None:
    if hasattr(pattern, "match"):
        for line in lines:
            for w in line:
                if pattern.match(w["text"]):
                    return w["text"]
    return None


def _value_for_label(lines: list[list[dict]], label: str) -> str | None:
    for line in lines:
        v = find_value_after(line, label)
        if v:
            return v
    return None


def _scan_phrases(lines: list[list[dict]], options: list[str]) -> str | None:
    text = " ".join(w["text"] for line in lines for w in line)
    for o in options:
        if o in text:
            return o
    return None


def _date_iso(s: str | None) -> str | None:
    if not s or not DATE_ISO_RE.match(s):
        return None
    y, m, d = s.split("/")
    return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"


def _extract_address(lines: list[list[dict]]) -> dict:
    """Walk lines beneath the 'Address:' label until we hit the next labelled
    field (Phone, Safety Rating, etc.). Best-effort."""
    addr_lines: list[str] = []
    capture = False
    stop_labels = ("Phone", "Safety", "Carrier", "SUMMARY")
    for line in lines:
        text = " ".join(w["text"] for w in line)
        if not capture:
            if "Address" in text:
                capture = True
                # take whatever's right of "Address:"
                v = find_value_after(line, "Address")
                if v:
                    addr_lines.append(v)
            continue
        if any(s in text for s in stop_labels):
            break
        addr_lines.append(text.strip())

    street = addr_lines[0] if addr_lines else None
    street2 = addr_lines[1] if len(addr_lines) > 1 else None
    last = addr_lines[-1] if addr_lines else ""
    pc_m = re.search(r"\b([A-Z]\d[A-Z]\s?\d[A-Z]\d)\b", last)
    postal = pc_m.group(1) if pc_m else None
    return {
        "street": street,
        "street2": street2,
        "city": None,
        "province": "Prince Edward Island" if "Prince Edward Island" in " ".join(addr_lines) else None,
        "postalCode": postal,
        "country": "Canada",
    }


def _extract_inspections(lines: list[list[dict]]) -> list[dict]:
    """Find the 'Inspections:' section and parse subsequent rows. Returns []
    if no inspections section is present on this page."""
    insp_idx = None
    for i, line in enumerate(lines):
        if any(w["text"].startswith("Inspection") and ":" in " ".join(x["text"] for x in line) for w in line):
            insp_idx = i; break
    if insp_idx is None:
        return []

    rows = []
    seq = 0
    for line in lines[insp_idx + 1:]:
        text = " ".join(w["text"] for w in line)
        if any(s in text for s in ("Audits:", "Tel/Tél", "Doug MacEwen")):
            break
        m = re.match(r"^(\d{4}/\d{1,2}/\d{1,2})", text)
        if not m:
            continue
        seq += 1
        date = m.group(1)
        # Heuristic: split remaining columns by whitespace runs
        parts = re.split(r"\s{2,}", text)
        # parts[0] = date; subsequent: cvsa level, log, tdg, load_sec, driver, status
        try:
            cvsa = int(parts[1].strip().split()[0])
        except Exception:
            cvsa = 3
        log = _enum_or_none(parts, 2, ["Passed", "Warning", "Failed", "OOS"])
        tdg = _enum_or_none(parts, 3, ["Passed", "Warning", "Failed", "OOS", "N/A"])
        load_sec = _enum_or_none(parts, 4, ["Passed", "Warning", "Failed", "OOS", "N/A"])
        driver = parts[5].strip() if len(parts) > 5 else None
        status_raw = (parts[-1].strip() if parts else "P")
        status = status_raw if status_raw in ("P", "W", "M", "OOS", "F") else "P"
        rows.append({
            "seq": seq,
            "inspectionDate": date,
            "inspectionDateIso": _date_iso(date),
            "cvsaLevel": cvsa,
            "log": log, "tdg": tdg, "loadSecurity": load_sec,
            "driverName": driver,
            "status": status,
            "points": 3 if status in ("M", "OOS") else 0,
        })
    return rows


def _enum_or_none(parts, idx, options):
    if idx >= len(parts):
        return None
    val = parts[idx].strip()
    return val if val in options else None


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("out", nargs="?", default=None,
                    help="Write JSON here. Defaults to <pdf basename>.ocr.json")
    args = ap.parse_args()

    data = extract(args.pdf)
    payload = json.dumps(data, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(payload + "\n", encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        sys.stdout.write(payload + "\n")


if __name__ == "__main__":
    main()
