import { useEffect, useMemo, useState } from "react";
import {
    X, Save, AlertCircle, Briefcase, MapPin, Mail, Settings, Lock,
    Infinity as InfinityIcon,
} from "lucide-react";
import {
    BUSINESS_TYPES, ACCOUNT_LIMIT_UNLIMITED, isUnlimitedLimit,
    type ServiceProfile, type BusinessType, type ServiceProfileStatus,
} from "./service-profiles.data";
import { ADDRESS_COUNTRIES, US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import { type AppUser } from "@/data/users.data";
import { cn } from "@/lib/utils";

type Props = {
    profile: ServiceProfile | null;
    currentUser?: AppUser | null;
    onClose: () => void;
    onSave: (next: ServiceProfile) => void;
};

const STATUSES: ServiceProfileStatus[] = ["Active", "Inactive", "Pending", "Suspended"];

export function ServiceProfileEditModal({ profile, currentUser, onClose, onSave }: Props) {
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

    // Mailing Address
    const [mailStreet, setMailStreet] = useState("");
    const [mailCity, setMailCity] = useState("");
    const [mailState, setMailState] = useState("");
    const [mailZip, setMailZip] = useState("");
    const [mailCountry, setMailCountry] = useState<"United States" | "Canada">("United States");
    const [sameAsLegal, setSameAsLegal] = useState(false);

    // Contact
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    // Settings (super-admin-only)
    const [status, setStatus] = useState<ServiceProfileStatus>("Active");
    const [unlimited, setUnlimited] = useState(true);
    const [accountLimit, setAccountLimit] = useState<number>(10);

    const [error, setError] = useState<string | null>(null);

    const isSuperAdmin = currentUser?.role === "super-admin";
    const canEditSettings = isSuperAdmin; // admins cannot change status / limit

    const legalStateOptions = useMemo(
        () => (legalCountry === "Canada" ? CA_PROVINCES : US_STATES),
        [legalCountry]
    );
    const mailStateOptions = useMemo(
        () => (mailCountry === "Canada" ? CA_PROVINCES : US_STATES),
        [mailCountry]
    );

    useEffect(() => {
        if (!profile) return;
        // Identity
        setLegalName(profile.legalName);
        setDbaName(profile.dbaName ?? "");
        setStateOfInc(profile.stateOfInc);
        setBusinessType(profile.businessType);
        // Legal address
        setLegalCountry(profile.legalAddress.country);
        setLegalStreet(profile.legalAddress.street);
        setLegalApt(profile.legalAddress.apt ?? "");
        setLegalCity(profile.legalAddress.city);
        setLegalState(profile.legalAddress.state);
        setLegalZip(profile.legalAddress.zip);
        // Mailing
        setMailStreet(profile.mailingAddress.streetOrPoBox);
        setMailCity(profile.mailingAddress.city);
        setMailState(profile.mailingAddress.state);
        setMailZip(profile.mailingAddress.zip);
        setMailCountry(profile.mailingAddress.country);
        setSameAsLegal(false);
        // Contact
        setContactEmail(profile.contactEmail ?? "");
        setContactPhone(profile.contactPhone ?? "");
        // Settings
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
    }, [profile, onClose]);

    if (!profile) return null;

    const copyLegalToMailing = () => {
        setMailStreet(legalApt ? `${legalStreet}, ${legalApt}` : legalStreet);
        setMailCity(legalCity);
        setMailState(legalState);
        setMailZip(legalZip);
        setMailCountry(legalCountry);
    };

    const onToggleSameAsLegal = (checked: boolean) => {
        setSameAsLegal(checked);
        if (checked) copyLegalToMailing();
    };

    const isValid =
        legalName.trim().length > 0 &&
        !!stateOfInc &&
        !!businessType &&
        legalStreet.trim().length > 0 &&
        legalCity.trim().length > 0 &&
        !!legalState &&
        legalZip.trim().length > 0 &&
        mailStreet.trim().length > 0 &&
        mailCity.trim().length > 0 &&
        !!mailState &&
        mailZip.trim().length > 0 &&
        (unlimited || accountLimit >= 1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) { setError("Please complete all required fields."); return; }
        if (canEditSettings && !unlimited && accountLimit < profile.accountsCreated) {
            setError(`Limit cannot be lower than the ${profile.accountsCreated} accounts already created.`);
            return;
        }
        onSave({
            ...profile,
            legalName: legalName.trim(),
            dbaName: dbaName.trim() || undefined,
            stateOfInc, businessType,
            legalAddress: {
                country: legalCountry,
                street: legalStreet.trim(),
                apt: legalApt.trim() || undefined,
                city: legalCity.trim(),
                state: legalState,
                zip: legalZip.trim(),
            },
            mailingAddress: {
                streetOrPoBox: mailStreet.trim(),
                city: mailCity.trim(),
                state: mailState,
                zip: mailZip.trim(),
                country: mailCountry,
            },
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            // Settings — only updated by super admin; admins keep the existing values
            status: canEditSettings ? status : profile.status,
            accountLimit: canEditSettings
                ? (unlimited ? ACCOUNT_LIMIT_UNLIMITED : accountLimit)
                : profile.accountLimit,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                {/* Sticky header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-900 truncate">Edit Service Profile</h2>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{profile.legalName}</p>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Admin scope hint */}
                {!isSuperAdmin && (
                    <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 inline-flex items-center gap-2">
                        <Lock size={13} className="text-amber-700" />
                        You can update identity, address, and contact info. <span className="font-semibold">Status and Account Creation Limit are managed by Super Admins.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                        {/* §1 Identity */}
                        <Section icon={Briefcase} title="Identity" subtitle="Legal name, DBA, and incorporation.">
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
                        </Section>

                        {/* §2 Legal/Main Address */}
                        <Section icon={MapPin} title="Legal / Main Address" subtitle="Primary business location.">
                            <div className="space-y-5">
                                <Field label="Country">
                                    <SelectInput
                                        value={legalCountry}
                                        onChange={(v) => { setLegalCountry(v as "United States" | "Canada"); setLegalState(""); }}
                                    >
                                        {ADDRESS_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                    </SelectInput>
                                </Field>
                                <Field label="Street Address" required>
                                    <TextInput value={legalStreet} onChange={setLegalStreet} placeholder="1200 North Dupont Highway" />
                                </Field>
                                <Field label="Apartment, suite, etc." optional>
                                    <TextInput value={legalApt} onChange={setLegalApt} />
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="City" required>
                                        <TextInput value={legalCity} onChange={setLegalCity} />
                                    </Field>
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
                        </Section>

                        {/* §3 Mailing Address */}
                        <Section
                            icon={Mail}
                            title="Mailing Address"
                            subtitle="Where official correspondence is sent."
                            right={
                                <label className="inline-flex items-center gap-2 cursor-pointer text-xs">
                                    <input
                                        type="checkbox"
                                        checked={sameAsLegal}
                                        onChange={(e) => onToggleSameAsLegal(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="font-semibold text-slate-700">Same as Legal</span>
                                </label>
                            }
                        >
                            <div className="space-y-5">
                                <Field label="Street Address or PO Box" required>
                                    <TextInput value={mailStreet} onChange={setMailStreet} placeholder="PO Box 8890" />
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="City" required>
                                        <TextInput value={mailCity} onChange={setMailCity} />
                                    </Field>
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
                                        <SelectInput
                                            value={mailCountry}
                                            onChange={(v) => { setMailCountry(v as "United States" | "Canada"); setMailState(""); }}
                                        >
                                            {ADDRESS_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </SelectInput>
                                    </Field>
                                </div>
                            </div>
                        </Section>

                        {/* §4 Contact */}
                        <Section icon={Mail} title="Contact" subtitle="Primary email and phone.">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Email"><TextInput value={contactEmail} onChange={setContactEmail} type="email" /></Field>
                                <Field label="Phone"><TextInput value={contactPhone} onChange={setContactPhone} /></Field>
                            </div>
                        </Section>

                        {/* §5 Settings — locked for admins */}
                        <Section
                            icon={Settings}
                            title="Status & Limits"
                            subtitle={canEditSettings
                                ? "Activate / suspend the profile and cap how many carrier accounts it can create."
                                : "Read-only — these settings are controlled by Super Admins."}
                            locked={!canEditSettings}
                        >
                            <div className="space-y-5">
                                {/* Status */}
                                <Field label="Status" required>
                                    {canEditSettings ? (
                                        <SelectInput value={status} onChange={(v) => setStatus(v as ServiceProfileStatus)}>
                                            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                        </SelectInput>
                                    ) : (
                                        <ReadOnlyValue value={profile.status} />
                                    )}
                                </Field>

                                {/* Account Limit */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Account Creation Limit <span className="text-red-500">*</span>
                                    </label>
                                    {canEditSettings ? (
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
                                    ) : (
                                        <ReadOnlyValue
                                            value={
                                                isUnlimitedLimit(profile.accountLimit)
                                                    ? "Unlimited"
                                                    : `${profile.accountsCreated} of ${profile.accountLimit} used`
                                            }
                                            icon={isUnlimitedLimit(profile.accountLimit) ? InfinityIcon : undefined}
                                            tone={isUnlimitedLimit(profile.accountLimit) ? "violet" : "slate"}
                                        />
                                    )}
                                </div>
                            </div>
                        </Section>

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}
                    </div>

                    {/* Sticky footer */}
                    <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={!isValid} className={cn("px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm flex items-center gap-2", isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed")}>
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Building blocks ────────────────────────────────────────────────────────

function Section({
    icon: Icon, title, subtitle, right, children, locked,
}: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    locked?: boolean;
}) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-slate-50/60 border-b border-slate-100">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        locked ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-600"
                    )}>
                        <Icon size={15} />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 inline-flex items-center gap-1.5 truncate">
                            {title}
                            {locked && <Lock size={11} className="text-slate-400" />}
                        </h3>
                        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{subtitle}</p>}
                    </div>
                </div>
                {right}
            </div>
            <div className="p-5">{children}</div>
        </section>
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

function TextInput({ value, onChange, type = "text", placeholder }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
    return (
        <input
            type={type}
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

function ReadOnlyValue({ value, icon: Icon, tone = "slate" }: { value: string; icon?: React.ElementType; tone?: "slate" | "violet" }) {
    const map = {
        slate: "bg-slate-50 border-slate-200 text-slate-700",
        violet: "bg-violet-50 border-violet-200 text-violet-700",
    };
    return (
        <div className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium", map[tone])}>
            {Icon && <Icon size={14} />} {value}
        </div>
    );
}
