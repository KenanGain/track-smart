import { useState } from 'react';
import { Search, Columns3 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BcPullRow {
  id: string;
  pullDate: string;
  windowLabel: string;
  inspections: number;
  vehicleDays: number;
  monthlyActiveDays: number;
  avgFleet: number;
  contra: number;
  cvsa: number;
  acc: number;
  total: number;
}

// ─── Mock Data (15 monthly pulls, newest first) ────────────────────────────────

export const BC_PULL_DATA: BcPullRow[] = [
  { id:'2025-03', pullDate:'31-Mar-2025', windowLabel:'Apr 2024 → Mar 2025', inspections:13, vehicleDays:28308, monthlyActiveDays:2358, avgFleet:77.56, contra:0.30, cvsa:0.31, acc:0.00, total:0.61 },
  { id:'2025-02', pullDate:'28-Feb-2025', windowLabel:'Mar 2024 → Feb 2025', inspections:11, vehicleDays:27900, monthlyActiveDays:2325, avgFleet:76.20, contra:0.28, cvsa:0.29, acc:0.00, total:0.57 },
  { id:'2025-01', pullDate:'31-Jan-2025', windowLabel:'Feb 2024 → Jan 2025', inspections:10, vehicleDays:27540, monthlyActiveDays:2295, avgFleet:75.44, contra:0.32, cvsa:0.34, acc:0.00, total:0.66 },
  { id:'2024-12', pullDate:'31-Dec-2024', windowLabel:'Jan 2024 → Dec 2024', inspections:12, vehicleDays:27100, monthlyActiveDays:2258, avgFleet:74.97, contra:0.35, cvsa:0.30, acc:0.05, total:0.70 },
  { id:'2024-11', pullDate:'30-Nov-2024', windowLabel:'Dec 2023 → Nov 2024', inspections:11, vehicleDays:26800, monthlyActiveDays:2233, avgFleet:73.89, contra:0.31, cvsa:0.27, acc:0.00, total:0.58 },
  { id:'2024-10', pullDate:'31-Oct-2024', windowLabel:'Nov 2023 → Oct 2024', inspections:10, vehicleDays:26500, monthlyActiveDays:2208, avgFleet:72.60, contra:0.40, cvsa:0.35, acc:0.08, total:0.83 },
  { id:'2024-09', pullDate:'30-Sep-2024', windowLabel:'Oct 2023 → Sep 2024', inspections: 9, vehicleDays:26200, monthlyActiveDays:2183, avgFleet:71.84, contra:0.33, cvsa:0.32, acc:0.00, total:0.65 },
  { id:'2024-08', pullDate:'31-Aug-2024', windowLabel:'Sep 2023 → Aug 2024', inspections: 8, vehicleDays:25900, monthlyActiveDays:2158, avgFleet:70.55, contra:0.45, cvsa:0.41, acc:0.11, total:0.97 },
  { id:'2024-07', pullDate:'31-Jul-2024', windowLabel:'Aug 2023 → Jul 2024', inspections: 7, vehicleDays:25600, monthlyActiveDays:2133, avgFleet:69.04, contra:0.52, cvsa:0.48, acc:0.09, total:1.09 },
  { id:'2024-06', pullDate:'30-Jun-2024', windowLabel:'Jul 2023 → Jun 2024', inspections: 8, vehicleDays:25300, monthlyActiveDays:2108, avgFleet:68.22, contra:0.61, cvsa:0.55, acc:0.00, total:1.16 },
  { id:'2024-05', pullDate:'31-May-2024', windowLabel:'Jun 2023 → May 2024', inspections: 9, vehicleDays:25000, monthlyActiveDays:2083, avgFleet:67.82, contra:0.68, cvsa:0.63, acc:0.14, total:1.45 },
  { id:'2024-04', pullDate:'30-Apr-2024', windowLabel:'May 2023 → Apr 2024', inspections:10, vehicleDays:24700, monthlyActiveDays:2058, avgFleet:66.71, contra:0.82, cvsa:0.71, acc:0.05, total:1.58 },
  { id:'2024-03', pullDate:'31-Mar-2024', windowLabel:'Apr 2023 → Mar 2024', inspections:11, vehicleDays:24400, monthlyActiveDays:2033, avgFleet:65.88, contra:1.05, cvsa:0.85, acc:0.09, total:1.99 },
  { id:'2024-02', pullDate:'29-Feb-2024', windowLabel:'Mar 2023 → Feb 2024', inspections:12, vehicleDays:24100, monthlyActiveDays:2008, avgFleet:64.95, contra:1.24, cvsa:0.92, acc:0.00, total:2.16 },
  { id:'2024-01', pullDate:'31-Jan-2024', windowLabel:'Feb 2023 → Jan 2024', inspections:11, vehicleDays:23800, monthlyActiveDays:1983, avgFleet:63.97, contra:1.55, cvsa:1.02, acc:0.11, total:2.68 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type BcSt = 'Satisfactory' | 'Conditional' | 'Unsatisfactory';

function bcSt(total: number): BcSt {
  if (total >= 3.65) return 'Unsatisfactory';
  if (total >= 2.13) return 'Conditional';
  return 'Satisfactory';
}

const stColor   = (st: BcSt) => st === 'Unsatisfactory' ? '#dc2626' : st === 'Conditional' ? '#d97706' : '#16a34a';
const stBadgeCls = (st: BcSt) =>
  st === 'Unsatisfactory' ? 'bg-red-100 text-red-700 border-red-300'
: st === 'Conditional'    ? 'bg-amber-100 text-amber-700 border-amber-300'
:                           'bg-emerald-100 text-emerald-700 border-emerald-300';

const CAT_THRESH: Record<string, [number, number]> = {
  contra: [1.76, 2.98],
  cvsa:   [0.93, 1.08],
  acc:    [0.23, 0.27],
  total:  [2.13, 3.64],
};
function catColor(cat: string, val: number): string {
  const [sat, cond] = CAT_THRESH[cat] ?? [1, 2];
  if (val >= cond) return '#dc2626';
  if (val >= sat)  return '#d97706';
  return '#16a34a';
}

const DRILL_CATS = [
  { key: 'contra' as const, label: 'Contraventions',        sat: 1.76, cond: 2.98 },
  { key: 'cvsa'   as const, label: 'CVSA (Out of Service)', sat: 0.93, cond: 1.08 },
  { key: 'acc'    as const, label: 'Accidents',             sat: 0.23, cond: 0.27 },
  { key: 'total'  as const, label: 'Total Score',           sat: 2.13, cond: 3.64 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function NscBcPullByPull() {
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const filtered = BC_PULL_DATA.filter(r =>
    r.pullDate.toLowerCase().includes(search.toLowerCase()) ||
    r.windowLabel.toLowerCase().includes(search.toLowerCase()) ||
    bcSt(r.total).toLowerCase().includes(search.toLowerCase())
  );

  const totalRows = filtered.length;
  const pages     = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const visible   = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const pageNums: number[] = [];
  for (let i = 1; i <= pages; i++) pageNums.push(i);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
        <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Pull-by-Pull Data</span>
        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{BC_PULL_DATA.length} pulls</span>
        <span className="text-[10px] text-slate-400">newest first · click row → profile drill-down</span>
      </div>

      {/* Search + controls */}
      <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search pull date, window, or status…"
            className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <span className="text-[10px] text-slate-500 whitespace-nowrap ml-auto">
          Showing {Math.min(rowsPerPage, visible.length)} of {totalRows}
        </span>
        <button className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-50">
          <Columns3 size={12}/>Columns
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
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
            {visible.map((r, idx) => {
              const st         = bcSt(r.total);
              const isFirst    = page === 1 && idx === 0;
              const isExpanded = expandedId === r.id;
              return (
                <>
                  <tr
                    key={r.id}
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className={`border-b border-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {isFirst && (
                          <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Latest
                          </span>
                        )}
                        <span className="font-semibold text-slate-800">{r.pullDate}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-slate-700">{r.windowLabel}</div>
                      <div className="text-[10px] text-slate-400">{r.inspections} inspection{r.inspections !== 1 ? 's' : ''}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${stBadgeCls(st)}`}>{st}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.vehicleDays.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.monthlyActiveDays.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">{r.avgFleet.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: catColor('contra', r.contra) }}>{r.contra.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: catColor('cvsa',   r.cvsa)   }}>{r.cvsa.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: catColor('acc',    r.acc)    }}>{r.acc.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: stColor(st) }}>{r.total.toFixed(2)}</td>
                  </tr>

                  {/* Drill-down row */}
                  {isExpanded && (
                    <tr key={`${r.id}-drill`}>
                      <td colSpan={10} className="px-6 py-4 bg-slate-50/80 border-b border-slate-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Profile Breakdown · {r.pullDate}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {DRILL_CATS.map(cat => {
                            const val    = r[cat.key];
                            const catSt  = val >= cat.cond ? 'Unsatisfactory' : val >= cat.sat ? 'Conditional' : 'Satisfactory';
                            const color  = catColor(cat.key, val);
                            const barPct = Math.min((val / (cat.cond * 1.4)) * 100, 100);
                            return (
                              <div key={cat.key} className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{cat.label}</div>
                                <div className="text-[24px] font-black font-mono leading-none mb-0.5" style={{ color }}>{val.toFixed(2)}</div>
                                <div className="text-[10px] font-semibold mb-2" style={{ color }}>{catSt}</div>
                                <div className="relative h-[5px] rounded-full overflow-hidden bg-slate-100">
                                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${barPct}%`, background: color }}/>
                                </div>
                                <div className="flex justify-between text-[8px] mt-0.5 text-slate-400">
                                  <span>0.00</span>
                                  <span style={{ color: '#16a34a' }}>{cat.sat}</span>
                                  <span style={{ color: '#d97706' }}>{cat.cond}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 flex gap-4 text-[10px] text-slate-500">
                          <span>Vehicle Days: <strong className="text-slate-700">{r.vehicleDays.toLocaleString()}</strong></span>
                          <span>Monthly Active Days: <strong className="text-slate-700">{r.monthlyActiveDays.toLocaleString()}</strong></span>
                          <span>Average Fleet Size: <strong className="text-slate-700">{r.avgFleet.toFixed(2)}</strong></span>
                          <span>Inspections: <strong className="text-slate-700">{r.inspections}</strong></span>
                        </div>
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
          <span>{(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, totalRows)} of {totalRows}</span>
          <span className="ml-1">Rows:</span>
          <select
            value={rowsPerPage}
            onChange={e => { setRowsPerPage(+e.target.value); setPage(1); }}
            className="border border-slate-200 rounded px-1.5 py-0.5 text-[10px] bg-white"
          >
            {[5, 10, 15].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">‹</button>
          {pageNums.map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`px-2.5 py-1 text-[10px] border rounded font-semibold ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            className="px-2.5 py-1 text-[10px] border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50">›</button>
        </div>
      </div>
    </div>
  );
}
