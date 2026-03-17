import { useState, useEffect } from 'react';
import {
  Shield, Info, RotateCcw, Save,
  BarChart2, Sliders, AlertTriangle, Target, Gauge, Users,
  Truck, FileCheck, BookOpen, Camera, Activity, Bell, Zap,
  TrendingUp,
} from 'lucide-react';
import {
  loadSafetySettings,
  saveSafetySettings,
  DEFAULT_SAFETY_SETTINGS,
} from '../safety-analysis/safetySettings';

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

export function SafetySettingsPage() {
  // ── Load persisted settings once at mount ────────────────────────────────
  const _init = loadSafetySettings();

  const [saved, setSaved] = useState(false);
  const [weights, setWeights] = useState([
    { key: 'accidents',   label: 'Accidents',     color: 'bg-red-500',     value: _init.wAccidents   },
    { key: 'eld',         label: 'ELD / HOS',     color: 'bg-blue-500',    value: _init.wEld         },
    { key: 'vedr',        label: 'Camera / VEDR', color: 'bg-purple-500',  value: _init.wVedr        },
    { key: 'inspections', label: 'Inspections',   color: 'bg-emerald-500', value: _init.wInspections },
    { key: 'violations',  label: 'Violations',    color: 'bg-amber-500',   value: _init.wViolations  },
    { key: 'trainings',   label: 'Trainings',     color: 'bg-teal-500',    value: _init.wTrainings   },
  ]);
  const updateWeight = (key: string, val: number) =>
    setWeights(ws => ws.map(w => w.key === key ? { ...w, value: Math.max(0, Math.min(100, val)) } : w));
  const totalWeight = weights.reduce((s, w) => s + w.value, 0);

  const [thresholds, setThresholds] = useState({ excellent: _init.threshExcellent, good: _init.threshGood, fair: _init.threshFair });
  const [timeVol, setTimeVol] = useState(_init.timeVol);
  const [distVol, setDistVol] = useState(_init.distVol);
  const [dateVol, setDateVol] = useState(_init.dateVol);
  const [windowDecay, setWindowDecay] = useState(_init.windowDecay);
  const [baselineWindow, setBaselineWindow] = useState(_init.baselineWindow);
  const [fleetAverage, setFleetAverage] = useState(78);
  const [fleetBenchmark, setFleetBenchmark] = useState(75);
  const [industryBenchmark, setIndustryBenchmark] = useState(72);
  const [showFleetAvgOnRadar, setShowFleetAvgOnRadar] = useState(true);
  const [showIndustryBenchmark, setShowIndustryBenchmark] = useState(false);
  const [fatalWeight, setFatalWeight] = useState(_init.fatalWeight);
  const [injuryWeight, setInjuryWeight] = useState(_init.injuryWeight);
  const [propertyWeight, setPropertyWeight] = useState(_init.propertyWeight);
  const [nearMissWeight, setNearMissWeight] = useState(_init.nearMissWeight);
  const [recencyDecay, setRecencyDecay] = useState(_init.recencyDecay);
  const [incidentAgeCap, setIncidentAgeCap] = useState(_init.incidentAgeCap);
  const [towAwayMult, setTowAwayMult] = useState(_init.towAwayMult);
  const [hazmatMult, setHazmatMult] = useState(_init.hazmatMult);
  const [atFaultMult, setAtFaultMult] = useState(_init.atFaultMult);
  const [hosWindow, setHosWindow] = useState(_init.hosWindow);
  const [eldGrace, setEldGrace] = useState(_init.eldGrace);
  const [driverAgeCap, setDriverAgeCap] = useState(_init.driverAgeCap);
  const [minDrivingDays, setMinDrivingDays] = useState(_init.minDrivingDays);
  const [noEventBonus, setNoEventBonus] = useState(_init.noEventBonus);
  const [speedThreshold, setSpeedThreshold] = useState(_init.speedThreshold);
  const [harshBrakeG, setHarshBrakeG] = useState(_init.harshBrakeG);
  const [harshAccelG, setHarshAccelG] = useState(_init.harshAccelG);
  const [activeScore, setActiveScore] = useState(_init.activeScore);
  const [maintScore, setMaintScore] = useState(_init.maintScore);
  const [oosStatusScore, setOosStatusScore] = useState(_init.oosStatusScore);
  const [mileageCurve, setMileageCurve] = useState<'linear' | 'exponential' | 'stepped'>(_init.mileageCurve);
  const [regWarningDays, setRegWarningDays] = useState(_init.regWarningDays);
  const [regExpiredPenalty, setRegExpiredPenalty] = useState(_init.regExpiredPenalty);
  const [ageDecayStart, setAgeDecayStart] = useState(_init.ageDecayStart);
  const [ageDecayRate, setAgeDecayRate] = useState(_init.ageDecayRate);
  const [ageDecayCap, setAgeDecayCap] = useState(_init.ageDecayCap);
  const [passScore, setPassScore] = useState(_init.passScore);
  const [failScore, setFailScore] = useState(_init.failScore);
  const [oosScore, setOosScore] = useState(_init.oosScore);
  const [oosPenalty, setOosPenalty] = useState(_init.oosPenalty);
  const [inspDecay, setInspDecay] = useState(_init.inspDecay);
  const [inspAgeCap, setInspAgeCap] = useState(_init.inspAgeCap);
  const [minInspections, setMinInspections] = useState(_init.minInspections);
  const [movingWeight, setMovingWeight] = useState(_init.movingWeight);
  const [nonMovingWeight, setNonMovingWeight] = useState(_init.nonMovingWeight);
  const [criticalPenalty, setCriticalPenalty] = useState(_init.criticalPenalty);
  const [majorPenalty, setMajorPenalty] = useState(_init.majorPenalty);
  const [minorPenalty, setMinorPenalty] = useState(_init.minorPenalty);
  const [violAgeCap, setViolAgeCap] = useState(_init.violAgeCap);
  const [violDecay, setViolDecay] = useState(_init.violDecay);
  const [completionWeight, setCompletionWeight] = useState(_init.completionWeight);
  const [mandatoryBonus, setMandatoryBonus] = useState(_init.mandatoryBonus);
  const [optionalBonus, setOptionalBonus] = useState(_init.optionalBonus);
  const [expiryWarning, setExpiryWarning] = useState(_init.expiryWarning);
  const [expiryPenalty, setExpiryPenalty] = useState(_init.expiryPenalty);
  const [expiredPenalty, setExpiredPenalty] = useState(_init.expiredPenalty);
  const [minTrainingHrs, setMinTrainingHrs] = useState(_init.minTrainingHrs);
  const [followDistPenalty, setFollowDistPenalty] = useState(_init.followDistPenalty);
  const [laneDevPenalty, setLaneDevPenalty] = useState(_init.laneDevPenalty);
  const [distractionPenalty, setDistractionPenalty] = useState(_init.distractionPenalty);
  const [drowsinessPenalty, setDrowsinessPenalty] = useState(_init.drowsinessPenalty);
  const [maskingPenalty, setMaskingPenalty] = useState(_init.maskingPenalty);
  const [coachingBonus, setCoachingBonus] = useState(_init.coachingBonus);
  const [vedrDecay, setVedrDecay] = useState(_init.vedrDecay);
  const [scoreDropAlert, setScoreDropAlert] = useState(_init.scoreDropAlert);
  const [criticalAlert, setCriticalAlert] = useState(_init.criticalAlert);
  const [alertCooldown, setAlertCooldown] = useState(_init.alertCooldown);
  const [emailAlerts, setEmailAlerts] = useState(_init.emailAlerts);
  const [inAppAlerts, setInAppAlerts] = useState(_init.inAppAlerts);
  const [weeklyDigest, setWeeklyDigest] = useState(_init.weeklyDigest);
  const [autoFlag, setAutoFlag] = useState(_init.autoFlag);
  const [defaultWindow, setDefaultWindow] = useState(_init.defaultWindow);
  const [defaultMode, setDefaultMode] = useState(_init.defaultMode);
  const [defaultDistUnit, setDefaultDistUnit] = useState(_init.defaultDistUnit);
  const [defaultInterval, setDefaultInterval] = useState(_init.defaultInterval);
  const [scoreDecimals, setScoreDecimals] = useState(_init.scoreDecimals);
  const [showPercent, setShowPercent] = useState(_init.showPercent);
  const [showRankBadges, setShowRankBadges] = useState(_init.showRankBadges);
  const [showTrendArrows, setShowTrendArrows] = useState(_init.showTrendArrows);
  const [colorBlindMode, setColorBlindMode] = useState(_init.colorBlindMode);

  // ── SMS / FMCSA Configuration ─────────────────────────────────────────────
  const [smsFormulaMode, setSmsFormulaMode] = useState<'time' | 'distance'>(_init.smsFormulaMode);
  const [smsCarrierType, setSmsCarrierType] = useState<'general' | 'hm' | 'passenger'>(_init.smsCarrierType);
  const [smsCarrierSegment, setSmsCarrierSegment] = useState<'combination' | 'straight'>(_init.smsCarrierSegment);
  const [smsAvgPU, setSmsAvgPU] = useState(_init.smsAvgPU);
  const [smsAnnualVmtPerPU, setSmsAnnualVmtPerPU] = useState(_init.smsAnnualVmtPerPU);
  const [smsLookbackMonths, setSmsLookbackMonths] = useState(_init.smsLookbackMonths);
  const [smsDecayBand1Pct, setSmsDecayBand1Pct] = useState(_init.smsDecayBand1Pct);
  const [smsDecayBand2Pct, setSmsDecayBand2Pct] = useState(_init.smsDecayBand2Pct);
  const [smsDecayBand3Pct, setSmsDecayBand3Pct] = useState(_init.smsDecayBand3Pct);
  const [smsOosBonus, setSmsOosBonus] = useState(_init.smsOosBonus);
  const [smsPerInspectionCap, setSmsPerInspectionCap] = useState(_init.smsPerInspectionCap);

  // ── Score Blending ────────────────────────────────────────────────────────
  const [opWeight,   setOpWeight]   = useState(_init.opWeight);
  const [regWeight,  setRegWeight]  = useState(_init.regWeight);
  const [smsBlend,   setSmsBlend]   = useState(_init.smsBlend);
  const [cvorBlend,  setCvorBlend]  = useState(_init.cvorBlend);

  // ── Persist ALL settings to localStorage whenever any setting changes ────────
  useEffect(() => {
    const w = weights.reduce((acc, wt) => ({ ...acc, [wt.key]: wt.value }), {} as Record<string, number>);
    saveSafetySettings({
      // SMS / FMCSA
      smsFormulaMode, smsCarrierType, smsCarrierSegment,
      smsAvgPU, smsAnnualVmtPerPU, smsLookbackMonths,
      smsDecayBand1Pct, smsDecayBand2Pct, smsDecayBand3Pct,
      smsOosBonus, smsPerInspectionCap,
      // Score Blending
      opWeight, regWeight, smsBlend, cvorBlend,
      // Component Weights
      wAccidents: w.accidents ?? 25, wEld: w.eld ?? 20, wVedr: w.vedr ?? 15,
      wInspections: w.inspections ?? 20, wViolations: w.violations ?? 10, wTrainings: w.trainings ?? 10,
      // Rating Thresholds
      threshExcellent: thresholds.excellent, threshGood: thresholds.good, threshFair: thresholds.fair,
      // Incident
      fatalWeight, injuryWeight, propertyWeight, nearMissWeight,
      recencyDecay, incidentAgeCap, towAwayMult, hazmatMult, atFaultMult,
      // Driver Rules
      timeVol, distVol, dateVol, windowDecay, baselineWindow,
      hosWindow, eldGrace, driverAgeCap, minDrivingDays, noEventBonus,
      speedThreshold, harshBrakeG, harshAccelG,
      // Asset
      activeScore, maintScore, oosStatusScore, mileageCurve,
      regWarningDays, regExpiredPenalty, ageDecayStart, ageDecayRate, ageDecayCap,
      // Inspection
      passScore, failScore, oosScore, oosPenalty, inspDecay, inspAgeCap, minInspections,
      // Violation
      movingWeight, nonMovingWeight, criticalPenalty, majorPenalty, minorPenalty, violAgeCap, violDecay,
      // Training
      completionWeight, mandatoryBonus, optionalBonus, expiryWarning, expiryPenalty, expiredPenalty, minTrainingHrs,
      // VEDR
      followDistPenalty, laneDevPenalty, distractionPenalty, drowsinessPenalty,
      maskingPenalty, coachingBonus, vedrDecay,
      // Alerts
      scoreDropAlert, criticalAlert, alertCooldown, emailAlerts, inAppAlerts, weeklyDigest, autoFlag,
      // Display
      defaultWindow, defaultMode, defaultDistUnit, defaultInterval,
      scoreDecimals, showPercent, showRankBadges, showTrendArrows, colorBlindMode,
    });
  }, [
    weights, smsFormulaMode, smsCarrierType, smsCarrierSegment,
    smsAvgPU, smsAnnualVmtPerPU, smsLookbackMonths,
    smsDecayBand1Pct, smsDecayBand2Pct, smsDecayBand3Pct, smsOosBonus, smsPerInspectionCap,
    opWeight, regWeight, smsBlend, cvorBlend,
    thresholds, fatalWeight, injuryWeight, propertyWeight, nearMissWeight,
    recencyDecay, incidentAgeCap, towAwayMult, hazmatMult, atFaultMult,
    timeVol, distVol, dateVol, windowDecay, baselineWindow,
    hosWindow, eldGrace, driverAgeCap, minDrivingDays, noEventBonus,
    speedThreshold, harshBrakeG, harshAccelG,
    activeScore, maintScore, oosStatusScore, mileageCurve,
    regWarningDays, regExpiredPenalty, ageDecayStart, ageDecayRate, ageDecayCap,
    passScore, failScore, oosScore, oosPenalty, inspDecay, inspAgeCap, minInspections,
    movingWeight, nonMovingWeight, criticalPenalty, majorPenalty, minorPenalty, violAgeCap, violDecay,
    completionWeight, mandatoryBonus, optionalBonus, expiryWarning, expiryPenalty, expiredPenalty, minTrainingHrs,
    followDistPenalty, laneDevPenalty, distractionPenalty, drowsinessPenalty,
    maskingPenalty, coachingBonus, vedrDecay,
    scoreDropAlert, criticalAlert, alertCooldown, emailAlerts, inAppAlerts, weeklyDigest, autoFlag,
    defaultWindow, defaultMode, defaultDistUnit, defaultInterval,
    scoreDecimals, showPercent, showRankBadges, showTrendArrows, colorBlindMode,
  ]);

  const handleReset = () => {
    const d = DEFAULT_SAFETY_SETTINGS;
    setWeights([
      { key: 'accidents',   label: 'Accidents',     color: 'bg-red-500',     value: d.wAccidents   },
      { key: 'eld',         label: 'ELD / HOS',     color: 'bg-blue-500',    value: d.wEld         },
      { key: 'vedr',        label: 'Camera / VEDR', color: 'bg-purple-500',  value: d.wVedr        },
      { key: 'inspections', label: 'Inspections',   color: 'bg-emerald-500', value: d.wInspections },
      { key: 'violations',  label: 'Violations',    color: 'bg-amber-500',   value: d.wViolations  },
      { key: 'trainings',   label: 'Trainings',     color: 'bg-teal-500',    value: d.wTrainings   },
    ]);
    setThresholds({ excellent: d.threshExcellent, good: d.threshGood, fair: d.threshFair });
    setTimeVol(d.timeVol); setDistVol(d.distVol); setDateVol(d.dateVol);
    setWindowDecay(d.windowDecay); setBaselineWindow(d.baselineWindow);
    setFleetAverage(78); setFleetBenchmark(75); setIndustryBenchmark(72);
    setShowFleetAvgOnRadar(true); setShowIndustryBenchmark(false);
    setFatalWeight(d.fatalWeight); setInjuryWeight(d.injuryWeight);
    setPropertyWeight(d.propertyWeight); setNearMissWeight(d.nearMissWeight);
    setRecencyDecay(d.recencyDecay); setIncidentAgeCap(d.incidentAgeCap);
    setTowAwayMult(d.towAwayMult); setHazmatMult(d.hazmatMult); setAtFaultMult(d.atFaultMult);
    setHosWindow(d.hosWindow); setEldGrace(d.eldGrace); setDriverAgeCap(d.driverAgeCap);
    setMinDrivingDays(d.minDrivingDays); setNoEventBonus(d.noEventBonus);
    setSpeedThreshold(d.speedThreshold); setHarshBrakeG(d.harshBrakeG); setHarshAccelG(d.harshAccelG);
    setActiveScore(d.activeScore); setMaintScore(d.maintScore); setOosStatusScore(d.oosStatusScore);
    setMileageCurve(d.mileageCurve); setRegWarningDays(d.regWarningDays);
    setRegExpiredPenalty(d.regExpiredPenalty); setAgeDecayStart(d.ageDecayStart);
    setAgeDecayRate(d.ageDecayRate); setAgeDecayCap(d.ageDecayCap);
    setPassScore(d.passScore); setFailScore(d.failScore); setOosScore(d.oosScore);
    setOosPenalty(d.oosPenalty); setInspDecay(d.inspDecay); setInspAgeCap(d.inspAgeCap);
    setMinInspections(d.minInspections);
    setMovingWeight(d.movingWeight); setNonMovingWeight(d.nonMovingWeight);
    setCriticalPenalty(d.criticalPenalty); setMajorPenalty(d.majorPenalty); setMinorPenalty(d.minorPenalty);
    setViolAgeCap(d.violAgeCap); setViolDecay(d.violDecay);
    setCompletionWeight(d.completionWeight); setMandatoryBonus(d.mandatoryBonus);
    setOptionalBonus(d.optionalBonus); setExpiryWarning(d.expiryWarning);
    setExpiryPenalty(d.expiryPenalty); setExpiredPenalty(d.expiredPenalty);
    setMinTrainingHrs(d.minTrainingHrs);
    setFollowDistPenalty(d.followDistPenalty); setLaneDevPenalty(d.laneDevPenalty);
    setDistractionPenalty(d.distractionPenalty); setDrowsinessPenalty(d.drowsinessPenalty);
    setMaskingPenalty(d.maskingPenalty); setCoachingBonus(d.coachingBonus); setVedrDecay(d.vedrDecay);
    setScoreDropAlert(d.scoreDropAlert); setCriticalAlert(d.criticalAlert);
    setAlertCooldown(d.alertCooldown); setEmailAlerts(d.emailAlerts);
    setInAppAlerts(d.inAppAlerts); setWeeklyDigest(d.weeklyDigest); setAutoFlag(d.autoFlag);
    setDefaultWindow(d.defaultWindow); setDefaultMode(d.defaultMode);
    setDefaultDistUnit(d.defaultDistUnit); setDefaultInterval(d.defaultInterval);
    setScoreDecimals(d.scoreDecimals); setShowPercent(d.showPercent);
    setShowRankBadges(d.showRankBadges); setShowTrendArrows(d.showTrendArrows);
    setColorBlindMode(d.colorBlindMode);
    setSmsFormulaMode(d.smsFormulaMode); setSmsCarrierType(d.smsCarrierType);
    setSmsCarrierSegment(d.smsCarrierSegment);
    setSmsAvgPU(d.smsAvgPU); setSmsAnnualVmtPerPU(d.smsAnnualVmtPerPU);
    setSmsLookbackMonths(d.smsLookbackMonths);
    setSmsDecayBand1Pct(d.smsDecayBand1Pct); setSmsDecayBand2Pct(d.smsDecayBand2Pct);
    setSmsDecayBand3Pct(d.smsDecayBand3Pct);
    setSmsOosBonus(d.smsOosBonus); setSmsPerInspectionCap(d.smsPerInspectionCap);
    setOpWeight(d.opWeight); setRegWeight(d.regWeight);
    setSmsBlend(d.smsBlend); setCvorBlend(d.cvorBlend);
  };

  const isWeightsValid = totalWeight === 100;
  const isBlendValid   = opWeight + regWeight === 100;
  const isSmsValid     = smsBlend + cvorBlend === 100;
  const canSave        = isWeightsValid && isBlendValid && isSmsValid;

  const handleSave = () => {
    if (!canSave) return;
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
          <button onClick={handleSave} disabled={!canSave}
            className={`text-sm font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${saved ? 'bg-emerald-600 text-white' : canSave ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-300 text-slate-500 cursor-not-allowed'}`}>
            <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Validation banner */}
      {!canSave && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {!isWeightsValid && `Component weights must sum to 100% (currently ${totalWeight}%). `}
            {!isBlendValid  && `Operational + Regulatory weights must sum to 100% (currently ${opWeight + regWeight}%). `}
            {!isSmsValid    && `SMS + CVOR blend must sum to 100% (currently ${smsBlend + cvorBlend}%). `}
            Save is disabled until fixed.
          </span>
        </div>
      )}

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

        {/* ── Row 8: SMS / FMCSA Configuration ───────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <SectionTitle icon={Zap} label="SMS / FMCSA Configuration"
            formula={`Unsafe Driving = Σ(sev × eff_wt) / (avgPU × utilFactor)\nOther BASICs  = Σ(sev × eff_wt) / Σ(eff_wt × relevant_insp)\neff_wt        = time_weight × (1 - decay_pct / 100)`} />
          <p className="text-[11px] text-slate-400 mb-5">
            Configure the FMCSA Safety Measurement System (SMS) engine used for BASIC score calculation and XLSX export.
            These settings apply the custom decay bands on top of the FMCSA time-weight methodology.
          </p>

          <div className="grid grid-cols-2 gap-x-12">
            {/* Left column */}
            <div>
              <Row label="Formula Mode" desc="Whether BASIC scores use time-based or distance-based event weighting."
                formula={`time mode: bucket = age_months → weight 3/2/1\ndistance mode: bucket = miles_since → weight 3/2/1`}
                hint="Time mode matches FMCSA standard. Use Distance mode for fleets where utilization varies widely by mileage rather than time.">
                <Chips value={smsFormulaMode} onChange={v => setSmsFormulaMode(v as 'time' | 'distance')}
                  options={[{label:'Time',value:'time'},{label:'Distance',value:'distance'}]} />
              </Row>
              <Row label="Carrier Type" desc="FMCSA carrier classification for SMS alert threshold lookup."
                formula={`alert_pct = FMCSA_THRESHOLDS[carrier_type][basic_key]`}
                hint="General: most motor carriers. Hazmat: stricter thresholds on HM + CS BASICs. Passenger: strictest thresholds on driving & fitness BASICs.">
                <Chips value={smsCarrierType} onChange={v => setSmsCarrierType(v as 'general' | 'hm' | 'passenger')}
                  options={[{label:'General',value:'general'},{label:'Hazmat',value:'hm'},{label:'Passenger',value:'passenger'}]} />
              </Row>
              <Row label="Carrier Segment" desc="Combination vs straight-truck segment — affects Utilization Factor denominator."
                formula={`utilFactor = FMCSA_VMT_TABLE[annualVmtPerPU][segment]`}
                hint="Combination carriers (18-wheelers) have a higher utilization factor per VMT bracket than straight trucks. Impacts Unsafe Driving BASIC denominator.">
                <Chips value={smsCarrierSegment} onChange={v => setSmsCarrierSegment(v as 'combination' | 'straight')}
                  options={[{label:'Combination',value:'combination'},{label:'Straight',value:'straight'}]} />
              </Row>
              <Row label="Average Power Units (Avg PU)" desc="Average number of trucks in the fleet during the lookback window."
                formula={`unsafe_driving_denom = avgPU × utilFactor`}
                hint="Pull from your carrier snapshot or DOT registration. FMCSA uses monthly average PU count across the lookback window.">
                <NumInput value={smsAvgPU} onChange={setSmsAvgPU} min={1} max={9999} step={1} suffix="trucks" />
              </Row>
              <Row label="Annual VMT per Power Unit" desc="Average annual vehicle miles traveled per truck — determines Utilization Factor tier."
                formula={`utilFactor = FMCSA_VMT_TABLE[annualVmtPerPU][segment]`}
                hint="Higher VMT = higher utilization factor, which lowers per-event impact on Unsafe Driving BASIC. FMCSA uses 50k / 100k / 150k / 200k+ stepped tiers.">
                <NumInput value={smsAnnualVmtPerPU} onChange={setSmsAnnualVmtPerPU} min={1000} max={500000} step={5000} suffix="mi/yr" />
              </Row>
              <Row label="Lookback Window" desc="Maximum event age included in BASIC score calculation."
                formula={`include if age_months ≤ ${smsLookbackMonths} (else excluded, weight = 0)`}
                hint="FMCSA standard is 24 months. Extending to 30–36 may reveal long-term patterns but deviates from regulatory methodology.">
                <NumInput value={smsLookbackMonths} onChange={setSmsLookbackMonths} min={12} max={60} step={6} suffix="months" />
              </Row>
            </div>

            {/* Right column */}
            <div>
              <Row label="Decay Band 0–6 Months" desc="Decay applied to events 0–6 months old. 0% = no decay (FMCSA standard)."
                formula={`age ∈ [0, 6)  → eff_wt = 3 × (1 - ${smsDecayBand1Pct}/100) = ${(3 * (1 - smsDecayBand1Pct/100)).toFixed(2)}`}
                hint="Keep at 0% to match FMCSA. Raising this would under-penalize the most recent events relative to the standard methodology.">
                <SliderNum value={smsDecayBand1Pct} onChange={setSmsDecayBand1Pct} min={0} max={50} step={1} suffix="% decay" />
              </Row>
              <Row label="Decay Band 6–12 Months" desc="Decay applied to events 6–12 months old. Custom default: 5%."
                formula={`age ∈ [6, 12) → eff_wt = 2 × (1 - ${smsDecayBand2Pct}/100) = ${(2 * (1 - smsDecayBand2Pct/100)).toFixed(2)}`}
                hint="5% provides a mild recency boost beyond raw FMCSA weighting. Increase to 10–20% to more aggressively reward improvement over the past year.">
                <SliderNum value={smsDecayBand2Pct} onChange={setSmsDecayBand2Pct} min={0} max={50} step={1} suffix="% decay" />
              </Row>
              <Row label="Decay Band 12–24 Months" desc="Decay applied to events 12–24 months old. Custom default: 40%."
                formula={`age ∈ [12, 24) → eff_wt = 1 × (1 - ${smsDecayBand3Pct}/100) = ${(1 * (1 - smsDecayBand3Pct/100)).toFixed(2)}`}
                hint="40% significantly reduces older event impact. Raising to 50–60% further rewards fleets that have dramatically improved in the past year.">
                <SliderNum value={smsDecayBand3Pct} onChange={setSmsDecayBand3Pct} min={0} max={80} step={5} suffix="% decay" />
              </Row>
              <Row label="OOS Severity Bonus" desc="Additional severity points added when a violation triggers an out-of-service order."
                formula={`oos_sev = base_sev + oos_bonus\nApplies to: HOS, Veh. Maint., HM Compliance, Driver Fitness`}
                hint="FMCSA standard OOS bonus is +2 severity points. Raising this further emphasizes OOS violations relative to non-OOS violations of the same category.">
                <NumInput value={smsOosBonus} onChange={setSmsOosBonus} min={0} max={10} step={1} suffix="pts bonus" />
              </Row>
              <Row label="Per-Inspection Severity Cap" desc="Maximum summed severity from a single inspection, applied before time weighting."
                formula={`capped_sev = min(Σsev_per_insp, ${smsPerInspectionCap})\nApplies to: HOS, VM, CS/Alc, HM, Driver Fitness`}
                hint="FMCSA caps at 30 to prevent a single catastrophic inspection from dominating the BASIC. Lower = more distributed risk; higher = more single-event sensitivity.">
                <NumInput value={smsPerInspectionCap} onChange={setSmsPerInspectionCap} min={10} max={100} step={5} suffix="pts cap" />
              </Row>
            </div>
          </div>

          {/* SMS BASIC Alert Thresholds reference table */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-700">FMCSA BASIC Alert Thresholds</span>
              <span className="text-[10px] text-slate-400 ml-1">(read-only — defined by FMCSA per carrier type)</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {([
                { type: 'general' as const, label: 'General Carriers',
                  thresholds: { 'Unsafe Driving': 65, 'Crash Indicator': 65, 'HOS Compliance': 65, 'Veh. Maintenance': 80, 'CS / Alcohol': 80, 'HM Compliance': 80, 'Driver Fitness': 80 } },
                { type: 'hm' as const, label: 'Hazmat Carriers',
                  thresholds: { 'Unsafe Driving': 60, 'Crash Indicator': 60, 'HOS Compliance': 60, 'Veh. Maintenance': 75, 'CS / Alcohol': 75, 'HM Compliance': 80, 'Driver Fitness': 75 } },
                { type: 'passenger' as const, label: 'Passenger Carriers',
                  thresholds: { 'Unsafe Driving': 50, 'Crash Indicator': 50, 'HOS Compliance': 50, 'Veh. Maintenance': 65, 'CS / Alcohol': 65, 'HM Compliance': 80, 'Driver Fitness': 65 } },
              ] as { type: 'general' | 'hm' | 'passenger'; label: string; thresholds: Record<string, number> }[]).map(ct => {
                const isActive = smsCarrierType === ct.type;
                return (
                  <div key={ct.type} className={`rounded-xl border p-3 transition-all ${isActive ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 bg-slate-50'}`}>
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isActive ? 'text-blue-700' : 'text-slate-500'}`}>
                      {ct.label}
                      {isActive && <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[8px] font-bold">ACTIVE</span>}
                    </div>
                    {Object.entries(ct.thresholds).map(([basic, threshold]) => (
                      <div key={basic} className="flex items-center justify-between py-0.5">
                        <span className="text-[10px] text-slate-600">{basic}</span>
                        <span className={`text-[10px] font-bold tabular-nums ${threshold <= 65 ? 'text-red-600' : 'text-slate-600'}`}>{threshold}%</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>

            {/* Live decay reference table */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Time Weight Effective Values (current settings)</div>
                <div className="space-y-1.5">
                  {[
                    { label: '0 – 6 months',   baseWt: 3, decay: smsDecayBand1Pct },
                    { label: '6 – 12 months',  baseWt: 2, decay: smsDecayBand2Pct },
                    { label: '12 – 24 months', baseWt: 1, decay: smsDecayBand3Pct },
                  ].map(row => {
                    const factor = 1 - row.decay / 100;
                    const eff = row.baseWt * factor;
                    return (
                      <div key={row.label} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="font-mono text-slate-700">
                          {row.baseWt} × {factor.toFixed(2)} = <strong className="text-blue-700">{eff.toFixed(2)}</strong>
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600">&gt; {smsLookbackMonths} months</span>
                    <span className="font-bold text-red-500">Excluded (wt 0)</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Distance Weight Effective Values (current settings)</div>
                <div className="space-y-1.5">
                  {[
                    { label: '0 – 50,000 mi',   baseWt: 3, decay: smsDecayBand1Pct },
                    { label: '50k – 150k mi',   baseWt: 2, decay: smsDecayBand2Pct },
                    { label: '150k – 300k mi',  baseWt: 1, decay: smsDecayBand3Pct },
                  ].map(row => {
                    const factor = 1 - row.decay / 100;
                    const eff = row.baseWt * factor;
                    return (
                      <div key={row.label} className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="font-mono text-slate-700">
                          {row.baseWt} × {factor.toFixed(2)} = <strong className="text-blue-700">{eff.toFixed(2)}</strong>
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-600">&gt; 300,000 mi</span>
                    <span className="font-bold text-red-500">Excluded (wt 0)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 9: Score Blending ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <TrendingUp size={18} className="text-blue-600" />
            <div>
              <div className="text-sm font-bold text-slate-800">Fleet Safety Score Blending</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Controls how Operational sub-scores and Regulatory (SMS + CVOR) scores combine into the main fleet safety score
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 px-6 py-5">

            {/* Left: Operational vs Regulatory */}
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                Fleet Score Composition
                <InfoTip hint="Higher Regulatory weight = fleet score is more sensitive to SMS/CVOR performance. Default: 70% Operational, 30% Regulatory."
                  formula={"Fleet Score = (Operational × opWeight%) + (Regulatory × regWeight%)\nOperational = accidentScore×35% + eldScore×25% + vedrScore×20% + inspScore×20%\nRegulatory = SMS×smsBlend% + CVOR×cvorBlend%"} />
              </div>

              {/* Preview formula */}
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 leading-relaxed">
                Fleet = <span className="text-blue-700 font-bold">Operational × {opWeight}%</span> + <span className="text-amber-700 font-bold">Regulatory × {regWeight}%</span>
              </div>

              {/* Operational weight */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">Operational Weight</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={100} value={opWeight}
                      onChange={e => { const v = Math.max(0, Math.min(100, +e.target.value)); setOpWeight(v); setRegWeight(100 - v); }}
                      className="w-14 text-xs font-bold text-right border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <input type="range" min={0} max={100} value={opWeight}
                  onChange={e => { const v = +e.target.value; setOpWeight(v); setRegWeight(100 - v); }}
                  className="w-full h-2 accent-blue-600 cursor-pointer" />
                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                  <span>Accidents · ELD · VEDR · Inspections</span>
                  <span>{opWeight}%</span>
                </div>
              </div>

              {/* Regulatory weight (auto-computed) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">Regulatory Weight <span className="text-slate-400 font-normal">(auto)</span></label>
                  <span className="text-xs font-bold text-amber-700">{regWeight}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${regWeight}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                  <span>SMS BASIC + CVOR Performance</span>
                  <span>{regWeight}%</span>
                </div>
              </div>

              {/* Stacked bar preview */}
              <div className="mt-4 flex rounded-lg overflow-hidden h-6 text-[10px] font-bold">
                <div className="flex items-center justify-center bg-blue-500 text-white transition-all" style={{ width: `${opWeight}%` }}>
                  {opWeight >= 20 ? `Op ${opWeight}%` : ''}
                </div>
                <div className="flex items-center justify-center bg-amber-400 text-white transition-all" style={{ width: `${regWeight}%` }}>
                  {regWeight >= 15 ? `Reg ${regWeight}%` : ''}
                </div>
              </div>
            </div>

            {/* Right: SMS vs CVOR within Regulatory */}
            <div>
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                Regulatory Score Split
                <InfoTip hint="Controls how much SMS (FMCSA) vs CVOR (Ontario) influences the regulatory component. Default: 60% SMS, 40% CVOR." />
              </div>

              {/* Preview formula */}
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 leading-relaxed">
                Regulatory = <span className="text-indigo-700 font-bold">SMS × {smsBlend}%</span> + <span className="text-emerald-700 font-bold">CVOR × {cvorBlend}%</span>
              </div>

              {/* SMS blend */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">SMS (FMCSA) Weight</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={100} value={smsBlend}
                      onChange={e => { const v = Math.max(0, Math.min(100, +e.target.value)); setSmsBlend(v); setCvorBlend(100 - v); }}
                      className="w-14 text-xs font-bold text-right border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                <input type="range" min={0} max={100} value={smsBlend}
                  onChange={e => { const v = +e.target.value; setSmsBlend(v); setCvorBlend(100 - v); }}
                  className="w-full h-2 accent-indigo-600 cursor-pointer" />
                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                  <span>7 BASICs · time or distance weighted</span>
                  <span>{smsBlend}%</span>
                </div>
              </div>

              {/* CVOR blend (auto) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">CVOR (Ontario) Weight <span className="text-slate-400 font-normal">(auto)</span></label>
                  <span className="text-xs font-bold text-emerald-700">{cvorBlend}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${cvorBlend}%` }} />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                  <span>Collisions · Convictions · Inspections (24 mo)</span>
                  <span>{cvorBlend}%</span>
                </div>
              </div>

              {/* Stacked bar preview */}
              <div className="mt-4 flex rounded-lg overflow-hidden h-6 text-[10px] font-bold">
                <div className="flex items-center justify-center bg-indigo-500 text-white transition-all" style={{ width: `${smsBlend}%` }}>
                  {smsBlend >= 20 ? `SMS ${smsBlend}%` : ''}
                </div>
                <div className="flex items-center justify-center bg-emerald-400 text-white transition-all" style={{ width: `${cvorBlend}%` }}>
                  {cvorBlend >= 15 ? `CVOR ${cvorBlend}%` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Live formula preview */}
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50">
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Live Formula Preview</div>
            <div className="text-[11px] font-mono text-slate-700 leading-relaxed">
              Fleet Score = (Op × <span className="text-blue-700 font-bold">{opWeight}%</span>) + ((<span className="text-indigo-700 font-bold">SMS × {smsBlend}%</span> + <span className="text-emerald-700 font-bold">CVOR × {cvorBlend}%</span>) × <span className="text-amber-700 font-bold">{regWeight}%</span>)
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              Settings are saved automatically and reflected on the Safety Dashboard.
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
