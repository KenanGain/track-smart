import { useEffect, useRef, useState, Fragment } from 'react';
import { Activity, Search, Columns, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { NscNsPerformanceBlock } from './NscNsPerformanceBlock';

// ─── NS Thresholds (matches NscNsPerformanceCard) ────────────────────────────

const NS_L1 = 39.7531;  // Low → Moderate
const NS_L2 = 45.9602;  // Moderate → High
const NS_L3 = 60.1836;  // High → Critical

type NsStatus = 'Low' | 'Moderate' | 'High' | 'Critical';

function nsStatus(pts: number): NsStatus {
  if (pts >= NS_L3) return 'Critical';
  if (pts >= NS_L2) return 'High';
  if (pts >= NS_L1) return 'Moderate';
  return 'Low';
}

const nsStColor = (s: NsStatus) =>
  s === 'Critical' ? '#dc2626'
: s === 'High'     ? '#ea580c'
: s === 'Moderate' ? '#ca8a04'
:                    '#16a34a';

const nsStBadgeCls = (s: NsStatus) =>
  s === 'Critical' ? 'bg-red-100    text-red-800    border-red-300'
: s === 'High'     ? 'bg-orange-100 text-orange-800 border-orange-300'
: s === 'Moderate' ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
:                    'bg-emerald-100 text-emerald-700 border-emerald-300';

// ─── Pull data (15 monthly NS pulls, newest first) ───────────────────────────

export interface NsPullRow {
  id: string;
  pullDate: string;
  windowLabel: string;
  inspections: number;
  convictionScore: number;
  inspectionScore: number;
  collisionScore: number;
  totalScore: number;
  pctOfLevel3: number;
  fleet: number;
  avgFleet: number;
}

function mkPull(id: string, pullDate: string, windowLabel: string, insp: number, conv: number, inspSc: number, coll: number, fleet: number, avgFleet: number): NsPullRow {
  const total = +(conv + inspSc + coll).toFixed(4);
  return {
    id, pullDate, windowLabel, inspections: insp,
    convictionScore: conv, inspectionScore: inspSc, collisionScore: coll,
    totalScore: total,
    pctOfLevel3: +((total / NS_L3) * 100).toFixed(1),
    fleet, avgFleet,
  };
}

export const NS_PULL_DATA: NsPullRow[] = [
  mkPull('2022-08', '19-Aug-2022', 'Aug 2021 → Aug 2022', 22, 6.2510, 13.4179, 0.0000, 14, 14.79),
  mkPull('2022-07', '19-Jul-2022', 'Jul 2021 → Jul 2022', 21, 6.2510, 12.1400, 0.0000, 14, 14.62),
  mkPull('2022-06', '19-Jun-2022', 'Jun 2021 → Jun 2022', 20, 6.2510, 11.8600, 0.0000, 14, 14.45),
  mkPull('2022-05', '19-May-2022', 'May 2021 → May 2022', 19, 6.2510, 11.2300, 0.0000, 14, 14.30),
  mkPull('2022-04', '19-Apr-2022', 'Apr 2021 → Apr 2022', 18, 3.1250, 10.5900, 0.0000, 13, 14.10),
  mkPull('2022-03', '19-Mar-2022', 'Mar 2021 → Mar 2022', 17, 3.1250, 10.1200, 0.0000, 13, 13.90),
  mkPull('2022-02', '19-Feb-2022', 'Feb 2021 → Feb 2022', 16, 3.1250, 9.4700,  0.0000, 13, 13.72),
  mkPull('2022-01', '19-Jan-2022', 'Jan 2021 → Jan 2022', 15, 3.1250, 9.0100,  0.0000, 13, 13.50),
  mkPull('2021-12', '19-Dec-2021', 'Dec 2020 → Dec 2021', 14, 3.1250, 8.3400,  0.0000, 12, 13.25),
  mkPull('2021-11', '19-Nov-2021', 'Nov 2020 → Nov 2021', 13, 3.1250, 7.8800,  0.0000, 12, 13.00),
  mkPull('2021-10', '19-Oct-2021', 'Oct 2020 → Oct 2021', 12, 0.0000, 7.2200,  0.0000, 12, 12.80),
  mkPull('2021-09', '19-Sep-2021', 'Sep 2020 → Sep 2021', 11, 0.0000, 6.5400,  0.0000, 12, 12.55),
  mkPull('2021-08', '19-Aug-2021', 'Aug 2020 → Aug 2021', 10, 0.0000, 5.8700,  0.0000, 11, 12.30),
  mkPull('2021-07', '19-Jul-2021', 'Jul 2020 → Jul 2021',  9, 0.0000, 5.1100,  0.0000, 11, 12.00),
  mkPull('2021-06', '19-Jun-2021', 'Jun 2020 → Jun 2021',  8, 0.0000, 4.3500,  0.0000, 11, 11.75),
];

// ─── Shared helpers ──────────────────────────────────────────────────────────

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-600">
      <span className="w-2 h-2 rounded-full" style={{ background: color }}/>
      {label}
    </span>
  );
}

