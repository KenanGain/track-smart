import React, { useMemo } from 'react';
import {
    X, Save, RotateCcw, IdCard, ShieldCheck, Globe, Warehouse, Users,
    Plus, Trash, Clock, Fingerprint, KeyRound, Landmark, Shield,
    AlertCircle, Scale, DollarSign, MapPin as MapPinIcon, Info, Bell
} from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { USA_STATES, CANADA_PROVINCES, MOCK_DRIVERS, MOCK_YARDS } from './assets.data';

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
    gcwr: z.number().optional(),
    grossWeight: z.number().optional(),
    unloadedWeight: z.number().optional(),

    transponderNumber: z.string().optional(),
    transponderIssueDate: z.string().optional(),
    transponderExpiryDate: z.string().optional(),
    transponderMonitoringEnabled: z.boolean().default(true),
    transponderMonitorBasedOn: z.enum(['expiry_date', 'issue_date']).default('expiry_date'),
    transponderRenewalRecurrence: z.enum(['annually', 'quarterly', 'custom']).default('annually'),
    transponderReminderSchedule: z.array(z.number()).default([90, 60, 30]),
    transponderNotificationChannels: z.array(z.string()).default(['email', 'in_app']),

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

    marketValue: z.number().min(0).optional(),
    notes: z.string().max(2000).optional(),
    driverAssignments: z.array(driverAssignmentSchema).default([]),
    yardId: z.string().optional(),
    operationalStatus: z.enum(['Active', 'Deactivated', 'Maintenance', 'OutOfService', 'Drafted']).default('Active'),
    insuranceAddedDate: z.string().optional(),
    insuranceRemovedDate: z.string().optional(),
    financialStructure: z.enum(['Owned', 'Rented', 'Leased', 'Financed']).default('Owned'),
    ownerName: z.string().optional(),
    leasingName: z.string().optional(),
    lessorCompanyName: z.string().optional(),
    rentalAgencyName: z.string().optional(),
    lienHolderBusiness: z.string().optional(),
    lienHolderName: z.string().optional(),

    streetAddress: z.string().optional(),
    city: z.string().optional(),
    country: z.enum(['USA', 'Canada']).default('USA'),
    stateProvince: z.string().optional(),
    zipCode: z.string().optional(),

    permits: z.array(z.any()).default([]),
});

