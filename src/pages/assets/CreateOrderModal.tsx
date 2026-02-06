import React, { useState, useEffect } from 'react';
import { Plus, X, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { US_STATES, CA_PROVINCES } from "@/pages/settings/MaintenancePage";
import { INITIAL_ASSETS } from "./assets.data";
import { INITIAL_SERVICE_TYPES } from "./maintenance.data";
import type { MaintenanceTask } from "./maintenance.data";

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

const Modal = ({ isOpen, onClose, title, children, footer }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-lg">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
                {footer && (
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
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

    // Add Vendor State
    const [isAddingVendor, setIsAddingVendor] = useState(false);
    const [newVendor, setNewVendor] = useState({
        companyName: "",
        phone: "",
        email: "",
        address: {
            street: "",
            unit: "",
            city: "",
            stateProvince: "",
            postalCode: "",
            country: "USA"
        }
    });

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setVendorId("");
            setCreateDate(new Date().toISOString().split('T')[0]);
            setIsAddingVendor(false);
            setNewVendor({
                companyName: "",
                phone: "",
                email: "",
                address: {
                    street: "",
                    unit: "",
                    city: "",
                    stateProvince: "",
                    postalCode: "",
                    country: "USA"
                }
            });
        }
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
        if (effectiveSelectedTasks.length === 0) {
            alert("Please select at least one task");
            return;
        }

        if (!vendorId && !isAddingVendor) {
            alert("Please select a vendor");
            return;
        }

        let finalVendorId = vendorId;

        if (isAddingVendor) {
            if (!newVendor.companyName) {
                alert("Please enter a vendor name");
                return;
            }
            const createdVendor = {
                id: `v_new_${Math.random().toString(36).substr(2, 9)}`,
                ...newVendor
            };
            onAddVendor(createdVendor);
            finalVendorId = createdVendor.id;
        }

        onCreate({
            taskIds: effectiveSelectedTasks.map(t => t.id),
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
        if (!newVendor.companyName) return;
        const createdVendor = {
            id: `v_new_${Math.random().toString(36).substr(2, 9)}`,
            ...newVendor
        };
        onAddVendor(createdVendor);
        setVendorId(createdVendor.id);
        setIsAddingVendor(false); // Switch back to select mode
        setNewVendor({
            companyName: "",
            phone: "",
            email: "",
            address: {
                street: "",
                unit: "",
                city: "",
                stateProvince: "",
                postalCode: "",
                country: "USA"
            }
        });
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={preSelectedAssetId ? "Log Maintenance" : "Create Task Order"}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleCreate}>Create Order</Button>
                </>
            }
        >
            <div className="space-y-6">
                {/* Tasks Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Tasks in Order</div>
                    <div className="space-y-3">
                        {uniqueAssetIds.length > 0 ? (
                            uniqueAssetIds.map(((assetId: any) => {
                                const asset = INITIAL_ASSETS.find(a => a.id === assetId);
                                const tasksForAsset = renderTasks.filter((t: any) => t.assetId === assetId);
                                const serviceNames = tasksForAsset.map((t: any) =>
                                    t.serviceTypeIds.map((sid: string) => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name).join(", ")
                                ).join(", ");

                                return (
                                    <div key={assetId} className="flex gap-3">
                                        <div className="h-8 w-8 bg-white border border-slate-200 rounded flex items-center justify-center text-sm font-bold text-slate-700 shrink-0">
                                            {tasksForAsset.length}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{asset?.unitNumber}</div>
                                            <div className="text-sm text-slate-500">{serviceNames}</div>
                                        </div>
                                    </div>
                                );
                            }))
                        ) : (
                            <div className="text-sm text-slate-500 italic">
                                {availableTasks && availableTasks.length > 0 ? "Select tasks below to create an order." : "No tasks selected."}
                            </div>
                        )}
                        
                        {/* Task Selection Area (if not pre-selected) */}
                        {(!selectedTasks || selectedTasks.length === 0) && availableTasks && availableTasks.length > 0 && (
                            <div className="mt-4 border-t border-slate-200 pt-3">
                                <Label className="mb-2 block">Select Available Tasks</Label>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {availableTasks.map(task => {
                                        const asset = INITIAL_ASSETS.find(a => a.id === task.assetId);
                                        const serviceNames = task.serviceTypeIds.map((sid: string) => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name).join(", ");
                                        const isSelected = localSelectedTaskIds.includes(task.id);
                                        
                                        return (
                                            <div key={task.id} 
                                                className={`flex items-center p-2 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                                onClick={() => {
                                                    setLocalSelectedTaskIds(prev => 
                                                        prev.includes(task.id) 
                                                            ? prev.filter(id => id !== task.id)
                                                            : [...prev, task.id]
                                                    );
                                                }}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                                    {isSelected && <Check size={12} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between">
                                                        <span className="font-medium text-sm text-slate-900">{asset?.unitNumber}</span>
                                                        <span className="text-xs text-slate-500">{new Date(task.dueRule.dueAtDate || task.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate" title={serviceNames}>{serviceNames}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {uniqueAssetIds.length === 0 && (
                            <div className="text-sm text-slate-500 italic">No tasks selected.</div>
                        )}
                    </div>
                </div>

                {/* Vendor Selection */}
                <div>
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
                            <div>
                                <Input
                                    placeholder="Company Name *"
                                    value={newVendor.companyName}
                                    onChange={(e: any) => setNewVendor({ ...newVendor, companyName: e.target.value })}
                                    className="bg-white mb-2"
                                />

                                {/* Address Section */}
                                <div className="space-y-2 mb-2">
                                    <Label className="text-xs text-slate-500">Address Details</Label>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="col-span-3">
                                            <Input
                                                placeholder="Street Address"
                                                value={newVendor.address.street}
                                                onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, street: e.target.value } })}
                                                className="bg-white"
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                placeholder="Unit/Apt"
                                                value={newVendor.address.unit}
                                                onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, unit: e.target.value } })}
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
                                            value={newVendor.address.stateProvince}
                                            onValueChange={(val) => setNewVendor({ ...newVendor, address: { ...newVendor.address, stateProvince: val } })}
                                        >
                                            <SelectTrigger className="bg-white h-9">
                                                <SelectValue placeholder="State/Prov" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="p-1">
                                                    <div className="text-xs font-semibold text-slate-500 px-2 py-1">USA</div>
                                                    {US_STATES.map(state => (
                                                        <SelectItem key={state} value={state}>{state}</SelectItem>
                                                    ))}
                                                    <div className="text-xs font-semibold text-slate-500 px-2 py-1 mt-1 pt-1 border-t border-slate-100">Canada</div>
                                                    {CA_PROVINCES.map(prov => (
                                                        <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                                                    ))}
                                                </div>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            placeholder="Zip/Postal"
                                            value={newVendor.address.postalCode}
                                            onChange={(e: any) => setNewVendor({ ...newVendor, address: { ...newVendor.address, postalCode: e.target.value } })}
                                            className="bg-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Input
                                        placeholder="Phone"
                                        value={newVendor.phone}
                                        onChange={(e: any) => setNewVendor({ ...newVendor, phone: e.target.value })}
                                        className="bg-white"
                                    />
                                    <Input
                                        placeholder="Email"
                                        value={newVendor.email}
                                        onChange={(e: any) => setNewVendor({ ...newVendor, email: e.target.value })}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button size="sm" onClick={handleSaveNewVendor} disabled={!newVendor.companyName} className="h-7 text-xs">
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
                                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.companyName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="mb-2 block">Create Date</Label>
                        <Input
                            type="date"
                            value={createDate}
                            onChange={(e: any) => setCreateDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="mb-2 block">Order Due Date</Label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e: any) => setDueDate(e.target.value)}
                        />
                    </div>
                </div>

                <div className="h-px bg-slate-100 my-2"></div>

                {/* Requirements */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
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
                            <div className="flex items-center space-x-2">
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
                    </div>

                    <div className="flex items-center justify-between">
                        <Label>Require Engine Hours?</Label>
                        <div className="flex items-center space-x-2">
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
                </div>

                {/* Remarks */}
                <div>
                    <Label className="mb-2 block">Remarks</Label>
                    <textarea
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 h-24 resize-none"
                        placeholder="Enter remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                    />
                </div>
            </div>
        </Modal>
    );
};
