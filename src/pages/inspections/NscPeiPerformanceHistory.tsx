import { useState, Fragment } from 'react';
import { Activity, Search, Columns3, ChevronDown, ChevronRight } from 'lucide-react';
import { NscGenericPerformanceBlock } from './NscGenericPerformanceBlock';

// ─── Thresholds (PEI Schedule 3 for Fleet 19 · maxPts = 55) ──────────────────

const PEI_MAX        = 55;
const PEI_ADVISORY   = 14;   // >= Advisory (25%)
const PEI_WARNING    = 33;   // >= Warning  (60%)
const PEI_INTERVIEW  = 47;   // >= Interview (85%)
const PEI_SANCTION   = 55;   // >= Sanction (100%)

type PeiStatus = 'Safe' | 'Advisory' | 'Warning' | 'Interview' | 'Sanction';

function peiStatus(pts: number): PeiStatus {
  if (pts >= PEI_SANCTION)  return 'Sanction';
  if (pts >= PEI_INTERVIEW) return 'Interview';
  if (pts >= PEI_WARNING)   return 'Warning';
  if (pts >= PEI_ADVISORY)  return 'Advisory';
  return 'Safe';
}

const peiStColor = (s: PeiStatus) =>
  s === 'Sanction'  ? '#991b1b'
: s === 'Interview' ? '#dc2626'
: s === 'Warning'   ? '#ea580c'
: s === 'Advisory'  ? '#ca8a04'
:                     '#16a34a';

const peiStBadgeCls = (s: PeiStatus) =>
  s === 'Sanction'  ? 'bg-red-200 text-red-900 border-red-400'
: s === 'Interview' ? 'bg-red-100 text-red-800 border-red-300'
: s === 'Warning'   ? 'bg-orange-100 text-orange-800 border-orange-300'
: s === 'Advisory'  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
:                     'bg-emerald-100 text-emerald-700 border-emerald-300';

// ─── Pull data (15 monthly PEI pulls, newest first) ──────────────────────────

export interface PeiPullRow {
  id: string;
  pullDate: string;
  windowLabel: string;
  inspections: number;
  collisionPts: number;
  convictionPts: number;
  inspectionPts: number;
  totalPts: number;
  maxPts: number;
  pctOfMax: number;
  fleet: number;
  avgFleet: number;
}

function mkPull(id: string, pullDate: string, windowLabel: string, insp: number, coll: number, conv: number, insPts: number, fleet: number, avgFleet: number): PeiPullRow {
  const total = coll + conv + insPts;
  return {
    id, pullDate, windowLabel, inspections: insp,
    collisionPts: coll, convictionPts: conv, inspectionPts: insPts,
    totalPts: total, maxPts: PEI_MAX,
    pctOfMax: +((total / PEI_MAX) * 100).toFixed(1),
    fleet, avgFleet,
  };
}