// ─── Profile Score History chart (line chart, lower is better) ───────────────

function NsProfileScoreHistoryChart({ data }: { data: NsPullRow[] }) {
  const W = 920, H = 260, P = { t: 30, r: 20, b: 40, l: 50 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pulls = [...data].reverse();
  const xs = (i: number) => P.l + (pulls.length > 1 ? (i / (pulls.length - 1)) * iw : iw / 2);
  const maxY = Math.max(NS_L3 * 1.1, ...pulls.map(p => p.totalScore));
  const ys = (v: number) => P.t + ih - (v / maxY) * ih;

  const points = pulls.map((p, i) => `${xs(i)},${ys(p.totalScore)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-[920px]">
        {/* Zone bands */}
        <rect x={P.l} y={ys(NS_L1)} width={iw} height={ys(0)  - ys(NS_L1)} fill="#ecfdf5" />
        <rect x={P.l} y={ys(NS_L2)} width={iw} height={ys(NS_L1) - ys(NS_L2)} fill="#fefce8" />
        <rect x={P.l} y={ys(NS_L3)} width={iw} height={ys(NS_L2) - ys(NS_L3)} fill="#fff7ed" />
        <rect x={P.l} y={P.t}        width={iw} height={ys(NS_L3) - P.t}      fill="#fef2f2" />

        {/* Threshold lines */}
        {[
          { v: NS_L1, color: '#ca8a04', label: `${NS_L1.toFixed(2)} — L1 (Moderate)` },
          { v: NS_L2, color: '#ea580c', label: `${NS_L2.toFixed(2)} — L2 (High)` },
          { v: NS_L3, color: '#dc2626', label: `${NS_L3.toFixed(2)} — L3 (Critical)` },
        ].map((t, i) => (
          <g key={i}>
            <line x1={P.l} x2={P.l + iw} y1={ys(t.v)} y2={ys(t.v)} stroke={t.color} strokeDasharray="4 4" strokeWidth={1}/>
            <text x={P.l + iw - 4} y={ys(t.v) - 4} fontSize={9} textAnchor="end" fill={t.color}>{t.label}</text>
          </g>
        ))}

        {/* Y axis labels */}
        {[0, 20, 40, 60].map(v => (
          <text key={v} x={P.l - 8} y={ys(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
        ))}

        {/* X axis labels */}
        {pulls.map((p, i) => (
          <text
            key={p.id}
            x={xs(i)} y={P.t + ih + 14}
            fontSize={9} textAnchor="middle" fill="#64748b"
            transform={`rotate(-35 ${xs(i)} ${P.t + ih + 14})`}
          >{p.pullDate.slice(3)}</text>
        ))}

        {/* Line + points */}
        <polyline fill="none" stroke="#16a34a" strokeWidth={2} points={points} />
        {pulls.map((p, i) => {
          const st = nsStatus(p.totalScore);
          return (
            <g key={p.id}>
              <circle cx={xs(i)} cy={ys(p.totalScore)} r={4} fill={nsStColor(st)} />
              {(i === pulls.length - 1 || i === 0) && (
                <text x={xs(i) + 6} y={ys(p.totalScore) - 6} fontSize={10} fill={nsStColor(st)} fontWeight="bold">{p.totalScore.toFixed(2)}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Category Scores Over Time (3-line chart) ────────────────────────────────

function NsCategoryScoresChart({ data }: { data: NsPullRow[] }) {
  const W = 920, H = 220, P = { t: 20, r: 20, b: 40, l: 50 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pulls = [...data].reverse();
  const xs = (i: number) => P.l + (pulls.length > 1 ? (i / (pulls.length - 1)) * iw : iw / 2);
  const maxY = Math.max(16, ...pulls.flatMap(p => [p.convictionScore, p.inspectionScore, p.collisionScore]));
  const ys = (v: number) => P.t + ih - (v / maxY) * ih;

  const series = [
    { key: 'convictionScore', color: '#d97706', label: 'Conviction' },
    { key: 'inspectionScore', color: '#3b82f6', label: 'Inspection' },
    { key: 'collisionScore',  color: '#ef4444', label: 'Collision' },
  ] as const;

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-[920px]">
        {[0, 5, 10, 15].filter(v => v <= maxY).map(v => (
          <g key={v}>
            <line x1={P.l} x2={P.l + iw} y1={ys(v)} y2={ys(v)} stroke="#e2e8f0" strokeDasharray="2 2"/>
            <text x={P.l - 8} y={ys(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
          </g>
        ))}

        {pulls.map((p, i) => (
          <text
            key={p.id}
            x={xs(i)} y={P.t + ih + 14}
            fontSize={9} textAnchor="middle" fill="#64748b"
            transform={`rotate(-35 ${xs(i)} ${P.t + ih + 14})`}
          >{p.pullDate.slice(3)}</text>
        ))}

        {series.map(s => {
          const pts = pulls.map((p, i) => `${xs(i)},${ys(p[s.key])}`).join(' ');
          return (
            <g key={s.key}>
              <polyline fill="none" stroke={s.color} strokeWidth={2} points={pts} />
              {pulls.map((p, i) => (
                <circle key={p.id} cx={xs(i)} cy={ys(p[s.key])} r={3} fill={s.color} />
              ))}
              <text x={P.l + iw + 4} y={ys(pulls[pulls.length - 1][s.key]) + 3} fontSize={10} fill={s.color} fontWeight="bold">
                {pulls[pulls.length - 1][s.key].toFixed(2)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Fleet Activity ──────────────────────────────────────────────────────────

function NsFleetActivityChart({ data }: { data: NsPullRow[] }) {
  const W = 920, H = 200, P = { t: 20, r: 20, b: 40, l: 50 };
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const pulls = [...data].reverse();
  const xs = (i: number) => P.l + (pulls.length > 1 ? (i / (pulls.length - 1)) * iw : iw / 2);
  const maxY = Math.max(20, ...pulls.map(p => Math.max(p.fleet, p.avgFleet)));
  const ys = (v: number) => P.t + ih - (v / maxY) * ih;
  const barW = Math.max(8, iw / pulls.length - 6);

  const fleetLine   = pulls.map((p, i) => `${xs(i)},${ys(p.fleet)}`).join(' ');
  const avgLine     = pulls.map((p, i) => `${xs(i)},${ys(p.avgFleet)}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H} className="min-w-[920px]">
        {pulls.map((p, i) => (
          <rect
            key={p.id}
            x={xs(i) - barW / 2} y={ys(p.fleet)}
            width={barW} height={P.t + ih - ys(p.fleet)}
            fill="#c7d2fe" opacity={0.7}
          />
        ))}

        {[0, 5, 10, 15, 20].filter(v => v <= maxY).map(v => (
          <g key={v}>
            <line x1={P.l} x2={P.l + iw} y1={ys(v)} y2={ys(v)} stroke="#e2e8f0" strokeDasharray="2 2"/>
            <text x={P.l - 8} y={ys(v) + 3} fontSize={9} textAnchor="end" fill="#64748b">{v}</text>
          </g>
        ))}

        {pulls.map((p, i) => (
          <text
            key={p.id}
            x={xs(i)} y={P.t + ih + 14}
            fontSize={9} textAnchor="middle" fill="#64748b"
            transform={`rotate(-35 ${xs(i)} ${P.t + ih + 14})`}
          >{p.pullDate.slice(3)}</text>
        ))}

        <polyline fill="none" stroke="#16a34a" strokeDasharray="5 3" strokeWidth={2} points={fleetLine} />
        <polyline fill="none" stroke="#7c3aed" strokeDasharray="5 3" strokeWidth={2} points={avgLine} />

        <text x={P.l + iw + 4} y={ys(pulls[pulls.length - 1].fleet) + 3} fontSize={10} fill="#16a34a" fontWeight="bold">{pulls[pulls.length - 1].fleet}</text>
      </svg>
    </div>
  );
}

