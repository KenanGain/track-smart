#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════════════════
# 1. TOOLTIP — White background, dark text
# ═══════════════════════════════════════════════════════

# Shadow rect — lighter on white bg
src = src.replace(
    '<rect x={tx+3} y={ty+3} width={tw} height={th} rx={8} fill="#000" opacity="0.20"/>',
    '<rect x={tx+3} y={ty+3} width={tw} height={th} rx={8} fill="#64748b" opacity="0.10"/>'
)

# Background — dark to white
src = src.replace(
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#0f172a"/>',
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#ffffff"/>'
)

# Border — keep alert color, make slightly bolder
src = src.replace(
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="none" stroke={alertColor} strokeWidth="1.2" opacity="0.7"/>',
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="none" stroke={alertColor} strokeWidth="1.5" opacity="0.9"/>'
)

# Pull date label — white text to dark
src = src.replace(
    '<text x={tx+10} y={ty+16} fontSize="13" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>',
    '<text x={tx+10} y={ty+16} fontSize="13" fontWeight="bold" fill="#0f172a" fontFamily="monospace">{d.periodLabel}</text>'
)

# Separator line — dark to light
src = src.replace(
    '<line x1={tx+8} x2={tx+tw-8} y1={ty+45} y2={ty+45} stroke="#1e293b" strokeWidth="0.8"/>',
    '<line x1={tx+8} x2={tx+tw-8} y1={ty+45} y2={ty+45} stroke="#e2e8f0" strokeWidth="0.8"/>'
)

# Metric label text — white/muted to dark
src = src.replace(
    "fill={r.bold?'white':'#94a3b8'} fontWeight={r.bold?'bold':'normal'} fontFamily=\"sans-serif\">{r.label}</text>",
    "fill={r.bold?'#0f172a':'#64748b'} fontWeight={r.bold?'bold':'normal'} fontFamily=\"sans-serif\">{r.label}</text>"
)

# Tooltip ty clamp — increase from 280 to 400 to avoid cutoff
src = src.replace(
    'const ty = Math.max(pT + 4, Math.min(cy - th / 2, pT + 240 - th));',
    'const ty = Math.max(pT + 4, Math.min(cy - th / 2, pT + 380 - th));'
)

# ═══════════════════════════════════════════════════════
# 2. CHART HEIGHTS — reduce, control with container height
# ═══════════════════════════════════════════════════════

src = src.replace('const CH=300, VH=CH+pT+pB;',  'const CH=220, VH=CH+pT+pB;')
src = src.replace('const CH2=240, VH2=CH2+pT+pB;', 'const CH2=180, VH2=CH2+pT+pB;')
src = src.replace('const CH3=240, VH3=CH3+pT+pB;', 'const CH3=180, VH3=CH3+pT+pB;')
src = src.replace('const CH4=240, VH4=CH4+pT+pB;', 'const CH4=180, VH4=CH4+pT+pB;')

# Add explicit height container to each SVG wrapper so it renders at pixel-precise height
src = src.replace(
    '<svg viewBox={`0 0 ${VW} ${VH}`} style={{width:\'100%\',display:\'block\'}}>',
    '<svg viewBox={`0 0 ${VW} ${VH}`} style={{width:\'100%\',height:\'260px\',display:\'block\'}}>'
)
src = src.replace(
    '<svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:\'100%\',display:\'block\'}}>',
    '<svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:\'100%\',height:\'195px\',display:\'block\'}}>'
)
src = src.replace(
    '<svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:\'100%\',display:\'block\'}}>',
    '<svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:\'100%\',height:\'195px\',display:\'block\'}}>'
)
src = src.replace(
    '<svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:\'100%\',display:\'block\'}}>',
    '<svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:\'100%\',height:\'195px\',display:\'block\'}}>'
)

# ═══════════════════════════════════════════════════════
# 3. CHART WRAPPER SPACING — divide-y, no py padding
# ═══════════════════════════════════════════════════════

src = src.replace(
    '<div className="px-0 py-2 space-y-0">',
    '<div className="divide-y divide-slate-100">'
)

# ═══════════════════════════════════════════════════════
# 4. CHART LEGEND ROWS — px-4, add pt-3 pb-1 per chart wrapper
# ═══════════════════════════════════════════════════════

