import React, { useMemo, useRef, useEffect, useState } from 'react';
import {
    Save, RotateCcw, IdCard, ShieldCheck, Globe, Warehouse, Users,
    Plus, Trash, Clock, KeyRound, Shield, Truck,
    AlertCircle, Scale, DollarSign, MapPin as MapPinIcon, Info, Bell,
    UploadCloud, FileText, Trash2, Gauge, Zap, Check
} from 'lucide-react';
import { WizardHeader, WizardStepNav, WizardSection, type WizardStep } from '@/components/ui/WizardEditor';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { USA_STATES, CANADA_PROVINCES, MOCK_YARDS } from './assets.data';
import { MOCK_DRIVERS } from '@/pages/profile/carrier-profile.data';
import { GvwrTag } from './GvwrTag';

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
    plateType: z.string().optional(),
    plateCountry: z.enum(['USA', 'Canada']).default('USA'),
    plateJurisdiction: z.string().optional(),
    registrationIssueDate: z.string().optional(),
    registrationExpiryDate: z.string().optional(),
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

    streetAddress: z.string().optional(),
    city: z.string().optional(),
    country: z.enum(['USA', 'Canada']).default('USA'),
    stateProvince: z.string().optional(),
    zipCode: z.string().optional(),

    permits: z.array(z.any()).default([]),
});

// --- Helper Form Components ---
// A 3-column field grid used inside each wizard section (replaces the old
// FormSection's inner grid; the section header/card now comes from WizardSection).
const FieldGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6", className)}>{children}</div>
);

// A wizard section card (icon-tile header, à la Add Accident) wrapping a 3-col
// field grid — the drop-in replacement for the old FormSection.
const AssetSection = ({ id, title, subtitle, icon, right, children }: { id: string; title: string; subtitle?: string; icon: React.ElementType; right?: React.ReactNode; children: React.ReactNode }) => (
    <WizardSection id={id} icon={icon} title={title} subtitle={subtitle} right={right}>
        <FieldGrid>{children}</FieldGrid>
    </WizardSection>
);

