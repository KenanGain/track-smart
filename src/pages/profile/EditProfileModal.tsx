import { useEffect, useMemo, useState } from "react";
import { X, Save, User as UserIcon, MapPin, Phone as PhoneIcon, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import type { ContactInfo, EmploymentInfo } from "@/data/user-profile.data";

type Props = {
    open: boolean;
    onClose: () => void;
    contact: ContactInfo;
    employment: EmploymentInfo;
    onSave: (next: { contact: ContactInfo; employment: EmploymentInfo }) => void;
};

const RELATIONSHIPS = ["Spouse", "Parent", "Sibling", "Child", "Friend", "Other"];
const TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "America/Vancouver",
];
const LANGUAGES = ["English (US)", "English (CA)", "Spanish", "French (Canada)"];

export function EditProfileModal({ open, onClose, contact, employment, onSave }: Props) {
    // Personal / employment
    const [phone, setPhone] = useState(contact.phone);
    const [altPhone, setAltPhone] = useState(contact.altPhone ?? "");
    const [timezone, setTimezone] = useState(employment.timezone);
    const [language, setLanguage] = useState(employment.language);

    // Address
    const [country, setCountry] = useState(contact.address.country || "United States");
    const [street, setStreet] = useState(contact.address.street);
    const [apt, setApt] = useState(contact.address.apt ?? "");
    const [city, setCity] = useState(contact.address.city);
    const [state, setState] = useState(contact.address.state);
    const [zip, setZip] = useState(contact.address.zip);

    // Emergency contact
    const [ecName, setEcName] = useState(contact.emergencyContact.name);
    const [ecRel, setEcRel] = useState(contact.emergencyContact.relation);
    const [ecPhone, setEcPhone] = useState(contact.emergencyContact.phone);

    const [error, setError] = useState<string | null>(null);

    // Reset state when re-opening
    useEffect(() => {
        if (!open) return;
        setPhone(contact.phone);
        setAltPhone(contact.altPhone ?? "");
        setTimezone(employment.timezone);
        setLanguage(employment.language);
        setCountry(contact.address.country || "United States");
        setStreet(contact.address.street);
        setApt(contact.address.apt ?? "");
        setCity(contact.address.city);
        setState(contact.address.state);
        setZip(contact.address.zip);
        setEcName(contact.emergencyContact.name);
        setEcRel(contact.emergencyContact.relation);
        setEcPhone(contact.emergencyContact.phone);
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, contact, employment, onClose]);

    const stateOptions = useMemo(
        () => (country === "Canada" ? CA_PROVINCES : US_STATES),
        [country]
    );

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!phone.trim()) { setError("Phone is required."); return; }
        if (!street.trim() || !city.trim() || !state.trim() || !zip.trim()) {
            setError("Please complete all address fields.");
            return;
        }
        if (!ecName.trim() || !ecPhone.trim()) {
            setError("Please complete the emergency contact name and phone.");
            return;
        }
        onSave({
            contact: {
                phone: phone.trim(),
                altPhone: altPhone.trim() || undefined,
                address: {
                    country,
                    street: street.trim(),
                    apt: apt.trim() || undefined,
                    city: city.trim(),
                    state,
                    zip: zip.trim(),
                },
                emergencyContact: {
                    name: ecName.trim(),
                    relation: ecRel,
                    phone: ecPhone.trim(),
                },
            },
            employment: { ...employment, timezone, language },
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Edit Profile</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Update your contact, address, and emergency information.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                        <Section title="Personal" icon={<UserIcon size={14} className="text-blue-600" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Phone" required>
                                    <TextInput value={phone} onChange={setPhone} placeholder="(555) 555-0100" />
                                </Field>
                                <Field label="Alternate Phone" optional>
                                    <TextInput value={altPhone} onChange={setAltPhone} placeholder="(555) 555-0101" />
                                </Field>
                                <Field label="Time Zone">
                                    <SelectInput value={timezone} onChange={setTimezone}>
                                        {TIMEZONES.map((tz) => (
                                            <option key={tz} value={tz}>{tz}</option>
                                        ))}
                                    </SelectInput>
                                </Field>
                                <Field label="Language">
                                    <SelectInput value={language} onChange={setLanguage}>
                                        {LANGUAGES.map((l) => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </SelectInput>
                                </Field>
                            </div>
                        </Section>

                        <Section title="Address" icon={<MapPin size={14} className="text-blue-600" />}>
                            <div className="space-y-5">
                                <Field label="Country">
                                    <SelectInput
                                        value={country}
                                        onChange={(v) => { setCountry(v); setState(""); }}
                                    >
                                        <option value="United States">United States</option>
                                        <option value="Canada">Canada</option>
                                    </SelectInput>
                                </Field>
                                <Field label="Street Address" required>
                                    <TextInput value={street} onChange={setStreet} placeholder="1200 North Dupont Highway" />
                                </Field>
                                <Field label="Apartment, suite, etc." optional>
                                    <TextInput value={apt} onChange={setApt} placeholder="(Optional)" />
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="City" required>
                                        <TextInput value={city} onChange={setCity} placeholder="Wilmington" />
                                    </Field>
                                    <Field label={country === "Canada" ? "Province" : "State"} required>
                                        <SelectInput value={state} onChange={setState}>
                                            <option value="">Select…</option>
                                            {stateOptions.map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </SelectInput>
                                    </Field>
                                </div>
                                <div className="md:max-w-[200px]">
                                    <Field label={country === "Canada" ? "Postal Code" : "ZIP Code"} required>
                                        <TextInput
                                            value={zip}
                                            onChange={setZip}
                                            placeholder={country === "Canada" ? "K1A 0B1" : "19801"}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </Section>

                        <Section title="Emergency Contact" icon={<PhoneIcon size={14} className="text-blue-600" />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Name" required>
                                    <TextInput value={ecName} onChange={setEcName} placeholder="Alex Morgan" />
                                </Field>
                                <Field label="Relationship">
                                    <SelectInput value={ecRel} onChange={setEcRel}>
                                        {RELATIONSHIPS.map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </SelectInput>
                                </Field>
                                <Field label="Phone" required className="md:col-span-2 md:max-w-sm">
                                    <TextInput value={ecPhone} onChange={setEcPhone} placeholder="(555) 555-0100" />
                                </Field>
                            </div>
                        </Section>

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white rounded-md bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function Section({
    title, icon, children,
}: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                {icon && <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">{icon}</span>}
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            </div>
            {children}
        </section>
    );
}

function Field({
    label, required, optional, className, children,
}: { label: string; required?: boolean; optional?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <div className={cn(className)}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {optional && <span className="text-slate-400 font-normal ml-1">(Optional)</span>}
            </label>
            {children}
        </div>
    );
}

function TextInput({
    value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        />
    );
}

function SelectInput({
    value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
        >
            {children}
        </select>
    );
}