# Chart 1 wrapper px-5 → px-4 pt-3 pb-1
src = src.replace(
    '                          <div className="px-5">\n                            <div className="flex items-center gap-4 mb-1.5 flex-wrap">',
    '                          <div className="px-4 pt-3 pb-1">\n                            <div className="flex items-center gap-4 mb-1.5 flex-wrap">'
)
# Charts 2,3,4 wrapper px-5 → px-4 pt-3 pb-1
src = src.replace(
    '                          <div className="px-5">\n                            <div className="flex items-center gap-3 mb-2 flex-wrap">',
    '                          <div className="px-4 pt-3 pb-1">\n                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">'
)

# ═══════════════════════════════════════════════════════
# 5. PULL-BY-PULL TABLE — padding, sticky header, whitespace
# ═══════════════════════════════════════════════════════

# Add padding to table header row
src = src.replace(
    '                      {/* ══ PULL-BY-PULL DATA TABLE ══ */}\n                      <div>\n                        <div className="flex items-center gap-2 mb-3">',
    '                      {/* ══ PULL-BY-PULL DATA TABLE ══ */}\n                      <div className="px-4 pt-4 pb-1">\n                        <div className="flex items-center gap-2 mb-3">'
)

# Table min-width
src = src.replace(
    "style={{minWidth:'1050px'}}",
    "style={{minWidth:'1180px'}}"
)

# Sticky header
src = src.replace(
    '              <tr className="bg-slate-800 text-white">',
    '              <tr className="bg-slate-800 text-white sticky top-0 z-10">'
)

# Add whitespace-nowrap to numeric th elements
for old, new in [
    ('<th className="text-right px-2 py-3 font-semibold text-slate-200">Rating</th>',
     '<th className="text-right px-2 py-3 font-semibold text-slate-200 whitespace-nowrap">Rating</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-blue-300">Col%</th>',
     '<th className="text-right px-2 py-3 font-semibold text-blue-300 whitespace-nowrap">Col%</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-amber-300">Con%</th>',
     '<th className="text-right px-2 py-3 font-semibold text-amber-300 whitespace-nowrap">Con%</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-red-300">Ins%</th>',
     '<th className="text-right px-2 py-3 font-semibold text-red-300 whitespace-nowrap">Ins%</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-slate-300">#Col</th>',
     '<th className="text-right px-2 py-3 font-semibold text-slate-300 whitespace-nowrap">#Col</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-slate-300">#Conv</th>',
     '<th className="text-right px-2 py-3 font-semibold text-slate-300 whitespace-nowrap">#Conv</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-indigo-300">Col Pts</th>',
     '<th className="text-right px-2 py-3 font-semibold text-indigo-300 whitespace-nowrap">Col Pts</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-pink-300">Conv Pts</th>',
     '<th className="text-right px-2 py-3 font-semibold text-pink-300 whitespace-nowrap">Conv Pts</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-violet-300">OOS Ov%</th>',
     '<th className="text-right px-2 py-3 font-semibold text-violet-300 whitespace-nowrap">OOS Ov%</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-red-300">OOS Veh%</th>',
     '<th className="text-right px-2 py-3 font-semibold text-red-300 whitespace-nowrap">OOS Veh%</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-emerald-300">OOS Drv%</th>',
     '<th className="text-right px-2 py-3 font-semibold text-emerald-300 whitespace-nowrap">OOS Drv%</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-slate-300">Trucks</th>',
     '<th className="text-right px-2 py-3 font-semibold text-slate-300 whitespace-nowrap">Trucks</th>'),
    ('<th className="text-right px-2 py-3 font-semibold text-slate-300">Total Mi</th>',
     '<th className="text-right px-2 py-3 font-semibold text-slate-300 whitespace-nowrap">Total Mi</th>'),
]:
    src = src.replace(old, new)

# ═══════════════════════════════════════════════════════
# 6. DRILL-DOWN SECTION — add horizontal padding
# ═══════════════════════════════════════════════════════
# Find drill-down border-t div (the one that contains the inspection details)
src = src.replace(
    '<div className="border-t-2 border-indigo-200 pt-5">',
    '<div className="border-t-2 border-indigo-200 px-4 pt-5 pb-5">'
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

print("Done — CVOR UI overhaul applied")
