// Script to fix the corrupted NSC Alberta section in InspectionsPage.tsx
// Replaces lines 8298-8323 (the broken grid with leftover hover code)
// with the complete restored grid: Fleet Size, Monitoring, and enhanced Risk Factor card

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, 'src', 'pages', 'inspections', 'InspectionsPage.tsx');
const content = fs.readFileSync(filePath, 'utf-8');
const lines = content.split('\n');

// Lines are 1-indexed, array is 0-indexed
// We want to replace lines 8298-8323 (indices 8297-8322)
const startIdx = 8297; // line 8298
const endIdx = 8322;   // line 8323

const replacement = `              <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Truck size={14} className="text-blue-500" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fleet Size &amp; Exposure</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Power units</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(carrierProfile.cvorAnalysis.counts.trucks)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Drivers</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(carrierProfile.drivers)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Selected-period miles</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(nscAnalytics.periodMiles)}</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Points / MM miles</div>
                    <div className="mt-1 text-base font-black text-slate-900">{formatMetricValue(nscAnalytics.pointsPerMillionMiles, 2)}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg border border-slate-100 bg-red-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-500">Overall OOS</div>
                    <div className="mt-1 text-sm font-black text-red-700">{carrierProfile.cvorAnalysis.counts.oosOverall}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-orange-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Vehicle OOS</div>
                    <div className="mt-1 text-sm font-black text-orange-700">{carrierProfile.cvorAnalysis.counts.oosVehicle}%</div>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-violet-50/70 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Driver OOS</div>
                    <div className="mt-1 text-sm font-black text-violet-700">{carrierProfile.cvorAnalysis.counts.oosDriver}%</div>
                  </div>
                </div>
              </div>

              <div className="xl:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Target size={14} className="text-indigo-500" />
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Monitoring / Intervention</h3>
                </div>
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <span className={\`px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider \${nscRiskBand.badge}\`}>
                    {nscRiskBand.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">{carrierProfile.cvorAnalysis.rating.toFixed(2)}%</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{nscRiskBand.detail}</p>
                <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Warning threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.warning}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Intervention threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.intervention}%</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600">Show-cause threshold</span>
                    <span className="font-mono text-slate-800">{cvorThresholds.showCause}%</span>
                  </div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 leading-relaxed">
                  This band is derived from the configured NSC threshold logic already used in the app.
                </div>
              </div>

              {(() => {
                const RF_LOW = 30, RF_MOD = 70;
                const rfcc = (p: number) => p >= RF_MOD ? '#dc2626' : p >= RF_LOW ? '#d97706' : p > 0 ? '#16a34a' : '#94a3b8';
                const rfcl = (p: number) => p >= RF_MOD ? 'PRIMARY' : p >= RF_LOW ? 'MODERATE' : p > 0 ? 'LOW' : 'NONE';
                const rfcb = (p: number) => p >= RF_MOD ? 'bg-red-100 text-red-700 border-red-300' : p >= RF_LOW ? 'bg-amber-100 text-amber-700 border-amber-300' : p > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-300';
                const rfctile = (p: number) => p >= RF_MOD ? 'bg-red-50/70 border-red-200' : p >= RF_LOW ? 'bg-amber-50/70 border-amber-200' : p > 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50/70 border-slate-200';
                const RF_C_GRAD = 'linear-gradient(to right,#22c55e 0%,#84cc16 18%,#eab308 32%,#f97316 58%,#ef4444 80%,#991b1b 100%)';
                const rfScore = ALBERTA_NSC_PERFORMANCE_CARD.rFactor;
                const rfThr = ALBERTA_NSC_PERFORMANCE_CARD.stageThresholds;
                const rfS4Low = rfThr.find(t => t.stage === 4)?.low ?? 1.105;
                const rfRMax = rfS4Low * 1.65;
                const rfMarkerPct = Math.min((rfScore / rfRMax) * 100, 99.5);
                const rfTP = rfThr.map(t => ({ ...t, pct: (t.low / rfRMax) * 100 }));
                const rfGS = (r: number) => { for (let i = rfThr.length - 1; i >= 0; i--) if (r >= rfThr[i].low) return rfThr[i].stage; return 0; };
                const rfStage = rfGS(rfScore);
                const rfSC = (s: number) => s === 0 ? '#16a34a' : s === 1 ? '#b45309' : s === 2 ? '#d97706' : s === 3 ? '#dc2626' : '#7f1d1d';
                const rfScoreColor = rfSC(rfStage);
                const RF_GRAD = 'linear-gradient(to right,#22c55e 0%,#84cc16 18%,#eab308 32%,#f97316 52%,#ef4444 70%,#991b1b 100%)';
                const rfZones = [
                  { label: 'NOT MONITORED', start: 0, end: rfTP[0]?.pct ?? 27, color: '#16a34a', desc: 'Below Stage 1 \\u2014 performance acceptable.' },
                  { label: 'STAGE 1', start: rfTP[0]?.pct ?? 27, end: rfTP[1]?.pct ?? 40, color: '#b45309', desc: 'Stage 1: corrective measures needed.' },
                  { label: 'STAGE 2', start: rfTP[1]?.pct ?? 40, end: rfTP[2]?.pct ?? 55, color: '#d97706', desc: 'Stage 2: action plan required.' },
                  { label: 'STAGE 3', start: rfTP[2]?.pct ?? 55, end: rfTP[3]?.pct ?? 70, color: '#dc2626', desc: 'Stage 3: compliance review required.' },
                  { label: 'STAGE 4', start: rfTP[3]?.pct ?? 70, end: 100, color: '#7f1d1d', desc: 'Stage 4: imminent enforcement.' },
                ];
                const cd = [
                  { key: 'conv', label: 'Convictions', pct: ALBERTA_NSC_PERFORMANCE_CARD.contributions.convictions.pct, events: ALBERTA_NSC_PERFORMANCE_CARD.contributions.convictions.events, desc: 'Conviction activity from drivers and vehicles contributing to R-Factor.' },
                  { key: 'adm', label: 'Admin Penalties', pct: ALBERTA_NSC_PERFORMANCE_CARD.contributions.adminPenalties.pct, events: ALBERTA_NSC_PERFORMANCE_CARD.contributions.adminPenalties.events, desc: 'Administrative penalties and compliance notices issued against carrier.' },
                  { key: 'cvsa', label: 'CVSA Inspections', pct: ALBERTA_NSC_PERFORMANCE_CARD.contributions.cvsaInspections.pct, events: ALBERTA_NSC_PERFORMANCE_CARD.contributions.cvsaInspections.events, desc: 'CVSA roadside inspection outcomes including OOS orders.' },
                  { key: 'col', label: 'Reportable Collisions', pct: ALBERTA_NSC_PERFORMANCE_CARD.contributions.reportableCollisions.pct, events: ALBERTA_NSC_PERFORMANCE_CARD.contributions.reportableCollisions.events, desc: 'Reportable collisions contributing to R-Factor.' },
                ];
                const totalEv = cd.reduce((s, c) => s + c.events, 0);
                return (
                  <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full">
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-emerald-500" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800">Risk Factor</h3>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 italic">(dynamically calculated based on profile request date)</div>
                    </div>
                    <div className="mb-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="text-[28px] leading-none font-black tracking-tight font-mono" style={{ color: rfScoreColor }}>{rfScore.toFixed(3)}</div>
                        <div className="pt-0.5 space-y-1">
                          <span className={\`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border \${rfStage === 0 ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}\`}>{rfStage === 0 ? 'NOT MONITORED' : \`STAGE \${rfStage}\`}</span>
                          <div className="text-[10px] text-slate-400">Fleet {ALBERTA_NSC_PERFORMANCE_CARD.fleetRange} \\u00b7 {ALBERTA_NSC_PERFORMANCE_CARD.fleetType}</div>
                        </div>
                      </div>
                      <div className="relative" style={{ paddingTop: 22 }}>
                        <div className="absolute z-10 flex flex-col items-center pointer-events-none" style={{ left: \`\${rfMarkerPct}%\`, transform: 'translateX(-50%)', top: 0 }}>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white whitespace-nowrap shadow-md" style={{ background: rfScoreColor }}>{rfScore.toFixed(3)}</span>
                          <div className="w-[2px] h-2.5" style={{ background: rfScoreColor }}/>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full translate-y-0.5 blur-sm opacity-25" style={{ background: RF_GRAD }}/>
                          <div className="relative h-[16px] rounded-full overflow-hidden" style={{ background: RF_GRAD, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.22)' }}>
                            <div className="absolute top-0 left-0 right-0 h-[6px] rounded-t-full" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                            {rfTP.map(t => (<div key={t.stage} className="absolute top-0 bottom-0 w-[1.5px] bg-white/50" style={{ left: \`\${t.pct}%\` }}/>))}
                            <div className="absolute top-0 bottom-0 w-[3px] rounded-full" style={{ left: \`\${rfMarkerPct}%\`, transform: 'translateX(-50%)', background: '#fff', boxShadow: '0 0 6px 2px rgba(0,0,0,0.32)' }}/>
                          </div>
                          <div className="absolute inset-0 rounded-full overflow-hidden">
                            {rfZones.map(z => {
                              const cur = rfStage === 0 ? z.label === 'NOT MONITORED' : z.label === \`STAGE \${rfStage}\`;
                              return (<div key={z.label} className="absolute inset-y-0 group/rfz cursor-crosshair" style={{ left: \`\${z.start}%\`, width: \`\${z.end - z.start}%\` }}>
                                <div className="absolute inset-0 bg-white/0 group-hover/rfz:bg-white/20 transition-colors duration-150 rounded"/>
                                <div className="hidden group-hover/rfz:block absolute z-50 pointer-events-none" style={{ bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)', width: 230 }}>
                                  <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background: '#0f172a' }}>
                                    <div className="px-3 py-2 flex items-center justify-between" style={{ background: z.color }}>
                                      <span className="text-white font-black text-[11px] tracking-wide">{z.label}</span>
                                      {z.label !== 'NOT MONITORED' && <span className="text-white/80 text-[10px] font-mono font-bold">{rfThr.find(t => \`STAGE \${t.stage}\` === z.label)?.low.toFixed(3)}+</span>}
                                    </div>
                                    <div className="px-3 py-2.5 space-y-1.5">
                                      {cur && <div className="flex items-center justify-between bg-white/5 rounded-lg px-2 py-1"><span className="text-[9px] text-slate-400 uppercase tracking-wider">Current</span><span className="text-[12px] font-black text-white">{rfScore.toFixed(3)}</span></div>}
                                      <div className="text-[10px] text-slate-300 leading-relaxed">{z.desc}</div>
                                      <div className="pt-1.5 border-t border-slate-700/60">
                                        <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Stage Thresholds</div>
                                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">{rfThr.map(t => (<div key={t.stage} className="flex items-center justify-between"><span className="text-[9px]" style={{ color: rfSC(t.stage) }}>Stage {t.stage}</span><span className="text-[10px] font-bold font-mono text-white">{'\\u2265'} {t.low.toFixed(3)}</span></div>))}</div>
                                      </div>
                                    </div>
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #0f172a' }}/>
                                  </div>
                                </div>
                              </div>);
                            })}
                          </div>
                        </div>
                        <div className="relative mt-1" style={{ height: 12 }}>
                          <span className="absolute text-[8px] font-bold text-emerald-700" style={{ left: '0%' }}>SAFE</span>
                          {rfTP.map(t => (<span key={t.stage} className="absolute text-[8px] font-bold" style={{ left: \`\${t.pct}%\`, transform: 'translateX(-50%)', color: rfSC(t.stage) }}>S{t.stage}</span>))}
                        </div>
                      </div>
                      <div className="flex items-center mt-0.5 text-[9px] text-slate-400">
                        <span className="font-semibold text-slate-500">NSC Thresholds</span>
                        {rfThr.map(t => (<span key={t.stage} className="ml-1.5" style={{ color: rfSC(t.stage) }}>{'\\u00b7'} S{t.stage} {'\\u2265'} {t.low.toFixed(3)}</span>))}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <div className="mb-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contribution to R-Factor</div>
                        <div className="text-[9px] text-slate-400 mt-0.5 italic">(dynamically calculated based on profile request date)</div>
                      </div>
                      {cd.map(({ key, label, pct, events, desc }) => (
                        <div key={key} className={\`relative rounded-xl border p-3 \${rfctile(pct)} group/ctile\`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
                            <span className={\`text-[9px] font-bold px-1.5 py-0.5 rounded border \${rfcb(pct)}\`}>{rfcl(pct)}</span>
                          </div>
                          <div className="text-[22px] leading-none font-black my-0.5 font-mono" style={{ color: rfcc(pct) }}>{pct.toFixed(1)}%</div>
                          <div className="text-[10px] text-slate-600 mb-0.5">{events} {events === 1 ? 'event' : 'events'} \\u00b7 {pct.toFixed(1)}% impact</div>
                          <div className="relative group/binfo">
                            <div className="relative h-[6px] rounded-full overflow-hidden cursor-pointer" style={{ background: RF_C_GRAD, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.20)' }}>
                              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: 'linear-gradient(to bottom,rgba(255,255,255,0.28),transparent)' }}/>
                              <div className="absolute top-0 bottom-0 bg-slate-900/30 rounded-r-full" style={{ left: \`\${Math.min(pct, 100)}%\`, right: 0 }}/>
                              <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow" style={{ left: \`\${Math.min(pct, 100)}%\`, transform: 'translateX(-50%)' }}/>
                              {[RF_LOW, RF_MOD].map(t => (<div key={t} className="absolute top-0 bottom-0 w-px bg-white/50" style={{ left: \`\${t}%\` }}/>))}
                            </div>
                            <div className="flex justify-between text-[8px] mt-0.5 text-slate-400"><span>LOW {RF_LOW}%</span><span>MOD {RF_MOD}%</span><span>HIGH</span></div>
                            <div className="hidden group-hover/binfo:block absolute z-50 pointer-events-none" style={{ bottom: 'calc(100% + 28px)', left: '50%', transform: 'translateX(-50%)', width: 230 }}>
                              <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background: '#0f172a' }}>
                                <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: rfcc(pct) }}>
                                  <span className="text-white font-black text-[11px] uppercase tracking-wide">{label}</span>
                                  <span className="text-white/90 text-[12px] font-mono font-bold">{pct.toFixed(1)}%</span>
                                </div>
                                <div className="px-3.5 py-2.5 space-y-1.5">
                                  <div className="flex justify-between text-[11px]"><span className="text-slate-400">Level</span><span className="font-bold" style={{ color: rfcc(pct) }}>{rfcl(pct)}</span></div>
                                  <div className="flex justify-between text-[11px]"><span className="text-slate-400">Event Count</span><span className="font-bold text-white">{events}</span></div>
                                  <div className="flex justify-between text-[11px]"><span className="text-slate-400">R-Factor Impact</span><span className="font-bold text-white">{pct.toFixed(1)}%</span></div>
                                  <div className="text-[10px] text-slate-400 leading-relaxed pt-1 border-t border-slate-700/60">{desc}</div>
                                  <div className="pt-1.5 border-t border-slate-700/60">
                                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1">Levels</div>
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                      {([{ n: 'None', v: 0, c: '#94a3b8' }, { n: 'Low', v: RF_LOW, c: '#16a34a' }, { n: 'Moderate', v: RF_MOD, c: '#d97706' }, { n: 'Current', v: pct, c: rfcc(pct) }] as { n: string; v: number; c: string }[]).map(th => (
                                        <div key={th.n} className="flex items-center justify-between"><span className="text-[9px]" style={{ color: th.c }}>{th.n}</span><span className="text-[10px] font-bold font-mono text-white">{th.v.toFixed(1)}%</span></div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="px-3.5 pb-2">
                                  <div className="relative h-[5px] rounded-full overflow-hidden" style={{ background: RF_C_GRAD }}>
                                    <div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: \`\${RF_LOW}%\` }}/><div className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: \`\${RF_MOD}%\` }}/>
                                    <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow-md" style={{ left: \`\${Math.min(pct, 100)}%\`, transform: 'translateX(-50%)' }}/>
                                  </div>
                                  <div className="flex justify-between text-[8px] mt-0.5"><span style={{ color: '#16a34a' }}>LOW {RF_LOW}%</span><span style={{ color: '#d97706' }}>MOD {RF_MOD}%</span><span style={{ color: '#dc2626' }}>HIGH</span></div>
                                </div>
                                <div className="px-3.5 py-2 bg-slate-800/50 border-t border-slate-700/60">
                                  <div className="text-[10px] text-slate-400">{events} event{events !== 1 ? 's' : ''} \\u00b7 {pct.toFixed(1)}% impact</div>
                                  <div className="text-[10px] font-bold mt-0.5" style={{ color: rfcc(pct) }}>{rfcl(pct)} contribution to R-Factor</div>
                                </div>
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #0f172a' }}/>
                              </div>
                            </div>
                          </div>
                          <div className="hidden group-hover/ctile:block absolute z-40 pointer-events-none" style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 240 }}>
                            <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
                              <div className="px-3.5 py-2 flex items-center justify-between" style={{ background: rfcc(pct) }}>
                                <span className="text-white font-black text-[11px] uppercase tracking-wider">{label}</span>
                                <span className="text-white font-black text-[13px]">{pct.toFixed(1)}%</span>
                              </div>
                              <div className="px-3.5 py-2.5 space-y-1">
                                <div className="flex justify-between text-[11px]"><span className="text-slate-500">Level</span><span className="font-bold" style={{ color: rfcc(pct) }}>{rfcl(pct)}</span></div>
                                <div className="flex justify-between text-[11px]"><span className="text-slate-500">Event Count</span><span className="font-bold text-slate-800">{events}</span></div>
                                <div className="flex justify-between text-[11px]"><span className="text-slate-500">R-Factor Impact</span><span className="font-bold text-slate-800">{pct.toFixed(1)}%</span></div>
                                <div className="text-[10px] text-slate-400 italic leading-relaxed pt-1">{desc}</div>
                              </div>
                              <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100">
                                <div className="text-[10px] text-slate-500">{events} event{events !== 1 ? 's' : ''} \\u00b7 {pct.toFixed(1)}% impact</div>
                                <div className="text-[10px] font-bold mt-0.5" style={{ color: rfcc(pct) }}>{rfcl(pct)} contribution to R-Factor</div>
                              </div>
                              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #f8fafc' }}/>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="relative rounded-xl border p-3 mt-1 bg-slate-50/70 border-slate-200 group/ttile">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Total R-Factor</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-300">{totalEv} events</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <div className="text-[22px] leading-none font-black font-mono" style={{ color: rfScoreColor }}>{rfScore.toFixed(3)}</div>
                          <span className="text-[11px] text-slate-500 font-semibold">R-Factor Score</span>
                        </div>
                        <div className="relative mt-2">
                          <div className="relative h-[6px] rounded-full overflow-hidden" style={{ background: RF_GRAD, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.18)' }}>
                            {rfTP.map(t => (<div key={t.stage} className="absolute top-0 bottom-0 w-px bg-white/60" style={{ left: \`\${t.pct}%\` }}/>))}
                            <div className="absolute top-0 bottom-0 w-[2px] bg-white shadow" style={{ left: \`\${rfMarkerPct}%\`, transform: 'translateX(-50%)' }}/>
                          </div>
                          <div className="flex justify-between text-[8px] mt-0.5 text-slate-400">
                            <span className="text-emerald-600">SAFE</span>
                            {rfTP.map(t => (<span key={t.stage} style={{ color: rfSC(t.stage) }}>S{t.stage}</span>))}
                          </div>
                        </div>
                        <div className="hidden group-hover/ttile:block absolute z-40 pointer-events-none" style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', width: 260 }}>
                          <div className="rounded-xl shadow-2xl overflow-hidden border border-slate-700" style={{ background: '#0f172a' }}>
                            <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: rfScoreColor }}>
                              <span className="text-white font-black text-[12px] tracking-wide">TOTAL R-FACTOR</span>
                              <span className="text-white font-black text-[14px] font-mono">{rfScore.toFixed(3)}</span>
                            </div>
                            <div className="px-4 py-3 space-y-1.5">
                              <div className="flex justify-between text-[11px]"><span className="text-slate-400">Monitoring Stage</span><span className="font-bold text-white">{rfStage === 0 ? 'Not Monitored' : \`Stage \${rfStage}\`}</span></div>
                              <div className="flex justify-between text-[11px]"><span className="text-slate-400">Total Events</span><span className="font-bold text-white">{totalEv}</span></div>
                              <div className="flex justify-between text-[11px]"><span className="text-slate-400">Fleet Range</span><span className="font-bold text-white">{ALBERTA_NSC_PERFORMANCE_CARD.fleetRange}</span></div>
                              <div className="pt-2 border-t border-slate-700/60">
                                <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-1.5">Breakdown</div>
                                {cd.map(c => (<div key={c.key} className="flex items-center justify-between mb-1"><div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: rfcc(c.pct) }}/><span className="text-[10px] text-slate-300">{c.label}</span></div><span className="text-[10px] font-bold font-mono text-white">{c.pct.toFixed(1)}%</span></div>))}
                              </div>
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0" style={{ borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #0f172a' }}/>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center pt-1.5 text-[9px] text-slate-400">
                        <span className="font-semibold text-slate-500">Contribution Levels</span>
                        &nbsp;&middot;&nbsp;<span style={{ color: '#16a34a' }}>Low &lt;{RF_LOW}%</span>
                        &nbsp;&middot;&nbsp;<span style={{ color: '#d97706' }}>Moderate {RF_LOW}&ndash;{RF_MOD}%</span>
                        &nbsp;&middot;&nbsp;<span style={{ color: '#dc2626' }}>Primary &gt;{RF_MOD}%</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>`;

// Build new file content
const before = lines.slice(0, startIdx);
const after = lines.slice(endIdx + 1);
const newContent = [...before, replacement, ...after].join('\n');

fs.writeFileSync(filePath, newContent, 'utf-8');
console.log(`Done! Replaced lines ${startIdx + 1}-${endIdx + 1} with new content.`);
console.log(`Old line count: ${lines.length}`);
console.log(`New line count: ${newContent.split('\\n').length}`);
