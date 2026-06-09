import { useMemo, useState } from 'react';
import { ClipboardCheck, FileText, ListChecks, Eye, Download, Lock, PenLine, UploadCloud, ShieldCheck, Palette, X, ImageIcon, Check } from 'lucide-react';
import { loadApplicationForms, type ApplicationFormDef } from './application-forms.data';
import { CustomFormWizard } from './CustomFormWizard';
import { RoadTestForm } from './RoadTestForm';
import { TrainingCertificateForm } from './TrainingCertificateForm';
import { useCompanyBranding, type CompanyBranding } from './company-branding.data';
import { cn } from '@/lib/utils';
import { generateApplicationFormPdf } from './generateApplicationFormPdf';
import { PDF_TEMPLATES, type PdfVariant } from './ApplicationFormPrint';

const DISPLAY_TYPES = ['heading', 'paragraph', 'bullet-list', 'alert'];

/** Forms that are policy / consent / acknowledgement documents (the "Policy Form" tab). */
const POLICY_FORM_IDS = new Set([
    'form-ats-training-ack',          // Training & Policy Acknowledgements (incl. GPS / company rules)
    'form-ats-drug-alcohol-consent',  // Drug & Alcohol Consent
    'form-ats-license-compliance',    // License Compliance Certification
]);

type Tab = 'application' | 'policy';

const TABS: { id: Tab; label: string; icon: typeof FileText; hint: string }[] = [
    { id: 'application', label: 'Application Form', icon: FileText, hint: 'Records, verifications, quizzes & evaluations' },
    { id: 'policy', label: 'Policy Form', icon: ShieldCheck, hint: 'Policies, consents & acknowledgements' },
];

/**
 * Hiring Forms — the dedicated workspace for the post-application ("Hiring ATS")
 * forms, split into two tabs: Application Form (records, verifications, quizzes)
 * and Policy Form (policies, consents, acknowledgements). Each row shows whether
 * the form captures a signature and how many document uploads it has.
 *
 * The forms themselves are authored in Super Admin → Docu/Form Generator
 * (FORM TYPE = Hiring ATS); this page is where they're reviewed and used.
 */
