#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CVOR chart v3 — full-width, gaps for missing pulls, rich hover tooltips, date-range labels"""

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

                // date range info
                const firstPull = histData[0];
                const lastPull  = histData[n - 1];
                const rangeMonths = Math.round(
                  (new Date(lastPull.reportDate).getTime() - new Date(firstPull.reportDate).getTime()) / (1000*60*60*24*30.44)
                );

                // ── SVG helpers (full-width: fixed 1200-unit viewBox) ─────────
                const VW = 1200, pL = 54, pR = 30, pT = 22, pB = 52;
                const cW = VW - pL - pR;

                const xAt = (i: number, total = n) =>
                  pL + (total > 1 ? (i / (total - 1)) * cW : cW / 2);

                const yAt = (v: number, max: number, min: number, chartH: number) =>
                  pT + chartH - ((v - min) / (max - min)) * chartH;

                // Line path — M on gap (>60 days for monthly, >100 for quarterly)
                const gapDays = cvorPeriod === 'Monthly' ? 60 : cvorPeriod === 'Quarterly' ? 100 : 250;
                const mkLine = (
                  items: typeof histData,
                  getVal: (d: typeof histData[0]) => number,
                  max: number, min: number, chartH: number,
                  total = n
                ) => items.map((d, i) => {
                  const x = xAt(i, total).toFixed(1);
                  const y = yAt(getVal(d), max, min, chartH).toFixed(1);
                  if (i === 0) return `M${x},${y}`;
                  const gap = (new Date(d.reportDate).getTime() - new Date(items[i-1].reportDate).getTime()) / 86400000;
                  return `${gap > gapDays ? 'M' : 'L'}${x},${y}`;
                }).join(' ');

                const mkArea = (
                  items: typeof histData,
                  getVal: (d: typeof histData[0]) => number,
                  max: number, min: number, chartH: number
                ) => {
                  const line = mkLine(items, getVal, max, min, chartH);
                  return `${line} L${xAt(n-1).toFixed(1)},${(pT+chartH).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+chartH).toFixed(1)}Z`;
                };

                const dotColor = (r: number) =>
                  r >= cvorThresholds.showCause   ? '#ef4444' :
                  r >= cvorThresholds.intervention ? '#f97316' :
                  r >= cvorThresholds.warning      ? '#ca8a04' : '#16a34a';

                // ── Rich SVG tooltip ──────────────────────────────────────────
                const Tip = ({
                  cx, cy, d, rows, title
                }: {
                  cx: number; cy: number;
                  d: typeof histData[0];
                  title: string;
                  rows: Array<{ label: string; val: string; color: string }>;
                }) => {
                  const tw = 162, pad = 8;
                  const th = 36 + rows.length * 14;
                  // auto-flip left when near right edge of 1200-unit viewBox
                  const tx = cx > VW * 0.62 ? cx - tw - pad : cx + pad;
                  const ty = Math.max(pT + 2, cy - th / 2);
                  return (
                    <g style={{ pointerEvents:'none' }}>
                      <rect x={tx+2} y={ty+2} width={tw} height={th} rx={6} fill="#000" opacity="0.18"/>
                      <rect x={tx}   y={ty}   width={tw} height={th} rx={6} fill="#0f172a"/>
                      <rect x={tx}   y={ty}   width={tw} height={th} rx={6} fill="none" stroke="#334155" strokeWidth="0.7"/>
                      <text x={tx+tw/2} y={ty+13} textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                      <text x={tx+tw/2} y={ty+23} textAnchor="middle" fontSize="7.5" fill="#64748b">24-mo window ending this pull</text>
                      <line x1={tx+8} x2={tx+tw-8} y1={ty+28} y2={ty+28} stroke="#1e293b" strokeWidth="0.7"/>
                      {rows.map((r, ri) => (
                        <g key={ri}>
                          <text x={tx+10} y={ty+38+ri*14} fontSize="8.5" fill="#94a3b8" fontFamily="sans-serif">{r.label}</text>
                          <text x={tx+tw-10} y={ty+38+ri*14} textAnchor="end" fontSize="8.5" fontWeight="600" fill={r.color} fontFamily="monospace">{r.val}</text>
                        </g>
                      ))}
                    </g>
                  );
                };

                // ── Shared X-axis labels ──────────────────────────────────────
                const XAxis = ({ items, chartH, total }: { items: typeof histData; chartH: number; total?: number }) => (
                  <>
                    {items.map((d, i) => {
                      const x = xAt(i, total ?? items.length);
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

                // ── Y-axis gridlines ──────────────────────────────────────────
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
                        <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded">{firstPull.periodLabel} → {lastPull.periodLabel} · {rangeMonths} months</span>
                        <span className="text-[10px] text-slate-400 italic">Each pull = 24-month rolling window</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pull cadence</span>
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

                    <div className="p-5 space-y-8">

                      {/* ══ CHART 1: Overall CVOR Rating ══ */}
                      {(() => {
                        const CH = 240;
                        const VH = CH + pT + pB;
                        const rMin = 0, rMax = 40;
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Overall CVOR Rating</span>
                              {[
                                { lbl:'Safe  <35%',       bg:'#d1fae5', txt:'#166534' },
                                { lbl:'Warning 35–50%',   bg:'#fef9c3', txt:'#854d0e' },
                                { lbl:'Audit 50–75%',     bg:'#fef3c7', txt:'#92400e' },
                                { lbl:'Show Cause 75%+',  bg:'#fee2e2', txt:'#991b1b' },
                              ].map(z => (
                                <div key={z.lbl} className="flex items-center gap-1.5">
                                  <div className="w-3 h-2.5 rounded-sm" style={{ background: z.bg, border: `1px solid ${z.txt}33` }}/>
                                  <span className="text-[9.5px] font-mono" style={{ color: z.txt }}>{z.lbl}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9.5px] text-slate-400 italic">Hover dot for full pull details · gap = no pull that period</span>
                            </div>
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width:'100%', height:`${VH}px`, display:'block' }}>
                                {/* Zone bands */}
                                {[
                                  { from:cvorThresholds.showCause,    to:rMax, fill:'#fecaca' },
                                  { from:cvorThresholds.intervention,  to:cvorThresholds.showCause, fill:'#fde68a' },
                                  { from:cvorThresholds.warning,       to:cvorThresholds.intervention, fill:'#fef08a' },
                                  { from:rMin, to:cvorThresholds.warning, fill:'#bbf7d0' },
                                ].map(z => (
                                  <rect key={z.from}
                                    x={pL} y={yAt(Math.min(z.to, rMax), rMax, rMin, CH)}
                                    width={cW}
                                    height={yAt(z.from, rMax, rMin, CH) - yAt(Math.min(z.to, rMax), rMax, rMin, CH)}
                                    fill={z.fill} opacity="0.45"/>
                                ))}
                                <YGrid ticks={[0,5,10,15,20,25,30,35,40]} max={rMax} min={rMin} chartH={CH}/>
                                {/* Threshold lines */}
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
                                <path d={mkArea(histData, d=>d.rating, rMax, rMin, CH)} fill="#f59e0b" opacity="0.06"/>
                                {/* Line */}
                                <path d={mkLine(histData, d=>d.rating, rMax, rMin, CH)} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                                <XAxis items={histData} chartH={CH}/>
                                {/* Dots */}
                                {histData.map((d, i) => {
                                  const cx = xAt(i), cy = yAt(d.rating, rMax, rMin, CH), dc = dotColor(d.rating);
                                  const isLast = i === n - 1;
                                  const isHov = cvorHoveredPull?.chart === 'r' && cvorHoveredPull?.idx === i;
                                  return (
                                    <g key={i}>
                                      {(isLast || isHov) && <circle cx={cx} cy={cy} r={10} fill={dc} opacity="0.15"/>}
                                      <circle cx={cx} cy={cy} r={14} fill="transparent"
                                        onMouseEnter={() => setCvorHoveredPull({ chart:'r', idx:i })}
                                        onMouseLeave={() => setCvorHoveredPull(null)}/>
                                      <circle cx={cx} cy={cy} r={isLast || isHov ? 6 : 4} fill={dc} stroke="white" strokeWidth="2" style={{ pointerEvents:'none' }}/>
                                      {/* Always show label on latest; show on hover */}
                                      {(isLast || isHov) && (
                                        <text x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="bold" fill={dc} fontFamily="monospace" style={{ pointerEvents:'none' }}>
                                          {d.rating.toFixed(2)}%
                                        </text>
                                      )}
                                      {isHov && (
                                        <Tip cx={cx} cy={cy} d={d} title="Rating" rows={[
                                          { label:'Overall Rating',  val:`${d.rating.toFixed(2)}%`,      color: dc },
                                          { label:'Collisions (40%)',val:`${d.colContrib.toFixed(2)}%`,  color:'#60a5fa' },
                                          { label:'Convictions (40%)',val:`${d.conContrib.toFixed(2)}%`, color:'#fbbf24' },
                                          { label:'Inspections (20%)',val:`${d.insContrib.toFixed(2)}%`, color:'#f87171' },
                                          { label:'OOS Overall',     val: d.oosOverall > 0 ? `${d.oosOverall.toFixed(1)}%` : '—', color: d.oosOverall > 20 ? '#ef4444' : '#94a3b8' },
                                          { label:'# Col / Conv',    val:`${d.collisionEvents} / ${d.convictionEvents}`, color:'#94a3b8' },
                                        ]}/>
                                      )}
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ CHART 2 + 3: side-by-side ══ */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {/* Chart 2: Category Contributions */}
                        {(() => {
                          const CH2 = 190;
                          const VH2 = CH2 + pT + pB;
                          const VW2 = 580;
                          const cW2 = VW2 - pL - pR;
                          const x2 = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW2 : cW2 / 2);
                          const maxCat = Math.ceil(Math.max(...histData.map(d => Math.max(d.colContrib, d.conContrib, d.insContrib))) + 0.5);
                          const y2 = (v: number) => yAt(v, maxCat, 0, CH2);
                          const mkL2 = (vals: number[]) => vals.map((v, i) => {
                            const xv = x2(i).toFixed(1), yv = y2(v).toFixed(1);
                            if (i === 0) return `M${xv},${yv}`;
                            const gap = (new Date(histData[i].reportDate).getTime() - new Date(histData[i-1].reportDate).getTime()) / 86400000;
                            return `${gap > gapDays ? 'M' : 'L'}${xv},${yv}`;
                          }).join(' ');
                          const cats = [
                            { key:'col', label:'Collisions (40%)', vals: histData.map(d=>d.colContrib), color:'#3b82f6' },
                            { key:'con', label:'Convictions (40%)', vals: histData.map(d=>d.conContrib), color:'#d97706' },
                            { key:'ins', label:'Inspections (20%)', vals: histData.map(d=>d.insContrib), color:'#dc2626' },
                          ];
                          return (
                            <div>
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Category Contributions</span>
                                {cats.map(c => (
                                  <div key={c.key} className="flex items-center gap-1.5">
                                    <div className="w-5 border-t-2 rounded" style={{ borderColor: c.color }}/>
                                    <span className="text-[9.5px] text-slate-500">{c.label}</span>
                                  </div>
                                ))}
                              </div>
                              <div className="w-full">
                                <svg viewBox={`0 0 ${VW2} ${VH2}`} style={{ width:'100%', height:`${VH2}px`, display:'block' }}>
                                  {[0,2,4,6,8].filter(v=>v<=maxCat).map(v=>(
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW2} y1={y2(v)} y2={y2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                      <text x={pL-7} y={y2(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  {cats.map(c=>(
                                    <path key={c.key} d={mkL2(c.vals)} fill="none" stroke={c.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                                  ))}
                                  {histData.map((d,i)=>(
                                    <text key={i} x={x2(i)} y={pT+CH2+14}
                                      textAnchor="end" fontSize="8.5" fill="#475569" fontFamily="monospace"
                                      transform={`rotate(-38,${x2(i)},${pT+CH2+14})`}>
                                      {d.periodLabel}
                                    </text>
                                  ))}
                                  {cats.map(c=>histData.map((d,i)=>{
                                    const val = c.key==='col'?d.colContrib:c.key==='con'?d.conContrib:d.insContrib;
                                    const cx2=x2(i), cy2=y2(val);
                                    const isHov = cvorHoveredPull?.chart===`c-${c.key}` && cvorHoveredPull?.idx===i;
                                    return (
                                      <g key={`${c.key}-${i}`}>
                                        <circle cx={cx2} cy={cy2} r={14} fill="transparent"
                                          onMouseEnter={()=>setCvorHoveredPull({chart:`c-${c.key}`,idx:i})}
                                          onMouseLeave={()=>setCvorHoveredPull(null)}/>
                                        <circle cx={cx2} cy={cy2} r={isHov?5.5:3.5} fill={c.color} stroke="white" strokeWidth="1.5" style={{pointerEvents:'none'}}/>
                                        {isHov && (
                                          <Tip cx={cx2} cy={cy2} d={d} title={c.label} rows={[
                                            { label:c.label.split(' (')[0], val:`${val.toFixed(2)}%`, color:c.color },
                                            { label:'Overall Rating', val:`${d.rating.toFixed(2)}%`, color:dotColor(d.rating) },
                                          ]}/>
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
                          const CH3 = 190, VH3 = CH3 + pT + pB, VW3 = 580, cW3 = VW3 - pL - pR;
                          const x3 = (i: number) => pL + (no > 1 ? (i / (no - 1)) * cW3 : cW3 / 2);
                          const maxOos = Math.ceil(Math.max(...oosD.map(d=>Math.max(d.oosOverall,d.oosVehicle))) / 10) * 10 + 5;
                          const y3 = (v: number) => yAt(v, maxOos, 0, CH3);
                          const mkL3 = (vals: number[]) => vals.map((v,i)=>{
                            const xv=x3(i).toFixed(1), yv=y3(v).toFixed(1);
                            if(i===0) return `M${xv},${yv}`;
                            const gap=(new Date(oosD[i].reportDate).getTime()-new Date(oosD[i-1].reportDate).getTime())/86400000;
                            return `${gap>gapDays?'M':'L'}${xv},${yv}`;
                          }).join(' ');
                          const oosLines = [
                            { key:'ov', label:'Overall',  vals:oosD.map(d=>d.oosOverall), color:'#6366f1' },
                            { key:'vh', label:'Vehicle',  vals:oosD.map(d=>d.oosVehicle), color:'#ef4444' },
                            { key:'dr', label:'Driver',   vals:oosD.map(d=>d.oosDriver),  color:'#16a34a' },
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
                              {no < 2 ? (
                                <div className="h-32 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No OOS data for this selection</div>
                              ) : (
                                <div className="w-full">
                                  <svg viewBox={`0 0 ${VW3} ${VH3}`} style={{width:'100%',height:`${VH3}px`,display:'block'}}>
                                    {[0,10,20,30,40,50].filter(v=>v<=maxOos).map(v=>(
                                      <g key={v}>
                                        <line x1={pL} x2={pL+cW3} y1={y3(v)} y2={y3(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                        <text x={pL-7} y={y3(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                      </g>
                                    ))}
                                    {/* 20% threshold */}
                                    <line x1={pL} x2={pL+cW3} y1={y3(20)} y2={y3(20)} stroke="#94a3b8" strokeWidth="1" strokeDasharray="5,3" opacity="0.7"/>
                                    <text x={pL+cW3+4} y={y3(20)+3.5} fontSize="9" fill="#94a3b8">20%</text>
                                    {oosLines.map(l=>(
                                      <path key={l.key} d={mkL3(l.vals)} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                                    ))}
                                    {oosD.map((d,i)=>(
                                      <text key={i} x={x3(i)} y={pT+CH3+14}
                                        textAnchor="end" fontSize="8.5" fill="#475569" fontFamily="monospace"
                                        transform={`rotate(-38,${x3(i)},${pT+CH3+14})`}>
                                        {d.periodLabel}
                                      </text>
                                    ))}
                                    {oosLines.map(l=>oosD.map((d,i)=>{
                                      const val=l.key==='ov'?d.oosOverall:l.key==='vh'?d.oosVehicle:d.oosDriver;
                                      const cx3=x3(i), cy3=y3(val);
                                      const isHov=cvorHoveredPull?.chart===`o-${l.key}`&&cvorHoveredPull?.idx===i;
                                      return (
                                        <g key={`${l.key}-${i}`}>
                                          <circle cx={cx3} cy={cy3} r={14} fill="transparent"
                                            onMouseEnter={()=>setCvorHoveredPull({chart:`o-${l.key}`,idx:i})}
                                            onMouseLeave={()=>setCvorHoveredPull(null)}/>
                                          <circle cx={cx3} cy={cy3} r={isHov?5.5:3.5} fill={l.color} stroke="white" strokeWidth="1.5" style={{pointerEvents:'none'}}/>
                                          {isHov&&(
                                            <Tip cx={cx3} cy={cy3} d={d} title={`OOS ${l.label}`} rows={[
                                              { label:`OOS ${l.label}`, val:`${val.toFixed(1)}%`, color:l.color },
                                              { label:'OOS Overall',    val:`${d.oosOverall.toFixed(1)}%`, color:'#6366f1' },
                                              { label:'OOS Vehicle',    val:`${d.oosVehicle.toFixed(1)}%`, color:'#ef4444' },
                                              { label:'OOS Driver',     val:`${d.oosDriver.toFixed(1)}%`,  color:'#16a34a' },
                                            ]}/>
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

                      {/* ══ CHART 4: Events & Points ══ */}
                      {(() => {
                        const CH4 = 210, VH4 = CH4 + pT + pB;
                        const maxE = Math.max(...histData.map(d=>Math.max(d.collisionEvents,d.convictionEvents))) + 3;
                        const maxP = Math.max(...histData.map(d=>Math.max(d.totalCollisionPoints,d.convictionPoints)));
                        const yE = (v:number) => yAt(v, maxE, 0, CH4);
                        const yP = (v:number) => yAt(v, maxP * 1.1, 0, CH4);
                        const bw = Math.max(8, Math.min(22, cW / n * 0.22));
                        const mkPts = (vals:number[], yFn:(v:number)=>number) =>
                          vals.map((v,i)=>{
                            const xv=xAt(i).toFixed(1), yv=yFn(v).toFixed(1);
                            if(i===0) return `M${xv},${yv}`;
                            const gap=(new Date(histData[i].reportDate).getTime()-new Date(histData[i-1].reportDate).getTime())/86400000;
                            return `${gap>gapDays?'M':'L'}${xv},${yv}`;
                          }).join(' ');
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Event Counts &amp; Points</span>
                              {[
                                { lbl:'Collisions',   color:'#3b82f6', rect:true },
                                { lbl:'Convictions',  color:'#d97706', rect:true },
                                { lbl:'Col Points',   color:'#6366f1', rect:false },
                                { lbl:'Conv Points',  color:'#ec4899', rect:false },
                              ].map(l=>(
                                <div key={l.lbl} className="flex items-center gap-1.5">
                                  {l.rect
                                    ? <div className="w-3 h-3 rounded-sm border" style={{background:l.color+'22',borderColor:l.color}}/>
                                    : <div className="w-6 border-t border-dashed" style={{borderColor:l.color}}/>
                                  }
                                  <span className="text-[9.5px] text-slate-500">{l.lbl}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9px] text-slate-400 italic">bars = events · dashed = points (different scale)</span>
                            </div>
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:'100%',height:`${VH4}px`,display:'block'}}>
                                {[0,5,10,15,20,25,30].filter(v=>v<=maxE).map(v=>(
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                    <text x={pL-7} y={yE(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}</text>
                                  </g>
                                ))}
                                {/* Bars */}
                                {histData.map((d,i)=>{
                                  const cx4=xAt(i);
                                  const isHov=cvorHoveredPull?.chart==='ev'&&cvorHoveredPull?.idx===i;
                                  return (
                                    <g key={i}
                                      onMouseEnter={()=>setCvorHoveredPull({chart:'ev',idx:i})}
                                      onMouseLeave={()=>setCvorHoveredPull(null)}>
                                      {/* Collision bar */}
                                      <rect x={cx4-bw-1} y={yE(d.collisionEvents)} width={bw} height={pT+CH4-yE(d.collisionEvents)}
                                        fill={isHov?'#3b82f6':'#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2"/>
                                      {/* Conviction bar */}
                                      <rect x={cx4+1}   y={yE(d.convictionEvents)} width={bw} height={pT+CH4-yE(d.convictionEvents)}
                                        fill={isHov?'#f59e0b':'#f59e0b22'} stroke="#f59e0b" strokeWidth="1" rx="2"/>
                                      {/* Count labels */}
                                      <text x={cx4-bw/2} y={yE(d.collisionEvents)-4} textAnchor="middle" fontSize="9" fill="#1d4ed8" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.collisionEvents}</text>
                                      <text x={cx4+bw/2+1} y={yE(d.convictionEvents)-4} textAnchor="middle" fontSize="9" fill="#92400e" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.convictionEvents}</text>
                                      {isHov&&(
                                        <Tip cx={cx4} cy={yE(Math.max(d.collisionEvents,d.convictionEvents))-20} d={d} title="Events" rows={[
                                          { label:'Collisions',   val:String(d.collisionEvents), color:'#60a5fa' },
                                          { label:'Convictions',  val:String(d.convictionEvents),color:'#fbbf24' },
                                          { label:'Col Pts (w/)',  val:String(d.collWithPoints), color:'#818cf8' },
                                          { label:'Col Pts (w/o)', val:String(d.collWithoutPoints),color:'#a5b4fc' },
                                          { label:'Total Col Pts', val:String(d.totalCollisionPoints),color:'#6366f1' },
                                          { label:'Conv Points',  val:String(d.convictionPoints),color:'#f472b6' },
                                        ]}/>
                                      )}
                                    </g>
                                  );
                                })}
                                {/* Points lines (dashed) */}
                                <path d={mkPts(histData.map(d=>d.totalCollisionPoints),yP)} fill="none" stroke="#6366f1" strokeWidth="1.75" strokeDasharray="4,2.5" opacity="0.75"/>
                                <path d={mkPts(histData.map(d=>d.convictionPoints),yP)}      fill="none" stroke="#ec4899" strokeWidth="1.75" strokeDasharray="4,2.5" opacity="0.75"/>
                                <XAxis items={histData} chartH={CH4}/>
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ DATA TABLE ══ */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Pull-by-Pull Data</span>
                          <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls · newest first · each pull covers 24-month rolling window</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-[11px] border-collapse" style={{minWidth:'1100px'}}>
                            <thead>
                              <tr className="bg-slate-800 text-white">
                                <th className="text-left px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap rounded-tl-lg">Pull Date<br/><span className="text-[8.5px] font-normal text-slate-400">(24-mo window)</span></th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Rating %</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-blue-300 whitespace-nowrap">Col%<br/><span className="text-[8px] font-normal text-slate-400">(40% wt)</span></th>
                                <th className="text-right px-2 py-2.5 font-semibold text-amber-300 whitespace-nowrap">Con%<br/><span className="text-[8px] font-normal text-slate-400">(40% wt)</span></th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300 whitespace-nowrap">Ins%<br/><span className="text-[8px] font-normal text-slate-400">(20% wt)</span></th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-200 whitespace-nowrap"># Col</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-200 whitespace-nowrap"># Conv</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-indigo-300 whitespace-nowrap">Col Pts<br/><span className="text-[8px] font-normal text-slate-400">(total)</span></th>
                                <th className="text-right px-2 py-2.5 font-semibold text-pink-300 whitespace-nowrap">Conv Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-violet-300 whitespace-nowrap">OOS Ov%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300 whitespace-nowrap">OOS Veh%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-emerald-300 whitespace-nowrap">OOS Drv%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300 whitespace-nowrap">Trucks</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300 whitespace-nowrap rounded-tr-lg">Total Miles</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...histData].reverse().map((d, i) => {
                                const rZone =
                                  d.rating >= cvorThresholds.showCause   ? { bg:'bg-red-50',    txt:'text-red-700 font-bold',    badge:'bg-red-100 text-red-700' } :
                                  d.rating >= cvorThresholds.intervention ? { bg:'bg-amber-50',  txt:'text-amber-700 font-bold',  badge:'bg-amber-100 text-amber-700' } :
                                  d.rating >= cvorThresholds.warning      ? { bg:'bg-yellow-50', txt:'text-yellow-700 font-semibold', badge:'bg-yellow-100 text-yellow-700' } :
                                                                            { bg:'',             txt:'text-emerald-700',          badge:'bg-emerald-100 text-emerald-700' };
                                const isLatest = i === 0;
                                const rowBg = isLatest ? 'bg-blue-50 border-l-2 border-blue-500' : (i%2===0 ? 'bg-white' : 'bg-slate-50/60');
                                return (
                                  <tr key={i} className={`border-b border-slate-100 hover:bg-blue-50/40 transition-colors ${rowBg}`}>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {isLatest && <span className="text-[8px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">LATEST</span>}
                                        <span className="font-mono text-slate-700">{d.periodLabel}</span>
                                      </div>
                                    </td>
                                    <td className={`px-2 py-2 text-right whitespace-nowrap`}>
                                      <span className={`inline-block font-mono px-1.5 py-0.5 rounded text-xs ${rZone.badge}`}>{d.rating.toFixed(2)}%</span>
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-blue-600 whitespace-nowrap">{d.colContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-amber-600 whitespace-nowrap">{d.conContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-red-600 whitespace-nowrap">{d.insContrib.toFixed(2)}%</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-700 whitespace-nowrap">{d.collisionEvents}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-700 whitespace-nowrap">{d.convictionEvents}</td>
                                    <td className="px-2 py-2 text-right font-mono text-indigo-600 whitespace-nowrap">{d.totalCollisionPoints || '—'}</td>
                                    <td className="px-2 py-2 text-right font-mono text-pink-600 whitespace-nowrap">{d.convictionPoints}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosOverall > 20 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>{d.oosOverall > 0 ? `${d.oosOverall.toFixed(1)}%` : '—'}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosVehicle > 20 ? 'text-red-600 font-bold' : 'text-slate-600'}`}>{d.oosVehicle > 0 ? `${d.oosVehicle.toFixed(1)}%` : '—'}</td>
                                    <td className={`px-2 py-2 text-right font-mono whitespace-nowrap ${d.oosDriver > 5 ? 'text-amber-600 font-semibold' : 'text-emerald-600'}`}>{d.oosDriver > 0 ? `${d.oosDriver.toFixed(1)}%` : '—'}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{d.trucks}</td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-500 whitespace-nowrap">{(d.totalMiles/1_000_000).toFixed(2)}M</td>
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
    lines = f.readlines()

chart_start = next(i for i, l in enumerate(lines) if '{/* ── PERFORMANCE HISTORY CHARTS ── */}' in l)
chart_end   = next(i for i, l in enumerate(lines) if '{/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}' in l and i > chart_start + 5)

print(f"Replacing lines {chart_start+1}–{chart_end} ({chart_end - chart_start} lines)")
with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines[:chart_start] + [CHART_JSX + '\n'] + lines[chart_end:])
print(f"Done. New total: {chart_start + 1 + len(lines) - chart_end} lines approx")
