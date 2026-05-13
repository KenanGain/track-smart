import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Clock, MapPin, User as UserIcon, Truck, Globe, FileText, Upload, Plus, ArrowLeft } from 'lucide-react';
import { MOCK_DRIVERS } from '@/data/mock-app-data';
import { INITIAL_ASSETS as MOCK_ASSETS } from '@/pages/assets/assets.data';
import { US_STATE_ABBREVS, CA_PROVINCE_ABBREVS } from '@/data/geo-data';
import { type ViolationRecord, ALL_VIOLATIONS } from './violations-list.data';
import { type AssetViolationRecord, type AssetViolationDef, ASSET_VIOLATION_DEFS } from './asset-violations.data';
import { Combobox } from '@/components/ui/combobox';
import { VIOLATION_DATA } from '@/data/violations.data';
import { useAppData } from '@/context/AppDataContext';
import { CARRIER_DRIVERS } from '@/pages/accounts/carrier-fleet.data';
import { CARRIER_ASSETS } from '@/pages/accounts/carrier-assets.data';

type FormMode = 'driver' | 'asset';

interface ViolationEditFormProps {
    isOpen: boolean;
    onClose: () => void;
    record: ViolationRecord | AssetViolationRecord | null;
    mode: FormMode;
    onSave: (updatedRecord: any) => void;
    /** When provided, the driver + asset dropdowns are filtered to this
     *  carrier's actual fleet. Falls back to the global MOCK_DRIVERS /
     *  MOCK_ASSETS for backwards compatibility with callers that don't
     *  know which carrier is active. */
    accountId?: string;
    /** 'modal' (default) renders the form in a centred modal overlay.
     *  'page' renders it as a full-page view with a back button — use this
     *  for dedicated Add/Edit pages. */
    presentation?: 'modal' | 'page';
}