export const PEI_PULL_DATA: PeiPullRow[] = [
  mkPull('2021-07', '14-Jul-2021', 'Jul 2020 → Jul 2021', 40, 8, 6, 9, 19, 19.0),
  mkPull('2021-06', '14-Jun-2021', 'Jun 2020 → Jun 2021', 39, 8, 6, 9, 19, 18.8),
  mkPull('2021-05', '14-May-2021', 'May 2020 → May 2021', 38, 8, 6, 8, 18, 18.5),
  mkPull('2021-04', '14-Apr-2021', 'Apr 2020 → Apr 2021', 37, 6, 6, 8, 18, 18.2),
  mkPull('2021-03', '14-Mar-2021', 'Mar 2020 → Mar 2021', 35, 6, 6, 7, 18, 18.0),
  mkPull('2021-02', '14-Feb-2021', 'Feb 2020 → Feb 2021', 34, 6, 3, 7, 17, 17.6),
  mkPull('2021-01', '14-Jan-2021', 'Jan 2020 → Jan 2021', 33, 6, 3, 7, 17, 17.4),
  mkPull('2020-12', '14-Dec-2020', 'Dec 2019 → Dec 2020', 31, 4, 3, 6, 17, 17.0),
  mkPull('2020-11', '14-Nov-2020', 'Nov 2019 → Nov 2020', 30, 4, 3, 6, 16, 16.8),
  mkPull('2020-10', '14-Oct-2020', 'Oct 2019 → Oct 2020', 28, 4, 3, 5, 16, 16.5),
  mkPull('2020-09', '14-Sep-2020', 'Sep 2019 → Sep 2020', 26, 2, 3, 5, 16, 16.2),
  mkPull('2020-08', '14-Aug-2020', 'Aug 2019 → Aug 2020', 24, 2, 0, 4, 15, 15.9),
  mkPull('2020-07', '14-Jul-2020', 'Jul 2019 → Jul 2020', 22, 2, 0, 4, 15, 15.5),
  mkPull('2020-06', '14-Jun-2020', 'Jun 2019 → Jun 2020', 20, 0, 0, 3, 15, 15.2),
  mkPull('2020-05', '14-May-2020', 'May 2019 → May 2020', 18, 0, 0, 3, 14, 15.0),
];

// ─── Shared SVG-chart helpers ────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-600">
      <span className="w-2 h-2 rounded-full" style={{ background: color }}/>
      {label}
    </span>
  );
}

// ─── Profile Score History (line chart, lower is better) ─────────────────────

