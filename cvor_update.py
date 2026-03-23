#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Replace CvorPeriodicReport type+data in inspectionsData.ts and chart section in InspectionsPage.tsx"""
import sys, re

# ─── STEP 1: Replace CvorPeriodicReport in inspectionsData.ts ───────────────
NEW_DATA = r"""
// ─────────────────────────────────────────────────────────────────────────────
// CVOR PERIODIC REPORT SNAPSHOTS
// Each row = one actual MTO CVOR abstract pull for the carrier.
// Real pull dates: Apr 2022 → Jan 2024 (15 pulls).
// colContrib/conContrib/insContrib are the weighted contributions to overall rating.
// colPctOfThresh = colContrib / 0.40, conPctOfThresh = conContrib / 0.40,
// insPctOfThresh = insContrib / 0.20
// ─────────────────────────────────────────────────────────────────────────────

export type CvorPeriodicReport = {
  reportDate:           string;   // ISO date of actual pull
  periodLabel:          string;   // display label e.g. "Apr 4, 2022"
  rating:               number;   // overall CVOR %
  // Weighted contributions to overall rating
  colContrib:           number;   // % Collisions contribution (weight 40%)
  conContrib:           number;   // % Convictions contribution (weight 40%)
  insContrib:           number;   // % Inspections contribution (weight 20%)
  // % of threshold used (derived: colContrib/0.40, conContrib/0.40, insContrib/0.20)
  colPctOfThresh:       number;
  conPctOfThresh:       number;
  insPctOfThresh:       number;
  // Event counts
  collisionEvents:      number;
  convictionEvents:     number;
  // OOS rates
  oosOverall:           number;
  oosVehicle:           number;
  oosDriver:            number;
  // Fleet stats
  trucks:               number;
  onMiles:              number;
  canadaMiles:          number;
  totalMiles:           number;
  // Points breakdown
  collWithPoints:       number;
  collWithoutPoints:    number;
  totalCollisionPoints: number;
  convictionPoints:     number;
};

// 15 real CVOR abstract pulls (Apr 2022 → Jan 2024)
export const cvorPeriodicReports: CvorPeriodicReport[] = [
  { reportDate:'2022-04-04', periodLabel:'Apr 4/22',  rating:24.29, colContrib:2.52,  conContrib:5.17, insContrib:16.59, colPctOfThresh:6.30,  conPctOfThresh:12.93, insPctOfThresh:82.95, collisionEvents:21, convictionEvents:27, oosOverall:26.58, oosVehicle:27.69, oosDriver:3.80, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:6,  collWithoutPoints:15, totalCollisionPoints:14, convictionPoints:74 },
  { reportDate:'2022-05-06', periodLabel:'May 6/22',  rating:24.16, colContrib:2.52,  conContrib:5.06, insContrib:16.57, colPctOfThresh:6.30,  conPctOfThresh:12.65, insPctOfThresh:82.85, collisionEvents:22, convictionEvents:26, oosOverall:25.33, oosVehicle:26.67, oosDriver:4.00, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:6,  collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:71 },
  { reportDate:'2022-08-02', periodLabel:'Aug 2/22',  rating:26.55, colContrib:2.52,  conContrib:6.23, insContrib:17.79, colPctOfThresh:6.30,  conPctOfThresh:15.58, insPctOfThresh:88.95, collisionEvents:22, convictionEvents:30, oosOverall:27.59, oosVehicle:29.41, oosDriver:4.60, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:6,  collWithoutPoints:16, totalCollisionPoints:14, convictionPoints:86 },
  { reportDate:'2022-09-01', periodLabel:'Sep 1/22',  rating:26.40, colContrib:2.92,  conContrib:5.75, insContrib:17.73, colPctOfThresh:7.30,  conPctOfThresh:14.38, insPctOfThresh:88.65, collisionEvents:23, convictionEvents:27, oosOverall:27.91, oosVehicle:28.99, oosDriver:4.65, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:7,  collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:76 },
  { reportDate:'2022-10-18', periodLabel:'Oct 18/22', rating:26.34, colContrib:2.92,  conContrib:5.74, insContrib:17.68, colPctOfThresh:7.30,  conPctOfThresh:14.35, insPctOfThresh:88.40, collisionEvents:23, convictionEvents:26, oosOverall:27.78, oosVehicle:29.58, oosDriver:4.44, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:7,  collWithoutPoints:7,  totalCollisionPoints:7,  convictionPoints:7  },
  { reportDate:'2022-11-23', periodLabel:'Nov 23/22', rating:27.21, colContrib:3.31,  conContrib:5.62, insContrib:18.29, colPctOfThresh:8.28,  conPctOfThresh:14.05, insPctOfThresh:91.45, collisionEvents:22, convictionEvents:26, oosOverall:28.57, oosVehicle:31.43, oosDriver:4.40, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:8,  collWithoutPoints:14, totalCollisionPoints:18, convictionPoints:72 },
  { reportDate:'2023-02-13', periodLabel:'Feb 13/23', rating:26.33, colContrib:3.02,  conContrib:5.00, insContrib:18.30, colPctOfThresh:7.55,  conPctOfThresh:12.50, insPctOfThresh:91.50, collisionEvents:23, convictionEvents:22, oosOverall:28.72, oosVehicle:33.33, oosDriver:3.19, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:7,  collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:61 },
  { reportDate:'2023-03-14', periodLabel:'Mar 14/23', rating:27.18, colContrib:3.02,  conContrib:4.82, insContrib:19.34, colPctOfThresh:7.55,  conPctOfThresh:12.05, insPctOfThresh:96.70, collisionEvents:23, convictionEvents:20, oosOverall:30.77, oosVehicle:36.23, oosDriver:3.30, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:7,  collWithoutPoints:16, totalCollisionPoints:16, convictionPoints:58 },
  { reportDate:'2023-04-24', periodLabel:'Apr 24/23', rating:28.39, colContrib:2.74,  conContrib:5.07, insContrib:20.58, colPctOfThresh:6.85,  conPctOfThresh:12.68, insPctOfThresh:102.90, collisionEvents:23, convictionEvents:22, oosOverall:34.12, oosVehicle:41.94, oosDriver:3.53, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:6,  collWithoutPoints:17, totalCollisionPoints:14, convictionPoints:61 },
  { reportDate:'2023-05-31', periodLabel:'May 31/23', rating:28.71, colContrib:2.45,  conContrib:4.70, insContrib:21.56, colPctOfThresh:6.13,  conPctOfThresh:11.75, insPctOfThresh:107.80, collisionEvents:22, convictionEvents:21, oosOverall:36.36, oosVehicle:45.45, oosDriver:3.90, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:0,  collWithoutPoints:0,  totalCollisionPoints:12, convictionPoints:53 },
  { reportDate:'2023-06-01', periodLabel:'Jun 1/23',  rating:29.67, colContrib:2.74,  conContrib:5.02, insContrib:21.91, colPctOfThresh:6.85,  conPctOfThresh:12.55, insPctOfThresh:109.55, collisionEvents:24, convictionEvents:23, oosOverall:36.36, oosVehicle:45.45, oosDriver:3.90, trucks:130, onMiles:16388058, canadaMiles:666469, totalMiles:17054528, collWithPoints:0,  collWithoutPoints:18, totalCollisionPoints:14, convictionPoints:59 },
  { reportDate:'2023-08-03', periodLabel:'Aug 3/23',  rating:25.62, colContrib:2.39,  conContrib:3.06, insContrib:20.17, colPctOfThresh:5.98,  conPctOfThresh:7.65,  insPctOfThresh:100.85, collisionEvents:22, convictionEvents:35, oosOverall:31.94, oosVehicle:41.67, oosDriver:4.17, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5,  collWithoutPoints:17, totalCollisionPoints:12, convictionPoints:35 },
  { reportDate:'2023-10-14', periodLabel:'Oct 14/23', rating:20.98, colContrib:2.39,  conContrib:2.81, insContrib:15.78, colPctOfThresh:5.98,  conPctOfThresh:7.03,  insPctOfThresh:78.90, collisionEvents:21, convictionEvents:14, oosOverall:29.11, oosVehicle:38.46, oosDriver:3.80, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:5,  collWithoutPoints:16, totalCollisionPoints:12, convictionPoints:32 },
  { reportDate:'2023-11-14', periodLabel:'Nov 14/23', rating:22.31, colContrib:2.81,  conContrib:3.00, insContrib:16.49, colPctOfThresh:7.03,  conPctOfThresh:7.50,  insPctOfThresh:82.45, collisionEvents:23, convictionEvents:14, oosOverall:30.00, oosVehicle:42.00, oosDriver:3.75, trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:6,  collWithoutPoints:17, totalCollisionPoints:14, convictionPoints:34 },
  { reportDate:'2024-01-12', periodLabel:'Jan 12/24', rating:21.81, colContrib:2.81,  conContrib:2.16, insContrib:16.84, colPctOfThresh:7.03,  conPctOfThresh:5.40,  insPctOfThresh:84.20, collisionEvents:18, convictionEvents:11, oosOverall:0,     oosVehicle:0,     oosDriver:0,    trucks:135, onMiles:12407962, canadaMiles:3372498, totalMiles:15780460, collWithPoints:0,  collWithoutPoints:0,  totalCollisionPoints:14, convictionPoints:24 },
];
"""

