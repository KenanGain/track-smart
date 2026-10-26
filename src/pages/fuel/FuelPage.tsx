import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, MapPin, X, Plus, Calendar, ArrowUp, ArrowDown, Search, SlidersHorizontal, ChevronLeft, ChevronRight, TrendingUp, Globe, BarChart3, Truck, Fuel, Gauge, LayoutGrid, Route, ShoppingCart, Pencil, Upload, History, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ListPageHeader } from '@/components/ui/ListPageHeader';
import { ListScrollFrame } from '@/components/ui/ListScrollFrame';
import { KpiStatRow, type KpiStat } from '@/components/ui/KpiStatCard';
import { ListHeaderBridge, chipsFromStats, useHeaderChips } from '@/components/ui/list-header-bridge';
import { ScrollBody, usePageChrome } from '@/components/ui/PageChrome';
import {
  ColumnPicker, FilterSelect, FiltersToggle, GroupBySelect, ListToolbar, ResetFilters, SortTh, TableGroupBand, TablePager, ViewSwitch,
  useTableSort, type PickerColumn,
} from '@/components/ui/ListChrome';
import { PIN_TD_ACTIONS, PIN_TH, PIN_TH_ACTIONS, mobileFold } from '@/components/ui/list-chrome';
import { RowActions } from '@/components/ui/RowActions';
import { ShareToChat } from '@/components/share/ShareToChat';
import { activityMeta, type ActivityKind } from '@/components/ui/activity-kinds';
import { currentUserName } from '@/data/users.data';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { INITIAL_ASSETS } from '@/pages/assets/assets.data';
import {
  TRIP_RECORDS, FUEL_PURCHASES, IDLING_EVENTS,
  TRIP_JURISDICTIONS, TRIP_VEHICLES, TRIP_DRIVERS,
  DRIVER_VEHICLE_ASSIGNMENTS,
  type TripRecord, type FuelPurchase, type IdlingEvent, type DriverFuelSummary,
} from './fuel.data';
import { getFuelForCarrier } from './carrier-fuel.data';
import {
  IFTA_SUMMARY_RESULTS,
  IFTA_AVAILABLE_YEARS,
  JURISDICTION_LABELS,
  JURISDICTION_REGION,
  getQuarter,
} from './ifta-summary.data';
import { US_STATES, CA_PROVINCES } from '@/data/geo-data';

// ── Overview trend data ────────────────────────────────────────────────────────
const trendData = [
  { date: 'DEC 07', mpg: 0.1 }, { date: 'DEC 14', mpg: 7.3 },
  { date: 'DEC 21', mpg: 5.9 }, { date: 'DEC 28', mpg: 7.1 },
  { date: 'JAN 04', mpg: 4.8 }, { date: 'JAN 11', mpg: 5.0 },
  { date: 'JAN 18', mpg: 5.8 }, { date: 'JAN 25', mpg: 5.4 },
  { date: 'FEB 01', mpg: 3.6 }, { date: 'FEB 22', mpg: 3.4 },
];

// ── Monthly USD→CAD exchange rates ─────────────────────────────────────────────
const MONTHLY_RATES: Record<string, number> = {
  '2025-01': 1.336, '2025-02': 1.350, '2025-03': 1.343,
  '2025-04': 1.378, '2025-05': 1.362, '2025-06': 1.370,
  '2025-07': 1.381, '2025-08': 1.357, '2025-09': 1.345,
  '2025-10': 1.388, '2025-11': 1.396, '2025-12': 1.401,
  '2026-01': 1.432, '2026-02': 1.418, '2026-03': 1.440,
};


// ── IFTA filter options (derived from ifta-summary.data.ts) ─────────────────────
const IFTA_QUARTER_OPTIONS = [
  { value: '', label: 'None' },
  { value: '1', label: '1 (January-March)' },
  { value: '2', label: '2 (April-June)' },
  { value: '3', label: '3 (July-September)' },
  { value: '4', label: '4 (October-December)' },
];
const IFTA_MONTH_OPTIONS = [
  { value: '', label: 'All Months' },
  { value: '01', label: 'January' }, { value: '02', label: 'February' }, { value: '03', label: 'March' },
  { value: '04', label: 'April' }, { value: '05', label: 'May' }, { value: '06', label: 'June' },
  { value: '07', label: 'July' }, { value: '08', label: 'August' }, { value: '09', label: 'September' },
  { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' },
];
const IFTA_REGIONS = [
  { value: 'All', label: 'All Regions' },
  { value: 'Canada', label: 'Canada' },
  { value: 'US', label: 'United States' },
];
const FUEL_TYPE_OPTIONS = [
  'A55',
  'Biodiesel',
  'Compressed natural gas',
  'Diesel',
  'E-85',
  'Electric',
  'Ethanol',
  'Gasoline',
  'Hydrogen',
  'Hybrid electric',
  'Liquid natural gas',
  'M-85',
  'Methanol',
  'Plug-in hybrid electric',
  'Propane',
  'Other',
] as const;
const KNOWN_FUEL_TYPES = new Set<string>(FUEL_TYPE_OPTIONS);
const CANADA_JURISDICTIONS = new Set<string>(CA_PROVINCES);
const US_JURISDICTIONS = new Set<string>(US_STATES);
/** Convert km to miles */
function kmToMiles(km: number): number { return km * 0.621371; }
/** Convert miles to km */
function milesToKm(mi: number): number { return mi * 1.60934; }

function normalizeFuelType(value: string): (typeof FUEL_TYPE_OPTIONS)[number] {
  const v = value.trim().toLowerCase();
  if (v === 'a55') return 'A55';
  if (v === 'biodiesel') return 'Biodiesel';
  if (v === 'compressed natural gas' || v === 'cng') return 'Compressed natural gas';
  if (v === 'diesel') return 'Diesel';
  if (v === 'e-85' || v === 'e85') return 'E-85';
  if (v === 'electric') return 'Electric';
  if (v === 'ethanol') return 'Ethanol';
  if (v === 'gasoline' || v === 'petrol') return 'Gasoline';
  if (v === 'hydrogen') return 'Hydrogen';
  if (v === 'hybrid electric' || v === 'hybrid' || v === 'diesel/electric' || v === 'diesel electric') return 'Hybrid electric';
  if (v === 'liquid natural gas' || v === 'lng') return 'Liquid natural gas';
  if (v === 'm-85' || v === 'm85') return 'M-85';
  if (v === 'methanol') return 'Methanol';
  if (v === 'plug-in hybrid electric' || v === 'plug in hybrid electric' || v === 'phev') return 'Plug-in hybrid electric';
  if (v === 'propane' || v === 'lpg') return 'Propane';
  if (v === 'other') return 'Other';
  return 'Other';
}

// ── Sort options ───────────────────────────────────────────────────────────────


// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}
function fmtDuration(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Driver Avatar ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600', 'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
];
function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}
function DriverAvatar({ name }: { name: string }) {
  const colorClass = AVATAR_COLORS[name.length % AVATAR_COLORS.length];
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${colorClass} shrink-0`}>
      {getInitials(name)}
    </div>
  );
}


// ── Sortable Table Header ──────────────────────────────────────────────────────
function SortHeader({ label, field, sortField, sortDir, onSort, align = 'left' }: {
  label: React.ReactNode; field: string; sortField: string; sortDir: 'asc' | 'desc';
  onSort: (f: string) => void; align?: 'left' | 'right' | 'center';
}) {
  const active = sortField === field;
  return (
    <th className={`px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-${align} cursor-pointer select-none hover:text-slate-700 transition-colors group`}
      onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`}>
          {active && sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </span>
      </span>
    </th>
  );
}

