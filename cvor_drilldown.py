#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys; sys.stdout.reconfigure(encoding='utf-8')

DRILLDOWN = r"""                      {/* ══ INSPECTIONS DRILL-DOWN ══ */}
                      {cvorSelectedPull && (() => {
                        const pullObj = cvorPeriodicReports.find(d => d.reportDate === cvorSelectedPull);
                        if (!pullObj) return null;
                        const win = windowOf(cvorSelectedPull);

                        // All inspections inside this 24-month window, newest first
                        const pullInspections = [...inspectionsData]
                          .filter(r => { const rd = new Date(r.date); return rd >= win.start && rd <= win.end; })
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                        // Per-inspection CVOR point helper
                        const calcCvor = (r: any) => {
                          const veh = r.cvorPoints?.vehicle ?? (r.violations||[]).filter((v:any)=>!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
                          const dvr = r.cvorPoints?.driver  ?? (r.violations||[]).filter((v:any)=>!!v.driverViolation).reduce((s:number,v:any)=>s+(v.points||0),0);
                          const cvr = r.cvorPoints?.cvor    ?? veh + dvr;
                          return { veh, dvr, cvr };
                        };

                        // Totals across all in-window inspections
                        const totalCvrPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).cvr,0);
                        const totalVehPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).veh,0);
                        const totalDvrPts  = pullInspections.reduce((s,r)=>s+calcCvor(r).dvr,0);
                        const oosCount     = pullInspections.filter(r=>r.hasOOS).length;
                        const cleanCount   = pullInspections.filter(r=>r.isClean).length;
                        const withPtsCount = pullInspections.filter(r=>calcCvor(r).cvr>0).length;

                        return (
                          <div className="border-t-2 border-indigo-200 pt-5">

                            {/* ── Section title ── */}
                            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-10 bg-indigo-500 rounded-full flex-shrink-0"/>
                                <div>
                                  <div className="text-sm font-bold text-slate-800">
                                    CVOR Inspections — {pullObj.periodLabel} Pull
                                  </div>
                                  <div className="text-[11px] text-indigo-600 font-mono font-semibold">
                                    24-month window: {win.label}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Inspections in this window drive the CVOR rating of <span className="font-bold text-slate-700">{pullObj.rating.toFixed(2)}%</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => setCvorSelectedPull(null)}
                                className="text-slate-400 hover:text-slate-700 text-xs border border-slate-200 hover:border-slate-400 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                                × Close
                              </button>
                            </div>

                            {/* ── Impact summary cards ── */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
                              {[
                                { label:'Total Inspections', val: String(pullInspections.length), sub:'in 24-mo window',   color:'text-slate-800', bg:'bg-slate-50',   border:'border-slate-200' },
                                { label:'With CVOR Impact',  val: String(withPtsCount),            sub:'have CVOR points',  color:'text-red-700',   bg:'bg-red-50',     border:'border-red-200' },
                                { label:'OOS',               val: String(oosCount),                sub:'out-of-service',    color:'text-red-700',   bg:'bg-red-50',     border:'border-red-200' },
                                { label:'Clean',             val: String(cleanCount),              sub:'no violations',     color:'text-emerald-700',bg:'bg-emerald-50',border:'border-emerald-200' },
                                { label:'Total Veh Pts',     val: String(totalVehPts),             sub:'vehicle CVOR pts',  color:'text-orange-700',bg:'bg-orange-50', border:'border-orange-200' },
                                { label:'Total Dvr Pts',     val: String(totalDvrPts),             sub:'driver CVOR pts',   color:'text-amber-700', bg:'bg-amber-50',  border:'border-amber-200' },
                                { label:'Total CVOR Pts',    val: String(totalCvrPts),             sub:'combined impact',   color:'text-indigo-700',bg:'bg-indigo-50', border:'border-indigo-200' },
                              ].map(c => (
                                <div key={c.label} className={`${c.bg} border ${c.border} rounded-xl px-3 py-3`}>
                                  <div className={`text-xl font-black ${c.color} leading-none`}>{c.val}</div>
                                  <div className="text-[10px] font-bold text-slate-600 mt-1 leading-tight">{c.label}</div>
                                  <div className="text-[9px] text-slate-400 mt-0.5">{c.sub}</div>
                                </div>
                              ))}
                            </div>

                            {/* ── CVOR category contribution breakdown ── */}
                            <div className="grid grid-cols-3 gap-3 mb-5">
                              {[
                                { label:'Collisions',   pct: pullObj.colContrib, threshold: pullObj.colPctOfThresh, weight: 40, color:'blue',   events: pullObj.collisionEvents,   pts: pullObj.totalCollisionPoints },
                                { label:'Convictions',  pct: pullObj.conContrib, threshold: pullObj.conPctOfThresh, weight: 40, color:'amber',  events: pullObj.convictionEvents,  pts: pullObj.convictionPoints },
                                { label:'Inspections',  pct: pullObj.insContrib, threshold: pullObj.insPctOfThresh, weight: 20, color:'red',    events: pullInspections.length,    pts: totalCvrPts },
                              ].map(cat => {
                                const barW = Math.min(100, cat.threshold);
                                const barColor = cat.color === 'blue' ? '#3b82f6' : cat.color === 'amber' ? '#d97706' : '#dc2626';
                                const bgColor  = cat.color === 'blue' ? 'bg-blue-50 border-blue-200' : cat.color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';
                                const textColor = cat.color === 'blue' ? 'text-blue-700' : cat.color === 'amber' ? 'text-amber-700' : 'text-red-700';
                                return (
                                  <div key={cat.label} className={`border rounded-xl p-3 ${bgColor}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`text-[11px] font-bold uppercase tracking-wider ${textColor}`}>{cat.label}</span>
                                      <span className="text-[9px] text-slate-400 bg-white/70 px-1.5 py-0.5 rounded font-mono">{cat.weight}% weight</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-1">
                                      <span className={`text-2xl font-black ${textColor}`}>{cat.pct.toFixed(2)}%</span>
                                      <span className="text-[10px] text-slate-400">contribution</span>
                                    </div>
                                    {/* Threshold bar */}
                                    <div className="mt-2 mb-1.5">
                                      <div className="flex justify-between text-[8.5px] text-slate-400 mb-0.5">
                                        <span>% of threshold used</span>
                                        <span className="font-bold" style={{color:barColor}}>{cat.threshold.toFixed(1)}%</span>
                                      </div>
                                      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden border border-white">
                                        <div className="h-full rounded-full transition-all" style={{width:`${Math.min(barW,100)}%`, background:barColor}}/>
                                      </div>
                                    </div>
                                    <div className="flex gap-3 text-[9.5px] text-slate-500 mt-1.5">
                                      <span>{cat.events} events</span>
                                      <span>·</span>
                                      <span>{cat.pts} pts</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* ── Inspections list ── */}
                            {pullInspections.length === 0 ? (
                              <div className="py-12 flex flex-col items-center gap-3 border border-dashed border-slate-200 rounded-xl text-slate-400">
                                <div className="text-4xl">📋</div>
                                <div className="text-sm font-semibold">No inspections in this 24-month window</div>
                                <div className="text-xs font-mono text-indigo-400">{win.label}</div>
                              </div>
                            ) : (
                              <div className="border border-slate-200 rounded-xl overflow-hidden">
                                {/* Column header — matches InspectionRow CVOR layout */}
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
                                      <InspectionRow
                                        key={record.id + '-' + ri}
                                        record={record}
                                        cvorOverride={{ vehPts: pts.veh, dvrPts: pts.dvr, cvrPts: pts.cvr }}
                                      />
                                    );
                                  })}
                                </div>
                                {/* Footer totals */}
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
"""

