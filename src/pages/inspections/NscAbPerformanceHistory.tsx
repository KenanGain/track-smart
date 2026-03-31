import React, { useState } from 'react';
import { Activity, Search, Columns3, ChevronDown, ChevronRight } from 'lucide-react';
import { AB_PULL_DATA } from './NscAbPullByPull';

// ─── Pull-by-pull helpers ─────────────────────────────────────────────────────

type AbStatus = 'Ok' | 'Warning' | 'Critical';

const abStColor = (s: AbStatus) =>
  s === 'Critical' ? '#dc2626' : s === 'Warning' ? '#d97706' : '#16a34a';

const abStBadgeCls = (s: AbStatus) =>
  s === 'Critical' ? 'bg-red-100 text-red-700 border-red-300'
: s === 'Warning'  ? 'bg-amber-100 text-amber-700 border-amber-300'
:                    'bg-emerald-100 text-emerald-700 border-emerald-300';

function abRfColor(v: number): string {
  if (v >= 0.085) return '#dc2626';
  if (v >= 0.070) return '#d97706';
  return '#16a34a';
}

// ─── Label helper ─────────────────────────────────────────────────────────────

function shortLabel(pullDate: string): string {
  // "Apr 2/26" → "Apr '26"
  const parts = pullDate.trim().split(' ');
  if (parts.length >= 2) {
    const yearPart = parts[parts.length - 1].split('/')[1];
    return `${parts[0]} '${yearPart ?? '??'}`;
  }
  return pullDate;
}

// ─── AB Thresholds ────────────────────────────────────────────────────────────

const AB_RF_OK   = 0.070;
const AB_RF_WARN = 0.085;

// ─── Mock data for AB drill-down ──────────────────────────────────────────────

