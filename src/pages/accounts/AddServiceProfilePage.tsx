import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowLeft, Building2, Save, Plus, Trash2, MapPin, Mail, Briefcase,
    Settings, Infinity as InfinityIcon, Check,
} from "lucide-react";
import {
    BUSINESS_TYPES,
    ACCOUNT_LIMIT_UNLIMITED,
    type BusinessType,
    type OfficeLocation,
} from "./service-profiles.data";
import { ADDRESS_COUNTRIES, US_STATES, CA_PROVINCES } from "@/pages/inventory/inventory.data";
import { cn } from "@/lib/utils";

type Props = {
    onNavigate: (path: string) => void;
};

// Sections shown in both the left scroll-spy nav and the right pane
const SECTIONS = [
    { id: "general", label: "General Information",        icon: Briefcase },
    { id: "legal",   label: "Legal / Main Address",       icon: MapPin },
    { id: "mailing", label: "Mailing Address",            icon: Mail },
    { id: "offices", label: "Corporate Office Locations", icon: Building2 },
    { id: "settings",label: "Settings",                   icon: Settings },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

export function AddServiceProfilePage({ onNavigate }: Props) {
    // §1 General
    const [legalName, setLegalName] = useState("");
    const [dbaName, setDbaName] = useState("");
    const [stateOfInc, setStateOfInc] = useState("");
    const [businessType, setBusinessType] = useState<BusinessType>("LLC");

    // §2 Legal Address
    const [legalCountry, setLegalCountry] = useState<"United States" | "Canada">("United States");
    const [legalStreet, setLegalStreet] = useState("");
    const [legalApt, setLegalApt] = useState("");
    const [legalCity, setLegalCity] = useState("");
    const [legalState, setLegalState] = useState("");
    const [legalZip, setLegalZip] = useState("");

    // §3 Mailing Address
    const [mailStreet, setMailStreet] = useState("");
    const [mailCity, setMailCity] = useState("");
    const [mailState, setMailState] = useState("");
    const [mailZip, setMailZip] = useState("");
    const [mailCountry, setMailCountry] = useState<"United States" | "Canada">("United States");
    const [sameAsLegal, setSameAsLegal] = useState(false);

    // §4 Offices
    const [offices, setOffices] = useState<OfficeLocation[]>([
        { id: `loc-${Date.now()}`, label: "", address: "", city: "", state: "" },
    ]);

    // §5 Settings
    const [unlimited, setUnlimited] = useState(true);
    const [accountLimit, setAccountLimit] = useState<number>(10);
    const [contactEmail, setContactEmail] = useState("");
    const [contactPhone, setContactPhone] = useState("");

    // Scroll-spy
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
        general: null, legal: null, mailing: null, offices: null, settings: null,
    });
    const [activeSection, setActiveSection] = useState<SectionId>("general");

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const onScroll = () => {
            const top = container.scrollTop + 120;
            let current: SectionId = "general";
            for (const s of SECTIONS) {
                const el = sectionRefs.current[s.id];
                if (el && el.offsetTop <= top) current = s.id;
            }
            setActiveSection(current);
        };
        container.addEventListener("scroll", onScroll);
        return () => container.removeEventListener("scroll", onScroll);
    }, []);

    const scrollToSection = (id: SectionId) => {
        const el = sectionRefs.current[id];
        const container = scrollRef.current;
        if (el && container) {
            container.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
        }
    };

    // Per-section "is filled" hints for the left nav badges
    const completionFor = (id: SectionId): number => {
        switch (id) {
            case "general": return [legalName, stateOfInc, businessType].filter(Boolean).length;
            case "legal":   return [legalStreet, legalCity, legalState, legalZip].filter(Boolean).length;
            case "mailing": return [mailStreet, mailCity, mailState, mailZip].filter(Boolean).length;
            case "offices": return offices.filter((o) => o.label.trim() && o.address.trim()).length;
            case "settings":return (unlimited || accountLimit >= 1) ? 1 : 0;
        }
    };

    // ── Address helpers ────────────────────────────────────────────────────

    const legalStateOptions = useMemo(
        () => (legalCountry === "Canada" ? CA_PROVINCES : US_STATES),
        [legalCountry]
    );
    const mailStateOptions = useMemo(
        () => (mailCountry === "Canada" ? CA_PROVINCES : US_STATES),
        [mailCountry]
    );

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

    // Office helpers
    const addOffice = () =>
        setOffices((prev) => [...prev, { id: `loc-${Date.now()}-${prev.length}`, label: "", address: "", city: "", state: "" }]);
    const updateOffice = (idx: number, patch: Partial<OfficeLocation>) =>
        setOffices((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
    const removeOffice = (idx: number) =>
        setOffices((prev) => prev.filter((_, i) => i !== idx));

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

    const handleCancel = () => onNavigate("/accounts");

    const handleSave = () => {
        if (!isValid) return;
        const payload = {
            legalName: legalName.trim(),
            dbaName: dbaName.trim() || undefined,
            stateOfInc, businessType,
            legalAddress: {
                country: legalCountry, street: legalStreet.trim(),
                apt: legalApt.trim() || undefined,
                city: legalCity.trim(), state: legalState, zip: legalZip.trim(),
            },
            mailingAddress: {
                streetOrPoBox: mailStreet.trim(), city: mailCity.trim(),
                state: mailState, zip: mailZip.trim(), country: mailCountry,
            },
            officeLocations: offices.filter((o) => o.label.trim() && o.address.trim()),
            accountLimit: unlimited ? ACCOUNT_LIMIT_UNLIMITED : accountLimit,
            contactEmail: contactEmail.trim() || undefined,
            contactPhone: contactPhone.trim() || undefined,
        };
        console.log("New service profile:", payload);
        onNavigate("/accounts");
    };

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-900">
            {/* Page Header */}
            <div className="px-6 pt-6 pb-5 bg-white border-b border-slate-200/60 shadow-sm">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Accounts
                    </button>
                </div>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add Service Profile</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Create a parent service organization that can own and manage multiple carrier accounts.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3 shrink-0">
                        <button
                            onClick={handleCancel}
                            className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isValid}
                            className={cn(
                                "px-5 py-2.5 text-sm font-bold text-white rounded-lg shadow-md transition-colors flex items-center gap-2",
                                isValid ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed"
                            )}
                        >
                            <Save className="w-4 h-4" /> Save Profile
                        </button>
                    </div>
                </div>
            </div>

            {/* Two-pane Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Side navigation */}
                <aside className="w-72 shrink-0 border-r border-slate-200 bg-white hidden md:flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">Complete each section</p>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                        {SECTIONS.map((s, idx) => {
                            const Icon = s.icon;
                            const isActive = activeSection === s.id;
                            const count = completionFor(s.id);
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => scrollToSection(s.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                                        isActive
                                            ? "bg-blue-50 text-blue-700 ring-1 ring-blue-500/30"
                                            : "text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                                            isActive
                                                ? "bg-blue-600 text-white"
                                                : count > 0
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-slate-100 text-slate-500"
                                        )}
                                    >
                                        {count > 0 && !isActive ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                    </span>
                                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-blue-600" : "text-slate-400")} />
                                    <span className="flex-1 text-sm font-semibold">{s.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={cn(
                                                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                                isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                                            )}
                                        >
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main content scroll */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

                        {/* §1 GENERAL INFORMATION */}
                        <section
                            ref={(el) => { sectionRefs.current.general = el; }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={Briefcase}
                                title="General Information"
                                subtitle="Identity, incorporation, and primary contact."
                            />
                            <div className="px-6 py-5 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="Legal Name" required>
                                        <TextInput value={legalName} onChange={setLegalName} placeholder="e.g. TrackSmart Fleet Services LLC" />
                                    </Field>
                                    <Field label="DBA Name" optional>
                                        <TextInput value={dbaName} onChange={setDbaName} placeholder="e.g. TrackSmart" />
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

                                {/* Contact info moved here from Settings */}
                                <div className="border-t border-slate-100 pt-5">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                                        Primary Contact
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <Field label="Contact Email" optional>
                                            <TextInput value={contactEmail} onChange={setContactEmail} type="email" placeholder="ops@company.com" />
                                        </Field>
                                        <Field label="Contact Phone" optional>
                                            <TextInput value={contactPhone} onChange={setContactPhone} placeholder="(555) 555-0100" />
                                        </Field>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* §2 LEGAL / MAIN ADDRESS */}
                        <section
                            ref={(el) => { sectionRefs.current.legal = el; }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader icon={MapPin} title="Legal / Main Address" subtitle="Primary business location." />
                            <div className="px-6 py-5 space-y-5">
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
                                    <TextInput value={legalApt} onChange={setLegalApt} placeholder="(Optional)" />
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="City" required>
                                        <TextInput value={legalCity} onChange={setLegalCity} placeholder="Wilmington" />
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
                                        <TextInput
                                            value={legalZip}
                                            onChange={setLegalZip}
                                            placeholder={legalCountry === "Canada" ? "K1A 0B1" : "19801"}
                                        />
                                    </Field>
                                </div>
                            </div>
                        </section>

                        {/* §3 MAILING ADDRESS */}
                        <section
                            ref={(el) => { sectionRefs.current.mailing = el; }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
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
                            />
                            <div className="px-6 py-5 space-y-5">
                                <Field label="Street Address or PO Box" required>
                                    <TextInput value={mailStreet} onChange={setMailStreet} placeholder="PO Box 8890" />
                                </Field>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <Field label="City" required>
                                        <TextInput value={mailCity} onChange={setMailCity} placeholder="Wilmington" />
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
                                        <TextInput
                                            value={mailZip}
                                            onChange={setMailZip}
                                            placeholder={mailCountry === "Canada" ? "K1A 0B1" : "19899"}
                                        />
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
                        </section>

                        {/* §4 CORPORATE OFFICE LOCATIONS */}
                        <section
                            ref={(el) => { sectionRefs.current.offices = el; }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={Building2}
                                title="Corporate Office Locations"
                                subtitle="Add one or more office locations operated under this service profile."
                                right={
                                    <button
                                        type="button"
                                        onClick={addOffice}
                                        className="h-8 px-3 rounded-md border border-blue-200 bg-white text-blue-600 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-blue-50"
                                    >
                                        <Plus size={12} /> Add Office
                                    </button>
                                }
                            />
                            <div className="px-6 py-5 space-y-3">
                                {offices.length === 0 ? (
                                    <div className="border-2 border-dashed border-slate-200 rounded-lg h-24 flex items-center justify-center text-slate-400 text-sm">
                                        No office locations. Click "+ Add Office" to add one.
                                    </div>
                                ) : (
                                    offices.map((o, i) => (
                                        <div key={o.id} className="bg-slate-50/40 border border-slate-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                    Office #{i + 1}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOffice(i)}
                                                    className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    aria-label="Remove office"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <Field label="Label" optional>
                                                    <TextInput value={o.label} onChange={(v) => updateOffice(i, { label: v })} placeholder="e.g. Houston Branch" />
                                                </Field>
                                                <Field label="Street Address" optional>
                                                    <TextInput value={o.address} onChange={(v) => updateOffice(i, { address: v })} placeholder="500 Energy Pkwy" />
                                                </Field>
                                                <Field label="City" optional>
                                                    <TextInput value={o.city} onChange={(v) => updateOffice(i, { city: v })} placeholder="Houston" />
                                                </Field>
                                                <Field label="State / Province" optional>
                                                    <TextInput value={o.state} onChange={(v) => updateOffice(i, { state: v })} placeholder="TX" />
                                                </Field>
                                                <Field label="Contact Name" optional>
                                                    <TextInput value={o.contactName ?? ""} onChange={(v) => updateOffice(i, { contactName: v })} placeholder="Jane Smith" />
                                                </Field>
                                                <Field label="Phone" optional>
                                                    <TextInput value={o.phone ?? ""} onChange={(v) => updateOffice(i, { phone: v })} placeholder="(555) 555-0100" />
                                                </Field>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* §5 SETTINGS */}
                        <section
                            ref={(el) => { sectionRefs.current.settings = el; }}
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader icon={Settings} title="Settings" subtitle="Account creation limit and primary contact." />
                            <div className="px-6 py-5 space-y-5">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Account Creation Limit <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2">
                                        <label className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                            unlimited ? "border-violet-300 bg-violet-50/60" : "border-slate-200 hover:bg-slate-50"
                                        )}>
                                            <input
                                                type="radio"
                                                checked={unlimited}
                                                onChange={() => setUnlimited(true)}
                                                className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                                            />
                                            <div className="flex-1">
                                                <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-1.5">
                                                    <InfinityIcon size={14} className="text-violet-600" /> Unlimited
                                                </div>
                                                <div className="text-xs text-slate-500">No limit on the number of carrier accounts this service profile can create.</div>
                                            </div>
                                        </label>
                                        <label className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                            !unlimited ? "border-blue-300 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"
                                        )}>
                                            <input
                                                type="radio"
                                                checked={!unlimited}
                                                onChange={() => setUnlimited(false)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1 flex items-center gap-3">
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-slate-900">Custom limit</div>
                                                    <div className="text-xs text-slate-500">Cap the number of carrier accounts this service profile can create.</div>
                                                </div>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={unlimited ? "" : accountLimit}
                                                    disabled={unlimited}
                                                    onChange={(e) => setAccountLimit(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="h-9 w-24 px-3 rounded-md border border-slate-200 bg-white text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
                                                    placeholder="10"
                                                />
                                                <span className="text-xs text-slate-500">accounts</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── SectionHeader (mirrors AddAccountPage's pattern exactly) ───────────────

function SectionHeader({
    icon: Icon, title, subtitle, right,
}: { icon: React.ElementType; title: string; subtitle?: string; right?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/60 border-b border-slate-100">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                </div>
                <div>
                    <h4 className="text-base font-bold text-slate-900">{title}</h4>
                    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {right}
        </div>
    );
}

function Field({
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
