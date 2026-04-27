import React, { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft,
    Save,
    ChevronDown,
    BadgeCheck,
    Globe,
    Building2,
    ShieldCheck,
    MapPin,
    Mail,
    Package,
    Users,
    Plus,
    Trash2,
    Search,
    Check,
} from 'lucide-react';
import { UI_DATA, DIRECTOR_UI } from '../profile/carrier-profile.data';
import {
    addAccountRecord,
    type AccountRecord,
    type AccountStatus,
    type AccountCountry,
    type SafetyRating,
} from './accounts.data';

// ── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 10);
const cn = (...x: (string | boolean | null | undefined)[]) =>
    x.filter(Boolean).join(' ');

interface OfficeEntry {
    id: string;
    label: string;
    address: string;
    contact: string;
    phone: string;
}

interface DirectorEntry {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    stockClass: string;
    ownershipPct: string;
    dateAppointed: string;
    dateResigned: string;
    responsibility: string;
}

interface AddAccountPageProps {
    onNavigate?: (path: string) => void;
}

// ── Status pill dropdown (top-right of section / modal header) ─────────────

const STATUS_OPTIONS = ['Active', 'Inactive', 'Suspended', 'Pending'] as const;

const statusTone = (s: string) =>
    s === 'Active'    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
    s === 'Inactive'  ? 'bg-slate-100 border-slate-200 text-slate-600'      :
    s === 'Suspended' ? 'bg-rose-50 border-rose-200 text-rose-700'          :
    s === 'Pending'   ? 'bg-amber-50 border-amber-200 text-amber-700'       :
                        'bg-slate-100 border-slate-200 text-slate-600';

const statusDot = (s: string) =>
    s === 'Active'    ? 'bg-emerald-500' :
    s === 'Inactive'  ? 'bg-slate-400'   :
    s === 'Suspended' ? 'bg-rose-500'    :
    s === 'Pending'   ? 'bg-amber-500'   :
                        'bg-slate-400';

export const StatusSelect = ({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) => (
    <div className="relative">
        <span
            className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none',
                statusDot(value)
            )}
        />
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                'appearance-none border rounded-md pl-6 pr-7 py-1.5 text-xs font-bold cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors',
                statusTone(value)
            )}
        >
            {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-60 pointer-events-none" />
    </div>
);

// ── Section header (used inside each section card) ──────────────────────────

