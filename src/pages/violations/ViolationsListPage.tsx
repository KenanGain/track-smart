import React, { useState, useMemo } from 'react';
import {
    Search, Download, Plus, ChevronLeft, ChevronRight,
    AlertTriangle, LayoutGrid,
    FileWarning, ShieldAlert, Ban,
    X, Edit3, Flag, Info,
    ArrowUpDown, ArrowUp, ArrowDown,
    DollarSign, Gavel, Truck, User, MapPin,
    ClipboardList
} from 'lucide-react';
import { MOCK_VIOLATION_RECORDS, type ViolationRecord, getViolation } from './violations-list.data';
import { MOCK_ASSET_VIOLATION_RECORDS, type AssetViolationRecord } from './asset-violations.data';
import { ViolationEditForm } from './ViolationEditForm';

// ─── System UI Primitives ──────────────────────────────────────────────────────

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants: Record<string, string> = {
            default:  'bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm border border-transparent',
            outline:  'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium',
            ghost:    'hover:bg-slate-100 text-slate-500 hover:text-slate-900',
        };
        const sizes: Record<string, string> = {
            default: 'h-9 px-4 py-2',
            sm:      'h-8 px-3 text-xs',
            icon:    'h-8 w-8',
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

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input
            className={cn(
                'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-normal transition-all placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5',
                className
            )}
            ref={ref}
            {...props}
        />
    ));
Input.displayName = 'Input';

const TH = ({ children, className, align = 'left', sortable, sorted, onSort }: { 
    children?: React.ReactNode; 
    className?: string; 
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    sorted?: 'asc' | 'desc' | null;
    onSort?: () => void;
}) => (
    <th 
        className={cn(
            'px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 select-none group bg-slate-50/50 first:rounded-tl-lg last:rounded-tr-lg',
            align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
            sortable && 'cursor-pointer hover:bg-slate-100 hover:text-blue-600 transition-colors',
            className
        )}
        onClick={sortable ? onSort : undefined}
    >
        <div className={cn(
            "flex items-center gap-1.5",
            align === 'right' && "justify-end",
            align === 'center' && "justify-center"
        )}>
            {children}
            {sortable && (
                <span className={cn(
                    "transition-all duration-200",
                    sorted ? "text-blue-600 opacity-100" : "text-slate-300 opacity-0 group-hover:opacity-100"
                )}>
                    {sorted === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : sorted === 'desc' ? <ArrowDown size={12} strokeWidth={3} /> : <ArrowUpDown size={12} />}
                </span>
            )}
        </div>
    </th>
);

const TD = ({ children, className, align = 'left' }: { children?: React.ReactNode; className?: string; align?: string }) => (
    <td className={cn(
        'px-6 py-4 text-sm whitespace-nowrap align-middle border-b border-slate-100 last:border-0 relative group-hover:bg-blue-50/10 transition-colors',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
    )}>
        {children}
    </td>
);

// ─── Shared Badge Components (Utilized by List & Modal) ──────────────────────────

const StateBadge = ({ state }: { state: string }) => (
    <span className="inline-flex items-center justify-center h-5 w-8 rounded text-[11px] font-bold text-slate-700 bg-white border border-slate-200 shadow-sm">
        {state}
    </span>
);

const DriverTypeBadge = ({ type }: { type: string }) => {
    let colors = "bg-slate-100 text-slate-600 border-slate-200"; // Default
    if (type.includes('Long Haul')) colors = "bg-green-50 text-green-700 border-green-200";
    if (type.includes('Local')) colors = "bg-blue-50 text-blue-700 border-blue-200";
    if (type.includes('Owner')) colors = "bg-purple-50 text-purple-700 border-purple-200";

    return (
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border", colors)}>
            {type}
        </span>
    );
};

const ViolationCodePill = ({ code }: { code: string }) => (
    <code className="text-blue-600 font-mono text-[11px] font-bold hover:underline cursor-pointer">
        §{code}
    </code>
);

const OOSBadge = () => (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-600 border border-red-200/50 text-[9px] font-bold uppercase tracking-wide ml-2">
        OOS
    </span>
);

