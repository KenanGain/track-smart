import React, { useState } from 'react';
import { Activity, Search, Columns3, ChevronDown, ChevronRight } from 'lucide-react';
import { BC_PULL_DATA } from './NscBcPullByPull';

// ─── Pull-by-pull helpers ─────────────────────────────────────────────────────

type BcSt = 'Satisfactory' | 'Conditional' | 'Unsatisfactory';

function bcSt(total: number): BcSt {
  if (total >= 3.65) return 'Unsatisfactory';
  if (total >= 2.13) return 'Conditional';
  return 'Satisfactory';
}

const bcStColor = (st: BcSt) =>
  st === 'Unsatisfactory' ? '#dc2626' : st === 'Conditional' ? '#d97706' : '#16a34a';

const bcStBadgeCls = (st: BcSt) =>
  st === 'Unsatisfactory' ? 'bg-red-100 text-red-700 border-red-300'
: st === 'Conditional'    ? 'bg-amber-100 text-amber-700 border-amber-300'
:                           'bg-emerald-100 text-emerald-700 border-emerald-300';

const BC_CAT_THRESH: Record<string, [number, number]> = {
  contra: [1.76, 2.98], cvsa: [0.93, 1.08], acc: [0.23, 0.27], total: [2.13, 3.64],
};
function bcCatColor(cat: string, val: number): string {
  const [sat, cond] = BC_CAT_THRESH[cat] ?? [1, 2];
  if (val >= cond) return '#dc2626';
  if (val >= sat)  return '#d97706';
  return '#16a34a';
}

const BC_DRILL_CATS = [
  { key: 'contra' as const, label: 'Contraventions',        sat: 1.76, cond: 2.98 },
  { key: 'cvsa'   as const, label: 'CVSA (Out of Service)', sat: 0.93, cond: 1.08 },
  { key: 'acc'    as const, label: 'Accidents',             sat: 0.23, cond: 0.27 },
  { key: 'total'  as const, label: 'Total Score',           sat: 2.13, cond: 3.64 },
];

// ─── Label helper ─────────────────────────────────────────────────────────────

function shortLabel(pullDate: string): string {
  // "31-Mar-2025" → "Mar '25"
  const parts = pullDate.split('-');
  if (parts.length === 3) return `${parts[1]} '${parts[2].slice(2)}`;
  return pullDate;
}

// ─── BC Thresholds ────────────────────────────────────────────────────────────

const BC_TOTAL_SAT  = 2.13;
const BC_TOTAL_COND = 3.64;
const CAT_SAT: Record<string, number> = { contra: 1.76, cvsa: 0.93, acc: 0.23 };

// ─── SVG layout constants (matches CVOR sizing) ───────────────────────────────

const VW  = 1440;
const pL  = 74;
const pR  = 158;
const pT  = 30;
const pB  = 62;
const cW  = VW - pL - pR;

// ─── Mock data generators (deterministic per pull) ───────────────────────────

const CONTRA_ACTS = [
  { act: 'Commercial Transport Act', section: '37(1)', desc: 'Overweight — Single Axle',   weight: 3 },
  { act: 'Commercial Transport Act', section: '24(2)', desc: 'Log Book Deficiency',         weight: 2 },
  { act: 'Motor Vehicle Act',        section: '183',   desc: 'Speeding — 1–20 km/h over',  weight: 1 },
  { act: 'Motor Vehicle Act',        section: '144(1)',desc: 'Failure to Stop — Red Light', weight: 3 },
  { act: 'Commercial Transport Act', section: '7(1)',  desc: 'Operating Without Permit',    weight: 4 },
  { act: 'Motor Vehicle Act',        section: '25(1)', desc: 'Driving Without Licence',     weight: 5 },
  { act: 'Commercial Transport Act', section: '16(3)', desc: 'Hours of Service Violation',  weight: 2 },
  { act: 'Motor Vehicle Act',        section: '140',   desc: 'Improper Lane Change',        weight: 1 },
];
const CVSA_VIOLATIONS = [
  'Brake Adjustment Out of Tolerance',
  'Lighting Equipment Defect',
  'Tire Defect — Tread Depth',
  'Driver Hours of Service Exceeded',
  'Cargo Securement Deficiency',
  'Steering Defect',
  'Coupling Device Defect',
];
const ACCIDENT_TYPES = [
  { type: 'Rear-End Collision',    severity: 'Property Damage', at_fault: 'Driver' },
  { type: 'Lane Change Collision', severity: 'Injury',          at_fault: 'Driver' },
  { type: 'Intersection Collision',severity: 'Property Damage', at_fault: 'Unknown' },
  { type: 'Single Vehicle',        severity: 'Property Damage', at_fault: 'Driver' },
];

function seedRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return Math.abs(s) / 0xffffffff; };
}

