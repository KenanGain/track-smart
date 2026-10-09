import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
    AlertCircle, XCircle,
    Calendar, LayoutGrid, ClipboardList, Wrench,
    Briefcase, Truck, Edit, CheckSquare,
    X, Check, Eye, Store, Plus, Settings2, ShieldCheck, RotateCcw, TriangleAlert,
    Share2, Trash2
} from "lucide-react";
// The row menu every other list in the app uses, so an order's actions sit where a
// driver's, an asset's and a ticket's do.
import { KebabMenu } from "@/components/ui/KebabMenu";
// A row action with a symbol and a word, shared with the asset and interval lists.
import { RowButton } from "@/components/ui/CatalogTable";
import { CreateScheduleForm } from "./CreateScheduleForm";
import { VENDORS as INVENTORY_VENDORS, isCompanyIssuedVendor } from "@/pages/inventory/inventory.data";
// The page band every list in the app wears — title, count, figures, tabs — and the
// scroll behaviour that keeps it in reach. See `ListPageHeader`.
import { ListPageHeader, ListPageBody, PAGE_PAD } from "@/components/ui/ListPageHeader";
import type { ActivityEntry } from "@/components/ui/ActivityTimeline";
import { useCondensingHeader } from "@/components/ui/use-condensing-header";
// An interval's page, an asset's page and the interval form take over the screen without
// changing the route, so each one tells the Back button it exists.
import { useBackAwareView } from "@/lib/use-back-aware-view";
import type { KpiChip } from "@/components/ui/KpiChipStrip";
import { cn } from "@/lib/utils";
// The vendor list itself, shared with Inventory — same rows, same columns, same search.
import { VendorsTable } from "@/pages/inventory/VendorsTable";
import { VendorPage, type VendorDetail, type VendorBillRow } from "@/pages/inventory/VendorPage";
import {
    CARRIER_INVENTORY_ITEMS, VENDOR_CATEGORIES, getCategoryLabel, itemName, itemCategoryId,
    formatVendorAddress,
} from "@/pages/inventory/inventory.data";
// The roadside repair bills. A shop that fixed a truck at the side of the road billed
// this carrier just as surely as one that did a booked PM, and the vendor's own page is
// the only screen where those two facts have ever had to meet.
import { getInspections, seedInspections } from "@/pages/roadside/roadside.data";
import { backTarget } from "@/lib/nav-history";
// The service catalog, shared with Settings — same list, same live store.
import { ServiceTypesPanel, type ServiceTypesPanelHandle } from "@/pages/settings/ServiceTypesPanel";
import { useServiceTypes } from "@/data/serviceTypesStore";
// The rules themselves, as opposed to the tasks they generate.
import { ServiceIntervalsTable } from "./ServiceIntervalsTable";
// The fleet, read from maintenance's side: one row per asset, every rule it is on.
import { assetMaintenanceRow, ASSET_STATE_RANK } from './asset-interval-lines';
import {
    MaintenanceAssetsTable, type AssetIntervalLine, type MaintenanceAssetRow,
} from "./MaintenanceAssetsTable";
// One unit’s own page: what it is on, and which of those rules are counting it.
import { MaintenanceAssetPage } from "./MaintenanceAssetPage";
// One work-order list, wherever they are read: the module, one asset, one rule.
import { WorkOrdersTable, type WorkOrderRow } from "@/components/maintenance/WorkOrdersTable";
// The maintenance record: the fleet-wide list, and one entry's own page.
import { ServiceRecordPage, type ServiceRecordDetail } from "./ServiceRecordPage";
import { AssetIntervalPage } from "./AssetIntervalPage";
import { StartTrackingDialog } from "./LastServiceDialog";
import { IntervalMonitoringDialog } from './IntervalMonitoringDialog';
import { BulkServiceImportDialog } from './BulkServiceImportDialog';
import type { BulkServiceRow } from './bulk-service-import';
import { AddServiceRecordPage, type ServiceRecordDraft } from "./AddServiceRecordPage";
// What has actually been done to each unit, kept once and derived from everywhere else.
import {
    applyHistoryToMeta, correctEvent, historyForAsset, historyForInterval, historyForPair,
    historyFromClosedOrders, newEventId, sampleHistoryFor, seedHistory, withdrawJob, withdrawOrder,
    type ServiceEvent, type ServiceEventPatch,
} from "./service-history";
// One order as a place you go: the units, the rules, the shop and the paperwork.
import {
    WorkOrderPage, type WorkOrderDetail, type WorkOrderJob,
} from "./WorkOrderPage";
// The one share dialog, so an order goes out the way every other record does.
import { ShareToChat } from "@/components/share/ShareToChat";
// What can still change on an order once it has been sent.
import { OrderEditDialog } from "./OrderEditDialog";
// The two annual records the Add Asset form captures, read back: the asset's own
// certificate is what the Annual Inspection interval counts to.
import {
    annualFromEntry, isAnnualSafetyInterval, ANNUAL_RECORD_IDS, seedAnnualRecords,
    type AnnualCapture,
} from "./asset-annual-records";
import {
    useComplianceData, blankVersion, currentVersion, prefilledNumberFor,
    type DocVersion,
} from "@/pages/compliance/compliance-data-store";
// The form that files a compliance record — the same one the Compliances tab opens, so
// the annual records are captured identically wherever somebody is standing.
import { seedMonitoring, nextVersionLabel } from "@/pages/compliance/DefaultComplianceDataPage";
import { assetRecordFor, ASSET_RECORD_IDS, type AssetRecordKey } from "./asset-records-bridge";
import { pmEnrolmentsForCarrier } from "./asset-pm-enrolment";
import { SEED_INTERVAL_META } from "./service-intervals";
import { ServiceIntervalDetailPage } from "./ServiceIntervalDetailPage";
import {
    deriveServiceIntervals, dueRuleFromIntervals, statusForDue, buildSeedIntervalMeta,
    DEFAULT_REMINDERS, intervalText,
    remainingFor, remainingText,
    type AssetEnrollment, type AssetKind, type MeterReading,
    type ReminderSettings, type ServiceIntervalMeta, type ServiceIntervalRow,
} from "./service-intervals";
// The fleet itself. This page used to keep its own six-vehicle list whose ids (veh_001…)
// no task, no asset page and no work order has ever carried, so every asset it showed
// fell back to the id, to "Trailer" and to a zero odometer. The assets are a1…a7 for the
// demo carrier and AST-… for the generated ones; both are read from where they live.
import { INITIAL_ASSETS as DEMO_FLEET, type Asset as FleetAsset } from "./assets.data";
import { CARRIER_ASSETS, getAssetsForAccount } from "@/pages/accounts/carrier-assets.data";
import { getDriverById, getDriversForAccount } from "@/pages/accounts/carrier-drivers.data";

import { 
    INITIAL_SERVICE_TYPES, INITIAL_TASKS, INITIAL_ORDERS,
    getTasksForCarrier, getOrdersForCarrier
} from "./maintenance.data";
import type { 
    MaintenanceTask, TaskOrder, OrderCompletionEvent, 
    MaintenanceTaskStatus, AssetCostBreakdown 
} from "./maintenance.data";
import { CreateOrderModal } from "./CreateOrderModal";

// --- Types & Interfaces ---



/**
 * Any asset a maintenance record can point at, wherever it is kept.
 *
 * Ids are unique across carriers (AST-<account>-<n>), so one lookup over the lot answers
 * for every reader on this page without each of them having to know which registry a
 * given unit came from.
 */
function findAsset(id: string): FleetAsset | undefined {
    for (const list of Object.values(CARRIER_ASSETS)) {
        const hit = list.find((a) => a.id === id);
        if (hit) return hit;
    }
    return DEMO_FLEET.find((a) => a.id === id);
}

/**
 * The PM tiers the Add Asset form switched on, folded into the rules.
 *
 * The form is where somebody says "this truck runs PM-A and PM-B, and here is when each
 * was last done". That is exactly an enrolment with last-service figures, so it becomes
 * one: the unit joins the rule, the rule starts counting from the date given, and the
 * usual warnings are on. Everything after that is the maintenance module's own — this
 * only decides where the first countdown starts.
 */
function withPmEnrolments(
    meta: Record<string, ServiceIntervalMeta>, accountId?: string,
): Record<string, ServiceIntervalMeta> {
    const byAsset = pmEnrolmentsForCarrier(accountId);
    if (Object.keys(byAsset).length === 0) return meta;
    const out = { ...meta };
    for (const [assetId, tiers] of Object.entries(byAsset)) {
        for (const [intervalId, start] of Object.entries(tiers)) {
            const base = out[intervalId] ?? SEED_INTERVAL_META[intervalId];
            if (!base) continue;
            out[intervalId] = {
                ...base,
                assets: {
                    ...(base.assets ?? {}),
                    [assetId]: {
                        // A tier switched on with no date is enrolled but not counting:
                        // there is no last one to count from, and a countdown from a guess
                        // is worse than none.
                        enabled: true,
                        lastServiceDate: start.lastDate,
                        lastOdometer: start.odometer,
                        lastEngineHours: start.engineHours,
                        reminders: DEFAULT_REMINDERS,
                        updatedAt: new Date().toISOString(),
                    },
                },
            };
        }
    }
    return out;
}

/**
 * And the first entry on each of those records.
 *
 * The date and the paper the form collected are a service that happened, so they go on
 * the ledger as one — otherwise the unit's page would say the rule was last done in May
 * with nothing on its record to show for it, and the document somebody uploaded would
 * exist nowhere.
 */
function pmSeedHistory(accountId?: string): ServiceEvent[] {
    const out: ServiceEvent[] = [];
    for (const [assetId, tiers] of Object.entries(pmEnrolmentsForCarrier(accountId))) {
        for (const [intervalId, start] of Object.entries(tiers)) {
            if (!start.lastDate) continue;
            const base = SEED_INTERVAL_META[intervalId];
            out.push({
                id: `pmseed-${assetId}-${intervalId}`,
                assetId,
                intervalId,
                intervalName: base?.name,
                serviceTypeIds: base?.serviceTypeIds ?? [],
                performedAt: `${start.lastDate}T09:00:00.000Z`,
                odometer: start.odometer,
                engineHours: start.engineHours,
                // A figure off a shop's invoice is the shop's; one the yard typed is the
                // yard's. The record says which, as every other filed record does.
                readingSource: start.vendorName ? 'shop' : 'typed',
                // What the carrier came in with, which is what an opening record is.
                source: 'seed',
                vendorId: start.vendorId,
                vendorName: start.vendorName,
                performedBy: start.performedBy,
                driverId: start.driverId,
                performedByName: start.performedByName,
                labour: start.labour,
                parts: start.parts,
                cost: start.cost,
                currency: start.currency,
                notes: start.notes,
                remarks: start.remarks,
                files: start.files.length ? start.files : undefined,
            });
        }
    }
    return out.sort((a, b) => String(b.performedAt).localeCompare(String(a.performedAt)));
}

/** The demo carrier’s three-clock rule, counted from its own fleet. Nobody else’s. */
function seedMetaFor(accountId?: string): Record<string, ServiceIntervalMeta> {
    if (accountId !== "acct-001") return {};
    return buildSeedIntervalMeta(
        [...getAssetsForAccount(accountId), ...DEMO_FLEET],
        getTasksForCarrier(accountId),
    );
}

/** Truck or trailer. A van is neither, and reads as trailer-side kit. */
const kindOf = (a?: FleetAsset): AssetKind | undefined =>
    !a ? undefined : a.assetType === 'Truck' ? 'truck' : 'trailer';

/** The odometer in miles, whatever the unit on the record says. */
const odometerMiles = (a?: FleetAsset) =>
    !a?.odometer ? 0 : a.odometerUnit === 'km' ? Math.round(a.odometer * 0.621371) : a.odometer;

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
// --- Row menu on a work order ---
/**
 * What can be done to one order.
 *
 * The items depend on where it stands, because the three states are not interchangeable:
 * an open order can be finished or called off, a finished one can be reopened, and a
 * called-off one can be put back. Offering all of them at once is how an order gets
 * "completed" twice.
 */