const CrashLikelihoodBar = ({ value }: { value: number }) => {
    const width = Math.min(Math.max(value, 5), 100);
    let color = 'bg-emerald-500';
    let label = 'Low Risk';
    
    if (value > 30) { color = 'bg-amber-500'; label = 'Medium Risk'; }
    if (value > 60) { color = 'bg-red-500'; label = 'High Risk'; }
    
    return (
        <div className="w-24">
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-slate-700 uppercase">{label}</span>
                <span className="text-[10px] font-bold text-slate-400">{value}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${width}%` }} />
            </div>
        </div>
    );
};

const ResultBadge = ({ result }: { result: ViolationRecord['result'] }) => {
    let colors = "text-slate-600 bg-slate-100 border-slate-200";
    if (result === 'Citation Issued') colors = "text-red-700 bg-red-50 border-red-200";
    if (result === 'Warning') colors = "text-amber-700 bg-amber-50 border-amber-200";
    if (result === 'OOS Order') colors = "text-rose-700 bg-rose-50 border-rose-200 font-black";
    if (result === 'Clean Inspection') colors = "text-emerald-700 bg-emerald-50 border-emerald-200";

    return (
        <span className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide",
            colors
        )}>
            {result}
        </span>
    );
};

// ─── Violation Detail Modal ────────────────────────────────────────────────────

const ViolationDetailModal = ({ record, onClose }: { record: ViolationRecord | AssetViolationRecord | null; onClose: () => void }) => {
    if (!record) return null;

    // Helper formatting
    const fmt$ = (n: number) =>
        n === 0 ? 'No Fee' : new Intl.NumberFormat('en-US', { style: 'currency', currency: record.currency || 'USD' }).format(n);

    // Determine Entity Info
    const isAssetRecord = (r: any): r is AssetViolationRecord => 'assetUnitNumber' in r;
    const isAsset = isAssetRecord(record);

    // Lookup full violation data for regulatory codes (Drivers only for now)
    const fullViolation = !isAsset ? getViolation((record as ViolationRecord).violationDataId) : null;

    let entityName = '';
    let entitySub = '';
    let entityId = '';
    let entityAvatar = null;
    let linkedEntity = null;

    if (isAsset) { // Asset Record
        entityName = `Unit ${record.assetUnitNumber}`;
        entitySub = `${record.assetMakeModel} (${record.assetPlate})`;
        entityId = record.assetId;
        entityAvatar = <Truck size={24} />;
        if (record.linkedDriverName) {
            linkedEntity = { label: 'Linked Driver', value: record.linkedDriverName, id: record.linkedDriverId };
        }
    } else { // Driver Record
        entityName = record.driverName;
        entitySub = record.driverType;
        entityId = record.driverId;
        const names = record.driverName.split(' ');
        const initials = names.length > 1 ? `${names[0][0]}${names[names.length-1][0]}` : names[0]?.slice(0, 2);
        entityAvatar = initials;
        if (record.assetName) {
            linkedEntity = { label: 'Asset Involved', value: record.assetName, id: record.assetId };
        }
    }
    
    // Violation Data Lookup
    // For drivers we use 'getViolation', for assets we use 'getAssetViolationDef' (imported or find locally)
    // To keep it simple we rely on record fields which should be populated.
    
    const totalCost = (record.fineAmount || 0) + (record.expenseAmount || 0);
    const finePercent = totalCost > 0 ? (record.fineAmount || 0) / totalCost * 100 : 0;
    const expPercent = totalCost > 0 ? (record.expenseAmount || 0) / totalCost * 100 : 0;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-bold text-slate-900">Violation Details</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold font-mono">
                                {record.id}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500">Recorded on {new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {record.time}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-8">
                        {/* Entity Section */}
                        <div className="flex items-start gap-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xl font-bold text-blue-600 shadow-sm shrink-0">
                                {entityAvatar}
                            </div>
                            <div className="flex-1">
                                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-1">
                                    {entityName}
                                    {!isAsset && <DriverTypeBadge type={entitySub} />}
                                </h4>
                                <div className="text-sm text-slate-500 flex flex-wrap gap-x-6 gap-y-2 mb-3">
                                    <span>ID: <code className="font-bold text-slate-700">{entityId}</code></span>
                                    {isAsset && <span>{entitySub}</span>}
                                    {/* Linked Entity */}
                                    {linkedEntity && (
                                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                                            {linkedEntity.label}: {linkedEntity.value}
                                        </span>
                                    )}
                                </div>

                                {/* Address Block */}
                                <div className="text-sm text-slate-500 mt-3 border-t border-slate-200/60 pt-3">
                                    <div className="flex items-start gap-2.5">
                                        <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                                        <div className="leading-snug">
                                            {record.locationStreet && <span className="block font-medium text-slate-700">{record.locationStreet}</span>}
                                            <span className="block">{record.locationCity || 'Unknown City'}, {record.locationState} {record.locationZip}</span>
                                            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">{record.locationCountry || 'US'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* OUTCOME & STATUS SECTION */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Gavel size={14} /> Official Outcome
                                </div>
                                <div className="flex items-center justify-between">
                                    <ResultBadge result={record.result} />
                                    {record.isOos && <OOSBadge />}
                                </div>
                            </div>
                            
                            {/* Total Cost & Graph */}
                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <DollarSign size={14} /> Total (Fine & Expenses)
                                </div>
                                <div className="mb-3">
                                    <div className="text-2xl font-bold text-slate-900 font-mono flex items-baseline gap-1">
                                        {record.currency === 'USD' ? '$' : 'C$'}
                                        {totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        <span className="text-sm text-slate-400 font-sans font-normal">{record.currency || 'USD'}</span>
                                    </div>
                                </div>

                                {/* Mini Cost Breakdown Graph */}
                                {totalCost > 0 && (
                                    <div className="space-y-2">
                                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-rose-500" style={{ width: `${finePercent}%` }} />
                                            <div className="h-full bg-blue-500" style={{ width: `${expPercent}%` }} />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-medium uppercase tracking-wide">
                                            <span className="text-rose-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Fine: {fmt$(record.fineAmount || 0)}</span>
                                            <span className="text-blue-600 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Exp: {fmt$(record.expenseAmount || 0)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Violation Codes */}
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Flag size={14} /> Violation Information
                            </h5>
                            <div className="bg-white border-l-4 border-red-500 pl-4 py-1 mb-4">
                                <div className="text-2xl font-bold text-slate-900 mb-1">{record.violationCode}</div>
                                <div className="text-lg text-slate-700 font-medium leading-relaxed">{record.violationType}</div>
                            </div>
                            
                            {/* Detailed Regulatory Info */}
                            {fullViolation && fullViolation.regulatoryCodes && (
                                <div className="grid gap-3 mt-4">
                                    {fullViolation.regulatoryCodes.usa?.map((code: any, i: number) => (
                                        <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase">{code.authority}</span>
                                                <span className="text-xs font-mono font-bold text-slate-600">{code.cfr?.[0] || 'N/A'}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 italic">"{code.description}"</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Impact & Status (Crash Likelihood) */}
                        <div>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <Info size={14} /> Impact & Status
                            </h5>
                            <div className="p-4 border border-slate-200 rounded-xl bg-white">
                                <div className="text-xs text-slate-500 mb-1">Crash Likelihood</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-bold text-slate-900">{isAsset ? (record as AssetViolationRecord).crashLikelihoodPercent : (record as ViolationRecord).crashLikelihood}%</span>
                                    <div className="flex-1 h-2 bg-slate-100 rounded-full mb-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${((isAsset ? (record as AssetViolationRecord).crashLikelihoodPercent : (record as ViolationRecord).crashLikelihood) || 0) >= 50 ? 'bg-red-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${Math.min((isAsset ? (record as AssetViolationRecord).crashLikelihoodPercent : (record as ViolationRecord).crashLikelihood) || 0, 100)}%` }} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/30 flex justify-end gap-3 rounded-b-2xl">
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

