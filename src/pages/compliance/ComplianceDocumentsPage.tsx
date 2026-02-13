import React, { useState, useMemo } from 'react';
import {
    FileText,
    AlertTriangle,
    CalendarX,
    Clock,
    FileWarning,
    X,
    FileKey,
    Edit3,
    UploadCloud,
    Plus,
    Check,
    ChevronDown,
    Hash,
    LayoutGrid,
    Truck,
    User,
    Download,
    RotateCcw,
    AlertCircle,
    XCircle,
    UserCheck,
    Search,
    Users,
    UserMinus,
    UserX,
    ArrowUpDown,
    Columns
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { DocumentType, ColorTheme } from '@/data/mock-app-data';
import { INITIAL_ASSETS as MOCK_ASSETS, type Asset, type Driver } from '@/pages/assets/assets.data';
import { MOCK_DRIVERS } from '@/pages/profile/carrier-profile.data';
import { THEME_STYLES } from '@/pages/settings/tags/tag-utils';
import { INITIAL_EXPENSE_TYPES } from '@/pages/settings/expenses.data';
import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';
import { AssetModal } from '@/pages/assets/AssetModal';
import { calculateComplianceStatus, getMaxReminderDays, isMonitoringEnabled, calculateDriverComplianceStats } from '@/utils/compliance-utils';

// --- HELPER COMPONENTS (Copied from CarrierProfilePage for consistency) ---

const Badge = ({ text, tone, className = "" }: { text: string; tone: string; className?: string }) => {
    const styles =
        tone === 'success' ? "bg-green-100 text-green-700 border-green-200" :
            tone === 'purple' ? "bg-purple-100 text-purple-700 border-purple-200" :
                tone === 'info' ? "bg-blue-100 text-blue-700 border-blue-200" :
                    tone === 'danger' ? "bg-red-100 text-red-700 border-red-200" :
                        tone === 'warning' ? "bg-orange-100 text-orange-700 border-orange-200" :
                            tone === 'yellow' ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                "bg-gray-100 text-gray-700 border-gray-200";
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}>{text}</span>;
};

// Simplified Card
const Card = ({ title, icon: Icon, children, rightAction, fullWidth = false, className = "", noPadding=false, onEdit }: { title: string; icon: any; children: React.ReactNode; rightAction?: React.ReactNode; fullWidth?: boolean; className?: string; noPadding?: boolean; onEdit?: () => void }) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${fullWidth ? 'col-span-1 lg:col-span-2' : ''} ${className}`}>
            <div className={`flex items-center justify-between p-6 pb-2 ${noPadding ? 'border-b border-slate-200' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {rightAction}
                    {onEdit && (
                        <button onClick={onEdit} className="text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors p-2 rounded-full" title="Edit Section">
                            <Edit3 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
            <div className={`${noPadding ? 'p-0' : 'p-6 pt-4'} flex-1`}>
                {children}
            </div>
        </div>
    );
};

const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
    if (!visible) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[60] animate-fade-in-up">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
    );
};