export function HiringFormsPage() {
    const [branding, updateBranding] = useCompanyBranding();
    const allForms = useMemo(
        () => loadApplicationForms().filter(f => f.formType === 'hiring-ats' && !f.isSubform),
        [],
    );
    const [tab, setTab] = useState<Tab>('application');
    const [active, setActive] = useState<ApplicationFormDef | null>(null);
    const [pdfMenuId, setPdfMenuId] = useState<string | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [brandingOpen, setBrandingOpen] = useState(false);

    const isPolicy = (f: ApplicationFormDef) => POLICY_FORM_IDS.has(f.id);
    const applicationForms = useMemo(() => allForms.filter(f => !isPolicy(f)), [allForms]);
    const policyForms = useMemo(() => allForms.filter(isPolicy), [allForms]);
    const forms = tab === 'policy' ? policyForms : applicationForms;

    if (active) {
        // The Record of Road Test has a dedicated, paper-faithful renderer.
        if (active.id === 'form-ats-road-test') {
            return <RoadTestForm appForm={active} onClose={() => setActive(null)} />;
        }
        // Module Completion Certificate generator (branded, multi-certificate).
        if (active.id === 'form-ats-training-certificates') {
            return <TrainingCertificateForm appForm={active} onClose={() => setActive(null)} />;
        }
        return <CustomFormWizard appForm={active} onClose={() => setActive(null)} />;
    }

    const dataFieldCount = (f: ApplicationFormDef) => f.fields.filter(x => !DISPLAY_TYPES.includes(x.type)).length;
    const docCount = (f: ApplicationFormDef) => f.fields.filter(x => x.type === 'document').length;
    const signatureCount = (f: ApplicationFormDef) => f.fields.filter(x => x.type === 'signature').length;

    const generate = async (e: React.MouseEvent, f: ApplicationFormDef, variant: PdfVariant) => {
        e.stopPropagation();
        setPdfMenuId(null);
        if (generatingId) return;
        setGeneratingId(f.id);
        try { await generateApplicationFormPdf({ form: f, branding, variant }); }
        finally { setGeneratingId(null); }
    };

    return (
        <div className="min-h-screen flex-1 bg-slate-50">
            {/* Header */}
            <div className="border-b border-slate-200 bg-white px-8 pt-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
                            <ClipboardCheck size={20} />
                        </span>
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">Hiring Forms</h1>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Post-application hiring forms — fill out, download as PDF, and attach to the driver file.
                            </p>
                        </div>
                    </div>
                    {/* Branding control */}
                    <button
                        type="button"
                        onClick={() => setBrandingOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-[13px] font-semibold text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-slate-50"
                        title="Edit company branding shown on every form & PDF"
                    >
                        <span className="flex h-7 w-9 items-center justify-center overflow-hidden rounded bg-slate-100">
                            {branding.logoDataUrl
                                ? <img src={branding.logoDataUrl} alt="" className="max-h-6 max-w-8 object-contain" />
                                : <Palette size={14} className="text-slate-400" />}
                        </span>
                        <span className="hidden sm:flex sm:flex-col sm:items-start sm:leading-tight">
                            <span className="text-[12px] font-bold text-slate-800">{branding.name}</span>
                            <span className="text-[10px] font-medium text-slate-400">Edit branding</span>
                        </span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="mt-4 flex gap-1">
                    {TABS.map(t => {
                        const count = t.id === 'policy' ? policyForms.length : applicationForms.length;
                        const on = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => { setTab(t.id); setPdfMenuId(null); }}
                                className={cn(
                                    'group flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors',
                                    on ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700',
                                )}
                            >
                                <t.icon size={15} className={on ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'} />
                                {t.label}
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-bold', on ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="px-8 py-6">
                <p className="mb-3 text-[13px] text-slate-500">
                    {TABS.find(t => t.id === tab)?.hint}
                    {' · '}
                    <span className="font-bold text-slate-700">{forms.length} form{forms.length === 1 ? '' : 's'}</span>
                </p>

                {forms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
                        <ListChecks size={28} className="mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-500">No {tab === 'policy' ? 'policy' : 'application'} forms yet</p>
                        <p className="mt-1 text-xs text-slate-400">Author them in Super Admin → Docu/Form Generator (FORM TYPE = Hiring ATS).</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {forms.map(f => {
                            const docs = docCount(f);
                            const sigs = signatureCount(f);
                            return (
                                <li key={f.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-blue-300 hover:shadow-sm">
                                    <div
                                        onClick={() => setActive(f)}
                                        className="flex cursor-pointer items-center gap-3 px-4 py-3.5 hover:bg-slate-50"
                                    >
                                        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tab === 'policy' ? 'bg-violet-50' : 'bg-blue-50')}>
                                            {tab === 'policy'
                                                ? <ShieldCheck className="h-[18px] w-[18px] text-violet-500" />
                                                : <FileText className="h-[18px] w-[18px] text-blue-500" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <p className="text-sm font-medium text-slate-900">{f.displayTitle || f.name}</p>
                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                                    Default
                                                </span>
                                                {/* Capability badges */}
                                                {sigs > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700" title={`${sigs} signature${sigs === 1 ? '' : 's'}`}>
                                                        <PenLine size={11} /> {sigs > 1 ? `${sigs} signatures` : 'Signature'}
                                                    </span>
                                                )}
                                                {docs > 0 && (
                                                    <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700" title={`${docs} document upload${docs === 1 ? '' : 's'}`}>
                                                        <UploadCloud size={11} /> {docs} upload{docs === 1 ? '' : 's'}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-xs text-slate-400">
                                                {f.description || (tab === 'policy' ? 'Policy / acknowledgement' : 'Hiring ATS form')}
                                                {' · '}
                                                {dataFieldCount(f)} field{dataFieldCount(f) === 1 ? '' : 's'}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setActive(f); }}
                                                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                                                title="Open / fill form"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setPdfMenuId(pdfMenuId === f.id ? null : f.id); }}
                                                    disabled={generatingId === f.id}
                                                    className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-700 disabled:opacity-50"
                                                    title="Download PDF — pick a template"
                                                >
                                                    <Download className="h-4 w-4" />
                                                </button>
                                                {pdfMenuId === f.id && (
                                                    <div className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                                                        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">PDF template</p>
                                                        {PDF_TEMPLATES.map(t => (
                                                            <button key={t.id} type="button" onClick={(e) => generate(e, f, t.id)} className="block w-full px-3 py-2 text-left hover:bg-slate-50">
                                                                <span className="block text-[13px] font-semibold text-slate-800">{t.label}</span>
                                                                <span className="block text-[11px] text-slate-500">{t.description}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="flex h-9 w-9 items-center justify-center text-slate-300" title="Built-in form">
                                                <Lock className="h-4 w-4" />
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {brandingOpen && (
                <BrandingDrawer branding={branding} onChange={updateBranding} onClose={() => setBrandingOpen(false)} />
            )}
        </div>
    );
}

const FIELD = 'h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] text-slate-900 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

/** Slide-over editor for the company branding baked into every form & PDF. */
function BrandingDrawer({ branding, onChange, onClose }: {
    branding: CompanyBranding;
    onChange: (patch: Partial<CompanyBranding>) => void;
    onClose: () => void;
}) {
    const onLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onChange({ logoDataUrl: typeof reader.result === 'string' ? reader.result : undefined });
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-[70] flex justify-end">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]" onClick={onClose} />
            <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ backgroundColor: branding.accentColor }}><Palette size={16} /></span>
                        <div>
                            <h2 className="text-[15px] font-bold text-slate-900">Company Branding</h2>
                            <p className="text-[11px] text-slate-500">Shown on every form header & PDF.</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={16} /></button>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                    {/* Live letterhead preview */}
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Letterhead preview</p>
                        <div className="rounded-lg bg-white p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5">
                                    {branding.logoDataUrl
                                        ? <img src={branding.logoDataUrl} alt="" className="max-h-9 max-w-[120px] object-contain" />
                                        : <span className="flex h-9 w-9 items-center justify-center rounded text-white text-[15px] font-extrabold" style={{ backgroundColor: branding.accentColor }}>{(branding.name || 'C').slice(0, 1)}</span>}
                                    <div className="leading-tight">
                                        <p className="text-[13px] font-extrabold text-slate-900">{branding.name || 'Company name'}</p>
                                        {branding.tagline && <p className="text-[10px] italic text-slate-500">{branding.tagline}</p>}
                                    </div>
                                </div>
                                <div className="text-right text-[8px] leading-snug text-slate-400">
                                    {branding.address && <p>{branding.address}</p>}
                                    {branding.phone && <p>{branding.phone}</p>}
                                </div>
                            </div>
                            <div className="mt-2 h-[3px] rounded-full" style={{ backgroundColor: branding.accentColor }} />
                        </div>
                    </div>

                    {/* Logo */}
                    <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Company logo</label>
                        <div className="flex items-center gap-3">
                            <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                {branding.logoDataUrl
                                    ? <img src={branding.logoDataUrl} alt="" className="max-h-14 max-w-[88px] object-contain" />
                                    : <ImageIcon size={20} className="text-slate-300" />}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                                    <UploadCloud size={13} /> {branding.logoDataUrl ? 'Replace logo' : 'Upload logo'}
                                    <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
                                </label>
                                {branding.logoDataUrl && (
                                    <button type="button" onClick={() => onChange({ logoDataUrl: undefined })} className="text-left text-[11px] font-semibold text-rose-500 hover:text-rose-600">Remove logo</button>
                                )}
                                <p className="text-[10px] text-slate-400">PNG / JPG · shows on every PDF header.</p>
                            </div>
                        </div>
                    </div>

                    <Labeled label="Company name">
                        <input value={branding.name} onChange={e => onChange({ name: e.target.value })} className={FIELD} placeholder="Acme Logistics" />
                    </Labeled>
                    <Labeled label="Tagline">
                        <input value={branding.tagline ?? ''} onChange={e => onChange({ tagline: e.target.value })} className={FIELD} placeholder="Safety. Compliance. Driven." />
                    </Labeled>
                    <Labeled label="Address">
                        <input value={branding.address ?? ''} onChange={e => onChange({ address: e.target.value })} className={FIELD} placeholder="7447 Bren Rd · Mississauga, ON L4T 1H3" />
                    </Labeled>
                    <div className="grid grid-cols-2 gap-3">
                        <Labeled label="Phone">
                            <input value={branding.phone ?? ''} onChange={e => onChange({ phone: e.target.value })} className={FIELD} placeholder="(905) 555-0117" />
                        </Labeled>
                        <Labeled label="Email">
                            <input value={branding.email ?? ''} onChange={e => onChange({ email: e.target.value })} className={FIELD} placeholder="hr@acme.com" />
                        </Labeled>
                    </div>
                    <Labeled label="Accent color">
                        <div className="flex items-center gap-2">
                            <input type="color" value={branding.accentColor} onChange={e => onChange({ accentColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded-md border border-slate-200 bg-white" />
                            <input value={branding.accentColor} onChange={e => onChange({ accentColor: e.target.value })} className={cn(FIELD, 'flex-1 font-mono')} />
                        </div>
                    </Labeled>
                </div>

                <div className="border-t border-slate-200 px-5 py-3.5">
                    <button type="button" onClick={onClose} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-[13px] font-bold text-white shadow-sm" style={{ backgroundColor: branding.accentColor }}>
                        <Check size={15} /> Done — branding saved
                    </button>
                    <p className="mt-2 text-center text-[11px] text-slate-400">Changes save automatically and apply to every form & PDF.</p>
                </div>
            </div>
        </div>
    );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
            {children}
        </div>
    );
}

export default HiringFormsPage;
