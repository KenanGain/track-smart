"""
Step 1 - Append CvorPeriodicReport type + 24 months of data to inspectionsData.ts
Step 2 - Update import in InspectionsPage.tsx
Step 3 - Inject chart section after line 5512 in InspectionsPage.tsx
"""

# ── STEP 1: inspectionsData.ts ────────────────────────────────────────────
DATA_APPEND = r"""
// ─────────────────────────────────────────────────────────────────────────────
// CVOR PERIODIC REPORT SNAPSHOTS
// Each row = one monthly MTO CVOR abstract pulled for the carrier.
// 24 months of history (Jan 2024 → Dec 2025).
// Most-recent row must match carrierProfile.cvorAnalysis values exactly.
// ─────────────────────────────────────────────────────────────────────────────

export type CvorPeriodicReport = {
  reportDate:       string;   // ISO date, first of the month
  periodLabel:      string;   // e.g. "Jan 2024"
  rating:           number;   // overall CVOR % (colContrib+conContrib+insContrib)
  // % of each category's allocated threshold used
  colPctOfThresh:   number;   // collision percentile score
  conPctOfThresh:   number;   // conviction percentile score
  insPctOfThresh:   number;   // inspection percentile score
  // weighted contributions to overall rating
  colContrib:       number;   // colPctOfThresh × 0.40
  conContrib:       number;   // conPctOfThresh × 0.40
  insContrib:       number;   // insPctOfThresh × 0.20
  // OOS rates
  oosOverall:       number;
  oosVehicle:       number;
  oosDriver:        number;
  // event counts
  collisionEvents:  number;
  convictionEvents: number;
  trucks:           number;
  totalMilesMM:     number;   // total fleet miles (millions)
};

// Verify formula for last row (Dec 2025):
// 47.65×0.40 + 53.90×0.40 + 87.85×0.20 = 19.06 + 21.56 + 17.57 = 58.19 ✓
export const cvorPeriodicReports: CvorPeriodicReport[] = [
  { reportDate:'2024-01-01', periodLabel:'Jan 2024', rating:42.50, colPctOfThresh:32.50, conPctOfThresh:35.80, insPctOfThresh:72.00, colContrib:13.00, conContrib:14.32, insContrib:14.40, oosOverall:18.0, oosVehicle:21.2, oosDriver:1.0, collisionEvents:3, convictionEvents:6, trucks:18, totalMilesMM:1.75 },
  { reportDate:'2024-02-01', periodLabel:'Feb 2024', rating:43.10, colPctOfThresh:33.20, conPctOfThresh:36.50, insPctOfThresh:72.50, colContrib:13.28, conContrib:14.60, insContrib:14.50, oosOverall:18.5, oosVehicle:21.8, oosDriver:1.1, collisionEvents:3, convictionEvents:6, trucks:18, totalMilesMM:1.62 },
  { reportDate:'2024-03-01', periodLabel:'Mar 2024', rating:43.80, colPctOfThresh:33.80, conPctOfThresh:37.20, insPctOfThresh:73.00, colContrib:13.52, conContrib:14.88, insContrib:14.60, oosOverall:18.9, oosVehicle:22.3, oosDriver:1.2, collisionEvents:3, convictionEvents:6, trucks:19, totalMilesMM:1.92 },
  { reportDate:'2024-04-01', periodLabel:'Apr 2024', rating:44.40, colPctOfThresh:34.40, conPctOfThresh:38.00, insPctOfThresh:73.50, colContrib:13.76, conContrib:15.20, insContrib:14.70, oosOverall:19.3, oosVehicle:22.7, oosDriver:1.2, collisionEvents:3, convictionEvents:7, trucks:19, totalMilesMM:1.98 },
  { reportDate:'2024-05-01', periodLabel:'May 2024', rating:45.30, colPctOfThresh:35.20, conPctOfThresh:38.80, insPctOfThresh:74.30, colContrib:14.08, conContrib:15.52, insContrib:14.86, oosOverall:19.8, oosVehicle:23.2, oosDriver:1.3, collisionEvents:3, convictionEvents:7, trucks:19, totalMilesMM:2.05 },
  { reportDate:'2024-06-01', periodLabel:'Jun 2024', rating:46.10, colPctOfThresh:35.90, conPctOfThresh:39.50, insPctOfThresh:75.00, colContrib:14.36, conContrib:15.80, insContrib:15.00, oosOverall:20.3, oosVehicle:23.8, oosDriver:1.4, collisionEvents:4, convictionEvents:7, trucks:20, totalMilesMM:2.12 },
  { reportDate:'2024-07-01', periodLabel:'Jul 2024', rating:47.20, colPctOfThresh:36.80, conPctOfThresh:40.60, insPctOfThresh:75.80, colContrib:14.72, conContrib:16.24, insContrib:15.16, oosOverall:20.8, oosVehicle:24.4, oosDriver:1.5, collisionEvents:4, convictionEvents:7, trucks:20, totalMilesMM:2.18 },
  { reportDate:'2024-08-01', periodLabel:'Aug 2024', rating:48.10, colPctOfThresh:37.50, conPctOfThresh:41.50, insPctOfThresh:76.30, colContrib:15.00, conContrib:16.60, insContrib:15.26, oosOverall:21.2, oosVehicle:24.9, oosDriver:1.6, collisionEvents:4, convictionEvents:8, trucks:20, totalMilesMM:2.22 },
  { reportDate:'2024-09-01', periodLabel:'Sep 2024', rating:49.30, colPctOfThresh:38.80, conPctOfThresh:42.50, insPctOfThresh:77.00, colContrib:15.52, conContrib:17.00, insContrib:15.40, oosOverall:21.8, oosVehicle:25.6, oosDriver:1.7, collisionEvents:4, convictionEvents:8, trucks:20, totalMilesMM:2.15 },
  { reportDate:'2024-10-01', periodLabel:'Oct 2024', rating:50.50, colPctOfThresh:40.00, conPctOfThresh:44.00, insPctOfThresh:77.80, colContrib:16.00, conContrib:17.60, insContrib:15.56, oosOverall:22.4, oosVehicle:26.2, oosDriver:1.8, collisionEvents:4, convictionEvents:8, trucks:20, totalMilesMM:2.08 },
  { reportDate:'2024-11-01', periodLabel:'Nov 2024', rating:51.20, colPctOfThresh:40.80, conPctOfThresh:44.80, insPctOfThresh:78.50, colContrib:16.32, conContrib:17.92, insContrib:15.70, oosOverall:22.8, oosVehicle:26.5, oosDriver:1.9, collisionEvents:5, convictionEvents:8, trucks:20, totalMilesMM:1.95 },
  { reportDate:'2024-12-01', periodLabel:'Dec 2024', rating:51.90, colPctOfThresh:41.50, conPctOfThresh:45.40, insPctOfThresh:79.50, colContrib:16.60, conContrib:18.16, insContrib:15.90, oosOverall:23.2, oosVehicle:26.8, oosDriver:2.0, collisionEvents:5, convictionEvents:8, trucks:20, totalMilesMM:1.82 },
  { reportDate:'2025-01-01', periodLabel:'Jan 2025', rating:52.50, colPctOfThresh:42.00, conPctOfThresh:46.00, insPctOfThresh:80.00, colContrib:16.80, conContrib:18.40, insContrib:16.00, oosOverall:23.5, oosVehicle:27.0, oosDriver:2.0, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:1.78 },
  { reportDate:'2025-02-01', periodLabel:'Feb 2025', rating:53.10, colPctOfThresh:42.50, conPctOfThresh:46.60, insPctOfThresh:80.80, colContrib:17.00, conContrib:18.64, insContrib:16.16, oosOverall:23.8, oosVehicle:27.5, oosDriver:2.1, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:1.70 },
  { reportDate:'2025-03-01', periodLabel:'Mar 2025', rating:53.70, colPctOfThresh:43.00, conPctOfThresh:47.20, insPctOfThresh:81.30, colContrib:17.20, conContrib:18.88, insContrib:16.26, oosOverall:24.2, oosVehicle:27.9, oosDriver:2.2, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:1.95 },
  { reportDate:'2025-04-01', periodLabel:'Apr 2025', rating:54.30, colPctOfThresh:43.50, conPctOfThresh:48.00, insPctOfThresh:81.80, colContrib:17.40, conContrib:19.20, insContrib:16.36, oosOverall:24.5, oosVehicle:28.4, oosDriver:2.3, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.03 },
  { reportDate:'2025-05-01', periodLabel:'May 2025', rating:54.90, colPctOfThresh:44.00, conPctOfThresh:48.50, insPctOfThresh:82.50, colContrib:17.60, conContrib:19.40, insContrib:16.50, oosOverall:25.0, oosVehicle:28.9, oosDriver:2.4, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.08 },
  { reportDate:'2025-06-01', periodLabel:'Jun 2025', rating:55.40, colPctOfThresh:44.50, conPctOfThresh:49.00, insPctOfThresh:83.00, colContrib:17.80, conContrib:19.60, insContrib:16.60, oosOverall:25.5, oosVehicle:29.4, oosDriver:2.5, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.15 },
  { reportDate:'2025-07-01', periodLabel:'Jul 2025', rating:55.90, colPctOfThresh:45.00, conPctOfThresh:49.80, insPctOfThresh:83.50, colContrib:18.00, conContrib:19.92, insContrib:16.70, oosOverall:25.8, oosVehicle:30.0, oosDriver:2.6, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.20 },
  { reportDate:'2025-08-01', periodLabel:'Aug 2025', rating:56.20, colPctOfThresh:45.40, conPctOfThresh:50.20, insPctOfThresh:83.80, colContrib:18.16, conContrib:20.08, insContrib:16.76, oosOverall:26.3, oosVehicle:30.5, oosDriver:2.7, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.18 },
  { reportDate:'2025-09-01', periodLabel:'Sep 2025', rating:56.80, colPctOfThresh:46.00, conPctOfThresh:50.90, insPctOfThresh:85.50, colContrib:18.40, conContrib:20.36, insContrib:17.10, oosOverall:26.8, oosVehicle:31.2, oosDriver:2.9, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.10 },
  { reportDate:'2025-10-01', periodLabel:'Oct 2025', rating:57.30, colPctOfThresh:46.50, conPctOfThresh:51.80, insPctOfThresh:86.00, colContrib:18.60, conContrib:20.72, insContrib:17.20, oosOverall:27.1, oosVehicle:31.9, oosDriver:2.8, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:2.05 },
  { reportDate:'2025-11-01', periodLabel:'Nov 2025', rating:57.80, colPctOfThresh:47.00, conPctOfThresh:52.50, insPctOfThresh:86.50, colContrib:18.80, conContrib:21.00, insContrib:17.30, oosOverall:27.5, oosVehicle:32.8, oosDriver:3.0, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:1.92 },
  { reportDate:'2025-12-01', periodLabel:'Dec 2025', rating:58.19, colPctOfThresh:47.65, conPctOfThresh:53.90, insPctOfThresh:87.85, colContrib:19.06, conContrib:21.56, insContrib:17.57, oosOverall:28.12, oosVehicle:33.33, oosDriver:3.12, collisionEvents:5, convictionEvents:9, trucks:20, totalMilesMM:1.85 },
];
"""

