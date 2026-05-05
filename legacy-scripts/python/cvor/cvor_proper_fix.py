#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════════════════════════════
# 1. REMOVE preserveAspectRatio="none" from ALL SVGs
#    Restores correct proportions — no more oval dots or warped text
# ═══════════════════════════════════════════════════════════════════
import re
# Remove the preserveAspectRatio="none" attribute from all svg tags
src = re.sub(r' preserveAspectRatio="none"', '', src)

# ═══════════════════════════════════════════════════════════════════
# 2. PROPER RESPONSIVE SVG approach
#    Use padding-bottom % trick: wrapper div sets aspect ratio,
#    SVG fills it absolutely → full-width, no letterbox, no distortion
# ═══════════════════════════════════════════════════════════════════

# Chart 1 — replace <div>\n<svg...height:300px...> with padding-bottom wrapper
src = src.replace(
    '                            <div>\n                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:\'100%\',height:\'300px\',display:\'block\'}}>',
    '                            <div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>'
)
# Chart 2
src = src.replace(
    '                            <div>\n                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:\'100%\',height:\'220px\',display:\'block\'}}>',
    '                            <div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH2/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>'
)
# Chart 3 — uses <div className="w-full">
src = src.replace(
    '                              <div className="w-full">\n                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:\'100%\',height:\'220px\',display:\'block\'}}>',
    '                              <div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH3/VW*100).toFixed(2)}%`}}>\n                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>'
)
# Chart 4
src = src.replace(
    '                            <div>\n                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:\'100%\',height:\'220px\',display:\'block\'}}>',
    '                            <div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH4/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>'
)

# ═══════════════════════════════════════════════════════════════════
# 3. REDUCE chart heights so they're not too tall on wide screens
#    Target: ~260px at 1400px container, ~320px at 1700px container
# ═══════════════════════════════════════════════════════════════════
# Chart 1: CH=220 → 180  (VH = 180+18+60 = 258)
src = src.replace('const CH=220, VH=CH+pT+pB;', 'const CH=180, VH=CH+pT+pB;')
# Charts 2-4: CH=180 → 150  (VH = 150+18+60 = 228)
src = src.replace('const CH2=180, VH2=CH2+pT+pB;', 'const CH2=150, VH2=CH2+pT+pB;')
src = src.replace('const CH3=180, VH3=CH3+pT+pB;', 'const CH3=150, VH3=CH3+pT+pB;')
src = src.replace('const CH4=180, VH4=CH4+pT+pB;', 'const CH4=150, VH4=CH4+pT+pB;')

# Tighten pB so less wasted space on x-axis
src = src.replace(
    'const VW = 1200, pL = 50, pR = 16, pT = 18, pB = 60;',
    'const VW = 1200, pL = 54, pR = 60, pT = 16, pB = 54;'
)
# Note: pR=60 to give threshold labels room (they render right of the chart)

# ═══════════════════════════════════════════════════════════════════
# 4. INCREASE all SVG font sizes for readability
# ═══════════════════════════════════════════════════════════════════

# Y-axis grid text
src = src.replace('fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%', 'fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}%')
src = src.replace('fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}', 'fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}')

# X-axis labels
src = src.replace(
    'textAnchor="end" fontSize="9.5"\n                            fill={al===\'critical\'?\'#dc2626\':al===\'warning\'?\'#b45309\':\'#475569\'}',
    'textAnchor="end" fontSize="11.5"\n                            fill={al===\'critical\'?\'#dc2626\':al===\'warning\'?\'#b45309\':\'#475569\'}'
)

# Threshold line labels
src = src.replace('fontSize="10.5" fontWeight="700" fill={th.c}>{th.lbl}</text>',
                  'fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>')

# Zone band labels
src = src.replace('fontSize="11" fill={z.labelColor} fontWeight="600" opacity="0.7">{z.label}</text>',
                  'fontSize="13" fill={z.labelColor} fontWeight="700" opacity="0.8">{z.label}</text>')

# OOS threshold labels
src = src.replace('fontSize="11" fontWeight="600" fill="#94a3b8">20%</text>',
                  'fontSize="12" fontWeight="700" fill="#94a3b8">20%</text>')
src = src.replace('fontSize="11" fontWeight="600" fill="#ef4444">35%</text>',
                  'fontSize="12" fontWeight="700" fill="#ef4444">35%</text>')

# Value labels on dots
src = src.replace('fontSize="11.5" fontWeight="bold"', 'fontSize="13" fontWeight="bold"')

# Bar count labels
src = src.replace('fontSize="10.5" fontWeight="600" fill="#1d4ed8"', 'fontSize="12" fontWeight="700" fill="#1d4ed8"')
src = src.replace('fontSize="10.5" fontWeight="600" fill="#92400e"', 'fontSize="12" fontWeight="700" fill="#92400e"')

# OOS y-axis
src = src.replace('fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}%</text>',
                  'fontSize="11.5" fill="#94a3b8" fontFamily="monospace">{v}%</text>')

# ═══════════════════════════════════════════════════════════════════
# 5. TABLE — bigger font, better row height
# ═══════════════════════════════════════════════════════════════════
src = src.replace(
    '<table className="w-full text-[11px] border-collapse" style={{minWidth:\'1180px\'}}>',
    '<table className="w-full text-[12px] border-collapse" style={{minWidth:\'1200px\'}}>'
)
# Header cells bigger
src = src.replace(
    '<tr className="bg-slate-800 text-white sticky top-0 z-10">',
    '<tr className="bg-slate-800 text-white sticky top-0 z-10 text-[11.5px]">'
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)

print("Done")
