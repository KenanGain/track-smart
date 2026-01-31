import { useState, useMemo } from 'react';
import {
    Check, X, Search, User, Info, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { INITIAL_SERVICE_TYPES } from '@/data/service-types.data';
import type { ServiceGroup } from '@/types/service-types';

import { INITIAL_ASSETS } from '../assets/assets.data';

type EntityType = "truck" | "trailer" | "both";
type FrequencyUnit = "miles" | "days" | "engine_hours";

interface CreateScheduleFormProps {
    onSave: (schedule: any) => void;
    onCancel: () => void;
}

export function CreateScheduleForm({ onSave, onCancel }: CreateScheduleFormProps) {
    // --- State ---

    // Section 1: Schedule
    const [entityType, setEntityType] = useState<EntityType>("truck");
    const [scheduleName, setScheduleName] = useState("");
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
    const [activeServiceGroup, setActiveServiceGroup] = useState<"All" | ServiceGroup>("All");
    const [frequencyEvery, setFrequencyEvery] = useState<number>(0);
    const [frequencyUnit, setFrequencyUnit] = useState<FrequencyUnit>("miles");
    const [upcomingThreshold, setUpcomingThreshold] = useState<number>(0);

    // Section 2: Assets
    const [applyToAll, setApplyToAll] = useState(false);
    const [assignedAssetIds, setAssignedAssetIds] = useState<string[]>([]);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");

    // Section 3: Alerts
    const [alertRecipients, setAlertRecipients] = useState<string[]>([]);
    const [alertReminders, setAlertReminders] = useState<string[]>([]);
    const [alertChannels, setAlertChannels] = useState<string[]>([]);

    // --- Derived State & Helpers ---

    // Filter Services based on Entity Type and Group
    const availableServices = useMemo(() => {
        return INITIAL_SERVICE_TYPES.filter(service => {
            // 1. Filter by Entity Type
            let matchesEntity = false;
            if (entityType === "truck") {
                matchesEntity = service.category === "cmv_only" || service.category === "both_cmv_and_non_cmv";
            } else if (entityType === "trailer") {
                matchesEntity = service.category === "non_cmv_only" || service.category === "both_cmv_and_non_cmv";
            } else {
                matchesEntity = true; // Both
            }

            // 2. Filter by Group
            const matchesGroup = activeServiceGroup === "All" || service.group === activeServiceGroup;

            return matchesEntity && matchesGroup;
        });
    }, [entityType, activeServiceGroup]);

    // Filter Assets for Modal
    const availableAssets = useMemo(() => {
        return INITIAL_ASSETS.filter(asset => {
            // Filter by Entity Type
            let matchesEntity = false;
            if (entityType === "truck") matchesEntity = asset.assetCategory === "CMV";
            else if (entityType === "trailer") matchesEntity = asset.assetCategory === "Non-CMV";
            else matchesEntity = true;

            // Filter by Search
            const matchesSearch =
                asset.unitNumber.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
                asset.vin.toLowerCase().includes(assetSearchQuery.toLowerCase());

            return matchesEntity && matchesSearch;
        });
    }, [entityType, assetSearchQuery]);

    // Handle Entity Type Change
    const handleEntityTypeChange = (type: EntityType) => {
        setEntityType(type);
        setSelectedServiceIds([]); // Clear services
        setAssignedAssetIds([]);   // Clear assets
        setApplyToAll(false);      // Reset Apply to All
    };

    // Toggle Service Selection
    const toggleService = (id: string) => {
        setSelectedServiceIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    // Toggle Asset Selection
    const toggleAsset = (id: string) => {
        setAssignedAssetIds(prev =>
            prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
        );
    };

    // Toggle Alert Selection helpers
    const toggleItem = (list: string[], setList: any, item: string) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

    // Validation
    const isValid = useMemo(() => {
        return (
            scheduleName.trim().length > 0 &&
            selectedServiceIds.length > 0 &&
            frequencyEvery > 0 &&
            upcomingThreshold >= 0 &&
            (applyToAll || assignedAssetIds.length > 0)
        );
    }, [scheduleName, selectedServiceIds, frequencyEvery, upcomingThreshold, applyToAll, assignedAssetIds]);

    const handleSave = () => {
        if (!isValid) return;

        const schedule = {
            id: `sch_${Math.random().toString(36).substr(2, 9)}`,
            entityCategory: entityType,
            name: scheduleName,
            serviceTypeIds: selectedServiceIds,
            frequency: {
                every: frequencyEvery,
                unit: frequencyUnit
            },
            upcomingThreshold,
            assignment: {
                applyToAll,
                entityIds: applyToAll ? [] : assignedAssetIds
            },
            alert: {
                recipients: alertRecipients,
                reminders: alertReminders,
                channels: alertChannels
            },
            status: "active",
            createdAt: new Date().toISOString()
        };

        onSave(schedule);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* --- Sticky Header --- */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
                <h1 className="text-2xl font-bold text-slate-900">Create Schedule</h1>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2 ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'
                            }`}
                    >
                        <Check size={16} /> Save Schedule
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 max-w-5xl mx-auto w-full">

                {/* --- Section 1: Schedule --- */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">1</div>
                        <h2 className="text-lg font-semibold text-slate-900">Schedule</h2>
                    </div>

                    <div className="space-y-6 pl-11">
                        {/* Entity Type */}
                        {/* Entity Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Entity Type <span className="text-red-500">*</span></label>
                            <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                                {(['truck', 'trailer', 'both'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => handleEntityTypeChange(type)}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${entityType === type
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                            : 'text-slate-500 hover:text-slate-900'
                                            }`}
                                    >
                                        {type === 'truck' ? 'CMV (Trucks)' : type === 'trailer' ? 'Non-CMV (Trailers)' : 'Both'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Maintenance Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance Type <span className="text-red-500">*</span></label>

                            {/* Group Tabs */}
                            <div className="flex border-b border-slate-200 mb-3 overflow-x-auto">
                                {['All', 'Engine', 'Tires & Brakes', 'Inspections', 'General'].map((group) => (
                                    <button
                                        key={group}
                                        onClick={() => setActiveServiceGroup(group as any)}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeServiceGroup === group
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        {group}
                                    </button>
                                ))}
                            </div>

                            {/* Service List */}
                            <div className="h-64 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1">
                                {availableServices.length > 0 ? availableServices.map(service => {
                                    const isSelected = selectedServiceIds.includes(service.id);
                                    return (
                                        <div
                                            key={service.id}
                                            onClick={() => toggleService(service.id)}
                                            className={`flex items-center p-3 rounded-md cursor-pointer transition-all border ${isSelected
                                                ? 'bg-blue-50 border-blue-500 shadow-sm'
                                                : 'bg-white border-transparent hover:border-slate-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                                }`}>
                                                {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <div>
                                                <div className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>{service.name}</div>
                                                <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">{service.group}</div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                        <Search size={24} className="mb-2 opacity-50" />
                                        <p className="text-sm">No services found for this filter.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Schedule Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Schedule Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. Oil Change Every 10k"
                                value={scheduleName}
                                onChange={(e) => setScheduleName(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* Frequency & Threshold */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Frequency */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance Frequency <span className="text-red-500">*</span></label>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-500 font-medium">Every</span>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={frequencyEvery || ''}
                                        onChange={(e) => setFrequencyEvery(parseInt(e.target.value) || 0)}
                                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                    />
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                        {(['miles', 'days', 'engine_hours'] as const).map((unit) => (
                                            <button
                                                key={unit}
                                                onClick={() => setFrequencyUnit(unit)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${frequencyUnit === unit
                                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                                    : 'text-slate-500 hover:text-slate-900'
                                                    }`}
                                            >
                                                {unit === 'engine_hours' ? 'Hrs' : unit.charAt(0).toUpperCase() + unit.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Threshold */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Upcoming Threshold <span className="text-red-500">*</span></label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="0"
                                        value={upcomingThreshold || ''}
                                        onChange={(e) => setUpcomingThreshold(parseInt(e.target.value) || 0)}
                                        className="w-24 px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                    />
                                    <span className="text-sm text-slate-500">
                                        {frequencyUnit === 'miles' ? 'miles' : frequencyUnit === 'days' ? 'days' : 'hours'} before due
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- Section 2: Assets --- */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">2</div>
                        <h2 className="text-lg font-semibold text-slate-900">Assets</h2>
                    </div>

                    <div className="space-y-6 pl-11">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setApplyToAll(!applyToAll);
                                        if (!applyToAll) setAssignedAssetIds([]); // Clear individual if turning on
                                    }}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${applyToAll ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${applyToAll ? 'left-6' : 'left-1'}`} />
                                </button>
                                <label className="text-sm font-medium text-slate-700">Apply to all eligible assets</label>
                            </div>

                            <button
                                onClick={() => setIsAssetModalOpen(true)}
                                disabled={applyToAll}
                                className={`text-sm font-medium px-3 py-1.5 rounded border transition-colors ${applyToAll
                                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                                    }`}
                            >
                                + Add Assets
                            </button>
                        </div>

                        {applyToAll ? (
                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3 text-blue-700">
                                <Info size={18} />
                                <span className="text-sm font-medium">Applied to All {entityType === 'truck' ? 'CMV Assets' : entityType === 'trailer' ? 'Non-CMV Assets' : 'Assets'}</span>
                            </div>
                        ) : (
                            <div className="min-h-[100px]">
                                {assignedAssetIds.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {assignedAssetIds.map(id => {
                                            const asset = INITIAL_ASSETS.find(a => a.id === id);
                                            return (
                                                <div key={id} className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-3 pr-1 py-1 shadow-sm">
                                                    <span className="text-sm font-medium text-slate-700">{asset?.unitNumber}</span>
                                                    <span className="text-xs text-slate-400 border-l border-slate-200 pl-2">VIN {asset?.vin.slice(-4)}</span>
                                                    <button onClick={() => toggleAsset(id)} className="p-1 hover:bg-slate-100 rounded-full ml-1 text-slate-400 hover:text-red-500">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                                        Select assets (or turn on Apply to All).
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>

                {/* --- Section 3: Alerts --- */}
                <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">3</div>
                        <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pl-11">
                        <div className="space-y-6">
                            {/* Notify Users */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Notify Users</label>
                                <div className="space-y-2">
                                    {['Fleet Admin', 'Safety Manager', 'Maintenance Manager'].map(role => (
                                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${alertRecipients.includes(role) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                                }`}>
                                                {alertRecipients.includes(role) && <Check size={10} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={alertRecipients.includes(role)} onChange={() => toggleItem(alertRecipients, setAlertRecipients, role)} />
                                            <span className="text-sm text-slate-700">{role}</span>
                                        </label>
                                    ))}

                                    {/* Driver separate for helper text */}
                                    <div className="pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${alertRecipients.includes('Driver') ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                                }`}>
                                                {alertRecipients.includes('Driver') && <Check size={10} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={alertRecipients.includes('Driver')} onChange={() => toggleItem(alertRecipients, setAlertRecipients, 'Driver')} />
                                            <span className="text-sm text-slate-700">Driver</span>
                                        </label>
                                        {alertRecipients.includes('Driver') && (
                                            <div className="flex items-center gap-2 mt-2 ml-6 text-xs text-blue-600 bg-blue-50 px-2 py-1.5 rounded-md border border-blue-100 inline-flex">
                                                <User size={12} />
                                                Alerts will be sent to the respective assigned driver.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Reminders */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Notification Reminders</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['90 Days Before', '60 Days Before', '30 Days Before', '7 Days Before'].map(reminder => (
                                        <label key={reminder} className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${alertReminders.includes(reminder) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                                }`}>
                                                {alertReminders.includes(reminder) && <Check size={10} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={alertReminders.includes(reminder)} onChange={() => toggleItem(alertReminders, setAlertReminders, reminder)} />
                                            <span className="text-sm text-slate-700">{reminder}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Channels */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Channels</label>
                                <div className="flex gap-4">
                                    {['Email', 'In-App', 'SMS'].map(channel => (
                                        <label key={channel} className="flex items-center gap-2 cursor-pointer">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${alertChannels.includes(channel) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                                }`}>
                                                {alertChannels.includes(channel) && <Check size={10} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={alertChannels.includes(channel)} onChange={() => toggleItem(alertChannels, setAlertChannels, channel)} />
                                            <span className="text-sm text-slate-700">{channel}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Projected Schedule Box */}
                    <div className="mt-8 ml-11 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3 text-blue-900 shadow-sm relative overflow-hidden">
                        <div className="absolute right-0 top-0 h-full w-1 bg-blue-400 opacity-20"></div>
                        <AlertCircle size={20} className="shrink-0 text-blue-600 mt-0.5" />
                        <div>
                            <h4 className="text-sm font-bold">{frequencyUnit === 'days' ? 'Monitor Expiry Date' : 'Monitor Usage'}</h4>
                            <p className="text-sm text-blue-700 mt-1">
                                System will track {frequencyUnit === 'miles' ? 'mileage' : frequencyUnit === 'engine_hours' ? 'engine hours' : 'calendar dates'} and trigger alerts
                                {alertChannels.length > 0 ? ` via ${alertChannels.join(', ')}` : ''}.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            {/* --- Assets Modal --- */}
            {isAssetModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-lg">Select Assets</h3>
                            <button onClick={() => setIsAssetModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>

                        <div className="p-4 border-b border-slate-100">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search unit #, VIN..."
                                    value={assetSearchQuery}
                                    onChange={(e) => setAssetSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        <div className="overflow-y-auto p-2 space-y-1 flex-1">
                            {availableAssets.length > 0 ? availableAssets.map(asset => {
                                const isSelected = assignedAssetIds.includes(asset.id);
                                return (
                                    <div
                                        key={asset.id}
                                        onClick={() => toggleAsset(asset.id)}
                                        className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                                            }`}>
                                            {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-semibold text-slate-900">{asset.unitNumber}</div>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${asset.assetCategory === 'CMV' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                                                    }`}>
                                                    {asset.assetCategory}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500">VIN: •••••{asset.vin.slice(-4)}</div>
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="py-8 text-center text-slate-400">
                                    <p className="text-sm">No matching assets found.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                            <div className="text-xs text-slate-500">
                                {assignedAssetIds.length} assets selected
                            </div>
                            <Button onClick={() => setIsAssetModalOpen(false)}>Done</Button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