type SortField = 'date' | 'driverName' | 'assetName' | 'violationType' | 'driverRiskCategory' | 'crashLikelihood' | 'expenses' | 'fineAmount';
type SortOrder = 'asc' | 'desc';
type PageView = 'drivers' | 'assets';



const ColumnSelector = ({ visibleColumns, onChange, options }: { visibleColumns: Set<string>, onChange: (cols: Set<string>) => void, options: { id: string, label: string }[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggle = (id: string) => {
        // e.stopPropagation();
        const next = new Set(visibleColumns);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        onChange(next);
    };

    return (
        <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)} className="gap-2 border-slate-300 text-slate-700 bg-white shadow-sm">
                <LayoutGrid size={16} /> Columns
            </Button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                        <div className="flex justify-between items-center px-2 py-1 mb-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visible Columns</span>
                            <button onClick={() => onChange(new Set(options.map(o => o.id)))} className="text-[10px] font-bold text-blue-600 hover:underline">Reset</button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-0.5">
                            {options.map(opt => (
                                <label key={opt.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm text-slate-700 select-none">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                        checked={visibleColumns.has(opt.id)}
                                        onChange={() => toggle(opt.id)}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export function ViolationsListPage() {
    const [pageView, setPageView]         = useState<PageView>('drivers');
    const [search, setSearch]             = useState('');
    const [filterResult, setFilterResult] = useState('all');
    const [filterRisk]                    = useState('all');
    
    // KPI Filter State (clicking a KPI card sets this)
    const [activeKpiFilter, setActiveKpiFilter] = useState<string | null>(null);

    // Pagination Customization
    const [currentPage, setCurrentPage]   = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    const [selectedRecord, setSelectedRecord] = useState<ViolationRecord | AssetViolationRecord | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<ViolationRecord | AssetViolationRecord | null>(null);

    const [driverVisibleColumns, setDriverVisibleColumns] = useState<Set<string>>(new Set([
        'date', 'time', 'driverName', 'driverType', 'assetName', 
        'locationCity', 'locationState', 'locationFull',
        'violationType', 'crashLikelihood', 'result', 'totalCost', 'actions'
    ]));

    const [assetVisibleColumns, setAssetVisibleColumns] = useState<Set<string>>(new Set([
        'date', 'time', 'assetUnitNumber', 'assetMakeModel', 
        'locationCity', 'locationState', 'locationFull',
        'violationType', 'crashLikelihood', 'result', 'totalCost', 'actions',
        'linkedDriverName'
    ]));

    const visibleColumns = pageView === 'drivers' ? driverVisibleColumns : assetVisibleColumns;
    const setVisibleColumns = pageView === 'drivers' ? setDriverVisibleColumns : setAssetVisibleColumns;

    // State for records (initialized from mock data)
    const [records, setRecords] = useState<ViolationRecord[]>(MOCK_VIOLATION_RECORDS);
    const [assetRecords, setAssetRecords] = useState<AssetViolationRecord[]>(MOCK_ASSET_VIOLATION_RECORDS);

    // Sorting State
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc'); // Default to desc for new field
        }
    };

    const handleEdit = (record: ViolationRecord | AssetViolationRecord) => {
        setEditingRecord(record);
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (updated: any) => {
        console.log("Updated record:", updated);
        
        if (pageView === 'drivers') {
            const record = updated as ViolationRecord;
            if (record.id) {
                setRecords(prev => prev.map(r => r.id === record.id ? record : r));
            } else {
                setRecords(prev => [{ ...record, id: `V-${Date.now()}` }, ...prev]);
            }
        } else {
            const record = updated as AssetViolationRecord;
            if (record.id) {
                setAssetRecords(prev => prev.map(r => r.id === record.id ? record : r));
            } else {
                setAssetRecords(prev => [{ ...record, id: `AV-${Date.now()}` }, ...prev]);
            }
        }
        
        setIsEditModalOpen(false);
        setEditingRecord(null);
    };

    const handleRowClick = (record: ViolationRecord | AssetViolationRecord) => {
        setSelectedRecord(record);
    };

    // ── Stats Calculation ────────────────────────────────────────────────────
    const driverStats = useMemo(() => ({
        total:    records.length,
        open:     records.filter(r => r.status === 'Open').length,
        oos:      records.filter(r => r.result === 'OOS Order').length,
        highRisk: records.filter(r => r.driverRiskCategory === 1).length,
        cited:    records.filter(r => r.result === 'Citation Issued').length,
        warning:  records.filter(r => r.result === 'Warning').length,
    }), [records]);

    const assetStats = useMemo(() => ({
        total:    assetRecords.length,
        open:     assetRecords.filter(r => r.status === 'Open').length,
        oos:      assetRecords.filter(r => r.isOos && r.result === 'OOS Order').length,
        highRisk: assetRecords.filter(r => r.crashLikelihoodPercent >= 80).length,
        cited:    assetRecords.filter(r => r.result === 'Citation Issued').length,
        warning:  assetRecords.filter(r => r.result === 'Warning').length,
    }), [assetRecords]);

    const stats = pageView === 'drivers' ? driverStats : assetStats;

    // ── Filter & Sort Logic ──────────────────────────────────────────────────
    const filteredDriverRecords = useMemo(() => {
        let res = records.filter(r => {
            const q = search.toLowerCase();
            const matchSearch = !q
                || r.driverName.toLowerCase().includes(q)
                || r.violationType.toLowerCase().includes(q)
                || r.violationCode.toLowerCase().includes(q)
                || r.violationGroup.toLowerCase().includes(q)
                || r.id.toLowerCase().includes(q);

            // Manual dropdown filters
            const matchResult = filterResult === 'all' || r.result === filterResult;
            const matchRisk   = filterRisk   === 'all' || r.driverRiskCategory === Number(filterRisk);
            
            // KPI Card filters
            let matchKpi = true;
            if (activeKpiFilter === 'open')     matchKpi = r.status === 'Open';
            if (activeKpiFilter === 'oos')      matchKpi = r.result === 'OOS Order';
            if (activeKpiFilter === 'highRisk') matchKpi = r.driverRiskCategory === 1;
            if (activeKpiFilter === 'cited')    matchKpi = r.result === 'Citation Issued';
            if (activeKpiFilter === 'warning')  matchKpi = r.result === 'Warning';
            
            return matchSearch && matchResult && matchRisk && matchKpi;
        });

        // Sorting
        res.sort((a, b) => {
            let valA: any = a[sortField];
            let valB: any = b[sortField];

            // Handle date comparison
            if (sortField === 'date') {
                valA = new Date(a.date).getTime();
                valB = new Date(b.date).getTime();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return res;
    }, [search, filterResult, filterRisk, activeKpiFilter, sortField, sortOrder]);


    const fmt$ = (n: number) =>
        n === 0 ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

    // ── Asset Violations filtered & sorted ──────────────────────────────────
    const filteredAssetRecords = useMemo(() => {
        const q = search.toLowerCase();
        let res = assetRecords.filter(r => {
            const matchSearch = !q
            || r.assetUnitNumber.toLowerCase().includes(q)
            || r.assetMakeModel.toLowerCase().includes(q)
            || r.violationType.toLowerCase().includes(q)
            || r.violationCode.toLowerCase().includes(q)
            || r.assetPlate.toLowerCase().includes(q)
            || r.id.toLowerCase().includes(q);

            // KPI Card filters
            let matchKpi = true;
            if (activeKpiFilter === 'open')     matchKpi = r.status === 'Open';
            if (activeKpiFilter === 'oos')      matchKpi = r.isOos && r.result === 'OOS Order';
            if (activeKpiFilter === 'highRisk') matchKpi = r.crashLikelihoodPercent >= 80;
            if (activeKpiFilter === 'cited')    matchKpi = r.result === 'Citation Issued';
            if (activeKpiFilter === 'warning')  matchKpi = r.result === 'Warning';

            return matchSearch && matchKpi;
        });
        
        // Basic sorting for assets (by date desc default)
        return res.sort((a, b) => (a.date < b.date ? 1 : -1));
    }, [assetRecords, search, activeKpiFilter]);

    const currentFilteredRecords = pageView === 'drivers' ? filteredDriverRecords : filteredAssetRecords;

    const totalPages = Math.max(1, Math.ceil(currentFilteredRecords.length / itemsPerPage));
    const driverPageData = useMemo(() => {
        if (pageView !== 'drivers') return [];
        return filteredDriverRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredDriverRecords, currentPage, itemsPerPage, pageView]);

    const assetPageData = useMemo(() => {
        if (pageView !== 'assets') return [];
        return filteredAssetRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [filteredAssetRecords, currentPage, itemsPerPage, pageView]);


    // Reverted KPI Card Component ("Chart/Bar Style")
    const KpiCard = ({ label, value, icon: Icon, borderCls, filter, isActive }: any) => (
        <div 
            onClick={() => {
                setActiveKpiFilter(isActive ? null : filter);
                setCurrentPage(1);
            }}
            className={cn(
                'cursor-pointer bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all relative overflow-hidden group h-full flex flex-col',
                isActive ? 'ring-2 ring-blue-500 bg-blue-50/10' : ''
            )}
        >
            {/* Colored left border */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", borderCls.replace('border-l-', 'bg-'))} />
            
            <div className="p-4 flex flex-col justify-between h-full pl-6">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
                    </div>
                    <div className={cn("p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors")}>
                        <Icon size={18} strokeWidth={2} />
                    </div>
                </div>
                
                {/* "Chart/Bar" thing - a progress bar at bottom */}
                <div className="mt-2">
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full opacity-60", borderCls.replace('border-l-', 'bg-'))} style={{ width: '65%' }} />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="px-8 pt-6 pb-6 shrink-0 space-y-6 bg-white border-b border-slate-200 shadow-sm z-20">
                <div className="flex justify-between items-center">
                     <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Violations Management</h1>
                        <p className="text-slate-500 text-sm mt-1 font-medium">Monitor compliance, track citations, and manage driver safety records.</p>
                    </div>
                     <div className="flex items-center gap-3">
                        {/* ── Page View Toggle ── */}
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/50">
                            {([['drivers', User, 'Drivers'], ['assets', Truck, 'Assets']] as const).map(([view, Icon, label]) => (
                                <button
                                    key={view}
                                    onClick={() => { setPageView(view); setSearch(''); }}
                                    className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-md transition-all ${
                                        pageView === view
                                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }`}
                                >
                                    <Icon size={13} />{label}
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 border-slate-300 text-slate-700">
                            <Download size={16} /> Export
                        </Button>
                        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-500/20" onClick={() => {
                            setEditingRecord({} as any); // TODO: Pass type
                            setIsEditModalOpen(true);
                        }}>
                            <Plus size={18} strokeWidth={2.5} /> Add Violation
                        </Button>
                    </div>
                </div>

                {/* ── Reverted KPI Cards ────────────────────── */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                        {[
                            { label: 'Total Violations', value: stats.total,    icon: LayoutGrid,   borderCls: 'border-l-blue-500',   filter: null },
                            { label: 'Open Cases',       value: stats.open,     icon: ShieldAlert,  borderCls: 'border-l-amber-500',  filter: 'open' },
                            { label: 'OOS Orders',       value: stats.oos,      icon: Ban,          borderCls: 'border-l-slate-800',  filter: 'oos' },
                            { label: 'High Risk',        value: stats.highRisk, icon: AlertTriangle,borderCls: 'border-l-red-500',    filter: 'highRisk' },
                            { label: 'Citations',        value: stats.cited,    icon: FileWarning,  borderCls: 'border-l-rose-500',   filter: 'cited' },
                            { label: 'Warnings',         value: stats.warning,  icon: AlertTriangle,borderCls: 'border-l-yellow-500', filter: 'warning' },
                        ].map(s => (
                            <KpiCard key={s.label} {...s} isActive={activeKpiFilter === s.filter} />
                        ))}
                    </div>
            </div>

            {/* ── Content ─────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col overflow-hidden px-8 py-6">
                
                {/* ── Search + Filters ─────────────────────────────────── */}
                <div className="flex items-center justify-between mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder={pageView === 'assets' ? 'Filter asset violations...' : 'Filter violations...'}
                            className="pl-10 h-10 border-slate-300 rounded-lg shadow-sm"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                         <ColumnSelector 
                            visibleColumns={visibleColumns} 
                            onChange={setVisibleColumns}
                            options={pageView === 'drivers' ? [
                                { id: 'date', label: 'Date' },
                                { id: 'time', label: 'Time' },
                                { id: 'driverName', label: 'Driver Name' },
                                { id: 'driverType', label: 'Driver Type' },
                                { id: 'assetName', label: 'Asset ID' },
                                { id: 'locationCity', label: 'City' },
                                { id: 'locationState', label: 'State' },
                                { id: 'locationFull', label: 'Full Address' },
                                { id: 'violationType', label: 'Violation Type' },
                                { id: 'crashLikelihood', label: 'Risk Level' },
                                { id: 'result', label: 'Result' },
                                { id: 'totalCost', label: 'Total (Fine & Expenses)' },
                                { id: 'actions', label: 'Actions' },
                            ] : [
                                { id: 'date', label: 'Date' },
                                { id: 'time', label: 'Time' },
                                { id: 'assetUnitNumber', label: 'Asset Unit #' },
                                { id: 'assetMakeModel', label: 'Asset Details' },
                                { id: 'locationCity', label: 'City' },
                                { id: 'locationState', label: 'State' },
                                { id: 'locationFull', label: 'Full Address' },
                                { id: 'violationType', label: 'Violation Type' },
                                { id: 'crashLikelihood', label: 'Risk Level' },
                                { id: 'linkedDriverName', label: 'Linked Driver' },
                                { id: 'result', label: 'Result' },
                                { id: 'totalCost', label: 'Total (Fine & Expenses)' },
                                { id: 'actions', label: 'Actions' },
                            ]}
                         />
                         <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                             {currentFilteredRecords.length} RECORDS FOUND
                         </span>
                    </div>
                </div>

                {/* ── Table ─────────────────────────────────────────────────── */}
                {pageView === 'drivers' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr>
                                    {visibleColumns.has('date') && <TH className="pl-6 w-[120px]" sortable sorted={sortField === 'date' ? sortOrder : null} onSort={() => handleSort('date')}>Date</TH>}
                                    {visibleColumns.has('time') && <TH className="w-[80px]">Time</TH>}
                                    {visibleColumns.has('driverName') && <TH className="w-[200px]" sortable sorted={sortField === 'driverName' ? sortOrder : null} onSort={() => handleSort('driverName')}>Driver</TH>}
                                    {visibleColumns.has('driverType') && <TH>Driver Type</TH>}
                                    {visibleColumns.has('assetName') && <TH className="w-[120px]" sortable sorted={sortField === 'assetName' ? sortOrder : null} onSort={() => handleSort('assetName')}>Asset</TH>}
                                    {visibleColumns.has('locationCity') && <TH className="w-[120px]">City</TH>}
                                    {visibleColumns.has('locationState') && <TH className="w-[80px] text-center">State</TH>}
                                    {visibleColumns.has('locationFull') && <TH className="w-[200px]">Address</TH>}
                                    {visibleColumns.has('violationType') && <TH className="w-[250px]" sortable sorted={sortField === 'violationType' ? sortOrder : null} onSort={() => handleSort('violationType')}>Violation</TH>}
                                    {visibleColumns.has('crashLikelihood') && <TH sortable sorted={sortField === 'crashLikelihood' ? sortOrder : null} onSort={() => handleSort('crashLikelihood')}>Risk Level</TH>}
                                    {visibleColumns.has('result') && <TH>Result</TH>}
                                    {visibleColumns.has('totalCost') && <TH align="right" sortable sorted={sortField === 'fineAmount' ? sortOrder : null} onSort={() => handleSort('fineAmount')}>Total (Fine & Expenses)</TH>}
                                    {visibleColumns.has('actions') && <TH align="right" className="w-[80px]">Action</TH>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {driverPageData.length > 0 ? driverPageData.map(r => {
                                    const totalCost = (r.fineAmount || 0) + (r.expenseAmount || 0);
                                    const currency = r.currency || 'USD'; 
                                    
                                    return (
                                    <tr 
                                        key={r.id} 
                                        onClick={() => handleRowClick(r)}
                                        className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                    >
                                        {visibleColumns.has('date') && <TD className="pl-6 font-medium text-slate-900">
                                            {new Date(r.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                        </TD>}
                                        {visibleColumns.has('time') && <TD className="text-slate-500 text-xs font-mono">{r.time}</TD>}
                                        {visibleColumns.has('driverName') && <TD>
                                            <div className="font-bold text-slate-800 text-sm mb-0.5">{r.driverName}</div>
                                            <div className="text-[10px] text-slate-400 font-mono tracking-wide">ID: {r.driverId}</div>
                                        </TD>}
                                        {visibleColumns.has('driverType') && <TD>
                                            <DriverTypeBadge type={r.driverType} />
                                        </TD>}
                                        {visibleColumns.has('assetName') && <TD>
                                            {r.assetName ? (
                                                <div className="font-medium text-slate-700">{r.assetName}</div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </TD>}
                                        {visibleColumns.has('locationCity') && <TD>
                                            <span className="text-slate-700">{r.locationCity || '—'}</span>
                                        </TD>}
                                        {visibleColumns.has('locationState') && <TD align="center">
                                            <StateBadge state={r.locationState} />
                                        </TD>}
                                        {visibleColumns.has('locationFull') && <TD>
                                            <div className="text-xs text-slate-600 truncate max-w-[150px]" title={`${r.locationStreet || ''}, ${r.locationCity}, ${r.locationState} ${r.locationZip || ''}`}>
                                                {r.locationStreet ? `${r.locationStreet}, ` : ''}{r.locationCity}, {r.locationState}
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('violationType') && <TD>
                                            <div className="font-medium text-slate-800 leading-snug mb-1 truncate max-w-[280px]" title={r.violationType}>
                                                {r.violationType}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ViolationCodePill code={r.violationCode} />
                                                {r.isOos && <OOSBadge />}
                                                {r.inspectionId && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200/60 text-[9px] font-bold uppercase tracking-wide" title={`From Inspection ${r.inspectionId}`}>
                                                        <ClipboardList size={9} strokeWidth={2.5} />INSP
                                                    </span>
                                                )}
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('crashLikelihood') && <TD>
                                            <CrashLikelihoodBar value={r.crashLikelihood} />
                                        </TD>}
                                        {visibleColumns.has('result') && <TD>
                                            <ResultBadge result={r.result} />
                                        </TD>}
                                        {visibleColumns.has('totalCost') && <TD align="right" className="font-mono font-medium text-slate-700">
                                            <div title={`Fine: ${fmt$(r.fineAmount || 0)}\nExpenses: ${fmt$(r.expenseAmount || 0)}`}>
                                                {currency === 'USD' ? '$' : 'C$'}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                <span className="text-[10px] text-slate-400 ml-1">{currency}</span>
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('actions') && <TD align="right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Record"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        </TD>}
                                    </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Search size={24} className="opacity-20" />
                                                <p className="text-sm font-medium">No violations found matching your filters.</p>
                                                <Button size="sm" variant="outline" onClick={() => { setSearch(''); setActiveKpiFilter(null); setFilterResult('all'); }} className="mt-2">
                                                    Reset Filters
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {/* ── Asset Violations Table ─────────────────────────────────── */}
                {pageView === 'assets' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="sticky top-0 z-10 bg-white shadow-sm">
                                <tr>
                                    {visibleColumns.has('date') && <TH className="pl-6 w-[120px]">Date</TH>}
                                    {visibleColumns.has('time') && <TH className="w-[80px]">Time</TH>}
                                    {visibleColumns.has('assetUnitNumber') && <TH className="w-[180px]">Asset (Unit #)</TH>}
                                    {visibleColumns.has('assetMakeModel') && <TH>Make / Model / Year</TH>}
                                    {visibleColumns.has('locationCity') && <TH className="w-[120px]">City</TH>}
                                    {visibleColumns.has('locationState') && <TH className="w-[80px] text-center">State</TH>}
                                    {visibleColumns.has('locationFull') && <TH className="w-[200px]">Address</TH>}
                                    {visibleColumns.has('violationType') && <TH className="w-[250px]">Violation</TH>}
                                    {visibleColumns.has('crashLikelihood') && <TH>Risk Level</TH>}
                                    {visibleColumns.has('linkedDriverName') && <TH>Linked Driver</TH>}
                                    {visibleColumns.has('result') && <TH>Result</TH>}
                                    {visibleColumns.has('totalCost') && <TH align="right">Total (Fine & Expenses)</TH>}
                                    {visibleColumns.has('actions') && <TH align="right" className="w-[80px]">Action</TH>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {assetPageData.length > 0 ? assetPageData.map(r => (
                                    <tr 
                                        key={r.id} 
                                        onClick={() => handleRowClick(r)}
                                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                    >
                                        {visibleColumns.has('date') && <TD className="pl-6 font-medium text-slate-900">
                                            {new Date(r.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                                        </TD>}
                                        {visibleColumns.has('time') && <TD className="text-slate-500 text-xs font-mono">{r.time}</TD>}
                                        {visibleColumns.has('assetUnitNumber') && <TD>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-slate-100 rounded-lg"><Truck size={14} className="text-slate-600" /></div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-sm">{r.assetUnitNumber}</div>
                                                    <div className="text-[10px] text-slate-400">{r.assetType} · {r.assetPlate}</div>
                                                </div>
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('assetMakeModel') && <TD>
                                            <div className="text-sm text-slate-700">{r.assetMakeModel}</div>
                                        </TD>}
                                        {visibleColumns.has('locationCity') && <TD>
                                            <span className="text-slate-700">{r.locationCity || '—'}</span>
                                        </TD>}
                                        {visibleColumns.has('locationState') && <TD align="center">
                                            <StateBadge state={r.locationState} />
                                        </TD>}
                                        {visibleColumns.has('locationFull') && <TD>
                                            <div className="text-xs text-slate-600 truncate max-w-[150px]" title={`${r.locationStreet || ''}, ${r.locationCity||''}, ${r.locationState} ${r.locationZip || ''}`}>
                                                {r.locationStreet ? `${r.locationStreet}, ` : ''}{r.locationCity || ''}, {r.locationState}
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('violationType') && <TD>
                                            <div className="font-medium text-slate-800 leading-snug mb-1 truncate max-w-[280px]" title={r.violationType}>
                                                {r.violationType}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <ViolationCodePill code={r.violationCode} />
                                                {r.isOos && <OOSBadge />}
                                                {r.inspectionId && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-200/60 text-[9px] font-bold uppercase tracking-wide" title={`From Inspection ${r.inspectionId}`}>
                                                        <ClipboardList size={9} strokeWidth={2.5} />INSP
                                                    </span>
                                                )}
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('crashLikelihood') && <TD>
                                            <CrashLikelihoodBar value={r.crashLikelihoodPercent} />
                                        </TD>}
                                        {visibleColumns.has('linkedDriverName') && <TD>
                                            {r.linkedDriverName ? (
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} className="text-slate-400" />
                                                    <span className="text-sm text-slate-700">{r.linkedDriverName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">—</span>
                                            )}
                                        </TD>}
                                        {visibleColumns.has('result') && <TD>
                                            <ResultBadge result={r.result} />
                                        </TD>}
                                        {visibleColumns.has('totalCost') && <TD align="right" className="font-mono font-medium text-slate-700">
                                            <div>
                                                ${(r.fineAmount||0).toLocaleString()}
                                                <span className="text-[10px] text-slate-400 ml-1">USD</span>
                                            </div>
                                        </TD>}
                                        {visibleColumns.has('actions') && <TD align="right">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Edit Asset Record"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                        </TD>}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Truck size={24} className="opacity-20" />
                                                <p className="text-sm font-medium">No asset violations found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {/* Pagination - Matching Screenshot Exact Layout */}
                <div className="mt-4 flex items-center justify-end text-sm text-slate-600 select-none">
                    <span className="mr-4">
                        Showing <span className="font-bold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-slate-900">{Math.min(currentFilteredRecords.length, currentPage * itemsPerPage)}</span> of <span className="font-bold text-slate-900">{currentFilteredRecords.length}</span> results
                    </span>
                    
                    <span className="mx-4 text-slate-300">|</span>
                    
                    <span className="mr-2">Rows per page:</span>
                    <select 
                        className="h-8 rounded border border-slate-300 bg-white text-sm px-2 focus:border-blue-500 focus:outline-none mr-6"
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft size={14} />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <button
                                key={p}
                                onClick={() => setCurrentPage(p)}
                                className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded border text-sm font-medium transition-colors",
                                    currentPage === p 
                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm" 
                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                )}
                            >
                                {p}
                            </button>
                        ))}

                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

            </div>

            {/* Modals */}
            <ViolationDetailModal 
                record={selectedRecord} 
                onClose={() => setSelectedRecord(null)} 
            />
            
            <ViolationEditForm 
                isOpen={isEditModalOpen}
                record={editingRecord as any}
                mode={pageView === 'drivers' ? 'driver' : 'asset'}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEdit}
            />
        </div>
    );
}
