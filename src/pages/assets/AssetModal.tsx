import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
    Save, RotateCcw, IdCard, ShieldCheck, Globe, Warehouse, Users,
    Plus, Trash, Clock, KeyRound, Shield, Truck,
    AlertCircle, Scale, DollarSign, MapPin as MapPinIcon, Info, Bell,
    UploadCloud, FileText, Trash2, Gauge, Wrench, Zap, Check, CalendarClock, FileSignature,
    Boxes, MessageSquare, PackageCheck, Undo2, ArrowRight, X
} from 'lucide-react';
import { WizardHeader, WizardStepNav, WizardSection, type WizardStep } from '@/components/ui/WizardEditor';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { USA_STATES, CANADA_PROVINCES, MOCK_YARDS } from './assets.data';
import { MOCK_DRIVERS } from '@/pages/profile/carrier-profile.data';
import { getDriversForAccount } from '@/pages/accounts/carrier-drivers.data';
import { useInventoryAdditions } from '@/pages/inventory/inventory-store';
import { useDriverHandovers, handedToMap } from '@/pages/inventory/handovers.data';
import { unassignedItems, rollupByAsset, VIA_LABEL, VIA_TONE } from '@/pages/inventory/inventory-rollup';
import { getInventoryForCarrier, INVENTORY_ITEMS, itemName, itemTravelsWithDriver } from '@/pages/inventory/inventory.data';
import { emptyAssetInventoryDraft, type AssetInventoryDraft } from './asset-inventory-bridge';
import { plateRecordFor, plateSlotLabels, plateHasCabCard } from './plate-record-bridge';
import { assetRecordFor } from './asset-records-bridge';
import { MovementNotify, useMovementPlans } from '@/pages/inventory/MovementNotify';
import { ItemPickList } from '@/pages/inventory/ItemPickList';
import type { Movement } from '@/pages/inventory/inventory-movements';
import { removeActionFor } from '@/pages/inventory/inventory-rollup';
import { GvwrTag } from './GvwrTag';
import {
    MAX_RECORD_NAME, isDateMonitored,
    type SafetyRecord, type RecordTextField,
} from '@/pages/compliance/safety-software-catalog.data';
import { MonitoringToggle } from '@/pages/compliance/MonitoringToggle';
import {
    emptyOwnershipDoc, ownershipCardFields, ownershipDocLabel, ownershipRecordFor,
    BILL_STRUCTURE, needsSeparateBill,
    type OwnershipDocCapture,
} from './ownership-docs-bridge';

// --- UI Utilities & Primitives ---
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variants: Record<string, string> = {
            default: 'bg-[#2563EB] text-white hover:bg-blue-700 shadow-sm border border-transparent',
            outline: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-medium',
            ghost: 'hover:bg-slate-100 text-slate-500 hover:text-slate-900',
        };
        const sizes: Record<string, string> = {
            default: 'h-9 px-4 py-2',
            xs: 'h-7 px-2.5 text-[11px]',
            icon: 'h-8 w-8',
        };
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
                    variants[variant],
                    sizes[size],
                    className
                )}
                {...props}
            />
        );
    });
Button.displayName = 'Button';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, type, ...props }, ref) => (
        <input
            type={type}
            className={cn(
                'flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-normal transition-all placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-slate-50',
                className
            )}
            ref={ref}
            {...props}
        />
    ));
Input.displayName = 'Input';

const Switch = ({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) => (
    <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            checked ? "bg-blue-600" : "bg-slate-200"
        )}
    >
        <span
            className={cn(
                "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                checked ? "translate-x-4" : "translate-x-1"
            )}
        />
    </button>
);

// --- Schemas ---
const driverAssignmentSchema = z.object({
    driverId: z.string().min(1, 'Driver is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
});

const assetSchema = z.object({
    assetCategory: z.enum(['CMV', 'Non-CMV']),
    assetType: z.string().min(1, 'Required'),
    vehicleType: z.string().optional(),
    unitNumber: z.string().min(1, 'Required').trim(),
    vin: z.string().length(17, 'Must be 17 characters'),
    make: z.string().min(1, 'Required'),
    model: z.string().min(1, 'Required'),
    year: z.number().min(1900).max(new Date().getFullYear() + 2),
    color: z.string().optional(),
    
    // Weights
    grossWeight: z.number().optional(),
    grossWeightUnit: z.enum(['lbs', 'kg']).default('lbs'),
    unloadedWeight: z.number().optional(),
    unloadedWeightUnit: z.enum(['lbs', 'kg']).default('lbs'),

    // Odometer
    odometer: z.number().optional(),
    odometerUnit: z.enum(['mi', 'km']).default('mi'),

    // Metadata
    marketValue: z.number().min(0).optional(),
    marketValueCurrency: z.enum(['USD', 'CAD']).default('USD'),
    
    // Status Fields
    dateAdded: z.string().min(1, 'Required').default(new Date().toISOString().split('T')[0]),
    dateRemoved: z.string().optional(),
    
    notes: z.string().max(2000).optional(),
    
    transponderNumber: z.string().optional(),
    transponderIssueDate: z.string().optional(),
    transponderExpiryDate: z.string().optional(),
    transponderMonitoringEnabled: z.boolean().default(true),
    transponderMonitorBasedOn: z.enum(['expiry_date', 'issue_date']).default('expiry_date'),
    transponderRenewalRecurrence: z.enum(['annually', 'quarterly', 'custom']).default('annually'),
    transponderReminderSchedule: z.array(z.number()).default([90, 60, 30]),
    transponderNotificationChannels: z.array(z.string()).default(['email', 'in_app']),
    transponderDocument: z.any().optional(),

    plateNumber: z.string().optional(),
    /** IRP = apportioned plate for interjurisdictional running; Local = base-state only. */
    plateType: z.enum(['IRP', 'Local']).optional(),
    plateDocument: z.any().optional(),
    /**
     * The IRP cab card: the apportioned registration that lists the jurisdictions this unit
     * is licensed to run in and the weight it is licensed at. Only an apportioned plate has
     * one, so it is asked for only when the plate type says IRP.
     */
    cabCardDocument: z.any().optional(),
    plateCountry: z.enum(['USA', 'Canada']).default('USA'),
    plateJurisdiction: z.string().optional(),
    registrationIssueDate: z.string().optional(),
    registrationExpiryDate: z.string().optional(),
    /**
     * The pink slip: proof of insurance, carried in the cab and shown at the roadside.
     * Its own record on the asset, because a lapsed one is found by an officer rather than
     * by the office.
     */
    pinkSlipNumber: z.string().optional(),
    pinkSlipExpiry: z.string().optional(),
    pinkSlipDocument: z.any().optional(),

    /**
     * The two inspections. Same three questions each: when it was last done, at what
     * reading, and when it falls due again — that last one being what the alert fires on.
     */
    annualSafetyLastDate: z.string().optional(),
    annualSafetyOdometer: z.string().optional(),
    annualSafetyOdometerUnit: z.enum(['miles', 'km']).default('miles'),
    annualSafetyNextDue: z.string().optional(),
    annualSafetyDocument: z.any().optional(),

    annualPmLastDate: z.string().optional(),
    annualPmOdometer: z.string().optional(),
    annualPmOdometerUnit: z.enum(['miles', 'km']).default('miles'),
    annualPmNextDue: z.string().optional(),
    annualPmDocument: z.any().optional(),

    plateMonitoringEnabled: z.boolean().default(true),
    plateMonitorBasedOn: z.enum(['expiry_date', 'issue_date']).default('expiry_date'),
    plateRenewalRecurrence: z.enum(['annually', 'quarterly', 'custom']).default('annually'),
    plateReminderSchedule: z.array(z.number()).default([90, 60, 30]),
    plateNotificationChannels: z.array(z.string()).default(['email', 'in_app']),

    // Moved marketValue, notes up
    driverAssignments: z.array(driverAssignmentSchema).max(2, 'Maximum 2 drivers allowed').default([]),
    yardId: z.string().optional(),
    operationalStatus: z.enum(['Active', 'Deactivated', 'Maintenance', 'OutOfService', 'Drafted']).default('Active'),
    insuranceAddedDate: z.string().optional(),
    insuranceRemovedDate: z.string().optional(),
    financialStructure: z.enum(['Owned', 'Rented', 'Leased', 'Financed']).default('Owned'),
    ownerName: z.string().optional(),
    leasingName: z.string().optional(),
    rentalAgencyName: z.string().optional(),
    lienHolderBusiness: z.string().optional(),

    // Lease / finance term — only captured when the asset is Leased or Financed.
    agreementStartDate: z.string().optional(),
    agreementEndDate: z.string().optional(),
    monthlyPayment: z.number().min(0).optional(),
    monthlyPaymentCurrency: z.enum(['USD', 'CAD']).default('USD'),

    streetAddress: z.string().optional(),
    city: z.string().optional(),
    country: z.enum(['USA', 'Canada']).default('USA'),
    stateProvince: z.string().optional(),
    zipCode: z.string().optional(),

    permits: z.array(z.any()).default([]),
}).superRefine((v, ctx) => {
    // A lease / finance agreement can't end before it starts.
    if (v.agreementStartDate && v.agreementEndDate
        && Date.parse(v.agreementEndDate) < Date.parse(v.agreementStartDate)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['agreementEndDate'], message: 'End date is before the start date.' });
    }
});

// --- Helper Form Components ---
// A 3-column field grid used inside each wizard section (replaces the old
// FormSection's inner grid; the section header/card now comes from WizardSection).
const FieldGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-6 gap-y-6 @xl:gap-x-8", className)}>{children}</div>
);

// A wizard section card (icon-tile header, à la Add Accident) wrapping a 3-col
// field grid — the drop-in replacement for the old FormSection.
const AssetSection = ({ id, title, subtitle, icon, right, children }: { id: string; title: string; subtitle?: string; icon: React.ElementType; right?: React.ReactNode; children: React.ReactNode }) => (
    <WizardSection id={id} icon={icon} title={title} subtitle={subtitle} right={right}>
        <FieldGrid>{children}</FieldGrid>
    </WizardSection>
);

