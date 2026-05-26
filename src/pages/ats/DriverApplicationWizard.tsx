import { useState } from "react";
import {
    ArrowLeft, HelpCircle, X as XIcon, Check, PlusCircle,
    Search, Trash2, Pencil, PanelRight, UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignaturePad } from "./SignaturePad";
import {
    APPLICATION_STEPS, TOTAL_STEPS, POSITION_TYPES, LICENSE_CLASSES,
    LICENSE_ENDORSEMENTS, LICENSE_RESTRICTIONS,
    DISQUALIFICATION_OFFENCES, ACCIDENT_NATURES,
    EQUIPMENT_CLASSES, FREIGHT_TYPES, DRIVING_REGIONS, VIOLATION_PENALTIES,
    EDUCATION_LEVELS, regionsFor, emptyApplicationForm,
    newAddress, newLicense, newDisqualification, newAccident, newViolation,
    newDrivingExperience, newEmployment, newEducation,
    type DriverApplicationForm, type CountryId, type AddressValue,
    type AddressRecord, type LicenseRecord, type DisqualificationRecord,
    type AccidentRecord, type ViolationRecord, type DrivingExperienceRecord,
    type EmploymentRecord, type EducationRecord,
} from "./driver-application.data";
import type { ApplicationFormDef } from "./application-forms.data";
import { useCompanyBranding } from "./company-branding.data";