function ProfileScoreHistoryChart({ data }: { data: PeiPullRow[] }) {
  const W = 920, H = 260, P = { t: 30, r: 20, b: 40, l: 50 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pulls = [...data].reverse();
  const xs = (i: number) => P.l + (pulls.length > 1 ? (i / (pulls.length - 1)) * iw : iw / 2);
  const maxY = Math.max(PEI_SANCTION, ...pulls.map(p => p.totalPts)) + 5;
  const ys = (v: number) => P.t + ih - (v / maxY) * ih;

  const points = pulls.map((p, i) => `${xs(i)},${ys(p.totalPts)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-[920px]">
        {/* Zone bands */}
        <rect x={P.l} y={ys(PEI_WARNING)}   width={iw} height={ys(0) - ys(PEI_WARNING)}   fill="#ecfdf5" />
        <rect x={P.l} y={ys(PEI_INTERVIEW)} width={iw} height={ys(PEI_WARNING) - ys(PEI_INTERVIEW)} fill="#fefce8" />
        <rect x={P.l} y={ys(PEI_SANCTION)}  width={iw} height={ys(PEI_INTERVIEW) - ys(PEI_SANCTION)} fill="#fff7ed" />
        <rect x={P.l} y={P.t}                width={iw} height={ys(PEI_SANCTION) - P.t}             fill="#fef2f2" />

        {/* Threshold lines */}
        {[
          { v: PEI_ADVISORY,  color: '#ca8a04', label: `${PEI_ADVISORY} — Advisory` },
          { v: PEI_WARNING,   color: '#ea580c', label: `${PEI_WARNING} — Warning` },
          { v: PEI_INTERVIEW, color: '#dc2626', label: `${PEI_INTERVIEW} — Interview` },
          { v: PEI_SANCTION,  color: '#991b1b', label: `${PEI_SANCTION} — Sanction` },
        ].map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={P.l + iw} y1={ys(t.v)} y2={ys(t.v)} stroke={t.color} strokeDasharray="4 4" strokeWidth={1}/>
            <text x={P.l + iw - 4} y={ys(t.v) - 4} fontSize={9} textAnchor="end" fill={t.color}>{t.label}</text>
          </g>
        ))}

        {/* Y axis labels */}
        {[0, 14, 33, 47, 55].map(v => (
          <text key={v} x={P.l - 8} y={ys(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
        ))}

        {/* X axis labels */}
        {pulls.map((p, i) => (
          <text
            key={p.id}
            x={xs(i)} y={P.t + ih + 14}
            fontSize={9} textAnchor="middle" fill="#64748b"
            transform={`rotate(-35 ${xs(i)} ${P.t + ih + 14})`}
          >{p.pullDate.slice(0, 6)}</text>
        ))}

        {/* Line + points */}
        <polyline fill="none" stroke="#16a34a" strokeWidth={2} points={points} />
        {pulls.map((p, i) => {
          const st = peiStatus(p.totalPts);
          return (
            <g key={p.id}>
              <circle cx={xs(i)} cy={ys(p.totalPts)} r={4} fill={peiStColor(st)} />
              {(i === pulls.length - 1 || i === 0) && (
                <text x={xs(i) + 6} y={ys(p.totalPts) - 6} fontSize={10} fill={peiStColor(st)} fontWeight="bold">{p.totalPts}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Category Scores Over Time (3-line chart) ────────────────────────────────

function CategoryScoresChart({ data }: { data: PeiPullRow[] }) {
  const W = 920, H = 220, P = { t: 20, r: 20, b: 40, l: 50 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pulls = [...data].reverse();
  const xs = (i: number) => P.l + (pulls.length > 1 ? (i / (pulls.length - 1)) * iw : iw / 2);
  const maxY = Math.max(15, ...pulls.flatMap(p => [p.collisionPts, p.convictionPts, p.inspectionPts]));
  const ys = (v: number) => P.t + ih - (v / maxY) * ih;

  const series = [
    { key: 'collisionPts',  color: '#ef4444', label: 'Collision' },
    { key: 'convictionPts', color: '#d97706', label: 'Conviction' },
    { key: 'inspectionPts', color: '#3b82f6', label: 'Inspection' },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-[920px]">
        {/* Y-axis ticks */}
        {[0, 5, 10, 15].filter(v => v <= maxY).map(v => (
          <g key={v}>
            <line x1={P.l} x2={P.l + iw} y1={ys(v)} y2={ys(v)} stroke="#e2e8f0" strokeDasharray="2 2"/>
            <text x={P.l - 8} y={ys(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
          </g>
        ))}

        {/* X labels */}
        {pulls.map((p, i) => (
          <text
            key={p.id}
            x={xs(i)} y={P.t + ih + 14}
            fontSize={9} textAnchor="middle" fill="#64748b"
            transform={`rotate(-35 ${xs(i)} ${P.t + ih + 14})`}
          >{p.pullDate.slice(0, 6)}</text>
        ))}

        {/* Lines */}
        {series.map(s => {
          const pts = pulls.map((p, i) => `${xs(i)},${ys(p[s.key])}`).join(' ');
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth={2} points={pts} />
              {pulls.map((p, i) => (
                <circle key={p.id} cx={xs(i)} cy={ys(p[s.key])} r={3} fill={s.color} />
              ))}
              <text x={P.l + iw + 4} y={ys(pulls[pulls.length - 1][s.key]) + 3} fontSize={10} fill={s.color} fontWeight="bold">
                {pulls[pulls.length - 1][s.key]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Fleet Activity (bar + 2 lines) ──────────────────────────────────────────

function FleetActivityChart({ data }: { data: PeiPullRow[] }) {
  const W = 920, H = 200, P = { t: 20, r: 20, b: 40, l: 50 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pulls = [...data].reverse();
  const xs = (i: number) => P.l + (pulls.length > 1 ? (i / (pulls.length - 1)) * iw : iw / 2);
  const maxY = Math.max(25, ...pulls.map(p => Math.max(p.fleet, p.avgFleet)));
  const ys = (v: number) => P.t + ih - (v / maxY) * ih;
  const barW = Math.max(8, iw / pulls.length - 6);

  const fleetLine   = pulls.map((p, i) => `${xs(i)},${ys(p.fleet)}`).join(' ');
  const avgLine     = pulls.map((p, i) => `${xs(i)},${ys(p.avgFleet)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-[920px]">
        {/* Bars */}
        {pulls.map((p, i) => (
          <rect
            key={p.id}
            x={xs(i) - barW / 2} y={ys(p.fleet)}
            width={barW} height={P.t + ih - ys(p.fleet)}
            fill="#c7d2fe" opacity={0.7}
          />
        ))}

        {/* Y axis */}
        {[0, 10, 20, 30].filter(v => v <= maxY).map(v => (
          <g key={v}>
            <line x1={P.l} x2={P.l + iw} y1={ys(v)} y2={ys(v)} stroke="#e2e8f0" strokeDasharray="2 2"/>
            <text x={P.l - 8} y={ys(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
          </g>
        ))}

        {/* X labels */}
        {pulls.map((p, i) => (
          <text
            key={p.id}
            x={xs(i)} y={P.t + ih + 14}
            fontSize={9} textAnchor="middle" fill="#64748b"
            transform={`rotate(-35 ${xs(i)} ${P.t + ih + 14})`}
          >{p.pullDate.slice(0, 6)}</text>
        ))}

        {/* Lines */}
        <polyline fill="none" stroke="#16a34a" strokeDasharray="5 3" strokeWidth={2} points={fleetLine} />
        <polyline fill="none" stroke="#7c3aed" strokeDasharray="5 3" strokeWidth={2} points={avgLine} />

        {/* End labels */}
        <text x={P.l + iw + 4} y={ys(pulls[pulls.length - 1].fleet) + 3} fontSize={10} fill="#16a34a" fontWeight="bold">{pulls[pulls.length - 1].fleet}</text>
      </svg>
    </div>
  );
}

// ─── Pull-by-Pull Data table with drill-down ─────────────────────────────────

function PeiPullByPullTable({ data }: { data: PeiPullRow[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const PAGE = 10;

  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    return !q
      || r.pullDate.toLowerCase().includes(q)
      || r.windowLabel.toLowerCase().includes(q)
      || peiStatus(r.totalPts).toLowerCase().includes(q);
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = filtered.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Pull-by-Pull Data</span>
        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{data.length} pulls</span>
        <span className="text-[10px] text-slate-400">newest first &middot; click row &rarr; individual NSC performance</span>
      </div>

      {/* Search + controls */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search date, window, or status…"
            className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <span className="text-[10px] text-slate-500 whitespace-nowrap ml-auto">{rows.length} of {total}</span>
        <button className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
          <Columns3 size={12}/>Columns
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Pull Date &darr;</th>
              <th className="px-4 py-2.5 text-left  text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">12-Month Window</th>
              <th className="px-4 py-2.5 text-center text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Fleet</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Avg Fleet</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-red-400    uppercase tracking-wider whitespace-nowrap">Coll Pts</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-amber-500  uppercase tracking-wider whitespace-nowrap">Conv Pts</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-blue-500   uppercase tracking-wider whitespace-nowrap">Insp Pts</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500  uppercase tracking-wider whitespace-nowrap">Total</th>
              <th className="px-4 py-2.5 text-right text-[9px] font-bold text-slate-500  uppercase tracking-wider whitespace-nowrap">% of Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const st = peiStatus(r.totalPts);
              const isLatest    = page === 1 && idx === 0 && !search;
              const isExpanded  = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isLatest && (
                          <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Latest</span>
                        )}
                        <span className="font-semibold text-slate-800">{r.pullDate}</span>
                        {isExpanded ? <ChevronDown size={12} className="text-slate-400"/> : <ChevronRight size={12} className="text-slate-400"/>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700">{r.windowLabel}</div>
                      <div className="text-[10px] text-slate-400">{r.inspections} inspection{r.inspections !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${peiStBadgeCls(st)}`}>{st}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.fleet}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">{r.avgFleet.toFixed(1)}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.collisionPts > 0 ? 'text-red-600' : 'text-slate-300'}`}>{r.collisionPts}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.convictionPts > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{r.convictionPts}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.inspectionPts > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{r.inspectionPts}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-black" style={{ color: peiStColor(st) }}>{r.totalPts}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-600">{r.pctOfMax}%</td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10} className="px-4 py-4 bg-slate-50/40 border-b border-slate-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                          Individual NSC Performance &middot; {r.pullDate}
                        </div>
                        <NscGenericPerformanceBlock
                          latestPullDate={r.pullDate}
                          collisionPoints={r.collisionPts}
                          convictionPoints={r.convictionPts}
                          inspectionPoints={r.inspectionPts}
                          maxPoints={r.maxPts}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[10px] text-slate-500">
          {total === 0 ? 0 : (page - 1) * PAGE + 1}&ndash;{Math.min(page * PAGE, total)} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50 text-slate-600">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NscPeiPerformanceHistory() {
  const [cadence, setCadence] = useState<'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All'>('All');
  const filtered = cadence === 'All' ? PEI_PULL_DATA
    : cadence === 'Quarterly'   ? PEI_PULL_DATA.filter((_, i) => i % 3 === 0)
    : cadence === 'Semi-Annual' ? PEI_PULL_DATA.filter((_, i) => i % 6 === 0)
    : cadence === 'Annual'      ? PEI_PULL_DATA.filter((_, i) => i % 12 === 0)
    : PEI_PULL_DATA;

  const pulls = filtered;
  const latest = pulls[0];
  const oldest = pulls[pulls.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <Activity size={14} className="text-slate-500"/>
        <span className="text-[13px] font-black text-slate-800">NSC PE Performance History</span>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{PEI_PULL_DATA.length} pulls</span>
        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
          {oldest.pullDate.slice(3)} &rarr; {latest.pullDate.slice(3)} &middot; {PEI_PULL_DATA.length}mo
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">Each pull = 12-month rolling window</span>
      </div>

      {/* Legend row */}
      <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-4 flex-wrap">
        <LegendDot color="#991b1b" label="Sanction pull" />
        <LegendDot color="#dc2626" label="Interview pull" />
        <LegendDot color="#ea580c" label="Warning pull" />
        <LegendDot color="#ca8a04" label="Advisory pull" />
        <LegendDot color="#16a34a" label="Safe pull" />
      </div>

      {/* Cadence */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cadence</span>
        <div className="flex items-center gap-1">
          {(['Monthly','Quarterly','Semi-Annual','Annual','All'] as const).map(c => (
            <button
              key={c}
              onClick={() => setCadence(c)}
              className={`px-3 py-1 text-[10px] font-semibold rounded-full border transition-colors ${
                cadence === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >{c}</button>
          ))}
        </div>
      </div>

      {/* Profile Score History */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">NSC Profile Score History</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Safe</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full">Advisory</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">Warning</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">Interview</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-red-200 text-red-900 border border-red-300 px-1.5 py-0.5 rounded-full">Sanction</span>
          <span className="text-[10px] text-slate-400 ml-auto italic">Lower is better &middot; PE NSC Profile Score (0&ndash;{PEI_MAX})</span>
        </div>
        <ProfileScoreHistoryChart data={pulls} />
      </div>

      {/* Category Scores Over Time */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Category Scores Over Time</span>
          <LegendDot color="#ef4444" label="Collision" />
          <LegendDot color="#d97706" label="Conviction" />
          <LegendDot color="#3b82f6" label="Inspection" />
          <span className="text-[10px] text-slate-400 ml-auto italic">Point accumulation per category</span>
        </div>
        <CategoryScoresChart data={pulls} />
      </div>

      {/* Fleet Activity */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Fleet Activity</span>
          <LegendDot color="#c7d2fe" label="Active Fleet (bars)" />
          <LegendDot color="#16a34a" label="Fleet (line)" />
          <LegendDot color="#7c3aed" label="Avg Fleet Size (line)" />
          <span className="text-[10px] text-slate-400 ml-auto italic">Licensed vehicle trend</span>
        </div>
        <FleetActivityChart data={pulls} />
      </div>

      {/* Pull-by-Pull Data */}
      <div className="p-5">
        <PeiPullByPullTable data={pulls} />
      </div>
    </div>
  );
}
