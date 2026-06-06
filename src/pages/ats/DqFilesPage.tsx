import { useMemo, useState } from "react";
import {
    ListChecks, Search, Check, X as XIcon, ChevronDown,
    UserCheck, AlertTriangle, FileText, LayoutGrid, Settings2,
    ArrowLeft, User, MapPin, Briefcase, Shield, Award, PenTool, History,
    UploadCloud, Eye, Download, Copy, MessageSquarePlus, Printer, Send,
    Plus, SkipForward, Minus,
    BadgeCheck, ChevronRight, FileCheck, KeyRound, Hash, Mail, Phone,
    Info,
} from "lucide-react";
import { KpiTile, PageHeader, TabStrip, SelectFilter, type TabDef } from "./ats-ui";
import { cn } from "@/lib/utils";
import {
    loadApplicants, getApplication,
    type HiringApplication,
} from "./hiring-application.data";
import { loadApplicationForms, type ApplicationFormDef } from "./application-forms.data";
import { loadTemplates, type DriverHiringTemplate } from "@/pages/settings/driver-hiring-templates.data";
import { computeDqFile, type DqFileResult, type DqStatus, type DqChecklistItem } from "./dq-file-checklist";
import {
    loadDqProfiles, loadDqOverrides, setDqOverride, resolveDqProfile,
    loadDqItemOverrides, setDqItemOverride, clearDqItemOverride, driverItemOverrides,
    DQ_DRIVER_TYPES, type DqProfile, type DqDriverType,
} from "./dq-profiles.data";
import { DqChecklistBuilder } from "./DqChecklistBuilder";
import { STAGE_META, TONE_CLS, type Applicant, type Stage } from "./ats.data";
import { ACCOUNTS_DB } from "@/pages/accounts/accounts.data";
import { CONSENT_BY_ID } from "./consent-forms.data";
import { buildRequirements, type Requirement } from "./hiring-requirements";

// ── Types ────────────────────────────────────────────────────────────────────

interface DqRow {
    applicant: Applicant;
    app?: HiringApplication;
    dq: DqFileResult;
    carrier: string;
    profile?: DqProfile;
    auto: boolean;
    type: DqDriverType;
}

type DetailTab = 'details' | 'address' | 'qualification' | 'documents' | 'compliance' | 'certificates' | 'signature' | 'activity';

// ── Local UI primitives ───────────────────────────────────────────────────────

