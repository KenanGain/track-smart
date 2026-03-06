import { useState } from 'react';
import {
  Shield, Info, RotateCcw, Save,
  BarChart2, Sliders, AlertTriangle, Target, Gauge, Users,
  Truck, FileCheck, BookOpen, Camera, Activity, Bell, Zap,
} from 'lucide-react';

// ─── InfoTip: formula + best-result hint ─────────────────────────────────────
function InfoTip({ hint, formula }: { hint: string; formula?: string }) {
  const [show, setShow] = useState(false);
  // Parse formula lines into labeled parts for display
  const formulaLines = formula ? formula.split('\n').filter(Boolean) : [];
  return (
    <span className="relative inline-block ml-1 align-middle">
      <Info size={12} className="text-blue-400 hover:text-blue-600 cursor-pointer transition-colors"
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} />
      {show && (
        <div className="absolute left-5 top-0 z-[100] w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl pointer-events-none overflow-hidden">
          {formulaLines.length > 0 && (
            <div className="px-4 py-3 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Calculation Formula</span>
              </div>
              <div className="space-y-1">
                {formulaLines.map((line, i) => {
                  const [lhs, ...rhs] = line.split('=');
                  const hasEq = rhs.length > 0;
                  return (
                    <div key={i} className="flex items-start gap-2">
                      {hasEq ? (
                        <>
                          <code className="text-[11px] font-mono text-sky-300 whitespace-nowrap shrink-0">{lhs.trim()}</code>
                          <span className="text-slate-500 text-[11px] shrink-0">=</span>
                          <code className="text-[11px] font-mono text-emerald-300 leading-relaxed">{rhs.join('=').trim()}</code>
                        </>
                      ) : (
                        <code className="text-[11px] font-mono text-slate-400 leading-relaxed italic">{line}</code>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="px-4 py-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Best Result</span>
            </div>
            <p className="text-[12px] text-slate-600 leading-relaxed">{hint}</p>
          </div>
        </div>
      )}
    </span>
  );
}

function SectionTitle({ icon: Icon, label, formula }: { icon: React.ElementType; label: string; formula?: string }) {
  const [show, setShow] = useState(false);
  const formulaLines = formula ? formula.split('\n').filter(Boolean) : [];
  return (
    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-200">
      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
        <Icon size={15} className="text-white" />
      </div>
      <span className="text-base font-bold text-slate-800">{label}</span>
      {formula && (
        <span className="relative ml-0.5">
          <Info size={14} className="text-blue-400 hover:text-blue-600 cursor-pointer transition-colors"
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} />
          {show && (
            <div className="absolute left-5 top-0 z-[100] w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl pointer-events-none overflow-hidden">
              <div className="px-4 py-3 bg-gradient-to-br from-slate-900 to-slate-800">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Section Formula Overview</span>
                </div>
                <div className="space-y-1">
                  {formulaLines.map((line, i) => {
                    const [lhs, ...rhs] = line.split('=');
                    const hasEq = rhs.length > 0;
                    return (
                      <div key={i} className="flex items-start gap-2">
                        {hasEq ? (
                          <>
                            <code className="text-[11px] font-mono text-sky-300 whitespace-nowrap shrink-0">{lhs.trim()}</code>
                            <span className="text-slate-500 text-[11px] shrink-0">=</span>
                            <code className="text-[11px] font-mono text-emerald-300 leading-relaxed">{rhs.join('=').trim()}</code>
                          </>
                        ) : (
                          <code className="text-[11px] font-mono text-slate-400 leading-relaxed italic">{line}</code>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </span>
      )}
    </div>
  );
}

function Row({ label, desc, hint, formula, children }: {
  label: string; desc: string; hint: string; formula?: string; children: React.ReactNode;
}) {
  const firstLine = formula ? formula.split('\n')[0] : '';
  const [lhs, ...rhs] = firstLine.split('=');
  const hasEq = rhs.length > 0;
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <InfoTip hint={hint} formula={formula} />
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{desc}</p>
        {formula && (
          <div className="mt-2 inline-flex items-center gap-0 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
            <span className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-white bg-blue-600">f(x)</span>
            {hasEq ? (
              <>
                <code className="px-1.5 py-1 text-[10px] font-mono text-sky-700 bg-sky-50">{lhs.trim()}</code>
                <span className="px-1 text-[10px] text-slate-400">=</span>
                <code className="px-1.5 py-1 text-[10px] font-mono text-emerald-700">{rhs.join('=').trim()}</code>
              </>
            ) : (
              <code className="px-2 py-1 text-[10px] font-mono text-slate-600">{firstLine}</code>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min = 0, max = 100, step = 1, suffix = '' }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="number" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, parseFloat(e.target.value) || 0)))}
        className="w-20 text-right text-sm font-bold text-slate-800 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white" />
      {suffix && <span className="text-xs text-slate-400 w-14">{suffix}</span>}
    </div>
  );
}

function SliderNum({ value, onChange, min = 0, max = 100, step = 1, suffix = '%' }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2 w-56">
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-blue-600" />
      <NumInput value={value} onChange={onChange} min={min} max={max} step={step} suffix={suffix} />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <button onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-blue-600' : 'bg-slate-200'}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label && <span className="text-xs text-slate-600">{label}</span>}
    </label>
  );
}

function Chips({ options, value, onChange, color = 'blue' }: {
  options: { label: string; value: string | number }[];
  value: string | number; onChange: (v: string | number) => void; color?: string;
}) {
  const active = color === 'green' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-blue-600 text-white border-blue-600';
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button key={String(o.value)} onClick={() => onChange(o.value)}
          className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${value === o.value ? active : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const DEFAULT_WEIGHTS = [
  { key: 'accidents',   label: 'Accidents',     color: 'bg-red-500',     value: 25 },
  { key: 'eld',         label: 'ELD / HOS',     color: 'bg-blue-500',    value: 20 },
  { key: 'vedr',        label: 'Camera / VEDR', color: 'bg-purple-500',  value: 15 },
  { key: 'inspections', label: 'Inspections',   color: 'bg-emerald-500', value: 20 },
  { key: 'violations',  label: 'Violations',    color: 'bg-amber-500',   value: 10 },
  { key: 'trainings',   label: 'Trainings',     color: 'bg-teal-500',    value: 10 },
];

export function SafetySettingsPage() {
  const [saved, setSaved] = useState(false);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS.map(w => ({ ...w })));
  const updateWeight = (key: string, val: number) =>
    setWeights(ws => ws.map(w => w.key === key ? { ...w, value: Math.max(0, Math.min(100, val)) } : w));
  const totalWeight = weights.reduce((s, w) => s + w.value, 0);

  const [thresholds, setThresholds] = useState({ excellent: 90, good: 80, fair: 70 });
  const [timeVol, setTimeVol] = useState(40);
  const [distVol, setDistVol] = useState(30);
  const [dateVol, setDateVol] = useState(28);
  const [windowDecay, setWindowDecay] = useState(60);
  const [baselineWindow, setBaselineWindow] = useState('12mo');
  const [fleetAverage, setFleetAverage] = useState(78);
  const [fleetBenchmark, setFleetBenchmark] = useState(75);
  const [industryBenchmark, setIndustryBenchmark] = useState(72);
  const [showFleetAvgOnRadar, setShowFleetAvgOnRadar] = useState(true);
  const [showIndustryBenchmark, setShowIndustryBenchmark] = useState(false);
  const [fatalWeight, setFatalWeight] = useState(100);
  const [injuryWeight, setInjuryWeight] = useState(60);
  const [propertyWeight, setPropertyWeight] = useState(30);
  const [nearMissWeight, setNearMissWeight] = useState(10);
  const [recencyDecay, setRecencyDecay] = useState(20);
  const [incidentAgeCap, setIncidentAgeCap] = useState(36);
  const [towAwayMult, setTowAwayMult] = useState(1.5);
  const [hazmatMult, setHazmatMult] = useState(2.0);
  const [atFaultMult, setAtFaultMult] = useState(1.8);
  const [hosWindow, setHosWindow] = useState(70);
  const [eldGrace, setEldGrace] = useState(5);
  const [driverAgeCap, setDriverAgeCap] = useState(3);
  const [minDrivingDays, setMinDrivingDays] = useState(30);
  const [noEventBonus, setNoEventBonus] = useState(5);
  const [speedThreshold, setSpeedThreshold] = useState(80);
  const [harshBrakeG, setHarshBrakeG] = useState(0.4);
  const [harshAccelG, setHarshAccelG] = useState(0.35);
  const [activeScore, setActiveScore] = useState(100);
  const [maintScore, setMaintScore] = useState(50);
  const [oosStatusScore, setOosStatusScore] = useState(0);
  const [mileageCurve, setMileageCurve] = useState<'linear' | 'exponential' | 'stepped'>('linear');
  const [regWarningDays, setRegWarningDays] = useState(60);
  const [regExpiredPenalty, setRegExpiredPenalty] = useState(40);
  const [ageDecayStart, setAgeDecayStart] = useState(5);
  const [ageDecayRate, setAgeDecayRate] = useState(5);
  const [ageDecayCap, setAgeDecayCap] = useState(40);
  const [passScore, setPassScore] = useState(100);
  const [failScore, setFailScore] = useState(40);
  const [oosScore, setOosScore] = useState(0);
  const [oosPenalty, setOosPenalty] = useState(20);
  const [inspDecay, setInspDecay] = useState(15);
  const [inspAgeCap, setInspAgeCap] = useState(24);
  const [minInspections, setMinInspections] = useState(3);
  const [movingWeight, setMovingWeight] = useState(70);
  const [nonMovingWeight, setNonMovingWeight] = useState(30);
  const [criticalPenalty, setCriticalPenalty] = useState(25);
  const [majorPenalty, setMajorPenalty] = useState(15);
  const [minorPenalty, setMinorPenalty] = useState(5);
  const [violAgeCap, setViolAgeCap] = useState(24);
  const [violDecay, setViolDecay] = useState(10);
  const [completionWeight, setCompletionWeight] = useState(60);
  const [mandatoryBonus, setMandatoryBonus] = useState(30);
  const [optionalBonus, setOptionalBonus] = useState(10);
  const [expiryWarning, setExpiryWarning] = useState(30);
  const [expiryPenalty, setExpiryPenalty] = useState(15);
  const [expiredPenalty, setExpiredPenalty] = useState(35);
  const [minTrainingHrs, setMinTrainingHrs] = useState(8);
  const [followDistPenalty, setFollowDistPenalty] = useState(10);
  const [laneDevPenalty, setLaneDevPenalty] = useState(8);
  const [distractionPenalty, setDistractionPenalty] = useState(15);
  const [drowsinessPenalty, setDrowsinessPenalty] = useState(20);
  const [maskingPenalty, setMaskingPenalty] = useState(30);
  const [coachingBonus, setCoachingBonus] = useState(5);
  const [vedrDecay, setVedrDecay] = useState(25);
  const [scoreDropAlert, setScoreDropAlert] = useState(10);
  const [criticalAlert, setCriticalAlert] = useState(65);
  const [alertCooldown, setAlertCooldown] = useState(7);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [autoFlag, setAutoFlag] = useState(true);
  const [defaultWindow, setDefaultWindow] = useState('12mo');
  const [defaultMode, setDefaultMode] = useState('time');
  const [defaultDistUnit, setDefaultDistUnit] = useState('mi');
  const [defaultInterval, setDefaultInterval] = useState(10000);
  const [scoreDecimals, setScoreDecimals] = useState(1);
  const [showPercent, setShowPercent] = useState(true);
  const [showRankBadges, setShowRankBadges] = useState(true);
  const [showTrendArrows, setShowTrendArrows] = useState(true);
  const [colorBlindMode, setColorBlindMode] = useState(false);

  const handleReset = () => {
    setWeights(DEFAULT_WEIGHTS.map(w => ({ ...w })));
    setThresholds({ excellent: 90, good: 80, fair: 70 });
    setTimeVol(40); setDistVol(30); setDateVol(28); setWindowDecay(60); setBaselineWindow('12mo');
    setFleetAverage(78); setFleetBenchmark(75); setIndustryBenchmark(72); setShowFleetAvgOnRadar(true); setShowIndustryBenchmark(false);
    setFatalWeight(100); setInjuryWeight(60); setPropertyWeight(30); setNearMissWeight(10);
    setRecencyDecay(20); setIncidentAgeCap(36); setTowAwayMult(1.5); setHazmatMult(2.0); setAtFaultMult(1.8);
    setHosWindow(70); setEldGrace(5); setDriverAgeCap(3); setMinDrivingDays(30); setNoEventBonus(5); setSpeedThreshold(80); setHarshBrakeG(0.4); setHarshAccelG(0.35);
    setActiveScore(100); setMaintScore(50); setOosStatusScore(0); setMileageCurve('linear'); setRegWarningDays(60); setRegExpiredPenalty(40); setAgeDecayStart(5); setAgeDecayRate(5); setAgeDecayCap(40);
    setPassScore(100); setFailScore(40); setOosScore(0); setOosPenalty(20); setInspDecay(15); setInspAgeCap(24); setMinInspections(3);
    setMovingWeight(70); setNonMovingWeight(30); setCriticalPenalty(25); setMajorPenalty(15); setMinorPenalty(5); setViolAgeCap(24); setViolDecay(10);
    setCompletionWeight(60); setMandatoryBonus(30); setOptionalBonus(10); setExpiryWarning(30); setExpiryPenalty(15); setExpiredPenalty(35); setMinTrainingHrs(8);
    setFollowDistPenalty(10); setLaneDevPenalty(8); setDistractionPenalty(15); setDrowsinessPenalty(20); setMaskingPenalty(30); setCoachingBonus(5); setVedrDecay(25);
    setScoreDropAlert(10); setCriticalAlert(65); setAlertCooldown(7); setEmailAlerts(true); setInAppAlerts(true); setWeeklyDigest(true); setAutoFlag(true);
    setDefaultWindow('12mo'); setDefaultMode('time'); setDefaultDistUnit('mi'); setDefaultInterval(10000); setScoreDecimals(1); setShowPercent(true); setShowRankBadges(true); setShowTrendArrows(true); setColorBlindMode(false);
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      {/* Header — matches Inspections & Risk Thresholds style */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Safety Calculation Settings
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">
            Configure how driver &amp; asset safety scores are calculated and displayed. Hover the
            <span className="inline-flex items-center gap-0.5 mx-1 px-1.5 py-0.5 bg-blue-50 border border-blue-200 rounded text-blue-600 text-xs font-bold"><Info size={10} /> ⓘ</span>
            icons on each setting to see the exact formula and tips for best results.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={handleReset} className="bg-white text-slate-700 text-sm font-bold py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button onClick={handleSave} className={`text-sm font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="space-y-6">

        {/* ── Row 1: Weights + Thresholds ─────────────────────────── */}
        <div className="grid grid-cols-5 gap-6">

          {/* Score Weights */}
          <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={BarChart2} label="Score Weights"
              formula={`overall = Σ(sub_score[i] × weight[i]) / 100\nweight[i] ∈ {accidents, eld, vedr,\n  inspections, violations, trainings}\nΣ weights must = 100%`} />
            <p className="text-[11px] text-slate-400 mb-4">Each sub-score contributes to the overall score by its weight. <strong className="text-slate-600">Weights must sum to exactly 100%.</strong></p>
            <div className="space-y-3">
              {weights.map(w => (
                <div key={w.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${w.color}`} />
                      <span className="text-xs font-semibold text-slate-700">{w.label}</span>
                      <InfoTip
                        formula={`contribution = ${w.label}_score × (weight / 100)\noverall += contribution`}
                        hint={`Set higher if ${w.label.toLowerCase()} incidents are your biggest fleet risk. Lower-weight categories have less score impact. Best results: total weight = exactly 100%.`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={0} max={100} value={w.value}
                        onChange={e => updateWeight(w.key, parseInt(e.target.value) || 0)}
                        className="w-14 text-right text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                      <span className="text-xs text-slate-400">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} value={w.value}
                      onChange={e => updateWeight(w.key, parseInt(e.target.value))}
                      className="flex-1 accent-blue-600" />
                    <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${w.color}`} style={{ width: `${w.value}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-500">Total</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${totalWeight === 100 ? 'bg-emerald-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(totalWeight, 100)}%` }} />
              </div>
              <span className={`text-sm font-black tabular-nums ${totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'}`}>{totalWeight}%</span>
              {totalWeight !== 100 && <span className="text-[10px] text-amber-600 font-bold">⚠ Must equal 100%</span>}
            </div>
          </div>

          {/* Risk Thresholds */}
          <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Target} label="Risk Thresholds"
              formula={`score ≥ excellent  → "Excellent" (green)\nscore ≥ good       → "Good"      (blue)\nscore ≥ fair       → "Fair"      (amber)\nscore <  fair      → "Poor"      (red)`} />
            <p className="text-[11px] text-slate-400 mb-4">Minimum score for each risk rating. Below Fair = <span className="text-red-500 font-bold">Poor</span>.</p>
            <div className="space-y-4">
              {([
                { key: 'excellent', label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
                  hint: 'Set this high (88–95) to only flag truly top performers. Lowering it inflates the Excellent pool and reduces score differentiation.',
                  formula: 'rating = "Excellent" if score ≥ excellent_threshold' },
                { key: 'good',      label: 'Good',      color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',
                  hint: 'Keep at least 8–12 points below Excellent for meaningful separation. Best practice: 78–85.',
                  formula: 'rating = "Good" if good ≤ score < excellent' },
                { key: 'fair',      label: 'Fair',      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',
                  hint: 'This is your intervention threshold — drivers below Fair should be flagged for coaching. Recommend 68–75.',
                  formula: 'rating = "Fair" if fair ≤ score < good' },
              ] as const).map(t => (
                <div key={t.key} className={`rounded-xl border ${t.border} ${t.bg} p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <span className={`text-xs font-bold uppercase tracking-wide ${t.color}`}>{t.label}</span>
                      <InfoTip hint={t.hint} formula={t.formula} />
                    </div>
                    <span className={`text-sm font-black ${t.color}`}>≥ {thresholds[t.key]}</span>
                  </div>
                  <input type="range" min={0} max={100} value={thresholds[t.key]}
                    onChange={e => setThresholds(th => ({ ...th, [t.key]: parseInt(e.target.value) }))}
                    className="w-full accent-blue-600" />
                  <div className="flex justify-between text-[9px] text-slate-400 mt-0.5"><span>0</span><span>100</span></div>
                </div>
              ))}
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-red-600">Poor</span>
                  <div className="text-[11px] text-slate-400 mt-0.5">Auto-assigned below Fair</div>
                </div>
                <span className="text-sm font-black text-red-600">&lt; {thresholds.fair}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 2: Volatility + Fleet ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Sliders} label="Score Volatility & Adjustment"
              formula={`adj = base ± (seed - 0.5) × vol × decay_factor\ndecay_factor = max(0, 1 - window / baseline)\nwindow_factor = min(1, days / 365)`} />
            <Row label="Time Window Volatility"
              desc="Max score swing (±%) across time windows. Shorter windows = more variation."
              formula={`adj = base ± (seed-0.5) × ${timeVol} × (1 - window/baseline)`}
              hint="Set 30–45% for realistic short-window variation. Above 60% = scores feel unstable; below 20% = no meaningful difference between windows.">
              <SliderNum value={timeVol} onChange={setTimeVol} />
            </Row>
            <Row label="Distance Mode Volatility"
              desc="Max score swing when distance mode is active."
              formula={`adj = base ± (seed-0.5) × ${distVol} × (1 - dist/maxDist)`}
              hint="Keep slightly lower than time volatility (20–40%). Short distances have high uncertainty so volatility is amplified automatically.">
              <SliderNum value={distVol} onChange={setDistVol} />
            </Row>
            <Row label="Date Range Volatility"
              desc="Max swing for custom start/end date ranges. Narrow ranges increase effective volatility."
              formula={`adj = base ± (seed-0.5) × ${dateVol} × (1 - days/365)`}
              hint="Keep at 20–35%. Very narrow date ranges (< 7 days) will already amplify this automatically via the window factor.">
              <SliderNum value={dateVol} onChange={setDateVol} />
            </Row>
            <Row label="Window Decay Factor"
              desc="How quickly volatility fades as window approaches baseline. 100% = long windows very stable."
              formula={`eff_vol = vol × max(0, 1 - window_months / ${windowDecay})`}
              hint="60–70% gives a natural bell-curve effect. At 100% the baseline window shows zero variance; at 0% all windows show equal volatility.">
              <SliderNum value={windowDecay} onChange={setWindowDecay} />
            </Row>
            <Row label="Baseline Window"
              desc="The neutral reference window. Scores use raw base values with no adjustment at this window."
              formula={`if window == baseline → adj = 0 (no volatility)`}
              hint="12mo is the industry standard baseline. Use 6mo if your fleet data refreshes more frequently.">
              <Chips value={baselineWindow} onChange={v => setBaselineWindow(String(v))}
                options={[{label:'1mo',value:'1mo'},{label:'6mo',value:'6mo'},{label:'12mo',value:'12mo'},{label:'24mo',value:'24mo'}]} />
            </Row>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Users} label="Fleet Baseline & Benchmarking"
              formula={`radar_ref_line = fleet_average (dashed polygon)\nbenchmark_gap = driver_score - fleet_benchmark\nindustry_gap  = driver_score - industry_benchmark`} />
            <Row label="Fleet Average Score"
              desc="Shown as dashed reference line on all radar charts."
              formula={`fleet_avg = Σ(all_driver_scores) / n_drivers`}
              hint="Set this to your real fleet mean score. An accurate fleet average makes the radar chart reference line meaningful for comparison.">
              <SliderNum value={fleetAverage} onChange={setFleetAverage} />
            </Row>
            <Row label="Fleet Benchmark Target"
              desc="Internal company goal score for all drivers."
              formula={`gap = driver_score - ${fleetBenchmark}  (positive = above target)`}
              hint="Set 3–7 points above current fleet average to stretch performance without being unrealistic. Review quarterly.">
              <SliderNum value={fleetBenchmark} onChange={setFleetBenchmark} />
            </Row>
            <Row label="Industry Benchmark"
              desc="External industry average used as a secondary reference line."
              formula={`industry_gap = driver_score - ${industryBenchmark}`}
              hint="Set based on industry safety reports. Useful for demonstrating fleet performance vs. competitors to stakeholders.">
              <SliderNum value={industryBenchmark} onChange={setIndustryBenchmark} />
            </Row>
            <Row label="Show Fleet Avg on Radar"
              desc="Display fleet average as dashed polygon on all radar/spider charts."
              formula={`radar shows polygon at r = (fleet_avg/100) × R on all axes`}
              hint="Keep enabled — it's the most important visual reference for individual driver comparisons.">
              <Toggle checked={showFleetAvgOnRadar} onChange={setShowFleetAvgOnRadar} label="Enabled" />
            </Row>
            <Row label="Show Industry Benchmark"
              desc="Show industry benchmark as a secondary dashed line on radar charts."
              formula={`radar shows polygon at r = (industry_avg/100) × R on all axes`}
              hint="Enable when presenting to executives or clients. Disable for day-to-day dispatch views to reduce visual clutter.">
              <Toggle checked={showIndustryBenchmark} onChange={setShowIndustryBenchmark} label="Enabled" />
            </Row>
          </div>
        </div>

        {/* ── Row 3: Incidents + Driver Rules ───────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={AlertTriangle} label="Incident Scoring Rules"
              formula={`penalty = severity_weight × recency_factor × multipliers\nrecency_factor = max(0, 1 - age_months/cap × decay/100)\nfinal_penalty = penalty × tow × hazmat × atFault`} />
            <Row label="Fatal Accident Weight" desc="Penalty points for a fatal (recordable) accident."
              formula={`penalty = ${fatalWeight} × recency_factor × multipliers`}
              hint="Keep at max (100). Fatal accidents are the highest-risk event. Lowering this masks your most critical safety failures.">
              <NumInput value={fatalWeight} onChange={setFatalWeight} min={0} max={200} suffix="pts" />
            </Row>
            <Row label="Injury Accident Weight" desc="Penalty for accidents resulting in injury requiring medical attention."
              formula={`penalty = ${injuryWeight} × recency_factor × multipliers`}
              hint="50–70% of fatal weight is the industry norm. Injury accidents are serious but distinguish from fatalities.">
              <NumInput value={injuryWeight} onChange={setInjuryWeight} min={0} max={200} suffix="pts" />
            </Row>
            <Row label="Property Damage Weight" desc="Penalty for accidents involving only property/vehicle damage."
              formula={`penalty = ${propertyWeight} × recency_factor × multipliers`}
              hint="25–40% of fatal weight. Property damage is common; too high a penalty creates score instability across the fleet.">
              <NumInput value={propertyWeight} onChange={setPropertyWeight} min={0} max={200} suffix="pts" />
            </Row>
            <Row label="Near-Miss Weight" desc="Penalty for near-miss events logged by camera/VEDR."
              formula={`penalty = ${nearMissWeight} × recency_factor`}
              hint="Keep low (5–15 pts). Near-misses are valuable leading indicators but shouldn't punish drivers the same as actual incidents.">
              <NumInput value={nearMissWeight} onChange={setNearMissWeight} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Recency Decay Rate" desc="% penalty reduction per month as incident ages."
              formula={`recency = max(0, 1 - age_months × (${recencyDecay}/100))`}
              hint="15–25%/month is ideal. Lower (< 10%) = old incidents dominate; higher (> 35%) = incidents fade too quickly to be meaningful.">
              <NumInput value={recencyDecay} onChange={setRecencyDecay} suffix="%" />
            </Row>
            <Row label="Incident Age Cap" desc="Incidents older than this are fully excluded from scoring."
              formula={`if age_months > ${incidentAgeCap} → incident excluded`}
              hint="24–48 months is standard. DOT looks back 3 years (36mo) so aligning here ensures your scores match regulatory risk windows.">
              <NumInput value={incidentAgeCap} onChange={setIncidentAgeCap} min={1} max={120} suffix="months" />
            </Row>
            <Row label="Tow-Away Multiplier" desc="Multiplies the base penalty when the vehicle required towing."
              formula={`final = penalty × ${towAwayMult} (if tow_away = true)`}
              hint="1.3–2.0× is appropriate. Tow-aways indicate severe vehicle damage. Too high (> 2.5×) creates runaway penalties.">
              <NumInput value={towAwayMult} onChange={setTowAwayMult} min={1} max={5} step={0.1} suffix="×" />
            </Row>
            <Row label="Hazmat Multiplier" desc="Applied when the incident involved hazardous materials."
              formula={`final = penalty × ${hazmatMult} (if hazmat = true)`}
              hint="1.8–2.5× reflects regulatory and liability severity of hazmat incidents. Align with your insurance risk model.">
              <NumInput value={hazmatMult} onChange={setHazmatMult} min={1} max={5} step={0.1} suffix="×" />
            </Row>
            <Row label="At-Fault Multiplier" desc="Applied when the driver is determined at fault."
              formula={`final = penalty × ${atFaultMult} (if at_fault = true)`}
              hint="1.5–2.0×. At-fault status is the strongest predictor of future risk. This multiplier separates preventable from non-preventable accidents.">
              <NumInput value={atFaultMult} onChange={setAtFaultMult} min={1} max={5} step={0.1} suffix="×" />
            </Row>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Activity} label="Driver-Specific Rules"
              formula={`eligible = active_days ≥ min_days\nhos_remaining = hos_window - hours_driven\nspeed_event if speed > threshold\nharsh_brake if brake_g > g_threshold`} />
            <Row label="HOS Window" desc="Rolling hour window for HOS compliance (60h/7d or 70h/8d cycle)."
              formula={`hos_remaining = ${hosWindow} - total_hours_in_cycle`}
              hint="Use 70h/8d for most carriers. 60h/7d is only required for carriers operating 7-day cycles. Mismatch causes false violations.">
              <Chips value={hosWindow} onChange={v => setHosWindow(Number(v))} options={[{label:'60h / 7d',value:60},{label:'70h / 8d',value:70}]} />
            </Row>
            <Row label="ELD Grace Period" desc="Minutes of non-compliance before counted as a violation."
              formula={`violation if gap_minutes > ${eldGrace}`}
              hint="5–10 min accounts for connectivity gaps and stop-sign exceptions. Too high (> 15 min) masks real violations.">
              <NumInput value={eldGrace} onChange={setEldGrace} min={0} max={30} suffix="min" />
            </Row>
            <Row label="Driver History Cap" desc="Only incidents within this many years are included in scoring."
              formula={`include if incident_date ≥ today - ${driverAgeCap} years`}
              hint="3 years matches FMCSA SMS look-back period. Using 5+ years may unfairly penalize drivers for very old events.">
              <NumInput value={driverAgeCap} onChange={setDriverAgeCap} min={1} max={10} suffix="years" />
            </Row>
            <Row label="Min Active Days for Score" desc="Minimum driving days before a score is generated."
              formula={`scored = active_days ≥ ${minDrivingDays}`}
              hint="30 days is standard. Avoids outlier scores from new hires or returning drivers with minimal recent data.">
              <NumInput value={minDrivingDays} onChange={setMinDrivingDays} min={1} max={365} suffix="days" />
            </Row>
            <Row label="Clean Record Bonus" desc="Bonus points added for drivers with no events in the selected window."
              formula={`score += ${noEventBonus} if event_count == 0 in window`}
              hint="3–8 pts encourages safe behaviour. Too high (> 15 pts) can mask real sub-score weaknesses with a clean-record inflation.">
              <NumInput value={noEventBonus} onChange={setNoEventBonus} min={0} max={20} suffix="pts" />
            </Row>
            <Row label="Speed Alert Threshold" desc="Speed above which an event is logged as speeding."
              formula={`speed_event if speed_mph > ${speedThreshold}`}
              hint="Set 5–10 mph above posted limit for highway context. Too low (< 70 mph) generates excessive false positives on interstates.">
              <NumInput value={speedThreshold} onChange={setSpeedThreshold} min={55} max={120} suffix="mph" />
            </Row>
            <Row label="Harsh Brake G-Force" desc="G-force threshold to classify a braking event as harsh."
              formula={`harsh_brake if |decel_g| > ${harshBrakeG}g`}
              hint="0.35–0.45g is the industry standard. Below 0.3g flags normal city braking; above 0.5g misses genuinely dangerous stops.">
              <NumInput value={harshBrakeG} onChange={setHarshBrakeG} min={0.1} max={1.5} step={0.05} suffix="g" />
            </Row>
            <Row label="Harsh Accel G-Force" desc="G-force threshold to classify an acceleration event as harsh."
              formula={`harsh_accel if accel_g > ${harshAccelG}g`}
              hint="0.3–0.4g is typical. Harsh acceleration wears equipment and correlates with aggressive driving patterns.">
              <NumInput value={harshAccelG} onChange={setHarshAccelG} min={0.1} max={1.5} step={0.05} suffix="g" />
            </Row>
          </div>
        </div>

        {/* ── Row 4: Asset + Inspection ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Truck} label="Asset Scoring Rules"
              formula={`asset_score = status_base - age_penalty - reg_penalty - mileage_decay\nage_penalty = min(cap, max(0, (age-start) × rate))\nreg_penalty = expiredPenalty if expired else\n  (warningPenalty × days_remaining/warning_days)`} />
            <Row label="Active Status Score" desc="Base score for assets with 'Active' operational status."
              formula={`base = ${activeScore} if status == "Active"`}
              hint="Always keep at 100. Any active asset starts with full base score; all penalties subtract from here.">
              <NumInput value={activeScore} onChange={setActiveScore} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="In-Maintenance Score" desc="Base score for assets currently in maintenance."
              formula={`base = ${maintScore} if status == "Maintenance"`}
              hint="40–60 pts. In-maintenance means temporarily unavailable. Lower than Active to reflect operational impact.">
              <NumInput value={maintScore} onChange={setMaintScore} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Out-of-Service Score" desc="Base score for OOS assets — highest risk status."
              formula={`base = ${oosStatusScore} if status == "OutOfService"`}
              hint="Keep at 0. OOS means legally prohibited from operating. Any score > 0 understates the severity.">
              <NumInput value={oosStatusScore} onChange={setOosStatusScore} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Mileage Decay Curve" desc="How the mileage sub-score degrades as odometer increases."
              formula={`linear:      score = 100 - (odo/maxOdo) × 100\nexponential: score = 100 × e^(-odo/decay_const)\nstepped:     score = tier lookup by mileage bracket`}
              hint="Linear is simplest. Use Exponential for fleets with high-mileage vehicles where wear accelerates. Stepped is best for maintenance-tier models.">
              <Chips value={mileageCurve} onChange={v => setMileageCurve(v as typeof mileageCurve)}
                options={[{label:'Linear',value:'linear'},{label:'Exponential',value:'exponential'},{label:'Stepped',value:'stepped'}]} />
            </Row>
            <Row label="Reg. Warning Days" desc="Days before expiry to begin penalizing the asset score."
              formula={`reg_penalty starts if days_to_expiry < ${regWarningDays}`}
              hint="45–90 days gives enough lead time to act. Too short (< 30 days) = penalties hit before you can renew.">
              <NumInput value={regWarningDays} onChange={setRegWarningDays} min={7} max={365} suffix="days" />
            </Row>
            <Row label="Expired Reg. Penalty" desc="Score deducted when registration has already expired."
              formula={`score -= ${regExpiredPenalty} if reg_expired`}
              hint="30–50 pts. Expired registration is a serious compliance issue. Align with how your safety team weighs this risk.">
              <NumInput value={regExpiredPenalty} onChange={setRegExpiredPenalty} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Age Decay Start" desc="Asset age at which the age-based score penalty begins."
              formula={`penalty starts when age_years > ${ageDecayStart}`}
              hint="5–7 years is typical for commercial trucks. Adjust based on your fleet's average useful life and maintenance quality.">
              <NumInput value={ageDecayStart} onChange={setAgeDecayStart} min={1} max={20} suffix="years" />
            </Row>
            <Row label="Age Decay Rate" desc="Score points deducted per year of age beyond the decay start."
              formula={`age_penalty += ${ageDecayRate} per year beyond start`}
              hint="3–7 pts/year. Higher rates penalize aging fleets aggressively. Lower rates are better if you have strong preventive maintenance.">
              <NumInput value={ageDecayRate} onChange={setAgeDecayRate} min={0} max={20} suffix="pts/yr" />
            </Row>
            <Row label="Max Age Penalty Cap" desc="Maximum total score deduction from age decay."
              formula={`age_penalty = min(age_penalty, ${ageDecayCap})`}
              hint="30–50 pts. Without a cap, very old vehicles score near 0 which makes them indistinguishable in ranking.">
              <NumInput value={ageDecayCap} onChange={setAgeDecayCap} min={0} max={100} suffix="pts" />
            </Row>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={FileCheck} label="Inspection Scoring"
              formula={`insp_score = Σ(outcome_score[i] × recency[i]) / n_inspections\nrecency[i] = max(0, 1 - age_months[i]/cap × decay/100)\noutcome: pass=${passScore}, fail=${failScore}, oos=${oosScore}`} />
            <Row label="Pass Score" desc="Score value assigned to each passed roadside inspection."
              formula={`contribution = ${passScore} × recency_factor`}
              hint="Keep at 100. A pass is a pass — full credit. Lowering it makes inspections matter less.">
              <NumInput value={passScore} onChange={setPassScore} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Fail Score" desc="Score for a failed inspection with violations."
              formula={`contribution = ${failScore} × recency_factor`}
              hint="30–50 pts. Failing is serious but some violations are minor. A hard 0 is too punitive for paperwork violations.">
              <NumInput value={failScore} onChange={setFailScore} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Out-of-Service Score" desc="Score for inspections resulting in an OOS order."
              formula={`contribution = ${oosScore} × recency_factor - ${oosPenalty}`}
              hint="Keep at 0. OOS orders mean the vehicle was unsafe to operate. Adding a bonus penalty on top reinforces the severity.">
              <NumInput value={oosScore} onChange={setOosScore} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="OOS Additional Penalty" desc="Extra penalty deducted on top of OOS score."
              formula={`oos_total = ${oosScore} - ${oosPenalty} = ${oosScore - oosPenalty} pts`}
              hint="10–25 pts. This extra deduction ensures OOS inspections stand out from simple fails in score rankings.">
              <NumInput value={oosPenalty} onChange={setOosPenalty} min={0} max={50} suffix="pts" />
            </Row>
            <Row label="Recency Decay Rate" desc="Monthly discount rate — more recent inspections carry more weight."
              formula={`recency = max(0, 1 - age_months × (${inspDecay}/100))`}
              hint="10–20%/month is ideal. Aligns with how FMCSA weighting treats recent inspection history as more predictive.">
              <NumInput value={inspDecay} onChange={setInspDecay} suffix="%" />
            </Row>
            <Row label="Inspection Age Cap" desc="Inspections older than this are excluded from scoring."
              formula={`if age_months > ${inspAgeCap} → excluded`}
              hint="24 months matches most state safety rating windows. Using 36+ dilutes recent improvement signals.">
              <NumInput value={inspAgeCap} onChange={setInspAgeCap} min={1} max={60} suffix="months" />
            </Row>
            <Row label="Min Inspections for Score" desc="Minimum number needed before an inspection sub-score is generated."
              formula={`scored = count ≥ ${minInspections}`}
              hint="3 inspections minimum avoids outlier scores. New vehicles with 1 inspection result look artificially extreme.">
              <NumInput value={minInspections} onChange={setMinInspections} min={1} max={20} suffix="inspections" />
            </Row>
          </div>
        </div>

        {/* ── Row 5: Violations + Training ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Zap} label="Violation Scoring"
              formula={`viol_score = 100 - Σ(points[i] × recency[i])\npoints[i] = severity_penalty × type_weight\nrecency[i] = max(0, 1 - age_months[i]/cap × decay/100)`} />
            <Row label="Moving Violation Weight" desc="% of violation sub-score from moving violations."
              formula={`moving_contribution = viol_score × (${movingWeight}/100)`}
              hint="60–75% on moving violations. They directly predict crash risk. Non-moving (paperwork) violations are important but less predictive.">
              <SliderNum value={movingWeight} onChange={setMovingWeight} />
            </Row>
            <Row label="Non-Moving Violation Weight" desc="% from non-moving violations (parking, documentation)."
              formula={`non_moving_contribution = viol_score × (${nonMovingWeight}/100)`}
              hint="Should complement moving weight. Moving + Non-Moving weights don't need to sum to 100% — they apply independently to their respective violation pools.">
              <SliderNum value={nonMovingWeight} onChange={setNonMovingWeight} />
            </Row>
            <Row label="Critical Violation Penalty" desc="Points deducted per critical violation (DUI, reckless driving)."
              formula={`score -= ${criticalPenalty} × recency per critical violation`}
              hint="20–35 pts. Critical violations are license-threatening. This should be your highest penalty tier.">
              <NumInput value={criticalPenalty} onChange={setCriticalPenalty} min={0} max={50} suffix="pts" />
            </Row>
            <Row label="Major Violation Penalty" desc="Per major violation (excessive speeding, improper lane change)."
              formula={`score -= ${majorPenalty} × recency per major violation`}
              hint="10–20 pts. Keep at 50–60% of critical penalty. Major violations are recurring risks, not one-off catastrophic failures.">
              <NumInput value={majorPenalty} onChange={setMajorPenalty} min={0} max={30} suffix="pts" />
            </Row>
            <Row label="Minor Violation Penalty" desc="Per minor violation (equipment issues, paperwork violations)."
              formula={`score -= ${minorPenalty} × recency per minor violation`}
              hint="3–8 pts. Keep low enough that a few minor infractions don't dominate the score over more serious event types.">
              <NumInput value={minorPenalty} onChange={setMinorPenalty} min={0} max={20} suffix="pts" />
            </Row>
            <Row label="Violation Age Cap" desc="Violations older than this are no longer counted."
              formula={`if age_months > ${violAgeCap} → excluded`}
              hint="24 months standard. Aligns with most DMV/state record windows. 36 months for stricter fleets.">
              <NumInput value={violAgeCap} onChange={setViolAgeCap} min={1} max={60} suffix="months" />
            </Row>
            <Row label="Violation Recency Decay" desc="Monthly discount rate reducing older violations' impact."
              formula={`recency = max(0, 1 - age_months × (${violDecay}/100))`}
              hint="8–15%/month. Violations should fade in impact as drivers demonstrate improved behaviour over time.">
              <SliderNum value={violDecay} onChange={setViolDecay} />
            </Row>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={BookOpen} label="Training Scoring"
              formula={`training_score = (completion% × cw)\n  + (mandatory_done × mb)\n  + (optional_done × ob)\n  - expired_count × expiredPenalty\n  - expiring_count × expiryPenalty`} />
            <Row label="Completion Rate Weight" desc="How heavily the % of completed trainings factors into sub-score."
              formula={`contribution = (completed/total) × ${completionWeight}`}
              hint="55–65%. Completion rate is the core metric. Ensure this dominates the sub-score to reward consistent training.">
              <SliderNum value={completionWeight} onChange={setCompletionWeight} />
            </Row>
            <Row label="Mandatory Training Bonus" desc="Weight for completing all mandatory (required) training."
              formula={`bonus = ${mandatoryBonus} if all_mandatory_complete`}
              hint="25–35%. Mandatory training is non-negotiable compliance. This bonus separates fully-compliant drivers from partially complete ones.">
              <SliderNum value={mandatoryBonus} onChange={setMandatoryBonus} />
            </Row>
            <Row label="Optional Training Bonus" desc="Bonus weight for completing optional safety training beyond minimum."
              formula={`bonus = ${optionalBonus} × (optional_completed/optional_total)`}
              hint="5–15%. Rewards proactive safety culture without overweighting non-mandatory content.">
              <SliderNum value={optionalBonus} onChange={setOptionalBonus} />
            </Row>
            <Row label="Expiry Warning Days" desc="Days before expiry when a warning penalty begins to apply."
              formula={`warning if days_to_expiry < ${expiryWarning}`}
              hint="30 days gives time to act. Shorter (< 14 days) catches issues too late; longer (> 60) penalizes too early.">
              <NumInput value={expiryWarning} onChange={setExpiryWarning} min={7} max={180} suffix="days" />
            </Row>
            <Row label="Expiring Soon Penalty" desc="Points deducted when a required training is within the warning window."
              formula={`score -= ${expiryPenalty} per expiring certification`}
              hint="10–20 pts. Enough to be visible in rankings but not catastrophic — the expiry penalty handles the hard drop.">
              <NumInput value={expiryPenalty} onChange={setExpiryPenalty} min={0} max={30} suffix="pts" />
            </Row>
            <Row label="Expired Training Penalty" desc="Points deducted per fully expired mandatory certification."
              formula={`score -= ${expiredPenalty} per expired certification`}
              hint="25–40 pts. Expired mandatory training = compliance failure. Should be significantly higher than the warning penalty.">
              <NumInput value={expiredPenalty} onChange={setExpiredPenalty} min={0} max={50} suffix="pts" />
            </Row>
            <Row label="Min Training Hours / Year" desc="Annual minimum hours; below this triggers an additional deduction."
              formula={`penalty if annual_hours < ${minTrainingHrs}`}
              hint="8 hrs/year is the minimum for most fleets. Increase to 12–16 hrs for hazmat or specialized operations.">
              <NumInput value={minTrainingHrs} onChange={setMinTrainingHrs} min={0} max={40} suffix="hrs/yr" />
            </Row>
          </div>
        </div>

        {/* ── Row 6: Camera + Alerts ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Camera} label="Camera / VEDR Event Scoring"
              formula={`vedr_score = 100 - Σ(events[i] × penalty[i] × recency[i])\n  + coaching_completions × coaching_bonus\nrecency[i] = max(0, 1 - age_months[i]/12 × decay/100)`} />
            <Row label="Following Distance Penalty" desc="Per detected tailgating or insufficient following distance event."
              formula={`score -= ${followDistPenalty} × recency per event`}
              hint="8–12 pts. Following distance events are frequent but lower severity. Too high = tailgating alone tanks scores.">
              <NumInput value={followDistPenalty} onChange={setFollowDistPenalty} min={0} max={30} suffix="pts" />
            </Row>
            <Row label="Lane Deviation Penalty" desc="Per unintentional lane departure or swerving event."
              formula={`score -= ${laneDevPenalty} × recency per event`}
              hint="6–10 pts. Lane departures may be road condition related. Keep moderate unless your routes are primarily highway.">
              <NumInput value={laneDevPenalty} onChange={setLaneDevPenalty} min={0} max={30} suffix="pts" />
            </Row>
            <Row label="Distraction Penalty" desc="Per detected phone use, eating, or other distracted driving event."
              formula={`score -= ${distractionPenalty} × recency per event`}
              hint="12–18 pts. Distraction is the #1 crash cause. Keep this penalty higher than lane deviation.">
              <NumInput value={distractionPenalty} onChange={setDistractionPenalty} min={0} max={40} suffix="pts" />
            </Row>
            <Row label="Drowsiness / Fatigue Penalty" desc="Per detected drowsy or fatigued driving event."
              formula={`score -= ${drowsinessPenalty} × recency per event`}
              hint="18–25 pts. Fatigue is catastrophic at highway speeds. This should be the second-highest penalty after camera masking.">
              <NumInput value={drowsinessPenalty} onChange={setDrowsinessPenalty} min={0} max={50} suffix="pts" />
            </Row>
            <Row label="Camera Masking Penalty" desc="Per detected camera obstruction or tampering event."
              formula={`score -= ${maskingPenalty} × recency per event`}
              hint="25–35 pts. Camera masking is deliberate avoidance of safety monitoring. Highest VEDR penalty category.">
              <NumInput value={maskingPenalty} onChange={setMaskingPenalty} min={0} max={60} suffix="pts" />
            </Row>
            <Row label="Coaching Completion Bonus" desc="Points earned back when driver completes assigned coaching for an event."
              formula={`score += ${coachingBonus} per coaching session completed`}
              hint="4–8 pts. Incentivizes engaging with corrective coaching. Prevents drivers from feeling only penalized, never rewarded.">
              <NumInput value={coachingBonus} onChange={setCoachingBonus} min={0} max={20} suffix="pts" />
            </Row>
            <Row label="VEDR Recency Decay" desc="Monthly decay rate reducing impact of older camera events."
              formula={`recency = max(0, 1 - age_months × (${vedrDecay}/100))`}
              hint="20–30%/month. Camera events are high-frequency; without decay, older minor events accumulate and distort the score.">
              <SliderNum value={vedrDecay} onChange={setVedrDecay} />
            </Row>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionTitle icon={Bell} label="Alerts & Triggers"
              formula={`alert if score_drop ≥ drop_threshold\nalert if score < critical_score\ncooldown: no re-alert for same driver within cooldown_days`} />
            <Row label="Score Drop Alert" desc="Alert fired when a driver's score drops by this many points in one refresh."
              formula={`alert if (prev_score - new_score) ≥ ${scoreDropAlert}`}
              hint="8–15 pts. Smaller thresholds create alert noise; larger ones miss sudden deterioration. 10 pts is the sweet spot.">
              <NumInput value={scoreDropAlert} onChange={setScoreDropAlert} min={1} max={50} suffix="pts" />
            </Row>
            <Row label="Critical Score Alert" desc="Immediate alert when any driver or asset falls below this score."
              formula={`alert if score < ${criticalAlert}`}
              hint="Set just below your Fair threshold (typically 60–68). Catching drivers before they drop to Poor gives time to intervene.">
              <NumInput value={criticalAlert} onChange={setCriticalAlert} min={0} max={100} suffix="pts" />
            </Row>
            <Row label="Alert Cooldown" desc="Minimum days between repeated alerts for the same driver/asset."
              formula={`suppress if last_alert_date < today - ${alertCooldown} days`}
              hint="5–10 days. Prevents alert fatigue while still catching sustained decline. Too short = spam; too long = missed patterns.">
              <NumInput value={alertCooldown} onChange={setAlertCooldown} min={1} max={30} suffix="days" />
            </Row>
            <Row label="Email Alerts" desc="Send score drop and critical alerts via email to safety managers."
              formula={`if alert_triggered AND email_alerts=true → send_email()`}
              hint="Keep enabled for all critical-score alerts. Consider disabling for score-drop alerts if email volume is too high.">
              <Toggle checked={emailAlerts} onChange={setEmailAlerts} label="Enabled" />
            </Row>
            <Row label="In-App Notifications" desc="Show alert banners inside the application in real time."
              formula={`if alert_triggered AND in_app=true → push_notification()`}
              hint="Always keep enabled. Real-time in-app alerts are the fastest path to dispatcher awareness.">
              <Toggle checked={inAppAlerts} onChange={setInAppAlerts} label="Enabled" />
            </Row>
            <Row label="Weekly Digest Report" desc="Auto-generate and email a weekly safety performance summary."
              formula={`every Monday: aggregate(prev_7_days) → email_digest()`}
              hint="Highly recommended for management review. Provides a trend view that single-event alerts can't show.">
              <Toggle checked={weeklyDigest} onChange={setWeeklyDigest} label="Enabled" />
            </Row>
            <Row label="Auto-Flag High-Risk Drivers" desc="Place a risk flag badge on drivers whose score drops below the critical threshold."
              formula={`flag = true if score < critical_score_alert (${criticalAlert})`}
              hint="Keep enabled. Visual flags in the driver list immediately surface who needs attention without digging through scores.">
              <Toggle checked={autoFlag} onChange={setAutoFlag} label="Enabled" />
            </Row>
          </div>
        </div>

        {/* ── Row 7: Display & Defaults ─────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Gauge} label="Display & Default Settings" />
          <div className="grid grid-cols-2 gap-x-12">
            <div>
              <Row label="Default Time Window" desc="Pre-selected time window when opening a driver dashboard."
                formula={`default_window = "${defaultWindow}" on first load`}
                hint="12mo is the most balanced default — enough history to be meaningful, recent enough to reflect current behaviour.">
                <Chips value={defaultWindow} onChange={v => setDefaultWindow(String(v))}
                  options={['1w','2w','1mo','6mo','12mo','20mo','24mo'].map(w=>({label:w,value:w}))} />
              </Row>
              <Row label="Default Metric Mode" desc="Whether the driver dashboard opens in Time or Distance mode."
                formula={`dashboard opens in "${defaultMode}" mode by default`}
                hint="Time mode is more intuitive for most users. Use Distance mode as default only for fleets where mileage-based performance is the primary metric.">
                <Chips value={defaultMode} onChange={v => setDefaultMode(String(v))} options={[{label:'Time',value:'time'},{label:'Distance',value:'distance'}]} />
              </Row>
              <Row label="Distance Unit" desc="Default unit for odometer readings and distance calculations."
                formula={`display_dist = odo_miles × (unit == "km" ? 1.60934 : 1)`}
                hint="Use mi for US operations, km for Canadian/international. Mismatched units cause confusion in maintenance interval planning.">
                <Chips value={defaultDistUnit} onChange={v => setDefaultDistUnit(String(v))} options={[{label:'Miles',value:'mi'},{label:'KM',value:'km'}]} />
              </Row>
              <Row label="Default Maintenance Interval" desc="Pre-selected interval on the asset dashboard."
                formula={`flag_asset if odo >= last_service + ${defaultInterval}`}
                hint="10,000–15,000 mi is standard for modern diesel trucks. Lower for older equipment or severe-duty cycles.">
                <Chips value={defaultInterval} onChange={v => setDefaultInterval(Number(v))} color="green"
                  options={[1000,2000,5000,10000,12000,15000].map(mi=>({label:`${mi>=1000?mi/1000+'k':mi} mi`,value:mi}))} />
              </Row>
            </div>
            <div>
              <Row label="Score Decimal Places" desc="How many decimal places on all safety scores."
                formula={`display = score.toFixed(${scoreDecimals})`}
                hint="1 decimal is the best balance — precise enough to differentiate close scores, clean enough for quick reading.">
                <div className="flex items-center gap-3">
                  <Chips value={scoreDecimals} onChange={v => setScoreDecimals(Number(v))} options={[{label:'0',value:0},{label:'1',value:1},{label:'2',value:2}]} />
                  <span className="text-xs text-slate-400">→ <strong className="text-slate-700">87{scoreDecimals > 0 ? '.' + '0'.repeat(scoreDecimals) : ''}{showPercent ? '%' : ''}</strong></span>
                </div>
              </Row>
              <Row label="Show % Symbol" desc="Append a % after all displayed score values."
                formula={`display = score + (show_percent ? "%" : "")`}
                hint="Keep enabled — it's a constant reminder that scores are percentages, not raw point values.">
                <Toggle checked={showPercent} onChange={setShowPercent} label="Show %" />
              </Row>
              <Row label="Show Rank Badges" desc="Display rank position badges on fleet ranking lists."
                formula={`rank = position in sorted(fleet_scores, desc)`}
                hint="Enable for team-based motivation and quick identification of top/bottom performers.">
                <Toggle checked={showRankBadges} onChange={setShowRankBadges} label="Enabled" />
              </Row>
              <Row label="Show Trend Arrows" desc="Show up/down arrows on score cards showing recent direction."
                formula={`trend = sign(current_score - prev_period_score)`}
                hint="Very useful for dispatchers. An arrow tells you whether a score is improving or declining without needing to compare numbers manually.">
                <Toggle checked={showTrendArrows} onChange={setShowTrendArrows} label="Enabled" />
              </Row>
              <Row label="Color-Blind Mode" desc="Replace color indicators with patterns and labels."
                formula={`if color_blind → use pattern+label instead of color`}
                hint="Enable if any team members have color vision deficiency. Patterns + text labels ensure no information is lost for any user.">
                <Toggle checked={colorBlindMode} onChange={setColorBlindMode} label="Enabled" />
              </Row>
            </div>
          </div>
        </div>

        {/* Bottom Save */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button onClick={handleReset} className="bg-white text-slate-700 text-sm font-bold py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset All to Defaults
          </button>
          <button onClick={handleSave} className={`text-sm font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${saved ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <Save className="w-4 h-4" /> {saved ? 'All Changes Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
