import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Search, Filter, AlertCircle, XCircle,
    Calendar, LayoutGrid, ClipboardList, Wrench, MoreHorizontal,
    Briefcase, SkipForward, Trash2, List, Truck, Edit, CheckSquare, Lock,
    X, Check, FileText, Eye
} from "lucide-react";
import { CreateScheduleForm } from "./CreateScheduleForm";
import { INITIAL_VENDORS } from "@/data/vendors.data";

import { 
    INITIAL_SERVICE_TYPES, INITIAL_TASKS, INITIAL_ORDERS
} from "./maintenance.data";
import type { 
    MaintenanceTask, TaskOrder, OrderCompletionEvent, 
    MaintenanceTaskStatus, AssetCostBreakdown 
} from "./maintenance.data";
import { CreateOrderModal } from "./CreateOrderModal";

// --- Types & Interfaces ---



type Asset = {
    id: string;
    unitNumber: string;
    vin: string;
    assetClass: "cmv" | "non_cmv";
    locationId: string;
    currentOdometer: number;
    currentEngineHours: number;
    drivers?: { name: string; initials: string; color: string }[];
    location: string;
};

const INITIAL_ASSETS: Asset[] = [
    {
        id: "veh_001", unitNumber: "TR-1049", vin: "1M8GDM9A6HP05X12", assetClass: "cmv", locationId: "loc_1", currentOdometer: 45231, currentEngineHours: 8120,
        drivers: [{ name: 'John Smith', initials: 'JS', color: 'bg-blue-100 text-blue-600' }, { name: 'Sarah Miller', initials: 'SM', color: 'bg-emerald-100 text-emerald-600' }],
        location: "Dallas Main Terminal"
    },
    {
        id: "veh_002", unitNumber: "TL-550", vin: "2C3KA53G76H123456", assetClass: "non_cmv", locationId: "loc_2", currentOdometer: 89210, currentEngineHours: 2100,
        drivers: [],
        location: "Toronto Yard"
    },
    {
        id: "veh_003", unitNumber: "TR-2201", vin: "3HGCM82633B009988", assetClass: "cmv", locationId: "loc_1", currentOdometer: 152400, currentEngineHours: 12500,
        drivers: [{ name: 'Mike Ross', initials: 'MR', color: 'bg-orange-100 text-orange-600' }],
        location: "Dallas Main Terminal"
    },
    {
        id: "veh_004", unitNumber: "TL-889", vin: "4J8GDM9A6HP05X12", assetClass: "non_cmv", locationId: "loc_3", currentOdometer: 12000, currentEngineHours: 500,
        drivers: [],
        location: "Vancouver Depot"
    },
    {
        id: "veh_005", unitNumber: "TR-3055", vin: "5K8GDM9A6HP05X12", assetClass: "cmv", locationId: "loc_2", currentOdometer: 298000, currentEngineHours: 18000,
        drivers: [{ name: 'Harvey Specter', initials: 'HS', color: 'bg-slate-800 text-white' }],
        location: "Toronto Yard"
    },
    {
        id: "veh_006", unitNumber: "TL-REEF-01", vin: "6L8GDM9A6HP05X12", assetClass: "non_cmv", locationId: "loc_1", currentOdometer: 65000, currentEngineHours: 4200,
        drivers: [],
        location: "Dallas Main Terminal"
    }
];

// Vendor data imported from global source



// --- Initial Work Orders ---



// --- UI Components ---

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



const Badge = ({ variant = "default", children, className = "" }: any) => {
    const styles: Record<string, string> = {
        default: "bg-slate-100 text-slate-900",
        upcoming: "bg-blue-50 text-blue-700 border-blue-200",
        due: "bg-amber-50 text-amber-700 border-amber-200",
        overdue: "bg-red-50 text-red-700 border-red-200",
        in_progress: "bg-purple-50 text-purple-700 border-purple-200",
        completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
        cancelled: "bg-slate-100 text-slate-500 border-slate-200",
        truck: "bg-indigo-50 text-indigo-700 border-indigo-200",
        trailer: "bg-orange-50 text-orange-700 border-orange-200",
        open: "bg-blue-50 text-blue-700 border-blue-200",
        pending: "bg-blue-50 text-blue-700 border-blue-200",
        partially_completed: "bg-purple-50 text-purple-700 border-purple-200",
    };
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${styles[variant]} ${className}`}>{children}</span>;
};

const Input = React.forwardRef(({ className, disabled, ...props }: any, ref: any) => (
    <input ref={ref} disabled={disabled} className={`flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${className}`} {...props} />
));

const Label = ({ children, className = "" }: any) => (
    <label className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</label>
);

const Checkbox = ({ checked, onChange }: any) => (
    <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
        className={`h-4 w-4 shrink-0 rounded border ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'} focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600 flex items-center justify-center transition-colors`}
    >
        {checked && <Check size={12} strokeWidth={3} />}
    </button>
);





// --- Modal Component ---
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

