#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    src = f.read()

changes = 0

def rep(old, new, label=''):
    global src, changes
    if old in src:
        src = src.replace(old, new)
        changes += 1
        print(f"  OK: {label or old[:55]}")
    else:
        print(f"  MISS: {label or old[:55]}")

# ═══ 1. TOOLTIP — fix all text/layout issues ══════════════════════
rep('const tw = 185, baseH = 56;', 'const tw = 230, baseH = 72;', 'tooltip size')

rep(
    '<rect x={tx+3} y={ty+3} width={tw} height={th} rx={8} fill="#64748b" opacity="0.10"/>',
    '<rect x={tx+5} y={ty+6} width={tw} height={th} rx={10} fill="#0f172a" opacity="0.18"/>\n                      <rect x={tx+2} y={ty+3} width={tw} height={th} rx={10} fill="#475569" opacity="0.10"/>',
    'tooltip shadow'
)
rep('<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#ffffff"/>',
    '<rect x={tx} y={ty} width={tw} height={th} rx={10} fill="#ffffff"/>', 'bg rx')
rep('<rect x={tx} y={ty} width={tw} height={th} rx={8} fill="none" stroke={alertColor} strokeWidth="1.5" opacity="0.9"/>',
    '<rect x={tx} y={ty} width={tw} height={th} rx={10} fill="none" stroke={alertColor} strokeWidth="1.5" opacity="0.9"/>', 'border rx')

# CRITICAL: title fill="white" -> dark (invisible on white bg!)
rep(
    '<text x={tx+10} y={ty+15} fontSize="11" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>',
    '<text x={tx+12} y={ty+22} fontSize="15" fontWeight="700" fill="#0f172a" fontFamily="monospace">{d.periodLabel}</text>',
    'TITLE COLOR FIX (white->dark)'
)
rep('<rect x={tx+tw-68} y={ty+5} width={60} height={14} rx={4} fill={alertColor} opacity="0.25"/>',
    '<rect x={tx+tw-84} y={ty+7} width={72} height={20} rx={5} fill={alertColor} opacity="0.20"/>', 'badge rect')
rep('<text x={tx+tw-38} y={ty+14.5} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill={alertColor}>{alertLabel}</text>',
    '<text x={tx+tw-48} y={ty+20} textAnchor="middle" fontSize="11" fontWeight="700" fill={alertColor}>{alertLabel}</text>', 'badge text')
rep('<text x={tx+10} y={ty+26} fontSize="7.5" fill="#6366f1" fontFamily="monospace">{win.label}</text>',
    '<text x={tx+12} y={ty+38} fontSize="12" fill="#6366f1" fontFamily="monospace">{win.label}</text>', 'window')
rep('<text x={tx+10} y={ty+35} fontSize="7" fill="#475569">24-month rolling window</text>',
    '<text x={tx+12} y={ty+52} fontSize="10.5" fill="#64748b">24-month rolling window</text>', 'window sub')
# CRITICAL: separator dark -> light
rep('stroke="#1e293b" strokeWidth="0.8"/>', 'stroke="#e2e8f0" strokeWidth="1"/>', 'SEPARATOR COLOR FIX')

rep('const th = baseH + rows.length * 14 + 10;', 'const th = baseH + rows.length * 18 + 12;', 'th calc')
rep(
    '{r.bold && <rect x={tx+6} y={ty+47+ri*14-10} width={tw-12} height={13} rx={3} fill={r.color} opacity="0.12"/>}',
    '{r.bold && <rect x={tx+6} y={ty+66+ri*18-14} width={tw-12} height={16} rx={3} fill={r.color} opacity="0.10"/>}',
    'row bg rect'
)
rep(
    '<text x={tx+10}    y={ty+47+ri*14} fontSize={r.bold?9:8.5} fill={r.bold?\'#0f172a\':\'#64748b\'} fontWeight={r.bold?\'bold\':\'normal\'} fontFamily="sans-serif">{r.label}</text>',
    '<text x={tx+12}    y={ty+66+ri*18} fontSize={r.bold?12:11} fill={r.bold?\'#0f172a\':\'#64748b\'} fontWeight={r.bold?\'700\':\'400\'} fontFamily="sans-serif">{r.label}</text>',
    'row label'
)
rep(
    '<text x={tx+tw-10} y={ty+47+ri*14} textAnchor="end" fontSize={r.bold?9:8.5} fontWeight={r.bold?\'bold\':\'normal\'} fill={r.color} fontFamily="monospace">{r.val}</text>',
    '<text x={tx+tw-12} y={ty+66+ri*18} textAnchor="end" fontSize={r.bold?12:11} fontWeight={r.bold?\'700\':\'400\'} fill={r.color} fontFamily="monospace">{r.val}</text>',
    'row value'
)
rep(
    'fontSize="7" fill="#6366f1">Click \u2192 view {windowOf(d.reportDate).label.split(\'\u2192\')[1].trim()} inspections \u2193</text>',
    'fontSize="10.5" fill="#6366f1">Click \u2192 view inspections \u2193</text>',
    'click hint'
)
rep('const ty = Math.max(pT, Math.min(cy - th / 2, pT + 260 - th));',
    'const ty = Math.max(pT + 2, Math.min(cy - th / 2, pT + 420 - th));', 'ty clamp')
