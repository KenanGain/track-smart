filepath = r"c:\Users\kenan\Full prototpye code\src\pages\safety-analysis\SafetyAnalysisPage.tsx"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Add LayoutGrid + List icons ──
content = content.replace(
    "  ChevronLeft,\n} from 'lucide-react';",
    "  ChevronLeft,\n  LayoutGrid,\n  List,\n} from 'lucide-react';",
    1
)

# ── 2. Add driverView / assetView state ──
content = content.replace(
    "  const [impactView, setImpactView] = useState<'negative' | 'positive'>('negative');",
    "  const [impactView, setImpactView] = useState<'negative' | 'positive'>('negative');\n  const [driverView, setDriverView] = useState<'grid' | 'list'>('grid');\n  const [assetView, setAssetView] = useState<'grid' | 'list'>('grid');",
    1
)

# ── 3. Add status to assetRiskItemsRaw ──
content = content.replace(
    """        riskLabel: getRiskMeta(score).shortLabel,
        placeholder: false,
      };
    })
    .sort((a, b) => b.score - a.score);""",
    """        riskLabel: getRiskMeta(score).shortLabel,
        status: asset.operationalStatus,
        placeholder: false,
      };
    })
    .sort((a, b) => b.score - a.score);""",
    1
)

# ── 4. Add impactByDriverId + assetListItems after impactDrivers ──
content = content.replace(
    "  // \u2500\u2500 Tab labels for export \u2500\u2500",
    """  const impactByDriverId = Object.fromEntries(impactDrivers.map(d => [d.driverId, d.impact]));

  const assetListItems = [...INITIAL_ASSETS].map(asset => ({
    id: asset.id,
    unitNumber: asset.unitNumber,
    makeModel: `${asset.make} ${asset.model}`,
    year: asset.year,
    status: asset.operationalStatus,
    score: getAssetRiskScore(asset),
  })).sort((a, b) => b.score - a.score);

  // \u2500\u2500 Tab labels for export \u2500\u2500""",
    1
)

# ── 5. Improve DriverBehaviorChart: dynamic y-range, wider bars, avg label ──
old_chart_consts = """  const W = 500, H = 160, PL = 28, PR = 8, PT = 8, PB = 22;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const SMIN = 62, SMAX = 100;
  const sy = (s: number) => PT + plotH * (1 - (s - SMIN) / (SMAX - SMIN));
  const avgY = sy(FLEET_AVERAGE);
  const xStep = plotW / 7;
  const BAR_W = 5;"""

new_chart_consts = """  const W = 500, H = 170, PL = 32, PR = 10, PT = 10, PB = 24;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const SMIN = Math.max(50, Math.floor((drv.overall - 22) / 5) * 5);
  const SMAX = 100;
  const sy = (s: number) => PT + plotH * (1 - (s - SMIN) / (SMAX - SMIN));
  const avgY = sy(FLEET_AVERAGE);
  const xStep = plotW / 7;
  const BAR_W = 7;"""

content = content.replace(old_chart_consts, new_chart_consts, 1)

# Update chart height style too
content = content.replace(
    '          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 158 }}>',
    '          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 170 }}>',
    1
)

# Update y-tick values to dynamic range
content = content.replace(
    "            {[70, 80, 90, 100].map(t => (\n              <g key={t}>",
    "            {[SMIN, SMIN + Math.round((SMAX-SMIN)*0.33), SMIN + Math.round((SMAX-SMIN)*0.66), SMAX].map(t => (\n              <g key={t}>",
    1
)

# Add fleet average label after the dashed line
content = content.replace(
    "            {/* fleet avg dashed */}\n            <line x1={PL} y1={avgY} x2={W - PR} y2={avgY} stroke=\"#cbd5e1\" strokeWidth=\"0.8\" strokeDasharray=\"3,2\" />",
    """            {/* fleet avg dashed */}
            <line x1={PL} y1={avgY} x2={W - PR} y2={avgY} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
            <text x={W - PR + 2} y={avgY + 3} fontSize="7" fill="#94a3b8">avg</text>""",
    1
)