export // Helper Component for Stats Buttons
const ComplianceStatsButton = ({ 
    icon: Icon, 
    label, 
    count, 
    isActive, 
    color, 
    onClick 
}: { 
    icon: any; 
    label: React.ReactNode; 
    count: number; 
    isActive: boolean; 
    color: 'red' | 'orange' | 'yellow' | 'blue'; 
    onClick: () => void; 
}) => {
    const colorStyles = {
        red: {
             active: 'ring-1 ring-red-600 border-l-red-600',
             inactive: 'border-l-red-600 border-slate-200',
             iconBg: 'bg-red-50',
             iconColor: 'text-red-600'
        },
        orange: {
             active: 'ring-1 ring-orange-500 border-l-orange-500',
             inactive: 'border-l-orange-500 border-slate-200',
             iconBg: 'bg-orange-50',
             iconColor: 'text-orange-600'
        },
        yellow: {
             active: 'ring-1 ring-yellow-500 border-l-yellow-500',
             inactive: 'border-l-yellow-500 border-slate-200',
             iconBg: 'bg-yellow-50',
             iconColor: 'text-yellow-600'
        },
        blue: {
             active: 'ring-1 ring-blue-500 border-l-blue-500',
             inactive: 'border-l-blue-500 border-slate-200',
             iconBg: 'bg-blue-50',
             iconColor: 'text-blue-600'
        }
    };

    const styles = colorStyles[color];

    return (
        <button 
            onClick={onClick} 
            className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${isActive ? styles.active : styles.inactive}`}
        >
            <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-full ${styles.iconBg} ${styles.iconColor}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">
                    {label}
                </span>
            </div>
            <div className="text-lg font-bold text-slate-900">{count}</div>
        </button>
    );
};

export const ComplianceDocumentsPage = () => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'compliance' | 'documents'>('compliance');
    // New sub-filter for Entity Type
    const [activeEntityFilter, setActiveEntityFilter] = useState<'Carrier' | 'Asset' | 'Driver'>('Carrier'); // Default to Carrier
    const [activeSubCategory, setActiveSubCategory] = useState<'ALL' | 'CMV' | 'NON_CMV'>('ALL'); // New: Sub-category for Asset/Driver
    const [assetStatusFilter, setAssetStatusFilter] = useState<'ALL' | 'Active' | 'Maintenance' | 'OutOfService' | 'Deactivated'>('ALL'); // New: Status filter

    // Reset sub-category and status when entity changes
    React.useEffect(() => {
        setActiveSubCategory('ALL');
        setAssetStatusFilter('ALL');
    }, [activeEntityFilter]);

    const [complianceFilter, setComplianceFilter] = useState('all');
    const [documentFilter, setDocumentFilter] = useState('all');
    const [keyNumberGroupsCollapsed, setKeyNumberGroupsCollapsed] = useState<Record<string, boolean>>({ carrier: false, bond: false, other: false, regulatory: false, tax: false });
    
    const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
    const [editingDocument, setEditingDocument] = useState<any | null>(null); // Type inferred from usage
    const [viewingDocument, setViewingDocument] = useState<any | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null); // New state for selected asset
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null); // New state for selected driver
    
    // UI State for Asset List
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 6;

    // Reset pagination when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [activeSubCategory, searchQuery, activeEntityFilter]);
    
    // Reset selection when entity filter changes
    React.useEffect(() => {
        setSelectedAsset(null);
        setSelectedDriver(null);
    }, [activeEntityFilter]);

    // --- ASSET STATE ---
    const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

    const [isSavingAsset, setIsSavingAsset] = useState(false);

    // --- SEARCH / SORT / COLUMN STATE ---
    // Key Numbers
    const [knSearch, setKnSearch] = useState('');
    const [knSort, setKnSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [knColumns, setKnColumns] = useState<Record<string, boolean>>({
        type: true,
        value: true,
        status: true,
        expiry: true,
        actions: true
    });
    const [isKnColumnDropdownOpen, setIsKnColumnDropdownOpen] = useState(false);

    // Documents
    const [docSearch, setDocSearch] = useState('');
    const [docSort, setDocSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [docColumns, setDocColumns] = useState<Record<string, boolean>>({
        type: true,
        name: true,
        folder: true,
        uploaded: true,
        status: true,
        expiry: true,
        actions: true
    });
    const [isDocColumnDropdownOpen, setIsDocColumnDropdownOpen] = useState(false);

    // Reset search/sort when main filters change
    React.useEffect(() => {
        setKnSearch('');
        setDocSearch('');
        setKnSort(null);
        setDocSort(null);
    }, [activeEntityFilter, activeSubCategory, selectedAsset, selectedDriver]);

    // --- DRIVER STATE (Refactor) ---
    const [driverSearch, setDriverSearch] = useState('');
    const [driverStatusFilter, setDriverStatusFilter] = useState('All');
    const [driverSort, setDriverSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [driverColumns, setDriverColumns] = useState<Record<string, boolean>>({
        name: true,
        id: true,
        status: true,
        compliance: true,
        license: true,
        contact: true,
        actions: true
    });
    const [isDriverColumnDropdownOpen, setIsDriverColumnDropdownOpen] = useState(false);

    const driverStats = useMemo(() => {
        return {
            total: MOCK_DRIVERS.length,
            active: MOCK_DRIVERS.filter(d => d.status === 'Active').length,
            inactive: MOCK_DRIVERS.filter(d => d.status === 'Inactive').length,
            terminated: MOCK_DRIVERS.filter(d => d.status === 'Terminated').length,
            onLeave: MOCK_DRIVERS.filter(d => d.status === 'On Leave').length
        };
    }, []);

    const filteredDriversList = useMemo(() => {
        let result = MOCK_DRIVERS.filter(driver => {
            const matchesSearch = (
                driver.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
                driver.id.toLowerCase().includes(driverSearch.toLowerCase()) ||
                driver.email.toLowerCase().includes(driverSearch.toLowerCase())
            );
            const matchesStatus = driverStatusFilter === 'All' || driver.status === driverStatusFilter;
            return matchesSearch && matchesStatus;
        });
        if (driverSort) {
            result = [...result].sort((a, b) => {
                let aVal: any, bVal: any;
                switch (driverSort.key) {
                    case 'name': aVal = a.name; bVal = b.name; break;
                    case 'id': aVal = a.id; bVal = b.id; break;
                    case 'status': aVal = a.status; bVal = b.status; break;
                    case 'license': aVal = a.licenseNumber || ''; bVal = b.licenseNumber || ''; break;
                    case 'contact': aVal = a.phone || a.email || ''; bVal = b.phone || b.email || ''; break;
                    default: return 0;
                }
                if (aVal < bVal) return driverSort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return driverSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [driverSearch, driverStatusFilter, driverSort]);

    // --- COMPUTED ASSET STATS ---
    const assetStats = useMemo(() => ({
        total: assets.length,
        active: assets.filter(a => a.operationalStatus === 'Active').length,
        maintenance: assets.filter(a => a.operationalStatus === 'Maintenance').length,
        outOfService: assets.filter(a => a.operationalStatus === 'OutOfService').length,
        deactivated: assets.filter(a => a.operationalStatus === 'Deactivated').length
    }), [assets]);

    // --- ASSET SORT STATE ---
    const [assetSort, setAssetSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
    const [assetColumns, setAssetColumns] = useState<Record<string, boolean>>({
        unitNumber: true,
        vin: true,
        type: true,
        compliance: true,
        status: true,
        actions: true
    });
    const [isAssetColumnDropdownOpen, setIsAssetColumnDropdownOpen] = useState(false);

    // --- FILTERED ASSETS ---
    const filteredAssetsList = useMemo(() => {
        let result = assets.filter(a => {
            // Sub-category filter
            if (activeSubCategory === 'CMV' && a.assetCategory !== 'CMV') return false;
            if (activeSubCategory === 'NON_CMV' && a.assetCategory === 'CMV') return false;
            
            // Status filter
            if (assetStatusFilter !== 'ALL' && a.operationalStatus !== assetStatusFilter) return false;
            
            // Search filter
            if (searchQuery) {
                const s = searchQuery.toLowerCase();
                return (
                    a.unitNumber.toLowerCase().includes(s) ||
                    a.vin.toLowerCase().includes(s) ||
                    a.assetType.toLowerCase().includes(s)
                );
            }
            return true;
        });
        if (assetSort) {
            result = [...result].sort((a, b) => {
                let aVal: any, bVal: any;
                switch (assetSort.key) {
                    case 'unitNumber': aVal = a.unitNumber; bVal = b.unitNumber; break;
                    case 'vin': aVal = a.vin; bVal = b.vin; break;
                    case 'type': aVal = a.assetType; bVal = b.assetType; break;
                    case 'status': aVal = a.operationalStatus; bVal = b.operationalStatus; break;
                    default: return 0;
                }
                if (aVal < bVal) return assetSort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return assetSort.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [assets, activeSubCategory, searchQuery, assetStatusFilter, assetSort]);

    const handleSaveAsset = (data: any) => {
        setIsSavingAsset(true);
        // Simulate API call
        setTimeout(() => {
            if (editingAsset) {
                setAssets(prev => prev.map(a => a.id === editingAsset.id ? { ...a, ...data } : a));
            } else {
                setAssets(prev => [{ ...data, id: `a${Date.now()}`, complianceStatus: 'Compliant' }, ...prev]);
            }
            setIsSavingAsset(false);
            setIsAssetModalOpen(false);
            setEditingAsset(null);
            showToast(editingAsset ? "Asset updated successfully" : "Asset created successfully");
        }, 600);
    };

    const [toast, setToast] = useState({ visible: false, message: "" });

    // --- DATA CONTEXT ---
    const { documents, keyNumbers, keyNumberValues, updateKeyNumberValue, getDocumentTypeById, tagSections } = useAppData();

    // --- HELPERS ---
    const showToast = (msg: string) => {
        setToast({ visible: true, message: msg });
        setTimeout(() => setToast({ visible: false, message: "" }), 3000);
    };

    const getStatusTone = (status: string) => {
        if (status === 'Active' || status === 'Valid' || status === 'Uploaded') return 'success';
        if (status === 'Missing' || status === 'Expired') return 'danger';
        if (status === 'Expiring Soon') return 'yellow';
        if (status === 'Incomplete') return 'warning';
        return 'gray';
    };

    const toggleKeyNumberGroup = (key: string) => setKeyNumberGroupsCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // Helper to get composite ID for storage
    const getKeyNumberStorageId = (configId: string) => {
        if (activeEntityFilter === 'Asset' && selectedAsset) {
            return `${selectedAsset.id}_${configId}`;
        }
        if (activeEntityFilter === 'Driver' && selectedDriver) {
            return `${selectedDriver.id}_${configId}`;
        }
        return configId;
    };

    // Helper to get value (from storage OR asset property fallback)
    const getKeyNumberData = (config: KeyNumberConfig) => {
        const storageId = getKeyNumberStorageId(config.id);
        const storedVal = keyNumberValues[storageId];
        
        // Return stored value if exists
        if (storedVal) return storedVal;

        // Fallback: If viewing an Asset, check if asset has this property populated
        if (activeEntityFilter === 'Asset' && selectedAsset) {
            const typeName = config.numberTypeName.toLowerCase();
            if (typeName.includes('vin')) return { value: selectedAsset.vin, expiryDate: '' };
            if (typeName.includes('plate') && !typeName.includes('expiry')) return { value: selectedAsset.plateNumber, expiryDate: '' }; // Simplified
        }
        
        // Fallback: If viewing a Driver
        if (activeEntityFilter === 'Driver' && selectedDriver) {
            // Add driver mapping logic here if needed, e.g. License Number
             // Simple name mapping maybe?
        }

        return null;
    };

    // Helper to calculate compliance summary for a row in the list
    const getComplianceSummary = (entityId: string, entityType: 'Asset' | 'Driver', subCategory: string = 'ALL') => {
        // Filter configs relevant to this entity type
        const relevantConfigs = keyNumbers.filter(kn => {
            if (kn.entityType !== entityType) return false;
            // Sub-category filter logic (mirrors main filter)
            if (entityType === 'Asset') {
                 if (subCategory === 'CMV') return !kn.numberTypeName.includes('Non-CMV');
                 if (subCategory === 'NON_CMV') return kn.numberTypeName.includes('Non-CMV') || (kn.category as string) === 'Non-CMV';
            }
            return true;
        });

        let missingNumbers = 0;
        let missingDocs = 0;
        let expired = 0;
        let expiringSoon = 0;
        let valid = 0;

        relevantConfigs.forEach(kn => {
            const storageId = `${entityId}_${kn.id}`;
            const val = keyNumberValues[storageId];
            
            // Check implicit data (fallback)
            let hasValue = val?.value && val.value.toString().trim() !== '';
            let hasDoc = val?.documents && val.documents.length > 0;

            const status = calculateComplianceStatus(
                val?.expiryDate,
                isMonitoringEnabled(kn),
                getMaxReminderDays(kn),
                !!val?.value, 
                kn.hasExpiry,
                kn.numberRequired ?? true
            );

            if (status === 'Missing') {
                if (!hasValue && (kn.numberRequired !== false)) missingNumbers++;
                else if (kn.documentRequired && !hasDoc) missingDocs++;
                else missingNumbers++; // Fallback if logic unclear
            }
            else if (status === 'Expired') expired++;
            else if (status === 'Expiring Soon') expiringSoon++;
            else valid++;
        });

        return { missingNumbers, missingDocs, expired, expiringSoon, valid };
    };    

    // --- DATA PREPARATION ---

    // 1. Compliance Groups (Filtered by Active Entity & Sub-Category)
    const complianceGroups = useMemo(() => {
        // Filter Key Numbers by Entity Type
        const filteredNumbers = keyNumbers.filter(
            (kn: KeyNumberConfig) => {
                if (kn.entityType !== activeEntityFilter) return false;
                if (kn.status !== 'Active') return false;
                
                // Sub-Category Filter (Note: KeyNumberTypes might not have explicit subCategory yet, so checks name or defaults)
                if (activeSubCategory === 'ALL') return true;
                if (activeSubCategory === 'CMV') return !kn.numberTypeName.includes('Non-CMV'); // Simple heuristic if data missing
                if (activeSubCategory === 'NON_CMV') return kn.numberTypeName.includes('Non-CMV') || (kn.category as string) === 'Non-CMV';
                return true;
            }
        );

        const grouped = filteredNumbers.reduce((acc, kn) => {
            const cat = kn.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(kn);
            return acc;
        }, {} as Record<string, KeyNumberConfig[]>);
        
        // ... (rest of logic unchanged)
    
        const groupList = Object.entries(grouped).map(([category, items]) => ({
            key: category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            label: category.toUpperCase(),
            items: items.map(kn => {
                // Use helper to get data (storage or fallback)
                const val = getKeyNumberData(kn);

                const hasValue = val?.value && val.value.toString().trim() !== ''; // Ensure string
                const hasExpiry = val?.expiryDate && val.expiryDate.trim() !== '';
                const hasDoc = val?.documents && val.documents.length > 0;

                // Calculate status
                const enabled = isMonitoringEnabled(kn);
                const maxDays = getMaxReminderDays(kn);
                
                const status = calculateComplianceStatus(
                    val?.expiryDate,
                    enabled,
                    maxDays,
                    !!hasValue,
                    kn.hasExpiry,
                    kn.numberRequired ?? true
                );

                let docStatus = kn.documentRequired ? 'Missing' : 'N/A';
                if (hasDoc) docStatus = 'Uploaded';

                // Calculate expiry display
                let expiryDisplay = '-';
                if (kn.hasExpiry) {
                    if (hasExpiry) {
                        expiryDisplay = val?.expiryDate!;
                    } else {
                        expiryDisplay = 'Not set';
                    }
                }

                return {
                    id: kn.id,
                    type: kn.numberTypeName,
                    value: hasValue ? val?.value : 'Not entered',
                    status,
                    expiry: expiryDisplay,
                    docStatus,
                    rawValue: val?.value 
                };
            })
        }));

        // Apply Search and Sort within groups
        return groupList.map(group => {
            let items = group.items;

            // Search
            if (knSearch) {
                const s = knSearch.toLowerCase();
                items = items.filter(i => 
                    i.type.toLowerCase().includes(s) || 
                    String(i.value).toLowerCase().includes(s)
                );
            }

            // Sort
            if (knSort) {
                items = [...items].sort((a, b) => {
                    if (!knSort) return 0;
                    let aVal: any = a[knSort.key as keyof typeof a];
                    let bVal: any = b[knSort.key as keyof typeof b];

                    // Handle specific sort keys
                    if (knSort.key === 'type') { aVal = a.type; bVal = b.type; }
                    if (knSort.key === 'value') { aVal = a.rawValue || ''; bVal = b.rawValue || ''; }
                    if (knSort.key === 'expiry') { aVal = a.expiry === '-' ? 'z' : a.expiry; bVal = b.expiry === '-' ? 'z' : b.expiry; }

                    if (aVal < bVal) return knSort.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return knSort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            return { ...group, items };
        });
    }, [keyNumbers, keyNumberValues, activeEntityFilter, activeSubCategory, selectedAsset, selectedDriver, knSearch, knSort]); // Added knSearch, knSort dependency

    // 2. Documents (Filtered by Active Entity & Sub-Category)
    const filteredDocuments = useMemo(() => {
        // Filter Document Types by Entity Type
        const filteredDocTypes = documents.filter((doc: DocumentType) => {
             if (doc.relatedTo.toLowerCase() !== activeEntityFilter.toLowerCase()) return false;
             
             // Sub-Category Filter
             if (activeSubCategory === 'ALL') return true;
             // Check if doc explicit sub-category exists (mock check) or infer
             // Assume 'category' or 'monitoringEnabled' etc. could be used, or just pass all for now if undefined
             if (activeSubCategory === 'CMV') return !doc.name.includes('Non-CMV');
             if (activeSubCategory === 'NON_CMV') return doc.name.includes('Non-CMV');
             return true;
        });

        const getLinkedKeyNumber = (docTypeId: string) => {
// ...

            const kn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === docTypeId);
            return kn ? kn.numberTypeName : null;
        };

        const getDocStatus = (doc: DocumentType) => {
            const linkedKn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === doc.id);
            // If linkedKn exists, we check its value.
            const knValue = linkedKn ? keyNumberValues[linkedKn.id] : null;

            // If not key number linked, we'd check a generic document store (mocked here as "Not Uploaded" generally)
            
            const hasUpload = knValue?.documents && knValue.documents.length > 0;
            const expiryStr = knValue?.expiryDate;

            // Determine which config to use for monitoring (KeyNumber or DocType)
            const config = linkedKn || doc;
            const enabled = isMonitoringEnabled(config);
            const maxDays = getMaxReminderDays(config);

            const status = calculateComplianceStatus(
                expiryStr,
                enabled, 
                maxDays,
                !!hasUpload,
                linkedKn ? linkedKn.hasExpiry : doc.expiryRequired,
                doc.requirementLevel === 'required'
            );

            return status;
        };


        const processedDocs = filteredDocTypes.map((doc: DocumentType) => {
            const linkedKn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === doc.id);
            // Use composite lookup
            const storageId = linkedKn ? getKeyNumberStorageId(linkedKn.id) : null;
            const knValue = storageId ? keyNumberValues[storageId] : null;
            const uploadedDoc = knValue?.documents?.[0]; // Mock: get first doc

            return {
                id: doc.id,
                documentType: doc.name,
                documentName: uploadedDoc?.fileName || (knValue?.documents?.length ? 'scanned_doc.pdf' : '—'),
                dateUploaded: uploadedDoc ? (uploadedDoc.uploadedAt || new Date().toLocaleDateString()) : (knValue?.documents?.length ? new Date().toLocaleDateString() : '—'),
                status: getDocStatus(doc),
                issueDate: knValue?.issueDate || '—',
                expiryDate: knValue?.expiryDate || '—',
                requirement: doc.requirementLevel || 'optional',
                linkedKeyNumber: getLinkedKeyNumber(doc.id),
                linkedExpense: INITIAL_EXPENSE_TYPES.find(e => e.documentTypeId === doc.id)?.name,
                hasUpload: !!(knValue?.documents && knValue.documents.length > 0),
                folderPath: doc?.destination?.folderName || doc?.destination?.root || 'General',
                docTypeData: doc,
                uploadedDocData: uploadedDoc
            };
        });

        let result = processedDocs;

        // Search
        if (docSearch) {
            const s = docSearch.toLowerCase();
            result = result.filter(d => 
                d.documentType.toLowerCase().includes(s) || 
                d.documentName.toLowerCase().includes(s)
            );
        }

        // Sort
        if (docSort) {
             result = [...result].sort((a, b) => {
                if (!docSort) return 0;
                let aVal: any = a[docSort.key as keyof typeof a];
                let bVal: any = b[docSort.key as keyof typeof b];
                
                if (aVal < bVal) return docSort.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return docSort.direction === 'asc' ? 1 : -1;
                return 0;
             });
        }

        return result;
    }, [documents, keyNumbers, keyNumberValues, activeEntityFilter, activeSubCategory, selectedAsset, selectedDriver, docSearch, docSort]); // Added docSearch, docSort dependency

    // --- FILTER LOGIC ---
    const filterComplianceItems = (items: any[]) => {
        if (complianceFilter === 'all') return items;
        if (complianceFilter === 'missing_number') return items.filter((i: any) => i.value === 'Not entered' || i.status === 'Missing');
        if (complianceFilter === 'missing_expiry') return items.filter((i: any) => i.expiry === 'Not set');
        if (complianceFilter === 'missing_doc') return items.filter((i: any) => i.docStatus === 'Missing');
        if (complianceFilter === 'expiring_soon') return items.filter((i: any) => i.status === 'Expiring Soon');
        if (complianceFilter === 'expired') return items.filter((i: any) => i.status === 'Expired');
        return items;
    };

    const filterDocumentItems = (items: typeof filteredDocuments) => {
        if (documentFilter === 'all') return items;
        if (documentFilter === 'required_missing') return items.filter(d => d.requirement === 'required' && !d.hasUpload);
        if (documentFilter === 'expiring_soon') return items.filter(d => d.status === 'Expiring Soon');
        if (documentFilter === 'expired') return items.filter(d => d.status === 'Expired');
        if (documentFilter === 'optional_missing') return items.filter(d => d.requirement === 'optional' && !d.hasUpload);
        if (documentFilter === 'active') return items.filter(d => d.status === 'Active');
        return items;
    };

    const allComplianceItems = complianceGroups.flatMap(g => g.items);
    const counts = {
        missingNumber: allComplianceItems.filter(i => i.value === 'Not entered' || i.status === 'Missing').length,
        missingExpiry: allComplianceItems.filter(i => i.expiry === 'Not set').length,
        missingDoc: allComplianceItems.filter(i => i.docStatus === 'Missing').length,
        expiringSoon: allComplianceItems.filter(i => i.status === 'Expiring Soon').length,
        expired: allComplianceItems.filter(i => i.status === 'Expired').length
    };

    const docCounts = {
        requiredMissing: filteredDocuments.filter(d => d.requirement === 'required' && !d.hasUpload).length,
        expiringSoon: filteredDocuments.filter(d => d.status === 'Expiring Soon').length,
        expired: filteredDocuments.filter(d => d.status === 'Expired').length,
        optionalMissing: filteredDocuments.filter(d => d.requirement === 'optional' && !d.hasUpload).length,
        active: filteredDocuments.filter(d => d.status === 'Active').length
    };

    const tabs = [ { id: 'compliance', label: 'Compliance' }, { id: 'documents', label: 'Documents' } ];
    const entityTabs = [
        { id: 'Carrier', label: 'Carrier', icon: LayoutGrid },
        { id: 'Asset', label: 'Asset', icon: Truck },
        { id: 'Driver', label: 'Driver', icon: User }
    ];

    return (
        <div className="flex-1 p-4 lg:p-6 overflow-x-hidden bg-slate-50 min-h-screen">
                {/* Unified Dynamic Header */}
                 <div className="mb-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                {activeEntityFilter === 'Carrier' ? 'Carrier Compliance' : 
                                 activeEntityFilter === 'Asset' ? 'Assets' : 'Drivers'}
                            </h1>
                            <p className="text-slate-500 mt-1">
                                {activeEntityFilter === 'Carrier' ? 'Manage company-level documents, licenses and permits.' : 
                                 activeEntityFilter === 'Asset' ? 'Manage vehicle compliance, documentation and status.' : 
                                 'Manage driver qualification files, licenses and certifications.'}
                            </p>
                        </div>
                        {(activeEntityFilter === 'Carrier' || selectedAsset || selectedDriver) && (
                            <div className="flex bg-slate-100 p-1 rounded-lg self-start md:self-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as any)}
                                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                                            activeTab === tab.id
                                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                                : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            {/* Entity Filter Sub-Tabs (Always Visible to allow switching) */}
            <div className="flex items-center gap-8 border-b border-slate-200 mb-6">
                {entityTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeEntityFilter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveEntityFilter(tab.id as any)}
                            className={`
                                flex items-center gap-2 pb-4 border-b-2 font-medium transition-colors
                                ${isActive
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            <Icon className="w-5 h-5" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Sub-Category Toggle (Driver Only - Asset moved to Toolbar) */}


            {/* Tab Content */}
            <div className="mt-6">
                
                {/* 1. ASSET LIST VIEW (If Asset Filter + No Selection) */}
                {activeEntityFilter === 'Asset' && !selectedAsset && (
                     <div className="w-full space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            {/* Toolbar */}
                            <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-center">
                                <div className="relative w-full lg:w-96">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Search by Unit #, VIN or Type..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    />
                                </div>
                                
                                <div className="flex items-center gap-3 w-full lg:w-auto">
                                    <div className="flex bg-slate-100 p-1 rounded-lg">
                                        {(['ALL', 'CMV', 'NON_CMV'] as const).map((cat) => (
                                            <button
                                                key={cat}
                                                onClick={() => { setActiveSubCategory(cat); setCurrentPage(1); }}
                                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                                                    activeSubCategory === cat
                                                        ? 'bg-white text-slate-900 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {cat === 'ALL' ? 'All Assets' : cat === 'NON_CMV' ? 'Trailers (Non-CMV)' : 'Trucks (CMV)'}
                                            </button>
                                        ))}
                                    </div>
                                    
                                    <div className="h-8 w-px bg-slate-200 ml-1"></div>

                                    {/* Column Visibility Dropdown */}
                                    <div className="relative">
                                        <button 
                                            onClick={() => setIsAssetColumnDropdownOpen(!isAssetColumnDropdownOpen)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            <Columns className="w-3.5 h-3.5" />
                                            Columns
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                        {isAssetColumnDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsAssetColumnDropdownOpen(false)}></div>
                                                <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                                                    {Object.keys(assetColumns).map(col => (
                                                        col !== 'actions' && (
                                                            <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={assetColumns[col]} 
                                                                    onChange={(e) => setAssetColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                                />
                                                                <span className="text-xs text-slate-700 capitalize">{col === 'unitNumber' ? 'Unit #' : col === 'vin' ? 'VIN' : col}</span>
                                                            </label>
                                                        )
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setEditingAsset(null); setIsAssetModalOpen(true); }}
                                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add Asset
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-slate-50 border-b border-slate-200">
                                <ComplianceStatsButton 
                                    icon={LayoutGrid} 
                                    label={<>Total<br />Assets</>} 
                                    count={assetStats.total} 
                                    isActive={assetStatusFilter === 'ALL'} 
                                    color="blue" 
                                    onClick={() => setAssetStatusFilter('ALL')} 
                                />
                                <ComplianceStatsButton 
                                    icon={Check} 
                                    label={<>Active<br />Assets</>} 
                                    count={assetStats.active} 
                                    isActive={assetStatusFilter === 'Active'} 
                                    color="blue" 
                                    onClick={() => setAssetStatusFilter('Active')} 
                                />
                                <ComplianceStatsButton 
                                    icon={RotateCcw} 
                                    label={<>In<br />Maintenance</>} 
                                    count={assetStats.maintenance} 
                                    isActive={assetStatusFilter === 'Maintenance'} 
                                    color="orange" 
                                    onClick={() => setAssetStatusFilter('Maintenance')} 
                                />
                                <ComplianceStatsButton 
                                    icon={AlertCircle} 
                                    label={<>Out of<br />Service</>} 
                                    count={assetStats.outOfService} 
                                    isActive={assetStatusFilter === 'OutOfService'} 
                                    color="yellow" 
                                    onClick={() => setAssetStatusFilter('OutOfService')} 
                                />
                                <ComplianceStatsButton 
                                    icon={XCircle} 
                                    label={<>Deactivated<br />Assets</>} 
                                    count={assetStats.deactivated} 
                                    isActive={assetStatusFilter === 'Deactivated'} 
                                    color="red" 
                                    onClick={() => setAssetStatusFilter('Deactivated')} 
                                />
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm table-fixed">
                                    <thead className="bg-white border-b border-slate-200 text-slate-400 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            {assetColumns.unitNumber && <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => setAssetSort({ key: 'unitNumber', direction: assetSort?.key === 'unitNumber' && assetSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">Unit # <ArrowUpDown className={`w-3 h-3 ${assetSort?.key === 'unitNumber' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {assetColumns.vin && <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => setAssetSort({ key: 'vin', direction: assetSort?.key === 'vin' && assetSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">VIN <ArrowUpDown className={`w-3 h-3 ${assetSort?.key === 'vin' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {assetColumns.type && <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => setAssetSort({ key: 'type', direction: assetSort?.key === 'type' && assetSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">Type <ArrowUpDown className={`w-3 h-3 ${assetSort?.key === 'type' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {assetColumns.compliance && <th className="px-6 py-4">Compliance Status</th>}
                                            {assetColumns.status && <th className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors group" onClick={() => setAssetSort({ key: 'status', direction: assetSort?.key === 'status' && assetSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">Vehicle Status <ArrowUpDown className={`w-3 h-3 ${assetSort?.key === 'status' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {assetColumns.actions && <th className="px-6 py-4 text-right">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100/50">
                                        {(() => {
                                            // Pagination Logic
                                            const totalItems = filteredAssetsList.length;
                                            const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
                                            const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
                                            const endIndex = startIndex + ITEMS_PER_PAGE;
                                            const currentAssets = filteredAssetsList.slice(startIndex, endIndex);

                                            if (totalItems === 0) {
                                                return (
                                                    <tr>
                                                        <td colSpan={Object.values(assetColumns).filter(Boolean).length} className="px-6 py-12 text-center text-slate-500">
                                                            No assets found matching your search.
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <>
                                                    {currentAssets.map((asset: Asset) => {
                                                        const stats = getComplianceSummary(asset.id, 'Asset', asset.assetCategory); 
                                                        return (
                                                        <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => setSelectedAsset(asset)}>
                                                            {assetColumns.unitNumber && <td className="px-6 py-6 font-bold text-slate-900">{asset.unitNumber}</td>}
                                                            {assetColumns.vin && <td className="px-6 py-6 text-slate-500 font-mono text-xs">{asset.vin}</td>}
                                                            {assetColumns.type && <td className="px-6 py-6 text-slate-600">{asset.assetType}</td>}
                                                            {assetColumns.compliance && <td className="px-6 py-6">
                                                                <div className="flex gap-1 flex-wrap">
                                                                    {stats.missingNumbers > 0 && <span className="px-3 py-1.5 rounded bg-red-50 text-red-600 text-[11px] font-bold">{stats.missingNumbers} No. Missing</span>}
                                                                    {stats.missingDocs > 0 && <span className="px-3 py-1.5 rounded bg-red-50 text-red-600 text-[11px] font-bold">{stats.missingDocs} Doc. Missing</span>}
                                                                    {stats.expired > 0 && <span className="px-3 py-1.5 rounded bg-orange-50 text-orange-600 text-[11px] font-bold">{stats.expired} Expired</span>}
                                                                    {stats.expiringSoon > 0 && <span className="px-3 py-1.5 rounded bg-yellow-50 text-yellow-700 text-[11px] font-bold">{stats.expiringSoon} Soon</span>}
                                                                    {stats.missingNumbers === 0 && stats.missingDocs === 0 && stats.expired === 0 && stats.expiringSoon === 0 && <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-[11px] font-bold">OK</span>}
                                                                </div>
                                                            </td>}
                                                            {assetColumns.status && <td className="px-6 py-6">
                                                                <Badge 
                                                                    text={asset.operationalStatus} 
                                                                    tone={asset.operationalStatus === 'Active' ? 'success' : asset.operationalStatus === 'Maintenance' ? 'warning' : 'gray'} 
                                                                    className="rounded-full px-3 py-1"
                                                                />
                                                            </td>}
                                                            {assetColumns.actions && <td className="px-6 py-6 text-right">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); }}
                                                                    className="text-blue-600 hover:text-blue-800 font-semibold text-sm hover:underline"
                                                                >
                                                                    Manage
                                                                </button>
                                                            </td>}
                                                        </tr>
                                                    )})})
                                                    
                                                    {/* Footer / Pagination */}
                                                    <tr className="border-t border-slate-100">
                                                        <td colSpan={Object.values(assetColumns).filter(Boolean).length} className="px-6 py-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="text-sm text-slate-500">
                                                                    Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(endIndex, totalItems)}</span> of <span className="font-semibold text-slate-900">{totalItems}</span> results
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.max(1, p - 1)); }}
                                                                        disabled={currentPage === 1}
                                                                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        Previous
                                                                    </button>
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                                                                        disabled={currentPage === totalPages}
                                                                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                                    >
                                                                        Next
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                     </div>
                )}

                {/* 2. DRIVER LIST VIEW (Refactored) */}
                {activeEntityFilter === 'Driver' && !selectedDriver && (
                     <div className="w-full space-y-6">
                        {/* DRIVER STATUS CARDS */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <button onClick={() => setDriverStatusFilter('All')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${driverStatusFilter === 'All' ? 'ring-1 ring-blue-500 border-l-blue-500' : 'border-l-blue-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-blue-50 text-blue-600"><Users className="w-4 h-4" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Total<br />Drivers</span>
                                </div>
                                <div className="text-xl font-bold text-slate-900">{driverStats.total}</div>
                            </button>
                            <button onClick={() => setDriverStatusFilter('Active')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${driverStatusFilter === 'Active' ? 'ring-1 ring-emerald-500 border-l-emerald-500' : 'border-l-emerald-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-emerald-50 text-emerald-600"><UserCheck className="w-4 h-4" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Active<br />Drivers</span>
                                </div>
                                <div className="text-xl font-bold text-slate-900">{driverStats.active}</div>
                            </button>
                            <button onClick={() => setDriverStatusFilter('Inactive')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${driverStatusFilter === 'Inactive' ? 'ring-1 ring-slate-500 border-l-slate-500' : 'border-l-slate-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-slate-100 text-slate-600"><UserMinus className="w-4 h-4" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Inactive<br />Drivers</span>
                                </div>
                                <div className="text-xl font-bold text-slate-900">{driverStats.inactive}</div>
                            </button>
                            <button onClick={() => setDriverStatusFilter('On Leave')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${driverStatusFilter === 'On Leave' ? 'ring-1 ring-amber-500 border-l-amber-500' : 'border-l-amber-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-amber-50 text-amber-600"><Clock className="w-4 h-4" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">On<br />Leave</span>
                                </div>
                                <div className="text-xl font-bold text-slate-900">{driverStats.onLeave}</div>
                            </button>
                            <button onClick={() => setDriverStatusFilter('Terminated')} className={`flex items-center justify-between p-4 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${driverStatusFilter === 'Terminated' ? 'ring-1 ring-red-500 border-l-red-500' : 'border-l-red-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-red-50 text-red-600"><UserX className="w-4 h-4" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight text-left">Terminated<br />Drivers</span>
                                </div>
                                <div className="text-xl font-bold text-slate-900">{driverStats.terminated}</div>
                            </button>
                        </div>

                        {/* TOOLBAR */}
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="relative max-w-md w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search drivers by name, ID, or email..."
                                    value={driverSearch}
                                    onChange={(e) => setDriverSearch(e.target.value)}
                                    className="pl-9 pr-4 h-10 w-full rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex gap-2 items-center">
                                {/* Column Visibility Dropdown */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsDriverColumnDropdownOpen(!isDriverColumnDropdownOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                        <Columns className="w-3.5 h-3.5" />
                                        Columns
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                    {isDriverColumnDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setIsDriverColumnDropdownOpen(false)}></div>
                                            <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                                                {Object.keys(driverColumns).map(col => (
                                                    col !== 'actions' && (
                                                        <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                            <input 
                                                                type="checkbox" 
                                                                checked={driverColumns[col]} 
                                                                onChange={(e) => setDriverColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                            />
                                                            <span className="text-xs text-slate-700 capitalize">{col}</span>
                                                        </label>
                                                    )
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button className="h-10 px-4 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Export
                                </button>
                                <button className="h-10 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                                    <Plus className="w-4 h-4" /> Add Driver
                                </button>
                            </div>
                        </div>

                        {/* DRIVER TABLE */}
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50/80 border-b border-slate-200">
                                        <tr>
                                            {driverColumns.name && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider pl-6 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setDriverSort({ key: 'name', direction: driverSort?.key === 'name' && driverSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">Driver Name <ArrowUpDown className={`w-3 h-3 ${driverSort?.key === 'name' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {driverColumns.id && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setDriverSort({ key: 'id', direction: driverSort?.key === 'id' && driverSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">ID / Details <ArrowUpDown className={`w-3 h-3 ${driverSort?.key === 'id' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {driverColumns.status && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setDriverSort({ key: 'status', direction: driverSort?.key === 'status' && driverSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">Status <ArrowUpDown className={`w-3 h-3 ${driverSort?.key === 'status' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {driverColumns.compliance && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance</th>}
                                            {driverColumns.license && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setDriverSort({ key: 'license', direction: driverSort?.key === 'license' && driverSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">License <ArrowUpDown className={`w-3 h-3 ${driverSort?.key === 'license' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {driverColumns.contact && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setDriverSort({ key: 'contact', direction: driverSort?.key === 'contact' && driverSort.direction === 'asc' ? 'desc' : 'asc' })}>
                                                <div className="flex items-center gap-1">Contact <ArrowUpDown className={`w-3 h-3 ${driverSort?.key === 'contact' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100 text-slate-400'}`} /></div>
                                            </th>}
                                            {driverColumns.actions && <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right pr-6">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredDriversList.length > 0 ? (
                                            filteredDriversList.map((driver) => {
                                                const stats = calculateDriverComplianceStats(driver, keyNumbers, documents);
                                                const totalIssues = stats.missingNumber + stats.missingExpiry + stats.missingDoc + stats.expired;
                                                const isCompliant = totalIssues === 0 && stats.expiring === 0;

                                                return (
                                                    <tr key={driver.id} onClick={() => setSelectedDriver(driver)} className="hover:bg-blue-50/40 transition-colors group cursor-pointer">
                                                        {driverColumns.name && <td className="px-4 py-3 pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-200">
                                                                    {driver.avatarInitials}
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{driver.name}</div>
                                                                    <div className="text-[11px] text-slate-500 flex items-center gap-1">Hired: {driver.hiredDate}</div>
                                                                </div>
                                                            </div>
                                                        </td>}
                                                        {driverColumns.id && <td className="px-4 py-3">
                                                            <div className="font-mono text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded w-fit">
                                                                {driver.id}
                                                            </div>
                                                        </td>}
                                                        {driverColumns.status && <td className="px-4 py-3">
                                                            <Badge 
                                                                text={driver.status} 
                                                                tone={
                                                                    driver.status === 'Active' ? 'success' : 
                                                                    driver.status === 'Inactive' ? 'gray' : 
                                                                    driver.status === 'Terminated' ? 'danger' : 'warning'
                                                                } 
                                                            />
                                                        </td>}
                                                        {driverColumns.compliance && <td className="px-4 py-3">
                                                            {isCompliant ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-fit">
                                                                        <Check className="w-3 h-3" /> Compliant
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1 items-start">
                                                                    {stats.expired > 0 && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                            {stats.expired} Expired
                                                                        </span>
                                                                    )}
                                                                    {(stats.missingNumber + stats.missingExpiry + stats.missingDoc) > 0 && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                            {stats.missingNumber + stats.missingExpiry + stats.missingDoc} Missing
                                                                        </span>
                                                                    )}
                                                                    {stats.expiring > 0 && (
                                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                                                            {stats.expiring} Expiring
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>}
                                                        {driverColumns.license && <td className="px-4 py-3">
                                                            <div className="text-slate-900 font-medium text-xs">{driver.licenseNumber || '—'}</div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5">{driver.licenseState || '—'} • Exp: {driver.licenseExpiry || '—'}</div>
                                                        </td>}
                                                        {driverColumns.contact && <td className="px-4 py-3 text-sm text-slate-600">
                                                            <div className="flex flex-col gap-0.5">
                                                                {/* Mock phone/email data from driver object if available */}
                                                                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                                    {driver.phone || '(555) 000-0000'}
                                                                </span>
                                                                <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                                                     {driver.email || 'driver@example.com'}
                                                                </span>
                                                            </div>
                                                        </td>}
                                                        {driverColumns.actions && <td className="px-4 py-3 text-right pr-6">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Manage Driver">
                                                                    <div className="font-semibold text-xs text-blue-600 hover:underline">Manage</div>
                                                                </button>
                                                            </div>
                                                        </td>}
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={Object.values(driverColumns).filter(Boolean).length} className="py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="p-4 bg-slate-50 rounded-full text-slate-300">
                                                            <Search className="w-8 h-8" />
                                                        </div>
                                                        <p className="text-slate-500 font-medium">No drivers found matching your filter</p>
                                                        <button onClick={() => { setDriverSearch(''); setDriverStatusFilter('All'); }} className="text-sm text-blue-600 hover:underline">
                                                            Clear filters
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
                                <div className="text-xs text-slate-500">
                                    Showing <span className="font-medium text-slate-900">{filteredDriversList.length}</span> of <span className="font-medium text-slate-900">{MOCK_DRIVERS.length}</span> drivers
                                </div>
                                <div className="flex gap-2">
                                    <button disabled className="px-3 py-1 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-sm opacity-50 cursor-not-allowed">Previous</button>
                                    <button disabled className="px-3 py-1 text-xs font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-sm opacity-50 cursor-not-allowed">Next</button>
                                </div>
                            </div>
                        </div>
                     </div>
                )}



                {/* 4. DETAIL VIEW (Carrier OR Selected Asset OR Selected Driver) */}
                {(activeEntityFilter === 'Carrier' || selectedAsset || selectedDriver) && (
                    <>
                        {/* Selected Entity Header (Asset) */}
                        {selectedAsset && (
                            <div className="flex items-center gap-4 mb-4">
                                <button onClick={() => setSelectedAsset(null)} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-medium">
                                    <ChevronDown className="w-4 h-4 rotate-90" /> Back to List
                                </button>
                                <div className="h-6 w-px bg-slate-300"></div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {selectedAsset.unitNumber} ({selectedAsset.vin})
                                </h2>
                            </div>
                        )}
                        {/* Selected Entity Header (Driver) */}
                        {selectedDriver && (
                            <div className="flex items-center gap-4 mb-4">
                                <button onClick={() => setSelectedDriver(null)} className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm font-medium">
                                    <ChevronDown className="w-4 h-4 rotate-90" /> Back to List
                                </button>
                                <div className="h-6 w-px bg-slate-300"></div>
                                <h2 className="text-xl font-bold text-slate-900">
                                    {selectedDriver.name}
                                </h2>
                            </div>
                        )}



                        {/* COMPLIANCE TAB CONTENT */}
                        {activeTab === 'compliance' && (
                            <div className="w-full space-y-6">
                                {/* INDICATORS */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <ComplianceStatsButton 
                                        icon={Hash} 
                                        label={<>Missing<br />Number</>} 
                                        count={counts.missingNumber} 
                                        isActive={complianceFilter === 'missing_number'} 
                                        color="red" 
                                        onClick={() => setComplianceFilter('missing_number')} 
                                    />
                                    <ComplianceStatsButton 
                                        icon={CalendarX} 
                                        label={<>Missing<br />Expiry</>} 
                                        count={counts.missingExpiry} 
                                        isActive={complianceFilter === 'missing_expiry'} 
                                        color="orange" 
                                        onClick={() => setComplianceFilter('missing_expiry')} 
                                    />
                                    <ComplianceStatsButton 
                                        icon={FileWarning} 
                                        label={<>Missing<br />Doc</>} 
                                        count={counts.missingDoc} 
                                        isActive={complianceFilter === 'missing_doc'} 
                                        color="orange" 
                                        onClick={() => setComplianceFilter('missing_doc')} 
                                    />
                                    <ComplianceStatsButton 
                                        icon={Clock} 
                                        label={<>Expiring<br />Soon</>} 
                                        count={counts.expiringSoon} 
                                        isActive={complianceFilter === 'expiring_soon'} 
                                        color="yellow" 
                                        onClick={() => setComplianceFilter('expiring_soon')} 
                                    />
                                    <ComplianceStatsButton 
                                        icon={AlertTriangle} 
                                        label={<>Expired</>} 
                                        count={counts.expired} 
                                        isActive={complianceFilter === 'expired'} 
                                        color="red" 
                                        onClick={() => setComplianceFilter('expired')} 
                                    />
                                </div>
                                <div className="flex justify-end">
                                    {complianceFilter !== 'all' && (
                                        <button onClick={() => setComplianceFilter('all')} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                            <X className="w-3 h-3" /> Clear Filter
                                        </button>
                                    )}
                                </div>

                                {/* KEY NUMBERS CARD */}
                                <Card
                                    title="Key Numbers"
                                    icon={FileKey}
                                    fullWidth
                                    rightAction={
                                        <button
                                            onClick={() => setKeyNumberModalMode('add')}
                                            className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                                        >
                                            <Plus className="w-4 h-4" /> Add Number
                                        </button>
                                    }
                                >
                                     {/* Custom Toolbar */}
                                     <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search numbers..." 
                                                value={knSearch}
                                                onChange={(e) => setKnSearch(e.target.value)}
                                                className="pl-9 pr-3 py-1.5 w-full text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="relative">
                                            <button 
                                                onClick={() => setIsKnColumnDropdownOpen(!isKnColumnDropdownOpen)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50"
                                            >
                                                <Columns className="w-3.5 h-3.5" />
                                                Columns
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                            {isKnColumnDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setIsKnColumnDropdownOpen(false)}></div>
                                                    <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                                                        {Object.keys(knColumns).map(col => (
                                                            col !== 'actions' && (
                                                                <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={knColumns[col]} 
                                                                        onChange={(e) => setKnColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                                    />
                                                                    <span className="text-xs text-slate-700 capitalize">{col}</span>
                                                                </label>
                                                            )
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                     </div>

                                     <div className="overflow-x-auto border-t border-slate-200">
                                        <table className="w-full text-left text-sm table-fixed">
                                            <thead className="bg-white border-b border-slate-200 text-slate-400 text-xs uppercase font-bold tracking-wider sticky top-0">
                                                <tr>
                                                    {knColumns.type && (
                                                        <th 
                                                            className="px-6 py-3 w-1/4 cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setKnSort({ key: 'type', direction: knSort?.key === 'type' && knSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Number Type
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${knSort?.key === 'type' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {knColumns.value && (
                                                        <th 
                                                            className="px-6 py-3 w-1/4 cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setKnSort({ key: 'value', direction: knSort?.key === 'value' && knSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                             <div className="flex items-center gap-1">
                                                                Value
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${knSort?.key === 'value' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {knColumns.status && (
                                                        <th 
                                                            className="px-6 py-3 w-1/4 cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setKnSort({ key: 'status', direction: knSort?.key === 'status' && knSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                             <div className="flex items-center gap-1">
                                                                Status
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${knSort?.key === 'status' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {knColumns.expiry && (
                                                        <th 
                                                            className="px-6 py-3 w-1/4 cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setKnSort({ key: 'expiry', direction: knSort?.key === 'expiry' && knSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                             <div className="flex items-center gap-1">
                                                                Expiry
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${knSort?.key === 'expiry' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {knColumns.actions && <th className="px-6 py-3 w-24 text-right">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {complianceGroups.map(group => {
                                                    const isCollapsed = keyNumberGroupsCollapsed[group.key] ?? false;
                                                    const visibleItems = filterComplianceItems(group.items);
                                                    if (complianceFilter !== 'all' && visibleItems.length === 0) return null;
        
                                                    return (
                                                        <React.Fragment key={group.key}>
                                                            <tr className="bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100" onClick={() => toggleKeyNumberGroup(group.key)}>
                                                                <td colSpan={Object.values(knColumns).filter(Boolean).length} className="px-6 py-2.5">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="font-bold text-xs uppercase text-slate-500 tracking-wider pl-2">{group.label}</span>
                                                                        <div className="flex items-center gap-3">
                                                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {!isCollapsed && visibleItems.map((item, idx) => {
                                                                const config = keyNumbers.find((kn: KeyNumberConfig) => kn.id === item.id);
                                                                const val = config ? getKeyNumberData(config) : null;
                                                                return (
                                                                <tr key={idx}>
                                                                    {knColumns.type && (
                                                                        <td className="px-6 py-4">
                                                                            <div className="font-semibold text-slate-900 truncate">{item.type}</div>
                                                                            {(() => {
                                                                                const docType = documents.find(d => d.id === config?.requiredDocumentTypeId);
                                                                                if (docType) {
                                                                                    return (
                                                                                        <div className="text-xs text-blue-600 flex items-center gap-1 mt-0.5 font-normal">
                                                                                            <FileText className="w-3 h-3" />
                                                                                            Linked to: {docType.name}
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </td>
                                                                    )}
                                                                    {knColumns.value && (
                                                                        <td className="px-6 py-4 text-slate-400 italic">{item.value}</td>
                                                                    )}
                                                                    {knColumns.status && (
                                                                        <td className="px-6 py-4">
                                                                            <Badge text={item.status} tone={getStatusTone(item.status)} />
                                                                        </td>
                                                                    )}
                                                                    {knColumns.expiry && (
                                                                        <td className="px-6 py-4 text-slate-500 italic">{item.expiry}</td>
                                                                    )}
                                                                    {knColumns.actions && (
                                                                        <td className="px-6 py-4 text-right">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setKeyNumberModalMode('edit');
                                                                                    setEditingKeyNumber({
                                                                                        id: item.id,
                                                                                        configId: item.id,
                                                                                        value: val?.value || '',
                                                                                        expiryDate: val?.expiryDate || '',
                                                                                        issueDate: val?.issueDate || '',
                                                                                        tags: val?.tags || [],
                                                                                        numberRequired: config?.numberRequired !== false,
                                                                                        hasExpiry: config?.hasExpiry || false,
                                                                                        documentRequired: config?.documentRequired || false
                                                                                    });
                                                                                }}
                                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                            >
                                                                                <Edit3 className="w-4 h-4" />
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            );
                                                        })}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* DOCUMENTS TAB CONTENT */}
                        {activeTab === 'documents' && (
                            <div className="w-full space-y-6">
                                {/* DOCUMENT FILTER INDICATORS */}
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                                    <ComplianceStatsButton 
                                        icon={FileText} 
                                        label={<>Missing<br />Required</>} 
                                        count={docCounts.requiredMissing} 
                                        isActive={documentFilter === 'required_missing'} 
                                        color="red" 
                                        onClick={() => setDocumentFilter('required_missing')} 
                                    />
                                    <ComplianceStatsButton 
                                        icon={Clock} 
                                        label={<>Expiring<br />Soon</>} 
                                        count={docCounts.expiringSoon} 
                                        isActive={documentFilter === 'expiring_soon'} 
                                        color="yellow" 
                                        onClick={() => setDocumentFilter('expiring_soon')} 
                                    />
                                    <ComplianceStatsButton 
                                        icon={AlertTriangle} 
                                        label={<>Expired</>} 
                                        count={docCounts.expired} 
                                        isActive={documentFilter === 'expired'} 
                                        color="red" 
                                        onClick={() => setDocumentFilter('expired')} 
                                    />
                                </div>
                                
                                {documentFilter !== 'all' && (
                                    <div className="flex justify-end">
                                        <button onClick={() => setDocumentFilter('all')} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                            <X className="w-3 h-3" /> Clear Filter
                                        </button>
                                    </div>
                                )}
        
                                <Card title="Documents" icon={FileText} fullWidth>
                                     {/* Custom Toolbar */}
                                     <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search documents..." 
                                                value={docSearch}
                                                onChange={(e) => setDocSearch(e.target.value)}
                                                className="pl-9 pr-3 py-1.5 w-full text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div className="relative">
                                            <button 
                                                onClick={() => setIsDocColumnDropdownOpen(!isDocColumnDropdownOpen)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50"
                                            >
                                                <Columns className="w-3.5 h-3.5" />
                                                Columns
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                            {isDocColumnDropdownOpen && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setIsDocColumnDropdownOpen(false)}></div>
                                                    <div className="absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-2">
                                                        {Object.keys(docColumns).map(col => (
                                                            col !== 'actions' && (
                                                                <label key={col} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                                                    <input 
                                                                        type="checkbox" 
                                                                        checked={docColumns[col]} 
                                                                        onChange={(e) => setDocColumns(prev => ({ ...prev, [col]: e.target.checked }))}
                                                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                                                                    />
                                                                    <span className="text-xs text-slate-700 capitalize">{col === 'uploaded' ? 'Date Uploaded' : col}</span>
                                                                </label>
                                                            )
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                     </div>
                                    <div className="overflow-x-auto border-t border-slate-200">
                                        <table className="w-full text-left text-sm table-fixed">
                                            <thead className="bg-white border-b border-slate-200 text-slate-400 text-xs uppercase font-bold tracking-wider sticky top-0">
                                            <tr>

                                                    {docColumns.type && (
                                                        <th 
                                                            className="px-6 py-3 w-[15%] cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setDocSort({ key: 'documentType', direction: docSort?.key === 'documentType' && docSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Document Type
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${docSort?.key === 'documentType' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {docColumns.name && (
                                                        <th 
                                                            className="px-6 py-3 w-[15%] cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setDocSort({ key: 'documentName', direction: docSort?.key === 'documentName' && docSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Name
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${docSort?.key === 'documentName' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {docColumns.folder && (
                                                        <th 
                                                            className="px-6 py-3 w-[10%] cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setDocSort({ key: 'folderPath', direction: docSort?.key === 'folderPath' && docSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Folder
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${docSort?.key === 'folderPath' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {docColumns.uploaded && (
                                                        <th 
                                                            className="px-6 py-3 w-[10%] cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setDocSort({ key: 'dateUploaded', direction: docSort?.key === 'dateUploaded' && docSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Date Uploaded
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${docSort?.key === 'dateUploaded' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {docColumns.status && (
                                                        <th 
                                                            className="px-6 py-3 w-[10%] cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setDocSort({ key: 'status', direction: docSort?.key === 'status' && docSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Status
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${docSort?.key === 'status' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {docColumns.expiry && (
                                                        <th 
                                                            className="px-6 py-3 w-[12%] cursor-pointer hover:bg-slate-50 transition-colors group"
                                                            onClick={() => setDocSort({ key: 'expiryDate', direction: docSort?.key === 'expiryDate' && docSort.direction === 'asc' ? 'desc' : 'asc' })}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                Expiry
                                                                <ArrowUpDown className={`w-3 h-3 text-slate-400 ${docSort?.key === 'expiryDate' ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                                                            </div>
                                                        </th>
                                                    )}
                                                    {docColumns.actions && <th className="px-6 py-3 w-[10%] text-right">Actions</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filterDocumentItems(filteredDocuments).map((doc, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100/50">
                                                        {docColumns.type && (
                                                            <td className="px-6 py-4 font-semibold text-slate-900">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                                    {doc.documentType}
                                                                </div>
                                                                {doc.linkedKeyNumber && (
                                                                    <div className="ml-6 text-xs text-blue-600 flex items-center gap-1 mt-1 font-normal">
                                                                        Linked to: {doc.linkedKeyNumber}
                                                                    </div>
                                                                )}
                                                                {doc.linkedExpense && (
                                                                    <div className="ml-6 text-xs text-emerald-600 flex items-center gap-1 mt-1 font-normal">
                                                                        Linked to Expense: {doc.linkedExpense}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        )}
                                                        {docColumns.name && (
                                                            <td className="px-6 py-4 text-slate-600 font-medium text-xs truncate max-w-[150px]" title={doc.documentName}>
                                                                {doc.documentName}
                                                            </td>
                                                        )}
                                                        {docColumns.folder && (
                                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="p-1 bg-slate-100 rounded text-slate-400">
                                                                        <LayoutGrid className="w-3 h-3" />
                                                                    </div>
                                                                    {doc.folderPath}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {docColumns.uploaded && (
                                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                                {doc.dateUploaded}
                                                            </td>
                                                        )}
                                                        {docColumns.status && (
                                                            <td className="px-6 py-4">
                                                                <Badge text={doc.status} tone={getStatusTone(doc.status)} />
                                                            </td>
                                                        )}
                                                        {docColumns.expiry && (
                                                            <td className="px-6 py-4 text-slate-500 font-mono text-xs">{doc.expiryDate}</td>
                                                        )}
                                                        {docColumns.actions && (
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {doc.hasUpload && (
                                                                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Download">
                                                                            <Download className="w-4 h-4" />
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => {
                                                                            // Handle document edit/view - open modal
                                                                            setEditingDocument(doc);
                                                                        }}
                                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                    >
                                                                        {doc.hasUpload ? <Edit3 className="w-4 h-4" /> : <UploadCloud className="w-4 h-4" />}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </>
                )}



            </div>

            <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />

            <KeyNumberModal
                isOpen={keyNumberModalMode !== null}
                onClose={() => {
                    setKeyNumberModalMode(null);
                    setEditingKeyNumber(null);
                }}
                onSave={(data) => {
                    // Fetch existing documents to preserve them
                    const storageId = getKeyNumberStorageId(data.configId);
                    const existingDocs = keyNumberValues[storageId]?.documents || [];
                    updateKeyNumberValue(storageId, data.value, data.expiryDate, data.issueDate, data.tags, existingDocs);
                    showToast(keyNumberModalMode === 'add' ? 'Key number added successfully' : 'Key number updated successfully');
                }}
                mode={keyNumberModalMode || 'edit'}
                entityType="Carrier"
                editData={editingKeyNumber}
                availableKeyNumbers={keyNumbers}
                tagSections={tagSections}
                getDocumentTypeById={getDocumentTypeById}
            />

            {/* Document Edit Modal */}
            {editingDocument && (() => {
                 const docType = editingDocument.docTypeData;
                 const getDocTagSections = () => {
                     if (!docType?.selectedTags) return [];
                     const result: { sectionId: string; sectionTitle: string; tags: { id: string; label: string }[]; multiSelect: boolean; colorTheme: ColorTheme }[] = [];
                     for (const [sectionId, tags] of Object.entries(docType.selectedTags)) {
                        const selectedTagsFromDoc = tags as string[]; // In this mock data context, it seems to be strings based on usage elsewhere
                         const section = tagSections.find(s => s.id === sectionId);
                         if (section && selectedTagsFromDoc.length > 0) {
                             // Fix: st is likely just the ID string if the data structure is simple, or we need to check how it's stored.
                             // Assuming selectedTagsFromDoc contains tag IDs (strings) based on the error "Property 'id' does not exist on type 'string'".
                             const availableTags = section.tags.filter(t => selectedTagsFromDoc.some(stId => stId === t.id));
                             if (availableTags.length > 0) {
                                 result.push({
                                     sectionId,
                                     sectionTitle: section.title,
                                     tags: availableTags,
                                     multiSelect: section.multiSelect,
                                     colorTheme: section.colorTheme
                                 });
                             }
                         }
                     }
                     return result;
                 };
                 const docTagSections = getDocTagSections();

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                             {/* ... Edit Modal Content matching CarrierProfilePage ... */}
                             {/* Simplified for brevity but functionally identical to original logic */}
                             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Edit Document</h2>
                                    <p className="text-sm text-slate-500">{editingDocument.documentType}</p>
                                </div>
                                <button onClick={() => setEditingDocument(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <div className="p-6 space-y-5 overflow-y-auto flex-1">
                                {editingDocument.linkedKeyNumber && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                                        <FileKey className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm text-blue-800">Related to: <strong>{editingDocument.linkedKeyNumber}</strong></span>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                     {docType?.expiryRequired && (
                                         <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
                                             <input type="date" defaultValue={editingDocument.expiryDate !== '—' ? editingDocument.expiryDate : ''} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                         </div>
                                     )}
                                     {(docType?.issueDateRequired) && (
                                         <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue Date <span className="text-red-500">*</span></label>
                                             <input type="date" defaultValue={editingDocument.issueDate !== '—' ? editingDocument.issueDate : ''} className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                         </div>
                                     )}
                                     {docType?.issueStateRequired && (
                                         <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue State/Province <span className="text-red-500">*</span></label>
                                             <input type="text" placeholder="e.g. CA, NY, ON" className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                         </div>
                                     )}
                                     {docType?.issueCountryRequired && (
                                         <div>
                                             <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue Country <span className="text-red-500">*</span></label>
                                             <select className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                                 <option value="">Select Country...</option>
                                                 <option value="US">United States</option>
                                                 <option value="CA">Canada</option>
                                                 <option value="MX">Mexico</option>
                                             </select>
                                         </div>
                                     )}
                                </div>
                                {docTagSections.length > 0 && (
                                     <div className="space-y-3">
                                         <label className="block text-sm font-semibold text-slate-900">Tags</label>
                                         {docTagSections.map(section => {
                                             const theme = THEME_STYLES[section.colorTheme] || THEME_STYLES.blue;
                                             return (
                                                 <div key={section.sectionId}>
                                                     <label className="block text-xs font-medium text-slate-500 mb-2">{section.sectionTitle}</label>
                                                     <div className="flex flex-wrap gap-2">
                                                         {section.tags.map(tag => (
                                                             <span key={tag.id} className={`px-4 py-2 rounded-full text-sm font-medium border-2 ${theme.bg} ${theme.text} border-transparent`}>{tag.label}</span>
                                                         ))}
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                )}
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
                                    <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-slate-600">Click to upload</p>
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                                <button onClick={() => setEditingDocument(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white">Cancel</button>
                                <button onClick={() => { showToast('Document updated successfully'); setEditingDocument(null); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg">Save Changes</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
            {/* ASSET MODAL */}
            {isAssetModalOpen && (
                <AssetModal
                    asset={editingAsset}
                    onClose={() => { setIsAssetModalOpen(false); setEditingAsset(null); }}
                    onSave={handleSaveAsset}
                    isSaving={isSavingAsset}
                />
            )}
        </div>
    );
};