// ── Inline Toolbar (search + column toggle) ────────────────────────────────────
interface ColDef { id: string; label: string; visible: boolean }
function InlineToolbar({ search, onSearch, placeholder, columns, onToggle, total, perPage, children }: {
  search: string; onSearch: (v: string) => void; placeholder?: string;
  columns: ColDef[]; onToggle: (id: string) => void;
  total: number; perPage: number; children?: React.ReactNode;
}) {
  const [colMenu, setColMenu] = useState(false);
  const colRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (colRef.current && !colRef.current.contains(e.target as Node)) setColMenu(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3 bg-slate-50/80 border-b border-slate-200">
      <div className="relative w-full sm:w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder={placeholder || 'Search...'} value={search} onChange={e => onSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm" />
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        {children}
        <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
          Showing <span className="font-bold text-slate-800">{Math.min(total, perPage)}</span> of <span className="font-bold text-slate-800">{total}</span>
        </span>
        <div className="relative" ref={colRef}>
          <button onClick={() => setColMenu(!colMenu)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm shrink-0 transition-colors">
            <SlidersHorizontal size={14} /> Columns
          </button>
          {colMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5 max-h-64 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Show Columns</p>
              {columns.map(c => (
                <label key={c.id} className="flex items-center px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-xs">
                  <input type="checkbox" checked={c.visible} onChange={() => onToggle(c.id)}
                    className="mr-2 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                  <span className="text-slate-700">{c.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline Pagination ──────────────────────────────────────────────────────────
function InlinePagination({ total, page, perPage, onPage, onPerPage }: {
  total: number; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (r: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{start}–{end} of {total}</span>
        <div className="flex items-center gap-1.5">
          <span>Rows:</span>
          <select value={perPage} onChange={e => onPerPage(Number(e.target.value))}
            className="border border-slate-200 rounded px-1.5 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 bg-white transition-colors">
          <ChevronLeft size={14} />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => { if (totalPages <= 5) return true; if (p === 1 || p === totalPages) return true; return Math.abs(p - page) <= 1; })
          .reduce<(number | '...')[]>((acc, p, idx, arr) => { if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('...'); acc.push(p); return acc; }, [])
          .map((p, idx) => p === '...'
            ? <span key={`e-${idx}`} className="px-1 text-xs text-slate-400">…</span>
            : <button key={p} onClick={() => onPage(p as number)}
                className={`min-w-[28px] h-7 flex items-center justify-center border rounded text-xs font-semibold transition-colors ${page === p ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {p}
              </button>
          )}
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
          className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 bg-white transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Date Range Filter ──────────────────────────────────────────────────────────
function DateRangeFilter({ from, to, onFrom, onTo }: {
  from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Calendar size={14} className="text-slate-400" />
      <input type="date" value={from} onChange={e => onFrom(e.target.value)}
        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[130px]" />
      <span className="text-xs text-slate-400">to</span>
      <input type="date" value={to} onChange={e => onTo(e.target.value)}
        className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 w-[130px]" />
    </div>
  );
}

// ── Detail row component ───────────────────────────────────────────────────────
function DetailRow({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-50">
      <span className="text-slate-500 text-sm font-medium">{label}</span>
      <span className={`text-sm font-bold ${accent ? 'text-blue-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

// ── Modal overlay ──────────────────────────────────────────────────────────────
function ModalOverlay({ title, onClose, children, footer }: {
  title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Form input helper ──────────────────────────────────────────────────────────
function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500";

// ── Tab type ───────────────────────────────────────────────────────────────────
type TabId = 'overview' | 'vehicles' | 'ifta' | 'trips' | 'purchases' | 'idling' | 'activity';
const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'vehicles', label: 'Vehicles', icon: Truck },
  { id: 'ifta', label: 'IFTA Summary', icon: Globe },
  { id: 'purchases', label: 'Fuel Purchases', icon: ShoppingCart },
  { id: 'activity', label: 'Activity', icon: History },
];

// ═══════════════════════════════════════════════════════════════════════════════
// VEHICLES TAB — the fleet's mileage, as the app's standard list
// ═══════════════════════════════════════════════════════════════════════════════

type VehCol = 'vehicle' | 'fuelType' | 'efficiency' | 'distance' | 'months';
const VEH_COLUMNS: PickerColumn<VehCol>[] = [
  { id: 'vehicle', label: 'Vehicle', locked: true },
  { id: 'fuelType', label: 'Fuel type' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'distance', label: 'Distance' },
  { id: 'months', label: 'Months' },
];
type VehGroup = 'none' | 'fuelType' | 'make';
const VEH_GROUPS: { id: VehGroup; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'fuelType', label: 'Group: Fuel type' },
  { id: 'make', label: 'Group: Make' },
];
const MONTH_NAMES_V = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmtMonthFullV = (m: string) => { const [yr, mm] = m.split('-').map(Number); return `${MONTH_NAMES_V[mm-1]} ${yr}`; };

interface VMthJur { code: string; name: string; region: string; distKm: number }
interface VMth { month: string; distKm: number; jurisdictions: Map<string, VMthJur> }
interface VAgg { name: string; make: string; model: string; year: number; fuelType: string; fuelEfficiency: number | null; fuelTankCapacity: number | null; totalKm: number; months: Map<string, VMth> }
export interface VehicleRow extends VAgg {
  totalMi: number;
  monthBreakdown: { month: string; distKm: number; distMi: number; label: string; jurBreakdown: (VMthJur & { distMi: number })[] }[];
}

const ListTD = ({ children, className, onClick, colSpan }: { children?: React.ReactNode; className?: string; onClick?: (e: React.MouseEvent) => void; colSpan?: number }) => (
  <td onClick={onClick} colSpan={colSpan} className={cn('px-4 py-2.5 text-sm align-middle whitespace-nowrap', className)}>{children}</td>
);

function FuelVehiclesTab({ year, setYear, quarter, setQuarter, month, setMonth, region, setRegion, fuelType, setFuelType, distanceUnit, setDistanceUnit, scrollRef, onScroll, onShare, onLogPurchase, onOpenAssets }: {
  year: number; setYear: (y: number) => void;
  quarter: string; setQuarter: (q: string) => void;
  month: string; setMonth: (m: string) => void;
  region: string; setRegion: (r: string) => void;
  fuelType: string; setFuelType: (f: string) => void;
  distanceUnit: 'mi' | 'km'; setDistanceUnit: (u: 'mi' | 'km') => void;
  scrollRef?: React.Ref<HTMLDivElement>;
  onScroll?: React.UIEventHandler<HTMLDivElement>;
  onShare: (v: VehicleRow) => void;
  onLogPurchase: (v: VehicleRow) => void;
  onOpenAssets?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<VehGroup>('none');
  const [visible, setVisible] = useState<Set<VehCol>>(() => new Set(VEH_COLUMNS.map(c => c.id)));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedMonth, setExpandedMonth] = useState<Set<string>>(new Set());

  const displayFromKm = (km: number) => distanceUnit === 'mi' ? kmToMiles(km) : km;
  const formatDistance = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const effLabel = distanceUnit === 'mi' ? 'MPG' : 'km/L';
  const toEff = (mpg: number) => distanceUnit === 'mi' ? mpg : mpg * 0.425144;

  // ── Build vehicle-centric aggregation from IFTA data ──
  const vehFiltered = useMemo(() => IFTA_SUMMARY_RESULTS.filter(r => {
    const [y, m] = r.month.split('-').map(Number);
    if (y !== year) return false;
    if (quarter && getQuarter(r.month) !== Number(quarter)) return false;
    if (month && m !== Number(month)) return false;
    const reg = JURISDICTION_REGION[r.jurisdiction];
    if (region !== 'All' && reg !== region) return false;
    if (fuelType !== 'All' && normalizeFuelType(r.vehicle.fuelType) !== fuelType) return false;
    return true;
  }), [year, quarter, month, region, fuelType]);

  const rows = useMemo<VehicleRow[]>(() => {
    const vehMap = new Map<string, VAgg>();
    for (const r of vehFiltered) {
      const key = r.vehicle.name;
      const cur = vehMap.get(key) || { name: r.vehicle.name, make: r.vehicle.make, model: r.vehicle.model, year: r.vehicle.year, fuelType: normalizeFuelType(r.vehicle.fuelType), fuelEfficiency: r.vehicle.fuelEfficiency, fuelTankCapacity: r.vehicle.fuelTankCapacity, totalKm: 0, months: new Map<string, VMth>() };
      cur.totalKm += r.distance;
      const mCur = cur.months.get(r.month) || { month: r.month, distKm: 0, jurisdictions: new Map<string, VMthJur>() };
      mCur.distKm += r.distance;
      const jCur = mCur.jurisdictions.get(r.jurisdiction) || { code: r.jurisdiction, name: JURISDICTION_LABELS[r.jurisdiction] || r.jurisdiction, region: JURISDICTION_REGION[r.jurisdiction] || 'US', distKm: 0 };
      jCur.distKm += r.distance;
      mCur.jurisdictions.set(r.jurisdiction, jCur);
      cur.months.set(r.month, mCur);
      vehMap.set(key, cur);
    }
    return [...vehMap.values()].map(v => ({
      ...v,
      totalMi: Math.round(kmToMiles(v.totalKm)),
      monthBreakdown: [...v.months.values()]
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(m => ({ ...m, distMi: Math.round(kmToMiles(m.distKm)), label: fmtMonthFullV(m.month),
          jurBreakdown: [...m.jurisdictions.values()].map(j => ({ ...j, distMi: Math.round(kmToMiles(j.distKm)) })).sort((a, b) => b.distMi - a.distMi) })),
    })).sort((a, b) => b.totalMi - a.totalMi);
  }, [vehFiltered]);

  const totalVehKm = rows.reduce((s, v) => s + v.totalKm, 0);
  const withEff = rows.filter(v => v.fuelEfficiency);
  const avgMpg = withEff.length ? withEff.reduce((s, v) => s + (v.fuelEfficiency || 0), 0) / withEff.length : 0;
  const uniqueJurCount = new Set(vehFiltered.map(r => r.jurisdiction)).size;
  const stats: KpiStat[] = [
    { id: 'vehicles', label: 'Fleet vehicles', value: rows.length, Icon: Truck, accent: 'blue' },
    { id: 'distance', label: `Total distance (${distanceUnit})`, value: formatDistance(displayFromKm(totalVehKm)), Icon: Route, accent: 'emerald' },
    { id: 'eff', label: `Avg. efficiency (${effLabel})`, value: toEff(avgMpg).toFixed(1), Icon: Gauge, accent: 'amber' },
    { id: 'jur', label: 'Jurisdictions', value: uniqueJurCount, Icon: Globe, accent: 'violet' },
  ];
  useHeaderChips(chipsFromStats(stats));

  const q = search.trim().toLowerCase();
  const searched = rows.filter(v => !q || [v.name, v.make, v.model, String(v.year), v.fuelType].some(x => x.toLowerCase().includes(q)));
  const readers = useMemo(() => ({
    vehicle: (v: VehicleRow) => v.name,
    fuelType: (v: VehicleRow) => v.fuelType,
    efficiency: (v: VehicleRow) => v.fuelEfficiency ?? 0,
    distance: (v: VehicleRow) => v.totalKm,
    months: (v: VehicleRow) => v.monthBreakdown.length,
  }), []);
  const { sort, onSort, sorted } = useTableSort<VehCol, VehicleRow>(searched, readers, { col: 'distance', dir: 'desc' });
  const groupOf = (v: VehicleRow): string | null => groupBy === 'fuelType' ? (v.fuelType || 'Unknown') : groupBy === 'make' ? v.make : null;
  const grouped = groupBy === 'none' ? sorted : [...sorted].map((v, i) => ({ v, i })).sort((x, y) => (groupOf(x.v)!).localeCompare(groupOf(y.v)!) || x.i - y.i).map(x => x.v);
  const groupCounts = new Map<string, number>();
  if (groupBy !== 'none') grouped.forEach(v => { const l = groupOf(v)!; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });
  const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
  const show = (c: VehCol) => visible.has(c);
  const colCount = VEH_COLUMNS.filter(c => c.locked || visible.has(c.id)).length + 2;
  const filterCount = [year !== 2026, !!quarter, !!month, region !== 'All', fuelType !== 'All', groupBy !== 'none'].filter(Boolean).length;
  const touched = filterCount > 0 || !!q;
  const reset = () => { setSearch(''); setYear(2026); setQuarter(''); setMonth(''); setRegion('All'); setFuelType('All'); setGroupBy('none'); setPage(1); };
  const toggle = (key: string) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleMonth = (key: string) => setExpandedMonth(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const monthOptions = (quarter ? [((Number(quarter)-1)*3)+1, ((Number(quarter)-1)*3)+2, ((Number(quarter)-1)*3)+3] : [1,2,3,4,5,6,7,8,9,10,11,12]).map(m => MONTH_NAMES_V[m-1]);
  const fuelTone = (ft: string) => ft?.toLowerCase() === 'diesel' ? 'bg-amber-50 text-amber-700 border-amber-200' : ft?.toLowerCase() === 'gasoline' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200';

  return (
    <ListScrollFrame
      above={<KpiStatRow stats={stats} />}
      title="Vehicle mileage breakdown"
      count={grouped.length}
      total={rows.length}
      description={<>Distance by vehicle for the period, with each month and jurisdiction underneath — click a row to open its breakdown. Showing {year}{quarter ? ` Q${quarter}` : ''}{month ? ` · ${MONTH_NAMES_V[Number(month) - 1]}` : ''} · {region === 'All' ? 'all regions' : region} · {fuelType === 'All' ? 'all fuel types' : fuelType}.</>}
      actions={<>
        <ViewSwitch value={distanceUnit} onChange={setDistanceUnit} options={[{ id: 'mi', label: 'mi' }, { id: 'km', label: 'km' }]} />
        <ColumnPicker columns={VEH_COLUMNS} visible={visible} onToggle={(id) => setVisible(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />
      </>}
      scrollRef={scrollRef} onScroll={onScroll} contentKey={`${filtersOpen}|${slice.length}|${expanded.size}|${expandedMonth.size}`}
      toolbar={
        <ListToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search unit, make, model…"
          filters={<div className={mobileFold(filtersOpen)}>
            <FilterSelect value={String(year)} onChange={(v) => { setYear(Number(v) || 2026); setPage(1); }} title="Year" allLabel="2026" options={IFTA_AVAILABLE_YEARS.filter(y => y !== 2026).map(String)} />
            <FilterSelect value={quarter ? `Q${quarter}` : ''} onChange={(v) => { setQuarter(v ? v.slice(1) : ''); setMonth(''); setPage(1); }} title="Quarter" allLabel="All quarters" options={['Q1', 'Q2', 'Q3', 'Q4']} />
            <FilterSelect value={month ? MONTH_NAMES_V[Number(month) - 1] : ''} onChange={(v) => { setMonth(v ? String(MONTH_NAMES_V.indexOf(v) + 1) : ''); setPage(1); }} title="Month" allLabel="All months" options={monthOptions} />
            <FilterSelect value={region === 'All' ? '' : region === 'US' ? 'United States' : 'Canada'} onChange={(v) => { setRegion(v === 'United States' ? 'US' : v === 'Canada' ? 'Canada' : 'All'); setPage(1); }} title="Region" allLabel="All regions" options={['United States', 'Canada']} />
            <FilterSelect value={fuelType === 'All' ? '' : fuelType} onChange={(v) => { setFuelType(v || 'All'); setPage(1); }} title="Fuel type" allLabel="All fuel types" options={[...FUEL_TYPE_OPTIONS]} />
          </div>}
          filtersExtra={<>
            <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
            <div className={mobileFold(filtersOpen)}>
              <GroupBySelect value={groupBy} onChange={(g) => { setGroupBy(g); setPage(1); }} options={VEH_GROUPS} />
              <ResetFilters on={touched} onReset={reset} />
            </div>
          </>} />
      }
      footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
    >
      <table className="w-full">
        <thead>
          <tr>
            <th className={cn(PIN_TH, 'w-8 px-2')} />
            <SortTh col="vehicle" label="Vehicle" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            {show('fuelType') && <SortTh col="fuelType" label="Fuel type" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('efficiency') && <SortTh col="efficiency" label={`Efficiency (${effLabel})`} sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('distance') && <SortTh col="distance" label={`Distance (${distanceUnit})`} sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('months') && <SortTh col="months" label="Months" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            <SortTh label="Actions" sort={sort} className={PIN_TH_ACTIONS} />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slice.length === 0 && (
            <tr><td colSpan={colCount} className="px-6 py-14 text-center">
              <Truck className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No vehicle records for the selected filters</p>
              <p className="mt-1 text-xs text-slate-500">Try another year, quarter, month, region or fuel type.</p>
              {touched && <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>}
            </td></tr>
          )}
          {slice.map((row, i) => {
            const g = groupOf(row);
            const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
            const isExpanded = expanded.has(row.name);
            return (
              <React.Fragment key={row.name}>
                {g && prev !== g && <TableGroupBand label={g} count={groupCounts.get(g) ?? 0} colSpan={colCount} />}
                <tr className={cn('group cursor-pointer transition-colors hover:bg-slate-50', isExpanded && 'bg-blue-50/30')} onClick={() => toggle(row.name)}>
                  <ListTD className="px-2 text-center"><ChevronRight size={14} className={cn('inline-block text-slate-400 transition-transform duration-200', isExpanded && 'rotate-90')} /></ListTD>
                  <ListTD>
                    <div className="flex items-center gap-2.5" title={`${row.name} · ${row.make} ${row.model} ${row.year}`}>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600"><Truck size={14} /></span>
                      <span className="font-semibold text-slate-900">{row.name}</span>
                      <span className="text-xs text-slate-500">· {row.make} {row.model} · {row.year}</span>
                    </div>
                  </ListTD>
                  {show('fuelType') && <ListTD><span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold', fuelTone(row.fuelType))}><Fuel size={10} /> {row.fuelType || '—'}</span></ListTD>}
                  {show('efficiency') && <ListTD className="font-mono text-[13px] text-slate-600">{row.fuelEfficiency ? `${toEff(row.fuelEfficiency).toFixed(1)} ${effLabel}` : '—'}</ListTD>}
                  {show('distance') && <ListTD className="font-mono text-[13px] font-bold text-slate-900">{formatDistance(displayFromKm(row.totalKm))}</ListTD>}
                  {show('months') && <ListTD className="font-mono text-[13px] font-semibold text-slate-700">{row.monthBreakdown.length}</ListTD>}
                  <ListTD className={PIN_TD_ACTIONS} onClick={(e) => e.stopPropagation()}>
                    <RowActions noun="vehicle" name={row.name} openLabel={isExpanded ? 'Hide breakdown' : 'View breakdown'} onOpen={() => toggle(row.name)}
                      onShare={() => onShare(row)}
                      extra={[
                        { label: 'Log fuel purchase', icon: Plus, onClick: () => onLogPurchase(row) },
                        ...(onOpenAssets ? [{ label: 'Open in Assets', icon: ExternalLink, onClick: onOpenAssets }] : []),
                      ]} />
                  </ListTD>
                </tr>
                {isExpanded && row.monthBreakdown.map((m) => {
                  const mKey = `${row.name}|||${m.month}`;
                  const isM = expandedMonth.has(mKey);
                  return (
                    <React.Fragment key={mKey}>
                      <tr className={cn('cursor-pointer select-none transition-colors', isM ? 'bg-blue-50/30' : 'bg-slate-50/50 hover:bg-slate-100/40')} style={{ borderLeft: '4px solid #93c5fd' }} onClick={(e) => { e.stopPropagation(); toggleMonth(mKey); }}>
                        <ListTD className="px-2 text-center"><ChevronRight size={12} className={cn('inline-block text-slate-400 transition-transform duration-200', isM && 'rotate-90')} /></ListTD>
                        <ListTD colSpan={colCount - 3}>
                          <span className="inline-flex items-center gap-2 pl-3"><Calendar size={13} className="text-blue-400" /><span className="text-[13px] font-semibold text-slate-700">{m.label}</span><span className="text-[11px] text-slate-400">· {m.jurBreakdown.length} jurisdiction{m.jurBreakdown.length !== 1 ? 's' : ''}</span></span>
                        </ListTD>
                        <ListTD className="font-mono text-[13px] font-semibold text-slate-700">{formatDistance(displayFromKm(m.distKm))}</ListTD>
                        <ListTD className={PIN_TD_ACTIONS} />
                      </tr>
                      {isM && m.jurBreakdown.map((j) => (
                        <tr key={`${mKey}-${j.code}`} className="bg-white hover:bg-slate-50/60" style={{ borderLeft: '8px solid #bfdbfe' }}>
                          <ListTD className="px-2" />
                          <ListTD colSpan={colCount - 3}>
                            <span className="inline-flex items-center gap-2 pl-6">
                              <span className={cn('inline-flex h-5 w-7 items-center justify-center rounded border text-[10px] font-bold leading-none', j.region === 'Canada' ? 'border-red-200 bg-red-50 text-red-600' : 'border-blue-200 bg-blue-50 text-blue-600')}>{j.code}</span>
                              <span className="text-[12px] font-medium text-slate-700">{j.name}</span>
                              <span className="text-[11px] text-slate-400">{j.region === 'Canada' ? '· Canada' : '· United States'}</span>
                            </span>
                          </ListTD>
                          <ListTD className="font-mono text-[12px] font-semibold text-slate-700">{formatDistance(displayFromKm(j.distKm))}</ListTD>
                          <ListTD className={PIN_TD_ACTIONS} />
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        {slice.length > 0 && (
          <tfoot className="border-t-2 border-slate-200 bg-slate-50">
            <tr>
              <td className="px-2 py-2.5" />
              <td className="px-4 py-2.5 text-[13px] font-bold text-slate-900" colSpan={colCount - 3}>Total ({rows.length} vehicles)</td>
              <td className="px-4 py-2.5 font-mono text-[13px] font-bold text-slate-900">{formatDistance(displayFromKm(totalVehKm))}</td>
              <td className={cn('px-4 py-2.5', PIN_TD_ACTIONS)} />
            </tr>
          </tfoot>
        )}
      </table>
    </ListScrollFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITY TAB — what happened on this page, and what the data records
// ═══════════════════════════════════════════════════════════════════════════════

/** Something done on this page — kept per carrier so the tab survives a reload. */
export interface FuelLogEntry { id: string; at: string; kind: ActivityKind; title: string; detail?: string; vehicle?: string; by: string }
const FUEL_LOG_KEY = 'fuel-activity-log-v1';
function readFuelLog(accountId?: string): FuelLogEntry[] {
  try { const all = JSON.parse(localStorage.getItem(FUEL_LOG_KEY) || '{}') as Record<string, FuelLogEntry[]>; return all[accountId ?? '_'] ?? []; } catch { return []; }
}
function writeFuelLog(accountId: string | undefined, entries: FuelLogEntry[]): void {
  try { const all = JSON.parse(localStorage.getItem(FUEL_LOG_KEY) || '{}') as Record<string, FuelLogEntry[]>; all[accountId ?? '_'] = entries.slice(0, 500); localStorage.setItem(FUEL_LOG_KEY, JSON.stringify(all)); } catch { /* private window */ }
}

type ActType = 'Fuel purchase' | 'Trip' | 'Idling event' | 'Page action';
interface ActRow { id: string; at: string; type: ActType; kind: ActivityKind; title: string; detail?: string; vehicle: string; driver: string }
type ActCol = 'when' | 'activity' | 'vehicle' | 'driver' | 'details';
const ACT_COLUMNS: PickerColumn<ActCol>[] = [
  { id: 'when', label: 'When', locked: true },
  { id: 'activity', label: 'Activity', locked: true },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'driver', label: 'Driver' },
  { id: 'details', label: 'Details' },
];
type ActGroup = 'none' | 'type' | 'vehicle' | 'day';
const ACT_GROUPS: { id: ActGroup; label: string }[] = [
  { id: 'none', label: 'No grouping' },
  { id: 'type', label: 'Group: Type' },
  { id: 'vehicle', label: 'Group: Vehicle' },
  { id: 'day', label: 'Group: Day' },
];
const ACT_TYPES: ActType[] = ['Fuel purchase', 'Trip', 'Idling event', 'Page action'];
const fmtWhenAct = (iso: string) => { const d = new Date(iso); return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + (iso.length > 10 ? ` · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''); };

function FuelActivityTab({ log, purchases, trips, idling, scrollRef, onScroll }: {
  log: FuelLogEntry[]; purchases: FuelPurchase[]; trips: TripRecord[]; idling: IdlingEvent[];
  scrollRef?: React.Ref<HTMLDivElement>; onScroll?: React.UIEventHandler<HTMLDivElement>;
}) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [groupBy, setGroupBy] = useState<ActGroup>('none');
  const [visible, setVisible] = useState<Set<ActCol>>(() => new Set(ACT_COLUMNS.map(c => c.id)));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const all = useMemo<ActRow[]>(() => [
    ...log.map(e => ({ id: e.id, at: e.at, type: 'Page action' as ActType, kind: e.kind, title: e.title, detail: e.detail, vehicle: e.vehicle ?? '', driver: e.by })),
    ...purchases.map(p => ({ id: `p-${p.id}`, at: p.date, type: 'Fuel purchase' as ActType, kind: 'recorded' as ActivityKind, title: `Fuel purchase · ${p.gallons.toFixed(1)} gal ${p.fuelType}`, detail: `$${p.totalCost.toFixed(2)} at ${p.location}`, vehicle: p.unitNumber, driver: p.driverName })),
    ...trips.map(t => ({ id: `t-${t.id}`, at: t.date, type: 'Trip' as ActType, kind: 'recorded' as ActivityKind, title: `Trip · ${t.jurisdiction}`, detail: `${Math.round(t.totalDistance).toLocaleString()} mi`, vehicle: t.unitNumber, driver: t.driverName })),
    ...idling.map(e => ({ id: `i-${e.id}`, at: e.date, type: 'Idling event' as ActType, kind: 'warning' as ActivityKind, title: `Idling · ${fmtDuration(e.durationMinutes)}`, detail: `${e.fuelWastedGal.toFixed(1)} gal wasted · ${e.reason || e.location}`, vehicle: e.unitNumber, driver: e.driverName })),
  ].sort((a, b) => b.at.localeCompare(a.at)), [log, purchases, trips, idling]);

  const stats: KpiStat[] = [
    { id: 'all', label: 'Activity', value: all.length, Icon: History, accent: 'blue' },
    { id: 'Fuel purchase', label: 'Fuel purchases', value: purchases.length, Icon: ShoppingCart, accent: 'emerald' },
    { id: 'Trip', label: 'Trips', value: trips.length, Icon: Route, accent: 'violet' },
    { id: 'Idling event', label: 'Idling events', value: idling.length, Icon: Gauge, accent: 'amber' },
  ];
  const pickKpi = (id: string) => { setPage(1); setType(id === 'all' || type === id ? '' : id); };
  useHeaderChips(chipsFromStats(stats, type || 'all', pickKpi));

  const vehicles = useMemo(() => [...new Set(all.map(a => a.vehicle).filter(Boolean))].sort(), [all]);
  const q = search.trim().toLowerCase();
  const rows = all.filter(a => {
    if (type && a.type !== type) return false;
    if (vehicle && a.vehicle !== vehicle) return false;
    return !q || [a.title, a.detail, a.vehicle, a.driver].some(x => x?.toLowerCase().includes(q));
  });
  const readers = useMemo(() => ({
    when: (a: ActRow) => a.at, activity: (a: ActRow) => a.title, vehicle: (a: ActRow) => a.vehicle, driver: (a: ActRow) => a.driver, details: (a: ActRow) => a.detail ?? '',
  }), []);
  const { sort, onSort, sorted } = useTableSort<ActCol, ActRow>(rows, readers, { col: 'when', dir: 'desc' });
  const groupOf = (a: ActRow): string | null => groupBy === 'type' ? a.type : groupBy === 'vehicle' ? (a.vehicle || 'No vehicle') : groupBy === 'day' ? a.at.slice(0, 10) : null;
  const grouped = groupBy === 'none' ? sorted : [...sorted].map((a, i) => ({ a, i })).sort((x, y) => (groupBy === 'day' ? groupOf(y.a)!.localeCompare(groupOf(x.a)!) : groupOf(x.a)!.localeCompare(groupOf(y.a)!)) || x.i - y.i).map(x => x.a);
  const groupCounts = new Map<string, number>();
  if (groupBy !== 'none') grouped.forEach(a => { const l = groupOf(a)!; groupCounts.set(l, (groupCounts.get(l) ?? 0) + 1); });
  const pages = Math.max(1, Math.ceil(grouped.length / pageSize));
  const safePage = Math.min(page, pages);
  const slice = grouped.slice((safePage - 1) * pageSize, safePage * pageSize);
  const show = (c: ActCol) => visible.has(c);
  const colCount = ACT_COLUMNS.filter(c => c.locked || visible.has(c.id)).length;
  const filterCount = [!!type, !!vehicle, groupBy !== 'none'].filter(Boolean).length;
  const touched = filterCount > 0 || !!q;
  const reset = () => { setSearch(''); setType(''); setVehicle(''); setGroupBy('none'); setPage(1); };

  return (
    <ListScrollFrame
      above={<KpiStatRow stats={stats} activeId={type || 'all'} onPick={pickKpi} />}
      title="Activity log"
      count={grouped.length}
      total={all.length}
      description="Everything recorded for this carrier's fuel — purchases, trips and idling events as they were logged, and what was done on this page."
      actions={<ColumnPicker columns={ACT_COLUMNS} visible={visible} onToggle={(id) => setVisible(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; })} />}
      scrollRef={scrollRef} onScroll={onScroll} contentKey={`${filtersOpen}|${slice.length}`}
      toolbar={
        <ListToolbar search={search} onSearch={(v) => { setSearch(v); setPage(1); }} placeholder="Search activity, vehicle, driver…"
          filters={<div className={mobileFold(filtersOpen)}>
            <FilterSelect value={type} onChange={(v) => { setType(v); setPage(1); }} title="Type" allLabel="All types" options={ACT_TYPES} />
            <FilterSelect value={vehicle} onChange={(v) => { setVehicle(v); setPage(1); }} title="Vehicle" allLabel="All vehicles" options={vehicles} />
          </div>}
          filtersExtra={<>
            <FiltersToggle open={filtersOpen} onToggle={() => setFiltersOpen(o => !o)} count={filterCount} />
            <div className={mobileFold(filtersOpen)}>
              <GroupBySelect value={groupBy} onChange={(g) => { setGroupBy(g); setPage(1); }} options={ACT_GROUPS} />
              <ResetFilters on={touched} onReset={reset} />
            </div>
          </>} />
      }
      footer={<TablePager page={safePage} pageSize={pageSize} total={grouped.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />}
    >
      <table className="w-full">
        <thead>
          <tr>
            <SortTh col="when" label="When" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            <SortTh col="activity" label="Activity" sortable sort={sort} onSort={onSort} className={PIN_TH} />
            {show('vehicle') && <SortTh col="vehicle" label="Vehicle" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('driver') && <SortTh col="driver" label="Driver / by" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
            {show('details') && <SortTh col="details" label="Details" sortable sort={sort} onSort={onSort} className={PIN_TH} />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {slice.length === 0 && (
            <tr><td colSpan={colCount} className="px-6 py-14 text-center">
              <History className="mx-auto h-7 w-7 text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">{all.length ? 'Nothing matches' : 'No activity yet'}</p>
              {touched && <button type="button" onClick={reset} className="mt-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Clear filters</button>}
            </td></tr>
          )}
          {slice.map((a, i) => {
            const g = groupOf(a);
            const prev = i === 0 || !g ? null : groupOf(slice[i - 1]);
            const meta = activityMeta(a.kind);
            const KIcon = meta.icon;
            return (
              <React.Fragment key={a.id}>
                {g && prev !== g && <TableGroupBand label={groupBy === 'day' ? fmtWhenAct(g) : g} count={groupCounts.get(g) ?? 0} colSpan={colCount} />}
                <tr className="transition-colors hover:bg-slate-50">
                  <ListTD className="text-[13px] text-slate-600">{fmtWhenAct(a.at)}</ListTD>
                  <ListTD>
                    <span className="inline-flex items-center gap-2">
                      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white', meta.dot)}><KIcon size={12} /></span>
                      <span className="font-medium text-slate-900">{a.title}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">{a.type}</span>
                    </span>
                  </ListTD>
                  {show('vehicle') && <ListTD className="text-[13px] text-slate-700">{a.vehicle ? <span className="inline-flex items-center gap-1.5"><Truck size={13} className="text-slate-400" /> {a.vehicle}</span> : <span className="text-slate-300">—</span>}</ListTD>}
                  {show('driver') && <ListTD className="text-[13px] text-slate-700">{a.driver || <span className="text-slate-300">—</span>}</ListTD>}
                  {show('details') && <ListTD className="max-w-[24rem] truncate text-[13px] text-slate-500"><span title={a.detail}>{a.detail || '—'}</span></ListTD>}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </ListScrollFrame>
  );
}

/** CSV download of whatever the tab is showing. */
function downloadCsv(name: string, rows: (string | number)[][]): void {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
// FuelPage rescopes to the carrier currently selected in the navbar.
// When no carrier is given (super-admin view) it falls back to the global
// demo data so the page never renders empty.
interface FuelPageProps {
  accountId?: string;
  onNavigate?: (path: string) => void;
}

export function FuelPage({ accountId, onNavigate }: FuelPageProps = {}) {
  // Per-carrier seed — driver/asset assignments, trips, purchases, idling
  // events all key off CARRIER_DRIVERS + CARRIER_ASSETS. If the carrier
  // has no synthesised data yet, we fall back to the demo dataset.
  const carrierSeed = useMemo(() => {
    if (!accountId) return null;
    const f = getFuelForCarrier(accountId);
    if (f.trips.length === 0 && f.purchases.length === 0 && f.idlingEvents.length === 0) {
      return null;
    }
    return f;
  }, [accountId]);
  const seedTrips     = carrierSeed?.trips        ?? TRIP_RECORDS;
  const seedPurchases = carrierSeed?.purchases    ?? FUEL_PURCHASES;
  const seedIdling    = carrierSeed?.idlingEvents ?? IDLING_EVENTS;
  const seedAssignments = carrierSeed?.assignments ?? DRIVER_VEHICLE_ASSIGNMENTS;

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  // The header shrinks as the body scrolls; a list below says when its cards are out of view.
  const { scrollRef, onScroll, condensed, bridge } = usePageChrome(activeTab);
  const [sharingVehicle, setSharingVehicle] = useState<VehicleRow | null>(null);
  // What was done on this page, per carrier — the Activity tab shows it with the records.
  const [log, setLog] = useState<FuelLogEntry[]>(() => readFuelLog(accountId));
  useEffect(() => { setLog(readFuelLog(accountId)); }, [accountId]);
  const note = (kind: ActivityKind, title: string, detail?: string, vehicle?: string) => {
    const entry: FuelLogEntry = { id: `fl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: new Date().toISOString(), kind, title, detail, vehicle, by: currentUserName() };
    setLog(prev => { const next = [entry, ...prev]; writeFuelLog(accountId, next); return next; });
  };

  // Filters
  const [tripJurisdiction, setTripJurisdiction] = useState('All');
  const [tripVehicle, setTripVehicle] = useState('All');
  const [purchaseVehicle, setPurchaseVehicle] = useState('All');
  const [purchaseDriver] = useState('All');
  const [purchaseCountry, setPurchaseCountry] = useState<'US' | 'Canada'>('US');
  const [purchaseJurisdiction, setPurchaseJurisdiction] = useState('All');
  const [purchaseFuelType, setPurchaseFuelType] = useState('All');
  const [idlingVehicle, setIdlingVehicle] = useState('All');
  const [idlingDriver, setIdlingDriver] = useState('All');
  const [distanceUnit, setDistanceUnit] = useState<'mi' | 'km'>('mi');
  const distanceUnitLabel = distanceUnit;
  const altDistanceUnitLabel = distanceUnit === 'mi' ? 'km' : 'mi';
  const displayFromMiles = (mi: number) => distanceUnit === 'mi' ? mi : milesToKm(mi);
  const displayFromKm = (km: number) => distanceUnit === 'mi' ? kmToMiles(km) : km;
  const altDisplayFromKm = (km: number) => distanceUnit === 'mi' ? km : kmToMiles(km);
  const formatDistance = (value: number, decimals = 0) => value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const toStoredMiles = (value: number) => distanceUnit === 'mi' ? value : value / 1.60934;

  // ── IFTA State Mileage filters ──
  const [iftaYear, setIftaYear] = useState(2026);
  const [iftaQuarter, setIftaQuarter] = useState('');
  const [iftaMonth, setIftaMonth] = useState('');
  const [iftaRegion, setIftaRegion] = useState('All');
  const [vehFuelType, setVehFuelType] = useState('All');
  const [expandedJur, setExpandedJur] = useState<Set<string>>(new Set());
  const [expandedVehicle, setExpandedVehicle] = useState<Set<string>>(new Set());

  // ── Detail view modals ──
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<FuelPurchase | null>(null);
  const [selectedIdling, setSelectedIdling] = useState<IdlingEvent | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverFuelSummary | null>(null);

  // ── Add form modals ──
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddIdling, setShowAddIdling] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<FuelPurchase | null>(null);
  const [bulkCountry, setBulkCountry] = useState<'US' | 'Canada'>('US');

  // ── Local data (growable) ──
  // Seeded from the carrier-scoped feed, then mutable for user add/edit
  // actions on this surface. Re-syncs whenever the active carrier changes.
  const [localTrips, setLocalTrips] = useState<TripRecord[]>(seedTrips);
  const [localPurchases, setLocalPurchases] = useState<FuelPurchase[]>(seedPurchases);
  const [localIdling, setLocalIdling] = useState<IdlingEvent[]>(seedIdling);
  useEffect(() => {
    setLocalTrips(seedTrips);
    setLocalPurchases(seedPurchases);
    setLocalIdling(seedIdling);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // ── Add form state: Trip ──
  const [addTripDate, setAddTripDate] = useState('');
  const [addTripJurisdiction, setAddTripJurisdiction] = useState('');
  const [addTripVehicle, setAddTripVehicle] = useState('');
  const [addTripDist, setAddTripDist] = useState('');
  const [addTripOdoStart, setAddTripOdoStart] = useState('');
  const [addTripOdoEnd, setAddTripOdoEnd] = useState('');

  // ── Add form state: Purchase ──
  const [addPurchCountry, setAddPurchCountry] = useState<'US' | 'Canada'>('US');
  const [addPurchDate, setAddPurchDate] = useState('');
  const [addPurchVehicle, setAddPurchVehicle] = useState('');
  const [addPurchLocation, setAddPurchLocation] = useState('');
  const [addPurchJurisdiction, setAddPurchJurisdiction] = useState('');
  const [addPurchGallons, setAddPurchGallons] = useState('');
  const [addPurchPpg, setAddPurchPpg] = useState('');
  const [addPurchPayment, setAddPurchPayment] = useState('Fuel Card');
  const [addPurchFuelType, setAddPurchFuelType] = useState('Diesel');
  const [addPurchFuelCard, setAddPurchFuelCard] = useState('');
  const [addPurchOtherRef, setAddPurchOtherRef] = useState('');
  const [addPurchReceipt, setAddPurchReceipt] = useState<string>(''); // attached receipt file name
  const receiptInputRef = useRef<HTMLInputElement>(null);

  // ── Add form state: Idling ──
  const [addIdleDate, setAddIdleDate] = useState('');
  const [addIdleVehicle, setAddIdleVehicle] = useState('');
  const [addIdleDuration, setAddIdleDuration] = useState('');
  const [addIdleLocation, setAddIdleLocation] = useState('');
  const [addIdleReason, setAddIdleReason] = useState('');

  // ── Pagination state (all tabs) ──
  const [tripPage, setTripPage] = useState(1); const [tripPerPage, setTripPerPage] = useState(20);
  const [purchPage, setPurchPage] = useState(1); const [purchPerPage, setPurchPerPage] = useState(20);
  const [idlePage, setIdlePage] = useState(1); const [idlePerPage, setIdlePerPage] = useState(20);

  // ── Search state ──
  const [tripSearch, setTripSearch] = useState('');
  const [purchSearch, setPurchSearch] = useState('');
  const [idleSearch, setIdleSearch] = useState('');


  // ── Date range state ──
  const [tripDateFrom, setTripDateFrom] = useState('');
  const [tripDateTo, setTripDateTo] = useState('');
  const [purchDateFrom, setPurchDateFrom] = useState('');
  const [purchDateTo, setPurchDateTo] = useState('');
  const [idleDateFrom, setIdleDateFrom] = useState('');
  const [idleDateTo, setIdleDateTo] = useState('');

  // ── Generic sort state ──
  const [tripSortField, setTripSortField] = useState('date');
  const [tripSortDir, setTripSortDir] = useState<'asc' | 'desc'>('desc');
  const [purchSortField, setPurchSortField] = useState('date');
  const [purchSortDir, setPurchSortDir] = useState<'asc' | 'desc'>('desc');
  const [idleSortField, setIdleSortField] = useState('date');
  const [idleSortDir, setIdleSortDir] = useState<'asc' | 'desc'>('desc');

  // ── Sort toggle helper ──
  function toggleSort(field: string, curField: string, curDir: 'asc' | 'desc', setField: (f: string) => void, setDir: (d: 'asc' | 'desc') => void) {
    if (curField === field) setDir(curDir === 'asc' ? 'desc' : 'asc');
    else { setField(field); setDir('desc'); }
  }

  // ── Column visibility (trips) ──
  const [tripCols, setTripCols] = useState<ColDef[]>([
    { id: 'date', label: 'Date', visible: true }, { id: 'jurisdiction', label: 'Jurisdiction', visible: true },
    { id: 'vehicle', label: 'Vehicle', visible: true }, { id: 'driver', label: 'Driver', visible: true },
    { id: 'dist', label: 'Total Dist.', visible: true }, { id: 'odoStart', label: 'Odo. Start', visible: true },
    { id: 'odoEnd', label: 'Odo. End', visible: true },
  ]);
  // ── Column visibility (purchases — combined USD + CAD) ──
  const [purchCols, setPurchCols] = useState<ColDef[]>([
    { id: 'unit', label: 'Unit #', visible: true },
    { id: 'driver', label: 'Driver', visible: true },
    { id: 'date', label: 'Transaction Date', visible: true },
    { id: 'city', label: 'Location City', visible: true },
    { id: 'state', label: 'State/Province', visible: true },
    { id: 'gallons', label: 'Qty (Gal)', visible: true },
    { id: 'fuelType', label: 'Fuel Type', visible: true },
    { id: 'ppg', label: 'Price ($/Gal)', visible: true },
    { id: 'totalUSD', label: 'Total (USD)', visible: true },
    { id: 'rate', label: 'Exch. Rate', visible: true },
    { id: 'totalCAD', label: 'Total (CAD)', visible: true },
    { id: 'fuelCard', label: 'FuelCard #', visible: true },
    { id: 'otherRef', label: 'Other Ref #', visible: false },
  ]);
  // ── Currency derived from country toggle ──
  // US → USD/gallons, Canada → CAD/litres (no separate state needed)

  // ── Column visibility (idling) ──
  const [idleCols, setIdleCols] = useState<ColDef[]>([
    { id: 'date', label: 'Date', visible: true }, { id: 'vehicle', label: 'Vehicle', visible: true },
    { id: 'driver', label: 'Driver', visible: true }, { id: 'duration', label: 'Duration', visible: true },
    { id: 'fuelWasted', label: 'Fuel Wasted', visible: true }, { id: 'location', label: 'Location', visible: true },
    { id: 'reason', label: 'Reason', visible: true },
  ]);

  function toggleCol(cols: ColDef[], setCols: (c: ColDef[]) => void, id: string) {
    setCols(cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  }
  function isVis(cols: ColDef[], id: string) { return cols.find(c => c.id === id)?.visible !== false; }


  // ── Trip data ──
  const filteredTrips = useMemo(() => {
    let data = localTrips;
    if (tripJurisdiction !== 'All') data = data.filter(t => t.jurisdiction === tripJurisdiction);
    if (tripVehicle !== 'All') data = data.filter(t => t.unitNumber === tripVehicle);
    if (tripDateFrom) data = data.filter(t => t.date >= tripDateFrom);
    if (tripDateTo) data = data.filter(t => t.date <= tripDateTo);
    if (tripSearch.trim()) {
      const q = tripSearch.toLowerCase();
      data = data.filter(t => t.driverName.toLowerCase().includes(q) || t.unitNumber.toLowerCase().includes(q) || t.jurisdiction.toLowerCase().includes(q));
    }
    return [...data].sort((a, b) => {
      const f = tripSortField as keyof TripRecord;
      const av = a[f]; const bv = b[f];
      if (typeof av === 'number' && typeof bv === 'number') return tripSortDir === 'desc' ? bv - av : av - bv;
      return tripSortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [localTrips, tripJurisdiction, tripVehicle, tripDateFrom, tripDateTo, tripSearch, tripSortField, tripSortDir]);
  const tripTotalDist = useMemo(() => filteredTrips.reduce((s, t) => s + t.totalDistance, 0), [filteredTrips]);

  // ── Purchase data ──
  const filteredPurchases = useMemo(() => {
    let data = localPurchases;
    if (purchaseVehicle !== 'All') data = data.filter(p => p.unitNumber === purchaseVehicle);
    if (purchaseDriver !== 'All') data = data.filter(p => p.driverName === purchaseDriver);
    data = purchaseCountry === 'US'
      ? data.filter(p => US_JURISDICTIONS.has(p.jurisdiction))
      : data.filter(p => CANADA_JURISDICTIONS.has(p.jurisdiction));
    if (purchaseJurisdiction !== 'All') data = data.filter(p => p.jurisdiction === purchaseJurisdiction);
    if (purchaseFuelType !== 'All') {
      data = data.filter(p => {
        const fuelType = normalizeFuelType(p.fuelType);
        if (purchaseFuelType === 'Other') return fuelType === 'Other' || !KNOWN_FUEL_TYPES.has(fuelType);
        return fuelType === purchaseFuelType;
      });
    }
    if (purchDateFrom) data = data.filter(p => p.date >= purchDateFrom);
    if (purchDateTo) data = data.filter(p => p.date <= purchDateTo);
    if (purchSearch.trim()) {
      const q = purchSearch.toLowerCase();
      data = data.filter(p => p.driverName.toLowerCase().includes(q) || p.unitNumber.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
    }
    return [...data].sort((a, b) => {
      const f = purchSortField as keyof FuelPurchase;
      const av = a[f]; const bv = b[f];
      if (typeof av === 'number' && typeof bv === 'number') return purchSortDir === 'desc' ? bv - av : av - bv;
      return purchSortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [localPurchases, purchaseVehicle, purchaseDriver, purchaseCountry, purchaseJurisdiction, purchaseFuelType, purchDateFrom, purchDateTo, purchSearch, purchSortField, purchSortDir]); // purchaseCountry always 'US'|'Canada'

  // ── Idling data ──
  const filteredIdling = useMemo(() => {
    let data = localIdling;
    if (idlingVehicle !== 'All') data = data.filter(e => e.unitNumber === idlingVehicle);
    if (idlingDriver !== 'All') data = data.filter(e => e.driverName === idlingDriver);
    if (idleDateFrom) data = data.filter(e => e.date >= idleDateFrom);
    if (idleDateTo) data = data.filter(e => e.date <= idleDateTo);
    if (idleSearch.trim()) {
      const q = idleSearch.toLowerCase();
      data = data.filter(e => e.driverName.toLowerCase().includes(q) || e.unitNumber.toLowerCase().includes(q) || e.location.toLowerCase().includes(q));
    }
    return [...data].sort((a, b) => {
      const f = idleSortField as keyof IdlingEvent;
      const av = a[f]; const bv = b[f];
      if (typeof av === 'number' && typeof bv === 'number') return idleSortDir === 'desc' ? bv - av : av - bv;
      return idleSortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
    });
  }, [localIdling, idlingVehicle, idlingDriver, idleDateFrom, idleDateTo, idleSearch, idleSortField, idleSortDir]);

  // ── Helper: find driver for a vehicle ──
  function driverForVehicle(unitNumber: string) {
    const a = seedAssignments.find(d => d.unitNumber === unitNumber && d.primary);
    return a || seedAssignments.find(d => d.unitNumber === unitNumber);
  }

  // ── Save handlers ──
  function saveTrip() {
    const driver = driverForVehicle(addTripVehicle);
    const asset = INITIAL_ASSETS.find(a => a.unitNumber === addTripVehicle);
    const newTrip: TripRecord = {
      id: `trip-new-${Date.now()}`,
      date: addTripDate,
      jurisdiction: addTripJurisdiction,
      vehicleId: asset?.id || '',
      unitNumber: addTripVehicle,
      driverId: driver?.driverId || '',
      driverName: driver?.driverName || '—',
      totalDistance: toStoredMiles(Number(addTripDist) || 0),
      odoStart: toStoredMiles(Number(addTripOdoStart) || 0),
      odoEnd: toStoredMiles(Number(addTripOdoEnd) || 0),
      fuelType: asset?.vehicleType === 'Reefer' ? 'Diesel/Electric' : 'Diesel',
    };
    setLocalTrips(prev => [newTrip, ...prev]);
    note('created', `Added a trip · ${newTrip.jurisdiction}`, `${Math.round(newTrip.totalDistance).toLocaleString()} mi`, newTrip.unitNumber);
    setShowAddTrip(false);
    setAddTripDate(''); setAddTripJurisdiction(''); setAddTripVehicle('');
    setAddTripDist(''); setAddTripOdoStart(''); setAddTripOdoEnd('');
  }

  function savePurchase() {
    const driver = driverForVehicle(addPurchVehicle);
    const asset = INITIAL_ASSETS.find(a => a.unitNumber === addPurchVehicle);
    const gal = Number(addPurchGallons) || 0;
    const ppg = Number(addPurchPpg) || 0;
    // If Canada mode, convert litres → gallons and $/L → $/gal for storage
    const isCA = addPurchCountry === 'Canada';
    const storedGal = isCA ? gal / 3.78541 : gal;
    const storedPpg = isCA ? ppg * 3.78541 : ppg;
    const newPurchase: FuelPurchase = {
      id: editingPurchase ? editingPurchase.id : `fp-new-${Date.now()}`,
      date: addPurchDate,
      location: addPurchLocation,
      jurisdiction: addPurchJurisdiction || '',
      vehicleId: asset?.id || '',
      unitNumber: addPurchVehicle,
      driverId: driver?.driverId || '',
      driverName: driver?.driverName || '—',
      gallons: +storedGal.toFixed(3),
      pricePerGallon: +storedPpg.toFixed(4),
      totalCost: +(storedGal * storedPpg).toFixed(2),
      fuelType: addPurchFuelType || 'Diesel',
      paymentMethod: addPurchPayment,
      fuelCard: addPurchFuelCard || undefined,
      otherRef: addPurchOtherRef || undefined,
    };
    if (editingPurchase) {
      setLocalPurchases(prev => prev.map(p => p.id === editingPurchase.id ? newPurchase : p));
      note('updated', `Edited a fuel purchase · ${newPurchase.gallons.toFixed(1)} gal`, `${newPurchase.totalCost.toFixed(2)} at ${newPurchase.location}`, newPurchase.unitNumber);
    } else {
      setLocalPurchases(prev => [newPurchase, ...prev]);
      note('created', `Logged a fuel purchase · ${newPurchase.gallons.toFixed(1)} gal`, `${newPurchase.totalCost.toFixed(2)} at ${newPurchase.location}`, newPurchase.unitNumber);
    }
    setShowAddPurchase(false);
    setEditingPurchase(null);
    resetPurchForm();
  }

  function resetPurchForm() {
    setAddPurchCountry('US'); setAddPurchDate(''); setAddPurchVehicle(''); setAddPurchLocation('');
    setAddPurchJurisdiction(''); setAddPurchGallons(''); setAddPurchPpg(''); setAddPurchPayment('Fuel Card');
    setAddPurchFuelType('Diesel'); setAddPurchFuelCard(''); setAddPurchOtherRef(''); setAddPurchReceipt('');
  }

  function openEditPurchase(p: FuelPurchase) {
    const isCA = !US_JURISDICTIONS.has(p.jurisdiction);
    setAddPurchCountry(isCA ? 'Canada' : 'US');
    setAddPurchDate(p.date);
    setAddPurchVehicle(p.unitNumber);
    setAddPurchLocation(p.location);
    setAddPurchJurisdiction(p.jurisdiction || '');
    setAddPurchGallons(isCA ? (p.gallons * 3.78541).toFixed(1) : String(p.gallons));
    setAddPurchPpg(isCA ? (p.pricePerGallon / 3.78541).toFixed(3) : String(p.pricePerGallon));
    setAddPurchPayment(p.paymentMethod || 'Fuel Card');
    const parsedId = parseInt(p.id.replace(/\D/g, '') || '0');
    setAddPurchFuelType(p.fuelType || 'Diesel');
    setAddPurchFuelCard(p.fuelCard || `FC-${p.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`);
    setAddPurchOtherRef(p.otherRef || (parsedId % 4 === 0 ? `PO-${String(parsedId * 13 + 200).padStart(5, '0')}` : ''));
    setAddPurchReceipt(parsedId % 2 === 0 ? `Receipt_${p.id}.pdf` : '');
    setEditingPurchase(p);
    setShowAddPurchase(true);
  }

  function saveIdling() {
    const driver = driverForVehicle(addIdleVehicle);
    const asset = INITIAL_ASSETS.find(a => a.unitNumber === addIdleVehicle);
    const dur = Number(addIdleDuration) || 0;
    const newIdling: IdlingEvent = {
      id: `idle-new-${Date.now()}`,
      date: addIdleDate,
      vehicleId: asset?.id || '',
      unitNumber: addIdleVehicle,
      driverId: driver?.driverId || '',
      driverName: driver?.driverName || '—',
      durationMinutes: dur,
      fuelWastedGal: +(dur * 0.5 / 60).toFixed(2),
      location: addIdleLocation,
      reason: addIdleReason,
    };
    setLocalIdling(prev => [newIdling, ...prev]);
    note('created', `Added an idling event · ${fmtDuration(newIdling.durationMinutes)}`, newIdling.location, newIdling.unitNumber);
    setShowAddIdling(false);
    setAddIdleDate(''); setAddIdleVehicle(''); setAddIdleDuration('');
    setAddIdleLocation(''); setAddIdleReason('');
  }

  // ── Validation helpers ──
  const canSaveTrip = addTripDate && addTripJurisdiction && addTripVehicle && Number(addTripDist) > 0;
  const canSavePurchase = addPurchDate && addPurchVehicle && Number(addPurchGallons) > 0 && Number(addPurchPpg) > 0;
  const canSaveIdling = addIdleDate && addIdleVehicle && Number(addIdleDuration) > 0;

  // ── Shared styles ──
  const thClass = "px-4 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider";
  const tdClass = "px-4 py-3";

  // Export whatever the tab is about.
  const exportCsv = () => {
    if (activeTab === 'trips') downloadCsv('fuel-trips.csv', [['Date', 'Jurisdiction', 'Vehicle', 'Driver', 'Distance (mi)', 'Odometer start', 'Odometer end', 'Fuel type'], ...localTrips.map(t => [t.date, t.jurisdiction, t.unitNumber, t.driverName, t.totalDistance, t.odoStart, t.odoEnd, t.fuelType])]);
    else if (activeTab === 'idling') downloadCsv('fuel-idling.csv', [['Date', 'Vehicle', 'Driver', 'Duration (min)', 'Fuel wasted (gal)', 'Location', 'Reason'], ...localIdling.map(e => [e.date, e.unitNumber, e.driverName, e.durationMinutes, e.fuelWastedGal, e.location, e.reason])]);
    else if (activeTab === 'activity') downloadCsv('fuel-activity.csv', [['When', 'Activity', 'Detail', 'Vehicle', 'By'], ...log.map(e => [e.at, e.title, e.detail ?? '', e.vehicle ?? '', e.by])]);
    else downloadCsv('fuel-purchases.csv', [['Date', 'Location', 'Jurisdiction', 'Vehicle', 'Driver', 'Gallons', 'Price / gal', 'Total', 'Fuel type', 'Payment'], ...localPurchases.map(p => [p.date, p.location, p.jurisdiction, p.unitNumber, p.driverName, p.gallons, p.pricePerGallon, p.totalCost, p.fuelType, p.paymentMethod])]);
    note('shared', `Exported ${activeTab === 'trips' ? 'trips' : activeTab === 'idling' ? 'idling events' : activeTab === 'activity' ? 'the activity log' : 'fuel purchases'} to CSV`);
  };
  const headerBtn = (cls: string) => `inline-flex items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold shadow-sm ${condensed ? 'h-8' : 'h-9'} ${cls}`;

  return (
    <ListHeaderBridge value={bridge.value}>
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900">
      <ListPageHeader
        Icon={Fuel}
        title="Fuel Management"
        description="Fuel economy, idling, emissions and purchases across the fleet."
        condensed={condensed}
        chips={bridge.chips ?? undefined}
        tabs={TABS.map(t => ({ id: t.id, label: t.label, icon: t.icon }))}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        tabsLabel="Fuel sections"
        actions={<>
          <button type="button" onClick={exportCsv} className={headerBtn('border border-slate-200 bg-white text-slate-700 hover:bg-slate-50')}>
            <Download size={15} /> Export
          </button>
          {activeTab === 'trips' && (
            <button type="button" onClick={() => setShowAddTrip(true)} className={headerBtn('bg-blue-600 text-white hover:bg-blue-700')}><Plus size={15} /> Add trip</button>
          )}
          {activeTab === 'purchases' && (
            <>
              <button type="button" onClick={() => { resetPurchForm(); setShowAddPurchase(true); }} className={headerBtn('bg-blue-600 text-white hover:bg-blue-700')}><Plus size={15} /> Add purchase</button>
              <button type="button" onClick={() => setShowBulkUpload(true)} className={headerBtn('bg-violet-600 text-white hover:bg-violet-700')}><Upload size={15} /> Bulk upload</button>
            </>
          )}
          {activeTab === 'idling' && (
            <button type="button" onClick={() => setShowAddIdling(true)} className={headerBtn('bg-blue-600 text-white hover:bg-blue-700')}><Plus size={15} /> Add event</button>
          )}
        </>}
      />

      {/* The list tabs own their scroll; everything else scrolls as one body. */}
      {activeTab === 'vehicles' && (
        <FuelVehiclesTab
          year={iftaYear} setYear={setIftaYear} quarter={iftaQuarter} setQuarter={setIftaQuarter} month={iftaMonth} setMonth={setIftaMonth}
          region={iftaRegion} setRegion={setIftaRegion} fuelType={vehFuelType} setFuelType={setVehFuelType}
          distanceUnit={distanceUnit} setDistanceUnit={setDistanceUnit}
          scrollRef={scrollRef} onScroll={onScroll}
          onShare={(v) => setSharingVehicle(v)}
          onLogPurchase={(v) => { resetPurchForm(); setAddPurchVehicle(v.name); setShowAddPurchase(true); setActiveTab('purchases'); }}
          onOpenAssets={onNavigate ? () => onNavigate('/assets/directory') : undefined}
        />
      )}
      {activeTab === 'activity' && (
        <FuelActivityTab log={log} purchases={localPurchases} trips={localTrips} idling={localIdling} scrollRef={scrollRef} onScroll={onScroll} />
      )}
      {activeTab !== 'vehicles' && activeTab !== 'activity' && (
      <ScrollBody scrollRef={scrollRef} onScroll={onScroll}>
        {activeTab === 'overview' && (() => {
          // ── Compute KPIs from real data ──
          const totalTripDist = localTrips.reduce((s, t) => s + t.totalDistance, 0); // miles
          const totalDistDisplay = displayFromMiles(totalTripDist);
          const totalGallons = localPurchases.reduce((s, p) => s + p.gallons, 0);
          const totalCost = localPurchases.reduce((s, p) => s + p.totalCost, 0);
          const avgMpg = totalGallons > 0 ? totalTripDist / totalGallons : 0;
          const totalIdleMin = localIdling.reduce((s, e) => s + e.durationMinutes, 0);
          const totalIdleFuel = localIdling.reduce((s, e) => s + e.fuelWastedGal, 0);
          const co2Tons = totalGallons * 0.01018; // ~22.44 lbs CO₂ per gal diesel → metric tons
          const overviewEffLabel = distanceUnit === 'mi' ? 'MPG' : 'km/L';
          const overviewToEff = (mpg: number) => distanceUnit === 'mi' ? mpg : mpg * 0.425144;

          // ── Monthly Fuel Spending (bar chart) ──
          const monthlySpendMap = new Map<string, number>();
          localPurchases.forEach(p => {
            const m = p.date.slice(0, 7); // YYYY-MM
            monthlySpendMap.set(m, (monthlySpendMap.get(m) || 0) + p.totalCost);
          });
          const monthlySpendData = [...monthlySpendMap.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([month, total]) => ({
              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
              total: Math.round(total),
            }));

          // ── Distance by Jurisdiction (bar chart) ──
          const jurDistMap = new Map<string, number>();
          IFTA_SUMMARY_RESULTS.forEach(r => {
            const label = JURISDICTION_LABELS[r.jurisdiction] || r.jurisdiction;
            jurDistMap.set(label, (jurDistMap.get(label) || 0) + r.distance);
          });
          const jurDistData = [...jurDistMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, km]) => ({ name, distance: Math.round(displayFromKm(km)) }));

          // ── Fuel Consumption by Vehicle (bar chart) ──
          const vehGalMap = new Map<string, number>();
          localPurchases.forEach(p => { vehGalMap.set(p.unitNumber, (vehGalMap.get(p.unitNumber) || 0) + p.gallons); });
          const vehGalData = [...vehGalMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([unit, gal]) => ({ unit, gallons: Math.round(gal * 10) / 10 }));

          // ── Fuel Type Distribution (pie chart) ──
          const ftMap = new Map<string, number>();
          localPurchases.forEach(p => { ftMap.set(p.fuelType || 'Diesel', (ftMap.get(p.fuelType || 'Diesel') || 0) + p.gallons); });
          const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
          const fuelTypeData = [...ftMap.entries()].map(([name, value]) => ({ name, value: Math.round(value) }));

          // ── Top Idling Vehicles ──
          const idleVehMap = new Map<string, { mins: number; gal: number }>();
          localIdling.forEach(e => {
            const cur = idleVehMap.get(e.unitNumber) || { mins: 0, gal: 0 };
            cur.mins += e.durationMinutes; cur.gal += e.fuelWastedGal;
            idleVehMap.set(e.unitNumber, cur);
          });
          const topIdlers = [...idleVehMap.entries()].sort((a, b) => b[1].gal - a[1].gal).slice(0, 5);

          // ── Fuel Efficiency by Vehicle (MPG) ──
          const vehDistMap = new Map<string, number>();
          localTrips.forEach(t => { vehDistMap.set(t.unitNumber, (vehDistMap.get(t.unitNumber) || 0) + t.totalDistance); });
          const effData = [...vehGalMap.entries()].map(([unit, gal]) => {
            const dist = vehDistMap.get(unit) || 0;
            return { unit, mpg: gal > 0 ? Math.round((dist / gal) * 10) / 10 : 0, gallons: Math.round(gal), distance: Math.round(dist) };
          }).sort((a, b) => b.mpg - a.mpg);

          const ttStyle = { borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' };

          return (
            <div className="space-y-5">
              {/* ── KPI Summary Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Distance', value: `${formatDistance(totalDistDisplay)} ${distanceUnitLabel}`, icon: <Route size={18} />, color: 'text-blue-600 bg-blue-50' },
                  { label: 'Fuel Purchased', value: `${formatDistance(totalGallons, 1)} gal`, icon: <Fuel size={18} />, color: 'text-emerald-600 bg-emerald-50' },
                  { label: 'Total Fuel Cost', value: `$${formatDistance(totalCost)}`, icon: <ShoppingCart size={18} />, color: 'text-violet-600 bg-violet-50' },
                  { label: 'Avg. Fuel Efficiency', value: `${overviewToEff(avgMpg).toFixed(1)} ${overviewEffLabel}`, icon: <Gauge size={18} />, color: 'text-amber-600 bg-amber-50' },
                  { label: 'Idling Time', value: fmtDuration(totalIdleMin), icon: <TrendingUp size={18} />, color: 'text-red-600 bg-red-50' },
                  { label: 'Fuel Wasted (Idle)', value: `${totalIdleFuel.toFixed(1)} gal`, icon: <BarChart3 size={18} />, color: 'text-orange-600 bg-orange-50' },
                ].map(kpi => (
                  <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</span>
                      <span className={`p-1.5 rounded-lg ${kpi.color}`}>{kpi.icon}</span>
                    </div>
                    <div className="text-xl font-bold text-slate-900">{kpi.value}</div>
                  </div>
                ))}
              </div>

              {/* ── Row 2: Monthly Spending + Distance by Jurisdiction ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Monthly Fuel Spending */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <h3 className="text-[15px] font-bold text-slate-900 mb-4">Monthly Fuel Spending</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlySpendData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                        <RechartsTooltip contentStyle={ttStyle} formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, 'Spent']} />
                        <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Distance by Jurisdiction */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <h3 className="text-[15px] font-bold text-slate-900 mb-4">Distance by Jurisdiction (Top 10)</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={jurDistData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid horizontal={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#475569', fontWeight: 500 }} width={100} />
                        <RechartsTooltip contentStyle={ttStyle} formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} ${distanceUnitLabel}`, 'Distance']} />
                        <Bar dataKey="distance" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── Row 3: Fuel by Vehicle + Fuel Type Pie ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Fuel Consumption by Vehicle */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <h3 className="text-[15px] font-bold text-slate-900 mb-4">Fuel Consumption by Vehicle</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehGalData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <XAxis dataKey="unit" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                        <RechartsTooltip contentStyle={ttStyle} formatter={(v: number | undefined) => [`${v ?? 0} gal`, 'Fuel']} />
                        <Bar dataKey="gallons" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Fuel Type Distribution */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                  <h3 className="text-[15px] font-bold text-slate-900 mb-4">Fuel Type Distribution</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fuelTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={105} paddingAngle={3} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}>
                          {fuelTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <RechartsTooltip contentStyle={ttStyle} formatter={(v: number | undefined) => [`${(v ?? 0).toLocaleString()} gal`, 'Volume']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ── Row 4: Top Idling + Fuel Efficiency ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Top Idling Vehicles */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-bold text-slate-900">Top Idling Vehicles</h3>
                    <p className="text-xs text-slate-400">By fuel wasted during idling</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Idling Time</th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fuel Wasted</th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {topIdlers.map(([unit, data]) => (
                        <tr key={unit} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">{unit}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{fmtDuration(data.mins)}</td>
                          <td className="px-5 py-3 text-right font-bold text-red-600">{data.gal.toFixed(1)} gal</td>
                          <td className="px-5 py-3 text-right text-slate-600">${(data.gal * 4.20).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Fuel Efficiency by Vehicle */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="text-[15px] font-bold text-slate-900">Fuel Efficiency by Vehicle</h3>
                    <p className="text-xs text-slate-400">{distanceUnit === 'mi' ? 'Miles per gallon' : 'Kilometers per litre'} (trip distance / fuel purchased)</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distance ({distanceUnitLabel})</th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fuel (gal)</th>
                        <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">{overviewEffLabel}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {effData.map(row => (
                        <tr key={row.unit} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3 font-semibold text-slate-800">{row.unit}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{formatDistance(row.distance)}</td>
                          <td className="px-5 py-3 text-right text-slate-600">{row.gallons}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-bold ${row.mpg >= 6 ? 'text-emerald-600' : row.mpg >= 4 ? 'text-amber-600' : 'text-red-600'}`}>{overviewToEff(row.mpg).toFixed(1)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── Row 5: CO2 + Fuel Trend ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* CO2 card */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col justify-center items-center text-center">
                  <Globe size={28} className="text-emerald-500 mb-3" />
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Est. CO₂ Emissions</div>
                  <div className="text-3xl font-bold text-slate-900">{co2Tons.toFixed(1)}</div>
                  <div className="text-xs text-slate-400 font-medium">metric tons</div>
                  <div className="text-xs text-slate-400 mt-2">Based on {formatDistance(totalGallons, 0)} gallons diesel</div>
                </div>
                {/* MPG Trend */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[15px] font-bold text-slate-900">Avg. MPG Trend</h3>
                    <div className="flex items-center gap-2"><div className="w-4 h-[3px] bg-blue-500 rounded-full" /><span className="text-xs text-slate-500 font-medium">My Fleet</span></div>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 10, right: 30, left: -20, bottom: 10 }}>
                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 10]} />
                        <RechartsTooltip contentStyle={ttStyle} />
                        <Line type="monotone" dataKey="mpg" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: 'white', stroke: '#3b82f6', strokeWidth: 1.5 }} activeDot={{ r: 5, fill: '#3b82f6' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: VEHICLES  (IFTA-style expandable rows)                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'ifta' && (() => {
          // ── Filter IFTA records by year/quarter/month/region ──
          const filtered = IFTA_SUMMARY_RESULTS.filter(r => {
            const [y, m] = r.month.split('-').map(Number);
            if (y !== iftaYear) return false;
            if (iftaQuarter && getQuarter(r.month) !== Number(iftaQuarter)) return false;
            if (iftaMonth && m !== Number(iftaMonth)) return false;
            const region = JURISDICTION_REGION[r.jurisdiction];
            if (iftaRegion !== 'All' && region !== iftaRegion) return false;
            return true;
          });

          // ── Aggregate by jurisdiction (with per-vehicle + per-month breakdown) ──
          interface VBreakdown { name: string; make: string; model: string; year: number; distKm: number; fuelType: string; fuelEfficiency: number | null; fuelTankCapacity: number | null; monthRecords: { month: string; distKm: number }[] }
          const jurMap = new Map<string, { distKm: number; vehicles: Set<string>; minMonth: string; maxMonth: string; vehicleBreakdown: Map<string, VBreakdown> }>();
          for (const r of filtered) {
            const cur = jurMap.get(r.jurisdiction) || { distKm: 0, vehicles: new Set<string>(), minMonth: r.month, maxMonth: r.month, vehicleBreakdown: new Map<string, VBreakdown>() };
            cur.distKm += r.distance;
            cur.vehicles.add(r.vehicle.name);
            if (r.month < cur.minMonth) cur.minMonth = r.month;
            if (r.month > cur.maxMonth) cur.maxMonth = r.month;
            const vKey = r.vehicle.name;
            const vCur = cur.vehicleBreakdown.get(vKey) || { name: r.vehicle.name, make: r.vehicle.make, model: r.vehicle.model, year: r.vehicle.year, distKm: 0, fuelType: r.vehicle.fuelType, fuelEfficiency: r.vehicle.fuelEfficiency, fuelTankCapacity: r.vehicle.fuelTankCapacity, monthRecords: [] as { month: string; distKm: number }[] };
            vCur.distKm += r.distance;
            const existingMonth = vCur.monthRecords.find(mr => mr.month === r.month);
            if (existingMonth) existingMonth.distKm += r.distance; else vCur.monthRecords.push({ month: r.month, distKm: r.distance });
            cur.vehicleBreakdown.set(vKey, vCur);
            jurMap.set(r.jurisdiction, cur);
          }
          const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const fmtMonth = (m: string) => { const [yr, mm] = m.split('-').map(Number); return `${MONTH_SHORT[mm-1]} ${yr}`; };
          const fmtMonthFull = (m: string) => { const [yr, mm] = m.split('-').map(Number); return `${MONTH_NAMES[mm-1]} ${yr}`; };
          const fmtDateRange = (min: string, max: string) => min === max ? fmtMonth(min) : `${fmtMonth(min)} – ${fmtMonth(max)}`;
          const jurRows = [...jurMap.entries()]
            .map(([code, data]) => ({
              code,
              name: JURISDICTION_LABELS[code] || code,
              region: JURISDICTION_REGION[code] || 'US' as 'US' | 'Canada',
              totalKm: data.distKm,
              totalMi: Math.round(kmToMiles(data.distKm)),
              vehicleCount: data.vehicles.size,
              dateLabel: fmtDateRange(data.minMonth, data.maxMonth),
              vehicleBreakdown: [...data.vehicleBreakdown.values()]
                .map(v => ({ ...v, distMi: Math.round(kmToMiles(v.distKm)), monthRecords: v.monthRecords.sort((a,b) => a.month.localeCompare(b.month)).map(mr => ({ ...mr, distMi: Math.round(kmToMiles(mr.distKm)), label: fmtMonthFull(mr.month) })) }))
                .sort((a, b) => b.distMi - a.distMi),
            }))
            .sort((a, b) => b.totalMi - a.totalMi);
          const toggleJurExpand = (code: string) => setExpandedJur(prev => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; });
          const toggleVehicleExpand = (key: string) => setExpandedVehicle(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });

          const totalMi = jurRows.reduce((s, r) => s + r.totalMi, 0);
          const totalKm = jurRows.reduce((s, r) => s + r.totalKm, 0);
          const totalVehicles = new Set(filtered.map(r => r.vehicle.name)).size;
          const totalRecords = filtered.length;

          // ── Build filter label ──
          const monthLabel = iftaMonth
            ? (IFTA_MONTH_OPTIONS.find(m => m.value === iftaMonth)?.label || '')
            : 'All Months';
          const regionLabel = iftaRegion === 'All' ? 'All Regions' : iftaRegion;

          const coveragePct = IFTA_AVAILABLE_YEARS.length > 0 ? Math.min(Math.round((jurRows.length / 15) * 100), 100) : 0;

          return (
          <div className="space-y-6">
            {/* ── Rich KPI Cards (Paystubs pattern) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* KPI 1: Total Distance */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative group hover:shadow-md transition-all duration-300 flex flex-col">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <MapPin size={100} className="text-blue-600" />
                  </div>
                </div>
                <div className="relative z-10 flex-shrink-0">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shadow-sm ring-1 ring-blue-100">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Distance</h3>
                        <p className="text-[11px] text-gray-400">{regionLabel}</p>
                      </div>
                    </div>
                    <select value={iftaYear} onChange={e => setIftaYear(Number(e.target.value))}
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer outline-none">
                      {IFTA_AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-gray-900 tracking-tight">{formatDistance(displayFromKm(totalKm))}</span>
                      <span className="text-base font-semibold text-gray-400">{distanceUnitLabel}</span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-sm font-medium text-gray-500">{formatDistance(altDisplayFromKm(totalKm))}</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">{altDistanceUnitLabel}</span>
                    </div>
                  </div>
                </div>
                {/* Footer: Wave Sparkline */}
                <div className="relative z-10 pt-3 border-t border-gray-100 mt-auto flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-gray-400">Mileage Trend</span>
                    <div className="flex items-center text-blue-600 text-[11px] font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                      <TrendingUp size={12} className="mr-1" />
                      +{jurRows.length > 0 ? Math.round((jurRows[0].totalMi / totalMi) * 100) : 0}% top
                    </div>
                  </div>
                  <div className="h-14 w-full text-blue-500">
                    <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 50">
                      <defs>
                        <linearGradient id="gradient-ifta-0" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      <path d="M0 42 C 30 42, 50 28, 80 32 S 120 15, 150 18 S 180 5, 200 3 V 50 H 0 Z" fill="url(#gradient-ifta-0)" />
                      <path d="M0 42 C 30 42, 50 28, 80 32 S 120 15, 150 18 S 180 5, 200 3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
                      <circle cx="200" cy="3" r="3.5" fill="white" stroke="currentColor" strokeWidth="2" />
                      <circle cx="80" cy="32" r="2" fill="currentColor" opacity="0.3" />
                      <circle cx="150" cy="18" r="2" fill="currentColor" opacity="0.3" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* KPI 2: Jurisdictions Coverage */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative group hover:shadow-md transition-all duration-300 flex flex-col">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Globe size={100} className="text-orange-600" />
                  </div>
                </div>
                <div className="relative z-10 flex-shrink-0">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 shadow-sm ring-1 ring-orange-100">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jurisdictions</h3>
                        <p className="text-[11px] text-gray-400">Coverage breakdown</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">
                      {totalRecords} Records
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-gray-900 tracking-tight">{jurRows.length}</span>
                      <span className="text-base font-semibold text-gray-400">{iftaRegion === 'All' ? 'Provinces & States' : iftaRegion === 'Canada' ? 'Provinces' : 'States'}</span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-sm font-medium text-gray-500">{totalVehicles} vehicles</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">Fleet</span>
                    </div>
                  </div>
                </div>
                {/* Footer: Progress Bar */}
                <div className="relative z-10 pt-3 border-t border-gray-100 mt-auto flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-gray-400">Coverage</span>
                    <span className="text-[11px] font-bold text-orange-600">{coveragePct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${coveragePct}%` }} />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* KPI 3: Avg. per Jurisdiction */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 relative group hover:shadow-md transition-all duration-300 flex flex-col">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <BarChart3 size={100} className="text-emerald-600" />
                  </div>
                </div>
                <div className="relative z-10 flex-shrink-0">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shadow-sm ring-1 ring-emerald-100">
                        <BarChart3 size={20} />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Avg / Jurisdiction</h3>
                        <p className="text-[11px] text-gray-400">Mean mileage</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {iftaYear}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-bold text-gray-900 tracking-tight">{jurRows.length > 0 ? formatDistance(displayFromKm(totalKm) / jurRows.length) : '0'}</span>
                      <span className="text-base font-semibold text-gray-400">{distanceUnitLabel}</span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-sm font-medium text-gray-500">{jurRows.length > 0 ? formatDistance(altDisplayFromKm(totalKm) / jurRows.length) : '0'}</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">{altDistanceUnitLabel}</span>
                    </div>
                  </div>
                </div>
                {/* Footer: Bar Chart */}
                <div className="relative z-10 pt-3 border-t border-gray-100 mt-auto flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-medium text-gray-400">Top 5 Jurisdictions</span>
                    <div className="flex items-center text-emerald-600 text-[11px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                      <TrendingUp size={12} className="mr-1" />
                      Consistent
                    </div>
                  </div>
                  <div className="flex items-end justify-between h-12 gap-1.5">
                    {jurRows.slice(0, 5).map((r, i) => {
                      const maxMi = jurRows[0]?.totalMi || 1;
                      const pct = Math.max((r.totalMi / maxMi) * 100, 10);
                      return <div key={r.code} className={`w-full rounded-md transition-all duration-200 ${i === 0 ? 'bg-emerald-500 hover:bg-emerald-600' : i < 3 ? 'bg-emerald-300 hover:bg-emerald-400' : 'bg-emerald-200 hover:bg-emerald-300'}`} style={{ height: `${pct}%` }} title={`${r.name}: ${formatDistance(displayFromKm(r.totalKm))} ${distanceUnitLabel}`} />;
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Filter Toolbar (Paystubs pattern) ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-4 border-b border-gray-200 bg-white">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Year / Quarter / Month selects */}
                  <select value={iftaYear} onChange={e => setIftaYear(Number(e.target.value))}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer">
                    {IFTA_AVAILABLE_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <select value={iftaQuarter} onChange={e => { setIftaQuarter(e.target.value); if (e.target.value) setIftaMonth(''); }}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer">
                    {IFTA_QUARTER_OPTIONS.map(q => <option key={q.value} value={q.value}>{q.label === 'None' ? 'All Quarters' : `Q${q.value}`}</option>)}
                  </select>
                  <select value={iftaMonth} onChange={e => { setIftaMonth(e.target.value); if (e.target.value) setIftaQuarter(''); }}
                    className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer">
                    {IFTA_MONTH_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>

                  {/* Region pill */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <select value={iftaRegion} onChange={e => setIftaRegion(e.target.value)}
                      className="text-sm text-gray-700 bg-transparent border-none outline-none cursor-pointer p-0">
                      {IFTA_REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>

                  {/* Reset */}
                  <button onClick={() => { setIftaYear(2026); setIftaQuarter(''); setIftaMonth(''); setIftaRegion('All'); }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                    Reset filters
                  </button>
                </div>

                {/* Right side: mi/km toggle + record count */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button onClick={() => setDistanceUnit('mi')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-150 ${distanceUnit === 'mi' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                      mi
                    </button>
                    <button onClick={() => setDistanceUnit('km')}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-150 ${distanceUnit === 'km' ? 'bg-white text-slate-800 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                      km
                    </button>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="font-bold text-gray-900">{jurRows.length}</span> Jurisdictions Found
                  </div>
                </div>
              </div>

              {/* ── Table Header ── */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900">State / Province Mileage Breakdown</h3>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {iftaYear} {iftaQuarter ? `Q${iftaQuarter}` : ''} {monthLabel !== 'All Months' ? monthLabel : ''} · {regionLabel}
                </span>
              </div>

              {/* ── Table ── */}
              {jurRows.length === 0 ? (
                <div className="px-5 py-12 text-center text-slate-400">
                  <p className="text-sm font-medium">No IFTA records found for the selected filters.</p>
                  <p className="text-xs mt-1">Try adjusting the year, quarter, month, or region.</p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className={`${thClass} text-left`} style={{ width: '36px' }}></th>
                      <th className={`${thClass} text-left`}>Jurisdiction</th>
                      <th className={`${thClass} text-left`}>Date</th>
                      <th className={`${thClass} text-right`}>Distance ({distanceUnitLabel})</th>
                      <th className={`${thClass} text-right`}>Vehicles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jurRows.map((row) => {
                      const isExpanded = expandedJur.has(row.code);
                      return (
                        <React.Fragment key={row.code}>
                          {/* ── Jurisdiction Row ── */}
                          <tr className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-blue-50/20' : ''}`} onClick={() => toggleJurExpand(row.code)}>
                            <td className="px-3 py-3 text-center">
                              <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`} />
                            </td>
                            <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">
                              <span className="inline-flex items-center gap-2">
                                <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold leading-none ${row.region === 'Canada' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>{row.code}</span>
                                {row.name}{iftaRegion === 'All' && <span className="text-slate-400 font-normal text-[12px]">, {row.region === 'Canada' ? 'Canada' : 'United States'}</span>}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[12px] font-medium text-slate-500">{row.dateLabel}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-900">{formatDistance(displayFromKm(row.totalKm))}</td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono font-semibold text-slate-700">{row.vehicleCount}</td>
                          </tr>

                          {/* ── Expanded: Vehicle Sub-Rows ── */}
                          {isExpanded && row.vehicleBreakdown.map((v) => {
                            const vKey = `${row.code}-${v.name}`;
                            const isVExpanded = expandedVehicle.has(vKey);
                            return (
                              <React.Fragment key={vKey}>
                                <tr className={`border-b border-slate-100/60 cursor-pointer select-none transition-colors ${isVExpanded ? 'bg-slate-100/60' : 'bg-slate-50/50 hover:bg-slate-100/40'}`}
                                    onClick={(e) => { e.stopPropagation(); toggleVehicleExpand(vKey); }}
                                    style={{ borderLeft: '4px solid #93c5fd' }}>
                                  <td className="px-3 py-2.5 text-center">
                                    <ChevronRight size={12} className={`text-slate-300 transition-transform duration-200 inline-block ${isVExpanded ? 'rotate-90' : ''}`} />
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex items-center gap-2.5 pl-3">
                                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0">
                                        <Truck size={14} />
                                      </div>
                                      <div>
                                        <div className="text-[13px] font-semibold text-slate-800">{v.name}</div>
                                        <div className="text-[11px] text-slate-400">{v.make} {v.model} · {v.year}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className="text-[12px] text-slate-400">{v.monthRecords.length} month{v.monthRecords.length !== 1 ? 's' : ''}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-[13px] font-mono font-semibold text-slate-700">{formatDistance(displayFromKm(v.distKm))}</td>
                                  <td className="px-4 py-2.5"></td>
                                </tr>

                                {/* ── Expanded Vehicle: Specs + Monthly Breakdown ── */}
                                {isVExpanded && (
                                  <tr style={{ borderLeft: '4px solid #93c5fd' }} className="bg-white">
                                    <td></td>
                                    <td colSpan={4} className="px-4 py-0 pb-3">
                                      <div className="ml-6 mt-1 space-y-3">
                                        {/* Vehicle Specs */}
                                        <div className="flex gap-4 flex-wrap">
                                          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100">
                                            <Fuel size={13} className="text-amber-600" />
                                            <div>
                                              <div className="text-[10px] font-bold text-amber-800/60 uppercase">Fuel Type</div>
                                              <div className="text-[13px] font-semibold text-amber-900 capitalize">{v.fuelType}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                            <Gauge size={13} className="text-emerald-600" />
                                            <div>
                                              <div className="text-[10px] font-bold text-emerald-800/60 uppercase">Efficiency</div>
                                              <div className="text-[13px] font-semibold text-emerald-900">{v.fuelEfficiency ? `${(distanceUnit === 'mi' ? v.fuelEfficiency : v.fuelEfficiency * 0.425144).toFixed(1)} ${distanceUnit === 'mi' ? 'MPG' : 'km/L'}` : 'N/A'}</div>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                                            <Fuel size={13} className="text-blue-600" />
                                            <div>
                                              <div className="text-[10px] font-bold text-blue-800/60 uppercase">Tank Capacity</div>
                                              <div className="text-[13px] font-semibold text-blue-900">{v.fuelTankCapacity ? `${v.fuelTankCapacity} gal` : 'N/A'}</div>
                                            </div>
                                          </div>
                                        </div>
                                        {/* Monthly Breakdown */}
                                        <div className="rounded-lg border border-slate-200 overflow-hidden">
                                          <table className="w-full">
                                            <thead>
                                              <tr className="bg-slate-50/80">
                                                <th className="px-4 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</th>
                                                <th className="px-4 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distance ({distanceUnitLabel})</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {v.monthRecords.map(mr => (
                                                <tr key={mr.month} className="border-t border-slate-100 hover:bg-slate-50/50">
                                                  <td className="px-4 py-2 text-[13px] font-medium text-slate-700">{mr.label}</td>
                                                  <td className="px-4 py-2 text-right text-[13px] font-mono font-semibold text-slate-800">{formatDistance(displayFromKm(mr.distKm))}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td className="px-3 py-3"></td>
                      <td className="px-4 py-3 text-[13px] font-bold text-slate-900">Total ({jurRows.length} jurisdictions)</td>
                      <td></td>
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-900">{formatDistance(displayFromKm(totalKm))}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-700">{totalVehicles}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: TRIP REPORTS                                                 */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'trips' && (() => {
          const pagedTrips = filteredTrips.slice((tripPage - 1) * tripPerPage, tripPage * tripPerPage);
          const sortTrp = (f: string) => toggleSort(f, tripSortField, tripSortDir, setTripSortField, setTripSortDir);
          return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <select value={tripJurisdiction} onChange={e => { setTripJurisdiction(e.target.value); setTripPage(1); }} className={inputCls + ' w-auto'}>
                <option value="All">All Jurisdictions</option>
                {TRIP_JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
              <select value={tripVehicle} onChange={e => { setTripVehicle(e.target.value); setTripPage(1); }} className={inputCls + ' w-auto'}>
                <option value="All">All Vehicles</option>
                {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <DateRangeFilter from={tripDateFrom} to={tripDateTo} onFrom={v => { setTripDateFrom(v); setTripPage(1); }} onTo={v => { setTripDateTo(v); setTripPage(1); }} />
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700 ml-auto">
                <MapPin size={14} className="text-blue-500" />
                {formatDistance(displayFromMiles(tripTotalDist))} {distanceUnitLabel} <span className="font-normal text-slate-400">Total distance</span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <InlineToolbar search={tripSearch} onSearch={v => { setTripSearch(v); setTripPage(1); }} placeholder="Search trips..."
                columns={tripCols} onToggle={id => toggleCol(tripCols, setTripCols, id)} total={filteredTrips.length} perPage={tripPerPage} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {isVis(tripCols, 'date') && <SortHeader label="Date" field="date" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} />}
                      {isVis(tripCols, 'jurisdiction') && <SortHeader label="Jurisdiction" field="jurisdiction" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} />}
                      {isVis(tripCols, 'vehicle') && <SortHeader label="Vehicle" field="unitNumber" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} />}
                      {isVis(tripCols, 'driver') && <SortHeader label="Driver" field="driverName" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} />}
                      {isVis(tripCols, 'dist') && <SortHeader label={`Total Dist. (${distanceUnitLabel})`} field="totalDistance" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} align="right" />}
                      {isVis(tripCols, 'odoStart') && <SortHeader label={`Odo. Start (${distanceUnitLabel})`} field="odoStart" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} align="right" />}
                      {isVis(tripCols, 'odoEnd') && <SortHeader label={`Odo. End (${distanceUnitLabel})`} field="odoEnd" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} align="right" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedTrips.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedTrip(t)}>
                        {isVis(tripCols, 'date') && <td className={`${tdClass} font-medium text-slate-700`}>{fmtDate(t.date)}</td>}
                        {isVis(tripCols, 'jurisdiction') && <td className={`${tdClass} text-slate-700`}>{t.jurisdiction}</td>}
                        {isVis(tripCols, 'vehicle') && <td className={tdClass}><span className="font-bold text-slate-900">{t.unitNumber}</span></td>}
                        {isVis(tripCols, 'driver') && <td className={tdClass}><div className="flex items-center gap-2"><DriverAvatar name={t.driverName} /><span className="text-slate-600">{t.driverName}</span></div></td>}
                        {isVis(tripCols, 'dist') && <td className={`${tdClass} text-right font-mono font-bold text-slate-900`}>{formatDistance(displayFromMiles(t.totalDistance))}</td>}
                        {isVis(tripCols, 'odoStart') && <td className={`${tdClass} text-right font-mono text-slate-600`}>{formatDistance(displayFromMiles(t.odoStart))}</td>}
                        {isVis(tripCols, 'odoEnd') && <td className={`${tdClass} text-right font-mono text-slate-600`}>{formatDistance(displayFromMiles(t.odoEnd))}</td>}
                      </tr>
                    ))}
                    {filteredTrips.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No trip records match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <InlinePagination total={filteredTrips.length} page={tripPage} perPage={tripPerPage} onPage={setTripPage} onPerPage={v => { setTripPerPage(v); setTripPage(1); }} />
            </div>
          </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: FUEL PURCHASES                                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'purchases' && (() => {
          function parseLoc(loc: string): { city: string; state: string } {
            const parts = loc.split(', ');
            const last = parts[parts.length - 1] || '';
            const words = last.trim().split(' ');
            const state = words[words.length - 1] || '';
            const city = words.slice(0, -1).join(' ') || last;
            return { city, state };
          }
          function fuelCardNo(id: string): string {
            return `FC-${id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;
          }
          function otherRefNo(id: string): string | null {
            const n = parseInt(id.replace(/\D/g, '') || '0');
            return n % 4 === 0 ? `PO-${String(n * 13 + 200).padStart(5, '0')}` : null;
          }
          function getRate(dateStr: string): number {
            return MONTHLY_RATES[dateStr.slice(0, 7)] || 1.35;
          }

          const pagedPurch = filteredPurchases.slice((purchPage - 1) * purchPerPage, purchPage * purchPerPage);
          const sortPur = (f: string) => toggleSort(f, purchSortField, purchSortDir, setPurchSortField, setPurchSortDir);
          const purchCurrency = purchaseCountry === 'US' ? 'USD' : 'CAD';
          const jurisdictionOptions = purchaseCountry === 'US' ? US_STATES : CA_PROVINCES;
          const allJurisdictionLabel = purchaseCountry === 'US' ? 'All States' : 'All Provinces';

          // ── KPI computations ──
          const GAL_TO_L = 3.78541;
          const totalSpendUSD = filteredPurchases.reduce((s, p) => s + p.totalCost, 0);
          const totalSpendCAD = filteredPurchases.reduce((s, p) => s + p.totalCost * getRate(p.date), 0);
          const totalGallons  = filteredPurchases.reduce((s, p) => s + p.gallons, 0);
          const totalLitres   = totalGallons * GAL_TO_L;
          // USD: avg $/gal   CAD: avg CAD$/litre
          const avgPpg  = totalGallons > 0 ? totalSpendUSD / totalGallons : 0;
          const avgPpl  = totalLitres  > 0 ? totalSpendCAD / totalLitres  : 0;

          // US / CA split
          const usCount = filteredPurchases.filter(p => !CANADA_JURISDICTIONS.has(p.jurisdiction)).length;
          const caCount = filteredPurchases.length - usCount;
          const totalRecs = filteredPurchases.length;

          // Monthly spend sparkline
          const monthlyMap = new Map<string, number>();
          filteredPurchases.forEach(p => {
            const ym = p.date.slice(0, 7);
            monthlyMap.set(ym, (monthlyMap.get(ym) || 0) + p.totalCost);
          });
          const sparkData = [...monthlyMap.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, spend]) => ({ month: month.slice(5), spend: Math.round(spend) }));
          const half = Math.floor(sparkData.length / 2);
          const prevTotal = sparkData.slice(0, half).reduce((s, d) => s + d.spend, 0);
          const lastTotal = sparkData.slice(half).reduce((s, d) => s + d.spend, 0);
          const spendTrend = prevTotal > 0 ? ((lastTotal - prevTotal) / prevTotal) * 100 : 0;

          // Top 5 vehicles by avg $/gal for gradient bars
          const vehAccum = new Map<string, { total: number; totalCAD: number; gallons: number }>();
          filteredPurchases.forEach(p => {
            const cur = vehAccum.get(p.unitNumber) || { total: 0, totalCAD: 0, gallons: 0 };
            const rate = getRate(p.date);
            cur.total    += p.totalCost;
            cur.totalCAD += p.totalCost * rate;
            cur.gallons  += p.gallons;
            vehAccum.set(p.unitNumber, cur);
          });
          const topVehs = [...vehAccum.entries()]
            .map(([unit, { total, totalCAD, gallons }]) => ({
              unit, gallons, totalCAD,
              avgPpg: gallons > 0 ? total / gallons : 0,
            }))
            .sort((a, b) => b.avgPpg - a.avgPpg)
            .slice(0, 5);
          const maxPpg = topVehs.length > 0 ? topVehs[0].avgPpg : 1;
          const BAR_COLORS = ['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];

          return (
          <div className="space-y-5">

            {/* ── KPI Cards (3 styled cards) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Card 1: Total Spend + sparkline */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Spend</span>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                    {purchCurrency}
                  </span>
                </div>
                <div className="text-[26px] font-bold text-slate-900 leading-tight">
                  ${purchCurrency === 'USD'
                    ? totalSpendUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : totalSpendCAD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-2 mt-0.5 mb-3">
                  <span className={`text-xs font-bold ${spendTrend >= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {spendTrend >= 0 ? '↑' : '↓'}{Math.abs(spendTrend).toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-400">vs prior period</span>
                  <span className="text-xs text-slate-400 ml-auto font-medium">
                    {purchCurrency === 'USD'
                      ? <>≈ ${totalSpendCAD.toLocaleString(undefined, { maximumFractionDigits: 0 })} CAD</>
                      : <>≈ ${totalSpendUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD</>}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={56}>
                  <LineChart data={sparkData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                    <RechartsTooltip
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toLocaleString()}`, purchCurrency]}
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', padding: '4px 10px' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Card 2: Transactions + US/CA coverage bars */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Transactions</span>
                <div className="flex items-baseline gap-2 mt-1 mb-4">
                  <span className="text-[26px] font-bold text-slate-900 leading-tight">{totalRecs}</span>
                  <span className="text-xs text-slate-400 font-medium">purchase records</span>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">🇺🇸 USA</span>
                      <span className="font-bold text-slate-700">
                        {usCount} <span className="text-slate-400 font-normal">({totalRecs > 0 ? Math.round(usCount / totalRecs * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${totalRecs > 0 ? (usCount / totalRecs) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">🇨🇦 Canada</span>
                      <span className="font-bold text-slate-700">
                        {caCount} <span className="text-slate-400 font-normal">({totalRecs > 0 ? Math.round(caCount / totalRecs * 100) : 0}%)</span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full transition-all duration-500"
                        style={{ width: `${totalRecs > 0 ? (caCount / totalRecs) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      {purchCurrency === 'USD' ? (
                        <><span>Total Gallons</span><span className="font-semibold text-slate-600">{totalGallons.toLocaleString(undefined, { maximumFractionDigits: 0 })} gal</span></>
                      ) : (
                        <><span>Total Litres</span><span className="font-semibold text-slate-600">{totalLitres.toLocaleString(undefined, { maximumFractionDigits: 0 })} L</span></>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Avg $/Gal (USD) or Avg $/L (CAD) + top-vehicle gradient bars */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {purchCurrency === 'USD' ? 'Avg. $/Gallon' : 'Avg. $/Litre'}
                </span>
                <div className="flex items-baseline gap-2 mt-1 mb-4">
                  <span className="text-[26px] font-bold text-slate-900 leading-tight">
                    ${purchCurrency === 'USD' ? avgPpg.toFixed(3) : avgPpl.toFixed(3)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">fleet average</span>
                </div>
                <div className="space-y-2">
                  {topVehs.map((v, i) => {
                    const displayVal = purchCurrency === 'USD'
                      ? v.avgPpg
                      : (v.gallons > 0 ? v.totalCAD / (v.gallons * GAL_TO_L) : 0);
                    const maxVal = purchCurrency === 'USD' ? maxPpg : (topVehs[0]?.totalCAD / (topVehs[0]?.gallons * GAL_TO_L) || 1);
                    return (
                      <div key={v.unit} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 w-14 shrink-0 truncate font-medium">{v.unit}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${BAR_COLORS[i]} rounded-full`}
                            style={{ width: `${maxVal > 0 ? (displayVal / maxVal) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 w-12 text-right">${displayVal.toFixed(3)}</span>
                      </div>
                    );
                  })}
                  {topVehs.length === 0 && <p className="text-xs text-slate-400 text-center py-2">No data</p>}
                </div>
              </div>
            </div>

            {/* ── Main Table Card ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-5 pt-4 pb-3 border-b border-slate-200 bg-white space-y-3">

                {/* Row 1: title left · toggle right */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800">Fuel Purchase Records</h3>
                    <span className="text-xs text-slate-400">{filteredPurchases.length} records</span>
                  </div>

                  {/* US / Canada country toggle */}
                  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      onClick={() => { setPurchaseCountry('US'); setPurchaseJurisdiction('All'); setPurchPage(1); }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-150 ${
                        purchaseCountry === 'US'
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      🇺🇸 US
                    </button>
                    <button
                      onClick={() => { setPurchaseCountry('Canada'); setPurchaseJurisdiction('All'); setPurchPage(1); }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-150 ${
                        purchaseCountry === 'Canada'
                          ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      🇨🇦 Canada
                    </button>
                  </div>
                </div>

                {/* Row 2: all filters */}
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={purchaseVehicle} onChange={e => { setPurchaseVehicle(e.target.value); setPurchPage(1); }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Vehicles</option>
                    {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select value={purchaseJurisdiction} onChange={e => { setPurchaseJurisdiction(e.target.value); setPurchPage(1); }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">{allJurisdictionLabel}</option>
                    {jurisdictionOptions.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                  <select value={purchaseFuelType} onChange={e => { setPurchaseFuelType(e.target.value); setPurchPage(1); }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="All">All Fuel Types</option>
                    {FUEL_TYPE_OPTIONS.map(ft => <option key={ft} value={ft}>{ft}</option>)}
                  </select>
                  <DateRangeFilter from={purchDateFrom} to={purchDateTo} onFrom={v => { setPurchDateFrom(v); setPurchPage(1); }} onTo={v => { setPurchDateTo(v); setPurchPage(1); }} />
                </div>

              </div>

              {/* Search + Column toggle toolbar */}
              <InlineToolbar
                search={purchSearch}
                onSearch={v => { setPurchSearch(v); setPurchPage(1); }}
                placeholder="Search purchases…"
                columns={purchCols}
                onToggle={id => toggleCol(purchCols, setPurchCols, id)}
                total={filteredPurchases.length}
                perPage={purchPerPage}
              />

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {isVis(purchCols, 'unit') && (
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Unit #</th>
                      )}
                      {isVis(purchCols, 'driver') && (
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                      )}
                      {isVis(purchCols, 'date') && <SortHeader label="Txn Date" field="date" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} />}
                      {isVis(purchCols, 'city') && <SortHeader label="Location City" field="location" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} />}
                      {isVis(purchCols, 'state') && (
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">State/Prov.</th>
                      )}
                      {isVis(purchCols, 'gallons') && (
                        <SortHeader label={purchCurrency === 'USD' ? 'Qty (Gal)' : 'Qty (L)'} field="gallons" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} align="right" />
                      )}
                      {isVis(purchCols, 'fuelType') && (
                        <th className="px-4 py-3 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fuel Type</th>
                      )}
                      {isVis(purchCols, 'ppg') && (
                        <SortHeader label={purchCurrency === 'USD' ? '$/Gal (USD)' : '$/L (CAD)'} field="pricePerGallon" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} align="right" />
                      )}
                      {isVis(purchCols, 'totalUSD') && (
                        <SortHeader label={`Total (${purchCurrency})`} field="totalCost" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} align="right" />
                      )}
                      {purchCurrency === 'CAD' && isVis(purchCols, 'rate') && (
                        <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Exch. Rate</th>
                      )}
                      {isVis(purchCols, 'totalCAD') && null /* merged into totalUSD column */}
                      {isVis(purchCols, 'fuelCard') && (
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">FuelCard #</th>
                      )}
                      {isVis(purchCols, 'otherRef') && (
                        <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Other Ref #</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedPurch.map(p => {
                      const loc = parseLoc(p.location);
                      const rate = getRate(p.date);
                      const totalUSD = p.totalCost;
                      const totalCAD = +(p.totalCost * rate).toFixed(2);
                      const fc = p.fuelCard || fuelCardNo(p.id);
                      const ref = p.otherRef || otherRefNo(p.id);
                      const isCA = CANADA_JURISDICTIONS.has(p.jurisdiction);
                      return (
                        <tr key={p.id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedPurchase(p)}>

                          {/* Unit # */}
                          {isVis(purchCols, 'unit') && (
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${isCA ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                {p.unitNumber}
                              </span>
                            </td>
                          )}

                          {/* Driver */}
                          {isVis(purchCols, 'driver') && (
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <DriverAvatar name={p.driverName} />
                                <span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">{p.driverName}</span>
                              </div>
                            </td>
                          )}

                          {/* Date */}
                          {isVis(purchCols, 'date') && (
                            <td className="px-4 py-3 text-[13px] font-medium text-slate-700 whitespace-nowrap">
                              {fmtDate(p.date)}
                            </td>
                          )}

                          {/* City */}
                          {isVis(purchCols, 'city') && (
                            <td className="px-4 py-3 text-[13px] text-slate-700">{loc.city || p.location}</td>
                          )}

                          {/* State / Province */}
                          {isVis(purchCols, 'state') && (
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {loc.state}
                              </span>
                            </td>
                          )}

                          {/* Qty — gallons in USD mode, litres in CAD mode */}
                          {isVis(purchCols, 'gallons') && (
                            <td className="px-4 py-3 text-right">
                              {purchCurrency === 'USD' ? (
                                <>
                                  <span className="text-[13px] font-bold font-mono text-slate-700">{p.gallons.toFixed(1)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">gal</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[13px] font-bold font-mono text-slate-700">{(p.gallons * GAL_TO_L).toFixed(1)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">L</span>
                                </>
                              )}
                            </td>
                          )}

                          {/* Fuel Type */}
                          {isVis(purchCols, 'fuelType') && (
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                                {p.fuelType}
                              </span>
                            </td>
                          )}

                          {/* Price per unit — $/gal USD or $/L CAD */}
                          {isVis(purchCols, 'ppg') && (
                            <td className="px-4 py-3 text-right text-[13px] font-mono text-slate-600">
                              {purchCurrency === 'USD'
                                ? `$${p.pricePerGallon.toFixed(3)}`
                                : `$${(p.pricePerGallon * rate / GAL_TO_L).toFixed(3)}`}
                            </td>
                          )}

                          {/* Total — switches between USD and CAD */}
                          {isVis(purchCols, 'totalUSD') && (
                            <td className="px-4 py-3 text-right">
                              {purchCurrency === 'USD' ? (
                                <>
                                  <span className="text-[13px] font-bold font-mono text-blue-700">${totalUSD.toFixed(2)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">USD</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-[13px] font-bold font-mono text-red-700">${totalCAD.toFixed(2)}</span>
                                  <span className="text-[10px] text-slate-400 ml-1">CAD</span>
                                </>
                              )}
                            </td>
                          )}

                          {/* Exchange Rate — visible only in CAD mode */}
                          {purchCurrency === 'CAD' && isVis(purchCols, 'rate') && (
                            <td className="px-4 py-3 text-right">
                              <span className="text-[12px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                                {rate.toFixed(3)}
                              </span>
                            </td>
                          )}

                          {/* FuelCard # */}
                          {isVis(purchCols, 'fuelCard') && (
                            <td className="px-4 py-3">
                              <span className="font-mono text-[12px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded">
                                {fc}
                              </span>
                            </td>
                          )}

                          {/* Other Ref # */}
                          {isVis(purchCols, 'otherRef') && (
                            <td className="px-4 py-3">
                              {ref
                                ? <span className="font-mono text-[12px] text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">{ref}</span>
                                : <span className="text-slate-300 text-sm">—</span>}
                            </td>
                          )}

                          {/* Action: Edit */}
                          <td className="px-4 py-3 text-center">
                            <button onClick={() => openEditPurchase(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Edit purchase">
                              <Pencil size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredPurchases.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-4 py-14 text-center">
                          <div className="text-slate-300 text-4xl mb-3">⛽</div>
                          <p className="text-sm font-semibold text-slate-400">No purchase records found</p>
                          <p className="text-xs text-slate-300 mt-1">Try clearing your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <InlinePagination
                total={filteredPurchases.length}
                page={purchPage}
                perPage={purchPerPage}
                onPage={setPurchPage}
                onPerPage={v => { setPurchPerPage(v); setPurchPage(1); }}
              />
            </div>
          </div>
          );
        })()}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: IDLING EVENTS                                                */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'idling' && (() => {
          const pagedIdle = filteredIdling.slice((idlePage - 1) * idlePerPage, idlePage * idlePerPage);
          const sortIdl = (f: string) => toggleSort(f, idleSortField, idleSortDir, setIdleSortField, setIdleSortDir);
          return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const totalMin = filteredIdling.reduce((s, e) => s + e.durationMinutes, 0);
                const totalFuel = filteredIdling.reduce((s, e) => s + e.fuelWastedGal, 0);
                const avgDur = filteredIdling.length > 0 ? totalMin / filteredIdling.length : 0;
                return [
                  { label: 'Total Events', value: filteredIdling.length, sub: 'Idling instances' },
                  { label: 'Total Idle Time', value: fmtDuration(totalMin), sub: 'Combined duration' },
                  { label: 'Fuel Wasted', value: `${totalFuel.toFixed(1)} gal`, sub: 'Estimated waste', highlight: true },
                  { label: 'Avg. Duration', value: `${avgDur.toFixed(0)} min`, sub: 'Per event' },
                ];
              })().map(kpi => (
                <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</div>
                  <div className={`text-xl font-bold ${kpi.highlight ? 'text-amber-600' : 'text-slate-900'}`}>{kpi.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={idlingVehicle} onChange={e => { setIdlingVehicle(e.target.value); setIdlePage(1); }} className={inputCls + ' w-auto'}>
                <option value="All">All Vehicles</option>
                {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={idlingDriver} onChange={e => { setIdlingDriver(e.target.value); setIdlePage(1); }} className={inputCls + ' w-auto'}>
                <option value="All">All Drivers</option>
                {TRIP_DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <DateRangeFilter from={idleDateFrom} to={idleDateTo} onFrom={v => { setIdleDateFrom(v); setIdlePage(1); }} onTo={v => { setIdleDateTo(v); setIdlePage(1); }} />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <InlineToolbar search={idleSearch} onSearch={v => { setIdleSearch(v); setIdlePage(1); }} placeholder="Search idling events..."
                columns={idleCols} onToggle={id => toggleCol(idleCols, setIdleCols, id)} total={filteredIdling.length} perPage={idlePerPage} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {isVis(idleCols, 'date') && <SortHeader label="Date" field="date" sortField={idleSortField} sortDir={idleSortDir} onSort={sortIdl} />}
                      {isVis(idleCols, 'vehicle') && <SortHeader label="Vehicle" field="unitNumber" sortField={idleSortField} sortDir={idleSortDir} onSort={sortIdl} />}
                      {isVis(idleCols, 'driver') && <SortHeader label="Driver" field="driverName" sortField={idleSortField} sortDir={idleSortDir} onSort={sortIdl} />}
                      {isVis(idleCols, 'duration') && <SortHeader label="Duration" field="durationMinutes" sortField={idleSortField} sortDir={idleSortDir} onSort={sortIdl} align="right" />}
                      {isVis(idleCols, 'fuelWasted') && <SortHeader label="Fuel Wasted (gal)" field="fuelWastedGal" sortField={idleSortField} sortDir={idleSortDir} onSort={sortIdl} align="right" />}
                      {isVis(idleCols, 'location') && <th className={`${thClass} text-left`}>Location</th>}
                      {isVis(idleCols, 'reason') && <th className={`${thClass} text-left`}>Reason</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedIdle.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedIdling(e)}>
                        {isVis(idleCols, 'date') && <td className={`${tdClass} font-medium text-slate-700`}>{fmtDate(e.date)}</td>}
                        {isVis(idleCols, 'vehicle') && <td className={`${tdClass} font-bold text-slate-900`}>{e.unitNumber}</td>}
                        {isVis(idleCols, 'driver') && <td className={tdClass}><div className="flex items-center gap-2"><DriverAvatar name={e.driverName} /><span className="text-slate-600">{e.driverName}</span></div></td>}
                        {isVis(idleCols, 'duration') && <td className={`${tdClass} text-right font-mono font-bold text-slate-900`}>{fmtDuration(e.durationMinutes)}</td>}
                        {isVis(idleCols, 'fuelWasted') && <td className={`${tdClass} text-right font-mono font-bold text-amber-600`}>{e.fuelWastedGal.toFixed(2)}</td>}
                        {isVis(idleCols, 'location') && <td className={`${tdClass} text-slate-600 max-w-[180px] truncate`}>{e.location}</td>}
                        {isVis(idleCols, 'reason') && <td className={tdClass}><span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">{e.reason}</span></td>}
                      </tr>
                    ))}
                    {filteredIdling.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">No idling events match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <InlinePagination total={filteredIdling.length} page={idlePage} perPage={idlePerPage} onPage={setIdlePage} onPerPage={v => { setIdlePerPage(v); setIdlePage(1); }} />
            </div>
          </div>
          );
        })()}

      </ScrollBody>
      )}

      {sharingVehicle && (
        <ShareToChat
          open
          onClose={() => setSharingVehicle(null)}
          title={`Share ${sharingVehicle.name}`}
          subtitle="Mileage and fuel figures for one vehicle, in a chat or by email"
          source={{ type: 'manual', id: sharingVehicle.name, label: sharingVehicle.name }}
          items={[
            { name: `${sharingVehicle.make} ${sharingVehicle.model} · ${sharingVehicle.year}`, group: 'Vehicle' },
            { name: sharingVehicle.fuelType || '—', group: 'Fuel type' },
            { name: `${sharingVehicle.totalMi.toLocaleString()} mi in the period`, group: 'Distance' },
            ...(sharingVehicle.fuelEfficiency ? [{ name: `${sharingVehicle.fuelEfficiency.toFixed(1)} MPG`, group: 'Efficiency' }] : []),
          ]}
          defaultChannel="in-app"
          defaultSubject={`${sharingVehicle.name} — fuel & mileage`}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODALS                                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}

      {/* ── Trip Detail ── */}
      {selectedTrip && (
        <ModalOverlay title="Trip Report Detail" onClose={() => setSelectedTrip(null)}
          footer={<button onClick={() => setSelectedTrip(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>}>
          <div className="space-y-0">
            <DetailRow label="Date" value={fmtDate(selectedTrip.date)} />
            <DetailRow label="Jurisdiction" value={selectedTrip.jurisdiction} />
            <DetailRow label="Vehicle ID" value={selectedTrip.unitNumber} />
            <DetailRow label="Driver" value={selectedTrip.driverName} />
            <DetailRow label="Total Distance" value={`${formatDistance(displayFromMiles(selectedTrip.totalDistance))} ${distanceUnitLabel}`} accent />
            <DetailRow label="Odometer Start" value={`${formatDistance(displayFromMiles(selectedTrip.odoStart))} ${distanceUnitLabel}`} />
            <DetailRow label="Odometer End" value={`${formatDistance(displayFromMiles(selectedTrip.odoEnd))} ${distanceUnitLabel}`} />
            <DetailRow label="Fuel Type" value={selectedTrip.fuelType} />
          </div>
        </ModalOverlay>
      )}

      {/* ── Purchase Detail (Rich Card) ── */}
      {selectedPurchase && (() => {
        const sp = selectedPurchase;
        const isCA = !US_JURISDICTIONS.has(sp.jurisdiction);
        const GAL_L = 3.78541;
        const qtyVal = isCA ? (sp.gallons * GAL_L).toFixed(1) : sp.gallons.toFixed(1);
        const qtyUnit = isCA ? 'L' : 'gal';
        const curr = isCA ? 'CAD' : 'USD';
        const currSym = isCA ? 'C$' : '$';
        const ppuLabel = isCA ? '$/Litre' : '$/Gallon';
        const ppuVal = isCA ? (sp.pricePerGallon / GAL_L).toFixed(3) : sp.pricePerGallon.toFixed(3);
        const totalVal = isCA ? (sp.totalCost * 1.37).toFixed(2) : sp.totalCost.toFixed(2);
        const country = isCA ? '🇨🇦 Canada' : '🇺🇸 United States';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setSelectedPurchase(null)} />
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">⛽</div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Fuel Purchase Record</h2>
                    <p className="text-xs text-slate-400 font-mono">{sp.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPurchase(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors"><X size={18} className="text-slate-500" /></button>
              </div>

              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                {/* KPI stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <p className="text-[10px] text-blue-500 font-bold uppercase">Quantity</p>
                    <p className="text-lg font-bold text-blue-700">{qtyVal}</p>
                    <p className="text-[10px] text-blue-400 font-medium">{qtyUnit}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 text-center border border-emerald-100">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">{ppuLabel}</p>
                    <p className="text-lg font-bold text-emerald-700">{currSym}{ppuVal}</p>
                    <p className="text-[10px] text-emerald-400 font-medium">{curr}</p>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-3 text-center border border-violet-100">
                    <p className="text-[10px] text-violet-500 font-bold uppercase">Total Cost</p>
                    <p className="text-lg font-bold text-violet-700">{currSym}{totalVal}</p>
                    <p className="text-[10px] text-violet-400 font-medium">{curr}</p>
                  </div>
                </div>

                {/* Detail Info */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Date</span>
                    <span className="text-sm font-bold text-slate-800">{fmtDate(sp.date)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Vehicle</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">{sp.unitNumber}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Driver</span>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-200 text-slate-600">{sp.driverName?.split(' ').map(n => n[0]).join('')}</div>
                      <span className="text-sm font-medium text-slate-800">{sp.driverName}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Location</span>
                    <span className="text-sm text-slate-700">{sp.location}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">{isCA ? 'Province' : 'State'}</span>
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{sp.jurisdiction}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Country</span>
                    <span className="text-sm text-slate-700">{country}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Fuel Type</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">{sp.fuelType}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Payment</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">{sp.paymentMethod}</span>
                  </div>
                  {(() => {
                    const fc = sp.fuelCard || `FC-${sp.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}`;
                    const parsedId = parseInt(sp.id.replace(/\D/g, '') || '0');
                    const ref = sp.otherRef || (parsedId % 4 === 0 ? `PO-${String(parsedId * 13 + 200).padStart(5, '0')}` : null);
                    return (
                      <>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-xs font-semibold text-slate-500 uppercase">Fuel Card #</span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">{fc}</span>
                        </div>
                        {ref && (
                          <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Other Ref #</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-50 text-slate-700 border border-slate-200">{ref}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Fuel Receipt Document */}
                {(() => {
                  const parsedId = parseInt(sp.id.replace(/\D/g, '') || '0');
                  const hasReceipt = parsedId % 2 === 0;
                  return (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Attached Document</p>
                      {hasReceipt ? (
                        <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3 border border-emerald-200">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Fuel size={16} className="text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-800">Receipt_{sp.id}.pdf</div>
                              <div className="text-[10px] text-emerald-600 font-medium">Document Type: Fuel Receipt • Uploaded {fmtDate(sp.date)}</div>
                            </div>
                          </div>
                          <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 transition-colors shadow-sm">
                            <Download size={12} /> View PDF
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-dashed border-slate-300">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Upload size={16} className="text-slate-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-500">No fuel receipt uploaded</div>
                              <div className="text-[10px] text-slate-400">Document Type: Fuel Receipt</div>
                            </div>
                          </div>
                          <button className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm">
                            <Upload size={12} /> Upload
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <button onClick={() => { openEditPurchase(sp); setSelectedPurchase(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm flex items-center gap-1.5">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={() => setSelectedPurchase(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Idling Detail ── */}
      {selectedIdling && (
        <ModalOverlay title="Idling Event Detail" onClose={() => setSelectedIdling(null)}
          footer={<button onClick={() => setSelectedIdling(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>}>
          <div className="space-y-0">
            <DetailRow label="Date" value={fmtDate(selectedIdling.date)} />
            <DetailRow label="Vehicle" value={selectedIdling.unitNumber} />
            <DetailRow label="Driver" value={selectedIdling.driverName} />
            <DetailRow label="Duration" value={fmtDuration(selectedIdling.durationMinutes)} accent />
            <DetailRow label="Fuel Wasted" value={`${selectedIdling.fuelWastedGal.toFixed(2)} gal`} accent />
            <DetailRow label="Location" value={selectedIdling.location} />
            <DetailRow label="Reason" value={selectedIdling.reason} />
          </div>
        </ModalOverlay>
      )}

      {/* ── Driver Detail ── */}
      {selectedDriver && (
        <ModalOverlay title="Driver Fuel Summary" onClose={() => setSelectedDriver(null)}
          footer={<button onClick={() => setSelectedDriver(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>}>
          <div className="space-y-0">
            <DetailRow label="Driver" value={selectedDriver.driverName} />
            <DetailRow label="Driver ID" value={selectedDriver.driverId} />
            <DetailRow label="Status" value={selectedDriver.status} />
            <DetailRow label="Assigned Vehicle" value={`${selectedDriver.assignedUnit} — ${selectedDriver.assignedVehicle}`} />
            <DetailRow label="Total Trips" value={selectedDriver.totalTrips} accent />
            <DetailRow label="Total Distance" value={`${formatDistance(displayFromMiles(selectedDriver.totalDistance))} ${distanceUnitLabel}`} accent />
            <DetailRow label="Avg. MPG" value={selectedDriver.avgMpg.toFixed(2)} />
            <DetailRow label="Fuel Used" value={`${selectedDriver.totalFuelGal.toLocaleString()} gal`} />
            <DetailRow label="Total Cost" value={`$${selectedDriver.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} accent />
            <DetailRow label="Idling Fuel Wasted" value={`${selectedDriver.idlingFuelGal.toFixed(1)} gal`} />
            <DetailRow label="Total Idle Time" value={fmtDuration(selectedDriver.idlingMinutes)} />
          </div>
        </ModalOverlay>
      )}


      {/* ── Add Trip Form ── */}
      {showAddTrip && (
        <ModalOverlay title="Add Trip Report" onClose={() => setShowAddTrip(false)}
          footer={<>
            <button onClick={() => setShowAddTrip(false)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={saveTrip} disabled={!canSaveTrip}
              className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm ${canSaveTrip ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Save</button>
          </>}>
          <div className="space-y-4">
            <FormField label="Date">
              <input type="date" value={addTripDate} onChange={e => setAddTripDate(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Jurisdiction">
              <select value={addTripJurisdiction} onChange={e => setAddTripJurisdiction(e.target.value)} className={inputCls}>
                <option value="">Select jurisdiction...</option>
                {TRIP_JURISDICTIONS.map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </FormField>
            <FormField label="Vehicle">
              <select value={addTripVehicle} onChange={e => setAddTripVehicle(e.target.value)} className={inputCls}>
                <option value="">Select vehicle...</option>
                {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FormField>
            {addTripVehicle && (
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                Driver: <span className="font-bold text-slate-800">{driverForVehicle(addTripVehicle)?.driverName || '—'}</span>
              </div>
            )}
            <FormField label={`Total Distance (${distanceUnitLabel})`}>
              <input type="number" min={0} value={addTripDist} onChange={e => setAddTripDist(e.target.value)} placeholder="0" className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={`Odo. Start (${distanceUnitLabel})`}>
                <input type="number" min={0} value={addTripOdoStart} onChange={e => setAddTripOdoStart(e.target.value)} placeholder="0" className={inputCls} />
              </FormField>
              <FormField label={`Odo. End (${distanceUnitLabel})`}>
                <input type="number" min={0} value={addTripOdoEnd} onChange={e => setAddTripOdoEnd(e.target.value)} placeholder="0" className={inputCls} />
              </FormField>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Add / Edit Purchase Form ── */}
      {showAddPurchase && (
        <ModalOverlay title={editingPurchase ? 'Edit Fuel Purchase' : 'Add Fuel Purchase'} onClose={() => { setShowAddPurchase(false); setEditingPurchase(null); resetPurchForm(); }}
          footer={<>
            <button onClick={() => { setShowAddPurchase(false); setEditingPurchase(null); resetPurchForm(); }} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={savePurchase} disabled={!canSavePurchase}
              className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm ${canSavePurchase ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>{editingPurchase ? 'Update' : 'Save'}</button>
          </>}>
          <div className="space-y-4">
            {/* Country Selector */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Select Country</p>
              <div className="flex items-center gap-2">
                <button onClick={() => { setAddPurchCountry('US'); setAddPurchJurisdiction(''); }} className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                  addPurchCountry === 'US' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}>
                  🇺🇸 United States
                </button>
                <button onClick={() => { setAddPurchCountry('Canada'); setAddPurchJurisdiction(''); }} className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                  addPurchCountry === 'Canada' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}>
                  🇨🇦 Canada
                </button>
              </div>
            </div>

            <FormField label="Date">
              <input type="date" value={addPurchDate} onChange={e => setAddPurchDate(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Vehicle">
              <select value={addPurchVehicle} onChange={e => setAddPurchVehicle(e.target.value)} className={inputCls}>
                <option value="">Select vehicle...</option>
                {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FormField>
            {addPurchVehicle && (
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                Driver: <span className="font-bold text-slate-800">{driverForVehicle(addPurchVehicle)?.driverName || '—'}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="City">
                <input type="text" value={addPurchLocation} onChange={e => setAddPurchLocation(e.target.value)} placeholder="e.g. Dallas" className={inputCls} />
              </FormField>
              <FormField label={addPurchCountry === 'US' ? 'State' : 'Province'}>
                <select value={addPurchJurisdiction} onChange={e => setAddPurchJurisdiction(e.target.value)} className={inputCls}>
                  <option value="">Select {addPurchCountry === 'US' ? 'state' : 'province'}...</option>
                  {(addPurchCountry === 'US'
                    ? ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']
                    : ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']
                  ).map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Fuel Type">
              <select value={addPurchFuelType} onChange={e => setAddPurchFuelType(e.target.value)} className={inputCls}>
                {['Diesel', 'Diesel/Electric', 'Gasoline', 'DEF'].map(ft => <option key={ft} value={ft}>{ft}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label={addPurchCountry === 'US' ? 'Gallons' : 'Litres'}>
                <input type="number" min={0} step={0.1} value={addPurchGallons} onChange={e => setAddPurchGallons(e.target.value)} placeholder="0" className={inputCls} />
              </FormField>
              <FormField label={addPurchCountry === 'US' ? 'Price per Gallon ($USD)' : 'Price per Litre ($CAD)'}>
                <input type="number" min={0} step={0.01} value={addPurchPpg} onChange={e => setAddPurchPpg(e.target.value)} placeholder="0.00" className={inputCls} />
              </FormField>
            </div>
            {Number(addPurchGallons) > 0 && Number(addPurchPpg) > 0 && (
              <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm font-bold text-blue-700">
                Total: {addPurchCountry === 'US' ? '$' : 'C$'}{(Number(addPurchGallons) * Number(addPurchPpg)).toFixed(2)} {addPurchCountry === 'US' ? 'USD' : 'CAD'}
              </div>
            )}
            <FormField label="Payment Method">
              <select value={addPurchPayment} onChange={e => setAddPurchPayment(e.target.value)} className={inputCls}>
                <option value="Fuel Card">Fuel Card</option>
                <option value="Company Card">Company Card</option>
                <option value="Cash">Cash</option>
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Fuel Card #">
                <input type="text" value={addPurchFuelCard} onChange={e => setAddPurchFuelCard(e.target.value)} placeholder="e.g. FC-1234" className={inputCls} />
              </FormField>
              <FormField label="Other Ref #">
                <input type="text" value={addPurchOtherRef} onChange={e => setAddPurchOtherRef(e.target.value)} placeholder="e.g. PO-00200" className={inputCls} />
              </FormField>
            </div>

            {/* ── Fuel Receipt Upload (linked to fuel_receipt document type) ── */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fuel Receipt <span className="text-[10px] font-normal normal-case text-slate-400">(Document Type: Fuel Receipt)</span></p>
              <input
                ref={receiptInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setAddPurchReceipt(file.name);
                }}
              />
              {addPurchReceipt ? (
                <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-3 py-2.5 border border-emerald-200">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Upload size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{addPurchReceipt}</div>
                      <div className="text-[10px] text-emerald-600 font-medium">Linked to Document Type: Fuel Receipt</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => receiptInputRef.current?.click()} className="px-2 py-1 rounded text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transition-colors">Change</button>
                    <button type="button" onClick={() => setAddPurchReceipt('')} className="p-1 rounded hover:bg-red-100 transition-colors" title="Remove receipt">
                      <X size={14} className="text-red-400 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => receiptInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer group"
                >
                  <Upload size={20} className="mx-auto text-slate-400 group-hover:text-blue-500 mb-1 transition-colors" />
                  <p className="text-sm font-semibold text-slate-600 group-hover:text-blue-600">Upload Fuel Receipt</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">PDF, JPG, PNG • Max 10 MB</p>
                </button>
              )}
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Bulk Upload Modal ── */}
      {showBulkUpload && (() => {
        const isUS = bulkCountry === 'US';
        const csvHeaders = isUS
          ? 'Date,Unit#,Driver,Location City,State,Gallons,Price Per Gallon (USD),Fuel Type,Payment Method'
          : 'Date,Unit#,Driver,Location City,Province,Litres,Price Per Litre (CAD),Fuel Type,Payment Method';
        const csvSample = isUS
          ? '2026-02-15,TR-1049,John Smith,Dallas,TX,120.5,4.129,Diesel,Fuel Card'
          : '2026-02-15,TR-1049,John Smith,Toronto,ON,455.8,1.890,Diesel,Fuel Card';
        const csvContent = csvHeaders + '\n' + csvSample;
        const downloadCsv = () => {
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `fuel_purchase_template_${bulkCountry.toLowerCase()}.csv`;
          a.click(); URL.revokeObjectURL(url);
        };
        return (
          <ModalOverlay title="Bulk Upload Fuel Purchases" onClose={() => setShowBulkUpload(false)}
            footer={<>
              <button onClick={() => setShowBulkUpload(false)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button className="px-5 py-2 rounded-lg text-sm font-bold shadow-sm bg-blue-600 text-white hover:bg-blue-700">Upload</button>
            </>}>
            <div className="space-y-4">
              {/* Country Selector */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Select Country</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBulkCountry('US')} className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                    isUS ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}>
                    🇺🇸 United States
                  </button>
                  <button onClick={() => setBulkCountry('Canada')} className={`flex-1 py-3 rounded-lg text-sm font-bold border-2 transition-all ${
                    !isUS ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                  }`}>
                    🇨🇦 Canada
                  </button>
                </div>
              </div>

              {/* Drag & Drop area */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50">
                <Upload size={32} className="mx-auto text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-700">Drag & drop your file here</p>
                <p className="text-xs text-slate-400 mt-1">or click to browse • CSV, XLSX supported</p>
              </div>

              {/* Required columns */}
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-600 mb-2">Required columns for {isUS ? '🇺🇸 US' : '🇨🇦 Canada'}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {(isUS
                    ? ['Date', 'Unit#', 'Driver', 'Location City', 'State', 'Gallons', 'Price/Gal (USD)', 'Fuel Type', 'Payment']
                    : ['Date', 'Unit#', 'Driver', 'Location City', 'Province', 'Litres', 'Price/L (CAD)', 'Fuel Type', 'Payment']
                  ).map(col => (
                    <span key={col} className="px-2 py-0.5 rounded text-[10px] font-bold bg-white border border-slate-200 text-slate-600">{col}</span>
                  ))}
                </div>
              </div>

              {/* CSV Preview */}
              <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Template Preview</p>
                <pre className="text-[11px] text-emerald-400 font-mono whitespace-pre">{csvHeaders}\n{csvSample}</pre>
              </div>

              {/* Download template */}
              <button onClick={downloadCsv} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors border border-blue-200 w-full justify-center">
                <Download size={14} /> Download {isUS ? 'US' : 'Canada'} CSV Template
              </button>
            </div>
          </ModalOverlay>
        );
      })()}

      {/* ── Add Idling Event Form ── */}
      {showAddIdling && (
        <ModalOverlay title="Add Idling Event" onClose={() => setShowAddIdling(false)}
          footer={<>
            <button onClick={() => setShowAddIdling(false)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={saveIdling} disabled={!canSaveIdling}
              className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm ${canSaveIdling ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Save</button>
          </>}>
          <div className="space-y-4">
            <FormField label="Date">
              <input type="date" value={addIdleDate} onChange={e => setAddIdleDate(e.target.value)} className={inputCls} />
            </FormField>
            <FormField label="Vehicle">
              <select value={addIdleVehicle} onChange={e => setAddIdleVehicle(e.target.value)} className={inputCls}>
                <option value="">Select vehicle...</option>
                {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FormField>
            {addIdleVehicle && (
              <div className="px-3 py-2 bg-slate-50 rounded-lg text-sm text-slate-600">
                Driver: <span className="font-bold text-slate-800">{driverForVehicle(addIdleVehicle)?.driverName || '—'}</span>
              </div>
            )}
            <FormField label="Duration (minutes)">
              <input type="number" min={1} value={addIdleDuration} onChange={e => setAddIdleDuration(e.target.value)} placeholder="0" className={inputCls} />
            </FormField>
            {Number(addIdleDuration) > 0 && (
              <div className="px-3 py-2 bg-amber-50 rounded-lg text-sm font-bold text-amber-700">
                Est. fuel wasted: {(Number(addIdleDuration) * 0.5 / 60).toFixed(2)} gal
              </div>
            )}
            <FormField label="Location">
              <input type="text" value={addIdleLocation} onChange={e => setAddIdleLocation(e.target.value)} placeholder="e.g. Pilot Travel Center" className={inputCls} />
            </FormField>
            <FormField label="Reason">
              <select value={addIdleReason} onChange={e => setAddIdleReason(e.target.value)} className={inputCls}>
                <option value="">Select reason...</option>
                {['Loading/Unloading', 'Traffic Congestion', 'Rest Stop - Engine On', 'Warm-Up Period', 'Waiting at Customer', 'Fueling Queue', 'Inspection Checkpoint', 'Weather Delay'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </FormField>
          </div>
        </ModalOverlay>
      )}

    </div>
    </ListHeaderBridge>
  );
}