rep('const tx = cx > VW * 0.60 ? cx - tw - 10 : cx + 10;',
    'const tx = cx > VW * 0.65 ? cx - tw - 14 : cx + 14;', 'tx flip')

# ═══ 2. CHART HEIGHTS ════════════════════════════════════════════════
rep('const CH=280, VH=CH+pT+pB;', 'const CH=200, VH=CH+pT+pB;', 'CH1')
rep('const CH2=220, VH2=CH2+pT+pB;', 'const CH2=170, VH2=CH2+pT+pB;', 'CH2')
rep('const CH3=220, VH3=CH3+pT+pB;', 'const CH3=170, VH3=CH3+pT+pB;', 'CH3')
rep('const CH4=220, VH4=CH4+pT+pB;', 'const CH4=170, VH4=CH4+pT+pB;', 'CH4')

# ═══ 3. SVG WRAPPERS — padding-bottom responsive ═════════════════════
rep(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:\'100%\',height:`${VH}px`,display:\'block\'}}>',
    '<div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>',
    'SVG wrap ch1'
)
rep(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:\'100%\',height:`${VH2}px`,display:\'block\'}}>',
    '<div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH2/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>',
    'SVG wrap ch2'
)
rep(
    '<div className="w-full">\n                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:\'100%\',height:`${VH3}px`,display:\'block\'}}>',
    '<div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH3/VW*100).toFixed(2)}%`}}>\n                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>',
    'SVG wrap ch3'
)
rep(
    '<div className="w-full">\n                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:\'100%\',height:`${VH4}px`,display:\'block\'}}>',
    '<div style={{position:\'relative\',width:\'100%\',paddingBottom:`${(VH4/VW*100).toFixed(2)}%`}}>\n                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{position:\'absolute\',top:0,left:0,width:\'100%\',height:\'100%\',display:\'block\'}}>',
    'SVG wrap ch4'
)

# ═══ 4. FONT SIZES ════════════════════════════════════════════════════
rep('textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}{suffix}</text>',
    'textAnchor="end" fontSize="13" fill="#94a3b8" fontFamily="monospace">{v}{suffix}</text>', 'ygrid font')
rep(
    'textAnchor="end" fontSize="11.5"\n                            fill={al===\'critical\'?\'#dc2626\':al===\'warning\'?\'#b45309\':\'#475569\'}',
    'textAnchor="end" fontSize="13"\n                            fill={al===\'critical\'?\'#dc2626\':al===\'warning\'?\'#b45309\':\'#475569\'}',
    'xaxis font'
)
rep('fontSize="9" fill={z.labelColor} fontWeight="600" opacity="0.7">{z.label}</text>',
    'fontSize="12" fill={z.labelColor} fontWeight="700" opacity="0.85">{z.label}</text>', 'zone labels')
rep('fontSize="10.5" fontWeight="700" fill={th.c}>{th.lbl}</text>',
    'fontSize="13" fontWeight="700" fill={th.c}>{th.lbl}</text>', 'threshold labels')
rep('fontSize="11" fontWeight="600" fill="#94a3b8">20%</text>',
    'fontSize="13" fontWeight="700" fill="#94a3b8">20%</text>', 'oos 20%')
rep('fontSize="11" fontWeight="600" fill="#ef4444">35%</text>',
    'fontSize="13" fontWeight="700" fill="#ef4444">35%</text>', 'oos 35%')
rep('fontSize="9.5" fontWeight="bold"', 'fontSize="12" fontWeight="bold"', 'dot value label')
rep('fontSize="10.5" fontWeight="700" fill="#1d4ed8"', 'fontSize="13" fontWeight="700" fill="#1d4ed8"', 'col bar label')
rep('fontSize="10.5" fontWeight="700" fill="#92400e"', 'fontSize="13" fontWeight="700" fill="#92400e"', 'con bar label')
rep('fontSize="11.5" fill="#94a3b8" fontFamily="monospace">{v}%</text>',
    'fontSize="13" fill="#94a3b8" fontFamily="monospace">{v}%</text>', 'ch2/3 y labels')
rep('textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>',
    'textAnchor="end" fontSize="13" fill="#94a3b8" fontFamily="monospace">{v}</text>', 'ch4 y labels')
rep('fontSize="11.5" fontWeight="bold"', 'fontSize="13" fontWeight="bold"', 'dot value 2')

# ═══ 5. CARD — remove overflow-hidden so tooltip renders fully ════════
rep(
    '<div className="bg-white border border-slate-200 rounded-xl overflow-hidden">',
    '<div className="bg-white border border-slate-200 rounded-xl">',
    'remove overflow-hidden from card'
)

# ═══ 6. TABLE ═════════════════════════════════════════════════════════
rep(
    '<table className="w-full text-[11px] border-collapse" style={{minWidth:\'1050px\'}}>',
    '<table className="w-full text-[12px] border-collapse" style={{minWidth:\'1180px\'}}>',
    'table size'
)

print(f"\nTotal changes applied: {changes}")

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(src)
print("Saved.")
