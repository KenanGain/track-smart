import { useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { AlertTriangle, ClipboardCheck, RotateCcw, Save, ShieldAlert, TrendingDown, Edit3 } from 'lucide-react';

type SmsCategoryThreshold = { warningEnabled: boolean; warning: number; criticalEnabled: boolean; critical: number };
type CvorCategoryThreshold = { warningEnabled: boolean; warning: number; auditEnabled: boolean; audit: number; showCauseEnabled: boolean; showCause: number; seizureEnabled: boolean; seizure: number };
type OosThresholds = { overallEnabled: boolean; overall: number; vehicleEnabled: boolean; vehicle: number; driverEnabled: boolean; driver: number };

const SMS_CATEGORIES = [
  'Unsafe Driving',
  'Crash Indicator',
  'Hours-of-Service Compliance',
  'Vehicle Maintenance',
  'Controlled Substances and Alcohol',
  'Hazmat Compliance',
  'Driver Fitness',
] as const;

const CVOR_CATEGORIES = [
  'Vehicle Maintenance', 
  'HOS Compliance', 
  'Driver Fitness', 
  'Unsafe Driving', 
  'Hazmat'
] as const;

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(Number.isFinite(n) ? n : 0)));

const defaultSmsMap = (): Record<string, SmsCategoryThreshold> =>
  Object.fromEntries(SMS_CATEGORIES.map((k) => [k, { warningEnabled: true, warning: 65, criticalEnabled: true, critical: 85 }]));

const defaultCvorMap = (): Record<string, CvorCategoryThreshold> =>
  Object.fromEntries(
    CVOR_CATEGORIES.map((k) => [
      k,
      { warningEnabled: true, warning: 35, auditEnabled: true, audit: 50, showCauseEnabled: true, showCause: 85, seizureEnabled: true, seizure: 100 },
    ]),
  );

const defaultOos = (): OosThresholds => ({ overallEnabled: true, overall: 30, vehicleEnabled: true, vehicle: 25, driverEnabled: true, driver: 10 });

