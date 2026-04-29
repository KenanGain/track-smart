import { useEffect, useMemo, useState } from "react";
import {
    X, Save, AlertCircle, Briefcase, MapPin, Mail, Settings, Lock,
    Infinity as InfinityIcon,
} from "lucide-react";
import {
    BUSINESS_TYPES, ACCOUNT_LIMIT_UNLIMITED, isUnlimitedLimit,
    type ServiceProfile, type BusinessType, type ServiceProfileStatus,
} from "@/pages/accounts/service-profiles.data";
import { ADDRESS_COUNTRIES, US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import { type AppUser } from "@/data/users.data";
import { cn } from "@/lib/utils";

export type SectionMode = "identity" | "legal-address" | "mailing-address" | "contact" | "settings";

const MODE_META: Record<SectionMode, { title: string; icon: React.ElementType; subtitle: string }> = {
    "identity": { title: "Edit Identity", icon: Briefcase, subtitle: "Legal name, DBA, and incorporation." },
    "legal-address": { title: "Edit Legal / Main Address", icon: MapPin, subtitle: "Primary business location." },
    "mailing-address": { title: "Edit Mailing Address", icon: Mail, subtitle: "Where official correspondence is sent." },
    "contact": { title: "Edit Contact", icon: Mail, subtitle: "Primary email and phone." },
    "settings": { title: "Edit Status & Limits", icon: Settings, subtitle: "Activate / suspend the profile and cap how many carrier accounts it can create." },
};

const STATUSES: ServiceProfileStatus[] = ["Active", "Inactive", "Pending", "Suspended"];

type Props = {
    open: boolean;
    mode: SectionMode | null;
    profile: ServiceProfile | null;
    currentUser?: AppUser | null;
    onClose: () => void;
    onSave: (next: ServiceProfile) => void;
};

export function ServiceProfileSectionEditModal({
    open, mode, profile, currentUser, onClose, onSave,
}: Props) {
    // Identity
    const [legalName, setLegalName] = useState("");
    const [dbaName, setDbaName] = useState("");
    const [stateOfInc, setStateOfInc] = useState("");
    const [businessType, setBusinessType] = useState<BusinessType>("LLC");

    // Legal Address
    const [legalCountry, setLegalCountry] = useState<"United States" | "Canada">("United States");
    const [legalStreet, setLegalStreet] = useState("");
    const [legalApt, setLegalApt] = useState("");
    const [legalCity, setLegalCity] = useState("");
    const [legalState, setLegalState] = useState("");
    const [legalZip, setLegalZip] = useState("");

    // Mailing
    const [mailStreet, setMailStreet] = useState("");
    const [mailCity, setMailCity] = useState("");
    const [mailState, setMailState] = useState("");
    const [mailZip, setMailZip] = useState("");
    const [mailCountry, setMailCountry] = useState<"United States" | "Canada">("United States");

    // Contact
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    // Settings (super admin only)
    const [status, setStatus] = useState<ServiceProfileStatus>("Active");
    const [unlimited, setUnlimited] = useState(true);
    const [accountLimit, setAccountLimit] = useState<number>(10);

    const [error, setError] = useState<string | null>(null);

    const legalStateOptions = useMemo(
        () => (legalCountry === "Canada" ? CA_PROVINCES : US_STATES),
        [legalCountry]
    );
    const mailStateOptions = useMemo(
        () => (mailCountry === "Canada" ? CA_PROVINCES : US_STATES),
        [mailCountry]
    );

    const isSuperAdmin = currentUser?.role === "super-admin";

    useEffect(() => {
        if (!open || !profile) return;
        // Reset all the relevant fields whenever the modal (re-)opens
        setLegalName(profile.legalName);
        setDbaName(profile.dbaName ?? "");
        setStateOfInc(profile.stateOfInc);
        setBusinessType(profile.businessType);
        setLegalCountry(profile.legalAddress.country);
        setLegalStreet(profile.legalAddress.street);
        setLegalApt(profile.legalAddress.apt ?? "");
        setLegalCity(profile.legalAddress.city);
        setLegalState(profile.legalAddress.state);
        setLegalZip(profile.legalAddress.zip);
        setMailStreet(profile.mailingAddress.streetOrPoBox);
        setMailCity(profile.mailingAddress.city);
        setMailState(profile.mailingAddress.state);
        setMailZip(profile.mailingAddress.zip);
        setMailCountry(profile.mailingAddress.country);
        setContactEmail(profile.contactEmail ?? "");
        setContactPhone(profile.contactPhone ?? "");
        setStatus(profile.status);
        setUnlimited(isUnlimitedLimit(profile.accountLimit));
        setAccountLimit(isUnlimitedLimit(profile.accountLimit) ? 10 : profile.accountLimit);
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [open, profile, onClose]);

    if (!open || !mode || !profile) return null;
    const meta = MODE_META[mode];
    const Icon = meta.icon;

    // Settings section is super-admin only — admins shouldn't be able to open it
    if (mode === "settings" && !isSuperAdmin) {
        return (
            <Shell title={meta.title} subtitle={meta.subtitle} icon={Icon} onClose={onClose}>
                <div className="px-6 py-6">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
                        <Lock size={16} className="text-amber-700 mt-0.5 shrink-0" />
                        <div>Status and Account Creation Limit are managed by Super Admins. Ask a Super Admin to update these values.</div>
                    </div>
                </div>
                <Footer onClose={onClose} disabled />
            </Shell>
        );
    }

    const validators: Record<SectionMode, () => string | null> = {
        "identity": () => {
            if (!legalName.trim()) return "Legal name is required.";
            if (!stateOfInc) return "State of incorporation is required.";
            if (!businessType) return "Business type is required.";
            return null;
        },
        "legal-address": () => {
            if (!legalStreet.trim()) return "Street address is required.";
            if (!legalCity.trim()) return "City is required.";
            if (!legalState) return "State / Province is required.";
            if (!legalZip.trim()) return "ZIP / Postal code is required.";
            return null;
        },
        "mailing-address": () => {
            if (!mailStreet.trim()) return "Street address or PO Box is required.";
            if (!mailCity.trim()) return "City is required.";
            if (!mailState) return "State / Province is required.";
            if (!mailZip.trim()) return "ZIP / Postal code is required.";
            return null;
        },
        "contact": () => null,
        "settings": () => {
            if (!unlimited && accountLimit < profile.accountsCreated) {
                return `Limit cannot be lower than the ${profile.accountsCreated} accounts already created.`;
            }
            return null;
        },
    };

    const handleSave = () => {
        const validationError = validators[mode]();
        if (validationError) { setError(validationError); return; }

        let next: ServiceProfile = { ...profile };
        if (mode === "identity") {
            next = {
                ...next,
                legalName: legalName.trim(),
                dbaName: dbaName.trim() || undefined,
                stateOfInc, businessType,
            };
        } else if (mode === "legal-address") {
            next = {
                ...next,
                legalAddress: {
                    country: legalCountry,
                    street: legalStreet.trim(),
                    apt: legalApt.trim() || undefined,
                    city: legalCity.trim(),
                    state: legalState,
                    zip: legalZip.trim(),
                },
            };
        } else if (mode === "mailing-address") {
            next = {
                ...next,
                mailingAddress: {
                    streetOrPoBox: mailStreet.trim(),
                    city: mailCity.trim(),
                    state: mailState,
                    zip: mailZip.trim(),
                    country: mailCountry,
                },
            };
        } else if (mode === "contact") {
            next = {
                ...next,
                contactEmail: contactEmail.trim() || undefined,
                contactPhone: contactPhone.trim() || undefined,
            };
        } else if (mode === "settings") {
            next = {
                ...next,
                status,
                accountLimit: unlimited ? ACCOUNT_LIMIT_UNLIMITED : accountLimit,
            };
        }
        onSave(next);
        onClose();
    };

    return (
        <Shell title={meta.title} subtitle={meta.subtitle} icon={Icon} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                {mode === "identity" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Legal Name" required>
                            <TextInput value={legalName} onChange={setLegalName} />
                        </Field>
                        <Field label="DBA Name" optional>
                            <TextInput value={dbaName} onChange={setDbaName} />
                        </Field>
                        <Field label="State of Incorporation" required>
                            <SelectInput value={stateOfInc} onChange={setStateOfInc}>
                                <option value="">Select…</option>
                                <optgroup label="United States">
                                    {US_STATES.map((s) => <option key={`us-${s}`} value={s}>{s}</option>)}
                                </optgroup>
                                <optgroup label="Canada">
                                    {CA_PROVINCES.map((s) => <option key={`ca-${s}`} value={s}>{s}</option>)}
                                </optgroup>
                            </SelectInput>
                        </Field>
                        <Field label="Business Type" required>
                            <SelectInput value={businessType} onChange={(v) => setBusinessType(v as BusinessType)}>
                                {BUSINESS_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                            </SelectInput>
                        </Field>
                    </div>
                )}

                {mode === "legal-address" && (
                    <div className="space-y-5">
                        <Field label="Country">
                            <SelectInput value={legalCountry} onChange={(v) => { setLegalCountry(v as "United States" | "Canada"); setLegalState(""); }}>
                                {ADDRESS_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </SelectInput>
                        </Field>
                        <Field label="Street Address" required>
                            <TextInput value={legalStreet} onChange={setLegalStreet} />
                        </Field>
                        <Field label="Apartment, suite, etc." optional>
                            <TextInput value={legalApt} onChange={setLegalApt} />
                        </Field>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="City" required><TextInput value={legalCity} onChange={setLegalCity} /></Field>
                            <Field label={legalCountry === "Canada" ? "Province" : "State"} required>
                                <SelectInput value={legalState} onChange={setLegalState}>
                                    <option value="">Select…</option>
                                    {legalStateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </SelectInput>
                            </Field>
                        </div>
                        <div className="md:max-w-[200px]">
                            <Field label={legalCountry === "Canada" ? "Postal Code" : "ZIP Code"} required>
                                <TextInput value={legalZip} onChange={setLegalZip} />
                            </Field>
                        </div>
                    </div>
                )}

                {mode === "mailing-address" && (
                    <div className="space-y-5">
                        <Field label="Street Address or PO Box" required>
                            <TextInput value={mailStreet} onChange={setMailStreet} />
                        </Field>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label="City" required><TextInput value={mailCity} onChange={setMailCity} /></Field>
                            <Field label={mailCountry === "Canada" ? "Province" : "State"} required>
                                <SelectInput value={mailState} onChange={setMailState}>
                                    <option value="">Select…</option>
                                    {mailStateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                </SelectInput>
                            </Field>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Field label={mailCountry === "Canada" ? "Postal Code" : "ZIP Code"} required>
                                <TextInput value={mailZip} onChange={setMailZip} />
                            </Field>
                            <Field label="Country" required>
                                <SelectInput value={mailCountry} onChange={(v) => { setMailCountry(v as "United States" | "Canada"); setMailState(""); }}>
                                    {ADDRESS_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </SelectInput>
                            </Field>
                        </div>
                    </div>
                )}

                {mode === "contact" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Field label="Email"><TextInput value={contactEmail} onChange={setContactEmail} type="email" /></Field>
                        <Field label="Phone"><TextInput value={contactPhone} onChange={setContactPhone} /></Field>
                    </div>
                )}

                {mode === "settings" && (
                    <div className="space-y-5">
                        <Field label="Status" required>
                            <SelectInput value={status} onChange={(v) => setStatus(v as ServiceProfileStatus)}>
                                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </SelectInput>
                        </Field>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Account Creation Limit <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-2">
                                <label className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer", unlimited ? "border-violet-300 bg-violet-50/60" : "border-slate-200 hover:bg-slate-50")}>
                                    <input type="radio" checked={unlimited} onChange={() => setUnlimited(true)} className="h-4 w-4 text-violet-600 focus:ring-violet-500" />
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                                            <InfinityIcon size={14} className="text-violet-600" /> Unlimited
                                        </div>
                                        <div className="text-xs text-slate-500">No cap on accounts this profile can create.</div>
                                    </div>
                                </label>
                                <label className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer", !unlimited ? "border-blue-300 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50")}>
                                    <input type="radio" checked={!unlimited} onChange={() => setUnlimited(false)} className="h-4 w-4 text-blue-600 focus:ring-blue-500" />
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="text-sm font-semibold text-slate-900">Custom limit</div>
                                            <div className="text-xs text-slate-500">{profile.accountsCreated} already created — limit must be ≥ that.</div>
                                        </div>
                                        <input
                                            type="number"
                                            min={Math.max(1, profile.accountsCreated)}
                                            value={unlimited ? "" : accountLimit}
                                            disabled={unlimited}
                                            onChange={(e) => setAccountLimit(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="h-9 w-24 px-3 rounded-md border border-slate-200 bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                                        />
                                        <span className="text-xs text-slate-500">accounts</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                    </div>
                )}
            </form>

            <Footer onClose={onClose} onSave={handleSave} />
        </Shell>
    );
}

// ── Shell + Footer + form primitives ───────────────────────────────────────

function Shell({
    title, subtitle, icon: Icon, children, onClose,
}: { title: string; subtitle?: string; icon: React.ElementType; children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-900 truncate">{title}</h2>
                            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Footer({ onClose, onSave, disabled }: { onClose: () => void; onSave?: () => void; disabled?: boolean }) {
    return (
        <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
                {onSave ? "Cancel" : "Close"}
            </button>
            {onSave && (
                <button
                    type="button"
                    onClick={onSave}
                    disabled={disabled}
                    className={cn(
                        "px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm flex items-center gap-2",
                        disabled ? "bg-slate-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                    )}
                >
                    <Save size={16} /> Save Changes
                </button>
            )}
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
function TextInput({ value, onChange, type = "text" }: { value: string; onChange: (v: string) => void; type?: string }) {
    return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />;
}
function SelectInput({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent">{children}</select>;
}
