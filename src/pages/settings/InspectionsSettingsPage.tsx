import { useMemo, useState } from 'react';
import { useAppData } from '@/context/AppDataContext';
import { AlertTriangle, ClipboardCheck, RotateCcw, Save, ShieldAlert, TrendingDown, Edit3, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ScrollBody, usePageChrome } from '@/components/ui/PageChrome';

type Tab = 'cvor' | 'sms';

/**
 * One threshold, as a card with a % input. Declared at module level: defined inside the page
 * it was a new component on every render, so the input was replaced on each keystroke and
 * lost focus after one digit.
 */
function InputMetric({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="relative w-24">
        <input type="number" min={0} max={100} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xl font-bold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500" value={value} onChange={(e) => onChange(clamp(Number(e.target.value)))} />
        <span className="absolute right-2 top-2.5 text-xs font-semibold text-slate-400">%</span>
      </div>
    </div>
  );
}

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
  const [tab, setTab] = useState<Tab>('cvor');
  const { scrollRef, onScroll, condensed } = usePageChrome(tab);

  // What was last saved, to say when there are changes that are not.
  const snapshot = () => JSON.stringify([localSmsGlobal, localCvorGlobal, localSmsOos, localCvorOos, localSmsCategory, localCvorCategory]);
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify([
    { ...csaThresholds }, { ...cvorThresholds }, { ...csaOosThresholds }, { ...cvorOosThresholds },
    { ...defaultSmsMap(), ...csaCategoryThresholds }, { ...defaultCvorMap(), ...cvorCategoryThresholds },
  ]));
  const dirty = snapshot() !== baseline;

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
    setBaseline(snapshot());
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
  };

  const cvorErrors = errors.filter((e) => e.startsWith('CVOR') || e.startsWith('Global CVOR')).length;
  const smsErrors = errors.length - cvorErrors;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <ListPageHeader
        Icon={ClipboardCheck}
        title="Inspections & Risk Thresholds"
        description="CVOR and SMS limits, out-of-service bounds and the thresholds that drive fleet compliance alerts and highlighting."
        condensed={condensed}
        chips={[
          { id: 'status', label: hasErrors ? 'Issues' : dirty ? 'Changes' : 'Status', value: hasErrors ? errors.length : dirty ? 'Unsaved' : 'Saved', tone: hasErrors ? 'text-rose-600' : dirty ? 'text-amber-600' : 'text-emerald-600' },
          { id: 'cvor', label: 'CVOR warning', value: `${localCvorGlobal.warning}%`, active: tab === 'cvor', onClick: () => setTab('cvor') },
          { id: 'sms', label: 'SMS warning', value: `${localSmsGlobal.warning}%`, active: tab === 'sms', onClick: () => setTab('sms') },
        ]}
        tabs={[
          { id: 'cvor', label: 'CVOR · Ontario MTO', icon: AlertTriangle, count: cvorErrors || undefined },
          { id: 'sms', label: 'SMS · FMCSA', icon: ShieldAlert, count: smsErrors || undefined },
        ]}
        activeTab={tab}
        onTabChange={(id) => setTab(id as Tab)}
        tabsLabel="Threshold systems"
        actions={<>
          {dirty && !hasErrors && <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-700 sm:inline-flex"><CircleDot className="h-3.5 w-3.5" /> Unsaved changes</span>}
          <button type="button" onClick={onReset} className={cn('flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50', condensed ? 'h-8' : 'h-9')}>
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button type="button" onClick={onSave} disabled={hasErrors}
            className={cn('flex items-center gap-2 rounded-lg px-4 text-sm font-semibold shadow-sm transition-colors', condensed ? 'h-8' : 'h-9',
              hasErrors ? 'cursor-not-allowed bg-slate-300 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700')}>
            <Save className="h-4 w-4" /> Save settings
          </button>
        </>}
      />

      <ScrollBody scrollRef={scrollRef} onScroll={onScroll}>
      {hasErrors && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <h3 className="mb-1 text-sm font-bold text-red-800">{errors.length} threshold{errors.length === 1 ? '' : 's'} out of order — fix before saving</h3>
            <ul className="list-inside list-disc space-y-1">
              {errors.map((err) => <li key={err} className="text-sm font-medium text-red-700">{err}</li>)}
            </ul>
          </div>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-sm">
          <ClipboardCheck className="h-5 w-5 text-emerald-600" /> Threshold settings saved successfully.
        </div>
      )}

      <div className="space-y-8">
        {/* ======================= CVOR SECTION =======================  */}
        {tab === 'cvor' && <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
        </section>}

        {/* ======================= SMS SECTION =======================  */}
        {tab === 'sms' && <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
        </section>}
      </div>
      </ScrollBody>
    </div>
  );
}

export default InspectionsSettingsPage;