# ── 6. Replace entire dashboard section ──
dashboard_start = "        {/* ===== SAFETY DASHBOARD RINGS ===== */}"
# Find asset popup end
asset_popup_end = "        )}\n\n      </div>\n    </div>\n  );\n}"

idx_start = content.find(dashboard_start)
idx_end_marker = content.rfind(asset_popup_end)

if idx_start == -1:
    print("ERROR: dashboard start not found")
elif idx_end_marker == -1:
    print("ERROR: asset popup end not found")
else:
    before = content[:idx_start]
    after_end = "\n\n      </div>\n    </div>\n  );\n}"

    new_dashboard = r"""        {/* ===== KPI BANNER ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {([
            { label: 'Active Drivers',     value: NUM_ACTIVE_DRIVERS, color: 'text-blue-700', bg: 'bg-blue-50',    border: 'border-blue-200',    icon: '👤' },
            { label: 'Fleet Safety Score', value: `${FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(1)}%`, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🛡' },
            { label: 'OOS Violations',     value: totalOosCount,      color: 'text-red-700',   bg: 'bg-red-50',    border: 'border-red-200',     icon: '🚫' },
            { label: 'Open Cases',         value: totalOpenCount,     color: 'text-amber-700', bg: 'bg-amber-50',  border: 'border-amber-200',   icon: '📋' },
            { label: 'Clean Inspections',  value: `${cleanInspectionsRate}%`, color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200', icon: '✅' },
          ] as { label: string; value: string | number; color: string; bg: string; border: string; icon: string }[]).map(kpi => (
            <div key={kpi.label} className={`${kpi.bg} ${kpi.border} border rounded-xl px-4 py-3 flex items-center gap-3`}>
              <span className="text-2xl leading-none">{kpi.icon}</span>
              <div>
                <div className={`text-xl font-black leading-none ${kpi.color}`}>{kpi.value}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ===== SCORE SCALE ===== */}
        <div className="bg-white border border-slate-200 rounded-xl px-5 pt-4 pb-3 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Safety Score Scale</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Fleet:</span>
              <span className={`text-sm font-black ${getScoreColor(FLEET_SAFETY_SCORES.fleetSafetyScore)}`}>{FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(1)}%</span>
              <span className={`text-xs ${getRatingStyle(FLEET_SAFETY_SCORES.fleetSafetyRating)}`}>{FLEET_SAFETY_SCORES.fleetSafetyRating}</span>
            </div>
          </div>
          <div className="flex mb-1.5">
            <div className="text-center" style={{flex:'40 0 0%'}}><div className="text-[10px] font-bold text-slate-700">Very Poor</div><div className="text-[9px] text-slate-400">0–39</div></div>
            <div className="text-center" style={{flex:'10 0 0%'}}><div className="text-[10px] font-bold text-slate-700">Poor</div><div className="text-[9px] text-slate-400">40–49</div></div>
            <div className="text-center" style={{flex:'5 0 0%'}}><div className="text-[10px] font-bold text-slate-700">Fair</div><div className="text-[9px] text-slate-400">50–54</div></div>
            <div className="text-center" style={{flex:'15 0 0%'}}><div className="text-[10px] font-bold text-slate-700">Good</div><div className="text-[9px] text-slate-400">55–69</div></div>
            <div className="text-center" style={{flex:'30 0 0%'}}><div className="text-[10px] font-bold text-slate-700">Excellent</div><div className="text-[9px] text-slate-400">70–100</div></div>
          </div>
          <div className="relative flex h-6 rounded-lg overflow-hidden">
            <div style={{flex:'40 0 0%'}} className="bg-orange-600" />
            <div style={{flex:'10 0 0%'}} className="bg-orange-300" />
            <div style={{flex:'5 0 0%'}} className="bg-slate-200" />
            <div style={{flex:'15 0 0%'}} className="bg-sky-300" />
            <div style={{flex:'30 0 0%'}} className="bg-blue-600" />
          </div>
          <div className="relative h-5 mt-0.5">
            <div className="absolute flex flex-col items-center" style={{ left: `${FLEET_SAFETY_SCORES.fleetSafetyScore}%`, transform: 'translateX(-50%)' }}>
              <div className="w-px h-2.5 bg-slate-700" />
              <div className="text-[9px] font-bold text-slate-700 bg-white px-1 rounded whitespace-nowrap">{FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(0)}</div>
            </div>
          </div>
        </div>

        {/* ===== SAFETY DASHBOARD RINGS ===== */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 lg:p-7 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800">Safety Dashboard</h2>
              <p className="text-sm text-slate-500 mt-0.5">Carrier Risk is blue. All supporting charts are green with hover insights.</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 self-start sm:self-auto">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fleet Safety Rating</span>
              <span className={getRatingStyle(FLEET_SAFETY_SCORES.fleetSafetyRating)}>{FLEET_SAFETY_SCORES.fleetSafetyRating}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 items-stretch">
            <div className="relative group bg-gradient-to-b from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-5 flex flex-col items-center justify-center">
              <SafetyRingChart size="large" label="Carrier Risk Score" score={FLEET_SAFETY_SCORES.fleetSafetyScore} palette="blue" subtitle={`${FLEET_SAFETY_SCORES.fleetSafetyScore.toFixed(2)}% Fleet Safety Score`} />
              <div className="mt-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hover for more details</div>
              <div className="hidden md:block pointer-events-none absolute left-4 right-4 bottom-4 z-10 rounded-xl border border-blue-200 bg-white/95 backdrop-blur-sm p-3 shadow-sm opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">Carrier Risk Insight</div>
                <p className="text-xs text-slate-600 leading-relaxed mb-1">{carrierRiskInfo.purpose}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{carrierRiskInfo.focus}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 auto-rows-fr">
              {dashboardScores.map(metric => (
                <div key={metric.id} className="relative group bg-gradient-to-b from-emerald-50/60 to-slate-50 border border-emerald-100 rounded-2xl p-4 min-h-[190px] flex flex-col justify-start">
                  <SafetyRingChart label={metric.label} score={metric.value} palette="green" />
                  <div className={`mt-2 text-center text-sm font-bold ${getScoreColor(metric.value)}`}>{metric.value.toFixed(2)}%</div>
                  <div className="mt-1 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Hover for more details</div>
                  <div className="hidden md:block pointer-events-none absolute left-3 right-3 top-3 z-10 rounded-xl border border-emerald-200 bg-white/95 backdrop-blur-sm p-3 shadow-sm opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">{metric.label}</div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-1">{metric.purpose}</p>
                    <p className="text-xs text-slate-500 leading-relaxed">{metric.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== FLEET ANALYSIS (shown when no driver selected) ===== */}
        {!selectedDashboardDriverId && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-sm font-bold text-slate-800">Fleet Analysis</div>
              <span className="text-xs text-slate-400">/ Driver Distribution</span>
              <div className="flex bg-slate-100 p-0.5 rounded-md ml-auto">
                <div className="text-[10px] font-bold px-2.5 py-1 rounded bg-white text-slate-700 shadow-sm">SCORE</div>
                <div className="text-[10px] font-bold px-2.5 py-1 text-slate-400">IMPACT</div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <FleetDonutChart segments={fleetSegments} total={DRIVER_SAFETY_SCORES.length} />
              <div className="flex-1 w-full space-y-1.5">
                <div className="flex items-center pb-1.5 border-b border-slate-100">
                  <div className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</div>
                  <div className="w-14 text-right text-[10px] font-bold text-slate-400">%</div>
                  <div className="w-14 text-right text-[10px] font-bold text-slate-400">Count</div>
                </div>
                {fleetSegments.map(seg => (
                  <div key={seg.label} className="flex items-center py-0.5">
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-3 h-3 rounded-sm shrink-0 ${seg.dotClass}`} />
                      <span className="text-xs text-slate-700">{seg.label}</span>
                    </div>
                    <div className="w-14 text-right text-xs font-semibold text-slate-500">{seg.pct}%</div>
                    <div className="w-14 text-right text-xs font-bold text-slate-800">{seg.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== INDIVIDUAL DRIVER VIEW ===== */}
        {selectedDashboardDriverId && (
          (() => {
            const drv = DRIVER_SAFETY_SCORES.find(d => d.driverId === selectedDashboardDriverId)!;
            const ki = DRIVER_KEY_INDICATORS.find(k => k.driverId === selectedDashboardDriverId);
            const subScores = [
              { label: 'Overall Safety', score: drv.overall },
              { label: 'Accidents', score: drv.accidents },
              { label: 'ELD / HOS', score: drv.eld },
              { label: 'Camera / VEDR', score: drv.vedr },
              { label: 'Inspections', score: drv.inspections },
              { label: 'Violations', score: drv.violations },
              { label: 'Training', score: drv.trainings },
            ];
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5 flex-wrap">
                  <button onClick={() => setSelectedDashboardDriverId(null)} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
                    <ChevronLeft size={14} /> Back to Fleet
                  </button>
                  <div className="w-px h-4 bg-slate-200" />
                  <DriverAvatar name={drv.name} />
                  <div>
                    <div className="text-sm font-bold text-slate-800">{drv.name}</div>
                    <div className="text-xs text-slate-400">{drv.licenseNumber}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${drv.overall >= 90 ? 'bg-emerald-100 text-emerald-700' : drv.overall >= 80 ? 'bg-blue-100 text-blue-700' : drv.overall >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{getRiskMeta(drv.overall).label}</span>
                    <span className={`text-2xl font-black ${getScoreColor(drv.overall)}`}>{drv.overall.toFixed(1)}%</span>
                  </div>
                </div>
                {/* 8 mini ring charts */}
                <div className="grid grid-cols-8 gap-2 mb-5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {([
                    { label: 'Safety', score: drv.overall },
                    { label: 'Accident', score: drv.accidents },
                    { label: 'ELD', score: drv.eld },
                    { label: 'Camera', score: drv.vedr },
                    { label: 'Inspection', score: drv.inspections },
                    { label: 'Violation', score: drv.violations },
                    { label: 'Training', score: drv.trainings },
                  ] as { label: string; score: number }[]).map(s => (
                    <div key={s.label} className="flex flex-col items-center bg-white rounded-xl p-2 border border-slate-100 shadow-sm">
                      <MiniRiskRing score={s.score} palette="auto" />
                      <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">{s.label}</div>
                      <div className={`text-[10px] font-bold ${getScoreColor(s.score)}`}>{s.score.toFixed(0)}%</div>
                    </div>
                  ))}
                  {ki ? (
                    <div className={`flex flex-col items-center justify-center bg-white rounded-xl p-2 border shadow-sm ${ki.status === 'PASS' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                      <Shield size={20} className={ki.status === 'PASS' ? 'text-emerald-500' : 'text-red-500'} />
                      <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center">Key Ind.</div>
                      <div className={`text-[10px] font-bold ${ki.status === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>{ki.status}</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center bg-white rounded-xl p-2 border border-dashed border-slate-200 opacity-40">
                      <Shield size={20} className="text-slate-400" />
                      <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase">Key Ind.</div>
                    </div>
                  )}
                </div>
                {/* Contributing Factors */}
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contributing Factors vs Fleet Average ({FLEET_AVERAGE.toFixed(1)}%)</div>
                <div className="space-y-3 mb-5">
                  {subScores.map(s => {
                    const delta = s.score - FLEET_AVERAGE;
                    return (
                      <div key={s.label} className="flex items-center gap-3">
                        <div className="w-28 text-xs font-semibold text-slate-600 text-right shrink-0">{s.label}</div>
                        <div className="flex-1 bg-slate-100 rounded-full h-5 relative overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${s.score >= 90 ? 'bg-emerald-500' : s.score >= 80 ? 'bg-blue-500' : s.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                          <div className="absolute inset-0 flex items-center px-3">
                            <span className="text-[10px] font-bold text-white">{s.score.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className={`w-14 text-xs font-bold text-right shrink-0 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
                {/* Key Indicators */}
                {ki && (
                  <div className="pt-4 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Key Indicator Events</div>
                    <div className="grid grid-cols-5 gap-3 mb-3">
                      {([
                        { label: 'Cell Phone', count: ki.cellPhoneEvents },
                        { label: 'Speeding', count: ki.speedingEvents },
                        { label: 'Following Dist.', count: ki.followingDistanceEvents },
                        { label: 'Seat Belt', count: ki.seatBeltEvents },
                        { label: 'Cam. Block', count: ki.obstructedCameraEvents },
                      ] as { label: string; count: number }[]).map(item => (
                        <div key={item.label} className={`border rounded-lg p-3 text-center ${item.count > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                          <div className={`text-xl font-black ${item.count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.count}</div>
                          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{item.label}</div>
                          <div className={`text-[9px] font-bold uppercase mt-0.5 ${item.count > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{item.count > 0 ? 'FAIL' : 'PASS'}</div>
                        </div>
                      ))}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${ki.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      <Shield size={12} /> Key Indicator Status: {ki.status}
                    </div>
                  </div>
                )}
                {/* Driver Behavior Chart */}
                <DriverBehaviorChart drv={drv} />
              </div>
            );
          })()
        )}

        {/* ===== DRIVERS SECTION: GRID / LIST TOGGLE ===== */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Drivers</div>
              <div className="text-xs text-slate-500">{DRIVER_SAFETY_SCORES.length} drivers — click to view contributing factors</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button onClick={() => setDriverView('grid')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${driverView === 'grid' ? 'bg-white shadow text-slate-800 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={12} /> Grid</button>
                <button onClick={() => setDriverView('list')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${driverView === 'list' ? 'bg-white shadow text-slate-800 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}><List size={12} /> List</button>
              </div>
            </div>
          </div>
          {driverView === 'grid' ? (
            <div className="overflow-x-auto p-4">
              <div className="min-w-[1120px] grid grid-cols-8 gap-3">
                {driverRiskItems.map(item => (
                  <div key={item.id}
                    className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${item.placeholder ? 'opacity-20 border-dashed border-slate-200 bg-slate-50' : selectedDashboardDriverId === item.id ? 'border-blue-400 bg-blue-50 shadow-md ring-1 ring-blue-300/30' : 'cursor-pointer hover:border-blue-300 hover:shadow-md border-slate-200 bg-white'}`}
                    onClick={() => !item.placeholder && setSelectedDashboardDriverId(selectedDashboardDriverId === item.id ? null : item.id)}
                  >
                    <MiniRiskRing score={item.score} palette="auto" />
                    <div className="text-[11px] font-bold text-slate-700 text-center leading-tight truncate w-full mt-1">{item.title}</div>
                    <div className="text-[10px] text-slate-400 text-center truncate w-full">{item.subtitle}</div>
                    <span className={`mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded w-full text-center ${item.score >= 90 ? 'bg-emerald-100 text-emerald-700' : item.score >= 80 ? 'bg-blue-100 text-blue-700' : item.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{item.placeholder ? 'N/A' : getRiskMeta(item.score).label}</span>
                    {!item.placeholder && (
                      <div className={`text-[10px] font-bold tabular-nums ${(impactByDriverId[item.id] ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {(impactByDriverId[item.id] ?? 0) >= 0 ? '+' : ''}{(impactByDriverId[item.id] ?? 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-8">#</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Driver</th>
                    <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Score</th>
                    <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Impact</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {impactDrivers.map((drv, idx) => (
                    <tr key={drv.driverId} className={`hover:bg-slate-50 cursor-pointer transition-colors ${selectedDashboardDriverId === drv.driverId ? 'bg-blue-50' : ''}`} onClick={() => setSelectedDashboardDriverId(selectedDashboardDriverId === drv.driverId ? null : drv.driverId)}>
                      <td className="px-4 py-3 text-xs font-bold text-slate-300">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <DriverAvatar name={drv.name} />
                          <div><div className="text-xs font-semibold text-slate-800">{drv.name}</div><div className="text-[10px] text-slate-400">{drv.licenseNumber}</div></div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-black text-white ${drv.overall >= 70 ? 'bg-blue-500' : drv.overall >= 55 ? 'bg-sky-400' : drv.overall >= 50 ? 'bg-slate-400' : 'bg-orange-500'}`}>{drv.overall.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs font-bold tabular-nums ${drv.impact >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{drv.impact >= 0 ? '+' : ''}{drv.impact.toFixed(2)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${drv.overall >= 90 ? 'bg-emerald-100 text-emerald-700' : drv.overall >= 80 ? 'bg-blue-100 text-blue-700' : drv.overall >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{getRiskMeta(drv.overall).label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== ASSETS SECTION: GRID / LIST TOGGLE ===== */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">Assets</div>
              <div className="text-xs text-slate-500">{assetRiskItemsRaw.length} assets — click any card to view risk profile</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button onClick={() => setAssetView('grid')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${assetView === 'grid' ? 'bg-white shadow text-slate-800 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid size={12} /> Grid</button>
                <button onClick={() => setAssetView('list')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${assetView === 'list' ? 'bg-white shadow text-slate-800 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}><List size={12} /> List</button>
              </div>
            </div>
          </div>
          {assetView === 'grid' ? (
            <div className="overflow-x-auto p-4">
              <div className="min-w-[1120px] grid grid-cols-8 gap-3">
                {assetRiskItems.map(item => (
                  <div key={item.id}
                    className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${item.placeholder ? 'opacity-20 border-dashed border-slate-200 bg-slate-50' : 'cursor-pointer hover:border-blue-300 hover:shadow-md border-slate-200 bg-white'}`}
                    onClick={() => !item.placeholder && setSelectedDashboardAssetId(item.id)}
                  >
                    <MiniRiskRing score={item.score} palette="auto" />
                    <div className="text-[11px] font-bold text-slate-700 text-center leading-tight truncate w-full mt-1">{item.title}</div>
                    <div className="text-[10px] text-slate-400 text-center truncate w-full">{item.subtitle}</div>
                    <span className={`mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded w-full text-center ${item.score >= 90 ? 'bg-emerald-100 text-emerald-700' : item.score >= 80 ? 'bg-blue-100 text-blue-700' : item.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{item.placeholder ? 'N/A' : getRiskMeta(item.score).label}</span>
                    {!item.placeholder && 'status' in item && (
                      <div className={`text-[9px] font-semibold uppercase tabular-nums ${(item as {status: string}).status === 'Active' ? 'text-emerald-600' : (item as {status: string}).status === 'Maintenance' ? 'text-amber-600' : (item as {status: string}).status === 'OutOfService' ? 'text-red-600' : 'text-slate-500'}`}>{(item as {status: string}).status}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5 w-8">#</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Asset</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Year</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Status</th>
                    <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Score</th>
                    <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-4 py-2.5">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {assetListItems.map((asset, idx) => (
                    <tr key={asset.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedDashboardAssetId(asset.id)}>
                      <td className="px-4 py-3 text-xs font-bold text-slate-300">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-800">{asset.unitNumber}</div>
                        <div className="text-[10px] text-slate-400">{asset.makeModel}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{asset.year}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${asset.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : asset.status === 'Maintenance' ? 'bg-amber-100 text-amber-700' : asset.status === 'OutOfService' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{asset.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-black text-white ${asset.score >= 70 ? 'bg-blue-500' : asset.score >= 55 ? 'bg-sky-400' : asset.score >= 50 ? 'bg-slate-400' : 'bg-orange-500'}`}>{asset.score.toFixed(0)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${asset.score >= 90 ? 'bg-emerald-100 text-emerald-700' : asset.score >= 80 ? 'bg-blue-100 text-blue-700' : asset.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{getRiskMeta(asset.score).label}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ===== ELD/HOS + VEDR VIOLATION ANALYSIS ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm font-bold text-slate-800 mb-4">ELD / HOS Violations by Group</div>
            <div className="space-y-3">
              {Object.entries(hosGroupStats).map(([group, stats]) => (
                <div key={group}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">{group}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{stats.count}</span>
                      {stats.oos > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">{stats.oos} OOS</span>}
                    </div>
                  </div>
                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(stats.count / HOS_VIOLATION_EVENTS.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm font-bold text-slate-800 mb-4">VEDR Violations by Group</div>
            <div className="space-y-3">
              {Object.entries(vedrGroupStats).map(([group, stats]) => (
                <div key={group}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-600">{group}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">{stats.count}</span>
                      {stats.oos > 0 && <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">{stats.oos} OOS</span>}
                    </div>
                  </div>
                  <div className="bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-purple-500" style={{ width: `${(stats.count / VEDR_VIOLATION_EVENTS.length) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== RECENT EVENTS TABLE ===== */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
          <div className="text-sm font-bold text-slate-800 mb-4">Recent Violation Events</div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5 pr-3">Date</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5 pr-3">Driver</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5 pr-3">Vehicle</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5 pr-3">Type</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5 pr-3">Description</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5 pr-3">OOS</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentCombinedEvents.map(evt => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 pr-3 text-xs text-slate-600 whitespace-nowrap">{evt.date}</td>
                    <td className="py-2.5 pr-3 text-xs font-semibold text-slate-800 whitespace-nowrap">{evt.driverName}</td>
                    <td className="py-2.5 pr-3 text-xs text-slate-500">{evt.vehicleId}</td>
                    <td className="py-2.5 pr-3"><span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${evt.category === 'ELD/HOS' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{evt.category}</span></td>
                    <td className="py-2.5 pr-3 text-xs text-slate-600 max-w-[220px] truncate">{evt.description}</td>
                    <td className="py-2.5 pr-3">{evt.isOos ? <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">OOS</span> : <span className="text-[10px] text-slate-400">\u2014</span>}</td>
                    <td className="py-2.5">{getStatusBadge(evt.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ===== ASSET DETAIL POPUP ===== */}
        {selectedDashboardAsset && dashboardAssetScores && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDashboardAssetId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-blue-700">{selectedDashboardAsset.unitNumber} \u2014 Asset Risk Profile</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedDashboardAsset.year} {selectedDashboardAsset.make} {selectedDashboardAsset.model} \xb7 {selectedDashboardAsset.operationalStatus}</p>
                </div>
                <button onClick={() => setSelectedDashboardAssetId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} className="text-slate-500" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${dashboardAssetScores.overall >= 90 ? 'bg-emerald-100 text-emerald-700' : dashboardAssetScores.overall >= 80 ? 'bg-blue-100 text-blue-700' : dashboardAssetScores.overall >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{getRiskMeta(dashboardAssetScores.overall).label}</span>
                  <span className={`text-2xl font-black ${getScoreColor(dashboardAssetScores.overall)}`}>{dashboardAssetScores.overall.toFixed(0)}%</span>
                </div>
                <div className="space-y-2.5">
                  {([
                    { label: 'Overall Risk Score', score: dashboardAssetScores.overall },
                    { label: 'Status', score: dashboardAssetScores.statusScore },
                    { label: 'Age', score: dashboardAssetScores.ageScore },
                    { label: 'Mileage', score: dashboardAssetScores.mileageScore },
                    { label: 'Registration', score: dashboardAssetScores.regScore },
                  ] as { label: string; score: number }[]).map(s => (
                    <div key={s.label} className="flex items-center gap-3">
                      <div className="w-32 text-xs font-semibold text-slate-600 text-right shrink-0">{s.label}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                        <div className={`h-full rounded-full ${s.score >= 90 ? 'bg-emerald-500' : s.score >= 80 ? 'bg-blue-500' : s.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.score}%` }} />
                        <div className="absolute inset-0 flex items-center px-2"><span className="text-[9px] font-bold text-white">{s.score.toFixed(0)}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Unit #</div><div className="text-sm font-semibold text-slate-800">{selectedDashboardAsset.unitNumber}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Make / Model</div><div className="text-sm text-slate-700">{selectedDashboardAsset.make} {selectedDashboardAsset.model}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Year</div><div className="text-sm text-slate-700">{selectedDashboardAsset.year}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div><div className="text-sm text-slate-700">{selectedDashboardAsset.operationalStatus}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Odometer</div><div className="text-sm text-slate-700">{(selectedDashboardAsset.odometer ?? 0).toLocaleString()} {selectedDashboardAsset.odometerUnit}</div></div>
                  <div><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reg. Expiry</div><div className="text-sm text-slate-700">{selectedDashboardAsset.registrationExpiryDate || 'N/A'}</div></div>
                  {selectedDashboardAsset.vin && <div className="col-span-3"><div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">VIN</div><div className="text-sm font-mono text-slate-700">{selectedDashboardAsset.vin}</div></div>}
                </div>
              </div>
            </div>
          </div>
        )}"""

    content = before + new_dashboard + after_end
    print(f"Dashboard replaced OK, new content size: {len(content)}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done. Lines:", content.count('\n'))
