import { useEffect, useState } from "react";
import { X, Save, AlertCircle, Briefcase } from "lucide-react";
import {
    BUSINESS_TYPES, ACCOUNT_LIMIT_UNLIMITED, isUnlimitedLimit,
    type ServiceProfile, type BusinessType, type ServiceProfileStatus,
} from "./service-profiles.data";
import { US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    profile: ServiceProfile | null;
    onClose: () => void;
    onSave: (next: ServiceProfile) => void;
};

const STATUSES: ServiceProfileStatus[] = ["Active", "Inactive", "Pending", "Suspended"];

export function ServiceProfileEditModal({ profile, onClose, onSave }: Props) {
    const [legalName, setLegalName] = useState("");
    const [dbaName, setDbaName] = useState("");
    const [stateOfInc, setStateOfInc] = useState("");
    const [businessType, setBusinessType] = useState<BusinessType>("LLC");
    const [status, setStatus] = useState<ServiceProfileStatus>("Active");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [unlimited, setUnlimited] = useState(true);
    const [accountLimit, setAccountLimit] = useState<number>(10);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profile) return;
        setLegalName(profile.legalName);
        setDbaName(profile.dbaName ?? "");
        setStateOfInc(profile.stateOfInc);
        setBusinessType(profile.businessType);
        setStatus(profile.status);
        setContactEmail(profile.contactEmail ?? "");
        setContactPhone(profile.contactPhone ?? "");
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

    const isValid = legalName.trim().length > 0 && !!stateOfInc && !!businessType && (unlimited || accountLimit >= 1);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) { setError("Please complete all required fields."); return; }
        if (!unlimited && accountLimit < profile.accountsCreated) {
            setError(`Limit cannot be lower than the ${profile.accountsCreated} accounts already created.`);
            return;
        }
        onSave({
            ...profile,
            legalName: legalName.trim(),
            dbaName: dbaName.trim() || undefined,
            stateOfInc, businessType, status,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
            accountLimit: unlimited ? ACCOUNT_LIMIT_UNLIMITED : accountLimit,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Edit Service Profile</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{profile.legalName}</p>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                        <Section title="General">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Legal Name" required>
                                    <TextInput value={legalName} onChange={setLegalName} />
                                </Field>
                                <Field label="DBA">
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
                                <Field label="Status" required>
                                    <SelectInput value={status} onChange={(v) => setStatus(v as ServiceProfileStatus)}>
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </SelectInput>
                                </Field>
                            </div>
                        </Section>

                        <Section title="Contact">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Email"><TextInput value={contactEmail} onChange={setContactEmail} type="email" /></Field>
                                <Field label="Phone"><TextInput value={contactPhone} onChange={setContactPhone} /></Field>
                            </div>
                        </Section>

                        <Section title="Account Creation Limit">
                            <div className="space-y-2">
                                <label className={cn("flex items-center gap-3 p-3 rounded-lg border cursor-pointer", unlimited ? "border-violet-300 bg-violet-50/60" : "border-slate-200 hover:bg-slate-50")}>
                                    <input type="radio" checked={unlimited} onChange={() => setUnlimited(true)} className="h-4 w-4 text-violet-600 focus:ring-violet-500" />
                                    <div className="flex-1">
                                        <div className="text-sm font-semibold text-slate-900">Unlimited</div>
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
                        </Section>

                        {error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
                            </div>
                        )}
                    </div>

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
                <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center"><Briefcase size={14} className="text-blue-600" /></span>
                <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            </div>
            {children}
        </section>
    );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
                {label}{required && <span className="text-red-500 ml-0.5">*</span>}
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
