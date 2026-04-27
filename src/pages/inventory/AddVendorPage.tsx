import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Check } from "lucide-react";
import {
    VENDOR_CATEGORIES,
    VENDOR_TYPES,
    CARRIER_NAME,
    ADDRESS_COUNTRIES,
    US_STATES,
    CA_PROVINCES,
    type VendorTypeKey,
    type VendorAddress,
} from "./inventory.data";

type Props = {
    onNavigate: (path: string) => void;
};

export type VendorFormPayload = {
    name: string;
    companyName?: string;
    address: VendorAddress;
    email?: string;
    phone?: string;
    categoryId: string;
    type: VendorTypeKey;
    contactName?: string;
    contactInfo?: string;
};

export function AddVendorPage({ onNavigate }: Props) {
    // 1. Vendor Identity
    const [name, setName] = useState("");
    const [companyName, setCompanyName] = useState("");

    // 2. Vendor Address
    const [country, setCountry] = useState<"United States" | "Canada">("United States");
    const [street, setStreet] = useState("");
    const [apt, setApt] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [zip, setZip] = useState("");

    // 3. Vendor Classification
    const [categoryId, setCategoryId] = useState(VENDOR_CATEGORIES[0]?.id ?? "");
    const [type, setType] = useState<VendorTypeKey>("fuel-card");

    // 4. Contact
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactInfo, setContactInfo] = useState("");

    const stateOptions = useMemo(
        () => (country === "Canada" ? CA_PROVINCES : US_STATES),
        [country]
    );

    const isValid = name.trim().length > 0 && !!categoryId && !!type;

    const handleSave = () => {
        if (!isValid) return;
        const payload: VendorFormPayload = {
            name,
            companyName: companyName || undefined,
            address: {
                country,
                street: street || undefined,
                apt: apt || undefined,
                city: city || undefined,
                state: state || undefined,
                zip: zip || undefined,
            },
            email: email || undefined,
            phone: phone || undefined,
            categoryId,
            type,
            contactName: contactName || undefined,
            contactInfo: contactInfo || undefined,
        };
        console.log("Vendor saved:", payload);
        onNavigate("/inventory/vendors");
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Sticky Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shadow-sm">
                <div>
                    <button
                        type="button"
                        onClick={() => onNavigate("/inventory/vendors")}
                        className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 mb-1"
                    >
                        <ArrowLeft size={12} /> Back to Vendors
                    </button>
                    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Building2 size={12} />
                        <span className="font-medium">{CARRIER_NAME}</span>
                        <span>/</span>
                        <span>Inventory</span>
                        <span>/</span>
                        <span>Vendors</span>
                        <span>/</span>
                        <span>Add Vendor</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-slate-900">Add Vendor</h1>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => onNavigate("/inventory/vendors")}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isValid}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors shadow-sm flex items-center gap-2 ${isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        <Check size={16} /> Save Vendor
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto px-8 py-8 space-y-6 max-w-5xl mx-auto w-full">
                {/* 1. Vendor Identity */}
                <FormSection number={1} title="Vendor Identity" subtitle="Who is this vendor?">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="Vendor Name" required>
                            <TextInput value={name} onChange={setName} placeholder="e.g. Comdata" />
                        </FormField>
                        <FormField label="Company Name" optional>
                            <TextInput value={companyName} onChange={setCompanyName} placeholder="e.g. Comdata Inc." />
                        </FormField>
                    </div>
                </FormSection>

                {/* 2. Vendor Address */}
                <FormSection number={2} title="Vendor Address" subtitle="Primary business location.">
                    <div className="space-y-5">
                        <FormField label="Country">
                            <SelectInput
                                value={country}
                                onChange={(v) => {
                                    setCountry(v as "United States" | "Canada");
                                    setState(""); // reset state/province when country changes
                                }}
                            >
                                {ADDRESS_COUNTRIES.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </SelectInput>
                        </FormField>
                        <FormField label="Street Address">
                            <TextInput value={street} onChange={setStreet} placeholder="1200 North Dupont Highway" />
                        </FormField>
                        <FormField label="Apartment, suite, etc." optional>
                            <TextInput value={apt} onChange={setApt} placeholder="(Optional)" />
                        </FormField>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <FormField label="City">
                                <TextInput value={city} onChange={setCity} placeholder="Wilmington" />
                            </FormField>
                            <FormField label={country === "Canada" ? "Province" : "State"}>
                                <SelectInput value={state} onChange={setState}>
                                    <option value="">Select…</option>
                                    {stateOptions.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </SelectInput>
                            </FormField>
                        </div>
                        <div className="md:max-w-[200px]">
                            <FormField label={country === "Canada" ? "Postal Code" : "ZIP Code"}>
                                <TextInput
                                    value={zip}
                                    onChange={setZip}
                                    placeholder={country === "Canada" ? "K1A 0B1" : "19801"}
                                />
                            </FormField>
                        </div>
                    </div>
                </FormSection>

                {/* 3. Vendor Classification */}
                <FormSection number={3} title="Vendor Classification" subtitle="Categorize the vendor and select its service type.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="Vendor Category" required>
                            <SelectInput value={categoryId} onChange={setCategoryId}>
                                {VENDOR_CATEGORIES.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </SelectInput>
                        </FormField>
                        <FormField label="Vendor Type" required>
                            <SelectInput value={type} onChange={(v) => setType(v as VendorTypeKey)}>
                                {VENDOR_TYPES.map((t) => (
                                    <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                            </SelectInput>
                        </FormField>
                    </div>
                </FormSection>

                {/* 4. Contact */}
                <FormSection number={4} title="Contact Information" subtitle="Primary point of contact at this vendor.">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="Email">
                            <TextInput value={email} onChange={setEmail} type="email" placeholder="contact@vendor.com" />
                        </FormField>
                        <FormField label="Phone">
                            <TextInput value={phone} onChange={setPhone} placeholder="(555) 555-0100" />
                        </FormField>
                        <FormField label="Contact Name">
                            <TextInput value={contactName} onChange={setContactName} placeholder="e.g. Jane Smith" />
                        </FormField>
                        <FormField label="Contact Information">
                            <TextInput value={contactInfo} onChange={setContactInfo} placeholder="Direct phone or email" />
                        </FormField>
                    </div>
                </FormSection>

                <p className="text-xs text-slate-500 italic px-1">
                    Tip: Asset and driver assignments live on inventory items, not on the vendor itself.
                </p>
            </main>
        </div>
    );
}

// ── Reusable Form Components ───────────────────────────────────────────────

function FormSection({
    number, title, subtitle, children,
}: { number: number; title: string; subtitle?: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {number}
                </div>
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            <div className="pl-11">{children}</div>
        </section>
    );
}

function FormField({
    label, required, optional, className, children,
}: { label: string; required?: boolean; optional?: boolean; className?: string; children: React.ReactNode }) {
    return (
        <div className={className}>
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
