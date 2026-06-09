import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, FileText, UploadCloud, Plus, X, Check, Download, Pencil, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    newLicenseEntry, newAddressEntry, newDisqualificationEntry, newAccidentEntry,
    newViolationEntry, newDrivingExperienceEntry, newEmploymentEntry, newEducationEntry,
    emptyDocumentUploadValue, loadApplicationForms, chunkFieldRows, showWhenSatisfied, computeFieldValue,
    DISQUALIFICATION_OFFENCE_OPTIONS, ACCIDENT_NATURE_OPTIONS, VIOLATION_PENALTY_OPTIONS,
    EQUIPMENT_CLASS_OPTIONS, FREIGHT_TYPE_OPTIONS, DRIVING_REGION_OPTIONS,
    POSITION_HELD_OPTIONS, HIGHEST_EDUCATION_OPTIONS,
    type ApplicationFormDef, type FormField,
    type FormLicenseEntry, type FormAddressEntry, type FormDisqualificationEntry,
    type FormAccidentEntry, type FormViolationEntry, type FormDrivingExperienceEntry,
    type FormEmploymentEntry, type FormEducationEntry, type FormDocumentUploadValue,
} from "./application-forms.data";
import { type DocumentType } from "./document-types.data";
import { resolveFormDocType, complianceFieldConfig } from "./form-doc-resolver";
import { generateApplicationFormPdf } from "./generateApplicationFormPdf";
import { PDF_TEMPLATES } from "./ApplicationFormPrint";
import { SignaturePad } from "./SignaturePad";
import { Toggle } from "@/components/ui/toggle";
import { useCompanyBranding, applyBrandTokens } from "./company-branding.data";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Custom Form view — renders a `kind: 'custom'` application form the way it
 * appears inside the system: a header bar, a left "progress" section nav, and
 * a section card with the form's fields in a two-column grid.
 */

export type FieldValue =
    | string | boolean | string[]
    | FormLicenseEntry[] | FormAddressEntry[] | FormDisqualificationEntry[]
    | FormAccidentEntry[] | FormViolationEntry[] | FormDrivingExperienceEntry[]
    | FormEmploymentEntry[] | FormEducationEntry[]
    | FormDocumentUploadValue;

const INPUT_CLS =
    "w-full h-11 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] text-slate-800 transition-colors " +
    "placeholder:text-slate-400 outline-none hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";

/** Toggle fields render label + control on a single horizontal row. */
const INLINE_LABEL_TYPES: FormField['type'][] = ['toggle'];

