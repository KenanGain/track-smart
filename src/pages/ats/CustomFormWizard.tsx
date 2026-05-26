import { useMemo, useState } from "react";
import { ArrowLeft, Save, FileText, UploadCloud, Plus, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    newLicenseEntry, newAddressEntry, newDisqualificationEntry, newAccidentEntry,
    newViolationEntry, newDrivingExperienceEntry, newEmploymentEntry, newEducationEntry,
    emptyDocumentUploadValue, loadApplicationForms,
    DISQUALIFICATION_OFFENCE_OPTIONS, ACCIDENT_NATURE_OPTIONS, VIOLATION_PENALTY_OPTIONS,
    EQUIPMENT_CLASS_OPTIONS, FREIGHT_TYPE_OPTIONS, DRIVING_REGION_OPTIONS,
    POSITION_HELD_OPTIONS, HIGHEST_EDUCATION_OPTIONS,
    type ApplicationFormDef, type FormField,
    type FormLicenseEntry, type FormAddressEntry, type FormDisqualificationEntry,
    type FormAccidentEntry, type FormViolationEntry, type FormDrivingExperienceEntry,
    type FormEmploymentEntry, type FormEducationEntry, type FormDocumentUploadValue,
} from "./application-forms.data";
import { getDocumentType, type DocumentType } from "./document-types.data";
import { SignaturePad } from "./SignaturePad";
import { Toggle } from "@/components/ui/toggle";
import { useCompanyBranding } from "./company-branding.data";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Custom Form view — renders a `kind: 'custom'` application form the way it
 * appears inside the system: a header bar, a left "progress" section nav, and
 * a section card with the form's fields in a two-column grid.
 */

type FieldValue =
    | string | boolean | string[]
    | FormLicenseEntry[] | FormAddressEntry[] | FormDisqualificationEntry[]
    | FormAccidentEntry[] | FormViolationEntry[] | FormDrivingExperienceEntry[]
    | FormEmploymentEntry[] | FormEducationEntry[]
    | FormDocumentUploadValue;

const INPUT_CLS =
    "w-full h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-800 " +
    "placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";

/** Toggle fields render label + control on a single horizontal row. */
const INLINE_LABEL_TYPES: FormField['type'][] = ['toggle'];

