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
    Mail,
    ShieldCheck,
    BadgeCheck,
    Globe,
    Users,
    FileKey,
    Package,
    Edit3,
    Plus,
    ChevronDown,
    X,
    Check,
    Save,
    AlertTriangle,
    Phone,
    Calendar,
    CalendarX,
    Shield,
    Hash,
    FileUp,
    StickyNote,
    UploadCloud,
    Clock,
    AlertCircle,
    FileWarning
} from 'lucide-react';
import { DIRECTOR_UI, UI_DATA, INITIAL_VIEW_DATA } from './carrier-profile.data';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig, UploadedDocument } from '@/types/key-numbers.types';
import type { DocumentType, TagSection, ColorTheme } from '@/data/mock-app-data';
import { THEME_STYLES } from '@/pages/settings/tags/tag-utils';

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

// Key Number Add/Edit Modal - Full Specification Implementation
interface KeyNumberModalData {
    // For Edit mode - the key number being edited
    id?: string;
    configId?: string;
    // Form data
    value: string;
    expiryDate: string;
    issueDate: string;
    tags: string[];
    documents: UploadedDocument[];
    // Config flags (populated based on selected type or from edit data)
    numberRequired: boolean;
    hasExpiry: boolean;
    documentRequired: boolean;
    requiredDocumentTypeId?: string;
    linkedDocumentType?: DocumentType | null;
}

interface KeyNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        configId: string;
        value: string;
        expiryDate?: string;
        issueDate?: string;
        tags?: string[];
        documents?: UploadedDocument[];
    }) => void;
    mode: 'add' | 'edit';
    entityType: 'Carrier' | 'Asset' | 'Driver';
    // For edit mode
    editData?: KeyNumberModalData | null;
    // Available key number types
    availableKeyNumbers: KeyNumberConfig[];
    tagSections: TagSection[];
    getDocumentTypeById: (id: string) => DocumentType | undefined;
}

