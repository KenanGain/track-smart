import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, X, UploadCloud, FileText, Trash2, Save } from 'lucide-react';
import type { KeyNumberConfig, UploadedDocument } from '@/types/key-numbers.types';
import type { DocumentType, TagSection } from '@/data/mock-app-data';

// Key Number Add/Edit Modal Types
export interface KeyNumberModalData {
    id?: string;
    configId?: string;
    value: string;
    expiryDate: string;
    issueDate: string;
    tags: string[];
    documents: UploadedDocument[];
    numberRequired: boolean;
    hasExpiry: boolean;
    documentRequired: boolean;
    requiredDocumentTypeId?: string;
    linkedDocumentType?: DocumentType | null;
}

interface KeyNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { configId: string; value: string; expiryDate?: string; issueDate?: string; tags?: string[]; documents?: UploadedDocument[]; }) => void;
    mode: 'add' | 'edit';
    entityType: 'Carrier' | 'Asset' | 'Driver';
    editData?: KeyNumberModalData | null;
    availableKeyNumbers: KeyNumberConfig[];
    tagSections: TagSection[];
    getDocumentTypeById?: (id: string) => DocumentType | undefined;
}

export const KeyNumberModal = ({ isOpen, onClose, onSave, mode, entityType, editData, availableKeyNumbers, tagSections }: KeyNumberModalProps) => {
    const [selectedTypeId, setSelectedTypeId] = useState<string>('');
    const [formValue, setFormValue] = useState('');
    const [formExpiry, setFormExpiry] = useState('');
    const [formIssueDate, setFormIssueDate] = useState('');
    const [formTags, setFormTags] = useState<Record<string, string[]>>({});
    const [formDocuments, setFormDocuments] = useState<UploadedDocument[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeConfig = useMemo(() => {
        if (mode === 'edit' && editData?.configId) return availableKeyNumbers.find(kn => kn.id === editData.configId);
        if (mode === 'add' && selectedTypeId) return availableKeyNumbers.find(kn => kn.id === selectedTypeId);
        return null;
    }, [mode, editData, selectedTypeId, availableKeyNumbers]);

    useEffect(() => {
        if (isOpen) {
            if (mode === 'edit' && editData) {
                setSelectedTypeId(editData.configId || '');
                setFormValue(editData.value === 'Not entered' ? '' : editData.value);
                setFormExpiry(editData.expiryDate === 'Not set' || editData.expiryDate === '-' ? '' : editData.expiryDate);
                setFormIssueDate(editData.issueDate || '');
                const tagsRecord: Record<string, string[]> = {};
                editData.tags?.forEach(tagId => {
                    for (const section of tagSections || []) {
                        if (section.tags.some(t => t.id === tagId)) {
                            if (!tagsRecord[section.id]) tagsRecord[section.id] = [];
                            tagsRecord[section.id].push(tagId);
                        }
                    }
                });
                setFormTags(tagsRecord);
                setFormDocuments(editData.documents || []);
            } else {
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

    const filteredKeyNumbers = availableKeyNumbers.filter(kn => kn.entityType === entityType && kn.status === 'Active');

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (mode === 'add' && !selectedTypeId) newErrors.type = 'Please select a key number type.';
        if (activeConfig) {
            if (activeConfig.numberRequired !== false && !formValue.trim()) newErrors.value = 'Number value is required.';
            if (activeConfig.hasExpiry && !formExpiry) newErrors.expiry = 'Expiry date is required.';
            if (activeConfig.documentRequired) {
                // If mocked, we check formDocuments
                if (formDocuments.length === 0) newErrors.documents = 'At least one document is required.';
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validate() || !activeConfig) return;
        const tagsArray: string[] = [];
        Object.values(formTags).forEach(tagIds => tagsArray.push(...tagIds));
        
        // Pass the documents properly
        onSave({
            configId: activeConfig.id,
            value: formValue,
            expiryDate: activeConfig.hasExpiry ? formExpiry : undefined,
            issueDate: formIssueDate || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
            documents: activeConfig.documentRequired ? formDocuments : undefined
        });
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const newDoc: UploadedDocument = {
                id: `doc-${Date.now()}`,
                fileName: file.name,
                fileSize: file.size,
                uploadedAt: new Date().toISOString()
            };
            setFormDocuments(prev => [...prev, newDoc]);
            setErrors(prev => ({ ...prev, documents: '' })); // Clear error
        }
    };

    const removeDocument = (id: string) => {
        setFormDocuments(prev => prev.filter(d => d.id !== id));
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-[680px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/30">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">{mode === 'add' ? 'Add Key Number' : 'Edit Key Number'}</h3>
                        {activeConfig && <p className="text-sm text-slate-500 mt-1">{activeConfig.numberTypeName}</p>}
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
                </div>
                
                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    
                    {/* Key Number Type Select (Add Mode Only) */}
                    {mode === 'add' && (
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Key Number Type <span className="text-red-500">*</span></label>
                            <select 
                                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                value={selectedTypeId} 
                                onChange={(e) => { setSelectedTypeId(e.target.value); setErrors(prev => ({ ...prev, type: '' })); }}
                            >
                                <option value="">Select a number type...</option>
                                {filteredKeyNumbers.map(kn => <option key={kn.id} value={kn.id}>{kn.numberTypeName}</option>)}
                            </select>
                            {errors.type && <p className="text-xs text-red-500 mt-1">{errors.type}</p>}
                        </div>
                    )}

                    {/* Form Fields */}
                    {(mode === 'edit' || selectedTypeId) && activeConfig && (
                        <>
                            {/* Number Value */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Number Value {activeConfig.numberRequired !== false && <span className="text-red-500">*</span>}
                                </label>
                                <input 
                                    type="text" 
                                    placeholder={`Enter ${activeConfig.numberTypeName}...`}
                                    className="w-full border-slate-300 border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                                    value={formValue} 
                                    onChange={(e) => { setFormValue(e.target.value); setErrors(prev => ({ ...prev, value: '' })); }}
                                />
                                {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                {activeConfig.hasExpiry && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Expiry Date <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input 
                                                type="date" 
                                                className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.expiry ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'}`}
                                                value={formExpiry} 
                                                onChange={(e) => { setFormExpiry(e.target.value); setErrors(prev => ({ ...prev, expiry: '' })); }}
                                            />
                                        </div>
                                        {errors.expiry && <p className="text-xs text-red-500 mt-1">{errors.expiry}</p>}
                                        <p className="text-xs text-slate-400 mt-1">Used for renewal reminders & compliance tracking.</p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Issue Date <span className="text-slate-400 font-normal">(Optional)</span></label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" 
                                        value={formIssueDate} 
                                        onChange={(e) => setFormIssueDate(e.target.value)} 
                                    />
                                </div>
                            </div>

                            {/* Supporting Documents */}
                            {activeConfig.documentRequired && (
                                <div className="pt-2 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">Supporting Documents <span className="text-red-500">*</span></label>
                                            <p className="text-xs text-slate-500">Upload documents for {activeConfig.numberTypeName}</p>
                                        </div>
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Document
                                        </button>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            className="hidden" 
                                            onChange={handleFileChange} 
                                        />
                                    </div>

                                    {/* Upload Area / List */}
                                    {formDocuments.length === 0 ? (
                                        <div 
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${errors.documents ? 'border-red-300 bg-red-50' : 'border-slate-300 hover:bg-slate-50 bg-white'}`}
                                        >
                                            <div className="bg-blue-50 p-3 rounded-full mb-3">
                                                <UploadCloud className="w-6 h-6 text-blue-600" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700">Click to upload or drag & drop</p>
                                            <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX up to 10MB</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {formDocuments.map(doc => (
                                                <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white group hover:border-blue-200 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-red-50 p-2 rounded-lg">
                                                            <FileText className="w-5 h-5 text-red-500" /> {/* Mock PDF Icon color */}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">{doc.fileName}</p>
                                                            <p className="text-xs text-slate-400">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(0)} KB` : 'Unknown Size'} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => removeDocument(doc.id)}
                                                        className="text-slate-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <div 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="border-2 border-dashed border-slate-200 rounded-lg p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span className="text-sm font-medium">Upload another</span>
                                            </div>
                                        </div>
                                    )}
                                    {errors.documents && <p className="text-xs text-red-500 mt-2">{errors.documents}</p>}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg bg-white hover:bg-slate-50">Cancel</button>
                    <button onClick={handleSubmit} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2">
                        <Save className="w-4 h-4" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};