const FormInput = ({ label, error, hint, children, className, required }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string; required?: boolean }) => (
    <div className={cn("flex flex-col gap-1.5", className)}>
        <label className="text-[11px] font-semibold text-slate-700 tracking-tight uppercase flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        {children}
        {hint && !error && <span className="text-[10px] text-slate-400 leading-snug">{hint}</span>}
        {error && <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1"><AlertCircle size={10} /> {error}</span>}
    </div>
);

const DocumentUploadInput = ({ label, description, files = [], onFilesChange, error, required }: { label: string; description?: string; files?: any[]; onFilesChange: (files: any[]) => void; error?: string; required?: boolean }) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(file => ({
                id: `doc-${Date.now()}-${Math.random()}`,
                fileName: file.name,
                fileSize: file.size,
                uploadedAt: new Date().toISOString(),
                file: file // Store actual file object
            }));
            onFilesChange([...files, ...newFiles]);
        }
    };

    const removeFile = (id: string) => {
        onFilesChange(files.filter(f => f.id !== id));
    };

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-700 tracking-tight uppercase flex items-center gap-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
                </label>
                {files.length > 0 && (
                     <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors"
                    >
                        <Plus size={12} /> Add
                    </button>
                )}
            </div>
            
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={handleFileChange}
            />

            {files.length === 0 ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white",
                        error ? "border-red-300 bg-red-50" : "border-slate-200 hover:bg-slate-50 hover:border-blue-200"
                    )}
                >
                    <div className="bg-blue-50 p-2.5 rounded-full mb-2">
                        <UploadCloud className="w-5 h-5 text-blue-600" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{description || "PDF, DOC, DOCX up to 10MB"}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {files.map((doc: any) => (
                        <div key={doc.id} className="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-white group hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="bg-red-50 p-2 rounded-lg">
                                    <FileText className="w-4 h-4 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-700 truncate max-w-[180px]">{doc.fileName}</p>
                                    <p className="text-[10px] text-slate-400">{doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'Unknown'} • {new Date(doc.uploadedAt || Date.now()).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeFile(doc.id)}
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <Plus size={14} />
                        <span className="text-xs font-medium">Upload another</span>
                    </div>
                </div>
            )}
            {error && <span className="text-[10px] text-red-500 font-semibold flex items-center gap-1 mt-1"><AlertCircle size={10} /> {error}</span>}
        </div>
    );
};