/** List field types whose "add more" popup is backed by an editable subform. */
const LIST_FIELD_TYPES = new Set<FormField['type']>([
    'license-list', 'address-list', 'disqualification-list', 'accident-list',
    'violation-list', 'driving-experience-list', 'employment-list', 'education-list',
]);

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
function DocumentUploadControl({ docType, value, onChange, metaPosition = 'above', forceSingle = false, metaOnce = false }: {
    docType: DocumentType | undefined;
    value: FormDocumentUploadValue;
    onChange: (v: FormDocumentUploadValue) => void;
    metaPosition?: 'above' | 'below';
    /** Force a single set (no repeat) — used inside a repeatable Compliance item. */
    forceSingle?: boolean;
    /** Capture dates once even when the upload sets repeat (compliance 'document' repeat scope). */
    metaOnce?: boolean;
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

    // Fixed labeled slots (e.g. License Front / Back). When allowMultiple is on,
    // the slot group REPEATS — multiple Front/Back sets. files index = group*slotCount + slot.
    const slotCount = docType?.numberOfSlots && docType.numberOfSlots >= 2 ? docType.numberOfSlots : 0;
    const slotLabels = docType?.slotLabels ?? [];
    const repeatable = slotCount > 0 && !!docType?.allowMultiple && !forceSingle;
    const groupCount = slotCount > 0 ? (forceSingle ? 1 : Math.max(1, Math.ceil(files.length / slotCount))) : 0;
    const setSlot = (g: number, s: number, name: string) => {
        const i = g * slotCount + s; const next = [...files]; while (next.length <= i) next.push(''); next[i] = name; up({ files: next });
    };
    const clearSlot = (g: number, s: number) => {
        const i = g * slotCount + s; const next = [...files]; if (i < next.length) next[i] = ''; up({ files: next });
    };
    const addGroup = () => up({ files: [...files, ...Array(slotCount).fill('')] });
    const removeGroup = (g: number) => {
        const next = [...files]; next.splice(g * slotCount, slotCount);
        const groups = value.groups ? [...value.groups] : undefined;
        if (groups) groups.splice(g, 1);
        up({ files: next, ...(groups ? { groups } : {}) });
    };

    const showMeta = !!docType && (
        docType.issueCountryRequired || docType.issueStateRequired
        || docType.issueDateRequired || docType.expiryRequired
    );
    // With repeatable sets, dates are captured PER SET; otherwise once for the document.
    // metaOnce overrides this so dates are captured once even as the upload sets repeat.
    const perSetMeta = showMeta && repeatable && !metaOnce;
    const groupMeta = (g: number) => value.groups?.[g] ?? {};
    const setGroupMeta = (g: number, key: 'expiry' | 'issueDate' | 'issueState' | 'issueCountry', val: string) => {
        const groups = [...(value.groups ?? [])];
        while (groups.length <= g) groups.push({});
        groups[g] = { ...groups[g], [key]: val };
        up({ groups });
    };

    /** Reusable meta inputs (issue country/state/date/expiry) bound via get/set. */
    const MetaInputs = ({ get, set, position }: {
        get: (k: 'expiry' | 'issueDate' | 'issueState' | 'issueCountry') => string;
        set: (k: 'expiry' | 'issueDate' | 'issueState' | 'issueCountry', v: string) => void;
        position?: 'above' | 'below';
    }) => (
        <div className={cn("grid grid-cols-2 gap-3 border-slate-200", position === 'above' ? "order-first border-b pb-3" : position === 'below' ? "border-t pt-3" : "")}>
            {docType?.issueCountryRequired && (
                <div className="col-span-2">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Issuing Country <span className="text-rose-500">*</span></label>
                    <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
                        {(['Canada', 'United States'] as const).map((c) => (
                            <button key={c} type="button" onClick={() => set('issueCountry', c)}
                                className={cn("px-4 py-1.5 text-[12px] font-medium", get('issueCountry') === c ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>{c}</button>
                        ))}
                    </div>
                </div>
            )}
            {docType?.issueStateRequired && (
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Issuing State / Province <span className="text-rose-500">*</span></label>
                    <input value={get('issueState')} onChange={(e) => set('issueState', e.target.value)} placeholder="e.g. Ontario" className={INPUT_CLS} />
                </div>
            )}
            {docType?.issueDateRequired && (
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Issue Date <span className="text-rose-500">*</span></label>
                    <input type="date" value={get('issueDate')} onChange={(e) => set('issueDate', e.target.value)} className={INPUT_CLS} />
                </div>
            )}
            {docType?.expiryRequired && (
                <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Expiry Date <span className="text-rose-500">*</span></label>
                    <input type="date" value={get('expiry')} onChange={(e) => set('expiry', e.target.value)} className={INPUT_CLS} />
                </div>
            )}
        </div>
    );

    // Historical / previous copies — only for a standalone document field (the
    // compliance item renders its own history, so suppress it when forceSingle).
    const showHistorical = !!docType?.allowHistorical && !forceSingle;
    const historical = value.historical ?? [];
    const addHistorical = () => up({ historical: [...historical, { files: [] }] });
    const removeHistorical = (i: number) => up({ historical: historical.filter((_, idx) => idx !== i) });
    const setHistoricalFiles = (i: number, files: string[]) =>
        up({ historical: historical.map((h, idx) => idx === i ? { ...h, files } : h) });
    const setHistoricalMeta = (i: number, key: 'expiry' | 'issueDate' | 'issueState' | 'issueCountry', val: string) =>
        up({ historical: historical.map((h, idx) => idx === i ? { ...h, [key]: val } : h) });

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            {slotCount > 0 ? (
                /* Labeled slots (e.g. Front / Back), repeated into sets when allowMultiple is on. */
                <div className="flex flex-col gap-3">
                    {Array.from({ length: groupCount }).map((_, g) => (
                        <div key={g} className="rounded-md border border-slate-200 bg-white p-3">
                            {repeatable && (
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Set {g + 1}</span>
                                    {groupCount > 1 && (
                                        <button type="button" onClick={() => removeGroup(g)} className="text-rose-500 hover:text-rose-700" title="Remove set"><X size={13} /></button>
                                    )}
                                </div>
                            )}
                            <div className={cn("grid gap-3", slotCount >= 2 ? "grid-cols-2" : "grid-cols-1")}>
                                {Array.from({ length: slotCount }).map((_, s) => {
                                    const slot = slotLabels[s]?.trim() || `Slot ${s + 1}`;
                                    const fname = files[g * slotCount + s];
                                    return (
                                        <div key={s} className="rounded-md border border-slate-200 bg-slate-50/40 p-3">
                                            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">{slot}</div>
                                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/30 px-3 py-4 text-center hover:bg-blue-50/60">
                                                <UploadCloud size={20} className="mb-1 text-slate-300" />
                                                <span className="text-[11px] font-medium text-blue-600">{fname ? 'Replace file' : 'Click to upload'}</span>
                                                <input type="file" className="hidden" onChange={(e) => { const n = e.target.files?.[0]?.name; if (n) setSlot(g, s, n); e.target.value = ''; }} />
                                            </label>
                                            {fname && (
                                                <div className="mt-2 flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1.5 text-xs">
                                                    <span className="truncate text-slate-700">{fname}</span>
                                                    <button type="button" onClick={() => clearSlot(g, s)} className="shrink-0 text-rose-500 hover:text-rose-700" title="Remove"><X size={12} /></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {perSetMeta && (
                                <div className="mt-3 border-t border-slate-200 pt-3">
                                    <MetaInputs get={(k) => groupMeta(g)[k] ?? ''} set={(k, v) => setGroupMeta(g, k, v)} />
                                </div>
                            )}
                        </div>
                    ))}
                    {repeatable && (
                        <button type="button" onClick={addGroup} className="inline-flex items-center gap-1.5 self-start rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">
                            <Plus size={13} /> Add another {slotLabels.length >= 2 ? `${slotLabels[0] || 'Front'}/${slotLabels[1] || 'Back'}` : 'set'}
                        </button>
                    )}
                </div>
            ) : (
            /* Drop zone */
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
            )}

            {/* Uploaded-file chips (only when multiple uploads are allowed and there's > 1 file) */}
            {slotCount === 0 && docType?.allowMultiple && files.length > 0 && (
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

            {/* Document-level dates — only when NOT capturing per-set (repeatable handles its own) */}
            {showMeta && !perSetMeta && (
                <MetaInputs
                    get={(k) => (value[k] as string) ?? ''}
                    set={(k, v) => up({ [k]: v } as Partial<FormDocumentUploadValue>)}
                    position={metaPosition}
                />
            )}

            {/* Previous / historical documents — each its own upload + dates. */}
            {showHistorical && (
                <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Previous / historical documents</p>
                    {historical.length === 0 && (
                        <p className="text-[12px] text-slate-500">Add past or expired copies of this document — each keeps its own files and dates.</p>
                    )}
                    {historical.map((h, i) => (
                        <div key={i} className="flex flex-col gap-2 rounded-md border border-amber-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px]">Previous</span> #{i + 1}
                                </span>
                                <button type="button" onClick={() => removeHistorical(i)} className="text-rose-500 hover:text-rose-700" title="Remove"><X size={13} /></button>
                            </div>
                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-amber-300 bg-amber-50/30 px-3 py-3 text-center hover:bg-amber-50/60">
                                <UploadCloud size={18} className="mb-1 text-amber-300" />
                                <span className="text-[11px] font-medium text-amber-700">{h.files.length ? `${h.files.length} file${h.files.length === 1 ? '' : 's'} chosen` : 'Click to upload'}</span>
                                <input type="file" multiple={docType?.allowMultiple ?? false} className="hidden"
                                    onChange={(e) => { const fs = Array.from(e.target.files ?? []).map(f => f.name); if (fs.length) setHistoricalFiles(i, docType?.allowMultiple ? [...h.files, ...fs] : fs.slice(0, 1)); e.target.value = ''; }} />
                            </label>
                            {showMeta && (
                                <MetaInputs get={(k) => (h[k] as string) ?? ''} set={(k, v) => setHistoricalMeta(i, k, v)} position="below" />
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addHistorical} className="inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50">
                        <Plus size={13} /> Add historical document
                    </button>
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
    const [editingId, setEditingId] = useState<string | null>(null);

    // Real, data-bearing fields of the linked subform — used to summarize each
    // saved record so the entered data is visible and usable afterwards.
    const summaryFields = useMemo(
        () => (subform?.fields ?? []).filter(f =>
            !['heading', 'paragraph', 'bullet-list', 'alert', 'document', 'signature', 'subform-button'].includes(f.type)),
        [subform],
    );
    const fmtVal = (v: unknown): string => {
        if (v == null || v === '') return '';
        if (typeof v === 'boolean') return v ? 'Yes' : 'No';
        if (Array.isArray(v)) return (v as unknown[]).filter(x => typeof x === 'string').join(', ');
        return String(v);
    };
    /** The non-empty {label,val} pairs for an entry, in field order. */
    const entryParts = (e: { values: Record<string, unknown> }) =>
        summaryFields.map(f => ({ label: f.label, val: fmtVal(e.values[f.id]) })).filter(p => p.val);

    const openNew = () => { setDrafts({}); setEditingId(null); setOpen(true); };
    const openEdit = (e: { id: string; values: Record<string, unknown> }) => { setDrafts(e.values); setEditingId(e.id); setOpen(true); };
    const saveEntry = () => {
        const next = editingId
            ? entries.map(x => x.id === editingId ? { ...x, values: drafts } : x)
            : [...entries, { id: Math.random().toString(36).slice(2, 9), values: drafts }];
        onChange(next as unknown as FieldValue);
        setOpen(false);
        setEditingId(null);
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
                <div className="mb-2.5">
                    <div className="mb-1.5 flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label.replace(/^add\s+/i, '') || 'Records'}</span>
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-100 px-1.5 text-[11px] font-bold text-violet-700">{entries.length}</span>
                    </div>
                    <div className="space-y-2">
                        {entries.map((e, idx) => {
                            const parts = entryParts(e);
                            const title = parts[0]?.val || 'Record';
                            const rest = parts.slice(1, 7); // show the structured data, not just one line
                            return (
                                <div key={e.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/60 px-3 py-2">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700">{idx + 1}</span>
                                        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-slate-800">{title}</span>
                                        <button type="button" onClick={() => openEdit(e)} className="flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-slate-500 hover:bg-white hover:text-blue-700" title="Edit">
                                            <Pencil size={12} /> Edit
                                        </button>
                                        <button type="button" onClick={() => onChange((entries.filter(x => x.id !== e.id)) as unknown as FieldValue)} className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Remove">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    {rest.length > 0 && (
                                        <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 py-2.5 sm:grid-cols-2">
                                            {rest.map((p, i) => (
                                                <div key={i} className="min-w-0">
                                                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{p.label}</dt>
                                                    <dd className="truncate text-[12px] text-slate-700">{p.val}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <button
                type="button"
                onClick={openNew}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-violet-300 bg-violet-50/40 px-3 py-2.5 text-[13px] font-semibold text-violet-700 hover:border-violet-400 hover:bg-violet-50"
            >
                <Plus size={14} /> {entries.length > 0 ? `Add another` : label}
            </button>

            {open && (
                <Dialog open onOpenChange={(o) => { if (!o) { setOpen(false); setEditingId(null); } }}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Edit' : 'Add'} · {subform.displayTitle || subform.name}</DialogTitle>
                        </DialogHeader>
                        <div className="max-h-[70vh] overflow-y-auto pr-2">
                            <FormBody
                                fields={subform.fields}
                                values={drafts as Record<string, FieldValue>}
                                setValue={(id, v) => setDrafts(s => ({ ...s, [id]: v }))}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => { setOpen(false); setEditingId(null); }}>Cancel</Button>
                            <Button
                                onClick={saveEntry}
                                className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                            >
                                <Check className="h-4 w-4" /> {editingId ? 'Update' : 'Save'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

/**
 * Combined Compliance + Document field — one card capturing a Key Number's
 * NUMBER plus its linked Document (upload + dates), or the Key Number's own meta
 * when it has no linked document. Value: { number, ...FormDocumentUploadValue }.
 */
function ComplianceField({ field, value, onChange }: {
    field: FormField; value: FieldValue; onChange: (v: FieldValue) => void;
}) {
    const { keyNumber, docType } = complianceFieldConfig(field.complianceKeyNumberId);
    // Allow-multiple repeat scope: 'all' repeats the WHOLE item (number + dates + upload),
    // 'document' keeps one number + dates and only lets the document upload repeat.
    const scope = docType?.repeatScope ?? 'all';
    const repeatItem = !!docType?.allowMultiple && scope !== 'document';
    const repeatDocOnly = !!docType?.allowMultiple && scope === 'document';
    // Historical / previous copies — each captured as its own entry flagged `historical`.
    const allowHistorical = !!docType?.allowHistorical;

    // Value = { entries: Entry[] }. Back-compat: an old single-object value becomes one entry.
    const raw = (value && typeof value === 'object' && !Array.isArray(value)) ? (value as unknown as Record<string, unknown>) : {};
    const entries: Record<string, unknown>[] = Array.isArray(raw.entries)
        ? (raw.entries as Record<string, unknown>[])
        : (('files' in raw || 'number' in raw) ? [raw] : [{}]);
    const list = entries.length ? entries : [{}];

    const commit = (next: Record<string, unknown>[]) => onChange({ entries: next } as unknown as FieldValue);
    const updateEntry = (i: number, patch: Record<string, unknown>) => commit(list.map((e, idx) => idx === i ? { ...e, ...patch } : e));
    const addEntry = () => commit([...list, {}]);
    const addHistorical = () => commit([...list, { historical: true }]);
    const removeEntry = (i: number) => commit(list.filter((_, idx) => idx !== i));

    // Split into current vs historical, keeping each entry's original index for edits.
    const indexed = list.map((e, i) => ({ e, i }));
    const currentItems = indexed.filter(x => !x.e.historical);
    const historicalItems = indexed.filter(x => !!x.e.historical);

    // KN's own meta fields when there's no linked document.
    const knMeta: { key: 'issueDate' | 'expiry' | 'issueState' | 'issueCountry'; label: string; type: 'date' | 'text' }[] = [];
    if (keyNumber?.issueDateRequired)    knMeta.push({ key: 'issueDate',    label: 'Issue date',             type: 'date' });
    if (keyNumber?.hasExpiry)            knMeta.push({ key: 'expiry',       label: 'Expiry date',            type: 'date' });
    if (keyNumber?.issueStateRequired)   knMeta.push({ key: 'issueState',   label: 'Issue state / province', type: 'text' });
    if (keyNumber?.issueCountryRequired) knMeta.push({ key: 'issueCountry', label: 'Issue country',          type: 'text' });

    const renderEntry = (entry: Record<string, unknown>, i: number, opts?: { historical?: boolean; pos?: number }) => {
        const number = typeof entry.number === 'string' ? entry.number : '';
        const docVal: FormDocumentUploadValue = ('files' in entry) ? (entry as unknown as FormDocumentUploadValue) : emptyDocumentUploadValue();
        const historical = !!opts?.historical;
        // Historical entries always capture their own single set + own dates.
        const single = historical || !repeatDocOnly;
        const showHeader = historical || (repeatItem && opts?.pos !== undefined);
        return (
            <div key={i} className={cn('flex flex-col gap-3 rounded-lg border p-3', historical ? 'border-amber-200 bg-amber-50/40' : 'border-slate-200 bg-white')}>
                {showHeader && (
                    <div className="flex items-center justify-between">
                        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide', historical ? 'text-amber-700' : 'text-slate-500')}>
                            {historical && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">Previous</span>}
                            {keyNumber?.name || field.label} #{(opts?.pos ?? i) + 1}
                        </span>
                        {(historical || list.length > 1) && <button type="button" onClick={() => removeEntry(i)} className="text-rose-500 hover:text-rose-700" title="Remove"><X size={13} /></button>}
                    </div>
                )}
                {keyNumber?.numberRequired !== false && (
                    <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{keyNumber?.name || field.label} number</p>
                        <input value={number} onChange={(e) => updateEntry(i, { number: e.target.value })} className={INPUT_CLS} placeholder="Enter number…" />
                    </div>
                )}
                {docType ? (
                    <DocumentUploadControl docType={docType} forceSingle={single} metaOnce={!historical && repeatDocOnly} value={docVal} onChange={(u) => updateEntry(i, u as unknown as Record<string, unknown>)} metaPosition="below" />
                ) : knMeta.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {knMeta.map(m => (
                            <div key={m.key}>
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{m.label}</p>
                                <input type={m.type} value={typeof entry[m.key] === 'string' ? (entry[m.key] as string) : ''} onChange={(e) => updateEntry(i, { [m.key]: e.target.value })} className={INPUT_CLS}
                                    placeholder={m.type === 'date' ? 'mm / dd / yyyy' : m.key === 'issueCountry' ? 'Country' : 'State / Province'} />
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-4">
            {currentItems.map((x, pos) => renderEntry(x.e, x.i, { pos }))}
            {repeatItem && (
                <button type="button" onClick={addEntry} className="inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-dashed border-blue-300 bg-blue-50/40 px-3 py-1.5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">
                    <Plus size={13} /> Add another {keyNumber?.name || field.label}
                </button>
            )}

            {/* Historical / previous copies of this document. */}
            {allowHistorical && (
                <div className="mt-1 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50/30 p-3">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Previous / historical documents</p>
                    {historicalItems.length === 0 && (
                        <p className="text-[12px] text-slate-500">Add past or expired copies of this document — each keeps its own number and dates.</p>
                    )}
                    {historicalItems.map((x, pos) => renderEntry(x.e, x.i, { historical: true, pos }))}
                    <button type="button" onClick={addHistorical} className="inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-dashed border-amber-300 bg-amber-50/60 px-3 py-1.5 text-[12px] font-semibold text-amber-700 hover:bg-amber-50">
                        <Plus size={13} /> Add historical document
                    </button>
                </div>
            )}
        </div>
    );
}

function FieldControl({ field, value, onChange }: {
    field: FormField; value: FieldValue; onChange: (v: FieldValue) => void;
}) {
    const str = typeof value === 'string' ? value : '';
    const list = Array.isArray(value) ? value : [];

    // List fields are backed by an editable subform: their "add more" popup
    // renders the linked subform's fields (managed in the builder) instead of a
    // hardcoded modal. Falls through to the legacy *ListControl when unlinked.
    if (LIST_FIELD_TYPES.has(field.type) && field.subformId
        && loadApplicationForms().some(f => f.id === field.subformId && f.isSubform)) {
        return <SubformButtonField field={field} value={value} onChange={onChange} />;
    }

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
            if (field.computed) {
                // Auto-populated (read-only) — value is supplied by the caller via computeFieldValue.
                return <input type="number" value={str} readOnly tabIndex={-1} className={cn(INPUT_CLS, "cursor-not-allowed bg-slate-50 font-bold text-slate-900")} />;
            }
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
        case 'radio': {
            // Short options pack into 2 columns; long sentence options stay one per row.
            const compact = field.options.length > 1 && field.options.every((o) => o.length <= 28);
            return (
                <div className={cn("grid gap-2", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                    {field.options.map((o) => {
                        const on = str === o;
                        return (
                            <button
                                key={o}
                                type="button"
                                onClick={() => onChange(o)}
                                className={cn(
                                    "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                    on ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                )}
                            >
                                <span className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                                    on ? "border-blue-600" : "border-slate-300",
                                )}>
                                    {on && <span className="h-2 w-2 rounded-full bg-blue-600" />}
                                </span>
                                <span className="text-[13px] font-medium text-slate-700">{o}</span>
                            </button>
                        );
                    })}
                </div>
            );
        }
        case 'checklist': {
            const strList = list.filter((x): x is string => typeof x === 'string');
            const compact = field.options.length > 1 && field.options.every((o) => o.length <= 28);
            return (
                <div className={cn("grid gap-2", compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
                    {field.options.map((o) => {
                        const on = strList.includes(o);
                        return (
                            <button
                                key={o}
                                type="button"
                                onClick={() => onChange(on ? strList.filter((x) => x !== o) : [...strList, o])}
                                className={cn(
                                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                                    on ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/30" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                )}
                            >
                                <span className={cn(
                                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                    on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300",
                                )}>
                                    {on && <span className="text-[10px] font-bold leading-none">✓</span>}
                                </span>
                                <span className="text-[13px] font-medium leading-snug text-slate-700">{o}</span>
                            </button>
                        );
                    })}
                </div>
            );
        }
        case 'compliance':
            return <ComplianceField field={field} value={value} onChange={onChange} />;
        case 'document': {
            const docType = resolveFormDocType(field.documentTypeId);
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
                    metaPosition={field.metaPosition}
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
    const [branding] = useCompanyBranding();
    const t = (s: string | undefined) => applyBrandTokens(s, branding);
    if (field.type === 'heading') {
        return (
            <div className={field.label ? "mt-2 border-b border-blue-300 pb-1.5" : "mt-1"}>
                {field.label && (
                    <h3 className="text-center text-base font-bold uppercase tracking-wide text-blue-600">
                        {t(field.label)}
                    </h3>
                )}
                {field.instruction && (
                    <p className={cn(
                        "whitespace-pre-line text-sm leading-relaxed text-slate-600",
                        field.label && "mt-2",
                    )}>
                        {t(field.instruction)}
                    </p>
                )}
            </div>
        );
    }
    if (field.type === 'paragraph') {
        return (
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {t(field.instruction)}
            </p>
        );
    }
    if (field.type === 'bullet-list') {
        return (
            <div className="space-y-2">
                {field.label && (
                    <p className="text-sm font-semibold text-slate-800">{t(field.label)}</p>
                )}
                <ul className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-slate-700 marker:text-slate-400">
                    {field.options.map((o, i) => <li key={i}>{t(o)}</li>)}
                </ul>
            </div>
        );
    }
    if (field.type === 'alert') {
        return (
            <div className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
                {t(field.label)}
            </div>
        );
    }
    if (field.type === 'signature') {
        // SignaturePad carries its own labeled header — don't render the outer label.
        return <FieldControl field={field} value={value} onChange={onChange} />;
    }
    const inline = INLINE_LABEL_TYPES.includes(field.type);
    if (inline) {
        // Yes/No + inline controls render as a bordered card row — label & helper
        // on the left, the control on the right (professional, scannable).
        return (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-700">
                        {t(field.label)}
                        {field.required && <span className="text-rose-500"> *</span>}
                    </p>
                    {field.instruction && (
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{t(field.instruction)}</p>
                    )}
                </div>
                <div className="shrink-0">
                    <FieldControl field={field} value={value} onChange={onChange} />
                </div>
            </div>
        );
    }
    return (
        <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                {t(field.label)}
                {field.required && <span className="text-rose-500"> *</span>}
            </label>
            <FieldControl field={field} value={value} onChange={onChange} />
            {field.instruction && (
                <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{t(field.instruction)}</p>
            )}
        </div>
    );
}

/** Renders the field list. Conditional fields nest visually under their controller toggle.
 *  `sectioned` groups fields into bordered section cards split on `heading` fields
 *  (proper visual division — used by the template preview). */
export function FormBody({ fields, values, setValue, sectioned = false }: {
    fields: FormField[];
    values: Record<string, FieldValue>;
    setValue: (id: string, v: FieldValue) => void;
    sectioned?: boolean;
}) {
    const defaultFor = (f: FormField): FieldValue => {
        if (f.type === 'toggle') return false;
        if (f.type === 'checklist') return [];
        if (f.type === 'license-list' || f.type === 'address-list' || f.type === 'disqualification-list' || f.type === 'accident-list' || f.type === 'violation-list' || f.type === 'driving-experience-list' || f.type === 'employment-list' || f.type === 'education-list') return [];
        if (f.type === 'document') return emptyDocumentUploadValue();
        if (f.type === 'compliance') return { number: '', files: [] } as unknown as FieldValue;
        return '';
    };

    // Auto-populated fields (e.g. road-test section scores) derive their value from
    // other fields. Compute live for display, and persist so submit / PDF capture it.
    // Layer checklist-scores first, then sums, so a sum reflects the same-render
    // section scores (no one-render lag) the moment a checklist item is toggled.
    const fieldById = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
    const liveValues = useMemo(() => {
        const out: Record<string, FieldValue> = { ...values };
        for (const f of fields) if (f.computed?.kind === 'checklist-score') out[f.id] = computeFieldValue(f, out, fieldById) ?? '';
        for (const f of fields) if (f.computed?.kind === 'sum') out[f.id] = computeFieldValue(f, out, fieldById) ?? '';
        return out;
    }, [values, fields, fieldById]);
    const valueFor = (f: FormField): FieldValue =>
        f.computed ? (liveValues[f.id] ?? '') : (values[f.id] ?? defaultFor(f));

    useEffect(() => {
        for (const f of fields) {
            if (!f.computed) continue;
            const next = liveValues[f.id] ?? '';
            if (String(values[f.id] ?? '') !== next) setValue(f.id, next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveValues]);

    /** Hide fields whose `showWhen` controller isn't satisfied — so consumers
     *  that pass raw fields (e.g. the test runner) still get correct
     *  conditional reveal. */
    const isVisible = (f: FormField): boolean => showWhenSatisfied(f.showWhen, values);
    const visible = fields.filter(isVisible);

    const dependentsByController = new Map<string, FormField[]>();
    for (const f of visible) {
        if (!f.showWhen) continue;
        const list = dependentsByController.get(f.showWhen.fieldId) ?? [];
        list.push(f);
        dependentsByController.set(f.showWhen.fieldId, list);
    }

    const hasDeps = (f: FormField): boolean => (dependentsByController.get(f.id)?.length ?? 0) > 0;
    const topLevel = visible.filter((f) => !f.showWhen);
    const rows = chunkFieldRows(topLevel, hasDeps);

    // Render a sibling list: pair half-width leaves side by side, and nest each
    // field's revealed dependents in a callout. Mutually recursive with renderRow
    // so a revealed toggle can in turn reveal its own dependents (any depth), and
    // half-width dependents still pair within the callout.
    function renderList(list: FormField[]) {
        return chunkFieldRows(list, hasDeps).map(renderRow);
    }

    function renderRow(row: FormField[]) {
        // Side-by-side pair: two half-width fields, neither has dependents.
        if (row.length === 2) {
            return (
                <div key={row[0].id} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    {row.map((f) => (
                        <FieldBlock key={f.id} field={f} value={valueFor(f)} onChange={(v) => setValue(f.id, v)} />
                    ))}
                </div>
            );
        }
        const f = row[0];
        const deps = dependentsByController.get(f.id) ?? [];
        return (
            <div key={f.id}>
                <FieldBlock field={f} value={valueFor(f)} onChange={(v) => setValue(f.id, v)} />
                {deps.length > 0 && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                        <p className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-blue-600">
                            <CornerDownRight size={13} /> Please provide the details
                        </p>
                        <div className="space-y-4">{renderList(deps)}</div>
                    </div>
                )}
            </div>
        );
    }

    if (!sectioned) {
        return <div className="space-y-5">{rows.map(renderRow)}</div>;
    }

    // Group rows into bordered section cards, split on heading rows.
    type Sec = { heading?: FormField; rows: FormField[][] };
    const sections: Sec[] = [];
    let cur: Sec = { rows: [] };
    for (const row of rows) {
        if (row.length === 1 && row[0].type === 'heading') {
            if (cur.heading || cur.rows.length) sections.push(cur);
            cur = { heading: row[0], rows: [] };
        } else {
            cur.rows.push(row);
        }
    }
    if (cur.heading || cur.rows.length) sections.push(cur);

    return (
        <div className="space-y-5">
            {sections.map((sec, i) => (
                <section key={sec.heading?.id ?? `sec-${i}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    {sec.heading && (
                        <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3.5">
                            <span className="mt-0.5 h-5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                            <div className="min-w-0">
                                <h3 className="text-[15px] font-bold tracking-tight text-slate-900">{sec.heading.label || 'Section'}</h3>
                                {sec.heading.instruction && (
                                    <p className="mt-0.5 whitespace-pre-line text-[12px] leading-relaxed text-slate-500">{sec.heading.instruction}</p>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="space-y-5 p-5 lg:p-6">
                        {sec.rows.length ? sec.rows.map(renderRow) : <p className="py-4 text-center text-sm text-slate-400">No fields in this section.</p>}
                    </div>
                </section>
            ))}
        </div>
    );
}

/** Live score banner shown at the top of any form that has computed score fields
 *  (e.g. the Road Test Evaluation). Recomputes from the current values on each render. */
function ScoreSummary({ fields, values }: { fields: FormField[]; values: Record<string, FieldValue> }) {
    const byId = useMemo(() => new Map(fields.map((f) => [f.id, f])), [fields]);
    const sections = fields.filter((f) => f.computed?.kind === 'checklist-score');
    const totalField = fields.find((f) => f.computed?.kind === 'sum');
    // Only show the "Final Score" banner for graded forms — checklist-score sections,
    // or a sum total with an explicit pass mark. A plain auto-sum (e.g. Statement of
    // Hours of Service "Total Hours Worked") renders inline as a read-only field instead.
    const graded = sections.length > 0 || totalField?.computed?.passMark != null;
    if (!graded) return null;

    // Layer the live-computed section scores into a values snapshot so the total
    // reflects checklist changes in the same render (no persistence lag).
    const live: Record<string, FieldValue> = { ...values };
    for (const f of sections) live[f.id] = computeFieldValue(f, live, byId) ?? '';

    const shortLabel = (l: string) => l.replace(/\s*score\s*\(.*?\)\s*$/i, '').trim() || l;
    const sectionData = sections.map((f) => ({
        id: f.id,
        label: shortLabel(f.label),
        score: Number(live[f.id] ?? 0),
        max: f.computed?.max ?? 5,
    }));

    const totalMax = totalField
        ? (totalField.computed?.sources ?? []).reduce((s, sid) => s + (byId.get(sid)?.computed?.max ?? 0), 0)
        : sectionData.reduce((s, d) => s + d.max, 0);
    const total = totalField
        ? Number(computeFieldValue(totalField, live, byId) ?? 0)
        : sectionData.reduce((s, d) => s + d.score, 0);

    const passMark = totalField?.computed?.passMark;
    const passed = passMark != null ? total >= passMark : undefined;
    const pct = totalMax > 0 ? Math.round((total / totalMax) * 100) : 0;

    const tone = passed === undefined
        ? { ring: 'border-slate-200', big: 'text-slate-900', bar: 'bg-blue-500', badge: '' }
        : passed
            ? { ring: 'border-emerald-300', big: 'text-emerald-600', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
            : { ring: 'border-amber-300', big: 'text-amber-600', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-200' };

    return (
        <div className="border-b border-slate-200 bg-white px-6 py-3">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-3">
                {/* Final score */}
                <div className={cn('flex items-center gap-3 rounded-xl border bg-slate-50/60 px-4 py-2', tone.ring)}>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Final Score</p>
                        <p className={cn('text-2xl font-bold leading-none tabular-nums', tone.big)}>
                            {total}<span className="text-base font-semibold text-slate-400"> / {totalMax}</span>
                        </p>
                    </div>
                    {passed !== undefined && (
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold', tone.badge)}>
                            {passed ? <Check size={12} /> : null}
                            {passed ? 'Pass' : `Needs ${passMark}+`}
                        </span>
                    )}
                </div>

                {/* Section breakdown */}
                <div className="flex flex-1 flex-wrap items-center gap-2">
                    {sectionData.map((s) => (
                        <div key={s.id} className="flex min-w-[120px] flex-1 flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[11px] font-semibold text-slate-600">{s.label}</span>
                                <span className="shrink-0 text-[12px] font-bold tabular-nums text-slate-900">{s.score}/{s.max}</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                <div className={cn('h-full rounded-full transition-all', tone.bar)} style={{ width: `${s.max > 0 ? (s.score / s.max) * 100 : 0}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {passMark != null && (
                    <p className="text-[11px] font-medium text-slate-400">{pct}% · pass mark {passMark}/{totalMax}</p>
                )}
            </div>
        </div>
    );
}

export function CustomFormWizard({ appForm, onClose }: {
    appForm: ApplicationFormDef;
    onClose: () => void;
}) {
    const [values, setValues] = useState<Record<string, FieldValue>>({});
    const [branding] = useCompanyBranding();
    const [downloading, setDownloading] = useState(false);
    const [pdfMenuOpen, setPdfMenuOpen] = useState(false);
    const setValue = (id: string, v: FieldValue) => setValues((s) => ({ ...s, [id]: v }));

    const accent = branding.accentColor;
    const sectionTitle = appForm.displayTitle || appForm.name;

    /** Hide fields whose `showWhen` controller isn't satisfied yet. */
    const fields = appForm.fields.filter((f) => showWhenSatisfied(f.showWhen, values));

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
                        <div className="relative">
                            <button
                                type="button"
                                disabled={downloading}
                                onClick={() => setPdfMenuOpen(o => !o)}
                                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                <Download size={15} /> {downloading ? 'Preparing…' : 'Download PDF'}
                            </button>
                            {pdfMenuOpen && (
                                <div className="absolute right-0 z-[70] mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                    <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">PDF template</p>
                                    {PDF_TEMPLATES.map(t => (
                                        <button key={t.id} type="button"
                                            onClick={async () => { setPdfMenuOpen(false); setDownloading(true); try { await generateApplicationFormPdf({ form: appForm, branding, values, variant: t.id }); } finally { setDownloading(false); } }}
                                            className="block w-full px-3 py-2 text-left hover:bg-slate-50">
                                            <span className="block text-[13px] font-semibold text-slate-800">{t.label}</span>
                                            <span className="block text-[11px] text-slate-500">{t.description}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
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

            {/* ── Live score banner (forms with computed scores, e.g. Road Test) ── */}
            <ScoreSummary fields={fields} values={values} />

            {/* ── Body: divided section cards (professional, app-like) ─── */}
            <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mx-auto max-w-3xl">
                    {/* Optional intro copy (the title already lives in the top bar). */}
                    {appForm.introText && (
                        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/50 px-5 py-3.5">
                            <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-600">{appForm.introText}</p>
                        </div>
                    )}

                    {fields.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white py-8 text-center text-sm text-slate-400 shadow-sm">
                            This form has no fields yet.
                        </div>
                    ) : (
                        <FormBody
                            sectioned
                            fields={fields}
                            values={values}
                            setValue={setValue}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