// --- Action Menu Component ---
const ActionMenu = ({ onOpenDetails, onComplete, onCancelTask, onEdit, status, isLocked }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isActionable = status !== 'completed' && status !== 'cancelled';

    return (
        <div className="relative" ref={menuRef}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
                <MoreHorizontal size={16} />
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-8 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    {isActionable && (
                        <div className="border-b border-slate-100 pb-1 mb-1">
                            {!isLocked && (
                                <button
                                    onClick={() => { onComplete(); setIsOpen(false); }}
                                    className="w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                                >
                                    <Briefcase size={14} /> Create Order
                                </button>
                            )}

                            <button
                                onClick={() => { if (!isLocked) { onEdit(); setIsOpen(false); } }}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}
                                title={isLocked ? "Cannot edit task attached to an active order" : ""}
                            >
                                <Edit size={14} /> Edit Task
                                {isLocked && <Lock size={10} className="ml-auto" />}
                            </button>

                            <button
                                onClick={() => { if (!isLocked) { onCancelTask(); setIsOpen(false); } }}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50'}`}
                                title={isLocked ? "Cannot cancel task attached to an active order" : ""}
                            >
                                <XCircle size={14} /> Cancel Task
                                {isLocked && <Lock size={10} className="ml-auto" />}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => { onOpenDetails(); setIsOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <FileText size={14} /> View Task Details
                    </button>
                </div>
            )}
        </div>
    );
};

