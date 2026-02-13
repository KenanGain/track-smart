import React, { useState, useMemo } from 'react';
import { calculateAssetComplianceStats } from '@/utils/compliance-utils';
import {
    Search, Plus, Download, MoreHorizontal,
    Check, Edit2, FileText,
    RotateCcw, Trash2, Copy, Calendar, Truck,
    AlertCircle, Briefcase, LayoutGrid, XCircle
} from 'lucide-react';
import { INITIAL_ASSETS, type Asset } from './assets.data';
import { AssetModal } from './AssetModal';
import { AssetDetailView, type DetailedAsset } from './AssetDetailView';

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
export function AssetDirectoryPage({ isEmbedded = false }: { isEmbedded?: boolean }) {
    const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
    const [activeTab, setActiveTab] = useState('all');
    const [search, setSearch] = useState("");
    const [activeStatusFilter, setActiveStatusFilter] = useState('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<DetailedAsset | null>(null);

    const stats = useMemo(() => ({
        total: assets.length,
        active: assets.filter(a => a.operationalStatus === 'Active').length,
        deactivated: assets.filter(a => a.operationalStatus === 'Deactivated').length,
        maintenance: assets.filter(a => a.operationalStatus === 'Maintenance').length,
        outOfService: assets.filter(a => a.operationalStatus === 'OutOfService').length,
        draft: assets.filter(a => a.operationalStatus === 'Drafted').length
    }), [assets]);

    const filteredAssets = useMemo(() => {
        return assets.filter(a => {
            if (activeTab === 'trucks' && a.assetCategory !== 'CMV') return false;
            if (activeTab === 'trailers' && a.assetType !== 'Trailer') return false;
            if (activeStatusFilter !== 'all' && a.operationalStatus !== activeStatusFilter) return false;
            if (search) {
                const s = search.toLowerCase();
                return [a.unitNumber, a.vin, a.make, a.model, a.plateNumber].some(v => v?.toLowerCase().includes(s));
            }
            return true;
        });
    }, [assets, search, activeTab, activeStatusFilter]);

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
                />
            ) : (
                <div className={isEmbedded ? "w-full flex flex-col bg-[#F8FAFC] text-slate-900" : "h-full flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden"}>
                    {/* HEADER SECTION */}
                    <div className={isEmbedded ? "px-0 pt-0 pb-6 shrink-0 space-y-4 bg-transparent border-b-0 z-20" : "px-6 pt-6 pb-6 shrink-0 space-y-6 bg-white border-b border-slate-200/60 shadow-sm z-20"}>
                        <div className={isEmbedded ? "flex flex-col gap-4" : "flex flex-col gap-6"}>
                            <div className="flex justify-between items-center">
                                <h1 className={isEmbedded ? "hidden" : "text-2xl font-bold text-slate-900 tracking-tight"}>Assets</h1>
                                <div className={isEmbedded ? "flex items-center gap-3 w-full justify-end" : "flex items-center gap-3"}>
                                    <Button variant="outline" size="sm" className="gap-2 bg-white border-slate-200 text-slate-600"><Download size={14} /> Export</Button>
                                    <Button onClick={() => { setEditingAsset(null); setIsModalOpen(true); }} size="sm" className="gap-2 px-5 text-xs font-bold uppercase tracking-widest shadow-md">
                                        <Plus size={16} /> Add Asset
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* TAB NAVIGATION */}
                        <div className="flex items-center gap-8 relative overflow-x-auto scrollbar-hide">
                            {TABS.map((tab) => (
                                <div key={tab.id} className="flex items-center gap-1 relative">
                                    <button
                                        onClick={() => { setActiveTab(tab.id); }}
                                        className={cn(
                                            "flex items-center gap-2 pb-3.5 px-0.5 text-xs font-semibold transition-all relative group",
                                            activeTab === tab.id ? 'text-[#2563EB]' : 'text-slate-400 hover:text-slate-600'
                                        )}
                                    >
                                        <tab.icon size={14} strokeWidth={2.5} />
                                        <span>{tab.label}</span>
                                    </button>

                                    {activeTab === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-[2.5px] bg-[#2563EB] rounded-full shadow-sm" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* MAIN LIST VIEW */}
                    <div className={isEmbedded ? "flex flex-col w-full" : "flex-1 flex flex-col overflow-hidden"}>
                        <div className={isEmbedded ? "pt-6 pb-2" : "px-6 pt-6 pb-2"}>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                                <button onClick={() => setActiveStatusFilter('all')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeStatusFilter === 'all' ? 'ring-1 ring-blue-500 border-l-blue-500' : 'border-l-blue-500 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-blue-50 text-blue-600"><LayoutGrid className="w-4 h-4" /></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Assets</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{stats.total}</div>
                                </button>
                                <button onClick={() => setActiveStatusFilter('Active')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeStatusFilter === 'Active' ? 'ring-1 ring-emerald-500 border-l-emerald-500' : 'border-l-emerald-500 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><Check className="w-4 h-4" /></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Active<br />Assets</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{stats.active}</div>
                                </button>
                                <button onClick={() => setActiveStatusFilter('Maintenance')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeStatusFilter === 'Maintenance' ? 'ring-1 ring-rose-500 border-l-rose-500' : 'border-l-rose-500 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-rose-50 text-rose-600"><RotateCcw className="w-4 h-4" /></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">In<br />Maintenance</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{stats.maintenance}</div>
                                </button>
                                <button onClick={() => setActiveStatusFilter('OutOfService')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeStatusFilter === 'OutOfService' ? 'ring-1 ring-amber-500 border-l-amber-500' : 'border-l-amber-500 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-amber-50 text-amber-600"><AlertCircle className="w-4 h-4" /></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Out of<br />Service</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{stats.outOfService}</div>
                                </button>
                                <button onClick={() => setActiveStatusFilter('Drafted')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeStatusFilter === 'Drafted' ? 'ring-1 ring-blue-400 border-l-blue-400' : 'border-l-blue-400 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-blue-50 text-blue-500"><FileText className="w-4 h-4" /></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Draft<br />Assets</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{stats.draft}</div>
                                </button>
                                <button onClick={() => setActiveStatusFilter('Deactivated')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${activeStatusFilter === 'Deactivated' ? 'ring-1 ring-slate-500 border-l-slate-500' : 'border-l-slate-500 border-slate-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-slate-100 text-slate-600"><XCircle className="w-4 h-4" /></div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Deactivated<br />Assets</span>
                                    </div>
                                    <div className="text-xl font-bold text-slate-900">{stats.deactivated}</div>
                                </button>
                            </div>

                            <div className="relative w-full max-w-xl mb-6">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <Input
                                    placeholder="Search Unit #, VIN, Plate..."
                                    className="pl-10 h-11 text-[13px] bg-white shadow-sm border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all w-full"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={isEmbedded ? "w-full flex flex-col pt-4" : "flex-1 p-6 overflow-hidden flex flex-col"}>
                            <div className={isEmbedded ? "bg-white rounded-2xl border border-slate-200/60 flex flex-col shadow-sm" : "bg-white rounded-2xl border border-slate-200/60 flex-1 flex flex-col overflow-hidden shadow-sm"}>
                                <div className={isEmbedded ? "overflow-visible" : "flex-1 overflow-auto"}>
                                    <table className="w-full text-left border-collapse min-w-[1300px]">
                                        <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10">
                                            <tr>
                                                <TH className="w-32 pl-6">Unit #</TH>
                                                <TH className="w-40">Type</TH>
                                                <TH className="w-48">Plate (No. / State)</TH>
                                                <TH className="w-32">Plate Expiry</TH>
                                                <TH className="w-56">VIN</TH>
                                                <TH>Make / Model / Year</TH>
                                                <TH className="w-32">Date Added</TH>
                                                <TH className="w-32">Ownership</TH>
                                                <TH className="w-32 text-center">Compliance</TH>
                                                <TH className="w-32">Status</TH>
                                                <TH align="right" className="w-24 pr-6">Actions</TH>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 text-slate-600">
                                            {filteredAssets.length > 0 ? (
                                                filteredAssets.map((asset) => (
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
                                                    <td colSpan={10} className="py-32 text-center bg-slate-50/30">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="p-6 bg-white rounded-full shadow-sm border border-slate-100 text-slate-200">
                                                                <Search size={48} strokeWidth={1} />
                                                            </div>
                                                            <p className="text-base font-bold text-slate-900 tracking-tight">No assets found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
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