const CompleteOrderModal = ({ isOpen, onClose, onComplete, order, tasks, focusTaskIds }: any) => {
    const [step, setStep] = useState(1);
    /*
     * What is being signed off, line by line.
     *
     * An order carries several service intervals and the shop answers them one at a time:
     * the oil change was done, the brake parts had not arrived. Ticking a UNIT signs off
     * everything that unit is in for, which is how work that was not done gets closed —
     * so the tick is on the job. The costs below are still per unit, because that is how
     * the invoice arrives.
     */
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

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
            // Opened from one line, that line is what it starts with ticked.
            setSelectedTaskIds(focusTaskIds ?? []);
            setInvoiceNumber("");
            setInvoiceDate(new Date().toISOString().split('T')[0]);
            setCurrency("CAD");
            setBreakdowns({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, focusTaskIds]);

    if (!isOpen || !order) return null;

    // The lines still open on this order. One already signed off is not offered again,
    // and one the shop handed back is not work this invoice can be covering.
    const signedOff = new Set<string>((order.completions ?? []).flatMap((c: any) => c.taskIds));
    const calledOff = new Set<string>(order.cancelledTaskIds ?? []);
    const orderTasks: MaintenanceTask[] = tasks.filter((t: any) => order.taskIds.includes(t.id));
    const openJobs = orderTasks.filter((t) => !signedOff.has(t.id) && !calledOff.has(t.id));

    const selectedTasks = openJobs.filter((t) => selectedTaskIds.includes(t.id));
    const selectedAssetIds = [...new Set(selectedTasks.map((t) => t.assetId))];
    // Costs are entered per unit, so the lines being closed are grouped by the unit the
    // invoice will name.
    const tasksByAsset: Record<string, MaintenanceTask[]> = {};
    selectedTasks.forEach((t) => {
        (tasksByAsset[t.assetId] ??= []).push(t);
    });

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
                alert(`Odometer reading is required for asset ID: ${assetId} (Unit: ${findAsset(assetId)?.unitNumber})`);
                return;
            }
            if (isHoursRequired && !data.finalEngineHours) {
                alert(`Engine Hours are required for asset ID: ${assetId} (Unit: ${findAsset(assetId)?.unitNumber})`);
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
            taskIds: selectedTasks.map((t) => t.id),
            assetBreakdowns: formattedBreakdowns
        };

        onComplete(completionEvent);
    };

    const toggleJob = (id: string) => {
        setSelectedTaskIds(selectedTaskIds.includes(id)
            ? selectedTaskIds.filter((tid) => tid !== id)
            : [...selectedTaskIds, id]);
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
                            <Button onClick={handleNext} disabled={selectedTaskIds.length === 0}>
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
                            <span className="font-semibold block mb-1">Tick what the shop actually did.</span>
                            One order can carry several service intervals, and they do not have to come
                            back together. Sign off the ones that are done; the rest stay open on this
                            order, and anything the shop is not doing can be called off from the order’s
                            own page.
                        </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase flex items-center justify-between gap-3">
                            <span>Open jobs ({openJobs.length})</span>
                            {openJobs.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setSelectedTaskIds(
                                        selectedTaskIds.length === openJobs.length ? [] : openJobs.map((t) => t.id),
                                    )}
                                    className="text-[11px] font-bold normal-case text-blue-600 hover:underline"
                                >
                                    {selectedTaskIds.length === openJobs.length ? 'Clear all' : 'Select all'}
                                </button>
                            )}
                        </div>
                        <div className="divide-y divide-slate-100">
                            {openJobs.length === 0 && (
                                <div className="px-4 py-8 text-center text-sm text-slate-500">
                                    Every job on this order has been answered.
                                </div>
                            )}
                            {openJobs.map((t) => {
                                const asset = findAsset(t.assetId);
                                const serviceNames = t.serviceTypeIds
                                    .map((sid: string) => INITIAL_SERVICE_TYPES.find((sv) => sv.id === sid)?.name)
                                    .filter(Boolean)
                                    .join(", ");
                                const isSelected = selectedTaskIds.includes(t.id);
                                return (
                                    <div
                                        key={t.id}
                                        className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                                        onClick={() => toggleJob(t.id)}
                                    >
                                        <Checkbox checked={isSelected} onChange={() => toggleJob(t.id)} />
                                        <div className="min-w-0">
                                            <div className="font-bold text-slate-900">{serviceNames || 'Maintenance'}</div>
                                            <div className="text-sm text-slate-500">
                                                {asset?.unitNumber ?? t.assetId}
                                                {t.status === 'overdue' ? ' · overdue' : ''}
                                            </div>
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
                            const asset = findAsset(assetId);
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
export function AssetMaintenancePage({ account, onNavigate, openVendor }: {
    account?: { id: string; legalName: string; dbaName?: string; dotNumber?: string; city?: string; state?: string };
    /** Optional — only the Vendors tab's Add Vendor button needs it. */
    onNavigate?: (path: string) => void;
    /**
     * A vendor to open straight away, named by whoever routed here.
     *
     * The vendor's profile is built from maintenance's own records — its orders, its
     * service ledger — so it lives here, and the inventory vendor list reaches it by
     * routing rather than by growing a second copy that would drift within a week.
     */
    openVendor?: string;
}) {
    const [activeTab, setActiveTab] = useState<"tasks" | "fleet" | "orders" | "services" | "vendors">("tasks");
    // The catalog every schedule and work order picks from. Read here only for the tab's
    // count and figures; the list itself is the panel's.
    const serviceTypes = useServiceTypes();
    const servicePanel = useRef<ServiceTypesPanelHandle>(null);

    // Tasks + orders are scoped to the currently selected carrier.
    // Without an active account (rare) we fall back to the full unfiltered
    // arrays so super-admin first-mount still shows something.
    const [tasks, setTasks] = useState<MaintenanceTask[]>(() =>
        account?.id ? getTasksForCarrier(account.id) : INITIAL_TASKS
    );
    const [orders, setOrders] = useState<TaskOrder[]>(() =>
        account?.id ? getOrdersForCarrier(account.id) : INITIAL_ORDERS
    );

    // Vendors are scoped per carrier — derive from the active account.
    // Newly added vendors stay in this carrier's list (added via handleAddVendor).
    const [vendors, setVendors] = useState<any[]>(() =>
        // Shops, not stationery. The company-issued rows are placeholders for kit nobody
        // bought from anyone — no contact, no phone, and a dozen of them reading the same
        // two words in every vendor picker on this module.
        account?.id
            ? INVENTORY_VENDORS.filter((v) => v.accountId === account.id && !isCompanyIssuedVendor(v))
            : INVENTORY_VENDORS.filter((v) => !isCompanyIssuedVendor(v))
    );

    // When the super-admin switches carriers in the TopNavbar, refresh the
    // tasks / orders / vendor lists to match the newly active account.
    useEffect(() => {
        if (account?.id) {
            setTasks(getTasksForCarrier(account.id));
            setOrders(getOrdersForCarrier(account.id));
            setVendors(INVENTORY_VENDORS.filter(
                (v) => v.accountId === account.id && !isCompanyIssuedVendor(v)));
            // A rule belongs to the carrier whose assets it names, so it does not follow the
            // switcher into somebody else's fleet.
            setIntervalMeta(withPmEnrolments(seedMetaFor(account.id), account.id));
            setServiceHistory(pmSeedHistory(account.id));
        }
    }, [account?.id]);
    // Still here because a work order is built from tasks: the rule’s page hands them
    // over, and CreateOrderModal reads them back.
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [orderFilter, setOrderFilter] = useState<WorkOrderRow['state'] | 'all'>('all');

    // Modal States
    const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
    // COMPLETE ORDER MODAL STATE
    const [isCompleteOrderModalOpen, setIsCompleteOrderModalOpen] = useState(false);
    const [orderToComplete, setOrderToComplete] = useState<TaskOrder | null>(null);

    const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);

    // The header shrinks as the body scrolls and comes back on the way up; the tab row never
    // leaves. `activeTab` is the reset key so a short tab (Vendors on a small fleet) cannot
    // strand it condensed with no scroll left to undo it.
    const { scrollRef, condensed, onScroll } = useCondensingHeader(activeTab);

    // The rule whose own page is open, if any. The per-asset tasks live there now: as a
    // tab-level list they turned one rule over eleven trucks into eleven rows you had to
    // read to find the one that was overdue.
    const [openIntervalId, setOpenIntervalId] = useState<string | null>(null);
    // The asset whose own page is open. The Assets tab is a list you go INTO: a unit's
    // standing is as long as the list of rules it is on.
    const [openAssetId, setOpenAssetId] = useState<string | null>(null);
    /** Jobs ticked on a list that have no task behind them yet. */
    const [pendingWorkRows, setPendingWorkRows] = useState<{
        assetId: string; intervalId?: string; name: string;
        serviceTypeIds: string[]; taskId?: string; status?: string;
    }[]>([]);
    // The rule being edited, if any. Same form as building one.
    const [editingIntervalId, setEditingIntervalId] = useState<string | null>(null);
    /**
     * One interval on one unit — the pair.
     *
     * Neither of the two pages that existed answered the question somebody standing next
     * to the truck asks: the rule's page is about every unit on it, the unit's page is
     * about every rule it is on. "When was PM-A last done on THIS truck, and how far does
     * it really run between services" needed a page of its own.
     */
    const [openPair, setOpenPair] = useState<{ assetId: string; intervalId: string } | null>(null);
    /** Saying when it was last done, from the pair's page. */
    const [pairStarting, setPairStarting] = useState<{ intervalId: string; editing: boolean } | null>(null);
    /** Sending one unit's standing on one interval — not the whole truck, not the whole rule. */
    const [sharingPair, setSharingPair] = useState(false);
    /** Filing a service that has already been done, receipt and all. */
    const [addingRecord, setAddingRecord] = useState(false);
    /** The warnings for the pair that is open, as a dialog over its page. */
    const [editingMonitoring, setEditingMonitoring] = useState(false);
    /** A spreadsheet of past services, coming into the pair that is open. */
    const [bulkImporting, setBulkImporting] = useState(false);
    /**
     * The line of a work order being filed.
     *
     * An order is finished by finishing its lines, and a line is finished by saying what
     * was done to it — so this opens the service record form for that unit on that rule,
     * from the order's own page, and carries back which line it answers.
     */
    const [recordForJob, setRecordForJob] = useState<{
        orderId: string; taskId: string; assetId: string; intervalId?: string;
    } | null>(null);
    /**
     * Which tab the order's page is on, kept out here because the page does not survive.
     *
     * Filing a record replaces it with the form and rebuilds it afterwards, and a tab held
     * inside a component that gets rebuilt is a tab that resets. It is reset deliberately
     * when a DIFFERENT order is opened, which is the one case where carrying it over would
     * be wrong.
     */
    const [orderTab, setOrderTab] = useState('overview');
    /** The vendor whose page is open. A shop is a thing you go into, not a row you read. */
    const [openVendorId, setOpenVendorId] = useState<string | null>(openVendor ?? null);
    /*
     * Routed in from somewhere else, Back belongs to that somewhere.
     *
     * Opened from this module's own Vendors tab, Back uncovers the tab underneath and the
     * nested-view handler deals with it. Opened by route from Inventory, the tab
     * underneath was never the place you came from, so the trail answers instead.
     */
    const routedToVendor = !!openVendor && openVendorId === openVendor;
    /*
     * The roadside records, brought into being.
     *
     * They are seeded when the Roadside Inspections page first mounts, and a vendor's
     * Repair bills tab reads them — so without this, whether a shop appeared to have
     * billed the carrier for roadside work depended on whether anybody had happened to
     * open a different module first. It is the same idempotent call that page makes, and
     * it leaves a carrier with real records alone.
     */
    useEffect(() => { if (account?.id) seedInspections(account.id); }, [account?.id]);
    // What a rule carries that its tasks cannot: the name typed into the form, the clocks
    // ticked, and whether it was pointed at every eligible asset.
    // The three-clock rule ships with the demo carrier: its clocks and each asset’s last
    // service cannot be read off a task, which only ever carries one of the three.
    /**
     * Every service this fleet has had, newest first.
     *
     * The source of truth for "when was this last done": an enrolment’s last-service
     * figures are a projection of this list, not a second copy of it. See
     * `service-history.ts` for why that matters when an order is reopened.
     */
    const [serviceHistory, setServiceHistory] = useState<ServiceEvent[]>(
        () => pmSeedHistory(account?.id),
    );
    const [intervalMeta, setIntervalMeta] = useState<Record<string, ServiceIntervalMeta>>(
        () => withPmEnrolments(seedMetaFor(account?.id), account?.id),
    );
    


    // Back closes whichever of these is open, innermost first, instead of leaving the app.
    useBackAwareView(!!openIntervalId, () => setOpenIntervalId(null), "interval");
    useBackAwareView(!!openAssetId, () => setOpenAssetId(null), "asset");
    /** Which of the unit's tabs to restore when one of its own sub-pages closes. */
    const [assetTab, setAssetTab] = useState<'overview' | 'maintenance' | 'orders' | 'history' | 'activity'>('overview');
    /** The work order whose own page is open, and the one being shared. */
    const [openOrderId, setOpenOrderId] = useState<string | null>(null);
    useBackAwareView(!!openOrderId, () => setOpenOrderId(null), "order");
    useBackAwareView(!!openVendorId, () => setOpenVendorId(null), "vendor");
    const [sharingOrderId, setSharingOrderId] = useState<string | null>(null);
    /** The entry in the record whose own page is open, and the one being corrected or sent. */
    const [openEventId, setOpenEventId] = useState<string | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [sharingEventId, setSharingEventId] = useState<string | null>(null);
    useBackAwareView(!!openEventId, () => setOpenEventId(null), "service-record");
    useBackAwareView(!!editingEventId, () => setEditingEventId(null), "edit-service-record");
    /** The open order being edited: vendor, date and what it is about can still change. */
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    useBackAwareView(isCreatingSchedule, () => setIsCreatingSchedule(false), "new-interval");
    useBackAwareView(!!editingIntervalId, () => setEditingIntervalId(null), "edit-interval");
    useBackAwareView(!!openPair, () => setOpenPair(null), "asset-interval");
    // The form is a page now, so Back has to step out of it before it steps out of
    // the interval underneath — otherwise the browser button skips a whole screen.
    useBackAwareView(addingRecord, () => setAddingRecord(false), "add-service-record");

    const getAsset = findAsset;
    const assetLabel = (id: string) => getAsset(id)?.unitNumber ?? id;

    /** This carrier’s own assets, for the pickers — plus the demo units the seeded tasks use. */
    const fleet = useMemo<FleetAsset[]>(() => {
        const own = account?.id ? getAssetsForAccount(account.id) : [];
        const seen = new Set(own.map((a) => a.id));
        return [...own, ...DEMO_FLEET.filter((a) => !seen.has(a.id))];
    }, [account?.id]);

    /**
     * Where an asset’s meters stand.
     *
     * The record carries an odometer; the tasks carry readings taken at the shop, which
     * can be the fresher of the two. The higher of them is the honest answer, and the
     * hour meter only exists on the tasks at all.
     */
    const assetMeter = useMemo(() => {
        const best = new Map<string, MeterReading>();
        const keep = (assetId: string, odometer?: number, engineHours?: number) => {
            const at = best.get(assetId) ?? { odometer: 0, engineHours: 0 };
            best.set(assetId, {
                odometer: Math.max(at.odometer, odometer ?? 0),
                engineHours: Math.max(at.engineHours, engineHours ?? 0),
            });
        };
        for (const t of tasks) keep(t.assetId, t.meterSnapshot?.odometer, t.meterSnapshot?.engineHours);
        /*
         * And every service on the ledger.
         *
         * A reading taken when the truck was on a lift is a reading of that truck: filing
         * a record at 145,000 miles and then being told the unit still reads 144,169 is
         * the record disagreeing with itself. The highest wins, because an odometer does
         * not run backwards — and because it is DERIVED, correcting an entry that was
         * typed with an extra digit puts the meter back where it belongs, which a stored
         * figure never would.
         */
        for (const e of serviceHistory) keep(e.assetId, e.odometer, e.engineHours);
        return (id: string): MeterReading => {
            const m = best.get(id);
            return {
                odometer: Math.max(m?.odometer ?? 0, odometerMiles(getAsset(id))),
                engineHours: m?.engineHours ?? 0,
            };
        };
    }, [tasks, serviceHistory]);

    /**
     * The annual safety inspection and the annual PM service, as the asset form filed them.
     *
     * Live, so capturing one on the asset form shows up here without a reload.
     */
    const compliance = useComplianceData(account?.id);
    const annualOf = useCallback((assetId: string): { safety?: AnnualCapture; pm?: AnnualCapture } => ({
        safety: annualFromEntry(compliance.getEntry(assetId, ANNUAL_RECORD_IDS.annualSafety)),
        pm: annualFromEntry(compliance.getEntry(assetId, ANNUAL_RECORD_IDS.annualPm)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [compliance.all]);

    // Every asset here arrived without going through the Add Asset form, so none of them has
    // the two annual records that form captures. Filled in once per carrier, as real
    // compliance versions, so this page and the asset's Compliances tab read the same record.
    useEffect(() => {
        if (!fleet.length) return;
        seedAnnualRecords(fleet, compliance.getEntry, compliance.setEntries, account?.id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fleet, account?.id]);

    /**
     * The two annual records, as the shared record form needs them.
     *
     * Maintenance used to ask for these with a little form of its own, which is how the
     * same record came to be captured two different ways: no document, no "current", no
     * monitoring. It now opens the very form the Compliances tab opens.
     */
    const annualRecordFor = (key: AssetRecordKey) => assetRecordFor(key);

    const annualVersionFor = (assetId: string, key: AssetRecordKey, mode: "add" | "edit"): DocVersion | null => {
        const record = assetRecordFor(key);
        if (!record) return null;
        const entry = compliance.getEntry(assetId, ASSET_RECORD_IDS[key]);
        if (mode === "edit") {
            const cur = currentVersion(entry);
            if (cur) return cur;
        }
        return {
            ...blankVersion(record, nextVersionLabel(record, entry)),
            numberValue: prefilledNumberFor(record, account?.id),
            monitoring: seedMonitoring(record),
        };
    };

    /**
     * File what the form captured.
     *
     * Adding prepends — last year’s inspection is the history a claim is argued from —
     * and only one record can be the pinned current one, so pinning this one releases the
     * rest. The same two rules the Compliances tab applies, because it is the same record.
     */
    const saveAnnualVersion = (
        assetId: string, key: AssetRecordKey, saved: DocVersion, mode: "add" | "edit",
    ) => {
        const recordId = ASSET_RECORD_IDS[key];
        const entry = compliance.getEntry(assetId, recordId);
        const onlyCurrent = (list: DocVersion[]): DocVersion[] => (saved.isCurrent
            ? list.map((x) => (x.id === saved.id || !x.isCurrent ? x : { ...x, isCurrent: undefined }))
            : list);
        const versions = mode === "add"
            ? onlyCurrent([saved, ...entry.versions])
            : onlyCurrent(entry.versions.map((x) => (x.id === saved.id ? saved : x)));
        compliance.setEntry(assetId, recordId, { ...entry, versions });
    };

    /** Who drives it, where the fleet says so. */
    const driverOf = (id: string) => {
        const a = getAsset(id);
        const current = a?.driverAssignments?.find((d) => !d.endDate) ?? a?.driverAssignments?.[0];
        if (!current || !account?.id) return undefined;
        return getDriverById(account.id, current.driverId)?.name;
    };
    const serviceName = (id: string) => INITIAL_SERVICE_TYPES.find((t) => t.id === id)?.name ?? id;

    // Grouped off the tasks, so the two halves of this tab can never disagree about what
    // exists. See `service-intervals.ts`.
    /**
     * The enrolment as the screens read it: settings from `intervalMeta`, last service
     * from the ledger. One place the two meet, so a countdown and a history cannot
     * disagree about when something was done.
     */
    const metaWithHistory = useMemo(
        () => applyHistoryToMeta(
            intervalMeta,
            serviceHistory,
            (id) => (intervalMeta[id]?.intervals?.mileage?.unit === 'km' ? 'km' : 'miles'),
        ),
        [intervalMeta, serviceHistory],
    );

    const serviceIntervals = useMemo(
        () => deriveServiceIntervals(
            tasks,
            (id) => kindOf(getAsset(id)),
            serviceName,
            metaWithHistory,
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [tasks, metaWithHistory],
    );

    /*
     * The record this fleet turns up with.
     *
     * Two sources, because there are two ways work gets into a record. The back-series is
     * the opening balance a carrier carries in from paper. The closed work orders are work
     * this app already knows about — they were seeded before there was a ledger, so their
     * services were missing from the record while their costs sat on the order. Reading
     * them back means the two agree, and it is what makes the whole thing testable: the
     * same entry can be opened, corrected, shared and withdrawn.
     */
    useEffect(() => {
        if (serviceHistory.length > 0) return;
        const unitOf = (id: string) =>
            (intervalMeta[id]?.intervals?.mileage?.unit === 'km' ? 'km' : 'miles') as 'km' | 'miles';

        const opening = seedHistory(
            intervalMeta,
            unitOf,
            (id) => intervalMeta[id]?.name,
            vendors.map((v) => ({ id: v.id, name: v.companyName || v.name })),
        );

        const fromOrders = historyFromClosedOrders(
            orders.flatMap((o) => {
                const vendor = vendors.find((v) => v.id === o.vendorId);
                const vendorName = o.customVendor?.name || vendor?.companyName || vendor?.name;
                return (o.completions ?? []).flatMap((c) => c.taskIds.flatMap((taskId) => {
                    const t = tasks.find((x) => x.id === taskId);
                    if (!t) return [];
                    const rule = serviceIntervals.find((r) => r.taskIds.includes(taskId));
                    const b = c.assetBreakdowns.find((x) => x.assetId === t.assetId);
                    return [{
                        orderId: o.id,
                        assetId: t.assetId,
                        intervalId: rule?.id,
                        intervalName: rule?.name,
                        serviceTypeIds: t.serviceTypeIds,
                        taskId,
                        performedAt: c.completedAt,
                        odometer: b?.finalOdometer ?? assetMeter(t.assetId).odometer,
                        engineHours: b?.finalEngineHours ?? assetMeter(t.assetId).engineHours,
                        fromShop: b?.finalOdometer != null,
                        vendorId: o.vendorId,
                        vendorName,
                        cost: b?.costs?.totalPaid,
                        currency: c.currency,
                        invoiceNumber: c.invoiceNumber,
                        files: (o.bill?.files ?? []).map((f) => ({ name: f.name, url: f.url })),
                    }];
                }));
            }),
        );

        const all = [...fromOrders, ...opening]
            .sort((a, b) => String(b.performedAt).localeCompare(String(a.performedAt)));
        if (all.length) setServiceHistory(all);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [intervalMeta, orders, tasks]);

    // Deleting a rule takes its outstanding tasks with it; what has already been done
    // stays, because it happened.
    const deleteInterval = (row: ServiceIntervalRow) => {
        // The PM tiers came with the system and every other maintenance document is
        // written against them, so they are not a carrier's to remove. Units come off
        // one at a time instead, which is the thing anybody actually wants.
        if (row.system) return;
        const owned = new Set(row.taskIds);
        setTasks((prev) => prev.filter((t) =>
            !owned.has(t.id) || t.status === "completed" || t.status === "cancelled"));
        setIntervalMeta(({ [row.id]: _gone, ...rest }) => rest);
    };

    // Handlers
    /** When the form is opened for ONE line, that line is what it starts with ticked. */
    const [completeFocus, setCompleteFocus] = useState<string[] | null>(null);

    const handleOpenCompleteOrder = (order: TaskOrder, focusTaskIds?: string[]) => {
        // The completion form is mounted by the list behind any sub-page — the order's own
        // page included. Finishing an order from one therefore steps back out to the list;
        // otherwise the button is wired to a view that is not on screen and does nothing.
        setOpenAssetId(null);
        setOpenIntervalId(null);
        setOpenOrderId(null);
        setActiveTab('orders');
        setCompleteFocus(focusTaskIds ?? null);
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

        /*
         * 2. The work is done, so the clocks start again.
         *
         * A completed task is history; what the fleet actually needs is the NEXT one, and
         * it has to count from what the shop wrote down rather than from where the last
         * countdown happened to start. So for every (asset, interval) pair on this
         * completion:
         *
         *   · the interval’s enrolment for that asset takes the final readings as its
         *     last service — the single figure every countdown is measured from;
         *   · a fresh task is raised from those readings, due at last + every;
         *   · the completed one stays, because it happened.
         *
         * Readings the shop did not give fall back to the asset’s own meter, and a missing
         * date to the day it was closed out. Nothing is invented.
         */
        /*
         * 2. The work is done, so it goes in the record — once.
         *
         * One append per (asset, interval) closed. Everything else is read off it: the
         * enrolment’s last service is the newest event for that pair, the next task counts
         * from the same figures, and the asset’s history IS this list. Nothing is written
         * twice, so nothing can drift, and undoing it later is a withdrawal rather than a
         * restore from a snapshot.
         *
         * Readings the shop did not give fall back to the asset’s own meter, and the event
         * says which of the two it was: a fallback is not a measurement.
         */
        const closedAt = completionEvent.completedAt || new Date().toISOString();
        const nextTasks: MaintenanceTask[] = [];
        const events: ServiceEvent[] = [];
        const vendor = vendors.find((v) => v.id === orderToComplete.vendorId);
        const vendorName = orderToComplete.customVendor?.name
            || vendor?.companyName || vendor?.name || undefined;

        for (const taskId of completionEvent.taskIds) {
            const done = tasks.find((t) => t.id === taskId);
            if (!done) continue;
            const rule = serviceIntervals.find((r) => r.taskIds.includes(taskId));
            const breakdown = completionEvent.assetBreakdowns.find((b) => b.assetId === done.assetId);
            const meter = assetMeter(done.assetId);
            const odometer = breakdown?.finalOdometer ?? meter.odometer;
            const engineHours = breakdown?.finalEngineHours ?? meter.engineHours;

            // Work with no rule behind it does not come round again: a one-off repair is
            // finished when it is finished. It still goes in the record — it happened.
            let raisedTaskId: string | undefined;
            if (rule?.intervals) {
                raisedTaskId = `task_${Math.random().toString(36).substr(2, 9)}`;
                const dueRule = dueRuleFromIntervals(rule.intervals, {
                    odometer, engineHours, date: new Date(closedAt),
                });
                nextTasks.push({
                    id: raisedTaskId,
                    assetId: done.assetId,
                    scheduleId: rule.id,
                    serviceTypeIds: done.serviceTypeIds,
                    // Measured against the reading the shop just gave us, not guessed.
                    status: statusForDue(dueRule, { odometer, engineHours }),
                    meterSnapshot: { odometer, engineHours, capturedAt: closedAt },
                    dueRule,
                    createdAt: closedAt,
                });
            }

            events.push({
                id: newEventId(),
                assetId: done.assetId,
                intervalId: rule?.id,
                intervalName: rule?.name,
                serviceTypeIds: done.serviceTypeIds,
                performedAt: closedAt,
                odometer,
                engineHours,
                readingSource: breakdown?.finalOdometer != null ? 'shop' : 'meter',
                source: 'work_order',
                orderId: orderToComplete.id,
                taskId,
                raisedTaskId,
                vendorId: orderToComplete.vendorId,
                vendorName,
                cost: breakdown?.costs?.totalPaid,
                currency: completionEvent.currency,
                invoiceNumber: completionEvent.invoiceNumber,
                files: (orderToComplete.bill?.files ?? []).map((f) => ({ name: f.name, url: f.url })),
            });
        }

        setTasks([...updatedTasks, ...nextTasks]);

        /*
         * 3. An annual inspection that has just been done is a new certificate.
         *
         * The record is what an officer at the scale asks for, and it is read by the
         * asset's Compliances tab and the monitoring alerts as well as by this page.
         * Closing the work order IS the inspection happening, so a record still showing
         * last year's date would have the truck overdue on paper while the sticker on the
         * windscreen says otherwise. The version id goes on the event, so withdrawing the
         * visit withdraws the certificate with it.
         */
        for (const ev of events) {
            if (!isAnnualSafetyInterval(ev.serviceTypeIds)) continue;
            const version = annualVersionFor(ev.assetId, "annualSafety", "add");
            if (!version) continue;
            const dayOf = closedAt.slice(0, 10);
            version.issueDate = dayOf;
            version.expiryDate = new Date(new Date(`${dayOf}T08:00:00`).getTime() + 365 * 86400000)
                .toISOString().slice(0, 10);
            version.fields = {
                ...(version.fields ?? {}),
                odometer: String(ev.odometer ?? assetMeter(ev.assetId).odometer),
                odometerUnit: "miles",
            };
            version.tags = [...(version.tags ?? []), "From work order"];
            const entry = compliance.getEntry(ev.assetId, ASSET_RECORD_IDS.annualSafety);
            ev.certificateVersionId = version.id;
            ev.certificateReplacedId = entry.versions.find((v) => v.isCurrent)?.id;
            saveAnnualVersion(ev.assetId, "annualSafety", version, "add");
        }

        setServiceHistory((prev) => [...events, ...prev]);

        // 2. Update Order
        const updatedOrders = orders.map(o => {
            if (o.id === orderToComplete.id) {
                const updatedCompletions = [...o.completions, completionEvent];

                // Finished when nothing is left open on it. A line the shop handed back
                // counts as answered: an order held open by work nobody will ever do is
                // an order that gets chased every week for the rest of its life.
                const signedOff = new Set(updatedCompletions.flatMap((c) => c.taskIds));
                const calledOff = new Set(o.cancelledTaskIds ?? []);
                const isFullyCompleted = o.taskIds.every((id) => signedOff.has(id) || calledOff.has(id));

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

    /**
     * Mark an order NOT done.
     *
     * Closing it moved the fleet on: the interval’s last service became the shop’s reading,
     * the next service was raised from it, and an annual inspection filed a certificate. A
     * reopen that only flipped the badge back would leave all three standing — the truck
     * would read as serviced on work that did not happen. So each completion is undone
     * from the record it kept of what it overwrote.
     */
    const reopenJobs = (order: TaskOrder, taskIds?: string[]) => {
        const scope = taskIds ? new Set(taskIds) : undefined;
        // Everything the jobs in scope put in the record, which is everything they changed.
        const mine = serviceHistory.filter((e) => e.orderId === order.id
            && (!scope || (e.taskId != null && scope.has(e.taskId))));
        const closedIds = new Set(mine.map((e) => e.taskId).filter(Boolean) as string[]);
        const raisedIds = new Set(mine.map((e) => e.raisedTaskId).filter(Boolean) as string[]);

        setTasks((prev) => prev
            // The services they raised never happened.
            .filter((t) => !raisedIds.has(t.id))
            // What they closed is outstanding again, and back on this order.
            .map((t) => (closedIds.has(t.id) ? { ...t, status: 'in_progress' as MaintenanceTaskStatus } : t)));

        // The certificate goes with it, and the one it displaced is current again.
        for (const e of mine) {
            if (!e.certificateVersionId) continue;
            const recordId = ASSET_RECORD_IDS.annualSafety;
            const entry = compliance.getEntry(e.assetId, recordId);
            const versions = entry.versions
                .filter((v) => v.id !== e.certificateVersionId)
                .map((v) => (v.id === e.certificateReplacedId ? { ...v, isCurrent: true } : v));
            compliance.setEntry(e.assetId, recordId, { ...entry, versions });
        }

        // And the visits themselves. No enrolment is restored, because none was
        // overwritten: the last service was always the newest event, and the one before
        // this order is now the newest again.
        setServiceHistory((prev) => (scope
            ? withdrawJob(prev, order.id, [...scope])
            : withdrawOrder(prev, order.id)));

        setOrders((prev) => prev.map((o) => {
            if (o.id !== order.id) return o;
            if (!scope) return { ...o, completions: [], status: 'open' as const };
            /*
             * A completion is one invoice covering several lines, so taking one line back
             * means editing the invoice rather than tearing it up: the line comes off it,
             * and a unit with nothing left on that invoice loses its cost breakdown too.
             * An invoice with nothing left on it goes.
             */
            const completions = o.completions
                .map((c) => {
                    const keep = c.taskIds.filter((id) => !scope.has(id));
                    const assetsLeft = new Set(keep
                        .map((id) => tasks.find((t) => t.id === id)?.assetId)
                        .filter(Boolean) as string[]);
                    return {
                        ...c,
                        taskIds: keep,
                        assetBreakdowns: c.assetBreakdowns.filter((b) => assetsLeft.has(b.assetId)),
                    };
                })
                .filter((c) => c.taskIds.length > 0);
            return { ...o, completions, status: 'open' as const };
        }));
    };

    /** Mark a whole order not done — every line it closed comes back out of the record. */
    const handleReopenOrder = (order: TaskOrder) => reopenJobs(order);

    /** Mark ONE line not done, leaving the lines beside it signed off. */
    const handleReopenJob = (order: TaskOrder, taskId: string) => reopenJobs(order, [taskId]);

    /**
     * The shop is not doing one of the jobs on this order.
     *
     * Not the same as cancelling the whole visit, and not the same as the service being
     * cancelled: the job still needs doing, so it goes straight back on the board, due
     * where it was due, and the lock lifts so it can go on another order. The only thing
     * that changes permanently is that THIS order is on record as not having done it.
     */
    const handleCancelJob = (order: TaskOrder, taskId: string) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId && t.status === 'in_progress'
            ? { ...t, status: statusForDue(t.dueRule, assetMeter(t.assetId)) }
            : t)));
        setOrders((prev) => prev.map((o) => (o.id === order.id
            ? { ...o, cancelledTaskIds: [...new Set([...(o.cancelledTaskIds ?? []), taskId])] }
            : o)));
    };

    /** Put a called-off line back on the order. It is with the shop again. */
    const handleRestoreJob = (order: TaskOrder, taskId: string) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId && t.status !== 'completed'
            ? { ...t, status: 'in_progress' as MaintenanceTaskStatus }
            : t)));
        setOrders((prev) => prev.map((o) => (o.id === order.id
            ? { ...o, cancelledTaskIds: (o.cancelledTaskIds ?? []).filter((id) => id !== taskId) }
            : o)));
    };

    /**
     * Call an order off.
     *
     * Different from "not done": the work was never done in the first place, so there is
     * nothing in the record to withdraw — its outstanding jobs simply go back to being
     * outstanding, measured against where the asset is now, and the lock lifts so they can
     * go on another order.
     */
    const handleCancelOrder = (order: TaskOrder) => {
        const onIt = new Set(order.taskIds);
        setTasks((prev) => prev.map((t) => (onIt.has(t.id) && t.status === 'in_progress'
            ? { ...t, status: statusForDue(t.dueRule, assetMeter(t.assetId)) }
            : t)));
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'cancelled' as const } : o)));
    };

    /**
     * Delete an order outright.
     *
     * Different again from cancelling: cancelling leaves the record standing with a reason,
     * deleting takes it off the books as though it was never raised — for the one typed by
     * mistake. What it had closed stays closed, because that work happened; what it was
     * holding goes back to outstanding.
     */
    const handleDeleteOrder = (order: TaskOrder) => {
        const onIt = new Set(order.taskIds);
        setTasks((prev) => prev.map((t) => (onIt.has(t.id) && t.status === 'in_progress'
            ? { ...t, status: statusForDue(t.dueRule, assetMeter(t.assetId)) }
            : t)));
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        setOpenOrderId((id) => (id === order.id ? null : id));
    };

    /** Change what can still change on an order: its name, its vendor, its date, its brief. */
    const handleSaveOrderEdits = (
        orderId: string,
        patch: { name?: string; vendorId?: string; dueDate?: string; notes?: string },
    ) => {
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
    };

    /** Put a called-off order back on the board. Nothing to undo — it never closed. */
    const handleUncancelOrder = (order: TaskOrder) => {
        // Lines the shop had already handed back stay handed back: the order going back
        // on the board says nothing about a job that was answered before it came off.
        const off = new Set(order.cancelledTaskIds ?? []);
        const onIt = new Set(order.taskIds.filter((id) => !off.has(id)));
        setTasks((prev) => prev.map((t) => (onIt.has(t.id) && t.status !== 'completed' && t.status !== 'cancelled'
            ? { ...t, status: 'in_progress' as MaintenanceTaskStatus }
            : t)));
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: 'open' as const } : o)));
    };

    /** The order a confirm box is standing over, and what it is about to do to it. */
    const [orderPrompt, setOrderPrompt] = useState<
        { order: TaskOrder; kind: 'reopen' | 'cancel' | 'uncancel' | 'delete' } | null
    >(null);

    /**
     * Done, not done, or called off — offered the same way on every list that shows orders.
     *
     * Marking one done opens the completion form, because closing an order is not a badge:
     * it is the shop’s readings and what it cost, and those are what move the interval on.
     * The two that undo something ask first.
     */
    const orderActions = (r: WorkOrderRow) => {
        const order = orders.find((x) => x.id === r.id);
        if (!order) return null;
        // Every one of these belongs to the list behind any sub-page, so each steps back
        // out to it first — otherwise the control is wired to a view that is not on screen.
        const toList = () => { setOpenAssetId(null); setOpenIntervalId(null); setOpenOrderId(null); setActiveTab('orders'); };
        const prompt = (kind: 'reopen' | 'cancel' | 'uncancel' | 'delete') => { toList(); setOrderPrompt({ order, kind }); };
        return (
            <div className="flex items-center justify-end gap-1">
                {/* Whether a job is done is the question this list exists to answer, so the
                    answer is a button — symbol and word — not an item inside a menu. */}
                {r.state === 'open' && (
                    <RowButton Icon={Check} label="Mark done" tone="emerald"
                        onClick={() => handleOpenCompleteOrder(order)} />
                )}
                {r.state === 'completed' && (
                    <RowButton Icon={RotateCcw} label="Not done" onClick={() => prompt('reopen')} />
                )}
                {r.state === 'cancelled' && (
                    <RowButton Icon={RotateCcw} label="Reopen" onClick={() => prompt('uncancel')} />
                )}
                {/* Calling an order off is a decision, not a thing done in passing, so it
                    moved into the menu beside Delete. Two labelled buttons in the Actions
                    column made it the widest thing on the row, and the Due date fell off
                    the end of the card. */}
                <KebabMenu
                    className="justify-end"
                    title={`Actions for ${r.name}`}
                    items={[
                        { label: 'Open', icon: Eye, onClick: () => { setOrderTab('overview'); setOpenOrderId(order.id); } },
                        ...(r.state === 'open'
                            ? [{ label: 'Cancel order', icon: XCircle, onClick: () => prompt('cancel') }]
                            : []),
                        { label: 'Edit', icon: Edit, onClick: () => { toList(); setEditingOrderId(order.id); } },
                        { label: 'Share to chat', icon: Share2, onClick: () => { toList(); setSharingOrderId(order.id); } },
                        { label: 'Delete', icon: Trash2, danger: true, onClick: () => prompt('delete') },
                    ]}
                />
            </div>
        );
    };

    /**
     * One order, gathered for its own page.
     *
     * Read from the tasks, the fleet, the rules and the vendor list rather than stored a
     * second time: a page that can disagree with the list it was opened from is worse
     * than no page.
     */
    const orderDetail = (o: TaskOrder): WorkOrderDetail => {
        const mine = tasks.filter((t) => o.taskIds.includes(t.id));
        const row = orderRow(o);
        const vendor = vendors.find((v) => v.id === o.vendorId);
        const breakdowns = (o.completions ?? []).flatMap((c) => c.assetBreakdowns);

        // Everything this order has put in the fleet's record. One list, read twice:
        // once per line below, once as the files the order has collected.
        const filed = serviceHistory.filter((e) => e.orderId === o.id);

        const jobs: WorkOrderJob[] = mine.map((t) => {
            const rule = serviceIntervals.find((r) => r.taskIds.includes(t.id));
            const info = assetInfo(t.assetId);
            const b = breakdowns.find((x) => x.assetId === t.assetId);
            const ev = filed.find((e) => e.taskId === t.id);
            const left = remainingText(remainingFor(t.dueRule, info.meter));
            return {
                taskId: t.id,
                assetId: t.assetId,
                assetLabel: info.label,
                assetKind: info.kind === 'trailer' ? 'trailer' : 'truck',
                assetDescription: info.description,
                driver: info.driver,
                intervalId: rule?.id,
                intervalName: rule?.name,
                intervalEvery: rule ? intervalText(rule.intervals).join(' · ') || undefined : undefined,
                services: t.serviceTypeIds.map(serviceName),
                status: t.status,
                state: jobStateOf(o, t.id),
                dueText: t.dueRule?.unit === 'miles' ? `${(t.dueRule.dueAtOdometer ?? 0).toLocaleString()} mi`
                    : t.dueRule?.unit === 'engine_hours' ? `${(t.dueRule.dueAtEngineHours ?? 0).toLocaleString()} h`
                        : t.dueRule?.dueAtDate ? new Date(t.dueRule.dueAtDate).toLocaleDateString() : undefined,
                remainingText: left?.text,
                /*
                 * The entry first, the completion second.
                 *
                 * Both hold the same figures, and only one of them can be corrected: the
                 * entry IS the record, and correcting it is how a mistyped odometer or a
                 * revised invoice gets fixed. Reading the completion first meant the
                 * correction landed in the fleet's history and the order went on showing
                 * the old number — the exact disagreement this module exists to prevent.
                 */
                finalOdometer: ev?.odometer ?? b?.finalOdometer,
                finalEngineHours: ev?.engineHours ?? b?.finalEngineHours,
                cost: ev?.cost ?? b?.costs?.totalPaid,
                // The fleet's own entry, not a copy of it: the Record column opens the
                // same page the rule's history opens.
                record: ev && {
                    id: ev.id,
                    date: ev.performedAt,
                    odometer: ev.odometer,
                    cost: ev.cost,
                    currency: ev.currency,
                    vendorName: ev.vendorName,
                    files: (ev.files ?? []).length,
                },
            };
        });

        const assetIds = [...new Set(mine.map((t) => t.assetId))];
        const addr = vendor?.address;
        return {
            id: o.id,
            name: row.name,
            state: row.state,
            createdAt: o.createdAt,
            dueDate: o.dueDate,
            completedAt: (o.completions ?? [])[0]?.completedAt,
            about: (o as any).about,
            notes: o.notes,
            jobs,
            assets: assetIds.map((id) => {
                const a = getAsset(id);
                const info = assetInfo(id);
                return {
                    id,
                    label: info.label,
                    kind: info.kind === 'trailer' ? ('trailer' as const) : ('truck' as const),
                    description: info.description,
                    driver: info.driver,
                    odometer: info.meter.odometer,
                    engineHours: info.meter.engineHours,
                    vin: a?.vin,
                    plateNumber: a?.plateNumber,
                };
            }),
            vendor: {
                name: o.customVendor?.name || vendor?.companyName || vendor?.name || 'Vendor',
                contactName: vendor?.contactName,
                email: o.customVendor?.email || vendor?.email,
                phone: o.customVendor?.phone || vendor?.phone,
                address: addr
                    ? [addr.street, addr.city, addr.state, addr.zip, addr.country].filter(Boolean).join(', ')
                    : undefined,
            },
            /*
             * Everything on this order that is a file, from all three directions it
             * arrives from: what went out with the order, what each line's record filed
             * when it was signed off, and the repair bill where one was attached.
             *
             * Pulled together here rather than copied onto the order when it is uploaded,
             * so a document withdrawn with its service disappears from here too.
             */
            docs: [
                ...(o.documents ?? []),
                ...(o.bill?.files ?? []).map((f) => ({ ...f, group: 'Repair bill' })),
                /*
                 * A record's own paper, carrying the record with it.
                 *
                 * The row has to be able to say WHICH service it was filed with, or the
                 * order's documents are a pile of PDFs with a date on them: the invoice
                 * for the brake job and the invoice for the annual inspection look
                 * identical in a flat list, and both are just "invoice".
                 */
                ...filed.flatMap((e) => (e.files ?? []).map((f) => ({
                    name: f.name,
                    url: f.url,
                    size: f.size,
                    tags: f.tags,
                    addedAt: f.addedAt ?? e.performedAt,
                    group: `${e.intervalName ?? 'Service'} · record`,
                    recordId: e.id,
                    recordLabel: e.intervalName ?? 'One-off repair',
                }))),
            ],
            activity: orderActivity(o),
            currency: o.bill?.currency ?? 'USD',
            total: row.total,
            bill: o.bill ? {
                performedBy: o.bill.performedBy,
                who: o.bill.performedBy === 'driver' ? o.bill.driverName : o.bill.mechanicName,
                labour: o.bill.labour,
                parts: o.bill.parts,
                odometer: o.bill.odometer,
                odometerUnit: o.bill.odometerUnit,
            } : undefined,
        };
    };

    /**
     * One vendor, gathered for its own page.
     *
     * Four modules keep a piece of the answer to "what does this shop do for us and what
     * does it cost": the work orders raised with them, the services filed against them,
     * the repair bills attached to roadside inspections, and the inventory issued under
     * them. None of it is copied here — each tab is the module's own records read through
     * one filter, so a correction anywhere shows up on this page without being told.
     */
    const vendorDetail = (v: any): VendorDetail => {
        const company = v.companyName || v.name;
        /*
         * Matched on the id, falling back to the name.
         *
         * A typed-in shop is a real case, not a gap: the driver got a tyre fixed at a
         * place nobody has a record for, and the bill names it. Those rows have no id to
         * match on, so the name does the work — and because a carrier writes "Wilmington
         * Truck Service" where the record says "Wilmington Truck Service Inc.", both the
         * short name and the company name are accepted.
         */
        const names = new Set([v.name, company].filter(Boolean).map((x: string) => x.toLowerCase()));
        const isMine = (id?: string, name?: string) =>
            (id ? id === v.id : !!name && names.has(name.toLowerCase()));

        const items = (account?.id ? CARRIER_INVENTORY_ITEMS[account.id] ?? [] : [])
            .filter((it) => it.vendorId === v.id)
            .map((it) => ({
                id: it.id,
                name: itemName(it, vendors, VENDOR_CATEGORIES),
                category: getCategoryLabel(itemCategoryId(it, vendors), VENDOR_CATEGORIES) || undefined,
                serial: it.serial,
                assignedTo: it.assignedTo?.targetId
                    ? (assetLabel(it.assignedTo.targetId) ?? undefined)
                    : it.assignedDriverId && account?.id
                        ? (getDriverById(account.id, it.assignedDriverId)?.name ?? undefined)
                        : undefined,
                status: it.status,
                expiryDate: it.expiryDate || undefined,
            }));

        // What they have charged, from both doors into the record.
        const fromServices: VendorBillRow[] = serviceHistory
            .filter((e) => (e.cost ?? 0) > 0 && isMine(e.vendorId, e.vendorName))
            .map((e) => ({
                id: e.id,
                source: 'service' as const,
                date: e.performedAt,
                invoiceNumber: e.invoiceNumber,
                reference: e.intervalName ?? 'One-off repair',
                assetLabel: assetLabel(e.assetId),
                labour: e.labour,
                parts: e.parts,
                total: e.cost ?? 0,
                currency: e.currency ?? 'USD',
                files: (e.files ?? []).length,
                openId: e.id,
            }));

        const fromRoadside: VendorBillRow[] = (account?.id ? getInspections(account.id) : [])
            .flatMap((i) => (i.repairBills ?? [])
                .filter((b) => isMine((b as any).vendorId, b.vendorCompany || b.vendorName))
                .map((b) => {
                    const labour = Number(b.labour ?? '') || undefined;
                    const parts = Number(b.parts ?? '') || undefined;
                    // What was typed as a total wins; otherwise the invoice is its lines.
                    const total = Number(b.amount ?? '') || ((labour ?? 0) + (parts ?? 0));
                    return {
                        id: b.id,
                        source: 'roadside' as const,
                        date: b.documentDate || b.uploadedAt,
                        invoiceNumber: b.invoiceNumber,
                        reference: `Roadside inspection · ${i.location || shortId(i.id)}`,
                        assetLabel: (b.assetIds ?? []).map((id) => assetLabel(id)).join(', ') || undefined,
                        labour,
                        parts,
                        total,
                        currency: b.currency ?? 'USD',
                        files: 1 + (b.attachments?.length ?? 0),
                        openId: i.id,
                    };
                }));

        const bills = [...fromServices, ...fromRoadside]
            .sort((a, b) => String(b.date).localeCompare(String(a.date)));

        const mineOrders = orders.filter((o) => o.vendorId === v.id);
        const addr = v.address;

        return {
            id: v.id,
            name: v.name,
            companyName: v.companyName,
            categoryLabel: getCategoryLabel(v.categoryId ?? '', VENDOR_CATEGORIES) || undefined,
            status: v.status === 'Active' ? 'Active' : 'Inactive',
            contactName: v.contactName,
            email: v.email,
            phone: v.phone,
            address: addr ? formatVendorAddress(addr) || undefined : undefined,
            items,
            orders: mineOrders.map((o) => orderRow(o)),
            bills,
            activity: vendorActivity(mineOrders, bills),
        };
    };

    /** A short, readable stand-in where a record has no number of its own. */
    const shortId = (id: string) => `#${id.slice(-6).toUpperCase()}`;

    /** What has happened with one vendor, newest first, read off the same records. */
    const vendorActivity = (mineOrders: TaskOrder[], bills: VendorBillRow[]): ActivityEntry[] => {
        const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }) : '—');
        const out: (ActivityEntry & { sort?: string })[] = [];
        for (const o of mineOrders) {
            out.push({
                id: `vo_${o.id}`, icon: Briefcase, iconTone: 'bg-blue-500',
                title: `Work order raised — ${orderRow(o).name}`,
                detail: `${o.taskIds.length} job${o.taskIds.length === 1 ? '' : 's'}`,
                at: when(o.createdAt), sort: o.createdAt,
            });
        }
        for (const b of bills) {
            out.push({
                id: `vb_${b.id}`,
                icon: b.source === 'roadside' ? TriangleAlert : Check,
                iconTone: b.source === 'roadside' ? 'bg-amber-500' : 'bg-emerald-500',
                title: `${b.source === 'roadside' ? 'Roadside repair billed' : 'Service billed'} — ${b.currency} ${b.total.toFixed(2)}`,
                detail: [b.reference, b.assetLabel, b.invoiceNumber].filter(Boolean).join(' · '),
                at: when(b.date), sort: b.date,
            });
        }
        return out
            .sort((a, b) => String(b.sort ?? '').localeCompare(String(a.sort ?? '')))
            .map(({ sort: _s, ...e }) => e);
    };

    /** What has happened to one order, newest first, read off the order and its tasks. */
    const orderActivity = (o: TaskOrder): ActivityEntry[] => {
        const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }) : '—');
        const out: (ActivityEntry & { sort?: string })[] = [];
        const vendor = vendors.find((v) => v.id === o.vendorId);
        out.push({
            id: `${o.id}-raised`, icon: Briefcase, iconTone: 'bg-blue-500',
            title: `Order raised with ${o.customVendor?.name || vendor?.companyName || vendor?.name || 'a vendor'}`,
            detail: `${o.taskIds.length} job${o.taskIds.length === 1 ? '' : 's'}${o.dueDate ? ` · due ${new Date(o.dueDate).toLocaleDateString()}` : ''}`,
            at: when(o.createdAt), sort: o.createdAt,
        });
        for (const c of o.completions ?? []) {
            const units = c.assetBreakdowns.map((b) => assetLabel(b.assetId)).join(', ');
            out.push({
                id: `${o.id}-${c.id}`, icon: Check, iconTone: 'bg-emerald-500',
                title: `Signed off${units ? ` · ${units}` : ''}`,
                detail: c.invoiceNumber ? `Invoice ${c.invoiceNumber}` : undefined,
                at: when(c.completedAt), sort: c.completedAt,
            });
        }
        for (const taskId of o.cancelledTaskIds ?? []) {
            const t = tasks.find((x) => x.id === taskId);
            out.push({
                id: `${o.id}-off-${taskId}`, icon: XCircle, iconTone: 'bg-slate-400',
                title: `Called off${t ? ` · ${assetLabel(t.assetId)}` : ''}`,
                detail: t
                    ? `${t.serviceTypeIds.map(serviceName).join(', ')} came off this order and is outstanding again.`
                    : 'A job came off this order.',
                at: when(o.createdAt), sort: 'zzy',
            });
        }
        if (o.status === 'cancelled') {
            out.push({
                id: `${o.id}-cancelled`, icon: XCircle, iconTone: 'bg-slate-400',
                title: 'Order cancelled', detail: 'Its jobs went back to being outstanding.',
                at: when(o.createdAt), sort: 'zzz',
            });
        }
        return out.sort((a, b) => String(b.sort ?? '').localeCompare(String(a.sort ?? '')));
    };

    /**
     * One entry in the record, gathered for its own page.
     *
     * Read through the event’s five keys — asset, interval, service type, order, vendor —
     * rather than stored a second time, so the page cannot disagree with the list it was
     * opened from.
     */
    const serviceRecordDetail = (e: ServiceEvent): ServiceRecordDetail => {
        const info = assetInfo(e.assetId);
        const rule = e.intervalId ? serviceIntervals.find((r) => r.id === e.intervalId) : undefined;
        const vendor = e.vendorId ? vendors.find((v) => v.id === e.vendorId) : undefined;
        const order = e.orderId ? orders.find((o) => o.id === e.orderId) : undefined;
        // The same unit’s entries against the same rule, so the record reads as a sequence.
        const sameLine = serviceHistory
            .filter((x) => x.assetId === e.assetId && x.intervalId === e.intervalId)
            .sort((a, b) => String(a.performedAt).localeCompare(String(b.performedAt)));
        const at = sameLine.findIndex((x) => x.id === e.id);

        // What this service set the next one to, in the unit its own rule runs on.
        const nextRule = rule?.intervals
            ? dueRuleFromIntervals(rule.intervals, {
                odometer: e.odometer ?? info.meter.odometer,
                engineHours: e.engineHours ?? info.meter.engineHours,
                date: new Date(e.performedAt),
            })
            : undefined;
        const nextDueText = !nextRule ? undefined
            : nextRule.unit === 'miles' ? `${(nextRule.dueAtOdometer ?? 0).toLocaleString()} mi`
                : nextRule.unit === 'engine_hours' ? `${(nextRule.dueAtEngineHours ?? 0).toLocaleString()} h`
                    : nextRule.dueAtDate ? new Date(nextRule.dueAtDate).toLocaleDateString() : undefined;

        return {
            event: e,
            asset: {
                id: e.assetId,
                label: info.label,
                kind: info.kind === 'trailer' ? 'trailer' : 'truck',
                description: info.description,
                driver: info.driver,
                odometer: info.meter.odometer,
                engineHours: info.meter.engineHours,
            },
            interval: rule ? {
                id: rule.id,
                name: rule.name,
                every: intervalText(rule.intervals),
                nextDueText,
            } : undefined,
            services: e.serviceTypeIds.map((id) => {
                const t = serviceTypes.find((x) => x.id === id);
                return { id, name: t?.name ?? serviceName(id), group: t?.group };
            }),
            vendor: vendor ? {
                id: vendor.id,
                name: vendor.companyName || vendor.name,
                contactName: vendor.contactName,
                email: vendor.email,
                phone: vendor.phone,
            } : e.vendorName ? { name: e.vendorName, contactName: e.performedByName }
                // No shop, but somebody still did it — the yard, or the driver.
                : e.performedByName
                    ? { name: e.performedBy === 'driver' ? 'Driver' : 'In-house', contactName: e.performedByName }
                    : undefined,
            order: order ? {
                id: order.id,
                name: orderRow(order).name,
                invoiceNumber: (order.completions ?? [])[0]?.invoiceNumber,
            } : undefined,
            previous: at > 0 ? sameLine[at - 1] : undefined,
            next: at >= 0 && at < sameLine.length - 1 ? sameLine[at + 1] : undefined,
        };
    };

    /**
     * Correct an entry in the record.
     *
     * The entry is rewritten rather than duplicated — a correction is not a second service.
     * Two things follow from it, and both are done here rather than left to drift:
     *
     *   · the enrolment’s last service is the newest entry for that pair, so it moves on
     *     its own the moment the ledger changes;
     *   · the task this visit raised had its due figure worked out from the OLD reading, so
     *     it is worked out again from the corrected one. Otherwise the history says the
     *     service happened at 190,000 miles and the countdown still thinks 212,000.
     */
    const handleCorrectEvent = (eventId: string, patch: ServiceEventPatch) => {
        const before = serviceHistory.find((e) => e.id === eventId);
        if (!before) return;
        setServiceHistory((prev) => correctEvent(prev, eventId, patch));

        /*
         * The order's copy of the same visit, brought along.
         *
         * A completion is the order's own note of what its line came back with — the
         * readings and the money — and it is what the order's totals are added up from.
         * The entry is the record. Correcting one and not the other is how a work order
         * ends up insisting a service cost $480 while the unit's history, the interval's
         * history and the invoice attached to it all say $412.50.
         *
         * Only the fields the correction actually carries are moved, and only the
         * breakdown for this unit: an order covering two lines on one visit must not have
         * the second one's figures rewritten by a correction to the first.
         */
        if (before.orderId && before.taskId) {
            const taskId = before.taskId;
            setOrders((prev) => prev.map((o) => (o.id !== before.orderId ? o : {
                ...o,
                completions: (o.completions ?? []).map((c) => (!c.taskIds.includes(taskId) ? c : {
                    ...c,
                    invoiceDate: patch.performedAt?.slice(0, 10) ?? c.invoiceDate,
                    currency: (patch.currency === 'CAD' ? 'CAD' : patch.currency === 'USD' ? 'USD' : c.currency),
                    assetBreakdowns: c.assetBreakdowns.map((b) => (b.assetId !== before.assetId ? b : {
                        ...b,
                        finalOdometer: patch.odometer ?? b.finalOdometer,
                        finalEngineHours: patch.engineHours ?? b.finalEngineHours,
                        costs: {
                            ...b.costs,
                            partsAndSupplies: patch.parts ?? b.costs?.partsAndSupplies ?? 0,
                            labour: patch.labour ?? b.costs?.labour ?? 0,
                            totalPaid: patch.cost ?? b.costs?.totalPaid ?? 0,
                        },
                    })),
                })),
            })));
        }

        const rule = before.intervalId ? serviceIntervals.find((r) => r.id === before.intervalId) : undefined;
        if (!before.raisedTaskId || !rule?.intervals) return;
        const odometer = patch.odometer ?? before.odometer ?? assetMeter(before.assetId).odometer;
        const engineHours = patch.engineHours ?? before.engineHours ?? assetMeter(before.assetId).engineHours;
        const dueRule = dueRuleFromIntervals(rule.intervals, {
            odometer, engineHours, date: new Date(patch.performedAt ?? before.performedAt),
        });
        setTasks((prev) => prev.map((t) => (t.id === before.raisedTaskId
            ? {
                ...t,
                dueRule,
                status: statusForDue(dueRule, assetMeter(t.assetId)),
                meterSnapshot: { odometer, engineHours, capturedAt: patch.performedAt ?? before.performedAt },
            }
            : t)));
    };

    const handleCreateOrder = (orderData: any) => {
        const batchId = `batch_${Math.random().toString(36).substr(2, 9)}`;
        const newOrders: TaskOrder[] = [];

        const taskIdsToProcess: string[] = orderData.taskIds && orderData.taskIds.length > 0
            ? orderData.taskIds
            : selectedTaskIds;

        // Materialize lightweight tasks for any direct (no-schedule) entries
        const directTaskRecords: MaintenanceTask[] = (orderData.directTasks || []).map((dt: { assetId: string; serviceTypeIds: string[] }) => ({
            id: `task_${Math.random().toString(36).substr(2, 9)}`,
            assetId: dt.assetId,
            scheduleId: `direct_${batchId}`,
            serviceTypeIds: dt.serviceTypeIds,
            status: 'in_progress' as MaintenanceTaskStatus,
            meterSnapshot: { odometer: 0, engineHours: 0, capturedAt: new Date().toISOString() },
            createdAt: new Date().toISOString(),
        }));

        // Group all task IDs (existing + direct) by asset
        const tasksByAsset: Record<string, string[]> = {};
        taskIdsToProcess.forEach((taskId) => {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                if (!tasksByAsset[task.assetId]) tasksByAsset[task.assetId] = [];
                tasksByAsset[task.assetId].push(taskId);
            }
        });
        directTaskRecords.forEach(t => {
            if (!tasksByAsset[t.assetId]) tasksByAsset[t.assetId] = [];
            tasksByAsset[t.assetId].push(t.id);
        });

        Object.entries(tasksByAsset).forEach(([assetId, assetTaskIds]) => {
            // One order per asset, so the bill follows the unit it was spent on: a bill
            // naming two trailers goes on both orders, one naming neither goes on all.
            const bill = orderData.bill && (!orderData.bill.assetIds?.length
                || orderData.bill.assetIds.includes(assetId))
                ? orderData.bill
                : undefined;
            const newOrder: TaskOrder = {
                id: `wo_${Math.random().toString(36).substr(2, 9)}`,
                // One name typed on the form covers the run; each unit's own order still
                // reads as that unit's, because the name is shown beside its asset column.
                name: orderData.name,
                taskIds: assetTaskIds,
                vendorId: orderData.vendorId,
                // Handed to one of our own drivers rather than sent to a shop. The order
                // is still an order: it says what and by when, and closing it is what
                // resets the countdown.
                assignedDriverId: orderData.assignedDriverId,
                assignedDriverName: orderData.assignedDriverName,
                status: "open",
                createdAt: orderData.createDate,
                dueDate: orderData.dueDate,
                notes: orderData.notes,
                meta: orderData.meta,
                bill,
                completions: [],
                batchId: batchId
            };
            newOrders.push(newOrder);
        });

        setOrders([...newOrders, ...orders]);

        // Add direct tasks; flip existing selected tasks to in_progress
        const updatedTasks = tasks.map(t => taskIdsToProcess.includes(t.id) ? { ...t, status: "in_progress" as MaintenanceTaskStatus } : t);
        setTasks([...directTaskRecords, ...updatedTasks]);

        setSelectedTaskIds([]);
        setPendingWorkRows([]);
        setIsCreateOrderModalOpen(false);
        setActiveTab('orders');
    };

    /**
     * What the order form was opened with, as jobs rather than tasks.
     *
     * An interval that has not raised a task yet still has work to do — ticking four
     * intervals on an asset where only one had a task produced an order with one line on
     * it. A job is an asset and a piece of work; the task behind it is an implementation
     * detail the form fills in on save.
     */
    const orderWorkRows = useMemo(() => {
        const rows = selectedTaskIds.map((taskId) => {
            const t = tasks.find((x) => x.id === taskId);
            if (!t) return undefined;
            const rule = serviceIntervals.find((r) => r.taskIds.includes(taskId));
            return {
                assetId: t.assetId,
                intervalId: rule?.id,
                name: rule?.name || t.serviceTypeIds.map(serviceName).join(", ") || "Maintenance",
                serviceTypeIds: t.serviceTypeIds,
                taskId: t.id,
                status: t.status,
            };
        }).filter(Boolean) as {
            assetId: string; intervalId?: string; name: string;
            serviceTypeIds: string[]; taskId?: string; status?: string;
        }[];
        return [...rows, ...pendingWorkRows];
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTaskIds, tasks, serviceIntervals, pendingWorkRows]);

    const handleAddVendor = (newVendor: any) => {
        // Tag the new vendor with the active carrier so it appears only in this
        // carrier's vendor list when the super-admin switches accounts.
        const tagged = { ...newVendor, accountId: newVendor.accountId ?? account?.id };
        setVendors((prev) => [...prev, tagged]);
    };

    /**
     * What an order is actually doing, read off its tasks.
     *
     * Its own flag only says whether somebody closed it. A visit with two of its three
     * jobs signed off is neither open nor completed, and calling that "open" is how work
     * that is nearly done gets chased a second time.
     */
    const orderState = (order: TaskOrder, orderTasks: MaintenanceTask[]): WorkOrderRow['state'] => {
        if (order.status === 'cancelled') return 'cancelled';
        const ids = orderTasks.length ? orderTasks.map((t) => t.id) : order.taskIds;
        if (ids.length === 0) return order.status === 'completed' ? 'completed' : 'open';
        // An order is open until every line on it has been answered. "Answered" is not
        // "done": a job the shop handed back is settled too, and an order still showing
        // as open because of a line nobody is ever going to do gets chased forever.
        const states = ids.map((id) => jobStateOf(order, id));
        if (states.some((x) => x === 'open')) return 'open';
        // Every line answered. One where nothing was actually done was itself called off;
        // calling that "completed" would put a visit on the record that never happened.
        return states.some((x) => x === 'completed') ? 'completed' : 'cancelled';
    };

    /**
     * Where one job stands ON an order.
     *
     * Read off the order rather than the task, because they answer different questions: a
     * called-off job is outstanding again everywhere else — it still needs doing, just not
     * here — and the task has no way to say "not on this one".
     */
    const jobStateOf = (order: TaskOrder, taskId: string): 'open' | 'completed' | 'cancelled' => {
        if ((order.cancelledTaskIds ?? []).includes(taskId)) return 'cancelled';
        if ((order.completions ?? []).some((c) => c.taskIds.includes(taskId))) return 'completed';
        return 'open';
    };

    /**
     * What to call an order.
     *
     * Not its id. "#1_OPEN" is a key leaking onto the screen — it says nothing about the
     * work and nobody in a yard refers to one that way. An order is the job and the unit
     * it is on, so that is its name.
     */
    const orderName = (services: string[], assets: string[]) => {
        const work = services.length === 0 ? 'Maintenance'
            : services.length > 2 ? `${services[0]} +${services.length - 1}`
                : services.join(', ');
        const where = assets.length === 1 ? assets[0]
            : assets.length === 0 ? 'no unit'
                : `${assets.length} units`;
        return `${work} — ${where}`;
    };

    /**
     * One order as a list row.
     *
     * `scope` narrows it to the tasks the screen is about — an asset’s page should show what
     * that unit cost, not a share of somebody else’s invoice.
     */
    const orderRow = useCallback((o: TaskOrder, scope?: (t: MaintenanceTask) => boolean): WorkOrderRow => {
        const all = tasks.filter((t) => o.taskIds.includes(t.id));
        const mine = scope ? all.filter(scope) : all;
        const vendor = vendors.find((v) => v.id === o.vendorId);
        const assetIds = [...new Set(mine.map((t) => t.assetId))];
        const closed = (o.completions ?? [])
            .flatMap((c) => c.assetBreakdowns)
            .filter((b) => assetIds.includes(b.assetId))
            .reduce((t, b) => t + (b.costs?.totalPaid ?? 0), 0);
        const assets = assetIds.map((id) => assetLabel(id));
        const services = [...new Set(mine.flatMap((t) => t.serviceTypeIds))].map(serviceName);
        return {
            id: o.id,
            name: o.name?.trim() || orderName(services, assets),
            vendor: o.customVendor?.name || vendor?.companyName || vendor?.name || 'Vendor',
            // Who took it there, where anybody did. Two facts, two columns.
            driver: o.assignedDriverName,
            state: orderState(o, all),
            createdAt: o.createdAt,
            dueDate: o.dueDate,
            assets,
            services,
            taskCount: mine.length,
            doneCount: mine.filter((t) => jobStateOf(o, t.id) === 'completed').length,
            total: closed || o.bill?.total || undefined,
            currency: o.bill?.currency ?? 'USD',
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, vendors]);

    const orderRows = useMemo(
        () => orders.map((o) => orderRow(o))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
        [orders, orderRow],
    );

    /**
     * The order a job is already on, while that order is still running.
     *
     * This is what stops the same work being sent to a shop twice. A row on a live order
     * cannot be ticked for another one; it becomes orderable again when that order is
     * completed, and by then the completion has raised the NEXT service — which is the one
     * the next order covers.
     */
    const openOrderOf = useCallback((taskId: string) => {
        const o = orders.find((x) => x.taskIds.includes(taskId) && x.status !== 'cancelled');
        if (!o) return undefined;
        const mine = tasks.filter((t) => o.taskIds.includes(t.id));
        // Per line, because an order carries several and they are answered separately: a
        // job the shop handed back is free to go elsewhere while the rest of the visit runs.
        if (jobStateOf(o, taskId) !== 'open') return undefined;
        if (orderState(o, mine) !== 'open') return undefined;
        return orderName(
            [...new Set(mine.flatMap((t) => t.serviceTypeIds))].map(serviceName),
            [...new Set(mine.map((t) => t.assetId))].map(assetLabel),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orders, tasks]);

    /**
     * Save a rule, new or edited.
     *
     * Editing reconciles rather than replaces: an asset that is still on the rule keeps
     * the task already raised against it (and its history), one that has been taken off
     * loses only what is still outstanding, and a new one gets a task counting from its
     * own meter. Replacing the lot would reset every countdown on the fleet.
     */
    const saveInterval = (schedule: any, previous?: ServiceIntervalRow) => {
        const assetIds: string[] = schedule.assignment.entityIds;
        const keep = new Set(assetIds);
        const owned = new Set(previous?.taskIds ?? []);
        const existingByAsset = new Map(
            tasks.filter((t) => owned.has(t.id)).map((t) => [t.assetId, t]),
        );

        const newTasks: MaintenanceTask[] = [];

        assetIds.forEach((assetId: string) => {
            const already = existingByAsset.get(assetId);
            if (already && already.status !== "completed" && already.status !== "cancelled") return;
            // The meter the rule counts from is this asset’s own reading, not zero — a
            // truck on 245,000 miles with a 15,000-mile rule is due at 260,000, and
            // counting from zero made every new task instantly overdue.
            const meterSnapshot = {
                odometer: assetMeter(assetId).odometer,
                engineHours: assetMeter(assetId).engineHours,
                capturedAt: new Date().toISOString(),
            };
            newTasks.push({
                id: `task_${Math.random().toString(36).substr(2, 9)}`,
                assetId,
                scheduleId: schedule.id,
                serviceTypeIds: schedule.serviceTypeIds,
                status: 'upcoming',
                meterSnapshot,
                dueRule: dueRuleFromIntervals(schedule.intervals, meterSnapshot),
                createdAt: new Date().toISOString(),
            });
        });

        // The name, the clocks and "apply to all" have nowhere to live on a task, so they
        // are kept beside them and read back by the interval list.
        setIntervalMeta((prev) => ({
            ...prev,
            [schedule.id]: {
                name: schedule.name,
                tier: schedule.tier,
                intervals: schedule.intervals,
                // A tier that came with the system stays one through an edit: the clocks
                // and the units on it are the carrier's to change, the fact that every
                // other maintenance document is written against it is not.
                system: prev[schedule.id]?.system,
                applyToAll: !!schedule.assignment?.applyToAll,
                createdAt: prev[schedule.id]?.createdAt ?? schedule.createdAt,
                assets: prev[schedule.id]?.assets,
                serviceTypeIds: schedule.serviceTypeIds,
            },
        }));

        setTasks((prev) => [
            ...prev
                // An asset taken off the rule loses what it has not done yet; what it HAS
                // done happened, and stays.
                .filter((t) => !owned.has(t.id)
                    || keep.has(t.assetId)
                    || t.status === "completed" || t.status === "cancelled")
                // What is still on it follows the rule’s new services and clock.
                .map((t) => (owned.has(t.id) && keep.has(t.assetId)
                    && t.status !== "completed" && t.status !== "cancelled"
                    ? {
                        ...t,
                        serviceTypeIds: schedule.serviceTypeIds,
                        dueRule: dueRuleFromIntervals(schedule.intervals, t.meterSnapshot) ?? t.dueRule,
                    }
                    : t)),
            ...newTasks,
        ]);
    };

    /**
     * The bits of a rule we keep beside its tasks, for a rule that has never had any
     * kept (every seeded one). Writing them under the rule’s derived id leaves the
     * grouping alone, because no task carries that id as its schedule.
     */
    const metaFor = (row: ServiceIntervalRow, prev: Record<string, ServiceIntervalMeta>): ServiceIntervalMeta => ({
        name: row.derivedName ? undefined : row.name,
        intervals: row.intervals,
        applyToAll: row.applyToAll,
        createdAt: row.createdAt,
        ...prev[row.id],
        // The services ARE the rule, so they follow what it covers now rather than
        // whatever was true the first time somebody touched its asset list.
        serviceTypeIds: row.serviceTypeIds,
    });

    /**
     * A service that has already happened, filed by hand.
     *
     * The other door into the ledger. A work order is the planned route — raise it, send
     * it, close it with an invoice — and this is the one real life takes just as often:
     * the unit was already in the shop, the driver had it done on the road, the yard
     * mechanic did it on a Saturday. Nobody raised an order, and what exists is a receipt.
     *
     * It writes the SAME entry a closed order writes, which is the whole point: the
     * countdown restarts because this is now the newest event for the pair, the history
     * reads as one sequence whichever way each visit got in, and the spend on the unit
     * adds up. Nothing here reaches into the enrolment to set a figure by hand.
     */
    const fileServiceRecord = (
        row: ServiceIntervalRow,
        assetId: string,
        draft: ServiceRecordDraft,
        /**
         * The order line this answers, where it came off one.
         *
         * The ledger entry is the SAME entry either way — that is the point of having one
         * — but an entry that came off an order has to say so, or three things break: the
         * order cannot show what its own line produced, marking the line not-done has no
         * handle to withdraw the visit by, and the order's costs and the unit's history
         * add the same money up twice from different sides.
         */
        link?: { orderId: string; taskId: string },
    ) => {
        setIntervalTracking(row, assetId, true, {
            odometer: draft.odometer,
            engineHours: draft.engineHours,
            date: draft.date,
            record: {
                // A figure copied off the shop's invoice IS the shop's figure; one the
                // yard typed about its own work is the yard's. The record says which,
                // because a reading nobody took and a reading somebody read are not the
                // same evidence.
                readingSource: draft.vendorName ? 'shop' : 'typed',
                ...(link ? { source: 'work_order' as const, orderId: link.orderId, taskId: link.taskId } : {}),
                vendorId: draft.vendorId,
                vendorName: draft.vendorName,
                performedBy: draft.performedBy,
                performedByName: draft.performedByName,
                driverId: draft.driverId,
                labour: draft.labour,
                parts: draft.parts,
                cost: draft.cost,
                currency: draft.currency,
                invoiceNumber: draft.invoiceNumber,
                notes: draft.notes,
                remarks: draft.remarks,
                files: draft.files.length ? draft.files : undefined,
            },
        });
    };

    /**
     * A spreadsheet of past services, onto one pair's record.
     *
     * Every row becomes an entry, because every row IS one: a visit that happened, with
     * what it read and what it cost. They are filed as opening records — what the carrier
     * came in with — rather than as work entered today, because that is what they are.
     *
     * The newest row goes in through the same door a filed record does, so if it is later
     * than what the rule is counting from, the countdown moves to it. Anything older than
     * that joins the record behind it and moves nothing: importing history should not
     * un-service a truck.
     */
    const importBulkServices = (
        row: ServiceIntervalRow, assetId: string, line: AssetIntervalLine, rows: BulkServiceRow[],
    ) => {
        if (rows.length === 0) return;
        const asEvent = (r: BulkServiceRow): ServiceEvent => ({
            id: newEventId(),
            assetId,
            intervalId: row.id,
            intervalName: row.name,
            serviceTypeIds: row.serviceTypeIds,
            performedAt: `${r.performedAt}T09:00:00.000Z`,
            odometer: r.odometer,
            engineHours: r.engineHours,
            // A figure off a shop's invoice is the shop's; one the yard typed is the yard's.
            readingSource: r.vendorName ? 'shop' : 'typed',
            source: 'seed',
            vendorName: r.vendorName,
            performedBy: r.performedBy,
            performedByName: r.performedByName,
            labour: r.labour,
            parts: r.parts,
            cost: r.cost,
            currency: r.currency ?? 'USD',
            notes: r.notes,
            remarks: r.remarks,
        });

        const countingFrom = line.lastService?.date ?? line.enrolled?.lastServiceDate;
        const [newest, ...older] = rows;
        const movesTheClock = !!newest.performedAt
            && (!countingFrom || newest.performedAt > countingFrom);

        if (!movesTheClock) {
            setServiceHistory((prev) => [...rows.map(asEvent), ...prev]);
            return;
        }
        if (older.length) setServiceHistory((prev) => [...older.map(asEvent), ...prev]);
        setIntervalTracking(row, assetId, true, {
            odometer: newest.odometer,
            engineHours: newest.engineHours,
            date: newest.performedAt,
            record: {
                readingSource: newest.vendorName ? 'shop' : 'typed',
                source: 'seed',
                vendorName: newest.vendorName,
                performedBy: newest.performedBy,
                performedByName: newest.performedByName,
                labour: newest.labour,
                parts: newest.parts,
                cost: newest.cost,
                currency: newest.currency ?? 'USD',
                notes: newest.notes,
                remarks: newest.remarks,
            },
        });
    };

    /**
     * Fill one pair's record with the past it would have had.
     *
     * For looking at the screen, not for the fleet: an interval nothing has ever been done
     * to shows an empty table and three dashes where the averages go, and there is no way
     * to tell from that whether the page works.
     *
     * The newest entry lands exactly on the figure the countdown is ALREADY measured from,
     * so loading it moves nothing: the due date, the status and the clocks read the same
     * afterwards. Only the history behind them appears.
     */
    const loadSampleHistory = (row: ServiceIntervalRow, assetId: string, line: AssetIntervalLine) => {
        const meter = assetMeter(assetId);
        const km = row.intervals?.mileage?.unit === 'km';
        // Where the countdown already stands — or, on a pair nothing has ever been done
        // to, where it would stand if the last one had been today.
        const anchor = {
            date: line.lastService?.date ?? line.enrolled?.lastServiceDate
                ?? new Date().toISOString().slice(0, 10),
            odometer: line.lastService?.odometer ?? line.enrolled?.lastOdometer
                ?? (km ? Math.round(meter.odometer / 0.621371) : meter.odometer),
            engineHours: line.enrolled?.lastEngineHours ?? meter.engineHours,
        };

        const events = sampleHistoryFor({
            assetId,
            intervalId: row.id,
            intervalName: row.name,
            serviceTypeIds: row.serviceTypeIds,
            every: {
                miles: row.intervals?.mileage?.every,
                hours: row.intervals?.engineHours?.every,
                days: row.intervals?.days?.every,
            },
            anchor,
            vendors: vendors.map((v) => ({ id: v.id, name: v.companyName || v.name })),
            drivers: account?.id
                ? getDriversForAccount(account.id).map((d) => ({ id: d.id, name: d.name }))
                : [],
        });

        /*
         * The newest one goes in through the same door a filed record does.
         *
         * Appending all of them straight to the ledger would leave a pair with four
         * services on its record and "nothing is counting yet" written across the middle
         * of it, because the enrolment and the task behind the countdown are not derived
         * from the ledger — only the last-service figures are. So the newest sample is
         * filed the way a real one is, which switches the rule on and raises the next
         * task, and the ones before it join the record behind it.
         */
        const [newest, ...older] = events;
        if (older.length) setServiceHistory((prev) => [...older, ...prev]);
        if (!newest) return;
        setIntervalTracking(row, assetId, true, {
            odometer: row.intervals?.mileage ? anchor.odometer : undefined,
            engineHours: row.intervals?.engineHours ? anchor.engineHours : undefined,
            date: anchor.date,
            record: {
                readingSource: 'shop',
                vendorId: newest.vendorId,
                vendorName: newest.vendorName,
                performedBy: newest.performedBy,
                performedByName: newest.performedByName,
                driverId: newest.driverId,
                cost: newest.cost,
                currency: newest.currency,
                invoiceNumber: newest.invoiceNumber,
                files: newest.files,
            },
        });
    };

    /**
     * Warn, or do not warn, before this rule falls due on this unit.
     *
     * A setting, not a fact: the ledger holds what happened and the enrolment holds how
     * this unit is watched, which is why this writes to the enrolment and nothing else.
     * Switching it off does not stop the countdown — the rule still comes due, you are
     * simply not told before it does.
     */
    /**
     * The whole of the warnings, not just whether there are any.
     *
     * Written to the enrolment beside the readings, because how early THIS unit is warned
     * about THIS rule is a fact about that pair and not about the rule across the fleet.
     */
    const setIntervalReminders = (
        row: ServiceIntervalRow, assetId: string, reminders: ReminderSettings,
    ) => {
        setIntervalMeta((prev) => {
            const base = metaFor(row, prev);
            const was = base.assets?.[assetId];
            return {
                ...prev,
                [row.id]: {
                    ...base,
                    assets: {
                        ...(base.assets ?? {}),
                        [assetId]: {
                            ...(was ?? { enabled: true }),
                            reminders,
                            updatedAt: new Date().toISOString(),
                        },
                    },
                },
            };
        });
    };

    const setIntervalMonitoring = (row: ServiceIntervalRow, assetId: string, enabled: boolean) => {
        setIntervalMeta((prev) => {
            const base = metaFor(row, prev);
            const was = base.assets?.[assetId];
            return {
                ...prev,
                [row.id]: {
                    ...base,
                    assets: {
                        ...(base.assets ?? {}),
                        [assetId]: {
                            ...(was ?? { enabled: true }),
                            // Switched on for the first time means the usual warnings.
                            reminders: { ...(was?.reminders ?? DEFAULT_REMINDERS), enabled },
                            updatedAt: new Date().toISOString(),
                        },
                    },
                },
            };
        });
    };

    /** Put assets on a rule. They arrive un-counted: see `setIntervalTracking`. */
    const addIntervalAssets = (row: ServiceIntervalRow, assetIds: string[]) => {
        setIntervalMeta((prev) => {
            const base = metaFor(row, prev);
            const assets: Record<string, AssetEnrollment> = { ...(base.assets ?? {}) };
            for (const id of assetIds) {
                if (!assets[id]) assets[id] = { enabled: false, updatedAt: new Date().toISOString() };
            }
            return { ...prev, [row.id]: { ...base, assets } };
        });
    };

    /**
     * Switch a rule on or off for one asset.
     *
     * Switching it ON is the moment the countdown gets its starting point: the odometer,
     * the hour meter or the date of the last service, whichever clocks the rule runs on.
     * From there the due figure is arithmetic. Switching it OFF drops only what the asset
     * has not done yet — what it has done happened, and stays on the record.
     */
    const setIntervalTracking = (
        row: ServiceIntervalRow,
        assetId: string,
        enabled: boolean,
        last?: {
            odometer?: number; engineHours?: number; date?: string; reminders?: ReminderSettings;
            /**
             * The rest of a filed service record — vendor, receipt, bill, document.
             *
             * Carried through here rather than appended separately so there is ONE event
             * per service. Writing the reading and then the paperwork as two appends
             * would have the truck serviced twice, which is the fault the ledger exists
             * to make impossible.
             */
            record?: Partial<ServiceEvent>;
        },
    ) => {
        const now = new Date().toISOString();

        setIntervalMeta((prev) => {
            const base = metaFor(row, prev);
            const was = base.assets?.[assetId];
            /*
             * Switched off, it is not watched either.
             *
             * A warning is a thing said BEFORE a countdown ends, so a rule that is not
             * counting this unit has no "before" to say it in. Leaving the preference on
             * meant the unit's list said tracking Off while the record's own dialog said
             * Enabled %s two switches for one fact, disagreeing. The choices themselves are
             * kept, so switching the rule back on restores the warnings that were set.
             */
            const reminders = last?.reminders
                ?? was?.reminders
                ?? (enabled ? DEFAULT_REMINDERS : undefined);
            return {
                ...prev,
                [row.id]: {
                    ...base,
                    assets: {
                        ...(base.assets ?? {}),
                        [assetId]: {
                            enabled,
                            lastOdometer: last?.odometer ?? was?.lastOdometer,
                            lastEngineHours: last?.engineHours ?? was?.lastEngineHours,
                            lastServiceDate: last?.date ?? was?.lastServiceDate,
                            // Switched on without a word about warnings means the usual ones.
                            reminders: reminders && { ...reminders, enabled: enabled && reminders.enabled },
                            updatedAt: now,
                        },
                    },
                },
            };
        });

        /*
         * Saying when something was last done is a fact about the past, so it joins the
         * record rather than quietly replacing a figure in the enrolment. It is marked as
         * typed, not measured, because that is what it is.
         */
        if (enabled && (last?.odometer != null || last?.engineHours != null || last?.date)) {
            setServiceHistory((prev) => [{
                id: newEventId(),
                assetId,
                intervalId: row.id,
                intervalName: row.name,
                serviceTypeIds: row.serviceTypeIds,
                performedAt: last?.date ? `${last.date}T09:00:00.000Z` : now,
                odometer: last?.odometer,
                engineHours: last?.engineHours,
                readingSource: 'typed',
                source: 'manual',
                // Everything an "add record" knew and a bare "last service" did not.
                ...(last?.record ?? {}),
            }, ...prev]);
        }

        const owned = new Set(row.taskIds);
        const outstanding = (t: MaintenanceTask) =>
            t.status !== "completed" && t.status !== "cancelled";

        if (!enabled) {
            setTasks((prev) => prev.filter((t) =>
                !(owned.has(t.id) && t.assetId === assetId && outstanding(t))));
            return;
        }

        // Kilometres are what some fleets read; the meter on a task is miles.
        const km = row.intervals?.mileage?.unit === 'km';
        const meter = assetMeter(assetId);
        const fromOdometer = last?.odometer != null
            ? (km ? Math.round(last.odometer * 0.621371) : last.odometer)
            : meter.odometer;
        const fromEngineHours = last?.engineHours ?? meter.engineHours;
        const fromDate = last?.date ? new Date(`${last.date}T08:00:00`) : new Date();

        const dueRule = dueRuleFromIntervals(row.intervals, {
            odometer: fromOdometer, engineHours: fromEngineHours, date: fromDate,
        });
        const meterSnapshot = { odometer: fromOdometer, engineHours: fromEngineHours, capturedAt: now };
        const status = statusForDue(dueRule, meter);

        setTasks((prev) => {
            const already = prev.find((t) => owned.has(t.id) && t.assetId === assetId && outstanding(t));
            if (already) {
                return prev.map((t) => (t.id === already.id
                    ? { ...t, meterSnapshot, dueRule, status, serviceTypeIds: row.serviceTypeIds }
                    : t));
            }
            return [...prev, {
                id: `task_${Math.random().toString(36).substr(2, 9)}`,
                assetId,
                scheduleId: row.id,
                serviceTypeIds: row.serviceTypeIds,
                status,
                meterSnapshot,
                dueRule,
                createdAt: now,
            }];
        });
    };

    /**
     * Take an asset off a rule.
     *
     * Its outstanding task goes with it — the rule is no longer asking for that work. What
     * the asset has already had done stays on the record, which is why it is marked off
     * the rule rather than forgotten: a completed task would otherwise put it back.
     */
    const removeIntervalAsset = (row: ServiceIntervalRow, assetId: string) => {
        setIntervalMeta((prev) => {
            const base = metaFor(row, prev);
            return {
                ...prev,
                [row.id]: {
                    ...base,
                    assets: {
                        ...(base.assets ?? {}),
                        [assetId]: {
                            ...(base.assets?.[assetId] ?? { enabled: false }),
                            enabled: false,
                            removed: true,
                            updatedAt: new Date().toISOString(),
                        },
                    },
                },
            };
        });

        const owned = new Set(row.taskIds);
        setTasks((prev) => prev.filter((t) => !(owned.has(t.id) && t.assetId === assetId
            && t.status !== "completed" && t.status !== "cancelled")));
    };

    /**
     * What has happened to one asset, newest first.
     *
     * Derived from the tasks, the orders and the two annual records rather than kept as
     * its own log: a trail that can disagree with the records it describes is worse than
     * no trail at all.
     */
    const activityFor = (assetId: string) => {
        const when = (iso?: string) => (iso ? new Date(iso).toLocaleString(undefined, {
            year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        }) : "—");
        const out: (ActivityEntry & { sort?: string })[] = [];

        for (const t of tasks.filter((x) => x.assetId === assetId)) {
            const services = t.serviceTypeIds.map(serviceName).join(", ");
            out.push({
                id: `${t.id}-made`, icon: Calendar, iconTone: "bg-blue-500",
                title: `Task raised — ${services}`,
                detail: t.dueRule
                    ? `Due at ${t.dueRule.unit === "miles" ? `${(t.dueRule.dueAtOdometer ?? 0).toLocaleString()} mi`
                        : t.dueRule.unit === "engine_hours" ? `${(t.dueRule.dueAtEngineHours ?? 0).toLocaleString()} h`
                            : t.dueRule.dueAtDate ? new Date(t.dueRule.dueAtDate).toLocaleDateString() : "—"}`
                    : "No clock — scheduled by hand",
                at: when(t.createdAt), sort: t.createdAt,
            });
            if (t.status === "completed") {
                out.push({
                    id: `${t.id}-done`, icon: CheckSquare, iconTone: "bg-emerald-500",
                    title: `Completed — ${services}`,
                    detail: t.meterSnapshot?.odometer ? `${t.meterSnapshot.odometer.toLocaleString()} mi` : undefined,
                    at: when(t.meterSnapshot?.capturedAt), sort: t.meterSnapshot?.capturedAt,
                });
            }
            if (t.status === "overdue") {
                out.push({
                    id: `${t.id}-overdue`, icon: AlertCircle, iconTone: "bg-red-500",
                    title: `Overdue — ${services}`,
                    at: when(t.meterSnapshot?.capturedAt), sort: t.meterSnapshot?.capturedAt,
                });
            }
            const order = orders.find((o) => o.taskIds.includes(t.id));
            if (order) {
                out.push({
                    id: `${t.id}-order`, icon: Briefcase, iconTone: "bg-violet-500",
                    title: `On work order #${order.id.slice(-6).toUpperCase()}`,
                    detail: services,
                    at: when(order.createdAt), sort: order.createdAt,
                });
            }
        }

        // The two annual records, as the asset form filed them.
        const annual = annualOf(assetId);
        const record = (label: string, c?: AnnualCapture) => {
            if (!c) return;
            out.push({
                id: `${label}-filed`, icon: ShieldCheck, iconTone: "bg-blue-600",
                title: `${label} filed`,
                detail: [
                    c.lastDate && `done ${new Date(`${c.lastDate}T08:00:00`).toLocaleDateString()}`,
                    c.odometer != null && `${c.odometer.toLocaleString()} ${c.odometerUnit === "km" ? "km" : "mi"}`,
                    c.nextDue && `next due ${new Date(`${c.nextDue}T08:00:00`).toLocaleDateString()}`,
                ].filter(Boolean).join(" · "),
                by: c.capturedBy,
                at: when(c.capturedAt), sort: c.capturedAt,
            });
        };
        record("Annual Safety", annual.safety);
        record("Annual Preventive Maintenance", annual.pm);

        return out.sort((a, b) => String(b.sort ?? "").localeCompare(String(a.sort ?? "")));
    };

    /**
     * The work orders one asset is on, newest first.
     *
     * An order is raised per asset, so "is this unit on an order" is a question about the
     * tasks it owns — which is also what makes the cost on it this asset’s cost rather
     * than a share of somebody else’s invoice.
     */
    const workOrdersFor = (assetId: string): WorkOrderRow[] =>
        orders
            .filter((o) => tasks.some((t) => o.taskIds.includes(t.id) && t.assetId === assetId))
            .map((o) => orderRow(o, (t) => t.assetId === assetId))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    /** The work orders raised against one rule, whichever unit they were for. */
    const workOrdersForInterval = (rule: ServiceIntervalRow): WorkOrderRow[] => {
        const owned = new Set(rule.taskIds);
        return orders
            .filter((o) => o.taskIds.some((id) => owned.has(id)))
            .map((o) => orderRow(o, (t) => owned.has(t.id)))
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    };

    /** One asset, as the rule’s page needs it: what it is, who drives it, where its meters are. */
    const assetInfo = useCallback((id: string) => {
        const a = getAsset(id);
        return {
            id,
            label: a?.unitNumber ?? id,
            kind: kindOf(a),
            description: a ? [a.year, a.make, a.model].filter(Boolean).join(' ') : undefined,
            driver: driverOf(id),
            meter: assetMeter(id),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assetMeter, account?.id]);

    /**
     * The fleet, with every rule each asset is on.
     *
     * Built here rather than in the table because the rules, the tasks and the fleet all
     * live here; the table is handed finished rows and does not have to know how a rule
     * comes to exist.
     */
    const maintenanceAssets = useMemo<MaintenanceAssetRow[]>(() => fleet
        .map((asset) => {
            const info = assetInfo(asset.id);
            return assetMaintenanceRow(
                { id: asset.id, label: info.label, kind: info.kind, description: info.description, driver: info.driver, meter: info.meter },
                serviceIntervals,
                tasks,
                serviceName,
                {
                    annualSafety: annualOf(asset.id).safety,
                    openOrders: (ids) => orders.filter((o) => o.status === "open"
                        && o.taskIds.some((id) => ids.includes(id))).length,
                },
            );
        })
        .sort((a, b) => ASSET_STATE_RANK[a.state] - ASSET_STATE_RANK[b.state] || a.label.localeCompare(b.label)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [fleet, serviceIntervals, tasks, orders, assetInfo, annualOf]);

    /*
     * Correcting an entry — the same form that filed it, in front of whatever you were
     * reading it on.
     *
     * Before every other view, so Edit works from all four lists that show the record
     * without each of them having to close itself first. They used to, which is why Edit
     * from an interval dropped you back to the Maintenance list and put a small dialog
     * over it: the page you were on was gone before the dialog arrived.
     */
    const editingEvent = editingEventId
        ? serviceHistory.find((e) => e.id === editingEventId) : undefined;
    if (editingEvent) {
        const rule = editingEvent.intervalId
            ? serviceIntervals.find((r) => r.id === editingEvent.intervalId) : undefined;
        /* Correcting a visit does not move it to a different shop: the order was raised
           with one, and an entry that names another is a bill filed against a company
           that never saw the truck. Everything else on it is still open to correction. */
        const fromOrder = editingEvent.orderId
            ? orders.find((o) => o.id === editingEvent.orderId) : undefined;
        const fromVendor = vendors.find((v) => v.id === fromOrder?.vendorId);
        return (
            <AddServiceRecordPage
                asset={assetInfo(editingEvent.assetId)}
                intervalName={editingEvent.intervalName ?? rule?.name ?? 'One-off repair'}
                intervals={rule?.intervals}
                services={(rule?.serviceTypeIds ?? []).map(
                    (id) => serviceTypes.find((x) => x.id === id)?.name ?? serviceName(id))}
                vendors={vendors.map((v) => ({ id: v.id, name: v.companyName || v.name }))}
                lockedVendor={fromOrder ? {
                    id: fromOrder.customVendor ? undefined : fromOrder.vendorId,
                    name: fromOrder.customVendor?.name
                        || fromVendor?.companyName || fromVendor?.name || 'Vendor',
                } : undefined}
                drivers={account?.id
                    ? getDriversForAccount(account.id).map((d) => ({ id: d.id, name: d.name }))
                    : []}
                initial={{
                    date: editingEvent.performedAt.slice(0, 10),
                    odometer: editingEvent.odometer,
                    engineHours: editingEvent.engineHours,
                    vendorId: editingEvent.vendorId,
                    vendorName: editingEvent.vendorName,
                    performedBy: editingEvent.performedBy ?? 'mechanic',
                    driverId: editingEvent.driverId,
                    performedByName: editingEvent.performedByName,
                    invoiceNumber: editingEvent.invoiceNumber,
                    labour: editingEvent.labour,
                    parts: editingEvent.parts,
                    cost: editingEvent.cost,
                    currency: editingEvent.currency ?? 'USD',
                    notes: editingEvent.notes,
                    remarks: editingEvent.remarks,
                    files: editingEvent.files ?? [],
                }}
                onCancel={() => setEditingEventId(null)}
                onSave={(draft) => {
                    handleCorrectEvent(editingEvent.id, {
                        performedAt: `${draft.date}T09:00:00.000Z`,
                        odometer: draft.odometer,
                        engineHours: draft.engineHours,
                        vendorId: draft.vendorId,
                        vendorName: draft.vendorName,
                        performedBy: draft.performedBy,
                        performedByName: draft.performedByName,
                        driverId: draft.driverId,
                        invoiceNumber: draft.invoiceNumber,
                        labour: draft.labour,
                        parts: draft.parts,
                        cost: draft.cost,
                        currency: draft.currency,
                        notes: draft.notes,
                        remarks: draft.remarks,
                        files: draft.files,
                    });
                    setEditingEventId(null);
                }}
            />
        );
    }

    /*
     * One entry in the maintenance record, in front of whatever list opened it.
     *
     * Before the others, for the reason Edit is: the four lists that show the record used
     * to close themselves on the way in, so Back from an entry had nowhere to return to
     * and dropped you on the Maintenance list instead of the page you came from.
     */
    const openEvent = openEventId ? serviceHistory.find((e) => e.id === openEventId) : undefined;
    if (openEvent) {
        // Whichever page is still standing behind it — Back says so, and goes there.
        const ruleName = (id?: string | null) =>
            (id ? serviceIntervals.find((r) => r.id === id)?.name : undefined);
        const cameFrom = openPair
            ? `${ruleName(openPair.intervalId) ?? 'the interval'} · ${assetLabel(openPair.assetId)}`
            : openAssetId ? assetLabel(openAssetId)
                : openIntervalId ? (ruleName(openIntervalId) ?? 'the interval')
                    : undefined;
        return (
            <ServiceRecordPage
                record={serviceRecordDetail(openEvent)}
                backLabel={cameFrom}
                onBack={() => setOpenEventId(null)}
                onOpenAsset={(id) => { setOpenEventId(null); setOpenAssetId(id); }}
                onOpenInterval={(id) => { setOpenEventId(null); setOpenIntervalId(id); }}
                onOpenOrder={(id) => { setOpenEventId(null); setOpenOrderId(id); }}
                onOpenEvent={(id) => setOpenEventId(id)}
                onEdit={() => setEditingEventId(openEvent.id)}
                onShare={() => setSharingEventId(openEvent.id)}
            />
        );
    }

    /*
     * One interval on one unit, rendered before the unit's own page.
     *
     * Opened FROM that page, so it has to win the return or it would never appear — the
     * same ordering the rule's edit form needs. Back puts the unit's page up again.
     */
    const pairAsset = openPair ? maintenanceAssets.find((a) => a.id === openPair.assetId) : undefined;
    const pairLine = pairAsset?.lines.find((l) => l.intervalId === openPair?.intervalId);
    const pairRule = openPair ? serviceIntervals.find((r) => r.id === openPair.intervalId) : undefined;
    if (openPair && pairAsset && pairLine && pairRule) {
        // The unit's page is still open underneath — closing this one uncovers it, which
        // is what the browser's Back does too.
        const toAsset = () => setOpenPair(null);

        /*
         * Filing a service that has already happened, as a page in front of the pair's.
         *
         * Rendered here rather than beside the list so Cancel has somewhere obvious to go
         * back to — the interval it is about, still open behind it. It asks three separate
         * things, and a sheet that scrolls past its own header makes you hold the first
         * two in your head while you answer the third.
         */
        if (addingRecord) {
            return (
                <AddServiceRecordPage
                    asset={assetInfo(pairAsset.id)}
                    intervalName={pairRule.name}
                    intervals={pairRule.intervals}
                    services={pairRule.serviceTypeIds.map(
                        (id) => serviceTypes.find((x) => x.id === id)?.name ?? serviceName(id))}
                    line={pairLine}
                    vendors={vendors.map((v) => ({ id: v.id, name: v.companyName || v.name }))}
                    drivers={account?.id
                        ? getDriversForAccount(account.id).map((d) => ({ id: d.id, name: d.name }))
                        : []}
                    onCancel={() => setAddingRecord(false)}
                    onSave={(draft) => {
                        fileServiceRecord(pairRule, pairAsset.id, draft);
                        setAddingRecord(false);
                    }}
                />
            );
        }
        return (
            <>
                <AssetIntervalPage
                    asset={assetInfo(pairAsset.id)}
                    line={pairLine}
                    rule={{
                        id: pairRule.id,
                        name: pairRule.name,
                        system: pairRule.system,
                        intervals: pairRule.intervals,
                        serviceTypeIds: pairRule.serviceTypeIds,
                        assetCount: pairRule.assetIds.length,
                    }}
                    // The ledger, narrowed to this pair. The same entries the countdowns
                    // above were measured from, so the two cannot disagree.
                    history={historyForPair(serviceHistory, pairAsset.id, pairRule.id)}
                    onOrder={pairLine.taskId ? openOrderOf(pairLine.taskId) : undefined}
                    serviceOf={(id) => {
                        const t = serviceTypes.find((x) => x.id === id);
                        return { name: t?.name ?? serviceName(id), group: t?.group };
                    }}
                    onBack={toAsset}
                    onOpenRule={() => { setOpenPair(null); setOpenIntervalId(pairRule.id); }}
                    onSetLastService={() => setPairStarting({ intervalId: pairRule.id, editing: pairLine.tracking })}
                    onAddRecord={() => setAddingRecord(true)}
                    onSetMonitoring={(on) => setIntervalMonitoring(pairRule, pairAsset.id, on)}
                    onEditMonitoring={() => setEditingMonitoring(true)}
                    onLoadSample={() => loadSampleHistory(pairRule, pairAsset.id, pairLine)}
                    onBulkUpload={() => setBulkImporting(true)}
                    onCreateOrder={() => {
                        // The order form lives on the list behind every sub-page.
                        setOpenPair(null);
                        setOpenAssetId(null);
                        setSelectedTaskIds(pairLine.taskId ? [pairLine.taskId] : []);
                        setPendingWorkRows(pairLine.taskId ? [] : [{
                            assetId: pairAsset.id,
                            intervalId: pairRule.id,
                            name: pairLine.name,
                            serviceTypeIds: pairLine.serviceTypeIds ?? [],
                            status: pairLine.state,
                        }]);
                        setIsCreateOrderModalOpen(true);
                    }}
                    onShare={() => setSharingPair(true)}
                    onOpenHistory={setOpenEventId}
                    onEditHistory={setEditingEventId}
                    onShareHistory={(id) => { setOpenPair(null); setSharingEventId(id); }}
                    onOpenOrder={(id) => { setOpenPair(null); setOpenOrderId(id); }}
                />
                {bulkImporting && (
                    <BulkServiceImportDialog
                        intervalName={pairLine.name}
                        assetLabel={pairAsset.label}
                        intervals={pairRule.intervals}
                        meter={assetMeter(pairAsset.id)}
                        onClose={() => setBulkImporting(false)}
                        onImport={(rows) => {
                            importBulkServices(pairRule, pairAsset.id, pairLine, rows);
                            setBulkImporting(false);
                        }}
                    />
                )}
                {/* The warnings, over the page they are about: a dialog rather than a
                    detour, because setting them is a decision about this one pair and
                    you are already looking at it. */}
                {editingMonitoring && (
                    <IntervalMonitoringDialog
                        intervalName={pairLine.name}
                        assetLabel={pairAsset.label}
                        clocks={pairLine.clocks}
                        unit={pairRule.intervals?.mileage?.unit === 'km' ? 'km' : 'mi'}
                        counting={pairLine.tracking && pairLine.clocks.length > 0}
                        enrolled={pairLine.enrolled?.reminders}
                        onClose={() => setEditingMonitoring(false)}
                        onSave={(reminders) => {
                            setIntervalReminders(pairRule, pairAsset.id, reminders);
                            setEditingMonitoring(false);
                        }}
                    />
                )}
                {sharingPair && (
                    <ShareToChat
                        open
                        onClose={() => setSharingPair(false)}
                        title={`Share ${pairLine.name} · ${pairAsset.label}`}
                        subtitle="Where this unit stands on this interval"
                        source={{ type: 'manual', id: `${pairAsset.id}:${pairRule.id}`, label: `${pairLine.name} · ${pairAsset.label}` }}
                        items={[
                            { name: pairLine.name, group: 'Interval' },
                            { name: pairAsset.label, group: 'Asset' },
                            { name: pairLine.everyText, group: 'Comes round' },
                            { name: pairLine.due?.at ?? 'Not counting', group: 'Next due' },
                            { name: pairLine.due?.left ?? '—', group: 'Due in' },
                            { name: pairLine.state, group: 'Status' },
                            {
                                name: `${historyForPair(serviceHistory, pairAsset.id, pairRule.id).length} on record`,
                                group: 'Previous services',
                            },
                        ]}
                        currentUserName={account?.legalName}
                    />
                )}

                {/* Starting or correcting the countdown, over the page it was asked from —
                    the one dialog that does this, wherever the question is put. */}
                {pairStarting && (
                    <StartTrackingDialog
                        asset={assetInfo(pairAsset.id)}
                        intervals={pairRule.intervals}
                        enrolled={pairLine.enrolled}
                        editing={pairStarting.editing}
                        onClose={() => setPairStarting(null)}
                        onConfirm={(last) => {
                            setIntervalTracking(pairRule, pairAsset.id, true, last);
                            setPairStarting(null);
                        }}
                    />
                )}
            </>
        );
    }

    /** The asset whose own page is open, if any. */
    const openAsset = openAssetId ? maintenanceAssets.find((a) => a.id === openAssetId) : undefined;
    if (openAsset) {
        return (
            <MaintenanceAssetPage
                row={openAsset}
                asset={getAsset(openAsset.id)}
                annual={annualOf(openAsset.id)}
                activity={activityFor(openAsset.id)}
                workOrders={workOrdersFor(openAsset.id)}
                // Clicking the row opens the order, the way clicking any row in this
                // module opens the thing it names. The sub-page it is on is not rendered
                // while the order's page is, so it steps back out to the list first.
                onOpenOrder={(id) => { setOpenAssetId(null); setOpenOrderId(id); }}
                history={historyForAsset(serviceHistory, openAsset.id)}
                onOpenHistory={setOpenEventId}
                onEditHistory={setEditingEventId}
                onShareHistory={(id) => { setOpenAssetId(null); setSharingEventId(id); }}
                orderActions={orderActions}
                openOrderOf={openOrderOf}
                annualRecordFor={annualRecordFor}
                annualVersionFor={(key, mode) => annualVersionFor(openAsset.id, key, mode)}
                onSaveAnnualVersion={(key, v, mode) => saveAnnualVersion(openAsset.id, key, v, mode)}
                intervalsOf={(id) => serviceIntervals.find((r) => r.id === id)?.intervals}
                onBack={() => setOpenAssetId(null)}
                onOpenInterval={(id) => { setOpenAssetId(null); setOpenIntervalId(id); }}
                onOpenPair={(id) => { setAssetTab('maintenance'); setOpenPair({ assetId: openAsset.id, intervalId: id }); }}
                initialTab={assetTab}
                onCreateOrder={(taskIds, rows) => {
                    // The order form belongs to the list behind this page, so raising one
                    // steps back out to it — otherwise the modal is mounted by a view that
                    // is not on screen, and the button does nothing at all.
                    setOpenAssetId(null);
                    setSelectedTaskIds(taskIds);
                    setPendingWorkRows((rows ?? []).filter((r) => !r.taskId));
                    setIsCreateOrderModalOpen(true);
                }}
                onSetTracking={(intervalId, enabled, last) => {
                    const rule = serviceIntervals.find((r) => r.id === intervalId);
                    if (rule) setIntervalTracking(rule, openAsset.id, enabled, last);
                }}
                onRemoveFromInterval={(intervalId) => {
                    const rule = serviceIntervals.find((r) => r.id === intervalId);
                    if (rule) removeIntervalAsset(rule, openAsset.id);
                }}
            />
        );
    }

    /*
     * One order’s page.
     *
     * Rendered before the rule’s and the asset’s pages for the same reason they are rendered
     * before the list: these are places you go, not drawers over something else.
     */
    /**
     * One line of an order, answered.
     *
     * Three things happen together because they are one event: the service joins the
     * ledger (which resets the rule's countdown through the same door every other filed
     * record uses), the line is signed off, and — when it was the last line left — the
     * order closes itself.
     *
     * Deriving the order's state from its lines rather than from a button is what makes
     * "done" mean something: an order marked done with two lines unfiled used to leave
     * two rules counting from nothing and two visits with no paper behind them.
     */
    const fileRecordForJob = (
        job: { orderId: string; taskId: string; assetId: string; intervalId?: string },
        draft: ServiceRecordDraft,
    ) => {
        const rule = job.intervalId ? serviceIntervals.find((r) => r.id === job.intervalId) : undefined;

        /*
         * The line is closed BEFORE the service is filed, and the order matters.
         *
         * Filing reaches into the rule to restart its countdown, and the way it does that
         * is by moving the one outstanding task for the pair onto the new due figure —
         * or raising one if there is none. Done the other way round, it found THIS task
         * still open, moved it, and then this line closed the very task it had just
         * aimed at the next service: the work was on record and nothing was ever due
         * again. Closed first, the rule finds nothing outstanding and raises the next one.
         */
        setTasks((prev) => prev.map((t) => (t.id === job.taskId
            ? { ...t, status: 'completed' as MaintenanceTaskStatus, completedAt: new Date().toISOString() }
            : t)));

        if (rule) fileServiceRecord(rule, job.assetId, draft, { orderId: job.orderId, taskId: job.taskId });

        /*
         * The line is signed off as a completion on the order.
         *
         * Not a new field: `jobStateOf` already calls a line completed when the order
         * carries a completion naming its task, and `orderState` already calls the order
         * completed when every line has been answered. So filing the last record closes
         * the order by itself, with no second definition of "done" to drift from the
         * first — and reopening a line still has one thing to undo.
         */
        const total = (draft.cost ?? 0);
        setOrders((prev) => prev.map((o) => (o.id === job.orderId ? {
            ...o,
            completions: [...(o.completions ?? []), {
                id: `cmp_${Math.random().toString(36).slice(2, 9)}`,
                completedAt: new Date().toISOString(),
                invoiceDate: draft.date,
                currency: (draft.currency === 'CAD' ? 'CAD' : 'USD') as 'CAD' | 'USD',
                taskIds: [job.taskId],
                assetBreakdowns: [{
                    assetId: job.assetId,
                    finalOdometer: draft.odometer,
                    finalEngineHours: draft.engineHours,
                    costs: {
                        partsAndSupplies: draft.parts ?? 0,
                        labour: draft.labour ?? 0,
                        tax: 0,
                        totalPaid: total,
                    },
                    remarks: draft.notes,
                }],
            }],
        } : o)));
        setRecordForJob(null);
    };

    /*
     * Filing one, as a page in front of the order's.
     *
     * The same form the pair's page uses, because it is the same question — what was
     * done, by whom, what it cost and the paper for it.
     */
    if (recordForJob) {
        const rule = recordForJob.intervalId
            ? serviceIntervals.find((r) => r.id === recordForJob.intervalId) : undefined;
        const jobOrder = orders.find((o) => o.id === recordForJob.orderId);
        const jobVendor = vendors.find((v) => v.id === jobOrder?.vendorId);
        return (
            <AddServiceRecordPage
                asset={assetInfo(recordForJob.assetId)}
                intervalName={rule?.name ?? 'One-off repair'}
                intervals={rule?.intervals}
                services={(rule?.serviceTypeIds ?? []).map(
                    (id) => serviceTypes.find((x) => x.id === id)?.name ?? serviceName(id))}
                /* Where the rule stands on this unit, the same line the order's own list
                   showed — you are about to reset this countdown, so it says what from. */
                line={maintenanceAssets.find((a) => a.id === recordForJob.assetId)
                    ?.lines.find((l) => l.intervalId === recordForJob.intervalId)}
                /* The shop was chosen when the order was raised and the work was sent
                   there. Asking again is a second chance to name one that never saw it. */
                lockedVendor={jobOrder ? {
                    id: jobOrder.customVendor ? undefined : jobOrder.vendorId,
                    name: jobOrder.customVendor?.name
                        || jobVendor?.companyName || jobVendor?.name || 'Vendor',
                } : undefined}
                vendors={vendors.map((v) => ({ id: v.id, name: v.companyName || v.name }))}
                drivers={account?.id
                    ? getDriversForAccount(account.id).map((d) => ({ id: d.id, name: d.name }))
                    : []}
                onCancel={() => setRecordForJob(null)}
                onSave={(draft) => fileRecordForJob(recordForJob, draft)}
            />
        );
    }

    /*
     * One vendor's page, before the list it was opened from.
     *
     * Rendered up here with the other pages for the same reason they are: these are places
     * you go, not drawers over something else. Back uncovers the Vendors tab underneath.
     */
    const openVendorRecord = openVendorId ? vendors.find((v) => v.id === openVendorId) : undefined;
    if (openVendorRecord) {
        return (
            <VendorPage
                vendor={vendorDetail(openVendorRecord)}
                backLabel={routedToVendor ? backTarget('/maintenance', 'Maintenance').label : 'Vendors'}
                onBack={() => {
                    if (routedToVendor) onNavigate?.(backTarget('/maintenance', 'Maintenance').path);
                    else setOpenVendorId(null);
                }}
                onOpenOrder={(id) => { setOpenVendorId(null); setOpenOrderId(id); }}
                /* A bill opens whatever filed it. A service record has its own page; a
                   roadside repair bill belongs to an inspection, which lives in another
                   module — so that one hands off rather than pretending to own it. */
                onOpenBill={(b) => {
                    if (b.source === 'service') { setOpenVendorId(null); setOpenEventId(b.id); }
                    else if (b.openId) onNavigate?.(`/roadside-inspections/${b.openId}`);
                }}
                onOpenItem={() => onNavigate?.('/inventory')}
            />
        );
    }

    const openOrder = openOrderId ? orders.find((o) => o.id === openOrderId) : undefined;
    if (openOrder) {
        return (
            <WorkOrderPage
                order={orderDetail(openOrder)}
                onBack={() => setOpenOrderId(null)}
                onEdit={() => { setOpenOrderId(null); setEditingOrderId(openOrder.id); }}
                onShare={() => { setOpenOrderId(null); setSharingOrderId(openOrder.id); }}

                onReopen={() => { setOpenOrderId(null); setActiveTab('orders'); setOrderPrompt({ order: openOrder, kind: 'reopen' }); }}
                onCancel={() => { setOpenOrderId(null); setActiveTab('orders'); setOrderPrompt({ order: openOrder, kind: 'cancel' }); }}
                onOpenAsset={(id) => { setOpenOrderId(null); setOpenAssetId(id); }}
                onOpenInterval={(id) => { setOpenOrderId(null); setOpenIntervalId(id); }}
                onFileRecord={(job) => setRecordForJob({
                    orderId: openOrder.id,
                    taskId: job.taskId,
                    assetId: job.assetId,
                    intervalId: job.intervalId,
                })}
                onOpenRecord={(id) => { setOpenOrderId(null); setOpenEventId(id); }}
                initialTab={orderTab}
                onTabChange={setOrderTab}
                onCancelJob={(taskId) => handleCancelJob(openOrder, taskId)}
                onReopenJob={(taskId) => handleReopenJob(openOrder, taskId)}
                onRestoreJob={(taskId) => handleRestoreJob(openOrder, taskId)}
            />
        );
    }

    /*
     * Editing a rule, before the rule's own page.
     *
     * Order matters here, not style: Edit is offered BOTH on the list and on the rule's
     * own page, and with this check underneath, the page's own button set a flag that
     * nothing was left to render — the rule's page won the return and the form never
     * appeared. In front, the form takes over from wherever it was opened, and because
     * the rule stays open underneath, closing it puts you back on the page you were
     * reading rather than at the top of the list.
     */
    const editingInterval = editingIntervalId ? serviceIntervals.find((r) => r.id === editingIntervalId) : undefined;
    if (editingInterval) {
        return (
            <CreateScheduleForm
                initial={{
                    id: editingInterval.id,
                    name: editingInterval.derivedName ? "" : editingInterval.name,
                    entityType: editingInterval.entity === "none" ? "truck" : editingInterval.entity,
                    serviceTypeIds: editingInterval.serviceTypeIds,
                    intervals: editingInterval.intervals,
                    assetIds: editingInterval.assetIds,
                    applyToAll: editingInterval.applyToAll,
                    tier: editingInterval.tier,
                }}
                onSave={(next) => { saveInterval(next, editingInterval); setEditingIntervalId(null); }}
                onCancel={() => setEditingIntervalId(null)}
            />
        );
    }

    // A rule's page takes over the view, the way the create form does — it is a place
    // you go, not a drawer over the list.
    const openInterval = openIntervalId ? serviceIntervals.find((r) => r.id === openIntervalId) : undefined;
    if (openInterval) {
        const owned = new Set(openInterval.taskIds);
        return (
            <ServiceIntervalDetailPage
                row={openInterval}
                tasks={tasks.filter((t) => owned.has(t.id))}
                assetLabel={assetLabel}
                assetInfo={assetInfo}
                fleet={fleet.map((a) => assetInfo(a.id))}
                onAddAssets={(ids) => addIntervalAssets(openInterval, ids)}
                onSetTracking={(assetId, on, last) => setIntervalTracking(openInterval, assetId, on, last)}
                onRemoveAsset={(assetId) => removeIntervalAsset(openInterval, assetId)}
                serviceName={serviceName}
                orderLabel={(taskId) => {
                    const o = orders.find((x) => x.taskIds.includes(taskId));
                    return o ? `#${o.id.slice(-6).toUpperCase()}` : undefined;
                }}
                openOrderOf={openOrderOf}
                workOrders={workOrdersForInterval(openInterval)}
                onOpenOrder={(id) => { setOpenIntervalId(null); setOpenOrderId(id); }}
                history={historyForInterval(serviceHistory, openInterval.id)}
                onOpenHistory={setOpenEventId}
                onEditHistory={setEditingEventId}
                onShareHistory={(id) => { setOpenIntervalId(null); setSharingEventId(id); }}
                orderActions={orderActions}
                /* A row in the Assets list is this rule ON that unit — so clicking it
                   opens exactly that: the pair page, with its countdowns, its record and
                   the work raised for it. It is also where the two tabs this page used to
                   carry now live, which is why clicking through is the whole way in. */
                onOpenAsset={(assetId) => {
                    setOpenIntervalId(null);
                    setOpenAssetId(assetId);
                    // The pair page needs a line to show. A unit enrolled on the rule but
                    // switched off has none, so it lands on its own page instead of on a
                    // view that would render nothing and leave Back with somewhere to go
                    // and nothing to come back to.
                    const hasLine = maintenanceAssets.find((a) => a.id === assetId)
                        ?.lines.some((l) => l.intervalId === openInterval.id);
                    if (hasLine) setOpenPair({ assetId, intervalId: openInterval.id });
                }}
                onBack={() => setOpenIntervalId(null)}
                onEdit={() => setEditingIntervalId(openInterval.id)}
                onDelete={() => { deleteInterval(openInterval); setOpenIntervalId(null); }}
                onCreateOrder={(taskIds) => {
                    // Same as the asset page: the form lives on the list behind this one.
                    setOpenIntervalId(null);
                    setSelectedTaskIds(taskIds);
                    setPendingWorkRows([]);
                    setIsCreateOrderModalOpen(true);
                }}
            />
        );
    }

    if (isCreatingSchedule) {
        return (
            <CreateScheduleForm
                onSave={(next) => { saveInterval(next); setIsCreatingSchedule(false); }}
                onCancel={() => setIsCreatingSchedule(false)}
            />
        );
    }

    // When the work-order form is open it takes over the whole content area
    // (full page, not a modal) — render it instead of the list.
    if (isCreateOrderModalOpen) {
        return (
            <CreateOrderModal
                isOpen={isCreateOrderModalOpen}
                onClose={() => setIsCreateOrderModalOpen(false)}
                onCreate={handleCreateOrder}
                selectedTasks={tasks.filter(t => selectedTaskIds.includes(t.id))}
                availableTasks={tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled' && !orders.some(o => o.taskIds.includes(t.id)))}
                vendors={vendors}
                onAddVendor={handleAddVendor}
                account={account}
                // What the order is made of, and what else could go on it: a job is an
                // asset and a piece of work, which is what somebody ticks.
                workRows={orderWorkRows}
                /*
                 * Every rule this unit is on, with where each one stands.
                 *
                 * Read off the same lines the unit's own list is built from, so the order
                 * form shows the figures somebody just looked at rather than a bare list
                 * of names — which of these go on this visit is a decision about what is
                 * overdue and what is eight thousand miles away.
                 */
                intervalsForAsset={(assetId) => (maintenanceAssets.find((a) => a.id === assetId)?.lines ?? [])
                    .map((l) => ({
                        assetId,
                        intervalId: l.intervalId,
                        name: l.name,
                        tier: l.tier,
                        everyText: l.everyText,
                        services: l.services,
                        serviceTypeIds: l.serviceTypeIds ?? [],
                        due: l.due ? { at: l.due.at, left: l.due.left, over: l.due.over } : undefined,
                        status: l.state,
                        taskId: l.taskId,
                    }))
                    // Work already on a live order is not offered again: it is being done,
                    // and a second order for it is a second invoice for one job.
                    .filter((r) => !(r.taskId && openOrderOf(r.taskId)))}
                /*
                 * A rule started from the order form.
                 *
                 * It goes through `saveInterval`, the same door the interval builder uses,
                 * so the rule, its enrolment and its first task are made exactly as they
                 * would be anywhere else — the short form is a shorter QUESTION, not a
                 * second way of writing a rule.
                 */
                onAddInterval={(spec) => {
                    const id = `sch_${Math.random().toString(36).slice(2, 9)}`;
                    saveInterval({
                        id,
                        name: spec.name,
                        entityType: 'truck',
                        serviceTypeIds: spec.serviceTypeIds,
                        intervals: spec.intervals,
                        assignment: { entityIds: [spec.assetId] },
                        applyToAll: false,
                    });
                    return {
                        assetId: spec.assetId,
                        intervalId: id,
                        name: spec.name,
                        serviceTypeIds: spec.serviceTypeIds,
                        services: spec.serviceTypeIds.map(serviceName),
                        everyText: intervalText(spec.intervals).join(` ${'·'} `) || 'By hand',
                        status: 'upcoming',
                    };
                }}
                drivers={account?.id
                    ? getDriversForAccount(account.id).map((d) => ({ id: d.id, name: d.name }))
                    : []}
            />
        );
    }

    // The figures that ride the header once the cards they stand for have scrolled away.
    // Whichever tab you are on, they are that tab's numbers, and clicking one filters the
    // list — the same figures the strip inside the card shows, not a second tally.
    const headerChips: KpiChip[] = activeTab === 'tasks'
        ? [
            // The rules, and the state of the work they have produced. They do not filter:
            // the list’s own tiles do that, and two sets of chips doing the same job on one
            // screen is how they end up disagreeing.
            { id: 'all', label: 'Intervals', value: serviceIntervals.length },
            { id: 'running', label: 'Running', value: serviceIntervals.filter((r) => r.counts.upcoming + r.counts.due + r.counts.overdue > 0).length, tone: 'text-emerald-600' },
            { id: 'overdue', label: 'With overdue', value: serviceIntervals.filter((r) => r.counts.overdue > 0).length, tone: 'text-red-600' },
            { id: 'tasks', label: 'Tasks', value: tasks.length, tone: 'text-slate-600' },
        ]
        : activeTab === 'fleet'
        ? [
            // The fleet's own numbers: how many units, how many the rules actually cover,
            // and what is behind on them.
            { id: 'all', label: 'Assets', value: maintenanceAssets.length },
            { id: 'covered', label: 'On an interval', value: maintenanceAssets.filter((a) => a.lines.length > 0).length, tone: 'text-violet-600' },
            { id: 'overdue', label: 'Overdue', value: maintenanceAssets.filter((a) => a.state === 'overdue').length, tone: 'text-red-600' },
            { id: 'due', label: 'Due', value: maintenanceAssets.filter((a) => a.state === 'due').length, tone: 'text-amber-600' },
        ]
        : activeTab === 'services'
            ? [
                { id: 'all', label: 'Service types', value: serviceTypes.length },
                { id: 'cmv', label: 'CMV only', value: serviceTypes.filter(t => t.category === 'cmv_only').length, tone: 'text-blue-600' },
                { id: 'noncmv', label: 'Non-CMV only', value: serviceTypes.filter(t => t.category === 'non_cmv_only').length, tone: 'text-amber-600' },
                { id: 'both', label: 'All vehicles', value: serviceTypes.filter(t => t.category === 'both_cmv_and_non_cmv').length, tone: 'text-emerald-600' },
            ]
        : activeTab === 'orders'
            ? [
                // The same four states the list’s own chips carry, counted off the same
                // rows — two tallies of one thing is how they end up disagreeing.
                { id: 'all', label: 'Orders', value: orderRows.length, active: orderFilter === 'all', onClick: () => setOrderFilter('all') },
                { id: 'open', label: 'Open', value: orderRows.filter(o => o.state === 'open').length, tone: 'text-blue-600', active: orderFilter === 'open', onClick: () => setOrderFilter('open') },
                { id: 'completed', label: 'Completed', value: orderRows.filter(o => o.state === 'completed').length, tone: 'text-emerald-600', active: orderFilter === 'completed', onClick: () => setOrderFilter('completed') },
                { id: 'cancelled', label: 'Cancelled', value: orderRows.filter(o => o.state === 'cancelled').length, tone: 'text-slate-500', active: orderFilter === 'cancelled', onClick: () => setOrderFilter('cancelled') },
            ]
            : [
                { id: 'all', label: 'Vendors', value: vendors.length },
                { id: 'active', label: 'Active', value: vendors.filter(v => v.status === 'Active').length, tone: 'text-emerald-600' },
            ];

    // What the number beside the title counts, which is whatever the tab is showing.
    const headerCount = activeTab === 'tasks' ? serviceIntervals.length
        : activeTab === 'fleet' ? maintenanceAssets.length
        : activeTab === 'orders' ? orders.length
                : activeTab === 'services' ? serviceTypes.length
                    : vendors.length;

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            {/* The app's standard list header — the same band Inventory, Violations, Tickets
                and the rest wear. The breadcrumb, the 3xl title and the hand-rolled tab row it
                replaces were this page's alone, and the tabs went off the top of the screen the
                moment you scrolled a sixty-row task list. */}
            <ListPageHeader
                Icon={Wrench}
                title="Asset Maintenance"
                description="Track and manage maintenance tasks, schedules, and work orders for your fleet assets."
                count={headerCount}
                countTitle={`${headerCount.toLocaleString()} ${activeTab === 'tasks' ? 'service intervals' : activeTab === 'fleet' ? 'assets' : activeTab === 'orders' ? 'work orders' : activeTab === 'services' ? 'service types' : 'vendors'}`}
                chips={headerChips}
                condensed={condensed}
                tabsLabel="Maintenance sections"
                tabs={[
                    { id: 'tasks', label: 'Service interval', icon: LayoutGrid, count: serviceIntervals.length },
                    { id: 'fleet', label: 'Assets', icon: Truck, count: maintenanceAssets.length },
                    { id: 'orders', label: 'Work Orders', icon: ClipboardList, count: orderRows.filter(o => o.state === 'open').length },
                    { id: 'services', label: 'Service Types', icon: Settings2, count: serviceTypes.length },
                    { id: 'vendors', label: 'Vendors', icon: Store, count: vendors.length },
                ]}
                activeTab={activeTab}
                onTabChange={(id) => setActiveTab(id as typeof activeTab)}
                actions={<>
                    {activeTab === 'tasks' && (
                        <Button variant="primary" onClick={() => setIsCreatingSchedule(true)} className={cn("gap-2", condensed ? "h-8" : "h-9")}>
                            <Calendar size={16} /> New Service Interval
                        </Button>
                    )}
                    {activeTab === 'orders' && (
                        <Button variant="primary" onClick={() => setIsCreateOrderModalOpen(true)} className={cn("gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm", condensed ? "h-8" : "h-9")}>
                            <Briefcase size={16} /> Create Work Order
                        </Button>
                    )}
                    {/* The same screen Inventory's Add Vendor opens — one vendor form, not
                        a second one that writes the same records a different way. */}
                    {activeTab === 'services' && (
                        <Button variant="primary" onClick={() => servicePanel.current?.openAdd()} className={cn("gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm", condensed ? "h-8" : "h-9")}>
                            <Plus size={16} /> Add Service Type
                        </Button>
                    )}
                    {activeTab === 'vendors' && onNavigate && (
                        <Button variant="primary" onClick={() => onNavigate('/inventory/vendors/new')} className={cn("gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm", condensed ? "h-8" : "h-9")}>
                            <Plus size={16} /> Add Vendor
                        </Button>
                    )}
                </>}
            />

            {/* Body — its own scroller, which is what lets the band above stay put. */}
            <ListPageBody scrollRef={scrollRef} onScroll={onScroll}>
            <div className={cn("py-4 sm:py-6", PAGE_PAD)}>

                {/* Service interval view — the rules. One row each, with the columns the
                    form fills in; a row opens its own page, where its tasks are. */}
                {activeTab === 'tasks' && (
                    <ServiceIntervalsTable
                        rows={serviceIntervals}
                        assetLabel={assetLabel}
                        serviceName={serviceName}
                        onOpen={(row) => setOpenIntervalId(row.id)}
                        onEdit={(row) => setEditingIntervalId(row.id)}
                        onDelete={deleteInterval}
                    />
                )}

                {/* Assets view — the fleet from maintenance's side. One row per unit, its
                    worst standing across every rule, and those rules one click down. */}
                {activeTab === 'fleet' && (
                    <MaintenanceAssetsTable
                        rows={maintenanceAssets}
                        onOpenAsset={(id) => setOpenAssetId(id)}
                        onCreateOrder={(taskIds) => {
                            setSelectedTaskIds(taskIds);
                            setPendingWorkRows([]);
                            setIsCreateOrderModalOpen(true);
                        }}
                    />
                )}

                {/* Work Orders — the module-wide list. The same table an asset's page and
                    a rule's page show, so the columns, the chips, the banding and the pager
                    do not change meaning depending on where you opened it from. */}
                {activeTab === 'orders' && (
                    <WorkOrdersTable
                        orders={orderRows}
                        filter={orderFilter}
                        onFilter={setOrderFilter}
                        title="Work orders"
                        emptyTitle="No work orders"
                        emptyHint="Tick what needs doing on a service interval or an asset, then raise one."
                        rowActions={orderActions}
                        onOpen={(r) => { setOrderTab('overview'); setOpenOrderId(r.id); }}
                    />
                )}

                {/* Service Types View — the Settings page's own catalog panel. It was only
                    reachable through Settings, which is nowhere near the screens that use it:
                    scheduling a service meant leaving the page to look up what the catalog
                    calls the thing. Same component, same store, so an edit in either place is
                    the same edit. */}
                {activeTab === 'services' && (
                    <ServiceTypesPanel ref={servicePanel} />
                )}

                {/* Vendors View — the Inventory module's own table, given this page's
                    carrier-scoped list. Including vendors added from inside a work order,
                    which is why it reads the page's state and not the global array. */}
                {activeTab === 'vendors' && (
                    <VendorsTable
                        vendors={vendors}
                        accountId={account?.id}
                        onOpen={(v) => setOpenVendorId(v.id)}
                    />
                )}
            </div>
            </ListPageBody>

            {/* Undoing something asks first, and says what it will put back — "reopen"
                sounds harmless, and it is not: it takes a service off the fleet's record. */}
            {orderPrompt && (() => {
                const { order, kind } = orderPrompt;
                const number = orderRows.find((r) => r.id === order.id)?.name ?? 'this order';
                const copy = kind === 'reopen'
                    ? {
                        title: `Mark ${number} as not done?`,
                        body: `The work goes back to outstanding on this order. Everything closing it moved is put back: each interval's last service returns to what it was, the next service this raised is removed, and a certificate it filed is withdrawn.`,
                        cta: 'Mark as not done',
                        tone: 'bg-slate-900 hover:bg-slate-800',
                        run: () => handleReopenOrder(order),
                    }
                    : kind === 'cancel'
                        ? {
                            title: `Cancel ${number}?`,
                            body: `The work was not done, so nothing is recorded against the fleet. Its jobs go back to being outstanding — due where they were due — and can go on another order.`,
                            cta: 'Cancel this order',
                            tone: 'bg-red-600 hover:bg-red-700',
                            run: () => handleCancelOrder(order),
                        }
                        : kind === 'uncancel'
                            ? {
                                title: `Put ${number} back on the board?`,
                                body: 'Its jobs are with the shop again, and cannot be put on another order until this one is finished or called off.',
                                cta: 'Put it back',
                                tone: 'bg-slate-900 hover:bg-slate-800',
                                run: () => handleUncancelOrder(order),
                            }
                            : {
                                title: `Delete ${number}?`,
                                body: `The order comes off the books altogether, as though it was never raised. Work it had already signed off stays signed off — that happened — and anything it was holding goes back to outstanding. This cannot be undone.`,
                                cta: 'Delete this order',
                                tone: 'bg-red-600 hover:bg-red-700',
                                run: () => handleDeleteOrder(order),
                            };
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4">
                        <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                            <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                    <TriangleAlert size={16} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-sm font-bold text-slate-900">{copy.title}</h3>
                                    <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{copy.body}</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 bg-slate-50 px-5 py-3">
                                <button
                                    type="button"
                                    onClick={() => setOrderPrompt(null)}
                                    className="h-9 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Keep as it is
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { copy.run(); setOrderPrompt(null); }}
                                    className={cn('h-9 rounded-lg px-3.5 text-sm font-semibold text-white shadow-sm transition-colors', copy.tone)}
                                >
                                    {copy.cta}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Editing an order changes what has not happened yet: what it is called, who
                is doing it, when it is wanted, and the note that goes with it. The work on
                it is not edited here — adding or dropping jobs is a different order. */}
            {editingOrderId && (() => {
                const order = orders.find((o) => o.id === editingOrderId);
                if (!order) return null;
                const row = orderRows.find((r) => r.id === editingOrderId);
                return (
                    <OrderEditDialog
                        order={order}
                        suggestedName={row?.name ?? ''}
                        vendors={vendors}
                        onClose={() => setEditingOrderId(null)}
                        onSave={(patch) => { handleSaveOrderEdits(order.id, patch); setEditingOrderId(null); }}
                    />
                );
            })()}

            {sharingOrderId && (() => {
                const order = orders.find((o) => o.id === sharingOrderId);
                const row = orderRows.find((r) => r.id === sharingOrderId);
                if (!order || !row) return null;
                const detail = orderDetail(order);
                return (
                    <ShareToChat
                        open
                        onClose={() => setSharingOrderId(null)}
                        title={`Share ${row.name}`}
                        subtitle={`Work order · ${row.vendor}`}
                        source={{ type: 'manual', id: order.id, label: row.name }}
                        items={[
                            { name: row.name, group: 'Work order' },
                            { name: row.vendor, group: 'Vendor' },
                            { name: row.assets.join(', ') || '—', group: 'Units' },
                            { name: row.services.join(', ') || `${row.taskCount} jobs`, group: 'Work' },
                            ...(order.dueDate ? [{ name: new Date(order.dueDate).toLocaleDateString(), group: 'Wanted by' }] : []),
                            ...(detail.total ? [{ name: `${detail.currency} ${detail.total.toFixed(2)}`, group: 'Cost' }] : []),
                            ...detail.docs.map((d) => ({ name: d.name, group: 'Document' })),
                        ]}
                        currentUserName={account?.legalName}
                    />
                );
            })()}

            {sharingEventId && (() => {
                const e = serviceHistory.find((x) => x.id === sharingEventId);
                if (!e) return null;
                const detail = serviceRecordDetail(e);
                return (
                    <ShareToChat
                        open
                        onClose={() => setSharingEventId(null)}
                        title={`Share ${e.intervalName ?? 'service'} · ${assetLabel(e.assetId)}`}
                        subtitle={`A service record · ${new Date(e.performedAt).toLocaleDateString()}`}
                        source={{ type: 'manual', id: e.id, label: `${e.intervalName ?? 'Service'} · ${assetLabel(e.assetId)}` }}
                        items={[
                            { name: e.intervalName ?? 'One-off repair', group: 'Interval' },
                            { name: assetLabel(e.assetId), group: 'Asset' },
                            { name: new Date(e.performedAt).toLocaleDateString(), group: 'Performed' },
                            { name: detail.services.map((sv) => sv.name).join(', ') || '—', group: 'Work done' },
                            {
                                name: [
                                    e.odometer != null ? `${e.odometer.toLocaleString()} mi` : null,
                                    e.engineHours != null ? `${e.engineHours.toLocaleString()} h` : null,
                                ].filter(Boolean).join(' · ') || 'Not recorded',
                                group: 'Readings',
                            },
                            ...(e.vendorName ? [{ name: e.vendorName, group: 'Vendor' }] : []),
                            ...(e.cost ? [{ name: `${e.currency ?? 'USD'} ${e.cost.toFixed(2)}`, group: 'Cost' }] : []),
                            ...(e.files ?? []).map((f) => ({ name: f.name, group: 'Document' })),
                        ]}
                        currentUserName={account?.legalName}
                    />
                );
            })()}

            {/* Complete Order Modal */}
            < CompleteOrderModal
                isOpen={isCompleteOrderModalOpen}
                onClose={() => setIsCompleteOrderModalOpen(false)}
                onComplete={handleCompleteOrder}
                order={orderToComplete}
                focusTaskIds={completeFocus}
                tasks={tasks}
            />
        </div >
    );
}

export default AssetMaintenancePage;
