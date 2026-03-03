import { useState, useMemo } from 'react';
import React from 'react';
import { Download, Upload, Clock, Route, Truck, User, ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { HOS_DAILY_LOGS, type HosDailyLog } from './hos.data';
import { StatCard, ViewBtn, DetailModal, fmtMs, fmtDatetime, miToKm } from './hos-components';

const DAILY_TIME_OPTIONS = ['All', '00:00-05:59', '06:00-11:59', '12:00-17:59', '18:00-23:59'];
const DAILY_HOS_HOURS_OPTIONS = ['All', '0-8h', '8-11h', '11h+'];

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

// ── ELD 24-hour Duty Status Chart ─────────────────────────────────────────────
function EldChart({ log, useKm }: { log: HosDailyLog; useKm: boolean }) {
  const dur = log.statusDurations;
  const dayMs = 24 * 3600000; // 24 hours in ms

  // Distribute status across 24-hour timeline proportionally
  // Build segments: each has status + start% + width%
  const statuses: { key: string; label: string; color: string; ms: number }[] = [
    { key: 'offDuty', label: 'Off Duty', color: '#94a3b8', ms: dur.offDuty },
    { key: 'sleeperBed', label: 'Sleeper', color: '#3b82f6', ms: dur.sleeperBed },
    { key: 'driving', label: 'Driving', color: '#f59e0b', ms: dur.driving },
    { key: 'onDuty', label: 'On Duty', color: '#10b981', ms: dur.onDuty },
  ];

  // Build a simple timeline — allocate proportionally across 24h
  const segments: { lane: number; startPct: number; widthPct: number; color: string }[] = [];
  
  // Create a realistic-looking schedule
  let cursor = 0;
  
  // Off duty early morning
  const offDutyEarlyMs = Math.min(dur.offDuty * 0.3, dayMs * 0.15);
  if (offDutyEarlyMs > 0) {
    segments.push({ lane: 0, startPct: 0, widthPct: (offDutyEarlyMs / dayMs) * 100, color: statuses[0].color });
    cursor += offDutyEarlyMs;
  }
  
  // Sleeper early
  const sleeperEarlyMs = Math.min(dur.sleeperBed * 0.6, dayMs * 0.25);
  if (sleeperEarlyMs > 0) {
    segments.push({ lane: 1, startPct: (cursor / dayMs) * 100, widthPct: (sleeperEarlyMs / dayMs) * 100, color: statuses[1].color });
    cursor += sleeperEarlyMs;
  }
  
  // Main driving block
  const drivingMs1 = dur.driving * 0.6;
  if (drivingMs1 > 0) {
    segments.push({ lane: 2, startPct: (cursor / dayMs) * 100, widthPct: (drivingMs1 / dayMs) * 100, color: statuses[2].color });
    cursor += drivingMs1;
  }
  
  // On duty break
  const onDutyMs1 = dur.onDuty * 0.5;
  if (onDutyMs1 > 0) {
    segments.push({ lane: 3, startPct: (cursor / dayMs) * 100, widthPct: (onDutyMs1 / dayMs) * 100, color: statuses[3].color });
    cursor += onDutyMs1;
  }
  
  // Driving block 2
  const drivingMs2 = dur.driving * 0.4;
  if (drivingMs2 > 0) {
    segments.push({ lane: 2, startPct: (cursor / dayMs) * 100, widthPct: (drivingMs2 / dayMs) * 100, color: statuses[2].color });
    cursor += drivingMs2;
  }
  
  // On duty block 2
  const onDutyMs2 = dur.onDuty * 0.5;
  if (onDutyMs2 > 0) {
    segments.push({ lane: 3, startPct: (cursor / dayMs) * 100, widthPct: (onDutyMs2 / dayMs) * 100, color: statuses[3].color });
    cursor += onDutyMs2;
  }
  
  // Sleeper late
  const sleeperLateMs = dur.sleeperBed * 0.4;
  if (sleeperLateMs > 0) {
    segments.push({ lane: 1, startPct: (cursor / dayMs) * 100, widthPct: (sleeperLateMs / dayMs) * 100, color: statuses[1].color });
    cursor += sleeperLateMs;
  }
  
  // Off duty remaining
  const offDutyLateMs = dur.offDuty * 0.7;
  if (offDutyLateMs > 0) {
    segments.push({ lane: 0, startPct: (cursor / dayMs) * 100, widthPct: (offDutyLateMs / dayMs) * 100, color: statuses[0].color });
  }

  // Waiting and yard move distributed as small blocks
  if (dur.waiting > 0) {
    const waitStart = Math.min(cursor, dayMs * 0.85);
    segments.push({ lane: 3, startPct: (waitStart / dayMs) * 100, widthPct: (dur.waiting / dayMs) * 100, color: '#6366f1' });
  }

  const hours = Array.from({ length: 25 }, (_, i) => i);
  const laneLabels = ['Off Duty', 'Sleeper', 'Driving', 'On Duty'];
  const laneColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981'];

  const dist = log.distances;
  const dUnit = useKm ? 'km' : 'mi';
  const dVal = (v: number) => useKm ? miToKm(v) : v;

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Chart Grid */}
      <div className="relative">
        {/* Hour labels at top */}
        <div className="flex border-b border-slate-200" style={{ marginLeft: 100, marginRight: 80 }}>
          {hours.map(h => (
            <div key={h} className="text-[9px] text-slate-400 font-mono text-center" style={{ width: `${100 / 24}%`, minWidth: 0 }}>
              {h === 0 ? 'MID' : h === 12 ? 'NOON' : h}
            </div>
          ))}
        </div>

        {/* Lanes */}
        {laneLabels.map((label, laneIdx) => (
          <div key={label} className="flex items-stretch border-b border-slate-100" style={{ height: 28 }}>
            {/* Lane label */}
            <div className="w-[100px] shrink-0 flex items-center px-3 text-[10px] font-bold text-slate-500 bg-slate-50/80 border-r border-slate-200">
              {label}
            </div>
            {/* Chart area */}
            <div className="flex-1 relative" style={{ background: `repeating-linear-gradient(90deg, transparent, transparent calc(${100/24}% - 1px), #e2e8f0 calc(${100/24}% - 1px), #e2e8f0 calc(${100/24}%))` }}>
              {/* Fill background with lane color at low opacity */}
              <div className="absolute inset-0" style={{ backgroundColor: laneColors[laneIdx], opacity: 0.08 }} />
              {/* Render segments for this lane */}
              {segments.filter(s => s.lane === laneIdx).map((seg, i) => (
                <div key={i} className="absolute top-1 bottom-1 rounded-sm" style={{
                  left: `${Math.min(seg.startPct, 100)}%`,
                  width: `${Math.min(seg.widthPct, 100 - seg.startPct)}%`,
                  backgroundColor: seg.color,
                  opacity: 0.85,
                  minWidth: seg.widthPct > 0.2 ? 2 : 0,
                }} />
              ))}
            </div>
            {/* Totals */}
            <div className="w-[80px] shrink-0 flex items-center justify-end px-2 text-[11px] font-mono font-bold border-l border-slate-200 bg-slate-50/50" style={{ color: laneColors[laneIdx] }}>
              {fmtMs(statuses[laneIdx].ms)}
            </div>
          </div>
        ))}
      </div>

      {/* Legend + Extra info */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-[3px] rounded bg-violet-500 inline-block" style={{ borderTop: '1px dashed #8b5cf6', borderBottom: '1px dashed #8b5cf6' }} /> Personal Conveyance / Yard Moves</span>
          <span className="flex items-center gap-1"><span className="w-3 h-[3px] rounded bg-red-400 inline-block" style={{ borderTop: '1px dashed #f87171', borderBottom: '1px dashed #f87171' }} /> Exemption Mode</span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-medium">
          <span>Distance: <span className="font-bold text-slate-700">{dVal(dist.total)} {dUnit}</span></span>
          {dur.personalConveyance > 0 && <span>PC: <span className="font-bold text-violet-600">{fmtMs(dur.personalConveyance)}</span></span>}
          {dur.yardMove > 0 && <span>YM: <span className="font-bold text-pink-600">{fmtMs(dur.yardMove)}</span></span>}
          {dur.waiting > 0 && <span>Wait: <span className="font-bold text-indigo-600">{fmtMs(dur.waiting)}</span></span>}
        </div>
      </div>
    </div>
  );
}

