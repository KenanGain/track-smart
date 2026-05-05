"""Annotate a PEI Carrier Abstract Report PDF with the 7-color overlay.

PEI Carrier Abstract Reports are scanned image-only PDFs (no text layer) with
the page rotated 270° on the page object. To stay sane around the rotation
and avoid OCR-coordinate hand-mapping, this script:

  1. Renders each page to a 2x PNG (1224x1584 for letter, in display orientation).
  2. Auto-detects horizontal text bands by row-wise pixel darkness.
  3. Maps each detected band to a colour sink based on its y-range
     (matching the static form layout shared by all PEI samples).
  4. Draws translucent fills + solid borders on each band on the rendered image.
  5. Re-assembles the modified images into a new PDF.

Color sinks (same as AB / CVOR):
    GREEN  carrier identity                 -> carrier.*
    BLUE   pull-level metric                -> pull.{collisionPoints, convictionPoints, inspectionPoints, currentActiveVehicles, …}
    PURPLE CVSA inspection row              -> pull.inspections[]
    RED    collision row                    -> pull.collisions[]
    ORANGE conviction row                   -> pull.convictions[]
    YELLOW audit / source / footer / title  -> pull.audits[], source.*, header/footer
"""
from __future__ import annotations
import io
import sys
from pathlib import Path

import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageDraw


PALE = {
    "GREEN":  (180, 240, 196),
    "BLUE":   (190, 215, 252),
    "PURPLE": (230, 210, 252),
    "RED":    (252, 200, 200),
    "ORANGE": (252, 220, 188),
    "YELLOW": (252, 240, 188),
}
STRONG = {
    "GREEN":  (40,  170, 75),
    "BLUE":   (50,  100, 230),
    "PURPLE": (140, 70,  210),
    "RED":    (220, 50,  50),
    "ORANGE": (230, 130, 40),
    "YELLOW": (215, 175, 25),
}


# Page-1 section y-ranges in 2x render coordinates (1224x1584 letter).
# A detected band whose top falls inside a range gets coloured by that range.
# Order matters — first match wins.
PAGE1_SECTIONS = [
    # (y_min, y_max, color, description)
    (0,    210,  "YELLOW", "Top banner / logos / dept names"),
    (210,  310,  "YELLOW", "Title + abstract description"),
    (310,  500,  "GREEN",  "Carrier Information (carrier identity + safety rating)"),
    (500,  600,  "BLUE",   "SUMMARY block (point totals + active vehicles)"),
    (600,  690,  "RED",    "Collisions section"),
    (690,  790,  "ORANGE", "Convictions section"),
    (790,  1300, "PURPLE", "Inspections section"),
    (1300, 1600, "YELLOW", "Footer (Registrar signature + Tel/Fax + URL)"),
]

PAGE2_SECTIONS = [
    (0,    210,  "YELLOW", "Top banner / logos"),
    (210,  330,  "YELLOW", "Page 2 header"),
    (330,  600,  "PURPLE", "Inspections (continuation)"),
    (600,  900,  "YELLOW", "Audits section"),
    (900,  1600, "YELLOW", "Footer / Tel/Fax / URL"),
]


def detect_text_bands(img_gray: np.ndarray, *,
                      min_band_height: int = 8) -> list[tuple[int, int]]:
    """Find runs of rows where the row is meaningfully darker than white.

    Threshold is adaptive: scanner grain gives every row a non-zero baseline,
    so we use the 60th percentile of row darkness * 4 as a floor — well above
    grain noise but well below true text rows.
    """
    h = img_gray.shape[0]
    row_dark = (255 - img_gray).sum(axis=1)
    baseline = float(np.percentile(row_dark, 60))
    threshold = max(2500.0, baseline * 4.0)
    is_text = row_dark > threshold
    bands: list[tuple[int, int]] = []
    in_run = False
    start = 0
    for y in range(h):
        if is_text[y] and not in_run:
            in_run = True; start = y
        elif not is_text[y] and in_run:
            in_run = False
            if y - start >= min_band_height:
                bands.append((start, y))
    if in_run and h - start >= min_band_height:
        bands.append((start, h))
    return bands


