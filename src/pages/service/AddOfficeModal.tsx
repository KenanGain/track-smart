import { useEffect, useState } from "react";
import { X, Save, Building2 } from "lucide-react";
import { type OfficeLocation } from "@/pages/accounts/service-profiles.data";
import { US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    open: boolean;
    onClose: () => void;
    onSave: (office: OfficeLocation) => void;
};

export function AddOfficeModal({ open, onClose, onSave }: Props) {
    const [label, setLabel] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [contactName, setContactName] = useState("");
    const [phone, setPhone] = useState("");
    const [country, setCountry] = useState<"US" | "Canada">("US");

    useEffect(() => {
        if (!open) return;
        setLabel(""); setAddress(""); setCity(""); setState("");
        setContactName(""); setPhone(""); setCountry("US");

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, onClose]);

    if (!open) return null;

    const stateOptions = country === "Canada" ? CA_PROVINCES : US_STATES;
    const isValid = label.trim().length > 0 && address.trim().length > 0 && city.trim().length > 0 && !!state;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        onSave({
            id: `loc-${Date.now()}`,
            label: label.trim(),
            address: address.trim(),
            city: city.trim(),
            state,
            contactName: contactName.trim() || undefined,
            phone: phone.trim() || undefined,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Building2 size={16} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Add Office Location</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Add an office under this service profile.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                    <Field label="Label" required>
                        <TextInput value={label} onChange={setLabel} placeholder="e.g. Houston Branch" />
                    </Field>
                    <Field label="Street Address" required>
                        <TextInput value={address} onChange={setAddress} placeholder="500 Energy Pkwy" />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Country">
                            <SelectInput value={country} onChange={(v) => { setCountry(v as "US" | "Canada"); setState(""); }}>
                                <option value="US">United States</option>
                                <option value="Canada">Canada</option>
                            </SelectInput>
                        </Field>
                        <Field label="City" required>
                            <TextInput value={city} onChange={setCity} placeholder="Houston" />
                        </Field>
                        <Field label={country === "Canada" ? "Province" : "State"} required>
                            <SelectInput value={state} onChange={setState}>
                                <option value="">Select…</option>
                                {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </SelectInput>
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 pt-5">
                        <Field label="Contact Name" optional>
                            <TextInput value={contactName} onChange={setContactName} placeholder="Jane Smith" />
                        </Field>
                        <Field label="Phone" optional>
                            <TextInput value={phone} onChange={setPhone} placeholder="(555) 555-0100" />
                        </Field>
                    </div>
                </form>

                <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                    <button
                        type="button"
                        onClick={(e) => handleSubmit(e as any)}
                        disabled={!isValid}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm flex items-center gap-2",
                            isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                        )}
                    >
                        <Save size={16} /> Add Office
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
                {optional && <span className="text-slate-400 font-normal ml-1">(Optional)</span>}
            </label>
            {children}
        </div>
    );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        />
    );
}

function SelectInput({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
        >
            {children}
        </select>
    );
}