/** Pop-up form opened by the "+ Add License" button on a `license-list` field. */
function LicenseEntryModal({ initial, onSave, onClose }: {
    initial: FormLicenseEntry;
    onSave: (entry: FormLicenseEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormLicenseEntry>) => setDraft((d) => ({ ...d, ...p }));
    const canSave = draft.licenseNumber.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add License</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            License Number <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.licenseNumber} onChange={(e) => up({ licenseNumber: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">License Class</label>
                        <input value={draft.licenseClass} onChange={(e) => up({ licenseClass: e.target.value })} className={INPUT_CLS} placeholder="e.g. Class A" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Issuing Country</label>
                        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                            {(['Canada', 'United States'] as const).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => up({ country: c, stateProvince: '' })}
                                    className={cn(
                                        "px-4 py-1.5 text-[12px] font-medium",
                                        draft.country === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">State / Province</label>
                        <input value={draft.stateProvince} onChange={(e) => up({ stateProvince: e.target.value })} className={INPUT_CLS} placeholder="e.g. Ontario" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Issue Date</label>
                            <input type="date" value={draft.issueDate} onChange={(e) => up({ issueDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Expiry Date</label>
                            <input type="date" value={draft.expiryDate} onChange={(e) => up({ expiryDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save License
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function LicenseListControl({ value, onChange }: {
    value: FormLicenseEntry[]; onChange: (v: FormLicenseEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormLicenseEntry) =>
        [e.licenseClass, e.licenseNumber, e.stateProvince].filter(Boolean).join(' • ') || 'License';
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add License
            </button>
            {adding && (
                <LicenseEntryModal
                    initial={newLicenseEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/** Pop-up form opened by the "+ Add Address" button on an `address-list` field. */
function AddressEntryModal({ initial, onSave, onClose }: {
    initial: FormAddressEntry;
    onSave: (entry: FormAddressEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormAddressEntry>) => setDraft((d) => ({ ...d, ...p }));
    const canSave = draft.street.trim().length > 0 && draft.city.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Add Address</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Street <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.street} onChange={(e) => up({ street: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Unit Number</label>
                        <input value={draft.unitNumber} onChange={(e) => up({ unitNumber: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            City <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.city} onChange={(e) => up({ city: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Country</label>
                        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                            {(['Canada', 'United States'] as const).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => up({ country: c, stateProvince: '' })}
                                    className={cn(
                                        "px-4 py-1.5 text-[12px] font-medium",
                                        draft.country === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">State / Province</label>
                            <input value={draft.stateProvince} onChange={(e) => up({ stateProvince: e.target.value })} className={INPUT_CLS} placeholder="e.g. Ontario" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Zipcode</label>
                            <input value={draft.postalCode} onChange={(e) => up({ postalCode: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">From</label>
                            <input type="date" value={draft.fromDate} onChange={(e) => up({ fromDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">To</label>
                            <input type="date" value={draft.toDate} onChange={(e) => up({ toDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save Address
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddressListControl({ value, onChange }: {
    value: FormAddressEntry[]; onChange: (v: FormAddressEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormAddressEntry) =>
        [e.street, e.city, e.stateProvince].filter(Boolean).join(', ') || 'Address';
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Address
            </button>
            {adding && (
                <AddressEntryModal
                    initial={newAddressEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/** Pop-up form opened by the "+ Add Disqualification" button on a `disqualification-list` field. */
function DisqualificationEntryModal({ initial, onSave, onClose }: {
    initial: FormDisqualificationEntry;
    onSave: (entry: FormDisqualificationEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormDisqualificationEntry>) => setDraft((d) => ({ ...d, ...p }));
    const toggleOffence = (o: string) => up({
        offenceTypes: draft.offenceTypes.includes(o)
            ? draft.offenceTypes.filter((x) => x !== o)
            : [...draft.offenceTypes, o],
    });
    const canSave = draft.disqualificationDate.trim().length > 0 && draft.durationDays.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>License Disqualification</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Offence Type</label>
                        <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-slate-200 p-2">
                            {DISQUALIFICATION_OFFENCE_OPTIONS.map((o) => {
                                const on = draft.offenceTypes.includes(o);
                                return (
                                    <label key={o} className="flex cursor-pointer items-start gap-2 rounded p-1 hover:bg-slate-50">
                                        <input
                                            type="checkbox"
                                            checked={on}
                                            onChange={() => toggleOffence(o)}
                                            className="mt-0.5 h-4 w-4 accent-blue-600"
                                        />
                                        <span className="text-xs text-slate-700">{o}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Disqualification Date <span className="text-rose-500">*</span>
                            </label>
                            <input type="date" value={draft.disqualificationDate} onChange={(e) => up({ disqualificationDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Duration in Days <span className="text-rose-500">*</span>
                            </label>
                            <input type="number" value={draft.durationDays} onChange={(e) => up({ durationDays: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Explanation</label>
                        <textarea value={draft.explanation} onChange={(e) => up({ explanation: e.target.value })} className={cn(INPUT_CLS, "h-auto resize-y py-2")} rows={3} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save Disqualification
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DisqualificationListControl({ value, onChange }: {
    value: FormDisqualificationEntry[]; onChange: (v: FormDisqualificationEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormDisqualificationEntry) => {
        const parts: string[] = [];
        if (e.disqualificationDate) parts.push(e.disqualificationDate);
        if (e.durationDays) parts.push(`${e.durationDays} days`);
        if (e.offenceTypes.length) parts.push(`${e.offenceTypes.length} offence${e.offenceTypes.length === 1 ? '' : 's'}`);
        return parts.join(' · ') || 'Disqualification';
    };
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Disqualification
            </button>
            {adding && (
                <DisqualificationEntryModal
                    initial={newDisqualificationEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/** Pop-up form opened by the "+ Add Accident" button on an `accident-list` field. */
function AccidentEntryModal({ initial, onSave, onClose }: {
    initial: FormAccidentEntry;
    onSave: (entry: FormAccidentEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormAccidentEntry>) => setDraft((d) => ({ ...d, ...p }));
    const canSave = draft.accidentDate.trim().length > 0 && draft.natureOfAccident.length > 0 && draft.locationCity.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Accident Record</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500">
                    Please include the accident date, location, nature of the accident, and any injuries, fatalities, or cargo damage / spill.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Accident Date <span className="text-rose-500">*</span>
                        </label>
                        <input type="date" value={draft.accidentDate} onChange={(e) => up({ accidentDate: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Nature of Accident <span className="text-rose-500">*</span>
                        </label>
                        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2">
                            {ACCIDENT_NATURE_OPTIONS.map((o) => (
                                <label key={o} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50">
                                    <input
                                        type="radio"
                                        name="accident-nature"
                                        checked={draft.natureOfAccident === o}
                                        onChange={() => up({ natureOfAccident: o })}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <span className="text-sm text-slate-700">{o}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Country <span className="text-rose-500">*</span>
                        </label>
                        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                            {(['Canada', 'United States'] as const).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => up({ country: c, stateProvince: '' })}
                                    className={cn(
                                        "px-4 py-1.5 text-[12px] font-medium",
                                        draft.country === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                State / Province <span className="text-rose-500">*</span>
                            </label>
                            <input value={draft.stateProvince} onChange={(e) => up({ stateProvince: e.target.value })} className={INPUT_CLS} placeholder="e.g. Ontario" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Location City <span className="text-rose-500">*</span>
                            </label>
                            <input value={draft.locationCity} onChange={(e) => up({ locationCity: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700"># of Fatalities</label>
                            <input type="number" min="0" value={draft.fatalities} onChange={(e) => up({ fatalities: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700"># of Injuries</label>
                            <input type="number" min="0" value={draft.injuries} onChange={(e) => up({ injuries: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">Cargo Damage / Spill?</label>
                        <Toggle checked={draft.cargoDamage} onCheckedChange={(v) => up({ cargoDamage: v })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save Accident
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AccidentListControl({ value, onChange }: {
    value: FormAccidentEntry[]; onChange: (v: FormAccidentEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormAccidentEntry) => {
        const place = [e.locationCity, e.stateProvince].filter(Boolean).join(', ');
        return [e.accidentDate, e.natureOfAccident, place].filter(Boolean).join(' · ') || 'Accident';
    };
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Accident
            </button>
            {adding && (
                <AccidentEntryModal
                    initial={newAccidentEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/** Pop-up form opened by the "+ Add Violation" button on a `violation-list` field. */
function ViolationEntryModal({ initial, onSave, onClose }: {
    initial: FormViolationEntry;
    onSave: (entry: FormViolationEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormViolationEntry>) => setDraft((d) => ({ ...d, ...p }));
    const canSave = draft.charge.trim().length > 0
        && draft.issuingAgency.trim().length > 0
        && draft.violationDate.trim().length > 0
        && draft.city.trim().length > 0
        && draft.penalty.length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Traffic Violation Record</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500">
                    Please provide details of the traffic violation, including the charge or offense, issuing authority, date, location, penalties, and any demerit points deducted.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Charge or Offense <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.charge} onChange={(e) => up({ charge: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Issuing Agency / Police Department <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.issuingAgency} onChange={(e) => up({ issuingAgency: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Violation Date <span className="text-rose-500">*</span>
                        </label>
                        <input type="date" value={draft.violationDate} onChange={(e) => up({ violationDate: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Country <span className="text-rose-500">*</span>
                        </label>
                        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                            {(['Canada', 'United States'] as const).map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => up({ country: c, stateProvince: '' })}
                                    className={cn(
                                        "px-4 py-1.5 text-[12px] font-medium",
                                        draft.country === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                State / Province <span className="text-rose-500">*</span>
                            </label>
                            <input value={draft.stateProvince} onChange={(e) => up({ stateProvince: e.target.value })} className={INPUT_CLS} placeholder="e.g. Ontario" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                City <span className="text-rose-500">*</span>
                            </label>
                            <input value={draft.city} onChange={(e) => up({ city: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Penalty <span className="text-rose-500">*</span>
                            </label>
                            <select value={draft.penalty} onChange={(e) => up({ penalty: e.target.value })} className={INPUT_CLS}>
                                <option value="">Select…</option>
                                {VIOLATION_PENALTY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Penalty Amount</label>
                            <input value={draft.penaltyAmount} onChange={(e) => up({ penaltyAmount: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Description</label>
                        <textarea value={draft.description} onChange={(e) => up({ description: e.target.value })} className={cn(INPUT_CLS, "h-auto resize-y py-2")} rows={3} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">Did your points get deducted?</label>
                        <Toggle checked={draft.pointsDeducted} onCheckedChange={(v) => up({ pointsDeducted: v })} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save Violation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ViolationListControl({ value, onChange }: {
    value: FormViolationEntry[]; onChange: (v: FormViolationEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormViolationEntry) => {
        return [e.violationDate, e.charge, e.penalty, e.city].filter(Boolean).join(' · ') || 'Violation';
    };
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Violation
            </button>
            {adding && (
                <ViolationEntryModal
                    initial={newViolationEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/** Pop-up form opened by the "+ Add Experience" button on a `driving-experience-list` field. */
function DrivingExperienceEntryModal({ initial, onSave, onClose }: {
    initial: FormDrivingExperienceEntry;
    onSave: (entry: FormDrivingExperienceEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormDrivingExperienceEntry>) => setDraft((d) => ({ ...d, ...p }));
    const toggleFreight = (o: string) => up({
        freightTypes: draft.freightTypes.includes(o)
            ? draft.freightTypes.filter((x) => x !== o)
            : [...draft.freightTypes, o],
    });
    const toggleRegion = (o: string) => up({
        drivingRegions: draft.drivingRegions.includes(o)
            ? draft.drivingRegions.filter((x) => x !== o)
            : [...draft.drivingRegions, o],
    });
    const canSave = draft.equipmentClass.length > 0
        && draft.fromDate.trim().length > 0
        && draft.toDate.trim().length > 0
        && draft.approximateMiles.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Driving Experience Record</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500">
                    Please provide details of your driving experience, including equipment class, freight types, regions driven, dates, mileage, and owner-operator status.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Equipment Class <span className="text-rose-500">*</span>
                        </label>
                        <div className="space-y-1 rounded-md border border-slate-200 p-2">
                            {EQUIPMENT_CLASS_OPTIONS.map((o) => (
                                <label key={o} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50">
                                    <input
                                        type="radio"
                                        name="equipment-class"
                                        checked={draft.equipmentClass === o}
                                        onChange={() => up({ equipmentClass: o })}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <span className="text-sm text-slate-700">{o}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Freight Types</label>
                        <div className="space-y-1 rounded-md border border-slate-200 p-2">
                            {FREIGHT_TYPE_OPTIONS.map((o) => (
                                <label key={o} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={draft.freightTypes.includes(o)}
                                        onChange={() => toggleFreight(o)}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <span className="text-sm text-slate-700">{o}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Driving Regions</label>
                        <div className="space-y-1 rounded-md border border-slate-200 p-2">
                            {DRIVING_REGION_OPTIONS.map((o) => (
                                <label key={o} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50">
                                    <input
                                        type="checkbox"
                                        checked={draft.drivingRegions.includes(o)}
                                        onChange={() => toggleRegion(o)}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <span className="text-sm text-slate-700">{o}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                From Date <span className="text-rose-500">*</span>
                            </label>
                            <input type="date" value={draft.fromDate} onChange={(e) => up({ fromDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                To Date <span className="text-rose-500">*</span>
                            </label>
                            <input type="date" value={draft.toDate} onChange={(e) => up({ toDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Approximate Miles <span className="text-rose-500">*</span>
                        </label>
                        <input type="number" min="0" value={draft.approximateMiles} onChange={(e) => up({ approximateMiles: e.target.value })} className={INPUT_CLS} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save Experience
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DrivingExperienceListControl({ value, onChange }: {
    value: FormDrivingExperienceEntry[]; onChange: (v: FormDrivingExperienceEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormDrivingExperienceEntry) => {
        const dates = [e.fromDate, e.toDate].filter(Boolean).join(' – ');
        const parts = [e.equipmentClass, dates, e.approximateMiles ? `${e.approximateMiles} mi` : ''].filter(Boolean);
        return parts.join(' · ') || 'Experience';
    };
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Experience
            </button>
            {adding && (
                <DrivingExperienceEntryModal
                    initial={newDrivingExperienceEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/**
 * Single-page Employment History modal.
 *
 * All four sections (Employment Details · Contact Person · Address · Additional Details)
 * appear on one scrollable page with section headers. No stepper, no Back / Next nav —
 * the applicant scrolls through the form and saves at the bottom.
 */
function EmploymentEntryModal({ initial, onSave, onClose }: {
    initial: FormEmploymentEntry;
    onSave: (entry: FormEmploymentEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormEmploymentEntry>) => setDraft((d) => ({ ...d, ...p }));
    const canSave = draft.employerName.trim().length > 0
        && draft.startDate.trim().length > 0
        && draft.endDate.trim().length > 0
        && draft.contactName.trim().length > 0
        && draft.contactPhone.trim().length > 0;

    const YesNo = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            {[
                { label: 'No', v: false },
                { label: 'Yes', v: true },
            ].map((o) => (
                <button
                    key={o.label}
                    type="button"
                    onClick={() => onChange(o.v)}
                    className={cn(
                        "px-4 py-1 text-[12px] font-medium",
                        value === o.v ? "bg-blue-100 text-blue-700" : "bg-white text-slate-600 hover:bg-slate-50",
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );

    const SectionHeading = ({ children }: { children: React.ReactNode }) => (
        <h3 className="mt-2 border-b border-blue-200 pb-1.5 text-sm font-bold text-blue-600">
            {children}
        </h3>
    );

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Employment History</DialogTitle>
                </DialogHeader>

                <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
                    {/* ── Section 1: Employment Details ───────────────────── */}
                    <SectionHeading>Employment Details</SectionHeading>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Employer Name <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.employerName} onChange={(e) => up({ employerName: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Start Date <span className="text-rose-500">*</span>
                            </label>
                            <input type="date" value={draft.startDate} onChange={(e) => up({ startDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                End Date <span className="text-rose-500">*</span>
                            </label>
                            <input type="date" value={draft.endDate} onChange={(e) => up({ endDate: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Position Held</label>
                        <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                            {POSITION_HELD_OPTIONS.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => up({ positionHeld: p })}
                                    className={cn(
                                        "px-4 py-1.5 text-[12px] font-medium",
                                        draft.positionHeld === p ? "bg-blue-100 text-blue-700" : "bg-white text-slate-600 hover:bg-slate-50",
                                    )}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Section 2: Contact Person ────────────────────────── */}
                    <SectionHeading>Contact Person</SectionHeading>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Name <span className="text-rose-500">*</span>
                            </label>
                            <input value={draft.contactName} onChange={(e) => up({ contactName: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">
                                Phone Number <span className="text-rose-500">*</span>
                            </label>
                            <input value={draft.contactPhone} onChange={(e) => up({ contactPhone: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
                        <input type="email" value={draft.contactEmail} onChange={(e) => up({ contactEmail: e.target.value })} className={INPUT_CLS} />
                    </div>

                    {/* ── Section 3: Address ───────────────────────────────── */}
                    <SectionHeading>Employer Address</SectionHeading>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Street</label>
                            <input value={draft.addressStreet} onChange={(e) => up({ addressStreet: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Unit Number</label>
                            <input value={draft.addressUnitNumber} onChange={(e) => up({ addressUnitNumber: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">City</label>
                            <input value={draft.addressCity} onChange={(e) => up({ addressCity: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Zipcode</label>
                            <input value={draft.addressZipcode} onChange={(e) => up({ addressZipcode: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Country</label>
                            <input value={draft.addressCountry} onChange={(e) => up({ addressCountry: e.target.value })} className={INPUT_CLS} placeholder="e.g. United States" />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">State</label>
                            <input value={draft.addressState} onChange={(e) => up({ addressState: e.target.value })} className={INPUT_CLS} placeholder="e.g. Ontario" />
                        </div>
                    </div>

                    {/* ── Section 4: Additional Details ───────────────────── */}
                    <SectionHeading>Additional Details</SectionHeading>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Reason for Leaving</label>
                            <input value={draft.reasonForLeaving} onChange={(e) => up({ reasonForLeaving: e.target.value })} className={INPUT_CLS} />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Wage ($/hr)</label>
                            <input value={draft.wage} onChange={(e) => up({ wage: e.target.value })} className={INPUT_CLS} />
                        </div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">Do you have any gaps in employment?</label>
                        <YesNo value={draft.hasGaps} onChange={(v) => up({ hasGaps: v })} />
                    </div>
                    {draft.hasGaps && (
                        <div className="space-y-2 border-l-2 border-blue-100 pl-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">From</label>
                                    <input type="date" value={draft.gapFromDate} onChange={(e) => up({ gapFromDate: e.target.value })} className={INPUT_CLS} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-700">To</label>
                                    <input type="date" value={draft.gapToDate} onChange={(e) => up({ gapToDate: e.target.value })} className={INPUT_CLS} />
                                </div>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-700">Explain Reason</label>
                                <input value={draft.gapExplanation} onChange={(e) => up({ gapExplanation: e.target.value })} className={INPUT_CLS} />
                            </div>
                        </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">
                            Were you subjected to US DOT regulations while employed (FMCSRs*)?
                        </label>
                        <YesNo value={draft.subjectToFMCSR} onChange={(v) => up({ subjectToFMCSR: v })} />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">
                            Were you required to do drug and alcohol testing as per 49 CFR Part 40?
                        </label>
                        <YesNo value={draft.drugAlcoholTesting} onChange={(v) => up({ drugAlcoholTesting: v })} />
                    </div>
                    <div className="flex items-start justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">
                            Do you have an Employer Experience Letter from this employer?
                        </label>
                        <YesNo value={draft.hasExperienceLetter} onChange={(v) => up({ hasExperienceLetter: v })} />
                    </div>
                    {draft.hasExperienceLetter && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Employer Experience Letter</label>
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-4 py-4 text-center hover:bg-blue-50/60">
                                <UploadCloud size={24} className="mb-1 text-slate-300" />
                                <div className="flex items-center gap-2">
                                    <span className="rounded border border-slate-300 bg-white px-3 py-1 text-[12px] text-slate-700">Choose File</span>
                                    <span className="text-[12px] text-slate-500">{draft.experienceLetterFile || 'No file chosen'}</span>
                                </div>
                                <span className="mt-1 text-[12px] font-medium text-blue-600">Or Drag It Here.</span>
                                <input type="file" className="hidden" onChange={(e) => up({ experienceLetterFile: e.target.files?.[0]?.name ?? '' })} />
                            </label>
                        </div>
                    )}
                    <div className="flex items-start justify-between gap-3">
                        <label className="text-xs font-semibold text-slate-700">
                            Do you have an Employer Insurance Experience Letter for this employer?
                        </label>
                        <YesNo value={draft.hasInsuranceLetter} onChange={(v) => up({ hasInsuranceLetter: v })} />
                    </div>
                    {draft.hasInsuranceLetter && (
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-700">Insurance Experience Letter</label>
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-4 py-4 text-center hover:bg-blue-50/60">
                                <UploadCloud size={24} className="mb-1 text-slate-300" />
                                <div className="flex items-center gap-2">
                                    <span className="rounded border border-slate-300 bg-white px-3 py-1 text-[12px] text-slate-700">Choose File</span>
                                    <span className="text-[12px] text-slate-500">{draft.insuranceLetterFile || 'No file chosen'}</span>
                                </div>
                                <span className="mt-1 text-[12px] font-medium text-blue-600">Or Drag It Here.</span>
                                <input type="file" className="hidden" onChange={(e) => up({ insuranceLetterFile: e.target.files?.[0]?.name ?? '' })} />
                            </label>
                        </div>
                    )}
                    <p className="rounded-md bg-rose-50 px-3 py-2 text-[11px] leading-relaxed text-rose-700">
                        * The Federal Motor Carrier Safety Regulations (FMCSRs) apply to anyone operating a motor vehicle on a highway in interstate commerce to transport passengers or property when the vehicle: (1) weighs or has a GVWR of 10,001 pounds or more, (2) is designed or used to transport more than 8 passengers (including the driver), OR (3) is of any size and is used to transport hazardous materials in a quantity requiring placarding.
                    </p>
                </div>

                {/* Footer */}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        disabled={!canSave}
                        onClick={() => onSave(draft)}
                        className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                    >
                        <Check className="h-4 w-4" /> Save Employer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Document upload component driven by a `DocumentType` from the library.
 *
 * Reads the type's flags to decide which extra inputs to render:
 *   • allowMultiple → multi-file list + add button vs single file picker
 *   • expiryRequired → expiry date input
 *   • issueDateRequired → issue date input
 *   • issueStateRequired → issuing state / province text input
 *   • issueCountryRequired → issuing country pill toggle (Canada / United States)
 *
 * If no DocumentType is linked, falls back to a simple drop-zone file picker.
 */
function DocumentUploadControl({ docType, value, onChange }: {
    docType: DocumentType | undefined;
    value: FormDocumentUploadValue;
    onChange: (v: FormDocumentUploadValue) => void;
}) {
    const up = (p: Partial<FormDocumentUploadValue>) => onChange({ ...value, ...p });
    const files = value.files ?? [];

    const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = Array.from(e.target.files ?? []).map((f) => f.name);
        if (next.length === 0) return;
        up({ files: docType?.allowMultiple ? [...files, ...next] : next.slice(0, 1) });
        e.target.value = '';
    };
    const removeFile = (name: string) =>
        up({ files: files.filter((f) => f !== name) });

    const showMeta = !!docType && (
        docType.issueCountryRequired || docType.issueStateRequired
        || docType.issueDateRequired || docType.expiryRequired
    );

    return (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            {/* Drop zone */}
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-4 py-5 text-center hover:bg-blue-50/60">
                <UploadCloud size={28} className="mb-2 text-slate-300" />
                <div className="flex items-center gap-2">
                    <span className="rounded border border-slate-300 bg-white px-3 py-1 text-[12px] text-slate-700">
                        Choose File{docType?.allowMultiple ? 's' : ''}
                    </span>
                    <span className="text-[12px] text-slate-500">
                        {files.length === 0
                            ? 'No file chosen'
                            : docType?.allowMultiple
                                ? `${files.length} file${files.length === 1 ? '' : 's'} chosen`
                                : files[0]}
                    </span>
                </div>
                <span className="mt-2 text-[12px] font-medium text-blue-600">Or Drag It Here.</span>
                <input
                    type="file"
                    multiple={docType?.allowMultiple ?? false}
                    className="hidden"
                    onChange={onFile}
                />
            </label>

            {/* Uploaded-file chips (only when multiple uploads are allowed and there's > 1 file) */}
            {docType?.allowMultiple && files.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {files.map((f) => (
                        <span
                            key={f}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {f}
                            <button
                                type="button"
                                onClick={() => removeFile(f)}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Type-driven metadata inputs */}
            {showMeta && (
                <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                    {docType?.issueCountryRequired && (
                        <div className="col-span-2">
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                Issuing Country <span className="text-rose-500">*</span>
                            </label>
                            <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                                {(['Canada', 'United States'] as const).map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => up({ issueCountry: c })}
                                        className={cn(
                                            "px-4 py-1.5 text-[12px] font-medium",
                                            value.issueCountry === c
                                                ? "bg-blue-600 text-white"
                                                : "bg-white text-slate-600 hover:bg-slate-50",
                                        )}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {docType?.issueStateRequired && (
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                Issuing State / Province <span className="text-rose-500">*</span>
                            </label>
                            <input
                                value={value.issueState ?? ''}
                                onChange={(e) => up({ issueState: e.target.value })}
                                placeholder="e.g. Ontario"
                                className={INPUT_CLS}
                            />
                        </div>
                    )}
                    {docType?.issueDateRequired && (
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                Issue Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={value.issueDate ?? ''}
                                onChange={(e) => up({ issueDate: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                    )}
                    {docType?.expiryRequired && (
                        <div>
                            <label className="mb-1 block text-[11px] font-semibold text-slate-700">
                                Expiry Date <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={value.expiry ?? ''}
                                onChange={(e) => up({ expiry: e.target.value })}
                                className={INPUT_CLS}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/** Pop-up form opened by the "+ Add Education" button on an `education-list` field. */
function EducationEntryModal({ initial, onSave, onClose }: {
    initial: FormEducationEntry;
    onSave: (entry: FormEducationEntry) => void;
    onClose: () => void;
}) {
    const [draft, setDraft] = useState(initial);
    const up = (p: Partial<FormEducationEntry>) => setDraft((d) => ({ ...d, ...p }));
    const canSave = draft.highestEducation.length > 0
        && draft.school.trim().length > 0
        && draft.yearCompleted.trim().length > 0;

    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Education Details</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-slate-500">
                    Please provide details of your educational background, including highest level completed, institution name, course of study, years completed, and graduation status.
                </p>
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Highest Education <span className="text-rose-500">*</span>
                        </label>
                        <div className="space-y-1 rounded-md border border-slate-200 p-2">
                            {HIGHEST_EDUCATION_OPTIONS.map((o) => (
                                <label key={o} className="flex cursor-pointer items-center gap-2 rounded p-1 hover:bg-slate-50">
                                    <input
                                        type="radio"
                                        name="highest-education"
                                        checked={draft.highestEducation === o}
                                        onChange={() => up({ highestEducation: o })}
                                        className="h-4 w-4 accent-blue-600"
                                    />
                                    <span className="text-sm text-slate-700">{o}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            School <span className="text-rose-500">*</span>
                        </label>
                        <input value={draft.school} onChange={(e) => up({ school: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Location (City, State, Country)</label>
                        <input value={draft.location} onChange={(e) => up({ location: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Course of Study</label>
                        <input value={draft.courseOfStudy} onChange={(e) => up({ courseOfStudy: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">
                            Year Completed <span className="text-rose-500">*</span>
                        </label>
                        <input type="number" value={draft.yearCompleted} onChange={(e) => up({ yearCompleted: e.target.value })} className={INPUT_CLS} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-semibold text-slate-700">Reason for Not Graduating</label>
                        <input value={draft.reasonForNotGraduating} onChange={(e) => up({ reasonForNotGraduating: e.target.value })} className={INPUT_CLS} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button disabled={!canSave} onClick={() => onSave(draft)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
                        <Check className="h-4 w-4" /> Save Education
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EducationListControl({ value, onChange }: {
    value: FormEducationEntry[]; onChange: (v: FormEducationEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormEducationEntry) =>
        [e.highestEducation, e.school, e.yearCompleted].filter(Boolean).join(' · ') || 'Education';
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Education
            </button>
            {adding && (
                <EducationEntryModal
                    initial={newEducationEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

function EmploymentListControl({ value, onChange }: {
    value: FormEmploymentEntry[]; onChange: (v: FormEmploymentEntry[]) => void;
}) {
    const [adding, setAdding] = useState(false);
    const summary = (e: FormEmploymentEntry) => {
        const dates = [e.startDate, e.endDate].filter(Boolean).join(' – ');
        return [e.employerName, dates, e.positionHeld].filter(Boolean).join(' · ') || 'Employer';
    };
    return (
        <div>
            {value.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {value.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                        >
                            {summary(e)}
                            <button
                                type="button"
                                onClick={() => onChange(value.filter((x) => x.id !== e.id))}
                                className="rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => setAdding(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
            >
                <Plus size={12} /> Add Employer
            </button>
            {adding && (
                <EmploymentEntryModal
                    initial={newEmploymentEntry()}
                    onSave={(entry) => { onChange([...value, entry]); setAdding(false); }}
                    onClose={() => setAdding(false)}
                />
            )}
        </div>
    );
}

/**
 * Live-form control for a `subform-button` field. Renders a button labelled with
 * the field's label (typically the linked subform's `buttonName`, e.g. "Add Employer").
 * Clicking opens a popup that renders the linked subform's fields via FormBody —
 * a fully dynamic subform integration driven by the admin's configuration.
 */
function SubformButtonField({ field, value, onChange }: {
    field: FormField; value: FieldValue; onChange: (v: FieldValue) => void;
}) {
    const [open, setOpen] = useState(false);
    const subform = useMemo(() => {
        if (!field.subformId) return undefined;
        return loadApplicationForms().find(f => f.id === field.subformId && f.isSubform);
    }, [field.subformId]);

    const entries = (Array.isArray(value) && value.every(v => typeof v === 'object' && v !== null && 'id' in (v as object))
        ? (value as unknown as { id: string; values: Record<string, unknown> }[])
        : []) as { id: string; values: Record<string, unknown> }[];

    const [drafts, setDrafts] = useState<Record<string, unknown>>({});

    const summarize = (e: { values: Record<string, unknown> }) => {
        if (!subform) return 'Entry';
        // Prefer the first text-ish field value as the summary
        for (const f of subform.fields) {
            if (f.type === 'heading' || f.type === 'paragraph' || f.type === 'bullet-list' || f.type === 'alert') continue;
            const v = e.values[f.id];
            if (typeof v === 'string' && v.trim().length > 0) return v;
        }
        return 'Entry';
    };

    const label = field.label || subform?.buttonName || subform?.name || 'Open subform';

    if (!subform) {
        return (
            <div className="rounded-md border border-dashed border-rose-300 bg-rose-50/40 px-3 py-2 text-xs text-rose-700">
                Linked subform not found. Re-link this button via field settings.
            </div>
        );
    }

    return (
        <div>
            {entries.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                    {entries.map((e) => (
                        <span
                            key={e.id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                        >
                            {summarize(e)}
                            <button
                                type="button"
                                onClick={() => onChange((entries.filter(x => x.id !== e.id)) as unknown as FieldValue)}
                                className="rounded-full text-violet-400 hover:bg-violet-100 hover:text-violet-700"
                                title="Remove"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <button
                type="button"
                onClick={() => { setDrafts({}); setOpen(true); }}
                className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-violet-300 bg-violet-50/40 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
            >
                <Plus size={12} /> {label}
            </button>

            {open && (
                <Dialog open onOpenChange={(o) => { if (!o) setOpen(false); }}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{subform.displayTitle || subform.name}</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[70vh] overflow-y-auto pr-2">
                            <FormBody
                                fields={subform.fields}
                                values={drafts as Record<string, FieldValue>}
                                setValue={(id, v) => setDrafts(s => ({ ...s, [id]: v }))}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => {
                                    const next = [
                                        ...entries,
                                        { id: Math.random().toString(36).slice(2, 9), values: drafts },
                                    ];
                                    onChange(next as unknown as FieldValue);
                                    setOpen(false);
                                }}
                                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Check className="h-4 w-4" /> Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

function FieldControl({ field, value, onChange }: {
    field: FormField; value: FieldValue; onChange: (v: FieldValue) => void;
}) {
    const str = typeof value === 'string' ? value : '';
    const list = Array.isArray(value) ? value : [];

    switch (field.type) {
        case 'textarea':
            return (
                <textarea
                    value={str}
                    rows={3}
                    onChange={(e) => onChange(e.target.value)}
                    className={cn(INPUT_CLS, "h-auto resize-y py-2")}
                />
            );
        case 'date':
            return <input type="date" value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} />;
        case 'number':
            return <input type="number" value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} />;
        case 'select':
            return (
                <select value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select…</option>
                    {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
            );
        case 'toggle':
            return <Toggle checked={value === true} onCheckedChange={(v) => onChange(v)} />;
        case 'radio':
            return (
                <div className="space-y-2">
                    {field.options.map((o) => {
                        const on = str === o;
                        return (
                            <button
                                key={o}
                                type="button"
                                onClick={() => onChange(o)}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left",
                                    on ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50",
                                )}
                            >
                                <span className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border",
                                    on ? "border-blue-600" : "border-slate-300",
                                )}>
                                    {on && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                                </span>
                                <span className="text-sm font-medium text-slate-700">{o}</span>
                            </button>
                        );
                    })}
                </div>
            );
        case 'checklist': {
            const strList = list.filter((x): x is string => typeof x === 'string');
            return (
                <div className="space-y-2">
                    {field.options.map((o) => {
                        const on = strList.includes(o);
                        return (
                            <button
                                key={o}
                                type="button"
                                onClick={() => onChange(on ? strList.filter((x) => x !== o) : [...strList, o])}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left",
                                    on ? "border-blue-500 bg-blue-50/50" : "border-slate-200 hover:bg-slate-50",
                                )}
                            >
                                <span className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded border",
                                    on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300",
                                )}>
                                    {on && <span className="text-[10px] font-bold">✓</span>}
                                </span>
                                <span className="text-sm font-medium text-slate-700">{o}</span>
                            </button>
                        );
                    })}
                </div>
            );
        }
        case 'document': {
            const docType = getDocumentType(field.documentTypeId);
            // Coerce value to FormDocumentUploadValue shape (handles legacy string values gracefully).
            const upload: FormDocumentUploadValue =
                value && typeof value === 'object' && 'files' in (value as object)
                    ? (value as FormDocumentUploadValue)
                    : str
                        ? { files: [str] }
                        : emptyDocumentUploadValue();
            return (
                <DocumentUploadControl
                    docType={docType}
                    value={upload}
                    onChange={(v) => onChange(v as FieldValue)}
                />
            );
        }
        case 'license-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormLicenseEntry[])
                : [];
            return <LicenseListControl value={entries} onChange={onChange} />;
        }
        case 'address-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormAddressEntry[])
                : [];
            return <AddressListControl value={entries} onChange={onChange} />;
        }
        case 'disqualification-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormDisqualificationEntry[])
                : [];
            return <DisqualificationListControl value={entries} onChange={onChange} />;
        }
        case 'accident-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormAccidentEntry[])
                : [];
            return <AccidentListControl value={entries} onChange={onChange} />;
        }
        case 'violation-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormViolationEntry[])
                : [];
            return <ViolationListControl value={entries} onChange={onChange} />;
        }
        case 'driving-experience-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormDrivingExperienceEntry[])
                : [];
            return <DrivingExperienceListControl value={entries} onChange={onChange} />;
        }
        case 'employment-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormEmploymentEntry[])
                : [];
            return <EmploymentListControl value={entries} onChange={onChange} />;
        }
        case 'education-list': {
            const entries = Array.isArray(value) && value.every((v) => typeof v === 'object')
                ? (value as FormEducationEntry[])
                : [];
            return <EducationListControl value={entries} onChange={onChange} />;
        }
        case 'signature':
            return (
                <SignaturePad
                    value={str}
                    onChange={(v) => onChange(v ?? '')}
                    label={field.label || 'Signature'}
                    helper={field.instruction || 'Draw your signature above using your mouse or finger.'}
                />
            );
        case 'subform-button':
            return <SubformButtonField field={field} value={value} onChange={onChange} />;
        case 'heading':
        case 'paragraph':
        case 'bullet-list':
        case 'alert':
            return null;
        default:
            return <input type="text" value={str} onChange={(e) => onChange(e.target.value)} className={INPUT_CLS} />;
    }
}

/** A single labelled field. Toggles render with the label inline on the left and the switch on the right. */
function FieldBlock({ field, value, onChange }: {
    field: FormField;
    value: FieldValue;
    onChange: (v: FieldValue) => void;
}) {
    if (field.type === 'heading') {
        return (
            <div className={field.label ? "mt-2 border-b border-blue-300 pb-1.5" : "mt-1"}>
                {field.label && (
                    <h3 className="text-center text-base font-bold uppercase tracking-wide text-blue-600">
                        {field.label}
                    </h3>
                )}
                {field.instruction && (
                    <p className={cn(
                        "whitespace-pre-line text-sm leading-relaxed text-slate-600",
                        field.label && "mt-2",
                    )}>
                        {field.instruction}
                    </p>
                )}
            </div>
        );
    }
    if (field.type === 'paragraph') {
        return (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {field.instruction}
            </p>
        );
    }
    if (field.type === 'bullet-list') {
        return (
            <div className="space-y-2">
                {field.label && (
                    <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                )}
                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-700 marker:text-slate-400">
                    {field.options.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
            </div>
        );
    }
    if (field.type === 'alert') {
        return (
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
                {field.label}
            </div>
        );
    }
    if (field.type === 'signature') {
        // SignaturePad carries its own labeled header — don't render the outer label.
        return <FieldControl field={field} value={value} onChange={onChange} />;
    }
    const inline = INLINE_LABEL_TYPES.includes(field.type);
    if (inline) {
        return (
            <div>
                <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-semibold text-slate-700">
                        {field.label}
                        {field.required && <span className="text-rose-500"> *</span>}
                    </label>
                    <FieldControl field={field} value={value} onChange={onChange} />
                </div>
                {field.instruction && (
                    <p className="mt-1 text-xs text-slate-400">{field.instruction}</p>
                )}
            </div>
        );
    }
    return (
        <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                {field.label}
                {field.required && <span className="text-rose-500"> *</span>}
            </label>
            <FieldControl field={field} value={value} onChange={onChange} />
            {field.instruction && (
                <p className="mt-1 text-xs text-slate-400">{field.instruction}</p>
            )}
        </div>
    );
}

/** Renders the field list. Conditional fields nest visually under their controller toggle. */
export function FormBody({ fields, values, setValue }: {
    fields: FormField[];
    values: Record<string, FieldValue>;
    setValue: (id: string, v: FieldValue) => void;
}) {
    const defaultFor = (f: FormField): FieldValue => {
        if (f.type === 'toggle') return false;
        if (f.type === 'checklist') return [];
        if (f.type === 'license-list' || f.type === 'address-list' || f.type === 'disqualification-list' || f.type === 'accident-list' || f.type === 'violation-list' || f.type === 'driving-experience-list' || f.type === 'employment-list' || f.type === 'education-list') return [];
        if (f.type === 'document') return emptyDocumentUploadValue();
        return '';
    };

    /** Hide fields whose `showWhen` controller isn't satisfied — so consumers
     *  that pass raw fields (e.g. the test runner) still get correct
     *  conditional reveal. */
    const isVisible = (f: FormField): boolean => {
        if (!f.showWhen) return true;
        const current = values[f.showWhen.fieldId];
        const expected = f.showWhen.equals;
        if (typeof expected === 'boolean') return (current === true) === expected;
        return current === expected;
    };
    const visible = fields.filter(isVisible);

    const dependentsByController = new Map<string, FormField[]>();
    for (const f of visible) {
        if (!f.showWhen) continue;
        const list = dependentsByController.get(f.showWhen.fieldId) ?? [];
        list.push(f);
        dependentsByController.set(f.showWhen.fieldId, list);
    }

    const topLevel = visible.filter((f) => !f.showWhen);
    return (
        <div className="space-y-5">
            {topLevel.map((f) => {
                const deps = dependentsByController.get(f.id) ?? [];
                return (
                    <div key={f.id}>
                        <FieldBlock field={f} value={values[f.id] ?? defaultFor(f)} onChange={(v) => setValue(f.id, v)} />
                        {deps.length > 0 && (
                            <div className="mt-3 space-y-4 border-l-2 border-blue-100 pl-4">
                                {deps.map((dep) => (
                                    <FieldBlock
                                        key={dep.id}
                                        field={dep}
                                        value={values[dep.id] ?? defaultFor(dep)}
                                        onChange={(v) => setValue(dep.id, v)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function CustomFormWizard({ appForm, onClose }: {
    appForm: ApplicationFormDef;
    onClose: () => void;
}) {
    const [values, setValues] = useState<Record<string, FieldValue>>({});
    const [branding] = useCompanyBranding();
    const setValue = (id: string, v: FieldValue) => setValues((s) => ({ ...s, [id]: v }));

    const accent = branding.accentColor;
    const sectionTitle = appForm.displayTitle || appForm.name;

    /** Hide fields whose `showWhen` controller isn't satisfied yet. */
    const fields = appForm.fields.filter((f) => {
        if (!f.showWhen) return true;
        const current = values[f.showWhen.fieldId];
        const expected = f.showWhen.equals;
        if (typeof expected === 'boolean') return (current === true) === expected;
        return current === expected;
    });

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 bg-white px-8 py-4">
                <button
                    type="button"
                    onClick={onClose}
                    className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                    <ArrowLeft size={15} /> Back to Forms
                </button>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                            style={{ backgroundColor: accent }}
                        >
                            {branding.logoDataUrl
                                ? <img src={branding.logoDataUrl} alt="" className="max-h-9 max-w-9 object-contain" />
                                : <FileText size={22} />}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-2xl font-bold text-slate-900">{sectionTitle}</h1>
                            <p className="text-sm text-slate-500">
                                {appForm.description || `${branding.name} — application form.`}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => { window.alert("Form submitted."); onClose(); }}
                            className="inline-flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white shadow-sm"
                            style={{ backgroundColor: accent }}
                        >
                            <Save size={15} /> Submit
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Body: section card ─────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="mx-auto max-w-3xl">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                        {/* Section header */}
                        <div className="flex items-start gap-3 border-b border-slate-100 px-6 py-4">
                            <div
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                                style={{ backgroundColor: accent }}
                            >
                                <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-base font-bold text-slate-900">{sectionTitle}</h2>
                                {appForm.introText && (
                                    <p className="mt-0.5 whitespace-pre-line text-xs text-slate-500">
                                        {appForm.introText}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Fields — single-column flow with conditional fields nested under their controller toggle. */}
                        <div className="p-6">
                            {fields.length === 0 ? (
                                <p className="py-8 text-center text-sm text-slate-400">
                                    This form has no fields yet.
                                </p>
                            ) : (
                                <FormBody
                                    fields={fields}
                                    values={values}
                                    setValue={setValue}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
