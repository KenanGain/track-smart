#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Replace CVOR chart section with proper:
 - cadence filter (Monthly / Quarterly / Semi-Annual = shows all/every-3rd/every-6th pull)
 - hover tooltips per dot per chart
 - 24-month rolling window note
 - 4 bigger charts + data table
"""
import sys, re

# ─── Step 1: Add cvorHoveredPull state right after cvorPeriod ───────────────
with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

OLD_STATE = "  const [cvorPeriod, setCvorPeriod] = useState<'1M' | '3M' | '6M' | '12M' | 'ALL'>('ALL');"
NEW_STATE = """  const [cvorPeriod, setCvorPeriod] = useState<'Monthly' | 'Quarterly' | 'Semi-Annual' | 'All'>('All');
  const [cvorHoveredPull, setCvorHoveredPull] = useState<{ chart: string; idx: number } | null>(null);"""

if OLD_STATE not in content:
    print("ERROR: cvorPeriod state not found as expected")
    sys.exit(1)

content = content.replace(OLD_STATE, NEW_STATE)

# Also fix the downstream references to old period values
content = content.replace(
    "cvorPeriod === '1M' ? 1 : cvorPeriod === '3M' ? 3 : cvorPeriod === '6M' ? 6 : cvorPeriod === '12M' ? 12 : 24",
    "cvorPeriod === 'Monthly' ? 1 : cvorPeriod === 'Quarterly' ? 3 : cvorPeriod === 'Semi-Annual' ? 6 : 12"
)
content = content.replace(
    "cvorPeriod === '24M' ? '24 Months' : cvorPeriod === '12M' ? '12 Months' : cvorPeriod === '6M' ? '6 Months' : cvorPeriod === '3M' ? '3 Months' : '1 Month'",
    "cvorPeriod === 'All' ? 'All Pulls' : cvorPeriod === 'Monthly' ? 'Monthly' : cvorPeriod === 'Quarterly' ? 'Quarterly' : 'Semi-Annual'"
)
content = content.replace(
    "{cvorPeriod !== '24M' && (",
    "{cvorPeriod !== 'All' && ("
)
# Fix period filter buttons in the top CVOR card (renders ['1M','3M','6M','12M','24M'])
content = re.sub(
    r"\(\['1M','3M','6M','12M','24M'\] as const\)",
    "(['Monthly','Quarterly','Semi-Annual','All'] as const)",
    content
)
content = re.sub(
    r"\(\['1M','3M','6M','12M'\] as const\)",
    "(['Monthly','Quarterly','Semi-Annual','All'] as const)",
    content
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Step 1: Added cvorHoveredPull state, fixed period references")

# ─── Step 2: Replace chart section ──────────────────────────────────────────
CHART_JSX = r"""              {/* ── PERFORMANCE HISTORY CHARTS ── */}
              {(() => {
                // ── Cadence filter: controls which pulls to show ──────────────────
                // Each pull already covers a 24-month rolling window.
                // "Monthly" = every pull, "Quarterly" = ~one per 3 months, etc.
                const filterByCadence = (data: typeof cvorPeriodicReports) => {
                  if (cvorPeriod === 'Monthly' || cvorPeriod === 'All') return data;
                  const gapMonths = cvorPeriod === 'Quarterly' ? 3 : 6; // Semi-Annual = 6
                  const out: typeof data = [];
                  let lastMs = 0;
                  for (const d of data) {
                    const ms = new Date(d.reportDate).getTime();
                    const monthsGap = (ms - lastMs) / (1000 * 60 * 60 * 24 * 30.44);
                    if (!lastMs || monthsGap >= gapMonths) {
                      out.push(d);
                      lastMs = ms;
                    }
                  }
                  return out;
                };

                const histData = filterByCadence(cvorPeriodicReports);
                const n = histData.length;
                if (n < 2) return null;

                // ── SVG layout helpers ────────────────────────────────────────────
                const pL = 52, pR = 24, pT = 20, pB = 50;
                const svgH = 300;
                const svgW = Math.max(700, n * 64 + pL + pR);
                const cW  = svgW - pL - pR;
                const cH  = svgH - pT - pB;

                const xAt = (i: number, total = n, w = cW) =>
                  pL + (total > 1 ? (i / (total - 1)) * w : w / 2);
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

                // ── Shared X-axis labels ──────────────────────────────────────────
                const XLabels = ({ svW2, cW2, items }: { svW2: number; cW2: number; items: typeof histData }) => (
                  <>
                    {items.map((d, i) => {
                      const ni = items.length;
                      const x2 = pL + (ni > 1 ? (i / (ni - 1)) * cW2 : cW2 / 2);
                      return (
                        <text key={i} x={x2} y={pT + (svH2 - pT - pB) + 14}
                          textAnchor="end" fontSize="9.5" fill="#475569" fontFamily="monospace"
                          transform={`rotate(-40,${x2},${pT + (svH2 - pT - pB) + 14})`}>
                          {d.periodLabel}
                        </text>
                      );
                    })}
                  </>
                );
                const svH2 = 240;

                // ── Tooltip helper (SVG overlay) ───────────────────────────────
                const SvgTooltip = ({
                  cx, cy, svgWidth, d, chartId
                }: {
                  cx: number; cy: number; svgWidth: number;
                  d: typeof histData[0]; chartId: string;
                }) => {
                  const w = 148, h = 116, pad = 10;
                  const tx = cx + (cx > svgWidth * 0.65 ? -(w + pad) : pad);
                  const ty = cy - h / 2;
                  const ratingC = dotC(d.rating);
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      {/* Shadow */}
                      <rect x={tx + 2} y={ty + 2} width={w} height={h} rx={7} fill="black" opacity="0.25"/>
                      {/* Background */}
                      <rect x={tx} y={ty} width={w} height={h} rx={7} fill="#0f172a"/>
                      <rect x={tx} y={ty} width={w} height={h} rx={7} fill="none" stroke="#334155" strokeWidth="0.75"/>
                      {/* Pull label */}
                      <text x={tx + w/2} y={ty + 16} textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                      <text x={tx + w/2} y={ty + 27} textAnchor="middle" fontSize="8" fill="#64748b" fontFamily="sans-serif">24-month rolling window</text>
                      <line x1={tx+8} x2={tx+w-8} y1={ty+33} y2={ty+33} stroke="#1e293b" strokeWidth="0.75"/>
                      {/* Values */}
                      {[
                        { label: 'Rating',      val: `${d.rating.toFixed(2)}%`,   color: ratingC },
                        { label: 'Collisions',  val: `${d.colContrib.toFixed(2)}%`, color: '#60a5fa' },
                        { label: 'Convictions', val: `${d.conContrib.toFixed(2)}%`, color: '#fbbf24' },
                        { label: 'Inspections', val: `${d.insContrib.toFixed(2)}%`, color: '#f87171' },
                        { label: 'OOS Overall', val: d.oosOverall > 0 ? `${d.oosOverall.toFixed(1)}%` : '—', color: d.oosOverall > 20 ? '#ef4444' : '#94a3b8' },
                        { label: '# Col / Conv', val: `${d.collisionEvents} / ${d.convictionEvents}`, color: '#94a3b8' },
                      ].map((row, ri) => (
                        <g key={ri}>
                          <text x={tx+10}   y={ty+47+ri*13} fontSize="8.5" fill="#94a3b8" fontFamily="sans-serif">{row.label}</text>
                          <text x={tx+w-10} y={ty+47+ri*13} textAnchor="end" fontSize="8.5" fontWeight="bold" fill={row.color} fontFamily="monospace">{row.val}</text>
                        </g>
                      ))}
                    </g>
                  );
                };

                return (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    {/* ── Header ── */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-sm font-bold text-slate-700">CVOR Performance History</span>
                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{n} report pulls shown</span>
                        <span className="text-[10px] text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded font-medium">Each pull = 24-month rolling window</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pull cadence</span>
                        <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                          {(['Monthly','Quarterly','Semi-Annual','All'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors whitespace-nowrap ${cvorPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-8">

                      {/* ══ Chart 1: Overall CVOR Rating ══ */}
                      <div>
                        <div className="flex items-center gap-4 mb-3 flex-wrap">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Overall CVOR Rating</span>
                          {[
                            { label:'Safe  <35%',       cls:'bg-emerald-200' },
                            { label:'Warning 35–50%',   cls:'bg-yellow-200' },
                            { label:'Audit  50–75%',    cls:'bg-amber-200' },
                            { label:'Show Cause  75%+', cls:'bg-red-200' },
                          ].map(z => (
                            <div key={z.label} className="flex items-center gap-1.5">
                              <div className={`w-3 h-2.5 rounded-sm ${z.cls}`}/>
                              <span className="text-[10px] text-slate-500 font-mono">{z.label}</span>
                            </div>
                          ))}
                          <span className="ml-auto text-[10px] text-slate-400 italic">Hover dot for details</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-100">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', minWidth:`${Math.min(svgW, 720)}px`, height:`${svgH}px`, overflow:'visible' }}>
                            {/* Zone bands */}
                            <rect x={pL} y={yAt(100)}                         width={cW} height={yAt(cvorThresholds.showCause)-yAt(100)}                              fill="#fee2e2" opacity="0.5"/>
                            <rect x={pL} y={yAt(cvorThresholds.showCause)}    width={cW} height={yAt(cvorThresholds.intervention)-yAt(cvorThresholds.showCause)}     fill="#fef3c7" opacity="0.55"/>
                            <rect x={pL} y={yAt(cvorThresholds.intervention)} width={cW} height={yAt(cvorThresholds.warning)-yAt(cvorThresholds.intervention)}       fill="#fef9c3" opacity="0.55"/>
                            <rect x={pL} y={yAt(cvorThresholds.warning)}      width={cW} height={yAt(0)-yAt(cvorThresholds.warning)}                                 fill="#d1fae5" opacity="0.45"/>
                            {/* Y gridlines */}
                            {[0,10,20,30,40,50,60,70,80,90,100].map(v => (
                              <g key={v}>
                                <line x1={pL} x2={pL+cW} y1={yAt(v)} y2={yAt(v)} stroke={v%10===0 ? '#e2e8f0' : '#f8fafc'} strokeWidth="1"/>
                                {v%10===0 && <text x={pL-7} y={yAt(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>}
                              </g>
                            ))}
                            {/* Threshold dashes */}
                            {[
                              { t: cvorThresholds.warning,     color:'#84cc16', lbl:'35% Warning' },
                              { t: cvorThresholds.intervention, color:'#f59e0b', lbl:'50% Audit' },
                              { t: cvorThresholds.showCause,    color:'#ef4444', lbl:'75% Show Cause' },
                            ].map(({ t, color, lbl }) => (
                              <g key={t}>
                                <line x1={pL} x2={pL+cW} y1={yAt(t)} y2={yAt(t)} stroke={color} strokeWidth="1" strokeDasharray="5,3" opacity="0.7"/>
                                <text x={pL+cW+5} y={yAt(t)+3.5} fontSize="8.5" fill={color} fontFamily="sans-serif" fontWeight="600">{lbl}</text>
                              </g>
                            ))}
                            {/* Area + line */}
                            <path d={mkArea(histData.map(d => d.rating))} fill="#f59e0b" opacity="0.07"/>
                            <path d={mkLine(histData.map(d => d.rating))} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                            {/* X labels */}
                            {histData.map((d, i) => (
                              <text key={i} x={xAt(i)} y={pT + cH + 16}
                                textAnchor="end" fontSize="9.5" fill="#475569" fontFamily="monospace"
                                transform={`rotate(-40,${xAt(i)},${pT + cH + 16})`}>
                                {d.periodLabel}
                              </text>
                            ))}
                            {/* Dots with hover */}
                            {histData.map((d, i) => {
                              const cx = xAt(i), cy = yAt(d.rating), dc = dotC(d.rating);
                              const isLast = i === n - 1;
                              const isHov = cvorHoveredPull?.chart === 'rating' && cvorHoveredPull?.idx === i;
                              return (
                                <g key={i}>
                                  {isLast && <circle cx={cx} cy={cy} r={9} fill={dc} opacity="0.12"/>}
                                  {isHov  && <circle cx={cx} cy={cy} r={9} fill={dc} opacity="0.20"/>}
                                  {/* Transparent hit area */}
                                  <circle cx={cx} cy={cy} r={12} fill="transparent"
                                    onMouseEnter={() => setCvorHoveredPull({ chart:'rating', idx:i })}
                                    onMouseLeave={() => setCvorHoveredPull(null)}/>
                                  {/* Visible dot */}
                                  <circle cx={cx} cy={cy} r={isLast || isHov ? 6 : 4} fill={dc} stroke="white" strokeWidth="2" style={{ pointerEvents:'none' }}/>
                                  {/* Value label: always show on last, or when hovered */}
                                  {(isLast || isHov) && (
                                    <text x={cx} y={cy - 11} textAnchor="middle" fontSize={isLast ? 10 : 9} fontWeight="bold" fill={dc} fontFamily="monospace" style={{ pointerEvents:'none' }}>
                                      {d.rating.toFixed(2)}%
                                    </text>
                                  )}
                                  {/* Tooltip */}
                                  {isHov && <SvgTooltip cx={cx} cy={cy} svgWidth={svgW} d={d} chartId="rating"/>}
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* ══ Chart 2 + 3 side-by-side ══ */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Chart 2: Category Contributions */}
                        {(() => {
                          const svgW2 = Math.max(340, n * 64 + pL + pR);
                          const cW2 = svgW2 - pL - pR;
                          const xA2 = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW2 : cW2 / 2);
                          const maxC2 = Math.ceil(Math.max(...histData.map(d => Math.max(d.colContrib, d.conContrib, d.insContrib))) + 1);
                          const yA2 = (v: number) => pT + (svH2 - pT - pB) - ((v / maxC2) * (svH2 - pT - pB));
                          const mkL2 = (vals: number[]) =>
                            vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xA2(i).toFixed(1)},${yA2(v).toFixed(1)}`).join(' ');
                          const lines2 = [
                            { key:'col', vals: histData.map(d=>d.colContrib), stroke:'#3b82f6', label:'Collisions (40%)' },
                            { key:'con', vals: histData.map(d=>d.conContrib), stroke:'#f59e0b', label:'Convictions (40%)' },
                            { key:'ins', vals: histData.map(d=>d.insContrib), stroke:'#ef4444', label:'Inspections (20%)' },
                          ];
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Category Contributions</span>
                                {lines2.map(l => (
                                  <div key={l.key} className="flex items-center gap-1.5">
                                    <div className="w-5 h-0.5 rounded" style={{ background: l.stroke }}/>
                                    <span className="text-[10px] text-slate-500">{l.label}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="overflow-x-auto rounded-lg border border-slate-100">
                                <svg viewBox={`0 0 ${svgW2} ${svH2}`} style={{ width:'100%', minWidth:`${Math.min(svgW2, 380)}px`, height:`${svH2}px`, overflow:'visible' }}>
                                  {[0,2,4,6,8,10].filter(v => v <= maxC2).map(v => (
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW2} y1={yA2(v)} y2={yA2(v)} stroke="#f1f5f9" strokeWidth="1"/>
                                      <text x={pL-7} y={yA2(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  {lines2.map(l => (
                                    <path key={l.key} d={mkL2(l.vals)} fill="none" stroke={l.stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                                  ))}
                                  {/* X labels */}
                                  {histData.map((d, i) => (
                                    <text key={i} x={xA2(i)} y={pT + (svH2-pT-pB) + 14}
                                      textAnchor="end" fontSize="9.5" fill="#475569" fontFamily="monospace"
                                      transform={`rotate(-40,${xA2(i)},${pT+(svH2-pT-pB)+14})`}>
                                      {d.periodLabel}
                                    </text>
                                  ))}
                                  {/* Dots with hover */}
                                  {lines2.map(l => histData.map((d, i) => {
                                    const val = l.key === 'col' ? d.colContrib : l.key === 'con' ? d.conContrib : d.insContrib;
                                    const cx2 = xA2(i), cy2 = yA2(val);
                                    const isHov = cvorHoveredPull?.chart === `cat-${l.key}` && cvorHoveredPull?.idx === i;
                                    return (
                                      <g key={`${l.key}-${i}`}>
                                        <circle cx={cx2} cy={cy2} r={12} fill="transparent"
                                          onMouseEnter={() => setCvorHoveredPull({ chart:`cat-${l.key}`, idx:i })}
                                          onMouseLeave={() => setCvorHoveredPull(null)}/>
                                        <circle cx={cx2} cy={cy2} r={isHov ? 5 : 3.5} fill={l.stroke} stroke="white" strokeWidth="1.5" style={{ pointerEvents:'none' }}/>
                                        {isHov && (
                                          <g style={{ pointerEvents:'none' }}>
                                            <rect x={cx2+(cx2>svgW2*0.65?-(100+8):8)} y={cy2-28} width={100} height={46} rx={5} fill="#0f172a"/>
                                            <rect x={cx2+(cx2>svgW2*0.65?-(100+8):8)} y={cy2-28} width={100} height={46} rx={5} fill="none" stroke="#334155" strokeWidth="0.5"/>
                                            <text x={cx2+(cx2>svgW2*0.65?-(54):58)} y={cy2-14} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                                            <text x={cx2+(cx2>svgW2*0.65?-(54):58)} y={cy2+2}  textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">{l.label.split(' (')[0]}</text>
                                            <text x={cx2+(cx2>svgW2*0.65?-(54):58)} y={cy2+14} textAnchor="middle" fontSize="10" fontWeight="bold" fill={l.stroke} fontFamily="monospace">{val.toFixed(2)}%</text>
                                          </g>
                                        )}
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
                          const oosD = histData.filter(d => d.oosOverall > 0);
                          const no = oosD.length;
                          const svgW3 = Math.max(340, no * 64 + pL + pR);
                          const cW3 = svgW3 - pL - pR;
                          const xA3 = (i: number) => pL + (no > 1 ? (i / (no - 1)) * cW3 : cW3 / 2);
                          const yA3 = (v: number) => pT + (svH2-pT-pB) - ((v / 55) * (svH2-pT-pB));
                          const mkO = (vals: number[]) =>
                            vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xA3(i).toFixed(1)},${yA3(v).toFixed(1)}`).join(' ');
                          const oosLines = [
                            { key:'ov', vals: oosD.map(d=>d.oosOverall), stroke:'#6366f1', label:'Overall' },
                            { key:'vh', vals: oosD.map(d=>d.oosVehicle), stroke:'#ef4444', label:'Vehicle' },
                            { key:'dr', vals: oosD.map(d=>d.oosDriver),  stroke:'#10b981', label:'Driver' },
                          ];
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-3 flex-wrap">
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">OOS Rates</span>
                                {oosLines.map(l => (
                                  <div key={l.key} className="flex items-center gap-1.5">
                                    <div className="w-5 h-0.5 rounded" style={{ background: l.stroke }}/>
                                    <span className="text-[10px] text-slate-500">{l.label}</span>
                                  </div>
                                ))}
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 border-t border-dashed border-slate-400"/>
                                  <span className="text-[10px] text-slate-400">20% threshold</span>
                                </div>
                              </div>
                              {no < 2 ? (
                                <div className="text-xs text-slate-400 p-4 border border-slate-100 rounded-lg">No OOS data for this period.</div>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-100">
                                  <svg viewBox={`0 0 ${svgW3} ${svH2}`} style={{ width:'100%', minWidth:`${Math.min(svgW3, 380)}px`, height:`${svH2}px`, overflow:'visible' }}>
                                    {[0,10,20,30,40,50].map(v => (
                                      <g key={v}>
                                        <line x1={pL} x2={pL+cW3} y1={yA3(v)} y2={yA3(v)} stroke="#f1f5f9" strokeWidth="1"/>
                                        <text x={pL-7} y={yA3(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                      </g>
                                    ))}
                                    <line x1={pL} x2={pL+cW3} y1={yA3(20)} y2={yA3(20)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="4,3" opacity="0.7"/>
                                    <text x={pL+cW3+4} y={yA3(20)+3.5} fontSize="8.5" fill="#94a3b8">20%</text>
                                    {oosLines.map(l => (
                                      <path key={l.key} d={mkO(l.vals)} fill="none" stroke={l.stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                                    ))}
                                    {/* X labels */}
                                    {oosD.map((d, i) => (
                                      <text key={i} x={xA3(i)} y={pT + (svH2-pT-pB) + 14}
                                        textAnchor="end" fontSize="9.5" fill="#475569" fontFamily="monospace"
                                        transform={`rotate(-40,${xA3(i)},${pT+(svH2-pT-pB)+14})`}>
                                        {d.periodLabel}
                                      </text>
                                    ))}
                                    {/* Dots with hover */}
                                    {oosLines.map(l => oosD.map((d, i) => {
                                      const val = l.key === 'ov' ? d.oosOverall : l.key === 'vh' ? d.oosVehicle : d.oosDriver;
                                      const cx3 = xA3(i), cy3 = yA3(val);
                                      const isHov = cvorHoveredPull?.chart === `oos-${l.key}` && cvorHoveredPull?.idx === i;
                                      return (
                                        <g key={`${l.key}-${i}`}>
                                          <circle cx={cx3} cy={cy3} r={12} fill="transparent"
                                            onMouseEnter={() => setCvorHoveredPull({ chart:`oos-${l.key}`, idx:i })}
                                            onMouseLeave={() => setCvorHoveredPull(null)}/>
                                          <circle cx={cx3} cy={cy3} r={isHov ? 5 : 3.5} fill={l.stroke} stroke="white" strokeWidth="1.5" style={{ pointerEvents:'none' }}/>
                                          {isHov && (
                                            <g style={{ pointerEvents:'none' }}>
                                              <rect x={cx3+(cx3>svgW3*0.65?-(108+8):8)} y={cy3-28} width={108} height={46} rx={5} fill="#0f172a"/>
                                              <rect x={cx3+(cx3>svgW3*0.65?-(108+8):8)} y={cy3-28} width={108} height={46} rx={5} fill="none" stroke="#334155" strokeWidth="0.5"/>
                                              <text x={cx3+(cx3>svgW3*0.65?-58:62)} y={cy3-14} textAnchor="middle" fontSize="9" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                                              <text x={cx3+(cx3>svgW3*0.65?-58:62)} y={cy3+2}  textAnchor="middle" fontSize="8" fill="#94a3b8" fontFamily="sans-serif">OOS {l.label}</text>
                                              <text x={cx3+(cx3>svgW3*0.65?-58:62)} y={cy3+14} textAnchor="middle" fontSize="10" fontWeight="bold" fill={l.stroke} fontFamily="monospace">{val.toFixed(1)}%</text>
                                            </g>
                                          )}
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

                      {/* ══ Chart 4: Collision & Conviction Events + Points ══ */}
                      {(() => {
                        const svgW4 = Math.max(700, n * 64 + pL + pR);
                        const cW4 = svgW4 - pL - pR;
                        const xA4 = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW4 : cW4 / 2);
                        const maxE4 = Math.max(...histData.map(d => Math.max(d.collisionEvents, d.convictionEvents, 10)));
                        const maxP4 = Math.max(...histData.map(d => Math.max(d.totalCollisionPoints, d.convictionPoints, 10)));
                        const svH4 = 240, cH4 = svH4 - pT - pB;
                        const bw4 = Math.max(6, Math.min(18, cW4 / n * 0.2));
                        const yE4 = (v: number) => pT + cH4 - ((v / (maxE4 * 1.2)) * cH4);
                        const yP4 = (v: number) => pT + cH4 - ((v / (maxP4 * 1.2)) * cH4);
                        const mkP4 = (vals: number[], yFn: (v:number)=>number) =>
                          vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xA4(i).toFixed(1)},${yFn(v).toFixed(1)}`).join(' ');
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-3 flex-wrap">
                              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Event Counts &amp; Points</span>
                              {[
                                { label:'Collisions (bars)',  color:'#3b82f6', rect:true },
                                { label:'Convictions (bars)', color:'#f59e0b', rect:true },
                                { label:'Col Points',         color:'#6366f1', rect:false },
                                { label:'Conv Points',        color:'#ec4899', rect:false },
                              ].map(l => (
                                <div key={l.label} className="flex items-center gap-1.5">
                                  {l.rect
                                    ? <div className="w-3 h-3 rounded-sm border" style={{ background: l.color+'33', borderColor: l.color }}/>
                                    : <div className="w-5 border-t border-dashed" style={{ borderColor: l.color }}/>
                                  }
                                  <span className="text-[10px] text-slate-500">{l.label}</span>
                                </div>
                              ))}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-slate-100">
                              <svg viewBox={`0 0 ${svgW4} ${svH4}`} style={{ width:'100%', minWidth:`${Math.min(svgW4, 720)}px`, height:`${svH4}px`, overflow:'visible' }}>
                                {[0,5,10,15,20,25,30,35,40].filter(v => v <= maxE4 * 1.2).map(v => (
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW4} y1={yE4(v)} y2={yE4(v)} stroke="#f1f5f9" strokeWidth="0.75"/>
                                    <text x={pL-7} y={yE4(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}</text>
                                  </g>
                                ))}
                                {/* Collision + conviction bars */}
                                {histData.map((d, i) => {
                                  const cx4 = xA4(i);
                                  const isHov = cvorHoveredPull?.chart === 'events' && cvorHoveredPull?.idx === i;
                                  return (
                                    <g key={i}
                                      onMouseEnter={() => setCvorHoveredPull({ chart:'events', idx:i })}
                                      onMouseLeave={() => setCvorHoveredPull(null)}>
                                      {/* Col bar */}
                                      <rect x={cx4 - bw4 * 1.1} y={yE4(d.collisionEvents)} width={bw4} height={pT + cH4 - yE4(d.collisionEvents)} fill={isHov ? '#3b82f6' : '#3b82f633'} stroke="#3b82f6" strokeWidth="1" rx="1.5"/>
                                      {/* Conv bar */}
                                      <rect x={cx4 + 0.1}        y={yE4(d.convictionEvents)} width={bw4} height={pT + cH4 - yE4(d.convictionEvents)} fill={isHov ? '#f59e0b' : '#f59e0b33'} stroke="#f59e0b" strokeWidth="1" rx="1.5"/>
                                      {/* Value labels */}
                                      <text x={cx4 - bw4 * 0.6} y={yE4(d.collisionEvents) - 3}  textAnchor="middle" fontSize="8.5" fill="#3b82f6" fontFamily="monospace">{d.collisionEvents}</text>
                                      <text x={cx4 + bw4 * 0.6} y={yE4(d.convictionEvents) - 3} textAnchor="middle" fontSize="8.5" fill="#f59e0b" fontFamily="monospace">{d.convictionEvents}</text>
                                      {/* Tooltip */}
                                      {isHov && (
                                        <g style={{ pointerEvents:'none' }}>
                                          {(() => {
                                            const tw=160, th=90;
                                            const tx4 = cx4 + (cx4 > svgW4*0.65 ? -(tw+10) : 10);
                                            const ty4 = pT;
                                            return (
                                              <>
                                                <rect x={tx4} y={ty4} width={tw} height={th} rx={6} fill="#0f172a"/>
                                                <rect x={tx4} y={ty4} width={tw} height={th} rx={6} fill="none" stroke="#334155" strokeWidth="0.75"/>
                                                <text x={tx4+tw/2} y={ty4+15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                                                <line x1={tx4+8} x2={tx4+tw-8} y1={ty4+20} y2={ty4+20} stroke="#1e293b" strokeWidth="0.75"/>
                                                {[
                                                  { lbl:'Collisions',    val: String(d.collisionEvents),  color:'#60a5fa' },
                                                  { lbl:'Convictions',   val: String(d.convictionEvents), color:'#fbbf24' },
                                                  { lbl:'Col Points',    val: String(d.totalCollisionPoints), color:'#818cf8' },
                                                  { lbl:'Conv Points',   val: String(d.convictionPoints), color:'#f472b6' },
                                                ].map((row, ri) => (
                                                  <g key={ri}>
                                                    <text x={tx4+10}    y={ty4+33+ri*13} fontSize="8.5" fill="#94a3b8" fontFamily="sans-serif">{row.lbl}</text>
                                                    <text x={tx4+tw-10} y={ty4+33+ri*13} textAnchor="end" fontSize="8.5" fontWeight="bold" fill={row.color} fontFamily="monospace">{row.val}</text>
                                                  </g>
                                                ))}
                                              </>
                                            );
                                          })()}
                                        </g>
                                      )}
                                    </g>
                                  );
                                })}
                                {/* Points lines (dashed) */}
                                <path d={mkP4(histData.map(d=>d.totalCollisionPoints), yP4)} fill="none" stroke="#6366f1" strokeWidth="1.75" strokeDasharray="4,2.5" opacity="0.75"/>
                                <path d={mkP4(histData.map(d=>d.convictionPoints), yP4)}      fill="none" stroke="#ec4899" strokeWidth="1.75" strokeDasharray="4,2.5" opacity="0.75"/>
                                {/* X labels */}
                                {histData.map((d, i) => (
                                  <text key={i} x={xA4(i)} y={pT + cH4 + 16}
                                    textAnchor="end" fontSize="9.5" fill="#475569" fontFamily="monospace"
                                    transform={`rotate(-40,${xA4(i)},${pT + cH4 + 16})`}>
                                    {d.periodLabel}
                                  </text>
                                ))}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ Data Table ══ */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pull-by-Pull Data</span>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">{n} pulls · most recent first · each covers a 24-month rolling window</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-[11px] border-collapse min-w-[1000px]">
                            <thead>
                              <tr className="bg-slate-50">
                                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">Pull Date</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">Rating %</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-blue-500 border-b border-slate-200 whitespace-nowrap">Col%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-amber-500 border-b border-slate-200 whitespace-nowrap">Con%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-500 border-b border-slate-200 whitespace-nowrap">Ins%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">#Col</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">#Conv</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-indigo-500 border-b border-slate-200 whitespace-nowrap">Col Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-pink-500 border-b border-slate-200 whitespace-nowrap">Conv Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-indigo-500 border-b border-slate-200 whitespace-nowrap">OOS Ov</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-500 border-b border-slate-200 whitespace-nowrap">OOS Veh</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-emerald-500 border-b border-slate-200 whitespace-nowrap">OOS Drv</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">Trucks</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">ON Mi</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">CA Mi</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-500 border-b border-slate-200 whitespace-nowrap">Total Mi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...histData].reverse().map((d, i) => {
                                const ratingBg =
                                  d.rating >= cvorThresholds.showCause    ? 'bg-red-50' :
                                  d.rating >= cvorThresholds.intervention  ? 'bg-amber-50' :
                                  d.rating >= cvorThresholds.warning       ? 'bg-yellow-50/60' : '';
                                const ratingTxt =
                                  d.rating >= cvorThresholds.showCause    ? 'text-red-700 font-bold' :
                                  d.rating >= cvorThresholds.intervention  ? 'text-amber-700 font-bold' :
                                  d.rating >= cvorThresholds.warning       ? 'text-yellow-700 font-semibold' : 'text-emerald-700';
                                const isLatest = i === 0;
                                const fmt = (v: number) => (v / 1_000_000).toFixed(2) + 'M';
                                return (
                                  <tr key={i} className={`border-b border-slate-100 transition-colors ${isLatest ? 'bg-blue-50' : ratingBg || 'hover:bg-slate-50'}`}>
                                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                                      {isLatest && <span className="inline-flex text-[9px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded mr-1.5">LATEST</span>}
                                      {d.periodLabel}
                                    </td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${ratingTxt}`}>{d.rating.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-blue-600 whitespace-nowrap">{d.colContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-amber-600 whitespace-nowrap">{d.conContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">{d.insContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{d.collisionEvents}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-600 whitespace-nowrap">{d.convictionEvents}</td>
                                    <td className="px-2 py-2 text-right font-mono text-indigo-600 whitespace-nowrap">{d.totalCollisionPoints || '—'}</td>
                                    <td className="px-2 py-2 text-right font-mono text-pink-600 whitespace-nowrap">{d.convictionPoints}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosOverall > 20 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>{d.oosOverall > 0 ? `${d.oosOverall.toFixed(1)}%` : '—'}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosVehicle > 20 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>{d.oosVehicle > 0 ? `${d.oosVehicle.toFixed(1)}%` : '—'}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosDriver > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{d.oosDriver > 0 ? `${d.oosDriver.toFixed(1)}%` : '—'}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{d.trucks}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{fmt(d.onMiles)}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{fmt(d.canadaMiles)}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{fmt(d.totalMiles)}</td>
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

print(f"Step 2: Replacing chart block lines {chart_start+1}–{chart_end}")
lines2_new = lines2[:chart_start] + [CHART_JSX + '\n'] + lines2[chart_end:]
with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines2_new)

print(f"Step 2: Done. Lines: {len(lines2_new)}")
print("Done.")