function MonitoringBlock({ title, prefix, watch, register, setValue, monitorOptions }: { title: string; prefix: string; watch: any; register: any; setValue: any; monitorOptions: { label: string; value: string }[] }) {
    const isEnabled = watch(`${prefix}MonitoringEnabled`);
    const monitorBy = watch(`${prefix}MonitorBasedOn`);
    const schedule = watch(`${prefix}ReminderSchedule`) || [];
    const channels = watch(`${prefix}NotificationChannels`) || [];

    const projectedSchedule = useMemo(() => {
        const typeLabel = monitorBy?.replace(/_/g, ' ') || 'expiry date';
        const scheduleStr = schedule.length > 0 ? [...schedule].sort((a: number, b: number) => b - a).join(', ') : 'None';
        const channelsArr = channels.map((c: string) => c === 'in_app' ? 'In-App' : c.toUpperCase());
        const channelsStr = channelsArr.join(' & ');
        return `Monitor ${typeLabel}. Reminders at ${scheduleStr} days before via ${channelsStr || 'No channels'}.`;
    }, [monitorBy, schedule, channels]);

    return (
        <div className="col-span-full border border-blue-100 rounded-xl bg-blue-50/50 p-6 space-y-6 mt-4 shadow-sm">
            <div className="flex justify-between items-center pb-4 border-b border-blue-100/50">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm"><Bell size={18} /></div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-900 leading-tight">{title}</h4>
                        <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">COMPLIANCE TRACKING</p>
                    </div>
                </div>
                <Switch checked={isEnabled} onChange={(v) => setValue(`${prefix}MonitoringEnabled`, v)} />
            </div>

            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 transition-all", !isEnabled && "opacity-40 pointer-events-none")}>
                <div className="space-y-6">
                    <FormInput label="Monitor Based On">
                        <div className="flex gap-6 mt-1">
                            {monitorOptions.map(opt => (
                                <label key={opt.value} className="flex items-center gap-2 text-[12px] font-bold text-blue-900 cursor-pointer">
                                    <input type="radio" value={opt.value} checked={monitorBy === opt.value} onChange={() => setValue(`${prefix}MonitorBasedOn`, opt.value)} className="accent-blue-600 h-4 w-4" /> {opt.label}
                                </label>
                            ))}
                        </div>
                    </FormInput>
                    <FormInput label="Recurrence">
                        <select {...register(`${prefix}RenewalRecurrence`)} className="h-9 w-full rounded-lg border border-blue-200 px-3 text-sm bg-white">
                            <option value="annually">Annually</option>
                            <option value="quarterly">Quarterly</option>
                            <option value="custom">Custom</option>
                        </select>
                    </FormInput>
                    <FormInput label="Reminders (Days Before)">
                        <div className="flex flex-wrap gap-x-6 gap-y-3 mt-1">
                            {[90, 60, 30, 7].map(d => (
                                <label key={d} className="flex items-center gap-2 text-[12px] font-bold text-blue-900 cursor-pointer">
                                    <input type="checkbox" checked={schedule.includes(d)} onChange={(e) => {
                                        const next = e.target.checked ? [...schedule, d] : schedule.filter((x: number) => x !== d);
                                        setValue(`${prefix}ReminderSchedule`, next);
                                    }} className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                    /> {d} Days
                                </label>
                            ))}
                        </div>
                    </FormInput>
                </div>
                <div className="space-y-6">
                    <FormInput label="Channels">
                        <div className="flex flex-wrap gap-x-6 gap-y-3 mt-1">
                            {['email', 'in_app', 'sms'].map(ch => (
                                <label key={ch} className="flex items-center gap-2 text-[12px] font-bold text-blue-900 cursor-pointer uppercase">
                                    <input type="checkbox" checked={channels.includes(ch)} onChange={(e) => {
                                        const next = e.target.checked ? [...channels, ch] : channels.filter((c: string) => c !== ch);
                                        setValue(`${prefix}NotificationChannels`, next);
                                    }} className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                    /> {ch === 'in_app' ? 'In-App' : ch}
                                </label>
                            ))}
                        </div>
                    </FormInput>
                    <div className="bg-blue-600/10 border border-blue-200 rounded-xl p-5 flex gap-4">
                        <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-blue-800 font-semibold leading-relaxed">{projectedSchedule}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AddressSection({ register, watch, title }: { register: any; watch: any; title?: string }) {
    const currentCountry = watch('country');
    return (
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl mt-2">
            <div className="col-span-full text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1 flex items-center gap-2">
                <MapPinIcon size={12} /> {title ?? 'Address Details'}
            </div>
            <div className="col-span-full">
                <FormInput label="Street Address"><Input {...register('streetAddress')} placeholder="123 Fleet Way" /></FormInput>
            </div>
            <FormInput label="City"><Input {...register('city')} placeholder="Dallas" /></FormInput>
            <FormInput label="Country">
                <select {...register('country')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                    <option value="USA">USA</option>
                    <option value="Canada">Canada</option>
                </select>
            </FormInput>
            <FormInput label="State / Province">
                <select {...register('stateProvince')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                    {(currentCountry === 'USA' ? USA_STATES : CANADA_PROVINCES).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </FormInput>
            <FormInput label="Zip Code"><Input {...register('zipCode')} placeholder="12345" /></FormInput>
        </div>
    );
}

// Wizard sections (left-rail steps). Transponder was removed from the form.
const STEPS: readonly WizardStep[] = [
    { id: 'class', label: 'Asset class', icon: IdCard },
    { id: 'vehicle', label: 'Vehicle info', icon: ShieldCheck },
    { id: 'plate', label: 'Registration & plate', icon: Globe },
    { id: 'yard', label: 'Yard / terminal', icon: Warehouse },
    { id: 'drivers', label: 'Driver assignment', icon: Users },
    // After the driver, because who carries what depends on who is driving.
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    // Before ownership: what the vehicle's condition is has to be asked while somebody is
    // still holding the certificates, not after the money questions have moved them on.
    { id: 'service', label: 'Safety & maintenance', icon: Wrench },
    { id: 'ownership', label: 'Ownership & financial', icon: KeyRound },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'insurance', label: 'Insurance & status', icon: Shield },
];

// --- Main Asset Form Page (in-page wizard, mirrors the Add Accident layout) ---
interface AssetModalProps {
    asset: any;
    onClose: () => void;
    /** Saved with the asset: the inventory picked for it, committed once it has an id. */
    onSave: (data: any, inventory?: AssetInventoryDraft) => void;
    isSaving: boolean;
    accountId?: string;
}


/**
 * One service record's three questions, plus its certificate.
 *
 * The annual safety inspection and the preventive-maintenance service are the same shape,
 * so they are the same block twice rather than two that drift. "Next due" is not a note
 * somebody keeps up to date — it is the date the record is monitored on, which is why it
 * sits beside the date it was last done rather than being worked out in somebody's head.
 */
function ServiceBlock({
    heading, note, lastLabel, docLabel, lastDate, odometer, unit, nextDue, files, onFiles,
}: {
    heading: string;
    note: string;
    lastLabel: string;
    docLabel: string;
    lastDate: any;
    odometer: any;
    unit: any;
    nextDue: any;
    files: any[];
    onFiles: (files: any[]) => void;
}) {
    return (
        <div className="col-span-full border-t border-slate-100 pt-6 first:border-t-0 first:pt-0">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Wrench size={15} /></span>
                <div>
                    <p className="text-[12.5px] font-bold text-slate-800">{heading}</p>
                    <p className="text-[11px] text-slate-500">{note} — filed against this asset as a Compliance &amp; Documents record.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-6 gap-y-6 @xl:gap-x-8">
                <FormInput label={lastLabel}><Input type="date" {...lastDate} /></FormInput>
                <FormInput label="Odometer" hint="The reading it was done at.">
                    <div className="flex gap-2">
                        <div className="relative min-w-[5.5rem] flex-1">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Gauge size={14} /></div>
                            <Input {...odometer} className="pl-9" placeholder="e.g. 412,500" />
                        </div>
                        <select {...unit} className="w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                            <option value="miles">miles</option>
                            <option value="km">km</option>
                        </select>
                    </div>
                </FormInput>
                <FormInput label="Next due date" hint="What the alert counts down to.">
                    <Input type="date" {...nextDue} />
                </FormInput>
                <div className="col-span-full">
                    <DocumentUploadInput
                        label={docLabel}
                        description="Attach the signed copy (PDF, JPG, PNG)"
                        files={files}
                        onFilesChange={onFiles} />
                </div>
            </div>
        </div>
    );
}

/**
 * One ownership document, as the Add Asset form captures it.
 *
 * Written once and used twice: for whatever the ownership structure files, and for the bill
 * of sale a leased or financed asset also has. Everything it asks for is read off the
 * catalog record, so a field added there appears here without this file being touched.
 */
function OwnershipDocCard({
    record, heading, fields, capture, files, onPatch, onField, onFiles, monitored, issueDate, expiryDate,
}: {
    record: SafetyRecord | null;
    heading: string;
    fields: RecordTextField[];
    capture: OwnershipDocCapture;
    files: any[];
    onPatch: (p: Partial<OwnershipDocCapture>) => void;
    onField: (key: string, val: string) => void;
    onFiles: (list: any[]) => void;
    monitored: boolean;
    issueDate: string;
    expiryDate: string;
}) {
    if (!record) return null;
    return (
        <div className="border-t border-slate-100 pt-6">
            <div className="mb-4 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileSignature size={15} /></span>
                <div>
                    <p className="text-[12.5px] font-bold text-slate-800">{heading}</p>
                    <p className="text-[11px] text-slate-500">Filed against this asset as a Compliance &amp; Documents record.</p>
                </div>
            </div>
            <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-6 gap-y-6 @xl:gap-x-8">
                <FormInput label="Record Name" hint="What this document is filed under.">
                    <Input value={capture.label} maxLength={MAX_RECORD_NAME} placeholder={heading}
                        onChange={e => onPatch({ label: e.target.value })} />
                </FormInput>
                {fields.map(f => (
                    <FormInput key={f.key} label={f.label}>
                        {f.money ? (
                            <div className="flex gap-2">
                                <div className="relative min-w-[5.5rem] flex-1">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={14} /></div>
                                    <Input type="number" step="0.01" min="0" className="pl-9" placeholder="0.00"
                                        value={capture.fields[f.key] ?? ''}
                                        onChange={e => onField(f.key, e.target.value)} />
                                </div>
                                <select
                                    value={capture.fields[f.money.currencyKey] ?? f.money.defaultCurrency ?? f.money.currencies[0]}
                                    onChange={e => onField(f.money!.currencyKey, e.target.value)}
                                    className="w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                    {f.money.currencies.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        ) : (
                            <Input value={capture.fields[f.key] ?? ''} placeholder={f.placeholder}
                                onChange={e => onField(f.key, e.target.value)} />
                        )}
                    </FormInput>
                ))}
                <div className="col-span-full">
                    <DocumentUploadInput
                        label={record.documentName || record.recordName}
                        description="Attach the signed document — PDF, DOC, DOCX up to 10MB"
                        files={files}
                        onFilesChange={onFiles} />
                </div>
                {/* The alert on the end date, set here rather than hunted down on the
                    compliance page afterwards. */}
                {monitored && (
                    <div className="col-span-full">
                        <MonitoringToggle record={record} monitoring={capture.monitoring}
                            issueDate={issueDate} expiryDate={expiryDate} status=""
                            onChange={m => onPatch({ monitoring: m })} />
                    </div>
                )}
            </div>
        </div>
    );
}
export function AssetModal({ asset, onClose, onSave, isSaving, accountId }: AssetModalProps) {
    const isEdit = !!asset;
    const { register, handleSubmit, watch, setValue, control, formState: { errors, isDirty } } = useForm({
        resolver: zodResolver(assetSchema),
        defaultValues: asset || {
            assetCategory: 'CMV', assetType: 'Truck', vehicleType: 'Power Unit', operationalStatus: 'Active', unitNumber: '', vin: '', year: new Date().getFullYear(),
            make: 'Freightliner', model: '', color: '', financialStructure: 'Owned',
            plateCountry: 'USA', plateJurisdiction: 'Alabama',
            plateMonitoringEnabled: true, plateMonitorBasedOn: 'expiry_date', plateRenewalRecurrence: 'annually', plateReminderSchedule: [90, 60, 30], plateNotificationChannels: ['email', 'in_app'],
            transponderMonitoringEnabled: true, transponderMonitorBasedOn: 'expiry_date', transponderRenewalRecurrence: 'annually', transponderReminderSchedule: [90, 60, 30], transponderNotificationChannels: ['email', 'in_app'],
            permits: [], driverAssignments: [], country: 'USA',
        }
    });

    const { fields: driverFields, append: appendDriver, remove: removeDriver } = useFieldArray({ control, name: "driverAssignments" });

    /**
     * The drivers this carrier actually has.
     *
     * It used to offer MOCK_DRIVERS — a global demo list whose ids exist in no carrier
     * roster — so assigning one left the inventory list showing no driver for the truck
     * and "carried by the driver of this vehicle" pointing at nobody. MOCK_DRIVERS stays as
     * the fallback for a carrier with an empty roster, so the picker is never blank.
     */
    const drivers = useMemo(() => {
        const roster = accountId ? getDriversForAccount(accountId) : [];
        return roster.length ? roster : MOCK_DRIVERS;
    }, [accountId]);

    const assetType = watch('assetType');
    const financial = watch('financialStructure');
    const plateCountry = watch('plateCountry');
    const plateType = watch('plateType');
    /**
     * The plate section files the "Asset Plates" compliance record, so what it captures is
     * named by that record rather than spelled out here: the document it files, and the two
     * slots it files into (a local plate has no cab card, so it offers one slot, not two).
     */
    const plateRecord = useMemo(() => plateRecordFor(plateType), [plateType]);
    const plateSlots = useMemo(() => plateSlotLabels(plateType), [plateType]);
    const hasCabCard = plateHasCabCard(plateType);
    // The three remaining records the form files. Every label below comes off these, so a
    // record renamed in the catalog renames on this form too.
    const pinkSlipRecord = useMemo(() => assetRecordFor('pinkSlip'), []);
    const safetyRecord = useMemo(() => assetRecordFor('annualSafety'), []);
    const pmRecord = useMemo(() => assetRecordFor('annualPm'), []);
    const opStatus = watch('operationalStatus');

    // Whose address the ownership section is asking for. Named, because an address block
    // under a company name is otherwise just "an address" on a form full of them.
    const addressOwnerLabel = financial === 'Leased' ? 'Leasing company address'
        : financial === 'Financed' ? 'Lien holder address'
        : financial === 'Rented' ? 'Rental agency address'
        : 'Address details';

    // Switching to Owned drops the counterparty it no longer has. Leaving the leasing
    // company's name and address behind would file them against a truck the carrier owns
    // outright -- fields nothing on the form shows, and nothing would ever correct.
    const lastFinancial = useRef(financial);
    useEffect(() => {
        if (lastFinancial.current !== financial) {
            lastFinancial.current = financial;
            if (financial === 'Owned') {
                for (const f of ['ownerName', 'leasingName', 'rentalAgencyName', 'lienHolderBusiness',
                    'streetAddress', 'city', 'stateProvince', 'zipCode'] as const) {
                    setValue(f, '', { shouldDirty: true });
                }
            }
        }
    }, [financial, setValue]);
    const grossWeightValue = watch('grossWeight');
    const grossWeightUnit = watch('grossWeightUnit');

    // ── Lease / finance term ──
    // The agreement window drives the term length and the total over the term, and
    // an end date before the start date is caught here rather than at save.
    const agreementStart = watch('agreementStartDate');
    const agreementEnd = watch('agreementEndDate');
    const monthlyPayment = watch('monthlyPayment');
    const monthlyCurrency = watch('monthlyPaymentCurrency');

    const termError = useMemo(() => {
        if (!agreementStart || !agreementEnd) return undefined;
        return Date.parse(agreementEnd) < Date.parse(agreementStart) ? 'End date is before the start date.' : undefined;
    }, [agreementStart, agreementEnd]);

    const termMonths = useMemo(() => {
        if (!agreementStart || !agreementEnd) return 0;
        const a = new Date(agreementStart), b = new Date(agreementEnd);
        if (Number.isNaN(+a) || Number.isNaN(+b) || b < a) return 0;
        return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
    }, [agreementStart, agreementEnd]);

    const termTotal = useMemo(() => {
        if (!termMonths || !monthlyPayment || monthlyPayment <= 0) return '';
        const total = termMonths * monthlyPayment;
        return `${monthlyCurrency === 'CAD' ? 'CA$' : '$'}${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    }, [termMonths, monthlyPayment, monthlyCurrency]);

    // ── The document the ownership structure is proved by ──
    // Owned files a bill of sale; leased, financed and rented file the agreement they run
    // under. Both are Compliance & Documents records on the asset, so the catalog is what says
    // what the form asks for, what the dates are called and what is being uploaded — this
    // section only supplies the answers it has already collected (see `ownership-docs-bridge`).
    const ownershipRecord = useMemo(() => ownershipRecordFor(financial), [financial]);
    const ownershipFields = useMemo(() => ownershipCardFields(financial), [financial]);
    const ownershipMonitored = !!ownershipRecord && isDateMonitored(ownershipRecord) && !ownershipRecord.hideMonitoring;
    const [ownershipDoc, setOwnershipDoc] = useState<OwnershipDocCapture>(() => emptyOwnershipDoc(asset?.financialStructure ?? 'Owned'));
    // The uploader's own file objects, kept beside the capture so the list can render them.
    const [ownershipFiles, setOwnershipFiles] = useState<any[]>([]);
    const patchDoc = (p: Partial<OwnershipDocCapture>) => setOwnershipDoc(d => ({ ...d, ...p }));
    const setDocField = (key: string, val: string) => setOwnershipDoc(d => ({ ...d, fields: { ...d.fields, [key]: val } }));

    // The bill of sale, asked for whatever the structure says. A leased truck was bought by
    // somebody, and the carrier is asked for the bill either way — so the only case with no
    // second card is Owned, where the structure's own document already IS the bill.
    const showBill = needsSeparateBill(financial);
    const billRecord = useMemo(() => ownershipRecordFor(BILL_STRUCTURE), []);
    const billFields = useMemo(() => ownershipCardFields(BILL_STRUCTURE), []);
    const [billDoc, setBillDoc] = useState<OwnershipDocCapture>(() => emptyOwnershipDoc(BILL_STRUCTURE));
    const [billFiles, setBillFiles] = useState<any[]>([]);
    const setDocFiles = (list: any[]) => {
        setOwnershipFiles(list);
        patchDoc({ files: list.map(f => ({ name: f.fileName, size: f.fileSize ?? 0 })) });
    };
    // Changing the ownership structure changes WHICH document is being filed — a bill of sale
    // is not a lease agreement — so what was captured for the old one goes with it. Left behind,
    // a purchase price would be filed onto a lease.
    const lastStructure = useRef(financial);
    useEffect(() => {
        if (lastStructure.current === financial) return;
        lastStructure.current = financial;
        setOwnershipDoc(emptyOwnershipDoc(financial));
        setOwnershipFiles([]);
    }, [financial]);

    // — Inventory for this vehicle ──────────────────────────────
    // The items, the ones already spoken for, and the ones free to hand out — read
    // exactly the way the Inventory tabs read them, so the two cannot disagree about what
    // is free to give away.
    const { additions, applyEdit: applyItemEdit } = useInventoryAdditions(accountId);
    const { records: handoverRecords } = useDriverHandovers(accountId ?? 'acct-001');
    const inventoryItems = useMemo(() => {
        const base = (accountId ? getInventoryForCarrier(accountId) : INVENTORY_ITEMS).map(applyItemEdit);
        return additions.length ? [...additions, ...base] : base;
    }, [accountId, additions, applyItemEdit]);
    const handedTo = useMemo(() => handedToMap(handoverRecords, accountId ?? 'acct-001'), [handoverRecords, accountId]);
    const freeItems = useMemo(() => unassignedItems(inventoryItems, handedTo), [inventoryItems, handedTo]);
    // What it already holds — only ever on an edit, since a new asset holds nothing.
    const heldRow = useMemo(() => (
        asset?.id
            ? rollupByAsset(inventoryItems, accountId, handedTo).find(r => r.id === asset.id)
            : undefined
    ), [asset?.id, inventoryItems, handedTo, accountId]);

    const [inventoryDraft, setInventoryDraft] = useState<AssetInventoryDraft>(emptyAssetInventoryDraft);
    const setInv = (p: Partial<AssetInventoryDraft>) => setInventoryDraft(d => ({ ...d, ...p }));
    /**
     * The two ticks stack here, because this is a vehicle: something handed to a driver off
     * a truck is still the truck's. Un-assigning it takes the hand-over with it, since a
     * hand-over of something the vehicle does not own is a record of nothing.
     */
    const toggleItem = (id: string) => setInventoryDraft(d => {
        const on = d.itemIds.includes(id);
        return {
            ...d,
            itemIds: on ? d.itemIds.filter(x => x !== id) : [...d.itemIds, id],
        };
    });


    // Whoever is driving it according to THIS form, not the saved record: on a new asset
    // there is no saved record, and on an edit the driver may be changing in this very
    // session. The current assignment is the one with no end date.
    const driverAssignments = watch('driverAssignments');
    const currentDriver = useMemo(() => {
        const list: any[] = driverAssignments ?? [];
        const current = list.find(a => a?.driverId && !a.endDate) ?? list.find(a => a?.driverId);
        if (!current) return null;
        const d = drivers.find(x => x.id === current.driverId);
        return d ? { id: d.id, name: d.name } : null;
    }, [driverAssignments, drivers]);

    const pickedItems = useMemo(
        () => freeItems.filter(it => inventoryDraft.itemIds.includes(it.id)),
        [freeItems, inventoryDraft.itemIds],
    );

    // — The driver is changing —
    // Who was driving it according to the SAVED record, against who the form now names.
    // The kit in the cab does not follow by itself: a fuel card is in somebody’s pocket,
    // and until it comes back through the office the next driver has not got it.
    const previousDriver = useMemo(() => {
        const list: any[] = asset?.driverAssignments ?? [];
        const current = list.find(a => a?.driverId && !a.endDate) ?? list.find(a => a?.driverId);
        if (!current) return null;
        const d = drivers.find(x => x.id === current.driverId);
        return d ? { id: d.id, name: d.name } : null;
    }, [asset?.driverAssignments, drivers]);

    const driverChanged = !!previousDriver && previousDriver.id !== (currentDriver?.id ?? '');
    // Only what travels with the person. Kit filed on the vehicle stays on the vehicle —
    // nobody carries a spare wheel chock home.
    const cabItems = useMemo(
        () => (driverChanged
            ? (heldRow?.items ?? [])
                .filter(h => h.via === 'returnable' && !inventoryDraft.removeIds.includes(h.item.id))
                .map(h => h.item)
            : []),
        [driverChanged, heldRow, inventoryDraft.removeIds],
    );

    // Everything in the cab moves unless somebody says otherwise, and the block resets
    // itself if the driver is put back to who it was.
    useEffect(() => {
        setInventoryDraft(d => ({
            ...d,
            changeover: {
                ...d.changeover,
                outgoing: driverChanged ? previousDriver : null,
                itemIds: driverChanged ? cabItems.map(i => i.id) : [],
            },
        }));
    }, [driverChanged, previousDriver?.id, cabItems.map(i => i.id).join(',')]);

    // What may come off this vehicle, and by which route. The rule lives with the rollup,
    // because the Inventory assign page shows the same pile and offers the same undo — a
    // remove that the next render puts straight back is a lie.
    const onChecklist = useMemo(() => {
        const rec = currentDriver ? handoverRecords[`${accountId ?? 'acct-001'}::${currentDriver.id}`] : undefined;
        return new Set((rec?.lines ?? []).map(l => l.itemId));
    }, [handoverRecords, currentDriver?.id, accountId]);

    const heldRows = useMemo(() => (heldRow?.items ?? []).map(h => ({
        ...h,
        action: removeActionFor(h, 'asset', asset?.id ?? '', onChecklist.has(h.item.id)),
    })), [heldRow, asset?.id, onChecklist]);

    const toggleRemove = (id: string) => setInventoryDraft(d => ({
        ...d,
        removeIds: d.removeIds.includes(id) ? d.removeIds.filter(x => x !== id) : [...d.removeIds, id],
        // Something being taken off the truck is not also something to move to the next
        // driver: it is not going to a driver at all.
        changeover: { ...d.changeover, itemIds: d.changeover.itemIds.filter(x => x !== id) },
    }));

    // Of the ones coming off, the ones somebody is physically holding: kit in the cab, and
    // anything signed across. A spare key in a parked truck is already where it lives.
    const removedInHand = useMemo(
        // Only what somebody is actually holding: a reefer sensor bolted to the truck is
        // already where it lives, and nobody has to bring it anywhere.
        () => heldRows.filter(h => inventoryDraft.removeIds.includes(h.item.id)
            && h.via === 'returnable'),
        [heldRows, inventoryDraft.removeIds],
    );

    const movingItems = useMemo(
        () => cabItems.filter(i => inventoryDraft.changeover.itemIds.includes(i.id)),
        [cabItems, inventoryDraft.changeover.itemIds],
    );

    // Nobody to tell about a spare key that stays in a yarded truck: the message needs both
    // a driver and kit that actually travels with them.
    const handItems = useMemo(
        () => [],
        [],
    );
    // What the incoming driver would be asked to pick up: the cab's kit coming back the
    // other way, anything assigned that rides with them, and anything signed across.
    /**
     * Everything this save would move, in the vocabulary that decides who gets told.
     *
     * The same list the bridge builds at save time — built here too so the form can show the
     * messages before they go, rather than promising something the save then works out
     * differently.
     */
    const inventoryMovements = useMemo<Movement[]>(() => {
        const label = watch('unitNumber') || 'this vehicle';
        const out: Movement[] = [];
        if (inventoryDraft.changeover.askReturn && previousDriver) {
            for (const item of movingItems) {
                out.push({ kind: 'unassign-vehicle', item, person: previousDriver, holderLabel: label, carried: true });
            }
        }
        if (inventoryDraft.changeover.tellIncoming) {
            for (const item of movingItems) {
                out.push({ kind: 'assign-vehicle', item, person: currentDriver, holderLabel: label, carried: true });
            }
        }
        for (const item of pickedItems) {
            // Per item, from the item: the preview has to say the same thing the save will.
            out.push({ kind: 'assign-vehicle', item, person: currentDriver, holderLabel: label, carried: itemTravelsWithDriver(item) });
        }
        for (const item of handItems) {
            out.push({ kind: 'hand-over', item, person: currentDriver, holderLabel: label });
        }
        if (inventoryDraft.askBack && currentDriver) {
            for (const h of removedInHand) {
                out.push({
                    kind: 'unassign-vehicle',
                    item: h.item, person: currentDriver, holderLabel: label, carried: true,
                });
            }
        }
        return out;
    }, [movingItems, pickedItems, handItems, removedInHand, previousDriver, currentDriver,
        inventoryDraft.changeover.askReturn, inventoryDraft.changeover.tellIncoming,
        inventoryDraft.askBack, watch('unitNumber')]);

    const inventoryPlans = useMovementPlans(inventoryMovements, inventoryDraft.notify);

    const vehicleTypeOptions = useMemo(() => {
        if (assetType === 'Truck') return ['Power Unit', 'Straight Truck', 'Tanker'];
        if (assetType === 'Trailer') return ['Dry Van', 'Flatbed', 'Reefer'];
        if (assetType === 'Non-CMV Vehicle') return ['Pickup', 'Van', 'SUV'];
        return [];
    }, [assetType]);

    // ── Section navigator ── the form scrolls inside `scrollRef` (fixed header +
    // rail, like the Add Accident page). Scroll-spy via IntersectionObserver.
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);

    useEffect(() => {
        const root = scrollRef.current;
        if (!root) return;
        const obs = new IntersectionObserver(
            entries => {
                const visible = entries.filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible[0]) setActiveStep(visible[0].target.id.replace('section-', ''));
            },
            { root, rootMargin: '-12px 0px -55% 0px', threshold: 0 },
        );
        STEPS.forEach(s => {
            const sec = document.getElementById(`section-${s.id}`);
            if (sec) obs.observe(sec);
        });
        return () => obs.disconnect();
    }, []);

    const go = (id: string) => {
        const sec = document.getElementById(`section-${id}`);
        const el = scrollRef.current;
        if (!sec || !el) return;
        el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 12, behavior: 'smooth' });
        setActiveStep(id);
    };

    // ── VIN decode (demo API) — one click fills the identity fields from the VIN,
    // the way a NHTSA/vPIC decode does. Only what a VIN actually carries is written back:
    // make, model, year and the weight rating. Unit number and colour are ours, not the VIN's.
    const [vinLookup, setVinLookup] = useState<'idle' | 'loading' | 'done'>('idle');
    const vinTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (vinTimer.current) clearTimeout(vinTimer.current); }, []);
    const lookupVin = () => {
        if (vinLookup === 'loading') return;
        setVinLookup('loading');
        if (vinTimer.current) clearTimeout(vinTimer.current);
        vinTimer.current = setTimeout(() => {
            const current = (watch('vin') || '').toString().trim();
            // Simulated decoder response.
            setValue('vin', current || '1FUJGLDR8CLBP8834', { shouldDirty: true });
            setValue('make', 'Freightliner', { shouldDirty: true });
            setValue('model', 'Cascadia', { shouldDirty: true });
            setValue('year', 2026, { shouldDirty: true });
            setValue('grossWeight', 80000, { shouldDirty: true });
            setValue('grossWeightUnit', 'lbs', { shouldDirty: true });
            setValue('unloadedWeight', 32000, { shouldDirty: true });
            setValue('unloadedWeightUnit', 'lbs', { shouldDirty: true });
            setVinLookup('done');
            vinTimer.current = setTimeout(() => setVinLookup('idle'), 2600);
        }, 950);
    };

    // Per-section completion count → green check + badge in the rail.
    const allValues = watch();
    const filledCount = (...vals: unknown[]) => vals.filter(v => v !== '' && v !== undefined && v !== null && v !== false && !(Array.isArray(v) && v.length === 0)).length;
    const completionFor = (id: string): number => {
        switch (id) {
            case 'class': return filledCount(allValues.assetType, allValues.vehicleType);
            case 'vehicle': return filledCount(allValues.unitNumber, allValues.vin, allValues.make, allValues.model, allValues.year, allValues.color, allValues.grossWeight, allValues.unloadedWeight);
            case 'plate': return filledCount(allValues.plateNumber, allValues.plateType, allValues.plateJurisdiction, allValues.registrationIssueDate, allValues.registrationExpiryDate,
                // Only counted on an IRP plate: on a Local one it is a box that can never
                // be filled, and a section that can never read complete is a nag.
                plateHasCabCard(allValues.plateType) ? ((allValues.cabCardDocument?.length ?? 0) > 0 || undefined) : undefined);
            case 'service': return filledCount(
                allValues.annualSafetyLastDate, allValues.annualSafetyNextDue, allValues.annualSafetyOdometer,
                allValues.annualPmLastDate, allValues.annualPmNextDue, allValues.annualPmOdometer,
                (allValues.annualSafetyDocument?.length ?? 0) > 0 || undefined,
                (allValues.annualPmDocument?.length ?? 0) > 0 || undefined,
            );
            case 'yard': return filledCount(allValues.yardId);
            case 'drivers': return (allValues.driverAssignments ?? []).filter((d: any) => d?.driverId).length;
            case 'inventory': return inventoryDraft.itemIds.length
                + inventoryDraft.changeover.itemIds.length + inventoryDraft.removeIds.length;
            // The document counts too — it is asked for in this section, so a section that has
            // one should not read the same as one that does not.
            case 'ownership': return filledCount(allValues.financialStructure, allValues.marketValue, allValues.ownerName, allValues.leasingName, allValues.rentalAgencyName, allValues.lienHolderBusiness, allValues.agreementStartDate, allValues.agreementEndDate, allValues.monthlyPayment, allValues.streetAddress, ownershipDoc.files.length > 0 || undefined, (showBill && billDoc.files.length > 0) || undefined);
            case 'notes': return filledCount(allValues.notes);
            case 'insurance': return filledCount(allValues.operationalStatus, allValues.dateAdded, allValues.insuranceAddedDate, allValues.odometer, allValues.dateRemoved);
            default: return 0;
        }
    };

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel="Back to assets"
                onBack={onClose}
                icon={Truck}
                title={isEdit ? `Edit Asset — ${asset?.unitNumber}` : 'Register New Asset'}
                subtitle="Asset identity & operational profile"
                actions={
                    <>
                        <Button variant="ghost" onClick={onClose} className="text-slate-600">Discard</Button>
                        <Button type="submit" form="asset-form" disabled={(!isDirty && isEdit) || isSaving} className="h-10 px-8 shadow-lg shadow-blue-500/10 font-bold uppercase tracking-widest text-[11px]">
                            {isSaving ? <RotateCcw size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                            {isEdit ? 'Update Asset' : 'Register Asset'}
                        </Button>
                    </>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={completionFor} />

                <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
                    {/* The ownership document rides along with the asset: the record can only be
                        filed once the asset has an id, which is assigned by whoever saves it. */}
                    <form id="asset-form" onSubmit={handleSubmit(data => onSave({ ...data, ownershipDoc, billDoc: showBill ? billDoc : undefined }, inventoryDraft))} className="@container mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">

                        {/* 1. Asset Class */}
                        <AssetSection id="class" title="Asset Class & Status" subtitle="Classification and vehicle type." icon={IdCard}>
                            {/* Asset Type merges the old Category (CMV/Non-CMV) + Type: Truck = CMV, Trailer = Non-CMV. */}
                            <FormInput label="Asset Type">
                                <select {...register('assetType')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white" onChange={(e) => {
                                    const t = e.target.value;
                                    setValue('assetType', t);
                                    setValue('assetCategory', t === 'Trailer' ? 'Non-CMV' : 'CMV');
                                    setValue('vehicleType', t === 'Trailer' ? 'Dry Van' : 'Power Unit');
                                }}>
                                    <option value="Truck">Truck</option>
                                    <option value="Trailer">Trailer</option>
                                </select>
                            </FormInput>

                            <FormInput label="Vehicle Type">
                                <select {...register('vehicleType')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white" disabled={vehicleTypeOptions.length === 0}>
                                    {vehicleTypeOptions.length > 0 ? vehicleTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>) : <option value="">N/A</option>}
                                </select>
                            </FormInput>
                        </AssetSection>

                        {/* 2. Vehicle Information */}
                        <AssetSection id="vehicle" title="Vehicle Information" subtitle="Identity, weights and specifications." icon={ShieldCheck}
                            right={
                                /* The button alone: the VIN field is the first one in this
                                   section, and a second copy of it up here is the same box
                                   twice. It decodes whatever is typed below. */
                                <div className="flex items-end gap-2">
                                    <button
                                        type="button"
                                        onClick={lookupVin}
                                        disabled={vinLookup === 'loading'}
                                        title="Decode the VIN and fill in make, model, year and weights"
                                        className={cn(
                                            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[11px] font-bold uppercase tracking-wide shadow-sm transition-colors",
                                            vinLookup === 'done'
                                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "bg-[#2563EB] text-white shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
                                        )}
                                    >
                                        {vinLookup === 'loading'
                                            ? <><RotateCcw size={13} className="animate-spin" /> Decoding…</>
                                            : vinLookup === 'done'
                                                ? <><Check size={13} /> Filled</>
                                                : <><Zap size={13} /> Lookup</>}
                                    </button>
                                </div>
                            }
                        >
                            <FormInput label="Unit Number" error={errors.unitNumber?.message as string} required><Input {...register('unitNumber')} placeholder="TR-100" /></FormInput>
                            <FormInput label="VIN (17 Characters)" error={errors.vin?.message as string} required><Input {...register('vin')} maxLength={17} className="font-mono font-semibold" /></FormInput>
                            <FormInput label="Manufacturer/Make" required><Input {...register('make')} placeholder="Freightliner" /></FormInput>
                            <FormInput label="Model" required><Input {...register('model')} placeholder="Cascadia" /></FormInput>
                            <FormInput label="Year"><Input type="number" {...register('year', { valueAsNumber: true })} /></FormInput>
                            <FormInput label="Color"><Input {...register('color')} placeholder="e.g. White" /></FormInput>
                            
                            <FormInput label="Gross Weight (Loaded)">
                                <div className="flex gap-2">
                                    <div className="relative min-w-[5.5rem] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Scale size={14} /></div>
                                        <Input type="number" {...register('grossWeight', { valueAsNumber: true })} className="pl-9" placeholder="0" />
                                    </div>
                                    <select {...register('grossWeightUnit')} className="w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                        <option value="lbs">lbs</option>
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                                <div className="mt-2">
                                    {grossWeightValue && grossWeightValue > 0 ? (
                                        <GvwrTag
                                            weight={grossWeightValue}
                                            unit={grossWeightUnit}
                                            size="sm"
                                        />
                                    ) : (
                                        <span className="text-[10px] text-slate-400 italic">
                                            GVWR class will appear once a weight is entered
                                        </span>
                                    )}
                                </div>
                            </FormInput>

                            <FormInput label="Unloaded Weight">
                                <div className="flex gap-2">
                                    <div className="relative min-w-[5.5rem] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Scale size={14} /></div>
                                        <Input type="number" {...register('unloadedWeight', { valueAsNumber: true })} className="pl-9" placeholder="0" />
                                    </div>
                                    <select {...register('unloadedWeightUnit')} className="w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                        <option value="lbs">lbs</option>
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                            </FormInput>
                        </AssetSection>

                        {/* 3. Plate */}
                        <AssetSection id="plate" title="Registration & Plate" subtitle="Plate, jurisdiction and expiry monitoring." icon={Globe}>
                            <FormInput label="Plate Number"><Input {...register('plateNumber')} placeholder="ABC-1234" /></FormInput>
                            <FormInput label="Plate Type" hint="IRP for interjurisdictional running; Local stays in the base state/province.">
                                <select {...register('plateType')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                                    <option value="">Select plate type…</option>
                                    <option value="IRP">IRP (Apportioned)</option>
                                    <option value="Local">Local</option>
                                </select>
                            </FormInput>
                            <FormInput label="Plate Country"><select {...register('plateCountry')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white"><option value="USA">USA</option><option value="Canada">Canada</option></select></FormInput>
                            <FormInput label="Plate State/Province"><select {...register('plateJurisdiction')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">{(plateCountry === 'USA' ? USA_STATES : CANADA_PROVINCES).map(s => <option key={s} value={s}>{s}</option>)}</select></FormInput>
                            <FormInput label="Issue Date"><Input type="date" {...register('registrationIssueDate')} /></FormInput>
                            <FormInput label="Expiry Date"><Input type="date" {...register('registrationExpiryDate')} /></FormInput>
                            {/* The documents the plate record files, in its own words — and
                                nothing until the plate type has been answered, because until
                                then the record cannot say which they are. An apportioned
                                plate carries a cab card: the document listing the
                                jurisdictions this unit is licensed to run in, and the one an
                                officer asks for at the scale. A local plate has none, so the
                                record offers one box rather than leaving a second standing
                                open as a permanent gap. */}
                            {plateSlots.length > 0 && (
                                <div className="col-span-full">
                                    <DocumentUploadInput
                                        label={plateSlots[0]}
                                        description={`Attach it to the ${plateRecord?.documentName ?? 'plate registration'} (PDF, JPG, PNG)`}
                                        files={watch('plateDocument') || []}
                                        onFilesChange={(files) => setValue('plateDocument', files, { shouldDirty: true })}
                                    />
                                </div>
                            )}
                            {hasCabCard && (
                                <div className="col-span-full">
                                    <DocumentUploadInput
                                        label={plateSlots[1]}
                                        description="The apportioned cab card (PDF, JPG, PNG)"
                                        files={watch('cabCardDocument') || []}
                                        onFilesChange={(files) => setValue('cabCardDocument', files, { shouldDirty: true })}
                                    />
                                </div>
                            )}
                            {/* Said once, where it happens. The office should not discover on
                                the compliance page that the plate it just typed is already
                                filed there. */}
                            {plateSlots.length > 0 && (
                                <p className="col-span-full -mt-2 text-[11px] text-slate-500">
                                    Filed against this asset as a Compliance &amp; Documents record
                                    {plateRecord ? <> — <span className="font-semibold text-slate-600">{plateRecord.recordName}</span></> : null}.
                                </p>
                            )}
                            <MonitoringBlock title="Plate / Registration Expiry Monitoring" prefix="plate" watch={watch} register={register} setValue={setValue} monitorOptions={[{ label: 'Expiry Date', value: 'expiry_date' }, { label: 'Issue Date', value: 'issue_date' }]} />
                        </AssetSection>

                        {/* 4. Yard Terminal */}
                        <AssetSection id="yard" title="Yard / Terminal Assignment" subtitle="Where this asset is based." icon={Warehouse}>
                            <FormInput label="Location Name"><select {...register('yardId')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white"><option value="">Unassigned</option>{MOCK_YARDS.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></FormInput>
                        </AssetSection>

                        {/* 5. Driver Assignment */}
                        <WizardSection id="drivers" icon={Users} title="Driver Assignment" subtitle="Assigned fleet personnel."
                            right={
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    disabled={driverFields.length >= 2}
                                    className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => appendDriver({ driverId: '', startDate: new Date().toISOString().split('T')[0] })}
                                >
                                    <Plus size={14} /> Assign Driver {driverFields.length}/2
                                </Button>
                            }
                        >
                            <div className="space-y-6">
                            {driverFields.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {driverFields.map((field, idx) => {
                                        const dId = watch(`driverAssignments.${idx}.driverId`);
                                        const eDate = watch(`driverAssignments.${idx}.endDate`);
                                        const driverObj = drivers.find(d => d.id === dId);
                                        if (!dId) return null;
                                        return (
                                            <div key={field.id} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-full shadow-sm">
                                                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-tight">{driverObj?.name || "Driver"}</span>
                                                <div className={cn(
                                                    "flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                                                    eDate ? "bg-slate-200 text-slate-600" : "bg-emerald-600 text-white"
                                                )}>
                                                    <Clock size={8} /> {eDate ? "Historical" : "Current"}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {driverFields.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-100 rounded-2xl p-8 text-center bg-slate-50/30">
                                    <p className="text-xs font-medium text-slate-400">No personnel assigned to this asset.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {driverFields.map((field, index) => (
                                        <div key={field.id} className="relative p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-4">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => removeDriver(index)}><Trash size={14} /></Button>
                                            <FormInput label="Driver Name" required>
                                                <select {...register(`driverAssignments.${index}.driverId`)} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                                                    <option value="">Select Driver</option>
                                                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </select>
                                            </FormInput>
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormInput label="Assignment Date" required><Input type="date" {...register(`driverAssignments.${index}.startDate`)} /></FormInput>
                                                <FormInput label="Date Monitoring / End Date"><Input type="date" {...register(`driverAssignments.${index}.endDate`)} /></FormInput>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </div>
                        </WizardSection>

                        {/* 6. Inventory */}
                        <WizardSection id="inventory" icon={Boxes} title="Inventory"
                            subtitle="What this vehicle carries, and who to tell."
                            right={inventoryDraft.itemIds.length > 0 ? (
                                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
                                    {inventoryDraft.itemIds.length} to assign
                                </span>
                            ) : undefined}
                        >
                            <div className="space-y-4">
                                {/* Already on it — read-only here, because taking something back is
                                    the assign page’s job and a second way to do it is a second answer. */}
                                {heldRows.length > 0 && (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                                        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                            <PackageCheck size={12} /> Already on this vehicle
                                            <span className="text-slate-400">{heldRows.length}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {heldRows.map(h => {
                                                const off = inventoryDraft.removeIds.includes(h.item.id);
                                                return (
                                                    <span key={h.item.id} className={cn(
                                                        "inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 text-[11px]",
                                                        off ? "border-rose-200 bg-rose-50/70 text-rose-700" : "border-slate-200 text-slate-700",
                                                    )}>
                                                        <span className={cn("h-3 w-1 rounded-full", VIA_TONE[h.via].bar)} />
                                                        <span className={cn(off && "line-through")}>{itemName(h.item)}</span>
                                                        <span className={cn("rounded border px-1 py-0.5 text-[9px] font-bold uppercase tracking-wider", VIA_TONE[h.via].chip)}>
                                                            {VIA_LABEL.asset[h.via]}
                                                        </span>
                                                        {/* Only what this vehicle's own record put here. Carried kit belongs
                                                            to the vehicle, so the vehicle is exactly the place to let go
                                                            of it; anything else is somebody else's record to undo. */}
                                                        {h.action && (
                                                            <button type="button" onClick={() => toggleRemove(h.item.id)}
                                                                title={off ? "Keep it on this vehicle"
                                                                    : h.action === "unhand" ? `Take it off ${currentDriver?.name ?? "the driver"}’s hand-over`
                                                                    : "Take it off this vehicle"}
                                                                className={cn("ml-0.5 rounded p-0.5 transition-colors",
                                                                    off ? "text-slate-500 hover:bg-slate-200/70" : "text-slate-400 hover:bg-rose-100 hover:text-rose-600")}>
                                                                {off ? <Undo2 size={11} /> : <X size={11} />}
                                                            </button>
                                                        )}
                                                    </span>
                                                );
                                            })}
                                        </div>

                                        {inventoryDraft.removeIds.length === 0 ? (
                                            <p className="mt-2 text-[11px] text-slate-500">
                                                Take something off with the {"\u00D7"}. Anything without one is held through
                                                another record — change that where it lives.
                                            </p>
                                        ) : (
                                            <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                                                <p className="text-[11px] font-semibold text-rose-700">
                                                    {inventoryDraft.removeIds.length} coming off this vehicle when you save.
                                                </p>
                                                {/* Taking it off the record does not take it out of a pocket. */}
                                                {removedInHand.length > 0 && currentDriver && (
                                                    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 px-2.5 py-2">
                                                        <input type="checkbox" checked={inventoryDraft.askBack}
                                                            onChange={e => setInv({ askBack: e.target.checked })}
                                                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" />
                                                        <span className="min-w-0">
                                                            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                                                                <Undo2 size={12} className="text-amber-600" />
                                                                Ask {currentDriver.name} to hand {removedInHand.length === 1 ? "it" : "them"} in at the office
                                                            </span>
                                                            <span className="block text-[11px] leading-snug text-slate-500">
                                                                {currentDriver.name} is holding {removedInHand.length === 1 ? "this one" : `${removedInHand.length} of these`}.
                                                                {" "}Taking {removedInHand.length === 1 ? "it" : "them"} off the record does not take
                                                                {" "}{removedInHand.length === 1 ? "it" : "them"} out of a pocket.
                                                            </span>
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* — The driver is changing —
                                    The kit in the cab does not follow by itself. One of them has it in
                                    their pocket, and the office is the only place it can change hands. */}
                                {driverChanged && cabItems.length > 0 && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                                        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-amber-900">
                                            <Undo2 size={14} />
                                            Driver change
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-amber-200">
                                                {previousDriver!.name}
                                                <ArrowRight size={11} className="text-amber-500" />
                                                {currentDriver?.name ?? "nobody yet"}
                                            </span>
                                        </div>
                                        <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
                                            {previousDriver!.name} is carrying {cabItems.length === 1 ? "an item" : `${cabItems.length} items`} that
                                            {" "}belong{cabItems.length === 1 ? "s" : ""} to this vehicle. Until {cabItems.length === 1 ? "it comes" : "they come"} back
                                            {" "}through the office, {currentDriver?.name ?? "the next driver"} has not got {cabItems.length === 1 ? "it" : "them"}.
                                        </p>

                                        <div className="mt-2 space-y-1">
                                            {cabItems.map(item => {
                                                const on = inventoryDraft.changeover.itemIds.includes(item.id);
                                                return (
                                                    <label key={item.id} className={cn(
                                                        "flex cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-2.5 py-1.5",
                                                        on ? "border-amber-300" : "border-slate-200",
                                                    )}>
                                                        <input type="checkbox" checked={on}
                                                            onChange={() => setInv({ changeover: {
                                                                ...inventoryDraft.changeover,
                                                                itemIds: on
                                                                    ? inventoryDraft.changeover.itemIds.filter(x => x !== item.id)
                                                                    : [...inventoryDraft.changeover.itemIds, item.id],
                                                            } })}
                                                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" />
                                                        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-800">{itemName(item)}</span>
                                                        {item.serial && <span className="shrink-0 font-mono text-[10px] text-slate-400">{item.serial}</span>}
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {movingItems.length > 0 && (
                                            <div className="mt-2.5 space-y-2 border-t border-amber-200/70 pt-2.5">
                                                <label className="flex cursor-pointer items-start gap-2.5">
                                                    <input type="checkbox" checked={inventoryDraft.changeover.askReturn}
                                                        onChange={e => setInv({ changeover: { ...inventoryDraft.changeover, askReturn: e.target.checked } })}
                                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500/30" />
                                                    <span className="min-w-0">
                                                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                                                            <MessageSquare size={12} className="text-amber-600" />
                                                            Ask {previousDriver!.name} to hand {movingItems.length === 1 ? "it" : "them"} in at the office
                                                        </span>
                                                        <span className="block text-[11px] leading-snug text-slate-500">
                                                            Sends the same checklist, pointed the other way. They tick off what they drop in.
                                                        </span>
                                                    </span>
                                                </label>


                                                <label className={cn("flex items-start gap-2.5 border-t border-amber-200/70 pt-2",
                                                    currentDriver ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
                                                    <input type="checkbox" checked={inventoryDraft.changeover.tellIncoming && !!currentDriver}
                                                        disabled={!currentDriver}
                                                        onChange={e => setInv({ changeover: { ...inventoryDraft.changeover, tellIncoming: e.target.checked } })}
                                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                                                    <span className="min-w-0">
                                                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-800">
                                                            <PackageCheck size={12} className="text-blue-600" />
                                                            Tell {currentDriver?.name ?? "the new driver"} to collect {movingItems.length === 1 ? "it" : "them"} from the office
                                                        </span>
                                                        <span className="block text-[11px] leading-snug text-slate-500">
                                                            {currentDriver
                                                                ? "Added to their collection list below, so it is one trip to the office."
                                                                : "Nobody is driving it yet — assign a driver above and they can be told."}
                                                        </span>
                                                    </span>
                                                </label>

                                                <p className="flex items-start gap-1.5 rounded-lg bg-white/70 px-2.5 py-2 text-[11px] leading-snug text-slate-500 ring-1 ring-amber-200/70">
                                                    <Info size={12} className="mt-0.5 shrink-0 text-amber-500" />
                                                    Saving takes {movingItems.length === 1 ? "it" : "them"} off the cab straight away, so until somebody
                                                    picks {movingItems.length === 1 ? "it" : "them"} up the list shows {movingItems.length === 1 ? "it" : "them"} on
                                                    the vehicle with nobody carrying {movingItems.length === 1 ? "it" : "them"} — which is where
                                                    {movingItems.length === 1 ? " it is" : " they are"}: a shelf in the office.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Free to give out — the same list, and the same idea of what
                                    "free" means, as the Inventory assign page. One tick: where it
                                    lands is the item's own answer, not asked again per vehicle. */}
                                <ItemPickList
                                    items={freeItems}
                                    assigned={new Set(inventoryDraft.itemIds)}
                                    onAssign={toggleItem}
                                    holderNoun="vehicle"
                                    destinationFor={(item) => (
                                        itemTravelsWithDriver(item)
                                            ? currentDriver?.name ?? 'whoever drives it'
                                            : watch('unitNumber') || 'this vehicle'
                                    )}
                                    emptyAll={<>Every item in this carrier’s inventory is already on a vehicle, a person or a hand-over.</>}
                                />



                                {/* Tell them — the same block the Add Inventory form and the assign
                                    page show, so the office reads the messages it is about to send
                                    rather than three checkboxes that imply them. */}
                                <MovementNotify
                                    plans={inventoryPlans}
                                    state={inventoryDraft.notify}
                                    onChange={(next) => setInv({ notify: { ...inventoryDraft.notify, ...next } })}
                                    emptyHint={
                                        inventoryDraft.itemIds.length === 0
                                            && inventoryDraft.removeIds.length === 0 && movingItems.length === 0
                                            ? <>Nothing is changing hands yet. Pick something from the list above, or change the driver, and the messages it needs will be drafted here.</>
                                            : !currentDriver
                                                ? <>Nobody drives this vehicle yet. Assign a driver in <span className="font-semibold">Driver Assignment</span> above and the messages can go out with the save.</>
                                                : <>This kit stays with the vehicle, so nobody has to collect or return anything — the <span className="font-semibold">Goes to</span> column says which of the two each item is.</>
                                    }
                                />
                            </div>
                        </WizardSection>

                        {/* Ownership & Financial Profile */}
                        <AssetSection id="ownership" title="Ownership & Financial Profile" subtitle="Ownership structure, value and lien details." icon={KeyRound}>
                            <FormInput label="Ownership Structure">
                                <select {...register('financialStructure')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                                    <option value="Owned">Owned</option>
                                    <option value="Leased">Leased</option>
                                    <option value="Rented">Rented</option>
                                    <option value="Financed">Financed</option>
                                </select>
                            </FormInput>

                            <FormInput label="Current Market Value">
                                <div className="flex gap-2">
                                    <div className="relative min-w-[5.5rem] flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={14} /></div>
                                        <Input type="number" {...register('marketValue', { valueAsNumber: true })} className="pl-9" placeholder="0.00" />
                                    </div>
                                    <select {...register('marketValueCurrency')} className="w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                        <option value="USD">USD</option>
                                        <option value="CAD">CAD</option>
                                    </select>
                                </div>
                            </FormInput>

                            {/* Counterparty (with their address) → term → the document, in that
                                order. Leased, Financed and Rented all run for a term, at a fixed
                                amount a month; Owned has neither, and is proved by its bill of
                                sale. */}
                            <div className="col-span-full border-t border-slate-100 pt-6 mt-2 space-y-6">
                                {/* Who the asset is held with, and where they are — the name and
                                    the address of the same company, so they are read and typed
                                    together rather than three blocks apart.

                                    Owned asks for neither: a carrier that owns its truck outright
                                    IS the owner, so there is nobody to name and nobody's address
                                    to keep. The seller it was bought from is a field on the bill
                                    of sale below, which is where a seller belongs. */}
                                {financial !== 'Owned' && (
                                    <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-6 gap-y-6 @xl:gap-x-8">
                                        {financial === 'Leased' && (
                                            <FormInput label="Leasing Company"><Input {...register('leasingName')} placeholder="e.g. Ryder" /></FormInput>
                                        )}
                                        {financial === 'Financed' && (
                                            <FormInput label="Lien Holder Business"><Input {...register('lienHolderBusiness')} placeholder="e.g. Fleet Finance LLC" /></FormInput>
                                        )}
                                        {financial === 'Rented' && (
                                            <FormInput label="Rental Agency Name"><Input {...register('rentalAgencyName')} placeholder="e.g. Enterprise" /></FormInput>
                                        )}
                                        <AddressSection register={register} watch={watch} title={addressOwnerLabel} />
                                    </div>
                                )}

                                {/* The agreement window and what it costs per month. A rental runs
                                    for a term the same way — its dates are on the rental agreement,
                                    and it is the end of one that has to be seen coming. The two
                                    dates are called what the agreement itself calls them, read off
                                    the catalog record so this form and the filed document agree. */}
                                {financial !== 'Owned' && (
                                    <div className="border-t border-slate-100 pt-6">
                                        <div className="mb-4 flex items-center gap-2">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CalendarClock size={15} /></span>
                                            <div>
                                                <p className="text-[12.5px] font-bold text-slate-800">{financial === 'Leased' ? 'Lease Term' : financial === 'Financed' ? 'Finance Term' : 'Rental Term'}</p>
                                                <p className="text-[11px] text-slate-500">Agreement dates and the monthly payment.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-6 gap-y-6 @xl:gap-x-8">
                                            <FormInput label={ownershipRecord?.issueLabel ?? 'Start Date'} error={errors.agreementStartDate?.message as string | undefined}>
                                                <Input type="date" {...register('agreementStartDate')} />
                                            </FormInput>
                                            <FormInput
                                                label={ownershipRecord?.monitorType ?? 'End Date'}
                                                error={termError}
                                                hint={!termError && termMonths ? `${termMonths} month term` : undefined}
                                            >
                                                <Input type="date" {...register('agreementEndDate')} />
                                            </FormInput>
                                            <FormInput
                                                label={financial === 'Leased' ? 'Monthly Lease Payment' : financial === 'Financed' ? 'Monthly Finance Payment' : 'Monthly Installment'}
                                                hint={termTotal ? `≈ ${termTotal} over the term` : undefined}
                                            >
                                                <div className="flex gap-2">
                                                    <div className="relative min-w-[5.5rem] flex-1">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={14} /></div>
                                                        <Input type="number" step="0.01" min="0" {...register('monthlyPayment', { valueAsNumber: true })} className="pl-9" placeholder="0.00" />
                                                    </div>
                                                    <select {...register('monthlyPaymentCurrency')} className="w-20 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                                        <option value="USD">USD</option>
                                                        <option value="CAD">CAD</option>
                                                    </select>
                                                </div>
                                            </FormInput>
                                        </div>
                                    </div>
                                )}

                                {/* THE DOCUMENT that proves all of the above — filed against this
                                    asset as its own Compliance & Documents record, not as a field
                                    on the asset. Everything it asks for comes from the catalog
                                    record, minus what this section has already collected. */}
                                <OwnershipDocCard
                                    record={ownershipRecord}
                                    heading={ownershipDocLabel(financial)}
                                    fields={ownershipFields}
                                    capture={ownershipDoc}
                                    files={ownershipFiles}
                                    onPatch={patchDoc}
                                    onField={setDocField}
                                    onFiles={setDocFiles}
                                    monitored={ownershipMonitored}
                                    issueDate={agreementStart ?? ''}
                                    expiryDate={agreementEnd ?? ''}
                                />

                                {/* And the bill of sale, on a truck that is leased, financed or
                                    rented. It was bought by somebody before it was leased to
                                    anybody, and the carrier is asked for the bill either way.
                                    Not shown on an Owned asset — there the card above already
                                    IS the bill, and asking twice would file two of them. */}
                                {showBill && (
                                    <OwnershipDocCard
                                        record={billRecord}
                                        heading={ownershipDocLabel(BILL_STRUCTURE)}
                                        fields={billFields}
                                        capture={billDoc}
                                        files={billFiles}
                                        onPatch={p => setBillDoc(d => ({ ...d, ...p }))}
                                        onField={(k, v) => setBillDoc(d => ({ ...d, fields: { ...d.fields, [k]: v } }))}
                                        onFiles={list => {
                                            setBillFiles(list);
                                            setBillDoc(d => ({ ...d, files: list.map((f: any) => ({ name: f.fileName, size: f.fileSize ?? 0 })) }));
                                        }}
                                        // A bill of sale has no term, so nothing to alert on.
                                        monitored={false}
                                        issueDate=""
                                        expiryDate=""
                                    />
                                )}
                            </div>
                        </AssetSection>

                        {/* 7b. Safety & maintenance — two records, one shape each */}
                        <AssetSection id="service" title="Safety & Maintenance" subtitle="The annual inspection and the preventive-maintenance service." icon={Wrench}>
                            {/* Both blocks ask the same three things, because both records
                                are the same shape: when it was last done, at what reading,
                                and when it falls due again. The LAST of those is what the
                                alert fires on — "next due" is not a note somebody keeps up to
                                date, it is the date the office is warned about. */}
                            <ServiceBlock
                                heading={safetyRecord?.recordName ?? 'Annual Safety'}
                                note={safetyRecord?.description ?? ''}
                                lastLabel={safetyRecord?.issueLabel ?? 'Last annual safety date'}
                                docLabel={safetyRecord?.documentName ?? 'Certificate'}
                                lastDate={register('annualSafetyLastDate')}
                                odometer={register('annualSafetyOdometer')}
                                unit={register('annualSafetyOdometerUnit')}
                                nextDue={register('annualSafetyNextDue')}
                                files={watch('annualSafetyDocument') || []}
                                onFiles={(f) => setValue('annualSafetyDocument', f, { shouldDirty: true })}
                            />
                            <ServiceBlock
                                heading={pmRecord?.recordName ?? 'Annual Preventive Maintenance'}
                                note={pmRecord?.description ?? ''}
                                lastLabel={pmRecord?.issueLabel ?? 'Last PM date'}
                                docLabel={pmRecord?.documentName ?? 'Record'}
                                lastDate={register('annualPmLastDate')}
                                odometer={register('annualPmOdometer')}
                                unit={register('annualPmOdometerUnit')}
                                nextDue={register('annualPmNextDue')}
                                files={watch('annualPmDocument') || []}
                                onFiles={(f) => setValue('annualPmDocument', f, { shouldDirty: true })}
                            />
                        </AssetSection>

                        {/* 8. Notes */}
                        <AssetSection id="notes" title="Additional Notes" subtitle="Free-form details about this asset." icon={FileText}>
                            <div className="col-span-full">
                                <FormInput label="Notes (Max 2000 Chars)">
                                    <textarea {...register('notes')} className="w-full h-32 p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" placeholder="Enter additional asset details..." />
                                </FormInput>
                            </div>
                        </AssetSection>

                        {/* 9. Insurance & Operational Status */}
                        <AssetSection id="insurance" title="Insurance & Operational Status" subtitle="Fleet & insurance dates and operational state." icon={Shield}>
                            {/* The pink slip. It lives in the cab, it expires, and the
                                person who finds a lapsed one is usually an officer at the
                                roadside — so it is a record with an alert on it, not a
                                filename on the asset row. */}
                            <div className="col-span-full">
                                <div className="mb-4 flex items-center gap-2">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileSignature size={15} /></span>
                                    <div>
                                        <p className="text-[12.5px] font-bold text-slate-800">{pinkSlipRecord?.recordName ?? 'Pink Slip'}</p>
                                        <p className="text-[11px] text-slate-500">{pinkSlipRecord?.description ?? 'Vehicle proof of insurance'} — filed against this asset as a Compliance &amp; Documents record.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 @xl:grid-cols-2 @3xl:grid-cols-3 gap-x-6 gap-y-6 @xl:gap-x-8">
                                    <FormInput label={pinkSlipRecord?.numberName ?? 'Liability Policy Number'}>
                                        <Input {...register('pinkSlipNumber')} placeholder="Policy number on the slip" />
                                    </FormInput>
                                    <FormInput label="Slip Expiry">
                                        <Input type="date" {...register('pinkSlipExpiry')} />
                                    </FormInput>
                                    <div className="col-span-full">
                                        <DocumentUploadInput
                                            label={pinkSlipRecord?.documentName ?? 'Proof of Automobile Insurance Card (Pink Slip)'}
                                            description="Attach the slip carried in the cab (PDF, JPG, PNG)"
                                            files={watch('pinkSlipDocument') || []}
                                            onFilesChange={(files) => setValue('pinkSlipDocument', files, { shouldDirty: true })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <FormInput label="Operational Status">
                                <select {...register('operationalStatus')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                                    <option value="Active">Active</option>
                                    <option value="Deactivated">Inactive / Deactivated</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="OutOfService">Out of Service</option>
                                    <option value="Drafted">Draft</option>
                                </select>
                            </FormInput>
                            
                            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
                                {/* ACTIVE / MAINTENANCE Fields */}
                                {['Active', 'Maintenance'].includes(opStatus || '') && (
                                    <>
                                        <FormInput label="Date Added to Fleet" required><Input type="date" {...register('dateAdded')} /></FormInput>
                                        <FormInput label="Date Added to Insurance" required={opStatus === 'Active'}><Input type="date" {...register('insuranceAddedDate')} /></FormInput>
                                        
                                        {opStatus === 'Active' && (
                                            <FormInput label="Odometer" required>
                                                <div className="flex gap-2">
                                                    <div className="relative min-w-[5.5rem] flex-1">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Gauge size={14} /></div>
                                                        <Input type="number" {...register('odometer', { valueAsNumber: true })} className="pl-9" placeholder="0" />
                                                    </div>
                                                    <select {...register('odometerUnit')} className="w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                                        <option value="mi">mi</option>
                                                        <option value="km">km</option>
                                                    </select>
                                                </div>
                                            </FormInput>
                                        )}
                                    </>
                                )}

                                {/* DEACTIVATED Fields */}
                                {opStatus === 'Deactivated' && (
                                    <>
                                        <FormInput label="Date Removed from Fleet" required><Input type="date" {...register('dateRemoved')} className="border-rose-200 bg-rose-50/20" /></FormInput>
                                        <FormInput label="Date Removed from Insurance"><Input type="date" {...register('insuranceRemovedDate')} className="border-rose-200 bg-rose-50/20" /></FormInput>
                                    </>
                                )}

                                {/* OOS Fields */}
                                {opStatus === 'OutOfService' && (
                                     <div className="col-span-full p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-sm font-medium flex items-center gap-2">
                                         <AlertCircle size={16} /> Asset is marked Out of Service. No additional fleet dates required.
                                     </div>
                                )}
                            </div>
                        </AssetSection>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default AssetModal;