def detect_text_columns(img_gray: np.ndarray, y0: int, y1: int, *,
                        darkness_threshold: int = 25,
                        min_run: int = 8,
                        merge_gap: int = 90) -> list[tuple[int, int]]:
    """For one band, find the x-ranges where text actually exists.

    `merge_gap` is the max whitespace (in 2x render pixels) between adjacent
    text runs that we still consider one logical phrase. 90 px keeps long
    titles and multi-word phrases ("BUSINESS PORTERS INC.", "National Safety
    Code Carrier Abstract Report") together as a single rectangle while still
    separating left-column from right-column items (which sit 400+ px apart).
    """
    if y1 <= y0:
        return []
    strip = img_gray[y0:y1, :]
    col_dark = (255 - strip).sum(axis=0) / max(1, y1 - y0)
    has_text = col_dark > darkness_threshold
    runs: list[tuple[int, int]] = []
    in_run = False
    start = 0
    w = strip.shape[1]
    for x in range(w):
        if has_text[x] and not in_run:
            in_run = True; start = x
        elif not has_text[x] and in_run:
            in_run = False
            if x - start >= min_run:
                runs.append((start, x))
    if in_run and w - start >= min_run:
        runs.append((start, w))
    # Merge close-together runs (gaps within a single line of text)
    merged: list[tuple[int, int]] = []
    for r in runs:
        if merged and r[0] - merged[-1][1] <= merge_gap:
            merged[-1] = (merged[-1][0], r[1])
        else:
            merged.append(r)
    return merged


def section_for(y0: int, sections: list) -> str | None:
    for ymin, ymax, color, _label in sections:
        if ymin <= y0 < ymax:
            return color
    return None


def annotate_page(page: fitz.Page, sections: list) -> Image.Image:
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples).convert("RGBA")
    arr = np.asarray(img.convert("L"))

    bands = detect_text_bands(arr)

    # Skip narrow strips at the page edges (margin artefacts).
    page_w = arr.shape[1]
    margin_x = 28

    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)

    counts: dict[str, int] = {}
    for (yb0, yb1) in bands:
        color = section_for(yb0, sections)
        if not color:
            continue

        # For each text band, find its column extents — yields a tighter box
        # than the full page-width.
        cols = detect_text_columns(arr, yb0, yb1)
        if not cols:
            continue

        # Pad the band a little vertically for visual breathing room.
        pad_y = 3

        for (xc0, xc1) in cols:
            # Skip near-margin tiny noise
            if xc1 - xc0 < 25:
                continue
            if xc0 < margin_x and xc1 < margin_x + 50:
                continue
            box = [xc0 - 4, yb0 - pad_y, xc1 + 4, yb1 + pad_y]
            rgb = PALE[color]
            odraw.rectangle(box, fill=(*rgb, 80))  # translucent fill
            counts[color] = counts.get(color, 0) + 1

    img = Image.alpha_composite(img, overlay)

    # Draw solid borders on top so the rect stays visible.
    bdraw = ImageDraw.Draw(img)
    for (yb0, yb1) in bands:
        color = section_for(yb0, sections)
        if not color: continue
        cols = detect_text_columns(arr, yb0, yb1)
        if not cols: continue
        pad_y = 3
        rgb = STRONG[color]
        for (xc0, xc1) in cols:
            if xc1 - xc0 < 25: continue
            if xc0 < margin_x and xc1 < margin_x + 50: continue
            box = [xc0 - 4, yb0 - pad_y, xc1 + 4, yb1 + pad_y]
            bdraw.rectangle(box, outline=(*rgb, 255), width=2)

    return img.convert("RGB"), counts


def annotate(src_pdf: str, dst_pdf: str) -> None:
    src = fitz.open(src_pdf)
    out = fitz.open()
    grand: dict[str, int] = {}

    for page_idx in range(src.page_count):
        page = src[page_idx]
        if page_idx == 0:
            sections = PAGE1_SECTIONS
        elif page_idx == 1:
            sections = PAGE2_SECTIONS
        else:
            sections = []

        img, counts = annotate_page(page, sections)
        for c, n in counts.items():
            grand[c] = grand.get(c, 0) + n

        # Insert as PNG image into a new page sized to original (in display orientation).
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        new_page = out.new_page(width=page.rect.width, height=page.rect.height)
        new_page.insert_image(new_page.rect, stream=buf.getvalue())

    out.save(dst_pdf, deflate=True, garbage=4)
    out.close(); src.close()
    print(f"Wrote {dst_pdf}; total regions: {sum(grand.values())}")
    for c, n in sorted(grand.items()):
        print(f"  {c:7s} {n}")


def main():
    if len(sys.argv) < 3:
        sys.stderr.write("usage: annotate_pdf.py <src.pdf> <per-pdf/<name>/ | annotated.pdf>\n")
        sys.exit(2)
    src = sys.argv[1]
    dst = Path(sys.argv[2])
    dst_pdf = str(dst / "annotated.pdf") if dst.is_dir() else str(dst)
    annotate(src, dst_pdf)


if __name__ == "__main__":
    main()