export function InspectionsSettingsPage() {
  const {
    csaThresholds,
    setCsaThresholds,
    cvorThresholds,
    setCvorThresholds,
    csaOosThresholds,
    setCsaOosThresholds,
    cvorOosThresholds,
    setCvorOosThresholds,
    csaCategoryThresholds,
    setCsaCategoryThresholds,
    cvorCategoryThresholds,
    setCvorCategoryThresholds,
  } = useAppData();

  const [localSmsGlobal, setLocalSmsGlobal] = useState({ ...csaThresholds });
  const [localCvorGlobal, setLocalCvorGlobal] = useState({ ...cvorThresholds });
  const [localSmsOos, setLocalSmsOos] = useState<OosThresholds>({ ...csaOosThresholds });
  const [localCvorOos, setLocalCvorOos] = useState<OosThresholds>({ ...cvorOosThresholds });
  const [localSmsCategory, setLocalSmsCategory] = useState<Record<string, SmsCategoryThreshold>>({ ...defaultSmsMap(), ...csaCategoryThresholds });
  const [localCvorCategory, setLocalCvorCategory] = useState<Record<string, CvorCategoryThreshold>>({ ...defaultCvorMap(), ...cvorCategoryThresholds });
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (clamp(localSmsGlobal.warning) >= clamp(localSmsGlobal.critical)) list.push('Global SMS warning must be lower than critical.');
    if (clamp(localCvorGlobal.warning) >= clamp(localCvorGlobal.intervention)) list.push('Global CVOR warning must be lower than audit.');
    if (clamp(localCvorGlobal.intervention) >= clamp(localCvorGlobal.showCause)) list.push('Global CVOR audit must be lower than show cause.');
    if (clamp(localCvorGlobal.showCause) >= clamp(localCvorGlobal.seizure)) list.push('Global CVOR show cause must be lower than seizure.');

    SMS_CATEGORIES.forEach((cat) => {
      const cfg = localSmsCategory[cat];
      if (clamp(cfg.warning) >= clamp(cfg.critical)) {
        list.push(`SMS ${cat}: warning must be lower than critical.`);
      }
    });

    CVOR_CATEGORIES.forEach((cat) => {
      const cfg = localCvorCategory[cat];
      if (clamp(cfg.warning) >= clamp(cfg.audit)) list.push(`CVOR ${cat}: warning must be lower than audit.`);
      if (clamp(cfg.audit) >= clamp(cfg.showCause)) list.push(`CVOR ${cat}: audit must be lower than show cause.`);
      if (clamp(cfg.showCause) >= clamp(cfg.seizure)) list.push(`CVOR ${cat}: show cause must be lower than seizure.`);
    });
    return list;
  }, [localSmsGlobal, localCvorGlobal, localSmsCategory, localCvorCategory]);

  const hasErrors = errors.length > 0;

  const onSave = () => {
    setShowErrors(true);
    if (hasErrors) return;
    setCsaThresholds({ warning: clamp(localSmsGlobal.warning), critical: clamp(localSmsGlobal.critical) });
    setCvorThresholds({
      warning: clamp(localCvorGlobal.warning),
      intervention: clamp(localCvorGlobal.intervention),
      showCause: clamp(localCvorGlobal.showCause),
      seizure: clamp(localCvorGlobal.seizure),
    });
    setCsaOosThresholds({ ...localSmsOos, overall: clamp(localSmsOos.overall), vehicle: clamp(localSmsOos.vehicle), driver: clamp(localSmsOos.driver) });
    setCvorOosThresholds({ ...localCvorOos, overall: clamp(localCvorOos.overall), vehicle: clamp(localCvorOos.vehicle), driver: clamp(localCvorOos.driver) });
    setCsaCategoryThresholds(localSmsCategory);
    setCvorCategoryThresholds(localCvorCategory);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const onReset = () => {
    setLocalSmsGlobal({ warning: 65, critical: 85 });
    setLocalCvorGlobal({ warning: 35, intervention: 50, showCause: 85, seizure: 100 });
    setLocalSmsOos(defaultOos());
    setLocalCvorOos(defaultOos());
    setLocalSmsCategory(defaultSmsMap());
    setLocalCvorCategory(defaultCvorMap());
    setShowErrors(false);
  };

  const InputMetric = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) => {
    return (
      <div className={`rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-center items-center shadow-[0_1px_2px_rgba(0,0,0,0.02)]`}>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-center text-slate-500">{label}</div>
        <div className="relative w-24">
          <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-lg bg-slate-50 px-2 py-1.5 text-center font-bold text-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800" value={value} onChange={(e) => onChange(clamp(Number(e.target.value)))} />
          <span className="absolute right-2 top-2.5 text-xs font-semibold text-slate-400">%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-blue-600" />
            Inspections & Risk Thresholds
          </h1>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl">Configure CVOR and SMS algorithm limits, OOS boundaries, and the performance thresholds that drive fleet compliance alerts and UI highlighting.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button type="button" onClick={onReset} className="bg-white text-slate-700 text-sm font-bold py-2.5 px-4 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button type="button" onClick={onSave} className={`text-sm font-bold py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${hasErrors ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`} disabled={hasErrors}>
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>

      {showErrors && hasErrors && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-8 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800 mb-1">Validation Errors</h3>
            <ul className="space-y-1 list-inside list-disc">
              {errors.map((err) => <li key={err} className="text-sm text-red-700 font-medium">{err}</li>)}
            </ul>
          </div>
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 mb-8 flex items-center gap-3 text-emerald-800 font-bold text-sm shadow-sm">
          <ClipboardCheck className="w-5 h-5 text-emerald-600" /> Threshold settings saved successfully.
        </div>
      )}

      <div className="space-y-8">
        {/* ======================= CVOR SECTION =======================  */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              CVOR Thresholds & Actions
            </h2>
          </div>
          <div className="p-6 space-y-8">
            
            {/* CVOR RATING INFO HEADER */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-700">CVOR Rating Criteria</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4 max-w-4xl">Ontario MTO CVOR rating system. Carriers are assigned a rating based on audit results, violation rates, and operational history.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { label: 'Excellent', cls: 'border-emerald-200 bg-emerald-50/50 text-emerald-900', icon: 'bg-emerald-500', points: ['Min 24 months operation', 'Audit score ≥ 80% overall', 'Profile scores ≥ 70%', 'Violation rate ≤ 15%', 'Collision rate ≤ 10%'] },
                  { label: 'Satisfactory', cls: 'border-blue-200 bg-blue-50/50 text-blue-900', icon: 'bg-blue-500', points: ['Min 6 months operation', 'Audit score ≥ 55% overall', 'Profile scores ≥ 50%', 'Violation rate < 70%', 'Downgrade at 20% / 15%'] },
                  { label: 'Satisfactory Unaudited', cls: 'border-sky-200 bg-sky-50/50 text-sky-900', icon: 'bg-sky-500', points: ['No audit activity', 'Violation rate < 70%', 'Default rating for new carriers'], square: true },
                  { label: 'Conditional', cls: 'border-amber-200 bg-amber-50/50 text-amber-900', icon: 'bg-amber-500', points: ['Failed audit (< 55%)', 'Profile scores < 50%', 'OR violation rate ≥ 70%', 'Upgrade after 6 mo at ≤ 60%'] },
                  { label: 'Unsatisfactory', cls: 'border-red-200 bg-red-50/50 text-red-900', icon: 'bg-red-500', points: ['100% violation rate', 'Plate seizure', 'Sanction / cancellation', 'Immediate action required'] },
                ].map((tier) => (
                  <div key={tier.label} className={`rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${tier.cls}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-800">
                      <div className={`w-2.5 h-2.5 ${!tier.square ? 'rounded-full' : 'rounded-sm'} ${tier.icon}`}></div>
                      {tier.label}
                    </div>
                    <ul className="space-y-1.5 text-xs opacity-90 leading-relaxed font-medium">
                      {tier.points.map((p) => <li key={p}>• {p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* CVOR GLOBAL & OOS INPUTS */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Edit3 size={16} className="text-slate-400"/> Overall Violation Rate Triggers</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                   <InputMetric label="Warning Rate" value={localCvorGlobal.warning} onChange={v => setLocalCvorGlobal(p => ({...p, warning: v}))} />
                   <InputMetric label="Audit Trigger" value={localCvorGlobal.intervention} onChange={v => setLocalCvorGlobal(p => ({...p, intervention: v}))} />
                   <InputMetric label="Show Cause" value={localCvorGlobal.showCause} onChange={v => setLocalCvorGlobal(p => ({...p, showCause: v}))} />
                   <InputMetric label="Fleet Seizure" value={localCvorGlobal.seizure} onChange={v => setLocalCvorGlobal(p => ({...p, seizure: v}))} />
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-slate-400"/> Out-of-Service Rate Bounds</h3>
                <div className="grid grid-cols-3 gap-3">
                   <InputMetric label="Overall OOS Max" value={localCvorOos.overall} onChange={v => setLocalCvorOos(p => ({...p, overall: v}))} />
                   <InputMetric label="Vehicle OOS Max" value={localCvorOos.vehicle} onChange={v => setLocalCvorOos(p => ({...p, vehicle: v}))} />
                   <InputMetric label="Driver OOS Max" value={localCvorOos.driver} onChange={v => setLocalCvorOos(p => ({...p, driver: v}))} />
                </div>
              </div>
            </div>

            {/* CVOR CATEGORY INPUTS */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Edit3 size={16} className="text-slate-400"/> CVOR Category Thresholds</h3>
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3">Violation Category</th>
                        <th className="px-5 py-3 w-40 text-center">Warning %</th>
                        <th className="px-5 py-3 w-40 text-center">Audit %</th>
                        <th className="px-5 py-3 w-40 text-center">Show Cause %</th>
                        <th className="px-5 py-3 w-40 text-center">Seizure %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {CVOR_CATEGORIES.map(cat => {
                        const cfg = localCvorCategory[cat];
                        return (
                          <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 font-semibold text-slate-700">{cat}</td>
                            <td className="px-3 py-2">
                              <div className="relative max-w-[90px] mx-auto">
                                <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center pr-6" value={cfg.warning} onChange={e => setLocalCvorCategory(p => ({...p, [cat]: {...p[cat], warning: clamp(Number(e.target.value))}}))} />
                                <span className="absolute right-2 top-[7px] text-slate-400 text-[10px] font-bold">%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative max-w-[90px] mx-auto">
                                <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center pr-6" value={cfg.audit} onChange={e => setLocalCvorCategory(p => ({...p, [cat]: {...p[cat], audit: clamp(Number(e.target.value))}}))} />
                                <span className="absolute right-2 top-[7px] text-slate-400 text-[10px] font-bold">%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative max-w-[90px] mx-auto">
                                <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center pr-6" value={cfg.showCause} onChange={e => setLocalCvorCategory(p => ({...p, [cat]: {...p[cat], showCause: clamp(Number(e.target.value))}}))} />
                                <span className="absolute right-2 top-[7px] text-slate-400 text-[10px] font-bold">%</span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="relative max-w-[90px] mx-auto">
                                <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center pr-6" value={cfg.seizure} onChange={e => setLocalCvorCategory(p => ({...p, [cat]: {...p[cat], seizure: clamp(Number(e.target.value))}}))} />
                                <span className="absolute right-2 top-[7px] text-slate-400 text-[10px] font-bold">%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ======================= SMS SECTION =======================  */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-blue-600" />
              SMS BASIC Criteria & Thresholds
            </h2>
          </div>
          <div className="p-6 space-y-8">
            
            {/* SMS RATING INFO HEADER */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-slate-700">SMS Assessment Criteria</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4 max-w-4xl">FMCSA Safety Measurement System. Carriers are evaluated based on BASIC percentiles, severe violations, and out-of-service rates.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {[
                  { label: 'No Action Required', cls: 'border-emerald-200 bg-emerald-50/50 text-emerald-900', icon: 'bg-emerald-500', points: ['All BASICs below intervention threshold', 'Low out-of-service (OOS) rates', 'No recent severe safety violations'] },
                  { label: 'Warning Letter', cls: 'border-amber-200 bg-amber-50/50 text-amber-900', icon: 'bg-amber-500 rounded-sm', points: ['1-2 BASICs over threshold', 'Formal warning letter issued', 'Increased roadside inspections'] },
                  { label: 'Targeted Investigation', cls: 'border-orange-200 bg-orange-50/50 text-orange-900', icon: 'bg-orange-500 rounded-sm', points: ['Persistent violations in specific BASICs', 'Targeted intervention or review', 'Mandatory corrective action plan'] },
                  { label: 'Conditional / Unfit', cls: 'border-red-200 bg-red-50/50 text-red-900', icon: 'bg-red-500', points: ['Failed compliance review', 'Extremely high OOS rates', 'Potential fleet-wide Out-Of-Service order'] },
                ].map((tier) => (
                  <div key={tier.label} className={`rounded-xl border p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${tier.cls}`}>
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-slate-800">
                      <div className={`w-2.5 h-2.5 rounded-full ${tier.icon}`}></div>
                      {tier.label}
                    </div>
                    <ul className="space-y-1.5 text-xs opacity-90 leading-relaxed font-medium">
                      {tier.points.map((p) => <li key={p}>• {p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr] gap-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Edit3 size={16} className="text-slate-400"/> Overall Alert Triggers</h3>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                     <InputMetric label="Global Warning Bound" value={localSmsGlobal.warning} onChange={v => setLocalSmsGlobal(p => ({...p, warning: v}))} />
                     <InputMetric label="Global Critical Bound" value={localSmsGlobal.critical} onChange={v => setLocalSmsGlobal(p => ({...p, critical: v}))} />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><TrendingDown size={16} className="text-slate-400"/> Out-of-Service Rate Bounds</h3>
                  <div className="grid grid-cols-3 gap-3">
                     <InputMetric label="Overall OOS Max" value={localSmsOos.overall} onChange={v => setLocalSmsOos(p => ({...p, overall: v}))} />
                     <InputMetric label="Vehicle OOS Max" value={localSmsOos.vehicle} onChange={v => setLocalSmsOos(p => ({...p, vehicle: v}))} />
                     <InputMetric label="Driver OOS Max" value={localSmsOos.driver} onChange={v => setLocalSmsOos(p => ({...p, driver: v}))} />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Edit3 size={16} className="text-slate-400"/> SMS Category Thresholds (Percentile bounds)</h3>
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="px-5 py-3">SMS Category (BASIC)</th>
                          <th className="px-5 py-3 w-40 text-center">Warning %</th>
                          <th className="px-5 py-3 w-40 text-center">Critical %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {SMS_CATEGORIES.map(cat => {
                          const cfg = localSmsCategory[cat];
                          return (
                            <tr key={cat} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-3 font-semibold text-slate-700">{cat}</td>
                              <td className="px-3 py-2">
                                <div className="relative max-w-[100px] mx-auto">
                                  <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center pr-6" value={cfg.warning} onChange={e => setLocalSmsCategory(p => ({...p, [cat]: {...p[cat], warning: clamp(Number(e.target.value))}}))} />
                                  <span className="absolute right-3 top-[7px] text-slate-400 text-[10px] font-bold">%</span>
                                </div>
                              </td>
                              <td className="px-3 py-2">
                                <div className="relative max-w-[100px] mx-auto">
                                  <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm bg-slate-50 text-slate-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center pr-6" value={cfg.critical} onChange={e => setLocalSmsCategory(p => ({...p, [cat]: {...p[cat], critical: clamp(Number(e.target.value))}}))} />
                                  <span className="absolute right-3 top-[7px] text-slate-400 text-[10px] font-bold">%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default InspectionsSettingsPage;
