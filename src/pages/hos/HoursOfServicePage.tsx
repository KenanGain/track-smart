import { useState, useMemo } from 'react';
import { Download, Clock, BarChart3, FileText, Route, Truck, User, ChevronLeft, ChevronRight, ChevronDown, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { HOS_DAILY_LOGS, HOS_LOGS, HOS_TRIPS } from './hos.data';
import { StatCard, StatusBadge, ViewBtn, DetailModal, fmtMs, fmtDatetime, fmtDuration, miToKm, mphToKmh } from './hos-components';

type TabId = 'daily' | 'logs' | 'trips';
const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'daily', label: 'Daily Logs', icon: BarChart3 },
  { id: 'logs', label: 'HOS Logs', icon: FileText },
  { id: 'trips', label: 'Trips', icon: Route },
];

const STATUS_OPTIONS = ['All', 'off_duty', 'driving', 'on_duty', 'sleeper_berth'];
const PROVIDER_OPTIONS = ['All', 'geotab', 'samsara', 'verizon-reveal'];

function SortHeader({ label, field, sortField, sortDir, onSort, align = 'left' }: {
  label: string; field: string; sortField: string; sortDir: 'asc' | 'desc'; onSort: (f: string) => void; align?: string;
}) {
  const active = sortField === field;
  return (
    <th className={`px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-${align} cursor-pointer select-none hover:text-slate-700 transition-colors group`} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">{label}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {active && sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </span>
      </span>
    </th>
  );
}