// --- Helper Form Components ---
const FormSection = ({ title, icon: Icon, children, className }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) => (
    <div className={cn("space-y-6", className)}>
        <div className="flex items-center gap-3 border-b border-slate-50 pb-2.5">
            <div className="p-1.5 bg-blue-50 text-[#2563EB] rounded-lg shadow-sm"><Icon size={14} strokeWidth={2.5} /></div>
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{title}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">{children}</div>
    </div>
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

// --- Main Asset Modal Component ---
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

    const category = watch('assetCategory');
    const assetType = watch('assetType');
    const financial = watch('financialStructure');
    const plateCountry = watch('plateCountry');
    const opStatus = watch('operationalStatus');

    const assetTypeOptions = useMemo(() => {
        if (category === 'CMV') return ['Truck', 'Trailer'];
        if (category === 'Non-CMV') return ['Non-CMV Vehicle', 'Equipment'];
        return [];
    }, [category]);

    const vehicleTypeOptions = useMemo(() => {
        if (assetType === 'Truck') return ['Power Unit', 'Straight Truck', 'Tanker'];
        if (assetType === 'Trailer') return ['Dry Van', 'Flatbed', 'Reefer'];
        if (assetType === 'Non-CMV Vehicle') return ['Pickup', 'Van', 'SUV'];
        return [];
    }, [assetType]);

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px]">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[1000px] max-h-[90vh] flex flex-col overflow-hidden">
                <div className="relative px-8 py-7 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center shrink-0">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-[#2563EB] rounded-r-full" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 tracking-tight">{isEdit ? `Edit Asset — ${asset?.unitNumber}` : 'Register New Asset'}</h2>
                        <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest mt-1">Asset Identity & Operational Profile</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-slate-400"><X size={20} /></Button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-white space-y-12">
                    <form id="asset-form" onSubmit={handleSubmit(onSave)} className="space-y-12 pb-8">

                        {/* 1. Asset Class */}
                        <FormSection title="Asset Class & Status" icon={IdCard}>
                            <FormInput label="Asset Category">
                                <select {...register('assetCategory')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white" onChange={(e) => {
                                    setValue('assetCategory', e.target.value as 'CMV' | 'Non-CMV');
                                    const firstType = e.target.value === 'CMV' ? 'Truck' : 'Non-CMV Vehicle';
                                    setValue('assetType', firstType);
                                    setValue('vehicleType', firstType === 'Truck' ? 'Power Unit' : 'Pickup');
                                }}><option value="CMV">CMV</option><option value="Non-CMV">Non-CMV</option></select>
                            </FormInput>

                            <FormInput label="Asset Type">
                                <select {...register('assetType')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white" onChange={(e) => {
                                    setValue('assetType', e.target.value);
                                    const defaultVehicleMap: Record<string, string> = { 'Truck': 'Power Unit', 'Trailer': 'Dry Van', 'Non-CMV Vehicle': 'Pickup', 'Equipment': '' };
                                    setValue('vehicleType', defaultVehicleMap[e.target.value] || '');
                                }}>{assetTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                            </FormInput>

                            <FormInput label="Vehicle Type">
                                <select {...register('vehicleType')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white" disabled={vehicleTypeOptions.length === 0}>
                                    {vehicleTypeOptions.length > 0 ? vehicleTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>) : <option value="">N/A</option>}
                                </select>
                            </FormInput>
                        </FormSection>

                        {/* 2. Vehicle Information */}
                        <FormSection title="Vehicle Information" icon={ShieldCheck}>
                            <FormInput label="Unit Number" error={errors.unitNumber?.message as string} required><Input {...register('unitNumber')} placeholder="TR-100" /></FormInput>
                            <FormInput label="VIN (17 Characters)" error={errors.vin?.message as string} required><Input {...register('vin')} maxLength={17} className="font-mono font-semibold" /></FormInput>
                            <FormInput label="Manufacturer/Make" required><Input {...register('make')} placeholder="Freightliner" /></FormInput>
                            <FormInput label="Model" required><Input {...register('model')} placeholder="Cascadia" /></FormInput>
                            <FormInput label="Year"><Input type="number" {...register('year', { valueAsNumber: true })} /></FormInput>
                            <FormInput label="Color"><Input {...register('color')} placeholder="e.g. White" /></FormInput>
                            <FormInput label="GCWR (kg)"><div className="relative"><Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input type="number" {...register('gcwr', { valueAsNumber: true })} className="pl-9" /></div></FormInput>
                            <FormInput label="Gross Weight (lbs)"><div className="relative"><Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input type="number" {...register('grossWeight', { valueAsNumber: true })} className="pl-9" placeholder="0" /></div></FormInput>
                            <FormInput label="Unloaded Weight (lbs)"><div className="relative"><Scale size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input type="number" {...register('unloadedWeight', { valueAsNumber: true })} className="pl-9" placeholder="0" /></div></FormInput>
                        </FormSection>

                        {/* 3. Plate */}
                        <FormSection title="Registration & Plate" icon={Globe}>
                            <FormInput label="Plate Number"><Input {...register('plateNumber')} placeholder="ABC-1234" /></FormInput>
                            <FormInput label="Plate Type"><Input {...register('plateType')} placeholder="Commercial" /></FormInput>
                            <FormInput label="Plate Country"><select {...register('plateCountry')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white"><option value="USA">USA</option><option value="Canada">Canada</option></select></FormInput>
                            <FormInput label="Plate State/Province"><select {...register('plateJurisdiction')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">{(plateCountry === 'USA' ? USA_STATES : CANADA_PROVINCES).map(s => <option key={s} value={s}>{s}</option>)}</select></FormInput>
                            <FormInput label="Issue Date"><Input type="date" {...register('registrationIssueDate')} /></FormInput>
                            <FormInput label="Expiry Date"><Input type="date" {...register('registrationExpiryDate')} /></FormInput>
                            <MonitoringBlock title="Plate / Registration Expiry Monitoring" prefix="plate" watch={watch} register={register} setValue={setValue} monitorOptions={[{ label: 'Expiry Date', value: 'expiry_date' }, { label: 'Issue Date', value: 'issue_date' }]} />
                        </FormSection>

                        {/* 4. Yard Terminal */}
                        <FormSection title="Yard / Terminal Assignment" icon={Warehouse}>
                            <FormInput label="Location Name"><select {...register('yardId')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white"><option value="">Unassigned</option>{MOCK_YARDS.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}</select></FormInput>
                        </FormSection>

                        {/* 5. Driver Assignment */}
                        <div className="space-y-6 border-t border-slate-100 pt-12">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm"><Users size={14} strokeWidth={2.5} /></div>
                                    <div>
                                        <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Driver Assignment</h3>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Assigned Fleet Personnel</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="xs"
                                    className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50"
                                    onClick={() => appendDriver({ driverId: '', startDate: '' })}
                                >
                                    <Plus size={14} /> Assign Driver
                                </Button>
                            </div>

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
                                                <FormInput label="Start Date" required><Input type="date" {...register(`driverAssignments.${index}.startDate`)} /></FormInput>
                                                <FormInput label="End Date (Optional)"><Input type="date" {...register(`driverAssignments.${index}.endDate`)} /></FormInput>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 6. Transponder Details */}
                        <FormSection title="Transponder Details" icon={Fingerprint}>
                            <FormInput label="Transponder Number"><Input {...register('transponderNumber')} placeholder="TX-882193" /></FormInput>
                            <FormInput label="Issue Date"><Input type="date" {...register('transponderIssueDate')} /></FormInput>
                            <FormInput label="Expiry Date"><Input type="date" {...register('transponderExpiryDate')} /></FormInput>
                            <MonitoringBlock title="Transponder Monitoring" prefix="transponder" watch={watch} register={register} setValue={setValue} monitorOptions={[{ label: 'Expiry Date', value: 'expiry_date' }, { label: 'Issue Date', value: 'issue_date' }]} />
                        </FormSection>

                        {/* 7. Ownership type */}
                        <FormSection title="Ownership & Financial" icon={KeyRound}>
                            <FormInput label="Ownership Type">
                                <select {...register('financialStructure')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                                    <option value="Owned">Owned</option>
                                    <option value="Leased">Leased</option>
                                    <option value="Rented">Rented</option>
                                    <option value="Financed">Financed</option>
                                </select>
                            </FormInput>
                            <div className="col-span-full border-t border-slate-100 pt-6 mt-2">
                                {financial === 'Leased' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><FormInput label="Leasing Name"><Input {...register('leasingName')} placeholder="e.g. Ryder" /></FormInput><FormInput label="Lessor Company Name"><Input {...register('lessorCompanyName')} /></FormInput><AddressSection register={register} watch={watch} /></div>}
                                {financial === 'Rented' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><FormInput label="Rental Agency Name"><Input {...register('rentalAgencyName')} placeholder="e.g. Enterprise" /></FormInput><AddressSection register={register} watch={watch} /></div>}
                                {financial === 'Financed' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><FormInput label="Lien Holder Business"><Input {...register('lienHolderBusiness')} /></FormInput><FormInput label="Lien Holder Name"><Input {...register('lienHolderName')} /></FormInput><AddressSection register={register} watch={watch} /></div>}
                                {financial === 'Owned' && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><FormInput label="Owner Name"><Input {...register('ownerName')} placeholder="Company Legal Name" /></FormInput></div>}
                            </div>
                        </FormSection>

                        {/* 8. Valuation and Notes */}
                        <FormSection title="Valuation & Notes" icon={Landmark}>
                            <FormInput label="Market Value ($)"><div className="relative"><DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input type="number" {...register('marketValue', { valueAsNumber: true })} className="pl-9" placeholder="0.00" /></div></FormInput>
                            <div className="col-span-full">
                                <FormInput label="Notes (Max 2000 Chars)">
                                    <textarea {...register('notes')} className="w-full h-32 p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500" placeholder="Enter additional asset details..." />
                                </FormInput>
                            </div>
                        </FormSection>

                        {/* 9. Insurance & Operational Status */}
                        <FormSection title="Insurance & Operational Status" icon={Shield}>
                            <FormInput label="Operational Status">
                                <select {...register('operationalStatus')} className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm bg-white">
                                    <option value="Active">Active</option>
                                    <option value="Deactivated">Inactive / Deactivated</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="OutOfService">Out of Service</option>
                                    <option value="Drafted">Draft</option>
                                </select>
                            </FormInput>
                            <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['Active', 'Deactivated', 'Maintenance', 'OutOfService'].includes(opStatus || '') && <div><FormInput label="Date Added to Insurance" required={opStatus === 'Active' || opStatus === 'Deactivated'}><Input type="date" {...register('insuranceAddedDate')} /></FormInput></div>}
                                {(opStatus === 'Deactivated' || opStatus === 'OutOfService') && <div><FormInput label="Date Removed from Insurance" required={opStatus === 'Deactivated'}><Input type="date" {...register('insuranceRemovedDate')} className={cn(opStatus === 'Deactivated' && "border-rose-200 bg-rose-50/20")} /></FormInput></div>}
                            </div>
                        </FormSection>
                    </form>
                </div>

                <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <Button variant="ghost" onClick={onClose}>Discard</Button>
                    <Button type="submit" form="asset-form" disabled={(!isDirty && isEdit) || isSaving} className="px-10 h-10 shadow-lg shadow-blue-500/10 font-bold uppercase tracking-widest text-[11px]">
                        {isSaving ? <RotateCcw size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                        {isEdit ? 'Update Asset' : 'Register Asset'}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default AssetModal;