with open('src/pages/inspections/inspectionsData.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find where CvorPeriodicReport block starts (line 1759 = index 1758)
start_idx = None
for i, line in enumerate(lines):
    if 'CVOR PERIODIC REPORT SNAPSHOTS' in line:
        start_idx = i - 1  # include the blank line before the comment block
        break

if start_idx is None:
    print("ERROR: Could not find CVOR PERIODIC REPORT SNAPSHOTS marker")
    sys.exit(1)

lines_new = lines[:start_idx] + [NEW_DATA]
with open('src/pages/inspections/inspectionsData.ts', 'w', encoding='utf-8') as f:
    f.writelines(lines_new)

print(f"Step 1: Replaced CvorPeriodicReport data (from line {start_idx+1}). New file: {len(lines_new)} entries")

# ─── STEP 2: Replace chart section in InspectionsPage.tsx ───────────────────
CHART_JSX = r"""              {/* ── PERFORMANCE HISTORY CHARTS ── */}
              {(() => {
                // Filter by period — map period buttons to cutoff dates
                const cutoffDate = (p: string) => {
                  const d = new Date('2024-01-12');
                  if (p === '3M')  { d.setMonth(d.getMonth() - 3);  return d; }
                  if (p === '6M')  { d.setMonth(d.getMonth() - 6);  return d; }
                  if (p === '12M') { d.setMonth(d.getMonth() - 12); return d; }
                  return new Date('2000-01-01'); // ALL
                };
                const histData = cvorPeriodicReports.filter(
                  d => new Date(d.reportDate) >= cutoffDate(cvorPeriod)
                );
                const n = histData.length;
                if (n < 2) return null;

                // SVG layout — generous sizing for readability
                const svgH = 260;
                const pL = 48, pR = 20, pT = 16, pB = 44;
                const svgW = Math.max(640, n * 52 + pL + pR);
                const cW  = svgW - pL - pR;
                const cH  = svgH - pT - pB;

                const xAt = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
                const yAt = (v: number, max = 100, min = 0, h = cH) =>
                  pT + h - ((v - min) / (max - min)) * h;
                const mkLine = (vals: number[], max = 100, min = 0, h = cH) =>
                  vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v, max, min, h).toFixed(1)}`).join(' ');
                const mkArea = (vals: number[], max = 100, min = 0, h = cH) => {
                  const line = mkLine(vals, max, min, h);
                  return `${line} L${xAt(n-1).toFixed(1)},${(pT+h).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+h).toFixed(1)}Z`;
                };

                const dotC = (r: number) =>
                  r >= cvorThresholds.showCause    ? '#ef4444' :
                  r >= cvorThresholds.intervention  ? '#f97316' :
                  r >= cvorThresholds.warning       ? '#eab308' : '#10b981';

                // shared x-axis label component
                const XLabels = ({ svW }: { svW: number }) => (
                  <>
                    {histData.map((d, i) => (
                      <text key={i} x={xAt(i)} y={pT + cH + 14}
                        textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace"
                        transform={`rotate(-35,${xAt(i)},${pT + cH + 14})`}>
                        {d.periodLabel}
                      </text>
                    ))}
                  </>
                );

                return (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    {/* ── Header ── */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-sm font-bold text-slate-700">CVOR Performance History</span>
                        <span className="text-[11px] text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded">{n} report pulls</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Show</span>
                        <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                          {(['3M','6M','12M','ALL'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p as typeof cvorPeriod)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${cvorPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-6">

                      {/* ══ Chart 1: Overall CVOR Rating ══ */}
                      <div>
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overall CVOR Rating</span>
                          {[
                            { label:'Safe (<35%)',        cls:'bg-emerald-200' },
                            { label:'Warning (35–50%)',   cls:'bg-yellow-200' },
                            { label:'Audit (50–75%)',     cls:'bg-amber-200' },
                            { label:'Show Cause (75%+)',  cls:'bg-red-200' },
                          ].map(z => (
                            <div key={z.label} className="flex items-center gap-1.5">
                              <div className={`w-3 h-2.5 rounded-sm ${z.cls}`}/>
                              <span className="text-[10px] text-slate-500">{z.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="overflow-x-auto">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', minWidth:`${Math.min(svgW, 700)}px`, height:`${svgH}px` }}>
                            {/* Zone bands */}
                            <rect x={pL} y={yAt(100)}                            width={cW} height={yAt(cvorThresholds.showCause)-yAt(100)}                                           fill="#fee2e2" opacity="0.55"/>
                            <rect x={pL} y={yAt(cvorThresholds.showCause)}       width={cW} height={yAt(cvorThresholds.intervention)-yAt(cvorThresholds.showCause)}                  fill="#fef3c7" opacity="0.60"/>
                            <rect x={pL} y={yAt(cvorThresholds.intervention)}    width={cW} height={yAt(cvorThresholds.warning)-yAt(cvorThresholds.intervention)}                    fill="#fef9c3" opacity="0.60"/>
                            <rect x={pL} y={yAt(cvorThresholds.warning)}         width={cW} height={yAt(0)-yAt(cvorThresholds.warning)}                                              fill="#d1fae5" opacity="0.50"/>
                            {/* Y gridlines + labels */}
                            {[0,10,20,30,40,50,60,70,80,90,100].map(v => (
                              <g key={v}>
                                <line x1={pL} x2={pL+cW} y1={yAt(v)} y2={yAt(v)} stroke={v%25===0 ? '#e2e8f0' : '#f8fafc'} strokeWidth={v%25===0 ? 1 : 0.5}/>
                                {v%10===0 && <text x={pL-6} y={yAt(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>}
                              </g>
                            ))}
                            {/* Threshold dashes */}
                            {[
                              { t: cvorThresholds.warning,      color:'#84cc16', label:'Warning' },
                              { t: cvorThresholds.intervention,  color:'#f59e0b', label:'Audit' },
                              { t: cvorThresholds.showCause,     color:'#ef4444', label:'Show Cause' },
                            ].map(({ t, color, label }) => (
                              <g key={t}>
                                <line x1={pL} x2={pL+cW} y1={yAt(t)} y2={yAt(t)} stroke={color} strokeWidth="1" strokeDasharray="5,3" opacity="0.7"/>
                                <text x={pL+cW+4} y={yAt(t)+3.5} fontSize="8" fill={color} fontFamily="sans-serif" fontWeight="600">{t}%</text>
                              </g>
                            ))}
                            {/* Area fill */}
                            <path d={mkArea(histData.map(d => d.rating))} fill="#f59e0b" opacity="0.08"/>
                            {/* Line */}
                            <path d={mkLine(histData.map(d => d.rating))} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                            {/* Dots + value labels */}
                            {histData.map((d, i) => {
                              const cx = xAt(i), cy = yAt(d.rating), dc = dotC(d.rating);
                              const isLast = i === n - 1;
                              return (
                                <g key={i}>
                                  {isLast && <circle cx={cx} cy={cy} r={8} fill={dc} opacity="0.15"/>}
                                  <circle cx={cx} cy={cy} r={isLast ? 5 : 3.5} fill={dc} stroke="white" strokeWidth={isLast ? 2 : 1.5}/>
                                  <text x={cx} y={cy - (isLast ? 12 : 9)} textAnchor="middle" fontSize={isLast ? 10 : 8} fontWeight={isLast ? 'bold' : 'normal'} fill={dc} fontFamily="monospace">{d.rating.toFixed(2)}%</text>
                                </g>
                              );
                            })}
                            <XLabels svW={svgW}/>
                          </svg>
                        </div>
                      </div>

                      {/* ══ Chart 2 + 3 side-by-side ══ */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Chart 2: Category Contributions */}
                        <div>
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Category Contributions</span>
                            {[
                              { label:'Collisions (40%)',   stroke:'#3b82f6' },
                              { label:'Convictions (40%)',  stroke:'#f59e0b' },
                              { label:'Inspections (20%)',  stroke:'#ef4444' },
                            ].map(s => (
                              <div key={s.label} className="flex items-center gap-1.5">
                                <div className="w-4 h-0.5 rounded" style={{ background: s.stroke }}/>
                                <span className="text-[10px] text-slate-500">{s.label}</span>
                              </div>
                            ))}
                          </div>
                          {(() => {
                            const h2 = 200, pB2 = 44, cH2 = h2 - pT - pB2;
                            const svgW2 = Math.max(320, n * 52 + pL + pR);
                            const cW2 = svgW2 - pL - pR;
                            const xAt2 = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW2 : cW2 / 2);
                            const yAt2 = (v: number, max = 12, min = 0) =>
                              pT + cH2 - ((v - min) / (max - min)) * cH2;
                            const mkL2 = (vals: number[], max = 12) =>
                              vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt2(i).toFixed(1)},${yAt2(v, max).toFixed(1)}`).join(' ');
                            const maxCon = Math.max(...histData.map(d => d.conContrib)) * 1.2;
                            return (
                              <div className="overflow-x-auto">
                                <svg viewBox={`0 0 ${svgW2} ${h2}`} style={{ width:'100%', minWidth:`${Math.min(svgW2,380)}px`, height:`${h2}px` }}>
                                  {[0,2,4,6,8,10].map(v => (
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW2} y1={yAt2(v,maxCon)} y2={yAt2(v,maxCon)} stroke="#f1f5f9" strokeWidth="1"/>
                                      <text x={pL-6} y={yAt2(v,maxCon)+3.5} textAnchor="end" fontSize="8" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  <path d={mkL2(histData.map(d => d.colContrib), maxCon)} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"/>
                                  <path d={mkL2(histData.map(d => d.conContrib), maxCon)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round"/>
                                  <path d={mkL2(histData.map(d => d.insContrib), maxCon)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                                  {histData.map((d, i) => (
                                    <g key={i}>
                                      <circle cx={xAt2(i)} cy={yAt2(d.colContrib, maxCon)} r="3" fill="#3b82f6" stroke="white" strokeWidth="1.5"/>
                                      <circle cx={xAt2(i)} cy={yAt2(d.conContrib, maxCon)} r="3" fill="#f59e0b" stroke="white" strokeWidth="1.5"/>
                                      <circle cx={xAt2(i)} cy={yAt2(d.insContrib, maxCon)} r="3" fill="#ef4444" stroke="white" strokeWidth="1.5"/>
                                    </g>
                                  ))}
                                  {histData.map((d, i) => (
                                    <text key={i} x={xAt2(i)} y={pT + cH2 + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace"
                                      transform={`rotate(-35,${xAt2(i)},${pT + cH2 + 14})`}>{d.periodLabel}</text>
                                  ))}
                                </svg>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Chart 3: OOS Rates */}
                        <div>
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">OOS Rates</span>
                            {[
                              { label:'Overall',  stroke:'#6366f1' },
                              { label:'Vehicle',  stroke:'#ef4444' },
                              { label:'Driver',   stroke:'#10b981' },
                            ].map(s => (
                              <div key={s.label} className="flex items-center gap-1.5">
                                <div className="w-4 h-0.5 rounded" style={{ background: s.stroke }}/>
                                <span className="text-[10px] text-slate-500">{s.label}</span>
                              </div>
                            ))}
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 border-t border-dashed border-slate-400"/>
                              <span className="text-[10px] text-slate-400">20% threshold</span>
                            </div>
                          </div>
                          {(() => {
                            const h3 = 200, pB3 = 44, cH3 = h3 - pT - pB3;
                            const oosD = histData.filter(d => d.oosOverall > 0);
                            const no = oosD.length;
                            if (no < 2) return <div className="text-xs text-slate-400 p-4">Insufficient OOS data for this period.</div>;
                            const svgW3 = Math.max(320, no * 52 + pL + pR);
                            const cW3 = svgW3 - pL - pR;
                            const xO = (i: number) => pL + (no > 1 ? (i / (no - 1)) * cW3 : cW3 / 2);
                            const yO = (v: number, max = 50, min = 0) =>
                              pT + cH3 - ((v - min) / (max - min)) * cH3;
                            const mkO = (vals: number[], max = 50) =>
                              vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xO(i).toFixed(1)},${yO(v, max).toFixed(1)}`).join(' ');
                            return (
                              <div className="overflow-x-auto">
                                <svg viewBox={`0 0 ${svgW3} ${h3}`} style={{ width:'100%', minWidth:`${Math.min(svgW3,380)}px`, height:`${h3}px` }}>
                                  {[0,10,20,30,40,50].map(v => (
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW3} y1={yO(v)} y2={yO(v)} stroke="#f1f5f9" strokeWidth="1"/>
                                      <text x={pL-6} y={yO(v)+3.5} textAnchor="end" fontSize="8" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  {/* 20% OOS threshold dashes */}
                                  <line x1={pL} x2={pL+cW3} y1={yO(20)} y2={yO(20)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" opacity="0.7"/>
                                  <text x={pL+cW3+3} y={yO(20)+3.5} fontSize="8" fill="#94a3b8">20%</text>
                                  <path d={mkO(oosD.map(d => d.oosOverall))} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round"/>
                                  <path d={mkO(oosD.map(d => d.oosVehicle))} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinejoin="round"/>
                                  <path d={mkO(oosD.map(d => d.oosDriver))}  fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round"/>
                                  {oosD.map((d, i) => (
                                    <g key={i}>
                                      <circle cx={xO(i)} cy={yO(d.oosOverall)} r="3" fill="#6366f1" stroke="white" strokeWidth="1.5"/>
                                      <circle cx={xO(i)} cy={yO(d.oosVehicle)} r="3" fill="#ef4444" stroke="white" strokeWidth="1.5"/>
                                      <circle cx={xO(i)} cy={yO(d.oosDriver)}  r="3" fill="#10b981" stroke="white" strokeWidth="1.5"/>
                                    </g>
                                  ))}
                                  {oosD.map((d, i) => (
                                    <text key={i} x={xO(i)} y={pT + cH3 + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace"
                                      transform={`rotate(-35,${xO(i)},${pT + cH3 + 14})`}>{d.periodLabel}</text>
                                  ))}
                                </svg>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* ══ Chart 4: Event Counts — Collisions & Convictions ══ */}
                      <div>
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Event Counts per Pull</span>
                          {[
                            { label:'Collisions',   stroke:'#3b82f6', fill:'#dbeafe' },
                            { label:'Convictions',  stroke:'#f59e0b', fill:'#fef3c7' },
                            { label:'Col Points',   stroke:'#6366f1', dashed:true },
                            { label:'Conv Points',  stroke:'#ec4899', dashed:true },
                          ].map(s => (
                            <div key={s.label} className="flex items-center gap-1.5">
                              <div className={`w-4 border-t ${s.dashed ? 'border-dashed' : ''}`} style={{ borderColor: s.stroke }}/>
                              <span className="text-[10px] text-slate-500">{s.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="overflow-x-auto">
                          {(() => {
                            const h4 = 220, pB4 = 44, cH4 = h4 - pT - pB4;
                            const svgW4 = Math.max(640, n * 52 + pL + pR);
                            const cW4 = svgW4 - pL - pR;
                            const xA = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW4 : cW4 / 2);
                            const maxE = Math.max(...histData.map(d => Math.max(d.collisionEvents, d.convictionEvents)));
                            const maxP = Math.max(...histData.map(d => Math.max(d.totalCollisionPoints, d.convictionPoints)));
                            const yE = (v: number) => pT + cH4 - ((v / (maxE * 1.2)) * cH4);
                            const yP = (v: number) => pT + cH4 - ((v / (maxP * 1.2)) * cH4);
                            const mkE = (vals: number[], yFn: (v:number)=>number) =>
                              vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xA(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ');
                            return (
                              <svg viewBox={`0 0 ${svgW4} ${h4}`} style={{ width:'100%', minWidth:`${Math.min(svgW4,700)}px`, height:`${h4}px` }}>
                                {/* Bars for events */}
                                {histData.map((d, i) => {
                                  const bw = Math.max(8, cW4 / n * 0.25);
                                  return (
                                    <g key={i}>
                                      {/* Collision bar */}
                                      <rect x={xA(i) - bw - 1} y={yE(d.collisionEvents)} width={bw} height={cH4 + pT - yE(d.collisionEvents)} fill="#dbeafe" stroke="#3b82f6" strokeWidth="1" rx="1"/>
                                      {/* Conviction bar */}
                                      <rect x={xA(i) + 1}      y={yE(d.convictionEvents)} width={bw} height={cH4 + pT - yE(d.convictionEvents)} fill="#fef3c7" stroke="#f59e0b" strokeWidth="1" rx="1"/>
                                      {/* Value labels */}
                                      <text x={xA(i) - bw/2 - 0.5} y={yE(d.collisionEvents) - 3} textAnchor="middle" fontSize="8" fill="#3b82f6" fontFamily="monospace">{d.collisionEvents}</text>
                                      <text x={xA(i) + bw/2 + 1.5} y={yE(d.convictionEvents) - 3} textAnchor="middle" fontSize="8" fill="#f59e0b" fontFamily="monospace">{d.convictionEvents}</text>
                                    </g>
                                  );
                                })}
                                {/* Points lines (secondary axis feel — dashed) */}
                                <path d={mkE(histData.map(d => d.totalCollisionPoints), yP)} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.7"/>
                                <path d={mkE(histData.map(d => d.convictionPoints), yP)}      fill="none" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="4,2" opacity="0.7"/>
                                {/* X labels */}
                                {histData.map((d, i) => (
                                  <text key={i} x={xA(i)} y={pT + cH4 + 14} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace"
                                    transform={`rotate(-35,${xA(i)},${pT + cH4 + 14})`}>{d.periodLabel}</text>
                                ))}
                                {/* Y axis labels */}
                                {[0, 10, 20, 30, 40].filter(v => v <= maxE * 1.2).map(v => (
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW4} y1={yE(v)} y2={yE(v)} stroke="#f1f5f9" strokeWidth="0.5"/>
                                    <text x={pL-6} y={yE(v)+3.5} textAnchor="end" fontSize="8" fill="#94a3b8" fontFamily="monospace">{v}</text>
                                  </g>
                                ))}
                              </svg>
                            );
                          })()}
                        </div>
                      </div>

                      {/* ══ Data Table ══ */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Report Pull Data</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{n} pulls · most recent first</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] border-collapse min-w-[900px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">Pull Date</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap">Rating %</th>
                                <th className="text-right px-2 py-2 font-semibold text-blue-500 whitespace-nowrap">Col Contrib</th>
                                <th className="text-right px-2 py-2 font-semibold text-amber-500 whitespace-nowrap">Con Contrib</th>
                                <th className="text-right px-2 py-2 font-semibold text-red-500 whitespace-nowrap">Ins Contrib</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap"># Coll</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap"># Conv</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap">Col Pts</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap">Conv Pts</th>
                                <th className="text-right px-2 py-2 font-semibold text-indigo-500 whitespace-nowrap">OOS Overall</th>
                                <th className="text-right px-2 py-2 font-semibold text-red-500 whitespace-nowrap">OOS Vehicle</th>
                                <th className="text-right px-2 py-2 font-semibold text-emerald-500 whitespace-nowrap">OOS Driver</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap">Trucks</th>
                                <th className="text-right px-2 py-2 font-semibold text-slate-500 whitespace-nowrap">Total Miles</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...histData].reverse().map((d, i) => {
                                const ratingColor =
                                  d.rating >= cvorThresholds.showCause    ? 'text-red-600 font-bold' :
                                  d.rating >= cvorThresholds.intervention  ? 'text-amber-600 font-bold' :
                                  d.rating >= cvorThresholds.warning       ? 'text-yellow-600 font-bold' : 'text-emerald-600';
                                const isLatest = i === 0;
                                return (
                                  <tr key={i} className={`border-b border-slate-100 ${isLatest ? 'bg-blue-50/60' : 'hover:bg-slate-50'} transition-colors`}>
                                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                                      {isLatest && <span className="inline-flex items-center text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded mr-1.5">LATEST</span>}
                                      {d.periodLabel}
                                    </td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${ratingColor}`}>{d.rating.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-blue-600 whitespace-nowrap">{d.colContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-amber-600 whitespace-nowrap">{d.conContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">{d.insContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{d.collisionEvents}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{d.convictionEvents}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{d.totalCollisionPoints}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{d.convictionPoints}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosOverall > 20 ? 'text-red-600' : 'text-slate-600'}`}>{d.oosOverall > 0 ? `${d.oosOverall.toFixed(1)}%` : '—'}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosVehicle > 20 ? 'text-red-600' : 'text-slate-600'}`}>{d.oosVehicle > 0 ? `${d.oosVehicle.toFixed(1)}%` : '—'}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosDriver > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.oosDriver > 0 ? `${d.oosDriver.toFixed(1)}%` : '—'}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{d.trucks}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{(d.totalMiles / 1_000_000).toFixed(2)}M</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
"""

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    lines2 = f.readlines()

# Find chart section start and end
chart_start = None
chart_end = None
for i, line in enumerate(lines2):
    if '{/* ── PERFORMANCE HISTORY CHARTS ── */}' in line and chart_start is None:
        chart_start = i
    if chart_start and i > chart_start + 5:
        if '{/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}' in line:
            chart_end = i
            break

if chart_start is None or chart_end is None:
    print(f"ERROR: chart_start={chart_start}, chart_end={chart_end}")
    sys.exit(1)

print(f"Step 2: Replacing chart section lines {chart_start+1}–{chart_end} in InspectionsPage.tsx")
lines2_new = lines2[:chart_start] + [CHART_JSX + '\n'] + lines2[chart_end:]
with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines2_new)