const SectionHeader = ({
    icon: Icon,
    title,
    subtitle,
    right,
}: {
    icon: any;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) => (
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

// ── Field renderer (same primitives as CarrierProfilePage GenericEditModal) ─

interface FieldRendererProps {
    field: any;
    value: any;
    onChange: (v: any) => void;
    error?: boolean;
    dotLookup?: {
        state: 'idle' | 'loading' | 'success' | 'error';
        msg: string;
        onLookup: (dot: string) => void;
    };
}

const FieldRenderer = ({ field, value, onChange, error, dotLookup }: FieldRendererProps) => {
    const baseCls = cn(
        'w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow',
        error ? 'border-red-300 focus:ring-red-200' : 'border-slate-300'
    );

    if (['text', 'number', 'date', 'email', 'tel'].includes(field.type)) {
        return (
            <input
                type={field.type}
                className={baseCls}
                placeholder={field.placeholder}
                value={value ?? ''}
                onChange={(e) =>
                    onChange(field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)
                }
            />
        );
    }

    if (field.type === 'dotLookup' && dotLookup) {
        return (
            <div>
                <div className="flex items-stretch gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        className={cn(baseCls, 'font-mono flex-1')}
                        placeholder={field.placeholder || 'Enter DOT #'}
                        value={value ?? ''}
                        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
                    />
                    <button
                        type="button"
                        onClick={() => dotLookup.onLookup(String(value ?? ''))}
                        disabled={dotLookup.state === 'loading' || !value}
                        className={cn(
                            'px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors',
                            dotLookup.state === 'loading'
                                ? 'bg-slate-100 text-slate-500 cursor-wait'
                                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed'
                        )}
                    >
                        {dotLookup.state === 'loading' ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                                    <path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
                                </svg>
                                Looking up…
                            </>
                        ) : (
                            <>
                                <Globe className="w-4 h-4" /> Lookup
                            </>
                        )}
                    </button>
                </div>
                {field.helperText && dotLookup.state === 'idle' && (
                    <p className="text-xs text-slate-500 mt-1">{field.helperText}</p>
                )}
                {dotLookup.msg && (
                    <p className={cn(
                        'text-xs mt-1 flex items-center gap-1.5',
                        dotLookup.state === 'success' ? 'text-emerald-600' :
                        dotLookup.state === 'error'   ? 'text-red-600'     : 'text-slate-500'
                    )}>
                        {dotLookup.state === 'success' && <BadgeCheck className="w-3.5 h-3.5" />}
                        {dotLookup.msg}
                    </p>
                )}
            </div>
        );
    }

    if (field.type === 'select') {
        return (
            <div className="relative">
                <select
                    className={cn(baseCls, 'appearance-none bg-white pr-8')}
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                >
                    <option value="">Select...</option>
                    {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
        );
    }

    if (field.type === 'radioCards') {
        return (
            <div className="space-y-3">
                {field.options.map((opt: any) => (
                    <div
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            'p-3 border rounded-lg cursor-pointer flex items-center gap-3 transition-all',
                            value === opt.value
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        )}
                    >
                        <div className={cn(
                            'w-4 h-4 rounded-full border flex items-center justify-center',
                            value === opt.value ? 'border-blue-600' : 'border-slate-300'
                        )}>
                            {value === opt.value && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{opt.value}</span>
                    </div>
                ))}
            </div>
        );
    }

    if (field.type === 'radioList') {
        return (
            <div className="space-y-2">
                {field.options.map((opt: string) => (
                    <label key={opt} className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input
                            type="radio"
                            className="mt-1 text-blue-600 focus:ring-blue-500"
                            checked={value === opt}
                            onChange={() => onChange(opt)}
                        />
                        <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (field.type === 'textarea') {
        return (
            <textarea
                className={cn(baseCls, 'resize-y min-h-[96px]')}
                rows={field.rows ?? 4}
                placeholder={field.placeholder}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
            />
        );
    }

    return null;
};

// ── Section grid (layout rows → form fields) ────────────────────────────────

interface SectionGridProps {
    fields: any[];
    layout: readonly (readonly string[])[] | string[][];
    values: Record<string, any>;
    onChange: (key: string, value: any) => void;
    errors: Record<string, boolean>;
    dotLookup?: FieldRendererProps['dotLookup'];
}

const SectionGrid = ({ fields, layout, values, onChange, errors, dotLookup }: SectionGridProps) => (
    <div className="p-6 space-y-6">
        {(layout as any as string[][]).map((row, rowIndex) => (
            <div
                key={rowIndex}
                className={cn('grid gap-6', row.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1')}
            >
                {row.map((fieldKey) => {
                    const field = fields.find((f: any) => f.key === fieldKey);
                    if (!field) return null;
                    return (
                        <div key={fieldKey}>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            <FieldRenderer
                                field={field}
                                value={values[fieldKey]}
                                onChange={(v) => onChange(fieldKey, v)}
                                error={errors[fieldKey]}
                                dotLookup={fieldKey === 'dotNumber' ? dotLookup : undefined}
                            />
                            {errors[fieldKey] && (
                                <p className="text-xs text-red-500 mt-1">This field is required.</p>
                            )}
                        </div>
                    );
                })}
            </div>
        ))}
    </div>
);

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

export function AddAccountPage({ onNavigate }: AddAccountPageProps) {
    const corpCfg = UI_DATA.editModals.corporateIdentity;
    const opsCfg = UI_DATA.editModals.operationsAuthority;
    const legalCfg = UI_DATA.editModals.legalMainAddress;
    const mailCfg = UI_DATA.editModals.mailingAddress;
    const cargoCfg = UI_DATA.cargoEditor;
    const officeCfg = UI_DATA.editModals.addOfficeLocation;
    const directorCfg = DIRECTOR_UI.editModal;

    const [corpVals, setCorpVals] = useState<Record<string, any>>({ status: 'Active' });
    const [opsVals, setOpsVals] = useState<Record<string, any>>({});
    const [legalVals, setLegalVals] = useState<Record<string, any>>({});
    const [mailVals, setMailVals] = useState<Record<string, any>>({});
    const [cargoSelected, setCargoSelected] = useState<string[]>([]);
    const [cargoSearch, setCargoSearch] = useState('');
    const [offices, setOffices] = useState<OfficeEntry[]>([]);
    const [directors, setDirectors] = useState<DirectorEntry[]>([]);
    const [errors, setErrors] = useState<
        Record<'corp' | 'ops' | 'legal' | 'mail', Record<string, boolean>>
    >({ corp: {}, ops: {}, legal: {}, mail: {} });

    const [dotState, setDotState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [dotMsg, setDotMsg] = useState('');

    // Left nav — list of sections for scroll-to navigation
    const SECTIONS = [
        { id: 'general',    label: 'General Information',        icon: Building2   },
        { id: 'operations', label: 'Operations & Authority',     icon: ShieldCheck },
        { id: 'legal',      label: 'Legal / Main Address',       icon: MapPin      },
        { id: 'mailing',    label: 'Mailing Address',            icon: Mail        },
        { id: 'cargo',      label: 'Cargo Carried',              icon: Package     },
        { id: 'offices',    label: 'Corporate Office Locations', icon: MapPin      },
        { id: 'directors',  label: 'Directors & Officers',       icon: Users       },
    ] as const;

    const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

    // Track which section is in the viewport and update the side nav highlight.
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const onScroll = () => {
            const top = container.scrollTop + 120; // offset for header
            let current = SECTIONS[0].id as string;
            for (const s of SECTIONS) {
                const el = sectionRefs.current[s.id];
                if (el && el.offsetTop <= top) current = s.id;
            }
            setActiveSection(current);
        };
        container.addEventListener('scroll', onScroll);
        return () => container.removeEventListener('scroll', onScroll);
    }, []);

    const scrollToSection = (id: string) => {
        const el = sectionRefs.current[id];
        const container = scrollRef.current;
        if (el && container) {
            container.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
        }
    };

    const handleDotLookup = async (dot: string) => {
        if (!dot || !/^\d{4,10}$/.test(dot.trim())) {
            setDotState('error');
            setDotMsg('Enter a valid DOT number (4-10 digits)');
            return;
        }
        setDotState('loading');
        setDotMsg('Contacting SAFER / FMCSA public database…');
        await new Promise((r) => setTimeout(r, 1000));
        const mock = {
            legalName: 'New Carrier Inc.',
            dbaName: '',
            businessType: 'Corporation',
            stateOfInc: 'Delaware',
        };
        setCorpVals((prev) => ({ ...prev, ...mock, dotNumber: dot }));
        setDotState('success');
        setDotMsg(`DOT ${dot} verified — record pre-filled from FMCSA SAFER`);
    };

    const addOffice = () =>
        setOffices((prev) => [...prev, { id: uid(), label: '', address: '', contact: '', phone: '' }]);
    const updateOffice = (id: string, key: keyof OfficeEntry, value: string) =>
        setOffices((prev) => prev.map((o) => (o.id === id ? { ...o, [key]: value } : o)));
    const removeOffice = (id: string) => setOffices((prev) => prev.filter((o) => o.id !== id));

    const addDirector = () =>
        setDirectors((prev) => [
            ...prev,
            {
                id: uid(), name: '', role: '', email: '', phone: '', stockClass: '',
                ownershipPct: '', dateAppointed: '', dateResigned: '', responsibility: '',
            },
        ]);
    const updateDirector = (id: string, key: keyof DirectorEntry, value: string) =>
        setDirectors((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: value } : d)));
    const removeDirector = (id: string) => setDirectors((prev) => prev.filter((d) => d.id !== id));

    const toggleCargo = (item: string) =>
        setCargoSelected((prev) =>
            prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
        );

    const validate = () => {
        const next = {
            corp: {} as Record<string, boolean>,
            ops: {} as Record<string, boolean>,
            legal: {} as Record<string, boolean>,
            mail: {} as Record<string, boolean>,
        };
        let ok = true;
        corpCfg.fields.forEach((f: any) => { if (f.required && !corpVals[f.key]) { next.corp[f.key] = true; ok = false; } });
        opsCfg.fields.forEach((f: any) => { if (f.required && !opsVals[f.key]) { next.ops[f.key] = true; ok = false; } });
        legalCfg.fields.forEach((f: any) => { if (f.required && !legalVals[f.key]) { next.legal[f.key] = true; ok = false; } });
        mailCfg.fields.forEach((f: any) => { if (f.required && !mailVals[f.key]) { next.mail[f.key] = true; ok = false; } });
        setErrors(next);
        return ok;
    };

    const handleSave = () => {
        if (!validate()) {
            const errorSection =
                Object.keys(errors.corp).length  > 0 ? 'general' :
                Object.keys(errors.ops).length   > 0 ? 'operations' :
                Object.keys(errors.legal).length > 0 ? 'legal' :
                Object.keys(errors.mail).length  > 0 ? 'mailing' : 'general';
            scrollToSection(errorSection);
            return;
        }

        const country: AccountCountry = legalVals.country === 'Canada' ? 'CA' : 'US';
        const id = `acct-${uid()}`;
        const newRecord: AccountRecord = {
            id,
            legalName: corpVals.legalName || 'New Carrier',
            dbaName: corpVals.dbaName || '',
            dotNumber: String(corpVals.dotNumber || ''),
            cvorNumber: corpVals.cvorNumber || '',
            nscNumber: corpVals.nscNumber || '',
            rinNumber: corpVals.rinNumber || '',
            status: ((corpVals.status as AccountStatus) || 'Pending'),
            city: legalVals.city || '',
            state: legalVals.state || '',
            country,
            drivers: 0,
            assets: 0,
            safetyRating: 'Not Rated' as SafetyRating,
            createdAt: new Date().toISOString().slice(0, 10),
            profilePath: '/account/profile',
        };

        addAccountRecord(newRecord);
        onNavigate?.('/accounts');
    };

    const handleCancel = () => onNavigate?.('/accounts');

    // Total field count for side-nav progress chip
    const completionFor = (key: string) => {
        if (key === 'general')    return Object.values(corpVals).filter(Boolean).length;
        if (key === 'operations') return Object.values(opsVals).filter(Boolean).length;
        if (key === 'legal')      return Object.values(legalVals).filter(Boolean).length;
        if (key === 'mailing')    return Object.values(mailVals).filter(Boolean).length;
        if (key === 'cargo')      return cargoSelected.length;
        if (key === 'offices')    return offices.length;
        if (key === 'directors')  return directors.length;
        return 0;
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
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Add New Account</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Register a new carrier with core profile, compliance, cargo, offices, and ownership details.
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
                            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Save Account
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
                                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group',
                                        isActive
                                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/30'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                            isActive
                                                ? 'bg-blue-600 text-white'
                                                : count > 0
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-slate-100 text-slate-500'
                                        )}
                                    >
                                        {count > 0 && !isActive ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                                    </span>
                                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                                    <span className="flex-1 text-sm font-semibold">{s.label}</span>
                                    {count > 0 && (
                                        <span
                                            className={cn(
                                                'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                                                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
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
                        {/* GENERAL INFORMATION */}
                        <section
                            ref={(el) => { sectionRefs.current['general'] = el; }}
                            id="section-general"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={Building2}
                                title="General Information"
                                subtitle="Legal identity and registration numbers (DOT, CVOR, NSC, RIN)."
                                right={
                                    <StatusSelect
                                        value={corpVals.status ?? 'Active'}
                                        onChange={(v) =>
                                            setCorpVals((prev) => ({ ...prev, status: v }))
                                        }
                                    />
                                }
                            />
                            <SectionGrid
                                fields={corpCfg.fields}
                                layout={corpCfg.layout}
                                values={corpVals}
                                onChange={(k, v) => {
                                    setCorpVals((prev) => ({ ...prev, [k]: v }));
                                    if (errors.corp[k]) setErrors((e) => ({ ...e, corp: { ...e.corp, [k]: false } }));
                                    if (k === 'dotNumber') { setDotState('idle'); setDotMsg(''); }
                                }}
                                errors={errors.corp}
                                dotLookup={{ state: dotState, msg: dotMsg, onLookup: handleDotLookup }}
                            />
                        </section>

                        {/* OPERATIONS & AUTHORITY */}
                        <section
                            ref={(el) => { sectionRefs.current['operations'] = el; }}
                            id="section-operations"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={ShieldCheck}
                                title="Operations & Authority"
                                subtitle="Operational classification and FMCSA operating authority."
                            />
                            <SectionGrid
                                fields={opsCfg.fields}
                                layout={opsCfg.layout}
                                values={opsVals}
                                onChange={(k, v) => {
                                    setOpsVals((prev) => ({ ...prev, [k]: v }));
                                    if (errors.ops[k]) setErrors((e) => ({ ...e, ops: { ...e.ops, [k]: false } }));
                                }}
                                errors={errors.ops}
                            />
                        </section>

                        {/* LEGAL / MAIN ADDRESS */}
                        <section
                            ref={(el) => { sectionRefs.current['legal'] = el; }}
                            id="section-legal"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={MapPin}
                                title="Legal / Main Address"
                                subtitle="Primary business location."
                            />
                            <SectionGrid
                                fields={legalCfg.fields}
                                layout={legalCfg.layout}
                                values={legalVals}
                                onChange={(k, v) => {
                                    setLegalVals((prev) => ({ ...prev, [k]: v }));
                                    if (errors.legal[k]) setErrors((e) => ({ ...e, legal: { ...e.legal, [k]: false } }));
                                }}
                                errors={errors.legal}
                            />
                        </section>

                        {/* MAILING ADDRESS */}
                        <section
                            ref={(el) => { sectionRefs.current['mailing'] = el; }}
                            id="section-mailing"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={Mail}
                                title="Mailing Address"
                                subtitle="Where official correspondence is sent."
                            />
                            <SectionGrid
                                fields={mailCfg.fields}
                                layout={mailCfg.layout}
                                values={mailVals}
                                onChange={(k, v) => {
                                    setMailVals((prev) => ({ ...prev, [k]: v }));
                                    if (errors.mail[k]) setErrors((e) => ({ ...e, mail: { ...e.mail, [k]: false } }));
                                }}
                                errors={errors.mail}
                            />
                        </section>

                        {/* CARGO CARRIED */}
                        <section
                            ref={(el) => { sectionRefs.current['cargo'] = el; }}
                            id="section-cargo"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={Package}
                                title="Cargo Carried"
                                subtitle="Commodities this carrier transports."
                                right={
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-md whitespace-nowrap">
                                            {cargoSelected.length} Selected
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCargoSelected([
                                                    ...Array.from(new Set([...cargoSelected, ...cargoCfg.commonTypes])),
                                                ])
                                            }
                                            className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 text-[10px] font-bold rounded-md hover:bg-slate-50 whitespace-nowrap"
                                        >
                                            {cargoCfg.selectCommonLabel}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCargoSelected([])}
                                            className="px-2.5 py-1 bg-white border border-slate-300 text-red-600 text-[10px] font-bold rounded-md hover:bg-red-50 whitespace-nowrap"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                }
                            />
                            <div className="p-6 space-y-6">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={cargoCfg.searchPlaceholder}
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                                        value={cargoSearch}
                                        onChange={(e) => setCargoSearch(e.target.value)}
                                    />
                                </div>
                                {cargoCfg.sections.map((section: any) => {
                                    const items = section.items.filter((i: string) =>
                                        i.toLowerCase().includes(cargoSearch.toLowerCase())
                                    );
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={section.key}>
                                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                {section.label}
                                            </h5>
                                            <div className="flex flex-wrap gap-2">
                                                {items.map((item: string) => (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => toggleCargo(item)}
                                                        className={cn(
                                                            'px-3 py-1.5 text-sm font-medium rounded-full border transition-all',
                                                            cargoSelected.includes(item)
                                                                ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                                        )}
                                                    >
                                                        {item}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* CORPORATE OFFICE LOCATIONS */}
                        <section
                            ref={(el) => { sectionRefs.current['offices'] = el; }}
                            id="section-offices"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={MapPin}
                                title="Corporate Office Locations"
                                subtitle="Branch and regional offices for this carrier."
                                right={
                                    <button
                                        type="button"
                                        onClick={addOffice}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Location
                                    </button>
                                }
                            />
                            <div className="p-6 space-y-4">
                                {offices.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">
                                        No office locations added yet. Use "Add Location" to register branches.
                                    </p>
                                ) : (
                                    offices.map((office) => (
                                        <div key={office.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Office Location</p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeOffice(office.id)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {officeCfg.fields.map((f: any) => (
                                                    <div
                                                        key={f.key}
                                                        className={f.key === 'address' || f.key === 'label' ? 'sm:col-span-2' : ''}
                                                    >
                                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                            {f.label}
                                                            {f.required && <span className="text-red-500 ml-1">*</span>}
                                                        </label>
                                                        <input
                                                            type={f.type === 'tel' ? 'tel' : 'text'}
                                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                            placeholder={f.placeholder}
                                                            value={(office as any)[f.key] || ''}
                                                            onChange={(e) =>
                                                                updateOffice(office.id, f.key as keyof OfficeEntry, e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* DIRECTORS & OFFICERS */}
                        <section
                            ref={(el) => { sectionRefs.current['directors'] = el; }}
                            id="section-directors"
                            className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-6"
                        >
                            <SectionHeader
                                icon={Users}
                                title="Directors & Officers"
                                subtitle="Key personnel, ownership, and compliance responsibilities."
                                right={
                                    <button
                                        type="button"
                                        onClick={addDirector}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Director
                                    </button>
                                }
                            />
                            <div className="p-6 space-y-4">
                                {directors.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">
                                        No directors added yet. Use "Add Director" to register officers.
                                    </p>
                                ) : (
                                    directors.map((director) => (
                                        <div key={director.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
                                            <div className="flex justify-between items-start mb-4">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Director / Officer</p>
                                                <button
                                                    type="button"
                                                    onClick={() => removeDirector(director.id)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="space-y-4">
                                                {directorCfg.layout.map((row: string[], i: number) => (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            'grid gap-4',
                                                            row.length > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                                                        )}
                                                    >
                                                        {row.map((fieldKey: string) => {
                                                            const f = directorCfg.fields.find((x: any) => x.key === fieldKey);
                                                            if (!f) return null;
                                                            return (
                                                                <div key={fieldKey}>
                                                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                                                        {f.label}
                                                                        {f.required && <span className="text-red-500 ml-1">*</span>}
                                                                    </label>
                                                                    {f.type === 'textarea' ? (
                                                                        <textarea
                                                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white resize-y min-h-[88px]"
                                                                            rows={(f as any).rows ?? 3}
                                                                            placeholder={(f as any).placeholder}
                                                                            value={(director as any)[fieldKey] || ''}
                                                                            onChange={(e) =>
                                                                                updateDirector(director.id, fieldKey as keyof DirectorEntry, e.target.value)
                                                                            }
                                                                        />
                                                                    ) : (
                                                                        <input
                                                                            type={f.type}
                                                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                                                                            placeholder={(f as any).placeholder}
                                                                            value={(director as any)[fieldKey] || ''}
                                                                            onChange={(e) =>
                                                                                updateDirector(director.id, fieldKey as keyof DirectorEntry, e.target.value)
                                                                            }
                                                                        />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Bottom actions */}
                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button
                                onClick={handleCancel}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors flex items-center gap-2"
                            >
                                <Save className="w-4 h-4" /> Save Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