# ── STEP 2: InspectionsPage.tsx chart section to inject at line 5513 ─────────
CHART_JSX = r"""
              {/* ── PERFORMANCE HISTORY CHARTS ── */}
              {(() => {
                const numPts = cvorPeriod === '24M' ? 24 : cvorPeriod === '12M' ? 12 : cvorPeriod === '6M' ? 6 : 3;
                const histData = cvorPeriodicReports.slice(-numPts);
                const n = histData.length;
                if (n < 2) return null;

                // SVG layout constants
                const svgH = 190, svgH2 = 165;
                const pL = 38, pR = 10, pT = 14, pB = 28;
                const baseW = n * (numPts === 24 ? 30 : numPts === 12 ? 48 : 76);
                const svgW = Math.max(460, baseW);
                const cW  = svgW - pL - pR;
                const cH  = svgH  - pT - pB;
                const cH2 = svgH2 - pT - pB;

                const xAt = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW : cW / 2);
                const yAt = (v: number, max = 100, min = 0, h = cH) =>
                  pT + h - ((v - min) / (max - min)) * h;

                const mkLine = (vals: number[], max = 100, min = 0, h = cH) =>
                  vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v, max, min, h).toFixed(1)}`).join(' ');

                const mkArea = (vals: number[], max = 100, min = 0, h = cH) => {
                  const line = mkLine(vals, max, min, h);
                  return `${line} L${xAt(n - 1).toFixed(1)},${(pT + h).toFixed(1)} L${xAt(0).toFixed(1)},${(pT + h).toFixed(1)}Z`;
                };

                const xEvery = n <= 6 ? 1 : n <= 12 ? 2 : 4;
                const dotC = (r: number) =>
                  r >= cvorThresholds.showCause    ? '#ef4444' :
                  r >= cvorThresholds.intervention  ? '#f59e0b' :
                  r >= cvorThresholds.warning       ? '#eab308' : '#10b981';
                const lbl = (d: typeof histData[0]) => d.periodLabel.replace(' 20', '\u201924');

                return (
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    {/* Section header */}
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Activity size={14} className="text-slate-400"/>
                        <span className="text-sm font-bold text-slate-700">Performance History</span>
                        <span className="text-[11px] text-slate-400 font-mono">{n} monthly CVOR abstract snapshots</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Period</span>
                        <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                          {(['3M','6M','12M','24M'] as const).map(p => (
                            <button key={p} onClick={() => setCvorPeriod(p)}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${cvorPeriod === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 space-y-4">

                      {/* ── Chart 1: CVOR Rating Trend (full width) ── */}
                      <div>
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Overall CVOR Rating</span>
                          {[
                            { label: 'Safe',       cls: 'bg-emerald-200' },
                            { label: 'Warning',    cls: 'bg-yellow-200' },
                            { label: 'Audit',      cls: 'bg-amber-200' },
                            { label: 'Show Cause+',cls: 'bg-red-200' },
                          ].map(z => (
                            <div key={z.label} className="flex items-center gap-1">
                              <div className={`w-3 h-2 rounded-sm ${z.cls}`}/>
                              <span className="text-[9px] text-slate-400">{z.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="overflow-x-auto">
                          <svg viewBox={`0 0 ${svgW} ${svgH}`} style={{ width:'100%', minWidth:`${Math.min(svgW,560)}px`, height:`${svgH}px` }}>

                            {/* Zone bands */}
                            <rect x={pL} y={yAt(100)} width={cW} height={yAt(cvorThresholds.showCause)-yAt(100)} fill="#fee2e2" opacity="0.55"/>
                            <rect x={pL} y={yAt(cvorThresholds.showCause)} width={cW} height={yAt(cvorThresholds.intervention)-yAt(cvorThresholds.showCause)} fill="#fef3c7" opacity="0.55"/>
                            <rect x={pL} y={yAt(cvorThresholds.intervention)} width={cW} height={yAt(cvorThresholds.warning)-yAt(cvorThresholds.intervention)} fill="#fef9c3" opacity="0.55"/>
                            <rect x={pL} y={yAt(cvorThresholds.warning)} width={cW} height={yAt(0)-yAt(cvorThresholds.warning)} fill="#d1fae5" opacity="0.45"/>

                            {/* Y gridlines */}
                            {[0, 25, 50, 75, 100].map(v => (
                              <g key={v}>
                                <line x1={pL} x2={pL+cW} y1={yAt(v)} y2={yAt(v)} stroke="#f1f5f9" strokeWidth="1"/>
                                <text x={pL-4} y={yAt(v)+4} textAnchor="end" fontSize="8" fill="#94a3b8" fontFamily="monospace">{v}</text>
                              </g>
                            ))}

                            {/* Threshold dashes */}
                            {[cvorThresholds.warning, cvorThresholds.intervention, cvorThresholds.showCause].map(t => (
                              <g key={t}>
                                <line x1={pL} x2={pL+cW} y1={yAt(t)} y2={yAt(t)} stroke="#94a3b8" strokeWidth="0.75" strokeDasharray="4,3" opacity="0.7"/>
                                <text x={pL+cW+3} y={yAt(t)+3} fontSize="7" fill="#94a3b8" fontFamily="monospace">{t}%</text>
                              </g>
                            ))}

                            {/* Area + line */}
                            <path d={mkArea(histData.map(d => d.rating))} fill="#f59e0b" opacity="0.07"/>
                            <path d={mkLine(histData.map(d => d.rating))} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>

                            {/* Dots */}
                            {histData.map((d, i) => {
                              const cx = xAt(i), cy = yAt(d.rating), dc = dotC(d.rating);
                              const isLast = i === n - 1;
                              return (
                                <g key={i}>
                                  <circle cx={cx} cy={cy} r={isLast ? 4 : 2.5} fill={dc} stroke="white" strokeWidth={isLast ? 1.5 : 1}/>
                                  {isLast && <text x={cx+5} y={cy-4} fontSize="9" fontWeight="bold" fill={dc}>{d.rating.toFixed(1)}%</text>}
                                </g>
                              );
                            })}

                            {/* X labels */}
                            {histData.map((d, i) => {
                              if (i % xEvery !== 0 && i !== n - 1) return null;
                              return <text key={i} x={xAt(i)} y={pT+cH+18} textAnchor="middle" fontSize="8" fill="#94a3b8">{lbl(d)}</text>;
                            })}
                          </svg>
                        </div>
                      </div>

                      {/* ── Charts 2 & 3: side by side ── */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">

                        {/* Chart 2: Category threshold % */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category % of Threshold</span>
                            {[{l:'Collisions',c:'#60a5fa'},{l:'Convictions',c:'#f59e0b'},{l:'Inspections',c:'#f87171'}].map(s=>(
                              <div key={s.l} className="flex items-center gap-1">
                                <div className="w-3 h-0.5 rounded" style={{background:s.c}}/>
                                <span className="text-[9px] text-slate-400">{s.l}</span>
                              </div>
                            ))}
                          </div>
                          <div className="overflow-x-auto">
                            <svg viewBox={`0 0 ${svgW} ${svgH2}`} style={{width:'100%',minWidth:`${Math.min(svgW,400)}px`,height:`${svgH2}px`}}>
                              {[0,25,50,75,100].map(v=>(
                                <g key={v}>
                                  <line x1={pL} x2={pL+cW} y1={yAt(v,100,0,cH2)} y2={yAt(v,100,0,cH2)} stroke="#f1f5f9" strokeWidth="1"/>
                                  <text x={pL-4} y={yAt(v,100,0,cH2)+4} textAnchor="end" fontSize="8" fill="#cbd5e1" fontFamily="monospace">{v}</text>
                                </g>
                              ))}
                              <path d={mkLine(histData.map(d=>d.colPctOfThresh),100,0,cH2)} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round"/>
                              <path d={mkLine(histData.map(d=>d.conPctOfThresh),100,0,cH2)} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
                              <path d={mkLine(histData.map(d=>d.insPctOfThresh),100,0,cH2)} fill="none" stroke="#f87171" strokeWidth="1.5" strokeLinejoin="round"/>
                              {histData.map((d,i)=>(
                                <g key={i}>
                                  <circle cx={xAt(i)} cy={yAt(d.colPctOfThresh,100,0,cH2)} r={i===n-1?3:2} fill="#60a5fa"/>
                                  <circle cx={xAt(i)} cy={yAt(d.conPctOfThresh,100,0,cH2)} r={i===n-1?3:2} fill="#f59e0b"/>
                                  <circle cx={xAt(i)} cy={yAt(d.insPctOfThresh,100,0,cH2)} r={i===n-1?3:2} fill="#f87171"/>
                                </g>
                              ))}
                              {histData.map((d,i)=>{
                                if(i%xEvery!==0&&i!==n-1)return null;
                                return <text key={i} x={xAt(i)} y={pT+cH2+18} textAnchor="middle" fontSize="8" fill="#94a3b8">{lbl(d)}</text>;
                              })}
                            </svg>
                          </div>
                        </div>

                        {/* Chart 3: OOS Rates */}
                        <div>
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">OOS Rates</span>
                            {[{l:'Overall',c:'#6366f1'},{l:'Vehicle',c:'#ef4444'},{l:'Driver',c:'#10b981'}].map(s=>(
                              <div key={s.l} className="flex items-center gap-1">
                                <div className="w-3 h-0.5 rounded" style={{background:s.c}}/>
                                <span className="text-[9px] text-slate-400">{s.l}</span>
                              </div>
                            ))}
                            <span className="text-[9px] text-slate-400 ml-1">(dashed = threshold)</span>
                          </div>
                          <div className="overflow-x-auto">
                            <svg viewBox={`0 0 ${svgW} ${svgH2}`} style={{width:'100%',minWidth:`${Math.min(svgW,400)}px`,height:`${svgH2}px`}}>
                              {[0,10,20,30,40].map(v=>(
                                <g key={v}>
                                  <line x1={pL} x2={pL+cW} y1={yAt(v,50,0,cH2)} y2={yAt(v,50,0,cH2)} stroke="#f1f5f9" strokeWidth="1"/>
                                  <text x={pL-4} y={yAt(v,50,0,cH2)+4} textAnchor="end" fontSize="8" fill="#cbd5e1" fontFamily="monospace">{v}</text>
                                </g>
                              ))}
                              {/* threshold dashes */}
                              {([{t:cvorOosThresholds.overall,c:'#6366f1'},{t:cvorOosThresholds.vehicle,c:'#ef4444'},{t:cvorOosThresholds.driver,c:'#10b981'}] as {t:number,c:string}[]).map(({t,c})=>(
                                <line key={t} x1={pL} x2={pL+cW} y1={yAt(t,50,0,cH2)} y2={yAt(t,50,0,cH2)} stroke={c} strokeWidth="0.75" strokeDasharray="5,3" opacity="0.55"/>
                              ))}
                              <path d={mkLine(histData.map(d=>d.oosOverall),50,0,cH2)} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round"/>
                              <path d={mkLine(histData.map(d=>d.oosVehicle),50,0,cH2)} fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
                              <path d={mkLine(histData.map(d=>d.oosDriver), 50,0,cH2)} fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round"/>
                              {histData.map((d,i)=>(
                                <g key={i}>
                                  <circle cx={xAt(i)} cy={yAt(d.oosOverall,50,0,cH2)} r={i===n-1?3:2} fill="#6366f1"/>
                                  <circle cx={xAt(i)} cy={yAt(d.oosVehicle,50,0,cH2)} r={i===n-1?3:2} fill="#ef4444"/>
                                  <circle cx={xAt(i)} cy={yAt(d.oosDriver, 50,0,cH2)} r={i===n-1?3:2} fill="#10b981"/>
                                </g>
                              ))}
                              {histData.map((d,i)=>{
                                if(i%xEvery!==0&&i!==n-1)return null;
                                return <text key={i} x={xAt(i)} y={pT+cH2+18} textAnchor="middle" fontSize="8" fill="#94a3b8">{lbl(d)}</text>;
                              })}
                            </svg>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Monthly data table */}
                    <div className="border-t border-slate-100 overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-slate-50/80">
                            <th className="text-left   px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Period</th>
                            <th className="text-right  px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Rating</th>
                            <th className="text-right  px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Collisions</th>
                            <th className="text-right  px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Convictions</th>
                            <th className="text-right  px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Inspections</th>
                            <th className="text-right  px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Veh OOS</th>
                            <th className="text-center px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">Events</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...histData].reverse().map((d, i) => {
                            const dc = dotC(d.rating);
                            const isLatest = i === 0;
                            return (
                              <tr key={d.reportDate} className={`border-b border-slate-50 transition-colors ${isLatest ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                                <td className="px-4 py-1.5 font-medium text-slate-600">
                                  {d.periodLabel}
                                  {isLatest && <span className="ml-1.5 text-[9px] font-bold bg-amber-100 text-amber-700 px-1 py-0.5 rounded">CURRENT</span>}
                                </td>
                                <td className="px-3 py-1.5 text-right font-bold tabular-nums" style={{color:dc}}>{d.rating.toFixed(2)}%</td>
                                <td className="px-3 py-1.5 text-right text-slate-600 tabular-nums">{d.colPctOfThresh.toFixed(1)}%</td>
                                <td className="px-3 py-1.5 text-right text-slate-600 tabular-nums">{d.conPctOfThresh.toFixed(1)}%</td>
                                <td className="px-3 py-1.5 text-right text-slate-600 tabular-nums">{d.insPctOfThresh.toFixed(1)}%</td>
                                <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${d.oosVehicle > cvorOosThresholds.vehicle ? 'text-red-600' : 'text-emerald-600'}`}>{d.oosVehicle.toFixed(1)}%</td>
                                <td className="px-3 py-1.5 text-center text-slate-500 tabular-nums">{d.collisionEvents}C &middot; {d.convictionEvents}V</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                  </div>
                );
              })()}

"""

