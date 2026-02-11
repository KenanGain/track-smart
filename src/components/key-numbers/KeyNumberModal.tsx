import { useState, useEffect, useMemo } from 'react';
import { X, Save, Bell } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { useAppData } from '@/context/AppDataContext';
import type { KeyNumberConfig, UploadedDocument } from '@/types/key-numbers.types';
import type { DocumentType, TagSection } from '@/data/mock-app-data';

// Key Number Add/Edit Modal Types
export interface KeyNumberModalData {
    id?: string;
    configId?: string;
    value: string;
    expiryDate: string;
    issueDate: string;
    issuingState?: string;
    issuingCountry?: string;
    tags: string[];
    documents?: UploadedDocument[];
    numberRequired: boolean;
    hasExpiry: boolean;
    documentRequired?: boolean;
}

interface KeyNumberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { configId: string; value: string; expiryDate?: string; issueDate?: string; issuingState?: string; issuingCountry?: string; tags?: string[]; documents?: UploadedDocument[] }) => void;
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
    const [formIssuingState, setFormIssuingState] = useState('');
    const [formIssuingCountry, setFormIssuingCountry] = useState('');
    const [formTags, setFormTags] = useState<Record<string, string[]>>({});
    
    // Monitoring State (Edit Config on the fly)
    const { setKeyNumbers } = useAppData();
    const [monitoringEnabled, setMonitoringEnabled] = useState(false);
    const [monitorBasedOn, setMonitorBasedOn] = useState<'expiry' | 'issue_date'>('expiry');
    const [renewalRecurrence, setRenewalRecurrence] = useState<'annually' | 'biannually' | 'quarterly' | 'monthly' | 'none'>('annually');
    const [reminderDays, setReminderDays] = useState<Record<number, boolean>>({ 90: true, 60: true, 30: true, 7: false });
    const [notificationChannels, setNotificationChannels] = useState({ email: true, inApp: true, sms: false });

    const [errors, setErrors] = useState<Record<string, string>>({});


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
                setFormIssuingState(editData.issuingState || '');
                setFormIssuingCountry(editData.issuingCountry || '');
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


                // Load Monitoring Config
                const config = availableKeyNumbers.find(kn => kn.id === editData.configId);
                if (config) {
                    setMonitoringEnabled(config.monitoringEnabled ?? false);
                    setMonitorBasedOn(config.monitorBasedOn || 'expiry');
                    setRenewalRecurrence((config.renewalRecurrence as any) || 'annually');
                    setReminderDays(config.reminderDays || { 90: true, 60: true, 30: true, 7: false });
                    setNotificationChannels(config.notificationChannels || { email: true, inApp: true, sms: false });
                }
            } else {
                setSelectedTypeId('');
                setFormValue('');
                setFormExpiry('');
                setFormIssueDate('');
                setFormIssuingState('');
                setFormIssuingCountry('');
                setFormTags({});
                
                // Reset Monitoring defaults
                setMonitoringEnabled(false);
                setMonitorBasedOn('expiry');
                setRenewalRecurrence('annually');
                setReminderDays({ 90: true, 60: true, 30: true, 7: false });
                setNotificationChannels({ email: true, inApp: true, sms: false });
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
            if (activeConfig.issueDateRequired && !formIssueDate) newErrors.issueDate = 'Issue date is required.';
            if (activeConfig.issueStateRequired && !formIssuingState.trim()) newErrors.issuingState = 'Issuing State is required.';
            if (activeConfig.issueCountryRequired && !formIssuingCountry.trim()) newErrors.issuingCountry = 'Issuing Country is required.';

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
            issuingState: formIssuingState || undefined,
            issuingCountry: formIssuingCountry || undefined,
            tags: tagsArray.length > 0 ? tagsArray : undefined,
            documents: (mode === 'edit' && editData?.documents) ? editData.documents : []
        });

        // Update Global Config with new monitoring settings
        setKeyNumbers(prev => prev.map(k => {
            if (k.id === activeConfig.id) {
                return {
                    ...k,
                    monitoringEnabled,
                    monitorBasedOn,
                    renewalRecurrence,
                    reminderDays,
                    notificationChannels
                };
            }
            return k;
        }));

        onClose();
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
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                        Issue Date {activeConfig.issueDateRequired ? <span className="text-red-500">*</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                                    </label>
                                    <input 
                                        type="date" 
                                        className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.issueDate ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'}`}
                                        value={formIssueDate} 
                                        onChange={(e) => { setFormIssueDate(e.target.value); setErrors(prev => ({ ...prev, issueDate: '' })); }}
                                    />
                                    {errors.issueDate && <p className="text-xs text-red-500 mt-1">{errors.issueDate}</p>}
                                </div>
                            </div>
                            
                            {/* Issuing State & Country */}
                            <div className="grid grid-cols-2 gap-4">
                                {activeConfig.issueStateRequired && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Issuing State <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. CA, NY, TX"
                                            className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.issuingState ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'}`}
                                            value={formIssuingState} 
                                            onChange={(e) => { setFormIssuingState(e.target.value); setErrors(prev => ({ ...prev, issuingState: '' })); }}
                                        />
                                        {errors.issuingState && <p className="text-xs text-red-500 mt-1">{errors.issuingState}</p>}
                                    </div>
                                )}
                                {activeConfig.issueCountryRequired && (
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                            Issuing Country <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. USA, CAN, MEX"
                                            className={`w-full border rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 ${errors.issuingCountry ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'}`}
                                            value={formIssuingCountry} 
                                            onChange={(e) => { setFormIssuingCountry(e.target.value); setErrors(prev => ({ ...prev, issuingCountry: '' })); }}
                                        />
                                        {errors.issuingCountry && <p className="text-xs text-red-500 mt-1">{errors.issuingCountry}</p>}
                                    </div>
                                )}
                            </div>
                            {/* Monitoring & Notifications Card (Added to match KeyNumberEditor) */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-5 mt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-6 w-1 bg-purple-600 rounded-full"></div>
                                        <div>
                                            <h2 className="text-base font-bold text-slate-900">Monitoring & Notifications</h2>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-600">
                                            {monitoringEnabled ? "Enabled" : "Disabled"}
                                        </span>
                                        <Toggle
                                            checked={monitoringEnabled}
                                            onCheckedChange={setMonitoringEnabled}
                                            className="data-[state=on]:bg-purple-600 h-5 w-9"
                                        />
                                    </div>
                                </div>

                                {monitoringEnabled && (
                                    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-top-1">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Monitor Based On</label>
                                                <div className="flex gap-3">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="monitorBasedOn"
                                                            checked={monitorBasedOn === 'expiry'}
                                                            onChange={() => setMonitorBasedOn('expiry')}
                                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 accent-purple-600"
                                                        />
                                                        <span className="text-sm text-slate-700">Expiry Date</span>
                                                    </label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="monitorBasedOn"
                                                            checked={monitorBasedOn === 'issue_date'}
                                                            onChange={() => setMonitorBasedOn('issue_date')}
                                                            className="w-4 h-4 text-purple-600 focus:ring-purple-500 accent-purple-600"
                                                        />
                                                        <span className="text-sm text-slate-700">Issue Date</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Renewal Recurrence</label>
                                                <select
                                                    value={renewalRecurrence}
                                                    onChange={(e) => setRenewalRecurrence(e.target.value as any)}
                                                    className="w-full h-9 px-2 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                                >
                                                    <option value="annually">Annually (Every 1 Year)</option>
                                                    <option value="biannually">Biannually (Every 2 Years)</option>
                                                    <option value="quarterly">Quarterly (Every 3 Months)</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="none">No Recurrence</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Reminders</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[90, 60, 30, 7].map((days) => (
                                                        <label key={days} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={reminderDays[days]}
                                                                onChange={(e) => setReminderDays({ ...reminderDays, [days]: e.target.checked })}
                                                                className="w-3.5 h-3.5 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600"
                                                            />
                                                            <span className="text-xs text-slate-600">{days} Days</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Channels</label>
                                                <div className="flex flex-col gap-2">
                                                    {['email', 'inApp', 'sms'].map((channel) => (
                                                        <label key={channel} className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={notificationChannels[channel as keyof typeof notificationChannels]}
                                                                onChange={(e) => setNotificationChannels({ ...notificationChannels, [channel]: e.target.checked })}
                                                                className="w-3.5 h-3.5 rounded text-purple-600 border-slate-300 focus:ring-purple-500 accent-purple-600"
                                                            />
                                                            <span className="text-xs text-slate-600 capitalize">{channel === 'inApp' ? 'In-App' : channel}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3">
                                            <Bell className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                                            <div>
                                                <h4 className="text-xs font-bold text-blue-900">Projected Notification Schedule</h4>
                                                <p className="text-xs text-blue-700 mt-1 leading-snug">
                                                    Monitor {monitorBasedOn === 'expiry' ? 'Expiry Date' : 'Issue Date'}. 
                                                    Reminders at {Object.entries(reminderDays).filter(([_, v]) => v).map(([d]) => `${d} days`).join(', ')} before.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
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
