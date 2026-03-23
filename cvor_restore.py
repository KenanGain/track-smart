#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# ───────────────────────────────────────────────────────────────────
# Load CHART_JSX from cvor_charts_v5.py
# ───────────────────────────────────────────────────────────────────
with open('c:/Users/kenan/Full prototpye code/cvor_charts_v5.py', 'r', encoding='utf-8') as f:
    chart_src = f.read()

start_marker = 'CHART_JSX = r"""'
start = chart_src.find(start_marker) + len(start_marker)
end   = chart_src.find('"""', start)
CHART_JSX = chart_src[start:end]
print(f"CHART_JSX loaded: {len(CHART_JSX)} chars")

# ───────────────────────────────────────────────────────────────────
# Load InspectionsPage.tsx
# ───────────────────────────────────────────────────────────────────
tsx_path = 'c:/Users/kenan/Full prototpye code/src/pages/inspections/InspectionsPage.tsx'
with open(tsx_path, 'r', encoding='utf-8') as f:
    src = f.read()
print(f"InspectionsPage.tsx loaded: {len(src)} chars")

# ───────────────────────────────────────────────────────────────────
# a. Fix import — add cvorPeriodicReports if not already present
# ───────────────────────────────────────────────────────────────────
if 'cvorPeriodicReports' not in src:
    old_import = "import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode, nscRiskBand, nscAnalytics } from './inspectionsData';"
    new_import = "import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode, nscRiskBand, nscAnalytics, cvorPeriodicReports } from './inspectionsData';"
    if old_import in src:
        src = src.replace(old_import, new_import)
        print("Fixed import: added cvorPeriodicReports")
    else:
        # Try a more flexible approach
        src = re.sub(
            r"(import \{[^}]*nscAnalytics[^}]*\} from './inspectionsData';)",
            lambda m: m.group(0).replace("nscAnalytics", "nscAnalytics, cvorPeriodicReports") if 'cvorPeriodicReports' not in m.group(0) else m.group(0),
            src
        )
        print("Fixed import (flexible): added cvorPeriodicReports")
else:
    print("Import already has cvorPeriodicReports")

# ───────────────────────────────────────────────────────────────────
# b. Fix cvorPeriod state type
# ───────────────────────────────────────────────────────────────────
old_state = "useState<'1M' | '3M' | '6M' | '12M' | '24M'>('24M')"
new_state = "useState<'Monthly' | 'Quarterly' | 'Semi-Annual' | 'All'>('All')"
if old_state in src:
    src = src.replace(old_state, new_state)
    print("Fixed cvorPeriod state type")
else:
    print("WARNING: cvorPeriod state not found in expected form")

# ───────────────────────────────────────────────────────────────────
# c. Add missing states after cvorPeriod line (if not already present)
# ───────────────────────────────────────────────────────────────────
hover_state = "const [cvorHoveredPull, setCvorHoveredPull] = useState<{ chart: string; idx: number } | null>(null);"
sel_state   = "const [cvorSelectedPull, setCvorSelectedPull] = useState<string | null>(null);"

if hover_state not in src:
    # Find the cvorPeriod line and insert after it
    cvor_period_pattern = re.compile(r"(const \[cvorPeriod, setCvorPeriod\] = useState[^\n]+\n)")
    m = cvor_period_pattern.search(src)
    if m:
        insert_pos = m.end()
        additions = ""
        if hover_state not in src:
            additions += f"  {hover_state}\n"
        if sel_state not in src:
            additions += f"  {sel_state}\n"
        src = src[:insert_pos] + additions + src[insert_pos:]
        print(f"Added missing states after cvorPeriod")
    else:
        print("WARNING: Could not find cvorPeriod state line to insert after")
else:
    print("Missing states already present")

# ───────────────────────────────────────────────────────────────────
# d-f. Remove CVOR SECTIONS 1, 2, 3
# Strategy: find each section marker and the boundary that follows
# ───────────────────────────────────────────────────────────────────

lines = src.splitlines(keepends=True)

def find_line(lines, marker):
    for i, l in enumerate(lines):
        if marker in l:
            return i
    return -1

sec1_start = find_line(lines, '{/* ===== CVOR SECTION 1:')
sec2_start = find_line(lines, '{/* ===== CVOR SECTION 2:')
sec3_start = find_line(lines, '{/* ===== CVOR SECTION 3:')
filter_start = find_line(lines, '{/* CVOR Inspection Filters */}')

print(f"Section markers: SEC1={sec1_start}, SEC2={sec2_start}, SEC3={sec3_start}, FILTER={filter_start}")

