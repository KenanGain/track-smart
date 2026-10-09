import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Check, X, Search, Info, CalendarClock, ListChecks, Gauge, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
// The app’s full-page form chrome — the Add Inventory / Add Asset look: a white
// "Progress — complete each section" rail on the left, a header with a back link and the
// save buttons, and section cards with an icon tile. Every long form in the app wears it,
// and a form that invents its own rail is the one that looks like a different product.
import {
    WizardHeader, WizardSection, WizardStepNav, type WizardStep,
} from '@/components/ui/WizardEditor';
import { cn } from '@/lib/utils';
// Live service-types store — picks up Settings → Maintenance edits.
import { useServiceTypes } from '@/data/serviceTypesStore';
// How often the chosen services come round — the three clocks, as one block.
import {
    ServiceIntervalFields, EMPTY_INTERVALS, toDraft, fromDraft, hasInterval, type IntervalDraft,
} from '@/components/maintenance/ServiceIntervalFields';
import type { ServiceIntervals } from '@/types/service-types';
import { PM_TIERS, type PmTierId } from './service-intervals';

import { INITIAL_ASSETS } from '../assets/assets.data';

type EntityType = "truck" | "trailer" | "both";

/** The three sections, in the order the form asks them. */
const STEPS: readonly WizardStep[] = [
    { id: 'services', label: 'Services', icon: ListChecks },
    { id: 'interval', label: 'Service interval', icon: Gauge },
    { id: 'assets', label: 'Assets', icon: Truck },
];

interface CreateScheduleFormProps {
    onSave: (schedule: any) => void;
    onCancel: () => void;
    initialAssetId?: string;
    initialEntityType?: EntityType;
    /**
     * An existing rule to edit. Same form, same fields — editing a service interval and
     * building one are the same question, and a second screen for it would be a second
     * place for the two to disagree.
     */
    initial?: {
        id: string;
        name: string;
        entityType: EntityType;
        serviceTypeIds: string[];
        intervals?: ServiceIntervals;
        assetIds: string[];
        applyToAll: boolean;
        tier?: PmTierId;
    };
}

