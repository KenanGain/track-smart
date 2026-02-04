import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin,
    CheckSquare,
    Bell,
    FileText,
    Search,
    FileDown,
    Building2,
    Truck,
    X,
    Save,
    Plus,
    UploadCloud,
    Trash2,
    Mail,
    ShieldCheck,
    BadgeCheck,
    Globe,
    Users,
    FileKey,
    Package,
    Edit3,
   
    ChevronDown,
  
    Check,
  
    AlertTriangle,
    Phone,
    Calendar,
    CalendarX,
    Shield,
    Hash,
    FileUp,
    StickyNote,

    Clock,
    AlertCircle,
    FileWarning,
    
} from 'lucide-react';
import { LocationEditorModal } from '../../components/locations/LocationEditorModal';
import { KeyNumberModal, type KeyNumberModalData } from '@/components/key-numbers/KeyNumberModal';
import { LocationViewModal } from '../../components/locations/LocationViewModal';
import { DIRECTOR_UI, UI_DATA, INITIAL_VIEW_DATA, OFFICE_LOCATIONS } from './carrier-profile.data';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig } from '@/types/key-numbers.types';
import type { DocumentType, ColorTheme } from '@/data/mock-app-data';
import { THEME_STYLES } from '@/pages/settings/tags/tag-utils';
import { LocationsPage } from '@/pages/account/LocationsPage';
import { AssetDirectoryPage } from '@/pages/assets/AssetDirectoryPage';

// --- HELPER COMPONENTS ---

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    const IconMap: Record<string, any> = { MapPin, CheckSquare, Bell, FileText, FileDown, Building2, Truck, Mail, ShieldCheck, BadgeCheck, Globe, Users, FileKey, Package, Phone, Calendar, CalendarX, Shield, Hash, FileUp, StickyNote, UploadCloud, Plus, AlertTriangle, Clock, AlertCircle, FileWarning };
    const IconComponent = IconMap[name] || FileText;
    return <IconComponent className={className} />;
};

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

