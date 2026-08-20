import { useEffect, useRef, useState } from 'react';
import {
    Save, ShieldCheck, AlertTriangle, MapPin, Truck, CalendarClock,
    FileText, Camera, Trash2, BadgeCheck, Building2, User, Shield, Cloud, Check,
    Car, Users, Plus, X, Video, Paperclip, type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AccidentDisclosure } from './AccidentDisclosure';
import { WizardHeader, WizardStepNav, WizardSection, type WizardStep } from '@/components/ui/WizardEditor';
import { FileDropZone } from '@/components/compliance/FileDropZone';
import { loadSafetyTags, tagColor, MAX_DOC_TAGS } from '@/pages/compliance/safety-tags.data';
import { ACCIDENT_TYPES, RISK_TYPE_TONE, type AccidentRiskType } from '@/data/accident-types.data';
import {
    ACCIDENT_STATUS_META, SOURCE_META, PREVENTABILITY_OPTIONS,
    MAX_OTHER_VEHICLES, MAX_WITNESSES, VEHICLE_ACTION_OPTS,
    newOtherVehicle, newWitness, appendUploads, newActivity, nowStamp,
    type AccidentRecord, type OtherVehicle, type Witness, type AccidentFile,
} from '@/data/accident-records.data';

const RISK_LEVELS: AccidentRiskType[] = ['Critical', 'High', 'Medium', 'Low', 'Info'];

const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const labelCls = 'mb-1.5 block text-sm font-semibold text-slate-700';

const STEPS: readonly WizardStep[] = [
    { id: 'owner', label: 'Owner information', icon: Building2 },
    { id: 'driver', label: 'Driver information', icon: User },
    { id: 'details', label: 'Accident details', icon: FileText },
    { id: 'environment', label: 'Road & environment', icon: Cloud },
    { id: 'othervehicles', label: 'Other vehicles', icon: Car },
    { id: 'witnesses', label: 'Witnesses', icon: Users },
    { id: 'police', label: 'Police report', icon: Shield },
    { id: 'evidence', label: 'Evidence & documents', icon: Paperclip },
    { id: 'verify', label: 'Verification', icon: ShieldCheck },
];

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Compact labelled text/date input. */
function TextField({ label, value, onChange, placeholder, type = 'text', full }: {
    label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; full?: boolean;
}) {
    return (
        <div className={full ? 'sm:col-span-2' : ''}>
            <label className={labelCls}>{label}</label>
            <input type={type} className={inputCls} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        </div>
    );
}