function genMockData(r: typeof BC_PULL_DATA[0]) {
  const seed = r.pullDate.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng  = seedRand(seed);

  const driverContraCount   = Math.max(0, Math.round(r.contra * 4 + rng() * 2));
  const carrierContraCount  = Math.max(0, Math.round(r.contra * 2 + rng() * 1.5));
  const pendingDriverCount  = Math.round(rng() * 2);
  const pendingCarrierCount = Math.round(rng() * 1);

  const [startYear, startMonth] = r.windowLabel.split(' → ')[0].split(' ');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const makeDate = () => {
    const mIdx = Math.floor(rng() * 12);
    const day  = Math.floor(rng() * 28) + 1;
    return `${String(day).padStart(2,'0')}-${months[mIdx]}-2024`;
  };

  const driverContras = Array.from({ length: driverContraCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate(), driver: `Driver ${String(Math.floor(rng() * 90) + 10)}` };
  });

  const carrierContras = Array.from({ length: carrierContraCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate() };
  });

  const pendingDriver = Array.from({ length: pendingDriverCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate(), driver: `Driver ${String(Math.floor(rng() * 90) + 10)}`, status: 'Pending' };
  });

  const pendingCarrier = Array.from({ length: pendingCarrierCount }, () => {
    const act = CONTRA_ACTS[Math.floor(rng() * CONTRA_ACTS.length)];
    return { ...act, date: makeDate(), status: 'Pending' };
  });

  const passCount = Math.round(r.inspections * (0.55 + rng() * 0.3));
  const oosCount  = r.cvsa > 0.5 ? Math.max(1, Math.round(r.inspections * 0.15)) : 0;
  const cvsaInspections = Array.from({ length: r.inspections }, (_, i) => {
    const isPas = i < passCount;
    const isOos = !isPas && i < passCount + oosCount;
    const vio   = isOos ? CVSA_VIOLATIONS[Math.floor(rng() * CVSA_VIOLATIONS.length)] : isPas ? 'None' : CVSA_VIOLATIONS[Math.floor(rng() * CVSA_VIOLATIONS.length)];
    const day   = Math.floor(rng() * 28) + 1;
    const mon   = months[Math.floor(rng() * 12)];
    return {
      date:   `${String(day).padStart(2,'0')}-${mon}-2024`,
      result: isOos ? 'Out of Service' : isPas ? 'Pass' : 'Fail',
      level:  `Level ${Math.floor(rng() * 3) + 1}`,
      violation: vio,
      location: ['Surrey, BC', 'Abbotsford, BC', 'Kamloops, BC', 'Prince George, BC', 'Kelowna, BC'][Math.floor(rng() * 5)],
    };
  });

  const accidentCount = r.acc > 0 ? Math.max(1, Math.round(r.acc * 10)) : 0;
  const accidents     = Array.from({ length: accidentCount }, () => {
    const a = ACCIDENT_TYPES[Math.floor(rng() * ACCIDENT_TYPES.length)];
    return { ...a, date: makeDate(), vehicles: Math.floor(rng() * 2) + 2 };
  });

  const auditDate = r.total > 2.0 ? makeDate() : null;

  const cvipCount = Math.floor(rng() * 5) + 2;
  const cvipInspections = Array.from({ length: cvipCount }, () => {
    const pass = rng() > 0.25;
    return {
      date:   makeDate(),
      unit:   `Unit ${String(Math.floor(rng() * 900) + 100)}`,
      result: pass ? 'Pass' : 'Fail',
      defects: pass ? 0 : Math.floor(rng() * 4) + 1,
      inspector: `CVIP-${String(Math.floor(rng() * 9000) + 1000)}`,
    };
  });

  return { driverContras, carrierContras, pendingDriver, pendingCarrier, cvsaInspections, accidents, auditDate, cvipInspections, startYear, startMonth };
}

// ─── Nested Accordion for each pull row ──────────────────────────────────────

type SectionKey = 's2'|'s3'|'s4'|'s5'|'s6'|'s7'|'s8';
type SubKey     = 's41'|'s42'|'s43'|'s44';

// NSC-Analysis-style row — title + subtitle left, stat + badge + chevron right
function AnalysisRow({ title, subtitle, statLabel, statVal, badge, badgeCls, open, onToggle, children }: {
  title: string; subtitle: string;
  statLabel?: string; statVal?: string;
  badge?: string; badgeCls?: string;
  open: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.09em] text-slate-800 leading-tight">{title}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
          {statLabel && statVal && (
            <span className="text-[11px] text-slate-500">
              {statLabel}: <strong className="text-slate-700">{statVal}</strong>
            </span>
          )}
          {badge && (
            <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${badgeCls ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {badge}
            </span>
          )}
          {open
            ? <ChevronDown  size={14} className="text-slate-400"/>
            : <ChevronRight size={14} className="text-slate-400"/>
          }
        </div>
      </button>
      {open && children && (
        <div className="border-t border-slate-100">{children}</div>
      )}
    </div>
  );
}

// Sub-row inside Contraventions (slightly indented style)
function SubRow({ title, subtitle, badge, badgeCls, open, onToggle, children }: {
  title: string; subtitle: string;
  badge?: string; badgeCls?: string;
  open: boolean; onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 mt-0.5"/>
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-slate-700 leading-tight">{title}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeCls ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
              {badge}
            </span>
          )}
          {open
            ? <ChevronDown  size={12} className="text-slate-400"/>
            : <ChevronRight size={12} className="text-slate-400"/>
          }
        </div>
      </button>
      {open && children && (
        <div className="border-t border-slate-100 bg-white">{children}</div>
      )}
    </div>
  );
}