// ─── Pull-by-Pull Data table with drill-down ─────────────────────────────────

const ALL_NS_COLS = ['pullDate','windowLabel','status','fleet','avgFleet','convictionScore','inspectionScore','collisionScore','totalScore','pctOfLevel3'] as const;
type NsColKey = typeof ALL_NS_COLS[number];

function NsPullByPullTable({ data }: { data: NsPullRow[] }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | NsStatus>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [activeDropdown, setActiveDropdown] = useState<null | 'status' | 'columns'>(null);
  const [colVis, setColVis] = useState<Record<NsColKey, boolean>>({
    pullDate: true, windowLabel: true, status: true, fleet: true, avgFleet: true,
    convictionScore: true, inspectionScore: true, collisionScore: true, totalScore: true, pctOfLevel3: true,
  });
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setActiveDropdown(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  const PAGE = 10;

  const resetFilters = () => {
    setSearch(''); setStatusFilter('All'); setDateFrom(''); setDateTo(''); setPage(1);
  };

  const pullDateToIso = (s: string) => {
    const m = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m) return '';
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mm = (months.indexOf(m[2]) + 1).toString().padStart(2, '0');
    return `${m[3]}-${mm}-${m[1]}`;
  };

  const filtered = data.filter(r => {
    const q = search.toLowerCase();
    if (q && !(
      r.pullDate.toLowerCase().includes(q)
      || r.windowLabel.toLowerCase().includes(q)
      || nsStatus(r.totalScore).toLowerCase().includes(q)
    )) return false;
    if (statusFilter !== 'All' && nsStatus(r.totalScore) !== statusFilter) return false;
    const iso = pullDateToIso(r.pullDate);
    if (dateFrom && iso < dateFrom) return false;
    if (dateTo && iso > dateTo) return false;
    return true;
  });
  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const rows  = filtered.slice((page - 1) * PAGE, page * PAGE);

  const colLabel: Record<NsColKey, string> = {
    pullDate: 'Pull Date', windowLabel: '12-Month Window', status: 'Status',
    fleet: 'Fleet', avgFleet: 'Avg Fleet',
    convictionScore: 'Conviction', inspectionScore: 'Inspection', collisionScore: 'Collision',
    totalScore: 'Total', pctOfLevel3: '% of L3',
  };
  const visible = (k: NsColKey) => colVis[k];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm" ref={dropdownRef}>
      {/* Filters & Search Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3">

          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
            <span className="text-gray-400">-</span>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar size={16} className="text-gray-400" />
              </div>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          <div className="relative z-50">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
              className={`flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm font-medium text-gray-500 hover:border-blue-600 focus:outline-none transition-all shadow-sm ${activeDropdown === 'status' ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-gray-200'}`}
            >
              <span>Status</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-gray-100 rounded text-gray-700 min-w-[36px] text-center">
                {statusFilter}
              </span>
              <ChevronDown size={18} className="text-gray-400" />
            </button>
            {activeDropdown === 'status' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-60 overflow-y-auto">
                {(['All','Low','Moderate','High','Critical'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setActiveDropdown(null); setPage(1); }}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 ${statusFilter === s ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
                  >{s}</button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setActiveDropdown(activeDropdown === 'columns' ? null : 'columns')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-500 hover:border-blue-600 focus:outline-none transition-all shadow-sm"
            >
              <Columns size={18} />
              <span>Columns</span>
              <ChevronDown size={18} className="text-gray-400" />
            </button>
            {activeDropdown === 'columns' && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-20 max-h-60 overflow-y-auto">
                {ALL_NS_COLS.map(col => (
                  <label key={col} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={colVis[col]}
                      onChange={e => setColVis(prev => ({ ...prev, [col]: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-3 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">{colLabel[col]}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>

          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
          >Reset filters</button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 sm:text-sm transition-colors shadow-sm"
              placeholder="Search pulls, windows, or status..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap hidden lg:block border-l border-gray-200 pl-4">
            <span className="font-semibold text-gray-900">{total}</span> Records Found
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {visible('pullDate')        && <th className="px-6 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Pull Date &darr;</th>}
              {visible('windowLabel')     && <th className="px-6 py-3 text-left   text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">12-Month Window</th>}
              {visible('status')          && <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>}
              {visible('fleet')           && <th className="px-6 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Fleet</th>}
              {visible('avgFleet')        && <th className="px-6 py-3 text-right  text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Avg Fleet</th>}
              {visible('convictionScore') && <th className="px-6 py-3 text-right  text-xs font-semibold text-amber-500 uppercase tracking-wider whitespace-nowrap">Conviction</th>}
              {visible('inspectionScore') && <th className="px-6 py-3 text-right  text-xs font-semibold text-blue-500  uppercase tracking-wider whitespace-nowrap">Inspection</th>}
              {visible('collisionScore')  && <th className="px-6 py-3 text-right  text-xs font-semibold text-rose-400  uppercase tracking-wider whitespace-nowrap">Collision</th>}
              {visible('totalScore')      && <th className="px-6 py-3 text-right  text-xs font-semibold text-gray-700  uppercase tracking-wider whitespace-nowrap">Total</th>}
              {visible('pctOfLevel3')     && <th className="px-6 py-3 text-right  text-xs font-semibold text-gray-500  uppercase tracking-wider whitespace-nowrap">% of L3</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((r, idx) => {
              const st = nsStatus(r.totalScore);
              const isLatest    = page === 1 && idx === 0 && !search && statusFilter === 'All' && !dateFrom && !dateTo;
              const isExpanded  = expanded === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : r.id)}
                    className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}
                  >
                    {visible('pullDate') && (
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isLatest && (
                            <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Latest</span>
                          )}
                          <span className="text-sm font-semibold text-gray-900">{r.pullDate}</span>
                          {isExpanded ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                        </div>
                      </td>
                    )}
                    {visible('windowLabel') && (
                      <td className="px-6 py-3">
                        <div className="text-sm text-gray-700">{r.windowLabel}</div>
                        <div className="text-xs text-gray-400">{r.inspections} inspection{r.inspections !== 1 ? 's' : ''}</div>
                      </td>
                    )}
                    {visible('status') && (
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full border ${nsStBadgeCls(st)}`}>{st}</span>
                      </td>
                    )}
                    {visible('fleet')           && <td className="px-6 py-3 text-right text-sm font-mono text-gray-700 whitespace-nowrap">{r.fleet}</td>}
                    {visible('avgFleet')        && <td className="px-6 py-3 text-right text-sm font-mono text-gray-600 whitespace-nowrap">{r.avgFleet.toFixed(2)}</td>}
                    {visible('convictionScore') && <td className={`px-6 py-3 text-right text-sm font-mono font-bold whitespace-nowrap ${r.convictionScore > 0 ? 'text-amber-600' : 'text-gray-300'}`}>{r.convictionScore.toFixed(2)}</td>}
                    {visible('inspectionScore') && <td className={`px-6 py-3 text-right text-sm font-mono font-bold whitespace-nowrap ${r.inspectionScore > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{r.inspectionScore.toFixed(2)}</td>}
                    {visible('collisionScore')  && <td className={`px-6 py-3 text-right text-sm font-mono font-bold whitespace-nowrap ${r.collisionScore > 0 ? 'text-red-600' : 'text-gray-300'}`}>{r.collisionScore.toFixed(2)}</td>}
                    {visible('totalScore')      && <td className="px-6 py-3 text-right text-sm font-mono font-black whitespace-nowrap" style={{ color: nsStColor(st) }}>{r.totalScore.toFixed(2)}</td>}
                    {visible('pctOfLevel3')     && <td className="px-6 py-3 text-right text-sm font-mono text-gray-600 whitespace-nowrap">{r.pctOfLevel3.toFixed(1)}%</td>}
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={ALL_NS_COLS.filter(visible).length} className="px-6 py-4 bg-slate-50/40 border-b border-gray-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                          Individual NSC Performance &middot; {r.pullDate}
                        </div>
                        <NscNsPerformanceBlock latestPullDate={r.pullDate} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={ALL_NS_COLS.filter(visible).length} className="px-6 py-8 text-center text-sm text-gray-400 italic">
                  No pulls match your filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between flex-wrap gap-3">
        <span className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-900">{total === 0 ? 0 : (page - 1) * PAGE + 1}</span>&ndash;<span className="font-semibold text-gray-900">{Math.min(page * PAGE, total)}</span> of <span className="font-semibold text-gray-900">{total}</span>
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-600 shadow-sm">&#8249;</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-sm border rounded-lg font-semibold shadow-sm ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}>{p}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 text-gray-600 shadow-sm">&#8250;</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NscNsPerformanceHistory() {
  const [cadence, setCadence] = useState<'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'All'>('All');
  const filtered = cadence === 'All' ? NS_PULL_DATA
    : cadence === 'Quarterly'   ? NS_PULL_DATA.filter((_, i) => i % 3 === 0)
    : cadence === 'Semi-Annual' ? NS_PULL_DATA.filter((_, i) => i % 6 === 0)
    : cadence === 'Annual'      ? NS_PULL_DATA.filter((_, i) => i % 12 === 0)
    : NS_PULL_DATA;

  const pulls = filtered;
  const latest = pulls[0];
  const oldest = pulls[pulls.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <Activity size={14} className="text-slate-500"/>
        <span className="text-[13px] font-black text-slate-800">NSC Nova Scotia Performance History</span>
        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{NS_PULL_DATA.length} pulls</span>
        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
          {oldest.pullDate.slice(3)} &rarr; {latest.pullDate.slice(3)} &middot; {NS_PULL_DATA.length}mo
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">Each pull = 12-month rolling window</span>
      </div>

      {/* Legend row */}
      <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-4 flex-wrap">
        <LegendDot color="#dc2626" label="Critical pull" />
        <LegendDot color="#ea580c" label="High pull" />
        <LegendDot color="#ca8a04" label="Moderate pull" />
        <LegendDot color="#16a34a" label="Low pull" />
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
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">Low</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 px-1.5 py-0.5 rounded-full">Moderate</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">High</span>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full">Critical</span>
          <span className="text-[10px] text-slate-400 ml-auto italic">Lower is better &middot; NS Indexed Score (0&ndash;{NS_L3.toFixed(2)}+)</span>
        </div>
        <NsProfileScoreHistoryChart data={pulls} />
      </div>

      {/* Category Scores Over Time */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Category Scores Over Time</span>
          <LegendDot color="#d97706" label="Conviction" />
          <LegendDot color="#3b82f6" label="Inspection" />
          <LegendDot color="#ef4444" label="Collision" />
          <span className="text-[10px] text-slate-400 ml-auto italic">Component score accumulation per category</span>
        </div>
        <NsCategoryScoresChart data={pulls} />
      </div>

      {/* Fleet Activity */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Fleet Activity</span>
          <LegendDot color="#c7d2fe" label="Active Fleet (bars)" />
          <LegendDot color="#16a34a" label="Fleet (line)" />
          <LegendDot color="#7c3aed" label="Avg Daily Fleet (line)" />
          <span className="text-[10px] text-slate-400 ml-auto italic">Fleet trend over 15-month window</span>
        </div>
        <NsFleetActivityChart data={pulls} />
      </div>

      {/* Pull-by-Pull Data */}
      <div className="p-5">
        <NsPullByPullTable data={pulls} />
      </div>
    </div>
  );
}