function seedRandAb(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function genAbMockData(r: typeof AB_PULL_DATA[0]) {
  const seed = r.pullDate.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng  = seedRandAb(seed);

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const makeDate = () => {
    const m = Math.floor(rng() * 12);
    const d = Math.floor(rng() * 28) + 1;
    return `${String(d).padStart(2,'0')}-${months[m]}-2024`;
  };

  // Convictions
  const AB_OFFENCES = [
    { act: 'TSA',   section: 'S.115(2)',  desc: 'Speeding — commercial vehicle',                  pts: 3 },
    { act: 'TSA',   section: 'S.71',      desc: 'Fail to obey traffic control device',             pts: 2 },
    { act: 'HOS',   section: 'S.12',      desc: 'Log book not completed or unavailable',           pts: 4 },
    { act: 'HOS',   section: 'S.7',       desc: 'Hours of service exceeded',                       pts: 5 },
    { act: 'CVCIA', section: 'S.4(1)',    desc: 'Operating without valid CVCA certificate',        pts: 4 },
    { act: 'W&D',   section: 'S.9(1)',    desc: 'Overweight — single axle',                       pts: 3 },
    { act: 'W&D',   section: 'S.16',      desc: 'Oversize load — no permit',                      pts: 3 },
    { act: 'TSA',   section: 'S.18(1)',   desc: 'Defective equipment — brakes',                   pts: 5 },
    { act: 'HOS',   section: 'S.19',      desc: 'Off-duty time falsified',                        pts: 5 },
    { act: 'CVCIA', section: 'S.22',      desc: 'Fail to produce certificate on demand',          pts: 2 },
  ];
  const convEvents = Array.from({ length: r.convictions }, () => {
    const o = AB_OFFENCES[Math.floor(rng() * AB_OFFENCES.length)];
    return { ...o, date: makeDate(), driver: `Driver ${String(Math.floor(rng() * 90) + 10)}` };
  });

  // CVSA
  const AB_CVSA_VIOS = [
    'Brake adjustment out of spec', 'Tire tread below minimum', 'Lighting deficiency',
    'Load securement violation', 'Coupling defect', 'Steering play excessive',
    'None', 'None', 'None',
  ];
  const cvsaPass = Math.round(r.cvsaInspections * (0.55 + rng() * 0.25));
  const cvsaOos  = r.cvsaInspections > 0 ? Math.max(0, Math.round(r.cvsaInspections * 0.12)) : 0;
  const cvsaFail = Math.max(0, r.cvsaInspections - cvsaPass - cvsaOos);
  const cvsaEvents = Array.from({ length: r.cvsaInspections }, (_, i) => {
    const isPas = i < cvsaPass;
    const isOos = !isPas && i < cvsaPass + cvsaOos;
    return {
      date:      makeDate(),
      level:     `Level ${Math.floor(rng() * 3) + 1}`,
      location:  ['Edmonton, AB', 'Calgary, AB', 'Red Deer, AB', 'Lethbridge, AB', 'Grande Prairie, AB'][Math.floor(rng() * 5)],
      violation: isOos || !isPas ? AB_CVSA_VIOS[Math.floor(rng() * (AB_CVSA_VIOS.length - 3))] : 'None',
      result:    isOos ? 'Out of Service' : isPas ? 'Pass' : 'Req. Attn',
    };
  });

  // Collisions
  const AB_COLL_TYPES = [
    { type: 'Rear-End',       severity: 'Property Damage' },
    { type: 'Side-Swipe',     severity: 'Property Damage' },
    { type: 'Jackknife',      severity: 'Injury'          },
    { type: 'Run-Off-Road',   severity: 'Property Damage' },
    { type: 'Head-On',        severity: 'Injury'          },
    { type: 'Backing',        severity: 'Property Damage' },
    { type: 'Intersection',   severity: 'Injury'          },
  ];
  const injuryCount  = Math.round(r.reportableCollisions * 0.33);
  const damageCount  = r.reportableCollisions - injuryCount;
  const collisions   = Array.from({ length: r.reportableCollisions }, () => {
    const c = AB_COLL_TYPES[Math.floor(rng() * AB_COLL_TYPES.length)];
    return { ...c, date: makeDate(), vehicles: Math.floor(rng() * 2) + 2, atFault: rng() > 0.45 ? 'Yes' : 'No' };
  });

  // Violations (grouped)
  const AB_VIOL_CATS = [
    { cat: 'Hours of Service',     count: Math.max(0, Math.round(r.convictions * 0.35 + rng() * 2)) },
    { cat: 'Vehicle Maintenance',  count: Math.max(0, Math.round(r.cvsaInspections * 0.2 + rng() * 2)) },
    { cat: 'Driver Qualifications',count: Math.max(0, Math.round(r.convictions * 0.15 + rng() * 1)) },
    { cat: 'Load Securement',      count: Math.max(0, Math.round(r.cvsaInspections * 0.1 + rng() * 1)) },
    { cat: 'Dangerous Goods',      count: Math.max(0, Math.round(rng() * 2)) },
  ];
  const totalViolOccurrences = AB_VIOL_CATS.reduce((s, c) => s + c.count, 0) || 1;
  const groupedViolPct = +(totalViolOccurrences / Math.max(r.convictions + r.cvsaInspections, 1) * 100).toFixed(1);

  // Monitoring (24 monthly snapshots)
  const monitoringSnaps = Array.from({ length: 24 }, (_, i) => {
    const m = months[(new Date().getMonth() - 23 + i + 24) % 12];
    const fleetSize = Math.max(1, Math.round(15 + rng() * 20));
    const oosPct    = Math.round((r.cvsaInspections > 0 ? cvsaOos / r.cvsaInspections : rng() * 0.15) * 100);
    return { label: `${m}'${String(new Date().getFullYear() - (i < 12 ? 1 : 0)).slice(2)}`, fleetSize, oosPct };
  });
  const latestOosPct = monitoringSnaps[monitoringSnaps.length - 1].oosPct;

  // Safety fitness
  const certCount     = Math.max(1, Math.round(r.adminPenalties + 1 + rng() * 1));
  const ratingCount   = Math.max(1, Math.round(certCount * 0.6 + rng()));
  const condCount     = Math.max(0, Math.round(rng() * 1));
  const opStatusCount = Math.max(1, Math.round(certCount * 0.4 + rng()));
  const activeCertPct = +(certCount / Math.max(certCount + condCount, 1) * 100).toFixed(1);

  // Historical timeline
  const totalEvents = r.convictions + r.cvsaInspections + r.reportableCollisions + r.adminPenalties + 2;
  const cvsaShare   = +(r.cvsaInspections / Math.max(totalEvents, 1) * 100).toFixed(2);

  // Contribution pcts for the 3 main categories
  const total3 = r.convictions + r.cvsaInspections + r.reportableCollisions || 1;
  const convContrib  = +((r.convictions          / total3) * 100).toFixed(1);
  const cvsaContrib  = +((r.cvsaInspections      / total3) * 100).toFixed(1);
  const collContrib  = +((r.reportableCollisions  / total3) * 100).toFixed(1);

  return {
    convEvents, cvsaEvents, cvsaPass, cvsaOos, cvsaFail,
    collisions, injuryCount, damageCount,
    AB_VIOL_CATS, totalViolOccurrences, groupedViolPct,
    monitoringSnaps, latestOosPct,
    certCount, ratingCount, condCount, opStatusCount, activeCertPct,
    totalEvents, cvsaShare,
    convContrib, cvsaContrib, collContrib,
  };
}

// ─── NSC Analysis–style row component ────────────────────────────────────────

function AbAnalysisRow({ title, subtitle, statLabel, statVal, badge, badgeCls, open, onToggle, children }: {
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

// ─── AB Pull Drill-Down ───────────────────────────────────────────────────────

type AbSectionKey = 'conv'|'cvsa'|'coll'|'viol'|'mon'|'fit'|'hist';

function AbPullDrillDown({ r }: { r: typeof AB_PULL_DATA[0] }) {
  const [open, setOpen] = useState<Partial<Record<AbSectionKey, boolean>>>({ conv: true });
  const tog = (k: AbSectionKey) => setOpen(p => ({ ...p, [k]: !p[k] }));

  const mock = genAbMockData(r);
  const sc   = abStColor(r.status);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

      {/* Pull header */}
      <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap border-b border-slate-100"
        style={{ background: sc + '0d', borderLeftWidth: 3, borderLeftColor: sc }}>
        <span className="text-[13px] font-black text-slate-800">{r.pullDate}</span>
        <span className="text-[11px] text-slate-400">{r.windowLabel}</span>
        <span className={`text-[9px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${abStBadgeCls(r.status)}`}>{r.status}</span>
        <span className="text-[10px] text-slate-400 ml-auto">NSC AB Profile Report · R-Factor {r.rFactor.toFixed(3)}</span>
      </div>

      <div className="p-4 space-y-2.5">

        {/* ── Conviction Analysis ── */}
        <AbAnalysisRow
          title="Conviction Analysis"
          subtitle={`${r.convictions} conviction event${r.convictions !== 1 ? 's' : ''} | offence mix and detailed conviction history`}
          statLabel="Contribution"
          statVal={`${mock.convContrib}%`}
          badge={r.status}
          badgeCls={abStBadgeCls(r.status)}
          open={!!open.conv}
          onToggle={() => tog('conv')}
        >
          <div>
            <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
              <span className="text-[10px] text-slate-500">Total convictions: <strong className="text-slate-700">{r.convictions}</strong></span>
              <span className="text-[10px] text-slate-500 ml-auto">Contribution to R-Factor: <strong style={{ color: sc }}>{mock.convContrib}%</strong></span>
            </div>
            {r.convictions === 0 ? (
              <div className="px-5 py-4 flex items-center gap-3 bg-emerald-50/40">
                <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">✓</span>
                <span className="text-[11px] text-emerald-700 font-medium">No conviction events in this 24-month period</span>
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Act','Section','Description','Driver','Date','Points'].map(h => (
                      <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Points' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mock.convEvents.map((c, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-2.5 text-slate-500 text-[10px]">{c.act}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">{c.section}</td>
                      <td className="px-4 py-2.5 text-slate-700">{c.desc}</td>
                      <td className="px-4 py-2.5 text-slate-500">{c.driver}</td>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-500">{c.date}</td>
                      <td className="px-4 py-2.5 text-right font-bold font-mono" style={{ color: c.pts >= 5 ? '#dc2626' : c.pts >= 3 ? '#d97706' : '#64748b' }}>{c.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </AbAnalysisRow>

        {/* ── CVSA Inspection Analysis ── */}
        <AbAnalysisRow
          title="CVSA Inspection Analysis"
          subtitle={`${r.cvsaInspections} inspection${r.cvsaInspections !== 1 ? 's' : ''} | ${mock.cvsaPass} pass, ${mock.cvsaFail} req. attn, ${mock.cvsaOos} OOS`}
          statLabel="Contribution"
          statVal={`${mock.cvsaContrib}%`}
          badge={r.status}
          badgeCls={abStBadgeCls(r.status)}
          open={!!open.cvsa}
          onToggle={() => tog('cvsa')}
        >
          <div>
            <div className="px-5 py-3 bg-blue-50/40 border-b border-slate-100 flex items-center gap-6 flex-wrap">
              {[
                { label: 'Pass',          val: mock.cvsaPass, color: '#16a34a' },
                { label: 'Req. Attn',     val: mock.cvsaFail, color: '#d97706' },
                { label: 'Out of Service',val: mock.cvsaOos,  color: '#dc2626' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }}/>
                  <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[10px] text-slate-500">{s.label}</span>
                </div>
              ))}
              <div className="ml-auto text-[10px] text-slate-400">OOS Rate: <strong style={{ color: mock.cvsaOos > 0 ? '#dc2626' : '#16a34a' }}>{r.cvsaInspections > 0 ? Math.round(mock.cvsaOos / r.cvsaInspections * 100) : 0}%</strong></div>
            </div>
            {r.cvsaInspections === 0 ? (
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
                  {mock.cvsaEvents.map((c, i) => (
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
        </AbAnalysisRow>

        {/* ── Collision Summary ── */}
        <AbAnalysisRow
          title="Collision Summary"
          subtitle={`${r.reportableCollisions} event${r.reportableCollisions !== 1 ? 's' : ''} | ${mock.damageCount} damage, ${mock.injuryCount} injury`}
          statLabel="Contribution"
          statVal={`${mock.collContrib}%`}
          badge={r.status}
          badgeCls={abStBadgeCls(r.status)}
          open={!!open.coll}
          onToggle={() => tog('coll')}
        >
          {r.reportableCollisions === 0 ? (
            <div className="px-5 py-4 flex items-center gap-3 bg-emerald-50/40">
              <span className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-[12px]">✓</span>
              <span className="text-[11px] text-emerald-700 font-medium">No reportable collisions in this 24-month period</span>
            </div>
          ) : (
            <>
              <div className="px-5 py-2.5 bg-red-50/40 border-b border-red-100 flex items-center gap-6">
                {[
                  { label: 'Property Damage', val: mock.damageCount, color: '#d97706' },
                  { label: 'Injury',           val: mock.injuryCount,  color: '#dc2626' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }}/>
                    <span className="text-[11px] font-bold" style={{ color: s.color }}>{s.val}</span>
                    <span className="text-[10px] text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    {['Date','Collision Type','Severity','At Fault','Vehicles'].map(h => (
                      <th key={h} className={`px-4 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider ${h === 'Vehicles' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mock.collisions.map((c, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-600">{c.date}</td>
                      <td className="px-4 py-2.5 text-slate-700">{c.type}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${c.severity === 'Injury' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {c.severity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{c.atFault}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600">{c.vehicles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </AbAnalysisRow>

        {/* ── Violation Analysis ── */}
        <AbAnalysisRow
          title="Violation Analysis"
          subtitle={`${mock.totalViolOccurrences} violation occurrence${mock.totalViolOccurrences !== 1 ? 's' : ''} | grouped categories and detailed violation history`}
          statLabel="Grouped Total"
          statVal={`${mock.groupedViolPct}%`}
          badge={`${mock.totalViolOccurrences} OCCURRENCES`}
          badgeCls="bg-indigo-50 text-indigo-600 border-indigo-200"
          open={!!open.viol}
          onToggle={() => tog('viol')}
        >
          <div className="p-4 space-y-2 bg-slate-50/40">
            {mock.AB_VIOL_CATS.map(cat => {
              const pct = Math.min((cat.count / Math.max(mock.totalViolOccurrences, 1)) * 100, 100);
              return (
                <div key={cat.cat} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-700">{cat.cat}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold font-mono text-slate-700">{cat.count}</span>
                      <span className="text-[9px] text-slate-400">occurrences</span>
                    </div>
                  </div>
                  <div className="relative h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-400" style={{ width: `${pct}%` }}/>
                  </div>
                  <div className="flex justify-between text-[9px] mt-1 text-slate-400">
                    <span>{pct.toFixed(1)}% of total violations</span>
                  </div>
                </div>
              );
            })}
          </div>
        </AbAnalysisRow>

        {/* ── Monitoring Summary ── */}
        <AbAnalysisRow
          title="Monitoring Summary"
          subtitle="24 month-end snapshots | fleet trends, stages, and detailed inspection metrics"
          statLabel="Latest OOS"
          statVal={`${mock.latestOosPct}%`}
          badge="24 MONTHS"
          badgeCls="bg-blue-50 text-blue-600 border-blue-200"
          open={!!open.mon}
          onToggle={() => tog('mon')}
        >
          <div className="p-4 bg-slate-50/40">
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'CVSA Inspections',       val: r.cvsaInspections,     unit: 'total (24 mo)',   color: '#3b82f6' },
                { label: 'Latest OOS Rate',         val: `${mock.latestOosPct}%`, unit: 'out of service', color: mock.latestOosPct > 20 ? '#dc2626' : mock.latestOosPct > 10 ? '#d97706' : '#16a34a' },
                { label: 'Avg Monthly Inspections', val: (r.cvsaInspections / 24).toFixed(1), unit: 'per month', color: '#64748b' },
              ].map(item => (
                <div key={item.label} className="border border-slate-200 rounded-xl p-3.5 bg-white">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                  <div className="text-[24px] font-black font-mono leading-none" style={{ color: item.color }}>{item.val}</div>
                  <div className="text-[10px] text-slate-400 mt-1">{item.unit}</div>
                </div>
              ))}
            </div>
            {/* Mini sparkbar of monthly OOS */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Monthly OOS % — 24 Month Trend</div>
              <div className="flex items-end gap-0.5 h-10">
                {mock.monitoringSnaps.map((s, i) => {
                  const barH = Math.max(4, (s.oosPct / 50) * 40);
                  const col  = s.oosPct > 20 ? '#dc2626' : s.oosPct > 10 ? '#d97706' : '#16a34a';
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${s.label}: ${s.oosPct}% OOS`}>
                      <div className="w-full rounded-sm" style={{ height: barH, background: col, opacity: 0.75 }}/>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[8px] text-slate-400 mt-1">
                <span>{mock.monitoringSnaps[0].label}</span>
                <span>{mock.monitoringSnaps[mock.monitoringSnaps.length - 1].label}</span>
              </div>
            </div>
          </div>
        </AbAnalysisRow>

        {/* ── Safety Fitness Information ── */}
        <AbAnalysisRow
          title="Safety Fitness Information"
          subtitle={`${mock.certCount} certificate${mock.certCount !== 1 ? 's' : ''} | ${mock.ratingCount} rating${mock.ratingCount !== 1 ? 's' : ''}, ${mock.condCount} condition, ${mock.opStatusCount} operating status`}
          statLabel="Active Certs"
          statVal={`${mock.activeCertPct}%`}
          badge={`${mock.certCount} CERTIFICATES`}
          badgeCls="bg-emerald-50 text-emerald-700 border-emerald-200"
          open={!!open.fit}
          onToggle={() => tog('fit')}
        >
          <div className="p-4 bg-slate-50/40">
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">Certificate Breakdown</div>
                <div className="space-y-2">
                  {[
                    { label: 'Total Certificates',  val: mock.certCount,      color: '#16a34a' },
                    { label: 'Active Ratings',       val: mock.ratingCount,    color: '#3b82f6' },
                    { label: 'Conditions on File',   val: mock.condCount,      color: mock.condCount > 0 ? '#d97706' : '#64748b' },
                    { label: 'Operating Statuses',   val: mock.opStatusCount,  color: '#64748b' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{row.label}</span>
                      <span className="text-[13px] font-black font-mono" style={{ color: row.color }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-slate-200 rounded-xl p-4 bg-white">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">Safety Fitness Rating</div>
                <div className="space-y-2">
                  {[
                    { label: 'Current R-Factor',   val: r.rFactor.toFixed(3), color: abRfColor(r.rFactor) },
                    { label: 'R-Factor Status',     val: r.status,             color: abStColor(r.status) },
                    { label: 'Admin Penalties',     val: r.adminPenalties,     color: r.adminPenalties > 2 ? '#dc2626' : r.adminPenalties > 0 ? '#d97706' : '#16a34a' },
                    { label: 'Active Cert Rate',    val: `${mock.activeCertPct}%`, color: '#64748b' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{row.label}</span>
                      <span className="text-[11px] font-bold font-mono" style={{ color: row.color }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </AbAnalysisRow>

        {/* ── Historical Summary ── */}
        <AbAnalysisRow
          title="Historical Summary"
          subtitle={`${mock.totalEvents} timeline event${mock.totalEvents !== 1 ? 's' : ''} | monitoring, CVSA, collisions, convictions, and safety actions`}
          statLabel="CVSA Share"
          statVal={`${mock.cvsaShare}%`}
          badge={`${mock.totalEvents} EVENTS`}
          badgeCls="bg-slate-100 text-slate-600 border-slate-200"
          open={!!open.hist}
          onToggle={() => tog('hist')}
        >
          <div className="p-4 bg-slate-50/40">
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[
                { label: 'Convictions',  val: r.convictions,           color: '#6366f1' },
                { label: 'CVSA',         val: r.cvsaInspections,       color: '#3b82f6' },
                { label: 'Collisions',   val: r.reportableCollisions,  color: '#ef4444' },
                { label: 'Admin Pen.',   val: r.adminPenalties,        color: '#d97706' },
                { label: 'Other',        val: 2,                        color: '#94a3b8' },
              ].map(item => {
                const pct = Math.min(Math.round((item.val / Math.max(mock.totalEvents, 1)) * 100), 100);
                return (
                  <div key={item.label} className="border border-slate-200 rounded-xl p-3 bg-white text-center">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{item.label}</div>
                    <div className="text-[22px] font-black font-mono leading-none" style={{ color: item.color }}>{item.val}</div>
                    <div className="text-[9px] text-slate-400 mt-1">{pct}% share</div>
                    <div className="relative h-1 rounded-full bg-slate-100 overflow-hidden mt-1.5">
                      <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: item.color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-white">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Event Composition</div>
              <div className="flex items-center gap-1 h-3 rounded-full overflow-hidden">
                {[
                  { val: r.convictions,          color: '#6366f1' },
                  { val: r.cvsaInspections,      color: '#3b82f6' },
                  { val: r.reportableCollisions, color: '#ef4444' },
                  { val: r.adminPenalties,       color: '#d97706' },
                  { val: 2,                       color: '#94a3b8' },
                ].map((s, i) => (
                  <div key={i} style={{ flex: s.val || 0.5, background: s.color }}/>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {[
                  { label: 'Convictions', color: '#6366f1' },
                  { label: 'CVSA',        color: '#3b82f6' },
                  { label: 'Collisions',  color: '#ef4444' },
                  { label: 'Admin Pen.',  color: '#d97706' },
                  { label: 'Other',       color: '#94a3b8' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: s.color }}/>
                    <span className="text-[10px] text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AbAnalysisRow>

      </div>
    </div>
  );
}

// ─── SVG layout constants (matches CVOR sizing) ───────────────────────────────

const VW  = 1440;
const pL  = 74;
const pR  = 158;
const pT  = 30;
const pB  = 62;
const cW  = VW - pL - pR;

// ─── Component ────────────────────────────────────────────────────────────────

type Cadence = 'Monthly' | 'Quarterly' | 'All';

export function NscAbPerformanceHistory() {
  const [cadence,    setCadence]    = useState<Cadence>('All');
  const [tbSearch,   setTbSearch]   = useState('');
  const [tbPage,     setTbPage]     = useState(1);
  const [tbRpp,      setTbRpp]      = useState(10);
  const [tbExpanded, setTbExpanded] = useState<string | null>(null);
  const [hovered,    setHovered]    = useState<{ chart: string; idx: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = [...AB_PULL_DATA].reverse();

  const filterByCadence = (rows: typeof all): typeof all => {
    if (cadence === 'Monthly' || cadence === 'All') return rows;
    const out: typeof rows = [];
    let lastIdx = -99;
    rows.forEach((r, i) => {
      if (i === 0 || i - lastIdx >= 3) { out.push(r); lastIdx = i; }
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
      const rowIdx = AB_PULL_DATA.findIndex(r => r.id === newId);
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
  const AbTip = ({ cx, cy, d, chart, chartH }: {
    cx: number; cy: number; d: typeof data[0]; chart: string; chartH: number;
  }) => {
    const sc  = abStColor(d.status);
    const rfc = abRfColor(d.rFactor);
    const TW  = 262;
    const TH  = 200;
    const tx  = cx > pL + cW * 0.62 ? cx - TW - 18 : cx + 18;
    const ty  = cy > pT + chartH * 0.55 ? cy - TH - 10 : cy + 14;
    const rows = [
      { label: 'R-Factor',              val: d.rFactor.toFixed(3),          color: rfc, bold: chart === 'rf'  },
      { label: 'Convictions',           val: String(d.convictions),          color: d.convictions >= 16 ? '#dc2626' : d.convictions >= 12 ? '#d97706' : '#16a34a', bold: chart === 'con' },
      { label: 'Admin Penalties',       val: String(d.adminPenalties),       color: d.adminPenalties >= 3 ? '#dc2626' : d.adminPenalties >= 1 ? '#d97706' : '#16a34a', bold: chart === 'ap'  },
      { label: 'CVSA Inspections',      val: String(d.cvsaInspections),      color: '#3b82f6', bold: chart === 'cvsa' },
      { label: 'Reportable Collisions', val: String(d.reportableCollisions), color: d.reportableCollisions >= 9 ? '#dc2626' : d.reportableCollisions >= 7 ? '#d97706' : '#16a34a', bold: chart === 'col' },
      { label: 'Window',               val: d.windowLabel,                   color: '#64748b', bold: false },
    ];
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={tx+3} y={ty+3} width={TW} height={TH} rx="10" fill="rgba(15,23,42,0.13)"/>
        <rect x={tx} y={ty} width={TW} height={TH} rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.2"/>
        <rect x={tx} y={ty} width={TW} height={36} rx="10" fill={sc} opacity="0.13"/>
        <rect x={tx} y={ty+20} width={TW} height={16} fill={sc} opacity="0.13"/>
        <text x={tx+12} y={ty+15} fontSize="14" fontWeight="800" fill={sc}>{d.pullDate}</text>
        <text x={tx+12} y={ty+30} fontSize="10" fill="#64748b">24-month window</text>
        <rect x={tx+TW-74} y={ty+7} width={66} height={18} rx="7" fill={sc} opacity="0.18"/>
        <text x={tx+TW-41} y={ty+19} fontSize="10" fontWeight="800" fill={sc} textAnchor="middle">{d.status}</text>
        <line x1={tx+10} x2={tx+TW-10} y1={ty+38} y2={ty+38} stroke="#e2e8f0" strokeWidth="0.8"/>
        {rows.map((r, ri) => (
          <g key={r.label}>
            <text x={tx+12} y={ty+55+ri*22} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '400'} fill={r.bold ? '#1e293b' : '#64748b'}>{r.label}</text>
            <text x={tx+TW-12} y={ty+55+ri*22} fontSize={r.bold ? 12 : 11} fontWeight={r.bold ? '800' : '600'} fill={r.color} textAnchor="end" fontFamily="monospace">{r.val}</text>
          </g>
        ))}
        <line x1={tx+10} x2={tx+TW-10} y1={ty+TH-20} y2={ty+TH-20} stroke="#e2e8f0" strokeWidth="0.8"/>
        <text x={tx+12} y={ty+TH-8} fontSize="10" fill="#94a3b8">{d.inspections} CVSA inspections · click to select row</text>
      </g>
    );
  };

  const first = data[0];
  const last  = data[data.length - 1];

  // ── Chart 1: R-Factor ────────────────────────────────────────────────────────
  const CH1   = 274;
  const VH1   = CH1 + pT + pB;
  const rfMax = Math.max(Math.ceil(Math.max(...data.map(d => d.rFactor)) * 1.22 * 1000) / 1000, 0.13);
  const rfMin = 0;
  const yt1   = (v: number) => yAt(v, rfMax, rfMin, CH1);

  const rfZones = [
    { from: 0,          to: AB_RF_OK,   fill: '#bbf7d0', label: 'Ok',      lc: '#166534' },
    { from: AB_RF_OK,   to: AB_RF_WARN, fill: '#fef08a', label: 'Warning',  lc: '#854d0e' },
    { from: AB_RF_WARN, to: rfMax,      fill: '#fecaca', label: 'Critical', lc: '#991b1b' },
  ];

  const rfTickStep = +(rfMax / 5).toFixed(3);
  const rfTicks    = Array.from({ length: 6 }, (_, i) => +(i * rfTickStep).toFixed(3));

  const rfColor = (v: number) =>
    v >= AB_RF_WARN ? '#dc2626' : v >= AB_RF_OK ? '#d97706' : '#16a34a';

  // ── Chart 2: Category Events ─────────────────────────────────────────────────
  const CH2  = 194;
  const VH2  = CH2 + pT + pB;
  const cats = [
    { key: 'convictions'          as const, label: 'Convictions',          color: '#7c3aed' },
    { key: 'adminPenalties'       as const, label: 'Admin Penalties',       color: '#d97706' },
    { key: 'cvsaInspections'      as const, label: 'CVSA Inspections',      color: '#3b82f6' },
    { key: 'reportableCollisions' as const, label: 'Reportable Collisions', color: '#dc2626' },
  ];

  const catMax = Math.max(
    Math.ceil(Math.max(...data.map(d => Math.max(d.convictions, d.adminPenalties, d.cvsaInspections, d.reportableCollisions))) * 1.22),
    25,
  );
  const yt2     = (v: number) => yAt(v, catMax, 0, CH2);
  const catStep = Math.ceil(catMax / 5);
  const catTicks = Array.from({ length: 6 }, (_, i) => i * catStep).filter(v => v <= catMax);

  // ── Chart 3: R-Factor + Event Counts bar combo ────────────────────────────────
  // (mirrors CVOR Chart 4: bars for events, line for R-Factor)
  const CH3    = 176;
  const VH3    = CH3 + pT + pB;
  const maxEv  = Math.max(...data.map(d => Math.max(d.convictions, d.cvsaInspections))) + 4;
  const yE     = (v: number) => yAt(v, maxEv, 0, CH3);
  const evTicks = [0, 5, 10, 15, 20, 25, 30].filter(v => v <= maxEv);
  const bw     = Math.max(9, Math.min(24, cW / n * 0.22));

  return (
    <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/80 bg-slate-50/75 px-6 py-4 flex-wrap">
        <div className="flex items-center gap-2.5 flex-wrap">
          <Activity size={14} className="text-slate-400"/>
          <span className="text-[17px] font-bold tracking-tight text-slate-800">NSC Alberta Performance History</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-mono text-slate-500">{n} pulls</span>
          <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-medium text-indigo-600">
            {shortLabel(first.pullDate)} → {shortLabel(last.pullDate)} · {n}mo
          </span>
          <span className="text-[10px] italic text-slate-400">Each pull = 24-month rolling window</span>
          {/* Status legend */}
          <div className="ml-2 flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1">
            {[
              { c: '#dc2626', label: 'Critical pull' },
              { c: '#d97706', label: 'Warning pull'  },
              { c: '#16a34a', label: 'Ok pull'        },
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
            {(['Monthly', 'Quarterly', 'All'] as Cadence[]).map(c => (
              <button key={c} onClick={() => setCadence(c)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors ${cadence === c ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">

        {/* ══ CHART 1: R-Factor History (Overall CVOR Rating equivalent) ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">R-Factor History (CVOR Risk Score)</span>
            {rfZones.map(z => (
              <div key={z.label} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm border" style={{ background: z.fill, borderColor: z.lc + '55' }}/>
                <span className="text-[10px] font-mono" style={{ color: z.lc }}>{z.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Lower is better · Alberta CVOR Risk Factor</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH1 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Zone bands */}
              {rfZones.map(z => {
                const clTo   = Math.min(z.to, rfMax);
                const clFrom = Math.max(z.from, rfMin);
                if (clTo <= clFrom) return null;
                const y1 = yt1(clTo);
                const y2 = yt1(clFrom);
                return (
                  <g key={z.label}>
                    <rect x={pL} y={y1} width={cW} height={y2-y1} fill={z.fill} opacity="0.40"/>
                    <text x={pL+10} y={(y1+y2)/2+4} fontSize="12" fill={z.lc} fontWeight="700" opacity="0.78">{z.label}</text>
                  </g>
                );
              })}

              {/* Y-grid */}
              {rfTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt1(v)} y2={yt1(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt1(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v.toFixed(3)}</text>
                </g>
              ))}

              {/* Threshold lines */}
              {[{ t: AB_RF_OK,   c: '#16a34a', lbl: `${AB_RF_OK.toFixed(3)} — Ok limit`       },
                { t: AB_RF_WARN, c: '#dc2626', lbl: `${AB_RF_WARN.toFixed(3)} — Critical limit` }].map(th => (
                <g key={th.t}>
                  <line x1={pL} x2={pL+cW} y1={yt1(th.t)} y2={yt1(th.t)} stroke={th.c} strokeWidth="1.5" strokeDasharray="6,3" opacity="0.90"/>
                  <text x={pL+cW+8} y={yt1(th.t)+3.5} fontSize="12" fontWeight="700" fill={th.c}>{th.lbl}</text>
                </g>
              ))}

              {/* Area + line */}
              <path d={mkArea(d => d.rFactor, rfMax, rfMin, CH1)} fill="#2563eb" opacity="0.08"/>
              <path d={mkPath(d => d.rFactor, rfMax, rfMin, CH1)} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>

              {/* Value label on last */}
              {(() => {
                const d  = data[n - 1];
                const cx = xAt(n - 1);
                const cy = yt1(d.rFactor);
                const col = rfColor(d.rFactor);
                return (
                  <text x={cx} y={cy - 14} textAnchor="middle" fontSize="11" fontWeight="bold"
                    fill={col} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d.rFactor.toFixed(3)}
                  </text>
                );
              })()}

              <XAxis chartH={CH1}/>

              {/* Dots — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const cy    = yt1(d.rFactor);
                const col   = rfColor(d.rFactor);
                const isHov = hovered?.chart === 'c1' && hovered.idx === i;
                const isSel = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c1', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <circle cx={cx} cy={cy} r="14" fill={col} opacity="0.12"/>}
                    <circle cx={cx} cy={cy} r={isHov || isSel ? 7 : i === n-1 ? 5.5 : 4}
                      fill={col} stroke="white" strokeWidth={isSel ? 3 : 1.5}
                      style={{ filter: isHov ? 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' : 'none' }}/>
                    <circle cx={cx} cy={cy} r="14" fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c1' && (() => {
                const d = data[hovered.idx];
                if (!d) return null;
                return <AbTip cx={xAt(hovered.idx)} cy={yt1(d.rFactor)} d={d} chart="rf" chartH={CH1}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 2: Category Events Over Time ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Category Events Over Time</span>
            {cats.map(c => (
              <div key={c.key} className="flex items-center gap-1.5">
                <div className="w-5 h-1 rounded" style={{ background: c.color }}/>
                <span className="text-[10px] font-medium text-slate-600">{c.label}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">24-month rolling window cumulative counts</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH2 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH2}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid */}
              {catTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yt2(v)} y2={yt2(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yt2(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
                </g>
              ))}

              {/* Lines */}
              {cats.map(c => (
                <path key={c.key}
                  d={mkPath(d => d[c.key], catMax, 0, CH2)}
                  fill="none" stroke={c.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
              ))}

              {/* Value labels on last */}
              {cats.map(c => {
                const d  = data[n - 1];
                const cx = xAt(n - 1);
                const cy = yt2(d[c.key]);
                return (
                  <text key={c.key} x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="bold"
                    fill={c.color} fontFamily="monospace" style={{ pointerEvents: 'none' }}>
                    {d[c.key]}
                  </text>
                );
              })}

              <XAxis chartH={CH2}/>

              {/* Dots — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const isHov = hovered?.chart === 'c2' && hovered.idx === i;
                const isSel = selectedId === d.id;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c2', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {cats.map(c => (
                      <circle key={c.key} cx={cx} cy={yt2(d[c.key])} r={isHov || isSel ? 6 : i === n-1 ? 5 : 3.5}
                        fill={c.color} stroke="white" strokeWidth="1.5"
                        style={{ filter: isHov ? 'drop-shadow(0 0 3px rgba(0,0,0,0.25))' : 'none' }}/>
                    ))}
                    {isSel && <circle cx={cx} cy={yt2(Math.max(d.convictions, d.cvsaInspections))} r="16" fill="#6366f1" opacity="0.08"/>}
                    <rect x={cx - 12} y={pT} width={24} height={CH2} fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c2' && (() => {
                const d  = data[hovered.idx];
                if (!d) return null;
                const cy = yt2(Math.max(d.convictions, d.cvsaInspections));
                return <AbTip cx={xAt(hovered.idx)} cy={cy} d={d} chart="con" chartH={CH2}/>;
              })()}

            </svg>
          </div>
        </div>

        {/* ══ CHART 3: Event Counts & R-Factor per Pull ══ */}
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center gap-4 flex-wrap">
            <span className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-700">Event Counts &amp; R-Factor per Pull</span>
            {[
              { lbl: 'Convictions (bars)',        color: '#7c3aed', rect: true  },
              { lbl: 'CVSA Inspections (bars)',    color: '#3b82f6', rect: true  },
              { lbl: 'Reportable Collisions (bars)', color: '#dc2626', rect: true },
              { lbl: 'R-Factor (line)',            color: '#2563eb', rect: false },
            ].map(l => (
              <div key={l.lbl} className="flex items-center gap-1.5">
                {l.rect
                  ? <div className="w-3 h-3 rounded-sm border" style={{ background: l.color + '22', borderColor: l.color }}/>
                  : <div className="w-6 border-t-2 border-dashed" style={{ borderColor: l.color }}/>
                }
                <span className="text-[10px] text-slate-600">{l.lbl}</span>
              </div>
            ))}
            <span className="ml-auto text-[10px] italic text-slate-400">Bars = raw count · line = R-Factor score</span>
          </div>
          <div style={{ position: 'relative', width: '100%', paddingBottom: `${(VH3 / VW * 100).toFixed(2)}%` }}>
            <svg viewBox={`0 0 ${VW} ${VH3}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>

              {/* Y-grid (event count axis) */}
              {evTicks.map(v => (
                <g key={v}>
                  <line x1={pL} x2={pL+cW} y1={yE(v)} y2={yE(v)} stroke="#e2e8f0" strokeWidth="0.75"/>
                  <text x={pL-10} y={yE(v)+3.5} textAnchor="end" fontSize="11" fill="#94a3b8" fontFamily="monospace">{v}</text>
                </g>
              ))}

              {/* R-Factor line (scaled to event axis) */}
              <path
                d={mkPath(d => d.rFactor * (maxEv / rfMax), maxEv, 0, CH3)}
                fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6,3" opacity="0.80"/>

              {/* Bars — interactive */}
              {data.map((d, i) => {
                const cx    = xAt(i);
                const isHov = hovered?.chart === 'c3' && hovered.idx === i;
                const isSel = selectedId === d.id;
                const opa   = isHov || isSel ? 1 : 0.7;
                return (
                  <g key={d.id} style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHovered({ chart: 'c3', idx: i })}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleDotClick(d)}>
                    {(isHov || isSel) && <rect x={cx - bw * 2} y={pT} width={bw * 4} height={CH3} fill="#6366f1" opacity="0.05" rx="3"/>}
                    <rect x={cx - bw * 1.55} y={yE(d.convictions)} width={bw} height={pT + CH3 - yE(d.convictions)}
                      fill={isHov || isSel ? '#7c3aed' : '#7c3aed22'} stroke="#7c3aed" strokeWidth="1" rx="2" opacity={opa}/>
                    <rect x={cx - bw * 0.5}  y={yE(d.cvsaInspections)} width={bw} height={pT + CH3 - yE(d.cvsaInspections)}
                      fill={isHov || isSel ? '#3b82f6' : '#3b82f622'} stroke="#3b82f6" strokeWidth="1" rx="2" opacity={opa}/>
                    <rect x={cx + bw * 0.55} y={yE(d.reportableCollisions)} width={bw} height={pT + CH3 - yE(d.reportableCollisions)}
                      fill={isHov || isSel ? '#dc2626' : '#dc262622'} stroke="#dc2626" strokeWidth="1" rx="2" opacity={opa}/>
                    <text x={cx - bw * 1.05} y={yE(d.convictions) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#6d28d9" fontFamily="monospace">{d.convictions}</text>
                    <text x={cx + bw * 0.0}  y={yE(d.cvsaInspections) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1d4ed8" fontFamily="monospace">{d.cvsaInspections}</text>
                    <text x={cx + bw * 1.05} y={yE(d.reportableCollisions) - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#991b1b" fontFamily="monospace">{d.reportableCollisions}</text>
                    {/* Hit area */}
                    <rect x={cx - bw * 2} y={pT} width={bw * 4} height={CH3} fill="transparent"/>
                  </g>
                );
              })}

              {/* Tooltip */}
              {hovered?.chart === 'c3' && (() => {
                const d = data[hovered.idx];
                if (!d) return null;
                const cy = yE(Math.max(d.convictions, d.cvsaInspections));
                return <AbTip cx={xAt(hovered.idx)} cy={cy} d={d} chart="con" chartH={CH3}/>;
              })()}

              <XAxis chartH={CH3}/>

            </svg>
          </div>
        </div>

        {/* ══ PULL-BY-PULL DATA TABLE ══ */}
        {(() => {
          const tbFiltered = AB_PULL_DATA.filter(r =>
            r.pullDate.toLowerCase().includes(tbSearch.toLowerCase())    ||
            r.windowLabel.toLowerCase().includes(tbSearch.toLowerCase()) ||
            r.status.toLowerCase().includes(tbSearch.toLowerCase())
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
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{AB_PULL_DATA.length} pulls</span>
                <span className="text-[10px] text-slate-400">newest first · click row → inspection drill-down</span>
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
                      <th className="px-4 py-2.5 text-left   text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">24-Month Window</th>
                      <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-amber-500  uppercase tracking-wider whitespace-nowrap">Convictions</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-400  uppercase tracking-wider whitespace-nowrap">Admin Penalties</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-blue-500   uppercase tracking-wider whitespace-nowrap">CVSA Inspections</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-rose-400   uppercase tracking-wider whitespace-nowrap">Reportable Collisions</th>
                      <th className="px-4 py-2.5 text-right  text-[9px] font-bold text-slate-500  uppercase tracking-wider whitespace-nowrap">R-Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbVisible.map((r, idx) => {
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
                              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${abStBadgeCls(r.status)}`}>{r.status}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.convictions >= 16 ? '#dc2626' : r.convictions >= 12 ? '#d97706' : '#16a34a' }}>
                              {r.convictions}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.adminPenalties >= 3 ? '#dc2626' : r.adminPenalties >= 1 ? '#d97706' : '#16a34a' }}>
                              {r.adminPenalties}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.cvsaInspections}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.reportableCollisions >= 9 ? '#dc2626' : r.reportableCollisions >= 7 ? '#d97706' : '#16a34a' }}>
                              {r.reportableCollisions}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: abRfColor(r.rFactor) }}>
                              {r.rFactor.toFixed(3)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${r.id}-drill`}>
                              <td colSpan={8} className="p-4 bg-slate-50 border-b border-slate-100">
                                <AbPullDrillDown r={r}/>
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
