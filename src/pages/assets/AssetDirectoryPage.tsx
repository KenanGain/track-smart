import React, { useEffect, useState, useMemo } from 'react';
import { calculateAssetComplianceStats } from '@/utils/compliance-utils';
import {
    Search, Plus, Download, MoreHorizontal,
    Check, Edit2, FileText,
    RotateCcw, Trash2, Copy, Calendar, Truck,
    AlertCircle, Briefcase, LayoutGrid, XCircle,
    Columns, ChevronDown,
    ArrowUp, ArrowDown, ArrowUpDown, X as XIcon, Filter,
} from 'lucide-react';
import { INITIAL_ASSETS, type Asset } from './assets.data';
import { AssetModal } from './AssetModal';
import { AssetDetailView, type DetailedAsset } from './AssetDetailView';
import { PaginationBar } from '@/components/ui/DataListToolbar';

// --- UI Utility ---
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

// --- UI Primitives ---
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

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => (
        <input
            type={type}
            className={cn(
                'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-normal transition-all placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50',
                className
            )}
            ref={ref}
            {...props}
        />
    ));
Input.displayName = 'Input';

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
    };
    return (
        <div className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', variants[variant] || variants.default, className)}>
            {['Active', 'Drafted', 'Maintenance', 'Deactivated', 'OutOfService'].includes(variant) && (
                <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full",
                    variant === 'Active' ? 'bg-emerald-500' :
                        variant === 'Maintenance' ? 'bg-rose-500' :
                            variant === 'OutOfService' ? 'bg-amber-500' :
                                variant === 'Drafted' ? 'bg-blue-500' : 'bg-slate-400')} />
            )}
            {children}
        </div>
    );
};

// --- Table Components ---
const TH = ({ children, className, align = 'left' }: { children?: React.ReactNode; className?: string; align?: string }) => (
    <th className={cn(
        'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
    )}>
        {children}
    </th>
);

// Active filter chip — appears in the toolbar's active-filter row.
const FilterChip = ({ label, onClear }: { label: string; onClear: () => void }) => (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-medium">
        {label}
        <button
            type="button"
            onClick={onClear}
            className="p-0.5 rounded hover:bg-blue-100 transition-colors"
            aria-label={`Clear filter: ${label}`}
        >
            <XIcon size={11} />
        </button>
    </span>
);

// Sortable header — click to cycle asc → desc.
const SortTH = ({
    id, label, current, dir, onClick, className, align = 'left',
}: {
    id: string;
    label: string;
    current: string;
    dir: 'asc' | 'desc';
    onClick: (id: string) => void;
    className?: string;
    align?: string;
}) => {
    const active = current === id;
    return (
        <th
            onClick={() => onClick(id)}
            className={cn(
                'px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors',
                active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700',
                align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
                className
            )}
        >
            <span className={cn(
                'inline-flex items-center gap-1.5',
                align === 'right' && 'justify-end w-full',
                align === 'center' && 'justify-center w-full'
            )}>
                {label}
                {active ? (
                    dir === 'asc' ? <ArrowUp size={11} className="text-blue-600" /> : <ArrowDown size={11} className="text-blue-600" />
                ) : (
                    <ArrowUpDown size={11} className="text-slate-300" />
                )}
            </span>
        </th>
    );
};

const TD = ({ children, className, align = 'left' }: { children?: React.ReactNode; className?: string; align?: string }) => (
    <td className={cn(
        'px-4 py-3 text-sm whitespace-nowrap align-middle',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
    )}>
        {children}
    </td>
);

