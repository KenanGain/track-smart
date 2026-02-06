import React, { useState, useMemo } from 'react';
import {
    FileText,
    Search,
    FileDown,
    ShieldCheck,
    AlertTriangle,
    CalendarX,
    Clock,
    FileWarning,
    X,
    FileKey,
    Package,
    Edit3,
    UploadCloud,
    Plus,
    Check,
    ChevronDown,
    Hash,
    Building2
} from 'lucide-react';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { DocumentType, ColorTheme } from '@/data/mock-app-data';
import { THEME_STYLES } from '@/pages/settings/tags/tag-utils';
import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';

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

// Simplified Card to match CarrierProfilePage usage
const Card = ({ title, icon: Icon, children, rightAction, fullWidth = false, className = "", onEdit }: { title: string; icon: any; children: React.ReactNode; rightAction?: React.ReactNode; fullWidth?: boolean; className?: string; onEdit?: () => void }) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${fullWidth ? 'col-span-1 lg:col-span-2' : ''} ${className}`}>
            <div className="flex items-center justify-between p-6 pb-2">
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
            <div className="p-6 pt-4 flex-1">
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

export const ComplianceDocumentsPage = () => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState<'compliance' | 'documents'>('compliance');
    const [complianceFilter, setComplianceFilter] = useState('all');
    const [documentFilter, setDocumentFilter] = useState('all');
    const [keyNumberGroupsCollapsed, setKeyNumberGroupsCollapsed] = useState<Record<string, boolean>>({ carrier: false, bond: false, other: false, regulatory: false, tax: false });
    
    // Modals
    const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
    const [editingDocument, setEditingDocument] = useState<any | null>(null); // Type inferred from usage
    const [viewingDocument, setViewingDocument] = useState<any | null>(null);
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

    // --- DATA PREPARATION (Copied logic) ---

    // 1. Compliance Groups
    const complianceGroups = useMemo(() => {
        const carrierNumbers = keyNumbers.filter(
            (kn: KeyNumberConfig) => kn.entityType === 'Carrier' && kn.status === 'Active'
        );

        const grouped = carrierNumbers.reduce((acc, kn) => {
            const cat = kn.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(kn);
            return acc;
        }, {} as Record<string, KeyNumberConfig[]>);

        return Object.entries(grouped).map(([category, items]) => ({
            key: category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            label: category.toUpperCase(),
            items: items.map(kn => {
                const val = keyNumberValues[kn.id];
                const hasValue = val?.value && val.value.trim() !== '';
                const hasExpiry = val?.expiryDate && val.expiryDate.trim() !== '';
                const hasDoc = val?.documents && val.documents.length > 0;

                let status = 'Missing';
                let docStatus = kn.documentRequired ? 'Missing' : 'N/A';

                if (hasValue) {
                    if (kn.hasExpiry && !hasExpiry) {
                        status = 'Incomplete';
                    } else {
                        status = 'Active';
                    }
                }
                if (hasDoc) docStatus = 'Uploaded';

                let expiryDisplay = '-';
                if (kn.hasExpiry) {
                    if (hasExpiry) {
                        expiryDisplay = val.expiryDate!;
                        const expiryDate = new Date(val.expiryDate!);
                        const now = new Date();
                        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysUntilExpiry < 0) {
                            status = 'Expired';
                        } else if (daysUntilExpiry <= 30) {
                            status = 'Expiring Soon';
                        }
                    } else {
                        expiryDisplay = 'Not set';
                    }
                }

                return {
                    id: kn.id,
                    type: kn.numberTypeName,
                    value: hasValue ? val.value : 'Not entered',
                    status,
                    expiry: expiryDisplay,
                    docStatus
                };
            })
        }));
    }, [keyNumbers, keyNumberValues]);

    // 2. Carrier Documents
    const carrierDocuments = useMemo(() => {
        const carrierDocTypes = documents.filter((doc: DocumentType) => doc.relatedTo === 'carrier');

        const getLinkedKeyNumber = (docTypeId: string) => {
            const kn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === docTypeId);
            return kn ? kn.numberTypeName : null;
        };

        const getDocStatus = (doc: DocumentType) => {
            const linkedKn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === doc.id);
            const knValue = linkedKn ? keyNumberValues[linkedKn.id] : null;
            const hasUpload = knValue?.documents && knValue.documents.length > 0;
            const expiryStr = knValue?.expiryDate;

            if (!hasUpload) {
                if (doc.requirementLevel === 'required') return 'Missing';
                return 'Not Uploaded';
            }

            if (expiryStr) {
                const expiry = new Date(expiryStr);
                const now = new Date();
                const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntil < 0) return 'Expired';
                if (daysUntil <= 30) return 'Expiring Soon';
            }
            return 'Active';
        };

        return carrierDocTypes.map((doc: DocumentType) => {
            const linkedKn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === doc.id);
            const knValue = linkedKn ? keyNumberValues[linkedKn.id] : null;
            const uploadedDoc = knValue?.documents?.[0];

            return {
                id: doc.id,
                documentType: doc.name,
                documentName: uploadedDoc?.fileName || '—',
                dateUploaded: uploadedDoc ? new Date().toLocaleDateString() : '—',
                status: getDocStatus(doc),
                issueDate: knValue?.issueDate || '—',
                expiryDate: knValue?.expiryDate || '—',
                requirement: doc.requirementLevel || 'optional',
                linkedKeyNumber: getLinkedKeyNumber(doc.id),
                hasUpload: !!(knValue?.documents && knValue.documents.length > 0),
                folderPath: doc.destination?.folderName || doc.destination?.root || '—',
                docTypeData: doc,
                uploadedDocData: uploadedDoc
            };
        });
    }, [documents, keyNumbers, keyNumberValues]);

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

    const filterDocumentItems = (items: typeof carrierDocuments) => {
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
        requiredMissing: carrierDocuments.filter(d => d.requirement === 'required' && !d.hasUpload).length,
        expiringSoon: carrierDocuments.filter(d => d.status === 'Expiring Soon').length,
        expired: carrierDocuments.filter(d => d.status === 'Expired').length,
        optionalMissing: carrierDocuments.filter(d => d.requirement === 'optional' && !d.hasUpload).length,
        active: carrierDocuments.filter(d => d.status === 'Active').length
    };

    const tabs = [
        { id: 'compliance', label: 'Carrier Compliance' },
        { id: 'documents', label: 'Documents' }
    ];

    return (
        <div className="flex-1 p-4 lg:p-6 overflow-x-hidden bg-slate-50 min-h-screen">
             {/* Header Area matching Profile Page */}
             <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Building2 className="w-4 h-4" />
                    <span>Dashboard</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-semibold text-slate-900">Compliance & Documents</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'compliance' && (
                    <div className="w-full space-y-6">
                         {/* COMPLIANCE INDICATORS */}
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <button onClick={() => setComplianceFilter('missing_number')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${complianceFilter === 'missing_number' ? 'ring-1 ring-red-500 border-l-red-500' : 'border-l-red-500 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-red-50 text-red-600"><Hash className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Missing<br />Number</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{counts.missingNumber}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('missing_expiry')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${complianceFilter === 'missing_expiry' ? 'ring-1 ring-orange-400 border-l-orange-400' : 'border-l-orange-400 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-orange-50 text-orange-600"><CalendarX className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Missing<br />Expiry</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{counts.missingExpiry}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('missing_doc')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${complianceFilter === 'missing_doc' ? 'ring-1 ring-orange-500 border-l-orange-500' : 'border-l-orange-500 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-orange-50 text-orange-600"><FileWarning className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Missing<br />Doc</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{counts.missingDoc}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('expiring_soon')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${complianceFilter === 'expiring_soon' ? 'ring-1 ring-yellow-500 border-l-yellow-500' : 'border-l-yellow-500 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-yellow-50 text-yellow-600"><Clock className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Expiring<br />Soon</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{counts.expiringSoon}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('expired')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${complianceFilter === 'expired' ? 'ring-1 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-red-50 text-red-600"><AlertTriangle className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Expired</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{counts.expired}</div>
                            </button>
                        </div>
                        
                        {complianceFilter !== 'all' && (
                            <div className="flex justify-end">
                                <button onClick={() => setComplianceFilter('all')} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                    <X className="w-3 h-3" /> Clear Filter
                                </button>
                            </div>
                        )}

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
                             <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left text-sm table-fixed">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 w-1/4">Number Type</th>
                                            <th className="px-6 py-3 w-1/4">Value</th>
                                            <th className="px-6 py-3 w-1/4">Status</th>
                                            <th className="px-6 py-3 w-1/4">Expiry</th>
                                            <th className="px-6 py-3 w-24 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {complianceGroups.map(group => {
                                            const isCollapsed = keyNumberGroupsCollapsed[group.key] ?? false;
                                            const visibleItems = filterComplianceItems(group.items);
                                            if (complianceFilter !== 'all' && visibleItems.length === 0) return null;

                                            return (
                                                <React.Fragment key={group.key}>
                                                    <tr className="bg-slate-100/50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleKeyNumberGroup(group.key)}>
                                                        <td colSpan={5} className="px-6 py-2.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="font-bold text-xs uppercase text-slate-500 tracking-wider pl-2">{group.label}</span>
                                                                <div className="flex items-center gap-3">
                                                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {!isCollapsed && visibleItems.map((item, idx) => (
                                                        <tr key={idx}>
                                                            <td className="px-6 py-4 font-semibold text-slate-900 truncate">{item.type}</td>
                                                            <td className="px-6 py-4 text-slate-400 italic">{item.value}</td>
                                                            <td className="px-6 py-4">
                                                                <Badge text={item.status} tone={getStatusTone(item.status)} />
                                                            </td>
                                                            <td className="px-6 py-4 text-slate-500 italic">{item.expiry}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button
                                                                    onClick={() => {
                                                                        const config = keyNumbers.find((kn: KeyNumberConfig) => kn.id === item.id);
                                                                        const val = keyNumberValues[item.id];
                                                                        const linkedDocType = config?.requiredDocumentTypeId ? getDocumentTypeById(config.requiredDocumentTypeId) : undefined;
                                                                        setKeyNumberModalMode('edit');
                                                                        setEditingKeyNumber({
                                                                            id: item.id,
                                                                            configId: item.id,
                                                                            value: val?.value || '',
                                                                            expiryDate: val?.expiryDate || '',
                                                                            issueDate: val?.issueDate || '',
                                                                            tags: val?.tags || [],
                                                                            documents: val?.documents || [],
                                                                            numberRequired: config?.numberRequired !== false,
                                                                            hasExpiry: config?.hasExpiry || false,
                                                                            documentRequired: config?.documentRequired || false,
                                                                            requiredDocumentTypeId: config?.requiredDocumentTypeId,
                                                                            linkedDocumentType: linkedDocType
                                                                        });
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                >
                                                                    <Edit3 className="w-4 h-4" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="w-full space-y-6">
                        {/* DOCUMENT FILTER INDICATORS */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            <button onClick={() => setDocumentFilter('required_missing')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${documentFilter === 'required_missing' ? 'ring-1 ring-red-500 border-l-red-500' : 'border-l-red-500 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-red-50 text-red-600"><AlertTriangle className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Required<br />Missing</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{docCounts.requiredMissing}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('expiring_soon')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${documentFilter === 'expiring_soon' ? 'ring-1 ring-yellow-500 border-l-yellow-500' : 'border-l-yellow-500 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-yellow-50 text-yellow-600"><Clock className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Expiring<br />Soon</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{docCounts.expiringSoon}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('expired')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${documentFilter === 'expired' ? 'ring-1 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-red-50 text-red-600"><CalendarX className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Expired</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{docCounts.expired}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('optional_missing')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${documentFilter === 'optional_missing' ? 'ring-1 ring-orange-400 border-l-orange-400' : 'border-l-orange-400 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-orange-50 text-orange-600"><FileWarning className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Optional<br />Missing</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{docCounts.optionalMissing}</div>
                            </button>
                             <button onClick={() => setDocumentFilter('active')} className={`flex items-center justify-between p-3 bg-white rounded-lg border border-l-4 shadow-sm hover:shadow transition-all ${documentFilter === 'active' ? 'ring-1 ring-green-500 border-l-green-500' : 'border-l-green-500 border-slate-200'}`}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-green-50 text-green-600"><ShieldCheck className="w-3.5 h-3.5" /></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide leading-tight">Active</span>
                                </div>
                                <div className="text-lg font-bold text-slate-900">{docCounts.active}</div>
                            </button>
                        </div>

                         {documentFilter !== 'all' && (
                            <div className="flex justify-end">
                                <button onClick={() => setDocumentFilter('all')} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                                    <X className="w-3 h-3" /> Clear Filter
                                </button>
                            </div>
                        )}

                        <Card title="Carrier Documents" icon={FileText} fullWidth>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-semibold tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Document Type</th>
                                            <th className="px-4 py-3">Document Name</th>
                                            <th className="px-4 py-3">Folder</th>
                                            <th className="px-4 py-3">Date Uploaded</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Issue Date</th>
                                            <th className="px-4 py-3">Expiry Date</th>
                                            <th className="px-4 py-3 text-center w-24">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filterDocumentItems(carrierDocuments).map((doc) => (
                                            <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-4">
                                                    <div>
                                                        <div className="font-medium text-slate-900">{doc.documentType}</div>
                                                        {doc.linkedKeyNumber && (
                                                            <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                                                                <FileKey className="w-3 h-3" /> Related to: {doc.linkedKeyNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-slate-700">{doc.documentName}</td>
                                                <td className="px-4 py-4 text-slate-500 text-xs">{doc.folderPath}</td>
                                                <td className="px-4 py-4 text-slate-500">{doc.dateUploaded}</td>
                                                <td className="px-4 py-4">
                                                    <Badge text={doc.status} tone={getStatusTone(doc.status)} />
                                                </td>
                                                <td className="px-4 py-4 text-slate-500">{doc.issueDate}</td>
                                                <td className="px-4 py-4">
                                                    {doc.status === 'Expiring Soon' || doc.status === 'Expired' ? (
                                                        <span className={doc.status === 'Expired' ? 'text-red-600 font-medium' : 'text-yellow-600 font-medium'}>
                                                            {doc.expiryDate}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500">{doc.expiryDate}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {doc.hasUpload && (
                                                            <button
                                                                onClick={() => setViewingDocument(doc)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="View Document"
                                                            >
                                                                <FileDown className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setEditingDocument(doc)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filterDocumentItems(carrierDocuments).length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                                                    No documents match the current filter
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

            <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />

            <KeyNumberModal
                isOpen={keyNumberModalMode !== null}
                onClose={() => {
                    setKeyNumberModalMode(null);
                    setEditingKeyNumber(null);
                }}
                onSave={(data) => {
                    updateKeyNumberValue(data.configId, data.value, data.expiryDate, data.issueDate, data.tags, data.documents);
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
                        const selectedTagsFromDoc = tags as string[];
                         const section = tagSections.find(s => s.id === sectionId);
                         if (section && selectedTagsFromDoc.length > 0) {
                             const availableTags = section.tags.filter(t => selectedTagsFromDoc.some(st => st.id === t.id));
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
                                     <div>
                                         <label className="block text-sm font-medium text-slate-700 mb-1.5">Expiry Date</label>
                                         <input type="date" defaultValue={editingDocument.expiryDate !== '—' ? editingDocument.expiryDate : ''} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm" />
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-slate-700 mb-1.5">Issue Date</label>
                                         <input type="date" defaultValue={editingDocument.issueDate !== '—' ? editingDocument.issueDate : ''} className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm" />
                                     </div>
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
        </div>
    );
};
