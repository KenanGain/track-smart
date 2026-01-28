import React, { useState, useEffect, useMemo } from 'react';
import {
    MapPin, FileText, Search, FileDown, Building2, Truck, Mail, ShieldCheck,
    BadgeCheck, Globe, Users, Package, Edit3, Plus, ChevronDown, Copy,
    X, Check, Save, Phone, Calendar, CalendarX, Shield, FileUp, SquarePen
} from 'lucide-react';
import { DIRECTOR_UI, UI_DATA, INITIAL_VIEW_DATA } from './carrier-profile.data';
import { useAppData } from '@/context/AppDataContext';
import { CATEGORIES } from '@/data/key-numbers-mock-data';

// Helper Components
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
    const IconMap: Record<string, any> = { MapPin, FileText, FileDown, Building2, Truck, Mail, ShieldCheck, BadgeCheck, Globe, Users, Package, Phone, Calendar, CalendarX, Shield, Plus };
    const IconComponent = IconMap[name] || FileText;
    return <IconComponent className={className} />;
};

const Badge = ({ text, tone, className = "" }: { text: string; tone: string; className?: string }) => {
    const styles = tone === 'success' ? "bg-green-100 text-green-700 border-green-200" : tone === 'info' ? "bg-blue-100 text-blue-700 border-blue-200" : tone === 'danger' ? "bg-red-100 text-red-700 border-red-200" : "bg-gray-100 text-gray-700 border-gray-200";
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles} ${className}`}>{text}</span>;
};

const Card = ({ title, icon, editable, children, rightAction, fullWidth = false, className = "", onEdit }: any) => (
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
                {editable && <button onClick={onEdit} className="text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors p-2 rounded-full"><Edit3 className="w-5 h-5" /></button>}
            </div>
        </div>
        <div className="p-6 pt-4 flex-1">{children}</div>
    </div>
);

const Toast = ({ message, visible, onClose }: { message: string; visible: boolean; onClose: () => void }) => {
    if (!visible) return null;
    return (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-[60]">
            <Check className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
    );
};

// Modal Components
const GenericEditModal = ({ config, isOpen, onClose, onSave, initialValues }: any) => {
    const [formData, setFormData] = useState(initialValues || {});
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    useEffect(() => { if (isOpen) { setFormData(initialValues || {}); setErrors({}); } }, [isOpen, initialValues]);
    if (!isOpen || !config) return null;

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }));
    };

    const handleSave = () => {
        const newErrors: Record<string, boolean> = {};
        config.fields.forEach((field: any) => { if (field.required && !formData[field.key]) newErrors[field.key] = true; });
        if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
        onSave(config.id, formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0"><DynamicIcon name={config.icon} className="w-5 h-5" /></div>
                        <div><h3 className="text-lg font-bold text-slate-900">{config.title}</h3>{config.subtitle && <p className="text-sm text-slate-500 mt-0.5">{config.subtitle}</p>}</div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-6">
                        {config.layout.map((row: string[], rowIndex: number) => (
                            <div key={rowIndex} className={`grid gap-6 ${row.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                                {row.map((fieldKey: string) => {
                                    const field = config.fields.find((f: any) => f.key === fieldKey);
                                    if (!field) return null;
                                    return (
                                        <div key={fieldKey}>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
                                            {(field.type === 'text' || field.type === 'number' || field.type === 'date') ? (
                                                <input type={field.type} className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none ${errors[fieldKey] ? 'border-red-300' : 'border-slate-300'}`} placeholder={field.placeholder} value={formData[fieldKey] || ''} onChange={(e) => handleChange(fieldKey, field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)} />
                                            ) : field.type === 'select' ? (
                                                <div className="relative">
                                                    <select className={`w-full border rounded-lg px-3 py-2 text-sm appearance-none bg-white ${errors[fieldKey] ? 'border-red-300' : 'border-slate-300'}`} value={formData[fieldKey] || ''} onChange={(e) => handleChange(fieldKey, e.target.value)}>
                                                        <option value="">Select...</option>
                                                        {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                    <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                                                </div>
                                            ) : field.type === 'radioCards' ? (
                                                <div className="space-y-3">
                                                    {field.options.map((opt: { value: string }) => (
                                                        <div key={opt.value} onClick={() => handleChange(fieldKey, opt.value)} className={`p-3 border rounded-lg cursor-pointer flex items-center gap-3 transition-all ${formData[fieldKey] === opt.value ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-slate-200 hover:border-blue-300'}`}>
                                                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formData[fieldKey] === opt.value ? 'border-blue-600' : 'border-slate-300'}`}>{formData[fieldKey] === opt.value && <div className="w-2 h-2 rounded-full bg-blue-600" />}</div>
                                                            <span className="text-sm font-medium text-slate-700">{opt.value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : field.type === 'radioList' ? (
                                                <div className="space-y-2">
                                                    {field.options.map((opt: string) => (
                                                        <label key={opt} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                                                            <input type="radio" name={fieldKey} className="mt-1 text-blue-600" checked={formData[fieldKey] === opt} onChange={() => handleChange(fieldKey, opt)} />
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
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> {config.saveLabel}</button>
                </div>
            </div>
        </div>
    );
};

const KeyNumberEditDialog = ({ isOpen, onClose, onSave, keyNumberConfig, currentValue }: any) => {
    const [formData, setFormData] = useState({ value: "", expiryDate: "", documentFileName: "" });
    const [errors, setErrors] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen && keyNumberConfig) {
            setFormData({
                value: currentValue?.value || "",
                expiryDate: currentValue?.expiryDate || "",
                documentFileName: currentValue?.documentFileName || ""
            });
            setErrors({});
        }
    }, [isOpen, keyNumberConfig, currentValue]);

    if (!isOpen || !keyNumberConfig) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Only accept PDF and DOCX
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
            if (validTypes.includes(file.type) || file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
                setFormData({ ...formData, documentFileName: file.name });
            } else {
                alert('Please upload a PDF or Word document (.pdf, .doc, .docx)');
            }
        }
    };

    const handleSave = () => {
        const newErrors: Record<string, boolean> = {};
        if (!formData.value) newErrors.value = true;
        if (keyNumberConfig.hasExpiry && !formData.expiryDate) newErrors.expiryDate = true;
        if (keyNumberConfig.documentRequired && !formData.documentFileName) newErrors.documentFileName = true;
        if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
        onSave(keyNumberConfig.id, formData.value, formData.expiryDate || undefined, formData.documentFileName || undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Edit Key Number</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{keyNumberConfig.numberTypeName}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                        {/* Value Field */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Value <span className="text-red-500">*</span></label>
                            <input type="text" className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.value ? 'border-red-300' : 'border-slate-300'}`} placeholder="Enter value..." value={formData.value} onChange={(e) => setFormData({ ...formData, value: e.target.value })} />
                            {errors.value && <p className="text-xs text-red-500 mt-1">Value is required</p>}
                        </div>

                        {/* Expiry Date Field - only if hasExpiry */}
                        {keyNumberConfig.hasExpiry && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
                                <input type="date" className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.expiryDate ? 'border-red-300' : 'border-slate-300'}`} value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} />
                                {errors.expiryDate && <p className="text-xs text-red-500 mt-1">Expiry date is required</p>}
                            </div>
                        )}

                        {/* Document Upload - only if documentRequired */}
                        {keyNumberConfig.documentRequired && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Upload Document <span className="text-red-500">*</span></label>
                                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${errors.documentFileName ? 'border-red-300 bg-red-50' : 'border-slate-300 bg-slate-50'}`}>
                                    {formData.documentFileName ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <span className="text-sm font-medium text-slate-700">{formData.documentFileName}</span>
                                            <button onClick={() => setFormData({ ...formData, documentFileName: "" })} className="ml-2 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <label className="cursor-pointer">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileUp className="w-8 h-8 text-slate-400" />
                                                <span className="text-sm text-slate-600">Click to upload PDF or Word document</span>
                                                <span className="text-xs text-slate-400">.pdf, .doc, .docx</span>
                                            </div>
                                            <input type="file" className="hidden" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} />
                                        </label>
                                    )}
                                </div>
                                {errors.documentFileName && <p className="text-xs text-red-500 mt-1">Document is required</p>}
                            </div>
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
                </div>
            </div>
        </div>
    );
};

const CargoEditorModal = ({ isOpen, onClose, onSave, initialSelected }: any) => {
    const config = UI_DATA.cargoEditor;
    const [selected, setSelected] = useState<string[]>(initialSelected || []);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => { if (isOpen) setSelected(initialSelected || []); }, [isOpen, initialSelected]);
    if (!isOpen) return null;

    const toggleSelection = (item: string) => { selected.includes(item) ? setSelected(selected.filter(i => i !== item)) : setSelected([...selected, item]); };
    const isMatch = (item: string) => item.toLowerCase().includes(searchTerm.toLowerCase());

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Package className="w-5 h-5" /></div><h3 className="text-lg font-bold text-slate-900">Edit Cargo Carried</h3></div>
                    <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-700" /></button>
                </div>
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-80"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input type="text" placeholder={config.searchPlaceholder} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <div className="flex gap-3"><span className="px-3 py-2 bg-slate-900 text-white text-xs font-bold rounded-md">{selected.length} Selected</span><button onClick={() => setSelected([...new Set([...selected, ...config.commonTypes])])} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-md hover:bg-slate-50">{config.selectCommonLabel}</button><button onClick={() => setSelected([])} className="px-3 py-2 bg-white border border-slate-300 text-red-600 text-xs font-bold rounded-md hover:bg-red-50">{config.clearAllLabel}</button></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-white space-y-8">
                    {config.sections.map(section => {
                        const filteredItems = section.items.filter(isMatch);
                        if (filteredItems.length === 0) return null;
                        return (
                            <div key={section.key}>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{section.label}</h4>
                                <div className="flex flex-wrap gap-2">{filteredItems.map(item => (<button key={item} onClick={() => toggleSelection(item)} className={`px-3 py-1.5 text-sm font-medium rounded-full border ${selected.includes(item) ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'}`}>{item}</button>))}</div>
                            </div>
                        );
                    })}
                </div>
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-300 rounded-lg bg-white">Cancel</button>
                    <button onClick={() => { onSave("cargoEditor", { selected }); onClose(); }} className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"><Save className="w-4 h-4" /> Save Changes</button>
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
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1">
                    <div className="flex items-center gap-5 mb-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold border-2 border-white shadow-sm">{director.initials}</div>
                        <div><div className="flex items-center gap-3 mb-1"><h2 className="text-2xl font-bold text-slate-900">{director.name}</h2>{director.isPrimary && <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">Primary Director</span>}</div><p className="text-sm text-slate-500 font-medium">{director.role} • Since {director.since}</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {config.sections.flatMap(s => s.fields).filter(f => !f.fullWidth).map(field => (
                            <div key={field.key} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50/50">
                                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm"><DynamicIcon name={field.icon} className="w-5 h-5" /></div>
                                <div><div className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">{field.label}</div><div className="font-semibold text-slate-900 text-sm">{director[field.key]}</div></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50">Close</button>
                    <button onClick={() => onEdit(director)} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md">Edit Details</button>
                </div>
            </div>
        </div>
    );
};