const KeyNumberModal = ({
    isOpen,
    onClose,
    onSave,
    mode,
    entityType,
    editData,
    availableKeyNumbers,
    tagSections,
    getDocumentTypeById
}: KeyNumberModalProps) => {
    // Selected key number type (for Add mode)
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');

    // Form fields
    const [formValue, setFormValue] = useState('');
    const [formExpiry, setFormExpiry] = useState('');
    const [formIssueDate, setFormIssueDate] = useState('');
    const [formTags, setFormTags] = useState<Record<string, string[]>>({});
    const [formDocuments, setFormDocuments] = useState<UploadedDocument[]>([]);

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Get the active config based on mode
    const activeConfig = useMemo(() => {
        if (mode === 'edit' && editData?.configId) {
            return availableKeyNumbers.find(kn => kn.id === editData.configId);
        }
        if (mode === 'add' && selectedTypeId) {
            return availableKeyNumbers.find(kn => kn.id === selectedTypeId);
        }
        return null;
    }, [mode, editData, selectedTypeId, availableKeyNumbers]);

    // Get linked document type
    const linkedDocType = useMemo(() => {
        if (activeConfig?.requiredDocumentTypeId) {
            return getDocumentTypeById(activeConfig.requiredDocumentTypeId);
        }
        return null;
    }, [activeConfig, getDocumentTypeById]);

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && editData) {
                setSelectedTypeId(editData.configId || '');
                setFormValue(editData.value === 'Not entered' ? '' : editData.value);
                setFormExpiry(editData.expiryDate || '');
                setFormIssueDate(editData.issueDate || '');
                // Convert tags array to Record format for form
                const tagsRecord: Record<string, string[]> = {};
                editData.tags?.forEach(tagId => {
                    // Find which section this tag belongs to
                    for (const section of tagSections) {
                        if (section.tags.some(t => t.id === tagId)) {
                            if (!tagsRecord[section.id]) tagsRecord[section.id] = [];
                            tagsRecord[section.id].push(tagId);
                        }
                    }
                });
                setFormTags(tagsRecord);
                setFormDocuments(editData.documents || []);
            } else {
                // Add mode - reset everything
                setSelectedTypeId('');
                setFormValue('');
                setFormExpiry('');
                setFormIssueDate('');
                setFormTags({});
                setFormDocuments([]);
            }
            setErrors({});
        }
    }, [isOpen, mode, editData, tagSections]);

    if (!isOpen) return null;

    // Filter available key numbers by entity type
    const filteredKeyNumbers = availableKeyNumbers.filter(
        kn => kn.entityType === entityType && kn.status === 'Active'
    );

    // Get available tags from linked document type
    const getAvailableTagSections = (): { sectionId: string; sectionTitle: string; tags: { id: string; label: string }[]; multiSelect: boolean; colorTheme: ColorTheme }[] => {
        if (!linkedDocType?.selectedTags) return [];

        const result: { sectionId: string; sectionTitle: string; tags: { id: string; label: string }[]; multiSelect: boolean; colorTheme: ColorTheme }[] = [];

        for (const [sectionId, selectedTagsFromDoc] of Object.entries(linkedDocType.selectedTags)) {
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

    const availableTagSections = getAvailableTagSections();

    // Document handlers
    const handleAddDocument = () => {
        const newDoc: UploadedDocument = {
            id: `doc_${Date.now()}`,
            fileName: '',
            uploadedAt: new Date().toISOString(),
            expiryDate: formExpiry, // Inherit from key number
            issueDate: '',
            selectedTags: { ...formTags }, // Default to key number tags
            notes: ''
        };
        setFormDocuments(prev => [...prev, newDoc]);
    };

    const handleRemoveDocument = (docId: string) => {
        setFormDocuments(prev => prev.filter(d => d.id !== docId));
    };

    // Validation
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Must select a type in Add mode
        if (mode === 'add' && !selectedTypeId) {
            newErrors.type = 'Please select a key number type.';
        }

        if (activeConfig) {
            // Value required check
            if (activeConfig.numberRequired !== false && !formValue.trim()) {
                newErrors.value = 'Number value is required.';
            }

            // Expiry required check
            if (activeConfig.hasExpiry && !formExpiry) {
                newErrors.expiry = 'Expiry date is required.';
            }

            // Document required check
            if (activeConfig.documentRequired) {
                const validDocs = formDocuments.filter(d => d.fileName.trim());
                if (validDocs.length === 0) {
                    newErrors.documents = 'At least one document is required.';
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate()) return;
        if (!activeConfig) return;

        // Build tags array from record
        const tagsArray: string[] = [];
        Object.values(formTags).forEach(tagIds => tagsArray.push(...tagIds));

        // Filter valid documents and set inherited expiry
        const validDocs = formDocuments
            .filter(d => d.fileName.trim())
            .map(d => ({
                ...d,
                expiryDate: d.expiryDate || formExpiry, // Inherit if not set
            }));

        onSave({
            configId: activeConfig.id,
            value: formValue,
            expiryDate: activeConfig.hasExpiry ? formExpiry : undefined,
            issueDate: formIssueDate || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
            documents: activeConfig.documentRequired ? validDocs : undefined
        });
        onClose();
    };

    const isFormValid = () => {
        if (mode === 'add' && !selectedTypeId) return false;
        if (!activeConfig) return false;
        if (activeConfig.numberRequired !== false && !formValue.trim()) return false;
        if (activeConfig.hasExpiry && !formExpiry) return false;
        if (activeConfig.documentRequired && formDocuments.filter(d => d.fileName.trim()).length === 0) return false;
        return true;
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-[680px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">
                            {mode === 'add' ? 'Add Key Number' : 'Edit Key Number'}
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {mode === 'add'
                                ? `Add key number details for this ${entityType}`
                                : activeConfig?.numberTypeName || 'Key Number'
                            }
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Section 1: Select Number Type (Add mode only) */}
                    {mode === 'add' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Key Number Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.type ? 'border-red-400' : 'border-slate-300'}`}
                                value={selectedTypeId}
                                onChange={(e) => {
                                    setSelectedTypeId(e.target.value);
                                    setErrors(prev => ({ ...prev, type: '' }));
                                }}
                            >
                                <option value="">Select a number…</option>
                                {filteredKeyNumbers.map(kn => (
                                    <option key={kn.id} value={kn.id}>{kn.numberTypeName}</option>
                                ))}
                            </select>
                            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
                            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> This list is configured in Settings → Key Numbers.
                            </p>
                        </div>
                    )}

                    {/* Section 2: Number Value */}
                    {(mode === 'edit' || selectedTypeId) && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                Number Value {activeConfig?.numberRequired !== false && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="text"
                                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.value ? 'border-red-400' : 'border-slate-300'}`}
                                placeholder="Enter USDOT / Plate / CVOR…"
                                value={formValue}
                                onChange={(e) => {
                                    setFormValue(e.target.value);
                                    setErrors(prev => ({ ...prev, value: '' }));
                                }}
                            />
                            {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                            {activeConfig?.numberRequired === false && (
                                <p className="text-xs text-slate-400 mt-1">Optional field</p>
                            )}
                        </div>
                    )}

                    {/* Section 3: Expiry / Issue Dates */}
                    {activeConfig?.hasExpiry && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Expiry Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors.expiry ? 'border-red-400' : 'border-slate-300'}`}
                                    value={formExpiry}
                                    onChange={(e) => {
                                        setFormExpiry(e.target.value);
                                        setErrors(prev => ({ ...prev, expiry: '' }));
                                        // Update all documents with new expiry as default
                                        setFormDocuments(prev => prev.map(d => ({
                                            ...d,
                                            expiryDate: d.expiryDate || e.target.value
                                        })));
                                    }}
                                />
                                {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                                <p className="text-xs text-slate-400 mt-1">Used for renewal reminders & compliance tracking.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Issue Date <span className="text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none border-slate-300"
                                    value={formIssueDate}
                                    onChange={(e) => setFormIssueDate(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Section 4: Tags (if document type has tags enabled) */}
                    {availableTagSections.length > 0 && (
                        <div className="border-t border-slate-100 pt-5">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Tags</label>
                            <div className="space-y-4">
                                {availableTagSections.map(section => {
                                    const theme = THEME_STYLES[section.colorTheme] || THEME_STYLES.blue;
                                    const selectedTagIds = formTags[section.sectionId] || [];

                                    const handleTagToggle = (tagId: string) => {
                                        setFormTags(prev => {
                                            const current = prev[section.sectionId] || [];
                                            if (section.multiSelect) {
                                                // Multi-select: toggle
                                                if (current.includes(tagId)) {
                                                    return { ...prev, [section.sectionId]: current.filter(id => id !== tagId) };
                                                } else {
                                                    return { ...prev, [section.sectionId]: [...current, tagId] };
                                                }
                                            } else {
                                                // Single select: replace or toggle off
                                                if (current.includes(tagId)) {
                                                    return { ...prev, [section.sectionId]: [] };
                                                } else {
                                                    return { ...prev, [section.sectionId]: [tagId] };
                                                }
                                            }
                                        });
                                    };

                                    return (
                                        <div key={section.sectionId}>
                                            <label className="block text-xs font-medium text-slate-500 mb-2">{section.sectionTitle}</label>
                                            <div className="flex flex-wrap gap-2">
                                                {section.tags.map(tag => {
                                                    const isSelected = selectedTagIds.includes(tag.id);
                                                    return (
                                                        <button
                                                            key={tag.id}
                                                            type="button"
                                                            onClick={() => handleTagToggle(tag.id)}
                                                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${isSelected
                                                                ? `${theme.selectedBg} text-white border-transparent`
                                                                : `${theme.bg} ${theme.text} border-transparent ${theme.hoverBorder}`
                                                                }`}
                                                        >
                                                            {isSelected && <Check className="w-3.5 h-3.5 inline mr-1" />}
                                                            {tag.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Section 5: Supporting Documents */}
                    {activeConfig?.documentRequired && linkedDocType && (
                        <div className="border-t border-slate-100 pt-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Supporting Documents <span className="text-red-500">*</span>
                                    </label>
                                    <p className="text-xs text-slate-400">Upload documents for: {linkedDocType.name}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddDocument}
                                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Document
                                </button>
                            </div>
                            {errors.documents && <p className="text-xs text-red-500 mb-2">{errors.documents}</p>}

                            {/* Upload Area */}
                            <div
                                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
                                onClick={handleAddDocument}
                            >
                                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm font-medium text-slate-600">Click to upload or drag & drop</p>
                                <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                            </div>

                            {/* Uploaded Documents as Bubbles */}
                            {formDocuments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {formDocuments.map((doc) => (
                                        <div
                                            key={doc.id}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-full text-sm"
                                        >
                                            <FileText className="w-4 h-4 text-blue-500" />
                                            <span className="text-slate-700 font-medium max-w-[180px] truncate">
                                                {doc.fileName || 'Untitled.pdf'}
                                            </span>
                                            {doc.fileSize && (
                                                <span className="text-xs text-slate-400">
                                                    ({(doc.fileSize / 1024).toFixed(0)}KB)
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDocument(doc.id)}
                                                className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded-full transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!isFormValid()}
                        className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};



// --- MAIN DASHBOARD COMPONENT ---

export function CarrierProfilePage() {
    const [viewData] = useState(INITIAL_VIEW_DATA);
    const [formConfig, setFormConfig] = useState(UI_DATA);
    const [activeModal, setActiveModal] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: "" });
    const [activeTab, setActiveTab] = useState("fleet");
    const [complianceFilter, setComplianceFilter] = useState('all');
    const [documentFilter, setDocumentFilter] = useState('all');

    // Key Numbers State
    const [keyNumberGroupsCollapsed, setKeyNumberGroupsCollapsed] = useState<Record<string, boolean>>({
        carrier: false,
        bond: false,
        other: false,
        regulatory: false,
        tax: false
    });

    // Director State
    const [selectedDirectorName, setSelectedDirectorName] = useState<string | null>(null);
    const [directorModalMode, setDirectorModalMode] = useState<string | null>(null);
    const [directorData, setDirectorData] = useState(DIRECTOR_UI.directors);

    // Key Number Modal State
    const [keyNumberModalMode, setKeyNumberModalMode] = useState<'add' | 'edit' | null>(null);
    const [editingKeyNumber, setEditingKeyNumber] = useState<KeyNumberModalData | null>(null);

    // Document Modal State
    const [editingDocument, setEditingDocument] = useState<typeof carrierDocuments[0] | null>(null);
    const [viewingDocument, setViewingDocument] = useState<typeof carrierDocuments[0] | null>(null);

    const showToast = (msg: string) => {
        setToast({ visible: true, message: msg });
        setTimeout(() => setToast({ visible: false, message: "" }), 3000);
    };

    const handleModalSave = (id: string, newValues: any) => {
        if (id === 'cargoEditor') {
            setFormConfig(prev => ({ ...prev, cargoEditor: { ...prev.cargoEditor, values: newValues } }));
            showToast("Cargo Types updated successfully");
        } else {
            const modalKey = Object.keys(formConfig.editModals).find(k => (formConfig.editModals as any)[k].id === id);
            if (modalKey) {
                setFormConfig(prev => ({ ...prev, editModals: { ...prev.editModals, [modalKey]: { ...(prev.editModals as any)[modalKey], values: newValues } } }));
                showToast("Changes saved successfully");
            }
        }
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
        { id: 'directors', label: 'Directors' },
        { id: 'compliance', label: 'Carrier Compliance' },
        { id: 'documents', label: 'Documents' }
    ];

    return (
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden bg-slate-50 min-h-screen">
            {/* Header Area */}
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <Building2 className="w-4 h-4" />
                    <span>{viewData.page.breadcrumb[0]}</span>
                    <span className="text-slate-300">/</span>
                    <span className="font-semibold text-slate-900">{viewData.page.breadcrumb[1]}</span>
                </div>
            </div>

            {/* BIG GENERAL INFO CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column: Carrier Info & Identity */}
                    <div className="flex-1 space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">General Information</h2>
                                <h1 className="text-3xl font-extrabold text-slate-800 mb-3">{viewData.page.carrierHeader.name}</h1>
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
                    <div className="lg:w-72 flex flex-col justify-center items-center border-l border-slate-100 pl-0 lg:pl-8 pt-6 lg:pt-0">
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

            {/* Tab Navigation */}
            <div className="border-b border-slate-200 mb-6">
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
                                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex flex-col justify-center h-24">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Power Units</div>
                                        <div className="text-2xl font-bold text-slate-900">{fleetData.powerUnits}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex flex-col justify-center h-24">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Drivers</div>
                                        <div className="text-2xl font-bold text-slate-900">{fleetData.drivers}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex flex-col justify-center h-24">
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
                    </div>
                )}

                {activeTab === 'compliance' && (
                    <div className="w-full space-y-6">
                        {/* 5 SPECIFIC COMPLIANCE INDICATORS / FILTERS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <button onClick={() => setComplianceFilter('missing_number')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${complianceFilter === 'missing_number' ? 'ring-2 ring-red-500 border-l-red-500' : 'border-l-red-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-red-50 text-red-600"><Hash className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Number</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{counts.missingNumber}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('missing_expiry')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${complianceFilter === 'missing_expiry' ? 'ring-2 ring-orange-400 border-l-orange-400' : 'border-l-orange-400 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-orange-50 text-orange-600"><CalendarX className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Expiry</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{counts.missingExpiry}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('missing_doc')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${complianceFilter === 'missing_doc' ? 'ring-2 ring-orange-500 border-l-orange-500' : 'border-l-orange-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-orange-50 text-orange-600"><FileWarning className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Missing Doc</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{counts.missingDoc}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('expiring_soon')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${complianceFilter === 'expiring_soon' ? 'ring-2 ring-yellow-500 border-l-yellow-500' : 'border-l-yellow-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-yellow-50 text-yellow-600"><Clock className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring Soon</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{counts.expiringSoon}</div>
                            </button>
                            <button onClick={() => setComplianceFilter('expired')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${complianceFilter === 'expired' ? 'ring-2 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-red-50 text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{counts.expired}</div>
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
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-6 py-3 border-b border-slate-200 w-1/4">Number Type</th>
                                            <th className="px-6 py-3 border-b border-slate-200 w-1/4">Value</th>
                                            <th className="px-6 py-3 border-b border-slate-200 w-1/4">Status</th>
                                            <th className="px-6 py-3 border-b border-slate-200 w-1/4">Expiry</th>
                                            <th className="px-6 py-3 border-b border-slate-200 w-24 text-right">Actions</th>
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

                {activeTab === 'directors' && (
                    <div className="w-full">
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

                {activeTab === 'documents' && (
                    <div className="w-full space-y-6">
                        {/* DOCUMENT FILTER INDICATORS */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <button onClick={() => setDocumentFilter('required_missing')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${documentFilter === 'required_missing' ? 'ring-2 ring-red-500 border-l-red-500' : 'border-l-red-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-red-50 text-red-600"><AlertTriangle className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Missing</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{docCounts.requiredMissing}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('expiring_soon')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${documentFilter === 'expiring_soon' ? 'ring-2 ring-yellow-500 border-l-yellow-500' : 'border-l-yellow-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-yellow-50 text-yellow-600"><Clock className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiring Soon</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{docCounts.expiringSoon}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('expired')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${documentFilter === 'expired' ? 'ring-2 ring-red-600 border-l-red-600' : 'border-l-red-600 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-red-50 text-red-600"><CalendarX className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{docCounts.expired}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('optional_missing')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${documentFilter === 'optional_missing' ? 'ring-2 ring-orange-400 border-l-orange-400' : 'border-l-orange-400 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-orange-50 text-orange-600"><FileWarning className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Optional Missing</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{docCounts.optionalMissing}</div>
                            </button>
                            <button onClick={() => setDocumentFilter('active')} className={`p-4 bg-white rounded-xl border border-l-4 shadow-sm text-left hover:shadow-md transition-all ${documentFilter === 'active' ? 'ring-2 ring-green-500 border-l-green-500' : 'border-l-green-500 border-slate-200'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 rounded-full bg-green-50 text-green-600"><ShieldCheck className="w-5 h-5" /></div>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</span>
                                </div>
                                <div className="text-2xl font-bold text-slate-900">{docCounts.active}</div>
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
                                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-slate-200">Document Type</th>
                                            <th className="px-4 py-3 border-b border-slate-200">Document Name</th>
                                            <th className="px-4 py-3 border-b border-slate-200">Folder</th>
                                            <th className="px-4 py-3 border-b border-slate-200">Date Uploaded</th>
                                            <th className="px-4 py-3 border-b border-slate-200">Status</th>
                                            <th className="px-4 py-3 border-b border-slate-200">Issue Date</th>
                                            <th className="px-4 py-3 border-b border-slate-200">Expiry Date</th>
                                            <th className="px-4 py-3 border-b border-slate-200 text-center w-24">Actions</th>
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
                    updateKeyNumberValue(data.configId, data.value, data.expiryDate, data.documents);
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