// ── Unique drivers for filters ──────────────────────────────────────────
const ALL_DRIVERS = [...new Set(HOS_DAILY_LOGS.map(l => `${l.driver.firstName} ${l.driver.lastName}`))].sort();

export function HoursOfServicePage() {
  const [selected, setSelected] = useState<{ item: any; type: 'daily' | 'log' | 'trip' } | null>(null);
  const [useKm, setUseKm] = useState(false);
  const [expandedDaily, setExpandedDaily] = useState<Set<string>>(new Set());

  // Filters
  const [driverFilter, setDriverFilter] = useState('All');
  const [dailyFromDate, setDailyFromDate] = useState('');
  const [dailyToDate, setDailyToDate] = useState('');
  const [dailyTimeSection, setDailyTimeSection] = useState('All');
  const [dailyHosHours, setDailyHosHours] = useState('All');

  // Sort + search state
  const [dailySearch, setDailySearch] = useState('');
  const [dailySortF, setDailySortF] = useState('date');
  const [dailySortD, setDailySortD] = useState<'asc' | 'desc'>('desc');
  const [dailyPage, setDailyPage] = useState(1); const [dailyPP, setDailyPP] = useState(10);

  function toggleSort(f: string, cf: string, cd: 'asc' | 'desc', sf: (v: string) => void, sd: (v: 'asc' | 'desc') => void) {
    if (cf === f) sd(cd === 'asc' ? 'desc' : 'asc'); else { sf(f); sd('desc'); }
  }

  const dUnit = useKm ? 'km' : 'mi';
  const d = (v: number) => useKm ? miToKm(v) : v;
  const toHours = (ms: number) => ms / 3600000;
  const getServiceHours = (log: HosDailyLog) => toHours((log.statusDurations.driving || 0) + (log.statusDurations.onDuty || 0) + (log.statusDurations.waiting || 0) + (log.statusDurations.yardMove || 0) + (log.statusDurations.personalConveyance || 0));
  const getHour = (iso: string) => new Date(iso).getUTCHours();
  const inTimeSection = (iso: string, section: string) => {
    if (section === 'All') return true;
    const hour = getHour(iso);
    if (section === '00:00-05:59') return hour >= 0 && hour < 6;
    if (section === '06:00-11:59') return hour >= 6 && hour < 12;
    if (section === '12:00-17:59') return hour >= 12 && hour < 18;
    if (section === '18:00-23:59') return hour >= 18 && hour < 24;
    return true;
  };
  const inHosHoursBucket = (log: HosDailyLog, bucket: string) => {
    if (bucket === 'All') return true;
    const h = getServiceHours(log);
    if (bucket === '0-8h') return h < 8;
    if (bucket === '8-11h') return h >= 8 && h < 11;
    if (bucket === '11h+') return h >= 11;
    return true;
  };

  // ── Filtered data ──
  const filteredDaily = useMemo(() => {
    let data = [...HOS_DAILY_LOGS];
    if (driverFilter !== 'All') data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}` === driverFilter);
    if (dailyFromDate) data = data.filter(r => r.date >= dailyFromDate);
    if (dailyToDate) data = data.filter(r => r.date <= dailyToDate);
    if (dailyTimeSection !== 'All') data = data.filter(r => inTimeSection(r.metadata?.addedAt || `${r.date}T00:00:00.000Z`, dailyTimeSection));
    if (dailyHosHours !== 'All') data = data.filter(r => inHosHoursBucket(r, dailyHosHours));
    if (dailySearch.trim()) { const q = dailySearch.toLowerCase(); data = data.filter(r => `${r.driver.firstName} ${r.driver.lastName}`.toLowerCase().includes(q) || r.date.includes(q)); }
    return data.sort((a, b) => {
      if (dailySortF === 'date') return dailySortD === 'desc' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      if (dailySortF === 'driving') return dailySortD === 'desc' ? b.statusDurations.driving - a.statusDurations.driving : a.statusDurations.driving - b.statusDurations.driving;
      if (dailySortF === 'onDuty') return dailySortD === 'desc' ? b.statusDurations.onDuty - a.statusDurations.onDuty : a.statusDurations.onDuty - b.statusDurations.onDuty;
      if (dailySortF === 'offDuty') return dailySortD === 'desc' ? b.statusDurations.offDuty - a.statusDurations.offDuty : a.statusDurations.offDuty - b.statusDurations.offDuty;
      if (dailySortF === 'sleeperBed') return dailySortD === 'desc' ? b.statusDurations.sleeperBed - a.statusDurations.sleeperBed : a.statusDurations.sleeperBed - b.statusDurations.sleeperBed;
      if (dailySortF === 'personalConveyance') return dailySortD === 'desc' ? b.statusDurations.personalConveyance - a.statusDurations.personalConveyance : a.statusDurations.personalConveyance - b.statusDurations.personalConveyance;
      if (dailySortF === 'yardMove') return dailySortD === 'desc' ? b.statusDurations.yardMove - a.statusDurations.yardMove : a.statusDurations.yardMove - b.statusDurations.yardMove;
      if (dailySortF === 'waiting') return dailySortD === 'desc' ? b.statusDurations.waiting - a.statusDurations.waiting : a.statusDurations.waiting - b.statusDurations.waiting;
      if (dailySortF === 'distance') return dailySortD === 'desc' ? b.distances.total - a.distances.total : a.distances.total - b.distances.total;
      if (dailySortF === 'driver') return dailySortD === 'desc' ? b.driver.lastName.localeCompare(a.driver.lastName) : a.driver.lastName.localeCompare(b.driver.lastName);
      return 0;
    });
  }, [dailySearch, dailySortF, dailySortD, driverFilter, dailyFromDate, dailyToDate, dailyTimeSection, dailyHosHours]);

  // KPI stats
  const totalDriving = HOS_DAILY_LOGS.reduce((a, l) => a + (l.statusDurations?.driving || 0), 0);
  const totalDist = HOS_DAILY_LOGS.reduce((a, l) => a + (l.distances?.total || 0), 0);
  const activeDrivers = new Set(HOS_DAILY_LOGS.map(l => l.driver.id)).size;
  const totalRecords = HOS_DAILY_LOGS.length;

  const thCls = 'px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider';

  const toggleExpand = (id: string) => {
    setExpandedDaily(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const paged = filteredDaily.slice((dailyPage - 1) * dailyPP, dailyPage * dailyPP);
  const sortD2 = (f: string) => toggleSort(f, dailySortF, dailySortD, setDailySortF, setDailySortD);

  return (
    <div className="flex-1 bg-slate-50 min-h-screen">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hours of Service</h1>
            <p className="text-sm text-gray-500">Track HOS daily logs, duty status, and fleet compliance data.</p>
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
          <StatCard icon={Route} label="Total Distance" value={`${d(Math.round(totalDist)).toLocaleString()} ${dUnit}`} sub="Sum of all daily logs" color="bg-blue-50 text-blue-600" />
          <StatCard icon={User} label="Active Drivers" value={String(activeDrivers)} sub="Unique drivers" color="bg-violet-50 text-violet-600" />
          <StatCard icon={Truck} label="Total Records" value={String(totalRecords)} sub="Daily log entries" color="bg-amber-50 text-amber-600" />
        </div>

        {/* Daily Logs Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Row 1: Title + Upload buttons */}
          <div className="px-5 pt-4 pb-3 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">Daily Logs</h2>
                <span className="text-xs text-slate-400">{filteredDaily.length} records</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm">
                  <Upload size={14} /> Upload Print-Display Logs
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
                  <Upload size={14} /> Upload ELD Data File
                </button>
              </div>
            </div>
            {/* Row 2: Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterSelect label="Drivers" value={driverFilter} options={['All', ...ALL_DRIVERS]} onChange={v => { setDriverFilter(v); setDailyPage(1); }} />
              <input
                type="date"
                value={dailyFromDate}
                onChange={e => { setDailyFromDate(e.target.value); setDailyPage(1); }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm min-h-[36px]"
                title="From Date"
              />
              <input
                type="date"
                value={dailyToDate}
                onChange={e => { setDailyToDate(e.target.value); setDailyPage(1); }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 shadow-sm min-h-[36px]"
                title="To Date"
              />
              <FilterSelect label="Time Sections" value={dailyTimeSection} options={DAILY_TIME_OPTIONS} onChange={v => { setDailyTimeSection(v); setDailyPage(1); }} />
              <FilterSelect label="HOS Hours" value={dailyHosHours} options={DAILY_HOS_HOURS_OPTIONS} onChange={v => { setDailyHosHours(v); setDailyPage(1); }} />
              <button
                onClick={() => { setDriverFilter('All'); setDailyFromDate(''); setDailyToDate(''); setDailyTimeSection('All'); setDailyHosHours('All'); setDailyPage(1); }}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
              >
                Reset
              </button>
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
                  <th className={`${thCls} text-center`} style={{ width: 36 }}></th>
                  <SortHeader label="Date" field="date" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} />
                  <SortHeader label="Driver" field="driver" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} />
                  <SortHeader label="Driving" field="driving" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label="On Duty" field="onDuty" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label="Off Duty" field="offDuty" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label="Sleeper" field="sleeperBed" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label="Personal" field="personalConveyance" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label="Yard Move" field="yardMove" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label="Waiting" field="waiting" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <SortHeader label={`Distance (${dUnit})`} field="distance" sortField={dailySortF} sortDir={dailySortD} onSort={sortD2} align="right" />
                  <th className={`${thCls} text-center`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paged.map(log => {
                  const isExpanded = expandedDaily.has(log.id);
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`hover:bg-blue-50/40 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-blue-50/20' : ''}`} onClick={() => toggleExpand(log.id)}>
                        <td className="px-3 py-3 text-center">
                          <ChevronRightIcon size={14} className={`text-slate-400 transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`} />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900 text-sm">{log.date}</div>
                          <div className="text-xs text-slate-400 font-mono">{fmtDatetime(log.metadata?.addedAt || `${log.date}T00:00:00.000Z`).substring(11, 16)} UTC</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-blue-100 text-blue-700">{log.driver.firstName[0]}</div>
                            <div><div className="font-medium text-slate-900 text-sm">{log.driver.firstName} {log.driver.lastName}</div><div className="text-xs text-slate-400">{log.driver.id}</div></div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-emerald-700 font-semibold">{fmtMs(log.statusDurations.driving)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-amber-700 font-semibold">{fmtMs(log.statusDurations.onDuty)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-700 font-semibold">{fmtMs(log.statusDurations.offDuty)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-indigo-700 font-semibold">{fmtMs(log.statusDurations.sleeperBed)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-violet-700 font-semibold">{fmtMs(log.statusDurations.personalConveyance)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-pink-700 font-semibold">{fmtMs(log.statusDurations.yardMove)}</td>
                        <td className="px-4 py-3.5 text-right font-mono text-xs text-slate-600 font-semibold">{fmtMs(log.statusDurations.waiting)}</td>
                        <td className="px-4 py-3.5 text-right"><span className="font-bold text-slate-900">{d(log.distances.total)}</span><span className="text-xs text-slate-400 ml-0.5">{dUnit}</span></td>
                        <td className="px-4 py-3.5 text-center"><ViewBtn onClick={(e) => { e.stopPropagation(); setSelected({ item: log, type: 'daily' }); }} /></td>
                      </tr>
                      {/* Expanded ELD Chart */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={12} className="px-4 py-3">
                            <EldChart log={log} useKm={useKm} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination total={filteredDaily.length} page={dailyPage} perPage={dailyPP} onPage={setDailyPage} onPerPage={v => { setDailyPP(v); setDailyPage(1); }} />
        </div>
      </div>

      {/* Detail Modal */}
      {selected && <DetailModal item={selected.item} type={selected.type} onClose={() => setSelected(null)} useKm={useKm} />}
    </div>
  );
}