export function CreateScheduleForm({ onSave, onCancel, initialAssetId, initialEntityType, initial }: CreateScheduleFormProps) {
    const editing = !!initial;
    const SERVICE_TYPES = useServiceTypes();
    // --- State ---

    // Section 1: Schedule
    const [entityType, setEntityType] = useState<EntityType>(initial?.entityType || initialEntityType || "truck");
    const [scheduleName, setScheduleName] = useState(initial?.name ?? "");
    /*
     * How heavy this one is.
     *
     * A different question from how often it comes round, and the one that makes a fleet
     * comparable with itself: "what does a minor cost us" and "how many comprehensives
     * are we behind on" are unanswerable while every rule names its own weight. Optional,
     * because a one-off ("Replace the APU belt") is not a tier and should not be forced
     * into one.
     */
    const [tier, setTier] = useState<PmTierId | undefined>(initial?.tier);
    const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(initial?.serviceTypeIds ?? []);
    const [serviceSearchQuery, setServiceSearchQuery] = useState("");
    const [activeServiceGroup, setActiveServiceGroup] = useState<string>("All");
    // Per-service inline remarks — same pattern as the Create Task Order
    // picker. Keyed by service-type id; only entries for currently-checked
    // services are persisted.
    const [serviceRemarks, setServiceRemarks] = useState<Record<string, string>>({});

    // Section 2: how often it comes round. The interval lives here and nowhere else —
    // it is the whole point of the screen, and the same service is on a different clock
    // on a long-haul tractor than on a yard truck.
    const [iv, setIv] = useState<IntervalDraft>(initial?.intervals ? toDraft(initial.intervals) : EMPTY_INTERVALS);

    // Section 3: Assets
    const [applyToAll, setApplyToAll] = useState(initial?.applyToAll ?? false);
    const [assignedAssetIds, setAssignedAssetIds] = useState<string[]>(
        initial?.assetIds ?? (initialAssetId ? [initialAssetId] : []));
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");

    // Filter Services based on Entity Type and Group
    const availableServices = useMemo(() => {
        return SERVICE_TYPES.filter(service => {
            // 1. Filter by Entity Type
            let matchesEntity = false;
            // console.log("Filtering:", entityType, service.category); // Debug logging

            if (entityType === "truck") {
                matchesEntity = service.category === "cmv_only" || service.category === "both_cmv_and_non_cmv";
            } else if (entityType === "trailer") {
                matchesEntity = service.category === "non_cmv_only" || service.category === "both_cmv_and_non_cmv";
            } else {
                // For "Both", only show services applicable to BOTH (common services)
                matchesEntity = service.category === "both_cmv_and_non_cmv";
            }

            // 2. Filter by Group
            const matchesGroup = activeServiceGroup === "All" || service.group === activeServiceGroup;

            // 3. Filter by Search
            const matchesSearch = service.name.toLowerCase().includes(serviceSearchQuery.toLowerCase());

            return matchesEntity && matchesGroup && matchesSearch;
        });
    }, [entityType, activeServiceGroup, serviceSearchQuery]);

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
        if (type === entityType) return;
        setEntityType(type);
        // Services and assets are both filtered by this, so what was picked under the old
        // answer may not exist under the new one.
        setSelectedServiceIds([]);
        setAssignedAssetIds([]);
        setApplyToAll(false);
    };

    // Toggle Service Selection — unchecking also drops any remarks the user
    // typed for that service so re-checking starts fresh.
    const toggleService = (id: string) => {
        setSelectedServiceIds(prev => {
            if (prev.includes(id)) {
                setServiceRemarks(r => {
                    if (!(id in r)) return r;
                    const next = { ...r };
                    delete next[id];
                    return next;
                });
                return prev.filter(sid => sid !== id);
            }
            return [...prev, id];
        });
    };

    // Toggle Asset Selection
    const toggleAsset = (id: string) => {
        setAssignedAssetIds(prev =>
            prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
        );
    };

    // ── Section navigator ── the form scrolls inside `scrollRef` and the rail follows it,
    // exactly as the Add Inventory and Add Asset wizards do.
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);

    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const obs = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveStep(visible[0].target.id.replace('section-', ''));
            },
            { root, rootMargin: '-12px 0px -55% 0px', threshold: 0 },
        );
        for (const st of STEPS) {
            const sec = document.getElementById(`section-${st.id}`);
            if (sec) obs.observe(sec);
        }
        return () => obs.disconnect();
    }, []);

    const go = (id: string) => {
        const sec = document.getElementById(`section-${id}`);
        const el = scrollRef.current;
        if (!sec || !el) return;
        el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12, behavior: 'smooth' });
        setActiveStep(id);
    };

    /** How many answers a section holds — the rail’s tick and its count chip. */
    const filled = (id: string) => {
        if (id === 'services') return selectedServiceIds.length;
        if (id === 'interval') return [iv.mileage, iv.engineHours, iv.days].filter((c) => c.on && c.every > 0).length;
        return applyToAll ? 1 : assignedAssetIds.length;
    };

    // Validation
    const isValid = useMemo(() => {
        return (
            scheduleName.trim().length > 0 &&
            selectedServiceIds.length > 0 &&
            (applyToAll || assignedAssetIds.length > 0)
        );
    }, [scheduleName, selectedServiceIds, applyToAll, assignedAssetIds]);

    const handleSave = () => {
        if (!isValid) return;

        // Snapshot per-service remarks for currently-selected services only,
        // dropping empty strings.
        const remarksByService: Record<string, string> = {};
        for (const sid of selectedServiceIds) {
            const text = (serviceRemarks[sid] ?? "").trim();
            if (text) remarksByService[sid] = text;
        }

        const schedule = {
            // Editing keeps the id, so the tasks already raised under it stay its own.
            id: initial?.id ?? `sch_${Math.random().toString(36).substr(2, 9)}`,
            entityCategory: entityType,
            name: scheduleName,
            tier,
            serviceTypeIds: selectedServiceIds,
            intervals: fromDraft(iv),
            remarksByService: Object.keys(remarksByService).length > 0 ? remarksByService : undefined,
            assignment: {
                applyToAll,
                entityIds: applyToAll ? availableAssets.map(a => a.id) : assignedAssetIds
            },
            status: "active",
            createdAt: new Date().toISOString()
        };

        onSave(schedule);
    };

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel="Back to Maintenance"
                onBack={onCancel}
                icon={CalendarClock}
                title={editing ? "Edit Service Interval" : "Create Service Intervals"}
                subtitle="What comes round, how often, and on which assets."
                actions={<>
                    <button
                        onClick={onCancel}
                        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isValid}
                        className={cn(
                            "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors",
                            isValid ? "bg-blue-600 hover:bg-blue-700" : "cursor-not-allowed bg-slate-300",
                        )}
                    >
                        <Check size={16} /> {editing ? "Save changes" : "Save Service Intervals"}
                    </button>
                </>}
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={filled} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">

                <WizardSection
                    id="services"
                    icon={ListChecks}
                    title="Services"
                    subtitle="What this interval covers, and what to call it."
                >
                    <div className="space-y-6">
                        {/* Entity Type */}
                        {/* Schedule Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. Oil Change Every 10k"
                                value={scheduleName}
                                onChange={(e) => setScheduleName(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                            />
                        </div>

                        {/* How heavy it is. Four words every shop already uses, so the
                            fleet can be read by weight rather than one rule at a time.

                            The same segmented control as Applies To directly below: four
                            boxed pills each wrapping onto two lines read as four unrelated
                            widgets, and two controls answering the same KIND of question
                            should not look like two different products. Colour belongs on
                            the lists, where it is doing scanning work. */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Service Level
                                <span className="ml-2 text-xs font-normal text-slate-400">
                                    Optional — a one-off repair is not a tier
                                </span>
                            </label>
                            <div className="inline-flex flex-wrap bg-slate-100 p-1 rounded-lg">
                                {PM_TIERS.map((t) => {
                                    const on = tier === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            // Picking the one already picked clears it, so a rule can
                                            // be left unclassified without hunting for a "none" option.
                                            onClick={() => setTier(on ? undefined : t.id)}
                                            // What the level means, kept to a hover: four names every
                                            // shop already knows do not need explaining on the form.
                                            title={t.blurb}
                                            className={cn(
                                                'whitespace-nowrap rounded-md px-4 py-1.5 text-sm font-medium transition-all',
                                                on
                                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                                    : 'text-slate-500 hover:text-slate-900',
                                            )}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Entity Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Applies To <span className="text-red-500">*</span></label>
                            <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                                {/* ... entity type buttons ... */}
                                {(['truck', 'trailer', 'both'] as const).map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => !initialEntityType && handleEntityTypeChange(type)}
                                        disabled={!!initialEntityType}
                                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${entityType === type
                                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5'
                                            : initialEntityType ? 'text-slate-400 cursor-not-allowed' : 'text-slate-500 hover:text-slate-900'
                                            }`}
                                    >
                                        {type === 'truck' ? 'Trucks' : type === 'trailer' ? 'Trailers' : 'Both'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* Maintenance Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Maintenance Type <span className="text-red-500">*</span></label>

                            {/* Search Services */}
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search services..."
                                    value={serviceSearchQuery}
                                    onChange={(e) => setServiceSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                                />
                            </div>

                            {/* Group Tabs — same 7-category structure used by
                                the Create Task Order → New Task picker, so both
                                forms feel identical. */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {[
                                    'All',
                                    'Engine',
                                    'Brakes',
                                    'Tires & Wheels',
                                    'Suspension & Steering',
                                    'Body & Coupling',
                                    'Lamps & Electrical',
                                    'Inspections',
                                    'Other',
                                ].map((group) => {
                                    const isActive = activeServiceGroup === group;
                                    return (
                                        <button
                                            key={group}
                                            type="button"
                                            onClick={() => setActiveServiceGroup(group)}
                                            className={`inline-flex items-center h-7 px-3 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap leading-none ${
                                                isActive
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                            }`}
                                        >
                                            {group}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Service List — selecting a row reveals an inline
                                "Remarks for this task" textarea, mirroring the
                                Create Task Order picker so both flows feel
                                identical. */}
                            <div className="h-72 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1">
                                {availableServices.length > 0 ? availableServices.map(service => {
                                    const isSelected = selectedServiceIds.includes(service.id);
                                    return (
                                        <div
                                            key={service.id}
                                            className={`rounded-md transition-all border ${isSelected
                                                ? 'bg-blue-50 border-blue-500 shadow-sm'
                                                : 'bg-white border-transparent hover:border-slate-300'
                                                }`}
                                        >
                                            <div
                                                onClick={() => toggleService(service.id)}
                                                className="flex items-center p-3 cursor-pointer"
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

                                            {isSelected && (
                                                <div className="px-3 pb-3 pt-0">
                                                    <label className="mb-1 block text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                                        Remarks for this task <span className="text-slate-400 font-normal normal-case">(optional)</span>
                                                    </label>
                                                    <textarea
                                                        rows={2}
                                                        value={serviceRemarks[service.id] ?? ""}
                                                        onChange={(e) => setServiceRemarks(prev => ({ ...prev, [service.id]: e.target.value }))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder="e.g. driver reported squealing during morning brake check"
                                                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                                    />
                                                </div>
                                            )}
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

                    </div>
                </WizardSection>

                {/* The thing this screen is named after: three clocks, any mix. */}
                <WizardSection
                    id="interval"
                    icon={Gauge}
                    title="Service interval"
                    subtitle="How often it comes round. Whichever comes first is what falls due."
                >
                    <div className="space-y-3">
                        <ServiceIntervalFields value={iv} onChange={setIv} />

                        {!hasInterval(iv) && (
                            <p className="text-xs text-slate-500">
                                Nothing ticked — these services will be scheduled by hand. Tick a row to have
                                them fall due on their own; whichever comes first is what counts.
                            </p>
                        )}
                    </div>
                </WizardSection>

                <WizardSection
                    id="assets"
                    icon={Truck}
                    title="Assets"
                    subtitle="Which trucks or trailers it runs on."
                >
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        if (initialAssetId) return;
                                        setApplyToAll(!applyToAll);
                                        if (!applyToAll) setAssignedAssetIds([]); // Clear individual if turning on
                                    }}
                                    disabled={!!initialAssetId}
                                    className={`w-11 h-6 rounded-full relative transition-colors ${applyToAll ? 'bg-blue-600' : 'bg-slate-200'} ${initialAssetId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${applyToAll ? 'left-6' : 'left-1'}`} />
                                </button>
                                <label className="text-sm font-medium text-slate-700">Apply to all eligible assets</label>
                            </div>

                            <button
                                onClick={() => setIsAssetModalOpen(true)}
                                disabled={applyToAll || !!initialAssetId}
                                className={`text-sm font-medium px-3 py-1.5 rounded border transition-colors ${applyToAll || initialAssetId
                                    ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                                    : 'text-blue-600 border-blue-200 hover:bg-blue-50'
                                    }`}
                            >
                                + Add Assets
                            </button>
                        </div>

                        {/* Asset List */}
                        <div className="min-h-[100px]">
                            {(() => {
                                // Determine which assets to show
                                const assetsToDisplay = applyToAll
                                    ? availableAssets
                                    : assignedAssetIds.map(id => INITIAL_ASSETS.find(a => a.id === id)).filter(Boolean) as typeof INITIAL_ASSETS;

                                if (assetsToDisplay.length > 0) {
                                    return (
                                        <div className="space-y-4">
                                            {applyToAll && (
                                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center gap-3 text-blue-700">
                                                    <Info size={18} />
                                                    <span className="text-sm font-medium">Applied to All {assetsToDisplay.length} Eligible {entityType === 'truck' ? 'CMV' : entityType === 'trailer' ? 'Non-CMV' : ''} Assets.</span>
                                                </div>
                                            )}

                                            <div className="overflow-hidden border border-slate-200 rounded-lg">
                                                <table className="w-full text-left text-sm">
                                                    <thead className="bg-slate-50 border-b border-slate-200 font-medium text-slate-500 text-xs uppercase tracking-wider">
                                                        <tr>
                                                            <th className="px-4 py-3">Vehicles - {assetsToDisplay.length} Total</th>
                                                            <th className="px-4 py-3">Type</th>
                                                            <th className="px-4 py-3">VIN</th>
                                                            <th className="px-4 py-3 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {assetsToDisplay.map(asset => {
                                                            const id = asset!.id;
                                                            return (
                                                                <tr key={id} className="group hover:bg-slate-50 transition-colors">
                                                                    <td className="px-4 py-3">
                                                                        <div className="font-semibold text-slate-900">{asset?.unitNumber}</div>
                                                                        <div className="text-xs text-slate-500 uppercase">{asset?.year} {asset?.make} {asset?.model}</div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${asset?.assetCategory === 'CMV' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                                            {asset?.assetCategory}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">•••••{asset?.vin.slice(-4)}</td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        {!initialAssetId && !applyToAll && (
                                                                            <button onClick={() => toggleAsset(id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                                                                <X size={16} />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                }

                                // Empty State
                                return (
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                                        {applyToAll ? 'No eligible assets found.' : 'Select assets (or turn on Apply to All).'}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </WizardSection>
                    </div>
                </div>
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
