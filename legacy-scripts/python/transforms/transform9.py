"""
transform9.py
1. Replace DriverBehaviorChart with a responsive, hover-enabled version
2. Tighten the expanded driver detail panel for small-screen friendliness
"""

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Replace DriverBehaviorChart component ──────────────────────────────────
OLD_CHART_START = "const DriverBehaviorChart = ({"
OLD_CHART_END   = "};\n\n"  # ends the component

# Find the full component
idx_s = content.index(OLD_CHART_START)
idx_e = content.index("};\n\n", idx_s) + len("};\n\n")

NEW_CHART = '''const DriverBehaviorChart = ({
  drv,
}: {
  drv: { driverId: string; name: string; overall: number; accidents: number; eld: number; vedr: number; violations: number; trainings: number };
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const weeks = Array.from({ length: 8 }, (_, i) => {
    const r = hash01(drv.overall, i);
    const score = Math.max(62, Math.min(100, drv.overall + (r - 0.5) * 12));
    const behaviors = [
      (drv.accidents  - FLEET_AVERAGE) / 20 + (hash01(drv.overall + 1, i) - 0.5) * 2.2,
      (drv.eld        - FLEET_AVERAGE) / 22 + (hash01(drv.overall + 2, i) - 0.5) * 1.8,
      (drv.vedr       - FLEET_AVERAGE) / 22 + (hash01(drv.overall + 3, i) - 0.5) * 1.5,
      (drv.violations - FLEET_AVERAGE) / 25 + (hash01(drv.overall + 4, i) - 0.5) * 1.2,
      (drv.trainings  - FLEET_AVERAGE) / 30 + (hash01(drv.overall + 5, i) - 0.5) * 1.0,
    ];
    const base = new Date(2025, 9, 27);
    base.setDate(base.getDate() + i * 7);
    const label = `${base.getMonth() + 1}/${String(base.getDate()).padStart(2, '0')}`;
    return { label, score, behaviors };
  });

  const displayIdx = hoveredIdx ?? 7;
  const displayWeek = weeks[displayIdx];
  const lastTwoNetChange = weeks[7].score - weeks[6].score;
  const B_LABELS = ['Accidents', 'ELD / HOS', 'Camera', 'Violations', 'Training'];
  const B_COLORS = ['#f87171', '#fbbf24', '#a78bfa', '#60a5fa', '#9ca3af'];

  const W = 520, H = 180, PL = 28, PR = 8, PT = 10, PB = 26;
  const plotW = W - PL - PR;
  const plotH = H - PT - PB;
  const SMIN = Math.max(50, Math.floor((drv.overall - 22) / 5) * 5);
  const SMAX = 100;
  const sy = (s: number) => PT + plotH * (1 - (s - SMIN) / (SMAX - SMIN));
  const avgY = sy(FLEET_AVERAGE);
  const xStep = plotW / 7;
  const BAR_W = 6;
  const impactScale = plotH / 12;
  const colW = plotW / 8;

  const linePts = weeks.map((w, i) => `${i === 0 ? 'M' : 'L'}${(PL + i * xStep).toFixed(1)},${sy(w.score).toFixed(1)}`).join(' ');

  return (
    <div className="mt-5 pt-5 border-t border-slate-100">
      {/* Legend */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-xs font-bold text-slate-700">Driver Behaviors</span>
        <div className="flex items-center gap-1">
          <div className="w-6 h-0.5 bg-blue-600 rounded" />
          <span className="text-[10px] text-slate-400">Score</span>
        </div>
        {B_LABELS.map((lbl, j) => (
          <div key={lbl} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: B_COLORS[j] }} />
            <span className="text-[10px] text-slate-400">{lbl}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Chart — takes all available width */}
        <div className="flex-1 min-w-0 relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: 'auto', maxHeight: 200 }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Grid lines */}
            {[SMIN, SMIN + Math.round((SMAX - SMIN) * 0.33), SMIN + Math.round((SMAX - SMIN) * 0.66), SMAX].map(t => (
              <g key={t}>
                <line x1={PL} y1={sy(t)} x2={W - PR} y2={sy(t)} stroke="#e2e8f0" strokeWidth="0.5" />
                <text x={PL - 3} y={sy(t) + 3} textAnchor="end" fontSize="7" fill="#94a3b8">{t}</text>
              </g>
            ))}
            {/* Fleet avg dashed */}
            <line x1={PL} y1={avgY} x2={W - PR} y2={avgY} stroke="#94a3b8" strokeWidth="0.8" strokeDasharray="3,2" />
            <text x={W - PR + 1} y={avgY + 3} fontSize="6.5" fill="#94a3b8">avg</text>

            {/* Hover column highlight */}
            {hoveredIdx !== null && (
              <rect
                x={PL + hoveredIdx * xStep - colW / 2}
                y={PT}
                width={colW}
                height={plotH}
                fill="#2563eb"
                opacity="0.07"
                rx="3"
              />
            )}

            {/* Behavior bars */}
            {weeks.map((w, i) => {
              const cx = PL + i * xStep;
              return w.behaviors.map((val, j) => {
                const bh = Math.abs(val) * impactScale;
                const by = val >= 0 ? avgY - bh : avgY;
                return <rect key={j} x={cx - (BAR_W * 2.5) + j * (BAR_W + 0.5)} y={by} width={BAR_W} height={Math.max(bh, 0.5)} fill={B_COLORS[j]} opacity={hoveredIdx === i ? 1 : 0.65} rx="0.5" />;
              });
            })}

            {/* Score line */}
            <path d={linePts} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            {weeks.map((w, i) => (
              <circle key={i} cx={PL + i * xStep} cy={sy(w.score)} r={hoveredIdx === i ? 3.5 : 2} fill={hoveredIdx === i ? '#1d4ed8' : '#2563eb'} strokeWidth={hoveredIdx === i ? 1 : 0} stroke="white" />
            ))}

            {/* X labels */}
            {weeks.map((w, i) => (
              <text key={i} x={PL + i * xStep} y={H - PB + 13} textAnchor="middle" fontSize="7" fill={hoveredIdx === i ? '#334155' : '#94a3b8'} fontWeight={hoveredIdx === i ? 'bold' : 'normal'}>{w.label}</text>
            ))}

            {/* Invisible hover zones */}
            {weeks.map((_, i) => (
              <rect
                key={i}
                x={PL + i * xStep - colW / 2}
                y={PT}
                width={colW}
                height={plotH + PB}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseEnter={() => setHoveredIdx(i)}
              />
            ))}
          </svg>
        </div>

        {/* Right panel — shows hovered week or latest */}
        <div className="lg:w-44 shrink-0 flex flex-row lg:flex-col gap-3 lg:gap-2.5 items-start lg:items-stretch">
          <div className="flex-1 lg:flex-none">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              {hoveredIdx !== null ? weeks[hoveredIdx].label : 'This Week'}
            </div>
            <div className={`rounded-xl p-3 text-center ${displayWeek.score >= 90 ? 'bg-emerald-500' : displayWeek.score >= 80 ? 'bg-blue-500' : displayWeek.score >= 70 ? 'bg-sky-400' : 'bg-orange-500'}`}>
              <div className="text-3xl font-black text-white leading-none">{displayWeek.score.toFixed(0)}</div>
              <div className="text-[10px] font-bold text-white/80 uppercase mt-0.5">Safety Score</div>
            </div>
            <div className={`text-sm font-bold text-center mt-1.5 ${lastTwoNetChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {lastTwoNetChange >= 0 ? '+' : ''}{lastTwoNetChange.toFixed(2)} Net Change
            </div>
          </div>
          <div className="flex-1 lg:flex-none">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Driver Behaviors</div>
            <div className="space-y-1.5">
              {B_LABELS.map((lbl, j) => {
                const delta = j === 0 ? drv.accidents - FLEET_AVERAGE
                  : j === 1 ? drv.eld - FLEET_AVERAGE
                  : j === 2 ? drv.vedr - FLEET_AVERAGE
                  : j === 3 ? drv.violations - FLEET_AVERAGE
                  : drv.trainings - FLEET_AVERAGE;
                const weekImpact = displayWeek.behaviors[j];
                return (
                  <div key={lbl} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: B_COLORS[j] }} />
                    <span className="text-[11px] text-slate-600 flex-1 leading-none">{lbl}</span>
                    <span className={`text-[11px] font-bold tabular-nums ${hoveredIdx !== null ? (weekImpact >= 0 ? 'text-emerald-600' : 'text-red-500') : (delta >= 0 ? 'text-emerald-600' : 'text-red-500')}`}>
                      {hoveredIdx !== null
                        ? `${weekImpact >= 0 ? '+' : ''}${weekImpact.toFixed(2)}`
                        : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

'''