if sec1_start >= 0 and sec2_start >= 0 and sec3_start >= 0 and filter_start >= 0:
    # Build new lines: keep everything before SEC1, skip SEC1..SEC2 (exclusive),
    # keep SEC2..SEC3 (we'll remove that too), then inject before filter_start

    # We remove everything from sec1_start to filter_start (exclusive),
    # then inject CHART_JSX before the filter line.
    new_lines = lines[:sec1_start]
    # Add the injection + blank line before the filter section
    new_lines.append("\n")
    new_lines.append(CHART_JSX + "\n")
    new_lines.append("\n")
    # Add filter line and everything after
    new_lines.extend(lines[filter_start:])
    src = "".join(new_lines)
    print(f"Removed CVOR SECTIONS 1-3, injected CHART_JSX before CVOR Inspection Filters")
else:
    print("ERROR: Could not find all section markers!")
    # Try to at least inject before filter
    if filter_start >= 0:
        new_lines = lines[:filter_start]
        new_lines.append("\n")
        new_lines.append(CHART_JSX + "\n")
        new_lines.append("\n")
        new_lines.extend(lines[filter_start:])
        src = "".join(new_lines)
        print("Fallback: Injected CHART_JSX before CVOR Inspection Filters")

# ───────────────────────────────────────────────────────────────────
# h. Apply improvements from cvor_ui_overhaul.py
# ───────────────────────────────────────────────────────────────────

# Shadow rect
src = src.replace(
    '<rect x={tx+3} y={ty+3} width={tw} height={th} rx={8} fill="#000" opacity="0.20"/>',
    '<rect x={tx+3} y={ty+3} width={tw} height={th} rx={8} fill="#64748b" opacity="0.10"/>'
)

# Background — dark to white
src = src.replace(
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#0f172a"/>',
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#ffffff"/>'
)

# Border
src = src.replace(
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="none" stroke={alertColor} strokeWidth="1.2" opacity="0.7"/>',
    '<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="none" stroke={alertColor} strokeWidth="1.5" opacity="0.9"/>'
)

# Pull date label — white to dark
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

# Tooltip ty clamp
src = src.replace(
    'const ty = Math.max(pT + 4, Math.min(cy - th / 2, pT + 240 - th));',
    'const ty = Math.max(pT + 4, Math.min(cy - th / 2, pT + 380 - th));'
)

# Chart heights
src = src.replace('const CH=300, VH=CH+pT+pB;',  'const CH=220, VH=CH+pT+pB;')
src = src.replace('const CH2=240, VH2=CH2+pT+pB;', 'const CH2=180, VH2=CH2+pT+pB;')
src = src.replace('const CH3=240, VH3=CH3+pT+pB;', 'const CH3=180, VH3=CH3+pT+pB;')
src = src.replace('const CH4=240, VH4=CH4+pT+pB;', 'const CH4=180, VH4=CH4+pT+pB;')

# SVG wrappers with explicit height
src = src.replace(
    "<svg viewBox={`0 0 ${VW} ${VH}`} style={{width:'100%',display:'block'}}>",
    "<svg viewBox={`0 0 ${VW} ${VH}`} style={{width:'100%',height:'260px',display:'block'}}>"
)
src = src.replace(
    "<svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:'100%',display:'block'}}>",
    "<svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:'100%',height:'195px',display:'block'}}>"
)
src = src.replace(
    "<svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:'100%',display:'block'}}>",
    "<svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:'100%',height:'195px',display:'block'}}>"
)
src = src.replace(
    "<svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:'100%',display:'block'}}>",
    "<svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:'100%',height:'195px',display:'block'}}>"
)

# Chart wrapper spacing
src = src.replace(
    '<div className="px-0 py-2 space-y-0">',
    '<div className="divide-y divide-slate-100">'
)

# Chart 1 wrapper
src = src.replace(
    '                          <div className="px-5">\n                            <div className="flex items-center gap-4 mb-1.5 flex-wrap">',
    '                          <div className="px-4 pt-3 pb-1">\n                            <div className="flex items-center gap-4 mb-1.5 flex-wrap">'
)
# Charts 2,3,4 wrapper
src = src.replace(
    '                          <div className="px-5">\n                            <div className="flex items-center gap-3 mb-2 flex-wrap">',
    '                          <div className="px-4 pt-3 pb-1">\n                            <div className="flex items-center gap-3 mb-1.5 flex-wrap">'
)

# Pull-by-pull table padding
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

# whitespace-nowrap for th elements
th_replacements = [
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
]
for old, new in th_replacements:
    src = src.replace(old, new)

# Drill-down border
src = src.replace(
    '<div className="border-t-2 border-indigo-200 pt-5">',
    '<div className="border-t-2 border-indigo-200 px-4 pt-5 pb-5">'
)

print("Applied cvor_ui_overhaul.py improvements")

