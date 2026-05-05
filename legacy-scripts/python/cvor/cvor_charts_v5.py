#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

CHART_JSX = r"""              {/* ── PERFORMANCE HISTORY CHARTS ── */}
              {(() => {
                // ─── Cadence filter ────────────────────────────────────────
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

                const firstPull = histData[0];
                const lastPull  = histData[n - 1];
                const rangeMonths = Math.round(
                  (new Date(lastPull.reportDate).getTime() - new Date(firstPull.reportDate).getTime()) / (1000*60*60*24*30.44)
                );

                // 24-month window for a pull
                const windowOf = (reportDate: string) => {
                  const end = new Date(reportDate);
                  const start = new Date(end);
                  start.setMonth(start.getMonth() - 24);
                  const fmt = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short', year: 'numeric' });
                  return { start, end, label: `${fmt(start)} → ${fmt(end)}` };
                };

                // ─── SVG layout (all charts: VW=1200 full-width) ──────────
                const VW = 1200, pL = 58, pR = 35, pT = 24, pB = 56;
                const cW = VW - pL - pR;

                const xAt = (i: number, total = n) =>
                  pL + (total > 1 ? (i / (total - 1)) * cW : cW / 2);

                const yAt = (v: number, max: number, min: number, chartH: number) =>
                  pT + chartH - ((v - min) / (max - min || 1)) * chartH;

                // Gap-aware path
                const gapDays = cvorPeriod === 'Monthly' ? 60 : cvorPeriod === 'Quarterly' ? 100 : 250;
                const mkPath = (
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

                const mkArea = (items: typeof histData, getVal: (d: typeof histData[0]) => number, max: number, min: number, chartH: number) => {
                  const line = mkPath(items, getVal, max, min, chartH);
                  return `${line} L${xAt(n-1).toFixed(1)},${(pT+chartH).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+chartH).toFixed(1)}Z`;
                };

                // Alert logic
                const alertLevel = (d: typeof histData[0]) => {
                  if (d.oosVehicle > 40 || d.rating >= cvorThresholds.intervention) return 'critical';
                  if (d.oosOverall > 30 || d.rating >= cvorThresholds.warning) return 'warning';
                  return 'ok';
                };
                const ratingColor = (r: number) =>
                  r >= cvorThresholds.showCause   ? '#dc2626' :
                  r >= cvorThresholds.intervention ? '#f97316' :
                  r >= cvorThresholds.warning      ? '#ca8a04' : '#16a34a';

                const selPull = cvorSelectedPull ? cvorPeriodicReports.find(d => d.reportDate === cvorSelectedPull) ?? null : null;

                // ─── Unified rich tooltip (works on every chart) ───────────
                const Tip = ({
                  cx, cy, d, focusMetric
                }: {
                  cx: number; cy: number;
                  d: typeof histData[0];
                  focusMetric: string;
                }) => {
                  const win = windowOf(d.reportDate);
                  const rc = ratingColor(d.rating);
                  const al = alertLevel(d);
                  const tw = 185, baseH = 56;
                  const rows: Array<{ label: string; val: string; color: string; bold?: boolean }> = [
                    { label: 'CVOR Rating',     val: `${d.rating.toFixed(2)}%`,      color: rc,       bold: focusMetric==='rating' },
                    { label: 'Collisions',       val: `${d.colContrib.toFixed(2)}%`,  color: '#3b82f6',bold: focusMetric==='col' },
                    { label: 'Convictions',      val: `${d.conContrib.toFixed(2)}%`,  color: '#d97706',bold: focusMetric==='con' },
                    { label: 'Inspections',      val: `${d.insContrib.toFixed(2)}%`,  color: '#dc2626',bold: focusMetric==='ins' },
                    { label: 'OOS Overall',      val: d.oosOverall>0?`${d.oosOverall.toFixed(1)}%`:'—', color: d.oosOverall>20?'#ef4444':'#94a3b8', bold: focusMetric==='oosOv' },
                    { label: 'OOS Vehicle',      val: d.oosVehicle>0?`${d.oosVehicle.toFixed(1)}%`:'—', color: d.oosVehicle>20?'#ef4444':'#94a3b8', bold: focusMetric==='oosVh' },
                    { label: 'OOS Driver',       val: d.oosDriver>0?`${d.oosDriver.toFixed(1)}%`:'—',  color: d.oosDriver>5?'#f59e0b':'#10b981',   bold: focusMetric==='oosDr' },
                    { label: '# Col / Conv',     val: `${d.collisionEvents} / ${d.convictionEvents}`,  color: '#94a3b8', bold: focusMetric==='events' },
                    { label: 'Col Pts / Conv Pts',val:`${d.totalCollisionPoints} / ${d.convictionPoints}`, color: '#94a3b8' },
                  ];
                  const th = baseH + rows.length * 14 + 10;
                  const tx = cx > VW * 0.60 ? cx - tw - 10 : cx + 10;
                  const ty = Math.max(pT, Math.min(cy - th / 2, pT + 260 - th));
                  const alertColor = al === 'critical' ? '#dc2626' : al === 'warning' ? '#f59e0b' : '#16a34a';
                  const alertLabel = al === 'critical' ? '⚠ Critical' : al === 'warning' ? '⚡ Warning' : '✓ Healthy';
                  return (
                    <g style={{ pointerEvents:'none' }} className="z-50">
                      {/* Drop shadow */}
                      <rect x={tx+3} y={ty+3} width={tw} height={th} rx={8} fill="#000" opacity="0.20"/>
                      {/* Background */}
                      <rect x={tx} y={ty} width={tw} height={th} rx={8} fill="#0f172a"/>
                      <rect x={tx} y={ty} width={tw} height={th} rx={8} fill="none" stroke={alertColor} strokeWidth="1.2" opacity="0.7"/>
                      {/* Top: pull label + alert badge */}
                      <text x={tx+10} y={ty+15} fontSize="11" fontWeight="bold" fill="white" fontFamily="monospace">{d.periodLabel}</text>
                      <rect x={tx+tw-68} y={ty+5} width={60} height={14} rx={4} fill={alertColor} opacity="0.25"/>
                      <text x={tx+tw-38} y={ty+14.5} textAnchor="middle" fontSize="7.5" fontWeight="bold" fill={alertColor}>{alertLabel}</text>
                      {/* Window */}
                      <text x={tx+10} y={ty+26} fontSize="7.5" fill="#6366f1" fontFamily="monospace">{win.label}</text>
                      <text x={tx+10} y={ty+35} fontSize="7" fill="#475569">24-month rolling window</text>
                      <line x1={tx+8} x2={tx+tw-8} y1={ty+41} y2={ty+41} stroke="#1e293b" strokeWidth="0.8"/>
                      {/* Metric rows */}
                      {rows.map((r, ri) => (
                        <g key={ri}>
                          {r.bold && <rect x={tx+6} y={ty+47+ri*14-10} width={tw-12} height={13} rx={3} fill={r.color} opacity="0.12"/>}
                          <text x={tx+10}    y={ty+47+ri*14} fontSize={r.bold?9:8.5} fill={r.bold?'white':'#94a3b8'} fontWeight={r.bold?'bold':'normal'} fontFamily="sans-serif">{r.label}</text>
                          <text x={tx+tw-10} y={ty+47+ri*14} textAnchor="end" fontSize={r.bold?9:8.5} fontWeight={r.bold?'bold':'normal'} fill={r.color} fontFamily="monospace">{r.val}</text>
                        </g>
                      ))}
                      {/* Click hint */}
                      <text x={tx+tw/2} y={ty+th-6} textAnchor="middle" fontSize="7" fill="#6366f1">Click → view {windowOf(d.reportDate).label.split('→')[1].trim()} inspections ↓</text>
                    </g>
                  );
                };

                // ─── Shared x-axis ─────────────────────────────────────────
                const XAxis = ({ items, chartH, total }: { items: typeof histData; chartH: number; total?: number }) => (
                  <>
                    {items.map((d, i) => {
                      const x = xAt(i, total ?? items.length);
                      const al = alertLevel(d);
                      return (
                        <g key={i}>
                          {al !== 'ok' && (
                            <line x1={x} x2={x} y1={pT} y2={pT+chartH}
                              stroke={al==='critical'?'#dc2626':'#f59e0b'} strokeWidth="0.5" strokeDasharray="2,3" opacity="0.3"/>
                          )}
                          <text x={x} y={pT+chartH+16}
                            textAnchor="end" fontSize="9.5"
                            fill={al==='critical'?'#dc2626':al==='warning'?'#b45309':'#475569'}
                            fontWeight={al!=='ok'?'bold':'normal'}
                            fontFamily="monospace"
                            transform={`rotate(-38,${x},${pT+chartH+16})`}>
                            {d.periodLabel}
                          </text>
                        </g>
                      );
                    })}
                  </>
                );

                // ─── Y-axis ────────────────────────────────────────────────
                const YGrid = ({ ticks, max, min, chartH, suffix='%' }: { ticks: number[]; max: number; min: number; chartH: number; suffix?: string }) => (
                  <>
                    {ticks.map(v => (
                      <g key={v}>
                        <line x1={pL} x2={pL+cW} y1={yAt(v,max,min,chartH)} y2={yAt(v,max,min,chartH)} stroke="#e2e8f0" strokeWidth="0.75"/>
                        <text x={pL-8} y={yAt(v,max,min,chartH)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}{suffix}</text>
                      </g>
                    ))}
                  </>
                );

                // ─── Dot renderer (shared) ─────────────────────────────────
                const Dots = ({
                  items, getY, chartId, dotFill, focusMetric, total
                }: {
                  items: typeof histData;
                  getY: (d: typeof histData[0]) => number;
                  chartId: string;
                  dotFill: (d: typeof histData[0]) => string;
                  focusMetric: string;
                  total?: number;
                }) => (
                  <>
                    {items.map((d, i) => {
                      const cx = xAt(i, total ?? items.length);
                      const cy = getY(d);
                      const fill = dotFill(d);
                      const isSel  = d.reportDate === cvorSelectedPull;
                      const isHov  = cvorHoveredPull?.chart === chartId && cvorHoveredPull?.idx === i;
                      const isLast = i === (total ?? items.length) - 1;
                      const al = alertLevel(d);
                      return (
                        <g key={i} style={{ cursor:'pointer' }}
                          onClick={() => setCvorSelectedPull(isSel ? null : d.reportDate)}
                          onMouseEnter={() => setCvorHoveredPull({ chart: chartId, idx: i })}
                          onMouseLeave={() => setCvorHoveredPull(null)}>
                          {/* Alert pulse ring */}
                          {al === 'critical' && !isSel && (
                            <circle cx={cx} cy={cy} r={11} fill="#dc2626" opacity="0.15"/>
                          )}
                          {/* Selected ring */}
                          {isSel && <circle cx={cx} cy={cy} r={13} fill="none" stroke="#6366f1" strokeWidth="2.5"/>}
                          {(isLast || isHov || isSel) && (
                            <circle cx={cx} cy={cy} r={10} fill={isSel?'#6366f1':fill} opacity="0.18"/>
                          )}
                          {/* Hit area */}
                          <circle cx={cx} cy={cy} r={14} fill="transparent"/>
                          {/* Dot */}
                          <circle cx={cx} cy={cy} r={isSel||isHov||isLast ? 6 : 4}
                            fill={isSel?'#6366f1':fill} stroke="white" strokeWidth="2"
                            style={{ pointerEvents:'none' }}/>
                          {/* Alert exclamation */}
                          {al === 'critical' && !isSel && !isHov && (
                            <text x={cx+5} y={cy-7} fontSize="8" fill="#dc2626" fontWeight="bold" style={{pointerEvents:'none'}}>!</text>
                          )}
                          {/* Value label on last or hovered */}
                          {(isLast || isHov || isSel) && (
                            <text x={cx} y={cy-12} textAnchor="middle" fontSize="9.5" fontWeight="bold"
                              fill={isSel?'#6366f1':fill} fontFamily="monospace" style={{pointerEvents:'none'}}>
                              {getY(d) < pT + 8 ? '' : ''}
                            </text>
                          )}
                          {isHov && <Tip cx={cx} cy={cy} d={d} focusMetric={focusMetric}/>}
                        </g>
                      );
                    })}
                  </>
                );

                return (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    {/* ── Header ── */}
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 bg-slate-50/60">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-sm font-bold text-slate-800">CVOR Performance History</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls</span>
                        <span className="text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded">
                          {firstPull.periodLabel} → {lastPull.periodLabel} · {rangeMonths}mo
                        </span>
                        <span className="text-[10px] text-slate-400 italic">Each pull = 24-month rolling window</span>
                        {/* Alert legend */}
                        <div className="flex items-center gap-3 ml-2">
                          {[
                            { c:'#dc2626', label:'Critical pull' },
                            { c:'#f59e0b', label:'Warning pull' },
                            { c:'#16a34a', label:'Healthy pull' },
                          ].map(l => (
                            <div key={l.label} className="flex items-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{background:l.c}}/>
                              <span className="text-[9px] text-slate-500">{l.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cadence</span>
                        <div className="inline-flex bg-slate-100 rounded-lg p-0.5 gap-px">
                          {(['Monthly','Quarterly','Semi-Annual','All'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors whitespace-nowrap ${cvorPeriod===p?'bg-white text-blue-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Selected pull banner ── */}
                    {selPull && (() => {
                      const win = windowOf(selPull.reportDate);
                      const al = alertLevel(selPull);
                      const bannerBg = al==='critical'?'bg-red-600':al==='warning'?'bg-amber-500':'bg-indigo-600';
                      return (
                        <div className={`px-5 py-2.5 ${bannerBg} text-white flex items-center justify-between flex-wrap gap-2`}>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                            <span className="text-sm font-bold">Pull: {selPull.periodLabel}</span>
                            <span className="opacity-80 text-xs font-mono">Window: {win.label}</span>
                            <span className="opacity-70 text-xs">Rating: <strong>{selPull.rating.toFixed(2)}%</strong></span>
                            {al==='critical' && <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded">⚠ Above Audit Threshold</span>}
                          </div>
                          <button onClick={() => setCvorSelectedPull(null)}
                            className="opacity-80 hover:opacity-100 text-[11px] font-bold px-2 py-0.5 rounded border border-white/40 hover:border-white transition-all">
                            × Clear
                          </button>
                        </div>
                      );
                    })()}

                    <div className="p-5 space-y-6">

                      {/* ══ CHART 1: Overall CVOR Rating ══ */}
                      {(() => {
                        const CH=280, VH=CH+pT+pB;
                        const rMin=0, rMax=42;
                        const zones = [
                          { from:0,                          to:cvorThresholds.warning,      fill:'#bbf7d0', label:'Safe',       labelColor:'#166534' },
                          { from:cvorThresholds.warning,      to:cvorThresholds.intervention, fill:'#fef08a', label:'Warning',    labelColor:'#854d0e' },
                          { from:cvorThresholds.intervention, to:cvorThresholds.showCause,    fill:'#fde68a', label:'Audit',      labelColor:'#92400e' },
                          { from:cvorThresholds.showCause,    to:rMax,                        fill:'#fecaca', label:'Show Cause', labelColor:'#991b1b' },
                        ];
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Overall CVOR Rating</span>
                              {zones.map(z=>(
                                <div key={z.label} className="flex items-center gap-1.5">
                                  <div className="w-3 h-3 rounded-sm border" style={{background:z.fill,borderColor:z.labelColor+'55'}}/>
                                  <span className="text-[9.5px] font-mono" style={{color:z.labelColor}}>{z.label}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9.5px] text-indigo-500 font-semibold">↑ Hover any dot · click to drill into inspections</span>
                            </div>
                            {selPull && (
                              <div className="mb-2 inline-flex items-center gap-2 text-[10px] text-indigo-700 font-mono bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"/>
                                Selected: {windowOf(selPull.reportDate).label}
                              </div>
                            )}
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH}`} style={{width:'100%',height:`${VH}px`,display:'block'}}>
                                {/* Zone bands with labels */}
                                {zones.map(z=>{
                                  const y1=yAt(Math.min(z.to,rMax),rMax,rMin,CH);
                                  const y2=yAt(z.from,rMax,rMin,CH);
                                  return (
                                    <g key={z.label}>
                                      <rect x={pL} y={y1} width={cW} height={y2-y1} fill={z.fill} opacity="0.45"/>
                                      <text x={pL+6} y={(y1+y2)/2+4} fontSize="9" fill={z.labelColor} fontWeight="600" opacity="0.7">{z.label}</text>
                                    </g>
                                  );
                                })}
                                <YGrid ticks={[0,5,10,15,20,25,30,35,40]} max={rMax} min={rMin} chartH={CH}/>
                                {/* Threshold lines */}
                                {[
                                  {t:cvorThresholds.warning,     c:'#65a30d',lbl:'35% Warning'},
                                  {t:cvorThresholds.intervention, c:'#d97706',lbl:'50% Audit'},
                                  {t:cvorThresholds.showCause,    c:'#dc2626',lbl:'75% Show Cause'},
                                ].map(th=>(
                                  <g key={th.t}>
                                    <line x1={pL} x2={pL+cW} y1={yAt(th.t,rMax,rMin,CH)} y2={yAt(th.t,rMax,rMin,CH)} stroke={th.c} strokeWidth="1.2" strokeDasharray="6,3" opacity="0.85"/>
                                    <text x={pL+cW+5} y={yAt(th.t,rMax,rMin,CH)+3.5} fontSize="9" fontWeight="700" fill={th.c}>{th.lbl}</text>
                                  </g>
                                ))}
                                {/* Area + line */}
                                <path d={mkArea(histData,d=>d.rating,rMax,rMin,CH)} fill="#d97706" opacity="0.07"/>
                                <path d={mkPath(histData,d=>d.rating,rMax,rMin,CH)} fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                                {/* Value labels on all points */}
                                {histData.map((d,i)=>{
                                  const cx=xAt(i), cy=yAt(d.rating,rMax,rMin,CH);
                                  const isSel=d.reportDate===cvorSelectedPull;
                                  const isLast=i===n-1;
                                  return (isLast||isSel)&&(
                                    <text key={i} x={cx} y={cy-13} textAnchor="middle" fontSize="10" fontWeight="bold"
                                      fill={isSel?'#6366f1':ratingColor(d.rating)} fontFamily="monospace" style={{pointerEvents:'none'}}>
                                      {d.rating.toFixed(2)}%
                                    </text>
                                  );
                                })}
                                <XAxis items={histData} chartH={CH}/>
                                <Dots items={histData} getY={d=>yAt(d.rating,rMax,rMin,CH)} chartId="r"
                                  dotFill={d=>ratingColor(d.rating)} focusMetric="rating"/>
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ CHART 2: Category Contributions ══ */}
                      {(() => {
                        const CH2=220, VH2=CH2+pT+pB;
                        const maxCat=Math.ceil(Math.max(...histData.map(d=>Math.max(d.colContrib,d.conContrib,d.insContrib)))+1);
                        const y2=(v:number)=>yAt(v,maxCat,0,CH2);
                        const cats=[
                          {key:'col',label:'Collisions (40%)',  vals:histData.map(d=>d.colContrib), color:'#3b82f6', focusMetric:'col'},
                          {key:'con',label:'Convictions (40%)', vals:histData.map(d=>d.conContrib), color:'#d97706', focusMetric:'con'},
                          {key:'ins',label:'Inspections (20%)', vals:histData.map(d=>d.insContrib), color:'#dc2626', focusMetric:'ins'},
                        ];
                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Category Contributions to Rating</span>
                              {cats.map(c=>(
                                <div key={c.key} className="flex items-center gap-1.5">
                                  <div className="w-5 h-1 rounded" style={{background:c.color}}/>
                                  <span className="text-[9.5px] text-slate-600 font-medium">{c.label}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9px] text-slate-400 italic">Each line = weighted % contribution to CVOR score</span>
                            </div>
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH2}`} style={{width:'100%',height:`${VH2}px`,display:'block'}}>
                                {[0,2,4,6,8].filter(v=>v<=maxCat).map(v=>(
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW} y1={y2(v)} y2={y2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                    <text x={pL-8} y={y2(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                  </g>
                                ))}
                                {cats.map(c=>(
                                  <path key={c.key}
                                    d={mkPath(histData,d=>c.key==='col'?d.colContrib:c.key==='con'?d.conContrib:d.insContrib,maxCat,0,CH2)}
                                    fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                                ))}
                                <XAxis items={histData} chartH={CH2}/>
                                {cats.map(c=>(
                                  <Dots key={c.key}
                                    items={histData}
                                    getY={d=>y2(c.key==='col'?d.colContrib:c.key==='con'?d.conContrib:d.insContrib)}
                                    chartId={`c-${c.key}`} dotFill={()=>c.color} focusMetric={c.focusMetric}/>
                                ))}
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ CHART 3: OOS Rates ══ */}
                      {(() => {
                        const oosD=histData.filter(d=>d.oosOverall>0), no=oosD.length;
                        const CH3=220, VH3=CH3+pT+pB;
                        const maxOos=Math.max(50,Math.ceil(Math.max(...oosD.map(d=>Math.max(d.oosOverall,d.oosVehicle)))/10)*10+5);
                        const y3=(v:number)=>yAt(v,maxOos,0,CH3);
                        const xO=(i:number)=>pL+(no>1?(i/(no-1))*cW:cW/2);
                        const mkOos=(vals:number[])=>vals.map((v,i)=>{
                          const gap=i>0?(new Date(oosD[i].reportDate).getTime()-new Date(oosD[i-1].reportDate).getTime())/86400000:0;
                          return `${i===0?'M':(gap>gapDays?'M':'L')}${xO(i).toFixed(1)},${y3(v).toFixed(1)}`;
                        }).join(' ');
                        const oosLines=[
                          {key:'ov',label:'Overall OOS%', vals:oosD.map(d=>d.oosOverall), color:'#6366f1', focusMetric:'oosOv'},
                          {key:'vh',label:'Vehicle OOS%', vals:oosD.map(d=>d.oosVehicle), color:'#ef4444', focusMetric:'oosVh'},
                          {key:'dr',label:'Driver OOS%',  vals:oosD.map(d=>d.oosDriver),  color:'#16a34a', focusMetric:'oosDr'},
                        ];
                        return (
                          <div>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Out-of-Service Rates</span>
                              {oosLines.map(l=>(
                                <div key={l.key} className="flex items-center gap-1.5">
                                  <div className="w-5 h-1 rounded" style={{background:l.color}}/>
                                  <span className="text-[9.5px] text-slate-600 font-medium">{l.label}</span>
                                </div>
                              ))}
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 border-t border-dashed border-slate-400"/>
                                <span className="text-[9px] text-slate-400">20% MTO threshold</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 border-t border-dashed border-red-400"/>
                                <span className="text-[9px] text-red-400">35% alert</span>
                              </div>
                            </div>
                            {no < 2 ? (
                              <div className="h-20 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">No OOS data for selected pulls</div>
                            ) : (
                              <div className="w-full">
                                <svg viewBox={`0 0 ${VW} ${VH3}`} style={{width:'100%',height:`${VH3}px`,display:'block'}}>
                                  {/* Alert zone band above 20% */}
                                  <rect x={pL} y={y3(maxOos)} width={cW} height={y3(20)-y3(maxOos)} fill="#fecaca" opacity="0.15"/>
                                  {[0,10,20,30,40,50].filter(v=>v<=maxOos).map(v=>(
                                    <g key={v}>
                                      <line x1={pL} x2={pL+cW} y1={y3(v)} y2={y3(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                      <text x={pL-8} y={y3(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}%</text>
                                    </g>
                                  ))}
                                  {/* Threshold lines */}
                                  <line x1={pL} x2={pL+cW} y1={y3(20)} y2={y3(20)} stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="5,3" opacity="0.8"/>
                                  <text x={pL+cW+5} y={y3(20)+3.5} fontSize="9" fontWeight="600" fill="#94a3b8">20%</text>
                                  <line x1={pL} x2={pL+cW} y1={y3(35)} y2={y3(35)} stroke="#ef4444" strokeWidth="1" strokeDasharray="4,3" opacity="0.6"/>
                                  <text x={pL+cW+5} y={y3(35)+3.5} fontSize="9" fontWeight="600" fill="#ef4444">35%</text>
                                  {oosLines.map(l=><path key={l.key} d={mkOos(l.vals)} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>)}
                                  {/* Alert dots on high OOS */}
                                  {oosD.map((d,i)=>d.oosVehicle>35&&(
                                    <g key={i} style={{pointerEvents:'none'}}>
                                      <circle cx={xO(i)} cy={y3(d.oosVehicle)} r={8} fill="#ef4444" opacity="0.15"/>
                                    </g>
                                  ))}
                                  <XAxis items={oosD} chartH={CH3}/>
                                  {oosLines.map(l=>(
                                    <Dots key={l.key}
                                      items={oosD}
                                      getY={d=>y3(l.key==='ov'?d.oosOverall:l.key==='vh'?d.oosVehicle:d.oosDriver)}
                                      chartId={`o-${l.key}`} dotFill={()=>l.color} focusMetric={l.focusMetric}
                                      total={no}/>
                                  ))}
                                </svg>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* ══ CHART 4: Event Counts & Points ══ */}
                      {(() => {
                        const CH4=220, VH4=CH4+pT+pB;
                        const maxE=Math.max(...histData.map(d=>Math.max(d.collisionEvents,d.convictionEvents)))+4;
                        const maxP=Math.max(...histData.map(d=>Math.max(d.totalCollisionPoints,d.convictionPoints)))+5;
                        const yE=(v:number)=>yAt(v,maxE,0,CH4);
                        const yP=(v:number)=>yAt(v,maxP,0,CH4);
                        const bw=Math.max(9,Math.min(24,cW/n*0.22));
                        const mkPts=(vals:number[],yFn:(v:number)=>number)=>
                          vals.map((v,i)=>{
                            const gap=i>0?(new Date(histData[i].reportDate).getTime()-new Date(histData[i-1].reportDate).getTime())/86400000:0;
                            return `${i===0?'M':(gap>gapDays?'M':'L')}${xAt(i).toFixed(1)},${yFn(v).toFixed(1)}`;
                          }).join(' ');
                        return (
                          <div>
                            <div className="flex items-center gap-4 mb-2 flex-wrap">
                              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Event Counts &amp; Points per Pull</span>
                              {[
                                {lbl:'Collisions (bars)',   color:'#3b82f6', rect:true},
                                {lbl:'Convictions (bars)',  color:'#d97706', rect:true},
                                {lbl:'Col Points (line)',   color:'#6366f1', rect:false},
                                {lbl:'Conv Points (line)',  color:'#ec4899', rect:false},
                              ].map(l=>(
                                <div key={l.lbl} className="flex items-center gap-1.5">
                                  {l.rect
                                    ?<div className="w-3 h-3 rounded-sm border" style={{background:l.color+'22',borderColor:l.color}}/>
                                    :<div className="w-6 border-t-2 border-dashed" style={{borderColor:l.color}}/>
                                  }
                                  <span className="text-[9.5px] text-slate-600">{l.lbl}</span>
                                </div>
                              ))}
                              <span className="ml-auto text-[9px] text-slate-400 italic">Hover bar → full pull details · click → inspections</span>
                            </div>
                            <div className="w-full">
                              <svg viewBox={`0 0 ${VW} ${VH4}`} style={{width:'100%',height:`${VH4}px`,display:'block'}}>
                                {[0,5,10,15,20,25,30].filter(v=>v<=maxE).map(v=>(
                                  <g key={v}>
                                    <line x1={pL} x2={pL+cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                                    <text x={pL-8} y={yE(v)+3.5} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">{v}</text>
                                  </g>
                                ))}
                                {/* Points lines */}
                                <path d={mkPts(histData.map(d=>d.totalCollisionPoints),yP)} fill="none" stroke="#6366f1" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"/>
                                <path d={mkPts(histData.map(d=>d.convictionPoints),yP)}      fill="none" stroke="#ec4899" strokeWidth="2" strokeDasharray="5,3" opacity="0.8"/>
                                {/* Bars + hover */}
                                {histData.map((d,i)=>{
                                  const cx4=xAt(i);
                                  const isSel4=d.reportDate===cvorSelectedPull;
                                  const isHov4=cvorHoveredPull?.chart==='ev'&&cvorHoveredPull?.idx===i;
                                  const al=alertLevel(d);
                                  return (
                                    <g key={i} style={{cursor:'pointer'}}
                                      onClick={()=>setCvorSelectedPull(isSel4?null:d.reportDate)}
                                      onMouseEnter={()=>setCvorHoveredPull({chart:'ev',idx:i})}
                                      onMouseLeave={()=>setCvorHoveredPull(null)}>
                                      {/* Alert glow */}
                                      {al==='critical'&&<rect x={cx4-bw-3} y={pT} width={bw*2+6} height={CH4} fill="#dc2626" opacity="0.04" rx="2"/>}
                                      {isSel4&&<rect x={cx4-bw-3} y={pT} width={bw*2+6} height={CH4} fill="#6366f1" opacity="0.06" rx="2"/>}
                                      {/* Collision bar */}
                                      <rect x={cx4-bw-1} y={yE(d.collisionEvents)} width={bw} height={pT+CH4-yE(d.collisionEvents)}
                                        fill={isHov4||isSel4?'#3b82f6':'#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2"/>
                                      {/* Conviction bar */}
                                      <rect x={cx4+1} y={yE(d.convictionEvents)} width={bw} height={pT+CH4-yE(d.convictionEvents)}
                                        fill={isHov4||isSel4?'#d97706':'#d9770622'} stroke="#d97706" strokeWidth="1" rx="2"/>
                                      {/* Count labels */}
                                      <text x={cx4-bw/2} y={yE(d.collisionEvents)-4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#1d4ed8" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.collisionEvents}</text>
                                      <text x={cx4+bw/2+1} y={yE(d.convictionEvents)-4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#92400e" fontFamily="monospace" style={{pointerEvents:'none'}}>{d.convictionEvents}</text>
                                      {/* Tooltip */}
                                      {isHov4&&<Tip cx={cx4} cy={yE(Math.max(d.collisionEvents,d.convictionEvents))-30} d={d} focusMetric="events"/>}
                                    </g>
                                  );
                                })}
                                <XAxis items={histData} chartH={CH4}/>
                              </svg>
                            </div>
                          </div>
                        );
                      })()}

                      {/* ══ PULL-BY-PULL DATA TABLE ══ */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Pull-by-Pull Data</span>
                          <span className="text-[9.5px] font-mono bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{n} pulls · newest first · click row → inspection drill-down</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                          <table className="w-full text-[11px] border-collapse" style={{minWidth:'1050px'}}>
                            <thead>
                              <tr className="bg-slate-800 text-white">
                                <th className="text-left px-3 py-2.5 font-semibold text-slate-200 whitespace-nowrap">Pull Date</th>
                                <th className="text-left px-3 py-2.5 font-semibold text-indigo-300 whitespace-nowrap">24-Month Window</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-200">Rating</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-blue-300">Col%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-amber-300">Con%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300">Ins%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">#Col</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">#Conv</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-indigo-300">Col Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-pink-300">Conv Pts</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-violet-300">OOS Ov%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-red-300">OOS Veh%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-emerald-300">OOS Drv%</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">Trucks</th>
                                <th className="text-right px-2 py-2.5 font-semibold text-slate-300">Total Mi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...histData].reverse().map((d, i) => {
                                const win = windowOf(d.reportDate);
                                const al = alertLevel(d);
                                const isSel = d.reportDate === cvorSelectedPull;
                                const isLatest = i === 0;
                                const inWin = inspectionsData.filter(r => {
                                  const rd = new Date(r.date); return rd >= win.start && rd <= win.end;
                                });
                                const ratingBadgeCls =
                                  d.rating >= cvorThresholds.showCause   ? 'bg-red-100 text-red-700 font-bold' :
                                  d.rating >= cvorThresholds.intervention ? 'bg-amber-100 text-amber-700 font-bold' :
                                  d.rating >= cvorThresholds.warning      ? 'bg-yellow-100 text-yellow-700 font-semibold' :
                                                                            'bg-emerald-100 text-emerald-700';
                                const rowBg = isSel ? 'bg-indigo-50 border-l-[3px] border-l-indigo-500' :
                                  al==='critical' ? 'bg-red-50/60 border-l-[3px] border-l-red-400' :
                                  al==='warning'  ? 'bg-amber-50/40 border-l-[3px] border-l-amber-400' :
                                  isLatest ? 'bg-blue-50 border-l-[3px] border-l-blue-400' :
                                  i%2===0 ? 'bg-white' : 'bg-slate-50/50';
                                return (
                                  <tr key={i} className={`border-b border-slate-100 cursor-pointer transition-colors hover:brightness-95 ${rowBg}`}
                                    onClick={() => setCvorSelectedPull(isSel ? null : d.reportDate)}>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {isSel && <span className="text-[8px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">▶ ON</span>}
                                        {!isSel && isLatest && <span className="text-[8px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded">LATEST</span>}
                                        {!isSel && al==='critical' && <span className="text-[8px] font-bold text-red-600">⚠</span>}
                                        <span className="font-mono font-semibold text-slate-800">{d.periodLabel}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2.5 whitespace-nowrap">
                                      <span className="text-[10px] font-mono text-indigo-600">{win.label}</span>
                                      {inWin.length > 0 && (
                                        <span className="ml-1.5 text-[8.5px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{inWin.length} insp.</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                                      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${ratingBadgeCls}`}>{d.rating.toFixed(2)}%</span>
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
                        const pullInspections = [...inspectionsData]
                          .filter(r => { const rd = new Date(r.date); return rd >= win.start && rd <= win.end; })
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                        const calcCvor = (r: any) => {
                          const veh = r.cvorPoints?.vehicle ?? (r.violations||[]).filter((v:any)=>!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
                          const dvr = r.cvorPoints?.driver  ?? (r.violations||[]).filter((v:any)=>!!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
                          return { veh, dvr, cvr: r.cvorPoints?.cvor ?? veh+dvr };
                        };
                        const totalCvrPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).cvr,0);
                        const totalVehPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).veh,0);
                        const totalDvrPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).dvr,0);
                        const oosCount     = pullInspections.filter(r=>r.hasOOS).length;
                        const cleanCount   = pullInspections.filter(r=>r.isClean).length;
                        const withPtsCount = pullInspections.filter(r=>calcCvor(r).cvr>0).length;
                        const al = alertLevel(pullObj);
                        const accentColor = al==='critical'?'border-red-400 bg-red-50/50':al==='warning'?'border-amber-400 bg-amber-50/50':'border-indigo-300 bg-indigo-50/30';
                        return (
                          <div className={`border-t-2 pt-5 ${accentColor}`}>
                            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-10 rounded-full flex-shrink-0 ${al==='critical'?'bg-red-500':al==='warning'?'bg-amber-500':'bg-indigo-500'}`}/>
                                <div>
                                  <div className="text-sm font-bold text-slate-800">CVOR Inspections — {pullObj.periodLabel}</div>
                                  <div className="text-[11px] text-indigo-600 font-mono font-semibold">Window: {win.label}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    These inspections drive the <span className="font-bold text-slate-700">{pullObj.rating.toFixed(2)}%</span> CVOR rating for this pull
                                    {al==='critical'&&<span className="ml-2 text-red-600 font-semibold">⚠ Above audit threshold</span>}
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => setCvorSelectedPull(null)}
                                className="text-slate-400 hover:text-slate-700 text-xs border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                                × Close
                              </button>
                            </div>
                            {/* Impact summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
                              {[
                                {label:'Inspections',      val:String(pullInspections.length), sub:'in 24-mo window',  color:'text-slate-800', bg:'bg-slate-50', border:'border-slate-200'},
                                {label:'CVOR Impact',      val:String(withPtsCount),           sub:'have CVOR pts',    color:'text-red-700',   bg:'bg-red-50',   border:'border-red-200'},
                                {label:'OOS',              val:String(oosCount),               sub:'out-of-service',   color:'text-red-700',   bg:'bg-red-50',   border:'border-red-200'},
                                {label:'Clean',            val:String(cleanCount),             sub:'no violations',    color:'text-emerald-700',bg:'bg-emerald-50',border:'border-emerald-200'},
                                {label:'Veh Pts',          val:String(totalVehPts),            sub:'vehicle CVOR',     color:'text-orange-700',bg:'bg-orange-50',border:'border-orange-200'},
                                {label:'Dvr Pts',          val:String(totalDvrPts),            sub:'driver CVOR',      color:'text-amber-700', bg:'bg-amber-50', border:'border-amber-200'},
                                {label:'CVOR Pts',         val:String(totalCvrPts),            sub:'combined impact',  color:'text-indigo-700',bg:'bg-indigo-50',border:'border-indigo-200'},
                              ].map(c=>(
                                <div key={c.label} className={`${c.bg} border ${c.border} rounded-xl px-3 py-3`}>
                                  <div className={`text-2xl font-black ${c.color} leading-none`}>{c.val}</div>
                                  <div className="text-[10px] font-bold text-slate-600 mt-1">{c.label}</div>
                                  <div className="text-[9px] text-slate-400">{c.sub}</div>
                                </div>
                              ))}
                            </div>
                            {/* Category breakdown */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                              {[
                                {label:'Collisions',  pct:pullObj.colContrib, thresh:pullObj.colPctOfThresh, weight:40, color:'blue',  events:pullObj.collisionEvents,  pts:pullObj.totalCollisionPoints},
                                {label:'Convictions', pct:pullObj.conContrib, thresh:pullObj.conPctOfThresh, weight:40, color:'amber', events:pullObj.convictionEvents, pts:pullObj.convictionPoints},
                                {label:'Inspections', pct:pullObj.insContrib, thresh:pullObj.insPctOfThresh, weight:20, color:'red',   events:pullInspections.length,   pts:totalCvrPts},
                              ].map(cat=>{
                                const barColor=cat.color==='blue'?'#3b82f6':cat.color==='amber'?'#d97706':'#dc2626';
                                const bgCls=cat.color==='blue'?'bg-blue-50 border-blue-200':cat.color==='amber'?'bg-amber-50 border-amber-200':'bg-red-50 border-red-200';
                                const txtCls=cat.color==='blue'?'text-blue-700':cat.color==='amber'?'text-amber-700':'text-red-700';
                                return (
                                  <div key={cat.label} className={`border rounded-xl p-3.5 ${bgCls}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider ${txtCls}`}>{cat.label}</span>
                                      <span className="text-[9px] text-slate-400 bg-white/70 px-1.5 py-0.5 rounded font-mono">{cat.weight}% weight</span>
                                    </div>
                                    <div className="flex items-baseline gap-1.5 mb-1">
                                      <span className={`text-2xl font-black ${txtCls}`}>{cat.pct.toFixed(2)}%</span>
                                      <span className="text-[10px] text-slate-400">of total rating</span>
                                    </div>
                                    <div className="mt-2 mb-1.5">
                                      <div className="flex justify-between text-[8.5px] text-slate-400 mb-0.5">
                                        <span>% of threshold</span>
                                        <span className="font-bold" style={{color:barColor}}>{cat.thresh.toFixed(1)}%</span>
                                      </div>
                                      <div className="h-2 bg-white/60 rounded-full overflow-hidden border border-white shadow-sm">
                                        <div className="h-full rounded-full" style={{width:`${Math.min(cat.thresh,100)}%`,background:barColor}}/>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 text-[9.5px] text-slate-500 mt-2">
                                      <span className="font-semibold">{cat.events} events</span>
                                      <span>·</span>
                                      <span>{cat.pts} pts</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Inspection list */}
                            {pullInspections.length === 0 ? (
                              <div className="py-12 flex flex-col items-center gap-3 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                <div className="text-4xl">📋</div>
                                <div className="text-sm font-semibold">No inspections in this 24-month window</div>
                                <div className="text-xs font-mono text-indigo-400">{win.label}</div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-2 bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider">
                                  <div className="col-span-1">Date</div>
                                  <div className="col-span-1">Report ID</div>
                                  <div className="col-span-1">Location</div>
                                  <div className="col-span-2">Driver / Licence</div>
                                  <div className="col-span-2">Power Unit / Defects</div>
                                  <div className="col-span-1 text-center">Violations</div>
                                  <div className="col-span-1 text-center text-orange-300">Veh Pts</div>
                                  <div className="col-span-1 text-center text-amber-300">Dvr Pts</div>
                                  <div className="col-span-1 text-center text-red-300">CVOR Pts</div>
                                  <div className="col-span-1">Status</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                  {pullInspections.map((record, ri) => {
                                    const pts = calcCvor(record);
                                    return (
                                      <InspectionRow key={record.id+'-'+ri} record={record}
                                        cvorOverride={{ vehPts:pts.veh, dvrPts:pts.dvr, cvrPts:pts.cvr }}/>
                                    );
                                  })}
                                </div>
                                <div className="hidden md:grid grid-cols-12 gap-x-2 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-[11px]">
                                  <div className="col-span-6 font-bold text-slate-600">
                                    {pullInspections.length} inspections · {withPtsCount} with CVOR impact · {oosCount} OOS · {cleanCount} clean
                                  </div>
                                  <div className="col-span-2"/>
                                  <div className="col-span-1 text-center font-bold text-orange-700">{totalVehPts}</div>
                                  <div className="col-span-1 text-center font-bold text-amber-700">{totalDvrPts}</div>
                                  <div className="col-span-1 text-center font-bold text-red-700">{totalCvrPts}</div>
                                  <div className="col-span-1"/>
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

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

chart_start = next(i for i, l in enumerate(lines) if '{/* ── PERFORMANCE HISTORY CHARTS ── */}' in l)
chart_end   = next(i for i, l in enumerate(lines) if '{/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}' in l and i > chart_start + 5)

print(f"Replacing lines {chart_start+1}–{chart_end} ({chart_end - chart_start} lines)")
with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines[:chart_start] + [CHART_JSX + '\n'] + lines[chart_end:])
print("Done.")