function BcPullDrillDown({ r }: { r: typeof BC_PULL_DATA[0] }) {
  const [open,    setOpen]    = useState<Partial<Record<SectionKey, boolean>>>({ s2: true });
  const [openSub, setOpenSub] = useState<Partial<Record<SubKey, boolean>>>({});
  const tog    = (k: SectionKey) => setOpen(p => ({ ...p, [k]: !p[k] }));
  const togSub = (k: SubKey)     => setOpenSub(p => ({ ...p, [k]: !p[k] }));

  const mock = genMockData(r);
  const st   = bcSt(r.total);
  const sc   = bcStColor(st);

  const totalContras = mock.driverContras.length + mock.carrierContras.length + mock.pendingDriver.length + mock.pendingCarrier.length;
  const cvsaPass     = mock.cvsaInspections.filter(c => c.result === 'Pass').length;
  const cvsaOos      = mock.cvsaInspections.filter(c => c.result === 'Out of Service').length;
  const cvsaFail     = mock.cvsaInspections.filter(c => c.result === 'Fail').length;
  const cvipPass     = mock.cvipInspections.filter(c => c.result === 'Pass').length;
  const cvipFail     = mock.cvipInspections.filter(c => c.result === 'Fail').length;
  const cvipPassPct  = mock.cvipInspections.length > 0 ? Math.round((cvipPass / mock.cvipInspections.length) * 100) : 100;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* Pull header */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap border-b border-slate-100"
        style={{ background: sc + '0d', borderLeftWidth: 3, borderLeftColor: sc }}>
        <span className="text-[13px] font-black text-slate-800">{r.pullDate}</span>
        <span className="text-[11px] text-slate-400">{r.windowLabel}</span>
        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${bcStBadgeCls(st)}`}>{st}</span>
        <span className="text-[10px] text-slate-400 ml-auto">NSC BC Profile Report · {r.inspections} CVSA inspections</span>
      </div>

      {/* Analysis rows */}
      <div className="p-4 space-y-2.5">

        {/* ── Profile Scores ── */}
        <AnalysisRow
          title="Profile Scores"
          subtitle={`4 score categories · contraventions, CVSA (OOS), accidents, total · as of ${r.pullDate}`}
          statLabel="Total Score"
          statVal={r.total.toFixed(2)}
          badge={st.toUpperCase()}
          badgeCls={bcStBadgeCls(st)}
          open={!!open.s2}
          onToggle={() => tog('s2')}
        >
          <div className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-4 gap-3 mb-3">
              {BC_DRILL_CATS.map(cat => {
                const val   = r[cat.key];
                const catSt = val >= cat.cond ? 'Unsatisfactory' : val >= cat.sat ? 'Conditional' : 'Satisfactory';
                const color = bcCatColor(cat.key, val);
                const pct   = Math.min((val / (cat.cond * 1.5)) * 100, 100);
                return (
                  <div key={cat.key} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{cat.label}</div>
                    <div className="text-[28px] font-black font-mono leading-none" style={{ color }}>{val.toFixed(2)}</div>
                    <div className="text-[10px] font-semibold mt-0.5 mb-2.5" style={{ color }}>{catSt}</div>
                    <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                    <div className="flex justify-between text-[8px] mt-1.5 text-slate-400">
                      <span>0.00</span>
                      <span style={{ color: '#16a34a' }}>Sat {cat.sat}</span>
                      <span style={{ color: '#d97706' }}>Cond {cat.cond}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-slate-500 border-t border-slate-100 pt-2.5">
              <span>Total Profile Score: <strong style={{ color: sc }}>{r.total.toFixed(2)}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Satisfactory Limit: <strong className="text-emerald-600">2.130</strong></span>
              <span className="text-slate-300">·</span>
              <span>Conditional Limit: <strong className="text-amber-600">3.640</strong></span>
            </div>
          </div>
        </AnalysisRow>

        {/* ── Active Fleet ── */}
        <AnalysisRow
          title="Active Fleet"
          subtitle={`${r.windowLabel} · vehicle days, monthly active days, average fleet size`}
          statLabel="Avg Fleet"
          statVal={r.avgFleet.toFixed(2)}
          badge={`${r.vehicleDays.toLocaleString()} VEHICLE DAYS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.s3}
          onToggle={() => tog('s3')}
        >
          <div className="p-4 bg-slate-50/50">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Average Fleet Size',   val: r.avgFleet.toFixed(2),              unit: 'vehicles' },
                { label: 'Total Vehicle Days',    val: r.vehicleDays.toLocaleString(),     unit: '12-month window' },
                { label: 'Monthly Active Days',   val: r.monthlyActiveDays.toLocaleString(), unit: 'days this month' },
              ].map(item => (
                <div key={item.label} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-[26px] font-black font-mono text-blue-600 leading-none">{item.val}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{item.unit}</div>
                </div>
              ))}
            </div>
          </div>
        </AnalysisRow>

        {/* ── Contraventions ── */}
        <AnalysisRow
          title="Contraventions"
          subtitle={`${mock.driverContras.length} driver guilty · ${mock.carrierContras.length} carrier guilty · ${mock.pendingDriver.length + mock.pendingCarrier.length} pending`}
          statLabel="Grouped Total"
          statVal={`${r.contra.toFixed(2)}`}
          badge={`${totalContras} EVENTS`}
          badgeCls={totalContras > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.s4}
          onToggle={() => tog('s4')}
        >
          <div className="divide-y divide-slate-100">
            <SubRow
              title="Driver Contraventions (Guilty)"
              subtitle={`${mock.driverContras.length} conviction event${mock.driverContras.length !== 1 ? 's' : ''} · offence act, section, and weight`}
              badge={`${mock.driverContras.length} EVENTS`}
              badgeCls={mock.driverContras.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}
              open={!!openSub.s41}
              onToggle={() => togSub('s41')}
            >
              {mock.driverContras.length === 0 ? (
                <div className="px-5 py-3.5 text-[11px] text-slate-400 italic">No driver contraventions in this period</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-amber-50/60 border-b border-amber-100">
                      {['Act','Section','Description','Driver','Date','Weight'].map(h => (
                        <th key={h} className={`px-4 py-2 text-[9px] font-bold text-amber-600 uppercase tracking-wider ${h === 'Weight' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mock.driverContras.map((c, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-500 text-[10px]">{c.act}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{c.section}</td>
                        <td className="px-4 py-2.5 text-slate-700">{c.desc}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c.driver}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.date}</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono" style={{ color: c.weight >= 4 ? '#dc2626' : c.weight >= 2 ? '#d97706' : '#64748b' }}>{c.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SubRow>

            <SubRow
              title="Carrier Contraventions (Guilty)"
              subtitle={`${mock.carrierContras.length} carrier event${mock.carrierContras.length !== 1 ? 's' : ''} · act, section, and weight`}
              badge={`${mock.carrierContras.length} EVENTS`}
              badgeCls={mock.carrierContras.length > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-400 border-slate-200'}
              open={!!openSub.s42}
              onToggle={() => togSub('s42')}
            >
              {mock.carrierContras.length === 0 ? (
                <div className="px-5 py-3.5 text-[11px] text-slate-400 italic">No carrier contraventions in this period</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-amber-50/60 border-b border-amber-100">
                      {['Act','Section','Description','Date','Weight'].map(h => (
                        <th key={h} className={`px-4 py-2 text-[9px] font-bold text-amber-600 uppercase tracking-wider ${h === 'Weight' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mock.carrierContras.map((c, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-500 text-[10px]">{c.act}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{c.section}</td>
                        <td className="px-4 py-2.5 text-slate-700">{c.desc}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.date}</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono" style={{ color: c.weight >= 4 ? '#dc2626' : c.weight >= 2 ? '#d97706' : '#64748b' }}>{c.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SubRow>

            <SubRow
              title="Pending Driver Contraventions"
              subtitle={`${mock.pendingDriver.length} pending event${mock.pendingDriver.length !== 1 ? 's' : ''} · awaiting court decision`}
              badge={`${mock.pendingDriver.length} PENDING`}
              badgeCls="bg-yellow-50 text-yellow-700 border-yellow-200"
              open={!!openSub.s43}
              onToggle={() => togSub('s43')}
            >
              {mock.pendingDriver.length === 0 ? (
                <div className="px-5 py-3.5 text-[11px] text-slate-400 italic">No pending driver contraventions</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Act','Section','Description','Driver','Date','Status'].map(h => (
                        <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider ${h === 'Status' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mock.pendingDriver.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-4 py-2.5 text-slate-500 text-[10px]">{c.act}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{c.section}</td>
                        <td className="px-4 py-2.5 text-slate-700">{c.desc}</td>
                        <td className="px-4 py-2.5 text-slate-500">{c.driver}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.date}</td>
                        <td className="px-4 py-2.5 text-center"><span className="text-[9px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">Pending</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SubRow>

            <SubRow
              title="Pending Carrier Contraventions"
              subtitle={`${mock.pendingCarrier.length} pending event${mock.pendingCarrier.length !== 1 ? 's' : ''} · awaiting court decision`}
              badge={`${mock.pendingCarrier.length} PENDING`}
              badgeCls="bg-yellow-50 text-yellow-700 border-yellow-200"
              open={!!openSub.s44}
              onToggle={() => togSub('s44')}
            >
              {mock.pendingCarrier.length === 0 ? (
                <div className="px-5 py-3.5 text-[11px] text-slate-400 italic">No pending carrier contraventions</div>
              ) : (
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Act','Section','Description','Date','Status'].map(h => (
                        <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider ${h === 'Status' ? 'text-center' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mock.pendingCarrier.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-4 py-2.5 text-slate-500 text-[10px]">{c.act}</td>
                        <td className="px-4 py-2.5 font-mono text-slate-700">{c.section}</td>
                        <td className="px-4 py-2.5 text-slate-700">{c.desc}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.date}</td>
                        <td className="px-4 py-2.5 text-center"><span className="text-[9px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">Pending</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </SubRow>
          </div>
        </AnalysisRow>

        {/* ── CVSA Inspection Results ── */}
        <AnalysisRow
          title="CVSA Inspection Results"
          subtitle={`${r.inspections} inspections · ${cvsaPass} pass, ${cvsaFail} req. attn, ${cvsaOos} out of service`}
          statLabel="CVSA Score"
          statVal={r.cvsa.toFixed(2)}
          badge={`${r.inspections} INSPECTIONS`}
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.s5}
          onToggle={() => tog('s5')}
        >
          <div>
            <div className="px-5 py-3 bg-blue-50/40 border-b border-slate-100 flex items-center gap-6 flex-wrap">
              {[
                { label: 'Pass',          val: cvsaPass, color: '#16a34a' },
                { label: 'Req. Attn',     val: cvsaFail, color: '#d97706' },
                { label: 'Out of Service',val: cvsaOos,  color: '#dc2626' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }}/>
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
              ))}
            </div>
            {r.inspections === 0 ? (
              <div className="px-5 py-4 text-[11px] text-slate-400 italic">No CVSA inspections in this period</div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Date','Level','Location','Primary Violation','Result'].map(h => (
                      <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Result' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mock.cvsaInspections.map((c, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{c.date}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.level}</td>
                      <td className="px-4 py-2.5 text-slate-600">{c.location}</td>
                      <td className="px-4 py-2.5 text-slate-700">{c.violation}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          c.result === 'Out of Service' ? 'bg-red-50 text-red-700 border-red-200' :
                          c.result === 'Pass'           ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                         'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>{c.result}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </AnalysisRow>

        {/* ── Accident Information ── */}
        <AnalysisRow
          title="Accident Information"
          subtitle={mock.accidents.length > 0
            ? `${mock.accidents.length} reportable accident${mock.accidents.length > 1 ? 's' : ''} · collision type, severity, and at-fault status`
            : 'No reportable accidents in this 12-month window'}
          statLabel="Accident Score"
          statVal={r.acc.toFixed(2)}
          badge={`${mock.accidents.length} ACCIDENTS`}
          badgeCls={mock.accidents.length > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.s6}
          onToggle={() => tog('s6')}
        >
          {mock.accidents.length === 0 ? (
            <div className="px-5 py-4 flex items-center gap-3 bg-emerald-50/40">
              <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">✓</span>
              <span className="text-[11px] text-emerald-700 font-medium">No reportable accidents in this 12-month period</span>
            </div>
          ) : (
            <>
              <div className="px-5 py-2.5 bg-red-50/60 border-b border-red-100 flex items-center gap-4">
                <span className="text-[11px] font-bold text-red-700">{mock.accidents.length} reportable accident{mock.accidents.length > 1 ? 's' : ''}</span>
                <span className="text-[10px] text-red-400 ml-auto">Accident Score: <strong>{r.acc.toFixed(2)}</strong></span>
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Date','Accident Type','Severity','At Fault','Vehicles'].map(h => (
                      <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Vehicles' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mock.accidents.map((a, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{a.date}</td>
                      <td className="px-4 py-2.5 text-slate-700">{a.type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${a.severity === 'Injury' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{a.at_fault}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{a.vehicles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </AnalysisRow>

        {/* ── Audit Summary ── */}
        <AnalysisRow
          title="Audit Summary"
          subtitle="compliance review history · safety rating basis and audit outcome"
          statLabel="Safety Rating"
          statVal={r.total < 2.13 ? 'Satisfactory' : r.total < 3.64 ? 'Conditional' : 'Unsatisfactory'}
          badge={mock.auditDate ? 'AUDITED' : 'UNAUDITED'}
          badgeCls={mock.auditDate ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
          open={!!open.s7}
          onToggle={() => tog('s7')}
        >
          <div className="p-5 grid grid-cols-2 gap-5 bg-slate-50/40">
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Audit Status</div>
              {mock.auditDate ? (
                <div className="space-y-2">
                  {[
                    { label: 'Last Audit Date', val: mock.auditDate, mono: true },
                    { label: 'Audit Type',       val: 'Compliance Review', color: '#d97706' },
                    { label: 'Outcome',          val: r.total >= 3.64 ? 'Show Cause' : 'Conditional', badge: true, color: r.total >= 3.64 ? '#dc2626' : '#d97706' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{row.label}</span>
                      {row.badge ? (
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${r.total >= 3.64 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{row.val}</span>
                      ) : (
                        <span className={`text-[11px] font-semibold ${row.mono ? 'font-mono text-slate-700' : ''}`} style={{ color: row.color }}>{row.val}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[11px] text-emerald-700">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">✓</span>
                  Profile within acceptable range — no audit on record
                </div>
              )}
            </div>
            <div>
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Safety Rating Basis</div>
              <div className="space-y-2">
                {[
                  { label: 'Safety Rating',  value: r.total < 2.13 ? 'Satisfactory — Unaudited' : r.total < 3.64 ? 'Conditional' : 'Unsatisfactory', color: sc },
                  { label: 'Profile Status', value: bcSt(r.total), color: sc },
                  { label: 'Audit Status',   value: mock.auditDate ? 'Audited' : 'Unaudited', color: '#64748b' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{row.label}</span>
                    <span className="text-[11px] font-semibold" style={{ color: row.color }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnalysisRow>

        {/* ── CVIP Vehicle Inspection History ── */}
        <AnalysisRow
          title="CVIP Vehicle Inspection History"
          subtitle={`${mock.cvipInspections.length} vehicle inspections · ${cvipPass} pass, ${cvipFail} fail · periodic commercial vehicle inspection program`}
          statLabel="Pass Rate"
          statVal={`${cvipPassPct}%`}
          badge={`${mock.cvipInspections.length} VEHICLES`}
          badgeCls="bg-slate-100 text-slate-600 border-slate-200"
          open={!!open.s8}
          onToggle={() => tog('s8')}
        >
          <div>
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"/>
                <span className="text-[10px] text-slate-500">Pass: <strong className="text-emerald-600">{cvipPass}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500"/>
                <span className="text-[10px] text-slate-500">Fail: <strong className="text-red-600">{cvipFail}</strong></span>
              </div>
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  {['Date','Unit','Inspector ID','Defects','Result'].map(h => (
                    <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Defects' ? 'text-right' : h === 'Result' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mock.cvipInspections.map((c, i) => (
                  <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{c.date}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{c.unit}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.inspector}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      <span className={c.defects > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}>{c.defects}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${c.result === 'Pass' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {c.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalysisRow>

      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type Cadence = 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All';

export function NscBcPerformanceHistory() {
  const [cadence,     setCadence]     = useState<Cadence>('All');
  const [tbSearch,    setTbSearch]    = useState('');
  const [tbPage,      setTbPage]      = useState(1);
  const [tbRpp,       setTbRpp]       = useState(10);
  const [tbExpanded,  setTbExpanded]  = useState<string | null>(null);
  const [hovered,     setHovered]     = useState<{ chart: string; idx: number } | null>(null);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);

  const all = [...BC_PULL_DATA].reverse();

  const filterByCadence = (rows: typeof all): typeof all => {
    if (cadence === 'Monthly' || cadence === 'All') return rows;
    const minStep =
      cadence === 'Quarterly' ? 3 :
      cadence === 'Semi-Annual' ? 6 :
      12;
    const out: typeof rows = [];
    let lastIdx = -99;
    rows.forEach((r, i) => {
      if (i === 0 || i - lastIdx >= minStep) { out.push(r); lastIdx = i; }
    });
    return out;
  };

  const data = filterByCadence(all);
  const n    = data.length;

  const handleDotClick = (d: typeof data[0], rpp = tbRpp) => {
    const newId = selectedId === d.id ? null : d.id;
    setSelectedId(newId);
    if (newId) {
      setTbExpanded(newId);
      const rowIdx = BC_PULL_DATA.findIndex(r => r.id === newId);
      if (rowIdx >= 0) setTbPage(Math.floor(rowIdx / rpp) + 1);
    }
  };

  const xAt = (i: number) => pL + (n > 1 ? (i / (n - 1)) * cW : cW / 2);

  const yAt = (v: number, max: number, min: number, chartH: number) =>
    pT + chartH - ((v - min) / (max - min || 1)) * chartH;

  const mkPath = (getVal: (d: typeof data[0]) => number, max: number, min: number, chartH: number) =>
    data.map((d, i) => {
      const x = xAt(i).toFixed(1);
      const y = yAt(getVal(d), max, min, chartH).toFixed(1);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');

  const mkArea = (getVal: (d: typeof data[0]) => number, max: number, min: number, chartH: number) =>
    `${mkPath(getVal, max, min, chartH)} L${xAt(n-1).toFixed(1)},${(pT+chartH).toFixed(1)} L${xAt(0).toFixed(1)},${(pT+chartH).toFixed(1)}Z`;

  const YGrid = ({ ticks, max, min, chartH }: { ticks: number[]; max: number; min: number; chartH: number }) => (
    <>
      {ticks.filter(v => v >= min && v <= max).map(v => (
        <g key={v}>
          <line x1={pL} x2={pL+cW} y1={yAt(v,max,min,chartH)} y2={yAt(v,max,min,chartH)} stroke="#e2e8f0" strokeWidth="0.75"/>
          <text x={pL-10} y={yAt(v,max,min,chartH)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
        </g>
      ))}
    </>
  );

  const XAxis = ({ chartH }: { chartH: number }) => (
    <>
      {data.map((d, i) => (
        <text key={d.id} x={xAt(i)} y={pT+chartH+18} fontSize="10" fill="#64748b" textAnchor="middle"
          transform={`rotate(-40,${xAt(i)},${pT+chartH+18})`}>
          {shortLabel(d.pullDate)}
        </text>
      ))}
    </>
  );

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  const BcTip = ({ cx, cy, d, chart, chartH }: {
    cx: number; cy: number; d: typeof data[0]; chart: string; chartH: number;
  }) => {
    const st  = bcSt(d.total);
    const sc  = bcStColor(st);
    const TW  = 252;
    const TH  = 188;
    const tx  = cx > pL + cW * 0.62 ? cx - TW - 18 : cx + 18;
    const ty  = cy > pT + chartH * 0.55 ? cy - TH - 10 : cy + 14;
    const rows = [
      { label: 'Total Score',    val: d.total.toFixed(2),             color: sc,                             bold: chart === 'total'  },
      { label: 'Contraventions', val: d.contra.toFixed(2),            color: bcCatColor('contra', d.contra), bold: chart === 'contra' },
      { label: 'CVSA (OOS)',     val: d.cvsa.toFixed(2),              color: bcCatColor('cvsa',   d.cvsa),   bold: chart === 'cvsa'   },
      { label: 'Accidents',      val: d.acc.toFixed(2),               color: bcCatColor('acc',    d.acc),    bold: chart === 'acc'    },
      { label: 'Vehicle Days',   val: d.vehicleDays.toLocaleString(), color: '#475569',                      bold: chart === 'fleet'  },
      { label: 'Avg Fleet',      val: d.avgFleet.toFixed(1),          color: '#16a34a',                      bold: chart === 'fleet'  },
      { label: 'Monthly Days',   val: d.monthlyActiveDays.toLocaleString(), color: '#818cf8',                bold: false              },
    ];
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={tx+3} y={ty+3} width={TW} height={TH} rx="10" fill="rgba(15,23,42,0.13)"/>
        <rect x={tx} y={ty} width={TW} height={TH} rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.2"/>
        <rect x={tx} y={ty} width={TW} height={36} rx="10" fill={sc} opacity="0.13"/>
        <rect x={tx} y={ty+20} width={TW} height={16} fill={sc} opacity="0.13"/>
        <text x={tx+12} y={ty+15} fontSize="14" fontWeight="800" fill={sc}>{d.pullDate}</text>
        <text x={tx+12} y={ty+30} fontSize="10" fill="#64748b">{d.windowLabel}</text>
        <rect x={tx+TW-74} y={ty+7} width={66} height={18} rx="7" fill={sc} opacity="0.18"/>
        <text x={tx+TW-41} y={ty+19} fontSize="10" fontWeight="800" fill={sc} textAnchor="middle">{st}</text>
        <line x1={tx+10} x2={tx+TW-10} y1={ty+38} y2={ty+38} stroke="#e2e8f0" strokeWidth="0.8"/>
        {rows.map((r, ri) => (
          <g key={r.label}>
            <text x={tx+12} y={ty+55+ri*19} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '400'} fill={r.bold ? '#1e293b' : '#64748b'}>{r.label}</text>
            <text x={tx+TW-12} y={ty+55+ri*19} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '600'} fill={r.color} textAnchor="end" fontFamily="monospace">{r.val}</text>
          </g>
        ))}
        <line x1={tx+10} x2={tx+TW-10} y1={ty+TH-20} y2={ty+TH-20} stroke="#e2e8f0" strokeWidth="0.8"/>
        <text x={tx+12} y={ty+TH-8} fontSize="10" fill="#94a3b8">{d.inspections} inspections · click to select row</text>
      </g>
    );
  };

  const first = data[0];
  const last  = data[data.length - 1];

  // ── Chart 1 ─────────────────────────────────────────────────────────────────
  const CH1    = 274;
  const VH1    = CH1 + pT + pB;
  const totMax = Math.max(Math.ceil(Math.max(...data.map(d => d.total)) * 1.18 * 10) / 10, 2.8);
  const totMin = 0;
  const yt1    = (v: number) => yAt(v, totMax, totMin, CH1);

  const totalZones = [
    { from: 0,            to: BC_TOTAL_SAT,  fill: '#bbf7d0', label: 'Satisfactory', lc: '#166534' },
    { from: BC_TOTAL_SAT, to: BC_TOTAL_COND, fill: '#fef08a', label: 'Conditional',  lc: '#854d0e' },
    { from: BC_TOTAL_COND, to: totMax,       fill: '#fecaca', label: 'Unsatisfactory', lc: '#991b1b' },
  ];

  const totTicks = Array.from({ length: 6 }, (_, i) => +(i * (totMax / 5)).toFixed(2));

  // ── Chart 2 ─────────────────────────────────────────────────────────────────
  const CH2   = 194;
  const VH2   = CH2 + pT + pB;
  const cats  = [
    { key: 'contra' as const, label: 'Contraventions',        color: '#d97706', satKey: 'contra' },
    { key: 'cvsa'   as const, label: 'CVSA (Out of Service)', color: '#3b82f6', satKey: 'cvsa'   },
    { key: 'acc'    as const, label: 'Accidents',             color: '#dc2626', satKey: 'acc'    },
  ];
  const catMax = Math.max(
    Math.ceil(Math.max(...data.map(d => Math.max(d.contra, d.cvsa, d.acc))) * 1.25 * 10) / 10,
    1.5,
  );
  const yt2 = (v: number) => yAt(v, catMax, 0, CH2);
  const cat2Ticks = Array.from({ length: 5 }, (_, i) => +(i * (catMax / 4)).toFixed(2));

  // ── Chart 3 ─────────────────────────────────────────────────────────────────
  const CH3      = 176;
  const VH3      = CH3 + pT + pB;
  const vdMax    = Math.max(...data.map(d => d.vehicleDays)) * 1.12;
  const fleetMax = Math.max(...data.map(d => d.avgFleet)) * 1.1;
  const fleetScale = vdMax / fleetMax;
  const yt3 = (v: number) => yAt(v, vdMax, 0, CH3);
  const vdTickStep = Math.ceil(vdMax / 3 / 1000) * 1000;
  const vdTicks = [0, vdTickStep, vdTickStep * 2, vdTickStep * 3].filter(v => v <= vdMax * 1.05);

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Activity size={14} className="text-slate-400"/>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">NSC BC Performance History</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} pulls</span>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
            {shortLabel(first.pullDate)} → {shortLabel(last.pullDate)} · {n}mo
          </span>
          <span className="text-[10px] italic text-slate-400">Each pull = 12-month rolling window</span>
          {/* Status legend */}
          <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1">
            {[
              { c: '#dc2626', label: 'Unsatisfactory pull' },
              { c: '#d97706', label: 'Conditional pull'    },
              { c: '#16a34a', label: 'Satisfactory pull'   },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm" style={{ background: l.c }}/>
                <span className="text-[10px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Cadence</span>
          <div className="inline-flex rounded-xl bg-slate-100 p-0.5 gap-px">
            {(['Monthly', 'Quarterly', 'Semi-Annual', 'Annual', 'All'] as Cadence[]).map(c => (
              <button key={c} onClick={() => setCadence(c)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${cadence === c ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* ══ CHART 1: NSC Profile Score History ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">NSC Profile Score History</span>
            {totalZones.map(z => (
              <div key={z.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border" style={{ background: z.fill, borderColor: z.lc + '55' }}/>
                <span className="text-[10px] font-mono" style={{ color: z.lc }}>{z.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Lower is better · BC NSC Profile Score (0–7+)</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH1 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Zone bands */}
              {totalZones.map(z => {
                const clTo   = Math.min(z.to, totMax);
                const clFrom = Math.max(z.from, totMin);
                if (clTo <= clFrom) return null;
                const y1 = yt1(clTo);
                const y2 = yt1(clFrom);
                return (
                  <g key={z.label}>
                    <rect x={pL} y={y1} width={cW} height={y2 - y1} fill={z.fill} opacity="0.40"/>
                    <text x={pL + 10} y={(y1 + y2) / 2 + 4} fontSize="12" fill={z.lc} fontWeight="700" opacity="0.78">{z.label}</text>
                  </g>
                );
              })}

              {/* Y-grid */}
              <YGrid ticks={totTicks} max={totMax} min={totMin} chartH={CH1}/>

              {/* Threshold lines */}
              {[{ t: BC_TOTAL_SAT,  c: '#16a34a', lbl: `${BC_TOTAL_SAT} — Satisfactory limit`  },
                { t: BC_TOTAL_COND, c: '#dc2626', lbl: `${BC_TOTAL_COND} — Unsatisfactory limit` }].map(th => (
                <g key={th.t}>
                  <line x1={pL} x2={pL+cW} y1={yt1(th.t)} y2={yt1(th.t)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.90"/>
                  <text x={pL+cW+8} y={yt1(th.t)+3.5} fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>
                </g>
              ))}

              {/* Area + line */}
              <path d={mkArea(d => d.total, totMax, totMin, CH1)} fill="#16a34a" opacity="0.08"/>
              <path d={mkPath(d => d.total, totMax, totMin, CH1)} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

              {/* Value labels on last */}
              {data.map((d, i) => {
                const cx   = xAt(i);
                const cy   = yt1(d.total);
                const isLast = i === n - 1;
                const col  = d.total >= BC_TOTAL_COND ? '#dc2626' : d.total >= BC_TOTAL_SAT ? '#d97706' : '#16a34a';
                return isLast ? (
                  <text key={i} x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fontWeight="bold"
                    fill={col} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d.total.toFixed(2)}
                  </text>
                ) : null;
              })}

              <XAxis chartH={CH1}/>

              {/* Dots — interactive */}
              {data.map((d, i) => {
                const cx     = xAt(i);
                const cy     = yt1(d.total);
                const col    = d.total >= BC_TOTAL_COND ? '#dc2626' : d.total >= BC_TOTAL_SAT ? '#d97706' : '#16a34a';
                const isHov  = hovered?.chart === 'c1' && hovered.idx === i;
                const isSel  = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c1', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <circle cx={cx} cy={cy} r="14" fill={col} opacity="0.12"/>}
                    <circle cx={cx} cy={cy} r={isHov || isSel ? 7 : i === n-1 ? 5.5 : 4}
                      fill={isSel ? col : col} stroke={isSel ? 'white' : 'white'}
                      strokeWidth={isSel ? 3 : 1.5}
                      style={{ filter: isHov ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : 'none' }}/>
                    {/* Hit area */}
                    <circle cx={cx} cy={cy} r="14" fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c1' && (() => {
                const d  = data[hovered.idx];
                if (!d) return null;
                return <BcTip cx={xAt(hovered.idx)} cy={yt1(d.total)} d={d} chart="total" chartH={CH1}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 2: Category Scores Over Time ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Category Scores Over Time</span>
            {cats.map(c => (
              <div key={c.key} className="flex items-center gap-1.5">
                <div className="w-5 h-1 rounded" style={{ background: c.color }}/>
                <span className="text-[10px] font-medium text-slate-600">{c.label}</span>
              </div>
            ))}
            {cats.map(c => (
              <div key={`sat-${c.key}`} className="flex items-center gap-1.5">
                <div className="w-5 border-t border-dashed" style={{ borderColor: c.color }}/>
                <span className="text-[10px] text-slate-400">{c.label.split(' ')[0]} sat. limit</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Dashed = satisfactory threshold per category</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH2 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH2}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid */}
              {cat2Ticks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt2(v)} y2={yt2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt2(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v.toFixed(2)}</text>
                </g>
              ))}

              {/* Sat threshold dashes per category */}
              {cats.map(c => (
                <line key={`sat-${c.key}`}
                  x1={pL} x2={pL+cW}
                  y1={yt2(CAT_SAT[c.satKey])} y2={yt2(CAT_SAT[c.satKey])}
                  stroke={c.color} strokeWidth="1.2" strokeDasharray="5,4" opacity="0.55"/>
              ))}

              {/* Lines */}
              {cats.map(c => (
                <path key={c.key}
                  d={mkPath(d => d[c.key], catMax, 0, CH2)}
                  fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              ))}

              {/* Value labels on last */}
              {cats.map(c => {
                const d = data[n - 1];
                const cx = xAt(n - 1);
                const cy = yt2(d[c.key]);
                return (
                  <text key={c.key} x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill={c.color} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d[c.key].toFixed(2)}
                  </text>
                );
              })}

              <XAxis chartH={CH2}/>

              {/* Dots — interactive (one hit zone per time point covering all 3 cats) */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const isHov = hovered?.chart === 'c2' && hovered.idx === i;
                const isSel = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c2', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {cats.map(c => {
                      const cy = yt2(d[c.key]);
                      return (
                        <circle key={c.key} cx={cx} cy={cy} r={isHov || isSel ? 6 : i === n-1 ? 5 : 3.5}
                          fill={c.color} stroke="white" strokeWidth="1.5"
                          style={{ filter: isHov ? 'drop-shadow(0 0 3px rgba(0,0,0,0.25))' : 'none' }}/>
                      );
                    })}
                    {isSel && <circle cx={cx} cy={yt2(Math.max(d.contra, d.cvsa, d.acc))} r="16" fill="#6366f1" opacity="0.08"/>}
                    {/* Hit area */}
                    <rect x={cx - 12} y={pT} width={24} height={CH2} fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c2' && (() => {
                const d  = data[hovered.idx];
                if (!d) return null;
                const cy = yt2(Math.max(d.contra, d.cvsa, d.acc));
                return <BcTip cx={xAt(hovered.idx)} cy={cy} d={d} chart="contra" chartH={CH2}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 3: Vehicle Activity ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Vehicle Activity</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm border" style={{ background: '#6366f122', borderColor: '#6366f1' }}/>
              <span className="text-[10px] font-medium text-slate-600">Vehicle Days (bars)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-emerald-500"/>
              <span className="text-[10px] font-medium text-slate-600">Avg Fleet Size (line)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 border-t-2 border-dashed border-indigo-400"/>
              <span className="text-[10px] font-medium text-slate-600">Monthly Active Days (line)</span>
            </div>
            <span className="ml-auto text-[10px] italic text-slate-400">Fleet size plotted on same scale as vehicle days</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH3 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH3}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid */}
              {vdTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt3(v)} y2={yt3(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt3(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">
                    {v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  </text>
                </g>
              ))}

              {/* Bars — vehicle days */}
              {data.map((d, i) => {
                const bw   = Math.max(10, Math.min(30, cW / n * 0.45));
                const bx   = xAt(i) - bw / 2;
                const barH = ((d.vehicleDays) / vdMax) * CH3;
                return (
                  <rect key={d.id} x={bx} y={pT + CH3 - barH} width={bw} height={barH}
                    fill="#6366f1" opacity="0.22" stroke="#6366f1" strokeWidth="1" rx="2"/>
                );
              })}

              {/* Avg fleet line */}
              <path d={mkPath(d => d.avgFleet * fleetScale, vdMax, 0, CH3)}
                fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6,3"/>

              {/* Monthly active days line */}
              <path d={mkPath(d => (d.monthlyActiveDays ?? 0) * (vdMax / Math.max(...data.map(x => x.monthlyActiveDays ?? 1))), vdMax, 0, CH3)}
                fill="none" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4,4"/>

              {/* Fleet dots — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const cy    = yt3(d.avgFleet * fleetScale);
                const isHov = hovered?.chart === 'c3' && hovered.idx === i;
                const isSel = selectedId === d.id;
                const isLast = i === n - 1;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c3', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <circle cx={cx} cy={cy} r="14" fill="#16a34a" opacity="0.12"/>}
                    <circle cx={cx} cy={cy} r={isHov || isSel ? 7 : isLast ? 5 : 3.5}
                      fill="#16a34a" stroke="white" strokeWidth="1.5"
                      style={{ filter: isHov ? 'drop-shadow(0 0 4px rgba(0,0,0,0.25))' : 'none' }}/>
                    {isLast && (
                      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#16a34a" fontFamily="monospace">
                        {d.avgFleet.toFixed(1)}
                      </text>
                    )}
                    {/* Hit area */}
                    <circle cx={cx} cy={cy} r="14" fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c3' && (() => {
                const d = data[hovered.idx];
                if (!d) return null;
                return <BcTip cx={xAt(hovered.idx)} cy={yt3(d.avgFleet * fleetScale)} d={d} chart="fleet" chartH={CH3}/>;
              })()}

              <XAxis chartH={CH3}/>

            </svg>
          </div>
        </div>

        {/* ══ PULL-BY-PULL DATA TABLE ══ */}
        {(() => {
          const tbFiltered = BC_PULL_DATA.filter(r =>
            r.pullDate.toLowerCase().includes(tbSearch.toLowerCase())    ||
            r.windowLabel.toLowerCase().includes(tbSearch.toLowerCase()) ||
            bcSt(r.total).toLowerCase().includes(tbSearch.toLowerCase())
          );
          const tbTotal   = tbFiltered.length;
          const tbPages   = Math.max(1, Math.ceil(tbTotal / tbRpp));
          const tbVisible = tbFiltered.slice((tbPage - 1) * tbRpp, tbPage * tbRpp);
          const tbNums    = Array.from({ length: tbPages }, (_, i) => i + 1);

          return (
            <div className="px-0">
              {/* Section title bar */}
              <div className="px-6 py-3 border-t border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Pull-by-Pull Data</span>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{BC_PULL_DATA.length} pulls</span>
                <span className="text-[10px] text-slate-400">newest first · click row → profile drill-down</span>
                {/* Search */}
                <div className="relative ml-auto max-w-xs w-full">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input
                    value={tbSearch}
                    onChange={e => { setTbSearch(e.target.value); setTbPage(1); }}
                    placeholder="Search date, window, status…"
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">
                  {Math.min(tbRpp, tbVisible.length)} of {tbTotal}
                </span>
                <button className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
                  <Columns3 size={12}/>Columns
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40">
                      <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Pull Date ↓</th>
                      <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">12-Month Window</th>
                      <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Vehicle Days</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Monthly Days</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Avg Fleet</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-amber-500  uppercase tracking-wider whitespace-nowrap">Contra</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-blue-500   uppercase tracking-wider whitespace-nowrap">CVSA</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-rose-400   uppercase tracking-wider whitespace-nowrap">Accidents</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-500  uppercase tracking-wider whitespace-nowrap">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbVisible.map((r, idx) => {
                      const st         = bcSt(r.total);
                      const isFirst    = tbPage === 1 && idx === 0;
                      const isExpanded = tbExpanded === r.id;
                      const isSel      = selectedId === r.id;
                      return (
                        <>
                          <tr key={r.id}
                            onClick={() => setTbExpanded(isExpanded ? null : r.id)}
                            className={`border-b border-slate-50 cursor-pointer transition-colors ${isSel ? 'bg-indigo-50 ring-1 ring-inset ring-indigo-300' : isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                {isFirst && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Latest</span>}
                                <span className="font-semibold text-slate-800">{r.pullDate}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="text-slate-700">{r.windowLabel}</div>
                              <div className="text-[10px] text-slate-400">{r.inspections} inspection{r.inspections !== 1 ? 's' : ''}</div>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${bcStBadgeCls(st)}`}>{st}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.vehicleDays.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.monthlyActiveDays.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.avgFleet.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcCatColor('contra', r.contra) }}>{r.contra.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcCatColor('cvsa',   r.cvsa)   }}>{r.cvsa.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcCatColor('acc',    r.acc)    }}>{r.acc.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: bcStColor(st) }}>{r.total.toFixed(2)}</td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${r.id}-drill`}>
                              <td colSpan={10} className="p-4 bg-slate-50 border-b border-slate-100">
                                <BcPullDrillDown r={r}/>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span>{(tbPage-1)*tbRpp+1}–{Math.min(tbPage*tbRpp, tbTotal)} of {tbTotal}</span>
                  <span className="ml-1">Rows:</span>
                  <select value={tbRpp} onChange={e => { setTbRpp(+e.target.value); setTbPage(1); }}
                    className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white">
                    {[5,10,15].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setTbPage(p => Math.max(1, p-1))} disabled={tbPage===1}
                    className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">‹</button>
                  {tbNums.map(p => (
                    <button key={p} onClick={() => setTbPage(p)}
                      className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p===tbPage?'bg-blue-600 text-white border-blue-600':'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setTbPage(p => Math.min(tbPages, p+1))} disabled={tbPage===tbPages}
                    className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">›</button>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}
