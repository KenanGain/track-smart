import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, ChevronRight, Edit2, Copy, Truck,
  AlertCircle, FileText,
  ShieldCheck, Hash, Clock,
  Settings, MapPin, ChevronDown, Wrench, Trash2,
  X, UploadCloud, FileDown, FileKey, FileCheck, AlertOctagon,
  Search, Calendar, CalendarClock,
  ArrowUp, ArrowDown, ArrowUpDown, ArrowLeft,
  User, Activity,
  LayoutDashboard, History,
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { Asset } from './assets.data';
import { GvwrTag } from './GvwrTag';
import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';
import { CreateScheduleForm } from './CreateScheduleForm';
import { CreateOrderModal } from './CreateOrderModal';
import { AddExpenseModal } from './AddExpenseModal';
import { INITIAL_TASKS, INITIAL_ORDERS, INITIAL_SERVICE_TYPES } from './maintenance.data';
import type { MaintenanceTask, TaskOrder } from './maintenance.data';
import { INITIAL_VENDORS } from '@/data/vendors.data';
import { INITIAL_EXPENSE_TYPES, INITIAL_ASSET_EXPENSES, type AssetExpense } from '@/pages/settings/expenses.data';
import { MOCK_ASSET_VIOLATION_RECORDS } from '@/pages/violations/violations-list.data';
import { DollarSign, Car, Eye, AlertTriangle } from 'lucide-react';
import { calculateComplianceStatus, getMaxReminderDays, isMonitoringEnabled } from '@/utils/compliance-utils';
import { US_STATES, CA_PROVINCES } from '@/pages/settings/MaintenancePage';
import { INCIDENTS } from '@/pages/incidents/incidents.data';
import { inspectionsData } from '@/pages/inspections/inspectionsData';
import { DataListToolbar, PaginationBar, type ColumnDef } from '@/components/ui/DataListToolbar';
import { getInventoryByAssetId, getVendorById, VENDOR_CATEGORIES, getCategoryLabel } from '@/pages/inventory/inventory.data';
import { Boxes } from 'lucide-react';
import { getSafetyEventsForAsset } from '@/data/safety-records';
import { SafetyRecordsPanel } from '@/components/safety/SafetyRecordsPanel';
import { computeAssetScorecards, type AssetScorecard } from '@/pages/safety-analysis/fleet-safety-score.data';

// Banner shown above the Schedule / Work Order forms when launched from an
// asset detail page — makes the pre-selected vehicle visually unmistakable so
// the user knows the form is locked to this asset.
function SelectedAssetBanner({
    asset,
    action,
}: {
    asset: { unitNumber: string; year?: number; make?: string; model?: string; vin?: string; assetType?: string; vehicleType?: string };
    action: string;
}) {
    return (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2.5 sticky top-0 z-30">
            <div className="max-w-6xl mx-auto flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    <Truck size={11} /> {action}
                </span>
                <span className="text-xs text-slate-500 font-medium">For:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-700 font-mono text-xs font-bold">
                    Unit #{asset.unitNumber}
                </span>
                <span className="text-sm font-semibold text-slate-900 truncate">
                    {[asset.year, asset.make, asset.model].filter(Boolean).join(" ")}
                </span>
                {(asset.assetType || asset.vehicleType) && (
                    <span className="text-xs text-slate-500 hidden sm:inline">
                        · {[asset.assetType, asset.vehicleType].filter(Boolean).join(" / ")}
                    </span>
                )}
                {asset.vin && (
                    <span className="text-[11px] text-slate-400 font-mono ml-auto hidden md:inline">
                        VIN •••{asset.vin.slice(-6)}
                    </span>
                )}
            </div>
        </div>
    );
}

// --- Types for Rich Data (extending base Asset) ---
export interface DetailedAsset extends Asset {
    image?: string;
    location?: string;
    odometer?: number;
    riskScore?: number;
    health?: string;
    compliance?: string;
    fuelType?: string;
    ytdCost?: string;
    ytdChange?: string;
    openWorkOrders?: number;
    woStatus?: string;
    drivers?: { name: string; initials: string; color: string }[];
    tasks?: { title: string; statusLabel: string; statusColor: string; subLabel: string; isCritical?: boolean }[];
    history?: { date: string; type: string; vendor: string; cost: string; status: string }[];
    schedules?: { id: string; name: string; frequency: string; nextDue: string; status: string }[];
    cvsaNumber?: string;
    cvsaExpiryDate?: string;
    iftaDecalNumber?: string;
    iftaExpiryDate?: string;
    transponderNumber?: string;
    transponderExpiryDate?: string;
}

// --- UI Utility ---
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// --- shadcn/ui Consistent Primitives (Local implementation to match design) ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
  const variants: Record<string, string> = {
    default: 'bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm border border-transparent',
    destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-sm border border-transparent',
    outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-transparent',
    ghost: 'hover:bg-slate-100 text-slate-500 hover:text-slate-900',
    link: 'text-[#2563EB] underline-offset-4 hover:underline p-0 h-auto font-medium',
  };
  const sizes: Record<string, string> = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    xs: 'h-7 px-2.5 text-[11px]',
    icon: 'h-8 w-8',
  };
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';

const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode; variant?: string; className?: string }) => {
  const variants: Record<string, string> = {
    default: 'bg-slate-100 text-slate-800 border-transparent',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Drafted: 'bg-blue-50 text-blue-700 border-blue-200',
    Deactivated: 'bg-slate-100 text-slate-500 border-slate-200',
    Maintenance: 'bg-rose-50 text-rose-700 border-rose-200',
    OutOfService: 'bg-amber-50 text-amber-700 border-amber-200',
    Owned: 'bg-slate-100 text-slate-600 border-slate-200',
    Leased: 'bg-amber-50 text-amber-700 border-amber-200',
    Financed: 'bg-sky-50 text-sky-700 border-sky-200',
    Rented: 'bg-purple-50 text-purple-700 border-purple-200',
    success: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20',
    warning: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20',
    danger: 'bg-rose-50 text-rose-600 ring-1 ring-rose-500/20',
    blue: 'bg-blue-50 text-blue-600 ring-1 ring-blue-500/20',
    neutral: 'bg-slate-50 text-slate-600 ring-1 ring-slate-500/10',
    pending: 'bg-amber-50 text-amber-600 ring-1 ring-amber-500/20'
  };
  return (
    <div className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-tight', variants[variant] || variants.default, className)}>
      {['Active', 'Drafted', 'Maintenance', 'Deactivated', 'OutOfService'].includes(variant) && (
        <span className={cn("mr-1.5 h-1 w-1 rounded-full", 
          variant === 'Active' ? 'bg-emerald-500' : 
          variant === 'Maintenance' ? 'bg-rose-500' : 
          variant === 'OutOfService' ? 'bg-amber-500' :
          variant === 'Drafted' ? 'bg-blue-500' : 'bg-slate-400')} />
      )}
      {children}
    </div>
  );
};

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const _Avatar = ({ src, initials, color = "bg-slate-200" }: { src?: string; initials?: string; color?: string }) => (
  <div className={`h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold text-slate-600 ${color} overflow-hidden`}>
    {src ? <img src={src} alt="avatar" className="h-full w-full object-cover" /> : initials}
  </div>
);
void _Avatar;

// --- Detail View Components ---

const VehicleImageDisplay = ({ src, alt }: { src?: string; alt?: string }) => {
    const [error, setError] = useState(false);
    
    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || error) {
        // Compact placeholder — sized to fit the 96×96 avatar slot. Just a
        // centered truck icon; full "no image" text doesn't fit at this
        // size and isn't necessary (the empty avatar reads as no-image).
        return (
            <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-slate-100 to-slate-200">
                <Truck size={32} strokeWidth={1.5} className="text-slate-400" />
            </div>
        );
    }

    return (
        <img 
            src={src}
            alt={alt}
            onError={() => setError(true)}
            className="w-[90%] h-auto object-contain mix-blend-multiply opacity-90 group-hover:scale-105 transition-transform duration-500 animate-in fade-in zoom-in-95 duration-500"
        />
    );
};

const _RiskScoreWidget = ({ score }: { score: number }) => {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  let scoreColor = score < 70 ? "text-rose-500" : score < 85 ? "text-amber-500" : "text-emerald-500";
  let label = score < 70 ? "High Risk" : score < 85 ? "Med Risk" : "Low Risk";
  let labelColor = score < 70 ? "text-rose-600" : score < 85 ? "text-amber-600" : "text-emerald-600";

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 80 80">
          <circle className="text-slate-100" strokeWidth="8" stroke="currentColor" fill="transparent" r={radius} cx="40" cy="40" />
          <circle className={scoreColor} strokeWidth="8" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="40" cy="40" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
          <span className="text-xl font-bold">{score}</span>
        </div>
      </div>
      <span className={`mt-1 text-xs font-bold uppercase tracking-wide ${labelColor}`}>{label}</span>
    </div>
  );
};
void _RiskScoreWidget;



const MetadataItem = ({ label, value, sub, warning, copyable }: { label: string; value: string; sub?: string; warning?: boolean; copyable?: boolean }) => {
  const handleCopy = () => {
    if (!value) return;
    const el = document.createElement('textarea');
    el.value = value;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">{label}</span>
      <div className="flex items-center gap-2 group">
        <span className="text-sm font-semibold text-slate-900">{value}</span>
        {sub && <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{sub}</span>}
        {warning && <AlertCircle size={14} className="text-amber-500" />}
        {copyable && (
          <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded transition-all text-slate-400 hover:text-blue-600" title="Copy to clipboard">
            <Copy size={12} />
          </button>
        )}
      </div>
      {warning && <span className="text-[10px] font-medium text-amber-600 mt-0.5">Expiring Soon</span>}
    </div>
  );
};

// ── Asset Safety Analysis panel ──────────────────────────────────────────
// Mirrors the per-asset breakdown surfaced in the Beta Safety Analysis page
// (large overall ring + 6 sub-score rings + counts strip + component bar).
// Embedded into the Overview tab so the asset profile page becomes the single
// source of truth for the same numbers.

function AssetRing({
    label, score, size = 'small', palette = 'auto', subtitle,
}: {
    label: string;
    score: number;
    size?: 'large' | 'small';
    palette?: 'auto' | 'blue' | 'green';
    subtitle?: string;
}) {
    const clamped = Math.max(0, Math.min(score, 100));
    const ringSize = size === 'large' ? 'w-32 h-32 lg:w-36 lg:h-36' : 'w-20 h-20';
    const numberSize = size === 'large' ? 'text-4xl' : 'text-2xl';
    const colour = palette === 'blue'
        ? 'text-blue-600'
        : palette === 'green'
            ? 'text-emerald-500'
            : clamped >= 90 ? 'text-emerald-500'
            : clamped >= 80 ? 'text-blue-600'
            : clamped >= 70 ? 'text-amber-500'
            : 'text-red-500';
    const riskLabel = clamped >= 80 ? 'Low Risk' : clamped >= 70 ? 'Moderate Risk' : 'High Risk';
    const riskTone  = clamped >= 80 ? 'text-emerald-700' : clamped >= 70 ? 'text-amber-700' : 'text-red-700';
    return (
        <div className="w-full flex flex-col items-center text-center">
            <div className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 leading-tight ${size === 'large' ? '' : 'min-h-[1.75rem] flex items-center justify-center px-1'}`}>
                {label}
            </div>
            <div className={`relative flex items-center justify-center ${ringSize}`}>
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth={size === 'large' ? 3 : 4} />
                    <path className={colour}
                          strokeDasharray={`${clamped.toFixed(2)}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none" stroke="currentColor" strokeWidth={size === 'large' ? 3 : 4} strokeLinecap="round" />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className={`${numberSize} font-black text-slate-900 leading-none`}>{Math.round(clamped)}</span>
                    {size === 'large' && <span className="text-[10px] font-bold text-slate-400">/ 100</span>}
                </div>
            </div>
            <div className={`mt-2 text-[10px] font-bold uppercase tracking-wide ${riskTone}`}>{riskLabel}</div>
            {subtitle && <div className="mt-0.5 text-[10px] text-slate-500">{subtitle}</div>}
        </div>
    );
}

function AssetSafetyAnalysisSection({
    accountId, assetId,
}: {
    accountId?: string;
    assetId: string;
}) {
    const scorecard: AssetScorecard | null = (() => {
        try {
            const all = computeAssetScorecards(accountId);
            return all.find(a => a.assetId === assetId) ?? null;
        } catch { return null; }
    })();
    if (!scorecard) return null;

    const overallTone = scorecard.overall >= 80 ? 'text-emerald-600' : scorecard.overall >= 70 ? 'text-amber-600' : 'text-red-600';

    // Synthesise a Status sub-score (0-100) using the same logic the Beta
    // panel uses — active assets sit at 95, anything else at 60.
    const statusScore = String(scorecard.operationalStatus).toLowerCase() === 'active' ? 95 : 60;

    const components = [
        { id: 'maintenance', label: 'Maintenance',          score: scorecard.maintenance, weight: 0.25, events: scorecard.counts.overdueWorkOrders },
        { id: 'inspections', label: 'Roadside inspections', score: scorecard.inspections, weight: 0.20, events: 0 },
        { id: 'violations',  label: 'Violations',           score: scorecard.violations,  weight: 0.20, events: scorecard.counts.violations },
        { id: 'accidents',   label: 'Incidents',            score: scorecard.accidents,   weight: 0.20, events: scorecard.counts.accidents },
        { id: 'vedr',        label: 'Telematics / VEDR',    score: scorecard.vedr,        weight: 0.10, events: 0 },
        { id: 'status',      label: 'Status / readiness',   score: statusScore,           weight: 0.05, events: 0 },
    ];
    const colorFor = (s: number) =>
        s >= 90 ? { bar: 'bg-emerald-500', track: 'bg-emerald-100', txt: 'text-emerald-700' }
      : s >= 70 ? { bar: 'bg-lime-500',    track: 'bg-lime-100',    txt: 'text-lime-700' }
      : s >= 55 ? { bar: 'bg-orange-500',  track: 'bg-orange-100',  txt: 'text-orange-700' }
      :           { bar: 'bg-red-500',     track: 'bg-red-100',     txt: 'text-red-700' };

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-b from-blue-50/40 to-white">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Asset Safety Analysis</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                        Composite score and per-domain breakdown · same data shown in Safety Analysis &rsaquo; Asset.
                    </div>
                </div>
                <div className={`text-[12px] font-bold tabular-nums ${scorecard.delta30d >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {scorecard.delta30d >= 0 ? '+' : ''}{scorecard.delta30d.toFixed(2)}
                    <span className="ml-1 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">vs prior 30d</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-5 px-5 py-5">
                {/* Big overall ring */}
                <div className="flex flex-col items-center justify-center">
                    <AssetRing
                        size="large"
                        label="Asset Safety Score"
                        score={scorecard.overall}
                        palette={scorecard.band === 'Excellent' || scorecard.band === 'Good' ? 'blue' : 'auto'}
                        subtitle={`${scorecard.overall.toFixed(1)} / 100`}
                    />
                    <div className={`mt-2 text-xs font-bold ${overallTone}`}>{scorecard.band}</div>
                </div>

                {/* 6 sub-score rings */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 self-start">
                    {[
                        { label: 'Maintenance', value: scorecard.maintenance, sub: `${scorecard.counts.overdueWorkOrders}/${scorecard.counts.totalWorkOrders} overdue` },
                        { label: 'Inspections', value: scorecard.inspections, sub: 'roadside outcome' },
                        { label: 'Violations',  value: scorecard.violations,  sub: `${scorecard.counts.violations} - ${scorecard.counts.oos} OOS` },
                        { label: 'Accidents',   value: scorecard.accidents,   sub: `${scorecard.counts.accidents} on record` },
                        { label: 'VEDR',        value: scorecard.vedr,        sub: 'telematics' },
                        { label: 'Status',      value: statusScore,           sub: scorecard.operationalStatus },
                    ].map(c => (
                        <div key={c.label} className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col items-center text-center">
                            <AssetRing label={c.label} score={c.value} palette="green" />
                            <div className="text-[10px] text-slate-500 mt-1">{c.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* KPI counts strip */}
            <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { value: scorecard.counts.accidents,              label: 'Accidents',     bad: scorecard.counts.accidents              > 0 },
                    { value: scorecard.counts.violations,             label: 'Violations',    bad: scorecard.counts.violations             > 0 },
                    { value: scorecard.counts.oos,                    label: 'OOS',           bad: scorecard.counts.oos                    > 0 },
                    { value: scorecard.counts.vehicleMaintViolations, label: 'Veh Maint Viol',bad: scorecard.counts.vehicleMaintViolations > 0 },
                    { value: `${scorecard.counts.overdueWorkOrders}/${scorecard.counts.totalWorkOrders}`, label: 'Overdue WO', bad: scorecard.counts.overdueWorkOrders > 0 },
                ].map(k => (
                    <div key={k.label} className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                        <div className={`text-xl font-black tabular-nums leading-none ${k.bad ? 'text-amber-600' : 'text-slate-900'}`}>{k.value}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{k.label}</div>
                    </div>
                ))}
            </div>

            {/* Component breakdown bar */}
            <div className="px-5 pb-5">
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                    <div className="mb-3">
                        <h4 className="text-sm font-bold text-slate-900">Component breakdown</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Weighted contribution of each domain to the composite score.</p>
                    </div>
                    {/* Stacked weight bar */}
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-4">
                        {components.map(c => {
                            const tone = colorFor(c.score);
                            return (
                                <div
                                    key={c.id}
                                    className={`h-full ${tone.bar}`}
                                    style={{ width: `${c.weight * 100}%` }}
                                    title={`${c.label} · weight ×${c.weight.toFixed(2)} · score ${c.score.toFixed(0)}`}
                                />
                            );
                        })}
                    </div>
                    {/* Per-row breakdown */}
                    <div className="space-y-1.5">
                        {components.map(c => {
                            const tone = colorFor(c.score);
                            return (
                                <div key={c.id} className="grid items-center gap-2" style={{ gridTemplateColumns: '160px minmax(0,1fr) 52px 44px 44px' }}>
                                    <span className="text-[11px] font-semibold text-slate-700 truncate">{c.label}</span>
                                    <div className={`h-2 rounded-full overflow-hidden ${tone.track}`}>
                                        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${c.score}%` }} />
                                    </div>
                                    <span className={`text-[11px] font-bold tabular-nums text-right ${tone.txt}`}>{c.score.toFixed(1)}</span>
                                    <span className="text-[10px] font-mono text-slate-400 text-right">×{c.weight.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-500 tabular-nums text-right">{c.events} ev</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface AssetDetailViewProps {
    asset: DetailedAsset;
    onBack: () => void;
    onEdit: () => void;
    accountId?: string;
}

