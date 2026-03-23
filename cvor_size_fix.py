#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

# ── Reduce chart heights (smaller but still full-width) ───────────────────────
# Tighten padding too
src = src.replace(
    "const VW = 1200, pL = 62, pR = 20, pT = 28, pB = 64;",
    "const VW = 1200, pL = 56, pR = 18, pT = 20, pB = 58;"
)

# Chart 1: Rating  380 → 220
src = src.replace("const CH=380, VH=CH+pT+pB;",  "const CH=220, VH=CH+pT+pB;")
# Charts 2-4: 300 → 170
src = src.replace("const CH2=300, VH2=CH2+pT+pB;", "const CH2=170, VH2=CH2+pT+pB;")
src = src.replace("const CH3=300, VH3=CH3+pT+pB;", "const CH3=170, VH3=CH3+pT+pB;")
src = src.replace("const CH4=300, VH4=CH4+pT+pB;", "const CH4=170, VH4=CH4+pT+pB;")

# Tighten space between charts
src = src.replace(
    '<div className="px-0 py-3 space-y-1">',
    '<div className="px-0 py-2 space-y-0">'
)

# ── Put Charts 2+3 side by side in a 2-col grid ───────────────────────────────
# Find the Chart 2 and Chart 3 block boundaries and wrap them in a grid.
# We'll use a simpler approach: wrap chart 2 start and chart 3 end with grid divs.

# Mark chart 2 open with a grid wrapper start
src = src.replace(
    "                      {/* ══ CHART 2: Category Contributions ══ */}",
    "                      {/* ══ CHARTS 2+3: Side by side grid ══ */}\n                      <div className=\"grid grid-cols-2 gap-0\">\n                      {/* ══ CHART 2: Category Contributions ══ */}"
)

# Mark chart 3 close — we need to close the grid after chart 3 ends.
# Chart 4 starts right after chart 3 closes.
src = src.replace(
    "                      {/* ══ CHART 4: Events & Points ══ */}",
    "                      </div>{/* end 2-col grid */}\n                      {/* ══ CHART 4: Events & Points ══ */}"
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

print("Done")