/** Labelled select used by the Location / Road & Environment sections. */
function SelectField({ label, value, onChange, options, placeholder = 'Select…', full }: {
    label: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; full?: boolean;
}) {
    return (
        <div className={full ? 'sm:col-span-2' : ''}>
            <label className={labelCls}>{label}</label>
            <select className={inputCls} value={value} onChange={e => onChange(e.target.value)}>
                <option value="">{placeholder}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

const COUNTRY_OPTS = ['USA', 'Canada', 'Mexico'] as const;
const LOCATION_TYPE_OPTS = ['Highway / Freeway', 'City street', 'Intersection', 'Ramp / Interchange', 'Rural road', 'Parking lot', 'Loading dock', 'Bridge', 'Other'] as const;
const ROAD_TYPE_OPTS = ['Highway / Freeway', 'City street', 'Rural road', 'Intersection', 'Ramp / Interchange', 'Bridge', 'Parking lot', 'Other'] as const;
const DIRECTION_OPTS = ['Northbound', 'Southbound', 'Eastbound', 'Westbound', 'Northeast', 'Northwest', 'Southeast', 'Southwest'] as const;
const DUTY_STATUS_OPTS = ['Off duty', 'Sleeper berth', 'Driving', 'On-duty (not driving)'] as const;
const DVIR_STATUS_OPTS = ['No defects reported', 'Defects noted', 'Defects corrected', 'Not completed'] as const;
const REPAIR_STATUS_OPTS = ['Not started', 'Estimate pending', 'In repair', 'Completed', 'Total loss'] as const;

// ── Multi-select checklists (from the collision-report "Road / weather condition" form) ──
const ROAD_COND_OPTS = ['Straight', 'Level', 'Curve', 'Grade', 'Hilly', 'Hill crest', 'Divided highway', 'Marked lanes', 'Unmarked lane', 'Debris/construction', 'Pot holes', 'Wet', 'Dry', 'Icy', 'Snowy', 'Muddy', 'Oily'] as const;
const TRAFFIC_CONTROL_INT_OPTS = ['Four-way stop', 'Four-way traffic lights', 'Stop signs at north/south sides', 'Stop signs at east/west sides', 'Traffic lights at north/south sides', 'Traffic lights at east/west sides'] as const;
const TRAFFIC_COND_OPTS = ['None', 'Heavy', 'Light', 'Stop & go', 'Merging traffic'] as const;
const WEATHER_COND_OPTS = ['Clear', 'Snow', 'Fog', 'Rain', 'Sleet'] as const;
const VISIBILITY_OPTS = ['Daylight', 'Darkness', 'Artificial light', 'Dusk'] as const;

/** Multi-select checkbox group — "check one or more of the following". Responsive:
 *  the caller passes a `gridCls` with per-breakpoint column counts; long labels wrap. */
function CheckGroup({ label, options, values, onToggle, gridCls = 'grid-cols-2 sm:grid-cols-3' }: {
    label: string; options: readonly string[]; values: string[]; onToggle: (v: string) => void; gridCls?: string;
}) {
    return (
        <div>
            <label className={labelCls}>{label}</label>
            <div className={cn('grid gap-2', gridCls)}>
                {options.map(o => {
                    const on = values.includes(o);
                    return (
                        <button key={o} type="button" onClick={() => onToggle(o)}
                            className={cn('flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] leading-tight transition-colors',
                                on ? 'border-blue-400 bg-blue-50 font-medium text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                            <span className={cn('mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white')}>
                                {on && <Check size={11} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 break-words">{o}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Segmented Yes / No control. */
function YesNo({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
            <button type="button" onClick={() => onChange(true)} className={cn('rounded-md px-4 py-1 text-sm font-semibold transition-colors', value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>Yes</button>
            <button type="button" onClick={() => onChange(false)} className={cn('rounded-md px-4 py-1 text-sm font-semibold transition-colors', !value ? 'bg-slate-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>No</button>
        </div>
    );
}

const autoNote = (text: string) => <span className="text-[11px] font-semibold text-blue-600">{text}</span>;

/** Tag picker — reuses the shared document-tag catalog (safety-tags): coloured chips
 *  with remove, plus an "add tag" dropdown, capped at MAX_DOC_TAGS. */
function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
    const all = loadSafetyTags();
    const remaining = all.filter(t => !value.includes(t));
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {value.map(t => (
                <span key={t} className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold', tagColor(t))}>
                    {t}
                    <button type="button" onClick={() => onChange(value.filter(x => x !== t))} className="hover:opacity-70"><X size={10} /></button>
                </span>
            ))}
            {value.length < MAX_DOC_TAGS && (
                <select value="" onChange={e => { const v = e.target.value; if (v) onChange([...value, v]); }}
                    className="h-7 rounded-md border border-slate-200 bg-white px-2 text-[12px] text-slate-600 focus:outline-none">
                    <option value="">+ Tag…</option>
                    {remaining.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            )}
        </div>
    );
}

/** A labelled document/photo/video upload block — reuses the shared FileDropZone.
 *  One document holds multiple files (capped at MAX_UPLOAD_FILES = 10); each file
 *  can carry a note and tags (shared document-tag catalog). */
function DocUpload({ label, hint, accept, icon: Icon, files, onChange }: {
    label: string; hint?: string; accept?: string; icon?: LucideIcon;
    files: AccidentFile[]; onChange: (files: AccidentFile[]) => void;
}) {
    const patch = (id: string, partial: Partial<AccidentFile>) => onChange(files.map(f => (f.id === id ? { ...f, ...partial } : f)));
    return (
        <div>
            <div className="mb-1.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    {Icon && <Icon size={14} className="text-slate-400" />}{label}
                </span>
            </div>
            <FileDropZone
                files={files}
                onAdd={list => onChange(appendUploads(files, list))}
                onRemove={id => onChange(files.filter(x => x.id !== id))}
                multiple
                compact
                accept={accept}
                hint={hint}
            />
            {files.length > 0 && (
                <div className="mt-3 space-y-2.5">
                    {files.map(f => (
                        <div key={f.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                            <p className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-slate-700"><FileText size={12} className="shrink-0 text-slate-400" /> <span className="truncate">{f.fileName}</span></p>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">Note</label>
                                    <input className={cn(inputCls, 'text-[13px]')} value={f.note ?? ''} onChange={e => patch(f.id, { note: e.target.value })} placeholder="Add a note…" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">Tags</label>
                                    <TagPicker value={f.tags ?? []} onChange={tags => patch(f.id, { tags })} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

/** A single third-party / other-vehicle card: vehicle + driver + owner + insurance + action checklist. */
function OtherVehicleCard({ v, index, onChange, onRemove, onToggleAction }: {
    v: OtherVehicle; index: number;
    onChange: (patch: Partial<OtherVehicle>) => void;
    onRemove: () => void;
    onToggleAction: (val: string) => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h5 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">{index + 1}</span>
                    Vehicle {index + 1}
                </h5>
                <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50">
                    <X size={13} /> Remove
                </button>
            </div>

            {/* Vehicle */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <TextField label="Year" value={v.year ?? ''} onChange={val => onChange({ year: val })} placeholder="Year" />
                <TextField label="Make" value={v.make ?? ''} onChange={val => onChange({ make: val })} placeholder="Make" />
                <TextField label="Colour" value={v.colour ?? ''} onChange={val => onChange({ colour: val })} placeholder="Colour" />
                <TextField label="Plate number" value={v.plate ?? ''} onChange={val => onChange({ plate: val })} placeholder="Plate number" />
            </div>

            {/* Driver */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField full label="Driver's name" value={v.driverName ?? ''} onChange={val => onChange({ driverName: val })} placeholder="Driver's name" />
                <TextField full label="Driver's address" value={v.driverAddress ?? ''} onChange={val => onChange({ driverAddress: val })} placeholder="Driver's address" />
                <TextField label="Driver's phone" value={v.driverPhone ?? ''} onChange={val => onChange({ driverPhone: val })} placeholder="Phone" />
                <TextField label="Driver's licence number" value={v.licenceNumber ?? ''} onChange={val => onChange({ licenceNumber: val })} placeholder="Licence number" />
                <TextField label="Prov. / State of issue" value={v.licenceProvince ?? ''} onChange={val => onChange({ licenceProvince: val })} placeholder="Province / state" />
                <TextField label="Date of expiration" type="date" value={v.licenceExpiry ?? ''} onChange={val => onChange({ licenceExpiry: val })} />
                <TextField label="Vehicle VIN" value={v.vehicleVin ?? ''} onChange={val => onChange({ vehicleVin: val })} placeholder="VIN" />
                <TextField label="Trailer(s) VIN" value={v.trailerVin ?? ''} onChange={val => onChange({ trailerVin: val })} placeholder="Trailer VIN" />
                <TextField label="Unit number" value={v.unitNumber ?? ''} onChange={val => onChange({ unitNumber: val })} placeholder="Unit number" />
                <TextField label="Trailer number(s)" value={v.trailerNumbers ?? ''} onChange={val => onChange({ trailerNumbers: val })} placeholder="Trailer number(s)" />
            </div>

            {/* Owner / employer */}
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <TextField full label="Owner / employer's name" value={v.ownerName ?? ''} onChange={val => onChange({ ownerName: val })} placeholder="Owner / employer" />
                <TextField full label="Owner / employer's address" value={v.ownerAddress ?? ''} onChange={val => onChange({ ownerAddress: val })} placeholder="Address" />
                <TextField label="Owner / employer's phone" value={v.ownerPhone ?? ''} onChange={val => onChange({ ownerPhone: val })} placeholder="Phone" />
                <TextField label="No. of persons in vehicle" type="number" value={v.personsInVehicle ?? ''} onChange={val => onChange({ personsInVehicle: val })} placeholder="0" />
            </div>

            {/* Injuries + insurance */}
            <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <span className="text-sm font-medium text-slate-700">Was anyone in the vehicle injured?</span>
                    <div className="flex flex-wrap items-center gap-4">
                        <YesNo value={v.injured ?? false} onChange={val => onChange({ injured: val })} />
                        {v.injured && (
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={v.injuredDriver ?? false} onChange={e => onChange({ injuredDriver: e.target.checked })} /> Driver
                                </label>
                                <label className="flex items-center gap-1.5 text-sm text-slate-600">
                                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={v.injuredPassenger ?? false} onChange={e => onChange({ injuredPassenger: e.target.checked })} /> Passenger
                                </label>
                            </div>
                        )}
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <TextField label="Insurance company" value={v.insuranceCompany ?? ''} onChange={val => onChange({ insuranceCompany: val })} placeholder="Insurance company" />
                    <TextField label="Policy number" value={v.policyNumber ?? ''} onChange={val => onChange({ policyNumber: val })} placeholder="Policy number" />
                </div>
            </div>

            {/* Action / movement checklist */}
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                <CheckGroup label="Action or movement of this vehicle — check all that apply" options={VEHICLE_ACTION_OPTS} values={v.actions ?? []} onToggle={onToggleAction} gridCls="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
                {(v.actions ?? []).includes('Other (describe)') && (
                    <TextField label="Other (describe)" value={v.actionsOther ?? ''} onChange={val => onChange({ actionsOther: val })} placeholder="Describe the other action / movement…" />
                )}
            </div>
        </div>
    );
}

/** A single witness card. */
function WitnessCard({ w, index, onChange, onRemove }: {
    w: Witness; index: number;
    onChange: (patch: Partial<Witness>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
                <h5 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-bold text-blue-600">{index + 1}</span>
                    Witness card {index + 1}
                </h5>
                <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-50">
                    <X size={13} /> Remove
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Name" value={w.name ?? ''} onChange={val => onChange({ name: val })} placeholder="Witness name" />
                <TextField label="Phone" value={w.phone ?? ''} onChange={val => onChange({ phone: val })} placeholder="Phone" />
                <TextField full label="Address" value={w.address ?? ''} onChange={val => onChange({ address: val })} placeholder="Address" />
                <TextField label="Prov. / State" value={w.province ?? ''} onChange={val => onChange({ province: val })} placeholder="Province / state" />
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">Did you see the accident occur?</span>
                    <YesNo value={w.sawAccident ?? false} onChange={val => onChange({ sawAccident: val })} />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>Please describe where you were when the accident occurred</label>
                    <textarea className={cn(inputCls, 'min-h-[56px] resize-y')} value={w.whereWhen ?? ''} onChange={e => onChange({ whereWhen: e.target.value })} placeholder="Where you were…" />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>What do you think caused this accident?</label>
                    <textarea className={cn(inputCls, 'min-h-[56px] resize-y')} value={w.cause ?? ''} onChange={e => onChange({ cause: e.target.value })} placeholder="Probable cause…" />
                </div>
                <div className="sm:col-span-2">
                    <DocUpload label="Witness statement" icon={FileText} accept="image/*,application/pdf" hint="Upload this witness's statement — up to 10 files." files={w.statementFiles ?? []} onChange={files => onChange({ statementFiles: files })} />
                </div>
            </div>
        </div>
    );
}

/**
 * Dedicated Add / Edit / Verify accident PAGE — reuses the shared Add-Account
 * wizard chrome (WizardHeader + white WizardStepNav side panel + WizardSection
 * cards) so it's the exact same UI as the Add New Account editor.
 */
export function AccidentRecordPage({
    initial, isNew, verifierName, onBack, onSave, onDelete,
}: {
    initial: AccidentRecord;
    isNew: boolean;
    verifierName: string;
    onBack: () => void;
    onSave: (r: AccidentRecord) => void;
    onDelete?: (id: string) => void;
}) {
    const [form, setForm] = useState<AccidentRecord>(initial);
    const set = <K extends keyof AccidentRecord>(k: K, v: AccidentRecord[K]) => setForm(f => ({ ...f, [k]: v }));
    const toggleIn = (key: 'roadCondsList' | 'trafficControlsList' | 'trafficCondsList' | 'weatherList' | 'visibilityList', val: string) =>
        setForm(f => {
            const arr = f[key] ?? [];
            return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
        });

    // ── Other vehicles (dynamic, up to MAX_OTHER_VEHICLES) ──
    const setVehicleCount = (n: number) => setForm(f => {
        const cur = f.otherVehicles ?? [];
        if (n <= cur.length) return { ...f, otherVehicles: cur.slice(0, n) };
        const extra = Array.from({ length: n - cur.length }, () => newOtherVehicle());
        return { ...f, otherVehicles: [...cur, ...extra] };
    });
    const addVehicle = () => setForm(f => {
        const cur = f.otherVehicles ?? [];
        return cur.length >= MAX_OTHER_VEHICLES ? f : { ...f, otherVehicles: [...cur, newOtherVehicle()] };
    });
    const removeVehicle = (id: string) => setForm(f => ({ ...f, otherVehicles: (f.otherVehicles ?? []).filter(v => v.id !== id) }));
    const patchVehicle = (id: string, patch: Partial<OtherVehicle>) => setForm(f => ({ ...f, otherVehicles: (f.otherVehicles ?? []).map(v => (v.id === id ? { ...v, ...patch } : v)) }));
    const toggleVehicleAction = (id: string, val: string) => setForm(f => ({
        ...f,
        otherVehicles: (f.otherVehicles ?? []).map(v => {
            if (v.id !== id) return v;
            const arr = v.actions ?? [];
            return { ...v, actions: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
        }),
    }));

    // ── Witnesses (dynamic add-card) ──
    const addWitness = () => setForm(f => {
        const cur = f.witnesses ?? [];
        return cur.length >= MAX_WITNESSES ? f : { ...f, witnesses: [...cur, newWitness()] };
    });
    const removeWitness = (id: string) => setForm(f => ({ ...f, witnesses: (f.witnesses ?? []).filter(w => w.id !== id) }));
    const patchWitness = (id: string, patch: Partial<Witness>) => setForm(f => ({ ...f, witnesses: (f.witnesses ?? []).map(w => (w.id === id ? { ...w, ...patch } : w)) }));

    const statusMeta = ACCIDENT_STATUS_META[form.status];
    const srcMeta = SOURCE_META[form.source];

    const onPickType = (id: string) => {
        const t = ACCIDENT_TYPES.find(x => x.id === id);
        setForm(f => ({
            ...f,
            accidentTypeId: id,
            severity: f.severity || (t?.defaultRiskType ?? ''),
            points: f.points === '' || f.points === undefined ? (t?.defaultRiskPoints ?? '') : f.points,
        }));
    };

    const save = (verify: boolean) => {
        const next: AccidentRecord = { ...form };
        const log = [...(next.activity ?? [])];
        if (isNew) {
            const isDriver = next.source === 'driver-app';
            log.push(newActivity({
                at: nowStamp(), by: next.reportedBy || verifierName, role: isDriver ? 'driver' : 'office',
                action: isDriver ? 'Reported' : 'Created',
                detail: isDriver ? 'Submitted from the mobile app.' : 'Entered from the office.',
            }));
        }
        if (verify) {
            next.status = 'verified';
            next.verifiedBy = verifierName;
            next.verifiedAt = today();
            log.push(newActivity({ at: nowStamp(), by: verifierName, role: 'manager', action: 'Verified' }));
        } else {
            if (next.status === 'reported' && !isNew) next.status = 'review';
            if (!isNew) log.push(newActivity({ at: nowStamp(), by: verifierName, role: 'office', action: 'Updated' }));
        }
        next.activity = log;
        onSave(next);
        onBack();
    };

    // ── Section navigator: click-to-scroll + scroll-spy (inside the main scroll pane) ──
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const [activeStep, setActiveStep] = useState<string>(STEPS[0].id);
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            // At the very bottom, the last (short) section can't reach the top — mark it active.
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) { setActiveStep(STEPS[STEPS.length - 1].id); return; }
            const elTop = el.getBoundingClientRect().top;
            let cur = STEPS[0].id;
            for (const s of STEPS) {
                const sec = el.querySelector<HTMLElement>(`#section-${s.id}`);
                if (sec && sec.getBoundingClientRect().top - elTop <= 130) cur = s.id;
            }
            setActiveStep(cur);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);
    const go = (id: string) => {
        const el = scrollRef.current;
        const sec = el?.querySelector<HTMLElement>(`#section-${id}`);
        if (el && sec) el.scrollTo({ top: el.scrollTop + (sec.getBoundingClientRect().top - el.getBoundingClientRect().top) - 20, behavior: 'smooth' });
        setActiveStep(id);
    };

    const filled = (...vals: unknown[]) => vals.filter(v => v !== '' && v !== undefined && v !== null && v !== false).length;
    const completionFor = (id: string) => {
        switch (id) {
            case 'owner': return filled(form.ownerName, form.ownerStreet, form.ownerCity, form.ownerState, form.ownerZip, form.ownerCountry, form.ownerPhone, form.policyNumber, form.nscCvor);
            case 'driver': return filled(form.driverName, form.driverPhone, form.driverStreet, form.driverCity, form.driverState, form.driverZip, form.driverCountry, form.licenceNumber, form.licenceExpiry, form.licenceProvince);
            case 'details': return filled(form.unitId, form.accidentTypeId, form.description, form.location, form.numFatalities, form.numInjuries, form.numVehiclesTowed, form.towAway, form.hazmatSpill, form.commodityLost, form.cargoLost, form.cargoDamaged, form.odometerAfter, form.hrsDrivingAtCrash, form.hrsOnDutyAtCrash, form.directionOfTravel, form.travelSpeed, form.laneNumber, form.lanesWide, form.landmarks, form.accStreet, form.accCity, form.locationType) + (form.photoFiles?.length ? 1 : 0) + (form.videoFiles?.length ? 1 : 0);
            case 'environment': return filled(form.roadType, form.postedSpeed, form.gradePercent, form.roadCondsOther)
                + (form.roadCondsList?.length ? 1 : 0) + (form.trafficControlsList?.length ? 1 : 0)
                + (form.trafficCondsList?.length ? 1 : 0) + (form.weatherList?.length ? 1 : 0) + (form.visibilityList?.length ? 1 : 0);
            case 'othervehicles': return form.otherVehicles?.length ?? 0;
            case 'witnesses': return (form.witnesses?.length ?? 0) + filled(form.witnessNotes);
            case 'police': return form.policePresent ? filled(form.policeReport, form.policeAgency, form.officer1Name, form.citationIssued, form.citationNumber) + 1 + (form.policeReportFiles?.length ? 1 : 0) : 0;
            case 'evidence': return (form.driverStatementFiles?.length ? 1 : 0);
            case 'verify': return filled(form.severity, form.points, form.preventable, form.claimNumber, form.insurer, form.thirdParty, form.managerNotes);
            default: return 0;
        }
    };

    return (
        <div className="flex h-full flex-col bg-[#F8FAFC] text-slate-900">
            <WizardHeader
                backLabel="Back to accidents"
                onBack={onBack}
                icon={AlertTriangle}
                title={isNew ? 'Add accident' : (form.driverName || 'Accident report')}
                subtitle={
                    <>
                        Report and verify this carrier's accident — owner and driver details auto-filled, then classify and verify.
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', statusMeta.tone)}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', statusMeta.dot)} /> {statusMeta.label}
                            </span>
                            <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold', srcMeta.tone)}>{srcMeta.label}</span>
                            {!isNew && <span className="text-[11px] text-slate-400">Reported {form.reportedAt} by {form.reportedBy}</span>}
                        </div>
                    </>
                }
                actions={
                    <>
                        <button type="button" onClick={onBack} className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800">Cancel</button>
                        <button type="button" onClick={() => save(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                            <Save className="h-4 w-4" /> {isNew ? 'Save' : 'Save changes'}
                        </button>
                        {form.status !== 'verified' && (
                            <button type="button" onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-emerald-700">
                                <ShieldCheck className="h-4 w-4" /> Verify accident
                            </button>
                        )}
                    </>
                }
            />

            <div className="flex flex-1 overflow-hidden">
                <WizardStepNav steps={STEPS} active={activeStep} onGo={go} completionFor={completionFor} />

                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
                        <AccidentDisclosure />

                        <WizardSection id="owner" icon={Building2} title="Owner information" subtitle="Registered owner of the vehicle." right={autoNote('Auto-filled from the carrier')}>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <TextField label="Name" value={form.ownerName ?? ''} onChange={v => set('ownerName', v)} placeholder="Carrier legal name" />
                                <TextField label="Phone" value={form.ownerPhone ?? ''} onChange={v => set('ownerPhone', v)} placeholder="Phone" />
                                <TextField label="Street address" full value={form.ownerStreet ?? ''} onChange={v => set('ownerStreet', v)} placeholder="Number and street" />
                                <TextField label="City" value={form.ownerCity ?? ''} onChange={v => set('ownerCity', v)} placeholder="City" />
                                <TextField label="State / Province" value={form.ownerState ?? ''} onChange={v => set('ownerState', v)} placeholder="State / province" />
                                <TextField label="ZIP / Postal" value={form.ownerZip ?? ''} onChange={v => set('ownerZip', v)} placeholder="ZIP / postal code" />
                                <TextField label="Country" value={form.ownerCountry ?? ''} onChange={v => set('ownerCountry', v)} placeholder="Country" />
                                <TextField label="Policy number" value={form.policyNumber ?? ''} onChange={v => set('policyNumber', v)} placeholder="Insurance policy number" />
                                <TextField label="NSC / CVOR number" value={form.nscCvor ?? ''} onChange={v => set('nscCvor', v)} placeholder="NSC / CVOR" />
                            </div>
                        </WizardSection>

                        <WizardSection id="driver" icon={User} title="Driver information" subtitle="The driver involved in the collision." right={autoNote('Auto-filled from the driver')}>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <TextField label="Name" value={form.driverName} onChange={v => set('driverName', v)} placeholder="Driver name" />
                                <TextField label="Phone" value={form.driverPhone ?? ''} onChange={v => set('driverPhone', v)} placeholder="Phone" />
                                <TextField label="Street address" full value={form.driverStreet ?? ''} onChange={v => set('driverStreet', v)} placeholder="Number and street" />
                                <TextField label="City" value={form.driverCity ?? ''} onChange={v => set('driverCity', v)} placeholder="City" />
                                <TextField label="State / Province" value={form.driverState ?? ''} onChange={v => set('driverState', v)} placeholder="State / province" />
                                <TextField label="ZIP / Postal" value={form.driverZip ?? ''} onChange={v => set('driverZip', v)} placeholder="ZIP / postal code" />
                                <TextField label="Country" value={form.driverCountry ?? ''} onChange={v => set('driverCountry', v)} placeholder="Country" />
                                <TextField label="Licence number" value={form.licenceNumber ?? ''} onChange={v => set('licenceNumber', v)} placeholder="Licence number" />
                                <TextField label="Expiration date" type="date" value={form.licenceExpiry ?? ''} onChange={v => set('licenceExpiry', v)} />
                                <TextField label="Province of issue" value={form.licenceProvince ?? ''} onChange={v => set('licenceProvince', v)} placeholder="Province / state" />
                                <SelectField label="Last duty status" value={form.lastDutyStatus ?? ''} onChange={v => set('lastDutyStatus', v)} options={DUTY_STATUS_OPTS} />
                                <SelectField label="Last DVIR status" value={form.lastDvirStatus ?? ''} onChange={v => set('lastDvirStatus', v)} options={DVIR_STATUS_OPTS} />
                            </div>
                        </WizardSection>

                        <WizardSection id="details" icon={FileText} title="Accident details" subtitle="What happened, collision details and where it occurred.">
                            <div className="space-y-5">
                                {/* Core */}
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <div>
                                        <label className={labelCls}><CalendarClock size={12} className="mr-1 inline" /> Date &amp; time</label>
                                        <input type="datetime-local" className={inputCls} value={form.dateTime} onChange={e => set('dateTime', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}><Truck size={12} className="mr-1 inline" /> Vehicle unit</label>
                                        <input className={inputCls} value={form.unitId} onChange={e => set('unitId', e.target.value)} placeholder="Unit number" />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Accident type</label>
                                        <select className={inputCls} value={form.accidentTypeId} onChange={e => onPickType(e.target.value)}>
                                            <option value="">Select a type…</option>
                                            {ACCIDENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.displayName} · {t.group}</option>)}
                                        </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={labelCls}>What happened / how the collision occurred</label>
                                        <textarea className={cn(inputCls, 'min-h-[80px] resize-y')} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe all the details of the collision…" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={form.injuries} onChange={e => set('injuries', e.target.checked)} />
                                            Injuries involved
                                        </label>
                                        {form.injuries && (
                                            <textarea className={cn(inputCls, 'mt-2 min-h-[56px] resize-y')} value={form.injuryNotes ?? ''} onChange={e => set('injuryNotes', e.target.value)} placeholder="Injury details…" />
                                        )}
                                    </div>
                                </div>

                                {/* Photos & video */}
                                <div className="space-y-4 border-t border-slate-100 pt-5">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Photos &amp; video</h5>
                                    <DocUpload label="Photos of the scene" icon={Camera} accept="image/*" hint="Photos of the scene, vehicles and damage — up to 10 images." files={form.photoFiles ?? []} onChange={files => set('photoFiles', files)} />
                                    <DocUpload label="Evidence video" icon={Video} accept="video/*" hint="Dashcam or scene video — up to 10 files." files={form.videoFiles ?? []} onChange={files => set('videoFiles', files)} />
                                </div>

                                {/* Severity */}
                                <div className="space-y-4 border-t border-slate-100 pt-5">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Severity</h5>
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                        <TextField label="Number of Fatalities" type="number" value={form.numFatalities ?? ''} onChange={v => set('numFatalities', v)} placeholder="0" />
                                        <TextField label="Number of Injuries" type="number" value={form.numInjuries ?? ''} onChange={v => set('numInjuries', v)} placeholder="0" />
                                        <TextField label="Number of Vehicles Towed" type="number" value={form.numVehiclesTowed ?? ''} onChange={v => set('numVehiclesTowed', v)} placeholder="0" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                            <span className="text-sm font-medium text-slate-700">Tow Away</span>
                                            <YesNo value={form.towAway ?? false} onChange={v => set('towAway', v)} />
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                            <span className="text-sm font-medium text-slate-700">HAZMAT Spilled/Released</span>
                                            <YesNo value={form.hazmatSpill ?? false} onChange={v => set('hazmatSpill', v)} />
                                        </div>
                                    </div>

                                    {form.towAway && (
                                        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                            <h6 className="text-xs font-bold uppercase tracking-wider text-slate-500">Insurance, tow &amp; repair</h6>
                                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                                <TextField label="Insurance carrier" value={form.insuranceCarrier ?? ''} onChange={v => set('insuranceCarrier', v)} placeholder="Insurance carrier" />
                                                <TextField label="Policy number" value={form.insurancePolicyNumber ?? ''} onChange={v => set('insurancePolicyNumber', v)} placeholder="Policy number" />
                                                <TextField label="Adjuster name" value={form.adjusterName ?? ''} onChange={v => set('adjusterName', v)} placeholder="Adjuster name" />
                                                <TextField label="Adjuster phone" value={form.adjusterPhone ?? ''} onChange={v => set('adjusterPhone', v)} placeholder="Adjuster phone" />
                                                <TextField full label="TPA / Third-Party Admin" value={form.tpaAdmin ?? ''} onChange={v => set('tpaAdmin', v)} placeholder="Third-party administrator" />
                                                <TextField label="Tow company" value={form.towCompany ?? ''} onChange={v => set('towCompany', v)} placeholder="Tow company" />
                                                <TextField label="Tow bill (amount)" value={form.towBill ?? ''} onChange={v => set('towBill', v)} placeholder="$" />
                                                <TextField label="Repair vendor" value={form.repairVendor ?? ''} onChange={v => set('repairVendor', v)} placeholder="Repair vendor" />
                                                <SelectField label="Repair status" value={form.repairStatus ?? ''} onChange={v => set('repairStatus', v)} options={REPAIR_STATUS_OPTS} />
                                            </div>
                                            <DocUpload label="Repairs document" icon={FileText} accept="image/*,application/pdf" hint="Repair estimates / invoices — up to 10 files." files={form.repairFiles ?? []} onChange={files => set('repairFiles', files)} />
                                        </div>
                                    )}
                                </div>

                                {/* Cargo */}
                                <div className="space-y-4 border-t border-slate-100 pt-5">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Cargo</h5>
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <TextField label="Commodity lost" value={form.commodityLost ?? ''} onChange={v => set('commodityLost', v)} placeholder="Commodity being hauled" />
                                        <TextField label="Cargo lost" value={form.cargoLost ?? ''} onChange={v => set('cargoLost', v)} placeholder="Cargo lost (quantity / value)" />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <span className="text-sm font-medium text-slate-700">Was the cargo damaged?</span>
                                        <YesNo value={form.cargoDamaged ?? false} onChange={v => set('cargoDamaged', v)} />
                                    </div>
                                    {form.cargoDamaged && (
                                        <div className="space-y-5">
                                            <TextField label="Estimated value of the damage" value={form.cargoDamageValue ?? ''} onChange={v => set('cargoDamageValue', v)} placeholder="$" />
                                            <div>
                                                <label className={labelCls}>Describe the damage to the cargo</label>
                                                <textarea className={cn(inputCls, 'min-h-[64px] resize-y')} value={form.cargoDamageDesc ?? ''} onChange={e => set('cargoDamageDesc', e.target.value)} placeholder="Describe the cargo damage…" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Collision information */}
                                <div className="space-y-4 border-t border-slate-100 pt-5">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">Collision information</h5>
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <SelectField label="In what direction were you travelling?" value={form.directionOfTravel ?? ''} onChange={v => set('directionOfTravel', v)} options={DIRECTION_OPTS} />
                                        <div>
                                            <label className={labelCls}>Speed just prior to the collision</label>
                                            <div className="flex gap-2">
                                                <input className={inputCls} inputMode="numeric" value={form.travelSpeed ?? ''} onChange={e => set('travelSpeed', e.target.value)} placeholder="e.g. 90" />
                                                <div className="inline-flex shrink-0 rounded-lg border border-slate-300 bg-white p-0.5">
                                                    {(['km/h', 'mph'] as const).map(u => (
                                                        <button key={u} type="button" onClick={() => set('travelSpeedUnit', u)}
                                                            className={cn('rounded-md px-3 py-1 text-sm font-semibold transition-colors', (form.travelSpeedUnit ?? 'km/h') === u ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50')}>{u}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <TextField label="What lane were you in? (Lane 1 = closest to shoulder)" value={form.laneNumber ?? ''} onChange={v => set('laneNumber', v)} placeholder="e.g. 2" />
                                        <TextField label="How many lanes wide (one direction)?" value={form.lanesWide ?? ''} onChange={v => set('lanesWide', v)} placeholder="e.g. 3" />
                                        <TextField full label="Landmarks" value={form.landmarks ?? ''} onChange={v => set('landmarks', v)} placeholder="Nearby landmarks / cross streets…" />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <span className="text-sm font-medium text-slate-700">Were your headlights on when the collision occurred?</span>
                                        <YesNo value={form.headlightsOn ?? false} onChange={v => set('headlightsOn', v)} />
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <span className="text-sm font-medium text-slate-700">Were warning signals given prior to the collision?</span>
                                        <YesNo value={form.warningSignals ?? false} onChange={v => set('warningSignals', v)} />
                                    </div>
                                    {form.warningSignals && (
                                        <div>
                                            <label className={labelCls}>If yes, what was the signal given and by whom?</label>
                                            <input className={inputCls} value={form.warningSignalDesc ?? ''} onChange={e => set('warningSignalDesc', e.target.value)} placeholder="Signal given and by whom…" />
                                        </div>
                                    )}
                                </div>

                                {/* At the time of the crash */}
                                <div className="space-y-4 border-t border-slate-100 pt-5">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">At the time of the crash</h5>
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                        <TextField label="Odometer reading after crash" value={form.odometerAfter ?? ''} onChange={v => set('odometerAfter', v)} placeholder="e.g. 512,340" />
                                        <TextField label="Hours driving at crash" value={form.hrsDrivingAtCrash ?? ''} onChange={v => set('hrsDrivingAtCrash', v)} placeholder="e.g. 6.5" />
                                        <TextField label="Hours on duty at crash" value={form.hrsOnDutyAtCrash ?? ''} onChange={v => set('hrsOnDutyAtCrash', v)} placeholder="e.g. 9.0" />
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="space-y-4 border-t border-slate-100 pt-5">
                                    <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><MapPin size={13} /> Location</h5>
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            <label className={labelCls}>Location description</label>
                                            <input className={inputCls} value={form.location} onChange={e => set('location', e.target.value)} placeholder="Road, exit, landmark…" />
                                        </div>
                                        <TextField label="Unit number" value={form.accUnit ?? ''} onChange={v => set('accUnit', v)} placeholder="Unit number" />
                                        <TextField label="Street Address" value={form.accStreet ?? ''} onChange={v => set('accStreet', v)} placeholder="Street address" />
                                        <TextField label="City" value={form.accCity ?? ''} onChange={v => set('accCity', v)} placeholder="City" />
                                        <TextField label="State / Prov" value={form.accState ?? ''} onChange={v => set('accState', v)} placeholder="State / province" />
                                        <SelectField label="Country" value={form.accCountry ?? 'USA'} onChange={v => set('accCountry', v)} options={COUNTRY_OPTS} />
                                        <TextField label="Zip / Pin Code" value={form.accZip ?? ''} onChange={v => set('accZip', v)} placeholder="Zip / pin code" />
                                        <SelectField label="Location Type" value={form.locationType ?? ''} onChange={v => set('locationType', v)} options={LOCATION_TYPE_OPTS} />
                                    </div>
                                </div>
                            </div>
                        </WizardSection>

                        <WizardSection id="environment" icon={Cloud} title="Road & environment" subtitle="Road, traffic, weather and visibility conditions — check one or more of each.">
                            <div className="space-y-5">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                    <SelectField label="Road Type" value={form.roadType ?? ''} onChange={v => set('roadType', v)} options={ROAD_TYPE_OPTS} />
                                    <TextField label="Posted Speed Limit (km/h)" value={form.postedSpeed ?? ''} onChange={v => set('postedSpeed', v)} placeholder="e.g. 100" />
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <CheckGroup label="Road conditions — check one or more" options={ROAD_COND_OPTS} values={form.roadCondsList ?? []} onToggle={v => toggleIn('roadCondsList', v)} gridCls="grid-cols-2 sm:grid-cols-3 xl:grid-cols-4" />
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <TextField label="Grade %" value={form.gradePercent ?? ''} onChange={v => set('gradePercent', v)} placeholder="e.g. 5" />
                                        <TextField label="Other (describe)" value={form.roadCondsOther ?? ''} onChange={v => set('roadCondsOther', v)} placeholder="Other road condition…" />
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <CheckGroup label="Traffic controls at the intersection" options={TRAFFIC_CONTROL_INT_OPTS} values={form.trafficControlsList ?? []} onToggle={v => toggleIn('trafficControlsList', v)} gridCls="grid-cols-1 lg:grid-cols-2" />
                                    <TextField label="Other (describe)" value={form.trafficControlsOther ?? ''} onChange={v => set('trafficControlsOther', v)} placeholder="Other traffic control…" />
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <CheckGroup label="Traffic conditions just prior to the accident" options={TRAFFIC_COND_OPTS} values={form.trafficCondsList ?? []} onToggle={v => toggleIn('trafficCondsList', v)} gridCls="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
                                    <TextField label="Other (describe)" value={form.trafficCondsOther ?? ''} onChange={v => set('trafficCondsOther', v)} placeholder="Other traffic condition…" />
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <CheckGroup label="Weather conditions just prior to the accident" options={WEATHER_COND_OPTS} values={form.weatherList ?? []} onToggle={v => toggleIn('weatherList', v)} gridCls="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" />
                                    <TextField label="Other (describe)" value={form.weatherOther ?? ''} onChange={v => set('weatherOther', v)} placeholder="Other weather…" />
                                </div>

                                <div className="space-y-3 border-t border-slate-100 pt-5">
                                    <CheckGroup label="Visibility just prior to the accident" options={VISIBILITY_OPTS} values={form.visibilityList ?? []} onToggle={v => toggleIn('visibilityList', v)} gridCls="grid-cols-2 sm:grid-cols-4" />
                                    <TextField label="Other (describe)" value={form.visibilityOther ?? ''} onChange={v => set('visibilityOther', v)} placeholder="Other visibility…" />
                                </div>
                            </div>
                        </WizardSection>

                        <WizardSection id="othervehicles" icon={Car} title="Other vehicles involved" subtitle="Third-party / other vehicles in the collision — enter one card per vehicle.">
                            <div className="space-y-5">
                                <div>
                                    <label className={labelCls}>How many other vehicles were involved?</label>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {[0, 1, 2, 3, 4, 5].map(n => (
                                            <button key={n} type="button" onClick={() => setVehicleCount(n)}
                                                className={cn('h-9 w-9 rounded-lg border text-sm font-bold transition-colors',
                                                    (form.otherVehicles?.length ?? 0) === n ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400')}>
                                                {n}
                                            </button>
                                        ))}
                                        <span className="ml-1 self-center text-xs text-slate-400">Up to {MAX_OTHER_VEHICLES} vehicles</span>
                                    </div>
                                </div>

                                {(form.otherVehicles ?? []).map((v, i) => (
                                    <OtherVehicleCard key={v.id} v={v} index={i}
                                        onChange={patch => patchVehicle(v.id, patch)}
                                        onRemove={() => removeVehicle(v.id)}
                                        onToggleAction={val => toggleVehicleAction(v.id, val)} />
                                ))}

                                {(form.otherVehicles?.length ?? 0) === 0 && (
                                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">No other vehicles — set a number above or use “Add other vehicle”.</p>
                                )}

                                {(form.otherVehicles?.length ?? 0) < MAX_OTHER_VEHICLES && (
                                    <button type="button" onClick={addVehicle}
                                        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                                        <Plus size={16} /> Add other vehicle
                                    </button>
                                )}
                            </div>
                        </WizardSection>

                        <WizardSection id="witnesses" icon={Users} title="Witnesses" subtitle="Anyone who saw the collision — add a card per witness, plus any additional notes.">
                            <div className="space-y-5">
                                {(form.witnesses ?? []).map((w, i) => (
                                    <WitnessCard key={w.id} w={w} index={i}
                                        onChange={patch => patchWitness(w.id, patch)}
                                        onRemove={() => removeWitness(w.id)} />
                                ))}

                                {(form.witnesses?.length ?? 0) === 0 && (
                                    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">No witnesses added yet.</p>
                                )}

                                {(form.witnesses?.length ?? 0) < MAX_WITNESSES && (
                                    <button type="button" onClick={addWitness}
                                        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                                        <Plus size={16} /> Add witness
                                    </button>
                                )}

                                <div className="border-t border-slate-100 pt-5">
                                    <label className={labelCls}>Additional notes</label>
                                    <textarea className={cn(inputCls, 'min-h-[96px] resize-y')} value={form.witnessNotes ?? ''} onChange={e => set('witnessNotes', e.target.value)} placeholder="Any additional notes about the collision, witnesses or scene…" />
                                </div>
                            </div>
                        </WizardSection>

                        <WizardSection id="police" icon={Shield} title="Police report" subtitle="Police attendance and report details.">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-700">Were the police present at the collision?</span>
                                <YesNo value={form.policePresent ?? false} onChange={v => set('policePresent', v)} />
                            </div>
                            {form.policePresent && (
                                <div className="mt-4 grid grid-cols-1 gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2">
                                    <TextField label="Report number" value={form.policeReport ?? ''} onChange={v => set('policeReport', v)} placeholder="Report number" />
                                    <TextField label="Name of police agency" value={form.policeAgency ?? ''} onChange={v => set('policeAgency', v)} placeholder="Department / agency" />
                                    <TextField label="Agency phone" value={form.policeAgencyPhone ?? ''} onChange={v => set('policeAgencyPhone', v)} placeholder="Phone" />
                                    <TextField label="Officer 1 name" value={form.officer1Name ?? ''} onChange={v => set('officer1Name', v)} placeholder="Officer name" />
                                    <TextField label="Officer 1 badge number" value={form.officer1Badge ?? ''} onChange={v => set('officer1Badge', v)} placeholder="Badge number" />
                                    <TextField label="Officer 2 name" value={form.officer2Name ?? ''} onChange={v => set('officer2Name', v)} placeholder="Officer name" />
                                    <TextField label="Officer 2 badge number" value={form.officer2Badge ?? ''} onChange={v => set('officer2Badge', v)} placeholder="Badge number" />

                                    <div className="sm:col-span-2 space-y-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <span className="text-sm font-medium text-slate-700">Was a citation issued?</span>
                                            <YesNo value={form.citationIssued ?? false} onChange={v => set('citationIssued', v)} />
                                        </div>
                                        {form.citationIssued && (
                                            <div className="space-y-4 border-t border-slate-200 pt-3">
                                                <TextField label="Citation / ticket number" value={form.citationNumber ?? ''} onChange={v => set('citationNumber', v)} placeholder="Citation / ticket number" />
                                                <DocUpload label="Citation / ticket document" icon={FileText} accept="image/*,application/pdf" hint="Upload the citation / ticket — up to 10 files." files={form.citationFiles ?? []} onChange={files => set('citationFiles', files)} />
                                            </div>
                                        )}
                                    </div>

                                    <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                                        <span className="text-sm font-medium text-slate-700">Was anyone arrested?</span>
                                        <YesNo value={form.arrested ?? false} onChange={v => set('arrested', v)} />
                                    </div>
                                    {form.arrested && <TextField full label="Name of person arrested" value={form.arrestedName ?? ''} onChange={v => set('arrestedName', v)} placeholder="Full name" />}
                                    <div className="sm:col-span-2">
                                        <label className={labelCls}>Additional note</label>
                                        <textarea className={cn(inputCls, 'min-h-[64px] resize-y')} value={form.policeNote ?? ''} onChange={e => set('policeNote', e.target.value)} placeholder="Additional notes about the police report…" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <DocUpload label="Police report document(s)" icon={Shield} accept="image/*,application/pdf" hint="Upload the police report — up to 10 files." files={form.policeReportFiles ?? []} onChange={files => set('policeReportFiles', files)} />
                                    </div>
                                </div>
                            )}
                        </WizardSection>

                        <WizardSection id="evidence" icon={Paperclip} title="Evidence & documents" subtitle="The driver's written statement — can hold up to 10 files.">
                            <div className="space-y-6">
                                <DocUpload label="Driver statement" icon={FileText} accept="image/*,application/pdf" hint="The driver's written statement — up to 10 files." files={form.driverStatementFiles ?? []} onChange={files => set('driverStatementFiles', files)} />
                            </div>
                        </WizardSection>

                        <WizardSection id="verify" icon={ShieldCheck} title="Verification & additional data" subtitle="Manager review — classify and attach claim details, then verify.">
                            {form.status === 'verified' && (
                                <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold text-emerald-700">
                                    <BadgeCheck size={15} /> Verified by {form.verifiedBy} on {form.verifiedAt}
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label className={labelCls}>Severity</label>
                                    <select className={inputCls} value={form.severity ?? ''} onChange={e => set('severity', e.target.value as AccidentRiskType | '')}>
                                        <option value="">Not classified</option>
                                        {RISK_LEVELS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    {form.severity && <span className={cn('mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold', RISK_TYPE_TONE[form.severity as AccidentRiskType])}>{form.severity}</span>}
                                </div>
                                <div>
                                    <label className={labelCls}>Risk points</label>
                                    <input type="number" className={inputCls} value={form.points === '' || form.points === undefined ? '' : form.points} onChange={e => set('points', e.target.value === '' ? '' : Number(e.target.value))} placeholder="0" />
                                </div>
                                <div>
                                    <label className={labelCls}>Preventability</label>
                                    <select className={inputCls} value={form.preventable ?? ''} onChange={e => set('preventable', e.target.value as AccidentRecord['preventable'])}>
                                        <option value="">Undetermined</option>
                                        {PREVENTABILITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelCls}>Claim number</label>
                                    <input className={inputCls} value={form.claimNumber ?? ''} onChange={e => set('claimNumber', e.target.value)} placeholder="CLM-…" />
                                </div>
                                <div>
                                    <label className={labelCls}>Insurer</label>
                                    <input className={inputCls} value={form.insurer ?? ''} onChange={e => set('insurer', e.target.value)} placeholder="Insurance carrier" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Third party involved</label>
                                    <input className={inputCls} value={form.thirdParty ?? ''} onChange={e => set('thirdParty', e.target.value)} placeholder="Other vehicle / party details" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelCls}>Manager notes</label>
                                    <textarea className={cn(inputCls, 'min-h-[64px] resize-y')} value={form.managerNotes ?? ''} onChange={e => set('managerNotes', e.target.value)} placeholder="Internal review notes…" />
                                </div>
                            </div>
                        </WizardSection>

                        {!isNew && onDelete && (
                            <div className="flex justify-end">
                                <button type="button" onClick={() => { onDelete(form.id); onBack(); }}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                                    <Trash2 size={15} /> Delete accident
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