const DirectorEditModal = ({ director, isOpen, onClose, onSave }: any) => {
    const config = DIRECTOR_UI.editModal;
    const [formData, setFormData] = useState<any>({});

    useEffect(() => { if (isOpen && director) setFormData({ ...director }); }, [isOpen, director]);
    if (!isOpen || !director) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div><h3 className="text-xl font-bold text-slate-900">{config.title}</h3></div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-8 overflow-y-auto flex-1 space-y-6">
                    {config.layout.map((row, i) => (
                        <div key={i} className={`grid gap-6 ${row.length > 1 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                            {row.map(fieldKey => {
                                const field = config.fields.find(f => f.key === fieldKey);
                                if (!field) return null;
                                return (<div key={fieldKey}><label className="block text-sm font-bold text-slate-700 mb-2">{field.label}</label><input type={field.type} className="w-full border rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none border-slate-300" value={formData[fieldKey] || ''} onChange={(e) => setFormData((prev: any) => ({ ...prev, [fieldKey]: e.target.value }))} /></div>);
                            })}
                        </div>
                    ))}
                </div>
                <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={() => onSave(formData)} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md">{config.saveLabel}</button>
                </div>
            </div>
        </div>
    );
};

// Main Profile Component
export function CarrierProfilePage() {
    const { keyNumbers, keyNumberValues, updateKeyNumberValue } = useAppData();
    const [viewData] = useState(INITIAL_VIEW_DATA);
    const [formConfig, setFormConfig] = useState(UI_DATA);
    const [activeModal, setActiveModal] = useState<any>(null);
    const [toast, setToast] = useState({ visible: false, message: "" });
    const [keyNumberGroupsCollapsed, setKeyNumberGroupsCollapsed] = useState<Record<string, boolean>>({});
    const [selectedDirectorName, setSelectedDirectorName] = useState<string | null>(null);
    const [directorModalMode, setDirectorModalMode] = useState<string | null>(null);
    const [directorData, setDirectorData] = useState<any>(DIRECTOR_UI.directors);

    // Filter to only Carrier-type, Active key numbers
    const carrierKeyNumbers = useMemo(() =>
        keyNumbers.filter(kn => kn.entityType === 'Carrier' && kn.status === 'Active'),
        [keyNumbers]
    );

    // Group key numbers by category with calculated status
    const keyNumberGroups = useMemo(() => {
        return CATEGORIES.map(category => {
            const items = carrierKeyNumbers
                .filter(kn => kn.category === category)
                .map(kn => {
                    const enteredValue = keyNumberValues[kn.id];
                    let status: { text: string; tone: string };
                    if (!enteredValue?.value) {
                        status = { text: 'Missing', tone: 'danger' };
                    } else if (kn.hasExpiry && !enteredValue?.expiryDate) {
                        status = { text: 'Missing Expiry', tone: 'info' };
                    } else {
                        status = { text: 'Active', tone: 'success' };
                    }
                    return {
                        id: kn.id,
                        type: kn.numberTypeName,
                        value: enteredValue?.value || '',
                        expiryDate: enteredValue?.expiryDate || null,
                        hasExpiry: kn.hasExpiry,
                        documentRequired: kn.documentRequired,
                        documentFileName: enteredValue?.documentFileName || null,
                        config: kn, // Pass full config for edit modal
                        status
                    };
                });
            return { key: category, label: category.toUpperCase(), items };
        }).filter(g => g.items.length > 0);
    }, [carrierKeyNumbers, keyNumberValues]);

    const showToast = (msg: string) => { setToast({ visible: true, message: msg }); setTimeout(() => setToast({ visible: false, message: "" }), 3000); };

    const handleModalSave = (id: string, newValues: any) => {
        if (id === 'cargoEditor') { setFormConfig(prev => ({ ...prev, cargoEditor: { ...prev.cargoEditor, values: newValues } })); showToast("Cargo Types updated"); }
        else { const modalKey = Object.keys(formConfig.editModals).find(k => (formConfig.editModals as any)[k].id === id); if (modalKey) { setFormConfig(prev => ({ ...prev, editModals: { ...prev.editModals, [modalKey]: { ...(prev.editModals as any)[modalKey], values: newValues } } })); showToast("Changes saved"); } }
    };

    const handleDirectorSave = (newValues: any) => {
        setDirectorData((prev: any) => ({ ...prev, [newValues.name]: { ...newValues, initials: newValues.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase(), since: newValues.since || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), isPrimary: newValues.isPrimary || false } }));
        setDirectorModalMode(null);
        showToast(directorModalMode === 'add' ? "Director added" : "Director updated");
    };

    const handleSaveKeyNumber = (keyNumberId: string, value: string, expiryDate?: string, documentFileName?: string) => {
        updateKeyNumberValue(keyNumberId, value, expiryDate, documentFileName);
        showToast("Key number saved");
    };

    const toggleKeyNumberGroup = (key: string) => setKeyNumberGroupsCollapsed(prev => ({ ...prev, [key]: !prev[key] }));
    const handleCopy = (text: string) => { if (text) { navigator.clipboard.writeText(text); showToast(`Copied "${text}"`); } };

    const corporateData = formConfig.editModals.corporateIdentity.values;
    const legalAddressData = formConfig.editModals.legalMainAddress.values;
    const fleetData = formConfig.editModals.fleetDriverOverview.values;
    const mailingAddressData = formConfig.editModals.mailingAddress.values;
    const opsData = formConfig.editModals.operationsAuthority.values;
    const cargoData = formConfig.cargoEditor.values;
    const activeDirector = (directorModalMode === 'edit' || directorModalMode === 'view') && selectedDirectorName ? directorData[selectedDirectorName] : null;

    return (
        <div className="flex-1 p-4 lg:p-8 overflow-x-hidden bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4"><Building2 className="w-4 h-4" /><span>{viewData.page.breadcrumb[0]}</span><span className="text-slate-300">/</span><span className="font-semibold text-slate-900">{viewData.page.breadcrumb[1]}</span></div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2"><h1 className="text-3xl font-bold text-slate-900">{viewData.page.carrierHeader.name}</h1><Badge text={viewData.page.carrierHeader.statusBadge.text} tone={viewData.page.carrierHeader.statusBadge.tone} /></div>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">{viewData.page.carrierHeader.meta.map((m, idx) => (<div key={idx} className="flex items-center gap-2"><span className="font-bold text-xs uppercase text-slate-500 tracking-wide">{m.label}</span>{m.badge ? <Badge text={m.badge.text} tone={m.badge.tone} /> : <span className="text-slate-900 font-medium flex items-center gap-1">{m.text?.includes(',') && <MapPin className="w-3.5 h-3.5 text-slate-400" />}{m.text}</span>}</div>))}</div>
                    </div>
                    <div><button onClick={() => showToast("PDF export queued")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 shadow-sm rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"><FileDown className="w-4 h-4" /> {viewData.page.carrierHeader.actions[0].label}</button></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Corporate Identity */}
                <Card title="Corporate Identity" icon={formConfig.editModals.corporateIdentity.icon} editable className="h-full" onEdit={() => setActiveModal('editCorporateIdentity')}>
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Legal Name</div><div className="font-semibold text-slate-900 text-sm truncate">{corporateData.legalName}</div></div>
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">DBA Name</div><div className="font-semibold text-slate-900 text-sm truncate">{corporateData.dbaName}</div></div>
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Business Type</div><div className="font-semibold text-slate-900 text-sm truncate">{corporateData.businessType}</div></div>
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">State of Inc.</div><div className="font-semibold text-slate-900 text-sm truncate">{corporateData.stateOfInc}</div></div>
                    </div>
                </Card>

                {/* Legal Address */}
                <Card title="Legal / Main Address" icon={formConfig.editModals.legalMainAddress.icon} editable className="h-full" onEdit={() => setActiveModal('editLegalMainAddress')}>
                    <div className="flex flex-col gap-1 justify-center h-full"><div className="font-medium text-slate-900">{legalAddressData.street} {legalAddressData.apt}</div><div className="font-medium text-slate-900">{legalAddressData.city}, {legalAddressData.state} {legalAddressData.zip}</div><div className="font-medium text-slate-500 mt-2 text-sm">{legalAddressData.country}</div></div>
                </Card>

                {/* Fleet Overview */}
                <Card title="Fleet & Driver Overview" icon={formConfig.editModals.fleetDriverOverview.icon} editable className="h-full" onEdit={() => setActiveModal('editFleetDriverOverview')}>
                    <div className="grid grid-cols-3 gap-4 h-full items-center">
                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex flex-col justify-center h-24"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Power Units</div><div className="text-2xl font-bold text-slate-900">{fleetData.powerUnits}</div></div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex flex-col justify-center h-24"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Drivers</div><div className="text-2xl font-bold text-slate-900">{fleetData.drivers}</div></div>
                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100 flex flex-col justify-center h-24"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Non-CMV</div><div className="text-2xl font-bold text-slate-900">{fleetData.nonCmv}</div></div>
                    </div>
                </Card>

                {/* Mailing Address */}
                <Card title="Mailing Address" icon={formConfig.editModals.mailingAddress.icon} editable className="h-full" onEdit={() => setActiveModal('editMailingAddress')}>
                    <div className="flex flex-col gap-1 justify-center h-full"><div className="font-medium text-slate-900">{mailingAddressData.streetOrPo}</div><div className="font-medium text-slate-900">{mailingAddressData.city}, {mailingAddressData.state} {mailingAddressData.zip}</div><div className="font-medium text-slate-500 mt-2 text-sm">{mailingAddressData.country}</div></div>
                </Card>

                {/* Operations */}
                <Card title="Operations & Authority" icon={formConfig.editModals.operationsAuthority.icon} editable fullWidth onEdit={() => setActiveModal('editOperationsAuthority')}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Operation Classification</div><div className="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm bg-blue-50 border-blue-100 text-blue-700"><BadgeCheck className="w-5 h-5" /><span className="font-semibold text-sm truncate">{opsData.operationClassification}</span></div></div>
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Carrier Operation</div><div className="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm bg-blue-50 border-blue-100 text-blue-700"><Globe className="w-5 h-5" /><span className="font-semibold text-sm truncate">{opsData.carrierOperation}</span></div></div>
                        <div><div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">FMCSA Authority</div><div className="flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm bg-green-50 border-green-100 text-green-700"><Truck className="w-5 h-5" /><span className="font-semibold text-sm truncate">{opsData.fmcsaAuthorityType}</span></div></div>
                    </div>
                </Card>

                {/* Directors */}
                <Card {...viewData.page.cards.directorsOfficers} fullWidth rightAction={<button onClick={() => { setSelectedDirectorName(null); setDirectorModalMode('add'); }} className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /> {viewData.page.cards.directorsOfficers.addButton.label}</button>}>
                    <div className="overflow-x-auto -mx-6 -my-4">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Name</th><th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Title</th><th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Ownership %</th><th className="px-6 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right">Actions</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">{Object.values(directorData).map((director: any, i) => (<tr key={i} className="hover:bg-slate-50"><td className="px-6 py-4 font-semibold text-slate-900">{director.name}</td><td className="px-6 py-4 text-blue-600 font-medium">{director.role}</td><td className="px-6 py-4 text-slate-900">{director.ownershipPct}%</td><td className="px-6 py-4 text-right"><button onClick={() => { setSelectedDirectorName(director.name); setDirectorModalMode('view'); }} className="text-blue-600 font-bold text-xs hover:underline">View More</button></td></tr>))}</tbody>
                        </table>
                    </div>
                </Card>

                {/* Key Numbers - Now driven by context */}
                <Card title="Key Numbers" icon="FileKey" fullWidth>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 border-b border-slate-200">Number Type</th>
                                    <th className="px-6 py-3 border-b border-slate-200">Value</th>
                                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                                    <th className="px-6 py-3 border-b border-slate-200">Expiry</th>
                                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {keyNumberGroups.map(group => {
                                    const isCollapsed = keyNumberGroupsCollapsed[group.key] ?? false;
                                    return (
                                        <React.Fragment key={group.key}>
                                            <tr className="bg-slate-100/50 cursor-pointer hover:bg-slate-100" onClick={() => toggleKeyNumberGroup(group.key)}>
                                                <td colSpan={5} className="px-6 py-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs uppercase text-slate-500 tracking-wider pl-2">{group.label}</span>
                                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                    </div>
                                                </td>
                                            </tr>
                                            {!isCollapsed && group.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-semibold text-slate-900">{item.type}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 group">
                                                            {item.value ? (
                                                                <>
                                                                    <span className="font-mono text-slate-700 truncate block max-w-[150px]">{item.value}</span>
                                                                    <button onClick={() => handleCopy(item.value)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Copy className="w-3.5 h-3.5" /></button>
                                                                </>
                                                            ) : (
                                                                <span className="text-slate-400 italic">Not entered</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4"><Badge text={item.status.text} tone={item.status.tone} /></td>
                                                    <td className="px-6 py-4 text-slate-500">{item.hasExpiry ? (item.expiryDate || <span className="text-slate-400 italic">Not set</span>) : '-'}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => setActiveModal({ type: 'editKeyNumber', keyNumberConfig: item.config, currentValue: keyNumberValues[item.id] })}
                                                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded hover:bg-slate-100 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <SquarePen className="w-4 h-4" />
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

                {/* Cargo Carried */}
                <Card title="Cargo Carried" icon="Package" editable fullWidth onEdit={() => setActiveModal('cargoEditor')} rightAction={<span className="text-xs font-medium text-slate-400 mr-2 hidden sm:inline-block">Updated from MCS-150</span>}>
                    <div className="flex flex-wrap gap-3">{cargoData.selected.map((tag, i) => (<span key={i} className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm border ${['Explosives', 'Gases'].includes(tag) ? 'bg-red-700 text-white border-red-700' : 'bg-slate-800 text-slate-100 border-slate-800'}`}>{tag}</span>))}</div>
                </Card>
            </div>

            <Toast message={toast.message} visible={toast.visible} onClose={() => setToast({ ...toast, visible: false })} />
            {Object.values(formConfig.editModals).map((modalConfig: any) => (<GenericEditModal key={modalConfig.id} config={modalConfig} isOpen={activeModal === modalConfig.id} onClose={() => setActiveModal(null)} onSave={handleModalSave} initialValues={modalConfig.values} />))}
            <CargoEditorModal isOpen={activeModal === 'cargoEditor'} onClose={() => setActiveModal(null)} onSave={handleModalSave} initialSelected={cargoData.selected} />
            <KeyNumberEditDialog isOpen={activeModal?.type === 'editKeyNumber'} keyNumberConfig={activeModal?.keyNumberConfig} currentValue={activeModal?.currentValue} onClose={() => setActiveModal(null)} onSave={handleSaveKeyNumber} />
            <DirectorViewModal director={activeDirector} isOpen={directorModalMode === 'view'} onClose={() => setDirectorModalMode(null)} onEdit={() => setDirectorModalMode('edit')} />
            <DirectorEditModal director={activeDirector || {}} isOpen={directorModalMode === 'edit' || directorModalMode === 'add'} onClose={() => setDirectorModalMode(null)} onSave={handleDirectorSave} />
        </div>
    );
}

export default CarrierProfilePage;
