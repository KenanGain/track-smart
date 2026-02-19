import React, { useState, useEffect } from 'react';
import { X, Save, Clock, MapPin, User as UserIcon, Truck, AlertTriangle, Globe } from 'lucide-react';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS as MOCK_ASSETS } from '@/pages/assets/assets.data';
import { US_STATES, CA_PROVINCES } from '@/data/geo-data';
import { type ViolationRecord, ALL_VIOLATIONS } from './violations-list.data';
import { type AssetViolationRecord, type AssetViolationDef, ASSET_VIOLATION_DEFS } from './asset-violations.data';
import { Combobox } from '@/components/ui/combobox';

type FormMode = 'driver' | 'asset';

interface ViolationEditFormProps {
    isOpen: boolean;
    onClose: () => void;
    record: ViolationRecord | AssetViolationRecord | null;
    mode: FormMode;
    onSave: (updatedRecord: any) => void;
}

export const ViolationEditForm = ({ isOpen, onClose, record, mode, onSave }: ViolationEditFormProps) => {
    // We use a flexible type for internal state to handle both record types
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (record && record.id) {
            setFormData({ ...record });
        } else {
            // Defaults for new record
            setFormData({
                date: new Date().toISOString(),
                time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                currency: 'USD',
                status: 'Open',
                result: 'Citation Issued',
                locationCountry: 'US'
            });
        }
    }, [record, isOpen, mode]);

    if (!isOpen) return null;

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => {
            const updated = { ...prev, [field]: value };
            
            // Should we clear state if country changes? Maybe not for now to be user friendly
            if (field === 'locationCountry') {
                updated.locationState = ''; // Clear state on country change to force re-selection
            }
            return updated;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Construct full address string for legacy support if needed
        const fullLocation = `${formData.locationStreet || ''}, ${formData.locationCity || ''}, ${formData.locationState || ''} ${formData.locationZip || ''}`;
        
        onSave({ 
            ...formData, 
            location: fullLocation // Update legacy string
        });
        onClose();
    };

    // Helper for input classes
    const inputClass = "w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300";
    const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    const isDriverMode = mode === 'driver';
    const totalAmount = (formData.fineAmount || 0) + (formData.expenseAmount || 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                             {record?.id ? 'Edit' : 'Add'} {isDriverMode ? 'Driver' : 'Asset'} Violation
                        </h2>
                        {record?.id && <p className="text-xs text-slate-500 mt-0.5">ID: <span className="font-mono">{record.id}</span></p>}
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="violation-form" onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Top Section: Driver/Asset + Date */}
                        <div className="grid grid-cols-2 gap-5">
                            
                            {/* Primary Entity Select */}
                            <div className="col-span-2">
                                <label className={labelClass}>{isDriverMode ? 'Driver' : 'Asset'}</label>
                                <div className="relative">
                                    {isDriverMode ? (
                                        <>
                                            <select 
                                                className={inputClass}
                                                value={formData.driverId || ''}
                                                onChange={e => {
                                                    const d = MOCK_DRIVERS.find(d => d.id === e.target.value);
                                                    if (d) {
                                                        handleChange('driverId', d.id);
                                                        handleChange('driverName', `${d.firstName} ${d.lastName}`);
                                                        handleChange('driverType', 'Long Haul Driver');
                                                    }
                                                }}
                                            >
                                                <option value="">Select Driver...</option>
                                                {MOCK_DRIVERS.map(d => (
                                                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                                                ))}
                                            </select>
                                            <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        </>
                                    ) : (
                                        <>
                                            <select 
                                                className={inputClass}
                                                value={formData.assetId || formData.assetUnitNumber || ''} // Handle ID or Unit Number matching
                                                onChange={e => {
                                                    const a = MOCK_ASSETS.find(a => a.id === e.target.value || a.unitNumber === e.target.value);
                                                    if (a) {
                                                        handleChange('assetId', a.id);
                                                        handleChange('assetUnitNumber', a.unitNumber);
                                                        handleChange('assetType', a.assetType);
                                                        handleChange('assetMakeModel', `${a.make} ${a.model}`);
                                                        handleChange('assetPlate', a.plateNumber);
                                                    }
                                                }}
                                            >
                                                <option value="">Select Asset...</option>
                                                {MOCK_ASSETS.map(a => (
                                                    <option key={a.id} value={a.id}>{a.unitNumber} - {a.make} {a.model} ({a.plateNumber})</option>
                                                ))}
                                            </select>
                                            <Truck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Secondary Entity Select (Optional) */}
                            <div className="col-span-2">
                                <label className={labelClass}>{isDriverMode ? 'Vehicle / Asset Involved (Optional)' : 'Linked Driver (Optional)'}</label>
                                <div className="relative">
                                    {isDriverMode ? (
                                         <>
                                            <select 
                                                className={inputClass}
                                                value={formData.assetId || ''}
                                                onChange={e => {
                                                    const a = MOCK_ASSETS.find(a => a.id === e.target.value);
                                                    if (a) {
                                                        handleChange('assetId', a.id);
                                                        handleChange('assetName', a.unitNumber);
                                                    } else {
                                                        handleChange('assetId', undefined);
                                                        handleChange('assetName', undefined);
                                                    }
                                                }}
                                            >
                                                <option value="">None / Not Applicable</option>
                                                {MOCK_ASSETS.map(a => (
                                                    <option key={a.id} value={a.id}>{a.unitNumber} - {a.make} {a.model}</option>
                                                ))}
                                            </select>
                                            <Truck className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        </>
                                    ) : (
                                        <>
                                            <select 
                                                className={inputClass}
                                                value={formData.linkedDriverId || ''}
                                                onChange={e => {
                                                    const d = MOCK_DRIVERS.find(d => d.id === e.target.value);
                                                    if (d) {
                                                        handleChange('linkedDriverId', d.id);
                                                        handleChange('linkedDriverName', `${d.firstName} ${d.lastName}`);
                                                    } else {
                                                        handleChange('linkedDriverId', undefined);
                                                        handleChange('linkedDriverName', undefined);
                                                    }
                                                }}
                                            >
                                                <option value="">No Driver Linked</option>
                                                {MOCK_DRIVERS.map(d => (
                                                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName}</option>
                                                ))}
                                            </select>
                                            <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Date</label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        className={inputClass}
                                        value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''} 
                                        onChange={e => handleChange('date', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelClass}>Time</label>
                                <div className="relative">
                                    <input 
                                        type="time" 
                                        className={inputClass}
                                        value={formData.time || ''}
                                        onChange={e => handleChange('time', e.target.value)}
                                    />
                                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Complete Address Section */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                                <MapPin size={14} className="text-blue-500" /> Location Details
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-5">
                                <div className="col-span-2">
                                    <label className={labelClass}>Street Address</label>
                                    <input 
                                        type="text" 
                                        className={inputClass}
                                        placeholder="123 Highway Rd, Mile Marker 55"
                                        value={formData.locationStreet || ''}
                                        onChange={e => handleChange('locationStreet', e.target.value)}
                                    />
                                </div>
                                
                                <div>
                                    <label className={labelClass}>City</label>
                                    <input 
                                        type="text" 
                                        className={inputClass}
                                        placeholder="City Name"
                                        value={formData.locationCity || ''}
                                        onChange={e => handleChange('locationCity', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Zip / Postal Code</label>
                                    <input 
                                        type="text" 
                                        className={inputClass}
                                        placeholder="Zip Code"
                                        value={formData.locationZip || ''}
                                        onChange={e => handleChange('locationZip', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className={labelClass}>Country</label>
                                    <div className="relative">
                                        <select 
                                            className={inputClass}
                                            value={formData.locationCountry || 'US'}
                                            onChange={e => handleChange('locationCountry', e.target.value)}
                                        >
                                            <option value="US">United States</option>
                                            <option value="Canada">Canada</option>
                                        </select>
                                        <Globe className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                    </div>
                                </div>

                                <div>
                                    <label className={labelClass}>State / Province</label>
                                    <select 
                                        className={inputClass}
                                        value={formData.locationState || ''}
                                        onChange={e => handleChange('locationState', e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {(formData.locationCountry === 'Canada' ? CA_PROVINCES : US_STATES).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Violation Details */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                            <div>
                                <label className={labelClass}>Violation Type</label>
                                {isDriverMode ? (
                                    <Combobox
                                        options={ALL_VIOLATIONS.map(v => ({
                                            value: v.id,
                                            label: `[${v.violationCode}] ${v.violationDescription}`,
                                            description: v.violationGroup
                                        }))}
                                        value={formData.violationDataId}
                                        onValueChange={(val: string) => {
                                            const v = ALL_VIOLATIONS.find(v => v.id === val);
                                            if (v) {
                                                handleChange('violationDataId', v.id);
                                                handleChange('violationCode', v.violationCode);
                                                handleChange('violationType', v.violationDescription);
                                                handleChange('violationGroup', v.violationGroup);
                                                handleChange('driverRiskCategory', v.severityWeight.driver > 8 ? 1 : v.severityWeight.driver > 5 ? 2 : 3);
                                                handleChange('crashLikelihood', v.crashLikelihoodPercent || 0);
                                                handleChange('isOos', v.isOos);
                                            }
                                        }}
                                        placeholder="Search violation code or description..."
                                        searchPlaceholder="Search driver violations..."
                                        className="w-full bg-white"
                                    />
                                ) : (
                                    <Combobox
                                        options={(ASSET_VIOLATION_DEFS || []).map((v: AssetViolationDef) => ({
                                            value: v.id,
                                            label: `[${v.code}] ${v.description}`,
                                            description: `${v.category} · ${v.severity}`
                                        }))}
                                        value={formData.violationDefId} // Use correct ID field for assets
                                        onValueChange={(val: string) => {
                                            const v = (ASSET_VIOLATION_DEFS || []).find((v: AssetViolationDef) => v.id === val);
                                            if (v) {
                                                handleChange('violationDefId', v.id);
                                                handleChange('violationCode', v.code);
                                                handleChange('violationType', v.description);
                                                handleChange('violationCategory', v.category); // Asset specific
                                                handleChange('severity', v.severity);         // Asset specific
                                                handleChange('isOos', v.isOos);
                                                handleChange('crashLikelihoodPercent', v.crashLikelihoodPercent);
                                            }
                                        }}
                                        placeholder="Search asset violation..."
                                        searchPlaceholder="Search asset violations..."
                                        className="w-full bg-white"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className={labelClass}>Result / Action</label>
                                    <select 
                                        className={inputClass}
                                        value={formData.result || 'Citation Issued'}
                                        onChange={e => handleChange('result', e.target.value)}
                                    >
                                        <option value="No Violation">No Violation</option>
                                        <option value="Clean Inspection">Clean Inspection</option>
                                        <option value="Warning">Warning</option>
                                        <option value="Citation Issued">Citation Issued</option>
                                        <option value="OOS Order">OOS Order</option>
                                    </select>
                                </div>
                                <div className="flex items-end pb-2">
                                     {formData.isOos && (
                                         <div className="flex items-center gap-2 text-rose-600 font-bold bg-rose-50 px-3 py-2 rounded-lg border border-rose-100 w-full animate-in fade-in">
                                             <AlertTriangle size={16} />
                                             <span className="text-xs uppercase">Out of Service Violation</span>
                                         </div>
                                     )}
                                </div>
                            </div>
                            
                            {/* Fine & Expense Section */}
                            <div className="grid grid-cols-2 gap-5 pt-2 border-t border-slate-200/60">
                                {/* Fine Amount */}
                                <div>
                                    <label className={labelClass}>Fine Amount ({formData.currency || 'USD'})</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                        <input 
                                            type="number" 
                                            className={`${inputClass} pl-7`}
                                            value={formData.fineAmount || ''}
                                            onChange={e => handleChange('fineAmount', Number(e.target.value))}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Expense Amount */}
                                <div>
                                    <label className={labelClass}>Expense Amount</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                            <input 
                                                type="number" 
                                                className={`${inputClass} pl-7`}
                                                value={formData.expenseAmount || ''}
                                                onChange={e => handleChange('expenseAmount', Number(e.target.value))}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <select 
                                            className="w-20 h-10 px-2 rounded-lg border border-slate-200 text-sm focus:border-blue-500 outline-none bg-slate-50 font-bold text-slate-600"
                                            value={formData.currency || 'USD'}
                                            onChange={e => handleChange('currency', e.target.value)}
                                        >
                                            <option value="USD">USD</option>
                                            <option value="CAD">CAD</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Total Amount Badge */}
                                <div className="col-span-2">
                                    <div className="bg-slate-100 rounded-xl p-3 flex justify-between items-center border border-slate-200">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total (Fine + Expenses)</span>
                                        <div className="text-lg font-bold text-slate-900 font-mono">
                                            {formData.currency === 'USD' ? '$' : 'C$'}
                                            {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            <span className="text-xs text-slate-400 ml-1 font-sans">{formData.currency || 'USD'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-2xl">
                    <button 
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                    <button 
                        form="violation-form"
                        type="submit"
                        className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm shadow-blue-500/20 transition-all text-sm flex items-center gap-2"
                    >
                        <Save size={16} />
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};