/**
 * Driver Application — 13-step applicant-facing wizard.
 *
 * Opened as a full-screen overlay from the ATS "Add Applicant" action. Each
 * step writes into a single in-memory `DriverApplicationForm`; the "+" list
 * sections (address, license, accident, …) edit their records in a modal.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Field primitives
// ═══════════════════════════════════════════════════════════════════════════

const INPUT_CLS =
    "w-full h-9 rounded border border-slate-300 px-3 text-sm text-slate-800 " +
    "outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";

function Field({
    label, required, children, narrow,
}: {
    label: string; required?: boolean; children: React.ReactNode; narrow?: boolean;
}) {
    return (
        <div className="flex items-start gap-4 py-2">
            <label className={cn(
                "shrink-0 pt-2 text-[12px] font-medium uppercase leading-tight tracking-wide text-slate-500",
                narrow ? "w-32" : "w-64",
            )}>
                {label}{required && <span className="text-red-500"> *</span>}
            </label>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

function TextInput({ value, onChange, type = "text", placeholder }: {
    value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
    return (
        <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLS}
        />
    );
}

function TextArea({ value, onChange, rows = 3 }: {
    value: string; onChange: (v: string) => void; rows?: number;
}) {
    return (
        <textarea
            value={value}
            rows={rows}
            onChange={(e) => onChange(e.target.value)}
            className={cn(INPUT_CLS, "h-auto py-2 resize-y")}
        />
    );
}

function SelectInput({ value, onChange, options, placeholder = "Select…" }: {
    value: string; onChange: (v: string) => void; options: string[]; placeholder?: string;
}) {
    return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
            <option value="">{placeholder}</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                checked ? "bg-blue-500" : "bg-slate-300",
            )}
            aria-pressed={checked}
        >
            <span className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
                checked ? "translate-x-[18px]" : "translate-x-0.5",
            )} />
        </button>
    );
}

function CountryToggle({ value, onChange }: {
    value: CountryId; onChange: (v: CountryId) => void;
}) {
    const opts: CountryId[] = ['Canada', 'United States'];
    return (
        <div className="inline-flex overflow-hidden rounded border border-slate-300">
            {opts.map((o) => (
                <button
                    key={o}
                    type="button"
                    onClick={() => onChange(o)}
                    className={cn(
                        "px-4 py-1.5 text-[12px] font-medium",
                        value === o ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                    )}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

function RadioList({ value, onChange, options }: {
    value: string; onChange: (v: string) => void; options: string[];
}) {
    return (
        <div className="space-y-1.5">
            {options.map((o) => (
                <label key={o} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                        type="radio"
                        checked={value === o}
                        onChange={() => onChange(o)}
                        className="mt-0.5 h-4 w-4 accent-blue-600"
                    />
                    <span>{o}</span>
                </label>
            ))}
        </div>
    );
}

function CheckList({ values, onChange, options }: {
    values: string[]; onChange: (v: string[]) => void; options: string[];
}) {
    const toggle = (o: string) =>
        onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
    return (
        <div className="space-y-1.5">
            {options.map((o) => (
                <label key={o} className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                        type="checkbox"
                        checked={values.includes(o)}
                        onChange={() => toggle(o)}
                        className="mt-0.5 h-4 w-4 accent-blue-600"
                    />
                    <span>{o}</span>
                </label>
            ))}
        </div>
    );
}

/** Searchable state / province picker, scoped to the chosen country. */
function RegionSelect({ value, onChange, country }: {
    value: string; onChange: (v: string) => void; country: CountryId;
}) {
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const options = regionsFor(country);
    const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
    return (
        <div className="relative">
            <input
                value={open ? query : value}
                placeholder="Search state / province…"
                onFocus={() => { setOpen(true); setQuery(""); }}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                className={cn(INPUT_CLS, "pr-8")}
            />
            <Search size={14} className="pointer-events-none absolute right-2.5 top-2.5 text-slate-400" />
            {open && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg">
                    {filtered.length === 0 && (
                        <div className="px-3 py-2 text-xs text-slate-400">No matches</div>
                    )}
                    {filtered.map((o) => (
                        <button
                            key={o}
                            type="button"
                            onMouseDown={() => { onChange(o); setOpen(false); }}
                            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50"
                        >
                            {o}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <h2 className="text-[15px] font-bold uppercase tracking-wide text-blue-600">{children}</h2>
            <div className="mt-1.5 h-0.5 bg-blue-400" />
        </div>
    );
}

/** Mid-page section bar (e.g. "Current Address", "Address History"). Title Case, blue underline. */
function SubSectionHeader({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-5">
            <h2 className="text-[15px] font-bold text-blue-600">{children}</h2>
            <div className="mt-1.5 h-0.5 bg-blue-400" />
        </div>
    );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
    return <p className="mb-4 text-sm text-slate-600">{children}</p>;
}

/** Cloud-icon drop zone used by the driver license front / back uploads. */
function FileUploadField({ value, onChange }: {
    value: string; onChange: (v: string) => void;
}) {
    return (
        <label className="flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-blue-300 bg-blue-50/30 px-4 py-5 text-center hover:bg-blue-50/60">
            <UploadCloud size={28} className="mb-2 text-slate-300" />
            <div className="flex items-center gap-2">
                <span className="rounded border border-slate-300 bg-white px-3 py-1 text-[12px] text-slate-700">
                    Choose File
                </span>
                <span className="text-[12px] text-slate-500">{value || "No file chosen"}</span>
            </div>
            <span className="mt-2 text-[12px] font-medium text-blue-600">Or Drag It Here.</span>
            <input
                type="file"
                className="hidden"
                onChange={(e) => onChange(e.target.files?.[0]?.name ?? "")}
            />
        </label>
    );
}

/**
 * Reusable composite address field — Street, City, Country, State/Province,
 * Postal. One component so every address captured anywhere in the wizard
 * (residence history, employer address, …) renders identical inputs.
 */
function AddressField({ value, onChange, narrow }: {
    value: AddressValue; onChange: (v: AddressValue) => void; narrow?: boolean;
}) {
    const up = (p: Partial<AddressValue>) => onChange({ ...value, ...p });
    return (
        <>
            <Field label="Street" required narrow={narrow}>
                <TextInput value={value.street} onChange={(v) => up({ street: v })} />
            </Field>
            <Field label="Unit Number" narrow={narrow}>
                <TextInput value={value.unitNumber} onChange={(v) => up({ unitNumber: v })} />
            </Field>
            <Field label="City" required narrow={narrow}>
                <TextInput value={value.city} onChange={(v) => up({ city: v })} />
            </Field>
            <Field label="State / Province" required narrow={narrow}>
                <RegionSelect value={value.stateProvince} country={value.country} onChange={(v) => up({ stateProvince: v })} />
            </Field>
            <Field label="Zipcode" required narrow={narrow}>
                <TextInput value={value.postalCode} onChange={(v) => up({ postalCode: v })} />
            </Field>
            <Field label="Country" required narrow={narrow}>
                <CountryToggle value={value.country} onChange={(v) => up({ country: v, stateProvince: "" })} />
            </Field>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Record list (the "+" sections)
// ═══════════════════════════════════════════════════════════════════════════

function RecordList<T extends { id: string }>({
    records, summarize, onAdd, onEdit, onRemove, emptyHint,
}: {
    records: T[];
    summarize: (r: T) => string;
    onAdd: () => void;
    onEdit: (r: T) => void;
    onRemove: (id: string) => void;
    emptyHint?: string;
}) {
    return (
        <div className="space-y-2">
            {records.map((r) => (
                <div
                    key={r.id}
                    className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2"
                >
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                        {summarize(r) || "Untitled record"}
                    </span>
                    <button
                        type="button"
                        onClick={() => onEdit(r)}
                        className="text-slate-400 hover:text-blue-600"
                        title="Edit"
                    >
                        <Pencil size={14} />
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(r.id)}
                        className="text-slate-400 hover:text-red-500"
                        title="Remove"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            ))}
            {records.length === 0 && emptyHint && (
                <p className="text-[12px] italic text-slate-400">{emptyHint}</p>
            )}
            <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
                <PlusCircle size={18} /> Add record
            </button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Modal shell
// ═══════════════════════════════════════════════════════════════════════════

function WizardModal({ title, onClose, onSave, children }: {
    title: string; onClose: () => void; onSave: () => void; children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/40 p-6">
            <div className="my-4 w-full max-w-[640px] rounded-lg bg-white shadow-2xl">
                <div className="flex items-start px-6 pt-5">
                    <div className="flex-1" />
                    <h3 className="flex-[3] text-center text-lg font-bold uppercase tracking-wide text-blue-600">
                        {title}
                    </h3>
                    <div className="flex flex-1 justify-end">
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <XIcon size={18} />
                        </button>
                    </div>
                </div>
                <div className="mx-6 mt-2 h-0.5 bg-blue-400" />
                <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
                <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 rounded px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className="h-9 rounded bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Save record
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Record modals
// ═══════════════════════════════════════════════════════════════════════════

function AddressModal({ initial, onSave, onClose }: {
    initial: AddressRecord; onSave: (r: AddressRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<AddressRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="Address Record" onClose={onClose} onSave={() => onSave(r)}>
            <AddressField narrow value={r.address} onChange={(v) => up({ address: v })} />
            <Field label="From Date" required narrow>
                <TextInput type="date" value={r.fromDate} onChange={(v) => up({ fromDate: v })} />
            </Field>
            <Field label="Current Address?" narrow>
                <Toggle checked={r.isCurrent} onChange={(v) => up({ isCurrent: v, toDate: v ? "" : r.toDate })} />
            </Field>
            {!r.isCurrent && (
                <Field label="To Date" narrow>
                    <TextInput type="date" value={r.toDate} onChange={(v) => up({ toDate: v })} />
                </Field>
            )}
        </WizardModal>
    );
}

function LicenseModal({ initial, onSave, onClose }: {
    initial: LicenseRecord; onSave: (r: LicenseRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<LicenseRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="License Record" onClose={onClose} onSave={() => onSave(r)}>
            <Field label="License Number" required narrow>
                <TextInput value={r.licenseNumber} onChange={(v) => up({ licenseNumber: v })} />
            </Field>
            <Field label="License Class" required narrow>
                <SelectInput value={r.licenseClass} options={LICENSE_CLASSES} onChange={(v) => up({ licenseClass: v })} />
            </Field>
            <Field label="Country" required narrow>
                <CountryToggle value={r.country} onChange={(v) => up({ country: v, stateProvince: "" })} />
            </Field>
            <Field label="State / Province" required narrow>
                <RegionSelect value={r.stateProvince} country={r.country} onChange={(v) => up({ stateProvince: v })} />
            </Field>
            <Field label="Issue Date" required narrow>
                <TextInput type="date" value={r.issueDate} onChange={(v) => up({ issueDate: v })} />
            </Field>
            <Field label="Expiry Date" required narrow>
                <TextInput type="date" value={r.expiryDate} onChange={(v) => up({ expiryDate: v })} />
            </Field>
            <Field label="Endorsements" narrow>
                <CheckList values={r.endorsements} options={LICENSE_ENDORSEMENTS} onChange={(v) => up({ endorsements: v })} />
            </Field>
            <Field label="Restrictions" narrow>
                <CheckList values={r.restrictions} options={LICENSE_RESTRICTIONS} onChange={(v) => up({ restrictions: v })} />
            </Field>
        </WizardModal>
    );
}

function DisqualificationModal({ initial, onSave, onClose }: {
    initial: DisqualificationRecord; onSave: (r: DisqualificationRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<DisqualificationRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="License Disqualification" onClose={onClose} onSave={() => onSave(r)}>
            <Field label="Offence Type" narrow>
                <CheckList values={r.offenceTypes} options={DISQUALIFICATION_OFFENCES} onChange={(v) => up({ offenceTypes: v })} />
            </Field>
            <Field label="Disqualification Date" required narrow>
                <TextInput type="date" value={r.disqualificationDate} onChange={(v) => up({ disqualificationDate: v })} />
            </Field>
            <Field label="Duration in Days" required narrow>
                <TextInput type="number" value={r.durationDays} onChange={(v) => up({ durationDays: v })} />
            </Field>
            <Field label="Explanation" narrow>
                <TextArea value={r.explanation} onChange={(v) => up({ explanation: v })} />
            </Field>
        </WizardModal>
    );
}

function AccidentModal({ initial, onSave, onClose }: {
    initial: AccidentRecord; onSave: (r: AccidentRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<AccidentRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="Accident Record" onClose={onClose} onSave={() => onSave(r)}>
            <SectionIntro>
                Please include the accident date, location, nature of the accident, and any
                injuries, fatalities, or cargo damage/spill.
            </SectionIntro>
            <Field label="Accident Date" required narrow>
                <TextInput type="date" value={r.accidentDate} onChange={(v) => up({ accidentDate: v })} />
            </Field>
            <Field label="Nature of Accident" required narrow>
                <RadioList value={r.natureOfAccident} options={ACCIDENT_NATURES} onChange={(v) => up({ natureOfAccident: v })} />
            </Field>
            <Field label="Country ID" required narrow>
                <CountryToggle value={r.country} onChange={(v) => up({ country: v, stateProvince: "" })} />
            </Field>
            <Field label="State / Province" required narrow>
                <RegionSelect value={r.stateProvince} country={r.country} onChange={(v) => up({ stateProvince: v })} />
            </Field>
            <Field label="Location City" required narrow>
                <TextInput value={r.locationCity} onChange={(v) => up({ locationCity: v })} />
            </Field>
            <Field label="# of Fatalities" narrow>
                <TextInput type="number" value={r.fatalities} onChange={(v) => up({ fatalities: v })} />
            </Field>
            <Field label="# of Injuries" narrow>
                <TextInput type="number" value={r.injuries} onChange={(v) => up({ injuries: v })} />
            </Field>
            <Field label="Cargo Damage / Spill?" narrow>
                <Toggle checked={r.cargoDamage} onChange={(v) => up({ cargoDamage: v })} />
            </Field>
        </WizardModal>
    );
}

function ViolationModal({ initial, onSave, onClose }: {
    initial: ViolationRecord; onSave: (r: ViolationRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<ViolationRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="Traffic Violation Record" onClose={onClose} onSave={() => onSave(r)}>
            <SectionIntro>
                Please provide details of the traffic violation, including the charge or
                offense, issuing authority, date, location, penalties, and any demerit
                points deducted.
            </SectionIntro>
            <Field label="Charge or Offense" required narrow>
                <TextInput value={r.charge} onChange={(v) => up({ charge: v })} />
            </Field>
            <Field label="Issuing Agency / Police Department" required narrow>
                <TextInput value={r.issuingAgency} onChange={(v) => up({ issuingAgency: v })} />
            </Field>
            <Field label="Violation Date" required narrow>
                <TextInput type="date" value={r.violationDate} onChange={(v) => up({ violationDate: v })} />
            </Field>
            <Field label="Country" required narrow>
                <CountryToggle value={r.country} onChange={(v) => up({ country: v, stateProvince: "" })} />
            </Field>
            <Field label="State / Province" required narrow>
                <RegionSelect value={r.stateProvince} country={r.country} onChange={(v) => up({ stateProvince: v })} />
            </Field>
            <Field label="City" required narrow>
                <TextInput value={r.city} onChange={(v) => up({ city: v })} />
            </Field>
            <Field label="Penalty" required narrow>
                <SelectInput value={r.penalty} options={VIOLATION_PENALTIES} onChange={(v) => up({ penalty: v })} />
            </Field>
            <Field label="Penalty Amount" narrow>
                <TextInput value={r.penaltyAmount} onChange={(v) => up({ penaltyAmount: v })} />
            </Field>
            <Field label="Description" narrow>
                <TextArea value={r.description} onChange={(v) => up({ description: v })} />
            </Field>
            <Field label="Did Your Points Get Deducted?" narrow>
                <Toggle checked={r.pointsDeducted} onChange={(v) => up({ pointsDeducted: v })} />
            </Field>
        </WizardModal>
    );
}

function DrivingExperienceModal({ initial, onSave, onClose }: {
    initial: DrivingExperienceRecord; onSave: (r: DrivingExperienceRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<DrivingExperienceRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="Driving Experience Record" onClose={onClose} onSave={() => onSave(r)}>
            <SectionIntro>
                Please provide details of your driving experience, including equipment
                class, freight types, regions driven, dates, mileage, and owner-operator
                status.
            </SectionIntro>
            <Field label="Equipment Class" required narrow>
                <RadioList value={r.equipmentClass} options={EQUIPMENT_CLASSES} onChange={(v) => up({ equipmentClass: v })} />
            </Field>
            <Field label="Freight Types" narrow>
                <CheckList values={r.freightTypes} options={FREIGHT_TYPES} onChange={(v) => up({ freightTypes: v })} />
            </Field>
            <Field label="Driving Regions" narrow>
                <CheckList values={r.drivingRegions} options={DRIVING_REGIONS} onChange={(v) => up({ drivingRegions: v })} />
            </Field>
            <Field label="From Date" required narrow>
                <TextInput type="date" value={r.fromDate} onChange={(v) => up({ fromDate: v })} />
            </Field>
            <Field label="To Date" required narrow>
                <TextInput type="date" value={r.toDate} onChange={(v) => up({ toDate: v })} />
            </Field>
            <Field label="Approximate Miles" required narrow>
                <TextInput type="number" value={r.approximateMiles} onChange={(v) => up({ approximateMiles: v })} />
            </Field>
        </WizardModal>
    );
}

function EmploymentModal({ initial, onSave, onClose }: {
    initial: EmploymentRecord; onSave: (r: EmploymentRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<EmploymentRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="Employment Record" onClose={onClose} onSave={() => onSave(r)}>
            <SectionIntro>
                Provide your employment history for the past 10 years, most recent first.
            </SectionIntro>
            <Field label="Employer Name" required narrow>
                <TextInput value={r.employerName} onChange={(v) => up({ employerName: v })} />
            </Field>
            <Field label="Employer Phone" narrow>
                <TextInput value={r.phone} onChange={(v) => up({ phone: v })} />
            </Field>
            <AddressField narrow value={r.address} onChange={(v) => up({ address: v })} />
            <Field label="Position Held" required narrow>
                <TextInput value={r.positionHeld} onChange={(v) => up({ positionHeld: v })} />
            </Field>
            <Field label="From Date" required narrow>
                <TextInput type="date" value={r.fromDate} onChange={(v) => up({ fromDate: v })} />
            </Field>
            <Field label="Currently Employed Here?" narrow>
                <Toggle checked={r.currentlyEmployed} onChange={(v) => up({ currentlyEmployed: v, toDate: v ? "" : r.toDate })} />
            </Field>
            {!r.currentlyEmployed && (
                <Field label="To Date" narrow>
                    <TextInput type="date" value={r.toDate} onChange={(v) => up({ toDate: v })} />
                </Field>
            )}
            <Field label="Reason for Leaving" narrow>
                <TextInput value={r.reasonForLeaving} onChange={(v) => up({ reasonForLeaving: v })} />
            </Field>
            <Field label="Subject to FMCSRs While Employed?" narrow>
                <Toggle checked={r.subjectToFMCSR} onChange={(v) => up({ subjectToFMCSR: v })} />
            </Field>
            <Field label="DOT Safety-Sensitive Function?" narrow>
                <Toggle checked={r.safetySensitiveDOT} onChange={(v) => up({ safetySensitiveDOT: v })} />
            </Field>
        </WizardModal>
    );
}

function EducationModal({ initial, onSave, onClose }: {
    initial: EducationRecord; onSave: (r: EducationRecord) => void; onClose: () => void;
}) {
    const [r, setR] = useState(initial);
    const up = (p: Partial<EducationRecord>) => setR((x) => ({ ...x, ...p }));
    return (
        <WizardModal title="Education Record" onClose={onClose} onSave={() => onSave(r)}>
            <Field label="School Name" required narrow>
                <TextInput value={r.schoolName} onChange={(v) => up({ schoolName: v })} />
            </Field>
            <Field label="City" narrow>
                <TextInput value={r.city} onChange={(v) => up({ city: v })} />
            </Field>
            <Field label="State / Province" narrow>
                <RegionSelect value={r.stateProvince} country="" onChange={(v) => up({ stateProvince: v })} />
            </Field>
            <Field label="Level of Education" required narrow>
                <SelectInput value={r.level} options={EDUCATION_LEVELS} onChange={(v) => up({ level: v })} />
            </Field>
            <Field label="Field of Study" narrow>
                <TextInput value={r.fieldOfStudy} onChange={(v) => up({ fieldOfStudy: v })} />
            </Field>
            <Field label="Graduated?" narrow>
                <Toggle checked={r.graduated} onChange={(v) => up({ graduated: v })} />
            </Field>
            <Field label="Completion Year" narrow>
                <TextInput value={r.completionYear} onChange={(v) => up({ completionYear: v })} />
            </Field>
        </WizardModal>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Progress tracker
// ═══════════════════════════════════════════════════════════════════════════

function Stepper({ step, onJump }: { step: number; onJump: (n: number) => void }) {
    return (
        <div className="overflow-x-auto border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex min-w-max">
                {APPLICATION_STEPS.map((s, i) => {
                    const n = i + 1;
                    const done = n < step;
                    const active = n === step;
                    return (
                        <div key={s.id} className="flex w-[116px] flex-col items-center">
                            <div className="flex w-full items-center">
                                <span className={cn(
                                    "h-px flex-1",
                                    i === 0 ? "invisible" : n <= step ? "bg-blue-500" : "bg-slate-300",
                                )} />
                                <button
                                    type="button"
                                    onClick={() => onJump(n)}
                                    className={cn(
                                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-white",
                                        active ? "bg-blue-600" : done ? "bg-blue-500" : "bg-slate-400",
                                    )}
                                >
                                    {done ? <Check size={14} /> : n}
                                </button>
                                <span className={cn(
                                    "h-px flex-1",
                                    i === TOTAL_STEPS - 1 ? "invisible" : done ? "bg-blue-500" : "bg-slate-300",
                                )} />
                            </div>
                            <span className={cn(
                                "mt-2 text-center text-[11px] leading-tight",
                                active ? "font-semibold text-slate-900"
                                    : done ? "font-semibold text-slate-700"
                                        : "text-slate-400",
                            )}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Step bodies
// ═══════════════════════════════════════════════════════════════════════════

type Patch = (p: Partial<DriverApplicationForm>) => void;
interface StepProps {
    form: DriverApplicationForm;
    patch: Patch;
    openModal: (key: ListKey, editing: { id: string } | null) => void;
    removeRecord: (key: ListKey, id: string) => void;
}

type ListKey =
    | 'addresses' | 'licenses' | 'disqualifications' | 'accidents'
    | 'violations' | 'drivingExperience' | 'employment' | 'education';

function Step1({ form, patch }: StepProps) {
    return (
        <>
            <SectionHeader>Applicant Information</SectionHeader>
            <Field label="First Name"><TextInput value={form.firstName} onChange={(v) => patch({ firstName: v })} /></Field>
            <Field label="Last Name"><TextInput value={form.lastName} onChange={(v) => patch({ lastName: v })} /></Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(v) => patch({ email: v })} /></Field>
            <Field label="Phone Number" required><TextInput value={form.phone} onChange={(v) => patch({ phone: v })} /></Field>
            <Field label="Date of Birth" required><TextInput type="date" value={form.dateOfBirth} onChange={(v) => patch({ dateOfBirth: v })} /></Field>
            <Field label="Social Security Number" required><TextInput value={form.ssn} onChange={(v) => patch({ ssn: v })} /></Field>
            <Field label="Do you have legal right to work in the United States?">
                <Toggle checked={form.legalRightToWorkUS} onChange={(v) => patch({ legalRightToWorkUS: v })} />
            </Field>
            <Field label="Position Type">
                <SelectInput value={form.positionType} options={POSITION_TYPES} onChange={(v) => patch({ positionType: v })} />
            </Field>
        </>
    );
}

function Step2({ form, patch, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SubSectionHeader>Current Address</SubSectionHeader>
            <AddressField narrow value={form.currentAddress} onChange={(v) => patch({ currentAddress: v })} />
            <Field label="From" required narrow>
                <TextInput type="date" value={form.currentAddressFromDate} onChange={(v) => patch({ currentAddressFromDate: v })} />
            </Field>
            <Field label="Lived here 3+ years?" narrow>
                <input
                    type="checkbox"
                    checked={form.livedHere3PlusYears}
                    onChange={(e) => patch({ livedHere3PlusYears: e.target.checked })}
                    className="h-4 w-4 accent-blue-600"
                />
            </Field>

            <div className="mt-8">
                <SubSectionHeader>Address History</SubSectionHeader>
                <p className="mb-4 text-sm font-medium text-slate-700">
                    Please provide all addresses where you've lived in the past 3 years
                </p>
                <Field label="Address History" narrow>
                    <RecordList
                        records={form.addresses}
                        emptyHint="No previous addresses added yet."
                        summarize={(r) => [r.address.street, r.address.city, r.address.stateProvince]
                            .filter(Boolean).join(", ")}
                        onAdd={() => openModal('addresses', null)}
                        onEdit={(r) => openModal('addresses', r)}
                        onRemove={(id) => removeRecord('addresses', id)}
                    />
                </Field>
            </div>
        </>
    );
}

function Step3({ form, patch }: StepProps) {
    return (
        <>
            <SubSectionHeader>Current License</SubSectionHeader>
            <p className="mb-4 text-sm font-medium text-slate-700">
                Enter your active driver's license information
            </p>
            <Field label="License Number" required narrow>
                <TextInput value={form.licenseNumber} onChange={(v) => patch({ licenseNumber: v })} />
            </Field>
            <Field label="Issuing Country" required narrow>
                <CountryToggle
                    value={form.licenseCountry}
                    onChange={(v) => patch({ licenseCountry: v, licenseStateProvince: "" })}
                />
            </Field>
            <Field label="Issuing State" required narrow>
                <RegionSelect
                    value={form.licenseStateProvince}
                    country={form.licenseCountry}
                    onChange={(v) => patch({ licenseStateProvince: v })}
                />
            </Field>
            <Field label="Issued Date" narrow>
                <TextInput type="date" value={form.licenseIssueDate} onChange={(v) => patch({ licenseIssueDate: v })} />
            </Field>
            <Field label="Expiry Date" required narrow>
                <TextInput type="date" value={form.licenseExpiryDate} onChange={(v) => patch({ licenseExpiryDate: v })} />
            </Field>
            <Field label="Have Endorsements?" narrow>
                <Toggle checked={form.hasEndorsements} onChange={(v) => patch({ hasEndorsements: v })} />
            </Field>
            {form.hasEndorsements && (
                <Field label="Endorsements" narrow>
                    <CheckList
                        values={form.endorsements}
                        options={LICENSE_ENDORSEMENTS}
                        onChange={(v) => patch({ endorsements: v })}
                    />
                </Field>
            )}
            <Field label="Have Restriction?" narrow>
                <Toggle checked={form.hasRestrictions} onChange={(v) => patch({ hasRestrictions: v })} />
            </Field>
            {form.hasRestrictions && (
                <Field label="Restrictions" narrow>
                    <CheckList
                        values={form.restrictions}
                        options={LICENSE_RESTRICTIONS}
                        onChange={(v) => patch({ restrictions: v })}
                    />
                </Field>
            )}
            <Field label="Driving License Front" narrow>
                <FileUploadField
                    value={form.licenseFrontFileName}
                    onChange={(v) => patch({ licenseFrontFileName: v })}
                />
            </Field>
            <Field label="Driving License Back" narrow>
                <FileUploadField
                    value={form.licenseBackFileName}
                    onChange={(v) => patch({ licenseBackFileName: v })}
                />
            </Field>
            <Field label="Any Other Licenses (Last 3 Years)?" narrow>
                <Toggle
                    checked={form.hasOtherLicenses}
                    onChange={(v) => patch({
                        hasOtherLicenses: v,
                        licenses: v && form.licenses.length === 0 ? [newLicense()] : form.licenses,
                    })}
                />
            </Field>
            {form.hasOtherLicenses && (
                <OtherLicenseCards form={form} patch={patch} />
            )}
        </>
    );
}

function OtherLicenseCards({ form, patch }: { form: DriverApplicationForm; patch: Patch }) {
    const updateLicense = (id: string, partial: Partial<LicenseRecord>) =>
        patch({ licenses: form.licenses.map((l) => (l.id === id ? { ...l, ...partial } : l)) });
    const removeLicense = (id: string) =>
        patch({ licenses: form.licenses.filter((l) => l.id !== id) });
    const addLicense = () =>
        patch({ licenses: [...form.licenses, newLicense()] });

    return (
        <div className="mt-2 space-y-4">
            {form.licenses.map((lic, idx) => (
                <div key={lic.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-slate-700">
                            Previous License #{idx + 1}
                        </span>
                        <button
                            type="button"
                            onClick={() => removeLicense(lic.id)}
                            className="text-slate-400 hover:text-red-500"
                            title="Remove"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                    <Field label="License Number" required narrow>
                        <TextInput value={lic.licenseNumber} onChange={(v) => updateLicense(lic.id, { licenseNumber: v })} />
                    </Field>
                    <Field label="Issuing Country" required narrow>
                        <CountryToggle
                            value={lic.country}
                            onChange={(v) => updateLicense(lic.id, { country: v, stateProvince: "" })}
                        />
                    </Field>
                    <Field label="Issuing State" required narrow>
                        <RegionSelect
                            value={lic.stateProvince}
                            country={lic.country}
                            onChange={(v) => updateLicense(lic.id, { stateProvince: v })}
                        />
                    </Field>
                    <Field label="Issued Date" narrow>
                        <TextInput type="date" value={lic.issueDate} onChange={(v) => updateLicense(lic.id, { issueDate: v })} />
                    </Field>
                    <Field label="Expiry Date" required narrow>
                        <TextInput type="date" value={lic.expiryDate} onChange={(v) => updateLicense(lic.id, { expiryDate: v })} />
                    </Field>
                </div>
            ))}
            <button
                type="button"
                onClick={addLicense}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-blue-600 hover:text-blue-700"
            >
                <PlusCircle size={18} /> Add Another License
            </button>
        </div>
    );
}

function Step4({ form, patch, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SectionHeader>License Disqualification Details</SectionHeader>
            <Field label="Have you ever been denied a license, permit, or privilege to operate a motor vehicle?">
                <Toggle checked={form.everDeniedLicense} onChange={(v) => patch({ everDeniedLicense: v })} />
            </Field>
            {form.everDeniedLicense && (
                <Field label="Add Denial Details">
                    <TextInput value={form.denialDetails} onChange={(v) => patch({ denialDetails: v })} />
                </Field>
            )}
            <div className="mt-6">
                <h3 className="text-[13px] font-semibold text-blue-600">
                    License / Permit Suspension or Revocation
                </h3>
                <p className="mt-1 mb-3 text-sm text-slate-600">
                    If any license, permit, or driving privilege has ever been revoked or
                    suspended, please add one or more records below using the “+” button.
                </p>
                <Field label="License Disqualification">
                    <RecordList
                        records={form.disqualifications}
                        emptyHint="No disqualification records added yet."
                        summarize={(r) => r.offenceTypes.join("; ")}
                        onAdd={() => openModal('disqualifications', null)}
                        onEdit={(r) => openModal('disqualifications', r)}
                        onRemove={(id) => removeRecord('disqualifications', id)}
                    />
                </Field>
            </div>
        </>
    );
}

function Step5({ form, patch, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SectionHeader>Accident Details</SectionHeader>
            <Field label="Have you been involved in any accidents while operating a commercial motor vehicle?">
                <Toggle checked={form.hasAccidentHistory} onChange={(v) => patch({ hasAccidentHistory: v })} />
            </Field>
            {form.hasAccidentHistory && (
                <Field label="Accident Records">
                    <RecordList
                        records={form.accidents}
                        emptyHint="No accident records added yet."
                        summarize={(r) => [r.accidentDate, r.natureOfAccident, r.locationCity, r.stateProvince]
                            .filter(Boolean).join(" • ")}
                        onAdd={() => openModal('accidents', null)}
                        onEdit={(r) => openModal('accidents', r)}
                        onRemove={(id) => removeRecord('accidents', id)}
                    />
                </Field>
            )}
        </>
    );
}

function Step6({ form, patch, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SectionHeader>Violation Details</SectionHeader>
            <Field label="Have you had any traffic violations or convictions?">
                <Toggle checked={form.hasViolationHistory} onChange={(v) => patch({ hasViolationHistory: v })} />
            </Field>
            {form.hasViolationHistory && (
                <Field label="Violation Records">
                    <RecordList
                        records={form.violations}
                        emptyHint="No violation records added yet."
                        summarize={(r) => [r.charge, r.violationDate, r.city, r.stateProvince]
                            .filter(Boolean).join(" • ")}
                        onAdd={() => openModal('violations', null)}
                        onEdit={(r) => openModal('violations', r)}
                        onRemove={(id) => removeRecord('violations', id)}
                    />
                </Field>
            )}
        </>
    );
}

function Step7({ form, patch }: StepProps) {
    return (
        <>
            <SectionHeader>Medical Details</SectionHeader>
            <Field label="Do you hold a valid Medical Examiner's Certificate?">
                <Toggle checked={form.hasValidMedCert} onChange={(v) => patch({ hasValidMedCert: v })} />
            </Field>
            <Field label="Medical Certificate Number">
                <TextInput value={form.medCertNumber} onChange={(v) => patch({ medCertNumber: v })} />
            </Field>
            <Field label="Medical Examiner Name">
                <TextInput value={form.medExaminerName} onChange={(v) => patch({ medExaminerName: v })} />
            </Field>
            <Field label="National Registry Number">
                <TextInput value={form.medRegistryNumber} onChange={(v) => patch({ medRegistryNumber: v })} />
            </Field>
            <Field label="Issue Date">
                <TextInput type="date" value={form.medCertIssueDate} onChange={(v) => patch({ medCertIssueDate: v })} />
            </Field>
            <Field label="Expiry Date">
                <TextInput type="date" value={form.medCertExpiryDate} onChange={(v) => patch({ medCertExpiryDate: v })} />
            </Field>
            <Field label="Medical Conditions or Limitations">
                <TextArea value={form.medicalConditions} onChange={(v) => patch({ medicalConditions: v })} />
            </Field>
        </>
    );
}

function Step8({ form, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SectionHeader>Driving Experience</SectionHeader>
            <SectionIntro>
                For each equipment class you have driven, add a record with the freight
                types, regions, dates, and approximate mileage.
            </SectionIntro>
            <Field label="Experience Records">
                <RecordList
                    records={form.drivingExperience}
                    emptyHint="No driving experience added yet."
                    summarize={(r) => [r.equipmentClass, r.fromDate, r.toDate].filter(Boolean).join(" • ")
                        + (r.approximateMiles ? `  (${r.approximateMiles} mi)` : "")}
                    onAdd={() => openModal('drivingExperience', null)}
                    onEdit={(r) => openModal('drivingExperience', r)}
                    onRemove={(id) => removeRecord('drivingExperience', id)}
                />
            </Field>
        </>
    );
}

function Step9({ form, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SectionHeader>Employment Details</SectionHeader>
            <SectionIntro>
                Provide a complete employment history for the past 10 years. Account for
                any gaps in employment.
            </SectionIntro>
            <Field label="Employment History">
                <RecordList
                    records={form.employment}
                    emptyHint="No employment records added yet."
                    summarize={(r) => [r.employerName, r.positionHeld, r.fromDate].filter(Boolean).join(" • ")
                        + (r.currentlyEmployed ? "  (current)" : r.toDate ? `  – ${r.toDate}` : "")}
                    onAdd={() => openModal('employment', null)}
                    onEdit={(r) => openModal('employment', r)}
                    onRemove={(id) => removeRecord('employment', id)}
                />
            </Field>
        </>
    );
}

function Step10({ form, openModal, removeRecord }: StepProps) {
    return (
        <>
            <SectionHeader>Education Details</SectionHeader>
            <SectionIntro>
                List the schools you attended, starting with the most recent.
            </SectionIntro>
            <Field label="Education History">
                <RecordList
                    records={form.education}
                    emptyHint="No education records added yet."
                    summarize={(r) => [r.schoolName, r.level, r.completionYear].filter(Boolean).join(" • ")}
                    onAdd={() => openModal('education', null)}
                    onEdit={(r) => openModal('education', r)}
                    onRemove={(id) => removeRecord('education', id)}
                />
            </Field>
        </>
    );
}

function Step11({ form, patch }: StepProps) {
    return (
        <>
            <SectionHeader>Cross Border Details</SectionHeader>
            <Field label="Do you drive across the Canada / US border?">
                <Toggle checked={form.crossesBorder} onChange={(v) => patch({ crossesBorder: v })} />
            </Field>
            {form.crossesBorder && (
                <>
                    <Field label="FAST Card Number">
                        <TextInput value={form.fastCardNumber} onChange={(v) => patch({ fastCardNumber: v })} />
                    </Field>
                    <Field label="FAST Card Expiry">
                        <TextInput type="date" value={form.fastCardExpiry} onChange={(v) => patch({ fastCardExpiry: v })} />
                    </Field>
                    <Field label="Passport Number">
                        <TextInput value={form.passportNumber} onChange={(v) => patch({ passportNumber: v })} />
                    </Field>
                    <Field label="Passport Issuing Country">
                        <TextInput value={form.passportCountry} onChange={(v) => patch({ passportCountry: v })} />
                    </Field>
                    <Field label="Passport Expiry">
                        <TextInput type="date" value={form.passportExpiry} onChange={(v) => patch({ passportExpiry: v })} />
                    </Field>
                    <Field label="Do you have a TWIC card?">
                        <Toggle checked={form.hasTwicCard} onChange={(v) => patch({ hasTwicCard: v })} />
                    </Field>
                    {form.hasTwicCard && (
                        <>
                            <Field label="TWIC Card Number">
                                <TextInput value={form.twicCardNumber} onChange={(v) => patch({ twicCardNumber: v })} />
                            </Field>
                            <Field label="TWIC Card Expiry">
                                <TextInput type="date" value={form.twicCardExpiry} onChange={(v) => patch({ twicCardExpiry: v })} />
                            </Field>
                        </>
                    )}
                </>
            )}
        </>
    );
}

const STEP12_DOCS = ['CDL — Front & Back', "Medical Examiner's Certificate", 'Resume', 'Other Supporting Document'];

function Step12({ form, patch }: StepProps) {
    const [uploads, setUploads] = useState<Record<string, string>>({});
    return (
        <>
            <SectionHeader>Additional Details &amp; Documents</SectionHeader>
            <Field label="Emergency Contact Name">
                <TextInput value={form.emergencyContactName} onChange={(v) => patch({ emergencyContactName: v })} />
            </Field>
            <Field label="Emergency Contact Phone">
                <TextInput value={form.emergencyContactPhone} onChange={(v) => patch({ emergencyContactPhone: v })} />
            </Field>
            <Field label="Relationship">
                <TextInput value={form.emergencyContactRelationship} onChange={(v) => patch({ emergencyContactRelationship: v })} />
            </Field>
            <Field label="How did you hear about us?">
                <TextInput value={form.referralSource} onChange={(v) => patch({ referralSource: v })} />
            </Field>
            <Field label="Additional Notes">
                <TextArea value={form.additionalNotes} onChange={(v) => patch({ additionalNotes: v })} />
            </Field>
            <div className="mt-6">
                <h3 className="mb-2 text-[13px] font-semibold text-blue-600">Documents</h3>
                <div className="space-y-2">
                    {STEP12_DOCS.map((doc) => (
                        <div key={doc} className="flex items-center gap-3">
                            <span className="w-64 shrink-0 text-[12px] font-medium uppercase tracking-wide text-slate-500">
                                {doc}
                            </span>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-slate-300 px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50">
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => setUploads((u) => ({ ...u, [doc]: e.target.files?.[0]?.name ?? "" }))}
                                />
                                Choose file
                            </label>
                            <span className="truncate text-[12px] text-slate-500">
                                {uploads[doc] || "No file selected"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function Step13({ form, patch }: StepProps) {
    return (
        <>
            <SectionHeader>Acknowledgment</SectionHeader>
            <p className="mb-4 text-sm leading-relaxed text-slate-600">
                I certify that all information provided in this application is true and
                complete to the best of my knowledge. I understand that any false
                statement or omission may disqualify me from employment or result in
                dismissal. I authorize the company to investigate my employment, driving,
                and criminal history as permitted by law.
            </p>
            <label className="mb-5 flex items-start gap-2 text-sm text-slate-700">
                <input
                    type="checkbox"
                    checked={form.certified}
                    onChange={(e) => patch({ certified: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-blue-600"
                />
                <span>I have read and certify the statement above.</span>
            </label>
            <div className="max-w-md">
                <SignaturePad
                    value={form.signatureDataUrl}
                    onChange={(v) => patch({ signatureDataUrl: v })}
                    label="Applicant Signature"
                />
            </div>
            <div className="mt-4">
                <Field label="Print Name" required>
                    <TextInput value={form.signaturePrintName} onChange={(v) => patch({ signaturePrintName: v })} />
                </Field>
                <Field label="Date" required>
                    <TextInput type="date" value={form.signatureDate} onChange={(v) => patch({ signatureDate: v })} />
                </Field>
            </div>
        </>
    );
}

const STEP_COMPONENTS: Record<number, (p: StepProps) => React.ReactElement> = {
    1: Step1, 2: Step2, 3: Step3, 4: Step4, 5: Step5, 6: Step6, 7: Step7,
    8: Step8, 9: Step9, 10: Step10, 11: Step11, 12: Step12, 13: Step13,
};

// ═══════════════════════════════════════════════════════════════════════════
// Wizard shell
// ═══════════════════════════════════════════════════════════════════════════

function blankRecord(key: ListKey) {
    switch (key) {
        case 'addresses': return newAddress();
        case 'licenses': return newLicense();
        case 'disqualifications': return newDisqualification();
        case 'accidents': return newAccident();
        case 'violations': return newViolation();
        case 'drivingExperience': return newDrivingExperience();
        case 'employment': return newEmployment();
        case 'education': return newEducation();
    }
}

export function DriverApplicationWizard({ appForm, onClose }: {
    appForm: ApplicationFormDef;
    onClose: () => void;
}) {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<DriverApplicationForm>(emptyApplicationForm);
    const [modal, setModal] = useState<{ key: ListKey; editing: { id: string } | null } | null>(null);
    const [branding] = useCompanyBranding();

    const patch: Patch = (p) => setForm((f) => ({ ...f, ...p }));

    const openModal = (key: ListKey, editing: { id: string } | null) =>
        setModal({ key, editing });

    const removeRecord = (key: ListKey, id: string) =>
        setForm((f) => ({ ...f, [key]: (f[key] as { id: string }[]).filter((r) => r.id !== id) }));

    const saveRecord = (key: ListKey, rec: { id: string }) => {
        setForm((f) => {
            const list = f[key] as { id: string }[];
            const exists = list.some((r) => r.id === rec.id);
            return { ...f, [key]: exists ? list.map((r) => (r.id === rec.id ? rec : r)) : [...list, rec] };
        });
        setModal(null);
    };

    const StepBody = STEP_COMPONENTS[step];
    const stepProps: StepProps = { form, patch, openModal, removeRecord };

    const handleSaveDraft = () => {
        // eslint-disable-next-line no-alert
        window.alert("Draft saved. You can finish this application later.");
    };
    const handleFinalSubmit = () => {
        if (!form.certified) {
            // eslint-disable-next-line no-alert
            window.alert("Please complete the Acknowledgment step before submitting.");
            setStep(TOTAL_STEPS);
            return;
        }
        // eslint-disable-next-line no-alert
        window.alert("Application submitted.");
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <ArrowLeft size={18} />
                    </button>
                    {branding.logoDataUrl && (
                        <img src={branding.logoDataUrl} alt="" className="h-7 max-w-[120px] object-contain" />
                    )}
                    <h1 className="text-lg font-medium text-slate-600">{appForm.name}</h1>
                    <HelpCircle size={16} className="text-slate-400" />
                </div>
                <div className="flex items-center gap-3">
                    <PanelRight size={18} className="text-slate-500" />
                    <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <XIcon size={18} />
                    </button>
                </div>
            </div>

            {/* Progress tracker */}
            <Stepper step={step} onJump={setStep} />

            {/* Step body */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="mx-auto max-w-3xl">
                    {step === 1 && (
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {appForm.displayTitle || appForm.name}
                            </h1>
                            {appForm.introText && (
                                <div
                                    className="mt-3 whitespace-pre-line rounded-r border-l-4 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                                    style={{ borderColor: branding.accentColor }}
                                >
                                    {appForm.introText}
                                </div>
                            )}
                        </div>
                    )}
                    <StepBody {...stepProps} />
                </div>
            </div>

            {/* Footer */}
            <div className="relative flex items-center border-t border-slate-200 px-6 py-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="h-9 rounded bg-blue-600 px-4 text-[13px] font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
                    >
                        Save Draft
                    </button>
                    <button
                        type="button"
                        onClick={handleFinalSubmit}
                        className="h-9 rounded bg-blue-600 px-4 text-[13px] font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
                    >
                        Final Submit
                    </button>
                </div>
                <div className="absolute left-1/2 flex -translate-x-1/2 items-center gap-3">
                    <button
                        type="button"
                        disabled={step === 1}
                        onClick={() => setStep((s) => Math.max(1, s - 1))}
                        className="h-9 rounded px-4 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                    >
                        Back
                    </button>
                    {step < TOTAL_STEPS && (
                        <button
                            type="button"
                            onClick={() => setStep((s) => Math.min(TOTAL_STEPS, s + 1))}
                            className="h-9 rounded bg-blue-600 px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-blue-700"
                        >
                            Next
                        </button>
                    )}
                </div>
            </div>

            {/* Record modals */}
            {modal && (() => {
                const initial = (modal.editing ?? blankRecord(modal.key)) as never;
                const close = () => setModal(null);
                switch (modal.key) {
                    case 'addresses':
                        return <AddressModal initial={initial} onClose={close} onSave={(r) => saveRecord('addresses', r)} />;
                    case 'licenses':
                        return <LicenseModal initial={initial} onClose={close} onSave={(r) => saveRecord('licenses', r)} />;
                    case 'disqualifications':
                        return <DisqualificationModal initial={initial} onClose={close} onSave={(r) => saveRecord('disqualifications', r)} />;
                    case 'accidents':
                        return <AccidentModal initial={initial} onClose={close} onSave={(r) => saveRecord('accidents', r)} />;
                    case 'violations':
                        return <ViolationModal initial={initial} onClose={close} onSave={(r) => saveRecord('violations', r)} />;
                    case 'drivingExperience':
                        return <DrivingExperienceModal initial={initial} onClose={close} onSave={(r) => saveRecord('drivingExperience', r)} />;
                    case 'employment':
                        return <EmploymentModal initial={initial} onClose={close} onSave={(r) => saveRecord('employment', r)} />;
                    case 'education':
                        return <EducationModal initial={initial} onClose={close} onSave={(r) => saveRecord('education', r)} />;
                }
            })()}
        </div>
    );
}
