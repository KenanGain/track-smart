import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, ChevronRight, Edit2, Copy, Truck, 
  AlertCircle, FileText,
  ShieldCheck, Hash, Clock, 
  Settings, Box, Wrench, MapPin, ChevronDown 
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { Asset } from './assets.data';
import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';

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

const Avatar = ({ src, initials, color = "bg-slate-200" }: { src?: string; initials?: string; color?: string }) => (
  <div className={`h-8 w-8 rounded-full ring-2 ring-white flex items-center justify-center text-xs font-bold text-slate-600 ${color} overflow-hidden`}>
    {src ? <img src={src} alt="avatar" className="h-full w-full object-cover" /> : initials}
  </div>
);

// --- Detail View Components ---

const VehicleImageDisplay = ({ src, alt }: { src?: string; alt?: string }) => {
    const [error, setError] = useState(false);
    
    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || error) {
        return (
            <div className="flex flex-col items-center justify-center text-slate-300 h-full w-full animate-in fade-in duration-500">
                <Truck size={64} strokeWidth={1} />
                <span className="text-[10px] font-bold mt-3 uppercase tracking-widest text-slate-400">No Image Available</span>
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

const RiskScoreWidget = ({ score }: { score: number }) => {
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

const MaintenanceRow = ({ date, type, vendor, cost, status }: { date: string; type: string; vendor: string; cost: string; status: string }) => {
  const getStatusVariant = (s: string) => {
    switch(s.toLowerCase()) {
      case 'completed': return 'success';
      case 'pending': return 'pending';
      case 'overdue': return 'danger';
      case 'scheduled': return 'blue';
      default: return 'neutral';
    }
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 group">
      <td className="px-6 py-4 text-sm text-slate-900 font-medium whitespace-nowrap">{date}</td>
      <td className="px-6 py-4 text-sm text-slate-600">
        <div className="font-medium text-slate-900">{type.split('(')[0].trim()}</div>
        {type.includes('(') && <div className="text-xs text-slate-400 mt-0.5">{type.split('(')[1].replace(')', '')}</div>}
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{vendor}</td>
      <td className="px-6 py-4 text-sm text-slate-900 font-medium">{cost}</td>
      <td className="px-6 py-4"><Badge variant={getStatusVariant(status)}>{status}</Badge></td>
      <td className="px-6 py-4 text-right">
        <button className="p-1.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronRight size={16} />
        </button>
      </td>
    </tr>
  );
};

const TaskItem = ({ title, statusLabel, statusColor, subLabel, isCritical }: { title: string; statusLabel: string; statusColor: string; subLabel?: string; isCritical?: boolean }) => (
  <div className="flex items-center justify-between p-4 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer group border border-transparent hover:border-slate-200">
    <div className="flex items-start gap-3">
      <div className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${isCritical ? 'bg-rose-500' : 'bg-slate-300'}`} />
      <div>
        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{title}</h4>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <Badge variant={statusColor} className="text-[10px] px-1.5 py-0 h-5">{statusLabel}</Badge>
          <span className="text-xs text-slate-500">{subLabel}</span>
        </div>
      </div>
    </div>
    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500" />
  </div>
);

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

interface AssetDetailViewProps {
    asset: DetailedAsset;
    onBack: () => void;
    onEdit: () => void;
}

export function AssetDetailView({ asset, onBack, onEdit }: AssetDetailViewProps) {
  const [activeTab, setActiveTab] = useState('Compliance Monitoring');
  
  const tabs = [
    { name: 'Compliance Monitoring', count: 0 },
    { name: 'Notifications', count: 3, alert: true },
    { name: 'Violations', count: 0 },
    { name: 'Maintenance', count: 0 },
    { name: 'Repair & Expenses', count: 0 },
    { name: 'Documents', count: 0 },
  ];

  const [currentVehicle, setCurrentVehicle] = useState(asset);
  useEffect(() => { setCurrentVehicle(asset); }, [asset]);

  // Modal State
  const [isKeyNumberModalOpen, setIsKeyNumberModalOpen] = useState(false);
  const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
  const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit'>('edit');

  // Helper to calculate status
  const getStatus = (expiryDate: string | null | undefined) => {
    if (!expiryDate) return 'Active';
    const today = new Date();
    const exp = new Date(expiryDate);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Active';
  };


  const [activeComplianceFilter, setActiveComplianceFilter] = useState<string | null>(null);

  const { keyNumbers, tagSections, getDocumentTypeById } = useAppData();

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
            const hasValue = value && value.trim() !== '' && value !== '—';
            
            // Calculate status
            let status = 'Missing';
             if (hasValue) {
                if (kn.hasExpiry) {
                    if (expiryDate) {
                        const today = new Date();
                        const exp = new Date(expiryDate);
                        const diffTime = exp.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        if (diffDays < 0) status = 'Expired';
                        else if (diffDays <= 30) status = 'Expiring Soon';
                        else status = 'Active';
                    } else {
                        status = 'Incomplete'; // Has value but missing required expiry
                    }
                } else {
                    status = 'Active';
                }
            } else {
                // If it's system/critical like Plate/VIN, it's missing
                if (kn.numberRequired) status = 'Missing';
                else status = 'Optional'; // Or just empty state
            }

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

        const hasValue = value && value.trim() !== '' && value !== '—';
        if (hasValue) {
             if (kn.hasExpiry) {
                if (expiryDate) {
                    const today = new Date();
                    const exp = new Date(expiryDate);
                    const diffTime = exp.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (diffDays < 0) expired++;
                    else if (diffDays <= 30) expiring++;
                } else {
                    missingExpiry++;
                }
             }
        } else {
            if (kn.numberRequired) missingNumber++;
        }
        total++;
    });

     return { total, expired, expiring, missingNumber, missingExpiry, missingDoc: 0 }; 
  }, [keyNumbers, currentVehicle]);

  return (
    <div className="font-sans text-slate-900 flex flex-col h-full bg-slate-50">
      <main className="flex-1 min-w-0 pb-12 overflow-y-auto">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-transparent px-8 flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onBack}
                className="gap-2 text-slate-600 border-slate-200 bg-white hover:bg-slate-50"
              >
                  <ChevronRight size={14} className="rotate-180" /> Back to List
              </Button>
              <div className="h-4 w-px bg-slate-300 mx-2" />
              <nav className="flex items-center text-sm font-medium text-slate-500">
                <span className="text-slate-400">Account</span>
                <ChevronRight size={14} className="mx-2 text-slate-300" />
                <span className="hover:text-slate-900 cursor-pointer transition-colors" onClick={onBack}>Assets</span>
                <ChevronRight size={14} className="mx-2 text-slate-300" />
                <span className="text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded text-xs font-semibold shadow-sm">Unit #{currentVehicle.unitNumber}</span>
              </nav>
          </div>
        </header>

        <div className="px-8 pb-8 pt-6 w-full space-y-6">
          
          {/* Header Card */}
          <Card className="overflow-hidden">
            <div className="p-6 pb-8">
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Left: Image */}
                <div className="relative w-full lg:w-80 flex-shrink-0">
                  <div className="aspect-[16/10] bg-slate-50 rounded-xl overflow-hidden border border-slate-100 relative group">
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white to-slate-100">
                      <VehicleImageDisplay src={currentVehicle.image} alt={currentVehicle.unitNumber} />
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge variant={currentVehicle.operationalStatus === 'Active' ? 'success' : 'warning'} className="shadow-sm font-bold tracking-wider px-3 py-1 text-[10px]">
                        {currentVehicle.operationalStatus}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Center: Info */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 leading-tight">Unit #{currentVehicle.unitNumber} - {currentVehicle.year} {currentVehicle.make} {currentVehicle.model}</h1>
                      <p className="text-slate-500 text-sm mt-1 font-medium">{currentVehicle.assetType} - {currentVehicle.vehicleType}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={onEdit} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-500/30 transition-all flex items-center gap-2">
                        <Settings size={16} /> Edit Vehicle
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 mt-6">
                    <div className="space-y-1.5 relative">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Drivers</span>
                      <div className="flex items-center gap-4 pt-1 flex-wrap">
                        {currentVehicle.drivers?.map((driver, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <Avatar initials={driver.initials} color={driver.color} />
                            <span className="text-sm font-bold text-slate-900">{driver.name}</span>
                          </div>
                        )) || <span className="text-sm text-slate-400">No drivers assigned</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-12">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</span>
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-sm">
                          <MapPin size={16} className="text-slate-400" /> {currentVehicle.location || 'Not specified'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Odometer</span>
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-lg leading-none">
                          {currentVehicle.odometer ? currentVehicle.odometer.toLocaleString() : '0'} <span className="text-xs font-medium text-slate-400 mt-1">{currentVehicle.odometerUnit || 'mi'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Scores */}
                <div className="flex lg:flex-col xl:flex-row gap-8 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 items-center justify-center lg:justify-start">
                  <RiskScoreWidget score={currentVehicle.riskScore || 100} />
                  <div className="flex flex-col gap-3 w-full sm:w-auto min-w-[130px]">
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Health</span>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${currentVehicle.health === 'Good' ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-amber-500 ring-4 ring-amber-500/20'}`}></div>
                        <span className={`font-bold text-sm ${currentVehicle.health === 'Good' ? 'text-emerald-700' : 'text-amber-700'}`}>{currentVehicle.health || 'Good'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata Row */}
              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-6">
                <MetadataItem label="Unit #" value={currentVehicle.unitNumber} copyable={true} />
                <MetadataItem label="VIN #" value={currentVehicle.vin} copyable={true} />
                <MetadataItem label="Plate #" value={currentVehicle.plateNumber || '—'} copyable={true} />
                <MetadataItem label="Plate State" value={currentVehicle.plateJurisdiction || '—'} />
                <MetadataItem label="Plate Expiry" value={currentVehicle.registrationExpiryDate || '—'} warning={getStatus(currentVehicle.registrationExpiryDate) !== 'Active'} />
                
                <MetadataItem label="Gross Weight" value={currentVehicle.grossWeight ? `${currentVehicle.grossWeight.toLocaleString()} ${currentVehicle.grossWeightUnit}` : '—'} />
                <MetadataItem label="Unloaded Weight" value={currentVehicle.unloadedWeight ? `${currentVehicle.unloadedWeight.toLocaleString()} ${currentVehicle.unloadedWeightUnit}` : '—'} />
                <MetadataItem label="Ownership" value={currentVehicle.financialStructure} />
                <MetadataItem label="Market Value" value={currentVehicle.marketValue ? `$${currentVehicle.marketValue.toLocaleString()}` : '—'} />
                
                {currentVehicle.financialStructure === 'Leased' && currentVehicle.lessorCompanyName && (
                    <MetadataItem label="Lessor" value={currentVehicle.lessorCompanyName} />
                )}
                {currentVehicle.financialStructure === 'Financed' && currentVehicle.lienHolderName && (
                    <MetadataItem label="Lien Holder" value={currentVehicle.lienHolderName} />
                )}
                
                 <MetadataItem label="Date Added" value={currentVehicle.dateAdded || '—'} />
              </div>
            </div>
          </Card>

          {/* Tabs Navigation */}
          <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button key={tab.name} onClick={() => setActiveTab(tab.name)} className={`relative py-4 px-4 text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === tab.name ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-t-lg'}`}>
                {tab.name}
                {tab.alert && <span className="h-1.5 w-1.5 bg-rose-500 rounded-full"></span>}
                {activeTab === tab.name && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></span>}
              </button>
            ))}
          </div>

          <div className="mt-6">
            {/* Compliance Monitoring Content - NOW IN LIST VIEW */}
            {activeTab === 'Compliance Monitoring' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* Stats Summary Area - NEW FILTERS */}
                <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'missing-number' ? null : 'missing-number')} className={`flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow transition-all min-w-[200px] group ${activeComplianceFilter === 'missing-number' ? 'ring-2 ring-rose-500 border-rose-500' : 'border-l-4 border-l-rose-500 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-rose-50 text-rose-500 group-hover:bg-rose-100 transition-colors"><Hash size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Number</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{complianceStats.missingNumber}</div>
                    </button>

                    <button onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'missing-expiry' ? null : 'missing-expiry')} className={`flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow transition-all min-w-[200px] group ${activeComplianceFilter === 'missing-expiry' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-l-4 border-l-amber-500 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors"><Clock size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Expiry</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{complianceStats.missingExpiry}</div>
                    </button>

                    <button onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'missing-doc' ? null : 'missing-doc')} className={`flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow transition-all min-w-[200px] group ${activeComplianceFilter === 'missing-doc' ? 'ring-2 ring-orange-500 border-orange-500' : 'border-l-4 border-l-orange-500 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-orange-50 text-orange-500 group-hover:bg-orange-100 transition-colors"><FileText size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Missing<br />Doc</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{complianceStats.missingDoc}</div>
                    </button>
                    
                    <button onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'expiring' ? null : 'expiring')} className={`flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow transition-all min-w-[200px] group ${activeComplianceFilter === 'expiring' ? 'ring-2 ring-yellow-500 border-yellow-500' : 'border-l-4 border-l-yellow-500 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-yellow-50 text-yellow-500 group-hover:bg-yellow-100 transition-colors"><Clock size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Expiring<br />Soon</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{complianceStats.expiring}</div>
                    </button>

                    <button onClick={() => setActiveComplianceFilter(activeComplianceFilter === 'expired' ? null : 'expired')} className={`flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm hover:shadow transition-all min-w-[200px] group ${activeComplianceFilter === 'expired' ? 'ring-2 ring-rose-600 border-rose-600' : 'border-l-4 border-l-rose-600 border-slate-200'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors"><AlertCircle size={16} /></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Expired<br />Items</span>
                        </div>
                        <div className="text-xl font-bold text-slate-900">{complianceStats.expired}</div>
                    </button>
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

            {/* Maintenance Content */}
            {activeTab === 'Maintenance' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="xl:col-span-1 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity rotate-12">
                        <Box size={100} className="text-blue-900" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider z-10">YTD Cost</span>
                      <div className="z-10">
                        <div className="flex items-baseline gap-2 relative">
                          <span className="text-2xl font-bold text-slate-900 tracking-tight">{currentVehicle.ytdCost || '$0.00'}</span>
                        </div>
                        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${(currentVehicle.ytdChange || '').startsWith('+') ? 'text-emerald-700 bg-emerald-50 border-emerald-100' : 'text-blue-700 bg-blue-50 border-blue-100'}`}>
                          <span className="font-bold">{currentVehicle.ytdChange || '0%'}</span>
                        </div>
                      </div>
                    </Card>
                    
                    <Card className="p-5 flex flex-col justify-between h-[140px] relative overflow-hidden group">
                      <div className="absolute -right-4 -top-4 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity rotate-12">
                        <Wrench size={100} className="text-amber-900" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider z-10">Open Work Orders</span>
                      <div className="z-10 relative">
                        <span className="text-2xl font-bold text-slate-900 tracking-tight">{currentVehicle.openWorkOrders || 0}</span>
                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant={(currentVehicle.openWorkOrders || 0) > 0 ? 'warning' : 'success'} className="px-2 py-1 border border-amber-100">
                              {(currentVehicle.openWorkOrders || 0) > 0 ? currentVehicle.woStatus : 'Healthy'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Card className="flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm">Upcoming Tasks</h3>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {currentVehicle.tasks?.map((task, i) => <TaskItem key={i} {...task} />) || (
                        <div className="p-8 text-center text-slate-400 text-sm">No upcoming tasks scheduled.</div>
                      )}
                    </div>
                  </Card>
                </div>

                <div className="xl:col-span-2">
                  <Card className="h-full flex flex-col">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">Service History</h3>
                        <p className="text-xs font-medium text-slate-400 mt-1">Recent maintenance records and work orders</p>
                      </div>
                      <Button size="sm" className="gap-2"><Plus size={16}/> Log Maintenance</Button>
                    </div>
                    
                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service Type</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vendor</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 bg-white">
                          {currentVehicle.history?.map((service, index) => <MaintenanceRow key={index} {...service} />) || (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">No service history available</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
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
    </div>
  );
}