content = content[:idx_s] + NEW_CHART + content[idx_e:]
print("Step 1 OK: DriverBehaviorChart replaced")

# ── 2. Make the driver detail panel responsive ─────────────────────────────────
OLD_PANEL = '''              <div className="bg-white border border-slate-200 rounded-xl p-5 mb-5">
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
              </div>'''

NEW_PANEL = '''              <div className="border-t border-slate-100 mt-1 pt-4 px-4 pb-4">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <button onClick={() => setSelectedDashboardDriverId(null)} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors">
                    <ChevronLeft size={13} /> Back to Fleet
                  </button>
                  <div className="w-px h-4 bg-slate-200" />
                  <DriverAvatar name={drv.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{drv.name}</div>
                    <div className="text-[10px] text-slate-400">{drv.licenseNumber}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${drv.overall >= 90 ? 'bg-emerald-100 text-emerald-700' : drv.overall >= 80 ? 'bg-blue-100 text-blue-700' : drv.overall >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{getRiskMeta(drv.overall).label}</span>
                  <span className={`text-xl font-black ${getScoreColor(drv.overall)}`}>{drv.overall.toFixed(1)}%</span>
                </div>

                {/* 8 mini ring charts — scrollable on small screens */}
                <div className="overflow-x-auto mb-4">
                  <div className="flex gap-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-8">
                    {([
                      { label: 'Safety', score: drv.overall },
                      { label: 'Accident', score: drv.accidents },
                      { label: 'ELD', score: drv.eld },
                      { label: 'Camera', score: drv.vedr },
                      { label: 'Inspection', score: drv.inspections },
                      { label: 'Violation', score: drv.violations },
                      { label: 'Training', score: drv.trainings },
                    ] as { label: string; score: number }[]).map(s => (
                      <div key={s.label} className="flex flex-col items-center bg-slate-50 rounded-xl p-2 border border-slate-100 w-[80px] sm:w-auto shrink-0">
                        <MiniRiskRing score={s.score} palette="auto" />
                        <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center leading-tight">{s.label}</div>
                        <div className={`text-[10px] font-bold ${getScoreColor(s.score)}`}>{s.score.toFixed(0)}%</div>
                      </div>
                    ))}
                    {ki ? (
                      <div className={`flex flex-col items-center justify-center rounded-xl p-2 border w-[80px] sm:w-auto shrink-0 ${ki.status === 'PASS' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                        <Shield size={18} className={ki.status === 'PASS' ? 'text-emerald-500' : 'text-red-500'} />
                        <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wide text-center">Key Ind.</div>
                        <div className={`text-[10px] font-bold ${ki.status === 'PASS' ? 'text-emerald-600' : 'text-red-600'}`}>{ki.status}</div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-xl p-2 border border-dashed border-slate-200 opacity-40 w-[80px] sm:w-auto shrink-0">
                        <Shield size={18} className="text-slate-400" />
                        <div className="mt-1 text-[9px] font-bold text-slate-400 uppercase">Key Ind.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contributing Factors + KI side by side on large screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Contributing Factors vs Fleet Average ({FLEET_AVERAGE.toFixed(1)}%)</div>
                    <div className="space-y-2">
                      {subScores.map(s => {
                        const delta = s.score - FLEET_AVERAGE;
                        return (
                          <div key={s.label} className="flex items-center gap-2">
                            <div className="w-20 text-[11px] font-semibold text-slate-500 text-right shrink-0">{s.label}</div>
                            <div className="flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden">
                              <div className={`h-full rounded-full ${s.score >= 90 ? 'bg-emerald-500' : s.score >= 80 ? 'bg-blue-500' : s.score >= 70 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${s.score}%` }} />
                              <div className="absolute inset-0 flex items-center px-2">
                                <span className="text-[9px] font-bold text-white">{s.score.toFixed(0)}%</span>
                              </div>
                            </div>
                            <div className={`w-10 text-[11px] font-bold text-right shrink-0 ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {ki && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Key Indicator Events</div>
                      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-2 mb-3">
                        {([
                          { label: 'Cell Phone', count: ki.cellPhoneEvents },
                          { label: 'Speeding', count: ki.speedingEvents },
                          { label: 'Following', count: ki.followingDistanceEvents },
                          { label: 'Seat Belt', count: ki.seatBeltEvents },
                          { label: 'Cam. Block', count: ki.obstructedCameraEvents },
                        ] as { label: string; count: number }[]).map(item => (
                          <div key={item.label} className={`border rounded-lg p-2 text-center ${item.count > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                            <div className={`text-lg font-black ${item.count > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{item.count}</div>
                            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide leading-tight">{item.label}</div>
                            <div className={`text-[9px] font-bold uppercase mt-0.5 ${item.count > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{item.count > 0 ? 'FAIL' : 'PASS'}</div>
                          </div>
                        ))}
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${ki.status === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        <Shield size={11} /> Key Indicator Status: {ki.status}
                      </div>
                    </div>
                  )}
                </div>

                {/* Driver Behavior Chart */}
                <DriverBehaviorChart drv={drv} />
              </div>'''

if OLD_PANEL in content:
    content = content.replace(OLD_PANEL, NEW_PANEL, 1)
    print("Step 2 OK: driver detail panel updated")
else:
    print("Step 2 FAILED: panel pattern not found")

with open('src/pages/safety-analysis/SafetyAnalysisPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

lines = content.count('\n') + 1
print(f"Done. Lines: {lines}")
