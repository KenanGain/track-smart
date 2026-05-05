#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')
"""
CVOR v4:
  1. Shift pull dates +811 days so windows overlap with inspection data (2025-2026)
  2. Add cvorSelectedPull state (click dot → drill into inspections)
  3. Show 24-month window range on chart
  4. Inspect panel below Pull-by-Pull Data table
"""
from datetime import datetime, timedelta

SHIFT = 811  # days: Jan 12/24 -> Mar 21/26 (today)

orig = [
    ('2022-04-04','Apr 4/22'),('2022-05-06','May 6/22'),('2022-08-02','Aug 2/22'),
    ('2022-09-01','Sep 1/22'),('2022-10-18','Oct 18/22'),('2022-11-23','Nov 23/22'),
    ('2023-02-13','Feb 13/23'),('2023-03-14','Mar 14/23'),('2023-04-24','Apr 24/23'),
    ('2023-05-31','May 31/23'),('2023-06-01','Jun 1/23'),('2023-08-03','Aug 3/23'),
    ('2023-10-14','Oct 14/23'),('2023-11-14','Nov 14/23'),('2024-01-12','Jan 12/24'),
]

def shift(d): return (datetime.strptime(d,'%Y-%m-%d') + timedelta(days=SHIFT)).strftime('%Y-%m-%d')
def label(d):
    dt = datetime.strptime(d,'%Y-%m-%d')
    return f"{dt.strftime('%b')} {dt.day}/{dt.strftime('%y')}"

new_entries = []
for (od, _) in orig:
    nd = shift(od)
    new_entries.append((nd, label(nd)))

print("New pull dates:")
for nd, nl in new_entries:
    w_start = (datetime.strptime(nd,'%Y-%m-%d') - timedelta(days=730)).strftime('%Y-%m-%d')
    print(f"  {nl} → window {w_start} to {nd}")

# ── Step 1: Update inspectionsData.ts pull dates ──────────────────────────────
with open('src/pages/inspections/inspectionsData.ts','r',encoding='utf-8') as f:
    data_content = f.read()

for i,((od,_),(nd,nl)) in enumerate(zip(orig, new_entries)):
    data_content = data_content.replace(
        f"reportDate:'{od}'",
        f"reportDate:'{nd}'"
    )
    # Fix periodLabel
    old_label = orig[i][1]
    data_content = data_content.replace(
        f"periodLabel:'{old_label}'",
        f"periodLabel:'{nl}'"
    )

with open('src/pages/inspections/inspectionsData.ts','w',encoding='utf-8') as f:
    f.write(data_content)
print("\nStep 1: Updated pull dates in inspectionsData.ts")

# ── Step 2: Add cvorSelectedPull state ────────────────────────────────────────
with open('src/pages/inspections/InspectionsPage.tsx','r',encoding='utf-8') as f:
    tsx = f.read()

OLD_STATE = "  const [cvorHoveredPull, setCvorHoveredPull] = useState<{ chart: string; idx: number } | null>(null);"
NEW_STATE = """  const [cvorHoveredPull, setCvorHoveredPull] = useState<{ chart: string; idx: number } | null>(null);
  const [cvorSelectedPull, setCvorSelectedPull] = useState<string | null>(null); // reportDate of clicked pull"""

if OLD_STATE not in tsx:
    print("ERROR: cvorHoveredPull state not found")
    import sys; sys.exit(1)

tsx = tsx.replace(OLD_STATE, NEW_STATE)
with open('src/pages/inspections/InspectionsPage.tsx','w',encoding='utf-8') as f:
    f.write(tsx)
print("Step 2: Added cvorSelectedPull state")