// --- Main Page Component ---
export function AssetDirectoryPage({
    isEmbedded = false,
    assets: assetsProp,
    onDetailViewChange,
    accountId,
}: {
    isEmbedded?: boolean;
    assets?: Asset[];
    /** Fired whenever the embedded asset detail view opens or closes — lets
     *  the parent (CarrierProfilePage) hide its own breadcrumb/tabs while
     *  the user is on the detail page. */
    onDetailViewChange?: (active: boolean) => void;
    /** Active carrier — threaded down to AssetDetailView so its safety
     *  analysis breakdown can be computed for the right scorecard bucket. */
    accountId?: string;
}) {
    const [assets, setAssets] = useState<Asset[]>(assetsProp ?? INITIAL_ASSETS);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState("");
    const [activeStatusFilter, setActiveStatusFilter] = useState('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<DetailedAsset | null>(null);

    // Notify the parent (CarrierProfilePage) when the embedded detail view
    // opens or closes so it can hide its own carrier breadcrumb + tabs while
    // the user is reading a single asset.
    useEffect(() => {
        onDetailViewChange?.(selectedAsset !== null);
    }, [selectedAsset, onDetailViewChange]);


    // Pagination
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Sorting
    const [sortKey, setSortKey] = useState<string>('unitNumber');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        else { setSortKey(key); setSortDir('asc'); }
    };

    const stats = useMemo(() => ({
        total: assets.length,
        active: assets.filter(a => a.operationalStatus === 'Active').length,
        deactivated: assets.filter(a => a.operationalStatus === 'Deactivated').length,
        maintenance: assets.filter(a => a.operationalStatus === 'Maintenance').length,
        outOfService: assets.filter(a => a.operationalStatus === 'OutOfService').length,
        draft: assets.filter(a => a.operationalStatus === 'Drafted').length
    }), [assets]);

    const filteredAssets = useMemo(() => {
        const filtered = assets.filter(a => {
            if (activeTab === 'trucks' && a.assetCategory !== 'CMV') return false;
            if (activeTab === 'trailers' && a.assetType !== 'Trailer') return false;
            if (activeStatusFilter !== 'all' && a.operationalStatus !== activeStatusFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return [
                    a.unitNumber, a.vin, a.make, a.model,
                    a.plateNumber, a.plateJurisdiction,
                    a.assetType, a.vehicleType, a.color,
                    String(a.year ?? ''),
                ].some(v => v?.toString().toLowerCase().includes(s));
            }
            return true;
        });

        if (!sortKey) return filtered;
        const dir = sortDir === 'asc' ? 1 : -1;
        const valueOf = (a: Asset, k: string): string | number => {
            switch (k) {
                case 'unitNumber': return (a.unitNumber || '').toLowerCase();
                case 'type':       return `${a.assetType || ''} ${a.vehicleType || ''}`.toLowerCase();
                case 'plate':      return (a.plateNumber || '').toLowerCase();
                case 'plateExpiry':return a.registrationExpiryDate || '';
                case 'vin':        return (a.vin || '').toLowerCase();
                case 'makeModel':  return `${a.make || ''} ${a.model || ''}`.toLowerCase();
                case 'year':       return a.year ?? 0;
                case 'dateAdded':  return a.insuranceAddedDate || '';
                case 'ownership':  return (a.financialStructure || '').toLowerCase();
                case 'status':     return (a.operationalStatus || '').toLowerCase();
                default:           return '';
            }
        };
        return [...filtered].sort((a, b) => {
            const av = valueOf(a, sortKey);
            const bv = valueOf(b, sortKey);
            if (av < bv) return -1 * dir;
            if (av > bv) return 1 * dir;
            return 0;
        });
    }, [assets, search, activeTab, activeStatusFilter, sortKey, sortDir]);

    const hasActiveFilters = search.length > 0 || activeStatusFilter !== 'all' || activeTab !== 'all';
    const clearAllFilters = () => {
        setSearch('');
        setActiveStatusFilter('all');
        setActiveTab('all');
    };

    // Reset to page 1 whenever filters change so the user always lands on visible rows.
    useEffect(() => {
        setPage(1);
    }, [search, activeTab, activeStatusFilter, rowsPerPage]);

    // Clamp page if filters trim the list shorter than the current page.
    useEffect(() => {
        const max = Math.max(1, Math.ceil(filteredAssets.length / rowsPerPage));
        if (page > max) setPage(max);
    }, [filteredAssets.length, rowsPerPage, page]);

    const pagedAssets = useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        return filteredAssets.slice(start, start + rowsPerPage);
    }, [filteredAssets, page, rowsPerPage]);

    const handleSaveAsset = (data: any) => {
        setIsSaving(true);
        setTimeout(() => {
            if (editingAsset) {
                setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, ...data } : a));
            } else {
                setAssets(prev => [{ ...data, id: `a${Date.now()}` }, ...prev]);
            }
            setIsSaving(false);
            setIsModalOpen(false);
            setEditingAsset(null);
        }, 600);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };



    const TABS = [
        { id: 'all', label: 'All Assets', icon: LayoutGrid },
        { id: 'trucks', label: 'Trucks (CMV)', icon: Truck },
        { id: 'trailers', label: 'Trailers (Non-CMV)', icon: Briefcase },
    ];

    return (
        <>
            {selectedAsset ? (
                <AssetDetailView
                    asset={selectedAsset}
                    onBack={() => setSelectedAsset(null)}
                    onEdit={() => {
                        setEditingAsset(selectedAsset);
                        setIsModalOpen(true);
                    }}
                    accountId={accountId}
                />
            ) : (
                <div className={isEmbedded ? "w-full flex flex-col bg-[#F8FAFC] text-slate-900" : "h-full flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden"}>
                    {/* HEADER SECTION */}
                    <div className={isEmbedded ? "px-0 pt-0 pb-6 shrink-0 bg-transparent border-b-0 z-20" : "px-6 pt-6 pb-6 shrink-0 bg-white border-b border-slate-200/60 shadow-sm z-20"}>
                        <div className={isEmbedded ? "flex flex-col gap-4" : "flex flex-col gap-6"}>
                            {!isEmbedded && (
                                <div className="flex justify-between items-center">
                                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Assets</h1>
                                </div>
                            )}
                            
                            {/* KPI CARDS — single-line labels, tighter padding, clearer active state */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                                {[
                                    { id: 'all',          label: 'Total Assets',  value: stats.total,        Icon: LayoutGrid, accent: 'blue'    },
                                    { id: 'Active',       label: 'Active',        value: stats.active,       Icon: Check,      accent: 'emerald' },
                                    { id: 'Maintenance',  label: 'Maintenance',   value: stats.maintenance,  Icon: RotateCcw,  accent: 'rose'    },
                                    { id: 'OutOfService', label: 'Out of Service',value: stats.outOfService, Icon: AlertCircle,accent: 'amber'   },
                                    { id: 'Drafted',      label: 'Draft',         value: stats.draft,        Icon: FileText,   accent: 'sky'     },
                                    { id: 'Deactivated',  label: 'Deactivated',   value: stats.deactivated,  Icon: XCircle,    accent: 'slate'   },
                                ].map((card) => {
                                    const active = activeStatusFilter === card.id;
                                    const tones: Record<string, { iconBg: string; iconFg: string; bar: string; ring: string }> = {
                                        blue:    { iconBg: 'bg-blue-50',    iconFg: 'text-blue-600',    bar: 'bg-blue-500',    ring: 'ring-blue-500/30' },
                                        emerald: { iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
                                        rose:    { iconBg: 'bg-rose-50',    iconFg: 'text-rose-600',    bar: 'bg-rose-500',    ring: 'ring-rose-500/30' },
                                        amber:   { iconBg: 'bg-amber-50',   iconFg: 'text-amber-600',   bar: 'bg-amber-500',   ring: 'ring-amber-500/30' },
                                        sky:     { iconBg: 'bg-sky-50',     iconFg: 'text-sky-600',     bar: 'bg-sky-500',     ring: 'ring-sky-500/30' },
                                        slate:   { iconBg: 'bg-slate-100',  iconFg: 'text-slate-600',   bar: 'bg-slate-500',   ring: 'ring-slate-500/30' },
                                    };
                                    const t = tones[card.accent];
                                    return (
                                        <button
                                            key={card.id}
                                            onClick={() => setActiveStatusFilter(card.id)}
                                            className={cn(
                                                'relative flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm transition-all overflow-hidden text-left',
                                                'hover:shadow hover:border-slate-300',
                                                active && `ring-2 ${t.ring} border-transparent`
                                            )}
                                        >
                                            <span className={cn('absolute left-0 top-0 bottom-0 w-1 transition-all', t.bar, active ? 'opacity-100' : 'opacity-30')} />
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', t.iconBg, t.iconFg)}>
                                                    <card.Icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 truncate">
                                                    {card.label}
                                                </span>
                                            </div>
                                            <div className="text-2xl font-bold text-slate-900 tabular-nums shrink-0">{card.value}</div>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* TOOLBAR — search row + filter row, wraps cleanly on small screens */}
                            <div className="flex flex-col gap-3 mt-1">
                                {/* Top row: search (left, flexible) · primary actions (right) */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                                    <div className="relative flex-1 min-w-0">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        <Input
                                            placeholder="Search by Unit #, VIN, make, model, plate, year…"
                                            className="pl-10 pr-10 h-10 text-[13px] bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all w-full rounded-lg"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        {search && (
                                            <button
                                                type="button"
                                                onClick={() => setSearch('')}
                                                aria-label="Clear search"
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            >
                                                <XIcon size={14} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                                        <Button variant="outline" size="sm" className="h-10 gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-sm rounded-lg">
                                            <Columns size={14} className="text-slate-500" /><span className="hidden sm:inline">Columns</span> <ChevronDown size={13} className="text-slate-400" />
                                        </Button>
                                        <Button variant="outline" size="sm" className="h-10 gap-1.5 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium shadow-sm rounded-lg">
                                            <Download size={14} className="text-slate-500" /><span className="hidden sm:inline">Export</span>
                                        </Button>
                                        <Button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} size="sm" className="h-10 gap-1.5 px-4 shadow-sm bg-[#2563eb] hover:bg-blue-700 text-white font-semibold rounded-lg">
                                            <Plus size={15} /> <span className="hidden sm:inline">Add Asset</span><span className="sm:hidden">Add</span>
                                        </Button>
                                    </div>
                                </div>

                                {/* Bottom row: All/Trucks/Trailers segmented switcher (scrolls horizontally on mobile) */}
                                <div className="flex items-center gap-3 -mx-1 px-1 overflow-x-auto scrollbar-hide">
                                    <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0">
                                        {TABS.map((tab) => {
                                            const active = activeTab === tab.id;
                                            const count = tab.id === 'all'
                                                ? assets.length
                                                : tab.id === 'trucks'
                                                    ? assets.filter((a) => a.assetCategory === 'CMV').length
                                                    : assets.filter((a) => a.assetType === 'Trailer').length;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setActiveTab(tab.id)}
                                                    className={cn(
                                                        'inline-flex items-center gap-2 h-8 px-3.5 rounded-md text-[13px] font-semibold transition-all whitespace-nowrap',
                                                        active
                                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                                                            : 'text-slate-600 hover:text-slate-900'
                                                    )}
                                                >
                                                    <tab.icon size={14} className={active ? 'text-blue-600' : 'text-slate-400'} />
                                                    <span className="hidden xs:inline sm:inline">{tab.label}</span>
                                                    <span className="sm:hidden">{tab.id === 'all' ? 'All' : tab.id === 'trucks' ? 'Trucks' : 'Trailers'}</span>
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold',
                                                            active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                                                        )}
                                                    >
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Active filter chips */}
                                {hasActiveFilters && (
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                        <Filter size={13} className="text-slate-400 shrink-0" />
                                        <span className="text-slate-500 font-medium shrink-0">Active filters:</span>
                                        {activeTab !== 'all' && (
                                            <FilterChip
                                                label={`Category: ${activeTab === 'trucks' ? 'Trucks (CMV)' : 'Trailers (Non-CMV)'}`}
                                                onClear={() => setActiveTab('all')}
                                            />
                                        )}
                                        {activeStatusFilter !== 'all' && (
                                            <FilterChip
                                                label={`Status: ${activeStatusFilter}`}
                                                onClear={() => setActiveStatusFilter('all')}
                                            />
                                        )}
                                        {search && (
                                            <FilterChip
                                                label={`Search: "${search}"`}
                                                onClear={() => setSearch('')}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={clearAllFilters}
                                            className="ml-1 text-blue-600 hover:text-blue-800 font-semibold"
                                        >
                                            Clear all
                                        </button>
                                        <span className="text-slate-400 ml-auto">
                                            {filteredAssets.length} match{filteredAssets.length === 1 ? '' : 'es'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MAIN LIST VIEW */}
                    {/* MAIN LIST VIEW */}
                    <div className={isEmbedded ? "flex flex-col w-full" : "flex-1 flex flex-col overflow-hidden"}>
                        <div className={isEmbedded ? "w-full flex flex-col pt-0" : "flex-1 p-6 pt-0 overflow-hidden flex flex-col"}>
                            <div className={isEmbedded ? "bg-white rounded-2xl border border-slate-200/60 flex flex-col shadow-sm" : "bg-white rounded-2xl border border-slate-200/60 flex-1 flex flex-col overflow-hidden shadow-sm"}>
                                <div className={isEmbedded ? "overflow-visible" : "flex-1 overflow-auto"}>
                                    <table className="w-full text-left border-collapse min-w-[1300px]">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                                            <tr>
                                                <SortTH id="unitNumber"  label="Unit #"               current={sortKey} dir={sortDir} onClick={handleSort} className="w-32 pl-6" />
                                                <SortTH id="type"        label="Type"                 current={sortKey} dir={sortDir} onClick={handleSort} className="w-40" />
                                                <SortTH id="plate"       label="Plate (No. / State)"  current={sortKey} dir={sortDir} onClick={handleSort} className="w-48" />
                                                <SortTH id="plateExpiry" label="Plate Expiry"         current={sortKey} dir={sortDir} onClick={handleSort} className="w-32" />
                                                <SortTH id="vin"         label="VIN"                  current={sortKey} dir={sortDir} onClick={handleSort} className="w-56" />
                                                <SortTH id="makeModel"   label="Make / Model / Year"  current={sortKey} dir={sortDir} onClick={handleSort} />
                                                <SortTH id="dateAdded"   label="Date Added"           current={sortKey} dir={sortDir} onClick={handleSort} className="w-32" />
                                                <SortTH id="ownership"   label="Ownership"            current={sortKey} dir={sortDir} onClick={handleSort} className="w-32" />
                                                <TH className="w-32 text-center" align="center">Compliance</TH>
                                                <SortTH id="status"      label="Status"               current={sortKey} dir={sortDir} onClick={handleSort} className="w-32" />
                                                <TH align="right" className="w-24 pr-6">Actions</TH>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-600">
                                            {filteredAssets.length > 0 ? (
                                                pagedAssets.map((asset) => (
                                                    <tr 
                                                        key={asset.id} 
                                                        onClick={() => setSelectedAsset(asset as DetailedAsset)} // Cast for now, fields are optional
                                                        className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                                                    >
                                                        <TD className="pl-6">
                                                            <span className="font-bold text-slate-900 text-sm">{asset.unitNumber}</span>
                                                        </TD>
                                                        <TD><span className="text-[12px] font-semibold text-slate-700 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/30">{asset.assetType} - {asset.vehicleType}</span></TD>
                                                        <TD>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-bold text-slate-800">{asset.plateNumber || '—'}</span>
                                                                <span className="text-[11px] font-medium text-slate-400">({asset.plateJurisdiction || 'N/A'})</span>
                                                            </div>
                                                        </TD>
                                                        <TD>
                                                            <span className={cn("text-[11px] font-bold uppercase", asset.registrationExpiryDate ? "text-blue-600" : "text-slate-300")}>
                                                                {asset.registrationExpiryDate || 'No Expiry'}
                                                            </span>
                                                        </TD>
                                                        <TD>
                                                            <div className="flex items-center gap-2 group/vin w-fit">
                                                                <code className="text-[11px] font-mono font-bold bg-slate-50 px-2 py-1 rounded-lg text-slate-500 border border-slate-200/50 shadow-inner">{asset.vin}</code>
                                                                <button onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.vin || ''); }} className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover/vin:opacity-100 shadow-sm border border-transparent hover:border-blue-100 bg-white">
                                                                    <Copy size={13} />
                                                                </button>
                                                            </div>
                                                        </TD>
                                                        <TD>
                                                            <div className="flex flex-col">
                                                                <span className="text-[13px] font-bold text-slate-900 leading-tight">{asset.make} {asset.model}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{asset.year} • {asset.color || 'White'}</span>
                                                            </div>
                                                        </TD>
                                                        <TD>
                                                            <span className="text-xs font-semibold text-slate-500 flex items-center gap-2">
                                                                <Calendar size={12} className="text-slate-300" /> {asset.insuranceAddedDate || '—'}
                                                            </span>
                                                        </TD>
                                                        <TD><Badge variant={asset.financialStructure}>{asset.financialStructure}</Badge></TD>
                                                        <TD align="center">
                                                            {(() => {
                                                                const stats = calculateAssetComplianceStats(asset);
                                                                if (stats.totalIssues === 0) {
                                                                    return <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100"><Check size={14} strokeWidth={3} /></div>;
                                                                }
                                                                return (
                                                                    <div className="flex flex-col gap-1 items-center">
                                                                        {stats.expired > 0 && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 whitespace-nowrap">
                                                                                {stats.expired} EXPIRED
                                                                            </span>
                                                                        )}
                                                                        {stats.expiringSoon > 0 && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
                                                                                {stats.expiringSoon} EXPIRING
                                                                            </span>
                                                                        )}
                                                                        {stats.missing > 0 && (
                                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 whitespace-nowrap">
                                                                                {stats.missing} MISSING
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </TD>
                                                        <TD><Badge variant={asset.operationalStatus}>{asset.operationalStatus}</Badge></TD>
                                                        <TD align="right" className="pr-6">
                                                            <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity relative">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-9 w-9 hover:text-[#2563EB] hover:bg-blue-50 rounded-xl"
                                                                    onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setIsModalOpen(true); }}
                                                                >
                                                                    <Edit2 size={15} />
                                                                </Button>
                                                                <div className="relative">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-9 w-9 rounded-xl"
                                                                        onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(openActionMenuId === asset.id ? null : asset.id); }}
                                                                    >
                                                                        <MoreHorizontal size={18} />
                                                                    </Button>

                                                                    {openActionMenuId === asset.id && (
                                                                        <>
                                                                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenActionMenuId(null); }} />
                                                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[100] p-1.5" onClick={(e) => e.stopPropagation()}>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); setEditingAsset(asset); setIsModalOpen(true); setOpenActionMenuId(null); }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-all"
                                                                                >
                                                                                    <Edit2 size={14} /> Edit Asset
                                                                                </button>
                                                                                <div className="h-px bg-slate-100 my-1" />
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); /* Add delete handler here */ }}
                                                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-all"
                                                                                >
                                                                                    <Trash2 size={14} /> Delete
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </TD>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={11} className="py-24 text-center bg-slate-50/30">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="p-5 bg-white rounded-full shadow-sm border border-slate-100 text-slate-300">
                                                                <Search size={40} strokeWidth={1.25} />
                                                            </div>
                                                            <div>
                                                                <p className="text-base font-bold text-slate-900 tracking-tight">No assets found</p>
                                                                <p className="text-sm text-slate-500 mt-1">
                                                                    {hasActiveFilters
                                                                        ? 'Try clearing some filters or adjusting your search.'
                                                                        : 'Add an asset to get started.'}
                                                                </p>
                                                            </div>
                                                            {hasActiveFilters && (
                                                                <button
                                                                    type="button"
                                                                    onClick={clearAllFilters}
                                                                    className="mt-1 text-sm font-semibold text-blue-600 hover:text-blue-800"
                                                                >
                                                                    Clear all filters
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <PaginationBar
                                    totalItems={filteredAssets.length}
                                    currentPage={page}
                                    rowsPerPage={rowsPerPage}
                                    onPageChange={setPage}
                                    onRowsPerPageChange={(rows) => {
                                        setRowsPerPage(rows);
                                        setPage(1);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <AssetModal
                    asset={editingAsset}
                    onClose={() => { setIsModalOpen(false); setEditingAsset(null); }}
                    onSave={handleSaveAsset}
                    isSaving={isSaving}
                />
            )}
        </>
    );
}

export default AssetDirectoryPage;
