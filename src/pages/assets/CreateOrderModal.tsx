import React, { useState, useEffect, useMemo } from 'react';
import { Plus, X, Check, Trash2, Search, Wrench, Truck, Store, Calendar, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INITIAL_ASSETS } from "./assets.data";
import { INITIAL_SERVICE_TYPES } from "./maintenance.data";
import type { MaintenanceTask } from "./maintenance.data";
import { VENDOR_CATEGORIES, US_STATES, CA_PROVINCES, ADDRESS_COUNTRIES } from "@/pages/inventory/inventory.data";

// --- Local UI Components (Copied for isolation/consistency) ---

const Button = ({ variant = "primary", size = "default", className = "", children, ...props }: any) => {
    const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
    const sizes: Record<string, string> = {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9"
    };
    const variants: Record<string, string> = {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
        outline: "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        destructive: "bg-red-500 text-white hover:bg-red-600",
    };
    return <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Input = React.forwardRef(({ className, disabled, ...props }: any, ref: any) => (
    <input ref={ref} disabled={disabled} className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${className}`} {...props} />
));
Input.displayName = "Input";

const Label = ({ children, className = "" }: any) => (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>
);

const Modal = ({ isOpen, onClose, title, subtitle, children, footer, size = "lg" }: any) => {
    if (!isOpen) return null;
    const widthClass = size === "xl" ? "max-w-3xl" : size === "2xl" ? "max-w-4xl" : "max-w-lg";
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-white rounded-xl shadow-lg w-full ${widthClass} max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200`}>
                <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
                    <div>
                        <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={20} /></button>
                </div>
                <div className="p-6 flex-1 overflow-y-auto bg-slate-50/40">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Create Order Modal Component ---

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (orderData: any) => void;
    selectedTasks?: MaintenanceTask[];
    availableTasks?: MaintenanceTask[];
    vendors: any[];
    onAddVendor: (vendor: any) => void;
    preSelectedAssetId?: string;
}

export const CreateOrderModal = ({ isOpen, onClose, onCreate, selectedTasks, availableTasks, vendors, onAddVendor, preSelectedAssetId }: CreateOrderModalProps) => {
    const [vendorId, setVendorId] = useState("");
    const [createDate, setCreateDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState("");
    const [requireOdometer, setRequireOdometer] = useState(false);
    const [odometerUnit, setOdometerUnit] = useState<"miles" | "km">("miles");
    const [requireEngineHours, setRequireEngineHours] = useState(false);
    const [remarks, setRemarks] = useState("");

    // Add Vendor State — fields mirror AddVendorPage (inventory vendor shape)
    const [isAddingVendor, setIsAddingVendor] = useState(false);
    const emptyVendor = {
        name: "",
        companyName: "",
        categoryId: VENDOR_CATEGORIES[0]?.id ?? "",
        email: "",
        phone: "",
        contactName: "",
        contactInfo: "",
        address: {
            country: "United States" as "United States" | "Canada",
            street: "",
            apt: "",
            city: "",
            state: "",
            zip: "",
        },
    };
    const [newVendor, setNewVendor] = useState(emptyVendor);

    // Direct (no-schedule) task entries — added inline when no existing tasks are selected
    type DirectTaskDraft = { id: string; assetId: string; serviceTypeIds: string[] };
    const [directTasks, setDirectTasks] = useState<DirectTaskDraft[]>([]);
    const [draftAssetId, setDraftAssetId] = useState("");
    const [draftServiceIds, setDraftServiceIds] = useState<string[]>([]);
    const [serviceQuery, setServiceQuery] = useState("");
    const [serviceGroup, setServiceGroup] = useState<string>("All");

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setVendorId("");
            setCreateDate(new Date().toISOString().split('T')[0]);
            setIsAddingVendor(false);
            setNewVendor(emptyVendor);
            setDirectTasks([]);
            setDraftAssetId("");
            setDraftServiceIds([]);
            setServiceQuery("");
            setServiceGroup("All");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const [localSelectedTaskIds, setLocalSelectedTaskIds] = useState<string[]>([]);

    useEffect(() => {
        if (selectedTasks && selectedTasks.length > 0) {
           setLocalSelectedTaskIds(selectedTasks.map(t => t.id));
        } else {
            setLocalSelectedTaskIds([]);
        }
    }, [selectedTasks, isOpen]);

    if (!isOpen) return null;

    // Use local tasks if props tasks are empty (selection mode), otherwise use props tasks
    const effectiveSelectedTasks = (selectedTasks && selectedTasks.length > 0) 
        ? selectedTasks 
        : (availableTasks || []).filter(t => localSelectedTaskIds.includes(t.id));

    // For display in the summary section
    const renderTasks = effectiveSelectedTasks;
    const uniqueAssetIds = [...new Set(renderTasks.map((t: any) => t.assetId))];

    const handleCreate = () => {
        if (effectiveSelectedTasks.length === 0 && directTasks.length === 0) {
            alert("Please select at least one task or add an asset/service manually");
            return;
        }

        if (!vendorId && !isAddingVendor) {
            alert("Please select a vendor");
            return;
        }

        let finalVendorId = vendorId;

        if (isAddingVendor) {
            if (!newVendor.name) {
                alert("Please enter a vendor name");
                return;
            }
            const createdVendor = buildInventoryVendor(newVendor);
            onAddVendor(createdVendor);
            finalVendorId = createdVendor.id;
        }

        onCreate({
            taskIds: effectiveSelectedTasks.map(t => t.id),
            directTasks: directTasks.map(({ assetId, serviceTypeIds }) => ({ assetId, serviceTypeIds })),
            vendorId: finalVendorId,
            createDate,
            dueDate,
            meta: {
                odometerRequired: requireOdometer,
                odometerUnit,
                engineHoursRequired: requireEngineHours
            },
            notes: remarks
        });
    };

    const handleSaveNewVendor = () => {
        if (!newVendor.name) return;
        const createdVendor = buildInventoryVendor(newVendor);
        onAddVendor(createdVendor);
        setVendorId(createdVendor.id);
        setIsAddingVendor(false);
        setNewVendor(emptyVendor);
    };

    const addDirectTask = () => {
        if (!draftAssetId || draftServiceIds.length === 0) return;
        setDirectTasks(prev => [
            ...prev,
            { id: `dt_${Math.random().toString(36).substr(2, 9)}`, assetId: draftAssetId, serviceTypeIds: draftServiceIds },
        ]);
        setDraftAssetId("");
        setDraftServiceIds([]);
    };

    const removeDirectTask = (id: string) => {
        setDirectTasks(prev => prev.filter(d => d.id !== id));
    };

    const toggleDraftService = (id: string) => {
        setDraftServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const draftAsset = INITIAL_ASSETS.find(a => a.id === draftAssetId);

    const filteredServices = useMemo(() => {
        const q = serviceQuery.trim().toLowerCase();
        return INITIAL_SERVICE_TYPES.filter(s => {
            // Filter by asset class if asset selected
            if (draftAsset) {
                const isCmv = draftAsset.assetCategory === "CMV";
                if (isCmv && s.category === "non_cmv_only") return false;
                if (!isCmv && s.category === "cmv_only") return false;
            }
            if (serviceGroup !== "All" && s.group !== serviceGroup) return false;
            if (q && !s.name.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [serviceQuery, serviceGroup, draftAsset]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="xl"
            title={preSelectedAssetId ? "Log Maintenance" : "Create Task Order"}
            subtitle="Bundle one or more maintenance items into a single work order for a vendor."
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCreate}>Create Order</Button>
                </>
            }
        >
            <div className="space-y-5">
                {/* Section 1: Tasks in Order */}
                <Section number={1} title="Tasks in Order" subtitle="Pick existing scheduled tasks or add an asset + maintenance type directly." icon={Wrench}>
                    {/* A) Selected / preselected tasks */}
                    {uniqueAssetIds.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {uniqueAssetIds.map(((assetId: any) => {
                                const asset = INITIAL_ASSETS.find(a => a.id === assetId);
                                const tasksForAsset = renderTasks.filter((t: any) => t.assetId === assetId);
                                const serviceNames = tasksForAsset.map((t: any) =>
                                    t.serviceTypeIds.map((sid: string) => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name).join(", ")
                                ).join(", ");

                                return (
                                    <div key={assetId} className="flex items-start gap-3 bg-white border border-slate-200 rounded-md p-3">
                                        <div className="h-9 w-9 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                                            {tasksForAsset.length}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900 text-sm truncate">{asset?.unitNumber}</div>
                                            <div className="text-xs text-slate-500 truncate">{serviceNames}</div>
                                        </div>
                                    </div>
                                );
                            }))}
                        </div>
                    )}

                    {/* B) Direct (no-schedule) entries */}
                    {directTasks.length > 0 && (
                        <div className="space-y-2 mb-4">
                            {directTasks.map(dt => {
                                const asset = INITIAL_ASSETS.find(a => a.id === dt.assetId);
                                const serviceNames = dt.serviceTypeIds.map(sid => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name).filter(Boolean).join(", ");
                                return (
                                    <div key={dt.id} className="flex items-start gap-3 bg-blue-50/40 border border-blue-100 rounded-md p-3">
                                        <div className="h-9 w-9 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center shrink-0">
                                            <Plus size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-slate-900 text-sm truncate">{asset?.unitNumber}</div>
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-blue-600 bg-white border border-blue-100 rounded px-1.5 py-0.5">Direct</span>
                                            </div>
                                            <div className="text-xs text-slate-500 truncate mt-0.5">{serviceNames}</div>
                                        </div>
                                        <button onClick={() => removeDirectTask(dt.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0" title="Remove">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* C) Selectable existing tasks (when none preselected) */}
                    {(!selectedTasks || selectedTasks.length === 0) && availableTasks && availableTasks.length > 0 && (
                        <div className="mb-4">
                            <Label className="mb-2 block text-xs uppercase tracking-wider text-slate-500 font-semibold">Available Scheduled Tasks</Label>
                            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 border border-slate-200 rounded-md bg-white p-2">
                                {availableTasks.map(task => {
                                    const asset = INITIAL_ASSETS.find(a => a.id === task.assetId);
                                    const serviceNames = task.serviceTypeIds.map((sid: string) => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name).join(", ");
                                    const isSelected = localSelectedTaskIds.includes(task.id);
                                    return (
                                        <div key={task.id}
                                            className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                            onClick={() => {
                                                setLocalSelectedTaskIds(prev =>
                                                    prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id]
                                                );
                                            }}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between gap-2">
                                                    <span className="font-medium text-sm text-slate-900 truncate">{asset?.unitNumber}</span>
                                                    <span className="text-xs text-slate-500 shrink-0">{new Date(task.dueRule?.dueAtDate || task.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 truncate" title={serviceNames}>{serviceNames}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Empty hint */}
                    {uniqueAssetIds.length === 0 && directTasks.length === 0 && (!availableTasks || availableTasks.length === 0) && (
                        <div className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mb-4">
                            No scheduled tasks yet — add an asset and maintenance type below to create this order without a schedule.
                        </div>
                    )}

                    {/* D) Inline picker — Add Asset & Maintenance Type */}
                    <div className="bg-white border border-slate-200 rounded-md p-4">
                        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">Add Asset & Maintenance Type</div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Asset */}
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">Asset <span className="text-red-500">*</span></Label>
                                <Select value={draftAssetId} onValueChange={setDraftAssetId}>
                                    <SelectTrigger className="bg-white h-9">
                                        <SelectValue placeholder="Select asset…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {INITIAL_ASSETS.map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.unitNumber} — {a.assetCategory}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {draftAsset && (
                                    <div className="mt-1.5 text-xs text-slate-500">
                                        {draftAsset.year} {draftAsset.make} {draftAsset.model} · VIN •••{draftAsset.vin.slice(-4)}
                                    </div>
                                )}
                            </div>

                            {/* Selected count */}
                            <div>
                                <Label className="mb-1.5 block text-xs text-slate-600">Selected Services</Label>
                                <div className="h-9 px-3 inline-flex items-center bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 w-full">
                                    <span className="font-semibold">{draftServiceIds.length}</span>
                                    <span className="ml-1 text-slate-500">selected</span>
                                </div>
                            </div>
                        </div>

                        {/* Maintenance Type picker */}
                        <div className="mt-4">
                            <Label className="mb-1.5 block text-xs text-slate-600">Maintenance Type <span className="text-red-500">*</span></Label>

                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    value={serviceQuery}
                                    onChange={(e) => setServiceQuery(e.target.value)}
                                    placeholder="Search services…"
                                    className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                            </div>

                            <div className="flex border-b border-slate-200 mb-2 overflow-x-auto">
                                {['All', 'Engine', 'Tires & Brakes', 'Inspections', 'General'].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setServiceGroup(g)}
                                        className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${serviceGroup === g ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>

                            <div className="border border-slate-200 bg-white rounded-md max-h-48 overflow-y-auto p-1.5 space-y-1">
                                {filteredServices.length > 0 ? filteredServices.map(s => {
                                    const checked = draftServiceIds.includes(s.id);
                                    return (
                                        <div
                                            key={s.id}
                                            onClick={() => toggleDraftService(s.id)}
                                            className={`flex items-center px-2.5 py-2 rounded cursor-pointer text-sm border ${checked ? 'bg-blue-50 text-blue-900 border-blue-200' : 'hover:bg-slate-50 text-slate-700 border-transparent'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center mr-2.5 shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                {checked && <Check size={11} className="text-white" strokeWidth={3} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium truncate">{s.name}</div>
                                                <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.group}</div>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="py-6 text-center text-xs text-slate-400">No services match this filter.</div>
                                )}
                            </div>

                            <div className="mt-3 flex justify-end">
                                <Button
                                    size="sm"
                                    onClick={addDirectTask}
                                    disabled={!draftAssetId || draftServiceIds.length === 0}
                                    className="gap-1.5"
                                >
                                    <Plus size={14} /> Add to Order
                                </Button>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Section 2: Vendor */}
                <Section number={2} title="Vendor" subtitle="Pick from your saved vendors or add a new one." icon={Store}>
                    <div className="flex items-center justify-between mb-2">
                        <Label>Assign Vendor <span className="text-red-500">*</span></Label>
                        {!isAddingVendor && (
                            <button
                                onClick={() => setIsAddingVendor(true)}
                                className="text-xs text-blue-600 font-medium hover:text-blue-700 hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> Add New
                            </button>
                        )}
                    </div>

                    {isAddingVendor ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-slate-700 uppercase">New Vendor Details</span>
                                <button onClick={() => setIsAddingVendor(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                            </div>

                            {/* Identity */}
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Vendor Name *"
                                    value={newVendor.name}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, name: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Company Name"
                                    value={newVendor.companyName}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, companyName: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            {/* Category */}
                            <Select
                                value={newVendor.categoryId}
                                onValueChange={(val) => setNewVendor({ ...newVendor, categoryId: val })}
                            >
                                <SelectTrigger className="bg-white h-9">
                                    <SelectValue placeholder="Vendor Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {VENDOR_CATEGORIES.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Contact */}
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Email"
                                    value={newVendor.email}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, email: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Phone"
                                    value={newVendor.phone}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, phone: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Contact Name"
                                    value={newVendor.contactName}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, contactName: e.target.value })}
                                    className="bg-white"
                                />
                                <Input
                                    placeholder="Contact Info"
                                    value={newVendor.contactInfo}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, contactInfo: e.target.value })}
                                    className="bg-white"
                                />
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-500">Address</Label>
                                <Select
                                    value={newVendor.address.country}
                                    onValueChange={(val) => setNewVendor({ ...newVendor, address: { ...newVendor.address, country: val as any, state: "" } })}
                                >
                                    <SelectTrigger className="bg-white h-9">
                                        <SelectValue placeholder="Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ADDRESS_COUNTRIES.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-3">
                                        <Input
                                            placeholder="Street"
                                            value={newVendor.address.street}
                                            onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, street: e.target.value } })}
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            placeholder="Apt"
                                            value={newVendor.address.apt}
                                            onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, apt: e.target.value } })}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Input
                                        placeholder="City"
                                        value={newVendor.address.city}
                                        onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, city: e.target.value } })}
                                        className="bg-white"
                                    />
                                    <Select
                                        value={newVendor.address.state}
                                        onValueChange={(val) => setNewVendor({ ...newVendor, address: { ...newVendor.address, state: val } })}
                                    >
                                        <SelectTrigger className="bg-white h-9">
                                            <SelectValue placeholder={newVendor.address.country === "Canada" ? "Province" : "State"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(newVendor.address.country === "Canada" ? CA_PROVINCES : US_STATES).map(s => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        placeholder={newVendor.address.country === "Canada" ? "Postal" : "ZIP"}
                                        value={newVendor.address.zip}
                                        onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, zip: e.target.value } })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleSaveNewVendor} disabled={!newVendor.name} className="h-7 text-xs">
                                    Save Vendor
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Select value={vendorId} onValueChange={setVendorId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Vendor..." />
                            </SelectTrigger>
                            <SelectContent>
                                {vendors.map((vendor: any) => (
                                    <SelectItem key={vendor.id} value={vendor.id}>
                                        {vendor.name || vendor.companyName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </Section>

                {/* Section 3: Schedule */}
                <Section number={3} title="Schedule" subtitle="When to start the order and when it's due." icon={Calendar}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-1.5 block text-xs text-slate-600">Create Date</Label>
                            <Input
                                type="date"
                                value={createDate}
                                onChange={(e: any) => setCreateDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="mb-1.5 block text-xs text-slate-600">Order Due Date</Label>
                            <Input
                                type="date"
                                value={dueDate}
                                onChange={(e: any) => setDueDate(e.target.value)}
                            />
                        </div>
                    </div>
                </Section>

                {/* Section 4: Requirements */}
                <Section number={4} title="Completion Requirements" subtitle="What the vendor must record when closing the order." icon={Truck}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md px-3 py-2.5">
                            <Label>Require Odometer Reading?</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex bg-slate-100 rounded-md p-0.5">
                                    <button
                                        onClick={() => setOdometerUnit('miles')}
                                        className={`px-2 py-0.5 text-xs rounded-sm transition-all ${odometerUnit === 'miles' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                    >
                                        Miles
                                    </button>
                                    <button
                                        onClick={() => setOdometerUnit('km')}
                                        className={`px-2 py-0.5 text-xs rounded-sm transition-all ${odometerUnit === 'km' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                                    >
                                        KM
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={requireOdometer}
                                    onClick={() => setRequireOdometer(!requireOdometer)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${requireOdometer ? 'bg-blue-600' : 'bg-slate-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireOdometer ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-md px-3 py-2.5">
                            <Label>Require Engine Hours?</Label>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={requireEngineHours}
                                onClick={() => setRequireEngineHours(!requireEngineHours)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${requireEngineHours ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireEngineHours ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </Section>

                {/* Section 5: Remarks */}
                <Section number={5} title="Remarks" subtitle="Notes for the vendor (optional)." icon={FileText}>
                    <textarea
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 h-24 resize-none"
                        placeholder="e.g. Please call the driver before pickup..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </Section>
            </div>
        </Modal>
    );
};

// Numbered card section — same visual rhythm as CreateScheduleForm.
function Section({
    number, title, subtitle, icon: Icon, children,
}: { number: number; title: string; subtitle?: string; icon?: React.ElementType; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {number}
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
                        {Icon && <Icon size={14} className="text-slate-400" />}
                        {title}
                    </h3>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="pl-10">{children}</div>
        </section>
    );
}

// Build an inventory-shaped Vendor record from the inline add-vendor form.
function buildInventoryVendor(v: {
    name: string; companyName: string; categoryId: string; email: string; phone: string;
    contactName: string; contactInfo: string;
    address: { country: "United States" | "Canada"; street: string; apt: string; city: string; state: string; zip: string };
}) {
    return {
        id: `v_new_${Math.random().toString(36).substr(2, 9)}`,
        name: v.name,
        companyName: v.companyName || undefined,
        categoryId: v.categoryId,
        email: v.email || undefined,
        phone: v.phone || undefined,
        contactName: v.contactName || undefined,
        contactInfo: v.contactInfo || undefined,
        address: {
            country: v.address.country,
            street: v.address.street || undefined,
            apt: v.address.apt || undefined,
            city: v.address.city || undefined,
            state: v.address.state || undefined,
            zip: v.address.zip || undefined,
        },
        status: "Active" as const,
    };
}