const FormInput = ({ label, error, children, className, required }: { label: string; error?: string; children: React.ReactNode; className?: string; required?: boolean }) => (
    <div className={cn("flex flex-col gap-1.5", className)}>
        <label className="text-[11px] font-semibold text-slate-700 tracking-tight uppercase flex items-center gap-1">
            {label}
            {required && <span className="text-red-500">*</span>}
        </label>
        {children}
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

function AddressSection({ register, watch }: { register: any; watch: any }) {
    const currentCountry = watch('country');
    return (
        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50/50 border border-slate-100 rounded-xl mt-2">
            <div className="col-span-full text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-100 pb-1 flex items-center gap-2">
                <MapPinIcon size={12} /> Address Details
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
    { id: 'ownership', label: 'Ownership & financial', icon: KeyRound },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'insurance', label: 'Insurance & status', icon: Shield },
];

// --- Main Asset Form Page (in-page wizard, mirrors the Add Accident layout) ---
interface AssetModalProps {
    asset: any;
    onClose: () => void;
    onSave: (data: any) => void;
    isSaving: boolean;
}

export function AssetModal({ asset, onClose, onSave, isSaving }: AssetModalProps) {
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

    const assetType = watch('assetType');
    const financial = watch('financialStructure');
    const plateCountry = watch('plateCountry');
    const opStatus = watch('operationalStatus');
    const grossWeightValue = watch('grossWeight');
    const grossWeightUnit = watch('grossWeightUnit');

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

    // ── Plate lookup (demo API) — one click populates the Registration & Plate
    // section from the plate number, simulating a DMV/registry lookup. ──
    const [plateLookup, setPlateLookup] = useState<'idle' | 'loading' | 'done'>('idle');
    const plateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (plateTimer.current) clearTimeout(plateTimer.current); }, []);
    const lookupPlate = () => {
        if (plateLookup === 'loading') return;
        setPlateLookup('loading');
        if (plateTimer.current) clearTimeout(plateTimer.current);
        plateTimer.current = setTimeout(() => {
            const current = (watch('plateNumber') || '').toString().trim();
            // Simulated registry response.
            setValue('plateNumber', current || 'TX-4821RC', { shouldDirty: true });
            setValue('plateType', 'Commercial', { shouldDirty: true });
            setValue('plateCountry', 'USA', { shouldDirty: true });
            setValue('plateJurisdiction', 'Texas', { shouldDirty: true });
            setValue('registrationIssueDate', '2025-04-01', { shouldDirty: true });
            setValue('registrationExpiryDate', '2026-03-31', { shouldDirty: true });
            setPlateLookup('done');
            plateTimer.current = setTimeout(() => setPlateLookup('idle'), 2600);
        }, 950);
    };

    // Per-section completion count → green check + badge in the rail.
    const allValues = watch();
    const filledCount = (...vals: unknown[]) => vals.filter(v => v !== '' && v !== undefined && v !== null && v !== false && !(Array.isArray(v) && v.length === 0)).length;
    const completionFor = (id: string): number => {
        switch (id) {
            case 'class': return filledCount(allValues.assetType, allValues.vehicleType);
            case 'vehicle': return filledCount(allValues.unitNumber, allValues.vin, allValues.make, allValues.model, allValues.year, allValues.color, allValues.grossWeight, allValues.unloadedWeight);
            case 'plate': return filledCount(allValues.plateNumber, allValues.plateType, allValues.plateJurisdiction, allValues.registrationIssueDate, allValues.registrationExpiryDate);
            case 'yard': return filledCount(allValues.yardId);
            case 'drivers': return (allValues.driverAssignments ?? []).filter((d: any) => d?.driverId).length;
            case 'ownership': return filledCount(allValues.financialStructure, allValues.marketValue, allValues.ownerName, allValues.leasingName, allValues.rentalAgencyName, allValues.lienHolderBusiness);
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
                    <form id="asset-form" onSubmit={handleSubmit(onSave)} className="mx-auto max-w-5xl space-y-6 px-6 py-8">

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
                        <AssetSection id="vehicle" title="Vehicle Information" subtitle="Identity, weights and specifications." icon={ShieldCheck}>
                            <FormInput label="Unit Number" error={errors.unitNumber?.message as string} required><Input {...register('unitNumber')} placeholder="TR-100" /></FormInput>
                            <FormInput label="VIN (17 Characters)" error={errors.vin?.message as string} required><Input {...register('vin')} maxLength={17} className="font-mono font-semibold" /></FormInput>
                            <FormInput label="Manufacturer/Make" required><Input {...register('make')} placeholder="Freightliner" /></FormInput>
                            <FormInput label="Model" required><Input {...register('model')} placeholder="Cascadia" /></FormInput>
                            <FormInput label="Year"><Input type="number" {...register('year', { valueAsNumber: true })} /></FormInput>
                            <FormInput label="Color"><Input {...register('color')} placeholder="e.g. White" /></FormInput>
                            
                            <FormInput label="Gross Weight (Loaded)">
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Scale size={14} /></div>
                                        <Input type="number" {...register('grossWeight', { valueAsNumber: true })} className="pl-9" placeholder="0" />
                                    </div>
                                    <select {...register('grossWeightUnit')} className="w-20 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
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
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Scale size={14} /></div>
                                        <Input type="number" {...register('unloadedWeight', { valueAsNumber: true })} className="pl-9" placeholder="0" />
                                    </div>
                                    <select {...register('unloadedWeightUnit')} className="w-20 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                        <option value="lbs">lbs</option>
                                        <option value="kg">kg</option>
                                    </select>
                                </div>
                            </FormInput>
                        </AssetSection>

                        {/* 3. Plate */}
                        <AssetSection id="plate" title="Registration & Plate" subtitle="Plate, jurisdiction and expiry monitoring." icon={Globe}
                            right={
                                <div className="flex items-end gap-2">
                                    <label className="flex flex-col gap-1">
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Plate Number</span>
                                        <Input {...register('plateNumber')} placeholder="ABC-1234" className="h-9 w-36 sm:w-44" />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={lookupPlate}
                                        disabled={plateLookup === 'loading'}
                                        title="Look up the plate number and auto-fill this section"
                                        className={cn(
                                            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3.5 text-[11px] font-bold uppercase tracking-wide shadow-sm transition-colors",
                                            plateLookup === 'done'
                                                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "bg-[#2563EB] text-white shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
                                        )}
                                    >
                                        {plateLookup === 'loading'
                                            ? <><RotateCcw size={13} className="animate-spin" /> Looking…</>
                                            : plateLookup === 'done'
                                                ? <><Check size={13} /> Filled</>
                                                : <><Zap size={13} /> Lookup</>}
                                    </button>
                                </div>
                            }
                        >
                            <FormInput label="Plate Number"><Input {...register('plateNumber')} placeholder="ABC-1234" /></FormInput>
                            <FormInput label="Plate Type"><Input {...register('plateType')} placeholder="Commercial" /></FormInput>
                            <FormInput label="Plate Country"><select {...register('plateCountry')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white"><option value="USA">USA</option><option value="Canada">Canada</option></select></FormInput>
                            <FormInput label="Plate State/Province"><select {...register('plateJurisdiction')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">{(plateCountry === 'USA' ? USA_STATES : CANADA_PROVINCES).map(s => <option key={s} value={s}>{s}</option>)}</select></FormInput>
                            <FormInput label="Issue Date"><Input type="date" {...register('registrationIssueDate')} /></FormInput>
                            <FormInput label="Expiry Date"><Input type="date" {...register('registrationExpiryDate')} /></FormInput>
                            <div className="col-span-full">
                                <DocumentUploadInput
                                    label="Registration Document"
                                    description="Upload current registration card (PDF, JPG, PNG)"
                                    files={watch('plateDocument') || []}
                                    onFilesChange={(files) => setValue('plateDocument', files, { shouldDirty: true })}
                                />
                            </div>
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
                                        const driverObj = MOCK_DRIVERS.find(d => d.id === dId);
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
                                                    {MOCK_DRIVERS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                                    <div className="relative flex-1">
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><DollarSign size={14} /></div>
                                        <Input type="number" {...register('marketValue', { valueAsNumber: true })} className="pl-9" placeholder="0.00" />
                                    </div>
                                    <select {...register('marketValueCurrency')} className="w-24 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
                                        <option value="USD">USD</option>
                                        <option value="CAD">CAD</option>
                                    </select>
                                </div>
                            </FormInput>

                            <div className="col-span-full border-t border-slate-100 pt-6 mt-2">
                                {financial === 'Leased' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormInput label="Leasing Company"><Input {...register('leasingName')} placeholder="e.g. Ryder" /></FormInput>
                                        <AddressSection register={register} watch={watch} />
                                    </div>
                                )}
                                {financial === 'Rented' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormInput label="Rental Agency Name"><Input {...register('rentalAgencyName')} placeholder="e.g. Enterprise" /></FormInput>
                                        <AddressSection register={register} watch={watch} />
                                    </div>
                                )}
                                {financial === 'Financed' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormInput label="Lien Holder Business"><Input {...register('lienHolderBusiness')} /></FormInput>
                                        <AddressSection register={register} watch={watch} />
                                    </div>
                                )}
                                {financial === 'Owned' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormInput label="Owner Name"><Input {...register('ownerName')} placeholder="Company Legal Name" /></FormInput>
                                    </div>
                                )}
                            </div>
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
                                                    <div className="relative flex-1">
                                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Gauge size={14} /></div>
                                                        <Input type="number" {...register('odometer', { valueAsNumber: true })} className="pl-9" placeholder="0" />
                                                    </div>
                                                    <select {...register('odometerUnit')} className="w-20 rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold px-2 text-slate-700">
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
