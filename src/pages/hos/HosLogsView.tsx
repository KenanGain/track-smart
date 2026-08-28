import { useEffect, useMemo, useState } from 'react';
import {
  Search, Filter, Columns, ChevronDown, ChevronUp, ChevronsUpDown, X, Eye,
  Clock, Route, User, Truck, BadgeCheck, Gauge, Download, History,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { KpiStatCard } from '@/components/ui/KpiStatCard';
import { ActivityTimeline, type ActivityEntry } from '@/components/ui/ActivityTimeline';
import { getHosLogs, type HosLogRecord } from './hos-violations.data';
import { COMPANY_TONE, HOS_COMPANIES } from '@/data/eld-providers.data';

const PAGE_SIZES = [10, 25, 50, 100];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(d: string): string {
  const [y, m, day] = (d || '').split('-');
  if (!y) return d || '—';
  return `${MONTHS[Number(m) - 1] ?? m} ${Number(day)}, ${y}`;
}
const hrs = (h: number) => `${h.toFixed(1)}h`;

const AVATAR_COLORS = ['bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500', 'bg-cyan-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500'];
function avatarColor(name: string) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
function initials(name: string) { const p = name.trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '—'; }
function PersonCell({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white', avatarColor(name || '?'))}>{initials(name)}</span>
      <span className="truncate text-[13px] font-semibold text-slate-800" title={name}>{name}</span>
    </div>
  );
}
function CompanyChip({ company }: { company: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', COMPANY_TONE[company] ?? 'border-slate-200 bg-slate-50 text-slate-600')}>{company}</span>;
}

type ColId = 'driver' | 'company' | 'date' | 'driving' | 'onDuty' | 'offDuty' | 'sleeper' | 'vehicle' | 'waiting' | 'distance' | 'ruleset' | 'certified';
const COLUMN_DEFS: { id: ColId; label: string; locked?: boolean; defaultOn: boolean }[] = [
  { id: 'driver', label: 'Driver', locked: true, defaultOn: true },
  { id: 'company', label: 'Source', defaultOn: true },
  { id: 'date', label: 'Date', locked: true, defaultOn: true },
  { id: 'driving', label: 'Driving', defaultOn: true },
  { id: 'onDuty', label: 'On Duty', defaultOn: true },
  { id: 'offDuty', label: 'Off Duty', defaultOn: true },
  { id: 'sleeper', label: 'Sleeper', defaultOn: true },
  { id: 'vehicle', label: 'Truck / Trailer', defaultOn: true },
  { id: 'waiting', label: 'Waiting', defaultOn: false },
  { id: 'distance', label: 'Distance', defaultOn: false },
  { id: 'ruleset', label: 'Ruleset', defaultOn: false },
  { id: 'certified', label: 'Certified', defaultOn: false },
];
type SortState = { col: ColId; dir: 'asc' | 'desc' };
function sortVal(r: HosLogRecord, col: ColId): string | number {
  switch (col) {
    case 'driver': return r.driverName.toLowerCase();
    case 'company': return r.company.toLowerCase();
    case 'date': return r.date;
    case 'driving': return r.drivingH;
    case 'onDuty': return r.onDutyH;
    case 'offDuty': return r.offDutyH;
    case 'sleeper': return r.sleeperH;
    case 'vehicle': return r.truckId.toLowerCase();
    case 'waiting': return r.waitingH;
    case 'distance': return r.distanceMi;
    case 'ruleset': return r.ruleset.toLowerCase();
    case 'certified': return r.certified ? 1 : 0;
  }
}

function SortTh({ id, label, minW, align, sort, onSort }: { id: ColId; label: string; minW: string; align?: 'right' | 'center'; sort: SortState | null; onSort: (id: ColId) => void }) {
  const active = sort?.col === id;
  return (
    <th className={cn('px-3 py-2.5 whitespace-nowrap', minW, align === 'right' && 'text-right', align === 'center' && 'text-center')}>
      <button type="button" onClick={() => onSort(id)} className={cn('inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider hover:text-slate-700', active ? 'text-slate-700' : 'text-slate-500')}>
        {label}
        {active ? (sort!.dir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />) : <ChevronsUpDown size={12} className="text-slate-300" />}
      </button>
    </th>
  );
}
function ColumnsDropdown({ visible, onToggle }: { visible: Set<ColId>; onToggle: (id: ColId) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
        <Columns size={14} /> Columns <ChevronDown size={13} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Toggle columns</div>
            {COLUMN_DEFS.map(c => (
              <label key={c.id} className={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-slate-700', c.locked ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50')}>
                <input type="checkbox" disabled={c.locked} checked={visible.has(c.id)} onChange={() => onToggle(c.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                {c.label}
                {c.locked && <span className="ml-auto text-[10px] font-medium text-slate-400">Always</span>}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Popup card ───────────────────────────────────────────────────────────────
function LogViewModal({ log, onClose }: { log: HosLogRecord; onClose: () => void }) {
  const Row = ({ label, value, tone }: { label: string; value: string; tone?: string }) => (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className={cn('font-mono text-[13px] font-bold', tone ?? 'text-slate-800')}>{value}</span>
    </div>
  );
  const total = log.drivingH + log.onDutyH + log.offDutyH + log.sleeperH + log.waitingH + log.yardMoveH + log.personalConveyanceH;
  const [tab, setTab] = useState<'details' | 'activity'>('details');
  const activity: ActivityEntry[] = [
    { id: 'received', icon: Download, iconTone: 'bg-slate-400', title: 'Received from source', badge: { label: log.company, tone: COMPANY_TONE[log.company] ?? 'bg-slate-100 text-slate-600' }, detail: `Imported from ${log.company} ELD via API`, by: log.company, at: fmtDate(log.date) },
    log.certified
      ? { id: 'certified', icon: BadgeCheck, iconTone: 'bg-emerald-500', title: 'Log certified', detail: 'Driver certified the daily log', by: log.driverName, at: fmtDate(log.date) }
      : { id: 'pending', icon: Clock, iconTone: 'bg-amber-500', title: 'Pending certification', detail: 'Awaiting driver certification', at: fmtDate(log.date) },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="flex h-[500px] max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <CompanyChip company={log.company} />
              {log.certified
                ? <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><BadgeCheck size={10} /> Certified</span>
                : <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">Pending certification</span>}
            </div>
            <h3 className="mt-1.5 text-base font-bold text-slate-900">{log.driverName}</h3>
            <p className="text-[12px] text-slate-500">{fmtDate(log.date)} · {log.truckId} / {log.trailerId} · {log.ruleset}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 px-5">
          {([['details', 'Details'], ['activity', `Activity (${activity.length})`]] as const).map(([id, lbl]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={cn('flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors', tab === id ? 'border-orange-600 text-orange-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
              {id === 'activity' && <History size={14} />}{lbl}
            </button>
          ))}
        </div>
        <div className="max-h-[62vh] space-y-3 overflow-y-auto px-5 py-4">
          {tab === 'details' ? (<>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Row label="Driving" value={hrs(log.drivingH)} tone="text-emerald-600" />
              <Row label="On Duty" value={hrs(log.onDutyH)} tone="text-amber-600" />
              <Row label="Off Duty" value={hrs(log.offDutyH)} tone="text-slate-700" />
              <Row label="Sleeper" value={hrs(log.sleeperH)} tone="text-indigo-600" />
              <Row label="Waiting" value={hrs(log.waitingH)} tone="text-slate-600" />
              <Row label="Yard Move" value={hrs(log.yardMoveH)} tone="text-pink-600" />
              <Row label="Personal Conv." value={hrs(log.personalConveyanceH)} tone="text-violet-600" />
              <Row label="Distance" value={`${log.distanceMi} mi`} tone="text-blue-600" />
              <Row label="Total logged" value={hrs(total)} />
            </div>
            <div className="text-[11px] text-slate-400">Log ID <span className="font-mono">{log.id}</span> · Driver <span className="font-mono">{log.driverId}</span></div>
          </>) : (
            <ActivityTimeline entries={activity} />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
}

export function HosLogsView({ accountId }: { accountId?: string }) {
  const [logs, setLogs] = useState<HosLogRecord[]>(() => getHosLogs(accountId));
  useEffect(() => { setLogs(getHosLogs(accountId)); }, [accountId]);

  const [search, setSearch] = useState('');
  const [company, setCompany] = useState<string>('all');
  const [sort, setSort] = useState<SortState | null>(null);
  const toggleSort = (col: ColId) => setSort(s => (s?.col === col ? (s.dir === 'asc' ? { col, dir: 'desc' } : null) : { col, dir: 'asc' }));
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(() => new Set(COLUMN_DEFS.filter(c => c.defaultOn).map(c => c.id)));
  const toggleCol = (id: ColId) => setVisibleCols(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const showCol = (id: ColId) => visibleCols.has(id);
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<HosLogRecord | null>(null);

  const companies = useMemo(() => HOS_COMPANIES.filter(c => logs.some(l => l.company === c)), [logs]);

  const kpis = useMemo(() => ({
    total: logs.length,
    drivers: new Set(logs.map(l => l.driverId)).size,
    driving: Math.round(logs.reduce((a, l) => a + l.drivingH, 0)),
    distance: logs.reduce((a, l) => a + l.distanceMi, 0),
    certified: logs.filter(l => l.certified).length,
  }), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      if (company !== 'all' && l.company !== company) return false;
      if (q && !`${l.driverName} ${l.company} ${l.truckId} ${l.trailerId} ${l.date}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [logs, search, company]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = sortVal(a, sort.col), bv = sortVal(b, sort.col);
      if (av < bv) return -1 * dir; if (av > bv) return 1 * dir; return 0;
    });
  }, [filtered, sort]);

  useEffect(() => { setPage(1); }, [search, company, pageSize]);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * pageSize;
  const rows = sorted.slice(start, start + pageSize);
  const anyFilter = company !== 'all' || search;

  return (
    <div className="space-y-5 p-4 sm:p-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiStatCard label="Log Entries" value={kpis.total} Icon={Clock} accent="blue" />
        <KpiStatCard label="Drivers" value={kpis.drivers} Icon={User} accent="violet" />
        <KpiStatCard label="Driving Hrs" value={kpis.driving} Icon={Gauge} accent="emerald" />
        <KpiStatCard label="Distance (mi)" value={kpis.distance.toLocaleString()} Icon={Route} accent="sky" />
        <KpiStatCard label="Certified" value={kpis.certified} Icon={BadgeCheck} accent="amber" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search driver, company, truck, date…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <span className="hidden shrink-0 items-center text-slate-400 sm:inline-flex"><Filter size={14} /></span>
          <select value={company} onChange={e => setCompany(e.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none">
            <option value="all">All sources</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <ColumnsDropdown visible={visibleCols} onToggle={toggleCol} />
          <div className="ml-auto flex items-center gap-2">
            {anyFilter && (
              <button type="button" onClick={() => { setSearch(''); setCompany('all'); }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                <X size={13} /> Clear
              </button>
            )}
            <span className="shrink-0 text-[12px] font-medium text-slate-400 tabular-nums">{total} of {logs.length}</span>
          </div>
        </div>

        {total === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Clock size={22} /></div>
            <p className="text-sm font-semibold text-slate-700">No logs {anyFilter ? 'match your filters' : 'available'}</p>
            <p className="mt-1 text-xs text-slate-400">Connect an ELD provider under Settings ▸ Integrations to sync driver logs.</p>
          </div>
        ) : (<>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-max text-left">
              <thead className="border-b border-slate-200 bg-slate-50/60">
                <tr>
                  {showCol('driver') && <SortTh id="driver" label="Driver" minW="min-w-[170px] pl-5" sort={sort} onSort={toggleSort} />}
                  {showCol('company') && <SortTh id="company" label="Source" minW="min-w-[100px]" sort={sort} onSort={toggleSort} />}
                  {showCol('date') && <SortTh id="date" label="Date" minW="min-w-[110px]" sort={sort} onSort={toggleSort} />}
                  {showCol('driving') && <SortTh id="driving" label="Driving" minW="min-w-[80px]" align="right" sort={sort} onSort={toggleSort} />}
                  {showCol('onDuty') && <SortTh id="onDuty" label="On Duty" minW="min-w-[80px]" align="right" sort={sort} onSort={toggleSort} />}
                  {showCol('offDuty') && <SortTh id="offDuty" label="Off Duty" minW="min-w-[80px]" align="right" sort={sort} onSort={toggleSort} />}
                  {showCol('sleeper') && <SortTh id="sleeper" label="Sleeper" minW="min-w-[80px]" align="right" sort={sort} onSort={toggleSort} />}
                  {showCol('waiting') && <SortTh id="waiting" label="Waiting" minW="min-w-[80px]" align="right" sort={sort} onSort={toggleSort} />}
                  {showCol('vehicle') && <SortTh id="vehicle" label="Truck / Trailer" minW="min-w-[130px]" sort={sort} onSort={toggleSort} />}
                  {showCol('distance') && <SortTh id="distance" label="Distance" minW="min-w-[90px]" align="right" sort={sort} onSort={toggleSort} />}
                  {showCol('ruleset') && <SortTh id="ruleset" label="Ruleset" minW="min-w-[140px]" sort={sort} onSort={toggleSort} />}
                  {showCol('certified') && <SortTh id="certified" label="Certified" minW="min-w-[90px]" align="center" sort={sort} onSort={toggleSort} />}
                  <th className="sticky right-0 z-[2] min-w-[80px] border-l border-slate-200 bg-slate-100 px-3 py-2.5 pr-5 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(l => (
                  <tr key={l.id} onClick={() => setViewing(l)} className="group cursor-pointer border-b border-slate-100 align-middle hover:bg-slate-50/60">
                    {showCol('driver') && <td className="px-3 py-3 pl-5"><PersonCell name={l.driverName} /></td>}
                    {showCol('company') && <td className="px-3 py-3"><CompanyChip company={l.company} /></td>}
                    {showCol('date') && <td className="px-3 py-3 whitespace-nowrap text-[13px] font-semibold text-slate-800">{fmtDate(l.date)}</td>}
                    {showCol('driving') && <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-emerald-700">{hrs(l.drivingH)}</td>}
                    {showCol('onDuty') && <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-amber-700">{hrs(l.onDutyH)}</td>}
                    {showCol('offDuty') && <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-slate-600">{hrs(l.offDutyH)}</td>}
                    {showCol('sleeper') && <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-indigo-700">{hrs(l.sleeperH)}</td>}
                    {showCol('waiting') && <td className="px-3 py-3 text-right font-mono text-[12px] font-semibold text-slate-600">{hrs(l.waitingH)}</td>}
                    {showCol('vehicle') && (
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-slate-700"><Truck size={11} className="shrink-0 text-slate-300" /> {l.truckId}</div>
                        <div className="text-[11px] text-slate-400">{l.trailerId}</div>
                      </td>
                    )}
                    {showCol('distance') && <td className="px-3 py-3 text-right font-mono text-[12px] text-slate-600">{l.distanceMi} mi</td>}
                    {showCol('ruleset') && <td className="px-3 py-3 text-[12px] text-slate-600">{l.ruleset}</td>}
                    {showCol('certified') && <td className="px-3 py-3 text-center">{l.certified ? <BadgeCheck size={15} className="mx-auto text-emerald-500" /> : <span className="text-[11px] text-slate-300">—</span>}</td>}
                    <td className="sticky right-0 z-[1] border-l border-slate-100 bg-white px-3 py-3 pr-5 group-hover:bg-slate-50">
                      <div className="flex items-center justify-end" onClick={e => e.stopPropagation()}>
                        <button type="button" title="View" onClick={() => setViewing(l)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"><Eye size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Card list (below xl) */}
          <ul className="divide-y divide-slate-100 xl:hidden">
            {rows.map(l => (
              <li key={l.id} onClick={() => setViewing(l)} className="cursor-pointer space-y-2 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800">{l.driverName}</p>
                    <p className="text-[11px] text-slate-400">{fmtDate(l.date)} · {l.truckId} / {l.trailerId}</p>
                  </div>
                  <CompanyChip company={l.company} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">Drive {hrs(l.drivingH)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">On {hrs(l.onDutyH)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">Off {hrs(l.offDutyH)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-indigo-700">Slp {hrs(l.sleeperH)}</span>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3">
            <label className="flex items-center gap-1.5 text-[12px] text-slate-500">Rows per page
              <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:outline-none">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div className="flex items-center gap-1">
              <span className="mr-2 text-[12px] text-slate-500 tabular-nums">{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Prev</button>
              <span className="px-2 text-[12px] text-slate-600 tabular-nums">Page {safePage} of {pages}</span>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} className="inline-flex h-8 items-center rounded-md border border-slate-200 px-2.5 text-sm text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </>)}
      </div>

      {viewing && <LogViewModal log={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