export function AssetDetailView({ asset, onBack, onEdit, accountId }: AssetDetailViewProps) {
  const [activeTab, setActiveTab] = useState('Overview');
  
  const inventoryRecords = useMemo(() => getInventoryByAssetId(asset.id), [asset.id]);

  const _maintenanceTaskCountForTab = useMemo(
    () => INITIAL_TASKS.filter((t) => t.assetId === asset.id).length,
    [asset.id]
  );

  // Tabs are grouped by functional area so similar concerns sit next to
  // each other and the bar reads top-to-bottom by responsibility:
  //   1. Compliance & Documents — what the asset must keep on file
  //   2. Operations             — work, parts, costs against the asset
  //   3. Safety                 — events that affect the asset's risk profile
  //   4. Alerts                 — cross-cutting summary of action items
  const tabs: Array<{
    name: string;
    count: number;
    group: string;
    alert?: boolean;
    icon: React.ComponentType<{ size?: number; className?: string }>;
  }> = [
    // 0. At-a-glance summary
    { name: 'Overview',              count: 0,                              group: 'identity',   icon: LayoutDashboard },
    // 1. Compliance & Documents
    { name: 'Compliance Monitoring', count: 0,                              group: 'compliance', icon: ShieldCheck },
    { name: 'Documents',             count: 0,                              group: 'compliance', icon: FileText },
    // 2. Operations
    { name: 'Maintenance',           count: _maintenanceTaskCountForTab,    group: 'operations', icon: Wrench },
    { name: 'Inventory',             count: inventoryRecords.length,        group: 'operations', icon: Boxes },
    { name: 'Expenses',              count: 0,                              group: 'operations', icon: DollarSign },
    // 3. Safety
    { name: 'Inspections',           count: 0,                              group: 'safety',     icon: FileCheck },
    { name: 'Violations',            count: 0,                              group: 'safety',     icon: AlertTriangle },
    { name: 'Accidents',             count: 0,                              group: 'safety',     icon: Car },
    // 4. Alerts (Notifications count is filled in further down once assetAlerts is computed)
    { name: 'Notifications',         count: 0,                              group: 'alerts',     icon: AlertCircle },
  ];

  const [currentVehicle, setCurrentVehicle] = useState(asset);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  useEffect(() => { setCurrentVehicle(asset); }, [asset]);

  // Modal State
  const [isKeyNumberModalOpen, setIsKeyNumberModalOpen] = useState(false);
  const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
  const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit'>('edit');




  const [activeComplianceFilter, setActiveComplianceFilter] = useState<string | null>(null);
  const [viewingAccident, setViewingAccident] = useState<any | null>(null);
  const [editingAccident, setEditingAccident] = useState<any | null>(null);
  const [viewingViolation, setViewingViolation] = useState<any>(null);
  const [editingViolation, setEditingViolation] = useState<any>(null);
  const [expandedInspection, setExpandedInspection] = useState<string | null>(null);
  const [viewingInspection, setViewingInspection] = useState<any>(null);

  const { keyNumbers, tagSections, getDocumentTypeById, documents } = useAppData();

  // State for collapsible groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleEditKeyNumber = (kn: KeyNumberConfig, currentValue: string, currentExpiry?: string) => {
      setEditingKeyNumber({
          configId: kn.id,
          value: currentValue,
          expiryDate: currentExpiry || '',
          issueDate: '', // Not tracked in currentVehicle yet
          tags: [],
          documents: [], // Not tracked in currentVehicle yet
          numberRequired: kn.numberRequired ?? true,
          hasExpiry: kn.hasExpiry,
          documentRequired: kn.documentRequired
      });
      setKeyNumberModalMode('edit');
      setIsKeyNumberModalOpen(true);
  };

  const handleSaveKeyNumber = (data: { configId: string; value: string; expiryDate?: string; issueDate?: string; tags?: string[]; documents?: any[] }) => {
      setCurrentVehicle(prev => {
          const next = { ...prev };
          if (data.configId === 'kn-plate') {
              next.plateNumber = data.value;
              next.registrationExpiryDate = data.expiryDate || '';
          } else if (data.configId === 'kn-vin') {
              next.vin = data.value;
          }
           // Add more mappings here for other asset key numbers if stored in Asset
          return next;
      });
      setIsKeyNumberModalOpen(false);
      setEditingKeyNumber(null);
  };

  // Derive compliance groups (Asset Key Numbers)
  const complianceGroups = useMemo(() => {
    // 1. Filter for Asset key numbers
    const assetKeyNumbers = keyNumbers.filter(
        (kn: KeyNumberConfig) => kn.entityType === 'Asset' && kn.status === 'Active'
    );

    // 2. Group by category
    const grouped = assetKeyNumbers.reduce((acc, kn) => {
        const cat = kn.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(kn);
        return acc;
    }, {} as Record<string, KeyNumberConfig[]>);

    // 3. Map to display items
    return Object.entries(grouped).map(([category, items]) => ({
        key: category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        label: category.toUpperCase(),
        items: items.map(kn => {
            let value = '';
            let expiryDate: string | null | undefined = null;

            // Map values based on ID or Type
            if (kn.id === 'kn-plate') {
                value = currentVehicle.plateNumber || '';
                expiryDate = currentVehicle.registrationExpiryDate;
            } else if (kn.id === 'kn-vin') { // Assuming kn-vin exists or will exist
                value = currentVehicle.vin || '';
                expiryDate = null;
            } else if (kn.id === 'kn-transponder') {
                value = currentVehicle.transponderNumber || '';
                expiryDate = currentVehicle.transponderExpiryDate;
            } else {
                // Try to find in permits/authorities match
                // Logic: find a permit where keyNumber matches? Or type matches?
                // For now, simpler fuzzy match on name if exact ID match fails
                const permit = currentVehicle.permits?.find(p => 
                    p.permitType?.toLowerCase().includes(kn.numberTypeName.toLowerCase()) || 
                    kn.numberTypeName.toLowerCase().includes(p.permitType?.toLowerCase() || '')
                );
                if (permit) {
                    value = permit.keyNumber || '';
                    expiryDate = permit.expiryDate;
                }
            }

            // Sync Value if "Not entered" logic needed
            const hasValue = (!!value && value.trim() !== '' && value !== '—');
            
            // Calculate status
            const enabled = isMonitoringEnabled(kn);
            const maxDays = getMaxReminderDays(kn);
            const status = calculateComplianceStatus(
                expiryDate,
                enabled,
                maxDays,
                hasValue,
                kn.hasExpiry,
                kn.numberRequired ?? true
            );

            return {
                id: kn.id,
                name: kn.numberTypeName,
                number: hasValue ? value : 'Not entered',
                expiryDate: expiryDate ? expiryDate : (kn.hasExpiry ? 'Not set' : '-'),
                status,
                config: kn
            };
        }).filter(item => {
             // Filter logic applied inside the group mapping
             if (!activeComplianceFilter) return true;
             if (activeComplianceFilter === 'missing-number') return item.number === 'Not entered' || !item.number;
             if (activeComplianceFilter === 'missing-expiry') return item.expiryDate === 'Not set' && item.status !== 'Active'; // Refine this
             if (activeComplianceFilter === 'expiring') return item.status === 'Expiring Soon';
             if (activeComplianceFilter === 'expired') return item.status === 'Expired';
             return true;
        })
    })).filter(group => group.items.length > 0); // Remove empty groups
  }, [keyNumbers, currentVehicle, activeComplianceFilter]);

  // Derive stats from the mapped items (Need to calculate based on all items)
  const complianceStats = useMemo(() => {
     let total = 0, expired = 0, expiring = 0, missingNumber = 0, missingExpiry = 0;
     
     // 1. Filter for Asset key numbers
    const assetKeyNumbers = keyNumbers.filter(
        (kn: KeyNumberConfig) => kn.entityType === 'Asset' && kn.status === 'Active'
    );

    assetKeyNumbers.forEach(kn => {
        let value = '';
        let expiryDate: string | null | undefined = null;
        // Map values
        if (kn.id === 'kn-plate') {
            value = currentVehicle.plateNumber || '';
            expiryDate = currentVehicle.registrationExpiryDate;
        } else if (kn.id === 'kn-vin') {
            value = currentVehicle.vin || '';
            expiryDate = null;
        } else if (kn.id === 'kn-transponder') {
            value = currentVehicle.transponderNumber || '';
            expiryDate = currentVehicle.transponderExpiryDate;
        } else {
             const permit = currentVehicle.permits?.find(p => 
                p.permitType?.toLowerCase().includes(kn.numberTypeName.toLowerCase()) || 
                kn.numberTypeName.toLowerCase().includes(p.permitType?.toLowerCase() || '')
            );
            if (permit) {
                value = permit.keyNumber || '';
                expiryDate = permit.expiryDate;
            }
        }

        const hasValue = (!!value && value.trim() !== '' && value !== '—');
        
        const enabled = isMonitoringEnabled(kn);
        const maxDays = getMaxReminderDays(kn);
        const status = calculateComplianceStatus(
            expiryDate,
            enabled,
            maxDays,
            hasValue,
            kn.hasExpiry,
            kn.numberRequired ?? true
        );

        if (status === 'Expired') expired++;
        else if (status === 'Expiring Soon') expiring++;
        else if (status === 'Missing') missingNumber++;
        else if (status === 'Incomplete') missingExpiry++;
        total++;
    });

     return { total, expired, expiring, missingNumber, missingExpiry, missingDoc: 0 };
  }, [keyNumbers, currentVehicle]);

  // Cross-cutting alerts surfaced in the Notifications tab. Computed here so
  // the same numbers drive the tab badge and the rendered list — single source
  // of truth, no drift between counts.
  const assetAlerts = useMemo(() => {
    const items: Array<{
      severity: 'high' | 'medium' | 'low';
      category: 'Compliance' | 'Documents' | 'Maintenance' | 'Safety';
      title: string;
      detail?: string;
      tabTarget: string;
    }> = [];

    if (complianceStats.expired > 0) items.push({
      severity: 'high', category: 'Compliance',
      title: `${complianceStats.expired} expired key number${complianceStats.expired === 1 ? '' : 's'}`,
      detail: 'Plate, permit, or transponder past expiry — renew immediately.',
      tabTarget: 'Compliance Monitoring',
    });
    if (complianceStats.expiring > 0) items.push({
      severity: 'medium', category: 'Compliance',
      title: `${complianceStats.expiring} expiring soon`,
      detail: 'Within the configured reminder window.',
      tabTarget: 'Compliance Monitoring',
    });
    if (complianceStats.missingNumber > 0) items.push({
      severity: 'medium', category: 'Compliance',
      title: `${complianceStats.missingNumber} missing key number${complianceStats.missingNumber === 1 ? '' : 's'}`,
      tabTarget: 'Compliance Monitoring',
    });
    if (complianceStats.missingExpiry > 0) items.push({
      severity: 'low', category: 'Compliance',
      title: `${complianceStats.missingExpiry} key number${complianceStats.missingExpiry === 1 ? '' : 's'} missing expiry date`,
      tabTarget: 'Compliance Monitoring',
    });
    if (_maintenanceTaskCountForTab > 0) items.push({
      severity: 'medium', category: 'Maintenance',
      title: `${_maintenanceTaskCountForTab} maintenance task${_maintenanceTaskCountForTab === 1 ? '' : 's'} due / overdue`,
      detail: 'Schedule a work order before the next service window.',
      tabTarget: 'Maintenance',
    });

    return items;
  }, [complianceStats, _maintenanceTaskCountForTab]);

  // Wire the alert count + high-severity dot back into the Notifications tab
  // badge. The tabs array is rebuilt on every render so mutating it here is
  // safe and keeps the badge in sync with the rendered list.
  {
    const notifTab = tabs.find(t => t.name === 'Notifications');
    if (notifTab) {
      notifTab.count = assetAlerts.length;
      notifTab.alert = assetAlerts.some(a => a.severity === 'high');
    }
  }

  // --- Maintenance Logic ---
  const [assetTasks, setAssetTasks] = useState(() => INITIAL_TASKS.filter(t => t.assetId === asset.id));
  const [assetOrders, setAssetOrders] = useState(() => INITIAL_ORDERS.filter(o => {
     // Join tasks → orders so an order is included if any of its tasks
     // belong to this asset. (Naive linear scan; fine for in-memory mock.)
     const taskIds = o.taskIds;
     const relatedTasks = INITIAL_TASKS.filter(t => taskIds.includes(t.id));
     return relatedTasks.some(t => t.assetId === asset.id);
  }));

  // Refresh asset-scoped tasks and orders whenever the user navigates to a
  // different asset without unmounting (e.g. switching via a parent route).
  // Without this, the Maintenance tab would keep showing the previous
  // asset's tasks since useState initialisers only run once.
  useEffect(() => {
    setAssetTasks(INITIAL_TASKS.filter(t => t.assetId === asset.id));
    setAssetOrders(INITIAL_ORDERS.filter(o => {
        const relatedTasks = INITIAL_TASKS.filter(t => o.taskIds.includes(t.id));
        return relatedTasks.some(t => t.assetId === asset.id);
    }));
  }, [asset.id]);

  // ── Per-asset Maintenance UI state (filters, search, sort) ─────────────
  type TaskStatusFilter = 'all' | 'upcoming' | 'due' | 'overdue' | 'in_progress' | 'completed';
  type OrderStatusFilter = 'all' | 'open' | 'completed' | 'cancelled';

  const [taskStatusFilter, setTaskStatusFilter]   = useState<TaskStatusFilter>('all');
  const [taskSearch, setTaskSearch]               = useState('');
  const [taskSort, setTaskSort]                   = useState<'status' | 'due' | 'created'>('status');
  const [taskSortDir, setTaskSortDir]             = useState<'asc' | 'desc'>('asc');
  const [taskPage, setTaskPage]                   = useState(1);
  const [taskRowsPerPage, setTaskRowsPerPage]     = useState(5);

  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [orderSearch, setOrderSearch]             = useState('');
  const [orderSort, setOrderSort]                 = useState<'created' | 'due' | 'status'>('created');
  const [orderSortDir, setOrderSortDir]           = useState<'asc' | 'desc'>('desc');
  const [orderPage, setOrderPage]                 = useState(1);
  const [orderRowsPerPage, setOrderRowsPerPage]   = useState(5);

  // ── Inventory UI state — same shape (filter/search/sort/page) as Tasks ──
  type InventoryStatusFilter = 'all' | 'Active' | 'Expiring Soon' | 'Expired';
  const [invStatusFilter, setInvStatusFilter] = useState<InventoryStatusFilter>('all');
  const [invSearch, setInvSearch]             = useState('');
  const [invSort, setInvSort]                 = useState<'expiry' | 'vendor' | 'issue'>('expiry');
  const [invSortDir, setInvSortDir]           = useState<'asc' | 'desc'>('asc');
  const [invPage, setInvPage]                 = useState(1);
  const [invRowsPerPage, setInvRowsPerPage]   = useState(5);

  // Reset to page 1 whenever filters change so the user always lands on visible rows.
  useEffect(() => { setTaskPage(1); }, [taskStatusFilter, taskSearch, taskSort, taskSortDir, taskRowsPerPage]);
  useEffect(() => { setOrderPage(1); }, [orderStatusFilter, orderSearch, orderSort, orderSortDir, orderRowsPerPage]);
  useEffect(() => { setInvPage(1); }, [invStatusFilter, invSearch, invSort, invSortDir, invRowsPerPage]);

  // Real metrics derived from this asset's actual tasks/orders.
  const maintenanceMetrics = useMemo(() => {
    const openOrders = assetOrders.filter(o => o.status === 'open').length;
    const overdueTasks = assetTasks.filter(t => t.status === 'overdue').length;
    const dueTasks = assetTasks.filter(t => t.status === 'due').length;

    let ytdSpend = 0;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    for (const o of assetOrders) {
      for (const c of o.completions ?? []) {
        if (new Date(c.completedAt).getTime() >= yearStart) {
          for (const b of c.assetBreakdowns ?? []) {
            if (b.assetId === asset.id) ytdSpend += b.costs?.totalPaid ?? 0;
          }
        }
      }
    }

    const upcomingTask = [...assetTasks]
      .filter(t => t.status === 'upcoming' || t.status === 'due')
      .sort((a, b) => {
        const aa = a.dueRule?.dueAtOdometer ?? a.dueRule?.dueAtEngineHours ?? 0;
        const bb = b.dueRule?.dueAtOdometer ?? b.dueRule?.dueAtEngineHours ?? 0;
        return aa - bb;
      })[0];

    const lastCompletion = [...assetOrders]
      .flatMap(o => (o.completions ?? []).map(c => ({ order: o, completion: c })))
      .filter(({ completion }) =>
        completion.assetBreakdowns?.some(b => b.assetId === asset.id)
      )
      .sort((a, b) => new Date(b.completion.completedAt).getTime() - new Date(a.completion.completedAt).getTime())
      [0];

    return { openOrders, overdueTasks, dueTasks, ytdSpend, upcomingTask, lastCompletion };
  }, [assetTasks, assetOrders, asset.id]);

  // Filtered + sorted list of tasks shown in the panel.
  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    let list = assetTasks.filter(t => {
      if (taskStatusFilter !== 'all' && t.status !== taskStatusFilter) return false;
      if (q) {
        const serviceName = INITIAL_SERVICE_TYPES.find(s => s.id === t.serviceTypeIds[0])?.name ?? '';
        return [t.id, serviceName, t.scheduleId].some(v => v.toLowerCase().includes(q));
      }
      return true;
    });

    const STATUS_ORDER: Record<string, number> = { overdue: 0, due: 1, in_progress: 2, upcoming: 3, completed: 4, cancelled: 5 };
    const dir = taskSortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (taskSort === 'status') {
        cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      } else if (taskSort === 'due') {
        const aa = a.dueRule?.dueAtOdometer ?? a.dueRule?.dueAtEngineHours ?? new Date(a.dueRule?.dueAtDate ?? 0).getTime();
        const bb = b.dueRule?.dueAtOdometer ?? b.dueRule?.dueAtEngineHours ?? new Date(b.dueRule?.dueAtDate ?? 0).getTime();
        cmp = aa - bb;
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return cmp * dir;
    });
    return list;
  }, [assetTasks, taskStatusFilter, taskSearch, taskSort, taskSortDir]);

  // Filtered + sorted work orders.
  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    let list = assetOrders.filter(o => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (q) {
        const vendorName = vendors.find((v: any) => v.id === o.vendorId)?.companyName?.toLowerCase() ?? '';
        return [o.id, vendorName, o.notes ?? ''].some(v => v.toLowerCase().includes(q));
      }
      return true;
    });

    const ORDER_STATUS_ORDER: Record<string, number> = { open: 0, completed: 1, cancelled: 2 };
    const dir = orderSortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (orderSort === 'status') cmp = (ORDER_STATUS_ORDER[a.status] ?? 99) - (ORDER_STATUS_ORDER[b.status] ?? 99);
      else if (orderSort === 'due') cmp = new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime();
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return cmp * dir;
    });
    return list;
  }, [assetOrders, orderStatusFilter, orderSearch, orderSort, orderSortDir]);

  const taskStatusCounts = useMemo(() => ({
    all: assetTasks.length,
    upcoming: assetTasks.filter(t => t.status === 'upcoming').length,
    due: assetTasks.filter(t => t.status === 'due').length,
    overdue: assetTasks.filter(t => t.status === 'overdue').length,
    in_progress: assetTasks.filter(t => t.status === 'in_progress').length,
    completed: assetTasks.filter(t => t.status === 'completed').length,
  }), [assetTasks]);

  // Clamp page when filtered list shrinks.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredTasks.length / taskRowsPerPage));
    if (taskPage > maxPage) setTaskPage(maxPage);
  }, [filteredTasks.length, taskRowsPerPage, taskPage]);

  const pagedTasks = useMemo(() => {
    const start = (taskPage - 1) * taskRowsPerPage;
    return filteredTasks.slice(start, start + taskRowsPerPage);
  }, [filteredTasks, taskPage, taskRowsPerPage]);

  const orderStatusCounts = useMemo(() => ({
    all: assetOrders.length,
    open: assetOrders.filter(o => o.status === 'open').length,
    completed: assetOrders.filter(o => o.status === 'completed').length,
    cancelled: assetOrders.filter(o => o.status === 'cancelled').length,
  }), [assetOrders]);

  // Clamp page when filtered list shrinks.
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredOrders.length / orderRowsPerPage));
    if (orderPage > maxPage) setOrderPage(maxPage);
  }, [filteredOrders.length, orderRowsPerPage, orderPage]);

  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderRowsPerPage;
    return filteredOrders.slice(start, start + orderRowsPerPage);
  }, [filteredOrders, orderPage, orderRowsPerPage]);

  // Inventory: filter → sort → paginate. Same shape as the tasks/orders
  // pipelines above.
  const filteredInventory = useMemo(() => {
    let list = inventoryRecords.filter((it) => {
      if (invStatusFilter !== 'all' && it.status !== invStatusFilter) return false;
      const q = invSearch.trim().toLowerCase();
      if (q) {
        const vendor = getVendorById(it.vendorId);
        const haystack = [
          vendor?.name, vendor?.companyName,
          it.serial, it.pin,
          it.issueDate, it.expiryDate,
          vendor ? getCategoryLabel(vendor.categoryId, VENDOR_CATEGORIES) : '',
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const dir = invSortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (invSort === 'expiry') return a.expiryDate.localeCompare(b.expiryDate) * dir;
      if (invSort === 'issue') return a.issueDate.localeCompare(b.issueDate) * dir;
      // 'vendor'
      const va = getVendorById(a.vendorId)?.name ?? '';
      const vb = getVendorById(b.vendorId)?.name ?? '';
      return va.localeCompare(vb) * dir;
    });
    return list;
  }, [inventoryRecords, invStatusFilter, invSearch, invSort, invSortDir]);

  const pagedInventory = useMemo(() => {
    const start = (invPage - 1) * invRowsPerPage;
    return filteredInventory.slice(start, start + invRowsPerPage);
  }, [filteredInventory, invPage, invRowsPerPage]);

  const invStatusCounts = useMemo(() => ({
    all:              inventoryRecords.length,
    'Active':         inventoryRecords.filter((it) => it.status === 'Active').length,
    'Expiring Soon':  inventoryRecords.filter((it) => it.status === 'Expiring Soon').length,
    'Expired':        inventoryRecords.filter((it) => it.status === 'Expired').length,
  }), [inventoryRecords]);

  const formatMoney = (n: number, currency: 'USD' | 'CAD' = 'USD') =>
    n.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 0 });

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  // --- Expense Logic ---
  const [manualExpenses, setManualExpenses] = useState<AssetExpense[]>(() => 
      INITIAL_ASSET_EXPENSES.filter(e => e.assetId === asset.id)
  );

  const mergedExpenses = useMemo(() => {
      // 1. Map Work Orders to "System" Expenses
      const systemExpenses: AssetExpense[] = assetOrders.map(order => {
          // Calculate total cost and determine currency (assume mix logic or take first)
          let totalCost = 0;
          let currency: "USD" | "CAD" = "USD";

          if (order.completions) {
              order.completions.forEach(c => {
                  if (c.currency) currency = c.currency; 
                  const assetBreakdown = c.assetBreakdowns?.find(b => b.assetId === asset.id);
                  totalCost += (assetBreakdown?.costs?.totalPaid || 0);
              });
          }

          return {
              id: `sys_${order.id}`,
              assetId: asset.id,
              expenseTypeId: 'exp_maint', // Links to Maintenance type
              amount: totalCost,
              currency,
              date: order.createdAt,
              isRecurring: false,
              source: 'maintenance',
              referenceId: order.id,
              notes: `Work Order #${order.id} - ${order.status}`
          };
      });

      // 2. Merge and Sort
      return [...manualExpenses, ...systemExpenses].sort((a,b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  }, [manualExpenses, assetOrders, asset.id]);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<AssetExpense | null>(null);

  const handleSaveExpense = (expense: AssetExpense) => {
      if (editingExpense) {
          setManualExpenses(prev => prev.map(e => e.id === expense.id ? expense : e));
      } else {
          setManualExpenses(prev => [expense, ...prev]);
      }
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
  };

  // --- Document Logic (Derived from Key Numbers) ---
  const [editingDocument, setEditingDocument] = useState<any | null>(null);
  const [viewingDocument, setViewingDocument] = useState<any | null>(null);
  const [docIssuingCountry, setDocIssuingCountry] = useState('');
  const [docIssuingState, setDocIssuingState] = useState('');
  const [deletingDocument, setDeletingDocument] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Violations Tab State
  const [violQ, setViolQ] = useState('');
  const [violPage, setViolPage] = useState(1);
  const [violRpp, setViolRpp] = useState(10);
  const [violCols, setViolCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'type', label: 'Violation Type', visible: true },
    { id: 'code', label: 'Code', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'fine', label: 'Fine', visible: true },
  ]);
  useEffect(() => { setViolPage(1); }, [violQ, violRpp]);

  // Accidents Tab State
  const [accQ, setAccQ] = useState('');
  const [accPage, setAccPage] = useState(1);
  const [accRpp, setAccRpp] = useState(10);
  const [accCols, setAccCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'incident', label: 'Incident', visible: true },
    { id: 'type', label: 'Type / Cause', visible: true },
    { id: 'location', label: 'Location', visible: true },
    { id: 'severity', label: 'Severity', visible: true },
    { id: 'preventability', label: 'Preventability', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'cost', label: 'Cost', visible: true },
  ]);
  useEffect(() => { setAccPage(1); }, [accQ, accRpp]);

  // Inspections Tab State
  const [insQ, setInsQ] = useState('');
  const [insPage, setInsPage] = useState(1);
  const [insRpp, setInsRpp] = useState(10);
  const [insCols, setInsCols] = useState<ColumnDef[]>([
    { id: 'date', label: 'Date', visible: true },
    { id: 'report', label: 'Report #', visible: true },
    { id: 'level', label: 'Level', visible: true },
    { id: 'state', label: 'State', visible: true },
    { id: 'driver', label: 'Driver', visible: true },
    { id: 'violations', label: 'Violations', visible: true },
    { id: 'oos', label: 'OOS', visible: true },
    { id: 'result', label: 'Result', visible: true },
  ]);
  useEffect(() => { setInsPage(1); }, [insQ, insRpp]);

  const assetDocuments = useMemo(() => {
      // 1. Get Asset-related Document Types
      const assetDocTypes = documents.filter((doc: any) => doc.relatedTo === 'asset');
      
      // 2. Map to display items
      return assetDocTypes.map((docType: any) => {
          // Find linked Key Number config
          const linkedKn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === docType.id && k.entityType === 'Asset');
          
          let status = 'Missing';
          let expiryDate = '—';
          let hasUpload = false;
          let dateUploaded = '—';
          let documentName = '—';
          
          // Logic: Check if the Asset has a value/document for this requirement
          if (linkedKn) {
              const enabled = isMonitoringEnabled(linkedKn);
              const maxDays = getMaxReminderDays(linkedKn);
              const isRequired = linkedKn.numberRequired ?? true; // or documentRequired?

              // A. It's a Key Number Document (e.g. Registration linked to Plate)
              // We need to look at specific fields on the asset based on the Key Number ID
              
              if (linkedKn.id === 'kn-plate') {
                   // Plate / Registration
                   if (currentVehicle.registrationExpiryDate) {
                       expiryDate = currentVehicle.registrationExpiryDate;
                       // Assume if we have expiry, we MIGHT have the doc, or check a separate "hasRegistrationDoc" flag if it existed
                       // For now, we'll assume Active if valid dates, else Missing
                       // In a real app, `currentVehicle` would have `documents: [{ typeId: '...', url: '...' }]`
                       status = calculateComplianceStatus(currentVehicle.registrationExpiryDate, enabled, maxDays, true, true, isRequired);
                       
                       if (status !== 'Missing' && status !== 'Expired' && status !== 'Incomplete') {
                           hasUpload = true; // Mock: If active/expiring soon, assume we have it
                           documentName = 'Registration.pdf';
                           dateUploaded = '2024-01-01'; 
                       }
                   }
              } else if (linkedKn.id === 'kn-transponder') {
                   if (currentVehicle.transponderExpiryDate) {
                       expiryDate = currentVehicle.transponderExpiryDate;
                       status = calculateComplianceStatus(currentVehicle.transponderExpiryDate, enabled, maxDays, true, true, isRequired);
                       if (status !== 'Missing' && status !== 'Expired' && status !== 'Incomplete') {
                           hasUpload = true;
                           documentName = 'Transponder.pdf';
                           dateUploaded = '2024-05-15';
                       }
                   }
              } else if (linkedKn.id === 'kn-insurance') { // Hypothetical
                   // Check permits/insurance array
                   hasUpload = false; 
              } else {
                   // Generic Key Number check (Permits, etc.)
                   const permit = currentVehicle.permits?.find(p => 
                      p.permitType?.toLowerCase().includes(linkedKn.numberTypeName.toLowerCase()) || 
                      linkedKn.numberTypeName.toLowerCase().includes(p.permitType?.toLowerCase() || '')
                   );
                   if (permit) {
                       if (permit.expiryDate) expiryDate = permit.expiryDate;
                       if (permit.expiryDate) {
                           status = calculateComplianceStatus(permit.expiryDate, enabled, maxDays, true, true, isRequired);
                       }
                       // If we have a permit record, do we have the physical doc?
                       // Mock: yes if active
                       if (status === 'Active' || status === 'Expiring Soon') {
                           hasUpload = true;
                           documentName = `${linkedKn.numberTypeName}.pdf`;
                           dateUploaded = '2024-02-20';
                       }
                   }
              }

              // Override status if mock says "Missing" but requirement is Optional
              if (docType.requirementLevel === 'optional' && status === 'Missing') {
                  status = 'Optional';
              }
          } else {
              // B. Standalone Asset Document (not linked to a Key Number)
              // Special handling for documents linked to other modules (e.g. Fuel Purchases)
              if (docType.linkedModule === 'fuel_purchases') {
                  // Fuel Receipt: Show as Active with mock uploaded data
                  status = 'Active';
                  hasUpload = true;
                  documentName = 'Fuel_Receipts_Bundle.pdf';
                  dateUploaded = '2026-02-28';
                  expiryDate = '—';
              } else if (docType.requirementLevel === 'optional') {
                  status = 'Optional';
              }
          }

          return {
              id: docType.id,
              documentType: docType.name,
              documentName: documentName,
              folderPath: docType.category || 'Asset',
              dateUploaded,
              status,
              expiryDate,
              hasUpload,
              requirementLevel: docType.requirementLevel,
              linkedKeyNumber: linkedKn ? linkedKn.numberTypeName : null,
              linkedModule: docType.linkedModule || null
          };
      }).sort((a: any, b: any) => {
          // Sort: Required & Missing on top
          if (a.requirementLevel === 'required' && b.requirementLevel !== 'required') return -1;
          if (a.status === 'Missing' && b.status !== 'Missing') return -1;
          return 0;
      });
  }, [documents, keyNumbers, currentVehicle]);

  const handleSaveDocument = () => {
      // Mock save logic
      if (editingDocument && uploadedFiles.length > 0) {
          // In a real app, you'd save these files
          console.log(`Uploaded ${uploadedFiles.length} documents`);
      }
      setUploadedFiles([]);
      setEditingDocument(null);
  };

  const handleDeleteDocument = () => {
      if (deletingDocument) {
          // Mock delete logic
          console.log('Document deleted');
          setDeletingDocument(null);
      }
  };



  // Update local state when asset prop changes
  useEffect(() => {
    setAssetTasks(INITIAL_TASKS.filter(t => t.assetId === asset.id));
    setAssetOrders(INITIAL_ORDERS.filter(o => {
         const orderTaskObjects = INITIAL_TASKS.filter(t => o.taskIds.includes(t.id));
         return orderTaskObjects.some(t => t.assetId === asset.id);
    }));
  }, [asset.id]);

  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [vendors, setVendors] = useState(INITIAL_VENDORS);

  /** CreateOrderModal payload contract:
   *    { id?, taskIds[], taskRemarks?, directTasks[], vendorId, createDate, dueDate, meta, notes, portalUrl? }
   *  - `taskIds` are existing maintenance tasks the user ticked.
   *  - `directTasks` are *new* tasks the user authored inside the modal — we
   *    materialise them here so the asset's task list is consistent with the
   *    new order.
   */
  const handleCreateOrder = (orderData: any) => {
      const orderId: string = orderData.id ?? `wo_new_${Math.random().toString(36).substr(2, 9)}`;
      const nowIso = new Date().toISOString();
      const captureIso = orderData.createDate ?? nowIso;

      // 1. Materialise direct tasks (new tasks created inline in the modal).
      const directTasks: MaintenanceTask[] = (orderData.directTasks ?? []).map((dt: any, idx: number) => {
          const taskId = `task_inline_${orderId}_${idx}`;
          return {
              id: taskId,
              assetId: dt.assetId ?? asset.id,
              scheduleId: `sch_inline_${orderId}_${idx}`,
              serviceTypeIds: dt.serviceTypeIds ?? [],
              status: 'in_progress',
              meterSnapshot: {
                  odometer: currentVehicle.odometer ?? 0,
                  engineHours: 0,
                  capturedAt: captureIso,
              },
              createdAt: captureIso,
          } as MaintenanceTask;
      });

      // 2. Combined task ids — existing ticked tasks + freshly-created direct ones.
      const combinedTaskIds: string[] = [
          ...(orderData.taskIds ?? []),
          ...directTasks.map((t) => t.id),
      ];

      // 3. Push direct tasks into local state so the Tasks panel shows them.
      if (directTasks.length > 0) {
          setAssetTasks((prev) => [...directTasks, ...prev]);
      }

      // 4. Mark any existing tasks that were attached as in_progress.
      if ((orderData.taskIds ?? []).length > 0) {
          setAssetTasks((prev) =>
              prev.map((t) =>
                  orderData.taskIds.includes(t.id) ? { ...t, status: 'in_progress' as const } : t
              )
          );
      }

      // 5. Build the new order.
      const newOrder: TaskOrder = {
          id: orderId,
          taskIds: combinedTaskIds,
          vendorId: orderData.vendorId,
          status: 'open',
          createdAt: captureIso,
          dueDate: orderData.dueDate,
          meta: orderData.meta ?? {
              odometerRequired: false,
              odometerUnit: currentVehicle.country === 'Canada' ? 'km' : 'miles',
              engineHoursRequired: false,
          },
          notes: orderData.notes ?? '',
          completions: [],
      };

      setAssetOrders((prev) => [newOrder, ...prev]);
      setIsCreateOrderModalOpen(false);
  };

  const handleAddVendor = (newVendor: any) => {
      setVendors(prev => [...prev, newVendor]);
  };

  /** CreateScheduleForm payload contract:
   *    { id, entityCategory, name, serviceTypeIds[], remarksByService?, assignment: { applyToAll, entityIds[] }, status, createdAt }
   *  We materialise one MaintenanceTask per (serviceTypeId × entityId in scope)
   *  for this asset only — when called from the asset detail page the
   *  assignment is locked to the current asset.
   */
  const handleCreateSchedule = (schedule: any) => {
      const targetIds: string[] = (schedule.assignment?.entityIds ?? []).filter(
          (id: string) => id === asset.id
      );
      // Fall back to this asset's id if nothing matched (defensive — the form
      // is initialised with `initialAssetId={asset.id}`).
      const ids = targetIds.length > 0 ? targetIds : [asset.id];

      const newTasks: MaintenanceTask[] = [];
      for (const aid of ids) {
          for (const sid of schedule.serviceTypeIds ?? []) {
              const taskId = `task_${schedule.id}_${aid}_${sid}`;
              newTasks.push({
                  id: taskId,
                  assetId: aid,
                  scheduleId: schedule.id,
                  serviceTypeIds: [sid],
                  status: 'upcoming',
                  meterSnapshot: {
                      odometer: currentVehicle.odometer ?? 0,
                      engineHours: 0,
                      capturedAt: schedule.createdAt,
                  },
                  dueRule: {
                      unit: 'miles',
                      frequencyEvery: 15000,
                      upcomingThreshold: 5000,
                      dueAtOdometer: (currentVehicle.odometer ?? 0) + 15000,
                  },
                  createdAt: schedule.createdAt,
              });
          }
      }

      if (newTasks.length > 0) {
          setAssetTasks((prev) => [...newTasks, ...prev]);
      }
      setIsCreatingSchedule(false);
  };

  // ── Full-page form: Schedule ────────────────────────────────────────────
  // Same pattern as AssetMaintenancePage — the form owns the entire content
  // area. A thin sticky banner above the form makes it clear which asset is
  // pre-selected, since the form was launched from the asset detail.
  if (isCreatingSchedule) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <SelectedAssetBanner asset={currentVehicle} action="Schedule Maintenance" />
        <CreateScheduleForm
          onSave={handleCreateSchedule}
          onCancel={() => setIsCreatingSchedule(false)}
          initialAssetId={asset.id}
          initialEntityType={asset.assetCategory === 'CMV' ? 'truck' : asset.assetCategory === 'Non-CMV' ? 'trailer' : undefined}
        />
      </div>
    );
  }

  // ── Full-page form: Add Work Order ──────────────────────────────────────
  // Same pattern — render the modal directly with the selected-asset banner
  // above so the user always sees which vehicle the order is for.
  if (isCreateOrderModalOpen) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50">
        <SelectedAssetBanner asset={currentVehicle} action="Add Work Order" />
        <CreateOrderModal
          isOpen={true}
          onClose={() => setIsCreateOrderModalOpen(false)}
          onCreate={handleCreateOrder}
          preSelectedAssetId={asset.id}
          selectedTasks={[]}
          availableTasks={assetTasks.filter(
            (t) =>
              t.status !== 'completed' &&
              t.status !== 'cancelled' &&
              !assetOrders.some((o) => o.taskIds.includes(t.id))
          )}
          vendors={vendors}
          onAddVendor={handleAddVendor}
        />
      </div>
    );
  }

  return (
    <div className="font-sans text-slate-900 flex flex-col h-full bg-slate-50">
      <main className="flex-1 min-w-0 pb-12 overflow-y-auto">
        {/* Sticky top section — breadcrumb + header strip + tabs travel
            together so the user always has the back button, status, and
            tab switcher visible while scrolling tab content. */}
        <div className="sticky top-0 z-30 bg-white">
        {/* Breadcrumb bar — Pattern B (matches DriverProfile + MyProfile shell):
            explicit Back-to-list button + vertical divider + breadcrumb chain.
            Thin h-11 strip on slate-50 with a single bottom border. */}
        <header className="h-11 px-8 flex items-center gap-3 border-b border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft size={13} /> Back to Assets
          </button>
          <span aria-hidden className="h-4 w-px bg-slate-200" />
          <nav className="flex items-center text-xs font-medium text-slate-500 min-w-0">
            <span
              className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
              onClick={onBack}
            >
              Assets
            </span>
            <ChevronRight size={12} className="mx-1.5 text-slate-300 shrink-0" />
            <span
              className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors"
              onClick={onBack}
            >
              {currentVehicle.assetType ?? "Asset"}{currentVehicle.vehicleType ? ` · ${currentVehicle.vehicleType}` : ""}
            </span>
            <ChevronRight size={12} className="mx-1.5 text-slate-300 shrink-0" />
            <span className="text-slate-700 font-semibold truncate">
              Unit #{currentVehicle.unitNumber}
            </span>
          </nav>
        </header>

        {/* Header strip — flat edge-to-edge on white with bottom border,
            matches the MyProfilePage pattern (no surrounding Card wrapper). */}
        <div className="bg-white border-b border-slate-200 px-8 pt-6 pb-6">
            <div>
              <div className="flex items-start gap-5 flex-wrap">
                {/* Image-as-avatar with status dot, mirrors the driver avatar. */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-100 overflow-hidden shadow-sm">
                    <VehicleImageDisplay src={currentVehicle.image} alt={currentVehicle.unitNumber} />
                  </div>
                  <div
                    title={currentVehicle.operationalStatus}
                    className={cn(
                      "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white shadow-sm",
                      currentVehicle.operationalStatus === 'Active'
                        ? 'bg-emerald-500'
                        : currentVehicle.operationalStatus === 'Deactivated'
                          ? 'bg-slate-400'
                          : 'bg-amber-500'
                    )}
                  />
                </div>

                {/* Title block + contact row */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                      {currentVehicle.year} {currentVehicle.make} {currentVehicle.model}
                    </h1>
                    <Badge
                      variant={currentVehicle.operationalStatus === 'Active' ? 'success' : 'warning'}
                      className="shadow-sm font-bold tracking-wider px-2.5 py-0.5 text-[10px]"
                    >
                      {currentVehicle.operationalStatus}
                    </Badge>
                    {currentVehicle.vehicleType && (
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                        {currentVehicle.vehicleType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <User size={13} className="text-slate-400" />
                      {currentVehicle.drivers?.length
                        ? currentVehicle.drivers.map((d) => d.name).join(', ')
                        : 'No drivers assigned'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-400" />
                      {currentVehicle.location || 'Location not specified'}
                    </span>
                    {currentVehicle.dateAdded && (
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        Added {currentVehicle.dateAdded}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit Vehicle CTA — top-right of the header, like MyProfilePage. */}
                <div className="shrink-0">
                  <Button
                    onClick={onEdit}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-all flex items-center gap-2"
                  >
                    <Settings size={14} /> Edit Vehicle
                  </Button>
                </div>
              </div>

              {/* Quick stat cards — 4-up, persistent across all tabs.
                  Replaces the side risk/health panel so the header reads
                  horizontally like the MyProfilePage pattern. */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Odometer</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {currentVehicle.odometer ? currentVehicle.odometer.toLocaleString() : '0'} {currentVehicle.odometerUnit || 'mi'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    (currentVehicle.riskScore ?? 100) >= 85
                      ? 'bg-emerald-50 text-emerald-600'
                      : (currentVehicle.riskScore ?? 100) >= 70
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-600'
                  )}>
                    <ShieldCheck size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Risk Score</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {currentVehicle.riskScore ?? 100}
                      <span className="ml-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        {(currentVehicle.riskScore ?? 100) >= 85 ? 'Low Risk' : (currentVehicle.riskScore ?? 100) >= 70 ? 'Med Risk' : 'High Risk'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    currentVehicle.health === 'Good' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  )}>
                    <Activity size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Health</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {currentVehicle.health || 'Good'}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                  <div className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                    (() => {
                        const plateKn = keyNumbers.find((k: KeyNumberConfig) => k.id === 'kn-plate');
                        if (!currentVehicle.registrationExpiryDate) return 'bg-slate-100 text-slate-500';
                        const status = calculateComplianceStatus(currentVehicle.registrationExpiryDate, isMonitoringEnabled(plateKn), getMaxReminderDays(plateKn), true, true);
                        return status === 'Expired'
                          ? 'bg-rose-50 text-rose-600'
                          : status === 'Expiring Soon'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-violet-50 text-violet-600';
                    })()
                  )}>
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Plate Expiry</div>
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {currentVehicle.registrationExpiryDate || '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Row */}
              <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-y-5 gap-x-6">
                <MetadataItem label="Unit #" value={currentVehicle.unitNumber} copyable={true} />
                <MetadataItem label="VIN #" value={currentVehicle.vin} copyable={true} />
                <MetadataItem label="Plate #" value={currentVehicle.plateNumber || '—'} copyable={true} />
                <MetadataItem label="Plate State" value={currentVehicle.plateJurisdiction || '—'} />
                <MetadataItem label="Plate Expiry" value={currentVehicle.registrationExpiryDate || '—'} warning={
                    (() => {
                        const plateKn = keyNumbers.find((k: KeyNumberConfig) => k.id === 'kn-plate');
                        if (!currentVehicle.registrationExpiryDate) return false;
                        const status = calculateComplianceStatus(
                            currentVehicle.registrationExpiryDate,
                            isMonitoringEnabled(plateKn),
                            getMaxReminderDays(plateKn),
                            true,
                            true
                        );
                        return status === 'Expiring Soon' || status === 'Expired';
                    })()
                } />

                <MetadataItem label="Gross Weight" value={currentVehicle.grossWeight ? `${currentVehicle.grossWeight.toLocaleString()} ${currentVehicle.grossWeightUnit}` : '—'} />
                <MetadataItem label="Unloaded Weight" value={currentVehicle.unloadedWeight ? `${currentVehicle.unloadedWeight.toLocaleString()} ${currentVehicle.unloadedWeightUnit}` : '—'} />
                <div className="flex flex-col">
                    <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-1">GVWR Class</span>
                    <GvwrTag weight={currentVehicle.grossWeight} unit={currentVehicle.grossWeightUnit} size="md" />
                </div>
                <MetadataItem label="Ownership" value={currentVehicle.financialStructure} />
                <MetadataItem label="Market Value" value={currentVehicle.marketValue ? `$${currentVehicle.marketValue.toLocaleString()} ${currentVehicle.marketValueCurrency || 'USD'}` : '—'} />

                {currentVehicle.financialStructure === 'Leased' && currentVehicle.leasingName && (
                    <MetadataItem label="Leasing Co." value={currentVehicle.leasingName} />
                )}
                {currentVehicle.financialStructure === 'Financed' && currentVehicle.lienHolderBusiness && (
                    <MetadataItem label="Lien Holder" value={currentVehicle.lienHolderBusiness} />
                )}

                <MetadataItem label="Date Added" value={currentVehicle.dateAdded || '—'} />
                {currentVehicle.dateRemoved && <MetadataItem label="Date Removed" value={currentVehicle.dateRemoved} warning />}
              </div>
            </div>
        </div>

        {/* Tabs strip — grouped by `group` field with thin vertical
            separators between categories so the bar reads as four sections:
            Compliance · Operations · Safety · Alerts. Same blue-underline
            active style as the SubTabs component. */}
        <div className="bg-white px-8 border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px">
            {tabs.map((tab, idx) => {
              const showSeparator = idx > 0 && tabs[idx - 1].group !== tab.group;
              const active = activeTab === tab.name;
              const Icon = tab.icon;
              return (
                <React.Fragment key={tab.name}>
                  {showSeparator && (
                    <div aria-hidden="true" className="h-5 w-px bg-slate-200 mx-2 self-center shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab(tab.name)}
                    className={`relative py-3 px-3 text-sm font-medium whitespace-nowrap transition-colors inline-flex items-center gap-2 border-b-2 ${
                      active
                        ? 'text-blue-600 border-blue-600'
                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:border-slate-300'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                    <span>{tab.name}</span>
                    {tab.count > 0 && (
                      <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold tabular-nums ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        </div>{/* end sticky top section */}

        {/* Tab content — slate-50 page background visible around the content,
            same outer padding as MyProfilePage. */}
        <div className="px-8 py-8">
            {/* ── Overview tab — at-a-glance health card for this asset ─── */}
            {activeTab === 'Overview' && (() => {
                // Pull asset-scoped slices once. Same filters the Inspections /
                // Violations / Accidents tabs use further down so the numbers
                // tally exactly with the badged counts.
                const aInspections = inspectionsData.filter((ins: any) =>
                    ins.assetId === currentVehicle.id
                    || ins.vehiclePlate === currentVehicle.plateNumber
                    || ins.units?.some((u: any) => u.vin === currentVehicle.vin));
                const aViolations = MOCK_ASSET_VIOLATION_RECORDS.filter((v: any) =>
                    v.assetId === currentVehicle.id
                    || v.assetName === currentVehicle.unitNumber
                    || v.assetName === currentVehicle.plateNumber);
                const aIncidents = INCIDENTS.filter((inc: any) =>
                    inc.vehicleId === currentVehicle.id
                    || inc.unitNumber === currentVehicle.unitNumber);
                const insOos = aInspections.filter((i: any) => i.hasOOS).length;
                const insClean = aInspections.filter((i: any) => i.isClean).length;
                const violOpen = aViolations.filter((v: any) => v.status === 'Open').length;
                const violOos = aViolations.filter((v: any) => v.isOos).length;
                const incPreventable = aIncidents.filter((i: any) => i.preventability?.value === 'preventable').length;

                // Composite asset safety score. Mirrors the driver Overview
                // formula — starts at 100, penalised by open / OOS / preventable.
                const safetyScore = Math.max(0, 100
                    - violOpen * 8
                    - insOos * 5
                    - violOos * 6
                    - incPreventable * 10
                    - aIncidents.length * 4);
                const safetyTone = safetyScore >= 85 ? 'emerald' : safetyScore >= 65 ? 'amber' : 'red';
                const safetyBorderCls = safetyTone === 'emerald' ? 'border-l-emerald-600'
                                      : safetyTone === 'amber'   ? 'border-l-amber-500'
                                      :                            'border-l-red-600';
                const safetyIconCls = safetyTone === 'emerald' ? 'bg-emerald-50 text-emerald-600'
                                    : safetyTone === 'amber'   ? 'bg-amber-50 text-amber-600'
                                    :                            'bg-red-50 text-red-600';
                const safetyValueCls = safetyTone === 'emerald' ? 'text-emerald-600'
                                     : safetyTone === 'amber'   ? 'text-amber-600'
                                     :                            'text-red-600';

                // Asset age (from year)
                const assetYear = typeof currentVehicle.year === 'number' ? currentVehicle.year : Number(currentVehicle.year);
                const ageYrs = Number.isFinite(assetYear) ? Math.max(0, new Date().getFullYear() - assetYear) : null;

                // Maintenance roll-ups from the existing assetTasks / assetOrders.
                const overdueTasks = assetTasks.filter((t: any) => t.status === 'overdue').length;
                const dueTasks = assetTasks.filter((t: any) => t.status === 'due').length;
                const upcomingTasks = assetTasks.filter((t: any) => t.status === 'upcoming' || t.status === 'in_progress').length;
                const openOrders = assetOrders.filter((o: any) => o.status === 'open').length;
                const completedOrders = assetOrders.filter((o: any) => o.status === 'completed').length;
                const recentOrderCost = assetOrders
                    .filter((o: any) => o.status === 'completed' && o.totalCost)
                    .reduce((s: number, o: any) => s + (Number(o.totalCost) || 0), 0);

                // Recent activity feed — combined inspections / violations /
                // incidents, sorted by date, capped at 6.
                type ActivityItem = { kind: 'inspection' | 'violation' | 'incident' | 'maintenance'; date: string; title: string; subtitle?: string; tone: string };
                const activity: ActivityItem[] = [];
                for (const i of aInspections as any[]) {
                    const stateLabel = typeof i.state === 'string' ? i.state : (i.state?.raw ?? '');
                    activity.push({
                        kind: 'inspection',
                        date: i.date,
                        title: i.isClean ? 'Clean inspection' : `Inspection — ${(i.violations?.length || 0)} violation${(i.violations?.length || 0) === 1 ? '' : 's'}`,
                        subtitle: i.location ?? stateLabel,
                        tone: i.isClean ? 'emerald' : (i.hasOOS ? 'red' : 'amber'),
                    });
                }
                for (const v of aViolations as any[]) {
                    activity.push({
                        kind: 'violation',
                        date: v.date,
                        title: v.violationType ?? 'Violation',
                        subtitle: `${v.result ?? ''}${v.fineAmount ? ` · $${v.fineAmount}` : ''}`,
                        tone: v.isOos ? 'red' : 'amber',
                    });
                }
                for (const inc of aIncidents as any[]) {
                    activity.push({
                        kind: 'incident',
                        date: inc.occurredAt ?? inc.occurredDate ?? '',
                        title: 'Incident reported',
                        subtitle: inc.cause?.primaryCause ?? inc.severity ?? '',
                        tone: 'red',
                    });
                }
                for (const o of assetOrders.filter((x: any) => x.status === 'completed') as any[]) {
                    activity.push({
                        kind: 'maintenance',
                        date: o.completedAt ?? o.scheduledAt ?? '',
                        title: o.serviceName ?? o.taskName ?? 'Service completed',
                        subtitle: o.totalCost ? `$${Number(o.totalCost).toLocaleString()}` : '',
                        tone: 'emerald',
                    });
                }
                activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                const recentActivity = activity.filter(a => a.date).slice(0, 6);

                const activityIcon = (k: ActivityItem['kind']) => {
                    if (k === 'inspection') return FileCheck;
                    if (k === 'violation') return AlertTriangle;
                    if (k === 'incident') return AlertOctagon;
                    return Wrench;
                };
                const toneIconCls = (tone: string) => tone === 'emerald'
                    ? 'bg-emerald-50 text-emerald-600'
                    : tone === 'red'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-amber-50 text-amber-600';

                const totalAlerts = assetAlerts.length;

                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Asset Safety Analysis — same breakdown surfaced in
                            Safety Analysis > Asset. Renders nothing if the asset
                            isn't in the carrier scorecard list. */}
                        <AssetSafetyAnalysisSection
                            accountId={accountId}
                            assetId={currentVehicle.id}
                        />

                        {/* ── KPI row — single source of truth for the asset's health ── */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                type="button"
                                onClick={() => setActiveTab('Inspections')}
                                className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-slate-200 shadow-sm transition-all hover:shadow text-left ${safetyBorderCls}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${safetyIconCls}`}>
                                        <ShieldCheck className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Safety<br />Score</span>
                                </div>
                                <div className={`text-lg font-bold ${safetyValueCls}`}>{safetyScore}</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('Inspections')}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                        <FileCheck className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Inspections<br /><span className="text-emerald-600">{insClean} clean</span> / {insOos} OOS</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{aInspections.length}</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('Violations')}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Violations<br />{violOpen} open / {violOos} OOS</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{aViolations.length}</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('Accidents')}
                                className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-600 border-slate-200 shadow-sm transition-all hover:shadow text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                                        <AlertOctagon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Incidents<br />{incPreventable} preventable</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{aIncidents.length}</div>
                            </button>
                        </div>

                        {/* ── Two-column body: Maintenance summary + Recent activity ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-5">
                            {/* Maintenance summary */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
                                    <div className="flex items-center gap-2">
                                        <Wrench size={14} className="text-slate-500" />
                                        <span className="text-sm font-bold text-slate-900">Maintenance</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('Maintenance')}
                                        className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Open →
                                    </button>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-rose-50 border border-rose-200 rounded-md py-2 px-1">
                                            <div className="text-xl font-black text-rose-700 tabular-nums leading-none">{overdueTasks}</div>
                                            <div className="text-[9px] font-bold text-rose-600 uppercase tracking-wider mt-1">Overdue</div>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-200 rounded-md py-2 px-1">
                                            <div className="text-xl font-black text-amber-700 tabular-nums leading-none">{dueTasks}</div>
                                            <div className="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-1">Due</div>
                                        </div>
                                        <div className="bg-blue-50 border border-blue-200 rounded-md py-2 px-1">
                                            <div className="text-xl font-black text-blue-700 tabular-nums leading-none">{upcomingTasks}</div>
                                            <div className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-1">Upcoming</div>
                                        </div>
                                    </div>
                                    <div className="border-t border-slate-100 pt-3 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Open work orders</span>
                                            <span className="font-bold text-slate-900 tabular-nums">{openOrders}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Completed orders</span>
                                            <span className="font-bold text-slate-900 tabular-nums">{completedOrders}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Total service cost</span>
                                            <span className="font-bold text-slate-900 tabular-nums">${recentOrderCost.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent activity */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
                                    <div className="flex items-center gap-2">
                                        <History size={14} className="text-slate-500" />
                                        <span className="text-sm font-bold text-slate-900">Recent activity</span>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Last {recentActivity.length} events
                                    </span>
                                </div>
                                {recentActivity.length === 0 ? (
                                    <div className="px-4 py-12 text-center text-xs text-slate-400">
                                        No events recorded for this asset.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {recentActivity.map((a, idx) => {
                                            const Icon = activityIcon(a.kind);
                                            return (
                                                <li key={`${a.kind}-${idx}-${a.date}`} className="px-4 py-2.5 flex items-start gap-3">
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${toneIconCls(a.tone)}`}>
                                                        <Icon className="w-3.5 h-3.5" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[12px] font-bold text-slate-900 truncate">{a.title}</div>
                                                        {a.subtitle && (
                                                            <div className="text-[10px] text-slate-500 truncate">{a.subtitle}</div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-mono text-slate-400 shrink-0 whitespace-nowrap">
                                                        {a.date ? new Date(a.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* ── Specs + Alerts row ─────────────────────────────── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Specs */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                                    <Truck size={14} className="text-slate-500" />
                                    <span className="text-sm font-bold text-slate-900">Asset specs</span>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                                    {[
                                        { label: 'Unit #',       value: currentVehicle.unitNumber ?? '—' },
                                        { label: 'Plate',        value: currentVehicle.plateNumber ?? '—' },
                                        { label: 'VIN',          value: currentVehicle.vin ?? '—' },
                                        { label: 'Make / Model', value: `${currentVehicle.make ?? '—'} ${currentVehicle.model ?? ''}`.trim() || '—' },
                                        { label: 'Year',         value: currentVehicle.year ? `${currentVehicle.year}${ageYrs != null ? ` · ${ageYrs} yr${ageYrs === 1 ? '' : 's'}` : ''}` : '—' },
                                        { label: 'Odometer',     value: currentVehicle.odometer != null ? `${Number(currentVehicle.odometer).toLocaleString()} mi` : '—' },
                                        { label: 'Status',       value: currentVehicle.operationalStatus ?? '—' },
                                        { label: 'Ownership',    value: currentVehicle.financialStructure ?? '—' },
                                    ].map(s => (
                                        <div key={s.label}>
                                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</div>
                                            <div className="text-[12px] font-semibold text-slate-900 mt-0.5 truncate">{String(s.value)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Alerts */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/60">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={14} className="text-slate-500" />
                                        <span className="text-sm font-bold text-slate-900">Alerts</span>
                                    </div>
                                    {totalAlerts > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('Notifications')}
                                            className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors"
                                        >
                                            See all →
                                        </button>
                                    )}
                                </div>
                                {totalAlerts === 0 ? (
                                    <div className="px-4 py-10 text-center text-xs text-slate-400">
                                        Nothing requires attention right now.
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {assetAlerts.slice(0, 5).map((a, idx) => {
                                            const sevTone = a.severity === 'high' ? 'bg-rose-50 text-rose-600'
                                                          : a.severity === 'medium' ? 'bg-amber-50 text-amber-600'
                                                          :                            'bg-slate-50 text-slate-500';
                                            return (
                                                <li key={idx} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer"
                                                    onClick={() => setActiveTab(a.tabTarget)}>
                                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${sevTone}`}>
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                    </span>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-[12px] font-bold text-slate-900 truncate">{a.title}</div>
                                                        {a.detail && <div className="text-[10px] text-slate-500 truncate">{a.detail}</div>}
                                                    </div>
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                                                        {a.category}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Compliance Monitoring Content - NOW IN LIST VIEW */}
            {activeTab === 'Compliance Monitoring' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Compliance Stat Filters — single-line labels, accent bar,
                    refined ring active state. Same template across cards so the
                    grid stays aligned at every breakpoint. */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {[
                        { id: 'missing-number',  label: 'Missing Number', value: complianceStats.missingNumber, Icon: Hash,         tone: 'rose'   },
                        { id: 'missing-expiry',  label: 'Missing Expiry', value: complianceStats.missingExpiry, Icon: Clock,        tone: 'amber'  },
                        { id: 'missing-doc',     label: 'Missing Doc',    value: complianceStats.missingDoc,    Icon: FileText,     tone: 'orange' },
                        { id: 'expiring',        label: 'Expiring Soon',  value: complianceStats.expiring,      Icon: Clock,        tone: 'yellow' },
                        { id: 'expired',         label: 'Expired Items',  value: complianceStats.expired,       Icon: AlertCircle,  tone: 'red'    },
                    ].map((card) => {
                        const active = activeComplianceFilter === card.id;
                        const tones: Record<string, { iconBg: string; iconFg: string; bar: string; ring: string }> = {
                            rose:   { iconBg: 'bg-rose-50',   iconFg: 'text-rose-500',   bar: 'bg-rose-500',   ring: 'ring-rose-500/30' },
                            amber:  { iconBg: 'bg-amber-50',  iconFg: 'text-amber-500',  bar: 'bg-amber-500',  ring: 'ring-amber-500/30' },
                            orange: { iconBg: 'bg-orange-50', iconFg: 'text-orange-500', bar: 'bg-orange-500', ring: 'ring-orange-500/30' },
                            yellow: { iconBg: 'bg-yellow-50', iconFg: 'text-yellow-600', bar: 'bg-yellow-500', ring: 'ring-yellow-500/30' },
                            red:    { iconBg: 'bg-red-50',    iconFg: 'text-red-600',    bar: 'bg-red-500',    ring: 'ring-red-500/30' },
                        };
                        const t = tones[card.tone];
                        return (
                            <button
                                key={card.id}
                                onClick={() => setActiveComplianceFilter(active ? null : card.id)}
                                className={`relative flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left transition-all hover:shadow hover:border-slate-300 ${active ? `ring-2 ${t.ring} border-transparent` : ''}`}
                            >
                                <span className={`absolute left-0 top-0 bottom-0 w-1 transition-all ${t.bar} ${active ? 'opacity-100' : 'opacity-30'}`} />
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.iconBg} ${t.iconFg}`}>
                                        <card.Icon size={16} />
                                    </div>
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">{card.label}</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900 tabular-nums shrink-0">{card.value}</div>
                            </button>
                        );
                    })}
                </div>

                <Card className="flex flex-col overflow-hidden border-blue-100 shadow-md">
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-blue-50/30">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Key Numbers & Compliance Monitors</h3>
                        <p className="text-xs font-medium text-slate-500">Structured list of ID numbers, permits, and state authority monitors</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2"><Plus size={14} /> Add Number</Button>
                  </div>
                  
                  {/* Grouped Lists Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Number Type</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-1/4">Value</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-[150px]">Status</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[150px]">Expiry</th>
                          <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[100px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {complianceGroups.length > 0 ? complianceGroups.map((group) => (
                           <React.Fragment key={group.key}>
                                {/* Group Header */}
                                <tr 
                                    className="bg-slate-50/80 border-b border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => toggleGroup(group.key)}
                                >
                                    <td colSpan={5} className="px-6 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {collapsedGroups[group.key] ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</span>
                                        </div>
                                    </td>
                                </tr>
                                
                                {/* Items */}
                                {!collapsedGroups[group.key] && group.items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0 h-16 group">
                                        <td className="px-6 py-4">
                                            <span className="font-semibold text-sm text-slate-900">{item.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {item.number === 'Not entered' ? (
                                                <span className="text-slate-400 text-sm italic">Not entered</span>
                                            ) : (
                                                <code className="text-sm font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800 font-bold">{item.number}</code>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge variant={item.status === 'Active' ? 'success' : item.status === 'Expiring Soon' ? 'warning' : 'danger'}>
                                                {item.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                            {item.expiryDate}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => {
                                                    handleEditKeyNumber(item.config, item.number, item.expiryDate === '-' || item.expiryDate === 'Not set' ? undefined : item.expiryDate);
                                                }}
                                                className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                           </React.Fragment>
                        )) : (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No compliance monitors found matching filter.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      <Clock size={12} />
                      Syncing with DMV and FMCSA databases... Last sync: 12 minutes ago
                  </div>
                </Card>
              </div>
            )}



            {/* Violations Content — unified CVOR / NSC / FMCSA panel
                showing this asset's convictions and FMCSA violations. */}
            {activeTab === 'Violations' && (
              <SafetyRecordsPanel
                events={getSafetyEventsForAsset(currentVehicle.id, {
                  plateNumber: currentVehicle.plateNumber,
                  vin: currentVehicle.vin,
                  unitNumber: currentVehicle.unitNumber,
                })}
                kinds={['violation', 'conviction']}
                title="Violations"
                subtitle="Convictions and citations linked to this asset across regulatory reports."
              />
            )}
            {/* Legacy FMCSA/MOCK violations view — disabled until removed. */}
            {activeTab === '__legacy_violations_disabled' && (() => {

              const assetViolations = MOCK_ASSET_VIOLATION_RECORDS.filter((v: any) => v.assetId === currentVehicle.id || v.assetName === currentVehicle.unitNumber || v.assetName === currentVehicle.plateNumber);

              const oosCount = assetViolations.filter((v: any) => v.isOos).length;

              const openCount = assetViolations.filter((v: any) => v.status === 'Open').length;

              const totalFines = assetViolations.reduce((sum: number, v: any) => sum + (v.fineAmount || 0), 0);



              const violColVis = (id: string) => violCols.find(c => c.id === id)?.visible;

              const violFiltered = assetViolations.filter((v: any) => {

                if (!violQ) return true;

                const s = violQ.toLowerCase();

                return v.violationCode?.toLowerCase().includes(s) || v.violationType?.toLowerCase().includes(s);

              });

              const violPaged = violFiltered.slice((violPage - 1) * violRpp, violPage * violRpp);



              return (

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  <div className="flex items-center justify-between">

                    <div>

                      <h3 className="font-bold text-slate-900 text-base">Asset Violations</h3>

                      <p className="text-xs font-medium text-slate-500">Track and manage violations associated with this asset.</p>

                    </div>

                  </div>



                  {/* KPI Cards */}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Violations</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{assetViolations.length}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertOctagon className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">OOS<br />Orders</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{oosCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-500 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Open<br />Cases</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{openCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-emerald-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><DollarSign className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Fines</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">${totalFines.toLocaleString()}</div>

                    </div>

                  </div>



                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                    <DataListToolbar searchValue={violQ} onSearchChange={setViolQ} searchPlaceholder="Search violations..." columns={violCols} onToggleColumn={(id) => setViolCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={violFiltered.length} currentPage={violPage} rowsPerPage={violRpp} onPageChange={setViolPage} onRowsPerPageChange={setViolRpp} />

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-xs font-bold text-slate-500">

                          <tr>

                            {violColVis('date') && <th className="px-6 py-4">Date</th>}

                            {violColVis('type') && <th className="px-6 py-4">Violation Type</th>}

                            {violColVis('code') && <th className="px-6 py-4">Code</th>}

                            {violColVis('status') && <th className="px-6 py-4 text-center">Status</th>}

                            {violColVis('fine') && <th className="px-6 py-4 text-right">Fine</th>}
                            <th className="px-6 py-4 text-center w-[80px]">Actions</th>
                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">

                          {violPaged.length > 0 ? violPaged.map((violation: any) => (

                               <tr key={violation.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setViewingViolation(violation)}>

                                 {violColVis('date') && (<td className="px-6 py-4 font-medium text-slate-900">{new Date(violation.date).toLocaleDateString()}</td>)}

                                 {violColVis('type') && (<td className="px-6 py-4"><div className="font-medium text-slate-900 line-clamp-2">{violation.violationType}</div><div className="text-xs text-slate-500 mt-1">{violation.violationGroup}</div></td>)}

                                 {violColVis('code') && (<td className="px-6 py-4"><code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">{violation.violationCode}</code></td>)}

                                 {violColVis('status') && (<td className="px-6 py-4 text-center"><Badge variant={violation.status === 'Closed' ? 'success' : violation.status === 'Open' ? 'warning' : 'neutral'}>{violation.status}</Badge>{violation.isOos && <Badge variant="danger" className="ml-2 w-auto">OOS</Badge>}</td>)}

                                 {violColVis('fine') && (<td className="px-6 py-4 text-right font-bold text-slate-900">{violation.fineAmount > 0 ? new Intl.NumberFormat('en-US', { style: 'currency', currency: violation.currency || 'USD' }).format(violation.fineAmount) : 'â€”'}</td>)}
                                 <td className="px-6 py-4 text-center">
                                   <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={(e) => { e.stopPropagation(); setViewingViolation(violation); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details"><Eye size={16} /></button>
                                     <button onClick={(e) => { e.stopPropagation(); setEditingViolation(violation); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Edit"><Edit2 size={16} /></button>
                                   </div>
                                 </td>
                               </tr>

                          )) : (

                              <tr>

                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">

                                  <div className="flex flex-col items-center justify-center gap-2">

                                    <div className="p-3 bg-slate-50 rounded-full"><AlertCircle size={24} className="opacity-30" /></div>

                                    <span className="text-sm font-medium">No violations recorded for this asset</span>

                                  </div>

                                </td>

                              </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                    <PaginationBar totalItems={violFiltered.length} currentPage={violPage} rowsPerPage={violRpp} onPageChange={setViolPage} onRowsPerPageChange={setViolRpp} />

                  </div>

              </div>

              );

            })()}

            {/* Accidents Content — unified CVOR / NSC / FMCSA panel
                showing collisions linked to this asset. */}
            {activeTab === 'Accidents' && (
              <SafetyRecordsPanel
                events={getSafetyEventsForAsset(currentVehicle.id, {
                  plateNumber: currentVehicle.plateNumber,
                  vin: currentVehicle.vin,
                  unitNumber: currentVehicle.unitNumber,
                })}
                kinds={['collision', 'accident']}
                title="Accidents"
                subtitle="Collisions involving this asset reported across CVOR, NSC, and FMCSA."
              />
            )}
            {/* Legacy INCIDENTS view — disabled until removed. */}
            {activeTab === '__legacy_accidents_disabled' && (() => {

              const assetIncidents = INCIDENTS.filter((inc: any) => inc.vehicles?.some((v: any) => v.assetId === currentVehicle.id || v.vin === currentVehicle.vin));

              const totalCost = assetIncidents.reduce((sum: number, inc: any) => sum + (inc.costs?.totalAccidentCosts || 0), 0);

              const preventableCount = assetIncidents.filter((inc: any) => inc.preventability?.value === 'preventable').length;

              const tbdCount = assetIncidents.filter((inc: any) => inc.preventability?.value === 'tbd').length;



              const accColVis = (id: string) => accCols.find(c => c.id === id)?.visible;

              const accFiltered = assetIncidents.filter((inc: any) => {

                if (!accQ) return true;

                const s = accQ.toLowerCase();

                return inc.incidentId?.toLowerCase().includes(s) || inc.cause?.incidentType?.toLowerCase().includes(s) || inc.location?.city?.toLowerCase().includes(s);

              });

              const accPaged = accFiltered.slice((accPage - 1) * accRpp, accPage * accRpp);



              return (

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* KPI Cards */}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><Car className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Accidents</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{assetIncidents.length}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-emerald-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><DollarSign className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Costs</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalCost)}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Preventable<br />Accidents</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{preventableCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-500 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Pending<br />(TBD)</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{tbdCount}</div>

                    </div>

                  </div>



                  {/* Table Card */}

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                    <DataListToolbar searchValue={accQ} onSearchChange={setAccQ} searchPlaceholder="Search accidents..." columns={accCols} onToggleColumn={(id) => setAccCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={accFiltered.length} currentPage={accPage} rowsPerPage={accRpp} onPageChange={setAccPage} onRowsPerPageChange={setAccRpp} />

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="bg-slate-50/80 border-b border-slate-200">

                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">

                            {accColVis('date') && <th className="px-5 py-3">Date</th>}

                            {accColVis('incident') && <th className="px-5 py-3">Incident</th>}

                            {accColVis('type') && <th className="px-5 py-3">Type / Cause</th>}

                            {accColVis('location') && <th className="px-5 py-3">Location</th>}

                            {accColVis('severity') && <th className="px-5 py-3 text-center">Severity</th>}

                            {accColVis('preventability') && <th className="px-5 py-3 text-center">Preventability</th>}

                            {accColVis('status') && <th className="px-5 py-3 text-center">Status</th>}

                            {accColVis('cost') && <th className="px-5 py-3 text-right">Cost</th>}

                            <th className="px-5 py-3 text-right">Actions</th>

                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {accPaged.length > 0 ? accPaged.map((incident: any) => (

                            <tr key={incident.incidentId} className="hover:bg-blue-50/30 transition-colors group">

                              {accColVis('date') && (<td className="px-5 py-3.5"><div className="font-semibold text-slate-900">{new Date(incident.occurredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div><div className="text-xs text-slate-500">{new Date(incident.occurredAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div></td>)}

                              {accColVis('incident') && (<td className="px-5 py-3.5"><div className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold font-mono border border-blue-100 mb-1">{incident.incidentId}</div><div className="text-xs text-slate-500">Claim: {incident.insuranceClaimNumber}</div></td>)}

                              {accColVis('type') && (<td className="px-5 py-3.5"><div className="font-medium text-slate-900">{incident.cause?.incidentType || 'Unknown'}</div><div className="text-xs text-slate-500">{incident.cause?.primaryCause || 'Unknown'}</div></td>)}

                              {accColVis('location') && (<td className="px-5 py-3.5"><div className="flex items-start gap-1.5"><MapPin size={14} className="text-slate-400 mt-0.5" /><div><div className="text-sm text-slate-900">{incident.location?.city}, {incident.location?.stateOrProvince}</div><div className="text-xs text-slate-500">{incident.location?.country}</div></div></div></td>)}

                              {accColVis('severity') && (<td className="px-5 py-3.5 text-center"><div className="flex flex-col gap-1 items-center">{incident.severity?.fatalities > 0 && <Badge variant="danger" className="text-[9px]">FATAL ({incident.severity.fatalities})</Badge>}{incident.severity?.injuriesNonFatal > 0 && <Badge variant="warning" className="text-[9px]">INJURIES ({incident.severity.injuriesNonFatal})</Badge>}{incident.severity?.towAway && <Badge variant="neutral" className="text-[9px]">TOW AWAY</Badge>}{!incident.severity?.fatalities && !incident.severity?.injuriesNonFatal && !incident.severity?.towAway && <Badge variant="success" className="text-[9px]">MINOR</Badge>}</div></td>)}

                              {accColVis('preventability') && (<td className="px-5 py-3.5 text-center"><Badge variant={incident.preventability?.value === 'preventable' ? 'danger' : incident.preventability?.value === 'non_preventable' ? 'success' : 'pending'}>{incident.preventability?.value?.toUpperCase() || 'TBD'}</Badge></td>)}

                              {accColVis('status') && (<td className="px-5 py-3.5 text-center"><Badge variant={incident.status?.value === 'closed' || incident.status?.value === 'resolved' ? 'success' : incident.status?.value === 'active' ? 'warning' : 'pending'}>{incident.status?.label?.toUpperCase() || incident.status?.value?.toUpperCase() || 'ACTIVE'}</Badge></td>)}

                              {accColVis('cost') && (<td className="px-5 py-3.5 text-right font-bold text-slate-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(incident.costs?.totalAccidentCosts || 0)}</td>)}

                              <td className="px-5 py-3.5 text-right">

                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">

                                  <button onClick={() => setViewingAccident(incident)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View Details"><Eye size={16} /></button>

                                  <button onClick={() => setEditingAccident(incident)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit Record"><Edit2 size={16} /></button>

                                </div>

                              </td>

                            </tr>

                          )) : (

                            <tr>

                              <td colSpan={9} className="px-6 py-12 text-center text-slate-400">

                                <div className="flex flex-col items-center justify-center gap-2">

                                  <div className="p-3 bg-slate-50 rounded-full"><Car size={24} className="opacity-30" /></div>

                                  <span className="text-sm font-medium">No accidents recorded</span>

                                </div>

                              </td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                    <PaginationBar totalItems={accFiltered.length} currentPage={accPage} rowsPerPage={accRpp} onPageChange={setAccPage} onRowsPerPageChange={setAccRpp} />

                  </div>

              </div>

              );

            })()}

            {/* Inspections Content */}

            {/* Inspections tab — unified CVOR / NSC / FMCSA panel.
                Switches between the three carrier-report sources via sub-tab
                pills and renders only inspection-kind events for this asset. */}
            {activeTab === 'Inspections' && (
              <SafetyRecordsPanel
                events={getSafetyEventsForAsset(currentVehicle.id, {
                  plateNumber: currentVehicle.plateNumber,
                  vin: currentVehicle.vin,
                  unitNumber: currentVehicle.unitNumber,
                })}
                kinds={['inspection']}
                title="Inspections"
                subtitle="Inspections recorded against this asset across CVOR, NSC, and FMCSA reports."
              />
            )}
            {/* Legacy FMCSA-only Inspections view kept below as fallback —
                executes only when activeTab is the (now non-existent) value
                'InspectionsLegacy', so it never renders. Preserved as
                reference until the new panel is fully validated. */}
            {activeTab === '__legacy_inspections_disabled' && (() => {

              const assetInspections = inspectionsData.filter((ins: any) => ins.assetId === currentVehicle.id || ins.vehiclePlate === currentVehicle.plateNumber || ins.units?.some((u: any) => u.vin === currentVehicle.vin));

              const totalViolations = assetInspections.reduce((sum: number, ins: any) => sum + (ins.violations?.length || 0), 0);

              const oosCount = assetInspections.filter((ins: any) => ins.hasOOS).length;

              const cleanCount = assetInspections.filter((ins: any) => ins.isClean).length;



              const insColVis = (id: string) => insCols.find(c => c.id === id)?.visible;

              const insFiltered = assetInspections.filter((ins: any) => {

                if (!insQ) return true;

                const s = insQ.toLowerCase();

                return ins.id?.toLowerCase().includes(s) || ins.driver?.toLowerCase().includes(s) || ins.state?.toLowerCase().includes(s);

              });

              const insPaged = insFiltered.slice((insPage - 1) * insRpp, insPage * insRpp);



              return (

              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* KPI Cards */}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-blue-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><FileCheck className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Inspections</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{assetInspections.length}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-red-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Violations</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{totalViolations}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-amber-500 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0"><AlertOctagon className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Out of<br />Service</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{oosCount}</div>

                    </div>

                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 border-l-emerald-600 border-slate-200 shadow-sm transition-all hover:shadow cursor-pointer">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><ShieldCheck className="w-4 h-4" /></div>

                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Clean<br />Inspections</span>

                      </div>

                      <div className="text-lg font-bold text-slate-900">{cleanCount}</div>

                    </div>

                  </div>



                  {/* Table Card */}

                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

                    <DataListToolbar searchValue={insQ} onSearchChange={setInsQ} searchPlaceholder="Search inspections..." columns={insCols} onToggleColumn={(id) => setInsCols(p => p.map(c => c.id === id ? { ...c, visible: !c.visible } : c))} totalItems={insFiltered.length} currentPage={insPage} rowsPerPage={insRpp} onPageChange={setInsPage} onRowsPerPageChange={setInsRpp} />

                    <div className="overflow-x-auto">

                      <table className="w-full text-left text-sm">

                        <thead className="bg-slate-50/80 border-b border-slate-200">

                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">

                            {insColVis('date') && <th className="px-5 py-3">Date</th>}

                            {insColVis('report') && <th className="px-5 py-3">Report #</th>}

                            {insColVis('level') && <th className="px-5 py-3">Level</th>}

                            {insColVis('state') && <th className="px-5 py-3">State</th>}

                            {insColVis('driver') && <th className="px-5 py-3">Driver</th>}

                            {insColVis('violations') && <th className="px-5 py-3 text-center">Violations</th>}

                            {insColVis('oos') && <th className="px-5 py-3 text-center">OOS</th>}

                            {insColVis('result') && <th className="px-5 py-3 text-center">Result</th>}
                            <th className="px-5 py-3 text-center w-[80px]">Actions</th>
                          </tr>

                        </thead>

                        <tbody className="divide-y divide-slate-100">

                          {insPaged.length > 0 ? insPaged.map((ins: any) => (
                            <React.Fragment key={ins.id}>
                            <tr className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => setExpandedInspection(expandedInspection === ins.id ? null : ins.id)}>

                              {insColVis('date') && (<td className="px-5 py-3.5"><div className="font-semibold text-slate-900">{new Date(ins.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div></td>)}

                              {insColVis('report') && (<td className="px-5 py-3.5"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{ins.id}</code></td>)}

                              {insColVis('level') && (<td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{ins.level}</span></td>)}

                              {insColVis('state') && (<td className="px-5 py-3.5"><span className="text-sm font-medium text-slate-700">{ins.state}</span></td>)}

                              {insColVis('driver') && (<td className="px-5 py-3.5"><div className="font-medium text-slate-800">{ins.driver}</div><div className="text-xs text-slate-400">{ins.driverId}</div></td>)}

                              {insColVis('violations') && (<td className="px-5 py-3.5 text-center"><span className={cn('text-sm font-bold', ins.violations?.length > 0 ? 'text-red-600' : 'text-slate-400')}>{ins.violations?.length || 0}</span></td>)}

                              {insColVis('oos') && (<td className="px-5 py-3.5 text-center">{ins.hasOOS ? (<span className="inline-flex items-center px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold border border-red-100">YES</span>) : (<span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-50 text-slate-400 text-[10px] font-bold border border-slate-100">NO</span>)}</td>)}

                              {insColVis('result') && (<td className="px-5 py-3.5 text-center">{ins.isClean ? (<span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">CLEAN</span>) : (<span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-100">VIOLATIONS</span>)}</td>)}
                              <td className="px-5 py-3.5 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); setViewingInspection(ins); }} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100" title="View Details"><Eye size={16} /></button>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedInspection === ins.id ? 'rotate-180' : ''}`} />
                                </div>
                              </td>
                            </tr>
                            {expandedInspection === ins.id && (
                              <tr>
                                <td colSpan={9} className="px-0 py-0 bg-slate-50/70">
                                  <div className="px-6 py-4 space-y-3 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Violations ({ins.violations?.length || 0})</h4>
                                      <div className="flex items-center gap-2">
                                        {ins.hasOOS && <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">OOS</span>}
                                        <span className="text-[10px] text-slate-400 font-medium">{ins.level} | {ins.state}</span>
                                      </div>
                                    </div>
                                    {ins.violations?.length > 0 ? (
                                      <table className="w-full text-left text-sm">
                                        <thead className="bg-white/80 border-b border-slate-200">
                                          <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                            <th className="px-4 py-2">Code</th>
                                            <th className="px-4 py-2">Description</th>
                                            <th className="px-4 py-2">Category</th>
                                            <th className="px-4 py-2 text-center">Severity</th>
                                            <th className="px-4 py-2 text-center">Points</th>
                                            <th className="px-4 py-2 text-center">OOS</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {ins.violations.map((viol: any, vi: number) => (
                                            <tr key={vi} className="bg-white hover:bg-blue-50/30 transition-colors">
                                              <td className="px-4 py-2"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">{viol.code}</code></td>
                                              <td className="px-4 py-2 max-w-[250px]"><div className="text-sm font-medium text-slate-800 truncate">{viol.description}</div></td>
                                              <td className="px-4 py-2"><span className="text-xs text-slate-500">{viol.category}</span></td>
                                              <td className="px-4 py-2 text-center"><span className="text-sm font-bold text-slate-700">{viol.severity}</span></td>
                                              <td className="px-4 py-2 text-center"><span className="text-sm font-bold text-slate-700">{viol.points}</span></td>
                                              <td className="px-4 py-2 text-center">{viol.oos ? <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">YES</span> : <span className="text-[10px] text-slate-400">NO</span>}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="text-center py-4 text-sm text-emerald-600 font-medium bg-white rounded-lg border border-slate-200">Clean Inspection - No violations found</div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                            </React.Fragment>
                          )) : (

                            <tr>

                              <td colSpan={8} className="px-6 py-12 text-center text-slate-400">

                                <div className="flex flex-col items-center justify-center gap-2">

                                  <div className="p-3 bg-slate-50 rounded-full"><FileCheck size={24} className="opacity-30" /></div>

                                  <span className="text-sm font-medium">No inspections recorded for this asset</span>

                                </div>

                              </td>

                            </tr>

                          )}

                        </tbody>

                      </table>

                    </div>

                    <PaginationBar totalItems={insFiltered.length} currentPage={insPage} rowsPerPage={insRpp} onPageChange={setInsPage} onRowsPerPageChange={setInsRpp} />

                  </div>

              </div>

              );

            })()}



            {/* VIOLATION VIEW POPUP */}
            {viewingViolation && (() => {
              const v = viewingViolation;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingViolation(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-medium">Asset Profile / Violations</p>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-lg font-bold text-slate-900">Violation Detail</h2>
                          <code className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{v.id}</code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => { setViewingViolation(null); setEditingViolation(v); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"><Edit2 size={14} /> Edit</button>
                        <button onClick={() => setViewingViolation(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Violation Information</h4>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Date</p><p className="text-sm font-medium text-slate-900">{new Date(v.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Time</p><p className="text-sm font-medium text-slate-900">{v.time || '—'}</p></div>
                          <div className="col-span-2"><p className="text-[11px] text-slate-400 mb-0.5">Description</p><p className="text-sm font-medium text-slate-900">{v.violationType}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Code</p><code className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{v.violationCode}</code></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Group</p><p className="text-sm font-medium text-slate-900">{v.violationGroup}</p></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Location</h4>
                          <div className="space-y-2">
                            <div><p className="text-[11px] text-slate-400">State</p><p className="text-sm font-medium text-slate-800">{v.locationState}</p></div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Driver</h4>
                          <div className="space-y-2">
                            <div><p className="text-[11px] text-slate-400">Name</p><p className="text-sm font-medium text-slate-800">{v.driverName || '—'}</p></div>
                            <div><p className="text-[11px] text-slate-400">Type</p><p className="text-sm font-medium text-slate-800">{v.driverType || '—'}</p></div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Result & Status</h4>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"><p className="text-sm font-bold text-slate-700">{v.result}</p><p className="text-[10px] font-medium text-slate-400">Result</p></div>
                          <div className={`rounded-lg border p-2.5 text-center ${v.isOos ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}><p className="text-sm font-bold">{v.isOos ? 'YES' : 'NO'}</p><p className="text-[10px] font-medium">OOS</p></div>
                          <div className={`rounded-lg border p-2.5 text-center ${v.status === 'Open' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><p className="text-sm font-bold">{v.status}</p><p className="text-[10px] font-medium">Status</p></div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"><p className="text-sm font-bold text-slate-700">{v.fineAmount > 0 ? `$${v.fineAmount.toLocaleString()}` : '—'}</p><p className="text-[10px] font-medium text-slate-400">Fine</p></div>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setViewingViolation(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                      <button onClick={() => { setViewingViolation(null); setEditingViolation(v); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Edit Violation</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* VIOLATION EDIT POPUP */}
            {editingViolation && (() => {
              const v = editingViolation;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingViolation(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Edit2 size={16} className="text-blue-600" /></div>
                        <div>
                          <h2 className="text-base font-bold text-slate-900">Edit Violation</h2>
                          <p className="text-[11px] text-slate-400 font-medium">{v.id}</p>
                        </div>
                      </div>
                      <button onClick={() => setEditingViolation(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Violation Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Date</label><input type="date" defaultValue={v.date} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Time</label><input type="time" defaultValue={v.time} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label><input type="text" defaultValue={v.violationType} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Violation Code</label><input type="text" defaultValue={v.violationCode} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">State</label><input type="text" defaultValue={v.locationState} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Result & Fine</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Result</label><select defaultValue={v.result} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"><option value="Citation Issued">Citation Issued</option><option value="Warning">Warning</option><option value="OOS Order">OOS Order</option><option value="Clean Inspection">Clean Inspection</option></select></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label><select defaultValue={v.status} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"><option value="Open">Open</option><option value="Closed">Closed</option><option value="Under Review">Under Review</option></select></div>
                          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Fine Amount ($)</label><input type="number" min="0" defaultValue={v.fineAmount} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" /></div>
                          <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" defaultChecked={v.isOos} className="rounded border-slate-300" /><span className="text-sm font-medium text-slate-700">Out of Service</span></label></div>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setEditingViolation(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                      <button onClick={() => setEditingViolation(null)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Save Changes</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* INSPECTION VIEW POPUP */}
            {viewingInspection && (() => {
              const ins = viewingInspection;
              return (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingInspection(null)}>
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                      <div className="min-w-0">
                        <p className="text-[11px] text-slate-400 font-medium">Asset Profile / Inspections</p>
                        <div className="flex items-center gap-2 mt-1">
                          <h2 className="text-lg font-bold text-slate-900">Inspection Report</h2>
                          <code className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{ins.id}</code>
                        </div>
                      </div>
                      <button onClick={() => setViewingInspection(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Inspection Details</h4>
                        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Date</p><p className="text-sm font-medium text-slate-900">{new Date(ins.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Level</p><p className="text-sm font-medium text-slate-900">{ins.level}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">State</p><p className="text-sm font-medium text-slate-900">{ins.state}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Driver</p><p className="text-sm font-medium text-slate-900">{ins.driver}</p></div>
                          <div><p className="text-[11px] text-slate-400 mb-0.5">Vehicle</p><p className="text-sm font-medium text-slate-900">{ins.vehiclePlate} ({ins.vehicleType})</p></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">OOS Summary</h4>
                        <div className="grid grid-cols-3 gap-2">
                          <div className={`rounded-lg border p-2.5 text-center ${ins.oosSummary?.driver === 'FAILED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><p className="text-sm font-bold">{ins.oosSummary?.driver || 'PASSED'}</p><p className="text-[10px] font-medium">Driver</p></div>
                          <div className={`rounded-lg border p-2.5 text-center ${ins.oosSummary?.vehicle === 'FAILED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><p className="text-sm font-bold">{ins.oosSummary?.vehicle || 'PASSED'}</p><p className="text-[10px] font-medium">Vehicle</p></div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center"><p className="text-sm font-bold text-slate-700">{ins.oosSummary?.total || 0}</p><p className="text-[10px] font-medium text-slate-400">Total OOS</p></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Violations ({ins.violations?.length || 0})</h4>
                        {ins.violations?.length > 0 ? (
                          <div className="rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                  <th className="px-4 py-2.5">Code</th>
                                  <th className="px-4 py-2.5">Description</th>
                                  <th className="px-4 py-2.5">Category</th>
                                  <th className="px-4 py-2.5 text-center">Sev</th>
                                  <th className="px-4 py-2.5 text-center">Pts</th>
                                  <th className="px-4 py-2.5 text-center">OOS</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {ins.violations.map((viol: any, vi: number) => (
                                  <tr key={vi} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-4 py-2.5"><code className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 font-semibold">{viol.code}</code></td>
                                    <td className="px-4 py-2.5 max-w-[220px]"><div className="text-sm text-slate-800 truncate">{viol.description}</div><div className="text-[10px] text-slate-400">{viol.subDescription || ''}</div></td>
                                    <td className="px-4 py-2.5"><span className="text-xs text-slate-500">{viol.category}</span></td>
                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700">{viol.severity}</span></td>
                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700">{viol.points}</span></td>
                                    <td className="px-4 py-2.5 text-center">{viol.oos ? <span className="px-2 py-0.5 bg-red-50 text-red-700 text-[10px] font-bold rounded border border-red-100">YES</span> : <span className="text-[10px] text-slate-400">NO</span>}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-sm text-emerald-600 font-medium bg-emerald-50/50 rounded-lg border border-emerald-100">Clean Inspection - No violations recorded</div>
                        )}
                      </div>
                      {ins.units?.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Units Inspected</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {ins.units.map((unit: any, ui: number) => (
                              <div key={ui} className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-1">
                                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-slate-500 uppercase">{unit.type}</span><code className="text-[10px] font-mono bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{unit.license}</code></div>
                                <div><p className="text-[11px] text-slate-400">Make</p><p className="text-sm font-medium text-slate-800">{unit.make}</p></div>
                                <div><p className="text-[11px] text-slate-400">VIN</p><p className="text-[10px] font-mono text-slate-500">{unit.vin}</p></div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                      <button onClick={() => setViewingInspection(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Maintenance Content */}
            {activeTab === 'Maintenance' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Metrics Row — derived from this asset's actual tasks/orders */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">YTD Maintenance Spend</span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900 tabular-nums">{formatMoney(maintenanceMetrics.ytdSpend, currentVehicle.country === 'Canada' ? 'CAD' : 'USD')}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1.5">
                      Across {assetOrders.filter(o => (o.completions ?? []).length > 0).length} completed work order{assetOrders.filter(o => (o.completions ?? []).length > 0).length === 1 ? '' : 's'}
                    </div>
                  </Card>
                  <Card className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Work Orders</span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900 tabular-nums">{maintenanceMetrics.openOrders}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant={maintenanceMetrics.openOrders > 0 ? 'warning' : 'success'}>
                        {maintenanceMetrics.openOrders > 0 ? 'In progress' : 'All clear'}
                      </Badge>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overdue / Due</span>
                    <div className="mt-1.5 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-slate-900 tabular-nums">{maintenanceMetrics.overdueTasks}</span>
                      <span className="text-xs text-slate-500">overdue</span>
                      <span className="text-base font-semibold text-amber-600 tabular-nums">{maintenanceMetrics.dueTasks}</span>
                      <span className="text-xs text-slate-500">due</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant={maintenanceMetrics.overdueTasks > 0 ? 'danger' : maintenanceMetrics.dueTasks > 0 ? 'warning' : 'success'}>
                        {maintenanceMetrics.overdueTasks > 0 ? 'Action required' : maintenanceMetrics.dueTasks > 0 ? 'Schedule soon' : 'On track'}
                      </Badge>
                    </div>
                  </Card>
                  <Card className="p-4 bg-blue-50/50 border-blue-100">
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Next Service</span>
                    {maintenanceMetrics.upcomingTask ? (
                      <>
                        <div className="text-sm font-bold text-blue-900 mt-1.5 truncate">
                          {INITIAL_SERVICE_TYPES.find(s => s.id === maintenanceMetrics.upcomingTask?.serviceTypeIds[0])?.name || 'Service'}
                        </div>
                        <div className="text-xs text-blue-600 mt-1 inline-flex items-center gap-1">
                          <CalendarClock size={11} />
                          {maintenanceMetrics.upcomingTask.dueRule?.unit === 'miles'
                            ? `${(maintenanceMetrics.upcomingTask.dueRule?.dueAtOdometer ?? 0).toLocaleString()} mi`
                            : maintenanceMetrics.upcomingTask.dueRule?.unit === 'engine_hours'
                              ? `${(maintenanceMetrics.upcomingTask.dueRule?.dueAtEngineHours ?? 0).toLocaleString()} hrs`
                              : maintenanceMetrics.upcomingTask.dueRule?.dueAtDate
                                ? formatDate(maintenanceMetrics.upcomingTask.dueRule.dueAtDate)
                                : '—'}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-blue-400 font-medium mt-1.5">No upcoming service</div>
                    )}
                    {maintenanceMetrics.lastCompletion && (
                      <div className="text-[10px] text-blue-500 mt-1.5">
                        Last completed: {formatDate(maintenanceMetrics.lastCompletion.completion.completedAt)}
                      </div>
                    )}
                  </Card>
                </div>

                {/* Split View — Tasks (left) + Work Orders (right) */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {/* ─────────── Left: Maintenance Tasks ─────────── */}
                    <Card className="flex flex-col overflow-hidden border-slate-200 shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <div className="flex items-center gap-2">
                                <Wrench size={16} className="text-slate-500" />
                                <h3 className="font-bold text-slate-800 text-sm">Scheduled Maintenance Tasks</h3>
                                <Badge variant="neutral" className="ml-2">{filteredTasks.length} of {assetTasks.length}</Badge>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1.5 bg-white border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => setIsCreatingSchedule(true)}
                            >
                                <Plus size={13} /> Schedule
                            </Button>
                        </div>

                        {/* Search + Sort */}
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                            <div className="relative flex-1 min-w-0">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                    placeholder="Search service, ID…"
                                    className="w-full h-8 pl-8 pr-7 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                                />
                                {taskSearch && (
                                    <button onClick={() => setTaskSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:bg-slate-100" aria-label="Clear">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    if (taskSort === 'status') setTaskSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setTaskSort('status'); setTaskSortDir('asc'); }
                                }}
                                className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${taskSort === 'status' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                                title="Sort by status"
                            >Status {taskSort === 'status' ? (taskSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}</button>
                            <button
                                onClick={() => {
                                    if (taskSort === 'due') setTaskSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setTaskSort('due'); setTaskSortDir('asc'); }
                                }}
                                className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${taskSort === 'due' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                                title="Sort by due"
                            >Due {taskSort === 'due' ? (taskSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}</button>
                        </div>

                        {/* Status filter chips */}
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide bg-white">
                            {([
                                { id: 'all',         label: 'All' },
                                { id: 'overdue',     label: 'Overdue' },
                                { id: 'due',         label: 'Due' },
                                { id: 'in_progress', label: 'In progress' },
                                { id: 'upcoming',    label: 'Upcoming' },
                                { id: 'completed',   label: 'Completed' },
                            ] as Array<{ id: TaskStatusFilter; label: string }>).map(chip => {
                                const active = taskStatusFilter === chip.id;
                                const count = (taskStatusCounts as Record<string, number>)[chip.id] ?? 0;
                                return (
                                    <button
                                        key={chip.id}
                                        onClick={() => setTaskStatusFilter(chip.id)}
                                        className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {chip.label}
                                        <span className={`tabular-nums ${active ? 'opacity-90' : 'text-slate-400'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Task table — same column shape as the central
                            AssetMaintenancePage (Task Name · Order # · Due At
                            · Status), trimmed to remove the Asset / Asset
                            Type columns since the whole page is already
                            scoped to a single asset. */}
                        <div className="bg-white overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold">Task Name</th>
                                        <th className="px-4 py-2.5 font-semibold">Order #</th>
                                        <th className="px-4 py-2.5 font-semibold">Due At</th>
                                        <th className="px-4 py-2.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pagedTasks.length > 0 ? pagedTasks.map(task => {
                                        const serviceNames = task.serviceTypeIds
                                            .map(sid => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name)
                                            .filter(Boolean)
                                            .join(', ');
                                        const associatedOrder = assetOrders.find(o => o.taskIds.includes(task.id));
                                        const statusVariant =
                                            task.status === 'overdue'     ? 'danger'  :
                                            task.status === 'due'         ? 'warning' :
                                            task.status === 'in_progress' ? 'Drafted' :
                                            task.status === 'completed'   ? 'success' : 'neutral';

                                        // Format the "due at" cell: meter / hours / date
                                        // depending on the task's due rule.
                                        let dueAtPrimary = '—';
                                        let dueAtSecondary: string | null = null;
                                        const dueRule = task.dueRule;
                                        if (dueRule) {
                                            if (dueRule.unit === 'miles' && dueRule.dueAtOdometer != null) {
                                                dueAtPrimary = `${dueRule.dueAtOdometer.toLocaleString()} mi`;
                                                const remaining = dueRule.dueAtOdometer - task.meterSnapshot.odometer;
                                                if (task.status !== 'completed' && task.status !== 'cancelled') {
                                                    dueAtSecondary = remaining >= 0
                                                        ? `${remaining.toLocaleString()} mi remaining`
                                                        : `${Math.abs(remaining).toLocaleString()} mi past due`;
                                                }
                                            } else if (dueRule.unit === 'engine_hours' && dueRule.dueAtEngineHours != null) {
                                                dueAtPrimary = `${dueRule.dueAtEngineHours.toLocaleString()} hrs`;
                                                const remaining = dueRule.dueAtEngineHours - task.meterSnapshot.engineHours;
                                                if (task.status !== 'completed' && task.status !== 'cancelled') {
                                                    dueAtSecondary = remaining >= 0
                                                        ? `${remaining.toLocaleString()} hrs remaining`
                                                        : `${Math.abs(remaining).toLocaleString()} hrs past due`;
                                                }
                                            } else if (dueRule.dueAtDate) {
                                                dueAtPrimary = formatDate(dueRule.dueAtDate);
                                                if (task.status !== 'completed' && task.status !== 'cancelled') {
                                                    const days = Math.round((new Date(dueRule.dueAtDate).getTime() - Date.now()) / 86_400_000);
                                                    dueAtSecondary = days >= 0 ? `${days} days remaining` : `${Math.abs(days)} days past due`;
                                                }
                                            }
                                        }

                                        return (
                                            <tr key={task.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="text-slate-900 font-medium truncate max-w-[320px]" title={serviceNames || 'Service'}>
                                                        {serviceNames || 'Service'}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">{task.id}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    {associatedOrder
                                                        ? <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded">#{associatedOrder.id.slice(-6).toUpperCase()}</span>
                                                        : <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {dueRule ? (
                                                        <>
                                                            <div className="font-medium text-slate-900">{dueAtPrimary}</div>
                                                            {dueAtSecondary && (
                                                                <div className={`text-[11px] mt-0.5 ${task.status === 'overdue' ? 'text-red-600' : task.status === 'due' ? 'text-amber-600' : 'text-slate-500'}`}>
                                                                    {dueAtSecondary}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">No schedule</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={statusVariant}>{task.status.replace('_', ' ')}</Badge>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <ShieldCheck size={36} className="mb-2 opacity-25" />
                                                    <span className="text-sm font-semibold text-slate-600">
                                                        {assetTasks.length === 0 ? 'No tasks scheduled' : 'No tasks match the filter'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 mt-1">
                                                        {assetTasks.length === 0
                                                            ? 'Schedule the first preventive task for this asset.'
                                                            : 'Try clearing the search or selecting a different status.'}
                                                    </span>
                                                    {(taskStatusFilter !== 'all' || taskSearch) && (
                                                        <button
                                                            onClick={() => { setTaskSearch(''); setTaskStatusFilter('all'); }}
                                                            className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                                        >
                                                            Clear filters
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination — default 5 rows; selectable 5/10/20/50 */}
                        {filteredTasks.length > 0 && (
                            <PaginationBar
                                totalItems={filteredTasks.length}
                                currentPage={taskPage}
                                rowsPerPage={taskRowsPerPage}
                                onPageChange={setTaskPage}
                                onRowsPerPageChange={(rows) => {
                                    setTaskRowsPerPage(rows);
                                    setTaskPage(1);
                                }}
                            />
                        )}
                    </Card>

                    {/* ─────────── Right: Work Orders ─────────── */}
                    <Card className="flex flex-col overflow-hidden border-slate-200 shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-slate-500" />
                                <h3 className="font-bold text-slate-800 text-sm">Work Orders</h3>
                                <Badge variant="neutral" className="ml-2">{filteredOrders.length} of {assetOrders.length}</Badge>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIsCreateOrderModalOpen(true)}
                                className="gap-1.5 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                            >
                                <Plus size={13}/> Add Work Order
                            </Button>
                        </div>

                        {/* Search + Sort */}
                        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                            <div className="relative flex-1 min-w-0">
                                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={orderSearch}
                                    onChange={(e) => setOrderSearch(e.target.value)}
                                    placeholder="Search WO #, vendor, notes…"
                                    className="w-full h-8 pl-8 pr-7 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                                />
                                {orderSearch && (
                                    <button onClick={() => setOrderSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:bg-slate-100" aria-label="Clear">
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    if (orderSort === 'created') setOrderSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setOrderSort('created'); setOrderSortDir('desc'); }
                                }}
                                className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${orderSort === 'created' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                                title="Sort by created date"
                            >Created {orderSort === 'created' ? (orderSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}</button>
                            <button
                                onClick={() => {
                                    if (orderSort === 'due') setOrderSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setOrderSort('due'); setOrderSortDir('asc'); }
                                }}
                                className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${orderSort === 'due' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                                title="Sort by due date"
                            >Due {orderSort === 'due' ? (orderSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}</button>
                        </div>

                        {/* Status filter chips */}
                        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide bg-white">
                            {([
                                { id: 'all',       label: 'All' },
                                { id: 'open',      label: 'Open' },
                                { id: 'completed', label: 'Completed' },
                                { id: 'cancelled', label: 'Cancelled' },
                            ] as Array<{ id: OrderStatusFilter; label: string }>).map(chip => {
                                const active = orderStatusFilter === chip.id;
                                const count = (orderStatusCounts as Record<string, number>)[chip.id] ?? 0;
                                return (
                                    <button
                                        key={chip.id}
                                        onClick={() => setOrderStatusFilter(chip.id)}
                                        className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                                    >
                                        {chip.label}
                                        <span className={`tabular-nums ${active ? 'opacity-90' : 'text-slate-400'}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Work Orders table — same column shape as the
                            central AssetMaintenancePage (Order # · Vendor ·
                            Tasks · Progress · Created · Due · Status), trimmed
                            to drop the Assets column since the page is already
                            scoped to one asset. */}
                        <div className="bg-white overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-2.5 font-semibold">Order #</th>
                                        <th className="px-4 py-2.5 font-semibold">Vendor</th>
                                        <th className="px-4 py-2.5 font-semibold">Tasks</th>
                                        <th className="px-4 py-2.5 font-semibold">Progress</th>
                                        <th className="px-4 py-2.5 font-semibold">Created</th>
                                        <th className="px-4 py-2.5 font-semibold">Due</th>
                                        <th className="px-4 py-2.5 font-semibold">Total</th>
                                        <th className="px-4 py-2.5 font-semibold">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pagedOrders.length > 0 ? pagedOrders.map(order => {
                                        const vendor = vendors.find((v: any) => v.id === order.vendorId);
                                        const lastCompletion = (order.completions ?? []).slice(-1)[0];
                                        const orderTotal = lastCompletion?.assetBreakdowns?.find(b => b.assetId === asset.id)?.costs?.totalPaid ?? 0;
                                        const currency = lastCompletion?.currency ?? (currentVehicle.country === 'Canada' ? 'CAD' : 'USD');
                                        // Resolve tasks attached to this order to compute progress + service names.
                                        const orderTasks = INITIAL_TASKS.filter(t => order.taskIds.includes(t.id));
                                        const completedCount = orderTasks.filter(t => t.status === 'completed').length;
                                        const totalCount = orderTasks.length;
                                        const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                                        const serviceNames = orderTasks
                                            .map(t => INITIAL_SERVICE_TYPES.find(s => s.id === t.serviceTypeIds[0])?.name)
                                            .filter(Boolean)
                                            .join(', ');
                                        return (
                                            <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs">
                                                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                                                        #{order.id.slice(-6).toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 max-w-[180px] truncate" title={vendor?.companyName ?? ''}>
                                                    {vendor?.companyName ?? <span className="text-slate-400">Unassigned</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-slate-900 font-medium">{totalCount} task{totalCount === 1 ? '' : 's'}</div>
                                                    {serviceNames && (
                                                        <div className="text-[11px] text-slate-500 truncate max-w-[200px]" title={serviceNames}>
                                                            {serviceNames}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 bg-slate-100 rounded-full w-20 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[11px] font-medium text-slate-500 tabular-nums">{progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                                                    {formatDate(order.createdAt)}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                                                    {order.dueDate ? formatDate(order.dueDate) : <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 font-semibold tabular-nums whitespace-nowrap">
                                                    {orderTotal > 0
                                                        ? formatMoney(orderTotal, currency as 'USD' | 'CAD')
                                                        : <span className="text-slate-400 font-normal">—</span>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'neutral' : 'Drafted'}>
                                                        {order.status}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={8} className="px-4 py-12 text-center">
                                                <div className="flex flex-col items-center justify-center text-slate-400">
                                                    <FileText size={36} className="mb-2 opacity-25" />
                                                    <span className="text-sm font-semibold text-slate-600">
                                                        {assetOrders.length === 0 ? 'No work orders' : 'No work orders match the filter'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 mt-1">
                                                        {assetOrders.length === 0
                                                            ? 'Create a work order from one or more scheduled tasks.'
                                                            : 'Try clearing the search or selecting a different status.'}
                                                    </span>
                                                    {(orderStatusFilter !== 'all' || orderSearch) && (
                                                        <button
                                                            onClick={() => { setOrderSearch(''); setOrderStatusFilter('all'); }}
                                                            className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                                        >
                                                            Clear filters
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination — default 5 rows; selectable 5/10/20/50 */}
                        {filteredOrders.length > 0 && (
                            <PaginationBar
                                totalItems={filteredOrders.length}
                                currentPage={orderPage}
                                rowsPerPage={orderRowsPerPage}
                                onPageChange={setOrderPage}
                                onRowsPerPageChange={(rows) => {
                                    setOrderRowsPerPage(rows);
                                    setOrderPage(1);
                                }}
                            />
                        )}
                    </Card>
                </div>
              </div>
            )}

            {/* Inventory Content — same shape as Maintenance: header card
                with title, search + sort row, status chips, table, and the
                shared PaginationBar. */}
            {activeTab === 'Inventory' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="flex flex-col overflow-hidden border-slate-200 shadow-sm">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-2">
                      <Boxes size={16} className="text-slate-500" />
                      <h3 className="font-bold text-slate-800 text-sm">Inventory Records</h3>
                      <Badge variant="neutral" className="ml-2">
                        {filteredInventory.length} of {inventoryRecords.length}
                      </Badge>
                    </div>
                  </div>

                  {/* Search + Sort row */}
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={invSearch}
                        onChange={(e) => setInvSearch(e.target.value)}
                        placeholder="Search vendor, serial, PIN…"
                        className="w-full h-8 pl-8 pr-7 rounded-md border border-slate-200 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      />
                      {invSearch && (
                        <button
                          onClick={() => setInvSearch('')}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:bg-slate-100"
                          aria-label="Clear"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        if (invSort === 'expiry') setInvSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setInvSort('expiry'); setInvSortDir('asc'); }
                      }}
                      className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${invSort === 'expiry' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                      title="Sort by expiry"
                    >
                      Expiry {invSort === 'expiry' ? (invSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}
                    </button>
                    <button
                      onClick={() => {
                        if (invSort === 'vendor') setInvSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setInvSort('vendor'); setInvSortDir('asc'); }
                      }}
                      className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${invSort === 'vendor' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                      title="Sort by vendor"
                    >
                      Vendor {invSort === 'vendor' ? (invSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}
                    </button>
                    <button
                      onClick={() => {
                        if (invSort === 'issue') setInvSortDir(d => d === 'asc' ? 'desc' : 'asc');
                        else { setInvSort('issue'); setInvSortDir('desc'); }
                      }}
                      className={`h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs font-medium ${invSort === 'issue' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'}`}
                      title="Sort by issue date"
                    >
                      Issued {invSort === 'issue' ? (invSortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : <ArrowUpDown size={11} className="text-slate-300" />}
                    </button>
                  </div>

                  {/* Status filter chips */}
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-hide bg-white">
                    {([
                      { id: 'all',            label: 'All' },
                      { id: 'Active',         label: 'Active' },
                      { id: 'Expiring Soon',  label: 'Expiring Soon' },
                      { id: 'Expired',        label: 'Expired' },
                    ] as Array<{ id: InventoryStatusFilter; label: string }>).map(chip => {
                      const active = invStatusFilter === chip.id;
                      const count = invStatusCounts[chip.id] ?? 0;
                      return (
                        <button
                          key={chip.id}
                          onClick={() => setInvStatusFilter(chip.id)}
                          className={`shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-semibold transition-colors border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                          {chip.label}
                          <span className={`tabular-nums ${active ? 'opacity-90' : 'text-slate-400'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Table */}
                  <div className="bg-white overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-[11px] text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Vendor</th>
                          <th className="px-4 py-2.5 font-semibold">Type</th>
                          <th className="px-4 py-2.5 font-semibold">Serial #</th>
                          <th className="px-4 py-2.5 font-semibold">PIN #</th>
                          <th className="px-4 py-2.5 font-semibold">Issue Date</th>
                          <th className="px-4 py-2.5 font-semibold">Expiry Date</th>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pagedInventory.length > 0 ? pagedInventory.map((it) => {
                          const vendor = getVendorById(it.vendorId);
                          const statusClass =
                            it.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            it.status === 'Expiring Soon' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-red-50 text-red-700 border-red-200';
                          const dotClass =
                            it.status === 'Active' ? 'bg-emerald-500' :
                            it.status === 'Expiring Soon' ? 'bg-amber-500' :
                            'bg-red-500';
                          return (
                            <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-900">{vendor?.name ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{vendor ? getCategoryLabel(vendor.categoryId, VENDOR_CATEGORIES) : '—'}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-700">{it.serial}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-700">{it.pin}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{it.issueDate}</td>
                              <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{it.expiryDate}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}>
                                  <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dotClass}`} />
                                  {it.status}
                                </span>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-12 text-center">
                              <div className="flex flex-col items-center justify-center text-slate-400">
                                <Boxes size={36} className="mb-2 opacity-25" />
                                <span className="text-sm font-semibold text-slate-600">
                                  {inventoryRecords.length === 0 ? 'No inventory assigned' : 'No inventory matches the filter'}
                                </span>
                                <span className="text-xs text-slate-400 mt-1">
                                  {inventoryRecords.length === 0
                                    ? 'No fuel cards, transponders, ELDs, GPS, or dashcams on file.'
                                    : 'Try clearing the search or selecting a different status.'}
                                </span>
                                {(invStatusFilter !== 'all' || invSearch) && (
                                  <button
                                    onClick={() => { setInvSearch(''); setInvStatusFilter('all'); }}
                                    className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                  >
                                    Clear filters
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination — default 5 rows; selectable 5/10/20/50 */}
                  {filteredInventory.length > 0 && (
                    <PaginationBar
                      totalItems={filteredInventory.length}
                      currentPage={invPage}
                      rowsPerPage={invRowsPerPage}
                      onPageChange={setInvPage}
                      onRowsPerPageChange={(rows) => {
                        setInvRowsPerPage(rows);
                        setInvPage(1);
                      }}
                    />
                  )}
                </Card>
              </div>
            )}

            {/* Expenses Content */}
            {activeTab === 'Expenses' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Expense History</h3>
                      <p className="text-xs font-medium text-slate-500">Track operating costs, recurring fees, and maintenance expenses</p>
                    </div>
                    <Button onClick={() => { setIsExpenseModalOpen(true); setEditingExpense(null); }} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200">
                       <Plus size={14} /> Add Expense
                    </Button>
                  </div>

                  <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-xs font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Expense Type</th>
                            <th className="px-6 py-4">Category</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Recurrence</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {mergedExpenses.length > 0 ? mergedExpenses.map((expense) => {
                             const type = INITIAL_EXPENSE_TYPES.find(t => t.id === expense.expenseTypeId);
                             return (
                               <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-slate-900">
                                   {new Date(expense.date).toLocaleDateString()}
                                 </td>
                                 <td className="px-6 py-4">
                                   <div className="flex items-center gap-2">
                                     {expense.source === 'maintenance' ? (
                                        <Badge variant="Maintenance">Maintenance</Badge>
                                     ) : (
                                        <span className="font-semibold text-slate-700">{type?.name || 'Unknown'}</span>
                                     )}
                                   </div>
                                   {expense.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{expense.notes}</p>}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500">
                                    {type?.category || '-'}
                                 </td>
                                 <td className="px-6 py-4 font-bold text-slate-900">
                                   {new Intl.NumberFormat('en-US', { style: 'currency', currency: expense.currency || 'USD' }).format(expense.amount)}
                                 </td>
                                 <td className="px-6 py-4 text-slate-500 text-xs">
                                   {expense.isRecurring ? (
                                      <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1.5 text-purple-600 font-medium">
                                            <Clock size={12} /> {expense.frequency}
                                          </div>
                                          {expense.recurrenceEndDate && (
                                              <span className="text-[10px] text-purple-400">Ends: {new Date(expense.recurrenceEndDate).toLocaleDateString()}</span>
                                          )}
                                      </div>
                                   ) : '-'}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                   {expense.source === 'maintenance' ? (
                                      <Button variant="ghost" size="xs" className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        View Order
                                      </Button>
                                   ) : (
                                      <div className="flex justify-end gap-1">
                                         <button onClick={() => { setEditingExpense(expense); setIsExpenseModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                           <Edit2 size={14} />
                                         </button>
                                         <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                           <Trash2 size={14} />
                                         </button>
                                      </div>
                                   )}
                                 </td>
                               </tr>
                             );
                          }) : (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-slate-50 rounded-full"><DollarSign size={24} className="opacity-30" /></div>
                                    <span className="text-sm font-medium">No expenses recorded</span>
                                  </div>
                                </td>
                              </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
              </div>
            )}

            {/* Documents Content */}
            {activeTab === 'Documents' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Asset Documents</h3>
                      <p className="text-xs font-medium text-slate-500">Manage registration, insurance, and other asset-related files</p>
                    </div>
                     <Button onClick={() => { setEditingDocument({ id: 'new', documentType: '', documentName: '', hasUpload: false }); }} size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200">
                        <UploadCloud size={14} /> Upload Document
                    </Button>
                  </div>

                  <Card className="overflow-hidden border-slate-200 shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-xs font-bold text-slate-500">
                          <tr>
                            <th className="px-6 py-4">Document Type</th>

                            <th className="px-6 py-4">Folder</th>
                            <th className="px-6 py-4">Date Uploaded</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Expiry</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {assetDocuments.length > 0 ? assetDocuments.map((doc) => (
                               <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                                 <td className="px-6 py-4">
                                     <div>
                                         <div className="font-medium text-slate-900">{doc.documentType}</div>
                                         {doc.linkedKeyNumber && (
                                             <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                                 <FileKey className="w-3 h-3" /> Related to: {doc.linkedKeyNumber}
                                             </div>
                                         )}
                                         {doc.linkedModule === 'fuel_purchases' && (
                                             <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1 font-medium">
                                                 ⛽ Part of Fuel Purchases — cannot be deleted
                                             </div>
                                         )}
                                     </div>
                                 </td>

                                 <td className="px-6 py-4 text-slate-500 text-xs">{doc.folderPath}</td>
                                 <td className="px-6 py-4 text-slate-500">{doc.dateUploaded}</td>
                                 <td className="px-6 py-4">
                                     <Badge variant={doc.status === 'Active' ? 'success' : doc.status === 'Expired' ? 'danger' : 'warning'}>{doc.status}</Badge>
                                 </td>
                                 <td className="px-6 py-4 text-slate-500">{doc.expiryDate}</td>
                                 <td className="px-6 py-4 text-right">
                                      <div className="flex justify-end gap-1">
                                         {doc.hasUpload && (
                                            <button onClick={() => setViewingDocument(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="View">
                                               <FileDown size={14} />
                                            </button>
                                         )}
                                         <button onClick={() => setEditingDocument(doc)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                           <Edit2 size={14} />
                                         </button>
                                         {doc.hasUpload && (
                                            <button 
                                                onClick={() => setDeletingDocument(doc)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Delete"
                                            >
                                               <Trash2 size={14} />
                                            </button>
                                         )}
                                      </div>
                                 </td>
                               </tr>
                          )) : (
                              <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-slate-50 rounded-full"><FileText size={24} className="opacity-30" /></div>
                                    <span className="text-sm font-medium">No documents uploaded</span>
                                  </div>
                                </td>
                              </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
              </div>
            )}

            {/* Notifications — cross-cutting alert center. Aggregates the
                items the asset's owner needs to act on across compliance,
                maintenance, and safety. Each row links back to the tab where
                the underlying record lives. */}
            {activeTab === 'Notifications' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Action Required</h3>
                    <p className="text-xs font-medium text-slate-500">
                      {assetAlerts.length === 0
                        ? "Nothing needs attention right now."
                        : `${assetAlerts.length} alert${assetAlerts.length === 1 ? '' : 's'} across compliance, maintenance, and safety.`}
                    </p>
                  </div>
                </div>

                {assetAlerts.length === 0 ? (
                  <Card className="overflow-hidden">
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <ShieldCheck size={24} />
                      </div>
                      <div className="text-sm font-semibold text-slate-900">All clear</div>
                      <div className="text-xs text-slate-500 mt-1 max-w-sm">
                        No expiring documents, overdue maintenance, or pending compliance items for this asset.
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card className="overflow-hidden">
                    <ul className="divide-y divide-slate-100">
                      {assetAlerts.map((a, i) => {
                        const sev = a.severity === 'high'
                          ? { dot: 'bg-rose-500', pillBg: 'bg-rose-50', pillFg: 'text-rose-700', pillBorder: 'border-rose-200', label: 'High' }
                          : a.severity === 'medium'
                            ? { dot: 'bg-amber-500', pillBg: 'bg-amber-50', pillFg: 'text-amber-700', pillBorder: 'border-amber-200', label: 'Medium' }
                            : { dot: 'bg-slate-400', pillBg: 'bg-slate-50', pillFg: 'text-slate-600', pillBorder: 'border-slate-200', label: 'Low' };
                        return (
                          <li key={i} className="px-5 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors">
                            <div className="flex items-center gap-2 shrink-0 pt-0.5">
                              <span className={`h-2 w-2 rounded-full ${sev.dot}`}></span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${sev.pillBg} ${sev.pillFg} ${sev.pillBorder}`}>
                                  {sev.label}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{a.category}</span>
                              </div>
                              <div className="text-sm font-semibold text-slate-900 mt-1">{a.title}</div>
                              {a.detail && (
                                <div className="text-xs text-slate-500 mt-0.5">{a.detail}</div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab(a.tabTarget)}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 shrink-0 self-center"
                            >
                              Open {a.tabTarget} <ChevronRight size={12} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                )}
              </div>
            )}
        </div>

        {/* ACCIDENT DETAIL POPUP */}
        {viewingAccident && (() => {
          const inc = viewingAccident;
          const fmtDT = (d: string) => d ? new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
          const fmtCur = (v: number) => v != null ? `$${v.toLocaleString()}` : '—';
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewingAccident(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-400 font-medium">Asset Profile / Accidents</p>
                    <div className="flex items-center gap-2 mt-1">
                      <h2 className="text-lg font-bold text-slate-900">Crash Report</h2>
                      <code className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 font-semibold">{inc.incidentId}</code>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Details of the event, vehicle, and driver information.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { setViewingAccident(null); setEditingAccident(inc); }} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setViewingAccident(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                      <X className="w-4 h-4 text-slate-500" />
                    </button>
                  </div>
                </div>
                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  {/* Location Map Placeholder */}
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 h-[80px] flex items-center justify-center">
                    <div className="text-center text-slate-400 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <p className="text-xs font-medium">{inc.location?.full}</p>
                    </div>
                  </div>
                  {/* Event Details */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Event Details</h4>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                      <div><p className="text-[11px] text-slate-400 mb-0.5">Timestamp</p><p className="text-sm font-medium text-slate-900">{fmtDT(inc.occurredAt)}</p></div>
                      <div><p className="text-[11px] text-slate-400 mb-0.5">Accident Type</p><p className="text-sm font-medium text-slate-900">{inc.cause?.incidentType || '—'}</p></div>
                      <div className="col-span-2"><p className="text-[11px] text-slate-400 mb-0.5">Address</p><p className="text-sm font-medium text-slate-900">{inc.location?.full || '—'}</p></div>
                      <div><p className="text-[11px] text-slate-400 mb-0.5">Primary Cause</p><p className="text-sm font-medium text-slate-900">{inc.cause?.primaryCause || '—'}</p></div>
                      <div><p className="text-[11px] text-slate-400 mb-0.5">Location Type</p><p className="text-sm font-medium text-slate-900">{inc.location?.locationType || '—'}</p></div>
                      <div>
                        <p className="text-[11px] text-slate-400 mb-1">Preventability</p>
                        <Badge variant={inc.preventability?.value === 'preventable' ? 'danger' : inc.preventability?.value === 'non_preventable' ? 'success' : 'pending'}>
                          {inc.preventability?.value === 'preventable' ? 'Preventable' : inc.preventability?.value === 'non_preventable' ? 'Non-Preventable' : 'TBD'}
                        </Badge>
                      </div>
                      <div><p className="text-[11px] text-slate-400 mb-0.5">FMCSA Reportable</p><p className="text-sm font-medium text-slate-900">{inc.classification?.fmcsaReportable ? 'Yes' : 'No'}</p></div>
                    </div>
                  </div>
                  {/* Vehicles + Driver side by side */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Vehicles</h4>
                      {(inc.vehicles || []).map((veh: any, vi: number) => (
                        <div key={vi} className="space-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{inc.vehicles.length > 1 ? `Vehicle ${vi + 1}` : 'Vehicle'}</span>
                            {veh.assetId && <code className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{veh.assetId}</code>}
                          </div>
                          <div className="space-y-1.5">
                            <div><p className="text-[11px] text-slate-400">Make / Model</p><p className="text-sm font-medium text-slate-800">{veh.make} {veh.model} ({veh.year})</p></div>
                            <div><p className="text-[11px] text-slate-400">Type</p><p className="text-sm font-medium text-slate-800">{veh.vehicleType}</p></div>
                            <div><p className="text-[11px] text-slate-400">VIN</p><p className="text-xs font-mono text-slate-600">{veh.vin}</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Driver at Time of Incident</h4>
                      <div className="space-y-1.5">
                        <div><p className="text-[11px] text-slate-400">Name</p><p className="text-sm font-medium text-slate-800">{inc.driver?.name}</p></div>
                        <div><p className="text-[11px] text-slate-400">Type</p><p className="text-sm font-medium text-slate-800">{inc.driver?.driverType}</p></div>
                        <div><p className="text-[11px] text-slate-400">Experience</p><p className="text-sm font-medium text-slate-800">{inc.driver?.drivingExperience}</p></div>
                        <div><p className="text-[11px] text-slate-400">Hrs Driving / On Duty</p><p className="text-sm font-medium text-slate-800">{inc.driver?.hrsDriving}h / {inc.driver?.hrsOnDuty}h</p></div>
                      </div>
                    </div>
                  </div>
                  {/* Severity & Costs */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Severity & Costs</h4>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {[
                        { label: 'Fatalities', value: inc.severity?.fatalities, bad: inc.severity?.fatalities > 0 },
                        { label: 'Injuries', value: inc.severity?.injuriesNonFatal, bad: inc.severity?.injuriesNonFatal > 0 },
                        { label: 'Tow Away', value: inc.severity?.towAway ? 'Yes' : 'No', bad: inc.severity?.towAway },
                        { label: 'HAZMAT', value: inc.severity?.hazmatReleased ? 'Yes' : 'No', bad: inc.severity?.hazmatReleased },
                      ].map((s, i) => (
                        <div key={i} className={cn('rounded-lg border p-2.5 text-center', s.bad ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>
                          <p className="text-base font-bold">{s.value}</p>
                          <p className="text-[10px] font-medium">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                      <div><p className="text-[11px] text-slate-400">Company Costs</p><p className="text-sm font-semibold text-slate-900">{fmtCur(inc.costs?.companyCostsFromDollarOne)}</p></div>
                      <div><p className="text-[11px] text-slate-400">Insurance Paid</p><p className="text-sm font-semibold text-slate-900">{fmtCur(inc.costs?.insuranceCostsPaid)}</p></div>
                      <div><p className="text-[11px] text-slate-400">Insurance Reserves</p><p className="text-sm font-semibold text-slate-900">{fmtCur(inc.costs?.insuranceReserves)}</p></div>
                      <div><p className="text-[11px] text-slate-400">Total Costs</p><p className="text-sm font-bold text-blue-700">{fmtCur(inc.costs?.totalAccidentCosts)}</p></div>
                    </div>
                  </div>
                  {/* Road & Conditions */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Road & Conditions</h4>
                    <div className="grid grid-cols-3 gap-x-5 gap-y-2">
                      <div><p className="text-[11px] text-slate-400">Road Type</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.roadType}</p></div>
                      <div><p className="text-[11px] text-slate-400">Weather</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.weatherConditions}</p></div>
                      <div><p className="text-[11px] text-slate-400">Road Surface</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.roadConditions}</p></div>
                      <div><p className="text-[11px] text-slate-400">Speed Limit</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.postedSpeedLimitKmh} km/h</p></div>
                      <div><p className="text-[11px] text-slate-400">Terrain</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.terrain}</p></div>
                      <div><p className="text-[11px] text-slate-400">Light</p><p className="text-sm font-medium text-slate-800">{inc.roadway?.light}</p></div>
                    </div>
                  </div>
                  {/* Follow Up */}
                  {(inc.followUp?.action || inc.followUp?.comments) && (
                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Follow Up</h4>
                      <div className="space-y-2">
                        {inc.followUp?.action && <div><p className="text-[11px] text-slate-400">Action</p><p className="text-sm font-medium text-slate-800">{inc.followUp.action}</p></div>}
                        {inc.followUp?.comments && <div><p className="text-[11px] text-slate-400">Comments</p><p className="text-sm font-medium text-slate-800">{inc.followUp.comments}</p></div>}
                      </div>
                    </div>
                  )}
                </div>
                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                  <button onClick={() => setViewingAccident(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                  <button onClick={() => { setViewingAccident(null); setEditingAccident(inc); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Edit Accident</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ACCIDENT EDIT POPUP */}
        {editingAccident && (() => {
          return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setEditingAccident(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Edit Accident</h2>
                      <p className="text-[11px] text-slate-400 font-medium">{editingAccident.incidentId}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingAccident(null)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                {/* Scrollable form body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Event Details Section */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Event Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Date & Time of Loss</label>
                        <input type="datetime-local" defaultValue={editingAccident.occurredAt?.slice(0, 16)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Accident Type</label>
                        <select defaultValue={editingAccident.cause?.incidentType} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all">
                          {['Rear-end collision', 'Intersection collision', 'Single vehicle runoff', 'Sideswipe - same direction', 'Sideswipe - opposite direction', 'Backing into structure', 'Load shift / spill', 'Tire blowout / rollover', 'Tire blowout', 'Head-on Collision', 'Pedestrian', 'Animal Strike', 'Equipment Fire'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Primary Cause</label>
                        <select defaultValue={editingAccident.cause?.primaryCause} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all">
                          {['Unsafe Behaviour', 'Mechanical Failure', 'Third Party', 'Weather', 'Fatigue', 'Load Securement', 'Road Conditions', 'Unknown'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Insurance Claim #</label>
                        <input type="text" defaultValue={editingAccident.insuranceClaimNumber} placeholder="e.g. CLM-9943201" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                  {/* Location Section */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Location</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Street Address</label>
                        <input type="text" defaultValue={editingAccident.location?.streetAddress} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">City</label>
                        <input type="text" defaultValue={editingAccident.location?.city} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">State / Province</label>
                        <input type="text" defaultValue={editingAccident.location?.stateOrProvince} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Country</label>
                        <input type="text" defaultValue={editingAccident.location?.country} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Zip / Postal</label>
                        <input type="text" defaultValue={editingAccident.location?.zip} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                  {/* Severity */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Severity</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Fatalities</label>
                        <input type="number" min="0" defaultValue={editingAccident.severity?.fatalities} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Injuries (Non-Fatal)</label>
                        <input type="number" min="0" defaultValue={editingAccident.severity?.injuriesNonFatal} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Vehicles Towed</label>
                        <input type="number" min="0" defaultValue={editingAccident.severity?.vehiclesTowed} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Preventability</label>
                        <select defaultValue={editingAccident.preventability?.value} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all">
                          <option value="tbd">TBD</option>
                          <option value="preventable">Preventable</option>
                          <option value="non_preventable">Non-Preventable</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  {/* Costs */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Costs</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Company Costs ($)</label>
                        <input type="number" min="0" defaultValue={editingAccident.costs?.companyCostsFromDollarOne} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Insurance Paid ($)</label>
                        <input type="number" min="0" defaultValue={editingAccident.costs?.insuranceCostsPaid} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Insurance Reserves ($)</label>
                        <input type="number" min="0" defaultValue={editingAccident.costs?.insuranceReserves} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Total Cost ($)</label>
                        <input type="number" min="0" defaultValue={editingAccident.costs?.totalAccidentCosts} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-50 text-slate-500 transition-all" disabled />
                      </div>
                    </div>
                  </div>
                  {/* Follow Up */}
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">Follow Up</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Action Taken</label>
                        <textarea defaultValue={editingAccident.followUp?.action} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1.5">Comments</label>
                        <textarea defaultValue={editingAccident.followUp?.comments} rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Footer */}
                <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 flex-shrink-0">
                  <button onClick={() => setEditingAccident(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={() => setEditingAccident(null)} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all">Save Changes</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Modals placed outside main layout */}
        <AddExpenseModal 
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSave={handleSaveExpense}
          assetId={asset?.id}
        />

        {/* Document Edit Modal */}
        {editingDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{editingDocument.id === 'new' ? 'Upload Document' : 'Edit Document'}</h2>
                            <p className="text-sm text-slate-500">{editingDocument.documentType || 'New Document'}</p>
                        </div>
                        <button onClick={() => setEditingDocument(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">
                        <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
                                    <input type="text" defaultValue={editingDocument.documentType} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm" placeholder="e.g. Registration" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                                    <input type="date" defaultValue={editingDocument.expiryDate !== 'Not set' ? editingDocument.expiryDate : ''} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm" />
                                </div>
                        </div>
                        {/* Issuing Country & State */}
                        {(editingDocument.docTypeData?.issueCountryRequired || editingDocument.docTypeData?.issueStateRequired) && (
                            <div className="grid grid-cols-2 gap-4">
                                {editingDocument.docTypeData?.issueCountryRequired && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Issuing Country <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            value={docIssuingCountry}
                                            onChange={(e) => {
                                                setDocIssuingCountry(e.target.value);
                                                setDocIssuingState('');
                                            }}
                                        >
                                            <option value="">Select country...</option>
                                            <option value="United States">United States</option>
                                            <option value="Canada">Canada</option>
                                        </select>
                                    </div>
                                )}
                                {editingDocument.docTypeData?.issueStateRequired && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Issuing State / Province <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                            value={docIssuingState}
                                            onChange={(e) => setDocIssuingState(e.target.value)}
                                        >
                                            <option value="">Select state / province...</option>
                                            {(docIssuingCountry === 'Canada' ? CA_PROVINCES : US_STATES).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                            <input 
                                id="asset-doc-upload" 
                                type="file" 
                                multiple 
                                className="hidden" 
                                accept=".pdf,.doc,.docx,.jpg,.png"
                                onChange={(e) => {
                                    if (e.target.files) {
                                        setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }
                                    e.target.value = '';
                                }}
                            />
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX up to 10MB — Select multiple files</p>
                        </div>

                        {/* New Uploads List */}
                        {uploadedFiles.length > 0 && (
                            <div className="space-y-2 mb-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files to upload ({uploadedFiles.length})</p>
                                {uploadedFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                        <span className="text-sm font-medium text-slate-800 truncate">{file.name}</span>
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setUploadedFiles(prev => prev.filter((_, i) => i !== idx)); }}
                                            className="text-slate-400 hover:text-red-500"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button onClick={() => setEditingDocument(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white">Cancel</button>
                        <button onClick={handleSaveDocument} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save Changes</button>
                    </div>
                </div>
            </div>
        )}

        {/* View Document Modal */}
        {viewingDocument && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                        <div><h2 className="text-lg font-bold text-slate-900">View Document</h2><p className="text-sm text-slate-500">{viewingDocument.documentName}</p></div>
                        <button onClick={() => setViewingDocument(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
                    </div>
                    <div className="flex-1 bg-slate-100 p-6 flex items-center justify-center min-h-[500px]">
                        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-700 mb-2">{viewingDocument.documentName}</h3>
                            <p className="text-sm text-slate-500">Document Type: {viewingDocument.documentType}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deletingDocument && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-6 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-7 h-7" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Document?</h3>
                        <p className="text-sm text-slate-500">
                            Are you sure you want to delete <strong>{deletingDocument.documentType}</strong>? This action cannot be undone.
                        </p>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button 
                            onClick={() => setDeletingDocument(null)} 
                            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleDeleteDocument} 
                            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-200 transition-all"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
      
      <KeyNumberModal
        isOpen={isKeyNumberModalOpen}
        onClose={() => setIsKeyNumberModalOpen(false)}
        onSave={handleSaveKeyNumber}
        mode={keyNumberModalMode}
        entityType="Asset"
        editData={editingKeyNumber}
        availableKeyNumbers={keyNumbers}
        tagSections={tagSections}
        getDocumentTypeById={getDocumentTypeById}
      />

      {/* The Schedule and Add Work Order forms are now rendered as
          dedicated form pages (early-return at the top of this component)
          rather than overlays. See the `if (isCreatingSchedule) ... return`
          and `if (isCreateOrderModalOpen) ... return` blocks above. */}
    </div>
  );
}