// --- Order Action Menu Component ---
const OrderActionMenu = ({ onView, onEdit, onForceComplete, onCancel }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(!isOpen)}>
                <MoreHorizontal size={16} />
            </Button>
            {isOpen && (
                <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={() => { onView(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Eye size={14} /> View Order
                    </button>
                    <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Edit size={14} /> Edit Order
                    </button>
                    <button onClick={() => { onForceComplete(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2">
                        <CheckSquare size={14} /> Complete Tasks
                    </button>
                    <div className="border-t border-slate-100 mt-1 pt-1">
                        <button onClick={() => { onCancel(); setIsOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <XCircle size={14} /> Cancel Tasks/Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Cancel Task Modal ---
const CancelTaskModal = ({ isOpen, onClose, onConfirm }: any) => {
    const [reason, setReason] = useState("");
    if (!isOpen) return null;
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Cancel Maintenance Task"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>Back</Button>
                    <Button
                        variant="destructive"
                        disabled={!reason.trim()}
                        onClick={() => onConfirm(reason)}
                    >
                        Cancel Task
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800 flex gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    Cancelling this task will mark it as cancelled in the history. The schedule will continue to the next interval.
                </div>
                <div>
                    <Label className="mb-2 block">Reason for Cancellation <span className="text-red-500">*</span></Label>
                    <textarea
                        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 h-24 resize-none"
                        placeholder="e.g. Done externally, asset sold, error in schedule..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                    />
                </div>
            </div>
        </Modal>
    );
};



// --- Complete Order Modal ---
const CompleteOrderModal = ({ isOpen, onClose, onComplete, order, tasks }: any) => {
    const [step, setStep] = useState(1);
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

    // Step 2 Form State
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
    const [currency, setCurrency] = useState<"CAD" | "USD">("CAD");
    const [breakdowns, setBreakdowns] = useState<Record<string, {
        finalOdometer: string;
        finalEngineHours: string;
        parts: string;
        labour: string;
        tax: string;
    }>>({});

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedAssetIds([]);
            setInvoiceNumber("");
            setInvoiceDate(new Date().toISOString().split('T')[0]);
            setCurrency("CAD");
            setBreakdowns({});
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    // Get tasks associated with this order
    const orderTasks = tasks.filter((t: any) => order.taskIds.includes(t.id));

    // Group tasks by asset
    const tasksByAsset: Record<string, MaintenanceTask[]> = {};
    orderTasks.forEach((t: any) => {
        if (!tasksByAsset[t.assetId]) tasksByAsset[t.assetId] = [];
        tasksByAsset[t.assetId].push(t);
    });

    const assetIds = Object.keys(tasksByAsset);

    // Initialize breakdowns for selected assets when moving to step 2
    const handleNext = () => {
        const initialBreakdowns = { ...breakdowns };
        selectedAssetIds.forEach(id => {
            if (!initialBreakdowns[id]) {
                initialBreakdowns[id] = {
                    finalOdometer: "",
                    finalEngineHours: "",
                    parts: "0.00",
                    labour: "0.00",
                    tax: "0.00"
                };
            }
        });
        setBreakdowns(initialBreakdowns);
        setStep(2);
    };

    const handleConfirm = () => {
        // Validation
        if (!invoiceDate) {
            alert("Invoice Date is required");
            return;
        }

        const formattedBreakdowns: AssetCostBreakdown[] = [];

        for (const assetId of selectedAssetIds) {
            const data = breakdowns[assetId];

            const isOdoRequired = order.meta?.odometerRequired;
            const isHoursRequired = order.meta?.engineHoursRequired;

            if (isOdoRequired && !data.finalOdometer) {
                alert(`Odometer reading is required for asset ID: ${assetId} (Unit: ${INITIAL_ASSETS.find(a => a.id === assetId)?.unitNumber})`);
                return;
            }
            if (isHoursRequired && !data.finalEngineHours) {
                alert(`Engine Hours are required for asset ID: ${assetId} (Unit: ${INITIAL_ASSETS.find(a => a.id === assetId)?.unitNumber})`);
                return;
            }

            formattedBreakdowns.push({
                assetId,
                finalOdometer: data.finalOdometer ? parseFloat(data.finalOdometer) : undefined,
                finalEngineHours: data.finalEngineHours ? parseFloat(data.finalEngineHours) : undefined,
                costs: {
                    partsAndSupplies: parseFloat(data.parts) || 0,
                    labour: parseFloat(data.labour) || 0,
                    tax: parseFloat(data.tax) || 0,
                    totalPaid: (parseFloat(data.parts) || 0) + (parseFloat(data.labour) || 0) + (parseFloat(data.tax) || 0)
                }
            });
        }

        const completionEvent: OrderCompletionEvent = {
            id: `comp_${Math.random().toString(36).substr(2, 9)}`,
            completedAt: new Date().toISOString(),
            invoiceNumber,
            invoiceDate,
            currency,
            taskIds: selectedAssetIds.flatMap(aid => tasksByAsset[aid].map(t => t.id)),
            assetBreakdowns: formattedBreakdowns
        };

        onComplete(completionEvent);
    };

    const toggleAsset = (id: string) => {
        if (selectedAssetIds.includes(id)) {
            setSelectedAssetIds(selectedAssetIds.filter(aid => aid !== id));
        } else {
            setSelectedAssetIds([...selectedAssetIds, id]);
        }
    };

    const updateBreakdown = (assetId: string, field: string, value: string) => {
        setBreakdowns(prev => ({
            ...prev,
            [assetId]: { ...prev[assetId], [field]: value }
        }));
    };

    const calculateTotal = (b: any) => {
        return ((parseFloat(b.parts) || 0) + (parseFloat(b.labour) || 0) + (parseFloat(b.tax) || 0)).toFixed(2);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 1 ? "Complete Maintenance Tasks" : "Enter Completion Details"}
            footer={
                <>
                    {step === 1 ? (
                        <>
                            <Button variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleNext} disabled={selectedAssetIds.length === 0}>
                                Next: Enter Costs
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={handleConfirm}>Confirm Completion</Button>
                        </>
                    )}
                </>
            }
        >
            {step === 1 ? (
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800 flex gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                            <span className="font-semibold block mb-1">Select assets to complete.</span>
                            You can complete specific assets now and leave others for a later invoice. The order will remain open until all assets are completed.
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                            Pending Assets ({assetIds.length})
                        </div>
                        <div className="divide-y divide-slate-100">
                            {assetIds.map(assetId => {
                                const asset = INITIAL_ASSETS.find(a => a.id === assetId);
                                const assetTasks = tasksByAsset[assetId];
                                const serviceNames = assetTasks.map(t =>
                                    t.serviceTypeIds.map((sid: string) => INITIAL_SERVICE_TYPES.find(s => s.id === sid)?.name).join(", ")
                                ).join(", ");
                                const isSelected = selectedAssetIds.includes(assetId);

                                return (
                                    <div
                                        key={assetId}
                                        className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleAsset(assetId)}
                                    >
                                        <Checkbox checked={isSelected} onChange={() => toggleAsset(assetId)} />
                                        <div>
                                            <div className="font-bold text-slate-900">{asset?.unitNumber}</div>
                                            <div className="text-sm text-slate-500">{assetTasks.length} task{assetTasks.length > 1 ? 's' : ''}: {serviceNames}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-1 block">Invoice #</Label>
                            <Input
                                placeholder="e.g. INV-2026-001"
                                value={invoiceNumber}
                                onChange={(e: any) => setInvoiceNumber(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label className="mb-1 block">Date <span className="text-red-500">*</span></Label>
                            <Input
                                type="date"
                                value={invoiceDate}
                                onChange={(e: any) => setInvoiceDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <Label className="mb-2 block">Currency</Label>
                        <div className="flex bg-slate-100 rounded-md p-1 inline-flex">
                            <button
                                onClick={() => setCurrency('CAD')}
                                className={`px-4 py-1 text-sm rounded-sm transition-all font-medium ${currency === 'CAD' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                            >
                                CAD
                            </button>
                            <button
                                onClick={() => setCurrency('USD')}
                                className={`px-4 py-1 text-sm rounded-sm transition-all font-medium ${currency === 'USD' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
                            >
                                USD
                            </button>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 my-2"></div>

                    {/* Asset Breakdowns */}
                    <div className="space-y-4">
                        {selectedAssetIds.map(assetId => {
                            const asset = INITIAL_ASSETS.find(a => a.id === assetId);
                            const breakdown = breakdowns[assetId] || { finalOdometer: "", finalEngineHours: "", parts: "0.00", labour: "0.00", tax: "0.00" };

                            return (
                                <div key={assetId} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <Truck size={16} className="text-slate-500" />
                                            <span className="font-bold text-slate-900">{asset?.unitNumber}</span>
                                        </div>
                                        <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                            Cost Breakdown
                                        </Button>
                                    </div>

                                    {/* Meter Readings */}
                                    {/* Only show if asset type matches? Generally show both if requested by meta, otherwise optional */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <Label className="mb-1 block text-xs uppercase text-slate-500 font-semibold">
                                                Final Odometer
                                                {order.meta?.odometerRequired && <span className="text-red-500 ml-1">*</span>}
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    value={breakdown.finalOdometer}
                                                    onChange={(e: any) => updateBreakdown(assetId, 'finalOdometer', e.target.value)}
                                                    placeholder="Optional"
                                                    className={order.meta?.odometerRequired && !breakdown.finalOdometer ? "border-red-300 focus-visible:ring-red-500" : ""}
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400">miles</span>
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="mb-1 block text-xs uppercase text-slate-500 font-semibold">
                                                Final Engine Hrs
                                                {order.meta?.engineHoursRequired && <span className="text-red-500 ml-1">*</span>}
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    value={breakdown.finalEngineHours}
                                                    onChange={(e: any) => updateBreakdown(assetId, 'finalEngineHours', e.target.value)}
                                                    placeholder="Optional"
                                                    className={order.meta?.engineHoursRequired && !breakdown.finalEngineHours ? "border-red-300 focus-visible:ring-red-500" : ""}
                                                />
                                                <span className="absolute right-3 top-2 text-xs text-slate-400">HRS</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Costs */}
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label className="mb-1 block text-sm">Parts & Supplies</Label>
                                                <Input
                                                    type="number"
                                                    value={breakdown.parts}
                                                    onChange={(e: any) => updateBreakdown(assetId, 'parts', e.target.value)}
                                                    className="text-right"
                                                />
                                            </div>
                                            <div>
                                                <Label className="mb-1 block text-sm">Labour</Label>
                                                <Input
                                                    type="number"
                                                    value={breakdown.labour}
                                                    onChange={(e: any) => updateBreakdown(assetId, 'labour', e.target.value)}
                                                    className="text-right"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="font-bold">${((parseFloat(breakdown.parts) || 0) + (parseFloat(breakdown.labour) || 0)).toFixed(2)}</span>
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                            <span className="text-sm font-medium">Tax</span>
                                            <Input
                                                type="number"
                                                value={breakdown.tax}
                                                onChange={(e: any) => updateBreakdown(assetId, 'tax', e.target.value)}
                                                className="w-24 text-right h-8"
                                            />
                                        </div>

                                        <div className="flex justify-between items-center bg-blue-50 p-2 rounded border border-blue-100">
                                            <span className="font-bold text-slate-900">Total Payable</span>
                                            <span className="font-bold text-blue-700 text-lg">
                                                {currency} ${calculateTotal(breakdown)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </Modal>
    );
};

// --- Main Page Component ---
export function AssetMaintenancePage() {
    const [activeTab, setActiveTab] = useState<"tasks" | "orders">("tasks");
    const [tasks, setTasks] = useState<MaintenanceTask[]>(INITIAL_TASKS);
    const [orders, setOrders] = useState<TaskOrder[]>(INITIAL_ORDERS);
    // Manage vendors list state
    const [vendors, setVendors] = useState<any[]>(INITIAL_VENDORS);
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState("All");
    const [assetFilter, setAssetFilter] = useState<"all" | "cmv" | "non_cmv">("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Modal States
    const [isSkipModalOpen, setIsSkipModalOpen] = useState(false);
    const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
    // COMPLETE ORDER MODAL STATE
    const [isCompleteOrderModalOpen, setIsCompleteOrderModalOpen] = useState(false);
    const [orderToComplete, setOrderToComplete] = useState<TaskOrder | null>(null);

    const [taskToSkip, setTaskToSkip] = useState<MaintenanceTask | null>(null);
    const [viewTask, setViewTask] = useState<MaintenanceTask | null>(null);
    const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
    


    const getAsset = (id: string) => INITIAL_ASSETS.find((a) => a.id === id);
    const getServiceNames = (ids: string[]) => ids.map(id => INITIAL_SERVICE_TYPES.find(s => s.id === id)?.name).join(", ");
    const getOrderForTask = (taskId: string) => orders.find((o) => o.taskIds.includes(taskId));

    // Handlers
    const handleOpenCompleteOrder = (order: TaskOrder) => {
        setOrderToComplete(order);
        setIsCompleteOrderModalOpen(true);
    };

    const handleCompleteOrder = (completionEvent: OrderCompletionEvent) => {
        if (!orderToComplete) return;

        // 1. Update completed tasks
        const updatedTasks = tasks.map(t => {
            if (completionEvent.taskIds.includes(t.id)) {
                return { ...t, status: 'completed' as MaintenanceTaskStatus };
            }
            return t;
        });
        setTasks(updatedTasks);

        // 2. Update Order
        const updatedOrders = orders.map(o => {
            if (o.id === orderToComplete.id) {
                const updatedCompletions = [...o.completions, completionEvent];

                // Check if all tasks in order are now completed
                const allOrderTaskIds = o.taskIds;
                const completedTaskIdsInOrder = updatedTasks
                    .filter(t => allOrderTaskIds.includes(t.id) && t.status === 'completed')
                    .map(t => t.id);

                const isFullyCompleted = allOrderTaskIds.every(id => completedTaskIdsInOrder.includes(id));

                return {
                    ...o,
                    completions: updatedCompletions,
                    status: isFullyCompleted ? 'completed' : 'open' as any
                };
            }
            return o;
        });
        setOrders(updatedOrders);

        setIsCompleteOrderModalOpen(false);
        setOrderToComplete(null);
    };

    // Filter tasks
    const filteredTasks = useMemo(() => {
        let result = tasks;

        // Asset class filter
        if (assetFilter !== 'all') {
            result = result.filter((t) => {
                const asset = getAsset(t.assetId);
                return asset?.assetClass === assetFilter;
            });
        }

        // Status filter
        if (statusFilter !== "All") {
            result = result.filter((t) => t.status === statusFilter.toLowerCase());
        }

        // Search filter
        if (searchQuery) {
            result = result.filter((t) => {
                const asset = getAsset(t.assetId);
                const serviceNames = getServiceNames(t.serviceTypeIds);
                return (
                    asset?.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    serviceNames.toLowerCase().includes(searchQuery.toLowerCase())
                );
            });
        }

        return result;
    }, [tasks, assetFilter, statusFilter, searchQuery]);

    // Grouping Logic for Tasks (REMOVED: User requested flat list view)
    // We keep the logic for batchId in creation, but render individually here.
    
    const getCount = (status: string) => {
        const base = assetFilter === 'all' ? tasks : tasks.filter((t) => {
            const asset = getAsset(t.assetId);
            return asset?.assetClass === assetFilter;
        });
        if (status === "All") return base.length;
        if (status === "Due") return base.filter(t => t.status === 'due').length;
        if (status === "Overdue") return base.filter(t => t.status === 'overdue').length;
        if (status === "Upcoming") return base.filter(t => t.status === 'upcoming').length;
        return base.filter((t) => t.status === status.toLowerCase()).length;
    };

    const isAllSelected = filteredTasks.length > 0 && filteredTasks.every((t) => selectedTaskIds.includes(t.id));

    const toggleAll = () => {
        if (isAllSelected) {
            const visibleIds = filteredTasks.map((t) => t.id);
            setSelectedTaskIds(selectedTaskIds.filter((id) => !visibleIds.includes(id)));
        } else {
            const visibleIds = filteredTasks.map((t) => t.id);
            const newSelected = [...new Set([...selectedTaskIds, ...visibleIds])];
            setSelectedTaskIds(newSelected);
        }
    };

    const handleCreateOrder = (orderData: any) => {
        const batchId = `batch_${Math.random().toString(36).substr(2, 9)}`;
        const newOrders: TaskOrder[] = [];
        
        // Use taskIds from orderData if present (new modal), otherwise fallback to selectedTaskIds (legacy/bulk)
        const taskIdsToProcess = orderData.taskIds && orderData.taskIds.length > 0 
            ? orderData.taskIds 
            : selectedTaskIds;
        
        // Group selected tasks by Asset ID to create individual orders per asset
        const tasksByAsset: Record<string, string[]> = {};
        taskIdsToProcess.forEach((taskId: string) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                if (!tasksByAsset[task.assetId]) tasksByAsset[task.assetId] = [];
                tasksByAsset[task.assetId].push(taskId);
            }
        });

        Object.values(tasksByAsset).forEach((assetTaskIds) => {
            const newOrder: TaskOrder = {
                id: `wo_${Math.random().toString(36).substr(2, 9)}`,
                taskIds: assetTaskIds,
                vendorId: orderData.vendorId,
                status: "open",
                createdAt: orderData.createDate,
                dueDate: orderData.dueDate,
                notes: orderData.notes,
                meta: orderData.meta,
                completions: [],
                batchId: batchId // Link via batchId
            };
            newOrders.push(newOrder);
        });

        setOrders([...newOrders, ...orders]);
        
        // Update task statuses
        setTasks(tasks.map(t => taskIdsToProcess.includes(t.id) ? { ...t, status: "in_progress" as MaintenanceTaskStatus } : t));
        
        setSelectedTaskIds([]);
        setIsCreateOrderModalOpen(false);
        setActiveTab('orders');
    };

    const openCreateOrderModal = () => {
        // if (selectedTaskIds.length === 0) return; // Allow opening independent of selection
        setIsCreateOrderModalOpen(true);
    };

    const handleAddVendor = (newVendor: any) => {
        setVendors((prev) => [...prev, newVendor]);
    };

    // Calculate derived status for orders
    const getOrderStatus = (order: TaskOrder, orderTasks: MaintenanceTask[]) => {
        if (order.status === 'cancelled') return 'cancelled';
        if (order.status === 'completed') return 'completed';

        const completedCount = orderTasks.filter(t => t.status === 'completed').length;
        if (completedCount === 0) return 'pending';
        return 'partially_completed';
    };

    // Work Order Pagination
    const [ordersPage, setOrdersPage] = useState(1);
    const ORDERS_PER_PAGE = 10;

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            const orderTasks = tasks.filter(t => order.taskIds.includes(t.id));
            const status = getOrderStatus(order, orderTasks);

            if (statusFilter === 'All') return true;
            if (statusFilter === 'Pending') return status === 'pending';
            if (statusFilter === 'Partially Completed') return status === 'partially_completed';
            if (statusFilter === 'Completed') return status === 'completed';
            if (statusFilter === 'Cancelled') return status === 'cancelled';
            return true;
        });
    }, [orders, tasks, statusFilter]);



    const paginatedOrders = filteredOrders.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE);
    const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

    const toggleTask = (id: string) => {
        if (selectedTaskIds.includes(id)) {
            setSelectedTaskIds(selectedTaskIds.filter((tid) => tid !== id));
        } else {
            setSelectedTaskIds([...selectedTaskIds, id]);
        }
    };

    const handleSaveSchedule = (schedule: any) => {
        // console.log("Saving Schedule:", schedule);
        const newTasks: MaintenanceTask[] = [];
        const isDateBased = schedule.frequency.unit === 'days';

        schedule.assignment.entityIds.forEach((assetId: string) => {
            const details = schedule.assetDetails?.[assetId] || {};
            
            // Determine due rule parameters based on specific asset details or defaults
            const dueAtOdometer = !isDateBased && details.nextDueValue ? Number(details.nextDueValue) : undefined;
            const dueAtDate = isDateBased && details.nextDueValue ? String(details.nextDueValue) : undefined;
            const dueAtEngineHours = schedule.frequency.unit === 'engine_hours' && details.nextDueValue ? Number(details.nextDueValue) : undefined;

            const newTask: MaintenanceTask = {
                id: `task_${Math.random().toString(36).substr(2, 9)}`,
                assetId: assetId,
                scheduleId: schedule.id, // Serves as the grouping ID for tasks
                serviceTypeIds: schedule.serviceTypeIds,
                status: 'upcoming',
                meterSnapshot: { 
                    odometer: 0, // In real app, would fetch current asset meter
                    engineHours: 0, 
                    capturedAt: new Date().toISOString() 
                },
                dueRule: {
                    unit: schedule.frequency.unit,
                    frequencyEvery: schedule.frequency.every,
                    upcomingThreshold: schedule.upcomingThreshold,
                    dueAtOdometer,
                    dueAtDate,
                    dueAtEngineHours
                },
                createdAt: new Date().toISOString()
            };
            newTasks.push(newTask);
        });

        setTasks([...tasks, ...newTasks]);
        setIsCreatingSchedule(false);
    };

    if (isCreatingSchedule) {
        return (
            <CreateScheduleForm
                onSave={handleSaveSchedule}
                onCancel={() => setIsCreatingSchedule(false)}
            />
        );
    }

    const initiateSkip = (task: MaintenanceTask) => {
        setTaskToSkip(task);
        setIsSkipModalOpen(true);
    };

    const handleConfirmSkip = (reason: string) => {
        if (!taskToSkip) return;
        setTasks(tasks.map(t => t.id === taskToSkip.id ? {
            ...t,
            status: 'cancelled' as MaintenanceTaskStatus,
            cancelDetails: {
                reason,
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'Current User'
            }
        } : t));
        setIsSkipModalOpen(false);
        setTaskToSkip(null);
    };

    const handleDeleteTasks = (taskIdsToDelete: string[]) => {
        const lockedTasks = tasks.filter(t => taskIdsToDelete.includes(t.id) && orders.some(o => o.taskIds.includes(t.id) && o.status === 'open'));

        if (lockedTasks.length > 0) {
            alert(`Cannot delete ${lockedTasks.length} task(s) because they are part of active orders.`);
            return;
        }

        if (window.confirm(`Are you sure you want to delete ${taskIdsToDelete.length} selected task(s)?`)) {
            setTasks(tasks.filter(t => !taskIdsToDelete.includes(t.id)));
            setSelectedTaskIds([]);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="px-8 py-6">
                {/* Breadcrumb */}
                <div className="flex text-sm text-slate-500 mb-2">
                    <span className="mr-2">Assets</span> / <span className="ml-2 font-medium text-slate-900">Maintenance</span>
                </div>

                {/* Header */}
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Asset Maintenance
                        </h1>
                        <p className="text-slate-500 max-w-2xl">
                            Track and manage maintenance tasks, schedules, and work orders for your fleet assets.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {activeTab === 'tasks' && (
                            <Button variant="primary" onClick={() => setIsCreatingSchedule(true)} className="gap-2">
                                <Calendar size={16} /> New Schedule
                            </Button>
                        )}
                        {activeTab === 'orders' && (
                            <Button variant="primary" onClick={() => setIsCreateOrderModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                                <Briefcase size={16} /> Create Work Order
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`${activeTab === 'tasks' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                        >
                            <LayoutGrid size={18} />
                            Schedule Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`${activeTab === 'orders' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                        >
                            <ClipboardList size={18} />
                            Work Orders
                            {orders.filter(o => o.status === 'open').length > 0 && (
                                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                                    {orders.filter(o => o.status === 'open').length}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>

                {/* Tasks View */}
                {activeTab === 'tasks' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => { setAssetFilter('all'); setStatusFilter("All"); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${assetFilter === 'all' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    All Assets
                                </button>
                                <button
                                    onClick={() => { setAssetFilter('cmv'); setStatusFilter("All"); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${assetFilter === 'cmv' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Trucks (CMV)
                                </button>
                                <button
                                    onClick={() => { setAssetFilter('non_cmv'); setStatusFilter("All"); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${assetFilter === 'non_cmv' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}
                                >
                                    Trailers (Non-CMV)
                                </button>
                            </div>

                            {selectedTaskIds.length > 0 && (
                                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                        {selectedTaskIds.length} Selected
                                    </span>
                                    <div className="h-4 w-px bg-slate-300"></div>
                                    <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50 border-red-200 gap-1.5 h-8" onClick={() => handleDeleteTasks(selectedTaskIds)}>
                                        <Trash2 size={14} />
                                        <span>Delete</span>
                                    </Button>
                                    <Button size="sm" onClick={openCreateOrderModal} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 shadow-sm">
                                        <Briefcase size={14} />
                                        <span>Create Work Order</span>
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Status Tabs */}
                        <div className="border-b border-slate-200 px-4">
                            <nav className="-mb-px flex space-x-6 overflow-x-auto">
                                {["All", "Upcoming", "Due", "Overdue", "Completed", "Cancelled"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setStatusFilter(tab)}
                                        className={`${statusFilter === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                                    >
                                        {tab}
                                        <span className={`py-0.5 px-2 rounded-full text-[10px] leading-none ${statusFilter === tab ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {getCount(tab)}
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Search */}
                        <div className="p-4 border-b border-slate-200 bg-white flex gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <Input className="pl-9 w-64" placeholder="Search vehicle or task..." value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} />
                            </div>
                            <Button variant="outline" className="gap-2"><Filter size={14} /> More Filters</Button>
                        </div>

                        {/* Task Table */}
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 w-10"><Checkbox checked={isAllSelected} onChange={toggleAll} /></th>
                                    <th className="px-6 py-3">Asset</th>
                                    <th className="px-6 py-3">Asset Type</th>
                                    <th className="px-6 py-3">Task Name</th>
                                    <th className="px-6 py-3">Order #</th>
                                    <th className="px-6 py-3">Due At</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTasks.length > 0 ? filteredTasks.map((task) => {
                                    const asset = getAsset(task.assetId);
                                    const isSelected = selectedTaskIds.includes(task.id);
                                    const associatedOrder = getOrderForTask(task.id);

                                    return (
                                        <tr key={task.id} onClick={() => toggleTask(task.id)} className={`hover:bg-slate-50 transition-colors group cursor-pointer ${isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : ''}`}>
                                            <td className="px-6 py-4"><Checkbox checked={isSelected} onChange={() => toggleTask(task.id)} /></td>
                                            <td className="px-6 py-4"><div className={`font-bold ${isSelected ? 'text-blue-700' : 'text-slate-900'}`}>{asset?.unitNumber}</div></td>
                                            <td className="px-6 py-4"><Badge variant={asset?.assetClass === 'cmv' ? 'truck' : 'trailer'}>{asset?.assetClass === 'cmv' ? 'Truck' : 'Trailer'}</Badge></td>
                                            <td className="px-6 py-4"><div className="text-slate-900 max-w-xs truncate" title={getServiceNames(task.serviceTypeIds)}>{getServiceNames(task.serviceTypeIds)}</div></td>
                                            <td className="px-6 py-4 font-mono text-xs">{associatedOrder ? <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">#{associatedOrder.id.slice(-6).toUpperCase()}</span> : <span className="text-slate-400">-</span>}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">{task.dueRule.unit === 'miles' ? `${task.dueRule.dueAtOdometer?.toLocaleString()} mi` : task.dueRule.unit === 'days' ? new Date(task.dueRule.dueAtDate!).toLocaleDateString() : `${task.dueRule.dueAtEngineHours} hrs`}</div>
                                                {task.status !== 'completed' && task.status !== 'cancelled' && task.status !== 'in_progress' && (
                                                    <div className="text-xs text-slate-500">{task.dueRule.unit === 'miles' ? `${Math.max(0, (task.dueRule.dueAtOdometer || 0) - (asset?.currentOdometer || 0)).toLocaleString()} mi remaining` : 'Due soon'}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4"><Badge variant={task.status}>{task.status}</Badge></td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <ActionMenu status={task.status} isLocked={!!associatedOrder} onOpenDetails={() => setViewTask(task)} onComplete={() => { setSelectedTaskIds([task.id]); setIsCreateOrderModalOpen(true); }} onEdit={() => setViewTask(task)} onCancelTask={() => initiateSkip(task)} />
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                    <List size={24} className="text-slate-400" />
                                                </div>
                                                <p className="font-medium text-slate-900">No tasks found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {filteredOrders.length > ORDERS_PER_PAGE && (
                            <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
                                <div className="text-sm text-slate-500">
                                    Showing <span className="font-medium">{(ordersPage - 1) * ORDERS_PER_PAGE + 1}</span> to <span className="font-medium">{Math.min(ordersPage * ORDERS_PER_PAGE, filteredOrders.length)}</span> of <span className="font-medium">{filteredOrders.length}</span> results
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={ordersPage === 1}
                                        onClick={() => setOrdersPage(p => Math.max(1, p - 1))}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={ordersPage === totalOrderPages}
                                        onClick={() => setOrdersPage(p => Math.min(totalOrderPages, p + 1))}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-visible">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-1 overflow-x-auto pb-2 md:pb-0">
                                {['All', 'Pending', 'Partially Completed', 'Completed', 'Cancelled'].map(status => (
                                    <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${statusFilter === status ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {status}
                                    </button>
                                ))}
                            </div>

                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Order ID</th>
                                    <th className="px-6 py-3">Vendor</th>
                                    <th className="px-6 py-3">Assets</th>
                                    <th className="px-6 py-3">Tasks</th>
                                    <th className="px-6 py-3">Progress</th>
                                    <th className="px-6 py-3">Created</th>
                                    <th className="px-6 py-3">Due Date</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedOrders.length > 0 ? paginatedOrders.map((order) => {
                                    const vendor = vendors.find((v) => v.id === order.vendorId);
                                    const orderTasks = tasks.filter((t) => order.taskIds.includes(t.id));
                                    const uniqueAssetIds = [...new Set(orderTasks.map((t) => t.assetId))];
                                    const assetNames = uniqueAssetIds.map((id) => INITIAL_ASSETS.find((a) => a.id === id)?.unitNumber).join(", ");
                                    const completedTasks = orderTasks.filter(t => t.status === 'completed').length;
                                    const totalTasks = orderTasks.length;
                                    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                                    const derivedStatus = getOrderStatus(order, orderTasks);

                                    return (
                                        <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900">#{order.id.slice(-6).toUpperCase()}</td>
                                            <td className="px-6 py-4 text-slate-700">{vendor?.companyName || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-slate-700">{assetNames}</td>
                                            <td className="px-6 py-4 text-slate-500">{totalTasks} tasks</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full w-24">
                                                        <div className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }} />
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-500">{progress}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-slate-500">{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4"><Badge variant={derivedStatus}>{derivedStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</Badge></td>
                                            <td className="px-6 py-4 text-right">
                                                <OrderActionMenu
                                                    status={order.status}
                                                    isLocked={false}
                                                    onView={() => { }}
                                                    onEdit={() => { }}
                                                    onForceComplete={() => handleOpenCompleteOrder(order)}
                                                    onCancel={() => { console.log('Cancel order', order.id) }}
                                                />
                                            </td>
                                        </tr >
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                                    <ClipboardList size={24} className="text-slate-400" />
                                                </div>
                                                <p className="font-medium text-slate-900">No work orders</p>
                                                <p className="text-sm text-slate-400">Create a work order from the Tasks tab.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                }
                            </tbody>
                        </table >
                    </div >
                )}
            </div >

            {/* Task Details Modal */}
            < Modal
                isOpen={!!viewTask}
                onClose={() => setViewTask(null)}
                title="Task Details"
                footer={< Button onClick={() => setViewTask(null)}> Close</Button >}
            >
                {viewTask && (
                    <div className="space-y-6">
                        {viewTask.status === 'cancelled' && viewTask.cancelDetails && (
                            <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm mb-1">
                                    <SkipForward size={14} /> Task Cancelled
                                </div>
                                <p className="text-sm text-slate-600 italic">"{viewTask.cancelDetails.reason}"</p>
                                <div className="text-xs text-slate-400 mt-2">
                                    Cancelled by {viewTask.cancelDetails.cancelledBy} on {new Date(viewTask.cancelDetails.cancelledAt).toLocaleDateString()}
                                </div>
                            </div>
                        )}

                        {(() => {
                            const asset = getAsset(viewTask.assetId);
                            return (
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-900">Unit #{asset?.unitNumber}</h4>
                                            <p className="text-sm text-slate-500">VIN: {asset?.vin}</p>
                                        </div>
                                        <Badge variant={asset?.assetClass === 'cmv' ? 'truck' : 'trailer'}>
                                            {asset?.assetClass === 'cmv' ? 'Truck' : 'Trailer'}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Odometer</div>
                                            <div className="text-xl font-bold text-slate-900">{asset?.currentOdometer.toLocaleString()} <span className="text-xs font-normal text-slate-500">mi</span></div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Engine Hours</div>
                                            <div className="text-xl font-bold text-slate-900">{asset?.currentEngineHours.toLocaleString()} <span className="text-xs font-normal text-slate-500">hrs</span></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div>
                            <h4 className="font-semibold text-slate-900 mb-2">Services</h4>
                            <div className="space-y-2">
                                {viewTask.serviceTypeIds.map(id => {
                                    const service = INITIAL_SERVICE_TYPES.find(s => s.id === id);
                                    return (
                                        <div key={id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                            <Wrench size={14} className="text-slate-400" />
                                            <span className="text-sm text-slate-700">{service?.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </Modal >

            {/* Cancel Task Modal */}
            < CancelTaskModal
                isOpen={isSkipModalOpen}
                onClose={() => { setIsSkipModalOpen(false); setTaskToSkip(null); }}
                onConfirm={handleConfirmSkip}
            />

            {/* Create Order Modal */}
            < CreateOrderModal
                isOpen={isCreateOrderModalOpen}
                onClose={() => setIsCreateOrderModalOpen(false)}
                onCreate={handleCreateOrder}
                selectedTasks={tasks.filter(t => selectedTaskIds.includes(t.id))}
                availableTasks={tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && !orders.some(o => o.taskIds.includes(t.id)))}
                vendors={vendors}
                onAddVendor={handleAddVendor}
            />

            {/* Complete Order Modal */}
            < CompleteOrderModal
                isOpen={isCompleteOrderModalOpen}
                onClose={() => setIsCompleteOrderModalOpen(false)}
                onComplete={handleCompleteOrder}
                order={orderToComplete}
                tasks={tasks}
            />
        </div >
    );
}

export default AssetMaintenancePage;
