import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, MapPin, X, Plus, Calendar, ArrowUp, ArrowDown, Search, SlidersHorizontal, ChevronLeft, ChevronRight, TrendingUp, Globe, BarChart3, Truck, Fuel, Gauge, LayoutGrid, Route, ShoppingCart, Timer } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { INITIAL_ASSETS } from '@/pages/assets/assets.data';
import {
  TRIP_RECORDS, FUEL_PURCHASES, IDLING_EVENTS,
  TRIP_JURISDICTIONS, TRIP_VEHICLES, TRIP_DRIVERS,
  DRIVER_VEHICLE_ASSIGNMENTS,
  type TripRecord, type FuelPurchase, type IdlingEvent, type DriverFuelSummary,
} from './fuel.data';
import {
  IFTA_SUMMARY_RESULTS,
  IFTA_AVAILABLE_YEARS,
  JURISDICTION_LABELS,
  JURISDICTION_REGION,
  getQuarter,
} from './ifta-summary.data';

// ── Overview trend data ────────────────────────────────────────────────────────
const trendData = [
  { date: 'DEC 07', mpg: 0.1 }, { date: 'DEC 14', mpg: 7.3 },
  { date: 'DEC 21', mpg: 5.9 }, { date: 'DEC 28', mpg: 7.1 },
  { date: 'JAN 04', mpg: 4.8 }, { date: 'JAN 11', mpg: 5.0 },
  { date: 'JAN 18', mpg: 5.8 }, { date: 'JAN 25', mpg: 5.4 },
  { date: 'FEB 01', mpg: 3.6 }, { date: 'FEB 22', mpg: 3.4 },
];


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
/** Convert km to miles */
function kmToMiles(km: number): number { return km * 0.621371; }

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
type TabId = 'overview' | 'vehicles' | 'ifta' | 'trips' | 'purchases' | 'idling';
const TABS: { id: TabId; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'vehicles', label: 'Vehicles', icon: Truck },
  { id: 'ifta', label: 'IFTA Summary', icon: Globe },
  { id: 'trips', label: 'Trip Reports', icon: Route },
  { id: 'purchases', label: 'Fuel Purchases', icon: ShoppingCart },
  { id: 'idling', label: 'Idling Events', icon: Timer },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function FuelPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Filters
  const [tripJurisdiction, setTripJurisdiction] = useState('All');
  const [tripVehicle, setTripVehicle] = useState('All');
  const [purchaseVehicle, setPurchaseVehicle] = useState('All');
  const [purchaseDriver, setPurchaseDriver] = useState('All');
  const [idlingVehicle, setIdlingVehicle] = useState('All');
  const [idlingDriver, setIdlingDriver] = useState('All');

  // ── IFTA State Mileage filters ──
  const [iftaYear, setIftaYear] = useState(2026);
  const [iftaQuarter, setIftaQuarter] = useState('');
  const [iftaMonth, setIftaMonth] = useState('');
  const [iftaRegion, setIftaRegion] = useState('All');
  const [expandedJur, setExpandedJur] = useState<Set<string>>(new Set());
  const [expandedVehicle, setExpandedVehicle] = useState<Set<string>>(new Set());
  const [expandedVeh, setExpandedVeh] = useState<Set<string>>(new Set());
  const [expandedVehJur, setExpandedVehJur] = useState<Set<string>>(new Set());

  // ── Detail view modals ──
  const [selectedTrip, setSelectedTrip] = useState<TripRecord | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<FuelPurchase | null>(null);
  const [selectedIdling, setSelectedIdling] = useState<IdlingEvent | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverFuelSummary | null>(null);

  // ── Add form modals ──
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [showAddIdling, setShowAddIdling] = useState(false);

  // ── Local data (growable) ──
  const [localTrips, setLocalTrips] = useState<TripRecord[]>(TRIP_RECORDS);
  const [localPurchases, setLocalPurchases] = useState<FuelPurchase[]>(FUEL_PURCHASES);
  const [localIdling, setLocalIdling] = useState<IdlingEvent[]>(IDLING_EVENTS);

  // ── Add form state: Trip ──
  const [addTripDate, setAddTripDate] = useState('');
  const [addTripJurisdiction, setAddTripJurisdiction] = useState('');
  const [addTripVehicle, setAddTripVehicle] = useState('');
  const [addTripDist, setAddTripDist] = useState('');
  const [addTripOdoStart, setAddTripOdoStart] = useState('');
  const [addTripOdoEnd, setAddTripOdoEnd] = useState('');

  // ── Add form state: Purchase ──
  const [addPurchDate, setAddPurchDate] = useState('');
  const [addPurchVehicle, setAddPurchVehicle] = useState('');
  const [addPurchLocation, setAddPurchLocation] = useState('');
  const [addPurchGallons, setAddPurchGallons] = useState('');
  const [addPurchPpg, setAddPurchPpg] = useState('');
  const [addPurchPayment, setAddPurchPayment] = useState('Fuel Card');

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
  // ── Column visibility (purchases) ──
  const [purchCols, setPurchCols] = useState<ColDef[]>([
    { id: 'date', label: 'Date', visible: true }, { id: 'location', label: 'Location', visible: true },
    { id: 'vehicle', label: 'Vehicle', visible: true }, { id: 'driver', label: 'Driver', visible: true },
    { id: 'gallons', label: 'Gallons', visible: true }, { id: 'ppg', label: '$/Gal', visible: true },
    { id: 'cost', label: 'Total Cost', visible: true }, { id: 'fuelType', label: 'Fuel Type', visible: true },
    { id: 'payment', label: 'Payment', visible: true },
  ]);
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
  }, [localPurchases, purchaseVehicle, purchaseDriver, purchDateFrom, purchDateTo, purchSearch, purchSortField, purchSortDir]);

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
    const a = DRIVER_VEHICLE_ASSIGNMENTS.find(d => d.unitNumber === unitNumber && d.primary);
    return a || DRIVER_VEHICLE_ASSIGNMENTS.find(d => d.unitNumber === unitNumber);
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
      totalDistance: Number(addTripDist) || 0,
      odoStart: Number(addTripOdoStart) || 0,
      odoEnd: Number(addTripOdoEnd) || 0,
      fuelType: asset?.vehicleType === 'Reefer' ? 'Diesel/Electric' : 'Diesel',
    };
    setLocalTrips(prev => [newTrip, ...prev]);
    setShowAddTrip(false);
    setAddTripDate(''); setAddTripJurisdiction(''); setAddTripVehicle('');
    setAddTripDist(''); setAddTripOdoStart(''); setAddTripOdoEnd('');
  }

  function savePurchase() {
    const driver = driverForVehicle(addPurchVehicle);
    const asset = INITIAL_ASSETS.find(a => a.unitNumber === addPurchVehicle);
    const gal = Number(addPurchGallons) || 0;
    const ppg = Number(addPurchPpg) || 0;
    const newPurchase: FuelPurchase = {
      id: `fp-new-${Date.now()}`,
      date: addPurchDate,
      location: addPurchLocation,
      jurisdiction: '',
      vehicleId: asset?.id || '',
      unitNumber: addPurchVehicle,
      driverId: driver?.driverId || '',
      driverName: driver?.driverName || '—',
      gallons: gal,
      pricePerGallon: ppg,
      totalCost: +(gal * ppg).toFixed(2),
      fuelType: asset?.vehicleType === 'Reefer' ? 'Diesel/Electric' : 'Diesel',
      paymentMethod: addPurchPayment,
    };
    setLocalPurchases(prev => [newPurchase, ...prev]);
    setShowAddPurchase(false);
    setAddPurchDate(''); setAddPurchVehicle(''); setAddPurchLocation('');
    setAddPurchGallons(''); setAddPurchPpg(''); setAddPurchPayment('Fuel Card');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-6 pb-20 relative">
      <div className="w-full space-y-6">

        {/* ===== TOP HEADER ===== */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
            <p className="text-sm text-gray-500">Track fuel economy, idling, emissions, and purchases across your fleet.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
              <Download size={16} /> Export
            </button>
            {activeTab === 'trips' && (
              <button onClick={() => setShowAddTrip(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                <Plus size={15} /> Add Trip
              </button>
            )}
            {activeTab === 'purchases' && (
              <button onClick={() => setShowAddPurchase(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                <Plus size={15} /> Add Purchase
              </button>
            )}
            {activeTab === 'idling' && (
              <button onClick={() => setShowAddIdling(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm">
                <Plus size={15} /> Add Event
              </button>
            )}
          </div>
        </div>

        {/* ===== TAB NAVIGATION ===== */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="-mb-px flex space-x-6">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: OVERVIEW                                                     */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-[17px] font-bold text-slate-900">Summary</h2>
                  <span className="text-[15px] font-medium text-slate-400">/ Feb 15 - Feb 21 vs. Previous Week</span>
                </div>
                <div className="inline-flex bg-slate-100 rounded-md p-0.5">
                  <button className="px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-white rounded shadow-sm uppercase">Last Week</button>
                  <button className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 uppercase">Last 2 Weeks</button>
                  <button className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 uppercase">Last 4 Weeks</button>
                  <button className="px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-700 uppercase">Last 12 Weeks</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100 py-4">
                <div className="px-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Avg. MPG</div>
                  <div className="flex items-baseline gap-2"><span className="text-xl font-bold text-slate-900">3.7</span><span className="text-sm font-bold text-red-500">↓4%</span></div>
                </div>
                <div className="px-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Distance (mi)</div>
                  <div className="flex items-baseline gap-2"><span className="text-xl font-bold text-slate-900">86.4</span><span className="text-sm font-bold text-red-500">↓55%</span></div>
                </div>
                <div className="px-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fuel Used (gal)</div>
                  <div className="flex items-baseline gap-2 mb-0.5"><span className="text-xl font-bold text-slate-900">23.3</span><span className="text-sm font-bold text-emerald-600">↓53%</span></div>
                  <div className="text-xs text-slate-400 italic font-medium">$97.83 spent</div>
                </div>
                <div className="px-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle Util.</div>
                  <div className="flex items-baseline gap-2"><span className="text-xl font-bold text-slate-900">27.6%</span><span className="text-sm font-bold text-emerald-600">↑6</span></div>
                </div>
                <div className="px-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Idled Fuel (gal)</div>
                  <div className="flex items-baseline gap-2 mb-0.5"><span className="text-xl font-bold text-slate-900">10.8</span><span className="text-sm font-bold text-emerald-600">↓60%</span></div>
                  <div className="text-xs text-slate-400 italic font-medium">$45.44 wasted</div>
                </div>
                <div className="px-5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CO2 Emissions</div>
                  <div className="flex items-baseline gap-2"><span className="text-xl font-bold text-slate-900">0.3</span><span className="text-sm font-bold text-emerald-600">↓53%</span></div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-[17px] font-bold text-slate-900">Fuel Trends</h3>
                  <div className="flex rounded border border-slate-200 overflow-hidden">
                    <button className="px-3 py-1.5 text-[11px] font-bold bg-white text-slate-700 border-r border-slate-200">AVG. MPG</button>
                    <button className="px-3 py-1.5 text-[11px] font-bold bg-slate-50 text-slate-400 hover:text-slate-600">% IDLING</button>
                  </div>
                </div>
                <div className="flex gap-6 mb-6">
                  <div className="flex items-center gap-2"><div className="w-4 h-[3px] bg-[#0070f3] rounded-full" /><span className="text-[13px] font-medium text-slate-600">My Fleet</span></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-[3px] bg-[#f5a623] rounded-full" /><span className="text-[13px] font-medium text-slate-600">Motive Average</span></div>
                </div>
                <div className="flex-1 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 20, right: 30, left: -20, bottom: 20 }}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} ticks={['DEC 07', 'FEB 22']} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} label={{ value: '10 MPG', position: 'insideTopLeft', dy: -20, dx: 30, fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} itemStyle={{ color: '#0f172a', fontWeight: 'bold' }} />
                      <ReferenceLine y={8.3} stroke="#f5a623" strokeWidth={2} />
                      <ReferenceLine x="FEB 22" stroke="none" label={{ position: 'insideTopRight', value: '3.7', fill: 'white', fontSize: 14, fontWeight: 'bold', offset: 0 }} />
                      <Line type="linear" dataKey="mpg" stroke="#0070f3" strokeWidth={2} dot={{ r: 3, fill: 'white', stroke: '#0070f3', strokeWidth: 1.5 }} activeDot={{ r: 5, fill: '#0070f3', stroke: 'white', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="absolute right-0 top-1/4 -translate-y-[8px] mr-8 bg-[#0070f3] text-white font-bold text-sm px-3 py-1.5 rounded-[3px] pointer-events-none">3.7</div>
                  <div className="absolute right-0 top-0 bottom-6 w-12 bg-slate-50/50 pointer-events-none border-l border-slate-100/50" />
                </div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col">
                <div className="flex items-baseline gap-2 mb-6 border-b border-slate-100 pb-4">
                  <h3 className="text-[17px] font-bold text-slate-900">Fuel Efficiency Factors</h3>
                  <span className="text-[15px] text-slate-400 font-medium">/ Feb 15 - Feb 21</span>
                </div>
                <div className="space-y-6 flex-1 text-sm">
                  {[['Cruise Distance', '0%'], ['Cruise Time', '0%']].map(([lbl, val]) => (
                    <div key={lbl} className="flex justify-between items-center py-2.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <span className="text-slate-600 font-medium border-b border-dashed border-slate-300">{lbl}</span>
                      <span className="font-bold text-slate-700">{val}</span>
                    </div>
                  ))}
                  <div className="flex items-center py-2.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <span className="text-slate-600 font-medium border-b border-dashed border-slate-300">Idling Time</span>
                    <div className="ml-auto flex items-center gap-6"><span className="font-bold text-slate-700">72%</span><span className="font-bold text-emerald-600 text-xs w-6 text-right">↓6</span></div>
                  </div>
                  <div className="flex justify-between items-center py-2.5 hover:bg-slate-50/50 transition-colors">
                    <span className="text-slate-600 font-medium border-b border-dashed border-slate-300">Over RPM</span>
                    <span className="font-bold text-slate-700">0%</span>
                  </div>
                  <div className="mt-8">
                    <div className="flex justify-between items-end mb-3 border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-[15px] text-slate-800">Safety Events</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">EVENTS/1K MI</span>
                    </div>
                    {[['Hard Braking', '11.57'], ['Hard Acceleration', '0'], ['Hard Cornering', '0']].map(([lbl, val]) => (
                      <div key={lbl} className="flex justify-between items-center py-2.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <span className="text-slate-600 font-medium">{lbl}</span>
                        <span className="font-bold text-slate-700 mr-12 text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8">
                    <div className="flex justify-between items-end mb-3 border-b border-slate-100 pb-2">
                      <h4 className="font-bold text-[15px] text-slate-800">Speed</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-11">MPH</span>
                    </div>
                    <div className="flex items-center py-2.5 hover:bg-slate-50/50 transition-colors">
                      <span className="text-slate-600 font-medium">Average Driving Speed</span>
                      <div className="ml-auto flex items-center gap-6"><span className="font-bold text-slate-700 w-12 text-right">17</span><span className="font-bold text-emerald-600 text-xs w-6 text-right">↓34%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TAB: VEHICLES  (IFTA-style expandable rows)                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'vehicles' && (() => {
          // ── Build vehicle-centric aggregation from IFTA data ──
          const vehFilterYear = iftaYear;
          const vehFilterQuarter = iftaQuarter;
          const vehFilterMonth = iftaMonth;
          const vehFilterRegion = iftaRegion;

          const vehFiltered = IFTA_SUMMARY_RESULTS.filter(r => {
            const [y, m] = r.month.split('-').map(Number);
            if (y !== vehFilterYear) return false;
            if (vehFilterQuarter && getQuarter(r.month) !== Number(vehFilterQuarter)) return false;
            if (vehFilterMonth && m !== Number(vehFilterMonth)) return false;
            const region = JURISDICTION_REGION[r.jurisdiction];
            if (vehFilterRegion !== 'All' && region !== vehFilterRegion) return false;
            return true;
          });

          // Aggregate by vehicle → month → jurisdiction
          interface VMthJur { code: string; name: string; region: string; distKm: number }
          interface VMth { month: string; distKm: number; jurisdictions: Map<string, VMthJur> }
          interface VAgg { name: string; make: string; model: string; year: number; fuelType: string; fuelEfficiency: number | null; fuelTankCapacity: number | null; totalKm: number; months: Map<string, VMth> }
          const vehMap = new Map<string, VAgg>();
          for (const r of vehFiltered) {
            const key = r.vehicle.name;
            const cur = vehMap.get(key) || { name: r.vehicle.name, make: r.vehicle.make, model: r.vehicle.model, year: r.vehicle.year, fuelType: r.vehicle.fuelType, fuelEfficiency: r.vehicle.fuelEfficiency, fuelTankCapacity: r.vehicle.fuelTankCapacity, totalKm: 0, months: new Map<string, VMth>() };
            cur.totalKm += r.distance;
            const mKey = r.month;
            const mCur = cur.months.get(mKey) || { month: mKey, distKm: 0, jurisdictions: new Map<string, VMthJur>() };
            mCur.distKm += r.distance;
            const jKey = r.jurisdiction;
            const jCur = mCur.jurisdictions.get(jKey) || { code: jKey, name: JURISDICTION_LABELS[jKey] || jKey, region: JURISDICTION_REGION[jKey] || 'US', distKm: 0 };
            jCur.distKm += r.distance;
            mCur.jurisdictions.set(jKey, jCur);
            cur.months.set(mKey, mCur);
            vehMap.set(key, cur);
          }

          const MONTH_NAMES_V = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          const fmtMonthFullV = (m: string) => { const [yr, mm] = m.split('-').map(Number); return `${MONTH_NAMES_V[mm-1]} ${yr}`; };

          const vehRows = [...vehMap.values()].map(v => ({
            ...v,
            totalMi: Math.round(kmToMiles(v.totalKm)),
            monthBreakdown: [...v.months.values()]
              .sort((a, b) => a.month.localeCompare(b.month))
              .map(m => ({
                ...m,
                distMi: Math.round(kmToMiles(m.distKm)),
                label: fmtMonthFullV(m.month),
                jurBreakdown: [...m.jurisdictions.values()]
                  .map(j => ({ ...j, distMi: Math.round(kmToMiles(j.distKm)) }))
                  .sort((a, b) => b.distMi - a.distMi),
              })),
          })).sort((a, b) => b.totalMi - a.totalMi);

          const toggleVehExpand = (key: string) => setExpandedVeh(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

          // KPI stats
          const totalVehMi = vehRows.reduce((s, v) => s + v.totalMi, 0);
          const totalVehKm = vehRows.reduce((s, v) => s + v.totalKm, 0);
          const avgMpg = vehRows.length > 0 ? vehRows.reduce((s, v) => s + (v.fuelEfficiency || 0), 0) / vehRows.filter(v => v.fuelEfficiency).length : 0;
          const uniqueJurCount = new Set(vehFiltered.map(r => r.jurisdiction)).size;
          const monthLabelV = vehFilterMonth ? ['','January','February','March','April','May','June','July','August','September','October','November','December'][Number(vehFilterMonth)] : 'All Months';
          const regionLabelV = vehFilterRegion === 'All' ? 'All Regions' : vehFilterRegion;

          return (
          <div className="space-y-4">
            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Vehicles */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Truck size={18} className="text-blue-600" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fleet Vehicles</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Active in period</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">{vehRows.length}</div>
                <div className="text-xs text-slate-400 mt-1">{uniqueJurCount} jurisdictions covered</div>
              </div>

              {/* Total Distance */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Route size={18} className="text-emerald-600" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Distance</div>
                <div className="text-[11px] text-slate-400 mt-0.5">All vehicles combined</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">{totalVehMi.toLocaleString()} <span className="text-base font-medium text-slate-400">mi</span></div>
                <div className="text-xs text-slate-400 mt-1">{Math.round(totalVehKm).toLocaleString()} km</div>
              </div>

              {/* Average MPG */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 relative overflow-hidden">
                <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <Gauge size={18} className="text-amber-600" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg. Fuel Efficiency</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Fleet average</div>
                <div className="text-3xl font-bold text-slate-900 mt-2">{avgMpg.toFixed(1)} <span className="text-base font-medium text-slate-400">MPG</span></div>
                <div className="text-xs text-slate-400 mt-1">Based on {vehRows.filter(v => v.fuelEfficiency).length} vehicles</div>
              </div>
            </div>

            {/* ── Table Card ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              {/* ── Filters ── */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap bg-white">
                <select value={vehFilterYear} onChange={e => { setIftaYear(Number(e.target.value)); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={vehFilterQuarter} onChange={e => { setIftaQuarter(e.target.value); setIftaMonth(''); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Quarters</option>
                  {[1,2,3,4].map(q => <option key={q} value={q}>Q{q}</option>)}
                </select>
                <select value={vehFilterMonth} onChange={e => setIftaMonth(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">All Months</option>
                  {(vehFilterQuarter ? [((Number(vehFilterQuarter)-1)*3)+1,((Number(vehFilterQuarter)-1)*3)+2,((Number(vehFilterQuarter)-1)*3)+3] : [1,2,3,4,5,6,7,8,9,10,11,12]).map(m => (
                    <option key={m} value={m}>{MONTH_NAMES_V[m-1]}</option>
                  ))}
                </select>
                <select value={vehFilterRegion} onChange={e => setIftaRegion(e.target.value)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="All">All Regions</option>
                  <option value="US">United States</option>
                  <option value="Canada">Canada</option>
                </select>
                <button onClick={() => { setIftaYear(2026); setIftaQuarter(''); setIftaMonth(''); setIftaRegion('All'); }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  Reset filters
                </button>

                <div className="ml-auto text-sm text-gray-500">
                  <span className="font-bold text-gray-900">{vehRows.length}</span> Vehicles Found
                </div>
              </div>

              {/* ── Table Header ── */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-900">Vehicle Mileage Breakdown</h3>
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  {vehFilterYear} {vehFilterQuarter ? `Q${vehFilterQuarter}` : ''} {monthLabelV !== 'All Months' ? monthLabelV : ''} · {regionLabelV}
                </span>
              </div>

              {/* ── Table ── */}
              {vehRows.length === 0 ? (
                <div className="px-5 py-12 text-center text-slate-400">
                  <p className="text-sm font-medium">No vehicle records found for the selected filters.</p>
                  <p className="text-xs mt-1">Try adjusting the year, quarter, month, or region.</p>
                </div>
              ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className={`${thClass} text-left`} style={{ width: '36px' }}></th>
                      <th className={`${thClass} text-left`}>Vehicle</th>
                      <th className={`${thClass} text-left`}>Fuel Type</th>
                      <th className={`${thClass} text-right`}>Efficiency</th>
                      <th className={`${thClass} text-right`}>Distance (mi)</th>
                      <th className={`${thClass} text-right`}>Distance (km)</th>
                      <th className={`${thClass} text-right`}>Months</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehRows.map((row) => {
                      const isExpanded = expandedVeh.has(row.name);
                      return (
                        <React.Fragment key={row.name}>
                          {/* ── Vehicle Row ── */}
                          <tr className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer select-none ${isExpanded ? 'bg-blue-50/20' : ''}`} onClick={() => toggleVehExpand(row.name)}>
                            <td className="px-3 py-3 text-center">
                              <ChevronRight size={14} className={`text-slate-400 transition-transform duration-200 inline-block ${isExpanded ? 'rotate-90' : ''}`} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                  <Truck size={16} />
                                </div>
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-800">{row.name}</div>
                                  <div className="text-[11px] text-slate-400">{row.make} {row.model} · {row.year}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${row.fuelType?.toLowerCase() === 'diesel' ? 'bg-amber-50 text-amber-700 border border-amber-200' : row.fuelType?.toLowerCase() === 'gasoline' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                <Fuel size={10} /> {row.fuelType || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono text-slate-600">{row.fuelEfficiency ? `${row.fuelEfficiency} MPG` : '—'}</td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-900">{row.totalMi.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono text-slate-500">{Math.round(row.totalKm).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono font-semibold text-slate-700">{row.monthBreakdown.length}</td>
                          </tr>

                          {/* ── Level 2: Month Sub-Rows ── */}
                          {isExpanded && row.monthBreakdown.map((m) => {
                            const mKey = `${row.name}|||${m.month}`;
                            const isMExpanded = expandedVehJur.has(mKey);
                            return (
                              <React.Fragment key={mKey}>
                                {/* Month row */}
                                <tr className={`border-b border-slate-100/60 cursor-pointer select-none transition-colors ${isMExpanded ? 'bg-blue-50/30' : 'bg-slate-50/50 hover:bg-slate-100/40'}`}
                                    onClick={(e) => { e.stopPropagation(); setExpandedVehJur(prev => { const n = new Set(prev); n.has(mKey) ? n.delete(mKey) : n.add(mKey); return n; }); }}
                                    style={{ borderLeft: '4px solid #93c5fd' }}>
                                  <td className="px-3 py-2.5 text-center">
                                    <ChevronRight size={12} className={`text-slate-400 transition-transform duration-200 inline-block ${isMExpanded ? 'rotate-90' : ''}`} />
                                  </td>
                                  <td className="px-4 py-2.5" colSpan={3}>
                                    <div className="flex items-center gap-2 pl-3">
                                      <Calendar size={13} className="text-blue-400 flex-shrink-0" />
                                      <span className="text-[13px] font-semibold text-slate-700">{m.label}</span>
                                      <span className="text-[11px] text-slate-400">· {m.jurBreakdown.length} jurisdiction{m.jurBreakdown.length !== 1 ? 's' : ''}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-[13px] font-mono font-semibold text-slate-700">{m.distMi.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-[13px] font-mono text-slate-400">{Math.round(m.distKm).toLocaleString()}</td>
                                  <td className="px-4 py-2.5"></td>
                                </tr>

                                {/* ── Level 3: Jurisdiction rows under each month ── */}
                                {isMExpanded && m.jurBreakdown.map((j) => (
                                  <tr key={`${mKey}-${j.code}`}
                                      className="border-b border-slate-100/40 bg-white hover:bg-slate-50/60"
                                      style={{ borderLeft: '8px solid #bfdbfe' }}>
                                    <td className="px-3 py-2 text-center"></td>
                                    <td className="px-4 py-2" colSpan={3}>
                                      <div className="flex items-center gap-2 pl-6">
                                        <span className={`inline-flex items-center justify-center w-7 h-5 rounded text-[10px] font-bold leading-none flex-shrink-0 ${j.region === 'Canada' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>{j.code}</span>
                                        <span className="text-[12px] font-medium text-slate-700">{j.name}</span>
                                        <span className="text-[11px] text-slate-400">{j.region === 'Canada' ? '· Canada' : '· United States'}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right text-[12px] font-mono font-semibold text-slate-700">{j.distMi.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right text-[12px] font-mono text-slate-400">{Math.round(j.distKm).toLocaleString()}</td>
                                    <td className="px-4 py-2"></td>
                                  </tr>
                                ))}
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
                      <td className="px-4 py-3 text-[13px] font-bold text-slate-900" colSpan={3}>Total ({vehRows.length} vehicles)</td>
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-900">{totalVehMi.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-500">{Math.round(totalVehKm).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-700">{uniqueJurCount}</td>
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
        {/* TAB: IFTA SUMMARY                                                 */}
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
                      <span className="text-3xl font-bold text-gray-900 tracking-tight">{totalMi.toLocaleString()}</span>
                      <span className="text-base font-semibold text-gray-400">mi</span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-sm font-medium text-gray-500">{Math.round(totalKm).toLocaleString()}</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">km</span>
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
                      <span className="text-3xl font-bold text-gray-900 tracking-tight">{jurRows.length > 0 ? Math.round(totalMi / jurRows.length).toLocaleString() : '0'}</span>
                      <span className="text-base font-semibold text-gray-400">mi</span>
                    </div>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-sm font-medium text-gray-500">{jurRows.length > 0 ? Math.round(totalKm / jurRows.length).toLocaleString() : '0'}</span>
                      <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase">km</span>
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
                      return <div key={r.code} className={`w-full rounded-md transition-all duration-200 ${i === 0 ? 'bg-emerald-500 hover:bg-emerald-600' : i < 3 ? 'bg-emerald-300 hover:bg-emerald-400' : 'bg-emerald-200 hover:bg-emerald-300'}`} style={{ height: `${pct}%` }} title={`${r.name}: ${r.totalMi.toLocaleString()} mi`} />;
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

                {/* Right side: record count */}
                <div className="flex items-center gap-4">
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
                      <th className={`${thClass} text-right`}>Distance (mi)</th>
                      <th className={`${thClass} text-right`}>Distance (km)</th>
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
                            <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-900">{row.totalMi.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right text-[13px] font-mono text-slate-500">{Math.round(row.totalKm).toLocaleString()}</td>
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
                                  <td className="px-4 py-2.5 text-right text-[13px] font-mono font-semibold text-slate-700">{v.distMi.toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-right text-[13px] font-mono text-slate-400">{Math.round(v.distKm).toLocaleString()}</td>
                                  <td className="px-4 py-2.5"></td>
                                </tr>

                                {/* ── Expanded Vehicle: Specs + Monthly Breakdown ── */}
                                {isVExpanded && (
                                  <tr style={{ borderLeft: '4px solid #93c5fd' }} className="bg-white">
                                    <td></td>
                                    <td colSpan={5} className="px-4 py-0 pb-3">
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
                                              <div className="text-[13px] font-semibold text-emerald-900">{v.fuelEfficiency ? `${v.fuelEfficiency} MPG` : 'N/A'}</div>
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
                                                <th className="px-4 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distance (mi)</th>
                                                <th className="px-4 py-2 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">Distance (km)</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {v.monthRecords.map(mr => (
                                                <tr key={mr.month} className="border-t border-slate-100 hover:bg-slate-50/50">
                                                  <td className="px-4 py-2 text-[13px] font-medium text-slate-700">{mr.label}</td>
                                                  <td className="px-4 py-2 text-right text-[13px] font-mono font-semibold text-slate-800">{mr.distMi.toLocaleString()}</td>
                                                  <td className="px-4 py-2 text-right text-[13px] font-mono text-slate-400">{Math.round(mr.distKm).toLocaleString()}</td>
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
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-900">{totalMi.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-[13px] font-mono font-bold text-slate-500">{Math.round(totalKm).toLocaleString()}</td>
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
                {tripTotalDist.toLocaleString()} mi <span className="font-normal text-slate-400">Total distance</span>
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
                      {isVis(tripCols, 'dist') && <SortHeader label="Total Dist. (mi)" field="totalDistance" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} align="right" />}
                      {isVis(tripCols, 'odoStart') && <SortHeader label="Odo. Start" field="odoStart" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} align="right" />}
                      {isVis(tripCols, 'odoEnd') && <SortHeader label="Odo. End" field="odoEnd" sortField={tripSortField} sortDir={tripSortDir} onSort={sortTrp} align="right" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedTrips.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedTrip(t)}>
                        {isVis(tripCols, 'date') && <td className={`${tdClass} font-medium text-slate-700`}>{fmtDate(t.date)}</td>}
                        {isVis(tripCols, 'jurisdiction') && <td className={`${tdClass} text-slate-700`}>{t.jurisdiction}</td>}
                        {isVis(tripCols, 'vehicle') && <td className={tdClass}><span className="font-bold text-slate-900">{t.unitNumber}</span></td>}
                        {isVis(tripCols, 'driver') && <td className={tdClass}><div className="flex items-center gap-2"><DriverAvatar name={t.driverName} /><span className="text-slate-600">{t.driverName}</span></div></td>}
                        {isVis(tripCols, 'dist') && <td className={`${tdClass} text-right font-mono font-bold text-slate-900`}>{t.totalDistance.toLocaleString()}</td>}
                        {isVis(tripCols, 'odoStart') && <td className={`${tdClass} text-right font-mono text-slate-600`}>{t.odoStart.toLocaleString()}</td>}
                        {isVis(tripCols, 'odoEnd') && <td className={`${tdClass} text-right font-mono text-slate-600`}>{t.odoEnd.toLocaleString()}</td>}
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
          const pagedPurch = filteredPurchases.slice((purchPage - 1) * purchPerPage, purchPage * purchPerPage);
          const sortPur = (f: string) => toggleSort(f, purchSortField, purchSortDir, setPurchSortField, setPurchSortDir);
          return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(() => {
                const totalGal = filteredPurchases.reduce((s, p) => s + p.gallons, 0);
                const totalCost = filteredPurchases.reduce((s, p) => s + p.totalCost, 0);
                const avgPpg = filteredPurchases.length > 0 ? totalCost / totalGal : 0;
                return [
                  { label: 'Total Purchases', value: filteredPurchases.length, sub: 'Transactions' },
                  { label: 'Total Gallons', value: totalGal.toLocaleString(undefined, { maximumFractionDigits: 0 }), sub: 'Fuel purchased' },
                  { label: 'Total Spent', value: `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, sub: 'All purchases' },
                  { label: 'Avg. Price/Gal', value: `$${avgPpg.toFixed(2)}`, sub: 'Across all locations' },
                ];
              })().map(kpi => (
                <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">{kpi.label}</div>
                  <div className="text-xl font-bold text-slate-900">{kpi.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={purchaseVehicle} onChange={e => { setPurchaseVehicle(e.target.value); setPurchPage(1); }} className={inputCls + ' w-auto'}>
                <option value="All">All Vehicles</option>
                {TRIP_VEHICLES.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={purchaseDriver} onChange={e => { setPurchaseDriver(e.target.value); setPurchPage(1); }} className={inputCls + ' w-auto'}>
                <option value="All">All Drivers</option>
                {TRIP_DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <DateRangeFilter from={purchDateFrom} to={purchDateTo} onFrom={v => { setPurchDateFrom(v); setPurchPage(1); }} onTo={v => { setPurchDateTo(v); setPurchPage(1); }} />
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <InlineToolbar search={purchSearch} onSearch={v => { setPurchSearch(v); setPurchPage(1); }} placeholder="Search purchases..."
                columns={purchCols} onToggle={id => toggleCol(purchCols, setPurchCols, id)} total={filteredPurchases.length} perPage={purchPerPage} />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      {isVis(purchCols, 'date') && <SortHeader label="Date" field="date" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} />}
                      {isVis(purchCols, 'location') && <SortHeader label="Location" field="location" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} />}
                      {isVis(purchCols, 'vehicle') && <SortHeader label="Vehicle" field="unitNumber" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} />}
                      {isVis(purchCols, 'driver') && <SortHeader label="Driver" field="driverName" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} />}
                      {isVis(purchCols, 'gallons') && <SortHeader label="Gallons" field="gallons" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} align="right" />}
                      {isVis(purchCols, 'ppg') && <SortHeader label="$/Gal" field="pricePerGallon" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} align="right" />}
                      {isVis(purchCols, 'cost') && <SortHeader label="Total Cost" field="totalCost" sortField={purchSortField} sortDir={purchSortDir} onSort={sortPur} align="right" />}
                      {isVis(purchCols, 'fuelType') && <th className={`${thClass} text-center`}>Fuel Type</th>}
                      {isVis(purchCols, 'payment') && <th className={`${thClass} text-center`}>Payment</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedPurch.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedPurchase(p)}>
                        {isVis(purchCols, 'date') && <td className={`${tdClass} font-medium text-slate-700`}>{fmtDate(p.date)}</td>}
                        {isVis(purchCols, 'location') && <td className={tdClass}><div className="text-slate-700 max-w-[200px] truncate">{p.location}</div></td>}
                        {isVis(purchCols, 'vehicle') && <td className={`${tdClass} font-bold text-slate-900`}>{p.unitNumber}</td>}
                        {isVis(purchCols, 'driver') && <td className={tdClass}><div className="flex items-center gap-2"><DriverAvatar name={p.driverName} /><span className="text-slate-600">{p.driverName}</span></div></td>}
                        {isVis(purchCols, 'gallons') && <td className={`${tdClass} text-right font-mono font-bold text-blue-600`}>{p.gallons.toFixed(1)}</td>}
                        {isVis(purchCols, 'ppg') && <td className={`${tdClass} text-right font-mono text-slate-600`}>${p.pricePerGallon.toFixed(2)}</td>}
                        {isVis(purchCols, 'cost') && <td className={`${tdClass} text-right font-mono font-bold text-slate-900`}>${p.totalCost.toFixed(2)}</td>}
                        {isVis(purchCols, 'fuelType') && <td className={`${tdClass} text-center text-slate-600`}>{p.fuelType}</td>}
                        {isVis(purchCols, 'payment') && <td className={`${tdClass} text-center`}><span className={`px-2 py-0.5 rounded text-[11px] font-bold ${p.paymentMethod === 'Fuel Card' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>{p.paymentMethod}</span></td>}
                      </tr>
                    ))}
                    {filteredPurchases.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">No purchase records match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <InlinePagination total={filteredPurchases.length} page={purchPage} perPage={purchPerPage} onPage={setPurchPage} onPerPage={v => { setPurchPerPage(v); setPurchPage(1); }} />
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

      </div>

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
            <DetailRow label="Total Distance" value={`${selectedTrip.totalDistance.toLocaleString()} mi`} accent />
            <DetailRow label="Odometer Start" value={`${selectedTrip.odoStart.toLocaleString()} mi`} />
            <DetailRow label="Odometer End" value={`${selectedTrip.odoEnd.toLocaleString()} mi`} />
            <DetailRow label="Fuel Type" value={selectedTrip.fuelType} />
          </div>
        </ModalOverlay>
      )}

      {/* ── Purchase Detail ── */}
      {selectedPurchase && (
        <ModalOverlay title="Fuel Purchase Detail" onClose={() => setSelectedPurchase(null)}
          footer={<button onClick={() => setSelectedPurchase(null)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>}>
          <div className="space-y-0">
            <DetailRow label="Date" value={fmtDate(selectedPurchase.date)} />
            <DetailRow label="Location" value={selectedPurchase.location} />
            <DetailRow label="Vehicle" value={selectedPurchase.unitNumber} />
            <DetailRow label="Driver" value={selectedPurchase.driverName} />
            <DetailRow label="Gallons" value={selectedPurchase.gallons.toFixed(1)} accent />
            <DetailRow label="Price/Gallon" value={`$${selectedPurchase.pricePerGallon.toFixed(2)}`} />
            <DetailRow label="Total Cost" value={`$${selectedPurchase.totalCost.toFixed(2)}`} accent />
            <DetailRow label="Fuel Type" value={selectedPurchase.fuelType} />
            <DetailRow label="Payment Method" value={selectedPurchase.paymentMethod} />
          </div>
        </ModalOverlay>
      )}

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
            <DetailRow label="Total Distance" value={`${selectedDriver.totalDistance.toLocaleString()} mi`} accent />
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
            <FormField label="Total Distance (mi)">
              <input type="number" min={0} value={addTripDist} onChange={e => setAddTripDist(e.target.value)} placeholder="0" className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Odo. Start (mi)">
                <input type="number" min={0} value={addTripOdoStart} onChange={e => setAddTripOdoStart(e.target.value)} placeholder="0" className={inputCls} />
              </FormField>
              <FormField label="Odo. End (mi)">
                <input type="number" min={0} value={addTripOdoEnd} onChange={e => setAddTripOdoEnd(e.target.value)} placeholder="0" className={inputCls} />
              </FormField>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Add Purchase Form ── */}
      {showAddPurchase && (
        <ModalOverlay title="Add Fuel Purchase" onClose={() => setShowAddPurchase(false)}
          footer={<>
            <button onClick={() => setShowAddPurchase(false)} className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button onClick={savePurchase} disabled={!canSavePurchase}
              className={`px-5 py-2 rounded-lg text-sm font-bold shadow-sm ${canSavePurchase ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Save</button>
          </>}>
          <div className="space-y-4">
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
            <FormField label="Location">
              <input type="text" value={addPurchLocation} onChange={e => setAddPurchLocation(e.target.value)} placeholder="e.g. Pilot Travel Center, Dallas TX" className={inputCls} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Gallons">
                <input type="number" min={0} step={0.1} value={addPurchGallons} onChange={e => setAddPurchGallons(e.target.value)} placeholder="0" className={inputCls} />
              </FormField>
              <FormField label="Price per Gallon ($)">
                <input type="number" min={0} step={0.01} value={addPurchPpg} onChange={e => setAddPurchPpg(e.target.value)} placeholder="0.00" className={inputCls} />
              </FormField>
            </div>
            {Number(addPurchGallons) > 0 && Number(addPurchPpg) > 0 && (
              <div className="px-3 py-2 bg-blue-50 rounded-lg text-sm font-bold text-blue-700">
                Total: ${(Number(addPurchGallons) * Number(addPurchPpg)).toFixed(2)}
              </div>
            )}
            <FormField label="Payment Method">
              <select value={addPurchPayment} onChange={e => setAddPurchPayment(e.target.value)} className={inputCls}>
                <option value="Fuel Card">Fuel Card</option>
                <option value="Company Card">Company Card</option>
                <option value="Cash">Cash</option>
              </select>
            </FormField>
          </div>
        </ModalOverlay>
      )}

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
  );
}
