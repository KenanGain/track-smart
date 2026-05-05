#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

# ── 1. Add preserveAspectRatio="none" to ALL 4 chart SVGs ──────────────────
# This makes the SVG fill the FULL width×height of its container, fixing
# the letterbox/empty-sides issue caused by "xMidYMid meet" default behavior.

src = src.replace(
    "style={{width:'100%',height:'260px',display:'block'}}>",
    "preserveAspectRatio=\"none\" style={{width:'100%',height:'260px',display:'block'}}>"
)
src = src.replace(
    "style={{width:'100%',height:'195px',display:'block'}}>",
    "preserveAspectRatio=\"none\" style={{width:'100%',height:'195px',display:'block'}}>"
)

# ── 2. Increase heights for large screens ──────────────────────────────────
# Chart 1 Rating: 260 → 300px (more room for 0-100% range with threshold lines)
src = src.replace("height:'260px'", "height:'300px'")
# Charts 2/3/4: 195 → 220px
src = src.replace("height:'195px'", "height:'220px'")

# ── 3. Fix chart 4 wrapper (missed in last script — still px-5) ────────────
src = src.replace(
    '                          <div className="px-5">\n                            <div className="flex items-center gap-4 mb-2 flex-wrap">',
    '                          <div className="px-4 pt-3 pb-1">\n                            <div className="flex items-center gap-4 mb-1.5 flex-wrap">'
)

# ── 4. Reduce internal SVG left padding to use more of the width ───────────
# pL=56 was for standalone full-bleed. Now container has px-4 (16px each side).
# Tighten to pL=48 so y-axis labels still fit but chart data starts closer to edge.
src = src.replace(
    'const VW = 1200, pL = 56, pR = 18, pT = 20, pB = 58;',
    'const VW = 1200, pL = 50, pR = 16, pT = 18, pB = 60;'
)

# ── 5. Make legend rows non-wrapping on large screens ─────────────────────
# Use overflow:hidden on legend description text to prevent layout push
src = src.replace(
    '<span className="ml-auto text-[11px] text-slate-400 italic">Each line = weighted % contribution to CVOR score</span>',
    '<span className="ml-auto text-[10px] text-slate-400 italic hidden lg:inline">Each line = weighted % contribution to CVOR score</span>'
)
src = src.replace(
    '<span className="ml-auto text-[11px] text-slate-400 italic">Hover bar → full pull details · click → inspections</span>',
    '<span className="ml-auto text-[10px] text-slate-400 italic hidden lg:inline">Hover bar → full pull details · click → inspections</span>'
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

print("Done")
