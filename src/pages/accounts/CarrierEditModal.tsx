import { useEffect, useState } from "react";
import { X, Save, AlertCircle, Building2 } from "lucide-react";
import { type AccountRecord, type AccountStatus, type SafetyRating, type AccountCountry } from "./accounts.data";
import { US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import { cn } from "@/lib/utils";

const STATUSES: AccountStatus[] = ["Active", "Inactive", "Suspended", "Pending"];
const RATINGS: SafetyRating[] = ["Satisfactory", "Conditional", "Unsatisfactory", "Not Rated"];

type Props = {
    account: AccountRecord | null;
    onClose: () => void;
    onSave: (next: AccountRecord) => void;
};

export function CarrierEditModal({ account, onClose, onSave }: Props) {
    const [legalName, setLegalName] = useState("");
    const [dbaName, setDbaName] = useState("");
    const [dotNumber, setDotNumber] = useState("");
    const [cvorNumber, setCvorNumber] = useState("");
    const [nscNumber, setNscNumber] = useState("");
    const [rinNumber, setRinNumber] = useState("");
    const [status, setStatus] = useState<AccountStatus>("Active");
    const [safetyRating, setSafetyRating] = useState<SafetyRating>("Not Rated");
    const [country, setCountry] = useState<AccountCountry>("US");
    const [city, setCity] = useState("");
    const [state, setState] = useState("");
    const [drivers, setDrivers] = useState<number>(0);
    const [assets, setAssets] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!account) return;
        setLegalName(account.legalName);
        setDbaName(account.dbaName);
        setDotNumber(account.dotNumber);
        setCvorNumber(account.cvorNumber);
        setNscNumber(account.nscNumber);
        setRinNumber(account.rinNumber);
        setStatus(account.status);
        setSafetyRating(account.safetyRating);
        setCountry(account.country);
        setCity(account.city);
        setState(account.state);
        setDrivers(account.drivers);
        setAssets(account.assets);
        setError(null);

        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [account, onClose]);

    if (!account) return null;

    const stateOptions = country === "CA" ? CA_PROVINCES : US_STATES;
    const isValid = legalName.trim().length > 0 && city.trim().length > 0 && !!state;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) { setError("Please complete all required fields."); return; }
        onSave({
            ...account,
            legalName: legalName.trim(),
            dbaName: dbaName.trim(),
            dotNumber: dotNumber.trim(),
            cvorNumber: cvorNumber.trim(),
            nscNumber: nscNumber.trim(),
            rinNumber: rinNumber.trim(),
            status, safetyRating, country, city: city.trim(), state, drivers, assets,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative z-10 w-full max-w-2xl max-h-[90vh] flex flex-col bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Edit Carrier</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{account.legalName}</p>
                    </div>
                    <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100" aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                        <Section title="Identity">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Field label="Legal Name" required><TextInput value={legalName} onChange={setLegalName} /></Field>
                                <Field label="DBA Name"><TextInput value={dbaName} onChange={setDbaName} /></Field>
                                <Field label="DOT Number"><TextInput value={dotNumber} onChange={setDotNumber} /></Field>
                                <Field label="CVOR Number"><TextInput value={cvorNumber} onChange={setCvorNumber} /></Field>
                                <Field label="NSC Number"><TextInput value={nscNumber} onChange={setNscNumber} /></Field>
                                <Field label="RIN Number"><TextInput value={rinNumber} onChange={setRinNumber} /></Field>
                            </div>
                        </Section>

                        <Section title="Location">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <Field label="Country" required>
                                    <SelectInput value={country} onChange={(v) => { setCountry(v as AccountCountry); setState(""); }}>
                                        <option value="US">United States</option>
                                        <option value="CA">Canada</option>
                                    </SelectInput>
                                </Field>
                                <Field label="City" required><TextInput value={city} onChange={setCity} /></Field>
                                <Field label={country === "CA" ? "Province" : "State"} required>
                                    <SelectInput value={state} onChange={setState}>
                                        <option value="">Select…</option>
                                        {stateOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </SelectInput>
                                </Field>
                            </div>
                        </Section>

                        <Section title="Status & Counts">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                                <Field label="Status">
                                    <SelectInput value={status} onChange={(v) => setStatus(v as AccountStatus)}>
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </SelectInput>
                                </Field>
                                <Field label="Safety Rating">
                                    <SelectInput value={safetyRating} onChange={(v) => setSafetyRating(v as SafetyRating)}>
                                        {RATINGS.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </SelectInput>
                                </Field>
                                <Field label="Drivers">
                                    <NumberInput value={drivers} onChange={setDrivers} />
                                </Field>
                                <Field label="Assets">
                                    <NumberInput value={assets} onChange={setAssets} />
                                </Field>
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
                <span className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center"><Building2 size={14} className="text-blue-600" /></span>
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
function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />;
}
function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
    return <input type="number" min={0} value={value} onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent" />;
}
function SelectInput({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent">{children}</select>;
}