# ───────────────────────────────────────────────────────────────────
# i. Apply improvements from cvor_proper_fix.py
# ───────────────────────────────────────────────────────────────────

# Remove preserveAspectRatio="none"
src = re.sub(r' preserveAspectRatio="none"', '', src)

# Chart 1 — padding-bottom wrapper
src = src.replace(
    "                            <div>\n                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:'100%',height:'300px',display:'block'}}>",
    "                            <div style={{position:'relative',width:'100%',paddingBottom:`${(VH/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block'}}>"
)
# Chart 2
src = src.replace(
    "                            <div>\n                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:'100%',height:'220px',display:'block'}}>",
    "                            <div style={{position:'relative',width:'100%',paddingBottom:`${(VH2/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block'}}>"
)
# Chart 3
src = src.replace(
    "                              <div className=\"w-full\">\n                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:'100%',height:'220px',display:'block'}}>",
    "                              <div style={{position:'relative',width:'100%',paddingBottom:`${(VH3/VW*100).toFixed(2)}%`}}>\n                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block'}}>"
)
# Chart 4
src = src.replace(
    "                            <div>\n                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:'100%',height:'220px',display:'block'}}>",
    "                            <div style={{position:'relative',width:'100%',paddingBottom:`${(VH4/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%',display:'block'}}>"
)

# Chart heights (stage 2: further reduce)
src = src.replace('const CH=220, VH=CH+pT+pB;', 'const CH=180, VH=CH+pT+pB;')
src = src.replace('const CH2=180, VH2=CH2+pT+pB;', 'const CH2=150, VH2=CH2+pT+pB;')
src = src.replace('const CH3=180, VH3=CH3+pT+pB;', 'const CH3=150, VH3=CH3+pT+pB;')
src = src.replace('const CH4=180, VH4=CH4+pT+pB;', 'const CH4=150, VH4=CH4+pT+pB;')

# Tighten pB
src = src.replace(
    'const VW = 1200, pL = 50, pR = 16, pT = 18, pB = 60;',
    'const VW = 1200, pL = 54, pR = 60, pT = 16, pB = 54;'
)

# Font sizes
src = src.replace('fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%', 'fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}%')
src = src.replace('fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}', 'fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}')

src = src.replace(
    'textAnchor="end" fontSize="9.5"\n                            fill={al===\'critical\'?\'#dc2626\':al===\'warning\'?\'#b45309\':\'#475569\'}',
    'textAnchor="end" fontSize="11.5"\n                            fill={al===\'critical\'?\'#dc2626\':al===\'warning\'?\'#b45309\':\'#475569\'}'
)

src = src.replace('fontSize="10.5" fontWeight="700" fill={th.c}>{th.lbl}</text>',
                  'fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>')

src = src.replace('fontSize="11" fill={z.labelColor} fontWeight="600" opacity="0.7">{z.label}</text>',
                  'fontSize="13" fill={z.labelColor} fontWeight="700" opacity="0.8">{z.label}</text>')

src = src.replace('fontSize="11" fontWeight="600" fill="#94a3b8">20%</text>',
                  'fontSize="12" fontWeight="700" fill="#94a3b8">20%</text>')
src = src.replace('fontSize="11" fontWeight="600" fill="#ef4444">35%</text>',
                  'fontSize="12" fontWeight="700" fill="#ef4444">35%</text>')

src = src.replace('fontSize="11.5" fontWeight="bold"', 'fontSize="13" fontWeight="bold"')
src = src.replace('fontSize="10.5" fontWeight="600" fill="#1d4ed8"', 'fontSize="12" fontWeight="700" fill="#1d4ed8"')
src = src.replace('fontSize="10.5" fontWeight="600" fill="#92400e"', 'fontSize="12" fontWeight="700" fill="#92400e"')

src = src.replace('fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}%</text>',
                  'fontSize="11.5" fill="#94a3b8" fontFamily="monospace">{v}%</text>')

# Table font size
src = src.replace(
    '<table className="w-full text-[11px] border-collapse" style={{minWidth:\'1180px\'}}>',
    '<table className="w-full text-[12px] border-collapse" style={{minWidth:\'1200px\'}}>'
)
src = src.replace(
    '<tr className="bg-slate-800 text-white sticky top-0 z-10">',
    '<tr className="bg-slate-800 text-white sticky top-0 z-10 text-[11.5px]">'
)

print("Applied cvor_proper_fix.py improvements")

# ───────────────────────────────────────────────────────────────────
# Write out
# ───────────────────────────────────────────────────────────────────
with open(tsx_path, 'w', encoding='utf-8') as f:
    f.write(src)
print(f"Written: {tsx_path} ({len(src)} chars)")