function Pagination({ total, page, perPage, onPage, onPerPage }: {
  total: number; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (r: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{start}–{end} of {total}</span>
        <div className="flex items-center gap-1.5"><span>Rows:</span>
          <select value={perPage} onChange={e => onPerPage(Number(e.target.value))} className="border border-slate-200 rounded px-1.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {[10, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 text-slate-500 bg-white"><ChevronLeft size={14} /></button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { const p = page <= 3 ? i + 1 : page - 2 + i; if (p < 1 || p > totalPages) return null; return (
          <button key={p} onClick={() => onPage(p)} className={`min-w-[28px] h-7 flex items-center justify-center border rounded text-xs font-semibold ${page === p ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
        ); })}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 text-slate-500 bg-white"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm min-h-[36px]" title={label}>
        {options.map(o => <option key={o} value={o}>{o === 'All' ? `All ${label}` : o.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function UnitToggle({ useKm, onChange }: { useKm: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden shadow-sm bg-white">
      <button onClick={() => onChange(false)} className={`px-3 py-2 text-xs font-semibold transition-colors ${!useKm ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Miles</button>
      <button onClick={() => onChange(true)} className={`px-3 py-2 text-xs font-semibold transition-colors ${useKm ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}>Km</button>
    </div>
  );
}

// ── Unique drivers & vehicles for filters ──────────────────────────────────────
const ALL_DRIVERS = [...new Set([...HOS_DAILY_LOGS.map(l => `${l.driver.firstName} ${l.driver.lastName}`), ...HOS_LOGS.map(l => `${l.driver.firstName} ${l.driver.lastName}`),...HOS_TRIPS.map(l => `${l.driver.firstName} ${l.driver.lastName}`)])].sort();
const ALL_VEHICLES = [...new Set([...HOS_LOGS.map(l => l.vehicle.name), ...HOS_TRIPS.map(l => l.vehicle.name)])].sort();

export function HoursOfServicePage() {
  const [tab, setTab] = useState<TabId>('daily');
  const [selected, setSelected] = useState<{ item: any; type: 'daily' | 'log' | 'trip' } | null>(null);
  const [useKm, setUseKm] = useState(false);

  // Filters
  const [driverFilter, setDriverFilter] = useState('All');
  const [vehicleFilter, setVehicleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [providerFilter, setProviderFilter] = useState('All');

  // Sort + search state
  const [dailySearch, setDailySearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [tripSearch, setTripSearch] = useState('');
  const [dailySortF, setDailySortF] = useState('date');
  const [dailySortD, setDailySortD] = useState<'asc' | 'desc'>('desc');
  const [logSortF, setLogSortF] = useState('startedAt');
  const [logSortD, setLogSortD] = useState<'asc' | 'desc'>('desc');
  const [tripSortF, setTripSortF] = useState('startedAt');
  const [tripSortD, setTripSortD] = useState<'asc' | 'desc'>('desc');
  const [dailyPage, setDailyPage] = useState(1); const [dailyPP, setDailyPP] = useState(10);
  const [logPage, setLogPage] = useState(1); const [logPP, setLogPP] = useState(10);
  const [tripPage, setTripPage] = useState(1); const [tripPP, setTripPP] = useState(10);

  function toggleSort(f: string, cf: string, cd: 'asc' | 'desc', sf: (v: string) => void, sd: (v: 'asc' | 'desc') => void) {
    if (cf === f) sd(cd === 'asc' ? 'desc' : 'asc'); else { sf(f); sd('desc'); }
  }

  const dUnit = useKm ? 'km' : 'mi';
  const sUnit = useKm ? 'km/h' : 'mph';
  const d = (v: number) => useKm ? miToKm(v) : v;
  const s = (v: number) => useKm ? mphToKmh(v) : v;

  // ── Filtered data ──
  const filteredDaily = useMemo(() => {
    let data = [...HOS_DAILY_LOGS];
    if (driverFilter !== 'All') data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}` === driverFilter);
    if (providerFilter !== 'All') data = data.filter(r => r.provider === providerFilter);
    if (dailySearch.trim()) { const q = dailySearch.toLowerCase(); data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}`.toLowerCase().includes(q) || r.date.includes(q)); }
    return data.sort((a, b) => {
      if (dailySortF === 'date') return dailySortD === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      if (dailySortF === 'driving') return dailySortD === 'desc' ? b.statusDurations.driving - a.statusDurations.driving : a.statusDurations.driving - b.statusDurations.driving;
      if (dailySortF === 'distance') return dailySortD === 'desc' ? b.distances.total - a.distances.total : a.distances.total - b.distances.total;
      if (dailySortF === 'driver') return dailySortD === 'desc' ? b.driver.lastName.localeCompare(a.driver.lastName) : a.driver.lastName.localeCompare(b.driver.lastName);
      return 0;
    });
  }, [dailySearch, dailySortF, dailySortD, driverFilter, providerFilter]);

  const filteredLogs = useMemo(() => {
    let data = [...HOS_LOGS];
    if (driverFilter !== 'All') data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}` === driverFilter);
    if (vehicleFilter !== 'All') data = data.filter(r => r.vehicle.name === vehicleFilter);
    if (statusFilter !== 'All') data = data.filter(r => r.status === statusFilter);
    if (providerFilter !== 'All') data = data.filter(r => r.provider === providerFilter);
    if (logSearch.trim()) { const q = logSearch.toLowerCase(); data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}`.toLowerCase().includes(q) || r.vehicle.name.toLowerCase().includes(q) || r.status.includes(q) || r.location.name?.toLowerCase().includes(q)); }
    return data.sort((a, b) => {
      if (logSortF === 'startedAt') return logSortD === 'desc' ? b.startedAt.localeCompare(a.startedAt) : a.startedAt.localeCompare(b.startedAt);
      if (logSortF === 'status') return logSortD === 'desc' ? b.status.localeCompare(a.status) : a.status.localeCompare(b.status);
      if (logSortF === 'driver') return logSortD === 'desc' ? b.driver.lastName.localeCompare(a.driver.lastName) : a.driver.lastName.localeCompare(b.driver.lastName);
      if (logSortF === 'location') return logSortD === 'desc' ? (b.location.name || '').localeCompare(a.location.name || '') : (a.location.name || '').localeCompare(b.location.name || '');
      return 0;
    });
  }, [logSearch, logSortF, logSortD, driverFilter, vehicleFilter, statusFilter, providerFilter]);

  const filteredTrips = useMemo(() => {
    let data = [...HOS_TRIPS];
    if (driverFilter !== 'All') data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}` === driverFilter);
    if (vehicleFilter !== 'All') data = data.filter(r => r.vehicle.name === vehicleFilter);
    if (providerFilter !== 'All') data = data.filter(r => r.provider === providerFilter);
    if (tripSearch.trim()) { const q = tripSearch.toLowerCase(); data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}`.toLowerCase().includes(q) || r.vehicle.name.toLowerCase().includes(q) || r.startLocation.name.toLowerCase().includes(q)); }
    return data.sort((a, b) => {
      if (tripSortF === 'startedAt') return tripSortD === 'desc' ? b.startedAt.localeCompare(a.startedAt) : a.startedAt.localeCompare(b.startedAt);
      if (tripSortF === 'distance') return tripSortD === 'desc' ? b.distance - a.distance : a.distance - b.distance;
      if (tripSortF === 'duration') return tripSortD === 'desc' ? b.duration - a.duration : a.duration - b.duration;
      if (tripSortF === 'driver') return tripSortD === 'desc' ? b.driver.lastName.localeCompare(a.driver.lastName) : a.driver.lastName.localeCompare(b.driver.lastName);
      if (tripSortF === 'avgSpeed') return tripSortD === 'desc' ? b.averageSpeed - a.averageSpeed : a.averageSpeed - b.averageSpeed;
      return 0;
    });
  }, [tripSearch, tripSortF, tripSortD, driverFilter, vehicleFilter, providerFilter]);

  // KPI stats
  const totalDriving = HOS_DAILY_LOGS.reduce((a, l) => a + (l.statusDurations?.driving || 0), 0);
  const totalDist = HOS_TRIPS.reduce((a, l) => a + (l.distance || 0), 0);
  const activeDrivers = new Set([...HOS_LOGS.filter(l => l.driver.status === 'active').map(l => l.driver.id), ...HOS_TRIPS.filter(l => l.driver.status === 'active').map(l => l.driver.id)]).size;
  const totalRecords = HOS_DAILY_LOGS.length + HOS_LOGS.length + HOS_TRIPS.length;

  const thCls = 'px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider';

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hours of Service</h1>
            <p className="text-sm text-gray-500">Track HOS logs, duty status, and fleet compliance data.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Clock} label="Total Driving" value={fmtMs(totalDriving)} sub="Across daily logs" color="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Route} label="Trip Distance" value={`${d(Math.round(totalDist)).toLocaleString()} ${dUnit}`} sub="Sum of all trips" color="bg-blue-50 text-blue-600" />
          <StatCard icon={User} label="Active Drivers" value={String(activeDrivers)} sub="Expanded resources" color="bg-violet-50 text-violet-600" />
          <StatCard icon={Truck} label="Total Records" value={String(totalRecords)} sub="All endpoints" color="bg-amber-50 text-amber-600" />
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-1 border-b border-slate-200 mb-6">
          {TABS.map(t => {
            const active = tab === t.id; const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); }}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
                {t.label}
                {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />}
              </button>
            );
          })}
        </div>

        {/* ═══ DAILY LOGS TAB ═══ */}
        {tab === 'daily' && (() => {
          const paged = filteredDaily.slice((dailyPage - 1) * dailyPP, dailyPage * dailyPP);
          const sortD = (f: string) => toggleSort(f, dailySortF, dailySortD, setDailySortF, setDailySortD);
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Row 1: Title + record count */}
              <div className="px-5 pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">Daily Logs</h2>
                    <span className="text-xs text-slate-400">{filteredDaily.length} records</span>
                  </div>
                </div>
                {/* Row 2: Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterSelect label="Drivers" value={driverFilter} options={['All', ...ALL_DRIVERS]} onChange={v => { setDriverFilter(v); setDailyPage(1); }} />
                  <FilterSelect label="Providers" value={providerFilter} options={PROVIDER_OPTIONS} onChange={v => { setProviderFilter(v); setDailyPage(1); }} />
                  <div className="ml-auto">
                    <UnitToggle useKm={useKm} onChange={setUseKm} />
                  </div>
                </div>
              </div>
              {/* Row 3: Search + Showing */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-5 py-3 bg-slate-50/80 border-y border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search daily logs…" value={dailySearch} onChange={e => { setDailySearch(e.target.value); setDailyPage(1); }} className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm" />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Showing <span className="font-bold text-slate-800">{Math.min(filteredDaily.length, dailyPP)}</span> of <span className="font-bold text-slate-800">{filteredDaily.length}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <SortHeader label="Date / Provider" field="date" sortField={dailySortF} sortDir={dailySortD} onSort={sortD} />
                      <SortHeader label="Driver" field="driver" sortField={dailySortF} sortDir={dailySortD} onSort={sortD} />
                      <SortHeader label="Durations" field="driving" sortField={dailySortF} sortDir={dailySortD} onSort={sortD} />
                      <SortHeader label={`Distance (${dUnit})`} field="distance" sortField={dailySortF} sortDir={dailySortD} onSort={sortD} align="right" />
                      <th className={`${thCls} text-center`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map(log => (
                      <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3.5"><div className="font-medium text-slate-900 text-sm">{log.date}</div><div className="text-xs text-slate-400 capitalize">{log.provider.replace(/-/g, ' ')}</div></td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-blue-100 text-blue-700">{log.driver.firstName[0]}</div>
                            <div><div className="font-medium text-slate-900 text-sm">{log.driver.firstName} {log.driver.lastName}</div><div className="text-xs text-slate-400">{log.driver.id}</div></div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5" style={{ minWidth: 180 }}>
                          <div className="text-sm font-medium text-slate-900 mb-1">Drive: {fmtMs(log.statusDurations.driving)}</div>
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 w-40">
                            {[{ k: 'driving' as const, c: '#10b981' }, { k: 'onDuty' as const, c: '#f59e0b' }, { k: 'offDuty' as const, c: '#94a3b8' }].map(st => {
                              const tot = log.statusDurations.driving + log.statusDurations.onDuty + log.statusDurations.offDuty;
                              const v = log.statusDurations[st.k] || 0; if (!v) return null;
                              return <div key={st.k} style={{ width: `${(v / tot) * 100}%`, backgroundColor: st.c }} />;
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right"><span className="font-bold text-slate-900">{d(log.distances.total)}</span><span className="text-xs text-slate-400 ml-0.5">{dUnit}</span></td>
                        <td className="px-4 py-3.5 text-center"><ViewBtn onClick={(e) => { e.stopPropagation(); setSelected({ item: log, type: 'daily' }); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={filteredDaily.length} page={dailyPage} perPage={dailyPP} onPage={setDailyPage} onPerPage={v => { setDailyPP(v); setDailyPage(1); }} />
            </div>
          );
        })()}

        {/* ═══ HOS LOGS TAB ═══ */}
        {tab === 'logs' && (() => {
          const paged = filteredLogs.slice((logPage - 1) * logPP, logPage * logPP);
          const sortL = (f: string) => toggleSort(f, logSortF, logSortD, setLogSortF, setLogSortD);
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Row 1: Title + record count */}
              <div className="px-5 pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">HOS Logs</h2>
                    <span className="text-xs text-slate-400">{filteredLogs.length} records</span>
                  </div>
                </div>
                {/* Row 2: Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterSelect label="Drivers" value={driverFilter} options={['All', ...ALL_DRIVERS]} onChange={v => { setDriverFilter(v); setLogPage(1); }} />
                  <FilterSelect label="Vehicles" value={vehicleFilter} options={['All', ...ALL_VEHICLES]} onChange={v => { setVehicleFilter(v); setLogPage(1); }} />
                  <FilterSelect label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={v => { setStatusFilter(v); setLogPage(1); }} />
                  <FilterSelect label="Providers" value={providerFilter} options={PROVIDER_OPTIONS} onChange={v => { setProviderFilter(v); setLogPage(1); }} />
                  <div className="ml-auto">
                    <UnitToggle useKm={useKm} onChange={setUseKm} />
                  </div>
                </div>
              </div>
              {/* Row 3: Search + Showing */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-5 py-3 bg-slate-50/80 border-y border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search HOS logs…" value={logSearch} onChange={e => { setLogSearch(e.target.value); setLogPage(1); }} className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm" />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Showing <span className="font-bold text-slate-800">{Math.min(filteredLogs.length, logPP)}</span> of <span className="font-bold text-slate-800">{filteredLogs.length}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <SortHeader label="Started" field="startedAt" sortField={logSortF} sortDir={logSortD} onSort={sortL} />
                      <th className={`${thCls} text-left`}>Ended</th>
                      <SortHeader label="Status" field="status" sortField={logSortF} sortDir={logSortD} onSort={sortL} />
                      <SortHeader label="Driver" field="driver" sortField={logSortF} sortDir={logSortD} onSort={sortL} />
                      <th className={`${thCls} text-left`}>Vehicle</th>
                      <SortHeader label="Location" field="location" sortField={logSortF} sortDir={logSortD} onSort={sortL} />
                      <th className={`${thCls} text-center`}>Rmks</th>
                      <th className={`${thCls} text-left`}>Provider</th>
                      <th className={`${thCls} text-center`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map(log => (
                      <tr key={log.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{fmtDatetime(log.startedAt).substring(0, 16)}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{fmtDatetime(log.endedAt).substring(0, 16)}</td>
                        <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                        <td className="px-4 py-3"><div className="font-medium text-slate-900 text-sm">{log.driver.firstName} {log.driver.lastName}</div><div className="text-xs text-slate-400">{log.driver.status}</div></td>
                        <td className="px-4 py-3"><div className="font-medium text-slate-900 text-sm">{log.vehicle.name}</div><div className="text-xs text-slate-400">{log.vehicle.make} {log.vehicle.model}</div></td>
                        <td className="px-4 py-3"><div className="text-sm text-slate-900">{log.location.name}, {log.location.state}</div><div className="text-xs text-slate-400">{log.location.country}</div></td>
                        <td className="px-4 py-3 text-center"><span className="inline-flex items-center justify-center bg-slate-100 text-slate-600 rounded-full h-5 w-5 text-xs font-bold">{log.remarks?.length || 0}</span></td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600 capitalize">{(log.provider || '').replace(/-/g, ' ')}</td>
                        <td className="px-4 py-3 text-center"><ViewBtn onClick={(e) => { e.stopPropagation(); setSelected({ item: log, type: 'log' }); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={filteredLogs.length} page={logPage} perPage={logPP} onPage={setLogPage} onPerPage={v => { setLogPP(v); setLogPage(1); }} />
            </div>
          );
        })()}

        {/* ═══ TRIPS TAB ═══ */}
        {tab === 'trips' && (() => {
          const paged = filteredTrips.slice((tripPage - 1) * tripPP, tripPage * tripPP);
          const sortT = (f: string) => toggleSort(f, tripSortF, tripSortD, setTripSortF, setTripSortD);
          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Row 1: Title + record count */}
              <div className="px-5 pt-4 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-800">Trips</h2>
                    <span className="text-xs text-slate-400">{filteredTrips.length} records</span>
                  </div>
                </div>
                {/* Row 2: Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <FilterSelect label="Drivers" value={driverFilter} options={['All', ...ALL_DRIVERS]} onChange={v => { setDriverFilter(v); setTripPage(1); }} />
                  <FilterSelect label="Vehicles" value={vehicleFilter} options={['All', ...ALL_VEHICLES]} onChange={v => { setVehicleFilter(v); setTripPage(1); }} />
                  <FilterSelect label="Providers" value={providerFilter} options={PROVIDER_OPTIONS} onChange={v => { setProviderFilter(v); setTripPage(1); }} />
                  <div className="ml-auto">
                    <UnitToggle useKm={useKm} onChange={setUseKm} />
                  </div>
                </div>
              </div>
              {/* Row 3: Search + Showing */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between px-5 py-3 bg-slate-50/80 border-y border-slate-200">
                <div className="relative w-full sm:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" placeholder="Search trips…" value={tripSearch} onChange={e => { setTripSearch(e.target.value); setTripPage(1); }} className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm" />
                </div>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Showing <span className="font-bold text-slate-800">{Math.min(filteredTrips.length, tripPP)}</span> of <span className="font-bold text-slate-800">{filteredTrips.length}</span></span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <SortHeader label="Started" field="startedAt" sortField={tripSortF} sortDir={tripSortD} onSort={sortT} />
                      <th className={`${thCls} text-left`}>Route</th>
                      <SortHeader label="Driver" field="driver" sortField={tripSortF} sortDir={tripSortD} onSort={sortT} />
                      <th className={`${thCls} text-left`}>Vehicle</th>
                      <SortHeader label={`Distance (${dUnit})`} field="distance" sortField={tripSortF} sortDir={tripSortD} onSort={sortT} align="right" />
                      <SortHeader label="Duration" field="duration" sortField={tripSortF} sortDir={tripSortD} onSort={sortT} />
                      <th className={`${thCls} text-right`}>Fuel</th>
                      <SortHeader label={`Avg Speed`} field="avgSpeed" sortField={tripSortF} sortDir={tripSortD} onSort={sortT} align="right" />
                      <th className={`${thCls} text-left`}>Provider</th>
                      <th className={`${thCls} text-center`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paged.map(trip => (
                      <tr key={trip.id} className="hover:bg-blue-50/40 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{fmtDatetime(trip.startedAt).substring(0, 16)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-xs text-slate-700 font-medium truncate max-w-[80px]" title={trip.startLocation?.name}>{trip.startLocation?.name?.split(',')[0] || '—'}</span>
                            <span className="text-slate-300">→</span>
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                            <span className="text-xs text-slate-700 font-medium truncate max-w-[80px]" title={trip.endLocation?.name}>{trip.endLocation?.name?.split(',')[0] || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><div className="font-medium text-slate-900 text-sm">{trip.driver.firstName} {trip.driver.lastName}</div><div className="text-xs text-slate-400">{trip.driver.status}</div></td>
                        <td className="px-4 py-3"><div className="font-medium text-slate-900 text-sm">{trip.vehicle.name}</div><div className="text-xs text-slate-400">{trip.vehicle.make} {trip.vehicle.model}</div></td>
                        <td className="px-4 py-3 text-right"><span className="font-bold text-slate-900">{d(trip.distance)}</span><span className="text-xs text-slate-400 ml-0.5">{dUnit}</span></td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-medium">{fmtDuration(trip.duration)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{trip.fuelConsumed}<span className="text-xs text-slate-400 ml-0.5">gal</span></td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{s(trip.averageSpeed)}<span className="text-xs text-slate-400 ml-0.5">{sUnit}</span></td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600 capitalize">{(trip.provider || '').replace(/-/g, ' ')}</td>
                        <td className="px-4 py-3 text-center"><ViewBtn onClick={(e) => { e.stopPropagation(); setSelected({ item: trip, type: 'trip' }); }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination total={filteredTrips.length} page={tripPage} perPage={tripPP} onPage={setTripPage} onPerPage={v => { setTripPP(v); setTripPage(1); }} />
            </div>
          );
        })()}
      </div>

      {/* Detail Modal */}
      {selected && <DetailModal item={selected.item} type={selected.type} onClose={() => setSelected(null)} useKm={useKm} />}
    </div>
  );
}
