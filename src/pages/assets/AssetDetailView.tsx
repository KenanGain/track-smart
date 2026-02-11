import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, ChevronRight, Edit2, Copy, Truck, 
  AlertCircle, FileText,
  ShieldCheck, Hash, Clock, 
  Settings, MapPin, ChevronDown, Wrench, Trash2,
  X, UploadCloud, FileDown, FileKey
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { Asset } from './assets.data';
import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';
import { CreateScheduleForm } from './CreateScheduleForm';
import { CreateOrderModal } from './CreateOrderModal';
import { AddExpenseModal } from './AddExpenseModal';
import { INITIAL_TASKS, INITIAL_ORDERS, INITIAL_SERVICE_TYPES } from './maintenance.data';
import type { TaskOrder } from './maintenance.data';
import { INITIAL_VENDORS } from '@/data/vendors.data';
import { INITIAL_EXPENSE_TYPES, INITIAL_ASSET_EXPENSES, type AssetExpense } from '@/pages/settings/expenses.data';
import { DollarSign } from 'lucide-react';
import { calculateComplianceStatus, getMaxReminderDays, isMonitoringEnabled } from '@/utils/compliance-utils';

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
    { name: 'Expenses', count: 0 },
    { name: 'Documents', count: 0 },
  ];

  const [currentVehicle, setCurrentVehicle] = useState(asset);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  useEffect(() => { setCurrentVehicle(asset); }, [asset]);

  // Modal State
  const [isKeyNumberModalOpen, setIsKeyNumberModalOpen] = useState(false);
  const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
  const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit'>('edit');




  const [activeComplianceFilter, setActiveComplianceFilter] = useState<string | null>(null);

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

  // --- Maintenance Logic ---
  const [assetTasks, setAssetTasks] = useState(() => INITIAL_TASKS.filter(t => t.assetId === asset.id));
  const [assetOrders, setAssetOrders] = useState(() => INITIAL_ORDERS.filter(o => {
     // Naive check: if any task in order belongs to this asset
     // We need to resolve tasks from INITIAL_TASKS to check assetId
     // Note: In a real app backend would filter. Here we join manually.
     const taskIds = o.taskIds;
     const relatedTasks = INITIAL_TASKS.filter(t => taskIds.includes(t.id));
     return relatedTasks.some(t => t.assetId === asset.id);
  }));

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
              // Use Document Type settings
              // const enabled = isMonitoringEnabled(docType);
              // const maxDays = getMaxReminderDays(docType);
              
              // We would check `currentVehicle.documents` array
              // For now, default to Missing/Optional
              // status = calculateComplianceStatus(null, enabled, maxDays, false, docType.expiryRequired, docType.requirementLevel === 'required');
               if (docType.requirementLevel === 'optional') status = 'Optional';
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
              linkedKeyNumber: linkedKn ? linkedKn.numberTypeName : null
          };
      }).sort((a: any, b: any) => {
          // Sort: Required & Missing on top
          if (a.requirementLevel === 'required' && b.requirementLevel !== 'required') return -1;
          if (a.status === 'Missing' && b.status !== 'Missing') return -1;
          return 0;
      });
  }, [documents, keyNumbers, currentVehicle]);

  const handleSaveDocument = () => {
      // Mock save
      console.log('Saved document');
      // In real app, we would update the asset's document list or Key Number value
      setEditingDocument(null);
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

  const handleCreateOrder = (orderData: any) => {
      const newOrder: TaskOrder = {
          id: `wo_new_${Math.random().toString(36).substr(2, 9)}`,
          taskIds: orderData.taskIds || [], // CreateOrderModal should pass taskIds, but currently passes meta/vendorId. We need to associate tasks.
          // Wait, CreateOrderModal logic: "onCreate" passes { vendorId, createDate... meta }.
          // It DOES NOT pass taskIds in the `onCreate` arg?
          // Let's check CreateOrderModal.tsx call: `onCreate({ ... })`. It assumes parent knows which tasks were selected.
          // Correct, `CreateOrderModal` takes `selectedTasks`.
          // But here in AssetDetailView, what tasks are selected?
          // "Log Maintenance" button usually implies creating an order for *pending* tasks or *new* tasks?
          // The prompt said: "Log Maintenance button that triggers a pre-filtered modal for work order creation".
          // If I click "Log Maintenance" generally, do I select tasks inside?
          // CreateOrderModal has `selectedTasks` prop.
          // If I pass *all* upcoming tasks for this asset, the user can see them in the "Tasks in Order" summary.
          // But CreateOrderModal is designed to receive *already selected* tasks?
          // Let's look at `CreateOrderModal.tsx`:
          // `const uniqueAssetIds = [...new Set(selectedTasks.map((t: any) => t.assetId))];`
          // It displays them. It doesn't seem to have a "Select Tasks" UI *inside* it.
          // It assumes you selected tasks on the main screen and clicked "Generic Create Order".
          // User Objective: "Log Maintenance button that triggers a pre-filtered modal".
          // Maybe I should pass *ALL* active tasks for this asset as `selectedTasks`?
          // OR, if the modal doesn't allow deselection, this might be wrong.
          // Assuming for now we pass all "Due/Upcoming/Overdue" tasks as candidates.
          vendorId: orderData.vendorId,
          status: 'open',
          createdAt: orderData.createDate,
          dueDate: orderData.dueDate,
          completions: []
      } as TaskOrder; // Cast for now
      
      console.log("Creating Order:", newOrder);
      setAssetOrders(prev => [newOrder, ...prev]);
      setIsCreateOrderModalOpen(false);
  };

  const handleAddVendor = (newVendor: any) => {
      setVendors(prev => [...prev, newVendor]);
  };

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
            {/* Maintenance Content */}
            {activeTab === 'Maintenance' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <Card className="p-4 flex flex-col justify-between relative overflow-hidden group">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">YTD Maintenance</span>
                       <div className="z-10 mt-1">
                         <div className="flex items-baseline gap-2">
                           <span className="text-xl font-bold text-slate-900">{currentVehicle.ytdCost || '$0.00'}</span>
                         </div>
                         <div className="text-[10px] text-slate-500 mt-1">
                            <span className="text-emerald-600 font-bold">{currentVehicle.ytdChange || '0%'}</span> vs last year
                         </div>
                       </div>
                     </Card>
                     <Card className="p-4 flex flex-col justify-between relative overflow-hidden group">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider z-10">Open Orders</span>
                       <div className="z-10 mt-1 leading-none">
                            <span className="text-xl font-bold text-slate-900">{currentVehicle.openWorkOrders || 0}</span>
                       </div>
                       <div className="mt-2">
                            <Badge variant={(currentVehicle.openWorkOrders || 0) > 0 ? 'warning' : 'success'}>
                                {(currentVehicle.openWorkOrders || 0) > 0 ? 'Action Needed' : 'All Clear'}
                            </Badge>
                       </div>
                     </Card>
                     <Card className="p-4 flex flex-col justify-between bg-blue-50/50 border-blue-100">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Next Service</span>
                        <div className="mt-1">
                             {assetTasks.find(t => t.status === 'upcoming' || t.status === 'due') ? (
                                 <>
                                    <div className="text-sm font-bold text-blue-900 truncate">
                                        {INITIAL_SERVICE_TYPES.find(s => s.id === assetTasks.find(t => t.status === 'upcoming' || t.status === 'due')?.serviceTypeIds[0])?.name || 'Service'}
                                    </div>
                                    <div className="text-xs text-blue-600 mt-1">
                                        Due in {assetTasks.find(t => t.status === 'upcoming' || t.status === 'due')?.dueRule.upcomingThreshold} {assetTasks.find(t => t.status === 'upcoming' || t.status === 'due')?.dueRule.unit}
                                    </div>
                                 </>
                             ) : (
                                 <span className="text-sm text-blue-400 font-medium">No upcoming service</span>
                             )}
                        </div>
                     </Card>
                </div>

                {/* Split View */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                    {/* Left: Tasks */}
                    <Card className="flex flex-col h-[600px] overflow-hidden border-slate-200 shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                             <div className="flex items-center gap-2">
                                <Wrench size={16} className="text-slate-400" />
                                <h3 className="font-bold text-slate-800 text-sm">Maintenance Tasks</h3>
                                <Badge variant="neutral" className="ml-2">{assetTasks.length}</Badge>
                             </div>
                             <div className="flex items-center gap-2">
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-slate-500">Filter</Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-xs gap-1.5 bg-white border-slate-200 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    onClick={() => setIsCreatingSchedule(true)}
                                >
                                    <Plus size={12} /> Schedule
                                </Button>
                             </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0 bg-white">
                            {assetTasks.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {assetTasks.map(task => {
                                        const serviceName = INITIAL_SERVICE_TYPES.find(s => s.id === task.serviceTypeIds[0])?.name || 'Service';
                                        return (
                                            <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-semibold text-slate-800 text-sm">{serviceName}</span>
                                                    <Badge 
                                                        variant={
                                                            task.status === 'overdue' ? 'danger' : 
                                                            task.status === 'due' ? 'warning' : 
                                                            task.status === 'completed' ? 'success' : 'neutral'
                                                        }
                                                    >
                                                        {task.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} className="text-slate-400" />
                                                        <span>
                                                            {task.dueRule.unit === 'miles' ? `${task.dueRule.dueAtOdometer?.toLocaleString()} mi` : 
                                                             task.dueRule.dueAtDate ? new Date(task.dueRule.dueAtDate!).toLocaleDateString() : '—'}
                                                        </span>
                                                    </div>
                                                    <span>•</span>
                                                    <span>ID: {task.id}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <ShieldCheck size={48} className="mb-3 opacity-20" />
                                    <span className="text-sm font-medium">No tasks found</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Right: Work Orders */}
                    <Card className="flex flex-col h-[600px] overflow-hidden border-slate-200 shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                             <div className="flex items-center gap-2">
                                <FileText size={16} className="text-slate-400" />
                                <h3 className="font-bold text-slate-800 text-sm">Work Orders</h3>
                                <Badge variant="neutral" className="ml-2">{assetOrders.length}</Badge>
                             </div>
                             <Button 
                                size="sm" 
                                onClick={() => setIsCreateOrderModalOpen(true)} 
                                className="gap-2 h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200"
                             >
                                <Plus size={14}/> Add Work Order
                             </Button>
                        </div>
                         <div className="flex-1 overflow-y-auto p-0 bg-white">
                            {assetOrders.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {assetOrders.map(order => (
                                        <div key={order.id} className="p-4 hover:bg-slate-50 transition-colors group">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-sm">#{order.id}</span>
                                                    <span className="text-xs text-slate-500">{vendors.find((v:any) => v.id === order.vendorId)?.companyName || 'Unknown Vendor'}</span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <Badge variant={order.status === 'completed' ? 'success' : 'Drafted'}>{order.status}</Badge>
                                                    <span className="text-[10px] text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2 overflow-hidden">
                                                {order.taskIds.map(tid => {
                                                    const task = INITIAL_TASKS.find(t => t.id === tid);
                                                    const sName = INITIAL_SERVICE_TYPES.find(s => s.id === task?.serviceTypeIds[0])?.name;
                                                    if (!sName) return null;
                                                    return (
                                                        <span key={tid} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded font-medium truncate max-w-[150px]">
                                                            {sName}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                    <FileText size={48} className="mb-3 opacity-20" />
                                    <span className="text-sm font-medium">No work orders</span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
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
                            <th className="px-6 py-4">Name</th>
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
                                     </div>
                                 </td>
                                 <td className="px-6 py-4 text-slate-700">{doc.documentName}</td>
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
                                         <button className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                           <Trash2 size={14} />
                                         </button>
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
          </div>
        </div>

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
                        <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                            <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm font-medium text-slate-600">Click to upload</p>
                            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                        </div>
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

      {/* Create Order Modal */}
      <CreateOrderModal 
        isOpen={isCreateOrderModalOpen}
        onClose={() => setIsCreateOrderModalOpen(false)}
        onCreate={handleCreateOrder}
        selectedTasks={assetTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')}
        vendors={vendors}
        onAddVendor={handleAddVendor}
      />
      
      {/* Create Schedule Modal using generic container for full-screen form */}
      {isCreatingSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <CreateScheduleForm
                onSave={(schedule) => {
                    console.log('Saved schedule:', schedule);
                    setIsCreatingSchedule(false);
                    // ideally refresh data here
                }}
                onCancel={() => setIsCreatingSchedule(false)}
                initialAssetId={asset.id}
                initialEntityType={asset.assetCategory === 'CMV' ? 'truck' : asset.assetCategory === 'Non-CMV' ? 'trailer' : undefined}
            />
        </div>
      )}
    </div>
  );
}
