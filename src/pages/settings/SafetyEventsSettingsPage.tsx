import { useState } from 'react';
import { Activity, Video, Clock, Plus, Trash2, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/pages/ats/ats-ui';
import {
  useTelematicsEventTypes, EVENT_SEVERITIES, EVENT_SEVERITY_TONE, type EventSeverity,
} from '@/pages/safety-events/safety-event-types.data';
import {
  useHosViolationTypes, HOS_SEVERITIES, HOS_REGIONS, HOS_SEVERITY_TONE, HOS_REGION_META,
  type HosSeverity, type HosRegion,
} from '@/pages/hos/hos-violations.data';

type TabId = 'telematics' | 'hos';

const inputCls = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const numCls = 'h-9 w-20 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 text-center tabular-nums focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const th = 'px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500';

function ToolbarButtons({ onAdd, onReset, addLabel }: { onAdd: () => void; onReset: () => void; addLabel: string }) {
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button type="button"
        onClick={() => { if (confirmReset) { onReset(); setConfirmReset(false); } else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); } }}
        className={cn('inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm',
          confirmReset ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
        {confirmReset ? <Check size={15} /> : <RotateCcw size={15} />} {confirmReset ? 'Confirm reset' : 'Reset defaults'}
      </button>
      <button type="button" onClick={onAdd}
        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
        <Plus size={15} /> {addLabel}
      </button>
    </div>
  );
}

// ── Telematics & Video tab ───────────────────────────────────────────────────
function TelematicsTab() {
  const { types, update, add, remove, reset } = useTelematicsEventTypes();
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Telematics &amp; Video event types</h2>
          <p className="text-[12px] text-slate-500">Set the risk weight (0–10) and severity for each detected event type.</p>
        </div>
        <ToolbarButtons onAdd={() => add()} onReset={reset} addLabel="Add event type" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead className="border-b border-slate-200 bg-slate-50/60">
            <tr>
              <th className={th}>Event Type</th>
              <th className={th}>Key</th>
              <th className={cn(th, 'text-center')}>Risk Weight</th>
              <th className={th}>Severity</th>
              <th className={cn(th, 'text-right pr-5')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {types.map(t => (
              <tr key={t.id} className="align-middle hover:bg-slate-50/50">
                <td className="px-3 py-2.5">
                  <input value={t.label} onChange={e => update(t.id, { label: e.target.value })} className={inputCls} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-100 px-1.5 py-1 font-mono text-[11px] text-slate-500">{t.id}</span>
                    {t.custom && <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700">Custom</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input type="number" min={0} max={10} value={t.riskWeight}
                    onChange={e => update(t.id, { riskWeight: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })}
                    className={numCls} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', EVENT_SEVERITY_TONE[t.severity])}>{t.severity}</span>
                    <select value={t.severity} onChange={e => update(t.id, { severity: e.target.value as EventSeverity })} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:border-blue-400 focus:outline-none">
                      {EVENT_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2.5 pr-5 text-right">
                  <button type="button" title="Delete" onClick={() => remove(t.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">No event types. Add one or reset to defaults.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Hours of Service tab ─────────────────────────────────────────────────────
function HosTab() {
  const { types, update, add, remove, reset } = useHosViolationTypes();
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800">Hours of Service violation types</h2>
          <p className="text-[12px] text-slate-500">Define each HOS rule breach — region, risk points, severity and description.</p>
        </div>
        <ToolbarButtons onAdd={() => add()} onReset={reset} addLabel="Add HOS rule" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead className="border-b border-slate-200 bg-slate-50/60">
            <tr>
              <th className={cn(th, 'min-w-[220px]')}>Rule</th>
              <th className={th}>Region</th>
              <th className={cn(th, 'text-center')}>Risk Points</th>
              <th className={th}>Severity</th>
              <th className={cn(th, 'min-w-[280px]')}>Description</th>
              <th className={cn(th, 'text-right pr-5')}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {types.map(t => (
              <tr key={t.id} className="align-top hover:bg-slate-50/50">
                <td className="px-3 py-2.5">
                  <input value={t.label} onChange={e => update(t.id, { label: e.target.value })} className={inputCls} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1.5">
                    <span className={cn('inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_REGION_META[t.region].tone)}>{HOS_REGION_META[t.region].label}</span>
                    <select value={t.region} onChange={e => update(t.id, { region: e.target.value as HosRegion })} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:border-blue-400 focus:outline-none">
                      {HOS_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center">
                  <input type="number" min={1} max={20} value={t.points}
                    onChange={e => update(t.id, { points: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                    className={numCls} />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-col gap-1.5">
                    <span className={cn('inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', HOS_SEVERITY_TONE[t.defaultSeverity])}>{t.defaultSeverity}</span>
                    <select value={t.defaultSeverity} onChange={e => update(t.id, { defaultSeverity: e.target.value as HosSeverity })} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:border-blue-400 focus:outline-none">
                      {HOS_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <textarea value={t.description} onChange={e => update(t.id, { description: e.target.value })} rows={2}
                    className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] leading-snug text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </td>
                <td className="px-3 py-2.5 pr-5 text-right">
                  <button type="button" title="Delete" onClick={() => remove(t.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">No HOS rules. Add one or reset to defaults.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SafetyEventsSettingsPage() {
  const [tab, setTab] = useState<TabId>('telematics');
  const { types: evTypes } = useTelematicsEventTypes();
  const { types: hosTypes } = useHosViolationTypes();

  const TABS: { id: TabId; label: string; Icon: typeof Video; count: number }[] = [
    { id: 'telematics', label: 'Telematics & Video', Icon: Video, count: evTypes.length },
    { id: 'hos', label: 'Hours of Service', Icon: Clock, count: hosTypes.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PageHeader
        iconGradient="from-indigo-500 to-violet-600"
        Icon={Activity}
        title="Safety Events"
        subtitle="Define the event types, risk weights and severities used by Telematics & Video and Hours of Service"
      >
        <div className="flex gap-1">
          {TABS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={cn('group relative flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors',
                  active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                <t.Icon size={15} />
                {t.label}
                <span className={cn('inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums', active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500')}>{t.count}</span>
              </button>
            );
          })}
        </div>
      </PageHeader>

      <div className="space-y-3 p-4 sm:p-8">
        <p className="text-[12px] text-slate-400">Changes are saved automatically.</p>
        {tab === 'telematics' ? <TelematicsTab /> : <HosTab />}
      </div>
    </div>
  );
}
