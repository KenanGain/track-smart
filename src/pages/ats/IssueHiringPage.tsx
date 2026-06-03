import { useMemo, useState } from 'react';
import { ArrowLeft, Briefcase, Mail, Send, Check, Copy, Link2, ExternalLink, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCOUNTS_DB } from '@/pages/accounts/accounts.data';
import { loadTemplates } from '@/pages/settings/driver-hiring-templates.data';
import type { LicenseType, ApplicantType } from './ats.data';
import { createApplicant, inviteDriver } from './hiring-application.data';

/**
 * Issue Hiring — capture a driver's initial details, pick a hiring template,
 * and invite them by email. Creates the Applicant + HiringApplication and
 * surfaces the /apply/<id> portal link the driver uses to complete it.
 */
export function IssueHiringPage({ onNavigate }: { onNavigate?: (path: string) => void } = {}) {
    const templates = useMemo(() => loadTemplates(), []);
    const carriers = useMemo(() => ACCOUNTS_DB, []);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [licenseType, setLicenseType] = useState<LicenseType>('CDL-A');
    const [applicantType, setApplicantType] = useState<ApplicantType>('Driver');
    const [position, setPosition] = useState('Company Driver');
    const [carrierId, setCarrierId] = useState(carriers[0]?.id ?? '');
    const [templateId, setTemplateId] = useState(templates.find(t => t.isDefault)?.id ?? templates[0]?.id ?? '');
    const [error, setError] = useState('');

    const [issued, setIssued] = useState<{ id: string; link: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const tpl = templates.find(t => t.id === templateId);

    const submit = () => {
        if (!firstName.trim() || !lastName.trim()) { setError('First and last name are required.'); return; }
        if (!email.trim()) { setError('A driver email is required to send the invite.'); return; }
        if (!templateId) { setError('Pick a hiring template.'); return; }
        const applicant = createApplicant({
            firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), phone: phone.trim() || undefined,
            licenseType, applicantType, positionApplied: position.trim() || 'Driver', templateId, carrierId,
        });
        const app = inviteDriver(applicant.id, email.trim());
        setIssued({ id: applicant.id, link: app.invite?.link ?? `https://apply.tracksmart.app/${applicant.id}` });
    };

    return (
        <div className="flex-1 bg-slate-50 min-h-screen">
            <div className="bg-white border-b border-slate-200 px-8 py-4">
                <button type="button" onClick={() => onNavigate?.('/ats-main')} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600">
                    <ArrowLeft size={13} /> Back to Assignments
                </button>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-sm"><Briefcase size={20} /></div>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900">Issue Hiring</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Capture the driver's details, assign a hiring template, and invite them to apply.</p>
                    </div>
                </div>
            </div>

            <div className="px-8 py-6 max-w-3xl mx-auto">
                {issued ? (
                    <div className="rounded-xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 bg-emerald-50 px-6 py-4 border-b border-emerald-100">
                            <Check size={18} className="text-emerald-600" />
                            <div>
                                <h2 className="text-sm font-bold text-emerald-800">Invite sent to {email}</h2>
                                <p className="text-[12px] text-emerald-700">{firstName} {lastName} can now complete the {tpl?.name} application.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Application link (driver portal)</label>
                                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/60 px-3 py-2">
                                    <Link2 size={13} className="shrink-0 text-slate-400" />
                                    <span className="truncate text-[12px] text-slate-600">{issued.link}</span>
                                    <button type="button" onClick={() => { navigator.clipboard?.writeText(issued.link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                                        className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                                        {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => onNavigate?.(`/apply/${issued.id}`)}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50">
                                    <ExternalLink size={14} /> Open driver portal
                                </button>
                                <button type="button" onClick={() => onNavigate?.(`/ats/application/${issued.id}`)}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                                    View application
                                </button>
                                <button type="button" onClick={() => { setIssued(null); setFirstName(''); setLastName(''); setEmail(''); setPhone(''); }}
                                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-semibold text-slate-500 hover:text-slate-800">
                                    <UserPlus size={14} /> Issue another
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Driver details */}
                        <Card title="Driver details">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="First name *"><input value={firstName} onChange={e => setFirstName(e.target.value)} className={INPUT} /></Field>
                                <Field label="Last name *"><input value={lastName} onChange={e => setLastName(e.target.value)} className={INPUT} /></Field>
                                <Field label="Email *">
                                    <div className="relative">
                                        <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={cn(INPUT, 'pl-9')} placeholder="driver@example.com" />
                                    </div>
                                </Field>
                                <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className={INPUT} placeholder="(555) 123-4567" /></Field>
                                <Field label="License type">
                                    <select value={licenseType} onChange={e => setLicenseType(e.target.value as LicenseType)} className={INPUT}>
                                        {(['CDL-A', 'CDL-B', 'CDL', 'Non-CDL'] as LicenseType[]).map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </Field>
                                <Field label="Applicant type">
                                    <select value={applicantType} onChange={e => setApplicantType(e.target.value as ApplicantType)} className={INPUT}>
                                        {(['Driver', 'Owner-Operator'] as ApplicantType[]).map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </Field>
                                <Field label="Position"><input value={position} onChange={e => setPosition(e.target.value)} className={INPUT} /></Field>
                                <Field label="Carrier">
                                    <select value={carrierId} onChange={e => setCarrierId(e.target.value)} className={INPUT}>
                                        {carriers.map(c => <option key={c.id} value={c.id}>{c.dbaName || c.legalName}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </Card>

                        {/* Template */}
                        <Card title="Hiring template">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {templates.map(t => {
                                    const picked = templateId === t.id;
                                    return (
                                        <button key={t.id} type="button" onClick={() => setTemplateId(t.id)}
                                            className={cn('relative text-left rounded-lg border-2 p-3 transition-all',
                                                picked ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50')}>
                                            {picked && <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white"><Check size={12} strokeWidth={3} /></span>}
                                            <div className="text-[13px] font-bold text-slate-900 truncate">{t.name}</div>
                                            <div className="text-[10px] font-bold text-slate-500 tabular-nums mt-0.5">{t.steps.length} steps{t.isDefault ? ' · Default' : ''}</div>
                                            {t.description && <p className="mt-1 text-[11px] text-slate-500 line-clamp-2">{t.description}</p>}
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>

                        {error && <p className="text-sm text-rose-600">{error}</p>}

                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => onNavigate?.('/ats-main')} className="h-10 px-4 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={submit} className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                                <Send size={15} /> Issue hiring & send invite
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

const INPUT = 'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3"><h3 className="text-sm font-bold text-slate-900">{title}</h3></div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</label>
            {children}
        </div>
    );
}
