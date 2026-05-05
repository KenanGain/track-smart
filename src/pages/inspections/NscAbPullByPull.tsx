import { useState } from 'react';
import { Search, Columns3 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AbPullRow {
  id: string;
  pullDate: string;
  windowLabel: string;
  inspections: number;
  convictions: number;
  adminPenalties: number;
  cvsaInspections: number;
  reportableCollisions: number;
  rFactor: number;
  status: 'Ok' | 'Warning' | 'Critical';
}

// ─── Carry Freight Ltd. (NSC AB243-8992) — pulls extracted from real Alberta
// Carrier Profile PDFs in docs/alberta-extraction-vendor-package-v7/per-pdf/.
// Newest first. inspections/convictions/coll/violations come from each pull's
// extracted.json totals; rFactor is from Part 1 of the same PDF. Pulls older
// than 2022 are the older multi-column Alberta format; 2022+ are the newer
// "Page X of Y" layout that adds Part 3 — Administrative Penalty Information.
export const AB_PULL_DATA: AbPullRow[] = [
  { id:'2022-09', pullDate:'Sep 6/22',  windowLabel:'Sep 2021 → Sep 2022', inspections: 0, convictions: 0, adminPenalties:0, cvsaInspections: 0, reportableCollisions:0, rFactor:0.448, status:'Critical' },
  { id:'2022-05', pullDate:'May 3/22',  windowLabel:'May 2020 → May 2022', inspections: 0, convictions: 0, adminPenalties:0, cvsaInspections: 0, reportableCollisions:0, rFactor:0.640, status:'Critical' },
  { id:'2021-01', pullDate:'Jan 4/21',  windowLabel:'Jan 2019 → Jan 2021', inspections: 0, convictions: 0, adminPenalties:0, cvsaInspections: 0, reportableCollisions:0, rFactor:1.575, status:'Critical' },
  { id:'2020-01', pullDate:'Jan 9/20',  windowLabel:'Jan 2018 → Jan 2020', inspections: 0, convictions: 0, adminPenalties:0, cvsaInspections: 0, reportableCollisions:0, rFactor:0.364, status:'Critical' },
  { id:'2019-09', pullDate:'Sep 30/19', windowLabel:'Oct 2017 → Sep 2019', inspections:25, convictions:13, adminPenalties:0, cvsaInspections:25, reportableCollisions:1, rFactor:2.559, status:'Critical' },
  { id:'2018-12', pullDate:'Dec 19/18', windowLabel:'Dec 2016 → Dec 2018', inspections: 9, convictions: 1, adminPenalties:0, cvsaInspections: 9, reportableCollisions:0, rFactor:0.468, status:'Critical' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

type AbStatus = 'Ok' | 'Warning' | 'Critical';

const stBadgeCls = (s: AbStatus) =>
  s === 'Critical' ? 'bg-red-100 text-red-700 border-red-300'
: s === 'Warning'  ? 'bg-amber-100 text-amber-700 border-amber-300'
:                    'bg-emerald-100 text-emerald-700 border-emerald-300';

function rfactorColor(v: number): string {
  if (v >= 0.085) return '#dc2626';
  if (v >= 0.070) return '#d97706';
  return '#16a34a';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NscAbPullByPull() {
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedId,  setExpandedId]  = useState<string | null>(null);

  const filtered = AB_PULL_DATA.filter(r =>
    r.pullDate.toLowerCase().includes(search.toLowerCase())    ||
    r.windowLabel.toLowerCase().includes(search.toLowerCase()) ||
    r.status.toLowerCase().includes(search.toLowerCase())
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
        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{AB_PULL_DATA.length} pulls</span>
        <span className="text-[10px] text-slate-400">newest first · click row → inspection drill-down</span>
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
            {visible.map((r, idx) => {
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
                      <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${stBadgeCls(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.convictions >= 16 ? '#dc2626' : r.convictions >= 12 ? '#d97706' : '#16a34a' }}>
                      {r.convictions}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.adminPenalties >= 3 ? '#dc2626' : r.adminPenalties >= 1 ? '#d97706' : '#16a34a' }}>
                      {r.adminPenalties}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                      {r.cvsaInspections}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: r.reportableCollisions >= 9 ? '#dc2626' : r.reportableCollisions >= 7 ? '#d97706' : '#16a34a' }}>
                      {r.reportableCollisions}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold" style={{ color: rfactorColor(r.rFactor) }}>
                      {r.rFactor.toFixed(3)}
                    </td>
                  </tr>

                  {/* Drill-down row */}
                  {isExpanded && (
                    <tr key={`${r.id}-drill`}>
                      <td colSpan={8} className="px-6 py-4 bg-slate-50/80 border-b border-slate-100">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          CVOR Breakdown · {r.pullDate} · {r.windowLabel}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          {([
                            { label: 'Convictions',           value: r.convictions,          unit: 'events', color: r.convictions >= 16 ? '#dc2626' : r.convictions >= 12 ? '#d97706' : '#16a34a',       max: 25  },
                            { label: 'Admin Penalties',        value: r.adminPenalties,       unit: 'events', color: r.adminPenalties >= 3 ? '#dc2626' : r.adminPenalties >= 1 ? '#d97706' : '#16a34a',   max: 6   },
                            { label: 'CVSA Inspections',       value: r.cvsaInspections,      unit: 'total',  color: '#3b82f6',                                                                            max: 50  },
                            { label: 'Reportable Collisions',  value: r.reportableCollisions, unit: 'events', color: r.reportableCollisions >= 9 ? '#dc2626' : r.reportableCollisions >= 7 ? '#d97706' : '#16a34a', max: 14 },
                          ] as { label: string; value: number; unit: string; color: string; max: number }[]).map(item => (
                            <div key={item.label} className="bg-white border border-slate-200 rounded-lg p-3">
                              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{item.label}</div>
                              <div className="text-[24px] font-black font-mono leading-none mb-0.5" style={{ color: item.color }}>{item.value}</div>
                              <div className="text-[10px] text-slate-400 mb-2">{item.unit}</div>
                              <div className="relative h-[5px] rounded-full overflow-hidden bg-slate-100">
                                <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%`, background: item.color }}/>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">R-Factor</span>
                          <span className="text-[18px] font-black font-mono" style={{ color: rfactorColor(r.rFactor) }}>{r.rFactor.toFixed(3)}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stBadgeCls(r.status)}`}>{r.status}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{r.inspections} CVSA inspections in 24-month window</span>
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