# ─────────────────────────────────────────────────────────────────────────────
# APPLY CHANGES
# ─────────────────────────────────────────────────────────────────────────────

# Step 1: Append to inspectionsData.ts
data_path = 'c:/Users/kenan/Full prototpye code/src/pages/inspections/inspectionsData.ts'
with open(data_path, 'r', encoding='utf-8') as f:
    src = f.read()

# Only append if not already there
if 'cvorPeriodicReports' not in src:
    with open(data_path, 'a', encoding='utf-8') as f:
        f.write(DATA_APPEND)
    print('Step 1: Appended CvorPeriodicReport data to inspectionsData.ts')
else:
    print('Step 1: cvorPeriodicReports already exists — skipped')

# Step 2 & 3: InspectionsPage.tsx
page_path = 'c:/Users/kenan/Full prototpye code/src/pages/inspections/InspectionsPage.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'InspectionsPage total lines: {len(lines)}')

# Step 2: Update import
old_import = "import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode, nscRiskBand, nscAnalytics } from './inspectionsData';"
new_import = "import { SUMMARY_CATEGORIES, carrierProfile, inspectionsData, getJurisdiction, getEquivalentCode, nscRiskBand, nscAnalytics, cvorPeriodicReports } from './inspectionsData';"

updated = False
for i, line in enumerate(lines):
    if old_import in line:
        lines[i] = line.replace(old_import, new_import)
        updated = True
        print(f'Step 2: Updated import at line {i+1}')
        break

if not updated:
    # Check if already updated
    if 'cvorPeriodicReports' in ''.join(lines[:40]):
        print('Step 2: Import already updated — skipped')
    else:
        print('Step 2: WARNING — could not find import line to update')

# Step 3: Find line 5512-ish (</div> that closes white card before accordion)
# Find the line with {/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}
inject_after = None
for i, line in enumerate(lines):
    if '[7+8] CATEGORY DETAIL ACCORDION' in line:
        inject_after = i  # inject BEFORE this line
        print(f'Step 3: Found accordion at line {i+1}, will inject charts before it')
        break

if inject_after is None:
    print('Step 3: ERROR — could not find accordion comment')
else:
    new_lines = lines[:inject_after] + [CHART_JSX] + lines[inject_after:]
    with open(page_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'Step 3: Injected chart section. New total lines: {len(new_lines)}')

print('Done.')
