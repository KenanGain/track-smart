#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

# ── 1. Increase chart heights and viewbox width ───────────────────────────────
# Chart 1: Rating  CH=280 → CH=380, VW stays 1200 but pB gets bigger for labels
src = src.replace(
    "const VW = 1200, pL = 58, pR = 35, pT = 24, pB = 56;",
    "const VW = 1200, pL = 62, pR = 20, pT = 28, pB = 64;"
)

# Chart 1 height
src = src.replace(
    "const CH=280, VH=CH+pT+pB;",
    "const CH=380, VH=CH+pT+pB;"
)

# Chart 2 height
src = src.replace(
    "const CH2=220, VH2=CH2+pT+pB;",
    "const CH2=300, VH2=CH2+pT+pB;"
)

# Chart 3 height
src = src.replace(
    "const CH3=220, VH3=CH3+pT+pB;",
    "const CH3=300, VH3=CH3+pT+pB;"
)

# Chart 4 height
src = src.replace(
    "const CH4=220, VH4=CH4+pT+pB;",
    "const CH4=300, VH4=CH4+pT+pB;"
)

# ── 2. Fix SVG height style — remove fixed px height so aspect-ratio is natural ──
# This makes clicks work because browser SVG coordinates match viewBox exactly.
# style={{width:'100%',height:`${VH}px`,display:'block'}}  → aspect-ratio based
src = src.replace(
    "style={{width:'100%',height:`${VH}px`,display:'block'}}",
    "style={{width:'100%',display:'block'}}"
)
src = src.replace(
    "style={{width:'100%',height:`${VH2}px`,display:'block'}}",
    "style={{width:'100%',display:'block'}}"
)
src = src.replace(
    "style={{width:'100%',height:`${VH3}px`,display:'block'}}",
    "style={{width:'100%',display:'block'}}"
)
src = src.replace(
    "style={{width:'100%',height:`${VH4}px`,display:'block'}}",
    "style={{width:'100%',display:'block'}}"
)

# ── 3. Reduce wrapper padding to use full card width ─────────────────────────
src = src.replace(
    '<div className="p-5 space-y-6">',
    '<div className="px-0 py-3 space-y-1">'
)

# ── 4. Remove inner div wrapper padding from each chart label row ──────────────
# Chart legend rows use px inside the p-5 div — give them explicit px now
# Chart 1 label row
src = src.replace(
    '<div>\n                            <div className="flex items-center gap-4 mb-2 flex-wrap">',
    '<div className="px-5">\n                            <div className="flex items-center gap-4 mb-2 flex-wrap">'
)
# Charts 2,3,4 label rows
src = src.replace(
    '<div>\n                            <div className="flex items-center gap-3 mb-2 flex-wrap">',
    '<div className="px-5">\n                            <div className="flex items-center gap-3 mb-2 flex-wrap">'
)

# ── 5. Make SVG container truly full-width (remove w-full wrapper with margin) ─
# Keep the w-full wrapper, just ensure it has no extra padding
src = src.replace(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH}`}',
    '<div>\n                              <svg viewBox={`0 0 ${VW} ${VH}`}'
)
src = src.replace(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH2}`}',
    '<div>\n                              <svg viewBox={`0 0 ${VW} ${VH2}`}'
)
src = src.replace(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH3}`}',
    '<div>\n                              <svg viewBox={`0 0 ${VW} ${VH3}`}'
)
src = src.replace(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH4}`}',
    '<div>\n                              <svg viewBox={`0 0 ${VW} ${VH4}`}'
)

# ── 6. Fix tooltip Y-clamp — use updated CH for chart 1 ───────────────────────
# The tip Y clamp used hardcoded 260: Math.min(cy - th / 2, pT + 260 - th)
# Update to use a large value so it doesn't clip
src = src.replace(
    "const ty = Math.max(pT, Math.min(cy - th / 2, pT + 260 - th));",
    "const ty = Math.max(pT + 4, Math.min(cy - th / 2, pT + 360 - th));"
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

print("Done — full-space chart fixes applied")