const Card = ({ title, icon, editable, children, rightAction, fullWidth = false, className = "", onEdit }: { title: string; icon: string; editable?: boolean; children: React.ReactNode; rightAction?: React.ReactNode; fullWidth?: boolean; className?: string; onEdit?: () => void }) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col ${fullWidth ? 'col-span-1 lg:col-span-2' : ''} ${className}`}>
            <div className="flex items-center justify-between p-6 pb-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <DynamicIcon name={icon} className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    {rightAction}
                    {editable && (
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

// --- MODAL COMPONENTS ---

const GenericEditModal = ({ config, isOpen, onClose, onSave, initialValues }: any) => {
    const [formData, setFormData] = useState(initialValues || {});
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(initialValues || {});
            setErrors({});
        }
    }, [isOpen, initialValues]);

    if (!isOpen || !config) return null;

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
    };

    const handleSave = () => {
        const newErrors: Record<string, boolean> = {};
        let hasError = false;
        config.fields.forEach((field: any) => {
            if (field.required && !formData[field.key]) {
                newErrors[field.key] = true;
                hasError = true;
            }
        });
        if (hasError) {
            setErrors(newErrors);
            return;
        }
        onSave(config.id, formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <DynamicIcon name={config.icon} className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{config.title}</h3>
                            {config.subtitle && <p className="text-sm text-slate-500 mt-0.5">{config.subtitle}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-6">
                        {config.layout.map((row: string[], rowIndex: number) => (
                            <div key={rowIndex} className={`grid gap-6 ${row.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                {row.map((fieldKey: string) => {
                                    const field = config.fields.find((f: any) => f.key === fieldKey);
                                    if (!field) return null;
                                    return (
                                        <div key={fieldKey}>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
                                            {field.type === 'text' || field.type === 'number' || field.type === 'date' ? (
                                                <input type={field.type} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow ${errors[fieldKey] ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'}`} placeholder={field.placeholder} value={formData[fieldKey] || ''} onChange={(e) => handleChange(fieldKey, field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} />
                                            ) : field.type === 'select' ? (
                                                <div className="relative">
                                                    <select className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none bg-white ${errors[fieldKey] ? 'border-red-300' : 'border-slate-300'}`} value={formData[fieldKey] || ''} onChange={(e) => handleChange(fieldKey, e.target.value)}>
                                                        <option value="">Select...</option>
                                                        {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            ) : field.type === 'radioCards' ? (
                                                <div className="space-y-3">
                                                    {field.options.map((opt: any) => (
                                                        <div key={opt.value} onClick={() => handleChange(fieldKey, opt.value)} className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${formData[fieldKey] === opt.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData[fieldKey] === opt.value ? 'border-blue-600' : 'border-slate-300'}`}>
                                                                {formData[fieldKey] === opt.value && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                                                            </div>
                                                            <span className="text-sm font-medium text-slate-700">{opt.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : field.type === 'radioList' ? (
                                                <div className="space-y-2">
                                                    {field.options.map((opt: string) => (
                                                        <label key={opt} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                                            <input type="radio" name={fieldKey} className="mt-1 text-blue-600 focus:ring-blue-500" checked={formData[fieldKey] === opt} onChange={() => handleChange(fieldKey, opt)} />
                                                            <span className="text-sm text-slate-700">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : null}
                                            {errors[fieldKey] && <p className="text-xs text-red-500 mt-1">This field is required.</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"><Save className="w-4 h-4" /> {config.saveLabel}</button>
                </div>
            </div>
        </div>
    );
};

const CargoEditorModal = ({ isOpen, onClose, onSave, initialSelected }: { isOpen: boolean; onClose: () => void; onSave: (id: string, data: any) => void; initialSelected: string[] }) => {
    const config = UI_DATA.cargoEditor;
    const [selected, setSelected] = useState(initialSelected || []);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => { if (isOpen) setSelected(initialSelected || []); }, [isOpen, initialSelected]);
    if (!isOpen) return null;

    const toggleSelection = (item: string) => {
        if (selected.includes(item)) setSelected(selected.filter(i => i !== item));
        else setSelected([...selected, item]);
    };
    const isMatch = (item: string) => item.toLowerCase().includes(searchTerm.toLowerCase());

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Package className="w-5 h-5" /></div>
                        <h3 className="text-lg font-bold text-slate-900">Edit Cargo Carried</h3>
                    </div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder={config.searchPlaceholder} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <span className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-md whitespace-nowrap">{selected.length} Selected</span>
                        <button onClick={() => setSelected([...new Set([...selected, ...config.commonTypes])])} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-50 whitespace-nowrap">{config.selectCommonLabel}</button>
                        <button onClick={() => setSelected([])} className="px-3 py-2 bg-white border border-slate-300 text-red-600 text-xs font-bold rounded-md hover:bg-red-50 whitespace-nowrap">{config.clearAllLabel}</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                    <div className="space-y-8">
                        {config.sections.map((section: any) => {
                            const filteredItems = section.items.filter(isMatch);
                            if (filteredItems.length === 0) return null;
                            return (
                                <div key={section.key}>
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{section.label}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredItems.map((item: string) => (
                                            <button key={item} onClick={() => toggleSelection(item)} className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${selected.includes(item) ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>{item}</button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white">Cancel</button>
                    <button onClick={() => { onSave("cargoEditor", { selected }); onClose(); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</button>
                </div>
            </div>
        </div>
    );
};

const DirectorViewModal = ({ director, isOpen, onClose, onEdit }: any) => {
    if (!isOpen || !director) return null;
    const config = DIRECTOR_UI.viewModal;
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div><h3 className="text-xl font-bold text-slate-900">{config.title}</h3><p className="text-sm text-slate-500 mt-1">{config.subtitle}</p></div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold border-2 border-white shadow-sm">{director.initials}</div>
                        <div>
                            <div className="flex items-center gap-3 mb-1"><h2 className="text-2xl font-bold text-slate-900">{director.name}</h2>{director.isPrimary && <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">Primary Director</span>}</div>
                            <p className="text-sm text-slate-500 font-medium">{director.role} • Since {director.since}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {config.sections.flatMap((s: any) => s.fields).map((field: any) => !field.fullWidth && (
                            <div key={field.key} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm"><DynamicIcon name={field.icon} className="w-5 h-5" /></div>
                                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{field.label}</div><div className="font-semibold text-slate-900 text-sm">{director[field.key]}</div></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Close</button>
                    <button onClick={() => onEdit(director)} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors">Edit Details</button>
                </div>
            </div>
        </div>
    );
};

const DirectorEditModal = ({ director, isOpen, onClose, onSave }: any) => {
    const config = DIRECTOR_UI.editModal;
    const [formData, setFormData] = useState<any>({});

    useEffect(() => { if (isOpen && director) { setFormData({ ...director }); } }, [isOpen, director]);
    if (!isOpen || !director) return null;

    const handleChange = (key: string, value: any) => { setFormData((prev: any) => ({ ...prev, [key]: value })); };
    const handleSubmit = () => { onSave(formData); };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div><h3 className="text-xl font-bold text-slate-900">{config.title}</h3></div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="space-y-6">
                        {config.layout.map((row: string[], i: number) => (
                            <div key={i} className={`grid gap-6 ${row.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                                {row.map((fieldKey: string) => {
                                    const field = config.fields.find((f: any) => f.key === fieldKey);
                                    if (!field) return null;
                                    return (
                                        <div key={fieldKey}>
                                            <label className="block text-sm font-bold text-slate-700 mb-2">{field.label}</label>
                                            <input type={field.type} className="w-full border rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none border-slate-300" value={formData[fieldKey] || ''} onChange={(e) => handleChange(fieldKey, e.target.value)} />
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors">Cancel</button>
                    <button onClick={handleSubmit} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors">{config.saveLabel}</button>
                </div>
            </div>
        </div>
    );
};

// Key Number Add/Edit Modal

export function CarrierProfilePage() {
    const [viewData] = useState(INITIAL_VIEW_DATA);
    const [formConfig, setFormConfig] = useState(UI_DATA);
    const [activeModal, setActiveModal] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: "" });
    const [activeTab, setActiveTab] = useState("fleet");
    const [complianceFilter, setComplianceFilter] = useState('all');
    const [documentFilter, setDocumentFilter] = useState('all');

    const [officeLocations, setOfficeLocations] = useState(OFFICE_LOCATIONS);

    const [keyNumberGroupsCollapsed, setKeyNumberGroupsCollapsed] = useState<Record<string, boolean>>({ carrier: false, bond: false, other: false, regulatory: false, tax: false });
    const [selectedDirectorName, setSelectedDirectorName] = useState<string | null>(null);
    const [directorModalMode, setDirectorModalMode] = useState<string | null>(null);
    const [directorData, setDirectorData] = useState(DIRECTOR_UI.directors);
    const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);
    const [editingDocument, setEditingDocument] = useState<typeof carrierDocuments[0] | null>(null);
    const [viewingDocument, setViewingDocument] = useState<typeof carrierDocuments[0] | null>(null);

    const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);
    const [editingOffice, setEditingOffice] = useState<any>(null);
    const [viewingOffice, setViewingOffice] = useState<any>(null);
    const [isOfficeViewModalOpen, setIsOfficeViewModalOpen] = useState(false);

    const showToast = (msg: string) => {
        setToast({ visible: true, message: msg });
        setTimeout(() => setToast({ visible: false, message: "" }), 3000);
    };

    const handleModalSave = (id: string, newValues: any) => {
        if (id === 'cargoEditor') {
            setFormConfig(prev => ({ ...prev, cargoEditor: { ...prev.cargoEditor, values: newValues } }));
            showToast("Cargo Types updated successfully");
        } else if (id === 'addOfficeLocation') {
            const newOffice = {
                id: `LOC-${Math.floor(Math.random() * 10000)}`,
                label: newValues.label,
                address: newValues.address,
                contact: newValues.contact,
                phone: newValues.phone,
                operatingHours: [
                    { day: "Mon - Fri", hours: "08:00 - 18:00" },
                    { day: "Sat", hours: "Closed" },
                    { day: "Sun", hours: "Closed" }
                ]
            };
            setOfficeLocations([...officeLocations, newOffice]);
            setActiveModal(null);
            showToast("Office Location added successfully");
        } else {
            const modalKey = Object.keys(formConfig.editModals).find(k => (formConfig.editModals as any)[k].id === id);
            if (modalKey) {
                setFormConfig(prev => ({ ...prev, editModals: { ...prev.editModals, [modalKey]: { ...(prev.editModals as any)[modalKey], values: newValues } } }));
                showToast("Changes saved successfully");
            }
        }
    };

    const handleDeleteOffice = (id: string) => {
        setOfficeLocations(prev => prev.filter(office => office.id !== id));
    };

    const handleDirectorSave = (newValues: any) => {
        setDirectorData(prev => ({
            ...prev,
            [newValues.name]: {
                ...newValues,
                initials: newValues.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(),
                since: newValues.since || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                isPrimary: newValues.isPrimary || false
            }
        }));
        setDirectorModalMode(null);
        showToast(directorModalMode === 'add' ? "Director added successfully" : "Director updated successfully");
    };

    const toggleKeyNumberGroup = (key: string) => setKeyNumberGroupsCollapsed(prev => ({ ...prev, [key]: !prev[key] }));

    // Helper to get status tone
    const getStatusTone = (status: string) => {
        if (status === 'Active' || status === 'Valid' || status === 'Uploaded') return 'success';
        if (status === 'Missing' || status === 'Expired') return 'danger';
        if (status === 'Expiring Soon') return 'yellow';
        if (status === 'Incomplete') return 'warning';
        return 'gray';
    };

    // --- CONTEXT DATA ---
    const { documents, keyNumbers, keyNumberValues, updateKeyNumberValue, getDocumentTypeById, tagSections } = useAppData();

    // Transform key numbers to compliance display format
    const complianceGroups = useMemo(() => {
        // Filter: only Active Carrier-type numbers
        const carrierNumbers = keyNumbers.filter(
            (kn: KeyNumberConfig) => kn.entityType === 'Carrier' && kn.status === 'Active'
        );

        // Group by category
        const grouped = carrierNumbers.reduce((acc, kn) => {
            const cat = kn.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(kn);
            return acc;
        }, {} as Record<string, KeyNumberConfig[]>);

        // Convert to display format with calculated status
        return Object.entries(grouped).map(([category, items]) => ({
            key: category.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            label: category.toUpperCase(),
            items: items.map(kn => {
                const val = keyNumberValues[kn.id];
                const hasValue = val?.value && val.value.trim() !== '';
                const hasExpiry = val?.expiryDate && val.expiryDate.trim() !== '';
                const hasDoc = val?.documents && val.documents.length > 0;

                // Calculate status
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

                // Calculate expiry display
                let expiryDisplay = '-';
                if (kn.hasExpiry) {
                    if (hasExpiry) {
                        expiryDisplay = val.expiryDate!;
                        // Check if expiring soon (within 30 days)
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

    // Flatten all items for counting
    const allComplianceItems = complianceGroups.flatMap(g => g.items);

    const counts = {
        missingNumber: allComplianceItems.filter(i => i.value === 'Not entered' || i.status === 'Missing').length,
        missingExpiry: allComplianceItems.filter(i => i.expiry === 'Not set').length,
        missingDoc: allComplianceItems.filter(i => i.docStatus === 'Missing').length,
        expiringSoon: allComplianceItems.filter(i => i.status === 'Expiring Soon').length,
        expired: allComplianceItems.filter(i => i.status === 'Expired').length
    };

    // --- FILTER LOGIC ---
    const filterComplianceItems = (items: any[]) => {
        if (complianceFilter === 'all') return items;
        if (complianceFilter === 'missing_number') return items.filter(i => i.value === 'Not entered' || i.status === 'Missing');
        if (complianceFilter === 'missing_expiry') return items.filter(i => i.expiry === 'Not set');
        if (complianceFilter === 'missing_doc') return items.filter(i => i.docStatus === 'Missing');
        if (complianceFilter === 'expiring_soon') return items.filter(i => i.status === 'Expiring Soon');
        if (complianceFilter === 'expired') return items.filter(i => i.status === 'Expired');
        return items;
    };

    // --- CARRIER DOCUMENTS DATA ---
    const carrierDocuments = useMemo(() => {
        // Filter document types related to Carrier
        const carrierDocTypes = documents.filter((doc: DocumentType) => doc.relatedTo === 'carrier');

        // Find which key numbers link to this document type
        const getLinkedKeyNumber = (docTypeId: string) => {
            const kn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === docTypeId);
            return kn ? kn.numberTypeName : null;
        };

        // Calculate document status
        const getDocStatus = (doc: DocumentType) => {
            // Check if document is uploaded via any key number
            const linkedKn = keyNumbers.find((k: KeyNumberConfig) => k.requiredDocumentTypeId === doc.id);
            const knValue = linkedKn ? keyNumberValues[linkedKn.id] : null;
            const hasUpload = knValue?.documents && knValue.documents.length > 0;
            const expiryStr = knValue?.expiryDate;

            if (!hasUpload) {
                if (doc.requirementLevel === 'required') return 'Missing';
                return 'Not Uploaded';
            }

            // Check expiry
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

            // Get folder path from destination
            const folderPath = doc.destination?.folderName || doc.destination?.root || '—';

            return {
                id: doc.id,
                documentType: doc.name,
                documentName: uploadedDoc?.fileName || '—',
                dateUploaded: uploadedDoc ? new Date().toLocaleDateString() : '—', // Mock date
                status: getDocStatus(doc),
                issueDate: knValue?.issueDate || '—',
                expiryDate: knValue?.expiryDate || '—',
                requirement: doc.requirementLevel || 'optional',
                linkedKeyNumber: getLinkedKeyNumber(doc.id),
                hasUpload: !!(knValue?.documents && knValue.documents.length > 0),
                folderPath,
                docTypeData: doc,
                uploadedDocData: uploadedDoc
            };
        });
    }, [documents, keyNumbers, keyNumberValues]);

    // Document counts for filter cards
    const docCounts = {
        requiredMissing: carrierDocuments.filter(d => d.requirement === 'required' && !d.hasUpload).length,
        expiringSoon: carrierDocuments.filter(d => d.status === 'Expiring Soon').length,
        expired: carrierDocuments.filter(d => d.status === 'Expired').length,
        optionalMissing: carrierDocuments.filter(d => d.requirement === 'optional' && !d.hasUpload).length,
        active: carrierDocuments.filter(d => d.status === 'Active').length
    };

    // Filter documents
    const filterDocumentItems = (items: typeof carrierDocuments) => {
        if (documentFilter === 'all') return items;
        if (documentFilter === 'required_missing') return items.filter(d => d.requirement === 'required' && !d.hasUpload);
        if (documentFilter === 'expiring_soon') return items.filter(d => d.status === 'Expiring Soon');
        if (documentFilter === 'expired') return items.filter(d => d.status === 'Expired');
        if (documentFilter === 'optional_missing') return items.filter(d => d.requirement === 'optional' && !d.hasUpload);
        if (documentFilter === 'active') return items.filter(d => d.status === 'Active');
        return items;
    };

    const corporateData = formConfig.editModals.corporateIdentity.values;
    const legalAddressData = formConfig.editModals.legalMainAddress.values;
    const fleetData = formConfig.editModals.fleetDriverOverview.values;
    const mailingAddressData = formConfig.editModals.mailingAddress.values;
    const opsData = formConfig.editModals.operationsAuthority.values;
    const cargoData = formConfig.cargoEditor.values;
    const activeDirector = (directorModalMode === 'edit' || directorModalMode === 'view') && selectedDirectorName ? directorData[selectedDirectorName as keyof typeof directorData] : null;

    const tabs = [
        { id: 'fleet', label: 'Fleet Overview' },
        { id: 'locations', label: 'Yard Terminals' },
        { id: 'assets', label: 'Assets' },
        { id: 'drivers', label: 'Drivers' },
        { id: 'compliance', label: 'Carrier Compliance' },
        { id: 'documents', label: 'Documents' }
    ];

    return (
        <div className="flex-1 p-4 lg:p-6 overflow-x-hidden bg-slate-50 min-h-screen">
            {/* Header Area */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Building2 className="w-4 h-4" />
                    <span>{viewData.page.breadcrumb[0]}</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-semibold text-slate-900">{viewData.page.breadcrumb[1]}</span>
                </div>
            </div>

            {/* Tab Navigation (Moved Up) */}
            <div className="border-b border-slate-200 mb-6 overflow-x-auto scrollbar-hide">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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


                {activeTab === 'fleet' && (
                    <div className="space-y-6">
                        {/* BIG GENERAL INFO CARD (Moved Inside Fleet Overview) */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Left Column: Carrier Info & Identity */}
                                <div className="flex-1 space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-2">General Information</h2>
                                            <h1 className="text-3xl font-bold text-slate-800 mb-3">{viewData.page.carrierHeader.name}</h1>
                                            <div className="flex flex-wrap items-center gap-6 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-500">ActiveDOT:</span>
                                                    <Badge text="Active" tone="success" className="text-sm px-3 py-1" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-500">CVOR/RIN/NSC:</span>
                                                    <Badge text="Valid" tone="success" className="text-sm px-3 py-1" />
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-600 font-medium px-2 border-l border-slate-200 pl-4">
                                                    <MapPin className="w-4 h-4" /> Wilmington, DE
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => setActiveModal('editCorporateIdentity')} className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-slate-50 transition-colors">
                                            <Edit3 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Corporate Identity Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Legal Name</div>
                                            <div className="font-semibold text-slate-900 text-sm">{corporateData.legalName}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DBA Name</div>
                                            <div className="font-semibold text-slate-900 text-sm">{corporateData.dbaName}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Business Type</div>
                                            <div className="font-semibold text-slate-900 text-sm">{corporateData.businessType}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">State of Inc.</div>
                                            <div className="font-semibold text-slate-900 text-sm">{corporateData.stateOfInc}</div>
                                        </div>
                                    </div>

                                    {/* Operations Data Grid */}
                                    <div className="pt-6 border-t border-slate-100 relative">
                                        <button
                                            onClick={() => setActiveModal('editOperationsAuthority')}
                                            className="absolute right-0 top-6 text-slate-400 hover:text-blue-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-slate-400" /> Operations & Authority
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Operation Classification</div>
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm font-medium">{opsData.operationClassification}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Carrier Operation</div>
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <Globe className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm font-medium">{opsData.carrierOperation}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Authority Type</div>
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <Truck className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm font-medium">{opsData.fmcsaAuthorityType}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Risk Score */}
                                <div className="lg:w-72 flex flex-col justify-center items-center border-t lg:border-t-0 lg:border-l border-slate-100 pl-0 lg:pl-8 pt-6 lg:pt-0">
                                    <div className="text-center">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Carrier Risk Score</div>
                                        <div className="relative w-40 h-40 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                                <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                                <path className="text-blue-600" strokeDasharray="94, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                                <span className="text-4xl font-black text-slate-900">94</span>
                                                <span className="text-xs font-bold text-slate-400">/ 100</span>
                                            </div>
                                        </div>
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                                            <ShieldCheck className="w-3.5 h-3.5" /> Excellent
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card title="Legal / Main Address" icon={formConfig.editModals.legalMainAddress.icon} editable className="h-full" onEdit={() => setActiveModal('editLegalMainAddress')}>
                                <div className="flex flex-col gap-1 justify-center h-full">
                                    <div className="font-medium text-slate-900">{legalAddressData.street} {legalAddressData.apt}</div>
                                    <div className="font-medium text-slate-900">{legalAddressData.city}, {legalAddressData.state} {legalAddressData.zip}</div>
                                    <div className="font-medium text-slate-500 mt-2 text-sm">{legalAddressData.country}</div>
                                </div>
                            </Card>
                            <Card title="Mailing Address" icon={formConfig.editModals.mailingAddress.icon} editable className="h-full" onEdit={() => setActiveModal('editMailingAddress')}>
                                <div className="flex flex-col gap-1 justify-center h-full">
                                    <div className="font-medium text-slate-900">{mailingAddressData.streetOrPo}</div>
                                    <div className="font-medium text-slate-900">{mailingAddressData.city}, {mailingAddressData.state} {mailingAddressData.zip}</div>
                                    <div className="font-medium text-slate-500 mt-2 text-sm">{mailingAddressData.country}</div>
                                </div>
                            </Card>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card title="Fleet & Driver Overview" icon={formConfig.editModals.fleetDriverOverview.icon} editable className="h-full" onEdit={() => setActiveModal('editFleetDriverOverview')}>
                                <div className="grid grid-cols-3 gap-4 h-full items-center">
                                    <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-100 flex flex-col justify-center h-24">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Power Units</div>
                                        <div className="text-2xl font-bold text-slate-900">{fleetData.powerUnits}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-100 flex flex-col justify-center h-24">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Drivers</div>
                                        <div className="text-2xl font-bold text-slate-900">{fleetData.drivers}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-100 flex flex-col justify-center h-24">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Non-CMV</div>
                                        <div className="text-2xl font-bold text-slate-900">{fleetData.nonCmv}</div>
                                    </div>
                                </div>
                            </Card>
                            <Card title="Cargo Carried" icon="Package" editable className="h-full" onEdit={() => setActiveModal('cargoEditor')} rightAction={<span className="text-xs font-medium text-slate-400 mr-2 hidden sm:inline-block">Updated from MCS-150</span>}>
                                <div className="flex flex-wrap gap-3">
                                    {cargoData.selected.map((tag: string, i: number) => (
                                        <span key={i} className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm border ${['Explosives', 'Gases'].includes(tag) ? 'bg-red-700 text-white border-red-700' : 'bg-slate-800 text-slate-100 border-slate-800'}`}>{tag}</span>
                                    ))}
                                </div>
                            </Card>
                        </div>
                        {/* Office Locations */}
                        <Card
                            title="Corporate Office Locations"
                            icon="MapPin"
                            editable={false}
                            rightAction={
                                <button
                                    onClick={() => { setEditingOffice(null); setIsOfficeModalOpen(true); }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                                    title="Add Office Location"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Location
                                </button>
                            }
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Label</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Address</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Contact</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Phone</th>
                                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {officeLocations.map((office) => (
                                            <tr
                                                key={office.id}
                                                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 group cursor-pointer transition-colors"
                                                onClick={() => { setViewingOffice(office); setIsOfficeViewModalOpen(true); }}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{office.label}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{office.id}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-700">{office.address}</td>
                                                <td className="px-6 py-4 text-sm text-slate-700">{office.contact}</td>
                                                <td className="px-6 py-4 text-sm text-slate-700">{office.phone}</td>
                                                <td className="px-6 py-4 text-sm text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setEditingOffice(office); setIsOfficeModalOpen(true); }}
                                                            className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                                                            title="Edit Location"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteOffice(office.id); }}
                                                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                            title="Remove Location"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>

                        {/* Office Location Modals */}
                        <LocationEditorModal
                            type="office"
                            isOpen={isOfficeModalOpen}
                            onClose={() => setIsOfficeModalOpen(false)}
                            onSave={(data) => {
                                if (editingOffice) {
                                    setOfficeLocations(prev => prev.map(o => o.id === editingOffice.id ? { ...o, ...data, operatingHours: data.operatingHours || o.operatingHours } : o));
                                    showToast("Office Location updated successfully");
                                } else {
                                    const newOffice = {
                                        ...data,
                                        id: `LOC-${2000 + officeLocations.length + 1}`,
                                        operatingHours: data.operatingHours || [
                                            { day: "Mon - Fri", hours: "08:00 - 18:00" },
                                            { day: "Sat", hours: "Closed" },
                                            { day: "Sun", hours: "Closed" }
                                        ]
                                    };
                                    setOfficeLocations(prev => [...prev, newOffice]);
                                    showToast("Office Location added successfully");
                                }
                                setIsOfficeModalOpen(false);
                            }}
                            initialData={editingOffice}
                        />

                        <LocationViewModal
                            type="office"
                            data={viewingOffice}
                            isOpen={isOfficeViewModalOpen}
                            onClose={() => setIsOfficeViewModalOpen(false)}
                            onEdit={() => {
                                setIsOfficeViewModalOpen(false);
                                setEditingOffice(viewingOffice);
                                setIsOfficeModalOpen(true);
                            }}
                        />

                        {/* Directors & Officers - Moved from Directors Tab */}
                        <Card title="Directors & Officers" icon="Users" fullWidth rightAction={
                            <button onClick={() => { setSelectedDirectorName(null); setDirectorModalMode('add'); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Add Director
                            </button>
                        }>
                            <div className="overflow-x-auto -mx-6 -my-4">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Title</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Ownership %</th>
                                            <th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {Object.values(directorData).map((director: any, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-slate-900">{director.name}</td>
                                                <td className="px-6 py-4 text-blue-600 font-medium">{director.role}</td>
                                                <td className="px-6 py-4 text-slate-900">{director.ownershipPct}%</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => { setSelectedDirectorName(director.name); setDirectorModalMode('view'); }} className="text-blue-600 font-bold text-xs hover:underline">View More</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'locations' && (
                    <div className="w-full">
                        <LocationsPage hideBreadcrumb={true} />
                    </div>
                )}

                {activeTab === 'assets' && (
                    <div className="w-full">
                        <AssetDirectoryPage isEmbedded={true} />
                    </div>
                )}

                {activeTab === 'drivers' && (
                    <div className="w-full">
                        <Card title="Drivers" icon="Users" fullWidth>
                            <div className="p-6 text-center text-slate-500 py-12">
                                Driver management content will be displayed here.
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'compliance' && (
                    <div className="w-full space-y-6">
                        {/* 5 SPECIFIC COMPLIANCE INDICATORS / FILTERS */}
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
                            icon="FileKey"
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
                                                                        // Find full config for this item to get hasExpiry/documentRequired
                                                                        const config = keyNumbers.find((kn: KeyNumberConfig) => kn.id === item.id);
                                                                        const val = keyNumberValues[item.id];
                                                                        const linkedDocType = config?.requiredDocumentTypeId ? getDocumentTypeById(config.requiredDocumentTypeId) : null;
                                                                        setKeyNumberModalMode('edit');
                                                                        setEditingKeyNumber({
                                                                            id: item.id,
                                                                            configId: item.id,
                                                                            value: val?.value || '',
                                                                            expiryDate: val?.expiryDate || '',
                                                                            issueDate: val?.issueDate || '',
                                                                            tags: val?.tags || [],
                                                                            documents: val?.documents || [],
                                                                            numberRequired: config?.numberRequired !== false, // default true
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

                        {/* DOCUMENTS LIST TABLE */}
                        <Card title="Carrier Documents" icon="FileText" fullWidth>
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
                                                    <Badge
                                                        text={doc.status}
                                                        tone={getStatusTone(doc.status)}
                                                    />
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
            {Object.values(formConfig.editModals).map((modalConfig: any) => (
                <GenericEditModal key={modalConfig.id} config={modalConfig} isOpen={activeModal === modalConfig.id} onClose={() => setActiveModal(null)} onSave={handleModalSave} initialValues={modalConfig.values} />
            ))}
            <CargoEditorModal isOpen={activeModal === 'cargoEditor'} onClose={() => setActiveModal(null)} onSave={handleModalSave} initialSelected={cargoData.selected} />
            <DirectorViewModal director={activeDirector} isOpen={directorModalMode === 'view'} onClose={() => setDirectorModalMode(null)} onEdit={() => setDirectorModalMode('edit')} />
            <DirectorEditModal director={activeDirector || {}} isOpen={directorModalMode === 'edit' || directorModalMode === 'add'} onClose={() => setDirectorModalMode(null)} onSave={handleDirectorSave} />
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
                // Get available tags for this document type
                const docType = editingDocument.docTypeData;
                const getDocTagSections = () => {
                    if (!docType?.selectedTags) return [];
                    const result: { sectionId: string; sectionTitle: string; tags: { id: string; label: string }[]; multiSelect: boolean; colorTheme: ColorTheme }[] = [];
                    for (const [sectionId, selectedTagsFromDoc] of Object.entries(docType.selectedTags)) {
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
                                {/* Related Key Number Info */}
                                {editingDocument.linkedKeyNumber && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-2">
                                        <FileKey className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm text-blue-800">Related to: <strong>{editingDocument.linkedKeyNumber}</strong></span>
                                    </div>
                                )}

                                {/* Folder Destination */}
                                {docType?.destination && (
                                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                        <label className="block text-xs font-medium text-slate-500 mb-1">Destination Folder</label>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            <span>{docType.destination.folderName || docType.destination.root || 'Default'}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Expiry Date & Issue Date - Side by Side */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Expiry Date <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            defaultValue={editingDocument.expiryDate !== '—' ? editingDocument.expiryDate : ''}
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="mm/dd/yyyy"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                            Issue Date <span className="text-slate-400 font-normal">(Optional)</span>
                                        </label>
                                        <input
                                            type="date"
                                            defaultValue={editingDocument.issueDate !== '—' ? editingDocument.issueDate : ''}
                                            className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="mm/dd/yyyy"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-blue-400 -mt-3">Used for renewal reminders & compliance tracking.</p>

                                {/* Tags Section */}
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
                                                            <button
                                                                key={tag.id}
                                                                type="button"
                                                                className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${theme.bg} ${theme.text} border-transparent hover:border-blue-400`}
                                                            >
                                                                {tag.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Supporting Documents Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="block text-sm font-semibold text-slate-900">
                                            Supporting Documents <span className="text-red-500">*</span>
                                        </label>
                                        <button
                                            type="button"
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                        >
                                            <Plus className="w-4 h-4" /> Add Document
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mb-3">Upload documents for: {editingDocument.documentType}</p>

                                    {/* Upload Area */}
                                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer mb-3">
                                        <UploadCloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
                                        <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                                    </div>

                                    {/* Uploaded Documents as Bubbles */}
                                    {editingDocument.hasUpload && (
                                        <div className="flex flex-wrap gap-2">
                                            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-full px-3 py-1.5">
                                                <FileText className="w-4 h-4 text-blue-500" />
                                                <span className="text-slate-700 font-medium text-sm max-w-[180px] truncate">
                                                    {editingDocument.documentName}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                                    <Badge text={editingDocument.status} tone={getStatusTone(editingDocument.status)} />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                                <button
                                    onClick={() => setEditingDocument(null)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        showToast('Document updated successfully');
                                        setEditingDocument(null);
                                    }}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Document View Modal */}
            {viewingDocument && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900">View Document</h2>
                                <p className="text-sm text-slate-500">{viewingDocument.documentName}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors" title="Download">
                                    <FileDown className="w-5 h-5 text-slate-500" />
                                </button>
                                <button onClick={() => setViewingDocument(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-100 p-6 flex items-center justify-center min-h-[500px]">
                            {/* Document Preview Area */}
                            <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">{viewingDocument.documentName}</h3>
                                <p className="text-sm text-slate-500 mb-4">Document Type: {viewingDocument.documentType}</p>
                                <div className="flex flex-col gap-2 text-sm text-slate-600">
                                    <div className="flex justify-between px-4">
                                        <span className="text-slate-400">Uploaded:</span>
                                        <span>{viewingDocument.dateUploaded}</span>
                                    </div>
                                    <div className="flex justify-between px-4">
                                        <span className="text-slate-400">Issue Date:</span>
                                        <span>{viewingDocument.issueDate}</span>
                                    </div>
                                    <div className="flex justify-between px-4">
                                        <span className="text-slate-400">Expiry Date:</span>
                                        <span>{viewingDocument.expiryDate}</span>
                                    </div>
                                    <div className="flex justify-between px-4">
                                        <span className="text-slate-400">Folder:</span>
                                        <span>{viewingDocument.folderPath}</span>
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-slate-100">
                                    <button className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                                        <FileDown className="w-4 h-4" /> Download Document
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CarrierProfilePage;