function PanelCard({ title, subtitle, right, children }: {
    title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                <div>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}

function KV({ label, value, mono, flag }: { label: string; value: string; mono?: boolean; flag?: 'Critical' | 'Warning' }) {
    const tone = flag === 'Critical' ? 'text-rose-700' : flag === 'Warning' ? 'text-amber-700' : 'text-slate-700';
    return (
        <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1.5">
            <span className="shrink-0 text-[11px] text-slate-500">{label}</span>
            <span className={cn('break-all text-right text-[12px] font-semibold', mono && 'font-mono', tone)}>
                {value}
                {flag && <span className="ml-2 text-[9px] font-bold uppercase tracking-wider">[{flag}]</span>}
            </span>
        </div>
    );
}

function ActionBtn({ Icon, label, onClick, tone = 'ghost' }: {
    Icon: React.ElementType; label: string; onClick?: () => void; tone?: 'ghost' | 'primary' | 'good' | 'warn';
}) {
    return (
        <button type="button" onClick={onClick}
            className={cn('inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors',
                tone === 'primary' ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
                    : tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700')}>
            <Icon size={11} /> {label}
        </button>
    );
}

function DqStatusIcon({ status }: { status: DqStatus }) {
    if (status === 'present') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check size={12} strokeWidth={3} /></span>;
    if (status === 'missing') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><XIcon size={12} strokeWidth={3} /></span>;
    if (status === 'skipped') return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"><SkipForward size={11} /></span>;
    return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400"><Minus size={12} /></span>;
}

function DqStatusBadge({ status }: { status: DqStatus }) {
    const [label, cls] = status === 'present'
        ? ['Present', 'border-emerald-200 bg-emerald-50 text-emerald-700']
        : status === 'missing'
            ? ['Missing', 'border-rose-200 bg-rose-50 text-rose-700']
            : status === 'skipped'
                ? ['Skipped', 'border-amber-200 bg-amber-50 text-amber-700']
                : ['N/A', 'border-slate-200 bg-slate-50 text-slate-400'];
    return <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', cls)}>{label}</span>;
}

function EmptySection({ message }: { message: string }) {
    return <div className="px-5 py-10 text-center text-[12px] text-slate-400">{message}</div>;
}

// ── Modals ───────────────────────────────────────────────────────────────────

function SkipModal({ itemLabel, onSkip, onClose }: {
    itemLabel: string;
    onSkip: (reason: string, note: string) => void;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Skip item</h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">This will exclude the item from the required count.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><XIcon size={18} /></button>
                </div>
                <div className="space-y-4 px-5 py-4">
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] font-semibold text-amber-900">
                        <SkipForward size={13} className="inline mr-1.5" />{itemLabel}
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Reason <span className="text-rose-500">*</span></label>
                        <select value={reason} onChange={e => setReason(e.target.value)}
                            className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none">
                            <option value="">Select a reason…</option>
                            <option value="not_applicable">Not applicable to this driver</option>
                            <option value="driver_type">Not required for this driver type</option>
                            <option value="waiver">Approved waiver on file</option>
                            <option value="pending">Pending — will be provided later</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Notes</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                            placeholder="Additional notes (optional)…"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm resize-none focus:border-amber-400 focus:outline-none" />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose}
                        className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" disabled={!reason} onClick={() => onSkip(reason, note)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        <SkipForward size={14} /> Mark as Skipped
                    </button>
                </div>
            </div>
        </div>
    );
}

function SendModal({ itemLabel, driverEmail, onSend, onClose }: {
    itemLabel: string;
    driverEmail: string;
    onSend: (channel: 'email' | 'sms', message: string) => void;
    onClose: () => void;
}) {
    const [channel, setChannel] = useState<'email' | 'sms'>('email');
    const [message, setMessage] = useState(`Hi, we need the following document for your Driver Qualification file:\n\n"${itemLabel}"\n\nPlease upload it at your earliest convenience. Thank you.`);
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Request document</h3>
                        <p className="mt-0.5 text-[11px] text-slate-500">Send a request to the driver for this document.</p>
                    </div>
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><XIcon size={18} /></button>
                </div>
                <div className="space-y-4 px-5 py-4">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-[13px] font-semibold text-blue-800">
                        <FileText size={13} className="inline mr-1.5" />{itemLabel}
                    </div>
                    <div>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Channel</div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setChannel('email')}
                                className={cn('flex flex-1 items-center justify-center gap-2 h-9 rounded-lg border text-sm font-semibold transition-colors',
                                    channel === 'email' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                                <Mail size={14} /> Email
                            </button>
                            <button type="button" onClick={() => setChannel('sms')}
                                className={cn('flex flex-1 items-center justify-center gap-2 h-9 rounded-lg border text-sm font-semibold transition-colors',
                                    channel === 'sms' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50')}>
                                <Phone size={14} /> SMS
                            </button>
                        </div>
                        {channel === 'email' && driverEmail && (
                            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1">
                                <Mail size={10} /> To: <span className="font-mono text-slate-700">{driverEmail}</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Message</label>
                        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm resize-none focus:border-blue-400 focus:outline-none" />
                    </div>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose}
                        className="h-9 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="button" onClick={() => onSend(channel, message)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700">
                        <Send size={14} /> Send Request
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── DqItemRow — full CRUD item row with modals ───────────────────────────────

function DqItemRow({ item, status, driverId, sectionTitle, driverEmail, onRefresh }: {
    item: DqChecklistItem;
    status: DqStatus;
    driverId: string;
    sectionTitle: string;
    driverEmail: string;
    onRefresh: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [skipOpen, setSkipOpen] = useState(false);
    const [sendOpen, setSendOpen] = useState(false);
    const [number, setNumber] = useState('');
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);

    const fakeUpload = () => setUploadedFile(`${item.label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
    const handleSave = () => { setExpanded(false); onRefresh(); };

    const handleSkip = (reason: string, note: string) => {
        setDqItemOverride(driverId, sectionTitle, item.label, { status: 'skipped', reason, note, updatedAt: new Date().toISOString() });
        setSkipOpen(false);
        onRefresh();
    };

    const handleClearSkip = () => {
        clearDqItemOverride(driverId, sectionTitle, item.label);
        onRefresh();
    };

    const handleSend = (_channel: 'email' | 'sms', _message: string) => {
        setSendOpen(false);
        // Simulated — marks as requested via activity (no real send in this prototype)
    };

    return (
        <>
            <li className={cn('transition-all', expanded && 'bg-slate-50/40')}>
                <div className={cn(
                    'group flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50/30 transition-colors',
                    status === 'missing' && 'bg-rose-50/10',
                    status === 'skipped' && 'opacity-70',
                )}>
                    <DqStatusIcon status={status} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className={cn('text-[13px]',
                                status === 'missing' ? 'font-semibold text-slate-800' : 'text-slate-600',
                                status === 'skipped' && 'line-through text-slate-400')}>
                                {item.label}
                            </span>
                            {item.conditional && (
                                <span className="rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">if applicable</span>
                            )}
                            {!item.conditional && status === 'missing' && (
                                <span className="rounded-sm border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-600">REQUIRED · 49 CFR 391.51</span>
                            )}
                        </div>
                        {status === 'present' && (
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                                <BadgeCheck size={9} className="text-emerald-500" /> On file
                            </div>
                        )}
                        {status === 'skipped' && (
                            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-amber-600">
                                <Info size={9} /> Skipped by hiring manager
                            </div>
                        )}
                    </div>
                    <DqStatusBadge status={status} />
                    <div className="flex shrink-0 items-center gap-1.5">
                        {status === 'missing' && (
                            <>
                                <ActionBtn Icon={UploadCloud} label="Upload" tone="primary" onClick={() => setExpanded(!expanded)} />
                                <ActionBtn Icon={Send} label="Send" onClick={() => setSendOpen(true)} />
                                <ActionBtn Icon={SkipForward} label="Skip" tone="warn" onClick={() => setSkipOpen(true)} />
                            </>
                        )}
                        {status === 'present' && (
                            <>
                                <ActionBtn Icon={Eye} label="View" tone="good" />
                                <ActionBtn Icon={Download} label="Download" />
                                <ActionBtn Icon={Printer} label="Print" />
                                <ActionBtn Icon={Copy} label="Replace" onClick={() => setExpanded(!expanded)} />
                            </>
                        )}
                        {status === 'skipped' && (
                            <>
                                <ActionBtn Icon={UploadCloud} label="Upload instead" tone="primary" onClick={() => setExpanded(!expanded)} />
                                <ActionBtn Icon={XIcon} label="Undo skip" onClick={handleClearSkip} />
                            </>
                        )}
                        {status === 'na' && (
                            <ActionBtn Icon={Plus} label="Include" onClick={() => setExpanded(!expanded)} />
                        )}
                    </div>
                </div>

                {expanded && (
                    <div className="px-5 pb-4">
                        <div className="space-y-4 rounded-lg border border-blue-200 bg-gradient-to-b from-blue-50/50 to-white p-4">
                            <div className="flex items-center gap-2 text-[11px] font-bold text-blue-700">
                                <UploadCloud size={13} /> Upload document — {item.label}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Document Number</label>
                                    <input value={number} onChange={e => setNumber(e.target.value)} placeholder="Enter number…"
                                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400/20" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Issue Date</label>
                                    <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Date</label>
                                    <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                                        className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-blue-400 focus:outline-none" />
                                </div>
                            </div>
                            <div>
                                {uploadedFile ? (
                                    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5">
                                        <FileText size={11} className="shrink-0 text-blue-500" />
                                        <span className="flex-1 truncate text-[12px] text-slate-700">{uploadedFile}</span>
                                        <button type="button" onClick={() => setUploadedFile(null)} className="text-slate-400 hover:text-rose-500"><XIcon size={12} /></button>
                                    </div>
                                ) : (
                                    <button type="button" onClick={fakeUpload}
                                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-100">
                                        <UploadCloud size={12} /> Choose file to upload
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                                <button type="button" onClick={() => setExpanded(false)}
                                    className="h-8 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button type="button" onClick={handleSave}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700">
                                    <Check size={13} /> Save Document
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </li>

            {skipOpen && <SkipModal itemLabel={item.label} onSkip={handleSkip} onClose={() => setSkipOpen(false)} />}
            {sendOpen && <SendModal itemLabel={item.label} driverEmail={driverEmail} onSend={handleSend} onClose={() => setSendOpen(false)} />}
        </>
    );
}

// ── DqSectionPanel — collapsible section with fulfillment items ──────────────

function DqSectionPanel({ section, driverId, driverEmail, onRefresh }: {
    section: { title: string; items: { item: DqChecklistItem; status: DqStatus }[] };
    driverId: string;
    driverEmail: string;
    onRefresh: () => void;
}) {
    const [collapsed, setCollapsed] = useState(false);
    const present = section.items.filter(i => i.status === 'present').length;
    const required = section.items.filter(i => i.status !== 'na' && i.status !== 'skipped').length;
    const missing = required - present;
    const skipped = section.items.filter(i => i.status === 'skipped').length;

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => setCollapsed(!collapsed)}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-left hover:bg-slate-100/60 transition-colors">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
                    <span className="text-[11px] text-slate-500">{present}/{required} required present</span>
                    {skipped > 0 && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">{skipped} skipped</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {missing > 0
                        ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{missing} missing</span>
                        : <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Complete</span>
                    }
                    <ChevronDown size={14} className={cn('text-slate-400 transition-transform', collapsed && 'rotate-180')} />
                </div>
            </button>
            {/* Section progress bar */}
            <div className="h-1 bg-slate-100">
                <div className={cn('h-full transition-all', missing === 0 ? 'bg-emerald-500' : 'bg-blue-500')}
                    style={{ width: `${required ? Math.round((present / required) * 100) : 0}%` }} />
            </div>
            {!collapsed && (
                <ul className="divide-y divide-slate-100">
                    {section.items.map((row, i) => (
                        <DqItemRow
                            key={i}
                            item={row.item}
                            status={row.status}
                            driverId={driverId}
                            sectionTitle={section.title}
                            driverEmail={driverEmail}
                            onRefresh={onRefresh}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function DetailsTab({ row }: { row: DqRow }) {
    const { applicant: a, dq, carrier, profile, auto, type } = row;
    const itemCount = dq.sections.reduce((s, sec) => s + sec.items.length, 0);
    return (
        <div className="space-y-4">
            <PanelCard title="Driver Information" subtitle="Personal details from the application.">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-2">
                    <KV label="Full name" value={`${a.firstName} ${a.lastName}`} />
                    <KV label="Date of birth" value={a.dateOfBirth ?? '—'} mono />
                    <KV label="SSN / SIN" value={a.ssnMasked ?? '—'} mono />
                    <KV label="License type" value={a.licenseType} />
                    <KV label="Applicant type" value={a.applicantType} />
                    <KV label="Position applied" value={a.positionApplied} />
                    <KV label="Email" value={a.email} mono />
                    <KV label="Phone" value={a.phone ?? '—'} mono />
                    <KV label="Applied date" value={a.appliedDate} mono />
                    <KV label="Days in pipeline" value={`${a.daysInPipeline} days`} />
                    <KV label="Carrier" value={carrier} />
                    <KV label="Stage" value={STAGE_META[a.stage].label} />
                    <KV label="Driver type" value={DQ_DRIVER_TYPES.find(t => t.id === type)?.label ?? type} />
                </div>
            </PanelCard>
            <PanelCard title="DQ Checklist" subtitle="Assigned profile and current completion.">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-2">
                    <KV label="Profile" value={profile?.name ?? 'None assigned'} />
                    <KV label="Assignment" value={auto ? 'Auto-detected' : 'Manual override'} />
                    <KV label="Sections" value={String(dq.sections.length)} />
                    <KV label="Total items" value={String(itemCount)} />
                    <KV label="Required" value={String(dq.rollup.required)} />
                    <KV label="Present" value={String(dq.rollup.present)} />
                    <KV label="Missing" value={String(dq.rollup.missing)} flag={dq.rollup.missing > 0 ? 'Warning' : undefined} />
                    <KV label="Completion" value={`${dq.pct}%`} />
                </div>
            </PanelCard>
        </div>
    );
}

function AddressTab({ row }: { row: DqRow }) {
    const a = row.applicant;
    return (
        <div className="space-y-4">
            <PanelCard title="Current Address">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-2">
                    <KV label="Street address" value={a.streetAddress ?? '—'} />
                    <KV label="City" value={a.city ?? '—'} />
                    <KV label="State / Province" value={a.state ?? '—'} />
                    <KV label="Zip / Postal" value={a.postalCode ?? '—'} mono />
                    <KV label="Country" value={a.country ?? '—'} />
                </div>
            </PanelCard>
            <PanelCard title="Previous Residences" subtitle="Addresses from the past 3 years.">
                <div className="px-5 py-4">
                    <p className="text-[12px] text-slate-600">{(a as any).addressesLast3Years ?? '—'}</p>
                </div>
            </PanelCard>
        </div>
    );
}

function QualificationTab({ row }: { row: DqRow }) {
    const a = row.applicant;
    const cq = a.companyQuestions;
    return (
        <div className="space-y-4">
            <PanelCard title="License & Eligibility">
                <div className="grid grid-cols-1 gap-x-6 gap-y-3 px-5 py-4 md:grid-cols-2">
                    <KV label="License type" value={a.licenseType} />
                    <KV label="Applicant type" value={a.applicantType} />
                    <KV label="Legally eligible for US employment" value={cq.legallyEligibleUS ? 'Yes' : 'No'} flag={!cq.legallyEligibleUS ? 'Critical' : undefined} />
                    <KV label="Reads / writes / speaks English" value={cq.speaksEnglish ? 'Yes' : 'No'} flag={!cq.speaksEnglish ? 'Warning' : undefined} />
                    <KV label="Current TWIC card" value={cq.twicCard ? 'Yes' : 'No'} />
                    <KV label="Currently employed" value={cq.currentlyEmployed ? 'Yes' : 'No'} />
                </div>
            </PanelCard>
            <PanelCard title="Driving Experience">
                {a.drivingExperience.length === 0 ? (
                    <EmptySection message="No driving experience recorded." />
                ) : (
                    <div className="overflow-x-auto px-5 py-4">
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="py-2 text-left">Equipment class</th>
                                    <th className="py-2 text-left">Type</th>
                                    <th className="py-2 text-left">Start</th>
                                    <th className="py-2 text-left">End</th>
                                    <th className="py-2 text-right">Miles</th>
                                    <th className="py-2 text-right">Verified</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {a.drivingExperience.map(r => (
                                    <tr key={r.id}>
                                        <td className="py-2 font-semibold text-slate-700">{r.equipmentClass}</td>
                                        <td className="py-2 text-slate-600">{r.equipmentType}</td>
                                        <td className="py-2 font-mono text-slate-500">{r.startDate ?? '—'}</td>
                                        <td className="py-2 font-mono text-slate-500">{r.endDate ?? '—'}</td>
                                        <td className="py-2 text-right tabular-nums">{r.totalMiles?.toLocaleString() ?? '—'}</td>
                                        <td className="py-2 text-right">
                                            {r.verified
                                                ? <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700"><BadgeCheck size={11} /> Yes</span>
                                                : <span className="text-[10px] font-bold text-slate-400">No</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PanelCard>
        </div>
    );
}

function DocumentsTab({ dq, driverId, driverEmail, onRefresh }: {
    dq: DqFileResult;
    driverId: string;
    driverEmail: string;
    onRefresh: () => void;
}) {
    if (dq.sections.length === 0) {
        return <PanelCard title="Documents"><EmptySection message="No document requirements defined in the assigned checklist profile." /></PanelCard>;
    }
    return (
        <div className="space-y-4">
            {dq.sections.map(sec => (
                <DqSectionPanel key={sec.title} section={sec} driverId={driverId} driverEmail={driverEmail} onRefresh={onRefresh} />
            ))}
        </div>
    );
}

function ComplianceKeyRow({ req }: { req: Requirement }) {
    const [expanded, setExpanded] = useState(false);
    const [keyNumber, setKeyNumber] = useState(req.meta.number ?? '');
    const [issueDate, setIssueDate] = useState(req.meta.issue ?? '');
    const [expiryDate, setExpiryDate] = useState(req.meta.expiry ?? '');
    const hasValue = !!req.meta.number || req.status === 'uploaded' || req.status === 'verified';
    const statusCls = req.status === 'verified' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : req.status === 'uploaded' ? 'border-blue-200 bg-blue-50 text-blue-700'
            : req.status === 'ordered' ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-rose-200 bg-rose-50 text-rose-700';
    const statusLabel = req.status === 'verified' ? 'Verified' : req.status === 'uploaded' ? 'On file' : req.status === 'ordered' ? 'Ordered' : 'Missing';

    return (
        <li className={cn('transition-all', expanded && 'bg-amber-50/20')}>
            <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/30 transition-colors">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <KeyRound size={15} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-slate-800">{req.label}</div>
                    {req.meta.number
                        ? <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500"><Hash size={9} /><span className="font-mono">{req.meta.number}</span>{req.meta.expiry && <span className="ml-2">· Exp {req.meta.expiry}</span>}</div>
                        : <div className="mt-0.5 text-[11px] text-slate-400">No key number entered</div>
                    }
                </div>
                <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', statusCls)}>{statusLabel}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                    {hasValue ? <><ActionBtn Icon={Eye} label="View" tone="good" /><ActionBtn Icon={Copy} label="Edit" onClick={() => setExpanded(!expanded)} /></>
                        : <><ActionBtn Icon={Plus} label="Add" tone="primary" onClick={() => setExpanded(!expanded)} /><ActionBtn Icon={MessageSquarePlus} label="Order" /></>
                    }
                </div>
            </div>
            {expanded && (
                <div className="px-5 pb-4">
                    <div className="space-y-4 rounded-lg border border-amber-200 bg-gradient-to-b from-amber-50/50 to-white p-4">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-amber-700"><KeyRound size={13} /> {hasValue ? 'Edit' : 'Enter'} key number — {req.label}</div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Key Number <span className="text-rose-500">*</span></label>
                                <input value={keyNumber} onChange={e => setKeyNumber(e.target.value)} placeholder="Enter number…"
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 font-mono text-sm focus:border-amber-400 focus:outline-none" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Issue Date</label>
                                <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Expiry Date</label>
                                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                                    className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-amber-400 focus:outline-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-2">
                            <button type="button" onClick={() => setExpanded(false)} className="h-8 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            <button type="button" onClick={() => setExpanded(false)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-amber-600 px-4 text-sm font-semibold text-white hover:bg-amber-700"><Check size={13} /> Save</button>
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
}

function ComplianceTab({ requirements }: { requirements: Requirement[] }) {
    const compReqs = requirements.filter(r => r.kind === 'compliance');
    const missing = compReqs.filter(r => r.status === 'missing').length;
    return (
        <PanelCard title="Compliance — Key Numbers" subtitle="Key identifiers collected during the application."
            right={missing > 0
                ? <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{missing} missing</span>
                : compReqs.length > 0 ? <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">All on file</span> : undefined}>
            {compReqs.length === 0
                ? <EmptySection message="No key number fields in the assigned hiring template." />
                : <ul className="divide-y divide-slate-100">{compReqs.map(req => <ComplianceKeyRow key={req.id} req={req} />)}</ul>
            }
        </PanelCard>
    );
}

function CertificatesTab({ dq, driverId, driverEmail, onRefresh }: {
    dq: DqFileResult; driverId: string; driverEmail: string; onRefresh: () => void;
}) {
    const sections = dq.sections.filter(s => s.title === 'Trainings');
    return sections.length === 0
        ? <PanelCard title="Certificates"><EmptySection message="No certificate requirements in this checklist." /></PanelCard>
        : <div className="space-y-4">{sections.map(sec => <DqSectionPanel key={sec.title} section={sec} driverId={driverId} driverEmail={driverEmail} onRefresh={onRefresh} />)}</div>;
}

function SignatureTab({ row }: { row: DqRow }) {
    const { app } = row;
    const template = useMemo(() => app?.templateId ? loadTemplates().find(t => t.id === app.templateId) : undefined, [app?.templateId]);
    const consentSteps = useMemo(() => template?.steps.filter(s => s.kind === 'consent') ?? [], [template]);
    return (
        <div className="space-y-4">
            <PanelCard title="Signed Documents" subtitle="Consent forms signed during the application process.">
                {!app ? <EmptySection message="No linked application." />
                    : consentSteps.length === 0 ? <EmptySection message="No consent forms in the assigned template." />
                        : (
                            <ul className="divide-y divide-slate-100">
                                {consentSteps.map(step => {
                                    const st = app.steps[step.id];
                                    const signed = !!st?.signature || st?.status === 'submitted' || st?.status === 'approved';
                                    const consent = CONSENT_BY_ID[step.formId as keyof typeof CONSENT_BY_ID];
                                    return (
                                        <li key={step.id} className="flex items-center gap-3 px-5 py-3">
                                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', signed ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400')}>
                                                {signed ? <BadgeCheck size={16} /> : <FileText size={16} />}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-[13px] font-bold text-slate-800">{consent?.title ?? step.label ?? 'Consent'}</div>
                                                {consent && <div className="text-[11px] text-slate-500">{consent.citation}</div>}
                                            </div>
                                            <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold', signed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                                                {signed ? 'Signed' : 'Pending'}
                                            </span>
                                            {signed && <ActionBtn Icon={Eye} label="View" />}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
            </PanelCard>
            <PanelCard title="DQ File Certification" subtitle="Required signatures to certify the Driver Qualification File.">
                <div className="grid grid-cols-1 gap-6 p-5 sm:grid-cols-2">
                    {[{ role: 'Driver signature', note: 'I certify that all information provided is true and complete.' },
                        { role: 'Carrier representative', note: 'I confirm all required DQ documents are on file.' }].map(({ role, note }) => (
                        <div key={role}>
                            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{role}</div>
                            <div className="h-20 rounded-md border-2 border-dashed border-slate-200 bg-slate-50/60" />
                            <div className="mt-1.5 text-[10px] text-slate-400">{note}</div>
                            <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
                                <span>Print: ____________________________</span>
                                <span>Date: ____________</span>
                            </div>
                        </div>
                    ))}
                </div>
            </PanelCard>
        </div>
    );
}

function ActivityTab({ row }: { row: DqRow }) {
    const sorted = [...(row.applicant.eventLog ?? [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return (
        <PanelCard title="Activity Log" subtitle="All events for this driver's DQ file.">
            {sorted.length === 0 ? <EmptySection message="No activity recorded yet." />
                : (
                    <ul className="divide-y divide-slate-100">
                        {sorted.map(e => (
                            <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400"><History size={14} /></span>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[12px] font-bold text-slate-900">{e.title}</span>
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{e.type.replace(/_/g, ' ')}</span>
                                    </div>
                                    {e.detail && <p className="mt-0.5 text-[11px] text-slate-500">{e.detail}</p>}
                                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">{e.user} · {new Date(e.timestamp).toLocaleString()}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
        </PanelCard>
    );
}

// ── DqFileDriverDetail ────────────────────────────────────────────────────────

function DqFileDriverDetail({ row, onBack, onNavigate, profiles, onSetProfile, onRefresh }: {
    row: DqRow;
    onBack?: () => void;
    onNavigate?: (path: string) => void;
    profiles: DqProfile[];
    onSetProfile: (pid: string | null) => void;
    onRefresh: () => void;
}) {
    const [activeTab, setActiveTab] = useState<DetailTab>('details');
    const { applicant: a, dq, carrier, profile, auto, type } = row;

    const pct = dq.rollup.required ? Math.round((dq.rollup.present / dq.rollup.required) * 100) : 0;
    const complete = dq.rollup.missing === 0;
    const naCount = dq.sections.reduce((sum, s) => sum + s.items.filter(i => i.status === 'na').length, 0);
    const skippedCount = dq.sections.reduce((sum, s) => sum + s.items.filter(i => i.status === 'skipped').length, 0);

    const docMissing = dq.rollup.missing;
    const certMissing = dq.sections.find(s => s.title === 'Trainings')?.items.filter(i => i.status === 'missing').length ?? 0;

    const detailFormById = useMemo(() => { const m = new Map<string, ApplicationFormDef>(); for (const f of loadApplicationForms()) m.set(f.id, f); return m; }, []);
    const detailTemplate = useMemo(() => row.app?.templateId ? loadTemplates().find(t => t.id === row.app!.templateId) : undefined, [row.app?.templateId]);
    const requirements = useMemo(
        () => row.app && a ? buildRequirements(a, row.app, detailTemplate?.steps ?? [], detailFormById) : [],
        [a, row.app, detailTemplate, detailFormById],
    );
    const complianceReqs = useMemo(() => requirements.filter(r => r.kind === 'compliance'), [requirements]);
    const compMissing = complianceReqs.filter(r => r.status === 'missing').length;

    const TABS: { id: DetailTab; label: string; Icon: React.ElementType; count?: number }[] = [
        { id: 'details',       label: 'Details',       Icon: User },
        { id: 'address',       label: 'Address',       Icon: MapPin },
        { id: 'qualification', label: 'Qualification', Icon: Briefcase },
        { id: 'documents',     label: 'Documents',     Icon: FileText,  count: docMissing },
        { id: 'compliance',    label: 'Compliance',    Icon: Shield,    count: compMissing },
        { id: 'certificates',  label: 'Certificates',  Icon: Award,     count: certMissing },
        { id: 'signature',     label: 'Signature',     Icon: PenTool },
        { id: 'activity',      label: 'Activity',      Icon: History,   count: a.eventLog.length },
    ];

    return (
        <div className="flex min-h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* ── Header ────────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 px-6 pt-4 pb-4">
                {onBack && (
                    <button type="button" onClick={onBack}
                        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
                        <ArrowLeft size={14} /> Back to DQ Files
                    </button>
                )}
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-base font-bold text-white shadow-sm">
                            {a.firstName[0]}{a.lastName[0]}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold text-slate-900">{a.firstName} {a.lastName}</h2>
                            <p className="text-[11px] text-slate-500">{a.positionApplied} · {a.licenseType} · {carrier} · Applied {a.appliedDate}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-700">
                                    {DQ_DRIVER_TYPES.find(t => t.id === type)?.label ?? type} Driver
                                </span>
                                {profile && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">{profile.name}{auto && ' · auto'}</span>}
                                <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-bold', complete ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700')}>
                                    {complete ? '✓ DQ Complete' : `${dq.rollup.missing} missing`}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                            Checklist:
                            <select value={auto ? '' : (profile?.id ?? '')} onChange={e => onSetProfile(e.target.value || null)}
                                className="h-7 rounded-md border border-slate-300 bg-white px-2 text-[11px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none">
                                <option value="">Auto</option>
                                {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </label>
                        <button type="button" onClick={() => window.print()}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                            <Printer size={13} /> Print
                        </button>
                        <button type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[12px] font-semibold text-slate-700 hover:bg-slate-50">
                            <Send size={13} /> Send
                        </button>
                        {onNavigate && (
                            <button type="button"
                                onClick={() => { sessionStorage.setItem('dq:generator-preselect', a.id); onNavigate('/dq-files/generator'); }}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[12px] font-semibold text-blue-700 hover:bg-blue-100">
                                <FileCheck size={13} /> Generate
                            </button>
                        )}
                        <button type="button"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                            <Plus size={13} /> Add Document
                        </button>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{dq.rollup.present} of {dq.rollup.required} required items present</span>
                        <span className="tabular-nums">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-500' : 'bg-blue-500')} style={{ width: `${pct}%` }} />
                    </div>
                </div>
            </div>

            {/* ── KPI Summary strip ─────────────────────────────────────── */}
            <div className="border-b border-slate-200">
                <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
                    {([
                        { label: 'Present',    value: dq.rollup.present,  tone: 'text-emerald-700', bg: 'bg-emerald-50/60', Icon: Check },
                        { label: 'Missing',    value: dq.rollup.missing,  tone: 'text-rose-700',    bg: 'bg-rose-50/60',    Icon: AlertTriangle },
                        { label: 'N/A',        value: naCount + skippedCount, tone: 'text-slate-500', bg: 'bg-white',       Icon: Minus },
                        { label: 'Completion', value: `${pct}%`,          tone: 'text-blue-700',    bg: 'bg-blue-50/60',    Icon: ListChecks },
                    ] as const).map(item => (
                        <div key={item.label} className={cn('p-3.5', item.bg)}>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                <item.Icon size={10} className={item.tone} /> {item.label}
                            </div>
                            <div className={cn('mt-1.5 text-xl font-black tabular-nums leading-none', item.tone)}>{item.value}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Tab strip ─────────────────────────────────────────────── */}
            <div className="border-b border-slate-200 px-5">
                <div className="flex items-center gap-1 -mb-px overflow-x-auto">
                    {TABS.map(tab => {
                        const on = activeTab === tab.id;
                        return (
                            <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                                className={cn('inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors',
                                    on ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800')}>
                                <tab.Icon size={13} className={on ? 'text-blue-600' : 'text-slate-400'} />
                                {tab.label}
                                {(tab.count ?? 0) > 0 && (
                                    <span className={cn('inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold',
                                        on ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Tab content ───────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-5">
                <div className="space-y-4">
                    {activeTab === 'details'       && <DetailsTab row={row} />}
                    {activeTab === 'address'       && <AddressTab row={row} />}
                    {activeTab === 'qualification' && <QualificationTab row={row} />}
                    {activeTab === 'documents'     && <DocumentsTab dq={dq} driverId={a.id} driverEmail={a.email} onRefresh={onRefresh} />}
                    {activeTab === 'compliance'    && <ComplianceTab requirements={complianceReqs} />}
                    {activeTab === 'certificates'  && <CertificatesTab dq={dq} driverId={a.id} driverEmail={a.email} onRefresh={onRefresh} />}
                    {activeTab === 'signature'     && <SignatureTab row={row} />}
                    {activeTab === 'activity'      && <ActivityTab row={row} />}
                </div>
            </div>
        </div>
    );
}

// ── Compact driver list item (left panel) ────────────────────────────────────

function DqRosterRow({ row, onSelect }: {
    row: DqRow; onSelect: () => void;
}) {
    const { applicant: a, dq, profile, type } = row;
    const complete = dq.rollup.missing === 0 && dq.rollup.required > 0;
    const meta = STAGE_META[a.stage];
    const tone = TONE_CLS[meta.tone];
    const driverType = DQ_DRIVER_TYPES.find(d => d.id === type)?.label ?? type;
    return (
        <li>
            <button type="button" onClick={onSelect}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                    {a.firstName[0]}{a.lastName[0]}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-slate-800">{a.firstName} {a.lastName}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="font-mono text-slate-500">{a.licenseType}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{driverType}</span>
                        {profile && <span className="text-violet-600">{profile.name}</span>}
                        <span className={cn('rounded-full px-1.5 py-0.5 font-bold', tone.chip)}>
                            {meta.label}
                        </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={cn('h-full rounded-full', complete ? 'bg-emerald-500' : dq.pct > 50 ? 'bg-blue-500' : 'bg-amber-500')}
                                style={{ width: `${dq.pct}%` }} />
                        </div>
                        <span className={cn('text-[10px] font-bold tabular-nums shrink-0', complete ? 'text-emerald-600' : 'text-slate-500')}>
                            {complete ? '✓' : `${dq.rollup.missing}✗`}
                        </span>
                    </div>
                </div>
            </button>
        </li>
    );
}

// ── Main DqFilesPage ──────────────────────────────────────────────────────────

/**
 * DQ Files — post-hire Driver Qualification file management hub.
 * Split-panel: left = hired driver roster, right = full 8-tab DQ file fulfillment view.
 */
export function DqFilesPage({ onNavigate }: { onNavigate?: (path: string) => void } = {}) {
    const [search, setSearch] = useState('');
    const [stageFilter, setStageFilter] = useState<Stage | 'all'>('hired');
    const [statusFilter, setStatusFilter] = useState<'all' | 'incomplete' | 'complete'>('all');
    const [builderOpen, setBuilderOpen] = useState(false);
    const [tab, setTab] = useState<'overview' | 'drivers' | 'checklists' | 'generator'>('overview');
    const [refresh, setRefresh] = useState(0);
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const bump = () => setRefresh(n => n + 1);

    const profiles = useMemo(() => loadDqProfiles(), [refresh]);
    const overrides = useMemo(() => loadDqOverrides(), [refresh]);
    const itemOverrides = useMemo(() => loadDqItemOverrides(), [refresh]);

    const formById = useMemo(() => {
        const m = new Map<string, ApplicationFormDef>();
        for (const f of loadApplicationForms()) m.set(f.id, f);
        return m;
    }, []);
    const tplById = useMemo(() => {
        const m = new Map<string, DriverHiringTemplate>();
        for (const t of loadTemplates()) m.set(t.id, t);
        return m;
    }, []);
    const carrierName = (id?: string) => {
        const c = ACCOUNTS_DB.find(a => a.id === id);
        return c ? (c.dbaName || c.legalName) : '—';
    };

    const rows = useMemo<DqRow[]>(() => {
        return loadApplicants().map(a => {
            const app = getApplication(a.id);
            const tpl = app ? tplById.get(app.templateId) : undefined;
            const { profile, auto, type } = resolveDqProfile(a, tpl?.name, profiles, overrides);
            const perDriverOverrides = driverItemOverrides(itemOverrides, a.id);
            const dq = computeDqFile(a, app, tpl?.steps ?? [], formById, profile?.sections, perDriverOverrides);
            return { applicant: a, app, dq, carrier: carrierName(app?.carrierId), profile, auto, type };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formById, tplById, profiles, overrides, itemOverrides]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows.filter(r => {
            if (stageFilter !== 'all' && r.applicant.stage !== stageFilter) return false;
            if (statusFilter === 'complete' && r.dq.rollup.missing > 0) return false;
            if (statusFilter === 'incomplete' && r.dq.rollup.missing === 0) return false;
            if (q && !`${r.applicant.firstName} ${r.applicant.lastName}`.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [rows, search, stageFilter, statusFilter]);

    const hiredRows = useMemo(() => rows.filter(r => r.applicant.stage === 'hired'), [rows]);
    const kpis = useMemo(() => {
        const total = hiredRows.length;
        const complete = hiredRows.filter(r => r.dq.rollup.required > 0 && r.dq.rollup.missing === 0).length;
        const avg = total ? Math.round(hiredRows.reduce((s, r) => s + r.dq.pct, 0) / total) : 0;
        const missing = hiredRows.reduce((s, r) => s + r.dq.rollup.missing, 0);
        return { total, complete, avg, missing };
    }, [hiredRows]);

    const selectedRow = useMemo(() => rows.find(r => r.applicant.id === selectedDriverId), [rows, selectedDriverId]);

    // ── Full-page dedicated detail view when a driver is selected ──────────
    if (selectedRow) {
        return (
            <DqFileDriverDetail
                row={selectedRow}
                onBack={() => setSelectedDriverId(null)}
                onNavigate={onNavigate}
                profiles={profiles}
                onSetProfile={(pid) => { setDqOverride(selectedRow.applicant.id, pid); bump(); }}
                onRefresh={bump}
            />
        );
    }

    const PAGE_TAB_DEFS: TabDef[] = [
        { id: 'overview',   label: 'Overview',      Icon: LayoutGrid },
        { id: 'drivers',    label: 'Hired Drivers',  Icon: UserCheck,  count: hiredRows.length },
        { id: 'checklists', label: 'Checklists',     Icon: Settings2,  count: profiles.length },
        { id: 'generator',  label: 'Generator',      Icon: FileText },
    ];

    return (
        <div className="flex-1 min-h-screen bg-slate-50">
            {/* ── Unified page header (violet accent — post-hire compliance) ── */}
            <PageHeader
                iconGradient="from-violet-500 to-purple-600"
                Icon={ListChecks}
                title="Driver Qualification Files"
                subtitle="Post-hire DQ file management — 49 CFR 391.51 compliance, per driver."
                actions={<>
                    <button type="button" onClick={() => onNavigate?.('/dq-files/generator')}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-[13px] font-bold text-white shadow-sm hover:bg-violet-700">
                        <FileText size={15} /> Generate DQ File
                    </button>
                    <button type="button" onClick={() => setBuilderOpen(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 shadow-sm hover:border-violet-300 hover:text-violet-700">
                        <Settings2 size={15} /> Manage checklists
                    </button>
                </>}>
                <TabStrip
                    tabs={PAGE_TAB_DEFS}
                    active={tab}
                    onChange={v => setTab(v as typeof tab)}
                    accent="violet"
                />
            </PageHeader>

            <div className="px-8 py-5">
                {/* ── KPI strip (always visible, clickable to filter) ──────── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
                    <KpiTile label="Hired drivers"  value={kpis.total}     accent="bg-violet-500"
                        Icon={UserCheck}     activeRing="ring-violet-300 border-violet-300"
                        active={tab === 'drivers' && stageFilter === 'hired'} onClick={() => { setTab('drivers'); setStageFilter('hired'); }} />
                    <KpiTile label="DQ complete"    value={kpis.complete}  accent="bg-emerald-500"
                        Icon={Check}         tone="text-emerald-700" activeRing="ring-emerald-300 border-emerald-300"
                        active={tab === 'drivers' && statusFilter === 'complete'} onClick={() => { setTab('drivers'); setStatusFilter('complete'); setStageFilter('hired'); }} />
                    <KpiTile label="Items missing"  value={kpis.missing}   accent="bg-amber-500"
                        Icon={AlertTriangle} tone="text-amber-700"   activeRing="ring-amber-300 border-amber-300"
                        active={tab === 'drivers' && statusFilter === 'incomplete'} onClick={() => { setTab('drivers'); setStatusFilter('incomplete'); setStageFilter('hired'); }} />
                    <KpiTile label="Avg completion" value={`${kpis.avg}%`} accent="bg-blue-500"
                        Icon={ListChecks}    tone="text-blue-700"    activeRing="ring-blue-300 border-blue-300"
                        onClick={() => setTab('drivers')} />
                </div>

                {/* ── Overview ─────────────────────────────────────────────── */}
                {tab === 'overview' && (
                    <div className="mt-5 space-y-4">
                        <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-3">
                            <UserCheck size={16} className="mt-0.5 shrink-0 text-blue-600" />
                            <p className="text-[12px] text-slate-600">
                                A <span className="font-bold text-slate-800">DQ File</span> opens when a driver is hired.
                                Switch to the <button type="button" onClick={() => setTab('drivers')} className="font-bold text-blue-600 hover:underline">Hired Drivers</button> tab to manage each driver's checklist — upload documents, skip items, request missing records, and print the full file.
                            </p>
                        </div>
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-3">
                                <h3 className="text-sm font-bold text-slate-900">Hired drivers — DQ completion</h3>
                                <button type="button" onClick={() => setTab('drivers')} className="text-[12px] font-bold text-blue-600 hover:text-blue-800">View all →</button>
                            </div>
                            {hiredRows.length === 0 ? (
                                <div className="px-6 py-12 text-center text-sm text-slate-400">No hired drivers yet — DQ files open at hire.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {hiredRows.slice(0, 8).map(r => {
                                        const complete = r.dq.rollup.required > 0 && r.dq.rollup.missing === 0;
                                        return (
                                            <li key={r.applicant.id} className="flex cursor-pointer items-center gap-4 px-5 py-2.5 hover:bg-slate-50/50 transition-colors"
                                                onClick={() => { setSelectedDriverId(r.applicant.id); setTab('drivers'); }}>
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                                                    {r.applicant.firstName[0]}{r.applicant.lastName[0]}
                                                </div>
                                                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-blue-600 hover:underline">
                                                    {r.applicant.firstName} {r.applicant.lastName}
                                                </span>
                                                <span className="hidden text-[11px] text-slate-500 sm:block">{r.profile?.name ?? '—'}</span>
                                                <div className="w-36">
                                                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold">
                                                        <span className={complete ? 'text-emerald-600' : 'text-slate-500'}>{complete ? 'Complete' : `${r.dq.rollup.missing} missing`}</span>
                                                        <span className="tabular-nums text-slate-400">{r.dq.pct}%</span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                        <div className={cn('h-full rounded-full', complete ? 'bg-emerald-500' : r.dq.pct > 50 ? 'bg-blue-500' : 'bg-amber-500')} style={{ width: `${r.dq.pct}%` }} />
                                                    </div>
                                                </div>
                                                <ChevronRight size={14} className="shrink-0 text-slate-300" />
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Hired Drivers — split panel ───────────────────────────── */}
                {tab === 'drivers' && (
                    <div className="mt-5">
                        {/* Search + filters */}
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                            <div className="relative min-w-[220px] flex-1">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by driver name…"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
                            </div>
                            <SelectFilter value={stageFilter} onChange={v => setStageFilter(v as Stage | 'all')}
                                options={[{ value: 'all', label: 'All stages' }, ...(Object.keys(STAGE_META) as Stage[]).map(s => ({ value: s, label: STAGE_META[s].label }))]} />
                            <SelectFilter value={statusFilter} onChange={v => setStatusFilter(v as 'all' | 'incomplete' | 'complete')}
                                options={[{ value: 'all', label: 'All DQ status' }, { value: 'incomplete', label: 'Incomplete' }, { value: 'complete', label: 'Complete' }]} />
                            <span className="ml-auto text-xs text-slate-500 tabular-nums">{filtered.length} of {rows.length} drivers</span>
                        </div>
                        {/* Roster table */}
                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="hidden grid-cols-[minmax(0,1fr)_160px_140px_220px_160px] gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 lg:grid">
                                <span>Driver</span><span>Carrier</span><span>Stage</span><span>DQ Completion</span><span className="text-right">Action</span>
                            </div>
                            {filtered.length === 0 ? (
                                <div className="px-6 py-16 text-center text-sm text-slate-500">No drivers match the current filters.</div>
                            ) : (
                                <ul className="divide-y divide-slate-100">
                                    {filtered.map(r => (
                                        <DqRosterRow key={r.applicant.id} row={r} onSelect={() => setSelectedDriverId(r.applicant.id)} />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Checklists ────────────────────────────────────────────── */}
                {tab === 'checklists' && (
                    <div className="mt-5">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-[12px] text-slate-500">DQ checklist profiles applied by driver type.</p>
                            <button type="button" onClick={() => setBuilderOpen(true)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white hover:bg-blue-700">
                                <Settings2 size={13} /> Manage / New
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {profiles.map(p => {
                                const itemCount = p.sections.reduce((s, sec) => s + sec.items.length, 0);
                                return (
                                    <button key={p.id} type="button" onClick={() => setBuilderOpen(true)}
                                        className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-300">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                                            {p.isDefault && <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Default</span>}
                                        </div>
                                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{p.description}</p>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {p.appliesTo.map(t => (
                                                <span key={t} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                                    {DQ_DRIVER_TYPES.find(d => d.id === t)?.label ?? t}
                                                </span>
                                            ))}
                                            {p.appliesTo.length === 0 && <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-400">Unassigned</span>}
                                        </div>
                                        <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.sections.length} sections · {itemCount} items</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── Generator ─────────────────────────────────────────────── */}
                {tab === 'generator' && (
                    <div className="mt-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><FileText size={24} /></span>
                            <h3 className="text-base font-bold text-slate-900">DQ File Template Generator</h3>
                            <p className="mx-auto mt-1 max-w-md text-[12px] text-slate-500">Compile a driver's complete DQ file — cover page, document manifest, compliance checklist, and certification block.</p>
                            <button type="button" onClick={() => onNavigate?.('/dq-files/generator')}
                                className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
                                <FileText size={15} /> Open generator
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {builderOpen && <DqChecklistBuilder onClose={() => { setBuilderOpen(false); bump(); }} />}
        </div>
    );
}