with open('src/pages/inspections/InspectionsPage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the drill-down block start and end
dd_start = next(i for i, l in enumerate(lines) if '{/* ══ INSPECTIONS DRILL-DOWN ══ */}' in l)
# End is the closing of the IIFE return block + closing tags
# We need to find: the line after the drilldown closing before the accordion
accordion_line = next(i for i, l in enumerate(lines) if '{/* ── [7+8] CATEGORY DETAIL ACCORDION ── */}' in l and i > dd_start)
# The drilldown should close before two closing lines: })()}\n and then </div>\n then </div>\n then })()}\n
# Let's find the closing of the chart IIFE return by finding `})()}` after dd_start and before accordion
# The structure is: ... drilldown ... </div> (closes space-y-8) </div> (closes chart card) })()}  then accordion
# Let's search backwards from accordion for the `})()}`
dd_end = accordion_line
for i in range(accordion_line - 1, dd_start, -1):
    if '})()}' in lines[i]:
        dd_end = i + 1  # include this line
        break

print(f"Drill-down block: lines {dd_start+1}–{dd_end}")
print(f"Accordion at: {accordion_line+1}")

# Replace from dd_start to dd_end (exclusive) — keep closing lines
# The closing lines after drilldown (before accordion):
#   </div>  (closes p-5 space-y-8)
#   </div>  (closes chart card outer div)
#   })()}   (closes chart IIFE)
closing_lines = lines[dd_end:accordion_line]

new_lines = (
    lines[:dd_start]
    + [DRILLDOWN + '\n']
    + closing_lines
    + lines[accordion_line:]
)

with open('src/pages/inspections/InspectionsPage.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Done. New total: {len(new_lines)} lines")