export const ViolationEditForm = ({ isOpen, onClose, record, mode, onSave, accountId, presentation = 'modal' }: ViolationEditFormProps) => {
    // Carrier-scoped fleet — falls back to the global lists when no carrier
    // is supplied. For the Acme demo carrier (acct-001) the hand-curated
    // MOCK_VIOLATION_RECORDS reference driver/asset ids from MOCK_DRIVERS /
    // MOCK_ASSETS, so we MERGE those with the synthesized carrier fleet to
    // guarantee the dropdown can resolve every historical record's id.
    const driversForCarrier = useMemo(() => {
        if (!accountId) return MOCK_DRIVERS;
        const carrierList = CARRIER_DRIVERS[accountId] ?? [];
        if (accountId === 'acct-001') {
            const seen = new Set<string>();
            return [...MOCK_DRIVERS, ...carrierList].filter(d => {
                if (seen.has(d.id)) return false;
                seen.add(d.id);
                return true;
            });
        }
        return carrierList.length > 0 ? carrierList : MOCK_DRIVERS;
    }, [accountId]);
    const assetsForCarrier = useMemo(() => {
        if (!accountId) return MOCK_ASSETS;
        const carrierList = CARRIER_ASSETS[accountId] ?? [];
        if (accountId === 'acct-001') {
            const seen = new Set<string>();
            return [...MOCK_ASSETS, ...carrierList].filter(a => {
                if (seen.has(a.id)) return false;
                seen.add(a.id);
                return true;
            });
        }
        return carrierList.length > 0 ? carrierList : MOCK_ASSETS;
    }, [accountId]);
    // We use a flexible type for internal state to handle both record types
    const [formData, setFormData] = useState<any>({});
    const { documents: allDocTypes } = useAppData();
    const violationDocTypes = useMemo(() => allDocTypes.filter(d => d.relatedTo === 'violation' && d.status === 'Active'), [allDocTypes]);
    const requiredDocTypes = useMemo(() => violationDocTypes.filter(d => d.requirementLevel === 'required'), [violationDocTypes]);
    const [attachedDocs, setAttachedDocs] = useState<Array<{ id: string; docTypeId: string; docNumber: string; issueDate: string; includePdf: boolean; fileName: string }>>([]);

    useEffect(() => {
        if (record && record.id) {
            setFormData({ ...record });
            // Load existing attached docs or auto-populate required ones
            if ((record as any).attachedDocuments?.length) {
                setAttachedDocs((record as any).attachedDocuments);
            } else {
                // Auto-populate required doc types
                setAttachedDocs(requiredDocTypes.map(dt => ({
                    id: `doc-${Math.random().toString(36).substr(2, 9)}`,
                    docTypeId: dt.id,
                    docNumber: '',
                    issueDate: '',
                    includePdf: false,
                    fileName: ''
                })));
            }
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
            // Auto-populate required doc types for new records
            setAttachedDocs(requiredDocTypes.map(dt => ({
                id: `doc-${Math.random().toString(36).substr(2, 9)}`,
                docTypeId: dt.id,
                docNumber: '',
                issueDate: '',
                includePdf: false,
                fileName: ''
            })));
        }
    }, [record, isOpen, mode]);

    // Build country-aware violation options for driver mode
    // MUST be before early return to maintain hooks order
    const isCanada = formData.locationCountry === 'Canada';

    // ── Look up the parent BASIC category for a given violation. We walk the
    // VIOLATION_DATA tree (the unified master chart) to find which category
    // owns the selected item so the form can echo it back to the user as
    // chips (e.g. "Unsafe Driving · Speeding 6-10 over").
    const categoryForViolation = useMemo(() => {
        const targetId   = formData.violationDataId;
        const targetCode = formData.violationCode;
        if (!targetId && !targetCode) return null;
        for (const [catKey, cat] of Object.entries(VIOLATION_DATA.categories)) {
            const hit = cat.items.find(item =>
                (targetId && item.id === targetId) ||
                (targetCode && item.violationCode === targetCode) ||
                (targetCode && item.canadaEnforcement?.code === targetCode)
            );
            if (hit) {
                return {
                    categoryKey:    catKey,
                    categoryLabel:  cat.label ?? catKey.replace(/_/g, ' '),
                    subCategory:    hit.violationGroup,
                    isOos:          hit.isOos,
                    driverRiskCategory: hit.driverRiskCategory,
                };
            }
        }
        return null;
    }, [formData.violationDataId, formData.violationCode]);
    const driverViolationOptions = useMemo(() => {
      if (isCanada) {
        // Show Canadian enforcement codes from VIOLATION_DATA
        return Object.values(VIOLATION_DATA.categories).flatMap(cat => cat.items)
          .filter(item => item.canadaEnforcement)
          .map(item => ({
            value: item.canadaEnforcement!.code,
            label: `[${item.canadaEnforcement!.code}] ${item.canadaEnforcement!.descriptions?.full || item.violationDescription}`,
            description: `${item.canadaEnforcement!.category || item.violationGroup} · CVOR/NSC`,
            _sourceItem: item
          }));
      } else {
        // Show FMCSA codes (existing behavior)
        return ALL_VIOLATIONS.map(v => ({
          value: v.id,
          label: `[${v.violationCode}] ${v.violationDescription}`,
          description: `${v.violationGroup} · SMS`,
          _sourceItem: v
        }));
      }
    }, [isCanada]);

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
            location: fullLocation,
            attachedDocuments: attachedDocs
        });
        onClose();
    };

    // Helper for input classes
    const inputClass = "w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300";
    const labelClass = "block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5";

    const isDriverMode = mode === 'driver';


    const isPage = presentation === 'page';
    const Outer: React.FC<{ children: React.ReactNode }> = ({ children }) => isPage
        ? <div className="flex flex-col h-full bg-slate-50 p-6 overflow-y-auto">{children}</div>
        : <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">{children}</div>;
    const Inner: React.FC<{ children: React.ReactNode }> = ({ children }) => isPage
        ? <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full max-w-6xl mx-auto flex flex-col" style={{ maxHeight: 'calc(100vh - 8rem)' }}>{children}</div>
        : <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">{children}</div>;

    return (
        <Outer>
            <Inner>

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-3 min-w-0">
                        {isPage && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold shrink-0"
                                title="Back to list"
                            >
                                <ArrowLeft size={14} />
                                Back
                            </button>
                        )}
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {record?.id ? 'Edit' : 'Add'} {isDriverMode ? 'Driver' : 'Asset'} Violation
                            </h2>
                            {record?.id && <p className="text-xs text-slate-500 mt-0.5">ID: <span className="font-mono">{record.id}</span></p>}
                        </div>
                    </div>
                    {!isPage && (
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Form Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <form id="violation-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Two-column layout in page mode (collapses to one
                            column in the narrower modal). Left column: who,
                            when, where. Right column: what + paperwork. */}
                        <div className="grid xl:grid-cols-2 gap-6">
                          <div className="space-y-6">

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
                                                    const d = driversForCarrier.find(d => d.id === e.target.value);
                                                    if (d) {
                                                        handleChange('driverId', d.id);
                                                        handleChange('driverName', `${d.firstName} ${d.lastName}`);
                                                        handleChange('driverType', (d as any).driverType || 'Long Haul Driver');
                                                    }
                                                }}
                                            >
                                                <option value="">Select Driver...</option>
                                                {driversForCarrier.map(d => (
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
                                                    const a = assetsForCarrier.find(a => a.id === e.target.value || a.unitNumber === e.target.value);
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
                                                {assetsForCarrier.map(a => (
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
                                                    const a = assetsForCarrier.find(a => a.id === e.target.value);
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
                                                {assetsForCarrier.map(a => (
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
                                                    const d = driversForCarrier.find(d => d.id === e.target.value);
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
                                                {driversForCarrier.map(d => (
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
                                        {(formData.locationCountry === 'Canada' ? Object.entries(CA_PROVINCE_ABBREVS) : Object.entries(US_STATE_ABBREVS)).map(([abbr, name]) => (
                                            <option key={abbr} value={abbr}>{abbr} – {name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                          </div>
                          <div className="space-y-6">

                        {/* Violation Details */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                            <div>
                                <label className={labelClass}>Violation Type</label>
                                {isDriverMode ? (
                                    <Combobox
                                        options={driverViolationOptions}
                                        value={isCanada ? formData.violationCode : formData.violationDataId}
                                        onValueChange={(val: string) => {
                                            if (isCanada) {
                                                const allItems = Object.values(VIOLATION_DATA.categories).flatMap(cat => cat.items);
                                                const v = allItems.find(item => item.canadaEnforcement?.code === val);
                                                if (v) {
                                                    handleChange('violationCode', v.canadaEnforcement!.code);
                                                    handleChange('violationType', v.canadaEnforcement!.descriptions?.full || v.violationDescription);
                                                    handleChange('violationGroup', v.canadaEnforcement!.category || v.violationGroup);
                                                    handleChange('driverRiskCategory', v.driverRiskCategory || 3);
                                                    handleChange('crashLikelihood', v.crashLikelihoodPercent || 0);
                                                    handleChange('isOos', v.isOos);
                                                }
                                            } else {
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
                                            }
                                        }}
                                        placeholder={isCanada ? 'Search Canadian violation code...' : 'Search SMS violation code...'}
                                        searchPlaceholder={isCanada ? 'Search CVOR/NSC violations...' : 'Search SMS violations...'}
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

                                {/* Resolved Category / Sub-category chips — gives
                                    the clerk an immediate visual confirmation of
                                    which BASIC / group the selected code belongs
                                    to. Read-only; derived from VIOLATION_DATA. */}
                                {isDriverMode && categoryForViolation && (
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Category</span>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                            {categoryForViolation.categoryLabel}
                                        </span>
                                        {categoryForViolation.subCategory && (
                                            <>
                                                <span className="text-[10px] text-slate-300">/</span>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sub-category</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {categoryForViolation.subCategory}
                                                </span>
                                            </>
                                        )}
                                        {categoryForViolation.isOos && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                OOS-qualifying
                                            </span>
                                        )}
                                    </div>
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
                                </div>
                                
                                <div className="grid grid-cols-2 gap-5">
                                    {/* Status Status */}
                                    <div>
                                        <label className={labelClass}>Status</label>
                                        <select 
                                            className={inputClass}
                                            value={formData.status || 'Open'}
                                            onChange={e => handleChange('status', e.target.value)}
                                        >
                                            <option value="Open">Open</option>
                                            <option value="Under Review">Under Review</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>

                                    {/* OOS Toggle */}
                                    <div>
                                        <label className={labelClass}>OOS (Out of Service)</label>
                                        <div className="flex items-center gap-3 h-10">
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="sr-only peer"
                                                    checked={formData.isOos || false}
                                                    onChange={e => handleChange('isOos', e.target.checked)}
                                                />
                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                                                <span className="ml-3 text-sm font-medium text-slate-700">
                                                    {formData.isOos ? 'Yes, OOS Issued' : 'No'}
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            
                            {/* Currency stays here so the violation record keeps
                                its jurisdiction context — fine amounts are now
                                tracked downstream on the linked Ticket record
                                (see Tickets page), not on the violation itself. */}
                            <div className="grid grid-cols-2 gap-5 pt-2 border-t border-slate-200/60">
                                <div>
                                    <label className={labelClass}>Currency</label>
                                    <select
                                        className={`${inputClass} bg-slate-50 font-bold text-slate-600`}
                                        value={formData.currency || 'USD'}
                                        onChange={e => handleChange('currency', e.target.value)}
                                    >
                                        <option value="USD">USD</option>
                                        <option value="CAD">CAD</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ===== REFERENCES & IDENTIFIERS ===== */}
                        {/* Court / regulator paperwork — used when the violation
                            was reconciled against an external feed (FMCSA SMS,
                            CVOR conviction, NSC AB·PEI·NS conviction, federal
                            Contraventions) or when a clerk is logging the
                            offence by hand from the ticket. */}
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={14} className="text-slate-500" /> References &amp; Identifiers
                            </h3>

                            {/* Row 1 — paperwork numbers */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Microfilm #</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="MF-US1234567"
                                        value={formData.microfilmNumber || ''}
                                        onChange={e => handleChange('microfilmNumber', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Ticket #</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="CT-IL-12345"
                                        value={formData.ticketNumber || ''}
                                        onChange={e => handleChange('ticketNumber', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Citation #</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="CIT-2025-00123"
                                        value={formData.citationNumber || ''}
                                        onChange={e => handleChange('citationNumber', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Docket #</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="DKT-2025-00123"
                                        value={formData.docketNumber || ''}
                                        onChange={e => handleChange('docketNumber', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Driver Master No.</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="Provincial driver abstract / master number"
                                        value={formData.driverMasterNumber || ''}
                                        onChange={e => handleChange('driverMasterNumber', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Row 2 — what was charged */}
                            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-200/60">
                                <div className="col-span-2">
                                    <label className={labelClass}>Charge (as filed)</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Operate commercial vehicle — wheel not secured"
                                        value={formData.charge || ''}
                                        onChange={e => handleChange('charge', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Offence (section / description as printed on ticket)</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. HTA 84.1 — Drive CMV — wheel not secured"
                                        value={formData.offence || ''}
                                        onChange={e => handleChange('offence', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>NAT Code (CCMTA)</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. F36"
                                        value={formData.natCode || ''}
                                        onChange={e => handleChange('natCode', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Act · Section</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. HTA s.84.1 / 49 CFR §392.5"
                                        value={formData.actSection || ''}
                                        onChange={e => handleChange('actSection', e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className={labelClass}>Issuing Agency</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="e.g. Ontario MTO — CVCEC / RCMP / FMCSA"
                                        value={formData.issuingAgency || ''}
                                        onChange={e => handleChange('issuingAgency', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Court conviction — populated when the ticket has been
                                disposed and the conviction is now registered on the
                                carrier's NSC or CVOR profile.
                                USDOT / CVOR / NSC carrier numbers live on the carrier
                                profile (same across every violation for this carrier),
                                so they're not duplicated here. */}
                            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-slate-200/60">
                                <div>
                                    <label className={labelClass}>Conviction #</label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        placeholder="CN-ON-654321"
                                        value={formData.convictionNumber || ''}
                                        onChange={e => handleChange('convictionNumber', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Conviction Date</label>
                                    <input
                                        type="date"
                                        className={inputClass}
                                        value={formData.convictionDate || ''}
                                        onChange={e => handleChange('convictionDate', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                          </div>
                        </div>

                        {/* ===== DOCUMENTS SECTION ===== */}
                        <div className="p-4 bg-blue-50/30 rounded-xl border border-blue-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} className="text-blue-500" /> Violation Documents
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setAttachedDocs(prev => [...prev, {
                                        id: `doc-${Math.random().toString(36).substr(2, 9)}`,
                                        docTypeId: '',
                                        docNumber: '',
                                        issueDate: '',
                                        includePdf: false,
                                        fileName: ''
                                    }])}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                                >
                                    <Plus size={14} /> Add Document
                                </button>
                            </div>

                            {attachedDocs.length === 0 && (
                                <div className="text-center py-6 text-slate-400 text-sm">
                                    No documents attached. Click "+ Add Document" to add one.
                                </div>
                            )}

                            {attachedDocs.map((doc, idx) => {
                                const isRequired = requiredDocTypes.some(dt => dt.id === doc.docTypeId);
                                return (
                                    <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
                                        {/* Row 1: Doc Type + Doc Number + Delete */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Document Type {isRequired && <span className="text-red-500">*</span>}</label>
                                                <select
                                                    className={inputClass}
                                                    value={doc.docTypeId}
                                                    onChange={e => {
                                                        const newDocs = [...attachedDocs];
                                                        newDocs[idx] = { ...newDocs[idx], docTypeId: e.target.value };
                                                        setAttachedDocs(newDocs);
                                                    }}
                                                >
                                                    <option value="">Select type...</option>
                                                    {violationDocTypes.map(dt => (
                                                        <option key={dt.id} value={dt.id}>{dt.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelClass}>Document Number</label>
                                                <input
                                                    type="text"
                                                    className={inputClass}
                                                    placeholder="e.g. CIT-2024-00123"
                                                    value={doc.docNumber}
                                                    onChange={e => {
                                                        const newDocs = [...attachedDocs];
                                                        newDocs[idx] = { ...newDocs[idx], docNumber: e.target.value };
                                                        setAttachedDocs(newDocs);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: Issue Date */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}>Issue Date</label>
                                                <input
                                                    type="date"
                                                    className={inputClass}
                                                    value={doc.issueDate}
                                                    onChange={e => {
                                                        const newDocs = [...attachedDocs];
                                                        newDocs[idx] = { ...newDocs[idx], issueDate: e.target.value };
                                                        setAttachedDocs(newDocs);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Upload Documents Area */}
                                        <div className="bg-slate-50/80 rounded-lg border border-dashed border-slate-300 p-4 space-y-3">
                                            <span className={labelClass + ' mb-0'}>Upload Documents</span>
                                            <div className="flex flex-col items-center justify-center py-4 border-2 border-dashed border-blue-200 rounded-lg bg-white hover:bg-blue-50/30 transition-colors cursor-pointer">
                                                <Upload size={20} className="text-blue-400 mb-1" />
                                                <span className="text-xs text-blue-500 font-medium">Document PDF</span>
                                                <label className="mt-2 cursor-pointer">
                                                    <span className="text-[11px] text-slate-500">Choose File</span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                        onChange={e => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                const newDocs = [...attachedDocs];
                                                                newDocs[idx] = { ...newDocs[idx], fileName: file.name };
                                                                setAttachedDocs(newDocs);
                                                            }
                                                        }}
                                                    />
                                                    {doc.fileName && (
                                                        <span className="ml-2 text-[11px] text-emerald-600 font-medium">{doc.fileName}</span>
                                                    )}
                                                    {!doc.fileName && (
                                                        <span className="ml-2 text-[11px] text-slate-400">No file chosen</span>
                                                    )}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

            </Inner>
        </Outer>
    );
};