print(f"Step 2: Done. New total lines: {len(lines2_new)}")

# Fix period filter type — 'ALL' instead of '24M'
# The existing cvorPeriod state might be typed as '3M'|'6M'|'12M'|'24M'
# We just changed the buttons to use 'ALL' — we need to ensure the state allows it
print("Step 3: Checking cvorPeriod state type...")
with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Update any '24M' period state declarations/type annotations
content2 = content.replace(
    "useState<'3M'|'6M'|'12M'|'24M'>",
    "useState<'3M'|'6M'|'12M'|'ALL'>"
).replace(
    "useState<'3M' | '6M' | '12M' | '24M'>",
    "useState<'3M' | '6M' | '12M' | 'ALL'>"
).replace(
    "'24M'", "'ALL'"
)

# But we only want to replace the period-related ones, not unrelated '24M' strings
# The above is too broad — let's be more surgical
with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Only fix the useState type declaration for cvorPeriod
content2 = re.sub(
    r"(cvorPeriod.*useState[^)]*)'24M'([^)]*\))",
    r"\g<1>'ALL'\g<2>",
    content
)
# Fix initial value if it was '24M' for cvorPeriod
content2 = content2.replace(
    "const [cvorPeriod, setCvorPeriod] = useState('24M')",
    "const [cvorPeriod, setCvorPeriod] = useState('ALL')"
).replace(
    "const [cvorPeriod, setCvorPeriod] = useState<'3M'|'6M'|'12M'|'24M'>('24M')",
    "const [cvorPeriod, setCvorPeriod] = useState<'3M'|'6M'|'12M'|'ALL'>('ALL')"
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content2)

print("Done.")