# ── Step 3: Replace chart section ─────────────────────────────────────────────
CHART_JSX = r"""              {/* ── PERFORMANCE HISTORY CHARTS ── */}
              {(() => {
                // ── Cadence filter ────────────────────────────────────────────
                const filterByCadence = (all: typeof cvorPeriodicReports) => {
                  if (cvorPeriod === 'Monthly' || cvorPeriod === 'All') return all;
                  const minGapDays = cvorPeriod === 'Quarterly' ? 80 : 170;
                  const out: typeof all = [];
                  let lastMs = 0;
                  for (const d of all) {
                    const ms = new Date(d.reportDate).getTime();
                    if (!lastMs || (ms - lastMs) / 86400000 >= minGapDays) { out.push(d); lastMs = ms; }
                  }
                  return out;
                };
                const histData = filterByCadence(cvorPeriodicReports);
                const n = histData.length;
                if (n < 2) return null;

                // date range meta
                const firstPull = histData[0];
                const lastPull  = histData[n - 1];
                const rangeMonths = Math.round(
                  (new Date(lastPull.reportDate).getTime() - new Date(firstPull.reportDate).getTime()) / (1000*60*60*24*30.44)
                );

                // 24-month window for a given pull date
                const windowOf = (reportDate: string) => {
                  const end = new Date(reportDate);
                  const start = new Date(end);
                  start.setMonth(start.getMonth() - 24);
                  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
                  return { start, end, label: `${fmt(start)} → ${fmt(end)}` };
                };

                // ── SVG helpers ───────────────────────────────────────────────
                const VW = 1200, pL = 54, pR = 30, pT = 22, pB = 52;
                const cW = VW - pL - pR;

                const xAt = (i: number, total = n) =>
                  pL + (total > 1 ? (i / (total - 1)) * cW : cW / 2);

                const yAt = (v: number, max: number, min: number, chartH: number) =>
                  pT + chartH - ((v - min) / (max - min)) * chartH;

                // gap-aware line path
                const gapDays = cvorPeriod === 'Monthly' ? 60 : cvorPeriod === 'Quarterly' ? 100 : 250;
                const mkLine = (
                  items: typeof histData,
                  getVal: (d: typeof histData[0]) => number,
                  max: number, min: number, chartH: number
                ) => items.map((d, i) => {
                  const x = xAt(i).toFixed(1);
                  const y = yAt(getVal(d), max, min, chartH).toFixed(1);
                  if (i === 0) return `M${x},${y}`;
                  const gap = (new Date(d.reportDate).getTime() - new Date(items[i-1].reportDate).getTime()) / 86400000;
                  return `${gap > gapDays ? 'M' : 'L'}${x},${y}`;
                }).join(' ');

                const mkArea = (items: typeof histData, getVal: (d: typeof histData[0]) => number, max: number, min: number, chartH: number) => {
                  const line = mkLine(items, getVal, max, min, chartH);
                  return `${line} L${xAt(n-1).toFixed(1)},${(pT+chartH).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+chartH).toFixed(1)}Z`;
                };

                const dotColor = (r: number) =>
                  r >= cvorThresholds.showCause   ? '#ef4444' :
                  r >= cvorThresholds.intervention ? '#f97316' :
                  r >= cvorThresholds.warning      ? '#ca8a04' : '#16a34a';

                // currently selected pull object
                const selPull = cvorSelectedPull
                  ? histData.find(d => d.reportDate === cvorSelectedPull) ?? null
                  : null;

                // ── Shared components ────────────────────────────────────────
                // Rich SVG tooltip
                const Tip = ({
                  cx, cy, d, rows
                }: {
                  cx: number; cy: number;
                  d: typeof histData[0];
                  rows: Array<{ label: string; val: string; color: string }>;
                }) => {
                  const tw = 172, pad = 8;
                  const win = windowOf(d.reportDate);
                  const th = 50 + rows.length * 14;
                  const tx = cx > VW * 0.62 ? cx - tw - pad : cx + pad;
                  const ty = Math.max(pT + 2, cy - th / 2);
                  return (
                    <g style={{ pointerEvents:'none' }}>
                      <rect x={tx+2} y={ty+2} width={tw} height={th} rx={6} fill="#000" opacity="0.18"/>
                      <rect x={tx}   y={ty}   width={tw} height={th} rx={6} fill="#0f172a"/>
                      <rect x={tx}   y={ty}   width={tw} height={th} rx={6} fill="none" stroke="#334155" strokeWidth="0.7"/>
                      {/* Pull date */}
                      <text x={tx+tw/2} y={ty+14} textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                      {/* 24-month window */}
                      <text x={tx+tw/2} y={ty+25} textAnchor="middle" fontSize="7.5" fill="#6366f1" fontFamily="monospace">{win.label}</text>
                      <text x={tx+tw/2} y={ty+34} textAnchor="middle" fontSize="7" fill="#475569">24-month rolling window</text>
                      <line x1={tx+8} x2={tx+tw-8} y1={ty+39} y2={ty+39} stroke="#1e293b" strokeWidth="0.7"/>
                      {rows.map((r, ri) => (
                        <g key={ri}>
                          <text x={tx+10}    y={ty+50+ri*14} fontSize="8.5" fill="#94a3b8" fontFamily="sans-serif">{r.label}</text>
                          <text x={tx+tw-10} y={ty+50+ri*14} textAnchor="end" fontSize="8.5" fontWeight="600" fill={r.color} fontFamily="monospace">{r.val}</text>
                        </g>
                      ))}
                      {/* Click hint */}
                      <text x={tx+tw/2} y={ty+th-6} textAnchor="middle" fontSize="7" fill="#6366f1" fontFamily="sans-serif">Click to view inspections ↓</text>
                    </g>
                  );
                };

                // X-axis labels
                const XAxis = ({ items, chartH }: { items: typeof histData; chartH: number }) => (
                  <>
                    {items.map((d, i) => {
                      const x = xAt(i);
                      return (
                        <text key={i} x={x} y={pT + chartH + 14}
                          textAnchor="end" fontSize="9.5" fill="#475569" fontFamily="monospace"
                          transform={`rotate(-38,${x},${pT + chartH + 14})`}>
                          {d.periodLabel}
                        </text>
                      );
                    })}
                  </>
                );

                // Y gridlines
                const YGrid = ({ ticks, max, min, chartH }: { ticks: number[]; max: number; min: number; chartH: number }) => (
                  <>
                    {ticks.map(v => (
                      <g key={v}>
                        <line x1={pL} x2={pL+cW} y1={yAt(v,max,min,chartH)} y2={yAt(v,max,min,chartH)} stroke="#e2e8f0" strokeWidth="0.75"/>
                        <text x={pL-7} y={yAt(v,max,min,chartH)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                      </g>
                    ))}
                  </>
                );

                return (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    {/* ── Header ── */}
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/60">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-sm font-bold text-slate-800">CVOR Performance History</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls shown</span>
                        <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded">
                          {firstPull.periodLabel} → {lastPull.periodLabel} · {rangeMonths}mo span
                        </span>
                        <span className="text-[10px] text-slate-400 italic">Each pull = 24-month rolling window</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cadence</span>
                        <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-px">
                          {(['Monthly','Quarterly','Semi-Annual','All'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors whitespace-nowrap ${cvorPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Selected pull banner ── */}
                    {selPull && (() => {
                      const win = windowOf(selPull.reportDate);
                      return (
                        <div className="px-5 py-2.5 bg-indigo-600 text-white flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                            <span className="text-sm font-bold">Pull: {selPull.periodLabel}</span>
                            <span className="text-indigo-200 text-xs font-mono">24-month window: {win.label}</span>
                            <span className="text-indigo-300 text-[10px]">Rating: {selPull.rating.toFixed(2)}%</span>
                          </div>
                          <button onClick={() => setCvorSelectedPull(null)}
                            className="text-indigo-200 hover:text-white text-[11px] font-bold px-2 py-0.5 rounded border border-indigo-400 hover:border-white transition-colors">
                            × Clear
                          </button>
                        </div>
                      );
                    })()}

                    <div className="p-5 space-y-8">

                      {/* ══ CHART 1: Overall CVOR Rating ══ */}
                      {(() => {
                        const CH = 240, VH = CH + pT + pB;
                        const rMin = 0, rMax = 40;
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-1.5 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Overall CVOR Rating</span>
                              {[
                                { lbl:'Safe <35%',     bg:'#bbf7d0', border:'#166534' },
                                { lbl:'Warning 35–50%',bg:'#fef08a', border:'#854d0e' },
                                { lbl:'Audit 50–75%',  bg:'#fde68a', border:'#92400e' },
                                { lbl:'Show Cause 75%+',bg:'#fecaca',border:'#991b1b' },
                              ].map(z => (
                                <div key={z.lbl} className="flex items-center gap-1.5">
                                  <div className="w-3 h-2.5 rounded-sm border" style={{ background:z.bg, borderColor:z.border+'66' }}/>
                                  <span className="text-[9.5px] font-mono text-slate-600">{z.lbl}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9px] text-indigo-500 font-medium">Click a dot → view inspections in that 24-month window ↓</span>
                            </div>
                            {/* Window range sub-label */}
                            {selPull && (
                              <div className="mb-2 text-[10px] text-indigo-600 font-mono bg-indigo-50 inline-block px-2 py-1 rounded">
                                Selected window: {windowOf(selPull.reportDate).label}
                              </div>
                            )}
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', height:`${VH}px`, display:'block' }}>
                                {/* Zone bands */}
                                {[
                                  { from:0,                          to:cvorThresholds.warning,      fill:'#bbf7d0' },
                                  { from:cvorThresholds.warning,      to:cvorThresholds.intervention, fill:'#fef08a' },
                                  { from:cvorThresholds.intervention, to:cvorThresholds.showCause,    fill:'#fde68a' },
                                  { from:cvorThresholds.showCause,    to:rMax,                        fill:'#fecaca' },
                                ].map(z => (
                                  <rect key={z.from}
                                    x={pL} y={yAt(Math.min(z.to,rMax), rMax, rMin, CH)}
                                    width={cW}
                                    height={yAt(z.from, rMax, rMin, CH) - yAt(Math.min(z.to,rMax), rMax, rMin, CH)}
                                    fill={z.fill} opacity="0.40"/>
                                ))}
                                <YGrid ticks={[0,5,10,15,20,25,30,35,40]} max={rMax} min={rMin} chartH={CH}/>
                                {/* Threshold dashes */}
                                {[
                                  { t:cvorThresholds.warning,      c:'#65a30d', l:'35% Warning' },
                                  { t:cvorThresholds.intervention,  c:'#d97706', l:'50% Audit' },
                                  { t:cvorThresholds.showCause,     c:'#dc2626', l:'75% Show Cause' },
                                ].map(th => (
                                  <g key={th.t}>
                                    <line x1={pL} x2={pL+cW} y1={yAt(th.t,rMax,rMin,CH)} y2={yAt(th.t,rMax,rMin,CH)} stroke={th.c} strokeWidth="1" strokeDasharray="5,3" opacity="0.8"/>
                                    <text x={pL+cW+5} y={yAt(th.t,rMax,rMin,CH)+3.5} fontSize="9" fontWeight="600" fill={th.c}>{th.l}</text>
                                  </g>
                                ))}
                                {/* Area */}
                                <path d={mkArea(histData, d=>d.rating, rMax, rMin, CH)} fill="#d97706" opacity="0.06"/>
                                {/* Line */}
                                <path d={mkLine(histData, d=>d.rating, rMax, rMin, CH)} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                                <XAxis items={histData} chartH={CH}/>
                                {/* Dots */}
                                {histData.map((d, i) => {
                                  const cx = xAt(i), cy = yAt(d.rating, rMax, rMin, CH), dc = dotColor(d.rating);
                                  const isLast = i === n - 1;
                                  const isSel  = d.reportDate === cvorSelectedPull;
                                  const isHov  = cvorHoveredPull?.chart === 'r' && cvorHoveredPull?.idx === i;
                                  return (
                                    <g key={i}
                                      style={{ cursor:'pointer' }}
                                      onClick={() => setCvorSelectedPull(isSel ? null : d.reportDate)}
                                      onMouseEnter={() => setCvorHoveredPull({ chart:'r', idx:i })}
                                      onMouseLeave={() => setCvorHoveredPull(null)}>
                                      {/* Selected ring */}
                                      {isSel && <circle cx={cx} cy={cy} r={13} fill="none" stroke="#6366f1" strokeWidth="2.5"/>}
                                      {(isLast || isHov || isSel) && <circle cx={cx} cy={cy} r={10} fill={isSel ? '#6366f1' : dc} opacity={isSel ? 0.25 : 0.15}/>}
                                      <circle cx={cx} cy={cy} r={isLast || isHov || isSel ? 6 : 4} fill={isSel ? '#6366f1' : dc} stroke="white" strokeWidth="2" style={{ pointerEvents:'none' }}/>
                                      {(isLast || isHov || isSel) && (
                                        <text x={cx} y={cy-13} textAnchor="middle" fontSize="10" fontWeight="bold"
                                          fill={isSel ? '#6366f1' : dc} fontFamily="monospace" style={{ pointerEvents:'none' }}>
                                          {d.rating.toFixed(2)}%
                                        </text>
                                      )}
                                      {/* Vertical guide line when selected */}
                                      {isSel && <line x1={cx} x2={cx} y1={cy+14} y2={pT+CH} stroke="#6366f1" strokeWidth="1" strokeDasharray="3,2" opacity="0.5"/>}
                                      {isHov && !isSel && (
                                        <Tip cx={cx} cy={cy} d={d} rows={[
                                          { label:'Overall Rating',   val:`${d.rating.toFixed(2)}%`,      color: dc },
                                          { label:'Collisions (40%)', val:`${d.colContrib.toFixed(2)}%`,  color:'#60a5fa' },
                                          { label:'Convictions (40%)',val:`${d.conContrib.toFixed(2)}%`,  color:'#fbbf24' },
                                          { label:'Inspections (20%)',val:`${d.insContrib.toFixed(2)}%`,  color:'#f87171' },
                                          { label:'OOS Overall',      val: d.oosOverall>0 ? `${d.oosOverall.toFixed(1)}%` : '—', color: d.oosOverall>20?'#ef4444':'#94a3b8' },
                                          { label:'# Col / Conv',     val:`${d.collisionEvents} / ${d.convictionEvents}`, color:'#94a3b8' },
                                        ]}/>
                                      )}
                                    </g>
                                  );
                                })}
                                {/* X-axis 24-month window bands when a pull is selected */}
                                {selPull && (() => {
                                  const selIdx = histData.findIndex(d => d.reportDate === cvorSelectedPull);
                                  if (selIdx < 0) return null;
                                  const cx = xAt(selIdx);
                                  const selDate = new Date(selPull.reportDate);
                                  const winStart = new Date(selDate); winStart.setMonth(winStart.getMonth()-24);
                                  // Find approximate x positions for window start/end within our chart span
                                  // We only have the actual pull dates to work with
                                  return (
                                    <g style={{ pointerEvents:'none' }}>
                                      <rect x={cx-1} y={pT} width={2} height={CH} fill="#6366f1" opacity="0.8"/>
                                    </g>
                                  );
                                })()}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ CHART 2 + 3 ══ */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* Chart 2: Category Contributions */}
                        {(() => {
                          const CH2 = 190, VH2 = CH2+pT+pB, VW2 = 580, cW2 = VW2-pL-pR;
                          const x2 = (i:number) => pL + (n>1 ? (i/(n-1))*cW2 : cW2/2);
                          const maxCat = Math.ceil(Math.max(...histData.map(d=>Math.max(d.colContrib,d.conContrib,d.insContrib)))+0.5);
                          const y2 = (v:number) => yAt(v,maxCat,0,CH2);
                          const mkL2 = (vals:number[]) => vals.map((v,i)=>{
                            const gap = i>0 ? (new Date(histData[i].reportDate).getTime()-new Date(histData[i-1].reportDate).getTime())/86400000 : 0;
                            return `${i===0?'M':(gap>gapDays?'M':'L')}${x2(i).toFixed(1)},${y2(v).toFixed(1)}`;
                          }).join(' ');
                          const cats=[
                            { key:'col', label:'Collisions (40%)', vals:histData.map(d=>d.colContrib), color:'#3b82f6' },
                            { key:'con', label:'Convictions (40%)', vals:histData.map(d=>d.conContrib), color:'#d97706' },
                            { key:'ins', label:'Inspections (20%)', vals:histData.map(d=>d.insContrib), color:'#dc2626' },
                          ];
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Category Contributions</span>
                                {cats.map(c=>(
                                  <div key={c.key} className="flex items-center gap-1.5">
                                    <div className="w-5 border-t-2 rounded" style={{borderColor:c.color}}/>
                                    <span className="text-[9.5px] text-slate-500">{c.label}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="w-full">
                                <svg viewBox={`0 0 ${VW2} ${VH2}`} style={{width:'100%',height:`${VH2}px`,display:'block'}}>
                                  {[0,2,4,6,8].filter(v=>v<=maxCat).map(v=>(
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW2} y1={y2(v)} y2={y2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                      <text x={pL-7} y={y2(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  {cats.map(c=><path key={c.key} d={mkL2(c.vals)} fill="none" stroke={c.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>)}
                                  {histData.map((d,i)=>(
                                    <text key={i} x={x2(i)} y={pT+CH2+14} textAnchor="end" fontSize="8.5" fill="#475569" fontFamily="monospace"
                                      transform={`rotate(-38,${x2(i)},${pT+CH2+14})`}>{d.periodLabel}</text>
                                  ))}
                                  {cats.map(c=>histData.map((d,i)=>{
                                    const val=c.key==='col'?d.colContrib:c.key==='con'?d.conContrib:d.insContrib;
                                    const cx2=x2(i), cy2=y2(val);
                                    const isSel2 = d.reportDate===cvorSelectedPull;
                                    const isHov2 = cvorHoveredPull?.chart===`c-${c.key}`&&cvorHoveredPull?.idx===i;
                                    return (
                                      <g key={`${c.key}-${i}`}
                                        style={{cursor:'pointer'}}
                                        onClick={()=>setCvorSelectedPull(isSel2?null:d.reportDate)}
                                        onMouseEnter={()=>setCvorHoveredPull({chart:`c-${c.key}`,idx:i})}
                                        onMouseLeave={()=>setCvorHoveredPull(null)}>
                                        {isSel2&&<circle cx={cx2} cy={cy2} r={9} fill="none" stroke="#6366f1" strokeWidth="2"/>}
                                        <circle cx={cx2} cy={cy2} r={isHov2||isSel2?5.5:3.5} fill={isSel2?'#6366f1':c.color} stroke="white" strokeWidth="1.5" style={{pointerEvents:'none'}}/>
                                      </g>
                                    );
                                  }))}
                                </svg>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Chart 3: OOS Rates */}
                        {(() => {
                          const oosD=histData.filter(d=>d.oosOverall>0), no=oosD.length;
                          const CH3=190,VH3=CH3+pT+pB,VW3=580,cW3=VW3-pL-pR;
                          const x3=(i:number)=>pL+(no>1?(i/(no-1))*cW3:cW3/2);
                          const maxOos=Math.ceil(Math.max(...oosD.map(d=>Math.max(d.oosOverall,d.oosVehicle)))/10)*10+5;
                          const y3=(v:number)=>yAt(v,maxOos,0,CH3);
                          const mkL3=(vals:number[])=>vals.map((v,i)=>{
                            const gap=i>0?(new Date(oosD[i].reportDate).getTime()-new Date(oosD[i-1].reportDate).getTime())/86400000:0;
                            return `${i===0?'M':(gap>gapDays?'M':'L')}${x3(i).toFixed(1)},${y3(v).toFixed(1)}`;
                          }).join(' ');
                          const oosLines=[
                            {key:'ov',label:'Overall', vals:oosD.map(d=>d.oosOverall),color:'#6366f1'},
                            {key:'vh',label:'Vehicle', vals:oosD.map(d=>d.oosVehicle),color:'#ef4444'},
                            {key:'dr',label:'Driver',  vals:oosD.map(d=>d.oosDriver), color:'#16a34a'},
                          ];
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">OOS Rates</span>
                                {oosLines.map(l=>(
                                  <div key={l.key} className="flex items-center gap-1.5">
                                    <div className="w-5 border-t-2 rounded" style={{borderColor:l.color}}/>
                                    <span className="text-[9.5px] text-slate-500">{l.label}</span>
                                  </div>
                                ))}
                                <div className="flex items-center gap-1">
                                  <div className="w-5 border-t border-dashed border-slate-400"/>
                                  <span className="text-[9px] text-slate-400">20% target</span>
                                </div>
                              </div>
                              {no<2 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No OOS data</div>
                              ) : (
                                <div className="w-full">
                                  <svg viewBox={`0 0 ${VW3} ${VH3}`} style={{width:'100%',height:`${VH3}px`,display:'block'}}>
                                    {[0,10,20,30,40,50].filter(v=>v<=maxOos).map(v=>(
                                      <g key={v}>
                                        <line x1={pL} x2={pL+cW3} y1={y3(v)} y2={y3(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                        <text x={pL-7} y={y3(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                      </g>
                                    ))}
                                    <line x1={pL} x2={pL+cW3} y1={y3(20)} y2={y3(20)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,3" opacity="0.7"/>
                                    <text x={pL+cW3+4} y={y3(20)+3.5} fontSize="9" fill="#94a3b8">20%</text>
                                    {oosLines.map(l=><path key={l.key} d={mkL3(l.vals)} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>)}
                                    {oosD.map((d,i)=>(
                                      <text key={i} x={x3(i)} y={pT+CH3+14} textAnchor="end" fontSize="8.5" fill="#475569" fontFamily="monospace"
                                        transform={`rotate(-38,${x3(i)},${pT+CH3+14})`}>{d.periodLabel}</text>
                                    ))}
                                    {oosLines.map(l=>oosD.map((d,i)=>{
                                      const val=l.key==='ov'?d.oosOverall:l.key==='vh'?d.oosVehicle:d.oosDriver;
                                      const cx3=x3(i),cy3=y3(val);
                                      const isSel3=d.reportDate===cvorSelectedPull;
                                      const isHov3=cvorHoveredPull?.chart===`o-${l.key}`&&cvorHoveredPull?.idx===i;
                                      return (
                                        <g key={`${l.key}-${i}`} style={{cursor:'pointer'}}
                                          onClick={()=>setCvorSelectedPull(isSel3?null:d.reportDate)}
                                          onMouseEnter={()=>setCvorHoveredPull({chart:`o-${l.key}`,idx:i})}
                                          onMouseLeave={()=>setCvorHoveredPull(null)}>
                                          {isSel3&&<circle cx={cx3} cy={cy3} r={9} fill="none" stroke="#6366f1" strokeWidth="2"/>}
                                          <circle cx={cx3} cy={cy3} r={isHov3||isSel3?5.5:3.5} fill={isSel3?'#6366f1':l.color} stroke="white" strokeWidth="1.5" style={{pointerEvents:'none'}}/>
                                        </g>
                                      );
                                    }))}
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* ══ CHART 4: Events & Points ══ */}
                      {(() => {
                        const CH4=210,VH4=CH4+pT+pB;
                        const maxE=Math.max(...histData.map(d=>Math.max(d.collisionEvents,d.convictionEvents)))+3;
                        const maxP=Math.max(...histData.map(d=>Math.max(d.totalCollisionPoints,d.convictionPoints)));
                        const yE=(v:number)=>yAt(v,maxE,0,CH4);
                        const yP=(v:number)=>yAt(v,maxP*1.1,0,CH4);
                        const bw=Math.max(8,Math.min(22,cW/n*0.22));
                        const mkPts=(vals:number[],yFn:(v:number)=>number)=>
                          vals.map((v,i)=>{
                            const gap=i>0?(new Date(histData[i].reportDate).getTime()-new Date(histData[i-1].reportDate).getTime())/86400000:0;
                            return `${i===0?'M':(gap>gapDays?'M':'L')}${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`;
                          }).join(' ');
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Event Counts &amp; Points</span>
                              {[
                                {lbl:'Collisions',  color:'#3b82f6',rect:true},
                                {lbl:'Convictions', color:'#d97706',rect:true},
                                {lbl:'Col Points',  color:'#6366f1',rect:false},
                                {lbl:'Conv Points', color:'#ec4899',rect:false},
                              ].map(l=>(
                                <div key={l.lbl} className="flex items-center gap-1.5">
                                  {l.rect
                                    ?<div className="w-3 h-3 rounded-sm border" style={{background:l.color+'22',borderColor:l.color}}/>
                                    :<div className="w-6 border-t border-dashed" style={{borderColor:l.color}}/>
                                  }
                                  <span className="text-[9.5px] text-slate-500">{l.lbl}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9px] text-slate-400 italic">bars = counts · dashed = points (diff scale)</span>
                            </div>
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:'100%',height:`${VH4}px`,display:'block'}}>
                                {[0,5,10,15,20,25,30].filter(v=>v<=maxE).map(v=>(
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                    <text x={pL-7} y={yE(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}</text>
                                  </g>
                                ))}
                                {histData.map((d,i)=>{
                                  const cx4=xAt(i),isSel4=d.reportDate===cvorSelectedPull;
                                  const isHov4=cvorHoveredPull?.chart==='ev'&&cvorHoveredPull?.idx===i;
                                  return (
                                    <g key={i} style={{cursor:'pointer'}}
                                      onClick={()=>setCvorSelectedPull(isSel4?null:d.reportDate)}
                                      onMouseEnter={()=>setCvorHoveredPull({chart:'ev',idx:i})}
                                      onMouseLeave={()=>setCvorHoveredPull(null)}>
                                      {isSel4&&<rect x={cx4-bw-3} y={pT} width={bw*2+6} height={CH4} fill="#6366f1" opacity="0.06" rx="2"/>}
                                      <rect x={cx4-bw-1} y={yE(d.collisionEvents)} width={bw} height={pT+CH4-yE(d.collisionEvents)}
                                        fill={isSel4?'#3b82f6':isHov4?'#3b82f6':'#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2"/>
                                      <rect x={cx4+1} y={yE(d.convictionEvents)} width={bw} height={pT+CH4-yE(d.convictionEvents)}
                                        fill={isSel4?'#f59e0b':isHov4?'#f59e0b':'#f59e0b22'} stroke="#f59e0b" strokeWidth="1" rx="2"/>
                                      <text x={cx4-bw/2} y={yE(d.collisionEvents)-4} textAnchor="middle" fontSize="9" fill="#1d4ed8" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.collisionEvents}</text>
                                      <text x={cx4+bw/2+1} y={yE(d.convictionEvents)-4} textAnchor="middle" fontSize="9" fill="#92400e" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.convictionEvents}</text>
                                    </g>
                                  );
                                })}
                                <path d={mkPts(histData.map(d=>d.totalCollisionPoints),yP)} fill="none" stroke="#6366f1" strokeWidth="1.75" strokeDasharray="4,2.5" opacity="0.75"/>
                                <path d={mkPts(histData.map(d=>d.convictionPoints),yP)} fill="none" stroke="#ec4899" strokeWidth="1.75" strokeDasharray="4,2.5" opacity="0.75"/>
                                <XAxis items={histData} chartH={CH4}/>
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ PULL-BY-PULL DATA TABLE ══ */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pull-by-Pull Data</span>
                          <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls · newest first · click row to drill into inspections</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-[11px] border-collapse" style={{minWidth:'1050px'}}>
                            <thead>
                              <tr className="bg-slate-800 text-white">
                                <th className="text-left px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Pull Date</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-indigo-300 whitespace-nowrap">24-Month Window</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Rating %</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-blue-300 whitespace-nowrap">Col%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-amber-300 whitespace-nowrap">Con%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300 whitespace-nowrap">Ins%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300 whitespace-nowrap">#Col</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300 whitespace-nowrap">#Conv</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-indigo-300 whitespace-nowrap">Col Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-pink-300 whitespace-nowrap">Conv Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-violet-300 whitespace-nowrap">OOS Ov%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300 whitespace-nowrap">OOS Veh%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-emerald-300 whitespace-nowrap">OOS Drv%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300 whitespace-nowrap">Trucks</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300 whitespace-nowrap">Total Miles</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...histData].reverse().map((d, i) => {
                                const win = windowOf(d.reportDate);
                                const rZone =
                                  d.rating >= cvorThresholds.showCause   ? 'bg-red-100 text-red-700 font-bold' :
                                  d.rating >= cvorThresholds.intervention ? 'bg-amber-100 text-amber-700 font-bold' :
                                  d.rating >= cvorThresholds.warning      ? 'bg-yellow-100 text-yellow-700 font-semibold' :
                                                                            'bg-emerald-100 text-emerald-700';
                                const isSel  = d.reportDate === cvorSelectedPull;
                                const isLatest = i === 0;
                                // inspections within this pull's 24-month window
                                const inWin = inspectionsData.filter(r => {
                                  const rd = new Date(r.date);
                                  return rd >= win.start && rd <= win.end;
                                });
                                return (
                                  <tr key={i}
                                    className={`border-b border-slate-100 cursor-pointer transition-colors
                                      ${isSel ? 'bg-indigo-50 border-l-2 border-l-indigo-500' :
                                        isLatest ? 'bg-blue-50' :
                                        i%2===0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/40 hover:bg-slate-100/60'}`}
                                    onClick={() => setCvorSelectedPull(isSel ? null : d.reportDate)}>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {isSel && <span className="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">▶ SELECTED</span>}
                                        {!isSel && isLatest && <span className="text-[8px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">LATEST</span>}
                                        <span className="font-mono font-semibold text-slate-800">{d.periodLabel}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <span className="text-[10px] font-mono text-indigo-600">{win.label}</span>
                                      {inWin.length > 0 && (
                                        <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{inWin.length} inspections</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${rZone}`}>{d.rating.toFixed(2)}%</span>
                                    </td>
                                    <td className="px-2 py-2.5 text-right font-mono text-blue-600 whitespace-nowrap">{d.colContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-amber-600 whitespace-nowrap">{d.conContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-red-600 whitespace-nowrap">{d.insContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">{d.collisionEvents}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-700 whitespace-nowrap">{d.convictionEvents}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-indigo-600 whitespace-nowrap">{d.totalCollisionPoints||'—'}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-pink-600 whitespace-nowrap">{d.convictionPoints}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosOverall>20?'text-red-600 font-bold':'text-slate-600'}`}>{d.oosOverall>0?`${d.oosOverall.toFixed(1)}%`:'—'}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosVehicle>20?'text-red-600 font-bold':'text-slate-600'}`}>{d.oosVehicle>0?`${d.oosVehicle.toFixed(1)}%`:'—'}</td>
                                    <td className={`px-2 py-2.5 text-right font-mono whitespace-nowrap ${d.oosDriver>5?'text-amber-600 font-semibold':'text-emerald-600'}`}>{d.oosDriver>0?`${d.oosDriver.toFixed(1)}%`:'—'}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">{d.trucks}</td>
                                    <td className="px-2 py-2.5 text-right font-mono text-slate-500 whitespace-nowrap">{(d.totalMiles/1_000_000).toFixed(2)}M</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ══ INSPECTIONS DRILL-DOWN ══ */}
                      {cvorSelectedPull && (() => {
                        const pullObj = cvorPeriodicReports.find(d => d.reportDate === cvorSelectedPull);
                        if (!pullObj) return null;
                        const win = windowOf(cvorSelectedPull);
                        const pullInspections = inspectionsData
                          .filter(r => { const rd = new Date(r.date); return rd >= win.start && rd <= win.end; })
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        return (
                          <div>
                            {/* Section header */}
                            <div className="flex items-center gap-3 flex-wrap mb-4 pb-3 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-8 bg-indigo-500 rounded-full"/>
                                <div>
                                  <div className="text-sm font-bold text-slate-800">
                                    Inspections — {pullObj.periodLabel} Pull
                                  </div>
                                  <div className="text-[10px] text-indigo-600 font-mono">
                                    24-month window: {win.label}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap ml-2">
                                <span className="text-[11px] bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded">
                                  {pullInspections.length} inspection{pullInspections.length !== 1 ? 's' : ''} in window
                                </span>
                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-semibold">
                                  {pullInspections.filter(r => r.hasOOS).length} OOS
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-semibold">
                                  {pullInspections.filter(r => r.isClean).length} Clean
                                </span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                  CVOR Rating: <strong>{pullObj.rating.toFixed(2)}%</strong>
                                </span>
                              </div>
                              <button onClick={() => setCvorSelectedPull(null)}
                                className="ml-auto text-slate-400 hover:text-slate-700 text-xs border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors">
                                × Close
                              </button>
                            </div>

                            {pullInspections.length === 0 ? (
                              <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                                <div className="text-3xl">📋</div>
                                <div className="text-sm font-semibold">No inspections recorded in this window</div>
                                <div className="text-xs font-mono text-indigo-400">{win.label}</div>
                              </div>
                            ) : (
                              <div>
                                {/* Table header */}
                                <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-2 border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  <div className="col-span-1">Date</div>
                                  <div className="col-span-1">Report ID</div>
                                  <div className="col-span-1">Location</div>
                                  <div className="col-span-2">Driver</div>
                                  <div className="col-span-2">Vehicle</div>
                                  <div className="col-span-1 text-center">Level</div>
                                  <div className="col-span-1 text-center">Viol.</div>
                                  <div className="col-span-1 text-center">Veh Pts</div>
                                  <div className="col-span-1 text-center">Drv Pts</div>
                                  <div className="col-span-1 text-center">Status</div>
                                </div>
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                                  {pullInspections.map((record, ri) => {
                                    const primaryUnit = record.units?.[0];
                                    const totalViolPts = (record.violations||[]).reduce((s: number, v: any) => s + (v.points||0), 0);
                                    const drvPts = (record.violations||[]).filter((v:any)=>v.driverRiskCategory===1||v.driverRiskCategory===2).reduce((s:number,v:any)=>s+(v.points||0),0);
                                    const vehPts = record.smsPoints?.vehicle ?? 0;
                                    return (
                                      <div key={ri} className={`grid grid-cols-12 gap-x-2 px-4 py-3 items-center text-[11px] transition-colors
                                        ${record.hasOOS ? 'bg-red-50/40 border-l-2 border-l-red-400' :
                                          record.isClean ? 'bg-emerald-50/30 border-l-2 border-l-emerald-400' :
                                          'bg-white border-l-2 border-l-amber-300'} hover:bg-slate-50`}>
                                        {/* Date */}
                                        <div className="col-span-1">
                                          <div className="font-bold text-slate-800 font-mono text-[10px]">{record.date}</div>
                                          {record.startTime && <div className="text-[9px] text-slate-400 font-mono">{record.startTime}</div>}
                                        </div>
                                        {/* Report ID */}
                                        <div className="col-span-1 min-w-0">
                                          <div className="text-[10px] font-bold text-blue-600 truncate">{record.id}</div>
                                          <div className="text-[9px] text-slate-400">{record.level}</div>
                                        </div>
                                        {/* Location */}
                                        <div className="col-span-1">
                                          <div className="text-[10px] font-medium text-slate-700 truncate">{record.location?.city || record.state}</div>
                                          <div className="text-[9px] text-slate-400">{record.location?.province || ''}</div>
                                        </div>
                                        {/* Driver */}
                                        <div className="col-span-2 min-w-0">
                                          <div className="font-semibold text-slate-800 truncate">{record.driver?.split(',')[0]}</div>
                                          <div className="text-[9px] text-slate-400 font-mono truncate">{record.driverLicense || record.driverId}</div>
                                        </div>
                                        {/* Vehicle */}
                                        <div className="col-span-2 min-w-0">
                                          <div className="font-semibold text-slate-800">{primaryUnit?.license || record.vehiclePlate}</div>
                                          {record.powerUnitDefects
                                            ? <div className="text-[9px] text-amber-600 truncate" title={record.powerUnitDefects}>{record.powerUnitDefects}</div>
                                            : <div className="text-[9px] text-emerald-600">No defects</div>
                                          }
                                        </div>
                                        {/* Level */}
                                        <div className="col-span-1 flex justify-center">
                                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            L{record.level?.replace(/level\s*/i,'')||'?'}
                                          </span>
                                        </div>
                                        {/* Violations */}
                                        <div className="col-span-1 text-center">
                                          {record.isClean
                                            ? <span className="text-emerald-600 font-bold text-[10px]">Clean</span>
                                            : <span className="text-orange-600 font-bold">{(record.violations||[]).length}</span>
                                          }
                                        </div>
                                        {/* Veh pts */}
                                        <div className="col-span-1 text-center">
                                          <span className={`font-bold ${vehPts > 0 ? 'text-red-600' : 'text-slate-300'}`}>{vehPts || '—'}</span>
                                        </div>
                                        {/* Drv pts */}
                                        <div className="col-span-1 text-center">
                                          <span className={`font-bold ${drvPts > 0 ? 'text-red-600' : 'text-slate-300'}`}>{drvPts || '—'}</span>
                                        </div>
                                        {/* Status badge */}
                                        <div className="col-span-1 flex justify-center">
                                          {record.hasOOS
                                            ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 border border-red-200">OOS</span>
                                            : record.isClean
                                            ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">Clean</span>
                                            : <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">Warning</span>
                                          }
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  </div>
                );
              })()}
"""

with open('src/pages/inspections/InspectionsPage.tsx','r',encoding='utf-8') as f:
    lines = f.readlines()

chart_start = next(i for i,l in enumerate(lines) if '{/* ── PERFORMANCE HISTORY CHARTS ── */}' in l)
chart_end   = next(i for i,l in enumerate(lines) if '{/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}' in l and i > chart_start+5)

print(f"\nStep 3: Replacing chart section lines {chart_start+1}–{chart_end}")
with open('src/pages/inspections/InspectionsPage.tsx','w',encoding='utf-8') as f:
    f.writelines(lines[:chart_start] + [CHART_JSX+'\n'] + lines[chart_end:])
print("Done.")
